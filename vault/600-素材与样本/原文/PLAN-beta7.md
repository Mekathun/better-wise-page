<!-- generated: sync.py — 手改会被覆盖，要改去改 PROGRESS.md 或 100-/200-/400-/500- 里的手写笔记 -->
---
type: source-doc
source: docs/PLAN-beta7.md
bytes: 5390
tokens: 1476
date: 2026-11-15
---

# PLAN-beta7

> 原件：`D:\DSH\Better_WiSE\docs\PLAN-beta7.md`

# beta7 计划（暗色做完 + 功能补强）

时间：2026-11-05 夜（用户给整晚）

## 0. 测试环境（已就绪，勿重启）
- 带扩展的 Edge：profile `D:\DSH\Better_WiSE\tools\probe\ext-profile`，端口 9701，
  extension 通过 CDP `Extensions.loadUnpacked{path:'D:\\DSH\\Better_WiSE\\extension'}` 加载（id `ecdedhcfflmobjlbcfanknhcpnnchefi`）。
- 改动后：`Extensions.loadUnpacked` 再调一次 + `Page.reload`，即可看到新代码。
- ⚠️ 该窗口 `document.hidden === true` → 扩展会挂 `wt-hidden`（暂停动画）。要验动画必须 `Page.bringToFront()` 或看真实窗口。
- 探针脚本目录 `tools/probe/`：`verify-reattach.mjs`（面板存活 110s 验证）、`pages-dark.mjs`（逐页白块扫描）、`popup-dark.mjs`（弹窗截图）、`media.mjs`（媒体查询）。

> 2026-11-05 收尾状态：§2、§4 全部做完并逐项截图核对过，§5 只剩「推 GitHub / 同步 OneDrive」等用户批准，
> 以及把包传到 FB —— 文件站整机连不上（`mekathun.tplinkdns.com:11451` curl 超时），恢复后跑 `bash tools/fb-upload.sh debug`。
> §3 的意图（设置入口只剩右上角齿轮）已达成，但做法不是删链接：面板里那个 `Settings` 是「这一栏显示哪些卡片」的卡片选择器，
> 和全站设置是两回事，所以把它的文案改成了 `Cards`，两处不再混淆。

## 1. 已修（本轮已完成）
- **面板被站点抹掉**：首页 SPA 每 ~70s 重绘一次，把插在 `[data-timetable-header]` 后面的 panel 一起删掉。
  现在保存 `WT_HOST` 引用，MutationObserver 发现 `!WT_HOST.isConnected` 就把它**原地挂回**（日志 `panel re-attached`），实测 110s 不掉。
- **manifest 不匹配首页**：首页已是 `/dashboard`，matches 已补 `dashboard`。
- **主题切换不动背景**：`paintPageBackground()` 接管 `body` 内联渐变。
- **紫色残留**：`#c9a6ea` 字面量全替换；accent token 改中性。

## 2. 暗色收尾清单（逐项实测 + 截图）
### 2.1 站点页面
- [x] `/dashboard`：日历空行、事件条文字、tile 磁贴、upcoming 区块、footer
- [x] `/learning/classes`：学期切换按钮、卡片 hover、右侧栏
- [x] `/news`：tab 激活态、帖子图片边框、Read More 链接、右侧栏
- [x] `/calendar/week`：全天行、事件条、今天列、toolbar 按钮（Filters/List/Month/Week/Day/Export）
- [x] `/timetable`：表头、科目格文字、hover
- [x] 真实路由复核：`/learning/due`、`/learning/grades/21585`、`/groups`、`/pastoral/student/21585`（原来的 `/due-work`、`/mypages`、`/activities` 是 404，审了个寂寞）
### 2.2 扩展自身
- [x] panel：summary 头、tabs、task 卡、due 卡、custom 卡、折叠区、empty/loading/skeleton
- [ ] alert 提醒条、AI 状态条、warn 条、snackbar、toast
- [x] 模态：head、关闭/箭头、正文、附件列表、链接、状态行、confirm 弹窗
- [x] 设置弹层（set-pop）、AI 开关、输入框、range、chip
- [x] 搜索面板（气泡 + Ctrl+K）：输入框、结果行、高亮词、筛选器、状态行、滚动条
- [x] 下一天课表弹层、周末合成课表
- [x] 滚动条、::selection、focus-visible 环、图片占位

### 2.3 统一细节
- [ ] 暗色阴影：`--wt-t-shadow` 应用到 panel/modal/popover/snackbar
- [ ] 半透明玻璃在暗色下改 `rgba(30,30,34,.72)` 级别，不要发灰
- [ ] 检查对比度：正文 ≥ 4.5:1，次要文字 ≥ 3:1

## 3. 设置页入口统一
- 站点右上角齿轮（`#wt-settings-btn` 一类）作为**唯一**入口，点开设置弹层。
- 去掉 panel 底部的 “Settings” 链接（同功能重复）。
- popup 里保留 Settings 链接（那是扩展自己的弹窗，不冲突）。

## 4. 功能补强（按价值排序，做完一项打勾）
1. [x] **下一天课表整页切换**：不只是弹窗，按钮切到明天/下一个上学日，panel 头显示“Wed 6 Nov”，再点回今天。
2. [x] **面板内快速动作**：全部标已读、强制刷新数据、跳到该课 homepage。
3. [x] **搜索增强**：结果里高亮命中词；记住最近 5 条查询；`Esc` 清空；`Ctrl+Enter` 打开第一条。
4. [x] **到期排序与分组**：Due 里按“今天/明天/本周/以后”分组，紧急度 chip 颜色中性化。
5. [x] **键盘快捷键**：`Alt+K` 搜索、`Alt+T` 切今天/明天、`Alt+D` 展开 Due。
6. [x] **课程别名**（已有）+ 别名同步到弹窗 tab、搜索、Due。
7. [x] **面板折叠记忆**：记住各区块展开状态（storage）。
8. [x] **离线降级**：抓不到日历/公告时用缓存 + 顶部提示“正在用缓存数据，X 分钟前”。
9. [x] **日志一键导出**：开发者区已有 Download debug logs → 补 `Auto-export on error`（频率限制 1/10min）。

## 5. 交付
- [x] `node --check` 全绿；`node build/test-news-alert.mjs`、`node build/test-crawl.mjs` 全 PASS
- [x] 版本 0.1.1.24（显示 `0.1.1-beta24`）—— 原计划的 0.1.1.7 编号早被 beta23 超过了
- [x] `node extension/build-extension.mjs` → `Better_WiSE_v0.1.1-beta24.zip`
- [x] 截图汇总：`tools/probe/shots/*.png`（暗色逐页 + 面板 + 模态 + 抽屉 + 搜索 + 亮色对照）
- [ ] 推 GitHub / 同步 OneDrive：**等用户批准**

---
上级：[[600-素材与样本/00-原文索引|原文索引]]
