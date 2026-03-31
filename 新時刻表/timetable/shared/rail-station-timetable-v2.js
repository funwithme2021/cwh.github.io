(function () {
  const STYLE_ID = "rail-station-timetable-v2-style";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.rsv2-shell{
  display:grid;
  gap:14px;
}
.rsv2-panel{
  position:relative;
  overflow:hidden;
  border:1px solid rgba(148,163,184,0.18);
  border-radius:24px;
  background:
    radial-gradient(circle at top right, rgba(37,99,235,0.10), transparent 38%),
    linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,252,0.96));
  box-shadow:0 14px 32px rgba(15,23,42,0.06);
}
.rsv2-panel::after{
  content:"";
  position:absolute;
  right:-54px;
  bottom:-64px;
  width:180px;
  height:180px;
  border-radius:999px;
  background:rgba(37,99,235,0.06);
  pointer-events:none;
}
.rsv2-panel > *{
  position:relative;
  z-index:1;
}
.rsv2-panel.rsv2-controls{
  overflow:visible;
  z-index:4;
}
.rsv2-controls{
  display:grid;
  grid-template-columns:minmax(0,1.2fr) auto auto;
  gap:12px;
  align-items:end;
  padding:18px;
}
.rsv2-field{
  display:grid;
  gap:8px;
  min-width:0;
}
.rsv2-field-station{
  grid-column:1;
  grid-row:1;
}
.rsv2-field-direction{
  grid-column:2;
  grid-row:1;
}
.rsv2-field-search{
  grid-column:3;
  grid-row:1;
  align-self:end;
}
.rsv2-filter-block{
  grid-column:1 / -1;
  grid-row:2;
  min-width:0;
}
.rsv2-label{
  color:var(--text-muted, #64748b);
  font-size:.78rem;
  font-weight:800;
  letter-spacing:.02em;
}
.rsv2-input-wrap{
  display:flex;
  align-items:center;
  min-height:50px;
  padding:0 14px;
  border:1px solid var(--border, #dbe2ea);
  border-radius:18px;
  background:rgba(148,163,184,0.08);
}
.rsv2-input-wrap:focus-within{
  border-color:var(--primary, #2563eb);
  box-shadow:0 0 0 3px rgba(37,99,235,0.08);
}
.rsv2-input{
  width:100%;
  border:none;
  outline:none;
  background:transparent;
  color:var(--text-main, #0f172a);
  font-size:1rem;
  font-weight:800;
}
.rsv2-input::placeholder{
  color:var(--text-light, #94a3b8);
  font-weight:700;
}
.rsv2-segment{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.rsv2-segment-btn,
.rsv2-filter-chip,
.rsv2-filter-toggle,
.rsv2-search-btn,
.rsv2-summary-button{
  appearance:none;
  border:none;
  cursor:pointer;
  transition:transform .16s ease, box-shadow .16s ease, background .16s ease, color .16s ease, opacity .16s ease;
}
.rsv2-segment-btn:hover,
.rsv2-filter-chip:hover,
.rsv2-filter-toggle:hover,
.rsv2-search-btn:hover,
.rsv2-summary-button:hover{
  transform:translateY(-1px);
}
.rsv2-segment-btn{
  min-height:50px;
  padding:0 16px;
  border:1px solid rgba(148,163,184,0.26);
  border-radius:16px;
  background:rgba(255,255,255,0.74);
  color:var(--text-main, #0f172a);
  font-size:.92rem;
  font-weight:800;
  white-space:nowrap;
}
.rsv2-segment-btn.is-active{
  background:linear-gradient(135deg, var(--primary, #2563eb), rgba(37,99,235,0.78));
  color:#fff;
  border-color:transparent;
  box-shadow:0 12px 24px rgba(37,99,235,0.16);
}
.rsv2-search-btn{
  min-height:50px;
  padding:0 18px;
  border-radius:16px;
  background:var(--primary, #2563eb);
  color:#fff;
  font-size:.94rem;
  font-weight:900;
  white-space:nowrap;
}
.rsv2-filter-desktop{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.rsv2-filter-chip{
  min-height:36px;
  padding:0 12px;
  border:1px solid rgba(148,163,184,0.18);
  border-radius:999px;
  background:rgba(255,255,255,0.78);
  color:var(--text-main, #0f172a);
  font-size:.84rem;
  font-weight:800;
  white-space:nowrap;
}
.rsv2-filter-chip.is-active{
  border-color:transparent;
  background:rgba(37,99,235,0.12);
  color:var(--primary, #2563eb);
  box-shadow:0 8px 20px rgba(37,99,235,0.10);
}
.rsv2-filter-mobile{
  display:none;
  position:relative;
}
.rsv2-filter-toggle{
  width:100%;
  min-height:46px;
  padding:0 14px;
  border:1px solid rgba(148,163,184,0.18);
  border-radius:16px;
  background:rgba(255,255,255,0.82);
  color:var(--text-main, #0f172a);
  font-size:.88rem;
  font-weight:800;
  text-align:left;
}
.rsv2-filter-toggle-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
.rsv2-filter-toggle-meta{
  display:flex;
  align-items:center;
  gap:8px;
  min-width:0;
}
.rsv2-filter-toggle-count{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:22px;
  height:22px;
  padding:0 7px;
  border-radius:999px;
  background:rgba(37,99,235,0.12);
  color:var(--primary, #2563eb);
  font-size:.78rem;
  font-weight:900;
}
.rsv2-filter-menu{
  position:absolute;
  top:calc(100% + 8px);
  left:0;
  right:0;
  display:none;
  gap:1px;
  padding:5px;
  max-height:min(52vh, 320px);
  overflow-y:auto;
  overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch;
  border:1px solid rgba(148,163,184,0.18);
  border-radius:18px;
  background:var(--bg-surface, #ffffff);
  box-shadow:0 20px 36px rgba(15,23,42,0.12);
  z-index:12;
}
.rsv2-filter-menu.is-open{
  display:grid;
}
.rsv2-filter-option{
  display:flex;
  align-items:center;
  gap:8px;
  padding:5px 8px;
  border-radius:12px;
  color:var(--text-main, #0f172a);
  font-size:.84rem;
  font-weight:700;
}
.rsv2-filter-option:hover{
  background:rgba(37,99,235,0.06);
}
.rsv2-filter-option input{
  width:16px;
  height:16px;
  accent-color:var(--primary, #2563eb);
  flex:0 0 auto;
}
.rsv2-placeholder,
.rsv2-empty{
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:120px;
  padding:20px;
  border:1px dashed var(--border, #dbe2ea);
  border-radius:22px;
  color:var(--text-muted, #64748b);
  font-size:.94rem;
  font-weight:800;
  text-align:center;
}
.rsv2-result{
  display:grid;
  gap:14px;
}
.rsv2-hero{
  display:grid;
  gap:12px;
  padding:18px;
}
.rsv2-hero-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
}
.rsv2-hero-main{
  min-width:0;
}
.rsv2-kicker{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:6px 10px;
  color:var(--text-muted, #64748b);
  font-size:.82rem;
  font-weight:800;
}
.rsv2-kicker strong{
  color:var(--primary, #2563eb);
  font-weight:900;
}
.rsv2-title{
  color:var(--text-main, #0f172a);
  font-size:1.48rem;
  font-weight:900;
  line-height:1.08;
  letter-spacing:.01em;
}
.rsv2-subtitle{
  margin-top:6px;
  color:var(--text-muted, #64748b);
  font-size:.88rem;
  font-weight:700;
  line-height:1.45;
}
.rsv2-count{
  flex:0 0 auto;
  display:grid;
  justify-items:end;
  gap:2px;
  min-width:88px;
  padding:10px 14px 9px;
  border:1px solid rgba(37,99,235,0.14);
  border-radius:18px;
  background:linear-gradient(135deg, rgba(37,99,235,0.12), rgba(255,255,255,0.72));
  box-shadow:0 10px 22px rgba(37,99,235,0.10);
}
.rsv2-count-value{
  color:var(--primary, #2563eb);
  font-size:1.24rem;
  font-weight:900;
  line-height:1;
  font-variant-numeric:tabular-nums;
}
.rsv2-count-label{
  color:var(--text-muted, #64748b);
  font-size:.74rem;
  font-weight:800;
  letter-spacing:.04em;
}
.rsv2-summary{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:8px 18px;
}
.rsv2-summary-item,
.rsv2-summary-button{
  min-width:0;
  display:flex;
  align-items:baseline;
  gap:8px;
  padding:0;
  background:none;
  color:var(--text-main, #0f172a);
  text-align:left;
}
.rsv2-summary-label{
  color:var(--text-muted, #64748b);
  font-size:.78rem;
  font-weight:800;
  white-space:nowrap;
}
.rsv2-summary-value{
  min-width:0;
  color:var(--text-main, #0f172a);
  font-size:.94rem;
  font-weight:900;
  line-height:1.35;
}
.rsv2-list-card{
  border:1px solid rgba(148,163,184,0.16);
  border-radius:22px;
  overflow:hidden;
  background:var(--bg-surface, #ffffff);
  box-shadow:0 8px 24px rgba(15,23,42,0.04);
}
.rsv2-mobile-head{
  display:none;
}
.rsv2-list-head{
  display:grid;
  grid-template-columns:minmax(104px,.74fr) minmax(172px,1.06fr) minmax(0,1.18fr) minmax(82px,.58fr);
  gap:14px;
  align-items:center;
  padding:12px 18px;
  background:rgba(248,250,252,0.94);
  border-bottom:1px solid rgba(148,163,184,0.14);
  color:var(--text-muted, #64748b);
  font-size:.8rem;
  font-weight:900;
  letter-spacing:.02em;
}
.rsv2-list-head > :last-child{
  text-align:center;
}
.rsv2-list-card.has-via .rsv2-list-head > :nth-child(4){
  text-align:center;
}
.rsv2-list-card.has-via .rsv2-list-head{
  grid-template-columns:minmax(104px,.72fr) minmax(172px,1.02fr) minmax(0,1.16fr) minmax(92px,.72fr) minmax(82px,.58fr);
}
.rsv2-list{
  display:grid;
}
.rsv2-row{
  width:100%;
  display:grid;
  grid-template-columns:minmax(104px,.74fr) minmax(172px,1.06fr) minmax(0,1.18fr) minmax(82px,.58fr);
  gap:14px;
  align-items:center;
  padding:16px 18px;
  border:none;
  border-top:1px solid rgba(148,163,184,0.12);
  background:transparent;
  text-align:left;
}
.rsv2-row:first-child{
  border-top:none;
}
.rsv2-row:hover{
  background:rgba(37,99,235,0.04);
}
.rsv2-row:focus-visible{
  outline:none;
  box-shadow:inset 0 0 0 2px rgba(37,99,235,0.24);
}
.rsv2-row.is-passed{
  background:rgba(148,163,184,0.05);
}
.rsv2-row.is-running{
  background:rgba(22,163,74,0.05);
}
.rsv2-list-card.has-via .rsv2-row{
  grid-template-columns:minmax(104px,.72fr) minmax(172px,1.02fr) minmax(0,1.16fr) minmax(92px,.72fr) minmax(82px,.58fr);
}
.rsv2-cell{
  min-width:0;
}
.rsv2-time-main{
  color:var(--text-main, #0f172a);
  font-size:1.06rem;
  font-weight:900;
  line-height:1.1;
  font-variant-numeric:tabular-nums;
}
.rsv2-time-sub{
  margin-top:5px;
  color:var(--text-muted, #64748b);
  font-size:.76rem;
  font-weight:700;
  line-height:1.4;
}
.rsv2-train-main,
.rsv2-route-main{
  color:var(--text-main, #0f172a);
  font-size:.96rem;
  font-weight:900;
  line-height:1.28;
  word-break:break-word;
}
.rsv2-train-main{
  display:flex;
  align-items:baseline;
  gap:8px;
  flex-wrap:wrap;
}
.rsv2-train-identity{
  display:inline-flex;
  align-items:baseline;
  gap:8px;
  flex-wrap:wrap;
  min-width:0;
}
.rsv2-mobile-train-primary,
.rsv2-mobile-train-secondary,
.rsv2-mobile-via,
.rsv2-mobile-via-content,
.rsv2-mobile-meta{
  display:none;
}
.rsv2-mobile-inline-route{
  display:none;
  color:var(--text-muted, #64748b);
  font-size:.8rem;
  font-weight:800;
  line-height:1.3;
  min-width:0;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.rsv2-train-no{
  display:inline-block;
  min-width:4ch;
  text-align:right;
  font-variant-numeric:tabular-nums;
}
.rsv2-train-type{
  display:inline-flex;
  align-items:center;
}
.rsv2-brand-thsr{
  color:#ea580c;
}
.rsv2-train-sub,
.rsv2-route-sub{
  margin-top:5px;
  color:var(--text-muted, #64748b);
  font-size:.78rem;
  font-weight:700;
  line-height:1.4;
}
.rsv2-via{
  align-self:center;
  color:var(--text-muted, #64748b);
  font-size:.8rem;
  font-weight:800;
  line-height:1.35;
  text-align:center;
}
.rsv2-status{
  justify-self:stretch;
  align-self:center;
  color:var(--text-main, #0f172a);
  font-size:.84rem;
  font-weight:900;
  line-height:1.35;
  text-align:center;
}
.rsv2-tone-success{ color:#15803d; }
.rsv2-tone-warning{ color:#c2410c; }
.rsv2-tone-danger{ color:#b91c1c; }
.rsv2-tone-muted{ color:#64748b; }
.rsv2-tone-neutral{ color:var(--text-main, #0f172a); }
body.dark-mode .rsv2-panel{
  background:
    radial-gradient(circle at top right, rgba(96,165,250,0.12), transparent 40%),
    linear-gradient(180deg, rgba(15,23,42,0.90), rgba(15,23,42,0.84));
}
body.dark-mode .rsv2-input-wrap{
  background:rgba(15,23,42,0.28);
}
body.dark-mode .rsv2-segment-btn,
body.dark-mode .rsv2-filter-chip,
body.dark-mode .rsv2-filter-toggle{
  background:rgba(15,23,42,0.42);
}
body.dark-mode .rsv2-segment-btn.is-active{
  background:linear-gradient(135deg, var(--primary, #2563eb), rgba(96,165,250,0.82));
}
body.dark-mode .rsv2-filter-menu{
  background:rgba(15,23,42,0.96);
}
body.dark-mode .rsv2-list-card{
  background:rgba(15,23,42,0.86);
}
body.dark-mode .rsv2-list-head{
  background:rgba(15,23,42,0.74);
}
body.dark-mode .rsv2-mobile-head{
  background:rgba(15,23,42,0.74);
  border-bottom-color:rgba(148,163,184,0.12);
  color:rgba(226,232,240,0.82);
}
body.dark-mode .rsv2-row.is-passed{
  background:rgba(30,41,59,0.72);
}
body.dark-mode .rsv2-row.is-running{
  background:rgba(21,128,61,0.18);
}
@media (max-width: 860px){
  .rsv2-hero-head{
    align-items:center;
  }
  .rsv2-summary{
    gap:8px 14px;
  }
}
@media (max-width: 720px){
  .rsv2-controls,
  .rsv2-hero{
    padding:16px;
  }
  .rsv2-controls{
    grid-template-columns:minmax(0,1fr) auto;
  }
  .rsv2-filter-block{
    grid-column:1;
    grid-row:2;
  }
  .rsv2-field-search{
    grid-column:2;
    grid-row:2;
    width:auto;
    min-width:88px;
  }
  .rsv2-shell:not(.rsv2-has-filters) .rsv2-field-search{
    grid-column:1 / -1;
  }
  .rsv2-search-btn{
    width:100%;
    min-height:46px;
    padding:0 16px;
  }
  .rsv2-filter-desktop{
    display:none;
  }
  .rsv2-filter-mobile{
    display:block;
  }
  .rsv2-list-head{
    display:none;
  }
  .rsv2-row,
  .rsv2-mobile-head{
    box-sizing:border-box;
    width:100%;
    --rsv2-mobile-gap:clamp(6px, 2.2vw, 14px);
    --rsv2-mobile-time-width:clamp(44px, 13vw, 56px);
    --rsv2-mobile-train-width:min(36vw, 124px);
    --rsv2-mobile-via-width:clamp(28px, 8vw, 38px);
    --rsv2-mobile-meta-width:min(30vw, 104px);
  }
  .rsv2-mobile-head{
    display:grid;
    grid-template-columns:var(--rsv2-mobile-time-width) var(--rsv2-mobile-train-width) var(--rsv2-mobile-meta-width);
    justify-content:space-between;
    column-gap:var(--rsv2-mobile-gap);
    align-items:center;
    padding:10px clamp(4px, 1.6vw, 8px) 8px;
    background:rgba(248,250,252,0.94);
    border-bottom:1px solid rgba(148,163,184,0.14);
    color:var(--text-muted, #64748b);
    font-size:.66rem;
    font-weight:900;
    letter-spacing:.03em;
  }
  .rsv2-mobile-head-cell{
    min-width:0;
  }
  .rsv2-mobile-head.has-via{
    grid-template-columns:var(--rsv2-mobile-time-width) var(--rsv2-mobile-train-width) var(--rsv2-mobile-via-width) var(--rsv2-mobile-meta-width);
  }
  .rsv2-mobile-head-time{
    grid-column:1;
    text-align:left;
    box-sizing:border-box;
    padding-left:clamp(2px, 0.8vw, 6px);
  }
  .rsv2-mobile-head-train{
    grid-column:2;
    text-align:left;
  }
  .rsv2-mobile-head-via{
    grid-column:3;
    text-align:center;
    white-space:nowrap;
    word-break:keep-all;
  }
  .rsv2-mobile-head-meta{
    grid-column:3;
    text-align:right;
  }
  .rsv2-mobile-head.has-via .rsv2-mobile-head-meta{
    grid-column:4;
  }
  .rsv2-row{
    display:grid;
    grid-template-columns:var(--rsv2-mobile-time-width) var(--rsv2-mobile-train-width) var(--rsv2-mobile-meta-width);
    justify-content:space-between;
    column-gap:var(--rsv2-mobile-gap);
    align-items:stretch;
    padding:10px clamp(4px, 1.6vw, 8px) 11px;
  }
  .rsv2-time{
    grid-column:1;
    width:100%;
    align-self:stretch;
    display:flex;
    flex-direction:column;
    align-items:flex-start;
    justify-content:center;
    gap:2px;
    text-align:left;
    box-sizing:border-box;
    padding-left:clamp(2px, 0.8vw, 6px);
  }
  .rsv2-train{
    grid-column:2;
    display:flex;
    flex-direction:column;
    align-items:start;
    justify-content:center;
    gap:2px;
    width:100%;
    max-width:100%;
    min-width:0;
  }
  .rsv2-route,
  .rsv2-status{
    display:none;
  }
  .rsv2-row.has-mobile-via,
  .rsv2-mobile-head.has-via{
    --rsv2-mobile-train-width:min(35vw, 122px);
    --rsv2-mobile-via-width:clamp(22px, 6.4vw, 30px);
    --rsv2-mobile-meta-width:min(26vw, 92px);
  }
  .rsv2-row.has-mobile-via,
  .rsv2-list-card.has-via .rsv2-row.has-mobile-via{
    grid-template-columns:var(--rsv2-mobile-time-width) var(--rsv2-mobile-train-width) var(--rsv2-mobile-via-width) var(--rsv2-mobile-meta-width);
  }
  .rsv2-mobile-via{
    display:flex;
    grid-column:3;
    width:100%;
    align-self:stretch;
    flex-direction:column;
    justify-content:flex-start;
    min-width:0;
    color:var(--text-muted, #64748b);
    font-size:.74rem;
    font-weight:800;
    line-height:1.25;
    text-align:center;
    white-space:nowrap;
  }
  .rsv2-mobile-via-content{
    display:flex;
    flex:1 1 auto;
    width:100%;
    min-height:0;
    align-items:center;
    justify-content:center;
  }
  .rsv2-mobile-via span{
    display:block;
    text-align:center;
  }
  .rsv2-mobile-via.is-single,
  .rsv2-mobile-via.is-multi{
    align-items:center;
  }
  .rsv2-mobile-via.is-multi .rsv2-mobile-via-content{
    flex-direction:column;
    align-items:center;
    justify-content:flex-start;
    gap:2px;
    padding-top:1px;
  }
  .rsv2-mobile-meta{
    display:flex;
    grid-column:3;
    min-width:0;
    width:100%;
    max-width:100%;
    align-self:start;
    text-align:right;
    flex-direction:column;
    align-items:flex-end;
    justify-content:flex-start;
  }
  .rsv2-row.has-mobile-via .rsv2-mobile-meta{
    grid-column:4;
  }
  .rsv2-mobile-meta-status{
    white-space:nowrap;
    font-size:.8rem;
    font-weight:900;
    line-height:1.25;
    text-align:right;
  }
  .rsv2-mobile-meta-route{
    margin-top:2px;
    max-width:100%;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .rsv2-time-main{
    display:flex;
    flex-direction:column;
    align-items:flex-start;
    justify-content:flex-start;
    gap:2px;
    font-size:.92rem;
  }
  .rsv2-time-main span{
    display:block;
    margin:0 !important;
    text-align:left;
  }
  .rsv2-train-main{
    display:none;
  }
  .rsv2-train-sub{
    display:none;
  }
  .rsv2-mobile-train-primary{
    display:block;
    grid-column:1;
    grid-row:1;
    color:var(--text-main, #0f172a);
    font-size:.9rem;
    font-weight:900;
    line-height:1.2;
    min-width:0;
    max-width:100%;
    white-space:normal;
    word-break:break-word;
    text-align:left;
  }
  .rsv2-mobile-train-secondary{
    display:flex;
    align-items:center;
    flex-wrap:wrap;
    gap:clamp(1px, .5vw, 3px);
    grid-column:1;
    grid-row:2;
    min-width:0;
    max-width:100%;
    color:var(--text-muted, #64748b);
    font-size:.8rem;
    font-weight:800;
    line-height:1.25;
    overflow-wrap:anywhere;
    text-align:left;
  }
  .rsv2-mobile-inline-route{
    display:none;
  }
  .rsv2-route-main{
    font-size:.78rem;
    line-height:1.25;
    white-space:nowrap;
    overflow:visible;
    text-overflow:clip;
    text-align:right;
  }
  .rsv2-route-sub{
    display:none;
  }
  .rsv2-via{
    display:none;
  }
  .rsv2-hero-head{
    align-items:flex-start;
  }
  .rsv2-count{
    min-width:74px;
    padding:8px 10px 7px;
    border-radius:16px;
  }
}
@media (max-width: 520px){
  .rsv2-title{
    font-size:1.28rem;
  }
  .rsv2-controls{
    gap:10px;
  }
  .rsv2-segment-btn{
    min-height:46px;
    padding:0 14px;
  }
  .rsv2-summary{
    gap:6px 12px;
  }
  .rsv2-summary-item.is-wide-mobile,
  .rsv2-summary-button.is-wide-mobile{
    width:100%;
  }
  .rsv2-train-main{
    gap:5px;
  }
  .rsv2-row,
  .rsv2-mobile-head{
    --rsv2-mobile-gap:clamp(4px, 1.6vw, 8px);
    --rsv2-mobile-time-width:clamp(42px, 12.5vw, 52px);
    --rsv2-mobile-train-width:min(38vw, 112px);
    --rsv2-mobile-via-width:clamp(24px, 7.4vw, 34px);
    --rsv2-mobile-meta-width:min(28vw, 92px);
  }
  .rsv2-mobile-head{
    font-size:.62rem;
  }
  .rsv2-row.has-mobile-via,
  .rsv2-mobile-head.has-via{
    --rsv2-mobile-train-width:min(35vw, 104px);
    --rsv2-mobile-via-width:clamp(20px, 5.8vw, 28px);
    --rsv2-mobile-meta-width:min(24vw, 78px);
  }
  .rsv2-mobile-meta-status{
    font-size:.76rem;
  }
  .rsv2-train{
    column-gap:0;
  }
  .rsv2-route-main{
    font-size:.76rem;
  }
  .rsv2-mobile-via{
    font-size:.72rem;
  }
  .rsv2-train-no{
    min-width:3.6ch;
  }
}
`;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeTone(value) {
    return ["success", "warning", "danger", "muted", "neutral"].includes(value)
      ? value
      : "neutral";
  }

  function renderContent(html, text, fallback) {
    if (html != null && html !== "") return html;
    if (text != null && text !== "") return escapeHtml(text);
    return fallback == null ? "" : escapeHtml(fallback);
  }

  function renderMobileViaContent(html, text) {
    if (html != null && html !== "") {
      return {
        content: html,
        multiLine: false
      };
    }

    const parts = String(text || "")
      .split(/[／/]/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (!parts.length) {
      return {
        content: "",
        multiLine: false
      };
    }

    return {
      content: parts.map((part) => `<span>${escapeHtml(part)}</span>`).join(""),
      multiLine: parts.length > 1
    };
  }

  function renderStats(items) {
    return (Array.isArray(items) ? items : [])
      .filter((item) => item && (item.value || item.html))
      .map((item, index) => {
        const classes = [item.openDetail ? "rsv2-summary-button" : "rsv2-summary-item"];
        if (item.wideMobile) classes.push("is-wide-mobile");
        const tag = item.openDetail ? "button" : "div";
        const attrs = item.openDetail
          ? `type="button" data-role="stat-action" data-index="${index}"`
          : "";
        return `
          <${tag} class="${classes.join(" ")}" ${attrs}>
            <span class="rsv2-summary-label">${escapeHtml(item.label || "")}</span>
            <span class="rsv2-summary-value rsv2-tone-${escapeHtml(normalizeTone(item.tone))}">${item.html != null ? item.html : escapeHtml(item.value || "")}</span>
          </${tag}>
        `;
      })
      .join("");
  }

  function renderRows(rows, options) {
    const opts = options || {};
    const hasViaColumn = !!opts.hasViaColumn;
    const hasMobileViaSlot = opts.hasMobileViaSlot == null ? hasViaColumn : !!opts.hasMobileViaSlot;
    return (Array.isArray(rows) ? rows : [])
      .map((row, index) => {
        const mobileVia = hasMobileViaSlot ? renderMobileViaContent(row.viaHtml, row.viaText) : null;
        const classes = ["rsv2-row"];
        if (row.isPassed) classes.push("is-passed");
        if (row.isRunning) classes.push("is-running");
        if (hasMobileViaSlot) classes.push("has-mobile-via");
        const inlineRouteHtml = row.routeCompactHtml != null ? row.routeCompactHtml : row.routeHtml;
        const inlineRouteText = row.routeCompactText != null ? row.routeCompactText : row.routeText;
        const desktopTrainContent = renderContent(row.trainHtml, row.trainText, "--");
        const mobileTrainPrimary = (row.mobileTrainPrimaryHtml != null || row.mobileTrainPrimaryText != null)
          ? renderContent(row.mobileTrainPrimaryHtml, row.mobileTrainPrimaryText, "--")
          : desktopTrainContent;
        const mobileTrainSecondary = (row.mobileTrainSecondaryHtml != null || row.mobileTrainSecondaryText != null)
          ? renderContent(row.mobileTrainSecondaryHtml, row.mobileTrainSecondaryText, "")
          : "";
        const mobileRoute = (inlineRouteHtml != null || inlineRouteText)
          ? renderContent(inlineRouteHtml, inlineRouteText, "")
          : "";
        const mobileStatus = renderContent(row.statusHtml, row.statusText, "");
        return `
          <button class="${classes.join(" ")}" type="button" data-role="result-row" data-index="${index}">
            <div class="rsv2-cell rsv2-time">
              <div class="rsv2-time-main">${renderContent(row.timeHtml, row.timeText, "--")}</div>
              ${row.timeSubHtml != null || row.timeSub ? `<div class="rsv2-time-sub">${renderContent(row.timeSubHtml, row.timeSub, "")}</div>` : ""}
            </div>
            <div class="rsv2-cell rsv2-train">
              <div class="rsv2-train-main"><span class="rsv2-train-identity">${desktopTrainContent}</span></div>
              ${row.trainSubHtml != null || row.trainSub ? `<div class="rsv2-train-sub">${renderContent(row.trainSubHtml, row.trainSub, "")}</div>` : ""}
              <div class="rsv2-mobile-train-primary">${mobileTrainPrimary}</div>
              ${mobileTrainSecondary ? `<div class="rsv2-mobile-train-secondary">${mobileTrainSecondary}</div>` : ""}
            </div>
            ${hasMobileViaSlot ? `<div class="rsv2-mobile-via${mobileVia?.multiLine ? " is-multi" : " is-single"}"><div class="rsv2-mobile-via-content">${mobileVia?.content || ""}</div></div>` : ""}
            <div class="rsv2-cell rsv2-route">
              <div class="rsv2-route-main">${renderContent(row.routeHtml, row.routeText, "--")}</div>
              ${row.routeSubHtml != null || row.routeSub ? `<div class="rsv2-route-sub">${renderContent(row.routeSubHtml, row.routeSub, "")}</div>` : ""}
            </div>
            ${hasViaColumn ? `<div class="rsv2-cell rsv2-via">${renderContent(row.viaHtml, row.viaText, "")}</div>` : ""}
            <div class="rsv2-status rsv2-tone-${escapeHtml(normalizeTone(row.statusTone))}">${renderContent(row.statusHtml, row.statusText, "")}</div>
            <div class="rsv2-mobile-meta">
              <div class="rsv2-mobile-meta-status rsv2-tone-${escapeHtml(normalizeTone(row.statusTone))}">${mobileStatus}</div>
              ${mobileRoute ? `<div class="rsv2-mobile-meta-route rsv2-route-main">${mobileRoute}</div>` : ""}
            </div>
          </button>
        `;
      })
      .join("");
  }

  function renderMobileHead(headings, mobileHeadings, hasViaSlot) {
    const head = headings || {};
    const mobile = mobileHeadings || {};
    return `
      <div class="rsv2-mobile-head${hasViaSlot ? " has-via" : ""}">
        <div class="rsv2-mobile-head-cell rsv2-mobile-head-time">${escapeHtml(mobile.time || head.time || "出發時間")}</div>
        <div class="rsv2-mobile-head-cell rsv2-mobile-head-train">${escapeHtml(mobile.train || head.train || "列車")}</div>
        ${hasViaSlot ? `<div class="rsv2-mobile-head-cell rsv2-mobile-head-via">${escapeHtml(mobile.via || head.via || "經由")}</div>` : ""}
        <div class="rsv2-mobile-head-cell rsv2-mobile-head-meta">${escapeHtml(mobile.meta || "狀態/區間")}</div>
      </div>
    `;
  }

  function renderDesktopFilterChips(options, selectedValues) {
    const selected = new Set(Array.isArray(selectedValues) ? selectedValues : []);
    const chips = (Array.isArray(options) ? options : [])
      .map((option) => {
        const value = String(option?.value ?? "");
        const active = selected.has(value);
        return `
          <button class="rsv2-filter-chip${active ? " is-active" : ""}" type="button" data-role="filter-chip" data-value="${escapeHtml(value)}">
            ${option?.html != null ? option.html : escapeHtml(option?.label || value)}
          </button>
        `;
      })
      .join("");

    return `
      <button class="rsv2-filter-chip${selected.size === 0 ? " is-active" : ""}" type="button" data-role="filter-reset">\u5168\u90e8</button>
      ${chips}
    `;
  }

  function renderMobileFilterMenu(options, selectedValues) {
    const selected = new Set(Array.isArray(selectedValues) ? selectedValues : []);
    const items = (Array.isArray(options) ? options : [])
      .map((option) => {
        const value = String(option?.value ?? "");
        const checked = selected.has(value) ? " checked" : "";
        return `
          <label class="rsv2-filter-option">
            <input type="checkbox" data-role="filter-check" data-value="${escapeHtml(value)}"${checked}>
            <span>${option?.html != null ? option.html : escapeHtml(option?.label || value)}</span>
          </label>
        `;
      })
      .join("");

    return `
      <label class="rsv2-filter-option">
        <input type="checkbox" data-role="filter-check-all"${selected.size === 0 ? " checked" : ""}>
        <span>\u5168\u90e8</span>
      </label>
      ${items}
    `;
  }

  function renderResult(result) {
    const count = Array.isArray(result.rows) ? result.rows.length : 0;
    const countValue = result.countValue ?? count;
    const countLabel = result.countLabel || "\u7e3d\u73ed\u6b21";
    const hasViaColumn = !!(result.headings?.via);
    const hasMobileViaSlot = !!(result.mobileHeadings?.via || result.headings?.via);
    return `
      <div class="rsv2-result">
        <section class="rsv2-panel rsv2-hero">
          <div class="rsv2-hero-head">
            <div class="rsv2-hero-main">
            <div class="rsv2-kicker">${result.kickerHtml != null ? result.kickerHtml : escapeHtml(result.kickerText || "")}</div>
            <div class="rsv2-title">${result.titleHtml != null ? result.titleHtml : escapeHtml(result.title || "")}</div>
            ${result.subtitleHtml != null || result.subtitle ? `<div class="rsv2-subtitle">${result.subtitleHtml != null ? result.subtitleHtml : escapeHtml(result.subtitle || "")}</div>` : ""}
            </div>
            <div class="rsv2-count">
              <span class="rsv2-count-value">${escapeHtml(countValue)}</span>
              <span class="rsv2-count-label">${escapeHtml(countLabel)}</span>
            </div>
          </div>
          ${Array.isArray(result.stats) && result.stats.length ? `<div class="rsv2-summary">${renderStats(result.stats)}</div>` : ""}
        </section>
        ${
          count
            ? `
              <section class="rsv2-list-card${hasViaColumn ? " has-via" : ""}">
                <div class="rsv2-list-head">
                  <div>${escapeHtml(result.headings?.time || "\u51fa\u767c\u6642\u9593")}</div>
                  <div>${escapeHtml(result.headings?.train || "\u5217\u8eca")}</div>
                  <div>${escapeHtml(result.headings?.route || "\u884c\u99db\u5340\u9593")}</div>
                  ${hasViaColumn ? `<div>${escapeHtml(result.headings?.via || "\u7d93\u7531")}</div>` : ""}
                  <div>${escapeHtml(result.headings?.status || "\u72c0\u614b")}</div>
                </div>
                ${renderMobileHead(result.headings, result.mobileHeadings, hasMobileViaSlot)}
                <div class="rsv2-list">${renderRows(result.rows, { hasViaColumn, hasMobileViaSlot, headings: result.headings, mobileHeadings: result.mobileHeadings })}</div>
              </section>
            `
            : `<div class="rsv2-empty">${escapeHtml(result.emptyMessage || "")}</div>`
        }
      </div>
    `;
  }

  function create(config) {
    ensureStyles();
    const root = document.getElementById(config.rootId);
    if (!root) return null;

    const state = {
      station: "",
      direction: config.defaultDirection || config.directionOptions?.[0]?.value || "",
      selectedFilters: [],
      filterMenuOpen: false,
    };
    let currentResult = null;
    let filterOptions = [];

    root.innerHTML = `
      <div class="rsv2-shell">
        <section class="rsv2-panel rsv2-controls">
          <label class="rsv2-field rsv2-field-station" for="${escapeHtml(config.inputId)}">
            <span class="rsv2-label">${escapeHtml(config.inputLabel || "\u8eca\u7ad9")}</span>
            <span class="rsv2-input-wrap">
              <input id="${escapeHtml(config.inputId)}" class="rsv2-input" type="text" list="${escapeHtml(config.datalistId || "")}" placeholder="${escapeHtml(config.placeholder || "")}">
            </span>
          </label>
          <div class="rsv2-field rsv2-field-direction">
            <span class="rsv2-label">${escapeHtml(config.directionLabel || "\u65b9\u5411")}</span>
            <div class="rsv2-segment" data-role="direction-group"></div>
          </div>
          <div class="rsv2-filter-block" data-role="filters-block" hidden>
            <div class="rsv2-filter-desktop" data-role="filters-desktop"></div>
            <div class="rsv2-filter-mobile">
              <button class="rsv2-filter-toggle" type="button" data-role="filter-toggle">
                <span class="rsv2-filter-toggle-row">
                  <span class="rsv2-filter-toggle-meta">
                    <span>${escapeHtml(config.mobileFilterLabel || "\u8eca\u7a2e\u7be9\u9078")}</span>
                    <span class="rsv2-filter-toggle-count" data-role="filter-count" hidden>0</span>
                  </span>
                  <span data-role="filter-arrow">v</span>
                </span>
              </button>
              <div class="rsv2-filter-menu" data-role="filters-mobile-menu"></div>
            </div>
          </div>
          <button id="${escapeHtml(config.buttonId)}" class="rsv2-search-btn rsv2-field-search" type="button">${escapeHtml(config.buttonText || "\u67e5\u8a62")}</button>
        </section>
        <div class="rsv2-results" data-role="results">
          <div class="rsv2-placeholder">${escapeHtml(config.placeholderText || "")}</div>
        </div>
      </div>
    `;

    const input = document.getElementById(config.inputId);
    const button = document.getElementById(config.buttonId);
    const shell = root.querySelector(".rsv2-shell");
    const directionGroup = root.querySelector('[data-role="direction-group"]');
    const filtersBlock = root.querySelector('[data-role="filters-block"]');
    const filtersDesktop = root.querySelector('[data-role="filters-desktop"]');
    const filtersToggle = root.querySelector('[data-role="filter-toggle"]');
    const filtersMobileMenu = root.querySelector('[data-role="filters-mobile-menu"]');
    const filtersCount = root.querySelector('[data-role="filter-count"]');
    const filtersArrow = root.querySelector('[data-role="filter-arrow"]');
    const results = root.querySelector('[data-role="results"]');

    function updateFilterMenuVisibility() {
      const open = state.filterMenuOpen && filterOptions.length > 0;
      filtersMobileMenu.classList.toggle("is-open", open);
      if (filtersArrow) filtersArrow.textContent = open ? "^" : "v";
    }

    function renderDirections() {
      const options = Array.isArray(config.directionOptions) ? config.directionOptions : [];
      directionGroup.innerHTML = options
        .map((option) => {
          const active = option?.value === state.direction;
          return `<button class="rsv2-segment-btn${active ? " is-active" : ""}" type="button" data-role="direction" data-value="${escapeHtml(option?.value || "")}">${escapeHtml(option?.label || option?.value || "")}</button>`;
        })
        .join("");
    }

    function syncFilterOptions() {
      filterOptions = typeof config.getFilterOptions === "function"
        ? (config.getFilterOptions() || [])
        : [];

      const validValues = new Set(filterOptions.map((option) => String(option?.value ?? "")));
      state.selectedFilters = state.selectedFilters.filter((value) => validValues.has(String(value)));
      if (!filterOptions.length) state.filterMenuOpen = false;

      shell?.classList.toggle("rsv2-has-filters", filterOptions.length > 0);
      filtersBlock.hidden = !filterOptions.length;
      filtersDesktop.innerHTML = filterOptions.length ? renderDesktopFilterChips(filterOptions, state.selectedFilters) : "";
      filtersMobileMenu.innerHTML = filterOptions.length ? renderMobileFilterMenu(filterOptions, state.selectedFilters) : "";
      if (filtersCount) {
        filtersCount.hidden = state.selectedFilters.length === 0;
        filtersCount.textContent = String(state.selectedFilters.length || 0);
      }
      updateFilterMenuVisibility();
    }

    function applyFilterSelection(nextValues) {
      state.selectedFilters = Array.isArray(nextValues) ? nextValues.slice() : [];
      syncFilterOptions();
      bindFilters();
      if (state.station) search(state.station, { updateInput: false });
    }

    function bindFilters() {
      filtersDesktop.querySelectorAll('[data-role="filter-chip"]').forEach((buttonEl) => {
        buttonEl.addEventListener("click", () => {
          const value = String(buttonEl.dataset.value || "");
          if (!value) return;
          const nextValues = state.selectedFilters.includes(value)
            ? state.selectedFilters.filter((item) => item !== value)
            : state.selectedFilters.concat(value).filter((item, index, list) => list.indexOf(item) === index);
          applyFilterSelection(nextValues);
        });
      });

      const resetDesktop = filtersDesktop.querySelector('[data-role="filter-reset"]');
      if (resetDesktop) {
        resetDesktop.addEventListener("click", () => applyFilterSelection([]));
      }

      const resetMobile = filtersMobileMenu.querySelector('[data-role="filter-check-all"]');
      if (resetMobile) {
        resetMobile.addEventListener("change", (event) => {
          if (!event.target.checked) {
            event.target.checked = true;
            return;
          }
          applyFilterSelection([]);
        });
      }

      filtersMobileMenu.querySelectorAll('[data-role="filter-check"]').forEach((inputEl) => {
        inputEl.addEventListener("change", () => {
          const value = String(inputEl.dataset.value || "");
          if (!value) return;
          const nextValues = inputEl.checked
            ? state.selectedFilters.concat(value).filter((item, index, list) => list.indexOf(item) === index)
            : state.selectedFilters.filter((item) => item !== value);
          applyFilterSelection(nextValues);
        });
      });
    }

    function bindDirections() {
      directionGroup.querySelectorAll('[data-role="direction"]').forEach((buttonEl) => {
        buttonEl.addEventListener("click", () => {
          const nextDirection = buttonEl.dataset.value || "";
          if (!nextDirection || nextDirection === state.direction) return;
          state.direction = nextDirection;
          renderDirections();
          bindDirections();
          if (state.station) search(state.station, { updateInput: false });
        });
      });
    }

    function bindRows(result) {
      root.querySelectorAll('[data-role="result-row"]').forEach((buttonEl) => {
        buttonEl.addEventListener("click", () => {
          const index = Number(buttonEl.dataset.index);
          const row = Array.isArray(result.rows) ? result.rows[index] : null;
          if (!row) return;
          if (typeof config.onOpenDetail === "function") config.onOpenDetail(row, result, { ...state });
        });
      });
    }

    function bindStatActions(result) {
      root.querySelectorAll('[data-role="stat-action"]').forEach((buttonEl) => {
        buttonEl.addEventListener("click", () => {
          const index = Number(buttonEl.dataset.index);
          const item = Array.isArray(result.stats) ? result.stats[index] : null;
          if (!item?.openDetail || typeof config.onOpenDetail !== "function") return;
          config.onOpenDetail(item.openDetail, result, { ...state });
        });
      });
    }

    async function search(rawStation, options) {
      const opts = options || {};
      const value = rawStation == null ? (input?.value || "") : rawStation;
      const normalized = typeof config.normalizeStation === "function"
        ? config.normalizeStation(value)
        : String(value || "").trim();

      state.filterMenuOpen = false;
      updateFilterMenuVisibility();

      if (input && opts.updateInput !== false) input.value = normalized;
      state.station = normalized;

      if (!normalized) {
        currentResult = null;
        results.innerHTML = `<div class="rsv2-placeholder">${escapeHtml(config.placeholderText || "")}</div>`;
        if (typeof config.onStateChange === "function") config.onStateChange(null);
        return null;
      }

      let queried = null;
      try {
        queried = await Promise.resolve(
          typeof config.query === "function"
            ? config.query({
                station: normalized,
                direction: state.direction,
                selectedFilters: state.selectedFilters.slice(),
                currentResult,
              })
            : null,
        );
      } catch (error) {
        currentResult = null;
        results.innerHTML = `<div class="rsv2-empty">${escapeHtml(error?.message || config.errorText || "")}</div>`;
        if (typeof config.onStateChange === "function") {
          config.onStateChange({
            station: normalized,
            direction: state.direction,
            selectedFilters: state.selectedFilters.slice(),
            found: false,
            error: true,
          });
        }
        return null;
      }

      currentResult = {
        ...queried,
        station: normalized,
        rows: Array.isArray(queried?.rows) ? queried.rows : [],
      };
      results.innerHTML = renderResult(currentResult);
      bindRows(currentResult);
      bindStatActions(currentResult);
      if (typeof config.onStateChange === "function") {
        config.onStateChange({
          station: normalized,
          direction: state.direction,
          selectedFilters: state.selectedFilters.slice(),
          found: true,
          count: currentResult.rows.length,
        });
      }
      return currentResult;
    }

    renderDirections();
    syncFilterOptions();
    bindDirections();
    bindFilters();

    if (filtersToggle) {
      filtersToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        state.filterMenuOpen = !state.filterMenuOpen;
        updateFilterMenuVisibility();
      });
    }

    filtersMobileMenu.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) {
        state.filterMenuOpen = false;
        updateFilterMenuVisibility();
      }
    });

    if (button) button.addEventListener("click", () => search());

    if (input) {
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        search();
      });
    }

    if (typeof config.onMounted === "function") {
      config.onMounted({ input, button, root, state });
    }

    return {
      search,
      rerender() {
        return search(state.station || input?.value || "", { updateInput: true });
      },
      refreshChrome() {
        syncFilterOptions();
        bindFilters();
        renderDirections();
        bindDirections();
        return currentResult;
      },
      getInput() {
        return input;
      },
      getState() {
        return { ...state, selectedFilters: state.selectedFilters.slice() };
      },
      setState(nextState) {
        if (!nextState || typeof nextState !== "object") return;
        if (nextState.direction) state.direction = nextState.direction;
        if (Array.isArray(nextState.selectedFilters)) state.selectedFilters = nextState.selectedFilters.slice();
        if (typeof nextState.station === "string") state.station = nextState.station;
        if (typeof nextState.filterMenuOpen === "boolean") state.filterMenuOpen = nextState.filterMenuOpen;
        renderDirections();
        syncFilterOptions();
        bindDirections();
        bindFilters();
        if (input && nextState.station != null) input.value = nextState.station;
      },
      getResult() {
        return currentResult;
      },
    };
  }

  window.RailStationTimetableV2 = { create };
})();
