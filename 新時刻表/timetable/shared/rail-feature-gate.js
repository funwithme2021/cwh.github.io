(function () {
  if (window.RailFeatureGate) return;

  const STORAGE_KEY = "rail_feature_gate_state_v1";
  const MIN_REPEAT_LOG_MS = 1200;
  const ACCESS_GRACE_MS = 2500;
  const DEFAULT_WINDOW_MS = 2 * 60 * 1000;
  const DEFAULT_LIMIT = 4;
  const CHALLENGE_TYPES = ["image", "slider", "click", "memory", "route"];
  const CLICK_ITEMS = [
    { id: "train", label: "火車", icon: "🚆" },
    { id: "ticket", label: "車票", icon: "🎫" },
    { id: "platform", label: "月台", icon: "🚉" },
    { id: "clock", label: "時鐘", icon: "🕒" },
    { id: "route", label: "地圖", icon: "🗺️" },
    { id: "seat", label: "座位", icon: "💺" },
    { id: "alert", label: "提醒", icon: "🔔" },
    { id: "bag", label: "行李", icon: "🧳" },
    { id: "flower", label: "花卉", icon: "🌸" },
    { id: "sun", label: "太陽", icon: "☀️" },
    { id: "rain", label: "雨", icon: "🌧️" },
    { id: "dog", label: "狗", icon: "🐶" },
    { id: "cat", label: "貓", icon: "🐱" },
    { id: "food", label: "食物", icon: "🍔" },
    { id: "fruit", label: "水果", icon: "🍇" },
    { id: "gay", label: " LGBTQ+ ", icon: "🏳️‍🌈" },
  ];
  const IMAGE_SELECTION_CATEGORIES = [
    {
      id: "train",
      label: "列車",
      emojis: ["🚆", "🚄", "🚈", "🚇"],
      stamps: ["", "", "", ""],
      palette: { start: "#dbeafe", end: "#eff6ff", frame: "#1d4ed8", soft: "#93c5fd" },
    },
    {
      id: "bag",
      label: "行李",
      emojis: ["👜", "🎒","👛","🧳"],
      stamps: ["", ""],
      palette: { start: "#dcfce7", end: "#f0fdf4", frame: "#15803d", soft: "#86efac" },
    },
    {
      id: "alert",
      label: "提醒",
      emojis: ["⚠️", "🚷", "⛔", "🔔"],
      stamps: ["", ""],
      palette: { start: "#dcfce7", end: "#f0fdf4", frame: "#15803d", soft: "#86efac" },
    },
    {
      id: "route",
      label: "地圖",
      emojis: ["🛣️", "🌎","🌐","🗾","🧭"],
      stamps: ["", ""],
      palette: { start: "#dcfce7", end: "#f0fdf4", frame: "#15803d", soft: "#86efac" },
    },
    {
      id: "clock",
      label: "時鐘",
      emojis: ["⏱️", "⏰","⌚","🕰️","⌛"],
      stamps: ["", ""],
      palette: { start: "#dcfce7", end: "#f0fdf4", frame: "#15803d", soft: "#86efac" },
    },

  ];
  const ROUTE_GROUPS = [
    {
      network: "台鐵縱貫北段",
      directionForward: "南下",
      directionReverse: "北上",
      stations: ["基隆", "七堵", "汐止", "南港", "松山", "台北", "板橋", "樹林", "鶯歌", "桃園"],
    },
    {
      network: "台鐵西部中段",
      directionForward: "南下",
      directionReverse: "北上",
      stations: ["新竹", "竹南", "苗栗", "豐原", "台中", "彰化", "員林", "斗六", "嘉義"],
    },
    {
      network: "高鐵北中段",
      directionForward: "南下",
      directionReverse: "北上",
      stations: ["南港", "台北", "板橋", "桃園", "新竹", "苗栗", "台中"],
    },
    {
      network: "高鐵中南段",
      directionForward: "南下",
      directionReverse: "北上",
      stations: ["台中", "彰化", "雲林", "嘉義", "台南", "左營"],
    },
  ];
  const FEATURES = {
    ai: { label: "AI 功能", accent: "#2563eb" },
    "live-tracker": { label: "即時動態", accent: "#0891b2" },
    "master-table": { label: "時刻總表", accent: "#7c3aed" },
    "operation-diagram": { label: "運行圖", accent: "#ea580c" },
  };

  let memoryState = {};
  const inFlight = new Map();

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return memoryState;
    }
  }

  function writeState(state) {
    memoryState = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
    }
  }

  function clearState() {
    memoryState = {};
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
    }
  }

  function shouldResetForFreshHomeStart() {
    try {
      const path = String(location.pathname || "").toLowerCase();
      const params = new URLSearchParams(location.search);
      if (params.get("embed") === "1") return false;
      return /\/home(?:\/index\.html)?$/.test(path);
    } catch (_) {
      return false;
    }
  }

  if (shouldResetForFreshHomeStart()) {
    clearState();
  }

  function getFeatureMeta(feature, options) {
    const base = FEATURES[feature] || {};
    return {
      label: options?.label || base.label || "功能",
      accent: options?.accent || base.accent || "#2563eb",
      windowMs: Number.isFinite(options?.windowMs) ? options.windowMs : DEFAULT_WINDOW_MS,
      limit: Number.isFinite(options?.limit) ? options.limit : DEFAULT_LIMIT,
    };
  }

  function normalizeRecord(record) {
    return {
      verifiedAt: Number(record?.verifiedAt || 0) || 0,
      grantedUntil: Number(record?.grantedUntil || 0) || 0,
      recent: Array.isArray(record?.recent)
        ? record.recent.map((value) => Number(value)).filter((value) => Number.isFinite(value))
        : [],
    };
  }

  function pruneRecent(recent, windowMs, now) {
    return (recent || []).filter((ts) => Number.isFinite(ts) && now - ts <= windowMs);
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(list) {
    const next = Array.isArray(list) ? list.slice() : [];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(0, index);
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }

  function pickRandomType(previousType) {
    const pool = CHALLENGE_TYPES.filter((type) => type !== previousType);
    const candidates = pool.length ? pool : CHALLENGE_TYPES;
    return candidates[randomInt(0, candidates.length - 1)];
  }

  function sampleItems(list, count) {
    return shuffle(list).slice(0, count);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function generateCaptchaCode(length) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let text = "";
    for (let i = 0; i < length; i += 1) {
      text += chars[randomInt(0, chars.length - 1)];
    }
    return text;
  }

  function buildImageCaptchaDataUrl(code, accent) {
    const charNodes = code.split("").map((char, index) => {
      const x = 108 + index * 94 + randomInt(-10, 10);
      const y = 122 + randomInt(-8, 8);
      const rotate = randomInt(-18, 18);
      const opacity = (88 + randomInt(0, 10)) / 100;
      return `<text x="${x}" y="${y}" text-anchor="middle" font-size="82" font-weight="900" transform="rotate(${rotate} ${x} ${y})" fill="${accent}" fill-opacity="${opacity}" font-family="Segoe UI, Arial, sans-serif">${char}</text>`;
    }).join("");

    const lines = Array.from({ length: 7 }, () => {
      return `<line x1="${randomInt(0, 680)}" y1="${randomInt(12, 208)}" x2="${randomInt(0, 680)}" y2="${randomInt(12, 208)}" stroke="${accent}" stroke-opacity="0.34" stroke-width="${randomInt(2, 4)}" />`;
    }).join("");

    const dots = Array.from({ length: 28 }, () => {
      return `<circle cx="${randomInt(16, 664)}" cy="${randomInt(18, 202)}" r="${randomInt(1, 3)}" fill="${accent}" fill-opacity="0.22" />`;
    }).join("");

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="680" height="220" viewBox="0 0 680 220">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f8fbff" />
            <stop offset="100%" stop-color="#e2e8f0" />
          </linearGradient>
        </defs>
        <rect width="680" height="220" rx="24" fill="url(#bg)" />
        <rect x="8" y="8" width="664" height="204" rx="18" fill="#ffffff" fill-opacity="0.66" />
        ${lines}
        ${dots}
        ${charNodes}
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function buildSelectionPictureDataUrl(categoryId, variantIndex) {
    const category = IMAGE_SELECTION_CATEGORIES.find((item) => item.id === categoryId) || IMAGE_SELECTION_CATEGORIES[0];
    const palette = category.palette;
    const emoji = category.emojis[variantIndex % category.emojis.length];
    const stamp = category.stamps[variantIndex % category.stamps.length];
    const scene = [
      `
        <circle cx="48" cy="44" r="22" fill="${palette.soft}" fill-opacity="0.45" />
        <circle cx="232" cy="134" r="26" fill="${palette.frame}" fill-opacity="0.08" />
        <path d="M28 136 C74 108, 156 108, 252 138" stroke="${palette.frame}" stroke-opacity="0.24" stroke-width="8" fill="none" />
      `,
      `
        <rect x="28" y="36" width="224" height="104" rx="24" fill="#ffffff" fill-opacity="0.56" />
        <path d="M44 56 H236" stroke="${palette.soft}" stroke-width="10" stroke-linecap="round" />
        <path d="M58 126 H222" stroke="${palette.frame}" stroke-opacity="0.22" stroke-width="8" stroke-linecap="round" />
      `,
      `
        <path d="M30 46 H250" stroke="${palette.frame}" stroke-opacity="0.18" stroke-width="12" stroke-linecap="round" />
        <path d="M50 138 H228" stroke="${palette.soft}" stroke-width="10" stroke-linecap="round" />
        <circle cx="78" cy="84" r="14" fill="${palette.soft}" fill-opacity="0.42" />
        <circle cx="204" cy="78" r="18" fill="${palette.frame}" fill-opacity="0.1" />
      `,
      `
        <rect x="40" y="28" width="200" height="124" rx="28" fill="#ffffff" fill-opacity="0.7" />
        <path d="M58 56 H220" stroke="${palette.frame}" stroke-opacity="0.18" stroke-width="8" stroke-linecap="round" />
        <path d="M58 122 H220" stroke="${palette.soft}" stroke-width="8" stroke-linecap="round" />
      `,
    ][variantIndex % 4];

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="280" height="180" viewBox="0 0 280 180">
        <defs>
          <linearGradient id="railSelBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${palette.start}" />
            <stop offset="100%" stop-color="${palette.end}" />
          </linearGradient>
        </defs>
        <rect width="280" height="180" rx="28" fill="url(#railSelBg)" />
        <rect x="10" y="10" width="260" height="160" rx="24" fill="#ffffff" fill-opacity="0.22" />
        ${scene}
        <rect x="26" y="22" width="68" height="28" rx="14" fill="${palette.frame}" fill-opacity="0.16" />
        <text x="60" y="41" text-anchor="middle" font-size="14" font-weight="800" fill="${palette.frame}" font-family="Segoe UI, Arial, sans-serif">${stamp}</text>
        <text x="140" y="108" text-anchor="middle" font-size="74" font-family="Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji, sans-serif">${emoji}</text>
        <rect x="52" y="132" width="176" height="10" rx="5" fill="${palette.frame}" fill-opacity="0.12" />
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function injectStyles() {
    if (document.getElementById("rail-feature-gate-style")) return;
    const style = document.createElement("style");
    style.id = "rail-feature-gate-style";
    style.textContent = `
      .rail-feature-gate-overlay{
        position:fixed;
        inset:0;
        z-index:2147483646;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(2,6,23,0.72);
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        opacity:0;
        transition:opacity .18s ease;
      }
      .rail-feature-gate-overlay.show{
        opacity:1;
      }
      .rail-feature-gate-inline{
        width:100%;
      }
      .rail-feature-gate-inline .rail-feature-gate-dialog{
        width:100%;
        max-width:none;
        box-shadow:none;
      }
      .rail-feature-gate-inline .rail-feature-gate-title{
        font-size:1.14rem;
      }
      .rail-feature-gate-dialog{
        width:min(480px, calc(100vw - 28px));
        border-radius:24px;
        border:1px solid rgba(148,163,184,0.22);
        background:linear-gradient(180deg, rgba(15,23,42,0.98), rgba(15,23,42,0.94));
        color:#e2e8f0;
        box-shadow:0 30px 70px rgba(2,6,23,0.42);
        padding:22px;
      }
      body.light-mode .rail-feature-gate-dialog{
        background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.95));
        color:#0f172a;
        border-color:rgba(15,23,42,0.12);
        box-shadow:0 24px 60px rgba(15,23,42,0.16);
      }
      .rail-feature-gate-kicker{
        display:inline-flex;
        align-items:center;
        gap:8px;
        min-height:34px;
        padding:0 12px;
        border-radius:999px;
        font-size:.8rem;
        font-weight:800;
        letter-spacing:.08em;
        background:rgba(37,99,235,0.16);
        color:var(--rail-gate-accent, #60a5fa);
        border:1px solid rgba(148,163,184,0.22);
      }
      .rail-feature-gate-title{
        margin:16px 0 8px;
        font-size:1.3rem;
        line-height:1.35;
      }
      .rail-feature-gate-lead{
        margin:0;
        color:#94a3b8;
        line-height:1.75;
        font-size:.95rem;
      }
      body.light-mode .rail-feature-gate-lead{
        color:#475569;
      }
      .rail-feature-gate-mode{
        margin-top:14px;
        display:inline-flex;
        align-items:center;
        gap:8px;
        min-height:32px;
        padding:0 12px;
        border-radius:999px;
        font-size:.8rem;
        font-weight:800;
        border:1px solid rgba(148,163,184,0.18);
        background:rgba(255,255,255,0.05);
      }
      .rail-feature-gate-box{
        position:relative;
        margin-top:14px;
        padding:16px;
        border-radius:20px;
        overflow:hidden;
        border:1px solid rgba(148,163,184,0.18);
        background:
          radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 28%),
          linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
        min-height:132px;
      }
      body.light-mode .rail-feature-gate-box{
        background:
          radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 28%),
          linear-gradient(180deg, rgba(248,250,252,0.95), rgba(241,245,249,0.92));
      }
      .rail-feature-gate-helper{
        margin-top:12px;
        color:#cbd5e1;
        font-size:.92rem;
        line-height:1.7;
      }
      body.light-mode .rail-feature-gate-helper{
        color:#334155;
      }
      .rail-feature-gate-challenge{
        margin-top:14px;
        display:flex;
        flex-direction:column;
        gap:12px;
      }
      .rail-feature-gate-row{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:10px;
      }
      .rail-feature-gate-input,
      .rail-feature-gate-slider{
        width:100%;
        min-height:46px;
        border-radius:14px;
        border:1px solid rgba(148,163,184,0.24);
        background:rgba(15,23,42,0.55);
        color:inherit;
        padding:0 14px;
        font:inherit;
      }
      .rail-feature-gate-input{
        letter-spacing:.18em;
        text-transform:uppercase;
      }
      body.light-mode .rail-feature-gate-input,
      body.light-mode .rail-feature-gate-slider{
        background:#ffffff;
        border-color:rgba(15,23,42,0.12);
      }
      .rail-feature-gate-input:focus,
      .rail-feature-gate-slider:focus{
        outline:none;
        border-color:var(--rail-gate-accent, #60a5fa);
        box-shadow:0 0 0 3px rgba(96,165,250,0.16);
      }
      .rail-feature-gate-refresh,
      .rail-feature-gate-cancel,
      .rail-feature-gate-confirm{
        min-height:46px;
        border-radius:14px;
        border:1px solid rgba(148,163,184,0.2);
        padding:0 14px;
        font:inherit;
        font-weight:700;
        cursor:pointer;
      }
      .rail-feature-gate-refresh,
      .rail-feature-gate-cancel{
        background:rgba(255,255,255,0.06);
        color:inherit;
      }
      body.light-mode .rail-feature-gate-refresh,
      body.light-mode .rail-feature-gate-cancel{
        background:#ffffff;
      }
      .rail-feature-gate-confirm{
        background:var(--rail-gate-accent, #2563eb);
        color:#ffffff;
        border-color:transparent;
      }
      .rail-feature-gate-actions{
        margin-top:14px;
        display:flex;
        justify-content:flex-end;
        gap:10px;
      }
      .rail-feature-gate-error{
        min-height:22px;
        margin-top:10px;
        color:#fda4af;
        font-size:.9rem;
      }
      body.light-mode .rail-feature-gate-error{
        color:#b91c1c;
      }
      .rail-feature-gate-image{
        display:block;
        width:100%;
        max-width:100%;
        height:auto;
        border-radius:16px;
        border:1px solid rgba(148,163,184,0.18);
        background:#ffffff;
      }
      .rail-feature-gate-slider-board{
        display:flex;
        flex-direction:column;
        gap:14px;
      }
      .rail-feature-gate-slider-track{
        position:relative;
        height:18px;
        border-radius:999px;
        background:rgba(148,163,184,0.18);
        overflow:visible;
      }
      .rail-feature-gate-slider-fill{
        position:absolute;
        inset:0 auto 0 0;
        width:var(--slider-progress, 0%);
        border-radius:999px;
        background:linear-gradient(90deg, var(--rail-gate-accent, #60a5fa), rgba(255,255,255,0.88));
      }
      .rail-feature-gate-slider-target{
        position:absolute;
        top:50%;
        left:var(--slider-target, 50%);
        width:4px;
        height:32px;
        transform:translate(-50%, -50%);
        border-radius:999px;
        background:#f8fafc;
        box-shadow:0 0 0 2px rgba(15,23,42,0.2);
      }
      .rail-feature-gate-slider-train{
        position:absolute;
        top:50%;
        left:var(--slider-progress, 0%);
        transform:translate(-50%, -58%);
        font-size:1.4rem;
        line-height:1;
      }
      .rail-feature-gate-slider-labels{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        color:#cbd5e1;
        font-size:.84rem;
        font-weight:700;
      }
      body.light-mode .rail-feature-gate-slider-labels{
        color:#475569;
      }
      .rail-feature-gate-slider-meta{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        color:#cbd5e1;
        font-size:.84rem;
        font-weight:700;
      }
      body.light-mode .rail-feature-gate-slider-meta{
        color:#475569;
      }
      .rail-feature-gate-click-targets{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }
      .rail-feature-gate-target-chip{
        display:inline-flex;
        align-items:center;
        gap:6px;
        min-height:34px;
        padding:0 12px;
        border-radius:999px;
        border:1px solid rgba(148,163,184,0.18);
        background:rgba(255,255,255,0.06);
        font-size:.86rem;
        font-weight:700;
      }
      .rail-feature-gate-target-chip.active{
        border-color:var(--rail-gate-accent, #60a5fa);
        background:rgba(96,165,250,0.18);
      }
      .rail-feature-gate-target-chip.done{
        border-color:rgba(34,197,94,0.36);
        background:rgba(34,197,94,0.18);
      }
      .rail-feature-gate-click-grid{
        display:grid;
        grid-template-columns:repeat(3, minmax(0, 1fr));
        gap:10px;
      }
      .rail-feature-gate-click-btn{
        min-height:74px;
        border-radius:18px;
        border:1px solid rgba(148,163,184,0.18);
        background:rgba(255,255,255,0.06);
        color:inherit;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:6px;
        cursor:pointer;
        transition:transform .18s ease, border-color .18s ease, background .18s ease;
      }
      .rail-feature-gate-click-btn:hover{
        transform:translateY(-1px);
        border-color:var(--rail-gate-accent, #60a5fa);
      }
      .rail-feature-gate-click-btn.done{
        border-color:rgba(34,197,94,0.36);
        background:rgba(34,197,94,0.18);
      }
      .rail-feature-gate-click-btn[disabled]{
        cursor:not-allowed;
        opacity:.58;
        transform:none;
      }
      .rail-feature-gate-click-btn span{
        font-size:1.35rem;
        line-height:1;
      }
      .rail-feature-gate-click-btn strong{
        font-size:.82rem;
      }
      .rail-feature-gate-click-btn small{
        font-size:.72rem;
        color:#94a3b8;
      }
      body.light-mode .rail-feature-gate-click-btn small{
        color:#64748b;
      }
      .rail-feature-gate-click-btn.is-photo{
        min-height:146px;
        padding:10px;
        align-items:stretch;
        justify-content:flex-start;
        gap:10px;
      }
      .rail-feature-gate-click-photo{
        display:block;
        width:100%;
        aspect-ratio:14 / 9;
        object-fit:cover;
        border-radius:14px;
        border:1px solid rgba(148,163,184,0.18);
        background:#ffffff;
      }
      .rail-feature-gate-click-btn.is-photo small{
        text-align:center;
        font-weight:700;
      }
      .rail-feature-gate-sequence-strip{
        display:grid;
        grid-template-columns:repeat(auto-fit, minmax(88px, 1fr));
        gap:10px;
      }
      .rail-feature-gate-sequence-card{
        min-height:82px;
        border-radius:18px;
        border:1px solid rgba(148,163,184,0.18);
        background:rgba(255,255,255,0.06);
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:6px;
        padding:10px 8px;
        text-align:center;
      }
      .rail-feature-gate-sequence-card strong{
        font-size:1.15rem;
        line-height:1;
      }
      .rail-feature-gate-sequence-card small{
        font-size:.72rem;
        color:#cbd5e1;
      }
      body.light-mode .rail-feature-gate-sequence-card small{
        color:#64748b;
      }
      .rail-feature-gate-sequence-card.pending{
        border-color:var(--rail-gate-accent, #60a5fa);
        box-shadow:0 0 0 2px rgba(96,165,250,0.14) inset;
      }
      .rail-feature-gate-sequence-card.done{
        border-color:rgba(34,197,94,0.36);
        background:rgba(34,197,94,0.18);
      }
      .rail-feature-gate-sequence-card.hidden strong{
        filter:blur(6px);
        opacity:.5;
      }
      .rail-feature-gate-sequence-card.hidden small{
        opacity:.78;
      }
      .rail-feature-gate-status-note{
        margin-top:10px;
        display:inline-flex;
        align-items:center;
        gap:8px;
        min-height:32px;
        padding:0 12px;
        border-radius:999px;
        border:1px solid rgba(148,163,184,0.18);
        background:rgba(255,255,255,0.05);
        font-size:.82rem;
        font-weight:700;
      }
      @media (max-width: 520px){
        .rail-feature-gate-dialog{
          padding:18px;
          border-radius:20px;
        }
        .rail-feature-gate-row{
          grid-template-columns:1fr;
        }
        .rail-feature-gate-actions{
          flex-direction:column-reverse;
        }
        .rail-feature-gate-cancel,
        .rail-feature-gate-confirm{
          width:100%;
        }
        .rail-feature-gate-click-grid{
          grid-template-columns:repeat(2, minmax(0, 1fr));
        }
      }
    `;
    document.head.appendChild(style);
  }

  function buildChallengeMarkup(meta, reasonText, options) {
    const inline = !!options?.inline;
    return `
      <div class="rail-feature-gate-kicker">安全驗證</div>
      <h2 class="rail-feature-gate-title" id="railFeatureGateTitle">${escapeHtml(meta.label)} 需要先通過驗證</h2>
      <p class="rail-feature-gate-lead">${escapeHtml(reasonText)}</p>
      <div class="rail-feature-gate-mode" id="railFeatureGateMode"></div>
      <div class="rail-feature-gate-box" id="railFeatureGateBox"></div>
      <div class="rail-feature-gate-helper" id="railFeatureGateHelper"></div>
      <div class="rail-feature-gate-challenge" id="railFeatureGateChallenge"></div>
      <div class="rail-feature-gate-error" id="railFeatureGateError" aria-live="polite"></div>
      <div class="rail-feature-gate-actions">
        <button type="button" class="rail-feature-gate-refresh" id="railFeatureGateRefresh">換一題</button>
        ${inline ? "" : '<button type="button" class="rail-feature-gate-cancel" id="railFeatureGateCancel">取消</button>'}
        <button type="button" class="rail-feature-gate-confirm" id="railFeatureGateConfirm">確認</button>
      </div>
    `;
  }

  function createImageChallenge(ctx) {
    const code = generateCaptchaCode(5);
    ctx.mode.textContent = "圖片驗證碼";
    ctx.helper.textContent = "請輸入圖片中的英數字。若看不清楚，可按「換一題」重新產生。";
    ctx.box.innerHTML = `<img class="rail-feature-gate-image" src="${buildImageCaptchaDataUrl(code, ctx.meta.accent)}" alt="圖片驗證碼">`;
    ctx.challenge.innerHTML = `
      <div class="rail-feature-gate-row">
        <input id="railFeatureGateTextInput" class="rail-feature-gate-input" type="text" maxlength="6" inputmode="latin" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="輸入驗證碼">
        <button type="button" class="rail-feature-gate-refresh" id="railFeatureGateRefreshInline">換一題</button>
      </div>
    `;
    const input = ctx.challenge.querySelector("#railFeatureGateTextInput");
    const inlineRefresh = ctx.challenge.querySelector("#railFeatureGateRefreshInline");
    input.addEventListener("input", () => {
      input.value = String(input.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      ctx.setError("");
    });
    inlineRefresh.addEventListener("click", () => ctx.refresh());
    return {
      type: "image",
      shouldResetOnFail: true,
      focus() {
        input.focus();
      },
      validate() {
        const value = String(input.value || "").trim().toUpperCase();
        if (!value) return { ok: false, message: "請先輸入圖片驗證碼。" };
        if (value !== code) return { ok: false, message: "圖片驗證碼不正確，已重新產生新的題目。" };
        return { ok: true };
      },
    };
  }

  function createSliderChallenge(ctx) {
    const target = randomInt(18, 82);
    let current = 0;

    function renderBoard() {
      ctx.box.innerHTML = `
        <div class="rail-feature-gate-slider-board">
          <div class="rail-feature-gate-slider-track" style="--slider-progress:${current}%; --slider-target:${target}%;">
            <span class="rail-feature-gate-slider-fill"></span>
            <span class="rail-feature-gate-slider-target"></span>
            <span class="rail-feature-gate-slider-train">🚆</span>
          </div>
          <div class="rail-feature-gate-slider-labels">
            <span>起點</span>
            <strong>請把列車滑到月台標記</strong>
            <span>終點</span>
          </div>
        </div>
      `;
    }

    ctx.mode.textContent = "滑塊驗證";
    ctx.helper.textContent = "拖動滑塊，把列車移動到白色月台標記附近。允許誤差 ±2。";
    ctx.challenge.innerHTML = `
      <input id="railFeatureGateSlider" class="rail-feature-gate-slider" type="range" min="0" max="100" step="1" value="0" aria-label="滑塊驗證">
      <div class="rail-feature-gate-slider-meta">
        <span id="railFeatureGateSliderValue">目前位置 0</span>
        <span>目標附近 ±2</span>
      </div>
    `;
    const slider = ctx.challenge.querySelector("#railFeatureGateSlider");
    const output = ctx.challenge.querySelector("#railFeatureGateSliderValue");
    slider.addEventListener("input", () => {
      current = Number(slider.value || 0);
      output.textContent = `目前位置 ${current}`;
      ctx.setError("");
      renderBoard();
    });
    renderBoard();
    return {
      type: "slider",
      shouldResetOnFail: false,
      focus() {
        slider.focus();
      },
      validate() {
        current = Number(slider.value || 0);
        if (Math.abs(current - target) > 2) {
          return { ok: false, message: `還沒對準月台標記，目前差 ${Math.abs(current - target)}。` };
        }
        return { ok: true };
      },
    };
  }

  function createClickChallenge(ctx) {
    const targetCategory = IMAGE_SELECTION_CATEGORIES[randomInt(0, IMAGE_SELECTION_CATEGORIES.length - 1)];
    const targetVariants = sampleItems(
      targetCategory.emojis.map((_, index) => index),
      3
    );
    const targets = targetVariants.map((variantIndex) => ({
      id: `${targetCategory.id}-${variantIndex}`,
      categoryId: targetCategory.id,
      label: targetCategory.label,
      src: buildSelectionPictureDataUrl(targetCategory.id, variantIndex),
    }));
    const filler = sampleItems(
      IMAGE_SELECTION_CATEGORIES.filter((category) => category.id !== targetCategory.id),
      3
    ).map((category, index) => {
      const variantIndex = randomInt(0, category.emojis.length - 1);
      return {
        id: `${category.id}-${variantIndex}-${index}`,
        categoryId: category.id,
        label: category.label,
        src: buildSelectionPictureDataUrl(category.id, variantIndex),
      };
    });
    const choices = shuffle(targets.concat(filler));
    const selected = new Set();

    function renderTargets() {
      ctx.box.innerHTML = `
        <div class="rail-feature-gate-helper" style="margin-top:0;">請找出全部 3 張不同的「${escapeHtml(targetCategory.label)}」圖片：</div>
        <div class="rail-feature-gate-click-targets" style="margin-top:12px;">
          ${targets.map((item, index) => `
            <span class="rail-feature-gate-target-chip${index < selected.size ? " done" : ""}${index === selected.size ? " active" : ""}">
              <strong>${index < selected.size ? "已找到" : "待找"}</strong>
              <span>${escapeHtml(item.label)}</span>
            </span>
          `).join("")}
        </div>
      `;
    }

    function renderChoices() {
      ctx.challenge.innerHTML = `
        <div class="rail-feature-gate-click-grid">
          ${choices.map((item) => `
            <button type="button" class="rail-feature-gate-click-btn is-photo${selected.has(item.id) ? " done" : ""}" data-click-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.label)} 圖片">
              <img class="rail-feature-gate-click-photo" src="${item.src}" alt="">
              <small>${selected.has(item.id) ? "已選取" : "候選圖片"}</small>
            </button>
          `).join("")}
        </div>
      `;
      ctx.challenge.querySelectorAll("[data-click-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = String(button.getAttribute("data-click-id") || "");
          const choice = choices.find((item) => item.id === id);
          if (!choice || selected.has(id)) return;
          if (choice.categoryId !== targetCategory.id) {
            ctx.refresh("選錯圖片了，已更換新的題目。");
            return;
          }
          selected.add(id);
          ctx.setError("");
          renderTargets();
          renderChoices();
          if (selected.size >= targets.length) {
            window.setTimeout(() => ctx.close(true), 160);
          }
        });
      });
    }

    ctx.mode.textContent = "圖片選擇";
    ctx.helper.textContent = "會出現同類型但不同圖案的圖片卡片，請把指定類型全部找出來。";
    renderTargets();
    renderChoices();
    return {
      type: "click",
      shouldResetOnFail: false,
      focus() {
        ctx.challenge.querySelector("[data-click-id]")?.focus();
      },
      validate() {
        if (selected.size < targets.length) {
          return { ok: false, message: `還沒找完全部 ${targets.length} 張${targetCategory.label}圖片。` };
        }
        return { ok: true };
      },
    };
  }

  function createMemoryChallenge(ctx) {
    const targets = sampleItems(CLICK_ITEMS, 4);
    const filler = sampleItems(CLICK_ITEMS.filter((item) => !targets.some((target) => target.id === item.id)), 2);
    const choices = shuffle(targets.concat(filler));
    const revealMs = 2800;
    let progress = 0;
    let revealed = true;
    let hideTimer = 0;

    function renderSequence() {
      ctx.box.innerHTML = `
        <div class="rail-feature-gate-sequence-strip">
          ${targets.map((item, index) => `
            <div class="rail-feature-gate-sequence-card${index < progress ? " done" : ""}${index === progress && !revealed ? " pending" : ""}${revealed ? "" : " hidden"}">
              <strong>${revealed ? escapeHtml(item.icon) : "?"}</strong>
              <small>${revealed ? escapeHtml(item.label) : `第 ${index + 1} 格`}</small>
            </div>
          `).join("")}
        </div>
        <div class="rail-feature-gate-status-note">${revealed ? "先記住這 4 個圖示的順序" : "請依照剛剛的順序點選"}</div>
      `;
    }

    function renderChoices() {
      ctx.challenge.innerHTML = `
        <div class="rail-feature-gate-click-grid">
          ${choices.map((item) => `
            <button type="button" class="rail-feature-gate-click-btn${targets.slice(0, progress).some((done) => done.id === item.id) ? " done" : ""}" data-memory-id="${escapeHtml(item.id)}"${revealed ? " disabled" : ""}>
              <span>${escapeHtml(item.icon)}</span>
              <strong>${escapeHtml(item.label)}</strong>
              <small>${revealed ? "記憶中" : "點我作答"}</small>
            </button>
          `).join("")}
        </div>
      `;
      ctx.challenge.querySelectorAll("[data-memory-id]").forEach((button) => {
        button.addEventListener("click", () => {
          if (revealed) return;
          const nextTarget = targets[progress];
          const id = String(button.getAttribute("data-memory-id") || "");
          if (!nextTarget) return;
          if (id !== nextTarget.id) {
            ctx.refresh("記憶順序不對，已更換新的題目。");
            return;
          }
          progress += 1;
          ctx.setError("");
          renderSequence();
          renderChoices();
          if (progress >= targets.length) {
            window.setTimeout(() => ctx.close(true), 160);
          }
        });
      });
    }

    function startRevealTimer() {
      hideTimer = window.setTimeout(() => {
        revealed = false;
        renderSequence();
        renderChoices();
        ctx.challenge.querySelector("[data-memory-id]")?.focus();
      }, revealMs);
    }

    ctx.mode.textContent = "記憶挑戰";
    ctx.helper.textContent = `先記住 4 個圖示順序，${(revealMs / 1000).toFixed(1)} 秒後蓋牌，再依序點出原本的答案。`;
    renderSequence();
    renderChoices();
    startRevealTimer();
    return {
      type: "memory",
      shouldResetOnFail: false,
      focus() {
        if (revealed) return;
        ctx.challenge.querySelector("[data-memory-id]")?.focus();
      },
      validate() {
        if (revealed) {
          return { ok: false, message: "題目還在顯示中，先記住順序再作答。" };
        }
        if (progress < targets.length) {
          return { ok: false, message: "請把整段記憶序列依序完成。" };
        }
        return { ok: true };
      },
      destroy() {
        if (hideTimer) {
          window.clearTimeout(hideTimer);
          hideTimer = 0;
        }
      },
    };
  }

  function createRouteChallenge(ctx) {
    const group = ROUTE_GROUPS[randomInt(0, ROUTE_GROUPS.length - 1)];
    const targetLength = randomInt(4, Math.min(5, group.stations.length - 2));
    const start = randomInt(0, group.stations.length - targetLength);
    const forward = Math.random() >= 0.5;
    const direction = forward ? group.directionForward : group.directionReverse;
    const targetIndexes = Array.from({ length: targetLength }, (_, offset) => start + offset);
    const orderedIndexes = forward ? targetIndexes : targetIndexes.slice().reverse();
    const targetStations = orderedIndexes.map((index) => ({
      id: `${group.network}-${index}-${group.stations[index]}`,
      label: group.stations[index],
      index,
    }));
    const nonTargetStations = group.stations
      .map((label, index) => ({
        id: `${group.network}-${index}-${label}`,
        label,
        index,
      }))
      .filter((item) => !targetIndexes.includes(item.index));
    const prioritizedFillers = [];
    [start - 1, start + targetLength].forEach((index) => {
      const station = nonTargetStations.find((item) => item.index === index);
      if (station && !prioritizedFillers.some((item) => item.index === station.index)) {
        prioritizedFillers.push(station);
      }
    });
    shuffle(nonTargetStations).forEach((station) => {
      if (prioritizedFillers.length >= Math.min(3, nonTargetStations.length)) return;
      if (!prioritizedFillers.some((item) => item.index === station.index)) {
        prioritizedFillers.push(station);
      }
    });
    const choices = shuffle(targetStations.concat(prioritizedFillers.slice(0, Math.min(3, nonTargetStations.length))));
    let progress = 0;

    function renderTrack() {
      ctx.box.innerHTML = `
        <div class="rail-feature-gate-helper" style="margin-top:0;">請依照 ${escapeHtml(direction)} 方向，把同一路線的這段站序點出來：</div>
        <div class="rail-feature-gate-sequence-strip" style="margin-top:12px;">
          ${targetStations.map((item, index) => `
            <div class="rail-feature-gate-sequence-card${index < progress ? " done" : ""}${index === progress ? " pending" : ""}">
              <strong>${index < progress ? escapeHtml(item.label) : "?"}</strong>
              <small>${index === 0 ? "起點" : index === targetStations.length - 1 ? "終點" : `第 ${index + 1} 站`}</small>
            </div>
          `).join("")}
        </div>
        <div class="rail-feature-gate-status-note">${escapeHtml(group.network)} ${escapeHtml(direction)} | 共 ${targetStations.length} 站 | 候選站都在同一路線</div>
      `;
    }

    function renderChoices() {
      ctx.challenge.innerHTML = `
        <div class="rail-feature-gate-click-grid">
          ${choices.map((item) => `
            <button type="button" class="rail-feature-gate-click-btn${targetStations.slice(0, progress).some((done) => done.id === item.id) ? " done" : ""}" data-route-id="${escapeHtml(item.id)}">
              <span>📍</span>
              <strong>${escapeHtml(item.label)}</strong>
              <small>同線候選站</small>
            </button>
          `).join("")}
        </div>
      `;
      ctx.challenge.querySelectorAll("[data-route-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const nextTarget = targetStations[progress];
          const id = String(button.getAttribute("data-route-id") || "");
          if (!nextTarget) return;
          if (id !== nextTarget.id) {
            ctx.refresh("站序錯了，已更換新的題目。");
            return;
          }
          progress += 1;
          ctx.setError("");
          renderTrack();
          renderChoices();
          if (progress >= targetStations.length) {
            window.setTimeout(() => ctx.close(true), 160);
          }
        });
      });
    }

    ctx.mode.textContent = "路線排序";
    ctx.helper.textContent = "候選站會全部來自同一路線，而且會混入鄰近干擾站，必須自己判斷正確站序。";
    renderTrack();
    renderChoices();
    return {
      type: "route",
      shouldResetOnFail: false,
      focus() {
        ctx.challenge.querySelector("[data-route-id]")?.focus();
      },
      validate() {
        if (progress < targetStations.length) {
          return { ok: false, message: "請把整段路線依序點完。" };
        }
        return { ok: true };
      },
    };
  }

  function buildChallenge(type, ctx) {
    if (type === "memory") return createMemoryChallenge(ctx);
    if (type === "route") return createRouteChallenge(ctx);
    if (type === "slider") return createSliderChallenge(ctx);
    if (type === "click") return createClickChallenge(ctx);
    return createImageChallenge(ctx);
  }

  function openCaptchaModal(feature, meta, reasonText) {
    injectStyles();
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "rail-feature-gate-overlay";
      overlay.innerHTML = `
        <div class="rail-feature-gate-dialog" style="--rail-gate-accent:${meta.accent};" role="dialog" aria-modal="true" aria-labelledby="railFeatureGateTitle">
          ${buildChallengeMarkup(meta, reasonText, { inline: false })}
        </div>
      `;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add("show"));

      const dialog = overlay.querySelector(".rail-feature-gate-dialog");
      let settled = false;

      let runtime = { destroy() {} };
      const close = (passed) => {
        if (settled) return;
        settled = true;
        document.body.style.overflow = previousOverflow;
        runtime.destroy();
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 180);
        resolve(!!passed);
      };

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close(false);
      });
      runtime = wireChallengeRuntime({
        feature,
        meta,
        root: dialog,
        box: dialog.querySelector("#railFeatureGateBox"),
        mode: dialog.querySelector("#railFeatureGateMode"),
        helper: dialog.querySelector("#railFeatureGateHelper"),
        challenge: dialog.querySelector("#railFeatureGateChallenge"),
        error: dialog.querySelector("#railFeatureGateError"),
        refreshButton: dialog.querySelector("#railFeatureGateRefresh"),
        cancelButton: dialog.querySelector("#railFeatureGateCancel"),
        confirmButton: dialog.querySelector("#railFeatureGateConfirm"),
        close,
      });
    });
  }

  function getReasonText(feature, meta) {
    const label = meta.label || (FEATURES[feature]?.label || "此功能");
    return {
      first: `這是你第一次使用${label}，請先完成驗證後再繼續。`,
      frequent: `短時間內使用${label}的次數較多，請再次完成驗證以繼續。`,
    };
  }

  function inspectRequirement(feature, options) {
    const meta = getFeatureMeta(feature, options);
    const now = Date.now();
    const state = readState();
    const record = normalizeRecord(state[feature]);
    const granted = !!(record.grantedUntil && record.grantedUntil >= now);
    if (!granted) {
      record.recent = pruneRecent(record.recent, meta.windowMs, now);
    }
    let reason = "";
    if (!granted) {
      if (!record.verifiedAt) reason = "first";
      else if (record.recent.length >= meta.limit) reason = "frequent";
    }
    return {
      feature,
      meta,
      state,
      record,
      now,
      granted,
      required: !granted && !!reason,
      reason,
    };
  }

  function grantAccess(requirement) {
    const accessNow = Date.now();
    const record = requirement.record;
    if (requirement.reason) {
      record.verifiedAt = accessNow;
      record.recent = [];
    }
    record.recent = pruneRecent(record.recent, requirement.meta.windowMs, accessNow);
    const latest = record.recent[record.recent.length - 1] || 0;
    if (!latest || accessNow - latest > MIN_REPEAT_LOG_MS) {
      record.recent.push(accessNow);
    }
    record.grantedUntil = accessNow + ACCESS_GRACE_MS;
    requirement.state[requirement.feature] = record;
    writeState(requirement.state);
    return true;
  }

  function wireChallengeRuntime(config) {
    const root = config.root;
    const box = config.box;
    const mode = config.mode;
    const helper = config.helper;
    const challenge = config.challenge;
    const error = config.error;
    const refreshButton = config.refreshButton;
    const cancelButton = config.cancelButton;
    const confirmButton = config.confirmButton;
    let currentChallenge = null;

    const setError = (message) => {
      error.textContent = message || "";
    };

    const setChallenge = (preferredType, message) => {
      currentChallenge?.destroy?.();
      const nextType = preferredType || pickRandomType(currentChallenge?.type);
      currentChallenge = buildChallenge(nextType, {
        feature: config.feature,
        meta: config.meta,
        box,
        mode,
        helper,
        challenge,
        close: config.close,
        setError,
        refresh(message) {
          setChallenge(null, message);
        },
      });
      setError(message || "");
      currentChallenge.focus?.();
    };

    const submit = () => {
      if (!currentChallenge) return;
      const result = currentChallenge.validate?.() || { ok: false, message: "驗證失敗。" };
      if (!result.ok) {
        setChallenge(null, result.message || "驗證失敗，已重新產生新的題目。");
        return;
      }
      config.close(true);
    };

    const onKeydown = (event) => {
      if (event.key === "Escape" && cancelButton) {
        event.preventDefault();
        config.close(false);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    };

    root.addEventListener("keydown", onKeydown, true);
    refreshButton.addEventListener("click", () => setChallenge());
    cancelButton?.addEventListener("click", () => config.close(false));
    confirmButton.addEventListener("click", submit);
    setChallenge(pickRandomType());

    return {
      destroy() {
        currentChallenge?.destroy?.();
        root.removeEventListener("keydown", onKeydown, true);
      },
    };
  }

  async function ensureAccess(feature, options) {
    if (!feature) return true;
    if (inFlight.has(feature)) return inFlight.get(feature);

    const task = (async () => {
      const requirement = inspectRequirement(feature, options);
      if (requirement.granted) {
        return true;
      }
      if (requirement.required) {
        const passed = await openCaptchaModal(feature, requirement.meta, getReasonText(feature, requirement.meta)[requirement.reason]);
        if (!passed) return false;
      }
      return grantAccess(requirement);
    })();

    inFlight.set(feature, task);
    try {
      return await task;
    } finally {
      if (inFlight.get(feature) === task) inFlight.delete(feature);
    }
  }

  function getRequirement(feature, options) {
    const requirement = inspectRequirement(feature, options);
    return {
      required: requirement.required,
      reason: requirement.reason,
      granted: requirement.granted,
      meta: requirement.meta,
    };
  }

  function mountInlineChallenge(container, feature, options) {
    injectStyles();
    const requirement = inspectRequirement(feature, options);
    if (!requirement.required) {
      grantAccess(requirement);
      options?.onSuccess?.();
      return { destroy() {} };
    }

    container.innerHTML = `
      <div class="rail-feature-gate-inline">
        <div class="rail-feature-gate-dialog" style="--rail-gate-accent:${requirement.meta.accent};" role="group" aria-labelledby="railFeatureGateTitle">
          ${buildChallengeMarkup(requirement.meta, getReasonText(feature, requirement.meta)[requirement.reason], { inline: true })}
        </div>
      </div>
    `;

    const root = container.querySelector(".rail-feature-gate-inline");
    const dialog = root.querySelector(".rail-feature-gate-dialog");
    const runtime = wireChallengeRuntime({
      feature,
      meta: requirement.meta,
      root: dialog,
      box: dialog.querySelector("#railFeatureGateBox"),
      mode: dialog.querySelector("#railFeatureGateMode"),
      helper: dialog.querySelector("#railFeatureGateHelper"),
      challenge: dialog.querySelector("#railFeatureGateChallenge"),
      error: dialog.querySelector("#railFeatureGateError"),
      refreshButton: dialog.querySelector("#railFeatureGateRefresh"),
      cancelButton: dialog.querySelector("#railFeatureGateCancel"),
      confirmButton: dialog.querySelector("#railFeatureGateConfirm"),
      close(passed) {
        if (!passed) return;
        runtime.destroy();
        grantAccess(requirement);
        options?.onSuccess?.();
      },
    });

    return {
      destroy() {
        runtime.destroy();
        if (container.contains(root)) container.innerHTML = "";
      },
    };
  }

  window.RailFeatureGate = {
    ensureAccess,
    getRequirement,
    mountInlineChallenge,
    clearState,
  };
})();
