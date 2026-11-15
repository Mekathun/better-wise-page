/* WiSE homepage timetable — expandable period cards + tabbed "Today" panel.
 * Runs on the WiSE dashboard (https://wise.wesleycollege.net/) using the
 * extension's embedded snapshot (latest posts) plus local task parsing.
 */
(function () {
  'use strict';

  /* 只让一个实例干活：content script 偶尔会被注入两份（profile 里残留的旧注册、
     调试时重复 loadUnpacked），两份 main() 会各自插一块合成课表、互相把面板盖回骨架，
     最后谁都收不了尾。用 documentElement 上的属性做跨世界标记，第二个实例直接退出。 */
  if (document.documentElement.hasAttribute('data-wt-home-booted')) return;
  document.documentElement.setAttribute('data-wt-home-booted', '1');

  const S = {
    en: {
    cacheStale: 'Using saved data from {ago} ago',
    refreshAll: 'Reload fresh data',
    cacheRetry: 'Retry',
      today: 'Today',
      all: 'All',
      toDo: 'To do today',
      upcoming: 'Upcoming assessment / test / exam',
      now: 'NOW',
      noTasks: 'No task cards for this class yet.',
      openPost: 'Open post',
      analyse: 'Analyse live',
      covers: 'Covers',
      inDays: (n) => (n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`),
      inHours: (n) => (n === 1 ? 'in 1 hour' : `in ${n} hours`),
      inMins: (n) => (n === 1 ? 'in 1 min' : `in ${n} min`),
      markDone: 'Mark as done',
      room: 'Room',
      examInfo: 'Exam information',
      exam: 'Exam',
      tasks: 'tasks',
      periods: 'periods',
      noPost: 'No announcement',
      show: 'Show',
      hide: 'Hide',
      class: 'classes',
      link: 'link',
    },
    zh: {
    cacheStale: '正在用 {ago}前的缓存数据',
    refreshAll: '重新抓取最新数据',
    cacheRetry: '重试',
      today: '今天',
      all: '全部',
      toDo: '今天要做',
      upcoming: '即将到来的测验 / 考试',
      now: '现在',
      noTasks: '这节课还没有任务卡。',
      openPost: '打开公告',
      analyse: '实时分析',
      covers: '涵盖',
      inDays: (n) => (n <= 0 ? '今天' : n === 1 ? '明天' : `${n} 天后`),
      inHours: (n) => `还有 ${n} 小时`,
      inMins: (n) => `还有 ${n} 分钟`,
      markDone: '标记为完成',
      room: '教室',
      examInfo: '考试信息',
      exam: '考试',
      tasks: '个任务',
      periods: '节课',
      noPost: '暂无公告',
      show: '展开',
      hide: '收起',
      class: '门课',
      link: '链接',
    },
  };
  const DEFAULT_SETTINGS = {
    lang: 'en',
    themeFrom: '#f7f2f9',
    themeTo: '#efe4f4',
    themePreset: '1',
    themeOpacity: 100,
    animations: true,
    smooth: true,
  };
  const KIND = { classwork: 'Classwork', homework: 'Homework', exam: 'Exam', resource: 'Resource', other: 'Other' };

  const CSS = `
/* ===== theme tokens (light) ===== */
:root{
  --wt-t-surface:#ffffff;
  --wt-t-surface-2:#ffffff;
  --wt-t-surface-2:rgba(255,255,255,.55);
  --wt-t-glass:rgba(255,255,255,.6);
  --wt-t-line:rgba(0,0,0,.08);
  --wt-t-line-strong:rgba(0,0,0,.16);
  --wt-t-line-soft:rgba(0,0,0,.06);
  --wt-t-ink:#222222;
  --wt-t-ink-2:#666666;
  --wt-t-ink-3:#888888;
  --wt-t-accent:#64346f;
  --wt-t-accent-deep:#3f1f49;
  --wt-t-accent-weak:rgba(100,52,111,.12);
  --wt-t-hover:rgba(100,52,111,.04);
  --wt-t-shadow:0 3px 10px rgba(0,0,0,.08);
  --wt-t-modal-shadow:0 24px 64px rgba(0,0,0,.3);
  --wt-t-muted-card:#f4f4f4;
  --wt-t-glow:rgba(255,255,255,.32);
  --wt-t-panel:#fbf7fd;
  --wt-t-panel-2:#fbfafc;
  --wt-t-panel-hi:#f7f1fb;
  --wt-t-panel-hi-2:rgba(247,241,251,.6);
  --wt-t-panel-shadow:0 1px 2px rgba(24,16,30,.04),0 18px 44px rgba(24,16,30,.07);
  --wt-t-head-hover:linear-gradient(135deg,rgba(244,239,248,.9) 0%,rgba(236,226,243,.85) 55%,rgba(255,255,255,0) 100%);
}

/* 站点的滚动条挂在 <body> 上（body 自己 overflow:scroll）。这里再给 <html> 强行开一个
   滚动容器，右边就会出现两条竖条：一条视口的、一条页面的。交给站点自己管。 */
html{scrollbar-gutter:auto;}
[data-wesley-home] .wt-summary{margin:6px 0 10px;border:1px solid var(--wt-t-line);border-radius:8px;overflow:hidden;}
[data-wesley-home] .wt-summary-head .wt-chev{color:#64346f;}
[data-wesley-home] .wt-summary-head{display:flex;align-items:center;gap:10px;padding:14px;font-size:15px;color:var(--wt-t-ink);position:relative;overflow:hidden;background:transparent;border-radius:7px 7px 0 0;box-shadow:inset 0 1px 0 rgba(255,255,255,.35);}
[data-wesley-home] .wt-summary-head::before{content:'';position:absolute;right:-40px;top:-70px;width:200px;height:200px;background:radial-gradient(circle,rgba(255,255,255,.32),rgba(255,255,255,0) 66%);pointer-events:none;}
[data-wesley-home] .wt-summary-head b{color:var(--wt-t-accent-deep);font-weight:750;font-size:17px;letter-spacing:.01em;text-shadow:0 1px 1px rgba(255,255,255,.35);}

[data-wesley-home] .wt-summary-head .wt-count{margin-left:auto;font-size:10.5px;color:var(--wt-t-accent);background:var(--wt-t-glass);border:1px solid var(--wt-t-line);padding:2px 9px;border-radius:999px;}
[data-wesley-home] .wt-tabs{display:flex;gap:6px;overflow-x:auto;padding:8px 12px 0;border-bottom:1px solid rgba(0,0,0,.06);background:rgba(255,255,255,var(--wt-nav-op,.6));backdrop-filter:blur(8px) saturate(1.15);-webkit-backdrop-filter:blur(8px) saturate(1.15);border-radius:8px;margin:0 0 2px;}
.wt-no-navglass .wt-tabs{background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;}
[data-wesley-home] .wt-tab{display:inline-flex;align-items:center;white-space:nowrap;font:inherit;font-size:11.5px;padding:4px 10px;border-radius:999px;border:1px solid transparent;background:transparent;color:var(--wt-t-ink-2);cursor:pointer;box-sizing:border-box;min-width:0;}
/* 名字太长就省略号，但铅笔不能被一起裁掉 —— 所以文字单独放一个 span 里截断。 */
[data-wesley-home] .wt-tab .wt-tab-lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
[data-wesley-home] .wt-tab:hover{background:rgba(100,52,111,.07);}
[data-wesley-home] .wt-tab.active{background:transparent;color:var(--wt-t-accent);font-weight:400;text-shadow:none;}
[data-wesley-home] .wt-tab-body{padding:8px 12px 0;display:flex;flex-direction:column;gap:8px;}
[data-wesley-home] .wt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;justify-items:stretch;}
/* Due 分组小标题（今天 / 明天 / 本周 / 以后），颜色走主题 token，暗色自动跟上 */
[data-wesley-home] .wt-refresh-btn{margin-left:auto;width:20px;height:20px;padding:0;border:0;border-radius:999px;background:transparent;color:var(--wt-t-ink-3);font-size:13px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:color .12s ease,background .12s ease,transform .3s ease;}
[data-wesley-home] .wt-refresh-btn:hover{color:var(--wt-t-ink);background:var(--wt-t-glass);transform:rotate(90deg);}
[data-wesley-home] .wt-refresh-btn:focus-visible{outline:2px solid var(--wt-t-accent);outline-offset:1px;}
[data-wesley-home] .wt-cache-note{display:flex;align-items:center;gap:10px;padding:6px 14px;font-size:11.5px;border-bottom:1px solid var(--wt-t-line);color:var(--wt-t-ink-2);background:var(--wt-t-glass);}
[data-wesley-home] .wt-cache-retry{font:inherit;font-size:11.5px;font-weight:600;padding:1px 9px;border-radius:999px;border:1px solid var(--wt-t-line);background:transparent;color:var(--wt-t-ink);cursor:pointer;}
[data-wesley-home] .wt-cache-retry:hover{background:var(--wt-t-hover);}
[data-wesley-home] .wt-day-chip{font:inherit;font-size:10.5px;font-weight:600;letter-spacing:.01em;padding:1px 8px;border-radius:999px;border:1px solid var(--wt-t-line);background:var(--wt-t-glass);color:var(--wt-t-ink-2);cursor:pointer;margin-left:2px;}
[data-wesley-home] .wt-day-chip:hover{background:var(--wt-t-hover);color:var(--wt-t-ink);}
@media (min-width:1181px){[data-wesley-home] .wt-grid{grid-template-columns:repeat(var(--wt-cols,6),minmax(0,1fr));}}
[data-wesley-home] .wt-cw{display:flex;justify-content:center;min-width:0;width:100%;}
[data-wesley-home] .wt-task,[data-wesley-home] .wt-due-card,[data-wesley-home] .wt-custom-card{width:calc(var(--wt-card-scale,1) * 100%);}
@media (max-width: 1180px){[data-wesley-home] .wt-grid{grid-template-columns:repeat(6,minmax(0,1fr));}}
@media (max-width: 1000px){[data-wesley-home] .wt-grid{grid-template-columns:repeat(5,minmax(0,1fr));}}
@media (max-width: 820px){[data-wesley-home] .wt-grid{grid-template-columns:repeat(4,minmax(0,1fr));}}
@media (max-width: 640px){[data-wesley-home] .wt-grid{grid-template-columns:repeat(3,minmax(0,1fr));}}
@media (max-width: 480px){[data-wesley-home] .wt-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
[data-wesley-home] .wt-task{display:flex;flex-direction:column;gap:4px;padding:9px 10px 8px;border:1px solid var(--wt-t-line);border-top:3px solid var(--wt-color,var(--wt-t-accent));border-radius:7px;background:var(--wt-t-surface);cursor:pointer;text-align:left;font:inherit;color:inherit;}
[data-wesley-home] .wt-task:hover{background:rgba(100,52,111,.04);box-shadow:0 3px 10px rgba(0,0,0,.08);}
[data-wesley-home] .wt-task .wt-cls{display:flex;align-items:center;gap:6px;font-size:9.5px;color:var(--wt-t-ink-3);}
[data-wesley-home] .wt-task .wt-dot{width:7px;height:7px;border-radius:50%;background:var(--wt-color,#64346f);flex:none;}
[data-wesley-home] .wt-task .wt-kind{font-size:9px;font-weight:700;color:var(--wt-ink,#64346f);}
[data-wesley-home] .wt-task .wt-title{font-size:var(--wt-card-font,13px);font-size:12px;line-height:16px;font-weight:650;color:var(--wt-t-ink);}
[data-wesley-home] .wt-task .wt-detail{font-size:10.5px;line-height:14px;color:var(--wt-t-ink-2);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:normal;}
[data-wesley-home] .wt-task .wt-due{font-size:9.5px;font-weight:650;color:#a0522d;margin-top:auto;}
[data-wesley-home] .wt-task .wt-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;}
[data-wesley-home] .wt-task .wt-links a{font-size:9.5px;color:#64346f;text-decoration:underline;white-space:nowrap;}
[data-wesley-home] .wt-up{margin:0;border-top:1px dashed rgba(0,0,0,.12);padding:6px 0 0;display:flex;flex-direction:column;gap:3px;}
[data-wesley-home] .wt-up h4{margin:0;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:#999;font-weight:650;}
[data-wesley-home] .wt-up ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px;}
[data-wesley-home] .wt-up{overflow-x:hidden;}
[data-wesley-home] .wt-up-body{overflow-x:hidden;}
[data-wesley-home] .wt-up li{max-width:100%;overflow:hidden;display:flex;align-items:center;gap:7px;font-size:11px;line-height:18px;color:#555;position:relative;white-space:nowrap;overflow:hidden;}
[data-wesley-home] .wt-up li b{color:#222;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
[data-wesley-home] .wt-up li .wt-topic{color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
[data-wesley-home] .wt-up li .wt-cd{flex:0 0 auto;min-width:66px;margin-right:10px;text-align:left;white-space:nowrap;font-weight:700;color:#64346f;font-size:11.5px;}
[data-wesley-home] .wt-up li .wt-cd.soon{color:#c0392b;}
[data-wesley-home] .wt-exam{border:1px solid rgba(0,0,0,.1);border-left:3px solid var(--wt-color,#64346f);border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;background:rgba(100,52,111,.03);}
[data-wesley-home] .wt-exam .wt-exam-title{font-size:12px;font-weight:650;color:#222;}
[data-wesley-home] .wt-exam .wt-exam-line{font-size:11px;line-height:15px;color:#555;}
[data-wesley-home] .wt-exam .wt-exam-line b{color:#333;}
[data-wesley-home] .wt-empty{font-size:11px;color:#999;}

table.wt-table{table-layout:fixed;width:100%;}
@media (max-width:1103px){ table.wt-table{min-width:1103px;} }
@media (hover:none){ .timetable-small .timetable-subject:hover{filter:brightness(.93);} }
.timetable-small table.no-hover{border-collapse:collapse;width:100%;}
.timetable-small th,.timetable-small td{vertical-align:middle;padding:0;}
.timetable-small .timetable-subject{height:100% !important;min-height:100%;box-sizing:border-box;transition:filter .15s,transform .18s ease;}
.timetable-small .timetable-subject:active{transform:scale(.99);}
table.wt-table th,table.wt-table td{overflow:hidden;box-sizing:border-box;transition:width calc(.3s * var(--wt-spd,1)) cubic-bezier(.4,0,.2,1);}
table.wt-table td.wt-card{cursor:pointer;vertical-align:top;padding:2px;}
table.wt-table{margin-bottom:60px;}
table.wt-table .timetable-subject, .timetable-small .timetable-subject{height:var(--wt-tt-h,146px) !important;overflow:hidden;container-type:inline-size;transition:box-shadow .2s ease;}
table.wt-table td.wt-card.wt-pressed .timetable-subject{transform:scale(.975);transition:transform .12s ease;}
table.wt-table td.wt-card.wt-expanded{position:relative;z-index:30;}
table.wt-table td.wt-card.wt-last.wt-expanded .timetable-subject{left:0;width:100%;}
table.wt-table td.wt-card.wt-expanded .timetable-subject{border-radius:0 0 8px 8px;position:relative;left:-5px;width:calc(100% + 10px);padding-bottom:14px;margin-bottom:6px;overflow:visible;box-shadow:0 8px 16px rgba(0,0,0,.18), 0 18px 30px rgba(0,0,0,.10);}
.scrollable.wt-tt-open{overflow:visible !important;background:#fff;}
.scrollable.wt-tt-open table.wt-table{background:transparent;}
table.wt-table td.wt-card.wt-expanded .timetable-subject a{font-size:inherit;}

table.wt-table td.wt-card:hover .timetable-subject{filter:brightness(.93);}
table.wt-table td.wt-card.wt-expanded{overflow:visible !important;height:auto !important;}
table.wt-table td.wt-card.wt-expanded .timetable-subject{height:auto !important;min-height:var(--wt-tt-h,146px) !important;overflow:visible !important;container-type:normal;}

.wt-detail{display:flex;flex-direction:column;gap:2px;margin-top:5px;padding-top:0;border-top:1px solid rgba(255,255,255,.45);text-align:left;animation:wtDetailIn .3s ease both;}
@keyframes wtDetailIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}
.wt-detail .wt-sub{font-size:11px;line-height:15px;color:rgba(0,0,0,.72);font-weight:600;}
.wt-detail ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px;max-height:300px;overflow:auto;}
table.wt-table td.wt-card.wt-expanded .wt-detail ul{max-height:none;overflow:visible;}
.wt-line{margin:0 0 6px;font-size:inherit;line-height:1.5;}
.wt-detail li{display:flex;flex-direction:column;gap:1px;background:rgba(255,255,255,.55);border-radius:6px;padding:5px 7px;}
.wt-detail li .wt-title{font-size:14px;line-height:18px;font-weight:650;color:#222;transition:color .15s;}
.wt-detail li:hover .wt-title{color:#693e7d;}
.wt-detail li .wt-meta{font-size:10.5px;line-height:14px;color:#666;}
.wt-detail li .wt-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:1px;}
.wt-detail li .wt-links a{font-size:9.5px;color:#64346f;text-decoration:underline;}
.wt-detail .wt-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.wt-detail .wt-actions a,.wt-detail .wt-actions button{font:inherit;font-size:11px;color:rgba(0,0,0,.62);background:transparent;border:0;padding:0;cursor:pointer;text-decoration:none;transition:color .15s;}
.wt-detail .wt-actions a:hover,.wt-detail .wt-actions button:hover{color:#693e7d;}
.wt-detail .wt-empty{font-size:10.5px;color:rgba(0,0,0,.6);}
/* 展开的细节就放在格子里，不另开浮层：格子变成纵向 flex，头部照旧，细节占剩下的
   高度并自己滚动。课表容器在展开时被钉住高度（见 expand()），所以格子变高只是在
   容器里滚，页面本身不会抽一下。 */
table.wt-table td.wt-card.wt-expanded .timetable-subject{display:flex;flex-direction:column;gap:4px;overflow:hidden;}
/* 展开后的详情不再限高：站点课表里 max-height:min(240px,40vh) 会把内容切掉一截（周中看到的就是这个），
   周末的合成课表本来就不受限高，两边现在一致。 */
table.wt-table td.wt-card.wt-expanded .wt-detail{overflow:auto;max-height:min(240px,40vh);background:transparent;border:0;box-shadow:none;padding:0 2px 2px 0;margin:0;}
[data-wesley-home] .wt-panel-body{overflow:hidden;height:0;}
[data-wesley-home] .wt-panel-body.open{height:auto;}

.wt-no-smooth [data-wesley-home] .wt-panel-body,.wt-no-smooth [data-wesley-home] .wt-sec-body{transition:opacity .15s ease !important;}
.wt-busy [data-wesley-home] .wt-panel-body,.wt-busy [data-wesley-home] .wt-sec-body,.wt-busy [data-wesley-home] .wt-up-body{contain:layout paint;}
.wt-busy [data-wesley-home] .wt-tab-content{contain:layout paint;isolation:isolate;}
.wt-busy [data-wesley-home] .wt-card-effect-frost .wt-task,.wt-busy [data-wesley-home] .wt-card-effect-frost .wt-due-card{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}
.wt-busy [data-wesley-home] .wt-tabs,.wt-busy [data-wesley-home] .wt-sec-inner{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}
.wt-busy [data-wesley-home] .wt-sk{animation:none !important;}
[data-wesley-home] .wt-panel-body .wt-section{opacity:1;}

[data-wesley-home] .wt-section{border-top:1px solid rgba(0,0,0,.06);}
[data-wesley-home] .wt-section:last-child{border-bottom:0;box-shadow:none;}

[data-wesley-home] .wt-sec-head{display:flex;align-items:center;gap:10px;width:100%;background:none;border:0;padding:12px;font:inherit;font-size:13.5px;font-weight:700;color:#2b2b2b;cursor:pointer;text-align:left;}
[data-wesley-home] .wt-sec-head:hover{background:rgba(100,52,111,.05);}
[data-wesley-home] .wt-sec-count{font-size:10px;color:#999;font-weight:600;}
[data-wesley-home] .wt-sec-body{overflow:hidden;height:0;}
[data-wesley-home] .wt-sec-body.open{overflow:visible;padding-bottom:0;margin-bottom:0;}
[data-wesley-home] .wt-sec-body.open{height:auto;}
[data-wesley-home] .wt-sec-inner{overflow:hidden;min-height:0;padding:0 12px;}
[data-wesley-home] .wt-sec-body.open .wt-sec-inner{overflow:visible;}
[data-wesley-home] .wt-sec-body.open .wt-sec-inner{background:rgba(255,255,255,var(--wt-body-op,.55));backdrop-filter:blur(10px) saturate(1.15);-webkit-backdrop-filter:blur(10px) saturate(1.15);border-radius:10px;margin:6px 8px 8px;padding:8px 10px;box-shadow:0 6px 18px rgba(100,52,111,.06);}

[data-wesley-home] .wt-chev{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;flex:0 0 15px;color:#693e7d;transition:transform .2s ease;}
.wt-chev.open{transform:rotate(90deg);}
[data-wesley-home] .wt-up-head{display:flex;align-items:center;gap:6px;width:100%;border:0;padding:6px 0 4px;font:inherit;font-size:10px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;color:#999;cursor:pointer;text-align:left;}
[data-wesley-home] .wt-up-head:hover{color:#64346f;}
[data-wesley-home] .wt-up-body{transition:transform .25s cubic-bezier(.23,1,.32,1);overflow:hidden;height:0;padding:0 8px;margin:2px 4px 0;box-sizing:border-box;}
[data-wesley-home] .wt-up-body.open{height:auto;margin:2px 4px 10px;padding:0 8px;background:rgba(255,255,255,var(--wt-body-op,.55));backdrop-filter:blur(10px) saturate(1.15);-webkit-backdrop-filter:blur(10px) saturate(1.15);border-radius:10px;padding:0 8px 8px;box-shadow:0 6px 18px rgba(100,52,111,.06);}
[data-wesley-home] .wt-check{width:18px;height:18px;min-width:18px;min-height:18px;max-width:18px;max-height:18px;flex:0 0 18px;align-self:center;overflow:hidden;aspect-ratio:1;border-radius:4px;border:1.5px solid rgba(100,52,111,.35);background:#fff;color:#fff;font-size:11px;line-height:14px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex:0 0 auto;align-self:flex-start;box-sizing:border-box;}
[data-wesley-home] .wt-check:hover{background:#efeff2;border-color:rgba(60,60,70,.55);}
[data-wesley-home] .wt-check.on{background:#64346f;border-color:#64346f;color:#fff;font-weight:900;font-size:13px;}
[data-wesley-home] .wt-due-main{display:flex;flex-direction:column;gap:1px;min-width:0;}
[data-wesley-home] .wt-due-title{font-size:12px;font-weight:600;color:#222;}
[data-wesley-home] .wt-due-meta{font-size:9.5px;color:#888;}
[data-wesley-home] .wt-due-days{margin-left:auto;font-size:10.5px;font-weight:700;color:#64346f;white-space:nowrap;}
[data-wesley-home] .wt-due-days.soon{color:#c0392b;}
[data-wesley-home] .wt-red{color:#c0392b;font-weight:700;font-size:9.5px;line-height:1.3;}
.wt-loading{margin:6px 0 10px;padding:10px 12px;border:1px solid var(--wt-t-line,rgba(0,0,0,.08));border-radius:8px;background:var(--wt-t-surface,#fff);font-size:12px;color:var(--wt-t-ink-3,#555);display:flex;align-items:center;gap:8px;}
html[data-wt-theme="dark"] .wt-loading{background:#1f1f23;border-color:rgba(255,255,255,.10);color:#a9a5b2;}
.wt-loading:before{content:'';width:12px;height:12px;border:2px solid rgba(100,52,111,.25);border-top-color:#64346f;border-radius:50%;animation:wtSpin 1s linear infinite;}
@keyframes wtSpin{to{transform:rotate(360deg);}}
.wt-toast{position:fixed;top:74px;left:50%;transform:translateX(-50%) translateY(-8px);z-index:99999;background:#64346f;color:#fff;font-size:12px;padding:8px 14px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.25);opacity:0;transition:opacity .2s,transform .2s;display:flex;align-items:center;gap:10px;}
.wt-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.wt-toast .wt-toast-x{background:none;border:0;color:#fff;font-size:15px;cursor:pointer;line-height:1;}

dialog.wt-modal-dialog{font-family:Figtree, sans-serif !important;color:inherit;position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;z-index:2147483000;display:flex;align-items:center;justify-content:center;overflow:hidden;}
dialog.wt-modal-dialog::backdrop{background:transparent;}
html.wt-modal-open{overflow:hidden !important;}
.wt-page-dim{position:fixed;left:0;top:0;width:calc(100% + 200px);height:calc(100% + 200px);margin-left:-100px;margin-top:-100px;background:rgba(20,8,24,.42);z-index:2147482999;pointer-events:none;}
/* 深色模式下页面本来就暗，同样的遮罩几乎看不出层次，所以再压一档。 */
html[data-wt-theme="dark"] .wt-page-dim{background:rgba(6,4,9,.62);}
dialog.wt-modal-dialog{left:0 !important;top:0 !important;margin:0 !important;}
dialog.wt-modal-dialog .wt-modal-overlay{position:fixed;left:-60px;top:-20px;right:-60px;bottom:-20px;width:auto;height:auto;background:transparent;}
.wt-modal-overlay{position:fixed;left:-100px;top:-20px;right:-100px;bottom:-20px;z-index:2147483000;background:rgba(20,8,24,.42);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .18s ease;}
[data-wesley-home] .wt-modal,.wt-modal{transition:opacity .18s ease,transform .18s ease;}
.wt-modal-overlay:not(.show) .wt-modal{opacity:0;transform:translateY(6px) scale(.985);}
.wt-modal-overlay.show{opacity:1;}
.wt-modal,.wt-modal *{font-family:Figtree, sans-serif !important;}
.wt-modal{max-width:calc(100vw - 32px);position:relative;width:min(576px,94vw);max-height:92vh;overflow:auto;background:var(--wt-t-surface);border-radius:12px;box-shadow:var(--wt-t-modal-shadow);padding:16px 18px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin;color:inherit;}
.wt-modal-head{display:flex;align-items:flex-start;gap:10px;}
.wt-modal-title{font-size:15px;line-height:20px;font-weight:700;color:var(--wt-t-ink);flex:1;}
.wt-modal-x{position:absolute;top:4px;right:6px;z-index:6;background:none;border:0;font-size:20px;line-height:1;color:#999;cursor:pointer;padding:0 2px;}
.wt-modal-x:hover{color:#64346f;}
.wt-modal-meta{display:flex;align-items:center;gap:8px;font-size:10.5px;color:#777;flex-wrap:wrap;}
.wt-modal-meta .wt-dot{width:7px;height:7px;border-radius:50%;}
.wt-modal-meta span{white-space:nowrap;}
.wt-modal-time{color:#999;}
.wt-modal-days{margin-left:auto;font-weight:700;color:#64346f;}
.wt-modal-sub{font-size:13px;line-height:18px;font-weight:650;color:#333;}
.wt-modal-list{display:flex;flex-direction:column;gap:8px;}
.wt-modal-li{border-left:2px solid rgba(100,52,111,.25);padding-left:8px;}
.wt-modal-li-title{font-size:12px;line-height:16px;font-weight:650;color:#222;}
.wt-modal-li-detail{font-size:11.5px;line-height:16px;color:#555;white-space:pre-wrap;}
.wt-modal-detail{font-size:12px;line-height:21px;color:#555;white-space:pre-wrap;}
.wt-modal-links{display:flex;gap:10px;flex-wrap:wrap;}
.wt-modal-links a{font-size:11px;color:#64346f;text-decoration:underline;}
.wt-modal-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:6px;}
.wt-modal-status{font-size:11px;color:#64346f;margin-top:4px;}
.wt-modal-status.err{color:#b03a3a;}
.wt-modal-status details{margin-top:4px;}
.wt-modal-status pre{white-space:pre-wrap;font-size:10px;color:#7a4040;background:rgba(176,58,58,.06);padding:6px;border-radius:6px;}
/* 附件网格：一个类型色块 + 两行字。窄一点的名字靠 ellipsis 收，不换行。 */
.wt-files-slot{display:flex;flex-direction:column;gap:6px;margin-top:10px;}
.wt-files{display:grid;grid-template-columns:repeat(auto-fill,minmax(186px,1fr));gap:6px;}
.wt-file{display:flex;align-items:center;gap:8px;min-width:0;padding:6px 9px 6px 7px;border:1px solid rgba(100,52,111,.16);border-radius:8px;background:rgba(100,52,111,.035);text-decoration:none;transition:background .14s ease,border-color .14s ease;}
.wt-file:hover{background:rgba(100,52,111,.1);border-color:rgba(100,52,111,.3);text-decoration:none;}
.wt-file-ico{flex:none;display:inline-flex;align-items:center;justify-content:center;width:27px;height:27px;border-radius:6px;background:#7a6b84;color:#fff;font-size:8.5px;font-weight:800;letter-spacing:.02em;}
.wt-file-ico[data-kind="pdf"]{background:#d0453b;}
.wt-file-ico[data-kind="doc"]{background:#2f6bd6;}
.wt-file-ico[data-kind="sheet"]{background:#1f8a4c;}
.wt-file-ico[data-kind="slide"]{background:#d2762a;}
.wt-file-ico[data-kind="image"]{background:#8a5cc6;}
.wt-file-ico[data-kind="archive"]{background:#6b5f73;}
.wt-file-txt{display:flex;flex-direction:column;min-width:0;line-height:1.3;}
.wt-file-name{font-size:11.5px;font-weight:600;color:#3b2244;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wt-file-meta{font-size:9.5px;color:#8a8192;letter-spacing:.01em;}
.wt-modal-gear{display:none !important;border:0;background:none;color:#8a7391;cursor:pointer;font-size:15px;padding:0 4px;}
.wt-modal-settings{display:none !important;flex-direction:column;flex-direction:column;gap:6px;background:#faf7fc;border:1px solid rgba(100,52,111,.1);border-radius:8px;padding:8px 10px;}
.wt-modal-settings[hidden]{display:none;}
.wt-ms-title{font-size:11px;font-weight:650;color:#64346f;}
.wt-ms-row{display:flex;align-items:center;gap:8px;font-size:11px;color:#666;}
.wt-ms-row input[type=range]{flex:1;}
.wt-ms-val{min-width:38px;text-align:right;font-size:10.5px;color:#8a7391;}
.wt-modal-go{white-space:nowrap;font-size:14px;line-height:1;font-weight:650;color:#fff;background:#64346f;border-radius:7px;padding:8px 14px;text-decoration:none;}
.wt-modal-go:hover{background:#7a5a8a;color:#fff;text-decoration:none;}
.wt-modal-go:active{background:#7a5a8a;color:#fff;}
.wt-modal-go:hover{background:#693e7d;}
.wt-modal-nav{position:absolute;top:50%;transform:translateY(-50%);width:52px;height:52px;display:flex;align-items:center;justify-content:center;background:none;border:0;cursor:pointer;opacity:0;transition:opacity .15s ease;z-index:3;}
.wt-modal-overlay:hover .wt-modal-nav{opacity:.5;}
.wt-modal-nav:hover{opacity:1;}
.wt-modal-nav::before{content:'';width:0;height:0;border-top:11px solid transparent;border-bottom:11px solid transparent;}
.wt-modal-nav.left{left:10px;}
.wt-modal-nav.left::before{border-right:16px solid #64346f;}
.wt-modal-nav.right{right:10px;}
.wt-modal-nav.right::before{border-left:16px solid #64346f;}
.wt-modal-nav[disabled]{display:none;}
.wt-modal-meta{position:relative;display:flex;align-items:center;gap:8px;font-size:11.5px;color:#666;flex-wrap:wrap;padding-right:52px;min-height:40px;}
.wt-modal-cls{color:#666;text-decoration:none;cursor:pointer;}
.wt-modal-cls:hover{text-decoration:underline;color:#693e7d;}
.wt-modal-time{cursor:default;}
.wt-modal-caret{width:28px;height:28px;min-width:28px;min-height:28px;border-radius:10px;border:1px solid rgba(100,52,111,.18);background:#fff;color:#64346f;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;margin-left:4px;flex:none;transition:background .15s;}
.wt-modal-caret:hover{background:#693e7d;color:#fff;}
.wt-modal-caret svg{transition:transform .2s ease;}
.wt-modal-caret.open svg{transform:rotate(90deg);}
.wt-modal-menu{position:fixed;z-index:2147483000;min-width:260px;max-height:60vh;overflow:auto;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,.2);padding:6px;display:flex;flex-direction:column;gap:2px;font-size:11.5px;color:#666;}
.wt-modal-menu[hidden]{display:none;}
.wt-modal-course{text-align:left;font:inherit;font-size:11.5px;padding:6px 8px;border:0;background:none;border-radius:6px;cursor:pointer;color:#666;}
.wt-modal-course:hover{background:#693e7d;color:#fff;}
.wt-modal-head{position:relative;}
@media (max-width:700px){
  .wt-modal,.wt-modal *{font-family:Figtree, sans-serif !important;color:inherit;max-width:calc(100vw - 32px);}
  .wt-modal{width:calc(100vw - 100px);max-height:92vh;}
  .wt-modal-caret{width:28px;height:28px;min-width:28px;min-height:28px;flex:none;}
  .wt-modal-go{width:auto;flex:none;white-space:nowrap;}
  .wt-modal-meta .wt-dot{width:7px;height:7px;min-width:7px;flex:none;}
  .wt-modal-nav{display:none;}
}

[data-wesley-home] .wt-summary-head .wt-chev{color:#64346f;}
[data-wesley-home] .wt-summary-head{cursor:pointer;}

[data-wesley-home] .wt-panel-body{background:linear-gradient(180deg,var(--wt-from,#f7f2f9),var(--wt-to,#efe4f4));}
[data-wesley-home] .wt-task .wt-cls a{color:inherit;text-decoration:none;}
[data-wesley-home] .wt-task .wt-cls a:hover{text-decoration:underline;}
table.wt-table td.wt-card .timetable-subject a:hover{text-decoration:underline;}
[data-wesley-home] .wt-due-card .wt-due-days{margin-left:auto;font-size:10.5px;font-weight:700;color:#64346f;white-space:nowrap;}
[data-wesley-home] .wt-due-card .wt-due-days.soon{color:#c0392b;}

/* 模态里的「Set due」：一行字 + 小按钮，点开是一个小卡片（日期 + 时间） */
.wt-dueset{margin-top:14px;position:relative;}
.wt-dueset-row{display:flex;align-items:center;gap:10px;}
.wt-dueset-cap{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8b8296;}
.wt-dueset-date{font-size:13px;font-weight:600;color:var(--wt-t-ink,#2d2438);}
.wt-dueset-date.is-empty{font-weight:500;color:#9a92a4;}
.wt-dueset-btn{margin-left:auto;height:28px;padding:0 12px;border-radius:999px;border:1px solid rgba(100,52,111,.22);background:rgba(100,52,111,.06);color:#64346f;font-size:12px;font-weight:600;cursor:pointer;}
.wt-dueset-btn:hover{background:rgba(100,52,111,.12);}
.wt-dueset-pop[hidden]{display:none !important;}
.wt-dueset-pop{position:absolute;right:0;top:calc(100% + 8px);z-index:6;display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:14px;background:#fff;box-shadow:0 12px 32px rgba(40,20,50,.18),0 1px 2px rgba(40,20,50,.08);border:1px solid rgba(100,52,111,.12);}
.wt-dueset-inputs{display:flex;gap:8px;align-items:center;}
.wt-dueset-input{height:32px;width:150px !important;min-width:0;padding:0 9px;border-radius:9px;border:1px solid rgba(0,0,0,.14);background:#fff;color:#2d2438;font-size:13px;font-family:inherit;}
.wt-dueset-input:focus{outline:none;border-color:rgba(100,52,111,.5);box-shadow:0 0 0 3px rgba(100,52,111,.12);}
.wt-dueset-time{width:104px !important;min-width:104px;flex:0 0 auto;}
.wt-dueset-actions{display:flex;gap:8px;align-items:center;}
.wt-dueset-ok,.wt-dueset-clear,.wt-dueset-cancel{height:28px;padding:0 12px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid transparent;font-family:inherit;}
.wt-dueset-ok{background:#64346f;color:#fff !important;border-color:transparent;}
.wt-dueset-ok:hover{background:#723c7d;color:#fff !important;}
.wt-dueset-clear{margin-left:auto;background:transparent;color:#b03a3a !important;border-color:rgba(176,58,58,.28);}
.wt-dueset-cancel{background:transparent;color:#6f6878 !important;border-color:rgba(0,0,0,.14);}
html[data-wt-theme="dark"] .wt-dueset-date{color:#e7e5ea !important;}
html[data-wt-theme="dark"] .wt-dueset-btn{background:rgba(190,150,255,.12);border-color:rgba(190,150,255,.3);color:#d9c2ff;}
html[data-wt-theme="dark"] .wt-dueset-btn:hover{background:rgba(190,150,255,.2);}
html[data-wt-theme="dark"] .wt-dueset-pop{background:#232128;border-color:rgba(255,255,255,.1);box-shadow:0 12px 32px rgba(0,0,0,.5);}

/* 深色下的「Show in All」面板：面板、行、底部那三颗圆按钮（✎ + −）原来全是白底白框 */
html[data-wt-theme="dark"] .wt-set-pop{background:#232128 !important;border-color:rgba(255,255,255,.1) !important;box-shadow:0 12px 32px rgba(0,0,0,.5) !important;}
html[data-wt-theme="dark"] .wt-set-head,html[data-wt-theme="dark"] .wt-set-head b{color:#e7e5ea !important;}
html[data-wt-theme="dark"] .wt-set-h{color:#8f8899 !important;}
html[data-wt-theme="dark"] .wt-set-row{color:#d5d0dd !important;}
html[data-wt-theme="dark"] .wt-set-edit{background:#2b2733 !important;border-color:rgba(255,255,255,.14) !important;color:#d9d5e0 !important;}
html[data-wt-theme="dark"] .wt-set-edit:hover{background:#3a3644 !important;}
html[data-wt-theme="dark"] .wt-set-edit.on{background:#64346f !important;border-color:#64346f !important;color:#fff !important;}
html[data-wt-theme="dark"] .wt-set-x{color:#a9a3b5 !important;}
html[data-wt-theme="dark"] .wt-set-x:hover{color:#e7e5ea !important;background:rgba(255,255,255,.08) !important;}
html[data-wt-theme="dark"] .wt-dueset-input{background:#1b191f;border-color:rgba(255,255,255,.16);color:#e7e5ea;}
html[data-wt-theme="dark"] .wt-dueset-ok{background:#8b5cc6;color:#fff !important;}
html[data-wt-theme="dark"] .wt-dueset-cancel{color:#b6abbf !important;border-color:rgba(255,255,255,.16);}
[data-wesley-home] .wt-due-card.done{opacity:.35;background:transparent;box-shadow:none;border-color:rgba(0,0,0,.05);}
[data-wesley-home] .wt-due-card .wt-check{margin-right:2px;}
[data-wesley-home] .wt-due-card .wt-cls a{color:inherit;text-decoration:none;}
[data-wesley-home] .wt-due-card .wt-cls a:hover{text-decoration:underline;}
[data-wesley-home] .wt-tabbar{display:flex;align-items:center;gap:8px;}
[data-wesley-home] .wt-tabbar .wt-tabs{flex:1;min-width:0;}
[data-wesley-home] .wt-tabs{position:relative;overflow-x:auto;overflow-y:hidden;flex-wrap:nowrap;scrollbar-width:none;-ms-overflow-style:none;}
/* tab 栏的横向滚动条整条藏掉：Chromium 会画一条 16px 高的灰条，压在课程卡上方特别脏，
   而且它跟"有照片背景时的玻璃蒙版"混在一起，看着像一层没擦干净的膜。
   横向滚动本身保留（滚轮 / 触摸板 / 拖 tab 都还能用）。 */
[data-wesley-home] .wt-tabs::-webkit-scrollbar{height:0;width:0;display:none;}
[data-wesley-home] .wt-tabs::-webkit-scrollbar-track{background:transparent;display:none;}
[data-wesley-home] .wt-tabs::-webkit-scrollbar-thumb{background:transparent;display:none;}
[data-wesley-home] .wt-tab{flex:0 0 auto;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;}
[data-wesley-home] .wt-tab-slider{position:absolute;top:50%;bottom:auto;height:24px;transform:translateY(-50%);background:rgba(100,52,111,.13);border-radius:999px;z-index:0;transition:left .5s cubic-bezier(.2,.8,.2,1),width .5s cubic-bezier(.2,.8,.2,1);pointer-events:none;}
[data-wesley-home] .wt-tab{position:relative;z-index:1;}
[data-wesley-home] .wt-set-wrap{position:relative;flex:none;}
[data-wesley-home] .wt-set-btn{font:inherit;font-size:11px;color:#6b6b6b;background:none;border:0;padding:2px 4px;cursor:pointer;}
[data-wesley-home] .wt-set-btn:hover{color:#64346f;text-decoration:underline;}
.wt-set-grabber{position:absolute;left:0;right:0;top:0;height:12px;cursor:move;position:relative;}
.wt-set-grabber::before,.wt-set-grabber::after{content:'';position:absolute;left:50%;width:44px;margin-left:-22px;height:2px;border-radius:2px;background:rgba(0,0,0,.16);}
.wt-set-grabber::before{top:1px;}
.wt-set-grabber::after{top:6px;}
.wt-set-pop{position:absolute;width:300px;max-height:70vh;overflow:auto;z-index:99999;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,.22);padding:12px 14px;display:flex;flex-direction:column;gap:6px;opacity:0;transform:translateY(-6px);transition:opacity .18s ease,transform .18s ease;pointer-events:none;}
.wt-set-pop.show{opacity:1;transform:none;pointer-events:auto;}
.wt-set-pop[hidden]{display:none;}
.wt-set-head{display:flex;align-items:center;gap:6px;font-size:12px;color:#333;cursor:move;position:relative;padding-top:10px;}
/* 面板标题旁边的说明，用来和右上角齿轮的全站设置区分开 */
.wt-set-head .wt-set-sub{font-size:10.5px;font-weight:400;opacity:.55;}
.wt-set-head .wt-set-x{margin-left:auto;}
.wt-set-x{background:none;border:0;outline:none;box-shadow:none;width:24px;height:24px;min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;font-size:16px;line-height:1;cursor:pointer;color:#888;padding:0;margin:0;-webkit-appearance:none;appearance:none;}
.wt-set-x:hover{color:#64346f;background:rgba(100,52,111,.08);}
.wt-set-x:focus,.wt-set-x:focus-visible{outline:none !important;box-shadow:none !important;}
.wt-set-h{font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:#999;font-weight:650;margin-top:4px;}
.wt-set-row{display:flex;align-items:center;gap:6px;font-size:11px;color:#444;cursor:pointer;}
.wt-set-edit{width:30px;height:30px;min-width:30px;max-width:30px;min-height:30px;max-height:30px;box-sizing:border-box;flex:0 0 30px;align-self:flex-end;aspect-ratio:1;margin-top:8px;margin-left:auto;border-radius:50%;border:1px solid rgba(100,52,111,.3);background:#fff;color:#64346f;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;padding:0;}
.wt-set-edit.on{background:#64346f;color:#fff;border-color:#64346f;}
.wt-section + .wt-section{margin-top:0;}
.wt-section + .wt-section{margin-top:0;}
[data-wesley-home] .wt-cw{position:relative;}
[data-wesley-home] .wt-cw .wt-eye{position:absolute;top:3px;right:3px;z-index:3;width:25px;height:25px;min-width:25px;min-height:25px;max-width:25px;max-height:25px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:#693e7d;cursor:pointer;opacity:0;transition:opacity .15s ease,background .15s ease,transform .12s ease;}
[data-wesley-home] .wt-editing .wt-cw .wt-eye{opacity:.55;}
[data-wesley-home] .wt-editing .wt-cw:hover .wt-eye{opacity:1;}
[data-wesley-home] .wt-cw .wt-eye:hover{background:rgba(100,52,111,.1);}
[data-wesley-home] .wt-cw .wt-eye:active{transform:scale(.9);}
[data-wesley-home] .wt-cw.wt-cw-hidden .wt-eye{opacity:.8;}
.wt-cw:has(.wt-due-card.done) .wt-eye{opacity:.35;}
[data-wesley-home] .wt-cw-hidden{opacity:.5;filter:grayscale(.4);}
.wt-task{position:relative;}
.wt-custom-delwrap{position:absolute;top:3px;right:3px;left:auto;z-index:4;width:22px;height:22px;opacity:0;transition:opacity .15s ease;}
.wt-cw-custom .wt-eye:not(.wt-del-x){right:29px !important;}
.wt-cw:hover .wt-custom-delwrap,.wt-delmode .wt-custom-delwrap{opacity:1;}
.wt-del-x{opacity:0 !important;}
.wt-delmode .wt-cw .wt-del-x{opacity:.55 !important;}
.wt-delmode .wt-del-x:hover{opacity:1 !important;background:rgba(100,52,111,.1);}
.wt-custom-delwrap .wt-confirm{left:auto;right:0;top:calc(100% + 2px);}
.wt-custom-del{position:static;width:22px;height:22px;min-width:22px;min-height:22px;max-width:22px;max-height:22px;flex:0 0 22px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:#833;cursor:pointer;padding:0;transition:background .15s ease,transform .12s ease;}
.wt-custom-del:hover{background:rgba(180,60,80,.1);}
.wt-editing .wt-task .wt-cls a{pointer-events:none;}
.wt-editing .wt-cw .wt-task,.wt-editing .wt-cw .wt-due-card,.wt-editing .wt-cw .wt-custom-card,.wt-delmode .wt-cw .wt-task,.wt-delmode .wt-cw .wt-custom-card{box-shadow:0 8px 22px rgba(100,52,111,.20);}
.wt-empty-placeholder{border:1.5px dashed rgba(100,52,111,.35);border-radius:8px;padding:18px 16px;font-size:12.5px;color:#8a7391;background:rgba(100,52,111,.03);animation:wtPlaceholderIn .2s cubic-bezier(0.23,1,0.32,1) both;}
@keyframes wtPlaceholderIn{from{opacity:0;transform:translateY(4px) scale(.98);}to{opacity:1;transform:none;}}
.wt-drop-placeholder{border:1.5px dashed rgba(100,52,111,.45);border-radius:8px;background:rgba(100,52,111,.04);box-sizing:border-box;}
/* 拖动过程中每一帧都在重排，毛玻璃/阴影是全屏重绘，必须让路 */
html.wt-drag-now [data-wesley-home] .wt-task,html.wt-drag-now [data-wesley-home] .wt-due-card,html.wt-drag-now [data-wesley-home] .wt-custom-card{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}
html.wt-drag-now [data-wesley-home] .wt-sec-inner,html.wt-drag-now [data-wesley-home] .wt-tabs,html.wt-drag-now [data-wesley-home] .wt-up-body{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}
html.wt-drag-now [data-wesley-home] .wt-cw:not(.wt-dragging){transition:none !important;}
/* 首屏骨架：数据回来之前先把面板的位置占住，既不用盯着空白等四秒，也不会在数据到达时跳一下。
   不可交互（pointer-events:none），数据到了由真面板原地替换。 */
[data-wesley-home].wt-skel{pointer-events:none}
[data-wesley-home].wt-skel.wt-skel-block{display:block;float:none;clear:both;width:auto;margin:0 0 14px;padding:0 15px;box-sizing:border-box}
[data-wesley-home].wt-skel .wt-skel-shell{background:#fff;border-radius:14px;box-shadow:0 1px 2px rgba(20,10,30,.05),0 10px 30px rgba(20,10,30,.06);overflow:hidden}
[data-wesley-home].wt-skel .wt-skel-head{padding:23px 24px}
[data-wesley-home].wt-skel .wt-skel-bar{background:linear-gradient(90deg,#f1edf3 25%,#e6e0ea 37%,#f1edf3 63%);background-size:400% 100%;animation:wt-skel-shine 1.5s ease-in-out infinite;border-radius:10px}
[data-wesley-home].wt-skel .wt-skel-bar{height:18px;width:190px;border-radius:9px}
@keyframes wt-skel-shine{0%{background-position:100% 0}100%{background-position:-100% 0}}
html[data-wt-theme="dark"] [data-wesley-home].wt-skel .wt-skel-shell{background:#1d1a22;box-shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.35)}
html[data-wt-theme="dark"] [data-wesley-home].wt-skel .wt-skel-head{border-color:rgba(255,255,255,.07)}
html[data-wt-theme="dark"] [data-wesley-home].wt-skel .wt-skel-bar{background:linear-gradient(90deg,#26222c 25%,#322c3a 37%,#26222c 63%);background-size:400% 100%}
/* 站点右上角那个搜索按钮宽 72px，右边缘会压到头像。只把它整体左移（right:170px），
   **不要锁 width**：站点自己是靠 .sbx-header-search:hover{width:100%;padding-left:...}
   把搜索框撑开的，锁死宽度会让鼠标一悬浮整块就错位、输入框永远只有 1px。 */
form.sbx-header-search{right:170px !important;}
/* 拖起来的原卡离开布局：它要是还占着格子，就会和占位符各占一格，看起来像两张卡 */
.wt-cw.wt-dragging{position:absolute;opacity:0;pointer-events:none;}
.wt-cw.wt-drag-ghost{position:fixed;top:-9999px;left:-9999px;margin:0;pointer-events:none;overflow:hidden;}
/* 平时也能拖了，得让人看得出来：抓手光标，按下去握紧 */
[data-wesley-home] .wt-cw{cursor:grab;}
[data-wesley-home] .wt-cw:active{cursor:grabbing;}
[data-wesley-home] .wt-cw a,[data-wesley-home] .wt-cw button,[data-wesley-home] .wt-cw input,[data-wesley-home] .wt-cw select{cursor:pointer;}
[data-wesley-home] .wt-cw .wt-check,[data-wesley-home] .wt-cw .wt-check:active{cursor:pointer;}
.wt-custom-del:active{transform:scale(.9);}
.wt-ico{display:inline-block;vertical-align:middle;}
.wt-skeleton{width:100%;min-width:0;min-height:var(--wt-tt-h,146px);height:auto;border-radius:10px;background:#f3edf7;border:1px solid rgba(38,30,44,.07);box-shadow:0 1px 2px rgba(24,16,30,.04);padding:12px;display:flex;flex-direction:column;gap:8px;box-sizing:border-box;}
.wt-sk{display:block;border-radius:999px;background:linear-gradient(90deg,#eae3ee 25%,#f3eef6 37%,#eae3ee 63%);background-size:400% 100%;animation:wtShimmer 1.2s ease infinite;}
.wt-sk.sk-title{height:12px;width:62%;}
.wt-sk.sk-line{height:9px;width:100%;}
.wt-sk.sk-line.short{width:78%;}
@keyframes wtShimmer{0%{background-position:100% 0;}100%{background-position:0 0;}}
.wt-modal input::placeholder,.wt-modal textarea::placeholder,.wt-form input::placeholder{color:rgba(100,52,111,.28);}
input[type="date"]{accent-color:#64346f;}
input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(18%) sepia(18%) saturate(1500%) hue-rotate(250deg) brightness(.9);cursor:pointer;}
.wt-task,.wt-due-card,.wt-custom-card{opacity:var(--wt-card-op,1);}
.wt-card-effect-frost .wt-task,.wt-card-effect-frost .wt-due-card{background:rgba(255,255,255,.62) !important;backdrop-filter:blur(14px) saturate(1.3);-webkit-backdrop-filter:blur(14px) saturate(1.3);border:1px solid rgba(255,255,255,.85) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(255,255,255,.35),0 8px 26px rgba(100,52,111,.14) !important;}
.wt-card-effect-soft .wt-task,.wt-card-effect-soft .wt-due-card{filter:saturate(.92);box-shadow:0 4px 14px rgba(100,52,111,.10) !important;}
.wt-card-effect-grain .wt-task,.wt-card-effect-grain .wt-due-card{background-image:radial-gradient(rgba(100,52,111,.08) 1px,transparent 1px) !important;background-size:4px 4px !important;}
.wt-card-effect-vignette .wt-task,.wt-card-effect-vignette .wt-due-card{box-shadow:inset 0 0 34px rgba(40,20,50,.16),0 2px 8px rgba(0,0,0,.05) !important;}
.wt-card-effect-frost .wt-task,.wt-card-effect-frost .wt-due-card{backdrop-filter:blur(8px) saturate(1.2);-webkit-backdrop-filter:blur(8px) saturate(1.2);}
.wt-card-effect-frost .wt-due-card.done,.wt-card-effect-soft .wt-due-card.done,.wt-card-effect-grain .wt-due-card.done,.wt-card-effect-vignette .wt-due-card.done{background:rgba(255,255,255,.2) !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;box-shadow:none !important;opacity:.35 !important;}
.wt-card-effect-soft .wt-task,.wt-card-effect-soft .wt-due-card{backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);}
.wt-card-effect-grain .wt-task,.wt-card-effect-grain .wt-due-card{background-blend-mode:multiply;}
.wt-card-effect-vignette .wt-task,.wt-card-effect-vignette .wt-due-card{box-shadow:inset 0 0 30px rgba(0,0,0,.08);}
.wt-bg-frost{backdrop-filter:blur(16px) saturate(1.35);-webkit-backdrop-filter:blur(16px) saturate(1.35);}
.wt-bg-soft{backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);}
.wt-bg-grain{background-blend-mode:soft-light;}
.wt-bg-grain::after{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(100,52,111,.10) 1px,transparent 1px);background-size:3px 3px;opacity:.5;border-radius:inherit;}
.wt-bg-vignette{box-shadow:inset 0 0 70px rgba(0,0,0,.10);}
.wt-modal-x .wt-ico,.wt-set-x .wt-ico{pointer-events:none;}
.wt-set-del{margin-left:0;}
[data-wesley-home] .wt-cw-hidden .wt-task{background:var(--wt-t-muted-card);}
[data-wesley-home] 
@keyframes wtIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}
[data-wesley-home] .wt-panel-body{transition:opacity .2s ease;}
[data-wesley-home] .wt-sec-body{transition:opacity .18s ease,transform .18s ease;transform:translateY(-3px);}
[data-wesley-home] .wt-up-body{transition:opacity .18s ease,transform .18s ease;transform:translateY(-3px);}
.wt-modal,.wt-modal *{font-family:Figtree, sans-serif !important;color:inherit;max-width:calc(100vw - 32px);opacity:0;transform:scale(.975) translateY(8px);transition:opacity .2s ease,transform .22s cubic-bezier(.2,.8,.3,1);}
.wt-modal-overlay.show .wt-modal,.wt-modal *{font-family:Figtree, sans-serif !important;color:inherit;max-width:calc(100vw - 32px);opacity:1;transform:none;}
.wt-modal-menu{opacity:0;transform:translateY(-4px) scale(.99);transition:opacity .16s ease,transform .16s ease;}
.wt-modal-menu.show{opacity:1;transform:none;}
@keyframes wtMenuIn{from{opacity:0;transform:translateY(-4px) scale(.99);}to{opacity:1;transform:none;}}
.wt-set-pop.show{transition:opacity .18s ease,transform .18s ease;}
.wt-task{transition:transform .22s cubic-bezier(.2,.8,.3,1.1),box-shadow .15s ease,background .15s ease;}
.wt-task:active{transform:scale(.95);}
.wt-tab-content{animation:wtTabIn .24s ease both;}
.wt-tab-content .wt-task{animation:wtCardIn .26s cubic-bezier(0.23,1,0.32,1) both;animation-delay:calc(var(--i,0) * 35ms);}
@keyframes wtCardIn{from{opacity:0;transform:translateY(5px) scale(.995);}to{opacity:1;transform:none;}}
@keyframes wtTabIn{from{opacity:0;transform:translateY(4px) scale(.998);}to{opacity:1;transform:none;}}
.wt-check{transition:background .15s ease,border-color .15s ease,transform .12s ease;}
.wt-check:active{transform:scale(.9);}
.wt-tab{transition:color .15s ease,background .15s ease;}
.wt-tb-card,.wt-fb-card{transition:transform .15s ease;}
@media (prefers-reduced-motion: reduce){ .wt-panel-body,.wt-sec-body,.wt-up-body{transition:opacity .12s ease !important;} .wt-modal,.wt-modal *{font-family:Figtree, sans-serif !important;color:inherit;max-width:calc(100vw - 32px);transition:opacity .12s ease !important;transform:none !important;} .timetable-subject{animation:none !important;} .wt-tab-content .wt-task,.wt-empty-placeholder{animation:wtCardFade .2s ease both !important;animation-delay:0s !important;} .wt-set-pop{transform:none !important;} }
@keyframes wtCardFade{from{opacity:0;}to{opacity:1;}}
.wt-low-anim .wt-panel-body,.wt-low-anim .wt-sec-body,.wt-low-anim .wt-up-body{transition:opacity .12s ease !important;transform:none !important;}
.wt-low-anim .timetable-subject,.wt-low-anim .wt-task,.wt-low-anim .wt-check{animation:none !important;transition:opacity .12s ease !important;transform:none !important;}
.wt-low-anim .wt-tab-content{animation:wtTabIn .12s ease both;}
.wt-modal-go:active,.wt-modal-x:active,.wt-set-btn:active,.wt-tab:active,.wt-modal-caret:active{transform:scale(.96);}
.wt-low-anim .wt-modal,.wt-low-anim .wt-modal *{font-family:Figtree, sans-serif !important;color:inherit;max-width:calc(100vw - 32px);transition:opacity .12s ease !important;transform:none !important;}
.wt-form{display:flex;flex-direction:column;gap:10px;font-size:13.5px !important;}
.wt-form .wt-field-label{font-size:11.5px !important;letter-spacing:.05em;}
.wt-form input,.wt-form select,.wt-form textarea{font-size:13px !important;}
.wt-field{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:#666;}
.wt-field-label{font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:#999;font-weight:650;}
.wt-form input,.wt-form select,.wt-form textarea{border:1px solid rgba(0,0,0,.15);border-radius:6px;padding:7px 9px;font:inherit;font-size:12.5px;color:#333;background-color:#fff;outline:none;}
/* 课程下拉框的箭头：站点 Foundation 自带的是实心三角，暗色主题那条
   background-image:none !important 又把它整个抹掉，两个主题长得不一样。
   干脆自己画一条两条线的 chevron，两边共用同一个形状。 */
.wt-form select{-webkit-appearance:none;appearance:none;-moz-appearance:none;
  background-repeat:no-repeat !important;background-position:right 9px center !important;background-size:12px 8px !important;
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='%236b5f73' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5'/%3E%3C/svg%3E");
  padding-right:30px !important;cursor:pointer;}
html[data-wt-theme="dark"] .wt-form select{background-repeat:no-repeat !important;background-position:right 9px center !important;background-size:12px 8px !important;background-color:#232128 !important;color:#e7e5ea !important;border-color:rgba(255,255,255,.16) !important;
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='%23b6abbf' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5'/%3E%3C/svg%3E") !important;}
html[data-wt-theme="dark"] .wt-form option{background-color:#232128;color:#e7e5ea;}
.wt-form input:focus,.wt-form select:focus,.wt-form textarea:focus{border-color:#64346f;box-shadow:0 0 0 2px rgba(100,52,111,.12);}
.wt-form-actions{display:flex;justify-content:flex-end;margin-top:4px;}
.wt-form .wt-modal-go:disabled{opacity:.45;cursor:not-allowed;}
.wt-set-rowbtns{display:flex;gap:8px;margin-top:8px;}
.wt-set-add{margin-left:0;}
.wt-up-head .wt-up-btn{width:24px;height:24px;min-width:24px;min-height:24px;max-width:24px;max-height:24px;flex:0 0 24px;align-self:center;box-sizing:border-box;line-height:1;border-radius:50%;border:1px solid rgba(100,52,111,.25);background:#fff;color:#64346f;font-size:14px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none;margin-left:auto;}
.wt-up-head .wt-up-btn:last-of-type{margin-left:0;}
.wt-up-head .wt-up-btn:hover{background:#693e7d;color:#fff;}
.wt-up-head .wt-up-btn:active{transform:scale(.92);}
.wt-up-head .wt-up-btn.on{background:#64346f;color:#fff;}
.wt-up li{position:relative;}
.wt-up li.wt-up-li-del{padding-right:26px;}
.wt-up-lead{position:relative;flex:0 0 18px;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;}
.wt-up-del{border:0;background:none;color:#b56;cursor:pointer;padding:0;line-height:1;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;min-width:18px;min-height:18px;max-width:18px;max-height:18px;flex:0 0 18px;box-sizing:border-box;}
.wt-confirm-floating{position:fixed;z-index:2147483000;display:flex;gap:8px;align-items:center;font-size:11px;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:8px;padding:6px 10px;box-shadow:0 8px 24px rgba(0,0,0,.18);animation:wtMenuIn .15s ease;}
.wt-confirm-floating button{border:0;background:none;color:#64346f;font:inherit;font-size:11px;cursor:pointer;text-decoration:underline;padding:0;}
.wt-confirm{position:absolute;left:0;top:calc(100% + 2px);z-index:6;display:flex;gap:6px;align-items:center;font-size:10px;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:6px;padding:3px 6px;box-shadow:0 4px 12px rgba(0,0,0,.12);animation:wtMenuIn .15s ease;}
.wt-confirm button{border:0;background:none;color:#64346f;font:inherit;font-size:10px;cursor:pointer;text-decoration:underline;padding:0;}
.wt-snackbar{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(10px);z-index:2147483647;background:#64346f;color:#fff;border-radius:8px;padding:10px 14px;display:flex;gap:14px;align-items:center;font-size:12px;box-shadow:0 10px 30px rgba(0,0,0,.25);opacity:0;transition:opacity .2s ease,transform .2s ease;}
.wt-snackbar.show{opacity:1;transform:translateX(-50%) translateY(0);}
.wt-snack-undo{background:none;border:0;color:#fff;font:inherit;font-weight:700;cursor:pointer;text-decoration:underline;}
.wt-up-restore{display:flex;flex-direction:column;gap:4px;margin:4px 0;}
.wt-restore-row{display:flex;align-items:center;gap:6px;animation:wtRestoreIn .22s cubic-bezier(.23,1,.32,1) both;}
@keyframes wtRestoreIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}
.wt-restore-row.wt-hiding{opacity:0;transform:translateX(-6px);transition:opacity .16s ease,transform .16s ease;}
.wt-restore-x{border:0;background:none;color:#b56;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;}
.wt-restore-btn{align-self:flex-start;border:1px solid rgba(100,52,111,.25);border-radius:999px;background:#fff;color:#64346f;font:inherit;font-size:11px;padding:4px 10px;cursor:pointer;}
.wt-restore-btn:hover{background:#693e7d;color:#fff;}

.wt-low-anim .wt-modal-overlay{transition:opacity .12s ease !important;}

/* ===== redesigned wt-summary: quiet, editorial, airy ===== */
[data-wesley-home] .wt-summary-head b{font-size:calc(20px * var(--wt-text-scale,1));}
[data-wesley-home] .wt-sec-title{font-size:calc(17px * var(--wt-text-scale,1));}
[data-wesley-home] .wt-up-head{font-size:calc(17px * var(--wt-text-scale,1));}
[data-wesley-home] .wt-tab{font-size:calc(12px * var(--wt-text-scale,1));}
[data-wesley-home] .wt-up li{font-size:calc(12px * var(--wt-text-scale,1));}
[data-wesley-home] .wt-task .wt-title{font-size:calc(14px * var(--wt-card-tscale,1) * var(--wt-title-scale,1));line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
[data-wesley-home] .wt-task .wt-detail,[data-wesley-home] .wt-due-card .wt-detail{line-height:1.45;}
[data-wesley-home] .wt-task .wt-cls{margin-bottom:5px;}
[data-wesley-home] .wt-task .wt-cls,[data-wesley-home] .wt-task .wt-cls a{line-height:1.3;}
[data-wesley-home] .wt-task,[data-wesley-home] .wt-due-card,[data-wesley-home] .wt-custom-card{font-size:calc(12px * var(--wt-card-tscale,1));padding:calc(10px * var(--wt-card-pad,1));}
[data-wesley-home] .wt-task .wt-cls{margin-bottom:5px;}
[data-wesley-home] .wt-task .wt-cls,[data-wesley-home] .wt-task .wt-cls a,[data-wesley-home] .wt-due-card .wt-cls{font-size:calc(10.5px * var(--wt-card-tscale,1) * var(--wt-link-scale,1));}
[data-wesley-home] .wt-task .wt-detail,[data-wesley-home] .wt-due-card .wt-detail{font-size:calc(11px * var(--wt-card-tscale,1) * var(--wt-detail-scale,1));white-space:pre-wrap;line-height:1.5;}
/* Due 卡上放的就是模态里那段全文，只是用 CSS 截成三行 —— 两边内容完全一致，
   而不用在字符串层面截短，点开模态看到的开头和卡片一模一样。 */
[data-wesley-home] .wt-due-card .wt-detail{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;white-space:normal;}
:root{--wt-spd:1;}
[data-wesley-home] .wt-summary{animation-duration:calc(.34s * var(--wt-spd));}
[data-wesley-home] .wt-task,[data-wesley-home] .wt-due-card,[data-wesley-home] .wt-custom-card{transition-duration:calc(.18s * var(--wt-spd));}
[data-wesley-home] .wt-tab{transition-duration:calc(.16s * var(--wt-spd));}
[data-wesley-home] .wt-tab.active::after{animation-duration:calc(.18s * var(--wt-spd));}
.wt-modal,.wt-modal *{font-family:Figtree, sans-serif !important;color:inherit;max-width:calc(100vw - 32px);transition-duration:calc(.18s * var(--wt-spd)) !important;}
[data-wesley-home] .wt-summary{
  background:
    radial-gradient(46% 78% at 90% 4%,color-mix(in srgb,var(--wt-glow,#efe4f4) 54%,transparent) 0%,rgba(0,0,0,0) 68%),
    radial-gradient(40% 66% at 6% 96%,color-mix(in srgb,var(--wt-glow,#efe4f4) 42%,transparent) 0%,rgba(0,0,0,0) 64%),
    radial-gradient(72% 92% at 44% -4%,color-mix(in srgb,var(--wt-glow,#efe4f4) 24%,transparent) 0%,rgba(0,0,0,0) 70%),
    radial-gradient(120% 130% at 8% 0%,var(--wt-t-panel-hi) 0%,var(--wt-t-panel-hi-2) 46%,transparent 80%),
    var(--wt-t-panel);
  border:1px solid var(--wt-t-line);border-radius:14px;box-shadow:var(--wt-t-panel-shadow);overflow:hidden;}
/* 面板不再做入场淡入：站点重绘后我们得把它插回去，重播动画就是一次闪烁 */
@keyframes wtPanelIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
[data-wesley-home] .wt-summary-head{background:var(--wt-t-surface);color:var(--wt-t-ink);padding:16px 18px;border-bottom:1px solid var(--wt-t-line-soft);border-radius:0;box-shadow:none;}
[data-wesley-home] .wt-summary-head::before{display:none;}
[data-wesley-home] .wt-summary-head b{color:var(--wt-t-ink);font-weight:650;font-size:20px;letter-spacing:-.01em;text-shadow:none;}
[data-wesley-home] .wt-summary-head .wt-count{margin-left:auto;font-size:11px;color:var(--wt-t-ink-3);background:none;border:0;padding:0;font-variant-numeric:tabular-nums;}
[data-wesley-home] .wt-summary-head .wt-chev{color:var(--wt-t-ink-3);}
[data-wesley-home] .wt-summary-head > *{position:relative;z-index:2;}
[data-wesley-home] .wt-summary-head:hover,[data-wesley-home] .wt-summary-head:hover b,[data-wesley-home] .wt-summary-head:hover .wt-count{color:var(--wt-t-ink) !important;}
[data-wesley-home] .wt-summary-head::after{content:"";position:absolute;inset:0;z-index:0;background:var(--wt-t-head-hover);opacity:0;transition:opacity .3s ease;pointer-events:none;border-radius:inherit;}
[data-wesley-home] .wt-summary-head:hover::after{opacity:1;}
[data-wesley-home] .wt-panel-body{background:var(--wt-t-panel-2);padding-bottom:0;border-bottom:0;}
[data-wesley-home] .wt-tabs{background:transparent;border-bottom:1px solid var(--wt-t-line-soft);border-radius:0;padding:0 14px;gap:2px;margin:0;backdrop-filter:none;-webkit-backdrop-filter:none;}
[data-wesley-home] .wt-tab{font-size:12px;color:var(--wt-t-ink-3);padding:10px 8px 9px;border:0;border-radius:0;background:transparent;position:relative;transition:color .16s ease;}
[data-wesley-home] .wt-tab.active{color:var(--wt-t-ink);font-weight:600;background:transparent;text-shadow:none;}
[data-wesley-home] .wt-tab.active::after{content:'';position:absolute;left:8px;right:8px;bottom:-1px;height:2px;background:var(--wt-t-accent);border-radius:2px 2px 0 0;transform-origin:left center;animation:wtTabLine .18s cubic-bezier(.23,1,.32,1) both;}
@keyframes wtTabLine{from{transform:scaleX(.4);opacity:0;}to{transform:scaleX(1);opacity:1;}}
[data-wesley-home] .wt-tab:active{transform:scale(.98);}
[data-wesley-home] .wt-tab-slider{display:none;}
[data-wesley-home] .wt-sec-head{background:transparent;border-top:1px solid rgba(38,30,44,.06);padding:10px 14px;color:#241f2b;font-size:17px;font-weight:650;letter-spacing:-.01em;}
[data-wesley-home] .wt-sec-body.open .wt-sec-inner{background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;border-radius:0;margin:0;padding:0 12px;box-shadow:none;}
[data-wesley-home] .wt-up-head{display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;background:transparent;border-top:1px solid rgba(38,30,44,.06);padding:10px 10px;color:#241f2b;font-size:17px;font-weight:650;letter-spacing:-.01em;text-transform:none;}
[data-wesley-home] .wt-up-body.open{background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;border-radius:0;box-shadow:none;padding:0 8px 8px;}
[data-wesley-home] .wt-up li{font-size:12px;line-height:20px;color:#5f5768;padding:4px 0;border-bottom:1px solid rgba(38,30,44,.05);}
[data-wesley-home] .wt-up li:last-child{border-bottom:0;}
[data-wesley-home] .wt-up li b{color:#241f2b;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;}
[data-wesley-home] .wt-up li > span:not(.wt-cd){min-width:0;overflow:hidden;text-overflow:ellipsis;}
[data-wesley-home] .wt-task,[data-wesley-home] .wt-due-card,[data-wesley-home] .wt-custom-card{font-size:var(--wt-card-font,13px);border:1px solid rgba(38,30,44,.07);border-radius:10px;box-shadow:none;transition:transform .18s ease,translate .18s ease,box-shadow .18s ease,border-color .18s ease;}
@media (hover:hover) and (pointer:fine){[data-wesley-home] .wt-task:hover,[data-wesley-home] .wt-due-card:hover,[data-wesley-home] .wt-custom-card:hover{translate:0 -1px;}}
[data-wesley-home] .wt-task:active,[data-wesley-home] .wt-due-card:active,[data-wesley-home] .wt-custom-card:active{transform:scale(.96) !important;transition:transform calc(.1s * var(--wt-spd,1)) ease-out;}
/* 按的是卡片里那个小方框，不是卡片本身：卡片别跟着缩，缩的是框 */
[data-wesley-home] .wt-task:has(.wt-check:active),[data-wesley-home] .wt-due-card:has(.wt-check:active),
[data-wesley-home] .wt-custom-card:has(.wt-check:active){transform:none !important;}
[data-wesley-home] .wt-empty-placeholder{border:1px dashed rgba(38,30,44,.16);background:transparent;color:#8a8192;font-size:12px;}
.wt-alert-wrap.wt-alert-float{position:fixed;top:10px;left:50%;transform:translateX(-50%);width:min(560px,calc(100vw - 24px));z-index:2147483000;}
.wt-alert-wrap.wt-alert-float .wt-alert{box-shadow:0 10px 30px rgba(40,20,50,.18);}
[data-wesley-home] .wt-alert-wrap{display:grid;grid-template-rows:0fr;opacity:0;margin:0;transition:grid-template-rows .34s cubic-bezier(.23,1,.32,1),opacity .22s ease,margin .34s ease;}
[data-wesley-home] .wt-alert-wrap.show{grid-template-rows:1fr;opacity:1;margin:8px 0 10px;}
[data-wesley-home] .wt-alert-inner{overflow:hidden;min-height:0;}
[data-wesley-home] .wt-alert{display:flex;align-items:center;gap:9px;width:100%;text-align:left;font:inherit;font-size:12px;line-height:1.45;color:#3b2244;
  background:linear-gradient(180deg,#f8f2fc,#efe6f7);border:1px solid rgba(100,52,111,.16);border-radius:12px;padding:10px 12px;cursor:pointer;
  box-shadow:0 2px 8px rgba(60,30,70,.08);transition:translate .18s ease,box-shadow .18s ease;}
[data-wesley-home] .wt-alert:hover{translate:0 -1px;box-shadow:0 8px 18px rgba(60,30,70,.13);}
[data-wesley-home] .wt-alert-dot{width:8px;height:8px;border-radius:50%;background:#64346f;flex:none;box-shadow:0 0 0 3px rgba(100,52,111,.13);}
[data-wesley-home] .wt-alert-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
[data-wesley-home] .wt-alert-text b{font-weight:650;color:#4f2759;}
[data-wesley-home] .wt-alert-x{color:#8a7391;font-size:15px;line-height:1;padding:0 2px;border-radius:5px;}
[data-wesley-home] .wt-alert-x:hover{background:rgba(100,52,111,.1);color:#4f2759;}
html.wt-perf [data-wesley-home] *,html.wt-perf [data-wesley-home] *::before,html.wt-perf [data-wesley-home] *::after,
html.wt-perf .wt-modal,html.wt-perf .wt-modal *{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}
html.wt-perf [data-wesley-home] .wt-summary,html.wt-perf [data-wesley-home] .wt-alert{box-shadow:none !important;}
html.wt-booting [data-wesley-home]{visibility:hidden;}
/* 骨架要能看见：boot 期间藏起来的是真面板，骨架本身就是用来占位的 */
html.wt-booting [data-wesley-home].wt-skel{visibility:visible;}
html.wt-perf [data-wesley-home] .wt-task,html.wt-perf [data-wesley-home] .wt-due-card,html.wt-perf [data-wesley-home] .wt-custom-card{box-shadow:none !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}
@media (prefers-reduced-motion: reduce){[data-wesley-home] .wt-alert-wrap{transition:none !important;}[data-wesley-home] .wt-summary{animation:wtCardFade .2s ease both;}[data-wesley-home] .wt-tab.active::after{animation:none;}}

/* speed-aware overrides (last wins) */
.wt-modal-overlay{transition-duration:calc(.2s * var(--wt-spd,1)) !important;}
.wt-modal,.wt-modal *{font-family:Figtree, sans-serif !important;}
.wt-modal{transition-duration:calc(.18s * var(--wt-spd,1)) !important;}
.wt-set-pop{transition-duration:calc(.18s * var(--wt-spd,1)) !important;}
.wt-set-pop.show{transition-duration:calc(.18s * var(--wt-spd,1)) !important;}
[data-wesley-home] .wt-summary{animation-duration:calc(.34s * var(--wt-spd,1)) !important;}
[data-wesley-home] .wt-tab{transition-duration:calc(.16s * var(--wt-spd,1)) !important;}
[data-wesley-home] .wt-tab.active::after{animation-duration:calc(.18s * var(--wt-spd,1)) !important;}
[data-wesley-home] .wt-task,[data-wesley-home] .wt-due-card,[data-wesley-home] .wt-custom-card{transition-duration:calc(.18s * var(--wt-spd,1)) !important;}

/* modal visual restoration */
.wt-modal{font-size:calc(13.5px * var(--wt-modal-ui,1)) !important;}
.wt-modal-meta{font-size:12px !important;}
.wt-modal-sub{font-size:calc(15px * var(--wt-modal-ui,1)) !important;line-height:20px !important;color:#222 !important;font-weight:650 !important;}
.wt-modal-detail{font-size:calc(13px * var(--wt-modal-ui,1)) !important;line-height:21px !important;color:#555 !important;}
.wt-modal-go{color:#fff !important;font-size:13.5px !important;background:#64346f !important;padding:8px 14px !important;border-radius:7px !important;}
.wt-modal-go:hover,.wt-modal-go:active{color:#fff !important;background:#693e7d !important;}
.wt-modal-x{width:28px !important;height:28px !important;min-width:28px;min-height:28px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:none;color:#999 !important;font-size:18px;cursor:pointer;}
.wt-modal-caret{transition:background .15s,transform .2s ease !important;}
.wt-modal-caret.open svg{transform:rotate(90deg) !important;}

/* ===== v0.0.103 motion pass (append-only, speed-scaled) ===== */
@keyframes wtStatusIn{from{opacity:0;transform:translate(-50%,-8px);}to{opacity:1;transform:translate(-50%,0);}}
[data-wesley-home] .wt-check.on{animation:wtTick calc(.22s * var(--wt-spd,1)) cubic-bezier(.23,1,.32,1) backwards;}
@keyframes wtTick{from{opacity:.35;transform:scale(.84);}to{opacity:1;transform:none;}}
.wt-detail li{animation:wtDetailRow calc(.2s * var(--wt-spd,1)) cubic-bezier(.23,1,.32,1) backwards;}
.wt-detail li:nth-child(2){animation-delay:calc(.03s * var(--wt-spd,1));}
.wt-detail li:nth-child(3){animation-delay:calc(.06s * var(--wt-spd,1));}
.wt-detail li:nth-child(4){animation-delay:calc(.09s * var(--wt-spd,1));}
.wt-detail li:nth-child(5){animation-delay:calc(.12s * var(--wt-spd,1));}
.wt-detail li:nth-child(6){animation-delay:calc(.15s * var(--wt-spd,1));}
@keyframes wtDetailRow{from{opacity:0;transform:translateY(3px);}to{opacity:1;transform:none;}}
[data-wesley-home] .wt-cw-hidden{transition:opacity .18s ease,filter .18s ease;}
[data-wesley-home] .wt-cw.wt-dragging{transition:none;}
[data-wesley-home] .wt-set-x,[data-wesley-home] .wt-set-edit,[data-wesley-home] .wt-restore-x,[data-wesley-home] .wt-restore-btn,.wt-toast-x,.wt-confirm button{transition:transform .12s ease,color .15s ease,background .15s ease;}
[data-wesley-home] .wt-set-x:active,[data-wesley-home] .wt-set-edit:active,[data-wesley-home] .wt-restore-x:active,[data-wesley-home] .wt-restore-btn:active,.wt-toast-x:active,.wt-confirm button:active{transform:scale(.92);}
@media (prefers-reduced-motion: reduce){
  [data-wesley-home] .wt-check.on,.wt-detail li{animation:wtCardFade calc(.2s * var(--wt-spd,1)) ease backwards !important;animation-delay:0s !important;}
}
.wt-low-anim .wt-low-anim [data-wesley-home] .wt-check.on,.wt-low-anim .wt-detail li{animation:none !important;}
/* 动画分三档：基础档（便宜的，一直开，不可关）、More animations（中等成本，可关）、
   Performance mode（最贵的：模糊/大阴影/大面积合成，可关）。这里只处理后两档。 */
/* More animations 关掉：入场错峰、悬停位移、模态与下一天的过渡都停 */
.wt-low-anim [data-wesley-home] .wt-task,
.wt-low-anim [data-wesley-home] .wt-up-head .wt-up-btn,
.wt-low-anim [data-wesley-home] .wt-tt-nextday,
.wt-low-anim .wt-modal-overlay,
.wt-low-anim .wt-modal,
.wt-low-anim .wt-modal-menu,
.wt-low-anim .wt-sr-overlay,
.wt-low-anim .wt-sr-pill,
.wt-low-anim .wt-sr-card,
.wt-low-anim table.wt-tt-alt,html.wt-low-anim table.wt-table,.wt-low-anim .wt-nextday-row,
.wt-low-anim .wt-set-pop{animation:none !important;transition:none !important;}
.wt-low-anim [data-wesley-home] .wt-task:hover,
.wt-low-anim [data-wesley-home] .wt-cw:hover .wt-task,
.wt-low-anim .wt-tt-nextday:hover{transform:none !important;}
/* Performance mode：只砍最贵的那些，不动基础过渡 */
.wt-perf .wt-sr-glass,
.wt-perf .wt-modal,
.wt-perf .wt-set-pop,
.wt-perf .wt-sr-setpanel{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}
.wt-perf [data-wesley-home] .wt-alert,
.wt-perf [data-wesley-home] .wt-task,
.wt-perf [data-wesley-home] .wt-summary,
.wt-perf .wt-modal,
.wt-perf .wt-sr-card,
.wt-perf .wt-sr-fab{box-shadow:none !important;}
.wt-perf [data-wesley-home] *,
.wt-perf .wt-sr-overlay *,
.wt-perf .wt-modal-overlay *{filter:none !important;}
.wt-perf .wt-task,
.wt-perf .wt-cw,
.wt-perf .wt-alert{will-change:auto !important;}
.wt-modal-caret svg{transition:transform calc(.2s * var(--wt-spd,1)) cubic-bezier(.23,1,.32,1) !important;}
/* focus-visible: cards and buttons are hand drawn, keyboard users need a visible ring */
[data-wesley-home] :focus-visible,
.wt-modal :focus-visible,
.wt-modal-dialog :focus-visible,
.wt-alert:focus-visible,
.wt-form input:focus-visible, .wt-form select:focus-visible, .wt-form textarea:focus-visible { outline: 2px solid #64346f; outline-offset: 1px; border-color: rgba(100,52,111,.5); }
/* layout self-check note */
[data-wesley-home] .wt-warn { display: flex; gap: 8px; margin: 2px 4px 8px; padding: 8px 10px; border: 1px solid rgba(170,112,16,.28); border-radius: 7px; background: rgba(255,196,64,.14); color: #6b4a10; font-size: 11.5px; line-height: 1.45; }
/* reduced motion: stop the looping animations outright */
html.wt-reduce .wt-loading::before, html.wt-reduce [data-wesley-home] .wt-sk { animation: none !important; }
/* tab in the background: pause every animation so nothing repaints */
html.wt-tab-hidden *, html.wt-tab-hidden *::before, html.wt-tab-hidden *::after { animation-play-state: paused !important; }
/* performance mode used to leave the two biggest blur surfaces running */
html.wt-perf [data-wesley-home] .wt-tabs, html.wt-perf [data-wesley-home] .wt-sec-inner,
html.wt-perf [data-wesley-home] .wt-up-body.open, html.wt-perf [data-wesley-home] .wt-summary,
html.wt-perf .wt-alert { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
html.wt-perf [data-wesley-home] .wt-sk { animation: none !important; }
/* 性能模式只管掉「贵」的东西（模糊、大阴影、滤镜、动画），不碰任何颜色/底色，
   否则一开就整块变成纯白，看着像主题被换了。 */

/* ===== theme: dark overrides, pass 2 (collapsibles / due cards / alert / status / site chrome) ===== */

html[data-wt-theme="dark"] [data-wesley-home] .wt-task,
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card,
html[data-wt-theme="dark"] [data-wesley-home] .wt-custom-card{
  background:var(--wt-t-surface-2) !important;border-color:var(--wt-t-line) !important;color:var(--wt-t-ink) !important;
  background-image:none !important;box-shadow:none !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-task:hover,
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card:hover{background:var(--wt-t-hover) !important;border-color:var(--wt-t-line-strong) !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card.done{background:#171220 !important;border-color:rgba(255,255,255,.05) !important;opacity:1 !important;box-shadow:none !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card.done .wt-title,
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card.done .wt-cls,
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card.done .wt-detail,
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card.done .wt-due-days{color:#7d7189 !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card.done .wt-check{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);color:#9a8ea6;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-task .wt-cls{color:var(--wt-t-ink-2) !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-task .wt-detail{color:var(--wt-t-ink-2) !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-panel-body,
html[data-wt-theme="dark"] [data-wesley-home] .wt-sec-inner,
html[data-wt-theme="dark"] [data-wesley-home] .wt-up-body,
html[data-wt-theme="dark"] [data-wesley-home] .wt-up-body.open{
  background:var(--wt-t-panel-2) !important;border-color:var(--wt-t-line) !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-sec-head,
html[data-wt-theme="dark"] [data-wesley-home] .wt-up-head,
html[data-wt-theme="dark"] [data-wesley-home] .wt-sec-toggle,
html[data-wt-theme="dark"] [data-wesley-home] .wt-up-toggle{color:var(--wt-t-ink) !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-section,
html[data-wt-theme="dark"] [data-wesley-home] .wt-sec-inner,
html[data-wt-theme="dark"] [data-wesley-home] .wt-tab-content{border-color:var(--wt-t-line) !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-empty-placeholder,
html[data-wt-theme="dark"] [data-wesley-home] .wt-loading{color:var(--wt-t-ink-3) !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-alert,
/* 黄色背景要落在带圆角的 .wt-alert 上；原来刷在 .wt-alert-wrap 上，就是个套在圆角外面的方框 */
[data-wesley-home] .wt-alert-wrap{background:none !important;border:0 !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-alert{background:linear-gradient(180deg,rgba(179,144,55,.20),rgba(179,144,55,.12)) !important;border-color:rgba(179,144,55,.34) !important;color:#f2e6c8 !important;}
html[data-wt-theme="dark"] .wt-alert-wrap.wt-alert-float .wt-alert{background:linear-gradient(180deg,rgba(179,144,55,.22),rgba(179,144,55,.14)) !important;border-color:rgba(179,144,55,.38) !important;color:#f2e6c8 !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-alert-text b{color:#f0dca0 !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-alert-x{color:#d9c7a2 !important;}

html[data-wt-theme="dark"] [data-wesley-home] .wt-warn{background:rgba(200,120,60,.16) !important;border-color:rgba(200,120,60,.4) !important;color:#f0d3b8 !important;}
/* 站点自己的壳：整页一起黑 */

/* 盘点出来的白底容器（dashboard 实测） */
/* 站点很多「白」是 background-image 里的渐变，只改 background-color 盖不住 */

html[data-wt-theme="dark"] [data-wesley-home] .island,
html[data-wt-theme="dark"] [data-wesley-home] .small-12.island{background:#1f1824 !important;background-image:none !important;border-color:var(--wt-t-line) !important;}
/* Right rail 的日历是 FullCalendar（.fc-*），列表行 tr.fc-event 自带 #fdfbfb */

/* ===== theme: dark overrides for surfaces driven by opacity vars ===== */
html[data-wt-theme="dark"] [data-wesley-home] .wt-summary-head{color:var(--wt-t-ink);}
html[data-wt-theme="dark"] [data-wesley-home] .wt-summary-head::before{background:radial-gradient(circle,var(--wt-t-glow),rgba(255,255,255,0) 66%);}
html[data-wt-theme="dark"] [data-wesley-home] .wt-tabs{background:var(--wt-t-glass);border-bottom-color:var(--wt-t-line-soft);}
/* 关掉导航玻璃时要压过暗色那条（它的选择器更具体），否则暗色下还是一层白雾 */
html[data-wt-theme="dark"] [data-wesley-home] .wt-no-navglass .wt-tabs{background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-sec-body.open .wt-sec-inner{background:var(--wt-t-surface-2);box-shadow:0 6px 18px rgba(0,0,0,.38);}
html[data-wt-theme="dark"] [data-wesley-home] .wt-task:hover{background:var(--wt-t-hover);box-shadow:0 3px 12px rgba(0,0,0,.4);}

/* the card detail span shares .wt-detail with the modal rows; the white top border was invisible on white and would show as a line in dark */
html[data-wt-theme="dark"] [data-wesley-home] .wt-task .wt-detail{border-top:0;}
/* ===== theme: dark, site-wide pass 3 (every page, native widgets, our modal) ===== */

/* our own chrome that pass 2 missed */

/* 性能模式下的暗色底：原规则被抽取暗色规则时断成了悬空选择器，导致 html 拿到 11px 字号 */
[data-wesley-home] .wt-tt-sec,section.wt-tt-sec{position:relative;}
/* 站点给 .timetable 留了 60px 下边距，套在 .scrollable 里就是课表下面那条空白 */
table.timetable.wt-table{margin-bottom:0 !important;}
/* 站点的 .scrollable 写死了高度（比我们的表高 60px），底下就多出一条空白 */
#content .island .scrollable{height:auto !important;}
/* dashboard 的课表不在 .island 里，上面的 height:auto 管不到；但站点给 .scrollable.wt-tt-wrap
   写的那个 height 是它自己算好的，别去动 —— 一动周末合成课表那套排版跟着抖（页面抽动）。 */
.wt-tt-actions{position:absolute;right:10px;bottom:6px;z-index:3;display:flex;align-items:center;gap:6px;}
.wt-tt-nextday{position:static;right:auto;bottom:auto;font:inherit;font-size:11px;line-height:1;min-height:0 !important;height:30px !important;padding:0 12px !important;display:inline-flex;align-items:center;justify-content:center;color:#8a7391;background:#fff;border:1px solid rgba(100,52,111,.14);padding:5px 9px;border-radius:999px;cursor:pointer;white-space:nowrap;box-shadow:0 1px 3px rgba(30,12,38,.10);transition:color .16s ease,background .16s ease,box-shadow .16s ease,transform .16s ease;}
.wt-tt-nextday:hover{color:#64346f;background:#f7f0fa;box-shadow:0 3px 9px rgba(30,12,38,.14);transform:translateY(-1px);}
.wt-tt-nextday:active{transform:translateY(0) scale(.97);}
html[data-wt-theme="dark"] .wt-tt-nextday{color:#b9b4c0;background:#232326;border-color:rgba(255,255,255,.12);box-shadow:0 1px 3px rgba(0,0,0,.4);}
html[data-wt-theme="dark"] .wt-tt-nextday:hover{color:#e7e5ea;background:#2f2f35;}
.wt-tt-daylist{font:inherit;font-size:12px;line-height:1;min-height:0 !important;height:30px !important;color:#8a7391;background:#fff;border:1px solid rgba(100,52,111,.14);width:30px;height:30px;padding:0;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;play:inline-flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(30,12,38,.10);transition:color .16s ease,background .16s ease;}
.wt-tt-daylist:hover{color:#64346f;background:#f7f0fa;}
html[data-wt-theme="dark"] .wt-tt-daylist{color:#b9b4c0;background:#232326;border-color:rgba(255,255,255,.12);}
html[data-wt-theme="dark"] .wt-tt-daylist:hover{color:#e7e5ea;background:#2f2f35;}
.wt-tt-alt-host{position:relative;}
/* 换日动画里 alt 表从右边 110% 滑进来，它虽然 absolute，但溢出到视口外会立刻
   给页面加一条横向滚动条（动画结束又消失，看着就是闪一下）。动画期间把宿主裁掉。 */
.wt-tt-alt-host.wt-tt-clip{overflow:clip !important;}
table.wt-tt-alt{position:absolute;left:0;top:0;width:100%;z-index:2;background:var(--wt-t-surface,#fff);transition:transform .42s cubic-bezier(.23,1,.32,1),opacity .32s ease;will-change:transform;}
table.timetable.wt-table{transition:transform .42s cubic-bezier(.23,1,.32,1),opacity .32s ease;}
.wt-tt-alt td.wt-empty-cell{background:transparent;}
.wt-nextday-modal{max-width:520px;width:min(520px,92vw);}
/* 右上角那颗 × 是 absolute 摘出文档流的，标题长一点、或者下面第一行按钮往上顶，
   就会钻到它底下。给标题留出 × 的车道，再跟下面拉开一点距离。 */
.wt-nextday-modal .wt-modal-head{padding-right:0;margin-bottom:10px;}
/* × 跟 Day / 日历 一起排进右侧工具行，不再绝对定位盖住我加的按钮 */
.wt-nextday-modal .wt-modal-x{position:static;top:auto;right:auto;}
.wt-nd-tools{margin-left:auto;display:flex;align-items:center;gap:6px;}
.wt-nd-daybtn,.wt-nd-calbtn{height:28px;min-height:28px;border-radius:8px;border:1px solid var(--wt-t-line,#e4dfe8);
  background:transparent;color:var(--wt-t-ink-2,#5d5666);font-size:12px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0 9px;}
.wt-nd-calbtn{width:28px;padding:0;}
.wt-nd-daybtn.on{background:#64346f !important;border-color:#64346f !important;color:#fff !important;}
html[data-wt-theme="dark"] .wt-nd-daybtn.on{background:#9b6fd6 !important;border-color:#9b6fd6 !important;color:#1b1520 !important;}
.wt-nd-daybtn:hover,.wt-nd-calbtn:hover{border-color:var(--wt-t-accent,#64346f);color:var(--wt-t-accent,#64346f);}
/* 非模态小浮层：不开遮罩，点外面就关 */
.wt-nd-pop{position:absolute;top:46px;right:12px;z-index:12;max-height:min(420px,calc(100% - 60px));overflow:auto;padding:10px;border-radius:12px;
  background:var(--wt-t-surface,#fff);border:1px solid var(--wt-t-line,#e4dfe8);box-shadow:0 14px 34px rgba(30,16,40,.18);}
.wt-nd-daypop{width:180px;}
.wt-nd-daylist{display:grid;grid-template-columns:1fr 1fr;gap:5px;}
.wt-nd-dayitem{height:26px !important;min-height:0 !important;border-radius:8px;border:1px solid var(--wt-t-line,#e4dfe8);
  background:transparent;color:var(--wt-t-ink-2,#5d5666);font-size:12px !important;line-height:1 !important;cursor:pointer;
  padding:0 !important;margin:0 !important;}
.wt-nd-dayitem:hover{border-color:var(--wt-t-accent,#64346f);color:var(--wt-t-accent,#64346f);}
.wt-nd-dayitem.on{background:#64346f !important;border-color:#64346f !important;color:#fff !important;}
html[data-wt-theme="dark"] .wt-nd-dayitem.on{background:#9b6fd6 !important;border-color:#9b6fd6 !important;color:#1b1520 !important;}
.wt-nd-calpop{width:304px;}
/* 这些控件在站点页面里会被全局 button{min-height:40px} 和继承字号撑成大方块，
   所以宽高/最小高度/字号一律 !important 钉死，别再靠继承。 */
.wt-nd-calhead{display:flex;align-items:center;gap:6px;margin:0 0 6px !important;}
.wt-nd-calnav{width:26px !important;height:26px !important;min-height:0 !important;border-radius:7px;
  border:1px solid var(--wt-t-line,#e4dfe8);background:transparent;color:var(--wt-t-ink-2,#5d5666);
  cursor:pointer;font-size:15px !important;line-height:1 !important;padding:0 !important;margin:0 !important;display:inline-flex;align-items:center;justify-content:center;}
.wt-nd-calmonth{flex:1 1 auto;text-align:center;font-size:13.5px !important;line-height:1.2 !important;color:var(--wt-t-ink,#2a2233);}
.wt-nd-calgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px !important;}
.wt-nd-calwd{text-align:center;font-size:10.5px !important;line-height:1 !important;color:var(--wt-t-ink-3,#8a8394);padding:0 0 5px !important;height:auto !important;}
.wt-nd-calcell{height:30px !important;min-height:0 !important;width:100% !important;border:0;border-radius:7px;background:transparent;
  color:var(--wt-t-ink-2,#4a4353);font-size:12.5px !important;line-height:1 !important;cursor:pointer;padding:0 !important;margin:0 !important;}
.wt-nd-calcell:hover{background:var(--wt-t-accent-weak,rgba(100,52,111,.1));}
.wt-nd-calcell.is-today{box-shadow:inset 0 0 0 1px var(--wt-t-accent,#64346f);}
.wt-nd-calcell.is-sel{background:#64346f !important;color:#fff !important;box-shadow:none;}
.wt-nd-calcell.is-sel-faint{background:rgba(100,52,111,.16) !important;color:inherit !important;box-shadow:none;}
html[data-wt-theme="dark"] .wt-nd-calcell.is-sel{background:#9b6fd6 !important;color:#1b1520 !important;}
html[data-wt-theme="dark"] .wt-nd-calcell.is-sel-faint{background:rgba(155,111,214,.22) !important;}
.wt-nd-calcell.is-off{color:var(--wt-t-ink-4,rgba(120,110,130,.42));cursor:default;background:transparent;}
.wt-nd-calcell.is-blank{cursor:default;}
html[data-wt-theme="dark"] .wt-nd-daybtn,html[data-wt-theme="dark"] .wt-nd-calbtn,
html[data-wt-theme="dark"] .wt-nd-calnav,html[data-wt-theme="dark"] .wt-nd-dayitem{border-color:rgba(255,255,255,.14);color:#c9c4d2;}
html[data-wt-theme="dark"] .wt-nd-pop{background:#232128;border-color:rgba(255,255,255,.1);box-shadow:0 14px 34px rgba(0,0,0,.55);}
html[data-wt-theme="dark"] .wt-nd-calcell{color:#d5d0dd;}
html[data-wt-theme="dark"] .wt-nd-calcell.is-off{color:rgba(201,196,210,.32);}
html[data-wt-theme="dark"] .wt-nd-calmonth{color:#e7e5ea;}
.wt-nextday-rows{display:flex;flex-direction:column;gap:2px;}
.wt-nextday-row{display:flex;gap:12px;padding:9px 2px;border-bottom:1px solid var(--wt-t-line-soft);}
.wt-nextday-name.is-blank{color:var(--wt-t-ink-3,#8f8899);font-weight:500;}
.wt-nextday-card{margin:0 -8px;padding:10px 8px;border-radius:10px;border-bottom:0;cursor:pointer;transition:background .16s ease,transform .16s ease;outline-offset:2px;}
.wt-nextday-card + .wt-nextday-card{margin-top:2px;}
.wt-nextday-card:hover{background:var(--wt-t-hover,rgba(100,52,111,.06));}
.wt-nextday-card:active{transform:scale(.995);}
.wt-nextday-card:focus-visible{outline:2px solid var(--wt-t-accent);}
.wt-nextday-card.is-empty{cursor:default;}
.wt-nextday-card.is-empty:hover{background:transparent;}
.wt-nextday-time{flex:0 0 108px;color:var(--wt-t-ink-3);font-size:11.5px;padding-top:2px;}
.wt-nextday-name{color:var(--wt-t-ink);font-size:13px;}
.wt-nextday-room{font-size:11px;color:var(--wt-t-ink-4,#9a93a4);}
.wt-nextday-tasks{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;}
.wt-nextday-task{font-size:11px;padding:2px 7px;border-radius:999px;background:var(--wt-t-accent-weak);color:var(--wt-t-accent-deep);}
.wt-nextday-empty{font-size:11.5px;color:var(--wt-t-ink-3);margin-top:3px;}
;
/* 编辑模式：tab 高亮 + 就地改名 */
/* edit mode: a pencil badge + a soft dashed underline says "this label is editable" */
[data-wesley-home] .wt-tab{display:inline-flex;align-items:center;}
[data-wesley-home] .wt-tab .wt-pen{width:11px;height:11px;margin-left:5px;flex:0 0 auto;opacity:0;transform:translateY(1px) scale(.8);transition:opacity .14s ease,transform .14s ease;pointer-events:none;}
[data-wesley-home] .wt-tabs-editable .wt-tab{cursor:text;box-shadow:inset 0 -1px 0 rgba(100,52,111,.35);}
[data-wesley-home] .wt-tabs-editable .wt-tab:hover{background:rgba(100,52,111,.07);}
[data-wesley-home] .wt-tabs-editable .wt-tab .wt-pen{opacity:.42;transform:translateY(1px);}
[data-wesley-home] .wt-tabs-editable .wt-tab:hover .wt-pen{opacity:.9;transform:translateY(0);}
[data-wesley-home] .wt-tabs-editable .wt-tab.active .wt-pen{opacity:.7;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-tabs-editable .wt-tab{box-shadow:inset 0 -1px 0 rgba(255,255,255,.28);}
html[data-wt-theme="dark"] [data-wesley-home] .wt-tabs-editable .wt-tab:hover{background:rgba(255,255,255,.09);}
[data-wesley-home] .wt-tab-rename{font:inherit;font-size:inherit;color:var(--wt-t-ink);background:var(--wt-t-surface);border:1px solid var(--wt-t-accent);border-radius:5px;padding:0 5px;width:88px;max-width:130px;box-shadow:0 0 0 3px var(--wt-t-accent-weak);}

/* ===== neutral accents: the UI stops using purple for text and controls ===== */
[data-wesley-home] .wt-summary-head .wt-chev{color:#6f6878;}
[data-wesley-home] .wt-task .wt-links a,.wt-detail li .wt-links a,.wt-modal-links a{color:#57505f;}
.wt-modal-status,.wt-ms-title,[data-wesley-home] .wt-due-days,.wt-modal-days,.wt-modal-days strong,[data-wesley-home] .wt-up li .wt-cd{color:#6f6878;}
[data-wesley-home] .wt-up-head:hover,.wt-modal-x:hover,.wt-set-btn:hover,.wt-set-x:hover,.wt-confirm-floating button,.wt-confirm button,.wt-restore-btn{color:#3f3947;}
.wt-file{border-color:rgba(0,0,0,.13);background:rgba(0,0,0,.025);}
.wt-file:hover{background:rgba(0,0,0,.07);border-color:rgba(0,0,0,.24);}
.wt-file-name{color:#2c2833;}
.wt-file-meta{color:#7d768a;}
html[data-wt-theme="dark"] .wt-file{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.04);}
html[data-wt-theme="dark"] .wt-file:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);}
html[data-wt-theme="dark"] .wt-file-name{color:#e2dee8;}
html[data-wt-theme="dark"] .wt-file-meta{color:#9a91a8;}
.wt-modal-go,.wt-toast,.wt-snackbar,[data-wesley-home] .wt-up-head .wt-up-btn.on,.wt-set-edit.on{background:#64346f;border-color:#64346f;}
[data-wesley-home] .wt-alert-dot{background:#b39037;box-shadow:0 0 0 3px rgba(179,144,55,.16);}
[data-wesley-home] .wt-check{border-color:rgba(0,0,0,.28);}
[data-wesley-home] .wt-check:hover{background:#f2f0f4;}
[data-wesley-home] .wt-check.on{background:#332e38;border-color:#332e38;color:#fff;font-weight:900;font-size:13px;}
[data-wesley-home] .wt-due-card.done .wt-check{background:#4a4553;border-color:#4a4553;color:#fff;}
.wt-loading:before{border-color:rgba(0,0,0,.16);border-top-color:#57505f;}
.wt-form input:focus,.wt-form select:focus,.wt-form textarea:focus{border-color:#57505f;box-shadow:0 0 0 2px rgba(0,0,0,.08);}
.wt-form input:focus-visible,.wt-form select:focus-visible,.wt-form textarea:focus-visible{outline-color:#8a8494;}
input[type="date"]{accent-color:#57505f;}

html[data-wt-theme="dark"] [data-wesley-home] .wt-summary-head .wt-chev,
html[data-wt-theme="dark"] [data-wesley-home] .wt-task .wt-links a,
html[data-wt-theme="dark"] .wt-detail li .wt-links a,
html[data-wt-theme="dark"] .wt-modal-links a,
html[data-wt-theme="dark"] .wt-modal-status,
html[data-wt-theme="dark"] .wt-ms-title,
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-days,
html[data-wt-theme="dark"] .wt-modal-days,
html[data-wt-theme="dark"] [data-wesley-home] .wt-up li .wt-cd{color:#d9d5e0;}

/* 这里原来只剩半条规则：选择器列表以逗号结尾、后面直接空行，声明块被后面的
   .wt-check 那条吃掉了 —— 于是暗色下 toast / 主按钮被写成 background:transparent。 */
html[data-wt-theme="dark"] .wt-modal-go,html[data-wt-theme="dark"] .wt-toast,html[data-wt-theme="dark"] .wt-snackbar,
html[data-wt-theme="dark"] [data-wesley-home] .wt-up-head .wt-up-btn.on,html[data-wt-theme="dark"] .wt-set-edit.on
  {background:#2b2733;border-color:#3a3644;color:#f0eef4;}

html[data-wt-theme="dark"] [data-wesley-home] .wt-check{border-color:rgba(255,255,255,.34);background:transparent;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-check:hover{background:rgba(255,255,255,.08);}
html[data-wt-theme="dark"] [data-wesley-home] .wt-check.on{background:#e7e5ea;border-color:#e7e5ea;color:#1b1b1e;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card.done{background:#1c1c1f !important;border-color:rgba(255,255,255,.07) !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card.done .wt-title,
html[data-wesley-home] .wt-due-card.done .wt-cls,
html[data-wesley-home] .wt-due-card.done .wt-detail{color:#8d8896 !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-due-card.done .wt-check{background:#3a3742;border-color:#3a3742;color:#cfcbd6;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-up-body.open{background:rgba(255,255,255,.045) !important;box-shadow:none !important;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-up-body,html[data-wt-theme="dark"] [data-wesley-home] .wt-up-body li,
html[data-wt-theme="dark"] [data-wesley-home] .wt-up-body span,html[data-wt-theme="dark"] [data-wesley-home] .wt-up-body div{color:#d9d5e0;}
html[data-wt-theme="dark"] [data-wesley-home] .wt-up-body a{color:#f0eef4;}
html[data-wesley-home] .wt-up li .wt-cd{color:#57505f;}

/* ===== dark pass 4: the containers the earlier passes missed ===== */

/* ===== dark pass 5: fullcalendar day cells + event text ===== */

/* ===== dark pass 6: site navigation/tab links keep neutral ink ===== */

/* 新闻流整块白底：站点把 feed 放在 #news-component 里一个无 class 的 <section>，
   之前"盘点白底容器"那批规则没覆盖到，暗色下是一大块白板。 */

/* 页面标题 + 卡片里的链接：暗底上原本是 #64346f 的紫，基本看不见 */

/* 左上角课表标题旁补的学期周次：和站点的 "Day 5" 一行，做成胶囊 */
/* 我们补的这一行和面板自己套了一层 row > small-12.columns，
   但站点的卡片本身是 .small-12.island（左右各 8px 外留白），
   所以这一列的 padding 要按 8px 来，才和下面的卡片边缘对齐。 */
/* 站点的课表那一格从页面 8px 起，下面卡片是从 16px 起；补 8px 让标题和合成课表跟卡片对齐。 */
/* 面板、标题、合成课表都放在站点栅格之外的一条整宽行里。
   以前直接插进 .column-left（那是 large-8 网格列），我们那张表的最小宽度把整列
   撑到 1500px，右边的 calendar 被挤出视口 —— 用户看到的就是「日历跑到最上面、整页压扁」。 */
.wt-tt-top{width:100%;max-width:100%;margin:16px 0 20px !important;float:none !important;}
[data-wesley-home]{margin-top:6px !important;margin-bottom:20px !important;}
.wt-tt-top > .columns{width:100% !important;float:none !important;padding-left:16px !important;padding-right:16px !important;}
.wt-tt-head{padding-left:8px;padding-right:8px;}
.wt-tt-body{margin-top:10px !important;margin-bottom:16px !important;padding-left:8px;padding-right:8px;}
.wt-tt-body table.timetable{width:100% !important;table-layout:fixed !important;}
.wt-tt-blank{height:146px;border-radius:10px;background:rgba(120,110,130,.06);}
html[data-wt-theme="dark"] .wt-tt-blank{background:rgba(255,255,255,.04);}
section.wt-tt-sec{padding-left:8px;padding-right:8px;}
.wt-tt-head{display:flex;align-items:center;gap:10px;margin:8px 0 12px;}
.wt-tt-head .wt-week-chip{margin-left:4px;}
.wt-week-chip .wt-week-txt{white-space:nowrap;}
.wt-week-chip{display:inline-flex;align-items:center;margin-left:10px;padding:2px 9px;border-radius:999px;
  font-size:12px;font-weight:600;line-height:1.5;letter-spacing:.01em;vertical-align:middle;
  background:rgba(100,52,111,.1);color:#64346f;border:1px solid rgba(100,52,111,.18);white-space:nowrap;}
html[data-wt-theme="dark"] .wt-week-chip{background:rgba(190,150,255,.14);color:#d9c2ff;border-color:rgba(190,150,255,.26);}
/* 课表和下面那块内容之间补间距：站点相邻 row 的规则被中间那条隐藏的 row 打断了 */
.row:has(table.timetable):not(.timetable-small){margin-bottom:14px;}
/* 右上角：设置齿轮和通知铃铛之间留白，左边那些条目自然会往左让。
   search.js 里那条 .wt-sr-setbtn.wt-sr-setbtn-inline 带 !important，这里要压过它。 */
section.right-small .wt-sr-setbtn.wt-sr-setbtn-inline{margin-left:12px !important;margin-right:14px !important;}
section.right-small{padding-right:18px !important;}
/* 头像 absolute 定位、靠 margin-right 撑开距离；原来只有 16px，齿轮几乎贴上去 */
a.account-menu{margin-right:30px !important;}

/* ===== Enhanced Calendar：Calendar 标题右边的小日历按钮 + 日期选择器 =====
   h2.subheader 原本是 block、整行只放标题。改成 flex 只为了把按钮摆到右端，
   文字仍贴着左边，看上去还是一个 "Calendar" 标题。
   按钮 26×26、透明底、无边框，平时几乎看不见，hover 才浮出一层底。 */
h2.wt-cal-h{display:flex;align-items:center;gap:8px;}
/* ‹ › Today 常驻在标题栏，紧挨着那颗日历按钮（margin-left:auto 把它们一起推到右端） */
.wt-cal-nav{display:inline-flex;align-items:center;gap:6px;margin-left:auto;flex:0 0 auto;}
.wt-cal-ico{display:inline-flex;align-items:center;justify-content:center;
  width:28px !important;height:28px !important;min-width:0 !important;min-height:0 !important;
  flex:0 0 auto;box-sizing:border-box;
  padding:0;margin:0;border:1px solid transparent;border-radius:7px;background:none;line-height:0;
  color:var(--wt-t-ink-3,#6b6473);cursor:pointer;float:none;text-transform:none;letter-spacing:0;
  transition:background .15s ease,color .15s ease,border-color .15s ease;}
.wt-cal-ico:hover{background:var(--wt-t-panel-hi,rgba(120,110,130,.14));color:var(--wt-t-ink,#222);}
.wt-cal-ico:focus-visible{outline:2px solid var(--wt-t-accent,#64346f);outline-offset:2px;}
.wt-cal-ico[aria-pressed="true"]{background:var(--wt-t-accent,#64346f);border-color:var(--wt-t-accent,#64346f);color:#fff;}
.wt-cal-ico svg{display:block;width:15px;height:15px;}
html[data-wt-theme="dark"] .wt-cal-ico{color:#a49daf;}
html[data-wt-theme="dark"] .wt-cal-ico:hover{background:rgba(255,255,255,.1);color:#f0eef4;}
html[data-wt-theme="dark"] .wt-cal-ico[aria-pressed="true"]{background:#9b6fd6;border-color:#9b6fd6;color:#1b1520;}

.wt-cal-box{padding:0;margin:0;font-family:Figtree,sans-serif;}
.wt-cal-bar{display:flex;align-items:center;gap:6px;margin:2px 0 6px;}
.wt-cal-bar .wt-cal-mon{font-size:13px;font-weight:600;color:var(--wt-t-ink,#222);letter-spacing:.01em;}
.wt-cal-bar .wt-cal-sp{flex:1 1 auto;}
.wt-cal-btn{border:1px solid var(--wt-t-line,rgba(0,0,0,.1));background:var(--wt-t-glass,rgba(255,255,255,.6));
  color:var(--wt-t-ink-2,#4a4453);font:inherit;font-size:12px;font-weight:600;line-height:1;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;
  height:26px !important;min-height:0 !important;box-sizing:border-box;
  padding:0 9px !important;border-radius:7px;transition:background .15s ease,color .15s ease,border-color .15s ease;}
.wt-cal-btn:hover{background:var(--wt-t-panel-hi,#f7f1fb);color:var(--wt-t-ink,#222);}
/* 翻月/翻日的箭头必须是正方形，别被站点 button 的 min-width 撑成长条 */
.wt-cal-btn.wt-cal-icon{width:26px !important;height:26px !important;
  min-width:0 !important;min-height:0 !important;
  flex:0 0 auto;box-sizing:border-box;padding:0 !important;font-size:14px;border-radius:7px;}
/* 日期选择器：一块卡片，落在日历原来的位置。不加阴影，只留描边 */
/* 日期选择器长在日历卡片里：占自己的位置，把卡片撑高、下面的内容自然往下走。
   以前是绝对定位贴着标题栏下沿盖上去，盖住的正是下一个卡片（Music Lessons），
   看着像选择器溢出了日历。 */
.wt-cal-island{position:relative;}
.wt-cal-popwrap{position:static;left:auto;right:auto;top:auto;z-index:auto;margin:2px 16px 14px;}
.wt-cal-pop{border:1px solid var(--wt-t-line,rgba(0,0,0,.1));border-radius:12px;
  background:var(--wt-t-panel,#fff);padding:10px 11px;}
.wt-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
.wt-cal-dow{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--wt-t-ink-3,#8b8494);text-align:center;padding:2px 0 4px;}
.wt-cal-cell{position:relative;border:0;background:none;font:inherit;font-size:12.5px;font-weight:500;
  color:var(--wt-t-ink,#222);height:30px;border-radius:8px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;padding:0;transition:background .14s ease,color .14s ease;}
.wt-cal-cell:hover{background:var(--wt-t-panel-hi,#f7f1fb);}
.wt-cal-cell.is-out{color:var(--wt-t-ink-3,#b9b3c0);font-weight:400;}
.wt-cal-cell.is-today{box-shadow:inset 0 0 0 1px var(--wt-t-accent,#64346f);font-weight:700;}
.wt-cal-cell.is-sel{background:var(--wt-t-accent,#64346f);color:#fff;box-shadow:none;font-weight:700;}
.wt-cal-cell.is-sel:hover{background:var(--wt-t-accent-deep,#3f1f49);color:#fff;}
.wt-cal-cell.has-ev::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);
  width:4px;height:4px;border-radius:50%;background:var(--wt-t-accent,#64346f);opacity:.75;}
.wt-cal-cell.is-sel.has-ev::after{background:#fff;opacity:.9;}
.wt-cal-hint{margin:7px 2px 0;font-size:10.5px;line-height:1.45;color:var(--wt-t-ink-3,#8b8494);}
.wt-cal-note{padding:9px 2px;font-size:12px;color:var(--wt-t-ink-3,#8b8494);}
.wt-cal-note.wt-cal-fail{color:#b4453f;}
/* 列表不自绘：markup 就是站点 FullCalendar list 视图那一套 class，不加 thead。
   字号/行高/内边距/分隔线/配色全部由站点自己的 CSS 提供，和原生日历像素级一致
   （实测时间列 150px、圆点列 34px、行高 39px、分隔线 0.6px rgba(255,255,255,.1)）。 */
html[data-wt-theme="dark"] .wt-cal-btn{color:#cfc9d8;border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.06);}
html[data-wt-theme="dark"] .wt-cal-btn:hover{background:rgba(255,255,255,.13);color:#f0eef4;}
html[data-wt-theme="dark"] .wt-cal-pop{background:#26222b;border-color:rgba(255,255,255,.1);}
html[data-wt-theme="dark"] .wt-cal-cell:hover{background:rgba(255,255,255,.08);}
html[data-wt-theme="dark"] .wt-cal-cell.is-out{color:#726c7c;}
html[data-wt-theme="dark"] .wt-cal-cell.is-today{box-shadow:inset 0 0 0 1px #b28be0;}
html[data-wt-theme="dark"] .wt-cal-cell.is-sel{background:#9b6fd6;color:#1b1520;}
html[data-wt-theme="dark"] .wt-cal-cell.is-sel:hover{background:#b28be0;color:#1b1520;}
html[data-wt-theme="dark"] .wt-cal-cell.has-ev::after{background:#b28be0;}
html[data-wt-theme="dark"] .wt-cal-note.wt-cal-fail{color:#f0938c;}
`;

  let settings = { ...DEFAULT_SETTINGS };
  /* 面板底色的重算入口：建面板时赋值，换主题时 applyTheme() 再调一次 */
  let PANEL_PAINT_BG = null;
  let FRESH_ALL = (() => { try { return sessionStorage.getItem('wtFreshAll') === '1'; } catch { return false; } })();
  let WT_HOST = null;
  let BOOT_RETRY = 0;
  /* 站点的 calendar AJAX、/timetable 页都可能在夜里慢到十几秒。任何一步都不许把
     骨架屏按在那儿等 —— 统一套一个超时，超了就当没数据继续往下走。 */
  const withTimeout = (p, ms, fallback) => Promise.race([
    Promise.resolve(p).catch(() => fallback),
    new Promise((r) => setTimeout(() => r(fallback), ms || 4000)),
  ]);
  /* 面板的落脚点：站点课表标题的后面（和 beta6 一致），其次左栏顶部。
     以前图省事挂到 document.documentElement 末尾，面板就脱离页面布局了，
     用户看到的是"容器没了、课表也变样"。 */
  /* 我们自己的整宽行（面板 / 自建标题 / 合成课表都住这儿）。
     必须落在站点栅格之外：.column-left 是 large-8 的网格列，把表塞进去会把列撑爆。 */
  function ensureTopRow() {
    const col = document.querySelector('.column-left');
    /* 面板和合成课表要排在「课表那一块」的正上方。课表有时在 .column-left 里，
       有时站点把它渲染成自己一整行（.island.column-full），后者更靠前 ——
       按课表定位，别按 .column-left，否则面板会掉到课表下面去。 */
    const tbl = [...document.querySelectorAll('table.timetable')].find((t) => !t.closest('.wt-tt-body'));
    const anchorEl = (tbl && (tbl.closest('.island') || tbl)) || document.querySelector('[data-timetable-header]') || col;
    const hostRow = anchorEl ? anchorEl.closest('.row') : (col ? col.closest('.row') : null);
    let top = document.querySelector('.wt-tt-top');
    if (top && top.isConnected) return top.querySelector('.columns') || top;
    top = el('div', { class: 'row wt-tt-top' });
    const cols = el('div', { class: 'small-12 columns' });
    top.append(cols);
    const parent = hostRow ? hostRow.parentElement : (document.querySelector('#main') || document.body);
    if (!parent) return null;
    if (hostRow && hostRow.parentElement === parent) parent.insertBefore(top, hostRow);
    else if (parent.firstChild) parent.insertBefore(top, parent.firstChild);
    else parent.append(top);
    return cols;
  }
  function placePanel(node) {
    if (!node) return false;
    renderWeekChip();
    const box = ensureTopRow();
    if (!box) return false;
    node.classList.remove('wt-skel-block');
    /* 标题在最上面，面板紧跟其后 */
    const head = box.querySelector(':scope > .wt-tt-head');
    const anchor = head ? head.nextSibling : box.firstElementChild;
    if (node.parentElement !== box || node.previousElementSibling !== head) box.insertBefore(node, anchor);
    return true;
  }
  /* 面板该待在「Day x / Last school day」标题底下、课表上面。可标题是站点后来才渲染的
     （实测 0.2 秒时只有一个空的 .column-left，3.2 秒才出现 h2），骨架那会儿没地方插，
     只能先落到 .column-left —— 插错容器整块面板就会跑到课表下面去。
     所以插完盯着，等标题冒出来就把它挪到正确位置（此时里面还是骨架，挪动不刺眼）。 */
  let PLACE_WATCH = null;
  function watchPanelPlacement(host) {
    if (!host) return;
    if (PLACE_WATCH) { try { PLACE_WATCH.disconnect(); } catch (e) { /* ignore */ } PLACE_WATCH = null; }
    const right = () => {
      const head = document.querySelector('.wt-tt-top > .columns > .wt-tt-head');
      return !!(host && host.parentElement && host.parentElement.querySelector(':scope > .wt-tt-head') && head && head.nextElementSibling === host);
    };
    if (right()) return;
    const ensure = () => {
      const head = ensureTtHead();
      if (!head) return false;
      if (head.nextElementSibling !== host) placePanel(host);
      return true;
    };
    if (ensure()) return;
    let moves = 0;
    const mo = new MutationObserver(() => {
      moves += 1;
      if (ensure() || moves > 400) { mo.disconnect(); PLACE_WATCH = null; }
    });
    try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) { /* ignore */ }
    PLACE_WATCH = mo;
    setTimeout(() => { try { mo.disconnect(); } catch (e) { /* ignore */ } if (PLACE_WATCH === mo) PLACE_WATCH = null; }, 15000);
  }

  let SNAP = null;
  let ALL_SUBJECTS = null;
  let HYDRATE = null;
  let ALIAS = {};
  try { ALIAS = JSON.parse(localStorage.getItem('wesleySubjectAlias') || '{}') || {}; } catch { ALIAS = {}; }
  const saveAlias = () => { try { localStorage.setItem('wesleySubjectAlias', JSON.stringify(ALIAS)); } catch { /* ignore */ } };
  let AVAIL_CLASSES = [];
  /* 选课用的完整清单（今天的 + 今天没课的 + 站点课程表里的全部）。
     由 buildSummary 挂上去，打开下拉框时现取 —— 不能只在建面板那一刻拍一张快照。 */
  let PICK_LIST = null;
  function pickList() {
    try { if (PICK_LIST) { const l = PICK_LIST(); if (l && l.length) return l; } } catch { /* ignore */ }
    return (AVAIL_CLASSES && AVAIL_CLASSES.length ? AVAIL_CLASSES : SNAP || []);
  }
  let ACTIVE_POP = null;
  let bindPopOutside = false;
  let TARGET_DAY = new Date();
  let L = S.en;

  function chevron() {
  const sp = el('span', { class: 'wt-chev' });
  sp.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
  return sp;
}

function iconImg(name, size) {
  const n = size || 16;
  const span = document.createElement('span');
  span.className = 'wt-ico';
  span.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:' + n + 'px;height:' + n + 'px;';
  if (name === 'close') {
    span.innerHTML = '<svg width="' + n + '" height="' + n + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  } else if (name === 'hide') {
    span.innerHTML = '<svg width="' + n + '" height="' + n + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 20L20 4"/></svg>';
  } else {
    span.innerHTML = '<svg width="' + n + '" height="' + n + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
  return span;
}

function el(tag, props, ...children) {
    const node = document.createElement(tag);
    /* 站点有一条 button:hover/button:focus 规则（权重 0,1,1）会把背景刷成 #fff，
       我们单类选择器压不过它，点完按钮焦点还在，就成了一块白砖。
       theme.css 里 [data-wt-ui] 把这条规则用到的变量归零，这里负责打标记。 */
    node.setAttribute('data-wt-ui', '');
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') node.className = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v != null) node.setAttribute(k, v);
    }
    for (const c of children) if (c != null) node.append(c.nodeType ? c : document.createTextNode(String(c)));
    return node;
  }
  function loadSettings() {
    return new Promise((resolve) => {
      const done = (local) => {
        try {
          chrome.storage.sync.get({ ...DEFAULT_SETTINGS }, (sync) => {
            const merged = { ...DEFAULT_SETTINGS, ...(sync || {}), ...(local || {}) };
            resolve(merged);
          });
        } catch {
          resolve({ ...DEFAULT_SETTINGS, ...(local || {}) });
        }
      };
      try { chrome.storage.local.get(null, (local) => done(local || {})); }
      catch { done({}); }
    });
  }
  function parseClock(text) {
    const m = /(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(String(text || ''));
    if (!m) return null;
    let hh = Number(m[1]);
    const mm = Number(m[2]);
    if (m[3].toLowerCase() === 'pm' && hh !== 12) hh += 12;
    if (m[3].toLowerCase() === 'am' && hh === 12) hh = 0;
    return hh * 60 + mm;
  }
  function rgbOf(color) {
    const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(color || '');
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  }
  function darken(color, amount) {
    const p = rgbOf(color);
    if (!p) return color;
    const f = 1 - Math.max(0, Math.min(0.85, amount));
    return `rgb(${Math.round(p[0] * f)}, ${Math.round(p[1] * f)}, ${Math.round(p[2] * f)})`;
  }
  function subjectName(name) {
  let n = cleanName(name);
  n = n.replace(/^(Year\s*(7|8|9|10|11|12)|Y(7|8|9|10|11|12)|Grade\s*(7|8|9|10|11|12))\s*[:\-]?\s+/i, '');
  n = n.replace(/^(7|8|9|10|11|12)\s+(?=[A-Za-z])/, '');
  n = n.replace(/\s+(7|8|9|10|11|12)[A-Z]?$/i, '');
  return n.trim() || cleanName(name);
}
function cleanName(name) {
  return String(name || '').replace(/\s*\([^)]*[\/][^)]*\)\s*$/,'').trim();
}

/* 用户改过的课名（wesleySubjectAlias）要压过站点原名，而且每个地方都得走同一条规则：
   代码优先（跨天不变）、再去掉 G/ 前缀的短代码、再规范化代码（O/0、L/1 归并）、最后才用课名。 */
function aliasOf(cls) {
  const c = cls || {};
  const raw = String(c.code || '').trim();
  const forms = [];
  const add = (k) => { if (k && forms.indexOf(k) === -1) forms.push(k); };
  if (raw) {
    const bare = raw.replace(/^[^/]*\//, '');
    const full = 'G/' + raw.replace(/^G\//, '');
    add(raw); add(bare); add(full);               // 站点同门课有时带 G/ 有时不带
    add(normCode(raw)); add(normCode(full));      // O/0、L/1 归并
  }
  add(String(c.name || '').trim());               // 只有名字的旧别名
  for (const k of forms) { if (ALIAS[k]) return ALIAS[k]; }
  return '';
}
/* 短名字：标签栏、下拉框、菜单 */
function displayName(cls) {
  const a = aliasOf(cls);
  return a || subjectName((cls || {}).name);
}
/* 长名字：卡片抬头 */
function cardLabel(cls) {
  const a = aliasOf(cls);
  return a || cleanName((cls || {}).name);
}

function codeList(cls) {
    return String(cls.code || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  function normCode(s) { return String(s || '').replace(/[()]/g, '').trim().toLowerCase().split('/').pop().trim().replace(/o/g, '0').replace(/l/g, '1'); }
  function classForCode(code) {
    const raw = String(code || '').replace(/[()]/g, '').trim().toLowerCase();
    const target = normCode(code);
    if (!target || !SNAP) return null;
    return SNAP.find((c) => codeList(c).includes(raw))
      || SNAP.find((c) => codeList(c).some((x) => normCode(x) === target))
      || null;
  }
  function remainingDays(due) {
    const d = new Date(String(due).slice(0, 10) + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    const a = new Date(); a.setHours(0, 0, 0, 0);
    return Math.round((d - a) / 86400000);
  }
  function fixDue(due) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(due || ''));
    if (!m) return due;
    let y = Number(m[1]);
    const now = Date.now();
    let t = new Date(y, Number(m[2]) - 1, Number(m[3])).getTime();
    while (t < now - 300 * 86400000) { y += 1; t = new Date(y, Number(m[2]) - 1, Number(m[3])).getTime(); }
    return `${y}-${m[2]}-${m[3]}`;
  }
  function postIdOf(cls) {
    const href = cls && cls.latestPost && cls.latestPost.href;
    const m = href ? /\/news\/(\d+)/.exec(href) : null;
    return m ? m[1] : '';
  }

  function collectPeriods(root) {
    const R = root || document;
    const table = R.querySelector('[data-timetable-container] table.timetable[data-timetable]') || R.querySelector('table.timetable[data-timetable]');
    if (!table) return null;
    const ths = [...table.querySelectorAll('thead th')];
    const tds = [...table.querySelectorAll('tbody tr:first-child td')];
    if (!tds.length) return null;
    const periods = tds.map((td, i) => {
      const card = td.querySelector('.timetable-subject');
      const a = card ? card.querySelector('a[href]') : null;
      const timeText = ths[i] ? ths[i].innerText : '';
      const start = parseClock(timeText);
      const endMatch = /[–-]\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i.exec(timeText);
      const end = endMatch ? parseClock(endMatch[1]) : null;
      const lines = card ? [...card.querySelectorAll('div')].map((d) => d.innerText.trim()) : [];
      return {
        td,
        th: ths[i] || null,
        period: (ths[i] ? ths[i].childNodes[0]?.textContent || '' : '').trim(),
        timeText: timeText.replace(/\s+/g, ' ').trim(),
        timeRange: (() => {
          const m = /(\d{1,2}:\d{2}\s*(?:am|pm))\s*[–-]\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i.exec(timeText);
          return m ? `${m[1]}–${m[2]}` : timeText.replace(/\s+/g, ' ').trim();
        })(),
        start,
        end,
        subject: a ? a.innerText.trim() : (card ? card.innerText.trim() : ''),
        href: a ? a.getAttribute('href') : '',
        code: (lines[0] || '').replace(/[()]/g, '').trim().split('/').pop().trim(),
        room: lines[1] || '',
        color: card && card.ownerDocument === document ? (getComputedStyle(card).backgroundColor || '') : '',
        card,
      };
    });
    return { table, periods, header: document.querySelector('[data-timetable-header]') };
  }

  // 站点自己的课表有时会多一列「8:30am–8:30am」（礼拜三的 pastoral 占位），零长度，删掉
  function pruneDeadColumns(table) {
    try {
      if (!table) return 0;
      const ths = [...table.querySelectorAll('thead th')];
      const dead = [];
      ths.forEach((th, i) => {
        const raw = (th.innerText || '').replace(/\s+/g, ' ').trim();
        /* 站点偶尔多出一列「3:35pm–7:30pm」这种课后杂项，既不是 Homeroom 也不是
           某一节正课，图上它就是一条空白列，直接把这一列剪掉。 */
        if (i > 0 && /^\d{1,2}:\d{2}/.test(raw) && !/homeroom|period/i.test(raw)) { dead.push(i); return; }
        const t = raw.replace(/\s+/g, '');
        const m = /(\d{1,2}:\d{2}(?:am|pm)?)[–-](\d{1,2}:\d{2}(?:am|pm)?)/i.exec(t);
        if (!m) return;
        const norm = (x, fallback) => (/am|pm/i.test(x) ? x : x + (fallback || '')).toLowerCase();
        const a = norm(m[1], /(am|pm)/i.exec(m[2] || '')?.[1]);
        const b = norm(m[2], /(am|pm)/i.exec(m[1] || '')?.[1]);
        if (a === b) dead.push(i);
      });
      for (let k = dead.length - 1; k >= 0; k -= 1) {
        const idx = dead[k];
        for (const tr of [...table.querySelectorAll('tr')]) {
          const cell = tr.children[idx];
          if (cell) cell.remove();
        }
      }
      if (dead.length) wtLog('timetable: pruned ' + dead.length + ' zero-length column(s)');
      return dead.length;
    } catch (e) { return 0; }
  }

  /* 0.1.2.4：删掉 AI 之后，旧版留下的模型设置、API key、AI 缓存，以及可能带着
     AI 写过任务文本的当日快照，一次性清干净。快照只清一次，之后不再动。 */
  function clearLegacyCache() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('wesleyTasks:') || k.startsWith('wesleyAi'))
        .forEach((k) => localStorage.removeItem(k));
      if (!localStorage.getItem('wesleyNoAi:v124')) {
        Object.keys(localStorage).filter((k) => k.startsWith('wesleyLocal:')).forEach((k) => localStorage.removeItem(k));
        localStorage.setItem('wesleyNoAi:v124', '1');
      }
    } catch { /* ignore */ }
    /* 只删旧版本留下的键：0.1.2.4 之前的版本存过 API key 与模型设置，升级后不该继续留在
       storage 里。扩展本身没有任何网络模型调用。 */
    try { chrome.storage.local.remove(['apiKey', 'fastModel', 'modelUrl', 'aiTasks']); } catch { /* ignore */ }
    try { chrome.storage.sync.remove(['apiKey', 'fastModel', 'modelUrl', 'aiTasks']); } catch { /* ignore */ }
  }
  function taskCardsFor(cls) {
    return normItems(cls).map((item) => ({ cls, item }));
  }
  function openClassPost(card) {
    const cls = card.cls;
    const id = postIdOf(cls);
    if (!cls || !cls.homepage) return;
    window.open(cls.homepage + (id ? `?wesley_post=${id}` : ''), '_blank', 'noopener');
  }

  function taskCard(card) {
    const { cls, item } = card;
    const color = cls.color || 'rgb(79,39,89)';
    const node = el('div', { class: 'wt-task', style: `--wt-color:${color};--wt-ink:${darken(color, 0.45)}`, role: 'button', tabindex: '0', title: 'Open the class page at this post' },
      el('div', { class: 'wt-cls' }, el('span', { class: 'wt-dot' }), el('a', { href: cls.homepage || '#', target: '_blank', rel: 'noreferrer', onclick: (e) => e.stopPropagation() }, cls.name)),
      el('div', { class: 'wt-title' }, item.title),
      item.detail ? el('div', { class: 'wt-detail' }, item.detail) : null,
      item.due ? el('div', { class: 'wt-due' }, (() => { const d = remainingDays(fixDue(item.due)); return d == null ? 'Due' : L.inDays(d); })()) : null,
      (() => {
        const links = itemLinks(cls, item);
        if (!links.length) return null;
        return el('div', { class: 'wt-links' },
          ...links.map((l) => el('a', { href: l.href, target: '_blank', rel: 'noreferrer', onclick: (e) => e.stopPropagation() }, l.label)));
      })(),
    );
    node.addEventListener('click', (e) => { if (e.target.closest('a')) return; openClassPost(card); });
    node.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); openClassPost(card); } });
    return node;
  }

  function renderDetail(p, details, state) {
    const box = el('div', { class: 'wt-detail' });
    let cls = classForCode(p.code);
    if (!cls && p.href) {
      const path = String(p.href).replace(/^https?:\/\/[^/]+/, '');
      cls = (SNAP || []).find((c) => c.homepage && String(c.homepage).replace(/^https?:\/\/[^/]+/, '') === path) || null;
    }
    if (!cls && p.subject) cls = (SNAP || []).find((c) => String(c.name || '').toLowerCase() === String(p.subject).toLowerCase()) || null;
    if (!cls) {
      box.append(el('div', { class: 'wt-empty' }, L.noPost));
      return box;
    }
    const items = normItems(cls).slice(0, 8);
    if (items.length) {
      const ul = el('ul');
      for (const item of items) {
        const links = itemLinks(cls, item);
        const li = el('li', { role: 'button', tabindex: '0' },
          el('span', { class: 'wt-title' }, item.title),
          (() => { const meta = prettyMeta(item.detail); return meta ? el('span', { class: 'wt-meta' }, meta.slice(0, 140)) : null; })(),
          links.filter((l) => !/assessments/i.test(l.href || '')).length ? el('span', { class: 'wt-links' }, ...links.filter((l) => !/assessments/i.test(l.href || '')).map((l) => el('a', { href: l.href, target: '_blank', rel: 'noreferrer', onclick: (e) => e.stopPropagation() }, l.label))) : null,
        );
        const allItems = normItems(cls);
        const idx = allItems.findIndex((x) => x.title === item.title);
        const open = () => openModal({ cls, items: allItems, index: idx < 0 ? 0 : idx });
        li.addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('a')) return; open(); });
        li.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); open(); } });
        ul.append(li);
      }
      box.append(ul);
    } else if (cls.latestPost && (cls.latestPost.title || cls.latestPost.text)) {
      const ul = el('ul');
      const li = el('li', { role: 'button', tabindex: '0' },
        el('span', { class: 'wt-title' }, cls.latestPost.title || 'Latest post'),
        el('span', { class: 'wt-meta' }, prettyMeta(dedupeTitle(cls.latestPost.title, cls.latestPost.text)).slice(0, 180)),
      );
      li.addEventListener('click', (e) => { e.stopPropagation(); openModal({ cls, items: [], index: 0 }); });
      ul.append(li);
      box.append(ul);
    } else {
      box.append(el('div', { class: 'wt-empty' }, L.noTasks));
    }

    return box;
  }

  /* ---------------- timetable expansion ---------------- */
  function expand(idx, state) {
    const { table, periods } = state;
    if (state.expanded === idx) { collapse(state); return; }
    state.expanded = idx;
    table.style.tableLayout = 'fixed';
    const scroller = table.closest('.scrollable');
    if (scroller) {
      if (!scroller.dataset.wtH) scroller.dataset.wtH = String(Math.round(scroller.getBoundingClientRect().height));
      scroller.style.height = scroller.dataset.wtH + 'px';
      scroller.classList.add('wt-tt-open');
    }
    const expanded = periods[idx];
    const cls = classForCode(expanded.code);
    const items = cls && cls.latestPost && cls.latestPost.tasks && Array.isArray(cls.latestPost.tasks.items) ? cls.latestPost.tasks.items.length : 0;
    const expandedPct = Math.min(46, 26 + items * 4);
    const otherPct = (100 - expandedPct) / Math.max(1, periods.length - 1);
    periods.forEach((p, i) => {
      const w = i === idx ? expandedPct : otherPct;
      if (p.th) p.th.style.width = w + '%';
      p.td.style.width = w + '%';
      p.td.classList.toggle('wt-expanded', i === idx);
      const oldDetail = p.card ? p.card.querySelector('.wt-detail') : null;
      if (oldDetail) oldDetail.remove();
    });
    if (expanded.card) {
      const subj = expanded.card;
      /* 细节留在格子里（用户明确不要浮层）。以前那版让格子从 oldH 长到 scrollHeight
         再收成 auto，同一行被撑高、容器跟着变、页面就抽一下；现在先把课表容器的高度
         钉死，格子长高只在容器内部滚动，页面高度全程不动。 */
      subj.append(renderDetail(expanded, state, state));
    }
  }

  function collapse(state) {
    state.expanded = -1;
    const { table, periods } = state;
    periods.forEach((p, i) => {
      const saved = state.original ? state.original[i] : null;
      if (saved) {
        if (p.th) p.th.style.width = saved.th;
        p.td.style.width = saved.td;
      }
      p.td.classList.remove('wt-expanded');
      if (p.card) {
        p.card.style.transform = '';
        p.card.style.minHeight = '';
        p.card.style.transition = '';
        p.card.style.overflow = '';
        p.card.style.height = state.originalHeights ? (state.originalHeights[i] || '') : '';
        if (p.card.dataset) delete p.card.dataset.wtOldH;
      }
      const d = p.card ? p.card.querySelector('.wt-detail') : null;
      if (d) d.remove();
    });
    table.style.tableLayout = '';
    const sc = table.closest('.scrollable');
    if (sc) { sc.classList.remove('wt-tt-open'); sc.style.height = ''; delete sc.dataset.wtH; }

  }

  /* ---------------- panel preferences ---------------- */
const STORE = 'wesleyPanel:v1';
const CUSTOM_KEY = 'wesleyCustom:v1';
const CUSTOM_DEL_KEY = 'wesleyCustomDeleted:v1';
const UP_DEL_KEY = 'wesleyUpcomingDeleted:v1';
const UP_ADD_KEY = 'wesleyUpcomingAdded:v1';
function loadJSON(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch { return fallback; } }
function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } }
function customCards(sectionKey) { const all = loadJSON(CUSTOM_KEY, {}); return Array.isArray(all[sectionKey]) ? all[sectionKey] : []; }
function saveCustom(sectionKey, list) { const all = loadJSON(CUSTOM_KEY, {}); all[sectionKey] = list; saveJSON(CUSTOM_KEY, all); }
const DUE_SET_KEY = 'wesleyDueSet:v1';   // 用户手动设的截止时间：{ '<dueKey>': '2026-11-09T16:00' }
function loadDueSet() { try { return JSON.parse(localStorage.getItem(DUE_SET_KEY) || '{}') || {}; } catch { return {}; } }
function saveDueSet(map) { try { localStorage.setItem(DUE_SET_KEY, JSON.stringify(map)); } catch { /* ignore */ } }
function dueSetAt(key) { const v = loadDueSet()[key]; if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
function dueSetLabel(d) {
  if (!d) return '';
  const day = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  /* 从帖子里读出来的日期没有时刻（零点），别显示成 "12:00 am" */
  if (!d.getHours() && !d.getMinutes()) return day;
  return day + ' ' + d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}

const DUE_KEY = 'wesleyDue:v1';
function loadDone() { try { return JSON.parse(localStorage.getItem(DUE_KEY) || '{}'); } catch { return {}; } }
function saveDone(map) { try { localStorage.setItem(DUE_KEY, JSON.stringify(map)); } catch { /* ignore */ } }
function loadPrefs() { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } }
function savePrefs(all) { try { localStorage.setItem(STORE, JSON.stringify(all)); } catch { /* ignore */ } }
function sectionPrefs(all, key) {
  all[key] = all[key] || {};
  const p = all[key];
  if (!Array.isArray(p.hiddenSubjects)) p.hiddenSubjects = [];
  if (!Array.isArray(p.hiddenCards)) p.hiddenCards = [];
  if (!Array.isArray(p.order)) p.order = [];
  return p;
}
function ordered(list, prefs, keyFn) {
  const idx = new Map((prefs.order || []).map((k, i) => [k, i]));
  return [...list].sort((a, b) => (idx.has(keyFn(a)) ? idx.get(keyFn(a)) : 1e9) - (idx.has(keyFn(b)) ? idx.get(keyFn(b)) : 1e9));
}
/* 这些是"考试须知"的边角料，不该当成今天的作业卡 */
const JUNK_RE = /permitted materials|prepare permitted|bring .*pens/i;
function wordsOf(s) {
  return new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2));
}
function similar(a, b) {
  const A = wordsOf(a); const B = wordsOf(b);
  if (!A.size || !B.size) return false;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter) > 0.55;
}
function prettyMeta(detail) {
  return String(detail || '').replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
}

function dedupeTitle(title, detail) {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  let d = String(detail || '').replace(/\s+/g, ' ').trim();
  if (!d) return '';
  if (!t) return d;
  const flex = t.split(' ').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
  const norm = (x) => x.replace(/\s+/g, ' ').trim().toLowerCase();
  // 完全一样 → 没有细节
  if (norm(d) === norm(t)) return '';
  // [标题] 正文  或  标题: 正文  → 去掉前缀
  const hard = new RegExp('^\\[?\\s*' + flex + '\\s*\\]?\\s*[:：\u2014\u2013-]\\s*', 'i');
  if (hard.test(d)) return d.replace(hard, '').trim();
  // 标题后面直接接正文（标题够长才认，避免误伤短标题）
  if (t.length >= 14) {
    const soft = new RegExp('^\\[?\\s*' + flex + '\\s*\\]?\\s+', 'i');
    if (soft.test(d)) return d.replace(soft, '').trim();
  }
  return d;
}

function formatDetail(text) {
  if (!text) return text;
  return String(text)
    .replace(/([a-z0-9])([A-Z][a-z])/g, '$1 $2')
    .replace(/\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi, '\n$1')
    .replace(/\s*(Period\s*\d+)/gi, '\n$1')
    .replace(/\s*Location\s*:/gi, '\nLocation:')
    .replace(/\s*Learning\s+Intention\s*:/gi, '\nLearning Intention:')
    .replace(/\s*Homework\s*:/gi, '\nHomework:')
    .replace(/\s*(?=(Chemistry|Biology|Physics|History|Geography|Economics|English|Literature|Mathematics|Methods|Specialist|Chinese|Japanese|French|German|Latin|Music|Art|Design|Technology|Physical\s+Education|Health)\s*\()/gi, '\n')
    .replace(/\s*(?=(End\s+of\s+Year|Criterion|Task\s*\d|Assessment|Exam|Topic|Unit\s*\d|Term\s*\d|Week\s*\d))/gi, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .replace(/^\n+/, '')
    .trim();
}

/* ---------------- 学期第几周 & 帖子里的日期 ----------------

   站点左上只写 "Day 5"（10 天循环里转到第几天），从来不写学期第几周，所以这里
   自己推：先用维州 2026 的学期日期表算，再拿老师帖子标题里的 "Term 4 Week 5"
   校验一遍。表要是记错了（或者换学年忘了填），两门以上不同的课给出同一个偏差
   就按偏差校正，并把校正记进日志。

   至于"网志里哪一段是今天的"，优先级从高到低：
     1. 段落自己写了日期      "Friday 30 October Period 3 ..." / "Wednesday 4th ..."
     2. 段落或整篇写了第几周  "Week 6 Monday 9 November ..." / 标题 "Term 4 Week 5"
     3. 帖子是不是这一周发的  周六、周日发的一般是下一周
   三条都落空的段落，只有帖子属于本周时才按星期名认。beta28 之前没有第 3 条，
   于是 11 月 6 号还能从帖子里翻出 10 月 30 号那段。 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_RE = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
/* 2026 学期：T1 1/28–4/2、T2 4/20–7/3、T3 7/20–9/18、T4 10/5–12/18。
   Week 1 从开学那一周的周一算（Term 1 就是 1 月 26 日那一周）。 */
const TERM_DATES = {
  2026: [['2026-01-28', '2026-04-02'], ['2026-04-20', '2026-07-03'], ['2026-07-20', '2026-09-18'], ['2026-10-05', '2026-12-18']],
};
const WEEK_OFFSET_KEY = 'wesleyWeekOffset:v1';

function atMidnight(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = atMidnight(d); x.setDate(x.getDate() + n); return x; }
function mondayOf(d) { const x = atMidnight(d); return addDays(x, -((x.getDay() + 6) % 7)); }
function sameYMD(a, b) { return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function daysBetween(a, b) { return Math.round((atMidnight(a) - atMidnight(b)) / 864e5); }
function monthIndex(word) {
  const w = String(word || '').toLowerCase();
  if (!w) return -1;
  for (let i = 0; i < MONTH_NAMES.length; i += 1) if (MONTH_NAMES[i].toLowerCase().slice(0, 3) === w.slice(0, 3)) return i;
  return -1;
}

/* 只看表：返回 {term, week}；假期里 week 是 null；表里没有这一年就 null */
function termWeekOf(d) {
  const rows = TERM_DATES[d.getFullYear()];
  if (!rows) return null;
  for (let i = 0; i < rows.length; i += 1) {
    const start = new Date(rows[i][0] + 'T00:00:00');
    const end = new Date(rows[i][1] + 'T00:00:00');
    if (d < start || d > end) continue;
    return { term: i + 1, week: Math.floor(daysBetween(mondayOf(d), mondayOf(start)) / 7) + 1 };
  }
  return { term: null, week: null };
}

function weekOffset() {
  const c = loadJSON(WEEK_OFFSET_KEY, null);
  return c && Number.isFinite(c.offset) ? c.offset : 0;
}

function schoolWeek(d) {
  const base = termWeekOf(atMidnight(d || TARGET_DAY || new Date()));
  if (!base) return null;
  if (!base.week) return base;
  const off = weekOffset();
  return off ? { term: base.term, week: base.week + off } : base;
}

/* 老师自己在帖子里写的周次最可靠。只看最近 9 天发布的帖子标题，两门以上不同的
   课给出同一个偏差才采信——个别班自定义的"第几周"不该带偏全校。 */
function calibrateWeek() {
  const now = TARGET_DAY || new Date();
  const votes = new Map();
  const codes = [];
  const detail = [];
  const seen = new Set();
  for (const cls of (SNAP || [])) {
    const post = cls && cls.latestPost;
    if (!post || !post.title) continue;
    const pt = postDateOf(post);
    if (!pt) continue;
    const gap = daysBetween(now, pt);
    if (gap < -2 || gap > 9) continue;
    const m = /week\s*(\d{1,2})/i.exec(String(post.title));
    if (!m) continue;
    const hint = Number(m[1]);
    if (!(hint >= 1 && hint <= 12)) continue;
    const key = String(cls.code || cls.name || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const ref = (pt.getDay() === 6 || pt.getDay() === 0) ? addDays(mondayOf(pt), 7) : pt;
    const base = termWeekOf(ref);
    if (!base || !base.week) continue;
    const delta = hint - base.week;
    votes.set(delta, (votes.get(delta) || 0) + 1);
    codes.push({ code: key, hint, base: base.week });
    detail.push(key + '→W' + hint + '(表算W' + base.week + ')');
  }
  let best = 0;
  let bestN = 0;
  let second = 0;
  for (const [delta, n] of votes) {
    if (n > bestN) { second = bestN; bestN = n; best = delta; } else if (n > second) second = n;
  }
  const apply = bestN >= 2 && best !== 0 && Math.abs(best) <= 3 && bestN > second;
  saveJSON(WEEK_OFFSET_KEY, { offset: apply ? best : 0, at: Date.now(), votes: codes });
  if (apply) wtLog('[week] 学期表偏了 ' + best + ' 周，按老师帖子校正：' + detail.join(', '));
  return apply ? best : 0;
}

function postDateOf(post) {
  const raw = post && (post.publishAt || post.timeText || post.timeTitle);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* 一条帖子讲的是哪一周：周六、周日发的按下一周算 */
function postWeek(post) {
  const pt = postDateOf(post);
  if (!pt) return null;
  const wd = pt.getDay();
  const ref = (wd === 6 || wd === 0) ? addDays(mondayOf(pt), 7) : pt;
  return schoolWeek(ref);
}

/* 帖子自己报的周次：标题，或正文开头 160 字里的 "Term 4 Week 5" / "Week 5" */
function postWeekHint(title, text) {
  const head = String(title || '') + ' ' + String(text || '').slice(0, 160);
  const m = /(?:term\s*(\d)\s*[,:;-]?\s*)?week\s*(\d{1,2})/i.exec(head);
  if (!m) return { week: 0, term: 0 };
  const w = Number(m[2]);
  if (!(w >= 1 && w <= 20)) return { week: 0, term: 0 };
  return { week: w, term: m[1] ? Number(m[1]) : 0 };
}

/* "Friday 30 October" / "Wednesday 4th" / "Friday October 30" 这三个写法；
   紧跟在星期名后面才认，所以 "Period 1" 不会被当成日子 */
const DAY_PREFIX_RE = new RegExp(
  '^(' + WEEKDAYS.join('|') + ')\\b(?:[\\s,.]*(?:the\\s+)?(?:(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(?:of\\s+)?(' + MONTH_RE + ')\\b)?|(' + MONTH_RE + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b))?',
  'i'
);
/* 不加 \b：老师常把两段粘在一起（"research posterTuesday 27 October"），
   有了词边界就匹配不到 Tuesday。 */
const DAY_ANY_RE = /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)/gi;
const TRAIL_SEP_RE = /^[\s,:;.\-\u2013\u2014]+/;

/* 把正文按星期切成一段一天。每段带星期、日、月、前面提到的周次和原文。 */
function daySections(text) {
  const src = String(text || '');
  const marks = [];
  DAY_ANY_RE.lastIndex = 0;
  let m;
  while ((m = DAY_ANY_RE.exec(src))) marks.push({ at: m.index, word: m[1] });
  const out = [];
  for (let i = 0; i < marks.length; i += 1) {
    const mk = marks[i];
    const stop = i + 1 < marks.length ? marks[i + 1].at : src.length;
    const chunk = src.slice(mk.at, stop);
    const pm = DAY_PREFIX_RE.exec(chunk);
    let weekday = mk.word;
    let day = 0;
    let month = -1;
    let used = mk.word.length;
    if (pm) {
      weekday = pm[1] || weekday;
      used = pm[0].length;
      if (pm[2]) { day = Number(pm[2]); month = pm[3] ? monthIndex(pm[3]) : -1; }
      else if (pm[5]) { day = Number(pm[5]); month = monthIndex(pm[4]); }
    }
    /* "Friday 3 pm" 里的 3 是时间，不是日期 */
    if (day && /^\s*(?:am|pm|o'?clock)\b/i.test(chunk.slice(used))) day = 0;
    const before = src.slice(Math.max(0, mk.at - 26), mk.at);
    const wm = /week\s*(\d{1,2})\s*[,:;-]?\s*$/i.exec(before);
    const restRaw = chunk.slice(used);
    const lead = restRaw.length - restRaw.replace(TRAIL_SEP_RE, '').length;
    out.push({
      at: mk.at,
      weekday,
      day,
      month,
      weekHint: wm ? Number(wm[1]) : 0,
      /* prefixLen = 星期名 + 日期表达 + 后面的分隔符，标题里靠它剥掉前缀 */
      prefixLen: used + lead,
      body: restRaw.replace(TRAIL_SEP_RE, '').trim(),
      raw: chunk.trim(),
    });
  }
  return out;
}

/* 段落里的日和月 → 真正的 Date。年取离参照日最近的那个；只写了日子没写月份时，
   月份从发帖月前后各试一个月，取离发帖日最近的。 */
function sectionDate(sec, ref) {
  if (!sec || !sec.day) return null;
  const base = (ref instanceof Date && !Number.isNaN(ref.getTime())) ? ref : (TARGET_DAY || new Date());
  let best = null;
  if (sec.month >= 0) {
    for (const y of [base.getFullYear() - 1, base.getFullYear(), base.getFullYear() + 1]) {
      const cand = new Date(y, sec.month, sec.day);
      if (cand.getMonth() !== sec.month) continue;
      const gap = Math.abs(daysBetween(cand, base));
      if (!best || gap < best.gap) best = { date: cand, gap };
    }
    return best ? best.date : null;
  }
  for (const shift of [-1, 0, 1]) {
    const anchor = new Date(base.getFullYear(), base.getMonth() + shift, 1);
    const cand = new Date(anchor.getFullYear(), anchor.getMonth(), sec.day);
    if (cand.getMonth() !== anchor.getMonth()) continue;
    const gap = Math.abs(daysBetween(cand, base));
    if (!best || gap < best.gap) best = { date: cand, gap };
  }
  return best && best.gap <= 21 ? best.date : null;
}

/* post 正文里常有一句 "Due: Monday 9th November"，那句话就是这张卡的截止日。
   只在 "due" 后面 80 个字符里找日期；找不到就返回 null，不瞎猜。 */
function dueDateInText(text, ref) {
  const t = String(text || '');
  const hit = /\bdue\b/i.exec(t);
  if (!hit) return null;
  const seg = t.slice(hit.index, hit.index + 80);
  let m = null;
  let day = 0;
  let month = -1;
  if ((m = new RegExp('(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(' + MONTH_RE + ')', 'i').exec(seg))) {
    day = Number(m[1]); month = monthIndex(m[2]);
  } else if ((m = new RegExp('(' + MONTH_RE + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?', 'i').exec(seg))) {
    month = monthIndex(m[1]); day = Number(m[2]);
  } else if ((m = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(seg))) {
    day = Number(m[1]); month = Number(m[2]) - 1;
    if (m[3]) { const y = Number(m[3].length === 2 ? '20' + m[3] : m[3]); return new Date(y, month, day); }
  }
  if (!day || month < 0 || month > 11) return null;
  return sectionDate({ day, month }, ref);
}
/* 距离截止还有几天（今天=0，过期=负数，读不到=null） */
function daysUntil(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  const a = atMidnight(new Date());
  return Math.round(daysBetween(d, a));
}

/* 判定「这段是不是今天」要用的那套上下文：今天的星期名、
   这条帖子属于哪一周、发帖日期。dayPartOf 和 normItems 以前各抄了一份，
   规则一改就得改两处，直接抽出来。 */
function weekContext(post) {
  const refDay = (typeof TARGET_DAY !== 'undefined' && TARGET_DAY) ? TARGET_DAY : new Date();
  const curWeek = (schoolWeek(refDay) || {}).week || 0;
  const hint = postWeekHint(post && post.title, post && post.text);
  const pw = postWeek(post);
  const postWeekNum = hint.week || (pw && pw.week) || 0;
  /* thisWeek 为 null 表示判断不了（假期、或表里没这一年），这时按宽松的办法走 */
  const thisWeek = curWeek && postWeekNum ? postWeekNum === curWeek : null;
  return {
    refDay, curWeek, postWeekNum, thisWeek,
    base: postDateOf(post) || refDay,
    todayName: WEEKDAYS[refDay.getDay()].toLowerCase(),
  };
}

/* 正文里属于 refDay 的那一段（或那几段）。
   how 只用来记日志：plain=正文没有星期词 / day=按日期或周次命中 /
   outline=今天没安排但帖子属于本周（给整篇当大纲）/ stale=帖子不是本周的。 */
function dayPartOf(text, post) {
  const raw = String(text || '').trim();
  if (!raw) return { text: '', how: 'empty' };
  const secs = daySections(raw);
  if (!secs.length) return { text: raw, how: 'plain' };
  const ctx = weekContext(post);
  const { refDay, curWeek, thisWeek, base, todayName } = ctx;
  const hits = [];
  for (const sec of secs) {
    if (sec.day) {
      const d = sectionDate(sec, base);
      if (d && sameYMD(d, refDay)) hits.push(sec);
      continue;
    }
    if (sec.weekday.toLowerCase() !== todayName) continue;
    if (sec.weekHint) {
      if (!curWeek || sec.weekHint === curWeek) hits.push(sec);
      continue;
    }
    if (thisWeek !== false) hits.push(sec);
  }
  if (hits.length) return { text: hits.map((s) => s.raw).join('\n'), how: 'day' };
  if (thisWeek === false) return { text: '', how: 'stale' };
  return { text: raw, how: 'outline' };
}

function todaySlice(text, post) {
  if (!text) return text;
  return dayPartOf(text, post || null).text;
}

function classTodayDetail(cls) {
  const post = (cls && cls.latestPost) || null;
  const text = (post && post.text) || '';
  if (text) {
    const got = dayPartOf(text, post);
    if (got.text) return formatDetail(got.text);
  }
  const summary = (post && post.tasks && post.tasks.summary) || '';
  if (summary) return formatDetail(dayPartOf(summary, post).text || summary);
  return '';
}

/* 卡片/弹窗里那条 item 的正文：item.detail 往往只是正文前 200 字的截断，
   能用整篇帖子正文就用整篇，这样按日期挑段才挑得到。 */
function itemTodayDetail(cls, item) {
  const post = (cls && cls.latestPost) || null;
  const full = (post && post.text) || '';
  const detail = String((item && item.detail) || '');
  let src = detail;
  if (full && detail && full.startsWith(detail.slice(0, 80))) src = full;
  const got = dayPartOf(src || full, post);
  return got.text;
}

/* 课表顶上那一行。站点在有课的日子自己画「Day 5」，周末页面干脆不渲染标题 ——
   于是「Day X」和后面的周次一起消失。这里兜一层：站点没画就自己补一行，
   周末写「Showing <下一个上学日>」，周次只写「Week N」（不再带 Term 4）。 */
function ttDayLabel(d) {
  try {
    return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
  } catch (e) {
    return d.toDateString();
  }
}
/* 站点的课表区块 section.wt-tt-sec 外面通常还包一层 .small-12，
   新标题要插在这一层前面，插进 .row 里会挤进格子。 */
/* 下一个工作日。main() 里那份 nextSchoolDay() 是闭包内的，模块级拿不到。 */
function nextWeekday(from) {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 1; i <= 7; i += 1) {
    const t = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    if (t.getDay() !== 0 && t.getDay() !== 6) return t;
  }
  return base;
}
/* 「这一页显示的其实是哪天」。
   周末有两套页面：站点自己给下一个上学日的课（这时没有标题，标题是我们补的），
   或者我们兜底画出「上一个上学日」的合成课表（那条标题带 data-timetable-header）。
   所以只有在标题是我们补的那条时，才按下一个上学日算，否则按 TARGET_DAY 算。 */
function ttShownDay(head) {
  /* 周次跟的是「表上排的是哪一天」，不是「今天是哪天」。
     周末站点把上一个/下一个上学日的课排出来，TARGET_DAY 已经被设成那一天。 */
  const base = TARGET_DAY || new Date();
  return base;
}
/* 站点自己那颗课表标题（"Day 5" / "Last school day"）。它住在站点课表区块里，
   位置在面板下面，所以只当「站点发没发出今天那张表」的信号用，不再拿来显示。 */
function siteTtHead() {
  return [...document.querySelectorAll('[data-timetable-header]')].find((h) => !h.hasAttribute('data-wt-own')) || null;
}
/* 我们那颗标题挂在整宽行最上面，站点那颗原样留在下面 —— 不藏掉的话屏幕上有两条 Day N。
   只是视觉隐藏，文本还留着（合成课表靠它的文字判断站点真表来没来）。 */
function hideSiteHead() {
  const h = siteTtHead();
  if (h && !h.hasAttribute('data-wt-hide-head')) {
    h.setAttribute('data-wt-hide-head', '1');
    h.style.setProperty('display', 'none', 'important');
  }
}
/* 标题文本：周中写「Day 5」，周末/假期写「Showing Monday 16 Nov」。
   前缀看「今天」，日期看「表上排的那天」—— 周末站点排的是上一个/下一个上学日。 */
function refreshHeadLabel(dayArg) {
  const head = ensureTtHead();
  if (!head) return null;
  const day = dayArg || ttShownDay(head);
  const todayRest = [0, 6].includes(new Date().getDay());
  const txt = todayRest ? ('Showing ' + ttDayLabel(day)) : ttDayNumLabel(day);
  const span = head.querySelector('.wt-tt-head-txt');
  if (span && span.textContent !== txt) span.textContent = txt;
  if (!todayRest) fillTtDayNum(head, day);
  return head;
}
function ensureTtHead() {
  const holder = ensureTopRow();
  if (!holder) return null;
  hideSiteHead();
  const own = holder.querySelector(':scope > .wt-tt-head');
  if (own) return own;
  const day = TARGET_DAY || new Date();
  const todayRest = [0, 6].includes(new Date().getDay());
  const head = el('h2', { class: 'subheader wt-tt-head', 'data-timetable-header': '', 'data-wt-own': '1' },
    el('span', { class: 'wt-tt-head-txt' }, todayRest ? ('Showing ' + ttDayLabel(day)) : ttDayNumLabel(day)));
  /* 顺序恒为「标题 → 面板 → 课表」：用户要 Day N 在最上面 */
  holder.insertBefore(head, holder.firstElementChild);
  if (!todayRest) fillTtDayNum(head, day);
  return head;
}
/* 周中标题要写「Day N」。站点页面上没有现成字段，只能拿当天的课去 /timetable 的
   十个 Day 列里比编号（同 openNextDay 里那一套）。这里先读缓存立刻显示，再异步补一次。 */
let WT_DAYNUM = {};
try { WT_DAYNUM = JSON.parse(localStorage.getItem('wtDayNum:v1') || '{}') || {}; } catch { WT_DAYNUM = {}; }
let TT_DAY_RESOLVER = null;   // main() 里赋值：async (Date) => Day 几 | null
const wtDayKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function ttDayNumLabel(day) {
  const key = wtDayKey(day);
  /* 站点那张表自己写着「Day N」：它排的就是今天，白捡一个真值，
     不用等 /timetable 把十个 Day 列一一对过去。换天之后 TARGET_DAY 不是今天，
     站点那行字就跟表上排的那天无关了，这时不许拿它当依据。 */
  if (!WT_DAYNUM[key] && sameYMD(day, new Date())) {
    const siteHead = siteTtHead();
    const m = siteHead ? /Day\s*(\d{1,2})/i.exec(siteHead.textContent || '') : null;
    if (m) {
      WT_DAYNUM[key] = Number(m[1]);
      try { localStorage.setItem('wtDayNum:v1', JSON.stringify(WT_DAYNUM)); } catch (e) { /* ignore */ }
    }
  }
  const n = WT_DAYNUM[key];
  return n ? 'Day ' + n : ttDayLabel(day);
}
function fillTtDayNum(head, day) {
  const key = wtDayKey(day);
  if (WT_DAYNUM[key] || !TT_DAY_RESOLVER) return;
  TT_DAY_RESOLVER(day).then((n) => {
    if (!n) return;
    WT_DAYNUM[key] = n;
    try { localStorage.setItem('wtDayNum:v1', JSON.stringify(WT_DAYNUM)); } catch { /* ignore */ }
    const span = head && head.querySelector && head.querySelector('.wt-tt-head-txt');
    if (span && !/^Showing /.test(span.textContent || '')) span.textContent = 'Day ' + n;
  }).catch(() => {});
}
/* 「现在该把周次胶囊挂在哪颗标题上」：合成课表在的时候挂它自己的标题，
   否则挂站点那颗。合成模式下站点那一块被 hide 掉，标题跟着一起没了。 */
function activeHead() {
  const bodies = [...document.querySelectorAll('.wt-tt-body')];
  for (const b of bodies) {
    const h = b.querySelector('[data-timetable-header]');
    if (h && h.getBoundingClientRect().height > 0) return h;
  }
  return ensureTtHead();
}
/* 把周次胶囊整颗搬到目标标题里（同一个元素，不复制）。
   合成课表被拆掉、或标题被站点重画时都要靠它把胶囊跟着带过去。 */
function parkChip(head) {
  if (!head) return;
  const chip = document.querySelector('.wt-week-chip');
  if (chip && !head.contains(chip)) head.append(chip);
}
/* 站点的标题谁都只是显示，没有脚本读它的文本，所以往里塞一个 span 是安全的。 */
function renderWeekChip() {
  const head = activeHead();
  if (!head) return;
  parkChip(head);
  const info = schoolWeek(ttShownDay(head));
  const label = info && info.week ? 'Week ' + info.week : '';
  let chip = head.querySelector('.wt-week-chip');
  if (!label) {
    if (chip) chip.remove();
    return;
  }
  if (!chip) {
    chip = el('span', { class: 'wt-week-chip' });
    head.append(chip);
  }
  let weekTxt = chip.querySelector('.wt-week-txt');
  if (!weekTxt) {
    weekTxt = el('span', { class: 'wt-week-txt' });
    chip.insertBefore(weekTxt, chip.firstChild);
  }
  if (weekTxt.textContent !== label) weekTxt.textContent = label;
  chip.title = 'Week ' + info.week + ' of Term ' + info.term;
}

function normItems(cls) {
  const post = (cls && cls.latestPost) || null;
  const tasks = post && post.tasks;
  if (!tasks || !Array.isArray(tasks.items)) return [];
  const seen = [];
  const out = [];
  const isPHE = /Phys & Health/i.test(cls.name);
  const { refDay, curWeek, thisWeek, base, todayName } = weekContext(post);
  let todayItem = null;
  const classDetail = classTodayDetail(cls);
  let itemIdx = 0;
  for (const raw of tasks.items) {
    let title = String(raw.title || '').trim();
    if (!title) continue;
    if (JUNK_RE.test(title) || JUNK_RE.test(String(raw.detail || ''))) continue;
    /* 标题以星期开头的 item 就是"某一天"的安排，按日期/周次/发帖时间判是不是今天 */
    const head = daySections(title)[0];
    if (head && head.at === 0) {
      let keep;
      if (head.day) {
        keep = sameYMD(sectionDate(head, base), refDay);
      } else if (head.weekHint) {
        keep = !curWeek || head.weekHint === curWeek;
      } else {
        keep = head.weekday.toLowerCase() === todayName && thisWeek !== false;
      }
      if (!keep) continue;
      if (isPHE) {
        if (!todayItem) todayItem = { title: 'Today', detail: dedupeTitle('Today', String(raw.detail || '')), kind: 'classwork', due: '', links: [] };
        continue;
      }
      title = title.slice(head.prefixLen).trim() || title;
    }
    let detailText = itemTodayDetail(cls, raw);
    if (!detailText && itemIdx === 0) detailText = classDetail;
    detailText = dedupeTitle(title, detailText);
    itemIdx += 1;
    const text = title + ' ' + detailText;
    if (seen.some((s) => similar(s, text))) continue;
    seen.push(text);
    /* 卡片上的正文也过一遍 formatDetail：站点把相邻块粘在一起
       （"Friday 6 NovemberPeriod 5Assessment…"），之前只有模态里断开，卡片里是糊的。 */
    out.push({ ...raw, title, detail: formatDetail(detailText) });
  }
  if (todayItem) out.unshift(todayItem);
  return out;
}
function itemLinks(cls, item) {
  const own = item && Array.isArray(item.links) ? item.links : [];
  const post = cls && cls.latestPost && Array.isArray(cls.latestPost.links) ? cls.latestPost.links : [];
  return (own.length ? own : post).slice(0, 3).map((l) => {
    const raw = String(l.text || '').trim();
    const label = raw && raw.toLowerCase() !== 'here' ? raw : (item && item.title ? item.title : 'Link');
    return { href: l.href, label };
  });
}

function postTimeOf(cls) {
  return (cls && cls.latestPost && (cls.latestPost.timeText || cls.latestPost.timeTitle)) || '';
}

/* ---------------- modal ---------------- */
function modalWidthStyle(dlg) {
  try {
    const pct = settings.modalWidthPct == null ? 100 : (Number(settings.modalWidthPct) || 100);
    const mw = Math.max(300, Math.min(window.innerWidth - 32, Math.round(576 * pct / 100)));
    dlg.style.width = mw + 'px';
    dlg.style.setProperty('--wt-modal-ui', String((settings.modalUiPct == null ? 100 : settings.modalUiPct) / 100));
  } catch { /* ignore */ }
}

/* 两处模态（表单 / 详情）搭的脚手架一模一样：一块遮住页面的暗底 + 一张铺满视口的
   dialog + 同一套关闭动画。抽出来，免得改一处忘另一处。 */
function mountModal(overlay) {
  const pageDim = el('div', { class: 'wt-page-dim' });
  /* 底色交给 CSS（深浅两套），内联只留几何 —— 内联写死背景会把暗色那条规则压掉。 */
  pageDim.style.cssText = 'position:fixed;left:-200px;top:-200px;width:200vw;height:200vh;z-index:2147482999;pointer-events:none;';
  const dialog = document.createElement('dialog');
  dialog.className = 'wt-modal-dialog';
  dialog.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;max-width:100vw;max-height:100vh;margin:0;padding:0;border:0;background:transparent;overflow:hidden;';
  dialog.append(overlay);
  document.documentElement.classList.add('wt-modal-open');
  document.documentElement.append(pageDim, dialog);
  const hide = () => {
    overlay.classList.remove('show');
    document.documentElement.classList.remove('wt-modal-open');
    try {
      pageDim.style.transition = 'opacity ' + (animMs(180) / 1000) + 's ease';
      pageDim.style.opacity = '0';
    } catch { /* ignore */ }
    setTimeout(() => { try { if (dialog.open) dialog.close(); } catch { /* ignore */ } }, animMs(190));
    setTimeout(() => { overlay.remove(); pageDim.remove(); try { dialog.remove(); } catch { /* ignore */ } }, animMs(240));
  };
  return { pageDim, dialog, hide };
}

function openFormModal({ title, fields, submitLabel, onSubmit, extra }) {
  closeAllModals();
  const overlay = el('div', { class: 'wt-modal-overlay' });
  const dlg = el('div', { class: 'wt-modal wt-form-modal' });
  const close = el('button', { class: 'wt-modal-x', 'aria-label': 'Close' }, iconImg('close', 12));
  const head = el('div', { class: 'wt-modal-head' }, el('div', { class: 'wt-modal-title' }, title), close);
  const body = el('div', { class: 'wt-form' });
  const values = {};
  let valid = false;
  const submit = el('button', { class: 'wt-modal-go' }, submitLabel);
  submit.disabled = true;
  const update = () => {
    valid = fields.every((f) => !f.required || String(values[f.name] || '').trim());
    submit.disabled = !valid;
  };
  for (const f of fields) {
    const wrap = el('label', { class: 'wt-field' }, el('span', { class: 'wt-field-label' }, f.label));
    let input;
    if (f.type === 'select') {
      input = el('select');
      input.append(el('option', { value: '' }, f.placeholder || 'Select…'));
      for (const o of f.options) input.append(el('option', { value: o.value }, o.label));
    } else if (f.type === 'textarea') {
      input = el('textarea', { rows: '3', placeholder: f.placeholder || '' });
    } else {
      input = el('input', { type: f.type || 'text', placeholder: f.placeholder || '' });
    }
    input.addEventListener('input', () => { values[f.name] = input.value; update(); });
    input.addEventListener('change', () => { values[f.name] = input.value; update(); });
    values[f.name] = '';
    wrap.append(input);
    body.append(wrap);
  }
  if (extra) body.append(extra);
  body.append(el('div', { class: 'wt-form-actions' }, submit));
  dlg.append(head, body);
  overlay.append(dlg);
  const { dialog, hide } = mountModal(overlay);
  close.addEventListener('click', (e) => { e.stopPropagation(); hide(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });
  submit.addEventListener('click', () => { if (!valid) return; onSubmit(values); hide(); });
  modalWidthStyle(dlg);
  try { dialog.showModal(); } catch { /* ignore */ }
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  dialog.addEventListener('close', () => { try { dialog.remove(); } catch { /* ignore */ } });
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function closeAllModals() {
  try {
    document.querySelectorAll('.wt-modal-overlay').forEach((x) => x.remove());
    document.querySelectorAll('.wt-page-dim').forEach((x) => x.remove());
    document.querySelectorAll('dialog.wt-modal-dialog').forEach((d) => { try { if (d.open) d.close(); } catch { /* ignore */ } d.remove(); });
    document.documentElement.classList.remove('wt-modal-open');
  } catch { /* ignore */ }
}
function restoreLabel(obj) {
  let t = obj && obj.title && obj.title !== 'Card' ? String(obj.title) : '';
  if (!t) t = String((obj && obj.key) || '').split('|').filter(Boolean).pop() || 'Item';
  return cleanName(t.split('·').pop().trim());
}
function openAddCardModal(sectionKey, classes, rerender) {
  const extra = el('div', { class: 'wt-up-restore' });
  const build = () => {
    extra.replaceChildren();
    const addGroup = (title, rows) => {
      if (!rows.length) return;
      extra.append(el('div', { class: 'wt-field-label' }, title));
      for (const r of rows) extra.append(r);
    };
    const rowFor = (label, onRestore, onForget) => {
      const row = el('div', { class: 'wt-restore-row' });
      const btn = el('button', { class: 'wt-restore-btn' }, 'Restore · ' + label);
      btn.addEventListener('click', (ev) => { ev.stopPropagation(); onRestore(); row.remove(); build(); });
      const x = el('button', { class: 'wt-restore-x', title: 'Forget' }, '×');
      x.addEventListener('click', (ev) => { ev.stopPropagation(); confirmAt(x, () => { onForget(); row.remove(); build(); }); });
      row.append(x, btn);
      return row;
    };
    const custom = (loadJSON(CUSTOM_DEL_KEY, {})[sectionKey] || []).filter((x) => !x.forgotten);
    addGroup('Deleted items', custom.map((d) => rowFor(restoreLabel(d),
      () => { const l = customCards(sectionKey); l.push(d); saveCustom(sectionKey, l); const all = loadJSON(CUSTOM_DEL_KEY, {}); all[sectionKey] = (all[sectionKey] || []).filter((x) => !(x.code === d.code && x.title === d.title)); saveJSON(CUSTOM_DEL_KEY, all); rerender(); snackbar('Restored: ' + d.title, () => { const l2 = customCards(sectionKey).filter((x) => !(x.code === d.code && x.title === d.title)); saveCustom(sectionKey, l2); const a2 = loadJSON(CUSTOM_DEL_KEY, {}); a2[sectionKey] = a2[sectionKey] || []; a2[sectionKey].push(d); saveJSON(CUSTOM_DEL_KEY, a2); build(); rerender(); }); },
      () => { const all = loadJSON(CUSTOM_DEL_KEY, {}); all[sectionKey] = (all[sectionKey] || []).map((y) => (y.code === d.code && y.title === d.title ? { ...y, forgotten: true } : y)); saveJSON(CUSTOM_DEL_KEY, all); rerender(); })));
    const deleted = (loadJSON('wesleyDeletedCards:v1', []) || []).filter((x) => x.section === sectionKey && !x.forgotten);
    addGroup('Deleted items', deleted.map((d) => rowFor(restoreLabel(d),
      () => { const l2 = loadJSON('wesleyDeletedCards:v1', []).filter((x) => !(x.key === d.key && x.section === sectionKey)); saveJSON('wesleyDeletedCards:v1', l2); rerender(); snackbar('Restored: ' + d.title, () => { const b = loadJSON('wesleyDeletedCards:v1', []); b.push(d); saveJSON('wesleyDeletedCards:v1', b); build(); rerender(); }); },
      () => { const b = loadJSON('wesleyDeletedCards:v1', []).map((y) => (y.key === d.key && y.section === sectionKey ? { ...y, forgotten: true } : y)); saveJSON('wesleyDeletedCards:v1', b); rerender(); })));
    const inf = (loadJSON('wesleyHiddenInfo:v1', {})[sectionKey] || []).filter((x) => !x.forgotten);
    addGroup('Deleted items', inf.map((h) => rowFor(restoreLabel(h),
      () => { const a2 = loadPrefs(); const p2 = sectionPrefs(a2, sectionKey); p2.hiddenCards = (p2.hiddenCards || []).filter((k) => k !== h.key); savePrefs(a2); const i2 = loadJSON('wesleyHiddenInfo:v1', {}); i2[sectionKey] = (i2[sectionKey] || []).filter((x) => x.key !== h.key); saveJSON('wesleyHiddenInfo:v1', i2); rerender(); },
      () => { const i2 = loadJSON('wesleyHiddenInfo:v1', {}); i2[sectionKey] = (i2[sectionKey] || []).map((y) => (y.key === h.key ? { ...y, forgotten: true } : y)); saveJSON('wesleyHiddenInfo:v1', i2); rerender(); })));
  };
  build();
  window.__wtRefreshRestore = build;
  openFormModal({
    title: 'Add card',
    fields: [
      { name: 'code', type: 'select', label: 'Course', required: true, placeholder: 'Select a course…', options: classes.map((c) => ({ value: c.code, label: displayName(c) })) },
      { name: 'title', type: 'text', label: 'Title', required: true, placeholder: 'What is it?' },
      { name: 'detail', type: 'textarea', label: 'Details', placeholder: 'Anything else…' },
    ],
    submitLabel: 'Add card',
    extra,
    onSubmit: (v) => {
      const list = customCards(sectionKey);
      list.push({ code: v.code, title: v.title.trim(), detail: v.detail.trim() });
      saveCustom(sectionKey, list);
      rerender();
    },
  });
}

/* 手动设截止时间：Due 卡的模态里点「Set due」展开一个小弹层，
   日期 + 时间两个原生输入框（时间默认下午 4 点），存进 wesleyDueSet:v1。
   存的是本地时间字符串 'YYYY-MM-DDTHH:MM'，跨时区不会漂。 */
function refreshDueBadge(key) {
  const k = String(key || '');
  const card = [...document.querySelectorAll('.wt-due-card[data-wt-due-key]')].find((n) => n.dataset.wtDueKey === k);
  if (!card) return;
  const manual = dueSetAt(k);
  const nat = card.dataset.wtDueNatural ? new Date(card.dataset.wtDueNatural) : null;
  const at = manual || (nat && !isNaN(nat.getTime()) ? nat : null);
  const left = at ? daysUntil(at) : null;
  let span = card.querySelector('.wt-due-days');
  if (at && left != null && left >= 0) {
    if (!span) { span = el('span', { class: 'wt-due-days', 'data-role': 'due-days' }); const cls = card.querySelector('.wt-cls'); if (cls) cls.append(span); else card.prepend(span); }
    span.className = 'wt-due-days' + (left <= 7 ? ' soon' : '');
    span.textContent = left === 0 ? 'today' : L.inDays(left);
    span.title = dueSetLabel(at);
  } else if (span) {
    span.remove();
  }
}

function dueSetBlock(key, cls, naturalAt) {
  const wrap = el('div', { class: 'wt-dueset' });
  const row = el('div', { class: 'wt-dueset-row' });
  const val = el('span', { class: 'wt-dueset-date' });
  const btn = el('button', { class: 'wt-dueset-btn', type: 'button' });
  const pop = el('div', { class: 'wt-dueset-pop' });
  pop.hidden = true;
  const dateIn = el('input', { class: 'wt-dueset-input', type: 'date', 'aria-label': 'Due date' });
  const timeIn = el('input', { class: 'wt-dueset-input wt-dueset-time', type: 'time', step: '60', 'aria-label': 'Due time' });
  const okBtn = el('button', { class: 'wt-dueset-ok', type: 'button' }, 'Save');
  const clrBtn = el('button', { class: 'wt-dueset-clear', type: 'button' }, 'Clear');
  const cancelBtn = el('button', { class: 'wt-dueset-cancel', type: 'button' }, 'Cancel');
  row.append(el('span', { class: 'wt-dueset-cap' }, 'Due'), val, btn);
  pop.append(el('div', { class: 'wt-dueset-inputs' }, dateIn, timeIn), el('div', { class: 'wt-dueset-actions' }, okBtn, clrBtn, cancelBtn));
  wrap.append(row, pop);

  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const natural = naturalAt instanceof Date && !isNaN(naturalAt.getTime()) ? naturalAt : null;
  const draw = () => {
    const at = dueSetAt(key);
    val.textContent = at ? dueSetLabel(at) : (natural ? dueSetLabel(natural) + ' (from the post)' : 'not set');
    val.classList.toggle('is-empty', !at);
    btn.textContent = at ? 'Change' : 'Set due';
  };
  const prefill = () => {
    const at = dueSetAt(key);
    /* 默认给「下一个工作日 16:00」。nextSchoolDay 是 main() 里的内部函数，这里够不着，自己算。 */
    const base = at || (() => {
      const d = new Date();
      d.setHours(16, 0, 0, 0);
      do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
      return d;
    })();
    dateIn.value = isoOf(base);
    timeIn.value = pad(base.getHours()) + ':' + pad(base.getMinutes());
  };
  const closePop = () => { pop.hidden = true; };
  const commit = (iso) => {
    const map = loadDueSet();
    if (iso) map[key] = iso; else delete map[key];
    saveDueSet(map);
    closePop();
    draw();
    refreshDueBadge(key);
  };

  /* 弹层用 fixed 定位：模态本身是 overflow:auto 的，绝对定位的弹层一旦伸出模态
     边界就会被裁掉。fixed 只受视口约束，再按按钮位置夹一次上下左右，不会被切。 */
  const place = () => {
    const b = btn.getBoundingClientRect();
    const pw = pop.offsetWidth || 280;
    const ph = pop.offsetHeight || 120;
    /* 一律朝上弹（Set due 在模态底部，朝下会盖住按钮和下面的内容）；
       真到了顶上放不下，才退回按钮下面 */
    let top = b.top - 8 - ph;
    if (top < 10) top = Math.min(window.innerHeight - ph - 10, b.bottom + 8);
    let left = Math.min(b.right - pw, window.innerWidth - pw - 12);
    left = Math.max(12, left);
    pop.style.position = 'fixed';
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
    pop.style.right = 'auto';
    pop.style.bottom = 'auto';
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (pop.hidden) { prefill(); pop.hidden = false; place(); }
    else closePop();
  });
  okBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!dateIn.value) return;
    commit(dateIn.value + 'T' + (timeIn.value || '16:00'));
  });
  clrBtn.addEventListener('click', (e) => { e.stopPropagation(); commit(null); });
  cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); closePop(); });
  pop.addEventListener('click', (e) => e.stopPropagation());
  wrap.addEventListener('click', (e) => e.stopPropagation());
  /* 弹层是 fixed 的，模态一滚就会和按钮错位，干脆收起 */
  (wrap.closest('.wt-modal') || document.body).addEventListener('scroll', closePop, { passive: true });
  window.addEventListener('resize', closePop);
  draw();
  return wrap;
}

function openModal(opts) {
  closeAllModals();
  const state = {
    cls: opts.cls || null,
    items: (opts.items && opts.items.length ? opts.items : []).map((it) => ({ title: it.title || '', detail: it.detail || '', links: it.links || (opts.cls ? itemLinks(opts.cls, it) : []), due: it.due || '' })),
    idx: Math.max(0, opts.index || 0),
  };
  if (!state.items.length && state.cls) state.items = normItems(state.cls).map((it) => ({ title: it.title, detail: it.detail || '', links: itemLinks(state.cls, it), due: it.due || '' }));
  if (!state.items.length && state.cls && state.cls.latestPost && (state.cls.latestPost.title || state.cls.latestPost.text)) {
    state.items = [{ title: state.cls.latestPost.title || 'Latest post', detail: String(state.cls.latestPost.text || '').slice(0, 400), links: state.cls.latestPost.links || [], due: '' }];
  }
  const overlay = el('div', { class: 'wt-modal-overlay' });
  const dlg = el('div', { class: 'wt-modal' });
  modalWidthStyle(dlg);
  const left = el('button', { class: 'wt-modal-nav left', 'aria-label': 'Previous' });
  const right = el('button', { class: 'wt-modal-nav right', 'aria-label': 'Next' });
  const close = el('button', { class: 'wt-modal-x', 'aria-label': 'Close' }, iconImg('close', 12));
  const menu = el('div', { class: 'wt-modal-menu' });
  menu.hidden = true;
  const courseList = (AVAIL_CLASSES && AVAIL_CLASSES.length ? AVAIL_CLASSES : SNAP) || [];
  for (const c of courseList) {
    menu.append(el('button', { class: 'wt-modal-course', onclick: (e) => { e.stopPropagation(); state.cls = c; state.items = normItems(c).map((it) => ({ title: it.title, detail: it.detail || '', links: itemLinks(c, it), due: it.due || '' })); if (!state.items.length) state.items = [{ title: c.name, detail: '', links: [], due: '' }]; state.idx = 0; menu.hidden = true; if (caret) caret.classList.remove('open'); render(); swapIn(1); } }, displayName(c)));
  }
  overlay.append(left, menu, dlg, right);
  let caret = null;
  const render = () => {
    const item = state.items[state.idx] || {};
    const cls = state.cls;
    const meta = el('div', { class: 'wt-modal-meta' },
      el('span', { class: 'wt-dot', style: `background:${(cls && cls.color) || '#64346f'}` }),
      cls ? el('a', { class: 'wt-modal-cls', href: cls.homepage || '#', target: '_blank', rel: 'noreferrer' }, cardLabel(cls)) : null,
    );
    caret = el('button', { class: 'wt-modal-caret' + (menu.hidden ? '' : ' open'), 'aria-label': 'Choose course' });
    caret.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>';
    let menuTimer = null;
    caret.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!menu.hidden) {
        menu.classList.remove('show');
        caret.classList.remove('open');
        clearTimeout(menuTimer);
        menuTimer = setTimeout(() => { menu.hidden = true; }, animMs(170));
        return;
      }
      const r = caret.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(window.innerWidth - 280, r.left)) + 'px';
      menu.style.top = (r.bottom + 4) + 'px';
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('show'));
      caret.classList.add('open');
    });
    meta.append(caret);
    if (cls && postTimeOf(cls)) meta.append(el('span', { class: 'wt-modal-time' }, postTimeOf(cls)));
    const gear = el('button', { class: 'wt-modal-gear', title: 'Modal settings' }, '⚙');
    const head = el('div', { class: 'wt-modal-head' }, meta, gear, close);
    const sp = el('div', { class: 'wt-modal-settings', hidden: true });
    const mkRow = (label, key, min, max, val, unit) => {
      const row = el('label', { class: 'wt-ms-row' }, el('span', null, label), el('input', { type: 'range', min: String(min), max: String(max), value: String(val) }));
      const out = el('span', { class: 'wt-ms-val' }, String(val) + (unit || ''));
      row.append(out);
      row.querySelector('input').addEventListener('input', (ev) => {
        const v = Number(ev.target.value); out.textContent = v + (unit || '');
        const obj = {}; obj[key] = v;
        try { chrome.storage.local.set(obj); } catch { /* ignore */ }
        settings[key] = v;
        if (key === 'modalWidth') dlg.style.width = Math.min(window.innerWidth - 32, v) + 'px';
        if (key === 'modalUiPct') dlg.style.setProperty('--wt-modal-ui', String(v / 100));
        const sum = document.querySelector('.wt-summary');
        if (sum) { if (key === 'linkScalePct') sum.style.setProperty('--wt-link-scale', String((v / 100) * 0.8)); if (key === 'titleScalePct') sum.style.setProperty('--wt-title-scale', String((v / 100) * 0.8)); if (key === 'detailScalePct') sum.style.setProperty('--wt-detail-scale', String((v / 100) * 0.8)); }
      });
      return row;
    };
    sp.append(el('div', { class: 'wt-ms-title' }, 'Modal settings'), mkRow('Width', 'modalWidth', 400, 900, Number(settings.modalWidth) || 520, 'px'), mkRow('UI size', 'modalUiPct', 80, 130, Number(settings.modalUiPct) || 100, '%'), mkRow('Card link', 'linkScalePct', 50, 200, Number(settings.linkScalePct) || 100, '%'), mkRow('Card title', 'titleScalePct', 50, 200, Number(settings.titleScalePct) || 100, '%'), mkRow('Card detail', 'detailScalePct', 50, 200, Number(settings.detailScalePct) || 100, '%'));
    gear.addEventListener('click', (e) => { e.stopPropagation(); sp.hidden = !sp.hidden; });
    const sub = item.title || '';
    /* Due 条目的正文是整段英文/中文，别过 formatDetail —— 那套是给课表文本做启发式断行的，
       会把 "Assessment"、"Topic" 这种词从中间切开。 */
    const detail = opts.fromDue
      ? String(item.detail || '').trim()
      : (formatDetail(state.cls ? itemTodayDetail(state.cls, item) : todaySlice(item.detail || '')) || (state.cls ? formatDetail(classTodayDetail(state.cls)) : ''));
    /* 附件（fetch.php）下面会用文件卡片单独画一遍，这里再列成文字链接就重复了 */
    const links = (item.links || []).filter((l) => !/assessments/i.test(l.href || '') && !/fetch\.php/i.test(l.href || ''));
    const parts = [head, sp, sub ? el('div', { class: 'wt-modal-sub' }, sub) : null, detail ? el('div', { class: 'wt-modal-detail' }, detail) : null];
    if (links.length) parts.push(el('div', { class: 'wt-modal-links' }, ...links.map((l) => el('a', { href: l.href, target: '_blank', rel: 'noreferrer', title: l.label }, l.label || 'link'))));
    let actionsNode = null;
    if (cls && cls.homepage) {
      const text = (item.title || '') + ' ' + (item.detail || '');
      const kind = /exam/i.test(text) ? 'exam' : /test/i.test(text) ? 'test' : 'assessment';
      const assess = (item.links || []).find((l) => /assessments/i.test(l.href || ''));
      const postId = postIdOf(cls);
      /* 只有这一条自己带 /news/<id> 链接时才算「有对应的 post」。
         以前只要班里存在任何一条公告就把按钮点上，点进去经常是完全无关的帖子。 */
      const postLink = (item.links || []).find((l) => /\/news\/\d+/.test((l && l.href) || ''));
      const postHref = postLink ? postLink.href : '';
      actionsNode = el('div', { class: 'wt-modal-actions' },
        assess ? el('a', { class: 'wt-modal-go', href: assess.href, target: '_blank', rel: 'noreferrer' }, 'Check ' + kind + ' info') : null,
        postHref ? el('a', { class: 'wt-modal-go', href: fixUrl(postHref), target: '_blank', rel: 'noreferrer' }, 'Go to full post') : null,
        el('a', { class: 'wt-modal-go', href: fixUrl(cls.homepage) + (postId ? '?wesley_post=' + postId : ''), target: '_blank', rel: 'noreferrer' }, 'Go to class page'),
      );
      parts.push(actionsNode);
    }
    /* 附件：以前只有作业模态显示两列文字链接，公告模态一个文件都不露。
       先把手上已有的（正文里的 fetch.php 链接、缓存过的作业附件）画出来，
       再让 scrapePostFiles 去公告页把文件卡片补全 —— 抓不到就保持原样，不留空盒子。 */
    const filesSlot = el('div', { class: 'wt-files-slot' });
    const knownFiles = dedupeFiles([...toFileEntries(item.files || []), ...filesFromLinks(item.links || [])]);
    const pre = renderFiles(knownFiles);
    if (pre) filesSlot.append(pre);
    const at = actionsNode ? parts.indexOf(actionsNode) : parts.length;
    parts.splice(at < 0 ? parts.length : at, 0, filesSlot);
    if (opts.fromDue && opts.dueKey) {
      const at2 = actionsNode ? parts.indexOf(actionsNode) : parts.length;
      parts.splice(at2 < 0 ? parts.length : at2, 0, dueSetBlock(opts.dueKey, cls, opts.dueNatural));
    }
    dlg.replaceChildren(...parts.filter(Boolean));
    /* 公告页的文件要另抓一次（列表接口只给正文里的链接，卡片式附件在 /news/<id> 上）。
       已经在 fetch 缓存里的会立刻返回，所以这一步通常没有网络等待。 */
    if (cls && !opts.fromDue) {
      const pid = postIdOf(cls);
      if (pid) {
        scrapePostFiles(cls.latestPost || { id: pid }).then((more) => {
          const all = dedupeFiles([...knownFiles, ...more]);
          const box2 = renderFiles(all);
          if (box2) filesSlot.replaceChildren(box2);
          else if (!filesSlot.childElementCount) filesSlot.remove();
        }).catch(() => { if (!filesSlot.childElementCount) filesSlot.remove(); });
      } else if (!filesSlot.childElementCount) filesSlot.remove();
    } else if (!opts.fromDue && !filesSlot.childElementCount) filesSlot.remove();
    if (opts.fromDue && !detail) {
      const assess = (item.links || []).find((l) => /assessments/i.test(l.href || ''));
      if (assess) {
        const holder = el('div', { class: 'wt-modal-detail wt-modal-detail-loading' }, 'Reading assessment…');
        /* 有 Set due 那一行时插到它上面，否则这段话会跑到「设置截止时间」下面去 */
        const anchorNode = dlg.querySelector('.wt-dueset') || parts.find((n) => n && n.classList && n.classList.contains('wt-modal-actions')) || null;
        if (anchorNode) dlg.insertBefore(holder, anchorNode); else dlg.append(holder);
        fetchAssessmentText(assess.href, item.title).then((text) => {
          holder.classList.remove('wt-modal-detail-loading');
          /* 附件：没正文的作业往往只有附件，抓完补到模态里 */
          const gotFiles = ASSESS_FILES.get(assess.href) || [];
          if (gotFiles.length) {
            item.files = gotFiles;
            const box = renderFiles(toFileEntries(gotFiles));
            if (box) {
              filesSlot.replaceChildren(box);
              if (!filesSlot.parentNode) {
                const anchor2 = dlg.querySelector('.wt-modal-actions');
                if (anchor2) dlg.insertBefore(filesSlot, anchor2); else dlg.append(filesSlot);
              }
            }
          }
          if (!text) { holder.textContent = gotFiles.length ? 'No description, see the files below.' : 'No description on this assessment.'; return; }
          updateAssessCards(assess.href, text);
          // 这里是整段英文/中文正文，不能过 formatDetail —— 那套是按课表文本做的启发式断行，
          // 会把 "Assessment"、"Topic"、"Task" 这些词中间硬切开。
          holder.textContent = text;
        });
      }
    }
    left.style.display = state.items.length > 1 && state.idx > 0 ? '' : 'none';
    right.style.display = state.items.length > 1 && state.idx < state.items.length - 1 ? '' : 'none';
  };
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const swapIn = (dir) => {
    if (settings.animations === false || reduceMotion) return;
    try { dlg.animate([{ opacity: .55, transform: 'translateX(' + (dir * 10) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: animMs(180), easing: 'cubic-bezier(.23,1,.32,1)' }); } catch { /* ignore */ }
  };
  left.addEventListener('click', (e) => { e.stopPropagation(); if (state.idx > 0) { state.idx -= 1; menu.hidden = true; if (caret) caret.classList.remove('open'); render(); swapIn(-1); } });
  right.addEventListener('click', (e) => { e.stopPropagation(); if (state.idx < state.items.length - 1) { state.idx += 1; menu.hidden = true; if (caret) caret.classList.remove('open'); render(); swapIn(1); } });
  close.addEventListener('click', (e) => { e.stopPropagation(); hide(); });
  const { dialog, hide } = mountModal(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });
  document.addEventListener('click', () => { menu.hidden = true; if (caret) caret.classList.remove('open'); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { hide(); document.removeEventListener('keydown', esc); } });
  try { dialog.showModal(); } catch { /* ignore */ }
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  dialog.addEventListener('close', () => { try { dialog.remove(); } catch { /* ignore */ } });
  render();
  requestAnimationFrame(() => overlay.classList.add('show'));
  (async () => {
    try {
      if (opts.fromDue) return;
      if (!opts.cls) return;
      if (opts.cls.latestPost && opts.cls.latestPost.text && opts.cls.latestPost.text.length > 80) {
        const detailEl0 = dlg.querySelector('.wt-modal-detail');
        const sliced = dayPartOf(opts.cls.latestPost.text, opts.cls.latestPost).text;
        const full0 = formatDetail(sliced);
        wtLog('modal latestPost len=' + full0.length);
        if (detailEl0 && full0.length >= 40) detailEl0.textContent = full0;
        if (full0.length > 40) return;
      }
      if (!opts.cls.homepage) return;
      const url = fixUrl(opts.cls.homepage);
      const doc = await renderFetch(url, 2500);
      if (!doc) { wtLog('modal renderFetch null'); return; }
      wtLog('modal page ' + ['article','.post','.news-item','.feed-item','.content','main','.panel'].map((sel) => sel + '=' + doc.querySelectorAll(sel).length).join(','));
      const clean = (t) => t.split('\n').map((l) => l.trim()).filter((l) => l && !/^Posted by/i.test(l) && !/^(\d+\s+)?(month|months|week|weeks|day|days|year|years)\s+ago$/i.test(l) && !/^×$/i.test(l) && !/^Uploading\.\.\.$/i.test(l)).join('\n').trim();
      const posts = [...doc.querySelectorAll('article, .post, .news-item, .feed-item, .announcement, .news-article, li.news')].filter((n) => !/\bhide\b/.test(n.className) && n.offsetParent !== null).map((n) => ({ text: clean(n.innerText || ''), time: (n.querySelector('time[datetime]') && n.querySelector('time[datetime]').getAttribute('datetime')) || '' })).filter((x) => x.text.length > 40).sort((a, b) => String(b.time).localeCompare(String(a.time)));
      const wanted = String((state.items[state.idx] && state.items[state.idx].title) || '').slice(0, 24);
      const hit = (wanted && posts.find((x) => x.text.includes(wanted))) || posts[0] || null;
      if (hit) {
        const detailEl = dlg.querySelector('.wt-modal-detail');
        const full = formatDetail(hit.text || hit);
        wtLog('modal full post len=' + full.length);
        if (detailEl) detailEl.textContent = full;
      }
    } catch (e) { wtLog('modal fetch failed: ' + String(e && e.message ? e.message : e)); }
  })();
  return overlay;
}

/* ---------------- today panel ---------------- */
let LAST_CLASS_COUNT = 0;
/* v2：v1 缓存里的课名带着「教室 + 老师」（整格文本减括号的后果），换键直接作废 */
const SUBJ_KEY = 'wesleySubjects:v2';
const SUBJ_TTL = 24 * 3600 * 1000;

async function fetchAllSubjects() {
  if (ALL_SUBJECTS) return ALL_SUBJECTS;
  try {
    const raw = localStorage.getItem(SUBJ_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && Array.isArray(c.list) && c.list.length && Date.now() - (c.at || 0) < SUBJ_TTL) {
        ALL_SUBJECTS = c.list.map((x) => {
          const name = String((x && x.name) || '').replace(/\s+[A-Z]{1,3}\d{1,4}[A-Za-z]?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*$/, '').trim();
          return name && name !== x.name ? Object.assign({}, x, { name }) : x;
        });
        return ALL_SUBJECTS;
      }
    }
  } catch { /* ignore */ }
  try {
    const res = await fetch('/timetable', { credentials: 'same-origin' });
    if (!res.ok) return (ALL_SUBJECTS = []);
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const out = [];
    for (const cell of doc.querySelectorAll('.timetable-subject')) {
      /* 一格长这样：<a>Year 10 Science</a> <div>(G/M10SCI0-YA7)<br> C203 Ms Kirsten Paton</div>
         课名只取 <a> 里的字，教师和教室在 <div> 的第二行 —— 以前用整格文本减掉括号，
         结果课名变成「Year 10 Science C203 Ms Kirsten Paton」，一进下拉框就露出来。 */
      const a = cell.querySelector('a[href*="/homepage/"]');
      const div = cell.querySelector('div');
      const divText = (div ? div.textContent : cell.textContent || '').replace(/\s+/g, ' ').trim();
      const m = /\(([^)]+)\)/.exec(divText);
      const code = m ? m[1].replace(/^G\//, '').replace(/\s+/g, '').trim() : '';
      const tail = m ? divText.slice(divText.indexOf(m[0]) + m[0].length).trim() : '';
      const rm = /^([A-Z]{0,3}\d{1,4}[A-Za-z]?)\b\s*(.*)$/.exec(tail);
      const room = rm ? rm[1] : '';
      const teacher = (rm ? rm[2] : tail).replace(/\s+/g, ' ').trim();
      const name = ((a && a.textContent) || '').replace(/\s+/g, ' ').trim();
      /* 没有 /homepage/ 链接的格子是集会、年级大会这种占位（N12ASB0-YM2），不是课 */
      if (!a || !name) continue;
      if (out.some((x) => (code && x.code === code) || (!code && x.name === name))) continue;
      out.push({ name, code, room, teacher, homepage: new URL(a.getAttribute('href'), location.origin).href, color: '' });
    }
    ALL_SUBJECTS = out;
    try { localStorage.setItem(SUBJ_KEY, JSON.stringify({ at: Date.now(), list: out })); } catch { /* ignore */ }
    wtLog('subjects from /timetable: ' + out.length);
    return out;
  } catch { return (ALL_SUBJECTS = []); }
}

function classList(periods) {
  const seen = new Set();
  const out = [];
  const path = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
  for (const p of periods) {
    const pcode = String(p.code || '').trim();
    // 站点的排课解析偶尔会把课名当成 code 塞进来（"10 Lang Acquisition: English 3"），
    // 这类假代码留着就会多出一门重复的课，直接丢掉，交给真正的代码条目去匹配。
    if (!pcode || /[:\s]/.test(pcode)) continue;
    const key = pcode.toLowerCase();
    if (seen.has(key)) continue;
    // 1) 按代码找 2) 按 homepage 路径找 3) 按名称找 4) 现场造一个（保证不缺课）
    let cls = classForCode(pcode);
    if (!cls && p.href) cls = (SNAP || []).find((c) => c.homepage && path(c.homepage) === path(p.href));
    if (!cls) cls = (SNAP || []).find((c) => String(c.name || '').toLowerCase() === String(p.subject || '').toLowerCase());
    if (!cls) cls = { code: pcode, name: p.subject || pcode, color: p.color || '', room: p.room || '', homepage: p.href ? new URL(p.href, location.origin).href : '', latestPost: null };
    // SNAP 里有的条目把课名塞进了 code 字段（"10 Lang Acquisition: English 3"），
    // 它会让 keyOf 认错、标签栏多出一门课，这里用排课代码重建一份干净的
    if (cls && /[:\s]/.test(String(cls.code || '').trim())) {
      cls = { code: pcode, name: p.subject || cls.name || pcode, color: cls.color || p.color || '', room: p.room || cls.room || '', homepage: cls.homepage || (p.href ? new URL(p.href, location.origin).href : ''), latestPost: cls.latestPost || null };
    }
    if (!cls || /tutor group/i.test(cls.name || '')) continue;
    seen.add(key);
    out.push(cls);
  }
  // 旧兜底：当年 P4 映射不到就硬塞一个 SNAP 条目，结果多出一门重名的课。
  // 现在 classForCode 会按规范化代码匹配（O/0、L/1 归并），只有真缺时才补，而且必须带代码。
  const lae = (SNAP || []).find((c) => /lang acquisition: english/i.test(c.name) && /^[A-Za-z0-9/_.-]+$/.test(String(c.code || '').trim()));
  // （这条兜底若拿到的是"课名当 code"的假条目，就会凭空多出一门课，所以要求代码形状合法）
  const normOf = (c) => normCode(String(c.code || c.name || ''));
  if (lae && !out.some((c) => normOf(c) === normOf(lae))) out.push(lae);
  // 站点 SNAP 里同一门课有时会有一份没有 code 的重复条目（例如 10 Lang Acquisition: English 3），
  // 它会被当成独立科目塞进标签栏，看着就是多了一门莫名其妙的课。这里按名字词重合度把纯重复项去掉。
  const toks = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((w) => w && !/^(year|the|and|of|to|a|unit|group|tutor|\d+)$/.test(w));
  const coded = out.filter((c) => String(c.code || '').trim());
  const cleaned = out.filter((c) => {
    if (String(c.code || '').trim()) return true;
    const t = toks(c.name);
    if (!t.length) return false;
    const dup = coded.some((k) => {
      const kt = toks(k.name);
      if (!kt.length) return false;
      const hit = t.filter((w) => kt.indexOf(w) !== -1).length;
      return hit / t.length >= 0.6;
    });
    return !dup;
  });
  LAST_CLASS_COUNT = cleaned.length;
  return cleaned;
}
function parseUpcoming() {
  const out = [];
  let target = null;
  for (const h of document.querySelectorAll('h2, h3')) {
    if (/Upcoming Learning Activities/i.test(h.textContent || '')) {
      const parent = h.closest('.component-container') || h.parentElement;
      target = parent ? parent.querySelector('ul.information-list') : null;
      if (!target) {
        let sib = h.nextElementSibling;
        while (sib && !target) { if (sib.querySelector) target = sib.querySelector('ul.information-list'); sib = sib.nextElementSibling; }
      }
      break;
    }
  }
  if (!target) target = [...document.querySelectorAll('ul.information-list')].find((u) => u.querySelector('time[datetime]'));
  if (!target) return out;
  for (const li of target.querySelectorAll('li')) {
    const titleA = li.querySelector('h3 a.title') || li.querySelector('h3 a');
    if (!titleA) continue;
    const metas = [...li.querySelectorAll('p.meta')];
    const first = metas[0];
    const links = first ? [...first.querySelectorAll('a')] : [];
    const timeEl = li.querySelector('time[datetime]');
    out.push({
      title: titleA.innerText.trim(),
      subject: links[0] ? links[0].innerText.trim() : '',
      topic: links[1] ? links[1].innerText.trim() : '',
      type: first ? (first.innerText || '').split('|').pop().trim() : '',
      due: timeEl ? timeEl.getAttribute('datetime') : '',
    });
  }
  return out;
}
function isExamItem(u) {
  return /examination/i.test(u.type) || /\bexam\b/i.test(u.title) || /end-of-year|end of year|eoy/i.test(u.title);
}
/* 今天到期的条目按小时说（"in 6 hours"），比一个笼统的 today 有用得多。 */
function hoursLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const mins = Math.round((d - Date.now()) / 60000);
  if (mins < 0) return null;
  if (mins < 60) return L.inMins(Math.max(1, mins));
  return L.inHours(Math.round(mins / 60));
}
function daysLeft(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86400000);
}
function upcomingFor(cls, upcoming) {
  const codes = codeList(cls);
  return upcoming.filter((u) => codes.some((code) => (u.subject || '').toLowerCase().includes(code)));
}
function dueCacheKey() {
  const d = new Date();
  return 'wesleyDueWork:' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function fetchDueWork() {
  try {
    const c = JSON.parse(localStorage.getItem(dueCacheKey()) || 'null');
    if (c && Array.isArray(c.items)) return Promise.resolve(c.items);
  } catch { /* ignore */ }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (items) => { if (settled) return; settled = true; try { frame.remove(); } catch { /* ignore */ } resolve(items); };
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:1280px;height:1600px;border:0;visibility:hidden;';
    frame.src = '/learning/due';
    frame.addEventListener('load', () => {
      setTimeout(() => {
        try {
          const items = parseDueDoc(frame.contentDocument);
          try { localStorage.setItem(dueCacheKey(), JSON.stringify({ at: Date.now(), items })); } catch { /* ignore */ }
          finish(items);
        } catch { finish([]); }
      }, 2500);
    });
    setTimeout(() => finish([]), 9000);
    document.body.appendChild(frame);
  });
}
function parseDueDoc(doc) {
  const out = [];
  try {
    for (const li of doc.querySelectorAll('li')) {
      const a = li.querySelector('a[href*="/learning/assessments"]');
      if (!a) continue;
      const title = (a.innerText || '').trim();
      if (!title) continue;
      const clsA = li.querySelector('a[href*="/homepage/"]');
      const clsText = clsA ? (clsA.innerText || '').trim() : '';
      const codeM = /\(([^)]+)\)/.exec(clsText);
      const timeEl = li.querySelector('time[datetime]');
      const txt = (li.innerText || '').replace(/\s+/g, ' ');
      const after = clsText ? txt.split(clsText)[1] || '' : '';
      out.push({ title, href: a.getAttribute('href') || '', code: codeM ? codeM[1] : '', clsText, type: after.split(/Due|$/)[0].trim(), due: timeEl ? timeEl.getAttribute('datetime') : '' });
    }
  } catch { /* ignore */ }
  return out;
}
function dueFor(classes, dueWork) {
  const out = [];
  const seen = new Set();
  for (const u of dueWork) {
    const cls = classes.find((c) => codeList(c).some((code) => (u.code || '').toLowerCase().includes(code))) || null;
    if (!cls) continue;
    let days = null;
    if (u.due) {
      const dd = new Date(String(u.due).slice(0, 10) + 'T00:00:00');
      if (!Number.isNaN(dd.getTime())) { const aa = new Date(); aa.setHours(0, 0, 0, 0); days = Math.round((dd - aa) / 86400000); }
    }
    if (days != null && days < 0) continue;
    const key = 'dw|' + (u.title || '') + '|' + (u.due || '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, cls, title: u.title, meta: u.type || 'Assessment', kind: 'assessment', due: u.due || '', links: u.href ? [{ href: u.href, label: 'Assessment' }] : [], days, detail: '' });
  }
  for (const cls of classes) {
    for (const item of normItems(cls)) {
      const looksDue = /homework|due|submit|worksheet|revision|assessment|assignment|poster|task/i.test(item.title + ' ' + String(item.detail || ''));
      if (item.kind === 'classwork') continue;
      if (item.kind === 'resource' && !looksDue) continue;
      if (!['homework', 'exam'].includes(item.kind) && !looksDue) continue;
      if (/lesson outline|week\s*\d+\s*outline/i.test(item.title)) continue;
      if (/^(term|week)\s*\d+.*week\s*\d+/i.test(item.title.trim()) && item.kind !== 'homework') continue;
      const due = item.due ? fixDue(item.due) : '';
      const days = due ? remainingDays(due) : null;
      if (days != null && days < 0) continue;
      const key = 'post|' + cls.code + '|' + item.title + '|' + due;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, cls, title: item.title, meta: KIND[item.kind] || 'Other', links: itemLinks(cls, item), days, detail: item.detail || '' });
    }
  }
  out.sort((a, b) => (a.days == null ? 999 : a.days) - (b.days == null ? 999 : b.days));
  return out;
}

/* ---------------- cards / grids ---------------- */
const EDIT = { tdt: false, due: false };
const DELMODE = { tdt: false, due: false };
function taskKey(c) { return 't|' + c.cls.code + '|' + postIdOf(c.cls) + '|' + c.item.title; }
function dueItemKey(d) { return 'd|' + d.key; }

function taskCard(card) {
  const { cls, item } = card;
  const color = cls.color || 'rgb(79,39,89)';
  const links = itemLinks(cls, item);
  /* 卡片自己带 due 字段就用它；没有的话看正文里有没有 "Due: …"（老师的作业帖常这么写） */
  const dueBadge = (() => {
    let left = null;
    let at = null;
    if (item.due) { at = fixDue(item.due) ? new Date(fixDue(item.due)) : null; left = remainingDays(fixDue(item.due)); }
    if (left == null) {
      const lp = cls.latestPost || null;
      const found = dueDateInText([item.detail, lp && lp.text].filter(Boolean).join('\n'), postDateOf(lp));
      if (found) { at = found; left = daysUntil(found); }
    }
    if (left == null || left < 0) return null;
    const label = left === 0 ? 'today' : L.inDays(left);
    return el('span', { class: 'wt-due-days' + (left <= 7 ? ' soon' : ''), title: at ? at.toDateString() : '' }, label);
  })();
  const node = el('div', { class: 'wt-task', style: `--wt-color:${color};--wt-ink:${darken(color, 0.45)}`, role: 'button', tabindex: '0' },
    el('div', { class: 'wt-cls' }, el('span', { class: 'wt-dot' }), el('a', { href: cls.homepage || '#', target: '_blank', rel: 'noreferrer', onclick: (e) => e.stopPropagation() }, cardLabel(cls)), dueBadge),
    el('div', { class: 'wt-title' }, item.title),
    item.detail ? el('div', { class: 'wt-detail' }, item.detail) : null,
    item.due ? el('div', { class: 'wt-due' }, (() => { const d = remainingDays(fixDue(item.due)); return d == null ? 'Due' : L.inDays(d); })()) : null,
    links.filter((l) => !/assessments/i.test(l.href || '')).length ? el('div', { class: 'wt-links' }, ...links.filter((l) => !/assessments/i.test(l.href || '')).map((l) => el('a', { href: l.href, target: '_blank', rel: 'noreferrer', onclick: (e) => e.stopPropagation() }, l.label))) : null,
  );
  node.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const allItems = normItems(cls);
    const idx = allItems.findIndex((x) => x.title === item.title);
    openModal({ cls, items: allItems, index: idx < 0 ? 0 : idx });
  });
  node.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); node.click(); } });
  return node;
}

function customCard(card, sectionKey, rerender) {
  const { cls, item } = card;
  const color = cls.color || 'rgb(79,39,89)';
  const node = el('div', { class: 'wt-task wt-custom-card', style: `--wt-color:${color};--wt-ink:${darken(color, 0.45)}` },
    el('div', { class: 'wt-cls' }, el('span', { class: 'wt-dot' }), el('a', { href: cls.homepage || '#', target: '_blank', rel: 'noreferrer', onclick: (e) => e.stopPropagation() }, cardLabel(cls))),
    el('div', { class: 'wt-title' }, item.title),
    item.detail ? el('div', { class: 'wt-detail' }, item.detail) : null,
  );
  node.addEventListener('click', (e) => { if (e.target.closest('a') || e.target.closest('.wt-custom-del')) return; openModal({ cls, own: true, items: [{ title: item.title, detail: item.detail, links: [] }], index: 0 }); });
  if (EDIT[sectionKey] || DELMODE[sectionKey]) {
    const wrapDel = el('span', { class: 'wt-custom-delwrap' });
    const del = el('button', { class: 'wt-custom-del', title: 'Remove card' }, iconImg('close', 15));
    wrapDel.append(del);
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmAt(del, () => {
        const list = customCards(sectionKey).filter((x) => !(x.code === cls.code && x.title === item.title));
        saveCustom(sectionKey, list);
        const delList = loadJSON(CUSTOM_DEL_KEY, {});
        delList[sectionKey] = delList[sectionKey] || [];
        delList[sectionKey].push({ code: cls.code, title: item.title, detail: item.detail });
        saveJSON(CUSTOM_DEL_KEY, delList);
        rerender();
        snackbar('Removed card: ' + item.title, () => {
          const l = customCards(sectionKey); l.push({ code: cls.code, title: item.title, detail: item.detail }); saveCustom(sectionKey, l);
          const dl = loadJSON(CUSTOM_DEL_KEY, {}); dl[sectionKey] = (dl[sectionKey] || []).filter((x) => !(x.code === cls.code && x.title === item.title)); saveJSON(CUSTOM_DEL_KEY, dl);
          rerender();
        });
      });
    });
  }
  return node;
}

/* 从 assessment 页面把正文读出来（due 卡片的模态里用） */
/* 只放“正文容器”。别再往里加 #content / .content —— 那是整页门框（面包屑、标题、Due、
   附件列表、提交按钮），老师没写正文时就会把它当成正文读进来。 */
const ASSESS_BOX_SELECTORS = ['article.content', '#ir-content', 'main article', '.assessment-detail', 'div.u-pad-s'];

/* DOMParser 出来的文档没有布局，innerText 会退化成 textContent（块级元素全挤成一行），
   所以自己走一遍补换行。 */
function domToText(root) {
  const BLOCK = /^(P|DIV|SECTION|ARTICLE|MAIN|LI|UL|OL|TR|TABLE|H[1-6]|BLOCKQUOTE|PRE|DD|DT|FIGURE|FIGCAPTION)$/;
  const buf = [];
  const walk = (n) => {
    if (!n) return;
    if (n.nodeType === 3) { buf.push(String(n.nodeValue).replace(/\s+/g, ' ')); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName ? n.tagName.toUpperCase() : '';
    if (tag === 'BR') { buf.push('\n'); return; }
    if (tag === 'TD' || tag === 'TH') buf.push(' ');
    const block = BLOCK.test(tag);
    if (block) buf.push('\n');
    for (const c of n.childNodes) walk(c);
    if (block) buf.push('\n');
  };
  walk(root);
  return buf.join('').split('\n').map((s) => s.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
}

/* 站点自己的导航/用户菜单也会带 .content，而且正文往往比它短，
   所以光看长度会抓错，这里再做一次内容判别。 */
function looksLikeSiteChrome(text) {
  const t = String(text || '');
  if (/Profile Options|Notification Settings|Notification Settings|Logout|Enable notifications/i.test(t)) return true;
  const lines = t.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return true;
  return lines.length <= 6 && lines.every((l) => /^(WiSE|My Classes|Academic|Calendar|News|My Pages|Contact Us|Due Work|Feedback|Timetable|Classes|Logout|Profile|Settings)$/i.test(l));
}

/* ---- assessment 正文 ----
   同一天里同一个页面经常被反复点开，缓存 24 小时，第二次直接出字。 */
/* v2：v1 里存过「整页门框」那种脏正文（含附件名、Create submission），换个键直接作废。 */
const ASSESS_CACHE_KEY = 'wesleyAssessCache:v2';
const ASSESS_TTL = 24 * 3600 * 1000;
/* 抓到的不该是正文就别用：这条是兜底，防止哪天站点又改结构把门框带进来。 */
function looksLikeAssessChrome(text) {
  const t = String(text || '');
  if (!t) return true;
  if (/Create submission/i.test(t)) return true;
  if (/\d+(\.\d+)?\s*(KB|MB)\b/.test(t)) return true;
  return false;
}
function assessCacheAll() {
  try { return JSON.parse(localStorage.getItem(ASSESS_CACHE_KEY) || '{}') || {}; } catch { return {}; }
}
function assessCacheGet(href) {
  const all = assessCacheAll();
  const hit = all[href];
  if (!hit || !hit.at || Date.now() - hit.at > ASSESS_TTL) return '';
  const text = typeof hit.text === 'string' ? hit.text : '';
  return looksLikeAssessChrome(text) ? '' : text;
}
function assessCacheFiles(href) {
  const all = assessCacheAll();
  const hit = all[href];
  if (!hit || !hit.at || Date.now() - hit.at > ASSESS_TTL) return null;
  return Array.isArray(hit.files) ? hit.files : null;
}
function assessCachePut(href, text, files) {
  try {
    const all = assessCacheAll();
    all[href] = { at: Date.now(), text: String(text || '').slice(0, 1600), files: Array.isArray(files) ? files.slice(0, 8) : [] };
    // 只留最近 60 条，别把 localStorage 撑爆
    const keys = Object.keys(all);
    if (keys.length > 60) keys.sort((x, y) => (all[x].at || 0) - (all[y].at || 0)).slice(0, keys.length - 60).forEach((k) => delete all[k]);
    localStorage.setItem(ASSESS_CACHE_KEY, JSON.stringify(all));
  } catch { /* 存不下不影响显示 */ }
}

/* 去掉正文前面那段「Learning / 班号 / 科目」面包屑和重复的标题 */
function stripAssessPreamble(text, title) {
  let out = String(text || '').trim();
  const t = String(title || '').trim();
  if (t) {
    const first = out.indexOf(t);
    const second = first >= 0 ? out.indexOf(t, first + t.length) : -1;
    if (second > 0 && second < 600) out = out.slice(second);
  }
  out = out.replace(/^\s*Learning\b[^\n]*\n?/i, '');
  return out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/* 从 assessment 页里挖正文。优先级：
   1. #ir-content（有的题型把正文单独放在这里）
   2. div.u-pad-s 里带 h3 的小节（rubric 类页面，一块一个小节）
   3. #content 去掉外壳
   4. 通用容器列表
   抓完统一清掉脚本、菜单、页头页脚。 */
async function fetchAssessmentText(href, title) {
  const cached = assessCacheGet(href);
  const cf = assessCacheFiles(href);
  /* 只缓存了"没有正文"也要再抓一次：可能当时还没解析附件，或者页面后来补了内容。 */
  if (cached || (cf && cf.length)) {
    if (cf && cf.length) ASSESS_FILES.set(href, cf);
    return cached || '';
  }
  try {
    const res = await fetch(fixUrl(href), { credentials: 'include' });
    if (!res.ok) return '';
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const scrub = () => doc.querySelectorAll('nav, header, footer, script, style, noscript, #left-menu, .left-off-canvas-menu, .hide-for-print, .breadcrumbs, form').forEach((n) => n.remove());
    scrub();

    /* 只取"老师写的那段说明"。这个页面的结构是
         #content > .row.actions-small-2 > h1 + ul.meta(Due/MYP Assessment)
         #content > .row > .island > article.content  ← 真正的正文
                                 > ul.grid   ← 附件卡片
       以前这里没有 article.content 时会退到整个 #content，读到的就是面包屑、标题、Due、
       附件文件名和 "Create submission" 这些门框 —— 老师没写正文时尤其明显。 */
    let text = '';
    const art = doc.querySelector('article.content');
    if (art) text = domToText(art);
    if (text.length < 40) {
      const ir = doc.querySelector('#ir-content');
      if (ir) text = domToText(ir);
    }
    if (text.length < 40) {
      const pads = [...doc.querySelectorAll('div.u-pad-s')].filter((n) => n.querySelector('h3') && domToText(n).length > 40);
      if (pads.length) text = pads.map((n) => domToText(n)).join('\n\n');
    }
    /* 附件先摘出来：老师只放附件、没写说明时，正文就是空的，但附件还是要显示。 */
    const files = parseAssessFiles(doc);
    if (files.length) ASSESS_FILES.set(href, files);
    /* 找不到正文就是没有正文，不要拿整页来凑。 */
    if (text.length < 40 || looksLikeSiteChrome(text)) {
      if (files.length) assessCachePut(href, '', files);
      return '';
    }
    text = stripAssessPreamble(text, title);
    /* 正文里残留的用户菜单（… Logout …）切掉 */
    const cut = text.toLowerCase().indexOf('logout');
    if (cut > -1 && cut < 400) text = text.slice(cut + 6).trim();
    text = text.slice(0, 1600);
    if (text) assessCachePut(href, text, files);
    return text;
  } catch (e) { return ''; }
}

/* ---------------- 附件 ----------------
   站点上有两处放文件，长得不一样但底层是同一个 fetch.php：
     · 公告页 /news/<id>   → li.actions-small-1 里 div.card.attachment > a[href*=fetch.php]&name=<文件名>
     · 作业页 /assessments → ul.grid 里同样的卡片
   每份文件在 DOM 里出现两次（一次带 &save=1），所以必须按 hash 去重；
   文件名藏在 &name= 参数里，MIME 在 <img src="/ajax/mime/…">，大小写在卡片文字末尾。
   以前两处各写各的、只吐两列文字链接，现在统一成 {href,name,size,kind}，一个网格画出来。 */
const POST_FILES_KEY = 'wesleyPostFiles:v1';
const POST_FILES = new Map();

/* &name=<urlencoded 文件名>。有些链接没有 name（正文里的 "here" / "Worksheet"），返回空串。 */
function fileNameFromHref(href) {
  const m = /[?&]name=([^&]+)/.exec(href || '');
  if (!m) return '';
  try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return m[1]; }
}

/* 按扩展名 / MIME 归一个大类，决定图标颜色和那行小字 */
function fileKindOf(name, mime) {
  /* 没有扩展名时 split('.').pop() 会返回整个文件名（"here" → 徽标写成 HERE），先判有没有点 */
  const nm = String(name || '').trim();
  const ext = (nm.includes('.') ? nm.split('.').pop() : '').toLowerCase();
  const m = String(mime || '').toLowerCase();
  if (ext === 'pdf' || /\bpdf\b/.test(m)) return { kind: 'pdf', tag: 'PDF' };
  if (/^(docx?|rtf|odt|txt)$/.test(ext) || /word|document|text\/plain/.test(m)) return { kind: 'doc', tag: (ext || 'DOC').toUpperCase().slice(0, 4) };
  if (/^(xlsx?|csv)$/.test(ext) || /sheet|excel|csv/.test(m)) return { kind: 'sheet', tag: (ext || 'XLS').toUpperCase().slice(0, 4) };
  if (/^(pptx?|key)$/.test(ext) || /presentation|powerpoint/.test(m)) return { kind: 'slide', tag: (ext || 'PPT').toUpperCase().slice(0, 4) };
  if (/^(png|jpe?g|gif|webp|svg|bmp|heic)$/.test(ext) || /^image\//.test(m)) return { kind: 'image', tag: (ext || 'IMG').toUpperCase().slice(0, 4) };
  if (/^(zip|rar|7z|tar|gz)$/.test(ext) || /zip|archive/.test(m)) return { kind: 'archive', tag: (ext || 'ZIP').toUpperCase().slice(0, 4) };
  return { kind: 'file', tag: (ext || 'FILE').toUpperCase().slice(0, 4) };
}

function fileEntry(href, label, size, mime) {
  if (!href || !/fetch\.php/i.test(href)) return null;
  const name = fileNameFromHref(href) || String(label || '').trim() || 'Attachment';
  const k = fileKindOf(name, mime);
  return {
    href: fixUrl(href),
    name: name.replace(/\s+/g, ' ').slice(0, 90),
    size: String(size || '').replace(/\s+/g, ' ').trim(),
    kind: k.kind,
    tag: k.tag,
  };
}

function hrefHash(href) {
  const m = /[?&]hash=([^&]+)/.exec(href || '');
  return (m ? m[1] : String(href || '')).toLowerCase();
}

/* 同一份文件在页面里出现两次（一次 &save=1），按 hash 去重；
   先挑带 name= 的那份，否则会剩下没名字的下载链接。 */
function dedupeFiles(list) {
  const named = [], rest = [];
  for (const f of list) if (f && f.href) (/([?&])name=/.test(f.href) ? named : rest).push(f);
  const seen = new Set(), out = [];
  for (const f of named.concat(rest)) {
    const k = hrefHash(f.href);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

/* 手上已经有的文件：正文里的 fetch.php 链接、缓存下来的作业附件 */
function toFileEntries(list) {
  return (list || []).map((f) => (f && f.kind && f.tag ? { href: fixUrl(f.href), name: f.name || f.label || 'Attachment', size: f.size || '', kind: f.kind, tag: f.tag } : fileEntry(f && f.href, f && (f.label || f.name), f && f.size))).filter(Boolean);
}

function filesFromLinks(links) {
  return dedupeFiles((links || []).map((l) => fileEntry(l && l.href, l && (l.text || l.label))).filter(Boolean));
}

/* 解析一整个公告页 / 作业页上的文件卡片 */
function parseFilesIn(doc) {
  const out = [];
  const grab = (a) => {
    const href = a.getAttribute('href') || '';
    if (!/fetch\.php/i.test(href)) return;
    const box = a.closest('li') || a.closest('div.card') || a.parentElement || a;
    const txt = (box.textContent || '').replace(/\s+/g, ' ').trim();
    const sizeM = /(\d+(?:\.\d+)?\s*(?:KB|MB|GB))/i.exec(txt);
    const img = box.querySelector('img[src*="/ajax/mime/"]');
    let mime = '';
    if (img) { try { mime = decodeURIComponent((img.getAttribute('src') || '').split('/ajax/mime/')[1] || ''); } catch (e) { mime = ''; } }
    const title = (a.getAttribute('title') || '').trim();
    const name = fileNameFromHref(href);
    const label = title || (name ? '' : txt.replace(sizeM ? sizeM[0] : '', '').trim());
    const f = fileEntry(href, label, sizeM ? sizeM[1] : '', mime);
    if (f) out.push(f);
  };
  /* 卡片式附件（带大小、MIME）优先，正文里内联的链接兜底 */
  doc.querySelectorAll('div.card.attachment a[href*="fetch.php"], li.actions-small-1 a[href*="fetch.php"]').forEach(grab);
  doc.querySelectorAll('article a[href*="fetch.php"], p a[href*="fetch.php"]').forEach(grab);
  return dedupeFiles(out).slice(0, 12);
}

/* 公告页的附件：要先知道 post id。抓下来缓存 24h，按 hash 去重后最多留 40 条。 */
async function scrapePostFiles(post) {
  const id = post && (post.id || (/(\d{3,})/.exec(post.href || '') || [])[1]);
  if (!id) return [];
  const key = 'p' + id;
  if (POST_FILES.has(key)) return POST_FILES.get(key);
  const all = loadJSON(POST_FILES_KEY, {});
  const hit = all[key];
  if (hit && Array.isArray(hit.files) && Date.now() - (hit.at || 0) < 24 * 3600e3) {
    POST_FILES.set(key, hit.files);
    return hit.files;
  }
  try {
    const res = await fetch(fixUrl('/news/' + id), { credentials: 'include' });
    if (!res.ok) return [];
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const files = parseFilesIn(doc);
    POST_FILES.set(key, files);
    const next = { [key]: { at: Date.now(), files } };
    Object.keys(all)
      .filter((k) => k !== key)
      .sort((a, b) => ((all[b] && all[b].at) || 0) - ((all[a] && all[a].at) || 0))
      .slice(0, 39)
      .forEach((k) => { next[k] = all[k]; });
    saveJSON(POST_FILES_KEY, next);
    return files;
  } catch (e) { return []; }
}

const FILE_TAG_NAME = { pdf: 'PDF', doc: 'Document', sheet: 'Spreadsheet', slide: 'Slides', image: 'Image', archive: 'Archive', file: 'File' };

/* 文件网格：左边一个按类型上色的小方块，右边两行（文件名 / 类型 · 大小） */
function renderFiles(files) {
  const list = (files || []).filter(Boolean);
  if (!list.length) return null;
  const box = el('div', { class: 'wt-files' });
  for (const f of list.slice(0, 12)) {
    const meta = [FILE_TAG_NAME[f.kind] || 'File', f.size].filter(Boolean).join(' · ');
    box.append(el('a', { class: 'wt-file', href: f.href, target: '_blank', rel: 'noreferrer', title: f.name },
      el('span', { class: 'wt-file-ico', 'data-kind': f.kind }, f.tag || 'FILE'),
      el('span', { class: 'wt-file-txt' },
        el('span', { class: 'wt-file-name' }, f.name),
        meta ? el('span', { class: 'wt-file-meta' }, meta) : null)));
  }
  return box;
}

/* assessment 页上的附件：ul.grid 里每张卡片一个 a[href*=fetch.php]。
   正文抓空的时候，这里就是唯一有用的信息了。 */
const ASSESS_FILES = new Map();
function parseAssessFiles(doc) { return parseFilesIn(doc); }

/* 这一条 due 对应的 assessment 页地址（没有就是空串） */
function assessHrefOf(d) {
  const l = (d && d.links ? d.links : []).find((x) => /assessments/i.test((x && x.href) || ''));
  return l ? l.href : '';
}

/* 抓完正文后把卡片上的缩略一并换掉，卡片和模态必须是同一段字 */
function updateAssessCards(href, text) {
  if (!href) return;
  if (!text) {
    /* 这一条没有正文：把卡片上可能残留的旧正文收掉，只留标题和那行 meta。 */
    document.querySelectorAll('[data-wesley-home] .wt-due-card').forEach((card) => {
      if (card.getAttribute('data-wt-assess') !== href) return;
      const det = card.querySelector('.wt-detail');
      if (det && !det.classList.contains('wt-detail-meta')) det.remove();
    });
    return;
  }
  document.querySelectorAll('[data-wesley-home] .wt-due-card').forEach((card) => {
    if (card.getAttribute('data-wt-assess') !== href) return;
    let det = card.querySelector('.wt-detail');
    if (!det) {
      det = el('div', { class: 'wt-detail' });
      const after = card.querySelector('.wt-links') || card.querySelector('.wt-due-days');
      if (after) card.insertBefore(det, after); else card.append(det);
    }
    det.classList.remove('wt-detail-meta');
    det.textContent = text;
  });
}

/* 渲染完立刻把没有正文的 due 条补齐（0.1.0 的做法：进面板时就把 assessment 正文抓好，
   卡片上直接能读到；不是等点开模态才去抓）。缓存先命中，没命中才逐个请求，
   一次最多 6 条，串行，免得一上来给站点扔一堆并发。 */
const ASSESS_INFLIGHT = new Set();
async function enrichDueList(items) {
  /* 只要这条有 assessment 链接就补齐正文（0.1.0 的 enrichDueDetails 也是这样：
     列表页那点摘要会被真正的作业说明覆盖掉，自定义卡没有链接所以永远不会被覆盖）。 */
  const targets = (items || []).filter((d) => d && assessHrefOf(d)).slice(0, 6);
  for (const d of targets) {
    const href = assessHrefOf(d);
    if (!href || ASSESS_INFLIGHT.has(href)) continue;
    ASSESS_INFLIGHT.add(href);
    try {
      const text = await fetchAssessmentText(href, d.title);
      const files = ASSESS_FILES.get(href);
      if (files && files.length) d.files = files;
      if (text && text !== d.detail) { d.detail = text; updateAssessCards(href, text); }
      else if (!text) updateAssessCards(href, '');
    } catch (e) { /* 单条失败不影响其它 */ }
    finally { ASSESS_INFLIGHT.delete(href); }
  }
}

function dueCard(d, done, redraw) {
  const checked = !!done[d.key];
  /* role=checkbox 的小方块本身没有文字，屏幕阅读器只会念「复选框，未选中」，
     得把这是哪一项带上，否则一排八个框分不清谁是谁。 */
  const cb = el('button', {
    class: 'wt-check' + (checked ? ' on' : ''),
    role: 'checkbox',
    'aria-checked': checked ? 'true' : 'false',
    'aria-label': (L.markDone || 'Mark as done') + ': ' + (d.title || ''),
  }, checked ? '✓' : '');
  /* 课程别名（tab 上改过的）在 Due 卡上也要跟着改，label 由 renderDueTab 预算好 */
  const clsLabel = d.__label || d.cls.name;
  const color = d.cls.color || 'rgb(79,39,89)';
  /* 截止时间三级来源：用户手动设的 → 作业接口的 due → 帖子里写的 "Due: …"
     最后这条是老师把作业写在公告正文里的情况（EAL 那种），以前只有三天内的 due 才有徽标。 */
  const naturalAt = (() => {
    if (d.due) { const t = new Date(fixDue(d.due)); if (!isNaN(t.getTime())) return t; }
    const lp = (d.cls && d.cls.latestPost) || null;
    return dueDateInText([d.detail, lp && lp.text].filter(Boolean).join('\n'), postDateOf(lp));
  })();
  const manualAt = dueSetAt(d.key);
  const badgeAt = manualAt || naturalAt;
  const badgeLeft = badgeAt ? daysUntil(badgeAt) : null;
  const node = el('div', { class: 'wt-task wt-due-card' + (checked ? ' done' : ''), 'data-wt-assess': assessHrefOf(d) || '', 'data-wt-due-key': String(d.key || ''), 'data-wt-due-natural': naturalAt ? naturalAt.toISOString() : '', style: `--wt-color:${color};--wt-ink:${darken(color, 0.45)}` },
    el('div', { class: 'wt-cls' }, cb, el('span', { class: 'wt-dot' }), el('a', { href: d.cls.homepage || '#', target: '_blank', rel: 'noreferrer', 'data-code': String((d.cls && d.cls.code) || ''), onclick: (e) => e.stopPropagation() }, clsLabel)),
    el('div', { class: 'wt-title' }, d.title),
    d.detail ? el('div', { class: 'wt-detail' }, d.detail) : (d.kind === 'assessment' ? el('div', { class: 'wt-detail wt-detail-meta' }, (d.meta || 'Assessment') + (d.due ? ' \u00b7 due ' + String(d.due).slice(0, 10) : '')) : null),
    d.links.filter((l) => !/assessments/i.test(l.href || '')).length ? el('div', { class: 'wt-links' }, ...d.links.filter((l) => !/assessments/i.test(l.href || '')).map((l) => el('a', { href: l.href, target: '_blank', rel: 'noreferrer', onclick: (e) => e.stopPropagation() }, l.label))) : null,
    (badgeLeft != null && badgeLeft >= 0) ? el('span', { class: 'wt-due-days' + (badgeLeft <= 7 ? ' soon' : ''), 'data-role': 'due-days', title: dueSetLabel(badgeAt) }, badgeLeft === 0 ? 'today' : L.inDays(badgeLeft)) : null,
  );
  /* 勾选只改这一张卡。以前这里是 redraw()，等于把整个 tab 重建一遍：
     所有卡片闪一下、Upcoming 也跟着退回展开状态。现在只动这几个 class。 */
  cb.addEventListener('click', (e) => {
    e.stopPropagation();
    const on = !done[d.key];
    done[d.key] = on;
    saveDone(done);
    cb.classList.toggle('on', on);
    cb.textContent = on ? '\u2713' : '';
    cb.setAttribute('aria-checked', on ? 'true' : 'false');
    node.classList.toggle('done', on);
    if (typeof redraw === 'function' && redraw.afterDueToggle) { try { redraw.afterDueToggle(d, on); } catch { /* 回调挂了不影响勾选 */ } }
  });
  node.addEventListener('click', (e) => {
    if (e.target.closest('a') || e.target.closest('button')) return;
    const allItems = normItems(d.cls).filter((x) => x.title === d.title || x.detail === d.detail);
    if (allItems.length) {
      openModal({ cls: d.cls, items: [{ title: d.title, detail: d.detail || '', links: d.links || [], files: d.files || [] }], index: 0, fromDue: true, dueKey: d.key, dueNatural: naturalAt });
    } else {
      openModal({ cls: d.cls, items: [{ title: d.title, detail: d.detail || '', links: d.links || [] }], index: 0, fromDue: true, dueKey: d.key, dueNatural: naturalAt });
    }
  });
  return node;
}

function withFlip(rerender) {
  const before = new Map();
  document.querySelectorAll('.wt-cw').forEach((el2) => { if (el2.__key) before.set(el2.__key, el2.getBoundingClientRect()); });
  rerender();
  requestAnimationFrame(() => {
    document.querySelectorAll('.wt-cw').forEach((el2) => {
      const b = before.get(el2.__key);
      if (!b) return;
      const a = el2.getBoundingClientRect();
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        el2.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.3,1)' });
      }
    });
  });
}

/* 正在拖的是哪个分区的卡。跨分区不接（把任务卡丢进 Due 网格没有意义）。 */
let DRAG_SECTION = null;
/* 拖拽会话：{ el, grid, sectionKey, ph, rects, raf, ev, dropped } */
let DRAG_STATE = null;
/* 首屏骨架节点的引用：真面板准备好后原地替换它，不新增节点、不挪位置 */
let SKEL_HOST = null;

function skelPanel() {
  if (document.querySelector('[data-wesley-home]:not(.wt-skel)')) return null;
  let host = document.querySelector('[data-wesley-home].wt-skel');
  if (!host) {
    const shell = el('div', { class: 'wt-summary wt-skel-shell', 'aria-busy': 'true' },
      el('div', { class: 'wt-skel-head' }, el('div', { class: 'wt-skel-bar' }))
    );
    host = el('div', { 'data-wesley-home': '', class: 'wt-skel' }, shell);
    /* 标题是站点后渲染的，那会儿没地方插 —— 先当「整行宽的一条」放进栅格行最上面，
       不往 .column-left 这种缝里塞；标题一出现 watchPanelPlacement 会挪进标题那一格。 */
    const col = document.querySelector('.column-left');
    const row = col && col.parentElement;
    if (row) { host.classList.add('wt-skel-block'); row.insertBefore(host, row.firstChild); }
    else placePanel(host);
    watchPanelPlacement(host);
  }
  SKEL_HOST = host;
  return host;
}

/* 只算「占位符该插到第几个」，纯数学，不碰 DOM */
function wtDragIndex(boxes, x, y) {
  for (let i = 0; i < boxes.length; i++) {
    const r = boxes[i].r;
    if (y < r.top) return i;                                   // 指针在这一行上面
    if (y <= r.bottom && x < r.left + r.width / 2) return i;    // 同一行，在卡片中线左边
  }
  return boxes.length;
}

/* 拖拽结束/落位时把在跑的位移动画收尾（跳到终点），免得卡片停在半路 */
function wtSettle(st) {
  if (!st || !st.anims || !st.anims.length) { if (st) st.anims = []; return; }
  for (const a of st.anims) { try { a.finish(); } catch { /* 被取消过的动画直接跳过 */ } }
  st.anims = [];
}

/* 一帧最多跑一次：位置没变就不碰 DOM；变了就让「除手里这张之外的所有卡片」平移过去。
   连续性靠这个顺序：先量此刻的屏幕位置（getBoundingClientRect 会把正在跑的 translate
   算进去）→ 取消在跑的动画 → 插占位符 → 再量一次 → 两者之差当成动画起点。
   整段在同一个任务里做完，浏览器不会在中间绘制，所以看到的是从当前视觉位置无缝滑过去，
   而不是跳回布局位置重来。 */
function wtDragPlace(st, x, y) {
  const grid = st.grid;
  const ph = st.ph;
  const dragged = st.el;
  if (!ph || !ph.isConnected || !dragged.isConnected || !grid.isConnected) return;
  const items = [];
  for (const n of grid.children) {
    if (n === dragged || n === ph || !n.classList || !n.classList.contains('wt-cw')) continue;
    items.push({ el: n, r: n.getBoundingClientRect() });
  }
  const idx = wtDragIndex(items, x, y);
  const order = [...grid.children].filter((n) => n !== ph && n !== dragged);
  const next = order[idx] || null;
  if (ph.parentElement === grid && ph.nextSibling === next) return;  // 已经在这个缝里，一个 DOM 都不碰
  for (const it of items) {
    try { for (const a of it.el.getAnimations()) a.cancel(); } catch { /* ignore */ }
  }
  grid.insertBefore(ph, next);
  const anims = [];
  for (const it of items) {
    if (!it.el.isConnected) continue;
    const r2 = it.el.getBoundingClientRect();
    const dx = it.r.left - r2.left;
    const dy = it.r.top - r2.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    try {
      anims.push(it.el.animate(
        [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
        { duration: 170, easing: 'cubic-bezier(.22,.61,.36,1)' }
      ));
    } catch { /* 动画失败不影响落位 */ }
  }
  st.anims = anims;
}

function cardShell(cardEl, key, prefs, sectionKey, rerender, visible) {
  const wrap = el('div', { class: 'wt-cw' + (visible ? '' : ' wt-cw-hidden') + (cardEl.classList && cardEl.classList.contains('wt-custom-card') ? ' wt-cw-custom' : '') });
  wrap.append(cardEl);
  if (EDIT[sectionKey]) {
    const btn = el('button', { class: 'wt-eye', title: visible ? 'Hide card' : 'Show card' }, iconImg(visible ? 'hide' : 'show', 18));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const all = loadPrefs();
      const p = sectionPrefs(all, sectionKey);
      if (visible) p.hiddenCards.push(key);
      else p.hiddenCards = p.hiddenCards.filter((x) => x !== key);
      savePrefs(all);
      withFlip(rerender);
    });
    wrap.append(btn);
  }
  /* 拖拽以前只在编辑模式能用。卡片顺序本来就是记在 prefs.order 里的，
     没必要非得先进编辑模式才能挪 —— 平时也能拖。 */
  wrap.draggable = true;
  wrap.addEventListener('dragstart', (e) => {
    if (!wrap.parentElement) return;
    try {
      e.dataTransfer.setData('text/plain', key);
      e.dataTransfer.effectAllowed = 'move';
    } catch { /* 某些合成事件没有 dataTransfer */ }
    DRAG_SECTION = sectionKey;
    const grid = wrap.parentElement;
    const rect = wrap.getBoundingClientRect();
    /* 原卡马上要移出布局，native 拖影就得自己给：克隆一份塞到视野外当 drag image，
       浏览器抓完快照（同一帧内）立刻删掉，不然屏幕上会多一张卡。 */
    const ghost = wrap.cloneNode(true);
    ghost.classList.add('wt-drag-ghost');
    ghost.classList.remove('wt-dragging');
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    const host = document.querySelector('[data-wesley-home]') || document.body;
    host.append(ghost);
    try { e.dataTransfer.setDragImage(ghost, Math.round(rect.width / 2), 22); } catch { /* 合成事件没有 dataTransfer */ }
    const ph = el('div', { class: 'wt-drop-placeholder' });
    ph.style.height = rect.height + 'px';
    grid.insertBefore(ph, wrap);          // 占位符顶掉原卡的位置
    wrap.classList.add('wt-dragging');    // 原卡离开布局
    setTimeout(() => ghost.remove(), 0);
    DRAG_STATE = { el: wrap, grid, sectionKey, ph, anims: [], raf: 0, ev: null, dropped: false };
    /* 拖拽期间把毛玻璃关掉：每挪一次占位符都要重排+重绘，
       18 张卡叠着 backdrop-filter 的话重绘就是秒级 */
    document.documentElement.classList.add('wt-drag-now');
  });
  wrap.addEventListener('dragend', () => {
    const st = DRAG_STATE;
    if (st && st.el === wrap) {
      if (st.raf) cancelAnimationFrame(st.raf);
      wtSettle(st);
      if (st.ph && st.ph.parentElement) st.ph.remove();
    }
    wrap.classList.remove('wt-dragging');
    DRAG_SECTION = null;
    DRAG_STATE = null;
    document.documentElement.classList.remove('wt-drag-now');
    /* drop 已经把卡片挪到位、顺序也写进 prefs 了；没落到任何格子里则 DOM 没动过。
       两种情况都不需要整块重绘。 */
  });
  wrap.__key = key;
  return wrap;
}

function layoutGrids() {
  document.querySelectorAll('.wt-grid').forEach((g) => {
    const w = g.getBoundingClientRect().width || 0;
    if (!w) return;
    const gap = 8;
    const want = Number(getComputedStyle(g).getPropertyValue('--wt-cols')) || 0;
    let cols;
    if (want && window.innerWidth >= 1181) cols = Math.max(3, Math.min(10, want));
    else cols = Math.max(1, Math.floor((w + gap) / (250 + gap)));
    g.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
  });
}
window.addEventListener('resize', () => { clearTimeout(window.__wtGridTimer); window.__wtGridTimer = setTimeout(layoutGrids, 120); });
function gridWithPrefs(items, keyFn, prefs, sectionKey, renderCard, rerender) {
  const hidden = new Set(prefs.hiddenCards || []);
  const deletedList = loadJSON('wesleyDeletedCards:v1', []).filter((x) => x.section === sectionKey);
  const deletedSet = new Set(deletedList.map((x) => x.key));
  const visible = ordered(items.filter((x) => !hidden.has(keyFn(x)) && !deletedSet.has(keyFn(x))), prefs, keyFn);
  const hiddenItems = EDIT[sectionKey] ? items.filter((x) => hidden.has(keyFn(x))) : [];
  const grid = el('div', { class: 'wt-grid' + (EDIT[sectionKey] ? ' wt-editing' : '') + (DELMODE[sectionKey] ? ' wt-delmode' : '') });
  /* dragover/drop 常开：上面 cardShell 已经让卡片随时可拖，这里得接得住。
     dragover 一秒能来 60+ 次，所以：一帧只处理一次、几何量一次就缓存、
     位置没变就直接返回、只给真正挪了位的卡片做位移动画。 */
  {
    grid.addEventListener('dragover', (e) => {
      e.preventDefault();
      const st = DRAG_STATE;
      if (!st || st.grid !== grid) return;
      if (DRAG_SECTION && DRAG_SECTION !== sectionKey) return;
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      st.ev = e;
      if (st.raf) return;
      st.raf = requestAnimationFrame(() => {
        st.raf = 0;
        const ev = st.ev;
        if (!ev || DRAG_STATE !== st) return;
        try { wtDragPlace(st, ev.clientX, ev.clientY); } catch { /* 拖拽出错不该影响页面 */ }
      });
    });
    grid.addEventListener('drop', (e) => {
      e.preventDefault();
      const st = DRAG_STATE;
      if (!st || st.grid !== grid) return;
      if (DRAG_SECTION && DRAG_SECTION !== sectionKey) { DRAG_SECTION = null; return; }
      const ph = st.ph;
      const dragged = st.el;
      if (!ph || !ph.parentElement || !dragged) return;
      /* 卡片按占位符的位置真正挪过去：DOM 顺序就是新顺序，
         不用整块重绘，松手那一下也就不会卡 */
      dragged.classList.remove('wt-dragging');   // 先回到布局，否则插进去也不占格
      ph.parentElement.insertBefore(dragged, ph);
      const children = [...grid.children];
      const keys = children.filter((n) => n.__key).map((n) => n.__key);
      const all = loadPrefs();
      const p = sectionPrefs(all, sectionKey);
      p.order = keys;
      savePrefs(all);
      ph.remove();
      st.dropped = true;
      DRAG_SECTION = null;
    });
  }
  if (EDIT[sectionKey]) {
    grid.addEventListener('mousemove', (e) => {
      const r = grid.getBoundingClientRect();
      grid.style.setProperty('--gx', ((e.clientX - r.left - r.width / 2) / Math.max(1, r.width)).toFixed(3));
      grid.style.setProperty('--gy', ((e.clientY - r.top - r.height / 2) / Math.max(1, r.height)).toFixed(3));
    });
  }
  requestAnimationFrame(() => { layoutGrids(); setTimeout(layoutGrids, 60); });
  for (const it of visible) {
    const cell = cardShell(renderCard(it), keyFn(it), prefs, sectionKey, rerender, true);
    if (DELMODE[sectionKey]) {
      cell.style.position = 'relative';
      const x = document.createElement('button');
      x.setAttribute('data-wt-ui', '');
      x.title = 'Remove card';
      x.className = 'wt-eye wt-del-x';
      x.append(iconImg('close', 17));
      x.addEventListener('click', (ev) => {
        ev.stopPropagation();
        confirmAt(x, () => {
          if (it && it.custom) {
            const list = customCards(sectionKey).filter((y) => !(y.code === it.cls.code && y.title === it.item.title));
            saveCustom(sectionKey, list);
            const delList = loadJSON(CUSTOM_DEL_KEY, {});
            delList[sectionKey] = delList[sectionKey] || [];
            delList[sectionKey].push({ code: it.cls.code, title: it.item.title, detail: it.item.detail || '' });
            saveJSON(CUSTOM_DEL_KEY, delList);
            withFlip(rerender);
            snackbar('Removed card', () => {
              const l = customCards(sectionKey); l.push({ code: it.cls.code, title: it.item.title, detail: it.item.detail || '' }); saveCustom(sectionKey, l);
              const dl = loadJSON(CUSTOM_DEL_KEY, {}); dl[sectionKey] = (dl[sectionKey] || []).filter((y) => !(y.code === it.cls.code && y.title === it.item.title)); saveJSON(CUSTOM_DEL_KEY, dl);
              rerender();
            });
          } else {
            const cardKey = keyFn(it);
            const list = loadJSON('wesleyDeletedCards:v1', []);
            list.push({ key: cardKey, section: sectionKey, title: (it.item && it.item.title) || (it.cls && it.cls.name) || 'Card', code: it.cls && it.cls.code, detail: (it.item && it.item.detail) || '' });
            saveJSON('wesleyDeletedCards:v1', list);
            withFlip(rerender);
            snackbar('Removed card', () => {
              const l2 = loadJSON('wesleyDeletedCards:v1', []).filter((x) => !(x.key === cardKey && x.section === sectionKey));
              saveJSON('wesleyDeletedCards:v1', l2);
              rerender();
            });
          }
        });
      });
      cell.append(x);
    }
    grid.append(cell);
  }
  for (const it of hiddenItems) grid.append(cardShell(renderCard(it), keyFn(it), prefs, sectionKey, rerender, false));
  return grid;
}

function settingsPopover(sectionKey, tabs, rerender) {
  const pop = el('div', { class: 'wt-set-pop' });
  pop.hidden = true;
  const draw = () => {
    const prefs = sectionPrefs(loadPrefs(), sectionKey);
    /* 传进来的可能是数组（打开时的快照），也可能是 getter —— 设置面板每次打开都要
       重新问一遍「这人有哪些课」，否则当天的课一换、额外课程一晚到，列表就少一门。 */
    const list = (typeof tabs === 'function' ? (tabs() || []) : (tabs || []));
    pop.replaceChildren();
    const grab = el('div', { class: 'wt-set-grabber', style: 'position:absolute;left:0;right:0;top:0;height:12px;' });
    const head = el('div', { class: 'wt-set-head' }, el('b', null, 'Settings'), el('span', { class: 'wt-set-sub' }, 'cards in this section'), el('button', { class: 'wt-set-x', 'aria-label': 'Close' }, iconImg('close', 15)));
      const body = el('div', { class: 'wt-set-body' });
    body.append(el('div', { class: 'wt-set-h' }, 'Show in All'));
    for (const s of list.slice(1)) {
      const cb = el('input', { type: 'checkbox' });
      cb.checked = !prefs.hiddenSubjects.includes(s.key);
      cb.addEventListener('change', () => {
        const all = loadPrefs();
        const p = sectionPrefs(all, sectionKey);
        if (cb.checked) p.hiddenSubjects = p.hiddenSubjects.filter((x) => x !== s.key);
        else p.hiddenSubjects.push(s.key);
        savePrefs(all);
        rerender();
      });
      body.append(el('label', { class: 'wt-set-row' }, cb, el('span', null, s.label)));
    }
    const editBtn = el('button', { class: 'wt-set-edit' + (EDIT[sectionKey] ? ' on' : ''), title: 'Edit cards' }, '✎');
    editBtn.addEventListener('click', () => { EDIT[sectionKey] = !EDIT[sectionKey]; if (EDIT[sectionKey]) DELMODE[sectionKey] = false; rerender(); draw(); });
    const addBtn = el('button', { class: 'wt-set-edit wt-set-add', title: 'Add card' }, '+');
    addBtn.addEventListener('click', () => openAddCardModal(sectionKey, pickList(), rerender));
    const delBtn = el('button', { class: 'wt-set-edit wt-set-del' + (DELMODE[sectionKey] ? ' on' : ''), title: 'Remove custom cards' }, '−');
    delBtn.addEventListener('click', () => { DELMODE[sectionKey] = !DELMODE[sectionKey]; if (DELMODE[sectionKey]) EDIT[sectionKey] = false; rerender(); draw(); });
    body.append(el('div', { class: 'wt-set-rowbtns' }, editBtn, addBtn, delBtn));
    head.prepend(grab);
    pop.append(head, body);
    pop.querySelector('.wt-set-x').addEventListener('click', (e) => { e.stopPropagation(); closePop(); });
  };
  let popTimer = null;
  /* 相对按钮的偏移：默认 0（贴在按钮右下角），用户拖动之后记住增量 */
  let popRel = { dx: 0, dy: 0 };
  const baseOf = () => {
    const r = btn.getBoundingClientRect();
    const pw = 300;
    const left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.right - pw));
    return { left, top: r.bottom + 6 };
  };
  const placePop = () => {
    if (!pop || pop.hidden || !btn.isConnected) return;
    const base = baseOf();
    /* 这个站点的滚动条挂在 <body> 上（body 是 position:relative 且 overflow:scroll），
       window.scrollY 一直是 0，真正的位移在 body.scrollTop 里。absolute 子元素跟着
       body 的内容区走，所以要按 offsetParent 的滚动量补。 */
    const ob = pop.offsetParent || document.body;
    const sx = window.scrollX || (ob && ob.scrollLeft) || 0;
    const sy = window.scrollY || (ob && ob.scrollTop) || 0;
    pop.style.left = Math.round(base.left + popRel.dx + sx) + 'px';
    pop.style.top = Math.round(base.top + popRel.dy + sy) + 'px';
  };
  const onAnyScroll = () => placePop();
  const closePop = () => {
    if (pop.hidden) return;
    clearTimeout(popTimer);
    const h = pop.getBoundingClientRect().height || pop.scrollHeight;
    pop.style.overflow = 'hidden';
    pop.style.transition = '';
    pop.style.height = h + 'px';
    void pop.offsetHeight;
    pop.style.transition = 'height ' + (animMs(180) / 1000) + 's cubic-bezier(.4,0,.2,1), opacity ' + (animMs(160) / 1000) + 's ease';
    pop.classList.remove('show');
    pop.style.height = '0px';
    if (ACTIVE_POP && ACTIVE_POP.pop === pop) ACTIVE_POP = null;
    document.removeEventListener('scroll', onAnyScroll, true);
    window.removeEventListener('resize', onAnyScroll);
    EDIT[sectionKey] = false;
    DELMODE[sectionKey] = false;
    rerender();
    popTimer = setTimeout(() => { pop.hidden = true; pop.style.height = ''; pop.style.overflow = ''; pop.style.transition = ''; }, animMs(190));
  };
  // 这个按钮管的是「这一栏显示哪些卡片」，和右上角齿轮打开的全站设置不是一回事。
  // 以前两边都写 Settings，点错过好几次，现在分开叫。
  const btn = el('button', { class: 'wt-set-btn', title: 'Settings for this section', 'aria-label': 'Settings for this section' }, 'Settings');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!pop.hidden) { closePop(); return; }
    if (ACTIVE_POP && ACTIVE_POP.pop !== pop) { try { ACTIVE_POP.close(); } catch { /* ignore */ } }
    draw();
    document.body.append(pop);
    document.addEventListener('scroll', onAnyScroll, true);
    window.addEventListener('resize', onAnyScroll);
    ACTIVE_POP = { pop, close: closePop };
    /* 跟着页面一起滚：位置每次都从按钮当前位置算，再加用户拖过的偏移。
       注意这个站点的内容是装在滚动容器里滚的，window 本身不滚，所以不能只靠
       absolute + document 坐标 —— 得监听滚动事件重算。 */
    pop.style.position = 'absolute';
    popRel = { dx: 0, dy: 0 };
    pop.hidden = false;
    placePop();
    pop.style.overflow = 'hidden';
    pop.style.transition = '';
    pop.style.height = '0px';
    void pop.offsetHeight;
    pop.style.transition = 'height ' + (animMs(260) / 1000) + 's cubic-bezier(.4,0,.2,1), opacity ' + (animMs(180) / 1000) + 's ease, transform ' + (animMs(180) / 1000) + 's ease';
    pop.style.height = pop.scrollHeight + 'px';
    pop.classList.add('show');
    clearTimeout(popTimer);
    popTimer = setTimeout(() => { pop.style.height = ''; pop.style.overflow = ''; pop.style.transition = ''; }, animMs(280));
  });
  pop.addEventListener('click', (e) => e.stopPropagation());
  if (!bindPopOutside) {
    bindPopOutside = true;
    document.addEventListener('click', () => { if (ACTIVE_POP) { try { ACTIVE_POP.close(); } catch (e) { /* ignore */ } } });
  }
  let drag = null;
  pop.addEventListener('mousedown', (e) => {
    if (!(e.target.closest('.wt-set-head') || e.target.closest('.wt-set-grabber')) || e.target.closest('.wt-set-x')) return;
    const r = pop.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!drag || pop.hidden) return;
    /* 拖出来的位置记成「相对按钮」的偏移，这样页面一滚它还是跟着按钮走 */
    const base = baseOf();
    popRel = {
      dx: Math.max(8 - base.left, Math.min(document.documentElement.clientWidth - 300 - 8 - base.left, e.clientX - drag.dx - base.left)),
      dy: e.clientY - drag.dy - base.top,
    };
    placePop();
  });
  document.addEventListener('mouseup', () => { drag = null; });
  return { btn, pop };
}

function tabBar(tabs, active, onPick, settingsEl, onRename) {
  const bar = el('div', { class: 'wt-tabs' });
  const slider = el('span', { class: 'wt-tab-slider' });
  bar.append(slider);
  const PEN = '<svg class="wt-pen" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L18 10l-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.6 6.4l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const mkTab = (t, activeKey) => {
    const b = el('button', { class: 'wt-tab' + (t.key === activeKey ? ' active' : ''), 'data-key': t.key, onclick: (e) => {
      e.stopPropagation();
      if (bar.classList.contains('wt-tabs-editable') && onRename && t.key !== 'all') { onRename(t.key, api); return; }
      api.setActive(t.key); onPick(t.key);
    } }, el('span', { class: 'wt-tab-lbl' }, t.label));
    if (t.key !== 'all') b.insertAdjacentHTML('beforeend', PEN);
    if (t.extra) b.title = "Not on today's timetable";
    return b;
  };
  for (const t of tabs) bar.append(mkTab(t, active));
  const move = () => {
    const b = bar.querySelector('.wt-tab.active');
    if (!b) return;
    let left = b.offsetLeft;
    let width = b.offsetWidth;
    if (b.dataset.key === 'all') { width = 24; left = b.offsetLeft + (b.offsetWidth - 24) / 2; }
    slider.style.left = left + 'px';
    slider.style.width = width + 'px';
  };
  const api = el('div', { class: 'wt-tabbar' }, bar);
  api.setActive = (key) => {
    [...bar.querySelectorAll('.wt-tab')].forEach((b) => b.classList.toggle('active', b.dataset.key === key));
    move();
  };
  api.setTabs = (list, activeKey) => {
    [...bar.querySelectorAll('.wt-tab')].forEach((b) => b.remove());
    for (const t of list) bar.append(mkTab(t, activeKey));
    requestAnimationFrame(move);
  };
  requestAnimationFrame(move);
  window.addEventListener('resize', move);
  if (settingsEl) api.append(settingsEl);
  return api;
}

/* 淡出 170ms 后真的收起来。以前这里 setTimeout 里又调自己一次，
   等于每 170ms 排一个新定时器，永远停不下来（而且行根本不会消失）。 */
function hideRestoreRow(row) {
  row.classList.add('wt-hiding');
  clearTimeout(row.__wtHideT);
  row.__wtHideT = setTimeout(() => { row.style.display = 'none'; row.classList.remove('wt-hiding'); }, 170);
}
function showRestoreRow(row) {
  clearTimeout(row.__wtHideT);
  row.style.display = '';
  requestAnimationFrame(() => row.classList.remove('wt-hiding'));
}
function confirmAt(anchorEl, onYes) {
  const old = document.querySelector('.wt-confirm-floating');
  if (old) old.remove();
  const bubble = el('div', { class: 'wt-confirm-floating' }, el('span', null, 'Remove? '), el('button', null, 'Yes'), el('button', null, 'No'));
  bubble.style.zIndex = '2147483005';
  bubble.style.fontFamily = getComputedStyle(anchorEl).fontFamily;
  const hostDialog = document.querySelector('dialog.wt-modal-dialog[open]');
  (hostDialog || document.documentElement).append(bubble);
  const place = () => {
    const r = anchorEl.getBoundingClientRect();
    const br = bubble.getBoundingClientRect();
    const bw = br.width || 160;
    const bh = br.height || 34;
    let left = Math.max(8, Math.min(window.innerWidth - bw - 8, r.right - bw));
    let top = r.bottom + 4;
    if (top + bh > window.innerHeight - 8) top = Math.max(8, r.top - bh - 4);
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
  };
  place();
  requestAnimationFrame(place);
  setTimeout(place, 80);
  const close = () => { bubble.remove(); document.removeEventListener('click', outside, true); };
  const outside = (e) => { if (!bubble.contains(e.target) && e.target !== anchorEl) close(); };
  setTimeout(() => document.addEventListener('click', outside, true), 0);
  bubble.querySelectorAll('button')[0].addEventListener('click', (e) => { e.stopPropagation(); close(); onYes(); });
  bubble.querySelectorAll('button')[1].addEventListener('click', (e) => { e.stopPropagation(); close(); });
  return bubble;
}

function snackbar(text, onUndo) {
  document.querySelectorAll('.wt-snackbar').forEach((n) => n.remove());
  const bar = el('div', { class: 'wt-snackbar' }, el('span', null, text), onUndo ? el('button', { class: 'wt-snack-undo' }, 'Undo') : null);
  const dlgHost = document.querySelector('dialog.wt-modal-dialog[open]');
  (dlgHost || document.body).append(bar);
  requestAnimationFrame(() => bar.classList.add('show'));
  const hide = () => { bar.classList.remove('show'); setTimeout(() => bar.remove(), 220); };
  const timer = setTimeout(hide, 5000);
  bar.querySelector('.wt-snack-undo').addEventListener('click', () => { clearTimeout(timer); hide(); if (onUndo) onUndo(); });
}

/* ===== 只给 Chris Guo 这个账号的考试表 =====
   站点「Upcoming Learning Activities」给的是作业/测验，这里换成 Term 4 的考试安排：
   日期、时间、科目、考场。别人登录时站点标题不是这个人，就照常走站点原始数据。 */
const EXAM_OWNER = /chris\s+guo/i;
const EXAM_SEED = [
  { day: '2026-11-18', at: '13:00', when: 'Wed 18 Nov', time: '1:00\u20133:15 PM', subject: 'Language Acquisition: English', room: 'Study Centre' },
  { day: '2026-11-19', at: '09:00', when: 'Thu 19 Nov', time: '9:00\u201311:20 AM', subject: 'VCE Maths Methods 1&2', room: 'Alex (43)' },
  { day: '2026-11-19', at: '13:00', when: 'Thu 19 Nov', time: '1:00\u20133:15 PM', subject: 'Language and Literature: Chinese', room: 'Study Centre' },
  { day: '2026-11-20', at: '09:00', when: 'Fri 20 Nov', time: '9:00\u201310:35 AM', subject: 'Individuals and Societies', room: 'Coates (87)' },
  { day: '2026-11-20', at: '13:00', when: 'Fri 20 Nov', time: '1:00\u20133:15 PM', subject: 'VCE Bridging EAL', room: 'B206' },
  { day: '2026-11-23', at: '09:00', when: 'Mon 23 Nov', time: '9:00\u201311:10 AM', subject: 'Science', room: 'Coates' },
  { day: '2026-11-24', at: '09:00', when: 'Tue 24 Nov', time: '9:00\u201312:00 PM', subject: 'Physical and Health Education', room: 'Coates' },
];
function examSeedList() {
  const a = document.querySelector('a.account-menu');
  const who = (a && (a.getAttribute('title') || a.getAttribute('aria-label') || '')) || '';
  if (!EXAM_OWNER.test(who)) return null;
  return EXAM_SEED.map((x) => ({
    title: x.when + ' \u00b7 ' + x.time + ' \u00b7 ' + x.room,
    subject: x.subject,
    topic: '',
    type: 'Examination',
    due: x.day + 'T' + x.at + ':00',
    code: '',
  }));
}
function upcomingBlock(upcoming, filterClass, parentRerender) {
  const wrap = el('div', { class: 'wt-up' });
  const chev = chevron();
  chev.classList.add('open');
  const minus = el('button', { class: 'wt-up-btn', title: 'Remove assessments' }, '−');
  const plus = el('button', { class: 'wt-up-btn', title: 'Add / restore assessments' }, '+');
  const head = el('div', { class: 'wt-up-head', role: 'button', tabindex: '0' }, L.upcoming, chev, el('span', { class: 'wt-sec-count' }, ''), minus, plus);
  const body = el('div', { class: 'wt-up-body open' });
  let deleteMode = false;
  const baseList = () => {
    const seed = filterClass ? null : examSeedList();
    if (seed) return seed;
    const list = filterClass ? upcomingFor(filterClass, upcoming) : upcoming;
    const deleted = loadJSON(UP_DEL_KEY, []);
    const added = loadJSON(UP_ADD_KEY, []).filter((a) => (!filterClass || codeList(filterClass).includes(a.code)) && !loadJSON(UP_DEL_KEY, []).some((d) => d.title === a.title && (d.due || '') === (a.due || '')));
    const clsOf = (code) => (SNAP || []).find((c) => codeList(c).includes(String(code || '').toLowerCase())) || null;
    const merged = [...list.filter((u) => !deleted.some((d) => d.title === u.title && (d.due || '') === (u.due || ''))), ...added.map((a) => {
      const c = clsOf(a.code);
      return { title: a.title, subject: c ? subjectName(c.name) : subjectName(a.subject || a.code), topic: '', type: 'Custom', due: a.due, code: a.code };
    })];
    return merged;
  };
  const draw = () => {
    body.replaceChildren();
    const list = baseList();
    head.querySelector('.wt-sec-count').textContent = String(list.length);
    if (!list.length) { body.append(el('div', { class: 'wt-empty' }, '—')); return; }
    const ul = el('ul');
    for (const u of list) {
      const days = daysLeft(u.due);
      const exam = isExamItem(u);
      const li = el('li', { class: deleteMode ? 'wt-up-li-del' : '' },
        el('span', { class: 'wt-cd' + (days != null && days <= 7 ? ' soon' : '') }, days == null ? '' : (days <= 0 ? (hoursLabel(u.due) || L.inDays(days)) : L.inDays(days))),
        el('b', null, subjectName(u.subject || L.class)),
        el('span', null, u.title),
        !exam && u.topic ? el('span', { class: 'wt-topic' }, ` · ${L.covers}: ${u.topic}`) : null,
      );
      if (deleteMode) {
        const del = el('button', { class: 'wt-up-del', title: 'Remove' }, '×');
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          confirmAt(del, () => {
            const deleted = loadJSON(UP_DEL_KEY, []).filter((x) => !x.forgotten);
            deleted.push({ title: u.title, due: u.due || '', subject: u.subject || '', topic: u.topic || '', type: u.type || '' });
            saveJSON(UP_DEL_KEY, deleted);
            draw();
            snackbar('Removed: ' + u.title, () => {
              const d2 = loadJSON(UP_DEL_KEY, []).filter((x) => !(x.title === u.title && (x.due || '') === (u.due || '')));
              saveJSON(UP_DEL_KEY, d2);
              draw();
            });
          });
        });
        const lead = el('span', { class: 'wt-up-lead' });
        lead.append(del);
        li.prepend(lead);
      }
      ul.append(li);
    }
    body.append(ul);
  };
  minus.addEventListener('click', (e) => { e.stopPropagation(); deleteMode = !deleteMode; minus.classList.toggle('on', deleteMode); body.style.transform = deleteMode ? 'translateX(-6px)' : 'none'; draw(); });
  plus.addEventListener('click', (e) => {
    e.stopPropagation();
    const deleted = loadJSON(UP_DEL_KEY, []).filter((x) => !x.forgotten);
    const restoreWrap = el('div', { class: 'wt-up-restore' });
    if (deleted.length) {
      restoreWrap.append(el('div', { class: 'wt-field-label' }, 'Deleted assessments'));
      for (const d of deleted) {
        const row = el('div', { class: 'wt-restore-row' });
        const btn = el('button', { class: 'wt-restore-btn' }, 'Restore · ' + cleanName(String(d.title || '')));
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const rest = loadJSON(UP_DEL_KEY, []).filter((x) => !(x.title === d.title && (x.due || '') === (d.due || '')));
          saveJSON(UP_DEL_KEY, rest);
          hideRestoreRow(row);
          draw();
          snackbar('Restored: ' + d.title, () => { const b = loadJSON(UP_DEL_KEY, []); b.push(d); saveJSON(UP_DEL_KEY, b); showRestoreRow(row); draw(); });
        });
        const x = el('button', { class: 'wt-restore-x', title: 'Forget this item' }, '×');
        x.addEventListener('click', (ev) => {
          ev.stopPropagation();
          confirmAt(x, () => {
            const marked = loadJSON(UP_DEL_KEY, []).map((y) => (y.title === d.title && (y.due || '') === (d.due || '') ? { ...y, forgotten: true } : y));
            saveJSON(UP_DEL_KEY, marked);
            hideRestoreRow(row);
            if (restoreWrap.querySelectorAll('.wt-restore-row:not([style*="display: none"])').length === 0) restoreWrap.style.display = 'none';
            draw();
            snackbar('Forgotten: ' + d.title, () => {
              const back = loadJSON(UP_DEL_KEY, []).map((y) => (y.title === d.title && (y.due || '') === (d.due || '') ? { ...y, forgotten: false } : y));
              saveJSON(UP_DEL_KEY, back);
              showRestoreRow(row);
              restoreWrap.style.display = '';
              draw();
            });
          });
        });
        row.append(x, btn);
        restoreWrap.append(row);
      }
    }
    openFormModal({
      title: 'Add assessment',
      fields: [
        { name: 'code', type: 'select', label: 'Subject', required: true, placeholder: 'Select a subject…', options: pickList().map((c) => ({ value: c.code, label: displayName(c) })) },
        { name: 'title', type: 'text', label: 'Assessment', required: true, placeholder: 'e.g. Task 5 – Data analysis' },
        { name: 'due', type: 'date', label: 'Due date', required: true },
      ],
      submitLabel: 'Add assessment',
      extra: restoreWrap,
      onSubmit: (v) => {
        const added = loadJSON(UP_ADD_KEY, []);
        const cls = pickList().find((c) => c.code === v.code) || (SNAP || []).find((c) => codeList(c).includes(String(v.code || '').toLowerCase()));
        added.push({ code: v.code, title: v.title.trim(), due: v.due, subject: cls ? displayName(cls) : v.code });
        saveJSON(UP_ADD_KEY, added);
        draw();
        if (parentRerender) parentRerender();
      },
    });
  });
  head.addEventListener('click', (e) => { if (e.target.closest('.wt-up-btn')) return; toggleSection(body, head, chev); });
  wrap.append(head, body);
  draw();
  return wrap;
}

function renderTaskTab(classes, active, rerender) {
  const prefs = sectionPrefs(loadPrefs(), 'tdt');
  const activeCls = active === 'all' ? null : classes.find((c) => (c.code || c.name) === active);
  const list = activeCls ? [activeCls] : classes.filter((c) => !prefs.hiddenSubjects.includes(c.code || c.name));
  const cards = [];
  for (const c of list) cards.push(...taskCardsFor(c));
  const body = el('div', { class: 'wt-tab-body open' });
  const customFor = (cls) => customCards('tdt').filter((x) => codeList(cls).includes(String(x.code).toLowerCase()) || cls.code === x.code).map((x) => ({ cls, custom: true, item: { title: x.title, detail: x.detail, kind: 'other', links: [] } }));
  const all = [];
  for (const c of list) all.push(...customFor(c), ...taskCardsFor(c));
  if (active === 'all') {
    for (const x of customCards('tdt')) {
      if (list.some((c) => codeList(c).includes(String(x.code).toLowerCase()))) continue;
      const cls = (SNAP || []).find((c) => codeList(c).includes(String(x.code).toLowerCase()));
      if (cls) all.push({ cls, custom: true, item: { title: x.title, detail: x.detail, kind: 'other', links: [] } });
    }
  }
  if (all.length) {
    const gridEl = gridWithPrefs(all, (c) => (c.custom ? 'c|' + c.cls.code + '|' + c.item.title : taskKey(c)), prefs, 'tdt', (c) => (c.custom ? customCard(c, 'tdt', rerender) : taskCard(c)), rerender);
    body.append(gridEl);
  }
  else {
    const msg = prefs.hiddenCards.length
      ? 'No visible tasks right now. Hidden ones are available via Settings → Edit.'
      : 'No tasks for now.';
    body.append(el('div', { class: 'wt-empty-placeholder' }, msg));
  }
  return body;
}

function renderDueTab(classes, dueList, upcoming, active, done, rerender) {
  const prefs = sectionPrefs(loadPrefs(), 'due');
  const activeCls = active === 'all' ? null : classes.find((c) => (c.code || c.name) === active);
  const list = activeCls ? [activeCls] : classes.filter((c) => !prefs.hiddenSubjects.includes(c.code || c.name));
  const items = dueList.filter((d) => list.includes(d.cls));
  /* tab 上改过的课程别名，Due 卡也要认；Due 页抓来的 code 可能带 "G/" 前缀，几种 key 都试 */
  /* 卡片的缩略必须和模态里那段一样：抓过就先用缓存，没抓过等模态抓完回填 */
  for (const d of items) {
    const href = assessHrefOf(d);
    if (!href) continue;
    const cached = assessCacheGet(href);
    /* 卡片和模态用同一个字段：卡片由 CSS 截三行，模态显示全文（0.1.0 的做法） */
    if (cached) d.detail = cached;
    const cf = assessCacheFiles(href);
    if (cf && cf.length) d.files = cf;
    else if (!cached) delete d.detail;
  }
  let aliasMap = {};
  try { aliasMap = JSON.parse(localStorage.getItem('wesleySubjectAlias') || '{}') || {}; } catch { /* ignore */ }
  for (const d of items) {
    try {
      const c = d.cls || {};
      const cands = [c.code, c.code ? String(c.code).replace(/^[^/]*\//, '') : '', c.name];
      d.__label = cands.find((k) => k && aliasMap[k]) ? aliasMap[cands.find((k) => k && aliasMap[k])] : c.name;
    } catch { /* 别名挂了不影响卡片 */ }
  }
  const body = el('div', { class: 'wt-tab-body open' });
  const customDue = customCards('due').filter((x) => list.some((c) => codeList(c).includes(String(x.code).toLowerCase()) || c.code === x.code)).map((x) => {
    const c = list.find((y) => codeList(y).includes(String(x.code).toLowerCase()) || y.code === x.code);
    return { key: 'wc|' + x.code + '|' + x.title, cls: c, title: x.title, meta: 'Custom', links: [], days: null, detail: x.detail };
  });
  /* 自定义卡片要标 custom 并带上 cls/item：删除模式靠 it.custom 分辨「自建卡」和「站点卡」，
     站点卡走 wesleyDeletedCards 隐藏，自建卡要从 wesleyCustom 里真删掉。以前没标，
     删自建卡走的是站点卡那条路 —— 卡是没了，但 wesleyCustom 里还留着，
     「已删除」里也只剩一个标题叫 "Card" 的条目，认不出是哪张。 */
  const all = [
    ...items.map((d) => ({ kind: 'due', d, key: dueItemKey(d) })),
    ...customDue.map((d) => ({ kind: 'due', d, key: d.key, custom: true, cls: d.cls, item: { title: d.title, detail: d.detail } })),
  ];
  if (all.length) { body.append(gridWithPrefs(all, (x) => x.key, prefs, 'due', (x) => dueCard(x.d, done, rerender), rerender)); }
  else {
    const msg = prefs.hiddenCards.length
      ? 'Nothing visible due right now. Hidden cards are available via Settings → Edit.'
      : 'Nothing due right now.';
    body.append(el('div', { class: 'wt-empty-placeholder' }, msg));
  }
  /* 卡片先出来，正文在后台补。补完直接改卡片文字，不重排整个 grid。 */
  enrichDueList(items);
  body.append(upcomingBlock(upcoming, activeCls, rerender));
  return body;
}

const sectionTimers = new WeakMap();

const THEME_PRESETS = { '1': { from: '#f7f2f9', to: '#efe4f4', head: '#f7f2f9' } };

function animMs(ms) {
  const speed = Math.max(0.25, Math.min(5, Number(settings && settings.animSpeed) || 1));
  return Math.round(ms / speed);
}
function toggleSection(body, head, chev) {
  const busyOn = () => document.documentElement.classList.add('wt-busy');
  const busyOff = () => {
    if (!document.querySelector('.wt-panel-body[style*="transition"], .wt-sec-body[style*="transition"], .wt-up-body[style*="transition"]')) {
      document.documentElement.classList.remove('wt-busy');
    }
  };
  if (document.documentElement.classList.contains('wt-no-smooth')) {
    const open = body.classList.toggle('open');
    if (chev) chev.classList.toggle('open', open);
    body.style.height = open ? '' : '0px';
    return;
  }
  if (sectionTimers.has(body)) {
    clearTimeout(sectionTimers.get(body));
    body.style.transition = '';
    body.style.height = '';
  }
  const open = body.classList.contains('open');
  if (open) {
    const h = body.getBoundingClientRect().height;
    body.style.overflow = 'hidden';
    body.style.height = h + 'px';
    body.style.transition = 'height ' + (animMs(400) / 1000) + 's cubic-bezier(.4,0,.2,1)';
    body.classList.remove('open');
    if (chev) chev.classList.remove('open');
    busyOn();
    requestAnimationFrame(() => { body.style.height = '0px'; });
    sectionTimers.set(body, setTimeout(() => { body.style.height = '0px'; body.style.transition = ''; body.style.overflow = 'hidden'; sectionTimers.delete(body); busyOff(); }, animMs(420)));
  } else {
    body.style.overflow = 'hidden';
    body.style.willChange = 'height';
    body.classList.add('open');
    body.style.height = '0px';
    body.style.transition = 'height ' + (animMs(400) / 1000) + 's cubic-bezier(.4,0,.2,1)';
    if (chev) chev.classList.add('open');
    busyOn();
    requestAnimationFrame(() => { body.style.height = body.scrollHeight + 'px'; });
    sectionTimers.set(body, setTimeout(() => { body.style.height = ''; body.style.transition = ''; body.style.overflow = 'visible'; body.style.willChange = ''; sectionTimers.delete(body); busyOff(); }, animMs(420)));
  }
}

/* 网络断掉时退回最近一次成功抓到的数据（PLAN-beta7 §4.8） */
let CACHE_AT = 0;
function loadCachedDay() {
  try {
    let best = null;
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith('wesleyLocal:')) continue;
      let v = null;
      try { v = JSON.parse(localStorage.getItem(k) || 'null'); } catch { continue; }
      if (!v || !Array.isArray(v.classes) || !v.classes.length) continue;
      if (!best || (v.at || 0) > (best.at || 0)) best = { classes: v.classes, at: v.at || 0 };
    }
    return best;
  } catch { return null; }
}
function agoText(ms) {
  const mins = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (mins < 60) return mins + ' min';
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + ' h';
  return Math.round(hours / 24) + ' d';
}
function renderCacheNote(host) {
  try {
    if (!host || !CACHE_AT) return;
    if (host.querySelector('.wt-cache-note')) return;
    const head = host.querySelector('.wt-summary-head');
    const note = el('div', { class: 'wt-cache-note', role: 'status' },
      el('span', { class: 'wt-cache-txt' }, String(L.cacheStale || 'Using saved data from {ago}').replace('{ago}', agoText(CACHE_AT))),
      el('button', { class: 'wt-cache-retry', type: 'button', onclick: () => location.reload() }, L.cacheRetry || 'Retry'));
    if (head && head.nextSibling) head.parentNode.insertBefore(note, head.nextSibling);
    else if (head) head.parentNode.append(note);
    else host.insertBefore(note, host.firstChild);
  } catch { /* ignore */ }
}
function buildSummary(state) {
  /* 周末/假期的页面上站点根本不渲染 [data-timetable-header]，state.header 会是 null。
     以前这里直接 return，结果整块面板永远停在骨架里 —— 只有「收警告提示」需要 header。 */
  const header = state.header || null;
  /* 面板开始出东西了，「读不到课表」那条提示就该收回去 */
  if (header) { try { const w = header.querySelector && header.querySelector('.wt-warn'); if (w) w.remove(); } catch (e) { /* ignore */ } }
  const periods = state.periods.filter((p) => p.subject);
  const classes = classList(state.periods);
  AVAIL_CLASSES = classes;
  const upcoming = parseUpcoming();
  const done = loadDone();
  const due = [];
  const taskCount = classes.reduce((n, c) => n + taskCardsFor(c).length, 0);
  const dueBadge = el('span', { class: 'wt-sec-count' }, '');
  const keyOf = (c) => c.code || c.name;
  let extraClasses = [];
  let dueWorkCache = null;
  const allClasses = () => classes.concat(extraClasses);
  const labelOf = (c) => displayName(c);
  /* 这个人自己的全部课程：今天的 + 今天没课但有事要做的 + 站点课程表里的全部。
     设置里的 Show in All 用它，不能只看当天（周六只剩六门，第七门就消失了）。 */
  const subjectChoices = () => {
    const seen = new Set();
    const out = [];
    const push = (c) => {
      if (!c) return;
      const nm = String(c.name || '').trim();
      if (!nm) return;   // 设置里的课程列表要含 Tutor Group（它在课表里占一格，用户要能看到）
      if (/^[A-Z0-9]{3,}[-0-9A-Z]*$/.test(nm)) return;   // 剩下只有代码没有名字的条目（集会之类）
      if (/^(Glen Waverley Senior School|VCE|Year \d+ Students.*)$/i.test(nm)) return;
      const k = normCode(keyOf(c)) || String(c.name || '').toLowerCase();
      if (!k || seen.has(k)) return;
      seen.add(k);
      out.push(c);
    };
    classes.forEach(push);
    extraClasses.forEach(push);
    for (const sub of (ALL_SUBJECTS || [])) {
      const hit = (SNAP || []).find((c) => c.code && sub.code && codeList(c).includes(String(sub.code).toLowerCase()));
      push(hit ? Object.assign({}, hit, { name: hit.name || sub.name, homepage: hit.homepage || sub.homepage }) : sub);
    }
    return out;
  };
  PICK_LIST = subjectChoices;
  const settingsTabs = () => [
    { key: 'all', label: L.all },
    ...subjectChoices().map((c) => ({ key: keyOf(c), label: labelOf(c) })),
  ];
  const buildTabs = () => [
    { key: 'all', label: L.all },
    ...classes.map((c) => ({ key: keyOf(c), label: labelOf(c) })),
    ...extraClasses.map((c) => ({ key: keyOf(c), label: labelOf(c), extra: true })),
  ];
  let tabs = buildTabs();
  let tdtActive = 'all';
  let dueActive = 'all';
  const tdtContent = el('div', { class: 'wt-tab-content' });
  const dueContent = el('div', { class: 'wt-tab-content' });

  const swapTimers = new WeakMap();
  const animateSwap = (host, mutate) => {
    if (swapTimers.has(host)) {
      clearTimeout(swapTimers.get(host));
      host.style.transition = '';
      host.style.height = '';
      host.style.overflow = '';
    }
    if (!settings.smooth) { mutate(); return; }
    const h0 = host.getBoundingClientRect().height;
    mutate();
    const h1 = host.getBoundingClientRect().height;
    if (Math.abs(h1 - h0) < 1) return;
    host.style.height = h0 + 'px';
    host.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      host.style.transition = 'height ' + (animMs(400) / 1000) + 's cubic-bezier(.4,0,.2,1)';
      host.style.height = h1 + 'px';
    });
    const timer = setTimeout(() => { host.style.transition = ''; host.style.height = ''; host.style.overflow = ''; swapTimers.delete(host); }, animMs(430));
    swapTimers.set(host, timer);
  };
  const countTodo = () => {
    try {
      let n = 0;
      for (const c of allClasses()) n += taskCardsFor(c).length;
      n += customCards('tdt').filter((x) => classes.some((c) => codeList(c).includes(String(x.code).toLowerCase()) || c.code === x.code)).length;
      todoCountEl.textContent = String(n);
      if (headCountEl) headCountEl.textContent = n + ' ' + L.tasks;   // 已停用，留个口子
    } catch { /* ignore */ }
  };
  const drawTdtContent = () => { syncEditable(); animateSwap(tdtContent, () => { tdtContent.replaceChildren(renderTaskTab(allClasses(), tdtActive, drawTdtContent)); countTodo(); }); };
  const countDue = () => {
    try { const n = due.length; if (dueBadge) dueBadge.textContent = String(n); } catch { /* ignore */ }
  };
  const drawDueContent = () => { syncEditable(); animateSwap(dueContent, () => { dueContent.replaceChildren(renderDueTab(allClasses(), due, upcoming, dueActive, done, drawDueContent)); countDue(); }); };

  const refreshExtraClasses = () => {
    try {
      const have = new Set(classes.map(keyOf));
      const haveName = new Set(classes.map((c) => String(c.name || '').toLowerCase()));
      // 同一门课站点会写成 G/M10LAEO- 或 G/M10LAE0-（字母 O 与数字 0），只比 key 会多出一个莫名其妙的课
      const haveNorm = new Set(classes.flatMap((c) => codeList(c).map(normCode)).filter(Boolean));
      const snap = SNAP || [];
      const subs = ALL_SUBJECTS || [];
      const merged = [];
      for (const sub of subs) {
        const hit = snap.find((c) => (sub.code && codeList(c).includes(sub.code.toLowerCase())) || String(c.name || '') === sub.name);
        merged.push(hit ? Object.assign({}, hit, { color: hit.color || sub.color, homepage: hit.homepage || sub.homepage }) : sub);
      }
      for (const c of snap) {
        if (!c || !c.homepage) continue;
        if (merged.some((x) => keyOf(x) === keyOf(c))) continue;
        merged.push(c);
      }
      // 没有 code 的条目多半是站点同一门课的重复快照（例如 10 Lang Acquisition: English 3），一律不进额外课程
      const codeOk = (c) => /^[A-Za-z0-9/_.-]+$/.test(String(c.code || '').trim());  // 课名被当成 code 的假条目不要
      const pool = merged.filter((c) => c && c.homepage && codeOk(c) && !have.has(keyOf(c))
        && !haveName.has(String(c.name || '').toLowerCase())
        && !haveNorm.has(normCode(c.code || '')));
      /* 原来只留「有条目要做」的课，结果这学期不在当天课表里的那门（Language Acquisition
         English）永远进不来，Due 里也翻不到。改成全留，只是把有活的排前面。 */
      const realWork = (c) => {
        const items = normItems(c) || [];
        if (items.length) return true;
        const lp = c.latestPost;
        return !!(lp && Array.isArray(lp.tasks) && lp.tasks.length);
      };
      const withWork = pool.filter((c) => !/tutor group/i.test(String(c.name || '')));
      withWork.sort((a, b) => {
        const wa = realWork(a) ? 1 : 0;
        const wb = realWork(b) ? 1 : 0;
        if (wa !== wb) return wb - wa;
        const ta = Date.parse((a.latestPost && a.latestPost.publishAt) || 0) || 0;
        const tb = Date.parse((b.latestPost && b.latestPost.publishAt) || 0) || 0;
        return tb - ta;
      });
      const next = withWork.slice(0, 8);
      const sig = (arr) => arr.map(keyOf).join('|');
      if (sig(next) === sig(extraClasses)) return false;
      extraClasses = next;
      tabs = buildTabs();
      if (dueWorkCache) { due.splice(0, due.length, ...dueFor(allClasses(), dueWorkCache)); if (dueBadge) dueBadge.textContent = String(due.length); }
      for (const bar of [tdtBar, dueBar]) if (bar && bar.setTabs) bar.setTabs(tabs, bar === tdtBar ? tdtActive : dueActive);
      wtLog('extra classes: ' + (extraClasses.map(keyOf).join(',') || 'none'));
      return true;
    } catch { return false; }
  };
  const drawBoth = () => { if (refreshExtraClasses()) { drawTdtContent(); drawDueContent(); } };
  const renameSubject = (key, api) => {
    const btn = document.querySelector('.wt-tabs .wt-tab[data-key="' + key.replace(/"/g, '\\"') + '"]');
    if (!btn || btn.querySelector('input')) return;
    const old = btn.textContent;
    const input = el('input', { class: 'wt-tab-rename', value: ALIAS[key] || old });
    btn.textContent = '';
    btn.append(input);
    input.focus();
    input.select();
    const commit = (save) => {
      if (!input.isConnected) return;
      const v = input.value.trim();
      const base = subjectName(((classes.concat(extraClasses)).find((c) => keyOf(c) === key) || {}).name || '');
      if (save) { if (v && v !== base) ALIAS[key] = v; else delete ALIAS[key]; saveAlias(); }
      input.remove();
      btn.textContent = old;
      tabs = buildTabs();
      for (const [bar, key2] of [[tdtBar, tdtActive], [dueBar, dueActive]]) {
        const b = bar && bar.querySelector('.wt-tabs');
        if (b && b.classList.contains('wt-tabs-editable')) b.classList.remove('wt-tabs-editable');
        if (bar && bar.setTabs) bar.setTabs(tabs, key2 === key ? key : key2);
      }
      syncEditable();
      drawTdtContent(); drawDueContent();
    };
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(true); }
      if (ev.key === 'Escape') { ev.preventDefault(); commit(false); }
    });
    input.addEventListener('blur', () => commit(true));
  };
  const syncEditable = () => {
    const on = !!(EDIT.tdt || EDIT.due);
    for (const bar of [tdtBar, dueBar]) { const b = bar && bar.querySelector('.wt-tabs'); if (b) b.classList.toggle('wt-tabs-editable', on); }
  };

  function nextSchoolDay(from) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let i = 1; i <= 7; i += 1) {
      const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      if (t.getDay() !== 0 && t.getDay() !== 6) return t;
    }
    return d;
  }

  let WT_UID = null;
  async function siteUserId() {
    if (WT_UID !== null) return WT_UID;
    WT_UID = '';
    try {
      const m = /userId:\s*Number\('(\d+)'\)/.exec(document.documentElement.innerHTML);
      if (m) WT_UID = m[1];
    } catch { /* ignore */ }
    if (!WT_UID) {
      try {
        const h = await (await fetch('/home', { credentials: 'include' })).text();
        const m = /userId:\s*Number\('(\d+)'\)/.exec(h);
        if (m) WT_UID = m[1];
      } catch { /* ignore */ }
    }
    return WT_UID;
  }
  async function fetchDayPeriods(day) {
    const uid = await siteUserId();
    const mk = Math.floor(day.getTime() / 1000);
    const url = '/calendar/ajax/full?start=' + mk + '&end=' + (mk + 86400) + (uid ? '&userId=' + uid : '');
    let data = null;
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ac ? setTimeout(() => { try { ac.abort(); } catch (e) { /* ignore */ } }, 8000) : 0;
    try {
      const res = await fetch(url, { credentials: 'include', headers: { 'x-requested-with': 'XMLHttpRequest' }, signal: ac ? ac.signal : undefined });
      if (res.ok) data = await res.json();
    } catch { /* ignore */ } finally { clearTimeout(timer); }
    if (!Array.isArray(data)) return [];
    const durMin = (e) => (new Date(e.end || 0) - new Date(e.start || 0)) / 60000;
    const clock = (v) => {
      const d = new Date(v);
      let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? 'pm' : 'am';
      h = h % 12 || 12;
      return h + ':' + String(m).padStart(2, '0') + ap;
    };
    return data
      .filter((e) => e && !e.allDay && e.start && /type24/.test(e.className || '') && durMin(e) >= 5)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .map((e) => {
        const t = String(e.title || '');
        const inside = (t.match(/\(([^)]*)\)/) || [])[1] || '';
        const parts = inside.split('/').map((x) => x.trim()).filter(Boolean);
        const code = (parts.length > 1 ? parts[parts.length - 1] : inside).replace(/[^A-Za-z0-9-]/g, '').trim();
        const name = t.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/,\s*[A-Z]?\d{2,4}[A-Z]?\s*$/, '').replace(/\s+/g, ' ').trim();
        return { code: code.toLowerCase(), name, from: clock(e.start), to: clock(e.end) };
      });
  }

  // ── Day 1–10 课表网格：拿 /timetable 那张表当数据源 ────────────────────
  // 站点只在有课日渲染 h2[data-timetable-header]（"Day 5"），周末根本没有这个节点，
  // 所以日期↔Day 的对应只能自己算：先按 /timetable 建一张 Day 1..10 的表，
  // 拿到某天的课再用「代码对得上最多」反推是 Day 几。
  let TT_GRID = null;
  let TT_GRID_AT = 0;
  async function loadTtGrid() {
    if (TT_GRID && Date.now() - TT_GRID_AT < 5 * 60 * 1000) return TT_GRID;
    try {
      const res = await withTimeout(fetch('/timetable', { credentials: 'include' }), 4500, null);
      if (!res) return TT_GRID;
      if (!res.ok) return TT_GRID;
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const tbl = doc.querySelector('table.timetable');
      if (!tbl) return TT_GRID;
      const heads = [...tbl.querySelectorAll('thead th')].map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim());
      /* 表里最后一两行是站点自己的杂项（时间对不上、没有节次名），只要
         Homeroom / Period N 那些行 —— 否则合成表会多出一列。 */
      const trs = [...tbl.querySelectorAll('tbody tr')].filter((tr) => {
        const t = (tr.children[0] ? tr.children[0].textContent : '').replace(/\s+/g, ' ').trim();
        return /^(homeroom|period\s*\d+)/i.test(t);
      });
      const periods = trs.map((tr) => {
        const first = tr.children[0];
        const t = (first ? first.textContent : '').replace(/\s+/g, ' ').trim();
        const m = /^(.*?)\s*(\d{1,2}:\d{2})\s*(am|pm)?\s*[–-]\s*(\d{1,2}:\d{2})\s*(am|pm)?/i.exec(t);
        if (!m) return { label: t, from: '', to: '' };
        const from = m[2] + (m[3] || '');
        const to = m[4] + (m[5] || '');
        return { label: (m[1] || '').trim(), from, to };
      });
      const days = [];
      const cols = heads.length || 11;
      for (let c = 1; c < cols; c += 1) {
        const cells = trs.map((tr) => {
          const td = tr.children[c];
          if (!td) return null;
          const txt = (td.textContent || '').replace(/\s+/g, ' ').trim();
          if (!txt) return null;
          const a = td.querySelector('a');
          let code = '';
          const mh = /\/homepage\/code\/([^/?#]+)/.exec((a && a.getAttribute('href')) || '');
          if (mh) { try { code = decodeURIComponent(decodeURIComponent(mh[1])); } catch (e) { code = mh[1]; } }
          // 站点写法是「课名 (编号) 教室 老师」，只留课名和教室：编号和老师都不显示
          const pm = /^(.*?)\s*\(([^)]+)\)\s*([\s\S]*)$/.exec(txt);
          const name = (pm ? pm[1] : txt).trim() || txt;
          const rest = (pm ? pm[3] : '').split(/\s+/).filter(Boolean);
          let room = '';
          if (rest.length && /^[A-Z]{1,2}\d{1,3}[A-Z]?$/i.test(rest[0])) room = rest[0];
          else if (rest.length && /^(study|room|hall|library|gym|lab|centre|center)/i.test(rest[0])) room = rest.slice(0, 2).join(' ');
          return { code: code || (pm ? pm[2] : ''), room, name };
        });
        days.push({ n: c, label: heads[c] || ('Day ' + c), cells });
      }
      if (days.length) { TT_GRID = { periods, days }; TT_GRID_AT = Date.now(); }
      return TT_GRID;
    } catch (e) { return TT_GRID; }
  }
  async function dayNumForDate(date, grid) {
    let per = [];
    try { per = await fetchDayPeriods(date); } catch (e) { per = []; }
    if (!per || !per.length) return null;
    const want = per.map((x) => normCode(x.code)).filter(Boolean);
    if (!want.length) return null;
    let best = null;
    let bestScore = 0;
    for (const d of grid.days) {
      const have = d.cells.filter(Boolean).map((c) => normCode(c.code)).filter(Boolean);
      let score = 0;
      for (const w of want) if (have.indexOf(w) >= 0) score += 1;
      if (score > bestScore) { bestScore = score; best = d.n; }
    }
    return bestScore ? best : null;
  }

  /* 把「这天算 Day 几」暴露给模块级的标题用（ensureTtHead 拿到标题后调用）。 */
  TT_DAY_RESOLVER = async (d) => {
    try { const g = await loadTtGrid(); if (!g || !g.days || !g.days.length) return null; return await dayNumForDate(d, g); } catch { return null; }
  };

  // 非模态小浮层（Day 选择器 / 日期选择器共用）：点空白关掉，不开遮罩
  function ndPop(box, make, opener) {
    let pop = box.querySelector('.wt-nd-pop');
    // 再点同一颗按钮 = 收起；点另一颗 = 换一个浮层
    if (pop && pop.dataset.opener === opener) { pop.remove(); return null; }
    if (pop) pop.remove();
    pop = el('div', { class: 'wt-nd-pop' });
    pop.dataset.opener = opener;
    make(pop);
    box.append(pop);
    const onDoc = (ev) => {
      if (!pop.isConnected) { document.removeEventListener('mousedown', onDoc, true); return; }
      if (pop.contains(ev.target) || (ev.target.closest && ev.target.closest('.wt-nd-daybtn,.wt-nd-calbtn'))) return;
      pop.remove();
      document.removeEventListener('mousedown', onDoc, true);
    };
    setTimeout(() => document.addEventListener('mousedown', onDoc, true), 0);
    return pop;
  }

  function ndCalendar(pop, onPick, state) {
    let view = new Date();
    view = new Date(view.getFullYear(), view.getMonth(), 1);
    const draw = () => {
      pop.replaceChildren();
      const head = el('div', { class: 'wt-nd-calhead' });
      const mk = (txt, delta) => {
        const b = el('button', { class: 'wt-nd-calnav', type: 'button' }, txt);
        b.addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + delta, 1); draw(); });
        return b;
      };
      head.append(mk('‹', -1), el('div', { class: 'wt-nd-calmonth' }, view.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })), mk('›', 1));
      pop.append(head);
      const grid = el('div', { class: 'wt-nd-calgrid' });
      for (const w of ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']) grid.append(el('div', { class: 'wt-nd-calwd' }, w));
      const first = new Date(view.getFullYear(), view.getMonth(), 1);
      const lead = first.getDay();   // 周日排第一列
      const dim = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (let i = 0; i < lead; i += 1) grid.append(el('div', { class: 'wt-nd-calcell is-blank' }));
      const today = new Date();
      for (let d = 1; d <= dim; d += 1) {
        const cell = new Date(view.getFullYear(), view.getMonth(), d);
        const wd = cell.getDay();
        const off = wd === 0 || wd === 6;   // 周末灰色不可选
        const now = cell.getFullYear() === today.getFullYear() && cell.getMonth() === today.getMonth() && cell.getDate() === today.getDate();
        const iso = cell.getFullYear() + '-' + String(cell.getMonth() + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        const sel = state && state.iso === iso;
        const cls = 'wt-nd-calcell' + (off ? ' is-off' : '') + (now ? ' is-today' : '')
          + (sel ? (state.faint ? ' is-sel-faint' : ' is-sel') : '');
        const b = el('button', { class: cls, type: 'button', disabled: off ? 'disabled' : null }, String(d));
        if (!off) b.addEventListener('click', () => { onPick(cell); pop.remove(); });
        grid.append(b);
      }
      pop.append(grid);
    };
    draw();
  }

  async function openNextDay(classes) {
    const today = new Date();
    const date0 = nextSchoolDay(today);
    const overlay = el('div', { class: 'wt-modal-overlay', role: 'dialog', 'aria-modal': 'true' });
    const box = el('div', { class: 'wt-modal wt-nextday-modal' });
    const close = () => overlay.remove();
    const titleEl = el('div', { class: 'wt-modal-title' }, 'Timetable');
    const dayBtn = el('button', { class: 'wt-nd-daybtn', type: 'button', title: 'Pick Day 1–10' }, 'Day ·');
    const calBtn = el('button', { class: 'wt-nd-calbtn', type: 'button', title: 'Pick a date', 'aria-label': 'Pick a date' });
    calBtn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3"/></svg>';
    const xBtn = el('button', { class: 'wt-modal-x', 'aria-label': 'Close' }, '×');
    xBtn.addEventListener('click', close);
    box.append(el('div', { class: 'wt-modal-head' }, titleEl, el('div', { class: 'wt-nd-tools' }, dayBtn, calBtn, xBtn)));
    const body = el('div', { class: 'wt-modal-body' }, el('div', { class: 'wt-loading' }, 'Reading the timetable…'));
    box.append(body);
    overlay.append(box);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });
    document.body.append(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const grid = await loadTtGrid();
    let curDate = date0;
    let curDay = null;

    const dayOf = (() => {
      const m = /^Day\s*(\d+)$/i.exec((() => {
        const h = document.querySelector('[data-timetable-header]');
        return h ? (h.textContent || '').trim() : '';
      })());
      return m ? Number(m[1]) : null;
    })();

    const titleFor = () => {
      const lab = curDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
      return 'Timetable · ' + (curDay ? 'Day ' + curDay + ' · ' : '') + lab;
    };

    const clsByCode = (code) => {
      const c = normCode(code || '');
      if (!c) return null;
      return (classes || []).find((x) => codeList(x).some((k) => normCode(k) === c))
        || (SNAP || []).find((x) => codeList(x).some((k) => normCode(k) === c))
        || null;
    };

    const renderDay = (dayN, srcDate) => {
      body.replaceChildren();
      titleEl.textContent = titleFor();
      dayBtn.textContent = dayN ? 'Day ' + dayN : 'Day ·';
      dayBtn.classList.toggle('on', !!dayN);
      if (!grid || !dayN) {
        body.append(el('div', { class: 'wt-empty-placeholder' }, 'No timetable for this day.'));
        return;
      }
      const d = grid.days[dayN - 1];
      if (!d) { body.append(el('div', { class: 'wt-empty-placeholder' }, 'Day ' + dayN + ' is not in the timetable.')); return; }
      const rows = el('div', { class: 'wt-nextday-rows' });
      const any = d.cells.some(Boolean);
      let seen = false;
      grid.periods.forEach((p, i) => {
        const cell = d.cells[i];
        /* 前面还没课的那几节不占行；一旦这天开课了，后面空着的节次也要留一行，
           不然最后一节没课时 Period 6 整行消失，和站点原版对不上。 */
        if (!cell && !seen) return;
        if (cell) seen = true;
        const cls = cell ? clsByCode(cell.code) : null;
        const tasks = cls ? taskCardsFor(cls).slice(0, 3) : [];
        const openable = !!cls && tasks.length > 0;
        const row = el('div', { class: 'wt-nextday-row wt-nextday-card' + (cell ? '' : ' is-empty') + (openable ? '' : ' is-static') });
        row.append(
          el('div', { class: 'wt-nextday-time' }, p.from ? p.from + ' – ' + p.to : ''),
          el('div', { class: 'wt-nextday-main' },
            cell
              ? el('div', { class: 'wt-nextday-name' }, cell.name, cell.room ? el('span', { class: 'wt-nextday-room' }, ' · ' + cell.room) : null)
              : el('div', { class: 'wt-nextday-name is-blank' }, 'No class'),
            tasks.length
              ? el('div', { class: 'wt-nextday-tasks' }, ...tasks.map((t) => el('span', { class: 'wt-nextday-task' }, t.item ? t.item.title : (t.title || ''))))
              : (cell && cls ? el('div', { class: 'wt-nextday-empty' }, 'No new posts') : null)),
        );
        if (openable) {
          const open = () => {
            const own = normItems(cls);
            const items = own.length ? own : tasks.map((t) => ({ title: (t.item && t.item.title) || t.title || '', detail: (t.item && t.item.detail) || '', links: [] }));
            openModal({ cls, items, index: 0 });
          };
          row.addEventListener('click', (e) => { if (e.target.closest('a') || e.target.closest('button')) return; open(); });
          row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
        }
        rows.append(row);
      });
      body.append(rows);
      if (!any) body.append(el('div', { class: 'wt-nextday-empty' }, 'Nothing scheduled on this day.'));
    };

    const isoOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const selState = { iso: isoOf(date0), faint: false };
    // 日期优先：选完日期 Day 跟着日期走；反过来手点 Day，日期选中框变淡（不清掉，方便再点回去）
    const setDay = (n) => {
      curDay = n;
      selState.faint = true;
      renderDay(n, curDate);
    };
    const setDate = async (date) => {
      curDate = date;
      selState.iso = isoOf(date);
      selState.faint = false;
      body.replaceChildren(el('div', { class: 'wt-loading' }, 'Reading the timetable…'));
      dayBtn.textContent = 'Day ·';
      let n = dayNumForDate ? await dayNumForDate(date, grid) : null;
      if (!n) n = null;
      curDay = n;
      if (!n) {
        titleEl.textContent = titleFor();
        body.replaceChildren(el('div', { class: 'wt-empty-placeholder' }, 'That day has no lessons (or the calendar did not answer in time).'));
        return;
      }
      renderDay(n, date);
    };

    dayBtn.addEventListener('click', () => {
      ndPop(box, (pop) => {
        pop.classList.add('wt-nd-daypop');
        const list = el('div', { class: 'wt-nd-daylist' });
        for (let n = 1; n <= 10; n += 1) {
          const b = el('button', { class: 'wt-nd-dayitem' + (n === curDay ? ' on' : ''), type: 'button' }, 'Day ' + n);
          b.addEventListener('click', () => { setDay(n); pop.remove(); });
          list.append(b);
        }
        pop.append(list);
      });
    }, 'day');
    calBtn.addEventListener('click', () => {
      ndPop(box, (pop) => {
        pop.classList.add('wt-nd-calpop');
        ndCalendar(pop, (d) => { setDate(d); }, selState);
      });
    }, 'cal');

    const first = dayOf || await dayNumForDate(date0, grid);
    curDay = first || null;
    renderDay(curDay, date0);
  }
  // ── 就地切换课表：隐藏今天、从右侧推入明天 ──────────────────────────────
  function altTableFor(orig, periods) {
    const tbl = orig.cloneNode(true);
    tbl.classList.add('wt-tt-alt');
    tbl.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    const heads = [...tbl.querySelectorAll('thead th')];
    const tds = [...tbl.querySelectorAll('tbody td')];
    // 从今天的格子里记下每门课的颜色，明天同名课程沿用
    const colorByCode = new Map();
    [...orig.querySelectorAll('tbody td')].forEach((td) => {
      const a = td.querySelector('a'); const sub = td.querySelector('.timetable-subject');
      if (!a || !sub) return;
      const href = a.getAttribute('href') || '';
      const m = /\/homepage\/code\/([^/?#]+)/.exec(href);
      if (!m) return;
      let raw = m[1];
      try { raw = decodeURIComponent(raw); } catch (e) { /* ignore */ }
      try { raw = decodeURIComponent(raw); } catch (e) { /* ignore */ }
      colorByCode.set(normCode(raw), getComputedStyle(sub).backgroundColor);
    });
    // 今天格子里"（编号）教室"的原始写法，明天同一门课照抄，保证看起来一样
    const metaByCode = new Map();
    [...orig.querySelectorAll('tbody td')].forEach((td) => {
      const a = td.querySelector('a'); if (!a) return;
      const m = /\/homepage\/code\/([^/?#]+)/.exec(a.getAttribute('href') || '');
      if (!m) return;
      let raw = m[1];
      try { raw = decodeURIComponent(raw); } catch (e) { /* ignore */ }
      try { raw = decodeURIComponent(raw); } catch (e) { /* ignore */ }
      const txt = (td.textContent || '').replace(/\s+/g, ' ').trim();
      const tail = /\(([^)]+)\)\s*([A-Za-z0-9]+)?\s*$/.exec(txt);
      if (tail) metaByCode.set(normCode(raw), { code: tail[1], room: tail[2] || '' });
    });
    const startOf = (th) => {
      const m = /(\d{1,2}:\d{2}\s*(?:am|pm))/i.exec((th && th.textContent) || '');
      return m ? m[1].replace(/\s+/g, '').toLowerCase() : '';
    };
    const byStart = new Map();
    (periods || []).forEach((p) => {
      const k = String(p.from || '').replace(/\s+/g, '').toLowerCase();
      if (k && !byStart.has(k)) byStart.set(k, p);
    });
    tds.forEach((td, i) => {
      const key = startOf(heads[i]);
      const per = key ? byStart.get(key) : null;
      td.className = 'wt-card';
      td.replaceChildren();
      if (!per) { td.classList.add('wt-empty-cell'); return; }
      const cls = classForCode(per.code) || null;
      const name = (cls && cls.name) || per.name || per.code || 'Class';
      const palette = ['#f6c9c9', '#fbe0a8', '#c5d8c0', '#c2cdf7', '#f6cdb6', '#d8d2e6'];
      let col = colorByCode.get(normCode(per.code)) || '';
      if (!col) { const kc = classForCode(per.code); if (kc && kc.color) col = kc.color; }
      if (!col || /rgba?\([^)]*,\s*0(\.0*\d+)?\)$/.test(col)) {
        let h = 0; const key = String(per.code || per.name || '');
        for (let k = 0; k < key.length; k += 1) h = (h * 31 + key.charCodeAt(k)) % 997;
        col = palette[h % palette.length];
      }
      // 背景偏亮就用深色字，偏暗就用浅色字
      const rgb = (/rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(col) || []).slice(1).map(Number);
      let ink = '#2a2233';
      if (rgb.length === 3) {
        const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
        ink = lum > 0.55 ? '#2a2233' : '#f2eef6';
      }
      const sub = el('div', { class: 'timetable-subject', style: 'background-color:' + col + ';color:' + ink });
      const href = (cls && cls.homepage) || '';
      const known = metaByCode.get(normCode(per.code)) || null;
      let codeText = String((known && known.code) || (cls && cls.code) || per.code || '').split(',')[0].trim();
      // 日历里给的编号没有前缀、也可能小写，补成和课表一致的 G/XXXX 形状
      if (!known && codeText && codeText.indexOf('/') < 0) codeText = 'G/' + codeText.toUpperCase();
      const room = String((known && known.room) || (cls && cls.room) || per.room || '').trim();
      // 和站点自己的格子一样的排版：课名一行、(编号) 一行、教室一行，硬挤成一行会把教室吞掉
      if (href) sub.append(el('a', { href: href }, name));
      else sub.append(el('span', null, name));
      if (codeText) sub.append(el('div', null, '(' + codeText + ')'));
      if (room) sub.append(el('div', null, room));
      td.append(sub);
    });
    return tbl;
  }

  // 明天的课表缓存：当天有效，进页面就静默预取，点按钮时基本是瞬间的
  function nextDayKey(d) { return 'wtNextDay:' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function readDayCache(d) {
    try { const raw = sessionStorage.getItem(nextDayKey(d)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function writeDayCache(d, periods) {
    try { sessionStorage.setItem(nextDayKey(d), JSON.stringify(periods)); } catch (e) { /* ignore */ }
  }
  async function prefetchNextDay() {
    const day = nextSchoolDay(new Date());
    if (readDayCache(day)) return;
    try {
      const periods = await fetchDayPeriods(day);
      if (periods && periods.length) writeDayCache(day, periods);
    } catch (e) { /* ignore */ }
  }
  window.__wtPrefetchNextDay = prefetchNextDay;

  function notifyDaySwap(day) {
    try {
      document.dispatchEvent(new CustomEvent('wt:day-swapped', {
        detail: { at: day ? day.getTime() : 0, label: day ? day.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '') : '' },
      }));
    } catch { /* ignore */ }
  }
/* 原地把站点那张课表刷成别的 Day：只改格子里的字，不删节点、不换表，
   这样站点自己每分钟的重绘也不会把它抹掉。 */
function paintSiteDay(tbl, dayNum) {
  return (async () => {
    const cached = await gridDayCached(dayNum);
    if (!cached || !cached.classes) return false;
    const tds = [...tbl.querySelectorAll('tbody td')];
    const proto = tbl.querySelector('tbody td .timetable-subject');
    tds.forEach((td, i) => {
      let sub = td.querySelector('.timetable-subject');
      const c = cached.classes[i];
      /* 站点那张表里，没课的节次根本没有卡片（Period 6 常常是空的）。
         这一天有课就把卡片建出来（照第一个格子的结构克隆），没有就留空。 */
      if (!sub && c && c.name && proto) {
        sub = proto.cloneNode(true);
        sub.style.removeProperty('visibility');
        td.replaceChildren(el('div', null, sub));
      }
      if (!sub) return;
      if (!c || !c.name) { sub.style.setProperty('visibility', 'hidden', 'important'); return; }
      sub.style.removeProperty('visibility');
      const a = sub.querySelector('a');
      if (a) { a.textContent = c.name; if (c.homepage) a.setAttribute('href', c.homepage); }
      const divs = [...sub.querySelectorAll('div')];
      const roomLine = divs[divs.length - 1];
      if (roomLine) roomLine.textContent = c.room || '';
    });
    return true;
  })();
}

  function clearSwap() {
    // 任何残留都收干净：多余图层、内联样式、宿主类名
    document.querySelectorAll('table.wt-tt-alt').forEach((n) => n.remove());
    document.querySelectorAll('.wt-tt-alt-host').forEach((h) => h.classList.remove('wt-tt-alt-host', 'wt-tt-alt-live', 'wt-tt-clip'));
    document.querySelectorAll('table.timetable.wt-table:not(.wt-tt-alt)').forEach((t) => {
      t.style.display = ''; t.style.visibility = ''; t.style.transform = ''; t.style.opacity = ''; t.style.transition = '';
    });
    window.__wtTtSwap = null;
    const b = document.querySelector('.wt-tt-nextday');
    if (b) { b.textContent = 'Next day \u203a'; b.disabled = false; b.removeAttribute('aria-busy'); }
  }
  function showToday(btn) {
    const st = window.__wtTtSwap;
    window.__wtTtSwap = null;
    if (st && st.alt) {
      const host = st.host;
      /* 返回今天时原表必须**立刻**回到原位：以前这里把它先摆到 -14%、透明度 0.25，
         等 430ms 后再清掉，于是「今天的课表」先是偏左、又像从一层白蒙版里浮出来。
         先把 transition 关掉再写样式，避免它自己再补一段动画。 */
      /* 退出和进入对称：今天的表从左边推回来（-14% → 0、淡入），
         那张明天的表缩小一点往右淡出。 */
      if (st.orig) {
        st.orig.style.transition = 'none';
        st.orig.style.visibility = '';
        st.orig.style.transform = 'translateX(-14%)';
        st.orig.style.opacity = '0.15';
        void st.orig.offsetWidth;
        st.orig.style.transition = '';
        st.orig.style.transform = 'none';
        st.orig.style.opacity = '1';
      }
      st.alt.style.transform = 'translateX(110%) scale(.96)';
      st.alt.style.opacity = '0';
      setTimeout(() => { clearSwap(); if (st.orig) { st.orig.style.transform = ''; st.orig.style.opacity = ''; } }, 430);
      if (host) host.classList.remove('wt-tt-alt-live');
    } else {
      clearSwap();
    }
    if (btn) { btn.textContent = 'Next day \u203a'; btn.disabled = false; }
    notifyDaySwap(null);
  }

  async function swapNextDay(btn) {
    /* 星期表模式下连点 / 点回来：直接重建当天那一列 */
    if (window.__wtTtSwap && window.__wtTtSwap.grid) {
      const back = window.__wtTtSwap.back;
      window.__wtTtSwap = null;
      if (back) { try { await back(); } catch (e) { /* ignore */ } }
      if (btn) { btn.textContent = 'Next day \u203a'; btn.disabled = false; btn.removeAttribute('aria-busy'); }
      return;
    }
    const live = document.querySelector('table.wt-tt-alt');
    if (live) { window.__wtTtSwap = { alt: live, orig: document.querySelector('table.timetable.wt-table:not(.wt-tt-alt)'), host: live.parentElement }; showToday(btn); return; }
    const gridSwap = async (btn, day) => {
    /* 首选：按 /timetable 的星期表整列照抄。那列永远是 Homeroom + Period 1..6 七行，
       没课的节次留占位；站点日历接口只回「有课」的节次，用它画会把 Period 6 抽掉。 */
    try {
      if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; btn.setAttribute('aria-busy', '1'); }
      const g = await withTimeout(loadTtGrid(), 6000, null);
      const n = g ? await withTimeout(Promise.resolve(dayNumForDate(day, g)), 6000, null) : null;
      const cached = n ? await gridDayCached(n) : null;
      if (cached && cached.classes && cached.classes.length) {
        /* 站点自己那张表在的时候，原地改字最稳（合成块会被站点的定时重绘清掉）。 */
        const siteTbl = document.querySelector('table.timetable.wt-table:not(.wt-tt-alt)');
        if (siteTbl && paintSiteDay) {
          const before = siteTbl.innerHTML;
          /* 0.1.3.4 起这里是「原地改字直接换掉」，动画就这么丢了：用户点了 Next day，
             表格内容瞬间跳成下一天。现在改成先克隆一张、在新表上改字，再让它从右边滑进来、
             原表往左退；动画结束（460ms）把底层那张也改成同一天并撤掉图层，
             这样站点每分钟的重绘不会把画面弹回今天。 */
          const ttHost = siteTbl.closest('.scrollable') || siteTbl.parentElement;
          const alt = siteTbl.cloneNode(true);
          alt.classList.add('wt-tt-alt');
          if (ttHost && await paintSiteDay(alt, n)) {
            const back = async () => { siteTbl.innerHTML = before; clearSwap(); notifyDaySwap(null); };
            window.__wtTtSwap = { grid: true, day, back };
            const lowAnim = document.documentElement.classList.contains('wt-low-anim')
              || (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
            if (lowAnim) {
              paintSiteDay(siteTbl, n).catch(() => {});
            } else {
              ttHost.classList.add('wt-tt-alt-host');
              ttHost.classList.add('wt-tt-clip');
              alt.style.transform = 'translateX(110%)';
              alt.style.opacity = '0';
              ttHost.append(alt);
              void alt.offsetWidth;
              ttHost.classList.add('wt-tt-alt-live');
              siteTbl.style.transform = 'translateX(-14%)';
              siteTbl.style.opacity = '0.15';
              alt.style.transform = 'none';
              alt.style.opacity = '1';
              setTimeout(() => {
                if (!window.__wtTtSwap || window.__wtTtSwap.alt !== alt) return;
                /* 图层已经到位：把底下的真表也换成这一天，再撤图层（内容一样，看不出接缝） */
                paintSiteDay(siteTbl, n).then(() => {
                  alt.remove();
                  clearSwap();
                  window.__wtTtSwap = { grid: true, day, back };
                }).catch(() => {
                  alt.remove();
                  clearSwap();
                  window.__wtTtSwap = { grid: true, day, back };
                });
              }, 460);
            }
            notifyDaySwap(day);
            if (btn) { btn.textContent = '\u2039 Back'; btn.disabled = false; btn.removeAttribute('aria-busy'); }
            toast('Showing ' + day.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' }));
            return true;
          }
        }
        const todayNum = g ? await withTimeout(Promise.resolve(dayNumForDate(new Date(), g)), 3000, null) : null;
        const todayCached = todayNum ? await gridDayCached(todayNum) : null;
        cached.title = 'Showing ' + day.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
        WEEKEND_MODE = false;
        document.querySelectorAll('.wt-tt-body').forEach((m) => m.remove());
        await syntheticView(cached, true);
        window.__wtTtSwap = { grid: true, day, back: async () => {
          if (!todayCached) { location.reload(); return; }
          if (todayCached) todayCached.title = 'Showing ' + new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
          document.querySelectorAll('.wt-tt-body').forEach((m) => m.remove());
          await syntheticView(todayCached, true);
          notifyDaySwap(null);
        } };
        notifyDaySwap(day);
        if (btn) { btn.textContent = '\u2039 Back'; btn.disabled = false; btn.removeAttribute('aria-busy'); }
        toast('Showing ' + day.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' }));
        return true;
      }
    } catch (e) { /* 拿不到星期表就走老路 */ }
    if (btn) { btn.textContent = 'Next day \u203a'; btn.disabled = false; btn.removeAttribute('aria-busy'); }
    return false;
    };

    if (window.__wtTtBusy) return;                    // 连点保护
    const orig = document.querySelector('table.timetable.wt-table:not(.wt-tt-alt)');
    if (!orig) { await gridSwap(btn, nextSchoolDay(new Date())); return; }
    const host = orig.closest('.scrollable') || orig.parentElement;
    if (!host) return;

    const day = nextSchoolDay(new Date());

    if (await gridSwap(btn, day)) return;
    let periods = readDayCache(day);
    if (!periods || !periods.length) {
      window.__wtTtBusy = true;
      if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; btn.setAttribute('aria-busy', '1'); }
      try { periods = await fetchDayPeriods(day); } catch (e) { periods = []; }
      window.__wtTtBusy = false;
      if (btn) btn.disabled = false;
      if (periods && periods.length) writeDayCache(day, periods);
    }
    if (window.__wtTtSwap) return;                    // 等待期间用户已经切过去了
    if (!periods || !periods.length) {
      clearSwap();
      toast('Could not read the calendar for ' + day.toLocaleDateString('en-AU', { weekday: 'long' }));
      return;
    }
    // 先清掉任何历史图层，再上新的，绝不叠两层
    document.querySelectorAll('table.wt-tt-alt').forEach((n) => n.remove());
    host.classList.add('wt-tt-alt-host');
    host.classList.add('wt-tt-clip');
    const alt = altTableFor(orig, periods);
    /* 日历接口只回「有课」的节次，克隆出来的表就会缺列（Period 6 常常空着）。
       缺哪一列就拿星期表同一列补上，名字和教室都在里面。 */
    try {
      const g2 = await withTimeout(loadTtGrid(), 6000, null);
      const n2 = g2 ? await withTimeout(Promise.resolve(dayNumForDate(day, g2)), 6000, null) : null;
      const gc = n2 ? await gridDayCached(n2) : null;
      if (gc && gc.classes) {
        const tds2 = [...alt.querySelectorAll('tbody td')];
        tds2.forEach((td, i) => {
          if (td.querySelector('.timetable-subject')) return;
          const cell = gc.classes[i];
          if (!cell || !cell.name) return;
          td.replaceChildren(el('div', null, el('div', { class: 'timetable-subject' }, cell.name), el('div', { class: 'timetable-room' }, cell.room || '')));
        });
      }
    } catch (e) { /* 补不上就算了 */ }
    alt.style.transform = 'translateX(110%)';
    alt.style.opacity = '0';
    host.append(alt);
    void alt.offsetWidth;
    host.classList.add('wt-tt-alt-live');
    orig.style.transform = 'translateX(-14%)';
    orig.style.opacity = '0.15';
    alt.style.transform = 'none';
    alt.style.opacity = '1';
    window.__wtTtSwap = { alt, orig, host, day };
    notifyDaySwap(day);
    setTimeout(() => { if (window.__wtTtSwap && window.__wtTtSwap.alt === alt) { orig.style.visibility = 'hidden'; } }, 420);
    if (btn) { btn.textContent = '\u2039 Back'; btn.disabled = false; btn.removeAttribute('aria-busy'); }
    toast('Showing ' + day.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' }));
  }

  /* 这两个钩子必须在这里就挂上：以前挂在 main() 里，而合成课表那条路不走 main()，
     于是「Next day」在周末/凌晨的页面上点了没反应。 */
  window.__wtNextDay = (btn) => swapNextDay(btn);
  window.__wtNextDayList = () => openNextDay(allClasses());

  const tdtSet = settingsPopover('tdt', settingsTabs, drawTdtContent);
  const dueSet = settingsPopover('due', settingsTabs, drawDueContent);
  const tdtBar = tabBar(tabs, tdtActive, (k) => { tdtActive = k; drawTdtContent(); }, tdtSet.btn, renameSubject);
  const dueBar = tabBar(tabs, dueActive, (k) => { dueActive = k; drawDueContent(); }, dueSet.btn, renameSubject);
  // Cards 右边再挂一个把到期日导成日历文件的按钮

  let headCountEl = null;
  const todoChev = chevron();
  const todoCountEl = el('span', { class: 'wt-sec-count' }, String(taskCount));
  const todoHead = el('button', { class: 'wt-sec-head' }, el('span', { class: 'wt-sec-title' }, L.toDo), todoChev, todoCountEl);
  const todoInner = el('div', { class: 'wt-sec-inner' }, tdtBar, tdtContent);
  const todoBody = el('div', { class: 'wt-sec-body', 'data-wt-key': 'todo' }, todoInner);
  const dueChev = chevron();
  const dueHead = el('button', { class: 'wt-sec-head' }, el('span', { class: 'wt-sec-title' }, 'Due'), dueChev, dueBadge);
  const dueInner = el('div', { class: 'wt-sec-inner' }, dueBar, dueContent);
  const dueBody = el('div', { class: 'wt-sec-body', 'data-wt-key': 'due' }, dueInner);
  todoHead.addEventListener('click', () => toggleSection(todoBody, todoHead, todoChev));
  dueHead.addEventListener('click', () => toggleSection(dueBody, dueHead, dueChev));
  const body = el('div', { class: 'wt-panel-body', 'data-wt-key': 'panel' });
  body.append(el('div', { class: 'wt-section open', 'data-wt-sec': 'todo' }, todoHead, todoBody), el('div', { class: 'wt-section open', 'data-wt-sec': 'due' }, dueHead, dueBody));
  // "下一个上学日"按钮是在 main 作用域里注入的，那里看不到 buildSummary 里的 openNextDay / allClasses
  window.__wtNextDay = (btn) => swapNextDay(btn);
  // 课表卡右下角的入口在 main() 里创建，那里看不到 openNextDay/allClasses，走这个钩子
  window.__wtNextDayList = () => openNextDay(allClasses());
  async function enrichDueDetails(items) {
    await Promise.all(items.slice(0, 10).map(async (it) => {
      try {
        const link = (it.links || []).find((l) => /assessments/i.test(l.href || ''));
        if (!link) {
          const cls = it.cls;
          if (cls) {
            const full = cls.latestPost && cls.latestPost.text ? formatDetail(dayPartOf(cls.latestPost.text, cls.latestPost).text) : '';
            if (full && full.length > 60) it.detail = full;
            else {
              const ct = classTodayDetail(cls);
              if (ct && ct.trim().length > 60) it.detail = formatDetail(ct);
            }
          }
          return;
        }
        const doc = await renderFetch(link.href, 3500);
        if (!doc) { it.detail = 'No information available yet.'; return; }
        // 和 fetchAssessmentText 一样：逗号列表的 querySelector 返回的是「文档里最靠前的」，
        // 不是「列表里最靠前的」，.content 会先撞上右侧用户菜单。改成按优先级逐个试。
        const ir = doc.querySelector('article.content#ir-content, #ir-content');
        let main = ir || null;
        let text = ir ? domToText(ir) : '';
        if (text.length < 60) {
          for (const sel of ASSESS_BOX_SELECTORS) {
            const node = doc.querySelector(sel);
            if (!node) continue;
            const t = domToText(node);
            if (t.length >= 60) { main = node; text = t; break; }
          }
        }
        if (!main) main = doc.body;
        const fileLinks = [...(main.querySelectorAll ? main.querySelectorAll('a[href*="/resources/"], a[href$=".pdf"], a[href*="/files/"], a[href*="/file/"]') : [])].slice(0, 8).map((a) => ({ label: (a.textContent || '').trim() || 'File', href: a.href }));
        if (fileLinks.length) it.files = fileLinks;
        let cleaned = text
          .replace(/Enable notifications on your device:?[\s\S]*$/i, '')
          .replace(/^\s*Enable Notifications\s*$/gim, '')
          .replace(/^\s*Later\s*$/gim, '')
          .replace(/^\s*(WiSE|My Classes|Academic|Calendar|News|Contact Us)\s*$/gim, '')
          .trim();
        if (cleaned.length < 40 || /Profile Options|Notification Settings|Logout|Enable notifications/i.test(cleaned)) it.detail = 'No information available yet.';
        // 正文是整段英文，不能走课表那套 formatDetail 断行（它会把单词从中间切开）
        else it.detail = cleaned.length > 700 ? cleaned.slice(0, 700).replace(/\s+\S*$/, '') + '…' : cleaned;
        wtLog('due ' + (it.title || '') + ' text=' + text.length + ' cleaned=' + cleaned.length);
      } catch (e) { if (!it.detail) it.detail = 'No information available yet.'; }
    }));
  }
  fetchDueWork().then((dueWork) => {
    dueWorkCache = dueWork;
    due.splice(0, due.length, ...dueFor(allClasses(), dueWork));
    dueBadge.textContent = String(due.length);
    drawDueContent();
    enrichDueDetails(due).then(() => drawDueContent()).catch(() => {});
  });
  drawTdtContent();
  drawDueContent();
  setTimeout(drawBoth, 1200);
  fetchAllSubjects().then(async (list) => {
    if (!list || !list.length) return;
    if (typeof HYDRATE === 'function') {
      try { await HYDRATE(list.filter((c) => c && c.homepage).slice(0, 14)); } catch { /* ignore */ }
    }
    drawBoth();
    wtLog('subjects=' + list.length + ' extra=' + extraClasses.length);
  }).catch(() => {});
  const titles = ['What to do today?', "What's on today?", "Today's plan", 'Today at a glance', "What's due today?", "Today's tasks", 'What should I do today?'];
  const headTitle = el('b', null, titles[Math.floor(Math.random() * titles.length)]);
  const headChev = chevron();
  headCountEl = null;   // 摘要头不显示任务数（用户要的）
  /* 强制重新抓一遍（PLAN-beta7 §4.2）：清掉当天缓存重载，数据不对时不用去翻设置 */
  const headRefresh = el('button', {
    class: 'wt-refresh-btn',
    type: 'button',
    title: L.refreshAll || 'Reload fresh data',
    'aria-label': L.refreshAll || 'Reload fresh data',
    onclick: (ev) => {
      ev.stopPropagation();
      try { sessionStorage.setItem('wtFreshAll', '1'); } catch { /* ignore */ }
      location.reload();
    },
  }, '\u21bb');
  const head = el('div', { class: 'wt-summary-head' }, headTitle, headChev, headRefresh);
  head.addEventListener('click', () => toggleSection(body, head, headChev));
  /* 每次进页面都是折叠的。以前会恢复上次的开合状态，但刷新后整块面板自己展开
     会盖住下半页，用户明确要「默认没展开」。页内手动展开当然不受影响。 */
  countTodo();
  const summary = el('div', { class: 'wt-summary' }, head, body);
  /* 首屏骨架已经占好位置就原地换内容：用户看到的是一块区域从"灰块"变成真卡片，
     而不是先空白、再突然多出一块。 */
  let host = (SKEL_HOST && SKEL_HOST.isConnected) ? SKEL_HOST : null;
  if (host) {
    host.classList.remove('wt-skel');
    host.classList.remove('wt-skel-block');
    host.removeAttribute('aria-busy');
    host.replaceChildren(summary);
    SKEL_HOST = null;
    watchPanelPlacement(host);   // 骨架早先落在 .column-left 的话，这里把它挪回标题下面
  } else {
    host = el('div', { 'data-wesley-home': '' }, summary);
    placePanel(host);
    watchPanelPlacement(host);
  }
  WT_HOST = host;
  /* 站点首屏渲染慢的时候 anchor 还没出现，晚一点再插一次；绝不挂到 <html> 外面去 */
  if (!host.isConnected) setTimeout(() => { if (!host.isConnected) placePanel(host); }, 1200);
  document.documentElement.classList.toggle('wt-perf', settings.perfMode === true);
  try {
    chrome.storage.local.get({ testAlertAt: 0 }).then((t) => {
      if (t && t.testAlertAt && Date.now() - Number(t.testAlertAt) < 180000) forceNewsAlert();
      else maybeNewsAlert(settings);
    }).catch(() => maybeNewsAlert(settings));
  } catch (e) { maybeNewsAlert(settings); }
  if (!window.__wtNewsWatch) { window.__wtNewsWatch = 1; startNewsWatch(); }
  /* 面板底色的内联值必须能被主题重算：以前这段只在建面板时跑一次，
     深色的 background-color:#121013 写进去就没人清，切回浅色以后
     半透明的浅色渐变盖在这层黑底上 —— 用户看到的就是「面板还是黑的」。
     现在包成一个函数，换主题时由 applyTheme() 再调一次。 */
  const paintSummaryBg = () => {
    const bgAlpha = Math.max(0, Math.min(100, Number(settings.bgOpacity == null ? 100 : settings.bgOpacity))) / 100;
    const effect = settings.bgEffect || 'none';
    summary.classList.remove('wt-bg-frost', 'wt-bg-soft', 'wt-bg-grain', 'wt-bg-vignette');
    body.classList.remove('wt-bg-frost', 'wt-bg-soft', 'wt-bg-grain', 'wt-bg-vignette');
    if (effect !== 'none') body.classList.add('wt-bg-' + effect);
    if (settings.bgMode === 'image' && settings.bgImage) {
      body.style.backgroundImage = 'url("' + settings.bgImage + '")';
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center';
      body.style.backgroundColor = '';
    } else {
      body.style.backgroundSize = '';
      body.style.backgroundPosition = '';
      const mix = (c) => 'color-mix(in srgb, ' + (c || '#f7f2f9') + ' ' + Math.max(5, bgAlpha * 100) + '%, transparent)';
      if (themeIsDark()) {
        body.style.backgroundImage = 'linear-gradient(180deg,#191519,#121013)';
        body.style.backgroundColor = '#121013';
      } else {
        body.style.backgroundImage = 'linear-gradient(180deg, ' + mix(settings.bgFrom) + ', ' + mix(settings.bgTo) + ')';
        body.style.backgroundColor = '';     /* 交回 CSS 的 var(--wt-t-panel-2) */
      }
    }
  };
  PANEL_PAINT_BG = paintSummaryBg;
  paintSummaryBg();
  summary.style.setProperty('--wt-body-op', String((settings.bodyOpacity == null ? 55 : settings.bodyOpacity) / 100));
  const fontPct = settings.cardFontPct == null ? 125 : settings.cardFontPct;
  const sizePct = settings.cardSizePct == null ? 100 : settings.cardSizePct;
  const textPct = settings.textScalePct == null ? 100 : settings.textScalePct;
  summary.style.setProperty('--wt-card-font', String(Math.round(13 * fontPct) / 100) + 'px');
  const ttPct = settings.timetableHeight == null ? 100 : settings.timetableHeight;
  document.documentElement.style.setProperty('--wt-tt-h', String(Math.round(146 * ttPct) / 100) + 'px');
  summary.style.setProperty('--wt-card-scale', String(Math.max(0.8, Math.min(1, sizePct / 100))));
  summary.style.setProperty('--wt-card-size', String(Math.max(0.8, Math.min(1, sizePct / 100))));
  summary.style.setProperty('--wt-text-scale', String(textPct / 100));
  summary.style.setProperty('--wt-link-scale', String(((settings.linkScalePct == null ? 100 : settings.linkScalePct) / 100) * 0.8));
  summary.style.setProperty('--wt-title-scale', String(((settings.titleScalePct == null ? 100 : settings.titleScalePct) / 100) * 0.8));
  summary.style.setProperty('--wt-detail-scale', String(((settings.detailScalePct == null ? 100 : settings.detailScalePct) / 100) * 0.8));
  summary.style.setProperty('--wt-card-tscale', String((fontPct / 100) * (textPct / 100)));
  summary.style.setProperty('--wt-card-pad', String(fontPct / 120));
  summary.style.setProperty('--wt-card-op', String((settings.cardOpacity == null ? 100 : settings.cardOpacity) / 100));
  summary.classList.toggle('wt-card-effect-' + (settings.cardEffect || 'none'));
  summary.style.setProperty('--wt-nav-op', String((settings.navGlassOpacity == null ? 60 : settings.navGlassOpacity) / 100));
  summary.style.setProperty('--wt-sec-op', String((settings.secGlassOpacity == null ? 80 : settings.secGlassOpacity) / 100));
  /* 没设照片背景时一律不要 tab 栏那层玻璃：底下只是纯渐变，加一层白雾只会显得脏。 */
  const navGlassOn = settings.bgMode === 'image' && Boolean(settings.bgImage) ? settings.navGlass !== false : false;
  summary.classList.toggle('wt-no-navglass', !navGlassOn);
  summary.classList.toggle('wt-no-secglass', settings.secGlass === false);
  summary.style.setProperty('--wt-glow', settings.bgGlow || settings.bgTo || '#efe4f4');
  summary.style.setProperty('--wt-cols', String(Math.max(3, Math.min(10, Number(settings.rowMax) || 6))));
  if (settings.animations === false) document.documentElement.classList.add('wt-low-anim');
  if (settings.smooth === false) document.documentElement.classList.add('wt-no-smooth');
}


  function decorateMobile() {
    document.querySelectorAll('.timetable-small .timetable-subject').forEach((cardEl) => {
      if (cardEl.dataset.wtBound) return;
      cardEl.dataset.wtBound = '1';
      const code = (cardEl.querySelector('div') ? cardEl.querySelector('div').innerText : '').replace(/[()]/g, '').trim();
      const cls = classForCode(code);
      if (!cls) return;
      cardEl.style.cursor = 'pointer';
      cardEl.addEventListener('click', async (e) => {
        if (e.target.closest('a')) return;
        if (!normItems(cls).length && cls.homepage) { try { await fetchPostsFor([cls]); } catch { /* ignore */ } }
        openModal({ cls, items: normItems(cls), index: 0 });
      });
    });
  }

  function toast(text) {
    const t = el('div', { class: 'wt-toast' }, el('span', null, text), el('button', { class: 'wt-toast-x', 'aria-label': 'Close' }, '×'));
    document.body.append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    const hide = () => { t.classList.remove('show'); setTimeout(() => t.remove(), 220); };
    const timer = setTimeout(hide, 3000);
    t.querySelector('.wt-toast-x').addEventListener('click', () => { clearTimeout(timer); hide(); });
  }

  function localOnlyAnalysis(post, links) {
    const body = dedupeTitle(post.title, post.text || '');
    /* detail 以前只留 200 字，可课表类帖子一段一天，200 字连星期三都到不了，
       更别说按日期挑出星期五那一段。留整段正文，显示时本来就只露两行。 */
    return { summary: (post.text || '').slice(0, 120), items: post.title ? [{ title: post.title.slice(0, 80), detail: body.slice(0, 3000), kind: 'other', due: '', links: links.slice(0, 2) }] : [] };
  }
  async function analyzePostLocal(className, post) {
    const links = Array.isArray(post.links) ? post.links : [];
    return localOnlyAnalysis(post, links);
  }

  // 抓一门课：homepage → 最新 post →（需要时）本地解析。post 没变就不会再抓。
  async function hydrateClass(cls, needTasks) {
    if (!cls.homepage) return false;
    const res = await fetch(fixUrl(cls.homepage), { credentials: 'include' });
    const html = await res.text();
    const m = html.match(/["'](\/news\/lists\/folder\/[^"']+)["']/);
    if (!m) return false;
    const arr = await (await fetch(m[1], { credentials: 'include' })).json();
    const all = Array.isArray(arr) ? arr.filter(Boolean) : [];
    /* 老师删掉最新帖以后站点会把几个月前的旧帖顶到最前面；超过一个月的帖子当没有新内容，
       否则一张八个月前的通知会被当成这周的作业。 */
    const MAX_POST_AGE_DAYS = 30;
    const list = all
      .filter((p) => { const t = postDateOf(p); return !t || (Date.now() - t.getTime()) / 86400000 <= MAX_POST_AGE_DAYS; })
      .sort((a, b) => postDateOf(b) - postDateOf(a));
    const post = list[0] || null;
    if (!post) return false;
    const prev = cls.latestPost && String(cls.latestPost.id) === String(post.id);
    if (prev && !FRESH_ALL) {
      if (needTasks && !(cls.latestPost.tasks && Array.isArray(cls.latestPost.tasks.items))) {
        cls.latestPost.tasks = await analyzePostLocal(cls.name, { id: post.id, title: cls.latestPost.title || '', text: cls.latestPost.text || '', links: cls.latestPost.links || [], publishAt: cls.latestPost.publishAt || '' });
      }
      return true;
    }
    const dayOf = (p) => { const d = new Date(p.publishAt || p.timeText || 0); return Number.isNaN(d.getTime()) ? '' : d.toDateString(); };
    const newestDay = dayOf(post);
    const sameDay = FRESH_ALL ? list.filter((p) => dayOf(p) === newestDay).slice(0, 4) : [post];
    const div = document.createElement('div');
    const texts = [];
    const links = [];
    for (const p of sameDay) {
      const d2 = document.createElement('div');
      d2.innerHTML = p.body || '';
      /* textContent 会把相邻的 <p>/<br> 粘成一串（"research posterTuesday 27 October"、
         "Friday 6 NovemberPeriod 5…"），domToText 会在块边界补换行。 */
      const t2 = domToText(d2);
      if (t2) texts.push((p === post ? '' : (p.title ? '[' + p.title + '] ' : '')) + t2);
      [...d2.querySelectorAll('a[href]')].forEach((a) => { const href = a.getAttribute('href'); const tx = a.innerText.trim().slice(0, 80); if (tx && href) links.push({ text: tx, href }); });
    }
    div.innerHTML = post.body || '';
    const text = (texts.join('\n\n') || domToText(div));
    cls.latestPost = {
      href: '/news/' + post.id + '?ref=homepage',
      id: post.id,
      title: post.title || '',
      author: (post.author && post.author.fullName) || '',
      timeText: (() => {
        const rawTime = post.publishAt || post.timeText || '';
        if (!rawTime) return '';
        const d = new Date(rawTime);
        return Number.isNaN(d.getTime()) ? rawTime : d.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
      })(),
      text: text.slice(0, 6000),
      links,
      publishAt: post.publishAt || '',
      tasks: needTasks ? await analyzePostLocal(cls.name, { id: post.id, title: post.title || '', text, links, publishAt: post.publishAt || '' }) : null,
    };
    return true;
  }

  async function pool(items, fn) {
    let i = 0;
    const worker = async () => { while (i < items.length) { const it = items[i++]; try { await fn(it); } catch { /* skip */ } } };
    await Promise.all([worker(), worker(), worker()]);
  }

  async function fetchPostsFor(classes) {
    const fresh = FRESH_ALL;
    await pool(classes, (c) => hydrateClass(c, true));
    wtLog('posts ok=' + classes.filter((c) => c.latestPost && c.latestPost.title).length + '/' + classes.length);
    return classes;
  }

  function saveDay(classes, tmCodes, when) {
    try {
      const d = when instanceof Date ? when : new Date();
      localStorage.setItem('wesleyLocal:' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(), JSON.stringify({ at: Date.now(), classes, tmCodes }));
    } catch { /* ignore */ }
  }

  async function scrapeLocal(periods) {
    if (!Array.isArray(periods)) return null;
    const fresh = FRESH_ALL;
    // 只有“今天课表里的课”需要解析，别的课只抓 post
    const need = new Set();
    for (const p of periods) if (p.code) need.add(normCode(p.code));
    const isNeeded = (c) => need.has(normCode(c.code)) || /lang acquisition: english/i.test(c.name || '');
    try {
      const day = new Date();
      const todayKey = 'wesleyLocal:' + day.getFullYear() + '-' + (day.getMonth() + 1) + '-' + day.getDate();
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('wesleyLocal:'));
      const dated = keys.map((k) => ({ k, t: (() => { const m = /wesleyLocal:(\d+)-(\d+)-(\d+)/.exec(k); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : 0; })() })).sort((a, b) => a.t - b.t);
      for (const d of dated.slice(0, Math.max(0, dated.length - 7))) localStorage.removeItem(d.k);
      const cached = JSON.parse(localStorage.getItem(todayKey) || 'null');
      if (cached && Array.isArray(cached.classes) && cached.classes.length) {
        const targets = cached.classes.filter((c) => c.homepage && isNeeded(c));
        await pool(targets, (c) => hydrateClass(c, true));
            saveDay(cached.classes, cached.tmCodes || null);
        wtLog('posts refresh today=' + targets.length + ' (same day, cached)');
        return cached.classes;
      }
    } catch { /* ignore */ }
    const map = new Map();
    for (const p of periods) {
      if (!p.code) continue;
      if (!map.has(p.code)) {
        map.set(p.code, { code: p.code, name: p.subject, color: p.color, room: p.room || '', homepage: p.href ? new URL(p.href, location.origin).href : '', latestPost: null });
      }
    }
    try {
      const r = await fetch('/learning/classes', { credentials: 'include' });
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      for (const card of doc.querySelectorAll('.v-card')) {
        const a = card.querySelector('h3 a[href^="/homepage/"]');
        if (!a) continue;
        const name = (a.textContent || '').trim();
        const href = a.getAttribute('href');
        const img = card.querySelector('.card-class-image');
        const color = img ? (img.style && img.style.backgroundColor) || '' : '';
        const m = /\(([^)]+)\)/.exec(card.innerText || '');
        const code = m ? m[1] : name;
        if (!map.has(code) && href) {
          map.set(code, { code, name, color, homepage: new URL(href, location.origin).href, latestPost: null });
        }
      }
    } catch { /* ignore */ }
    const tmCodes = [...map.keys()];
    const classes = [...map.values()];
    await pool(classes, (c) => hydrateClass(c, isNeeded(c)));
    saveDay(classes, tmCodes);
    wtLog('posts ok=' + classes.filter((c) => c.latestPost && c.latestPost.title).length + '/' + classes.length);
    return classes;
  }

  function lastWeekdayCache() {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('wesleyLocal:'));
    let best = null;
    for (const k of keys) {
      const m = /wesleyLocal:(\d+)-(\d+)-(\d+)/.exec(k);
      if (!m) continue;
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      if (!best || d.getTime() > best.d.getTime()) best = { k, d };
    }
    if (!best) return null;
    try {
      const payload = JSON.parse(localStorage.getItem(best.k)) || {};
      return { key: best.k, day: best.d, classes: payload.classes || [], tmCodes: payload.tmCodes || null };
    } catch { return null; }
  }

  async function fetchPastTimetable() {
    // 真实接口（抓包确认）：GET /calendar/ajax/full?start=<unix>&end=<unix>&userId=<id>
    // 班级课是 className 里带 type24 的条目，title 形如 "Year 10 Science (G/M10SCI0-YA7), C203"
    let uid = (document.documentElement.innerHTML.match(/userId:\s*Number\('(\d+)'\)/) || [])[1] || '';
    if (!uid) {
      try { const h = await (await fetch('/home', { credentials: 'include' })).text(); uid = (h.match(/userId:\s*Number\('(\d+)'\)/) || [])[1] || ''; } catch { /* ignore */ }
    }
    const mk = (d) => Math.floor(d.getTime() / 1000);
    const now = new Date();
    const start = mk(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 21));
    const end = mk(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    let data = null;
    try {
      const url = '/calendar/ajax/full?start=' + start + '&end=' + end + (uid ? '&userId=' + uid : '');
      const res = await fetch(url, { credentials: 'include', headers: { 'x-requested-with': 'XMLHttpRequest' } });
      if (res.ok) data = await res.json();
    } catch (e) { wtLog('calendar fetch failed: ' + e); }
    if (!Array.isArray(data)) return null;
    const durMin = (e) => (new Date(e.end || 0) - new Date(e.start || 0)) / 60000;
    // start == end（礼拜三那条 8:30am–8:30am）或短到不像一节课的条目直接丢掉
    const periods = data.filter((e) => e && !e.allDay && e.start && /type24/.test(e.className || '') && durMin(e) >= 5);
    if (!periods.length) return null;
    const byDay = new Map();
    for (const e of periods) {
      const d = new Date(e.start);
      const key = d.toDateString();
      if (!byDay.has(key)) byDay.set(key, { d, list: [] });
      byDay.get(key).list.push(e);
    }
    const days = [...byDay.values()].sort((a, b) => b.d - a.d);
    if (!days.length) return null;
    const day = days[0];
    const room = (t) => { const m = /,\s*([A-Z]?\d{2,4}[A-Z]?)\s*$/.exec(t || ''); return m ? m[1] : ''; };
    const strip = (t) => (t || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/,\s*[A-Z]?\d{2,4}[A-Z]?\s*$/, '').replace(/\s+/g, ' ').trim();
    const classes = day.list.sort((a, b) => new Date(a.start) - new Date(b.start)).map((e) => {
      const t = e.title || '';
      const inside = (t.match(/\(([^)]*)\)/) || [])[1] || '';
      const parts = inside.split('/').map((x) => x.trim()).filter(Boolean);
      let code = (parts.length > 1 ? parts[parts.length - 1] : inside).replace(/[^A-Za-z0-9\-]/g, '').trim();
      const name0 = strip(t) || t;
      const known = classForCode(code);
      const groupM = /group(\d{3,})/.exec(e.className || '');
      const homepage = groupM ? '/homepage/' + groupM[1] : (known && known.homepage) || '';
      return { code: known ? known.code : code, label: inside || code, name: known ? known.name : name0, color: e.color || '', room: room(t), homepage, latestPost: null, start: e.start, end: e.end };
    }).filter((c) => c.code);
    // 用 /learning/classes 补上课程主页（拿 post 用）
    try {
      const r = await fetch('/learning/classes', { credentials: 'include' });
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      for (const card of doc.querySelectorAll('.v-card')) {
        const a = card.querySelector('h3 a[href^="/homepage/"]');
        if (!a) continue;
        const m = /\(([^)]+)\)/.exec(card.innerText || '');
        const code = m ? m[1] : '';
        const c = classes.find((x) => x.code === code || x.name.includes(strip(a.textContent || '')));
        if (c && !c.homepage) c.homepage = new URL(a.getAttribute('href'), location.origin).href;
      }
    } catch (e) { /* ignore */ }
    const tmCodes = classes.map((c) => c.code);
    wtLog('calendar timetable day=' + day.d.toDateString() + ' classes=' + classes.length);
    return { day: day.d, classes, tmCodes };
  }

  function markBooting(on) {
    try { document.documentElement.classList.toggle('wt-booting', !!on); } catch { /* ignore */ }
  }
  let WEEKEND_MODE = false;
  let WEEKEND_DATA = null;

  function buildSyntheticTimetable(cached) {
    const classes = cached.classes || [];
    let tm = cached.tmCodes ? classes.filter((c) => cached.tmCodes.includes(c.code)) : classes.slice(0, 7);
    /* 站点课表固定 Homeroom + Period 1..6 七格。日历 API 只给挂过事件的课，
       末尾没课的那节会缺一格，用户看到的表就比原版少一列 —— 按星期表补齐到 7 格。 */
    const want = 7;
    if (cached.gridDay || (cached.classes || []).length <= want) {
      for (let i = tm.length; i < want; i += 1) tm.push({ name: '', room: '', code: '', start: '', end: '' });
    }
    if (!tm.length) return null;
    const clock = (v) => {
      if (!v) return '';
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return '';
      let h = d.getHours(); const m = d.getMinutes();
      const ap = h >= 12 ? 'pm' : 'am';
      h = h % 12 || 12;
      return h + ':' + String(m).padStart(2, '0') + ap;
    };
    const minutesOf = (v) => {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? NaN : d.getHours() * 60 + d.getMinutes();
    };
    // 列按当天真实事件生成：Day 1 只有 5 节就只出 5 列，礼拜三那条 8:30–8:30 也不会再冒出来
    let pNo = 0;
    const periods = tm.map((c) => {
      const from = minutesOf(c.start), to = minutesOf(c.end);
      const span = (from === from && to === to) ? to - from : NaN;
      const time = (clock(c.start) && clock(c.end)) ? clock(c.start) + '–' + clock(c.end) : '';
      const isHome = Number.isFinite(span) && span > 0 && span <= 20 && Number.isFinite(from) && from <= 8 * 60 + 45;
      if (isHome) return ['Homeroom', time];
      pNo += 1;   // Homeroom 不占节次号，否则整排都会往后偏一位（第二列变成 Period 2）
      return ['Period ' + pNo, time];
    });
    const thead = el('thead');
    const trh = el('tr');
    for (let i = 0; i < tm.length; i += 1) {
      const [name, time] = periods[i] || ['Period ' + (i + 1), ''];
      trh.append(el('th', { style: 'width:12%' }, name, el('time', { class: 'meta' }, ' ' + time)));
    }
    thead.append(trh);
    const tbody = el('tbody');
    const tr = el('tr');
    for (const c of tm) {
      /* 空节次（那天没课）也留一格：站点原版就是一个空框，别把整列抽掉。 */
      if (!c.name) { tr.append(el('td', { style: 'width:12%' }, el('div', null, el('div', { class: 'wt-tt-blank' })))); continue; }
      const card = el('div', { class: 'timetable-subject', style: `background:${c.color || 'rgb(230,230,230)'};height:146px`, 'data-timetable-subject': '' },
        el('a', { href: c.homepage || '#' }, c.name),
        el('div', null, '(' + (c.label || c.code) + ')'),
        c.room ? el('div', null, c.room) : null,
      );
      tr.append(el('td', { style: 'width:12%' }, el('div', null, card)));
    }
    tbody.append(tr);
    const table = el('table', { class: 'timetable', 'data-timetable': '' }, thead, tbody);
    const mobile = el('div', { class: 'row timetable-small show-for-small-only' }, el('div', { class: 'small-12 island no-pad' }));
    const mtable = el('table', { class: 'no-hover' });
    for (let i = 0; i < tm.length; i += 1) {
      const [name, time] = periods[i] || ['Period ' + (i + 1), ''];
      const c = tm[i];
      const mcard = el('div', { class: 'timetable-subject', style: `background:${c.color || 'rgb(230,230,230)'}` },
        el('a', { href: c.homepage || '#' }, c.name),
        el('div', null, '(' + (c.label || c.code) + ')'),
        c.room ? el('div', null, c.room) : null,
      );
      mcard.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const cls = (cached.classes || []).find((x) => x.code === c.code);
        if (cls) openModal({ cls, items: normItems(cls), index: 0 });
      });
      mtable.append(el('tr', null, el('th', { style: 'width:12%' }, name, el('time', { class: 'meta' }, ' ' + time)), el('td', { style: 'width:12%' }, el('div', null, mcard))));
    }
    mobile.firstChild.append(mtable);
    const host = el('div', { style: 'padding:0 8px;box-sizing:border-box;' });
    const ttSec = el('section', { class: 'wt-tt-sec' }, el('div', { class: 'scrollable wt-tt-wrap' }, table));
    /* 「下一天」就一个动作：原地把课表换成下一个上学日，再按一次换回来。
       以前这个按钮两个身份（没切过就弹列表、切过就退回），点了会猜不透。
       列表挪到旁边的 ☰ 上。 */
    ttSec.append(el('div', { class: 'wt-tt-actions' },
      el('button', {
        class: 'wt-tt-nextday',
        type: 'button',
        title: 'Show the next school day in place (same key as the shortcut)',
        onclick: (e) => { e.stopPropagation(); try { if (window.__wtNextDay) window.__wtNextDay(e.currentTarget); } catch { /* ignore */ } },
      }, "Next day \u203a"),
      el('button', {
        class: 'wt-tt-daylist',
        type: 'button',
        title: 'Pick a day from a list',
        'aria-label': 'Pick a day from a list',
        onclick: (e) => { e.stopPropagation(); try { if (window.__wtNextDayList) window.__wtNextDayList(); else openNextDay(allClasses()); } catch { /* ignore */ } },
      }, '\u2630')));
    /* 标题由顶部那颗（.wt-tt-top 里的 .wt-tt-head）统一负责：它一直在面板上面，
       合成表被拆掉重建也不会跟着消失，周次胶囊只需搬过去一次。 */
    host.append(el('div', { class: 'row' }, el('div', { class: 'small-12 show-for-medium-up' }, ttSec)), mobile);
    return { host, table };
  }

  async function enrichRooms(classes) {
    try {
      const res = await fetch('/timetable', { credentials: 'include' });
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const map = new Map();
      for (const card of doc.querySelectorAll('.timetable-subject')) {
        const divs = [...card.querySelectorAll('div')];
        const code = (divs[0] ? divs[0].innerText : '').replace(/[()]/g, '').trim();
        const room = divs[1] ? divs[1].innerText.trim() : '';
        if (code && room) map.set(code, room);
      }
      for (const c of classes) { if (!c.room && map.has(c.code)) c.room = map.get(c.code); }
    } catch { /* ignore */ }
  }

  async function weekendMode() {
    // The calendar API knows which day last actually had classes, so it wins over
    // the local cache: a cache written on Wednesday must not be shown on Saturday
    // while Friday's timetable is available. The cache is the offline fallback.
    let cached = await withTimeout(fetchPastTimetable(), 4500, null);
    if (!cached) cached = lastWeekdayCache();
    if (!cached) { toast('No timetable today'); return false; }
    cached = await withTimeout(hydrateFromGrid(cached), 9000, cached);
    return syntheticView(cached, false);
  }
  /* 上学日但站点还没把今天的课表发出来（凌晨最常见）时，用 /timetable 那张
     星期表现拼一张「今天的课表」。拼不出来才退回上一个上学日。 */
/* 顶层那份星期表：buildSummary 里的 loadTtGrid 关在它自己的闭包里，外面这层
   （gridDayCached / hydrateFromGrid / todayFromGrid）看不见它，直接调会 ReferenceError。
   所以顶层单独留一份，逻辑一样、自带 5 分钟缓存。 */
let WT_GRID_TOP = null;
let WT_GRID_TOP_AT = 0;
async function wtGrid() {
  try {
    if (typeof loadTtGrid === 'function') { const g = await loadTtGrid(); if (g && g.days && g.days.length) return g; }
  } catch (e) { /* 闭包里那份拿不到就自己取 */ }
  if (WT_GRID_TOP && Date.now() - WT_GRID_TOP_AT < 5 * 60 * 1000) return WT_GRID_TOP;
  try {
    const res = await fetch('/timetable', { credentials: 'include' });
    if (!res || !res.ok) return WT_GRID_TOP;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const tbl = doc.querySelector('table.timetable');
    if (!tbl) return WT_GRID_TOP;
    const heads = [...tbl.querySelectorAll('thead th')].map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim());
    const trs = [...tbl.querySelectorAll('tbody tr')].filter((tr) => {
      const t = (tr.children[0] ? tr.children[0].textContent : '').replace(/\s+/g, ' ').trim();
      return /^(homeroom|period\s*\d+)/i.test(t);
    });
    const periods = trs.map((tr) => {
      const t = (tr.children[0].textContent || '').replace(/\s+/g, ' ').trim();
      const m = /^(.*?)\s*(\d{1,2}:\d{2})\s*(am|pm)?\s*[–-]\s*(\d{1,2}:\d{2})\s*(am|pm)?/i.exec(t);
      if (!m) return { label: t, from: '', to: '' };
      return { label: (m[1] || '').trim(), from: m[2] + (m[3] || ''), to: m[4] + (m[5] || '') };
    });
    const days = [];
    const cols = heads.length || 11;
    for (let c = 1; c < cols; c += 1) {
      const cells = trs.map((tr) => {
        const td = tr.children[c];
        if (!td) return null;
        const txt = (td.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt) return null;
        const a = td.querySelector('a');
        let code = '';
        const mh = /\/homepage\/code\/([^/?#]+)/.exec((a && a.getAttribute('href')) || '');
        if (mh) { try { code = decodeURIComponent(decodeURIComponent(mh[1])); } catch (e) { code = mh[1]; } }
        const pm = /^(.*?)\s*\(([^)]+)\)\s*([\s\S]*)$/.exec(txt);
        const name = (pm ? pm[1] : txt).trim() || txt;
        const rest = (pm ? pm[3] : '').split(/\s+/).filter(Boolean);
        let room = '';
        if (rest.length && /^[A-Z]{1,2}\d{1,3}[A-Z]?$/i.test(rest[0])) room = rest[0];
        else if (rest.length && /^(study|room|hall|library|gym|lab|centre|center)/i.test(rest[0])) room = rest.slice(0, 2).join(' ');
        /* 那一天的颜色就写在这张卡的行内样式里（background-color:#fb607a），
           照抄过来，手动挑出来的那天才不会是一排灰砖。 */
        let color = '';
        const sub = td.querySelector('[data-timetable-subject],.timetable-subject');
        if (sub) {
          const st = sub.getAttribute('style') || '';
          const mc = /background-color:\s*([^;]+)/i.exec(st);
          if (mc) color = mc[1].trim();
        }
        return { code: code || (pm ? pm[2] : ''), room, name, color };
      });
      days.push({ n: c, label: heads[c] || ('Day ' + c), cells });
    }
    if (days.length) { WT_GRID_TOP = { periods, days }; WT_GRID_TOP_AT = Date.now(); }
    return WT_GRID_TOP;
  } catch (e) { return WT_GRID_TOP; }
}

  function isoAt(t) {
    const m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(String(t || '').trim());
    if (!m) return '';
    let h = Number(m[1]);
    const ap = (m[3] || '').toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, Number(m[2]), 0, 0);
    return d.toISOString();
  }
  /* 日历 API 只认「有事件」的课，某天最后一节没挂事件就少一列（实测周一只有 6 节，
     站点课表上是 7 节）。所以拿 /timetable 那张星期表补全：先按课名匹配出是哪一天，
     再整列照抄（课名、教室、上下课时间都以那张表为准）。 */
  async function hydrateFromGrid(cached) {
    const grid = await wtGrid();
    if (!grid || !grid.days || !grid.days.length) return cached;
    const key = (v) => String(v || '').toLowerCase().replace(/[^a-z]/g, '');
    let best = null; let bestScore = 0;
    for (const d of grid.days) {
      let sc = 0;
      for (const c of cached.classes || []) {
        const k = key(c.name).slice(0, 10);
        if (!k) continue;
        if ((d.cells || []).some((cell) => cell && key(cell.name).includes(k.slice(0, 8)))) sc += 1;
      }
      if (sc > bestScore) { bestScore = sc; best = d; }
    }
    if (!best || bestScore < 2) return cached;
    /* 整列照抄：站点课表就是 Homeroom + Period 1..6 七行，空着的那节留一个空格，
       别把末尾没课的节次抽掉（周一最后一节没课，用户要看到 Period 6 还在）。 */
    if (!(best.cells || []).some(Boolean)) return cached;
    const last = Math.max(((best.cells || []).length || 0) - 1, 0);
    const classes = [];
    for (let i = 0; i <= last; i += 1) {
      const cell = (best.cells || [])[i];
      const p = grid.periods[i] || {};
      classes.push(cell
        ? { name: cell.name, room: cell.room, code: cell.code, start: isoAt(p.from), end: isoAt(p.to), color: cell.color || '', homepage: '' }
        : { name: '', room: '', code: '', start: isoAt(p.from), end: isoAt(p.to), color: '', homepage: '' });
    }
    if (classes.length <= (cached.classes || []).length) return cached;
    return { ...cached, classes, tmCodes: null, gridDay: best.n };
  }
  async function todayFromGrid() {
    const grid = await wtGrid();
    if (!grid || !grid.days || !grid.days.length) return null;
    const dayNum = await dayNumForDate(new Date(), grid);
    const col = grid.days.find((d) => d.n === dayNum);
    if (!col) return null;
    const classes = [];
    grid.periods.forEach((p, i) => {
      const cell = col.cells[i];
      if (!cell) return;
      classes.push({ name: cell.name, room: cell.room, code: cell.code,
        start: isoAt(p.from), end: isoAt(p.to), color: cell.color || '', homepage: '' });
    });
    if (!classes.length) return null;
    const label = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
    return { classes, day: new Date(), tmCodes: null, gridDay: dayNum, title: 'Today · ' + label };
  }
  /* 直接用 /timetable 那张星期表造一份「某天」的课表：Homeroom + Period 1..6 七行全留，
     空的那节给个空壳，和站点原版一致。屏幕上的节次永远不缺一格。 */
  async function gridDayCached(dayNum) {
    const grid = await wtGrid();
    if (!grid || !grid.days || !grid.days.length) return null;
    const col = grid.days.find((d) => d.n === dayNum);
    if (!col || !(col.cells || []).some(Boolean)) return null;
    const classes = [];
    (grid.periods || []).forEach((p, i) => {
      const cell = (col.cells || [])[i];
      classes.push(cell
        ? { name: cell.name, room: cell.room, code: cell.code, start: isoAt(p.from), end: isoAt(p.to), color: cell.color || '', homepage: '' }
        : { name: '', room: '', code: '', start: isoAt(p.from), end: isoAt(p.to), color: '', homepage: '' });
    });
    return { classes, day: new Date(), tmCodes: null, gridDay: dayNum };
  }
  async function todayMode() {
    const cached = await todayFromGrid();
    if (!cached) return false;
    /* 手动挑了别的天：今天这张真表不许把它盖掉 */
    /* 站点发的是别的日子（换天/周末）就别再拿星期表去顶它 */

    return syntheticView(cached, true);
  }
  async function syntheticView(cached, isToday) {
    await enrichRooms(cached.classes || []);
    const built = buildSyntheticTimetable(cached);
    if (!built) { toast('No timetable today'); return false; }
    const col = document.querySelector('.column-left');
    const row = col ? col.closest('.row') : null;
    const full = el('div', { class: 'wt-tt-body' }, built.host);
    /* 插到「Day x / Last school day」标题的正后方，而不是插到整行前面：
       那一行里同时装着标题和 .column-left，插在行首会让课表跑到标题和面板上面去。 */
    /* 课表那一行所在的容器：合成课表和面板都要排在里面，顺序恒为「面板 → 课表」。
       周末页面上站点不渲染 [data-timetable-header]，所以不能再拿标题当锚点。 */
    const head = document.querySelector('[data-timetable-header]');
    const panelEl = document.querySelector('[data-wesley-home]');
    /* 面板外面套着我们自己那层「row > small-12.columns」，合成课表要跟着那一层走：
       塞进 columns 里会变成「列中列」，左右内边距会翻倍。 */
    const holder = (panelEl && panelEl.parentElement) || (head && head.parentElement) || (col ? col.parentElement : null);
    if (holder) {
      const anchor = (panelEl && panelEl.parentElement === holder) ? panelEl : head;
      if (anchor && anchor.parentElement === holder) anchor.insertAdjacentElement('afterend', full);
      else holder.insertBefore(full, holder.firstElementChild);
    } else {
      const host = col || document.querySelector('#main') || document.body;
      if (host.firstChild) host.insertBefore(full, host.firstChild); else host.append(full);
    }
    WEEKEND_MODE = true;
    TARGET_DAY = new Date(cached.day);
    WEEKEND_DATA = cached.classes || [];
    LAST_CLASS_COUNT = WEEKEND_DATA.length;   /* 走的是合成课表，没跑 collectPeriods，别让它误判「读不到课表」 */
    /* 手动挑的那一天不算「上一个上学日」：写进缓存，下次断网/周末会把它当成真实的一天端出来 */
    saveDay(WEEKEND_DATA, cached.tmCodes || null, TARGET_DAY);
    refreshHeadLabel(TARGET_DAY);
    /* 站点自己的「上一个上学日」课表常常比我们晚几秒才渲染，那样屏幕上就是两张表。
       藏掉站点那张，只留我们这张（它带 Next day / ☰）。表没来就什么也不做。 */
    const hideSiteTable = () => {
      const h = siteTtHead();
      if (!h || !h.parentElement) return false;
      /* 只藏「站点那张表的外壳」，而且必须精确定位到标题这一层的直接子节点。
         以前是「凡是子孙里有 table.timetable 的兄弟都藏」，结果合成课表被面板带进
         .column-left 之后，那个外层也满足条件 —— 一藏，左栏连同右侧日历一起塌掉，
         页面上就只剩日历顶在最上面。 */
      const wrapOf = new Map();
      for (const t of h.parentElement.querySelectorAll('table.timetable')) {
        if (full.contains(t)) continue;           /* 我们自己那张表不算 */
        let n = t;
        while (n && n.parentElement && n.parentElement !== h.parentElement) n = n.parentElement;
        if (n && n.parentElement === h.parentElement) wrapOf.set(n, true);
      }
      let hid = false;
      for (const sib of wrapOf.keys()) {
        /* 带面板或者带动合成课表的那一层绝对不能藏，藏了整块布局就没了 */
        if (sib === full || sib.contains(full) || full.contains(sib)) continue;
        if (panelEl && (sib === panelEl || sib.contains(panelEl))) continue;
        sib.setAttribute('data-wt-hide-tt', '1');
        sib.style.setProperty('display', 'none', 'important');
        hid = true;
      }
      return hid;
    };
    /* 合成课表带自己的标题（面板 → 标题 → 表）。站点那一块（标题 + 它自己的表）
       在合成模式下整块藏掉，否则页面上会出现两个标题、两张表。只藏 section，
       别碰 .column-left —— 那一列里还有磁贴，藏掉整页就塌了。 */
    const siteHead = siteTtHead();
    const siteSec = siteHead ? siteHead.closest('section.wt-tt-sec') || siteHead.parentElement : null;
    const panelNow = document.querySelector('[data-wesley-home]');
    if (siteSec && !siteSec.contains(full) && !(panelNow && siteSec.contains(panelNow))) {
      siteSec.setAttribute('data-wt-hide-tt', '1');
      siteSec.style.setProperty('display', 'none', 'important');
    }
    /* 这块合成课表必须待在面板下面。标题和 .column-left 在同一个行里，
       插错位置就会「课表在上面、面板在下面」。所以每次 tick 都对一次位置。 */
    const placeSynth = () => {
      const h = siteTtHead();
      const panel = document.querySelector('[data-wesley-home]');
      /* 面板在就贴着面板摆；面板不在才退回按标题摆。 */
      if (panel && panel.parentElement) {
        if (full === panel || full.contains(panel)) return;   /* 面板在这块里面，别自己套自己 */
        if (full.previousElementSibling !== panel) {
          try { panel.insertAdjacentElement('afterend', full); } catch (e) { /* 位置不对就先待着 */ }
        }
        return;
      }
      if (!h || !h.parentElement) return;
      const anchor = panel || h;
      if (full.previousElementSibling === anchor) return;
      anchor.insertAdjacentElement('afterend', full);
    };
    placeSynth();
    hideSiteTable();
    /* 合成课表带自己的标题，周次胶囊和 Day 选择器要跟着挂到这颗标题上
       （旧的那颗已经在换天时连同旧 body 一起被删了，这里重建）。 */
    renderWeekChip();
    let hideTicks = 0;
    const hideTimer = setInterval(() => {
      /* 这块合成课表已经被删掉了（换天时会清掉旧的 .wt-tt-body）。
         以前定时器还在跑，placeSynth() 会把删掉的节点又插回面板后面，
         选一次 Day 5、再选 Day 1 就会在页面上叠出两张表。 */
      if (!full.isConnected) { clearInterval(hideTimer); return; }
      hideTicks += 1;
      /* 站点自己把今天的表发出来了（标题不再是 Last school day / Showing …）就让位给真表，
         否则一直盖着「上一个上学日」的课，用户看到的是错的。
         我们自己补的那颗标题（data-wt-own）不算「站点发出来了」：以前它被当成真表，
         于是合成课表刚画好就被自己拆掉，来回闪。 */
      {
        const real = siteTtHead();
        const realTxt = real ? String(real.textContent || '').trim() : '';
        if (real && !/last school day|^showing/i.test(realTxt) && document.querySelector('table.timetable:not(.wt-tt-body table)')) {
          clearInterval(hideTimer);
          try { full.remove(); } catch (e) { /* ignore */ }
          document.querySelectorAll('[data-wt-hide-tt]').forEach((n) => {
            n.removeAttribute('data-wt-hide-tt');
            n.style.removeProperty('display');
          });
          WEEKEND_MODE = false;
          renderWeekChip();
          toast('Showing today');
          return;
        }
      }
      placeSynth();
      hideSiteTable();
      if (hideTicks > 40) clearInterval(hideTimer);
    }, 500);
    try { await fetchPostsFor(WEEKEND_DATA); } catch (e) { /* ignore */ }
    await main();
    if (isToday) toast('Showing today');
    else toast('Showing the last school day');
    return true;
  }

  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (!msg) return;
    if (msg.type === 'wt-apply') { try { window.location.reload(); } catch { /* ignore */ } respond({ ok: true }); return; }
    if (msg.type === 'wt-clear-cache') {
      try {
        Object.keys(localStorage).forEach((k) => { if (k.startsWith('wesleyLocal:') || k.startsWith('wesleyTasks:') || k.startsWith('wesleyAi:') || k.startsWith('wesleySearch:') || k.startsWith('wesleyLog')) localStorage.removeItem(k); });
        sessionStorage.removeItem('wtFreshAll');
        chrome.storage.local.clear(() => {});
        respond({ ok: true });
        setTimeout(() => { try { window.location.reload(); } catch { /* ignore */ } }, 150);
      } catch (e) { respond({ ok: false, error: String(e) }); }
      return true;
    }
    if (msg.type === 'wt-reread-all') {
      try {
        Object.keys(localStorage).filter((k) => k.startsWith('wesleyLocal:')).forEach((k) => localStorage.removeItem(k));
        sessionStorage.setItem('wtFreshAll', '1');
        respond({ ok: true });
        setTimeout(() => { try { window.location.reload(); } catch { /* ignore */ } }, 120);
      } catch (e) { respond({ ok: false, error: String(e) }); }
      return true;
    }
    if (msg.type === 'wt-reread') {
      try {
        const d = new Date();
        localStorage.removeItem('wesleyLocal:' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate());
        respond({ ok: true }); setTimeout(() => { try { window.location.reload(); } catch { /* ignore */ } }, 120); }
      catch (e) { respond({ ok: false, error: String(e && e.message ? e.message : e) }); }
      return true;
    }
  });

  const fixUrl = (u) => String(u || '').replace(/%252F/gi, '%2F');
  function renderFetch(url, wait) {
    return new Promise((resolve) => {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1280px;height:1800px;border:0;visibility:hidden;';
      let done = false;
      const finish = (v) => { if (done) return; done = true; try { f.remove(); } catch { /* ignore */ } resolve(v); };
      f.src = url;
      f.addEventListener('load', () => setTimeout(() => { try { finish(f.contentDocument); } catch { finish(null); } }, wait || 2500));
      setTimeout(() => finish(null), 12000);
      document.body.append(f);
    });
  }
  function wtLog(msg) {
    try {
      const arr = JSON.parse(localStorage.getItem('wesleyLog:v1') || '[]');
      arr.push({ t: new Date().toISOString(), msg: String(msg) });
      localStorage.setItem('wesleyLog:v1', JSON.stringify(arr.slice(-300)));
      try { chrome.storage.local.get({ wesleyLogs: [] }, (v) => { const l = Array.isArray(v.wesleyLogs) ? v.wesleyLogs : []; l.push({ t: new Date().toISOString(), msg: String(msg) }); chrome.storage.local.set({ wesleyLogs: l.slice(-500) }); }); } catch { /* ignore */ }
      if (/error|fail|exception|timeout|429/i.test(String(msg))) autoExportLogsOnError();
    } catch { /* ignore */ }
  }
function pageText(doc, sels) {
  for (const sel of sels) { const n = doc.querySelector(sel); if (n && n.textContent.trim()) return n.textContent.trim().replace(/\s+/g, ' '); }
  return '';
}
async function readNews(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('news ' + res.status);
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  const title = pageText(doc, ['h1', '.post h1', '.post-title', '[class*="postTitle"]', '[class*="entry-title"]', '.meta b', '.title']) || doc.title;
  let author = pageText(doc, ['.meta a[href*="/search/user/"]', '.meta a', '.post-author', '[class*="author"]', '.byline', '[class*="posted-by"]']);
  if (!author) {
    const m = doc.body.textContent.match(/Posted by\s+([A-Z][A-Za-z'.\- ]{2,40})/);
    if (m) author = m[1].trim();
  }
  const date = pageText(doc, ['time', '[class*="date"]', '[datetime]']);
  return { url: url, id: (url.match(/\/news\/(\d+)/) || [])[1] || '', title: (title || '').slice(0, 140), author: (author || '').slice(0, 60), date: (date || '').slice(0, 40) };
}
function newsLinksFromDom() {
  return [...document.querySelectorAll('a[href*="/news/"]')]
    .map((a, i) => ({ href: a.getAttribute('href') || '', text: (a.textContent || '').replace(/\s+/g, ' ').trim(), el: a, order: i }))
    .filter((o) => /\/news\/\d+/.test(o.href));
}
function newsAge(anchor) {
  // 从卡片文字里读相对时间。站点常写 "a day ago"/"an hour ago"/"yesterday at 4:28pm"，
  // 以前只认数字，全都读不出来 → 退回 DOM 顺序 → 弹出来的不是最新那条。
  // 往上找的时候一旦经过「包含多个帖子链接」的容器就停：那是整块列表，读它只会读到别人的时间。
  const MULT = { minute: 60, hour: 3600, day: 86400, week: 604800, month: 2592000 };
  let node = anchor;
  for (let i = 0; i < 6 && node; i += 1) {
    const ids = new Set();
    node.querySelectorAll('a[href*="/news/"]').forEach((a) => {
      const mm = /\/news\/(\d+)/.exec(a.getAttribute('href') || '');
      if (mm) ids.add(mm[1]);
    });
    if (ids.size > 1) break;
    const t = (node.textContent || '').replace(/\s+/g, ' ');
    const rel = /\b(\d+|a|an)\s+(minute|hour|day|week|month)s?\s+ago/i.exec(t);
    if (rel) {
      const n = /^\d+$/.test(rel[1]) ? Number(rel[1]) : 1;
      return n * (MULT[String(rel[2]).toLowerCase()] || 60);
    }
    if (/\bjust now\b/i.test(t)) return 0;
    if (/\byesterday\b/i.test(t)) return 86400;
    // "today at 4:28pm" 才是发帖时间；光有 today 的字样多半来自别处（"due today"），不能用
    if (/\btoday\s+at\s+\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(t)) return 1800;
    node = node.parentElement;
  }
  return Infinity;
}
function newestNewsLink(list) {
  // 不能拿 /news/<id> 的数字当新旧依据：站点帖子 id 不是按发布时间递增的，
  // 结果会挑到第二条（历史帖子 id 更大）。按"多久之前"取最小，读不到就按 DOM 顺序。
  let best = null;
  let bestAge = Infinity;
  for (const o of list) {
    const age = o.el ? newsAge(o.el) : Infinity;
    if (age < bestAge) { bestAge = age; best = o; }
  }
  return best || list[0] || null;
}
// 1.0.x: the /home route now answers 404 and the fetched HTML has no news links at all.
// Read the widget that is already on the page instead, waiting up to 6s for it to render.
async function latestNews() {
  // 面板构建时新闻卡片往往还没渲染全（先出现的是侧栏/归档），只取一次快照会拿到旧帖。
  // 采样 ~2.5s，取"最近发布"最小的那条；一旦找到 1 小时内的新帖就提前收手。
  let link = null;
  let bestAge = Infinity;
  let lastCount = -1;
  let stable = 0;
  for (let i = 0; i < 24; i += 1) {
    const links = newsLinksFromDom();
    const cand = newestNewsLink(links);
    const age = cand ? newsAge(cand.el) : Infinity;
    if (cand && age < bestAge) { bestAge = age; link = cand; }
    if (links.length === lastCount) stable += 1;
    else { stable = 0; lastCount = links.length; }
    if (bestAge <= 3600) break;
    if (link && stable >= 3) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!link) return null;
  const url = new URL(link.href, location.origin).href;
  const id = (url.match(/\/news\/(\d+)/) || [])[1] || '';
  if (!id) return null;
  const label = link.text && !/^read more$/i.test(link.text) ? link.text.slice(0, 140) : '';
  try {
    const news = await readNews(url);
    if (!news.title) news.title = label;
    news.id = news.id || id;
    return news;
  } catch (e) {
    if (!label) return null;
    return { url: url, id: id, title: label, author: '', date: '' };
  }
}

function showNewsAlert(news) {
  if (!news || !news.title) return;
  // 只往面板里放。以前面板还没建好时会往 <body> 顶上挂一条浮动的，
  // 但 .wt-alert-wrap 的样式全都限定在 [data-wesley-home] 下面 —— 浮动条既没有样式，
  // .show 也不生效，于是变成屏幕顶端一条既丑又关不掉的东西。
  const host = document.querySelector('[data-wesley-home]');
  if (!host) return;
  // 早先版本留下的浮动条，见到就清掉
  document.querySelectorAll('body > .wt-alert-wrap.wt-alert-float').forEach((n) => n.remove());
  let wrap = host.querySelector('.wt-alert-wrap');
  if (!wrap) {
    wrap = el('div', { class: 'wt-alert-wrap', role: 'status', 'aria-live': 'polite' }, el('div', { class: 'wt-alert-inner' }));
    host.insertBefore(wrap, host.firstChild);
  }
  const inner = wrap.querySelector('.wt-alert-inner');
  const t = el('span', { class: 'wt-alert-text' });
  t.append(el('b', null, news.author || 'Someone'), document.createTextNode(' posted a new post '), el('b', null, '\u201c' + (news.title || 'Untitled') + '\u201d'));
  const x = el('span', { class: 'wt-alert-x' }, '×');
  const btn = el('button', { class: 'wt-alert', type: 'button' }, el('span', { class: 'wt-alert-dot' }), t, x);
  btn.title = news.url;
  btn.addEventListener('click', (e) => {
    if (e.target === x) { e.stopPropagation(); wrap.dataset.wtDismissed = '1'; wrap.classList.remove('show'); return; }
    window.open(news.url, '_blank', 'noopener');
  });
  inner.replaceChildren(btn);
  const reveal = () => { if (wrap.isConnected) wrap.classList.add('show'); };
  requestAnimationFrame(reveal);
  // 页面在后台时 rAF 会被暂停，光靠 rAF 这条提醒会一直停在「高度 0」
  setTimeout(reveal, 80);
  startUnreadPoll();
}
function siteUnreadCount() {
  // 站点右上角铃铛：<a id="notification-toggle" data-unread="3"><span data-unread-count></span></a>
  const bell = document.querySelector('#notification-toggle') || document.querySelector('a.right-off-canvas-toggle');
  if (!bell) return null;
  const raw = bell.getAttribute('data-unread');
  if (raw !== null && raw !== '') { const n = Number(raw); return Number.isFinite(n) ? n : null; }
  const span = bell.querySelector('[data-unread-count]');
  const txt = ((span && span.textContent) || '').trim();
  if (!txt) return 0;
  const n = Number(txt);
  return Number.isFinite(n) ? n : null;
}
function hideNewsAlert() {
  const wrap = document.querySelector('[data-wesley-home] .wt-alert-wrap');
  if (!wrap) return;
  wrap.dataset.wtDismissed = '1';
  wrap.classList.remove('show');
  setTimeout(() => { if (wrap.isConnected) wrap.remove(); }, 420);
}
let UNREAD_TIMER = null;
let UNREAD_SEEN = 0;
function startUnreadPoll() {
  if (UNREAD_TIMER) return;
  UNREAD_SEEN = 0;
  let ticks = 0;
  UNREAD_TIMER = setInterval(() => {
    ticks += 1;
    const wrap = document.querySelector('[data-wesley-home] .wt-alert-wrap');
    if (!wrap || !wrap.classList.contains('show') || ticks > 100) {
      clearInterval(UNREAD_TIMER);
      UNREAD_TIMER = null;
      return;
    }
    unreadWatchOn();
  }, 3000);
}
function unreadWatchOn() {
  // 站点那边把通知读掉了（铃铛从有未读变成 0）就把我们这条也撤了，
  // 别留一条已经没意义的提醒。一直就是 0 的话不动它（有些帖子不会让铃铛计数）。
  const n = siteUnreadCount();
  if (n === null) return;
  if (n > 0) { UNREAD_SEEN = n; return; }
  if (UNREAD_SEEN > 0) hideNewsAlert();
}
async function maybeNewsAlert(cfg) {
  if (!cfg || cfg.newsAlert === false) return;
  try {
    const news = await latestNews();
    if (!news || !news.title || !news.id) return;
    let seen = null;
    try { const local = await chrome.storage.local.get({ lastNewsId: null }); seen = local.lastNewsId || null; } catch (e) { seen = cfg.lastNewsId || null; }
    // 这台机器第一次跑：把当前这条记下来就走，不弹。否则新装的人一开页面就被历史帖子刷一遍。
    if (!seen) {
      try { chrome.storage.local.set({ lastNewsId: news.id }); } catch (e) { /* ignore */ }
      return;
    }
    wtLog('[news] newest=' + news.id + ' ' + String(news.title || '').slice(0, 40));
    if (news.id === seen) return;
    const live = document.querySelector('.wt-alert-wrap');
    const dismissed = live && live.dataset.wtDismissed === '1';
    if (dismissed) { try { chrome.storage.local.set({ lastNewsId: news.id }); } catch (e) { /* ignore */ } return; }
    showNewsAlert(news);
    try { chrome.storage.local.set({ lastNewsId: news.id }); } catch (e) { /* ignore */ }
  } catch (e) { /* ignore */ }
}
async function forceNewsAlert() {
  try {
    const news = await latestNews();
    if (news) wtLog('[news] test=' + news.id + ' ' + String(news.title || '').slice(0, 40));
    if (news) showNewsAlert(news);
    else wtLog('news test: could not read the news page');
  } catch (e) { wtLog('news test failed: ' + e); }
}
try {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'wt-test-alert') { forceNewsAlert(); return true; }
  });
} catch (e) { /* ignore */ }
// 亮/暗主题：system 跟随系统，light/dark 强制；只改 <html data-wt-theme>，CSS 用 token 接管
function rememberTheme(mode) {
  try { localStorage.setItem('wesleyTheme', mode || 'system'); } catch { /* ignore */ }
}
function themeIsDark() {
  const pref = String((settings && settings.theme) || "system");
  if (pref === "dark") return true;
  if (pref === "light") return false;
  try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch { return false; }
}
function paintPageBackground() {
  const body = document.body;
  if (!body) return;
  if (themeIsDark()) {
    if (body.dataset.wtLightBg === undefined) body.dataset.wtLightBg = body.style.backgroundImage || '';
    /* 纯色而不是渐变：渐变不能插值，亮暗切换时背景会硬跳，和别的板块不同步。 */
    body.style.backgroundImage = "none";
    body.style.backgroundColor = "#121013";
  } else if (body.dataset.wtLightBg !== undefined) {
    body.style.backgroundImage = body.dataset.wtLightBg;
    body.style.backgroundColor = "";
    delete body.dataset.wtLightBg;
  }
}
/* 亮暗切换不做过渡了。
   试过三种：整屏蒙版淡出（只淡得了背景，内容硬切，比不做还怪）、逐属性 transition 常驻类
   （站点 62ms 就把 class 整份重写）、adoptedStyleSheets 临时挂表（方案本身成立，但两千多条
   颜色声明同一下场，看着还是一跳）。干脆不做 —— 站点自己的换主题也是瞬切。 */
function applyTheme(prefArg) {
  const pref = String(prefArg || (settings && settings.theme) || "system");
  let dark = pref === "dark";
  if (pref === "system") {
    try { dark = window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { dark = false; }
  }
  const root = document.documentElement;
  const next = dark ? "dark" : "light";
  root.dataset.wtTheme = next;
  rememberTheme(pref);
  paintPageBackground();
  /* 面板自己那层底色是内联写的，光换 data-wt-theme 换不掉它 */
  try { if (typeof PANEL_PAINT_BG === 'function') PANEL_PAINT_BG(); } catch (e) { /* ignore */ }
}

/* main() 里那条 storage 监听要等抓完数据才挂上，在那之前（或者标签页在后台被冻过）改主题
   会漏掉，表现就是"设置里切成亮色了，面板还是黑的"。这里再挂一层：模块加载就监听，
   外加回到前台时主动对一次，成本只有一次 get。 */
try {
  chrome.storage.onChanged.addListener((ch) => {
    if (!ch || !ch.theme || ch.theme.newValue === undefined) return;
    if (settings) settings.theme = ch.theme.newValue;
    applyTheme(ch.theme.newValue);
  });
} catch (e) { /* ignore */ }
function resyncTheme() {
  try {
    chrome.storage.local.get(["theme"], (r) => {
      const pref = String((r && r.theme) || "system");
      if (settings) settings.theme = pref;
      const now = document.documentElement.dataset.wtTheme;
      const want = pref === "dark" ? "dark" : pref === "light" ? "light" : ((() => { try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { return "light"; } })());
      if (now !== want) applyTheme(pref);
    });
  } catch (e) { /* ignore */ }
}
try {
  window.addEventListener("focus", resyncTheme, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) resyncTheme(); });
} catch (e) { /* ignore */ }
// 站点的 #message-list 是服务端渲染的，刷新很慢；我们的 alert 直接读 /news 列表，
// 所以定时复查一次，避免"开着的 alert 还停在第二新的那条"。
function startNewsWatch() {
  let busy = false;
  setInterval(async () => {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const wrap = document.querySelector('.wt-alert-wrap');
      // 只在这块 UI 存在/开着的时候复查，免得没人看也一直请求
      if (wrap && wrap.classList.contains('show')) { unreadWatchOn(); await maybeNewsAlert(settings); }
    } catch (e) { /* ignore */ } finally { busy = false; }
  }, 45000);
}
async function main() {
    settings = await loadSettings();
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (!changes || (area !== 'local' && area !== 'sync')) return;
        for (const k of Object.keys(changes)) {
          const v = changes[k];
          if (v && Object.prototype.hasOwnProperty.call(v, 'newValue')) settings[k] = v.newValue;
        }
        if (changes.perfMode && changes.perfMode.newValue !== undefined) {
          document.documentElement.classList.toggle('wt-perf', changes.perfMode.newValue === true);
        }
        if (changes.animations && changes.animations.newValue !== undefined) {
          document.documentElement.classList.toggle('wt-low-anim', changes.animations.newValue === false);
        }
        if (changes.theme) applyTheme();
        if (changes.testAlertAt && changes.testAlertAt.newValue) forceNewsAlert();
        if (changes.newsAlert && changes.newsAlert.newValue === true) maybeNewsAlert(settings);
      });
    } catch { /* ignore */ }
    wtLog('boot inject=' + settings.inject);
    if (settings.inject === false) return;
    clearLegacyCache();
    markBooting(true);
    const reduceMotion = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
document.documentElement.classList.toggle('wt-reduce', reduceMotion);
applyTheme();
try {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", () => { if (String((settings && settings.theme) || "system") === "system") applyTheme(); });
} catch (e) { /* ignore */ }
// reduced motion wins over the speed slider: near-zero duration instead of a slower animation
const effSpeed = reduceMotion ? 0.02 : 1 / Math.max(0.25, Math.min(5, Number(settings.animSpeed) || 1));
document.documentElement.style.setProperty('--wt-spd', String(effSpeed));
    try {
      const local = await chrome.storage.local.get({ bgImage: '' });
      settings.bgImage = local.bgImage || settings.bgImage || '';
    } catch { /* ignore */ }
    L = S[settings.lang] || S.en;

    /* 样式早挂：右上角留白、课表间距这类只作用于站点自身排版的规则，如果等到数据回来
       才生效，用户会先看到"没调过"的样子、再看到"调过"的样子 —— 一刷新就前后两副面孔。
       所以先注入 CSS，再慢慢等数据。 */
    if (!document.getElementById('wt-home-css')) {
      const style = document.createElement('style');
      style.id = 'wt-home-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    if (!document.getElementById('wt-theme-css') && chrome.runtime && chrome.runtime.getURL) {
      const link = document.createElement('link');
      link.id = 'wt-theme-css';
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('theme.css');
      document.head.appendChild(link);
    }
    /* 先摆骨架，别让人对着空白等：数据回来后 buildSummary 原地把它替换掉 */
    try { skelPanel(); } catch (e) { wtLog('skeleton failed: ' + ((e && e.message) || e)); }
    /* 站点那颗 table 要 5~6 秒才注进 DOM（实测 5.83s）。既然 /timetable 的星期表
       一秒就能拿到，就先照它抢着画一版，等站点真表出现再撤掉换真表 ——
       用户不用对着空屏等六秒。 */
    (async () => {
      try {
        const grid = await withTimeout(loadTtGrid(), 3000, null);
        if (!grid || !grid.days || !grid.days.length) return;
        const n = await withTimeout(Promise.resolve(dayNumForDate(new Date(), grid)), 3000, null);
        if (!n) return;
        const cached = await gridDayCached(n);
        if (!cached) return;
        cached.title = 'Showing ' + new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
        if (document.querySelector('[data-wesley-home]:not(.wt-skel)')) return;
        await syntheticView(cached, true);
      } catch (e) { /* 抢跑失败就按老路走 */ }
    })();
    /* 骨架屏最多挂 9 秒：真面板一直没来（站点夜里不出课表、接口慢）就先收掉，
       别让人对着一个空框等。 */
    setTimeout(() => {
      const skel = document.querySelector('[data-wesley-home].wt-skel');
      if (!skel) return;
      skel.classList.remove('wt-skel');
      try { markBooting(false); } catch (e) { /* ignore */ }
    }, 9000);

    /* 首页是 SPA，课表比 document_idle 晚很多才渲染出来 —— 等它一会儿，别抢跑。 */
    const waitTable = async (ms) => {
      const t0 = Date.now();
      for (;;) {
        /* 站点那张表不一定会带 [data-timetable]（不同页面/版本不一致），所以退回按类名找，
           但要排除我们自己合成的表（它在 .wt-tt-body 里）。 */
        const found = document.querySelector('[data-timetable-container] table.timetable')
          || document.querySelector('table.timetable[data-timetable]')
          || [...document.querySelectorAll('table.timetable')].find((t) => !t.closest('.wt-tt-body'));
        if (found) return found;
        /* 别在「Last school day」占位表上提前退出：站点 0~5 秒先挂占位表，随后换成
           当天那张，抢跑就会合成上一个上学日的表把真表盖住。占位表要不要当真，
           由外面 lastSchoolDay() 的 2.5 秒宽限期判断。 */
        // 站点是服务端渲染：有课的页面一打开就带 [data-timetable-container]。等 4 秒还没有，
        // 说明今天大概率没课表（周末/假期），别干等满超时。
        if (Date.now() - t0 > 4000 && document.readyState === 'complete'
          && !document.querySelector('[data-timetable-container]')
          && ![...document.querySelectorAll('table.timetable')].some((t) => !t.closest('.wt-tt-body'))
          && document.querySelector('.column-left')) return null;
        if (Date.now() - t0 > ms) return null;
        await new Promise((r) => setTimeout(r, 100));
      }
    };
    /* 周末/假期站点给的是「Last school day」的残表，不是今天的课表；
       直接认这个标题就不用白等 20 秒（以前要等满 waitTable 才走周末分支）。 */
    /* 站点在渲染真表之前，会先挂一块「Last school day」的占位表（实测 0~5 秒），
       然后才换成当天那张。所以第一次看到它不能当真，得再盯 2.5 秒还不变才算数 ——
       否则我们会在站点换表之前抢先合成一张上一个上学日的表，把真表盖住。 */
    let lsSince = 0;
    const lastSchoolDay = () => {
      const h = document.querySelector('[data-timetable-header]');
      const isIt = !!(h && /last school day/i.test(h.textContent || ''));
      if (!isIt) { lsSince = 0; return false; }
      if (!lsSince) { lsSince = Date.now(); return false; }
      return Date.now() - lsSince >= 2500;
    };
    let table = WEEKEND_MODE ? await waitTable(3000) : (lastSchoolDay() ? null : await waitTable(4500));
    /* 已经有真面板在跑（另一个实例、或上一次 main() 已经渲染过）就别重复做，
       但骨架不算 —— 骨架就是要被这次渲染替换掉的。 */
    if (document.querySelector('[data-wesley-home]:not(.wt-skel)') || document.querySelector('.wt-loading')) { markBooting(false); return; }
    if (!table) {
      if (WEEKEND_MODE) { wtLog('weekend mode: synthetic timetable missing'); markBooting(false); return; }
      /* wtDebugWeekend=1 可以在平日把周末分支叫起来，周末那套逻辑只能这么测 */
      const weekend = lastSchoolDay() || [0, 6].includes(new Date().getDay())
        || localStorage.getItem('wtDebugWeekend') === '1';
      if (weekend) { const okWeekend = await weekendMode(); if (!okWeekend) markBooting(false); return; }
      /* 上学日站点的课表要 5~8 秒才渲染出来（实测 3 秒时还没有、6 秒有了）。
         所以这里不再抢跑合成：再等一会儿，等不到就安静收工，页面交给站点自己。 */
      /* 站点这会儿还什么都没渲染（凌晨、假期、服务端慢）。站点自己空着的时候屏幕上
         只剩右栏日历，所以先按周末那套把上一个上学日的表合成出来填进去。
         合成块现在住在外面的整宽行里，不会再把 .column-left 撑爆。 */
      wtLog('no timetable yet, fall back to last school day');
      const okSynth = await weekendMode();
      if (!okSynth) { try { await main(); } catch (e) { /* ignore */ } markBooting(false); }
      return;
      wtLog('no timetable yet, retry in 4s');
      markBooting(false);
      setTimeout(() => { if (!document.querySelector('[data-wesley-home]')) run(); }, 4000);
      return;
    }

    const collected = collectPeriods();
    if (!collected) {
      wtLog('collectPeriods returned null, retry in 4s');
      markBooting(false);
      setTimeout(() => { if (!document.querySelector('[data-wesley-home]')) run(); }, 4000);
      return;
    }
    let scraped = [];
    if (WEEKEND_MODE) {
      scraped = WEEKEND_DATA || [];
    } else {
      const header = document.querySelector('[data-timetable-header]');
      const loading = el('div', { class: 'wt-loading' }, 'Loading information…');
      if (header) header.insertAdjacentElement('afterend', loading);
      try {
        scraped = await scrapeLocal(collected.periods);
      } catch (e) {
        scraped = null;
        wtLog('scrape failed, will try cache: ' + ((e && e.message) || e));
      }
      loading.remove();
      if (!scraped || !scraped.length) {
        const cached = loadCachedDay();
        if (cached) {
          scraped = cached.classes;
          CACHE_AT = cached.at || Date.now();
          wtLog('using cached day from ' + agoText(CACHE_AT));
        }
      }
    }
    SNAP = scraped.length ? scraped : SNAP;
    if (!SNAP || !SNAP.length) { markBooting(false); toast('No WiSE information found'); return; }

    pruneDeadColumns(collected.table);
    collected.table.classList.add('wt-table');
    // 课表色块右下角的"下一个上学日"入口（挂在站点自己的 section 上，绝对定位在卡片区右下）
    try {
      const scroller = collected.table.closest('.scrollable');
      const sec = scroller ? scroller.parentElement : null;
      if (sec && !sec.querySelector('.wt-tt-nextday')) {
        if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
        /* 一个按钮一个身份：白天原地切换，☰ 才是挑日子的列表。
           以前同一个按钮要看状态决定弹什么，点了猜不透。 */
        sec.append(el('div', { class: 'wt-tt-actions' },
          el('button', {
            class: 'wt-tt-nextday',
            type: 'button',
            title: 'Show the next school day in place (same key as the shortcut)',
            onclick: (e) => { e.stopPropagation(); try { if (window.__wtNextDay) window.__wtNextDay(e.currentTarget); } catch { /* ignore */ } },
          }, 'Next day \u203a'),
          el('button', {
            class: 'wt-tt-daylist',
            type: 'button',
            title: 'Pick a day from a list',
            'aria-label': 'Pick a day from a list',
            onclick: (e) => { e.stopPropagation(); try { if (window.__wtNextDayList) window.__wtNextDayList(); else openNextDay(allClasses()); } catch { /* ignore */ } },
          }, '\u2630')));
      }
    } catch (e) { /* 入口挂了不影响课表 */ }
    if (FRESH_ALL) { try { sessionStorage.removeItem('wtFreshAll'); } catch { /* ignore */ } FRESH_ALL = false; }
    requestAnimationFrame(() => markBooting(false));
    const state = { ...collected, expanded: -1, originalHeights: collected.periods.map((p) => (p.card ? p.card.style.height : '')), original: collected.periods.map((p) => ({ th: p.th ? p.th.style.width : '', td: p.td.style.width })) };
    collected.periods.forEach((p, i) => {
      if (!p.card) return;
      p.td.classList.add('wt-card');
      if (i === collected.periods.length - 1) p.td.classList.add('wt-last');
      p.td.setAttribute('role', 'button');
      p.td.setAttribute('tabindex', '0');
      p.td.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('a') || e.target.closest('button')) return;
        expand(i, state);
      });
      p.td.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expand(i, state); }
      });
      p.td.addEventListener('pointerdown', (e) => {
        if (e.target.closest('a,button')) return;
        p.td.classList.add('wt-pressed');
      });
      const release = () => p.td.classList.remove('wt-pressed');
      p.td.addEventListener('pointerup', release);
      p.td.addEventListener('pointerleave', release);
    });
    document.addEventListener('click', (e) => {
      if (state.expanded < 0) return;
      if (!e.target.closest('td.wt-card') && !e.target.closest('a,button,.wt-modal-overlay,.wt-modal,.wt-set-wrap')) collapse(state);
    });
    window.addEventListener('resize', () => { if (state.expanded >= 0) collapse(state); });
    HYDRATE = fetchPostsFor;
    /* 先把周次校准一遍（老师帖子里写的 Week N 和学期表对一下），再挂周次 chip */
    try { calibrateWeek(); } catch (e) { wtLog('week calibrate failed: ' + ((e && e.message) || e)); }
    renderWeekChip();
    buildSummary(state);
    /* 断网时（浏览器自己知道）就算抓到的是当天的缓存，也要说一声 */
    if (!CACHE_AT && navigator.onLine === false) {
      const last = loadCachedDay();
      CACHE_AT = (last && last.at) || Date.now();
    }
    renderCacheNote(document.querySelector('[data-wesley-home]'));
    const dropCacheNote = () => { const n = document.querySelector('[data-wesley-home] .wt-cache-note'); if (n) n.remove(); };
    window.addEventListener('offline', () => {
      const last = loadCachedDay();
      CACHE_AT = (last && last.at) || Date.now();
      renderCacheNote(document.querySelector('[data-wesley-home]'));
    });
    window.addEventListener('online', () => { CACHE_AT = 0; dropCacheNote(); });
    // 静默预取明天的课表，点 Next day 时不用等网络
    setTimeout(() => { try { window.__wtPrefetchNextDay && window.__wtPrefetchNextDay(); } catch (e) { /* ignore */ } }, 380);
    const reloadAtMidnight = () => { const n = new Date(); const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 5); setTimeout(() => location.reload(), Math.max(5000, next - n)); };
    reloadAtMidnight();
    decorateMobile();
    /* 那句「WiSE information is ready」的提示条去掉了：每次进首页都弹一遍，纯噪声 */
  }

  // Schoolbox 是 SPA：从首页跳到别的页面时，我们注入的面板不会自动消失。
  // 这里做个路由守卫，一旦离开首页就把自己插进去的东西全部收走。
  /* 站点把首页搬到了 /dashboard：manifest 注入的几条路由都要算"首页"，
     否则面板被重绘抹掉后，重新挂回去的逻辑会以为已经离开首页而放弃。 */
  const HOME_RE = /^\/(home\/?|dashboard(\/.*)?)?$/;
  function cleanupIfLeaving() {
    try {
      if (HOME_RE.test(location.pathname)) return;
      document.querySelectorAll('[data-wesley-home],.wt-alert-wrap,.wt-page-dim,.wt-modal-overlay,dialog.wt-modal-dialog,.wt-loading,.wt-toast,.wt-tt-body,.wt-week-chip').forEach((n) => n.remove());
      /* Enhanced Calendar 是挂在站点 Calendar 岛上的，离开首页也得收走 */
      document.querySelectorAll('[data-wt-cal],[data-wt-cal-pop]').forEach((n) => n.remove());
      document.querySelectorAll('.wt-cal-island').forEach((n) => n.classList.remove('wt-cal-island'));
      document.querySelectorAll('h2.wt-cal-h').forEach((h) => {
        h.querySelectorAll('.wt-cal-ico,.wt-cal-nav').forEach((s) => s.remove());
        h.classList.remove('wt-cal-h');
      });
      document.documentElement.classList.remove('wt-booting', 'wt-modal-open', 'wt-perf', 'wt-low-anim', 'wt-no-smooth', 'wt-busy');
      document.querySelectorAll('table.timetable.wt-table').forEach((t) => t.classList.remove('wt-table'));
      /* 周末把站点自己那张课表藏起来过，离开首页时还回去 */
      document.querySelectorAll('[data-wt-hide-tt]').forEach((n) => { n.style.removeProperty('display'); n.removeAttribute('data-wt-hide-tt'); });
      const sc = document.querySelector('.scrollable.wt-tt-open');
      if (sc) { sc.classList.remove('wt-tt-open'); sc.style.height = ''; delete sc.dataset.wtH; }
    } catch { /* ignore */ }
  }
  window.addEventListener('popstate', cleanupIfLeaving);
  ['turbo:load', 'turbo:render', 'turbo:before-render', 'pjax:end', 'pjax:beforeReplace', 'page:load'].forEach((ev) => document.addEventListener(ev, cleanupIfLeaving));
  document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('wt-tab-hidden', document.hidden);
});
document.documentElement.classList.toggle('wt-tab-hidden', document.hidden);
// only check for route changes while the tab is visible; a background tab should not wake every 1.5s
setInterval(() => { if (!document.hidden) cleanupIfLeaving(); }, 380);

  // A site redesign silently breaks our selectors: record hit counts and say something on the home page
const anchorCheck = (allowWarn) => {
  try {
    /* 这里只统计「在 home.js 会跑的这几页上真能观察到」的东西。
       以前还盯着 `.v-card h3 a[href^="/homepage/"]` 数课程卡 —— 站点早改过结构，
       这个选择器现在是 0，于是每次加载都写一条假的 missing:classes 进诊断。 */
    const counts = {
      timetable: document.querySelectorAll('table.timetable[data-timetable]').length,
      news: document.querySelectorAll('a[href*="/news/"]').length,
    };
    const missing = Object.keys(counts).filter((k) => counts[k] === 0);
    try { chrome.storage.local.set({ wesleyPageCheck: { at: Date.now(), counts: counts, missing: missing } }); } catch (e) { /* ignore */ }
    if (missing.length) wtLog('page anchors missing: ' + missing.join(',') + ' ' + JSON.stringify(counts));
    const host = document.querySelector('[data-wesley-home]');
    /* 只有在「一门课都没读出来、而且卡片也一张都没有」的时候才值得报这句。
       周末走的是合成课表（不经过 collectPeriods），以前这里会误报。 */
    const anyCards = document.querySelectorAll('[data-wesley-home] .wt-task,[data-wesley-home] .wt-due-card').length;
    const anyTabs = host ? host.querySelectorAll('.wt-tab').length : 0;
    const warnNow = host ? host.querySelector('.wt-warn') : null;
    const stillEmpty = !!host && HOME_RE.test(location.pathname) && !WEEKEND_MODE && LAST_CLASS_COUNT === 0 && anyCards === 0 && anyTabs <= 1;
    /* 第一遍（2.5 秒）只清理、不报：那会儿数据常常还在路上。第二遍（9 秒）才是结论。 */
    /* 数据后来读到了就把误报收回。它是「现在什么都没读到」的状态提示，不是一份记录。 */
    if (warnNow && !stillEmpty) warnNow.remove();
    if (stillEmpty && !warnNow && allowWarn) {
      const body = host.querySelector('.wt-panel-body') || host;
      const box = el('div', { class: 'wt-warn' }, 'Could not read your class list on this page. WiSE may have changed its layout, so tasks and announcements can be missing.');
      body.insertBefore(box, body.firstChild);
      /* 它只是「现在什么都没读到」的提示：一旦面板里出了卡片或标签，自己退场 */
      let ticks = 0;
      const t = setInterval(() => {
        ticks += 1;
        const h2 = document.querySelector('[data-wesley-home]');
        const live = h2 && (h2.querySelectorAll('.wt-task,.wt-due-card').length || h2.querySelectorAll('.wt-tab').length > 1);
        if (live || ticks > 30 || !box.isConnected) { box.remove(); clearInterval(t); }
      }, 380);
    }
  } catch (e) { /* ignore */ }
};
/* 课表切到「下一个上学日」时，面板头挂一个日期 chip，点它切回今天（PLAN-beta7 §4.1） */
document.addEventListener('wt:day-swapped', (e) => {
  /* 标题上的 Day N 和周次胶囊都得跟着表上排的那天走：以前只换了格子里的字，
     左上角还写着 Day 1，点了 Next day 就跟下面的表对不上。
     detail.at 为 0（切回今天）时把 TARGET_DAY 清掉。 */
  const at = e && e.detail && e.detail.at;
  TARGET_DAY = at ? new Date(at) : null;
  try { refreshHeadLabel(TARGET_DAY); } catch (err) { /* ignore */ }
  renderWeekChip();
  const head = document.querySelector('[data-wesley-home] .wt-summary-head');
  if (!head) return;
  const label = e && e.detail && e.detail.label;
  let chip = head.querySelector('.wt-day-chip');
  if (!label) { if (chip) chip.remove(); return; }
  if (!chip) {
    chip = el('button', { class: 'wt-day-chip', type: 'button', title: 'Back to today' });
    chip.addEventListener('click', (ev) => {
      ev.stopPropagation();
      try { if (window.__wtNextDay) window.__wtNextDay(document.querySelector('.wt-tt-nextday') || null); } catch (err) { /* ignore */ }
    });
    const count = head.querySelector('.wt-count');
    if (count) head.insertBefore(chip, count); else head.append(chip);
  }
  chip.textContent = label;
});

/* 键盘快捷键（PLAN-beta7 §4.5）：Alt+K 由 search.js 处理，
   这里收 Alt+T（今天 / 下一个上学日来回切）和 Alt+D（展开 Due 区）。 */
/* 快捷键分发。键位本身在设置里配（chrome.storage.local.shortcuts），
   这里只认动作名：panel / todo / due / upcoming / toggle-day。
   同一个键按一次开、再按一次关，所以除了 toggle-day 都是 toggle 语义。 */
document.addEventListener('wt:shortcut', (e) => {
  const what = e && e.detail;
  if (what === 'toggle-day') {
    if (typeof window.__wtNextDay !== 'function') return;
    try { window.__wtNextDay(document.querySelector('.wt-tt-nextday') || null); } catch (err) { /* 切不动就算了 */ }
    return;
  }
  const host = document.querySelector('[data-wesley-home]');
  const summary = host && host.querySelector('.wt-summary');
  if (!summary) return;
  const panelBody = summary.querySelector('.wt-panel-body');
  const panelHead = summary.querySelector('.wt-summary-head');
  if (!panelBody || !panelHead) return;
  const openPanel = () => { if (!panelBody.classList.contains('open')) toggleSection(panelBody, panelHead, panelHead.querySelector('.wt-chev')); };
  /* 「All sections」：一次展开/收起整块面板里的每个栏目，而不是只开关最外层那一格。
     全开就全关，只要还有一个是收着的就全开。 */
  if (what === 'panel') {
    const bodies = [panelBody, ...host.querySelectorAll('.wt-sec-body')];
    const anyClosed = bodies.some((b) => !b.classList.contains('open'));
    for (const b of bodies) {
      const isOpen = b.classList.contains('open');
      if (anyClosed === isOpen) continue;
      const head = b === panelBody ? panelHead : (b.parentElement && b.parentElement.querySelector('.wt-sec-head'));
      if (!head) continue;
      toggleSection(b, head, head.querySelector('.wt-chev'));
    }
    return;
  }
  if (what === 'upcoming') {
    openPanel();
    setTimeout(() => {
      const up = host.querySelector('.wt-up');
      const head = up && up.querySelector('.wt-up-head');
      const btn = head && head.querySelector('.wt-up-btn');
      if (btn) btn.click();
    }, animMs(430));
    return;
  }
  if (what !== 'due' && what !== 'todo') return;
  openPanel();
  setTimeout(() => {
    const sec = host.querySelector('[data-wt-sec="' + what + '"]');
    const b = sec && sec.querySelector('.wt-sec-body');
    const h = sec && sec.querySelector('.wt-sec-head');
    if (!b) return;
    toggleSection(b, h, h.querySelector('.wt-chev'));
    if (b.classList.contains('open')) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, animMs(430));
});
/* 出错时自动导出一份日志（PLAN-beta7 §4.9）：开关在设置里的 Developer 区，
   10 分钟最多导一次，免得一个报错循环把下载目录刷满。 */
function autoExportLogsNow() {
  try {
    const last = Number(localStorage.getItem('wesleyAutoExportAt') || 0);
    if (Date.now() - last < 10 * 60 * 1000) return;
    localStorage.setItem('wesleyAutoExportAt', String(Date.now()));
    const lines = [];
    try {
      const arr = JSON.parse(localStorage.getItem('wesleyLog:v1') || '[]');
      for (const x of arr.slice(-200)) lines.push('[' + x.t + '] ' + x.msg);
    } catch { /* 日志坏了也要能导出 */ }
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = 'better-wise-error-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.txt';
    const text = 'Auto-exported after an error\n' + location.href + '\n\n' + (lines.join('\n') || '(no logs)');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch { /* 导不出来就算了，不能因为日志再崩一次 */ }
}
function autoExportLogsOnError() {
  try {
    chrome.storage.local.get({ autoLogs: false }, (v) => { if (v && v.autoLogs === true) autoExportLogsNow(); });
  } catch { /* 没有扩展 API 就不导 */ }
}
window.addEventListener('error', () => { autoExportLogsOnError(); });
window.addEventListener('unhandledrejection', () => { autoExportLogsOnError(); });

/* ══ Enhanced Calendar ═══════════════════════════════════════════════
   主页 Calendar 那一格只吐当天的条目，想翻别的日子只能跑去 /calendar。
   这里在标题右边挂一个 Enhance 开关：打开后同一格先给一个月历，点哪天就当场
   换成那天的列表。外观照抄站点自己的 fc-list-table（同一套 class，站点 CSS 直接
   管得到），内容照抄 /calendar/ajax/full，只去掉固定课表里的课程（className 带
   type24 的那些）和 "Day N" 这种只标轮次的条目。 */
const CAL_T = {
  enhance: 'Enhanced calendar',
  btnTip: 'Open the enhanced calendar',
  dates: '\u2039 Dates',
  today: 'Today',
  hint: 'Same events as the WiSE calendar, minus timetable lessons.',
  empty: 'Nothing on the calendar for this day.',
  load: 'Loading\u2026',
  fail: 'Could not read the calendar. Tap to retry.',
  dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const CAL = {
  island: null, h2: null, sw: null, box: null, native: null,
  on: false, pick: false, view: 'pick', y: 0, m: 0, day: '', uid: 0, has: false,
  monthCache: new Map(), dayCache: new Map(),
};
try { window.__wtCal = CAL; } catch (e) { /* 调试口，失败无妨 */ }
const calPad2 = (n) => (n < 10 ? '0' + n : String(n));
const calKey = (d) => d.getFullYear() + '-' + calPad2(d.getMonth() + 1) + '-' + calPad2(d.getDate());
const calDate = (k) => { const p = String(k).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };

/* userId 是接口的必需参数（缺了站点直接回 400 错误页）。dashboard 上是内联脚本里
   的 fullCalendarConfig.userId，拿不到就退回上一次记下来的值。 */
function calUid() {
  if (CAL.uid) return CAL.uid;
  try { const c = window.fullCalendarConfig; if (c && Number(c.userId)) CAL.uid = Number(c.userId); } catch { /* ignore */ }
  if (!CAL.uid) {
    for (const s of document.querySelectorAll('script')) {
      const m = /userId:\s*Number\(\s*['"]?(\d+)/.exec(s.textContent || '');
      if (m) { CAL.uid = Number(m[1]); break; }
    }
  }
  if (!CAL.uid) { try { CAL.uid = Number(localStorage.getItem('wesleyCalUid') || 0) || 0; } catch { /* ignore */ } }
  if (CAL.uid) { try { localStorage.setItem('wesleyCalUid', String(CAL.uid)); } catch { /* ignore */ } }
  return CAL.uid;
}
async function calFetch(startSec, endSec) {
  const uid = calUid();
  if (!uid) throw new Error('no user id');
  /* 注意别带 folderId=（空值会让接口直接回空数组），componentInstanceId 也不带 ——
     带上它只回那个小组件自己的来源，会把别的来源的条目漏掉。 */
  const url = '/calendar/ajax/full?start=' + startSec + '&end=' + endSec + '&userId=' + uid;
  let ctl = null;
  try { ctl = new AbortController(); } catch { ctl = null; }
  const to = ctl ? setTimeout(() => { try { ctl.abort(); } catch { /* ignore */ } }, 9000) : 0;
  try {
    const r = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: ctl ? ctl.signal : undefined });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    if (!/json/i.test(r.headers.get('content-type') || '')) throw new Error('not json');
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } finally { if (to) clearTimeout(to); }
}
/* 站点给的是原始条目，这里只留下"日历上算个事"的那些：
   type24 = 固定课表里的课；"Day 9" 只是轮次标号，用户明确说没用。 */
function calNorm(list) {
  const out = [];
  for (const e of list || []) {
    const cls = String(e.className || '');
    const title = String(e.title || '').replace(/\s+/g, ' ').trim();
    if (!title) continue;
    if (/(^|\s)type24(\s|$)/.test(cls)) continue;
    if (/^Day\s*\d+$/i.test(title)) continue;
    const meta = (e.data && e.data.meta) || {};
    out.push({
      title, cls, allDay: !!e.allDay, color: String(e.color || ''),
      start: String(e.start || ''), end: String(e.end || ''),
    });
  }
  return out;
}
function calOnDay(e, key) {
  const s = e.start.slice(0, 10);
  if (!e.allDay) return s === key;
  const en = e.end ? e.end.slice(0, 10) : '';
  if (!en || en === s) return s === key;
  return s <= key && key < en;       // 多日条目：end 那天不占
}
function calOrder(a, b) {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  const sa = Date.parse(a.start) || 0;
  const sb = Date.parse(b.start) || 0;
  if (sa !== sb) return sa - sb;
  return a.title.localeCompare(b.title);
}
function calMonthData(y, m) {
  const key = y + '-' + calPad2(m + 1);
  const hit = CAL.monthCache.get(key);
  if (hit) return hit;
  const p = (async () => {
    const s = new Date(y, m, 1, 0, 0, 0);
    const e = new Date(y, m + 1, 1, 0, 0, 0);
    return calNorm(await calFetch(Math.floor(s.getTime() / 1000), Math.floor(e.getTime() / 1000)));
  })();
  CAL.monthCache.set(key, p);
  p.catch(() => CAL.monthCache.delete(key));
  return p;
}
function calDayData(key) {
  const hit = CAL.dayCache.get(key);
  if (hit) return hit;
  const p = (async () => {
    const s = calDate(key);
    const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1);
    return calNorm(await calFetch(Math.floor(s.getTime() / 1000), Math.floor(e.getTime() / 1000)));
  })();
  CAL.dayCache.set(key, p);
  p.catch(() => CAL.dayCache.delete(key));
  return p;
}
const calOrd = (n) => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return n + 'th';
  const u = n % 10;
  return n + (u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th');
};
const calClock = (d) => {
  let h = d.getHours();
  const ap = h < 12 ? 'am' : 'pm';
  h = h % 12 || 12;
  const mi = d.getMinutes();
  return h + (mi ? ':' + calPad2(mi) : '') + ap;
};
function calTimeText(e) {
  if (e.allDay) return 'all-day';
  const s = new Date(e.start);
  if (isNaN(s.getTime())) return '';
  const a = calClock(s);
  const en = e.end ? new Date(e.end) : null;
  if (!en || isNaN(en.getTime())) return a;
  const b = calClock(en);
  return a === b ? a : a + ' - ' + b;
}
/* 原来照着 FullCalendar 的 list 视图抄 class，想让站点样式自动对齐。试下来不划算：
   FC 把 thead 挪到屏幕外（left:-9090px）、给 th 塞宽度、按容器重算列，手搓的表格
   一碰就散（表头回正常流 → 事件列被挤成 0 宽，标题和圆点直接消失）。
   现在自己画，配色和间距照原生列表的样子来。 */
/* 列表就是站点 FullCalendar list 视图那一套结构：同样的 class、同样没有 thead。
   样式全由站点自己的 CSS 提供，所以和原生日历像素级一致（实测时间列 150px、
   圆点列 34px、行高 39px、分隔线 0.6px rgba(255,255,255,.1)、字号 14px）。
   不加 thead：用户要的就是没有 Time/Event 那一行；顺带避开 FC 把 thead
   absolute 到 -10000px、回写 th 宽度导致的列宽打架。 */
function calListTable(dayDate, events) {
  const dk = calKey(dayDate);
  const todayKey = calKey(new Date());
  const dowKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayDate.getDay()];
  const tbody = el('tbody');
  tbody.append(el('tr', {
    class: 'fc-list-day fc-day fc-day-' + dowKey + (dk === todayKey ? ' fc-day-today' : ''),
    'data-date': dk,
  }, el('th', { scope: 'colgroup', colspan: '3' },
    el('div', { class: 'fc-list-day-cushion fc-cell-shaded' },
      el('a', { class: 'fc-list-day-text' },
        CAL_T.days[dayDate.getDay()] + ' ' + CAL_T.months[dayDate.getMonth()] + ' ' +
        calOrd(dayDate.getDate()) + ' ' + dayDate.getFullYear())))));
  for (const e of events) {
    const dot = el('span', { class: 'fc-list-event-dot' });
    if (e.color) dot.style.borderColor = e.color;
    tbody.append(el('tr', { class: 'fc-event fc-list-event' + (e.cls ? ' ' + e.cls : '') },
      el('td', { class: 'fc-list-event-time' }, calTimeText(e)),
      el('td', { class: 'fc-list-event-graphic', 'aria-hidden': 'true' }, dot),
      el('td', { class: 'fc-list-event-title' },
        el('div', { class: 'event-container' }, el('span', { class: 'fc-event-title' }, e.title)))));
  }
  return el('div', { class: 'fc fc-media-screen fc-direction-ltr' },
    el('div', { class: 'fc-view-harness fc-view-harness-passive', style: 'height:auto' },
      el('div', { class: 'fc-list-view fc-view fc-list fc-list-sticky' },
        el('div', { class: 'fc-scroller', style: 'overflow:visible;height:auto' },
          el('table', { class: 'fc-list-table' }, tbody)))));
}
function calRenderPick() {
  const pop = CAL.pop;
  if (!pop) return;
  const y = CAL.y;
  const m = CAL.m;
  const bar = el('div', { class: 'wt-cal-bar' },
    el('button', {
      class: 'wt-cal-btn wt-cal-icon', type: 'button', title: 'Previous month', 'aria-label': 'Previous month',
      onclick: (ev) => { ev.stopPropagation(); calShiftMonth(-1); },
    }, '\u2039'),
    el('button', {
      class: 'wt-cal-btn wt-cal-icon', type: 'button', title: 'Next month', 'aria-label': 'Next month',
      onclick: (ev) => { ev.stopPropagation(); calShiftMonth(1); },
    }, '\u203a'),
    el('span', { class: 'wt-cal-mon' }, CAL_T.months[m] + ' ' + y));
  const grid = el('div', { class: 'wt-cal-grid' });
  for (const w of CAL_T.dow) grid.append(el('span', { class: 'wt-cal-dow' }, w));
  const lead = new Date(y, m, 1).getDay();   // 周日开头，和站点 FullCalendar 的默认 firstDay 一致
  const days = new Date(y, m + 1, 0).getDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  const todayKey = calKey(new Date());
  const cells = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(y, m, 1 - lead + i);
    const k = calKey(d);
    const cls = ['wt-cal-cell'];
    if (d.getMonth() !== m) cls.push('is-out');
    if (k === todayKey) cls.push('is-today');
    if (k === CAL.day) cls.push('is-sel');
    const b = el('button', { class: cls.join(' '), type: 'button', 'data-k': k }, String(d.getDate()));
    b.addEventListener('click', (ev) => { ev.stopPropagation(); calOpenDay(k); });
    cells.push(b);
    grid.append(b);
  }
  pop.replaceChildren(el('div', { class: 'wt-cal-pop' }, bar, grid));
  calPlacePop();
  /* 有小圆点的日子才有事，先不阻碍点选 —— 数据回来再补点 */
  calMonthData(y, m).then((list) => {
    if (!pop.isConnected || !CAL.pick || CAL.y !== y || CAL.m !== m) return;
    const mStart = calKey(new Date(y, m, 1));
    const mEnd = calKey(new Date(y, m, days));
    const hitSet = new Set();
    for (const e of list) {
      let a = e.start.slice(0, 10);
      let b = a;
      if (e.allDay && e.end) {
        b = e.end.slice(0, 10);
        if (b > a) b = calKey(new Date(calDate(b).getTime() - 864e5));   // end 那天不占
      }
      if (a < mStart) a = mStart;
      if (b > mEnd) b = mEnd;
      if (b < a) continue;
      let cur = calDate(a);
      for (let guard = 0; guard < 42; guard++) {
        const k = calKey(cur);
        if (k > b) break;
        hitSet.add(k);
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      }
    }
    for (const c of cells) if (hitSet.has(c.dataset.k)) c.classList.add('has-ev');
  }).catch(() => { /* 没有点也不影响选日子 */ });
}
/* 选择器改成在瀑布流里了（position:static），位置交给布局算，
   这里只清掉历史遗留的 top，免得旧样式残留把它顶偏。 */
function calPlacePop() {
  const pop = CAL.pop;
  if (!pop) return;
  if (pop.style.top) pop.style.top = '';
}
function calRenderDay() {
  const box = CAL.box;
  if (!box) return;
  const key = CAL.day;
  const d = calDate(key);
  const body = el('div', { class: 'wt-cal-body' }, el('div', { class: 'wt-cal-note' }, CAL_T.load));
  box.replaceChildren(body);
  const paint = (list) => {
    if (!body.isConnected || CAL.day !== key) return;
    const evs = list.filter((e) => calOnDay(e, key)).sort(calOrder);
    body.replaceChildren(calListTable(d, evs));
    if (!evs.length) body.append(el('div', { class: 'wt-cal-note' }, CAL_T.empty));
  };
  calDayData(key).then(paint).catch(() => {
    if (!body.isConnected) return;
    CAL.dayCache.delete(key);
    body.replaceChildren(el('div', {
      class: 'wt-cal-note wt-cal-fail', role: 'button', tabindex: '0',
      onclick: () => calRenderDay(),
    }, CAL_T.fail));
  });
}
function calShiftMonth(n) {
  const t = new Date(CAL.y, CAL.m + n, 1);
  CAL.y = t.getFullYear();
  CAL.m = t.getMonth();
  calRender();
}
/* 按下某一天：浮层收起来，岛里换成那天的列表 */
function calOpenDay(key) {
  CAL.day = key;
  CAL.pick = false;
  CAL.on = true;
  calApply();
}
/* 标题栏的 ‹ › Today：常态就在，随时翻日；没在日期页时先落到今天 */
function calToday() {
  CAL.day = calKey(new Date());
  CAL.on = true;
  CAL.pick = false;
  const n = new Date();
  CAL.y = n.getFullYear();
  CAL.m = n.getMonth();
  calApply();
}
function calStepDay(n) {
  const base = CAL.on && CAL.day ? CAL.day : calKey(new Date());
  const d = calDate(base);
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  CAL.day = calKey(t);
  CAL.y = t.getFullYear();
  CAL.m = t.getMonth();
  CAL.on = true;
  CAL.pick = false;
  calApply();
}
function calRender() {
  if (CAL.box) {
    if (CAL.on && CAL.day) calRenderDay();
    else CAL.box.replaceChildren();
  }
  if (CAL.pick) calRenderPick();
}
/* 只对状态，不重建 DOM：每轮 tick 都会调一次，用来兜住站点自己重渲染岛之后
   原生和我们的面板同时露出来（那就会看到两天的日头）。 */
function calSync() {
  if (CAL.sw) {
    /* 高亮只表示「日期选择器正开着」 */
    CAL.sw.setAttribute('aria-pressed', String(!!CAL.pick));
    CAL.sw.classList.toggle('on', !!CAL.pick);
  }
  /* 选择器开着 = 卡片里只留「标题 + 选择器」。站点自己那块当天列表
     （fc-list-day-cushion / fc-list-event 那一截）和我们的列表一起让位，
     不然选择器上下还挂着两段列表。 */
  if (CAL.native && CAL.native.isConnected) CAL.native.style.display = (CAL.on || CAL.pick) ? 'none' : '';
  if (CAL.box && CAL.box.isConnected) CAL.box.style.display = (CAL.on && !CAL.pick) ? '' : 'none';
  if (CAL.pop && CAL.pop.isConnected) CAL.pop.style.display = CAL.pick ? '' : 'none';
}
function calApply() {
  calSync();
  if (CAL.pick) {
    if (!CAL.y) { const n = new Date(); CAL.y = n.getFullYear(); CAL.m = n.getMonth(); }
    calRenderPick();
  } else if (CAL.on && CAL.day && CAL.box) {
    calRenderDay();
  }
}
function calIconNode() {
  const btn = el('button', {
    class: 'wt-cal-ico', type: 'button', 'aria-pressed': 'false',
    'aria-label': CAL_T.enhance, title: CAL_T.btnTip,
  });
  /* 内联 SVG：28px 的按钮里放 15px 的日历轮廓，颜色跟着 currentColor 走 */
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"'
    + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<rect x="3.2" y="4.8" width="17.6" height="16" rx="3"></rect>'
    + '<path d="M3.2 9.6h17.6M8.2 2.6v3.8M15.8 2.6v3.8"></path></svg>';
  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    CAL.pick = !CAL.pick;                 // 只开合这张日期选择器，不动下面显示什么
    if (CAL.pick && !CAL.y) {
      const n = new Date();
      CAL.y = n.getFullYear();
      CAL.m = n.getMonth();
    }
    calApply();
  });
  return btn;
}
/* 标题栏上常驻的 ‹ › Today —— 不点那颗日历按钮也能直接翻日 */
function calNavNode() {
  const mk = (label, title, fn, extra) => el('button', {
    class: 'wt-cal-btn' + (extra ? ' ' + extra : ''), type: 'button', title: title,
    'aria-label': title,
    onclick: (ev) => { ev.preventDefault(); ev.stopPropagation(); fn(); },
  }, label);
  return el('span', { class: 'wt-cal-nav' },
    mk('\u2039', 'Previous day', () => calStepDay(-1), 'wt-cal-icon'),
    mk('\u203a', 'Next day', () => calStepDay(1), 'wt-cal-icon'),
    mk(CAL_T.today, 'Jump to today', calToday, 'wt-cal-today'));
}
function calIsland() {
  const marked = document.querySelector('h2.wt-cal-h');
  if (marked && marked.isConnected && marked.parentElement) return marked.parentElement;
  for (const cand of document.querySelectorAll('h2.subheader')) {
    const t = String(cand.textContent || '').replace(/\s*Enhance\s*$/i, '').trim();
    if (/^calendar$/i.test(t) && cand.parentElement && !cand.closest('[data-wesley-home]')) return cand.parentElement;
  }
  return null;
}
function calEnsure() {
  if (CAL.box && !CAL.box.isConnected) CAL.box = null;
  if (CAL.pop && !CAL.pop.isConnected) CAL.pop = null;
  if (CAL.sw && !CAL.sw.isConnected) { CAL.sw = null; CAL.nav = null; CAL.h2 = null; }
  if (CAL.native && !CAL.native.isConnected) CAL.native = null;
  const isl = calIsland();
  if (!isl) { CAL.island = null; CAL.native = null; return; }
  if (CAL.island !== isl) {
    CAL.island = isl;
    CAL.sw = null; CAL.nav = null; CAL.box = null; CAL.pop = null;
    CAL.native = null; CAL.h2 = null;
  }
  if (!CAL.sw) {
    const h2 = isl.querySelector('h2.subheader');
    if (h2) {
      CAL.h2 = h2;
      h2.classList.add('wt-cal-h');
      CAL.nav = calNavNode();
      CAL.sw = calIconNode();
      h2.append(CAL.nav, CAL.sw);
    }
  }
  if (!CAL.native) {
    const n = isl.querySelector('[id^="calendar-"]');
    if (n) CAL.native = n;
  }
  if (!CAL.box && CAL.native && CAL.native.parentElement) {
    CAL.box = el('div', { class: 'wt-cal-box', 'data-wt-cal': '' });
    CAL.native.insertAdjacentElement('afterend', CAL.box);
  }
  if (!CAL.pop && CAL.h2) {
    isl.classList.add('wt-cal-island');
    CAL.pop = el('div', { class: 'wt-cal-popwrap', 'data-wt-cal-pop': '' });
    isl.append(CAL.pop);
    /* 点岛外面就收起浮层 */
    if (!CAL.outside) {
      CAL.outside = (ev) => {
        if (!CAL.pick) return;
        if (CAL.pop && CAL.pop.contains(ev.target)) return;
        if (CAL.sw && CAL.sw.contains(ev.target)) return;
        CAL.pick = false;
        calSync();
      };
      document.addEventListener('mousedown', CAL.outside, true);
    }
  }
  if (!CAL.has) {
    CAL.has = true;
    const n = new Date();
    CAL.y = n.getFullYear();
    CAL.m = n.getMonth();
    CAL.day = calKey(n);
  }
  /* 默认就是原生日历：CAL.on 只由选日期/翻日翻成 true，不读任何持久化状态。 */
  calSync();
}
function initCalendarEnhance() {
  const tick = () => {
    try {
      /* 这里原来有一句 document.hidden 的早退，想着后台标签页别白干活。结果在
         headless / 后台窗口里页面一直是 hidden，开关就永远插不进去，看着像随机失灵。
         一次 querySelectorAll 而已，不值当，去掉。 */
      if (!HOME_RE.test(location.pathname)) return;
      calEnsure();
    } catch (e) { wtLog('cal enhance: ' + ((e && e.message) || e)); }
  };
  tick();
  setInterval(tick, 1600);
}

/* 「Next day / 挑日子」这两个入口在合成课表那条路上也要能用。以前它们挂在 main()
   里面，而周末、凌晨、站点不出表的时候根本不走 main()，点了就没反应。 */
try {
  window.__wtNextDay = (btn) => swapNextDay(btn);
  window.__wtNextDayList = () => openNextDay(allClasses());
} catch (e) { /* ignore */ }

const run = () => {
  try { initCalendarEnhance(); } catch (e) { wtLog('cal enhance init: ' + ((e && e.message) || e)); }
  Promise.resolve(main())
    .then(() => setTimeout(() => anchorCheck(false), 2500))
    .then(() => setTimeout(() => anchorCheck(true), 12000))
    .catch((e) => document.documentElement.setAttribute('data-wesley-error', String((e && e.stack) || e)));
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
else run();
})();
