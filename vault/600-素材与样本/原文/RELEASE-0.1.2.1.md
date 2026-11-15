<!-- generated: sync.py — 手改会被覆盖，要改去改 PROGRESS.md 或 100-/200-/400-/500- 里的手写笔记 -->
---
type: source-doc
source: docs/RELEASE-0.1.2.1.md
bytes: 2204
tokens: 596
date: 2026-11-15
---

# RELEASE-0.1.2.1

> 原件：`D:\DSH\Better_WiSE\docs\RELEASE-0.1.2.1.md`

# Better WiSE 0.1.2.1

Patch release. What 0.1.2 shipped with, and what this fixes.

## English

0.1.2 is live. 0.1.2.1 fixes four things that turned up in the first day of use.

**Weekend timetable appearing twice.** On a Saturday or a public holiday the extension draws its own timetable for the last school day, and the site renders its own copy a few seconds later, so the page showed two. The site's copy is now hidden while ours is on screen and restored when you leave.

**A warning that was never true.** "Could not read your class list" fired 2.5 seconds after load whenever no cards were found, which on a weekend is the normal state. It now waits 12 seconds, only appears when the page really has nothing to show, and removes itself once data arrives.

**White flash on dark theme.** The first frame used a cached copy of the theme that could be out of date, so a dark-theme user saw white for a moment before the real value came back. The extension now asks `chrome.storage` on startup and repaints before the first frame you can see.

**Panel landing under the timetable.** On weekends the plan panel could end up below the timetable instead of above it. The order is now fixed: header, panel, timetable.

Nothing else changed.

## 中文

0.1.2 已经上线。0.1.2.1 修的是上线第一天发现的四个问题。

**周末课表出现两张。** 周六和公共假日，扩展会画一块「最后一个上学日」的课表，站点自己的表格晚几秒也渲染出来，屏幕上就有两张。现在站点那张在我们显示时藏起来，离开时还原。

**一条从来不成立的警告。** 「读不到课程列表」以前在加载 2.5 秒后只要没卡片就报，而周末本来就没卡片。现在改成 12 秒才判定，条件收紧成「页面确实什么都没有」，数据到了就自己撤掉。

**暗色首帧闪白。** 首帧主题取自一份可能过期的缓存，暗色用户会先看到白色。现在启动时向 `chrome.storage` 要一次真值，在第一个能看见的帧之前就画对。

**面板跑到课表下面。** 周末时计划面板有时落在课表下方。顺序现在固定：标题、面板、课表。

其余没有改动。

---
上级：[[600-素材与样本/00-原文索引|原文索引]]
