# Store listing copy / 商店上架文案

> 直接复制粘贴用。Chrome Web Store 的详细描述不支持任何格式，换行就是换行，所以下面是纯文本。
> Chrome 与 Edge 共用同一份，两个店都传这一份。

---

## Name / 名称

```
Better WiSE page
```

（17 字符，上限 45。名称里放不下 unofficial，所以非官方声明放在描述第一句。）

---

## Short description / 短描述

上限 132 字符，商店搜索结果里显示的就是这句：

```
Adds an unofficial plan for today to the Wesley College WiSE portal: the timetable, the work that is due, and one search box.
```

（124 字符。）

---

## Detailed description / 详细描述

```
Better WiSE page is an unofficial add-on for the Wesley College WiSE portal, built by a student. It is not affiliated with Wesley College or with Schoolbox.

It puts one panel at the top of the WiSE homepage: what you have today, what is nearly due, and what the teacher posted for each class.

Today

The timetable, one card per period. Click a period and the card opens in place with the latest post for that class. Announcements from all your subjects are collected into two lists, to do today and due, so you stop opening every class page to find out. Click a task to read the whole post, then jump to the class page.

On a weekend or a public holiday the panel says so and shows the last school day instead of an empty page.

Search

Ctrl+K or Cmd+K opens one box for posts, files, links and pages, including things you opened weeks ago. It searches a local index first and can query the WiSE site search at the same time, and you can filter by type. Chinese course names work through pinyin, and one typo is forgiven. There is a floating search button for when you would rather click.

Settings

A gear next to your avatar opens the same settings as the toolbar popup. Master switch, animation speed, cards per row, background image, and a performance mode that turns off blur and shadows on an older laptop.

Privacy

No account, no analytics, no server of ours. The extension does not collect user data. It reads the WiSE pages you can already open and keeps your own settings in this browser. Requests go to wise.wesleycollege.net and nowhere else.

What it does not do

It does not change grades, submissions or messages, and it never writes back to WiSE.
```

---

## Single purpose / 单一用途

商店要求一句话说明，写宽了会被判多用途。用这句：

```
Shows what is already in the WiSE portal, timetable, tasks, due work and searchable posts, in one place, so a student does not have to open every class page.
```

---

## Permission justifications / 权限说明

`storage`

```
Keeps the user's settings, a cache of WiSE pages they have already opened, and the local search index. Without it the panel and the search would have to re-read the portal every time.
```

`https://wise.wesleycollege.net/*`

```
The portal the extension enhances. It reads the pages the student can already open and adds the panel to the homepage.
```

`https://login.microsoftonline.com/*`

```
Used only to tell a signed-out session apart from a network failure when reading the portal. No login is performed and no credential is read.
```

---

## 其他表单字段 / other form fields

- Category: **Education**
- Language: **English**
- Remote code: **No**. 所有脚本都在包里，不下载、不执行外部代码。
- Website / support: 留空或填 GitHub issue 页

### Data usage / 数据使用声明

勾选 **不收集用户数据**（Does not collect user data）。理由：没有账号，没有统计，没有任何数据发到开发者服务器，
扩展只读用户已经能看到的 WiSE 页面，设置存在用户自己的浏览器里。

如果审核追问数据去向，用这段回答：

```
The extension reads the WiSE pages the user can already open and draws extra UI on them.
Settings and a page cache live in the user's own browser storage. No data is sent to the
developer; there is no backend and no analytics.
```

---

## 隐私政策 / privacy policy URL

已上线，直接填这个：

```
https://mekathun.github.io/better-wise-page/privacy.html
```

源文件在 `docs/github-pages/privacy.html`，仓库 `Mekathun/better-wise-page`（main / root 发布）。
改内容后重跑 `node tools/gh-pages/api.mjs` 即可更新；页面最后一节留了联系邮箱，
数据实践变了记得同步改「Last updated」。

提交时如果审核追问数据去向，用这段回答：

```
Nothing is transmitted anywhere except to wise.wesleycollege.net, using the session the user
already has. The extension has no backend, no analytics and no account system.
The privacy policy at the URL above states that no user data is collected.
```

---

## 还差什么 / still missing

- 截图 1280×800 三张：首页面板、搜索结果、设置页
- 小宣传图 440×280
