/* Runs at document_start: paints the right theme before the site renders,
   so a dark-mode user never sees a white flash and the panel stops popping in late. */
(function () {
  'use strict';
  try {
    var mode = 'system';
    try { mode = localStorage.getItem('wesleyTheme') || 'system'; } catch (e) { /* ignore */ }
    var isDark = function (m) {
      return m === 'dark' || (m !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
    var dark = isDark(mode);
    document.documentElement.setAttribute('data-wt-theme', dark ? 'dark' : 'light');
    /* 这面「镜子」可能过期（在设置页改主题时没有站点标签开着，就写不进来）。
       镜像只是一次猜测；chrome.storage 才是真值。这里再问一次，
       几毫秒后就把画错的主题改回来，别让用户先看到一整片白。 */
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ theme: 'system' }, function (o) {
          var pref = String((o && o.theme) || 'system');
          var want = isDark(pref);
          var now = document.documentElement.getAttribute('data-wt-theme');
          if (want !== (now === 'dark')) {
            document.documentElement.setAttribute('data-wt-theme', want ? 'dark' : 'light');
            var st = document.getElementById('wt-boot-theme');
            if (want && !st) {
              st = document.createElement('style');
              st.id = 'wt-boot-theme';
              st.textContent = 'html{background:#151517!important;color-scheme:dark}body{background:#151517!important}';
              (document.head || document.documentElement).appendChild(st);
            } else if (!want && st) {
              st.remove();
            }
          }
          try { localStorage.setItem('wesleyTheme', pref); } catch (e2) { /* ignore */ }
        });
      }
    } catch (e3) { /* ignore */ }
    /* 站点自身的排版微调也在这里挂上：这份 CSS 是 document_start 生效的，
       如果等 home.js 注入（约 1 秒后），用户会先看到站点原样、再看到调过的样子。
       搜索框收窄、头像留白、课表与下方板块的间距 —— 三条都是纯版式，早挂早一致。 */
    /* ⚠️ 只许改位置（right），绝不能锁 width：
       站点自己的 .sbx-header-search:hover{width:100%;padding-left:calc(var(--sbx-header-button-width)*2)}
       就是靠宽度撑开搜索框的，钉死宽度会让它一悬浮就整块跳位。 */
    var chromeCss = 'form.sbx-header-search{right:170px!important}' +
      'a.account-menu{margin-right:30px!important}' +
      'section.right-small{padding-right:18px!important}' +
      '.row:has(table.timetable):not(.timetable-small){margin-bottom:14px}';
    var cs = document.createElement('style');
    cs.id = 'wt-boot-chrome';
    cs.textContent = chromeCss;
    (document.head || document.documentElement).appendChild(cs);
    if (dark) {
      var st = document.createElement('style');
      st.id = 'wt-boot-theme';
      st.textContent = 'html{background:#151517!important;color-scheme:dark}body{background:#151517!important}';
      (document.head || document.documentElement).appendChild(st);
    }
  } catch (e) { /* ignore */ }
})();
