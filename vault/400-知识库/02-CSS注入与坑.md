---
type: card
topic: CSS 注入与坑
source: extension/boot.js · extension/theme.css · extension/home.js
lines: 44-51 · 843-880 · 5855-5866 · 853-858
date: 2026-11-15
tokens: 约 1280
status: done
---
# CSS 注入与坑

一句话：样式从四条管道进页面，跟站点的仗靠「改它的变量让它自己算出来是空」，不靠叠 `!important` 硬压。

## 我们怎么注入

| 管道 | 谁写的 | 时机 | 管什么 |
|---|---|---|---|
| `theme.css`（manifest 静态 CSS） | manifest 直接挂 | `document_start` | 全站暗色。最早到的一张表（manifest.json:37-39） |
| `#wt-boot-chrome` | boot.js 内联 | `document_start` | 首帧版式：搜索框 `right`、头像 `margin-right`、课表外距（boot.js:44-51） |
| `#wt-boot-theme` | boot.js 内联 | `document_start` | 首帧背景 `#151517`，主题一确定就撤（boot.js:26-29） |
| `#wt-home-css` + `#wt-theme-css` | home.js 内联 + link | `document_idle` | 面板与课表的全部样式；theme.css 在这里再挂一次（home.js:5855-5866） |
| `#wt-sr-style` | search.js 内联 | `document_idle` | BW Search 与设置弹层（search.js:384-387） |

主题开关就是一个属性：`html[data-wt-theme="dark"]`。boot.js 首帧按 `localStorage['wesleyTheme']` 设（boot.js:12），home/search 后来维持（home.js:5763、search.js:2336）。

`#wt-boot-chrome` 全仓库只出现一次（boot.js:49），没有别处重建。它只管首帧那一下，别指望它维持。

## 为什么非得 !important

theme.css 走 `document_start`，home/search 的样式表在 idle 之后才挂。同一元素上后写的赢，所以 theme.css 的暗色规则一律带 `!important`（PROGRESS.md:60）。全文 389 处，文件 889 行。

更麻烦的是站点自己的变量链：`button:hover` 那条规则权重 0,1,1，我们的单类只有 0,1,0，硬压得叠两层选择器，越叠越脆。现在的做法是把它的变量改成透明，让站点规则照样赢、但算出来是空（theme.css:857-862）：

```css
[data-wt-ui]{--sbx-color-foreground-primary:transparent;--content-ui-hover:transparent}
```

同一招在别处也用过：`section.right-small .wt-sr-setbtn`（0,3,0）压过 search.js 的 0,2,0（PROGRESS.md:845）。

## 踩过的坑

| 坑 | 症状 | 现在怎么办 |
|---|---|---|
| 锁搜索框 width | 站点靠 `:hover{width:100%}` 展开，钉成 48px 后 hover 时 form 从 x=1280 跳到 1159、输入框剩 1px（PROGRESS.md:1026） | 只改 `right`，现 170px（boot.js:41-43） |
| 用 `!important` 硬盖颜色语义 | 老师的彩字被一刀切成白字，红绿全丢 | 按亮度提亮：`DARK_BELOW=0.34` 才动，色相不动（color-fix.js:11-13、54-66） |
| logo 整块反白 | 紫色方块 logo 被刷成白砖 | 只对 `skin_logo_large` 用滤镜，`skin_logo_square` 排除（color-fix.js:86-87） |
| CSS 字符串漏逗号 | 悬空选择器 `html.wt-perf[data-wt-theme="dark"], ` 把下一条 `.wt-nextday-btn{font-size:11px}` 拼成一条，`html` 拿到 11px，整站缩小（站点全用 rem，PROGRESS.md:18） | 拼接后过一遍语法，量 `html` 的 computed font-size |
| 60px 空白条 | 站点给 `table.timetable` 留 `margin-bottom:60px`，套在 `.scrollable` 里成一条白带（home.js:853-856） | 见下 |
| 首帧闪白 | 明暗靠 localStorage 镜像猜，镜像过期就画错；最亮帧 mean 98 / 近白 15.9%，修后 80.7 / 0.3%（PROGRESS.md:1105-1106） | 镜像之后再向 `chrome.storage` 要一次真值（boot.js:16-35） |
| `hidden` 不生效 | `.wt-dueset-pop{display:flex}` 压过 UA 的 `[hidden]`（PROGRESS.md:632-633） | 补 `[hidden]{display:none !important}` |
| `background` 简写 | 把站点 select 的箭头 `background-image` 一带带没了，自绘箭头平铺成锯齿（PROGRESS.md:742） | 拆成三条属性各写 |

空白条的具体修法（home.js:853-858）：

```css
table.timetable.wt-table{margin-bottom:0 !important}
#content .island .scrollable{height:auto !important}
```

## 别碰的地方

- `.scrollable.wt-tt-wrap` 的 height 别动（home.js:857-858）。一动周末的合成课表就抖，只修 `.island .scrollable`。
- 别在 `<head>` 挂常驻过渡表。站点 62ms 重写 class，还会清掉不认识的 `<style>`（theme.css:865-870）。亮暗过渡试过三种全放弃了：整屏蒙版、常驻 transition 类、`adoptedStyleSheets` 临时表，最后就是不做（home.js:5756-5759）。
- 新版搜索页是 `.sbx-island`，`.island` 那串规则管不到，必须单独补一层（theme.css:877-880）。
- `overflow:clip` 才不产生滚动容器（PROGRESS.md:646）。换日动画用 `auto` 会冒滚动条轨道。

## 两处容易改错的地方

- `theme.css` 里 `html[data-wt-theme="dark"]` 出现在 L28 和 L58 各一次。同名变量后者说了算，只改 L28 那份不生效，改深色 token 直接从 L58 往下看。
- `calListTable`（`home.js:6351`）没有 `thead`，看着像漏了。有说法是加上去 FullCalendar 会把表头挪到 `left:-9090px`，这一点我没复现，动之前先在日历视图里实试一次。

## 读哪里

- 管道：`extension/boot.js:1-59`、`extension/home.js:5855-5866`、`extension/search.js:384-387`
- 权重战与站点清 style：`extension/theme.css:843-880`
- 空白条与过渡的取舍：`extension/home.js:853-858`、`:5756-5759`
- 颜色纠正：`extension/color-fix.js:11-13`、`:54-66`、`:86-87`

---
上级：[[400-知识库/00-知识库总览|知识库总览]] · 相关：[[400-知识库/01-Schoolbox站点结构|站点结构]] · [[200-界面/00-界面总览|界面总览]]
