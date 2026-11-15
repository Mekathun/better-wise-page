# Better WiSE 项目归档

Wesley College WiSE 门户增强插件（浏览器扩展）的全部资料：源码、文档、会话记录、设计素材、宣传片。

- 版本：0.1.2.17
- 扩展 ID：`ecdedhcfflmobjlbcfanknhcpnnchefi`
- 位置：`D:\DSH\Better_WiSE`（这个目录同时是 DSH 工作区，会话都在这）
- 这份 README 写于 2026-11-03，之后 40 多轮的改动没回填。**当前状态以 `vault\` 为准。**

## 先看记忆库

`vault\` 是这个仓库的 Obsidian 知识库：`PROGRESS.md` 的每一轮拆成一篇、带行号回链，`docs\` 的原文全部并入，加上手写的界面/知识/决策卡。用 Obsidian 打开 `vault\` 即可；或者让 AI 读 `vault\000-入口\00-首页.md`，它按触发词表自己往下取。

```
python vault\scripts\sync.py     # PROGRESS.md 变了之后重建轮次笔记 + L0
python vault\scripts\check.py    # 断链 / 缺属性 / 孤儿 / 超预算 / 敏感串
```

---

## 目录结构

```
D:\DSH\Better_WiSE\
├─ Better_WiSE_v0.1.2.17.crx      双击安装（另有 0.0.1 → 0.1.2.17 的历史产物）
├─ Better_WiSE_v0.1.2.17.zip      load unpacked
├─ README.md
│
├─ extension\                    开发目录（从老 workspace 整个搬来的）
│   ├─ manifest.json / home.js / search.js / content.js / pinyin-data.js
│   ├─ options.html / options.js / popup.* / background.js
│   ├─ icons\                    图标与按钮 SVG
│   ├─ snapshot.json             离线快照
│   └─ build-extension.mjs       打包脚本（zip + CRX3，产物按版本号落到上级目录）
│
├─ docs\
│   ├─ PRODUCT.md                产品介绍
│   ├─ README.txt                初版说明（内容偏旧，留作对比）
│   ├─ email-to-ms-siritzky.md   给导师的邮件（logo 授权与上架审批）
│   └─ store-publishing-notes.md 商店发布笔记
│
├─ sessions\                     10 次会话
│   ├─ raw\                      .jsonl.zstd 原件
│   ├─ readable\                 剔除工具调用后的纯对话
│   └─ manifest.json
│
├─ design\
│   ├─ switch-prototypes\        总开关「碗」的 18 个原型
│   ├─ icons\                    同一套 SVG 的副本
│   ├─ screenshots\              519 张开发截图
│   └─ scratch\                  早期草稿：登录页副本、root.html、任务卡截图
│
├─ promo\                        宣传片
│   ├─ better-wise-film.mp4      成片（47 MB）
│   ├─ project\                  完整工程：脚本、分镜、Remotion 源码、素材、配音
│   └─ plugin-intro\             另一支短的插件介绍片
│
├─ build\
│   ├─ build-extension.mjs       打包脚本副本
│   ├─ wesley-cards-extension-key.pem   ⚠️ 私有签名密钥
│   ├─ README-WARNING.md
│   └─ archive\                  wesley-cards-dsh-plugin.zip
│
├─ legacy\0.0.100\               最早能跑的版本（旧代码留存，不参与打包）
├─ data\wesley-wise\             抓下来的站点快照，21 MB（打包时被嵌进 snapshot.json）
└─ tools\
    ├─ move-sessions.py          会话迁移脚本
    └─ move-sessions.cmd         双击版
```

---

## 会话

`readable\` 里每个文件是一次完整对话，工具调用和模型思考都剔掉了，只剩人跟助手的往来。

| 日期 | 会话 | 内容 |
|---|---|---|
| 11-01 | `cc8f408d` | 最初搭建：登录 WiSE、嗅探接口、公告变卡片 |
| 11-01 | `1ab0cf99` | 同日另一条分支，同一条起步线 |
| 11-02 | `2433e411` | 主体开发：首页面板、课表、模态、搜索雏形 |
| 11-02 | `dacaf718` | 继续开发、动效遍扫、Bug 修复（0.0.100 到 0.0.127） |
| 11-02 | `4cdee618` | 用 video-shotcraft 做宣传片 |
| 11-02 | `b61d3832` | 宣传片子会话：录制工程师 |
| 11-02 | `3a373ff7` | 宣传片子会话：配乐与节拍 |
| 11-02 | `be1e8251` | 宣传片子会话：独立 QA 审片 |
| 11-02 | `9589ce6f` | 复盘：读前两个会话做总结 |
| 11-03 | `146a5841` | 去内置 key、AI 灰显、多模型支持、商店咨询 |

前 9 个已经搬进这个工作区，打开 DSH 就能看到。第 10 个（`146a5841`）是搬迁时正在跑的那个会话，还留在老工作区；彻底退出 DSH 之后双击 `tools\move-sessions.cmd` 就会把它补过来。脚本会跳过已经搬好的，只补剩下的。

---

## 使用

安装扩展：

1. 双击 `Better_WiSE_v0.1.2.17.crx`。Edge 要先在 `edge://extensions` 打开开发者模式
2. 或者解压 `Better_WiSE_v0.1.2.17.zip`，在 `edge://extensions` 里选「加载解压缩的扩展」

日常：

- 打开 `https://wise.wesleycollege.net/`，首页出现任务面板
- `Ctrl/⌘ + K` 打开全局搜索
- 右上角齿轮进设置，搜索气泡可以拖进导航栏停靠

扩展不收集用户数据：没有账号、没有统计、没有开发者服务器，只读你已经能看到的 WiSE 页面，设置存在本机浏览器里。

改完代码：

```
cd D:\DSH\Better_WiSE\extension
node build-extension.mjs
```

产物会按版本号落到 `D:\DSH\Better_WiSE\` 根目录。

---

## 注意事项

签名密钥 `build\wesley-cards-extension-key.pem` 不要外传。丢了扩展 ID 会变，已经装的人没法平滑升级；泄露了别人能用同一个 ID 签发恶意更新。

宣传片的渲染中间帧（约 4 GB）没搬过来，只留了成片和工程源码。那些帧随时能重渲。

`design\screenshots\` 是开发时用 headless Edge 截的过程图，按迭代批次命名，不是最终产品图。

产品的名字和配色用了 Wesley 的紫色体系。校徽和 WiSE 名称的授权还在申请，见 `docs\email-to-ms-siritzky.md`。上架的结论记在 `docs\store-publishing-notes.md`。

---

## 迁移脚本怎么做的

会话的归属由四处共同决定，缺一处就会出问题：

| 位置 | 内容 |
|---|---|
| `~/.dsh/sessions/<工作区key>/<session-id>/` | 会话本体，目录名是工作区路径的编码 |
| 会话文件第一行 | `cwd` |
| `~/.dsh/storages/workspace.json` | 工作区对应哪些 sessionIds |
| `~/.dsh/storages/session_projcache/sessions/*.json` | 缓存里的 `identity.cwd` |

`tools\move-sessions.py` 把这四处一起改，改之前会备份。跑之前要完全退出 DSH，否则客户端退出时会拿内存里的旧索引覆盖回去。

跑完发现侧栏还是空的，就再跑一次 `tools\move-sessions.cmd`。文件已经搬好的它不会再搬，只补索引。
