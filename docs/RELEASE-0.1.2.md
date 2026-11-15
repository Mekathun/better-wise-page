# Better WiSE 0.1.2

Release notes comparing 0.0.138 with 0.1.2.

## English

0.0.138 was a toolbar popup that guessed your next class, plus an AI card grid on class pages. 0.1.2 is a different thing: a plan panel on the WiSE homepage, a search box for the whole site, and a dark theme.

What changed

**Today's plan.** A single panel on the homepage and dashboard that answers "what do I have to do today". Homework and assessments are split into To do today and Due, sorted by how close they are, with an "in N days" badge. Teacher attachments show up as cards with their type and size. You can tick a card done, drag cards around to reorder them or move them between sections, and pin your own due date with "Set due" when the post does not give one. The panel starts collapsed and remembers what you left open.

**Timetable.** The header now shows the school week ("Day 5 · Term 4 · Week 5"). "Next day" swaps in the next school day's timetable without leaving the page, colours match the class colours, and on a weekend or public holiday the panel shows the last school day instead of an empty page.

**Search.** Ctrl/⌘+K anywhere on the site opens one box that searches your posts, files, links and pages, and can query WiSE's own search at the same time. Filter by type, keep the last five queries as chips, and search Chinese course and file names by pinyin, with one typo forgiven.

**Dark theme.** Dark mode covers the whole site, not just the panel: dashboard, news, calendar views, timetable, classes, feedback, pastoral, resources and search. Colours that carry meaning keep their hue.

**Settings.** One panel behind the gear in the corner and behind the toolbar icon. Theme, animation speed, a performance mode for older laptops, cards per row, and the AI switch.

**AI is optional now.** 0.0.138 shipped with a key inside it. 0.1.2 has no key: AI is off until you paste your own, and everything else works without it. Any OpenAI-compatible endpoint works, not just Gemini.

**Smaller, simpler internals.** The background worker, the toolbar popup and the bundled offline snapshot are gone. The extension now only reads what you can already see, caches it per day, and the icons were redrawn.

Fixes

Between the two versions a batch of bugs was fixed: leftover bright patches in dark mode on several pages, cards flickering or duplicating while dragging, due dates read unreliably from post text, and search results coming back in a confusing order.

Privacy is unchanged: nothing leaves the browser except requests to WiSE itself, and the optional AI calls to the endpoint you configured.

## 中文

0.0.138 是「工具栏弹窗猜你下一节课 + 课程页上的 AI 卡片」。0.1.2 是另一个东西：首页一块计划面板、全站搜索、全站暗色。

主要变化

**今日计划。** 首页和 dashboard 顶部一块面板，回答「今天要做什么」。作业和考核分成「今天要做」和「到期」两类，按紧迫程度排序，带「还剩 N 天」标记。老师发的附件变成卡片，标出类型和大小。卡片可以打勾标记完成、拖动排序或在分区之间移动；站点没写清楚日期时，用 Set due 自己钉一个。面板默认折叠，展开状态会记住。

**课表。** 表头显示校历周次（Day 5 · Term 4 · Week 5）。「Next day」不离开页面就能换到下个上课日，颜色沿用课程配色；周末和公共假日显示最后一个上课日，不再是空白页。

**搜索。** 站点任意位置 Ctrl/⌘+K 打开一个框，搜公告、文件、链接、页面，同时可以查 WiSE 自带搜索。可按类型筛选，最近五条查询留成 chips，中文课程名和文件名用拼音能搜到，允许一个错字。

**暗色主题。** 覆盖整站：dashboard、新闻、日历各视图、课表、课程页、feedback、pastoral、资源、搜索。带含义的颜色（课程色、事件色）保留色相。

**设置。** 右上角齿轮和工具栏图标打开同一块面板。主题、动画速度、老机器的性能模式、每行卡片数、AI 开关都在里面。

**AI 变成可选。** 0.0.138 包里带着 key，0.1.2 不带：默认关闭，自己填 key 才启用，其余功能不依赖它。除 Gemini 外也支持任意 OpenAI 兼容接口。

**内部更轻。** 后台 service worker、工具栏弹窗、内置离线快照都去掉了。只读你本来就能看到的页面，按天缓存，图标重画。

修复

两版之间修掉了一批问题：暗色模式下几个页面残留的亮色区块、拖动时卡片闪烁或出现两份、公告正文里的到期日期读不准、搜索结果的排序让人看不明白。

隐私没有变化：除了对 WiSE 本身的请求，以及你自己配置的可选 AI 调用，没有数据离开浏览器。
