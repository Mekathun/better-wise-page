<!-- generated: sync.py — 手改会被覆盖，要改去改 PROGRESS.md 或 100-/200-/400-/500- 里的手写笔记 -->
---
type: source-doc
source: docs/README.txt
bytes: 1600
tokens: 363
date: 2026-11-15
---

# README

> 原件：`D:\DSH\Better_WiSE\docs\README.txt`

WiSE Next Class & Tasks — browser extension

What it does
- Toolbar popup: infers the next class from the timetable and shows that class's latest post.
- On wise.wesleycollege.net class pages: injects a "Class tasks" card grid at the top of the content column.
  Gemini reads the latest announcement and extracts classwork / homework / exam / resource items.
  Click a card to expand it; use "Re-analyse" to clear the cache and run again.
- Card colours come from each class's colour on the My Classes page.
- Layout: same width as the site's content column (8 columns on wide screens, full width when the
  right column collapses). It never covers the calendar / teachers / files column.

Install
1. Unzip wesley-cards-extension.zip.
2. Open edge://extensions (or chrome://extensions) and turn on Developer mode.
3. Click "Load unpacked" and pick the unzipped folder.
4. Optional: pin the icon. Click it to open the popup.

Settings
- Right-click the icon -> Options (or the Settings link in the popup).
- Language: English / 中文 (the extension defaults to English).
- Fast model (default gemini-3.6-flash, ~2-4 s) and deep model (default gemini-3.8-flash, runs in the
  background after the fast result and may take 45-200 s; it then replaces the cards).
- Gemini API key (prefilled; replace with your own if needed).
- Toggle the in-page task cards on/off.

Notes
- The embedded snapshot is used by the popup when the browser is not signed in to WiSE.
- Results are cached per post for 7 days in the page's localStorage.
- The API key is stored in the extension; keep the .crx / zip private.

---
上级：[[600-素材与样本/00-原文索引|原文索引]]
