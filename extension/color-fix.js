/* Better WiSE — 深色模式下：
 *   1) 保留老师用的字体颜色，只把"深到看不清"的调亮；
 *   2) logo 一律刷成纯白（原图是深墨色画在透明底上，深色底下本来就看不清，
 *      而且 tRNS 只声明纯白透明，字形边上那圈近白像素在深底上会变成一圈白边）。
 */
(function () {
  'use strict';
  if (window.__wtColorFix) return;
  window.__wtColorFix = true;

  const DARK_BELOW = 0.34;   // 相对亮度低于这个值就算"深到看不清"
  const LIFT_TO = 0.72;      // 提亮后的目标亮度
  const SEL = '#content article [style*="color"], #content article font[color], #content .sb-ck-callout [style*="color"]';

  function parseRgb(str) {
    const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(str || '');
    if (!m) return null;
    return [+m[1], +m[2], +m[3]];
  }
  function lum(rgb) {
    const f = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0; const l = (max + min) / 2; const d = max - min;
    if (d) {
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
      return [h * 360, s, l];
    }
    return [0, 0, l];
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (!s) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const conv = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [conv(h + 1 / 3) * 255, conv(h) * 255, conv(h - 1 / 3) * 255];
  }

  function fixOne(el) {
    if (!el || el.dataset.wtColorDone === '1') return;
    const rgb = parseRgb(getComputedStyle(el).color);
    if (!rgb) return;
    el.dataset.wtColorDone = '1';
    if (lum(rgb) >= DARK_BELOW) return;      // 本来就够亮，别动
    const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    // 灰色（几乎没饱和度）就提亮成中性色，不然会变成脏黄
    const nl = Math.max(l, LIFT_TO);
    const ns = s < 0.12 ? 0 : Math.min(1, s * 0.95);
    const out = hslToRgb(h, ns, nl).map((v) => Math.round(v));
    el.style.setProperty('color', 'rgb(' + out.join(',') + ')', 'important');
    el.classList.add('wt-color-lifted');
  }

  function sweep(root) {
    if (document.documentElement.getAttribute('data-wt-theme') !== 'dark') return;
    const base = root && root.querySelectorAll ? root : document;
    if (base.matches && base.matches(SEL)) fixOne(base);
    base.querySelectorAll ? base.querySelectorAll(SEL).forEach(fixOne) : null;
  }

  /* ── 深色下的 logo ─────────────────────────────────────────────────
     站点 logo 是调色板 PNG（logo.php?logo=skin_logo_large / skin_logo_square）。
     large 那张的 tRNS 只声明调色板 0 号的纯白透明，(211,201,213)、(233,228,234)
     这些近白像素全都不透明、还正好贴着字形轮廓，深底上就是一圈白边；而墨色本身
     是深紫，压在深底上又几乎看不见。
     与其去算像素，不如直接把它刷成纯白：brightness(0) 先把所有不透明像素压成黑，
     invert(1) 再翻成白，alpha 原样保留，所以轮廓、笔画、空隙全在，白边也没了。
     这是品牌在深色下的标准做法（站点自己那张 skin_logo_square 就是白墨）。
     只对带透明的 skin_logo_large 动手：skin_logo_square 是不透明的紫色方块 + 白墨，
     整套滤镜会把整个方块刷成纯白。 */
  const LOGO_CSS = 'html[data-wt-theme="dark"] img[alt="Wesley College"][src*="skin_logo_large"]'
            + '{filter:brightness(0) invert(1) !important;}';

  function ensureLogoStyle() {
    if (document.getElementById('wt-logo-white')) return;
    const s = document.createElement('style');
    s.id = 'wt-logo-white';
    s.textContent = LOGO_CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  let timer = 0;
  const kick = () => { clearTimeout(timer); timer = setTimeout(() => { sweep(document); ensureLogoStyle(); }, 120); };

  const start = () => {
    ensureLogoStyle();
    sweep(document);
    try {
      new MutationObserver(kick).observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* ignore */ }
    // 主题切换时重扫（深色→浅色要撤掉提亮，所以浅色下把标记清掉）
    try {
      new MutationObserver(() => {
        if (document.documentElement.getAttribute('data-wt-theme') !== 'dark') {
          document.querySelectorAll('[data-wt-color-done="1"]').forEach((n) => {
            delete n.dataset.wtColorDone;
            n.style.removeProperty('color');
            n.classList.remove('wt-color-lifted');
          });
        } else kick();
        ensureLogoStyle();
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-wt-theme'] });
    } catch (e) { /* ignore */ }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
