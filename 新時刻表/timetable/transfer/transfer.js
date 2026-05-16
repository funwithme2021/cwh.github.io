(() => {
  "use strict";

  const DEFAULT_TDX_CONFIG = {
    clientId: "r36144112-d7b2ebdd-ce4c-40c3",
    clientSecret: "141d81d1-a450-4610-9309-412c8151cc3d",
  };

  const STORAGE_KEYS = {
    clientId: "tdx_client_id",
    clientSecret: "tdx_client_secret",
    token: "tdx_access_token_cache_v1",
    theme: "dualrail_theme_v2",
    history: "dualrail_transfer_history_v2",
    queryDate: "dualrail_transfer_query_date_v2",
  };

  const MIN_TRANSFER_BUFFER = 3;
  const TIGHT_TRANSFER_BUFFER = 10;
  const DIRECT_PREFERENCE_MARGIN = 5;
  const MAX_GROUP_ALTERNATIVES = 4;
  const MAX_TOTAL_RESULTS = 160;

  const INTERCHANGES = [
    { id: "nangang", label: "南港", tra: "南港", thsr: "南港", walkMin: 7 },
    { id: "taipei", label: "臺北", tra: "臺北", thsr: "臺北", walkMin: 8 },
    { id: "banqiao", label: "板橋", tra: "板橋", thsr: "板橋", walkMin: 6 },
    { id: "hsinchu", label: "新竹 / 六家", tra: "六家", thsr: "新竹", walkMin: 4 },
    { id: "miaoli", label: "苗栗 / 豐富", tra: "豐富", thsr: "苗栗", walkMin: 5 },
    { id: "taichung", label: "臺中 / 新烏日", tra: "新烏日", thsr: "臺中", walkMin: 5 },
    { id: "tainan", label: "臺南 / 沙崙", tra: "沙崙", thsr: "臺南", walkMin: 5 },
    { id: "zuoying", label: "左營 / 新左營", tra: "新左營", thsr: "左營", walkMin: 4 },
  ];

  const SYSTEM_META = {
    tra: { label: "台鐵", short: "TRA", className: "tra", color: "#2563eb" },
    thsr: { label: "高鐵", short: "THSR", className: "thsr", color: "#f97316" },
  };

  const TRA_TYPE_FALLBACK_COLORS = {
    太魯閣: "#2563eb",
    莒光號: "#ea580c",
    新自強: "#8600ff",
    "自強號(新)": "#e11d48",
    自強號: "#e11d48",
    普悠瑪: "#db2777",
    區間快: "#16a34a",
    區間車: "#475569",
    復興號: "#0284c7",
    普快車: "#0f766e",
    柴快車: "#7c2d12",
    柴油客車: "#92400e",
    普通車: "#1d4ed8",
    加班車: "#0ea5e9",
    列車: "#64748b",
  };

  const TRA_TYPE_ORDER = [
    "太魯閣",
    "普悠瑪",
    "新自強",
    "自強號(新)",
    "自強號",
    "莒光號",
    "復興號",
    "區間快",
    "區間車",
    "普快車",
    "普通車",
    "柴油客車",
    "柴快車",
    "加班車",
    "列車",
  ];

  const state = {
    token: "",
    tokenExpiresAt: 0,
    tokenPromise: null,
    stationCatalogReady: false,
    dataCache: new Map(),
    stations: { tra: [], thsr: [] },
    stationBySystem: { tra: new Map(), thsr: new Map() },
    stationAliasMap: { tra: new Map(), thsr: new Map() },
    stationAnyAliasMap: new Map(),
    stationOptions: [],
    stationGeoList: [],
    stationGeoMap: {},
    availableTraTypes: [],
    queryController: null,
    queryDate: "",
  };

  const interchangeByStationKey = new Map();

  function qs(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[臺]/g, "台")
      .replace(/[()（）]/g, "");
  }

  function normalizeLookup(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[臺]/g, "台")
      .replace(/[()（）]/g, "")
      .replace(/[／/]/g, "")
      .replace(/[－—–-]/g, "");
  }

  function displayName(value) {
    return String(value || "").trim();
  }

  function stationKeyOf(system, stationName) {
    return `${system}|${normalizeName(stationName)}`;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function fmtDate(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function parseDate(dateStr) {
    const match = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function addDays(dateStr, delta) {
    const date = parseDate(dateStr);
    if (!date) return dateStr;
    date.setDate(date.getDate() + Number(delta || 0));
    return fmtDate(date);
  }

  function diffDays(a, b) {
    const da = parseDate(a);
    const db = parseDate(b);
    if (!da || !db) return 0;
    const aUtc = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
    const bUtc = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
    return Math.round((aUtc - bUtc) / 86400000);
  }

  function parseTime(text) {
    const match = String(text || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function formatAbsClock(absMinute) {
    if (!Number.isFinite(absMinute)) return "--";
    const rounded = Math.round(absMinute);
    const normalized = ((rounded % 1440) + 1440) % 1440;
    const dayOffset = Math.floor(rounded / 1440);
    const hh = Math.floor(normalized / 60);
    const mm = normalized % 60;
    return `${pad2(hh)}:${pad2(mm)}${dayOffset > 0 ? ` +${dayOffset}` : ""}`;
  }

  function formatDuration(minutes) {
    if (!Number.isFinite(minutes)) return "--";
    const total = Math.max(0, Math.round(minutes));
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    if (!hh) return `${mm} 分`;
    if (!mm) return `${hh} 小時`;
    return `${hh} 小時 ${mm} 分`;
  }

  function formatNowClock() {
    const now = new Date();
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  }

  function formatDateLabel(dateStr) {
    const date = parseDate(dateStr);
    if (!date) return dateStr || "--";
    const week = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
    return `${dateStr}（週${week}）`;
  }

  function timeMsFromQueryDate(dateStr, absMinute) {
    const date = parseDate(dateStr);
    if (!date || !Number.isFinite(absMinute)) return NaN;
    const base = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return base + Math.round(absMinute) * 60000;
  }

  function safeJsonParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function uniqueByKey(list, keyFn) {
    const seen = new Set();
    const output = [];
    (Array.isArray(list) ? list : []).forEach((item) => {
      const key = keyFn(item);
      if (seen.has(key)) return;
      seen.add(key);
      output.push(item);
    });
    return output;
  }

  function readStoredConfig() {
    try {
      const clientId = String(localStorage.getItem(STORAGE_KEYS.clientId) || "").trim();
      const clientSecret = String(localStorage.getItem(STORAGE_KEYS.clientSecret) || "").trim();
      if (clientId && clientSecret) return { clientId, clientSecret };
    } catch (_) {}
    const globalConfig = window.TDX_CONFIG || {};
    const clientId = String(globalConfig.clientId || "").trim();
    const clientSecret = String(globalConfig.clientSecret || "").trim();
    if (clientId && clientSecret) return { clientId, clientSecret };
    return { ...DEFAULT_TDX_CONFIG };
  }

  function buildAuthHeaders(token) {
    const config = readStoredConfig();
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (config.clientId) headers["x-api-key"] = config.clientId;
    return headers;
  }

  async function getAccessToken(force = false) {
    const now = Date.now();
    if (!force && state.token && now < state.tokenExpiresAt - 30000) return state.token;
    if (!force && state.tokenPromise) return state.tokenPromise;

    if (!force) {
      try {
        const cached = safeJsonParse(localStorage.getItem(STORAGE_KEYS.token) || "null", null);
        if (cached?.token && cached?.expiresAt && now < Number(cached.expiresAt) - 30000) {
          state.token = String(cached.token);
          state.tokenExpiresAt = Number(cached.expiresAt);
          return state.token;
        }
      } catch (_) {}
    }

    state.tokenPromise = (async () => {
      const config = readStoredConfig();
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", config.clientId);
      params.append("client_secret", config.clientSecret);
      const response = await fetch("https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`TDX Token 取得失敗：${response.status} ${errorText}`.trim());
      }
      const payload = await response.json();
      state.token = String(payload.access_token || "");
      state.tokenExpiresAt = Date.now() + (Math.max(0, Number(payload.expires_in) || 0) * 1000);
      try {
        localStorage.setItem(
          STORAGE_KEYS.token,
          JSON.stringify({
            token: state.token,
            expiresAt: state.tokenExpiresAt,
          })
        );
      } catch (_) {}
      return state.token;
    })();

    try {
      return await state.tokenPromise;
    } finally {
      state.tokenPromise = null;
    }
  }

  async function fetchJson(url) {
    const token = await getAccessToken();
    if (!token) throw new Error("無法取得 TDX Token");
    const response = await fetch(url, { headers: buildAuthHeaders(token) });
    if (!response.ok) {
      throw new Error(`資料讀取失敗：${response.status} ${url}`);
    }
    return response.json();
  }

  function pushGeoAlias(system, stationName, lat, lon) {
    if (!stationName || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const systemLabel = SYSTEM_META[system]?.label || system;
    const labels = uniqueByKey(
      [
        stationName,
        stationName.replace(/[臺]/g, "台"),
        `${systemLabel} ${stationName}`,
        `${systemLabel}${stationName}`,
        `${SYSTEM_META[system]?.short || system} ${stationName}`,
      ],
      (item) => normalizeLookup(item)
    );
    labels.forEach((label) => {
      state.stationGeoList.push({ name: label, lat, lon });
      state.stationGeoMap[label] = { name: label, lat, lon };
    });
  }

  function registerAlias(system, station, alias) {
    const key = normalizeLookup(alias);
    if (!key) return;
    state.stationAliasMap[system].set(key, station);
    if (!state.stationAnyAliasMap.has(key)) state.stationAnyAliasMap.set(key, []);
    const list = state.stationAnyAliasMap.get(key);
    if (!list.some((item) => item.key === station.key)) list.push(station);
  }

  function buildStationAliases(station) {
    const systemLabel = SYSTEM_META[station.system]?.label || station.system;
    const shortLabel = SYSTEM_META[station.system]?.short || station.system;
    const nameTai = station.name.replace(/[臺]/g, "台");
    return uniqueByKey(
      [
        station.name,
        nameTai,
        station.id,
        `${station.id}-${station.name}`,
        `${station.id}-${nameTai}`,
        `${systemLabel}${station.name}`,
        `${systemLabel}${nameTai}`,
        `${systemLabel} ${station.name}`,
        `${systemLabel} ${nameTai}`,
        `${systemLabel}${station.id}`,
        `${systemLabel}${station.id}-${station.name}`,
        `${systemLabel}${station.id}-${nameTai}`,
        `${shortLabel}${station.name}`,
        `${shortLabel}${nameTai}`,
        `${shortLabel}${station.id}`,
        `${shortLabel}${station.id}-${station.name}`,
      ],
      (item) => normalizeLookup(item)
    );
  }

  function buildStationOptionLabel(station) {
    return `${SYSTEM_META[station.system]?.label || station.system}${station.id}-${station.name.replace(/[臺]/g, "台")}`;
  }

  async function loadStationCatalog() {
    if (state.stationCatalogReady) return;

    const [traRaw, thsrRaw] = await Promise.all([
      fetchJson("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Station?%24format=JSON"),
      fetchJson("https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/Station?$format=JSON"),
    ]);

    const traStations = Array.isArray(traRaw?.Stations) ? traRaw.Stations : [];
    state.stations.tra = traStations
      .map((item) => {
        const name = displayName(item?.StationName?.Zh_tw || item?.StationName?.ZhTw || "");
        const lat = Number(item?.StationPosition?.PositionLat);
        const lon = Number(item?.StationPosition?.PositionLon);
        const station = {
          id: String(item?.StationID || "").trim(),
          system: "tra",
          key: stationKeyOf("tra", name),
          name,
          normalized: normalizeName(name),
          lat,
          lon,
        };
        station.aliases = buildStationAliases(station);
        station.optionLabel = buildStationOptionLabel(station);
        return station;
      })
      .filter((station) => station.id && station.name);

    const thsrStations = Array.isArray(thsrRaw) ? thsrRaw : [];
    state.stations.thsr = thsrStations
      .map((item) => {
        const name = displayName(item?.StationName?.Zh_tw || "");
        const lat = Number(item?.StationPosition?.PositionLat);
        const lon = Number(item?.StationPosition?.PositionLon);
        const station = {
          id: String(item?.StationID || "").trim(),
          system: "thsr",
          key: stationKeyOf("thsr", name),
          name,
          normalized: normalizeName(name),
          lat,
          lon,
        };
        station.aliases = buildStationAliases(station);
        station.optionLabel = buildStationOptionLabel(station);
        return station;
      })
      .filter((station) => station.id && station.name);

    state.stationBySystem.tra = new Map(state.stations.tra.map((station) => [station.key, station]));
    state.stationBySystem.thsr = new Map(state.stations.thsr.map((station) => [station.key, station]));
    state.stationAliasMap = { tra: new Map(), thsr: new Map() };
    state.stationAnyAliasMap = new Map();
    state.stationGeoList = [];
    state.stationGeoMap = {};

    Object.values(state.stations)
      .flat()
      .forEach((station) => {
        station.aliases.forEach((alias) => registerAlias(station.system, station, alias));
        pushGeoAlias(station.system, station.name, station.lat, station.lon);
      });

    window.stationGeoList = state.stationGeoList.slice();
    window.stationGeoMap = { ...state.stationGeoMap };

    INTERCHANGES.forEach((pair) => {
      const traStation = findStationExact("tra", pair.tra);
      const thsrStation = findStationExact("thsr", pair.thsr);
      if (!traStation || !thsrStation) return;
      interchangeByStationKey.set(traStation.key, {
        ...pair,
        fromKey: traStation.key,
        fromSystem: "tra",
        fromName: traStation.name,
        toKey: thsrStation.key,
        toSystem: "thsr",
        toName: thsrStation.name,
      });
      interchangeByStationKey.set(thsrStation.key, {
        ...pair,
        fromKey: thsrStation.key,
        fromSystem: "thsr",
        fromName: thsrStation.name,
        toKey: traStation.key,
        toSystem: "tra",
        toName: traStation.name,
      });
    });

    state.stationOptions = uniqueByKey(
      Object.values(state.stations)
        .flat()
        .map((station) => ({
          value: station.optionLabel,
          tokens: [
            station.optionLabel,
            station.name,
            station.name.replace(/[臺]/g, "台"),
            station.id,
            ...station.aliases,
          ],
        })),
      (item) => normalizeLookup(item.value)
    );

    state.stationCatalogReady = true;
    fillStationDatalist("");
  }

  function normalizeTraType(typeName) {
    if (window.RailNetwork?.normalizeTraDisplayType) {
      const shared = String(window.RailNetwork.normalizeTraDisplayType(typeName) || "").trim();
      if (shared) return shared;
    }
    const text = String(typeName || "").trim();
    if (!text) return "列車";
    if (/太魯閣/.test(text)) return "太魯閣";
    if (/普悠瑪/.test(text)) return "普悠瑪";
    if (/新自強/.test(text)) return "新自強";
    if (/自強.*3000|3000/.test(text)) return "新自強";
    if (/自強/.test(text) && /新/.test(text)) return "自強號(新)";
    if (/自強/.test(text)) return "自強號";
    if (/莒光/.test(text)) return "莒光號";
    if (/復興/.test(text)) return "復興號";
    if (/區間快/.test(text)) return "區間快";
    if (/區間/.test(text)) return "區間車";
    if (/普快/.test(text)) return "普快車";
    if (/普通/.test(text)) return "普通車";
    if (/柴油客車/.test(text)) return "柴油客車";
    if (/柴快/.test(text)) return "柴快車";
    if (/加班/.test(text)) return "加班車";
    return text.replace(/\s+/g, " ");
  }

  function getTraTypeColor(typeName) {
    const type = normalizeTraType(typeName);
    if (window.RailNetwork?.getTraTypeColor) {
      const shared = window.RailNetwork.getTraTypeColor(type);
      if (shared) return type === "區間車" && document.body.classList.contains("dark-mode") ? "#a3a3a3" : shared;
    }
    return TRA_TYPE_FALLBACK_COLORS[type] || TRA_TYPE_FALLBACK_COLORS[type.replace(/[（(].*$/, "").trim()] || "#64748b";
  }

  function sortTraTypes(types) {
    const order = new Map(TRA_TYPE_ORDER.map((type, index) => [type, index]));
    return (Array.isArray(types) ? types : []).slice().sort((a, b) => {
      const ai = order.has(a) ? order.get(a) : 999;
      const bi = order.has(b) ? order.get(b) : 999;
      if (ai !== bi) return ai - bi;
      return String(a).localeCompare(String(b), "zh-Hant");
    });
  }

  function buildStopList(system, stopTimes, originDate, queryDate) {
    const stops = [];
    const originOffset = diffDays(originDate, queryDate) * 1440;
    let dayOffset = 0;
    let prevEventMinute = null;

    function buildAbs(timeText) {
      const minute = parseTime(timeText);
      if (!Number.isFinite(minute)) return null;
      if (prevEventMinute !== null && minute < prevEventMinute) dayOffset += 1;
      prevEventMinute = minute;
      return originOffset + dayOffset * 1440 + minute;
    }

    (Array.isArray(stopTimes) ? stopTimes : []).forEach((stop, index) => {
      const arrText = String(stop.arr || "").trim();
      const depText = String(stop.dep || "").trim();
      const arrAbs = arrText ? buildAbs(arrText) : null;
      const depAbs = depText ? buildAbs(depText) : null;
      const name = displayName(stop.name || "");
      stops.push({
        index,
        name,
        normalized: normalizeName(name),
        stationKey: stationKeyOf(system, name),
        arr: arrText,
        dep: depText,
        arrAbs,
        depAbs,
      });
    });
    return stops;
  }

  function buildStopIndexMap(stops) {
    const map = new Map();
    (Array.isArray(stops) ? stops : []).forEach((stop, index) => {
      if (!stop?.normalized) return;
      if (!map.has(stop.normalized)) map.set(stop.normalized, []);
      map.get(stop.normalized).push(index);
    });
    return map;
  }

  function getStopDepartureAbs(stop) {
    return Number.isFinite(stop?.depAbs) ? stop.depAbs : (Number.isFinite(stop?.arrAbs) ? stop.arrAbs : null);
  }

  function getStopArrivalAbs(stop) {
    return Number.isFinite(stop?.arrAbs) ? stop.arrAbs : (Number.isFinite(stop?.depAbs) ? stop.depAbs : null);
  }

  function getStopDepartureText(stop) {
    return stop?.dep || stop?.arr || "--";
  }

  function getStopArrivalText(stop) {
    return stop?.arr || stop?.dep || "--";
  }

  function translateTraEntries(raw, originDate, queryDate) {
    const rows = Array.isArray(raw?.TrainTimetables) ? raw.TrainTimetables : [];
    return rows
      .map((item) => {
        const info = item?.TrainInfo || {};
        const trainNo = String(info?.TrainNo || "").trim();
        const originalType = String(info?.TrainTypeName?.Zh_tw || "").trim();
        const stops = buildStopList(
          "tra",
          (Array.isArray(item?.StopTimes) ? item.StopTimes : []).map((stop) => ({
            name: stop?.StationName?.Zh_tw || "",
            arr: stop?.ArrivalTime || "",
            dep: stop?.DepartureTime || "",
          })),
          originDate,
          queryDate
        );
        if (!trainNo || stops.length < 2) return null;
        return {
          key: `tra|${trainNo}|${originDate}`,
          system: "tra",
          trainNo,
          type: normalizeTraType(originalType),
          rawType: originalType,
          originDate,
          stops,
          stopIndexMap: buildStopIndexMap(stops),
        };
      })
      .filter(Boolean);
  }

  function translateThsrEntries(raw, originDate, queryDate) {
    const rows = Array.isArray(raw) ? raw : [];
    return rows
      .map((item) => {
        const info = item?.DailyTrainInfo || {};
        const trainNo = String(info?.TrainNo || "").trim();
        const stops = buildStopList(
          "thsr",
          (Array.isArray(item?.StopTimes) ? item.StopTimes : []).map((stop) => ({
            name: stop?.StationName?.Zh_tw || "",
            arr: stop?.ArrivalTime || "",
            dep: stop?.DepartureTime || "",
          })),
          originDate,
          queryDate
        );
        if (!trainNo || stops.length < 2) return null;
        return {
          key: `thsr|${trainNo}|${originDate}`,
          system: "thsr",
          trainNo,
          type: "高鐵",
          rawType: "高鐵",
          originDate,
          stops,
          stopIndexMap: buildStopIndexMap(stops),
        };
      })
      .filter(Boolean);
  }

  async function fetchTraSchedule(dateStr) {
    return fetchJson(`https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${dateStr}?%24format=JSON`);
  }

  async function fetchThsrSchedule(dateStr) {
    return fetchJson(`https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainDate/${dateStr}?$format=JSON`);
  }

  function updateAvailableTraTypes(data) {
    state.availableTraTypes = sortTraTypes(
      uniqueByKey(
        (data?.entries || [])
          .filter((entry) => entry.system === "tra")
          .map((entry) => entry.type)
          .filter(Boolean),
        (type) => type
      )
    );
  }

  function buildBoardEvents(entries) {
    const events = [];
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      for (let boardIdx = 0; boardIdx < entry.stops.length - 1; boardIdx++) {
        const boardStop = entry.stops[boardIdx];
        const depAbs = getStopDepartureAbs(boardStop);
        if (!Number.isFinite(depAbs)) continue;
        events.push({
          entry,
          trainKey: entry.key,
          boardIdx,
          boardStop,
          depAbs,
          stationKey: boardStop.stationKey,
        });
      }
    });
    return events.sort((a, b) => a.depAbs - b.depAbs || String(a.trainKey).localeCompare(String(b.trainKey)));
  }

  function buildGraphCacheKey(selectedTraTypes) {
    return sortTraTypes(selectedTraTypes).join("|");
  }

  function getGraphForFilters(data, selectedTraTypes) {
    const key = buildGraphCacheKey(selectedTraTypes);
    if (!data.graphCache) data.graphCache = new Map();
    if (data.graphCache.has(key)) return data.graphCache.get(key);

    const typeSet = new Set((Array.isArray(selectedTraTypes) ? selectedTraTypes : []).filter(Boolean));
    const entries = (data.entries || []).filter((entry) => {
      if (entry.system !== "tra") return true;
      if (!typeSet.size) return true;
      return typeSet.has(entry.type);
    });

    const graph = {
      entries,
      boardEvents: buildBoardEvents(entries),
    };
    data.graphCache.set(key, graph);
    return graph;
  }

  async function ensureDataForDate(queryDate, force = false) {
    await loadStationCatalog();
    const cacheKey = String(queryDate || "");
    if (!force && state.dataCache.has(cacheKey)) return state.dataCache.get(cacheKey);

    const prevDate = addDays(queryDate, -1);
    const [traBase, traPrev, thsrBase, thsrPrev] = await Promise.all([
      fetchTraSchedule(queryDate),
      fetchTraSchedule(prevDate),
      fetchThsrSchedule(queryDate),
      fetchThsrSchedule(prevDate),
    ]);

    const data = {
      queryDate,
      prevDate,
      entries: translateTraEntries(traBase, queryDate, queryDate)
        .concat(translateTraEntries(traPrev, prevDate, queryDate))
        .concat(translateThsrEntries(thsrBase, queryDate, queryDate))
        .concat(translateThsrEntries(thsrPrev, prevDate, queryDate)),
      graphCache: new Map(),
    };
    updateAvailableTraTypes(data);
    state.dataCache.set(cacheKey, data);
    return data;
  }

  function findStationExact(system, value) {
    const normalized = normalizeName(value);
    return (state.stations[system] || []).find((station) => station.normalized === normalized) || null;
  }

  function detectSystemHint(raw) {
    const text = String(raw || "").trim();
    if (/^(台鐵|臺鐵|tra|tr)\b/i.test(text) || /^(台鐵|臺鐵|tra|tr)(?=\S)/i.test(text)) return "tra";
    if (/^(高鐵|thsr|hsr)\b/i.test(text) || /^(高鐵|thsr|hsr)(?=\S)/i.test(text)) return "thsr";
    return "";
  }

  function stripSystemHint(raw) {
    return String(raw || "").trim().replace(/^(台鐵|臺鐵|tra|tr|高鐵|thsr|hsr)\s*[:：\-－]?\s*/i, "");
  }

  function lookupStations(system, raw) {
    const key = normalizeLookup(raw);
    if (!key) return [];
    const exact = state.stationAliasMap[system]?.get(key);
    return exact ? [exact] : [];
  }

  function lookupAnyStations(raw) {
    const key = normalizeLookup(raw);
    if (!key) return [];
    return (state.stationAnyAliasMap.get(key) || []).slice();
  }

  function formatQueryDisplayName(raw, candidates) {
    const names = uniqueByKey((Array.isArray(candidates) ? candidates : []).map((station) => station.name), (name) => normalizeName(name));
    if (names.length === 1) return names[0];
    const cleaned = String(raw || "").trim().replace(/^(台鐵|臺鐵|高鐵)\s*/i, "");
    return cleaned || names[0] || "--";
  }

  function parseStationInput(raw) {
    const text = String(raw || "").trim();
    if (!text) return null;

    const systemHint = detectSystemHint(text);
    let candidates = [];

    if (systemHint) {
      const stripped = stripSystemHint(text);
      candidates = lookupStations(systemHint, stripped);
      if (!candidates.length) candidates = lookupStations(systemHint, text);
    } else {
      candidates = lookupAnyStations(text);
    }

    if (!candidates.length) {
      const stripped = stripSystemHint(text);
      candidates = lookupAnyStations(stripped);
    }

    candidates = uniqueByKey(candidates, (station) => station.key);
    if (!candidates.length) return null;

    return {
      raw: text,
      systemHint,
      name: formatQueryDisplayName(text, candidates),
      choices: candidates,
    };
  }

  function readHistory() {
    try {
      const rows = safeJsonParse(localStorage.getItem(STORAGE_KEYS.history) || "[]", []);
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory(start, end) {
    const next = [{ start, end }, ...readHistory().filter((item) => !(item.start === start && item.end === end))].slice(0, 8);
    try {
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(next));
    } catch (_) {}
  }

  function fillStationDatalist(keyword) {
    const datalist = qs("transferStationList");
    if (!datalist) return;
    const search = normalizeLookup(keyword);
    const options = [];
    for (let i = 0; i < state.stationOptions.length && options.length < 36; i++) {
      const option = state.stationOptions[i];
      const matches = !search || (option.tokens || []).some((token) => normalizeLookup(token).includes(search));
      if (!matches) continue;
      options.push(`<option value="${escapeHtml(option.value)}"></option>`);
    }
    datalist.innerHTML = options.join("");
  }

  function bindStationInput(id) {
    const input = qs(id);
    if (!input) return;
    input.addEventListener("focus", () => fillStationDatalist(input.value));
    input.addEventListener("input", () => fillStationDatalist(input.value));
  }

  function createOriginState(station, accessMin = 0, parent = null, walkInfo = null) {
    return {
      kind: walkInfo ? "walk" : "origin",
      parent,
      walk: walkInfo,
      started: false,
      stationKey: station.key,
      stationName: station.name,
      system: station.system,
      arrivalAbs: accessMin,
      originAccessMin: accessMin,
      effectiveDepAbs: null,
      transferCount: 0,
      lastTrainKey: "",
    };
  }

  function buildStartStateMap(startInput) {
    const map = new Map();

    function keep(stateCandidate) {
      const current = map.get(stateCandidate.stationKey);
      if (!current || stateCandidate.originAccessMin < current.originAccessMin) {
        map.set(stateCandidate.stationKey, stateCandidate);
      }
    }

    (startInput?.choices || []).forEach((station) => {
      const origin = createOriginState(station, 0);
      keep(origin);
      const pair = interchangeByStationKey.get(station.key);
      if (pair) {
        const counterpart = state.stationBySystem[pair.toSystem].get(pair.toKey);
        if (counterpart) {
          keep(
            createOriginState(counterpart, pair.walkMin, origin, {
              fromStation: station.name,
              toStation: counterpart.name,
              walkMin: pair.walkMin,
              label: pair.label,
            })
          );
        }
      }
    });

    return map;
  }

  function buildEndAccessMap(endInput) {
    const map = new Map();

    function keep(station, egressMin, viaWalk) {
      const current = map.get(station.key);
      if (!current || egressMin < current.egressMin) {
        map.set(station.key, {
          station,
          egressMin,
          viaWalk,
        });
      }
    }

    (endInput?.choices || []).forEach((station) => {
      keep(station, 0, null);
      const pair = interchangeByStationKey.get(station.key);
      if (pair) {
        const counterpart = state.stationBySystem[pair.toSystem].get(pair.toKey);
        if (counterpart) {
          keep(counterpart, pair.walkMin, {
            fromStation: counterpart.name,
            toStation: station.name,
            walkMin: pair.walkMin,
            label: pair.label,
          });
        }
      }
    });

    return map;
  }

  function compareDominance(a, b) {
    const dominates =
      (a.arrivalAbs ?? Infinity) <= (b.arrivalAbs ?? Infinity) &&
      (a.effectiveDepAbs ?? -Infinity) >= (b.effectiveDepAbs ?? -Infinity) &&
      (a.transferCount ?? Infinity) <= (b.transferCount ?? Infinity);
    const strictlyBetter =
      (a.arrivalAbs ?? Infinity) < (b.arrivalAbs ?? Infinity) ||
      (a.effectiveDepAbs ?? -Infinity) > (b.effectiveDepAbs ?? -Infinity) ||
      (a.transferCount ?? Infinity) < (b.transferCount ?? Infinity);
    return dominates && strictlyBetter;
  }

  function insertStartedState(frontiers, nextState) {
    const list = frontiers.get(nextState.stationKey) || [];
    for (let i = 0; i < list.length; i++) {
      if (compareDominance(list[i], nextState)) return false;
    }
    const filtered = list.filter((item) => !compareDominance(nextState, item));
    filtered.push(nextState);
    filtered.sort((a, b) => (a.arrivalAbs ?? Infinity) - (b.arrivalAbs ?? Infinity) || (b.effectiveDepAbs ?? -Infinity) - (a.effectiveDepAbs ?? -Infinity) || (a.transferCount ?? Infinity) - (b.transferCount ?? Infinity));
    frontiers.set(nextState.stationKey, filtered);
    return true;
  }

  function walkMinutesFromState(stateNode) {
    let minutes = 0;
    let cursor = stateNode;
    while (cursor?.kind === "walk" && cursor.walk) {
      minutes += Number(cursor.walk.walkMin || 0);
      cursor = cursor.parent;
    }
    return minutes;
  }

  function findLastRideState(stateNode) {
    let cursor = stateNode;
    while (cursor) {
      if (cursor.kind === "ride") return cursor;
      cursor = cursor.parent;
    }
    return null;
  }

  function getOriginNowAbs(originDate) {
    const now = new Date();
    const today = fmtDate(now);
    const dayOffset = diffDays(today, originDate || today);
    return dayOffset * 1440 + now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  }

  function getLegOriginDepartAbs(leg) {
    return getStopDepartureAbs(leg?.entry?.stops?.[0]) ?? leg?.departAbs ?? null;
  }

  function getTraDelayMinutes(trainNo) {
    if (typeof window.getDelayMinutes !== "function") return 0;
    try {
      const delay = Number(window.getDelayMinutes(String(trainNo || "").trim()) || 0);
      return Number.isFinite(delay) ? Math.max(0, delay) : 0;
    } catch (_) {
      return 0;
    }
  }

  function getStatusTone(text) {
    if (/晚\d+分/.test(String(text || ""))) return "warning";
    if (/行駛中|準點/.test(String(text || ""))) return "success";
    return "muted";
  }

  function isTerminalLeg(leg) {
    const stopCount = Array.isArray(leg?.entry?.stops) ? leg.entry.stops.length : 0;
    if (!stopCount) return false;
    return Number(leg?.endIdx) >= stopCount - 1;
  }

  function isTraLocalType(type) {
    return normalizeTraType(type) === "區間車";
  }

  function isProhibitedTransfer(previousRide, event) {
    const previousLeg = previousRide?.leg;
    const nextEntry = event?.entry;
    if (!previousLeg || !nextEntry) return false;
    if (isTerminalLeg(previousLeg)) return false;
    if (previousLeg.system === "thsr" && nextEntry.system === "thsr") return true;
    if (previousLeg.system === "tra" && nextEntry.system === "tra") {
      if (isTraLocalType(previousLeg.type) && isTraLocalType(nextEntry.type)) return true;
    }
    return false;
  }

  function buildTransferInfo(previousState, event) {
    const previousRide = findLastRideState(previousState);
    if (!previousRide?.leg) return null;
    const walkMin = walkMinutesFromState(previousState);
    const bufferMin = Math.round(event.depAbs - previousState.arrivalAbs);
    const totalGapMin = Math.round(event.depAbs - previousRide.leg.arriveAbs);
    return {
      fromStation: previousRide.leg.endStation,
      toStation: event.boardStop.name,
      displayStation: buildTransferDisplayStation(previousRide.leg.endStation, event.boardStop.name),
      walkMin,
      bufferMin,
      totalGapMin,
      arriveAbs: previousRide.leg.arriveAbs,
      readyAbs: previousState.arrivalAbs,
      departAbs: event.depAbs,
      fromSystem: previousRide.leg.system,
      toSystem: event.entry.system,
      label: walkMin > 0
        ? `${previousRide.leg.endStation} → ${event.boardStop.name}`
        : `${event.boardStop.name} 站內轉乘`,
    };
  }

  function compareBoardCandidate(a, b) {
    if (!a) return 1;
    if (!b) return -1;
    const byDep = (b.effectiveDepAbs ?? -Infinity) - (a.effectiveDepAbs ?? -Infinity);
    if (byDep) return byDep;
    const byTransfer = (a.transferCount ?? Infinity) - (b.transferCount ?? Infinity);
    if (byTransfer) return byTransfer;
    const byArrival = (b.predecessor?.arrivalAbs ?? -Infinity) - (a.predecessor?.arrivalAbs ?? -Infinity);
    if (byArrival) return byArrival;
    return 0;
  }

  function selectBestBoardingCandidate(event, startStateMap, frontiers) {
    let best = null;
    const startState = startStateMap.get(event.stationKey);
    if (startState && event.depAbs >= startState.arrivalAbs) {
      best = {
        predecessor: startState,
        effectiveDepAbs: event.depAbs - startState.originAccessMin,
        transferCount: 0,
        transferInfo: null,
      };
    }

    const cutoff = event.depAbs - MIN_TRANSFER_BUFFER;
    const list = frontiers.get(event.stationKey) || [];
    for (let i = 0; i < list.length; i++) {
      const node = list[i];
      if ((node.arrivalAbs ?? Infinity) > cutoff) break;
      if (node.lastTrainKey && node.lastTrainKey === event.trainKey) continue;
      const previousRide = findLastRideState(node);
      if (isProhibitedTransfer(previousRide, event)) continue;
      const transferInfo = buildTransferInfo(node, event);
      if (!transferInfo || transferInfo.bufferMin < MIN_TRANSFER_BUFFER) continue;
      const candidate = {
        predecessor: node,
        effectiveDepAbs: node.effectiveDepAbs,
        transferCount: node.transferCount + 1,
        transferInfo,
      };
      if (compareBoardCandidate(candidate, best) < 0) best = candidate;
    }

    return best;
  }

  function createRideState(event, candidate, endIdx) {
    const arriveStop = event.entry.stops[endIdx];
    const arriveAbs = getStopArrivalAbs(arriveStop);
    if (!Number.isFinite(arriveAbs) || arriveAbs <= event.depAbs) return null;

    return {
      kind: "ride",
      parent: candidate.predecessor,
      started: true,
      stationKey: arriveStop.stationKey,
      stationName: arriveStop.name,
      system: event.entry.system,
      arrivalAbs: arriveAbs,
      originAccessMin: null,
      effectiveDepAbs: candidate.effectiveDepAbs,
      transferCount: candidate.transferCount,
      lastTrainKey: event.trainKey,
      boardingTransfer: candidate.transferInfo,
      leg: {
        key: `${event.trainKey}|${event.boardIdx}|${endIdx}`,
        trainKey: event.trainKey,
        entry: event.entry,
        system: event.entry.system,
        trainNo: event.entry.trainNo,
        type: event.entry.type,
        rawType: event.entry.rawType,
        originDate: event.entry.originDate,
        startIdx: event.boardIdx,
        endIdx,
        startStation: event.boardStop.name,
        endStation: arriveStop.name,
        departAbs: event.depAbs,
        arriveAbs,
        departText: getStopDepartureText(event.boardStop),
        arriveText: getStopArrivalText(arriveStop),
      },
    };
  }

  function createWalkStateFromRide(rideState) {
    const pair = interchangeByStationKey.get(rideState.stationKey);
    if (!pair) return null;
    return {
      kind: "walk",
      parent: rideState,
      walk: {
        fromStation: pair.fromName,
        toStation: pair.toName,
        walkMin: pair.walkMin,
        label: pair.label,
      },
      started: true,
      stationKey: pair.toKey,
      stationName: pair.toName,
      system: pair.toSystem,
      arrivalAbs: rideState.arrivalAbs + pair.walkMin,
      originAccessMin: null,
      effectiveDepAbs: rideState.effectiveDepAbs,
      transferCount: rideState.transferCount,
      lastTrainKey: rideState.lastTrainKey,
    };
  }

  function collectStateChain(stateNode) {
    const nodes = [];
    let cursor = stateNode;
    while (cursor) {
      nodes.push(cursor);
      cursor = cursor.parent;
    }
    return nodes.reverse();
  }

  function buildTransferDisplayStation(fromStation, toStation) {
    const fromName = displayName(fromStation);
    const toName = displayName(toStation);
    return normalizeName(fromName) === normalizeName(toName) ? fromName : `${fromName} / ${toName}`;
  }

  function buildPlanPathText(startInput, endInput, transfers) {
    const points = [startInput.name];
    (Array.isArray(transfers) ? transfers : []).forEach((transfer) => {
      const label = transfer.displayStation;
      if (!label) return;
      const previous = points[points.length - 1];
      if (normalizeName(previous) === normalizeName(label)) return;
      points.push(label);
    });
    const last = points[points.length - 1];
    if (normalizeName(last) !== normalizeName(endInput.name)) points.push(endInput.name);
    return points.join(" → ");
  }

  function buildPlanStatus(plan, queryDate) {
    const today = fmtDate(new Date());
    if (queryDate > today) return { text: "未發車", tone: "muted" };
    if (queryDate < today) return { text: "已到站", tone: "muted" };

    const now = new Date();
    const nowAbs = now.getHours() * 60 + now.getMinutes();
    if (nowAbs < (plan.firstLeg?.departAbs ?? Infinity)) return { text: "未發車", tone: "muted" };
    if (nowAbs >= (plan.lastLeg?.arriveAbs ?? -Infinity)) return { text: "已到站", tone: "muted" };

    const waitingTransfer = (plan.transfers || []).find(
      (transfer) => nowAbs >= transfer.arriveAbs && nowAbs < transfer.departAbs
    );
    if (waitingTransfer) return { text: "轉乘中", tone: waitingTransfer.bufferMin < TIGHT_TRANSFER_BUFFER ? "warning" : "success" };

    return { text: "行駛中", tone: "success" };
  }

  function buildLegStatus(leg, queryDate) {
    if (!leg?.entry) return { text: "--", tone: "muted" };
    const today = fmtDate(new Date());
    const originDate = leg.originDate || queryDate || today;
    if (originDate > today || queryDate > today) return { text: "未發車", tone: "muted" };

    const delayMin = leg.system === "tra" ? getTraDelayMinutes(leg.trainNo) : 0;
    const nowAbs = getOriginNowAbs(originDate);
    const originDepartAbs = getLegOriginDepartAbs(leg);
    const departAbs = Number.isFinite(leg.departAbs) ? leg.departAbs : originDepartAbs;
    const passedAbs = Number.isFinite(departAbs) ? (departAbs + delayMin) : Infinity;

    if (Number.isFinite(passedAbs) && nowAbs >= passedAbs) {
      return { text: "已過站", tone: "muted" };
    }
    if (Number.isFinite(originDepartAbs) && nowAbs < originDepartAbs) {
      return { text: "未發車", tone: "muted" };
    }
    if (leg.system === "thsr") {
      return { text: "行駛中", tone: "success" };
    }
    if (delayMin > 0) {
      return { text: `晚${delayMin}分`, tone: "warning" };
    }
    return { text: "準點", tone: "success" };
  }

  function buildPlanRouteLines(plan) {
    return (Array.isArray(plan?.legs) ? plan.legs : []).map((leg, index) => {
      const nextTransfer = plan?.transfers?.[index];
      const suffix = Number.isFinite(nextTransfer?.bufferMin) ? `(${nextTransfer.bufferMin}分)` : "";
      return `${leg.startStation} → ${leg.endStation}${suffix}`;
    });
  }

  function buildPrimaryPlanStatus(plan, queryDate) {
    const status = buildLegStatus(plan?.firstLeg, queryDate);
    return {
      text: status.text,
      tone: status.tone || getStatusTone(status.text),
    };
  }

  function buildPlanFromState(finalState, startInput, endInput, endAccess, queryDate) {
    if (!finalState?.started || !endAccess) return null;
    if (!Number.isFinite(finalState.effectiveDepAbs) || finalState.effectiveDepAbs < 0 || finalState.effectiveDepAbs >= 1440) return null;

    const chain = collectStateChain(finalState);
    const rideStates = chain.filter((node) => node.kind === "ride" && node.leg);
    if (!rideStates.length) return null;

    const legs = rideStates.map((node) => ({ ...node.leg }));
    const transfers = rideStates
      .slice(1)
      .map((node) => node.boardingTransfer)
      .filter(Boolean);

    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];
    const effectiveDepAbs = finalState.effectiveDepAbs;
    const effectiveArrAbs = finalState.arrivalAbs + endAccess.egressMin;
    const travelMin = effectiveArrAbs - effectiveDepAbs;
    if (!Number.isFinite(travelMin) || travelMin <= 0) return null;

    const startAccessMin = Math.max(0, Math.round((firstLeg.departAbs ?? effectiveDepAbs) - effectiveDepAbs));
    const endAccessMin = Math.max(0, Math.round(endAccess.egressMin || 0));
    const minBufferMin = transfers.length ? Math.min(...transfers.map((transfer) => transfer.bufferMin)) : null;

    const plan = {
      signature: `${lastLeg.trainKey}|${lastLeg.endIdx}|${effectiveDepAbs}|${effectiveArrAbs}`,
      startInput,
      endInput,
      chain,
      legs,
      firstLeg,
      lastLeg,
      transfers,
      transferCount: Math.max(0, legs.length - 1),
      startAccessMin,
      endAccessMin,
      effectiveDepAbs,
      effectiveArrAbs,
      travelMin,
      minBufferMin,
      routeText: buildPlanPathText(startInput, endInput, transfers),
      routeLines: [],
      status: null,
      endAccess,
    };
    plan.routeLines = buildPlanRouteLines(plan);
    plan.routeText = plan.routeLines.join(" / ");
    plan.status = buildPrimaryPlanStatus(plan, queryDate);
    return plan;
  }

  function comparePlan(a, b) {
    const byTravel = (a.travelMin ?? Infinity) - (b.travelMin ?? Infinity);
    if (byTravel) return byTravel;
    const byTransfer = (a.transferCount ?? Infinity) - (b.transferCount ?? Infinity);
    if (byTransfer) return byTransfer;
    const byDeparture = (b.effectiveDepAbs ?? -Infinity) - (a.effectiveDepAbs ?? -Infinity);
    if (byDeparture) return byDeparture;
    const byArrival = (a.effectiveArrAbs ?? Infinity) - (b.effectiveArrAbs ?? Infinity);
    if (byArrival) return byArrival;
    return String(a.signature || "").localeCompare(String(b.signature || ""), "zh-Hant");
  }

  function groupPlanKey(plan) {
    return `${plan.lastLeg.trainKey}|${plan.lastLeg.endIdx}|${plan.effectiveArrAbs}|${normalizeName(plan.endInput.name)}`;
  }

  function findDirectArrivalOnEntry(entry, fromIdx, endInput) {
    const endAccessMap = buildEndAccessMap(endInput);
    let best = Infinity;
    for (let i = fromIdx + 1; i < entry.stops.length; i++) {
      const stop = entry.stops[i];
      const arrAbs = getStopArrivalAbs(stop);
      const access = endAccessMap.get(stop.stationKey);
      if (!Number.isFinite(arrAbs) || !access) continue;
      best = Math.min(best, arrAbs + (access.egressMin || 0));
    }
    return Number.isFinite(best) ? best : null;
  }

  function hasSameSystemDirectContinuation(plan) {
    for (let i = 0; i < plan.legs.length - 1; i++) {
      const leg = plan.legs[i];
      const nextLeg = plan.legs[i + 1];
      if (!leg || !nextLeg || leg.system !== nextLeg.system) continue;
      const directArrival = findDirectArrivalOnEntry(leg.entry, leg.endIdx, plan.endInput);
      if (Number.isFinite(directArrival) && directArrival <= plan.effectiveArrAbs + DIRECT_PREFERENCE_MARGIN) {
        return true;
      }
    }
    return false;
  }

  function preferDirectPlans(plans) {
    const directPlans = (Array.isArray(plans) ? plans : []).filter((plan) => plan?.transferCount === 0);
    if (!directPlans.length) return (Array.isArray(plans) ? plans : []).slice();
    return (Array.isArray(plans) ? plans : []).filter((plan) => {
      if (!plan || plan.transferCount === 0) return true;
      if (directPlans.some((directPlan) =>
        (directPlan.effectiveDepAbs ?? Infinity) >= (plan.effectiveDepAbs ?? -Infinity) &&
        (directPlan.effectiveArrAbs ?? Infinity) <= (plan.effectiveArrAbs ?? Infinity) + DIRECT_PREFERENCE_MARGIN
      )) {
        return false;
      }
      return true;
    });
  }

  function removeDepartureDominatedPlans(plans) {
    const sorted = (Array.isArray(plans) ? plans : []).slice().sort((a, b) =>
      (a.effectiveDepAbs ?? Infinity) - (b.effectiveDepAbs ?? Infinity) ||
      (b.effectiveArrAbs ?? -Infinity) - (a.effectiveArrAbs ?? -Infinity) ||
      comparePlan(a, b)
    );
    let bestLaterArrival = Infinity;
    const keep = new Array(sorted.length).fill(true);
    for (let i = sorted.length - 1; i >= 0; i--) {
      const arrival = sorted[i]?.effectiveArrAbs ?? Infinity;
      if (arrival >= bestLaterArrival) {
        keep[i] = false;
        continue;
      }
      bestLaterArrival = Math.min(bestLaterArrival, arrival);
    }
    return sorted.filter((_, index) => keep[index]);
  }

  function dedupePlans(plans, modeEnabled) {
    const prefiltered = preferDirectPlans(
      (Array.isArray(plans) ? plans : []).filter((plan) =>
        plan &&
        (plan.transferCount === 0 || (plan.minBufferMin ?? Infinity) >= MIN_TRANSFER_BUFFER) &&
        !hasSameSystemDirectContinuation(plan)
      )
    );
    const groups = new Map();
    prefiltered.forEach((plan) => {
        const key = groupPlanKey(plan);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(plan);
      });

    const deduped = [];
    groups.forEach((list) => {
      list.sort(comparePlan);
      if (!list.length) return;
      deduped.push(list[0]);
      if (!modeEnabled && list[0].transferCount > 0 && (list[0].minBufferMin ?? Infinity) < TIGHT_TRANSFER_BUFFER && list[1]) {
        deduped.push(list[1]);
        return;
      }
      if (modeEnabled) {
        list.slice(1, MAX_GROUP_ALTERNATIVES).forEach((plan) => deduped.push(plan));
      }
    });

    return removeDepartureDominatedPlans(deduped).slice(0, MAX_TOTAL_RESULTS);
  }

  function searchReachablePlans(graph, startInput, endInput, queryDate, modeEnabled) {
    const startStateMap = buildStartStateMap(startInput);
    const endAccessMap = buildEndAccessMap(endInput);
    const frontiers = new Map();
    const rawPlans = [];

    graph.boardEvents.forEach((event) => {
      const candidate = selectBestBoardingCandidate(event, startStateMap, frontiers);
      if (!candidate) return;

      for (let endIdx = event.boardIdx + 1; endIdx < event.entry.stops.length; endIdx++) {
        const rideState = createRideState(event, candidate, endIdx);
        if (!rideState) continue;

        if (insertStartedState(frontiers, rideState)) {
          const endAccess = endAccessMap.get(rideState.stationKey);
          if (endAccess) {
            const plan = buildPlanFromState(rideState, startInput, endInput, endAccess, queryDate);
            if (plan) rawPlans.push(plan);
          }

          const walkState = createWalkStateFromRide(rideState);
          if (walkState && insertStartedState(frontiers, walkState)) {
            const walkEndAccess = endAccessMap.get(walkState.stationKey);
            if (walkEndAccess) {
              const walkedPlan = buildPlanFromState(walkState, startInput, endInput, walkEndAccess, queryDate);
              if (walkedPlan) rawPlans.push(walkedPlan);
            }
          }
        }
      }
    });

    return dedupePlans(rawPlans, modeEnabled);
  }

  function buildTrainTypeText(system, type) {
    if (system === "thsr") {
      return `<span class="dualrail-train-type-text dualrail-train-type-thsr">高鐵</span>`;
    }
    const label = normalizeTraType(type);
    const color = getTraTypeColor(label);
    return `<span class="dualrail-train-type-text" style="color:${escapeHtml(color)}">${escapeHtml(label)}</span>`;
  }

  function buildTrainInlineHtml(leg) {
    if (leg.system === "thsr") {
      return `<div class="dualrail-train-line"><span class="dualrail-train-no">${escapeHtml(leg.trainNo)}</span>${buildTrainTypeText(leg.system, leg.type)}</div>`;
    }
    return `<div class="dualrail-train-line"><span class="dualrail-train-no">${escapeHtml(leg.trainNo)}</span>${buildTrainTypeText(leg.system, leg.type)}</div>`;
  }

  function buildTrainSummaryText(plan) {
    return plan.legs.map((leg) => buildTrainInlineHtml(leg)).join("");
  }

  function buildSummaryTrainHtml(plan) {
    return plan.legs.map((leg) => {
      if (leg.system === "thsr") {
        return `<span class="dualrail-summary-train"><span class="dualrail-train-no">${escapeHtml(leg.trainNo)}</span>${buildTrainTypeText(leg.system, leg.type)}</span>`;
      }
      return `<span class="dualrail-summary-train"><span class="dualrail-train-no">${escapeHtml(leg.trainNo)}</span>${buildTrainTypeText(leg.system, leg.type)}</span>`;
    }).join(`<span class="dualrail-summary-sep"> / </span>`);
  }

  function buildRouteLinesHtml(lines) {
    return (Array.isArray(lines) ? lines : []).map((line) => `<div class="dualrail-route-line">${escapeHtml(line)}</div>`).join("");
  }

  function buildPlanModeText(plan) {
    if (!plan?.transferCount) return "直達";
    return `轉乘 ${plan.transferCount} 次`;
  }

  function buildPlanMetaText(plan) {
    if (!plan.transferCount) return plan.startAccessMin || plan.endAccessMin ? `直達 · 步行 ${plan.startAccessMin + plan.endAccessMin} 分` : "直達";
    const buffers = (plan.transfers || [])
      .map((transfer) => Number.isFinite(transfer?.bufferMin) ? `${transfer.bufferMin} 分` : "--")
      .filter(Boolean);
    return `轉乘 ${plan.transferCount} 次 · ${buffers.join("/") || "--"}`;
  }

  function buildSummaryLine(plan) {
    if (!plan) return "";
    return `${formatAbsClock(plan.effectiveDepAbs)} → ${formatAbsClock(plan.effectiveArrAbs)} · ${formatDuration(plan.travelMin)}`;
  }

  function buildMobileCard(row) {
    const toneClass = row.statusTone ? `tone-${row.statusTone}` : "tone-muted";
    return `
      <div class="dualrail-mobile-card">
        <div class="dualrail-mobile-top">
          <div class="dualrail-mobile-time">
            <strong>${escapeHtml(row.timeText)}</strong>
            <span>${escapeHtml(row.durationText)}</span>
          </div>
          <span class="dualrail-mobile-status ${toneClass}">${escapeHtml(row.statusText)}</span>
        </div>
        <div class="dualrail-mobile-trains">${row.trainHtml}</div>
        <div class="dualrail-mobile-route">${escapeHtml(row.routeText)}</div>
        <div class="dualrail-mobile-meta">${escapeHtml(row.metaText)}</div>
      </div>
    `;
  }

  function sortPlansForView(plans, sortKey) {
    const list = (Array.isArray(plans) ? plans : []).slice();
    if (sortKey === "dep") {
      return list.sort((a, b) => (a.effectiveDepAbs ?? Infinity) - (b.effectiveDepAbs ?? Infinity) || comparePlan(a, b));
    }
    if (sortKey === "arr") {
      return list.sort((a, b) => (a.effectiveArrAbs ?? Infinity) - (b.effectiveArrAbs ?? Infinity) || comparePlan(a, b));
    }
    return list.sort(comparePlan);
  }

  function isTraBookableType(plan) {
    const type = String(plan?.firstLeg?.type || "").trim();
    const rawType = String(plan?.firstLeg?.rawType || "").trim();
    if (/專車/.test(type) || /專車/.test(rawType)) return false;
    if (/區間快/.test(type) || /區間/.test(type)) return false;
    return true;
  }

  function canBookPlan(plan) {
    if (!plan || plan.transferCount !== 0 || plan.legs.length !== 1) return { ok: false, reason: "僅直達可訂票" };
    if (String(plan.status?.text || "").includes("已到站")) return { ok: false, reason: "已過站" };
    if (plan.firstLeg.system === "tra" && !isTraBookableType(plan)) return { ok: false, reason: "此車種不提供訂票" };
    const todayStr = fmtDate(new Date());
    if (state.queryDate < todayStr) return { ok: false, reason: "已過站" };
    if (state.queryDate > todayStr) return { ok: true, reason: "" };
    const now = new Date();
    const threshold = now.getHours() * 60 + now.getMinutes() + 10;
    if ((plan.firstLeg.departAbs ?? -Infinity) < threshold) return { ok: false, reason: "開車 10 分鐘內不顯示" };
    return { ok: true, reason: "" };
  }

  function isDesktopViewport() {
    return !!(window.matchMedia && window.matchMedia("(min-width: 721px)").matches);
  }

  async function requestBookingApi(apiUrl) {
    const readErrorText = async (response) => {
      try {
        return String(await response.text()).trim();
      } catch (_) {
        return "";
      }
    };

    const send = async (forceRefresh = false) => {
      const token = await getAccessToken(forceRefresh);
      if (!token) return { ok: false, status: 0, payload: null, errorText: "no-token" };
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: buildAuthHeaders(token),
      });
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          payload: null,
          errorText: await readErrorText(response),
        };
      }
      let payload = null;
      try {
        payload = await response.json();
      } catch (_) {}
      return { ok: true, status: response.status, payload, errorText: "" };
    };

    let result = await send(false);
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      result = await send(true);
    }
    return result;
  }

  function extractBookingUrl(payload) {
    if (typeof payload === "string") return payload;
    return payload?.url || payload?.data?.url || payload?.data?.deeplink || payload?.DeepLinkUrl || payload?.link || "";
  }

  function openExternalBookingUrl(jumpUrl) {
    if (!jumpUrl) return;
    if (isDesktopViewport()) {
      window.open(jumpUrl, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = jumpUrl;
  }

  function normalizeTraBookingStationName(value) {
    return String(value || "").trim().replace(/台/g, "臺");
  }

  async function openTraBookingWeb(plan) {
    const startStation = normalizeTraBookingStationName(plan.firstLeg.startStation);
    const endStation = normalizeTraBookingStationName(plan.firstLeg.endStation);
    const params = new URLSearchParams({
      start_station: startStation,
      end_station: endStation,
      departure_date: state.queryDate,
      departure_number: String(plan.firstLeg.trainNo || "").trim(),
      ticket_type: "1",
      ticket_count: "1",
    });
    const result = await requestBookingApi(`https://tdx.transportdata.tw/api/maas-tra/booking/deeplink/web/tra?${params.toString()}`);
    if (!result.ok) {
      alert(`台鐵官網訂票連結取得失敗${result.status ? `（HTTP ${result.status}）` : ""}${result.errorText ? `\n${result.errorText}` : ""}`);
      return;
    }
    const jumpUrl = extractBookingUrl(result.payload);
    if (!jumpUrl) {
      alert("無法取得台鐵官網訂票連結。");
      return;
    }
    openExternalBookingUrl(jumpUrl);
  }

  async function openTraBookingDeepLink(plan) {
    const startStation = normalizeTraBookingStationName(plan.firstLeg.startStation);
    const endStation = normalizeTraBookingStationName(plan.firstLeg.endStation);
    const apiUrl = `https://tdx.transportdata.tw/api/maas-tra/booking/deeplink/direct/tra?start_station=${encodeURIComponent(startStation)}&end_station=${encodeURIComponent(endStation)}&train_date=${encodeURIComponent(state.queryDate)}&train_number=${encodeURIComponent(String(plan.firstLeg.trainNo || "").trim())}`;
    const result = await requestBookingApi(apiUrl);
    if (!result.ok) {
      alert(`台鐵訂票連結取得失敗${result.status ? `（HTTP ${result.status}）` : ""}${result.errorText ? `\n${result.errorText}` : ""}`);
      return;
    }
    const jumpUrl = extractBookingUrl(result.payload);
    if (!jumpUrl) {
      alert("無法取得台鐵訂票連結。");
      return;
    }
    openExternalBookingUrl(jumpUrl);
  }

  function normalizeThsrBookingStationName(value) {
    const text = String(value || "").trim().replace(/臺/g, "台");
    if (text === "高雄" || text === "新左營") return "左營";
    return text;
  }

  function normalizeThsrBookingTrainNo(value) {
    const digits = String(value || "").trim().replace(/\D/g, "");
    if (!digits) return "";
    return digits.length === 3 || digits.length === 4 ? digits.padStart(4, "0") : "";
  }

  async function openThsrBookingWeb(plan) {
    const params = new URLSearchParams({
      ticket_type: "S",
      carriage_type: "Y",
      adult_ticket: "1",
      children_ticket: "0",
      disabled_ticket: "0",
      senior_ticket: "0",
      student_ticket: "0",
      start_station: normalizeThsrBookingStationName(plan.firstLeg.startStation),
      end_station: normalizeThsrBookingStationName(plan.firstLeg.endStation),
      departure_date: String(state.queryDate || "").replace(/\D/g, ""),
      departure_number: normalizeThsrBookingTrainNo(plan.firstLeg.trainNo),
    });
    const result = await requestBookingApi(`https://tdx.transportdata.tw/api/maas-thsr/booking/deeplink/web/hsr?${params.toString()}`);
    if (!result.ok) {
      alert(`高鐵官網訂票連結取得失敗${result.status ? `（HTTP ${result.status}）` : ""}${result.errorText ? `\n${result.errorText}` : ""}`);
      return;
    }
    const jumpUrl = extractBookingUrl(result.payload);
    if (!jumpUrl) {
      alert("無法取得高鐵官網訂票連結。");
      return;
    }
    openExternalBookingUrl(jumpUrl);
  }

  async function openThsrBookingDeepLink(plan) {
    const apiUrl = `https://tdx.transportdata.tw/api/maas-thsr/booking/deeplink/direct/hsr?start_station=${encodeURIComponent(normalizeThsrBookingStationName(plan.firstLeg.startStation))}&end_station=${encodeURIComponent(normalizeThsrBookingStationName(plan.firstLeg.endStation))}&train_date=${encodeURIComponent(state.queryDate)}&train_time=${encodeURIComponent(plan.firstLeg.departText || "")}&train_number=${encodeURIComponent(normalizeThsrBookingTrainNo(plan.firstLeg.trainNo))}`;
    const result = await requestBookingApi(apiUrl);
    if (!result.ok) {
      alert(`高鐵訂票連結取得失敗${result.status ? `（HTTP ${result.status}）` : ""}${result.errorText ? `\n${result.errorText}` : ""}`);
      return;
    }
    const jumpUrl = extractBookingUrl(result.payload);
    if (!jumpUrl) {
      alert("無法取得高鐵訂票連結。");
      return;
    }
    openExternalBookingUrl(jumpUrl);
  }

  async function handlePlanBooking(row) {
    const plan = row?.plan;
    const eligibility = canBookPlan(plan);
    if (!eligibility.ok) {
      alert(eligibility.reason || "此班次目前不可訂票");
      return;
    }
    if (plan.firstLeg.system === "tra") {
      if (isDesktopViewport()) await openTraBookingWeb(plan);
      else await openTraBookingDeepLink(plan);
      return;
    }
    if (isDesktopViewport()) await openThsrBookingWeb(plan);
    else await openThsrBookingDeepLink(plan);
  }

  function buildCompactDurationHtml(row) {
    const cls = row?._durClass || row?.durationClass || "rod2-dur-yellow";
    const fill = Math.max(18, Math.min(100, Number(row?._durFill ?? row?.durationFill ?? 42)));
    return `<div class="rod2-durwrap"><div class="rod2-durbox ${cls}" style="--dur-fill:${fill}%"><div class="rod2-durmain">${escapeHtml(row?.durationText || "--")}</div></div></div>`;
  }

  function buildCompactResultCardHtml(row, index) {
    const ticketHtml = row?.ticketHidden
      ? ""
      : `<button class="dualrail-ticket-btn" type="button" data-role="ticket" data-index="${index}">${escapeHtml(row.ticketLabel || "訂票")}</button>`;
    return `
      <article class="dualrail-result-card" data-role="row" data-index="${index}">
        <div class="dualrail-result-head">
          <div class="dualrail-result-time">${escapeHtml(row.timeText || "--")}</div>
          <div class="dualrail-result-trains">${row.trainHtml || "--"}</div>
          <div class="dualrail-result-route">
            <div class="dualrail-result-path">${escapeHtml(row.routeText || "--")}</div>
            <div class="dualrail-result-meta">${escapeHtml(row.metaText || "")}</div>
          </div>
          <div class="dualrail-result-duration">${buildCompactDurationHtml(row)}</div>
          <div class="dualrail-result-side">
            <div class="dualrail-result-status tone-${escapeHtml(row.statusTone || "muted")}">${escapeHtml(row.statusText || "--")}</div>
            ${ticketHtml}
          </div>
        </div>
      </article>
    `;
  }

  function buildCompactResultsHtml(result, rows) {
    return `
      <section class="rod2-panel rod2-summary-panel">
        <div class="rod2-scale-wrap">
          <div class="rod2-sumhead">
            <div>
              ${result?.kickerHtml ? `<div class="rod2-kicker">${result.kickerHtml}</div>` : ""}
              <div class="rod2-title">${result?.titleHtml != null ? result.titleHtml : escapeHtml(result?.title || "")}</div>
              ${result?.subtitle ? `<div class="rod2-subtitle">${escapeHtml(result.subtitle)}</div>` : ""}
            </div>
            <div class="rod2-count">
              <span class="rod2-count-value">${escapeHtml(result?.countValue != null ? result.countValue : rows.length)}</span>
              <span class="rod2-count-label">${escapeHtml(result?.countLabel || "班次")}</span>
            </div>
          </div>
        </div>
      </section>
      <div class="dualrail-results">
        ${rows.length ? rows.map((row, index) => buildCompactResultCardHtml(row, index)).join("") : `<div class="dualrail-results-empty">${escapeHtml(result?.emptyMessage || "查無符合條件的班次")}</div>`}
      </div>
    `;
  }

  function buildRowsForPlans(plans, sortKey) {
    return sortPlansForView(plans, sortKey).map((plan) => {
      const metaText = buildPlanMetaText(plan);
      const bookingState = canBookPlan(plan);
      const row = {
        plan,
        timeText: `${formatAbsClock(plan.effectiveDepAbs)} → ${formatAbsClock(plan.effectiveArrAbs)}`,
        trainHtml: buildTrainSummaryText(plan),
        routeText: plan.routeText,
        durationText: formatDuration(plan.travelMin),
        durationMetaHtml: "",
        metaHtml: escapeHtml(metaText),
        metaText,
        statusText: plan.status?.text || "--",
        statusTone: plan.status?.tone || "muted",
        ticketHidden: !bookingState.ok,
        ticketLabel: "訂票",
        isPassed: (plan.status?.text || "") === "已到站",
        isRunning: (plan.status?.text || "") === "行駛中",
        sortDep: plan.effectiveDepAbs,
        sortArr: plan.effectiveArrAbs,
        sortDur: plan.travelMin,
      };
      row.mobileCardHtml = buildMobileCard({
        timeText: row.timeText,
        durationText: row.durationText,
        trainHtml: row.trainHtml,
        routeText: row.routeText,
        metaText,
        statusText: row.statusText,
        statusTone: row.statusTone,
      });
      return row;
    });
  }

  function buildSearchResult(payload, plans) {
    const rows = buildRowsForPlans(plans, payload.sortKey);
    const titleStart = rows[0]?.plan?.startInput?.name || payload.start;
    const titleEnd = rows[0]?.plan?.endInput?.name || payload.end;
    const result = {
      kickerHtml: `<span>雙鐵查詢</span><span>查詢日 ${escapeHtml(state.queryDate)}</span>${payload.selectedFilters?.length ? `<span>台鐵車種 ${escapeHtml(payload.selectedFilters.join(" / "))}</span>` : ""}`,
      titleHtml: `${escapeHtml(titleStart)} <span style="opacity:.45">→</span> ${escapeHtml(titleEnd)}`,
      subtitle: rows.length
        ? `共 ${rows.length} 筆可達班次${payload.modeEnabled ? " · 含更多同到達候補" : ""}`
        : "查無可達班次",
      countValue: rows.length,
      countLabel: "班次",
      headings: {
        time: "起點 / 終點",
        train: "列車",
        route: "方案",
        duration: "耗時",
        status: "狀態",
      },
      mobileHeadings: {
        time: "起訖",
        train: "列車",
        status: "狀態",
      },
      emptyMessage: "查無符合條件的雙鐵班次，請確認站名、日期或台鐵車種篩選。",
      rows,
    };
    result.customHtml = (decoratedRows) => buildCompactResultsHtml(result, decoratedRows);
    return result;
  }

  function buildPlanMetaText(plan) {
    return buildPlanModeText(plan);
  }

  function buildTransferSummaryData(plan) {
    const transfers = Array.isArray(plan?.transfers) ? plan.transfers.filter(Boolean) : [];
    if (!transfers.length) {
      return {
        lines: ["直達免轉乘"],
        summaryText: "直達免轉乘",
      };
    }
    const stationText = transfers
      .map((transfer) => displayName(transfer?.displayStation || transfer?.toStation || ""))
      .filter(Boolean)
      .join("/");
    const waitText = transfers
      .map((transfer) => {
        const bufferMin = Number(transfer?.bufferMin);
        return Number.isFinite(bufferMin) ? String(Math.max(0, Math.round(bufferMin))) : "";
      })
      .filter(Boolean)
      .join("/");
    const lines = [];
    if (stationText) lines.push(`${stationText}轉乘`);
    if (waitText) lines.push(`等候${waitText}分`);
    const summaryText = lines.join(" · ") || `轉乘${transfers.length}次`;
    return {
      lines: lines.length ? lines : [`轉乘${transfers.length}次`],
      summaryText,
    };
  }

  function buildTransferSummaryHtml(summary) {
    const lines = Array.isArray(summary?.lines) ? summary.lines.filter(Boolean) : [];
    return lines
      .map((line, index) => `<div class="dualrail-route-line ${index === 0 ? "is-primary" : "is-secondary"}">${escapeHtml(line)}</div>`)
      .join("");
  }

  function buildMobileCard(row) {
    const toneClass = row.statusTone ? `tone-${row.statusTone}` : "tone-muted";
    const durationText = [row?.durationText || "--", row?._durRankLabel || row?.durationRankLabel || ""]
      .filter(Boolean)
      .join(" · ");
    return `
      <div class="dualrail-mobile-card">
        <div class="dualrail-mobile-top">
          <div class="dualrail-mobile-time">
            <strong>${escapeHtml(row.timeText || "--")}</strong>
            <span>${escapeHtml(durationText)}</span>
          </div>
          <span class="dualrail-mobile-status ${toneClass}">${escapeHtml(row.statusText || "--")}</span>
        </div>
        <div class="dualrail-mobile-trains">${row.trainHtml || "--"}</div>
        <div class="dualrail-mobile-route">${row.routeHtml || escapeHtml(row.routeText || "--")}</div>
        <div class="dualrail-mobile-meta">${escapeHtml(row.metaText || "")}</div>
      </div>
    `;
  }

  function pickNextSummaryRow(rows) {
    const list = Array.isArray(rows) ? rows.slice() : [];
    return list
      .filter((row) => String(row?.statusText || "") !== "已過站")
      .sort((a, b) => (a?.sortDep ?? 9999) - (b?.sortDep ?? 9999))[0] || list[0] || null;
  }

  function buildCompactSummaryHtml(row) {
    if (!row?.plan) return "";
    const ticketHtml = row.ticketHidden
      ? ""
      : `<button class="dualrail-next-ticket" type="button" data-role="summary-ticket">${escapeHtml(row.ticketLabel || "訂票")}</button>`;
    return `
      <span class="dualrail-next-summary">
        <span class="dualrail-next-label">下一班</span>
        <span class="dualrail-next-main">
          <span class="dualrail-next-time">${escapeHtml(row.timeText || "--")}</span>
          <span class="dualrail-next-dot">·</span>
          <span class="dualrail-next-train">${buildSummaryTrainHtml(row.plan)}</span>
          <span class="dualrail-next-dot">·</span>
          <span class="dualrail-next-route">${escapeHtml(row.summaryTransferText || row.metaText || "--")}</span>
          <span class="dualrail-next-dot">·</span>
          <span class="dualrail-next-status tone-${escapeHtml(row.statusTone || "muted")}">${escapeHtml(row.statusText || "--")}</span>
          ${ticketHtml}
        </span>
      </span>
    `;
  }

  function buildCompactResultsHeadHtml(headings) {
    const labels = headings || {};
    return `
      <div class="dualrail-results-head">
        <span>${escapeHtml(labels.time || "起點 / 終點")}</span>
        <span>${escapeHtml(labels.train || "列車")}</span>
        <span>${escapeHtml(labels.route || "方案")}</span>
        <span>${escapeHtml(labels.duration || "耗時")}</span>
        <span>${escapeHtml(labels.status || "狀態")}</span>
      </div>
    `;
  }

  function buildCompactResultCardHtml(row, index) {
    const ticketHtml = row?.ticketHidden
      ? ""
      : `<button class="dualrail-ticket-btn" type="button" data-role="ticket" data-index="${index}">${escapeHtml(row.ticketLabel || "訂票")}</button>`;
    const durationLabel = [row?.durationText || "--", row?._durRankLabel || row?.durationRankLabel || ""]
      .filter(Boolean)
      .join(" · ");
    return `
      <article class="dualrail-result-card" data-role="row" data-index="${index}">
        <div class="dualrail-result-head">
          <div class="dualrail-result-timebox">
            <div class="dualrail-result-time">${escapeHtml(row.timeText || "--")}</div>
            <div class="dualrail-result-time-meta">${escapeHtml(durationLabel)}</div>
          </div>
          <div class="dualrail-result-trains">${row.trainHtml || "--"}</div>
          <div class="dualrail-result-route">
            <div class="dualrail-result-path">${row.routeHtml || escapeHtml(row.routeText || "--")}</div>
            <div class="dualrail-result-meta">${escapeHtml(row.metaText || "")}</div>
          </div>
          <div class="dualrail-result-duration">${buildCompactDurationHtml(row)}</div>
          <div class="dualrail-result-side">
            <div class="dualrail-result-status tone-${escapeHtml(row.statusTone || "muted")}">${escapeHtml(row.statusText || "--")}</div>
            ${ticketHtml}
          </div>
        </div>
      </article>
    `;
  }

  function buildCompactResultsHtml(result, rows) {
    const summaryHtml = result?.summaryHtml || "";
    return `
      <section class="rod2-panel rod2-summary-panel">
        <div class="rod2-scale-wrap">
          <div class="rod2-sumhead">
            <div>
              ${result?.kickerHtml ? `<div class="rod2-kicker">${result.kickerHtml}</div>` : ""}
              <div class="rod2-title">${result?.titleHtml != null ? result.titleHtml : escapeHtml(result?.title || "")}</div>
              ${result?.subtitle ? `<div class="rod2-subtitle">${escapeHtml(result.subtitle)}</div>` : ""}
              <div class="rod2-nextrow">
                ${summaryHtml ? `<button class="rod2-next rod2-summary-trigger rsv2-summary-button is-wide-mobile" type="button" data-role="summary-detail"><span class="rod2-next-main">${summaryHtml}</span></button>` : ""}
              </div>
            </div>
            <div class="rod2-count">
              <span class="rod2-count-value">${escapeHtml(result?.countValue != null ? result.countValue : rows.length)}</span>
              <span class="rod2-count-label">${escapeHtml(result?.countLabel || "總班次")}</span>
            </div>
          </div>
        </div>
      </section>
      <div class="dualrail-results-shell">
        ${rows.length ? buildCompactResultsHeadHtml(result?.headings) : ""}
        <div class="dualrail-results">
          ${rows.length ? rows.map((row, index) => buildCompactResultCardHtml(row, index)).join("") : `<div class="dualrail-results-empty">${escapeHtml(result?.emptyMessage || "查無符合條件的班次")}</div>`}
        </div>
      </div>
    `;
  }

  function buildRowsForPlans(plans, sortKey) {
    return sortPlansForView(plans, sortKey).map((plan) => {
      const metaText = buildPlanMetaText(plan);
      const bookingState = canBookPlan(plan);
      const status = plan.status || buildPrimaryPlanStatus(plan, state.queryDate);
      const transferSummary = buildTransferSummaryData(plan);
      const row = {
        plan,
        timeText: `${formatAbsClock(plan.effectiveDepAbs)} → ${formatAbsClock(plan.effectiveArrAbs)}`,
        trainHtml: buildTrainSummaryText(plan),
        summaryTrainHtml: buildSummaryTrainHtml(plan),
        routeHtml: buildTransferSummaryHtml(transferSummary),
        routeText: transferSummary.summaryText,
        routeLines: transferSummary.lines,
        durationText: formatDuration(plan.travelMin),
        durationMetaHtml: "",
        metaHtml: escapeHtml(metaText),
        metaText,
        summaryTransferText: transferSummary.summaryText,
        statusText: status.text || "--",
        statusTone: status.tone || getStatusTone(status.text),
        ticketHidden: !bookingState.ok,
        ticketLabel: "訂票",
        isPassed: (status.text || "") === "已過站",
        isRunning: /行駛中|準點|晚\d+分/.test(status.text || ""),
        sortDep: plan.effectiveDepAbs,
        sortArr: plan.effectiveArrAbs,
        sortDur: plan.travelMin,
      };
      row.mobileCardHtml = buildMobileCard(row);
      return row;
    });
  }

  function buildSearchResult(payload, plans) {
    const rows = buildRowsForPlans(plans, payload.sortKey);
    const titleStart = rows[0]?.plan?.startInput?.name || payload.start;
    const titleEnd = rows[0]?.plan?.endInput?.name || payload.end;
    const summaryRow = pickNextSummaryRow(rows);
    const result = {
      kickerHtml: `<span>雙鐵查詢</span><span>查詢日 ${escapeHtml(state.queryDate)}</span>${payload.selectedFilters?.length ? `<span>台鐵車種 ${escapeHtml(payload.selectedFilters.join(" / "))}</span>` : ""}`,
      titleHtml: `${escapeHtml(titleStart)} <span style="opacity:.45">→</span> ${escapeHtml(titleEnd)}`,
      subtitle: rows.length ? `共 ${rows.length} 班` : "查無班次",
      countValue: rows.length,
      countLabel: "總班次",
      headings: {
        time: "時間",
        train: "列車",
        route: "轉乘",
        duration: "耗時",
        status: "狀態",
      },
      emptyMessage: "查無符合條件的班次，請調整站名、日期或台鐵車種。",
      rows,
      summaryRow,
      summaryHtml: buildCompactSummaryHtml(summaryRow),
    };
    result.customHtml = (decoratedRows) => buildCompactResultsHtml(result, decoratedRows);
    return result;
  }

  async function searchPlans(payload) {
    const data = await ensureDataForDate(state.queryDate, false);
    const startInput = parseStationInput(payload.start);
    const endInput = parseStationInput(payload.end);
    if (!startInput || !endInput) {
      return {
        title: "請先確認站名",
        subtitle: "支援台鐵 / 高鐵站名、站碼與台 / 臺通用輸入。",
        emptyMessage: "可輸入例如：台鐵1000-台北、高鐵0990-台北、左營、新左營、苗栗、豐富。",
        rows: [],
      };
    }

    saveHistory(payload.start, payload.end);
    const graph = getGraphForFilters(data, payload.selectedFilters || []);
    const plans = searchReachablePlans(graph, startInput, endInput, state.queryDate, !!payload.modeEnabled);
    return buildSearchResult(payload, plans);
  }

  function setLoading(visible, text) {
    const overlay = qs("loading-overlay");
    const label = qs("loading-text");
    if (label && text) label.textContent = text;
    if (overlay) overlay.classList.toggle("is-hidden", !visible);
  }

  function stationBadgeHtml(stationName, system) {
    return window.RailStationContext?.renderTransferBadges?.(stationName, { system }) || "";
  }

  function weatherStationKey(system, stationName) {
    return `${SYSTEM_META[system]?.label || system} ${stationName}`;
  }

  function buildStopRowsHtml(leg) {
    const segmentStops = leg.entry.stops.slice(leg.startIdx, leg.endIdx + 1);
    return `
      <div class="stop-timeline">
        ${segmentStops.map((stop, index) => {
          const isFirst = index === 0;
          const isLast = index === segmentStops.length - 1;
          const station = stop.name || "--";
          const primaryAbs = isFirst ? getStopDepartureAbs(stop) : getStopArrivalAbs(stop);
          const weatherMs = timeMsFromQueryDate(state.queryDate, primaryAbs);
          const weatherKey = `dualrail-${leg.trainKey}-${stop.index}-${leg.originDate}`;
          const weatherSlot = Number.isFinite(weatherMs)
            ? `<span data-stop-weather="1" data-weather-key="${escapeHtml(weatherKey)}" data-weather-station="${escapeHtml(weatherStationKey(leg.system, station))}" data-weather-time-ms="${Math.round(weatherMs)}"><span class="rail-stop-weather-chip" data-stop-weather-chip hidden></span></span>`
            : "";
          const noteText = isFirst
            ? `開往 ${leg.endStation}`
            : (isLast ? "本段到達" : "沿途停靠");
          return `
            <div class="stop-row ${escapeHtml(leg.system)}">
              <div class="stop-time">${escapeHtml(formatAbsClock(primaryAbs))}</div>
              <div class="stop-marker">
                <div class="stop-line"></div>
                <div class="stop-dot"></div>
              </div>
              <div class="stop-content">
                <div class="stop-main">
                  <span>${escapeHtml(station)}</span>
                  ${stationBadgeHtml(station, leg.system)}
                  ${weatherSlot}
                </div>
                <div class="stop-sub">
                  <span data-stop-weather-note data-weather-key="${escapeHtml(weatherKey)}">${escapeHtml(noteText)}</span>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function buildModalHeaderText(plan) {
    const pieces = [
      `${formatDateLabel(state.queryDate)}`,
      `${buildSummaryLine(plan)}`,
    ];
    if (plan.startAccessMin > 0) pieces.push(`起點步行 ${plan.startAccessMin} 分`);
    if (plan.endAccessMin > 0) pieces.push(`終點步行 ${plan.endAccessMin} 分`);
    return pieces.join(" · ");
  }

  function buildModalSummaryRows(plan) {
    const blocks = [];
    plan.legs.forEach((leg, index) => {
      blocks.push(`
        <article class="transfer-card-lite transfer-summary-row compact">
          <div class="segment-rail">
            <div class="segment-label">第 ${index + 1} 段</div>
            <div class="segment-main">
              <span class="segment-train-brand ${escapeHtml(leg.system)}">${escapeHtml(SYSTEM_META[leg.system]?.label || leg.system)}</span>
              <span class="segment-train-no">${escapeHtml(leg.trainNo)}</span>
              ${leg.system === "tra" ? `<span class="segment-meta-sep">｜</span>${buildTrainTypeText(leg.system, leg.type)}` : ""}
            </div>
          </div>
          <div class="segment-inline-meta">
            <span class="segment-route">${escapeHtml(leg.startStation)} → ${escapeHtml(leg.endStation)}</span>
            <span class="segment-meta-sep">·</span>
            <span><strong>${escapeHtml(formatAbsClock(leg.departAbs))}</strong> → <strong>${escapeHtml(formatAbsClock(leg.arriveAbs))}</strong></span>
            <span class="segment-meta-sep">·</span>
            <span>${escapeHtml(index === plan.legs.length - 1 ? (plan.status?.text || "未發車") : "接續換車")}</span>
          </div>
        </article>
      `);

      const transfer = plan.transfers[index];
      if (transfer) {
        blocks.push(`
          <article class="transfer-card-lite transfer-summary-row transfer-wait-row compact">
            <div class="segment-rail">
              <div class="segment-label">轉乘</div>
              <div class="segment-main">${escapeHtml(transfer.displayStation)}</div>
            </div>
            <div class="segment-inline-meta">
              <span><strong>${escapeHtml(formatAbsClock(transfer.arriveAbs))}</strong> → <strong>${escapeHtml(formatAbsClock(transfer.departAbs))}</strong></span>
              <span class="segment-meta-sep">·</span>
              <span>${escapeHtml(transfer.walkMin > 0 ? `步行 ${transfer.walkMin} 分 · ${transfer.bufferMin} 分` : `${transfer.bufferMin} 分`)}</span>
            </div>
          </article>
        `);
      }
    });
    return blocks.join("");
  }

  function buildModalTimelineSections(plan) {
    return plan.legs.map((leg, index) => `
      <section class="modal-section transfer-section">
        <div class="transfer-sec-title">
          第 ${index + 1} 段時間軸
          <span>${escapeHtml(SYSTEM_META[leg.system]?.label || leg.system)} ${escapeHtml(leg.trainNo)}</span>
        </div>
        ${buildStopRowsHtml(leg)}
      </section>
    `).join("");
  }

  function buildModalHtml(plan) {
    return `
      <section class="modal-section modal-overview">
        <div class="modal-overview-top">
          <div>
            <div class="modal-overview-route">${escapeHtml(plan.startInput.name)} → ${escapeHtml(plan.endInput.name)}</div>
            <div class="modal-overview-meta">${escapeHtml(buildModalHeaderText(plan))}</div>
          </div>
          <div class="modal-overview-side">
            <strong>${escapeHtml(formatDuration(plan.travelMin))}</strong>
            <span>${escapeHtml(buildPlanMetaText(plan))}</span>
          </div>
        </div>
        <div class="modal-overview-trains">${buildTrainSummaryText(plan)}</div>
      </section>

      <section class="modal-section transfer-summary-section">
        <div class="transfer-summary-grid">
          ${buildModalSummaryRows(plan)}
        </div>
      </section>

      <div class="transfer-timelines">
        ${buildModalTimelineSections(plan)}
      </div>
    `;
  }

  function openPlanModal(row) {
    const plan = row?.plan;
    if (!plan) return;
    qs("planModalTitle").textContent = `${plan.startInput.name} → ${plan.endInput.name}`;
    qs("planModalSubtitle").textContent = buildModalHeaderText(plan);
    const body = qs("planModalBody");
    body.innerHTML = buildModalHtml(plan);
    qs("planModal").classList.add("show");
    document.body.style.overflow = "hidden";
    window.RailStationContext?.decorate?.(body);
    window.RailStopWeather?.decorate?.(body);
  }

  function closePlanModal() {
    qs("planModal")?.classList.remove("show");
    document.body.style.overflow = "";
  }

  function buildModalSummaryRows(plan) {
    const blocks = [];
    plan.legs.forEach((leg, index) => {
      const legStatus = buildLegStatus(leg, state.queryDate);
      blocks.push(`
        <article class="transfer-card-lite transfer-summary-row compact">
          <div class="segment-rail">
            <div class="segment-label">第 ${index + 1} 段</div>
            <div class="segment-main">
              <span class="segment-train-brand ${escapeHtml(leg.system)}">${escapeHtml(SYSTEM_META[leg.system]?.label || leg.system)}</span>
              <span class="segment-train-no">${escapeHtml(leg.trainNo)}</span>
              ${leg.system === "tra" ? `<span class="segment-meta-sep">｜</span>${buildTrainTypeText(leg.system, leg.type)}` : ""}
            </div>
          </div>
          <div class="segment-inline-meta">
            <span class="segment-route">${escapeHtml(leg.startStation)} → ${escapeHtml(leg.endStation)}</span>
            <span class="segment-meta-sep">·</span>
            <span><strong>${escapeHtml(formatAbsClock(leg.departAbs))}</strong> → <strong>${escapeHtml(formatAbsClock(leg.arriveAbs))}</strong></span>
            <span class="segment-meta-sep">·</span>
            <span>${escapeHtml(legStatus.text || "--")}</span>
          </div>
        </article>
      `);

      const transfer = plan.transfers[index];
      if (transfer) {
        const waitParts = [];
        if (Number.isFinite(transfer.walkMin) && transfer.walkMin > 0) waitParts.push(`步行 ${transfer.walkMin} 分`);
        if (Number.isFinite(transfer.bufferMin)) waitParts.push(`餘裕 ${transfer.bufferMin} 分`);
        blocks.push(`
          <article class="transfer-card-lite transfer-summary-row transfer-wait-row compact">
            <div class="segment-rail">
              <div class="segment-label">轉乘</div>
              <div class="segment-main">${escapeHtml(transfer.displayStation || transfer.toStation || "--")}</div>
            </div>
            <div class="segment-inline-meta">
              <span><strong>${escapeHtml(formatAbsClock(transfer.arriveAbs))}</strong> → <strong>${escapeHtml(formatAbsClock(transfer.departAbs))}</strong></span>
              <span class="segment-meta-sep">·</span>
              <span>${escapeHtml(waitParts.join(" · ") || "--")}</span>
            </div>
          </article>
        `);
      }
    });
    return blocks.join("");
  }

  function buildModalHtml(plan) {
    return `
      <section class="modal-section transfer-summary-section">
        <div class="transfer-summary-grid">
          ${buildModalSummaryRows(plan)}
        </div>
      </section>

      <div class="transfer-timelines">
        ${buildModalTimelineSections(plan)}
      </div>
    `;
  }

  function openPlanModal(row) {
    const plan = row?.plan;
    if (!plan) return;
    qs("planModalTitle").innerHTML = buildSummaryTrainHtml(plan) || `${escapeHtml(plan.startInput.name)} → ${escapeHtml(plan.endInput.name)}`;
    qs("planModalSubtitle").textContent = `${formatDateLabel(state.queryDate)} · ${plan.startInput.name} → ${plan.endInput.name} · ${buildPlanModeText(plan)} · ${formatDuration(plan.travelMin)}`;
    const body = qs("planModalBody");
    body.innerHTML = buildModalHtml(plan);
    qs("planModal").classList.add("show");
    document.body.style.overflow = "hidden";
    window.RailStationContext?.decorate?.(body);
    window.RailStopWeather?.decorate?.(body);
  }

  async function refreshData(force = false) {
    const dateStr = qs("mainQueryDate").value || fmtDate(new Date());
    state.queryDate = dateStr;
    try {
      localStorage.setItem(STORAGE_KEYS.queryDate, dateStr);
    } catch (_) {}

    setLoading(true, "正在載入雙鐵班表…");
    try {
      if (force) state.dataCache.delete(dateStr);
      const data = await ensureDataForDate(dateStr, !!force);
      const todayStr = fmtDate(new Date());
      const yesterdayStr = addDays(todayStr, -1);
      if ((dateStr === todayStr || dateStr === yesterdayStr) && typeof window.updateLiveDelay === "function") {
        await window.updateLiveDelay().catch(() => {});
      }
      updateAvailableTraTypes(data);
      state.queryController?.refreshChrome?.();

      const current = state.queryController?.getState?.();
      if (current?.start && current?.end) {
        await state.queryController.rerender();
      }
    } finally {
      setLoading(false);
    }
  }

  function applyTheme(isDark) {
    document.body.classList.toggle("dark-mode", !!isDark);
    document.body.classList.toggle("light-mode", !isDark);
    const btn = qs("themeToggle");
    if (btn) btn.textContent = isDark ? "☀️ 日間模式" : "🌙 深夜模式";
    try {
      localStorage.setItem(STORAGE_KEYS.theme, isDark ? "dark" : "light");
    } catch (_) {}
  }

  function initTheme() {
    let dark = false;
    try {
      dark = localStorage.getItem(STORAGE_KEYS.theme) === "dark";
    } catch (_) {}
    applyTheme(dark);
    qs("themeToggle")?.addEventListener("click", () => applyTheme(!document.body.classList.contains("dark-mode")));
  }

  function initClock() {
    function tick() {
      const nowText = formatNowClock();
      if (qs("headerClock")) qs("headerClock").textContent = nowText;
    }
    tick();
    window.setInterval(tick, 10000);
  }

  function initDateField() {
    const field = qs("mainQueryDate");
    const stored = (() => {
      try {
        return localStorage.getItem(STORAGE_KEYS.queryDate) || "";
      } catch (_) {
        return "";
      }
    })();
    const linked = String(new URLSearchParams(window.location.search).get("date") || "").trim();
    field.value = /^\d{4}-\d{2}-\d{2}$/.test(linked)
      ? linked
      : (/^\d{4}-\d{2}-\d{2}$/.test(stored) ? stored : fmtDate(new Date()));
    state.queryDate = field.value;
    field.addEventListener("change", () => refreshData(false));
  }

  function initHeaderButtons() {
    qs("homeBtn")?.addEventListener("click", () => {
      const isEmbed = new URLSearchParams(window.location.search).get("embed") === "1";
      if (isEmbed) {
        try {
          window.parent.postMessage("APP_CLOSE", "*");
        } catch (_) {}
        return;
      }
      window.location.href = "../home/home.html";
    });
    qs("refreshBtn")?.addEventListener("click", () => refreshData(true));
  }

  function initModal() {
    qs("planModalClose")?.addEventListener("click", closePlanModal);
    qs("planModal")?.addEventListener("click", (event) => {
      if (event.target === qs("planModal")) closePlanModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && qs("planModal")?.classList.contains("show")) closePlanModal();
    });
  }

  function getFilterOptions() {
    return state.availableTraTypes.map((type) => ({
      value: type,
      label: type,
      html: `<span class="dualrail-filter-type" style="color:${escapeHtml(getTraTypeColor(type))}">${escapeHtml(type)}</span>`,
    }));
  }

  function initQueryPanel() {
    state.queryController = window.RailOriginDestinationQueryV2.create({
      rootId: "transferQueryRoot",
      startInputId: "dualrailStartStation",
      endInputId: "dualrailEndStation",
      buttonId: "dualrailSearchBtn",
      datalistId: "transferStationList",
      startLabel: "起點",
      endLabel: "終點",
      startPlaceholder: "例：台鐵1000-台北 / 高鐵0990-台北",
      endPlaceholder: "例：左營 / 新左營 / 高雄",
      modeLabel: "候補",
      modeToggleText: "顯示更多同到達候補",
      favoriteButtonText: "常用行程",
      buttonText: "查詢",
      defaultModeEnabled: false,
      manualSearchOnly: true,
      toolbarAutoSearch: true,
      disableFilters: false,
      mobileFilterMulti: true,
      filterLabel: "台鐵車種",
      filterAllLabel: "全部車種",
      getFilterOptions,
      sortLabel: "排序",
      sortOptions: [
        { value: "dep", label: "依出發" },
        { value: "arr", label: "依到達" },
        { value: "best", label: "最短耗時" },
      ],
      defaultSortKey: "dep",
      placeholderText: "輸入台鐵或高鐵車站後，顯示全日可達班次。",
      getHistoryItems() {
        return readHistory().map((item) => ({ start: item.start, end: item.end }));
      },
      getFavoriteItems() {
        return readHistory().slice(0, 3).map((item) => ({ start: item.start, end: item.end }));
      },
      normalizeStation(value) {
        return String(value || "").trim();
      },
      formatMobileSummary(currentState) {
        return `${currentState.start || "起點"} → ${currentState.end || "終點"}`;
      },
      async search(payload) {
        setLoading(true, "正在計算雙鐵班次…");
        try {
          return await searchPlans(payload);
        } finally {
          setLoading(false);
        }
      },
      onOpenDetail(row) {
        openPlanModal(row);
      },
      onBook(row) {
        return handlePlanBooking(row);
      },
      onMounted() {
        bindStationInput("dualrailStartStation");
        bindStationInput("dualrailEndStation");
      },
    });
  }

  async function init() {
    initTheme();
    initClock();
    initDateField();
    initHeaderButtons();
    initModal();
    initQueryPanel();

    setLoading(true, "正在載入車站資料…");
    try {
      await loadStationCatalog();
      await refreshData(false);
    } finally {
      setLoading(false);
    }
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
