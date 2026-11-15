<!-- generated: sync.py — 手改会被覆盖，要改去改 PROGRESS.md 或 100-/200-/400-/500- 里的手写笔记 -->
---
type: source-doc
source: docs/store-publishing-notes.md
bytes: 2792
tokens: 778
date: 2026-11-15
---

# store-publishing-notes

> 原件：`D:\DSH\Better_WiSE\docs\store-publishing-notes.md`

# Store publishing notes / 商店发布笔记

> 关于 Chrome Web Store 与 Edge Add-ons 的分发、更新与代码保护，一次性的结论记录。
> Research notes on publishing, auto-update and code protection.

## 1. 要不要两个店都上 / Should we publish to both stores?

| 项目 | Chrome Web Store | Microsoft Edge Add-ons |
|---|---|---|
| 注册费 | 一次性 US$5（已付） | 免费 |
| 账号 | Google 账号 | Microsoft 账号 + 合作伙伴中心 |
| 审核 | 通常 1–3 天 | 通常更快 |
| 包格式 | 上传 ZIP，商店签名 | 同一个 ZIP 可直接复用 |

建议：**两个都上**。学校电脑默认浏览器是 Edge，Edge 用户从商店直接装比“打开允许其他商店”体验好太多。
发布顺序：先 Chrome → 过审 → 同一个 zip 传 Edge。**版本号必须永远保持一致**。

主攻目标：`https://wise.wesleycollege.net` 的学生。

## 2. 商店能保护到什么程度 / How much does the store protect the code?

- 商店签名（CRX3）只保证**完整性**：别人不能篡改你的包再分发
- **没有任何保密性**：商店下发的 `.crx` 就是 ZIP + 12 字节头，去掉头即可解包；已安装的用户也能在 `chrome-extension://<id>/` 里读到每个文件
- 官方政策**禁止混淆代码**：[Code Readability Requirements](https://developer.chrome.com/docs/webstore/program-policies/code-readability) 明确写了 *Developers must not obfuscate code or conceal functionality*，只允许 minify（删空白/注释、缩短变量名、合并文件）

结论：前端代码最终是保不住的。可用的合规手段只有压缩、不开源仓库、把核心逻辑放后端、License 校验。

## 3. 更新怎么同步 / How updates roll out

1. 开发者后台 → Package → 上传新 zip
2. `manifest.json` 的 `version` 必须**大于线上版本**（四段数字，每段 ≤ 65535）
3. 审核通过后自动推送；浏览器每几小时检查一次 `clients2.google.com/service/update2/crx`
4. 用户无需任何操作

注意：
- 开发者模式（load unpacked）安装的**不会自动更新**
- 新增权限会让用户被要求重新确认，发布前把权限一次性定好
- Chrome 和 Edge 是两条独立流水线，不会互相同步

## 4. 上架前清单 / Pre-release checklist

- [x] 128×128 图标
- [ ] 截图 1280×800（建议 3 张：首页面板 / 搜索结果 / 设置面板）
- [ ] 小宣传图 440×280
- [ ] 隐私政策 URL（内容简单：只存本地、不收集数据）
- [ ] 商店描述（`PRODUCT.md` 压缩到 1/10）
- [ ] 单用途说明（统一成“增强 WiSE 门户”，避免被判多用途）
- [ ] 品牌风险：名称标注 unofficial，描述首句写明非官方产品

---
上级：[[600-素材与样本/00-原文索引|原文索引]]
