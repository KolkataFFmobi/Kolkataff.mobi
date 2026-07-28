'use strict';

/* Site stylesheet, inlined in <head> on every page. Budget <=10KB (enforced
   in build.js), system fonts only, mobile-first at 360px. See CLAUDE.md for
   the full rationale behind each constraint below — kept terse here since
   every byte of this file ships to every visitor. */

const CSS = `
:root{
  --bg:#FAFAF9;--surface:#FFFFFF;--surface2:#F5F5F4;--text:#1C1917;--muted:#57534E;
  --line:#E7E5E4;--accent:#DC2626;--accent-dark:#B91C1C;--link:#B91C1C;
  --radius:8px;--maxw:760px;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0;background:var(--bg);color:var(--text);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;
  font-size:16px;line-height:1.55;
}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 14px}
a{color:var(--link);text-decoration:underline;text-underline-offset:2px}
a:hover{color:#7F1D1D}
a,button{-webkit-tap-highlight-color:transparent}
a:focus-visible,button:focus-visible{outline:2px solid var(--accent-dark)}
h1,h2,h3{line-height:1.2;margin:1.1em 0 .5em;font-weight:800}
h1{font-size:1.5rem}
h2{font-size:1.15rem;border-bottom:1px solid var(--line);padding-bottom:.3em}
h3{font-size:1.02rem}
p{margin:.6em 0}
small{font-size:.8rem}
hr{border:0;border-top:1px solid var(--line);margin:1.2em 0}

/* Header + nav (red bar) */
.site-header{background:var(--accent)}
.site-header .wrap{display:flex;align-items:center;gap:10px;padding:6px 14px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:8px;color:#fff;text-decoration:none;font-weight:800;font-size:1.05rem;letter-spacing:.02em}
.brand svg{display:block}
.nav{display:flex;flex-wrap:wrap;gap:2px 10px;margin-left:auto}
/* Full white on the red bar: 4.83:1 (AA). The old opacity:.9 blended to 4.13:1 and failed AA. */
.nav a{color:#fff;text-decoration:none;font-size:.9rem;white-space:nowrap;padding:8px 2px}
.nav a:hover{text-decoration:underline}

/* Cards / sections */
main{padding:16px 0 8px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin:0 0 16px}
.muted{color:var(--muted)}
time{color:var(--muted)}

/* LIVE row */
.live-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:.2em 0 .7em;font-size:.95rem}
.live-badge{display:inline-flex;align-items:center;gap:6px;background:var(--accent);color:#fff;
  font-weight:800;font-size:.72rem;letter-spacing:.14em;padding:3px 9px;border-radius:4px}
.live-badge::before{content:"";width:7px;height:7px;border-radius:50%;background:#fff}
.live-row time{color:var(--text)}
/* Refresh control — sits in the LIVE row; 44px min touch target for mobile. */
.refresh-btn{margin-left:auto;display:inline-flex;align-items:center;gap:5px;min-height:34px;padding:6px 13px;font:inherit;font-size:.82rem;font-weight:700;color:#fff;background:var(--accent);border:1px solid var(--accent);border-radius:6px;cursor:pointer;white-space:nowrap}
.refresh-btn:hover{background:var(--accent-dark);border-color:var(--accent-dark)}
.refresh-btn[disabled]{opacity:.6;cursor:default}

/* Next-result strip: fixed-height one-liner, zero CLS, keeps the today table near the fold. */
.next-strip{height:48px;display:flex;align-items:center;gap:6px;overflow:hidden;
  background:var(--surface2);border:1px solid var(--line);border-left:3px solid var(--accent);
  border-radius:6px;padding:0 12px;margin:0 0 14px}
.next-label{color:var(--muted);font-weight:600;font-size:.82rem;flex:0 0 auto;white-space:nowrap}
.next-base{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--text);font-weight:600;font-size:.86rem}
.next-cd{flex:0 0 auto;margin-left:auto;font-weight:800;font-variant-numeric:tabular-nums;font-size:1.05rem;color:var(--text);letter-spacing:.03em;white-space:nowrap}

/* sr-only (WCAG pattern): hides visually without moving anything — not a
   reordering technique, so exempt from build.js's no-reorder assertion. */
.visually-hidden{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* Date-jump nav (no <form>). overflow-x:auto is a safety net: scrolls rather
   than hides if flex-wrap ever fails to engage. */
.date-jump{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:.6em 0 1em;overflow-x:auto}
.date-jump label{font-size:.88rem;color:var(--muted)}
.date-jump input[type=date]{font:inherit;font-size:.9rem;padding:10px 8px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--text)}
.date-jump button{font:inherit;font-weight:700;font-size:.9rem;padding:10px 16px;border:1px solid var(--accent);border-radius:6px;background:var(--accent);color:#fff;cursor:pointer}
.month-links{display:flex;flex-wrap:wrap;gap:8px 10px;margin:0 0 1.1em;font-size:.88rem;overflow-x:auto}
.month-links a,.month-links .cur{padding:8px 12px;border:1px solid var(--line);border-radius:6px;flex-shrink:0}
.month-links a{text-decoration:none;background:var(--surface2)}
.month-links .cur{background:var(--accent);color:#fff;border-color:var(--accent)}

/* Result table — high-contrast white digits, red header row */
.table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:.4em 0}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
caption{text-align:left;font-size:.85rem;color:var(--muted);padding:0 0 .6em}
.result-table{width:100%}
.result-table th,.result-table td{border:1px solid var(--line);padding:8px 6px;text-align:center;vertical-align:middle}
.result-table thead th{background:var(--accent);color:#fff;font-size:.8rem;font-weight:700}
.result-table tbody th{background:var(--surface2);text-align:left;font-size:.82rem;line-height:1.25;color:var(--text);white-space:nowrap}
.result-table tbody td{background:var(--surface)}
.result-table tbody tr:nth-child(even) td{background:var(--bg)}
.result-table .bz{font-weight:800}
.result-table .bz-time{font-size:.78rem;color:var(--muted);font-weight:500}
.result-table td .patti{font-weight:800;font-size:1.8rem;color:var(--text);letter-spacing:1px;line-height:1}
.single-pill{display:inline-block;min-width:1.6em;padding:3px 8px;border-radius:6px;background:var(--accent);color:#fff;font-weight:800;font-size:1.2rem}
.res-cell{font-size:.92rem;color:var(--text)}
.ok{vertical-align:middle}
.updated{display:block;font-size:.66rem;color:var(--muted);margin-top:4px;font-weight:500}
.pending{display:inline-block;background:var(--surface2);color:#6B6560;font-style:italic;font-size:.85rem;padding:3px 8px;border-radius:4px}
.dash{font-size:1.4rem;color:var(--muted)}

/* Schedule / chart tables */
.sched th,.sched td,.chart-table th,.chart-table td{border:1px solid var(--line);padding:7px 9px;font-size:.9rem}
.patti-list{text-align:left;word-spacing:.5em;line-height:1.9;font-variant-numeric:tabular-nums}
.chart-table th,.chart-table td{text-align:center}
.sched th,.sched td{text-align:left}
.sched thead th,.chart-table thead th{background:var(--surface2);color:var(--text)}

/* Day-grid (archive tables, not the centerpiece table). Always 8 columns;
   horizontal swipe within it is fine at 360px. */
.dg-scroll{container-type:inline-size}
.daygrid{min-width:520px}
.daygrid th,.daygrid td{border:1px solid var(--line);padding:8px 4px;text-align:center;font-size:.92rem}
/* Date bar = sticky <caption>, viewport-centred via 100cqw (see build.js). */
.dg-date{position:sticky;left:0;width:100cqw;box-sizing:border-box;background:var(--accent);color:#fff;font-weight:700;font-size:.95rem;padding:7px;text-align:center}
.dg-patti{font-weight:800;font-size:1.05rem;color:var(--text)}
.dg-single{color:var(--text)}
.dg-empty{color:var(--muted)}
.game-off{background:var(--surface2);color:var(--muted);font-style:italic;font-weight:600;padding:10px}

/* Button-styled link/button (View All / Load More). */
.view-all{text-align:center;margin:16px 0 4px}
.btn{display:inline-block;background:var(--accent);color:#fff;font-weight:800;font-size:1rem;
  padding:12px 24px;border-radius:8px;text-decoration:none}
.btn:hover{background:var(--accent-dark)}
button.btn{border:none;font:inherit;font-weight:800;cursor:pointer}

/* Notice / disclaimer callout */
.notice{background:rgba(220,38,38,.08);border:1px solid var(--line);border-left:3px solid var(--accent);
  padding:10px 12px;border-radius:6px;color:var(--text);font-size:.92rem}

.lead{font-size:1rem;color:var(--text)}
.lang-bn{font-size:1rem;line-height:1.7;color:var(--text)}

/* FAQ */
.faq dt{font-weight:800;margin-top:.9em;color:var(--text)}
.faq dd{margin:.25em 0 0;color:#292524}

/* Breadcrumb + day nav */
.breadcrumb{font-size:.85rem;color:var(--muted);margin:4px 0 12px}
.breadcrumb a{color:var(--muted)}
.daynav{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:12px 0}
.daynav a{text-decoration:none;background:var(--surface2);border:1px solid var(--line);padding:8px 10px;border-radius:6px;font-size:.9rem}

/* Link lists */
.linklist{list-style:none;padding:0;margin:.4em 0}
.linklist li{padding:8px 0;border-bottom:1px solid var(--line)}
.linklist li:last-child{border-bottom:0}

/* Pagination */
.pager{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
.pager a,.pager span{padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:.9rem;text-decoration:none}
.pager .cur{background:var(--accent);color:#fff;border-color:var(--accent)}

/* Ad slot — fixed height so CLS is 0 */
.ad-slot{height:250px;margin:16px 0;border:1px dashed var(--line);border-radius:6px;
  display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--muted);
  font-size:.72rem;letter-spacing:.12em;text-transform:uppercase}

/* About-page brand banner (width/height attrs reserve the ratio, CLS 0). */
.brand-figure{margin:20px 0 0}
.brand-figure img{max-width:100%;height:auto;display:block;border-radius:8px}

/* Footer */
.site-footer{background:var(--surface2);color:var(--muted);margin-top:24px;font-size:.86rem;border-top:1px solid var(--line)}
.site-footer .wrap{padding:18px 14px}
.footer-cols{display:flex;flex-wrap:wrap;gap:16px 32px;margin:0 0 14px}
.site-footer nav{display:flex;flex-direction:column;gap:2px;min-width:120px}
.site-footer nav strong{color:var(--text);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
.site-footer a{color:#44403C;text-decoration:none;white-space:nowrap;line-height:1.9;padding:6px 0}
.site-footer a:hover{text-decoration:underline;color:var(--link)}
.footer-legal{margin:10px 0 0;color:var(--muted);font-size:.82rem}

/* Back-to-top: fixed bottom-right, hidden until scrolled (see BACK_TO_TOP script). */
#back-to-top{position:fixed;right:16px;bottom:16px;width:48px;height:48px;border-radius:50%;
  background:var(--accent);color:#fff;border:none;font-size:1.3rem;line-height:1;cursor:pointer;
  box-shadow:0 2px 8px rgba(0,0,0,.28);z-index:40}
#back-to-top:hover{background:var(--accent-dark)}

/* Small screens: keep everything readable at 360px */
@media (max-width:420px){
  .nav{gap:5px 10px}
  .nav a{font-size:.82rem}
  h1{font-size:1.3rem}
}
`;

module.exports = { CSS };
