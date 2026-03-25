(function () {
  if (window.RailFeatureGate) return;

  const STORAGE_KEY = "rail_feature_gate_state_v1";
  const MIN_REPEAT_LOG_MS = 1200;
  const ACCESS_GRACE_MS = 2500;
  const DEFAULT_WINDOW_MS = 2 * 60 * 1000;
  const DEFAULT_LIMIT = 4;
  const CHALLENGE_TYPES = ["image", "slider", "click"];
  const CLICK_ITEMS = [
    { id: "train", label: "火車", icon: "🚆" },
    { id: "ticket", label: "車票", icon: "🎫" },
    { id: "platform", label: "月台", icon: "🚉" },
    { id: "clock", label: "時鐘", icon: "🕒" },
    { id: "route", label: "地圖", icon: "🗺️" },
    { id: "seat", label: "座位", icon: "💺" },
    { id: "alert", label: "提醒", icon: "🔔" },
    { id: "bag", label: "行李", icon: "🧳" },
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
      .rail-feature-gate-click-btn span{
        font-size:1.35rem;
        line-height:1;
      }
      .rail-feature-gate-click-btn strong{
        font-size:.82rem;
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
    const targets = sampleItems(CLICK_ITEMS, 3);
    const filler = sampleItems(CLICK_ITEMS.filter((item) => !targets.some((target) => target.id === item.id)), 3);
    const choices = shuffle(targets.concat(filler));
    let progress = 0;

    function renderTargets() {
      ctx.box.innerHTML = `
        <div class="rail-feature-gate-helper" style="margin-top:0;">請依序點選下面的圖示：</div>
        <div class="rail-feature-gate-click-targets" style="margin-top:12px;">
          ${targets.map((item, index) => `
            <span class="rail-feature-gate-target-chip${index < progress ? " done" : ""}${index === progress ? " active" : ""}">
              <span>${escapeHtml(item.icon)}</span>
              <strong>${escapeHtml(item.label)}</strong>
            </span>
          `).join("")}
        </div>
      `;
    }

    function renderChoices() {
      ctx.challenge.innerHTML = `
        <div class="rail-feature-gate-click-grid">
          ${choices.map((item) => `
            <button type="button" class="rail-feature-gate-click-btn${targets.slice(0, progress).some((done) => done.id === item.id) ? " done" : ""}" data-click-id="${escapeHtml(item.id)}">
              <span>${escapeHtml(item.icon)}</span>
              <strong>${escapeHtml(item.label)}</strong>
            </button>
          `).join("")}
        </div>
      `;
      ctx.challenge.querySelectorAll("[data-click-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const nextTarget = targets[progress];
          const id = String(button.getAttribute("data-click-id") || "");
          if (!nextTarget) return;
          if (id !== nextTarget.id) {
            progress = 0;
            ctx.setError("點選順序不正確，已重新開始。");
            renderTargets();
            renderChoices();
            return;
          }
          progress += 1;
          ctx.setError("");
          renderTargets();
          renderChoices();
          if (progress >= targets.length) {
            window.setTimeout(() => ctx.close(true), 160);
          }
        });
      });
    }

    ctx.mode.textContent = "點選式驗證";
    ctx.helper.textContent = "依照上方順序點選圖示，全部答對後會自動通過。";
    renderTargets();
    renderChoices();
    return {
      type: "click",
      shouldResetOnFail: false,
      focus() {
        ctx.challenge.querySelector("[data-click-id]")?.focus();
      },
      validate() {
        if (progress < targets.length) {
          return { ok: false, message: "請依序點完全部指定圖示。" };
        }
        return { ok: true };
      },
    };
  }

  function buildChallenge(type, ctx) {
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
          <div class="rail-feature-gate-kicker">安全驗證</div>
          <h2 class="rail-feature-gate-title" id="railFeatureGateTitle">${meta.label} 需要先通過驗證</h2>
          <p class="rail-feature-gate-lead">${reasonText}</p>
          <div class="rail-feature-gate-mode" id="railFeatureGateMode"></div>
          <div class="rail-feature-gate-box" id="railFeatureGateBox"></div>
          <div class="rail-feature-gate-helper" id="railFeatureGateHelper"></div>
          <div class="rail-feature-gate-challenge" id="railFeatureGateChallenge"></div>
          <div class="rail-feature-gate-error" id="railFeatureGateError" aria-live="polite"></div>
          <div class="rail-feature-gate-actions">
            <button type="button" class="rail-feature-gate-refresh" id="railFeatureGateRefresh">換一題</button>
            <button type="button" class="rail-feature-gate-cancel" id="railFeatureGateCancel">取消</button>
            <button type="button" class="rail-feature-gate-confirm" id="railFeatureGateConfirm">確認</button>
          </div>
        </div>
      `;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add("show"));

      const box = overlay.querySelector("#railFeatureGateBox");
      const mode = overlay.querySelector("#railFeatureGateMode");
      const helper = overlay.querySelector("#railFeatureGateHelper");
      const challenge = overlay.querySelector("#railFeatureGateChallenge");
      const error = overlay.querySelector("#railFeatureGateError");
      const refreshButton = overlay.querySelector("#railFeatureGateRefresh");
      const cancelButton = overlay.querySelector("#railFeatureGateCancel");
      const confirmButton = overlay.querySelector("#railFeatureGateConfirm");
      let settled = false;
      let currentChallenge = null;

      const close = (passed) => {
        if (settled) return;
        settled = true;
        document.body.style.overflow = previousOverflow;
        document.removeEventListener("keydown", onKeydown, true);
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 180);
        resolve(!!passed);
      };

      const setError = (message) => {
        error.textContent = message || "";
      };

      const setChallenge = (preferredType, message) => {
        const nextType = preferredType || pickRandomType(currentChallenge?.type);
        currentChallenge = buildChallenge(nextType, {
          feature,
          meta,
          box,
          mode,
          helper,
          challenge,
          close,
          setError,
          refresh() {
            setChallenge();
          },
        });
        setError(message || "");
        currentChallenge.focus?.();
      };

      const submit = () => {
        if (!currentChallenge) return;
        const result = currentChallenge.validate?.() || { ok: false, message: "驗證失敗。" };
        if (!result.ok) {
          if (currentChallenge.shouldResetOnFail) {
            setChallenge(null, result.message || "驗證失敗，已重新產生新的題目。");
            return;
          }
          setError(result.message || "驗證失敗。");
          currentChallenge.focus?.();
          return;
        }
        close(true);
      };

      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close(false);
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        }
      };

      document.addEventListener("keydown", onKeydown, true);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close(false);
      });
      refreshButton.addEventListener("click", () => setChallenge());
      cancelButton.addEventListener("click", () => close(false));
      confirmButton.addEventListener("click", submit);

      setChallenge(pickRandomType());
    });
  }

  function getReasonText(feature, meta) {
    const label = meta.label || (FEATURES[feature]?.label || "此功能");
    return {
      first: `這是你第一次使用${label}，請先完成驗證後再繼續。`,
      frequent: `短時間內使用${label}的次數較多，請再次完成驗證以繼續。`,
    };
  }

  async function ensureAccess(feature, options) {
    if (!feature) return true;
    if (inFlight.has(feature)) return inFlight.get(feature);

    const task = (async () => {
      const meta = getFeatureMeta(feature, options);
      const now = Date.now();
      const state = readState();
      const record = normalizeRecord(state[feature]);
      if (record.grantedUntil && record.grantedUntil >= now) {
        return true;
      }
      record.recent = pruneRecent(record.recent, meta.windowMs, now);

      let reason = "";
      if (!record.verifiedAt) reason = "first";
      else if (record.recent.length >= meta.limit) reason = "frequent";

      if (reason) {
        const passed = await openCaptchaModal(feature, meta, getReasonText(feature, meta)[reason]);
        if (!passed) return false;
        record.verifiedAt = Date.now();
        record.recent = [];
      }

      const accessNow = Date.now();
      record.recent = pruneRecent(record.recent, meta.windowMs, accessNow);
      const latest = record.recent[record.recent.length - 1] || 0;
      if (!latest || accessNow - latest > MIN_REPEAT_LOG_MS) {
        record.recent.push(accessNow);
      }
      record.grantedUntil = accessNow + ACCESS_GRACE_MS;
      state[feature] = record;
      writeState(state);
      return true;
    })();

    inFlight.set(feature, task);
    try {
      return await task;
    } finally {
      if (inFlight.get(feature) === task) inFlight.delete(feature);
    }
  }

  window.RailFeatureGate = {
    ensureAccess,
  };
})();
