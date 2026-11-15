# Better_WiSE 的 Safari 适配路径

Safari 扩展的分发单位和 Chrome 不一样。Chrome 那边打一个 crx 传到商店就算发完，Safari 这边扩展必须住在宿主 App 里，macOS 是 .app，iOS 是 .ipa。图标、bundle id、隐私政策、签名、一次 App Store 审核，这些额外成本都是这一条带出来的。

代码这边反而轻。`extension/` 里没有 background，没有 scripting，没有 webRequest，没有 eval，chrome API 只碰 storage、tabs、runtime 三个命名空间，全在 Safari 支持范围内。真正会卡住的是几处语义差异和一处 UI 形态差异。

先给三条结论：

1. 不需要 Mac 也能打包上架。Apple 在 App Store Connect 里做了网页版打包器，上传扩展 zip 就行。前提是先开 Apple Developer Program。
2. 按现有用法估，代码改造 3 到 5 个工作日，其中一半时间花在验证上而不是写代码。
3. 凭证不可能全用谷歌。三个商店三套账号体系，Apple 那套必须是 Apple 账户。

## 一、代码改造

### 1. manifest 清三处

`extension/manifest.json` 现在的 `host_permissions` 里有一条 `https://login.microsoftonline.com/*`，在整个 js 里零引用（grep 过）。留着只会在 Safari 安装时多弹一条授权提示，学生看到"允许访问 login.microsoftonline.com"只会更犹豫。删掉。

`key` 字段 Safari 不认，打包时会告警。它在 Chrome 那边的作用是固定扩展 ID，上架商店之后 ID 由商店分配，这个字段其实可以退役。现在还在发 crx 给学生侧载的话先留着，Safari 打包前删。

再加一个 `unlimitedStorage`，理由在下面第 3 条。

Safari 的打包器会打印一份 manifest 不支持键的 warning 列表，那份列表比任何二手资料都准，值得单独跑一次看。

### 2. storage.sync 在 Safari 里是"能存，不同步"

设置项写在 `chrome.storage.sync`（`extension/options.js:294`、`options.js:300`、`options.js:331`、`extension/home.js:1092`）。Apple 的说法是这个 API 存在、能调用、不会崩，但不跨设备同步。也就是说 Safari 用户换台机器或者重装扩展，所有设置静默回到默认值，没有任何报错。Chrome 那边是同步的。

三种处理：

- 什么都不改，设置页加一句"网页版设置不跨设备同步"。成本最低，接受体验落差。
- 写一层读封装：sync 读不到就回落 local，写的时候两边都写。推荐这个，改动小且 Chrome 侧行为不变。
- 全部改成 local。最省心，但 Chrome 用户失去跨设备同步。

读封装的样子：

```js
// extension/storage-compat.js
async function getSettings(keys) {
  const fromSync = await chrome.storage.sync.get(keys);
  const missing = keys.filter((k) => fromSync[k] === undefined);
  if (!missing.length) return fromSync;

  const fromLocal = await chrome.storage.local.get(missing);
  if (Object.keys(fromLocal).length) {
    // Chrome 上这一步就是真正的同步；Safari 上写成功但只留在本机，无害
    chrome.storage.sync.set(fromLocal).catch(() => {});
  }
  return { ...fromLocal, ...fromSync };
}
```

Safari 首次安装时 local 是空的，回落也救不回来。这层封装只对"Chrome 和 Safari 混用同一套数据"或者"用户先装过再重装"有用。真要跨设备，得自己做云同步，那是另一个项目。

### 3. 5MB 配额和用户背景图

Apple 文档给的默认额度是 5 MB，加 `unlimitedStorage` 之后 Safari 16 起不限量。用户背景图 `bgImage` 单独放 `storage.local`（`extension/home.js:5616` 读），一张手机照片转 base64 轻松 3 到 8 MB，一个人就能把额度吃满。

两件事都做：manifest 加 `unlimitedStorage`，上传时把图压到长边 1600、JPEG 质量 0.8，通常能压到 200 到 400 KB。后者对旧版 Safari 和 Chrome 那边都有好处。

### 4. iframe 里的 options.html

`extension/search.js:2115` 把 iframe 的 src 设成 `chrome.runtime.getURL('options.html')`，在 wise 页面里嵌一个设置面板。这条路在 Safari 上有两个不确定：扩展页面能不能被普通网页 iframe 嵌入，以及嵌入之后的权限和事件是否和 popup 场景一致。Apple 的兼容文档没有正面讲这一条。

不要赌。按成本从低到高：

1. 改成 `window.open` 开新标签页。`extension/home.js:1316` 已经这么干了，把 `search.js` 那处对齐到同一套写法，二十分钟的事。
2. 如果一定要页面内面板，用 content script 自己渲染 DOM，不跨文档。是重写，但之后两个浏览器的行为完全一致。

先做 1，验证通过再考虑 2。

### 5. content script 里直连 Gemini

`extension/home.js:1291` 和 `extension/content.js:270` 在 content script 里直接 fetch `https://generativelanguage.googleapis.com/...?key=...`。Chrome 里靠 host_permissions 放行，Safari 里 host 权限语义接近，但 content script 的跨域请求受宿主页面 CSP 影响的程度，两个浏览器不完全一样。

更彻底的做法是加一个 background service worker，把 AI 调用搬到后台，key 不经过页面。代价是新增一个文件、manifest 加一段、改两处调用。Safari 16.4 起支持 MV3 service worker，iOS 上生命周期短，但收到消息会唤醒。

建议先在 Safari 里原样测，能通就先不动。通不了再搬，搬的时候顺手把 key 从 content script 里拿出去。

### 6. 弹窗尺寸

`extension/options.html` 第 23 行 body 写死 `width:300px; max-width:300px`。macOS 工具栏 popup 里这个宽度大致合适。iOS 上 Safari 没有工具栏 popup，扩展 UI 是从地址栏菜单打开的 sheet，宽度跟着屏幕走，300px 会显得窄。

加一条 media query 就够，或者干脆接受"iOS 上主界面就是注入到页面里那套"。这个扩展本来大部分功能都在 content script 里，这一点是优势，iOS 上不太依赖 popup。

### 7. 安装完的引导

Safari 装完扩展默认是关的。用户要去 Safari 设置里勾选，然后首次访问 wise 时在地址栏点"允许"。指望学生自己找到这个开关不现实。

宿主 App 的第一屏就放这个，配两张图加两句话。另外 content script 里可以探测扩展上下文是否可用，不可用时在页面里给条提示。这一段文案要写给学生看，不是写给开发者看。

## 二、打包的三条路线

| 路线 | 需要什么 | 产出 | 限制 |
| --- | --- | --- | --- |
| 网页打包器 | Apple Developer Program | 云端编译，TestFlight 里直接能装 | 用 Apple 模板，不能加自定义 Swift 代码；吃 Xcode Cloud 额度 |
| macOS 命令行 | 一台 Mac + Xcode | 完整工程，可改容器 App | 必须有 Mac |
| 借机器手动 | 一台 Mac + Xcode | 同上 | 同一条，只是机器是借的 |

### 路线 A：网页打包器（推荐起步）

1. 打一个干净的 zip。现有 `extension/build-extension.mjs` 的产物就能用，但要确认 zip 的根目录直接是 `manifest.json`，别把 `extension/` 这层目录名打进去。检查一下：`unzip -l xxx.zip | head -20`。
2. 会员开通，见第五节。
3. 登录 App Store Connect，Users and Access → Xcode Cloud 标签 → Safari Web Extension Packager → Upload 上传 zip。
4. 等云端编译完，产物直接进 TestFlight。

会员自带的 Xcode Cloud 是每月 25 小时，一次编译通常几分钟，够用。容器 App 是模板生成的，可以自己换图标和名称，但加不了 Swift 界面逻辑。以后想做更丰富的容器，得走路线 B。

### 路线 B：macOS 命令行

```bash
xcrun safari-web-extension-packager ./extension \
  --project-location ./safari \
  --app-name "Better WiSE" \
  --bundle-identifier net.wesleycollege.betterwise \
  --macos-only --no-open --force
```

工具现在叫 `safari-web-extension-packager`，旧名 `safari-web-extension-converter` 还能用。默认是引用原目录，改完扩展代码在 Xcode 里重跑就同步；加 `--copy-resources` 才是复制一份走。`--ios-only` 和 `--macos-only` 二选一，不写就两个都出。

生成完在 Xcode 里配自动签名，Product → Archive → Distribute App。

### 路线 C：借一台 Mac

和 B 完全一样，只是机器是借的。如果只打算做 iOS，这条可以跳过。

## 三、签名、审核、分发

扩展不需要单独的证书，跟着宿主 App 一起签。

- App Store 分发：Apple Distribution 证书，Xcode 里自动管理就行。
- macOS 商店外分发（发 dmg 给同学）：Developer ID Application + Developer ID Installer，再过 notarytool 公证。用户首次打开要右键"打开"，绕过 Gatekeeper。
- iOS 只有 App Store、TestFlight、ad-hoc（要登记设备 UDID）三条路。

TestFlight 内部测试 100 人，不需要审核，自己传完几分钟就能装。外部测试 1 万人，要过一次 Beta App Review，一般一两天。

更新机制：Safari 没有 `update_url`，扩展更新跟着 App 走。发版就是传新 build 再提审。TestFlight 上可以天天传，正式版每次都要审。

### 审核会卡在哪

| 条款 | 为什么会被拒 | 准备什么 |
| --- | --- | --- |
| 4.2 Minimum Functionality | 容器 App 只写一句"请去设置里开启扩展"，会被当成空壳 | 容器里放能独立用的东西：功能说明、常见问题、扩展是否已启用的自检、版本号和构建号 |
| 5.2.1 知识产权 | 名字、图标、配色带 Wesley 和狮徽，看着像学校官方产品 | 学校书面授权。`docs/email-to-ms-siritzky.md` 那封邮件的回复要落到文字。名称里加"非官方"或"学生项目" |
| 隐私 | 扩展读 wise 页面内容，AI 功能还会把内容发给 Gemini | App Privacy 如实填；隐私政策写清哪些数据离开设备、发给谁；AI 功能默认关闭，用户显式打开 |
| 2.5.1 | 运行时下载并执行代码 | 本项目没有 eval 和 new Function，符合要求。别在运行时拉远程脚本 |

隐私这块最容易翻车。扩展读页面内容，在 App Privacy 问卷里一般要声明 User Content 相关类别；AI 开关打开后用户输入的 prompt 和页面片段会进 Google 的服务器，这件事必须在隐私政策和 App 内说清楚，不能只写在 README 里。

另一个现实问题：容器 App 只有一个扩展的话，4.2 的通过率不高。有人用"容器里放一个真实的预览和配置界面"过审，有人直接被打回。这条没有稳过的办法，只能把容器做得像样。

## 四、没有 Mac 怎么测

| 要验证 | 怎么做 | 需要什么 |
| --- | --- | --- |
| iOS / iPadOS 真机 | TestFlight | 只要会员，不需要 Mac |
| iOS 模拟器 | Xcode | 需要 Mac |
| macOS Safari 安装 | 临时扩展（24 小时有效，退出 Safari 失效）或 TestFlight for macOS | 必须有 Mac |
| macOS 自动化 | safaridriver | 必须有 Mac |

结论很清楚：目标只做 iOS 的话，Windows 全程够用；要覆盖 macOS Safari，必须借一台 Mac 做验证，哪怕只借一次。

本机（Windows）能做的验证只有两类：扩展代码在原环境里跑通（Edge + `--load-extension`，端口 9701 那套探针），以及打包器给出的静态报告。

真机上至少过一遍这几条：

1. 装完去 Safari 设置里启用，回 wise 页面刷新，主页注入是否生效。
2. 地址栏的站点授权弹窗文案是什么，学生能不能看懂。
3. 设置面板能不能打开（iframe 那处在 macOS 上要单独看）。
4. 改设置、关扩展、重开，设置还在不在。
5. 背景图上传和显示。
6. 搜索、拼音那几个入口。
7. AI 功能首次调用，包括没有填 key 时的提示。
8. 卸载重装后设置是否丢（预期会丢，确认丢法是不是可接受）。

## 五、凭证清单

| 平台 | 要什么账号 | 资质 | 费用 | 能全用谷歌吗 |
| --- | --- | --- | --- | --- |
| Chrome Web Store | Google 账号 | 无 | $5 一次性（已付） | 这个本来就是谷歌 |
| Edge Add-ons | Microsoft 账号（Partner Center） | 无 | 免费 | 注册邮箱可以填 Gmail，但账号是微软的 |
| Apple Developer Program | Apple 账户 + 双重认证 | 个人需成年（澳洲 18）；组织需 D-U-N-S、组织域名邮箱、可访问的官网 | $99/年 | 不能。Apple ID 的登录邮箱可以填 Gmail |
| 隐私政策托管 | GitHub 账号 | 无 | 免费 | 是 |
| 学校授权 | 学校邮箱 | 导师或校方同意 | 无 | 不适用 |

Apple 这边的细分：

- 个人账号。用法定姓名注册，这个名字会显示成 App Store 的卖家名。学生注册前要接受这一点。
- 组织账号。显示学校名字，但需要 D-U-N-S 编号（免费申请，一到两周）、组织域名邮箱、一个能打开的官网，Account Holder 要有法律授权。
- 未满 18 岁。Apple 的说法是由父母或监护人注册账号并共用。账号主体是家长。

费用豁免：非营利组织、accredited 教育机构、政府实体可以申请，条件是组织身份入会并且应用免费分发。Wesley 是 accredited school，值得试，但审批是人工的，别把它当成既定事实排期。相关页面：<https://developer.apple.com/help/account/membership/fee-waivers/>。

如果学校愿意出面，组织账号加费用豁免是最省钱的组合，同时也是品牌授权最容易谈的场景。代价是走学校采购流程，可能比 99 美元本身慢得多。

### 扩展自己运行时要的凭据

上面那张表是"发布渠道"的账号。扩展跑起来以后还要几样东西，性质不同，Safari 下也各有变化：

- WISE 登录态。扩展不存密码，业务请求全是同源 fetch 加 `credentials:'include'`，复用浏览器里已有的学校 SSO cookie。Safari 的 ITP 对第三方 cookie 卡得比 Chrome 严，但这些请求都是同源（`wise.wesleycollege.net`），不受影响。这条不用改。
- Gemini API key。用户自己在设置里填，存在 storage 里。Safari 不会因为换浏览器丢，但换设备不同步。如果以后想统一发 key 给全班，必须走服务端代理，别把 key 打进扩展，那等于公开。
- OpenAI 兼容接口的 key（`modelUrl` 那条路）。同上。
- 用不到的：Google OAuth、Microsoft 登录。扩展没有引入 `identity` API，Safari 也不支持它，正好省事。

## 六、能不能全用谷歌

不能。

按渠道看：Chrome 是谷歌的，Edge 是微软的，App Store 是苹果的。没有任何一个账号能同时往三个商店发东西。Chrome Web Store 的开发者账号连 Edge Add-ons 都不认。

按身份看：Apple Developer 的账号主体是 Apple 账户，协议、付款、双重认证全在苹果那边。Gmail 最多只能当 Apple ID 的登录邮箱，换掉邮箱不改变账号归属。

按付款看：Apple 收美元，不接受 Google 余额，也不接受 Google Play 的余额。

实际能复用的只有一件：三个平台都允许用同一个邮箱地址注册。密码管理器里看着像一个账号，法律上是三份协议、三个主体。

还有一条容易忽略的：Chrome Web Store 如果先用个人 Gmail 注册，后面想换成学校的组织账号，要走开发者账号转移。转移流程存在，但有代价，具体能保留什么要以当时的商店政策为准。Edge 那边同理。打算长期做，注册那天就用学校邮箱。

## 七、能不能发个 zip 让大家自己装

macOS 上技术上可以，代价是每次打开 Safari 都要从头来一遍。

Apple 的说明写得很明确（[Running your Safari web extension](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)）：Safari 设置 → 开发者标签 → "Add Temporary Extension…"，选文件夹或者 zip 都行。前提是勾上"Allow unsigned extensions"，而这个开关在你退出 Safari 时就会重置。临时扩展本身也是 24 小时或退出 Safari 就移除。

所以学生的完整流程是：打开 Safari 设置、切到开发者标签、勾一个开关、点添加、选文件、再去扩展标签里启用、回页面刷新。关一次 Safari，全部作废。这是开发自测的流程，不是分发的流程。

还有个前置条件容易漏：没签名的扩展，Safari 默认直接忽略，设置里连条目都不会出现。所以最常见的失败不是"装错了"，是"装上了但设置里根本没有"。

iOS 那边这条路不存在。Apple 的原文是：真机测试必须加入 Apple Developer Program，只有模拟器可以免会员。没有 zip 侧载这回事。

### 不花钱的人实际上在做什么

免费的额度只到"开发"，到不了"分发"。

| 做法 | 能干什么 | 边界 |
| --- | --- | --- |
| 临时扩展 | 在 macOS 上自己测 | 24 小时或退出 Safari 失效，每次都要重勾未签名开关 |
| 免费 Apple ID 的个人团队 | 用 Xcode 给**自己**的 iPhone 签名安装 | 7 天过期，要重新 build；最多 3 个 app；必须有 Mac |
| 只发源码 | 让有 Mac 的开发者自己编译 | 对普通同学等于没有 |
| 学校或公司的组织账号 | 正常分发 | 还是付费会员，只是钱不是自己出 |

那些看着"不花钱"的项目，要么只服务开发者本人（macOS 临时扩展），要么背后有组织账号，要么要求用户自己编译。面向普通用户、能长期装的 Safari 扩展，没有零成本的路。

### 折算到 Better_WiSE

iOS 上的同学想用，绕不开会员。要么自己付 99 美元，要么学校出面开组织账号、申请费用豁免，那是唯一可能归零的组合。

macOS 那边反而有替代：让同学用 Chrome 或 Edge 版就行，学校电脑本来就是 Windows。Safari 版真正的需求在 iPhone 和 iPad 上，那正是唯一必须付费的地方。

### 能不能写个辅助程序自动装

拆成三件事分别看：

- 从 GitHub 拉最新 zip。能，curl 加 Releases API，十行代码。
- 打开"允许未签名扩展"。Safari 没有对应 API，只能靠 UI 自动化去点。要授辅助功能权限，而且 Safari 退出时会自己把这个开关关掉，脚本每次启动都得重跑。
- 把 zip 交给 Safari。同样没有 API，只能 UI 脚本驱动文件选择框。装进去之后 24 小时还是会失效。

所以它省下的是几次点击，付出的代价是每台机器都要授辅助功能（部分系统版本还要完全磁盘访问）、Safari 一更新就可能失效、被杀毒软件或学校 IT 当成可疑程序。本质是把系统的签名边界做成自动化脚本，自己机器上勉强能跑，发给同学不现实，也过不了任何审核。

要做到"装一次，以后自动更新"，合法路径只有两条：

- Developer ID 签名加 Sparkle 自动更新，macOS 商店外分发。还是要 99 美元，但用户体验接近自动更新。
- 学校有 Apple School Manager 加 MDM，可以批量推送。需要组织账号，学生个人走不通。

iOS 上这两条都不适用，只有 TestFlight 和 App Store。

## 八、这周就能做的三件事

1. 清 manifest 那三处，把 `extension/search.js:2115` 的 iframe 换成新标签页。这两件不依赖任何账号，改完在 Edge 里就能回归。
2. 定目标平台。只做 iOS 的话，Windows 一路走到底；要 macOS Safari，现在就去借一台 Mac，别等到提审前。
3. 一封邮件同时问学校两件事：能不能以学校名义开组织开发者账号并申请费用豁免，以及 Wesley 名称和狮徽能不能书面授权。这两件事一封信说完，比来回两轮快。

## 九、我没验证的部分

Safari 里 iframe 加载扩展页的实际行为、content script 跨域 fetch Gemini 的实际表现、iOS sheet 里的布局，这三条我没有真机验证过。文档里的判断来自 Apple 的兼容性说明和 API 文档，不是实测。

真机跑完如果和这里写的不一样，以真机为准。打包器打印的 warning 列表同理，那份报告比任何二手总结都可靠。
