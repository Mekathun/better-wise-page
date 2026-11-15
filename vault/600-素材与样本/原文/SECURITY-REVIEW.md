<!-- generated: sync.py — 手改会被覆盖，要改去改 PROGRESS.md 或 100-/200-/400-/500- 里的手写笔记 -->
---
type: source-doc
source: docs/SECURITY-REVIEW.md
bytes: 7933
tokens: 1669
date: 2026-11-15
---

# SECURITY-REVIEW

> 原件：`D:\DSH\Better_WiSE\docs\SECURITY-REVIEW.md`

# Better WiSE 0.1.2.4 — security and privacy review pack

Prepared for the Wesley College network security review, November 2026.

The extension is an unofficial, student-written browser extension for the WiSE portal. This document describes what it does with data, what it is allowed to access, and what changed in 0.1.2.4 after the AI feature was removed.

## 1. Package under review

| | |
|---|---|
| File | `Better_WiSE_v0.1.2.4_store.zip` |
| Size | 264,098 bytes |
| SHA-256 | `8abe690e46d8a110d8f4d0e9c197a0cee17c4122c25edb99be4a8dbfeaf57f95` |
| Manifest | MV3, version `0.1.2.4` |
| Contents | 18 files, no build scripts, no source maps, no bundled dependencies |

Files:

```
manifest.json
boot.js  color-fix.js  home.js  search.js  pinyin-data.js  options.js
options.html  theme.css  icons/ (9 images and SVG icons)
```

`pinyin-data.js` is a static table of Chinese syllables used for search; it contains no logic and no network code.

## 2. What the extension does

It adds a layer on top of pages the student already has open on `wise.wesleycollege.net`:

- a "today's plan" panel built from posts and assessment pages,
- a timetable view that can show the next school day,
- a search box that indexes posts, files and links the student can already see,
- a dark theme for the site.

It does not log in, does not hold credentials, does not change anything on the site, and does not run outside the school domain.

## 3. Permissions, and why each exists

From `manifest.json`:

| Permission | Use |
|---|---|
| `storage` | Save settings, the local search index and a cached copy of the posts the student has already loaded |
| `host_permissions: https://wise.wesleycollege.net/*` | Read the pages and call the site's own endpoints with the student's existing session |

That is the complete list. There is no `tabs`, no `<all_urls>`, no `cookies`, no `webRequest`, no `scripting`, no `identity`, no `history`, no `downloads`, no `alarms`, no `notifications`.

What runs where, also from the manifest:

| Script | Runs on | Job |
|---|---|---|
| `boot.js`, `color-fix.js`, `theme.css` | every WiSE page, at document start | set the dark theme before first paint |
| `home.js` | home, `/home`, `/dashboard*` | panel, timetable, alerts |
| `search.js` | every WiSE page | search overlay and index |

There is no background service worker. Nothing runs when no WiSE tab is open.

## 4. Network access

All requests are relative paths, so they resolve to the current page's origin. There is no absolute external URL anywhere in the shipped JavaScript. The only absolute URLs in the package are constants inside CSS comments and the `manifest.json` host entry.

Endpoints called, all with `credentials: 'include'` or `'same-origin'`, so they use the session the student already has:

```
GET  /learning/classes
GET  /home
GET  /timetable
GET  /news/<id>
GET  /news/lists/folder/<id>
GET  /resources/<id>/nodes
GET  /api/search?keyword=...
GET  /calendar/ajax/full?start=&end=&userId=
HEAD <links on the page>, to show a file's size and type
```

There are no POST, PUT, PATCH or DELETE requests. The extension only reads.

Outbound traffic to any other host: none. In 0.1.2.3 the manifest allowed `login.microsoftonline.com` and `generativelanguage.googleapis.com`; the first was unused by any script, the second existed only for the AI feature. Both entries are gone in 0.1.2.4.

## 5. What is stored, and for how long

Everything is stored in the browser profile. Nothing is uploaded.

| Store | Contents | Lifetime |
|---|---|---|
| `chrome.storage.sync` | visual settings: theme, colours, card sizes, animation speed, shortcuts | until changed |
| `chrome.storage.local` | settings, logs, the last seen post id, cached post text for the panel | until cleared |
| `localStorage` (`wesleyLocal:*`, `wesleySearch:v6`, etc.) | the day's snapshot of posts and files the student saw, and the search index of up to 12,000 entries | the index is rescanned every 24 hours; entries older than the cap are dropped first |
| `sessionStorage` | short-lived flags such as "re-read everything after reload" | cleared when the tab closes |

No cookies are read or written. No password, token or key is stored anywhere, because the extension does not ask for one.

There is a "Clear all caches" button in the settings page. It clears `chrome.storage.local` and the WiSE tab's `localStorage` entries, then tells the student the caches are cleared. Removing the extension removes all of it.

## 6. What 0.1.2.4 removed

This release exists because of the review meeting: the AI feature was the part that could send student-visible text to a third party.

| Removed | Detail |
|---|---|
| AI task analysis | calls to a model endpoint, the API key field, the base URL field, the model names, the AI switch, the cooldown logic and the AI cache |
| `content.js` | the old class-page panel that offered "Analyse class tasks"; it existed only for the AI feature and ran on one URL pattern |
| Two host permissions | `login.microsoftonline.com` (never used) and `generativelanguage.googleapis.com` (AI only) |
| Model settings in the options page | the whole model block, the key field, the eye toggle, the AI help sheet |

Task cards are now always produced by a local parser that reads the post text with pattern rules. That is the same code path that already ran whenever AI was switched off.

On the first run after updating, the extension deletes the model settings and API keys left in storage by earlier versions, deletes the AI task cache, and drops the saved day snapshot once so that task text written by the model cannot survive the upgrade. A marker key (`wesleyNoAi:v124`) makes sure the snapshot is only dropped once.

## 7. How to verify this independently

1. Unzip the package into a folder.
2. Open `manifest.json`. Check `permissions` (one entry), `host_permissions` (one entry) and the absence of `background`, `web_accessible_resources` entries outside the WiSE host, and `key`.
3. Search the JavaScript for network calls:

   ```
   grep -rn "fetch(\|XMLHttpRequest\|https\?://" *.js
   ```

   Every `fetch` is a relative path except `chrome.runtime.getURL('theme.css')`, which reads a file from the package.
4. Search for anything that executes remote code:

   ```
   grep -rn "eval(\|new Function\|importScripts\|document.write" *.js
   ```

   No matches.
5. Load the folder at `chrome://extensions` with Developer mode, open a WiSE tab with DevTools open, and filter the Network panel to XHR/Fetch. Every request goes to `wise.wesleycollege.net`. Leave the tab open for a few minutes and reload; no other host appears.
6. Open the settings page and press "Clear all caches", then check Application, Local Storage: the `wesley*` keys are gone.

## 8. Residual risk, stated plainly

- The extension reads pages with the student's own session. Anything the student can see, it can read and cache. That cache is stored in the browser profile on that machine, so another person using the same profile could read it. The clear button and the profile's own site-data controls remove it.
- The search index also stores the names of files, posts and links the student can already see. It is local, bounded to 12,000 entries, and rescanned daily.
- The extension is not signed by the school and does not talk to any school API beyond the pages the browser already loads. A native script integrated into the site would have the same data access; the difference is that this one runs as an extension.
- No statement here should be read as a claim of zero access. The extension has read access to authorized WiSE pages, which is what any page-level feature has.

## 9. Contact

Chris Guo, Year 10. `chris.guo@wesleycollege.edu.au` or `2561845384@qq.com`.

Source code is available on request, and the whole package is small enough to be read end to end: about 9,000 lines of JavaScript, no minification, no third-party libraries.

---
上级：[[600-素材与样本/00-原文索引|原文索引]]
