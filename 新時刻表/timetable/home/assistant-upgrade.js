(function () {
  if (typeof window.stationDB === "undefined") window.stationDB = { tr: [], thsr: [] };
  if (typeof window.assistantRouteCache === "undefined") window.assistantRouteCache = { date: "", tra: null, thsr: null };
  if (typeof window.assistantSeatCache === "undefined") window.assistantSeatCache = {};
  if (typeof window.assistantTrainLiveCache === "undefined") window.assistantTrainLiveCache = {};

  const RESULT_PAGE_SIZE = {
    direct: 3,
    transfer: 2,
    station: 6,
  };

  let assistantRenderState = null;
  let assistantRenderStateSeq = 0;

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function ensureAssistantUpgradeStyles() {
    if (document.getElementById("assistant-upgrade-runtime-style")) return;
    const style = document.createElement("style");
    style.id = "assistant-upgrade-runtime-style";
    style.textContent = `
      .assistant-result-shell{
        display:flex;
        flex-direction:column;
        gap:14px;
      }
      .assistant-message-bubble.assistant-message-bubble-structured{
        width:min(920px, 100%);
        padding:0;
        border:none;
        background:transparent;
        box-shadow:none;
      }
      .rail-ai-collection{
        display:flex;
        flex-direction:column;
        gap:14px;
      }
      .rail-ai-title{
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        gap:10px;
      }
      .rail-ai-title strong{
        font-size:1.06rem;
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        gap:8px;
        color:var(--text-main, var(--text, #e2e8f0));
      }
      .rail-ai-badge{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:6px 10px;
        border-radius:999px;
        border:1px solid rgba(37,99,235,0.26);
        background:rgba(37,99,235,0.12);
        color:#60a5fa;
        font-size:.78rem;
        letter-spacing:.08em;
        font-weight:800;
      }
      body.light-mode .rail-ai-badge{
        color:#1d4ed8;
      }
      .rail-ai-meta-row{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }
      .rail-ai-meta-pill{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:6px 10px;
        border-radius:999px;
        border:1px solid rgba(148,163,184,0.16);
        background:rgba(255,255,255,0.05);
        color:var(--text-main, var(--text, #e2e8f0));
        font-size:.8rem;
        font-weight:700;
      }
      body.light-mode .rail-ai-meta-pill{
        background:rgba(255,255,255,0.92);
        border-color:rgba(15,23,42,0.08);
      }
      .rail-ai-note-panel{
        padding:14px 16px;
        border:1px solid rgba(96,165,250,0.18);
        border-radius:18px;
        background:linear-gradient(135deg, rgba(37,99,235,0.10), rgba(15,23,42,0.02));
      }
      body.light-mode .rail-ai-note-panel{
        background:linear-gradient(135deg, rgba(37,99,235,0.08), rgba(255,255,255,0.92));
        border-color:rgba(37,99,235,0.12);
      }
      .rail-ai-note{
        margin:0;
        color:var(--text-muted, var(--muted, #94a3b8));
        line-height:1.7;
        font-size:.92rem;
      }
      .rail-ai-summary-row{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-top:10px;
      }
      .rail-ai-summary-pill{
        display:inline-flex;
        align-items:center;
        padding:6px 10px;
        border-radius:999px;
        background:rgba(148,163,184,0.12);
        border:1px solid rgba(148,163,184,0.16);
        color:var(--text-main, var(--text, #e2e8f0));
        font-size:.78rem;
        font-weight:800;
      }
      .rail-ai-section{
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .rail-ai-system-block{
        padding:14px 16px;
        border-radius:18px;
        border:1px solid rgba(148,163,184,0.16);
        background:linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
      }
      body.light-mode .rail-ai-system-block{
        background:linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92));
        border-color:rgba(15,23,42,0.08);
      }
      .rail-ai-section-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        flex-wrap:wrap;
      }
      .rail-ai-section-head strong{
        display:flex;
        align-items:center;
        gap:8px;
        font-size:.96rem;
        color:var(--text-main, var(--text, #e2e8f0));
      }
      .rail-ai-section-head span{
        color:var(--text-muted, var(--muted, #94a3b8));
        font-size:.82rem;
      }
      .rail-ai-system-pill{
        display:inline-flex;
        align-items:center;
        padding:5px 10px;
        border-radius:999px;
        font-size:.74rem;
        font-weight:900;
        letter-spacing:.08em;
        text-transform:uppercase;
      }
      .rail-ai-system-pill.tr{
        background:rgba(59,130,246,0.14);
        color:#93c5fd;
      }
      .rail-ai-system-pill.thsr{
        background:rgba(251,146,60,0.16);
        color:#fdba74;
      }
      body.light-mode .rail-ai-system-pill.tr{
        color:#1d4ed8;
      }
      body.light-mode .rail-ai-system-pill.thsr{
        color:#c2410c;
      }
      .rail-ai-list{
        display:grid;
        gap:10px;
        grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));
      }
      .rail-ai-card{
        border:1px solid rgba(148,163,184,0.14);
        border-radius:18px;
        background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
        padding:13px 14px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      body.light-mode .rail-ai-card{
        background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94));
        border-color:rgba(15,23,42,0.07);
      }
      .rail-ai-card-main{
        display:flex;
        flex-direction:column;
        gap:6px;
      }
      .rail-ai-card-main strong{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        align-items:center;
        font-size:1rem;
        color:var(--text-main, var(--text, #e2e8f0));
      }
      .rail-ai-line{
        margin:0;
        color:var(--text-main, var(--text, #e2e8f0));
        line-height:1.6;
      }
      .rail-ai-subline{
        margin:0;
        color:var(--text-muted, var(--muted, #94a3b8));
        line-height:1.6;
        font-size:.9rem;
      }
      .rail-ai-actions{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }
      .rail-ai-btn{
        border:1px solid rgba(148,163,184,0.18);
        background:rgba(255,255,255,0.05);
        color:var(--text-main, var(--text, #e2e8f0));
        border-radius:12px;
        padding:9px 12px;
        font:inherit;
        font-size:.88rem;
        font-weight:700;
        cursor:pointer;
      }
      body.light-mode .rail-ai-btn{
        background:rgba(255,255,255,0.94);
        border-color:rgba(15,23,42,0.08);
      }
      .rail-ai-btn.primary{
        background:linear-gradient(135deg, #2563eb, #0ea5e9);
        border-color:transparent;
        color:#fff;
      }
      .rail-ai-grid{
        display:grid;
        gap:10px;
        grid-template-columns:repeat(2, minmax(0, 1fr));
      }
      .rail-ai-stat{
        border:1px solid rgba(148,163,184,0.14);
        border-radius:16px;
        background:rgba(255,255,255,0.04);
        padding:12px 14px;
        display:flex;
        flex-direction:column;
        gap:6px;
      }
      body.light-mode .rail-ai-stat{
        background:rgba(248,250,252,0.94);
        border-color:rgba(15,23,42,0.07);
      }
      .rail-ai-stat span{
        font-size:.8rem;
        color:var(--text-muted, var(--muted, #94a3b8));
      }
      .rail-ai-stat strong{
        font-size:1rem;
        line-height:1.45;
        color:var(--text-main, var(--text, #e2e8f0));
      }
      .rail-ai-stop-strip{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }
      .rail-ai-stop-chip{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:7px 10px;
        border-radius:999px;
        background:rgba(148,163,184,0.12);
        border:1px solid rgba(148,163,184,0.14);
        color:var(--text-main, var(--text, #e2e8f0));
        font-size:.84rem;
      }
      .rail-ai-stop-chip-time{
        color:var(--text-muted, var(--muted, #94a3b8));
        font-size:.76rem;
        font-weight:700;
      }
      .rail-ai-empty{
        padding:14px 16px;
        border-radius:16px;
        border:1px dashed rgba(148,163,184,0.22);
        color:var(--text-muted, var(--muted, #94a3b8));
        background:rgba(255,255,255,0.03);
        line-height:1.7;
      }
      body.light-mode .rail-ai-empty{
        background:rgba(255,255,255,0.9);
      }
      .rail-ai-pagination{
        margin-top:2px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        flex-wrap:wrap;
      }
      .rail-ai-pagination-note{
        color:var(--text-muted, var(--muted, #94a3b8));
        font-size:.84rem;
        line-height:1.6;
      }
      .rail-ai-pagination-actions{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }
      .rail-ai-switch{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        align-items:center;
        justify-content:space-between;
        padding:14px 16px;
        border:1px solid rgba(148,163,184,0.16);
        border-radius:18px;
        background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
      }
      body.light-mode .rail-ai-switch{
        background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94));
        border-color:rgba(15,23,42,0.08);
      }
      @media (max-width: 720px){
        .rail-ai-grid{
          grid-template-columns:1fr;
        }
        .rail-ai-switch,
        .rail-ai-pagination{
          align-items:flex-start;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function dateToStr(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function getTodayDateStr() {
    return typeof todayDateStr === "function" ? todayDateStr() : dateToStr(new Date());
  }

  function addDays(dateStr, offset) {
    const date = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    date.setDate(date.getDate() + offset);
    return dateToStr(date);
  }

  function normalizeLoose(text) {
    return String(text || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[台臺]/g, "臺")
      .replace(/車站|火車站|高鐵站|臺鐵站|站/g, "")
      .replace(/[、，。．・]/g, "");
  }

  function resolveLocalStationName(raw, sys) {
    const list = Array.isArray(stationDB[sys]) ? stationDB[sys] : [];
    const normalized = normalizeLoose(raw);
    if (!normalized) return "";
    const exact = list.find((item) => normalizeLoose(item.name) === normalized);
    if (exact) return exact.name;
    const fuzzy = list.find((item) => {
      const name = normalizeLoose(item.name);
      return name.includes(normalized) || normalized.includes(name);
    });
    return fuzzy ? fuzzy.name : "";
  }

  function simplifyTypeName(typeName) {
    const name = String(typeName || "").trim();
    if (!name) return "列車";
    if (window.RailNetwork?.normalizeTraDisplayType) {
      return window.RailNetwork.normalizeTraDisplayType(name) || name;
    }
    if (/普悠瑪/i.test(name)) return "普悠瑪";
    if (/太魯閣/i.test(name)) return "太魯閣";
    if (/自強.*3000|3000/i.test(name)) return "自強3000";
    if (/自強/i.test(name)) return "自強";
    if (/莒光/i.test(name)) return "莒光";
    if (/復興/i.test(name)) return "復興";
    if (/區間快/i.test(name)) return "區間快";
    if (/區間/i.test(name)) return "區間";
    if (/普快/i.test(name)) return "普快";
    return name;
  }

  function getTraTypeColor(typeName) {
    const type = simplifyTypeName(typeName);
    if (window.RailNetwork?.getTraTypeColor) {
      return window.RailNetwork.getTraTypeColor(type);
    }
    const map = {
      "自強3000": "#7c3aed",
      "普悠瑪": "#db2777",
      "太魯閣": "#2563eb",
      "自強": "#e11d48",
      "莒光": "#ea580c",
      "復興": "#0284c7",
      "區間快": "#16a34a",
      "區間": "#475569",
      "普快": "#0f766e",
    };
    return map[type] || "#64748b";
  }

  function formatDateLabel(dateStr) {
    const today = getTodayDateStr();
    if (dateStr === today) return `${dateStr} 隞予`;
    if (dateStr === addDays(today, 1)) return `${dateStr} ?予`;
    if (dateStr === addDays(today, 2)) return `${dateStr} 敺予`;
    return dateStr;
  }

  function normalizeDate(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return "";
    return dateToStr(date);
  }

  function parseDate(rawText) {
    if (window.RailAssistantCommon?.parseFlexibleDate) {
      return window.RailAssistantCommon.parseFlexibleDate(rawText, getTodayDateStr);
    }
    return {
      dateStr: getTodayDateStr(),
      dateLabel: formatDateLabel(getTodayDateStr()),
      cleanedText: String(rawText || "").trim(),
    };
  }

  function timeToMin(clock) {
    if (typeof timeToMinutes === "function") return timeToMinutes(clock);
    const match = String(clock || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function formatDurationMinutes(totalMinutes) {
    if (!Number.isFinite(totalMinutes)) return "--";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return `${minutes} 分`;
    if (!minutes) return `${hours} 小時`;
    return `${hours} 小時 ${minutes} 分`;
  }

  function durationTextByClock(dep, arr) {
    const depMin = timeToMin(dep);
    const arrMin = timeToMin(arr);
    if (depMin === null || arrMin === null) return "--";
    const diff = arrMin >= depMin ? arrMin - depMin : arrMin + 1440 - depMin;
    return formatDurationMinutes(diff);
  }

  function detectSystem(text) {
    if (/高鐵|thsr|hsr/i.test(text)) return "thsr";
    if (/臺鐵|台鐵|tra/i.test(text)) return "tr";
    return "";
  }

  function detectTraType(text) {
    const raw = String(text || "");
    if (/普悠瑪/i.test(raw)) return "普悠瑪";
    if (/太魯閣/i.test(raw)) return "太魯閣";
    if (/自強\s*3000|3000/i.test(raw)) return "自強3000";
    if (/自強/i.test(raw)) return "自強";
    if (/莒光/i.test(raw)) return "莒光";
    if (/復興/i.test(raw)) return "復興";
    if (/區間快/i.test(raw)) return "區間快";
    if (/區間/i.test(raw)) return "區間";
    if (/普快/i.test(raw)) return "普快";
    return "";
  }

  function matchesTraType(typeName, preference) {
    if (!preference) return true;
    const a = simplifyTypeName(typeName).replace(/\s+/g, "");
    const b = simplifyTypeName(preference).replace(/\s+/g, "");
    return a.includes(b) || b.includes(a);
  }

  function renderTraTypeInline(typeName) {
    const type = simplifyTypeName(typeName);
    const label = window.RailAssistantCommon?.translateTraType?.(type, getAssistantLang()) || type;
    return `<span class="assistant-inline-tag notranslate" translate="no" style="color:${escapeHtml(getTraTypeColor(type))};font-weight:700;">${escapeHtml(label)}</span>`;
  }

  function getAssistantLang() {
    return window.RailAssistantCommon?.getLang?.() || localStorage.getItem("lang") || "zh";
  }

  function translateStationLabel(name, sys) {
    return window.RailAssistantCommon?.translateStationName?.(name, sys, getAssistantLang()) || String(name || "");
  }

  function renderStationLabel(name, sys) {
    return `<span class="notranslate" translate="no">${escapeHtml(translateStationLabel(name, sys))}</span>`;
  }

  function findMentionedStations(text, sys) {
    const normalizedText = normalizeLoose(text);
    const hits = [];
    (stationDB[sys] || []).forEach((item) => {
      const key = normalizeLoose(item.name);
      const idx = normalizedText.indexOf(key);
      if (idx >= 0) hits.push({ name: item.name, idx, len: key.length, sys });
    });
    const seen = new Set();
    return hits
      .sort((a, b) => a.idx - b.idx || b.len - a.len)
      .filter((item) => {
        const key = `${item.sys}|${item.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function cleanupRouteToken(value) {
    return String(value || "")
      .replace(/^(從|由|查詢|幫我查|我要查|想查)\s*/g, "")
      .replace(/^(臺鐵|台鐵|高鐵|TRA|THSR)\s*/i, "")
      .replace(/\s*(臺鐵|台鐵|高鐵|TRA|THSR)$/i, "")
      .replace(/\s*(直達|轉乘|訂票|買票|車票|班次|車次|時刻表|停靠站|停靠|狀態|完整查詢|查詢|票|有什麼車|有哪些車)$/g, "")
      .trim();
  }

  function parseRouteTokens(text) {
    const routeMatch = String(text || "").match(/(.+?)(?:到|至|往|→|->)(.+)/);
    if (!routeMatch) return null;
    const startRaw = cleanupRouteToken(routeMatch[1]);
    const endRaw = cleanupRouteToken(routeMatch[2]);
    if (!startRaw || !endRaw || startRaw === endRaw) return null;
    return { startRaw, endRaw };
  }

  function parseIntent(rawText) {
    const dateInfo = parseDate(rawText);
    const timeInfo = parseTimeWindow(dateInfo.cleanedText);
    const text = String(timeInfo.cleanedText || "").trim();
    if (!text) return null;

    const preference = detectSystem(text);
    const typePreference = detectTraType(text);
    const directOnly = /直達|不要轉乘|免轉乘/.test(text);
    const allowTransfer = /轉乘|換車|轉車/.test(text);
    const wantsTicket = /訂票|買票|車票|票/.test(text);
    const showStops = /停靠|停站|經過|通過|站點/.test(text);

    const trainMatch = text.match(/(?:車次|列車|班次|train)?\s*(\d{1,4}[A-Z]?)/i);
    const hasExplicitTrainCue = /車次|列車|班次|train/i.test(text);
    if (trainMatch && (String(trainMatch[1]).length >= 2 || hasExplicitTrainCue)) {
      const remaining = text.replace(trainMatch[0], " ");
      const trainRouteTokens = parseRouteTokens(remaining);
      const targetMentions = [
        ...findMentionedStations(remaining, "tr"),
        ...findMentionedStations(remaining, "thsr"),
      ].sort((a, b) => a.idx - b.idx || b.len - a.len);
      return {
        kind: "train",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        preference,
        trainNoRaw: String(trainMatch[1]).toUpperCase(),
        targetRaw: trainRouteTokens ? trainRouteTokens.endRaw : (targetMentions[0] ? targetMentions[0].name : ""),
        showStops,
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }

    const routeTokens = parseRouteTokens(text);
    if (routeTokens) {
      return {
        kind: "route",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        preference,
        startRaw: routeTokens.startRaw,
        endRaw: routeTokens.endRaw,
        displayStart: routeTokens.startRaw,
        displayEnd: routeTokens.endRaw,
        typePreference,
        directOnly,
        allowTransfer,
        wantsTicket,
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }

    const stationMentions = [
      ...(preference === "thsr" ? [] : findMentionedStations(text, "tr")),
      ...(preference === "tr" ? [] : findMentionedStations(text, "thsr")),
    ].sort((a, b) => a.idx - b.idx || b.len - a.len);

    if (stationMentions.length && (/車站|站|班次|時刻|列車|幾點|有什麼車|有哪些車/.test(text) || stationMentions.length === 1)) {
      return {
        kind: "station",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        preference,
        stationRaw: stationMentions[0].name,
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }

    return null;
  }

  async function fetchWithTimeout(url, options, timeoutMs = 8000) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function fetchJsonWithTimeout(url, options, timeoutMs = 8000) {
    const response = await fetchWithTimeout(url, options, timeoutMs);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return response.json();
  }

  function buildStopTimeline(stops) {
    let lastAbs = null;
    return (stops || []).map((stop) => {
      const arrMin = timeToMin(stop.arr || stop.dep || "");
      const depMin = timeToMin(stop.dep || stop.arr || "");
      let arrAbs = arrMin;
      let depAbs = depMin;

      if (Number.isFinite(arrAbs)) {
        while (lastAbs !== null && arrAbs < lastAbs) arrAbs += 1440;
        lastAbs = arrAbs;
      }
      if (Number.isFinite(depAbs)) {
        while (lastAbs !== null && depAbs < lastAbs) depAbs += 1440;
        lastAbs = depAbs;
      }

      return { ...stop, arrAbs, depAbs };
    });
  }

  function buildStopMap(stops) {
    const map = {};
    (stops || []).forEach((stop, index) => {
      if (stop && stop.name) map[stop.name] = index;
    });
    return map;
  }

  function getStopAbs(stop, kind) {
    if (!stop) return null;
    if (kind === "arr") return Number.isFinite(stop.arrAbs) ? stop.arrAbs : stop.depAbs;
    return Number.isFinite(stop.depAbs) ? stop.depAbs : stop.arrAbs;
  }

  function buildDateTimeByAbs(originDate, absMin) {
    if (!originDate || !Number.isFinite(absMin)) return null;
    const base = new Date(`${originDate}T00:00:00`);
    return new Date(base.getTime() + absMin * 60000);
  }

  function getDisplayDateByAbs(originDate, absMin) {
    const dt = buildDateTimeByAbs(originDate, absMin);
    return dt ? dateToStr(dt) : originDate || "";
  }

  function getNowRelativeAbs(originDate) {
    if (!originDate) return null;
    const base = new Date(`${originDate}T00:00:00`);
    return Math.floor((Date.now() - base.getTime()) / 60000);
  }

  function mapDailyTrain(item, sys, originDate) {
    const rawStops = (item.StopTimes || []).map((stop) => ({
      name: stop.StationName && stop.StationName.Zh_tw ? stop.StationName.Zh_tw : "",
      dep: stop.DepartureTime || stop.ArrivalTime || "",
      arr: stop.ArrivalTime || stop.DepartureTime || "",
    }));
    const stops = buildStopTimeline(rawStops);
    return {
      trainNo: sys === "tr"
        ? (item.TrainInfo && item.TrainInfo.TrainNo ? item.TrainInfo.TrainNo : "")
        : (item.DailyTrainInfo && item.DailyTrainInfo.TrainNo
            ? item.DailyTrainInfo.TrainNo
            : (item.TrainDate && item.TrainDate.TrainNo ? item.TrainDate.TrainNo : "")),
      type: sys === "tr"
        ? simplifyTypeName(item.TrainInfo && item.TrainInfo.TrainTypeName ? item.TrainInfo.TrainTypeName.Zh_tw || "" : "")
        : "高鐵",
      originDate,
      stops,
      stopMap: buildStopMap(stops),
    };
  }

  async function ensureToken() {
    if (typeof getTdxToken === "function") await getTdxToken();
    if (typeof tdxToken !== "undefined" && tdxToken) return tdxToken;
    return window.tdxToken || "";
  }

  async function loadDailyDataset(sys, originDate) {
    const token = await ensureToken();
    if (!token) return [];
    const headers = { Authorization: `Bearer ${token}` };
    const url = sys === "tr"
      ? `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${originDate}?%24format=JSON`
      : `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainDate/${originDate}?$format=JSON`;
    try {
      const data = await fetchJsonWithTimeout(url, { headers }, 9000);
      const list = sys === "tr" ? (data.TrainTimetables || []) : (Array.isArray(data) ? data : []);
      return list.map((item) => mapDailyTrain(item, sys, originDate));
    } catch (_) {
      return [];
    }
  }

  async function ensureData(dateStr, systems) {
    const wanted = Array.isArray(systems) ? systems : ["tr", "thsr"];
    if (assistantRouteCache.date !== dateStr) {
      assistantRouteCache = window.assistantRouteCache = { date: dateStr, tra: null, thsr: null };
    }
    const tasks = [];
    if (wanted.includes("tr") && !assistantRouteCache.tra) {
      tasks.push(
        Promise.all([loadDailyDataset("tr", dateStr), loadDailyDataset("tr", addDays(dateStr, -1))])
          .then(([current, previous]) => {
            assistantRouteCache.tra = [...current, ...previous];
          })
          .catch(() => {
            assistantRouteCache.tra = [];
          })
      );
    }
    if (wanted.includes("thsr") && !assistantRouteCache.thsr) {
      tasks.push(
        Promise.all([loadDailyDataset("thsr", dateStr), loadDailyDataset("thsr", addDays(dateStr, -1))])
          .then(([current, previous]) => {
            assistantRouteCache.thsr = [...current, ...previous];
          })
          .catch(() => {
            assistantRouteCache.thsr = [];
          })
      );
    }
    await Promise.all(tasks);
  }

  function trainVariants(trainNo, sys) {
    const raw = String(trainNo || "").trim().toUpperCase();
    if (!raw) return [];
    const set = new Set([raw]);
    if (sys === "thsr" && /^\d{3}$/.test(raw)) set.add(raw.padStart(4, "0"));
    if (sys === "tr" && /^\d{4}$/.test(raw) && raw.startsWith("0")) set.add(String(Number(raw)));
    return Array.from(set);
  }

  function getStationMeta(name, sys) {
    return (stationDB[sys] || []).find((item) => item.name === name) || null;
  }

  async function fetchSeatStatus(dateStr, startName, endName) {
    const startMeta = getStationMeta(startName, "thsr");
    const endMeta = getStationMeta(endName, "thsr");
    if (!startMeta || !endMeta || !startMeta.id || !endMeta.id) return {};
    const key = `${dateStr}|${startMeta.id}|${endMeta.id}`;
    if (assistantSeatCache[key]) return assistantSeatCache[key];

    const token = await ensureToken();
    if (!token) return {};
    try {
      const data = await fetchJsonWithTimeout(
        `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/AvailableSeatStatus/Train/OD/${startMeta.id}/to/${endMeta.id}/TrainDate/${dateStr}?$format=JSON`,
        { headers: { Authorization: `Bearer ${token}` } },
        6000
      );
      const map = {};
      (data.AvailableSeats || []).forEach((item) => {
        map[String(item.TrainNo)] = item.StandardSeatStatus;
      });
      assistantSeatCache[key] = map;
      return map;
    } catch (_) {
      return {};
    }
  }

  function seatMeta(code) {
    if (code === "O") return { text: "摨找???", cls: "ok" };
    if (code === "L") return { text: "摨找???", cls: "warn" };
    if (code === "X") return { text: "?亥??桀?", cls: "bad" };
    return null;
  }

  async function fetchTraLive(trainNo) {
    const key = `${getTodayDateStr()}|${trainNo}`;
    if (assistantTrainLiveCache[key] !== undefined) return assistantTrainLiveCache[key];
    const token = await ensureToken();
    if (!token) return null;
    try {
      const data = await fetchJsonWithTimeout(
        `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard/TrainNo/${trainNo}?%24format=JSON`,
        { headers: { Authorization: `Bearer ${token}` } },
        5000
      );
      assistantTrainLiveCache[key] = data.TrainLiveBoards ? data.TrainLiveBoards[0] : null;
      return assistantTrainLiveCache[key];
    } catch (_) {
      assistantTrainLiveCache[key] = null;
      return null;
    }
  }

  function matchesQueryTime(minuteValue, options) {
    if (!Number.isFinite(options && options.timeStartMin)) return true;
    if (!Number.isFinite(minuteValue)) return false;
    const start = options.timeStartMin;
    const end = Number.isFinite(options.timeEndMin) ? options.timeEndMin : null;
    if (end === null) return minuteValue >= start;
    if (end >= start) return minuteValue >= start && minuteValue <= end;
    return minuteValue >= start || minuteValue <= end;
  }

  async function addTodayLiveStatus(sys, services, dateStr) {
    if (sys !== "tr" || dateStr !== getTodayDateStr()) return services;
    const nowTs = Date.now();
    return Promise.all((services || []).map(async (service) => {
      if (!Number.isFinite(service.depTimestamp) || service.depTimestamp > nowTs) {
        return { ...service, depDisplay: service.dep, arrDisplay: service.arr, liveStatusText: "" };
      }
      const live = await fetchTraLive(service.trainNo);
      const delayMin = Math.max(0, Number(live && live.DelayTime ? live.DelayTime : 0));
      return {
        ...service,
        depDisplay: withDelayClock(service.dep, delayMin),
        arrDisplay: withDelayClock(service.arr, delayMin),
        delayMin,
        hasAdjustedTime: delayMin > 0,
        liveStatusText: delayMin > 0 ? `晚 ${delayMin} 分` : "準點",
      };
    }));
  }

  function collectDirect(dataset, startName, endName, options) {
    const useNow = options.dateStr === getTodayDateStr() && !options.hasTimeFilter;
    const nowTs = Date.now();
    const all = (dataset || []).map((train) => {
      const startIdx = train.stopMap ? train.stopMap[startName] : undefined;
      const endIdx = train.stopMap ? train.stopMap[endName] : undefined;
      if (!Number.isInteger(startIdx) || !Number.isInteger(endIdx) || endIdx <= startIdx) return null;
      if (options.sys === "tr" && options.typePreference && !matchesTraType(train.type, options.typePreference)) return null;

      const startStop = train.stops[startIdx];
      const endStop = train.stops[endIdx];
      const dep = startStop.dep || startStop.arr || "";
      const arr = endStop.arr || endStop.dep || "";
      const depAbs = getStopAbs(startStop, "dep");
      const arrAbs = getStopAbs(endStop, "arr");
      const depMin = timeToMin(dep);
      const depDT = buildDateTimeByAbs(train.originDate, depAbs);
      const arrDT = buildDateTimeByAbs(train.originDate, arrAbs);
      if (depMin === null || !depDT || !arrDT) return null;
      if (getDisplayDateByAbs(train.originDate, depAbs) !== options.dateStr) return null;
      if (!matchesQueryTime(depMin, options)) return null;

      let durationMin = Math.round((arrDT.getTime() - depDT.getTime()) / 60000);
      if (!Number.isFinite(durationMin) || durationMin < 0) durationMin += 1440;

      return {
        trainNo: train.trainNo,
        type: train.type,
        dep,
        arr,
        depMin,
        depTimestamp: depDT.getTime(),
        stopCount: Math.max(0, endIdx - startIdx - 1),
        duration: formatDurationMinutes(durationMin),
      };
    }).filter(Boolean).sort((a, b) => a.depTimestamp - b.depTimestamp);

    const filtered = useNow ? all.filter((item) => item.depTimestamp >= nowTs - 60000) : all;
    return {
      total: all.length,
      items: filtered,
      matches: filtered.slice(0, 3),
    };
  }

  function collectTransfer(dataset, startName, endName, options) {
    if (!Array.isArray(dataset) || !dataset.length) return [];
    const useNow = options.dateStr === getTodayDateStr() && !options.hasTimeFilter;
    const nowTs = Date.now();
    const plans = [];

    (dataset || []).forEach((firstTrain) => {
      if (options.typePreference && !matchesTraType(firstTrain.type, options.typePreference)) return;
      const startIdx = firstTrain.stopMap ? firstTrain.stopMap[startName] : undefined;
      if (!Number.isInteger(startIdx) || startIdx >= firstTrain.stops.length - 1) return;

      const startStop = firstTrain.stops[startIdx];
      const dep = startStop.dep || startStop.arr || "";
      const depAbs = getStopAbs(startStop, "dep");
      const depDT = buildDateTimeByAbs(firstTrain.originDate, depAbs);
      const depMin = timeToMin(dep);
      if (!depDT || depMin === null) return;
      if (getDisplayDateByAbs(firstTrain.originDate, depAbs) !== options.dateStr) return;
      if (!matchesQueryTime(depMin, options)) return;
      if (useNow && depDT.getTime() < nowTs - 60000) return;

      (dataset || []).forEach((secondTrain) => {
        if (secondTrain.trainNo === firstTrain.trainNo && secondTrain.originDate === firstTrain.originDate) return;
        const endIdx = secondTrain.stopMap ? secondTrain.stopMap[endName] : undefined;
        if (!Number.isInteger(endIdx) || endIdx <= 0) return;

        for (let midFirstIdx = startIdx + 1; midFirstIdx < firstTrain.stops.length; midFirstIdx += 1) {
          const transfer = firstTrain.stops[midFirstIdx].name;
          const midSecondIdx = secondTrain.stopMap ? secondTrain.stopMap[transfer] : undefined;
          if (!Number.isInteger(midSecondIdx) || midSecondIdx >= endIdx) continue;

          const firstMid = firstTrain.stops[midFirstIdx];
          const secondMid = secondTrain.stops[midSecondIdx];
          const endStop = secondTrain.stops[endIdx];
          const midArrDT = buildDateTimeByAbs(firstTrain.originDate, getStopAbs(firstMid, "arr"));
          const midDepDT = buildDateTimeByAbs(secondTrain.originDate, getStopAbs(secondMid, "dep"));
          const endArrDT = buildDateTimeByAbs(secondTrain.originDate, getStopAbs(endStop, "arr"));
          if (!midArrDT || !midDepDT || !endArrDT) continue;

          const waitMin = Math.round((midDepDT.getTime() - midArrDT.getTime()) / 60000);
          const totalMin = Math.round((endArrDT.getTime() - depDT.getTime()) / 60000);
          if (!Number.isFinite(waitMin) || waitMin < 0 || waitMin > 90) continue;
          if (!Number.isFinite(totalMin) || totalMin < 0) continue;

          plans.push({
            transfer,
            first: {
              trainNo: firstTrain.trainNo,
              type: firstTrain.type,
              dep,
              arr: firstMid.arr || firstMid.dep || "",
            },
            second: {
              trainNo: secondTrain.trainNo,
              type: secondTrain.type,
              dep: secondMid.dep || secondMid.arr || "",
              arr: endStop.arr || endStop.dep || "",
            },
            waitMin,
            totalMin,
            duration: formatDurationMinutes(totalMin),
            depTimestamp: depDT.getTime(),
          });
        }
      });
    });

    const seen = new Set();
    return plans
      .sort((a, b) => a.depTimestamp - b.depTimestamp || a.totalMin - b.totalMin)
      .filter((plan) => {
        const key = `${plan.first.trainNo}|${plan.first.dep}|${plan.second.trainNo}|${plan.transfer}|${plan.second.arr}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 18);
  }

  function collectStation(dataset, stationName, options) {
    const useNow = options.dateStr === getTodayDateStr() && !options.hasTimeFilter;
    const nowTs = Date.now();
    const all = (dataset || []).map((train) => {
      const idx = train.stopMap ? train.stopMap[stationName] : undefined;
      if (!Number.isInteger(idx)) return null;
      const stop = train.stops[idx];
      const time = stop.dep || stop.arr || "";
      const timeMin = timeToMin(time);
      const timeAbs = getStopAbs(stop, "dep");
      const timeDT = buildDateTimeByAbs(train.originDate, timeAbs);
      if (timeMin === null || !timeDT) return null;
      if (getDisplayDateByAbs(train.originDate, timeAbs) !== options.dateStr) return null;
      if (!matchesQueryTime(timeMin, options)) return null;

      return {
        trainNo: train.trainNo,
        type: train.type,
        time,
        timeTimestamp: timeDT.getTime(),
        rangeStart: train.stops[0] ? train.stops[0].name : "--",
        rangeEnd: train.stops[train.stops.length - 1] ? train.stops[train.stops.length - 1].name : "--",
        range: `${train.stops[0] ? train.stops[0].name : "--"} ??${train.stops[train.stops.length - 1] ? train.stops[train.stops.length - 1].name : "--"}`,
      };
    }).filter(Boolean).sort((a, b) => a.timeTimestamp - b.timeTimestamp);

    const filtered = useNow ? all.filter((item) => item.timeTimestamp >= nowTs - 60000) : all;
    return {
      total: all.length,
      items: filtered,
      matches: filtered.slice(0, 6),
    };
  }

  function isCrossDay(stops) {
    if (!Array.isArray(stops) || stops.length < 2) return false;
    const first = timeToMin(stops[0].dep || stops[0].arr || "");
    const last = timeToMin(stops[stops.length - 1].arr || stops[stops.length - 1].dep || "");
    return Number.isFinite(first) && Number.isFinite(last) && last < first;
  }

  function findNextStopIndex(stops, delayMin, nowAbs) {
    if (!Number.isFinite(nowAbs)) return -1;
    for (let index = 0; index < (stops || []).length; index += 1) {
      const value = getStopAbs(stops[index], "arr");
      if (!Number.isFinite(value)) continue;
      if (value + Math.max(0, Number(delayMin || 0)) >= nowAbs) return index;
    }
    return -1;
  }

  function buildStopPreview(stops, nextIndex, targetIndex, showAll) {
    if (!Array.isArray(stops) || !stops.length) return [];
    let from = 0;
    let to = Math.min(stops.length, 6);
    if (showAll) {
      to = stops.length;
    } else if (Number.isInteger(nextIndex) && nextIndex >= 0) {
      from = Math.max(0, nextIndex);
      to = Math.min(stops.length, nextIndex + 6);
      if (Number.isInteger(targetIndex) && targetIndex >= nextIndex) {
        to = Math.min(stops.length, targetIndex + 1);
      }
    }
    return stops.slice(from, to).map((stop) => ({
      name: stop.name,
      time: stop.arr || stop.dep || "--",
    }));
  }

  async function buildTraTrain(train, intent, targetStation) {
    const stops = train.stops || [];
    const firstStation = stops[0] ? stops[0].name : "--";
    const lastStation = stops[stops.length - 1] ? stops[stops.length - 1].name : "--";
    const firstDep = stops[0] ? stops[0].dep || stops[0].arr || "--" : "--";
    const lastArr = stops[stops.length - 1] ? stops[stops.length - 1].arr || stops[stops.length - 1].dep || "--" : "--";
    const today = intent.dateStr === getTodayDateStr();
    const startAbs = getStopAbs(stops[0], "dep");
    const endAbs = getStopAbs(stops[stops.length - 1], "arr");
    const nowAbs = today ? getNowRelativeAbs(train.originDate) : null;
    let delayMin = 0;
    let statusText = today ? "準點" : "非當日列車";
    let currentLocation = today ? "正在整理目前位置" : "非當日列車，先顯示摘要資訊";
    let nextIndex = today ? findNextStopIndex(stops, 0, nowAbs) : -1;

    if (today) {
      const live = await fetchTraLive(train.trainNo);
      delayMin = Math.max(0, Number(live && live.DelayTime ? live.DelayTime : 0));
      const liveStation = live && live.StationName ? live.StationName.Zh_tw || "" : "";
      nextIndex = findNextStopIndex(stops, delayMin, nowAbs);

      if (Number.isFinite(startAbs) && Number.isFinite(nowAbs) && nowAbs < startAbs + delayMin) {
        statusText = "尚未發車";
        currentLocation = `預計 ${withDelayClock(firstDep, delayMin)} 由 ${firstStation} 發車`;
        nextIndex = 0;
      } else if (Number.isFinite(endAbs) && Number.isFinite(nowAbs) && nowAbs > endAbs + delayMin + 5) {
        statusText = "已到終點";
        currentLocation = `已抵達 ${lastStation}`;
        nextIndex = -1;
      } else {
        statusText = delayMin > 0 ? `晚 ${delayMin} 分` : "準點";
        if (liveStation) {
          currentLocation = `目前位置 ${liveStation}`;
          const liveIndex = train.stopMap ? train.stopMap[liveStation] : -1;
          if (Number.isInteger(liveIndex) && liveIndex < stops.length - 1) nextIndex = Math.max(nextIndex, liveIndex + 1);
        } else if (nextIndex > 0 && stops[nextIndex]) {
          currentLocation = `行駛於 ${stops[nextIndex - 1].name} 與 ${stops[nextIndex].name} 之間`;
        } else if (nextIndex === 0) {
          currentLocation = `目前位置 ${firstStation}`;
        } else {
          currentLocation = `已抵達 ${lastStation}`;
        }
      }
    }

    const targetIndex = targetStation && train.stopMap ? train.stopMap[targetStation] : -1;
    const targetStop = Number.isInteger(targetIndex) ? stops[targetIndex] : null;
    const targetClock = targetStop ? targetStop.arr || targetStop.dep || "--" : "";
    const targetAbs = targetStop ? getStopAbs(targetStop, "arr") : null;
    const remainDiff = Number.isFinite(targetAbs) && Number.isFinite(nowAbs) ? targetAbs + delayMin - nowAbs : null;

    return {
      trainNo: train.trainNo,
      sys: "tr",
      label: "臺鐵",
      firstStation,
      lastStation,
      routeText: `${firstStation} → ${lastStation}`,
      typeText: train.type,
      travelText: durationTextByClock(firstDep, lastArr),
      crossDayText: isCrossDay(stops) ? "跨日列車" : "當日列車",
      statusText,
      currentLocation,
      targetStation,
      etaClock: targetClock ? withDelayClock(targetClock, delayMin) : "",
      remainText: targetClock ? countdownText(remainDiff) : "",
      stopPreview: buildStopPreview(stops, nextIndex, targetIndex, intent.showStops),
      queryAction: `openAppOverlay("tr", { start: ${JSON.stringify(firstStation)}, end: ${JSON.stringify(lastStation)} })`,
      bookingAction: `assistantOpenTraBooking(${JSON.stringify(train.trainNo)}, ${JSON.stringify(firstStation)}, ${JSON.stringify(targetStation || lastStation)}, ${JSON.stringify(intent.dateStr)})`,
    };
  }

  async function buildThsrTrain(train, intent, targetStation) {
    const stops = train.stops || [];
    const firstStation = stops[0] ? stops[0].name : "--";
    const lastStation = stops[stops.length - 1] ? stops[stops.length - 1].name : "--";
    const firstDep = stops[0] ? stops[0].dep || stops[0].arr || "--" : "--";
    const lastArr = stops[stops.length - 1] ? stops[stops.length - 1].arr || stops[stops.length - 1].dep || "--" : "--";
    const today = intent.dateStr === getTodayDateStr();
    const startAbs = getStopAbs(stops[0], "dep");
    const endAbs = getStopAbs(stops[stops.length - 1], "arr");
    const nowAbs = today ? getNowRelativeAbs(train.originDate) : null;
    let statusText = today ? "準點" : "非當日列車";
    let currentLocation = today ? "正在整理目前位置" : "非當日列車，先顯示摘要資訊";
    let nextIndex = today ? findNextStopIndex(stops, 0, nowAbs) : -1;

    if (today) {
      if (Number.isFinite(startAbs) && Number.isFinite(nowAbs) && nowAbs < startAbs) {
        statusText = "尚未發車";
        currentLocation = `預計 ${firstDep} 由 ${firstStation} 發車`;
        nextIndex = 0;
      } else if (Number.isFinite(endAbs) && Number.isFinite(nowAbs) && nowAbs > endAbs + 5) {
        statusText = "已到終點";
        currentLocation = `已抵達 ${lastStation}`;
        nextIndex = -1;
      } else if (nextIndex > 0 && stops[nextIndex]) {
        currentLocation = `行駛於 ${stops[nextIndex - 1].name} 與 ${stops[nextIndex].name} 之間`;
      } else if (nextIndex === 0) {
        currentLocation = `目前位置 ${firstStation}`;
      } else {
        currentLocation = `已抵達 ${lastStation}`;
      }
    }

    const targetIndex = targetStation && train.stopMap ? train.stopMap[targetStation] : -1;
    const targetStop = Number.isInteger(targetIndex) ? stops[targetIndex] : null;
    const targetClock = targetStop ? targetStop.arr || targetStop.dep || "--" : "";
    const targetAbs = targetStop ? getStopAbs(targetStop, "arr") : null;
    const remainDiff = Number.isFinite(targetAbs) && Number.isFinite(nowAbs) ? targetAbs - nowAbs : null;

    return {
      trainNo: train.trainNo,
      sys: "thsr",
      label: "高鐵",
      firstStation,
      lastStation,
      routeText: `${firstStation} → ${lastStation}`,
      typeText: "高鐵",
      travelText: durationTextByClock(firstDep, lastArr),
      crossDayText: isCrossDay(stops) ? "跨日列車" : "當日列車",
      statusText,
      currentLocation,
      targetStation,
      etaClock: targetClock,
      remainText: targetClock ? countdownText(remainDiff) : "",
      stopPreview: buildStopPreview(stops, nextIndex, targetIndex, intent.showStops),
      queryAction: `openAppOverlay("thsr", { start: ${JSON.stringify(firstStation)}, end: ${JSON.stringify(lastStation)} })`,
      bookingAction: `assistantOpenTHSRBooking(${JSON.stringify(train.trainNo)}, ${JSON.stringify(firstStation)}, ${JSON.stringify(targetStation || lastStation)}, ${JSON.stringify(intent.dateStr)}, ${JSON.stringify(firstDep)})`,
    };
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function metaRow(items) {
    const html = (items || [])
      .filter(Boolean)
      .map((item) => `<span class="rail-ai-meta-pill">${escapeHtml(item)}</span>`)
      .join("");
    return html ? `<div class="rail-ai-meta-row">${html}</div>` : "";
  }

  function syncAssistantState(title, hint, tone) {
    if (typeof window.updateAssistantLoadingState === "function") {
      window.updateAssistantLoadingState(title, hint, tone);
    }
  }

  function getAnswerElement() {
    return window.assistantRenderTarget || window.assistantLastRenderTarget || document.getElementById("assistantAnswer");
  }

  function setStructuredAnswerMode(answer, enabled) {
    if (!answer || !answer.classList) return;
    answer.classList.toggle("assistant-message-bubble-structured", !!enabled);
  }

  function setAssistantRenderState(nextState) {
    assistantRenderState = nextState || null;
  }

  function getPagedItems(items, offset, pageSize) {
    const list = Array.isArray(items) ? items : [];
    const total = list.length;
    const maxOffset = total > 0 ? Math.floor((total - 1) / pageSize) * pageSize : 0;
    const safeOffset = Math.max(0, Math.min(Number(offset || 0), maxOffset));
    return {
      items: list.slice(safeOffset, safeOffset + pageSize),
      offset: safeOffset,
      end: Math.min(total, safeOffset + pageSize),
      total,
      hasPrev: safeOffset > 0,
      hasNext: safeOffset + pageSize < total,
    };
  }

  function renderPager(note, buttons) {
    const actions = (buttons || []).filter(Boolean).join("");
    if (!note && !actions) return "";
    return `
      <div class="rail-ai-pagination">
        <div class="rail-ai-pagination-note">${escapeHtml(note || "")}</div>
        ${actions ? `<div class="rail-ai-pagination-actions">${actions}</div>` : ""}
      </div>
    `;
  }

  function renderStopChip(item, sys) {
    if (!item || !item.name) return "";
    return `
      <span class="rail-ai-stop-chip">
        ${renderStationLabel(item.name, sys)}
        <span class="rail-ai-stop-chip-time">${escapeHtml(item.time || "--")}</span>
      </span>
    `;
  }

  function renderStationRange(item, sys) {
    if (item && item.rangeStart && item.rangeEnd) {
      return `${renderStationLabel(item.rangeStart, sys)} → ${renderStationLabel(item.rangeEnd, sys)}`;
    }
    return escapeHtml(item?.range || "--");
  }

  function renderSystemPill(sys, label) {
    return `<span class="rail-ai-system-pill ${sys === "thsr" ? "thsr" : "tr"}">${escapeHtml(label)}</span>`;
  }

  function renderSummaryPills(results, formatter) {
    return (results || []).map((result) => {
      const text = typeof formatter === "function" ? formatter(result) : "";
      if (!text) return "";
      return `<span class="rail-ai-summary-pill">${escapeHtml(text)}</span>`;
    }).join("");
  }

  function getRouteNextLabel(section, offset) {
    if (section === "transfer") return offset > 0 ? "更晚轉乘" : "更多轉乘";
    return offset > 0 ? "更晚班次" : "更多班次";
  }

  function rerenderAssistantState() {
    if (!assistantRenderState) return;
    if (assistantRenderState.kind === "system-choice") {
      renderSystemChoice(
        assistantRenderState.rawText,
        assistantRenderState.title,
        assistantRenderState.detail,
        assistantRenderState.systems
      );
      return;
    }
    if (assistantRenderState.kind === "route") {
      renderRoute(assistantRenderState.intent, assistantRenderState.results, assistantRenderState.view);
      return;
    }
    if (assistantRenderState.kind === "train") {
      renderTrain(assistantRenderState.intent, assistantRenderState.results);
      return;
    }
    if (assistantRenderState.kind === "station") {
      renderStation(assistantRenderState.intent, assistantRenderState.results, assistantRenderState.view);
    }
  }

  function renderSystemChoice(rawText, title, detail, systems) {
    const answer = getAnswerElement();
    setAssistantRenderState({ kind: "system-choice", rawText, title, detail, systems: Array.isArray(systems) ? [...systems] : [] });
    syncAssistantState(title || "請先選擇查詢系統", detail || "這個問題同時可能是臺鐵或高鐵，先選一個系統再繼續查詢。", "ready");
    if (!answer) return;
    setStructuredAnswerMode(answer, true);
    answer.innerHTML = `
      <div class="rail-ai-collection">
        <div class="rail-ai-switch">
          <div class="rail-ai-section">
            <div class="rail-ai-title">
              <span class="rail-ai-badge">系統選擇</span>
              <strong>${escapeHtml(title || "請先選擇查詢系統")}</strong>
            </div>
            <p class="rail-ai-note">${escapeHtml(detail || "這個問題同時可能是臺鐵或高鐵，先選一個系統再繼續查詢。")}</p>
          </div>
          <div class="rail-ai-actions">
            ${(systems || []).map((sys, index) => `
              <button class="rail-ai-btn ${index === 0 ? "primary" : ""}" type="button" onclick='assistantResolveSystemQuery(${JSON.stringify(rawText)}, ${JSON.stringify(sys)})'>${sys === "tr" ? "查詢臺鐵" : "查詢高鐵"}</button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderLoading(title, detail) {
    const answer = getAnswerElement();
    setAssistantRenderState(null);
    const finalTitle = title || "正在整理查詢內容";
    const finalDetail = detail || "正在讀取臺鐵與高鐵資料，稍後就會把結果整理成卡片。";
    syncAssistantState(finalTitle, finalDetail, "loading");
    if (!answer) return;
    setStructuredAnswerMode(answer, false);
    answer.innerHTML = `
      <div class="assistant-placeholder">
        <strong>${escapeHtml(finalTitle)}</strong>
        <div>${escapeHtml(finalDetail)}</div>
      </div>
    `;
  }

  function renderError(message) {
    const answer = getAnswerElement();
    setAssistantRenderState(null);
    syncAssistantState("查詢失敗", message, "error");
    if (!answer) return;
    setStructuredAnswerMode(answer, false);
    answer.innerHTML = `<div class="assistant-error">${escapeHtml(message)}</div>`;
  }

  function renderRoute(intent, results, viewState) {
    const answer = getAnswerElement();
    const view = {
      direct: { ...(viewState?.direct || {}) },
      transfer: { ...(viewState?.transfer || {}) },
    };
    const stateId = `route-${++assistantRenderStateSeq}`;
    setAssistantRenderState({ kind: "route", intent, results, view, stateId });
    syncAssistantState("旅程建議已整理", "可繼續往前看更早班次，或往後顯示更多與更晚的班次。", "ready");
    if (!answer) return;
    setStructuredAnswerMode(answer, true);

    const summaryPills = renderSummaryPills(results, (result) => {
      const directItems = Array.isArray(result.direct?.items) ? result.direct.items : (result.direct?.matches || []);
      const transferItems = Array.isArray(result.transfers) ? result.transfers : [];
      if (directItems.length) return `${result.label} 直達 ${directItems.length} 班`;
      if (transferItems.length) return `${result.label} 轉乘 ${transferItems.length} 組`;
      return `${result.label} 目前無可用班次`;
    });

    answer.innerHTML = `
      <div class="rail-ai-collection">
        <div class="rail-ai-title">
          <span class="rail-ai-badge">旅程建議</span>
          <strong>${renderStationLabel(intent.displayStart, results[0]?.sys || intent.preference || "")} → ${renderStationLabel(intent.displayEnd, results[0]?.sys || intent.preference || "")}</strong>
        </div>
        ${metaRow([
          formatDateLabel(intent.dateStr),
          intent.timeLabel ? `時間 ${intent.timeLabel}` : "",
          intent.preference ? (intent.preference === "tr" ? "臺鐵" : "高鐵") : "臺鐵 / 高鐵",
          intent.typePreference || "",
          intent.directOnly ? "只看直達" : (intent.allowTransfer ? "可接受轉乘" : ""),
        ])}
        <div class="rail-ai-note-panel">
          <p class="rail-ai-note">已把首頁與 AI 頁結果統一成和臺鐵、高鐵 AI 助手相同的卡片版型；需要更多資訊時可以直接按「更多班次」、「更早班次」或「更晚班次」。</p>
          ${summaryPills ? `<div class="rail-ai-summary-row">${summaryPills}</div>` : ""}
        </div>
        <div class="rail-ai-collection">
          ${results.map((result) => {
            const directItems = Array.isArray(result.direct?.items) ? result.direct.items : (result.direct?.matches || []);
            const directPage = getPagedItems(directItems, view.direct[result.sys], RESULT_PAGE_SIZE.direct);
            const transferItems = Array.isArray(result.transfers) ? result.transfers : [];
            const transferPage = getPagedItems(transferItems, view.transfer[result.sys], RESULT_PAGE_SIZE.transfer);
            const directHtml = directPage.items.length ? `
              <div class="rail-ai-list">
                ${directPage.items.map((service) => `
                  <article class="rail-ai-card">
                    <div class="rail-ai-card-main">
                      <strong>${escapeHtml(service.trainNo)} 次${result.sys === "tr" ? ` ${renderTraTypeInline(service.type)}` : ""}</strong>
                      <p class="rail-ai-line">${escapeHtml(service.depDisplay || service.dep)} ${renderStationLabel(result.start, result.sys)} 出發 → ${escapeHtml(service.arrDisplay || service.arr)} ${renderStationLabel(result.end, result.sys)} 抵達</p>
                      <p class="rail-ai-subline">${escapeHtml(service.duration)}${service.stopCount > 0 ? ` ｜ 中途 ${service.stopCount} 站` : " ｜ 直達"}${service.liveStatusText ? ` ｜ ${escapeHtml(service.liveStatusText)}` : ""}${service.hasAdjustedTime ? ` ｜ 原定 ${escapeHtml(service.dep)}→${escapeHtml(service.arr)}` : ""}</p>
                    </div>
                    <div class="rail-ai-actions">
                      ${service.seat ? `<span class="assistant-seat-pill ${service.seat.cls}">${escapeHtml(service.seat.text)}</span>` : ""}
                      <button class="rail-ai-btn primary" type="button" onclick='${result.sys === "tr" ? `assistantOpenTraBooking(${JSON.stringify(service.trainNo)}, ${JSON.stringify(result.start)}, ${JSON.stringify(result.end)}, ${JSON.stringify(intent.dateStr)})` : `assistantOpenTHSRBooking(${JSON.stringify(service.trainNo)}, ${JSON.stringify(result.start)}, ${JSON.stringify(result.end)}, ${JSON.stringify(intent.dateStr)}, ${JSON.stringify(service.dep)})`}'>直接訂票</button>
                    </div>
                  </article>
                `).join("")}
              </div>
            ` : `<div class="rail-ai-empty">${result.direct.total > 0 ? "今天這個時段沒有更合適的直達班次。" : "目前沒有找到符合條件的直達班次。"}</div>`;
            const transferHtml = !intent.directOnly && transferPage.items.length ? `
              <div class="rail-ai-list">
                ${transferPage.items.map((item) => `
                  <article class="rail-ai-card">
                    <div class="rail-ai-card-main">
                      <strong>${escapeHtml(item.first.trainNo)} 次${renderTraTypeInline(item.first.type)} → ${escapeHtml(item.second.trainNo)} 次${renderTraTypeInline(item.second.type)}</strong>
                      <p class="rail-ai-line">${escapeHtml(item.first.dep)} ${renderStationLabel(result.start, result.sys)} 出發 ｜ ${renderStationLabel(item.transfer, result.sys)} 轉乘 ${item.waitMin} 分 ｜ ${escapeHtml(item.second.arr)} 抵達 ${renderStationLabel(result.end, result.sys)}</p>
                      <p class="rail-ai-subline">總耗時 ${escapeHtml(item.duration)} ｜ 第一段 ${escapeHtml(item.first.arr)} 抵達轉乘站 ｜ 第二段 ${escapeHtml(item.second.dep)} 發車</p>
                    </div>
                  </article>
                `).join("")}
              </div>
            ` : (!intent.directOnly && transferItems.length === 0 ? `<div class="rail-ai-empty">目前沒有更合適的轉乘方案。</div>` : "");
            return `
              <section class="rail-ai-section rail-ai-system-block">
                <div class="rail-ai-section-head">
                  <strong>${renderSystemPill(result.sys, result.label)}${renderStationLabel(result.start, result.sys)} → ${renderStationLabel(result.end, result.sys)}</strong>
                  <span>${directItems.length ? `直達 ${directItems.length} 班` : (transferItems.length ? `轉乘 ${transferItems.length} 組` : "暫無班次")}</span>
                </div>
                <div class="rail-ai-section">
                  <div class="rail-ai-section-head">
                    <strong>直達建議</strong>
                    <span>${directItems.length ? `目前顯示 ${directPage.offset + 1}-${directPage.end} / ${directPage.total}` : "沒有符合條件的直達班次"}</span>
                  </div>
                  ${directHtml}
                  ${renderPager(
                    directItems.length > RESULT_PAGE_SIZE.direct ? `目前顯示 ${directPage.offset + 1}-${directPage.end} / ${directPage.total}` : "",
                    [
                      directPage.hasPrev ? `<button class="rail-ai-btn" type="button" onclick='assistantShiftRoutePage(${JSON.stringify(result.sys)}, "direct", -${RESULT_PAGE_SIZE.direct}, ${JSON.stringify(stateId)})'>更早班次</button>` : "",
                      directPage.hasNext ? `<button class="rail-ai-btn primary" type="button" onclick='assistantShiftRoutePage(${JSON.stringify(result.sys)}, "direct", ${RESULT_PAGE_SIZE.direct}, ${JSON.stringify(stateId)})'>${getRouteNextLabel("direct", directPage.offset)}</button>` : "",
                    ]
                  )}
                </div>
                ${!intent.directOnly ? `
                  <div class="rail-ai-section">
                    <div class="rail-ai-section-head">
                      <strong>轉乘建議</strong>
                      <span>${transferItems.length ? `目前顯示 ${transferPage.offset + 1}-${transferPage.end} / ${transferPage.total}` : "沒有更好的轉乘方案"}</span>
                    </div>
                    ${transferHtml}
                    ${renderPager(
                      transferItems.length > RESULT_PAGE_SIZE.transfer ? `目前顯示 ${transferPage.offset + 1}-${transferPage.end} / ${transferPage.total}` : "",
                      [
                        transferPage.hasPrev ? `<button class="rail-ai-btn" type="button" onclick='assistantShiftRoutePage(${JSON.stringify(result.sys)}, "transfer", -${RESULT_PAGE_SIZE.transfer}, ${JSON.stringify(stateId)})'>更早轉乘</button>` : "",
                        transferPage.hasNext ? `<button class="rail-ai-btn primary" type="button" onclick='assistantShiftRoutePage(${JSON.stringify(result.sys)}, "transfer", ${RESULT_PAGE_SIZE.transfer}, ${JSON.stringify(stateId)})'>${getRouteNextLabel("transfer", transferPage.offset)}</button>` : "",
                      ]
                    )}
                  </div>
                ` : ""}
                <div class="rail-ai-actions">
                  <button class="rail-ai-btn" type="button" onclick='openAppOverlay(${JSON.stringify(result.sys)}, { start: ${JSON.stringify(result.start)}, end: ${JSON.stringify(result.end)} })'>打開${escapeHtml(result.label)}完整查詢</button>
                </div>
              </section>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderTrain(intent, results) {
    const answer = getAnswerElement();
    setAssistantRenderState({ kind: "train", intent, results });
    syncAssistantState("車次資訊已整理", "已優先保留目前位置、狀態、預估到站與後續停靠資訊。", "ready");
    if (!answer) return;
    setStructuredAnswerMode(answer, true);
    answer.innerHTML = `
      <div class="rail-ai-collection">
        <div class="rail-ai-title">
          <span class="rail-ai-badge">車次助手</span>
          <strong>${escapeHtml(intent.trainNoRaw)} 次</strong>
        </div>
        ${metaRow([
          formatDateLabel(intent.dateStr),
          intent.timeLabel ? `時間 ${intent.timeLabel}` : "",
          intent.targetRaw ? `目標站 ${intent.targetRaw}` : "",
          intent.showStops ? "顯示更多停靠站" : "",
        ])}
        <div class="rail-ai-note-panel">
          <p class="rail-ai-note">這裡會先整理目前位置、狀態、預估到站與後續停靠；空間不夠時優先保留最有用的資訊，並把更多站點壓成同一列標籤。</p>
        </div>
        <div class="rail-ai-collection">
          ${results.map((result) => `
            <section class="rail-ai-section rail-ai-system-block">
              <div class="rail-ai-section-head">
                <strong>${renderSystemPill(result.sys, result.label)}${escapeHtml(result.trainNo)} 次${result.sys === "tr" ? ` ${renderTraTypeInline(result.typeText)}` : ""}</strong>
                <span>${renderStationLabel(result.firstStation, result.sys)} → ${renderStationLabel(result.lastStation, result.sys)} ｜ ${escapeHtml(result.crossDayText)}</span>
              </div>
              <div class="rail-ai-grid">
                <div class="rail-ai-stat"><span>目前狀態</span><strong>${escapeHtml(result.statusText)}</strong></div>
                <div class="rail-ai-stat"><span>目前位置</span><strong>${escapeHtml(result.currentLocation)}</strong></div>
                <div class="rail-ai-stat"><span>${result.targetStation ? "預估抵達" : "預估車程"}</span><strong>${result.targetStation ? escapeHtml(etaText(result.etaClock || "--", result.remainText || "")) : escapeHtml(result.travelText)}</strong></div>
                <div class="rail-ai-stat"><span>行駛區間</span><strong>${renderStationLabel(result.firstStation, result.sys)} → ${renderStationLabel(result.lastStation, result.sys)}</strong></div>
              </div>
              ${result.stopPreview.length ? `<div class="rail-ai-stop-strip">${result.stopPreview.map((item) => renderStopChip(item, result.sys)).join("")}</div>` : ""}
              <div class="rail-ai-actions">
                <button class="rail-ai-btn" type="button" onclick='${result.queryAction}'>打開${escapeHtml(result.label)}完整查詢</button>
                <button class="rail-ai-btn primary" type="button" onclick='${result.bookingAction}'>前往訂票</button>
              </div>
            </section>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderStation(intent, results, viewState) {
    const answer = getAnswerElement();
    const view = { station: { ...(viewState?.station || {}) } };
    const stateId = `station-${++assistantRenderStateSeq}`;
    setAssistantRenderState({ kind: "station", intent, results, view, stateId });
    syncAssistantState("車站班次已整理", "可繼續往前看更早班次，或往後顯示更多與更晚的班次。", "ready");
    if (!answer) return;
    setStructuredAnswerMode(answer, true);
    answer.innerHTML = `
      <div class="rail-ai-collection">
        <div class="rail-ai-title">
          <span class="rail-ai-badge">車站班次</span>
          <strong>${renderStationLabel(intent.stationRaw, results[0]?.sys || intent.preference || "")}</strong>
        </div>
        ${metaRow([
          formatDateLabel(intent.dateStr),
          intent.timeLabel ? `時間 ${intent.timeLabel}` : "",
          intent.preference ? (intent.preference === "tr" ? "臺鐵" : "高鐵") : "臺鐵 / 高鐵",
        ])}
        <div class="rail-ai-note-panel">
          <p class="rail-ai-note">會先顯示最接近你指定日期與時間的班次；按鈕可繼續往前看更早班次，或往後展開更多與更晚的班次。</p>
        </div>
        <div class="rail-ai-collection">
          ${results.map((result) => {
            const serviceItems = Array.isArray(result.services?.items) ? result.services.items : (result.services?.matches || []);
            const servicePage = getPagedItems(serviceItems, view.station[result.sys], RESULT_PAGE_SIZE.station);
            return `
              <section class="rail-ai-section rail-ai-system-block">
                <div class="rail-ai-section-head">
                  <strong>${renderSystemPill(result.sys, result.label)}接下來班次</strong>
                  <span>${serviceItems.length ? `目前顯示 ${servicePage.offset + 1}-${servicePage.end} / ${servicePage.total}` : "目前沒有可顯示班次"}</span>
                </div>
                ${servicePage.items.length ? `
                  <div class="rail-ai-list">
                    ${servicePage.items.map((item) => `
                      <article class="rail-ai-card">
                        <div class="rail-ai-card-main">
                          <strong>${escapeHtml(item.trainNo)} 次${result.sys === "tr" ? ` ${renderTraTypeInline(item.type)}` : ""}</strong>
                          <p class="rail-ai-line">${escapeHtml(item.time)}</p>
                          <p class="rail-ai-subline">${renderStationRange(item, result.sys)}</p>
                        </div>
                      </article>
                    `).join("")}
                  </div>
                ` : `<div class="rail-ai-empty">這個日期與時間條件下沒有找到可顯示的班次。</div>`}
                ${renderPager(
                  serviceItems.length > RESULT_PAGE_SIZE.station ? `目前顯示 ${servicePage.offset + 1}-${servicePage.end} / ${servicePage.total}` : "",
                  [
                    servicePage.hasPrev ? `<button class="rail-ai-btn" type="button" onclick='assistantShiftStationPage(${JSON.stringify(result.sys)}, -${RESULT_PAGE_SIZE.station}, ${JSON.stringify(stateId)})'>更早班次</button>` : "",
                    servicePage.hasNext ? `<button class="rail-ai-btn primary" type="button" onclick='assistantShiftStationPage(${JSON.stringify(result.sys)}, ${RESULT_PAGE_SIZE.station}, ${JSON.stringify(stateId)})'>${servicePage.offset > 0 ? "更晚班次" : "更多班次"}</button>` : "",
                  ]
                )}
                <div class="rail-ai-actions">
                  <button class="rail-ai-btn" type="button" onclick='openAppOverlay(${JSON.stringify(result.sys)}, { station: ${JSON.stringify(result.station)} })'>打開${escapeHtml(result.label)}車站查詢</button>
                </div>
              </section>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function assistantIsDesktopDevice() {
    const ua = navigator.userAgent || "";
    const isTouchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return !isTouchMac && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }

  function assistantAskTraBookingChoice() {
    const answer = window.prompt("臺鐵訂票要開啟 app 還是 web？請輸入 app 或 web", "app");
    if (answer === null) return "cancel";
    const value = String(answer || "").trim().toLowerCase();
    if (!value || value === "app" || value === "a") return "app";
    if (value === "web" || value === "w") return "web";
    alert("請輸入 app 或 web");
    return assistantAskTraBookingChoice();
  }

  function assistantAskTraSeatQuantity(defaultQty = 1) {
    const answer = window.prompt("請輸入一般座位張數（1-6 張）", String(defaultQty));
    if (answer === null) return null;
    const qty = parseInt(String(answer).trim(), 10);
    if (qty >= 1 && qty <= 6) return qty;
    alert("張數請輸入 1 到 6");
    return assistantAskTraSeatQuantity(defaultQty);
  }

  function assistantFormatTraBookingStationValue(stationName) {
    const raw = String(stationName || "").trim();
    if (!raw) return "";
    const resolvedName = resolveLocalStationName(raw, "tr") || raw;
    const station = (stationDB.tr || []).find((item) => normalizeLoose(item.name) === normalizeLoose(resolvedName));
    const displayName = String((station && station.name) || resolvedName);
    return station && station.id ? `${station.id}-${displayName}` : displayName;
  }

  function assistantOpenTraBookingWeb(trainNo, startStationName, endStationName, dateStr, seatQty = 1) {
    const startStation = assistantFormatTraBookingStationValue(startStationName);
    const endStation = assistantFormatTraBookingStationValue(endStationName);
    const rideDate = String(dateStr || "").trim().replace(/-/g, "/");
    const trainNoText = String(trainNo || "").trim();
    const pid = String(localStorage.getItem("tra_booking_pid") || "").trim().toUpperCase().replace(/\s+/g, "");
    const normalQty = Math.max(1, Math.min(6, parseInt(seatQty, 10) || 1));
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://www.railway.gov.tw/tra-tip-web/tip/tip001/tip121/bookingTicket";
    form.target = "_blank";
    form.style.display = "none";

    const fields = [
      ["custIdTypeEnum", "PERSON_ID"],
      ["pid", pid],
      ["startStation", startStation],
      ["endStation", endStation],
      ["tripType", "ONEWAY"],
      ["orderType", "BY_TRAIN_NO"],
      ["normalQty", String(normalQty)],
      ["wheelChairQty", "0"],
      ["parentChildQty", "0"],
      ["ticketOrderParamList[0].tripNo", "TRIP1"],
      ["ticketOrderParamList[0].rideDate", rideDate],
      ["ticketOrderParamList[0].startStation", startStation],
      ["ticketOrderParamList[0].endStation", endStation],
      ["ticketOrderParamList[0].trainNo", trainNoText],
      ["ticketOrderParamList[0].trainNoList[0]", trainNoText],
      ["rideDate1", rideDate],
      ["trainNo", trainNoText],
      ["trainNoList1", trainNoText],
      ["trainNoList2", ""],
      ["trainNoList3", ""],
    ];

    fields.forEach(([name, value]) => {
      if (value === null || value === undefined) return;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    form.remove();
  }

  function ensureAssistantTraBookingModals() {
    if (!document.getElementById("assistantTraBookingModalStyle")) {
      const style = document.createElement("style");
      style.id = "assistantTraBookingModalStyle";
      style.textContent = `
        .assistant-booking-modal {
          position: fixed;
          inset: 0;
          z-index: 5000;
          display: none;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(2, 6, 23, 0.56);
          backdrop-filter: blur(10px);
        }
        .assistant-booking-modal-content {
          width: min(420px, calc(100vw - 32px));
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 32px 72px rgba(2, 6, 23, 0.42);
          color: #e2e8f0;
          overflow: hidden;
        }
        body.light-mode .assistant-booking-modal-content {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
          color: #0f172a;
          border-color: rgba(148, 163, 184, 0.22);
          box-shadow: 0 28px 68px rgba(15, 23, 42, 0.16);
        }
        .assistant-booking-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 22px 24px 0;
        }
        .assistant-booking-modal-title-main {
          font-size: 1.1rem;
          font-weight: 800;
          line-height: 1.3;
        }
        .assistant-booking-modal-title-sub {
          margin-top: 4px;
          color: rgba(226, 232, 240, 0.78);
          font-size: 0.92rem;
          line-height: 1.5;
        }
        body.light-mode .assistant-booking-modal-title-sub {
          color: rgba(51, 65, 85, 0.8);
        }
        .assistant-booking-close {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.14);
          color: inherit;
          cursor: pointer;
          font-size: 1rem;
          line-height: 1;
        }
        .assistant-booking-modal-body {
          padding: 20px 24px 24px;
        }
        .assistant-booking-modal-grid {
          display: grid;
          gap: 12px;
        }
        .assistant-booking-btn-primary,
        .assistant-booking-btn-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          border-radius: 14px;
          padding: 12px 16px;
          font-size: 0.96rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .assistant-booking-btn-primary {
          border: 1px solid rgba(56, 189, 248, 0.24);
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: #fff;
          box-shadow: 0 16px 34px rgba(37, 99, 235, 0.28);
        }
        .assistant-booking-btn-ghost {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(15, 23, 42, 0.18);
          color: inherit;
        }
        body.light-mode .assistant-booking-btn-ghost {
          background: rgba(255, 255, 255, 0.92);
        }
        .assistant-booking-btn-primary:hover,
        .assistant-booking-btn-ghost:hover {
          transform: translateY(-1px);
        }
        .assistant-booking-field {
          display: grid;
          gap: 8px;
        }
        .assistant-booking-field span {
          font-weight: 700;
        }
        .assistant-booking-select {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(15, 23, 42, 0.28);
          color: inherit;
          padding: 10px 14px;
          font-size: 0.95rem;
          outline: none;
        }
        body.light-mode .assistant-booking-select {
          background: #fff;
          border-color: rgba(148, 163, 184, 0.28);
        }
      `;
      document.head.appendChild(style);
    }

    if (!document.getElementById("assistantBookingChoiceModal")) {
      const modal = document.createElement("div");
      modal.id = "assistantBookingChoiceModal";
      modal.className = "assistant-booking-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "選擇臺鐵訂票方式");
      modal.innerHTML = `
        <div class="assistant-booking-modal-content">
          <div class="assistant-booking-modal-header">
            <div>
              <div class="assistant-booking-modal-title-main">選擇訂票方式</div>
              <div class="assistant-booking-modal-title-sub">你可以直接打開臺鐵 e 訂通 App，或改用網頁版訂票。</div>
            </div>
            <button class="assistant-booking-close" id="assistantBookingChoiceClose" type="button" aria-label="關閉">×</button>
          </div>
          <div class="assistant-booking-modal-body">
            <div class="assistant-booking-modal-grid">
              <button class="assistant-booking-btn-primary" id="assistantBookingChoiceApp" type="button">打開臺鐵 e 訂通 App</button>
              <button class="assistant-booking-btn-ghost" id="assistantBookingChoiceWeb" type="button">改用臺鐵網頁訂票</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    if (!document.getElementById("assistantBookingSeatModal")) {
      const modal = document.createElement("div");
      modal.id = "assistantBookingSeatModal";
      modal.className = "assistant-booking-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "選擇訂票張數");
      modal.innerHTML = `
        <div class="assistant-booking-modal-content">
          <div class="assistant-booking-modal-header">
            <div>
              <div class="assistant-booking-modal-title-main">選擇一般座位張數</div>
              <div class="assistant-booking-modal-title-sub">可選 1 到 6 張。確認後會直接帶你前往臺鐵網頁訂票。</div>
            </div>
            <button class="assistant-booking-close" id="assistantBookingSeatClose" type="button" aria-label="關閉">×</button>
          </div>
          <div class="assistant-booking-modal-body">
            <div class="assistant-booking-modal-grid">
              <label class="assistant-booking-field">
                <span>一般座位張數</span>
                <select id="assistantBookingSeatQtySelect" class="assistant-booking-select">
                  <option value="1">1 張</option>
                  <option value="2">2 張</option>
                  <option value="3">3 張</option>
                  <option value="4">4 張</option>
                  <option value="5">5 張</option>
                  <option value="6">6 張</option>
                </select>
              </label>
              <button class="assistant-booking-btn-primary" id="assistantBookingSeatConfirm" type="button">確認並前往訂票</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  }

  function assistantAskTraBookingChoice() {
    ensureAssistantTraBookingModals();
    const modal = document.getElementById("assistantBookingChoiceModal");
    const appBtn = document.getElementById("assistantBookingChoiceApp");
    const webBtn = document.getElementById("assistantBookingChoiceWeb");
    const closeBtn = document.getElementById("assistantBookingChoiceClose");
    if (!modal || !appBtn || !webBtn || !closeBtn) return Promise.resolve("app");

    return new Promise((resolve) => {
      let settled = false;
      const finish = (choice) => {
        if (settled) return;
        settled = true;
        modal.style.display = "none";
        appBtn.removeEventListener("click", onApp);
        webBtn.removeEventListener("click", onWeb);
        closeBtn.removeEventListener("click", onCancel);
        modal.removeEventListener("click", onBackdrop);
        document.removeEventListener("keydown", onKeydown);
        resolve(choice);
      };
      const onApp = () => finish("app");
      const onWeb = () => finish("web");
      const onCancel = () => finish("cancel");
      const onBackdrop = (event) => { if (event.target === modal) finish("cancel"); };
      const onKeydown = (event) => { if (event.key === "Escape") finish("cancel"); };

      appBtn.addEventListener("click", onApp);
      webBtn.addEventListener("click", onWeb);
      closeBtn.addEventListener("click", onCancel);
      modal.addEventListener("click", onBackdrop);
      document.addEventListener("keydown", onKeydown);
      modal.style.display = "flex";
    });
  }

  function assistantAskTraSeatQuantity(defaultQty = 1) {
    ensureAssistantTraBookingModals();
    const modal = document.getElementById("assistantBookingSeatModal");
    const select = document.getElementById("assistantBookingSeatQtySelect");
    const confirmBtn = document.getElementById("assistantBookingSeatConfirm");
    const closeBtn = document.getElementById("assistantBookingSeatClose");
    if (!modal || !select || !confirmBtn || !closeBtn) {
      return Promise.resolve(Math.max(1, Math.min(6, parseInt(defaultQty, 10) || 1)));
    }

    select.value = String(Math.max(1, Math.min(6, parseInt(defaultQty, 10) || 1)));
    return new Promise((resolve) => {
      let settled = false;
      const finish = (qty) => {
        if (settled) return;
        settled = true;
        modal.style.display = "none";
        confirmBtn.removeEventListener("click", onConfirm);
        closeBtn.removeEventListener("click", onCancel);
        modal.removeEventListener("click", onBackdrop);
        document.removeEventListener("keydown", onKeydown);
        resolve(qty);
      };
      const onConfirm = () => finish(Math.max(1, Math.min(6, parseInt(select.value, 10) || 1)));
      const onCancel = () => finish(null);
      const onBackdrop = (event) => { if (event.target === modal) finish(null); };
      const onKeydown = (event) => { if (event.key === "Escape") finish(null); };

      confirmBtn.addEventListener("click", onConfirm);
      closeBtn.addEventListener("click", onCancel);
      modal.addEventListener("click", onBackdrop);
      document.addEventListener("keydown", onKeydown);
      modal.style.display = "flex";
      setTimeout(() => { try { select.focus(); } catch (_) {} }, 0);
    });
  }

  async function assistantOpenTraBooking(trainNo, startStationName, endStationName, dateStr) {
    if (assistantIsDesktopDevice()) {
      const seatQty = await assistantAskTraSeatQuantity(1);
      if (!seatQty) return;
      assistantOpenTraBookingWeb(trainNo, startStationName, endStationName, dateStr, seatQty);
      return;
    }

    const bookingChoice = await assistantAskTraBookingChoice();
    if (bookingChoice === "cancel") return;
    if (bookingChoice === "web") {
      const seatQty = await assistantAskTraSeatQuantity(1);
      if (!seatQty) return;
      assistantOpenTraBookingWeb(trainNo, startStationName, endStationName, dateStr, seatQty);
      return;
    }

    try {
      const token = await ensureToken();
      if (!token) {
        alert("目前無法取得臺鐵訂票連結，請稍後再試。");
        return;
      }
      const start = String(startStationName || "").trim();
      const end = String(endStationName || "").trim();
      const result = await fetchJsonWithTimeout(
        `https://tdx.transportdata.tw/api/maas-tra/booking/deeplink/direct/tra?start_station=${encodeURIComponent(start)}&end_station=${encodeURIComponent(end)}&train_date=${encodeURIComponent(dateStr)}&train_number=${encodeURIComponent(String(trainNo))}`,
        { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
        8000
      );
      const jumpUrl = (result.data && result.data.deeplink) || result.DeepLinkUrl || result.url;
      if (!jumpUrl) {
        alert("目前拿不到臺鐵訂票連結。");
        return;
      }
      if (window.top && window.top !== window) window.top.location.href = jumpUrl;
      else window.location.href = jumpUrl;
    } catch (_) {
      alert("臺鐵訂票連結建立失敗，請稍後再試。");
    }
  }

  async function assistantOpenTHSRBooking(trainNo, startStationName, endStationName, dateStr, timeStr) {
    if (assistantIsDesktopDevice()) {
      window.open("https://irs.thsrc.com.tw/IMINT/?locale=tw", "_blank", "noopener");
      return;
    }

    try {
      const token = typeof getAccessToken === "function" ? await getAccessToken() : await ensureToken();
      if (!token) {
        alert("目前無法取得高鐵訂票連結，請稍後再試。");
        return;
      }
      const start = String(startStationName || "").trim();
      const end = String(endStationName || "").trim();
      const response = await fetchWithTimeout(
        `https://tdx.transportdata.tw/api/maas-thsr/booking/deeplink/direct/hsr?start_station=${encodeURIComponent(start)}&end_station=${encodeURIComponent(end)}&train_date=${dateStr}&train_time=${encodeURIComponent(timeStr)}&train_number=${trainNo}`,
        { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
        8000
      );
      if (!response.ok) {
        alert(`高鐵訂票連結建立失敗，HTTP ${response.status}`);
        return;
      }
      const result = await response.json();
      const jumpUrl = result.url || (result.data && result.data.deeplink) || result.DeepLinkUrl;
      if (!jumpUrl) {
        alert("目前拿不到高鐵訂票連結。");
        return;
      }
      if (window.top && window.top !== window) window.top.location.href = jumpUrl;
      else window.location.href = jumpUrl;
    } catch (_) {
      alert("高鐵訂票連結建立失敗，請稍後再試。");
    }
  }

  window.assistantOpenTraBooking = assistantOpenTraBooking;
  window.assistantOpenTHSRBooking = assistantOpenTHSRBooking;
  window.assistantResolveSystemQuery = function (rawText, sys) {
    const suffix = sys === "tr" ? " 臺鐵" : " 高鐵";
    return window.handleAssistantQuery(`${String(rawText || "").trim()}${suffix}`);
  };
  window.clearAssistantRenderState = function () {
    setAssistantRenderState(null);
  };
  window.assistantShiftRoutePage = function (sys, section, delta, stateId) {
    if (!assistantRenderState || assistantRenderState.kind !== "route") return;
    if (stateId && assistantRenderState.stateId !== stateId) return;
    const result = (assistantRenderState.results || []).find((item) => item.sys === sys);
    if (!result) return;
    const key = section === "transfer" ? "transfer" : "direct";
    const pageSize = key === "transfer" ? RESULT_PAGE_SIZE.transfer : RESULT_PAGE_SIZE.direct;
    const items = key === "transfer"
      ? (Array.isArray(result.transfers) ? result.transfers : [])
      : (Array.isArray(result.direct?.items) ? result.direct.items : (result.direct?.matches || []));
    const current = Number(assistantRenderState.view?.[key]?.[sys] || 0);
    const next = getPagedItems(items, current + Number(delta || 0), pageSize).offset;
    assistantRenderState = {
      ...assistantRenderState,
      view: {
        ...(assistantRenderState.view || {}),
        [key]: {
          ...((assistantRenderState.view && assistantRenderState.view[key]) || {}),
          [sys]: next,
        },
      },
    };
    rerenderAssistantState();
  };
  window.assistantShiftStationPage = function (sys, delta, stateId) {
    if (!assistantRenderState || assistantRenderState.kind !== "station") return;
    if (stateId && assistantRenderState.stateId !== stateId) return;
    const result = (assistantRenderState.results || []).find((item) => item.sys === sys);
    if (!result) return;
    const items = Array.isArray(result.services?.items) ? result.services.items : (result.services?.matches || []);
    const current = Number(assistantRenderState.view?.station?.[sys] || 0);
    const next = getPagedItems(items, current + Number(delta || 0), RESULT_PAGE_SIZE.station).offset;
    assistantRenderState = {
      ...assistantRenderState,
      view: {
        ...(assistantRenderState.view || {}),
        station: {
          ...((assistantRenderState.view && assistantRenderState.view.station) || {}),
          [sys]: next,
        },
      },
    };
    rerenderAssistantState();
  };
  window.ensureAssistantRouteData = ensureData;
  window.handleAssistantQuery = async function (rawText) {
    ensureAssistantUpgradeStyles();
    const text = String(rawText || "").trim();
    if (!text) {
      renderError("請直接輸入問題，例如：今天 7:30 台北到台中、215 車次到花蓮、板橋站晚上有什麼車。");
      return;
    }

    if ((!stationDB.tr || !stationDB.tr.length) || (!stationDB.thsr || !stationDB.thsr.length)) {
      renderLoading("正在讀取車站資料", "第一次查詢時會先載入臺鐵與高鐵站名資料。");
      if (typeof fetchAllStations === "function") await fetchAllStations();
    }
    await window.RailAssistantCommon?.ensureStationLocaleData?.();

    const intent = parseIntent(text);
    if (!intent) {
      renderError("目前還無法判斷你的問題，請試試：台北到左營、215 車次到花蓮、板橋站 7 點後班次。");
      return;
    }

    renderLoading("正在分析問題", "正在整理最接近的班次、車次與車站結果。");

    if (intent.kind === "route") {
      const systems = intent.preference ? [intent.preference] : (intent.typePreference ? ["tr"] : ["tr", "thsr"]);
      const candidates = systems.map((sys) => {
        const start = resolveLocalStationName(intent.startRaw, sys);
        const end = resolveLocalStationName(intent.endRaw, sys);
        if (!start || !end || start === end) return null;
        return { sys, label: sys === "tr" ? "臺鐵" : "高鐵", start, end };
      }).filter(Boolean);

      if (!candidates.length) {
        renderError(`找不到 ${intent.startRaw} 到 ${intent.endRaw} 的有效查詢組合。`);
        return;
      }

      await ensureData(intent.dateStr, candidates.map((item) => item.sys));
      const results = [];
      for (const item of candidates) {
        const dataset = item.sys === "tr" ? assistantRouteCache.tra : assistantRouteCache.thsr;
        const direct = collectDirect(dataset, item.start, item.end, {
          dateStr: intent.dateStr,
          sys: item.sys,
          typePreference: intent.typePreference,
          timeStartMin: intent.timeStartMin,
          timeEndMin: intent.timeEndMin,
          hasTimeFilter: intent.hasTimeFilter,
        });

        if (item.sys === "thsr" && direct.items.length && intent.wantsTicket) {
          const seatMap = await fetchSeatStatus(intent.dateStr, item.start, item.end);
          direct.items = direct.items.map((service) => ({
            ...service,
            seat: seatMeta(seatMap[String(service.trainNo)]),
          }));
          direct.matches = direct.items.slice(0, RESULT_PAGE_SIZE.direct);
        }

        direct.items = await addTodayLiveStatus(item.sys, direct.items, intent.dateStr);
        direct.matches = direct.items.slice(0, RESULT_PAGE_SIZE.direct);

        const transfers = !intent.directOnly && item.sys === "tr" && (intent.allowTransfer || !direct.items.length)
          ? collectTransfer(dataset, item.start, item.end, {
              dateStr: intent.dateStr,
              typePreference: intent.typePreference,
              timeStartMin: intent.timeStartMin,
              timeEndMin: intent.timeEndMin,
              hasTimeFilter: intent.hasTimeFilter,
            })
          : [];

        results.push({ ...item, direct, transfers });
      }

      renderRoute(intent, results);
      return;
    }

    if (intent.kind === "train") {
      const systems = intent.preference ? [intent.preference] : ["tr", "thsr"];
      await ensureData(intent.dateStr, systems);
      const matchedSystems = systems.filter((sys) => {
        const dataset = sys === "tr" ? assistantRouteCache.tra : assistantRouteCache.thsr;
        return (dataset || []).some((item) => trainVariants(intent.trainNoRaw, sys).includes(String(item.trainNo).toUpperCase()));
      });
      if (!intent.preference && matchedSystems.length > 1) {
        renderSystemChoice(text, `${intent.trainNoRaw} 次同時可能是臺鐵與高鐵`, "請先選擇要查詢的系統，再繼續顯示該車次的即時資訊。", matchedSystems);
        return;
      }
      const results = [];
      for (const sys of systems) {
        const dataset = sys === "tr" ? assistantRouteCache.tra : assistantRouteCache.thsr;
        const train = (dataset || []).find((item) => trainVariants(intent.trainNoRaw, sys).includes(String(item.trainNo).toUpperCase()));
        if (!train) continue;
        const targetStation = intent.targetRaw ? resolveLocalStationName(intent.targetRaw, sys) : "";
        const summary = sys === "tr" ? await buildTraTrain(train, intent, targetStation) : await buildThsrTrain(train, intent, targetStation);
        results.push(summary);
      }
      if (!results.length) {
        renderError(`找不到 ${intent.trainNoRaw} 次在 ${formatDateLabel(intent.dateStr)} 的資料。`);
        return;
      }
      renderTrain(intent, results);
      return;
    }

    if (intent.kind === "station") {
      const systems = intent.preference ? [intent.preference] : ["tr", "thsr"];
      const matchedSystems = systems.filter((sys) => !!resolveLocalStationName(intent.stationRaw, sys));
      if (!intent.preference && matchedSystems.length > 1) {
        renderSystemChoice(text, `${intent.stationRaw} 同時存在於臺鐵與高鐵`, "請先選擇要查哪一個系統，我再幫你整理那個站的班次。", matchedSystems);
        return;
      }
      await ensureData(intent.dateStr, systems);
      const results = [];
      for (const sys of systems) {
        const station = resolveLocalStationName(intent.stationRaw, sys);
        if (!station) continue;
        const dataset = sys === "tr" ? assistantRouteCache.tra : assistantRouteCache.thsr;
        results.push({
          sys,
          label: sys === "tr" ? "臺鐵" : "高鐵",
          station,
          services: collectStation(dataset, station, {
            dateStr: intent.dateStr,
            sys,
            timeStartMin: intent.timeStartMin,
            timeEndMin: intent.timeEndMin,
            hasTimeFilter: intent.hasTimeFilter,
          }),
        });
      }
      if (!results.length) {
        renderError(`找不到 ${intent.stationRaw} 的班次資料。`);
        return;
      }
      renderStation(intent, results);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureAssistantUpgradeStyles, { once: true });
  } else {
    ensureAssistantUpgradeStyles();
  }

  window.addEventListener("rail:languagechange", () => {
    rerenderAssistantState();
  });
})();







