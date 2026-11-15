# Better WiSE page

**Install from the Chrome Web Store:** https://chromewebstore.google.com/detail/better-wise-page/jbpdhgenkilngppdabeabebhfpbcgeli

An unofficial browser extension for the Wesley College WiSE portal. It puts the timetable, the work that is due and a search box on the portal's home page, so a student stops opening every class page to find out what happened.

Not affiliated with Wesley College or with Schoolbox.

---

## English

### What it does

- One panel at the top of the WiSE home page: today's periods as cards, the latest post for each subject, and two lists of announcements (to do today, due soon).
- A timetable header that names the day it is showing. During the week it reads the day number from the timetable page, at the weekend it says which school day you are looking at.
- A next-day window with two pickers: Day 1 to Day 10, numbered the same way the timetable page numbers them, and a month calendar that greys out weekends.
- `Ctrl+K` or `Cmd+K` opens one search for posts, files, links and pages, including things you opened weeks ago. Chinese course names work through pinyin, and one typo is forgiven.
- Dark mode that covers the whole site, including the pages the extension does not draw itself.
- Settings from the gear next to your avatar: master switch, animation speed, cards per row, background image, and a performance mode that drops blur and shadows on an older laptop.

### Install

Chrome or Edge. Either:

1. Open `Better_WiSE_v0.1.3.6.crx`. In Edge, turn on developer mode at `edge://extensions` first.
2. Or unpack `Better_WiSE_v0.1.3.6.zip` and use "Load unpacked" on `edge://extensions`.

Then open `https://wise.wesleycollege.net/` and sign in as usual.

### Privacy

No account, no analytics, no server of ours. The extension does not collect user data. It reads the WiSE pages you can already open and keeps your settings and page cache in this browser. Requests go to `wise.wesleycollege.net` and nowhere else.

The full policy is at https://mekathun.github.io/better-wise-page/privacy.html.

### Build

```
cd extension
node build-extension.mjs
```

The script writes three files to the parent folder: a `.crx`, a `.zip` for loading unpacked, and a `-store.zip` with the `key` field removed, which is the one Chrome Web Store accepts.

### What it does not do

It does not change grades, submissions or messages, and it never writes back to WiSE. It is a reading layer on top of pages you already have access to.

---

## 中文

### 它做什么

- 首页顶部一块面板：当天每一节课一张卡，点开就地展开该科最新一条公告；所有科目的公告收成两份列表（今天要做、临近截止）。
- 课表标题会写清它显示的是哪一天。周中显示 `Day 5` 这样的编号，周末改成 `Showing Friday 13 Nov`，因为那时站点给的是另一个上学日。
- 次日窗口带两个选择器：`Day 1` 到 `Day 10`，编号与 timetable 页面一致；旁边是一个月历，周末灰掉不可选。
- `Ctrl+K` 或 `⌘K` 打开全局搜索，帖子、文件、链接和页面都在里面，几周前看过的东西也能翻到。中文课名可以用拼音搜，打错一个字母也能命中。
- 深色模式覆盖整站，包括不是这个扩展画出来的页面。
- 头像旁边的齿轮进设置：总开关、动画速度、每行卡片数、背景图，以及给旧笔记本用的性能模式（关掉模糊和阴影）。

### 安装

Chrome Web Store：https://chromewebstore.google.com/detail/better-wise-page/jbpdhgenkilngppdabeabebhfpbcgeli

或者手动装，Chrome 或 Edge，两种方式：

1. 双击 `Better_WiSE_v0.1.3.6.crx`。Edge 要先在 `edge://extensions` 打开开发者模式。
2. 或者解压 `Better_WiSE_v0.1.3.6.zip`，在 `edge://extensions` 里选「加载解压缩的扩展」。

装完打开 `https://wise.wesleycollege.net/`，照常用学校账号登录。

### 隐私

没有账号、没有统计、没有开发者服务器。扩展不收集用户数据，只读你已经能打开的 WiSE 页面，设置和页面缓存留在本机浏览器里，请求只发往 `wise.wesleycollege.net`。

完整说明见 https://mekathun.github.io/better-wise-page/privacy.html。

### 构建

```
cd extension
node build-extension.mjs
```

脚本会往上一级目录写三个文件：`.crx`、给「加载解压缩」用的 `.zip`，以及去掉 `key` 字段的 `-store.zip`（Chrome 应用商店只收这一份）。

### 它不做什么

不改成绩、作业提交和消息，也不往 WiSE 写任何东西。它只是在你本来就能看的页面上加一层。

---

## 说明

扩展 ID：`ecdedhcfflmobjlbcfanknhcpnnchefi`。

发布在 Chrome 应用商店（`jbpdhgenkilngppdabeabebhfpbcgeli`）。名字和配色沿用 Wesley 的紫色体系，校徽与 WiSE 名称的使用仍在与学校沟通。
