const TDX_CONFIG = window.TDX_CONFIG || {
  clientId: "r36144112-d7b2ebdd-ce4c-40c3",
  clientSecret: "141d81d1-a450-4610-9309-412c8151cc3d",
};

window.TDX_CONFIG = TDX_CONFIG;
window.tdxToken = window.tdxToken || null;
window.stationDB = window.stationDB || { tr: [], thsr: [] };
window.assistantRouteCache = window.assistantRouteCache || { date: "", tra: null, thsr: null };
window.assistantSeatCache = window.assistantSeatCache || {};
window.assistantTrainLiveCache = window.assistantTrainLiveCache || {};

const STATION_CACHE_KEY = "rail_station_cache_v2";
let stationFetchPromise = null;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readStationCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATION_CACHE_KEY) || "null");
    if (!raw || !raw.savedAt || !raw.data) return null;
    if (Date.now() - Number(raw.savedAt || 0) > 7 * 24 * 60 * 60 * 1000) return null;
    return raw.data;
  } catch (_) {
    return null;
  }
}

function writeStationCache(data) {
  try {
    localStorage.setItem(
      STATION_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        data,
      })
    );
  } catch (_) {
  }
}

function applyStationData(data) {
  if (!data || !Array.isArray(data.tr) || !Array.isArray(data.thsr)) return;
  window.stationDB = {
    tr: data.tr,
    thsr: data.thsr,
  };

  const countEl = document.getElementById("assistantDataCount");
  if (countEl) {
    countEl.textContent = `臺鐵 ${data.tr.length} 站 / 高鐵 ${data.thsr.length} 站`;
  }
}

function updateAssistantLoadingState(title, hint, tone = "loading") {
  const shell = document.querySelector(".ai-page-shell");
  const titleEl = document.getElementById("assistantReadyState");
  const hintEl = document.getElementById("assistantReadyHint");

  if (shell) shell.dataset.state = tone;
  if (titleEl) titleEl.textContent = title || "AI 助手待命中";
  if (hintEl) hintEl.textContent = hint || "可直接輸入日期、時間、車次、站名或起訖站開始查詢。";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 9000) {
  const response = await fetchWithTimeout(url, options, timeoutMs);
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.json();
}

async function getTdxToken() {
  if (window.tdxToken) return window.tdxToken;

  updateAssistantLoadingState("正在連線 TDX", "正在取得查詢與訂票需要的授權。", "loading");

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", TDX_CONFIG.clientId);
  params.append("client_secret", TDX_CONFIG.clientSecret);

  try {
    const response = await fetchWithTimeout(
      "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      },
      9000
    );
    const data = await response.json();
    window.tdxToken = data?.access_token || null;
    if (window.tdxToken) {
      updateAssistantLoadingState("AI 助手已就緒", "已取得授權，可直接開始查詢。", "ready");
    } else {
      updateAssistantLoadingState("授權取得失敗", "目前無法連線 TDX，請稍後再試。", "error");
    }
    return window.tdxToken;
  } catch (error) {
    console.warn("[ai-hub] token error", error);
    updateAssistantLoadingState("授權取得失敗", "目前無法連線 TDX，請稍後再試。", "error");
    return null;
  }
}

async function fetchAllStations(force = false) {
  if (!force && window.stationDB.tr.length && window.stationDB.thsr.length) return window.stationDB;
  if (!force && stationFetchPromise) return stationFetchPromise;

  if (!force) {
    const cached = readStationCache();
    if (cached) {
      applyStationData(cached);
      updateAssistantLoadingState("已載入快取站點", "站名資料已就緒，查詢時只會補抓需要的即時資料。", "ready");
      return window.stationDB;
    }
  }

  const token = await getTdxToken();
  if (!token) return window.stationDB;

  updateAssistantLoadingState("正在同步站點資料", "第一次使用會比較久，之後會使用快取。", "loading");

  const headers = { Authorization: `Bearer ${token}` };
  stationFetchPromise = Promise.all([
    fetchJsonWithTimeout("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Station?%24format=JSON", { headers }),
    fetchJsonWithTimeout("https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/Station?%24format=JSON", { headers }),
  ])
    .then(([trData, thsrData]) => {
      const data = {
        tr: (trData.Stations || []).map((station) => ({
          id: station.StationID,
          name: station.StationName.Zh_tw,
          lat: station.StationPosition.PositionLat,
          lon: station.StationPosition.PositionLon,
        })),
        thsr: (Array.isArray(thsrData) ? thsrData : []).map((station) => ({
          id: station.StationID,
          name: station.StationName.Zh_tw,
          lat: station.StationPosition.PositionLat,
          lon: station.StationPosition.PositionLon,
        })),
      };
      applyStationData(data);
      writeStationCache(data);
      updateAssistantLoadingState("站點資料已同步", "可直接查詢臺鐵、高鐵、車站與車次資訊。", "ready");
      return window.stationDB;
    })
    .catch((error) => {
      console.warn("[ai-hub] station sync error", error);
      updateAssistantLoadingState("站點資料同步失敗", "目前無法同步最新站點資料，稍後可再試一次。", "error");
      return window.stationDB;
    })
    .finally(() => {
      stationFetchPromise = null;
    });

  return stationFetchPromise;
}

function getRecentLaunches() {
  try {
    const raw = JSON.parse(localStorage.getItem("recent_launches_v1") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

function rememberRecentLaunch(sys, params) {
  try {
    const current = getRecentLaunches();
    const nextItem = { sys, params: params || null, ts: Date.now() };
    const dedupeKey = JSON.stringify({ sys, params: nextItem.params });
    const merged = [nextItem, ...current.filter((item) => JSON.stringify({ sys: item.sys, params: item.params || null }) !== dedupeKey)].slice(0, 6);
    localStorage.setItem("recent_launches_v1", JSON.stringify(merged));
  } catch (_) {
  }
}

function isEmbeddedView() {
  return new URLSearchParams(location.search).get("embed") === "1";
}

function buildSystemUrl(sys, params) {
  const base =
    sys === "tr"
      ? "../tr/tr.html"
      : sys === "thsr"
        ? "../thsr/thsr.html"
        : "./ai.html";

  const query = new URLSearchParams();
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.set(key, value);
    });
  }
  const search = query.toString();
  return `${base}${search ? `?${search}` : ""}`;
}

function openAppOverlay(sys, params, options) {
  if (!(options && options.skipRecent)) rememberRecentLaunch(sys, params || null);

  if (isEmbeddedView() && window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({ type: "OPEN_OVERLAY", sys, params: params || null }, "*");
      return;
    } catch (_) {
    }
  }

  location.href = buildSystemUrl(sys, params);
}

function getThreadContainer() {
  return document.getElementById("assistantAnswer");
}

function getEmptyThreadHtml() {
  return `
    <div class="assistant-placeholder assistant-thread-empty" data-thread-empty="1">
      <strong>輸入一句話，我就會直接幫你整理。</strong>
      <div>查詢結果會跟臺鐵 / 高鐵頁面的 AI 助手使用同一套卡片版型，也能繼續按「更多班次」、「更早班次」或「更晚班次」。</div>
    </div>
  `;
}

function clearThreadPlaceholder() {
  const thread = getThreadContainer();
  if (!thread) return;
  const placeholder = thread.querySelector("[data-thread-empty='1']");
  if (placeholder) placeholder.remove();
}

function appendThreadMessage(role, html) {
  const thread = getThreadContainer();
  if (!thread) return null;

  clearThreadPlaceholder();
  const block = document.createElement("section");
  block.className = `assistant-message assistant-message-${role}`;
  block.innerHTML = html;
  thread.appendChild(block);
  thread.scrollTop = thread.scrollHeight;
  return block;
}

async function runAssistantQuery(rawQuery) {
  const query = String(rawQuery || "").trim();
  if (!query) return;

  appendThreadMessage(
    "user",
    `
      <div class="assistant-message-label">你</div>
      <div class="assistant-message-bubble">
        <strong>${escapeHtml(query)}</strong>
      </div>
    `
  );

  const replyBlock = appendThreadMessage(
    "assistant",
    `
      <div class="assistant-message-label">Rail AI</div>
      <div class="assistant-message-bubble assistant-message-bubble-loading">正在整理班次、票況與站點資訊...</div>
    `
  );

  try {
    const bubble = replyBlock?.querySelector(".assistant-message-bubble") || null;
    window.assistantRenderTarget = bubble;
    window.assistantLastRenderTarget = bubble;
    await Promise.resolve(window.handleAssistantQuery?.(query));
    if (bubble) {
      bubble.classList.remove("assistant-message-bubble-loading");
      bubble.classList.add("assistant-message-bubble-result");
    }
  } catch (error) {
    const bubble = window.assistantRenderTarget;
    if (bubble) {
      bubble.classList.remove("assistant-message-bubble-loading");
      bubble.classList.remove("assistant-message-bubble-result");
      bubble.innerHTML = `<div class="assistant-error">${escapeHtml(error?.message || String(error || "查詢失敗"))}</div>`;
    }
  } finally {
    window.assistantRenderTarget = null;
    const thread = getThreadContainer();
    if (thread) thread.scrollTop = thread.scrollHeight;
  }
}

function clearAssistantThread() {
  const thread = getThreadContainer();
  if (!thread) return;
  window.assistantRenderTarget = null;
  window.assistantLastRenderTarget = null;
  window.clearAssistantRenderState?.();
  thread.innerHTML = getEmptyThreadHtml();
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");
  const isLight = document.body.classList.contains("light-mode");
  localStorage.setItem("theme", isLight ? "light" : "dark");
}

function applySavedTheme() {
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
  }
}

function initEmbeddedNav() {
  if (!isEmbeddedView()) return;

  document.querySelectorAll(".ai-nav-link").forEach((link) => {
    if (link.dataset.bound === "1") return;
    link.dataset.bound = "1";
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href") || "";
      if (!href) return;
      event.preventDefault();

      if (href.includes("./index.html")) {
        try {
          window.parent.postMessage({ type: "APP_CLOSE" }, "*");
          return;
        } catch (_) {
          location.href = "./index.html";
          return;
        }
      }

      if (href.includes("../tr/tr.html")) {
        openAppOverlay("tr", null, { skipRecent: true });
        return;
      }

      if (href.includes("../thsr/thsr.html")) {
        openAppOverlay("thsr", null, { skipRecent: true });
      }
    });
  });
}

function bindAssistantUI() {
  const input = document.getElementById("routeAssistantInput");
  const submit = document.getElementById("routeAssistantBtn");
  const clearBtn = document.getElementById("assistantClearBtn");

  if (submit && !submit.dataset.bound) {
    submit.dataset.bound = "1";
    submit.addEventListener("click", () => runAssistantQuery(input?.value || ""));
  }

  if (input && !input.dataset.bound) {
    input.dataset.bound = "1";
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      runAssistantQuery(input.value || "");
    });
  }

  if (clearBtn && !clearBtn.dataset.bound) {
    clearBtn.dataset.bound = "1";
    clearBtn.addEventListener("click", clearAssistantThread);
  }

  document.querySelectorAll(".assistant-chip").forEach((chip) => {
    if (chip.dataset.bound === "1") return;
    chip.dataset.bound = "1";
    chip.addEventListener("click", () => {
      const query = chip.dataset.query || "";
      if (input) input.value = query;
      runAssistantQuery(query);
    });
  });
}

function initAiHub() {
  applySavedTheme();
  initEmbeddedNav();
  bindAssistantUI();

  const themeBtn = document.getElementById("aiThemeToggle");
  if (themeBtn && !themeBtn.dataset.bound) {
    themeBtn.dataset.bound = "1";
    themeBtn.addEventListener("click", toggleTheme);
  }

  const cached = readStationCache();
  if (cached) {
    applyStationData(cached);
    updateAssistantLoadingState("AI 助手待命中", "已載入站點快取，可直接輸入日期、時間、車次或起訖站。", "ready");
  } else {
    updateAssistantLoadingState("AI 助手待命中", "可直接輸入日期、時間、車次或起訖站，第一次查詢會稍久。", "idle");
  }

  setTimeout(async () => {
    await getTdxToken();
    if (!cached) await fetchAllStations();
  }, 180);

  const params = new URLSearchParams(location.search);
  const query = params.get("q");
  const input = document.getElementById("routeAssistantInput");
  if (query && input) {
    input.value = query;
    setTimeout(() => runAssistantQuery(query), 320);
  } else if (input) {
    input.focus();
  }
}

window.updateAssistantLoadingState = updateAssistantLoadingState;
window.getTdxToken = getTdxToken;
window.getAccessToken = getTdxToken;
window.fetchAllStations = fetchAllStations;
window.openAppOverlay = openAppOverlay;
window.rememberRecentLaunch = rememberRecentLaunch;
window.clearAssistantThread = clearAssistantThread;

window.addEventListener("DOMContentLoaded", initAiHub);
