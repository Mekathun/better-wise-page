<!-- generated: sync.py — 手改会被覆盖，要改去改 PROGRESS.md 或 100-/200-/400-/500- 里的手写笔记 -->
---
type: round
source: 700-归档/PROGRESS.md
lines: 937-968
date: 2026-11-07
version: 0.1.2
tokens: 950
seq: 043
summary: ① 插件页右上角那块「黑色」
---

# 第二十八轮（2026-11-07 19:30–20:05）— 右上角黑块、搜索分组、recent 可管理（版本仍是 0.1.2）

`日期 2026-11-07 · 版本 0.1.2 · 原文 937-968 行 · 约 950 tok`

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

---
原文：[[700-归档/PROGRESS#第二十八轮（2026-11-07 19:30–20:05）— 右上角黑块、搜索分组、recent 可管理（版本仍是 0.1.2）|PROGRESS L937-968]] · 上一轮：[[300-轮次记录/2026-11/042-第二十七轮—性能模式不染色、设置页归位、快捷键、搜索加权（版本仍是0.1.2）.md|042]] · 下一轮：[[300-轮次记录/2026-11/044-第二十九轮—文件类型、文件子类、查询语法（版本仍是0.1.2）.md|044]] · 索引：[[300-轮次记录/00-轮次索引|轮次索引]]
