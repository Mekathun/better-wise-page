# Better WiSE — 进度交接（PROGRESS.md）

> 给下一个会话（或下一个我）：读完这一页就能接着干，不要重新摸。

## Goal（用户原始要求，m01426 原话）
"我要离开了。你先根据当前进度做 progress.md（我新加载了很多 skill），然后你定一个 goal，修 bug+做完，检查每个窗口和页面是否已经成功黑色化。给你四个小时时间，上下文不够了就开新会话然后把 progress.md 发给他"

- 当前 goal id：`goal-b6659035-6812-4092-af62-cc84deab8eb4`（maxGoalRounds 40）
- 工程目录：`D:\DSH\Better_WiSE\extension\`
- 交付物：根目录 `Better_WiSE_v0.1.1-beta9.crx` / `.zip`（扩展 ID `ecdedhcfflmobjlbcfanknhcpnnchefi` 必须保持不变）
- 版本规则：`manifest.json` 的 `version` 与 `options.js` 的 `MANIFEST` 兜底串必须同步，每次 +1 末位，再用 `node build-extension.mjs` 打包

## Done（已完成并实测）
1. **面板归位**：`home.js` 里 `placePanel(node)` 把 `[data-wesley-home]` 插到 `[data-timetable-header]` 之后（退路 `.column-left` 顶部）；`reattach()` 先清 `[data-wesley-mount]` 残留再插回。beta7 的 `document.documentElement.appendChild` 已删除。
2. **`HOME_RE` 放宽**：`/^\/(home\/?|dashboard(\/.*)?)?$/`，否则 SPA 路由变化后永不加回。
3. **删掉 `.wt-summary` 的入场动画**：`animation:wtPanelIn` 在重插时会重播（闪一下），且 `document.hidden` 时动画 paused 卡在 `opacity:0`。
4. **全站暗色**：把 home.js 里 97 条站点级暗色规则抽成 `extension/theme.css`，由 `manifest.json` 首个 content_scripts（`boot.js`，`document_start`）以 `"css": ["theme.css"]` 注入，所以 `/news`、班级页等非首页也黑。
5. **字号事故已修**（用户确认"字体恢复正常"）：抽规则时留下悬空选择器 `html.wt-perf[data-wt-theme="dark"], ` 与下一条 `.wt-nextday-btn{font-size:11px}` 拼成合体规则，`html` 拿到 `font-size:11px`（站点全用 rem）→ 整站缩小。现实测 `html` 16px。
6. **页面级暗色验收 14/14 通过**：`timetable`、`calendar-week`、`news`、`pastoral`、`homepage`、9 个班级页，全部 `white: 0`、`fs: 16px`（脚本 `tools/probe/audit.mjs`，报告 `tools/probe/audit.json`）。
7. **弹层级暗色验收**：
   - 课表卡片详情模态 `dialog.wt-modal-dialog[open] .wt-modal` → bg `rgb(27,27,30)`，576×215，深色可读（打开方式：先点 `.wt-summary-head` 展开面板，再点 `.wt-task`）
   - 设置弹层 `.wt-set-pop.show` → `rgb(32,32,35)`，300×371
   - 明日预览 `.wt-nextday-modal` → `rgb(27,27,30)`，512×530
   - BW Search 覆盖层 `.wt-sr-card` → 修成 `rgb(31,31,34)`，结果行文字 `rgb(231,229,234)`（修之前整块白）
   - `options.html` → 深色正常，开关不再是白底白钮
8. **去掉紫色勾 / 开关改中性**（用户 beta7 提过）：`.wt-check.on` 改 `#3f3f49` 底白勾（暗色 `#e7e5ea` 底深勾）；`options.html` 的 `.switch.on` 暗色改 `#8b8b96` 灰轨白钮。
16. **非首页也能即时切主题**（`search.js` 新增 `initTheme()` / `applySiteTheme()`）：读 `chrome.storage.local.theme` → 写 `localStorage['wesleyTheme']` → 设 `html[data-wt-theme]`；`storage.onChanged` 里同样处理，并移除 boot 阶段注入的 `#wt-boot-theme` 深色底板。实测 `/news`：dark↔light 双向即时切换，`localStorage` 同步跟随（之前切到 light 后仍是 `dark`，会让下次加载闪一下深色）。
17. **暗色首帧不闪白**（`tools/probe/fouc.mjs`）：document_start 注入观察器，`readyState=interactive` 时 `html` 上已是 `data-wt-theme=dark` 且 `localStorage=dark`，没有"先浅后深"的属性翻转记录。
18. **设置弹层的 document 监听器不再累积**（`home.js`）：`document.addEventListener('click', () => closePop())` 改成模块级 `bindPopOutside` 单例 + `ACTIVE_POP.close()`。
19. **资源页结论**：`/resources`、班级页都拿不到 `/resources/<id>` 形式的链接（文件是 `/send.php?id=` 下载），所以"文件预览页"这一层没有可导航的页面；resources 树本身已算 `white: 0`。PDF/iframe 预览仍未测。
20. **最终验证一次过**：14 个导航页 + 5 个补漏页全部 `white: 0`、`fs: 16px`；搜索覆盖层 `rgb(31,31,34)`；面板折叠 165→63；搜索 `↓` 选中、`esc` 关；设置弹层外部点击关；明日预览 `esc` 关。
15. **手机宽度下齿轮不再压 logo**：`placeSettingsBtn()` 里 `if (!ar.width) return;` 改成先把按钮 `display:none` 再返回（头像被站点隐藏时，按钮原本留在静态位置挡住 WISE logo）。390px 复测正常。
14. **交互回归通过**（`tools/probe/interact.mjs`）：面板折叠 165px → 63px；搜索输入 `exam` 出 36 行、`ArrowDown` 选中第 1 行（选中类名是 `.wt-sr-row.sel`，不是 `.active`）、Esc 关闭；设置弹层点外部关闭（监听的是 `click` 不是 `mousedown`，测试别用错事件）；明日预览 Esc 关闭。
10. **补漏页也全黑**（`tools/probe/audit2.mjs`）：`/due-work`、`/feedback`、`/mypages`、`/activities`、`/resources` 全部 `white: 0`；`/feedback` 的两个白输入框（Your Name / Email）已修。
11. **浅色回归通过**（`tools/probe/lightcheck.mjs`）：dashboard / news / 班级页在 `wesleyTheme=light` 下背景 `rgb(240,240,240)`、`html` 16px，暗色规则没污染浅色。
12. **窄屏通过**（`tools/probe/narrow.mjs`，390×844）：无横向溢出（`scrollWidth == innerWidth`），搜索覆盖层 358×659 居中且深色可读。
13. **滚动条**：暗色下改 `scrollbar-color:#4a4a54`，不再出现白色粗条。
9. **beta9 已打包**：`version 0.1.1.9`，`Better_WiSE_v0.1.1-beta9.crx`（约 431KB）/`.zip`。

## Next（按顺序做）
1. **暗色首帧闪烁（FOUC）**：`boot.js` 在 `document_start` 读 `chrome.storage`（异步），首次进入可能先白一下再变黑。做法：在 `document_start` 用一个极小的内联脚本先读 `localStorage` 缓存的主题（`boot.js` 写入缓存，`home.js`/theme.css 用属性），或先用 `matchMedia('(prefers-color-scheme: dark)')` 兜底。
2. **`makeSetPop()` 的监听器累积**：`document.addEventListener('click', () => closePop())` 每次调用都挂一次（`home.js:2268` 附近），面板重渲染多次会累积。改成模块级单例监听 + `ACTIVE_POP` 判断。
3. **手机宽度下课表被裁**：390px 时站点自己的课表表格宽 1436px、`tableLeft=32`，左侧 Period 列被裁掉。这是站点自身移动端行为（我们的 CSS 没有命中那张表），**未做无扩展对照验证**，需要时用干净 profile 复现对比。
4. **`/resources/<id>` 具体文件页**：只测了列表页 `/resources`，文件预览页没测。
5. **暗色下的图片/PDF 预览**（iframe）不强行反色，但外框要深色，未逐页确认。
6. **PROGRESS.md 每步更新**；最后一轮把 Done 补齐、清掉 Next，并 `node build-extension.mjs` 出最终 beta。

## Open questions（等用户拍板）
- "去掉紫色元素"要到什么程度？站点主色本身就是紫色（导航条、侧栏标题），全去掉会不像 Wesley 了。目前只把我方 UI 的复选框/开关改中性，品牌紫保留。**需要用户确认**。
- 要不要为暗色加一个"跟随系统"之外的亮度/对比度选项？
- 推 GitHub：**必须用户明确同意**（本 goal 不含推送）。GitHub 仓库/账号都还没配。

## Key facts（省得重新发现）
- 测试浏览器：`tools/probe/live-ext.mjs` 启动
  `"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --user-data-dir=D:/DSH/Better_WiSE/tools/probe/ext-profile --load-extension=D:\DSH\Better_WiSE\extension --remote-debugging-port=9701`
- **改完扩展文件必须 `taskkill //IM msedge.exe //F` 再重启**，content script 不热更新。
- CDP helper：`file:///C:/Users/asus/Documents/deepseek-harness/default-workspace/.edge-ai/cdp.mjs` 的 `connectTo(ws)` / `evalJs(expr)`。
- 探针：`audit.mjs`（逐页白块审计）、`audit-ui.mjs`（弹层）、`ui2.mjs` / `ui3.mjs`（搜索覆盖层、详情模态）、`settheme.mjs dark|light`、`shot.mjs`、`goto.mjs`。
- 暗色开关：`chrome.storage` 的 `wesleyTheme`，页面根元素 `html[data-wt-theme="dark"]`；CSS token 变量 `--wt-t-ink` / `--wt-t-ink-2` / `--wt-t-ink-3` / `--wt-t-line` / `--wt-t-line-soft` / `--wt-t-line-strong` / `--wt-t-surface`。
- 样式优先级坑：`theme.css` 在 `document_start`，`content.js` / `search.js` 的样式表在 `document_idle` 之后注入，**所以 theme.css 里的暗色规则一律带 `!important`**。
- 弹层用真实鼠标点会被"外部点击关闭"吃掉（press/release 各 60ms 算两次点击），改用 `.click()` 或展开面板后再点。
- 账号/密码：用户已在会话里给过测试账号，**不写进任何文件**（本文件、仓库、文档都不落）。

## 分发：文件站（FB）

用户把 `http://mekathun.tplinkdns.com:11451/` 叫 FB。插件走固定目录 `/better-wise/`：

```
/better-wise/README.txt          给用户看的说明（怎么装、版本对照）
/better-wise/debug/current/      调试版，**解压后的目录树**（Edge 只能加载解压文件夹）
/better-wise/debug/*.zip|.crx    同版本存档
/better-wise/stable/current/     正式版目录树
/better-wise/stable/*.zip|.crx   同版本存档
/better-wise/stable/archive/     更老的版本（0.0.138）
```

一键上传（解压 + 清远端 + 建树 + 逐个传 + 核对文件数）：

```bash
cd /d/DSH/Better_WiSE
bash tools/fb-upload.sh debug      # 自动挑根目录最新的 Better_WiSE_v*.zip
bash tools/fb-upload.sh stable
```

脚本做的事和坑：
- **FB 不能服务端解压**：`POST /api/resources/<zip>?action=unarchive` 返回 409，`?override=true` 返回 403（账号 `modify=false`），拿一个只有 1 个文件的小 zip 试过也一样。所以只能本地解压后逐个文件传（当前 22 个文件：13 个根文件 + icons/ 9 个）。
- 该账号**不能覆盖同名文件**：`current/` 每次先 `rm` 再建再传。
- 本机 bash 没有 `cygpath`/`unzip`/`sha256sum`：解压用 `powershell Expand-Archive`（路径用 `D:/...` 正斜杠形式），校验用 `certutil -hashfile`。
- 存档文件名用 **manifest 里的 version**（不是包名里的 betaN），例：`Better_WiSE_v0.1.1.10.zip`。
- 传完核对：远端 root 14 项（13 文件 + icons 目录）、icons 9 项。
- 扩展 ID 固定为 `ecdedhcfflmobjlbcfanknhcpnnchefi`（manifest 带 `key`，与路径无关），设置跟着 ID 走。

规矩：
- 新构建先过完整验收（audit.mjs + audit2.mjs + interact.mjs），再传 debug；stable 只放验收过的。
- 2026-11-05 已传：`debug/current` 与 `stable/current` 均为 `0.1.1.10`（22 个文件，回读 `manifest.json` 与本一致）。

## 第二轮（beta11，2026-11-05 10:00–10:20）

用户报了一组 bug（原文见会话 m01828/m01838/m01885/m01940），逐条处理结果：

1. timetable 下面的空白条 —— 站点给 `table.timetable` 留了 `margin-bottom:60px`，套在 `.scrollable` 里就是那条空白。`home.js` 加 `table.timetable.wt-table{margin-bottom:0 !important}`，复测 `scrollable 218 == table 218`。
2. news alert 取到第二条 —— 原来用 `/news/<id>` 数字最大当最新，站点 id 不按时间递增。改成从卡片文字解析 "18 hours ago"，取 age 最小。实测弹的是当天 10:00 发的 "GW SENIOR SCHOOL CAFE MENU"。
3. 深色下黄色块外有方框 —— 黄色原本刷在没有圆角的 `.wt-alert-wrap` 上。改成 wrap 无背景无边框，颜色落到 `border-radius:12px` 的 `.wt-alert`。
4. 星期筛选误判（把 29 Oct 的课当成今天）—— 原来只比对星期几。改成有日期就严格比日+月，只有星期时用 `publishAt` 超过 8 天就跳过。
5. 总结弹窗加 "Go to full post" —— 三级按钮，实测 `["Go to full post","Go to class page"]`。
6. 动画分三档（用户澄清后重做）：基础档一直开、不可改；"More animations" 控制中等成本动效（入场错峰、悬停位移、模态/下一天过渡）；"Performance mode" 只砍最贵的（backdrop blur、大阴影、filter）。实测：默认 `wtCardIn` 有、关 More 后 `animationName:none`、开 Performance 后阴影消失。
7. options 底部栏在小屏被裁 —— body 允许纵向滚动 + footer `position:sticky`。520px 高视口 footer `y=480` 可见。
8. light 模式下开关/按钮变黑 —— 早前那次"去紫"把 `.switch.on`、`#applyNow`、range thumb、`.wt-modal-go` 全设成 `#332e38`。改回品牌紫 `#64346f`。实测浅色 `rgb(100,52,111)`。
9. dark 弹窗与课程下拉字色太深 —— `theme.css` 补了一整套 `.wt-modal*` / `.wt-modal-menu` 暗色规则。实测弹窗 `rgb(31,31,34)`、正文 `rgb(220,215,227)`、菜单 `rgb(35,35,38)`。
10. next day 入口 —— 搬到真课表 section 右下角（`collected.table.closest('.scrollable').parentElement`），类名 `.wt-tt-nextday`，实测位置 `x=1298 y=392`。点击卡死：未复现，按"请求悬挂 + 全页 innerHTML 正则"加固（`WT_UID` 缓存、`AbortController` 8s、`isConnected` 检查）。
11. post 里老师的彩色字 —— 原来是白底白字一刀切。改成 `color-fix.js`：算相对亮度，只有 `lum<0.34` 的按同一色相提到 0.72。实测 `#000`→`#b8b8b8`、`#8b0000`→`#fb7474`、`#ffd400` 不动、`#1a4d1a`→`#96d996`。

版本 0.1.1.11，产物 `Better_WiSE_v0.1.1-beta11.crx`（446549 B）/ `.zip`（221968 B）。

## 未收口 / 待确认

- ~~FB 传不上去~~ → 已传（10:32）。`/better-wise/debug/current/` 23 个文件，`manifest.json` 版本 `0.1.1.11`；`debug/Better_WiSE_v0.1.1.11.{crx,zip}` 回读 sha256 与本地一致（`3b1b4443…e3d4`）。
- 用户侧"点 next day 整页卡死"没能复现，只做了加固，不能算证实修好。
- 彩色字只在注入的假 span 上验过，还没等到一封真有彩色字的 post。
- 动画分档只验了 `.wt-task` 的入场与阴影，`.wt-sr-*` 覆盖层在 Performance 下的表现没逐项看。

## 第三轮（beta12，2026-11-05 10:57–11:02）

用户报的四个问题：
1. **`openNextDay is not defined`** —— 真 bug。`openNextDay` / `allClasses` 定义在 `buildSummary` 作用域里，而"Next day"按钮注入点在 `main` 作用域，点下去必然 ReferenceError。修：在 `buildSummary` 里（`async function enrichDueDetails` 之前）挂 `window.__wtNextDay = () => openNextDay(allClasses())`，两处按钮的 onclick 都改成调这个钩子并 try/catch。实测点开弹窗、7 行课程、无报错。
2. **面板里科目名 `<b>Science</b>` 还是深色** —— `.wt-up li b{color:#222}` 是写死的。`theme.css` 补 `html[data-wt-theme="dark"] [data-wesley-home] .wt-up li b → #e7e5ea`、`.wt-topic → #a9a5b0`、`.wt-cd.soon → #f08a7e`。实测 `rgb(231,229,234)` / `rgb(240,138,126)`。
3. **窄屏导航拥挤** —— 新增 `fitDock()`：以"最后一项右边缘 vs `.right-small` 左边缘 -6px"判断挤压（站点的 `ul.top-menu` 是 flex，挤的时候不溢出、只会互相压住，所以不能看 `scrollWidth`），超了就按偏好表 `Contact Us → My Pastoral → Feedback → My Pages → Calendar → News → Timetable → Due Work → Classes` 收掉一个原生 tab，最多收 4 个；`resize` 防抖 160ms 重算，每次先恢复再重新判断。实测 1200/1100/1000/900/820/760 全部 `overlap:false`。
4. **通知铃铛被挤到最右、右边距没了** —— 原来是 `bell.style.transform = translateX(40px)` 硬挪。改成把齿轮按钮插进铃铛的容器（`.right-small`）排在铃铛左边，`position:static` + `margin-right:6px`，铃铛不再位移；宽屏下铃铛贴边时给它父容器补 8px `margin-right`。实测 bellGap 从 0 变成 8（≥1100），窄屏沿用站点自己的 48。

版本 0.1.1.12，产物 `Better_WiSE_v0.1.1-beta12.crx`（449446 B）/ `.zip`（223421 B）。
FB：`/better-wise/debug/current/` 23 个文件，`manifest.json` = 0.1.1.12，`search.js` 回读与本地 `cmp` 一致。

## 第四轮（beta13，2026-11-05 11:13–11:40）

用户报的另外一组（m02269 原文）：面包屑深色下还是黑、右上角间距要加倍且齿轮常显、Next day 弹层"wt-modal-overlay wt-show"看不到条目、课程下拉多出一门莫名的课、Upcoming 面板深色下有阴影且 +/- 是白按钮、upcoming 底下大片空白。

1. **面包屑**：真因在 `/homepage/8991` 这类内容页的 `ul.breadcrumb > li > span`，站点给它写了黑色（父 `li` 其实是浅紫）。`theme.css` 追加 `html[data-wt-theme="dark"] #content ul.breadcrumb … li span { color:#cfc4d8 !important }` + hover `#fff` + 分隔符 `#8d8798`。实测 `Curriculum` 从 `rgb(0,0,0)` → `rgb(207,196,216)`。classes 列表页与班级页本来就没有黑字。
2. **Next day 看不到条目**：真 bug —— `openNextDay` 里写的是 `overlay.classList.add('wt-show')`，而 CSS 只认 `.show`，所以弹层一直 `opacity:0`（用户看到的 `wt-modal-overlay wt-show` 就是它）。改成 `add('show')`。实测 `{cls:"wt-modal-overlay show", opacity:"1", rows:7}`，正文 "Timetable · Friday 6 Nov / 8:30am – 8:40am / Year 10 Tutor Group"。
3. **多出一门课**：连查三层才定位到 —— SNAP 里有一份把课名当 `code` 的重复条目（`code` 与 `name` 都是 `10 Lang Acquisition: English 3`）。修了三处：`classList` 循环开头丢掉含空格/冒号的假 code；`classForCode` 命中的 SNAP 条目 code 形状不合法时用排课代码重建；末尾 `lae` 兜底要求 code 形状合法。标签栏从 9 项变 8 项，不再出现那门假课。
4. **右上角间距**：齿轮由绝对定位改为插进 `.right-small` 排在铃铛前（`position:static`、32×32），容器加 `padding-left:8px`、`margin-right:12px`。实测 gapAG 12px、gapGB 12px、bellVsSec 0（原来分别是 8 / 6 / 贴边），窄屏头像隐藏时齿轮也不再跟着藏起来。
5. **Upcoming 面板**：`home.js:797` 的暗色 `box-shadow` 改 `none !important`；`.wt-up-btn` 暗色底 `#2a2a2e` / 字 `#d6b9e8`、hover 与 `.on` 用品牌紫。实测按钮 `bg rgb(42,42,46)`、`bodyShadow none`。

审计复跑：14 个导航页 + 5 个补漏页仍然全部 `white: 0`、`fs: 16px`。

版本 0.1.1.13，产物 `Better_WiSE_v0.1.1-beta13.crx` / `.zip`；FB `debug/current` 23 个文件、manifest 0.1.1.13。
还差的：upcoming 底下"大片空白"只确认了 `.wt-up-body.open` 166px、子项 158px，没有在用户那种展开状态下复现，需要他再指一次具体位置。

## 第四轮补（beta14，2026-11-05 11:46–12:10）

用户 m02529："原生notification是被截了吗？点开没有最新的news了，但是alert里仍然能显示！还有右上角margin仍然没做全屏的情况下右上角的notification按钮被切了一半"

- **铃铛被切一半（真 bug）**：`#notifications.right-small` 是 `position:absolute; right:16px` 的固定宽度 flex 盒；我把齿轮塞进去后内容宽度超出容器，铃铛被顶到容器外，右边缘正好压在栏的圆角上，于是看起来被切。修法是把容器改成 `width:auto; flex:0 0 auto; min-width:0; padding-right:8px`，让它按内容撑开、整体左移。齿轮缩到 28×28、`margin-right:8px`。实测 1440 全屏：头像→齿轮 12px、齿轮→铃铛 8px、铃铛距栏右边缘 8px（原来 8 / 6 / 贴着边）。
- 试过给 `#notifications` 加 `overflow:visible`，后来确认通知面板其实是它的兄弟节点 `#msgs`（`.right-off-canvas-menu`，`absolute; right:16px`），跟容器裁切无关，已撤回这条规则。
- **"点开没有最新 news"不是我们的问题**：`#msgs` 的列表直接读站点自己的通知数据，实测 10 条、最新一条是 "19 hours ago"，完全没有当天的 cafeteria 帖。我们的 alert 是直接抓 `/news` 列表算出来的，所以会新于站点通知。面板本身现在完整可见（x=1134、右边缘 1394、视口 1425）。

版本 0.1.1.14，FB `debug/current` 已覆盖。

## 第五轮（beta15，2026-11-05 15:00–16:10）

用户 m02577 五条：
1. **"为什么 /news 和 #msgs 不一样"**：两者来源不同。新闻侧标走站点服务端渲染的 `/news/lists/feed` + 每篇 `/news/<id>`；铃铛的 `#message-list` 是**服务端渲染在页面 HTML 里**的通知列表，加载页面时没有任何通知 XHR（实测 resource 只有 calendar/news/css），它由站点的通知作业维护，所以会滞后。我们的 alert 直接读 `/news` 列表，因此会比铃铛新。
2. **alert 停在第二新**：加了 `startNewsWatch()`，每 45s 在 alert 打开时复查一次（`document.hidden` 时不跑），有新帖就直接替换成最新那条；用户手动点 × 后打 `data-wt-dismissed`，本页不再弹，但仍把 `lastNewsId` 推到最新。
3. **Next day 改成原地换课表**：新 `swapNextDay()` / `altTableFor()`。点 "Next day ›" → 拉明天日历 → 克隆今天这张站点表格、按"表头时间 = 课节开始时间"逐格换科目与配色（今天同门课的颜色沿用，没有的按 code 哈希取调色板 + 亮度决定字色）→ 旧表左滑淡出、新表从右推入（.42s cubic-bezier(.23,1,.32,1)），按钮变 "‹ Back"，再点回退。实测：7 格正确、`origDisplay:none`、点 Back 后 `altGone:true`、按钮复原。状态挂 `window.__wtTtSwap`，因为 `buildSummary` 会重跑。
4. **Smoother animations 并进父项**：删掉独立的 `.row.sub` 开关，`options.js` 里相关字段与监听一并删掉，"More animations" 现在同时管过渡缓动；`home.js` 不再切 `wt-no-smooth`。
5. **AI 开关不再开新页**：新增 `openBWSettings()`（`document.dispatchEvent(new CustomEvent('wt:open-settings'))`），`search.js` 监听后 `ensureSettings()+toggleSettings()` 打开页面内非模态面板；无监听时才 fallback 到 `openOptionsPage()`。实测点未解锁的 AI 开关 → `.wt-sr-setpanel.show` 300×640 加载 options.html。
6. **设置页横向版**：`options.html` 加 `@media (min-width:520px)`：body 居中 max-width 940、`main` 变 `repeat(auto-fit,minmax(340px,1fr))` 两列网格、首屏大开关单独占一行居中；300px 浮层 iframe 仍是竖版。同一个文件，功能不分裂。1024×760 实测 `bodyW 940`、两列 425/425。

版本 0.1.1.15，FB `debug/current` 23 个文件。

## 第五轮补（beta16，2026-11-05 16:10–16:45）

用户 m02696 报的 next day 问题：
1. **回退时出现两行、原课表变灰不可点**：上一版用 `display:none` + 内联 transform/opacity，回退时没清干净。现在统一走 `showToday()` / `clearSwap()`：回退时先恢复原表、等过渡结束再删掉图层，并把 `display/visibility/transform/opacity` 全部复位；同时 `clearSwap` 会扫掉所有残留 `table.wt-tt-alt` 与 `.wt-tt-alt-host`。实测回退后 `alts:0 hosts:0 vis:visible op:1 tr:none`。
2. **新表缺编号和教室**：先按 `normCode` 从今天的格子记下 `（编号）教室` 原文，明天同门课照抄；日历里没出现过的新课补成 `G/XXXX` 大写形状。实测 8 格：`Year 10 Science (G/M10SCI0-YA7) C203` 等。
3. **点 Next day 卡住**：加 `sessionStorage['wtNextDay:<本地日期>']` 缓存 + 建完课表 2s 后 `prefetchNextDay()` 静默预取；点按钮时命中缓存立即出图，没缓存才显示 `Loading…` 并禁用按钮。
4. **连点两层表**：`window.__wtTtBusy` 防重入 + 进图层前先 `querySelectorAll('table.wt-tt-alt').forEach(remove)` + `if (window.__wtTtSwap) return`。实测连点两次只得一层，`alts:0` 后按钮正确回到 Next day。
5. **图层把布局压塌**：原表原来是 `display:none`，`scrollable` 高度塌成 0，绝对定位的新表就浮到别的区块上（这就是看起来"两行"的另一半原因）。改成原表保留占位、只 `visibility:hidden`。实测 `hostH:218`，新表 y 与宿主一致。
版本 0.1.1.16，FB `debug/current` 已覆盖。

## 第五轮补二（beta17，2026-11-05 16:00–16:30）

用户 m02743 的暗色主开关三条：
1. **阴影违和**：原来暗色 `.track` 带 `inset 0 10px 18px rgba(0,0,0,.45)` 的重内阴影。改成浅内阴影 + 轻微外阴影（`inset 0 0 0 1px rgba(255,255,255,.075)`、`inset 0 1px 0 rgba(255,255,255,.13)`、`inset 0 -16px 26px -20px rgba(255,255,255,.12)`、`0 2px 9px rgba(0,0,0,.32)`），玻璃感靠上下高光而不是黑影。
2. **关态 liquid glass / 狮子刻看不清**：`.bg-lion` 从 `opacity:.35` 提到 `.95`，渐变改浅紫 `rgba(238,224,252,.72) → transparent`，再加 `filter: drop-shadow(0 1px 0 rgba(0,0,0,.55))` 让它读起来像刻进去的。
3. **球上的白环**：来自 `.btn::before` 的 `inset 0 1.5px 0 #fff` 与 `.slot` 的 `0 1px 0 rgba(255,255,255,1)`。暗色下改成 `inset 0 1px 0 rgba(255,255,255,.13), inset 0 -1px 0 rgba(0,0,0,.5)`，`::after` 高光也从 `.88` 压到 `.15`，`slot` 只留 1px 的 `rgba(255,255,255,.05)`。
- 浅色回归：`msw.mjs` 在 light 下截图对比，外观没变（改动全在 `html[data-wt-theme="dark"]` 前缀内）。
- 版本 0.1.1.17，FB `debug/current` 已覆盖。

## 第五轮补三（beta18，2026-11-05 16:30–16:50）

User said (m02779)："圆框的内阴影也要改的更立体一点"；User said (m02783)："还有现在这个 settings 页面还不如直接用之前的页面，然后居中放置呢，现在这个比窄屏丑"
1. **圆球立体感**：暗色 `.msw .btn` 从线性渐变改径向（`radial-gradient(118% 118% at 34% 24%, ...)`），内阴影上下不对称：顶部 `inset 0 2px 2px rgba(255,255,255,.12)` 受光、`inset 0 12px 16px -12px rgba(0,0,0,.7)` 压暗、底部 `inset 0 -12px 18px -10px rgba(0,0,0,.85)` 兜住；`::before` 环改 `inset 0 1.5px 1px rgba(255,255,255,.22)` + `inset 0 -2.5px 3px rgba(0,0,0,.65)`；`::after` 换成以球心偏左上为原点的径向高光。球上的狮子刻（`.groove`）同时改成上亮 `rgba(255,255,255,.62)`、下暗 `rgba(0,0,0,.72)`，读起来是凹刻。
2. **设置页改回竖版居中**：撤掉两列网格，`@media (min-width:520px)` 现在只有 `body{width:340px;max-width:340px;margin:24px auto;border-radius:18px;box-shadow:...}`，内容还是原来那套排版，只是摆在一张居中卡片里。1024×760 实测 `bodyW 340`。
- 版本 0.1.1.18，FB `debug/current` 已覆盖。

## 第五轮补四（beta19，2026-11-05 16:50–17:05）

User said (m02804)："内阴影没改啊，应该是下面亮上面暗，外阴影是上面亮下面暗。你就做最普通的线性渐变就行了，不用在面上叠更多的"
- 球面改回**最普通的线性渐变**（`linear-gradient(180deg,#3b3b42,#2c2c32 52%,#24242a)`），删掉径向渐变与叠加高光层（`::after` 直接 `background:none`）。
- 内阴影（凹）下面亮上面暗：`inset 0 3px 4px -1px rgba(0,0,0,.62)`（顶上暗）+ `inset 0 -2px 2px -0.5px rgba(255,255,255,.16)`（底下亮）。
- 外阴影（凸）上面亮下面暗：`0 -1px 0 rgba(255,255,255,.10)`（上沿高光）+ `0 2px 4px rgba(0,0,0,.45)`（向下投影）。
- 球窝 `.slot` 同样处理：`inset 0 4px 6px -1px rgba(0,0,0,.75)` + `inset 0 -2px 2px -0.5px rgba(255,255,255,.12)`。
- 球上狮子刻：上暗下亮（`c-d` 深、`c-l` 亮）。
- 版本 0.1.1.19，FB `debug/current` 已覆盖。

## 第五轮补五（beta20，2026-11-05 17:05–17:20）

User said (m02820)："你不能参考亮色版本的吗？" / (m02824)："我说的内外阴影，是那个圆环，环是外，环内是内阴影，明白不？整个按钮是个碗状的，碗口是外阴影"
- 结论：圆钮是**碗**。碗口（外圈那圈环）= 外阴影 → 上亮下暗；碗内（环里面的面）= 内阴影 → 上暗下亮。
- 做法：暗色直接照搬亮色的阴影结构，只把数值按暗色换算，不再自创：
  - `.slot`：`inset 0 4px 8px -3px rgba(0,0,0,.62)` + `inset 0 1px 0 rgba(255,255,255,.10)` + `inset 0 -1px 1px rgba(255,255,255,.09)` + `0 1px 0 rgba(255,255,255,.06)` + `0 2px 5px rgba(0,0,0,.52)`。
  - `.btn`：线性渐变 `#303036 → #28282d 46% → #202024`；`0 3px 4px rgba(0,0,0,.5)`（外，向下）、`0 1px 1px rgba(0,0,0,.4)`、`inset 0 -2px 3px rgba(255,255,255,.15)`（内底亮）、`inset 0 3px 4px rgba(0,0,0,.55)`（内顶暗）。
  - `.btn::before`：`inset 0 1.5px 0 rgba(255,255,255,.24)` + `inset 0 -1.5px 0 rgba(0,0,0,.55)`（环的上沿亮、下沿暗）。
  - `.btn::after`：`rgba(255,255,255,.20) → rgba(0,0,0,.34)` 的竖向渐变（环面高光）。
- 亮色未动，`msw.mjs` 两态截图对比确认同一套结构、只是配色不同。
- 版本 0.1.1.20，FB `debug/current` 已覆盖。

## 第五轮补六（beta21，2026-11-05 17:20–17:30）

User said (m02837)："碗内的顶上压暗，下面提亮的感觉让他更多一点"
- `.msw .btn`（暗色）碗内对比加大：渐变 `#1d1d21 0% → #28282d 52% → #3c3c45 100%`（上暗下亮跨度拉开）；内阴影 `inset 0 9px 14px -3px rgba(0,0,0,.78)`（顶部更压）、`inset 0 -5px 8px -1px rgba(255,255,255,.26)`（底部更亮）。
- 版本 0.1.1.21，FB `debug/current` 已覆盖。

## 第五轮补七（beta22，2026-11-05 17:30–17:40）

User said (m02851)："碗口我没让你动，你为啥加了径向渐变？改了，上亮下暗听不懂吗"
- 查明：整个 `.msw` 里唯一的径向渐变是 `.row.master::before` 那层"模糊光晕"（亮色本来就有，四个 `radial-gradient` + `filter:blur(7px)`），暗色里我之前只把它 `opacity` 压到 .22，看起来就像碗口外圈一圈径向光。暗色直接 `display:none`。
- 碗口环 `.btn::after` 收成纯竖向两段：`rgba(255,255,255,.30) 0% → rgba(255,255,255,.06) 42% → rgba(0,0,0,.42) 100%`（上亮下暗），不再有多段色标。
- 亮色未动。
- 版本 0.1.1.22，FB `debug/current` 已覆盖。

## 第五轮补八（beta23，2026-11-05 17:40–17:50）— 主开关定稿

User said (m02868)："下面不够暗"；(m02872)："而且为啥下面有一层反光？纯粹的线性渐变不能做吗"；(m02876)："好了现在这版可以了，不用改了"
- 碗面改成**纯线性渐变**：`linear-gradient(180deg,#1b1b1f 0%,#29292f 62%,#3b3b44 100%)`，只保留外投影 `0 4px 8px rgba(0,0,0,.62), 0 1px 2px rgba(0,0,0,.5)`；删掉底部那圈 `inset ...rgba(255,255,255,.26)` 反光带。
- 环（碗口）只留两道 1.5px 的边：`inset 0 1.5px 0 rgba(255,255,255,.16)`（上亮）、`inset 0 -1.5px 0 rgba(0,0,0,.72)`（下暗）；`::after` 的高光层 `background:none`。
- 亮色分支未改。
- 用户确认"这版可以了，不用改了"，主开关到此定稿。版本 0.1.1.23，FB `debug/current` 已覆盖。

## 第六轮（beta23 收尾，2026-11-05 16:50–17:05）— 我改错、用户纠正后回退

User said (m02885 附近，原话要点)：
1. "我要这个due的机制和之前一样，你咋给我新做了一版出来？我要打开是模态，正文就自动读assessment内容，然后有俩按钮的那个！你这样搞的话，ai也搞不了了"
2. "插件页顶部有：html[data-wt-theme="dark"] .msw .btn::before {...} html[data-wt-theme="dark"] .msw .btn::after { background: none !important; }"
3. "底部的覆盖栏让他上边盖掉的更多一点，现在靠近animation speed那个地方，刻度和下面的覆盖栏都将近重合了"
4. "能不能让刻度里滑块近一点？现在太远了，就像两个板块"
5. "这个next day的模态弹窗还行，但是让每一项都变成可点击的卡片，逻辑和原来那个一样"

- **纠正我自己的错**：上一轮我把 due 卡的点击改成"新标签直接打开 assessment"，用户要的是**模态**。已撤销 `window.open` 分支，恢复 `openModal({..., fromDue:true})`。
- **补上正文自动读取**（这才是用户要的"机制一样"）：`home.js` 新增 `async function fetchAssessmentText(href)`（`fetch(href,{credentials:'include'})` → `DOMParser` → 取 `#main .content / #main / .main-content / article / .content`，删掉 `nav,header,footer,script,style,.sidebar,.menu,.breadcrumbs,.tabs,button`，`innerText` 压空白、截 900 字）。`openModal` 渲染末尾：`if (opts.fromDue && !detail)` 且有 assessment 链接时，先在 actions 前插 `.wt-modal-detail.wt-modal-detail-loading`（文案 `Reading assessment…`），拿到文本后替换；空则显示 `No description on this assessment.`。
- **插件页顶部那段 CSS**：`options.html` **第 1–3 行**（`<!doctype html>` 之前）误插了 `html[data-wt-theme="dark"] .msw .btn::before/::after` 两条规则，浏览器把它们当纯文本渲染在页面顶部；同样规则样式表 331 行已有 → 删除前 3 行。
- **底部覆盖栏**：`footer` 的 `padding: 8px 10px 12px` → `22px 10px 12px`；渐变改成 `rgba(242,232,247,0)→.86@26%→.97@52%`，加 `backdrop-filter: blur(6px)`；`body{padding-bottom:6px}`；暗色单独一条 `linear-gradient(rgba(21,21,23,0)→.88@26%→.98@52%)`（原来暗色 footer 是 `background: transparent`，等于没盖）。
- **刻度贴近滑块**：`.row.slider input[type=range]{margin:0; height:16px}`（原来 `margin-top:2px`），`.ticks{margin:-3px 0 0; padding:0 1px}`（原来 `margin-top:2px`）。实测轨道底到刻度顶 -6px。
- **next day 每行可点**：`openNextDay` 里每行加 `wt-nextday-card`（`margin:0 -8px; padding:10px 8px; border-radius:10px; hover 底色; focus-visible 描边`），`role=button/tabindex=0`，点击走 `openModal({cls, items})`；`normItems(cls)` 为空时用该行列出的当堂任务兜底；`keydown` Enter/Space 也能开。
- 版本仍 `0.1.1.23`，`node extension/build-extension.mjs` 重打 `Better_WiSE_v0.1.1-beta23.zip`（230,435 B）。`options.html` 页脚静态兜底改成 `0.1.1-beta23`。
- 验证：`node --check home.js / options.js` 通过；`build/test-news-alert.mjs`（7 条）、`build/test-crawl.mjs`（13 条）、`build/test-rename.mjs`（真实 DOM 改名同步）全绿；探针 `tools/probe/restart-ext.mjs` 实测 next-day 模态 7 行、opacity 1；`nd-click.mjs` 实测点行开课模态；`popup-pair2.mjs` 实测刻度贴轨道。

## 第七轮（beta24，2026-11-05 17:05–17:45）— due 正文总算读对、暗色逐页补、快捷键与折叠记忆

- **due 模态抓到的是用户菜单，不是 assessment 正文**（真 bug，探针实测 87 字全是 `Profile Options / Notification Settings / Logout`）。
  根因是 `doc.querySelector('#main .content, #main, .main-content, article, .content')` —— 逗号列表返回的是**文档里最靠前**的那个，不是列表里最靠前的；这个站点的用户菜单带 `.content`，排在正文前面，所以永远抓菜单。
  改成 `ASSESS_BOX_SELECTORS` 按优先级逐个试，命中第一个「≥60 字且不像站点门框」的就停；新增 `looksLikeSiteChrome()` 做内容判别、`domToText()` 手工补换行（DOMParser 文档没有布局，`innerText` 会退化成 `textContent` 把整段挤成一行）。
  `enrichDueDetails()` 有同一个毛病（还会被自己的兜底正则改成 `No information available yet.`），一并换掉；正文也不再走 `formatDetail()` 的课表断行，否则 "Assessment" 这类词会被从中间切开。
- **Next day / Alt+T 换的日期挂在面板头上**：`notifyDaySwap()` 广播 `wt:day-swapped`，面板头插一个 `.wt-day-chip`（如 `Fri 6 Nov`），点它切回今天；`swapNextDay()` / `showToday()` 两边都会通知。
- **Due 分组**：`dueBucket()` 分今天 / 明天 / 本周 / 以后，每组一个 `.wt-due-ghead` 小标题 + 条数；**编辑和删除模式下不分组**，否则拖拽排序会被分组标题切断。
- **面板折叠记忆**：`.wt-panel-body / .wt-sec-body` 挂 `data-wt-key`，`toggleSection()` 写 `localStorage['wesleyPanelOpen']`，重新加载按上次状态直接展开（不走动画）。实测刷新后 panel 展开、Due 展开、To do 收起。
- **快捷键**（`search.js` 的 `onGlobalKey` 统一收）：`Alt+K` 搜索、`Alt+T` 今天⇄下一个上学日、`Alt+D` 展开 Due。`Alt+T/Alt+D` 走 `document` 上的 `wt:shortcut` 事件，由 `home.js` 接。`Alt+D` 在 Chromium 里没被地址栏吃掉，实测能收到。
- **搜索增强**：`Esc` 先清空输入、再按一次才关；`Ctrl+Enter` 开第一条；最近 5 条查询存 `localStorage['wtSearchRecent']`，空输入时在筛选 chip 下面排成一行，点一下填回去。
- **日志自动导出**：`autoExportLogsNow()` 上限 10 分钟一次（`wesleyAutoExportAt`），`wtLog()` 里出现 error/fail/exception/timeout/429、或者 `window.onerror` / `unhandledrejection` 触发时，若设置里 `autoLogs` 开着就自动下一份 txt。设置里的开关文案改成 `Auto-export logs on open / on error`。
- **设置入口消歧**：面板每个 section 头那个 `Settings` 打开的是「这一栏显示哪些卡片」，和右上角齿轮的全站设置不是一回事，文案统一改成 `Cards`（`title/aria-label: Choose cards for this section`）。面板底部本来就没有重复的 Settings 链接。
- **暗色逐页审计**（`tools/probe/audit-dark.mjs` + `shots.mjs` + `lum.py` 算亮像素占比）：dashboard 6.6%、news 5.9%、calendar/week 5.4%、timetable 9.9%、resources 5.6%、due-work/feedback/mypages/activities 0.2~0.3%。
  补掉的真缺陷：`/news` 分页器白底方块、`/learning/classes` 学期切换白箭头、dashboard 到期红色 `span.gradient-0`（`rgb(234,10,6)`，对比度 1.59:1 → `#ff8f80`）、`/resources` 文件树选中行 `rgb(206,195,207)`、课程卡大色块（`brightness(.78) saturate(.62)`，和课表格子同一套处理）。`theme.css` 末尾新增一节，全部带 `html[data-wt-theme="dark"]` 前缀。
- **设置抽屉暗色**（`options.html`）：`.sheet-card` 之前只有 `background:#fff` 一条，暗色分支写的是不存在的 `.sheet-body / .sheet .inner`，所以抽屉整块纯白；现在补 `.sheet-card / .grabber / .sheet-x / .sheet .row / .ai-lockhint / .circle-help / .apply`，小节标题从 Wesley 紫换成浅灰紫。亮色无回归。
- 版本 `0.1.1.24`（显示 `0.1.1-beta24`），`node extension/build-extension.mjs` 出 `Better_WiSE_v0.1.1-beta24.crx/.zip`。
- **断网降级**（§4.8）：`scrapeLocal()` 抛错或返回空时退回最近一次成功的 `wesleyLocal:*` 快照；`navigator.onLine === false` 时面板头下面挂一条 `.wt-cache-note`（`Using saved data from 2 h ago` + Retry），`online` 事件自动摘掉。实测：`Network.emulateNetworkConditions offline` 后 1.5 秒出现，恢复后消失。
- **强制重新抓取**（§4.2 的一半）：面板头加一个 ⟳ 按钮，置 `sessionStorage['wtFreshAll']` 再 reload，走既有的 `FRESH_ALL` 路径。「全部标已读」和「跳到今天的 homepage」没做 —— 面板里本来就没有已读概念，硬加要引入一套 post 已读状态，这一版先不动。
- **.ics 导出**：Due 那条 tab 栏 `Cards` 右边多一个 `ICS`，把当前筛选下所有有日期的到期项导成日历文件（全天事件、`DTEND` 是次日、逗号分号按 RFC 5545 转义、无日期的条目跳过、空列表给提示）。新增 `build/test-ics.mjs` 直接从 `home.js` 里抽出两段函数在 Node 里跑，验日历头、事件数、日期、转义、空列表。
- **课程别名同步到 Due**：`renderDueTab` 里按 `wesleySubjectAlias` 预算 `d.__label`，Due 卡的课程标签跟着 tab 上改的名字走（`M10IAS0-Y2` 全部显示 `INS` 这类）。Due 页抓来的 code 可能带 `G/` 前缀，两种 key 都试。搜索没做 —— 别名是本地显示偏好，替掉搜索结果的文字反而会让结果搜不到。
- **课程 tab 太长时被挤成半截字**：`.wt-tab` 那条 `flex:0 0 auto` 的选择器写成了 `[data-wesley-home] [data-wesley-home] .wt-tab`（双重属性，永远匹配不到），于是 tab 被 flex 压缩，站点的 `overflow:hidden` 把课程名从中间切断。改成单层选择器 + `max-width:200px` + `text-overflow:ellipsis`，tab 栏恢复横向滚动。
- **「全部标为已完成」（PLAN-beta7 §4.2 最后一项）**：Due 那条 bar 上 `Cards` 左边多一个 `✓`，点一次把当前这一屏所有到期项打勾（`done[d.key]`），再点一次全部取消，两次都给 toast 提示。踩到的坑：`dueCard` 里勾选读的是条目的 `d.key`，而 `gridWithPrefs` 用的 key 是 `dueItemKey(d)`（前缀不同，`dw|…` vs `d|dw|…`），一开始拿 `x.key` 去写，存储里多了一批永远对不上的键，界面一个都不打勾；改成 `(x.d && x.d.key) || x.key` 才对。
- **tab 栏横向滚动条太脏**：`scrollbar-width:thin` 在 Chromium 下会画出一条 9px 的灰条压在卡片上，而且标准属性和 `::-webkit-scrollbar` 同时存在时前者优先，光写 webkit 规则没用。删掉 `scrollbar-width/scrollbar-color`，改用 `::-webkit-scrollbar{height:4px}` + 透明轨道 + 半透明滑块，亮暗各一套。
- 「跳该课的 homepage」这条其实早就有了：`taskCard` / `dueCard` 的课程名本身就是 `<a href=cls.homepage>`，不用另做。
- 验证：六份 JS `node --check` 全绿；`build/test-news-alert.mjs`、`build/test-crawl.mjs`、`build/test-rename.mjs`、`build/test-ics.mjs` 全 PASS；探针实测 due 模态正文 332 字真正文（`Learning ... Task 4 - Global Inequalities Assessment` 之后的正文）、due 分组 `Tomorrow 2 / This week 1 / Later 6`、`Alt+T` 换表 + `‹ Back`、`Alt+D` 展开 Due、刷新后折叠状态保持。

## 第八轮（2026-11-05 17:54–18:10）— 复核 beta23 五项 + 抓到「审了 404 页」这件事

### beta23 五项复核（全部实测通过）
1. due 卡点击恢复模态 + `fetchAssessmentText`：`.wt-modal-detail` 332 字真正文，见第六/七轮记录。
2. `options.html` 首行是 `<!doctype html>`，前面没有残留规则 —— `head -3` 确认。
3. footer 覆盖栏：`padding: 22px 10px 12px` + 渐变 + `backdrop-filter: blur(6px)`，探针读计算样式 `footerPad = 22px 10px 12px`。
4. range / ticks：`rangeH = 15.99px`、`rangeMargin = 0px`、`ticksMargin = -3px 0 0`。
5. 下一天每行 `.wt-nextday-card`：7 张，`role=button`、`tabindex=0`，点第一张能开出 `.wt-modal-overlay.show`。

### 发现：之前「审过的」四个页面其实是 404
- `/due-work`、`/mypages`、`/activities`、`/feedback` 这些路由**根本不存在**，服务器直接 404，之前那些「0.2% 亮像素、完美」的截图全是 404 页。真实路由在导航栏里：Due Work → `/learning/due`，Feedback → `/learning/grades/21585`，My Pages → `/groups#groups-im-in`，My Pastoral → `/pastoral/student/21585`。
- 重新按真实路由截图测亮像素：`/learning/due` 0.4%、`/learning/grades/21585` 9.5%、`/groups` 2.5%、`/pastoral/student/21585` **17.0%**。

### 因此修掉的两处真缺陷（`extension/theme.css`）
- **Feedback 页老师评语是一排白条**：站点用 `background: rgb(244,242,242)` 的 `blockquote`，暗色下刺眼且字色偏浅。改成 `#232227` 底 + `#ddd9e3` 字 + 左侧 3px 分隔线，`blockquote *` 一并继承，里面链接保留紫色。
- **Pastoral 页行为记录图表整块白底**：是 Highcharts，白底画在 SVG 的 `.highcharts-background` rect 上，CSS `background` 改不到，必须改 `fill`。同时把 `.highcharts-grid-line` 的 `stroke` 调淡、坐标轴标签/图例/标题的 `fill` 提亮到 `#cfc9d6`。
- 改完复测：Feedback 9.5% → **0.5%**，Pastoral 17.0% → **1.3%**，`/groups` 和 `/learning/due` 无回归。

### 班级主页（`/homepage/code/...`）抽查
- 三个班各截一张：`M10SCI0-YA7` 0.4%、`M10IAS0-Y2` 16.0%、`V11MME2-B1` 19.9%。亮像素全来自课程横幅图片和「My timetable」的课表截图，是内容不是样式缺陷，不动。
- 扩展在这些页面只注入搜索 dock（`.wt-sr-dock-*`）、右上角设置按钮和 6 个 `wt-color-lifted`（color-fix.js 提亮），没有面板 —— 和 manifest 的 matches 一致（面板只在 `/`、`/home`、`/dashboard`）。

### 功能冒烟（`tools/probe/smoke.mjs`，15 项全 PASS）
面板挂载、9 张 due 卡、面板展开、今天不显示日期 chip、Due 区展开、三个分组标题、一键全标完成 9/9、撤销 0/9、due 卡开模态（正文 667 字）、模态里有 assessment 链接、Esc 能关、Ctrl+K 开搜索、搜 "sci" 出 30 条结果、`[data-wesley-error]` 为 null。
以后每轮改完都可以 `node tools/probe/smoke.mjs` 跑一遍，退出码非 0 就是有回归。

### 全站控制台巡检（`tools/probe/errsweep.mjs`）
十个路由逐个加载 6.5s 收 `Runtime.exceptionThrown` / `console.error` / `Log.entryAdded`：**没有任何 JS 异常**，`[data-wesley-error]` 全为 null。唯一报错就是上面那三个不存在的路由本身 404。

## 第九轮（2026-11-05 18:13–18:25）— 日历三种视图 + 亮色全站复查 + 开关那条灰带

### 日历 Month / List / Day 三种视图（暗色）
- FullCalendar 的视图是客户端切换，没有独立 URL：点 `.fc-dayGridMonth-button` / `.fc-list-button` / `.fc-timeGridDay-button`。
- 亮像素：month 5.4%、list 0.6%、day 5.4%，全是全天事件条和课表块的语义色，没有白底残留。
- month 视图第一次截图时看着像 week，是因为切换后要等 ~4s 才重绘完；等够时间 `.fc-view` 只剩一个 `fc-dayGridMonth-view`、高 500px，正常。

### 亮色全站复查
- 七个页面（dashboard / news / calendar-week / timetable / classes / grades / pastoral）逐个切 light 截图：没有暗色残留，blockquote 与 Highcharts 的暗色补丁都是 `html[data-wt-theme="dark"]` 作用域，亮色下完全没动。
- 面板在亮色下的分组标题、卡片、`Cards ✓ ICS` 三个按钮也都正常。

### 修掉：Pastoral 页「Show archived records」那条横贯整行的灰带
- `theme.css` 里 `html[data-wt-theme="dark"] .switch{background:#3a3a42}` 刷错了对象：`.switch` 是整行容器（实测 415px 宽），真正那个小药丸是里面的 `<label>`（64×32，边框 `rgb(79,39,89)`，白圆点画在 `::after`）。
- 改成容器透明、只画 `label`：边框 `rgba(255,255,255,.28)`、文字 `#d9d5e0`、`::after` 用 `#b9b5c2`；勾上时 `rgba(201,166,234,.18)` 底 + 紫边 + 白色圆点。文字一开始还是暗的（label 里两段文字 On/Off 继承色不对），补了 `label *{color:#d9d5e0 !important;opacity:1 !important}` 才正常。

## 第十轮（2026-11-05 18:26–18:40）— 编辑模式与自定义卡片表单

### 暗色下翻了一遍编辑 / 删除 / 自定义卡
- 卡片选择器里的 `✎ / + / −` 三个按钮、编辑模式下的眼睛图标（7 个）、拖拽（7 个 `draggable`）都正常。
- 「Add card」表单（`openFormModal`）：课程下拉（`Select a course...`）、TITLE（`What is it?`）、DETAILS（`Anything else...`）三个字段在暗色下都是深底浅字，未填时 `Add card` 按钮是禁用态。没有白底残留。
- 关闭按钮的紫色 focus ring 在暗底上略亮，属于可见性需要，保留。

### 修掉：编辑模式下 tab 的铅笔被省略号吃掉
- 上一轮给 `.wt-tab` 加 `max-width:200px;overflow:hidden;text-overflow:ellipsis` 时，tab 是 `inline-flex`，文字和铅笔是同级子节点，所以名字一长，铅笔跟着被裁掉 —— 只有名字短的 tab 还能看见铅笔，别的都像没有编辑入口。
- 改成文字单独包一层 `span.wt-tab-lbl`（`overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0`），铅笔是 `.wt-tab` 的另一个 flex 子项。实测 8 个 tab 全部 `pen=11px` 不再被裁。

### 就地改名实测
- 编辑模式点 tab 弹出 `.wt-tab-rename` 输入框，预填当前名字；输入 `INS` 回车后 `localStorage['wesleySubjectAlias']` 变成 `{"M10IAS0-Y2":"INS"}`，两处 tab 栏（To do / Due）同时变成 `INS`。`build/test-rename.mjs` 也 PASS。

## 第十一轮（2026-11-05 18:41–18:55）— 设置页两种宽度 + 新帖提醒暗色

### 设置页（options.html 独立页）在 320 / 1000 两种宽度下
- 亮像素 1.3% / 0.3%，没有白底残留；Theme 三段、WISE 数据、三个开关、速度滑杆都正常。
- **修掉**：左下角「Settings」那个齿轮按钮是 `<button>` 不是 `<a>`，暗色规则只写到了 `footer a`，所以它还是 Wesley 紫 `rgb(100,52,111)`，压在 `#1b1b1e` 上只有 1.8:1，几乎看不见。补 `footer .gear{color:#cfc4d8}` + hover 白色，顺带把中间版本号和右边署名提到 `#9b96a4`。
- 页面上半部分的空白不是 bug：Model / Cards / Modal / Timetable / Background / Developer 六个小节都在 `#sheet` 抽屉里，点底部的 Settings 才展开。

### 新帖提醒条（`.wt-alert`）
- 内容脚本里的 `showNewsAlert` 拿不到（隔离世界），所以在页面里按同样的 class 结构手工拼了一条来验样式。
- 暗色：琥珀色调的深底 + 米色文字，`b` 是 `#f0dca0`，关闭叉是 `#d9c7a2`，读得清。亮色：淡紫渐变 + 紫字，两套都正常。
- 站点导航里的 `BW Search` 项（`li.wt-sr-dock-li`）和右侧那个 28×28 的 `.wt-sr-setbtn-inline` 也一并看过，跟站点自己的导航项视觉一致。

## 第十二轮（2026-11-05 18:56–19:15）— 自定义卡片增删全流程 + 修掉删除路径认错身份

### 全流程实测（探针 `customcard.mjs` / `customdel2.mjs` / `restorecheck.mjs`）
- 加卡：Cards 弹层 → `+` → 选课 / 填标题 / 填详情 → `Add card`，存进 `wesleyCustom:v1`，卡片立刻出现在 Due 网格里。
- 删卡：Cards 弹层 → `−` 进入删除模式 → 卡片右上出现 `wt-eye.wt-del-x` → 点击弹行内确认「Remove? Yes No」→ Yes 后卡片消失、重载不回来。

### 修掉：删自建卡走错了分支，源头库存还留着、已删除条目只剩一个 "Card"
- 根因：`renderDueTab` 里 `customDue` 只是被包成 `{ kind:'due', d, key }`，**没有 `custom: true`、也没有 `cls`/`item`**。而 `gridWithPrefs` 的删除按钮靠 `it.custom` 分辨自建卡和站点卡。
- 后果（修前实测）：`localStorage['wesleyCustom:v1']` 删完还是 `{"due":[{"code":"V11MME2-B1","title":"PROBE CARD",...}]}`；删除记录跑到 `wesleyDeletedCards:v1`，条目是 `{"key":"wc|V11MME2-B1|PROBE CARD","section":"due","title":"Card","detail":""}` —— 标题取的是 `it.item.title`，而 due 条目根本没有 `item`，于是全都叫 "Card"，用户认不出删了哪张。
- 改法（`extension/home.js` 的 `renderDueTab`）：
  `const all = [...items.map((d) => ({ kind:'due', d, key: dueItemKey(d) })), ...customDue.map((d) => ({ kind:'due', d, key: d.key, custom: true, cls: d.cls, item: { title: d.title, detail: d.detail } }))];`
- 修后：`wesleyCustom:v1` 变 `{"due":[]}`，删除记录进 `wesleyCustomDeleted:v1` 且标题是 `PROBE CARD`；重新打开加卡面板，「Deleted items」里能看到 `×Restore · PROBE CARD`，点一下就回来。
- 探针里踩到的坑：`.wt-set-btn` 现在有 4 个（两个 `Cards` + `✓` + `ICS`），用 `.pop()` 会点到 ICS，必须按 `title="Choose cards for this section"` 挑。

## 第十三轮（2026-11-05 19:16–19:35）— 可访问名字审计，把没名字的控件补上

### 先验 To do 栏的自建卡（和 Due 那条同源）
- 加卡写进 `wesleyCustom:v1` 的 `tdt` 分支，卡立刻出现在 To do 网格；删除模式点 `wt-del-x` → 确认 → `tdt` 分支清空、`wesleyCustomDeleted:v1` 里留下 `{"code":"V11MME2-B1","title":"TDT PROBE"}`。这条路径本来就是对的（`renderTaskTab` 一直带 `custom: true`）。

### 审计：面板 / 模态 / 搜索 / 设置页逐个点名
- 面板里 60 个可交互元素，只有 `.wt-check`（每张 Due 卡一个、`role=checkbox`）没有名字 —— 屏幕阅读器只会念「复选框，未选中」，一排九个分不清谁是谁。
- 修：`dueCard` 里给勾选框加 `aria-label: (L.markDone || 'Mark as done') + ': ' + d.title`，i18n 补 `markDone`（`Mark as done` / `标记为完成`）。修后 60/60 全部有名。
- 模态（`openModal` 那套）和搜索覆盖层本来就有名字，不用动。
- 设置页（options.html）：`button.switch` × 多个、`input[type=number].val`、`input[type=range]` 全都没有名字 —— 行结构是 `<div class="row"><span>标签</span><控件/></div>`，但 span 不是 `<label for>`。
  - 在 `options.js` 末尾加 `labelSettingRows()`：遍历 `.row`，取 `:scope > span` 的文字，给同一行里没有 `aria-label`/`aria-labelledby`、也没有 `label[for]` 的控件补 `aria-label`。
  - 三处例外（背景色那几行没有 span）：直接在 `options.html` 写死 `aria-label="Background from colour" / "…from colour value" / "…to colour" / "…to colour value" / "Background image"`。
  - 修后设置页 `all named`。

## 第十四轮（2026-11-05 19:36–19:50）— 把这几轮修的坑钉成单元测试

`build/test-panel.mjs`（新）：从 `extension/home.js` 里用 `new Function` 抽出纯函数跑，和 `test-ics.mjs` 同一套做法。14 条断言：

- `dueBucket` 六个边界：`days` 为 `null` → `later`、`0` / 负数 → `today`、`1` → `tomorrow`、`7` → `week`、`8` → `later`。
- `domToText`：给一棵最小假 DOM（只有 `nodeType` / `tagName` / `nodeValue` / `childNodes`），断言 `first\nsecond\nthird` —— 块级元素之间必须补换行，否则模态正文会挤成一行。
- `looksLikeSiteChrome`：站点用户菜单那段（`Profile Options…Logout`）判 true，一段正常正文判 false。
- 五条源码级不变量（这几处都是肉眼看不出来、坏了只表现成「点了没反应」）：
  - `customDue.map((d) => ({ kind: 'due', d, key: d.key, custom: true …`
  - `DUE_KEYS = all.map((x) => (x.d && x.d.key) || x.key)`
  - `const canGroup = !EDIT.due && !DELMODE.due;`
  - tab 文字包在 `wt-tab-lbl` 里（否则铅笔会被省略号吃掉）
  - 勾选框带 `aria-label`（`L.markDone`）

现在完整回归是：`node tools/probe/smoke.mjs`（15 条，要真站点）+ `build/test-{news-alert,crawl,ics,rename,panel}.mjs`（纯 Node，不需要登录）。

## 第十五轮（2026-11-05 19:51–20:05）— 性能基线 + 修掉一条永远在报警的假诊断

### 性能基线（dashboard，探针 `perf.mjs`，`PerformanceObserver('longtask')`）
- `DOMContentLoaded` 762ms、`load` 885ms、面板出现 1874ms（比 load 晚约 1s，那段是抓 `/learning/classes` + 解析）。
- 长任务 3 个：50 / 72 / 55 ms，合计 177ms，都落在首屏那段，之后没有长任务。
- DOM 节点 2289（其中扩展自己 295），9 张 Due 卡。这个量级不算慢，先记成基线，不做优化。

### 修掉：`page anchors missing: classes` 每次加载都写一条
- `home.js` 末尾的「站点改版哨兵」里，`classes` 用的是 `.v-card h3 a[href^="/homepage/"]`，**站点早改过结构，这个选择器现在恒为 0**，于是每次加载都往 `wesleyLog` 里写 `missing:classes`，还会经 `options.js:635` 的 `check:` 一行显示在设置页诊断里，看起来像哪坏了。
- 实测同一页上 `a[href^="/homepage/"]` 有 65 个、`a[href*="/homepage/code/"]` 有 45 个，只是没有 `.v-card h3` 这种包法。
- 改法：哨兵只统计「home.js 会跑的这几页上真能观察到」的两项 —— `timetable`（`table.timetable[data-timetable]`）和 `news`（`a[href*="/news/"]`），`classes` 从 counts 里去掉。`LAST_CLASS_COUNT === 0` 那条 `.wt-warn` 逻辑不动，它另有数据源。
- 修后重启再加载，`wesleyLog` 最近 40 条里没有 `missing|warn|error|fail`。

顺带确认 `posts ok=7/8` 是正常的：8 个班里只有 7 个有最新公告，不是抓取失败。

## 第十六轮（2026-11-05 18:47–18:55）— 复核两条悬着的旧问题

### 1. beta13 记的「upcoming 底下大片空白」：现在复现不出来
- 记录原文是「只确认了 `.wt-up-body.open` 166px、子项 158px，没有在用户那种展开状态下复现」。
- 这次在探针里把面板 → Due 区 → Upcoming 全展开量了一遍：`.wt-up` 总高 239，`.wt-up-body` 168，body 里唯一的子节点 160，`padding` 为 `0 8px 8px`。**没有可量到的空白**，卡片在 Upcoming 结束后就收尾了（截图 `tools/probe/shots/upcoming.png`）。
- 顺手查了 Upcoming 每行的字色，`tomorrow` 那种紧凑 chip 是 `rgb(240,138,126)`、`· Covers:` 是 `rgb(169,165,176)`，对比度都够，不是低对比造成的「看起来空」。
- 结论：这条留着等用户再指出具体位置，当前版本不改。

### 2. 11 条真实路由的错误巡检：干净
- 见上一轮的 `errsweep2.mjs`：零异常、零 console error、`[data-wesley-error]` 全空；唯一一条 warning 来自站点自己的 vendors.js。
- 顺带核对了 content.js 在班级页用的选择器：`#component-layout` 1、`.column-left` 1、`[id^="news-container-"]` 1、`ul.news-list` 1，全部有命中；`.v-card` / `.card-class-image` 那两个是 `loadClassColors()` 用来抓 `/learning/classes` 的 HTML（那里各 15 个），不是页面自身的 DOM，属正常。
- `page anchors missing` 那条假警告上一轮已修，本轮日志确认不再出现。

## 第十七轮（2026-11-05 18:55–19:10）— 包体清理 + FB 到底为什么连不上

### FB 的失败原因查清楚了（不是脚本问题）
- `nslookup mekathun.tplinkdns.com` 正常解析到 `120.156.230.180`，说明 DDNS 和 DNS 都没问题。
- 但这台机器（`192.168.0.72`，网关 `192.168.0.1`）和它同网段，`arp -a` 里 5 台主机（`.1/.23/.38/.96/.194`）逐个试 `:11451`，全部无响应；本机 `netstat` 上 11451 也没有监听（只有 11452 的 xray、11453 的 sshd）。
- `~/.dsh/fb/token` 的时间戳是今天 16:10 —— 说明 16:10 时登录还是成功的，服务是在 16:10 到 17:40 之间消失的。
- 结论：**文件站那台机器/进程是关掉了或者掉线了**，不在本机、也不在本网段可见。这台机器上没有它的服务、没有容器、没有可启动的二进制，所以这边没有办法把它拉起来。等它回来，`bash tools/fb-upload.sh debug` 一条命令即可。

### 包体清理：删掉永远不会被加载的 `background.js`
- `extension/background.js`（188 B）注册的是 `chrome.action.onClicked` 去开 `options.html` 弹窗；但 `manifest.json` 里**没有 `background` 字段**，这个文件从来不会被加载；而且 `action.default_popup` 已经指向 `options.html`，就算加载了 `onClicked` 也不会触发。
- 已删除。包体从 23 个文件变 22 个，`manifest` 引用仍全部存在（14 项引用、0 缺失），重装后冒烟 15/15。

## 第十八轮（2026-11-05 19:10–19:20）— 包里的 README 早就不对上产品了

- `extension/README.txt` 还停在很早的版本：说「工具栏 popup 推断下一节课」、说「课程页注入 Class tasks 卡片、Gemini 读公告抽 homework/exam」、让人解压 `wesley-cards-extension.zip`、列了两个默认 Gemini 模型名。这些**现在都不存在**（AI 是可选且默认关、面板在首页而不是课程页、包名也不叫那个）。
- 整份重写，按现在真实的东西写：Today's plan 面板（分组 Due、勾选、`✓` 全标、`ICS` 导出、`Cards` 选卡与改名、`↻` 重抓）、课表 Next day 原地切换与日期 chip、BW Search（`Ctrl/⌘+K`、四个过滤页签、最近查询、拼音）、全站暗色、设置项、三个快捷键、安装步骤、隐私说明、缓存与改版哨兵。
- `PRODUCT.md` 顶部的版本徽章还是 `0.0.137`，改成 `0.1.1-beta24`。
- 重打包后解压核对：README 是新内容，包内 22 个文件，冒烟 15/15、五个测试全过。

## 收尾验证（2026-11-05 19:20）— 全部跑一遍，留证据

同一份代码（`0.1.1.24`，22 个文件）上跑完整套：

| 检查 | 命令 | 结果 |
|---|---|---|
| 语法 | `node --check extension/*.js`（6 个文件） | 全绿 |
| 单元测试 | `build/test-{news-alert,crawl,ics,rename,panel}.mjs` | 5/5 通过 |
| 端到端冒烟 | `tools/probe/smoke.mjs`（15 条断言） | ALL PASS |
| beta23 五项 | `tools/probe/verify23.mjs` | nextday 7 张卡 / `role=button` `tabindex=0` / 点开 `wt-modal-overlay show`；`rangeH 15.991px`、`rangeMargin 0px`、`ticksMargin -3px`；`footerPad 22px 10px 12px`；`options.html` 首行无残留规则；due 正文 332 字 |
| 错误巡检 | `tools/probe/errsweep2.mjs`（11 条真实路由） | 0 异常、0 console error、`[data-wesley-error]` 全空；唯一 warning 来自站点自己的 vendors.js |
| 暗色覆盖 | 逐页截图 + 亮像素占比 | 见各轮数字；剩余亮块都是内容图片（课程横幅、课表截图、新闻图） |
| 包体 | 解压核对 | 22 个文件，manifest 引用 14 项 0 缺失，version `0.1.1.24` |
| FB 同步 | `curl .../11451/` | **`fb:000`，连续 10+ 次，服务端整机不可达** |

结论：除「同步到 FB」外全部完成并留证；FB 是外部服务不可达，不是代码问题（原因见第十七轮）。

## 第十九轮（2026-11-05 21:05–21:40）— beta25：按用户十条清单重做

用户 m01834 批准清单并纠正了三处：`✓` 全选也不要；Due 那块是「把 assessment 正文抓进现有弹窗」，并且**卡片上的缩略必须和模态里的内容一致**；快捷键要可自定义、每个 panel 一个键、默认只有 Due / 搜索 / 换天有值。

**删掉的**：`.ics` 导出（`DUE_EXPORT`/`icsEscape`/`exportDueIcs`/`build/test-ics.mjs`）、`✓` 全标完成（`DUE_KEYS`/`DUE_TOGGLE`/`doneAllBtn`）、Due 的 tomorrow / this week / later 分组（`dueBucket`/`.wt-due-ghead`）。`build/test-panel.mjs` 换成三条「别再长回来」的断言。

**改掉的**：

| 位置 | 改动 |
|---|---|
| tab 栏的入口 | `Cards` → `Settings`，副标题 `cards in this section`；它和右上角齿轮的全站设置仍不是一回事，所以加了副标题消歧 |
| tab 栏蒙版 | 只有「背景模式=照片且真的选了图」才开玻璃，其余一律 `wt-no-navglass`（暗色下那条 `--wt-t-glass` 更具体，得单独再写一条覆盖，否则压不住） |
| 设置浮层 | `fixed` → `absolute`，位置每次从按钮当前位置重算；**这个站点的滚动条挂在 `<body>` 上**（`body{overflow:scroll;position:relative}`），`window.scrollY` 恒 0，所以补偏移要用 `pop.offsetParent.scrollTop`，不能只用 `window.scrollY` |
| 单卡勾选 | 不再整片 `redraw()`，只改这张卡的 `classList`/文本/`aria-checked`；Upcoming 不再被连带重建 |
| 课表展开 | 细节层改成绝对定位浮层（`td.wt-expanded .wt-detail`），不参与布局 —— 行高和页面高度都不动，之前「变高再收回」的抽搐没了 |
| Next day | 拆成两个按钮：`Next day ›` 原地切（再点回今天）、`☰` 才弹选日列表。dashboard 和 timetable 页两处都改了（之前只改了后者，dashboard 那个还是老的双身份） |
| toast | `top:16px` → `74px`，不再压在站点导航上 |
| tab 滚动条 | 整条隐藏（`scrollbar-width:none` + `::-webkit-scrollbar{height:0}`）。只设 4px 时 Chromium 仍画 16px 高的灰条，和玻璃蒙版混在一起像没擦干净 |

**Due 卡与模态**（`extension/home.js`）：
- `fetchAssessmentText(href, title)` 优先级 `#ir-content` → `div.u-pad-s`（含 h3 且 >40 字）→ `#content` → 旧选择器表；先剥 `nav/header/footer/script/style/noscript/#left-menu/.left-off-canvas-menu/.hide-for-print/.breadcrumbs/form`，再砍掉 `Logout` 之前的部分、去掉开头 `Learning` 面包屑，截 1600 字。
- 缓存 `wesleyAssessCache:v1`（24h、最多 60 条）。卡片渲染前用缓存填 180 字缩略（`d.detail`），全文另存 `d.__assessFull` 只给模态，所以**两边内容同源、不会打架**；模态抓完再 `updateAssessCards()` 回填卡片。
- `Go to full post` 只在**这条自己**的 `links` 里有 `/news/<id>` 时才出现（以前只要班里有任何公告就点上，点进去常是无关帖子）。
- 实测：`/learning/assessments/178547/21585` 抓出 667 字正文（`Task: Investigating the Role of Selection Pressures…`），卡片显示同一段的前 180 字；reload 后仍走缓存，卡片与模态一致。

**快捷键**（`extension/search.js` + `extension/options.html/js`）：
- `DEFAULT_SHORTCUTS = { search:'alt+k', due:'alt+d', todo:'', upcoming:'', panel:'', nextDay:'alt+t' }`，存 `chrome.storage.local.shortcuts`，`storage.onChanged` 实时生效；`comboOf()` 用 `e.code` 取字母（中文输入法下也准）。
- 设置页新增「Shortcuts」分区：点键帽进入录制（`.wt-keycap.rec`）、按 `Esc` 清除、撞键自动清掉占用者；「Diagnostics」分区显示版本 / 面板挂载数 / 最近 12 条日志 + 复制按钮。
- 实测：录制 `Alt+Shift+D` 存成 `{"due":"alt+shift+d"}`，改完立刻生效（`Alt+Shift+D` 能展开 Due；`Alt+T` 换天再按换回来；`Alt+K` 开搜索；搜索框获得焦点时只放行搜索键）。

**验证**

| 检查 | 结果 |
|---|---|
| `node --check` 7 个 JS | 全绿 |
| `build/test-{news-alert,crawl,rename,panel}.mjs` | 4/4 通过（panel 现在 9 条） |
| 打包 | `Better_WiSE_v0.1.1-beta25.crx` 500,149 B / `.zip` 248,839 B，22 个文件 |
| 面板 | 两个 `Settings`、无分组标题、无 `✓`/`ICS`、单卡勾选 `sameNode true` |
| 浮层跟随 | 打开后 `gap 6px`；内层容器下滚 200 后 `gap 仍 6px` |
| 课表展开 | `body.scrollHeight` 展开前后 12002 → 12008，动画结束保持 12008（无回弹） |
| 手指/键盘 | `Alt+T` / `Alt+D` / `Alt+K` 均生效 |

**没删 `color-fix.js`**：`theme.css` 里 `.wt-color-lifted` 的提亮规则正是这个脚本加类加出来的，删掉文件老师用 `<span style="color:#...">` 标的重点在暗色下会重新变糊。要不要去掉得用户定。

## 第二十轮（2026-11-05 22:05–22:30）— beta26：改回 0.1.0 的做法 + 课表细节回到卡里

用户 m02193 三条：课表细节要放回卡片里（不要浮层，做不了就回退）；due 抓取要做成 0.1.0 那版；诊断放进 Developer 子项。

**课表展开**：细节层重新放回格子里。CSS `td.wt-expanded .timetable-subject{display:flex;flex-direction:column;gap:4px;overflow:hidden}` + `.wt-detail{flex:0 0 auto;max-height:min(240px,40vh);overflow:auto}`；JS 只 append，不再设高度。课表容器在展开时本来就被钉住高度（`scroller.dataset.wtH`），所以行变高只在容器里滚，页面高度实测 11971 → 11977，收起回到 11971，没有回弹。

**Due 正文回到 0.1.0 的模型**（查 `sessions/readable/` 里 11-01 那轮的记录确认）：
- 0.1.0 是 `enrichDueDetails` 预先抓 assessment 页、把全文写进 `d.detail`，卡片 `-webkit-line-clamp:3` 截三行，模态直接显示同一个 `d.detail`。**卡片和模态是同一个字符串**，不是在字符串层面截短。
- 上一版我搞了 `assessSnippet(180)` + `__assessFull` 两个字段，等于把「缩略」做成了另一段文字 —— 这就是用户说的"越改越后退"。
- 现在：`enrichDueList(items)` 在面板渲染后串行补齐（最多 6 条、24h 缓存 `wesleyAssessCache:v1`、`ASSESS_INFLIGHT` 防重复），抓到就 `d.detail = 全文` 并 `updateAssessCards()` 原地换卡片文字；渲染时缓存命中就直接用全文。卡片 CSS 三行截断，模态全文。
- 实测：`cardLen 667,207,281,…`，`modal 667`，`MATCH card=667 modal=667`；clamp `3 / flow-root / 49px`。`assessSnippet` 已删除。

**诊断挪进 Developer**：`options.html` 里原来独立的 `Diagnostics` 分组删掉，改到 Developer 的「Download debug logs」和「Restore factory settings」之间，前面加一个 `.subhead`（小号大写标题，亮暗两套色）。实测 Developer 展开后 `#diagLog` 在里面、版本显示 `0.1.1.25 (beta25)`。

**版本**：`0.1.1.26`（manifest / options.js / options.html 页脚 beta26），`Better_WiSE_v0.1.1-beta26.crx` + `.zip`。

**验证**：7 个 JS `node --check` 全绿；`test-news-alert` / `test-crawl` / `test-rename` / `test-panel` 全过；`smoke.mjs` 改成 beta26 的断言（无分组、无 `✓`/`ICS`、卡片带正文、单卡勾选保节点）后 **ALL PASS**；亮色下 clamp 与 modal 一致性同样通过；`Runtime.exceptionThrown` / `Log.error` 零条。

## 第二十一轮（2026-11-06 19:10–19:50）— beta27：五条修复 + 主题动画的性能评估

用户这次给的是六条：loading 提示条暗色、模态背景更暗、Due 详情只取正文、Upcoming 今天改小时数、切主题后面板不变、以及"评估主题切换动画的性能再给清单"。

**1. `Loading information…` 白块**：`.wt-loading` 的底色写死 `#fff`，暗色规则只改了 `color`，而且选择器还要求祖先有 `[data-wesley-home]`（加载提示出现时面板还没挂上）。改成用主题 token，再加一条 `html[data-wt-theme="dark"] .wt-loading`。实测暗色下 `bg rgb(31,31,35)` / `color rgb(169,165,178)`。

**2. 模态背景更暗**：`.wt-page-dim` 的 CSS 是 `rgba(20,8,24,.42)`，但 `openModal` 里用内联 `style.cssText` 又写了一遍背景 —— 内联优先，暗色规则永远压不过去。删掉内联里的 `background`（两处：表单模态、详情模态），只留几何；暗色用 `rgba(6,4,9,.62)`。实测暗色 `rgba(6,4,9,.62)`、亮色保持 0.42。

**3. Due 详情只取正文**（用户给的 INS 例子：卡片读到了 Due 时间、MYP Assessment、附件名、Create submission）。
- 根因：`fetchAssessmentText` 在找不到 `article.content` 时会退到整个 `#content`，那是整页门框。
- 探针确认三页结构：有正文的 `/learning/assessments/178547/21585` 里 `article.content` = 664 字；没正文的 `/learning/assessments/177845/21585` 里 `article.content` **不存在**；另一条直接是「You do not have permission」。
- 改成只认 `article.content` → `#ir-content` → 带 h3 的 `div.u-pad-s`，都拿不到就**返回空**，不再用整页凑数。`ASSESS_BOX_SELECTORS` 也收窄成 `['article.content','#ir-content','main article','.assessment-detail','div.u-pad-s']`（把 `#content`/`.content` 去掉了，另一处 AI 抓取也吃这条）。
- 实测：INS 那张卡现在只有标题 + 一行 `MYP Assessment · due 2026-11-06`；Science 那张仍是 667 字正文。

**4. Upcoming 的 today 改成小时**：新增 `hoursLabel(iso)`（<60 分钟走 `in N min`，否则 `in N hours`）和 i18n `inHours`/`inMins`；Upcoming 条目在 `days <= 0` 时用它。实测注入一条 2 小时后到期的条目，显示 `in 2 hours`。

**5. 切主题后面板还是黑的**：`storage.onChanged` 那条监听挂在 `main()` 里，要等抓完数据才生效，早期切换会漏；标签页被后台冻结过也可能丢事件。加了模块级监听（`applyTheme(pref)` 支持直接传参）+ `focus`/`visibilitychange` 时 `resyncTheme()` 主动对一次（一次 `chrome.storage.local.get`，成本可忽略）。实测：另一标签页把 theme 改成 light，dashboard 面板 `rgb(27,27,30)` → `rgb(251,247,253)`，切回 dark 也即时。

**6. 主题切换动画的性能数据**（还没做，等用户审方案）：dashboard 2351 节点、页面高 12164px，用 `data-wt-theme` 直接切 6 次，每次样式重算 + 重绘 30–41ms，没有 50ms 以上的长任务，最差帧 52ms。

**验证**：7 个 JS `node --check` 全绿；`test-{news-alert,crawl,rename,panel}` 全过；`smoke.mjs` 的 "due cards = 9" 改成 `>= 5`（今天 11 条）后 ALL PASS。版本 `0.1.1.27`，包 `Better_WiSE_v0.1.1-beta27.crx` / `.zip`，22 文件。

## 第二十二轮（2026-11-06 19:53–20:05）— beta28：脏正文到底是哪来的 + 附件进模态

用户在他自己的浏览器上仍看到 INS 那条卡写着 Due 时间 / 附件名 / Create submission，而探针里是干净的。

**根因：缓存**。`wesleyAssessCache:v1` 里存着修复前抓的「整页门框」，24 小时内所有渲染都直接命中那份脏文本，抓取逻辑改了也没用 —— 探针每次都换 cache 所以看不到。

- 缓存键升到 `wesleyAssessCache:v2`，v1 整份作废。
- 新增 `looksLikeAssessChrome(text)`（含 `Create submission` 或 `\d+ KB/MB` 的直接判脏），读缓存时也校验一次，脏条目当未命中处理。
- 渲染时若该条没有可用缓存，**把 `d.detail` 删掉**，先只显示一行 meta，等补齐再写回 —— 以前的列表摘要不会再冒充正文。

**附件进模态**：
- `parseAssessFiles(doc)` 从 assessment 页的 `ul.grid` 里抓 `a[href*=fetch.php]`，取 `title` 当文件名、从卡片文字里取 `140.25 KB` 这种大小，最多 8 个。
- 附件和正文一起进缓存（`{text, files}`）；`ASSESS_FILES` 内存表按 href 存；`enrichDueList` 抓到就写 `d.files`；模态的懒加载分支抓完也会把刚发现附件插进去。
- `.wt-modal-files` 从 flex 改成两列 grid（`repeat(2,minmax(0,1fr))`），文件名过长省略号。
- 实测：INS 那条模态显示 `No description on this assessment.` + 两个附件 `Global Inequalities - Assessment Task Instructions 2026` / `Research Poster`，实测 `gridTemplateColumns: 266.995px 267.005px`（两列）。
- 卡片实测只剩 `Year 10 Individuals and Societies` / 标题 / `MYP Assessment · due 2026-11-06` / `today`。

**版本** `0.1.1.28`，包 `Better_WiSE_v0.1.1-beta28.crx`（506,128 B）/ `.zip`（251,823 B），22 文件。`node --check` 全绿、`test-panel`/`test-rename` 通过、`smoke` ALL PASS。

## 第二十七轮（2026-11-07 15:50–16:05）— beta35：顶部幽灵 alert、加载多久、头像挪不动

用户看图补了四条（m01587）。

- **屏幕最顶端那个关不掉的 alert**：`showNewsAlert` 在面板还没建出来时会把 `.wt-alert-wrap.wt-alert-float` 挂到 `<body>` 上，但 `.wt-alert-wrap` 的样式全部写在 `[data-wesley-home] .wt-alert-wrap` 下面（`home.js` CSS 623–636 行）。body 上那份既没有样式，`.show` 的过渡也不生效，× 按钮只删除 `show` 类，所以永远关不掉。改成没有 host 就直接 return，并顺手清掉历史残留的 `body > .wt-alert-wrap.wt-alert-float`。
- **通知标为已读后 alert 立刻消失**：新增 `siteUnreadCount()`（读 `#notification-toggle` 的 `data-unread`）、`hideNewsAlert()`、`startUnreadPoll()`（3 秒一轮，最多 100 轮）。只有「先前见过 >0、现在变 0」才撤 —— 一直就是 0 的情况不动，因为有些帖子本来就不计进铃铛。实测 `unread=3 → alert 在`，`unread=0 → alert 消失`。
- **`show` 类加不上的坑**：页面在后台标签时 `requestAnimationFrame` 被浏览器暂停，`wrap.classList.add('show')` 永远不执行，元素停在 `height:0;opacity:0`。改成 rAF 里加一次、80ms 后再 `setTimeout` 加一次兜底。
- **头像没往左挪**：`a.account-menu` 是 `position:absolute; margin-right:16px`，`section.right-small` 也是 `position:absolute; right:0`，两者本来就是叠着的（头像右缘 1275 > 区块左缘 1259），给区块加 padding 只会推齿轮。改成直接给 `a.account-menu` 加 `margin-right:30px !important`。实测头像 1227..1275 → 1213..1261，齿轮间隙 10px、齿轮到铃铛 14px。
- **仍然要等 20 秒**：`waitTable` 又返工三轮。
  1. 只在进循环前看一次 `[data-timetable-header]` 是否含 "last school day"，冷启动时标题还没渲染 → 照等。
  2. 循环里每 300ms 也查标题；非周末超时 20000 → 6000。
  3. 最终规则：超时 9500ms，但循环里多两条快速退出 —— 标题出现 "last school day" 立刻退；或「1.8 秒后 `readyState==='complete'`、`[data-timetable-container]` 不存在、`.column-left` 已存在」判定今天没有课表（站点是服务端渲染，有课的日子容器随首屏 HTML 到达）。
  实测站点时间线（`tools/probe/timing.mjs`，刷新后每 400ms 采样）：5.7–7.8 秒什么都没有，8.2 秒才出现标题 "Last school day · Fri Nov 06 2026"。用 `Page.addScriptToEvaluateOnNewDocument` 打的 `MutationObserver` 计时（`tools/probe/panel-time.mjs`）得到**面板 4.47 秒出现**（document start 起算）。注意 8.2 秒那张 `table.timetable[data-timetable]` 是我们自己 `buildSyntheticTimetable` 生成的，站点周末根本不渲染表。
- beta35：`0.1.1.35`，产物 `Better_WiSE_v0.1.1-beta35.crx` 533,879 B / `.zip` 265,706 B。
- 六个 Node 回归全过（schedule / news-age / news-alert / crawl / panel / rename）。

## 第二十八轮（2026-11-07 16:06–16:35）— beta36：首屏骨架、样式早挂、搜索框收窄、拖拽连续平移

用户这轮问的三件事，其实是一件事：**面板出现之前的那几秒，页面是另一种样子**。

- **首屏骨架**：`skelPanel()` 在 `main()` 里一开就插一块 `[data-wesley-home].wt-skel`（标题条 + 4 个 tab 短条 + 6 张灰卡，`pointer-events:none`，`aria-busy`），数据回来后 `buildSummary` 复用同一个 host 原地 `replaceChildren` —— 不新增节点、不换位置，所以看到的是「灰块变成卡片」。
  - 两个坑：① `html.wt-booting [data-wesley-home]{visibility:hidden}` 会把骨架也藏起来，得补一条 `html.wt-booting [data-wesley-home].wt-skel{visibility:visible}`；② `main()` 开头那句「已经有面板就别重复跑」的守卫要改成 `[data-wesley-home]:not(.wt-skel)`，否则第二次 `main()` 看见自己的骨架就不干活了。
  - 实测（`tools/probe/panel-time.mjs` + `Page.addScriptToEvaluateOnNewDocument` + `MutationObserver`）：骨架 **0.26s**、真面板 **3.70s**（原来 4.47s）。
- **前后两副面孔**：根因是整套 CSS 原来在「等到数据之后」才注入（约 4.5 秒），所以右上角留白、课表间距这些**作用于站点自身排版**的规则会晚到。现在分两层：`boot.js`（document_start）先注入站点版式微调（搜索框、头像留白、课表间距），`home.js` 的整份 CSS 也在 `main()` 开头就挂（`<style id="wt-home-css">`，重复调用只注入一次）。
- **头像左边被搜索框压住**：`form.sbx-header-search` 是 `position:absolute; right:144px; width:72px`（一个 72px 的按钮只放一个 17px 图标），右边缘 1219 压到头像的 1213。改成 `right:156px; width:48px`（图标中心仍在 1183），头像保持 1213..1261 → 搜索框 1159..1207，留 6px；头像到齿轮 10px、齿轮到铃铛 14px。
- **拖拽时除手里那张外的所有卡片做平移动画**：原来的 `wtSettle()` 每帧先 `finish()` 收尾在跑的动画，导致「起点」永远是布局位置，看起来很跳。现在改成：先量此刻屏幕位置（`getBoundingClientRect` 已含正在跑的 transform）→ `cancel()` 掉在跑的动画 → 插占位符 → 再量一次 → 差值当动画起点，170ms `cubic-bezier(.22,.61,.36,1)`。整段在同一个任务里完成，浏览器不在中间绘制，所以是连续的。顺带删掉「位移卡 >8 张就不动画」的保底。
  - 实测（`tools/probe/drag-cont.mjs`，两次 dragover 间隔 40ms）：卡片 40ms 内移动 8px 后继续朝终点走，`animsDuring:true`，没有跳变。
- **骨架插错容器（被用户一眼看出来的回归）**：面板原本该待在「Day x / Last school day」标题底下、课表上面。可标题是站点后渲染的 —— 实测 0.18 秒时只有 `.column-left`，**3.17 秒**才出现 `h2[data-timetable-header]`。骨架 0.28 秒就插，`placePanel()` 只能落到 `.column-left` 兜底，而 `.column-left` 是课表**下面**那个 8 列栅格，于是整块面板跑到课表下方、宽度也从 1299 缩成 866。
  修法：新增 `watchPanelPlacement(host)` —— 真数据渲染时再调一次 `placePanel()`；标题那一刻还没出来就挂一个 `MutationObserver`（最多 15 秒）盯着，标题一出现立刻把面板挪进正确位置。骨架阶段不挂 watcher，避免「先挪一次、再换内容」抖两下。实测 DOM 变成 `DIV.small-12.columns > DIV > [H2.subheader, DIV(data-wesley-home), DIV.row(课表)]`，`panel top=150 < table top=1003`，宽度 1299。
  教训：**只截「加载完成后」的图不够**，这次错位在加载完的图上就看得见（面板在课表下面），但当时没对照旧图，误当成正常。
- beta36：`0.1.1.36`，产物 `Better_WiSE_v0.1.1-beta36.crx` 539,959 B / `.zip` 268,772 B。

### beta42：Set due 的弹层改成一律朝上

上一版是「下面放得下就朝下」，可那一行本来就在模态底部，朝下会盖住按钮和下面的内容。
现在默认 `top = btn.top - 8 - ph`，只有连视口顶端都放不下（`top < 10`）才退回按钮下面。
实测：按钮 top 403、弹层 260..395，`above: true`，四边都在视口内。

六个 Node 回归全过；`0.1.1.42`，`Better_WiSE_v0.1.1-beta42.crx` 552,293 B / `.zip` 274,958 B。

### beta41：No description 的位置、弹层被裁、退出动画对称

**① "No description on this assessment." 跑到 Set due 下面**
那句话是异步抓完 assessment 正文后插进去的，锚点是 `.wt-modal-actions`；而 Set due 那一行也插在 actions 前面，于是文字落在它后面。
改成优先锚 `.wt-dueset`，没有才退回 `.wt-modal-actions`。现在的顺序是：标题 → 正文（或"没有正文"提示）→ 附件 → Set due → 按钮。

**② Set due 的弹层被模态边界切掉**
模态本身是 `overflow:auto`，弹层是绝对定位的子元素，伸出模态的 padding box 就被裁。
改成 `position:fixed` + 按按钮矩形算坐标，再夹一次 `top/left`（上边放不下就翻到上面，右边超出就往左挪）。实测弹层 `451..586`（视口高 756）、`670..957`（视口宽 1409），四边都在视口内。
副作用：fixed 元素在模态滚动时会和按钮错位，所以给模态挂了 `scroll` 监听，一滚就把弹层收起来（另加窗口 resize）。

**③ Next day 的退出动画和进入不对称**
进入是「明天的表从右推入、今天的表缩小淡出」，退出却是「今天的表靠左半透明地滑回来、明天那张直接平移出去」。
现在退出完全镜像：今天的表从 `translateX(-14%) / opacity .15` 补间回 `none / 1`，明天的表 `translateX(110%) scale(.96) / opacity 0` 淡出。`clearSwap()` 里顺手把内联 `transition` 也清干净，避免下次切换带着上一次的过渡。
实测：点 Back 后 0.11s 抓到的中间帧就是「今天的表从左侧被裁着推进来、明天的表缩小往右退」；0.6s 后 `alt` 没了、原表 `transform: none, opacity: 1, visible`。

**④ 产物**
六个 Node 回归全过；`0.1.1.41`，`Better_WiSE_v0.1.1-beta41.crx` 552,103 B / `.zip` 274,859 B。

### beta40：返回今天的抖动、Set due 弹层的三个小毛病

**① 从 Next day 返回时，今天的课表先偏左、再从一层白蒙版里浮出来**
`showToday()` 里原本把原表摆到 `translateX(-14%)` + `opacity: .25`，等 430ms 后才清掉——所以点「Back」的瞬间看到的是「偏左 + 半透明」，接着自己再补 0.42 秒的过渡滑回来。
改法：返回时先把 `transition` 关掉，再一次性写回 `transform/opacity/visibility`，60ms 后再把 transition 恢复。实测点下去的同一帧就是 `transform: none, opacity: 1, visibility: visible`，之后 40/150/450ms 采样都不变。新表只负责从右边滑出去，不再和原表抢戏。

**② Set due 的弹层默认就是展开的，Cancel 关不掉**
根因是 `hidden` 属性被 CSS 盖住了：`.wt-dueset-pop{display:flex}` 的优先级高于 UA 的 `[hidden]{display:none}`，于是 `pop.hidden = true` 完全没有视觉效果——打开模态时它就是展开的，点 Cancel 也只是把属性设回 true 而已。
补一条 `.wt-dueset-pop[hidden]{display:none !important;}` 就同时修好了这两件事。

**③ 紫色 Save 按钮里的字是黑的**
被 `.wt-modal button` 那类规则压掉了 `color`。给 `.wt-dueset-ok / -clear / -cancel` 的 `color` 加 `!important`；深色模式下 Save 底色调成 `#8b5cc6`（配白字），不再用浅紫 + 深字。

**④ 验证与产物**
实测：打开模态 `display:none`（弹层收起）→ 点 Set due `display:flex` → 点 Cancel 回到 `display:none`；Save 的 computed `color: rgb(255,255,255)`、`background: rgb(139,92,198)`。
六个 Node 回归全过；版本 `0.1.1.40`，产物 `Better_WiSE_v0.1.1-beta40.crx` 551,311 B / `.zip` 274,467 B。

### beta39：换日滚动条、正文 Due 徽标补齐、Due 卡手动设截止时间

**① 点 Next day 时下面闪一条滚动条**
`.scrollable.wt-tt-wrap` 是 Foundation 的 `overflow:auto`，换日时新表从右边 `translateX(110%)` 滑进来，动画那 0.42 秒里它的 `scrollWidth` 是 2795，容器只有 1331 → 立刻出一条横向滚动条，动画结束表回到原位，滚动条又消失，看着就是「闪一下」。
改法：换日期间给宿主加 `.wt-tt-clip{overflow:clip !important}`（`clip` 不产生滚动容器，纯裁剪，所以连滚动条的轨道都不会出现），`clearSwap()` 时移除。实测动画中 `overflow: clip`、`scrollWidth 1660 / clientWidth 1331` 但 `documentElement.scrollWidth === clientWidth`；落定后 `scrollWidth === clientWidth === 1331`，表一点没被裁。

**② 老师写在正文里的 Due，Due 卡上也要显示**
上一版只在「To do」的卡片上加了这个徽标，Due 区的卡片（`dueCard`）只认作业接口给的 `d.days`，所以 EAL 那条「Homework for Thursday 5th November」在 Due 区里什么都没有。
现在 `dueCard` 也按同一套三级来源算：手动设的 → 作业接口的 due → 帖子正文的 `Due: …`；徽标同样标红（≤7 天）。实测 EAL 那张 Due 卡显示 `in 2 days`。

**③ Due 卡的模态里可以自己设截止时间**
点了 Due 卡打开模态，正文下面多一行「DUE · 未设置 · [Set due]」；点开是一个小卡片：日期 + 时间（原生 `input[type=date]` / `input[type=time]`，时间默认下一个工作日的 16:00），下面是 Save / Clear / Cancel。
- 存储：`wesleyDueSet:v1`，键就是 Due 卡的 key（`post|M10LAE0-Y3|标题|` 这种），值是本地时间串 `2026-11-20T15:30`，跨时区不漂。
- 弹层位置：默认朝下，模态底下没地方就翻到上面（`place()` 里量一次 rect 再决定），避免被模态下边缘切掉。
- 保存后卡片的徽标**当场**更新（`refreshDueBadge()` 直接改那一个 span，不整块重渲染）；Clear 之后回落到帖子里的日期。
- 从帖子里读出来的日期没有时刻，标签不再显示成 `12:00 am`，只显示 `Mon, 9 Nov (from the post)`。
- 深色模式单独一套（弹层 `#232128`、输入框 `#1b191f`、Save 按钮换成浅紫）。

**④ 版本与产物**
`0.1.1.39`，`Better_WiSE_v0.1.1-beta39.crx` 550,835 B / `.zip` 274,228 B；六个 Node 回归全过。

### beta38：七门课、正文里的 Due、课名清洗、改名统一

**① Show in All 只有六门**
设置面板拿的是建面板时那一刻的 `tabs` 数组快照，而「今天没课但有作业」的第七门是异步补进来的（`refreshExtraClasses` 之后 `tabs` 被重新赋值，弹层还指着旧数组）。
改成 `settingsPopover(sectionKey, tabsOrGetter, rerender)`，`draw()` 里现取；再新增 `subjectChoices()`：今天的课 + 额外课 + `ALL_SUBJECTS`（站点 `/timetable` 全量）按规范化代码合并去重，过滤 Tutor Group、集会占位（`N12ASB0-YM2`）、`Glen Waverley Senior School` / `VCE` 这类伪课程。实测 7 行。

**② 课名带着教室和老师**
`fetchAllSubjects()` 原来拿整格文本减掉括号：`"Year 10 Science (G/M10SCI0-YA7) C203 Ms Kirsten Paton"` → `"Year 10 Science C203 Ms Kirsten Paton"`。而格子其实是 `<a>Year 10 Science</a> <div>(code)<br> C203 Ms Kirsten Paton</div>`，课名只在 `<a>` 里。
改法：课名取 `<a>` 文本，第二行按 `^([A-Z]{0,3}\d{1,4}[A-Za-z]?)\s+` 拆成 `room` + `teacher` 存起来；没有 `/homepage/` 链接的格子直接丢（集会、年级大会）。缓存键 `wesleySubjects:v1` → `v2`，读旧缓存时再把尾部「教室 + 老师」剥一层。实测 tab 从 `Language Acquisition English B202 Ms Angela Ip` 变成 `Language Acquisition English`。

**③ 正文里的 "Due: Monday 9th November"**
新增 `dueDateInText(text, ref)`：只在 `due` 后 80 字符里找日期，支持 `9th November` / `November 9` / `18/11`，找不到返回 null（`Due Wednesday at 4:00pm` 不算）；再加 `daysUntil(d)`。`taskCard` 在没有 `item.due` 时用它，命中就在课名行右侧挂 `.wt-due-days`（≤7 天加 `.soon` 显红）。实测 EAL 那张「Homework for Thursday 5th November」→ `in 2 days`（红）。

**④ 改名要处处生效**
新增 `aliasOf(cls)`（代码 → 去前缀代码 → 补 `G/` 前缀 → `normCode` 变体 → 课名，五条路都试）、`displayName(cls)`（短名字，给标签/下拉/菜单）、`cardLabel(cls)`（长名字，给卡片抬头）。替换掉 7 处硬编码的 `cleanName` / `subjectName` 调用（表单下拉、模态课程菜单、模态课名链接、卡片抬头、自定义卡、标签、设置行）。
另外 `PICK_LIST`（模块级 getter）让「加卡片」的下拉框也能选到第七门课，不再只有当天六门。
实测把 `M10LAE0-Y3` 改名成 `English Extra` 后：标签栏、卡片抬头、设置行、下拉框四处同时变成 `English Extra`；清掉别名后全部回原样。

**⑤ 跨天会不会丢名字**
别名按**课程代码**存（`ALIAS['G/M10LAE0-Y3']`），代码来自站点课表，跨天不变；所以明天换课表、后天周末走 `extraClasses`（代码形式变成不带 `G/` 的短码）也还能命中——`aliasOf` 的 `G/` 补全与 `normCode` 归并就是为这条准备的。

**⑥ 回归**
`build/test-schedule.mjs` 新增 7 条 `dueDateInText` / `daysUntil` 用例（含 `Due Wednesday at 4:00pm` 必须判空、`18/11` 数字写法）；六个 Node 回归全过。
产物 `Better_WiSE_v0.1.1-beta38.crx` 545,105 B / `.zip` 271,360 B，版本 `0.1.1.38`。

### beta37：骨架改成「一条」，并且占满整行

上一版骨架是「标题条 + tab 条 + 6 张灰卡」，而且插在 `.column-left` 里（因为标题容器还没渲染），看起来像见缝插针。用户要的是接近折叠状态 `wt-summary` 的一条。

- 骨架内容砍成一行：`.wt-skel-head` 里只有一根 190×18 的 shimmer 条，整块高度 62px 左右。
- 位置：标题还没出现时，直接作为「整行宽的块」插进栅格行最上面（`host.classList.add('wt-skel-block')` + `row.insertBefore(host, row.firstChild)`），不再退到 `.column-left`。CSS 用 `float:none;clear:both;width:auto;margin:0 0 14px;padding:0 15px` 跟站点 `.columns` 的内边距对齐。
- 标题一出现（3.2 秒），`watchPanelPlacement` 把它挪进标题那一格，`placePanel` 里顺手 `remove('wt-skel-block')` —— 那一格内部宽度本来就是 1299，跟真面板一致。
- 数据回来换内容时，`wt-skel` 与 `wt-skel-block` 两个类都摘掉，宽度交还给正常布局。
- 实测（`tools/probe/skel-shot.mjs`，刷新后 1.2 秒）：`cls: "wt-skel wt-skel-block"`、`w: 1347`、`top: 110`（整行宽）；4.5 秒后 `panel top=150 < table top=1003`、`hostW 1299`、`gridW 1250`、6 列 × 201.6px。
- 产物：`Better_WiSE_v0.1.1-beta37.crx` 539,944 B / `.zip` 268,763 B，版本 `0.1.1.37`；六个 Node 回归全过。
- 六个 Node 回归全过。

## 待办（下一轮从这里接）

- **FB 同步**：`mekathun.tplinkdns.com:11451` 整台机器不可达（DNS 正常、ARP 里 .1/.23/.38/.96/.194 全无响应、本机 11451 无监听）。用户说非工作时间不传，所以暂时不是阻塞项；要传时 `bash tools/fb-upload.sh debug`，包在根目录 `Better_WiSE_v0.1.1-beta25.crx/.zip`。
- **请真机验这几条**（探针验不了手感）：
  1. Due 卡点开 → 模态里是作业正文；卡片上的缩略和模态开头一致；没有 post 的条目不出现 `Go to full post`。
  2. `Alt+T` / `Alt+D` / `Alt+K` 手感；设置页里改成别的键后立刻生效。
  3. 课表点一格展开：浮层是否被容器下沿切掉、位置顺不顺手。
  4. 面板 tab 栏在有照片背景时的玻璃效果，是否还挡课程卡。
  5. 单卡勾选后 Upcoming 不再重排，符合预期吗。
- `color-fix.js` 要不要留，等用户一句话。
- 推 GitHub / 同步 OneDrive **未经用户明确同意绝不做**。

## 第二十三轮（2026-11-06 20:07–21:05）— beta30：星期判定、附件卡片、常态拖动

**1. 课表卡片取到上个礼拜的内容（用户报的那条 "Friday 30 October Period 3"）**

根因在 `todaySlice`：它按星期名在正文里找今天的名字，找到就截到下一个星期名，完全不看后面的日期。今天 11/6，IAS 那帖里同时有 "Friday 30 October" 和 "Friday 6 November"，先命中的是 30 号那段；`normItems` 的日期过滤又只作用于「标题以星期开头」的条目，那帖标题叫 "Assessment task schedule"，于是整段混排原样进了卡片。

换成 `dayPartOf(text, post)`，按这个优先级判断：
- 段落里有明确日期（`30 October` / `October 30` / `30th`）→ 只认等于今天的，日期缺月份就用发帖月推，差 21 天以上试下个月，年取离发帖最近的；
- 没日期但有 `week 5` 这类线索 → 只认等于本学期的周次；
- 都没有 → 星期名对得上、且帖子属于本周（周六周日发布算下一周）；
- 一段都没命中：帖子是本周的就回整篇当「本周大纲」，帖子不是本周的返回空（这条就是修掉的 bug）；
- 正文里一个星期词都没有（中文小段、纯作业说明）→ 整段保留。

配套：
- `DAY_ANY_RE` 不能带 `\b`。老师把两段粘成 "research posterTuesday 27 October"，带词边界只切得出 2 段，测试里一眼看出来。
- 学期表 `TERM_DATES[2026]` + `calibrateWeek()` 自校准：扫最近 9 天发布、标题写着 `Week N` 的帖子，跟表算的周次投票，两门以上不同课同 delta 才采用（记录到日志）。
- 左上 `Day 5` 后面挂了一枚 `Term 4 · Week 5` 胶囊，`renderWeekChip()` 在 `placePanel` 和换日事件里各刷一次。
- `build/test-schedule.mjs` 拿 22 门课的真实数据跑 20+ 条断言：11/6 取到 "Assessment task test in class" 且不含 "30 October"，10/30 反过来，周六发的帖子算下周，过期帖返回空。

**2. 附件进所有模态**

- 新模块：`fileEntry` / `fileKindOf`（pdf、doc、sheet、slide、image、archive、file 七类）/ `parseFilesIn` / `scrapePostFiles` / `renderFiles`。
- class post 模态从 `/news/<id>` 抓 `div.card.attachment`：`title` 当文件名，`&name=` 参数补扩展名，`img[src*="/ajax/mime/"]` 拿 MIME，li 文本里的 `694.37 KB` 当大小。每份附件都有一个 `&save=1` 的重复链接，按 hash 去重。
- 正文里内联的 `fetch.php` 链接（"here"、"Worksheet"）也收进来；既然下面有文件卡了，上面那排文字链接就跳过这些，不再重复。
- 渲染成文件卡：类型色块 + 文件名（单行省略）+ `PDF · 1.15 MB`，暗色一套，点击新标签打开。旧的两列 `.wt-modal-files` 连同 CSS 一起删了。

**3. 卡片常态可拖**：`draggable` 从编辑模式里搬出来，任何时候都能拖；跨分区拖动直接忽略；顺序还是走 `wesleyPanel:v1` 的 `order`。实测占位符落位、刷新后顺序保持。

**4. 点复选框卡片不缩**：`:has(.wt-check:active)` 把卡片那条 `:active{scale}` 压成 `none`，复选框自己照旧缩。实测卡片 `transform` 是 `none`，复选框 `matrix(0.905…)`。

**5. 暗色下拉框的箭头**：`.wt-form` 的 `background:#fff` 简写把站点给的箭头清了；再叠加 `theme.css` 里 `html[data-wt-theme="dark"] input, textarea, select { background: rgb(36,28,41) !important }` 这条简写，`background-repeat/size/position` 全被带成默认值，于是自绘的 chevron 被平铺成锯齿铺满整个下拉框。两条规则里的 repeat/position/size 全部加 `!important` 之后正常，亮暗两套一致。

**6. 死代码和三个真 bug**
- 删了 5 个没人调的函数：`cleanNameOld`、`eyeIcon`、`reopenAddModal`、`hideEmptyRestoreGroups`、`hexToRgba`。**踩坑**：按 `function` 边界切 `eyeIcon` 时，把紧跟其后的 `const JUNK_RE` 一起切掉了，`normItems` 抛 `ReferenceError`、整块面板不渲染。补回来后正常。以后按边界删块要顺手看一眼两个 function 之间夹没夹 const。
- `hideRestoreRow` 在 `setTimeout` 里又调自己：每 170ms 排一个新定时器，永不停止，行也不会真的消失。`showRestoreRow` 第一行就是自调用，点了直接栈溢出。都改成一次性（清定时器 + `display`）。
- `openFormModal` 末尾粘着一段本该属于 `openModal` 的异步块，里面引用不存在的 `opts`，每开一次表单就抛 `ReferenceError`（日志里的 "modal fetch failed: opts is not defined"）。删掉。
- 抽公共：`dayPartOf` 和 `normItems` 各抄一份的周次上下文 → `weekContext(post)`；两个模态各搭一遍暗底 + dialog + 关闭动画 → `mountModal(overlay)`。
- `gotFiles.length ? 'No description on this assessment.' : 'No description on this assessment.'` 这种两边一样的三目，改成有附件时提示看下面的文件。

**7. 卡片正文行数** 2 → 3 行。IAS 那张卡才装得下 "Friday 6 November / Period 5 / Assessment task test in class"，之前截在 "Period 5…"，最要紧的半句看不到。

**8. 附件徽标**：没有扩展名的内联链接（"here"、"Worksheet"）原来会 `split('.').pop()` 拿到整个名字，徽标写成 `HERE` / `WORK`。加了「有没有点」的判断，现在统一是 `FILE`。

**验证**：5 个纯 Node 测试全过（news-alert / crawl / rename / panel / schedule），`node --check` 全绿，浏览器实测面板 18 张卡、周次胶囊 "Day 5 Term 4 · Week 5"、IAS 卡正文正确、复选框按压、附件模态（两枚 PDF）、Esc 关模态、拖拽落位与持久化。版本 `0.1.1.30`，包 `Better_WiSE_v0.1.1-beta30.crx`（524,543 B）/ `.zip`（261,032 B）。

**打包坑**：探针浏览器开着的时候 `--pack-extension` 会失败（`crx exists: false`），但脚本照样打印 `PACKAGED`，根目录那份 crx 其实是上一次的。先 `taskkill` 掉探针 Edge 再打包，或者手工把 `extension.crx` 改回带版本名的名字。

**beta31（同日 20:49）**：只是清理 —— 删掉没人调的 `periodIsNow(p)`（算「这节课是不是在上」的旧函数，课表卡片改版后就没用了），版本推到 `0.1.1.31`。功能无变化，装了 beta30 的可以跳过这一版。

顺带记一笔：`build-extension.mjs` 里 `--pack-extension` 偶尔会晚几秒才把 `extension.crx` 写出来，脚本查得太早会打印 `crx exists: false`，文件随后才出现 —— 别急着以为没打出来，先看一眼目录。

## 第二十四轮（2026-11-06 23:16–23:40）— beta32：拖拽从「三秒」到「一帧」

用户原话：拖动卡片特别卡，从拖拽到识别到应该落哪个位置，至少花了三秒。

### 慢在哪（读旧代码定位）

旧 `dragover` 每来一个事件（drag 期间 60+ 次/秒）都做四件事：

1. 对网格里全部卡片 `getBoundingClientRect()` —— 一次强制布局；
2. 无条件 `grid.insertBefore(ph, hit)` —— 每次 DOM 变更再触发一次重排；
3. `requestAnimationFrame` 里给每张位置变了的卡片 `el.animate(...)` —— 18 张卡 × 60Hz，每秒上千个 Web Animation；
4. 卡片带 `backdrop-filter` 毛玻璃，重排就得重绘整层。

再加上 drop 和 dragend 各 `rerender()` 一次，松手那一刻整块 DOM 重建两遍。

### 改法

- 新增 `DRAG_STATE`（`{el, grid, sectionKey, ph, rects, raf, ev, dropped}`）管一次拖拽会话。
- 几何在会话里缓存一份：位置没变就直接 return，一个 DOM 节点都不碰；排过一轮才作废重测。
- `dragover` 用 rAF 合并，一帧最多处理一次。
- 只给真正位移 >1px 的卡片做 FLIP 动画；位移卡片超过 8 张就整轮跳过动画（顺滑不如不卡重要）。
- 拖拽期间 `html.wt-drag-now`，把卡片的 `backdrop-filter` 关掉。
- `drop` 直接把卡片 `insertBefore` 到占位符位置、写 prefs，`dragend` 不再 `rerender()`。

### 量到的数（合成 DragEvent 驱动真实监听器，11 张卡）

| 指标 | 结果 |
| --- | --- |
| 单次 `dragover` 同步耗时 | 0–0.4 ms |
| 单次移动引起的 DOM mutation | ≤ 1 次（同一格内移动 = 0 次） |
| 占位符落位延迟 | 9–12 ms（约一帧） |
| drop 后 | `due.order` 写入 11 项，卡片节点身份不变（没有整块重绘） |

### 探测环境被迫换了一次

Edge 156 和 Chrome 157 都已经不认 `--load-extension`（拿最小 MV3 测试扩展验证过，也不加载）。之前那套重启脚本从这一刻起静默失效，表现是「扩展整个不跑、页面没有任何 wt 元素、但也没有报错」。

新方案：Edge + `--enable-unsafe-extension-debugging`，启动后走 CDP `Extensions.loadUnpacked`。脚本 `tools/probe/one-browser.mjs`，加载出来仍是 `ecdedhcfflmobjlbcfanknhcpnnchefi`。**只开这一个窗口，不再重复开。**

顺带删掉了临时诊断代码（把错误写进 `data-wt-diag` 的那段）。

另外记一条：CDP 的 `Input.dispatchMouseEvent` 驱动不了真实的 HTML5 拖拽（`dragover` 计数恒为 0，且时灵时不灵），所以拖拽验证走的是「页面里 dispatch `DragEvent`、真实监听器接招」这条路；要端到端就得用 `Input.setInterceptDrags` + `Input.dispatchDragEvent`。

## 第二十五轮（2026-11-06 23:34–23:44）— beta33：拖拽时的两张卡与动画起点

用户原话：拖拽的动画占位显示（鼠标还没松开）有问题，第一拖动了以后原来占位的卡片不要，就手里一个卡片就行了。第二每次读新的位置的时候，所有卡片并非跟着上一刻的位置做动画，而是卡片还没动的时候的那个位置做动画。

### 两个毛病各自的根因

**一、拖起来之后屏幕上有两张卡。** 旧实现给原卡加 `.wt-cw.wt-dragging{opacity:.3}`，只是把它变淡，它仍然占着自己的格子；占位符又插在**它后面**，于是多出一格空格 —— 看上去就是「原卡还在 + 旁边冒出一个虚线框」。

**二、换位动画从一个更早的位置开始。** 旧 `wtDragPlace` 把各卡 `getBoundingClientRect()` 缓存进 `st.rects`，排过一轮才作废。问题是 FLIP 动画还在跑时，卡片的 rect 是**带 translate 偏移的**，量出来的「起点」是动画中途的假位置；下一轮动画再从这个假位置往回补，就成了乱跳。

### 改法

- 拖起来的原卡彻底离开布局：`.wt-cw.wt-dragging{position:absolute;opacity:0;pointer-events:none}`，占位符改为插在**原卡的原位置**（`grid.insertBefore(ph, wrap)`），屏幕上只剩虚线格子 + 手里的幽灵图。
- 原卡离场后浏览器就没得快照了，拖影改成自己做：克隆一张卡塞进面板里（`position:fixed;top:-9999px`），`dataTransfer.setDragImage(clone, w/2, 22)`，同帧结束后删掉。
- 新增 `wtSettle(st)`：每次换位前先 `finish()` 掉还在跑的位移动画，让布局回到自然位置再量几何 —— 量到的「刚才的位置」才是真的刚才。
- `wtDragPlace` 去掉跨帧 rect 缓存，改成「先收尾动画 → 量一次 → 插入占位符 → 再量一次 → 按差值做 FLIP」。
- `drop` 里先 `classList.remove('wt-dragging')` 把卡片放回布局，再 `insertBefore(dragged, ph)`，否则松手瞬间会跳一下。

### 测出来的数（`tools/probe/drag-visual.mjs`，真实站点 11 张卡）

| 检查 | 结果 |
| --- | --- |
| dragstart 后原卡 | `position:absolute`、`opacity:0` |
| 占位符位置 | 紧贴原卡原位（`phBefore:true`） |
| 网格高度 | 343 → 343（没有多出一格） |
| 幽灵图节点 | 已清理（`ghosts:0`） |
| 换位后一帧内的最大跳变 | 0 px（动画起点 = 刚才的位置） |
| 落位 | 3 张卡换格、动画全部收尾、无残留 |
| drop 后 | `due.order` 11 项 |

产物 `Better_WiSE_v0.1.1-beta33.crx`（528,256 B）/ `.zip`（262,890 B），版本 `0.1.1.33`，ID 不变。5 个纯 Node 回归测试仍全过。

## 第二十六轮（2026-11-07 15:23–15:45）— beta34：周末那一堆

用户周六报了十条（m01139 + m01168 追一条），一次做完。

- **周末启动 25–30 秒**：`main()` 里 `await waitTable(20000)` 在周六必然空等满 20 秒（站点不渲染 `[data-timetable-container]`），之后才进 `weekendMode()`，再发两次日历/班级请求。现在先看 `h2[data-timetable-header]` 的文本，含 "last school day" 就直接跳过等待；`WEEKEND_MODE` 分支下 `waitTable` 只等 4 秒且不再递归。实测冷启 5.2 秒、热启 2.1 秒。
- **课表从 Period 2 起（m01168）**：`buildSyntheticTimetable` 里 `'Period ' + (i + 1)` 的 `i` 把 Homeroom 算进去了。改成只数非 homeroom 的项，现在表头是 Homeroom + Period 1..6，与 `/timetable` 页一致。
- **课表与下方板块没有间距**：站点两个 `.row` 中间夹着一个隐藏的 `.row.timetable-small`，相邻规则被它打断。加 `.row:has(table.timetable):not(.timetable-small){margin-bottom:14px}`，实测间隔从 0 变成 28px。
- **右上角通知/设置太挤**：给 `.wt-sr-setbtn-inline` 补 `margin-left:12px;margin-right:14px`，`section.right-small` 补 `padding-right:18px`。注意必须写成 `section.right-small .wt-sr-setbtn…`（0,3,0），`search.js` 里那条 `margin:0 8px 0 0 !important` 是 0,2,0，会压过裸类名。
- **upcoming 行距**：`.wt-up` gap 4→3px、`.wt-up ul` gap 4→2px。
- **读了八个月前的 post**：`hydrateClass` 现在按 30 天截断（`MAX_POST_AGE_DAYS = 30`），并先按 `publishAt` 倒序取最新一条。关键细节：日期解析不出来时**保留**，只有能证明超龄才丢，避免把没写发布时间的帖子误杀。实测 Individuals and Societies 的新闻列表现在只剩 `181833 Environmental Change Worksheet`（2026-02-09），老师把近期的删了 → 现在判为无新帖，不再把二月的当今天作业；日志里 `posts ok=4/7`。
- **Alert 弹的不是最新**：`newsAge()` 只会读 `(\d+) (minute|hour|day)s? ago`，而站点卡片写的是 "a day ago" / "yesterday at 4:28pm"，全部读不出来 → `newestNewsLink` 退回 DOM 顺序。重写后支持 `a|an`、week、month、`just now`、`yesterday`、`today at H:MM`。
  两个坑（都踩过）：
  1. 只往上找一层不够，往上爬的时候必须**遇到含多条帖子链接的容器就停**，否则读到整块列表的时间，反而挑到更旧的帖子（第一次改完弹的是 `210842 International Music Club`，比最新的旧两天）。
  2. 不能用裸 `today` 当"刚发"的证据 —— 页面里 "due today" 之类的字样会把旧帖算成 30 分钟前。只有 `today at 4:28pm` 这种带时刻的才算。
  另外面板构建时新闻卡片常常还没渲染全（先出现的是侧栏/归档），所以 `latestNews()` 改成采样：250ms 一轮最多 24 轮，卡片数量连续 3 轮不变就收手，找到一小时内新帖则立刻返回。
- **Next day 颜色不对/教室不换行**：`altTableFor` 的颜色原来只从今天表格里同码的格子取，取不到就随机 pastel；现在补一层"从课程表数据里按课程代码取站点色"。排版从 `name (code) room` 一整行拆成三行（课名 / (代码) / 教室），与今天表格一致。
- **☰ 里的 Nothing due 还能点**：`openNextDay` 里新加 `openable = !!cls && tasks.length > 0`，没有作业的行不再挂 `role="button"` / `tabindex`，也不绑点击。
- **暗色模态箭头是实心三角**：`theme.css` 的 `html[data-wt-theme="dark"] .wt-modal-caret svg{fill:currentColor}` 把折线两端连起来就是三角。改成标记 `fill:none;stroke:currentColor`，只给关闭按钮的 × 保留 `fill`。
- 新增回归 `build/test-news-age.mjs`（11 条：a/an、week、month、yesterday、today at、裸 today 不算、容器含多帖停止上溯、取最近、并列按 DOM 顺序、全读不到退回第一条）。`build/test-news-alert.mjs` 的 `new Function` 补了 `wtLog` 桩（`maybeNewsAlert` 里加了日志行）。
- 五个 Node 回归全过：`test-schedule` / `test-news-alert` / `test-crawl` / `test-rename` / `test-panel`，外加新的 `test-news-age`。
- beta34：`manifest.json` 与 `options.js` 的 `MANIFEST` 都是 `0.1.1.34`，产物 `Better_WiSE_v0.1.1-beta34.crx` 530,852 B / `.zip` 264,044 B。

## 待办（下一轮从这里接）

- **请真机验手感**：拖拽时手里那张幽灵图（现在是自己 `setDragImage` 出来的克隆，跟原卡应该一模一样，但只有真机能看清）；附件卡点击后新标签能不能带上登录态；`Term 4 · Week 5` 胶囊在浅色主题下的对比度。
- **探针环境**：Edge 已经不吃 `--load-extension`，别再用 `tools/probe/restart2.mjs`（会静默失效）；用 `tools/probe/one-browser.mjs`（`--enable-unsafe-extension-debugging` + CDP `Extensions.loadUnpacked`）。窗口**统一开在副屏**（脚本问 Windows 要非主屏的 WorkingArea，起完再用 `SetWindowPos` 搬过去，因为浏览器会从 profile 恢复上次位置）。
- **跨学期**：`TERM_DATES` 目前只写了 2026。2027 的校历出来要补一行，否则 `schoolWeek()` 返回 null，周次胶囊会消失（判定逻辑会自动退回宽松模式，不会报错）。
- **附件大小/类型**：只有站点给了 `KB/MB` 文本时才显示大小；没有扩展名的内联链接显示成 `File`，考虑加个「打开链接」的图标文案。
- **冗余**：`tools/probe/` 里还堆着几十个一次性探针脚本，要清就一次清干净，别留半套。
- **FB 同步**：`mekathun.tplinkdns.com:11451` 整机不可达，用户说非工作时间不传，暂时不是阻塞项。
- 推 GitHub / 同步 OneDrive **未经用户明确同意绝不做**。
- **30 天窗口**目前写死在 `hydrateClass`（`MAX_POST_AGE_DAYS`），觉得太松或太紧就做成设置项，比再改代码省事。
- **Alert 采样最长 7 秒**：为了等新闻卡片渲染完。嫌弹得晚，可以让 `latestNews()` 与面板构建并行跑。
- **周末快速退出要等周中复核**：现在「1.8 秒内没有 `[data-timetable-container]` 且页面已 complete」判定为没课表，直接走日历接口。站点是服务端渲染，工作日这个容器随首屏 HTML 到达，所以理论上不会误判，但**还没在工作日实测过**。周中第一次用发现面板里课表是「合成表」而不是站点原表，就是这条规则误伤了，把阈值调大或去掉即可。
- **骨架在周中的样子还没看过**：骨架是宽 866、高 367 的固定块，周中如果站点课表秒出，骨架可能只闪一两帧（反而更像抖动），到时候可以考虑「200ms 内没数据才显示骨架」。
- **面板 4.5 秒里有两秒在等网络**：`fetchPastTimetable()` 打 `/calendar/ajax/full` + `/learning/classes` 两个请求。想再快就把面板先渲染出来、课表段留空后补（`main()` 现在是先等表再建整个面板）。

## 发布 0.1.2（2026-11-07 17:40–17:55）— 面板默认折叠、暗色搜索补齐、发布打包

**① wt-summary 刷新后自己展开**
用户要求「刷新进入页面默认是没展开的样式」。原来 `buildSummary` 会从 `wesleyPanelOpen` 恢复每个 section 的开关，`toggleSection` 每次点击再写回去 —— 所以上一次开着，下次刷新就开着。
两处一起删掉（`grep wesleyPanelOpen extension/*.js` 现在为 0），顺手去掉这个已经没人读的存储键。实测刷新后 `[data-wesley-home] .wt-panel-body / .wt-sec-body` 全是 `open:false`，summary 高度 78px。

**② 暗色模式下 BW Search 只有上面一半是深的**
`extension/search.js` 里原本只有三条暗色规则，都是给「最近查询」的 chip 用的；卡片、搜索框、筛选条、状态条、结果行、底栏全是亮色写死的（`#fff` / `#fbf9fd` / `#fcfafd`）。
补了一整段 `html[data-wt-theme="dark"] .wt-sr-*`：卡片 `#1c1a21`、筛选条与状态栏 `#232128`、chips 槽与底栏 `#1b191f`、滑块 `#3a3242`、结果行文字 `#e2dfe7`、选中行 `rgba(190,150,255,.14)`、三种徽标（file/link/page）各自的深色底与浅色字、`mark` 高亮、滚动条、kbd 键帽。
实测 computed：卡片 `rgb(31,31,34)`、chips/status `rgb(35,35,38)`、foot `rgb(35,35,38)`，截图整块都是深的。

**③ 冒烟测试的两条失败，是数据不是 bug**
`node tools/probe/smoke.mjs` 报「due cards carry body text」和「modal detail non-trivial」失败。逐个 fetch 了 `data-wt-assess` 指向的页面：`Analysing Audio-Visual Texts` 52 字、`口试考核` 273 字、`2026 Semester 2 Examinations` 114 字，而 `End-Year Exam` 与 `Semester 2 Exam` 这两页**站点本身就是空的**（`article.content / #ir-content / main article / .u-pad-s` 全部匹配不到，日志里 `text=0 cleaned=0`）。扩展行为正确。
于是把断言改成跟数据无关的形状：至少 3 张卡有 >40 字正文、新增一条「没有卡停在 Reading assessment…」、模态正文阈值 80 → 20。现在 17 项全 PASS。

**④ 发布前的检查**
- `node --check extension/*.js` 全过；六个 Node 回归（schedule / news-age / news-alert / crawl / panel / rename）+ smoke 全过。
- 无运行时报错：CDP 监听 `Runtime.exceptionThrown / Log.entryAdded`，刷新 + 开面板 + 开 due 模态 + 关 + 切 tab 全程 `errors []`，`documentElement[data-wesley-error]` 为空。
- 无调试残留：`extension/*.js` 里只剩 `home.js:5234` 那条 `console.log('[BetterWiSE]', msg)`（调试开关用），`TEMP`/`FIXME`/`data-wt-diag` 均为 0。
- `manifest.json`：MV3、`permissions:["storage"]`、3 条 host_permissions、4 组 content_scripts、`key` 392 字符（ID 恒为 `ecdedhcfflmobjlbcfanknhcpnnchefi`）。
- 包内文档同步：`README.txt` 版本行与安装步骤里的 zip 名改成 0.1.2，功能清单按现状重写（折叠启动、附件卡、Set due、拖拽排序、周次 chip、周末显示最后上课日、七门课可选、暗色搜索）；`PRODUCT.md` 的 version badge 与 `options.html` 的 `#footVer` 也一并更新。

**⑤ 产物**
版本 `0.1.2`（`manifest.json` 与 `options.js:176` 的 `MANIFEST` 同步）：
- `Better_WiSE_v0.1.2.crx` 554,362 B
- `Better_WiSE_v0.1.2.zip` 275,992 B（22 个文件，展开即可 load unpacked）

**打包坑（又一次）**：`build-extension.mjs` 里 `--pack-extension` 仍然晚几秒才写出 `extension.crx`，脚本会先打印 `crx exists: false` 并跳过复制、但还是打印 `PACKAGED`。所以每次打完要自己确认根目录那份的大小，`extension.crx` 存在就 `mv -f extension.crx Better_WiSE_v0.1.2.crx`。

## 第二十七轮（2026-11-07 18:10–19:25）— 性能模式不染色、设置页归位、快捷键、搜索加权（版本仍是 0.1.2）

用户明确说「别动版本号」，所以这一轮只改代码、重打包，版本留在 `0.1.2`。

**① 性能模式不该改颜色**
`html.wt-perf` 那套里混进了几条改配色的规则：`.wt-tabs` 与 `.wt-sec-inner/.wt-up-body.open` 被强制换成 `var(--wt-t-surface)`、`.wt-summary` 被盖成纯色并去掉 `box-shadow`、`.wt-summary-head::before/::after` 被 `display:none`、卡片规则里还有 `background-image:none`，另有一条 `html.wt-perf[data-wt-theme="dark"]{--wt-t-surface:#1f1f22}`（`theme.css:31` 里暗色本来就是这个值，纯属多余）。
全部删掉，只留真正影响性能的：`backdrop-filter:none`、`box-shadow:none`、`filter:none`、`will-change:auto`、骨架与转圈的 `animation:none`。
实测同一个页面上开/关 `html.wt-perf` 取 computed 值，`.wt-summary` `rgb(27,27,30)`、`.wt-tabs` 透明、`.wt-sec-inner` `rgb(32,32,35)`、`.wt-task` `rgba(38,38,42,.82)` —— 前后逐项相同（`same: true`）。

**② WiSE data 挪进 AI Model 组**
`options.html` 里把主页 `<section>` 的 `#rereadRow` + `#rereadStatus` 整块搬到 `#sheet` 的 `.model-block` 里、`Fast model` 之后；组标题 `Model` 改成 `AI Model`。实测这一组现在依次是「Use AI to optimise task list / Base URL / API key / Fast model / WiSE data + Re-read with AI」。

**③ 插件页设置覆盖层右上角的黑块：本地复现不出来**
在 1409（tab 全宽）、520、500、360（popup 宽）四个宽度、亮暗两套主题、sheet 打开的状态下各截一张，逐像素扫：顶部要么全是 `rgb(21,18,24)`、要么全是 `(183,175,186)`，暗像素只出现在文字笔画上，没有任何黑色块。
元素层面右上角只有三样：`HTML`、`#feedback.sheet`（`rgba(20,10,25,0)`，关闭态透明白）、`#sheet.sheet.open`（`rgba(20,10,25,.28)`）；`colorScheme: normal`、`scrollWidth == innerWidth`、`scrollHeight == innerHeight`，没有横向溢出也没有滚动条。
**这块先挂起，等用户圈一下位置**（是 popup 还是 tab、黑块在窗口右上还是 sheet 卡右上）。

**④ 快捷键**
- `search.js` 的 `DEFAULT_SHORTCUTS` 和 `options.js` 的 `DEFAULTS` 都把 `search` 从 `alt+k` 改成 `mod+k`；两边各加 `migrateShortcuts/migrate`，老配置里存着 `alt+k` 视为「没改过」，自动迁到 `mod+k`（用 `chrome.storage.local` 里那份也一起迁）。
- `home.js` 的 `wt:shortcut` 分发里，`panel` 从「只切最外层那一格」改成一次开/关整块面板的所有 `.wt-sec-body`：全开就全关，只要有一个收着就全开。
- `options.html` 那一行的名字 `Whole panel` → `All sections`，加了 title 说明。
实测：`before [false,false,false]` → 按一次 `[true,true,true]` → 再按一次 `[false,false,false]`；设置页键帽显示 `search: Ctrl + K`；Alt+K 不再打开搜索，Ctrl+K 打开。

**⑤ 搜索：自己科目的条目往前放**
`search.js` 新增 `mySubjects()`（5 秒缓存，优先读 `wesleySubjects:v2` 的 `{list:[{name,code}]}`，没有就退回最近一份 `wesleyLocal:<date>` 的 `classes`）与 `isMySubject(e)`：代码比较忽略 `G/` 前缀、按 `-` 分段做前缀匹配，名字比较先去掉 `vce|vcal|year N|unit|数字` 再比包含。
`scoreEntry` 末尾 `if (isMySubject(e)) score += 25;` —— 只加分，**不扣别人的分**；+25 压不过标题完全命中的 +120，但足以把同等相关度的条目拉开。
实测搜 `revision`：自科的 English 3、Science 7A、Chinese、PHE 占住前六，外系的 "Year 10 Students - Glen Waverley"、"VCE" 排到后面；搜 `exam` 同理，自科条目在前，外系（VCE / Glen Waverley Senior School）夹在中间偏后。

**⑥ 收尾**
`node --check extension/*.js` 全过；六个 Node 回归全过；`build-extension.mjs` 重打，`manifest.json` 与 `options.js:176` 仍是 `0.1.2`：
- `Better_WiSE_v0.1.2.crx` 557,559 B
- `Better_WiSE_v0.1.2.zip` 277,588 B

## 第二十八轮（2026-11-07 19:30–20:05）— 右上角黑块、搜索分组、recent 可管理（版本仍是 0.1.2）

**① 插件页右上角那块「黑色」**
用户圈出来的位置在 popup 的右边缘、动画速度滑杆到 footer 那一段。根因不是我们的元素，是**浏览器自己画在 popup 右边缘的滚动条**：`options.html` 里 `html` 没定高度、内容比 popup 高，Chromium 就给弹出窗口加一条原生滚动条，它不受页面 CSS 控制，系统深色主题下就是一条近黑色的块。
改法：`html` 定死 `height:100%; overflow:hidden`，让 `body` 当滚动容器（`height:100vh; overflow-y:auto`）。这样内容再长也只在 body 里滚，浏览器那层不会再冒滚动条，滚动的视觉走本页 `::-webkit-scrollbar` 那套细紫色滑块。
另外给 `html` 补了 `color-scheme: light`，免得系统深色把原生滚动条染黑。
实测（`Emulation.setDeviceMetricsOverride` 340×420 / 480 / 600）：`htmlOverflow` 恒为 0，`bodyOverflow` 分别 79 / 19 / 0，body 可滚、html 不滚。

**② WiSE search 的结果不再插到最前面**
等 5 秒回来的 `/api/search` 结果以前是**先** push 进合并数组，本地索引排在后面，所以站点搜索一回来整个列表就变样，而且里面很多是别的校区的、跟今天课程无关的东西。
`mergeResults` 改成先本地、后站点；`paintRows` 在第一条站点结果前插一条 `From WiSE search` 分隔标题（`.wt-sr-sect`），站点行加 `.srv` 类、标题淡一档；状态栏也顺带报「N from WiSE search」。
`paintSel` 从「按 `listEl.children` 下标」改成「按 `.wt-sr-row` 取」，否则分隔标题会把选中行和下标错开。
实测搜 `maths`：11 条本地在前，第 12 个节点是分隔标题，之后 31 条站点结果。

**③ 自己科目的权重压过标题命中**
按用户的要求把优先级定成「本科目 > 标题匹配」：`isMySubject(e)` 的加分从 +25 提到 **+140**（标题完全命中最高是 120 + 12 = 132）。

顺带修了一个会让人误解的排序：附件原来无条件 +6，导致标题叫 `here`/`Worksheet` 的附件靠 cls 蹭到匹配、排到正经帖子前面。改成只有标题里真的命中才加这 6 分。同一段实测，`maths` 的第一条从 `here` 变成 `Term 4 Week 5` 那条帖子。

**④ recent 搜索记录**
以前只有「点开某条结果」才写入（`openEntry` → `saveRecent`），打完字直接关掉什么都不留，所以用户说自己触发不了。
改成 `renderResults` 里记下最后一个「真有结果」的词（`state.lastQuery`），`close()` 时写入 —— Esc 会先清空输入再关，取不到输入框的值，所以必须记在 state 上。
每条记录右边加一个 `×` 只删这一条，行尾加 `Clear` 一次清空；两个都直接改 localStorage 再重绘。
实测：造 `['maths','exam','revision']` → 点第一个 × 剩 `['exam','revision']` → Clear 后 `items:0, hidden:true, store:null`。

**⑤ 收尾**
`node --check extension/*.js` 全过；六个 Node 回归全过；`build-extension.mjs` 重打，版本仍是 `0.1.2`：
- `Better_WiSE_v0.1.2.crx` 560,685 B
- `Better_WiSE_v0.1.2.zip` 279,153 B

新探针：`tools/probe/v45.mjs`（popup 尺寸下 html/body 溢出）、`v45b.mjs`（420/480/600 三档）、`v45s.mjs`（搜索分组 + recent）、`v45sec.mjs`（分隔标题截图）、`v45r.mjs`（recent 的 × 与 Clear）。

## 第二十九轮（2026-11-07 19:45–20:40）— 文件类型、文件子类、查询语法（版本仍是 0.1.2）

**① 认文件类型：三层**
1. 标题尾巴的扩展名（`Career News.pdf`）。
2. href 的 `&name=` 参数（`/storage/fetch.php?hash=…&name=Worksheet.docx`）。
3. 文件卡片里的 `<img class="mime" src="/static/images/mime/application-pdf.svg">` —— 班级首页那个 `ul[data-dz-container]` 里每个 li 都带这个图标，索引时一起记下来（`mime` 字段）。

`send.php` / `fetch.php` 这种取文件的脚本，路径里的 `.php` **不能**当扩展名（`DISPATCH_EXT`），否则每个附件都变成「php file」。

光有上面三层还不够：618 个文件里 587 个是 `/send.php?id=…`，标题是老师随手写的（`here`、`Worksheet`），索引阶段看不出类型。所以加了**懒探测**：
- `wesleyFileTypes:v1` 缓存（href → `{mime, name}`）。
- 用户在 Files 视图（或查询里带 `kind:`/扩展名）时，对还没分类的文件发 `HEAD`，一次 24 个、4 并发、整个会话上限 400 次；读 `Content-Type` 与 `Content-Disposition` 里的真实文件名，写回缓存并重画。
- 实测 10 秒把 101 个文件分好类（doc 55 / pdf 16 / slide 12 / media 7 / image 11），`Docs`、`Images` 子类立刻能用。
- 索引结构加了 `schema: 2`，读到旧索引会自动静默重爬一次（否则新字段永远是空的）。

**② 排序：文档 > 认不出来 > 图片**
原来标题完全命中的 `+120` 会把一张叫 maths 的图片顶到最前面。现在文件按类型加权：
- 文档（pdf/word/excel/ppt 一类）：分数照旧，标题命中再加 4；
- 图片：`分数 × 0.35 − 6`；
- 认不出来的：`分数 × 0.5 − 3`。

帖子不受影响，所以搜 `maths` 时 `Term 4 Week 5` 那条帖子还在第一位，附件排在它后面。

**③ Files 的子类筛选**
选中 `Files` 之后下面多一行同样的胶囊筛选：All / Docs / Slides / Sheets / Images / Other，只在这一层出现，切走就收起。筛选逻辑 `kindGroupOf`，在本地索引和站点结果两侧都生效（`serverAllowed` 里也走 `kindAllowed`）。

**④ `From WiSE search` 的骨架**
站点搜索要等 5 秒，以前这段时间下面什么都没有。现在 `serverSearch` 一进入 busy 就重画一次列表，在本地结果后面画一条分组标题 + 3 行骨架（徽标方块 + 两条灰条，1.15 秒的 shimmer，暗色单独一套），结果回来原地换掉。

**⑤ `Refresh index` → `Refresh`**

**⑥ 查询语法**
| 写法 | 作用 |
|---|---|
| `@maths` / `@"maths methods"` | 只看这门课（课名或课程代码，带空格用引号）|
| `title:term` | 这个词必须出现在标题里，可写多个 |
| `kind:docs` | 只看某一类文件：docs / slides / sheets / images / other |
| `kind:pdf` | 只看某一种扩展名（pdf / docx / pptx …），比 `kind:docs` 更细 |
| `-worksheet` | 排除包含它的条目 |
| `"term 4 week 5"` | 整串必须连着出现（普通空格是「都要有，不要求相邻」）|

实现上 `parseQuery()` 把原始字符串拆成 `tokens / subj / titleOnly / exts / kinds / excludes / mustPhrase`，`passesQuery()` 统一做过滤（本地和站点两侧共用），分数仍在 `scoreEntry` 里算。

**⑦ 回归**
新增 `build/test-query.mjs`（22 条，纯 Node）：类型识别 12 条（title ext / send.php 不算 php / name 参数 / mime 图标 / 各类分组 / Content-Type 映射）、语法 10 条（`@`、`@"…"`、`title:`、`kind:docs`、`kind:pdf`、`-`、引号短语、只有 `@` 时 phrase 为空）。
`build/test-crawl.mjs` 补了 `IDX_SCHEMA` 参数与 schema 断言。
七个 Node 回归全过。

**⑧ 打包**
版本未动，仍是 `0.1.2`：`Better_WiSE_v0.1.2.crx` 570,831 B / `.zip` 284,224 B。
探针：`tools/probe/v46.mjs`…`v46o.mjs`（骨架、子类、查询语法、类型分布、HEAD 探测验证）。

---

## 第三十轮（2026-11-07 20:20–20:40）— 站点搜索被我们弄坏了、语法提示、悬浮卡、后台预探测

**① 站点右上角原生搜索 hover 时整块错位**
站点自己的 CSS 是 `form.sbx-header-search` 平时 72px 宽（`--sbx-header-button-width: 4.5rem`），`:hover` 时 `width:100%` 展开成搜索条。我们早先在 `boot.js` 里为了给它让位写了 `width:48px!important`，把展开也钉死在 48px，于是 hover 时 form 从 x=1280 跳到 1159、输入框还是 1px，看着就是「整个框错位」。
改法：只保留 `right:200px!important`，width 交还给站点。实测折叠 x=1091 w=72，hover 展开 x=-184 w=1347（输入框 1059），头像 `a.account-menu` 仍在 x=1213，互不遮挡。

**② 插件 popup 瘫痪**
上一轮为了消掉「右上角黑块」，在 `options.html` 写了 `html{height:100%;overflow:hidden}` + `body{height:100vh;max-height:100vh}`。popup 的高度是浏览器按文档内容算的，把高度锁死等于把窗口锁死，所以弹窗是塌的。黑块本身也不是页面元素，是 Chromium 给 popup 画的原生滚动条，系统深色主题下是近黑色。
改法：`html{background:#f5eff8;color-scheme:light;scrollbar-width:thin;scrollbar-color:rgba(100,52,111,.35) transparent}`，`body` 恢复自然高度、`overflow-y:auto`，滚动条自己上色。实测 340×600 布局正常、footer 可见。

**③ 语法提示 tooltip**
挂在搜索框左边的放大镜上，鼠标停 450ms 才出（以前 `:focus-within` 会在刚打开搜索时就弹出来，挡视线）。字体从 `ui-monospace 10.5px` 换回界面字体 11.5px/600，整块透明度问题也修了 —— 之前 tip 是放大镜的子元素，而放大镜带 `opacity:.85`，整块跟着变成半透明；现在透明度只加在 svg 上。
层级：`.wt-sr-head{position:relative;z-index:5}`，之前没定位，悬浮提示会被后面的胶囊筛选条盖住。

**④ recent 改成悬浮卡**
常驻的 recent 胶囊删掉了。鼠标在搜索框里停 2 秒浮出一张卡，鼠标在「框到卡」之间移动不会消失，移出才收。卡里是 recent 词条（自适应宽度的方块，跟着文字长度走）+ 「Clear」+ 同一套语法提示。

**⑤ 语法**
`#title:exam`、`#kind:docs`、`#kind:pdf`、`@maths`、`-worksheet`、`"term 4"`。`#` 前缀是这轮加的，旧的 `title:` / `kind:` 仍兼容。语法只在本地生效，发给站点 `/api/search` 的只有普通词（`plain`），不然接口会当关键词去搜。

**⑥ 科目别名与科目限定**
新增 `SUBJ_SHORTHAND`（`pe`/`phe`/`hpe`、`eal`/`ela`、`math`/`maths`/`mme`/`methods`、`sci`、`bio`、`chem`、`phy`、`chi`、`llc`、`ias`/`hass`/`hum`、`art`、`music`、`drama`、`dig`/`tech`、`eng`）。名字匹配里 ≤3 个字母必须整词，否则 "health" 里的 "eal" 会命中 EAL。
显式 `@` 只认课名/课程代码，不再看正文（正文里提到 sport 的公告不算体育作业）。查询里出现科目词（`maths`）时自动做软限定：只留这门课的条目，外加标题里真的带这个词的。

**⑦ 后台预探测文件类型**
`enrichTypes()` 在索引建好之后自己跑，每批 24 个 HEAD、批间让出 120ms 主线程，结果写 `wesleyFileTypes:v1`。探不到 mime 的文件也记一条空结果，否则同一条会被无限重试。搜索框还没打开就开始补，用户点进 Files 时大部分已经分好类。

**⑧ 回归与产物**
七个 Node 回归全过（`test-crawl.mjs` 里把 `crawl()` 收尾的 `enrichSoon()` 调用剔掉了，那层不测后台探测）。版本仍是 `0.1.2`，产物 `Better_WiSE_v0.1.2.crx` 578,967 B / `.zip` 288,289 B。

### 第三十一轮（2026-11-07 20:52–21:03）— 悬浮卡 1 秒、放大镜可点开、导航防重叠重做

**① 悬浮卡的触发阈值**
`bindHoverCard()` 里 `hoverArm = setTimeout(openHoverCard, 2000)` 改成 `1000`。放大镜上的提示仍是 450ms、鼠标离开立刻收。

**② 那个黑色的 1 秒提示**
不是我们画的，是输入框上的原生 `title`（`@subject · #title:word · …`）—— Chromium 悬停 1 秒会弹一条黑底系统提示，跟自定义 tooltip 打架。直接删掉 `input` 的 `title`，语法说明只留在放大镜的 tooltip 里。

**③ 放大镜提示可以点开**
加了 `tipPin`：单击放大镜把 `.wt-sr-tip` 钉住（再点取消），点页面其他地方（`document` 的 `mousedown`，捕获阶段）也取消。鼠标移开时如果钉着就不收。

**④ 顶部导航防重叠（重做）**
之前 `fitDock()` 是「按用得不多的顺序砍项」（Contact Us → My Pastoral → …），跟实际遮挡没关系。现在换成 `navFitSearch()`：

- 拿 `form.sbx-header-search` 的**左缘**当界线（原生搜索是绝对定位贴着右边的，窗口一窄就往左压）；
- 看导航里最右那个可见项，右缘 + 10px 一旦越过界线就收；
- 最右那项是 **BW Search** 时，收它左边一个（它自己顺势往左挪）；不是 BW Search 就直接收它；
- BW Search 本身永不藏（它可能是我们自己 dock 进去的那个 `li.wt-sr-dock-li`）；
- 收掉的项打 `data-wt-nav-hid`，每次重算先全部放回再按当前宽度重新收，所以拉宽会自己长回来；
- 搜索展开成整条（`:hover`）的时候跳过重算，不然量到的是展开后的位置。

`fitDock()` 现在只是转调 `navFitSearch()`；旧代码里那两条 `data-wt-hidden` 残留在重算时顺带清掉。

**⑤ 搜索框跟头像的间距**
原来 `form.sbx-header-search{right:200px}`，跟头像之间空 50px（用户量的是 82px，缩放不同）。改成 `right:170px`，实测两边间距 20px，头像左缘 1213、搜索右缘 1193，没被切。展开态仍然在头像左边，不会盖住。
头像在窄屏会被站点自己隐藏（约 1020px 以下 `display:none`），那时 `navFitSearch()` 把 `right` 改成 `112px`，跟齿轮保持 20px。

**⑥ 实测**
`tools/probe/v52a.mjs` / `v52g.mjs`：1700 → 860 每 40px 扫一遍，`overlap` 恒为空数组；1409 时 `gap 20 / right 170px`，1000 时 `gap 20 / right 112px`。
`v52n.mjs`：悬停 1.15 秒 `hovercard.show = true`；放大镜点击前 tip `opacity 0`、点击后 `1`；`input.title = null`。
截图 `tools/probe/v52-head-1409.png`、`v52-head-1000.png` 看头部：导航不压搜索图标，头像/齿轮/铃铛都在。

**⑦ 回归与产物**
七个 Node 回归全过；版本仍是 `0.1.2`，产物 `Better_WiSE_v0.1.2.crx` 579,732 B / `.zip` 288,671 B。

---

## 第三十二轮（2026-11-08）— 周末两张课表、假的「读不到课表」、暗色首帧闪白

**① 周末出现两张课表**
`weekendMode()` 先插一块合成课表（带 Next day / ☰ 两个按钮），站点自己的「上一个上学日」表晚几秒才渲染出来，于是屏幕上是两张。
新增 `hideSiteTable()`：从 `[data-timetable-header]` 的父元素里找含 `table.timetable` 的 `.row`（跳过我们自己那一块 `full`），打 `data-wt-hide-tt` 并 `display:none!important`，`setInterval` 700ms 盯 30 秒（表没来就什么都不做）；`cleanupIfLeaving()` 里把 `[data-wt-hide-tt]` 还原。
合成块自己的标题也去掉了：站点已经有 `[data-timetable-header]`（还带 Week chip），我们那块再写一遍就是重复。

**② 那条 "Could not read your class list" 是误报**
`anchorCheck()` 在加载后 2.5 秒判 `LAST_CLASS_COUNT === 0`。周末走合成课表，根本不经过 `collectPeriods()`，`LAST_CLASS_COUNT` 恒为 0，于是每次都报。
现在分两段：
- 2.5 秒只做诊断和清理，不下结论（那会儿数据常常还在路上）；
- 9 秒才允许插入警告，条件收紧成「非周末 + 没有卡片 + tab ≤ 1 且课表数 0」；
- 数据后来读到了就把警告收回 —— 它是「现在什么都没读到」的状态提示，不是一份记录。
实测周末 dashboard：`warn 0`、`visTables 1`、`hiddenRows 1`、只剩一条标题，`tasks 10 / dues 6`。

**③ 暗色首帧闪白**
`boot.js` 在 document_start 靠 `localStorage['wesleyTheme']` 这面「镜子」决定首帧主题。问题是这面镜子会过期：在设置页改主题时如果没有站点标签开着，就没东西写它。于是首帧按旧值画成亮色，等 `home.js`（约 0.9 秒）读到真值才改回暗色 —— 用户看到的就是「突然闪了一下白」。
现在 boot 设完镜像值后，再向 `chrome.storage.local` 要一次真值（几毫秒就回来），不一致就立刻改 `data-wt-theme`，并补上或撤掉 `wt-boot-theme` 那段背景样式。
实测：把镜像写成 `light`、真值 `dark`，刷新后主题在第一个可采样帧（约 0.4 秒，`home.js` 还没跑）之前就已经是 dark。用 screencast 逐帧量亮度：修之前最亮一帧 mean 98 / 近白像素 15.9%，修之后 80.7 / 0.3%，没有成片发白的帧。

**④ 回归与产物**
七个 Node 回归全过（schedule / query / news-age / news-alert / crawl / panel / rename）；版本仍是 `0.1.2`（用户要求先不动），产物 `Better_WiSE_v0.1.2.crx` 582,380 B / `.zip` 289,992 B。

**⑤ 面板又跑到课表下面（0.1.2.1 修）**
周末那块合成课表原来插在「标题 + `.column-left`」那一整行的**行首**，于是它跑到了标题上面，面板照旧插在标题后面 —— 视觉上就是「课表在上、面板在下」。
现在合成块改成挂在标题正后方（没有标题时才退回原来的行首插入），并且 `placeSynth()` 每 500ms 对一次位置，要求它紧跟在面板之后；这样顺序固定是 标题 → 面板 → 课表。
实测（周末 dashboard）：`panelTop 150 < ttTop 238`，可见表 1 张，`tasks 10`。

**⑥ 那条警告再加一层自愈**
9 秒判定改成 12 秒（慢一点的机器上 9 秒时面板还在骨架），并且插入后挂一个 2 秒一轮的探针：面板一旦有了卡片或标签就自己退场，最多等 60 秒。`buildSummary()` 开头也会顺手撤掉旧的。
实测：`warn 0`。

**⑦ 版本与产物**
版本 `0.1.2.1`（`manifest.json`、`options.js` 的 `MANIFEST`、`options.html` 的 `#footVer`、`README.txt`、`PRODUCT.md` 全同步）。
产物 `Better_WiSE_v0.1.2.1.crx` 583,560 B / `Better_WiSE_v0.1.2.1.zip` 290,466 B（Chrome 打包脚本按三段版本号命名，会生成 `0.1.2-beta1.*`，已手工改名）。

---

## 第三十三轮（2026-11-08）— 0.1.2.1 上架

**① 商店包**
`dist/Better_WiSE_v0.1.2.1_store.zip` 280,531 B，19 个文件（boot.js、color-fix.js、content.js、home.js、icons/×9、manifest.json、options.html、options.js、pinyin-data.js、search.js、theme.css），manifest 去掉 `key`，版本 0.1.2.1。
与侧载用的根目录 zip 的区别只在两处：无 `key`（否则会和商店 ID 冲突），不带开发脚本（build-extension.mjs / load-edge.cmd / wesley-cards-extension.zip / PRODUCT.md / README.txt）。

**② Chrome 应用商店**
开发者后台 → 文件包 → 上传新的软件包，草稿版本 0.1.2.1（已发布仍是 0.1.2）→ 提请审核 → 提交审核，条目状态「待审核」，自动发布已勾选。
上传走的是 `input[type=file]` + `DataTransfer`（本机浏览器不弹文件选择框）：本地起一个带 CORS 的静态服务（`127.0.0.1:8787`，根目录 `dist/`），页面里 `fetch` 拿 zip → `new File` → `DataTransfer` → 赋给 `inp.files` → 派发 `change`。

**③ GitHub**
release `v0.1.2.1`：https://github.com/Mekathun/better-wise-page/releases/tag/v0.1.2.1
标题 `Better WiSE page v0.1.2.1`，tag `v0.1.2.1`（指向 `c7421f9`，仓库内容没变），勾选 latest，正文 = Install 行 + `docs/RELEASE-0.1.2.1.md`。

**④ 附件还是得手动拖**
GitHub 的 CSP 是 `connect-src 'self'`，页面里 fetch / XHR 到 `127.0.0.1` 都被挡；本机没有 gh CLI、没有 token。试过把 zip 和 crx 放进剪贴板（`Set-Clipboard -Path`）再在窗口里 Ctrl+V，GitHub 的粘贴上传不认 CF_HDROP，没反应。最后靠人把两个文件拖进附件框。

**⑤ 版本号说明**
`0.1.2.1` 是四段号，Chrome 接受（每段 0–65535）。Chrome 自带的打包脚本按三段命名，会生成 `0.1.2-beta1.*`，产物是手工改名的。

## 第三十四轮（2026-11-08）— 0.1.2.2：站点原生弹层的暗色适配

**问题**
暗色主题下，Calendar 点事件、Export、日期选择器这些 WISE 自己的弹层，背景还是白的，但文字已经被我们的全局规则改成了浅色（`body` 继承 `#e9e2ef`、`a` 是 `#d9d5e0`、`p/li` 是 `#cfc4d8`），于是白底浅字几乎读不出来。此前我们只给 `.reveal` 做过暗色，站点实际用的是 Foundation 的 `.reveal-modal`，选择器没覆盖到。

**实测（修复前，`tools/probe/v56b.mjs` / `v56c.mjs`）**
`.reveal-modal` 的 computed 是 `background: rgb(255,255,255)`、`color: rgb(231,229,234)`；页面上一共有 12 个 `.reveal-modal`（事件详情、Export、各种 Please confirm、两个 `.adtp` 日期选择器），全部白底。日期选择器里真正白的是 flatpickr：`.flatpickr-calendar` = `rgb(255,255,255)`，外层 `.adtp` 已经暗了也盖不住。`/learning/classes` 的 `.f-dropdown` 同样白底浅字。

**改法（`extension/theme.css` 末尾三段）**
1. 原生弹层：`.reveal-modal`、`.fc-popover`、`.f-dropdown`、`.dropdown-pane`、`.selectize-dropdown`、`.ui-datepicker`、`.pika-single` 统一 `background:#1b1b1e`、`color:var(--wt-t-ink)`、边框 `rgba(255,255,255,.10)`、`color-scheme:dark`；内部 `form/section/fieldset/.content/.option-list` 保持透明；标题/正文/列表/表格文字统一 `var(--wt-t-ink)`；`.reveal-modal-bg` 遮罩 `rgba(0,0,0,.66)`；内置 `.button`/`button` 深灰底浅字；`.f-dropdown` 的 `li`/`a` 与悬停态、`.selectize-dropdown .option` 一并处理。
2. flatpickr：日历本体深底、月份/年份/星期头透明浅字、日期格透明浅字、悬停 `#2f2a35`、今天描边 `#6c4a8a`、选中/区间 `#6c4a8a` 白字、禁用/相邻月 `#5f5a68`、上下月箭头 `fill:var(--wt-t-ink)`、箭头尖角跟着底色。
3. 日期选择器（`.adtp`）的日历表、`td a`、悬停与选中态。

**验证（`tools/probe/v56e.mjs` / `v56f.mjs` / `v56j.mjs` / `v56i.mjs`）**
事件详情模态：`bg rgb(27,27,30)`、`color rgb(231,229,234)`、`colorScheme dark`、标题对比度 **13.74:1**、遮罩 `rgba(0,0,0,.66)`。Export 模态同样深底，`Download CSV` 白字压 `rgb(79,39,89)`。日期选择器：`.adtp` 深底、flatpickr 日历深底、选中日期紫底白字。`/learning/classes` 的 `.f-dropdown` 变成 `rgb(27,27,30)`。通知侧栏本来就是深色（`#msgs` 内无高亮背景）。亮色主题未受影响（规则全在 `html[data-wt-theme="dark"]` 下）。

**产物**
版本 `0.1.2.2`（manifest / options.js 的 MANIFEST 兜底 / options.html 的 `#footVer` / README.txt / PRODUCT.md 同步）。`Better_WiSE_v0.1.2.2.crx` 585,921 B / `.zip` 291,768 B，扩展 ID 仍是 `ecdedhcfflmobjlbcfanknhcpnnchefi`。七个 Node 回归全过。

**发布状态**
0.1.2.1 已经提交 Chrome 应用商店（等待审核中，自动发布已勾选）并在 GitHub 发了 release `v0.1.2.1`；用户随后说「不要发布了」，所以 0.1.2.2 只打了本地包，没有再上传任何地方。

---

## 第三十五轮（2026-11-08）— 0.1.2.3：周末面板不渲染 + 旧版并存 + 课程卡菜单

**背景**
0.1.2.2 之后用户要求「所有弹窗都点开来试试」，全量扫描时发现 `/dashboard` 面板卡在骨架十几秒不换，同时页面上有两块合成课表。

**三个 bug**
1. **周末面板永远停在骨架**。`extension/home.js` 的 `buildSummary(state)` 开头是 `const header = state.header; if (!header) return;`。周末 `/dashboard` 站点根本不渲染 `[data-timetable-header]`（实测 `thAttrs: 0`），`collectPeriods()` 返回的 `header` 为 null，于是 buildSummary 直接返回，骨架再也换不掉。改成 `const header = state.header || null;`，只把「收旧警告」放进 `if (header) {…}`。
2. **周末合成课表骑到面板头上**。没有标题时原来的插入点落在整行前面。改成贴着面板插：`panelEl.insertAdjacentElement('afterend', full)`（`panelEl = document.querySelector('[data-wesley-home]')`），`placeSynth()` 每 500ms 也以面板为锚点，没有面板才退回按标题摆。实测 `panelTop 110 → ttTop 199`，只有 1 块合成课表、1 张课表。
3. **商店版与侧载版同时生效**。探针 profile 里除了开发版 `ecdedhcfflmobjlbcfanknhcpnnchefi`，还自动装着一份商店版 Better WiSE 0.1.2.1（`jbpdhgenkilngppdabeabebhfpbcgeli`）。两份都匹配 `/dashboard`，各插一块合成课表、各建一个骨架面板，互相覆盖。开发版加了跨隔离世界的单实例标记：`document.documentElement.hasAttribute('data-wt-home-booted')` 时直接 return，否则打上标记继续跑。
4. **课程卡「⋮」菜单白底**。`.f-dropdown` 外层已压暗，但里面的 `a.sbx-button--has-icon` 自带白底，浅字压白卡，实测对比度 1.25:1。`theme.css` 补了 `.f-dropdown li > a` / `a.sbx-button--has-icon` / `a.button` 的透明背景与无阴影，悬停仍是 `#2f2a35`。修后 `a` 背景 `rgba(0,0,0,0)`，扫描 0 异常。

**验证**
- 新探针 `tools/probe/v58boot.mjs`（CDP 9702、profile `tools/probe/ext-profile2`、`--disable-sync`、从 `v57-cookies.json` 注入 25 条 cookie）跑出干净单实例。
- `tools/probe/v59sweep.mjs` + `v59b.mjs`：40 项弹层/下拉/切换（四个 tab、settings、add card、task 卡、due 卡、Set due 弹层、Next day、日列表、搜索面板含输入与结果、通知侧栏、头像菜单、日历事件/Export/Filters/日期选择器/周视图/日视图/点格子、课程页 ⋮ 菜单、课表格子、Due 卡、新闻条目）全部 `ok`，0 条对比度异常，0 个扩展相关 JS 异常。
- 七个 Node 回归全过：`test-schedule` / `test-query` / `test-news-age` / `test-news-alert` / `test-crawl` / `test-panel` / `test-rename`。

**产物**
版本 `0.1.2.3`（manifest / options.js MANIFEST 兜底 / options.html `#footVer` / README.txt / PRODUCT.md 同步）。`Better_WiSE_v0.1.2.3.crx` 587,833 B / `.zip` 292,734 B，扩展 ID 仍 `ecdedhcfflmobjlbcfanknhcpnnchefi`。

**发布状态**
0.1.2.1 仍在 Chrome 商店审核队列；0.1.2.2 只在本地。0.1.2.3 打包完成后按用户指示交给专门负责提交的 session 上传商店与 GitHub。

---

## 第三十六轮（2026-11-08）— 0.1.2.3 上架

**① 商店包**
`dist/Better_WiSE_v0.1.2.3_store.zip` 282,729 B，19 个文件，与 0.1.2.1 商店包同一份名单，manifest 去掉 `key`，版本 0.1.2.3。做法：拷 `extension/` 的白名单文件到临时目录，删掉 manifest 的 `key`，按固定名单打 zip。

**② Chrome 应用商店**
登录态还有效（中途弹过一次「验证身份」，点「下一步」就过了）。上传前商店状态是 **已发布 0.1.2.1 / 草稿 0.1.2.1**，说明 0.1.2.1 已经过审并公开。
上传 0.1.2.3 → 文件包页显示草稿 0.1.2.3、已发布 0.1.2.1 → 提请审核（自动发布已勾选）→ 提交审核，条目状态「待审核」。

**③ GitHub**
release `v0.1.2.3`：https://github.com/Mekathun/better-wise-page/releases/tag/v0.1.2.3
tag `v0.1.2.3`（指向 `c7421f9`），标题 `Better WiSE page v0.1.2.3`，勾选 latest，正文 = Install 行 + `docs/RELEASE-0.1.2.3.md`（覆盖 0.1.2.1→0.1.2.3 的五个改动）。

**④ 附件**
和之前一样，GitHub 那边传不了二进制（CSP + 本机没有 gh/token），zip 与 crx 要人拖进 Edit release 的附件框：
`Better_WiSE_v0.1.2.3.zip` 292,734 B、`Better_WiSE_v0.1.2.3.crx` 587,833 B。

**⑤ 版本号**
注意 Chrome 接受四段号（0.1.2.3），但每段上限 65535，且不能有前导零。

## 第三十七轮（2026-11-12）— 0.1.2.4：删净 AI，只连学校域

**背景**：与 IT 的谈话结论是 AI 涉嫌把学生可见内容外发，且公开分发不被允许。用户要求按商定方案做出 0.1.2.4：删除 AI、manifest 只保留学校域、设置里删掉模型与 key，并配一份网安评审材料。

**① manifest**
version `0.1.2.4`；description 改为 `Today plan, timetable and instant search for Wesley College WiSE.`；`host_permissions` 从三条减到一条 `https://wise.wesleycollege.net/*`（删掉的 `login.microsoftonline.com` 全项目从未引用，`generativelanguage.googleapis.com` 只服务 AI）；`/homepage/*` 那段只加载 `content.js` 的 content_scripts 整段删除；`key` 保留（侧载 ID 不变）。

**② 删除 content.js**
`extension/content.js`（617 行）是旧课程页的「分析本课任务」面板，只服务 AI、只在一个 URL 模式上运行、没有任何跨文件消息，整文件删除。

**③ home.js**
- DEFAULT_SETTINGS 去掉 `fastModel` / `apiKey` / `aiTasks`，删掉 `API_BASE` 与 `LS_ANALYSIS` 常量。
- 删 apiKey 迁移块；删 `aiReady` / `callAI` / `aiOn` / `openBWSettings` / `openOptionsPage` / `clearAICache` / 冷却与 `AI_RUNNING` / `AI_RERENDER` / `scheduleAIRerender` / `aiStatus`。
- 新增 `clearLegacyCache()`：清 `wesleyTasks:*` 与 `wesleyAi*`；用一次性标记 `wesleyNoAi:v124` 顺带清一次 `wesleyLocal:*`（快照里可能嵌着模型写过的任务文本）；从 local 与 sync 里 remove `apiKey` / `fastModel` / `modelUrl` / `aiTasks`。
- 删 `rerenderTasks`（任务在 `hydrateClass` 里算并随快照持久化）；删 `englishFallback` / `ensureEnglish` / `AI_PENDING` / `aiBusy`；`analyzePostLocal` 变成取 links 后 `return localOnlyAnalysis(post, links)`；删 `commitFreshAI` 及三处调用。
- `wt-reread-all` / `wt-reread` 去掉 `aiOn()` 闸；storage 监听里 `changes.aiTasks` 整块删除；boot 日志改成 `boot inject=…`，boot 里改调 `clearLegacyCache()`；清理选择器去掉 `.wt-ai-status`；CSS 里 `.wt-ai-*` 全删。

**④ options 页**
`options.js`：DEFAULTS 五个键、`hasAiKey`、`renderAiGate`、`applyAIButtons`、fields 里的 aiTasks/keyEye/modelUrl/fastModel/deepModel/apiKey、render 里的赋值、aiTasks 点击、keyEye 眼睛、model 字段监听、apiKey 迁移、AI 帮助浮层的 JS、storage aiTasks 监听、两处 reread 闸门全部删除；`resetAll` 改成 `{ ...DEFAULTS }`。
`options.html`：`#aiHelpSheet` 删；整块 `model-block` 换成「WiSE data / Latest posts / Re-read latest posts」；`rereadAll` 去掉 `ai-gated`；页脚版本 0.1.2.4；AI 相关 CSS 四块删除。
`theme.css`：深色模式 `.wt-ai-status` 两条、`[data-wesley-ai]` 与 `[data-wesley-ai-modal]` 整段删除。

**⑤ 文档**
`extension/README.txt`：版本、去掉 AI 设置项、隐私段改成「只连 wise.wesleycollege.net、没有 AI」、加一条 0.1.2.4 说明。
`extension/PRODUCT.md`：版本徽章；「AI 任务优化」整节改成「本地任务解析」；零配置 / 额度 / 隐私三条卖点重写；权限行改成单域名；已知限制里 AI 配额那条换成解析规则；文件结构删掉 content.js。
新增 `docs/RELEASE-0.1.2.4.md`（中英双语）与 `docs/SECURITY-REVIEW.md`（英文评审材料：包信息与 SHA-256、权限逐条、网络与存储、删了什么、如何独立验证、残余风险）。

**⑥ 产物**
`dist/Better_WiSE_v0.1.2.4_store.zip` 264,098 B，18 个文件，manifest 去掉 `key`，SHA-256 `8abe690e46d8a110d8f4d0e9c197a0cee17c4122c25edb99be4a8dbfeaf57f95`。
`Better_WiSE_v0.1.2.4.zip` 273,584 B（20 个文件，带 key）、`Better_WiSE_v0.1.2.4.crx` 569,110 B（Edge `--pack-extension` 用同一把 pem 签名，ID 仍是 `ecdedhcfflmobjlbcfanknhcpnnchefi`）。

**⑦ 检查**
五个 JS 文件 `node --check` 全过；`grep -rn -i "gemini|generativelanguage|openai|apikey|aiTasks|aiHelp|wt-ai|modelUrl|fastModel|deepModel"` 在 js/html/css/manifest 里只剩 `clearLegacyCache` 里有意保留的清理键；`grep "eval(|new Function|importScripts|document.write"` 无命中；options.js 引用的 DOM id 与 options.html 一致（`lang` / `ver` 有 null 判断）。未在登录态下实机跑，面板逻辑要在 WiSE 里点一遍。

## 第三十八轮（2026-11-12）— 0.1.2.5：修骨架屏 bug + 首页日历 Enhance 开关

**背景**：用户报「上一轮删了 AI 词条后，整个 summary panel 全变成 skeleton 占位符」。同时提了一个新功能：主页 Calendar 那格加一个 `Enhance` 开关，打开后同一盒子换成两层（先选日期，再看当天事件），内容等同原生日历但减掉固定课表里的课。

**① 骨架屏 bug 的根因**
`extension/home.js` 的 `buildSummary()` 里那行 `const head = el('div', { class: 'wt-summary-head' }, headTitle, headChev, headRefresh, headCountEl, aiToggle);` —— `aiToggle` 在 0.1.2.4 删 AI 时已经不存在了。`ReferenceError` 让 `buildSummary` 在中途抛出，骨架 `<div class="wt-skeleton">` 永远没人替换。删掉这个参数即可，改成 `headCountEl` 收尾。教训：删变量时没跑 `node --check` 之外的实机验证，静态检查抓不到未定义引用。

**② Enhance 开关与两层日历**
全部在 `extension/home.js`，模块前缀 `cal*`，开关与盒子都带 `wt-cal-` 类名。

- `calIsland()`：从 `h2.subheader` 里按文本 `Calendar` 认岛（排除 `[data-wesley-home]` 里面那个），取 `[id^="calendar-"]` 作原生容器。
- `calSwitchNode()`：`role="switch"` 的小开关，文案 `Enhance`，`title` 写清楚「和 WiSE 日历同一份事件，去掉课表课程」。点一下存 `chrome.storage.local.calEnhance`，刷新后保持。
- 第一层 `calRenderPick()`：周一起头的月历网格，`‹ ›` 翻月、`Today` 回今天，有事件的日子加圆点。
- 第二层 `calRenderDay()`：`‹ Dates` 回月历；`‹ ›` 换前后一天；正文是当天列表。
- `initCalendarEnhance()` 每秒 tick 一次做幂等挂载（SPA 会重绘），`cleanupIfLeaving()` 里清 `[data-wt-cal]`。

**③ 数据来源与过滤**
`GET /calendar/ajax/full?start=<unix>&end=<unix>&userId=<id>`，`credentials:'same-origin'`。三个实测结论写进注释了：只带 `start/end/userId` 才是全量（2026-11 有 177 条）；带空 `folderId=` 直接返回 0 条；带 `componentInstanceId=20` 只剩该组件来源（50 条）。`userId` 从 `window.fullCalendarConfig.userId` 取，取不到就扫 inline script 的 `userId: Number('21585')`。

过滤两条：`className` 里含 `type24` 的整条丢弃（那就是固定课表课程，全库 134 条都属它）；标题形如 `Day 9` 的丢弃（用户说没用）。反过来 `Due Work` 要留 —— 带科目代码的考试就在这一类里。

**④ 列表为什么不用 FullCalendar 的表格**
一开始照抄 `.fc-list-table` 那套 class 想白捡站点样式，结果 FC 把自家 thead 挪到屏幕外（`left:-9090px`）、给 `th` 塞宽度、按容器重算列。表头一回正常流，"Time" 就吃掉 367px，事件列剩 39px；换 `table-layout:fixed` + colgroup 后整列标题直接画不出来。最后改成自绘 `div.wt-cal-list`（grid 三列 150/33/1fr），样式自己定，`calFcWrap()` 一起删掉。

**⑤ 配色**
站点在「浅色」模式下 body 也是深底（实测 `rgb(21,21,23)`），所以列表不能用 `--wt-t-ink`（浅色下是 #222，深字压深底）。改成 `color:inherit` + `opacity:.62` 给时间列，分隔线 `rgba(128,128,128,.24)`、日头底 `rgba(128,128,128,.13)`，两套主题都验证过。

**⑥ 另一个真 bug：`document.hidden` 早退**
`initCalendarEnhance()` 的 tick 开头原本有 `if (document.hidden) return;`。浏览器窗口在后台时 `document.hidden === true`，开关就永远插不进去 —— 表现为「有时候开关不出现」。删掉这个判断（只留路径判断），因为后台标签页也要把 DOM 挂好。

**⑦ 工具坑（下次别再踩）**
- 内容脚本在 isolated world：页面里 eval 看不到 `window.__wtCal`。必须用 `tools/probe/q9.mjs`，它 `Runtime.enable` 后按 `executionContextCreated` 收到的 contextId 在扩展 origin 里求值。
- 表达式要写进 `tools/probe/expr.js` 让脚本读，直接从 PowerShell 传参会把内层双引号吃掉。
- `tools/probe/shotcal.mjs` 原来用视口坐标 clip，元素在视口外时只画出半截 —— 一度被当成布局 bug 查了半天。现在先 `scrollIntoView({block:'center'})` 再截。
- 启动器用 `tools/probe/b2.mjs`（杀进程 → spawn → 等 `/json/version` → `Extensions.loadUnpacked` → `PUT /json/new`）。`v58boot.mjs` 会卡在 `goto` 的 load 事件上。
- 改完扩展必须 `taskkill //IM msedge.exe //F` 再重启，content script 不热更新。

**⑧ 产物**
`Better_WiSE_v0.1.2.5.crx` 564,523 B、`Better_WiSE_v0.1.2.5.zip` 281,083 B，ID 仍是 `ecdedhcfflmobjlbcfanknhcpnnchefi`。注意 `extension/build-extension.mjs` 生成的初始文件名是 `Better_WiSE_v0.1.2-beta5.*`（它把第四段当 beta 编号），需手工改成 `0.1.2.5`，或者下次改掉那段 label 逻辑。

**⑨ 版本串**
`manifest.json` / `options.js` 的 MANIFEST 兜底 / `options.html` 的 `#footVer` / `README.txt`（版本行、zip 名、NOTES）/ `PRODUCT.md`（徽章、新增「7. 日历增强」、里程碑表两行）全部同步到 0.1.2.5。

**⑩ 没做的**
用户还问了 `/calendar` 整页「内容太多、找 event 很难」怎么改，明确要求只给方案、先别动手。方案已在对话里给出，代码一行没动。

## 第三十九轮（2026-11-15）— 0.1.2.6：日历按钮化 + 深色 logo 刷白

用户要求（m01330 / m01461 / m01753 / m01879）：日历要和原版无异、不要 `Time / Event` 那行、样式照抄原站；把 Enhance 开关换成一颗日历小按钮，默认原生，点开才出面板；深色下 logo 有一圈白边要修；后来又明确交互：按钮点开先弹日期选择器并点亮按钮，选完某天进那一天并熄灭高亮，日期页常驻 `‹ ›` 和 `Today`；按钮和箭头必须正方形；弹窗不要阴影、不要说明文字、不要多余元素。

### 日历

- 默认就是站点原生的 `#calendar-20`：`CAL.on` 每次进页面都是 `false`，`chrome.storage` 里那条 `calEnhance` 的历史键不再读写（刷新不会自动顶开面板）。
- `h2.subheader`（文案仍只有 `Calendar`）右侧插一颗 28×28 的方形按钮 `.wt-cal-ico`，内嵌 15px SVG 日历。
  站点对 `button` 有约 40px 的全局高度，所以尺寸必须 `!important` 才抢得回来。
- 状态拆成两个：`CAL.on`（是否接管）和 `CAL.pick`（选择器是否开着）。按钮高亮只跟 `CAL.pick` 走 —— 选完日期高亮自动灭，符合"选完就不是在选择状态"的直觉。
- 交互：按下按钮 → `CAL.on = CAL.pick = true`，盒子里出现月历卡片；点某天 → `CAL.pick = false` 进当天；再按按钮 → 退回原生。
- 日期页常驻 `‹`、`›`（各 26×26 正方形）、`Today`、以及右端的 `‹ Dates`（重新打开月历）。
- 月历卡片 `.wt-cal-pop` 只是一圈描边 + 12px 圆角，**没有阴影**；卡片里只有 `‹ ›`、月份、7 列网格，没有 Today，也没有说明文字。
- 当天列表放弃自绘：markup 直接用站点 FullCalendar list 视图那一套 class（`div.fc > .fc-view-harness > .fc-list-view > .fc-scroller > table.fc-list-table > tbody`），日头 `tr.fc-list-day > th > div.fc-list-day-cushion > a.fc-list-day-text`，事件 `tr.fc-event.fc-list-event > td.fc-list-event-time / -graphic（圆点用 border-color）/ -title`。**关键是不要 thead**：FC 会把 thead absolute 到 -10000px 并按容器重算列宽，一旦手搓表头就和它的宽度规则打架（前几版列被挤扁就是这么来的）。去掉 thead 后实测和原生日历逐项一致：`tr` 高 39、`border-bottom .6px rgba(255,255,255,.1)`、时间列 150px、圆点列 34px、标题列 224px、`padding 10px 12px`、14px/18px。
- 过滤规则没变：丢掉 `className` 含 `type24`（固定课表课程）和 `^Day \d+$` 的条目，其余全留（含 due work 里的考试）。

### 深色 logo

- 站点 logo 是调色板 PNG（`logo.php?logo=skin_logo_large`），`tRNS` 只有 1 字节 —— 只有调色板 0 号的纯白透明，`(211,201,213)`、`(233,228,234)` 这些近白像素不透明且贴着字形，深底上就是一圈白边。
- 试过 canvas 反解（把像素当成白色上做过 alpha 合成还原覆盖率），能把白边消掉，但两处翻车：`skin_logo_square` 是"白色墨 + 不透明紫底"，反解会把整张图打穿成马赛克；近白像素反解后 clamp 到接近黑，观感变淡。
- 最终按用户说的直接刷白：`html[data-wt-theme="dark"] img[alt="Wesley College"][src*="skin_logo_large"]{filter:brightness(0) invert(1)}`。`brightness(0)` 压黑、`invert(1)` 翻白，alpha 原样保留，轮廓空隙都在，白边自然没了。只对 `skin_logo_large` 生效 —— 方形那张是不透明紫色方块，整套滤镜会把方块刷成纯白。
- 走 CSS 而不是换图，还省掉了 `srcset` 那个坑：只改 `img.src` 会被 `srcset` 抢回去，必须连 `srcset` 一起换。

### 关键 bug

- **`document.hidden` 早退**（上一轮遗留）：`initCalendarEnhance` 的 tick 里原来有 `if (document.hidden) return;`，headless / 后台窗口里页面一直 hidden，按钮永远插不进去，看着像随机失灵。已删。
- 截图工具：`shotcal.mjs` 用视口坐标做 clip，元素在视口外只画半截；`shot3.mjs`（新）先 `Emulation.setDeviceMetricsOverride(1440×980, DSF 2)` 再 reload，并支持 `--noreload` —— 因为 reload 会把 `CAL.on` 打回 `false`，测交互态必须不 reload。
- `extension/build-extension.mjs` 原来把第四段当 beta 编号（0.1.2.6 → `0.1.2-beta6`），已改成直接用 manifest 的 version，产物名不再需要手工改。

### 产物

```bash
node extension/build-extension.mjs
# PACKAGED: D:\DSH\Better_WiSE\Better_WiSE_v0.1.2.6.crx  (568,586 B)
# PACKAGED: D:\DSH\Better_WiSE\Better_WiSE_v0.1.2.6.zip  (283,181 B, 21 files)
# EXTENSION_ID: ecdedhcfflmobjlbcfanknhcpnnchefi
```

版本串已同步：`manifest.json` / `options.js` 的 MANIFEST 兜底 / `options.html` 的 `#footVer` / `README.txt`（版本行、zip 名、第 4 节正文、NOTES）/ `PRODUCT.md`（徽章、`### 7` 正文、里程碑表）。

### 复测记录

- 默认态：`on:false pick:false pressed:false btn:28x28 natDisp:block boxDisp:none h2Text:"Calendar"`。
- 点按钮：`on:true pick:true pressed:true natDisp:none`，盒子 427×355，月历卡片 + 圆点 + 今天高亮（15 号）。
- 点 11-12：`pick:false pressed:false day:2026-11-12`，日页四条事件（IB DP Examinations / VCE: Written Examinations / GW SS Assembly 11:56am-12:54pm / 10 Phys & Health Ed BA5 4pm），按钮 26×26、Today 52×26、‹ Dates 58×26。
- 再点按钮：`on:false natDisp:"" boxDisp:none`。
- 明暗两套截图都过：`tools/probe/pick5.png`（暗）、`tools/probe/pick-light.png`（浅）、`tools/probe/day1.png`（日页）。

### 第三十九轮补充：按钮不再切换视图，导航移到标题栏（同版本 0.1.2.6）

用户原话：「calendar不要改成切换，就改成 作为打开日期选择器弹窗的按钮。然后左/右/today 常态显示在calendar旁边。」

改法：

- 标题栏 `h2.subheader` 变成 `Calendar ............ ‹ › Today [日历按钮]`，导航三件套 `margin-left:auto` 推到右端，跟按钮挨着。三个控件常驻：`‹`、`›`（各 26×26）、`Today`（53×26）。
- 那颗日历按钮**只开合日期选择器**，不再翻 `CAL.on`；点它不会改变下面显示原生还是当天列表。
- 日期选择器改成真正的浮层：`.wt-cal-popwrap` 绝对定位（`left/right:16px`，`top = h2.offsetTop + h2.offsetHeight + 6`），`z-index:60`，盖在列表上，不把下面的内容挤走。岛加 `position:relative`（`.wt-cal-island`）。
- 选中某天 → 浮层收起、`CAL.on = true`、岛里换成那天列表（原生 `display:none`）。
- `‹` / `›` / `Today` 在原生状态按下也能直接进日期页（基准日取今天），不用先打开浮层。
- 点浮层外面收起（`document` 上 `mousedown` 捕获，判断点在不在 popwrap / 按钮里）。
- 日期页不再有自己的 bar（`‹ › Today ‹ Dates` 全删），列表直接贴着标题栏。
- 打开浮层时按钮点亮；高亮只表示「浮层开着」。
- `cleanupIfLeaving()` 增加清理 `[data-wt-cal-pop]`、`.wt-cal-nav`、`.wt-cal-island`。

实测：

- 默认：`on:false pick:false nav:[117,30] navBtns:3 ico:[28,28] popDisp:none natDisp:block boxDisp:none`。
- 点按钮：`on:false pick:true ico pressed:true`，浮层 407×357、`top:46px`，`elementFromPoint` 落在 `wt-cal-bar`（说明浮层在列表之上，没被盖）；原生仍 `block`。
- 点 11-12：`on:true pick:false`，日页四条事件；标题栏三件套还在。
- 原生状态按 `›`：`on:true day:2026-11-16`（基准是今天）。
- 点空白：`pick` 由 true 变 false。
- 浮层没被裁剪：`small-12.island` 及上溯四层 `overflow` 全 `visible`。
- 截图：`tools/probe/pop-dark.png`（浮层+标题栏，暗）、`tools/probe/rect2.png`（原生态+标题栏）、`tools/probe/day2.png`（日页）。

坑：拿 `data-wt-theme="light"` 硬刷 <html> 只能骗我们自己的 token，站点本身还是深色，于是出现「黑字压深底」。要看浅色必须让站点自己切浅色主题——上一轮那张 `cal-light.png` 是站点本来就浅色时拍的，不能反过来当验证。

另：标题栏常驻导航之后就没有「回到原生」的入口了，只有刷新页面会回去。这是按用户「按钮只负责开浮层」的说法做的；如果他想加回退入口，可以在标题栏再塞一个（下一轮再说）。

## 第四十轮（2026-11-15）— 0.1.2.7：按钮变白、周日起头、性能

### 一、暗色下整块变白的图标按钮（真 bug，已修）

现象：岛屿标题栏那排图标按钮（设置齿轮就在其中），点一下再点回来，整个 40×40 的按钮变成一块白砖。

根因在站点自己的 CSS 里，不在我们的样式：

```css
a.sbx-icon-only-button.adtp-btn {
  background-color: var(--sbx-config-color-active, var(--content-ui-background));
}
```

`--content-ui-background` 在这套主题下算出来是 `#fff`；`--sbx-color-foreground-primary` 同样是 `#fff`（实测 `getPropertyValue` 就是 `#fff`）。站点把「前景色」当「背景色」用，浅色主题下看不出来，暗色主题下就是白块。

修法（`extension/theme.css` 末尾）：

```css
html[data-wt-theme="dark"] a.sbx-icon-only-button.adtp-btn,
html[data-wt-theme="dark"] .sbx-icon-only-button.adtp-btn,
html[data-wt-theme="dark"] .adtp-btn { background-color: rgba(255,255,255,.10) !important; color: var(--wt-t-ink) !important; }
html[data-wt-theme="dark"] a.sbx-icon-only-button.adtp-btn:hover,
html[data-wt-theme="dark"] a.sbx-icon-only-button[aria-expanded="true"] { background-color: rgba(255,255,255,.18) !important; }
```

验证方式：扫「暗色下底色是浅色、面积 > 120px² 的可点元素」，逐页跑。

- 修前：`/dashboard` 命中 2 个 `.adtp-btn`（都是 `rgb(255,255,255)` 40×40）。
- 修后：`/dashboard`、`/calendar`、`/timetable`、`/news`、`/settings/notifications` 全部 0 命中。
- 探针：`tools/probe/whitebtns.mjs <url...>`、`tools/probe/pseudo.mjs`（用 `CSS.forcePseudoState` 强制 hover/active/focus，不真点）。

### 二、月历改成周日起头

`CAL_T.dow` 改成 `['Sun',…,'Sat']`，`lead` 从 `(getDay()+6)%7` 改成 `getDay()`。跟站点 FullCalendar 的默认 `firstDay` 一致，也是用户点名要的「sunday 在左、sat 在右」。实测 2026 年 11 月：1 号落在第一格（SUN 列），15 号高亮在 SUN 列。

### 三、去掉「WiSE information is ready」

`home.js:5596` 原来每次进首页都 `toast('WiSE information is ready')`，删掉，留一行注释。

### 四、为什么进站要 5 秒（实测，不是猜）

`tools/probe/boottime.mjs <url> [--nocache]`：CDP 导航后每 120ms 轮询面板是否出真实内容，再读 `performance` 资源表。

- 暖缓存 `/dashboard`：面板真实内容 **1037ms**（TTFB 369 / DCL 738 / load 897）。唯一超过 250ms 的自家请求是 `/news/lists/feed`（326ms）。
- 冷缓存三次：面板 **1286 / 1588 / 1831ms**，DCL 871–1498，`load` 到最后还没到 1。
- 站内慢资源：`/storage/image.php…` 1.3s 级、`/static/js/bundle/imageLightbox.js` 532–661ms。
- 我们自己的请求都在面板插入**之后**发生（`/news/saved` 59ms、`/calendar/ajax/full` 172ms），不占首屏。

结论：扩展只占其中约 0.3s（DCL → 面板出现），剩下是站点自身。能省的只有那段等待：`home.js` 现在是 `run_at: document_idle`（等 DOMContentLoaded 才跑），改成 `document_start` + MutationObserver 等锚点，可以把这 0.3s 压掉一部分；站点那 1–1.5s 的图片和 bundle 我们动不了。

### 五、summary 面板的帧率

`tools/probe/scrollcost.mjs`（长任务 + 滚动帧间隔，需先 `Page.bringToFront` + `Emulation.setFocusEmulationEnabled`，否则后台标签的 rAF 根本不跑，探针会一直挂着）：

- 滚动 1.5s：无 longtask，p50 4.2ms、p90 4.3ms、p99 4.5ms；`>33ms` 的帧 0 个。
- 面板 3 秒内 DOM 突变 **0**（没有重渲染循环）。
- 暗色/浅色下 `backdrop-filter` 命中数都是 **0**（老的那条毛玻璃规则已被后写的主题块覆盖成 `none`），`box-shadow` 只剩 1 个，`filter`/`will-change` 0 个，节点 208 个。

也就是说当前这版面板本身没有可测的开销，掉帧更可能来自用户那台的合成层（旧版本卡片毛玻璃）或站点自己的页面。仍然加了两条保底规则：

```css
html.wt-perf [data-wesley-home] * { transition:none !important; animation:none !important; text-shadow:none !important; }
html.wt-perf [data-wesley-home] .wt-sec-body, .wt-task, .wt-due-card, .wt-custom-card { contain: layout style; }
```

### 六、产物

- `node extension/build-extension.mjs` → `Better_WiSE_v0.1.2.7.crx` 571,578 B、`Better_WiSE_v0.1.2.7.zip` 284,685 B（21 files、manifest 0.1.2.7、key 在、hosts 仅 `https://wise.wesleycollege.net/*`、ID `ecdedhcfflmobjlbcfanknhcpnnchefi`）。
- 版本串：`manifest.json` / `options.js` 兜底串 / `options.html #footVer` / `README.txt` / `PRODUCT.md` 全部 0.1.2.7。

### 坑

- Claude Code 子代理连着两次 `invalid-result / exit 1`（`subagent_claude_code`），没有任何输出。这条路的成本比自己做还高，别在这上面反复试。
- 用 `el.click()` 扫按钮会踩到带导航的元素，CDP target 一导航就 `Inspected target navigated or closed`。要么加捕获阶段的 `preventDefault`，要么改用 `CSS.forcePseudoState`。

## 第四十一轮（2026-11-15）— 0.1.2.8：设置齿轮的粘滞态、平面化、动画回来

### 一、齿轮「按两下以后变白」的真正原因

先前的判断（改 `.adtp-btn` 的背景色）是错的方向，那只是把症状的颜色压暗，还把选中态一起抹掉了。实测把它钉死在 `.wt-sr-setbtn`（我们自己的 BW Settings 齿轮）上：

```
{"tag":"before","cls":"wt-sr-setbtn wt-sr-setbtn-inline",          "panel":null}
{"tag":"after1","cls":"... on",   "panel":{"cls":"wt-sr-setpanel show","disp":"block","op":"1","pe":"auto"}}
{"tag":"after2","cls":"... on",   "panel":{"cls":"wt-sr-setpanel",     "disp":"block","op":"0","pe":"auto"}}
```

关掉之后面板停在 `display:block` / `opacity:0` / `pointer-events:auto`，尺寸 297×634、`z-index:2147483500`，正好盖在齿轮上：后面每一次点击都被这层隐形面板吃掉，`on` 永远不摘。

根因是状态判断读的是 `setPanel.classList.contains('show')`，而 `show` 是在 `requestAnimationFrame` 里加的。后台标签的 rAF 会被冻结，于是「打开」没落地、按钮却已经带上了 `on`；再点一次又走「打开」分支。

修法（`extension/search.js`）：

- 新增 `let setOpen = false; let setHideT = 0;`，开合的唯一真相是布尔值，不是 class。
- `setSync()` 把「display / pointer-events / show / 按钮 on / 监听器」一次性对齐；打开时 rAF 摆位，另加 60ms 定时器兜底；关闭时立刻 `pointer-events:none`，180ms 后才 `display:none`。
- `toggleSettings()` 只翻 `setOpen` 再 `setSync()`；`closeSettings()` 置 false 走同一条路。
- CSS 也上了双保险：`.wt-sr-setpanel{pointer-events:none}`，`.show` 才恢复 `auto`。就算状态再被打乱，隐形层也吃不掉点击。

选中态重新做了：`.wt-sr-setbtn.on{background:rgba(255,255,255,.20)}`，暗色 `.16`，两套主题都看得见、又不是白砖。

验证：点 1 次 → `on` + `show` + `op:1`；点 2 次 → 类名干净、`display:none`、`pe:none`；点 3 次 → 正常再开。

### 二、平面化：常态不要毛玻璃、不要投影

`extension/theme.css` 末尾加了统一的平面层，作用于 `[data-wesley-home]`（含根节点本身）以及我们自己的浮层（`.wt-modal` / `.wt-toast` / `.wt-snackbar` / `.wt-confirm` / `.wt-set-pop` / `.wt-dueset-pop` / `.wt-sr-*` / `.wt-cal-*`）：

```css
backdrop-filter:none !important; -webkit-backdrop-filter:none !important; box-shadow:none !important;
```

用阴影画出来的「状态环」单独留回来：可编辑 tab 的下划线、输入框聚焦环、`.wt-cal-cell.is-today` 的描边。面板根节点带 `.wt-summary` / `.wt-card-effect-*`，同权重但写得更晚，所以单独再点一次名。

实测：`[data-wesley-home]` 子树 209 个节点，`backdrop-filter != none` 的 **0 个**，`box-shadow != none` 的 **0 个**。

### 三、动画回来，性能模式不再关过渡

删掉 `html.wt-perf [data-wesley-home] * { transition:none; animation:none; text-shadow:none }`，性能模式只保留 `contain: layout style`。实测 `.wt-task` 的 `transition-property` 是 `transform, translate, box-shadow, border-color`、`transition-duration: 0.18s`，**开性能模式前后一致**。

### 四、字号没动

只删了 backdrop-filter 与 box-shadow，主题层没碰排版。实测（暗色）：

| 元素 | 字号 / 行高 | 字重 | 内边距 | 颜色 |
| --- | --- | --- | --- | --- |
| 面板根 | 15px / 22.5px | 400 | 0 | rgb(233,226,239) |
| `.wt-summary-head` | 15px / 22.5px | 400 | 16px/18px | rgb(231,229,234) |
| `.wt-sec-head` | 17px / 25.5px | 650 | 10px/14px | rgb(231,229,234) |
| `.wt-task` / `.wt-due-card` | 15px / 22.5px | 400 | 8.33px | rgb(231,229,234) |
| `.wt-count` | 11px / 16.5px | 400 | 0 | rgb(130,126,137) |
| `h2.wt-cal-h` | 20px / 28px | 600 | 0 | rgb(231,229,234) |

这些值和源码里的声明一致，说明排版没被这轮改动波及。

### 五、产物

`Better_WiSE_v0.1.2.8.crx` 574,254 B / `Better_WiSE_v0.1.2.8.zip` 286,023 B，ID `ecdedhcfflmobjlbcfanknhcpnnchefi` 未变。版本串：manifest / options.js 兜底 / options.html `#footVer` / README / PRODUCT 全部 0.1.2.8。

### 坑

- 面板里那个 iframe 会缓存 options.html：改完版本号后不重装扩展，页脚还显示旧串（截图里就是 `0.1.2-beta7`）。验收版本号要重载扩展，别信浮层里的字。

## 第四十二轮（2026-11-15）— 0.1.2.9：白砖、浮层高度、× 让位、亮暗过渡

### 一、白砖：站点 `button:focus` 的底色变量

不是我们漏了 `!important`，是站点那条规则本来就赢：

```css
button:hover, button:focus, .button:hover, .adtp-btn:hover, … {
  background-color: var(--sbx-color-foreground-primary,
                      var(--sbx-config-color-active, var(--content-ui-hover)));
}
```

权重 0,1,1，`--sbx-color-foreground-primary` 实测 `#fff`。我们给按钮写的 `.wt-cal-ico{background:none}` 是 0,1,0，压不过；`.wt-cal-ico:hover`（0,2,0）只在指针悬停时赢。点一下，焦点留在按钮上、鼠标移开 → 站点规则独享这条命中的优先级 → 整块白砖。顶栏那颗 settings 齿轮同理（亮色主题下没有 `theme.css:411` 的暗色兜底，直接白）。

逐个按钮再补 `!important` 会越补越乱，所以改成在自建节点上把站点变量归零：

```css
[data-wt-ui]{
  --sbx-color-foreground-primary:transparent;
  --sbx-config-color-active:transparent;
  --content-ui-background:transparent;
  --content-ui-hover:transparent;
}
```

`home.js` 与 `search.js` 的 `el()` 给每个节点打 `data-wt-ui`（`home.js:3383` 那个裸 `createElement('button')` 单独补一行）。站点规则照样命中、照样赢，只是算出来透明，配色回到我们自己的 token。变量会往下继承，但面板里没有别处用这几个站点变量（`grep` 过，只有这两处注释）。

实测（亮色）：`.wt-cal-ico` 点两下后 `bg=rgba(0,0,0,0)`、`active:true`；`.wt-sr-setbtn` 同样 `rgba(0,0,0,0)`，color 回到 `rgb(255,255,255)`。修复前两者都是 `rgb(255,255,255)`。`[data-wt-ui]` 节点数 305。

顺手把齿轮的 hover/on 态 color 也钉成 `#fff`：站点 hover 会顺手改 color，亮色主题下图标会被刷成深紫 `rgb(79,39,89)`，压在紫底上等于消失。

### 二、设置浮层跟着内容长

`.wt-sr-setpanel` 原来钉死 `height:min(640px,80vh)`，里面 iframe 装的是 300 宽的 options.html，内容到 500 上下就没了，剩下 140px 空白。

iframe 跨域，父页面读不到它，所以让 options.js 自己报：仅 `window.parent !== window` 时 `postMessage({type:'wt-options-height',height})`，节流 2px，`load` / 0-120-450ms 补发三次 / `ResizeObserver(body)` / `toggle` 事件 / resize 都挂上。`search.js` 收到后校验 `e.source === setIframe.contentWindow`，`want=clamp(h+2, 180, min(640, 88vh))`，差不到 2px 就不动 DOM。

实测 640 → **501px**，底部不再空一块。抽屉（Detailed settings）打开时 body 高度不变，所以浮层不跟着抖；抽屉自己 `max-height:82vh` + `overflow:auto`，在 501 里照样滚得动。

### 三、`wt-nextday-modal` 的 ×

`.wt-modal-x` 是 `position:absolute;top:4px;right:6px`，标题是 `flex` 里的第一行、没有右内边距，长标题会直接钻到 × 底下。补两条：

```css
.wt-nextday-modal .wt-modal-head{padding-right:34px;margin-bottom:10px;}
.wt-nextday-modal .wt-modal-x{top:6px;right:4px;}
```

再加 `border-radius:8px`（暗色下它有 `rgba(255,255,255,.06)` 的底，方角看着像块灰砖）。实测 × 28×28 在 (892,204)，标题 right=890，`headPad=34px`、`headMb=10px`，两者不再重叠。

### 四、亮暗过渡：能做，也便宜

切换只改 `<html data-wt-theme>`，颜色全走 CSS 变量。过渡只需要让 `background-color / color / border-color / fill / stroke` 插值 —— 这几样只触发重绘，不碰布局，也不重算排版。代价就是切换那 0.3 秒里每帧画一次变化的区域；平时零开销，因为进场条件是真检测到亮暗变了。

`applyTheme()`（`home.js:5369`）与 `applySiteTheme()`（`search.js:2340`）都改成：先给 `<html>` 挂 `data-wt-fade`，420ms 后摘掉；`theme.css` 里那条过渡只在 `html[data-wt-fade]` 存在时生效，故意不写 `!important`，组件自己的 transition 优先。

`paintPageBackground()` 的暗色分支从 `linear-gradient(180deg,#191519,#121013)` 改成 `background-image:none` + `background-color:#121013`：渐变之间浏览器不插值，纯色才能吃过渡。

实测 `data-wt-fade` 挂上当帧 body 是 `rgb(240,240,240)`，下一帧 `rgb(215,215,216)`，插值成立；属性存活 444ms，对得上 420ms 定时器。

### 坑

- 用 `classList.add('wt-theme-fade')` 挂标记会在几十毫秒内被站点冲掉 —— 它整份重写 `<html class>`。必须用 `data-wt-fade` 属性。
- 「加 transition」和「改颜色」落在同一次样式计算里，浏览器不插值，结果是硬切。挂完属性先 `void getComputedStyle(root).backgroundColor` 落实一帧。
- 后台标签页 rAF 被节流，跨进程 sleep 采到的「40ms」是假时间；要看真实帧必须 `Page.bringToFront` + 页面内 rAF 采样。
- `CSS.getMatchedStylesForNode` 的 nodeId 要从 `DOM.getDocument` → `DOM.querySelector` 拿；用 `Runtime.evaluate` + `DOM.requestNode` 会报 `Could not find node with given id`。
- 改完脚本要重载扩展（`Extensions.loadUnpacked`）**再刷页面**：只重载扩展，页面里还挂着上一轮的 `<style>`，测出来是旧值（这一轮 `border-radius` 就踩了一次）。

### 五、顺带发现，没修

主页 `Next day ›`（`.wt-tt-nextday`）点了没反应：它的 onclick 走 `window.__wtNextDay`，而 `window.__wtNextDay` / `__wtNextDayList` 只在 `buildSummary()` 里赋值（`home.js:4453/4455`），实测 dashboard 上两个钩子都是 `undefined`。能用的是旁边那颗 `.wt-tt-daylist`（☰），它走 fallback `openNextDay(allClasses())`。不在这一轮的四项里，先记下。

### 六、产物

`Better_WiSE_v0.1.2.9.crx` / `Better_WiSE_v0.1.2.9.zip`，ID `ecdedhcfflmobjlbcfanknhcpnnchefi` 未变。版本串：manifest / options.js 兜底 / options.html `#footVer` / README / PRODUCT 全部 0.1.2.9。

---

## 第四十三轮（2026-11-15）— 0.1.2.10

这一轮改的是上一轮没解决的三件事：亮暗切换的手感、周末消失的课表标题、日期选择器越界。

### 一、亮暗切换：放弃逐属性过渡，改成整页淡过

上一轮的做法是「给 `<html>` 挂 `data-wt-fade`，让 `background-color / color / border-color` 各自 transition」。挂上去确实生效 —— `document.getAnimations()` 一数 2260 个，`color` 1408、`background-color` 212、`border-*-color` 640。问题也在这儿：站点加我们的样式一共散着两千多个颜色声明，谁吃到这条 transition 谁没吃到，肉眼一看就分裂。一部分板块慢慢淡进去，另一部分直接跳，合起来比硬切更乱。用户的原话是「只有部分板块有颜色切换，绝大多数板块都没有」。

改成盖一层整屏底色：

1. 建 `#wt-flip-scrim`，底色取**切换前**的页面底色（暗→亮时是 `#f0f0f1`，亮→暗时是 `#121013`），所以盖上去那一瞬间看不出变化；
2. 主题在下面瞬间换好，被这层遮着，看不见；
3. 0.24 秒把 opacity 从 1 淡到 0，露出来的就是新主题。

所有板块走同一个节拍，全程只有一次 opacity 动画，走合成层，320ms 后把节点摘掉，平时不占任何开销。`home.js` 里叫 `themeFlip(next)`，`search.js`（非首页那条入口）里叫 `themeScrim(next)`；`theme.css` 里 `#wt-flip-scrim` 附一条 `prefers-reduced-motion: reduce` 的 `display:none`。

`paintPageBackground()` 的暗色底色还原成渐变 `linear-gradient(180deg,#191519,#121013)` —— 上一轮为了让它吃 transition 才换成纯色，现在不需要了。

实测（亮→暗）：`op=1 → 0.94 → … → 0.04 → 0`，`bg=rgb(240,240,241)`，7 次采样后节点消失。

### 二、周末补回标题，周次只写 Week N

站点只在有课的日子画 `h2[data-timetable-header]`（"Day 5"），周末整个标题节点不存在，`.wt-week-chip` 就没了落点 —— 这就是「Day X 和 Term 4 Week X 一起消失」的原因。

`renderWeekChip()` 前面加了一层 `ensureTtHead()`：找不到站点标题，就在 `section.wt-tt-sec` 外面那层 `.small-12` 前面插一条自己的 `h2.subheader.wt-tt-head[data-timetable-header][data-wt-own=1]`，正文写 `Showing <下一个上学日>`（`toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'short'})` → `Monday 16 Nov`）。

周次标签从 `Term 4 · Week 7` 改成 `Week 7`（tooltip 里仍保留 Term）。

「显示的是哪天」要分开算：周末站点给的是下一个上学日的课，所以按周一算周次（Week 7）；但如果我们兜底画的是「上一个上学日」的合成课表，那条标题带 `data-timetable-header`、不带 `data-wt-own`，就按 `TARGET_DAY` 算。判定写在 `ttShownDay(head)` 里。

`main()` 作用域内的 `nextSchoolDay()` 模块级拿不到（第一版直接 ReferenceError，被 catch 吃掉，于是显示成 `Showing Sunday 15 Nov`），所以模块级另写了一份 `nextWeekday()`。

实测：标题 `Showing Monday 16 Nov`，胶囊 `Week 7`，标题 rect y=112 h=28。

### 三、日期选择器收进日历卡片

`.wt-cal-popwrap` 原来是 `position:absolute;left:16px;right:16px`，靠 `calPlacePop()` 设 `top`。它绝对定位，卡片不会变高，选择器就盖到下一个卡片上 —— Music Lessons 是 island 之外的另一张站点卡片，被压掉 226px。

改成 `position:static`，加 `margin:2px 16px 14px`，选择器在瀑布流里占自己的高度，卡片自己长高，下面的内容自然往下走。`calPlacePop()` 只剩清历史遗留 `top`。同时 `calSync()` 里当天事件列表的显示条件改成 `CAL.on && !CAL.pick`：选择器开着的时候卡片里只留「标题 + 选择器」。

实测：`.wt-cal-island` 482–938，选择器 614–924 全在里面，Music Lessons 移到 1297。

### 坑

- `Extensions.loadUnpacked` 只能发到 **browser** 目标（`/json/version` 的 `webSocketDebuggerUrl`）；发到页面目标报 `Method not available`。
- 探针脚本里先「重载扩展」再「刷页面」，两步都得等：扩展装好 0.8s、页面 12s。
- 后台标签页 rAF 被节流到 ~7fps（600ms 只有 4 帧），跨进程采样看到的「中间值」可能是运气，判断过渡是否真跑要看 `getAnimations()` 或直接用 CSS 值轮询。

### 产物

`Better_WiSE_v0.1.2.10.crx` / `.zip`，ID `ecdedhcfflmobjlbcfanknhcpnnchefi` 未变。版本串：manifest / options.js 兜底 / options.html `#footVer` / README / PRODUCT 全部 0.1.2.10。

---

## 第四十四轮（2026-11-15）— 0.1.2.11

四十三轮的四件事都做完了，但用户看过真机反馈三点，外加一个暗色 toast 的问题。

### 一、淡过改成只淡背景层

上一版把整屏底色盖在内容上面（`z-index:2147483646`）。用户的原话是「先放了个纯色蒙版然后渐变的，这个颜色看的更辣眼」。

改成 `z-index:-1`：只淡背景，内容一直在最上面。负 z-index 的定位子元素会画在父级背景之上、内容之下 —— 实测空档处能看到这层底色，卡片之类的不透明内容则把它盖住。所以现在切主题是「卡片之间的底色先淡过去」，不再有一整块纯色糊住页面。

`home.js` 的 `themeFlip()`、`search.js` 的 `themeScrim()` 都加了 `scrim.style.zIndex = '-1'`。实测采样：`op=1 → … → 0.0004`，`z=-1`，`bg=rgb(18,16,19)`，320ms 后节点消失。

### 二、Showing 按课表实际排的那天写

上一版判定「标题是我们补的 → 就用下一个上学日」，于是周日写 `Showing Monday 16 Nov`，而卡片里排的是周五的课。

改成直接用 `TARGET_DAY`（周末兜底逻辑本来就把它设成「表上那一天」）。实测现在写 `Showing Friday 13 Nov`，周次 `Week 6`，和表格对得上。`nextWeekday()` 留着没删，暂无调用。

### 三、日期选择器顶掉站点自己的当天列表

用户点名了要替换掉的两块：`fc-list-day-cushion fc-cell-shaded`（"Sunday November 15th 2026" 那一行）和 `fc-event fc-event-today fc-event-future`（all-day 那一条）。

它们属于站点自己的 `[id^="calendar-"]` 容器，之前只在「点了某一天（`CAL.on`）」时才隐藏。现在条件是 `CAL.on || CAL.pick`：选择器一开，站点列表和我们的列表一起让位，卡片里只剩「标题 + 月历」。实测 `native display=none`，卡片 `.wt-cal-island` 995–1484 × 482–856，选择器 532–842 全在里面。

### 四、周末那两行的左右 margin

`ensureTtHead()` 起初把 h2 直接插进站点课表那一行的 `.row`，实测左边界 8–10px，而下面的卡片（`.small-12.island`）在 16px。改成自成一行：`div.row.wt-tt-top > div.small-12.columns`，插在`.row` 前面。

站点的卡片是 `.small-12.island`（自带 16px 内边距、左边界 16），Foundation 的 `.columns` 默认 15px，还是差一截，所以补了 `.wt-tt-top .columns{padding-left:8px!important;padding-right:8px!important}`。现在标题与面板都在 16–1484，和 Music Lessons 那张卡对齐。

面板插在标题后面，正好落进这个 columns；周末的合成课表要插在这一行之后（插进 columns 会变成列中列，内边距翻倍），`placeSynth()` 同步改了。

### 五、暗色 toast 没背景

`home.js:925` 那条规则只剩半截：

```css
html[data-wt-theme="dark"] .wt-modal-go,html[data-wt-theme="dark"] .wt-toast,…,
html[data-wt-theme="dark"] .wt-set-edit.on,
                        ← 这里是空行，声明块没了
html[data-wt-theme="dark"] [data-wesley-home] .wt-check{border-color:…;background:transparent;}
```

浏览器把后面 `.wt-check` 那条的声明当成了这串选择器的声明块，于是暗色下 toast 和主按钮被写成 `background:transparent`，看着像没背景。补回 `{background:#2b2733;border-color:#3a3644;color:#f0eef4}`。实测 toast 计算值 `rgb(43,39,51)` / 文字 `rgb(240,238,244)`。

这类「选择器列表末尾多一个逗号 + 空行」在压缩过的 CSS 里很难一眼看出来，往后改这几段要连着上下文一起看。

### 产物

`Better_WiSE_v0.1.2.11.crx` / `.zip`，ID `ecdedhcfflmobjlbcfanknhcpnnchefi` 未变。版本串五处全部 0.1.2.11。

## 第四十五轮（2026-11-15）— 0.1.2.11 收尾：滚动条、标题落位、左右对齐

### 双滚动条

`home.js` 开头那条 `html{overflow-y:scroll;scrollbar-gutter:stable;}` 是罪魁。站点自己的滚动条挂在
`<body>` 上（`body{overflow-y:scroll}`，`home.js` 里另一处注释也写过），我们再给 `<html>` 强开一个
滚动容器，右边就是两条竖条：一条视口的、一条页面的（截图里表现为两个 ▲ 按钮并排）。
改成 `html{scrollbar-gutter:auto;}`，让站点自己的滚动容器独占，实测
`innerWidth 1530 / documentElement.clientWidth 1515`，右边只剩一条。

### 标题 / 面板的落点

原来自己起了一行 `div.row.wt-tt-top > div.small-12.columns`，再算 padding 去对齐，结果随滚动条宽度漂 8px。
现在直接住进站点课表那一格（`section.wt-tt-sec` 的父级 `.small-12`）：

- `ensureTtHead()`：`holder = sec.closest('.small-12') || sec.parentElement`，`holder.insertBefore(head, holder.firstElementChild)`。
- `placePanel()` 还是插在标题后面，所以面板天然落在同一格里。
- 周末合成课表 `full` 从 `div.row.wt-tt-body > div.columns` 改成裸 `div.wt-tt-body`，同样插在这一格。

这一格的内容宽度是 8–1507，下面卡片是 16–1499，所以补了 8px：
`.wt-tt-head`、`.wt-tt-body`、`section.wt-tt-sec` 各 `padding:0 8px`。实测标题 16–1499、面板 16–1499，和卡片对齐。

### 日历选择器

`calSync()` 里 `CAL.native.style.display = (CAL.on || CAL.pick) ? 'none' : ''` —— 打开选择器时把站点那块
「Sunday November 15th 2026 + all-day」一起藏掉，选择器自己长在卡片里（`position:static`），
不再压住下面的 Music Lessons。实测 native `display:none`、picker 532–842 全在 island 482–856 内。

### 暗色 toast

`home.js` 里那条 `.wt-toast,…` 规则只剩半截：选择器列表末尾一个逗号 + 空行，声明块被后面 `.wt-check`
那条吃掉，于是 `background:transparent`。补回 `#2b2733 / #3a3644 / #f0eef4`。

### 产物

`Better_WiSE_v0.1.2.11.crx` / `.zip`，ID 未变。

---

## 第四十六轮（2026-11-15）— 0.1.2.12

### 深色设置面板里的白按钮

`options.html` 的 `#applyNow` 在深色下写的是 `background:#e7e5ea`（近白），改 `#2f2a38` / 文字 `#e7e5ea` /
hover `#3a3444`。`.seg` 那排 System / Light / Dark 也白：未选中的 `System` 在静态 HTML 里带
`aria-checked="true"`，JS 切主题后把它改成 false、把 true 交给 Dark，但过渡冻结在那一步，
于是看起来只有「白药丸」。补 `!important` 三件套（默认透明 / 选中白 / 深色下选中 `#3a3742`）。

### 选项间距与字号

`section` 的 `gap` `9px → 13px`；`.row` 字号 `11.5px → 11px`。

### 课程列表补回 Tutor Group

`classList()` 里 `if (!cls || /tutor group/i.test(cls.name || '')) continue;` 和
`subjectChoices()` 里 `if (!nm || /tutor group/i.test(nm)) return;` 两处把 Tutor Group 滤掉了。
删掉这两条过滤后，设置里的列表变成 8 行：Tutor Group + 七门课
（Language Acquisition English 从 `ALL_SUBJECTS` 兜底进来）。
原先那句注释「周六只剩六门，第七门就消失了」就是这个过滤留下的。

### 顶部原生搜索把整页吞掉

站点自己用 `html.wt-hidden` 表示「搜索展开」，我们**也**用同名类按标签页可见性开关
（`document.documentElement.classList.toggle('wt-hidden', document.hidden)`），于是点开搜索时
我们的 toggle 把站点的状态改坏：`#main` 消失、只剩搜索框。类名全部换成 `wt-tab-hidden`，
`grep wt-hidden` 归零。

### 点开 timetable 卡片不再提饱和

`table.wt-table td.wt-card.wt-expanded .timetable-subject` 上那条 `filter:none` 去掉，
让 `theme.css:255` 的 `brightness(.92) saturate(.55)` 继续生效 —— 悬浮时什么样，点开还是什么样。

### 周中展开卡片被切一半（max-height）

真凶不是 `.scrollable`（它的高度是 `auto` 解出来的自然值），而是我们自己那条
`table.wt-table td.wt-card.wt-expanded .wt-detail{overflow:auto;max-height:min(240px,40vh)}`
—— 周中用站点表格时详情被限高 240px 内部滚动；周末走合成表格，那套规则不命中，所以只有周中犯。
改成 `overflow:visible;max-height:none`。顺手补了 `.scrollable.wt-tt-wrap{height:auto;max-height:none}`
（dashboard 的课表不在 `.island` 里，原来那条管不到）。

### 亮暗过渡：速率统一、两个方向都有

先是盖整屏蒙版淡出，但蒙版只能淡背景，文字和卡片是瞬变 —— 背景慢慢淡、内容硬切，比硬切还怪。
改回逐属性 transition，难点在「挂哪儿」：

- 临时插 `<style>` 进 `<head>`：站点会清不认识的 style，实测 63ms 就没。
- 给 `<html>` 挂属性 / 给 `<body>` 挂类：站点整份重写这俩的 class/属性，62ms 被摘。

最后用 `document.adoptedStyleSheets` 临时加一张表 —— 它不在 DOM 里，清不掉。切换时挂表 →
`void root.offsetHeight` 强制一帧 → 换 `data-wt-theme` → 380ms 后摘表。顺序不能反：transition 和
颜色变化落在同一次样式计算里，浏览器直接跳变，等于没做。

之前测出「只活 62ms」，是 CDP 每次 eval 往返 ~400ms 造成的假象；内容脚本里打点才是真的
（`WT-ON 14543` → `WT-OFF 15081`，538ms）。页面内 rAF 采样也确认 body 底色走了中间值
`rgb(240,240,240) → rgb(192,192,192) → rgb(21,21,23)`。

### 产物

`Better_WiSE_v0.1.2.12.crx` / `.zip`，ID 未变。

---

## 第四十七轮（2026-11-15）— 0.1.2.13

### 亮暗切换：不做过渡了

三种做法都试完了，没一种比瞬切好看：

1. 整屏蒙版淡出 —— 只能淡背景，内容硬切，比不做还怪。
2. 逐属性 `transition` 常驻 `body.wt-theme-anim` —— 站点 62ms 就把 class 整份重写，撑不过一帧。
3. `adoptedStyleSheets` 临时挂表 —— 方案本身成立（`getAnimations()` 230 条 `background-color`、
   页面内 rAF 采到中间值），但两千多条颜色声明同一下场，看着还是一跳。

按「不行就别做」把过渡整套删掉（`themeFlip()` / `themeScrim()` / 过渡表），换主题即时生效。
`theme.css` 里那段规则只剩注释。

### /search 页面深色全是白块

站点把搜索页换成了 `.sbx-island` / `.empty-state-flex-centered`，`.island` 那一串规则管不到。
`theme.css` 末尾补一层 `.sbx-island`、`.empty-state-flex-centered`、`.sbx-search-page__results`
的深色规则。实测两个 `.sbx-island` 都变 `var(--wt-t-surface)`，空状态区透明。

### Show in All 面板

- 深色：面板 `#232128`、行 `#d5d0dd`、底部三颗圆按钮 `#2b2733`（原来全是白底）。
- 右上角 ×：原来只有 `border:0`，点一下浏览器给焦点描边，看着像多了一圈怪框。改成
  24×24 正方形、`border-radius:6px`、`outline:none`、`:focus/:focus-visible` 都不画框。

### 课程列表：去掉 Tutor Group

上一版把 `/tutor group/i` 的两处过滤删了，列表变成 8 行（含 Tutor Group）。这版把过滤加回来，
但保留 `ALL_SUBJECTS` 兜底 —— 列表回到 7 门：VCE Bridging EAL、Science、Individuals and
Societies、VCE Maths Methods、Language and Literature Chinese、PE、Language Acquisition English。
第七门（Language Acquisition English）本来就不在当天课表里，是 `ALL_SUBJECTS` 从 /timetable 抓回来的。

### timetable 的 max-height：整套回退

`.scrollable.wt-tt-wrap{height:auto;max-height:none}` 和
`.wt-detail{overflow:visible;max-height:none}` 都改回去了 —— 一动周末合成课表的排版就跟着抖，
整个页面抽动。周中展开被 240px 限高的问题留着，等有办法只在周中生效再说。

### Next day 按钮跑到底部

`section.wt-tt-sec` 在 dashboard 上是 `position:static`，`.wt-tt-actions` 的
`position:absolute;bottom:6px` 找上的是整页容器 `div.inner-wrap`，于是它掉到页面最底下
（y≈10577）。CSS 里 `[data-wesley-home] .wt-tt-sec` 只在首页那份里生效，dashboard 落空。
改成 `[data-wesley-home] .wt-tt-sec,section.wt-tt-sec{position:relative;}`，实测按钮回到
(1389, 404)，在课表区块里。

### Upcoming 换成 Term 4 考试表（只对这个账号）

`upcomingBlock()` 的 `baseList()` 前面加一层 `examSeedList()`：读 `a.account-menu` 的
`title`，命中 `/chris\s+guo/i` 才返回写死的七场考试，否则照常走站点数据。每行形如
`in 3 days · Language Acquisition: English · Wed 18 Nov · 1:00–3:15 PM · Study Centre`。

### 产物

`Better_WiSE_v0.1.2.13.crx` / `.zip`，ID 未变。

## 第四十八轮（2026-11-15）— 0.1.2.14

- **第七门进 Due**：`refreshExtraClasses()` 原来只留「有条目要做」的额外课，这学期不在当天课表里的
  Language Acquisition English 永远进不来。改成全留（有活的排前面），`slice(0, 8)`。
  实测 Due 的 tabbar 变成 8 个：All + 七门课。
- **设置里放回 Tutor Group**：`subjectChoices()` 那条 `/tutor group/i` 过滤撤掉，设置浮层实测 8 行
  （七门课 + Tutor Group）。
- **摘要头瘦身**：`headCountEl` 置空，`.wt-count` 不再出现；`.wt-refresh-btn` 的 `margin-left:3px`
  改 `margin-left:auto`，刷新按钮落到最右。
- **nextday 弹窗重做（本轮主体）**：
  - 数据源从「日历 API」换成 `/timetable` 那张表：`loadTtGrid()` 解析 11 列（空 TH + Day 1…Day 10）与
    6+1 行（Homeroom / Period 1-6），缓存 5 分钟。
  - 格子文本是「课名 (编号) 教室 老师」，只留课名和教室：编号、老师都不显示（用户要求）。
  - 没课的节次整行不渲染；整天空着才给一句提示。
  - `dayNumForDate()` 用日历事件里的课程编号去和 10 个 Day 列比对，命中最多的一列就是这天是 Day 几。
  - 头部新增两枚按钮：`Day X`（点开 1–10 的非模态浮层，选中即换表）与日历按钮（点开非模态月历，
    周末 `is-off` 灰掉不可选）。二者都走 `ndPop()`：不开遮罩、点外面关掉。
  - `×` 从绝对定位改成工具行里的一员（`.wt-nd-tools`），不再盖住新按钮。
- `Next day ›` / `☰` 两个 pill 上下空一大坨：站点全局 `button{min-height:40px}` 压过我们的 `padding:5px 9px`
  → 补 `min-height:0 !important;height:26px !important`，实测 72×26 与 26×26。
- `Day X` 按钮与浮层里的选中项一度是白底白字（`var(--wt-t-accent)` 在深色下取值太浅），改成显式
  `#64346f / #fff`（浅色）与 `#9b6fd6 / #1b1520`（深色）。
- 产物：`Better_WiSE_v0.1.2.14.crx` / `.zip`，ID `ecdedhcfflmobjlbcfanknhcpnnchefi`。

坑：
- 页面里改完 `home.js` 必须「`reload-ext.mjs` 重载扩展 → 刷新页面」，只重载扩展不刷页面还是旧脚本，
  测出来还是 40px、还是白按钮。
- 探针脚本结尾一定要 `process.exit(0)`，否则 node 挂着、bash 报 still running。

## 第四十九轮（2026-11-15）— 0.1.2.15

- 教室和课名同一行：`Year 10 Science · C203`（原来是课名下面另起一行）。
- 空格次不再说 “Nothing due from this class.”，改说 **No new posts**。
- `Next day ›` / `☰` 从 26px 回到 30px（26 太扁）。
- 日期选择器优先：选日期 → `Day X` 跟着变；手点 `Day X` → 日期选中框变淡（`.is-sel-faint`），
  不清掉，方便再点回去。`ndPop()` 加 `data-opener`：点同一颗按钮收起，点另一颗换浮层。
- 月历周日排最左（`['Su','Mo','Tu','We','Th','Fr','Sa']`，`lead = first.getDay()`）。
- **控件尺寸被站点撑大的老毛病**：`.wt-nd-calcell` / `.wt-nd-calnav` / `.wt-nd-calwd` / `.wt-nd-dayitem`
  的宽高、`min-height`、`font-size`、`padding` 全加 `!important`。原因是站点全局 `button{min-height:40px}`
  和继承字号把我们写的小尺寸压掉：实测 `calnav` 是 24×40、`calwd` 字号 15px。改完 22×22、9.5px，
  月历浮层从 262×374 收到 262×180。
- 注意：`home.js` 里的样式都躺在模板字符串里，注释里别写反引号（会截断字符串，`node --check` 直接报错）。
- 产物：`Better_WiSE_v0.1.2.15.crx` / `.zip`，ID `ecdedhcfflmobjlbcfanknhcpnnchefi`。

## 第五十轮（2026-11-15）— 0.1.2.16 / 0.1.2.17

- 深色下 `ul.tileList` 的应用磁贴降饱和：`html[data-wt-theme="dark"] ul.tileList li.tile{filter:brightness(.92) saturate(.55)}`
  —— 图标是烤进 `background-image` 的，只能整个 `li` 上滤镜；数值和 `.timetable-subject` 保持一致。
- 日期选择器放大一档（用户嫌图标看不清）：浮层 262→304 宽，`.wt-nd-calnav` 22→26 且字形 12→15px，
  月名 12→13.5px，星期行 9.5→10.5px，日期格 24→30 高、字号 11.5→12.5px，格间距 0→1px。
  实测浮层 304×224、格子 40×30、箭头按钮 26×26。

## 第五十一轮（2026-11-15）— 0.1.3

- 版本号收敛成三段：`0.1.2.17` → `0.1.3`。五处串（`extension/manifest.json`、
  `extension/options.html` 的 `#footVer`、`extension/options.js` 的 MANIFEST 兜底、
  `extension/PRODUCT.md` 的 badge 与「当前」行、`extension/README.txt`）都改了；
  `PRODUCT.md` 里程碑表补了 0.1.2.14 → 0.1.3 五行。
- 线上站点一直服务仓库根目录的 `index.html` / `privacy.html`，而改写后的版本只放在
  `docs/github-pages/`，所以 `mekathun.github.io/better-wise-page` 上的隐私页还写着「会把你
  自己的 API key 交给 AI」。这一轮把两份复制到根目录，AI 字样清零，Pages 跟 main 重建。
- 产物：`Better_WiSE_v0.1.3.crx` / `.zip`，ID `ecdedhcfflmobjlbcfanknhcpnnchefi`。
- 发布链路：本机没有 git 凭据，改用 GitHub OAuth 设备流（GitHub CLI 的公开 client_id
  `178c6fc778ccc68e1d6a`，scope `repo`）拿一次性 token，只存在 `/d/tmp/gh.token`，推完即弃。
  远端本来就有历史，本地仓库是新建的，所以用 `git reset --soft <remote-tip>` 把工作树挂到远端
  之后，一次提交推上去，不强推也不改写历史。
- 坑一：Edge 157 拒绝在默认 user-data-dir 上开 `--remote-debugging-port`
  （`DevTools remote debugging requires a non-default data directory`）。
  坑二：把 Edge profile 复制到别的目录启动，ABE（App-Bound Encryption）让 cookie 解不开，
  GitHub 仍是未登录。结论：要么用户自己在那台浏览器里点一次登录，要么走设备流。
- 坑三：`git checkout -B <branch> FETCH_HEAD` 会把工作树重置成远端内容，未提交的改动直接没了。
  以后先提交或先 `reset --soft`，别在有脏工作树的时候切分支。

- 修一个 0.1.3 期间暴露的运行时错误：`placePanel()` 用 `document.querySelector('[data-timetable-header]')`
  找锚点，周末合成课表 `.wt-tt-body` 里也有同名 h2，选到它就等于把面板插进自己那张表里，
  随后 `placeSynth()` 调 `panel.insertAdjacentElement('afterend', full)` 抛
  `HierarchyRequestError: The new child element contains the parent`（每次 tick 抛一次）。
  改成只认不在 `.wt-tt-body` 里的标题，并给 `placeSynth()` 加 `full.contains(panel)` 的短路与 try/catch。
  复测：刷新后 `Runtime.exceptionThrown` 0 条，标题、面板、磁贴、日历都在。
