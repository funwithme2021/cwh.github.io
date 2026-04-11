(function () {
  const STYLE_ID = "rail-live-tracker-styles";
  const TAB_ID = "tab-live-tracker";
  const PANEL_ID = "panel-live-tracker";
  const ANCHOR_TAB_ID = "tab-operation-diagram";
  const ANCHOR_PANEL_ID = "panel-operation-diagram";
  const REFRESH_MS = 60000;
  const DELAY_REFRESH_MS = 30000;
  const UPCOMING_WINDOW = 10;
  const STATION_ALERT_WINDOW = 10;
  const STATION_SOON_WINDOW = 3;
  const MAP_PADDING_Y = 36;
  const SHARED_GEO_KEY = "home_shared_geo_snapshot_v1";
  const USER_LOCATION_ENABLED_KEY = "rail_live_user_location_enabled_v1";
  const USER_LOCATION_MAX_FAR_KM = 8;
  const TRACKER_STATES = new Map();
  const TRA_TYPE_COLORS = {
    "新自強": "#7c3aed",
    "普悠瑪": "#db2777",
    "太魯閣": "#2563eb",
    "自強號": "#e11d48",
    "自強號(新)": "#b45309",
    "莒光號": "#ea580c",
    "莒光號專開列車": "#b45309",
    "復興號": "#0284c7",
    "區間快": "#16a34a",
    "區間車": "#000000",
    "普快車": "#0f766e",
    "柴快車": "#7c2d12",
    "柴油客車": "#92400e",
    "普通車": "#1d4ed8",
    "加班車": "#0ea5e9",
    "觀光列車": "#1d4ed8",
    "團體列車": "#0ea5e9",
  };
  const THSR_DIRECTION_COLORS = { north: "#11f6a6", south: "#ff41dc" };

  function getTrackerPanelConfig() {
    return {
      key: "modern",
      tabId: TAB_ID,
      panelId: PANEL_ID,
      tabLabel: "即時動態",
      title: "即時動態",
      inputPrefix: "railLive",
      anchorTabId: ANCHOR_TAB_ID,
      anchorPanelId: ANCHOR_PANEL_ID,
    };
  }

  function getTrackerRefreshIntervalMs(state) {
    const hasModerateDelay = Array.isArray(state?.visibleSnapshots) && state.visibleSnapshots.some((snapshot) => {
      const delayMinutes = Math.max(0, Number(snapshot?.delayMinutes) || 0);
      return delayMinutes >= 5 && delayMinutes <= 10;
    });
    return hasModerateDelay ? DELAY_REFRESH_MS : REFRESH_MS;
  }

  function startTrackerRefreshLoop(state, run) {
    const startAlignedPolling = window.RailAssistantCommon?.startAlignedPolling;
    if (typeof startAlignedPolling === "function") {
      state.refreshLoop?.stop?.();
      state.refreshLoop = startAlignedPolling(() => {
        if (!state.panel.classList.contains("hidden")) return run();
      }, {
        getIntervalMs: () => getTrackerRefreshIntervalMs(state),
      });
      return;
    }
    if (state.timer) window.clearInterval(state.timer);
    state.timer = window.setInterval(() => {
      if (!state.panel.classList.contains("hidden")) run();
    }, REFRESH_MS);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function maybePromise(value) {
    return value && typeof value.then === "function" ? value : Promise.resolve(value);
  }

  async function ensureLiveTrackerAccess() {
    if (!window.RailFeatureGate?.ensureAccess) return true;
    try {
      return await window.RailFeatureGate.ensureAccess("live-tracker");
    } catch (_) {
      return false;
    }
  }

  function readPageValue(expression) {
    try {
      return window.eval(expression);
    } catch (_) {
      return undefined;
    }
  }

  function getRailNetwork() {
    return window.RailNetwork || null;
  }

  function normalizeStationForSystem(system, name) {
    return system === "thsr" ? normalizeThsrStation(name) : normalizeTraStation(name);
  }

  function normalizeGeoCoords(raw) {
    if (!raw || typeof raw !== "object") return null;
    const lat = Number(raw.latitude ?? raw.lat);
    const lon = Number(raw.longitude ?? raw.lon);
    const accuracy = Number(raw.accuracy);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      lat,
      lon,
      accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
      ts: Number(raw.timestamp ?? raw.ts) || Date.now(),
    };
  }

  function readSharedGeoSnapshot() {
    try {
      const raw = JSON.parse(localStorage.getItem(SHARED_GEO_KEY) || "null");
      return normalizeGeoCoords(raw);
    } catch (_) {
      return null;
    }
  }

  function persistSharedGeoSnapshot(coords, source) {
    const normalized = normalizeGeoCoords(coords);
    if (!normalized) return null;
    try {
      localStorage.setItem(SHARED_GEO_KEY, JSON.stringify({
        lat: normalized.lat,
        lon: normalized.lon,
        accuracy: normalized.accuracy,
        source: source || "live-tracker",
        ts: Date.now(),
      }));
    } catch (_) {
    }
    return normalized;
  }

  function getStationGeo(system, stationName) {
    const normalizedName = normalizeStationForSystem(system, stationName);
    if (!normalizedName) return null;
    const map = window.stationGeoMap || {};
    const direct = map[normalizedName] || map[String(stationName || "").trim()];
    if (direct && Number.isFinite(Number(direct.lat)) && Number.isFinite(Number(direct.lon))) {
      return { name: normalizedName, lat: Number(direct.lat), lon: Number(direct.lon) };
    }
    const list = Array.isArray(window.stationGeoList) ? window.stationGeoList : [];
    const found = list.find((item) => normalizeStationForSystem(system, item?.name) === normalizedName);
    if (!found || !Number.isFinite(Number(found.lat)) || !Number.isFinite(Number(found.lon))) return null;
    return { name: normalizedName, lat: Number(found.lat), lon: Number(found.lon) };
  }

  function projectGeoPointToSegment(point, fromPoint, toPoint) {
    const p = normalizeGeoCoords(point);
    if (!p || !fromPoint || !toPoint) return null;
    const avgLatRad = ((Number(fromPoint.lat) + Number(toPoint.lat) + p.lat) / 3) * Math.PI / 180;
    const xScale = 111320 * Math.cos(avgLatRad);
    const yScale = 111320;
    const ax = 0;
    const ay = 0;
    const bx = (Number(toPoint.lon) - Number(fromPoint.lon)) * xScale;
    const by = (Number(toPoint.lat) - Number(fromPoint.lat)) * yScale;
    const px = (p.lon - Number(fromPoint.lon)) * xScale;
    const py = (p.lat - Number(fromPoint.lat)) * yScale;
    const len2 = bx * bx + by * by;
    const ratio = len2 > 0 ? clamp(((px - ax) * bx + (py - ay) * by) / len2, 0, 1) : 0;
    const projX = bx * ratio;
    const projY = by * ratio;
    return {
      ratio,
      distanceMeters: Math.hypot(px - projX, py - projY),
    };
  }

  function getSystem() {
    const path = String(location.pathname || "").toLowerCase();
    if (path.includes("/tr/")) return "tr";
    if (path.includes("/thsr/")) return "thsr";
    return "";
  }

  function getQueryDate() {
    return document.getElementById("mainQueryDate")?.value || readPageValue("currentQueryDateStr") || "";
  }

  function addDays(dateStr, delta) {
    const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    base.setDate(base.getDate() + delta);
    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
  }

  function normalizeTraStation(name) {
    return getRailNetwork()?.normalizeTraStation?.(name) || String(name || "").trim().replace(/台/g, "臺");
  }

  function normalizeThsrStation(name) {
    return getRailNetwork()?.normalizeThsrStation?.(name) || String(name || "").trim().replace(/台/g, "臺");
  }

  function normalizeTraType(type) {
    return getRailNetwork()?.normalizeTraDisplayType?.(type) || String(type || "").trim() || "列車";
  }

  function parseColorChannels(color) {
    const value = String(color || "").trim().toLowerCase();
    const shortHex = value.match(/^#([0-9a-f]{3})$/i);
    if (shortHex) {
      return shortHex[1].split("").map((part) => parseInt(part + part, 16));
    }
    const fullHex = value.match(/^#([0-9a-f]{6})$/i);
    if (fullHex) {
      return [0, 2, 4].map((index) => parseInt(fullHex[1].slice(index, index + 2), 16));
    }
    const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
      const parts = rgb[1].split(",").map((part) => Number.parseFloat(part.trim()));
      if (parts.length >= 3 && parts.slice(0, 3).every((part) => Number.isFinite(part))) {
        return parts.slice(0, 3).map((part) => Math.max(0, Math.min(255, part)));
      }
    }
    return null;
  }

  function needsDarkModeNeutralSwap(color) {
    const value = String(color || "").trim().toLowerCase();
    if (value === "#475569" || value === "#64748b" ||value === "#000000" || value === "#334155" || value === "#000" || value === "#000000") return true;
    const channels = parseColorChannels(value);
    if (!channels) return false;
    const max = Math.max(...channels);
    const min = Math.min(...channels);
    return max - min <= 18;
  }

  function getReadableRailColor(color) {
    return document.body.classList.contains("dark-mode") && needsDarkModeNeutralSwap(color) ? "#f8fafc" : color;
  }

  function parseMinutes(time) {
    const match = String(time || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function formatMinute(minuteValue) {
    if (!Number.isFinite(minuteValue)) return "--";
    const rounded = Math.round(minuteValue);
    const normalized = ((rounded % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
  }

  function formatMinutesAway(minutesValue) {
    if (!Number.isFinite(minutesValue)) return "";
    const clamped = Math.max(0, minutesValue);
    if (clamped <= 0) return "0";
    return String(Math.ceil(clamped));
  }

  function getTrainNoParity(trainNo) {
    const digits = String(trainNo || "").match(/\d+/g);
    if (!digits?.length) return "";
    const number = Number(digits.join(""));
    if (!Number.isFinite(number)) return "";
    return number % 2 === 0 ? "even" : "odd";
  }

  function getTrainNoSortValue(trainNo) {
    const digits = String(trainNo || "").match(/\d+/g);
    if (!digits?.length) return Number.POSITIVE_INFINITY;
    const number = Number(digits.join(""));
    return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
  }

  function sortSnapshotsByTrainNo(snapshots) {
    return [...(snapshots || [])].sort(
      (a, b) =>
        getTrainNoSortValue(a?.trainNo) - getTrainNoSortValue(b?.trainNo) ||
        String(a?.trainNo || "").localeCompare(String(b?.trainNo || ""), "en")
    );
  }

  function getDirectionKey(system, trainNo) {
    const parity = getTrainNoParity(trainNo);
    if (system === "thsr") return parity === "even" ? "north" : "south";
    return parity;
  }

  function matchesDirection(system, trainNo, filterValue) {
    return !filterValue || filterValue === "all" || getDirectionKey(system, trainNo) === filterValue;
  }

  function getDirectionOptions(system) {
    return system === "tr"
      ? [
          { value: "all", label: "全部" },
          { value: "even", label: "順行(偶數車次)" },
          { value: "odd", label: "逆行(奇數車次)" },
        ]
      : [
          { value: "all", label: "全部" },
          { value: "north", label: "北上(偶數車次)" },
          { value: "south", label: "南下(奇數車次)" },
        ];
  }

  function getRouteGroupsForSystem(system) {
    return system === "tr"
      ? getRailNetwork()?.getTraSegmentGroups?.() || []
      : [{ id: "thsr", title: "高鐵全線", segments: [{ id: "thsr-main", title: "高鐵全線", subtitle: "南港 - 左營", stations: getRailNetwork()?.getThsrStationOrder?.() || [] }] }];
  }

  function parseExactTrainQuery(queryText) {
    const text = String(queryText || "").trim();
    return /^[A-Za-z]?\d+[A-Za-z]?$/i.test(text) ? text : "";
  }

  function sameTrainNo(a, b) {
    return String(a || "").trim().toUpperCase() === String(b || "").trim().toUpperCase();
  }

  function getTraTypeColor(type) {
    const normalized = normalizeTraType(type);
    const baseCandidate = normalized
      .replace(/[（(].*$/, "")
      .replace(/\u5c08\u958b\u5217\u8eca/g, "")
      .trim();
    const baseNormalized = baseCandidate && baseCandidate !== normalized
      ? normalizeTraType(baseCandidate)
      : normalized;
    if (TRA_TYPE_COLORS[normalized]) return getReadableRailColor(TRA_TYPE_COLORS[normalized]);
    if (TRA_TYPE_COLORS[baseNormalized]) return getReadableRailColor(TRA_TYPE_COLORS[baseNormalized]);
    if (typeof window.getTrainTypeColor === "function") {
      try {
        return getReadableRailColor(window.getTrainTypeColor(normalized) || "#64748b");
      } catch (_) {
      }
    }
    return getReadableRailColor("#64748b");
  }

  function getEntryColor(system, snapshot) {
    return system === "tr" ? getTraTypeColor(snapshot.type) : THSR_DIRECTION_COLORS[getDirectionKey(system, snapshot.trainNo)] || "#64748b";
  }

  function getStatusAppearance(snapshot) {
    const text = String(snapshot?.statusText || "");
    if (text === "已到終點") return { text, color: "#64748b" };
    if (/晚\d+分/.test(text)) return { text, color: "#dc2626" };
    if (text.includes("停靠中")) return { text, color: "#2563eb" };
    if (text.includes("即將發車")) return { text, color: "#d97706" };
    if (text.includes("準點") || text.includes("行進中")) return { text, color: "#16a34a" };
    return { text, color: "#475569" };
  }

  function getStatusSegmentColor(text) {
    const value = String(text || "").trim();
    if (!value) return "#475569";
    if (value === "已到終點") return "#64748b";
    if (value === "停靠中") return "#2563eb";
    if (value === "即將發車") return "#d97706";
    if (/^晚\d+分$/.test(value)) return "#dc2626";
    if (value === "準點") return "#16a34a";
    if (value === "行進中") return "#0f766e";
    return getStatusAppearance({ statusText: value }).color;
  }

  function buildStatusHTML(snapshot) {
    const parts = String(snapshot?.statusText || "")
      .split("·")
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return "";
    return parts
      .map(
        (part, index) =>
          `${index ? `<span class="rail-live-status-sep">·</span>` : ""}<span class="rail-live-status-part" style="color:${escapeHtml(getStatusSegmentColor(part))}">${escapeHtml(part)}</span>`
      )
      .join("");
  }

  function isLiveRealtimeWindow(queryDate) {
    const today = todayDateStr();
    return queryDate === today || addDays(queryDate, 1) === today;
  }

  function getDelayMinutes(system, trainNo, queryDate) {
    if (system !== "tr" || !isLiveRealtimeWindow(queryDate) || typeof window.getDelayMinutes !== "function") return 0;
    try {
      const delay = Number(window.getDelayMinutes(String(trainNo)) || 0);
      return Number.isFinite(delay) ? delay : 0;
    } catch (_) {
      return 0;
    }
  }

  function buildPunctualityText(system, queryDate, delayMinutes) {
    if (system === "tr" && isLiveRealtimeWindow(queryDate) && Number(delayMinutes) > 0) return `晚${Number(delayMinutes)}分`;
    return "準點";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function todayDateStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function diffDateDays(fromDate, toDate) {
    if (!fromDate || !toDate) return 0;
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T00:00:00`);
    return Math.round((to - from) / 86400000);
  }

  function getRelativeNowMinute(originDate, queryDate) {
    if (typeof window.getNowAbsFromOrigin === "function") {
      try {
        const value = window.getNowAbsFromOrigin(originDate);
        if (Number.isFinite(value)) return value;
      } catch (_) {
      }
    }
    const now = new Date();
    const today = todayDateStr();
    const offsetDays = diffDateDays(originDate || today, today);
    return offsetDays * 1440 + now.getHours() * 60 + now.getMinutes();
  }

  function getRelativeNowExactMinute(originDate, queryDate) {
    const now = new Date();
    const today = todayDateStr();
    const offsetDays = diffDateDays(originDate || today, today);
    return (
      offsetDays * 1440 +
      now.getHours() * 60 +
      now.getMinutes() +
      now.getSeconds() / 60 +
      now.getMilliseconds() / 60000
    );
  }

  function parseTimestampRelativeMinute(timestamp, originDate) {
    const text = String(timestamp || "").trim();
    if (!text) return null;
    const value = new Date(text);
    if (!Number.isFinite(value.getTime())) return null;
    const localDate = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    return (
      diffDateDays(originDate || localDate, localDate) * 1440 +
      value.getHours() * 60 +
      value.getMinutes() +
      value.getSeconds() / 60 +
      value.getMilliseconds() / 60000
    );
  }

  function getTraLiveBoardAssistEntry(trainNo, queryDate) {
    if (!isLiveRealtimeWindow(queryDate) || typeof window.getTraLiveBoardEntry !== "function") return null;
    try {
      return window.getTraLiveBoardEntry(String(trainNo || "").trim()) || null;
    } catch (_) {
      return null;
    }
  }

  function shouldApplyTraLiveAssist(entry, queryDate) {
    if (!entry || !entry.trainNo || !entry.originDate || !isLiveRealtimeWindow(queryDate)) return false;
    const today = todayDateStr();
    const yesterday = addDays(today, -1);
    const originDate = String(entry.originDate || "");
    if (originDate !== today && originDate !== yesterday) return false;
    const delayMinutes = Math.max(0, Number.isFinite(Number(entry.delayMinutes)) ? Number(entry.delayMinutes) : getDelayMinutes("tr", entry.trainNo, queryDate));

    const timedStops =
      Array.isArray(entry.fullTimedStops) && entry.fullTimedStops.length
        ? entry.fullTimedStops
        : buildTimedStops(entry.stops || [], delayMinutes);
    const firstStop = timedStops[0] || null;
    const lastStop = timedStops[timedStops.length - 1] || null;
    const firstMinute = getStopDepartureMinute(firstStop);
    const lastMinute = getStopArrivalMinute(lastStop);
    const firstMinuteEff = Number.isFinite(firstMinute) ? firstMinute + delayMinutes : null;
    const lastMinuteEff = Number.isFinite(lastMinute) ? lastMinute + delayMinutes : null;
    const nowMinute = getRelativeNowExactMinute(originDate, queryDate);

    if (!Number.isFinite(nowMinute)) return false;
    if (originDate === today) {
      return Number.isFinite(firstMinuteEff) && nowMinute >= (firstMinuteEff - UPCOMING_WINDOW);
    }
    return Number.isFinite(lastMinuteEff) && lastMinuteEff >= 1440 && nowMinute <= (lastMinuteEff + STATION_ALERT_WINDOW);
  }

  function getTraLiveAnchorMinute(liveEntry, originDate, nowMinute) {
    const candidates = [
      parseTimestampRelativeMinute(liveEntry?.srcUpdateTime, originDate),
      parseTimestampRelativeMinute(liveEntry?.updateTime, originDate),
      Number.isFinite(nowMinute) ? nowMinute : null,
    ]
      .filter((value) => Number.isFinite(value))
      .map((value) => Math.min(value, nowMinute));
    if (!candidates.length) return null;
    return Math.min(...candidates);
  }

  function getTraLiveAnchorInfo(entry, queryDate, nowMinute) {
    const liveEntry = shouldApplyTraLiveAssist(entry, queryDate)
      ? getTraLiveBoardAssistEntry(entry?.trainNo, queryDate)
      : null;
    const stationName = normalizeTraStation(liveEntry?.stationName || "");
    const fullPoints = Array.isArray(entry?.fullPathPoints) ? entry.fullPathPoints : [];
    if (!stationName || !fullPoints.length) return null;

    let fallbackIndex = -1;
    let stopIndex = -1;
    let passIndex = -1;
    fullPoints.forEach((point, index) => {
      if (normalizeTraStation(point?.station) !== stationName) return;
      fallbackIndex = index;
      if (!point?.isStop && point?.kind === "pass" && passIndex < 0) passIndex = index;
      if (point?.isStop && stopIndex < 0) stopIndex = index;
    });
    const anchorIndex = passIndex >= 0 ? passIndex : (stopIndex >= 0 ? stopIndex : fallbackIndex);
    if (anchorIndex < 0) return null;

    const anchorPoint = fullPoints[anchorIndex];
    const routeIndex = Number(entry?.routeIndexMap?.get?.(stationName));
    const liveMinute = getTraLiveAnchorMinute(liveEntry, entry?.originDate, nowMinute);
    const effectiveMinute = (!Boolean(anchorPoint?.isStop) && Number.isFinite(liveMinute))
      ? Math.min(anchorPoint.minute, liveMinute)
      : anchorPoint.minute;

    return {
      entry: liveEntry,
      stationName,
      anchorIndex,
      anchorPoint,
      anchorMinute: effectiveMinute,
      routeIndex: Number.isFinite(routeIndex) ? routeIndex : null,
      isStop: Boolean(anchorPoint?.isStop),
      canAdvance: !Boolean(anchorPoint?.isStop) && Number.isFinite(anchorPoint?.minute) && Number.isFinite(effectiveMinute) && effectiveMinute < anchorPoint.minute,
    };
  }

  function buildTraLiveAdjustedProjection(entry, queryDate, nowMinute) {
    const assist = getTraLiveAnchorInfo(entry, queryDate, nowMinute);
    if (!assist || !assist.anchorPoint) return { points: entry?.points || [], fullPathPoints: entry?.fullPathPoints || [], live: null };

    const fullPoints = Array.isArray(entry?.fullPathPoints) ? entry.fullPathPoints : [];
    const baseFullTimedStops = buildTimedStops(entry?.stops || [], 0);
    const baseFullPathPoints = buildJourneyPathPoints("tr", baseFullTimedStops, entry?.fullPathStations || [], entry?.type);
    const baseMinuteBySequence = new Map((baseFullPathPoints || []).map((point) => [point.sequenceIndex, point.minute]));
    const adjustedMinutes = new Map(fullPoints.map((point) => [point.sequenceIndex, point.minute]));
    adjustedMinutes.set(assist.anchorPoint.sequenceIndex, assist.anchorMinute);

    if (assist.canAdvance) {
      const nextFixedStopPoint = fullPoints.find((point, index) => index > assist.anchorIndex && point?.isStop);
      const baseNextFixedMinute = Number(nextFixedStopPoint ? baseMinuteBySequence.get(nextFixedStopPoint.sequenceIndex) : null);
      const effectiveEndMinute =
        Number.isFinite(baseNextFixedMinute) && baseNextFixedMinute > assist.anchorMinute
          ? baseNextFixedMinute
          : nextFixedStopPoint?.minute;
      if (nextFixedStopPoint && Number.isFinite(effectiveEndMinute) && effectiveEndMinute > assist.anchorMinute) {
        const totalMinutes = effectiveEndMinute - assist.anchorMinute;
        for (let index = assist.anchorIndex + 1; index < fullPoints.length; index += 1) {
          const point = fullPoints[index];
          if (!point) continue;
          if (point.sequenceIndex === nextFixedStopPoint.sequenceIndex) break;
          if (point.isStop) continue;
          const ratio = getJourneyInterpolationRatio(
            "tr",
            entry.fullPathStations,
            assist.anchorPoint.pathIndex,
            nextFixedStopPoint.pathIndex,
            point.pathIndex,
            totalMinutes,
            Boolean(assist.anchorPoint.isStop),
            true,
            entry.type
          );
          adjustedMinutes.set(point.sequenceIndex, Math.round((assist.anchorMinute + (totalMinutes * ratio)) * 1000) / 1000);
        }
      }
    }

    const mapPointMinute = (point) => ({
      ...point,
      minute: adjustedMinutes.get(point.sequenceIndex) ?? point.minute,
    });

    return {
      live: assist,
      fullPathPoints: fullPoints.map(mapPointMinute),
      points: (entry?.points || []).map(mapPointMinute),
    };
  }

  async function ensureScheduleReady(system) {
    const dateStr = getQueryDate();
    let baseSchedule = readPageValue("baseSchedule") || window.trainSchedule || {};
    let prevSchedule = readPageValue("prevSchedule") || {};
    if ((!baseSchedule || !Object.keys(baseSchedule).length) && typeof window.refreshData === "function" && dateStr) {
      await maybePromise(window.refreshData(dateStr));
      baseSchedule = readPageValue("baseSchedule") || window.trainSchedule || {};
      prevSchedule = readPageValue("prevSchedule") || {};
    }
    if (system === "tr" && dateStr === todayDateStr() && typeof window.updateLiveDelay === "function") {
      await maybePromise(window.updateLiveDelay());
    }
    const sources = [];
    if (baseSchedule && Object.keys(baseSchedule).length) {
      sources.push({ map: baseSchedule, originDate: dateStr });
    }
    if (prevSchedule && Object.keys(prevSchedule).length) {
      sources.push({ map: prevSchedule, originDate: addDays(dateStr, -1) });
    }
    return sources;
  }

  function mergePathSegments(first, second) {
    if (!first.length) return second.slice();
    if (!second.length) return first.slice();
    return first.concat(second.slice(1));
  }

  function expandEntryPathStations(system, stops) {
    const names = (stops || []).map((stop) => stop.name).filter(Boolean);
    if (names.length < 2) return names.slice();
    const findPath = system === "tr" ? getRailNetwork()?.findTraRoutePath : getRailNetwork()?.findThsrRoutePath;
    if (findPath) {
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
      points.push({ ...point, sequenceIndex });
      sequenceIndex += 1;
    };

    anchors.forEach((current, index) => {
      if (current.isPassOnly) {
        const passMinute = getStopEventMinute(current);
        if (Number.isFinite(passMinute)) {
          pushPoint({
            station: current.name,
            pathIndex: current.pathIndex,
            minute: passMinute,
            kind: "pass",
            isStop: false,
          });
        }
      } else if (Number.isFinite(current.arrivalMinute)) {
        pushPoint({
          station: current.name,
          pathIndex: current.pathIndex,
          minute: current.arrivalMinute,
          kind: "arrival",
          isStop: true,
        });
      }
      if (!current.isPassOnly && Number.isFinite(current.departureMinute) && current.departureMinute !== current.arrivalMinute) {
        pushPoint({
          station: current.name,
          pathIndex: current.pathIndex,
          minute: current.departureMinute,
          kind: "departure",
          isStop: true,
        });
      }

      const next = anchors[index + 1];
      if (!next) return;
      const travelStart = Number.isFinite(current.departureMinute) ? current.departureMinute : current.arrivalMinute;
      const travelEnd = Number.isFinite(next.arrivalMinute) ? next.arrivalMinute : next.departureMinute;
      const totalMinutes = Number.isFinite(travelStart) && Number.isFinite(travelEnd) ? (travelEnd - travelStart) : null;
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
          minute: Math.round(
            travelStart +
              (travelEnd - travelStart) *
                getJourneyInterpolationRatio(
                  system,
                  fullPathStations,
                  current.pathIndex,
                  next.pathIndex,
                  pathIndex,
                  totalMinutes,
                  !current.isPassOnly,
                  !next.isPassOnly,
                  trainType
                )
          ),
          kind: "pass",
          isStop: false,
        });
      }
    });

    return points;
  }

  function splitStopTimes(stopRow) {
    const primary = String(stopRow?.[1] || "").trim();
    const secondary = String(stopRow?.[2] || "").trim();
    if (!primary || !secondary) {
      return {
        arrival: secondary,
        departure: primary,
      };
    }
    const primaryMinute = parseMinutes(primary);
    const secondaryMinute = parseMinutes(secondary);
    if (!Number.isFinite(primaryMinute) || !Number.isFinite(secondaryMinute)) {
      return {
        arrival: secondary,
        departure: primary,
      };
    }
    const primaryToSecondary = (secondaryMinute - primaryMinute + 1440) % 1440;
    const secondaryToPrimary = (primaryMinute - secondaryMinute + 1440) % 1440;
    return primaryToSecondary <= secondaryToPrimary
      ? { arrival: primary, departure: secondary }
      : { arrival: secondary, departure: primary };
  }

  function normalizeTraTypeForSingleTimeStop(type) {
    const raw = String(type || "").trim();
    return getRailNetwork()?.normalizeTraDisplayType?.(raw) || raw;
  }

  function normalizeSingleTimeTraStop(stop, index, stopCount, type) {
    if (index <= 0 || index >= stopCount - 1) return stop;
    const arrival = String(stop?.arrival || "").trim();
    const departure = String(stop?.departure || "").trim();
    if ((arrival && departure) || (!arrival && !departure)) return stop;
    const normalizedType = normalizeTraTypeForSingleTimeStop(type);
    if (!new Set(["區間車", "普通車", "柴油客車"]).has(normalizedType)) return stop;
    const singleTime = arrival || departure;
    return {
      ...stop,
      arrival: singleTime,
      departure: singleTime,
      inferredStop: true,
    };
  }

  function buildEntries(system, scheduleSources) {
    const normalizeStation = system === "tr" ? normalizeTraStation : normalizeThsrStation;
    const sources = Array.isArray(scheduleSources) ? scheduleSources : [{ map: scheduleSources || {}, originDate: getQueryDate() }];
    return sources.flatMap((source) =>
      Object.keys(source.map || {})
        .sort((a, b) => String(a).localeCompare(String(b), "en"))
        .map((trainNo) => {
          const raw = source.map?.[trainNo];
          if (!raw) return null;
          const rawType = system === "tr" ? String(raw["原始車種"] || raw["車種"] || "列車").trim() || "列車" : "高鐵";
          const stopRows = raw["車站時間"] || [];
          const stops = stopRows
            .map((stop, index) => {
              const times = splitStopTimes(stop);
              const normalizedStop = system === "tr"
                ? normalizeSingleTimeTraStop(
                    {
                      name: normalizeStation(stop?.[0] || ""),
                      arrival: times.arrival,
                      departure: times.departure,
                    },
                    index,
                    stopRows.length,
                    rawType
                  )
                : {
                    name: normalizeStation(stop?.[0] || ""),
                    arrival: times.arrival,
                    departure: times.departure,
                  };
              return {
                ...normalizedStop,
                name: normalizeStation(stop?.[0] || ""),
              };
            })
            .filter((stop) => stop.name && (stop.arrival || stop.departure));
          if (stops.length < 2) return null;
          const fullPathStations = expandEntryPathStations(system, stops);
          return {
            key: `${trainNo}@${source.originDate}`,
            originDate: source.originDate,
            trainNo: String(trainNo),
            rawType,
            type: system === "tr" ? normalizeTraType(rawType) : "高鐵",
            stops,
            stationSet: new Set(stops.map((stop) => stop.name)),
            fullPathStations,
            fullPathSet: new Set(fullPathStations),
            firstStation: stops[0].name,
            lastStation: stops[stops.length - 1].name,
          };
        })
        .filter(Boolean)
    );
  }

  function matchesSegmentEntry(entry, segment) {
    const stationSet = entry.fullPathSet || entry.stationSet || new Set((entry.stops || []).map((stop) => stop.name));
    if (segment.includeAny?.length && !segment.includeAny.some((name) => stationSet.has(name))) return false;
    if (segment.excludeAny?.length && segment.excludeAny.some((name) => stationSet.has(name))) return false;
    let hitCount = 0;
    for (const station of segment.stations || []) {
      if (!stationSet.has(station)) continue;
      hitCount += 1;
      if (hitCount >= 2) return true;
    }
    return false;
  }

  function buildTimedStops(routeStops, delayMinutes) {
    const timedStops = [];
    let previousAbsoluteMinute = null;
    const stopCount = (routeStops || []).length;
    const resolveAbsoluteMinute = (rawMinute) => {
      if (rawMinute === null) return null;
      let absoluteMinute = rawMinute;
      while (previousAbsoluteMinute !== null && absoluteMinute < previousAbsoluteMinute) {
        absoluteMinute += 1440;
      }
      previousAbsoluteMinute = absoluteMinute;
      return absoluteMinute + delayMinutes;
    };
    routeStops.forEach((stop, index) => {
      const arrivalRaw = parseMinutes(stop.arrival);
      const departureRaw = parseMinutes(stop.departure);
      const hasArrival = arrivalRaw !== null;
      const hasDeparture = departureRaw !== null;
      timedStops.push({
        ...stop,
        hasArrival,
        hasDeparture,
        isPassOnly: index > 0 && index < stopCount - 1 && hasArrival !== hasDeparture,
        arrivalMinute: resolveAbsoluteMinute(arrivalRaw),
        departureMinute: resolveAbsoluteMinute(departureRaw),
      });
    });
    return timedStops;
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

  function getOriginDisplayMinute(stop) {
    const departureMinute = getStopDepartureMinute(stop);
    if (!Number.isFinite(departureMinute)) return null;
    const arrivalMinute = getStopArrivalMinute(stop);
    const upcomingMinute = departureMinute - UPCOMING_WINDOW;
    if (!Number.isFinite(arrivalMinute)) return upcomingMinute;
    return Math.min(arrivalMinute, upcomingMinute);
  }

  function buildRouteProjections(entry, routeStations, system, queryDate) {
    const routeIndexMap = new Map((routeStations || []).map((name, index) => [name, index]));
    const delayMinutes = getDelayMinutes(system, entry.trainNo, queryDate);
    const fullTimedStops = buildTimedStops(entry.stops, delayMinutes);
    const fullPathPoints = buildJourneyPathPoints(system, fullTimedStops, entry.fullPathStations, entry.type);
    const points = (fullPathPoints || [])
      .filter((point) => routeIndexMap.has(point.station))
      .map((point) => ({
        ...point,
        routeIndex: routeIndexMap.get(point.station),
      }))
      .filter((point) => Number.isFinite(point.routeIndex));
    if (points.length < 2) return [];

    const pointGroups = [];
    let currentGroup = [];
    points.forEach((point) => {
      const previous = currentGroup[currentGroup.length - 1];
      if (previous && point.sequenceIndex !== previous.sequenceIndex + 1) {
        if (currentGroup.length >= 2) pointGroups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(point);
    });
    if (currentGroup.length >= 2) pointGroups.push(currentGroup);
    if (!pointGroups.length) return [];

    const fullFirstMinute = getStopDepartureMinute(fullTimedStops[0]);
    const fullLastMinute = getStopArrivalMinute(fullTimedStops[fullTimedStops.length - 1]);
    const originDepartureMinute = getStopDepartureMinute(fullTimedStops[0]);

    return pointGroups
      .map((pointGroup, visitIndex) => {
        const firstMinute = pointGroup[0].minute;
        const lastMinute = pointGroup[pointGroup.length - 1].minute;
        const stopDetails = (fullTimedStops || [])
          .map((stop) => {
            const routeIndex = routeIndexMap.get(stop.name);
            const arrivalMinute = getStopArrivalMinute(stop);
            const departureMinute = getStopDepartureMinute(stop);
            if (stop.isPassOnly) return null;
            if (!Number.isFinite(routeIndex) || !Number.isFinite(arrivalMinute) || !Number.isFinite(departureMinute)) return null;
            if (departureMinute < firstMinute || arrivalMinute > lastMinute) return null;
            return {
              ...stop,
              routeIndex,
            };
          })
          .filter(Boolean);
        const startsAtJourneyOrigin =
          pointGroup[0]?.station === entry.firstStation &&
          Number.isFinite(originDepartureMinute) &&
          firstMinute <= originDepartureMinute &&
          lastMinute >= originDepartureMinute;
        return {
          ...entry,
          projectionKey: `${entry.key || entry.trainNo}|${visitIndex}`,
          delayMinutes,
          fullTimedStops,
          fullPathPoints,
          routeStations,
          routeIndexMap,
          points: pointGroup,
          stopDetails,
          firstMinute,
          lastMinute,
          journeyFirstMinute: fullFirstMinute,
          journeyLastMinute: fullLastMinute,
          originDepartureMinute,
          startsAtJourneyOrigin,
        };
      })
      .filter((projection) => Number.isFinite(projection.firstMinute) && Number.isFinite(projection.lastMinute));
  }

  function buildSnapshot(entry, system, queryDate) {
    const nowMinute = getRelativeNowExactMinute(entry.originDate, queryDate);
    const liveAdjusted = system === "tr"
      ? buildTraLiveAdjustedProjection(entry, queryDate, nowMinute)
      : { points: entry.points || [], fullPathPoints: entry.fullPathPoints || [], live: null };
    const points = liveAdjusted.points || [];
    const stopDetails = entry.stopDetails || [];
    const fullTimedStops = entry.fullTimedStops || [];
    const liveAssist = liveAdjusted.live || null;
    const punctualityText = buildPunctualityText(system, queryDate, entry.delayMinutes);
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const segmentFirstMinute = Number.isFinite(firstPoint?.minute) ? firstPoint.minute : entry.firstMinute;
    const segmentLastMinute = Number.isFinite(lastPoint?.minute) ? lastPoint.minute : entry.lastMinute;
    const fullFirstMinute = Number.isFinite(liveAdjusted.fullPathPoints?.[0]?.minute)
      ? liveAdjusted.fullPathPoints[0].minute
      : entry.journeyFirstMinute;
    const fullLastMinute = entry.journeyLastMinute;
    const originStopDetail = entry.startsAtJourneyOrigin
      ? (stopDetails.find((stop) => stop.name === entry.firstStation) || stopDetails[0] || fullTimedStops[0] || null)
      : null;
    const originPendingDepartureMinute =
      entry.startsAtJourneyOrigin && Number.isFinite(entry.originDepartureMinute)
        ? entry.originDepartureMinute
        : null;
    const originDisplayMinute =
      entry.startsAtJourneyOrigin && originStopDetail
        ? getOriginDisplayMinute(originStopDetail)
        : null;
    const liveStopDetail = liveAssist?.isStop
      ? stopDetails.find((stop) => normalizeTraStation(stop?.name) === liveAssist.stationName) || null
      : null;
    const liveStopDepartureMinute = getStopDepartureMinute(liveStopDetail);
    const liveStopHoldActive =
      !!liveStopDetail &&
      Number.isFinite(liveStopDepartureMinute) &&
      Number.isFinite(nowMinute) &&
      nowMinute < liveStopDepartureMinute;
    if (!Number.isFinite(segmentFirstMinute) || !Number.isFinite(segmentLastMinute) || !Number.isFinite(fullFirstMinute) || !Number.isFinite(fullLastMinute)) return null;
    if (
      Number.isFinite(originDisplayMinute) &&
      nowMinute < originDisplayMinute
    ) return null;
    if (
      !Number.isFinite(originPendingDepartureMinute) &&
      nowMinute < segmentFirstMinute &&
      (!entry.startsAtJourneyOrigin || segmentFirstMinute - nowMinute > UPCOMING_WINDOW) &&
      !liveStopHoldActive
    ) return null;
    if (nowMinute > segmentLastMinute + 10) return null;

    const routeDirection = Number.isFinite(firstPoint?.routeIndex) && Number.isFinite(lastPoint?.routeIndex) && lastPoint.routeIndex < firstPoint.routeIndex
      ? -1
      : 1;
    if (liveAssist && Number.isFinite(liveAssist.routeIndex) && Number.isFinite(lastPoint?.routeIndex)) {
      const beyondSegment = (liveAssist.routeIndex - lastPoint.routeIndex) * routeDirection > 0;
      if (beyondSegment) return null;
    }

    const hasStopBeenPassedByLive = (stop) => {
      if (!liveAssist || !Number.isFinite(stop?.routeIndex) || !Number.isFinite(liveAssist.routeIndex)) return false;
      const routeDelta = (stop.routeIndex - liveAssist.routeIndex) * routeDirection;
      if (routeDelta < 0) return true;
      if (routeDelta > 0) return false;
      return !Boolean(liveAssist.isStop) && normalizeTraStation(stop?.name) === liveAssist.stationName;
    };

    const getDirectionGlyphAtPointIndex = (pointIndex) => {
      const currentPoint = points[pointIndex] || points[0] || null;
      if (!currentPoint) return "▼";
      for (let index = pointIndex + 1; index < points.length; index += 1) {
        const nextPoint = points[index];
        if (!Number.isFinite(nextPoint?.routeIndex) || nextPoint.routeIndex === currentPoint.routeIndex) continue;
        return nextPoint.routeIndex < currentPoint.routeIndex ? "▲" : "▼";
      }
      for (let index = pointIndex - 1; index >= 0; index -= 1) {
        const previousPoint = points[index];
        if (!Number.isFinite(previousPoint?.routeIndex) || previousPoint.routeIndex === currentPoint.routeIndex) continue;
        return currentPoint.routeIndex < previousPoint.routeIndex ? "▲" : "▼";
      }
      return "▼";
    };

    let state = "arrived";
    let stateLabel = "已到終點";
    let positionIndex = lastPoint?.routeIndex ?? 0;
    let currentFrom = lastPoint?.station || entry.lastStation;
    let currentTo = lastPoint?.station || entry.lastStation;
    let nextStation = lastPoint?.station || entry.lastStation;
    let nextTime = formatMinute(segmentLastMinute);
    let statusText = "已到終點";
    let directionGlyph = getDirectionGlyphAtPointIndex(points.length - 1);
    let soonStation = lastPoint?.station || entry.lastStation;
    let soonMinutes = Number.POSITIVE_INFINITY;
    let soonKind = "";
    let nextEventKind = "arrival";
    let nextStopStation = "";
    let nextStopTime = "";
    let originEventMinute = entry.originDepartureMinute;

    if ((Number.isFinite(originPendingDepartureMinute) && nowMinute < originPendingDepartureMinute && (Number.isFinite(originDisplayMinute) ? nowMinute >= originDisplayMinute : true)) || (nowMinute < segmentFirstMinute && !liveStopHoldActive)) {
      const originStop = originStopDetail || stopDetails.find((stop) => stop.name === entry.firstStation) || stopDetails[0] || null;
      const anchorPointIndex = Math.max(
        0,
        points.findIndex((point) => point.station === (originStop?.name || firstPoint?.station))
      );
      const anchorPoint = points[anchorPointIndex] || firstPoint || lastPoint;
      const departureMinute = getStopDepartureMinute(originStop) ?? originPendingDepartureMinute ?? segmentFirstMinute;
      state = "upcoming";
      stateLabel = "即將發車";
      positionIndex = anchorPoint?.routeIndex ?? firstPoint?.routeIndex ?? 0;
      currentFrom = originStop?.name || anchorPoint?.station || entry.firstStation;
      currentTo = currentFrom;
      nextStation = currentFrom;
      nextTime = formatMinute(departureMinute);
      statusText = `即將發車·${punctualityText}`;
      soonStation = currentFrom;
      soonMinutes = departureMinute - nowMinute;
      soonKind = "stop";
      nextEventKind = "departure";
      nextStopStation = currentFrom;
      nextStopTime = nextTime;
      directionGlyph = getDirectionGlyphAtPointIndex(anchorPointIndex);
      originEventMinute = departureMinute;
    } else {
      if (liveStopHoldActive && liveStopDetail) {
        const isOriginLiveStop = liveStopDetail.name === entry.firstStation;
        const isTerminalLiveStop = liveStopDetail.name === entry.lastStation;
        const pointIndex = Math.max(
          0,
          points.findIndex((point) => point.station === liveStopDetail.name)
        );
        state = isTerminalLiveStop ? "arrived" : (isOriginLiveStop ? "upcoming" : "dwell");
        stateLabel = isTerminalLiveStop ? "已到終點" : (isOriginLiveStop ? "即將發車" : "停靠中");
        positionIndex = liveStopDetail.routeIndex ?? points[pointIndex]?.routeIndex ?? lastPoint?.routeIndex ?? 0;
        currentFrom = liveStopDetail.name;
        currentTo = liveStopDetail.name;
        const nextStop = stopDetails
          .slice(stopDetails.indexOf(liveStopDetail) + 1)
          .find((stop) => Number.isFinite(getStopArrivalMinute(stop)) && getStopArrivalMinute(stop) > liveStopDepartureMinute);
        const fallbackPoint = points.find((point) => Number.isFinite(point.minute) && point.minute > liveStopDepartureMinute);
        nextStation = isTerminalLiveStop ? liveStopDetail.name : (nextStop?.name || fallbackPoint?.station || liveStopDetail.name);
        nextTime = formatMinute(isTerminalLiveStop ? (getStopArrivalMinute(liveStopDetail) ?? liveStopDepartureMinute) : (getStopArrivalMinute(nextStop) ?? fallbackPoint?.minute ?? liveStopDepartureMinute));
        statusText = isTerminalLiveStop
          ? "已到終點"
          : `${isOriginLiveStop ? "即將發車" : "停靠中"}·${punctualityText}`;
        soonStation = liveStopDetail.name;
        soonMinutes = isOriginLiveStop && Number.isFinite(liveStopDepartureMinute) ? Math.max(0, liveStopDepartureMinute - nowMinute) : 0;
        soonKind = "stop";
        nextEventKind = isTerminalLiveStop ? "terminal" : (isOriginLiveStop ? "departure" : "arrival");
        nextStopStation = "";
        nextStopTime = "";
        directionGlyph = getDirectionGlyphAtPointIndex(pointIndex);
        originEventMinute = isOriginLiveStop ? liveStopDepartureMinute : originEventMinute;
      } else {
      for (let index = 0; index < stopDetails.length; index += 1) {
        const current = stopDetails[index];
        if (hasStopBeenPassedByLive(current)) continue;
        const arrivalMinute = getStopArrivalMinute(current);
        const departureMinute = getStopDepartureMinute(current);
        if (!Number.isFinite(arrivalMinute) || !Number.isFinite(departureMinute)) continue;
        if (nowMinute >= arrivalMinute && nowMinute < departureMinute) {
          state = "dwell";
          stateLabel = "停靠中";
          positionIndex = current.routeIndex ?? lastPoint?.routeIndex ?? 0;
          currentFrom = current.name;
          currentTo = current.name;
          const nextStop = stopDetails
            .slice(index + 1)
            .find((stop) => Number.isFinite(getStopArrivalMinute(stop)) && getStopArrivalMinute(stop) > departureMinute);
          const fallbackPoint = points.find((point) => Number.isFinite(point.minute) && point.minute > departureMinute);
          nextStation = current.name;
          nextTime = formatMinute(departureMinute);
          statusText = `停靠中·${punctualityText}`;
          soonStation = current.name;
          soonMinutes = 0;
          soonKind = "stop";
          nextEventKind = "departure";
          nextStopStation = "";
          nextStopTime = "";
          const pointIndex = Math.max(
            0,
            points.findIndex((point) => point.station === current.name && point.minute >= arrivalMinute)
          );
          directionGlyph = getDirectionGlyphAtPointIndex(pointIndex);
          break;
        }
      }

      if (state !== "dwell") {
        for (let index = 0; index < points.length - 1; index += 1) {
          const current = points[index];
          const next = points[index + 1];
          if (!Number.isFinite(current?.minute) || !Number.isFinite(next?.minute) || nowMinute < current.minute || nowMinute >= next.minute) continue;
          state = "running";
          stateLabel = "行進中";
          positionIndex = current.routeIndex + (next.routeIndex - current.routeIndex) * (clamp((nowMinute - current.minute) / Math.max(1, next.minute - current.minute), 0, 1));
          currentFrom = current.station;
          currentTo = next.station;
          const nextStop = stopDetails.find((stop) => Number.isFinite(getStopArrivalMinute(stop)) && getStopArrivalMinute(stop) >= nowMinute);
          const nextPoint = points.find((point, pointIndex) => pointIndex > index && Number.isFinite(point.minute) && point.minute >= nowMinute);
          statusText = `行進中·${punctualityText}`;
          const nextStopTarget = nextStop
            ? { station: nextStop.name, minute: getStopArrivalMinute(nextStop), isStop: true }
            : null;
          const nextPointTarget = nextPoint
            ? { station: nextPoint.station, minute: nextPoint.minute, isStop: Boolean(nextPoint.isStop) }
            : null;
          const soonTarget = !nextStopTarget
            ? nextPointTarget
            : !nextPointTarget
              ? nextStopTarget
              : (nextPointTarget.minute < nextStopTarget.minute ? nextPointTarget : nextStopTarget);
          nextStation = soonTarget?.station || next.station;
          nextTime = formatMinute(soonTarget?.minute ?? next.minute);
          soonStation = soonTarget?.station || next.station;
          soonMinutes = Number.isFinite(soonTarget?.minute) ? Math.max(0, soonTarget.minute - nowMinute) : Number.POSITIVE_INFINITY;
          soonKind = soonTarget?.isStop ? "stop" : soonTarget ? "pass" : "";
          nextEventKind = soonTarget?.isStop ? "arrival" : soonTarget ? "pass" : "";
          nextStopStation = nextStopTarget?.station || "";
          nextStopTime = nextStopTarget ? formatMinute(nextStopTarget.minute) : "";
          directionGlyph = getDirectionGlyphAtPointIndex(index);
          break;
        }
      }
      }
    }

    if (state === "arrived") {
      statusText = "已到終點";
      directionGlyph = getDirectionGlyphAtPointIndex(points.length - 1);
    }

    const totalMinutes = Math.max(0, fullLastMinute - fullFirstMinute);
    const elapsedMinutes = clamp(nowMinute - fullFirstMinute, 0, totalMinutes);
    const remainingMinutes = clamp(fullLastMinute - nowMinute, 0, totalMinutes);
    const completionRatio = totalMinutes > 0 ? elapsedMinutes / totalMinutes : state === "arrived" ? 1 : 0;
    const displayRoute = `${entry.firstStation} ➝ ${entry.lastStation}`;

    return {
      ...entry,
      queryDate,
      delayMinutes: entry.delayMinutes,
      fullTimedStops,
      nowMinute,
      firstMinute: segmentFirstMinute,
      lastMinute: segmentLastMinute,
      journeyFirstMinute: fullFirstMinute,
      journeyLastMinute: fullLastMinute,
      totalMinutes,
      elapsedMinutes,
      remainingMinutes,
      completionRatio,
      state,
      stateLabel,
      positionIndex,
      currentFrom,
      currentTo,
      nextStation,
      nextTime,
      displayRoute,
      statusText,
      boardLabel: `🚆${entry.trainNo} ${entry.type}`,
      directionGlyph,
      soonStation,
      soonMinutes,
      soonKind,
      nextEventKind,
      nextStopStation,
      nextStopTime,
      originEventMinute,
      isSoonStop: soonKind === "stop" && Number.isFinite(soonMinutes) && soonMinutes <= STATION_SOON_WINDOW,
      locationText: state === "running" ? `${currentFrom} ➝ ${currentTo}` : state === "dwell" ? `${currentFrom} 停靠中` : state === "upcoming" ? `即將由 ${currentFrom} 發車` : `已到 ${currentTo}`,
      livePassedStation: liveAssist?.stationName || "",
      liveAnchorMinute: liveAssist?.anchorMinute ?? null,
    };
  }

  function buildSharedStationOnlySnapshots(entries, segment, system, queryDate) {
    if (system !== "tr" || !segment?.stations?.length) return [];
    const routeStations = segment.stations || [];

    return (entries || [])
      .map((entry) => {
        const overlapStations = routeStations.filter((station) => entry.fullPathSet?.has(station));
        if (overlapStations.length !== 1) return null;

        const sharedStation = overlapStations[0];
        const routeIndex = routeStations.indexOf(sharedStation);
        if (!Number.isFinite(routeIndex) || routeIndex < 0) return null;

        const delayMinutes = getDelayMinutes(system, entry.trainNo, queryDate);
        const fullTimedStops = buildTimedStops(entry.stops, delayMinutes);
        if (!fullTimedStops.length) return null;

        const sharedStopIndex = fullTimedStops.findIndex((stop) => !stop.isPassOnly && stop.name === sharedStation);
        if (sharedStopIndex < 0) return null;

        const sharedStop = fullTimedStops[sharedStopIndex];
        const arrivalMinute = getStopArrivalMinute(sharedStop);
        const departureMinute = getStopDepartureMinute(sharedStop);
        const eventMinute = getStopEventMinute(sharedStop);
        const fullFirstMinute = getStopDepartureMinute(fullTimedStops[0]);
        const fullLastMinute = getStopArrivalMinute(fullTimedStops[fullTimedStops.length - 1]);
        const nowMinute = getRelativeNowExactMinute(entry.originDate, queryDate);

        if (!Number.isFinite(eventMinute) || !Number.isFinite(fullFirstMinute) || !Number.isFinite(fullLastMinute) || !Number.isFinite(nowMinute)) return null;

        const isOriginStation = sharedStation === entry.firstStation;
        const isTerminalStation = sharedStation === entry.lastStation;
        const liveAssist = getTraLiveAnchorInfo(entry, queryDate, nowMinute);
        const liveStopHolding =
          !!liveAssist &&
          !!liveAssist.isStop &&
          liveAssist.stationName === sharedStation &&
          Number.isFinite(departureMinute) &&
          nowMinute < departureMinute;
        const nextStop = fullTimedStops
          .slice(sharedStopIndex + 1)
          .find((stop) => !stop.isPassOnly && Number.isFinite(getStopArrivalMinute(stop)));
        const originDisplayMinute = isOriginStation ? getOriginDisplayMinute(sharedStop) : null;

        let state = "";
        let stateLabel = "";
        let statusText = "";
        let nextTime = formatMinute(eventMinute);
        let nextStation = sharedStation;
        let nextEventKind = "arrival";
        let nextStopStation = nextStop?.name || "";
        let nextStopTime = nextStop ? formatMinute(getStopArrivalMinute(nextStop)) : "";
        let soonMinutes = Number.POSITIVE_INFINITY;
        let soonKind = "";
        let originEventMinute = isOriginStation ? departureMinute : null;

        if (isOriginStation && Number.isFinite(departureMinute) && nowMinute < departureMinute && Number.isFinite(originDisplayMinute) && nowMinute >= originDisplayMinute) {
          state = "upcoming";
          stateLabel = "即將發車";
          statusText = `即將發車·${buildPunctualityText(system, queryDate, delayMinutes)}`;
          nextTime = formatMinute(departureMinute);
          nextStation = sharedStation;
          nextEventKind = "departure";
          nextStopStation = sharedStation;
          nextStopTime = nextTime;
          soonMinutes = departureMinute - nowMinute;
          soonKind = "stop";
        } else if ((Number.isFinite(arrivalMinute) && Number.isFinite(departureMinute) && nowMinute >= arrivalMinute && nowMinute < departureMinute) || (liveStopHolding && !isOriginStation)) {
          state = "dwell";
          stateLabel = "停靠中";
          statusText = isTerminalStation ? "已到終點" : `停靠中·${buildPunctualityText(system, queryDate, delayMinutes)}`;
          nextTime = isTerminalStation ? formatMinute(arrivalMinute) : formatMinute(departureMinute);
          nextStation = sharedStation;
          nextEventKind = isTerminalStation ? "terminal" : "departure";
          nextStopStation = "";
          nextStopTime = "";
          soonMinutes = 0;
          soonKind = "stop";
        } else if (isTerminalStation && Number.isFinite(arrivalMinute) && nowMinute >= arrivalMinute && nowMinute <= arrivalMinute + 10) {
          state = "arrived";
          stateLabel = "已到終點";
          statusText = "已到終點";
          nextTime = formatMinute(arrivalMinute);
          nextStation = sharedStation;
          nextEventKind = "terminal";
          soonMinutes = 0;
          soonKind = "stop";
        } else {
          return null;
        }

        const totalMinutes = Math.max(0, fullLastMinute - fullFirstMinute);
        const elapsedMinutes = clamp(nowMinute - fullFirstMinute, 0, totalMinutes);
        const remainingMinutes = clamp(fullLastMinute - nowMinute, 0, totalMinutes);
        const completionRatio = totalMinutes > 0 ? elapsedMinutes / totalMinutes : state === "arrived" ? 1 : 0;

        return {
          ...entry,
          queryDate,
          delayMinutes,
          fullTimedStops,
          points: [{ station: sharedStation, routeIndex, minute: eventMinute, isStop: true, sequenceIndex: 0 }],
          stopDetails: [{ ...sharedStop, routeIndex }],
          firstMinute: eventMinute,
          lastMinute: eventMinute,
          journeyFirstMinute: fullFirstMinute,
          journeyLastMinute: fullLastMinute,
          totalMinutes,
          elapsedMinutes,
          remainingMinutes,
          completionRatio,
          state,
          stateLabel,
          positionIndex: routeIndex,
          currentFrom: sharedStation,
          currentTo: sharedStation,
          nextStation,
          nextTime,
          displayRoute: `${entry.firstStation} ➝ ${entry.lastStation}`,
          statusText,
          boardLabel: `🚆${entry.trainNo} ${entry.type}`,
          directionGlyph: "●",
          soonStation: sharedStation,
          soonMinutes,
          soonKind,
          nextEventKind,
          nextStopStation,
          nextStopTime,
          originEventMinute,
          nowMinute,
          isSoonStop: soonKind === "stop" && Number.isFinite(soonMinutes) && soonMinutes <= STATION_SOON_WINDOW,
          locationText: state === "upcoming" ? `即將由 ${sharedStation} 發車` : state === "arrived" ? `已到 ${sharedStation}` : `${sharedStation} 停靠中`,
          startsAtJourneyOrigin: isOriginStation,
          sharedStationOnly: true,
          sharedStationName: sharedStation,
          sharedStationMode: isOriginStation ? "origin" : (isTerminalStation ? "terminal" : "stop"),
          projectionKey: `${entry.key || entry.trainNo}|shared|${sharedStation}`,
        };
      })
      .filter(Boolean);
  }

  function isCircularSnapshot(snapshot) {
    return Boolean(snapshot?.firstStation) && snapshot.firstStation === snapshot.lastStation;
  }

  function getSnapshotStatePriority(snapshot) {
    switch (snapshot?.state) {
      case "dwell":
        return 4;
      case "running":
        return 3;
      case "upcoming":
        return 2;
      case "arrived":
        return 1;
      default:
        return 0;
    }
  }

  function getSnapshotLegSpecificity(snapshot) {
    return new Set([snapshot?.currentFrom, snapshot?.currentTo, snapshot?.nextStation].filter(Boolean)).size;
  }

  function getSnapshotTimeDistance(snapshot) {
    if (!snapshot) return Number.POSITIVE_INFINITY;
    if (snapshot.state === "upcoming") return Math.max(0, snapshot.firstMinute - snapshot.nowMinute);
    if (snapshot.state === "arrived") return Math.max(0, snapshot.nowMinute - snapshot.lastMinute);
    return 0;
  }

  function preferSnapshot(candidate, current) {
    const candidatePriority = getSnapshotStatePriority(candidate);
    const currentPriority = getSnapshotStatePriority(current);
    if (candidatePriority !== currentPriority) return candidatePriority > currentPriority;

    const candidateLegSpecificity = getSnapshotLegSpecificity(candidate);
    const currentLegSpecificity = getSnapshotLegSpecificity(current);
    if (candidateLegSpecificity !== currentLegSpecificity) return candidateLegSpecificity > currentLegSpecificity;

    const candidateDistance = getSnapshotTimeDistance(candidate);
    const currentDistance = getSnapshotTimeDistance(current);
    if (candidateDistance !== currentDistance) return candidateDistance < currentDistance;

    const candidateElapsed = Number(candidate?.elapsedMinutes) || 0;
    const currentElapsed = Number(current?.elapsedMinutes) || 0;
    if (candidateElapsed !== currentElapsed) return candidateElapsed > currentElapsed;

    return String(candidate?.originDate || "").localeCompare(String(current?.originDate || ""), "en") > 0;
  }

  function dedupeCircularSnapshots(snapshots) {
    const keptCircular = new Map();
    const result = [];
    (snapshots || []).forEach((snapshot) => {
      if (!isCircularSnapshot(snapshot)) {
        result.push(snapshot);
        return;
      }
      const key = `${snapshot.trainNo}|${snapshot.queryDate || ""}|${snapshot.firstStation}`;
      const current = keptCircular.get(key);
      if (!current || preferSnapshot(snapshot, current)) keptCircular.set(key, snapshot);
    });
    return result.concat(Array.from(keptCircular.values()));
  }

  function getPrimarySnapshotsByTrain(snapshots) {
    const kept = new Map();
    (snapshots || []).forEach((snapshot) => {
      if (!snapshot?.trainNo) return;
      const key = makeTrainKey(snapshot.trainNo, snapshot.originDate || snapshot.queryDate);
      const current = kept.get(key);
      if (!current || preferSnapshot(snapshot, current)) kept.set(key, snapshot);
    });
    return Array.from(kept.values());
  }

  function getDisplaySnapshots(system, snapshots) {
    const primary = getPrimarySnapshotsByTrain(snapshots);
    if (system !== "tr") return primary;

    const kept = new Map();
    primary.forEach((snapshot) => {
      if (!snapshot?.trainNo) return;
      const key = String(snapshot.trainNo || "").trim().toUpperCase();
      const current = kept.get(key);
      if (!current || preferSnapshot(snapshot, current)) kept.set(key, snapshot);
    });
    return Array.from(kept.values());
  }

  function pushStationEvent(map, stationName, event) {
    if (!map.has(stationName)) map.set(stationName, []);
    const list = map.get(stationName);
    const key = `${event.trainNo}|${event.originDate || ""}|${event.kind}|${event.station}`;
    const existingIndex = list.findIndex((item) => `${item.trainNo}|${item.originDate || ""}|${item.kind}|${item.station}` === key);
    if (existingIndex >= 0) {
      const current = list[existingIndex];
      const currentPriority = getSnapshotPriority(current?.snapshot);
      const nextPriority = getSnapshotPriority(event?.snapshot);
      const currentCompletion = Number.isFinite(current?.snapshot?.completionRatio) ? current.snapshot.completionRatio : -1;
      const nextCompletion = Number.isFinite(event?.snapshot?.completionRatio) ? event.snapshot.completionRatio : -1;
      const shouldReplace =
        nextPriority > currentPriority ||
        (nextPriority === currentPriority && nextCompletion > currentCompletion) ||
        (nextPriority === currentPriority && nextCompletion === currentCompletion && Number.isFinite(event?.timeMinute) && Number.isFinite(current?.timeMinute) && event.timeMinute < current.timeMinute);
      if (shouldReplace) list[existingIndex] = event;
      return;
    }
    list.push(event);
  }

  function buildStationEventMap(snapshots, segmentStations) {
    const map = new Map(segmentStations.map((station) => [station, []]));
    getPrimarySnapshotsByTrain(snapshots).forEach((snapshot) => {
      const stopDetails = snapshot.stopDetails || [];
      if (
        snapshot.sharedStationOnly &&
        snapshot.state === "arrived" &&
        snapshot.sharedStationName &&
        Number.isFinite(snapshot.lastMinute) &&
        snapshot.nowMinute <= snapshot.lastMinute + STATION_ALERT_WINDOW
      ) {
        pushStationEvent(map, snapshot.sharedStationName, {
          trainNo: snapshot.trainNo,
          originDate: snapshot.originDate,
          type: snapshot.type,
          kind: "已到終點",
          station: snapshot.sharedStationName,
          timeMinute: snapshot.lastMinute,
          timeText: formatMinute(snapshot.lastMinute),
          minutesAway: 0,
          snapshot,
        });
      }
      if (
        snapshot.state === "upcoming" &&
        snapshot.startsAtJourneyOrigin &&
        Number.isFinite(snapshot.originEventMinute) &&
        snapshot.originEventMinute - snapshot.nowMinute <= STATION_ALERT_WINDOW
      ) {
        pushStationEvent(map, snapshot.currentFrom, {
          trainNo: snapshot.trainNo,
          originDate: snapshot.originDate,
          type: snapshot.type,
          kind: "即將發車",
          station: snapshot.currentFrom,
          timeMinute: snapshot.originEventMinute,
          timeText: formatMinute(snapshot.originEventMinute),
          minutesAway: Math.max(0, snapshot.originEventMinute - snapshot.nowMinute),
          snapshot,
        });
      }
      stopDetails.forEach((stop) => {
        const arrivalMinute = getStopArrivalMinute(stop);
        const departureMinute = getStopDepartureMinute(stop);
        if (!Number.isFinite(arrivalMinute) || !Number.isFinite(departureMinute)) return;
        if (snapshot.nowMinute >= arrivalMinute && snapshot.nowMinute < departureMinute) {
          pushStationEvent(map, stop.name, { trainNo: snapshot.trainNo, originDate: snapshot.originDate, type: snapshot.type, kind: "停靠中", station: stop.name, timeMinute: departureMinute, timeText: formatMinute(departureMinute), minutesAway: 0, snapshot });
        } else if (arrivalMinute > snapshot.nowMinute && arrivalMinute - snapshot.nowMinute <= STATION_ALERT_WINDOW) {
          pushStationEvent(map, stop.name, { trainNo: snapshot.trainNo, originDate: snapshot.originDate, type: snapshot.type, kind: "即將進站", station: stop.name, timeMinute: arrivalMinute, timeText: formatMinute(arrivalMinute), minutesAway: Math.max(0, arrivalMinute - snapshot.nowMinute), snapshot });
        }
      });
      (snapshot.points || [])
        .filter((point) => !point.isStop && Number.isFinite(point.minute) && point.minute >= snapshot.nowMinute && point.minute - snapshot.nowMinute <= STATION_ALERT_WINDOW)
        .forEach((point) => {
          pushStationEvent(map, point.station, {
            trainNo: snapshot.trainNo,
            originDate: snapshot.originDate,
            type: snapshot.type,
            kind: "即將通過",
            station: point.station,
            timeMinute: point.minute,
            timeText: formatMinute(point.minute),
            minutesAway: Math.max(0, point.minute - snapshot.nowMinute),
            snapshot,
          });
        });
    });
    map.forEach((list) => list.sort((a, b) => a.timeMinute - b.timeMinute || a.trainNo.localeCompare(b.trainNo, "en")));
    return map;
  }

  function getBoardHeight(stations) {
    return Math.max(620, ((stations || []).length - 1) * 42 + MAP_PADDING_Y * 2);
  }

  function renderTraTypeHTML(type) {
    const normalized = normalizeTraType(type);
    return `<span style="color:${escapeHtml(getTraTypeColor(normalized))};font-weight:700">${escapeHtml(normalized)}</span>`;
  }

  function buildTrainTitleHTML(system, snapshot, withRoute) {
    const typeHtml = system === "tr" ? renderTraTypeHTML(snapshot.type) : `<span style="font-weight:700">${escapeHtml(snapshot.type || "高鐵")}</span>`;
    return `🚆${escapeHtml(snapshot.trainNo)} ${typeHtml}${withRoute ? `（${escapeHtml(snapshot.displayRoute)}）` : ""}`;
  }

  function buildSnapshotBoardMeta(snapshot) {
    return snapshot.boardLabel;
  }

  function buildSnapshotLocationLine(snapshot) {
    if (snapshot.sharedStationOnly) {
      if (snapshot.state === "arrived") return `目前在 ${snapshot.currentTo}（共用站終點）`;
      if (snapshot.state === "upcoming") return `目前在 ${snapshot.currentFrom}（共用站），等待發車`;
      return `目前停靠 ${snapshot.currentFrom}（共用站）`;
    }
    if (snapshot.state === "running") return `目前在 ${snapshot.currentFrom} ➝ ${snapshot.currentTo} 間`;
    if (snapshot.state === "dwell") return `目前停靠 ${snapshot.currentFrom}`;
    if (snapshot.state === "upcoming") return `目前在 ${snapshot.currentFrom}，等待發車`;
    return `已抵達 ${snapshot.currentTo}`;
  }

  function buildSnapshotNextLine(snapshot) {
    if (snapshot.sharedStationOnly) {
      if (snapshot.state === "arrived") return `終點站：${snapshot.currentTo}（共用站）`;
      if (snapshot.state === "upcoming") return `預計 ${snapshot.nextTime} 由 ${snapshot.currentFrom} 發車，離站後即離開此路線`;
      if (snapshot.nextEventKind === "terminal") return `終點站：${snapshot.currentTo}（共用站）`;
      const departureText = snapshot.nextStopTime || snapshot.nextTime;
      return `預計 ${departureText} 離開 ${snapshot.currentFrom}，離站後即離開此路線`;
    }
    if (snapshot.state === "arrived") return `終點站：${snapshot.currentTo}`;
    if (snapshot.state === "upcoming") return `預計 ${snapshot.nextTime} 由 ${snapshot.currentFrom} 發車`;
    if (snapshot.nextEventKind === "pass") {
      return `即將通過：${snapshot.nextStation}（${snapshot.nextTime}）`;
    }
    return `下一停靠：${snapshot.nextStation}（${snapshot.nextTime}）`;
  }

  function buildSnapshotStatusLine(snapshot) {
    return `狀態：${snapshot.statusText}`;
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

  function getAnimatedSnapshotPosition(snapshot, queryDate) {
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
    if (!points.length || !Number.isFinite(firstMinute) || !Number.isFinite(lastMinute)) {
      return basePosition || 0;
    }
    if (snapshot?.sharedStationOnly || points.length === 1) {
      return Number.isFinite(snapshot?.positionIndex) ? snapshot.positionIndex : firstPoint?.routeIndex ?? 0;
    }

    const nowMinute = getRelativeNowExactMinute(snapshot.originDate, queryDate || snapshot.queryDate || getQueryDate());
    if (!Number.isFinite(nowMinute)) return basePosition || 0;
    if (nowMinute <= firstMinute) return clampToBase(firstPoint?.routeIndex ?? basePosition);
    if (nowMinute >= lastMinute) return clampToBase(lastPoint?.routeIndex ?? basePosition);

    for (let index = 0; index < stopDetails.length; index += 1) {
      const current = stopDetails[index];
      const arrivalMinute = getStopArrivalMinute(current);
      const departureMinute = getStopDepartureMinute(current);
      if (!Number.isFinite(arrivalMinute) || !Number.isFinite(departureMinute) || !Number.isFinite(current?.routeIndex)) continue;
      if (nowMinute >= arrivalMinute && nowMinute < departureMinute) {
        return clampToBase(current.routeIndex);
      }
    }

    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      if (!Number.isFinite(current?.minute) || !Number.isFinite(next?.minute)) continue;
      if (nowMinute < current.minute || nowMinute > next.minute) continue;
      if (!Number.isFinite(current?.routeIndex) || !Number.isFinite(next?.routeIndex)) {
        return basePosition || 0;
      }
      if (current.routeIndex === next.routeIndex) return clampToBase(current.routeIndex);
      const duration = next.minute - current.minute;
      if (duration <= 0) return clampToBase(next.routeIndex);
      const progress = (nowMinute - current.minute) / duration;
      const animatedProgress = getAnimatedSegmentProgress(progress, current, next);
      return clampToBase(current.routeIndex + (next.routeIndex - current.routeIndex) * animatedProgress);
    }

    return Number.isFinite(snapshot?.positionIndex) ? snapshot.positionIndex : lastPoint?.routeIndex ?? 0;
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

  function getSnapshotAnimationSignature(snapshot) {
    return [
      Number(snapshot?.delayMinutes) || 0,
      snapshot?.state || "",
      snapshot?.currentFrom || "",
      snapshot?.currentTo || "",
      Number.isFinite(snapshot?.positionIndex) ? snapshot.positionIndex : "",
      Number.isFinite(snapshot?.firstMinute) ? snapshot.firstMinute : "",
      Number.isFinite(snapshot?.lastMinute) ? snapshot.lastMinute : "",
      Number.isFinite(snapshot?.originEventMinute) ? snapshot.originEventMinute : "",
      snapshot?.soonStation || "",
      snapshot?.soonKind || "",
      snapshot?.nextStation || "",
      snapshot?.nextTime || "",
      snapshot?.nextStopStation || "",
      snapshot?.nextStopTime || "",
      snapshot?.statusText || "",
    ].join("|");
  }

  function getSnapshotAnimationMode(snapshot) {
    const delayMinutes = Math.max(0, Number(snapshot?.delayMinutes) || 0);
    if (delayMinutes > 10) return { type: "stepped", cadenceSeconds: 60 };
    if (delayMinutes > 5) return { type: "stepped", cadenceSeconds: 30 };
    return { type: "continuous", cadenceSeconds: 0 };
  }

  function getSteppedSnapshotPosition(state, snapshot, rawPosition, cadenceSeconds) {
    const key = makeTrainKey(snapshot?.trainNo, snapshot?.originDate);
    const scopeKey = state.animationScopeKey || "";
    const slot = Math.floor(Date.now() / (Math.max(1, cadenceSeconds) * 1000));
    const signature = getSnapshotAnimationSignature(snapshot);
    const previous = state.markerStepCache.get(key);
    const targetPosition = Number.isFinite(rawPosition) ? rawPosition : Number(snapshot?.positionIndex) || 0;
    const forceAdvance =
      previous &&
      Number.isFinite(targetPosition) &&
      Math.abs(targetPosition - previous.position) >= 0.35;
    if (
      !previous ||
      forceAdvance ||
      previous.slot !== slot ||
      previous.cadenceSeconds !== cadenceSeconds ||
      previous.scopeKey !== scopeKey ||
      previous.signature !== signature
    ) {
      const nextPosition = targetPosition;
      const payload = { slot, cadenceSeconds, scopeKey, signature, position: nextPosition };
      state.markerStepCache.set(key, payload);
      state.markerPositions.set(key, nextPosition);
      return nextPosition;
    }
    state.markerPositions.set(key, previous.position);
    return previous.position;
  }

  function getStableAnimatedSnapshotPosition(state, snapshot, rawPosition) {
    const key = makeTrainKey(snapshot?.trainNo, snapshot?.originDate);
    const targetPosition = Number.isFinite(rawPosition) ? rawPosition : Number(snapshot?.positionIndex) || 0;
    state.markerPositions.set(key, targetPosition);
    return targetPosition;
  }

  function makeTrainKey(trainNo, originDate) {
    return `${trainNo}|${originDate || ""}`;
  }

  function focusTrainOnBoard(state, trainNo, originDate, options) {
    const map = state.output.querySelector(".rail-live-map");
    const board = state.output.querySelector(".rail-live-board");
    if (!map || !board) return;
    const key = makeTrainKey(trainNo, originDate);
    const escapedKey = window.CSS?.escape ? window.CSS.escape(key) : key.replace(/([^\w-])/g, "\\$1");
    map.querySelectorAll(".rail-live-train-label.is-active").forEach((item) => item.classList.remove("is-active"));
    const marker = map.querySelector(`.rail-live-train-label[data-train-key="${escapedKey}"]`);
    if (!marker) return;
    marker.classList.add("is-active");
    if (options?.scroll !== false) board.scrollIntoView({ behavior: "smooth", block: "center" });
    window.clearTimeout(state.focusTimer);
    state.focusTimer = window.setTimeout(() => marker.classList.remove("is-active"), 2400);
  }

  function closeStationModal(state) {
    if (!state.modal) return;
    state.modal.classList.add("hidden");
    state.modal.setAttribute("aria-hidden", "true");
  }

  function getBoardY(index, denominator, mapHeight) {
    const usableHeight = Math.max(1, mapHeight - MAP_PADDING_Y * 2);
    return MAP_PADDING_Y + (index / denominator) * usableHeight;
  }

  function findNearestVisibleTrainForUser(state, positionIndex) {
    const snapshots = state.visibleSnapshots || [];
    if (!Number.isFinite(positionIndex) || !snapshots.length) return null;
    let best = null;
    snapshots.forEach((snapshot) => {
      const trainPosition = getAnimatedSnapshotPosition(snapshot, state.renderedQueryDate);
      if (!Number.isFinite(trainPosition)) return;
      const diff = Math.abs(trainPosition - positionIndex);
      if (!best || diff < best.diff) best = { snapshot, diff };
    });
    return best && best.diff <= 0.38 ? best.snapshot : null;
  }

  function projectCoordsToRouteSegment(system, coords, segment) {
    const normalizedCoords = normalizeGeoCoords(coords);
    const stations = segment?.stations || [];
    if (!normalizedCoords || stations.length < 2) return null;
    let best = null;
    for (let index = 0; index < stations.length - 1; index += 1) {
      const fromGeo = getStationGeo(system, stations[index]);
      const toGeo = getStationGeo(system, stations[index + 1]);
      if (!fromGeo || !toGeo) continue;
      const projection = projectGeoPointToSegment(normalizedCoords, fromGeo, toGeo);
      if (!projection) continue;
      const candidate = {
        ...projection,
        segment,
        fromStation: stations[index],
        toStation: stations[index + 1],
        positionIndex: index + projection.ratio,
      };
      if (!best || candidate.distanceMeters < best.distanceMeters) best = candidate;
    }
    return best;
  }

  function findBestUserLocationSegment(state, coords) {
    const normalizedCoords = normalizeGeoCoords(coords);
    if (!state || !normalizedCoords) return null;
    let best = null;
    getRouteGroupsForSystem(state.system).forEach((group) => {
      (group.segments || []).forEach((segment) => {
        const candidate = projectCoordsToRouteSegment(state.system, normalizedCoords, { ...segment, groupTitle: group.title });
        if (!candidate) return;
        if (!best || candidate.distanceMeters < best.distanceMeters) best = candidate;
      });
    });
    return best;
  }

  function maybeSwitchToUserRoute(state, coords, options = {}) {
    if (!state?.userLocationEnabled || state.system !== "tr" || !state.routeSelect) return false;
    const best = findBestUserLocationSegment(state, coords);
    if (!best?.segment?.id || best.distanceMeters > USER_LOCATION_MAX_FAR_KM * 1000) return false;
    if (state.routeSelect.value === best.segment.id) return false;
    state.routeSelect.value = best.segment.id;
    if (state.searchInput && parseExactTrainQuery(state.searchInput.value)) state.searchInput.value = "";
    if (options.render !== false && typeof state.runRender === "function") state.runRender();
    return true;
  }

  function projectUserLocationToRoute(state) {
    const coords = state.userLocation?.coords || null;
    const stations = state.segment?.stations || [];
    const best = projectCoordsToRouteSegment(state.system, coords, state.segment);
    if (!best || stations.length < 2) return null;
    const stationLabel = best.ratio <= 0.12
      ? `${best.fromStation}站附近`
      : best.ratio >= 0.88
        ? `${best.toStation}站附近`
        : `${best.fromStation} → ${best.toStation}間`;
    const nearbyTrain = findNearestVisibleTrainForUser(state, best.positionIndex);
    const distanceKm = best.distanceMeters / 1000;
    return {
      ...best,
      label: "你的位置",
      stationLabel,
      nearbyTrain,
      isFar: distanceKm > USER_LOCATION_MAX_FAR_KM,
      title: [
        `你的位置：${stationLabel}`,
        nearbyTrain ? `可能接近 ${nearbyTrain.trainNo} 次` : "",
        Number.isFinite(best.distanceMeters) ? `距目前路線約 ${distanceKm >= 1 ? `${distanceKm.toFixed(1)} 公里` : `${Math.round(best.distanceMeters)} 公尺`}` : "",
        Number.isFinite(coords.accuracy) ? `定位精度約 ${Math.round(coords.accuracy)} 公尺` : "",
      ].filter(Boolean).join("\n"),
    };
  }

  function ensureUserLocationMarker(state) {
    const map = state.output.querySelector(".rail-live-map");
    if (!map) return null;
    let marker = map.querySelector(".rail-live-user-location");
    if (!marker) {
      marker = document.createElement("div");
      marker.className = "rail-live-user-location";
      marker.setAttribute("aria-label", "你的位置");
      marker.innerHTML = `
        <span class="rail-live-user-dot" aria-hidden="true"></span>
        <span class="rail-live-user-label">你的位置</span>
      `;
      map.appendChild(marker);
    }
    state.userLocationMarker = marker;
    return marker;
  }

  function updateUserLocationMarker(state) {
    const map = state.output.querySelector(".rail-live-map");
    const stations = state.segment?.stations || [];
    const marker = state.userLocationMarker || map?.querySelector(".rail-live-user-location") || ensureUserLocationMarker(state);
    if (!map || !marker || !stations.length) return;
    if (!state.userLocationEnabled) {
      marker.hidden = true;
      return;
    }
    const projection = projectUserLocationToRoute(state);
    if (!projection) {
      marker.hidden = true;
      return;
    }
    const denominator = Math.max(1, stations.length - 1);
    const mapHeight = map.clientHeight || getBoardHeight(stations);
    marker.hidden = false;
    marker.classList.toggle("is-far", projection.isFar);
    marker.style.top = `${getBoardY(projection.positionIndex, denominator, mapHeight)}px`;
    marker.title = projection.title;
    const label = marker.querySelector(".rail-live-user-label");
    if (label) {
      label.textContent = projection.nearbyTrain
        ? `你的位置 · ${projection.nearbyTrain.trainNo}次附近`
        : "你的位置";
    }
  }

  function setUserLocationCoords(state, coords, source) {
    const normalized = normalizeGeoCoords(coords);
    if (!state || !normalized) return;
    state.userLocation = {
      ...(state.userLocation || {}),
      coords: normalized,
      source: source || "browser",
      updatedAt: Date.now(),
    };
    if (source !== "shared-storage") persistSharedGeoSnapshot(normalized, source || "live-tracker");
    if (!state.userLocationEnabled) return;
    if (maybeSwitchToUserRoute(state, normalized)) return;
    updateUserLocationMarker(state);
  }

  function readUserLocationEnabled() {
    try {
      return localStorage.getItem(USER_LOCATION_ENABLED_KEY) === "true";
    } catch (_) {
      return false;
    }
  }

  function writeUserLocationEnabled(enabled) {
    try {
      localStorage.setItem(USER_LOCATION_ENABLED_KEY, enabled ? "true" : "false");
    } catch (_) {
    }
  }

  function syncUserLocationToggleButton(state) {
    const button = state?.userLocationButton;
    if (!button) return;
    const enabled = Boolean(state.userLocationEnabled);
    button.setAttribute("aria-pressed", enabled ? "true" : "false");
    button.textContent = enabled ? "關閉位置" : "顯示目前位置";
    button.title = enabled ? "關閉路線上的目前位置藍點" : "在路線上顯示目前位置藍點";
  }

  function stopUserLocationTracking(state) {
    if (!state) return;
    if (state.userLocationWatchId != null && navigator.geolocation?.clearWatch) {
      try {
        navigator.geolocation.clearWatch(state.userLocationWatchId);
      } catch (_) {
      }
    }
    state.userLocationWatchId = null;
    if (state.userLocationMarker) state.userLocationMarker.hidden = true;
  }

  function setUserLocationEnabled(state, enabled) {
    if (!state) return;
    state.userLocationEnabled = Boolean(enabled);
    writeUserLocationEnabled(state.userLocationEnabled);
    syncUserLocationToggleButton(state);
    if (!state.userLocationEnabled) {
      stopUserLocationTracking(state);
      return;
    }
    const cached = readSharedGeoSnapshot();
    if (cached) {
      state.userLocation = { ...(state.userLocation || {}), coords: cached, source: "shared", updatedAt: cached.ts || Date.now() };
      if (maybeSwitchToUserRoute(state, cached)) return;
    }
    ensureUserLocationTracking(state);
    updateUserLocationMarker(state);
  }

  function ensureUserLocationTracking(state) {
    if (!state) return;
    if (!state.userLocationEnabled) {
      stopUserLocationTracking(state);
      return;
    }
    const cached = readSharedGeoSnapshot();
    if (cached && !state.userLocation?.coords) {
      state.userLocation = { ...(state.userLocation || {}), coords: cached, source: "shared", updatedAt: cached.ts || Date.now() };
    }
    if (state.userLocation?.coords) updateUserLocationMarker(state);
    if (!navigator.geolocation || state.userLocationWatchId != null) return;

    const startWatch = () => {
      if (state.userLocationWatchId != null) return;
      state.userLocationWatchId = navigator.geolocation.watchPosition(
        (position) => setUserLocationCoords(state, position?.coords, "live-watch"),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
      );
    };

    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" }).then((permission) => {
        if (permission.state === "granted" || permission.state === "prompt") startWatch();
      }).catch(startWatch);
      return;
    }
    startWatch();
  }

  function openTrainDetail(trainNo, originDate) {
    if (typeof window.showTrainDetails === "function") {
      try {
        window.showTrainDetails(String(trainNo), originDate || getQueryDate());
      } catch (_) {
      }
    }
  }

  function renderStationDetail(state, stationName) {
    if (!state.modal || !state.modalTitle || !state.modalBody) return;
    state.activeStation = stationName || "";
    const events = stationName ? state.stationEvents.get(stationName) || [] : [];
    state.modalTitle.textContent = stationName ? `${stationName} 站即時動態` : "車站即時動態";
    state.modalBody.innerHTML = `
      <div class="rail-live-detail-list">
        ${
          stationName
            ? events.length
              ? events
                  .map(
                    (event) => `
                      <article class="rail-live-detail-card">
                        <div class="rail-live-detail-title">${buildTrainTitleHTML(state.system, event.snapshot, true)}</div>
                        <div class="rail-live-detail-meta">${escapeHtml(event.kind)}｜${escapeHtml(event.station)}｜${escapeHtml(event.timeText)}${Number.isFinite(event.minutesAway) && event.minutesAway > 0 ? `｜${escapeHtml(formatMinutesAway(event.minutesAway))} 分後` : ""}</div>
                        <div class="rail-live-detail-actions">
                          <button type="button" class="rail-live-mini-btn" data-train-focus="${escapeHtml(makeTrainKey(event.trainNo, event.originDate))}">定位列車</button>
                          <button type="button" class="rail-live-mini-btn" data-train-detail="${escapeHtml(event.trainNo)}" data-origin-date="${escapeHtml(event.originDate || getQueryDate())}">查看詳情</button>
                        </div>
                      </article>
                    `
                  )
                  .join("")
              : `<div class="rail-live-empty">接下來 ${STATION_ALERT_WINDOW} 分鐘內沒有即將通過、進站、停靠或發車的列車。</div>`
            : `<div class="rail-live-empty">請先點選路線上的車站。</div>`
        }
      </div>
    `;
    state.modal.classList.remove("hidden");
    state.modal.setAttribute("aria-hidden", "false");
    state.modalBody.querySelectorAll("[data-train-focus]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.getAttribute("data-train-focus") || "";
        const [trainNo, originDate] = value.split("|");
        focusTrainOnBoard(state, trainNo, originDate);
      });
    });
    state.modalBody.querySelectorAll("[data-train-detail]").forEach((button) => {
      button.addEventListener("click", () => {
        const trainNo = button.getAttribute("data-train-detail");
        const originDate = button.getAttribute("data-origin-date");
        if (state.variant === "modern") setFocusedSnapshot(state, trainNo, originDate, { scroll: false });
        openTrainDetail(trainNo, originDate);
      });
    });
  }

  function buildFeedCardHTML(system, snapshot) {
    const title = buildTrainTitleHTML(system, snapshot, false);
    return `
      <article class="rail-live-card" style="--rail-live-color:${escapeHtml(getEntryColor(system, snapshot))}" data-train-key="${escapeHtml(makeTrainKey(snapshot.trainNo, snapshot.originDate))}">
        <div class="rail-live-card-head">
          <div class="rail-live-card-title">${title}</div>
          <span class="rail-live-card-status">${buildStatusHTML(snapshot)}</span>
        </div>
        <div class="rail-live-card-route">${escapeHtml(snapshot.displayRoute)}</div>
        <div class="rail-live-card-list">
          <div>${escapeHtml(buildSnapshotLocationLine(snapshot))}</div>
          <div>${escapeHtml(buildSnapshotNextLine(snapshot))}</div>
          <div>全程：${escapeHtml(`${Math.round(snapshot.totalMinutes)} 分鐘`)}｜已行駛：${escapeHtml(`${Math.round(snapshot.elapsedMinutes)} 分鐘`)}（${escapeHtml((snapshot.completionRatio * 100).toFixed(1))}%）</div>
          <div>剩餘：${escapeHtml(String(Math.round(snapshot.remainingMinutes)))} 分鐘</div>
        </div>
        <div class="rail-live-card-actions"><button type="button" class="rail-live-mini-btn" data-train-detail="${escapeHtml(snapshot.trainNo)}" data-origin-date="${escapeHtml(snapshot.originDate || snapshot.queryDate)}">查看詳情</button></div>
      </article>
    `;
  }

  function getVisibleSnapshots(snapshots) {
    return sortSnapshotsByTrainNo((snapshots || []).filter((snapshot) => snapshot.state !== "arrived"));
  }

  function getSnapshotPriority(snapshot) {
    if (!snapshot) return -1;
    if (snapshot.state === "running") return 4;
    if (snapshot.state === "dwell") return 3;
    if (snapshot.state === "upcoming") return 2;
    if (snapshot.state === "arrived") return 1;
    return 0;
  }

  function resolveTrainSearchTarget(state, entries, trainNo, queryDate) {
    if (!trainNo) return null;
    const groups = getRouteGroupsForSystem(state.system);
    let best = null;
    entries
      .filter((entry) => sameTrainNo(entry.trainNo, trainNo))
      .forEach((entry) => {
        groups.forEach((group) => {
          (group.segments || []).forEach((segment) => {
            if (!matchesSegmentEntry(entry, segment)) return;
            const projections = buildRouteProjections(entry, segment.stations || [], state.system, queryDate);
            const snapshots = (projections || []).map((projection) => buildSnapshot(projection, state.system, queryDate)).filter(Boolean);
            const visibleSnapshots = getVisibleSnapshots(snapshots);
            const matchedSnapshot = visibleSnapshots.find((snapshot) => sameTrainNo(snapshot.trainNo, trainNo)) || null;
            if (!matchedSnapshot) return;
            const priority = getSnapshotPriority(matchedSnapshot);
            const completion = Number.isFinite(matchedSnapshot.completionRatio) ? matchedSnapshot.completionRatio : -1;
            if (!best || priority > best.priority || (priority === best.priority && completion > best.completion)) {
              best = {
                entry,
                segment: { ...segment, groupTitle: group.title },
                snapshot: matchedSnapshot,
                priority,
                completion
              };
            }
          });
        });
      });
    return best;
  }

  function getDefaultFocusedSnapshot(snapshots) {
    const list = snapshots || [];
    return (
      list.find((snapshot) => /晚\d+分/.test(snapshot.statusText || "") && snapshot.state !== "upcoming") ||
      list.find((snapshot) => snapshot.state === "running") ||
      list.find((snapshot) => snapshot.state === "dwell") ||
      list.find((snapshot) => snapshot.state === "upcoming") ||
      list[0] ||
      null
    );
  }

  function resolveFocusedSnapshot(state, snapshots) {
    const list = snapshots || [];
    const current = list.find((snapshot) => makeTrainKey(snapshot.trainNo, snapshot.originDate) === state.selectedTrainKey);
    if (current) return current;
    const fallback = getDefaultFocusedSnapshot(list);
    state.selectedTrainKey = fallback ? makeTrainKey(fallback.trainNo, fallback.originDate) : "";
    return fallback;
  }

  function buildUpcomingEventList(stationEvents, limit) {
    const seen = new Set();
    const items = [];
    (stationEvents || new Map()).forEach((events) => {
      (events || []).forEach((event) => {
        const key = `${event.trainNo}|${event.originDate || ""}|${event.station}|${event.kind}|${event.timeText}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push(event);
      });
    });
    return items
      .sort(
        (a, b) =>
          (Number.isFinite(a.minutesAway) ? a.minutesAway : Number.POSITIVE_INFINITY) - (Number.isFinite(b.minutesAway) ? b.minutesAway : Number.POSITIVE_INFINITY) ||
          (a.timeMinute || 0) - (b.timeMinute || 0) ||
          String(a.trainNo || "").localeCompare(String(b.trainNo || ""), "en")
      )
      .slice(0, limit || 12);
  }

  function buildFocusCardHTML(system, snapshot) {
    if (!snapshot) return `<div class="rail-live-empty">目前沒有可聚焦的列車。</div>`;
    const progressPercent = clamp(snapshot.completionRatio || 0, 0, 1) * 100;
    return `
      <article class="rail-live-v2-focus-card" style="--rail-live-color:${escapeHtml(getEntryColor(system, snapshot))}">
        <div class="rail-live-v2-focus-head">
          <div class="rail-live-v2-focus-title">${buildTrainTitleHTML(system, snapshot, false)}</div>
          <span class="rail-live-card-status">${buildStatusHTML(snapshot)}</span>
        </div>
        <div class="rail-live-v2-focus-route">${escapeHtml(snapshot.displayRoute)}</div>
        <div class="rail-live-v2-focus-grid">
          <div class="rail-live-v2-focus-cell"><span>目前位置</span><strong>${escapeHtml(buildSnapshotLocationLine(snapshot))}</strong></div>
          <div class="rail-live-v2-focus-cell"><span>下一動態</span><strong>${escapeHtml(buildSnapshotNextLine(snapshot))}</strong></div>
          <div class="rail-live-v2-focus-cell"><span>行駛時間</span><strong>${escapeHtml(`${Math.round(snapshot.totalMinutes)} 分鐘`)}</strong></div>
          <div class="rail-live-v2-focus-cell"><span>剩餘時間</span><strong>${escapeHtml(`${Math.round(snapshot.remainingMinutes)} 分鐘`)}</strong></div>
        </div>
        <div class="rail-live-v2-progress"><span style="width:${progressPercent.toFixed(1)}%"></span></div>
        <div class="rail-live-v2-progress-meta">已行駛 ${escapeHtml(String(Math.round(snapshot.elapsedMinutes)))} 分鐘｜完成 ${escapeHtml(progressPercent.toFixed(1))}%</div>
        <div class="rail-live-card-actions">
          <button type="button" class="rail-live-mini-btn" data-train-focus="${escapeHtml(makeTrainKey(snapshot.trainNo, snapshot.originDate))}">定位列車</button>
          <button type="button" class="rail-live-mini-btn" data-train-detail="${escapeHtml(snapshot.trainNo)}" data-origin-date="${escapeHtml(snapshot.originDate || snapshot.queryDate)}">查看詳情</button>
        </div>
      </article>
    `;
  }

  function buildUpcomingEventCardHTML(system, event) {
    return `
      <article class="rail-live-v2-event-card" data-train-key="${escapeHtml(makeTrainKey(event.trainNo, event.originDate))}">
        <div class="rail-live-v2-event-title">${buildTrainTitleHTML(system, event.snapshot, false)}</div>
        <div class="rail-live-v2-event-meta">${escapeHtml(`${event.station}｜${event.kind}｜${event.timeText}`)}${Number.isFinite(event.minutesAway) && event.minutesAway > 0 ? `｜${escapeHtml(formatMinutesAway(event.minutesAway))} 分後` : ""}</div>
        <div class="rail-live-v2-event-line">${escapeHtml(buildSnapshotLocationLine(event.snapshot))}</div>
        <div class="rail-live-detail-actions">
          <button type="button" class="rail-live-mini-btn" data-train-focus="${escapeHtml(makeTrainKey(event.trainNo, event.originDate))}">聚焦列車</button>
          <button type="button" class="rail-live-mini-btn" data-train-detail="${escapeHtml(event.trainNo)}" data-origin-date="${escapeHtml(event.originDate || event.snapshot?.queryDate || getQueryDate())}">查看詳情</button>
        </div>
      </article>
    `;
  }

  function updateSelectedTrainStyling(state) {
    if (state.variant !== "modern") return;
    state.output.querySelectorAll(".rail-live-card[data-train-key], .rail-live-v2-event-card[data-train-key]").forEach((item) => {
      item.classList.toggle("is-selected", item.getAttribute("data-train-key") === state.selectedTrainKey);
    });
  }

  function renderTrackerV2Sidebars(state) {
    if (state.variant !== "modern") return;
    const focusHost = state.output.querySelector("[data-live-v2-focus]");
    const trainsHost = state.output.querySelector("[data-live-v2-trains]");
    if (!focusHost || !trainsHost) return;

    const visibleSnapshots = state.visibleSnapshots || [];
    const focusedSnapshot = resolveFocusedSnapshot(state, visibleSnapshots);

    focusHost.innerHTML = buildFocusCardHTML(state.system, focusedSnapshot);
    trainsHost.innerHTML = visibleSnapshots.length
      ? `<div class="rail-live-feed-list">${visibleSnapshots.map((snapshot) => buildFeedCardHTML(state.system, snapshot)).join("")}</div>`
      : `<div class="rail-live-empty">目前沒有符合條件、且仍在此路線上的列車。</div>`;

    bindRenderedOutput(state);
    bindTrackerV2Output(state);
    updateSelectedTrainStyling(state);
  }

  function setFocusedSnapshot(state, trainNo, originDate, options) {
    const key = makeTrainKey(trainNo, originDate);
    state.selectedTrainKey = key;
    if (state.variant === "modern") renderTrackerV2Sidebars(state);
    if (options?.highlight === false) return;
    focusTrainOnBoard(state, trainNo, originDate, { scroll: options?.scroll !== false });
  }

  function resolveTrackerRouteForEntry(state, entry, queryDate) {
    if (!entry) return "";
    if (state.system === "thsr") return "thsr-main";
    const groups = getRailNetwork()?.getTraSegmentGroups?.() || [];
    let bestSegment = "";
    let bestPriority = -1;
    groups.forEach((group) => {
      (group.segments || []).forEach((segment) => {
        if (!matchesSegmentEntry(entry, segment)) return;
        const projections = buildRouteProjections(entry, segment.stations || [], state.system, queryDate || getQueryDate());
        const visibleSnapshots = getVisibleSnapshots((projections || []).map((projection) => buildSnapshot(projection, state.system, queryDate || getQueryDate())).filter(Boolean));
        const topSnapshot = visibleSnapshots[0] || null;
        const priority = getSnapshotPriority(topSnapshot);
        if (priority > bestPriority) {
          bestPriority = priority;
          bestSegment = segment.id || bestSegment;
        }
        if (!bestSegment && segment?.id) bestSegment = segment.id;
      });
    });
    return bestSegment;
  }

  async function focusTrainInTracker(state, trainNo, originDate, options) {
    if (!state || !trainNo) return false;
    if (!(await ensureLiveTrackerAccess())) return false;
    window.switchQueryPanel?.(state.config.panelId);
    const queryDate = getQueryDate();
    const scheduleSources = await ensureScheduleReady(state.system);
    const entries = buildEntries(state.system, scheduleSources);
    const matchedEntry =
      entries.find((entry) => String(entry.trainNo) === String(trainNo) && String(entry.originDate || "") === String(originDate || "")) ||
      entries.find((entry) => String(entry.trainNo) === String(trainNo));
    const routeId = resolveTrackerRouteForEntry(state, matchedEntry, queryDate);
    if (routeId && state.routeSelect && state.routeSelect.value !== routeId) {
      state.routeSelect.value = routeId;
    }
    state.selectedTrainKey = makeTrainKey(trainNo, originDate);
    const render = state.variant === "modern" ? renderTrackerV2 : renderTracker;
    await render(state);
    setFocusedSnapshot(state, trainNo, originDate, { scroll: options?.scroll !== false });
    return true;
  }

  async function locateTrainIntoTracker(state, button) {
    const locator = state?.system === "tr" ? window.locateTraRunningTrainByPosition : window.locateThsrRunningTrainByPosition;
    if (typeof locator !== "function") throw new Error("定位找車次尚未就緒");
    const previousText = button?.textContent || "定位";
    if (button) {
      button.disabled = true;
      button.textContent = "定位中…";
    }
    try {
      const result = await locator({ applyTrainQuery: false });
      const entry = result?.entry || null;
      if (!entry?.trainNo) throw new Error("附近沒有可判定的行駛中列車");
      await focusTrainInTracker(state, entry.trainNo, entry.originDate, { scroll: true });
      return true;
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = previousText;
      }
    }
  }

  function getCachedTrainSnapshot(state, trainNo, originDate) {
    const primarySnapshots = Array.isArray(state?.primarySnapshots) ? state.primarySnapshots : [];
    const cachedVisibleSnapshots = primarySnapshots.length
      ? primarySnapshots
      : getPrimarySnapshotsByTrain(Array.isArray(state?.visibleSnapshots) ? state.visibleSnapshots : []);
    const snapshots = Array.isArray(state?.snapshots) ? state.snapshots : [];
    const searchPools = [cachedVisibleSnapshots, snapshots].filter((pool) => Array.isArray(pool) && pool.length);
    if (!searchPools.length) return null;
    const exactKey = makeTrainKey(trainNo, originDate);
    const pickBest = (items) =>
      (items || []).slice().sort((a, b) => {
        const priorityDelta = getSnapshotPriority(b) - getSnapshotPriority(a);
        if (priorityDelta) return priorityDelta;
        const completionA = Number.isFinite(a?.completionRatio) ? a.completionRatio : -1;
        const completionB = Number.isFinite(b?.completionRatio) ? b.completionRatio : -1;
        return completionB - completionA;
      })[0] || null;
    for (const pool of searchPools) {
      const exact = pickBest(pool.filter((snapshot) => makeTrainKey(snapshot.trainNo, snapshot.originDate || snapshot.queryDate) === exactKey));
      if (exact) return exact;
      const sameOrigin = pickBest(pool.filter((snapshot) => sameTrainNo(snapshot.trainNo, trainNo) && (!originDate || String(snapshot.originDate || snapshot.queryDate || "") === String(originDate || ""))));
      if (sameOrigin) return sameOrigin;
      const sameTrain = pickBest(pool.filter((snapshot) => sameTrainNo(snapshot.trainNo, trainNo)));
      if (sameTrain) return sameTrain;
    }
    return null;
  }

  function buildSingleTrainSnapshot(system, trainNo, originDate, options = {}) {
    const queryDate = options?.queryDate || getQueryDate();
    const baseSchedule = readPageValue("baseSchedule") || window.trainSchedule || {};
    const prevSchedule = readPageValue("prevSchedule") || {};
    const scheduleSources = [];
    if (baseSchedule && Object.keys(baseSchedule).length) scheduleSources.push({ map: baseSchedule, originDate: queryDate });
    if (prevSchedule && Object.keys(prevSchedule).length) scheduleSources.push({ map: prevSchedule, originDate: addDays(queryDate, -1) });
    if (!scheduleSources.length) return null;

    const entries = buildEntries(system, scheduleSources).filter((entry) => sameTrainNo(entry.trainNo, trainNo));
    const matchedEntry =
      entries.find((entry) => String(entry.originDate || "") === String(originDate || "")) ||
      entries[0] ||
      null;
    if (!matchedEntry) return null;

    const routeStations = Array.isArray(matchedEntry.fullPathStations) && matchedEntry.fullPathStations.length
      ? matchedEntry.fullPathStations.slice()
      : expandEntryPathStations(system, matchedEntry.stops || []);
    if (routeStations.length < 2) return null;

    const projections = buildRouteProjections(matchedEntry, routeStations, system, queryDate);
    const snapshots = dedupeCircularSnapshots(
      projections
        .map((projection) => buildSnapshot(projection, system, queryDate))
        .concat(system === "tr" ? buildSharedStationOnlySnapshots([matchedEntry], { stations: routeStations }, system, queryDate) : [])
        .filter(Boolean)
    );
    if (!snapshots.length) return null;
    const exactKey = makeTrainKey(trainNo, originDate || matchedEntry.originDate);
    const pickBest = (items) =>
      (items || []).slice().sort((a, b) => {
        const priorityDelta = getSnapshotPriority(b) - getSnapshotPriority(a);
        if (priorityDelta) return priorityDelta;
        const completionA = Number.isFinite(a?.completionRatio) ? a.completionRatio : -1;
        const completionB = Number.isFinite(b?.completionRatio) ? b.completionRatio : -1;
        return completionB - completionA;
      })[0] || null;
    return (
      pickBest(snapshots.filter((snapshot) => makeTrainKey(snapshot.trainNo, snapshot.originDate || snapshot.queryDate) === exactKey)) ||
      pickBest(snapshots) ||
      null
    );
  }

  function bindTrackerV2Output(state) {
    if (state.variant !== "modern") return;
    state.output.querySelectorAll(".rail-live-v2-event-card[data-train-key]").forEach((card) => {
      card.addEventListener("click", () => {
        const value = card.getAttribute("data-train-key") || "";
        const [trainNo, originDate] = value.split("|");
        setFocusedSnapshot(state, trainNo, originDate, { scroll: true });
      });
    });
    state.output.querySelectorAll("[data-live-v2-focus] [data-train-focus]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const value = button.getAttribute("data-train-focus") || "";
        const [trainNo, originDate] = value.split("|");
        setFocusedSnapshot(state, trainNo, originDate, { scroll: true });
      });
    });
    state.output.querySelectorAll("[data-live-v2-focus] [data-train-detail]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const trainNo = button.getAttribute("data-train-detail");
        const originDate = button.getAttribute("data-origin-date");
        setFocusedSnapshot(state, trainNo, originDate, { scroll: false });
        openTrainDetail(trainNo, originDate);
      });
    });
    state.output.querySelectorAll("[data-live-locate-train]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        try {
          await locateTrainIntoTracker(state, button);
        } catch (error) {
          alert(error?.message || "定位失敗，請稍後再試");
        }
      });
    });
  }

  function bindRenderedOutput(state) {
    state.output.querySelectorAll(".rail-live-card[data-train-key]").forEach((card) => {
      card.addEventListener("click", () => {
        const value = card.getAttribute("data-train-key") || "";
        const [trainNo, originDate] = value.split("|");
        if (state.variant === "modern") {
          setFocusedSnapshot(state, trainNo, originDate, { scroll: true });
        } else {
          focusTrainOnBoard(state, trainNo, originDate);
        }
      });
    });
    state.output.querySelectorAll(".rail-live-card [data-train-detail]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const trainNo = button.getAttribute("data-train-detail");
        const originDate = button.getAttribute("data-origin-date");
        if (state.variant === "modern") setFocusedSnapshot(state, trainNo, originDate, { scroll: false });
        openTrainDetail(trainNo, originDate);
      });
    });
  }

  function renderBoard(state, segment, snapshots) {
    const map = state.output.querySelector(".rail-live-map");
    if (!map) return;
    state.markerBindings = [];
    const stations = segment.stations || [];
    const denominator = Math.max(1, stations.length - 1);
    const mapHeight = map.clientHeight || getBoardHeight(stations);

    stations.forEach((station, index) => {
      const top = getBoardY(index, denominator, mapHeight);
      const events = state.stationEvents.get(station) || [];
      const isSoon = events.some(
        (event) => event.kind !== "即將通過" && Number.isFinite(event.minutesAway) && event.minutesAway <= STATION_SOON_WINDOW
      );
      const button = document.createElement("button");
      button.type = "button";
      button.className = `rail-live-station ${events.length ? "has-alert" : ""} ${events.some((event) => event.kind === "停靠中" || event.kind === "已到終點") ? "is-busy" : ""} ${isSoon ? "is-soon" : ""} ${state.activeStation === station ? "active" : ""}`;
      button.style.top = `${top}px`;
      button.dataset.station = station;
      button.innerHTML = `
        <span class="rail-live-station-name">${escapeHtml(isSoon ? `${station}🔜` : station)}</span>
        <span class="rail-live-station-node"></span>
      `;
      button.addEventListener("click", () => renderStationDetail(state, station));
      map.appendChild(button);
    });

    const visibleSnapshots = getVisibleSnapshots(snapshots);
    visibleSnapshots.forEach((snapshot) => {
      const anchorY = getBoardY(snapshot.positionIndex, denominator, mapHeight);
      const side = getDirectionKey(state.system, snapshot.trainNo) === "even" || getDirectionKey(state.system, snapshot.trainNo) === "north" ? "left" : "right";
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = `rail-live-train-label ${side} ${snapshot.isSoonStop ? "is-blinking" : ""}`;
      marker.dataset.trainKey = makeTrainKey(snapshot.trainNo, snapshot.originDate);
      marker.style.top = `${anchorY}px`;
      marker.style.setProperty("--rail-live-color", getEntryColor(state.system, snapshot));
      marker.innerHTML = `
        <span class="rail-live-train-anchor">${escapeHtml(snapshot.directionGlyph)}</span>
        <span class="rail-live-train-connector"></span>
        <span class="rail-live-train-copy">
          <strong>🚆${escapeHtml(snapshot.trainNo)} ${state.system === "tr" ? renderTraTypeHTML(snapshot.type) : escapeHtml(snapshot.type || "高鐵")}</strong>
        </span>
      `;
      marker.addEventListener("click", () => {
        if (state.variant === "modern") {
          setFocusedSnapshot(state, snapshot.trainNo, snapshot.originDate || snapshot.queryDate, { scroll: false });
          openTrainDetail(snapshot.trainNo, snapshot.originDate || snapshot.queryDate);
        } else {
          openTrainDetail(snapshot.trainNo, snapshot.originDate || snapshot.queryDate);
        }
      });
      map.appendChild(marker);
      state.markerBindings.push({ marker, snapshot });
    });

    const visibleKeys = new Set(visibleSnapshots.map((snapshot) => makeTrainKey(snapshot.trainNo, snapshot.originDate)));
    Array.from(state.markerPositions.keys()).forEach((key) => {
      if (!visibleKeys.has(key)) state.markerPositions.delete(key);
    });
    Array.from(state.markerStepCache.keys()).forEach((key) => {
      if (!visibleKeys.has(key)) state.markerStepCache.delete(key);
    });

    if (!visibleSnapshots.length) {
      const empty = document.createElement("div");
      empty.className = "rail-live-board-empty";
      empty.textContent = "目前沒有符合條件、且仍在此路線上的列車。";
      map.appendChild(empty);
    }
    syncUserLocationToggleButton(state);
    if (state.userLocationEnabled) {
      ensureUserLocationTracking(state);
      updateUserLocationMarker(state);
    } else if (state.userLocationMarker) {
      state.userLocationMarker.hidden = true;
    }
  }

  function stopBoardAnimation(state) {
    if (state.animationFrame) {
      window.cancelAnimationFrame(state.animationFrame);
      state.animationFrame = 0;
    }
    state.lastAnimationFrameMs = 0;
    state.animationDeltaSeconds = 0.016;
  }

  function runBoardAnimation(state) {
    stopBoardAnimation(state);
    const tick = () => {
      if (state.panel.classList.contains("hidden")) {
        state.animationFrame = 0;
        return;
      }
      const map = state.output.querySelector(".rail-live-map");
      const stations = state.segment?.stations || [];
      if (!map || !stations.length || (!state.markerBindings?.length && (!state.userLocationEnabled || !state.userLocation?.coords))) {
        state.animationFrame = 0;
        return;
      }
      const nowMs = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      const lastFrameMs = Number(state.lastAnimationFrameMs) || nowMs;
      state.animationDeltaSeconds = Math.max(0.016, Math.min(0.25, (nowMs - lastFrameMs) / 1000 || 0.016));
      state.lastAnimationFrameMs = nowMs;
      const denominator = Math.max(1, stations.length - 1);
      const mapHeight = map.clientHeight || getBoardHeight(stations);
      state.markerBindings.forEach(({ marker, snapshot }) => {
        if (!marker?.isConnected || !snapshot) return;
        const rawPosition = getAnimatedSnapshotPosition(snapshot, state.renderedQueryDate);
        const animationMode = getSnapshotAnimationMode(snapshot);
        const stablePosition = animationMode.type === "stepped"
          ? getSteppedSnapshotPosition(state, snapshot, rawPosition, animationMode.cadenceSeconds)
          : getStableAnimatedSnapshotPosition(state, snapshot, rawPosition);
        const anchorY = getBoardY(stablePosition, denominator, mapHeight);
        marker.style.top = `${anchorY}px`;
      });
      if (state.userLocationEnabled) updateUserLocationMarker(state);
      state.animationFrame = window.requestAnimationFrame(tick);
    };
    tick();
  }

  async function collectTrackerRenderData(state) {
    state.renderedQueryDate = getQueryDate();
    const scheduleSources = await ensureScheduleReady(state.system);
    if (!scheduleSources.length) {
      return { errorHtml: `<div class="rail-live-empty">${escapeHtml(state.system === "tr" ? "台鐵" : "高鐵")}真實班表尚未就緒，請先更新頁面資料後再試。</div>` };
    }

    const groups = getRouteGroupsForSystem(state.system);
    let segment = null;
    const queryDate = getQueryDate();
    const userRouteCoords = state.userLocation?.coords || (state.userLocationEnabled ? readSharedGeoSnapshot() : null);
    if (userRouteCoords) maybeSwitchToUserRoute(state, userRouteCoords, { render: false });
    const queryText = String(state.searchInput.value || "").trim();
    const exactTrainQuery = parseExactTrainQuery(queryText);
    const directionValue = state.directionSelect.value || "all";
    const allEntries = buildEntries(state.system, scheduleSources);
    const directionalEntries = exactTrainQuery
      ? allEntries
      : allEntries.filter((entry) => matchesDirection(state.system, entry.trainNo, directionValue));
    if (exactTrainQuery) {
      const target = resolveTrainSearchTarget(state, directionalEntries, exactTrainQuery, queryDate);
      if (!target) {
        state.selectedTrainKey = "";
        return { errorHtml: `<div class="rail-live-empty">該車次未行駛。</div>` };
      }
      segment = target.segment;
      if (state.routeSelect && state.routeSelect.value !== target.segment.id) {
        state.routeSelect.value = target.segment.id;
      }
      state.selectedTrainKey = makeTrainKey(target.entry.trainNo, target.entry.originDate);
    } else {
      groups.some((group) => (group.segments || []).some((candidate) => (candidate.id === state.routeSelect.value ? ((segment = { ...candidate, groupTitle: group.title }), true) : false)));
      if (!segment) {
        const fallbackGroup = groups[0];
        const fallback = fallbackGroup?.segments?.[0];
        segment = fallback ? { ...fallback, groupTitle: fallbackGroup.title } : null;
      }
    }
    if (!segment?.stations?.length) {
      return { errorHtml: `<div class="rail-live-empty">此路線站點資料尚未完成。</div>` };
    }
    const routeEntries = directionalEntries.filter((entry) => matchesSegmentEntry(entry, segment));
    const projectedEntries = routeEntries.flatMap((entry) => buildRouteProjections(entry, segment.stations, state.system, queryDate));
    const sharedStationSnapshots = buildSharedStationOnlySnapshots(directionalEntries, segment, state.system, queryDate);

    const snapshots = dedupeCircularSnapshots(
      projectedEntries
        .map((entry) => buildSnapshot(entry, state.system, queryDate))
        .concat(sharedStationSnapshots)
        .filter(Boolean)
        .filter((snapshot) => !queryText || snapshot.trainNo.includes(queryText) || snapshot.type.includes(queryText) || snapshot.firstStation.includes(queryText) || snapshot.lastStation.includes(queryText))
    );
    const primarySnapshots = getDisplaySnapshots(state.system, snapshots);

    state.snapshots = snapshots;
    state.primarySnapshots = primarySnapshots;
    state.segment = segment;
      state.visibleSnapshots = getVisibleSnapshots(primarySnapshots);
      state.stationEvents = buildStationEventMap(primarySnapshots, segment.stations);
      const scopeKey = `${state.system}|${state.renderedQueryDate}|${segment.id}`;
      if (state.animationScopeKey !== scopeKey) {
        state.markerPositions.clear();
        state.markerStepCache.clear();
        state.animationScopeKey = scopeKey;
      }
      const note =
        state.system === "tr" && queryDate === todayDateStr()
          ? "台鐵今日同步即時誤點；跨日列車會依發車日補入。"
          : "依目前查詢日期的班表推估位置；跨日列車會依發車日補入。";
    const boardHeight = getBoardHeight(segment.stations);
    const feedHeight = Math.min(Math.max(420, boardHeight - 110), 760);

    return {
      segment,
      snapshots: primarySnapshots,
      visibleSnapshots: state.visibleSnapshots,
      note,
      boardHeight,
      feedHeight,
      updatedAt: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
  }

  async function renderTracker(state) {
    stopBoardAnimation(state);
    if (!(await ensureLiveTrackerAccess())) return;
    try {
      const data = await collectTrackerRenderData(state);
      if (data.errorHtml) {
        state.output.innerHTML = data.errorHtml;
        return;
      }
      const { segment, snapshots, visibleSnapshots, note, boardHeight, feedHeight, updatedAt } = data;

      state.output.innerHTML = `
        <div class="rail-live-summary">
          <div class="rail-live-chip"><span>更新時間</span><strong>${updatedAt}</strong><small>${escapeHtml(note)}</small></div>
          <div class="rail-live-chip"><span>路線範圍</span><strong>${escapeHtml(segment.title)}</strong><small>${escapeHtml(segment.subtitle || segment.groupTitle || "")}</small></div>
          <div class="rail-live-chip"><span>行進中 / 停靠中 / 即將發車</span><strong>${snapshots.filter((snapshot) => snapshot.state === "running").length} / ${snapshots.filter((snapshot) => snapshot.state === "dwell").length} / ${snapshots.filter((snapshot) => snapshot.state === "upcoming").length}</strong><small>點選車站可查看 10 分鐘內的進出站列車</small></div>
        </div>
        <div class="rail-live-layout">
          <section class="rail-live-board">
            <div class="rail-live-board-head">
              <div><h3>${escapeHtml(segment.title)}</h3><p>${escapeHtml(segment.subtitle || segment.groupTitle || "")}</p></div>
              <div class="rail-live-board-note">${escapeHtml(state.system === "tr" ? "順行 / 逆行依車次方向顯示" : "北上 / 南下依車次方向顯示")}</div>
            </div>
            <div class="rail-live-map" style="height:${boardHeight}px; --rail-live-line-top:${MAP_PADDING_Y}px; --rail-live-line-bottom:${MAP_PADDING_Y}px;"><div class="rail-live-line"></div></div>
          </section>
          <section class="rail-live-feed">
            <div class="rail-live-feed-head"><h3>行進中列車</h3><p>${escapeHtml("左側路線可直接點選車站查看 10 分鐘內的停靠提示；右側列表可快速定位列車並查看詳情。")}</p></div>
            <div class="rail-live-feed-body" style="max-height:${feedHeight}px">
              <div class="rail-live-feed-list">${visibleSnapshots.length ? visibleSnapshots.map((snapshot) => buildFeedCardHTML(state.system, snapshot)).join("") : `<div class="rail-live-empty">目前沒有符合條件、且仍在此路線上的列車。</div>`}</div>
            </div>
          </section>
        </div>
      `;

      renderBoard(state, segment, snapshots);
      bindRenderedOutput(state);
      runBoardAnimation(state);
    } catch (error) {
      console.error("rail-live-tracker render failed", error);
      state.output.innerHTML = `<div class="rail-live-empty">即時動態建立失敗，請稍後再試。</div>`;
    }
  }

  async function renderTrackerV2(state) {
    stopBoardAnimation(state);
    if (!(await ensureLiveTrackerAccess())) return;
    try {
      const data = await collectTrackerRenderData(state);
      if (data.errorHtml) {
        state.output.innerHTML = data.errorHtml;
        return;
      }
      const { segment, snapshots, boardHeight, feedHeight, updatedAt } = data;

      state.output.innerHTML = `
        <div class="rail-live-v2-layout">
          <article class="rail-live-v2-section rail-live-v2-focus-shell">
            <div class="rail-live-v2-section-head">
              <div><h3>焦點列車</h3><p>點圖上的列車會直接同步切到這裡。</p></div>
              <button type="button" class="rail-live-mini-btn rail-live-locate-btn" data-live-locate-train="1">📍定位車次</button>
            </div>
            <div class="rail-live-v2-section-body" data-live-v2-focus></div>
          </article>
          <section class="rail-live-board">
            <div class="rail-live-board-head">
              <div><h3>${escapeHtml(segment.title)}</h3><p>${escapeHtml(segment.subtitle || segment.groupTitle || "")}</p></div>
              <div class="rail-live-board-note">${escapeHtml(`${updatedAt} 更新`)}</div>
            </div>
            <div class="rail-live-map" style="height:${boardHeight}px; --rail-live-line-top:${MAP_PADDING_Y}px; --rail-live-line-bottom:${MAP_PADDING_Y}px;"><div class="rail-live-line"></div></div>
          </section>
          <article class="rail-live-v2-section rail-live-v2-trains-shell">
            <div class="rail-live-v2-section-head"><h3>全部列車</h3><p>直接點選即可定位列車並切換焦點。</p></div>
            <div class="rail-live-v2-scroll rail-live-v2-all-scroll" data-live-v2-trains style="max-height:${feedHeight}px"></div>
          </article>
        </div>
      `;

      renderBoard(state, segment, snapshots);
      renderTrackerV2Sidebars(state);
      runBoardAnimation(state);
    } catch (error) {
      console.error("rail-live-tracker v2 render failed", error);
      state.output.innerHTML = `<div class="rail-live-empty">即時動態建立失敗，請稍後再試。</div>`;
    }
  }

  function buildPanelHTML(system, config) {
    const directionOptions = getDirectionOptions(system).map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("");
    const groups = getRouteGroupsForSystem(system);
    const routeOptions =
      system === "tr"
        ? groups
            .map((group) => `<optgroup label="${escapeHtml(group.title)}">${(group.segments || []).map((segment) => `<option value="${escapeHtml(segment.id)}">${escapeHtml(segment.title)}</option>`).join("")}</optgroup>`)
            .join("")
        : `<option value="thsr-main">高鐵全線</option>`;
    const lead = config.key === "modern"
      ? ""
      : system === "tr"
        ? "依台鐵主線、支線與山海線分段顯示即時動態，可直接查看路線上的列車、車站停靠提示與列車詳情。"
        : "依高鐵全線班表推估列車位置，保留路線、車站與列車的即時互動。";
    return `
      <div class="section-title">${escapeHtml(config.title)}</div>
      ${lead ? `<p class="rail-live-lead">${lead}</p>` : ""}
      <div class="rail-live-toolbar">
        <div class="rail-live-control"><span>路線</span><select id="${escapeHtml(config.inputPrefix)}Route" class="rail-live-select">${routeOptions}</select></div>
        <div class="rail-live-control"><span>方向</span><select id="${escapeHtml(config.inputPrefix)}Direction" class="rail-live-select">${directionOptions}</select></div>
        <div class="rail-live-control rail-live-location-control"><button type="button" class="rail-live-location-toggle" data-live-user-location-toggle="1" aria-pressed="false">顯示目前位置</button></div>
        <div class="rail-live-control rail-live-search"><div class="rail-live-search-field"><input id="${escapeHtml(config.inputPrefix)}Search" class="rail-live-input rail-live-input-has-btn" type="text" placeholder="搜尋車次、車種或起迄站"><button type="button" class="rail-live-search-locate" data-live-search-locate="1" aria-label="📍定位車次" title="📍定位車次">📍定位車次</button></div><button id="${escapeHtml(config.inputPrefix)}Render" class="btn-primary" type="button">刷新動態</button></div>
      </div>
      <div id="${escapeHtml(config.inputPrefix)}Output" class="rail-live-output"><div class="rail-live-empty">可直接顯示目前路線的列車動態與車站進出站提示。</div></div>
      <div id="${escapeHtml(config.inputPrefix)}Modal" class="rail-live-modal hidden" aria-hidden="true">
        <div class="rail-live-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="${escapeHtml(config.inputPrefix)}ModalTitle">
          <div class="rail-live-modal-head">
            <h3 id="${escapeHtml(config.inputPrefix)}ModalTitle">車站即時動態</h3>
            <button type="button" class="rail-live-modal-close" data-rail-live-close="1">關閉</button>
          </div>
          <div class="rail-live-modal-body" id="${escapeHtml(config.inputPrefix)}ModalBody"></div>
        </div>
      </div>
    `;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .rail-live-panel{display:flex; flex-direction:column; gap:14px;}
      .rail-live-lead{margin:0; color:var(--text-muted); line-height:1.75;}
      .rail-live-toolbar{display:flex; flex-wrap:wrap; gap:10px;}
      .rail-live-control{display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:16px; border:1px solid var(--border); background:var(--bg-body);}
      .rail-live-control span{font-size:.85rem; color:var(--text-muted); font-weight:700; white-space:nowrap;}
      .rail-live-select,.rail-live-input{height:38px; border-radius:12px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-main); padding:0 12px; font:inherit;}
      .rail-live-search{flex:1 1 320px; justify-content:flex-end;}
      .rail-live-search-field{position:relative; flex:1 1 180px; min-width:180px;}
      .rail-live-input{min-width:180px; flex:1 1 180px;}
      .rail-live-input-has-btn{width:100%; padding-right:112px;}
      .rail-live-search-locate{position:absolute; top:50%; right:6px; transform:translateY(-50%); min-width:100px; height:30px; padding:0 10px; border:none; border-radius:10px; background:color-mix(in srgb, var(--primary) 12%, var(--bg-surface)); color:var(--primary); font:inherit; font-size:.78rem; font-weight:900; white-space:nowrap; cursor:pointer;}
      .rail-live-location-control{padding:0; border:none; background:transparent;}
      .rail-live-location-toggle{height:60px; padding:0 18px; border-radius:16px; border:1px solid color-mix(in srgb, var(--primary) 18%, var(--border)); background:linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--bg-surface)), var(--bg-surface)); color:var(--text-main); font:inherit; font-size:.88rem; font-weight:900; white-space:nowrap; cursor:pointer; box-shadow:0 10px 24px rgba(15,23,42,.06);}
      .rail-live-location-toggle[aria-pressed="true"]{background:linear-gradient(135deg, #1d4ed8, #0f766e); border-color:transparent; color:#fff; box-shadow:0 14px 30px rgba(37,99,235,.22);}
      .dark-mode .rail-live-location-toggle{background:rgba(30,41,59,.86); border-color:rgba(148,163,184,.22); color:#e5edf8;}
      .dark-mode .rail-live-location-toggle[aria-pressed="true"]{background:linear-gradient(135deg, #2563eb, #0f766e); color:#fff;}
      .rail-live-output,.rail-live-feed{display:flex; flex-direction:column; gap:14px;}
      .rail-live-output{order:2;}
      .rail-live-layout{display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:14px; align-items:start;}
      .rail-live-v2-layout{display:grid; grid-template-columns:minmax(0,1fr) 420px; grid-template-areas:"board focus" "board trains"; gap:14px; align-items:start;}
      .rail-live-v2-focus-shell{grid-area:focus;}
      .rail-live-v2-trains-shell{grid-area:trains;}
      .rail-live-v2-section{border:1px solid var(--border); background:var(--bg-surface); border-radius:20px; overflow:hidden;}
      .rail-live-v2-section-head{padding:14px 16px; border-bottom:1px solid var(--border); display:flex; align-items:flex-start; justify-content:space-between; gap:12px;}
      .rail-live-v2-section-head h3{margin:0; font-size:1rem;}
      .rail-live-v2-section-head p{margin:4px 0 0; color:var(--text-muted); font-size:.8rem; line-height:1.55;}
      .rail-live-locate-btn{white-space:nowrap; flex:0 0 auto;}
      .rail-live-v2-section-body{padding:16px;}
      .rail-live-v2-scroll{padding:14px 16px; overflow:auto;}
      .rail-live-v2-focus-card{padding:18px; border-radius:18px; border:1px solid color-mix(in srgb, var(--rail-live-color) 26%, var(--border)); background:linear-gradient(145deg, color-mix(in srgb, var(--rail-live-color) 10%, var(--bg-surface)), var(--bg-body));}
      .rail-live-v2-focus-head{display:flex; align-items:flex-start; justify-content:space-between; gap:12px;}
      .rail-live-v2-focus-title{font-size:1rem; font-weight:800; color:var(--text-main);}
      .rail-live-v2-focus-route{margin-top:6px; color:var(--text-muted); font-size:.84rem;}
      .rail-live-v2-focus-grid{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:12px;}
      .rail-live-v2-focus-cell{padding:10px 12px; border-radius:14px; background:color-mix(in srgb, var(--bg-surface) 92%, transparent); border:1px solid color-mix(in srgb, var(--border) 82%, transparent);}
      .rail-live-v2-focus-cell span{display:block; color:var(--text-muted); font-size:.74rem; font-weight:700;}
      .rail-live-v2-focus-cell strong{display:block; margin-top:4px; font-size:.84rem; line-height:1.55; color:var(--text-main);}
      .rail-live-v2-progress{height:10px; margin-top:14px; border-radius:999px; background:color-mix(in srgb, var(--rail-live-color) 12%, var(--bg-body)); overflow:hidden;}
      .rail-live-v2-progress span{display:block; height:100%; border-radius:999px; background:linear-gradient(90deg, color-mix(in srgb, var(--rail-live-color) 92%, white), color-mix(in srgb, var(--rail-live-color) 72%, black));}
      .rail-live-v2-progress-meta{margin-top:8px; color:var(--text-muted); font-size:.78rem;}
      .rail-live-v2-event-list{display:flex; flex-direction:column; gap:10px;}
      .rail-live-v2-event-card{padding:14px; border-radius:16px; border:1px solid var(--border); background:linear-gradient(145deg, color-mix(in srgb, var(--primary) 5%, var(--bg-surface)), var(--bg-body)); cursor:pointer;}
      .rail-live-v2-event-title{font-size:.92rem; font-weight:800; color:var(--text-main);}
      .rail-live-v2-event-meta{margin-top:4px; color:var(--text-muted); font-size:.78rem;}
      .rail-live-v2-event-line{margin-top:8px; color:var(--text-main); font-size:.8rem; line-height:1.55;}
      .rail-live-board,.rail-live-feed-head,.rail-live-card,.rail-live-detail-card{border:1px solid var(--border); background:var(--bg-surface);}
      .rail-live-v2-layout .rail-live-board{grid-area:board;}
      .rail-live-board{padding:18px; border-radius:24px; box-shadow:0 18px 38px rgba(15,23,42,0.08);}
      .rail-live-board-head{display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:16px;}
      .rail-live-board-head h3{margin:0; font-size:1.06rem;}
      .rail-live-board-head p{margin:4px 0 0; color:var(--text-muted); font-size:.84rem;}
      .rail-live-board-note{font-size:.78rem; color:var(--text-muted); font-weight:700;}
      .rail-live-map{position:relative; border-radius:20px; border:1px solid color-mix(in srgb, var(--border) 85%, transparent); background:linear-gradient(180deg, color-mix(in srgb, var(--bg-body) 92%, transparent), color-mix(in srgb, var(--bg-surface) 84%, transparent)); overflow:hidden;}
      .rail-live-line{position:absolute; top:var(--rail-live-line-top, 24px); bottom:var(--rail-live-line-bottom, 24px); left:50%; transform:translateX(-50%); width:8px; border-radius:999px; background:linear-gradient(180deg, rgba(96,128,191,0.92), rgba(113,146,219,0.76));}
      .rail-live-board-empty{position:absolute; top:14px; left:14px; right:14px; padding:12px 14px; border-radius:14px; background:rgba(255,255,255,0.82); color:var(--text-muted); font-size:.84rem; line-height:1.7;}
      .rail-live-station{position:absolute; left:0; right:0; transform:translateY(-50%); display:flex; align-items:center; justify-content:center; background:none; border:none; padding:0; cursor:pointer;}
      .rail-live-station-name{position:absolute; right:calc(50% + 18px); max-width:calc(50% - 38px); text-align:right; font-size:.84rem; font-weight:800; color:var(--text-main);}
      .rail-live-station-node{width:12px; height:12px; border-radius:50%; background:var(--bg-surface); border:3px solid rgba(92,122,183,0.95);}
      .rail-live-station.has-alert .rail-live-station-node{border-color:#f59e0b;}
      .rail-live-station.is-busy .rail-live-station-node{border-color:#ef4444;}
      .rail-live-station.is-soon .rail-live-station-name{color:#f97316;}
      .rail-live-station.active .rail-live-station-name{color:#2563eb;}
      .rail-live-train-label{position:absolute; left:50%; width:0; transform:translateY(-50%); z-index:18; background:none; border:none; padding:0; cursor:pointer; will-change:top;}
      .rail-live-train-anchor{position:absolute; top:-10px; left:-9px; width:18px; height:18px; display:flex; align-items:center; justify-content:center; color:var(--rail-live-color); font-size:16px; font-weight:900; line-height:1;}
      .rail-live-train-connector{position:absolute; top:0; width:20px; border-top:1px solid color-mix(in srgb, var(--rail-live-color) 70%, #64748b);}
      .rail-live-train-copy{position:absolute; top:-12px; width:210px; min-height:24px; display:flex; align-items:center;}
      .rail-live-train-copy strong{display:block; font-size:.76rem; line-height:1.25; color:var(--text-main); white-space:nowrap;}
      .rail-live-train-copy strong span{white-space:nowrap;}
      .rail-live-train-label.is-active .rail-live-train-copy strong{text-decoration:underline;}
      .rail-live-train-label.is-blinking .rail-live-train-anchor{animation:rail-live-blink 1s steps(2,end) infinite;}
      .rail-live-train-label.left .rail-live-train-connector{left:-62px; width:54px;}
      .rail-live-train-label.left .rail-live-train-copy{right:70px; justify-content:flex-end; text-align:right; padding-right:8px;}
      .rail-live-train-label.right .rail-live-train-connector{left:12px;}
      .rail-live-train-label.right .rail-live-train-copy{left:34px; justify-content:flex-start; text-align:left; padding-left:8px;}
      .rail-live-user-location{position:absolute; left:50%; width:0; height:0; transform:translate(-50%,-50%); z-index:8; pointer-events:none; transition:top .9s cubic-bezier(.2,.8,.2,1); filter:drop-shadow(0 8px 14px rgba(37,99,235,.20));}
      .rail-live-user-dot{position:absolute; left:-9px; top:-9px; width:18px; height:18px; border-radius:50%; background:#1a73e8; border:3px solid #fff; box-shadow:0 0 0 7px rgba(26,115,232,.18), 0 0 0 1px rgba(37,99,235,.28);}
      .rail-live-user-dot::after{content:""; position:absolute; inset:-11px; border-radius:50%; border:1px solid rgba(26,115,232,.24); animation:rail-live-user-pulse 1.9s ease-out infinite;}
      .rail-live-user-label{display:none;}
      .dark-mode .rail-live-user-label{background:rgba(15,23,42,.88); border-color:rgba(96,165,250,.24); color:#bfdbfe;}
      .rail-live-user-location.is-far{opacity:.58;}
      .rail-live-feed-head{padding:14px 16px; border-radius:18px;}
      .rail-live-feed-head h3{margin:0; font-size:1rem;}
      .rail-live-feed-head p{margin:4px 0 0; color:var(--text-muted); font-size:.82rem; line-height:1.6;}
      .rail-live-feed-body{overflow:auto; padding-right:4px;}
      .rail-live-feed-list,.rail-live-detail-list{display:flex; flex-direction:column; gap:10px;}
      .rail-live-card,.rail-live-detail-card{padding:14px 16px; border-radius:18px;}
      .rail-live-card{cursor:pointer; background:linear-gradient(145deg, color-mix(in srgb, var(--rail-live-color) 7%, var(--bg-surface)), var(--bg-body));}
      .rail-live-card-head{display:flex; align-items:center; justify-content:space-between; gap:12px;}
      .rail-live-card-title{font-size:1rem; font-weight:800; color:var(--text-main);}
      .rail-live-card-status{display:inline-flex; align-items:center; gap:2px; flex-wrap:wrap; font-size:.76rem; font-weight:800; white-space:nowrap;}
      .rail-live-status-part{display:inline-block;}
      .rail-live-status-sep{color:var(--text-muted);}
      .rail-live-card-route{margin-top:6px; color:var(--text-muted); font-size:.84rem;}
      .rail-live-card-list{display:flex; flex-direction:column; gap:4px; margin-top:8px; font-size:.8rem; line-height:1.55; color:var(--text-main);}
      .rail-live-card-actions,.rail-live-detail-actions{display:flex; flex-wrap:wrap; gap:8px; margin-top:12px;}
      .rail-live-card.is-selected,.rail-live-v2-event-card.is-selected{box-shadow:0 0 0 2px color-mix(in srgb, var(--primary) 38%, transparent);}
      .rail-live-mini-btn,.rail-live-modal-close{border:1px solid var(--border); background:var(--bg-body); color:var(--text-main); border-radius:10px; padding:7px 10px; font:inherit; font-size:.82rem; cursor:pointer;}
      .rail-live-detail-card{text-align:left; background:linear-gradient(145deg, color-mix(in srgb, var(--primary) 6%, var(--bg-surface)), var(--bg-body));}
      .rail-live-detail-title{font-size:.92rem; font-weight:800; color:var(--text-main);}
      .rail-live-detail-meta{margin-top:6px; font-size:.8rem; color:var(--text-muted);}
      .rail-live-empty{padding:16px 18px; border-radius:16px; border:1px dashed var(--border); color:var(--text-muted); background:color-mix(in srgb, var(--bg-body) 88%, transparent); line-height:1.75;}
      .rail-live-modal{position:fixed; inset:0; background:rgba(15,23,42,0.42); display:flex; align-items:center; justify-content:center; padding:24px; z-index:1200;}
      .rail-live-modal.hidden{display:none;}
      .rail-live-modal-dialog{width:min(720px,100%); max-height:min(78vh,760px); overflow:auto; border-radius:22px; border:1px solid var(--border); background:var(--bg-surface); box-shadow:0 28px 70px rgba(15,23,42,0.24); animation:rail-live-pop .2s ease;}
      .rail-live-modal-head{display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; border-bottom:1px solid var(--border);}
      .rail-live-modal-head h3{margin:0; font-size:1.02rem;}
      .rail-live-modal-body{padding:16px 18px;}
      @keyframes rail-live-blink{0%,49%{opacity:1;}50%,100%{opacity:.2;}}
      @keyframes rail-live-user-pulse{0%{transform:scale(.65); opacity:.72;}100%{transform:scale(1.8); opacity:0;}}
      @keyframes rail-live-pop{from{transform:translateY(10px) scale(.98); opacity:.2;}to{transform:translateY(0) scale(1); opacity:1;}}
      @media (max-width:1080px){
        .rail-live-layout{grid-template-columns:1fr;}
        .rail-live-v2-layout{grid-template-columns:1fr; grid-template-areas:"focus" "board" "trains";}
      }
      @media (max-width:760px){
        .rail-live-control{width:100%; flex-wrap:wrap; justify-content:flex-start; border-radius:14px;}
        .rail-live-select,.rail-live-input{min-width:0; flex:1 1 140px;}
        .rail-live-search-field{min-width:0; width:100%;}
        .rail-live-board{padding:14px; border-radius:18px;}
        .rail-live-v2-section{border-radius:18px;}
        .rail-live-v2-section-head{padding:10px 12px; align-items:center;}
        .rail-live-v2-section-head p{display:none;}
        .rail-live-v2-section-body,.rail-live-v2-scroll{padding:10px 12px;}
        .rail-live-v2-focus-card{padding:10px 11px; border-radius:14px;}
        .rail-live-v2-focus-head{gap:8px; align-items:center;}
        .rail-live-v2-focus-title{font-size:.88rem; line-height:1.32;}
        .rail-live-v2-focus-route{display:none;}
        .rail-live-v2-focus-grid{grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin-top:8px;}
        .rail-live-v2-focus-cell{padding:7px 8px; border-radius:10px;}
        .rail-live-v2-focus-cell span{font-size:.66rem;}
        .rail-live-v2-focus-cell strong{margin-top:2px; font-size:.74rem; line-height:1.38;}
        .rail-live-v2-progress,.rail-live-v2-progress-meta{display:none;}
        .rail-live-card-status{font-size:.7rem;}
        .rail-live-card-actions{margin-top:8px; gap:6px;}
        .rail-live-mini-btn{padding:6px 8px; font-size:.76rem;}
        .rail-live-train-copy{width:150px; min-height:22px; top:-11px;}
        .rail-live-train-copy strong{font-size:.68rem;}
        .rail-live-station-name{font-size:.74rem; max-width:calc(50% - 34px);}
        .rail-live-user-label{display:none;}
        .rail-live-modal{padding:14px;}
      }`;
    document.head.appendChild(style);
  }

  function buildState(system, panel, config) {
    return {
      system,
      variant: config.key,
      config,
      panel,
      routeSelect: panel.querySelector(`#${config.inputPrefix}Route`),
      directionSelect: panel.querySelector(`#${config.inputPrefix}Direction`),
      searchInput: panel.querySelector(`#${config.inputPrefix}Search`),
      renderButton: panel.querySelector(`#${config.inputPrefix}Render`),
      userLocationButton: panel.querySelector("[data-live-user-location-toggle]"),
      output: panel.querySelector(`#${config.inputPrefix}Output`),
      modal: panel.querySelector(`#${config.inputPrefix}Modal`),
      modalTitle: panel.querySelector(`#${config.inputPrefix}ModalTitle`),
      modalBody: panel.querySelector(`#${config.inputPrefix}ModalBody`),
      refreshLoop: null,
      timer: null,
      focusTimer: null,
      activeStation: "",
      stationEvents: new Map(),
      snapshots: [],
      primarySnapshots: [],
      visibleSnapshots: [],
      segment: null,
      markerBindings: [],
      markerPositions: new Map(),
      markerStepCache: new Map(),
      userLocation: { coords: null, source: "", updatedAt: 0 },
      userLocationEnabled: readUserLocationEnabled(),
      userLocationWatchId: null,
      userLocationMarker: null,
      runRender: null,
      animationFrame: 0,
      animationScopeKey: "",
      renderedQueryDate: "",
      selectedTrainKey: "",
    };
  }

  function placeAfterAnchor(tab, panel, config) {
    const grid = document.querySelector("main .grid");
    const tabs = grid?.querySelector(".query-tabs");
    const anchorTab = document.getElementById(config.anchorTabId) || document.getElementById("tab-master-table");
    const anchorPanel = document.getElementById(config.anchorPanelId) || document.getElementById("panel-master-table");
    if (tabs && tab && anchorTab?.parentElement === tabs && anchorTab.nextElementSibling !== tab) anchorTab.insertAdjacentElement("afterend", tab);
    if (grid && panel && anchorPanel?.parentElement === grid && anchorPanel.nextElementSibling !== panel) anchorPanel.insertAdjacentElement("afterend", panel);
  }

  function insertTrackerPanel(system, config) {
    const grid = document.querySelector("main .grid");
    const tabs = grid?.querySelector(".query-tabs");
    if (!grid || !tabs || document.getElementById(config.panelId)) return null;
    const tab = document.createElement("button");
    tab.className = "query-tab";
    tab.id = config.tabId;
    tab.type = "button";
    tab.dataset.target = config.panelId;
    tab.textContent = config.tabLabel;
    const panel = document.createElement("section");
    panel.id = config.panelId;
    panel.className = "card query-panel rail-live-panel hidden";
    panel.innerHTML = buildPanelHTML(system, config);
    const anchorTab = document.getElementById(config.anchorTabId) || document.getElementById("tab-master-table");
    const anchorPanel = document.getElementById(config.anchorPanelId) || document.getElementById("panel-master-table");
    if (anchorTab?.parentElement === tabs) anchorTab.insertAdjacentElement("afterend", tab);
    else tabs.appendChild(tab);
    if (anchorPanel?.parentElement === grid) anchorPanel.insertAdjacentElement("afterend", panel);
    else grid.appendChild(panel);
    placeAfterAnchor(tab, panel, config);
    return { tab, panel };
  }

  function bindTrackerPanel(state, tab) {
    const render = state.variant === "modern" ? renderTrackerV2 : renderTracker;
    const run = () => {
      const previousLabel = state.renderButton.textContent;
      state.renderButton.disabled = true;
      state.renderButton.textContent = "更新中...";
      render(state).finally(() => {
        state.renderButton.disabled = false;
        state.renderButton.textContent = previousLabel;
      });
    };
    state.runRender = run;
    syncUserLocationToggleButton(state);
    tab.addEventListener("click", async () => {
      if (!(await ensureLiveTrackerAccess())) return;
      window.switchQueryPanel?.(state.config.panelId);
      run();
    });
    state.renderButton.addEventListener("click", async () => {
      if (!(await ensureLiveTrackerAccess())) return;
      run();
    });
    state.userLocationButton?.addEventListener("click", async () => {
      if (!(await ensureLiveTrackerAccess())) return;
      setUserLocationEnabled(state, !state.userLocationEnabled);
    });
    state.routeSelect?.addEventListener("change", run);
    state.directionSelect?.addEventListener("change", run);
    let timer = null;
    state.searchInput?.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(run, 180);
    });
    state.panel.querySelectorAll("[data-live-search-locate]").forEach((button) => {
      button.addEventListener("click", async () => {
        const locator = state.system === "tr" ? window.locateTraRunningTrainByPosition : window.locateThsrRunningTrainByPosition;
        if (typeof locator !== "function") {
          alert("定位找車次尚未就緒");
          return;
        }
        const previousText = button.textContent || "🚆";
        button.disabled = true;
        button.textContent = "…";
        try {
          const result = await locator({ applyTrainQuery: false });
          const trainNo = String(result?.entry?.trainNo || "");
          if (!trainNo) throw new Error("附近沒有可判定的行駛中列車");
          if (state.searchInput) state.searchInput.value = trainNo;
          run();
        } catch (error) {
          alert(error?.message || "定位失敗，請稍後再試");
        } finally {
          button.disabled = false;
          button.textContent = previousText;
        }
      });
    });
    if (state.modal && !state.modal.dataset.bound) {
      state.modal.dataset.bound = "1";
      state.modal.addEventListener("click", (event) => {
        if (event.target === state.modal || event.target?.getAttribute?.("data-rail-live-close") === "1") closeStationModal(state);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !state.modal.classList.contains("hidden")) closeStationModal(state);
      });
    }
    document.getElementById("mainQueryDate")?.addEventListener("change", () => {
      if (!state.panel.classList.contains("hidden")) run();
    });
    if (!state.panel.dataset.liveGeoStorageBound) {
      state.panel.dataset.liveGeoStorageBound = "1";
      window.addEventListener("storage", (event) => {
        if (event.key !== SHARED_GEO_KEY) return;
        const coords = readSharedGeoSnapshot();
        if (coords) setUserLocationCoords(state, coords, "shared-storage");
      });
    }
    startTrackerRefreshLoop(state, run);
  }

  function init() {
    const system = getSystem();
    if (system !== "tr" && system !== "thsr") return;
    injectStyles();
    const config = getTrackerPanelConfig();
    const inserted = insertTrackerPanel(system, config);
    if (!inserted) return;
    const state = buildState(system, inserted.panel, config);
    TRACKER_STATES.set(system, state);
    window.RailLiveTracker = window.RailLiveTracker || {};
    window.RailLiveTracker.focusTrain = async (trainNo, originDate, options = {}) => {
      const activeState = TRACKER_STATES.get(getSystem()) || TRACKER_STATES.get(system);
      return focusTrainInTracker(activeState, trainNo, originDate, options);
    };
    window.RailLiveTracker.locateTrain = async (options = {}) => {
      const activeState = TRACKER_STATES.get(getSystem()) || TRACKER_STATES.get(system);
      return locateTrainIntoTracker(activeState, options?.button || null);
    };
    window.RailLiveTracker.getTrainSnapshot = (trainNo, originDate, options = {}) => {
      const targetSystem = options?.system || getSystem() || system;
      const activeState = TRACKER_STATES.get(targetSystem) || TRACKER_STATES.get(getSystem()) || TRACKER_STATES.get(system);
      return (
        getCachedTrainSnapshot(activeState, trainNo, originDate) ||
        buildSingleTrainSnapshot(targetSystem, trainNo, originDate, options)
      );
    };
    bindTrackerPanel(state, inserted.tab);
    const syncPlacement = () => placeAfterAnchor(inserted.tab, inserted.panel, config);
    if (document.readyState === "complete") setTimeout(syncPlacement, 0);
    else window.addEventListener("load", () => setTimeout(syncPlacement, 0), { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
