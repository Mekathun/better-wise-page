# Better WiSE 0.1.2.3

0.1.2.1 is the version that went through review. This release gathers two rounds since then: the site's own pop-ups in dark theme, and four things found while opening every menu and dialog the site has.

## English

**Site pop-ups in dark theme.** Calendar event details, Export, the date pickers and the class-card dropdown still had white surfaces inside while our global rules had already turned their text light, so those panels were pale text on white. They now use the same dark surface as the rest of the theme, flatpickr calendars included.

**Weekend panel stuck on a skeleton.** On a Saturday the site does not render its timetable header, and the panel builder returned early when that header was missing, so the panel never filled in. It now builds without a header.

**Two timetables on weekends.** The synthetic timetable could land above the panel, sometimes above the title. It is now anchored right after the panel and rechecked while the page runs, so the order stays title, panel, timetable.

**Two copies of the extension running.** With both the store build and a side-loaded build installed, both matched the dashboard and each inserted its own panel and timetable. The page now carries a marker and the second copy exits.

**Class card menu.** The ⋮ menu on a class card kept a white row inside it, light text on white. Fixed.

Nothing else changed.

## 中文

0.1.2.1 是走完审核的那一版。这一版收的是之后两轮的内容：站点自己的弹层在暗色下的表现，以及把所有菜单和弹层挨个点开时翻出来的四个问题。

**暗色下的站点弹层。** 日历事件详情、Export、日期选择器、课程卡下拉，里面还是白底，而我们的全局规则早把文字改成了浅色，于是成了白底浅字。现在它们和主题其余部分一样是深底，flatpickr 的日历也一起处理了。

**周末面板停在骨架。** 周六站点不渲染课表表头，面板的构建函数拿不到表头就直接返回，骨架再也没换掉。现在没有表头也能建。

**周末两张课表。** 合成课表的位置可能落在面板之上，有时甚至跑到标题上面。现在它贴着面板插入，运行中还会重新对位，顺序固定成标题、面板、课表。

**同时跑着两份扩展。** 商店版和侧载版都装着的时候，两份都匹配 dashboard，各插一块面板和一张课表。页面现在带一个标记，第二份直接退出。

**课程卡菜单。** 课程卡上的 ⋮ 菜单里有一行白底，浅字压白。已修。

其余没有改动。
