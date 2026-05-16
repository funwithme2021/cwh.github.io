(function(){
const STYLE_ID='rail-origin-destination-query-v2-style';

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
.rod2{display:grid;gap:14px}
.rod2-panel{border:1px solid rgba(148,163,184,.18);border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,250,252,.98));box-shadow:0 14px 32px rgba(15,23,42,.06)}
.rod2-controls{padding:18px}
.rod2-toolbar{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start}
.rod2-toolbar-sheet{display:none}
.rod2-fav{position:relative}
.rod2-btn,.rod2-chip,.rod2-sort,.rod2-filter,.rod2-search,.rod2-swap,.rod2-ticket,.rod2-mopen,.rod2-mobilesort-toggle,.rod2-mobilefilter-toggle,.rod2-mobilesort-option,.rod2-mobilefilter-clear{appearance:none;border:none;cursor:pointer;transition:transform .16s ease,background .16s ease,color .16s ease}
.rod2-btn:hover,.rod2-chip:hover,.rod2-sort:hover,.rod2-filter:hover,.rod2-search:hover,.rod2-swap:hover,.rod2-ticket:hover,.rod2-mopen:hover,.rod2-mobilesort-option:hover,.rod2-mobilefilter-clear:hover{transform:translateY(-1px)}
.rod2-btn{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 14px;border-radius:14px;background:#e2e8f0;color:var(--text-main,#0f172a);font-size:.88rem;font-weight:900}
.rod2-menu{position:absolute;top:calc(100% + 8px);left:0;display:none;gap:6px;padding:8px;min-width:min(320px,82vw);max-height:min(48vh,320px);overflow:auto;border:1px solid rgba(148,163,184,.18);border-radius:18px;background:var(--bg-surface,#fff);box-shadow:0 20px 36px rgba(15,23,42,.12);z-index:32}
.rod2-menu.open{display:grid}
.rod2-fav-item,.rod2-fav-empty{display:grid;gap:2px;width:100%;padding:10px 12px;border-radius:14px;background:#f8fafc;color:var(--text-main,#0f172a);font-size:.86rem;font-weight:800;text-align:left}
.rod2-fav-item:hover{background:#e2e8f0}
.rod2-fav-empty{cursor:default;color:var(--text-muted,#64748b)}
.rod2-fav-meta,.rod2-label,.rod2-meta,.rod2-seat,.rod2-empty,.rod2-placeholder,.rod2-note,.rod2-count-label,.rod2-kicker,.rod2-head,.rod2-mhead,.rod2-durmeta{color:var(--text-muted,#64748b)}
.rod2-history,.rod2-sorts,.rod2-filters{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.rod2-history{flex-wrap:wrap}
.rod2-chip,.rod2-sort,.rod2-filter{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.92);border:1px solid rgba(148,163,184,.16);color:var(--text-main,#0f172a);font-size:.82rem;font-weight:800;white-space:nowrap}
.rod2-sort{min-height:48px;border-radius:16px;font-size:.9rem}
.rod2-sort.active,.rod2-filter.active,.rod2-mobilesort-option.active,.rod2-mobilefilter-clear.active{border-color:transparent;background:rgba(37,99,235,.12);color:var(--primary,#2563eb)}
.rod2-mobilebar{display:none}
.rod2-body{display:grid;gap:12px;margin-top:12px}
.rod2-sheet{display:block}
.rod2-form{display:grid;grid-template-columns:minmax(132px,.72fr) 44px minmax(132px,.72fr) max-content minmax(164px,.84fr) auto;gap:10px;align-items:end}
.rod2-field{display:grid;gap:8px;min-width:0}
.rod2-label{font-size:.78rem;font-weight:800}
.rod2-wrap{display:flex;align-items:center;min-height:48px;padding:0 14px;border:1px solid var(--border,#dbe2ea);border-radius:18px;background:rgba(148,163,184,.08)}
.rod2-input{width:100%;border:none;outline:none;background:transparent;color:var(--text-main,#0f172a);font-size:1rem;font-weight:800}
.rod2-toggle{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 12px;border:1px solid rgba(148,163,184,.18);border-radius:18px;background:rgba(255,255,255,.92);color:var(--text-main,#0f172a);font-size:.88rem;font-weight:800;width:max-content}
.rod2-toggle input{width:16px;height:16px;accent-color:var(--primary,#2563eb)}
.rod2-search{min-height:48px;padding:0 18px;border-radius:16px;background:var(--primary,#2563eb);color:#fff;font-size:.94rem;font-weight:900}
.rod2-swap{width:44px;height:48px;border-radius:16px;background:#fff;border:1px solid rgba(148,163,184,.16);color:var(--primary,#2563eb);font-size:1rem;font-weight:900}
.rod2-mobiletools{display:none}
.rod2-mobilesort,.rod2-mobilefilter{position:relative}
.rod2-mobilesort-toggle,.rod2-mobilefilter-toggle{width:100%;min-height:46px;padding:0 14px;border:1px solid rgba(148,163,184,.18);border-radius:16px;background:rgba(255,255,255,.82);color:var(--text-main,#0f172a);font-size:.88rem;font-weight:800;text-align:left}
.rod2-filter-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.rod2-filter-toggle-meta{display:flex;align-items:center;gap:8px;min-width:0}
.rod2-mobilesort-label,.rod2-mobilefilter-label{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rod2-filter-toggle-count{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;border-radius:999px;background:rgba(37,99,235,.12);color:var(--primary,#2563eb);font-size:.78rem;font-weight:900}
.rod2-mobilesort-caret,.rod2-mobilefilter-caret{flex:0 0 auto;color:var(--primary,#2563eb);font-size:.92rem;font-weight:900}
.rod2-mobilesort-menu,.rod2-mobilefilter-menu{position:absolute;top:calc(100% + 8px);left:0;right:0;display:none;gap:4px;padding:6px;max-height:min(52vh,320px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;border:1px solid rgba(148,163,184,.18);border-radius:18px;background:var(--bg-surface,#fff);box-shadow:0 20px 36px rgba(15,23,42,.12);z-index:35}
.rod2-mobilesort.open .rod2-mobilesort-menu,.rod2-mobilefilter.open .rod2-mobilefilter-menu{display:grid}
.rod2-mobilesort-option,.rod2-mobilefilter-clear,.rod2-mobilefilter-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:12px;background:transparent;color:var(--text-main,#0f172a);font-size:.84rem;font-weight:700;text-align:left}
.rod2-mobilefilter-item input{width:16px;height:16px;margin:0;accent-color:var(--primary,#2563eb);flex:0 0 auto}
.rod2-filterline{display:grid;gap:8px;margin-top:12px}
.rod2-placeholder,.rod2-empty{display:flex;align-items:center;justify-content:center;min-height:120px;padding:18px;border:1px dashed rgba(148,163,184,.22);border-radius:20px;font-size:.95rem;font-weight:700;text-align:center}
.rod2-summary-panel{padding:18px}
.rod2-sumhead{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start}
.rod2-kicker{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:.82rem;font-weight:800}
.rod2-kicker strong{color:var(--primary,#2563eb);font-weight:900}
.rod2-title{color:var(--text-main,#0f172a);font-size:1.48rem;font-weight:900;line-height:1.08;letter-spacing:.01em}
.rod2-nextrow{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:flex-start;margin-top:8px}
.rod2-next{display:flex;flex:1 1 100%;min-width:0;padding:0;background:transparent;color:inherit;text-align:left}
.rod2-next-main{display:grid;gap:4px;min-width:0}
.rod2-count{display:inline-flex;align-items:baseline;justify-self:end;align-self:start;gap:6px;min-width:0;width:max-content;max-width:100%;margin:18px 0 0 auto;padding:7px 10px 6px;border-radius:16px;border:1px solid rgba(37,99,235,.14);background:linear-gradient(135deg,rgba(37,99,235,.12),rgba(255,255,255,.72));box-shadow:0 10px 22px rgba(37,99,235,.10)}
.rod2-count-value{color:var(--primary,#2563eb);font-size:1.24rem;font-weight:900;line-height:1;font-family:'Inter',sans-serif!important;font-feature-settings:"tnum" 1,"lnum" 1!important;font-variant-numeric:lining-nums tabular-nums!important}
.rod2-count-label{font-size:.84rem;font-weight:800}
.rod2-summary-trigger,.rod2-summary-trigger:hover{transform:none}
.rod2-summary-label-line{display:block;color:var(--text-muted,#64748b);font-size:.78rem;font-weight:800;line-height:1.25}
.rod2-summary-line,.rod2-summary-transfer-top,.rod2-summary-transfer-trains{display:flex;flex-wrap:wrap;align-items:center;gap:3px 6px}
.rod2-summary-transfer-desktop{display:flex;flex-wrap:wrap;align-items:center;gap:3px 6px}
.rod2-summary-transfer-mobile{display:none}
.rod2-summary-dot,.rod2-train-sep{color:var(--text-muted,#64748b);font-size:.78rem;font-weight:700;line-height:1.25}
.rod2-summary-nowarp,.rod2-summary-time,.rod2-summary-seatline{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.rod2-summary-seatline{flex-wrap:wrap}
.rod2-summary-book{margin-left:0}
.rod2-summary-time .rsv2-time-main,.rod2-summary-time .rsv2-time-sub,.rod2-summary-time .rod2-time-original{font-family:'Inter',sans-serif!important;font-feature-settings:"tnum" 1,"lnum" 1!important;font-variant-numeric:lining-nums tabular-nums!important}
.rod2-next .rsv2-summary-value,
.rod2-summary-time .rsv2-time-main,
.rod2-summary-time .rsv2-time-sub,
.rod2-summary-time .rod2-time-original,
.rod2-summary-book{
font-size:.78rem;
line-height:1.25;
font-weight:800
}
.rsv2-summary{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px 12px;margin-top:14px}
.rsv2-summary-button,.rsv2-summary-item{display:grid;gap:6px;grid-column:span 12;align-content:start;padding:14px 16px;border:1px solid rgba(148,163,184,.14);border-radius:18px;background:rgba(255,255,255,.66);text-align:left}
.rsv2-summary-button{cursor:pointer}
.rsv2-summary-label{color:var(--text-muted,#64748b);font-size:.74rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.rsv2-summary-value{color:var(--text-main,#0f172a);font-size:.94rem;font-weight:900;line-height:1.35}
.rsv2-summary-button.is-wide-mobile,.rsv2-summary-item.is-wide-mobile{grid-column:1 / -1}
.rod2-scale-wrap{display:block;max-width:100%;overflow:hidden}
.rod2-list-card{padding:0;border:1px solid rgba(148,163,184,.16);border-radius:22px;background:var(--bg-surface,#fff);box-shadow:0 8px 24px rgba(15,23,42,.04);--g:minmax(160px,.9fr) minmax(168px,1fr) minmax(210px,1.18fr) 124px minmax(150px,.9fr)}
.rod2-list-card.has-via{--g:minmax(160px,.9fr) minmax(168px,1fr) minmax(180px,1fr) 124px minmax(100px,.62fr) minmax(150px,.9fr)}
.rod2-list-card.has-seat{--g:minmax(138px,1fr) minmax(112px,.92fr) minmax(142px,1fr) minmax(112px,.92fr) minmax(112px,.92fr) minmax(126px,.96fr)}
.rod2-head,.rod2-row-d{display:grid;grid-template-columns:var(--g);gap:14px;align-items:center}
.rod2-head{padding:12px 18px;background:rgba(248,250,252,.94);border-bottom:1px solid rgba(148,163,184,.14);font-size:.8rem;font-weight:900;letter-spacing:.02em;text-align:center}
.rod2-head>span{justify-self:center;width:100%;text-align:center}
.rod2-mhead{display:none}
.rod2-item{border-top:1px solid rgba(148,163,184,.12)}
.rod2-item:first-child{border-top:none}
.rod2-row-d{padding:16px 18px;cursor:pointer}
.rod2-item:hover .rod2-row-d,.rod2-item:hover .rod2-row-m{background:rgba(37,99,235,.04)}
.rod2-item.is-running .rod2-row-d,.rod2-item.is-running .rod2-row-m{background:rgba(22,163,74,.05)}
.rod2-item.is-passed .rod2-row-d,.rod2-item.is-passed .rod2-row-m{background:var(--bg-surface,#fff)}
.rod2-timecell{display:grid;justify-items:start;align-content:center;gap:5px;text-align:left}
.rod2-timecell .rsv2-time-main,.rod2-timecell .rsv2-time-sub,.rod2-time-original{font-family:'Inter',sans-serif!important;font-feature-settings:"tnum" 1,"lnum" 1!important;font-variant-numeric:lining-nums tabular-nums!important}
.rod2-timecell .rsv2-time-main,.rod2-timecell .rsv2-time-sub{color:var(--text-main,#0f172a);font-size:1.06rem;font-weight:900;line-height:1.1}
.rod2-time-original{color:var(--text-muted,#64748b);font-size:inherit;font-weight:inherit;line-height:inherit;text-decoration:line-through}
.rod2-train,.rod2-route{color:var(--text-main,#0f172a);font-size:.96rem;font-weight:900;line-height:1.28;word-break:break-word}
.rod2-train{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;min-width:0}
.rod2-train-stack,.rod2-seat-stack,.rod2-via-lines{display:grid;gap:4px;min-width:0}
.rod2-train-line{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;min-width:0}
.rod2-via{align-self:center;color:var(--text-muted,#64748b);font-size:.8rem;font-weight:800;line-height:1.35;text-align:center}
.rod2-side{display:grid;justify-items:center;align-content:center;gap:8px}
.rod2-status,.rod2-mstatus{display:block;color:var(--text-main,#0f172a);font-size:.84rem;font-weight:900;line-height:1.35;text-align:center}
.rod2-actions,.rod2-mactions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%}
.rod2-pill{display:inline-flex;align-items:center;min-height:32px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.82);border:1px solid rgba(148,163,184,.14);color:var(--text-main,#0f172a);font-size:.76rem;font-weight:800}
.rod2-ticket{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 12px;border-radius:12px;background:var(--primary,#2563eb);color:#fff;font-size:.82rem;font-weight:900}
.rod2-row-m{display:none}
.rod2-row-m-custom{display:block!important;grid-template-columns:1fr!important;padding:12px 10px 14px}
.rod2-durwrap{display:grid;justify-items:center;gap:4px}
.rod2-durmeta{font-size:.72rem;font-weight:800;line-height:1.2;white-space:nowrap}
.rod2-durbox{position:relative;display:flex;align-items:center;justify-content:center;width:112px;min-height:36px;padding:0 10px;border-radius:999px;border:1px solid rgba(148,163,184,.14);background:rgba(37,99,235,.06);overflow:hidden;text-align:center}
.rod2-durbox::after{content:"";position:absolute;left:0;bottom:0;height:4px;width:var(--dur-fill,42%);border-radius:999px;background:currentColor;opacity:.3}
.rod2-durmain{position:relative;z-index:1;color:var(--text-main,#0f172a);font-size:.9rem;font-weight:900;line-height:1.2;white-space:nowrap;font-family:'Inter','Noto Sans TC',sans-serif;font-feature-settings:"tnum" 1,"lnum" 1;font-variant-numeric:lining-nums tabular-nums}
.rod2-durbox.rod2-dur-green{background:rgba(22,163,74,.08);color:#15803d}
.rod2-durbox.rod2-dur-yellow{background:rgba(234,179,8,.12);color:#a16207}
.rod2-durbox.rod2-dur-orange{background:rgba(234,88,12,.08);color:#c2410c}
.rod2-durbox.rod2-dur-red{background:rgba(220,38,38,.08);color:#b91c1c}
.rod2-durbox.rod2-dur-purple{background:rgba(147,51,234,.10);color:#7e22ce}
.rod2-tone-success{color:#15803d}.rod2-tone-warning{color:#c2410c}.rod2-tone-danger{color:#b91c1c}.rod2-tone-muted{color:#64748b}.rod2-tone-neutral{color:var(--text-main,#0f172a)}
body.dark-mode .rod2-panel,body.dark-mode .rod2-menu,body.dark-mode .rod2-chip,body.dark-mode .rod2-sort,body.dark-mode .rod2-filter,body.dark-mode .rod2-wrap,body.dark-mode .rod2-toggle,body.dark-mode .rod2-swap,body.dark-mode .rod2-list-card,body.dark-mode .rod2-pill,body.dark-mode .rod2-mobilesort-toggle,body.dark-mode .rod2-mobilefilter-toggle,body.dark-mode .rod2-mobilesort-menu,body.dark-mode .rod2-mobilefilter-menu{background:rgba(15,23,42,.86);border-color:rgba(148,163,184,.14);color:var(--text-main,#f8fafc)}
body.dark-mode .rod2-panel{background:linear-gradient(180deg,rgba(15,23,42,.96),rgba(15,23,42,.9))}
body.dark-mode .rod2-btn,body.dark-mode .rod2-fav-item,body.dark-mode .rod2-fav-empty,body.dark-mode .rod2-mopen{background:#1e293b;color:var(--text-main,#f8fafc)}
body.dark-mode .rod2-title,body.dark-mode .rod2-timecell .rsv2-time-main,body.dark-mode .rod2-timecell .rsv2-time-sub,body.dark-mode .rod2-train,body.dark-mode .rod2-route{color:var(--text-main,#f8fafc)}
body.dark-mode .rod2-head{background:rgba(15,23,42,.92);border-bottom-color:rgba(148,163,184,.16);color:var(--text-muted,#94a3b8)}
body.dark-mode .rod2-mhead{color:var(--text-muted,#94a3b8)}
body.dark-mode .rsv2-summary-button,body.dark-mode .rsv2-summary-item{background:rgba(15,23,42,.68);border-color:rgba(148,163,184,.14)}
body.dark-mode .rsv2-summary-value{color:var(--text-main,#f8fafc)}
body.dark-mode .rod2-sort.active,body.dark-mode .rod2-filter.active,body.dark-mode .rod2-mobilesort-option.active,body.dark-mode .rod2-mobilefilter-clear.active{background:rgba(96,165,250,.16);color:#bfdbfe}
@media (max-width:900px){.rod2-head,.rod2-row-d{display:none}.rod2-mhead{display:grid;grid-template-columns:120px minmax(118px,1fr) minmax(110px,1fr);gap:10px;padding:0 10px 8px;font-size:.72rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.rod2-mhead.via,.rod2-row-m.via{grid-template-columns:120px minmax(96px,1fr) 72px minmax(96px,1fr)}.rod2-mhead.has-seat,.rod2-row-m.has-seat{grid-template-columns:120px minmax(94px,1fr) 84px minmax(96px,1fr)}.rod2-row-m{display:grid;grid-template-columns:120px minmax(118px,1fr) minmax(110px,1fr);gap:10px;padding:12px 10px;cursor:pointer;align-items:center}.rod2-mtime,.rod2-mtrain,.rod2-mmeta,.rod2-mvia,.rod2-mseat{display:grid;gap:4px;min-width:0}.rod2-mroute{color:var(--text-main,#0f172a);font-size:.8rem;font-weight:900;line-height:1.35;text-align:right}}
@media (max-width:720px){.rod2-toolbar-top{display:none}.rod2-toolbar-sheet{display:grid;margin-bottom:10px}.rod2-mobilebar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;margin-top:10px}.rod2-mopen{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:46px;padding:0 14px;border-radius:16px;background:#e2e8f0;color:var(--text-main,#0f172a);font-size:.84rem;font-weight:800;text-align:left}.rod2-mopen::after{content:"▾";color:var(--primary,#2563eb);font-size:.9rem}.rod2-sheet{display:none}.rod2-sheet.open{display:block}.rod2-form{grid-template-columns:minmax(0,1fr) 42px minmax(0,1fr);gap:10px}.rod2-start{grid-column:1;grid-row:1}.rod2-swapf{grid-column:2;grid-row:1}.rod2-end{grid-column:3;grid-row:1}.rod2-togglef{grid-column:1 / 3;grid-row:2}.rod2-searchf{grid-column:3;grid-row:2}.rod2-sortf{display:none}.rod2-mobiletools{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-top:10px}.rod2-mobiletools[data-single="1"]{grid-template-columns:minmax(0,1fr)}.rod2-filterline{display:none}.rod2-btn{width:100%;justify-content:center}.rod2-history{flex-wrap:nowrap}.rod2-searchf .rod2-label{visibility:hidden}.rod2-searchf .rod2-search{width:100%}.rod2-sumhead{grid-template-columns:minmax(0,1fr)}.rod2-count{margin:0 auto 0 0}.rod2-summary-transfer-desktop{display:none}.rod2-summary-transfer-mobile{display:grid;gap:4px}.rod2-list-card{margin-top:12px}[data-role="results"] .rod2-scale-wrap{zoom:.9}}
@media (max-width:520px){.rod2-controls,.rod2-summary-panel{padding:14px}.rod2-title{font-size:1.18rem}.rod2-row-m{padding:16px 12px;gap:8px}.rod2-mhead,.rod2-row-m{grid-template-columns:minmax(102px,.92fr) minmax(90px,1fr) minmax(82px,.9fr)}.rod2-mhead.via,.rod2-row-m.via{grid-template-columns:minmax(102px,.92fr) minmax(82px,.9fr) 60px minmax(86px,.9fr)}.rod2-mhead.has-seat,.rod2-row-m.has-seat{grid-template-columns:minmax(102px,.92fr) minmax(90px,1fr) minmax(74px,.82fr) minmax(82px,.88fr)}.rod2-timecell .rsv2-time-main,.rod2-timecell .rsv2-time-sub{font-size:.92rem}.rod2-mstatus{font-size:.84rem;line-height:1.35;text-align:right}.rod2-durbox{width:104px;min-height:34px;padding:0 8px}.rod2-durmeta{font-size:.68rem}.rod2-durmain{font-size:.84rem}}
`;
  document.head.appendChild(style);
}

const esc=(value)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const htmlOr=(html,text,fallback)=>html!=null?html:(text!=null&&text!==''?esc(text):esc(fallback??''));
const normTone=(value)=>['success','warning','danger','muted','neutral'].includes(value)?value:'neutral';
const uniq=(values)=>(Array.isArray(values)?values:[]).map(v=>String(v||'')).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);

function renderHistory(items){
  return (Array.isArray(items)?items.slice(0,5):[]).map((item,index)=>`<button class="rod2-chip" type="button" data-role="history-item" data-index="${index}">${esc(item?.label||`${item?.start||''} → ${item?.end||''}`)}</button>`).join('');
}

function renderFavorites(items){
  if(!Array.isArray(items)||!items.length) return '<div class="rod2-fav-empty">尚未設定常用行程</div>';
  return items.map((item,index)=>`<button class="rod2-fav-item" type="button" data-role="favorite-item" data-index="${index}"><span>${esc(item?.label||`${item?.start||''} → ${item?.end||''}`)}</span>${item?.meta?`<span class="rod2-fav-meta">${esc(item.meta)}</span>`:''}</button>`).join('');
}

const renderPills=(row)=>Array.isArray(row?.pills)?row.pills.map(v=>`<span class="rod2-pill">${esc(v)}</span>`).join(''):'';
const renderTicket=(row,index,role='ticket')=>row?.ticketHidden?'':`<button class="rod2-ticket" type="button" data-role="${role}" ${index==null?'':`data-index="${index}"`}>${esc(row?.ticketLabel||'訂票')}</button>`;

function timeCell(row){
  if(row?.timeHtml!=null) return row.timeHtml;
  const text=row?.timeText||`${row?.depText||'--'} → ${row?.arrText||'--'}`;
  return `<div class="rod2-timecell"><div class="rsv2-time-main">${esc(text)}</div></div>`;
}

function decorateDurationRows(rows){
  const list=Array.isArray(rows)?rows:[];
  const finite=list.map(r=>Number(r?.sortDur)).filter(Number.isFinite);
  if(!finite.length) return list.slice();
  const sorted=finite.slice().sort((a,b)=>a-b);
  const indexMap=new Map();
  sorted.forEach((value,index)=>{ if(!indexMap.has(value)) indexMap.set(value,{first:index,last:index}); else indexMap.get(value).last=index; });
  const classify=(p)=>p<=.05?{label:'最快',cls:'rod2-dur-green'}:p<=.35?{label:'較快',cls:'rod2-dur-yellow'}:p<.65?{label:'一般',cls:'rod2-dur-orange'}:p<.95?{label:'較慢',cls:'rod2-dur-red'}:{label:'最慢',cls:'rod2-dur-purple'};
  return list.map((row)=>{
    const value=Number(row?.sortDur);
    if(!Number.isFinite(value)) return {...row,_durClass:'rod2-dur-yellow',_durFill:42,_durRankLabel:'一般'};
    const rank=indexMap.get(value);
    const p=sorted.length===1?.5:(((rank?.first??0)+(rank?.last??0))/2)/(sorted.length-1);
    const graded=classify(p);
    return {...row,_durClass:graded.cls,_durFill:Math.round(28+p*72),_durRankLabel:graded.label};
  });
}

function durationCell(row){
  const cls=row?._durClass||row?.durationClass||'rod2-dur-yellow';
  const fill=Math.max(18,Math.min(100,Number(row?._durFill??row?.durationFill??42)));
  const rank=row?._durRankLabel||row?.durationRankLabel||'';
  const meta=row?.durationMetaHtml!=null?row.durationMetaHtml:(()=>{const parts=[]; if(row?.durationMetaText) parts.push(esc(row.durationMetaText)); if(rank) parts.push(esc(rank)); return parts.join(' · ');})();
  return `<div class="rod2-durwrap">${meta?`<div class="rod2-durmeta">${meta}</div>`:''}<div class="rod2-durbox ${cls}" style="--dur-fill:${fill}%"><div class="rod2-durmain">${htmlOr(row?.durationHtml,row?.durationText,'--')}</div></div></div>`;
}

function renderDesktopRow(row,index,hasDesktopVia,hasSeat,swapDurationAndVia){
  const routeExtra=row?.metaHtml?`<div class="rod2-meta">${row.metaHtml}</div>`:'';
  const viaCol=hasDesktopVia?`<div class="rod2-via">${htmlOr(row?.viaHtml,row?.viaText,'')}</div>`:'';
  const seatCol=hasSeat?`<div class="rod2-seat">${htmlOr(row?.seatHtml,row?.seatText,'')}</div>`:'';
  const durationCol=`<div>${durationCell(row)}</div>`;
  const middle=swapDurationAndVia?`${viaCol}${durationCol}${hasSeat?seatCol:''}`:`${durationCol}${hasSeat?seatCol:''}${viaCol}`;
  return `<div class="rod2-row-d" data-role="row" data-index="${index}"><div>${timeCell(row)}</div><div class="rod2-train"><span class="rsv2-train-identity">${htmlOr(row?.trainHtml,row?.trainText,'--')}</span></div><div><div class="rod2-route">${htmlOr(row?.routeHtml,row?.routeText,'--')}</div>${routeExtra}</div>${middle}<div class="rod2-side"><div class="rod2-status rod2-tone-${normTone(row?.statusTone)}">${htmlOr(row?.statusHtml,row?.statusText,'')}</div><div class="rod2-actions">${renderPills(row)}${renderTicket(row,index)}</div></div></div>`;
}

function renderMobileHead(headings,mobileHeadings,hasMobileVia,hasSeat){
  const h=headings||{};
  const mh=mobileHeadings||{};
  const classes=['rod2-mhead'];
  if(hasMobileVia) classes.push('via');
  if(hasSeat) classes.push('has-seat');
  const cells=[`<div>${esc(mh.time||h.time||'時間')}</div>`,`<div>${esc(mh.train||h.train||'列車')}</div>`];
  if(hasMobileVia) cells.push(`<div>${esc(mh.via||h.via||'經由')}</div>`);
  if(hasSeat) cells.push(`<div>${esc(mh.seat||h.seat||'座位')}</div>`);
  cells.push(`<div>${esc(mh.status||mh.meta||h.status||'狀態')}</div>`);
  return `<div class="${classes.join(' ')}">${cells.join('')}</div>`;
}

function renderMobileRow(row,index,hasMobileVia,hasSeat){
  const classes=['rod2-row-m'];
  if(hasMobileVia) classes.push('via');
  if(hasSeat) classes.push('has-seat');
  if(typeof row?.mobileCardRenderer==='function') return `<div class="${classes.join(' ')} rod2-row-m-custom" data-role="row" data-index="${index}">${row.mobileCardRenderer(index,row)}</div>`;
  if(row?.mobileCardHtml) return `<div class="${classes.join(' ')} rod2-row-m-custom" data-role="row" data-index="${index}">${row.mobileCardHtml}</div>`;
  const actions=renderPills(row)+renderTicket(row,index);
  return `<div class="${classes.join(' ')}" data-role="row" data-index="${index}"><div class="rod2-mtime">${timeCell(row)}${durationCell(row)}</div><div class="rod2-mtrain"><div class="rod2-train">${htmlOr(row?.trainHtml,row?.trainText,'--')}</div></div>${hasMobileVia?`<div class="rod2-mvia"><div class="rod2-via">${htmlOr(row?.viaHtml,row?.viaText,'')}</div></div>`:''}${hasSeat?`<div class="rod2-mseat"><div class="rod2-seat">${htmlOr(row?.seatHtml,row?.seatText,'')}</div></div>`:''}<div class="rod2-mmeta"><div class="rod2-mstatus rod2-tone-${normTone(row?.statusTone)}">${htmlOr(row?.statusHtml,row?.statusText,'')}</div><div class="rod2-mroute">${htmlOr(row?.routeHtml,row?.routeText,'--')}</div>${row?.metaHtml?`<div class="rod2-note">${row.metaHtml}</div>`:''}${row?.seatHtml&&!hasSeat?`<div class="rod2-note">${row.seatHtml}</div>`:''}</div>${actions?`<div class="rod2-mactions">${actions}</div>`:''}</div>`;
}

function resultHtml(result){
  const rows=decorateDurationRows(Array.isArray(result?.rows)?result.rows:[]);
  if(!rows.length) return `<div class="rod2-empty">${esc(result?.emptyMessage||'查無符合條件的班次')}</div>`;
  if(result?.customHtml!=null){
    if(typeof result.customHtml==='function') return result.customHtml(rows);
    return String(result.customHtml);
  }
  const headings=result?.headings||{};
  const mobileHeadings=result?.mobileHeadings||{};
  const hasDesktopVia=!!headings?.via;
  const hasMobileVia=!!(mobileHeadings?.via||headings?.via);
  const hasVia=hasDesktopVia||hasMobileVia;
  const hasSeat=!!headings?.seat||rows.some(row=>(row?.seatHtml!=null&&row.seatHtml!=='')||(row?.seatText!=null&&row?.seatText!==''));
  const swapDurationAndVia=!!result?.swapDurationAndVia&&hasDesktopVia&&!hasSeat;
  const middleHead=swapDurationAndVia?`${hasDesktopVia?`<span>${esc(headings.via||'經由')}</span>`:''}<span>${esc(headings.duration||'耗時')}</span>${hasSeat?`<span>${esc(headings.seat||'座位')}</span>`:''}`:`<span>${esc(headings.duration||'耗時')}</span>${hasSeat?`<span>${esc(headings.seat||'座位')}</span>`:''}${hasDesktopVia?`<span>${esc(headings.via||'經由')}</span>`:''}`;
  return `<section class="rod2-panel rod2-summary-panel"><div class="rod2-scale-wrap"><div class="rod2-sumhead"><div>${result?.kickerHtml?`<div class="rod2-kicker">${result.kickerHtml}</div>`:''}<div class="rod2-title">${result?.titleHtml!=null?result.titleHtml:esc(result?.title||'')}</div>${result?.subtitleHtml!=null||result?.subtitle?`<div class="rod2-subtitle">${result?.subtitleHtml!=null?result.subtitleHtml:esc(result.subtitle||'')}</div>`:''}<div class="rod2-nextrow">${result?.summaryHtml?`<button class="rod2-next rod2-summary-trigger rsv2-summary-button is-wide-mobile" type="button" data-role="summary-detail"><span class="rod2-next-main">${result.summaryHtml}</span></button>`:''}</div></div><div class="rod2-count"><span class="rod2-count-value">${esc(result?.countValue!=null?result.countValue:rows.length)}</span><span class="rod2-count-label">${esc(result?.countLabel||'總班次')}</span></div></div></div></section><section class="rod2-panel rod2-list-card${hasSeat?' has-seat':''}${hasDesktopVia?' has-via':''}"><div class="rod2-scale-wrap"><div class="rod2-head"><span>${esc(headings.time||'出發 / 抵達')}</span><span>${esc(headings.train||'列車')}</span><span>${esc(headings.route||'行駛區間')}</span>${middleHead}<span>${esc(headings.status||'狀態')}</span></div>${result?.hideMobileHead?'':renderMobileHead(headings,mobileHeadings,hasMobileVia,hasSeat)}${rows.map((row,index)=>{const classes=['rod2-item']; if(row?.isPassed) classes.push('is-passed'); else if(row?.isRunning) classes.push('is-running'); return `<article class="${classes.join(' ')}">${renderDesktopRow(row,index,hasDesktopVia,hasSeat,swapDurationAndVia)}${renderMobileRow(row,index,hasMobileVia,hasSeat)}</article>`;}).join('')}</div></section>`;
}

function create(config){
  ensureStyles();
  const root=document.getElementById(config.rootId);
  if(!root) return null;

  const baseSorts=Array.isArray(config.sortOptions)?config.sortOptions.slice():[];
  const state={start:'',end:'',modeEnabled:!!config.defaultModeEnabled,selectedFilters:[],favoriteOpen:false,sortKey:config.defaultSortKey||(baseSorts[0]?.value||''),sheetOpen:false,mobileFilterOpen:false,mobileSortOpen:false};
  const manualSearchOnly=!!config.manualSearchOnly;
  const toolbarAutoSearch=!!config.toolbarAutoSearch;
  let currentResult=null;
  let historyItems=[];
  let favoriteItems=[];
  let filterOptions=[];
  let sortOptions=baseSorts.slice();
  let filterTimer=0;

  root.innerHTML=`<div class="rod2"><section class="rod2-panel rod2-controls"><div class="rod2-toolbar rod2-toolbar-top"><div class="rod2-fav"><button class="rod2-btn" type="button" data-role="favorite-toggle">${esc(config.favoriteButtonText||'常用行程')}</button><div class="rod2-menu" data-role="favorite-menu"></div></div><div class="rod2-history" data-role="history"></div></div><div class="rod2-mobilebar"><button class="rod2-mopen" type="button" data-role="mobile-open"><span data-role="mobile-summary"></span></button><button class="rod2-search" type="button" data-role="mobile-search">${esc(config.buttonText||'查詢')}</button></div><div class="rod2-body"><div class="rod2-sheet" data-role="sheet"><div class="rod2-toolbar rod2-toolbar-sheet"><div class="rod2-fav"><button class="rod2-btn" type="button" data-role="favorite-toggle">${esc(config.favoriteButtonText||'常用行程')}</button><div class="rod2-menu" data-role="favorite-menu"></div></div><div class="rod2-history" data-role="history"></div></div><div class="rod2-form"><label class="rod2-field rod2-start" for="${esc(config.startInputId)}"><span class="rod2-label">${esc(config.startLabel||'出發')}</span><span class="rod2-wrap"><input id="${esc(config.startInputId)}" class="rod2-input" type="text" list="${esc(config.datalistId||'')}" placeholder="${esc(config.startPlaceholder||'')}"></span></label><div class="rod2-field rod2-swapf"><span class="rod2-label">互換</span><button class="rod2-swap" type="button" data-role="swap">${esc(config.swapButtonText||'↔')}</button></div><label class="rod2-field rod2-end" for="${esc(config.endInputId)}"><span class="rod2-label">${esc(config.endLabel||'到達')}</span><span class="rod2-wrap"><input id="${esc(config.endInputId)}" class="rod2-input" type="text" list="${esc(config.datalistId||'')}" placeholder="${esc(config.endPlaceholder||'')}"></span></label><label class="rod2-field rod2-togglef"><span class="rod2-label">${esc(config.modeLabel||'查詢模式')}</span><span class="rod2-toggle"><input type="checkbox" data-role="mode"${state.modeEnabled?' checked':''}><span>${esc(config.modeToggleText||'選項')}</span></span></label><div class="rod2-field rod2-sortf" data-role="sort-inline-block" hidden><span class="rod2-label">${esc(config.sortLabel||'排序')}</span><div class="rod2-sorts" data-role="sort-group"></div></div><div class="rod2-field rod2-searchf"><span class="rod2-label">查詢</span><button id="${esc(config.buttonId)}" class="rod2-search" type="button">${esc(config.buttonText||'查詢')}</button></div></div>${config.disableFilters?'':`<div class="rod2-block rod2-filterline" data-role="filter-block" hidden><span class="rod2-label">${esc(config.filterLabel||'篩選')}</span><div class="rod2-filters" data-role="filters"></div></div>`}</div><div class="rod2-mobiletools" data-role="mobile-tools"><div class="rod2-field rod2-mobiletool" data-role="mobile-sort-field" hidden><span class="rod2-label">${esc(config.sortLabel||'排序')}</span><div class="rod2-mobilesort" data-role="mobile-sort-shell"><button class="rod2-mobilesort-toggle" type="button" data-role="mobile-sort-toggle"><span class="rod2-filter-toggle-row"><span class="rod2-filter-toggle-meta"><span class="rod2-mobilesort-label" data-role="mobile-sort-label"></span></span><span class="rod2-mobilesort-caret" data-role="mobile-sort-arrow" aria-hidden="true">▾</span></span></button><div class="rod2-mobilesort-menu" data-role="mobile-sort-menu"></div></div></div>${config.disableFilters?'':`<div class="rod2-field rod2-mobiletool" data-role="mobile-filter-field" hidden>${config.mobileFilterMulti?`<span class="rod2-label">${esc(config.filterLabel||'篩選')}</span><div class="rod2-mobilefilter" data-role="mobile-filter-shell"><button class="rod2-mobilefilter-toggle" type="button" data-role="mobile-filter-toggle"><span class="rod2-filter-toggle-row"><span class="rod2-filter-toggle-meta"><span class="rod2-mobilefilter-label" data-role="mobile-filter-label"></span><span class="rod2-filter-toggle-count" data-role="mobile-filter-count" hidden>0</span></span><span class="rod2-mobilefilter-caret" data-role="mobile-filter-arrow" aria-hidden="true">▾</span></span></button><div class="rod2-mobilefilter-menu" data-role="mobile-filter-menu"></div></div>`:`<span class="rod2-label">${esc(config.filterLabel||'篩選')}</span><span class="rod2-wrap"><select class="rod2-input" data-role="filter-select"></select></span>`}</div>`}</div></div></section><div data-role="results"><div class="rod2-placeholder">${esc(config.placeholderText||'')}</div></div></div>`;

  const start=document.getElementById(config.startInputId);
  const end=document.getElementById(config.endInputId);
  const btn=document.getElementById(config.buttonId);
  const mode=root.querySelector('[data-role="mode"]');
  const histories=root.querySelectorAll('[data-role="history"]');
  const menus=root.querySelectorAll('[data-role="favorite-menu"]');
  const mobileOpen=root.querySelector('[data-role="mobile-open"]');
  const mobileSearch=root.querySelector('[data-role="mobile-search"]');
  const mobileSummary=root.querySelector('[data-role="mobile-summary"]');
  const sheet=root.querySelector('[data-role="sheet"]');
  const sortBlock=root.querySelector('[data-role="sort-inline-block"]');
  const sortGroups=root.querySelectorAll('[data-role="sort-group"]');
  const mobileTools=root.querySelector('[data-role="mobile-tools"]');
  const mobileSortField=root.querySelector('[data-role="mobile-sort-field"]');
  const mobileSortShell=root.querySelector('[data-role="mobile-sort-shell"]');
  const mobileSortLabel=root.querySelector('[data-role="mobile-sort-label"]');
  const mobileSortArrow=root.querySelector('[data-role="mobile-sort-arrow"]');
  const mobileSortMenu=root.querySelector('[data-role="mobile-sort-menu"]');
  const mobileFilterField=root.querySelector('[data-role="mobile-filter-field"]');
  const mobileFilterShell=root.querySelector('[data-role="mobile-filter-shell"]');
  const mobileFilterLabel=root.querySelector('[data-role="mobile-filter-label"]');
  const mobileFilterCount=root.querySelector('[data-role="mobile-filter-count"]');
  const mobileFilterArrow=root.querySelector('[data-role="mobile-filter-arrow"]');
  const mobileFilterMenu=root.querySelector('[data-role="mobile-filter-menu"]');
  const filterSelect=root.querySelector('[data-role="filter-select"]');
  const filterBlock=root.querySelector('[data-role="filter-block"]');
  const filters=root.querySelector('[data-role="filters"]');
  const results=root.querySelector('[data-role="results"]');

  function notify(){ if(typeof config.onStateChange==='function') config.onStateChange({...state}); }
  function modeSummary(){ return typeof config.formatMobileSummary==='function'?config.formatMobileSummary({...state}):`${state.start||'出發'} → ${state.end||'到達'}`; }
  function normalizeStationValue(value){ return typeof config.normalizeStation==='function'?config.normalizeStation(value):String(value||'').trim(); }
  function setInputsFromState(){ if(start) start.value=state.start||''; if(end) end.value=state.end||''; if(mode) mode.checked=!!state.modeEnabled; }

  function renderDesktopSorts(){
    if(!sortGroups.length) return;
    const visible=sortOptions.length>1;
    if(sortBlock) sortBlock.hidden=!visible;
    const html=sortOptions.map(option=>`<button class="rod2-sort${String(option.value)===String(state.sortKey)?' active':''}" type="button" data-role="sort-chip" data-value="${esc(option.value)}">${esc(option.label||option.value)}</button>`).join('');
    sortGroups.forEach(node=>{ node.innerHTML=html; });
  }

  function renderMobileSort(){
    if(!mobileSortField) return;
    const visible=sortOptions.length>0;
    mobileSortField.hidden=!visible;
    if(!visible) return;
    const current=sortOptions.find(option=>String(option.value)===String(state.sortKey))||sortOptions[0];
    if(!state.sortKey && current) state.sortKey=current.value;
    if(mobileSortLabel) mobileSortLabel.textContent=current?.label||config.sortLabel||'排序';
    if(mobileSortArrow) mobileSortArrow.textContent=state.mobileSortOpen?'▴':'▾';
    if(mobileSortShell) mobileSortShell.classList.toggle('open',!!state.mobileSortOpen);
    if(mobileSortMenu) mobileSortMenu.innerHTML=sortOptions.map(option=>`<button class="rod2-mobilesort-option${String(option.value)===String(state.sortKey)?' active':''}" type="button" data-role="mobile-sort-option" data-value="${esc(option.value)}">${esc(option.label||option.value)}</button>`).join('');
  }

  function renderDesktopFilters(){
    if(config.disableFilters || !filterBlock || !filters) return;
    filterBlock.hidden=!filterOptions.length;
    if(!filterOptions.length){ filters.innerHTML=''; return; }
    const selected=new Set(state.selectedFilters);
    filters.innerHTML=`<button class="rod2-filter${selected.size===0?' active':''}" type="button" data-role="filter-reset">${esc(config.filterAllLabel||'全部')}</button>${filterOptions.map(option=>`<button class="rod2-filter${selected.has(String(option.value))?' active':''}" type="button" data-role="filter-chip" data-value="${esc(option.value)}">${option?.html!=null?option.html:esc(option?.label||option.value)}</button>`).join('')}`;
  }

  function renderMobileFilters(){
    if(config.disableFilters || !mobileFilterField) return;
    const visible=filterOptions.length>0;
    mobileFilterField.hidden=!visible;
    if(!visible) return;
    const selected=new Set(state.selectedFilters);
    if(config.mobileFilterMulti){
      if(mobileFilterLabel) mobileFilterLabel.textContent=config.filterLabel||'篩選';
      if(mobileFilterCount){ mobileFilterCount.hidden=selected.size===0; mobileFilterCount.textContent=String(selected.size||0); }
      if(mobileFilterArrow) mobileFilterArrow.textContent=state.mobileFilterOpen?'▴':'▾';
      if(mobileFilterShell) mobileFilterShell.classList.toggle('open',!!state.mobileFilterOpen);
      if(mobileFilterMenu) mobileFilterMenu.innerHTML=`<button class="rod2-mobilefilter-clear${selected.size===0?' active':''}" type="button" data-role="mobile-filter-clear">${esc(config.filterAllLabel||'全部')}</button>${filterOptions.map(option=>`<label class="rod2-mobilefilter-item"><input type="checkbox" data-role="mobile-filter-check" data-value="${esc(option.value)}"${selected.has(String(option.value))?' checked':''}><span>${option?.html!=null?option.html:esc(option?.label||option.value)}</span></label>`).join('')}`;
    }else if(filterSelect){
      const current=selected.size?Array.from(selected)[0]:'';
      filterSelect.innerHTML=`<option value="">${esc(config.filterAllLabel||'全部')}</option>${filterOptions.map(option=>`<option value="${esc(option.value)}"${String(option.value)===String(current)?' selected':''}>${esc(option.label||option.value)}</option>`).join('')}`;
    }
  }

  function syncChrome(){
    historyItems=typeof config.getHistoryItems==='function'?(config.getHistoryItems()||[]):[];
    favoriteItems=typeof config.getFavoriteItems==='function'?(config.getFavoriteItems()||[]):[];
    sortOptions=Array.isArray(config.sortOptions)?config.sortOptions.slice():[];
    filterOptions=config.disableFilters?[]:(typeof config.getFilterOptions==='function'?(config.getFilterOptions()||[]):[]);
    const valid=new Set(filterOptions.map(option=>String(option.value||'')));
    state.selectedFilters=state.selectedFilters.filter(value=>valid.has(String(value)));
    setInputsFromState();
    histories.forEach(node=>{ node.innerHTML=renderHistory(historyItems); });
    menus.forEach(node=>{ node.innerHTML=renderFavorites(favoriteItems); node.classList.toggle('open',!!state.favoriteOpen); });
    if(sheet) sheet.classList.toggle('open',!!state.sheetOpen);
    if(mobileSummary) mobileSummary.textContent=modeSummary();
    renderDesktopSorts();
    renderMobileSort();
    renderDesktopFilters();
    renderMobileFilters();
    if(mobileTools) mobileTools.dataset.single=(config.disableFilters || !filterOptions.length)?'1':'0';
  }

  async function search(rawStart,rawEnd,options={}){
    const nextStart=normalizeStationValue(rawStart!=null?rawStart:start?.value);
    const nextEnd=normalizeStationValue(rawEnd!=null?rawEnd:end?.value);
    state.start=nextStart;
    state.end=nextEnd;
    if(options.modeEnabled!=null) state.modeEnabled=!!options.modeEnabled;
    if(options.sortKey) state.sortKey=options.sortKey;
    setInputsFromState();
    notify();
    syncChrome();
    if(!state.start || !state.end){
      currentResult=null;
      results.innerHTML=`<div class="rod2-placeholder">${esc(config.placeholderText||'輸入起訖站後顯示查詢結果')}</div>`;
      return null;
    }
    const payload={...state,selectedFilters:state.selectedFilters.slice(),sortKey:state.sortKey};
    try{
      const result=await Promise.resolve(config.search(payload));
      currentResult=result||null;
      results.innerHTML=currentResult?resultHtml(currentResult):`<div class="rod2-empty">${esc(config.emptyMessage||'查無符合條件的班次')}</div>`;
      return currentResult;
    }catch(error){
      console.error('RailOriginDestinationQueryV2 search failed', error);
      currentResult=null;
      results.innerHTML=`<div class="rod2-empty">${esc(config.errorMessage||'查詢失敗，請再試一次')}</div>`;
      return null;
    }
  }

  async function rerunActiveSearch(){
    if(!state.start || !state.end){
      syncChrome();
      return null;
    }
    return search(state.start,state.end,{updateInput:true});
  }

  async function applyPreset(item){
    state.start=normalizeStationValue(item?.start||'');
    state.end=normalizeStationValue(item?.end||'');
    if(typeof item?.modeEnabled==='boolean') state.modeEnabled=!!item.modeEnabled;
    setInputsFromState();
    notify();
    syncChrome();
    if(toolbarAutoSearch || !manualSearchOnly) return rerunActiveSearch();
    return null;
  }

  async function applySortSelection(value){
    state.sortKey=String(value||sortOptions[0]?.value||'');
    state.mobileSortOpen=false;
    syncChrome();
    if(toolbarAutoSearch || !manualSearchOnly) return rerunActiveSearch();
    return null;
  }

  function queueFilterSearch(){
    clearTimeout(filterTimer);
    filterTimer=setTimeout(()=>{ if(toolbarAutoSearch || !manualSearchOnly) rerunActiveSearch(); },120);
  }

  function applyFilterSelection(values){
    state.selectedFilters=uniq(values);
    syncChrome();
    if(toolbarAutoSearch || !manualSearchOnly) queueFilterSearch();
  }

  function setState(nextState={}){
    if(nextState.start!=null) state.start=normalizeStationValue(nextState.start);
    if(nextState.end!=null) state.end=normalizeStationValue(nextState.end);
    if(typeof nextState.modeEnabled==='boolean') state.modeEnabled=!!nextState.modeEnabled;
    if(Array.isArray(nextState.selectedFilters)) state.selectedFilters=uniq(nextState.selectedFilters);
    if(nextState.sortKey!=null) state.sortKey=String(nextState.sortKey||'');
    if(typeof nextState.sheetOpen==='boolean') state.sheetOpen=!!nextState.sheetOpen;
    if(typeof nextState.mobileFilterOpen==='boolean') state.mobileFilterOpen=!!nextState.mobileFilterOpen;
    if(typeof nextState.mobileSortOpen==='boolean') state.mobileSortOpen=!!nextState.mobileSortOpen;
    if(typeof nextState.favoriteOpen==='boolean') state.favoriteOpen=!!nextState.favoriteOpen;
    notify();
    syncChrome();
    return {...state,selectedFilters:state.selectedFilters.slice()};
  }

  root.addEventListener('click', async(event)=>{
    const summaryTicket=event.target.closest('[data-role="summary-ticket"]');
    if(summaryTicket){
      event.preventDefault();
      event.stopPropagation();
      if(currentResult?.summaryRow && typeof config.onBook==='function') await config.onBook(currentResult.summaryRow);
      return;
    }
    const ticketButton=event.target.closest('[data-role="ticket"]');
    if(ticketButton){
      event.preventDefault();
      event.stopPropagation();
      const index=Number(ticketButton.dataset.index);
      const row=currentResult?.rows?.[index];
      if(row && typeof config.onBook==='function') await config.onBook(row);
      return;
    }
    const rowButton=event.target.closest('[data-role="row"]');
    if(rowButton){
      const index=Number(rowButton.dataset.index);
      const row=currentResult?.rows?.[index];
      if(row && typeof config.onOpenDetail==='function') await config.onOpenDetail(row);
      return;
    }
    const summaryButton=event.target.closest('[data-role="summary-detail"]');
    if(summaryButton){
      if(currentResult?.summaryRow && typeof config.onOpenDetail==='function') await config.onOpenDetail(currentResult.summaryRow);
      return;
    }
    const historyButton=event.target.closest('[data-role="history-item"]');
    if(historyButton){ await applyPreset(historyItems[Number(historyButton.dataset.index)]); return; }
    const favoriteButton=event.target.closest('[data-role="favorite-item"]');
    if(favoriteButton){ state.favoriteOpen=false; syncChrome(); await applyPreset(favoriteItems[Number(favoriteButton.dataset.index)]); return; }
    const favoriteToggle=event.target.closest('[data-role="favorite-toggle"]');
    if(favoriteToggle){ state.favoriteOpen=!state.favoriteOpen; syncChrome(); return; }
    const mobileOpenButton=event.target.closest('[data-role="mobile-open"]');
    if(mobileOpenButton){ state.sheetOpen=!state.sheetOpen; syncChrome(); return; }
    const searchButton=event.target.closest('[data-role="mobile-search"], #'+config.buttonId);
    if(searchButton){
      await search(start?.value,end?.value,{updateInput:true});
      const shouldCloseMenus=!!(state.mobileFilterOpen || state.mobileSortOpen);
      if(shouldCloseMenus){
        state.mobileFilterOpen=false;
        state.mobileSortOpen=false;
      }
      const shouldCollapseMobileSheet=!!(window.matchMedia && window.matchMedia('(max-width: 720px)').matches && state.sheetOpen);
      if(shouldCollapseMobileSheet || shouldCloseMenus){
        if(shouldCollapseMobileSheet) state.sheetOpen=false;
        syncChrome();
      }
      return;
    }
    const swapButton=event.target.closest('[data-role="swap"]');
    if(swapButton){ const a=start?.value||''; const b=end?.value||''; if(start) start.value=b; if(end) end.value=a; state.start=normalizeStationValue(b); state.end=normalizeStationValue(a); notify(); syncChrome(); return; }
    const sortChip=event.target.closest('[data-role="sort-chip"]');
    if(sortChip){ await applySortSelection(sortChip.dataset.value); return; }
    const mobileSortToggle=event.target.closest('[data-role="mobile-sort-toggle"]');
    if(mobileSortToggle){ state.mobileSortOpen=!state.mobileSortOpen; state.mobileFilterOpen=false; syncChrome(); return; }
    const mobileSortOption=event.target.closest('[data-role="mobile-sort-option"]');
    if(mobileSortOption){ await applySortSelection(mobileSortOption.dataset.value); return; }
    const filterReset=event.target.closest('[data-role="filter-reset"], [data-role="mobile-filter-clear"]');
    if(filterReset){ if(filterReset.dataset.role==='mobile-filter-clear') state.mobileFilterOpen=false; applyFilterSelection([]); return; }
    const filterChip=event.target.closest('[data-role="filter-chip"]');
    if(filterChip){
      const value=String(filterChip.dataset.value||'');
      const next=state.selectedFilters.includes(value)?state.selectedFilters.filter(item=>item!==value):uniq(state.selectedFilters.concat(value));
      applyFilterSelection(next);
      return;
    }
    const mobileFilterToggle=event.target.closest('[data-role="mobile-filter-toggle"]');
    if(mobileFilterToggle){ state.mobileFilterOpen=!state.mobileFilterOpen; state.mobileSortOpen=false; syncChrome(); return; }
  });

  root.addEventListener('change',(event)=>{
    const filterCheck=event.target.closest('[data-role="mobile-filter-check"]');
    if(filterCheck){
      const value=String(filterCheck.dataset.value||'');
      const next=filterCheck.checked?uniq(state.selectedFilters.concat(value)):state.selectedFilters.filter(item=>item!==value);
      applyFilterSelection(next);
      return;
    }
    const filterNative=event.target.closest('[data-role="filter-select"]');
    if(filterNative){
      applyFilterSelection(filterNative.value?[filterNative.value]:[]);
      return;
    }
    if(event.target===mode){
      state.modeEnabled=!!mode.checked;
      notify();
      syncChrome();
      if(!manualSearchOnly) rerunActiveSearch();
    }
  });

  [start,end].forEach((input)=>{
    if(!input) return;
    input.addEventListener('input',()=>{ state[input===start?'start':'end']=normalizeStationValue(input.value); notify(); syncChrome(); });
    input.addEventListener('change',()=>{ state[input===start?'start':'end']=normalizeStationValue(input.value); notify(); syncChrome(); });
    input.addEventListener('keydown',(event)=>{ if(event.key==='Enter'){ event.preventDefault(); state.mobileFilterOpen=false; state.mobileSortOpen=false; search(start?.value,end?.value,{updateInput:true}); } });
  });

  document.addEventListener('click',(event)=>{
    if(!root.contains(event.target)){
      if(state.favoriteOpen || state.mobileFilterOpen || state.mobileSortOpen){
        state.favoriteOpen=false;
        state.mobileFilterOpen=false;
        state.mobileSortOpen=false;
        syncChrome();
      }
    }
  });

  syncChrome();
  if(typeof config.onMounted==='function') config.onMounted();

  return {
    search:(rawStart,rawEnd,options={})=>search(rawStart,rawEnd,options),
    rerender:()=>rerunActiveSearch(),
    refreshChrome:()=>{ syncChrome(); return {...state,selectedFilters:state.selectedFilters.slice()}; },
    getState:()=>({...state,selectedFilters:state.selectedFilters.slice()}),
    setState,
    getResult:()=>currentResult
  };
}

window.RailOriginDestinationQueryV2={create};
})();


