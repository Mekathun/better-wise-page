// Better WiSE — global search
// 入口：悬浮气泡（默认头像下方，可拖拽、可停靠到导航栏）+ Ctrl/⌘+K
// 数据：本地索引（公告/公告附件/resources 文件/链接）+ 站点原生 /api/search（近一年 News/文件/页面）
// 匹配：字面 + 同义词 + 拼音（含 1 处容错）
(() => {
  // 用 DOM 标记去重：内容脚本可能被注入多次（多个实例会各建一个气泡）
  if (document.documentElement.dataset.wtSrLoaded === '1') return;
  if (window.__wtSearchLoaded) return;
  document.documentElement.dataset.wtSrLoaded = '1';
  window.__wtSearchLoaded = true;

  const IDX_KEY = 'wesleySearch:v6';
  /* 索引结构版本：变了就静默重爬一次，比如这次加了文件 MIME */
  const IDX_SCHEMA = 2;
  const IDX_KEY_OLD = 'wesleySearch:v5';
  const UI_KEY = 'wesleySearchUI:v1';
  const TTL = 24 * 3600 * 1000;      // 整个索引一天刷新一次
  const CLASS_TTL = 24 * 3600 * 1000; // 每门课自己的一天，只重爬过期的
  const MAX_ENTRIES = 12000;          // 本地最多留这么多条，按时间裁最旧的
  const SRV_TTL = 60 * 1000;          // 原生搜索结果的短缓存
  const MAX_CLASSES = 40;
  const MAX_POSTS_PER_CLASS = 30;
  const DEEP_POSTS_PER_CLASS = 6;
  const DEEP_MAX_AGE_DAYS = 240;
  const SERVER_DEBOUNCE = 220;

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'post', label: 'Posts' },
    { key: 'file', label: 'Files' },
    { key: 'link', label: 'Links' },
    { key: 'page', label: 'Pages' },
  ];
  const SERVER_TYPES = {
    all: [],
    post: ['news', 'blog', 'forum'],
    file: ['file', 'file.document', 'file.image', 'file.audio', 'file.video', 'file.other'],
    link: ['link'],
    page: ['page', 'page.unit', 'page.course', 'page.class', 'page.homepage', 'page.folder', 'page.group'],
  };
  const T_OF_TYPE = (t) => {
    const s = String(t || '');
    if (s.startsWith('file')) return 'file';
    if (s === 'link') return 'link';
    if (s === 'news' || s === 'blog' || s === 'forum') return 'post';
    if (s.startsWith('page')) return 'page';
    return 'page';
  };

  const state = {
    entries: [],
    at: 0,
    clsAt: {},
    srv: new Map(),
    crawling: false,
    note: '',
    progress: { done: 0, total: 0 },
    open: false,
    sel: 0,
    results: [],
    query: '',
    filter: 'all',
    fileKind: 'all',
    qp: null,
    server: [],
    serverFor: '',
    serverKey: '',
    serverBusy: false,
    serverErr: '',
    reqId: 0,
  };

  /* ================= 同义词 / 缩写 ================= */
  const SUBJECT_ALIASES = [
    [/phys(ical)?\s*(&|and)?\s*health|p\.?h\.?e|\bpe\b/i, 'pe phe phed physed physical education health sport hpe'],
    [/individuals?\s*(&|and)\s*societ/i, 'ias hass humanities social studies geography history commerce'],
    [/lang(uage)?\s*acquisition\s*:?\s*english|english as an additional language/i, 'lae eal esl english second language'],
    [/mathematical\s*methods|maths?\s*methods/i, 'mme methods math maths mathematics'],
    [/specialist\s*mathemat/i, 'spm specialist maths mathematics'],
    [/language\s*(&|and)\s*literature/i, 'llc literature chinese lang lit'],
    [/\bscience\b/i, 'sci science biology chemistry physics'],
    [/\benglish\b/i, 'eng english'],
    [/tutor\s*group/i, 'tut tutor homeroom roll call pastoral'],
    [/visual\s*art|\bart\b/i, 'art visual arts'],
    [/\bmusic\b/i, 'mus music'],
    [/design|technolog/i, 'dt design tech technology'],
    [/bridging/i, 'bridging eal eab'],
  ];
  const QUERY_SYNONYMS = {
    pe: ['pe', 'phe', 'physed', 'physical education', 'phys & health'],
    phe: ['phe', 'pe', 'physical'],
    physed: ['physed', 'pe', 'phe'],
    lae: ['lae', 'lang acquisition', 'english additional'],
    eal: ['eal', 'english as an additional language', 'bridging'],
    ias: ['ias', 'individuals and societies'],
    hass: ['hass', 'humanities', 'individuals and societies'],
    mme: ['mme', 'mathematical methods', 'methods'],
    llc: ['llc', 'language and literature', 'literature'],
    sci: ['sci', 'science'],
    tut: ['tut', 'tutor group'],
    hw: ['hw', 'homework'],
    ws: ['ws', 'worksheet'],
    exam: ['exam', 'examination', 'test'],
  };

  function aliasText(...names) {
    const out = [];
    for (const n of names) {
      const s = String(n || '');
      if (!s) continue;
      for (const [re, add] of SUBJECT_ALIASES) if (re.test(s)) out.push(add);
    }
    return [...new Set(out.join(' ').split(/\s+/).filter(Boolean))].join(' ');
  }

  /* ================= 拼音 ================= */
  let PY_MAP = null;
  function pyMap() {
    if (PY_MAP) return PY_MAP;
    PY_MAP = Object.create(null);
    const src = window.__WT_PINYIN || {};
    for (const syl in src) {
      const chars = src[syl];
      for (let i = 0; i < chars.length; i++) PY_MAP[chars[i]] = syl;
    }
    return PY_MAP;
  }
  function pinyinOf(text) {
    const m = pyMap();
    let full = '';
    const syls = [];
    const inis = [];
    let count = 0;
    for (const ch of String(text || '')) {
      const p = m[ch];
      if (p) { full += p; syls.push(p); inis.push(p[0]); count += 1; }
      else if (/[a-z0-9]/i.test(ch)) {
        const l = ch.toLowerCase();
        full += l;
        syls.push(l);
        inis.push(l);
      }
      if (count > 420) break;
    }
    return { full, syl: ' ' + syls.join(' ') + ' ', iniS: ' ' + inis.join(' ') + ' ', ini: inis.join('') };
  }
  function entryPinyin(e) {
    if (e._py !== undefined) return e;
    const text = [e.title, e.body, e.cls, e.aliases].filter(Boolean).join(' ').slice(0, 900);
    const p = pinyinOf(text);
    e._py = p.full;
    e._syl = p.syl;
    e._iniS = p.iniS;
    e._ini = p.ini;
    return e;
  }
  function nearIncludes(hay, needle) {
    if (!hay || !needle || needle.length < 4) return false;
    const n = needle.length;
    const near = (a, b) => {
      if (Math.abs(a.length - b.length) > 1) return false;
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
      if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
      if (a.length > b.length) return a.slice(i + 1) === b.slice(i);
      return a.slice(i) === b.slice(i + 1);
    };
    for (let i = 0; i + n <= hay.length; i++) if (near(hay.slice(i, i + n), needle)) return true;
    for (let i = 0; i + n + 1 <= hay.length; i++) if (near(hay.slice(i, i + n + 1), needle)) return true;
    return false;
  }

  /* ================= DOM helpers ================= */
  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    /* 站点 button:hover/button:focus（0,1,1）会把背景刷白，单类选择器压不住。
       打上标记，由 theme.css 的 [data-wt-ui] 把站点那几个变量归零。 */
    node.setAttribute('data-wt-ui', '');
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'style') node.style.cssText = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else node.setAttribute(k, v);
      }
    }
    for (const c of children) if (c != null) node.append(c.nodeType ? c : document.createTextNode(String(c)));
    return node;
  }
  const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ICON = {
    post: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h6"/></svg>',
    file: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 3v5h5"/><path d="M19 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9l5 5v12a1 1 0 0 1-1 1z"/></svg>',
    folder: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>',
    link: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></svg>',
    page: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/><path d="M8.5 11h5" stroke-linecap="round"/></svg>',
  };

  const CSS = `
.wt-sr-fab{position:fixed;z-index:2147483400;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:linear-gradient(145deg,#8b4f9c,#6b3a79);color:#fff;display:flex;align-items:center;justify-content:center;cursor:grab;padding:0;transition:background .18s ease,transform .16s cubic-bezier(.34,1.56,.64,1);touch-action:none;user-select:none;-webkit-user-select:none;}
.wt-sr-fab:hover{background:linear-gradient(145deg,#a06bb0,#8b4f9c);}
.wt-sr-fab.dragging{cursor:grabbing;transition:none;}
.wt-sr-fab svg{pointer-events:none;color:#fff;}

.wt-sr-dock-li{display:list-item !important;visibility:visible !important;background:transparent !important;list-style:none;}
.wt-sr-dock-li > a.wt-sr-dock-a{display:flex !important;visibility:visible !important;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;height:100%;box-sizing:border-box;padding:14px 9px 0;font-size:15px !important;line-height:24px !important;color:inherit !important;text-decoration:none !important;cursor:grab;user-select:none;-webkit-user-select:none;-webkit-user-drag:none;}
.wt-sr-dock-li > a.wt-sr-dock-a:hover{color:inherit !important;}
.wt-sr-dock-li .wt-sr-dock-ico{display:flex;align-items:center;justify-content:center;height:24px;}
.wt-sr-dock-li .wt-sr-dock-ico svg{width:21px;height:21px;}
.wt-sr-dock-li .wt-sr-dock-txt{display:block;font-size:15px !important;line-height:24px !important;white-space:nowrap;}

.wt-sr-overlay{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:flex-start;justify-content:center;padding:11vh 16px 16px;background:rgba(28,14,34,.34);backdrop-filter:blur(6px) saturate(1.1);-webkit-backdrop-filter:blur(6px) saturate(1.1);opacity:0;transition:opacity .16s ease;font-family:Figtree,system-ui,-apple-system,"Segoe UI",sans-serif;}
.wt-sr-overlay.show{opacity:1;}
.wt-sr-card{position:relative;width:100%;max-width:700px;max-height:78vh;display:flex;flex-direction:column;background:#fff;border:1px solid rgba(100,52,111,.16);border-radius:16px;box-shadow:0 24px 60px rgba(40,16,52,.32),0 2px 6px rgba(40,16,52,.12);overflow:hidden;transform:translateY(-6px) scale(.99);transition:transform .18s cubic-bezier(.23,1,.32,1);}
.wt-sr-overlay.show .wt-sr-card{transform:none;}
.wt-sr-head{position:relative;z-index:5;display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(100,52,111,.1);}
.wt-sr-head .wt-sr-glass{flex:none;color:#64346f;display:flex;align-self:center;}
.wt-sr-input{flex:1;min-width:0;border:0 !important;outline:0 !important;box-shadow:none !important;background:none !important;font:inherit;color:#221a26;padding:0 !important;margin:0 !important;}
.wt-sr-head .wt-sr-input{height:24px !important;min-height:24px !important;line-height:24px !important;font-size:15px !important;}
.wt-sr-input:focus,.wt-sr-input:active{outline:0 !important;box-shadow:none !important;}
.wt-sr-clear{flex:none;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:rgba(100,52,111,.1);color:#64346f;cursor:pointer;padding:0;font:inherit;line-height:1;transition:background .15s;align-self:center;margin:0 !important;}
.wt-sr-head .wt-sr-clear{width:22px !important;height:22px !important;min-height:22px !important;}
.wt-sr-clear:hover{background:rgba(100,52,111,.2);}
.wt-sr-clear[hidden]{display:none;}
.wt-sr-close{flex:none;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(100,52,111,.18);background:#fff;color:#64346f;font:inherit;font-size:11px;border-radius:8px;padding:0 10px;cursor:pointer;transition:background .15s,color .15s;align-self:center;margin:0 !important;}
.wt-sr-head .wt-sr-close{height:26px !important;min-height:26px !important;line-height:20px !important;}
.wt-sr-close:hover{background:#64346f;color:#fff;border-color:#64346f;}
.wt-sr-chips{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:7px 14px;border-bottom:1px solid rgba(100,52,111,.07);background:#fbf9fd;flex-wrap:wrap;}
  .wt-sr-chips-inner.sub{animation:wt-sr-subin .18s ease both;}
  @keyframes wt-sr-subin{from{opacity:0;transform:translateY(-3px);}to{opacity:1;transform:none;}}
.wt-sr-chips-inner{position:relative;display:flex;align-items:center;gap:2px;background:#f1eaf5;border:1px solid rgba(100,52,111,.1);border-radius:10px;padding:2px;box-shadow:inset 2px 2px 5px -2px rgba(60,24,72,.16),inset -1px -1px 2px rgba(255,255,255,.7);}
.wt-sr-pill{position:absolute;left:0;top:2px;height:calc(100% - 4px);border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(60,24,72,.16),0 0 0 1px rgba(100,52,111,.07);transition:transform .3s cubic-bezier(.34,1.56,.64,1),width .3s cubic-bezier(.34,1.56,.64,1);pointer-events:none;z-index:0;}
.wt-sr-chip{position:relative;z-index:1;border:0;background:none;color:#7a6683;font:inherit;font-size:11.5px;font-weight:600;letter-spacing:.01em;border-radius:8px;padding:5px 12px;cursor:pointer;transition:color .16s ease;line-height:1.2;height:auto !important;min-height:0 !important;margin:0 !important;}
.wt-sr-chip:hover{color:#4b2f56;}
.wt-sr-chip.on{color:#5b2b67;}
.wt-sr-status{display:flex;align-items:center;gap:6px;padding:3px 14px 4px;margin:0;line-height:1.35;font-size:10.5px;color:#8a7391;border-bottom:1px solid rgba(100,52,111,.07);background:#fbf9fd;flex-wrap:wrap;}
.wt-sr-status b{color:#64346f;font-weight:650;}
.wt-sr-status .sp{margin-left:auto;display:flex;gap:6px;}
.wt-sr-refresh{border:0;background:none;font:inherit;font-size:10.5px;color:#64346f;cursor:pointer;padding:1px 6px;border-radius:6px;height:auto !important;min-height:0 !important;line-height:1.3 !important;margin:0 !important;}
.wt-sr-refresh:hover{background:rgba(100,52,111,.08);}
.wt-sr-refresh[disabled]{opacity:.45;cursor:default;}
.wt-sr-list{overflow:auto;padding:6px;flex:1;min-height:110px;}
.wt-sr-list::-webkit-scrollbar{width:10px;}
.wt-sr-list::-webkit-scrollbar-thumb{background:rgba(100,52,111,.2);border-radius:8px;border:3px solid #fff;}
.wt-sr-row{display:flex;align-items:flex-start;gap:10px;padding:9px 10px;border-radius:10px;cursor:pointer;color:#2a2430;}
.wt-sr-row.sel{background:rgba(100,52,111,.09);}
.wt-sr-row.done{opacity:.6;}
.wt-sr-badge{flex:none;width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;margin-top:1px;background:rgba(100,52,111,.1);color:#64346f;}
.wt-sr-row[data-t="file"] .wt-sr-badge{background:rgba(179,144,55,.16);color:#8a6d20;}
.wt-sr-row[data-t="link"] .wt-sr-badge{background:rgba(100,52,111,.12);color:#5c2f6b;}
.wt-sr-row[data-t="page"] .wt-sr-badge{background:rgba(90,120,180,.14);color:#3c5a8f;}
.wt-sr-main{min-width:0;flex:1;}
.wt-sr-title{font-size:13.5px;font-weight:650;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wt-sr-title mark{background:rgba(179,144,55,.35);color:#4a3410;border-radius:3px;padding:0 1px;}
.wt-sr-sub{font-size:10.5px;color:#8a7391;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wt-sr-empty{padding:26px 16px;text-align:center;font-size:12px;color:#8a7391;line-height:1.7;}
/* 最近查询（PLAN-beta7 §4.3） */
.wt-sr-glass{position:relative;cursor:help;}
.wt-sr-glass>svg{opacity:.85;}
.wt-sr-tip{position:absolute;left:-7px;top:25px;z-index:60;width:252px;background:#fff;color:#3f3747;border:1px solid rgba(100,52,111,.14);border-radius:12px;padding:10px 12px 11px;font-size:12px;line-height:1.42;box-shadow:0 14px 34px rgba(40,20,50,.22),0 2px 6px rgba(40,20,50,.08);opacity:0;transform:translateY(-3px);transition:opacity .12s ease,transform .12s ease;pointer-events:none;}
.wt-sr-tip.on{opacity:1;transform:none;}
.wt-sr-card.hc-open .wt-sr-tip{display:none;}
.wt-sr-tip b{color:#64346f;font-weight:600;}
.wt-sr-tip code{background:rgba(100,52,111,.09);color:#5d2f68;border-radius:5px;padding:1.5px 6px;font-family:inherit;font-size:11.5px;font-weight:600;letter-spacing:.01em;white-space:nowrap;}
.wt-sr-tip .wt-sr-tip-hd{font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#a396ad;margin:0 0 7px;}
.wt-sr-hovercard{position:absolute;left:10px;right:10px;top:54px;z-index:30;max-height:min(372px,58vh);overflow-y:auto;overscroll-behavior:contain;background:#fff;border:1px solid rgba(100,52,111,.14);border-radius:14px;box-shadow:0 18px 44px rgba(40,20,50,.2),0 2px 6px rgba(40,20,50,.08);padding:10px;display:none;transform:translateY(-4px);transition:opacity .15s ease,transform .15s ease;}
.wt-sr-hovercard.show{display:block;animation:wt-sr-hcin .15s ease forwards;}
@keyframes wt-sr-hcin{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.wt-sr-hc-title{font-size:9.5px;letter-spacing:.07em;text-transform:uppercase;color:#8a7391;margin:0;}
.wt-sr-hc-grid{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 5px;}
.wt-sr-hc-row{display:flex;align-items:center;gap:3px;width:auto;max-width:100%;border:0;background:rgba(100,52,111,.055);padding:5px 5px 5px 9px;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;line-height:1.3;color:#2a2430;text-align:left;min-height:0;min-width:0;}
.wt-sr-hc-row:hover{background:rgba(100,52,111,.11);}
.wt-sr-hc-row>span{flex:0 1 auto;min-width:0;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wt-sr-hc-row:hover{background:rgba(100,52,111,.07);}
.wt-sr-hc-row .wt-sr-hc-x{margin-left:0 !important;opacity:.45;border:0 !important;background:none !important;color:#a99eb1;cursor:pointer;font-size:14px !important;line-height:1 !important;padding:3px 7px !important;border-radius:6px;min-height:0 !important;height:auto !important;width:auto !important;}
.wt-sr-hc-row .wt-sr-hc-x:hover{background:rgba(160,40,60,.12);color:#a0283c;}
.wt-sr-hc-tips{margin-top:8px;border-top:1px solid rgba(100,52,111,.1);padding-top:8px;display:grid;gap:3px;}
.wt-sr-hc-tip{display:flex;gap:8px;font-size:11px;color:#6b5f73;align-items:baseline;}
.wt-sr-hc-tip code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;background:rgba(100,52,111,.08);padding:1px 5px;border-radius:5px;color:#4a3a52;flex:none;}
.wt-sr-hc-empty{font-size:11.5px;color:#8a7391;padding:4px 6px 2px;}
.wt-sr-hc-headrow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 6px;}
.wt-sr-hc-clear{min-height:0 !important;height:auto !important;margin:0;border:0;background:none;color:#8a7391;font:inherit;font-size:11px;padding:2px 4px;border-radius:6px;cursor:pointer;}
.wt-sr-hc-clear:hover{color:#64346f;}
.wt-sr-hc-clear:hover{background:rgba(100,52,111,.08);color:#5b4a63;}
.wt-sr-tip-body{display:grid;gap:3px;}
.wt-sr-tip-row{display:grid;grid-template-columns:86px 1fr;gap:9px;align-items:baseline;padding:1.5px 0;}
html[data-wt-theme="dark"] .wt-sr-hovercard{background:#232128;border-color:rgba(255,255,255,.1);box-shadow:0 18px 44px rgba(0,0,0,.5);}
html[data-wt-theme="dark"] .wt-sr-hc-title{color:#8e8a96;}
html[data-wt-theme="dark"] .wt-sr-hc-row{color:#e2dfe7;background:rgba(255,255,255,.06);}
html[data-wt-theme="dark"] .wt-sr-hc-row:hover{background:rgba(255,255,255,.12);}
.wt-sr-hc-row:hover .wt-sr-hc-x{opacity:1;}
html[data-wt-theme="dark"] .wt-sr-hc-row:hover{background:rgba(255,255,255,.07);}
html[data-wt-theme="dark"] .wt-sr-hc-row .wt-sr-hc-x{color:#8e8a96;}
html[data-wt-theme="dark"] .wt-sr-hc-row .wt-sr-hc-x:hover{background:rgba(255,120,140,.18);color:#ffb3c0;}
html[data-wt-theme="dark"] .wt-sr-hc-tips{border-top-color:rgba(255,255,255,.09);}
html[data-wt-theme="dark"] .wt-sr-hc-tip{color:#a9a3b3;}
html[data-wt-theme="dark"] .wt-sr-hc-tip code{background:rgba(255,255,255,.09);color:#d6d2dc;}
html[data-wt-theme="dark"] .wt-sr-hc-empty{color:#8e8a96;}
html[data-wt-theme="dark"] .wt-sr-hc-clear{color:#8e8a96;}
html[data-wt-theme="dark"] .wt-sr-hc-clear:hover{background:rgba(255,255,255,.07);color:#d6d2dc;}
.wt-sr-recentbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:0 16px 8px;}
.wt-sr-recentbar[hidden]{display:none;}
.wt-sr-recent-lbl{font-size:9.5px;text-transform:uppercase;letter-spacing:.07em;color:#8a7391;}
.wt-sr-recent-chip{font:inherit;font-size:11.5px;padding:3px 9px;border-radius:999px;border:1px solid rgba(100,52,111,.18);background:rgba(100,52,111,.05);color:#4a3a52;cursor:pointer;}
.wt-sr-recent-chip:hover{background:rgba(100,52,111,.11);}
html[data-wt-theme="dark"] .wt-sr-recent-lbl{color:#8e8a96;}
html[data-wt-theme="dark"] .wt-sr-recent-chip{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#d6d2dc;}
html[data-wt-theme="dark"] .wt-sr-recent-chip:hover{background:rgba(255,255,255,.11);}
.wt-sr-recent-item{display:inline-flex;align-items:center;}
.wt-sr-recent-item .wt-sr-recent-chip{border-top-right-radius:0;border-bottom-right-radius:0;border-right:0;}
.wt-sr-recent-x{border:1px solid rgba(100,52,111,.18);border-left:0;border-top-right-radius:999px;border-bottom-right-radius:999px;background:rgba(100,52,111,.05);color:#8a7391;font:inherit;font-size:11px;line-height:1;padding:3px 7px 3px 4px;cursor:pointer;}
.wt-sr-recent-x:hover{background:rgba(160,40,60,.14);color:#a0283c;}
.wt-sr-recent-clear{margin-left:auto;border:1px solid rgba(100,52,111,.18);background:transparent;color:#6b5f73;font:inherit;font-size:10.5px;padding:3px 9px;border-radius:999px;cursor:pointer;}
.wt-sr-recent-clear:hover{background:rgba(100,52,111,.1);}
html[data-wt-theme="dark"] .wt-sr-recent-x{border-color:rgba(255,255,255,.14);border-left:0;background:rgba(255,255,255,.05);color:#9a92a4;}
html[data-wt-theme="dark"] .wt-sr-recent-x:hover{background:rgba(255,120,140,.18);color:#ffb3c0;}
html[data-wt-theme="dark"] .wt-sr-recent-clear{border-color:rgba(255,255,255,.14);color:#a9a3b3;}
html[data-wt-theme="dark"] .wt-sr-recent-clear:hover{background:rgba(255,255,255,.08);}
/* 站点搜索那一组的标题 */
.wt-sr-sect{margin:10px 4px 2px;padding:6px 10px 4px;border-top:1px solid rgba(100,52,111,.12);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#8a7391;}
  .wt-sr-skel{pointer-events:none;opacity:.9;}
  .wt-sr-skel-badge{width:16px;height:16px;border-radius:5px;background:linear-gradient(90deg,#efe7f3 25%,#f7f1fa 37%,#efe7f3 63%);background-size:400% 100%;animation:wt-sr-shimmer 1.15s ease-in-out infinite;}
  .wt-sr-skel-line{height:9px;border-radius:5px;background:linear-gradient(90deg,#efe7f3 25%,#f7f1fa 37%,#efe7f3 63%);background-size:400% 100%;animation:wt-sr-shimmer 1.15s ease-in-out infinite;margin:4px 0;}
  .wt-sr-skel-line.sm{width:42%;height:8px;opacity:.75;}
  @keyframes wt-sr-shimmer{0%{background-position:100% 50%;}100%{background-position:0 50%;}}
html[data-wt-theme="dark"] .wt-sr-sect{border-top-color:rgba(255,255,255,.1);color:#8e8a96;}
html[data-wt-theme="dark"] .wt-sr-skel-badge,html[data-wt-theme="dark"] .wt-sr-skel-line{background:linear-gradient(90deg,#26232c 25%,#33303a 37%,#26232c 63%);background-size:400% 100%;}
/* 站点结果比本地略淡，视觉上退一层 */
.wt-sr-row.srv .wt-sr-title{font-weight:500;color:#4a4250;}
html[data-wt-theme="dark"] .wt-sr-row.srv .wt-sr-title{color:#c9c3d2;}
.wt-sr-foot{display:flex;align-items:center;gap:14px;padding:8px 14px;border-top:1px solid rgba(100,52,111,.08);font-size:10px;color:#8a7391;background:#fcfafd;}
.wt-sr-foot kbd{font:inherit;border:1px solid rgba(100,52,111,.18);border-radius:5px;padding:1px 5px;background:#fff;margin-right:3px;}
/* 暗色：整个搜索面板以前只有「最近查询」那几个 chip 是深色，卡片/列表/底栏还是白的 */
html[data-wt-theme="dark"] .wt-sr-overlay{background:rgba(8,4,12,.55);}
html[data-wt-theme="dark"] .wt-sr-card{background:#1c1a21;border-color:rgba(255,255,255,.1);box-shadow:0 24px 60px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.4);}
html[data-wt-theme="dark"] .wt-sr-head{border-bottom-color:rgba(255,255,255,.08);}
html[data-wt-theme="dark"] .wt-sr-head .wt-sr-glass{color:#c9b3e0;}
html[data-wt-theme="dark"] .wt-sr-input{color:#e7e5ea !important;background:none !important;}
html[data-wt-theme="dark"] .wt-sr-input::placeholder{color:rgba(231,229,234,.42);}
html[data-wt-theme="dark"] .wt-sr-clear{background:rgba(255,255,255,.09);color:#d9c2ff;}
html[data-wt-theme="dark"] .wt-sr-clear:hover{background:rgba(255,255,255,.16);}
html[data-wt-theme="dark"] .wt-sr-close{background:#26232c;color:#d9c2ff;border-color:rgba(255,255,255,.14);}
html[data-wt-theme="dark"] .wt-sr-close:hover{background:#8b5cc6;color:#fff;border-color:#8b5cc6;}
html[data-wt-theme="dark"] .wt-sr-chips{background:#232128;border-bottom-color:rgba(255,255,255,.07);}
html[data-wt-theme="dark"] .wt-sr-chips-inner{background:#1b191f;border-color:rgba(255,255,255,.08);box-shadow:inset 2px 2px 6px -2px rgba(0,0,0,.6);}
html[data-wt-theme="dark"] .wt-sr-pill{background:#3a3242;box-shadow:0 1px 2px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.06);}
html[data-wt-theme="dark"] .wt-sr-chip{color:#b6abbf;}
html[data-wt-theme="dark"] .wt-sr-chip:hover{color:#e7e5ea;}
html[data-wt-theme="dark"] .wt-sr-chip.on{color:#e7d9ff;}
html[data-wt-theme="dark"] .wt-sr-status{background:#232128;color:#a99fb4;border-bottom-color:rgba(255,255,255,.07);}
html[data-wt-theme="dark"] .wt-sr-status b{color:#d9c2ff;}
html[data-wt-theme="dark"] .wt-sr-refresh{color:#d9c2ff;}
html[data-wt-theme="dark"] .wt-sr-refresh:hover{background:rgba(255,255,255,.08);}
html[data-wt-theme="dark"] .wt-sr-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-color:#1c1a21;}
html[data-wt-theme="dark"] .wt-sr-row{color:#e2dfe7;}
html[data-wt-theme="dark"] .wt-sr-row.sel{background:rgba(190,150,255,.14);}
html[data-wt-theme="dark"] .wt-sr-badge{background:rgba(190,150,255,.14);color:#d9c2ff;}
html[data-wt-theme="dark"] .wt-sr-row[data-t="file"] .wt-sr-badge{background:rgba(214,178,84,.18);color:#e8c877;}
html[data-wt-theme="dark"] .wt-sr-row[data-t="link"] .wt-sr-badge{background:rgba(190,150,255,.16);color:#cbb0f0;}
html[data-wt-theme="dark"] .wt-sr-row[data-t="page"] .wt-sr-badge{background:rgba(120,150,210,.18);color:#a8c0f0;}
html[data-wt-theme="dark"] .wt-sr-title mark{background:rgba(214,178,84,.32);color:#f6e4b4;}
html[data-wt-theme="dark"] .wt-sr-sub,html[data-wt-theme="dark"] .wt-sr-empty{color:#9a92a4;}
html[data-wt-theme="dark"] .wt-sr-foot{background:#1b191f;color:#9a92a4;border-top-color:rgba(255,255,255,.08);}
html[data-wt-theme="dark"] .wt-sr-foot kbd{background:#26232c;border-color:rgba(255,255,255,.14);color:#cfc7d8;}

.wt-sr-setbtn.wt-sr-setbtn-inline{position:static !important;z-index:auto;margin:0 8px 0 0 !important;flex:0 0 auto;width:28px !important;height:28px !important;}
.wt-sr-setbtn{position:absolute;z-index:2147482000;width:34px !important;height:34px !important;min-height:0 !important;max-height:34px;display:flex;align-items:center;justify-content:center;padding:0 !important;margin:0 !important;border:0;border-radius:8px;background:none;color:#fff;cursor:pointer;opacity:.95;line-height:0;transition:background .15s,opacity .15s;}
/* 鼠标停在齿轮上、或者浮层开着时，图标颜色钉死成白色：站点那条 button:hover
   会顺手改 color，浅色主题下图标会闪成深紫，压在紫底上几乎看不见。 */
.wt-sr-setbtn:hover,.wt-sr-setbtn.on{background:rgba(255,255,255,.18);opacity:1;color:#fff;}
.wt-sr-setbtn svg{width:20px;height:20px;display:block;fill:currentColor;stroke:currentColor;stroke-width:55;stroke-linejoin:round;}
/* 选中态：两套主题都留一个克制的底，别做成白砖 */
.wt-sr-setbtn.on{background:rgba(255,255,255,.20);}
html[data-wt-theme="dark"] .wt-sr-setbtn.on{background:rgba(255,255,255,.16);}
.wt-sr-setpanel{position:fixed;z-index:2147483500;width:300px;height:min(640px,80vh);background:linear-gradient(170deg,#f8f2fb 0%,#f2e8f7 55%,#ebdff2 100%);border-radius:16px;overflow:hidden;border:1px solid rgba(100,52,111,.12);opacity:0;transform:translateY(-6px) scale(.99);transition:opacity .16s ease,transform .18s cubic-bezier(.23,1,.32,1);pointer-events:none;}
.wt-sr-setpanel.show{opacity:1;transform:none;pointer-events:auto;}
.wt-sr-setpanel iframe{width:100%;height:100%;border:0;display:block;background:transparent;border-radius:16px;}
`;

  function injectCSS() {
    if (document.getElementById('wt-sr-style')) return;
    document.head.append(el('style', { id: 'wt-sr-style', text: CSS }));
  }

  /* ================= 本地索引 ================= */
  function loadIndex() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(IDX_KEY) || 'null'); } catch { o = null; }
    // 旧版（v4）只有 entries/at：搬过来当基线，别让用户白白重爬一遍
    if (!o || !Array.isArray(o.entries)) {
      try { o = JSON.parse(localStorage.getItem(IDX_KEY_OLD) || 'null'); } catch { o = null; }
    }
    if (o && Array.isArray(o.entries)) {
      state.entries = o.entries;
      state.at = o.at || 0;
      state.indexSchema = Number(o.schema || 1);
      state.clsAt = (o.clsAt && typeof o.clsAt === 'object') ? o.clsAt : {};
    }
  }
  function saveIndex() {
    try {
      // 超额时按日期裁最旧的，而不是无脑砍尾巴：老师的旧文件也尽量留住
      let entries = state.entries;
      if (entries.length > MAX_ENTRIES) {
        entries = entries
          .map((e, i) => ({ e, i, t: Date.parse(e.at || '') || 0 }))
          .sort((a, b) => (b.t - a.t) || (a.i - b.i))
          .slice(0, MAX_ENTRIES)
          .sort((a, b) => a.i - b.i)
          .map((x) => x.e);
      }
      localStorage.setItem(IDX_KEY, JSON.stringify({ at: state.at, schema: IDX_SCHEMA, clsAt: state.clsAt, entries }));
      try { chrome.storage.local.set({ wesleySearchStats: { count: entries.length, at: state.at, classes: Object.keys(state.clsAt || {}).length } }); } catch { /* ignore */ }
    } catch { /* ignore */ }
  }
  function ageToDate(text) {
    const m = /(\d+)\s+(day|week|month|year)s?\s+ago/i.exec(text || '');
    if (!m) return '';
    const n = Number(m[1]);
    const days = /day/i.test(m[2]) ? n : /week/i.test(m[2]) ? n * 7 : /month/i.test(m[2]) ? n * 30 : n * 365;
    return new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  }
  function parseFilesSection(html, cls) {
    const out = [];
    let doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); } catch { return out; }
    for (const ul of doc.querySelectorAll('ul[data-dz-container], ul.action-list')) {
      let n = 0;
      for (const li of ul.querySelectorAll('li')) {
        const a = li.querySelector('a[href]');
        if (!a) continue;
        const href = a.getAttribute('href') || '';
        if (!/\/send\.php/i.test(href)) continue;
        const h3 = a.querySelector('h3');
        const title = ((a.getAttribute('title') || (h3 && h3.textContent) || '') + '').replace(/\s+/g, ' ').trim();
        if (!title) continue;
        const ps = [...li.querySelectorAll('p.hide')];
        const desc = ps.length ? (ps[ps.length - 1].textContent || '').replace(/\s+/g, ' ').trim() : '';
        const ago = ((li.querySelector('p.meta') || {}).textContent) || '';
        let abs;
        try { abs = new URL(href, location.origin).href; } catch { continue; }
        const mi = li.querySelector('img.mime');
        const mime = mimeKindOf(mi && mi.getAttribute('src'), mi && mi.getAttribute('title'));
        out.push({
          k: 'F' + (cls.code || cls.name) + '_' + (n++), t: 'file', file: true,
          title: title.slice(0, 140),
          body: (desc + ' ' + cls.name).slice(0, 320),
          aliases: aliasText(cls.name, cls.code),
          cls: cls.name, code: cls.code, href: abs, at: ageToDate(ago), mime: mime || undefined,
        });
      }
    }
    return out;
  }
  function parseStorageFiles(doc, cls, post) {
    const out = [];
    const seen = new Set();
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') || '';
      if (!/\/storage\/fetch\.php/i.test(href)) continue;
      if (/[?&]save=1/.test(href)) continue;
      const h = (href.match(/[?&]hash=([a-f0-9]+)/i) || [])[1] || href;
      if (seen.has(h)) continue;
      seen.add(h);
      let name = '';
      try { name = decodeURIComponent((href.match(/[?&]name=([^&]+)/) || [])[1] || ''); } catch { /* ignore */ }
      const p0 = a.querySelector('p');
      const title = (name || a.getAttribute('title') || (p0 && p0.textContent) || '').replace(/\s+/g, ' ').trim();
      if (!title || /^download$/i.test(title)) continue;
      let abs;
      try { abs = new URL(href, location.origin).href; } catch { abs = href; }
      const host = a.closest('li') || a.parentElement;
      const mi = (host && host.querySelector && host.querySelector('img.mime')) || a.querySelector('img.mime');
      const mime = mimeKindOf(mi && mi.getAttribute('src'), mi && mi.getAttribute('title'));
      out.push({
        k: 'A' + (post.id || '') + '_' + h.slice(0, 8), t: 'file', file: true,
        title: title.slice(0, 140),
        body: ((post.title || '') + ' ' + cls.name).slice(0, 320),
        aliases: aliasText(cls.name, cls.code),
        cls: cls.name, code: cls.code, href: abs, at: post.at || '', mime: mime || undefined,
      });
    }
    return out;
  }
  async function resourceNodes(id) {
    try {
      const r = await fetch('/resources/' + id + '/nodes', { credentials: 'include', headers: { 'x-requested-with': 'XMLHttpRequest' } });
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    } catch { return []; }
  }
  async function collectResources(rootId, cls, out, budget) {
    if (!rootId) return;
    const q = [{ id: String(rootId), label: cls.name, depth: 0 }];
    const seen = new Set();
    while (q.length && budget.n > 0) {
      const cur = q.shift();
      if (seen.has(cur.id) || cur.depth > 4) continue;
      seen.add(cur.id);
      budget.n -= 1;
      const nodes = await resourceNodes(cur.id);
      for (const n of nodes) {
        const title = String(n.text || '').replace(/\s+/g, ' ').trim();
        if (!title) continue;
        const li = n.li_attr || {};
        const nid = li['data-id'] || n.id || '';
        const href = (n.a_attr || {}).href || '';
        if (n.type === 'file' || n.type === 'link') {
          out.push({
            k: 'R' + rootId + '_' + String(nid), t: n.type === 'link' ? 'link' : 'file', file: true,
            title: title.slice(0, 140),
            body: (cur.label + ' ' + cls.name).slice(0, 320),
            aliases: aliasText(cls.name, cls.code),
            cls: cls.name, code: cls.code,
            href: href || ('/send.php?id=' + String(nid).replace(/^sbfsfile-file-/, '')), at: '',
          });
        } else if (n.children) {
          q.push({ id: String(nid), label: cur.label + ' ' + title, depth: cur.depth + 1 });
        }
      }
    }
  }
  function classIdOf(href) {
    const m = /\/homepage\/(\d+)/.exec(String(href || ''));
    return m ? m[1] : '';
  }
  async function fetchClasses() {
    const out = [];
    try {
      const doc = new DOMParser().parseFromString(await (await fetch('/learning/classes', { credentials: 'include' })).text(), 'text/html');
      for (const card of doc.querySelectorAll('.v-card')) {
        const a = card.querySelector('h3 a[href^="/homepage/"]');
        if (!a) continue;
        const name = (a.textContent || '').trim();
        const txt = card.innerText || '';
        const m = /\(([^)]+)\)/.exec(txt);
        const cm = txt.match(/[A-Z]\/[A-Z0-9]{3,}[A-Z0-9-]*/g);
        out.push({ name, code: m ? m[1] : (cm ? [...new Set(cm)].join(',') : name), href: a.getAttribute('href') });
      }
    } catch { /* ignore */ }
    return out.slice(0, MAX_CLASSES);
  }
  async function postsFor(cls) {
    const res = await fetch(cls.href, { credentials: 'include' });
    const html = await res.text();
    const out = parseFilesSection(html, cls);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const budget = { n: 16 };
    await collectResources(classIdOf(cls.href), cls, out, budget);
    const unitIds = [...new Set([...doc.querySelectorAll('h3 a[href^="/homepage/"]')].map((a) => classIdOf(a.getAttribute('href'))).filter(Boolean))]
      .filter((id) => id !== classIdOf(cls.href)).slice(0, 8);
    for (const uid of unitIds) {
      if (budget.n <= 0) break;
      await collectResources(uid, cls, out, budget);
    }
    const folderLink = html.match(/\/resources\/folder\/\d+\/files\/\d+/);
    if (folderLink) {
      out.push({
        k: 'D' + cls.code, t: 'folder', file: false,
        title: cls.name + ' — Files', body: (cls.name + ' ' + cls.code),
        aliases: aliasText(cls.name, cls.code),
        cls: cls.name, code: cls.code, href: folderLink[0], at: '',
      });
    }
    const m = html.match(/["'](\/news\/lists\/folder\/[^"']+)["']/);
    if (!m) return out;
    const folderUrl = m[1].replace(/&l=\d+/, '&l=' + MAX_POSTS_PER_CLASS);
    const arr = await (await fetch(folderUrl, { credentials: 'include' })).json();
    const list = Array.isArray(arr) ? arr.filter(Boolean) : [];
    for (const p of list.slice(0, MAX_POSTS_PER_CLASS)) {
      const div = document.createElement('div');
      div.innerHTML = p.body || '';
      const body = ((div.textContent || '') + ' ' + (p.blurb || '')).replace(/\s+/g, ' ').trim();
      const at = p.publishAt ? String(p.publishAt).slice(0, 10) : '';
      out.push({
        k: 'p' + p.id, t: 'post', title: p.title || 'Untitled',
        body: body.slice(0, 1500), aliases: aliasText(cls.name, cls.code),
        cls: cls.name, code: cls.code, href: '/news/' + p.id, at,
      });
      let n = 0;
      for (const a of div.querySelectorAll('a[href]')) {
        const raw = a.getAttribute('href') || '';
        if (!/^https?:|^\//.test(raw)) continue;
        if (/^\/storage\/image\.php/i.test(raw)) continue;
        let abs;
        try { abs = new URL(raw, location.origin).href; } catch { continue; }
        if (!/^https?:/i.test(abs)) continue;
        let label = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^https?:\/\//i.test(label) || /[?&]hash=/.test(label)) label = '';
        const fileish = /\/storage\/(fetch|download|view)\.php/i.test(abs) || /\/resources\/|\/files?\//i.test(abs)
          || /(sharepoint\.com|1drv\.ms|dropbox\.com|drive\.google\.com)/i.test(abs)
          || /\.(pdf|docx?|pptx?|xlsx?|zip|csv|txt|rtf|pages|key|numbers|mp4|mov)(\?|$)/i.test(abs);
        if (!label && !fileish) continue;
        let name = label;
        if (!name) {
          let fromUrl = '';
          try { fromUrl = decodeURIComponent(new URL(abs).searchParams.get('name') || ''); } catch { /* ignore */ }
          const last = decodeURIComponent((abs.split('/').pop() || '').split('?')[0] || '');
          if (fromUrl) name = fromUrl;
          else if (/\.\w{2,5}$/.test(last)) name = last;
          else if (p.title) name = String(p.title).trim() + (fileish ? ' · attachment' : '');
          else name = fileish ? 'Attachment' : '';
        }
        name = String(name || '').replace(/\s+/g, ' ').trim();
        if (!name) continue;
        out.push({
          k: 'l' + p.id + '_' + (n++), t: fileish ? 'file' : 'link', file: fileish,
          title: name.slice(0, 140),
          body: ((p.title || '') + ' ' + cls.name + ' ' + (p.blurb || '')).slice(0, 240),
          aliases: aliasText(cls.name, cls.code),
          cls: cls.name, code: cls.code, href: abs, at,
        });
      }
    }
    const cutoff = Date.now() - DEEP_MAX_AGE_DAYS * 864e5;
    const deep = list.filter((dp) => {
      const t = Date.parse(dp.publishAt || '');
      return !Number.isNaN(t) && t >= cutoff;
    }).slice(0, DEEP_POSTS_PER_CLASS);
    for (const dp of deep) {
      try {
        const ph = await (await fetch('/news/' + dp.id, { credentials: 'include' })).text();
        const pdoc = new DOMParser().parseFromString(ph, 'text/html');
        out.push(...parseStorageFiles(pdoc, cls, { id: dp.id, title: dp.title || '', at: dp.publishAt ? String(dp.publishAt).slice(0, 10) : '' }));
      } catch { /* skip */ }
    }
    return out;
  }
  function classKey(cls) { return String(cls.code || cls.name || cls.href || ''); }
  function classStale(cls) {
    const t = Number(state.clsAt[classKey(cls)] || 0);
    return !t || Date.now() - t > CLASS_TTL;
  }
  // 静默后台建索引：页面空闲时跑，点开搜索时索引通常已经就绪
  function crawlSoon() {
    const run = () => { try { crawl(); } catch (e) { /* ignore */ } };
    try {
      if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 8000 });
      else setTimeout(run, 2500);
    } catch (e) { setTimeout(run, 2500); }
  }
  async function crawl(force) {
    if (state.crawling) return;
    state.crawling = true;
    state.note = '';
    state.progress = { done: 0, total: 0 };
    renderStatus();
    if (state.open) renderResults();
    const all = await fetchClasses();
    // 只重爬过期（或手动刷新）的课，没动过的课一次网络请求都不发
    const due = force ? all : all.filter(classStale);
    state.progress.total = due.length;
    if (!due.length) {
      state.crawling = false;
      renderStatus();
      if (state.open) renderResults();
      return;
    }
    // 增量合并：用 key 覆盖同一条，旧条目一条不删
    const merge = new Map(state.entries.map((e) => [e.k, e]));
    let i = 0;
    const worker = async () => {
      while (i < due.length) {
        const cls = due[i++];
        try {
          const got = await postsFor(cls);
          for (const e of got) merge.set(e.k, e);
          state.clsAt[classKey(cls)] = Date.now();
        } catch (e) { /* 失败就保留这门课旧的缓存，下次再试 */ }
        state.progress.done += 1;
        renderStatus();
        if (state.open) renderResults();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    state.entries = [...merge.values()];
    state.at = Date.now();
    saveIndex();
    state.crawling = false;
    renderStatus();
    if (state.open) renderResults();
    enrichSoon();
  }

  /* ================= 站点原生搜索 /api/search ================= */
  function dateFilter() {
    const now = new Date();
    const from = new Date(now); from.setFullYear(from.getFullYear() - 1);
    const to = new Date(now); to.setFullYear(to.getFullYear() + 1);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { from: fmt(from), to: fmt(to) };
  }
  function contextPath(ctx) {
    if (!Array.isArray(ctx) || !ctx.length) return '';
    return ctx.map((c) => c && (c.name || c.title)).filter(Boolean).slice(-3).join(' / ');
  }
  function mapServerItem(it, parent) {
    const t = T_OF_TYPE(it.type);
    return {
      k: 'S' + (it.type || '') + '_' + (it.id || '') + '_' + (parent ? parent.id : ''),
      t, file: t === 'file',
      title: String(it.title || '').trim() || '(untitled)',
      body: [it.description, it.meta, parent ? parent.title : '', contextPath(it.context)].filter(Boolean).join(' ').slice(0, 600),
      cls: contextPath(it.context) || (it.typeTitle || ''),
      href: it.url || '',
      at: it.date ? String(it.date).slice(0, 10) : '',
      server: true,
    };
  }
  async function serverSearch(keyword) {
    const q = String(keyword || '').trim();
    /* 语法是我们自己的（@ / # / - / 引号），站点搜索不懂这些，只把普通词发过去 */
    const sp = parseQuery(q);
    const plain = (sp.mustPhrase ? sp.phrase : sp.tokens.join(' ')).trim();
    if (plain.length < 2) {
      state.server = []; state.serverFor = q; state.serverKey = '';
      renderStatus();
      if (state.open) renderResults();
      return;
    }
    const key = state.filter + ' | ' + plain.toLowerCase();
    if (key === state.serverKey) return;   // 同一个词、同一层过滤：不再打接口
    const hit = state.srv.get(key);
    if (hit && Date.now() - hit.at < SRV_TTL) {
      state.server = hit.items;
      state.serverFor = q;
      state.serverKey = key;
      state.serverBusy = false;
      state.serverErr = '';
      renderStatus();
      if (state.open) renderResults();
      return;
    }
    const id = ++state.reqId;
    state.serverBusy = true;
    state.serverErr = '';
    renderStatus();
    /* 立刻重画一次，让「From WiSE search」那一段先摆出骨架，而不是干等 5 秒 */
    if (state.open) renderResults();
    try {
      const filter = JSON.stringify({ date: dateFilter(), creator: {}, types: SERVER_TYPES[state.filter] || [] });
      const url = '/api/search?keyword=' + encodeURIComponent(plain) + '&filter=' + encodeURIComponent(filter);
      const r = await fetch(url, { credentials: 'include', headers: { 'x-requested-with': 'XMLHttpRequest' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (id !== state.reqId) return;
      const rows = [];
      for (const it of (j && j.data) || []) {
        rows.push(mapServerItem(it, null));
        const subs = it && it._subResults && it._subResults.data;
        if (Array.isArray(subs)) for (const s of subs.slice(0, 6)) rows.push(mapServerItem(s, it));
      }
      state.server = rows;
      state.serverFor = q;
      state.serverKey = key;
      state.srv.set(key, { at: Date.now(), items: rows });
      if (state.srv.size > 60) { const oldest = state.srv.keys().next().value; state.srv.delete(oldest); }
    } catch (e) {
      if (id !== state.reqId) return;
      state.server = [];
      state.serverKey = '';
      state.serverErr = String((e && e.message) || e);
    } finally {
      if (id === state.reqId) {
        state.serverBusy = false;
        renderStatus();
        if (state.open) renderResults();
      }
    }
  }

  /* ================= 文件类型 ================= */
  /* WiSE 里的附件常常没有扩展名（像 send.php?hash=…），真正叫什么要看 href 的 name 参数，
     再不行就看标题尾巴。识别不出来的一律算 other：它们可能是一张图，也可能是文档，
     排序时按「不如文档」处理，但不到「图片」那么低。 */
  const EXT_KIND = {
    pdf: 'doc', doc: 'doc', docx: 'doc', rtf: 'doc', txt: 'doc', odt: 'doc', pages: 'doc', md: 'doc', epub: 'doc',
    ppt: 'slide', pptx: 'slide', key: 'slide', odp: 'slide',
    xls: 'sheet', xlsx: 'sheet', csv: 'sheet', ods: 'sheet', numbers: 'sheet',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image', heic: 'image', tif: 'image', tiff: 'image',
    zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
    mp4: 'media', mov: 'media', mp3: 'media', wav: 'media', m4a: 'media', avi: 'media',
  };
  const KIND_GROUPS = {
    docs: ['doc'], slides: ['slide'], sheets: ['sheet'], images: ['image'],
    other: ['archive', 'media', 'other'],
  };
  /* WiSE 的文件卡片上有个 <img class="mime" src="/static/images/mime/application-pdf.svg">，
     这是唯一能在不下载文件的前提下知道真实类型的地方。send.php 这种链接就靠它。 */
  function mimeKindOf(src, title) {
    const base = String(src || '').split('/').pop().toLowerCase() + ' ' + String(title || '').toLowerCase();
    if (/pdf/.test(base)) return 'pdf';
    if (/word|document|msword|opendocument\.text/.test(base)) return 'doc';
    if (/spreadsheet|excel|csv/.test(base)) return 'sheet';
    if (/presentation|powerpoint/.test(base)) return 'slide';
    if (/^image|\bimage-|image\b|\.png|\.jpe?g|gif|tiff|heic/.test(base)) return 'image';
    if (/zip|compressed|rar|7z|archive/.test(base)) return 'archive';
    if (/video|audio|mp4|quicktime|mp3|wav/.test(base)) return 'media';
    return '';
  }
  /* send.php 这种链接，真正的文件名与类型只在响应头里（Content-Type / Content-Disposition）。
     不能在索引阶段对每个文件发请求，所以做成懒探测：用户在 Files 视图里时，
     对还没分类的文件发 HEAD，一次一小批，结果记进 localStorage。 */
  const TYPE_KEY = 'wesleyFileTypes:v1';
  let TYPE_MAP = null;
  const PROBING = new Set();
  let PROBED = 0;
  function loadTypes() {
    if (TYPE_MAP) return TYPE_MAP;
    TYPE_MAP = {};
    try {
      const o = JSON.parse(localStorage.getItem(TYPE_KEY) || 'null');
      if (o && typeof o === 'object') TYPE_MAP = o;
    } catch { TYPE_MAP = {}; }
    return TYPE_MAP;
  }
  function saveTypes() {
    try { localStorage.setItem(TYPE_KEY, JSON.stringify(TYPE_MAP || {})); } catch { /* 满了就算了 */ }
  }
  function mimeFromCT(ct) {
    const v = String(ct || '').toLowerCase();
    if (!v) return '';
    if (/pdf/.test(v)) return 'pdf';
    if (/wordprocessingml|msword|opendocument\.text|rtf|plain/.test(v)) return 'doc';
    if (/spreadsheetml|ms-excel|csv|opendocument\.spreadsheet/.test(v)) return 'sheet';
    if (/presentationml|ms-powerpoint|opendocument\.presentation/.test(v)) return 'slide';
    if (/^image\//.test(v)) return 'image';
    if (/zip|compressed|rar|7z/.test(v)) return 'archive';
    if (/^(video|audio)\//.test(v)) return 'media';
    return '';
  }
  function knownType(href) {
    const map = loadTypes();
    return map[String(href || '').split('#')[0]] || null;
  }
  function applyKnownType(e) {
    const t = knownType(e.href);
    if (!t) return;
    if (t.mime && !e.mime) e.mime = t.mime;
    if (t.name && !e.fileName) e.fileName = t.name;
    e._kind = undefined;
    e._ext = undefined;
  }
  async function probeTypes(pool, max) {
    const todo = [];
    for (const e0 of pool) {
      if (todo.length >= max) break;
      const e = e0;
      if (!(e.file || e.t === 'file')) continue;
      applyKnownType(e);
      if (e.mime) continue;
      if (PROBING.has(e.href)) continue;
      if (todo.indexOf(e) >= 0) continue;
      todo.push(e);
    }
    if (!todo.length) return { added: 0, tried: 0 };
    let done = 0;
    let tried = 0;
    const worker = async () => {
      while (todo.length) {
        const e = todo.shift();
        if (!e) continue;
        PROBING.add(e.href);
        PROBED += 1;
        tried += 1;
        try {
          const r = await fetch(e.href, { method: 'HEAD', credentials: 'include' });
          if (r.ok) {
            const ct = r.headers.get('content-type') || '';
            const cd = r.headers.get('content-disposition') || '';
            const fn = (cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i) || [])[1] || '';
            let name = '';
            try { name = decodeURIComponent(fn); } catch { name = fn; }
            const mime = mimeFromCT(ct) || mimeKindOf(name, ct);
            loadTypes()[String(e.href || '').split('#')[0]] = { mime: mime || '', name, at: Date.now() };
            if (mime) {
              e.mime = mime;
              if (name) e.fileName = name;
              e._kind = undefined;
              e._ext = undefined;
              done += 1;
            }
          } else if (r.status === 404 || r.status === 403) {
            loadTypes()[String(e.href || '').split('#')[0]] = { mime: '', name: '', at: Date.now() };
          }
        } catch { /* 单个失败不影响别的 */ }
        finally { PROBING.delete(e.href); }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    if (done) saveTypes();
    return { added: done, tried };
  }
  /* 后台把整个索引的文件类型补全：搜索框还没打开就开始跑，
     用户点进 Files 时大部分已经是分类好的了。 */
  let ENRICHING = false;
  async function enrichTypes() {
    if (ENRICHING) return;
    ENRICHING = true;
    try {
      for (;;) {
        const pool = state.entries.filter((e) => (e.file || e.t === 'file') && !e.mime && !knownType(e.href));
        if (!pool.length) break;
        const r = await probeTypes(pool, 24);
        if (!r.tried) break;
        saveTypes();
        if (state.open) { try { renderResults(); } catch { /* ignore */ } }
        await new Promise((res) => setTimeout(res, 120));
      }
    } catch { /* ignore */ } finally { ENRICHING = false; }
  }
  function enrichSoon() {
    const run = () => { try { enrichTypes(); } catch { /* ignore */ } };
    try {
      if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 6000 });
      else setTimeout(run, 2000);
    } catch { setTimeout(run, 2000); }
  }
  function extOfName(n) {
    const m = String(n || '').trim().match(/\.([a-z0-9]{2,5})$/i);
    return m ? m[1].toLowerCase() : '';
  }
  /* send.php / fetch.php 这类是取文件的脚本，不是文件本身的类型 —— 它们的 .php 不能当扩展名 */
  const DISPATCH_EXT = /^(php|aspx?|jsp|cgi|do|action)$/i;
  function fileKindOf(e) {
    if (e._kind !== undefined) return e._kind;
    if (e.mime) {
      if (e.mime === 'image') { e._kind = 'image'; e._ext = ''; return 'image'; }
      e._ext = EXT_KIND[e.mime] ? e.mime : '';
      e._kind = EXT_KIND[e.mime] || 'other';
      return e._kind;
    }
    const href = String(e.href || '');
    const title = String(e.title || '');
    let ext = '';
    const nm = href.match(/[?&]name=([^&]+)/i);
    if (nm) {
      try { ext = extOfName(decodeURIComponent(nm[1])); } catch { ext = extOfName(nm[1]); }
    }
    if (!ext) ext = extOfName(title);
    if (!ext && e.fileName) ext = extOfName(e.fileName);
    if (!ext) {
      const last = href.split(/[?#]/)[0].split('/').pop() || '';
      const ex = extOfName(last);
      if (ex && !DISPATCH_EXT.test(ex)) ext = ex;
    }
    e._kind = EXT_KIND[ext] || 'other';
    e._ext = ext;
    return e._kind;
  }
  function kindGroupOf(e) {
    const k = fileKindOf(e);
    for (const g of Object.keys(KIND_GROUPS)) if (KIND_GROUPS[g].includes(k)) return g;
    return 'other';
  }
  function kindWord(e) {
    const k = fileKindOf(e);
    const ext = (e.fileName && extOfName(e.fileName)) || e._ext || '';
    if (ext) return ext + ' file';
    if (k === 'image') return 'image';
    if (k === 'doc') return 'document';
    if (k === 'sheet') return 'sheet';
    if (k === 'slide') return 'slides';
    return 'file';
  }

  const FILE_KINDS = [
    { key: 'all', label: 'All' },
    { key: 'docs', label: 'Docs' },
    { key: 'slides', label: 'Slides' },
    { key: 'sheets', label: 'Sheets' },
    { key: 'images', label: 'Images' },
    { key: 'other', label: 'Other' },
  ];

  /* ================= 查询语法 ================= */
  /* @科目     只看这门课（按课名或课程代码匹配，可以写 @maths @chinese）
     title:xx  这个字必须出现在标题里（可以写多个）
     kind:xx   docs / slides / sheets / images / other，files 视图下的子类过滤
     -xx       排除包含它的条目
     "a b"     整串必须连着出现 */
  function kindKeyOf(v) {
    const k = String(v || '').toLowerCase().trim();
    if (KIND_GROUPS[k]) return k;
    const ek = EXT_KIND[k];
    if (ek) {
      for (const g of Object.keys(KIND_GROUPS)) if (KIND_GROUPS[g].includes(ek)) return g;
    }
    if (k === 'pdf' || k === 'word' || k === 'document') return 'docs';
    if (k === 'ppt' || k === 'powerpoint') return 'slides';
    if (k === 'excel' || k === 'spreadsheet') return 'sheets';
    if (k === 'img' || k === 'picture' || k === 'photo') return 'images';
    return 'other';
  }
  function parseQuery(q) {
    const raw = String(q || '').trim();
    const out = { raw, phrase: '', mustPhrase: false, tokens: [], subj: [], titleOnly: [], excludes: [], kinds: [], exts: [] };
    /* @科目 可能带空格，写成 @"maths methods" 也认 */
    const rest = raw.replace(/@(?:"([^"]*)"|(\S+))/g, (m, q, w) => {
      const v = String(q || w || '').toLowerCase();
      if (v) out.subj.push(v);
      return ' ';
    });
    const bits = rest.match(/"[^"]*"|\S+/g) || [];
    for (const b of bits) {
      if (b.length > 2 && b[0] === '"' && b[b.length - 1] === '"') {
        const v = b.slice(1, -1).trim().toLowerCase();
        if (v) { out.phrase = v; out.mustPhrase = true; }
        continue;
      }
      if (b.length > 1 && b[0] === '-') { out.excludes.push(b.slice(1).toLowerCase()); continue; }
      const m = b.match(/^#?(title|kind):(.+)$/i);
      if (m) {
        const k = m[1].toLowerCase(), v = m[2].toLowerCase();
        if (k === 'title') out.titleOnly.push(v);
        else if (KIND_GROUPS[v]) out.kinds.push(v);
        else if (EXT_KIND[v]) out.exts.push(v);      /* kind:pdf / kind:docx 只挑这一种扩展名 */
        else out.kinds.push(kindKeyOf(v));
        continue;
      }
      out.tokens.push(b.toLowerCase());
    }
    if (!out.tokens.length) out.tokens = out.titleOnly.slice();
    if (!out.phrase) out.phrase = out.tokens.join(' ');
    /* 查询里直接写科目（maths / eal / pe…）就当作软限定：只留这门课，
       外加名字里真的带这个词的条目（老师常把 worksheet 命名成 maths-xxx） */
    out.subjSoft = out.tokens.filter((t) => isSubjectWord(t));
    return out;
  }
  /* 科目别名：@pe 就是 @phe，@maths 也能命中 Mathematical Methods 这类课名。
     已有的 SUBJECT_ALIASES 是「正则 → 索引关键词」表，这里这张是「缩写 → 匹配词」。 */
  const SUBJ_SHORTHAND = {
    pe: ['physical', 'phe', 'hpe', 'sport'],
    phe: ['physical', 'phe', 'hpe'],
    hpe: ['physical', 'phe', 'hpe'],
    eal: ['eal', 'bridging eal', 'additional language', 'language acquisition'],
    ela: ['english', 'language acquisition'],
    eng: ['english'],
    math: ['math', 'maths', 'mathematical'],
    maths: ['math', 'maths', 'mathematical'],
    mme: ['math', 'maths', 'mathematical'],
    methods: ['math', 'maths', 'mathematical'],
    sci: ['science'],
    science: ['science'],
    bio: ['biology', 'science'],
    chem: ['chemistry', 'science'],
    phy: ['physics', 'science'],
    chi: ['chinese'],
    chinese: ['chinese'],
    llc: ['language and literature', 'chinese'],
    ias: ['individuals and societies', 'humanities', 'hass'],
    hass: ['individuals and societies', 'humanities'],
    hum: ['individuals and societies', 'humanities'],
    art: ['art', 'visual'],
    music: ['music'],
    drama: ['drama', 'theatre'],
    dig: ['digital', 'technology'],
    tech: ['technology', 'digital'],
  };
  function subjectNeedles(n) {
    const key = String(n || '').toLowerCase().trim();
    const extra = SUBJ_SHORTHAND[key] || QUERY_SYNONYMS[key] || [];
    return [key].concat(extra);
  }
  /* 只认「这门课本身」：课名 / 课程代码，不看正文，免得一搜 maths 所有提到 maths 的都算 */
  /* 课名匹配：≥4 个字母可以子串，2~3 个字母必须整词（"health" 里也有 "eal"） */
  function nameHas(name, nn) {
    if (!name || !nn) return false;
    if (nn.length <= 3) return new RegExp('(^|[^a-z0-9])' + escapeRe(nn) + '([^a-z0-9]|$)').test(name);
    if (name.includes(nn)) return true;
    const words = nn.split(/\s+/).filter((w) => w.length >= 3);
    return words.length > 1 && words.every((w) => new RegExp('(^|[^a-z0-9])' + escapeRe(w)).test(name));
  }
  function subjectStrong(e, needle) {
    const code = normSubjCode(e.code);
    const name = normSubjName(e.cls);
    for (const c of subjectNeedles(needle)) {
      const nc = normSubjCode(c);
      const nn = normSubjName(c);
      if (code && nc && nc.length >= 3 && code.includes(nc)) return true;
      if (code && nc && (code === nc || code.startsWith(nc) || nc.startsWith(code))) return true;
      if (nameHas(name, nn)) return true;
    }
    return false;
  }
  function subjectMatches(e, needle) {
    const n = String(needle || '').replace(/^@/, '').trim();
    if (!n) return true;
    /* 显式 @ 只认「这门课本身」：正文里提到 sport 的公告不算体育作业 */
    return subjectStrong(e, n);
  }
  /* 这个 token 是不是「科目词」：别名表里有，或者本机某门课的课名里含它 */
  function isSubjectWord(t) {
    const v = String(t || '').toLowerCase();
    if (v.length < 2) return false;
    if (SUBJ_SHORTHAND[v]) return true;
    return false;
  }
  function passesQuery(e, qp) {
    if (!qp) return true;
    for (const s of qp.subj) if (!subjectMatches(e, s)) return false;
    if (qp.subjSoft && qp.subjSoft.length) {
      for (const s of qp.subjSoft) {
        const title = String(e.title || '').toLowerCase();
        if (!subjectStrong(e, s) && !title.includes(s)) return false;
      }
    }
    if (qp.kinds.length) {
      /* kind: 只挑文件，帖子/页面一律出局 */
      const isFile = e.file || e.t === 'file';
      if (!isFile) return false;
      const g = kindGroupOf(e);
      if (!qp.kinds.includes(g)) return false;
    }
    if (qp.exts.length) {
      if (!(e.file || e.t === 'file')) return false;
      fileKindOf(e);
      if (!qp.exts.includes(e._ext)) return false;
    }
    if (qp.mustPhrase && qp.phrase && !entryHay(e)._hay.includes(qp.phrase)) return false;
    if (qp.excludes.length) {
      const hay = entryHay(e)._hay;
      if (qp.excludes.some((x) => hay.includes(x))) return false;
    }
    if (qp.titleOnly.length) {
      const title = String(e.title || '').toLowerCase();
      if (!qp.titleOnly.every((t) => title.includes(t))) return false;
    }
    return true;
  }

  /* ================= 本地匹配 ================= */
  function entryHay(e) {
    if (e._hay !== undefined) return e;
    e._hay = [e.title, e.body, e.cls, e.code, e.aliases].filter(Boolean).join(' ').toLowerCase();
    return e;
  }
  function tokenVariants(t) {
    const syn = QUERY_SYNONYMS[t];
    return syn ? syn.concat([t]) : [t];
  }
  function matchText(hay, v) {
    if (!/^[a-z0-9]+$/.test(v)) return hay.includes(v);
    if (v.length <= 4) return new RegExp('(^|[^a-z0-9])' + escapeRe(v)).test(hay);
    return hay.includes(v);
  }
  function matchToken(e, t) {
    const hay = entryHay(e)._hay;
    for (const v of tokenVariants(t)) {
      if (matchText(hay, v)) return 3;
      if (/^[a-z0-9]{2,}$/.test(v)) {
        entryPinyin(e);
        if (v.length <= 3) {
          const b = new RegExp('(^| )' + escapeRe(v) + '( |$)');
          if (e._syl && b.test(e._syl)) return 2;
          if (e._iniS && b.test(e._iniS)) return 2;
        } else {
          if (e._py && e._py.includes(v)) return 2;
          if (e._ini && e._ini.includes(v)) return 2;
        }
      }
    }
    return 0;
  }
  function nearToken(e, t) {
    if (!/^[a-z0-9]{4,}$/.test(t)) return false;
    entryPinyin(e);
    return !!(e._py && nearIncludes(e._py, t));
  }
  function kindAllowed(e) {
    const k = state.fileKind || 'all';
    if (k === 'all') return true;
    return kindGroupOf(e) === k;
  }
  function localAllowed(e) {
    if (state.filter === 'all') return true;
    if (state.filter === 'post') return e.t === 'post';
    if (state.filter === 'file') return (e.t === 'file' || e.t === 'folder') && kindAllowed(e);
    if (state.filter === 'link') return e.t === 'link';
    if (state.filter === 'page') return e.t === 'folder';
    return true;
  }
  /* 自己的科目：搜 maths 时，自己这门课的条目应该往前放。
     只加分、不扣别人的分 —— 别的课里跟 maths 有关的东西照样按原来的相关性排，
     只是自己那门的同类条目浮到它们前面。
     数据来自面板写进 localStorage 的课表（wesleySubjects:v2），没有再退回当天的课。 */
  let MY_SUBJECTS = null;
  let MY_SUBJECTS_AT = 0;
  function normSubjCode(x) {
    return String(x || '').toUpperCase().replace(/^G\//, '').replace(/\s+/g, '').replace(/^\(|\)$/g, '');
  }
  function normSubjName(x) {
    return String(x || '').toLowerCase().replace(/\bvce\b|\bvcal\b|\byear\s*\d+\b|\bunit\b|\d+/g, '').replace(/[^a-z]+/g, '');
  }
  function mySubjects() {
    const now = Date.now();
    if (MY_SUBJECTS && now - MY_SUBJECTS_AT < 5000) return MY_SUBJECTS;
    const codes = [];
    const names = [];
    const add = (name, code) => {
      const c = normSubjCode(code);
      if (c) codes.push(c);
      const n = normSubjName(name);
      if (n && n.length >= 4) names.push(n);
    };
    try {
      const raw = localStorage.getItem('wesleySubjects:v2');
      if (raw) {
        const d = JSON.parse(raw);
        for (const x of (d && d.list) || []) if (x) add(x.name, x.code);
      }
    } catch (err) { /* 坏数据就当没有 */ }
    if (!codes.length && !names.length) {
      try {
        let bestKey = '';
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || '';
          if (k.startsWith('wesleyLocal:') && k > bestKey) bestKey = k;
        }
        if (bestKey) {
          const d = JSON.parse(localStorage.getItem(bestKey) || 'null');
          for (const x of (d && (d.classes || d.tabs)) || []) if (x) add(x.name, x.code);
        }
      } catch (err) { /* 同上 */ }
    }
    MY_SUBJECTS = { codes, names };
    MY_SUBJECTS_AT = now;
    return MY_SUBJECTS;
  }
  function isMySubject(e) {
    const mine = mySubjects();
    if (!mine.codes.length && !mine.names.length) return false;
    const code = normSubjCode(e.code);
    if (code && mine.codes.length) {
      const base = code.split('-')[0];
      for (const c of mine.codes) {
        if (c === code) return true;
        if (base.length >= 5 && (c === base || c.startsWith(base + '-') || code.startsWith(c.split('-')[0] + '-'))) return true;
      }
    }
    const name = normSubjName(e.cls);
    if (name && name.length >= 4 && mine.names.length) {
      for (const n of mine.names) {
        if (n === name) return true;
        if (n.length >= 6 && name.length >= 6 && (n.includes(name) || name.includes(n))) return true;
      }
    }
    return false;
  }
  function scoreEntry(e, tokens, phrase) {
    const title = String(e.title || '').toLowerCase();
    const cls = String(e.cls || '').toLowerCase();
    let score = 0;
    for (const t of tokens) {
      const m = matchToken(e, t);
      if (!m) return -1;
      score += m;
    }
    let bonus = 0;
    if (title === phrase) bonus += 120;
    else if (title.startsWith(phrase)) bonus += 70;
    else if (title.includes(phrase)) bonus += 45;
    let titleHit = false;
    for (const t of tokens) {
      if (title.includes(t)) { bonus += 12; titleHit = true; }
      else if (cls.includes(t)) bonus += 4;
    }
    const isFile = e.file || e.t === 'file';
    if (isFile) {
      /* 文档优先。像 send.php 那种名字看不出来的，真实类型只有打开才知道，
         一律当 other 处理：让它排在文档后面，也不给「标题正好叫 maths」的那 120 分。
         图片再低一档。 */
      const k = fileKindOf(e);
      const docLike = k === 'doc' || k === 'sheet' || k === 'slide';
      if (docLike) {
        /* 文档保持原来的分，标题真命中就再多一点点 */
        if (titleHit) bonus += 4;
      } else if (k === 'image') {
        /* 图片压到文档后面 */
        bonus = Math.round(bonus * 0.35) - 6;
      } else {
        /* 认不出类型的（send.php 之类）夹在中间：可能有用，但不该比文档靠前 */
        bonus = Math.round(bonus * 0.5) - 3;
      }
    } else if (e.t === 'folder') bonus += 1;
    score += bonus;
    /* 自己科目的条目往前放，而且权重压过标题命中（用户要求：本科目 > 标题匹配）。
       标题最高是 120（完全命中）+12（token），所以这里给 140。 */
    if (isMySubject(e)) score += 140;
    return score;
  }
  function localSearch(q, qpIn) {
    const qp = qpIn || parseQuery(q);
    const phrase = (qp.tokens.join(' ') || qp.phrase || '').trim().toLowerCase();
    const pool = state.entries.filter(localAllowed).filter((e) => passesQuery(e, qp));
    if (!phrase) return pool.slice().sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 30);
    const tokens = phrase.split(/\s+/).filter(Boolean);
    const hits = [];
    for (const e of pool) {
      const s = scoreEntry(e, tokens, phrase);
      if (s >= 0) hits.push({ e, s });
    }
    if (!hits.length && tokens.length === 1 && /^[a-z0-9]{4,}$/.test(tokens[0])) {
      const t = tokens[0];
      const t0 = Date.now();
      for (const e of pool) {
        if (Date.now() - t0 > 60) break;
        if (nearToken(e, t)) hits.push({ e, s: 1 });
      }
    }
    hits.sort((a, b) => b.s - a.s || String(b.e.at).localeCompare(String(a.e.at)));
    return hits.map((h) => h.e).slice(0, 40);
  }
  function serverAllowed(e) {
    if (!passesQuery(e, state.qp)) return false;
    if (state.filter === 'all') return true;
    if (state.filter === 'post') return e.t === 'post';
    if (state.filter === 'file') return e.t === 'file' && kindAllowed(e);
    if (state.filter === 'link') return e.t === 'link';
    if (state.filter === 'page') return e.t === 'page';
    return true;
  }
  function mergeResults(q) {
    const qp = parseQuery(q);
    state.qp = qp;
    if (!String(q || '').trim()) return localSearch(q, qp);
    const out = [];
    const seen = new Set();
    const push = (e) => {
      const key = (e.href || '') + '|' + (e.title || '').toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(e);
    };
    /* 本地索引（自己抓的、跟今天课程对得上的）永远在前；
       站点 /api/search 的结果来自全校甚至别的校区，等它 5 秒回来也不该插到前面，
       所以整段压到最后，并且由 paintRows 画一条「From WiSE search」分隔。 */
    for (const e of localSearch(q, qp)) push(e);
    if (state.serverFor === q) for (const e of state.server) if (serverAllowed(e)) push(e);
    return out.slice(0, 60);
  }

  function highlight(text, q) {
    const frag = document.createDocumentFragment();
    const phrase = String(q || '').trim();
    if (!phrase) { frag.append(document.createTextNode(text)); return frag; }
    const tokens = [...new Set(phrase.toLowerCase().split(/\s+/).filter((t) => /^[a-z0-9\s-]+$/.test(t)))].sort((a, b) => b.length - a.length);
    if (!tokens.length) { frag.append(document.createTextNode(text)); return frag; }
    const re = new RegExp('(' + tokens.map(escapeRe).join('|') + ')', 'ig');
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
      frag.append(el('mark', null, m[0]));
      last = m.index + m[0].length;
      if (m[0].length === 0) break;
    }
    if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
    return frag;
  }

  /* ================= 弹窗 UI ================= */
  let overlay = null;
  let cardEl = null;
  let input = null;
  let listEl = null;
  let statusEl = null;
  let refreshBtn = null;
  let clearBtn = null;
  let chipsEl = null;
  let recentEl = null;
  const opened = new Set();
  let searchTimer = 0;

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(String(iso).length > 10 ? iso : iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
  }
  function fmtAgo(ts) {
    if (!ts) return 'never';
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    const h = Math.round(mins / 60);
    if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' d ago';
  }
  function syncClear() {
    if (!clearBtn || !input) return;
    clearBtn.hidden = !input.value;
  }
  /* 一条筛选条：背景槽 + 会滑动的胶囊 + 若干 chip。
     返回 inner 节点，自己负责把胶囊摆到当前选中的 chip 上。 */
  function chipRow(list, activeFn, onPick, extraClass) {
    const inner = el('div', { class: 'wt-sr-chips-inner' + (extraClass ? ' ' + extraClass : '') });
    const pill = el('span', { class: 'wt-sr-pill' });
    inner.append(pill);
    const move = (instant) => {
      const act = inner.querySelector('.wt-sr-chip.on');
      if (!act) return;
      const ir = inner.getBoundingClientRect();
      const ar = act.getBoundingClientRect();
      if (instant) pill.style.transition = 'none';
      pill.style.width = Math.round(ar.width) + 'px';
      pill.style.transform = 'translateX(' + Math.round(ar.left - ir.left) + 'px)';
      if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
    };
    for (const f of list) {
      const b = el('button', { class: 'wt-sr-chip' + (activeFn() === f.key ? ' on' : ''), type: 'button' }, f.label);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activeFn() === f.key) return;
        for (const c of inner.querySelectorAll('.wt-sr-chip')) c.classList.toggle('on', c === b);
        move(false);
        onPick(f.key);
      });
      inner.append(b);
    }
    requestAnimationFrame(() => move(true));
    return inner;
  }
  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = '';
    chipsEl.append(chipRow(FILTERS, () => state.filter, (k) => {
      state.filter = k;
      state.sel = 0;
      renderChips();
      renderResults();
      scheduleServer();
    }));
    /* 文件子类只在 Files 这一层选中时出现 */
    if (state.filter === 'file') {
      chipsEl.append(chipRow(FILE_KINDS, () => state.fileKind, (k) => {
        state.fileKind = k;
        state.sel = 0;
        renderChips();
        renderResults();
      }, 'sub'));
    }
  }
  function renderStatus() {
    if (!statusEl) return;
    statusEl.innerHTML = '';
    const parts = [];
    if (state.crawling) {
      parts.push(el('span', null, 'Indexing… '), el('b', null, `${state.progress.done}/${state.progress.total || '?'}`), el('span', null, ' classes'));
    } else {
      parts.push(el('span', null, `${state.entries.length} local items`), el('span', null, '·'), el('span', null, `updated ${fmtAgo(state.at)}`));
    }
    if (state.serverBusy) { parts.push(el('span', null, '·'), el('span', null, 'searching WiSE…')); }
    else if (state.serverErr) { parts.push(el('span', null, '·'), el('span', null, 'site search unavailable')); }
    else if (state.serverFor) { parts.push(el('span', null, '·'), el('span', null, `${state.server.length} from WiSE search`)); }
    if (state.note) { parts.push(el('span', null, '·'), el('span', null, state.note)); }
    const sp = el('span', { class: 'sp' });
    if (refreshBtn) sp.append(refreshBtn);
    parts.push(sp);
    statusEl.append(...parts);
    if (refreshBtn) refreshBtn.disabled = state.crawling;
  }
  function animateCardHeight(mutate) {
    if (!cardEl) { mutate(); return; }
    const h0 = cardEl.getBoundingClientRect().height;
    mutate();
    const h1 = cardEl.getBoundingClientRect().height;
    if (Math.abs(h1 - h0) < 2) return;
    cardEl.style.transition = 'none';
    cardEl.style.height = h0 + 'px';
    requestAnimationFrame(() => {
      cardEl.style.transition = 'height .26s cubic-bezier(.4,0,.2,1),transform .18s cubic-bezier(.23,1,.32,1)';
      cardEl.style.height = h1 + 'px';
      setTimeout(() => { cardEl.style.transition = ''; cardEl.style.height = ''; }, 300);
    });
  }
  /* 最近 5 条查询（PLAN-beta7 §4.3），空输入时列出来一点就走 */
  const RECENT_KEY = 'wtSearchRecent';
  function loadRecent() {
    try {
      const a = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.trim()).slice(0, 5) : [];
    } catch { return []; }
  }
  function saveRecent(q) {
    const v = String(q || '').trim();
    if (v.length < 2) return;
    try {
      const a = loadRecent().filter((x) => x.toLowerCase() !== v.toLowerCase());
      a.unshift(v);
      localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 5)));
    } catch { /* 存不下就算了 */ }
  }
  function renderResults() {
    if (!listEl) return;
    const q = input ? input.value : '';
    state.query = q;
    const res = mergeResults(q);
    state.results = res;
    /* 记下最后一个「真有结果」的词：Esc 会先把输入清空再关，关的时候拿不到它 */
    if (String(q || '').trim().length >= 2 && res.length) state.lastQuery = String(q).trim();
    if (state.sel >= res.length) state.sel = Math.max(0, res.length - 1);
    paintRecent(q);
    animateCardHeight(() => paintRows(res, q));
    /* 文件视图（或者查询里带了 kind:/扩展名）才需要知道每个文件到底是什么类型 */
    if (state.filter === 'file' || (state.qp && (state.qp.kinds.length || state.qp.exts.length))) {
      if (PROBED < 2000) {
        const pool = state.entries.filter((e) => (e.file || e.t === 'file') && !e.mime && !knownType(e.href));
        probeTypes(pool, 24).then((r) => { if (r.added && state.open) renderResults(); });
      }
    }
  }
  /* 语法提示：放大镜的 tooltip 与悬浮卡片共用同一份表 */
  const SYNTAX_ROWS = [
    ['@maths', 'only this subject'],
    ['#title:exam', 'must be in the title'],
    ['#kind:docs', 'docs / slides / sheets / images'],
    ['#kind:pdf', 'or one extension'],
    ['-worksheet', 'exclude a word'],
    ['"term 4"', 'exact phrase'],
  ];
  function syntaxRows(thin) {
    const box = el('div', { class: thin ? 'wt-sr-hc-tips' : 'wt-sr-tip-body' });
    SYNTAX_ROWS.forEach(([k, v]) => {
      const row = el('div', { class: thin ? 'wt-sr-hc-tip' : 'wt-sr-tip-row' });
      row.append(el('code', null, k), el('span', null, v));
      box.append(row);
    });
    return box;
  }
  function syntaxTip() {
    const box = el('div', { class: 'wt-sr-tip' });
    box.append(el('div', { class: 'wt-sr-tip-hd' }, 'Search tips'), syntaxRows(false));
    return box;
  }
  /* 悬浮卡片：最近搜索 + 语法提示（没有就只显示提示） */
  function paintRecent(q) {
    if (!recentEl) return;
    recentEl.replaceChildren();
    const recent = loadRecent();
    const head = el('div', { class: 'wt-sr-hc-headrow' });
    head.append(el('div', { class: 'wt-sr-hc-title' }, 'Recent searches'));
    if (recent.length) {
      const clear = el('button', { class: 'wt-sr-hc-clear', type: 'button' }, 'Clear');
      clear.addEventListener('click', (e) => { e.stopPropagation(); clearRecent(); });
      head.append(clear);
    }
    recentEl.append(head);
    if (!recent.length) {
      recentEl.append(el('div', { class: 'wt-sr-hc-empty' }, 'Nothing yet — open a result once and it lands here.'));
    } else {
      /* 一格一格的方块，比一行一条省地方：两列，多了就滚 */
      const grid = el('div', { class: 'wt-sr-hc-grid' });
      recent.forEach((r) => {
        const tile = el('div', { class: 'wt-sr-hc-row', role: 'button', tabindex: '0', title: r }, el('span', null, r));
        const x = el('button', { class: 'wt-sr-hc-x', type: 'button', title: 'Remove', 'aria-label': 'Remove ' + r }, '×');
        x.addEventListener('click', (e) => { e.stopPropagation(); dropRecent(r); });
        tile.append(x);
        const use = () => {
          input.value = r;
          state.sel = 0;
          closeHoverCard();
          renderResults();
          syncClear();
          scheduleServer();
          try { input.focus(); } catch { /* ignore */ }
        };
        tile.addEventListener('click', use);
        tile.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); use(); } });
        grid.append(tile);
      });
      recentEl.append(grid);
    }
    recentEl.append(syntaxRows(true));
  }
  let hoverArm = 0, hoverHideT = 0, hoverOpen = false;
  function openHoverCard() {
    if (!recentEl) return;
    if (state.open === false) return;
    /* 鼠标在放大镜上时只出「语法提示」，别同时把整张悬浮卡也拽出来 */
    const gl = cardEl && cardEl.querySelector('.wt-sr-glass');
    if (gl && gl.matches(':hover')) { hoverOpen = false; return; }
    hoverOpen = true;
    paintRecent(input ? input.value : '');
    recentEl.hidden = false;
    recentEl.classList.add('show');
    if (cardEl) cardEl.classList.add('hc-open');
  }
  function closeHoverCard() {
    hoverOpen = false;
    clearTimeout(hoverArm);
    clearTimeout(hoverHideT);
    if (!recentEl) return;
    recentEl.classList.remove('show');
    if (cardEl) cardEl.classList.remove('hc-open');
    hoverHideT = setTimeout(() => { if (!hoverOpen && recentEl) { recentEl.classList.remove('show'); recentEl.hidden = true; } }, 170);
  }
  /* 搜索框停 2 秒才浮出；鼠标从框滑到卡片上的过程中不收起 */
  function bindHoverCard(headEl) {
    headEl.addEventListener('mouseenter', () => {
      clearTimeout(hoverArm);
      clearTimeout(hoverHideT);
      if (hoverOpen) return;
      hoverArm = setTimeout(openHoverCard, 1000);
    });
    headEl.addEventListener('mouseleave', () => {
      clearTimeout(hoverArm);
      if (hoverOpen) hoverHideT = setTimeout(closeHoverCard, 280);
    });
    if (recentEl) {
      recentEl.addEventListener('mouseenter', () => { clearTimeout(hoverHideT); clearTimeout(hoverArm); });
      recentEl.addEventListener('mouseleave', () => { hoverHideT = setTimeout(closeHoverCard, 200); });
    }
    input.addEventListener('input', () => { if (hoverOpen) paintRecent(input.value); });
  }
  function clearRecent() {
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
    paintRecent(input ? input.value : '');
  }
  function dropRecent(v) {
    try {
      const a = loadRecent().filter((x) => x.toLowerCase() !== String(v || '').toLowerCase());
      localStorage.setItem(RECENT_KEY, JSON.stringify(a));
    } catch { /* ignore */ }
    paintRecent(input ? input.value : '');
  }
  function skelRows(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(el('div', { class: 'wt-sr-row wt-sr-skel', 'aria-hidden': 'true' },
        el('span', { class: 'wt-sr-badge wt-sr-skel-badge' }),
        el('div', { class: 'wt-sr-main' },
          el('div', { class: 'wt-sr-skel-line' }),
          el('div', { class: 'wt-sr-skel-line sm' }),
        )));
    }
    return out;
  }
  function paintRows(res, q) {
    listEl.innerHTML = '';
    let serverHead = false;
    /* 站点搜索那 5 秒是空窗：本地结果先画，后面先摆三条骨架，等结果回来再换掉 */
    const waiting = state.serverBusy && String(q || '').trim().length >= 2;
    if (!res.length && !waiting) {
      const busy = state.crawling;
      listEl.append(el('div', { class: 'wt-sr-empty' },
        busy ? 'Still searching…' : (q ? 'Nothing matched “' + q + '”.' : 'Type to search posts, files, links and pages.')));
      return;
    }
    res.forEach((e, idx) => {
      if (!String(e.title || '').trim()) return;
      const t = e.file ? 'file' : (e.t || 'post');
      /* 站点搜索那一段前面插一个分组标题，让用户一眼看出这些不是本地索引里的东西 */
      if (e.server && !serverHead) {
        serverHead = true;
        listEl.append(el('div', { class: 'wt-sr-sect' }, 'From WiSE search'));
      }
      const row = el('div', {
        class: 'wt-sr-row' + (e.server ? ' srv' : '') + (idx === state.sel ? ' sel' : '') + (opened.has(e.href) ? ' done' : ''),
        'data-t': t, role: 'option',
      },
        el('span', { class: 'wt-sr-badge', html: ICON[t] || ICON.post }),
        el('div', { class: 'wt-sr-main' },
          el('div', { class: 'wt-sr-title' }, highlight(e.title || '', q)),
          el('div', { class: 'wt-sr-sub' },
            [e.cls, t === 'folder' ? 'files folder' : t === 'file' ? kindWord(e) : t === 'link' ? 'link' : t === 'page' ? 'page' : 'post', fmtDate(e.at)].filter(Boolean).join(' · ')),
        ),
      );
      row.addEventListener('mouseenter', () => { state.sel = idx; paintSel(); });
      row.addEventListener('click', () => openEntry(e));
      listEl.append(row);
    });
    if (waiting && !serverHead) {
      listEl.append(el('div', { class: 'wt-sr-sect' }, 'From WiSE search'));
      listEl.append(...skelRows(3));
    }
    paintSel(true);
  }
  function paintSel(scroll) {
    if (!listEl) return;
    const rows = [...listEl.querySelectorAll('.wt-sr-row:not(.wt-sr-skel)')];
    rows.forEach((n, i) => n.classList.toggle('sel', i === state.sel));
    const cur = rows[state.sel];
    if (scroll && cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }
  function openEntry(e) {
    if (!e) return;
    saveRecent(state.query);
    let href = e.href || '';
    try { href = /^https?:/.test(href) ? href : new URL(href, location.origin).href; } catch { return; }
    opened.add(e.href);
    window.open(href, '_blank', 'noopener');
    const rows = listEl ? [...listEl.querySelectorAll('.wt-sr-row')] : [];
    const row = rows[state.sel];
    if (row) row.classList.add('done');
    if (input) setTimeout(() => { try { input.focus(); } catch { /* ignore */ } }, 20);
  }
  function scheduleServer() {
    clearTimeout(searchTimer);
    const q = input ? input.value.trim() : '';
    if (!q) { state.server = []; state.serverFor = ''; renderStatus(); return; }
    searchTimer = setTimeout(() => { serverSearch(q); }, SERVER_DEBOUNCE);
  }
  function build() {
    if (overlay) return;
    injectCSS();
    input = el('input', { class: 'wt-sr-input', type: 'text', placeholder: 'Search posts, files, links, pages…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Search WiSE' });
    chipsEl = el('div', { class: 'wt-sr-chips' });
    statusEl = el('div', { class: 'wt-sr-status' });
    refreshBtn = el('button', { class: 'wt-sr-refresh', type: 'button', title: 'Re-index local items' }, 'Refresh');
    refreshBtn.addEventListener('click', (e) => { e.stopPropagation(); crawl(true); });
    listEl = el('div', { class: 'wt-sr-list', role: 'listbox' });
    /* 不再常驻一行胶囊：鼠标在搜索框上停 2 秒才浮出来，里面是最近搜索 + 语法提示 */
    recentEl = el('div', { class: 'wt-sr-hovercard', hidden: true });
    const closeBtn = el('button', { class: 'wt-sr-close', type: 'button', title: 'Close (Esc)' }, 'Close');
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    clearBtn = el('button', { class: 'wt-sr-clear', type: 'button', title: 'Clear', hidden: true }, '×');
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      input.value = '';
      state.sel = 0;
      state.server = [];
      state.serverFor = '';
      renderResults();
      syncClear();
      renderStatus();
      try { input.focus(); } catch { /* ignore */ }
    });
    const card = el('div', { class: 'wt-sr-card' });
    cardEl = card;
    const glass = el('span', {
      class: 'wt-sr-glass',
      title: 'Search syntax',
      html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    });
    glass.append(syntaxTip());
    /* 放大镜上的提示：鼠标停 450ms 才出，避免刚打开搜索就弹出来挡视线 */
    let tipT = 0;
    let tipEl = null;
    let tipPin = false;
    glass.addEventListener('mouseenter', () => {
      clearTimeout(tipT);
      if (!tipEl) tipEl = glass.querySelector('.wt-sr-tip');
      tipT = setTimeout(() => { if (tipEl && !card.classList.contains('hc-open')) tipEl.classList.add('on'); }, 450);
    });
    glass.addEventListener('mouseleave', () => {
      clearTimeout(tipT);
      if (!tipEl) tipEl = glass.querySelector('.wt-sr-tip');
      if (tipEl && !tipPin) tipEl.classList.remove('on');
    });
    /* 点一下放大镜也能把提示叫出来，再点一下收回去 */
    glass.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!tipEl) tipEl = glass.querySelector('.wt-sr-tip');
      if (!tipEl) return;
      tipPin = !tipPin;
      if (tipPin) { clearTimeout(tipT); tipEl.classList.add('on'); } else tipEl.classList.remove('on');
    });
    document.addEventListener('mousedown', (e) => {
      if (!tipPin || (tipEl && glass.contains(e.target))) return;
      tipPin = false;
      if (tipEl) tipEl.classList.remove('on');
    }, true);
    const headEl = el('div', { class: 'wt-sr-head' }, glass, input, clearBtn, closeBtn);
    card.append(
      headEl,
      recentEl,
      chipsEl,
      statusEl,
      listEl,
      el('div', { class: 'wt-sr-foot' },
        el('span', null, el('kbd', null, '↑'), el('kbd', null, '↓'), ' move'),
        el('span', null, el('kbd', null, '↵'), ' open'),
        el('span', null, 'results stay open when opened'),
      ),
    );
    overlay = el('div', { class: 'wt-sr-overlay' }, card);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    input.addEventListener('input', () => { state.sel = 0; renderResults(); syncClear(); scheduleServer(); });
    input.addEventListener('keydown', onKey);
    document.documentElement.append(overlay);
    bindHoverCard(headEl);
    renderChips();
    renderStatus();
  }
  function onKey(e) {
    // Esc 先清空输入，再按一次才关（PLAN-beta7 §4.3）
    if (e.key === 'Escape') {
      e.preventDefault();
      if (input && input.value) { input.value = ''; state.sel = 0; renderResults(); syncClear(); renderStatus(); }
      else close();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); state.sel = Math.min(state.results.length - 1, state.sel + 1); paintSel(true); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); state.sel = Math.max(0, state.sel - 1); paintSel(true); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && state.results.length) { openEntry(state.results[0]); return; }
      openEntry(state.results[state.sel]);
    }
  }
  function open() {
    build();
    state.open = true;
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('show'));
    input.value = '';
    state.sel = 0;
    state.server = [];
    state.serverFor = '';
    state.serverKey = '';
    syncClear();
    renderChips();
    renderStatus();
    renderResults();
    setTimeout(() => { try { input.focus(); } catch { /* ignore */ } }, 30);
    if (!state.crawling) {
      const empty = !state.entries.length;
      const stale = !state.at || Date.now() - state.at > TTL;
      const oldSchema = (state.indexSchema || 1) < IDX_SCHEMA;
      if (empty) crawl();
      else if (oldSchema) crawl(true);   /* 旧索引没有文件类型，静默重爬一次 */
      else { if (stale) crawlSoon(); enrichSoon(); }
    }
  }
  function close() {
    /* 关掉时把这次搜的词记下来：只点了结果才算「搜过」的话，recent 几乎永远是空的 */
    try {
      const q = state.lastQuery || (input ? String(input.value || '').trim() : '');
      if (q.length >= 2) saveRecent(q);
    } catch (err) { /* ignore */ }
    state.open = false;
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 170);
  }

  /* ================= 悬浮气泡 / 停靠 ================= */
  const UI = (() => {
    try { return JSON.parse(localStorage.getItem(UI_KEY) || '{}') || {}; } catch { return {}; }
  })();
  function saveUI() {
    try { localStorage.setItem(UI_KEY, JSON.stringify(UI)); } catch { /* ignore */ }
  }
  let fab = null;
  let dockLi = null;
  let drag = null;
  let suppressUntil = 0;
  const suppress = () => Date.now() < suppressUntil;

  function navList() {
    const bar = document.querySelector('.tab-bar-section');
    if (!bar) return null;
    return bar.querySelector('ul.top-menu') || bar.querySelector('ul');
  }
  function navItemHeight() {
    const ul = navList();
    if (!ul) return 121;
    for (const li of ul.children) {
      if (li === dockLi) continue;
      const h = Math.round(li.getBoundingClientRect().height);
      if (h > 0) return h;
    }
    return 121;
  }
  function defaultFabPos() {
    const avatar = document.querySelector('a.account-menu');
    if (avatar && avatar.getBoundingClientRect().width > 0) {
      const r = avatar.getBoundingClientRect();
      return { left: Math.round(r.left + r.width / 2 - 22), top: Math.round(r.bottom + 14) };
    }
    return { left: window.innerWidth - 68, top: 92 };
  }
  function placeFab() {
    if (!fab) return;
    const pos = UI.pos || defaultFabPos();
    const x = Math.min(Math.max(6, pos.left), window.innerWidth - 50);
    const y = Math.min(Math.max(6, pos.top), window.innerHeight - 50);
    fab.style.left = x + 'px';
    fab.style.top = y + 'px';
  }
  function flingIn(nodes, before) {
    for (const n of nodes) {
      const a = before.get(n);
      if (a == null) continue;
      const b = n.getBoundingClientRect().left;
      const dx = Math.round(a - b);
      if (Math.abs(dx) < 1) continue;
      try {
        n.animate([{ transform: 'translateX(' + dx + 'px)' }, { transform: 'none' }], { duration: 460, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      } catch { /* ignore */ }
    }
  }

  function buildDockLi() {
    const li = document.createElement('li');
    li.className = 'wt-sr-dock-li';
    li.setAttribute('data-id', 'bw-search');
    li.style.height = navItemHeight() + 'px';
    const a = document.createElement('a');
    a.className = 'sbx-button--has-icon u-width-100 wt-sr-dock-a';
    a.href = '#';
    a.title = 'BW Search';
    a.innerHTML = '<span class="wt-sr-dock-ico">' + ICON.search + '</span><span class="wt-sr-dock-txt">BW Search</span>';
    a.setAttribute('draggable', 'false');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (suppress()) return;
      open();
    });
    li.append(a);
    li.addEventListener('pointerdown', (e) => {
      e.preventDefault();          // 阻止 <a> 触发原生链接拖拽
      e.stopPropagation();
      startDrag(e, 'dock');
    });
    return li;
  }

  function dockAt(clientX) {
    const ul = navList();
    if (!ul) return false;
    if (dockLi && ul.contains(dockLi)) return true;
    const lis = [...ul.children].filter((n) => n.tagName === 'LI');
    let idx = lis.length;
    for (let i = 0; i < lis.length; i++) {
      const r = lis[i].getBoundingClientRect();
      if (clientX < r.left + r.width / 2) { idx = i; break; }
    }
    const before = new Map(lis.map((n) => [n, n.getBoundingClientRect().left]));
    dockLi = buildDockLi();
    ul.insertBefore(dockLi, lis[idx] || null);
    flingIn(lis, before);
    UI.docked = true;
    UI.dockIndex = idx;
    saveUI();
    if (fab) { fab.remove(); fab = null; }
    return true;
  }

  function removeDock(animate) {
    if (!dockLi) return;
    const ul = dockLi.parentElement;
    const lis = ul ? [...ul.children].filter((n) => n.tagName === 'LI' && n !== dockLi) : [];
    const before = new Map(lis.map((n) => [n, n.getBoundingClientRect().left]));
    dockLi.remove();
    dockLi = null;
    if (animate) flingIn(lis, before);
    UI.docked = false;
    saveUI();
  }

  function createFab() {
    if (fab && fab.isConnected) return fab;
    fab = el('button', { class: 'wt-sr-fab', type: 'button', title: 'BW Search (Ctrl/⌘ + K) — drag into the nav bar to dock' });
    fab.innerHTML = ICON.search;
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (suppress()) return;
      open();
    });
    fab.setAttribute('draggable', 'false');
    fab.addEventListener('pointerdown', (e) => { e.preventDefault(); startDrag(e, 'fab'); });
    document.documentElement.append(fab);
    return fab;
  }

  function nearNav(x, y) {
    const bar = document.querySelector('.hybrid-bar, .tab-bar');
    if (!bar) return false;
    const r = bar.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top - 24 && y <= r.bottom + 24;
  }

  // 统一的拖拽会话：不管从气泡还是从导航栏里拖，都是同一个元素在动
  function startDrag(e, from) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const node = from === 'dock' ? dockLi : fab;
    if (!node) return;
    const r = node.getBoundingClientRect();
    drag = { from, sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, moved: false };
    document.addEventListener('pointermove', onDragMove, true);
    document.addEventListener('pointerup', onDragEnd, true);
    document.addEventListener('pointercancel', onDragEnd, true);
  }
  function onDragMove(e) {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 6) return;
      drag.moved = true;
      if (drag.from === 'dock') {
        removeDock(false);
        createFab();
        drag.from = 'fab';
        drag.ox = 22;
        drag.oy = 22;
        fab.style.display = 'flex';
      }
      if (fab) fab.classList.add('dragging');
    }
    if (fab) {
      fab.style.left = (e.clientX - drag.ox) + 'px';
      fab.style.top = (e.clientY - drag.oy) + 'px';
    }
  }
  function onDragEnd(e) {
    if (!drag) return;
    const moved = drag.moved;
    document.removeEventListener('pointermove', onDragMove, true);
    document.removeEventListener('pointerup', onDragEnd, true);
    document.removeEventListener('pointercancel', onDragEnd, true);
    drag = null;
    if (fab) fab.classList.remove('dragging');
    if (!moved) return;
    suppressUntil = Date.now() + 450;      // 松手不算点击
    if (e && nearNav(e.clientX, e.clientY)) {
      if (fab) fab.style.display = 'none';
      if (!dockAt(e.clientX) && fab) fab.style.display = 'flex';
    } else if (fab) {
      const r = fab.getBoundingClientRect();
      UI.pos = { left: Math.round(r.left), top: Math.round(r.top) };
      UI.docked = false;
      saveUI();
      placeFab();
    }
  }


  /* ================= BW settings（非模态设置面板） ================= */
  const GEAR_SVG = '<svg viewBox="0 0 1024 1024" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M512 745.448727c-119.505455 0-216.738909-97.210182-216.738909-216.715636s97.233455-216.738909 216.738909-216.738909c119.528727 0 216.738909 97.233455 216.738909 216.738909S631.528727 745.448727 512 745.448727z m0-386.885818c-93.835636 0-170.193455 76.334545-170.193455 170.193455 0 93.812364 76.334545 170.170182 170.193455 170.170181s170.193455-76.334545 170.193455-170.170181-76.357818-170.193455-170.193455-170.193455z"/><path d="M608.512 1001.821091h-193.047273a23.272727 23.272727 0 0 1-23.272727-23.272727v-88.110546a396.334545 396.334545 0 0 1-65.349818-23.831273l-60.066909 60.043637a23.202909 23.202909 0 0 1-32.907637 0L97.373091 790.109091a23.249455 23.249455 0 0 1 0-32.907636L152.203636 702.370909a393.658182 393.658182 0 0 1-30.603636-70.539636H45.428364a23.272727 23.272727 0 0 1-23.272728-23.272728v-193.047272a23.272727 23.272727 0 0 1 23.272728-23.272728h76.218181a390.865455 390.865455 0 0 1 30.72-70.376727l-54.993454-55.016727a23.249455 23.249455 0 0 1 0-32.907636l136.494545-136.517819a23.970909 23.970909 0 0 1 32.907637 0l60.113454 60.113455c20.526545-9.704727 42.402909-17.687273 65.303273-23.854546V45.451636a23.272727 23.272727 0 0 1 23.272727-23.272727h193.047273a23.272727 23.272727 0 0 1 23.272727 23.272727v98.56c18.781091 6.958545 36.840727 15.220364 54.039273 24.738909l71.354182-71.354181a23.179636 23.179636 0 0 1 32.907636 0l136.494546 136.517818a23.249455 23.249455 0 0 1 0 32.907636L850.385455 343.04c7.400727 15.592727 13.870545 32.023273 19.316363 49.175273h108.846546a23.272727 23.272727 0 0 1 23.272727 23.272727v193.047273a23.272727 23.272727 0 0 1-23.272727 23.272727h-108.939637a397.917091 397.917091 0 0 1-19.572363 48.826182l76.544 76.544a23.249455 23.249455 0 0 1 0 32.907636l-136.494546 136.541091a23.179636 23.179636 0 0 1-32.907636 0l-71.284364-71.330909c-17.221818 9.541818-35.351273 17.826909-54.109091 24.762182v98.466909a23.272727 23.272727 0 0 1-23.272727 23.296z m-169.751273-46.545455h146.501818v-91.764363a23.272727 23.272727 0 0 1 16.104728-22.132364 347.415273 347.415273 0 0 0 76.055272-35.025454 23.272727 23.272727 0 0 1 28.695273 3.351272l67.537455 67.584 103.586909-103.633454-72.005818-72.005818a23.272727 23.272727 0 0 1-4.096-27.368728 350.301091 350.301091 0 0 0 28.672-71.842909 23.249455 23.249455 0 0 1 22.458181-17.152h103.005091v-146.501818h-102.958545a23.272727 23.272727 0 0 1-22.458182-17.152 347.229091 347.229091 0 0 0-28.346182-72.168727 23.226182 23.226182 0 0 1 4.072728-27.415273l71.633454-71.656727-103.586909-103.610182-67.560727 67.560727a23.202909 23.202909 0 0 1-28.672 3.351273 348.765091 348.765091 0 0 0-76.032-34.978909 23.249455 23.249455 0 0 1-16.104728-22.132364V68.724364h-146.501818v83.130181a23.272727 23.272727 0 0 1-18.199272 22.714182 345.018182 345.018182 0 0 0-87.272728 31.790546 23.296 23.296 0 0 1-27.392-4.096l-55.528727-55.528728-103.586909 103.610182 51.269818 51.293091a23.272727 23.272727 0 0 1 3.351273 28.672 345.809455 345.809455 0 0 0-39.866182 91.205818 23.272727 23.272727 0 0 1-22.458182 17.198546H68.701091v146.501818H138.938182c10.496 0 19.688727 7.028364 22.434909 17.128727a347.927273 347.927273 0 0 0 39.796364 91.415273 23.226182 23.226182 0 0 1-3.328 28.718545l-51.083637 51.083637 103.586909 103.633454 55.458909-55.458909a23.296 23.296 0 0 1 27.368728-4.119272 347.601455 347.601455 0 0 0 87.365818 31.744c10.658909 2.397091 18.222545 11.822545 18.222545 22.737454v83.176727z"/></svg>';
  let setBtn = null;
  let setPanel = null;
  let setIframe = null;
  /* 面板开合的唯一真相：以前靠 setPanel.classList.contains('show') 判断，
     可 show 是在 requestAnimationFrame 里加的 —— 后台标签 rAF 被冻结，
     于是「点开」没生效、按钮却已经带上了 on，再点又走一次开的分支，
     最后留下一个 display:block / opacity:0 / pointer-events:auto 的隐形层，
     正好压在按钮上，把后面所有点击都吃掉。现在用一个显式布尔值兜住。 */
  let setOpen = false;
  let setHideT = 0;

  function placeSettingsBtn() {
    if (!setBtn) return;
    const host = document.querySelector('.tab-bar-section');
    const avatar = document.querySelector('a.account-menu');
    if (!host || !avatar) return;
    const ar = avatar.getBoundingClientRect();
    setBtn.style.display = '';  // 窄屏头像会被站点隐藏，但齿轮要常驻，所以不再跟着藏
    const bell = document.querySelector('.right-off-canvas-toggle, #notification-toggle');
    // 有铃铛就把齿轮插进铃铛的容器里排在它左边，交给站点自己的间距规则；
    // 早先是把铃铛 translateX(40px) 硬挪开，窄屏时铃铛会被顶到最右边、右边距没了。
    if (bell && bell.parentElement) {
      if (bell.dataset.wtShift) { bell.style.transform = ''; bell.style.transition = ''; delete bell.dataset.wtShift; }
      setBtn.classList.add('wt-sr-setbtn-inline');
      setBtn.style.left = '';
      setBtn.style.top = '';
      if (bell.previousElementSibling !== setBtn) bell.parentElement.insertBefore(setBtn, bell);
      // 站点在宽屏下让铃铛贴着右边缘，补 8px 呼吸位（窄屏它自己有 margin，别叠加）
      const sec = document.querySelector('.tab-bar-section');
      const br = bell.getBoundingClientRect();
      const sr = sec ? sec.getBoundingClientRect() : null;
      if (sr && sr.right - br.right < 6 && !bell.parentElement.dataset.wtPad) {
        bell.parentElement.dataset.wtPad = '1';
        // 关键：.right-small 是固定宽度的 flex 盒子，塞进齿轮后内容会溢出、把铃铛顶到栏外被裁
        bell.parentElement.style.width = 'auto';
        bell.parentElement.style.flex = '0 0 auto';
        bell.parentElement.style.minWidth = '0';
        bell.parentElement.style.marginLeft = '0';
        bell.parentElement.style.paddingLeft = '0';
        bell.parentElement.style.paddingRight = '8px';
      }
      return;
    }
    // 没有铃铛时退回绝对定位（贴着头像右边）
    if (setBtn.parentElement !== host) host.append(setBtn);
    const hr = host.getBoundingClientRect();
    setBtn.classList.remove('wt-sr-setbtn-inline');
    setBtn.style.position = 'absolute';
    setBtn.style.left = Math.round(ar.right - hr.left + 6) + 'px';
    setBtn.style.top = Math.round(ar.top - hr.top + (ar.height - 32) / 2) + 'px';
  }
  function placeSetPanel() {
    if (!setPanel || !setBtn) return;
    const r = setBtn.getBoundingClientRect();
    /* 面板宽度是 CSS 写死的 300px。以前这里写 offsetWidth || 392：
       第一次打开时面板还没 display 出来，offsetWidth 是 0，于是按 392 算，
       横向整整偏 92px。 */
    const w = setPanel.offsetWidth || 300;
    const h = setPanel.offsetHeight || Math.min(640, Math.round(window.innerHeight * 0.8));
    const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    /* 上下都夹进视口。按钮被滚到视口上方时 r.bottom 是负的，
       以前直接拿它当 top，整块面板就跑到屏幕外面去了。下面放不下就翻到按钮上面。 */
    let top = r.bottom + 10;
    if (top + h > window.innerHeight - 8) top = window.innerHeight - h - 8;
    top = Math.max(8, top);
    setPanel.style.left = Math.round(left) + 'px';
    setPanel.style.top = Math.round(top) + 'px';
  }
  /* 把「开/关」这件事一次性落实到 DOM 上。open 与 UI 永远同步，
     不会出现「按钮亮了但面板没出来」或「面板关了按钮还白着」。 */
  function setSync() {
    if (!setPanel) return;
    clearTimeout(setHideT);
    if (setOpen) {
      setPanel.style.display = 'block';
      setPanel.style.pointerEvents = 'auto';
      placeSetPanel();
      /* display 之后尺寸才是真的，再摆一次，免得用 0 或旧尺寸算位置 */
      requestAnimationFrame(() => {
        if (!setPanel || !setOpen) return;
        placeSetPanel();
        setPanel.classList.add('show');
      });
      /* rAF 在后台标签会被冻结；兜底再来一次，保证 show 一定加上 */
      setHideT = setTimeout(() => {
        if (!setPanel || !setOpen) return;
        placeSetPanel();
        setPanel.classList.add('show');
      }, 60);
      document.addEventListener('mousedown', onSetDown, true);
      document.addEventListener('keydown', onSetKey, true);
    } else {
      setPanel.classList.remove('show');
      setPanel.style.pointerEvents = 'none';
      document.removeEventListener('mousedown', onSetDown, true);
      document.removeEventListener('keydown', onSetKey, true);
      /* 让淡出动画跑完再 display:none；定时器同时负责兜底 */
      setHideT = setTimeout(() => {
        if (setPanel && !setOpen) setPanel.style.display = 'none';
      }, 180);
    }
    if (setBtn) setBtn.classList.toggle('on', setOpen);
  }
  function closeSettings() {
    if (!setOpen && !setPanel) return;
    setOpen = false;
    setSync();
  }
  function onSetDown(e) {
    if (!setOpen || !setPanel) return;
    if (setPanel.contains(e.target) || (setBtn && setBtn.contains(e.target))) return;
    closeSettings();
  }
  function onSetKey(e) {
    if (e.key === 'Escape' && setOpen) { e.preventDefault(); closeSettings(); }
  }
  /* options.html 在 iframe 里 —— 那是扩展源，和站点跨源，父页面读不到它有多高，
     所以让它自己报。以前面板高度写死 min(640px,80vh)：内容只有 500 出头时下面空一大块。 */
  function onSetFrameMessage(e) {
    if (!setIframe || !setPanel) return;
    if (e.source !== setIframe.contentWindow) return;
    const d = e.data || {};
    if (d.type !== 'wt-options-height') return;
    const h = Math.round(Number(d.height) || 0);
    if (!(h > 0)) return;
    const cap = Math.min(640, Math.round(window.innerHeight * 0.88));
    const want = Math.max(180, Math.min(h + 2, cap));
    if (Math.abs((setPanel.offsetHeight || 0) - want) < 2) return;
    setPanel.style.height = want + 'px';
    if (setOpen) placeSetPanel();
  }
  window.addEventListener('message', onSetFrameMessage);
  function toggleSettings() {
    if (!setPanel) {
      setPanel = el('div', { class: 'wt-sr-setpanel' });
      setIframe = document.createElement('iframe');
      setIframe.setAttribute('title', 'Better WiSE settings');
      try { setIframe.src = chrome.runtime.getURL('options.html'); } catch { setIframe.src = 'about:blank'; }
      setPanel.append(setIframe);
      document.documentElement.append(setPanel);
    }
    setOpen = !setOpen;
    setSync();
  }
  // 主页的齿轮要打开设置时，走这里（同一个浮层，不开新标签页）
  document.addEventListener('wt:open-settings', () => { try { ensureSettings(); toggleSettings(); } catch (e) { /* ignore */ } });
  function ensureSettings() {
    if (setBtn && setBtn.isConnected) { placeSettingsBtn(); return; }
    if (!document.querySelector('a.account-menu')) return;
    setBtn = el('button', { class: 'wt-sr-setbtn', type: 'button', title: 'BW Settings' });
    setBtn.innerHTML = GEAR_SVG;
    setBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleSettings(); });
    placeSettingsBtn();
  }

  // 窄屏时站点的 top-menu 会挤：我们多占一格，就让它再收一个原生 tab，免得右侧贴边
  /* 窗口变窄时，原生搜索（绝对定位在右边）会压到导航最后几项。
     规则：最右那项要是 BW Search，就收掉它左边一个（它自己往左挪）；
     要不是 BW Search，就直接收掉它。收掉的项在变宽后自动还回来。
     BW Search 本身永远不藏（可能是我们自己 dock 进去的那个 li）。 */
  function navFitSearch() {
    const form = document.querySelector('form.sbx-header-search');
    const ul = navList();
    if (!form || !ul) return;
    if (form.matches(':hover')) return;            /* 展开成整条时别重算 */
    const lis = [...ul.children].filter((li) => li.tagName === 'LI');
    if (!lis.length) return;
    const isBW = (li) => li.classList.contains('wt-sr-dock-li') || /bw\s*search/i.test(li.textContent || '');
    const hideable = (li) => !li.classList.contains('wt-sr-dock-li');
    lis.forEach((li) => {
      if (li.dataset.wtNavHid === '1') { li.style.removeProperty('display'); delete li.dataset.wtNavHid; }
      if (li.dataset.wtHidden === '1') { li.style.removeProperty('display'); delete li.dataset.wtHidden; }
    });
    const hide = (li) => { li.dataset.wtNavHid = '1'; li.style.setProperty('display', 'none', 'important'); };
    for (let g = 0; g < 20; g += 1) {
      const vis = lis.filter((li) => li.offsetParent);
      if (!vis.length) break;
      const last = vis[vis.length - 1];
      if (last.getBoundingClientRect().right + 10 <= form.getBoundingClientRect().left) break;
      if (isBW(last)) {
        const prev = vis.slice(0, -1).reverse().find(hideable);
        if (prev) { hide(prev); continue; }
        break;                                     /* 只剩 BW Search 了，不再动它 */
      }
      if (!hideable(last)) break;
      hide(last);
    }
    /* 头像在窄屏会被站点藏掉，那时候搜索框可以再往右靠一点 */
    const av = document.querySelector('a.account-menu');
    if (!av || !av.offsetParent) form.style.setProperty('right', '112px', 'important');
    else form.style.removeProperty('right');
  }

  function fitDock() {
    /* 以前这里按「先用得不多的」砍导航项，和用户要的规则冲突（也压不过搜索框遮挡）。
       现在统一交给 navFitSearch：按原生搜索的左缘判断，从最右往左收。 */
    navFitSearch();
  }

  function ensureEntry() {
    injectCSS();
    try { navFitSearch(); } catch { /* ignore */ }
    ensureSettings();
    if (UI.docked) {
      if (fab) { fab.remove(); fab = null; }
      if (!dockLi || !dockLi.isConnected) {
        const ul = navList();
        if (!ul) return;
        const lis = [...ul.children].filter((n) => n.tagName === 'LI');
        const before = new Map(lis.map((n) => [n, n.getBoundingClientRect().left]));
        dockLi = buildDockLi();
        ul.insertBefore(dockLi, lis[Math.min(UI.dockIndex || 0, lis.length)] || null);
        flingIn(lis, before);
        if (fab) { fab.remove(); fab = null; }
      }
      fitDock();
      return;
    }
    if (fab && fab.isConnected) { placeFab(); return; }
    createFab();
    placeFab();
  }

  /* ---- 快捷键 ----
     键位可以在设置里改（chrome.storage.local.shortcuts），存的是 'alt+d' 这种小写串。
     默认：Due = alt+d，搜索 = alt+k，课表换天 = alt+t；其余 panel 默认留空。
     同键再按一次就是关，所以这些动作一律 toggle。 */
  /* 搜索默认 Ctrl/⌘+K。alt+k 是旧默认值：老配置里存着它就当没改过，直接迁到 mod+k，
     免得升级后还按 Alt+K。其余动作保持原样，用户自己在设置里改。 */
  const DEFAULT_SHORTCUTS = { search: 'mod+k', due: 'alt+d', todo: '', upcoming: '', panel: '', nextDay: 'alt+t' };
  const migrateShortcuts = (m) => {
    const out = Object.assign({}, DEFAULT_SHORTCUTS, m || {});
    if (out.search === 'alt+k') out.search = DEFAULT_SHORTCUTS.search;
    return out;
  };
  let SHORTCUTS = Object.assign({}, DEFAULT_SHORTCUTS);
  function comboOf(e) {
    const mods = [];
    if (e.ctrlKey || e.metaKey) mods.push('mod');
    if (e.altKey) mods.push('alt');
    if (e.shiftKey) mods.push('shift');
    let k = String(e.key || '').toLowerCase();
    if (!k || k === 'alt' || k === 'control' || k === 'meta' || k === 'shift') return '';
    /* 用键盘物理位置比 key 稳：中文输入法下 e.key 可能不是字母 */
    const code = String(e.code || '');
    const m = /^Key([A-Z])$/.exec(code);
    if (m) k = m[1].toLowerCase();
    else if (/^Digit([0-9])$/.exec(code)) k = code.slice(5);
    return mods.concat([k]).join('+');
  }
  try {
    chrome.storage.local.get({ shortcuts: null }).then((v) => {
      if (v && v.shortcuts && typeof v.shortcuts === 'object') SHORTCUTS = migrateShortcuts(v.shortcuts);
    }).catch(() => {});
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === 'local' && ch && ch.shortcuts && ch.shortcuts.newValue) SHORTCUTS = migrateShortcuts(ch.shortcuts.newValue);
    });
  } catch { /* 没 storage 就用默认 */ }

  function onGlobalKey(e) {
    const t = e.target;
    const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));
    const combo = comboOf(e);
    if (!combo) return;
    const fire = (action) => {
      if (action === 'search') { if (state.open) close(); else open(); return true; }
      if (action === 'nextDay') { document.dispatchEvent(new CustomEvent('wt:shortcut', { detail: 'toggle-day' })); return true; }
      document.dispatchEvent(new CustomEvent('wt:shortcut', { detail: action }));
      return true;
    };
    /* 输入框里只放行搜索键，其余别把用户正在打的字抢走 */
    const hit = Object.keys(SHORTCUTS).find((k) => SHORTCUTS[k] && SHORTCUTS[k] === combo);
    if (hit && (!typing || hit === 'search')) { e.preventDefault(); fire(hit); return; }
    /* Ctrl/⌘+K 始终是搜索，即使用户把 search 键位清空了 */
    if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key || '').toLowerCase() === 'k') {
      e.preventDefault(); fire('search');
    }
  }

  // 清掉以前实例遗留的节点
  try {
    document.querySelectorAll('.wt-sr-fab').forEach((n) => n.remove());
    document.querySelectorAll('.wt-sr-dock-li').forEach((n) => n.remove());
  } catch { /* ignore */ }

  loadIndex();
  injectCSS();
  if (!state.entries.length || Date.now() - state.at > TTL) crawlSoon();
  /* 亮暗切换不做过渡（原因见 home.js 里那段注释）。 */
  function applySiteTheme(mode) {
    var dark = mode === 'dark';
    if (mode !== 'dark' && mode !== 'light') {
      try { dark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { dark = false; }
    }
    var root = document.documentElement;
    var next = dark ? 'dark' : 'light';
    /* 只有首页有 home.js 的 applyTheme；别的页面靠这里换色。不做过渡，直接换。 */
    root.setAttribute('data-wt-theme', next);
    if (!dark) { var st = document.getElementById('wt-boot-theme'); if (st) st.remove(); }
    try { localStorage.setItem('wesleyTheme', mode); } catch (e) { /* ignore */ }
  }
  function initTheme() {
    try {
      chrome.storage.local.get({ theme: 'system' }, function (o) {
        applySiteTheme((o && o.theme) || 'system');
      });
      chrome.storage.onChanged.addListener(function (ch) {
        if (!ch || !ch.theme || ch.theme.newValue === undefined) return;
        applySiteTheme(ch.theme.newValue || 'system');
      });
    } catch (e) { /* 没有扩展 API 就交给 boot.js */ }
  }
  initTheme();
  document.addEventListener('keydown', onGlobalKey, true);
  window.addEventListener('resize', () => { clearTimeout(window.__wtDockFit); window.__wtDockFit = setTimeout(() => { fitDock(); try { navFitSearch(); } catch { /* ignore */ } }, 160);
    if (fab && !UI.docked) placeFab();
    placeSettingsBtn();
    if (setPanel && setPanel.classList.contains('show')) placeSetPanel();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { ensureEntry(); setInterval(ensureEntry, 2500); });
  else { ensureEntry(); setInterval(ensureEntry, 2500); }
})();
