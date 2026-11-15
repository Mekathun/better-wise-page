---
type: card
topic: Schoolbox 站点结构
source: extension/home.js
lines: 3006-3012 · 5217-5237 · 5545-5575 · 6571-6603
date: 2026-11-15
tokens: 约 1030
status: done
---
# Schoolbox 站点结构

一句话：站点是 Schoolbox，页面可以拆成「骨架 + 岛 + 课表 + 列表」四件套，类名和 URL 都稳定；我们的选择器全建在这上面，站点改一次结构就整片失效。

## 结构 / 规律

| 层 | 站点给的标记 | 位置 |
|---|---|---|
| 页面骨架 | `#content > .row > .island > article.content` | home.js:3009-3012 |
| 任务页细节 | `h1 + ul.meta`（Due / MYP）、`article.content > ul.grid`（附件卡） | home.js:3010-3012 |
| 顶栏 | `form.sbx-header-search`、`a.account-menu`、`section.right-small` | boot.js:45-48 |
| 顶栏菜单 | `.tab-bar-section > ul.top-menu` | search.js:1858-1860 |
| 课表 | `[data-timetable-container] table.timetable[data-timetable]`，标题 `[data-timetable-header]`（h2「Day 5」） | home.js:1329、5875 |
| 课表格子 | `.timetable-subject`，里面挂 `a[href*="/homepage/"]` | home.js:2605-2610 |
| 公告列表 | `ul.information-list > li > h3 a.title`、`p.meta`、`time[datetime]` | home.js:2688-2704 |
| 面包屑 | `ul.breadcrumb > li > span` | PROGRESS.md:137 |
| 岛 | `.island` 是通用卡片容器，日历岛靠 `h2.subheader` 文本认 | home.js:6571-6579 |

URL 就四类：`/homepage/<group id>` 课程页、`/learning/classes` 课程列表、`/news/<id>` 公告页（附件是 `li.actions-small-1` 里的 `div.card.attachment > a[href*=fetch.php]`，home.js:3043-3053）、`/resources` 资源库（只有 `/send.php?id=` 下载，没有文件页，PROGRESS.md:30）。

日历走真接口，不是 DOM：`GET /calendar/ajax/full?start=<unix>&end=<unix>&userId=<id>`，要带 `x-requested-with: XMLHttpRequest` 和 credentials（home.js:5217-5232）。条目里 `className` 含 `type24` 才是课，`start==end` 或时长 <5 分钟的直接丢（home.js:5235-5237）。`userId` 从页面内联脚本里 `userId: Number('...')` 抓（home.js:5219）。

## 我们的用法

| 站点的东西 | 我们怎么用 | 位置 |
|---|---|---|
| `.row > .island > article.content` | 认正文容器，面板插在它前面 | home.js:3009 |
| `table.timetable[data-timetable]` | 课表增强的唯一锚点；`[data-timetable-header]` 取「Day 5」 | home.js:5875-5884 |
| `a[href*="/homepage/"]` | 格子里拿课程主页；缺的从 `/learning/classes` 的 `.v-card h3 a` 补 | home.js:5264-5268 |
| `/news/<id>` | `newsLinksFromDom` 只认 `/news/\d+`，新旧看卡片文字「18 hours ago」 | home.js:5545-5575 |
| `div.card.attachment` | 抓附件，同一文件出现两次（带 `&save=1`）按 hash 去重 | home.js:3043-3053 |
| `[id^="calendar-"]` | 日历岛里的原生控件，增强前先藏 | home.js:6603 |
| `nav, header, footer, #left-menu, .breadcrumbs` 等 | scrub 时整段移除 | home.js:3006 |

## 别碰的地方

- `/news/<id>` 的数字不是时间顺序（home.js:5577）。当「id 越大越新」用，取到的会是几条老公告。
- `.v-card` 数课程卡早就失效：站点改版后计数恒为 0（home.js:6062-6064）。健康检查现在只剩课表和 `a[href*="/news/"]` 两项（home.js:6065-6066）。
- 没有 `/homepage/` 链接的格子是集会占位，代码长这样 `N12ASB0-YM2`（home.js:2619），别当课处理。
- 周末和假日站点根本不渲染 `[data-timetable-header]`（home.js:4135、4377）。拿不到标题是正常的，不是坏了。
- 站点会整份重写 `html`/`body` 的 class（约 62ms，home.js:5758），也会清掉 `<head>` 里不认识的 `<style>`（theme.css:865）。状态别存在 class 上。

## 读哪里

- 骨架与 scrub：`extension/home.js:3006`、`:3009-3012`
- 课表与格子：`extension/home.js:1329`、`:2605-2619`、`:5875-5884`
- 公告与附件：`extension/home.js:2688-2704`、`:3043-3053`、`:5545-5575`
- 日历接口与岛：`extension/home.js:5217-5237`、`:6571-6603`
- 站点与我们抢样式的现场：`extension/theme.css:843-880`

---
上级：[[400-知识库/00-知识库总览|知识库总览]] · 相关：[[400-知识库/02-CSS注入与坑|CSS 注入与坑]] · [[200-界面/00-界面总览|界面总览]]
