const TDX_CONFIG = {
  clientId: "r36144112-d7b2ebdd-ce4c-40c3",
  clientSecret: "141d81d1-a450-4610-9309-412c8151cc3d",
};

var tdxToken = null;
var stationDB = { tr: [], thsr: [] };
var assistantRouteCache = { date: "", tra: null, thsr: null };
var assistantSeatCache = {};
var assistantTrainLiveCache = {};

let stationFetchPromise = null;
const STATION_CACHE_KEY = "rail_station_cache_v2";

function pad2(value) {
  return String(value).padStart(2, "0");
}

function todayDateStr() {
  const date = new Date();
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function timeToMinutes(clock) {
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
  const depMin = timeToMinutes(dep);
  const arrMin = timeToMinutes(arr);
  if (depMin === null || arrMin === null) return "--";
  const diff = arrMin >= depMin ? arrMin - depMin : arrMin + 1440 - depMin;
  return formatDurationMinutes(diff);
}

function normalizeLooseStation(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/車站/g, "")
    .replace(/站/g, "")
    .replace(/臺/g, "台");
}

function simplifyTraTypeName(typeName) {
  const name = String(typeName || "").trim();
  if (!name) return "台鐵";
  if (name.includes("自強") && name.includes("3000")) return "自強號3000";
  if (name.includes("自強")) return "自強號";
  if (name.includes("普悠瑪")) return "普悠瑪";
  if (name.includes("太魯閣")) return "太魯閣";
  if (name.includes("區間快")) return "區間快";
  if (name.includes("區間")) return "區間車";
  if (name.includes("莒光")) return "莒光號";
  return name;
}

function resolveStationName(raw, sys) {
  const list = stationDB[sys] || [];
  if (!list.length) return "";
  const normalized = normalizeLooseStation(raw);
  if (!normalized) return "";
  const exact = list.find((item) => normalizeLooseStation(item.name) === normalized);
  if (exact) return exact.name;
  const fuzzy = list.find((item) => {
    const name = normalizeLooseStation(item.name);
    return name.includes(normalized) || normalized.includes(name);
  });
  return fuzzy ? fuzzy.name : "";
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
    localStorage.setItem(STATION_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data,
    }));
  } catch (_) {
  }
}

function updateAssistantLoadingState(title, hint, tone = "loading") {
  const titleEl = document.getElementById("assistantReadyState");
  const hintEl = document.getElementById("assistantReadyHint");
  const shell = document.querySelector(".ai-page-shell");
  if (titleEl) titleEl.textContent = title || "AI 助手待命中";
  if (hintEl) hintEl.textContent = hint || "可直接輸入日期、時間、車次、車站或起訖站。";
  if (shell) shell.dataset.state = tone;
}

function applyStationData(data) {
  if (!data || !Array.isArray(data.tr) || !Array.isArray(data.thsr)) return;
  stationDB = data;
  const countEl = document.getElementById("assistantDataCount");
  if (countEl) {
    countEl.textContent = `已載入 ${data.tr.length} 個台鐵站與 ${data.thsr.length} 個高鐵站`;
  }
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

async function getTdxToken() {
  if (tdxToken) return tdxToken;
  updateAssistantLoadingState("正在連線 TDX", "正在取得查詢與訂票需要的授權。");
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
      8000
    );
    const data = await response.json();
    tdxToken = data && data.access_token ? data.access_token : null;
    if (tdxToken) {
      updateAssistantLoadingState("AI 助手已就緒", "已取得授權，可直接開始查詢。", "ready");
    } else {
      updateAssistantLoadingState("授權取得失敗", "目前無法連線 TDX，請稍後再試。", "error");
    }
    return tdxToken;
  } catch (_) {
    updateAssistantLoadingState("授權取得失敗", "目前無法連線 TDX，請稍後再試。", "error");
    return null;
  }
}

async function getAccessToken() {
  return getTdxToken();
}

async function fetchAllStations(force = false) {
  if (!force && stationDB.tr.length && stationDB.thsr.length) return stationDB;
  if (!force && stationFetchPromise) return stationFetchPromise;
  if (!force) {
    const cached = readStationCache();
    if (cached) {
      applyStationData(cached);
      updateAssistantLoadingState("已載入快取站點", "站名資料已就緒，查詢時只會補抓需要的即時資料。", "ready");
      return stationDB;
    }
  }
  if (!tdxToken) await getTdxToken();
  if (!tdxToken) return stationDB;
  updateAssistantLoadingState("正在同步站點資料", "第一次使用會比較久，之後會使用快取。");
  const headers = { Authorization: `Bearer ${tdxToken}` };
  stationFetchPromise = Promise.all([
    fetchJsonWithTimeout("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Station?%24format=JSON", { headers }, 9000),
    fetchJsonWithTimeout("https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/Station?%24format=JSON", { headers }, 9000),
  ]).then(([trData, thsrData]) => {
    const data = {
      tr: (trData.Stations || []).map((st) => ({
        id: st.StationID,
        name: st.StationName.Zh_tw,
        lat: st.StationPosition.PositionLat,
        lon: st.StationPosition.PositionLon,
      })),
      thsr: (Array.isArray(thsrData) ? thsrData : []).map((st) => ({
        id: st.StationID,
        name: st.StationName.Zh_tw,
        lat: st.StationPosition.PositionLat,
        lon: st.StationPosition.PositionLon,
      })),
    };
    applyStationData(data);
    writeStationCache(data);
    updateAssistantLoadingState("站點資料已同步", "可直接查詢台鐵、高鐵與車站 / 車次資訊。", "ready");
    return stationDB;
  }).catch(() => {
    updateAssistantLoadingState("站點資料同步失敗", "目前無法同步最新站點資料，稍後可再試一次。", "error");
    return stationDB;
  }).finally(() => {
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
    const nextItem = { sys, params: params || null, ts: Date.now() };
    const current = getRecentLaunches();
    const dedupeKey = JSON.stringify({ sys, params: nextItem.params });
    const merged = [nextItem, ...current.filter((item) => JSON.stringify({ sys: item.sys, params: item.params || null }) !== dedupeKey)].slice(0, 6);
    localStorage.setItem("recent_launches_v1", JSON.stringify(merged));
  } catch (_) {
  }
}

function buildUrl(sys, params) {
  const baseUrl = sys === "tr" ? "../tr/tr.html" : "../thsr/thsr.html";
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.set(key, value);
    });
  }
  return `${baseUrl}?${query.toString()}`;
}

function openAppOverlay(sys, params, options) {
  if (!(options && options.skipRecent)) rememberRecentLaunch(sys, params || null);
  location.href = buildUrl(sys, params);
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");
  const isLight = document.body.classList.contains("light-mode");
  localStorage.setItem("theme", isLight ? "light" : "dark");
}

function getThreadContainer() {
  return document.getElementById("assistantAnswer");
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

async function runAssistantQuery(query) {
  const finalQuery = String(query || "").trim();
  if (!finalQuery) {
    window.handleAssistantQuery?.("");
    return;
  }
  appendThreadMessage("user", `
    <div class="assistant-message-label">你</div>
    <div class="assistant-message-bubble">
      <strong>${finalQuery.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]))}</strong>
    </div>
  `);
  const replyBlock = appendThreadMessage("assistant", `
    <div class="assistant-message-label">Rail AI</div>
    <div class="assistant-message-bubble assistant-message-bubble-loading">正在整理資料...</div>
  `);
  try {
    window.assistantRenderTarget = replyBlock ? replyBlock.querySelector(".assistant-message-bubble") : null;
    await window.handleAssistantQuery?.(finalQuery);
  } catch (error) {
    if (window.assistantRenderTarget) {
      window.assistantRenderTarget.innerHTML = `<div class="assistant-error">${String(error && error.message ? error.message : error)}</div>`;
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
  thread.innerHTML = `
    <div class="assistant-placeholder assistant-thread-empty" data-thread-empty="1">
      <strong>輸入一句話，我幫你整理最適合的結果。</strong>
      <div>你可以直接問起訖站、車次、車站，也可以加上日期、時間、時間區間、車種或是否直達。需要高鐵票況與訂票入口也可以一起問。</div>
    </div>
  `;
}

function bindAssistantUI() {
  const input = document.getElementById("routeAssistantInput");
  const submit = document.getElementById("routeAssistantBtn");
  const clearBtn = document.getElementById("assistantClearBtn");
  const chips = Array.from(document.querySelectorAll(".assistant-chip"));
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
  chips.forEach((chip) => {
    if (chip.dataset.bound) return;
    chip.dataset.bound = "1";
    chip.addEventListener("click", () => {
      const query = chip.dataset.query || "";
      if (input) input.value = query;
      runAssistantQuery(query);
    });
  });
}

function applySavedTheme() {
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
  }
}

function initAiHub() {
  applySavedTheme();
  bindAssistantUI();

  const themeBtn = document.getElementById("aiThemeToggle");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

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
window.getAccessToken = getAccessToken;
window.fetchAllStations = fetchAllStations;
window.openAppOverlay = openAppOverlay;
window.rememberRecentLaunch = rememberRecentLaunch;
window.clearAssistantThread = clearAssistantThread;
window.addEventListener("DOMContentLoaded", initAiHub);
