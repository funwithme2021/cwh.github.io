(function () {
  const STYLE_ID = "rail-live-tracker-styles";
  const TAB_ID = "tab-live-tracker";
  const PANEL_ID = "panel-live-tracker";
  const ANCHOR_TAB_ID = "tab-operation-diagram";
  const ANCHOR_PANEL_ID = "panel-operation-diagram";
  const REFRESH_MS = 60000;
  const UPCOMING_WINDOW = 30;
  const STATION_ALERT_WINDOW = 10;
  const STATION_SOON_WINDOW = 3;
  const MAP_PADDING_Y = 36;
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
  const THSR_DIRECTION_COLORS = { north: "#2563eb", south: "#ea580c" };

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
    const normalized = ((minuteValue % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
  }

  function getTrainNoParity(trainNo) {
    const digits = String(trainNo || "").match(/\d+/g);
    if (!digits?.length) return "";
    const number = Number(digits.join(""));
    if (!Number.isFinite(number)) return "";
    return number % 2 === 0 ? "even" : "odd";
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

  function getTraTypeColor(type) {
    const normalized = normalizeTraType(type);
    if (TRA_TYPE_COLORS[normalized]) return getReadableRailColor(TRA_TYPE_COLORS[normalized]);
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

  function buildJourneyPathPoints(timedStops, fullPathStations) {
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
          minute: Math.round(travelStart + ((travelEnd - travelStart) * step) / steps),
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

  function buildEntries(system, scheduleSources) {
    const normalizeStation = system === "tr" ? normalizeTraStation : normalizeThsrStation;
    const sources = Array.isArray(scheduleSources) ? scheduleSources : [{ map: scheduleSources || {}, originDate: getQueryDate() }];
    return sources.flatMap((source) =>
      Object.keys(source.map || {})
        .sort((a, b) => String(a).localeCompare(String(b), "en"))
        .map((trainNo) => {
          const raw = source.map?.[trainNo];
          if (!raw) return null;
          const stops = (raw["車站時間"] || [])
            .map((stop) => {
              const times = splitStopTimes(stop);
              return {
                name: normalizeStation(stop?.[0] || ""),
                arrival: times.arrival,
                departure: times.departure,
              };
            })
            .filter((stop) => stop.name && (stop.arrival || stop.departure));
          if (stops.length < 2) return null;
          const rawType = system === "tr" ? String(raw["原始車種"] || raw["車種"] || "列車").trim() || "列車" : "高鐵";
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

  function buildRouteProjections(entry, routeStations, system, queryDate) {
    const routeIndexMap = new Map((routeStations || []).map((name, index) => [name, index]));
    const delayMinutes = getDelayMinutes(system, entry.trainNo, queryDate);
    const fullTimedStops = buildTimedStops(entry.stops, delayMinutes);
    const fullPathPoints = buildJourneyPathPoints(fullTimedStops, entry.fullPathStations);
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
    const points = entry.points || [];
    const stopDetails = entry.stopDetails || [];
    const fullTimedStops = entry.fullTimedStops || [];
    const nowMinute = getRelativeNowMinute(entry.originDate, queryDate);
    const punctualityText = buildPunctualityText(system, queryDate, entry.delayMinutes);
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const segmentFirstMinute = entry.firstMinute ?? firstPoint?.minute;
    const segmentLastMinute = entry.lastMinute ?? lastPoint?.minute;
    const fullFirstMinute = entry.journeyFirstMinute;
    const fullLastMinute = entry.journeyLastMinute;
    if (!Number.isFinite(segmentFirstMinute) || !Number.isFinite(segmentLastMinute) || !Number.isFinite(fullFirstMinute) || !Number.isFinite(fullLastMinute)) return null;
    if (nowMinute < segmentFirstMinute && (!entry.startsAtJourneyOrigin || segmentFirstMinute - nowMinute > UPCOMING_WINDOW)) return null;
    if (nowMinute > segmentLastMinute + 10) return null;

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

    if (nowMinute < segmentFirstMinute) {
      const originStop = stopDetails.find((stop) => stop.name === entry.firstStation) || stopDetails[0] || null;
      const anchorPointIndex = Math.max(
        0,
        points.findIndex((point) => point.station === (originStop?.name || firstPoint?.station))
      );
      const anchorPoint = points[anchorPointIndex] || firstPoint || lastPoint;
      const departureMinute = getStopDepartureMinute(originStop) ?? segmentFirstMinute;
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
      for (let index = 0; index < stopDetails.length; index += 1) {
        const current = stopDetails[index];
        const arrivalMinute = getStopArrivalMinute(current);
        const departureMinute = getStopDepartureMinute(current);
        if (!Number.isFinite(arrivalMinute) || !Number.isFinite(departureMinute)) continue;
        if (nowMinute >= arrivalMinute && nowMinute <= departureMinute) {
          state = "dwell";
          stateLabel = "停靠中";
          positionIndex = current.routeIndex ?? lastPoint?.routeIndex ?? 0;
          currentFrom = current.name;
          currentTo = current.name;
          const nextStop = stopDetails
            .slice(index + 1)
            .find((stop) => Number.isFinite(getStopArrivalMinute(stop)) && getStopArrivalMinute(stop) > departureMinute);
          const fallbackPoint = points.find((point) => Number.isFinite(point.minute) && point.minute > departureMinute);
          nextStation = nextStop?.name || fallbackPoint?.station || current.name;
          nextTime = formatMinute(getStopArrivalMinute(nextStop) ?? fallbackPoint?.minute ?? departureMinute);
          statusText = `停靠中·${punctualityText}`;
          soonStation = current.name;
          soonMinutes = 0;
          soonKind = "stop";
          nextEventKind = nextStop ? "arrival" : fallbackPoint?.isStop ? "arrival" : "pass";
          nextStopStation = nextStop?.name || "";
          nextStopTime = nextStop ? formatMinute(getStopArrivalMinute(nextStop)) : "";
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
          if (!Number.isFinite(current?.minute) || !Number.isFinite(next?.minute) || nowMinute < current.minute || nowMinute > next.minute) continue;
          state = "running";
          stateLabel = "行進中";
          positionIndex = current.routeIndex + (next.routeIndex - current.routeIndex) * (clamp((nowMinute - current.minute) / Math.max(1, next.minute - current.minute), 0, 1));
          currentFrom = current.station;
          currentTo = next.station;
          const nextStop = stopDetails.find((stop) => Number.isFinite(getStopArrivalMinute(stop)) && getStopArrivalMinute(stop) >= nowMinute);
          const nextPoint = points.find((point, pointIndex) => pointIndex > index && Number.isFinite(point.minute) && point.minute >= nowMinute);
          nextStation = nextStop?.name || next.station;
          nextTime = formatMinute(getStopArrivalMinute(nextStop) ?? nextPoint?.minute ?? next.minute);
          statusText = `行進中·${punctualityText}`;
          const soonTarget = nextStop
            ? { station: nextStop.name, minute: getStopArrivalMinute(nextStop), isStop: true }
            : nextPoint
              ? { station: nextPoint.station, minute: nextPoint.minute, isStop: Boolean(nextPoint.isStop) }
              : null;
          soonStation = soonTarget?.station || next.station;
          soonMinutes = Number.isFinite(soonTarget?.minute) ? Math.max(0, soonTarget.minute - nowMinute) : Number.POSITIVE_INFINITY;
          soonKind = soonTarget?.isStop ? "stop" : soonTarget ? "pass" : "";
          nextEventKind = nextStop ? "arrival" : nextPoint?.isStop ? "arrival" : "pass";
          nextStopStation = nextStop?.name || (nextPoint?.isStop ? nextPoint.station : "");
          nextStopTime = nextStop
            ? formatMinute(getStopArrivalMinute(nextStop))
            : nextPoint?.isStop
              ? formatMinute(nextPoint.minute)
              : "";
          directionGlyph = getDirectionGlyphAtPointIndex(index);
          break;
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
      boardLabel: `🚆${entry.trainNo}次 ${entry.type}`,
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
    };
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

  function pushStationEvent(map, stationName, event) {
    if (!map.has(stationName)) map.set(stationName, []);
    const list = map.get(stationName);
    const key = `${event.trainNo}|${event.kind}|${event.timeText}`;
    if (list.some((item) => `${item.trainNo}|${item.kind}|${item.timeText}` === key)) return;
    list.push(event);
  }

  function buildStationEventMap(snapshots, segmentStations) {
    const map = new Map(segmentStations.map((station) => [station, []]));
    snapshots.forEach((snapshot) => {
      const stopDetails = snapshot.stopDetails || [];
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
        if (snapshot.nowMinute >= arrivalMinute && snapshot.nowMinute <= departureMinute) {
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
    return `🚆${escapeHtml(snapshot.trainNo)}次 ${typeHtml}${withRoute ? `（${escapeHtml(snapshot.displayRoute)}）` : ""}`;
  }

  function buildSnapshotBoardMeta(snapshot) {
    return snapshot.boardLabel;
  }

  function buildSnapshotLocationLine(snapshot) {
    if (snapshot.state === "running") return `目前在 ${snapshot.currentFrom} ➝ ${snapshot.currentTo} 間`;
    if (snapshot.state === "dwell") return `目前停靠 ${snapshot.currentFrom}`;
    if (snapshot.state === "upcoming") return `目前在 ${snapshot.currentFrom}，等待發車`;
    return `已抵達 ${snapshot.currentTo}`;
  }

  function buildSnapshotNextLine(snapshot) {
    if (snapshot.state === "arrived") return `終點站：${snapshot.currentTo}`;
    if (snapshot.state === "upcoming") return `預計 ${snapshot.nextTime} 由 ${snapshot.currentFrom} 發車`;
    if (snapshot.nextEventKind === "pass") {
      if (snapshot.nextStopStation && snapshot.nextStopTime) {
        return `即將通過：${snapshot.nextStation}（${snapshot.nextTime}）｜下一停靠：${snapshot.nextStopStation}（${snapshot.nextStopTime}）`;
      }
      return `即將通過：${snapshot.nextStation}（${snapshot.nextTime}）`;
    }
    return `下一站：${snapshot.nextStation}（${snapshot.nextTime}）`;
  }

  function buildSnapshotStatusLine(snapshot) {
    return `狀態：${snapshot.statusText}`;
  }

  function makeTrainKey(trainNo, originDate) {
    return `${trainNo}|${originDate || ""}`;
  }

  function focusTrainOnBoard(state, trainNo, originDate) {
    const map = state.output.querySelector(".rail-live-map");
    const board = state.output.querySelector(".rail-live-board");
    if (!map || !board) return;
    const key = makeTrainKey(trainNo, originDate);
    const escapedKey = window.CSS?.escape ? window.CSS.escape(key) : key.replace(/([^\w-])/g, "\\$1");
    map.querySelectorAll(".rail-live-train-label.is-active").forEach((item) => item.classList.remove("is-active"));
    const marker = map.querySelector(`.rail-live-train-label[data-train-key="${escapedKey}"]`);
    if (!marker) return;
    marker.classList.add("is-active");
    board.scrollIntoView({ behavior: "smooth", block: "center" });
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
                        <div class="rail-live-detail-meta">${escapeHtml(event.kind)}｜${escapeHtml(event.station)}｜${escapeHtml(event.timeText)}${Number.isFinite(event.minutesAway) && event.minutesAway > 0 ? `｜${escapeHtml(String(event.minutesAway))} 分後` : ""}</div>
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
      button.addEventListener("click", () => openTrainDetail(button.getAttribute("data-train-detail"), button.getAttribute("data-origin-date")));
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

  function bindRenderedOutput(state) {
    state.output.querySelectorAll(".rail-live-card[data-train-key]").forEach((card) => {
      card.addEventListener("click", () => {
        const value = card.getAttribute("data-train-key") || "";
        const [trainNo, originDate] = value.split("|");
        focusTrainOnBoard(state, trainNo, originDate);
      });
    });
    state.output.querySelectorAll(".rail-live-card [data-train-detail]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openTrainDetail(button.getAttribute("data-train-detail"), button.getAttribute("data-origin-date"));
      });
    });
  }

  function renderBoard(state, segment, snapshots) {
    const map = state.output.querySelector(".rail-live-map");
    if (!map) return;
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
      button.className = `rail-live-station ${events.length ? "has-alert" : ""} ${events.some((event) => event.kind === "停靠中") ? "is-busy" : ""} ${isSoon ? "is-soon" : ""} ${state.activeStation === station ? "active" : ""}`;
      button.style.top = `${top}px`;
      button.dataset.station = station;
      button.innerHTML = `
        <span class="rail-live-station-name">${escapeHtml(isSoon ? `${station}🔜` : station)}</span>
        <span class="rail-live-station-node"></span>
      `;
      button.addEventListener("click", () => renderStationDetail(state, station));
      map.appendChild(button);
    });

    const visibleSnapshots = snapshots.filter((snapshot) => snapshot.state !== "arrived");
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
          <strong>🚆${escapeHtml(snapshot.trainNo)}次 ${state.system === "tr" ? renderTraTypeHTML(snapshot.type) : escapeHtml(snapshot.type || "高鐵")}</strong>
        </span>
      `;
      marker.addEventListener("click", () => openTrainDetail(snapshot.trainNo, snapshot.originDate || snapshot.queryDate));
      map.appendChild(marker);
    });

    if (!visibleSnapshots.length) {
      const empty = document.createElement("div");
      empty.className = "rail-live-board-empty";
      empty.textContent = "目前沒有符合條件、且仍在此路線上的列車。";
      map.appendChild(empty);
    }
  }

  async function renderTracker(state) {
    try {
      const scheduleSources = await ensureScheduleReady(state.system);
      if (!scheduleSources.length) {
        state.output.innerHTML = `<div class="rail-live-empty">${escapeHtml(state.system === "tr" ? "台鐵" : "高鐵")}真實班表尚未就緒，請先更新頁面資料後再試。</div>`;
        return;
      }

      const groups =
        state.system === "tr"
          ? getRailNetwork()?.getTraSegmentGroups?.() || []
          : [{ id: "thsr", title: "高鐵全線", segments: [{ id: "thsr-main", title: "高鐵全線", subtitle: "南港 - 左營", stations: getRailNetwork()?.getThsrStationOrder?.() || [] }] }];
      let segment = null;
      groups.some((group) => (group.segments || []).some((candidate) => (candidate.id === state.routeSelect.value ? ((segment = { ...candidate, groupTitle: group.title }), true) : false)));
      if (!segment) {
        const fallbackGroup = groups[0];
        const fallback = fallbackGroup?.segments?.[0];
        segment = fallback ? { ...fallback, groupTitle: fallbackGroup.title } : null;
      }
      if (!segment?.stations?.length) {
        state.output.innerHTML = `<div class="rail-live-empty">此路線站點資料尚未完成。</div>`;
        return;
      }

      const queryText = String(state.searchInput.value || "").trim();
      const directionValue = state.directionSelect.value || "all";
      const directionalEntries = buildEntries(state.system, scheduleSources).filter((entry) => matchesDirection(state.system, entry.trainNo, directionValue));
      const routeEntries = directionalEntries.filter((entry) => matchesSegmentEntry(entry, segment));
      const projectedEntries = routeEntries.flatMap((entry) => buildRouteProjections(entry, segment.stations, state.system, getQueryDate()));

      const snapshots = dedupeCircularSnapshots(
        projectedEntries
        .map((entry) => buildSnapshot(entry, state.system, getQueryDate()))
        .filter(Boolean)
        .filter((snapshot) => !queryText || snapshot.trainNo.includes(queryText) || snapshot.type.includes(queryText) || snapshot.firstStation.includes(queryText) || snapshot.lastStation.includes(queryText))
      );

      state.snapshots = snapshots;
      state.segment = segment;
      state.stationEvents = buildStationEventMap(snapshots, segment.stations);
      const visibleSnapshots = snapshots.filter((snapshot) => snapshot.state !== "arrived");

      const note =
        state.system === "tr" && getQueryDate() === todayDateStr()
          ? "台鐵今日同步即時誤點；跨日列車會依發車日補入。"
          : "依目前查詢日期的班表推估位置；跨日列車會依發車日補入。";
      const boardHeight = getBoardHeight(segment.stations);
      const feedHeight = Math.min(Math.max(420, boardHeight - 110), 760);

      state.output.innerHTML = `
        <div class="rail-live-summary">
          <div class="rail-live-chip"><span>更新時間</span><strong>${new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong><small>${escapeHtml(note)}</small></div>
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
    } catch (error) {
      console.error("rail-live-tracker render failed", error);
      state.output.innerHTML = `<div class="rail-live-empty">即時動態建立失敗，請稍後再試。</div>`;
    }
  }

  function buildPanelHTML(system) {
    const directionOptions = getDirectionOptions(system).map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("");
    const groups =
      system === "tr"
        ? getRailNetwork()?.getTraSegmentGroups?.() || []
        : [{ id: "thsr", title: "高鐵全線", segments: [{ id: "thsr-main", title: "高鐵全線" }] }];
    const routeOptions =
      system === "tr"
        ? groups
            .map((group) => `<optgroup label="${escapeHtml(group.title)}">${(group.segments || []).map((segment) => `<option value="${escapeHtml(segment.id)}">${escapeHtml(segment.title)}</option>`).join("")}</optgroup>`)
            .join("")
        : `<option value="thsr-main">高鐵全線</option>`;
    const lead =
      system === "tr"
        ? "依台鐵主線、支線與山海線分段顯示即時動態，可直接查看路線上的列車、車站停靠提示與列車詳情。"
        : "依高鐵全線班表推估列車位置，保留路線、車站與列車的即時互動。";
    return `
      <div class="section-title">即時動態</div>
      <p class="rail-live-lead">${lead}</p>
      <div class="rail-live-toolbar">
        <div class="rail-live-control"><span>路線</span><select id="railLiveRoute" class="rail-live-select">${routeOptions}</select></div>
        <div class="rail-live-control"><span>方向</span><select id="railLiveDirection" class="rail-live-select">${directionOptions}</select></div>
        <div class="rail-live-control rail-live-search"><input id="railLiveSearch" class="rail-live-input" type="text" placeholder="搜尋車次、車種或起迄站"><button id="railLiveRender" class="btn-primary" type="button">刷新動態</button></div>
      </div>
      <div id="railLiveOutput" class="rail-live-output"><div class="rail-live-empty">可直接顯示目前路線的列車動態與車站進出站提示。</div></div>
      <div id="railLiveModal" class="rail-live-modal hidden" aria-hidden="true">
        <div class="rail-live-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="railLiveModalTitle">
          <div class="rail-live-modal-head">
            <h3 id="railLiveModalTitle">車站即時動態</h3>
            <button type="button" class="rail-live-modal-close" data-rail-live-close="1">關閉</button>
          </div>
          <div class="rail-live-modal-body" id="railLiveModalBody"></div>
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
      .rail-live-input{min-width:180px; flex:1 1 180px;}
      .rail-live-output,.rail-live-feed{display:flex; flex-direction:column; gap:14px;}
      .rail-live-output{order:2;}
      .rail-live-summary{display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px;}
      .rail-live-chip{padding:14px 16px; border-radius:18px; border:1px solid var(--border); background:linear-gradient(145deg, color-mix(in srgb, var(--primary) 8%, var(--bg-surface)), var(--bg-body));}
      .rail-live-chip span{display:block; color:var(--text-muted); font-size:.8rem; font-weight:700;}
      .rail-live-chip strong{display:block; margin-top:4px; font-size:1rem;}
      .rail-live-chip small{display:block; margin-top:6px; color:var(--text-muted); font-size:.74rem; line-height:1.5;}
      .rail-live-layout{display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:14px; align-items:start;}
      .rail-live-board,.rail-live-feed-head,.rail-live-card,.rail-live-detail-card{border:1px solid var(--border); background:var(--bg-surface);}
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
      .rail-live-train-label{position:absolute; left:50%; width:0; transform:translateY(-50%); background:none; border:none; padding:0; cursor:pointer;}
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
      @keyframes rail-live-pop{from{transform:translateY(10px) scale(.98); opacity:.2;}to{transform:translateY(0) scale(1); opacity:1;}}
      @media (max-width:1080px){.rail-live-layout{grid-template-columns:1fr;}}
      @media (max-width:760px){
        .rail-live-control{width:100%; flex-wrap:wrap; justify-content:flex-start; border-radius:14px;}
        .rail-live-select,.rail-live-input{min-width:0; flex:1 1 140px;}
        .rail-live-board{padding:14px; border-radius:18px;}
        .rail-live-train-copy{width:150px; min-height:22px; top:-11px;}
        .rail-live-train-copy strong{font-size:.68rem;}
        .rail-live-station-name{font-size:.74rem; max-width:calc(50% - 34px);}
        .rail-live-modal{padding:14px;}
      }`;
    document.head.appendChild(style);
  }

  function buildState(system, panel) {
    return {
      system,
      panel,
      routeSelect: panel.querySelector("#railLiveRoute"),
      directionSelect: panel.querySelector("#railLiveDirection"),
      searchInput: panel.querySelector("#railLiveSearch"),
      renderButton: panel.querySelector("#railLiveRender"),
      output: panel.querySelector("#railLiveOutput"),
      modal: panel.querySelector("#railLiveModal"),
      modalTitle: panel.querySelector("#railLiveModalTitle"),
      modalBody: panel.querySelector("#railLiveModalBody"),
      timer: null,
      focusTimer: null,
      activeStation: "",
      stationEvents: new Map(),
      snapshots: [],
      segment: null,
    };
  }

  function placeAfterAnchor(tab, panel) {
    const grid = document.querySelector("main .grid");
    const tabs = grid?.querySelector(".query-tabs");
    const anchorTab = document.getElementById(ANCHOR_TAB_ID) || document.getElementById("tab-master-table");
    const anchorPanel = document.getElementById(ANCHOR_PANEL_ID) || document.getElementById("panel-master-table");
    if (tabs && tab && anchorTab?.parentElement === tabs && anchorTab.nextElementSibling !== tab) anchorTab.insertAdjacentElement("afterend", tab);
    if (grid && panel && anchorPanel?.parentElement === grid && anchorPanel.nextElementSibling !== panel) anchorPanel.insertAdjacentElement("afterend", panel);
  }

  function insertTrackerPanel(system) {
    const grid = document.querySelector("main .grid");
    const tabs = grid?.querySelector(".query-tabs");
    if (!grid || !tabs || document.getElementById(PANEL_ID)) return null;
    const tab = document.createElement("button");
    tab.className = "query-tab";
    tab.id = TAB_ID;
    tab.type = "button";
    tab.dataset.target = PANEL_ID;
    tab.textContent = "即時動態";
    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "card query-panel rail-live-panel hidden";
    panel.innerHTML = buildPanelHTML(system);
    const anchorTab = document.getElementById(ANCHOR_TAB_ID) || document.getElementById("tab-master-table");
    const anchorPanel = document.getElementById(ANCHOR_PANEL_ID) || document.getElementById("panel-master-table");
    if (anchorTab?.parentElement === tabs) anchorTab.insertAdjacentElement("afterend", tab);
    else tabs.appendChild(tab);
    if (anchorPanel?.parentElement === grid) anchorPanel.insertAdjacentElement("afterend", panel);
    else grid.appendChild(panel);
    placeAfterAnchor(tab, panel);
    return { tab, panel };
  }

  function bindTrackerPanel(state, tab) {
    const run = () => {
      const previousLabel = state.renderButton.textContent;
      state.renderButton.disabled = true;
      state.renderButton.textContent = "更新中...";
      renderTracker(state).finally(() => {
        state.renderButton.disabled = false;
        state.renderButton.textContent = previousLabel;
      });
    };
    tab.addEventListener("click", () => {
      window.switchQueryPanel?.(PANEL_ID);
      run();
    });
    state.renderButton.addEventListener("click", run);
    state.routeSelect?.addEventListener("change", run);
    state.directionSelect?.addEventListener("change", run);
    let timer = null;
    state.searchInput?.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(run, 180);
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
    state.timer = window.setInterval(() => {
      if (!state.panel.classList.contains("hidden")) run();
    }, REFRESH_MS);
  }

  function init() {
    const system = getSystem();
    if (system !== "tr" && system !== "thsr") return;
    injectStyles();
    const inserted = insertTrackerPanel(system);
    if (!inserted) return;
    const state = buildState(system, inserted.panel);
    bindTrackerPanel(state, inserted.tab);
    const syncPlacement = () => placeAfterAnchor(inserted.tab, inserted.panel);
    if (document.readyState === "complete") setTimeout(syncPlacement, 0);
    else window.addEventListener("load", () => setTimeout(syncPlacement, 0), { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
