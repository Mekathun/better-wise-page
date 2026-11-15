<!-- generated: sync.py — 手改会被覆盖，要改去改 PROGRESS.md 或 100-/200-/400-/500- 里的手写笔记 -->
---
type: source-doc
source: docs/TEACHER-TALK.md
bytes: 20153
tokens: 5474
date: 2026-11-15
---

# TEACHER-TALK

> 原件：`D:\DSH\Better_WiSE\docs\TEACHER-TALK.md`

# 老师谈话准备 / Talking about Better WiSE

> 对象：Wesley 的老师（大概率是 Ms Siritzky 或 IT / eLearning 那边的人）
> 你的身份：Year 10，个人项目，非官方扩展
> 目标：说清楚这是什么东西、数据去哪了、技术上你怎么做的

三条底线，比任何话术都重要：

1. 不知道就说不知道，然后说你打算怎么查。
2. 数据这一块要答得干净，因为这是唯一可能让老师紧张的地方。
3. 不要背长句。老师问什么答什么，一句话说完停住，等他追问。

---

## 一、开场：他问「这是什么」时你怎么说

**30 秒版（最可能用到）**

> It's a browser extension for WiSE. It adds three things: a "today's plan" panel on the dashboard, an expandable timetable, and a search box that covers announcements, files and links across all my classes.
>
> I built it because WiSE is a place where information sits, not a place that tells you what to do today. To find out what's due I used to open six class pages. Now it's one screen.

**如果他已经知道大概，想听重点**

> The short version: it's a UI layer on top of WiSE. No school system was changed, no data is sent anywhere, and it runs entirely in the browser.

**关于「为什么做」的一句话**

> I lost a revision booklet inside Resources and couldn't find it again. The search is what I built first.

---

## 二、他会问什么（按可能性排序）

### A. 动机和用法

**"Why did you build this?"**
> Because the information is all there, it's just spread across six class pages. I wanted one place that answers "what do I have to do today".

**"Do other students use it?"**
> I've been using it on my own account every day for a few months. It's on the Chrome Web Store, so other students can install it, but I haven't pushed it at anyone. I wanted it to work properly for me first.
（如果被问「多少人装了」：老实说不知道具体数字，商店后台能看，但我没在追这个数。）

**"How much time does it actually save?"**
> The honest answer is a few minutes a day. The bigger thing is that I stopped forgetting things, because the due dates are in one list instead of six.

**"What's the main feature?"**
> The panel on the dashboard. Search is the one I use most, though.

### B. 技术

**"How does it work? Is there a server?"**（他很可能这么问）
> No server. It's a Chrome extension, Manifest V3. The code is plain JavaScript, injected into the WiSE pages when they load. Everything it stores stays in the browser, in localStorage and chrome.storage.
>
> There's no backend, no database, no account system. Nothing to run, nothing to pay for.

**"So it scrapes the site?"**
> It reads the pages I'm already allowed to see, using my own logged-in session. It doesn't log in as anyone, doesn't touch other people's accounts, and doesn't change anything on the school side. It's read-only.

**"Why an extension and not a website?"**
> Because of the login. WiSE is behind the school's SSO, and a separate website would have to ask for a password, which I didn't want to build and wouldn't want to ask anyone for. An extension runs inside the page, so it uses the session the browser already has.

**"What permissions does it need?"**
> `storage`, plus host access to three domains: the WiSE domain, the Microsoft login domain, and Google's AI endpoint. No tabs, no history, no cookies API, no scripting permission.
>
> The script only runs on the WiSE domain. The other two are declared so a request isn't blocked; no script runs there.

**"How do you test it?"**
> Mostly by using it. I also built small probe pages that load a page and print measurements to the console, and I recorded the screen to check the first frame after a reload, because I had a bug where the dark theme flashed white for a moment before it applied.
>
> One example: I measured the brightest frame before and after a fix. Average brightness went from 98 to 81, and the share of near-white pixels from 16% to 0.3%.

**"What was the hardest part?"**
> Knowing what the site's data actually looks like. There's no documentation, so I had to work out the endpoints by watching the network tab: the class list, the announcements JSON, the resources tree, the file links. Then half the files have no extension, so I had to find another way to tell a PDF from an image.

**"Any bugs you're proud of fixing?"**
> Two that stick. Cards duplicated when two copies of the extension were installed at once. And on weekends the dashboard doesn't render the timetable header, so my panel stayed stuck on a loading skeleton forever.

### C. 隐私和合规（这一组答得要慢、要短）

**"Is this official? Does the school know?"**（最可能的一个）
> No, it's unofficial and the store listing says so on the first line. I'm one student building a project. I did write to Ms Siritzky about it, mainly to ask about using the school logo and about who'd need to approve it.

**"Does it collect any data?"**
> No. No analytics, no telemetry, no ads, no accounts. There's nothing to send data to, because there's no server.

**"Where does the data go?"**
> It stays on the student's own computer. The index is in localStorage on the WiSE domain, settings are in chrome.storage. Both are local to the browser.

**"What about the AI part?"**
> It's off by default. If a student turns it on, they paste their own API key, and the announcement text goes straight from their browser to Google's API. I never see it, and there's no key of mine in the extension. If it's off, nothing is sent at all.

**"Are you storing other students' work?"**
> No. It only stores what that student's own account can see, in their own browser. There's no shared index and no sync between users.

**"Is this against the school's rules?"**
> I don't think so, but I'd rather check than assume, which is why I wrote to ask. It doesn't bypass any permission, doesn't automate anyone's account, and doesn't change school data. The one thing worth flagging is load: I made it crawl once a day, not constantly, so it doesn't hammer the server.

**"You're using the school's name and colours."**
> Colours only, no crest. That's the point of asking. If the answer is no, it's a few minutes to change a colour and a name.

**"Did AI write this?"**（如果有这个怀疑）
> Some of it. I used AI assistants to draft parts and to help me debug, and I rewrote or fixed a lot of what came back. I can walk you through any function and say why it's built that way. The parts I understand best are the ones I had to debug myself.
>
> ⚠️ 这句要按你实际情况改。说假话当场就被追问穿，而且那才是真正的问题。

### D. 学习与反思

**"What did you learn?"**
> How to read a site I don't control: finding its endpoints, handling the pages that don't look the same on every route. And how to design a search index. I'd never built scoring before.

**"What would you do differently?"**
> Three real ones. I'd store the index in IndexedDB instead of localStorage, because localStorage has a size limit and parsing it on load is slow. I'd write tests for the scoring instead of testing by hand. And I'd separate the code that reads the site's HTML from the code that does the searching, because the first part breaks whenever the site changes.

**"What's next?"**
> Making the index cheaper to load, and adding tests. Longer term, I'd like it to be something the school is okay with rather than something that just exists.

---

## 三、术语表

左边是他可能说或你可能要说的词，中间是中文，右边是你可以立刻接上去的一句解释。不需要背，扫两遍，卡住的时候能想起来就够。

### 扩展本身

| English | 中文 | 一句话解释 |
|---|---|---|
| browser extension | 浏览器扩展 | 装在浏览器里、能给网页加东西的小程序 |
| Manifest V3 | 扩展清单第 3 版 | Chrome 现在要求的扩展格式，用配置文件声明权限和注入的脚本 |
| content script | 内容脚本 | 注入到网页里运行的 JS，能读写页面，但和页面自己的 JS 隔离 |
| isolated world | 隔离环境 | 内容脚本和页面脚本各有一个全局空间，互相改不到对方变量 |
| manifest.json | 清单文件 | 声明名字、版本、权限、注入哪些页面的那个 JSON |
| host permission | 主机权限 | 允许访问哪些域名的权限 |
| document_start / document_idle | 页面开始 / 空闲时注入 | 脚本什么时候跑，前者能抢在首次渲染前改样式 |
| options page / popup | 选项页 / 弹出面板 | 点工具栏图标弹出来的设置界面，我两处用的是同一套 |
| unpacked extension | 未打包扩展 | 开发者模式下直接加载一个文件夹，用来测试 |
| CRX | 扩展安装包 | 打包好的二进制，Chrome 现在只允许从商店装 |
| extension ID | 扩展 ID | 由签名公钥算出来的唯一标识，换个 key 就是另一个扩展 |
| Chrome Web Store review | 商店审核 | 提交后 Google 人工/自动检查，通常几天 |
| semver / four-part version | 版本号 | Chrome 允许 `0.1.2.3` 这种四段，每段 0 到 65535 |

### 读数据

| English | 中文 | 一句话解释 |
|---|---|---|
| DOM | 文档对象模型 | 浏览器把 HTML 变成的那棵树，JS 靠它找元素 |
| querySelector | 选择器查询 | 按 CSS 选择器找元素，我大量用它定位页面上的卡片 |
| DOMParser | HTML 解析器 | 把一段 HTML 字符串变成可以查询的文档，不用插进页面 |
| endpoint / API | 接口 | 页面背后真正吐数据的地址，我的公告列表就是从一个 JSON 接口来的 |
| JSON | JSON | 一种数据格式，接口返回的就是它 |
| same-origin request | 同源请求 | 发到自己域名下的请求，不用额外授权 |
| credentials: 'include' | 带上凭证 | 请求时带上浏览器的登录 cookie，所以用的是我自己的会话 |
| session cookie | 会话 cookie | 登录后浏览器存的那张票，服务器靠它认人 |
| HEAD request | HEAD 请求 | 只要响应头不要正文，我用它探测文件的真实类型 |
| Content-Type | 内容类型 | 响应头里写的文件类型，比如 `application/pdf` |
| Content-Disposition | 内容处置 | 响应头里写的文件名，`send.php?hash=…` 这种链接靠它才知道叫什么 |
| MIME type | MIME 类型 | 文件的标准化类型标签 |
| pagination | 分页 | 一次只返回一部分，要翻页继续拿 |
| rate limiting | 限流 | 请求太频繁会被服务器限制，所以我把爬取做成一天一次 |

### 搜索

| English | 中文 | 一句话解释 |
|---|---|---|
| index | 索引 | 提前把内容整理成一张表，搜的时候不用再翻网页 |
| inverted index | 倒排索引 | 从词反查文档。我用的是简化版，扫一遍条目打分 |
| tokenise | 分词 | 把「maths homework」切成 maths 和 homework |
| exact phrase match | 精确短语匹配 | 带引号时整句连着出现才算命中 |
| prefix / substring match | 前缀 / 子串匹配 | `math` 命中 `mathematics` |
| word boundary | 词边界 | 短词必须整词命中，不然 `eal` 也会命中 `health` 里的三个字母 |
| synonym expansion | 同义词扩展 | 搜 pe 也找 physical education |
| pinyin romanisation | 拼音 | 汉字转成拼音，中文文件名能用拼音搜到 |
| initials | 首字母 | 「数学作业」的 py 首字母是 sxzy |
| fuzzy match | 模糊匹配 | 差一点也算，我允许打错一个字符 |
| edit distance | 编辑距离 | 两个字符串差几个字符。我只处理差 1 个的情况 |
| relevance score | 相关度分数 | 每条结果算一个分，按分排序 |
| ranking / boost | 排序 / 加权 | 标题命中加得多，正文命中加得少 |
| dedupe | 去重 | 同一条结果出现两次只留一个 |
| debounce | 防抖 | 打字时等 220ms 没有新输入才发请求，不然每敲一个字都打一次接口 |
| cache / TTL | 缓存 / 有效期 | 同一个词一分钟内不重复打接口 |
| race condition | 竞态 | 两个请求谁先回来不确定，回来晚的那个可能覆盖新的 |
| stale response | 过期响应 | 我已经换了关键词，旧的响应又回来了 |
| graceful degradation | 降级 | 接口挂了就用本地索引，不白屏 |

### 工程

| English | 中文 | 一句话解释 |
|---|---|---|
| vanilla JavaScript | 原生 JS | 没有 React、没有框架，直接写浏览器能跑的代码 |
| no build step | 没有构建步骤 | 不打包不编译，改完文件刷新就生效 |
| dependency-free | 零依赖 | 没有第三方库，不用担心谁哪天不维护了 |
| idempotent | 幂等 | 跑两次和跑一次结果一样，重复注入不会出两个搜索框 |
| incremental crawl | 增量爬取 | 只重新抓过期的课，没动过的课一个请求都不发 |
| parallel workers | 并行任务 | 同时跑三个抓取，不是一门课一门课排队 |
| requestIdleCallback | 空闲回调 | 浏览器闲下来才干活，不跟页面抢主线程 |
| fallback | 兜底 | 主路径失败时走的那条路 |
| regression | 回归缺陷 | 修好一个又弄坏另一个。我每个版本都在防这个 |
| changelog / release notes | 更新说明 | 每个版本写了什么、修了什么的记录 |
| rollback | 回滚 | 新版本出问题就退回去 |
| unit test | 单元测试 | 自动检查某个函数对不对。这块我做得不够 |

### 界面与无障碍

| English | 中文 | 一句话解释 |
|---|---|---|
| keyboard shortcut | 快捷键 | Ctrl/⌘+K 打开搜索，再按一次关掉 |
| focus / focus trap | 焦点 / 焦点约束 | 打开搜索后光标自动进输入框，Tab 不会跑到底下的页面 |
| ARIA / listbox | 无障碍标记 / 列表框 | 告诉读屏软件这是一列可选项 |
| contrast ratio | 对比度 | 文字和背景的明暗差，WCAG AA 要求正文至少 4.5:1 |
| WCAG | 网页无障碍指南 | 国际上的无障碍标准 |
| prefers-color-scheme | 跟随系统深色 | 系统开深色模式就跟着开 |
| prefers-reduced-motion | 减少动态效果 | 用户不想要动画时就不做过渡 |
| progressive disclosure | 渐进披露 | 默认收起，需要的时候才展开，我的面板就是这样 |

### 隐私

| English | 中文 | 一句话解释 |
|---|---|---|
| data minimisation | 最少数据 | 能不留就不留，能少留就少留 |
| local-only | 只在本地 | 数据不出这台机器 |
| opt-in | 主动开启 | 默认关，用户自己打开才算 |
| third-party API | 第三方接口 | 别人家的服务。AI 那块用的是 Google 的 |
| API key | 接口密钥 | 调用付费接口的凭证。我用的是用户自己的 |
| telemetry / analytics | 埋点 / 统计 | 上报使用数据。这个插件一个都没有 |
| unofficial | 非官方 | 不是学校发布的，商店页第一行就写了 |

---

## 四、search.js 怎么讲（重点）

他如果只问一句「搜索是怎么做的」，就给 30 秒那版，然后停下。他接着问，再往下走。

### 30 秒版

> It's a local index, not a request to a search engine.
>
> On the page, it reads the class list, then each class's announcements, attachments and resource files, and stores a flat list of items in localStorage. When you type, it splits the query into words, matches each word against the title, the body and the class name, and gives every item a score. Title hits score highest. Then it sorts and shows the top results.
>
> It also matches pinyin, so a Chinese file name can be found by typing the romanised letters, and it tolerates one wrong character.

### 2 分钟版（按数据流讲，顺序别乱）

1. **建索引**
   > It runs when the browser is idle, not while the page is loading. It fetches the class list, then each class page. From a class page it takes the announcements from a JSON endpoint, the files from the resources tree, and the links inside each announcement. It reads three classes at a time.

2. **存**
   > Everything goes into one array in localStorage, keyed by `wesleySearch:v6`. There's a 12,000 item cap, and when it's over the cap it drops the oldest by date rather than the tail. Each class has its own 24 hour timestamp, so a re-crawl only re-reads the classes that are actually stale.

3. **解析查询**
   > There's a small syntax: `@maths` limits to a subject, quotes force an exact phrase, a minus excludes a word, and `kind:pdf` filters to one file type. Everything else is just words.

4. **匹配**
   > Each word is tried in order: literal match first, then synonyms, then pinyin, then a one character typo. Short words need a word boundary, otherwise "eal" matches inside "health". The typo pass only runs when there are zero results and it's capped at 60 milliseconds, so a bad query can't freeze the box.

5. **打分**
   > The score is additive. A word found in the text scores 3, whether it matched directly or through a synonym. A pinyin hit scores 2, and the typo fallback scores 1. Title matches add a bonus: 120 if the title is exactly the query, 70 for a prefix, 45 for anywhere in the title. Words that appear in the class name add a little. Files get adjusted by type, because a PDF is more likely what you want than a random image, and a file with no recognisable extension sits in between.

6. **和学校自己的搜索合起来**
   > The site already has a search endpoint. I call it too, with a date filter of one year either side. But those results come from the whole school, not just my classes, so I always put them after mine and draw a divider. I dedupe by URL and title, and cap the merged list at 60.

7. **界面**
   > Typing re-renders from the local index immediately, and the remote call is debounced by 220ms so it isn't fired on every keystroke. Each request carries an id, and a response whose id isn't the latest is thrown away, which is how I avoid an old slow response overwriting a new one.

### 他可能追问的三个点

**"Why not just use the school's search?"**
> The school's search doesn't know what's inside an attachment, and it covers the whole school, so the thing I want is often on page three. My index is small and personal, so it can rank by "this is my class" instead of by whatever the school's ranking does.

**"How do you rank by 'my class'?"**
> The dashboard writes my timetable into localStorage. When a result belongs to one of those subjects it gets a flat 140 point boost, which is more than the maximum title bonus. So my own subject's items come first even if the title match is weaker. It only adds points, it never subtracts from anything else.

**"What breaks it?"**
> The part that reads the site. It depends on HTML structure and on those endpoints, and neither is documented or promised to stay the same. If the school updates the site, the reading part breaks and the search empties out. That's why the code that reads the page is separate from the code that searches: one is fragile, the other isn't.

### 如果他让你现场演示

打开 `Ctrl/⌘+K`，按这个顺序演，每个动作说一句话：

1. 空框打开，Recent 里是上次搜的词。说 "it remembers the last few queries".
2. 打 `maths`，结果立刻出来。说 "that's the local index, the remote part is still loading".
3. 打 `@maths due` 或者 `kind:pdf`，说 "that's the filter syntax".
4. 按 ↑↓ 选中一条，回车。说 "keyboard only, same as the browser's own find".

---

## 五、被问住的时候

三句话，按情况挑一句。都比硬编好。

- **真不知道**：`I'd have to check that. I think it's X but I don't want to guess.`
- **知道方向不知道细节**：`The short answer is yes. The detail is in the part I didn't write, so I'd be guessing if I went further.`
- **问的是学校系统而不是你的代码**：`That's the school's side, not mine. What I can tell you is how my code reacts to it.`

最后一句，如果他问「你觉得这个东西最大的问题是什么」，别答「没有」：

> It depends on the site's HTML. Everything else I can fix. That one I can only keep up with.

---
上级：[[600-素材与样本/00-原文索引|原文索引]]
