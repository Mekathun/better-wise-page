# 0.1.2.17

## 商店里显示的更新说明 / What's new

```
The next-day window is rebuilt around the timetable you see on the WiSE site.
Each period now shows its room on the same line, and periods with no class stay
out of the list. Two pickers sit in the heading: Day 1-10, using the same
numbering as the timetable page, and a month calendar that greys out weekends.
Pick a date and the window works out which day it falls on. The heading reads
"Day 5" during the week and "Showing Friday 13 Nov" at the weekend, when the
site is showing a different day than today.

App tiles lose their colour in dark mode the same way timetable cards do.

Privacy: no account, no analytics, no server. The extension does not collect
user data.
```

## 这一版改了什么

日次窗口（Day 列表那个弹窗）基本重做了一遍。数据不再来自日历接口，改成读
`/timetable` 那张星期表：字号格子里写着「课名 (编号) 教室 老师」，现在只留课名和教室，
老师名和编号不显示，没课的节次整行不出现。原来那句 "Nothing due from this class."
换成 "No new posts"。

标题栏多了两枚按钮。`Day X` 点开是 1 到 10 的非模态浮层，编号跟 timetable 页面一致；
日历按钮点开是一个月历，周末灰掉选不了。选日期会自己算出那天是 Day 几再出课表；
手动选 Day 就保留日期，只是把日历上那格的颜色调淡，用来表示「日期不是这里定的」。

标题文案按周中和周末分开：周中写 `Day 5`，周末才写 `Showing Friday 13 Nov`。
上一版不分场合，周中也会冒出 Showing。

深色模式下应用磁贴（`tileList`）加了和课表卡片一样的降饱和，数值都是
`brightness(.92) saturate(.55)`。

## 顺手修的

- 站点全局 `button{min-height:40px}` 把 `Next day ›` 和 `☰` 顶成胖药丸，补了显式高度。
- `Day X` 按钮和浮层选中项原来用 `var(--wt-t-accent)`，深色下取到浅色，出现白底白字。
- 日期选择器小到看不清，放大到 304px 宽、26px 箭头、30px 格子。
- 设置浮层里的 Tutor Group 回来了，课程列表仍是七门课（Tutor Group 不算在内）。
- 清理了几处调试输出。

## 隐私口径

扩展不收集用户数据。没有账号、没有统计、没有开发者服务器，只读用户已经能看到的
WiSE 页面，设置和页面缓存留在用户自己的浏览器里。隐私政策
（https://mekathun.github.io/better-wise-page/privacy.html）已按这个口径重写。
