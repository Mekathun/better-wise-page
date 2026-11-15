<!-- generated: sync.py — 手改会被覆盖，要改去改 PROGRESS.md 或 100-/200-/400-/500- 里的手写笔记 -->
---
type: source-doc
source: docs/RELEASE-0.1.2.4.md
bytes: 2843
tokens: 757
date: 2026-11-15
---

# RELEASE-0.1.2.4

> 原件：`D:\DSH\Better_WiSE\docs\RELEASE-0.1.2.4.md`

# Better WiSE 0.1.2.4

This release takes the AI feature out. Everything else works the same.

## English

**AI removed.** The task cards under Today's plan were previously filled by a language model when AI was switched on. That code, the switch, the API key field, the base URL and the model names are gone. Cards are built by a local parser that reads the post text, which is what already happened whenever AI was off.

**One host left.** The manifest asked for three hosts: the school site, Microsoft's sign-in page and Google's model endpoint. The sign-in host was never used by any script, and the model endpoint was only for AI. Both are gone. The extension now connects to `wise.wesleycollege.net` and nothing else.

**Old settings cleared.** On the first run after updating, the extension deletes the model settings and API keys left in storage by earlier versions, plus the AI task cache. It also drops the saved day snapshot once, because that snapshot could contain task text written by the model. The snapshot is rebuilt from the site on the next load.

**Class-page card removed.** `content.js` was the old panel that sat on individual class pages and offered "Analyse class tasks". It existed only for the AI feature, ran on one URL pattern, and nothing else called it. The file is deleted.

**Docs updated.** README and the product brief now describe the local parser and the single-host permission.

**Not changed.** Today's plan, the timetable, BW Search, the dark theme and the settings panel look and behave exactly as in 0.1.2.3.

## 中文

这一版把 AI 整个拿掉了，其余功能保持原样。

**删除 AI。** 今日计划里的任务卡，以前打开 AI 时会交给语言模型生成。相关代码、主页开关、API key 输入框、Base URL 与模型名全部删除。任务卡改由本地解析器从公告正文里提取，也就是以前 AI 关着时的做法。

**只剩一个域名。** 清单原先要了三个 host：学校站点、微软登录页、Google 模型端点。登录页全项目没有用过，模型端点只服务于 AI。两个都删了。扩展现在只连 `wise.wesleycollege.net`。

**清掉旧设置。** 更新后第一次运行会删掉旧版本留在存储里的模型设置与 API key，以及 AI 任务缓存。当日快照也会清一次，因为那份快照里可能嵌着模型写过的任务文本；下一次加载会从站点重新生成。

**删掉课程页卡片。** `content.js` 是旧版挂在单门课程页上的「分析本课任务」面板。它只服务于 AI，只在一个 URL 模式上运行，没有别处调用。文件已删除。

**文档同步。** README 与产品说明改成描述本地解析器与单域名权限。

**没有改动。** 今日计划、课表、BW Search、暗色主题、设置面板的外观与行为与 0.1.2.3 一致。

---
上级：[[600-素材与样本/00-原文索引|原文索引]]
