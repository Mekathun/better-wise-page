const DEFAULTS = {
  modalLinkScalePct: 100,
  modalTitleScalePct: 100,
  modalDetailScalePct: 100,
  inject: true,
  lang: 'en',
  animations: true,
  smooth: true,
  perfMode: false,
  newsAlert: true,
  bgMode: 'colors',
  bgFrom: '#f7f2f9',
  bgTo: '#efe4f4',
  bgGlow: '#efe4f4',
  bgImage: '',
  bgOpacity: 100,
  theme: 'system',
  bgEffect: 'none',
  bodyOpacity: 55,
  cardOpacity: 100,
  cardEffect: 'none',
  modalWidth: 520,
  cardFontPct: 100,
  cardSizePct: 100,
  rowMax: 6,
  textScalePct: 100,
  linkScalePct: 100,
  titleScalePct: 100,
  detailScalePct: 100,
  modalUiPct: 100,
  modalWidthPct: 100,
  timetableHeight: 100,
  animSpeed: 1,
  navGlass: true,
  navGlassOpacity: 60,
  secGlass: true,
  secGlassOpacity: 80,
};

const $ = (id) => document.getElementById(id);
function renderThemeSeg() {
  const seg = document.getElementById('themeSeg');
  if (!seg) return;
  const cur = state.theme || 'system';
  seg.querySelectorAll('button[data-theme]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.theme === cur));
  });
}
const fields = {
  inject: $('inject'),
  lang: $('lang'),  // may be null now
  bgMode: $('bgMode'),
  bgFrom: $('bgFrom'),
  bgFromPick: $('bgFromPick'),
  bgToPick: $('bgToPick'),
  animSpeedVal: $('animSpeedVal'),
  bgTo: $('bgTo'),
  bgGlow: $('bgGlow'),
  bgGlowPick: $('bgGlowPick'),
  bgImage: $('bgImage'),
  bgImageRow: $('bgImageRow'),
  bgClear: $('bgClear'),
  bgOpacity: $('bgOpacity'),
  bgEffect: $('bgEffect'),
  bodyOpacity: $('bodyOpacity'),
  cardOpacity: $('cardOpacity'),
  cardEffect: $('cardEffect'),
  modalWidth: $('modalWidth'),
  modalWidthVal: $('modalWidthVal'),
  modalUiPct: $('modalUiPct'),
  timetableHeight: $('timetableHeight'),
  modalLinkScalePct: $('modalLinkScalePct'),
  modalTitleScalePct: $('modalTitleScalePct'),
  modalDetailScalePct: $('modalDetailScalePct'),
  cardFontPct: $('cardFontPct'),
  cardFontPctVal: $('cardFontPctVal'),
  cardSizePctVal: $('cardSizePctVal'),
  textScalePctVal: $('textScalePctVal'),
  cardSizePct: $('cardSizePct'),
  rowMax: $('rowMax'),
  rowMaxVal: $('rowMaxVal'),
  textScalePct: $('textScalePct'),
  linkScalePct: $('linkScalePct'),
  linkScalePctVal: $('linkScalePctVal'),
  titleScalePct: $('titleScalePct'),
  titleScalePctVal: $('titleScalePctVal'),
  detailScalePct: $('detailScalePct'),
  detailScalePctVal: $('detailScalePctVal'),
  modalUiPct: $('modalUiPct'),
  modalUiPctVal: $('modalUiPctVal'),
  timetableHeightVal: $('timetableHeightVal'),
  modalLinkScalePct: $('modalLinkScalePct'),
  modalTitleScalePct: $('modalTitleScalePct'),
  modalDetailScalePct: $('modalDetailScalePct'),
  animSpeed: $('animSpeed'),
  devMode: $('devMode'),
  autoLogs: $('autoLogs'),
  applyNow: $('applyNow'),
  navGlass: $('navGlass'),
  navGlassOpacity: $('navGlassOpacity'),
  secGlass: $('secGlass'),
  secGlassOpacity: $('secGlassOpacity'),
  animations: $('animations'),
  perfMode: $('perfMode'),
  testAlert: $('testAlert'),
  rereadAll: $('rereadAll'),
  clearCache: $('clearCache'),
  resetTheme: $('resetTheme'),
  gear: $('gear'),
  sheet: $('sheet'),
  sheetClose: $('sheetClose'),
  status: $('status'),
};
function applyPopupTheme(theme) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const set = (mode) => {
    const dark = mode === 'dark' || (mode !== 'light' && mq.matches);
    document.documentElement.dataset.wtTheme = dark ? 'dark' : 'light';
  };
  set(theme || 'system');
  try {
    mq.addEventListener('change', () => set(state.theme || 'system'));
  } catch { /* ignore */ }
}
let state = { ...DEFAULTS };
function pctPos(v, min, max) {
  const x = Math.max(min, Math.min(max, Number(v) || 100));
  return x <= 100 ? Math.round(50 * Math.log(x / min) / Math.log(100 / min)) : Math.round(50 + 50 * Math.log(x / 100) / Math.log(max / 100));
}
function pctVal(pos, min, max) {
  const p = Math.max(0, Math.min(100, Number(pos) || 0));
  if (p >= 46 && p <= 54) return 100;
  const v = p <= 50 ? min * Math.pow(100 / min, p / 50) : 100 * Math.pow(max / 100, (p - 50) / 50);
  return Math.round(v);
}
function speedToPos(v) {
  const x = Math.max(0.25, Math.min(5, Number(v) || 1));
  return x <= 1 ? Math.round(50 * Math.log(x / 0.25) / Math.log(4)) : Math.round(50 + 50 * Math.log(x) / Math.log(5));
}
function posToSpeed(p) {
  const x = Math.max(0, Math.min(100, Number(p) || 0));
  return x <= 50 ? 0.25 * Math.pow(4, x / 50) : Math.pow(5, (x - 50) / 50);
}
let footTimer = null;
function flashVersion(label) {
  const el = document.getElementById('footVer');
  if (!el) return;
  el.textContent = label;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  clearTimeout(footTimer);
  footTimer = setTimeout(() => {
    el.textContent = VERSION_LABEL;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 300);
  }, 1000);
}

const MANIFEST = chrome.runtime.getManifest ? chrome.runtime.getManifest() : { version: '0.1.2.17' };
// 0.1.1.1 = beta1：manifest 只允许数字版本号，展示时还原成 0.1.1-beta1
const VERSION_LABEL = (() => {
  const raw = String(MANIFEST.version || '');
  const m = /^(\d+\.\d+\.\d+)\.(\d+)$/.exec(raw);
  return m && Number(m[2]) > 0 ? `${m[1]}-beta${m[2]}` : raw;
})();
for (const el of [document.getElementById('ver'), document.getElementById('footVer')]) {
  if (el) el.textContent = VERSION_LABEL;
}

function render() {
  fields.inject.classList.toggle('on', state.inject !== false);
  document.body.classList.toggle('disabled', state.inject === false);
  if (fields.lang) fields.lang.value = state.lang === 'zh' ? 'zh' : 'en';
  fields.bgMode.value = state.bgMode || 'colors';
  fields.bgFrom.value = state.bgFrom || '#f7f2f9';
  if (/^#[0-9a-f]{6}$/i.test(fields.bgFrom.value)) fields.bgFromPick.value = fields.bgFrom.value;
  fields.bgTo.value = state.bgTo || '#efe4f4';
  if (/^#[0-9a-f]{6}$/i.test(fields.bgTo.value)) fields.bgToPick.value = fields.bgTo.value;
  if (fields.bgGlow) {
    fields.bgGlow.value = state.bgGlow || state.bgTo || '#efe4f4';
    if (/^#[0-9a-f]{6}$/i.test(fields.bgGlow.value) && fields.bgGlowPick) fields.bgGlowPick.value = fields.bgGlow.value;
  }
  fields.bgOpacity.value = state.bgOpacity == null ? 100 : state.bgOpacity;
  renderThemeSeg();
  fields.bgEffect.value = state.bgEffect || 'none';
  fields.bodyOpacity.value = state.bodyOpacity == null ? 55 : state.bodyOpacity;
  fields.cardOpacity.value = state.cardOpacity == null ? 100 : state.cardOpacity;
  fields.cardEffect.value = state.cardEffect || 'none';
  const mwPct = state.modalWidthPct == null ? 100 : state.modalWidthPct;
  if (fields.modalWidth) fields.modalWidth.value = String(pctPos(mwPct, 25, 200));
  if (fields.modalWidthVal) fields.modalWidthVal.value = String(mwPct);
  if (fields.modalUiPct) fields.modalUiPct.value = String(pctPos(state.modalUiPct == null ? 100 : state.modalUiPct, 25, 200));
  if (fields.modalUiPctVal) fields.modalUiPctVal.value = String(state.modalUiPct == null ? 100 : state.modalUiPct);
  if (fields.timetableHeight) fields.timetableHeight.value = String(pctPos(state.timetableHeight == null ? 100 : state.timetableHeight, 25, 200));
  if (fields.timetableHeightVal) fields.timetableHeightVal.value = String(state.timetableHeight == null ? 100 : state.timetableHeight);
  if (fields.modalLinkScalePct) fields.modalLinkScalePct.value = String(pctPos(state.modalLinkScalePct == null ? 100 : state.modalLinkScalePct, 50, 200));
  if (fields.modalTitleScalePct) fields.modalTitleScalePct.value = String(pctPos(state.modalTitleScalePct == null ? 100 : state.modalTitleScalePct, 50, 200));
  if (fields.modalDetailScalePct) fields.modalDetailScalePct.value = String(pctPos(state.modalDetailScalePct == null ? 100 : state.modalDetailScalePct, 50, 200));
  const cf = state.cardFontPct == null ? 100 : state.cardFontPct;
  const cs = state.cardSizePct == null ? 100 : state.cardSizePct;
  const ts = state.textScalePct == null ? 100 : state.textScalePct;
  const linkPct = state.linkScalePct == null ? 100 : state.linkScalePct;
  const titlePct = state.titleScalePct == null ? 100 : state.titleScalePct;
  const detailPct = state.detailScalePct == null ? 100 : state.detailScalePct;
  if (fields.cardFontPct) fields.cardFontPct.value = String(pctPos(cf, 75, 150));
  if (fields.cardSizePct) fields.cardSizePct.value = String(cs);
  const rm = state.rowMax == null ? 6 : state.rowMax;
  if (fields.rowMax) fields.rowMax.value = String(rm);
  if (fields.rowMaxVal) fields.rowMaxVal.value = String(rm);
  if (fields.textScalePct) fields.textScalePct.value = String(pctPos(ts, 50, 200));
  if (fields.cardFontPctVal) fields.cardFontPctVal.value = String(cf);
  fields.cardSizePctVal.value = String(cs);
  if (fields.textScalePctVal) fields.textScalePctVal.value = String(ts);
  if (fields.linkScalePct) { fields.linkScalePct.value = String(pctPos(linkPct,50,200)); fields.linkScalePctVal.value = String(linkPct); }
  if (fields.titleScalePct) { fields.titleScalePct.value = String(pctPos(titlePct,50,200)); fields.titleScalePctVal.value = String(titlePct); }
  if (fields.detailScalePct) { fields.detailScalePct.value = String(pctPos(detailPct,50,200)); fields.detailScalePctVal.value = String(detailPct); }
  const spd = state.animSpeed == null ? 1 : state.animSpeed;
  fields.animSpeed.value = String(speedToPos(spd));
  fields.animSpeedVal.value = String(Math.round(spd * 100) / 100);
  if (fields.devMode) fields.devMode.classList.toggle('on', state.devMode !== false);
  if (fields.autoLogs) { const on = state.autoLogs === true; fields.autoLogs.classList.toggle('on', on); fields.autoLogs.setAttribute('aria-checked', on ? 'true' : 'false'); }
  fields.navGlass.classList.toggle('on', state.navGlass !== false);
  fields.navGlassOpacity.value = state.navGlassOpacity == null ? 60 : state.navGlassOpacity;
  fields.secGlass.classList.toggle('on', state.secGlass !== false);
  fields.secGlassOpacity.value = state.secGlassOpacity == null ? 80 : state.secGlassOpacity;
  const colourMode = fields.bgMode.value !== 'image';
  fields.bgImageRow.hidden = colourMode;
  const fromRow = document.getElementById('bgFromRow');
  const toRow = document.getElementById('bgToRow');
  if (fromRow) fromRow.hidden = !colourMode;
  if (toRow) toRow.hidden = !colourMode;
  fields.animations.classList.toggle('on', state.animations !== false);
  if (fields.perfMode) fields.perfMode.classList.toggle('on', state.perfMode === true);
  const navRow = document.getElementById('navGlassOpacityRow');
  const secRow = document.getElementById('secGlassOpacityRow');
  if (navRow) navRow.hidden = state.navGlass === false;
  if (secRow) secRow.hidden = state.secGlass === false;
  for (const r of document.querySelectorAll('input[type="range"]')) {
    if (['animSpeed', 'cardFontPct', 'cardSizePct', 'textScalePct', 'linkScalePct', 'titleScalePct', 'detailScalePct', 'modalWidth', 'modalUiPct', 'timetableHeight', 'modalLinkScalePct', 'modalTitleScalePct', 'modalDetailScalePct'].includes(r.id)) continue;
    const row = r.closest('.row');
    const box = row && row.querySelector('.val');
    if (box) box.value = r.value;
  }
}

function save(patch, label) {
  state = { ...state, ...patch };
  chrome.storage.local.set(patch);
  chrome.storage.sync.set(patch, () => {
    if (label) flashVersion(label);
  });
}

chrome.storage.local.get(null, (local) => {
  chrome.storage.sync.get(DEFAULTS, (values) => {
    state = { ...DEFAULTS, ...(values || {}), ...(local || {}) };
    state.bgImage = local.bgImage || state.bgImage || '';
    applyPopupTheme(state.theme);
    // 一次性迁移：高级字号显示值 ×1.25（旧 80% 现在显示 100%），home.js 里同时把实际倍率 ×0.8，视觉不变
    if (!state.migrFont100) {
      if (state.cardFontPct == null || Number(state.cardFontPct) === 125) state.cardFontPct = 100;
      state.migrFont100 = true;
      chrome.storage.sync.set({ migrFont100: true, cardFontPct: state.cardFontPct });
      chrome.storage.local.set({ migrFont100: true, cardFontPct: state.cardFontPct });
    }
    if (!state.migrRow6) {
      if (state.rowMax == null || Number(state.rowMax) === 7) state.rowMax = 6;
      state.migrRow6 = true;
      chrome.storage.sync.set({ migrRow6: true, rowMax: state.rowMax });
      chrome.storage.local.set({ migrRow6: true, rowMax: state.rowMax });
    }
    if (!state.migrTs180) {
      ['linkScalePct', 'titleScalePct', 'detailScalePct'].forEach((k) => {
        const v = state[k] == null ? 100 : Number(state[k]);
        state[k] = Math.max(50, Math.min(200, Math.round(v * 1.25)));
      });
      state.migrTs180 = true;
      const patch = { migrTs180: true, linkScalePct: state.linkScalePct, titleScalePct: state.titleScalePct, detailScalePct: state.detailScalePct };
      chrome.storage.sync.set(patch);
      chrome.storage.local.set(patch);
    }
    render();
  });
});
chrome.storage.sync.remove(['bgImage', 'themeFrom', 'themeTo', 'themePreset', 'themeOpacity']);

fields.inject.addEventListener('click', () => { save({ inject: !(state.inject !== false) }, 'Saved'); render(); });
if (fields.lang) fields.lang.addEventListener('change', () => { save({ lang: fields.lang.value }); render(); });
fields.bgMode.addEventListener('change', () => { save({ bgMode: fields.bgMode.value }); render(); });
fields.bgFrom.addEventListener('input', () => save({ bgFrom: fields.bgFrom.value, bgMode: 'colors' }));
fields.bgFrom.addEventListener('change', () => save({ bgFrom: fields.bgFrom.value, bgMode: 'colors' }));
fields.bgTo.addEventListener('input', () => save({ bgTo: fields.bgTo.value, bgMode: 'colors' }));
fields.bgTo.addEventListener('change', () => save({ bgTo: fields.bgTo.value, bgMode: 'colors' }));
if (fields.bgGlow) {
  const setGlow = () => save({ bgGlow: fields.bgGlow.value });
  fields.bgGlow.addEventListener('input', setGlow);
  fields.bgGlow.addEventListener('change', setGlow);
  if (fields.bgGlowPick) {
    fields.bgGlowPick.addEventListener('input', () => { fields.bgGlow.value = fields.bgGlowPick.value; save({ bgGlow: fields.bgGlowPick.value }); });
  }
}
fields.bgOpacity.addEventListener('input', () => {
  save({ bgOpacity: Number(fields.bgOpacity.value) });
});
const themeSeg = $('themeSeg');
if (themeSeg) themeSeg.addEventListener('click', (e) => {
  const b = e.target && e.target.closest ? e.target.closest('button[data-theme]') : null;
  if (!b) return;
  const next = b.dataset.theme;
  state.theme = next;
  renderThemeSeg();
  save({ theme: next });  // 站点脚本靠 storage.onChanged 即时换主题
});
fields.bgEffect.addEventListener('change', () => save({ bgEffect: fields.bgEffect.value }));
fields.bodyOpacity.addEventListener('input', () => save({ bodyOpacity: Number(fields.bodyOpacity.value) }));
fields.cardOpacity.addEventListener('input', () => save({ cardOpacity: Number(fields.cardOpacity.value) }));
fields.cardEffect.addEventListener('change', () => save({ cardEffect: fields.cardEffect.value }));
if (fields.modalUiPct && fields.modalUiPctVal) bindPct(fields.modalUiPct, fields.modalUiPctVal, 'modalUiPct', 25, 200);
if (fields.timetableHeight && fields.timetableHeightVal) bindPct(fields.timetableHeight, fields.timetableHeightVal, 'timetableHeight', 25, 200);
function bindPct(range, val, key, min, max) {
  const sync = () => {
    const v = pctVal(range.value, min, max);
    val.value = String(v);
    save({ [key]: v });
  };
  range.addEventListener('input', sync);
  val.addEventListener('change', () => {
    const v = Math.max(min, Math.min(max, Number(val.value) || 100));
    val.value = String(v);
    range.value = String(pctPos(v, min, max));
    save({ [key]: v });
  });
}
if (fields.rowMax) {
  const setRow = (v) => { const n = Math.max(3, Math.min(10, Math.round(Number(v) || 6))); fields.rowMax.value = String(n); if (fields.rowMaxVal) fields.rowMaxVal.value = String(n); save({ rowMax: n }); };
  fields.rowMax.addEventListener('input', () => setRow(fields.rowMax.value));
  if (fields.rowMaxVal) fields.rowMaxVal.addEventListener('change', () => setRow(fields.rowMaxVal.value));
}
if (fields.cardFontPct) bindPct(fields.cardFontPct, fields.cardFontPctVal, 'cardFontPct', 75, 150);
if (fields.modalWidth && fields.modalWidthVal) bindPct(fields.modalWidth, fields.modalWidthVal, 'modalWidthPct', 25, 200);
if (fields.cardSizePct) { const syncSize = () => { if (fields.cardSizePctVal) fields.cardSizePctVal.value = fields.cardSizePct.value; save({ cardSizePct: Number(fields.cardSizePct.value) }); }; fields.cardSizePct.addEventListener('input', syncSize); if (fields.cardSizePctVal) fields.cardSizePctVal.addEventListener('change', () => { fields.cardSizePct.value = fields.cardSizePctVal.value; syncSize(); }); }
if (fields.textScalePct) bindPct(fields.textScalePct, fields.textScalePctVal, 'textScalePct', 50, 200);
if (fields.linkScalePct) bindPct(fields.linkScalePct, fields.linkScalePctVal, 'linkScalePct', 50, 200);
if (fields.titleScalePct) bindPct(fields.titleScalePct, fields.titleScalePctVal, 'titleScalePct', 50, 200);
if (fields.detailScalePct) bindPct(fields.detailScalePct, fields.detailScalePctVal, 'detailScalePct', 50, 200);
if (fields.devMode) fields.devMode.addEventListener('click', () => { save({ devMode: !(state.devMode !== false) }); render(); });
document.addEventListener('click', (e) => { const b = e.target && e.target.closest && e.target.closest('#themeSeg button'); if (b) applyPopupTheme(b.dataset.theme); }, true);
if (fields.autoLogs) fields.autoLogs.addEventListener('click', () => { save({ autoLogs: !(state.autoLogs === true) }); render(); });
fields.animSpeed.addEventListener('input', () => {
  const width = fields.animSpeed.getBoundingClientRect().width || 200;
  const p = Number(fields.animSpeed.value);
  const snaps = [{ pos: 0, spd: 0.25 }, { pos: speedToPos(0.5), spd: 0.5 }, { pos: 50, spd: 1 }, { pos: speedToPos(2), spd: 2 }, { pos: 100, spd: 5 }];
  let exact = null;
  for (const snap of snaps) {
    if (Math.abs(p - snap.pos) <= (10 / width) * 100) { fields.animSpeed.value = String(snap.pos); exact = snap.spd; break; }
  }
  const spd = exact != null ? exact : Math.round(posToSpeed(fields.animSpeed.value) * 100) / 100;
  fields.animSpeedVal.value = String(spd);
  save({ animSpeed: spd });
});
fields.animSpeedVal.addEventListener('change', () => {
  const spd = Math.max(0.25, Math.min(5, Number(fields.animSpeedVal.value) || 1));
  fields.animSpeedVal.value = String(Math.round(spd * 100) / 100);
  fields.animSpeed.value = String(speedToPos(spd));
  save({ animSpeed: spd });
});
fields.bgFromPick.addEventListener('input', () => { fields.bgFrom.value = fields.bgFromPick.value; save({ bgFrom: fields.bgFrom.value, bgMode: 'colors' }); });
fields.bgToPick.addEventListener('input', () => { fields.bgTo.value = fields.bgToPick.value; save({ bgTo: fields.bgTo.value, bgMode: 'colors' }); });
fields.applyNow.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'wt-apply' }, () => flashVersion('Applied'));
  });
});
fields.navGlass.addEventListener('click', () => { save({ navGlass: !(state.navGlass !== false) }); render(); });
fields.navGlassOpacity.addEventListener('input', () => save({ navGlassOpacity: Number(fields.navGlassOpacity.value) }));
fields.secGlass.addEventListener('click', () => { save({ secGlass: !(state.secGlass !== false) }); render(); });
fields.secGlassOpacity.addEventListener('input', () => save({ secGlassOpacity: Number(fields.secGlassOpacity.value) }));
fields.bgImage.addEventListener('change', () => {
  const file = fields.bgImage.files && fields.bgImage.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    chrome.storage.local.set({ bgImage: reader.result }, () => {
      state.bgImage = reader.result;
      save({ bgMode: 'image' }, 'Image set');
    });
  };
  reader.readAsDataURL(file);
});
fields.bgClear.addEventListener('click', () => {
  chrome.storage.local.remove('bgImage');
  state.bgImage = '';
  render();
});
fields.animations.addEventListener('click', () => {
  const on = !(state.animations !== false);
  const patch = { animations: on };
  save(patch, 'Saved');
  render();
});
if (fields.perfMode) fields.perfMode.addEventListener('click', () => { save({ perfMode: !(state.perfMode === true) }); render(); });
if (fields.clearCache) fields.clearCache.addEventListener('click', () => {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !/wise\.wesleycollege\.net/.test(tab.url || '')) { flashVersion('Open WiSE first'); return; }
      chrome.tabs.sendMessage(tab.id, { type: 'wt-clear-cache' }, () => { void chrome.runtime.lastError; });
      chrome.storage.local.get(null, (all) => {
        const keep = {};
        chrome.storage.sync.get(null, (sync) => {
          // 只清 local 里的缓存，设置留在 sync
          chrome.storage.local.clear(() => { if (window.DEBUG_KEEP) chrome.storage.local.set(keep); });
        });
      });
      flashVersion('Caches cleared');
    });
  } catch (e) { /* ignore */ }
});
if (fields.rereadAll) fields.rereadAll.addEventListener('click', () => {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !/wise\.wesleycollege\.net/.test(tab.url || '')) { flashVersion('Open WiSE first'); return; }
      chrome.tabs.sendMessage(tab.id, { type: 'wt-reread-all' }, () => { void chrome.runtime.lastError; });
      flashVersion('Re-reading…');
    });
  } catch (e) { /* ignore */ }
});
if (fields.testAlert) fields.testAlert.addEventListener('click', () => {
  const t = Date.now();
  chrome.storage.local.set({ testAlertAt: t });
  save({ testAlertAt: t }, 'Alert sent');
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !/wise\.wesleycollege\.net/.test(tab.url || '')) { flashVersion('Open WiSE first'); return; }
      chrome.tabs.sendMessage(tab.id, { type: 'wt-test-alert' }, () => { void chrome.runtime.lastError; });
    });
  } catch (e) { /* ignore */ }
});
const resetAll = document.getElementById('resetAll');
if (resetAll) resetAll.addEventListener('click', () => {
  const reset = { ...DEFAULTS };
  chrome.storage.local.set(reset);
  chrome.storage.sync.set(reset);
  chrome.storage.local.remove('bgImage');
  state = reset;
  render();
  flashVersion('Reset');
});
fields.resetTheme.addEventListener('click', () => {
  chrome.storage.local.remove('bgImage');
  state.bgImage = '';
  save({ bgMode: 'colors', bgFrom: '#f7f2f9', bgTo: '#efe4f4', bgOpacity: 100, bgEffect: 'none' }, 'Background reset');
  render();
});
fields.gear.addEventListener('click', () => fields.sheet.classList.add('open'));
fields.sheetClose.addEventListener('click', () => fields.sheet.classList.remove('open'));
fields.sheet.addEventListener('click', (e) => { if (e.target === fields.sheet) fields.sheet.classList.remove('open'); });
for (const r of document.querySelectorAll('input[type="range"]')) {
  if (String(r.min) === '0' && String(r.max) === '100') {
    r.addEventListener('input', () => {
      if (Math.abs(Number(r.value) - 50) <= 4) { r.value = '50'; r.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  }
}
for (const r of document.querySelectorAll('input[type="range"]')) {
  if (r.dataset.tuned) continue;
  const sliderRow = r.closest('.row');
  if (sliderRow) sliderRow.classList.add('slider');
  if (sliderRow && sliderRow.querySelector('.val')) continue;
  if (['animSpeed', 'cardFontPct', 'cardSizePct', 'textScalePct', 'linkScalePct', 'titleScalePct', 'detailScalePct', 'modalWidth', 'modalUiPct', 'timetableHeight', 'modalLinkScalePct', 'modalTitleScalePct', 'modalDetailScalePct'].includes(r.id)) continue;
  r.dataset.tuned = '1';
  const box = document.createElement('input');
  box.type = 'number';
  box.className = 'val';
  box.min = r.min; box.max = r.max; box.step = r.step;
  box.value = r.value;
  const row = r.closest('.row');
  if (row) row.insertBefore(box, r);
  if (row && r.id !== 'animSpeed') {
    const pct = document.createElement('span');
    pct.className = 'suffix';
    pct.textContent = r.id === 'modalWidth' ? 'px' : '%';
    box.after(pct);
  }
  r.addEventListener('input', () => { box.value = r.value; });
  r.addEventListener('input', () => {
    const min = Number(r.min) || 0;
    const max = Number(r.max) || 100;
    const mid = Math.round((min + max) / 2);
    const p = Number(r.value);
    const pos = (p - min) / (max - min) * 100;
    for (const snap of [0, 50, 100]) {
      if (Math.abs(pos - snap) <= (10 / r.getBoundingClientRect().width) * 100) {
        r.value = String(snap === 0 ? min : snap === 50 ? mid : max);
        box.value = r.value;
        break;
      }
    }
  });
  box.addEventListener('change', () => { r.value = box.value; r.dispatchEvent(new Event('input', { bubbles: true })); });
}
const feedbackBtn = document.getElementById('feedbackBtn');
const feedback = document.getElementById('feedback');
const feedbackClose = document.getElementById('feedbackClose');
if (feedbackBtn && feedback) feedbackBtn.addEventListener('click', () => feedback.classList.add('open'));
if (feedbackClose && feedback) feedbackClose.addEventListener('click', () => feedback.classList.remove('open'));
if (feedback) feedback.addEventListener('click', (e) => { if (e.target === feedback) feedback.classList.remove('open'); });
function buildLogReport(v) {
  const ver = (() => { try { return chrome.runtime.getManifest().version; } catch { return '?'; } })();
  const head = [
    'Better WiSE page — debug log',
    'version: ' + ver,
    'exported: ' + new Date().toISOString(),
    'ua: ' + navigator.userAgent,
    'check: ' + JSON.stringify(v.wesleyPageCheck || null),
    'search: ' + JSON.stringify(v.wesleySearchStats || null),
    'style: ' + JSON.stringify({ theme: v.theme || 'system', perf: v.perfMode === true }),
    ''
  ].join('\n');
  const lines = (v.wesleyLogs || []).map((x) => '[' + x.t + '] ' + x.msg);
  const errors = lines.filter((l) => /error|fail|exception|timeout|429/i.test(l));
  return head + (lines.length ? lines.join('\n') : '(no logs yet)')
    + '\n\n--- ' + errors.length + ' line(s) look like errors ---\n' + errors.join('\n');
}
function downloadLogs(auto) {
  chrome.storage.local.get(null, (v) => {
    const text = buildLogReport(v || {});
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = 'better-wise-logs-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.txt';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    if (auto) chrome.storage.local.set({ autoLogsAt: Date.now() });
  });
}
const dlLogs = document.getElementById('downloadLogs');
if (dlLogs) dlLogs.addEventListener('click', () => downloadLogs(false));
if (state.autoLogs === true) {
  chrome.storage.local.get({ autoLogsAt: 0 }, (v) => {
    if (Date.now() - (v.autoLogsAt || 0) > 6 * 3600 * 1000) downloadLogs(true);
  });
}
// Re-read buttons work on their own now: there is no AI switch to gate them.
const rereadBtn = document.getElementById('reread');
const rereadStatus = document.getElementById('rereadStatus');
if (rereadBtn) rereadBtn.addEventListener('click', () => {
  rereadStatus.classList.remove('err');
  rereadStatus.textContent = 'Proceeding…';
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) { rereadStatus.classList.add('err'); rereadStatus.textContent = 'No active tab.'; return; }
    chrome.tabs.sendMessage(tab.id, { type: 'wt-reread' }, (resp) => {
      if (chrome.runtime.lastError) { rereadStatus.classList.add('err'); rereadStatus.textContent = 'Failed: ' + chrome.runtime.lastError.message; return; }
      if (resp && resp.ok) { rereadStatus.textContent = 'Succeed!'; setTimeout(() => { rereadStatus.textContent = ''; }, 2000); }
      else { rereadStatus.classList.add('err'); rereadStatus.textContent = 'Failed'; if (resp && resp.error) { const pre = document.createElement('pre'); pre.textContent = resp.error; rereadStatus.append(pre); } }
    });
  });
});
function bindModalPct(id, key) {
  const el2 = document.getElementById(id);
  if (!el2) return;
  const val = document.getElementById(id + 'Val');
  if (val) { bindPct(el2, val, key, 50, 200); return; }
  el2.addEventListener('input', () => save({ [key]: Number(el2.value) }));
}
['modalLinkScalePct', 'modalTitleScalePct', 'modalDetailScalePct'].forEach((k) => {
  if (state[k] === 50 || state[k] == null) state[k] = 100;
  if (fields[k]) fields[k].value = String(pctPos(state[k], 50, 200));
  const v = document.getElementById(k + 'Val'); if (v) v.value = String(state[k]);
});
bindModalPct('modalLinkScalePct', 'modalLinkScalePct');
bindModalPct('modalTitleScalePct', 'modalTitleScalePct');
bindModalPct('modalDetailScalePct', 'modalDetailScalePct');
fetch(chrome.runtime.getURL('icons/settings.svg'))
  .then((r) => r.text())
  .then((svg) => {
    const gear = fields.gear;
    const clean = svg.replace(/fill="[^"]*"/g, 'fill="currentColor"').replace(/width="[^"]*"/g, 'width="13"').replace(/height="[^"]*"/g, 'height="13"');
    gear.innerHTML = clean + 'Settings';
    gear.style.display = 'inline-flex';
    gear.style.alignItems = 'center';
    gear.style.gap = '5px';
  })
  .catch(() => { /* keep text */ });

// turn sheet groups into collapsible sections
(function collapseGroups() {
  const card = document.querySelector('#sheet .sheet-card');
  if (!card) return;
  for (const head of [...card.querySelectorAll('.sheet-head.group')]) {
    const details = document.createElement('details');
    details.className = 'sect';
    const summary = document.createElement('summary');
    // 只用文字节点做标题，保留 head 里的按钮（比如 Model 旁的 ? 教程按钮）
    const label = [...head.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    summary.append(document.createTextNode(label || head.textContent.trim()));
    for (const child of [...head.children]) {
      if (child.tagName === 'BUTTON') { child.addEventListener('click', (e) => e.stopPropagation()); summary.append(child); }
    }
    details.append(summary);
    head.replaceWith(details);
    let n = details.nextElementSibling;
    while (n && !(n.classList && (n.classList.contains('sheet-head') || n.classList.contains('sect')))) { const next = n.nextElementSibling; details.append(n); n = next; }
  }
})();

// move tsize details into their group body after collapsing
setTimeout(() => {
  const secs = [...document.querySelectorAll('#sheet details.sect')];
  for (const sec of secs) {
    const sum = sec.querySelector('summary');
    const t = (sum && sum.textContent || '').toLowerCase();
    const body = [...document.querySelectorAll('details.tsize')];
    for (const ts of body) {
      const label = (ts.querySelector('summary') || {}).textContent || '';
      if (/modal/i.test(label) && /modal/i.test(t) && !sec.contains(ts)) sec.append(ts);
      if (!/modal/i.test(label) && /cards/i.test(t) && !sec.contains(ts)) sec.append(ts);
    }
  }
}, 0);

// put Background immediately before Developer
setTimeout(() => {
  const secs = [...document.querySelectorAll('#sheet details.sect')];
  const bg = secs.find((s) => /background/i.test(s.querySelector('summary')?.textContent || ''));
  const dev = secs.find((s) => /developer/i.test(s.querySelector('summary')?.textContent || ''));
  if (bg && dev && bg.nextElementSibling !== dev) dev.parentElement.insertBefore(bg, dev);
}, 0);

setTimeout(() => {
  document.querySelectorAll('#sheet details > summary').forEach((sum) => {
    if (sum.querySelector('.wt-chev')) return;
    const sp = document.createElement('span'); sp.className = 'wt-chev';
    sp.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"></path></svg>';
    sum.append(sp);
  });
  document.querySelectorAll('#sheet details.sect').forEach((d) => { const s2 = d.querySelector('summary'); if (s2 && /surfaces/i.test(s2.textContent || '')) d.style.display = 'none'; });
  document.querySelectorAll('#sheet details.sect .row').forEach((r) => { r.style.margin = '3px 0'; });
}, 0);

/* ===== 总开关（摇杆碗）的液位：MV3 页面不能内联脚本，放这里 ===== */
(function () {
  var el = document.getElementById('inject');
  if (!el) return;
  var lvl = 0, hover = false, raf = null, last = 0;
  function sync() { el.setAttribute('aria-checked', el.classList.contains('on') ? 'true' : 'false'); }
  function step(now) {
    var dt = Math.min(50, now - last); last = now;
    var target = (hover || el.classList.contains('on')) ? 1 : 0;
    if (lvl === target) { raf = null; return; }
    var rate = target > lvl ? (1000 / 1000) : -(1000 / 750);
    var next = lvl + rate * dt / 1000;
    if ((rate > 0 && next >= target) || (rate < 0 && next <= target)) next = target;
    lvl = next;
    el.style.setProperty('--lvl', next.toFixed(3));
    raf = requestAnimationFrame(step);
  }
  function kick() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(step); }
  el.addEventListener('pointerenter', function () { hover = true; kick(); });
  el.addEventListener('pointerleave', function () { hover = false; kick(); });
  el.addEventListener('focus', function () { hover = true; kick(); });
  el.addEventListener('blur', function () { hover = false; kick(); });
  el.addEventListener('click', function () { setTimeout(function () { sync(); kick(); }, 0); });
  if (window.MutationObserver) {
    new MutationObserver(function () { sync(); kick(); }).observe(el, { attributes: true, attributeFilter: ['class'] });
  }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { lvl = 1; el.style.setProperty('--lvl', '1'); }
  sync(); kick();
})();

// 设置行的结构是 <div class="row"><span>标签</span><控件/></div>，控件自己没有可访问名字，
// 屏幕阅读器念按钮时只有「开关，已打开」，念数字框/滑杆时只有「编辑框」，不知道是哪个设置。
// 这里把同一行那个 span 的文字补成 aria-label（已经有 label[for] 的不动）。
(function labelSettingRows() {
  var rows = document.querySelectorAll('.row');
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var span = row.querySelector(':scope > span');
    var text = span && span.textContent ? span.textContent.trim() : '';
    if (!text) continue;
    var controls = row.querySelectorAll('button, input, select, textarea');
    for (var j = 0; j < controls.length; j++) {
      var el = controls[j];
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) continue;
      var id = el.id;
      if (id && document.querySelector('label[for="' + id + '"]')) continue;
      el.setAttribute('aria-label', text);
    }
  }
})();

/* ===== 快捷键：每个 panel 一个键，默认只有 Due / 搜索 / 换天有 ===== */
(function shortcutsUI() {
  /* 和 search.js 一致：搜索默认 mod+k（Ctrl/⌘+K），老配置里的 alt+k 视为没改过 */
  const DEFAULTS = { search: 'mod+k', due: 'alt+d', todo: '', upcoming: '', panel: '', nextDay: 'alt+t' };
  const migrate = (m) => {
    const out = Object.assign({}, DEFAULTS, m || {});
    if (out.search === 'alt+k') out.search = DEFAULTS.search;
    return out;
  };
  const caps = [...document.querySelectorAll('.wt-keycap')];
  if (!caps.length) return;
  let map = Object.assign({}, DEFAULTS);
  let recording = null;

  const pretty = (v) => String(v || '').split('+').map((p) => {
    if (p === 'mod') return 'Ctrl';
    if (p === 'alt') return 'Alt';
    if (p === 'shift') return 'Shift';
    return p.length === 1 ? p.toUpperCase() : p;
  }).join(' + ');

  const paint = () => caps.forEach((b) => {
    const v = map[b.dataset.shortcut] || '';
    if (recording === b) return;
    b.textContent = v ? pretty(v) : 'Set…';
    b.classList.toggle('empty', !v);
  });
  const save = () => { try { chrome.storage.local.set({ shortcuts: map }); } catch (e) { /* 存不了就先这样 */ } };

  try {
    chrome.storage.local.get({ shortcuts: null }).then((v) => {
      if (v && v.shortcuts && typeof v.shortcuts === 'object') map = migrate(v.shortcuts);
      paint();
    }).catch(paint);
  } catch (e) { paint(); }

  /* 和 search.js 里的 comboOf 保持同一套写法，否则存进去和比出来的对不上 */
  const comboOf = (e) => {
    const mods = [];
    if (e.ctrlKey || e.metaKey) mods.push('mod');
    if (e.altKey) mods.push('alt');
    if (e.shiftKey) mods.push('shift');
    if (!mods.length) return '';
    let k = String(e.key || '').toLowerCase();
    if (!k || ['alt', 'control', 'meta', 'shift'].includes(k)) return '';
    const m = /^Key([A-Z])$/.exec(String(e.code || ''));
    if (m) k = m[1].toLowerCase();
    else if (/^Digit([0-9])$/.exec(String(e.code || ''))) k = String(e.code).slice(5);
    return mods.concat([k]).join('+');
  };

  document.addEventListener('keydown', (e) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { recording.classList.remove('rec'); recording = null; paint(); return; }
    const c = comboOf(e);
    if (!c) return;
    const who = recording.dataset.shortcut;
    map[who] = c;
    /* 一个键只能管一件事：撞了就清掉别人 */
    for (const k of Object.keys(map)) if (k !== who && map[k] === c) map[k] = '';
    recording.classList.remove('rec');
    recording = null;
    paint();
    save();
  }, true);

  caps.forEach((b) => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      if (recording) recording.classList.remove('rec');
      recording = b;
      b.classList.add('rec');
      b.textContent = 'Press keys…';
    });
  });
  document.querySelectorAll('.wt-keyclear').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      map[b.dataset.shortcut] = '';
      paint();
      save();
    });
  });
})();

/* ===== 诊断：把最近的日志和工作状态摆出来，出问题不用开控制台 ===== */
(function diagnostics() {
  const out = document.getElementById('diagLog');
  const ver = document.getElementById('diagVersion');
  const mount = document.getElementById('diagMount');
  const warn = document.getElementById('diagWarn');
  const copyBtn = document.getElementById('diagCopy');
  if (!out) return;
  let lines = [];

  const paint = (logs) => {
    const arr = Array.isArray(logs) ? logs.slice(-12) : [];
    lines = arr.map((x) => {
      const t = x && x.t ? String(x.t).slice(11, 19) : '--:--:--';
      return t + '  ' + String((x && x.msg) || '');
    });
    out.textContent = lines.length ? lines.join('\n') : 'No log entries yet.';
    const w = [...lines].reverse().find((l) => /warn|error|fail|missing/i.test(l));
    if (warn) warn.textContent = w.slice(9).slice(0, 48);
  };

  try {
    chrome.storage.local.get({ wesleyLogs: [], wesleyAnchorWarn: null }, (v) => {
      paint(v && v.wesleyLogs);
      if (mount) {
        const last = Array.isArray(v && v.wesleyLogs) ? [...v.wesleyLogs].reverse().find((x) => /panel/i.test((x && x.msg) || '')) : null;
        mount.textContent = last ? 'ok' : 'unknown';
      }
      if (warn && !warn.textContent.trim()) warn.textContent = 'none';
    });
  } catch (e) { out.textContent = 'storage unavailable'; }

  try {
    const mf = chrome.runtime.getManifest();
    if (ver && mf) ver.textContent = mf.version + ' (beta' + String(mf.version).split('.').pop() + ')';
  } catch (e) { /* ignore */ }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = 'Better WiSE diagnostics\n' +
        'version: ' + (ver ? ver.textContent : '?') + '\n' +
        'when: ' + new Date().toISOString() + '\n\n' + lines.join('\n');
      try {
        navigator.clipboard.writeText(text).then(() => { copyBtn.textContent = 'Copied'; setTimeout(() => { copyBtn.textContent = 'Copy diagnostics'; }, 1200); });
      } catch (e) { out.textContent = text; }
    });
  }

  /* ---- 被顶栏那颗齿轮嵌进浮层时，把自己的内容高度报上去 ----
     这一页既是 toolbar popup 也是那个 300px 浮层里的 iframe。浮层是站点页面的一部分，
     和这里是两个源，父页面量不到我们的高度，只能自己报。以前浮层高度写死 640px，
     内容只有 500 出头，底下就空一大块。 */
  if (window.parent && window.parent !== window) {
    let lastH = 0;
    const reportHeight = () => {
      const h = Math.ceil(document.body.getBoundingClientRect().height);
      if (!h || Math.abs(h - lastH) < 2) return;
      lastH = h;
      try { window.parent.postMessage({ type: 'wt-options-height', height: h }, '*'); } catch (e) { /* ignore */ }
    };
    window.addEventListener('load', reportHeight);
    setTimeout(reportHeight, 0);
    setTimeout(reportHeight, 120);
    setTimeout(reportHeight, 450);
    try { new ResizeObserver(reportHeight).observe(document.body); } catch (e) { /* ignore */ }
    /* 折叠区、诊断面板这类 <details> 一展开就换高度 */
    document.addEventListener('toggle', () => setTimeout(reportHeight, 0), true);
    window.addEventListener('resize', reportHeight);
  }
})();
