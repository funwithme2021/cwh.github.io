(function () {
  "use strict";

  const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const MAP_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  const DEFAULT_TDX_CONFIG = {
    clientId: "r36144112-d7b2ebdd-ce4c-40c3",
    clientSecret: "141d81d1-a450-4610-9309-412c8151cc3d",
  };
  const TDX_CONFIG_STORAGE_KEYS = {
    clientId: "tdx_client_id",
    clientSecret: "tdx_client_secret",
  };
  const TOKEN_CACHE_KEY = "tdx_access_token_cache_v1";
  const TOKEN_REFRESH_BUFFER_MS = 30 * 1000;
  const TOKEN_RATE_LIMIT_BACKOFF_MS = 60 * 1000;
  const FETCH_TIMEOUT_MS = 14000;
  const STATION_CACHE_MS = 24 * 60 * 60 * 1000;
  const SCHEDULE_CACHE_MS = 60 * 1000;
  const LIVE_DELAY_CACHE_MS = 25 * 1000;
  const SHAPE_CACHE_KEY = "rail_live_tdx_shape_v1";
  const SHAPE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
  const SHARED_GEO_KEY = "home_shared_geo_snapshot_v1";
  const USER_LOCATION_MAX_AGE_MS = 10 * 60 * 1000;
  const REFRESH_MS = 60 * 1000;
  const DELAY_REFRESH_MS = 30 * 1000;
  const UPCOMING_WINDOW = 10;
  const STATION_ALERT_WINDOW = 10;
  const STATION_SOON_WINDOW = 3;

  const SYSTEMS = {
    tr: {
      code: "TRA",
      label: "台鐵",
      lineColor: "#0f766e",
      stationUrl: "https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Station?%24format=JSON",
      scheduleUrl: (date) => `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${date}?%24format=JSON`,
      liveDelayUrl: "https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard?%24format=JSON",
    },
    thsr: {
      code: "THSR",
      label: "高鐵",
      lineColor: "#be185d",
      stationUrl: "https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/Station?$format=JSON",
      scheduleUrl: (date) => `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainDate/${date}?$format=JSON`,
      liveDelayUrl: "",
    },
  };

  const state = {
    L: null,
    map: null,
    routeLayers: [],
    stationLayers: [],
    markers: new Map(),
    markerBindings: [],
    stations: { tr: new Map(), thsr: new Map() },
    stationLists: { tr: [], thsr: [] },
    routeLines: { tr: [], thsr: [] },
    routeSource: { tr: "station", thsr: "station" },
    snapshots: [],
    stationEvents: new Map(),
    stepCache: new Map(),
    userMarker: null,
    userLocation: null,
    userWatchId: null,
    userMoved: false,
    didInitialFit: false,
    activeKey: "",
    refreshTimer: 0,
    animationFrame: 0,
    token: "",
    tokenExpireAt: 0,
    tokenPromise: null,
    tokenBackoffUntil: 0,
  };

  const el = {
    map: document.getElementById("homeLiveMap"),
    subtitle: document.getElementById("homeLiveSubtitle"),
    focus: document.getElementById("homeLiveFocus"),
    status: document.getElementById("homeLiveStatus"),
    locate: document.getElementById("homeLiveLocate"),
    fit: document.getElementById("homeLiveFit"),
    close: document.getElementById("homeLiveClose"),
    modal: document.getElementById("homeLiveModal"),
    modalTitle: document.getElementById("homeLiveModalTitle"),
    modalSubtitle: document.getElementById("homeLiveModalSubtitle"),
    modalBody: document.getElementById("homeLiveModalBody"),
    modalClose: document.getElementById("homeLiveModalClose"),
  };

  let leafletLoadPromise = null;
  let statusTimer = 0;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
  }

  function showStatus(text, options = {}) {
    if (!el.status) return;
    el.status.textContent = String(text || "");
    el.status.classList.toggle("show", Boolean(text));
    window.clearTimeout(statusTimer);
    if (text && options.sticky !== true) {
      statusTimer = window.setTimeout(() => {
        el.status.classList.remove("show");
      }, options.duration || 3200);
    }
  }

  function setSubtitle(text) {
    if (el.subtitle) el.subtitle.textContent = text || "台鐵與高鐵全線真實地圖";
  }

  function readStoredTdxConfig() {
    try {
      const clientId = String(localStorage.getItem(TDX_CONFIG_STORAGE_KEYS.clientId) || "").trim();
      const clientSecret = String(localStorage.getItem(TDX_CONFIG_STORAGE_KEYS.clientSecret) || "").trim();
      if (clientId && clientSecret) return { clientId, clientSecret };
    } catch (_) {
    }
    const globalConfig = window.TDX_CONFIG || {};
    const clientId = String(globalConfig.clientId || "").trim();
    const clientSecret = String(globalConfig.clientSecret || "").trim();
    if (clientId && clientSecret) return { clientId, clientSecret };
    return { ...DEFAULT_TDX_CONFIG };
  }

  function readSharedAccessToken(config) {
    try {
      const cached = JSON.parse(localStorage.getItem(TOKEN_CACHE_KEY) || "null");
      if (
        cached?.accessToken &&
        cached?.clientId === config.clientId &&
        Number(cached?.expiresAt) > Date.now() + TOKEN_REFRESH_BUFFER_MS
      ) {
        return {
          token: cached.accessToken,
          expiresAt: Number(cached.expiresAt),
        };
      }
    } catch (_) {
    }
    return null;
  }

  function writeSharedAccessToken(config, token, expiresInSeconds) {
    const expiresAt = Date.now() + Math.max(60, Number(expiresInSeconds) || 3600) * 1000;
    try {
      localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify({
        accessToken: token,
        expiresAt,
        clientId: config.clientId,
      }));
    } catch (_) {
    }
    return expiresAt;
  }

  async function getTdxToken(force = false) {
    const config = readStoredTdxConfig();
    if (!force && state.token && Date.now() < state.tokenExpireAt - TOKEN_REFRESH_BUFFER_MS) return state.token;
    if (!force) {
      const shared = readSharedAccessToken(config);
      if (shared?.token) {
        state.token = shared.token;
        state.tokenExpireAt = shared.expiresAt;
        return shared.token;
      }
    }
    if (!force && Date.now() < state.tokenBackoffUntil) {
      throw new Error("TDX token rate limited");
    }
    if (state.tokenPromise) return state.tokenPromise;
    state.tokenPromise = (async () => {
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", config.clientId);
      params.append("client_secret", config.clientSecret);
      const response = await fetchWithTimeout("https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      if (!response.ok) {
        if (response.status === 429) state.tokenBackoffUntil = Date.now() + TOKEN_RATE_LIMIT_BACKOFF_MS;
        throw new Error(`TDX token ${response.status}`);
      }
      const data = await response.json();
      if (!data?.access_token) throw new Error("TDX token missing");
      state.token = data.access_token;
      state.tokenExpireAt = writeSharedAccessToken(config, data.access_token, data.expires_in);
      return data.access_token;
    })();
    try {
      return await state.tokenPromise;
    } finally {
      state.tokenPromise = null;
    }
  }

  function buildTdxHeaders(token) {
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), options.timeoutMs || FETCH_TIMEOUT_MS) : 0;
    try {
      return await fetch(url, { ...options, signal: controller?.signal });
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  function readCache(key, maxAgeMs) {
    try {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (!cached?.savedAt) return null;
      const age = Date.now() - Number(cached.savedAt);
      if (!Number.isFinite(age)) return null;
      return { data: cached.data, fresh: age <= maxAgeMs };
    } catch (_) {
      return null;
    }
  }

  function writeCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (_) {
    }
  }

  async function cachedFetchJson(key, maxAgeMs, url, token) {
    const cached = readCache(key, maxAgeMs);
    if (cached?.fresh) return cached.data;
    try {
      const response = await fetchWithTimeout(url, { headers: buildTdxHeaders(token) });
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      const data = await response.json();
      writeCache(key, data);
      return data;
    } catch (error) {
      if (cached?.data) return cached.data;
      throw error;
    }
  }

  function loadLeaflet() {
    if (window.L?.map) {
      state.L = window.L;
      return Promise.resolve(window.L);
    }
    if (leafletLoadPromise) return leafletLoadPromise;
    leafletLoadPromise = new Promise((resolve, reject) => {
      if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = LEAFLET_CSS_URL;
        document.head.appendChild(link);
      }
      const finish = () => {
        if (window.L?.map) {
          state.L = window.L;
          resolve(window.L);
        } else {
          reject(new Error("Leaflet not ready"));
        }
      };
      const existing = document.querySelector(`script[src="${LEAFLET_JS_URL}"]`);
      if (existing) {
        if (window.L?.map) finish();
        else {
          existing.addEventListener("load", finish, { once: true });
          existing.addEventListener("error", () => reject(new Error("Leaflet load failed")), { once: true });
        }
        return;
      }
      const script = document.createElement("script");
      script.src = LEAFLET_JS_URL;
      script.async = true;
      script.onload = finish;
      script.onerror = () => reject(new Error("Leaflet load failed"));
      document.head.appendChild(script);
    });
    return leafletLoadPromise;
  }

  function ensureMap() {
    if (state.map) return state.map;
    const L = state.L || window.L;
    state.map = L.map(el.map, {
      zoomControl: true,
      preferCanvas: true,
      attributionControl: true,
    }).setView([23.7, 121], 7);
    L.tileLayer(MAP_TILE_URL, {
      attribution: MAP_TILE_ATTRIBUTION,
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(state.map);
    state.map.on("dragstart zoomstart", () => {
      state.userMoved = true;
    });
    window.setTimeout(() => state.map?.invalidateSize?.(), 120);
    return state.map;
  }

  function getRailNetwork() {
    return window.RailNetwork || null;
  }

  function normalizeStation(system, name) {
    const text = String(name || "").trim();
    if (!text) return "";
    const network = getRailNetwork();
    if (system === "thsr") return network?.normalizeThsrStation?.(text) || text.replace(/臺/g, "台");
    return network?.normalizeTraStation?.(text) || text.replace(/台/g, "臺");
  }

  function normalizeTrainType(system, value) {
    const text = readZh(value) || String(value || "").trim();
    if (system === "thsr") return "高鐵";
    return getRailNetwork()?.normalizeTraDisplayType?.(text) || text || "列車";
  }

  function readZh(value) {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    return String(
      value.Zh_tw ||
      value.ZhTw ||
      value.zh_tw ||
      value.zhTw ||
      value.Name ||
      ""
    ).trim();
  }

  function getStation(system, name) {
    const normalized = normalizeStation(system, name);
    const map = state.stations[system];
    return map.get(normalized) || map.get(String(name || "").trim()) || null;
  }

  async function loadStations(system, token) {
    const data = await cachedFetchJson(`home_live_station_${system}_v1`, STATION_CACHE_MS, SYSTEMS[system].stationUrl, token);
    const rows = system === "tr"
      ? (Array.isArray(data?.Stations) ? data.Stations : [])
      : (Array.isArray(data) ? data : (Array.isArray(data?.Stations) ? data.Stations : []));
    const map = new Map();
    const list = [];
    rows.forEach((station) => {
      const name = readZh(station?.StationName);
      const lat = Number(station?.StationPosition?.PositionLat);
      const lon = Number(station?.StationPosition?.PositionLon);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const normalized = normalizeStation(system, name);
      const item = {
        id: String(station?.StationID || ""),
        name,
        normalized,
        lat,
        lon,
      };
      list.push(item);
      map.set(normalized, item);
      map.set(name, item);
    });
    state.stations[system] = map;
    state.stationLists[system] = list;
  }

  function isTaiwanLatLng(lat, lon) {
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 20 && lat <= 26.5 && lon >= 118 && lon <= 123.5;
  }

  function toLeafletLatLngPair(pair) {
    if (Array.isArray(pair) && pair.length >= 2) {
      const first = Number(pair[0]);
      const second = Number(pair[1]);
      if (isTaiwanLatLng(second, first)) return [second, first];
      if (isTaiwanLatLng(first, second)) return [first, second];
      return null;
    }
    if (pair && typeof pair === "object") {
      const lat = Number(pair.lat ?? pair.latitude ?? pair.Latitude ?? pair.PositionLat);
      const lon = Number(pair.lon ?? pair.lng ?? pair.longitude ?? pair.Longitude ?? pair.PositionLon);
      return isTaiwanLatLng(lat, lon) ? [lat, lon] : null;
    }
    return null;
  }

  function isCoordinatePair(value) {
    return Array.isArray(value) && value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]));
  }

  function coordinatesToLines(coords) {
    if (!Array.isArray(coords)) return [];
    if (isCoordinatePair(coords)) {
      const point = toLeafletLatLngPair(coords);
      return point ? [[point]] : [];
    }
    if (coords.length && coords.every(isCoordinatePair)) {
      const line = coords.map(toLeafletLatLngPair).filter(Boolean);
      return line.length >= 2 ? [line] : [];
    }
    return coords.flatMap((item) => coordinatesToLines(item)).filter((line) => line.length >= 2);
  }

  function parseWktLineBody(body) {
    const line = String(body || "")
      .split(",")
      .map((pair) => {
        const parts = pair.trim().split(/\s+/).map(Number);
        return toLeafletLatLngPair(parts);
      })
      .filter(Boolean);
    return line.length >= 2 ? line : null;
  }

  function parseWktGeometry(value) {
    const text = String(value || "").trim();
    if (!text) return [];
    const multi = text.match(/^MULTILINESTRING\s*\(([\s\S]+)\)$/i);
    if (multi) {
      return (multi[1].match(/\([^()]+\)/g) || [])
        .map((part) => parseWktLineBody(part.replace(/[()]/g, "")))
        .filter(Boolean);
    }
    const single = text.match(/^LINESTRING\s*\(([\s\S]+)\)$/i);
    if (single) {
      const line = parseWktLineBody(single[1]);
      return line ? [line] : [];
    }
    return [];
  }

  function parseShapeGeometry(value) {
    if (!value) return [];
    if (typeof value === "string") {
      const wktLines = parseWktGeometry(value);
      if (wktLines.length) return wktLines;
      try {
        return parseShapeGeometry(JSON.parse(value));
      } catch (_) {
        return [];
      }
    }
    if (Array.isArray(value)) return coordinatesToLines(value);
    if (typeof value === "object") {
      const coordinates = value.coordinates || value.Coordinates;
      if (coordinates) return coordinatesToLines(coordinates);
      const geometry = value.geometry || value.Geometry || value.geojson || value.GeoJSON || value.shape || value.Shape;
      if (geometry && geometry !== value) return parseShapeGeometry(geometry);
    }
    return [];
  }

  function extractShapeLines(data) {
    const records = Array.isArray(data)
      ? data
      : data?.Shapes || data?.shapes || data?.records || data?.Records || data?.data || data?.Data || [];
    const lines = [];
    (Array.isArray(records) ? records : []).forEach((record) => {
      const candidates = [
        record?.Geometry,
        record?.geometry,
        record?.GeoJSON,
        record?.geojson,
        record?.Shape,
        record?.shape,
        record?.RouteGeometry,
        record?.LineString,
        record,
      ];
      candidates.some((candidate) => {
        const parsed = parseShapeGeometry(candidate);
        if (!parsed.length) return false;
        lines.push(...parsed);
        return true;
      });
    });
    return lines.filter((line) => line.length >= 2);
  }

  async function fetchShapeLines(system, token) {
    const code = SYSTEMS[system].code;
    const urls = [
      `https://tdx.transportdata.tw/api/basic/v3/Rail/${code}/Shape?%24format=JSON`,
      `https://tdx.transportdata.tw/api/basic/v2/Rail/${code}/Shape?%24format=JSON`,
      `https://tdx.transportdata.tw/api/basic/v3/Rail/${code}/Shape?$format=JSON`,
      `https://tdx.transportdata.tw/api/basic/v2/Rail/${code}/Shape?$format=JSON`,
    ];
    for (const url of urls) {
      try {
        const response = await fetchWithTimeout(url, { headers: buildTdxHeaders(token) });
        if (!response.ok) continue;
        const data = await response.json();
        const lines = extractShapeLines(data);
        if (lines.length) return lines;
      } catch (_) {
      }
    }
    return [];
  }

  function getRouteSegments(system) {
    const network = getRailNetwork();
    if (system === "tr") return network?.getTraSegments?.() || [];
    const order = network?.getThsrStationOrder?.() || ["南港", "台北", "板橋", "桃園", "新竹", "苗栗", "台中", "彰化", "雲林", "嘉義", "台南", "左營"];
    return [{ id: "thsr-main", stations: order }];
  }

  function buildFallbackGeoLines(system) {
    return getRouteSegments(system)
      .map((segment) =>
        (segment.stations || [])
          .map((station) => {
            const geo = getStation(system, station);
            return geo ? [geo.lat, geo.lon] : null;
          })
          .filter(Boolean)
      )
      .filter((line) => line.length >= 2);
  }

  async function loadRouteLines(token) {
    const cached = readCache(SHAPE_CACHE_KEY, SHAPE_CACHE_MS);
    const cachedData = cached?.data && typeof cached.data === "object" ? { ...cached.data } : {};
    const output = {};
    let changed = false;
    for (const system of Object.keys(SYSTEMS)) {
      const fallback = buildFallbackGeoLines(system);
      let lines = Array.isArray(cachedData[system]) && cachedData[system].length ? cachedData[system] : [];
      if (!lines.length) {
        lines = await fetchShapeLines(system, token);
        if (lines.length) {
          cachedData[system] = lines;
          changed = true;
        }
      }
      output[system] = lines.length ? lines : fallback;
      state.routeSource[system] = lines.length ? "tdx" : "station";
    }
    if (changed) writeCache(SHAPE_CACHE_KEY, cachedData);
    state.routeLines = output;
  }

  function parseMinutes(time) {
    const match = String(time || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function formatMinute(value) {
    if (!Number.isFinite(value)) return "--:--";
    const rounded = Math.round(value);
    const normalized = ((rounded % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
  }

  function todayDateStr(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function addDays(dateStr, delta) {
    const match = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const base = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date();
    base.setDate(base.getDate() + Number(delta || 0));
    return todayDateStr(base);
  }

  function dayNumber(dateStr) {
    const match = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return Math.floor(Date.now() / 86400000);
    return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
  }

  function nowExactMinute(timestamp = Date.now()) {
    const date = new Date(timestamp);
    return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60000;
  }

  function mergePathSegments(first, second) {
    if (!first.length) return second.slice();
    if (!second.length) return first.slice();
    return first.concat(second.slice(1));
  }

  function expandEntryPathStations(system, stops) {
    const names = (stops || []).map((stop) => stop.name).filter(Boolean);
    if (names.length < 2) return names.slice();
    const network = getRailNetwork();
    if (typeof network?.expandStopPath === "function") {
      const expanded = network.expandStopPath(system, stops);
      if (Array.isArray(expanded) && expanded.length >= names.length) return expanded;
    }
    const findPath = system === "tr" ? network?.findTraRoutePath : network?.findThsrRoutePath;
    if (typeof findPath === "function") {
      let expanded = [];
      for (let index = 0; index < names.length - 1; index += 1) {
        const pairPath = findPath(names[index], names[index + 1]);
        expanded = mergePathSegments(expanded, Array.isArray(pairPath) && pairPath.length ? pairPath : [names[index], names[index + 1]]);
      }
      if (expanded.length) return expanded;
    }
    return names.slice();
  }

  function getJourneyInterpolationRatio(system, fullPathStations, startPathIndex, endPathIndex, currentPathIndex, totalMinutes, startStop, endStop, trainType) {
    const totalSteps = Math.abs(endPathIndex - startPathIndex);
    const fallbackRatio = totalSteps > 0 ? Math.abs(currentPathIndex - startPathIndex) / totalSteps : 0;
    if (system === "tr") {
      const getTraRatio = getRailNetwork()?.getTraTimedInterpolationRatio;
      if (typeof getTraRatio !== "function") return fallbackRatio;
      return getTraRatio(fullPathStations, startPathIndex, endPathIndex, currentPathIndex, totalMinutes, startStop, endStop, trainType, fallbackRatio);
    }
    if (system !== "thsr") return fallbackRatio;
    const startStation = fullPathStations?.[startPathIndex];
    const endStation = fullPathStations?.[endPathIndex];
    const currentStation = fullPathStations?.[currentPathIndex];
    const getTimedRatio = getRailNetwork()?.getThsrTimedInterpolationRatio;
    if (typeof getTimedRatio !== "function") return fallbackRatio;
    return getTimedRatio(startStation, endStation, currentStation, totalMinutes, startStop, endStop, fallbackRatio);
  }

  function getStopArrivalMinute(stop) {
    return stop?.arrivalMinute ?? stop?.departureMinute;
  }

  function getStopDepartureMinute(stop) {
    return stop?.departureMinute ?? stop?.arrivalMinute;
  }

  function getStopEventMinute(stop) {
    return getStopDepartureMinute(stop) ?? getStopArrivalMinute(stop);
  }

  function buildJourneyPathPoints(system, timedStops, fullPathStations, trainType) {
    let searchStart = 0;
    const resolvePathIndex = (stationName) => {
      for (let index = searchStart; index < (fullPathStations || []).length; index += 1) {
        if (fullPathStations[index] !== stationName) continue;
        searchStart = index + 1;
        return index;
      }
      return (fullPathStations || []).indexOf(stationName);
    };
    const anchors = (timedStops || [])
      .map((stop) => ({ ...stop, pathIndex: resolvePathIndex(stop.name) }))
      .filter((stop) => Number.isFinite(stop.pathIndex));
    if (anchors.length < 2) return [];
    const points = [];
    let sequenceIndex = 0;
    const pushPoint = (point) => {
      if (!point || !Number.isFinite(point.pathIndex) || !Number.isFinite(point.minute) || !point.station) return;
      const previous = points[points.length - 1];
      if (
        previous &&
        previous.station === point.station &&
        previous.pathIndex === point.pathIndex &&
        previous.minute === point.minute &&
        previous.kind === point.kind
      ) {
        return;
      }
      points.push({ ...point, routeIndex: point.pathIndex, sequenceIndex });
      sequenceIndex += 1;
    };
    anchors.forEach((current, index) => {
      if (current.isPassOnly) {
        const passMinute = getStopEventMinute(current);
        if (Number.isFinite(passMinute)) {
          pushPoint({ station: current.name, pathIndex: current.pathIndex, minute: passMinute, kind: "pass", isStop: false });
        }
      } else if (Number.isFinite(current.arrivalMinute)) {
        pushPoint({ station: current.name, pathIndex: current.pathIndex, minute: current.arrivalMinute, kind: "arrival", isStop: true });
      }
      if (!current.isPassOnly && Number.isFinite(current.departureMinute) && current.departureMinute !== current.arrivalMinute) {
        pushPoint({ station: current.name, pathIndex: current.pathIndex, minute: current.departureMinute, kind: "departure", isStop: true });
      }
      const next = anchors[index + 1];
      if (!next) return;
      const travelStart = Number.isFinite(current.departureMinute) ? current.departureMinute : current.arrivalMinute;
      const travelEnd = Number.isFinite(next.arrivalMinute) ? next.arrivalMinute : next.departureMinute;
      const totalMinutes = Number.isFinite(travelStart) && Number.isFinite(travelEnd) ? travelEnd - travelStart : null;
      const delta = next.pathIndex - current.pathIndex;
      const steps = Math.abs(delta);
      if (!Number.isFinite(travelStart) || !Number.isFinite(travelEnd) || steps <= 1) return;
      for (let step = 1; step < steps; step += 1) {
        const pathIndex = current.pathIndex + Math.sign(delta) * step;
        const station = fullPathStations[pathIndex];
        if (!station) continue;
        pushPoint({
          station,
          pathIndex,
          minute: Math.round(travelStart + (travelEnd - travelStart) * getJourneyInterpolationRatio(
            system,
            fullPathStations,
            current.pathIndex,
            next.pathIndex,
            pathIndex,
            totalMinutes,
            !current.isPassOnly,
            !next.isPassOnly,
            trainType
          )),
          kind: "pass",
          isStop: false,
        });
      }
    });
    return points;
  }

  function buildTimedStops(system, stops, originDate, delayMinutes = 0) {
    const today = todayDateStr();
    const baseOffset = (dayNumber(originDate) - dayNumber(today)) * 1440;
    let previousAbsoluteMinute = null;
    const stopCount = (stops || []).length;
    const resolveAbsoluteMinute = (rawMinute) => {
      if (rawMinute === null) return null;
      let absoluteMinute = baseOffset + rawMinute;
      while (previousAbsoluteMinute !== null && absoluteMinute < previousAbsoluteMinute) {
        absoluteMinute += 1440;
      }
      previousAbsoluteMinute = absoluteMinute;
      return absoluteMinute + Math.max(0, Number(delayMinutes) || 0);
    };
    return (stops || [])
      .map((stop, index) => {
        const rawName = readZh(stop?.StationName) || String(stop?.StationName || stop?.name || "").trim();
        const name = normalizeStation(system, rawName);
        const displayName = rawName || name;
        const arrivalRaw = parseMinutes(stop?.ArrivalTime || stop?.arrival || "");
        const departureRaw = parseMinutes(stop?.DepartureTime || stop?.departure || "");
        const hasArrival = arrivalRaw !== null;
        const hasDeparture = departureRaw !== null;
        if (!name || (!hasArrival && !hasDeparture)) return null;
        const arrival = resolveAbsoluteMinute(hasArrival ? arrivalRaw : departureRaw);
        let departure = resolveAbsoluteMinute(hasDeparture ? departureRaw : arrivalRaw);
        if (Number.isFinite(arrival) && Number.isFinite(departure) && departure < arrival) departure += 1440;
        return {
          name,
          displayName,
          hasArrival,
          hasDeparture,
          isPassOnly: index > 0 && index < stopCount - 1 && hasArrival !== hasDeparture,
          arrivalMinute: arrival,
          departureMinute: departure,
          sequence: Number(stop?.StopSequence ?? stop?.stopSequence ?? index + 1),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async function fetchScheduleRows(system, date, token) {
    const data = await cachedFetchJson(`home_live_schedule_${system}_${date}_v1`, SCHEDULE_CACHE_MS, SYSTEMS[system].scheduleUrl(date), token);
    if (system === "tr") {
      return Array.isArray(data?.TrainTimetables)
        ? data.TrainTimetables
        : (Array.isArray(data?.DailyTrainTimetables) ? data.DailyTrainTimetables : []);
    }
    return Array.isArray(data)
      ? data
      : (Array.isArray(data?.TrainTimetables) ? data.TrainTimetables : (Array.isArray(data?.DailyTimetables) ? data.DailyTimetables : []));
  }

  async function loadDelayMap(token) {
    const map = new Map();
    try {
      const data = await cachedFetchJson("home_live_tra_live_board_v1", LIVE_DELAY_CACHE_MS, SYSTEMS.tr.liveDelayUrl, token);
      const rows = Array.isArray(data?.TrainLiveBoards)
        ? data.TrainLiveBoards
        : (Array.isArray(data?.LiveBoards) ? data.LiveBoards : (Array.isArray(data) ? data : []));
      rows.forEach((item) => {
        const trainNo = String(item?.TrainNo || "").trim();
        if (!trainNo) return;
        map.set(trainNo, {
          delayMinutes: Math.max(0, Number(item?.DelayTime) || 0),
          stationName: readZh(item?.StationName),
          updateTime: String(item?.UpdateTime || item?.SrcUpdateTime || "").trim(),
        });
      });
    } catch (_) {
    }
    return { tr: map, thsr: new Map() };
  }

  function inferDirection(system, stops) {
    if (!Array.isArray(stops) || stops.length < 2) return "";
    if (system === "thsr") {
      const order = getRailNetwork()?.getThsrStationOrder?.() || [];
      const first = order.indexOf(stops[0].name);
      const last = order.indexOf(stops[stops.length - 1].name);
      if (first >= 0 && last >= 0) return first <= last ? "south" : "north";
    }
    const firstGeo = getStation(system, stops[0].name);
    const lastGeo = getStation(system, stops[stops.length - 1].name);
    if (!firstGeo || !lastGeo) return "";
    const dLat = lastGeo.lat - firstGeo.lat;
    const dLon = lastGeo.lon - firstGeo.lon;
    if (Math.abs(dLat) >= Math.abs(dLon)) return dLat < 0 ? "south" : "north";
    return dLon > 0 ? "east" : "west";
  }

  function getTrainColor(snapshot) {
    if (snapshot.system === "thsr") return snapshot.direction === "north" ? "#0f766e" : "#be185d";
    const color = getRailNetwork()?.getTraTypeColor?.(snapshot.type);
    return color || "#111827";
  }

  function buildEntry(system, row, date, delayMaps) {
    const info = row?.TrainInfo || row?.DailyTrainInfo || row?.Train || {};
    const trainNo = String(info?.TrainNo || row?.TrainNo || "").trim();
    const rawType = info?.TrainTypeName || row?.TrainTypeName || "";
    const type = normalizeTrainType(system, rawType);
    const delayInfo = delayMaps[system]?.get(trainNo) || null;
    const delayMinutes = system === "tr" ? Math.max(0, Number(delayInfo?.delayMinutes) || 0) : 0;
    const timedStops = buildTimedStops(system, row?.StopTimes || row?.Stops || [], date, delayMinutes);
    if (!trainNo || timedStops.length < 2) return null;
    const firstStop = timedStops[0];
    const lastStop = timedStops[timedStops.length - 1];
    const fullPathStations = expandEntryPathStations(system, timedStops);
    const fullPathPoints = buildJourneyPathPoints(system, timedStops, fullPathStations, type);
    if (fullPathPoints.length < 2) return null;
    const routeIndexMap = new Map(fullPathStations.map((name, index) => [name, index]));
    const stopDetails = timedStops
      .filter((stop) => !stop.isPassOnly && Number.isFinite(routeIndexMap.get(stop.name)))
      .map((stop) => ({ ...stop, routeIndex: routeIndexMap.get(stop.name) }));
    const firstPoint = fullPathPoints[0];
    const lastPoint = fullPathPoints[fullPathPoints.length - 1];
    const direction = inferDirection(system, timedStops);
    const entry = {
      key: `${system}|${trainNo}|${date}|${firstStop.name}`,
      system,
      systemLabel: SYSTEMS[system].label,
      trainNo,
      type,
      originDate: date,
      direction,
      stops: timedStops,
      firstStation: firstStop.name,
      firstDisplayStation: firstStop.displayName,
      lastStation: lastStop.name,
      lastDisplayStation: lastStop.displayName,
      firstMinute: firstPoint.minute,
      lastMinute: lastPoint.minute,
      journeyFirstMinute: getStopDepartureMinute(timedStops[0]),
      journeyLastMinute: getStopArrivalMinute(timedStops[timedStops.length - 1]),
      delayMinutes,
      liveStationName: delayInfo?.stationName || "",
      liveUpdateTime: delayInfo?.updateTime || "",
      fullPathStations,
      fullPathSet: new Set(fullPathStations),
      fullPathPoints,
      points: fullPathPoints,
      stopDetails,
      startsAtJourneyOrigin: true,
      originEventMinute: getStopDepartureMinute(timedStops[0]),
    };
    return updateSnapshotRuntime(entry, nowExactMinute());
  }

  function isEntryVisible(entry, nowMinute) {
    return nowMinute >= entry.firstMinute - UPCOMING_WINDOW && nowMinute <= entry.lastMinute + STATION_ALERT_WINDOW;
  }

  function buildPunctualityText(snapshot) {
    const delay = Math.max(0, Number(snapshot?.delayMinutes) || 0);
    return delay > 0 ? `晚 ${delay} 分` : "準點";
  }

  function updateSnapshotRuntime(entry, minute) {
    const snapshot = { ...entry };
    const points = snapshot.points || [];
    const stopDetails = snapshot.stopDetails || [];
    const firstPoint = points[0] || null;
    const lastPoint = points[points.length - 1] || null;
    const punctualityText = buildPunctualityText(snapshot);
    let stateName = "arrived";
    let statusText = "已到終點";
    let positionIndex = lastPoint?.routeIndex ?? 0;
    let currentFrom = lastPoint?.station || snapshot.lastStation;
    let currentTo = lastPoint?.station || snapshot.lastStation;
    let nextStation = lastPoint?.station || snapshot.lastStation;
    let nextTime = formatMinute(snapshot.lastMinute);
    let soonStation = nextStation;
    let soonMinutes = Number.POSITIVE_INFINITY;
    let soonKind = "";
    let nextEventKind = "arrival";
    let nextStopStation = "";
    let nextStopTime = "";
    const originDepartureMinute = getStopDepartureMinute(snapshot.stops?.[0]);
    const originDisplayMinute = Number.isFinite(originDepartureMinute) ? originDepartureMinute - UPCOMING_WINDOW : null;
    if (Number.isFinite(originDepartureMinute) && Number.isFinite(originDisplayMinute) && minute < originDepartureMinute && minute >= originDisplayMinute) {
      stateName = "upcoming";
      statusText = `即將發車·${punctualityText}`;
      positionIndex = firstPoint?.routeIndex ?? 0;
      currentFrom = snapshot.firstStation;
      currentTo = snapshot.firstStation;
      nextStation = snapshot.firstStation;
      nextTime = formatMinute(originDepartureMinute);
      soonStation = snapshot.firstStation;
      soonMinutes = Math.max(0, originDepartureMinute - minute);
      soonKind = "stop";
      nextEventKind = "departure";
      nextStopStation = snapshot.firstStation;
      nextStopTime = nextTime;
    } else {
      for (let index = 0; index < stopDetails.length; index += 1) {
        const current = stopDetails[index];
        const arrivalMinute = getStopArrivalMinute(current);
        const departureMinute = getStopDepartureMinute(current);
        if (!Number.isFinite(arrivalMinute) || !Number.isFinite(departureMinute)) continue;
        if (minute >= arrivalMinute && minute < departureMinute) {
          const isTerminal = index === stopDetails.length - 1;
          stateName = isTerminal ? "arrived" : "dwell";
          statusText = isTerminal ? "已到終點" : `停靠中·${punctualityText}`;
          positionIndex = current.routeIndex ?? positionIndex;
          currentFrom = current.name;
          currentTo = current.name;
          nextStation = isTerminal ? current.name : current.name;
          nextTime = formatMinute(isTerminal ? arrivalMinute : departureMinute);
          soonStation = current.name;
          soonMinutes = 0;
          soonKind = "stop";
          nextEventKind = isTerminal ? "terminal" : "departure";
          break;
        }
      }
      if (stateName !== "dwell" && stateName !== "upcoming") {
        for (let index = 0; index < points.length - 1; index += 1) {
          const current = points[index];
          const next = points[index + 1];
          if (!Number.isFinite(current?.minute) || !Number.isFinite(next?.minute)) continue;
          if (minute < current.minute || minute >= next.minute) continue;
          stateName = "running";
          statusText = `行進中·${punctualityText}`;
          const duration = Math.max(1, next.minute - current.minute);
          const linear = clamp((minute - current.minute) / duration, 0, 1);
          const animated = getAnimatedSegmentProgress(linear, current, next);
          positionIndex = current.routeIndex + (next.routeIndex - current.routeIndex) * animated;
          currentFrom = current.station;
          currentTo = next.station;
          const nextStop = stopDetails.find((stop) => Number.isFinite(getStopArrivalMinute(stop)) && getStopArrivalMinute(stop) >= minute);
          const nextPoint = points.find((point, pointIndex) => pointIndex > index && Number.isFinite(point.minute) && point.minute >= minute);
          const nextStopTarget = nextStop ? { station: nextStop.name, minute: getStopArrivalMinute(nextStop), isStop: true } : null;
          const nextPointTarget = nextPoint ? { station: nextPoint.station, minute: nextPoint.minute, isStop: Boolean(nextPoint.isStop) } : null;
          const soonTarget = !nextStopTarget
            ? nextPointTarget
            : !nextPointTarget
              ? nextStopTarget
              : (nextPointTarget.minute < nextStopTarget.minute ? nextPointTarget : nextStopTarget);
          nextStation = soonTarget?.station || next.station;
          nextTime = formatMinute(soonTarget?.minute ?? next.minute);
          soonStation = soonTarget?.station || next.station;
          soonMinutes = Number.isFinite(soonTarget?.minute) ? Math.max(0, soonTarget.minute - minute) : Number.POSITIVE_INFINITY;
          soonKind = soonTarget?.isStop ? "stop" : soonTarget ? "pass" : "";
          nextEventKind = soonTarget?.isStop ? "arrival" : soonTarget ? "pass" : "";
          nextStopStation = nextStopTarget?.station || "";
          nextStopTime = nextStopTarget ? formatMinute(nextStopTarget.minute) : "";
          break;
        }
      }
    }
    const totalMinutes = Math.max(0, (snapshot.journeyLastMinute ?? snapshot.lastMinute) - (snapshot.journeyFirstMinute ?? snapshot.firstMinute));
    const elapsedMinutes = clamp(minute - (snapshot.journeyFirstMinute ?? snapshot.firstMinute), 0, totalMinutes);
    return {
      ...snapshot,
      nowMinute: minute,
      state: stateName,
      stateLabel: stateName === "running" ? "行進中" : stateName === "dwell" ? "停靠中" : stateName === "upcoming" ? "即將發車" : "已到終點",
      statusText,
      positionIndex,
      currentFrom,
      currentTo,
      nextStation,
      nextDisplayStation: getDisplayStation(snapshot.system, nextStation),
      nextTime,
      soonStation,
      soonMinutes,
      soonKind,
      nextEventKind,
      nextStopStation,
      nextStopTime,
      originEventMinute: originDepartureMinute,
      completionRatio: totalMinutes > 0 ? elapsedMinutes / totalMinutes : stateName === "arrived" ? 1 : 0,
      isSoonStop: soonKind === "stop" && Number.isFinite(soonMinutes) && soonMinutes <= STATION_SOON_WINDOW,
    };
  }

  function normalizeGeoCoords(value) {
    if (!value) return null;
    const lat = Number(value.lat ?? value.latitude ?? value.PositionLat);
    const lon = Number(value.lon ?? value.lng ?? value.longitude ?? value.PositionLon);
    if (!isTaiwanLatLng(lat, lon)) return null;
    return {
      lat,
      lon,
      accuracy: Number(value.accuracy),
      speed: Number(value.speed),
      ts: Number(value.ts || value.timestamp || Date.now()),
    };
  }

  function getGeoDistanceMeters(from, to) {
    const a = normalizeGeoCoords(from);
    const b = normalizeGeoCoords(to);
    if (!a || !b) return null;
    const avgLatRad = ((a.lat + b.lat) / 2) * Math.PI / 180;
    const x = (b.lon - a.lon) * 111320 * Math.cos(avgLatRad);
    const y = (b.lat - a.lat) * 111320;
    return Math.hypot(x, y);
  }

  function latLngDistanceKm(a, b) {
    const meters = getGeoDistanceMeters(
      { lat: Array.isArray(a) ? a[0] : a?.lat, lon: Array.isArray(a) ? a[1] : a?.lon },
      { lat: Array.isArray(b) ? b[0] : b?.lat, lon: Array.isArray(b) ? b[1] : b?.lon }
    );
    return Number.isFinite(meters) ? meters / 1000 : Number.POSITIVE_INFINITY;
  }

  function findNearestLineIndex(line, geo) {
    let best = null;
    (line || []).forEach((point, index) => {
      const distanceKm = latLngDistanceKm(point, geo);
      if (!best || distanceKm < best.distanceKm) best = { index, distanceKm };
    });
    return best;
  }

  function getLatLngHeadingAngle(from, to) {
    const fromPoint = Array.isArray(from) ? from : [from?.lat, from?.lon ?? from?.lng];
    const toPoint = Array.isArray(to) ? to : [to?.lat, to?.lon ?? to?.lng];
    const fromLat = Number(fromPoint[0]);
    const fromLon = Number(fromPoint[1]);
    const toLat = Number(toPoint[0]);
    const toLon = Number(toPoint[1]);
    if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)) return 0;
    const avgLatRad = ((fromLat + toLat) / 2) * Math.PI / 180;
    const dx = (toLon - fromLon) * Math.cos(avgLatRad);
    const dy = toLat - fromLat;
    if (Math.abs(dx) < 0.000001 && Math.abs(dy) < 0.000001) return 0;
    return Math.atan2(dx, dy) * 180 / Math.PI;
  }

  function getDirectionalTrainLabelTransform(angle) {
    const normalized = ((Number(angle) || 0) % 360 + 360) % 360;
    if (normalized >= 45 && normalized < 135) return "translate(-50%, 13px)";
    if (normalized >= 135 && normalized < 225) return "translate(13px, -50%)";
    if (normalized >= 225 && normalized < 315) return "translate(-50%, calc(-100% - 13px))";
    return "translate(calc(-100% - 13px), -50%)";
  }

  function pointAtRatioOnLineWithAngle(line, ratio) {
    const points = (line || []).filter(Boolean);
    if (!points.length) return null;
    if (points.length === 1) return { latLng: points[0], angle: 0 };
    const distances = [];
    let total = 0;
    for (let index = 0; index < points.length - 1; index += 1) {
      const distance = latLngDistanceKm(points[index], points[index + 1]);
      const safeDistance = Number.isFinite(distance) ? distance : 0;
      distances.push(safeDistance);
      total += safeDistance;
    }
    if (total <= 0) return { latLng: points[0], angle: getLatLngHeadingAngle(points[0], points[1]) };
    let target = total * clamp(ratio, 0, 1);
    for (let index = 0; index < distances.length; index += 1) {
      if (target > distances[index]) {
        target -= distances[index];
        continue;
      }
      const segmentRatio = distances[index] > 0 ? target / distances[index] : 0;
      const from = points[index];
      const to = points[index + 1];
      return {
        latLng: [
          from[0] + (to[0] - from[0]) * segmentRatio,
          from[1] + (to[1] - from[1]) * segmentRatio,
        ],
        angle: getLatLngHeadingAngle(from, to),
      };
    }
    const lastIndex = points.length - 1;
    return {
      latLng: points[lastIndex],
      angle: getLatLngHeadingAngle(points[lastIndex - 1], points[lastIndex]),
    };
  }

  function easeInSine(value) {
    return 1 - Math.cos((clamp(value, 0, 1) * Math.PI) / 2);
  }

  function easeOutSine(value) {
    return Math.sin((clamp(value, 0, 1) * Math.PI) / 2);
  }

  function easeInOutSine(value) {
    return -(Math.cos(Math.PI * clamp(value, 0, 1)) - 1) / 2;
  }

  function mixProgress(linear, eased, weight) {
    return linear + (eased - linear) * clamp(weight, 0, 1);
  }

  function getAnimatedSegmentProgress(progress, fromPoint, toPoint) {
    const linear = clamp(progress, 0, 1);
    const fromStop = Boolean(fromPoint?.isStop);
    const toStop = Boolean(toPoint?.isStop);
    if (fromStop && !toStop) return mixProgress(linear, easeInSine(linear), 0.72);
    if (!fromStop && toStop) return mixProgress(linear, easeOutSine(linear), 0.72);
    if (fromStop && toStop) return mixProgress(linear, easeInOutSine(linear), 0.58);
    return linear;
  }

  function getSnapshotTravelDirection(snapshot) {
    const points = snapshot?.points || [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const currentIndex = Number(points[index]?.routeIndex);
      const nextIndex = Number(points[index + 1]?.routeIndex);
      if (!Number.isFinite(currentIndex) || !Number.isFinite(nextIndex) || currentIndex === nextIndex) continue;
      return nextIndex > currentIndex ? 1 : -1;
    }
    return 0;
  }

  function getAnimatedSnapshotPosition(snapshot, minute) {
    const points = snapshot?.points || [];
    const stopDetails = snapshot?.stopDetails || [];
    const firstPoint = points[0] || null;
    const lastPoint = points[points.length - 1] || null;
    const firstMinute = snapshot?.firstMinute ?? firstPoint?.minute;
    const lastMinute = snapshot?.lastMinute ?? lastPoint?.minute;
    const basePosition = Number.isFinite(snapshot?.positionIndex) ? snapshot.positionIndex : 0;
    const clampToBase = (value) => {
      if (!Number.isFinite(value)) return basePosition || 0;
      const direction = getSnapshotTravelDirection(snapshot);
      if (direction > 0) return Math.max(value, basePosition);
      if (direction < 0) return Math.min(value, basePosition);
      return Number.isFinite(basePosition) ? basePosition : value;
    };
    if (!points.length || !Number.isFinite(firstMinute) || !Number.isFinite(lastMinute)) return basePosition || 0;
    if (points.length === 1) return Number.isFinite(snapshot?.positionIndex) ? snapshot.positionIndex : firstPoint?.routeIndex ?? 0;
    if (!Number.isFinite(minute)) return basePosition || 0;
    if (minute <= firstMinute) return clampToBase(firstPoint?.routeIndex ?? basePosition);
    if (minute >= lastMinute) return clampToBase(lastPoint?.routeIndex ?? basePosition);
    for (let index = 0; index < stopDetails.length; index += 1) {
      const current = stopDetails[index];
      const arrivalMinute = getStopArrivalMinute(current);
      const departureMinute = getStopDepartureMinute(current);
      if (!Number.isFinite(arrivalMinute) || !Number.isFinite(departureMinute) || !Number.isFinite(current?.routeIndex)) continue;
      if (minute >= arrivalMinute && minute < departureMinute) return clampToBase(current.routeIndex);
    }
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      if (!Number.isFinite(current?.minute) || !Number.isFinite(next?.minute)) continue;
      if (minute < current.minute || minute > next.minute) continue;
      if (!Number.isFinite(current?.routeIndex) || !Number.isFinite(next?.routeIndex)) return basePosition || 0;
      if (current.routeIndex === next.routeIndex) return clampToBase(current.routeIndex);
      const duration = next.minute - current.minute;
      if (duration <= 0) return clampToBase(next.routeIndex);
      const progress = (minute - current.minute) / duration;
      const animatedProgress = getAnimatedSegmentProgress(progress, current, next);
      return clampToBase(current.routeIndex + (next.routeIndex - current.routeIndex) * animatedProgress);
    }
    return Number.isFinite(snapshot?.positionIndex) ? snapshot.positionIndex : lastPoint?.routeIndex ?? 0;
  }

  function findSnapshotPointPairForPosition(snapshot, positionIndex) {
    const points = Array.isArray(snapshot?.points) ? snapshot.points : [];
    const target = Number(positionIndex);
    if (!Number.isFinite(target) || points.length < 2) return null;
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const fromIndex = Number(current?.routeIndex);
      const toIndex = Number(next?.routeIndex);
      if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex) || fromIndex === toIndex) continue;
      const min = Math.min(fromIndex, toIndex);
      const max = Math.max(fromIndex, toIndex);
      if (target < min || target > max) continue;
      return {
        fromStation: current.station,
        toStation: next.station,
        ratio: clamp((target - fromIndex) / (toIndex - fromIndex), 0, 1),
      };
    }
    return null;
  }

  function interpolatePlacementOnRouteLines(system, routeLines, fromGeo, toGeo, ratio) {
    if (!fromGeo || !toGeo) return null;
    const straight = {
      latLng: [
        fromGeo.lat + (toGeo.lat - fromGeo.lat) * clamp(ratio, 0, 1),
        fromGeo.lon + (toGeo.lon - fromGeo.lon) * clamp(ratio, 0, 1),
      ],
      angle: getLatLngHeadingAngle([fromGeo.lat, fromGeo.lon], [toGeo.lat, toGeo.lon]),
    };
    if (fromGeo.name === toGeo.name || (fromGeo.lat === toGeo.lat && fromGeo.lon === toGeo.lon)) {
      return { latLng: [fromGeo.lat, fromGeo.lon], angle: straight.angle };
    }
    const maxDistanceKm = system === "thsr" ? 18 : 6;
    let best = null;
    (routeLines || []).forEach((line) => {
      const fromHit = findNearestLineIndex(line, fromGeo);
      const toHit = findNearestLineIndex(line, toGeo);
      if (!fromHit || !toHit || fromHit.index === toHit.index) return;
      const score = fromHit.distanceKm + toHit.distanceKm;
      if (fromHit.distanceKm > maxDistanceKm || toHit.distanceKm > maxDistanceKm) return;
      if (!best || score < best.score) best = { line, fromIndex: fromHit.index, toIndex: toHit.index, score };
    });
    if (!best) return straight;
    const fromIndex = Math.min(best.fromIndex, best.toIndex);
    const toIndex = Math.max(best.fromIndex, best.toIndex);
    const subline = best.fromIndex <= best.toIndex
      ? best.line.slice(fromIndex, toIndex + 1)
      : best.line.slice(fromIndex, toIndex + 1).reverse();
    return pointAtRatioOnLineWithAngle(subline, ratio) || straight;
  }

  function getAnimationMode(snapshot) {
    const delay = Math.max(0, Number(snapshot?.delayMinutes) || 0);
    if (delay > 10) return { type: "stepped", cadenceSeconds: 60 };
    if (delay > 5) return { type: "stepped", cadenceSeconds: 30 };
    return { type: "continuous", cadenceSeconds: 0 };
  }

  function getPlacement(snapshot) {
    const mode = getAnimationMode(snapshot);
    if (mode.type === "stepped") {
      const slot = Math.floor(Date.now() / (mode.cadenceSeconds * 1000));
      const cached = state.stepCache.get(snapshot.key);
      if (cached?.slot === slot) return cached.placement;
      const placement = getPlacementAtMinute(snapshot, nowExactMinute(slot * mode.cadenceSeconds * 1000));
      state.stepCache.set(snapshot.key, { slot, placement });
      return placement;
    }
    return getPlacementAtMinute(snapshot, nowExactMinute());
  }

  function getPlacementAtMinute(snapshot, minute) {
    const runtime = updateSnapshotRuntime(snapshot, minute);
    const positionIndex = getAnimatedSnapshotPosition(runtime, minute);
    const pointPair = findSnapshotPointPairForPosition(runtime, positionIndex);
    const fromStation = pointPair?.fromStation || runtime.currentFrom || runtime.firstStation;
    const toStation = pointPair?.toStation || runtime.currentTo || runtime.lastStation;
    const from = getStation(runtime.system, fromStation);
    const to = getStation(runtime.system, toStation) || from;
    if (!from && !to) return null;
    if (!from) return { latLng: [to.lat, to.lon], angle: 0, runtime };
    if (!to) return { latLng: [from.lat, from.lon], angle: 0, runtime };
    const ratio = pointPair ? pointPair.ratio : 0;
    const routeLines = state.routeLines[runtime.system] || [];
    const placement = interpolatePlacementOnRouteLines(runtime.system, routeLines, from, to, ratio);
    return placement ? { ...placement, runtime } : null;
  }

  function getStatusSegmentColor(text) {
    const value = String(text || "").trim();
    if (!value) return "#475569";
    if (value === "已到終點") return "#64748b";
    if (value === "停靠中") return "#2563eb";
    if (value === "即將發車") return "#d97706";
    if (/^晚\s*\d+\s*分$/.test(value)) return "#dc2626";
    if (value === "準點") return "#16a34a";
    if (value === "行進中") return "#0f766e";
    return "#475569";
  }

  function buildStatusHTML(statusText) {
    const parts = String(statusText || "")
      .split("·")
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return "";
    return parts.map((part, index) => {
      const sep = index ? `<span class="home-live-status-sep">·</span>` : "";
      return `${sep}<span class="home-live-status-part" style="color:${escapeHtml(getStatusSegmentColor(part))}">${escapeHtml(part)}</span>`;
    }).join("");
  }

  function buildPopupHtml(snapshot, runtime) {
    const from = getDisplayStation(snapshot.system, runtime.currentFrom);
    const to = getDisplayStation(snapshot.system, runtime.currentTo);
    const trainColor = getTrainColor(snapshot);
    return `
      <div style="min-width:210px">
        <strong style="font-size:1rem">${escapeHtml(snapshot.systemLabel)} ${escapeHtml(snapshot.trainNo)} <span style="color:${escapeHtml(trainColor)}">${escapeHtml(snapshot.type)}</span></strong>
        <div class="home-live-popup-line">${escapeHtml(snapshot.firstDisplayStation)} → ${escapeHtml(snapshot.lastDisplayStation)}</div>
        <div class="home-live-popup-line"><b>列車狀態</b>：${buildStatusHTML(runtime.statusText)}</div>
        <div class="home-live-popup-line"><b>下一站</b>：${escapeHtml(runtime.nextDisplayStation || runtime.nextStation || "--")} ${escapeHtml(runtime.nextTime || "")}</div>
        <div class="home-live-popup-line"><b>目前區間</b>：${escapeHtml(from)} → ${escapeHtml(to)}</div>
        <button type="button" class="home-live-detail-btn" data-live-detail-key="${escapeHtml(snapshot.key)}">詳細資訊</button>
      </div>
    `;
  }

  function getPointKindText(point) {
    if (point?.kind === "pass") return "通過";
    if (point?.kind === "departure") return "發車";
    if (point?.kind === "arrival") return "到站";
    return point?.isStop ? "停靠" : "通過";
  }

  function buildTrainDetailRows(snapshot) {
    const seen = new Set();
    return (snapshot.points || [])
      .map((point) => {
        const key = `${point.station}|${point.kind}|${point.minute}`;
        if (seen.has(key)) return "";
        seen.add(key);
        const isPass = point.kind === "pass" || !point.isStop;
        return `
          <tr class="${isPass ? "home-live-detail-pass" : ""}">
            <td>${escapeHtml(formatMinute(point.minute))}</td>
            <td>${escapeHtml(getDisplayStation(snapshot.system, point.station))}${renderStationTransferBadges(snapshot.system, point.station)}</td>
            <td>${escapeHtml(getPointKindText(point))}</td>
          </tr>
        `;
      })
      .join("");
  }

  function showTrainDetailModal(snapshot) {
    if (!snapshot) return;
    const runtime = updateSnapshotRuntime(snapshot, nowExactMinute());
    const trainColor = getTrainColor(runtime);
    if (el.modalTitle) {
      el.modalTitle.innerHTML = `${escapeHtml(runtime.systemLabel)} ${escapeHtml(runtime.trainNo)} <span style="color:${escapeHtml(trainColor)}">${escapeHtml(runtime.type)}</span>`;
    }
    if (el.modalSubtitle) {
      el.modalSubtitle.innerHTML = `${escapeHtml(runtime.firstDisplayStation)} → ${escapeHtml(runtime.lastDisplayStation)} · ${buildStatusHTML(runtime.statusText)}`;
    }
    if (el.modalBody) {
      el.modalBody.innerHTML = `
        <div class="home-live-detail-summary">
          <div><b>下一站</b><span>${escapeHtml(runtime.nextDisplayStation || runtime.nextStation || "--")} ${escapeHtml(runtime.nextTime || "")}</span></div>
          <div><b>目前區間</b><span>${escapeHtml(getDisplayStation(runtime.system, runtime.currentFrom))} → ${escapeHtml(getDisplayStation(runtime.system, runtime.currentTo))}</span></div>
          <div><b>起訖站</b><span>${escapeHtml(runtime.firstDisplayStation)} → ${escapeHtml(runtime.lastDisplayStation)}</span></div>
          <div><b>即時狀態</b><span>${buildStatusHTML(runtime.statusText)}</span></div>
        </div>
        <table class="home-live-detail-table">
          <thead><tr><th>時間</th><th>車站</th><th>事件</th></tr></thead>
          <tbody>${buildTrainDetailRows(runtime)}</tbody>
        </table>
      `;
    }
    el.modal?.classList.remove("hidden");
    el.modal?.setAttribute("aria-hidden", "false");
  }

  function closeTrainDetailModal() {
    el.modal?.classList.add("hidden");
    el.modal?.setAttribute("aria-hidden", "true");
  }

  function getDisplayStation(system, station) {
    const found = getStation(system, station);
    return found?.name || station || "--";
  }

  function updateMarkerVisual(marker, snapshot, placement) {
    if (!marker || !placement?.latLng) return;
    marker.setLatLng(placement.latLng);
    const root = marker.getElement?.();
    const button = root?.querySelector?.("button");
    if (!button) return;
    const color = getTrainColor(snapshot);
    button.style.setProperty("--train-color", color);
    button.style.setProperty("--train-angle", `${(Number(placement.angle) || 0).toFixed(1)}deg`);
    button.style.setProperty("--train-label-transform", getDirectionalTrainLabelTransform(placement.angle));
    root.classList.toggle("is-active", snapshot.key === state.activeKey);
  }

  function selectTrain(snapshot, marker) {
    state.activeKey = snapshot.key;
    state.markers.forEach((itemMarker, key) => {
      itemMarker.getElement?.()?.classList.toggle("is-active", key === state.activeKey);
    });
    const placement = getPlacement(snapshot);
    if (marker && placement?.runtime) {
      marker.bindPopup(buildPopupHtml(snapshot, placement.runtime), { maxWidth: 280 }).openPopup();
    }
  }

  function clearMarkers() {
    state.markers.forEach((marker) => marker.remove());
    state.markers.clear();
    state.markerBindings = [];
    state.stepCache.clear();
  }

  function renderMarkers() {
    const L = state.L || window.L;
    clearMarkers();
    state.snapshots.forEach((snapshot) => {
      const placement = getPlacement(snapshot);
      if (!placement?.latLng) return;
      const color = getTrainColor(snapshot);
      const label = `${snapshot.trainNo} ${snapshot.type}`;
      const icon = L.divIcon({
        className: "home-live-train-marker",
        html: `<button type="button" aria-label="${escapeHtml(snapshot.systemLabel)} ${escapeHtml(label)}" style="--train-color:${escapeHtml(color)}"><strong>${escapeHtml(label)}</strong></button>`,
        iconSize: [1, 1],
        iconAnchor: [0, 0],
      });
      const marker = L.marker(placement.latLng, { icon, zIndexOffset: snapshot.system === "thsr" ? 720 : 650 }).addTo(state.map);
      marker.on("click", () => selectTrain(snapshot, marker));
      state.markers.set(snapshot.key, marker);
      state.markerBindings.push({ marker, snapshot });
      window.setTimeout(() => updateMarkerVisual(marker, snapshot, placement), 0);
    });
  }

  function clearRouteLayers() {
    state.routeLayers.forEach((layer) => layer.remove());
    state.routeLayers = [];
    state.stationLayers.forEach((layer) => layer.remove());
    state.stationLayers = [];
  }

  function renderStationTransferBadges(system, stationName) {
    try {
      return window.RailStationContext?.renderTransferBadges?.(stationName, { system }) || "";
    } catch (_) {
      return "";
    }
  }

  function buildStationLabelHtml(system, station) {
    const badges = renderStationTransferBadges(system, station.name);
    return `<button type="button" aria-label="${escapeHtml(station.name)}站">${escapeHtml(station.name)}${badges}</button>`;
  }

  function pushStationEvent(map, stationName, event) {
    if (!stationName) return;
    if (!map.has(stationName)) map.set(stationName, []);
    const list = map.get(stationName);
    const key = `${event.trainNo}|${event.originDate || ""}|${event.kind}|${event.station}`;
    const existingIndex = list.findIndex((item) => `${item.trainNo}|${item.originDate || ""}|${item.kind}|${item.station}` === key);
    if (existingIndex >= 0) {
      const current = list[existingIndex];
      if (Number(event.timeMinute) < Number(current.timeMinute)) list[existingIndex] = event;
      return;
    }
    list.push(event);
  }

  function buildStationEventMap(snapshots) {
    const map = new Map();
    (snapshots || []).forEach((snapshot) => {
      const runtime = updateSnapshotRuntime(snapshot, nowExactMinute());
      if (
        runtime.state === "upcoming" &&
        runtime.startsAtJourneyOrigin &&
        Number.isFinite(runtime.originEventMinute) &&
        runtime.originEventMinute - runtime.nowMinute <= STATION_ALERT_WINDOW
      ) {
        pushStationEvent(map, runtime.currentFrom, {
          trainNo: runtime.trainNo,
          originDate: runtime.originDate,
          type: runtime.type,
          kind: "即將發車",
          station: runtime.currentFrom,
          timeMinute: runtime.originEventMinute,
          timeText: formatMinute(runtime.originEventMinute),
          minutesAway: Math.max(0, runtime.originEventMinute - runtime.nowMinute),
          snapshot: runtime,
        });
      }
      (runtime.stopDetails || []).forEach((stop) => {
        const arrivalMinute = getStopArrivalMinute(stop);
        const departureMinute = getStopDepartureMinute(stop);
        if (!Number.isFinite(arrivalMinute) || !Number.isFinite(departureMinute)) return;
        if (runtime.nowMinute >= arrivalMinute && runtime.nowMinute < departureMinute) {
          pushStationEvent(map, stop.name, {
            trainNo: runtime.trainNo,
            originDate: runtime.originDate,
            type: runtime.type,
            kind: stop.name === runtime.lastStation ? "已到終點" : "停靠中",
            station: stop.name,
            timeMinute: departureMinute,
            timeText: formatMinute(departureMinute),
            minutesAway: 0,
            snapshot: runtime,
          });
        } else if (arrivalMinute > runtime.nowMinute && arrivalMinute - runtime.nowMinute <= STATION_ALERT_WINDOW) {
          pushStationEvent(map, stop.name, {
            trainNo: runtime.trainNo,
            originDate: runtime.originDate,
            type: runtime.type,
            kind: stop.name === runtime.lastStation ? "抵達終點" : "即將進站",
            station: stop.name,
            timeMinute: arrivalMinute,
            timeText: formatMinute(arrivalMinute),
            minutesAway: Math.max(0, arrivalMinute - runtime.nowMinute),
            snapshot: runtime,
          });
        }
      });
      (runtime.points || [])
        .filter((point) => !point.isStop && Number.isFinite(point.minute) && point.minute >= runtime.nowMinute && point.minute - runtime.nowMinute <= STATION_ALERT_WINDOW)
        .forEach((point) => {
          pushStationEvent(map, point.station, {
            trainNo: runtime.trainNo,
            originDate: runtime.originDate,
            type: runtime.type,
            kind: "即將通過",
            station: point.station,
            timeMinute: point.minute,
            timeText: formatMinute(point.minute),
            minutesAway: Math.max(0, point.minute - runtime.nowMinute),
            snapshot: runtime,
          });
        });
    });
    map.forEach((list) => list.sort((a, b) => a.timeMinute - b.timeMinute || String(a.trainNo).localeCompare(String(b.trainNo), "zh-Hant", { numeric: true })));
    return map;
  }

  function getStationEvents(system, stationName) {
    const key = normalizeStation(system, stationName);
    return (state.stationEvents.get(key) || []).slice(0, 8);
  }

  function buildStationPopupHtml(system, station) {
    const badges = renderStationTransferBadges(system, station.name);
    const events = getStationEvents(system, station.name);
    const rows = events.length
      ? events.map((event) => `
          <li>
            <time>${escapeHtml(event.timeText)}</time>
            <span>${escapeHtml(event.snapshot.systemLabel)} ${escapeHtml(event.snapshot.trainNo)} ${escapeHtml(event.snapshot.type)} · ${escapeHtml(event.kind)} · 往 ${escapeHtml(event.snapshot.lastDisplayStation)}</span>
          </li>
        `).join("")
      : `<li><time>10分內</time><span>未來 10 分鐘沒有列車事件</span></li>`;
    return `
      <div class="home-live-station-popup" style="min-width:220px">
        <h3>${escapeHtml(station.name)}${badges}</h3>
        <ul>${rows}</ul>
      </div>
    `;
  }

  function openStationPopup(system, station, marker) {
    if (!marker) return;
    marker.bindPopup(buildStationPopupHtml(system, station), { maxWidth: 320 }).openPopup();
  }

  function renderRoutes() {
    const L = state.L || window.L;
    clearRouteLayers();
    Object.keys(SYSTEMS).forEach((system) => {
      const color = SYSTEMS[system].lineColor;
      (state.routeLines[system] || []).forEach((line) => {
        if (!Array.isArray(line) || line.length < 2) return;
        const layer = L.polyline(line, {
          color,
          weight: system === "thsr" ? 4 : 3,
          opacity: system === "thsr" ? .74 : .66,
          interactive: false,
        }).addTo(state.map);
        state.routeLayers.push(layer);
      });
      state.stationLists[system].forEach((station) => {
        const events = getStationEvents(system, station.name);
        const isBusy = events.some((event) => event.kind === "停靠中" || event.kind === "已到終點");
        const isSoon = events.some((event) => event.kind !== "即將通過" && Number.isFinite(event.minutesAway) && event.minutesAway <= STATION_SOON_WINDOW);
        const hasAlert = events.length > 0;
        const stationColor = isBusy ? "#ef4444" : isSoon ? "#f97316" : hasAlert ? "#f59e0b" : color;
        const layer = L.circleMarker([station.lat, station.lon], {
          radius: isBusy || isSoon ? 6 : hasAlert ? 5.2 : (system === "thsr" ? 4.6 : 4),
          color: stationColor,
          weight: isBusy || isSoon || hasAlert ? 3 : 2,
          fillColor: "#fff",
          fillOpacity: .92,
          opacity: isBusy || isSoon || hasAlert ? .95 : .75,
          interactive: true,
        }).addTo(state.map);
        layer.on("click", () => openStationPopup(system, station, layer));
        state.stationLayers.push(layer);
        const label = L.marker([station.lat, station.lon], {
          icon: L.divIcon({
            className: `home-live-station-label ${hasAlert ? "has-alert" : ""} ${isBusy ? "is-busy" : ""} ${isSoon ? "is-soon" : ""}`,
            html: buildStationLabelHtml(system, station),
            iconSize: [1, 1],
            iconAnchor: [0, -5],
          }),
          zIndexOffset: system === "thsr" ? 430 : 380,
        }).addTo(state.map);
        label.on("click", () => openStationPopup(system, station, label));
        state.stationLayers.push(label);
      });
    });
  }

  function fitFullRoute(force = false) {
    if (!state.map || (!force && state.didInitialFit)) return;
    const L = state.L || window.L;
    const bounds = L.latLngBounds([]);
    state.routeLayers.forEach((layer) => {
      const layerBounds = layer.getBounds?.();
      if (layerBounds?.isValid?.()) bounds.extend(layerBounds);
    });
    state.markerBindings.forEach(({ marker }) => {
      const latLng = marker.getLatLng?.();
      if (latLng) bounds.extend(latLng);
    });
    if (state.userLocation?.coords) bounds.extend([state.userLocation.coords.lat, state.userLocation.coords.lon]);
    if (bounds.isValid()) {
      state.map.fitBounds(bounds.pad(0.08), { animate: false });
    } else {
      state.map.setView([23.7, 121], 7);
    }
    state.didInitialFit = true;
    if (force) state.userMoved = false;
  }

  function updateTrainMarkers() {
    state.markerBindings.forEach(({ marker, snapshot }) => {
      const placement = getPlacement(snapshot);
      if (placement?.latLng) updateMarkerVisual(marker, snapshot, placement);
    });
  }

  function startAnimation() {
    if (state.animationFrame) window.cancelAnimationFrame(state.animationFrame);
    const tick = () => {
      updateTrainMarkers();
      updateUserMarker();
      state.animationFrame = window.requestAnimationFrame(tick);
    };
    tick();
  }

  function inferSpeedKmh(nextCoords) {
    const directSpeed = Number(nextCoords?.speed);
    if (Number.isFinite(directSpeed) && directSpeed >= 0 && directSpeed <= 90) return directSpeed * 3.6;
    const previous = state.userLocation?.coords || null;
    if (!previous) return null;
    const elapsedSeconds = (Number(nextCoords.ts) - Number(previous.ts)) / 1000;
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 1.5 || elapsedSeconds > 60) return null;
    const distance = getGeoDistanceMeters(previous, nextCoords);
    if (!Number.isFinite(distance)) return null;
    const speed = distance < 3 ? 0 : distance / elapsedSeconds * 3.6;
    return speed >= 0 && speed <= 320 ? speed : null;
  }

  function writeSharedGeo(coords, speedKmh) {
    try {
      localStorage.setItem(SHARED_GEO_KEY, JSON.stringify({
        lat: coords.lat,
        lon: coords.lon,
        accuracy: coords.accuracy,
        speed: Number.isFinite(speedKmh) ? speedKmh / 3.6 : coords.speed,
        source: "home-live-map",
        ts: coords.ts || Date.now(),
      }));
    } catch (_) {
    }
  }

  function readSharedGeo() {
    try {
      const cached = JSON.parse(localStorage.getItem(SHARED_GEO_KEY) || "null");
      const coords = normalizeGeoCoords(cached);
      if (!coords || Date.now() - Number(coords.ts || 0) > USER_LOCATION_MAX_AGE_MS) return null;
      return coords;
    } catch (_) {
      return null;
    }
  }

  function setUserLocation(rawCoords, source) {
    const coords = normalizeGeoCoords(rawCoords);
    if (!coords) return;
    coords.ts = Number(coords.ts || Date.now());
    const speedKmh = inferSpeedKmh(coords);
    state.userLocation = {
      coords,
      speedKmh,
      source: source || "gps",
    };
    writeSharedGeo(coords, speedKmh);
    updateUserMarker();
  }

  function formatSpeedKmh(value) {
    if (!Number.isFinite(value)) return "";
    if (value < 2) return "0 km/h";
    return `${Math.round(value)} km/h`;
  }

  function updateUserMarker() {
    const coords = state.userLocation?.coords || readSharedGeo();
    if (!coords || !state.map || !(state.L || window.L)) return;
    if (!state.userLocation?.coords) state.userLocation = { coords, speedKmh: Number.isFinite(coords.speed) ? coords.speed * 3.6 : null, source: "shared" };
    const L = state.L || window.L;
    const speedText = formatSpeedKmh(state.userLocation?.speedKmh);
    const html = `<div class="dot"></div><div class="speed">${escapeHtml(speedText || "-- km/h")}</div>`;
    if (!state.userMarker) {
      const icon = L.divIcon({
        className: "home-live-user-marker",
        html,
        iconSize: [1, 1],
        iconAnchor: [0, 0],
      });
      state.userMarker = L.marker([coords.lat, coords.lon], { icon, zIndexOffset: 900 }).addTo(state.map);
    } else {
      state.userMarker.setLatLng([coords.lat, coords.lon]);
      const root = state.userMarker.getElement?.();
      if (root) root.innerHTML = html;
    }
  }

  function ensureUserLocationTracking(force = false) {
    const shared = readSharedGeo();
    if (shared) setUserLocation(shared, "shared");
    if (!navigator.geolocation) {
      if (force) showStatus("這個瀏覽器不支援定位。");
      return;
    }
    if (state.userWatchId !== null && !force) return;
    try {
      if (state.userWatchId !== null) navigator.geolocation.clearWatch(state.userWatchId);
      state.userWatchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            ts: position.timestamp || Date.now(),
          }, "gps");
        },
        (error) => {
          if (force) showStatus(error?.message || "無法取得目前位置。");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2500,
          timeout: 10000,
        }
      );
      if (force) showStatus("正在取得目前位置。");
    } catch (error) {
      if (force) showStatus(error?.message || "無法啟動定位。");
    }
  }

  async function collectSnapshots(token) {
    const date = todayDateStr();
    const prevDate = addDays(date, -1);
    const delayMaps = await loadDelayMap(token);
    const rowsBySystem = {};
    await Promise.all(Object.keys(SYSTEMS).map(async (system) => {
      try {
        const [prevRows, todayRows] = await Promise.all([
          fetchScheduleRows(system, prevDate, token),
          fetchScheduleRows(system, date, token),
        ]);
        rowsBySystem[system] = [
          { date: prevDate, rows: prevRows || [] },
          { date, rows: todayRows || [] },
        ];
      } catch (error) {
        rowsBySystem[system] = [];
        console.warn(`home live schedule failed: ${system}`, error);
      }
    }));
    const nowMinute = nowExactMinute();
    const snapshots = [];
    Object.keys(SYSTEMS).forEach((system) => {
      (rowsBySystem[system] || []).forEach((source) => {
        (source.rows || []).forEach((row) => {
          const entry = buildEntry(system, row, source.date, delayMaps);
          if (!entry || !isEntryVisible(entry, nowMinute)) return;
          if (!getStation(system, entry.firstStation) || !getStation(system, entry.lastStation)) return;
          snapshots.push(entry);
        });
      });
    });
    snapshots.sort((a, b) => {
      if (a.system !== b.system) return a.system === "thsr" ? -1 : 1;
      return a.trainNo.localeCompare(b.trainNo, "zh-Hant", { numeric: true });
    });
    return snapshots;
  }

  function updateSubtitle() {
    const updated = new Date();
    setSubtitle(`自動更新 · ${String(updated.getHours()).padStart(2, "0")}:${String(updated.getMinutes()).padStart(2, "0")}`);
  }

  function scheduleRefresh() {
    window.clearTimeout(state.refreshTimer);
    const hasModerateDelay = state.snapshots.some((snapshot) => {
      const delay = Math.max(0, Number(snapshot?.delayMinutes) || 0);
      return delay >= 5 && delay <= 10;
    });
    state.refreshTimer = window.setTimeout(() => {
      loadData({ silent: true });
    }, hasModerateDelay ? DELAY_REFRESH_MS : REFRESH_MS);
  }

  async function loadData(options = {}) {
    if (!options.silent) showStatus("正在更新即時動態。", { sticky: true });
    try {
      const token = await getTdxToken();
      await Promise.all([
        loadStations("tr", token),
        loadStations("thsr", token),
      ]);
      await loadRouteLines(token);
      ensureMap();
      state.snapshots = await collectSnapshots(token);
      state.stationEvents = buildStationEventMap(state.snapshots);
      renderRoutes();
      renderMarkers();
      updateSubtitle();
      updateUserMarker();
      fitFullRoute(false);
      startAnimation();
      scheduleRefresh();
      showStatus(`已更新 ${state.snapshots.length} 班列車。`);
    } catch (error) {
      console.error("home live map failed", error);
      showStatus("即時動態暫時無法載入，可能是 TDX 忙碌或網路連線不穩。", { duration: 6000 });
      scheduleRefresh();
    }
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-live-detail-key]");
      if (!button) return;
      const key = String(button.getAttribute("data-live-detail-key") || "");
      const snapshot = state.snapshots.find((item) => item.key === key);
      if (snapshot) showTrainDetailModal(snapshot);
    });
    el.modalClose?.addEventListener("click", closeTrainDetailModal);
    el.modal?.addEventListener("click", (event) => {
      if (event.target === el.modal) closeTrainDetailModal();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeTrainDetailModal();
    });
    el.fit?.addEventListener("click", () => {
      state.didInitialFit = false;
      fitFullRoute(true);
    });
    el.locate?.addEventListener("click", () => {
      ensureUserLocationTracking(true);
      const coords = state.userLocation?.coords || readSharedGeo();
      if (coords && state.map) {
        state.map.setView([coords.lat, coords.lon], Math.max(state.map.getZoom(), 14), { animate: true });
      }
    });
    el.close?.addEventListener("click", () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "APP_CLOSE" }, "*");
      } else if (history.length > 1) {
        history.back();
      }
    });
    window.addEventListener("beforeunload", () => {
      if (state.animationFrame) window.cancelAnimationFrame(state.animationFrame);
      if (state.refreshTimer) window.clearTimeout(state.refreshTimer);
      if (state.userWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(state.userWatchId);
    });
  }

  async function init() {
    bindEvents();
    try {
      await loadLeaflet();
      ensureMap();
      ensureUserLocationTracking(false);
      await loadData();
    } catch (error) {
      console.error("home live init failed", error);
      showStatus("地圖套件載入失敗，請確認網路可連線。", { sticky: true });
    }
  }

  init();
})();
