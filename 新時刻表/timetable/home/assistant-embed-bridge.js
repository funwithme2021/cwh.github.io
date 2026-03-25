(function () {
  const HOST_SELECTOR = "[data-rail-assistant-host]";
  const STYLE_ID = "home-rail-assistant-bridge-style";
  const SYSTEMS = {
    tr: {
      label: "台鐵 AI 助手",
      badge: "TRA",
      src: "../tr/tr.html?embed=1&home_ai_embed=1&v=20260319-aichips3",
    },
    thsr: {
      label: "高鐵 AI 助手",
      badge: "THSR",
      src: "../thsr/thsr.html?embed=1&home_ai_embed=1&v=20260319-aichips3",
    },
  };

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isEmbeddedView() {
    return new URLSearchParams(location.search).get("embed") === "1";
  }

  function detectPreferredSystem(query) {
    const text = String(query || "");
    if (/高鐵|thsr|hsr/i.test(text)) return "thsr";
    if (/台鐵|臺鐵|火車|tra/i.test(text)) return "tr";
    return "";
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .home-rail-assistant-bridge{
        display:flex;
        flex-direction:column;
        gap:18px;
      }
      .home-rail-assistant-toolbar{
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        justify-content:flex-start;
        gap:12px;
        padding:2px 2px 0;
      }
      .home-rail-assistant-tabs{
        display:inline-flex;
        flex-wrap:wrap;
        gap:10px;
        padding:4px;
        border-radius:18px;
        border:1px solid rgba(148,163,184,0.16);
        background:rgba(255,255,255,0.04);
        box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);
      }
      .home-rail-assistant-tab{
        display:inline-flex;
        align-items:center;
        gap:8px;
        min-height:44px;
        padding:0 16px;
        border-radius:14px;
        border:1px solid transparent;
        background:transparent;
        color:inherit;
        cursor:pointer;
        font:inherit;
        font-weight:700;
        transition:transform .18s ease, background .18s ease, border-color .18s ease;
      }
      .home-rail-assistant-tab:hover{
        transform:translateY(-1px);
        border-color:rgba(96,165,250,0.34);
      }
      .home-rail-assistant-tab.active{
        background:rgba(59,130,246,0.16);
        border-color:rgba(59,130,246,0.38);
      }
      .home-rail-assistant-tab[data-system="thsr"].active{
        background:rgba(251,146,60,0.16);
        border-color:rgba(251,146,60,0.36);
      }
      .home-rail-assistant-badge{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-width:42px;
        padding:4px 8px;
        border-radius:999px;
        background:rgba(255,255,255,0.08);
        font-size:.76rem;
        letter-spacing:.08em;
      }
      body.light-mode .home-rail-assistant-tabs{
        background:rgba(237,242,247,0.82);
        border-color:rgba(15,23,42,0.08);
        box-shadow:inset 0 1px 0 rgba(255,255,255,0.5);
      }
      body.light-mode .home-rail-assistant-tab{
        background:transparent;
        border-color:transparent;
      }
      body.light-mode .home-rail-assistant-tab.active{
        background:rgba(59,130,246,0.12);
        border-color:rgba(59,130,246,0.28);
      }
      body.light-mode .home-rail-assistant-tab[data-system="thsr"].active{
        background:rgba(251,146,60,0.12);
        border-color:rgba(251,146,60,0.28);
      }
      .home-rail-assistant-panes{
        display:flex;
        flex-direction:column;
        gap:14px;
      }
      .home-rail-assistant-lock{
        display:flex;
        flex-direction:column;
        gap:14px;
        padding:18px;
        border:1px solid rgba(148,163,184,0.18);
        border-radius:22px;
        background:
          radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 28%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
      }
      .home-rail-assistant-lock h3{
        margin:0;
        font-size:1.06rem;
      }
      .home-rail-assistant-lock p{
        margin:0;
        color:var(--text-muted, #64748b);
        line-height:1.75;
      }
      .home-rail-assistant-lock-actions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
      }
      .home-rail-assistant-lock-btn{
        min-height:44px;
        border-radius:14px;
        border:1px solid rgba(59,130,246,0.28);
        background:rgba(59,130,246,0.14);
        color:inherit;
        padding:0 16px;
        font:inherit;
        font-weight:800;
        cursor:pointer;
        transition:transform .18s ease, border-color .18s ease, background .18s ease;
      }
      .home-rail-assistant-lock-btn:hover{
        transform:translateY(-1px);
        border-color:rgba(59,130,246,0.42);
      }
      body.light-mode .home-rail-assistant-lock{
        background:
          radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 28%),
          linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,252,0.96));
      }
      body.light-mode .home-rail-assistant-lock-btn{
        background:rgba(59,130,246,0.10);
      }
      .home-rail-assistant-pane{
        display:none;
        border-radius:18px;
        border:0;
        background:transparent;
        box-shadow:none;
        overflow:clip;
        padding:0;
      }
      .home-rail-assistant-pane.active{
        display:block;
      }
      body.light-mode .home-rail-assistant-pane{
        background:transparent;
        border-color:transparent;
        box-shadow:none;
      }
      .home-rail-assistant-loading,
      .home-rail-assistant-error{
        padding:18px 20px;
        line-height:1.7;
        color:var(--text-muted, #64748b);
      }
      .home-rail-assistant-error{
        color:#dc2626;
      }
      .home-rail-assistant-frame{
        width:100%;
        min-height:760px;
        border:0;
        border-radius:18px;
        display:block;
        background:transparent;
      }
      @media (max-width: 760px){
        .home-rail-assistant-frame{
          min-height:900px;
        }
        .home-rail-assistant-toolbar{
          justify-content:flex-start;
        }
        .home-rail-assistant-pane{
          border-radius:16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncParentTheme() {
    if (localStorage.getItem("theme") === "light") {
      document.body.classList.add("light-mode");
    }
  }

  function syncThemeButton() {
    const themeBtn = document.getElementById("aiThemeToggle");
    if (!themeBtn) return;
    const isLight = document.body.classList.contains("light-mode");
    themeBtn.title = isLight ? "切換日間模式" : "切換深夜模式";
    themeBtn.innerHTML = isLight
      ? '<span class="ico">☀️</span><span class="txt">日間模式</span>'
      : '<span class="ico">🌙</span><span class="txt">深夜模式</span>';
  }

  function postThemeToFrames() {
    const theme = document.body.classList.contains("light-mode") ? "light" : "dark";
    document.querySelectorAll(".home-rail-assistant-frame").forEach((frame) => {
      try {
        frame.contentWindow?.postMessage({ type: "RAIL_AI_THEME", theme }, "*");
      } catch (_) {}
    });
  }

  function toggleParentTheme() {
    document.body.classList.toggle("light-mode");
    localStorage.setItem("theme", document.body.classList.contains("light-mode") ? "light" : "dark");
    syncThemeButton();
    postThemeToFrames();
  }

  function wireAiPageChrome() {
    const themeBtn = document.getElementById("aiThemeToggle");
    if (themeBtn && !themeBtn.dataset.bound) {
      themeBtn.dataset.bound = "1";
      themeBtn.addEventListener("click", toggleParentTheme);
    }

    if (!isEmbeddedView()) return;

    document.querySelectorAll(".ai-nav-link").forEach((link) => {
      if (link.dataset.bound === "1") return;
      link.dataset.bound = "1";
      link.addEventListener("click", (event) => {
        const href = String(link.getAttribute("href") || "");
        if (!href) return;
        if (href.includes("./index.html")) {
          event.preventDefault();
          try {
            window.parent.postMessage("APP_CLOSE", "*");
          } catch (_) {}
          return;
        }
        if (href.includes("../tr/tr.html")) {
          event.preventDefault();
          try {
            window.parent.postMessage({ type: "OPEN_OVERLAY", sys: "tr", params: null }, "*");
          } catch (_) {}
          return;
        }
        if (href.includes("../thsr/thsr.html")) {
          event.preventDefault();
          try {
            window.parent.postMessage({ type: "OPEN_OVERLAY", sys: "thsr", params: null }, "*");
          } catch (_) {}
        }
      });
    });
  }

  function buildHostMarkup(host, activeSystem) {
    host.innerHTML = `
      <div class="home-rail-assistant-bridge">
        <div class="home-rail-assistant-toolbar">
          <div class="home-rail-assistant-tabs" role="tablist" aria-label="AI 助手系統切換">
            ${Object.entries(SYSTEMS)
              .map(
                ([system, meta]) => `
                  <button class="home-rail-assistant-tab${system === activeSystem ? " active" : ""}" type="button" data-system="${system}" role="tab" aria-selected="${system === activeSystem ? "true" : "false"}">
                    <span class="home-rail-assistant-badge">${escapeHtml(meta.badge)}</span>
                    <span>${escapeHtml(meta.label)}</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="home-rail-assistant-panes">
          ${Object.keys(SYSTEMS)
            .map(
              (system) => `
                <section class="home-rail-assistant-pane${system === activeSystem ? " active" : ""}" data-system="${system}">
                  <div class="home-rail-assistant-loading">正在載入 ${escapeHtml(SYSTEMS[system].label)}...</div>
                </section>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function buildLockedMarkup(host, activeSystem) {
    host.innerHTML = `
      <div class="home-rail-assistant-lock">
        <h3>AI 功能已上鎖</h3>
        <p>第一次使用或短時間內使用太頻繁時，需要先輸入驗證碼。解鎖後即可使用 ${escapeHtml(SYSTEMS[activeSystem]?.label || "AI 助手")}。</p>
        <div class="home-rail-assistant-lock-actions">
          <button type="button" class="home-rail-assistant-lock-btn" data-ai-unlock="1">輸入驗證碼並解鎖</button>
        </div>
      </div>
    `;
  }

  function getPane(host, system) {
    return host.querySelector(`.home-rail-assistant-pane[data-system="${system}"]`);
  }

  function getFrame(host, system) {
    return host.querySelector(`iframe[data-system="${system}"]`);
  }

  function setActiveSystem(host, system) {
    host.dataset.activeSystem = system;
    host.querySelectorAll(".home-rail-assistant-tab").forEach((button) => {
      const active = button.dataset.system === system;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    host.querySelectorAll(".home-rail-assistant-pane").forEach((pane) => {
      pane.classList.toggle("active", pane.dataset.system === system);
    });
  }

  async function ensureParentAiAccess() {
    if (!window.RailFeatureGate?.ensureAccess) return true;
    try {
      return await window.RailFeatureGate.ensureAccess("ai");
    } catch (_) {
      return false;
    }
  }

  function markPaneReady(host, system) {
    const pane = getPane(host, system);
    if (!pane) return;
    pane.dataset.ready = "1";
    pane.dataset.error = "0";
    pane.querySelector(".home-rail-assistant-loading")?.remove();
  }

  function markPaneError(host, system) {
    const pane = getPane(host, system);
    if (!pane) return;
    pane.dataset.error = "1";
    pane.innerHTML = `<div class="home-rail-assistant-error">${escapeHtml(SYSTEMS[system].label)} 載入失敗，請稍後再試一次。</div>`;
  }

  function setFrameHeight(host, system, height) {
    const frame = getFrame(host, system);
    if (!frame) return;
    const nextHeight = Math.max(Number(height || 0), window.innerWidth <= 760 ? 900 : 760);
    frame.style.height = `${nextHeight}px`;
  }

  function ensureFrame(host, system) {
    const pane = getPane(host, system);
    if (!pane) return;
    if (getFrame(host, system)) return;
    const frame = document.createElement("iframe");
    frame.className = "home-rail-assistant-frame";
    frame.dataset.system = system;
    frame.loading = "lazy";
    frame.src = SYSTEMS[system].src;
    pane.appendChild(frame);
    frame.addEventListener("load", () => {
      postThemeToFrames();
      const timer = window.setTimeout(() => {
        if (pane.dataset.ready !== "1") markPaneError(host, system);
      }, 12000);
      pane.dataset.failTimer = String(timer);
    }, { once: true });
  }

  function runQueryInFrame(host, system, query) {
    const pane = getPane(host, system);
    const frame = getFrame(host, system);
    const trimmed = String(query || "").trim();
    if (!pane || !frame || !trimmed) return;
    pane.dataset.queuedQuery = trimmed;
    try {
      frame.contentWindow?.postMessage({ type: "RAIL_AI_RUN", system, query: trimmed }, "*");
    } catch (_) {}
  }

  function flushQueuedQuery(host, system) {
    const pane = getPane(host, system);
    if (!pane) return;
    const query = pane.dataset.queuedQuery || "";
    if (!query) return;
    delete pane.dataset.queuedQuery;
    runQueryInFrame(host, system, query);
  }

  function applyInitialQuery(host) {
    if (host.dataset.initialQueryDone === "1") return;
    const query = new URLSearchParams(location.search).get("q");
    if (!query) return;
    host.dataset.initialQueryDone = "1";
    const preferred = detectPreferredSystem(query);
    if (preferred) {
      setActiveSystem(host, preferred);
      ensureFrame(host, preferred);
      const pane = getPane(host, preferred);
      if (pane) pane.dataset.queuedQuery = query;
      return;
    }
    Object.keys(SYSTEMS).forEach((system) => {
      ensureFrame(host, system);
      const pane = getPane(host, system);
      if (pane) pane.dataset.queuedQuery = query;
    });
  }

  function bindTabs(host) {
    host.querySelectorAll(".home-rail-assistant-tab").forEach((button) => {
      button.addEventListener("click", async () => {
        const system = button.dataset.system;
        if (!system || !SYSTEMS[system]) return;
        if (host.dataset.aiUnlocked !== "1") {
          host.dataset.defaultSystem = system;
          await unlockHost(host);
          return;
        }
        setActiveSystem(host, system);
        ensureFrame(host, system);
      });
    });
  }

  function activateHost(host, activeSystem) {
    const initialQuery = new URLSearchParams(location.search).get("q") || "";
    buildHostMarkup(host, activeSystem);
    bindTabs(host);
    ensureFrame(host, activeSystem);
    applyInitialQuery(host);
  }

  async function unlockHost(host) {
    const initialQuery = new URLSearchParams(location.search).get("q") || "";
    const activeSystem = detectPreferredSystem(initialQuery) || host.dataset.defaultSystem || "tr";
    const allowed = await ensureParentAiAccess();
    if (!allowed) return false;
    host.dataset.aiUnlocked = "1";
    activateHost(host, activeSystem);
    return true;
  }

  function initHost(host) {
    const initialQuery = new URLSearchParams(location.search).get("q") || "";
    const activeSystem = detectPreferredSystem(initialQuery) || host.dataset.defaultSystem || "tr";
    if (window.RailFeatureGate?.ensureAccess) {
      buildLockedMarkup(host, activeSystem);
      host.querySelector('[data-ai-unlock="1"]')?.addEventListener("click", () => {
        unlockHost(host);
      });
      return;
    }
    activateHost(host, activeSystem);
  }

  function findOwningHost(frame) {
    return frame.closest(HOST_SELECTOR);
  }

  function handleBridgeMessage(event) {
    const data = event?.data;
    if (!data || typeof data !== "object") return;
    if (!("type" in data) || !("system" in data)) return;
    const frame = document.querySelector(`.home-rail-assistant-frame[data-system="${data.system}"]`);
    if (!frame || event.source !== frame.contentWindow) return;
    const host = findOwningHost(frame);
    if (!host) return;

    if (data.type === "RAIL_AI_READY") {
      const pane = getPane(host, data.system);
      if (pane?.dataset.failTimer) {
        window.clearTimeout(Number(pane.dataset.failTimer));
        delete pane.dataset.failTimer;
      }
      markPaneReady(host, data.system);
      postThemeToFrames();
      flushQueuedQuery(host, data.system);
      return;
    }

    if (data.type === "RAIL_AI_HEIGHT") {
      setFrameHeight(host, data.system, data.height);
    }
  }

  function initThemeObserver() {
    if (!document.body || typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(() => {
      syncThemeButton();
      postThemeToFrames();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  function init() {
    injectStyles();
    syncParentTheme();
    syncThemeButton();
    wireAiPageChrome();
    document.querySelectorAll(HOST_SELECTOR).forEach(initHost);
    window.addEventListener("message", handleBridgeMessage);
    initThemeObserver();
  }

  window.addEventListener("DOMContentLoaded", init);
})();
