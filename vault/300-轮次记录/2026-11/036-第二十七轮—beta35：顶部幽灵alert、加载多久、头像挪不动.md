<!-- generated: sync.py — 手改会被覆盖，要改去改 PROGRESS.md 或 100-/200-/400-/500- 里的手写笔记 -->
---
type: round
source: 700-归档/PROGRESS.md
lines: 566-581
date: 2026-11-07
version: beta35
tokens: 735
seq: 036
summary: 屏幕最顶端那个关不掉的 alert
---

# 第二十七轮（2026-11-07 15:50–16:05）— beta35：顶部幽灵 alert、加载多久、头像挪不动

`日期 2026-11-07 · 版本 beta35 · 原文 566-581 行 · 约 735 tok`

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

---
原文：[[700-归档/PROGRESS#第二十七轮（2026-11-07 15:50–16:05）— beta35：顶部幽灵 alert、加载多久、头像挪不动|PROGRESS L566-581]] · 上一轮：[[300-轮次记录/2026-11/035-第二十五轮—beta33：拖拽时的两张卡与动画起点.md|035]] · 下一轮：[[300-轮次记录/2026-11/037-第二十八轮—beta36：首屏骨架、样式早挂、搜索框收窄、拖拽连续平移.md|037]] · 索引：[[300-轮次记录/00-轮次索引|轮次索引]]
