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
  let assistantLastQueryText = "";
  let assistantAutoRefreshLoop = null;
  let assistantAutoRefreshInFlight = false;
  let assistantTraTransferSearchCache = new Map();
  const assistantTraTransferIndexCache = typeof WeakMap === "function" ? new WeakMap() : null;

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function getResultPageSize(section) {
    const wide = typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1180px)").matches;
    const desktop = typeof window.matchMedia === "function" && window.matchMedia("(min-width: 860px)").matches;
    if (section === "direct") return wide ? 4 : RESULT_PAGE_SIZE.direct;
    if (section === "transfer") return wide ? 3 : RESULT_PAGE_SIZE.transfer;
    if (section === "station") return wide ? 8 : (desktop ? 7 : RESULT_PAGE_SIZE.station);
    return RESULT_PAGE_SIZE[section] || 3;
  }

  function getAssistantTodayDateStr() {
    return window.RailAssistantCommon?.getTodayDateStr?.() || new Date().toISOString().slice(0, 10);
  }

  function shouldAutoRefreshAssistantState() {
    const intentDate = String(assistantRenderState?.intent?.dateStr || "");
    return !!assistantLastQueryText && !!intentDate && intentDate === getAssistantTodayDateStr();
  }

  async function autoRefreshAssistantState() {
    if (!shouldAutoRefreshAssistantState()) return;
    if (assistantAutoRefreshInFlight) return;
    assistantAutoRefreshInFlight = true;
    try {
      const preserveViewport = window.RailAssistantCommon?.preserveViewport;
      const runRefresh = () => window.handleAssistantQuery?.(assistantLastQueryText, { silent: true });
      if (typeof preserveViewport === "function") {
        await preserveViewport(runRefresh);
      } else {
        await runRefresh();
      }
    } catch (error) {
      console.warn("首頁 AI 自動更新失敗", error);
    } finally {
      assistantAutoRefreshInFlight = false;
    }
  }

  function initAssistantAutoRefresh() {
    if (assistantAutoRefreshLoop) return;
    const startAlignedPolling = window.RailAssistantCommon?.startAlignedPolling;
    if (typeof startAlignedPolling === "function") {
      assistantAutoRefreshLoop = startAlignedPolling(() => autoRefreshAssistantState(), {
        getIntervalMs: () => 60000,
      });
      return;
    }
    assistantAutoRefreshLoop = window.setInterval(() => autoRefreshAssistantState(), 60000);
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
        grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));
      }
      .rail-ai-card{
        border:1px solid rgba(148,163,184,0.14);
        border-radius:18px;
        background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
        padding:12px 13px;
        display:flex;
        flex-direction:column;
        gap:8px;
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
      body.light-mode .rail-ai-title strong,
      body.light-mode .rail-ai-section-head strong,
      body.light-mode .rail-ai-card-main strong,
      body.light-mode .rail-ai-line,
      body.light-mode .rail-ai-subline,
      body.light-mode .rail-ai-stat strong,
      body.light-mode .rail-ai-stop-chip{
        color:var(--text-main, var(--text, #0f172a));
      }
      body.light-mode .rail-ai-title strong span,
      body.light-mode .rail-ai-section-head strong span,
      body.light-mode .rail-ai-card-main strong span,
      body.light-mode .rail-ai-line span,
      body.light-mode .rail-ai-subline span,
      body.light-mode .rail-ai-stat strong span,
      body.light-mode .rail-ai-stop-chip span{
        color:inherit;
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
        color:#0f172a;
      }
      .rail-ai-btn.primary{
        background:linear-gradient(135deg, #2563eb, #0ea5e9);
        border-color:transparent;
        color:#fff;
      }
      body.light-mode .rail-ai-btn.primary{
        background:linear-gradient(135deg, #2563eb, #0ea5e9);
        border-color:transparent;
        color:#fff;
      }
      .assistant-seat-pill{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        padding:6px 10px;
        border-radius:999px;
        font-size:.76rem;
        font-weight:800;
        line-height:1.35;
        background:rgba(148,163,184,0.16);
        color:#cbd5e1;
      }
      .assistant-seat-pill.ok{
        background:rgba(34,197,94,0.16);
        color:#86efac;
      }
      .assistant-seat-pill.warn{
        background:rgba(245,158,11,0.16);
        color:#fdba74;
      }
      .assistant-seat-pill.bad{
        background:rgba(239,68,68,0.16);
        color:#fda4af;
      }
      body.light-mode .assistant-seat-pill{
        color:#475569;
      }
      body.light-mode .assistant-seat-pill.ok{
        color:#166534;
      }
      body.light-mode .assistant-seat-pill.warn{
        color:#b45309;
      }
      body.light-mode .assistant-seat-pill.bad{
        color:#be123c;
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
    if (dateStr === today) return `${dateStr} 今天`;
    if (dateStr === addDays(today, 1)) return `${dateStr} 明天`;
    if (dateStr === addDays(today, 2)) return `${dateStr} 後天`;
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

  function normalizeParserDigits(value) {
    return String(value || "")
      .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 65248))
      .replace(/兩/g, "二")
      .replace(/\s+/g, "")
      .trim();
  }

  function parseChineseNumber(value) {
    const text = normalizeParserDigits(value);
    if (!text) return NaN;
    if (/^\d+$/.test(text)) return Number(text);
    const digitMap = {
      "零": 0,
      "〇": 0,
      "○": 0,
      "一": 1,
      "二": 2,
      "三": 3,
      "四": 4,
      "五": 5,
      "六": 6,
      "七": 7,
      "八": 8,
      "九": 9,
    };
    if (text === "十") return 10;
    if (text.includes("十")) {
      const parts = text.split("十");
      const tens = parts[0] ? digitMap[parts[0]] : 1;
      const ones = parts[1] ? digitMap[parts[1]] : 0;
      if (Number.isFinite(tens) && Number.isFinite(ones)) return tens * 10 + ones;
    }
    if (text.length > 1) {
      const joined = text
        .split("")
        .map((char) => (Object.prototype.hasOwnProperty.call(digitMap, char) ? digitMap[char] : ""))
        .join("");
      if (/^\d+$/.test(joined)) return Number(joined);
    }
    return Object.prototype.hasOwnProperty.call(digitMap, text) ? digitMap[text] : NaN;
  }

  function parseMonthDayValue(value) {
    const parsed = parseChineseNumber(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function parseTimeExpression(rawValue) {
    let text = String(rawValue || "").trim();
    if (!text) return null;

    const meridiemMatch = text.match(/^(凌晨|清晨|早上|上午|中午|下午|傍晚|晚上)\s*/);
    const meridiem = meridiemMatch ? meridiemMatch[1] : "";
    if (meridiemMatch) text = text.slice(meridiemMatch[0].length).trim();

    let hour = NaN;
    let minute = 0;
    if (/^\d{1,2}:\d{2}$/.test(text)) {
      const [hourText, minuteText] = text.split(":");
      hour = Number(hourText);
      minute = Number(minuteText);
    } else {
      const pointMatch = text.match(/^([0-9０-９零〇○一二兩三四五六七八九十]{1,3})\s*點(?:\s*(半|[0-9０-９零〇○一二兩三四五六七八九十]{1,3})\s*分?)?$/);
      if (!pointMatch) return null;
      hour = parseChineseNumber(pointMatch[1]);
      if (pointMatch[2] === "半") minute = 30;
      else if (pointMatch[2]) minute = parseChineseNumber(pointMatch[2]);
    }

    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    if (/凌晨|清晨|早上|上午/.test(meridiem)) {
      if (hour === 12) hour = 0;
    } else if (/中午/.test(meridiem)) {
      if (hour >= 1 && hour <= 11) hour += 12;
    } else if (/下午|傍晚|晚上/.test(meridiem)) {
      if (hour < 12) hour += 12;
    }
    if (hour < 0 || hour > 23) return null;
    return {
      hour,
      minute,
      totalMinutes: hour * 60 + minute,
      display: `${pad2(hour)}:${pad2(minute)}`,
    };
  }

  function parseBroadTimeWindow(text) {
    const value = String(text || "");
    if (/凌晨|清晨/.test(value)) return { timeStartMin: 0, timeEndMin: 5 * 60 + 59, timeLabel: "凌晨 / 清晨" };
    if (/早上|上午/.test(value)) return { timeStartMin: 6 * 60, timeEndMin: 11 * 60 + 59, timeLabel: "上午" };
    if (/中午/.test(value)) return { timeStartMin: 11 * 60, timeEndMin: 13 * 60 + 59, timeLabel: "中午" };
    if (/下午/.test(value)) return { timeStartMin: 12 * 60, timeEndMin: 17 * 60 + 59, timeLabel: "下午" };
    if (/傍晚|晚上/.test(value)) return { timeStartMin: 18 * 60, timeEndMin: 23 * 60 + 59, timeLabel: "晚上" };
    return null;
  }

  function parseDate(rawText) {
    let text = String(rawText || "").trim();
    const todayStr = getTodayDateStr();
    let dateStr = todayStr;
    let dateLabel = formatDateLabel(todayStr);

    if (/後天/.test(text)) {
      text = text.replace(/後天/g, " ");
      dateStr = addDays(todayStr, 2);
      dateLabel = formatDateLabel(dateStr);
    } else if (/明天/.test(text)) {
      text = text.replace(/明天/g, " ");
      dateStr = addDays(todayStr, 1);
      dateLabel = formatDateLabel(dateStr);
    } else if (/今天|今日/.test(text)) {
      text = text.replace(/今天|今日/g, " ");
    } else {
      const ymd = text.match(/(20\d{2})[\/\-.年]\s*([0-9０-９零〇○一二兩三四五六七八九十]{1,3})[\/\-.月]\s*([0-9０-９零〇○一二兩三四五六七八九十]{1,3})\s*日?/);
      const mdSlash = ymd ? null : text.match(/(^|[^\d])(\d{1,2})\/(\d{1,2})(?!\d)/);
      const mdDash = ymd || mdSlash ? null : text.match(/(^|[^\d])(\d{1,2})-(\d{1,2})(?!\d)/);
      const mdDot = ymd || mdSlash || mdDash ? null : text.match(/(^|[^\d])(\d{1,2})\.(\d{1,2})(?!\d)/);
      const mdZh = ymd || mdSlash || mdDash || mdDot
        ? null
        : text.match(/([0-9０-９零〇○一二兩三四五六七八九十]{1,3})\s*月\s*([0-9０-９零〇○一二兩三四五六七八九十]{1,3})\s*日?/);
      const match = ymd || mdSlash || mdDash || mdDot || mdZh;
      if (match) {
        const year = ymd ? Number(match[1]) : new Date(`${todayStr}T00:00:00`).getFullYear();
        const monthRaw = ymd ? match[2] : (mdZh ? match[1] : match[2]);
        const dayRaw = ymd ? match[3] : (mdZh ? match[2] : match[3]);
        const month = parseMonthDayValue(monthRaw);
        const day = parseMonthDayValue(dayRaw);
        const parsed = normalizeDate(year, month, day);
        if (parsed) {
          text = text.replace(match[0], " ");
          dateStr = parsed;
          dateLabel = formatDateLabel(parsed);
        }
      }
    }
    return {
      dateStr,
      dateLabel,
      cleanedText: text.replace(/\s+/g, " ").trim(),
    };
  }

  function parseTimeWindow(rawText) {
    let text = String(rawText || "").trim();
    let timeStartMin = null;
    let timeEndMin = null;
    let timeLabel = "";

    const timeExprPattern = /(?:凌晨|清晨|早上|上午|中午|下午|傍晚|晚上)?\s*(?:\d{1,2}:\d{2}|\d{1,2}\s*點(?:\s*(?:半|\d{1,2}\s*分?))?|[零〇○一二兩三四五六七八九十]{1,3}\s*點(?:\s*(?:半|[零〇○一二兩三四五六七八九十]{1,3}\s*分?))?)/g;
    const matches = Array.from(text.matchAll(timeExprPattern));
    if (matches.length >= 2) {
      const first = matches[0];
      const second = matches[1];
      const between = text.slice(first.index + first[0].length, second.index);
      if (/^\s*(?:到|至|-|~|～)\s*$/.test(between)) {
        const start = parseTimeExpression(first[0]);
        const end = parseTimeExpression(second[0]);
        if (start && end) {
          timeStartMin = start.totalMinutes;
          timeEndMin = end.totalMinutes;
          timeLabel = `${start.display}-${end.display}`;
          text = `${text.slice(0, first.index)} ${text.slice(second.index + second[0].length)}`;
        }
      }
    }

    if (!Number.isFinite(timeStartMin) && matches.length) {
      const single = parseTimeExpression(matches[0][0]);
      if (single) {
        timeStartMin = single.totalMinutes;
        timeLabel = `${single.display} 之後`;
        text = `${text.slice(0, matches[0].index)} ${text.slice(matches[0].index + matches[0][0].length)}`;
      }
    }

    if (!Number.isFinite(timeStartMin)) {
      const broadWindow = parseBroadTimeWindow(text);
      if (broadWindow) {
        timeStartMin = broadWindow.timeStartMin;
        timeEndMin = broadWindow.timeEndMin;
        timeLabel = broadWindow.timeLabel;
        text = text.replace(/凌晨|清晨|早上|上午|中午|下午|傍晚|晚上/g, " ");
      }
    }

    return {
      timeStartMin,
      timeEndMin,
      timeLabel,
      hasTimeFilter: Number.isFinite(timeStartMin),
      cleanedText: text.replace(/\s+/g, " ").trim(),
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

  function withDelayClock(clock, delayMin = 0) {
    const baseMin = timeToMin(clock);
    if (!Number.isFinite(baseMin)) return String(clock || "--");
    const shifted = ((baseMin + Math.max(0, Number(delayMin || 0))) % 1440 + 1440) % 1440;
    const hour = Math.floor(shifted / 60);
    const minute = shifted % 60;
    return `${pad2(hour)}:${pad2(minute)}`;
  }

  function formatRemainText(diffMinutes) {
    if (!Number.isFinite(diffMinutes)) return "";
    const remain = Math.round(diffMinutes);
    if (remain <= 0) return "已到站";
    if (remain < 60) return `剩 ${remain} 分`;
    const hours = Math.floor(remain / 60);
    const minutes = remain % 60;
    if (!minutes) return `剩 ${hours} 小時`;
    return `剩 ${hours} 小時 ${minutes} 分`;
  }

  function countdownText(diffMinutes) {
    return formatRemainText(diffMinutes);
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
      .replace(/^\s*\d{1,4}[A-Z]?\s*次\s*/i, "")
      .replace(/^\s*次\s*/i, "")
      .replace(/^(臺鐵|台鐵|高鐵|TRA|THSR)\s*/i, "")
      .replace(/\s*(臺鐵|台鐵|高鐵|TRA|THSR)$/i, "")
      .replace(/\s*(次|直達|轉乘|訂票|買票|車票|班次|車次|時刻表|停靠站|停靠|狀態|完整查詢|查詢|票|有什麼車|有哪些車|幾點到|幾點抵達|何時到|何時抵達)$/g, "")
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

    const trainMatch = text.match(/(?:車次|列車|班次|train)?\s*(\d{1,4}[A-Z]?)(?:\s*次)?/i);
    const hasExplicitTrainCue = /車次|列車|班次|train|\d{1,4}[A-Z]?\s*次/i.test(text);
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
        startRaw: trainRouteTokens ? trainRouteTokens.startRaw : "",
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

    const uniqueStationKeys = Array.from(new Set(stationMentions.map((item) => normalizeLoose(item.name))));
    if (stationMentions.length && (/車站|站|班次|時刻|列車|幾點|有什麼車|有哪些車/.test(text) || uniqueStationKeys.length === 1)) {
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
      if (stop && stop.name) {
        map[stop.name] = index;
        map[normalizeLoose(stop.name)] = index;
      }
    });
    return map;
  }

  function getStopMapIndex(stopMap, stationName) {
    if (!stopMap || !stationName) return -1;
    if (Number.isInteger(stopMap[stationName])) return stopMap[stationName];
    const normalized = normalizeLoose(stationName);
    return Number.isInteger(stopMap[normalized]) ? stopMap[normalized] : -1;
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
      assistantTraTransferSearchCache = new Map();
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
    if (code === "O") return { text: "座位充裕", cls: "ok" };
    if (code === "L") return { text: "座位有限", cls: "warn" };
    if (code === "X") return { text: "接近售完", cls: "bad" };
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
    if (dateStr !== getTodayDateStr()) return services;
    const nowTs = Date.now();
    return Promise.all((services || []).map(async (service) => {
      if (!Number.isFinite(service.depTimestamp)) {
        return { ...service, depDisplay: service.dep, arrDisplay: service.arr, liveStatusText: "" };
      }
      if (service.depTimestamp > nowTs) {
        return { ...service, depDisplay: service.dep, arrDisplay: service.arr, liveStatusText: "尚未發車" };
      }

      if (sys !== "tr") {
        if (Number.isFinite(service.arrTimestamp) && service.arrTimestamp + 5 * 60000 < nowTs) {
          return { ...service, depDisplay: service.dep, arrDisplay: service.arr, liveStatusText: service.isTerminal ? "已到終點" : "已抵達目的站" };
        }
        return { ...service, depDisplay: service.dep, arrDisplay: service.arr, liveStatusText: "行駛中" };
      }

      const live = await fetchTraLive(service.trainNo);
      const delayMin = Math.max(0, Number(live && live.DelayTime ? live.DelayTime : 0));
      const adjustedArrTs = Number.isFinite(service.arrTimestamp) ? service.arrTimestamp + delayMin * 60000 : NaN;
      let liveStatusText = delayMin > 0 ? `晚 ${delayMin} 分` : "行駛中";
      if (Number.isFinite(adjustedArrTs) && adjustedArrTs + 5 * 60000 < nowTs) {
        liveStatusText = service.isTerminal ? "已到終點" : "已抵達目的站";
      } else if (!live && delayMin <= 0) {
        liveStatusText = "行駛中";
      }
      return {
        ...service,
        depDisplay: withDelayClock(service.dep, delayMin),
        arrDisplay: withDelayClock(service.arr, delayMin),
        delayMin,
        hasAdjustedTime: delayMin > 0,
        liveStatusText,
      };
    }));
  }

  function collectDirect(dataset, startName, endName, options) {
    const useNow = options.dateStr === getTodayDateStr() && !options.hasTimeFilter;
    const nowTs = Date.now();
    const all = (dataset || []).map((train) => {
      const startIdx = getStopMapIndex(train.stopMap, startName);
      const endIdx = getStopMapIndex(train.stopMap, endName);
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
        originDate: train.originDate,
        dep,
        arr,
        depMin,
        depTimestamp: depDT.getTime(),
        arrTimestamp: arrDT.getTime(),
        isTerminal: endIdx === train.stops.length - 1,
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

  function isAssistantTraLocalOnlySelection(typePreference) {
    return simplifyTypeName(typePreference).replace(/\s+/g, "") === "區間";
  }

  function isAssistantTraLocalType(typeName) {
    return simplifyTypeName(typeName).replace(/\s+/g, "") === "區間";
  }

  function isAssistantTraSpecialTransferType(typeName) {
    return /專車|專開列車/.test(String(typeName || ""));
  }

  function getAssistantTraTransferIndex(dataset) {
    if (!Array.isArray(dataset) || !dataset.length) return { entries: [], bundleCache: new Map() };
    if (assistantTraTransferIndexCache?.has(dataset)) return assistantTraTransferIndexCache.get(dataset);
    const entries = dataset
      .filter((train) => train && Array.isArray(train.stops) && train.stops.length > 1 && !isAssistantTraSpecialTransferType(train.type))
      .map((train) => ({
        key: `${String(train.trainNo || "").trim()}@${String(train.originDate || "").trim()}`,
        trainNo: String(train.trainNo || "").trim(),
        type: train.type || "列車",
        originDate: train.originDate || "",
        stops: train.stops,
        meta: (train.stops || []).map((stop) => ({
          stop,
          name: stop?.name || "",
          key: normalizeLoose(stop?.name || ""),
          arr: stop?.arr || stop?.dep || "",
          dep: stop?.dep || stop?.arr || "",
          arrAbs: getStopAbs(stop, "arr"),
          depAbs: getStopAbs(stop, "dep"),
          arrTimestamp: buildDateTimeByAbs(train.originDate, getStopAbs(stop, "arr"))?.getTime() ?? null,
          depTimestamp: buildDateTimeByAbs(train.originDate, getStopAbs(stop, "dep"))?.getTime() ?? null,
        })),
      }));
    const index = { entries, bundleCache: new Map() };
    if (assistantTraTransferIndexCache) assistantTraTransferIndexCache.set(dataset, index);
    return index;
  }

  function getAssistantTraTransferBundle(dataset, typePreference) {
    const index = getAssistantTraTransferIndex(dataset);
    const cacheKey = simplifyTypeName(typePreference || "").replace(/\s+/g, "") || "*";
    if (index.bundleCache.has(cacheKey)) return index.bundleCache.get(cacheKey);
    const candidateEntries = typePreference
      ? index.entries.filter((entry) => matchesTraType(entry.type, typePreference))
      : index.entries.slice();
    const boardEvents = [];
    candidateEntries.forEach((entry) => {
      const meta = entry.meta || [];
      for (let boardIdx = 0; boardIdx < meta.length - 1; boardIdx += 1) {
        const boardMeta = meta[boardIdx];
        if (!Number.isFinite(boardMeta?.depTimestamp)) continue;
        boardEvents.push({
          entry,
          trainKey: entry.key,
          boardIdx,
          boardMeta,
          depAbs: boardMeta.depAbs,
          depTimestamp: boardMeta.depTimestamp,
          stationKey: boardMeta.key
        });
      }
    });
    boardEvents.sort((a, b) => (a.depTimestamp ?? Infinity) - (b.depTimestamp ?? Infinity) || String(a.trainKey || "").localeCompare(String(b.trainKey || "")));
    const bundle = { candidateEntries, boardEvents, reverseCache: new Map() };
    index.bundleCache.set(cacheKey, bundle);
    return bundle;
  }

  function createAssistantTraReverseReachabilityStore(bundle) {
    let minTs = Infinity;
    let maxTs = -Infinity;
    (bundle?.boardEvents || []).forEach((event) => {
      if (Number.isFinite(event?.depTimestamp)) {
        minTs = Math.min(minTs, event.depTimestamp);
        maxTs = Math.max(maxTs, event.depTimestamp);
      }
    });
    (bundle?.candidateEntries || []).forEach((entry) => {
      (entry?.meta || []).forEach((stopMeta) => {
        if (Number.isFinite(stopMeta?.arrTimestamp)) {
          minTs = Math.min(minTs, stopMeta.arrTimestamp);
          maxTs = Math.max(maxTs, stopMeta.arrTimestamp);
        }
        if (Number.isFinite(stopMeta?.depTimestamp)) {
          minTs = Math.min(minTs, stopMeta.depTimestamp);
          maxTs = Math.max(maxTs, stopMeta.depTimestamp);
        }
      });
    });
    if (!Number.isFinite(minTs) || !Number.isFinite(maxTs) || maxTs < minTs) {
      return { baseMinute: 0, length: 0, byStation: new Map() };
    }
    return {
      baseMinute: Math.floor(minTs / 60000),
      length: Math.max(0, Math.ceil((maxTs - minTs) / 60000) + 92),
      byStation: new Map()
    };
  }

  function getAssistantTraReverseReachabilitySlots(store, key, create = false) {
    if (!store?.byStation || !key) return null;
    let slots = store.byStation.get(key);
    if (!slots && create && Number.isFinite(store.length) && store.length > 0) {
      slots = new Uint8Array(store.length);
      store.byStation.set(key, slots);
    }
    return slots || null;
  }

  function markAssistantTraReverseReachableDeparture(store, station, depTimestamp) {
    if (!store || !Number.isFinite(depTimestamp)) return;
    const index = Math.round(depTimestamp / 60000) - store.baseMinute;
    if (index < 0 || index >= store.length) return;
    [station, normalizeLoose(station)].forEach((key) => {
      const slots = getAssistantTraReverseReachabilitySlots(store, key, true);
      if (slots) slots[index] = 1;
    });
  }

  function hasAssistantTraReverseReachableDeparture(store, station, arrTimestamp) {
    if (!store || !Number.isFinite(arrTimestamp)) return false;
    const arriveMinute = Math.round(arrTimestamp / 60000);
    const start = Math.max(0, arriveMinute - store.baseMinute + 3);
    const end = Math.min(store.length - 1, arriveMinute - store.baseMinute + 90);
    if (end < start) return false;
    const keys = [station, normalizeLoose(station)];
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const slots = getAssistantTraReverseReachabilitySlots(store, keys[keyIndex], false);
      if (!slots) continue;
      for (let i = start; i <= end; i += 1) {
        if (slots[i]) return true;
      }
    }
    return false;
  }

  function canAssistantTraReverseStopReachEnd(reverseIndex, station, arrTimestamp) {
    if (!reverseIndex) return true;
    if (normalizeLoose(station) === reverseIndex.endKey) return true;
    return hasAssistantTraReverseReachableDeparture(reverseIndex.store, station, arrTimestamp);
  }

  function buildAssistantTraReverseReachability(bundle, endName) {
    if (!bundle) return { endName, endKey: normalizeLoose(endName), store: { baseMinute: 0, length: 0, byStation: new Map() }, boardReachableKeys: new Set() };
    if (!bundle.reverseCache) bundle.reverseCache = new Map();
    const cacheKey = normalizeLoose(endName);
    if (bundle.reverseCache.has(cacheKey)) return bundle.reverseCache.get(cacheKey);

    const store = createAssistantTraReverseReachabilityStore(bundle);
    const boardReachableKeys = new Set();
    const groupedEvents = new Map();
    (bundle?.boardEvents || []).forEach((event) => {
      if (!Number.isFinite(event?.depTimestamp)) return;
      if (!groupedEvents.has(event.depTimestamp)) groupedEvents.set(event.depTimestamp, []);
      groupedEvents.get(event.depTimestamp).push(event);
    });

    const depBuckets = Array.from(groupedEvents.keys()).sort((a, b) => b - a);
    const reverseIndex = { endName, endKey: cacheKey, store, boardReachableKeys };
    depBuckets.forEach((depTimestamp) => {
      const events = groupedEvents.get(depTimestamp) || [];
      const reachableEvents = [];
      events.forEach((event) => {
        const meta = event?.entry?.meta || [];
        let reachable = false;
        for (let idx = event.boardIdx + 1; idx < meta.length; idx += 1) {
          const stopMeta = meta[idx];
          const arrTimestamp = stopMeta?.arrTimestamp ?? stopMeta?.depTimestamp;
          if (!Number.isFinite(arrTimestamp)) continue;
          if (canAssistantTraReverseStopReachEnd(reverseIndex, stopMeta.name, arrTimestamp)) {
            reachable = true;
            break;
          }
        }
        if (reachable) reachableEvents.push(event);
      });
      reachableEvents.forEach((event) => {
        boardReachableKeys.add(`${event.trainKey}|${event.boardIdx}`);
        markAssistantTraReverseReachableDeparture(store, event.boardMeta.name, event.depTimestamp);
      });
    });

    bundle.reverseCache.set(cacheKey, reverseIndex);
    return reverseIndex;
  }

  function createAssistantTraTransferOriginState(startName) {
    return {
      kind: "origin",
      parent: null,
      stationKey: normalizeLoose(startName),
      stationName: startName,
      arrivalTimestamp: -Infinity,
      effectiveDepTimestamp: null,
      transferCount: 0,
      lastTrainKey: ""
    };
  }

  function findAssistantTraLastRideState(stateNode) {
    let cursor = stateNode;
    while (cursor) {
      if (cursor.kind === "ride" && cursor.leg) return cursor;
      cursor = cursor.parent;
    }
    return null;
  }

  function isAssistantTraTerminalLeg(leg) {
    return !!leg && Number(leg.endIdx) >= Number(leg.stopCount || 0) - 1;
  }

  function getAssistantTraTransferRestrictionKey(stateNode, allowLocalOnly) {
    const ride = findAssistantTraLastRideState(stateNode);
    if (!ride?.leg) return "origin";
    if (allowLocalOnly) return `free:${ride.lastTrainKey || ""}`;
    if (isAssistantTraLocalType(ride.leg.type) && !isAssistantTraTerminalLeg(ride.leg)) return `local-nonterminal:${ride.lastTrainKey || ""}`;
    return `free:${ride.lastTrainKey || ""}`;
  }

  function compareAssistantTraStateDominance(a, b, allowLocalOnly) {
    if (!a || !b) return false;
    if (String(a.lastTrainKey || "") !== String(b.lastTrainKey || "")) return false;
    if (getAssistantTraTransferRestrictionKey(a, allowLocalOnly) !== getAssistantTraTransferRestrictionKey(b, allowLocalOnly)) return false;
    const dominates =
      (a.arrivalTimestamp ?? Infinity) <= (b.arrivalTimestamp ?? Infinity) &&
      (a.effectiveDepTimestamp ?? -Infinity) >= (b.effectiveDepTimestamp ?? -Infinity) &&
      (a.transferCount ?? Infinity) <= (b.transferCount ?? Infinity);
    const strictlyBetter =
      (a.arrivalTimestamp ?? Infinity) < (b.arrivalTimestamp ?? Infinity) ||
      (a.effectiveDepTimestamp ?? -Infinity) > (b.effectiveDepTimestamp ?? -Infinity) ||
      (a.transferCount ?? Infinity) < (b.transferCount ?? Infinity);
    return dominates && strictlyBetter;
  }

  function insertAssistantTraTransferState(frontiers, nextState, allowLocalOnly) {
    const key = nextState.stationKey;
    const list = frontiers.get(key) || [];
    for (let i = 0; i < list.length; i += 1) {
      if (compareAssistantTraStateDominance(list[i], nextState, allowLocalOnly)) return false;
    }
    const filtered = list.filter((item) => !compareAssistantTraStateDominance(nextState, item, allowLocalOnly));
    filtered.push(nextState);
    filtered.sort((a, b) => (a.arrivalTimestamp ?? Infinity) - (b.arrivalTimestamp ?? Infinity) || (b.effectiveDepTimestamp ?? -Infinity) - (a.effectiveDepTimestamp ?? -Infinity) || (a.transferCount ?? Infinity) - (b.transferCount ?? Infinity));
    frontiers.set(key, filtered);
    return true;
  }

  function buildAssistantTraTransferInfo(previousState, event) {
    const previousRide = findAssistantTraLastRideState(previousState);
    if (!previousRide?.leg) return null;
    const waitMin = Math.round(((event.depTimestamp ?? 0) - (previousState.arrivalTimestamp ?? 0)) / 60000);
    return {
      station: event.boardMeta.name,
      waitMin,
      arriveTimestamp: previousRide.leg.arrTimestamp,
      departTimestamp: event.depTimestamp,
      arriveSched: previousRide.leg.arr,
      departSched: event.boardMeta.dep || event.boardMeta.arr || "",
      fromTrainNo: previousRide.leg.trainNo,
      toTrainNo: event.entry.trainNo,
      fromOriginDate: previousRide.leg.originDate,
      toOriginDate: event.entry.originDate
    };
  }

  function isAssistantTraLocalTransferBlocked(previousRide, event, allowLocalOnly) {
    if (allowLocalOnly) return false;
    const previousLeg = previousRide?.leg;
    if (!previousLeg || !event?.entry) return false;
    if (!isAssistantTraLocalType(previousLeg.type) || !isAssistantTraLocalType(event.entry.type)) return false;
    return !isAssistantTraTerminalLeg(previousLeg);
  }

  function compareAssistantTraBoardCandidate(a, b) {
    if (!a) return 1;
    if (!b) return -1;
    const byDep = (b.effectiveDepTimestamp ?? -Infinity) - (a.effectiveDepTimestamp ?? -Infinity);
    if (byDep) return byDep;
    const byTransfer = (a.transferCount ?? Infinity) - (b.transferCount ?? Infinity);
    if (byTransfer) return byTransfer;
    const byArrival = (b.predecessor?.arrivalTimestamp ?? -Infinity) - (a.predecessor?.arrivalTimestamp ?? -Infinity);
    if (byArrival) return byArrival;
    return 0;
  }

  function selectAssistantTraTransferBoardCandidate(event, startName, options, frontiers, allowLocalOnly) {
    let best = null;
    if (event?.stationKey === normalizeLoose(startName)) {
      const depDate = getDisplayDateByAbs(event.entry.originDate, event.depAbs);
      const depClock = event.boardMeta.dep || event.boardMeta.arr || "";
      const depMin = timeToMin(depClock);
      if (depDate === options.dateStr && depMin !== null && matchesQueryTime(depMin, options) && (!options.useNow || event.depTimestamp >= options.nowTs - 60000)) {
        best = {
          predecessor: createAssistantTraTransferOriginState(startName),
          effectiveDepTimestamp: event.depTimestamp,
          transferCount: 0,
          transferInfo: null
        };
      }
    }

    const list = frontiers.get(event.stationKey) || [];
    for (let i = 0; i < list.length; i += 1) {
      const node = list[i];
      if ((node.arrivalTimestamp ?? Infinity) > (event.depTimestamp ?? -Infinity)) break;
      if (node.lastTrainKey && node.lastTrainKey === event.trainKey) continue;
      const previousRide = findAssistantTraLastRideState(node);
      if (isAssistantTraLocalTransferBlocked(previousRide, event, allowLocalOnly)) continue;
      const transferInfo = buildAssistantTraTransferInfo(node, event);
      if (!transferInfo) continue;
      if (!Number.isFinite(transferInfo.waitMin) || transferInfo.waitMin < 3 || transferInfo.waitMin > 90) continue;
      const candidate = {
        predecessor: node,
        effectiveDepTimestamp: node.effectiveDepTimestamp,
        transferCount: (node.transferCount || 0) + 1,
        transferInfo
      };
      if (compareAssistantTraBoardCandidate(candidate, best) < 0) best = candidate;
    }
    return best;
  }

  function createAssistantTraRideState(event, candidate, endIdx) {
    const arriveMeta = event?.entry?.meta?.[endIdx];
    if (!arriveMeta || !Number.isFinite(arriveMeta.arrTimestamp)) return null;
    if ((arriveMeta.arrTimestamp ?? -Infinity) <= (event.depTimestamp ?? -Infinity)) return null;
    return {
      kind: "ride",
      parent: candidate.predecessor,
      stationKey: arriveMeta.key,
      stationName: arriveMeta.name,
      arrivalTimestamp: arriveMeta.arrTimestamp,
      effectiveDepTimestamp: candidate.effectiveDepTimestamp,
      transferCount: candidate.transferCount,
      lastTrainKey: event.trainKey,
      boardingTransfer: candidate.transferInfo,
      leg: {
        key: `${event.trainKey}|${event.boardIdx}|${endIdx}`,
        trainKey: event.trainKey,
        trainNo: String(event.entry.trainNo || ""),
        type: event.entry.type,
        originDate: event.entry.originDate,
        startIdx: event.boardIdx,
        endIdx,
        stopCount: event.entry.meta.length,
        startStation: event.boardMeta.name,
        endStation: arriveMeta.name,
        depAbs: event.depAbs,
        arrAbs: arriveMeta.arrAbs,
        depTimestamp: event.depTimestamp,
        arrTimestamp: arriveMeta.arrTimestamp,
        dep: event.boardMeta.dep || event.boardMeta.arr || "",
        arr: arriveMeta.arr || arriveMeta.dep || ""
      }
    };
  }

  function collectAssistantTraTransferChain(stateNode) {
    const nodes = [];
    let cursor = stateNode;
    while (cursor) {
      nodes.push(cursor);
      cursor = cursor.parent;
    }
    return nodes.reverse();
  }

  function buildAssistantTraTransferText(transferStations, waitMins) {
    if (!transferStations.length) return "直達";
    if (transferStations.length === 1) return `${transferStations[0]} 轉乘 ${waitMins[0]} 分`;
    return `${transferStations.join("/")} 轉乘 ${waitMins.join("/")} 分`;
  }

  function buildAssistantTraTransferPlan(stateNode, startName, endName) {
    const chain = collectAssistantTraTransferChain(stateNode);
    const rideStates = chain.filter((node) => node?.kind === "ride" && node.leg);
    if (!rideStates.length || !Number.isFinite(stateNode?.effectiveDepTimestamp)) return null;
    const legs = rideStates.map((node) => ({ ...node.leg }));
    const transfers = rideStates.slice(1).map((node) => node.boardingTransfer).filter(Boolean);
    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];
    const totalMin = Math.round(((lastLeg.arrTimestamp ?? 0) - (stateNode.effectiveDepTimestamp ?? 0)) / 60000);
    if (!Number.isFinite(totalMin) || totalMin < 0) return null;
    const transferStations = transfers.map((item) => item.station);
    const waitMins = transfers.map((item) => item.waitMin);
    const first = {
      trainNo: firstLeg.trainNo,
      type: firstLeg.type,
      dep: firstLeg.dep,
      arr: transfers[0]?.arriveSched || lastLeg.arr
    };
    const secondLeg = legs[1] || null;
    const second = secondLeg ? {
      trainNo: secondLeg.trainNo,
      type: secondLeg.type,
      dep: secondLeg.dep,
      arr: lastLeg.arr
    } : null;
    return {
      transfer: transferStations[0] || "",
      first,
      second,
      legs,
      transfers,
      transferStations,
      waitMin: waitMins[0] ?? null,
      waitMins,
      transferCount: transfers.length,
      minWaitMin: waitMins.length ? Math.min(...waitMins) : Infinity,
      totalMin,
      duration: formatDurationMinutes(totalMin),
      depTimestamp: stateNode.effectiveDepTimestamp,
      arrTimestamp: lastLeg.arrTimestamp,
      dep: firstLeg.dep,
      arr: lastLeg.arr,
      startStation: startName,
      endStation: endName,
      transferText: buildAssistantTraTransferText(transferStations, waitMins),
    };
  }

  function compareAssistantTraTransferPlan(a, b) {
    const byTotal = (a?.totalMin ?? Infinity) - (b?.totalMin ?? Infinity);
    if (byTotal) return byTotal;
    const byTransfer = (a?.transferCount ?? Infinity) - (b?.transferCount ?? Infinity);
    if (byTransfer) return byTransfer;
    return (b?.depTimestamp ?? -Infinity) - (a?.depTimestamp ?? -Infinity);
  }

  function pruneAssistantTraTransferPlans(plans) {
    const fallback = [];
    const normal = [];
    (plans || []).forEach((plan) => {
      if (plan?.isTightFallback) fallback.push(plan);
      else normal.push(plan);
    });
    const sorted = normal.slice().sort((a, b) => {
      const depDiff = (a?.depTimestamp ?? Infinity) - (b?.depTimestamp ?? Infinity);
      if (depDiff) return depDiff;
      const arrDiff = (b?.arrTimestamp ?? -Infinity) - (a?.arrTimestamp ?? -Infinity);
      if (arrDiff) return arrDiff;
      return (b?.transferCount ?? Infinity) - (a?.transferCount ?? Infinity);
    });
    const keptReverse = [];
    let bestArrival = Infinity;
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      const plan = sorted[i];
      if (Number.isFinite(plan?.arrTimestamp) && plan.arrTimestamp >= bestArrival) continue;
      if (Number.isFinite(plan?.arrTimestamp)) bestArrival = plan.arrTimestamp;
      keptReverse.push(plan);
    }
    const kept = keptReverse.reverse();
    const seen = new Set(kept.map((plan) => `${plan.depTimestamp}|${plan.arrTimestamp}|${(plan.transferStations || []).join("/")}|${(plan.waitMins || []).join("/")}`));
    fallback.forEach((plan) => {
      const key = `${plan.depTimestamp}|${plan.arrTimestamp}|${(plan.transferStations || []).join("/")}|${(plan.waitMins || []).join("/")}`;
      if (seen.has(key)) return;
      seen.add(key);
      kept.push(plan);
    });
    kept.sort((a, b) => (a?.depTimestamp ?? Infinity) - (b?.depTimestamp ?? Infinity) || (a?.arrTimestamp ?? Infinity) - (b?.arrTimestamp ?? Infinity));
    return kept;
  }

  function collectTransfer(dataset, startName, endName, options) {
    if (!Array.isArray(dataset) || !dataset.length) return [];
    const cacheKey = [
      assistantRouteCache.date || options?.dateStr || "",
      normalizeLoose(startName || ""),
      normalizeLoose(endName || ""),
      simplifyTypeName(options?.typePreference || "").replace(/\s+/g, ""),
      Number.isFinite(options?.timeStartMin) ? options.timeStartMin : "",
      Number.isFinite(options?.timeEndMin) ? options.timeEndMin : "",
      options?.hasTimeFilter ? "1" : "0",
      dataset.length
    ].join("|");
    if (assistantTraTransferSearchCache.has(cacheKey)) return (assistantTraTransferSearchCache.get(cacheKey) || []).slice();

    const allowLocalOnly = isAssistantTraLocalOnlySelection(options?.typePreference);
    const bundle = getAssistantTraTransferBundle(dataset, options?.typePreference);
    const reverseIndex = buildAssistantTraReverseReachability(bundle, endName);
    const frontiers = new Map();
    const rawPlans = [];
    const queryOptions = {
      ...(options || {}),
      useNow: options?.dateStr === getTodayDateStr() && !options?.hasTimeFilter,
      nowTs: Date.now()
    };

    (bundle.boardEvents || []).forEach((event) => {
      if (!reverseIndex.boardReachableKeys.has(`${event.trainKey}|${event.boardIdx}`)) return;
      const candidate = selectAssistantTraTransferBoardCandidate(event, startName, queryOptions, frontiers, allowLocalOnly);
      if (!candidate) return;
      for (let endIdx = event.boardIdx + 1; endIdx < event.entry.meta.length; endIdx += 1) {
        const arriveMeta = event.entry.meta[endIdx];
        const arrTimestamp = arriveMeta?.arrTimestamp ?? arriveMeta?.depTimestamp;
        if (!canAssistantTraReverseStopReachEnd(reverseIndex, arriveMeta?.name, arrTimestamp)) continue;
        const rideState = createAssistantTraRideState(event, candidate, endIdx);
        if (!rideState) continue;
        if (!insertAssistantTraTransferState(frontiers, rideState, allowLocalOnly)) continue;
        if (rideState.stationKey === normalizeLoose(endName)) {
          const plan = buildAssistantTraTransferPlan(rideState, startName, endName);
          if (plan) rawPlans.push(plan);
        }
      }
    });

    const bestByFirstTrain = new Map();
    rawPlans.forEach((plan) => {
      const key = `${plan?.first?.trainNo || ""}|${plan?.legs?.[0]?.originDate || ""}`;
      const current = bestByFirstTrain.get(key);
      if (!current || compareAssistantTraTransferPlan(plan, current) < 0) {
        bestByFirstTrain.set(key, plan);
      }
    });

    let plans = Array.from(bestByFirstTrain.values());
    const directMinByLastTrain = new Map();
    plans.forEach((plan) => {
      if ((plan?.transferCount || 0) === 0) directMinByLastTrain.set(String(plan?.first?.trainNo || ""), plan.totalMin);
    });
    plans = plans.filter((plan) => {
      if (!plan || (plan.transferCount || 0) === 0) return true;
      const lastTrainNo = String(plan.legs?.[plan.legs.length - 1]?.trainNo || "");
      const directMin = directMinByLastTrain.get(lastTrainNo);
      if (directMin === undefined) return true;
      return Number(plan.totalMin) < Number(directMin);
    });

    const directs = plans.filter((plan) => (plan?.transferCount || 0) === 0);
    const transferGroups = new Map();
    plans.filter((plan) => (plan?.transferCount || 0) > 0).forEach((plan) => {
      const lastLeg = plan.legs?.[plan.legs.length - 1];
      const key = `${String(lastLeg?.trainNo || "")}|${String(lastLeg?.originDate || "")}|${String(plan.arr || "")}`;
      if (!transferGroups.has(key)) transferGroups.set(key, []);
      transferGroups.get(key).push(plan);
    });

    const keptTransfers = [];
    transferGroups.forEach((group) => {
      group.sort(compareAssistantTraTransferPlan);
      const best = group[0];
      if (best) keptTransfers.push(best);
      const second = group[1];
      if (second && Number.isFinite(best?.minWaitMin) && best.minWaitMin < 10) {
        second.isTightFallback = true;
        keptTransfers.push(second);
      }
    });

    const finalPlans = pruneAssistantTraTransferPlans(directs.concat(keptTransfers)).slice(0, 18);
    assistantTraTransferSearchCache.set(cacheKey, finalPlans.slice());
    return finalPlans;
  }

  function collectStation(dataset, stationName, options) {
    const useNow = options.dateStr === getTodayDateStr() && !options.hasTimeFilter;
    const nowTs = Date.now();
    const all = (dataset || []).map((train) => {
      const idx = getStopMapIndex(train.stopMap, stationName);
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
        originDate: train.originDate,
        time,
        timeTimestamp: timeDT.getTime(),
        rangeStart: train.stops[0] ? train.stops[0].name : "--",
        rangeEnd: train.stops[train.stops.length - 1] ? train.stops[train.stops.length - 1].name : "--",
        range: `${train.stops[0] ? train.stops[0].name : "--"} → ${train.stops[train.stops.length - 1] ? train.stops[train.stops.length - 1].name : "--"}`,
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
          const liveIndex = getStopMapIndex(train.stopMap, liveStation);
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

    const targetIndex = getStopMapIndex(train.stopMap, targetStation);
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

    const targetIndex = getStopMapIndex(train.stopMap, targetStation);
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

  function setAssistantRenderTargetFromNode(node) {
    if (!node || typeof node.closest !== "function") return null;
    const bubble = node.closest(".assistant-message-bubble") || node.closest("#assistantAnswer");
    if (bubble) {
      window.assistantRenderTarget = bubble;
      window.assistantLastRenderTarget = bubble;
    }
    return bubble || null;
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

  function findAssistantDatasetTrain(sys, trainNo, originDate, queryDate) {
    const dataset = sys === "thsr" ? assistantRouteCache.thsr : assistantRouteCache.tra;
    const variants = trainVariants(trainNo, sys);
    if (!Array.isArray(dataset) || !dataset.length || !variants.length) return null;
    return dataset.find((item) => variants.includes(String(item.trainNo || "").toUpperCase()) && originDate && item.originDate === originDate)
      || dataset.find((item) => variants.includes(String(item.trainNo || "").toUpperCase()) && queryDate && item.originDate === queryDate)
      || dataset.find((item) => variants.includes(String(item.trainNo || "").toUpperCase()))
      || null;
  }

  async function assistantShowHomeTrainDetail(triggerOrSys, sysOrTrainNo, trainNoOrOriginDate, originDateOrQueryDate, queryDateOrTargetStation, targetStationMaybe) {
    const triggeredFromNode = triggerOrSys && typeof triggerOrSys === "object" && typeof triggerOrSys.closest === "function";
    const safeSys = (triggeredFromNode ? sysOrTrainNo : triggerOrSys) === "thsr" ? "thsr" : "tr";
    const safeTrainNo = String(triggeredFromNode ? trainNoOrOriginDate : sysOrTrainNo || "").trim().toUpperCase();
    const originDate = String(triggeredFromNode ? originDateOrQueryDate : trainNoOrOriginDate || "").trim();
    const queryDate = String(triggeredFromNode ? queryDateOrTargetStation : originDateOrQueryDate || "").trim();
    const targetStation = triggeredFromNode ? targetStationMaybe : queryDateOrTargetStation;
    const dateStr = String(queryDate || originDate || getTodayDateStr()).trim() || getTodayDateStr();
    if (triggeredFromNode) setAssistantRenderTargetFromNode(triggerOrSys);
    if (!safeTrainNo) {
      renderError("找不到可顯示的車次。");
      return;
    }
    try {
      renderLoading("正在整理車次資訊", `正在整理 ${safeTrainNo} 次的最新摘要。`);
      await ensureData(dateStr, [safeSys]);
      const train = findAssistantDatasetTrain(safeSys, safeTrainNo, originDate, dateStr);
      if (!train) {
        renderError(`找不到 ${safeTrainNo} 次在 ${formatDateLabel(dateStr)} 的資料。`);
        return;
      }
      const normalizedTarget = targetStation ? resolveLocalStationName(targetStation, safeSys) : "";
      const intent = {
        kind: "train",
        dateStr,
        dateLabel: formatDateLabel(dateStr),
        preference: safeSys,
        trainNoRaw: safeTrainNo,
        targetRaw: normalizedTarget || targetStation || "",
        showStops: true,
        timeStartMin: null,
        timeEndMin: null,
        timeLabel: "",
        hasTimeFilter: false,
      };
      const result = safeSys === "tr"
        ? await buildTraTrain(train, intent, normalizedTarget)
        : await buildThsrTrain(train, intent, normalizedTarget);
      renderTrain(intent, [result]);
    } catch (error) {
      renderError(error?.message || `整理 ${safeTrainNo} 次資料時發生錯誤。`);
    }
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
      <div class="rail-ai-switch">
        <div>
          <div class="rail-ai-title">
            <strong>${escapeHtml(title || "請先選擇查詢系統")}</strong>
          </div>
          <p class="rail-ai-note">${escapeHtml(detail || "這個問題同時可能是臺鐵或高鐵，先選一個系統再繼續查詢。")}</p>
        </div>
        <div class="rail-ai-actions">
          ${(systems || []).map((sys, index) => `
            <button class="rail-ai-btn ${index === 0 ? "primary" : ""}" type="button" onclick='assistantResolveSystemQuery(${JSON.stringify(rawText)}, ${JSON.stringify(sys)})'>前往 ${sys === "tr" ? "臺鐵" : "高鐵"} 詳細查詢</button>
          `).join("")}
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
        <p class="rail-ai-note">已用和臺鐵 / 高鐵頁 AI 相同的卡片方式整理；需要更多資訊時可以直接按「更多班次」、「更早班次」或「更晚班次」。</p>
        <div class="rail-ai-collection">
          ${results.map((result) => {
            const directItems = Array.isArray(result.direct?.items) ? result.direct.items : (result.direct?.matches || []);
            const directPageSize = getResultPageSize("direct");
            const directPage = getPagedItems(directItems, view.direct[result.sys], directPageSize);
            const transferItems = (Array.isArray(result.transfers) ? result.transfers : []).filter((item) => (item?.transferCount || 0) > 0);
            const transferPageSize = getResultPageSize("transfer");
            const transferPage = getPagedItems(transferItems, view.transfer[result.sys], transferPageSize);
            const directHtml = directPage.items.length ? `
              <div class="rail-ai-list">
                ${directPage.items.map((service) => `
                  <article class="rail-ai-card">
                    <div class="rail-ai-card-main">
                      <strong>${escapeHtml(service.trainNo)} 次${result.sys === "tr" ? ` ${renderTraTypeInline(service.type)}` : ""}</strong>
                      <p class="rail-ai-line">${escapeHtml(service.depDisplay || service.dep)} ${renderStationLabel(result.start, result.sys)} 出發 → ${escapeHtml(service.arrDisplay || service.arr)} ${renderStationLabel(result.end, result.sys)} 抵達</p>
                      <p class="rail-ai-subline">${escapeHtml(service.duration)}${service.stopCount > 0 ? ` ｜ 中途 ${service.stopCount} 站` : " ｜ 直達"}${service.liveStatusText ? ` ｜ 目前狀態 ${escapeHtml(service.liveStatusText)}` : ""}${service.hasAdjustedTime ? ` ｜ 原定 ${escapeHtml(service.dep)}→${escapeHtml(service.arr)}` : ""}</p>
                    </div>
                    <div class="rail-ai-actions">
                      <button class="rail-ai-btn" type="button" onclick='assistantShowHomeTrainDetail(this, ${JSON.stringify(result.sys)}, ${JSON.stringify(service.trainNo)}, ${JSON.stringify(service.originDate || "")}, ${JSON.stringify(intent.dateStr)}, ${JSON.stringify(result.end)})'>查看詳情</button>
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
                      <strong>${buildHomeAssistantTransferTrainHtml(item)}</strong>
                      <p class="rail-ai-line">${buildHomeAssistantTransferLineHtml(item, result.start, result.end, result.sys)}</p>
                      <p class="rail-ai-subline">${buildHomeAssistantTransferMetaHtml(item)}</p>
                    </div>
                    <div class="rail-ai-actions">
                      <button class="rail-ai-btn" type="button" onclick='openAppOverlay("tr", { start: ${JSON.stringify(result.start)}, end: ${JSON.stringify(result.end)} })'>查看轉乘詳細</button>
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
                    directItems.length > directPageSize ? `目前顯示 ${directPage.offset + 1}-${directPage.end} / ${directPage.total}` : "",
                    [
                      directPage.hasPrev ? `<button class="rail-ai-btn" type="button" onclick='assistantShiftRoutePage(${JSON.stringify(result.sys)}, "direct", -${directPageSize}, ${JSON.stringify(stateId)})'>更早班次</button>` : "",
                      directPage.hasNext ? `<button class="rail-ai-btn primary" type="button" onclick='assistantShiftRoutePage(${JSON.stringify(result.sys)}, "direct", ${directPageSize}, ${JSON.stringify(stateId)})'>${getRouteNextLabel("direct", directPage.offset)}</button>` : "",
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
                      transferItems.length > transferPageSize ? `目前顯示 ${transferPage.offset + 1}-${transferPage.end} / ${transferPage.total}` : "",
                      [
                        transferPage.hasPrev ? `<button class="rail-ai-btn" type="button" onclick='assistantShiftRoutePage(${JSON.stringify(result.sys)}, "transfer", -${transferPageSize}, ${JSON.stringify(stateId)})'>更早轉乘</button>` : "",
                        transferPage.hasNext ? `<button class="rail-ai-btn primary" type="button" onclick='assistantShiftRoutePage(${JSON.stringify(result.sys)}, "transfer", ${transferPageSize}, ${JSON.stringify(stateId)})'>${getRouteNextLabel("transfer", transferPage.offset)}</button>` : "",
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

  function buildHomeAssistantTransferTrainHtml(plan) {
    const legs = Array.isArray(plan?.legs) ? plan.legs : [];
    if (!legs.length) {
      const first = plan?.first?.trainNo ? `${escapeHtml(plan.first.trainNo)} 次${renderTraTypeInline(plan.first.type)}` : "";
      const second = plan?.second?.trainNo ? `${escapeHtml(plan.second.trainNo)} 次${renderTraTypeInline(plan.second.type)}` : "";
      return [first, second].filter(Boolean).join(" → ");
    }
    return legs.map((leg) => `${escapeHtml(leg.trainNo || "--")} 次${renderTraTypeInline(leg.type || "列車")}`).join(" → ");
  }

  function buildHomeAssistantTransferLineHtml(plan, startName, endName, sys) {
    const transferStations = Array.isArray(plan?.transferStations) ? plan.transferStations : [];
    const waitMins = Array.isArray(plan?.waitMins) ? plan.waitMins : [];
    const transferText = transferStations.length
      ? `${transferStations.map((station) => renderStationLabel(station, sys)).join("/")} 轉乘 ${escapeHtml(waitMins.join("/"))} 分`
      : "直達";
    return `${escapeHtml(plan?.dep || plan?.first?.dep || "--")} ${renderStationLabel(startName, sys)} 出發 ｜ ${transferText} ｜ ${escapeHtml(plan?.arr || plan?.second?.arr || "--")} 抵達 ${renderStationLabel(endName, sys)}`;
  }

  function buildHomeAssistantTransferMetaHtml(plan) {
    const legs = Array.isArray(plan?.legs) ? plan.legs : [];
    const legText = legs.length
      ? legs.map((leg, index) => `第 ${index + 1} 段 ${renderTraTypeInline(leg.type || "列車")}`).join(" ｜ ")
      : [plan?.first?.type ? `第 1 段 ${renderTraTypeInline(plan.first.type)}` : "", plan?.second?.type ? `第 2 段 ${renderTraTypeInline(plan.second.type)}` : ""].filter(Boolean).join(" ｜ ");
    return `總耗時 ${escapeHtml(plan?.duration || "--")}${legText ? ` ｜ ${legText}` : ""}`;
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
          intent.startRaw && intent.targetRaw ? `查詢區間 ${intent.startRaw} → ${intent.targetRaw}` : "",
          intent.targetRaw ? `目標站 ${intent.targetRaw}` : "",
          intent.showStops ? "顯示更多停靠站" : "",
        ])}
        <p class="rail-ai-note">這裡會先整理目前位置、狀態、預估到站與後續停靠；呈現方式和臺鐵 / 高鐵頁 AI 相同，優先保留最有用的資訊。</p>
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
        <p class="rail-ai-note">會先顯示最接近你指定日期與時間的班次；按鈕可繼續往前看更早班次，或往後展開更多與更晚的班次。</p>
        <div class="rail-ai-collection">
          ${results.map((result) => {
            const serviceItems = Array.isArray(result.services?.items) ? result.services.items : (result.services?.matches || []);
            const stationPageSize = getResultPageSize("station");
            const servicePage = getPagedItems(serviceItems, view.station[result.sys], stationPageSize);
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
                        <div class="rail-ai-actions">
                          <button class="rail-ai-btn" type="button" onclick='assistantShowHomeTrainDetail(this, ${JSON.stringify(result.sys)}, ${JSON.stringify(item.trainNo)}, ${JSON.stringify(item.originDate || "")}, ${JSON.stringify(intent.dateStr)}, ${JSON.stringify(result.station)})'>查看詳情</button>
                        </div>
                      </article>
                    `).join("")}
                  </div>
                ` : `<div class="rail-ai-empty">這個日期與時間條件下沒有找到可顯示的班次。</div>`}
                ${renderPager(
                  serviceItems.length > stationPageSize ? `目前顯示 ${servicePage.offset + 1}-${servicePage.end} / ${servicePage.total}` : "",
                  [
                    servicePage.hasPrev ? `<button class="rail-ai-btn" type="button" onclick='assistantShiftStationPage(${JSON.stringify(result.sys)}, -${stationPageSize}, ${JSON.stringify(stateId)})'>更早班次</button>` : "",
                    servicePage.hasNext ? `<button class="rail-ai-btn primary" type="button" onclick='assistantShiftStationPage(${JSON.stringify(result.sys)}, ${stationPageSize}, ${JSON.stringify(stateId)})'>${servicePage.offset > 0 ? "更晚班次" : "更多班次"}</button>` : "",
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

  const ASSISTANT_TRA_WEB_BOOKING_DEFAULTS = Object.freeze({
    ticketType: "1",
    ticketCount: 1,
  });

  function assistantNormalizeTraBookingStationName(stationName) {
    const raw = String(stationName || "").trim();
    if (!raw) return "";
    return String(resolveLocalStationName(raw, "tr") || raw).replace(/台/g, "臺");
  }

  function assistantNormalizeTraBookingOptions(options) {
    const raw = (typeof options === "object" && options !== null) ? options : { ticketCount: options };
    const ticketType = ["1", "2", "3"].includes(String(raw.ticketType || "").trim())
      ? String(raw.ticketType).trim()
      : ASSISTANT_TRA_WEB_BOOKING_DEFAULTS.ticketType;
    const ticketCount = Math.max(1, Math.min(9, parseInt(raw.ticketCount, 10) || ASSISTANT_TRA_WEB_BOOKING_DEFAULTS.ticketCount));
    return {
      ticketType,
      ticketCount,
      trainNo: raw.trainNo || "",
      startStation: raw.startStation || raw.start || "",
      endStation: raw.endStation || raw.end || "",
      dateStr: raw.dateStr || raw.date || "",
    };
  }

  function assistantBuildTraTicketCountOptions(max, selected) {
    const limit = Math.max(1, Math.min(9, parseInt(max, 10) || 9));
    const current = Math.max(1, Math.min(limit, parseInt(selected, 10) || 1));
    let out = "";
    for (let i = 1; i <= limit; i += 1) {
      out += `<option value="${i}"${i === current ? " selected" : ""}>${i} 張</option>`;
    }
    return out;
  }

  function assistantBuildTraBookingContextHtml(config) {
    const start = escapeHtml(assistantNormalizeTraBookingStationName(config?.startStation || "") || "--");
    const end = escapeHtml(assistantNormalizeTraBookingStationName(config?.endStation || "") || "--");
    const date = escapeHtml(String(config?.dateStr || "").trim() || "--");
    const trainNo = escapeHtml(String(config?.trainNo || "").trim() || "--");
    return [
      `<div class="assistant-booking-context-route">${start} <span style="opacity:.4">→</span> ${end}</div>`,
      `<div class="assistant-booking-context-meta">乘車日期 ${date} · 車次 ${trainNo}</div>`
    ].join("");
  }

  function assistantBuildTraBookingHeaders(token) {
    if (typeof window.buildTdxAuthHeaders === "function") {
      return window.buildTdxAuthHeaders(token);
    }
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (window.TDX_CONFIG?.clientId || TDX_CONFIG?.clientId) {
      headers["x-api-key"] = window.TDX_CONFIG?.clientId || TDX_CONFIG.clientId;
    }
    return headers;
  }

  async function assistantRequestTraBookingApi(apiUrl) {
    const readErrorText = async (response) => {
      try {
        const raw = await response.text();
        return String(raw || "").trim();
      } catch (_) {
        return "";
      }
    };
    const requestOnce = async (forceRefresh = false) => {
      const token = typeof getAccessToken === "function"
        ? await getAccessToken(forceRefresh)
        : await ensureToken();
      if (!token) return { ok: false, status: 0, errorText: "授權失敗，無法連接 TDX" };
      const response = await fetchWithTimeout(apiUrl, {
        method: "GET",
        headers: assistantBuildTraBookingHeaders(token)
      }, 8000);
      return { ok: response.ok, response };
    };

    let result = await requestOnce(false);
    if ((result.response?.status === 401 || result.response?.status === 403) && typeof getAccessToken === "function") {
      result = await requestOnce(true);
    }
    if (!result.response) {
      return { ok: false, status: result.status || 0, errorText: result.errorText || "授權失敗" };
    }
    const errorText = result.response.ok ? "" : await readErrorText(result.response);
    let payload = null;
    let rawText = "";
    try {
      rawText = await result.response.text();
      payload = rawText ? JSON.parse(rawText) : null;
    } catch (_) {
      payload = rawText ? rawText.trim() : null;
    }
    return {
      ok: result.response.ok,
      status: result.response.status,
      errorText,
      payload
    };
  }

  async function assistantOpenTraBookingWeb(trainNo, startStationName, endStationName, dateStr, options = 1) {
    const booking = assistantNormalizeTraBookingOptions(options);
    const startStation = assistantNormalizeTraBookingStationName(startStationName);
    const endStation = assistantNormalizeTraBookingStationName(endStationName);
    const departureDate = String(dateStr || "").trim();
    const departureNumber = String(trainNo || "").trim();
    if (!startStation || !endStation || !departureDate || !departureNumber) {
      alert("缺少台鐵官網訂票所需的起訖站、日期或車次資訊。");
      return false;
    }

    const params = new URLSearchParams({
      start_station: startStation,
      end_station: endStation,
      departure_date: departureDate,
      departure_number: departureNumber,
      ticket_type: booking.ticketType,
      ticket_count: String(booking.ticketCount)
    });
    const apiUrl = `https://tdx.transportdata.tw/api/maas-tra/booking/deeplink/web/tra?${params.toString()}`;

    try {
      const result = await assistantRequestTraBookingApi(apiUrl);
      if (!result.ok) {
        const suffix = result.errorText ? `\n${result.errorText}` : "";
        alert(`台鐵官網訂票連結取得失敗${result.status ? `（HTTP ${result.status}）` : ""}${suffix}`);
        return false;
      }
      const payload = result.payload;
      const jumpUrl = typeof payload === "string"
        ? payload
        : (payload?.url || payload?.data?.url || payload?.data?.deeplink || payload?.DeepLinkUrl || payload?.link || "");
      if (!jumpUrl) {
        console.error("TRA web deeplink payload unexpected:", payload);
        alert("無法取得台鐵官網訂票連結。");
        return false;
      }
      assistantOpenExternalBookingUrl(jumpUrl);
      return true;
    } catch (error) {
      console.error("TRA assistant web deeplink error:", error);
      alert("系統發生錯誤，暫時無法開啟台鐵官網訂票。");
      return false;
    }
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
          width: min(480px, calc(100vw - 32px));
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 34%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 32px 72px rgba(2, 6, 23, 0.42);
          color: #e2e8f0;
          overflow: hidden;
        }
        body.light-mode .assistant-booking-modal-content {
          background:
            radial-gradient(circle at top left, rgba(37,99,235,0.12), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
          color: #0f172a;
          border-color: rgba(148, 163, 184, 0.22);
          box-shadow: 0 28px 68px rgba(15, 23, 42, 0.16);
        }
        .assistant-booking-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px 12px;
        }
        .assistant-booking-modal-title-main {
          font-size: 1.12rem;
          font-weight: 800;
          line-height: 1.3;
        }
        .assistant-booking-modal-title-sub {
          margin-top: 6px;
          color: rgba(226, 232, 240, 0.78);
          font-size: 0.92rem;
          line-height: 1.55;
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
          padding: 0 24px 22px;
        }
        .assistant-booking-context {
          display: grid;
          gap: 4px;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,0.16);
          background: linear-gradient(180deg, rgba(15,23,42,0.84), rgba(15,23,42,0.68));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        body.light-mode .assistant-booking-context {
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.78));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.66);
        }
        .assistant-booking-context-route {
          font-size: 1rem;
          font-weight: 900;
          line-height: 1.35;
          color: inherit;
        }
        .assistant-booking-context-meta {
          color: rgba(226, 232, 240, 0.74);
          font-size: .84rem;
          font-weight: 700;
          line-height: 1.5;
        }
        body.light-mode .assistant-booking-context-meta {
          color: rgba(71, 85, 105, 0.88);
        }
        .assistant-booking-choice-grid {
          display: grid;
          gap: 12px;
          margin-top: 16px;
        }
        .assistant-booking-choice-action {
          min-height: 46px;
          justify-content: center;
        }
        .assistant-booking-choice-card {
          display: grid;
          gap: 10px;
          align-content: start;
          min-height: 176px;
          padding: 18px;
          border-radius: 24px;
          border: 1px solid rgba(148,163,184,0.18);
          text-align: left;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .assistant-booking-choice-card:hover,
        .assistant-booking-choice-card:focus-visible {
          transform: translateY(-2px);
          outline: none;
        }
        .assistant-booking-choice-card.is-app {
          color: #eff6ff;
          border-color: rgba(59,130,246,0.16);
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 34%),
            linear-gradient(145deg, #2563eb, #0f4fcf 62%, #163fa7);
          box-shadow: 0 20px 40px rgba(37,99,235,0.28);
        }
        .assistant-booking-choice-card.is-web {
          color: inherit;
          background: linear-gradient(180deg, rgba(15,23,42,0.82), rgba(15,23,42,0.66));
        }
        body.light-mode .assistant-booking-choice-card.is-web {
          background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,252,0.86));
        }
        .assistant-booking-choice-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          min-width: 64px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: .74rem;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .assistant-booking-choice-card.is-app .assistant-booking-choice-badge {
          background: rgba(255,255,255,0.18);
          color: #dbeafe;
        }
        .assistant-booking-choice-card.is-web .assistant-booking-choice-badge {
          background: rgba(59,130,246,0.16);
          color: #93c5fd;
        }
        body.light-mode .assistant-booking-choice-card.is-web .assistant-booking-choice-badge {
          background: rgba(37,99,235,0.1);
          color: #2563eb;
        }
        .assistant-booking-choice-card strong {
          font-size: 1.04rem;
          font-weight: 900;
          line-height: 1.35;
        }
        .assistant-booking-choice-copy {
          font-size: .9rem;
          line-height: 1.55;
          opacity: .9;
        }
        .assistant-booking-choice-note {
          margin-top: 14px;
          color: rgba(226, 232, 240, 0.7);
          font-size: .82rem;
          line-height: 1.6;
        }
        body.light-mode .assistant-booking-choice-note {
          color: rgba(71, 85, 105, 0.9);
        }
        .assistant-booking-web-grid {
          display: grid;
          gap: 14px;
          margin-top: 16px;
        }
        .assistant-booking-web-field {
          display: grid;
          gap: 8px;
        }
        .assistant-booking-web-label {
          color: inherit;
          font-size: .95rem;
          font-weight: 800;
        }
        .assistant-booking-type-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .assistant-booking-type-card {
          display: grid;
          gap: 8px;
          min-height: 122px;
          padding: 14px;
          border-radius: 20px;
          border: 1px solid rgba(148,163,184,0.18);
          background: linear-gradient(180deg, rgba(15,23,42,0.84), rgba(15,23,42,0.7));
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        body.light-mode .assistant-booking-type-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.84));
        }
        .assistant-booking-type-card:hover,
        .assistant-booking-type-card:focus-visible {
          transform: translateY(-1px);
          outline: none;
        }
        .assistant-booking-type-card.is-active {
          border-color: rgba(59,130,246,0.34);
          background: linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.84));
          box-shadow: 0 18px 34px rgba(37,99,235,0.2);
        }
        body.light-mode .assistant-booking-type-card.is-active {
          background: linear-gradient(180deg, rgba(219,234,254,0.92), rgba(239,246,255,0.82));
          box-shadow: 0 16px 34px rgba(37,99,235,0.12);
        }
        .assistant-booking-type-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          min-width: 44px;
          padding: 6px 8px;
          border-radius: 999px;
          background: rgba(59,130,246,0.16);
          color: #93c5fd;
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        body.light-mode .assistant-booking-type-chip {
          background: rgba(37,99,235,0.1);
          color: #2563eb;
        }
        .assistant-booking-type-title {
          font-size: .96rem;
          font-weight: 900;
          line-height: 1.35;
        }
        .assistant-booking-type-desc {
          color: rgba(226, 232, 240, 0.72);
          font-size: .8rem;
          line-height: 1.5;
        }
        body.light-mode .assistant-booking-type-desc {
          color: rgba(71, 85, 105, 0.88);
        }
        .assistant-booking-select {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(15, 23, 42, 0.92);
          color: inherit;
          padding: 10px 14px;
          font-size: 0.95rem;
          font-weight: 800;
          outline: none;
        }
        body.light-mode .assistant-booking-select {
          background: #fff;
          border-color: rgba(148, 163, 184, 0.28);
        }
        .assistant-booking-actions {
          display: grid;
          gap: 10px;
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
        @media (max-width: 720px) {
          .assistant-booking-modal {
            align-items: flex-end;
            padding: 0;
          }
          .assistant-booking-modal-content {
            width: 100%;
            max-width: none;
            border-radius: 28px 28px 0 0;
            max-height: min(88vh, 760px);
          }
          .assistant-booking-modal-header {
            position: relative;
            padding: 24px 18px 12px;
          }
          .assistant-booking-modal-header::before {
            content: "";
            position: absolute;
            top: 10px;
            left: 50%;
            width: 44px;
            height: 4px;
            border-radius: 999px;
            transform: translateX(-50%);
            background: rgba(148,163,184,0.38);
          }
          .assistant-booking-modal-body {
            padding: 0 18px 18px;
          }
          .assistant-booking-actions {
            position: sticky;
            bottom: 0;
            padding-top: 6px;
            background: linear-gradient(180deg, rgba(15,23,42,0), rgba(15,23,42,0.92) 30%, rgba(15,23,42,0.98));
          }
          body.light-mode .assistant-booking-actions {
            background: linear-gradient(180deg, rgba(248,250,252,0), rgba(248,250,252,0.92) 30%, rgba(248,250,252,0.98));
          }
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
              <div class="assistant-booking-modal-title-sub">行動版可直接打開「台鐵 e 訂通」App，也可以改走台鐵官網訂票。</div>
            </div>
            <button class="assistant-booking-close" id="assistantBookingChoiceClose" type="button" aria-label="關閉">×</button>
          </div>
          <div class="assistant-booking-modal-body">
            <div id="assistantBookingChoiceContext" class="assistant-booking-context"></div>
            <div class="assistant-booking-choice-grid">
              <button class="assistant-booking-btn-primary assistant-booking-choice-action" id="assistantBookingChoiceApp" type="button">使用台鐵 e 訂通 App</button>
              <button class="assistant-booking-btn-ghost assistant-booking-choice-action" id="assistantBookingChoiceWeb" type="button">使用台鐵官網訂票</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    if (!document.getElementById("assistantBookingWebModal")) {
      const modal = document.createElement("div");
      modal.id = "assistantBookingWebModal";
      modal.className = "assistant-booking-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "設定臺鐵官網訂票條件");
      modal.innerHTML = `
        <div class="assistant-booking-modal-content">
          <div class="assistant-booking-modal-header">
            <div>
              <div class="assistant-booking-modal-title-main">台鐵官網訂票設定</div>
            </div>
            <button class="assistant-booking-close" id="assistantBookingWebClose" type="button" aria-label="關閉">×</button>
          </div>
          <div class="assistant-booking-modal-body">
            <div id="assistantBookingWebContext" class="assistant-booking-context"></div>
            <div class="assistant-booking-web-grid">
              <label class="assistant-booking-web-field" for="assistantBookingWebTicketType">
                <span class="assistant-booking-web-label">車票類型</span>
                <select id="assistantBookingWebTicketType" class="assistant-booking-select" aria-label="車票類型">
                  <option value="1">一般訂票</option>
                  <option value="2">騰雲座艙</option>
                  <option value="3">兩鐵訂票</option>
                </select>
              </label>
              <label class="assistant-booking-web-field" for="assistantBookingWebTicketCount">
                <span class="assistant-booking-web-label">車票張數</span>
                <select id="assistantBookingWebTicketCount" class="assistant-booking-select" aria-label="車票張數"></select>
              </label>
              <div class="assistant-booking-actions">
                <button class="assistant-booking-btn-primary" id="assistantBookingWebConfirm" type="button">前往台鐵官網訂票</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  }

  function assistantShowTraWebBookingDialog(defaults) {
    ensureAssistantTraBookingModals();
    const modal = document.getElementById("assistantBookingWebModal");
    const closeBtn = document.getElementById("assistantBookingWebClose");
    const confirmBtn = document.getElementById("assistantBookingWebConfirm");
    const contextEl = document.getElementById("assistantBookingWebContext");
    const typeSelect = document.getElementById("assistantBookingWebTicketType");
    const countSelect = document.getElementById("assistantBookingWebTicketCount");
    if (!modal || !closeBtn || !confirmBtn || !contextEl || !typeSelect || !countSelect) {
      return Promise.resolve(null);
    }

    const config = assistantNormalizeTraBookingOptions(defaults || {});
    contextEl.innerHTML = assistantBuildTraBookingContextHtml(config);
    typeSelect.value = config.ticketType;
    countSelect.innerHTML = assistantBuildTraTicketCountOptions(9, config.ticketCount);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (payload) => {
        if (settled) return;
        settled = true;
        modal.style.display = "none";
        closeBtn.removeEventListener("click", onCancel);
        confirmBtn.removeEventListener("click", onConfirm);
        modal.removeEventListener("click", onBackdrop);
        document.removeEventListener("keydown", onKeydown);
        resolve(payload);
      };
      const onCancel = () => finish(null);
      const onBackdrop = (event) => { if (event.target === modal) finish(null); };
      const onKeydown = (event) => { if (event.key === "Escape") finish(null); };
      const onConfirm = () => {
        finish({
          ticketType: String(typeSelect.value || ASSISTANT_TRA_WEB_BOOKING_DEFAULTS.ticketType),
          ticketCount: Math.max(1, Math.min(9, parseInt(countSelect.value, 10) || 1))
        });
      };

      closeBtn.addEventListener("click", onCancel);
      confirmBtn.addEventListener("click", onConfirm);
      modal.addEventListener("click", onBackdrop);
      document.addEventListener("keydown", onKeydown);
      modal.style.display = "flex";
      setTimeout(() => { try { typeSelect.focus(); } catch (_) {} }, 0);
    });
  }

  async function assistantStartTraWebBookingFlow(baseOptions, dialogDefaults) {
    const bookingOptions = await assistantShowTraWebBookingDialog({ ...(dialogDefaults || {}), ...(baseOptions || {}) });
    if (!bookingOptions) return false;
    return assistantOpenTraBookingWeb(
      baseOptions?.trainNo,
      baseOptions?.startStation,
      baseOptions?.endStation,
      baseOptions?.dateStr,
      bookingOptions
    );
  }

  function assistantAskTraBookingChoice(context) {
    ensureAssistantTraBookingModals();
    const modal = document.getElementById("assistantBookingChoiceModal");
    const appBtn = document.getElementById("assistantBookingChoiceApp");
    const webBtn = document.getElementById("assistantBookingChoiceWeb");
    const closeBtn = document.getElementById("assistantBookingChoiceClose");
    const contextEl = document.getElementById("assistantBookingChoiceContext");
    if (!modal || !appBtn || !webBtn || !closeBtn || !contextEl) return Promise.resolve("app");

    contextEl.innerHTML = assistantBuildTraBookingContextHtml(assistantNormalizeTraBookingOptions(context || {}));

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
      setTimeout(() => { try { appBtn.focus(); } catch (_) {} }, 0);
    });
  }

  function assistantAskTraSeatQuantity(defaultQty = 1) {
    return assistantShowTraWebBookingDialog({
      ticketType: ASSISTANT_TRA_WEB_BOOKING_DEFAULTS.ticketType,
      ticketCount: defaultQty
    }).then((payload) => payload ? payload.ticketCount : null);
  }

  function assistantOpenExternalBookingUrl(jumpUrl) {
    const href = String(jumpUrl || "").trim();
    if (!href) return false;

    let targetWindow = window;
    try {
      if (window.top && window.top !== window) targetWindow = window.top;
    } catch (_) {
      targetWindow = window;
    }

    try {
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.rel = "noopener";
      anchor.target = targetWindow === window ? "_self" : "_top";
      anchor.style.display = "none";
      (document.body || document.documentElement).appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (_) {}

    window.setTimeout(() => {
      if (document.visibilityState === "hidden") return;
      try {
        if (typeof targetWindow.location.assign === "function") targetWindow.location.assign(href);
        else targetWindow.location.href = href;
      } catch (_) {
        window.location.href = href;
      }
    }, 180);

    return true;
  }

  function assistantShouldUseTraWebFallbackForBookingError(statusCode, errorText) {
    const text = String(errorText || "").trim();
    if (statusCode === 401 || statusCode === 403) return true;
    return /Missing required realm role|required scope\/role|Access key not found/i.test(text);
  }

  async function assistantMaybeFallbackTraBookingToWeb(baseOptions, errorText) {
    const msg = [
      "台鐵 App 訂票連結目前無法取得。",
      errorText ? `TDX 回應：${errorText}` : "TDX 目前拒絕這筆 App deeplink 請求。",
      "是否改用台鐵官網訂票？"
    ].join("\n");
    if (!window.confirm(msg)) return false;
    return assistantStartTraWebBookingFlow(baseOptions, ASSISTANT_TRA_WEB_BOOKING_DEFAULTS);
  }

  async function assistantOpenTraBooking(trainNo, startStationName, endStationName, dateStr) {
    const bookingBase = {
      trainNo: String(trainNo || "").trim(),
      startStation: startStationName || "",
      endStation: endStationName || "",
      dateStr: String(dateStr || "").trim()
    };

    if (assistantIsDesktopDevice()) {
      await assistantStartTraWebBookingFlow(bookingBase, ASSISTANT_TRA_WEB_BOOKING_DEFAULTS);
      return;
    }

    const bookingChoice = await assistantAskTraBookingChoice(bookingBase);
    if (bookingChoice === "cancel") return;
    if (bookingChoice === "web") {
      await assistantStartTraWebBookingFlow(bookingBase, ASSISTANT_TRA_WEB_BOOKING_DEFAULTS);
      return;
    }

    try {
      const start = assistantNormalizeTraBookingStationName(startStationName);
      const end = assistantNormalizeTraBookingStationName(endStationName);
      const apiUrl = `https://tdx.transportdata.tw/api/maas-tra/booking/deeplink/direct/tra?start_station=${encodeURIComponent(start)}&end_station=${encodeURIComponent(end)}&train_date=${encodeURIComponent(bookingBase.dateStr)}&train_number=${encodeURIComponent(bookingBase.trainNo)}`;
      const result = await assistantRequestTraBookingApi(apiUrl);
      if (!result.ok) {
        if (assistantShouldUseTraWebFallbackForBookingError(result.status, result.errorText)) {
          const fallbackUsed = await assistantMaybeFallbackTraBookingToWeb(bookingBase, result.errorText);
          if (fallbackUsed) return;
        }
        const suffix = result.errorText ? `\n${result.errorText}` : "";
        alert(`台鐵 App 訂票連結取得失敗${result.status ? `（HTTP ${result.status}）` : ""}${suffix}`);
        return;
      }
      const payload = result.payload;
      const jumpUrl = typeof payload === "string"
        ? payload
        : (payload?.data?.deeplink || payload?.DeepLinkUrl || payload?.url || payload?.link || "");
      if (!jumpUrl) {
        alert("目前拿不到臺鐵訂票連結。");
        return;
      }
      assistantOpenExternalBookingUrl(jumpUrl);
    } catch (error) {
      console.error("TRA assistant direct deeplink error:", error);
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
      assistantOpenExternalBookingUrl(jumpUrl);
    } catch (_) {
      alert("高鐵訂票連結建立失敗，請稍後再試。");
    }
  }

  window.assistantOpenTraBooking = assistantOpenTraBooking;
  window.assistantOpenTHSRBooking = assistantOpenTHSRBooking;
  window.assistantShowHomeTrainDetail = assistantShowHomeTrainDetail;
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
    const pageSize = getResultPageSize(key === "transfer" ? "transfer" : "direct");
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
    const next = getPagedItems(items, current + Number(delta || 0), getResultPageSize("station")).offset;
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
  window.handleAssistantQuery = async function (rawText, options = {}) {
    ensureAssistantUpgradeStyles();
    const text = String(rawText || "").trim();
    const silent = !!options?.silent;
    if (!text) {
      renderError("請直接輸入問題，例如：今天 7:30 台北到台中、215 車次到花蓮、板橋站晚上有什麼車。");
      return;
    }

    if ((!stationDB.tr || !stationDB.tr.length) || (!stationDB.thsr || !stationDB.thsr.length)) {
      if (!silent) renderLoading("正在讀取車站資料", "第一次查詢時會先載入臺鐵與高鐵站名資料。");
      if (typeof fetchAllStations === "function") await fetchAllStations();
    }
    await window.RailAssistantCommon?.ensureStationLocaleData?.();

    const intent = parseIntent(text);
    if (!intent) {
      renderError("目前還無法判斷你的問題，請試試：台北到左營、215 車次到花蓮、板橋站 7 點後班次。");
      return;
    }
    assistantLastQueryText = text;

    if (!silent) renderLoading("正在分析問題", "正在整理最接近的班次、車次與車站結果。");

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
          direct.matches = direct.items.slice(0, getResultPageSize("direct"));
        }

        direct.items = await addTodayLiveStatus(item.sys, direct.items, intent.dateStr);
        direct.matches = direct.items.slice(0, getResultPageSize("direct"));

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
      await ensureData(intent.dateStr, systems);
      const results = [];
      for (const sys of matchedSystems.length ? matchedSystems : systems) {
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
    document.addEventListener("DOMContentLoaded", () => {
      ensureAssistantUpgradeStyles();
      initAssistantAutoRefresh();
    }, { once: true });
  } else {
    ensureAssistantUpgradeStyles();
    initAssistantAutoRefresh();
  }

  window.addEventListener("rail:languagechange", () => {
    rerenderAssistantState();
  });
})();
