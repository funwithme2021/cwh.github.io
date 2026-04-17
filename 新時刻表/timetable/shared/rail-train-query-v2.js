(function () {
  const STYLE_ID = "rail-train-query-v2-style";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.rtq2-shell{
  display:grid;
  gap:14px;
}
.rtq2-toolbar{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:10px;
  align-items:center;
}
.rtq2-input-wrap{
  display:flex;
  align-items:center;
  min-height:48px;
  padding:0 14px;
  border:1px solid var(--border, #dbe2ea);
  border-radius:18px;
  background:rgba(148,163,184,0.08);
}
.rtq2-input-wrap:focus-within{
  border-color:var(--primary, #2563eb);
  box-shadow:0 0 0 3px rgba(37,99,235,0.08);
}
.rtq2-input{
  width:100%;
  border:none;
  outline:none;
  background:transparent;
  color:var(--text-main, #0f172a);
  font-size:1rem;
  font-weight:700;
  padding:0;
}
.rtq2-input::placeholder{
  color:var(--text-light, #94a3b8);
  font-weight:600;
}
.rtq2-search-btn,
.rtq2-action-btn,
.rtq2-toggle-btn{
  appearance:none;
  border:none;
  cursor:pointer;
  border-radius:16px;
  font-weight:800;
  transition:transform .16s ease, opacity .16s ease, background .16s ease;
}
.rtq2-search-btn:hover,
.rtq2-action-btn:hover,
.rtq2-toggle-btn:hover{
  transform:translateY(-1px);
}
.rtq2-search-btn{
  min-height:48px;
  padding:0 18px;
  background:var(--primary, #2563eb);
  color:#fff;
}
.rtq2-results{
  min-height:88px;
}
.rtq2-placeholder,
.rtq2-not-found{
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:88px;
  border:1px dashed var(--border, #dbe2ea);
  border-radius:18px;
  color:var(--text-muted, #64748b);
  font-size:.95rem;
  font-weight:700;
  text-align:center;
  padding:16px;
}
.rtq2-result{
  display:grid;
  gap:14px;
}
.rtq2-hero{
  position:relative;
  overflow:hidden;
  display:grid;
  gap:12px;
  padding:18px;
  border:1px solid rgba(148,163,184,0.18);
  border-radius:24px;
  background:
    radial-gradient(circle at top right, rgba(37,99,235,0.16), transparent 36%),
    linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.95));
  box-shadow:0 12px 32px rgba(15,23,42,0.06);
}
.rtq2-hero::after{
  content:"";
  position:absolute;
  inset:auto -38px -42px auto;
  width:140px;
  height:140px;
  border-radius:999px;
  background:rgba(37,99,235,0.08);
  pointer-events:none;
}
.rtq2-hero-main{
  position:relative;
  z-index:1;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:14px;
  align-items:start;
}
.rtq2-hero-copy{
  min-width:0;
  display:grid;
  gap:8px;
}
.rtq2-trainline{
  display:flex;
  align-items:flex-end;
  gap:10px;
  flex-wrap:wrap;
}
.rtq2-train-display{
  display:flex;
  align-items:baseline;
  gap:8px;
  flex-wrap:wrap;
  min-width:0;
  color:var(--text-main, #0f172a);
  font-size:1.56rem;
  font-weight:900;
  letter-spacing:.01em;
  line-height:1.1;
}
.rtq2-route{
  color:var(--text-main, #0f172a);
  font-size:1.04rem;
  font-weight:900;
  line-height:1.35;
}
.rtq2-meta{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:6px;
  color:var(--text-muted, #64748b);
  font-size:.84rem;
  line-height:1.5;
}
.rtq2-meta-sep{
  color:var(--text-light, #94a3b8);
  font-weight:700;
}
.rtq2-meta-accent{
  color:var(--primary, #2563eb);
  font-weight:900;
}
.rtq2-status{
  display:inline-flex;
  align-items:center;
  gap:8px;
  align-self:start;
  color:var(--text-main, #0f172a);
  font-size:.95rem;
  font-weight:900;
  white-space:nowrap;
}
.rtq2-status::before{
  content:"";
  width:8px;
  height:8px;
  border-radius:999px;
  background:currentColor;
  opacity:.95;
}
.rtq2-tone-success{ color:#15803d; }
.rtq2-tone-warning{ color:#c2410c; }
.rtq2-tone-danger{ color:#b91c1c; }
.rtq2-tone-muted{ color:#64748b; }
.rtq2-tone-neutral{ color:var(--text-main, #0f172a); }
.rtq2-summary{
  position:relative;
  z-index:1;
  display:flex;
  flex-wrap:wrap;
  gap:8px 18px;
}
.rtq2-summary-item{
  display:flex;
  align-items:baseline;
  gap:8px;
}
.rtq2-summary-label{
  color:var(--text-muted, #64748b);
  font-size:.78rem;
  font-weight:800;
  white-space:nowrap;
}
.rtq2-summary-value{
  color:var(--text-main, #0f172a);
  font-size:.92rem;
  font-weight:900;
  line-height:1.35;
  word-break:break-word;
}
.rtq2-signals{
  position:relative;
  z-index:1;
  display:flex;
  flex-wrap:wrap;
  gap:6px 14px;
}
.rtq2-signal{
  min-width:0;
  display:flex;
  align-items:flex-start;
  gap:8px;
  color:var(--text-main, #0f172a);
  font-size:.88rem;
  line-height:1.45;
}
.rtq2-signal-label{
  color:var(--text-muted, #64748b);
  font-weight:800;
  white-space:nowrap;
}
.rtq2-signal-value{
  min-width:0;
  font-weight:800;
}
.rtq2-progress{
  position:relative;
  z-index:1;
  display:grid;
  gap:8px;
}
.rtq2-progress-line{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  color:var(--text-main, #0f172a);
  font-size:.84rem;
  font-weight:800;
}
.rtq2-progress-text{
  text-align:right;
}
.rtq2-progress-track{
  width:100%;
  height:9px;
  border-radius:999px;
  background:rgba(148,163,184,0.20);
  overflow:hidden;
}
.rtq2-progress-fill{
  height:100%;
  border-radius:999px;
  background:linear-gradient(90deg, var(--primary, #2563eb), rgba(37,99,235,0.55));
}
.rtq2-table-card{
  border:1px solid var(--border, #dbe2ea);
  border-radius:22px;
  overflow:hidden;
  background:var(--bg-surface, #ffffff);
  box-shadow:0 8px 24px rgba(15,23,42,0.04);
}
.rtq2-table-tools{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:14px 16px;
  border-bottom:1px solid rgba(148,163,184,0.16);
  background:rgba(248,250,252,0.9);
}
.rtq2-table-title{
  color:var(--text-main, #0f172a);
  font-size:.95rem;
  font-weight:900;
}
.rtq2-table-subtitle{
  color:var(--text-muted, #64748b);
  font-size:.8rem;
  font-weight:700;
}
.rtq2-toggle-btn{
  min-height:36px;
  padding:0 12px;
  background:rgba(37,99,235,0.08);
  color:var(--primary, #2563eb);
}
.rtq2-table-scroller{
  overflow-x:auto;
}
.rtq2-table{
  min-width:100%;
}
.rtq2-table-head,
.rtq2-table-row{
  display:grid;
  grid-template-columns:44px minmax(140px,1.2fr) minmax(92px,.78fr) minmax(92px,.78fr) minmax(92px,.78fr);
  gap:12px;
  align-items:center;
  padding:12px 16px;
}
.rtq2-table-head{
  position:sticky;
  top:0;
  z-index:1;
  background:rgba(248,250,252,0.96);
  border-bottom:1px solid rgba(148,163,184,0.16);
  color:var(--text-muted, #64748b);
  font-size:.8rem;
  font-weight:900;
  letter-spacing:.02em;
}
.rtq2-table-row{
  border-top:1px solid rgba(148,163,184,0.12);
}
.rtq2-table-row:first-child{
  border-top:none;
}
.rtq2-table-row.is-passed{
  background:rgba(148,163,184,0.05);
}
.rtq2-table-row.is-pass{
  background:rgba(37,99,235,0.03);
}
.rtq2-table-row.is-pass .rtq2-col-no,
.rtq2-table-row.is-pass .rtq2-station-name,
.rtq2-table-row.is-pass .rtq2-time-main,
.rtq2-table-row.is-pass .rtq2-time-sub,
.rtq2-table-row.is-pass .rtq2-time-empty{
  color:var(--text-muted, #64748b);
}
.rtq2-table-row.is-current{
  background:rgba(37,99,235,0.08);
  box-shadow:inset 3px 0 0 var(--primary, #2563eb);
}
.rtq2-table-row.is-next{
  background:rgba(22,163,74,0.06);
}
.rtq2-col-no{
  color:var(--text-muted, #64748b);
  font-size:.86rem;
  font-weight:900;
  text-align:center;
}
.rtq2-station-cell{
  min-width:0;
  display:grid;
  gap:4px;
}
.rtq2-station-main{
  display:flex;
  align-items:center;
  gap:8px;
  min-width:0;
}
.rtq2-station-name{
  min-width:0;
  color:var(--text-main, #0f172a);
  font-size:.98rem;
  font-weight:900;
  line-height:1.3;
}
.rtq2-station-meta{
  color:var(--text-muted, #64748b);
  font-size:.74rem;
  font-weight:800;
  white-space:nowrap;
}
.rtq2-station-sub{
  color:var(--text-muted, #64748b);
  font-size:.78rem;
  line-height:1.4;
}
.rtq2-time-cell{
  min-width:0;
  display:grid;
  gap:4px;
  text-align:left;
  justify-items:start;
}
.rtq2-time-main{
  color:var(--text-main, #0f172a);
  font-size:.92rem;
  font-weight:900;
  line-height:1.35;
}
.rtq2-time-sub{
  color:var(--text-muted, #64748b);
  font-size:.74rem;
  font-weight:700;
}
.rtq2-time-empty{
  color:var(--text-light, #94a3b8);
}
.rtq2-state{
  min-width:0;
  font-size:.82rem;
  font-weight:900;
  line-height:1.35;
  text-align:left;
  justify-self:start;
  justify-items:start;
}
.rtq2-footer{
  display:flex;
  justify-content:flex-end;
}
.rtq2-action-btn{
  min-height:42px;
  padding:0 16px;
  background:rgba(15,23,42,0.08);
  color:var(--text-main, #0f172a);
}
body.dark-mode .rtq2-input-wrap{
  background:rgba(15,23,42,0.26);
}
body.dark-mode .rtq2-hero{
  background:
    radial-gradient(circle at top right, rgba(96,165,250,0.12), transparent 40%),
    linear-gradient(180deg, rgba(15,23,42,0.90), rgba(15,23,42,0.82));
}
body.dark-mode .rtq2-table-tools,
body.dark-mode .rtq2-table-head{
  background:rgba(15,23,42,0.76);
}
body.dark-mode .rtq2-table-card{
  background:rgba(15,23,42,0.86);
}
body.dark-mode .rtq2-table-row.is-passed{
  background:rgba(15,23,42,0.66);
}
body.dark-mode .rtq2-table-row.is-pass{
  background:rgba(30,41,59,0.78);
}
body.dark-mode .rtq2-table-row.is-current{
  background:rgba(30,64,175,0.26);
}
body.dark-mode .rtq2-table-row.is-next{
  background:rgba(21,128,61,0.22);
}
@media (max-width: 760px){
  .rtq2-toolbar{
    grid-template-columns:1fr auto;
  }
  .rtq2-hero{
    padding:16px;
  }
  .rtq2-train-display{
    font-size:1.34rem;
  }
  .rtq2-table-tools{
    flex-wrap:wrap;
    align-items:flex-start;
  }
  .rtq2-table-head,
  .rtq2-table-row{
    grid-template-columns:28px minmax(88px,1fr) minmax(62px,.7fr) minmax(62px,.7fr) minmax(66px,.76fr);
    gap:5px;
    padding:10px 8px;
  }
  .rtq2-table-head > div,
  .rtq2-col-no,
  .rtq2-time-cell,
  .rtq2-state{
    text-align:left;
    justify-self:start;
    justify-items:start;
  }
  .rtq2-station-main{
    gap:4px;
  }
  .rtq2-station-name{
    font-size:.92rem;
  }
  .rtq2-time-main{
    font-size:.84rem;
  }
  .rtq2-state{
    font-size:.76rem;
  }
}
@media (max-width: 460px){
  .rtq2-toolbar{
    grid-template-columns:1fr;
  }
  .rtq2-search-btn{
    width:100%;
  }
  .rtq2-progress-line{
    flex-direction:column;
    align-items:flex-start;
  }
  .rtq2-progress-text{
    text-align:left;
  }
  .rtq2-table-head,
  .rtq2-table-row{
    grid-template-columns:24px minmax(82px,1fr) minmax(58px,.64fr) minmax(58px,.64fr) minmax(60px,.7fr);
    gap:4px;
    padding:9px 6px;
  }
  .rtq2-col-no{
    font-size:.78rem;
  }
  .rtq2-station-sub,
  .rtq2-time-sub{
    font-size:.7rem;
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

  function parseMinutes(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function formatDuration(startTime, endTime) {
    const start = parseMinutes(startTime);
    const end = parseMinutes(endTime);
    if (start === null || end === null) return "--";
    let diff = end - start;
    if (diff < 0) diff += 1440;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    if (hours && minutes) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    if (hours) return `${hours}h`;
    return `${minutes}m`;
  }

  function normalizeTone(value) {
    return ["success", "warning", "danger", "muted", "neutral"].includes(value)
      ? value
      : "neutral";
  }

  function clampPercent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, num));
  }

  function renderContent(html, text, fallback = "--") {
    if (html != null && html !== "") return html;
    if (text != null && text !== "") return escapeHtml(text);
    return escapeHtml(fallback);
  }

  function renderStopWeatherSlot(row, className = "rail-stop-weather-slot", weatherKey = "") {
    const timeMs = Number(row?.weatherTimeMs);
    if (!row || !row.station || !Number.isFinite(timeMs)) return "";
    return `
      <span class="${escapeHtml(className)}" data-stop-weather="1" data-weather-key="${escapeHtml(weatherKey)}" data-weather-station="${escapeHtml(row.station)}" data-weather-time-ms="${escapeHtml(String(Math.round(timeMs)))}" data-weather-passed="${row.isPassed ? "1" : "0"}">
        <span class="rail-stop-weather-chip" data-stop-weather-chip hidden></span>
      </span>
    `;
  }

  function renderStopWeatherNoteSlot(row, weatherKey = "", stateHtml = "", stateText = "") {
    const timeMs = Number(row?.weatherTimeMs);
    const content = renderContent(stateHtml, stateText, "");
    if (!row || !row.station || !Number.isFinite(timeMs)) return `<span class="rtq2-state-text">${content}</span>`;
    return `<span class="rtq2-state-text rail-stop-weather-note" data-stop-weather-note data-weather-key="${escapeHtml(weatherKey)}" data-weather-base-text="${escapeHtml(stateText || "")}">${content}</span>`;
  }

  function fallbackStopRows(result) {
    const list = Array.isArray(result.stops) ? result.stops : [];
    return list.map((stop, index, rows) => {
      const kind =
        stop && stop.kind
          ? stop.kind
          : index === 0
            ? "origin"
            : index === rows.length - 1
              ? "terminal"
              : "stop";
      const arr = stop?.arr || "";
      const dep = stop?.dep || "";
      const time = arr || dep || "--";
      return {
        seq: index + 1,
        station: stop?.name || "--",
        arrText: time,
        depText: time,
        stateText: kind === "pass" ? "通過" : "停靠",
        stateTone: "neutral",
      };
    });
  }

  function renderPlaceholder(text) {
    return `<div class="rtq2-placeholder">${escapeHtml(text || "")}</div>`;
  }

  function renderNotFound(text) {
    return `<div class="rtq2-not-found">${escapeHtml(text || "")}</div>`;
  }

  function renderSummaryItems(items) {
    return (Array.isArray(items) ? items : [])
      .filter((item) => item && (item.value || item.html))
      .map(
        (item) => `
          <div class="rtq2-summary-item">
            <span class="rtq2-summary-label">${escapeHtml(item.label || "")}</span>
            <span class="rtq2-summary-value">${item.html != null ? item.html : escapeHtml(item.value || "")}</span>
          </div>
        `,
      )
      .join("");
  }

  function renderSignals(items) {
    return (Array.isArray(items) ? items : [])
      .filter((item) => item && (item.value || item.html))
      .map((item) => {
        const tone = normalizeTone(item.tone);
        return `
          <div class="rtq2-signal">
            <span class="rtq2-signal-label">${escapeHtml(item.label || "")}</span>
            <span class="rtq2-signal-value rtq2-tone-${escapeHtml(tone)}">${item.html != null ? item.html : escapeHtml(item.value || "")}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderMeta(result) {
    if (result.metaHtml) return result.metaHtml;
    const metaParts = []
      .concat(result.systemLabel ? [escapeHtml(result.systemLabel)] : [])
      .concat(result.typeLabel ? [escapeHtml(result.typeLabel)] : [])
      .concat(result.directionLabel ? [escapeHtml(result.directionLabel)] : [])
      .concat(result.queryDate ? [`發車日 ${escapeHtml(result.queryDate)}`] : []);
    return metaParts
      .map((part, index) => `${index ? '<span class="rtq2-meta-sep">·</span>' : ""}<span>${part}</span>`)
      .join("");
  }

  function renderProgress(result) {
    const percent = clampPercent(result.progressPercent);
    const label = result.progressLabel || "行駛進度";
    const text = result.progressText || `${Math.round(percent)}%`;
    return `
      <div class="rtq2-progress">
        <div class="rtq2-progress-line">
          <span>${escapeHtml(label)}</span>
          <span class="rtq2-progress-text">${escapeHtml(text)}</span>
        </div>
        <div class="rtq2-progress-track">
          <div class="rtq2-progress-fill" style="width:${percent.toFixed(1)}%"></div>
        </div>
      </div>
    `;
  }

  function renderStopRows(rows) {
    return (Array.isArray(rows) ? rows : [])
      .map((row, index) => {
        const classes = ["rtq2-table-row"];
        if (row.isPassed) classes.push("is-passed");
        if (row.isPass) classes.push("is-pass");
        if (row.isCurrent) classes.push("is-current");
        if (row.isNext) classes.push("is-next");
        const weatherKey = `rtq2-${index}-${row.station || ""}-${Number(row.weatherTimeMs) || ""}`;
        const noteContent = row.noteHtml != null || row.note
          ? `<span class="rtq2-station-note-text">${renderContent(row.noteHtml, row.note, "")}</span>`
          : "";
        const weatherNote = renderStopWeatherNoteSlot(row, weatherKey, row.stateHtml, row.stateText);
        return `
          <div class="${classes.join(" ")}">
            <div class="rtq2-col-no">${escapeHtml(String(row.seq ?? index + 1))}</div>
            <div class="rtq2-station-cell">
              <div class="rtq2-station-main">
                <span class="rtq2-station-name">${renderContent(row.stationHtml, row.station, "--")}</span>
                ${row.stationMetaHtml != null || row.stationMeta ? `<span class="rtq2-station-meta">${renderContent(row.stationMetaHtml, row.stationMeta, "")}</span>` : ""}
                ${renderStopWeatherSlot(row, "rail-stop-weather-slot", weatherKey)}
              </div>
              ${noteContent ? `<div class="rtq2-station-sub">${noteContent}</div>` : ""}
            </div>
            <div class="rtq2-time-cell">
              <div class="rtq2-time-main ${(!row.arrHtml && !row.arrText) ? "rtq2-time-empty" : ""}">${renderContent(row.arrHtml, row.arrText, "--")}</div>
              ${row.arrSubHtml != null || row.arrSub ? `<div class="rtq2-time-sub">${renderContent(row.arrSubHtml, row.arrSub, "")}</div>` : ""}
            </div>
            <div class="rtq2-time-cell">
              <div class="rtq2-time-main ${(!row.depHtml && !row.depText) ? "rtq2-time-empty" : ""}">${renderContent(row.depHtml, row.depText, "--")}</div>
              ${row.depSubHtml != null || row.depSub ? `<div class="rtq2-time-sub">${renderContent(row.depSubHtml, row.depSub, "")}</div>` : ""}
            </div>
            <div class="rtq2-state rtq2-tone-${escapeHtml(normalizeTone(row.stateTone))}">
              ${weatherNote}
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderResult(result) {
    const summaryItems = Array.isArray(result.summaryItems)
      ? result.summaryItems
      : [
          { label: "出發", value: result.start?.time || "--" },
          { label: "抵達", value: result.end?.time || "--" },
          { label: "發車日", value: result.queryDate || "--" },
        ];
    const stopRows = Array.isArray(result.stopRows) && result.stopRows.length
      ? result.stopRows
      : fallbackStopRows(result);
    const header = {
      seq: result.stopHeaderLabels?.seq || "#",
      station: result.stopHeaderLabels?.station || "站名",
      arr: result.stopHeaderLabels?.arr || "到達時間",
      dep: result.stopHeaderLabels?.dep || "開車時間",
      state: result.stopHeaderLabels?.state || "狀態",
    };
    const toggleLabel = result.showPassStops
      ? (result.hidePassStopsLabel || "隱藏通過站")
      : (result.showPassStopsLabel || "顯示通過站");

    return `
      <div class="rtq2-result">
        <section class="rtq2-hero">
          <div class="rtq2-hero-main">
            <div class="rtq2-hero-copy">
              <div class="rtq2-trainline">
                <div class="rtq2-train-display">${result.displayTrainHtml != null ? result.displayTrainHtml : escapeHtml(result.trainNo || "")}</div>
              </div>
              <div class="rtq2-route">${result.routeHtml != null ? result.routeHtml : escapeHtml(result.routeLabel || "")}</div>
              ${summaryItems.length ? `<div class="rtq2-summary">${renderSummaryItems(summaryItems)}</div>` : ""}
              <div class="rtq2-meta">${renderMeta(result)}</div>
            </div>
            <div class="rtq2-status rtq2-tone-${escapeHtml(normalizeTone(result.statusTone))}">${escapeHtml(result.statusLabel || "")}</div>
          </div>
          ${Array.isArray(result.heroSignals) && result.heroSignals.length ? `<div class="rtq2-signals">${renderSignals(result.heroSignals)}</div>` : ""}
          ${result.progressPercent != null ? renderProgress(result) : ""}
        </section>
        <section class="rtq2-table-card">
          <div class="rtq2-table-tools">
            <div>
              <div class="rtq2-table-title">${escapeHtml(result.stopTableTitle || "停靠站")}</div>
              <div class="rtq2-table-subtitle">${escapeHtml(result.stopTableSubtitle || "到達與開車時間")}</div>
            </div>
            ${result.allowPassToggle === false ? "" : `<button class="rtq2-toggle-btn" type="button" data-role="toggle-pass-stops">${escapeHtml(toggleLabel)}</button>`}
          </div>
          <div class="rtq2-table-scroller">
            <div class="rtq2-table">
              <div class="rtq2-table-head">
                <div>${escapeHtml(header.seq)}</div>
                <div>${escapeHtml(header.station)}</div>
                <div>${escapeHtml(header.arr)}</div>
                <div>${escapeHtml(header.dep)}</div>
                <div>${escapeHtml(header.state)}</div>
              </div>
              ${renderStopRows(stopRows)}
            </div>
          </div>
        </section>
        <div class="rtq2-footer">
          <button class="rtq2-action-btn" type="button" data-role="open-detail">${escapeHtml(result.detailActionLabel || "完整資訊")}</button>
        </div>
      </div>
    `;
  }

  function create(config) {
    ensureStyles();
    const root = document.getElementById(config.rootId);
    if (!root) return null;

    root.innerHTML = `
      <div class="rtq2-shell">
        <div class="rtq2-toolbar">
          <label class="rtq2-input-wrap" for="${escapeHtml(config.inputId)}">
            <input id="${escapeHtml(config.inputId)}" class="rtq2-input" type="text" list="${escapeHtml(config.datalistId || "")}" placeholder="${escapeHtml(config.placeholder || "")}">
          </label>
          <button id="${escapeHtml(config.buttonId)}" class="rtq2-search-btn" type="button">${escapeHtml(config.buttonText || "查詢")}</button>
        </div>
        <div class="rtq2-results" data-role="results">${renderPlaceholder(config.placeholderText || "")}</div>
      </div>
    `;

    const input = document.getElementById(config.inputId);
    const button = document.getElementById(config.buttonId);
    const results = root.querySelector('[data-role="results"]');
    let currentResult = null;
    const uiState = { showPassStops: false };

    function bindResultActions(result) {
      const detailBtn = root.querySelector('[data-role="open-detail"]');
      if (detailBtn) {
        detailBtn.addEventListener("click", () => {
          if (typeof config.onOpenDetail === "function") config.onOpenDetail(result, { ...uiState });
        });
      }

      const toggleBtn = root.querySelector('[data-role="toggle-pass-stops"]');
      if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
          uiState.showPassStops = !uiState.showPassStops;
          search(result.trainNo, {
            updateInput: false,
            showPassStops: uiState.showPassStops,
          });
        });
      }
    }

    async function search(rawValue, options) {
      const opts = options || {};
      const inputValue = rawValue == null ? input?.value || "" : rawValue;
      const normalized = typeof config.normalizeTrainNo === "function"
        ? config.normalizeTrainNo(inputValue)
        : String(inputValue || "").trim();
      const hasExplicitShowPassStops = Object.prototype.hasOwnProperty.call(opts, "showPassStops");

      if (hasExplicitShowPassStops) {
        uiState.showPassStops = !!opts.showPassStops;
      } else if (currentResult?.trainNo && normalized && normalized !== currentResult.trainNo) {
        uiState.showPassStops = false;
      }

      if (input && opts.updateInput !== false) input.value = normalized;

      if (!normalized) {
        currentResult = null;
        uiState.showPassStops = false;
        results.innerHTML = renderPlaceholder(config.placeholderText || "");
        if (typeof config.onStateChange === "function") config.onStateChange(null);
        return null;
      }

      let queried = null;
      try {
        queried = await Promise.resolve(
          typeof config.query === "function"
            ? config.query(normalized, { showPassStops: uiState.showPassStops, currentResult })
            : null,
        );
      } catch (error) {
        currentResult = null;
        results.innerHTML = renderNotFound(
          error?.message || config.notFoundMessage || "查無結果",
        );
        if (typeof config.onStateChange === "function") {
          config.onStateChange({ trainNo: normalized, found: false, error: true, showPassStops: uiState.showPassStops });
        }
        return null;
      }

      if (!queried) {
        currentResult = null;
        results.innerHTML = renderNotFound(config.notFoundMessage || "查無結果");
        if (typeof config.onStateChange === "function") {
          config.onStateChange({ trainNo: normalized, found: false, showPassStops: uiState.showPassStops });
        }
        return null;
      }

      if (Object.prototype.hasOwnProperty.call(queried, "showPassStops")) {
        uiState.showPassStops = !!queried.showPassStops;
      }

      const result = {
        ...queried,
        trainNo: queried.trainNo || normalized,
        showPassStops: uiState.showPassStops,
      };
      currentResult = result;
      results.innerHTML = renderResult(result);
      bindResultActions(result);
      window.RailStopWeather?.decorate?.(results);
      if (typeof config.onStateChange === "function") {
        config.onStateChange({ trainNo: result.trainNo, found: true, showPassStops: uiState.showPassStops });
      }
      return result;
    }

    if (button) button.addEventListener("click", () => search());

    if (input) {
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        search();
      });
    }

    return {
      search,
      rerender(trainNo) {
        const nextTrainNo = trainNo || currentResult?.trainNo || input?.value || "";
        return search(nextTrainNo, { updateInput: true, showPassStops: uiState.showPassStops });
      },
      refreshChrome() {
        if (!currentResult?.trainNo) return null;
        return search(currentResult.trainNo, { updateInput: false, showPassStops: uiState.showPassStops });
      },
      getInput() {
        return input;
      },
      getResult() {
        return currentResult;
      },
    };
  }

  window.RailTrainQueryV2 = { create };
})();
