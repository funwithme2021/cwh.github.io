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
  const THSR_PAGE_SCHEDULE_CACHE_MS = 6 * 60 * 60 * 1000;
  const LIVE_DELAY_CACHE_MS = 25 * 1000;
  const THSR_REAL_SCHEDULE_SCRIPT_URL = "../thsr/thsr.real-schedule.js?v=20260419-tdxgate1";
  const SHAPE_CACHE_KEY = "rail_live_tdx_shape_v1";
  const SHAPE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
  const SHARED_GEO_KEY = "home_shared_geo_snapshot_v1";
  const HOME_GEO_SEGMENT_FILTER_KEY = "home_live_geo_segment_filter_tr_v1";
  const HOME_TRACKED_TRAINS_KEY = "home_live_tracked_trains_tr_v1";
  const USER_LOCATION_MAX_AGE_MS = 10 * 60 * 1000;
  const REFRESH_MS = 60 * 1000;
  const DELAY_REFRESH_MS = 30 * 1000;
  const MARKER_UPDATE_MS = 260;
  const HEAVY_MARKER_UPDATE_MS = 520;
  const UPCOMING_WINDOW = 10;
  const STATION_ALERT_WINDOW = 10;
  const STATION_SOON_WINDOW = 3;
  const SHARED_PHYSICAL_STATIONS = new Set(["南港", "台北", "板橋"]);

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
  const MAP_TRAIN_COLORS = {
    tr: {
      north: "#2563eb",
      south: "#f97316",
      east: "#7c3aed",
      west: "#e11d48",
      default: "#111827",
    },
    thsr: {
      north: "#0066ff",
      south: "#ff7a00",
      default: "#111827",
    },
  };

  const state = {
    L: null,
    map: null,
    routeLayers: [],
    stationLayers: [],
    markers: new Map(),
    markerBindings: [],
    trainCanvasLayer: null,
    vectorRenderer: null,
    stations: { tr: new Map(), thsr: new Map() },
    stationLists: { tr: [], thsr: [] },
    routeLines: { tr: [], thsr: [] },
    routeSource: { tr: "station", thsr: "station" },
    snapshots: [],
    displaySnapshots: [],
    loadStats: { tr: {}, thsr: {} },
    stationEvents: new Map(),
    stepCache: new Map(),
    userMarker: null,
    userLocation: null,
    userWatchId: null,
    userMoved: false,
    didInitialFit: false,
    mapInteracting: false,
    activeKey: "",
    refreshTimer: 0,
    animationFrame: 0,
    lastMarkerUpdateAt: 0,
    token: "",
    tokenExpireAt: 0,
    tokenPromise: null,
    tokenBackoffUntil: 0,
    geoSegmentIds: [],
    geoSegmentDraftIds: null,
    trackedTrainNos: [],
    trackedTrainDraftNos: null,
    trackedTrainCompletionMap: new Map(),
    geoSegmentPreferenceSaved: false,
    geoEntryPromptShown: false,
  };

  const el = {
    map: document.getElementById("homeLiveMap"),
    subtitle: document.getElementById("homeLiveSubtitle"),
    focus: document.getElementById("homeLiveFocus"),
    status: document.getElementById("homeLiveStatus"),
    locate: document.getElementById("homeLiveLocate"),
    fit: document.getElementById("homeLiveFit"),
    close: document.getElementById("homeLiveClose"),
    segmentSelect: document.getElementById("homeLiveTraSegments"),
    segmentAdd: document.getElementById("homeLiveTraSegmentAdd"),
    segmentAll: document.getElementById("homeLiveTraSegmentAll"),
    segmentClear: document.getElementById("homeLiveTraSegmentClear"),
    segmentList: document.getElementById("homeLiveTraSegmentList"),
    segmentCheckList: document.getElementById("homeLiveTraSegmentChecks"),
    segmentConfirm: document.getElementById("homeLiveTraSegmentConfirm"),
    segmentCancel: document.getElementById("homeLiveTraSegmentCancel"),
    trackInput: document.getElementById("homeLiveTrackInput"),
    trackAdd: document.getElementById("homeLiveTrackAdd"),
    trackClear: document.getElementById("homeLiveTrackClear"),
    trackConfirm: document.getElementById("homeLiveTrackConfirm"),
    trackCancel: document.getElementById("homeLiveTrackCancel"),
    trackList: document.getElementById("homeLiveTrackList"),
    modal: document.getElementById("homeLiveTrainModal"),
    modalFrame: document.getElementById("homeLiveDetailFrame"),
  };

  let leafletLoadPromise = null;
  let thsrRealScheduleLoadPromise = null;
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

  function readStringListStorage(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed)
        ? parsed.map((value) => String(value || "").trim()).filter(Boolean)
        : [];
    } catch (_) {
      return [];
    }
  }

  function writeStringListStorage(key, list) {
    try {
      const values = Array.from(new Set((Array.isArray(list) ? list : []).map((value) => String(value || "").trim()).filter(Boolean)));
      localStorage.setItem(key, JSON.stringify(values));
    } catch (_) {
    }
  }

  function hasStringListStorage(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (_) {
      return false;
    }
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
        (cached?.accessToken || cached?.token) &&
        cached?.clientId === config.clientId &&
        Number(cached?.expiresAt) > Date.now() + TOKEN_REFRESH_BUFFER_MS
      ) {
        return {
          token: cached.accessToken || cached.token,
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
        token,
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
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
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
    if (cached?.fresh && !(key.includes("home_live_schedule_thsr") && extractScheduleRows("thsr", cached.data).length === 0)) return cached.data;
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
    state.vectorRenderer = L.canvas({ padding: 0.5 });
    L.tileLayer(MAP_TILE_URL, {
      attribution: MAP_TILE_ATTRIBUTION,
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(state.map);
    state.map.on("dragstart zoomstart movestart", () => {
      state.userMoved = true;
      state.mapInteracting = true;
      el.map?.classList.add("is-map-interacting");
      state.trainCanvasLayer?.redraw?.();
    });
    state.map.on("dragend zoomend moveend", () => {
      state.mapInteracting = false;
      el.map?.classList.remove("is-map-interacting");
      updateMapDensityClasses();
      updateTrainMarkers({ force: true });
      state.trainCanvasLayer?.redraw?.();
      updateUserMarker();
    });
    window.setTimeout(() => state.map?.invalidateSize?.(), 120);
    return state.map;
  }

  function updateMapDensityClasses() {
    if (!el.map || !state.map) return;
    const zoom = Number(state.map.getZoom?.());
    const isHeavy = state.markerBindings.length > 80;
    const isLowZoom = Number.isFinite(zoom) && zoom < 9;
    el.map.classList.toggle("is-heavy-trains", isHeavy);
    el.map.classList.toggle("is-low-zoom", isLowZoom);
  }

  function getRailNetwork() {
    return window.RailNetwork || null;
  }

  function normalizeStation(system, name) {
    const text = String(name || "").trim();
    if (!text) return "";
    const network = getRailNetwork();
    if (system === "thsr") return network?.normalizeThsrStation?.(text) || text.replace(/臺/g, "台");
    const normalized = network?.normalizeTraStation?.(text) || text.replace(/台/g, "臺");
    return normalized === "臺北-環島" ? "臺北" : normalized;
  }

  function canonicalTaipeiText(name) {
    const text = String(name || "").trim().replace(/臺/g, "台");
    return text === "台北-環島" ? "台北" : text;
  }

  function formatStationDisplayName(system, name) {
    const text = String(name || "").trim();
    if (!text) return "";
    if (canonicalTaipeiText(text) === "台北") return "台北";
    return text;
  }

  function getSharedPhysicalStationKey(name) {
    const key = canonicalTaipeiText(name);
    return SHARED_PHYSICAL_STATIONS.has(key) ? key : "";
  }

  function getStationEventKey(system, stationName) {
    return `${system}|${normalizeStation(system, stationName)}`;
  }

  function getStationEventLookupKeys(system, stationName) {
    const sharedKey = getSharedPhysicalStationKey(stationName);
    if (!sharedKey) return [getStationEventKey(system, stationName)];
    return [
      getStationEventKey("tr", sharedKey),
      getStationEventKey("thsr", sharedKey),
    ];
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

  function getDirectStation(system, name) {
    const normalized = normalizeStation(system, name);
    const map = state.stations[system];
    const direct = map.get(normalized) || map.get(String(name || "").trim()) || null;
    if (direct) return direct;
    if (system !== "tr") return null;
    const supplemental = getRailNetwork()?.getTraSupplementalStationGeo?.(normalized);
    const lat = Number(supplemental?.lat);
    const lon = Number(supplemental?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      id: String(supplemental?.id || `manual-${normalized}`),
      name: String(supplemental?.name || normalized),
      normalized,
      lat,
      lon,
    };
  }

  function getSegmentDistanceForStation(system, stations, fromIndex, toIndex) {
    if (!Array.isArray(stations) || fromIndex === toIndex) return 0;
    const step = fromIndex < toIndex ? 1 : -1;
    const network = getRailNetwork();
    let total = 0;
    for (let index = fromIndex; index !== toIndex; index += step) {
      const from = stations[index];
      const to = stations[index + step];
      const distance = system === "tr"
        ? Number(network?.getTraAdjacentDistance?.(from, to))
        : 1;
      total += Number.isFinite(distance) && distance > 0 ? distance : 1;
    }
    return total;
  }

  function resolveVirtualStation(system, stationName) {
    if (system !== "tr") return null;
    const normalized = normalizeStation(system, stationName);
    if (!normalized) return null;
    const segments = getRailNetwork()?.getTraSegments?.() || [];
    for (const segment of segments) {
      const stations = Array.isArray(segment?.stations) ? segment.stations : [];
      const targetIndex = stations.findIndex((name) => normalizeStation(system, name) === normalized);
      if (targetIndex < 0) continue;

      let previous = null;
      for (let index = targetIndex - 1; index >= 0; index -= 1) {
        const geo = getDirectStation(system, stations[index]);
        if (geo) {
          previous = { index, geo };
          break;
        }
      }

      let next = null;
      for (let index = targetIndex + 1; index < stations.length; index += 1) {
        const geo = getDirectStation(system, stations[index]);
        if (geo) {
          next = { index, geo };
          break;
        }
      }

      if (!previous || !next || previous.index === next.index) continue;
      const totalDistance = getSegmentDistanceForStation(system, stations, previous.index, next.index);
      const beforeDistance = getSegmentDistanceForStation(system, stations, previous.index, targetIndex);
      const fallbackRatio = (targetIndex - previous.index) / (next.index - previous.index);
      const ratio = Number.isFinite(totalDistance) && totalDistance > 0 && Number.isFinite(beforeDistance)
        ? beforeDistance / totalDistance
        : fallbackRatio;
      return {
        id: `virtual-${normalized}`,
        name: normalized,
        normalized,
        lat: previous.geo.lat + (next.geo.lat - previous.geo.lat) * ratio,
        lon: previous.geo.lon + (next.geo.lon - previous.geo.lon) * ratio,
        virtual: true,
      };
    }
    return null;
  }

  function getStation(system, name) {
    const normalized = normalizeStation(system, name);
    const direct = getDirectStation(system, name);
    if (direct) return direct;
    const virtual = resolveVirtualStation(system, normalized);
    if (!virtual) return null;
    const map = state.stations[system];
    map.set(normalized, virtual);
    map.set(virtual.name, virtual);
    return virtual;
  }

  function getVisibleStationNames(system) {
    if (system !== "tr") return null;
    const network = getRailNetwork();
    const segments = typeof network?.getTraSegments === "function" ? network.getTraSegments() : [];
    const names = [];
    const allowed = new Set();
    segments.forEach((segment) => {
      (segment?.stations || []).forEach((stationName) => {
        const normalized = normalizeStation(system, stationName);
        if (!normalized || allowed.has(normalized)) return;
        allowed.add(normalized);
        names.push(normalized);
      });
    });
    return names.length ? names : null;
  }

  function getVisibleStationAllowSet(system) {
    const names = getVisibleStationNames(system);
    return names?.length ? new Set(names) : null;
  }

  async function loadStations(system, token) {
    const data = await cachedFetchJson(`home_live_station_${system}_v1`, STATION_CACHE_MS, SYSTEMS[system].stationUrl, token);
    const rows = system === "tr"
      ? (Array.isArray(data?.Stations) ? data.Stations : [])
      : (Array.isArray(data) ? data : (Array.isArray(data?.Stations) ? data.Stations : []));
    const map = new Map();
    const list = [];
    const listed = new Set();
    const visibleAllowSet = getVisibleStationAllowSet(system);
    const pushVisibleStation = (item) => {
      const key = normalizeStation(system, item?.normalized || item?.name);
      if (!key || listed.has(key)) return;
      list.push(item);
      listed.add(key);
    };
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
      map.set(normalized, item);
      map.set(name, item);
      if (system === "tr" || !visibleAllowSet || visibleAllowSet.has(normalized)) pushVisibleStation(item);
    });
    state.stations[system] = map;
    const visibleNames = getVisibleStationNames(system);
    if (visibleNames?.length) {
      visibleNames.forEach((stationName) => {
        if (map.has(stationName)) return;
        const item = getDirectStation(system, stationName) || resolveVirtualStation(system, stationName);
        if (!item) return;
        map.set(item.normalized, item);
        map.set(item.name, item);
        pushVisibleStation(item);
      });
    }
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

  function getDefaultTraSegmentIds() {
    return getRouteSegments("tr").map((segment) => segment.id).filter(Boolean);
  }

  function readHomeGeoSegmentIds() {
    return [];
  }

  function writeHomeGeoSegmentIds(ids) {
    try {
      localStorage.removeItem(HOME_GEO_SEGMENT_FILTER_KEY);
    } catch (_) {
    }
  }

  function readHomeTrackedTrainNos() {
    return readStringListStorage(HOME_TRACKED_TRAINS_KEY);
  }

  function writeHomeTrackedTrainNos(trainNos) {
    writeStringListStorage(HOME_TRACKED_TRAINS_KEY, trainNos);
  }

  function refreshHomeControlRefs() {
    el.segmentDetails = document.getElementById("homeLiveTraSegmentDetails") || el.segmentSelect?.closest?.(".home-live-popover") || null;
    el.segmentCheckList = document.getElementById("homeLiveTraSegmentChecks");
    el.segmentAll = document.getElementById("homeLiveTraSegmentAll");
    el.segmentClear = document.getElementById("homeLiveTraSegmentClear");
    el.segmentConfirm = document.getElementById("homeLiveTraSegmentConfirm");
    el.segmentCancel = document.getElementById("homeLiveTraSegmentCancel");
    el.segmentList = document.getElementById("homeLiveTraSegmentList");
    el.trackDetails = document.getElementById("homeLiveTrackDetails") || el.trackInput?.closest?.(".home-live-popover") || null;
    el.trackInput = document.getElementById("homeLiveTrackInput");
    el.trackAdd = document.getElementById("homeLiveTrackAdd");
    el.trackClear = document.getElementById("homeLiveTrackClear");
    el.trackConfirm = document.getElementById("homeLiveTrackConfirm");
    el.trackCancel = document.getElementById("homeLiveTrackCancel");
    el.trackList = document.getElementById("homeLiveTrackList");
  }

  function upgradeHomeControlUi() {
    const segmentDetails = el.segmentSelect?.closest?.(".home-live-popover");
    if (segmentDetails) {
      segmentDetails.id = "homeLiveTraSegmentDetails";
      const label = el.segmentSelect?.closest?.("label");
      if (label) label.style.display = "none";
      const panel = segmentDetails.querySelector(".home-live-popover-panel");
      if (panel && !document.getElementById("homeLiveTraSegmentChecks")) {
        const list = document.createElement("div");
        list.id = "homeLiveTraSegmentChecks";
        list.className = "home-live-check-list";
        panel.insertBefore(list, panel.querySelector(".home-live-popover-actions") || panel.firstChild);
      }
      const selectedList = document.getElementById("homeLiveTraSegmentList");
      if (selectedList) selectedList.remove();
      const actions = panel?.querySelector?.(".home-live-popover-actions");
      if (actions && !document.getElementById("homeLiveTraSegmentConfirm")) {
        actions.innerHTML = `
          <button type="button" class="home-live-mini-btn" id="homeLiveTraSegmentAll">全選</button>
          <button type="button" class="home-live-mini-btn" id="homeLiveTraSegmentClear">全部清除</button>
          <span class="home-live-action-spacer"></span>
          <button type="button" class="home-live-mini-btn" id="homeLiveTraSegmentCancel">取消</button>
          <button type="button" class="home-live-mini-btn primary" id="homeLiveTraSegmentConfirm">確認</button>
        `;
      }
    }
    const trackDetails = el.trackInput?.closest?.(".home-live-popover");
    if (trackDetails) {
      trackDetails.id = "homeLiveTrackDetails";
      const actions = trackDetails.querySelector(".home-live-popover-actions");
      if (actions && !document.getElementById("homeLiveTrackConfirm")) {
        actions.innerHTML = `
          <button type="button" class="home-live-mini-btn" id="homeLiveTrackAdd">加入清單</button>
          <button type="button" class="home-live-mini-btn" id="homeLiveTrackClear">全部清除</button>
          <span class="home-live-action-spacer"></span>
          <button type="button" class="home-live-mini-btn" id="homeLiveTrackCancel">取消</button>
          <button type="button" class="home-live-mini-btn primary" id="homeLiveTrackConfirm">確認</button>
        `;
      }
    }
    refreshHomeControlRefs();
  }

  function getSelectedTraSegments() {
    const selected = new Set(state.geoSegmentIds || []);
    return getRouteSegments("tr").filter((segment) => selected.has(segment.id));
  }

  function snapshotTouchesTraSegment(snapshot, segment) {
    if (snapshot?.system !== "tr") return false;
    const stationSet = new Set((segment?.stations || []).map((name) => normalizeStation("tr", name)).filter(Boolean));
    if (!stationSet.size) return false;
    const currentFrom = normalizeStation("tr", snapshot.currentFrom);
    const currentTo = normalizeStation("tr", snapshot.currentTo);
    const nextStation = normalizeStation("tr", snapshot.nextStation);
    if (stationSet.has(currentFrom) || stationSet.has(currentTo) || stationSet.has(nextStation)) return true;
    const position = Number(snapshot.positionIndex);
    return (snapshot.points || []).some((point) => {
      if (!stationSet.has(normalizeStation("tr", point?.station))) return false;
      const routeIndex = Number(point?.routeIndex);
      return !Number.isFinite(position) || !Number.isFinite(routeIndex) || Math.abs(routeIndex - position) <= 1.25;
    });
  }

  function findHomeTraSegmentForCoords(coords) {
    const normalized = normalizeGeoCoords(coords);
    if (!normalized) return null;
    let best = null;
    getRouteSegments("tr").forEach((segment) => {
      const stations = segment?.stations || [];
      for (let index = 0; index < stations.length - 1; index += 1) {
        const from = getStation("tr", stations[index]);
        const to = getStation("tr", stations[index + 1]);
        if (!from || !to) continue;
        const hit = projectGeoOnSegment(from, to, normalized);
        if (!hit) continue;
        const distanceMeters = Number(hit.distanceKm) * 1000;
        if (!Number.isFinite(distanceMeters)) continue;
        if (!best || distanceMeters < best.distanceMeters) {
          best = { segment, distanceMeters };
        }
      }
    });
    return best && best.distanceMeters <= 8000 ? best.segment : best?.segment || null;
  }

  function applyDefaultHomeSegmentFromLocation(coords, options = {}) {
    if (state.geoSegmentPreferenceSaved || (state.geoSegmentIds || []).length) return false;
    if (Array.isArray(state.geoSegmentDraftIds) && state.geoSegmentDraftIds.length) return false;
    const segment = findHomeTraSegmentForCoords(coords);
    if (!segment?.id) return false;
    const hadDraft = Array.isArray(state.geoSegmentDraftIds);
    setHomeSegmentIds([segment.id], { persist: false, render: options.render });
    if (hadDraft) setHomeSegmentDraftIds([segment.id]);
    return true;
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
        const displayName = formatStationDisplayName(system, rawName || name);
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

  function getScheduleUrls(system, date) {
    if (system === "tr") {
      return [
        SYSTEMS[system].scheduleUrl(date),
        `https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/DailyTimetable/TrainDate/${date}?%24format=JSON`,
        `https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/DailyTimetable/TrainDate/${date}?$format=JSON`,
      ];
    }
    if (system !== "thsr") return [SYSTEMS[system].scheduleUrl(date)];
    return [
      SYSTEMS[system].scheduleUrl(date),
      `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainDate/${date}?%24format=JSON`,
      `https://tdx.transportdata.tw/api/basic/v3/Rail/THSR/DailyTimetable/TrainDate/${date}?%24format=JSON`,
      `https://tdx.transportdata.tw/api/basic/v3/Rail/THSR/DailyTimetable/TrainDate/${date}?$format=JSON`,
      `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTrainTimetable/TrainDate/${date}?%24format=JSON`,
    ];
  }

  function extractScheduleRows(system, data) {
    const list = Array.isArray(data)
      ? data
      : (
        Array.isArray(data?.value)
          ? data.value
          : (
            Array.isArray(data?.records)
              ? data.records
              : (
                Array.isArray(data?.Records)
                  ? data.Records
                  : null
              )
          )
      );
    if (list) return list;
    if (system === "tr") {
      return Array.isArray(data?.TrainTimetables)
        ? data.TrainTimetables
        : (
          Array.isArray(data?.DailyTimetables)
            ? data.DailyTimetables
            : (Array.isArray(data?.DailyTrainTimetables) ? data.DailyTrainTimetables : [])
        );
    }
    return (
        Array.isArray(data?.TrainTimetables)
          ? data.TrainTimetables
          : (
            Array.isArray(data?.DailyTimetables)
              ? data.DailyTimetables
              : (
                Array.isArray(data?.DailyTrainTimetables)
                  ? data.DailyTrainTimetables
                  : (Array.isArray(data?.Timetables) ? data.Timetables : [])
              )
          )
      );
  }

  function getThsrPageScheduleCacheKey(date) {
    return `home_live_schedule_thsr_${date}_page_same_v2`;
  }

  function loadThsrRealScheduleScript() {
    if (typeof window.fetchRealData === "function" && typeof window.getAccessToken === "function") {
      return Promise.resolve();
    }
    if (thsrRealScheduleLoadPromise) return thsrRealScheduleLoadPromise;
    thsrRealScheduleLoadPromise = new Promise((resolve, reject) => {
      const finish = () => {
        if (typeof window.fetchRealData === "function") resolve();
        else reject(new Error("THSR page loader not ready"));
      };
      const existing = Array.from(document.scripts || []).find((script) =>
        String(script?.src || "").includes("thsr.real-schedule.js")
      );
      if (existing) {
        if (typeof window.fetchRealData === "function") {
          finish();
          return;
        }
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => reject(new Error("THSR page loader failed")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = THSR_REAL_SCHEDULE_SCRIPT_URL;
      script.charset = "UTF-8";
      script.async = true;
      script.onload = finish;
      script.onerror = () => reject(new Error("THSR page loader failed"));
      document.head.appendChild(script);
    }).catch((error) => {
      thsrRealScheduleLoadPromise = null;
      throw error;
    });
    return thsrRealScheduleLoadPromise;
  }

  function findThsrPageStopList(entry) {
    if (Array.isArray(entry)) return entry;
    if (!entry || typeof entry !== "object") return [];
    const values = Object.values(entry);
    return values.find((value) =>
      Array.isArray(value) &&
      value.length &&
      (Array.isArray(value[0]) || (value[0] && typeof value[0] === "object"))
    ) || [];
  }

  function convertThsrPageStop(stop, index) {
    if (Array.isArray(stop)) {
      const stationName = String(stop[0] || "").trim();
      const departure = String(stop[1] || "").trim();
      const arrival = String(stop[2] || "").trim();
      if (!stationName || (!arrival && !departure)) return null;
      return {
        StationName: { Zh_tw: stationName },
        ArrivalTime: arrival || departure,
        DepartureTime: departure || arrival,
        StopSequence: index + 1,
      };
    }
    const stationName = readZh(stop?.StationName) || String(stop?.name || stop?.station || "").trim();
    const arrival = String(stop?.ArrivalTime || stop?.arrival || "").trim();
    const departure = String(stop?.DepartureTime || stop?.departure || "").trim();
    if (!stationName || (!arrival && !departure)) return null;
    return {
      ...stop,
      StationName: stop?.StationName || { Zh_tw: stationName },
      ArrivalTime: arrival || departure,
      DepartureTime: departure || arrival,
      StopSequence: Number(stop?.StopSequence ?? stop?.stopSequence ?? index + 1),
    };
  }

  function convertThsrPageScheduleToRows(schedule) {
    if (Array.isArray(schedule)) return schedule;
    if (!schedule || typeof schedule !== "object") return [];
    return Object.entries(schedule)
      .map(([trainNo, entry]) => {
        const stopTimes = findThsrPageStopList(entry)
          .map(convertThsrPageStop)
          .filter(Boolean);
        const normalizedTrainNo = String(trainNo || entry?.TrainNo || "").trim();
        if (!normalizedTrainNo || stopTimes.length < 2) return null;
        return {
          DailyTrainInfo: {
            TrainNo: normalizedTrainNo,
            TrainTypeName: { Zh_tw: "THSR" },
          },
          StopTimes: stopTimes,
        };
      })
      .filter(Boolean);
  }

  async function fetchThsrScheduleRowsFromPageScript(date) {
    const cacheKey = getThsrPageScheduleCacheKey(date);
    const cached = readCache(cacheKey, THSR_PAGE_SCHEDULE_CACHE_MS);
    try {
      await loadThsrRealScheduleScript();
      if (typeof window.fetchRealData !== "function") throw new Error("THSR fetchRealData missing");
      const schedule = await window.fetchRealData(date);
      const rows = convertThsrPageScheduleToRows(schedule || window.trainSchedule || {});
      if (rows.length) {
        writeCache(cacheKey, rows);
        return rows;
      }
      const cachedRows = extractScheduleRows("thsr", cached?.data);
      return cachedRows.length ? cachedRows : rows;
    } catch (error) {
      const cachedRows = extractScheduleRows("thsr", cached?.data);
      if (cachedRows.length) return cachedRows;
      throw error;
    }
  }

  async function fetchThsrDirectRowsLikePage(date, token) {
    const url = `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainDate/${date}?$format=JSON`;
    let response = await fetchWithTimeout(url, {
      headers: buildTdxHeaders(token),
      timeoutMs: FETCH_TIMEOUT_MS,
    });
    if ((response.status === 401 || response.status === 403) && typeof getTdxToken === "function") {
      const freshToken = await getTdxToken(true).catch(() => "");
      if (freshToken) {
        response = await fetchWithTimeout(url, {
          headers: buildTdxHeaders(freshToken),
          timeoutMs: FETCH_TIMEOUT_MS,
        });
      }
    }
    if (!response.ok) throw new Error(`THSR timetable ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : extractScheduleRows("thsr", data);
  }

  async function fetchThsrScheduleRowsLikeThsrPage(date, token) {
    const cacheKey = getThsrPageScheduleCacheKey(date);
    try {
      const pageRows = await fetchThsrScheduleRowsFromPageScript(date);
      if (pageRows.length) return pageRows;
    } catch (error) {
      console.warn("home live THSR script fetch failed", error);
    }
    const rows = await fetchThsrDirectRowsLikePage(date, token);
    if (rows.length) {
      writeCache(cacheKey, rows);
      return rows;
    }
    const cached = readCache(cacheKey, THSR_PAGE_SCHEDULE_CACHE_MS);
    const cachedRows = extractScheduleRows("thsr", cached?.data);
    return cachedRows.length ? cachedRows : rows;
  }

  async function fetchScheduleRows(system, date, token) {
    if (system === "thsr") {
      try {
        const rows = await fetchThsrScheduleRowsLikeThsrPage(date, token);
        if (rows.length) return rows;
      } catch (error) {
        console.warn("home live THSR page-compatible fetch failed", error);
      }
    }
    const urls = getScheduleUrls(system, date);
    let lastError = null;
    let lastRows = [];
    for (let index = 0; index < urls.length; index += 1) {
      try {
        const cacheMs = system === "thsr" ? THSR_PAGE_SCHEDULE_CACHE_MS : SCHEDULE_CACHE_MS;
        const data = await cachedFetchJson(`home_live_schedule_${system}_${date}_v2_${index}`, cacheMs, urls[index], token);
        const rows = extractScheduleRows(system, data);
        lastRows = rows;
        if (rows.length || index === urls.length - 1) return rows;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    return lastRows;
  }

  async function fetchScheduleRowsSafe(system, date, token) {
    try {
      const rows = await fetchScheduleRows(system, date, token);
      return { date, rows: rows || [], error: "" };
    } catch (error) {
      console.warn(`home live schedule date failed: ${system} ${date}`, error);
      return { date, rows: [], error: error?.message || String(error || "unknown") };
    }
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

  function getMapTrainColor(snapshot) {
    if (snapshot?.system === "tr") return getTrainColor(snapshot);
    const systemColors = MAP_TRAIN_COLORS[snapshot?.system] || MAP_TRAIN_COLORS.tr;
    return systemColors[snapshot?.direction] || systemColors.default || "#111827";
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

  function toLatLonArray(value) {
    if (Array.isArray(value)) return [Number(value[0]), Number(value[1])];
    return [Number(value?.lat), Number(value?.lon ?? value?.lng)];
  }

  function projectGeoOnSegment(from, to, geo) {
    const [fromLat, fromLon] = toLatLonArray(from);
    const [toLat, toLon] = toLatLonArray(to);
    const [geoLat, geoLon] = toLatLonArray(geo);
    if (![fromLat, fromLon, toLat, toLon, geoLat, geoLon].every(Number.isFinite)) return null;
    const avgLatRad = ((fromLat + toLat + geoLat) / 3) * Math.PI / 180;
    const scaleX = 111.32 * Math.cos(avgLatRad);
    const ax = (fromLon - geoLon) * scaleX;
    const ay = (fromLat - geoLat) * 111.32;
    const bx = (toLon - geoLon) * scaleX;
    const by = (toLat - geoLat) * 111.32;
    const vx = bx - ax;
    const vy = by - ay;
    const lengthSq = vx * vx + vy * vy;
    if (lengthSq <= 0) return { latLng: [fromLat, fromLon], distanceKm: Math.hypot(ax, ay) };
    const ratio = clamp((-(ax * vx + ay * vy)) / lengthSq, 0, 1);
    const projectedLat = fromLat + (toLat - fromLat) * ratio;
    const projectedLon = fromLon + (toLon - fromLon) * ratio;
    const px = ax + vx * ratio;
    const py = ay + vy * ratio;
    return {
      latLng: [projectedLat, projectedLon],
      distanceKm: Math.hypot(px, py),
    };
  }

  function findNearestPointOnRouteLines(routeLines, geo) {
    let best = null;
    (routeLines || []).forEach((line) => {
      const points = (line || []).filter(Boolean);
      for (let index = 0; index < points.length - 1; index += 1) {
        const hit = projectGeoOnSegment(points[index], points[index + 1], geo);
        if (!hit) continue;
        if (!best || hit.distanceKm < best.distanceKm) best = hit;
      }
    });
    return best;
  }

  function getSnappedStationLatLng(system, station) {
    const fallback = [station.lat, station.lon];
    const hit = findNearestPointOnRouteLines(state.routeLines[system] || [], station);
    const maxDistanceKm = system === "thsr" ? 10 : 4;
    return hit && hit.distanceKm <= maxDistanceKm ? hit.latLng : fallback;
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
    const sharedMode = window.RailLiveTrackerCore?.getSnapshotAnimationMode?.(snapshot);
    if (sharedMode?.type) return sharedMode;
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

  function getTravelText(snapshot) {
    const start = Number(snapshot?.journeyFirstMinute ?? snapshot?.firstMinute);
    const end = Number(snapshot?.journeyLastMinute ?? snapshot?.lastMinute);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "--";
    const minutes = Math.max(0, Math.round(end - start));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours ? `${hours}小時${mins ? ` ${mins}分` : ""}` : `${mins}分`;
  }

  function getStopWeatherTimeMs(originDate, absMinute) {
    const match = String(originDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match || !Number.isFinite(absMinute)) return NaN;
    const base = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
    return base.getTime() + Number(absMinute) * 60000;
  }

  function getModalTone(stateText) {
    const text = String(stateText || "");
    if (/已過站|已通過|已到終點|通過$/.test(text)) return "muted";
    if (/晚|延誤/.test(text)) return "danger";
    if (/即將|下一|停靠中|尚未/.test(text)) return "success";
    return "neutral";
  }

  function buildModalStopRows(runtime, showPassStops) {
    const now = Number(runtime?.nowMinute);
    const stopRows = (runtime?.stopDetails || []).map((stop, index, rows) => {
      const arrAbs = getStopArrivalMinute(stop);
      const depAbs = getStopDepartureMinute(stop);
      const isOrigin = index === 0;
      const isTerminal = index === rows.length - 1;
      const eventAbs = isTerminal ? arrAbs : (depAbs ?? arrAbs);
      let stateText = "停靠";
      if (isOrigin && Number.isFinite(depAbs) && Number.isFinite(now) && now < depAbs) {
        stateText = depAbs - now <= UPCOMING_WINDOW ? "即將發車" : "尚未發車";
      } else if (!isTerminal && Number.isFinite(arrAbs) && Number.isFinite(depAbs) && Number.isFinite(now) && now >= arrAbs && now < depAbs) {
        stateText = "停靠中";
      } else if (isTerminal && Number.isFinite(arrAbs) && Number.isFinite(now) && now >= arrAbs) {
        stateText = "已到終點";
      } else if (Number.isFinite(eventAbs) && Number.isFinite(now) && eventAbs < now) {
        stateText = "已過站";
      } else if (stop.name === runtime.nextStopStation || stop.name === runtime.nextStation) {
        stateText = isOrigin ? "即將發車" : "下一停靠";
      }
      return {
        station: stop.name,
        arrAbs,
        depAbs,
        eventAbs,
        isPass: false,
        isOrigin,
        isTerminal,
        isCurrent: stateText === "停靠中",
        isActive: /即將|下一|停靠中|尚未/.test(stateText),
        isPassed: /已過站|已到終點/.test(stateText),
        stateText,
      };
    });
    if (!showPassStops) return stopRows;
    const stopKey = new Set(stopRows.map((row) => `${row.station}|${Math.round(Number(row.eventAbs) || 0)}`));
    const passRows = (runtime?.points || [])
      .filter((point) => !point?.isStop && Number.isFinite(point?.minute))
      .map((point) => {
        const isPassed = Number.isFinite(now) && point.minute < now;
        const isActive = !isPassed && Number.isFinite(now) && point.minute - now <= STATION_ALERT_WINDOW && point.minute >= now;
        return {
          station: point.station,
          arrAbs: null,
          depAbs: point.minute,
          eventAbs: point.minute,
          isPass: true,
          isOrigin: false,
          isTerminal: false,
          isCurrent: false,
          isActive,
          isPassed,
          stateText: isPassed ? "已通過" : (isActive ? "即將通過" : "通過"),
        };
      })
      .filter((row) => !stopKey.has(`${row.station}|${Math.round(Number(row.eventAbs) || 0)}`));
    return stopRows.concat(passRows).sort((a, b) => {
      const aAbs = Number.isFinite(a.eventAbs) ? a.eventAbs : 999999;
      const bAbs = Number.isFinite(b.eventAbs) ? b.eventAbs : 999999;
      return aAbs - bAbs;
    });
  }

  function renderModalTime(value, empty = "--") {
    return Number.isFinite(value) ? escapeHtml(formatMinute(value)) : escapeHtml(empty);
  }

  function renderModalStopTable(runtime, showPassStops) {
    const rows = buildModalStopRows(runtime, showPassStops);
    return `
      <div class="modal-stop-table">
        <div class="modal-stop-head">
          <div></div>
          <div>站名</div>
          <div>到達時間</div>
          <div>開車時間</div>
          <div>狀態</div>
        </div>
        ${rows.map((row, index) => {
          const classes = ["modal-stop-row"];
          if (row.isPassed) classes.push("is-passed");
          if (row.isPass) classes.push("is-pass");
          if (row.isCurrent) classes.push("is-current");
          if (row.isActive) classes.push("is-active");
          const inlineTag = row.isOrigin ? "起站" : (row.isTerminal ? "終點" : "");
          const arrHtml = row.isPass ? "--" : renderModalTime(row.arrAbs);
          const depHtml = renderModalTime(row.depAbs);
          const stationName = getDisplayStation(runtime.system, row.station);
          const weatherAbs = Number.isFinite(row.arrAbs) ? row.arrAbs : row.depAbs;
          const weatherTimeMs = getStopWeatherTimeMs(runtime.originDate || todayDateStr(), weatherAbs);
          const weatherKey = `home-live-modal-${runtime.system}-${runtime.trainNo}-${index}-${row.station || ""}-${Number.isFinite(weatherTimeMs) ? Math.round(weatherTimeMs) : ""}`;
          const weatherSlot = Number.isFinite(weatherTimeMs)
            ? `<span class="modal-stop-weather-slot rail-stop-weather-slot" data-stop-weather="1" data-weather-key="${escapeHtml(weatherKey)}" data-weather-station="${escapeHtml(stationName)}" data-weather-time-ms="${Math.round(weatherTimeMs)}" data-weather-passed="${row.isPassed ? "1" : "0"}"><span class="rail-stop-weather-chip" data-stop-weather-chip hidden></span></span>`
            : "";
          const weatherNote = Number.isFinite(weatherTimeMs)
            ? `<span class="modal-stop-state-text rail-stop-weather-note modal-stop-weather-note" data-stop-weather-note data-weather-key="${escapeHtml(weatherKey)}" data-weather-base-text="${escapeHtml(row.stateText)}">${escapeHtml(row.stateText)}</span>`
            : `<span class="modal-stop-state-text">${escapeHtml(row.stateText)}</span>`;
          const tone = getModalTone(row.stateText);
          return `
            <div class="${classes.join(" ")}">
              <div class="modal-stop-marker-col">
                <div class="modal-stop-marker">
                  <div class="modal-stop-dot"></div>
                  <div class="modal-stop-line"></div>
                </div>
              </div>
              <div class="modal-stop-station-cell">
                <div class="modal-stop-station-main"><span>${escapeHtml(stationName)}</span>${renderStationTransferBadges(runtime.system, row.station)}${inlineTag ? `<span class="modal-stop-inline-tag">${escapeHtml(inlineTag)}</span>` : ""}${weatherSlot}</div>
              </div>
              <div class="modal-stop-time-cell">
                <div class="modal-stop-time-main ${row.isPass ? "modal-stop-time-empty" : ""}">${arrHtml}</div>
              </div>
              <div class="modal-stop-time-cell">
                <div class="modal-stop-time-main">${depHtml}</div>
              </div>
              <div class="modal-stop-state modal-tone-${escapeHtml(tone)}">${weatherNote}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function buildDetailFrameUrl(snapshot) {
    const system = snapshot?.system === "thsr" ? "thsr" : "tr";
    const base = system === "thsr" ? "../thsr/thsr.html" : "../tr/tr.html";
    const originDate = snapshot?.originDate || todayDateStr();
    const params = new URLSearchParams({
      embed: "1",
      home_live_detail: "1",
      detailOnly: "1",
      detail: "1",
      train: String(snapshot?.trainNo || ""),
      trainNo: String(snapshot?.trainNo || ""),
      date: originDate,
      originDate,
    });
    return `${base}?${params.toString()}`;
  }

  function showTrainDetailModal(snapshot) {
    if (!snapshot?.trainNo || !el.modal || !el.modalFrame) return;
    el.modalFrame.src = buildDetailFrameUrl(snapshot);
    el.modal.classList.remove("hidden");
    el.modal.setAttribute("aria-hidden", "false");
  }

  function closeTrainDetailModal() {
    el.modal?.classList.add("hidden");
    el.modal?.setAttribute("aria-hidden", "true");
    if (el.modalFrame) el.modalFrame.src = "about:blank";
  }

  function getDisplayStation(system, station) {
    const found = getStation(system, station);
    return formatStationDisplayName(system, found?.name || station || "--");
  }

  function getCanvasLabelPlacement(angle, textWidth) {
    const normalized = ((Number(angle) || 0) % 360 + 360) % 360;
    if (normalized >= 45 && normalized < 135) return { x: -textWidth / 2, y: 27, align: "left" };
    if (normalized >= 135 && normalized < 225) return { x: 16, y: 4, align: "left" };
    if (normalized >= 225 && normalized < 315) return { x: -textWidth / 2, y: -18, align: "left" };
    return { x: -textWidth - 16, y: 4, align: "left" };
  }

  function parseCanvasColor(color) {
    const value = String(color || "").trim();
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const raw = hex[1].length === 3 ? hex[1].split("").map((part) => part + part).join("") : hex[1];
      return [
        parseInt(raw.slice(0, 2), 16) / 255,
        parseInt(raw.slice(2, 4), 16) / 255,
        parseInt(raw.slice(4, 6), 16) / 255,
        1,
      ];
    }
    return [0.07, 0.09, 0.15, 1];
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }

  function createTrainWebGLProgram(gl) {
    const vertex = createShader(gl, gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      uniform vec2 u_resolution;
      void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 clipSpace = zeroToOne * 2.0 - 1.0;
        gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
      }
    `);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform vec4 u_color;
      void main() {
        gl_FragColor = u_color;
      }
    `);
    if (!vertex || !fragment) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    return {
      program,
      position: gl.getAttribLocation(program, "a_position"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      color: gl.getUniformLocation(program, "u_color"),
      buffer: gl.createBuffer(),
    };
  }

  function pushRotatedTriangle(vertices, x, y, angle) {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    [[0, -10], [9, 9], [-9, 9]].forEach(([localX, localY]) => {
      vertices.push(
        x + localX * cos - localY * sin,
        y + localX * sin + localY * cos
      );
    });
  }

  function drawTrainTrianglesWebGL(gl, programInfo, items, size) {
    if (!gl || !programInfo) return false;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(programInfo.program);
    gl.uniform2f(programInfo.resolution, size.x, size.y);
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffer);
    gl.enableVertexAttribArray(programInfo.position);
    gl.vertexAttribPointer(programInfo.position, 2, gl.FLOAT, false, 0, 0);
    const buckets = new Map();
    items.forEach((item) => {
      const color = item.color || "#111827";
      if (!buckets.has(color)) buckets.set(color, []);
      pushRotatedTriangle(buckets.get(color), item.x, item.y, Number(item.angle) || 0);
    });
    buckets.forEach((vertices, color) => {
      gl.uniform4fv(programInfo.color, parseCanvasColor(color));
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
    });
    return true;
  }

  function createTrainCanvasLayer() {
    const L = state.L || window.L;
    const TrainCanvasLayer = L.Layer.extend({
      initialize() {
        this.items = [];
        this.hits = [];
      },
      onAdd(map) {
        this.map = map;
        this.canvas = L.DomUtil.create("canvas", "home-live-train-webgl");
        this.labelCanvas = L.DomUtil.create("canvas", "home-live-train-canvas");
        [this.canvas, this.labelCanvas].forEach((canvas) => {
          canvas.style.position = "absolute";
          canvas.style.left = "0";
          canvas.style.top = "0";
          canvas.style.pointerEvents = "none";
        });
        const pane = map.getPane("homeLiveTrainCanvasPane") || map.createPane("homeLiveTrainCanvasPane");
        pane.style.zIndex = "650";
        pane.style.pointerEvents = "none";
        pane.appendChild(this.canvas);
        pane.appendChild(this.labelCanvas);
        this.gl = this.canvas.getContext("webgl", { alpha: true, antialias: true, depth: false, stencil: false })
          || this.canvas.getContext("experimental-webgl", { alpha: true, antialias: true, depth: false, stencil: false });
        this.webglProgram = this.gl ? createTrainWebGLProgram(this.gl) : null;
        map.on("resize move zoom viewreset zoomend moveend", this.redraw, this);
        map.on("click", this.handleClick, this);
        this.redraw();
      },
      onRemove(map) {
        map.off("resize move zoom viewreset zoomend moveend", this.redraw, this);
        map.off("click", this.handleClick, this);
        this.canvas?.remove?.();
        this.labelCanvas?.remove?.();
        this.canvas = null;
        this.labelCanvas = null;
        this.gl = null;
        this.webglProgram = null;
        this.map = null;
        this.hits = [];
      },
      setItems(items) {
        this.items = Array.isArray(items) ? items : [];
        this.redraw();
      },
      resizeCanvas(size) {
        const ratio = Math.max(1, window.devicePixelRatio || 1);
        const width = Math.max(1, Math.round(size.x));
        const height = Math.max(1, Math.round(size.y));
        [this.canvas, this.labelCanvas].forEach((canvas) => {
          if (!canvas) return;
          if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
          if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        });
        const ctx = this.labelCanvas.getContext("2d");
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        return ctx;
      },
      redraw() {
        if (!this.map || !this.canvas || !this.labelCanvas) return;
        const size = this.map.getSize();
        this.topLeft = this.map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this.canvas, this.topLeft);
        L.DomUtil.setPosition(this.labelCanvas, this.topLeft);
        const ctx = this.resizeCanvas(size);
        ctx.clearRect(0, 0, size.x, size.y);
        this.hits = [];
        const triangles = [];
        const hideLabels = state.mapInteracting || (this.items.length > 80 && Number(this.map.getZoom?.()) < 9);
        ctx.font = "950 13px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.lineJoin = "round";
        this.items.forEach((item) => {
          if (!item?.latLng) return;
          const point = this.map.latLngToLayerPoint(item.latLng).subtract(this.topLeft);
          if (point.x < -90 || point.y < -90 || point.x > size.x + 90 || point.y > size.y + 90) return;
          const angle = Number(item.angle) || 0;
          triangles.push({ x: point.x, y: point.y, angle, color: item.color || "#111827" });
          if (item.active) {
            ctx.save();
            ctx.strokeStyle = item.color || "#111827";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 13, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          const hit = { item, x: point.x - 16, y: point.y - 16, w: 32, h: 32 };
          if (!hideLabels && item.label) {
            const metrics = ctx.measureText(item.label);
            const textWidth = Math.ceil(metrics.width);
            const label = getCanvasLabelPlacement(angle, textWidth);
            const textX = point.x + label.x;
            const textY = point.y + label.y;
            ctx.save();
            ctx.font = "950 13px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
            ctx.textBaseline = "middle";
            ctx.textAlign = label.align;
            ctx.fillStyle = "#0f172a";
            ctx.fillText(item.label, textX, textY);
            if (item.active) {
              ctx.strokeStyle = item.color || "#111827";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(textX, textY + 9);
              ctx.lineTo(textX + textWidth, textY + 9);
              ctx.stroke();
            }
            ctx.restore();
            const right = Math.max(hit.x + hit.w, textX + textWidth + 4);
            const bottom = Math.max(hit.y + hit.h, textY + 14);
            hit.x = Math.min(hit.x, textX - 4);
            hit.y = Math.min(hit.y, textY - 14);
            hit.w = right - hit.x;
            hit.h = bottom - hit.y;
          }
          this.hits.push(hit);
        });
        if (!drawTrainTrianglesWebGL(this.gl, this.webglProgram, triangles, size)) {
          ctx.save();
          ctx.globalCompositeOperation = "destination-over";
          triangles.forEach((item) => {
            ctx.save();
            ctx.translate(item.x, item.y);
            ctx.rotate((Number(item.angle) || 0) * Math.PI / 180);
            ctx.fillStyle = item.color || "#111827";
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(9, 9);
            ctx.lineTo(-9, 9);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          });
          ctx.restore();
        }
      },
      handleClick(event) {
        if (!this.map || !this.hits.length) return;
        const topLeft = this.topLeft || this.map.containerPointToLayerPoint([0, 0]);
        const point = this.map.latLngToLayerPoint(event.latlng).subtract(topLeft);
        for (let index = this.hits.length - 1; index >= 0; index -= 1) {
          const hit = this.hits[index];
          if (point.x < hit.x || point.x > hit.x + hit.w || point.y < hit.y || point.y > hit.y + hit.h) continue;
          selectTrain(hit.item.snapshot);
          if (event.originalEvent) L.DomEvent.stop(event.originalEvent);
          break;
        }
      },
    });
    return new TrainCanvasLayer();
  }

  function getCanvasTrainItems() {
    return state.markerBindings
      .filter((binding) => binding?.placement?.latLng)
      .map((binding) => ({
        key: binding.snapshot.key,
        snapshot: binding.snapshot,
        latLng: binding.placement.latLng,
        angle: Number(binding.placement.angle) || 0,
        color: getMapTrainColor(binding.snapshot),
        label: `${binding.snapshot.trainNo} ${binding.snapshot.type}`.trim(),
        active: binding.snapshot.key === state.activeKey,
      }));
  }

  function refreshTrainCanvas() {
    state.trainCanvasLayer?.setItems?.(getCanvasTrainItems());
  }

  function selectTrain(snapshot) {
    state.activeKey = snapshot.key;
    const placement = getPlacement(snapshot);
    const binding = state.markerBindings.find((item) => item.snapshot?.key === snapshot.key);
    if (binding && placement?.latLng) binding.placement = placement;
    refreshTrainCanvas();
    if (state.map && placement?.latLng && placement?.runtime) {
      state.map.openPopup(buildPopupHtml(snapshot, placement.runtime), placement.latLng, { maxWidth: 280 });
    }
  }

  function clearMarkers() {
    if (state.trainCanvasLayer) {
      state.trainCanvasLayer.remove();
      state.trainCanvasLayer = null;
    }
    state.markers.forEach((marker) => marker.remove());
    state.markers.clear();
    state.markerBindings = [];
    state.stepCache.clear();
  }

  function renderMarkers() {
    clearMarkers();
    state.lastMarkerUpdateAt = 0;
    state.trainCanvasLayer = createTrainCanvasLayer().addTo(state.map);
    (state.displaySnapshots || state.snapshots).forEach((snapshot) => {
      const placement = getPlacement(snapshot);
      if (!placement?.latLng) return;
      state.markerBindings.push({ snapshot, placement });
    });
    refreshTrainCanvas();
    updateMapDensityClasses();
  }

  function pruneCompletedHomeTrackedTrains(snapshots) {
    if (!state.trackedTrainNos.length) return;
    const arrived = new Set((snapshots || [])
      .filter((snapshot) => snapshot?.system === "tr" && snapshot?.state === "arrived")
      .map((snapshot) => String(snapshot.trainNo || "").trim().toUpperCase())
      .filter(Boolean));
    const completionMap = state.trackedTrainCompletionMap instanceof Map ? state.trackedTrainCompletionMap : new Map();
    const next = state.trackedTrainNos.filter((trainNo) => {
      const key = String(trainNo || "").trim().toUpperCase();
      if (!key) return false;
      if (arrived.has(key)) return false;
      const completion = completionMap.get(key);
      if (completion?.matched && completion.allCompleted) return false;
      return true;
    });
    if (next.length === state.trackedTrainNos.length) return;
    state.trackedTrainNos = next;
    if (Array.isArray(state.trackedTrainDraftNos)) {
      const keep = new Set(next.map((trainNo) => String(trainNo || "").trim().toUpperCase()).filter(Boolean));
      state.trackedTrainDraftNos = state.trackedTrainDraftNos.filter((trainNo) => keep.has(String(trainNo || "").trim().toUpperCase()));
    }
    writeHomeTrackedTrainNos(next);
    renderHomeTrackedTrainChips();
  }

  function applyHomeTrainFilters(snapshots) {
    const list = Array.isArray(snapshots) ? snapshots : [];
    const tracked = new Set((state.trackedTrainNos || []).map((trainNo) => String(trainNo || "").trim().toUpperCase()).filter(Boolean));
    const selectedSegments = getSelectedTraSegments();
    const allTraSegmentCount = getRouteSegments("tr").length;
    return list.filter((snapshot) => {
      if (snapshot?.system !== "tr") return true;
      const trainNo = String(snapshot.trainNo || "").trim().toUpperCase();
      if (tracked.has(trainNo)) return true;
      if (!selectedSegments.length) return false;
      if (allTraSegmentCount > 0 && selectedSegments.length >= allTraSegmentCount) return true;
      return selectedSegments.some((segment) => snapshotTouchesTraSegment(snapshot, segment));
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
    const label = getDisplayStation(system, station.name);
    return `<button type="button" aria-label="${escapeHtml(label)}站">${escapeHtml(label)}${badges}</button>`;
  }

  function pushStationEvent(map, system, stationName, event) {
    if (!stationName) return;
    const stationKey = getStationEventKey(system, stationName);
    if (!map.has(stationKey)) map.set(stationKey, []);
    const list = map.get(stationKey);
    const key = `${system}|${event.trainNo}|${event.originDate || ""}|${event.kind}|${event.station}`;
    const existingIndex = list.findIndex((item) => `${item.system}|${item.trainNo}|${item.originDate || ""}|${item.kind}|${item.station}` === key);
    if (existingIndex >= 0) {
      const current = list[existingIndex];
      const priority = window.RailLiveTrackerCore?.getSnapshotPriority;
      const currentPriority = typeof priority === "function" ? priority(current?.snapshot) : 0;
      const nextPriority = typeof priority === "function" ? priority(event?.snapshot) : 0;
      if (
        nextPriority > currentPriority ||
        (nextPriority === currentPriority && Number(event.timeMinute) < Number(current.timeMinute))
      ) {
        list[existingIndex] = { ...event, system };
      }
      return;
    }
    list.push({ ...event, system });
  }

  function buildStationEventMap(snapshots) {
    const coreBuildStationEventMap = window.RailLiveTrackerCore?.buildStationEventMap;
    if (typeof coreBuildStationEventMap === "function") {
      const nowMinute = nowExactMinute();
      const merged = new Map();
      Object.keys(SYSTEMS).forEach((system) => {
        const systemSnapshots = (snapshots || [])
          .filter((snapshot) => snapshot?.system === system)
          .map((snapshot) => updateSnapshotRuntime(snapshot, nowMinute));
        const segmentStations = (state.stationLists[system] || []).map((station) => normalizeStation(system, station.name)).filter(Boolean);
        const systemEvents = coreBuildStationEventMap(systemSnapshots, segmentStations);
        systemEvents.forEach((list, stationName) => {
          (list || []).forEach((event) => pushStationEvent(merged, system, stationName, event));
        });
      });
      merged.forEach((list) => list.sort((a, b) => a.timeMinute - b.timeMinute || String(a.trainNo).localeCompare(String(b.trainNo), "zh-Hant", { numeric: true })));
      return merged;
    }
    const map = new Map();
    (snapshots || []).forEach((snapshot) => {
      const runtime = updateSnapshotRuntime(snapshot, nowExactMinute());
      if (
        runtime.state === "upcoming" &&
        runtime.startsAtJourneyOrigin &&
        Number.isFinite(runtime.originEventMinute) &&
        runtime.originEventMinute - runtime.nowMinute <= STATION_ALERT_WINDOW
      ) {
        pushStationEvent(map, runtime.system, runtime.currentFrom, {
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
          pushStationEvent(map, runtime.system, stop.name, {
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
          pushStationEvent(map, runtime.system, stop.name, {
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
          pushStationEvent(map, runtime.system, point.station, {
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
    const events = getStationEventLookupKeys(system, stationName)
      .flatMap((key) => state.stationEvents.get(key) || []);
    return events
      .sort((a, b) => a.timeMinute - b.timeMinute || String(a.trainNo).localeCompare(String(b.trainNo), "zh-Hant", { numeric: true }))
      .slice(0, 8);
  }

  function buildStationPopupHtml(system, station) {
    const badges = renderStationTransferBadges(system, station.name);
    const events = getStationEvents(system, station.name);
    const stationLabel = getDisplayStation(system, station.name);
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
        <h3>${escapeHtml(stationLabel)}${badges}</h3>
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
    const renderedSharedStations = new Set();
    Object.keys(SYSTEMS).forEach((system) => {
      const color = SYSTEMS[system].lineColor;
      (state.routeLines[system] || []).forEach((line) => {
        if (!Array.isArray(line) || line.length < 2) return;
        const layer = L.polyline(line, {
          color,
          weight: system === "thsr" ? 4 : 3,
          opacity: system === "thsr" ? .74 : .66,
          renderer: state.vectorRenderer,
          interactive: false,
        }).addTo(state.map);
        state.routeLayers.push(layer);
      });
      state.stationLists[system].forEach((station) => {
        const sharedKey = getSharedPhysicalStationKey(station.name);
        if (sharedKey) {
          if (renderedSharedStations.has(sharedKey)) return;
          renderedSharedStations.add(sharedKey);
        }
        const events = getStationEvents(system, station.name);
        const isBusy = events.some((event) => event.kind === "停靠中" || event.kind === "已到終點");
        const isSoon = events.some((event) => event.kind !== "即將通過" && Number.isFinite(event.minutesAway) && event.minutesAway <= STATION_SOON_WINDOW);
        const hasAlert = events.length > 0;
        const stationColor = isBusy ? "#ef4444" : isSoon ? "#f97316" : hasAlert ? "#f59e0b" : color;
        const stationLatLng = getSnappedStationLatLng(system, station);
        const layer = L.circleMarker(stationLatLng, {
          radius: isBusy || isSoon ? 7.6 : hasAlert ? 6.8 : (system === "thsr" ? 6.2 : 5.8),
          color: stationColor,
          weight: isBusy || isSoon || hasAlert ? 3.4 : 2.6,
          fillColor: "#fff",
          fillOpacity: .92,
          opacity: isBusy || isSoon || hasAlert ? .95 : .75,
          renderer: state.vectorRenderer,
          interactive: true,
        }).addTo(state.map);
        layer.on("click", () => openStationPopup(system, station, layer));
        state.stationLayers.push(layer);
        const label = L.marker(stationLatLng, {
          icon: L.divIcon({
            className: `home-live-station-label ${hasAlert ? "has-alert" : ""} ${isBusy ? "is-busy" : ""} ${isSoon ? "is-soon" : ""}`,
            html: buildStationLabelHtml(system, station),
            iconSize: [1, 1],
            iconAnchor: [0, -8],
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
    state.markerBindings.forEach(({ placement }) => {
      if (placement?.latLng) bounds.extend(placement.latLng);
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

  function getMarkerUpdateInterval() {
    return state.markerBindings.length > 80 ? HEAVY_MARKER_UPDATE_MS : MARKER_UPDATE_MS;
  }

  function updateTrainMarkers(options = {}) {
    const force = !!options.force;
    if (state.mapInteracting && !force) return;
    const now = Date.now();
    if (!force && now - Number(state.lastMarkerUpdateAt || 0) < getMarkerUpdateInterval()) return;
    state.lastMarkerUpdateAt = now;
    const bounds = !force && state.map?.getBounds?.()?.pad ? state.map.getBounds().pad(0.35) : null;
    let changed = false;
    state.markerBindings.forEach((binding) => {
      const { snapshot } = binding;
      if (bounds && snapshot.key !== state.activeKey) {
        const current = binding.placement?.latLng;
        if (current && !bounds.contains(current)) return;
      }
      const placement = getPlacement(snapshot);
      if (placement?.latLng) {
        binding.placement = placement;
        changed = true;
      }
    });
    if (changed || force) refreshTrainCanvas();
  }

  function startAnimation() {
    if (state.animationFrame) window.cancelAnimationFrame(state.animationFrame);
    const tick = () => {
      updateTrainMarkers();
      if (!state.mapInteracting) updateUserMarker();
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
    applyDefaultHomeSegmentFromLocation(coords, { render: state.map && state.snapshots.length });
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
    const stats = {};
    const trackedTra = new Set((state.trackedTrainNos || []).map((trainNo) => String(trainNo || "").trim().toUpperCase()).filter(Boolean));
    const trackedCompletion = new Map();
    await Promise.all(Object.keys(SYSTEMS).map(async (system) => {
      const results = await Promise.all([
        fetchScheduleRowsSafe(system, prevDate, token),
        fetchScheduleRowsSafe(system, date, token),
      ]);
      const errors = results.map((result) => result.error).filter(Boolean);
      const scheduleRows = results.reduce((sum, result) => sum + (result.rows || []).length, 0);
      stats[system] = {
        scheduleRows,
        parsed: 0,
        visible: 0,
        missingStation: 0,
        failedParse: 0,
        error: scheduleRows ? "" : errors.join(" / "),
        partialError: scheduleRows && errors.length ? errors.join(" / ") : "",
      };
      rowsBySystem[system] = results.map((result) => ({
        date: result.date,
        rows: result.rows || [],
      }));
    }));
    const nowMinute = nowExactMinute();
    const snapshots = [];
    Object.keys(SYSTEMS).forEach((system) => {
      (rowsBySystem[system] || []).forEach((source) => {
        (source.rows || []).forEach((row) => {
          const entry = buildEntry(system, row, source.date, delayMaps);
          if (!entry) {
            if (stats[system]) stats[system].failedParse += 1;
            return;
          }
          if (stats[system]) stats[system].parsed += 1;
          if (system === "tr" && trackedTra.has(String(entry.trainNo || "").trim().toUpperCase())) {
            const key = String(entry.trainNo || "").trim().toUpperCase();
            const record = trackedCompletion.get(key) || { matched: true, allCompleted: true };
            record.matched = true;
            if (!(nowMinute > entry.lastMinute + STATION_ALERT_WINDOW)) record.allCompleted = false;
            trackedCompletion.set(key, record);
          }
          if (!isEntryVisible(entry, nowMinute)) return;
          if (!getStation(system, entry.firstStation) || !getStation(system, entry.lastStation)) {
            if (stats[system]) stats[system].missingStation += 1;
            return;
          }
          if (stats[system]) stats[system].visible += 1;
          snapshots.push(entry);
        });
      });
    });
    snapshots.sort((a, b) => {
      if (a.system !== b.system) return a.system === "thsr" ? -1 : 1;
      return a.trainNo.localeCompare(b.trainNo, "zh-Hant", { numeric: true });
    });
    state.trackedTrainCompletionMap = trackedCompletion;
    state.loadStats = stats;
    return snapshots;
  }

  function updateSubtitle() {
    const updated = new Date();
    setSubtitle(`自動更新 · ${String(updated.getHours()).padStart(2, "0")}:${String(updated.getMinutes()).padStart(2, "0")}`);
  }

  function buildHomeSegmentOptions() {
    const segments = getRouteSegments("tr");
    if (el.segmentSelect) {
      el.segmentSelect.innerHTML = segments
        .map((segment) => `<option value="${escapeHtml(segment.id)}">${escapeHtml(segment.title || segment.id)}</option>`)
        .join("");
    }
    if (el.segmentCheckList) {
      const networkGroups = getRailNetwork()?.getTraSegmentGroups?.() || [];
      const groups = networkGroups.length ? networkGroups : [{ title: "台鐵路段", segments }];
      el.segmentCheckList.innerHTML = groups
        .map((group) => `
          <div class="home-live-check-group">
            <div class="home-live-check-group-title">${escapeHtml(group.title || "台鐵路段")}</div>
            ${(group.segments || []).map((segment) => `
              <label class="home-live-check-row">
                <input type="checkbox" value="${escapeHtml(segment.id)}" data-home-segment-option>
                <span>${escapeHtml(segment.title || segment.id)}</span>
              </label>
            `).join("")}
          </div>
        `)
        .join("");
    }
  }

  function getHomeSegmentDraftIds() {
    return Array.isArray(state.geoSegmentDraftIds) ? state.geoSegmentDraftIds : state.geoSegmentIds || [];
  }

  function syncHomeSegmentSelect() {
    const selected = new Set(getHomeSegmentDraftIds());
    if (el.segmentSelect) {
      const firstAvailable = Array.from(el.segmentSelect.options).find((option) => !selected.has(option.value));
      if (firstAvailable) el.segmentSelect.value = firstAvailable.value;
    }
    Array.from(el.segmentCheckList?.querySelectorAll?.("[data-home-segment-option]") || []).forEach((checkbox) => {
      checkbox.checked = selected.has(checkbox.value);
    });
  }

  function renderHomeSegmentChips() {
    if (!el.segmentList) return;
    const map = new Map(getRouteSegments("tr").map((segment) => [segment.id, segment]));
    const list = getHomeSegmentDraftIds();
    el.segmentList.innerHTML = list.length
      ? list.map((id) => {
          const segment = map.get(id);
          return `<button type="button" class="home-live-track-chip" data-home-segment-remove="${escapeHtml(id)}">${escapeHtml(segment?.title || id)}<span>×</span></button>`;
        }).join("")
      : `<span class="home-live-track-empty">未選擇路段</span>`;
  }

  function setHomeSegmentIds(ids, options = {}) {
    const next = Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean)));
    const currentLength = Array.isArray(state.geoSegmentIds) ? state.geoSegmentIds.length : 0;
    if (next.length > 2 && next.length > currentLength && options.confirm !== false && !window.confirm("選擇超過兩個路段可能造成卡頓、耗電或發熱，是否繼續？")) return false;
    state.geoSegmentIds = next;
    state.geoSegmentDraftIds = null;
    state.geoSegmentPreferenceSaved = options.persist !== false;
    if (options.persist !== false) writeHomeGeoSegmentIds(next);
    syncHomeSegmentSelect();
    renderHomeSegmentChips();
    if (options.render !== false) refreshFilteredTrains();
    return true;
  }

  function setHomeSegmentDraftIds(ids) {
    state.geoSegmentDraftIds = Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean)));
    syncHomeSegmentSelect();
    renderHomeSegmentChips();
  }

  function prepareHomeSegmentDraft() {
    state.geoSegmentDraftIds = (state.geoSegmentIds || []).slice();
    syncHomeSegmentSelect();
    renderHomeSegmentChips();
  }

  function cancelHomeSegmentDraft() {
    state.geoSegmentDraftIds = null;
    syncHomeSegmentSelect();
    renderHomeSegmentChips();
    if (el.segmentDetails) el.segmentDetails.open = false;
  }

  function confirmHomeSegmentDraft() {
    if (!setHomeSegmentIds(getHomeSegmentDraftIds())) return;
    if (el.segmentDetails) el.segmentDetails.open = false;
  }

  function getHomeTrackDraftNos() {
    return Array.isArray(state.trackedTrainDraftNos) ? state.trackedTrainDraftNos : state.trackedTrainNos || [];
  }

  function renderHomeTrackedTrainChips() {
    if (!el.trackList) return;
    const list = getHomeTrackDraftNos();
    el.trackList.innerHTML = list.length
      ? list.map((trainNo) => `<button type="button" class="home-live-track-chip" data-home-track-remove="${escapeHtml(trainNo)}">${escapeHtml(trainNo)}<span>×</span></button>`).join("")
      : `<span class="home-live-track-empty">未追蹤</span>`;
  }

  function refreshFilteredTrains() {
    renderHomeSegmentChips();
    syncHomeSegmentSelect();
    state.displaySnapshots = applyHomeTrainFilters(state.snapshots);
    state.stationEvents = buildStationEventMap(state.displaySnapshots);
    renderRoutes();
    renderMarkers();
  }

  function addHomeTrackedTrain(trainNo) {
    const normalized = String(trainNo || "").trim().toUpperCase();
    if (!normalized) return;
    state.trackedTrainDraftNos = Array.from(new Set([...getHomeTrackDraftNos(), normalized]));
    if (el.trackInput) el.trackInput.value = "";
    renderHomeTrackedTrainChips();
  }

  function removeHomeTrackedTrain(trainNo) {
    const target = String(trainNo || "").trim().toUpperCase();
    state.trackedTrainDraftNos = getHomeTrackDraftNos().filter((item) => String(item || "").trim().toUpperCase() !== target);
    renderHomeTrackedTrainChips();
  }

  function clearHomeTrackedTrains() {
    state.trackedTrainDraftNos = [];
    renderHomeTrackedTrainChips();
  }

  function prepareHomeTrackDraft() {
    state.trackedTrainDraftNos = (state.trackedTrainNos || []).slice();
    if (el.trackInput) el.trackInput.value = "";
    renderHomeTrackedTrainChips();
  }

  function cancelHomeTrackDraft() {
    state.trackedTrainDraftNos = null;
    if (el.trackInput) el.trackInput.value = "";
    renderHomeTrackedTrainChips();
    if (el.trackDetails) el.trackDetails.open = false;
  }

  function confirmHomeTrackDraft() {
    state.trackedTrainNos = Array.from(new Set(getHomeTrackDraftNos().map((item) => String(item || "").trim().toUpperCase()).filter(Boolean)));
    state.trackedTrainDraftNos = null;
    writeHomeTrackedTrainNos(state.trackedTrainNos);
    if (el.trackInput) el.trackInput.value = "";
    renderHomeTrackedTrainChips();
    refreshFilteredTrains();
    if (el.trackDetails) el.trackDetails.open = false;
  }

  function showHomeGeoEntryPrompt() {
    if (state.geoEntryPromptShown) return;
    state.geoEntryPromptShown = true;
    window.alert("請先選擇台鐵路段或追蹤車次");
    if (el.segmentDetails) {
      el.segmentDetails.open = true;
      prepareHomeSegmentDraft();
    }
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
      applyDefaultHomeSegmentFromLocation(state.userLocation?.coords || readSharedGeo(), { render: false });
      await loadRouteLines(token);
      ensureMap();
      state.snapshots = await collectSnapshots(token);
      pruneCompletedHomeTrackedTrains(state.snapshots);
      state.displaySnapshots = applyHomeTrainFilters(state.snapshots);
      state.stationEvents = buildStationEventMap(state.displaySnapshots);
      renderRoutes();
      renderMarkers();
      updateSubtitle();
      updateUserMarker();
      fitFullRoute(false);
      startAnimation();
      scheduleRefresh();
      const thsrCount = state.snapshots.filter((snapshot) => snapshot.system === "thsr").length;
      const traCount = state.snapshots.filter((snapshot) => snapshot.system === "tr").length;
      const thsrStats = state.loadStats?.thsr || {};
      const thsrNote = thsrCount === 0
        ? `（班表 ${Number(thsrStats.scheduleRows || 0)} 筆、解析 ${Number(thsrStats.parsed || 0)} 筆、站點不符 ${Number(thsrStats.missingStation || 0)} 筆、解析失敗 ${Number(thsrStats.failedParse || 0)} 筆${thsrStats.error ? `、TDX 失敗 ${thsrStats.error}` : ""}${thsrStats.partialError ? "、部分日期失敗" : ""}）`
        : "";
      showStatus(`已更新 高鐵 ${thsrCount} 班${thsrNote}、台鐵 ${traCount} 班。`);
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
    el.modal?.addEventListener("click", (event) => {
      if (event.target === el.modal) closeTrainDetailModal();
    });
    window.addEventListener("message", (event) => {
      if (event.data?.type === "HOME_LIVE_DETAIL_CLOSE") closeTrainDetailModal();
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
    el.segmentDetails?.addEventListener("toggle", () => {
      if (el.segmentDetails.open) prepareHomeSegmentDraft();
      else state.geoSegmentDraftIds = null;
    });
    el.segmentCheckList?.addEventListener("change", () => {
      const ids = Array.from(el.segmentCheckList.querySelectorAll("[data-home-segment-option]"))
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);
      setHomeSegmentDraftIds(ids);
    });
    el.segmentAll?.addEventListener("click", () => {
      const ids = getDefaultTraSegmentIds();
      setHomeSegmentDraftIds(ids);
    });
    el.segmentClear?.addEventListener("click", () => {
      setHomeSegmentDraftIds([]);
    });
    el.segmentConfirm?.addEventListener("click", () => confirmHomeSegmentDraft());
    el.segmentCancel?.addEventListener("click", () => cancelHomeSegmentDraft());
    el.segmentList?.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-home-segment-remove]");
      if (!button) return;
      const target = button.getAttribute("data-home-segment-remove");
      setHomeSegmentDraftIds(getHomeSegmentDraftIds().filter((id) => id !== target));
    });
    el.trackAdd?.addEventListener("click", () => addHomeTrackedTrain(el.trackInput?.value));
    el.trackClear?.addEventListener("click", () => clearHomeTrackedTrains());
    el.trackConfirm?.addEventListener("click", () => confirmHomeTrackDraft());
    el.trackCancel?.addEventListener("click", () => cancelHomeTrackDraft());
    el.trackDetails?.addEventListener("toggle", () => {
      if (el.trackDetails.open) prepareHomeTrackDraft();
      else state.trackedTrainDraftNos = null;
    });
    el.trackInput?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      addHomeTrackedTrain(el.trackInput.value);
    });
    el.trackList?.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-home-track-remove]");
      if (!button) return;
      removeHomeTrackedTrain(button.getAttribute("data-home-track-remove"));
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
    upgradeHomeControlUi();
    buildHomeSegmentOptions();
    state.geoSegmentIds = readHomeGeoSegmentIds();
    state.geoSegmentPreferenceSaved = false;
    state.trackedTrainNos = readHomeTrackedTrainNos();
    syncHomeSegmentSelect();
    renderHomeSegmentChips();
    renderHomeTrackedTrainChips();
    bindEvents();
    try {
      await loadLeaflet();
      ensureMap();
      ensureUserLocationTracking(false);
      showHomeGeoEntryPrompt();
      await loadData();
    } catch (error) {
      console.error("home live init failed", error);
      showStatus("地圖套件載入失敗，請確認網路可連線。", { sticky: true });
    }
  }

  init();
})();
