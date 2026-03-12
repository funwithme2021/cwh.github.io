(function () {
  if (typeof window.stationDB === "undefined") window.stationDB = { tr: [], thsr: [] };
  if (typeof window.assistantRouteCache === "undefined") window.assistantRouteCache = { date: "", tra: null, thsr: null };
  if (typeof window.assistantSeatCache === "undefined") window.assistantSeatCache = {};
  if (typeof window.assistantTrainLiveCache === "undefined") window.assistantTrainLiveCache = {};

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function dateToStr(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function getTodayDateStr() {
    return typeof todayDateStr === "function" ? todayDateStr() : dateToStr(new Date());
  }

  function addDays(dateStr, offset) {
    const date = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    date.setDate(date.getDate() + offset);
    return dateToStr(date);
  }

  function normalizeLoose(text) {
    return String(text || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/臺/g, "台")
      .replace(/車站/g, "")
      .replace(/站/g, "");
  }

  function resolveLocalStationName(raw, sys) {
    const list = Array.isArray(stationDB[sys]) ? stationDB[sys] : [];
    const normalized = normalizeLoose(raw);
    if (!normalized) return "";
    const exact = list.find((item) => normalizeLoose(item.name) === normalized);
    if (exact) return exact.name;
    const fuzzy = list.find((item) => {
      const name = normalizeLoose(item.name);
      return name.includes(normalized) || normalized.includes(name);
    });
    return fuzzy ? fuzzy.name : "";
  }

  function simplifyTypeName(typeName) {
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

  function formatDateLabel(dateStr) {
    const today = getTodayDateStr();
    if (dateStr === today) return `${dateStr} 今天`;
    if (dateStr === addDays(today, 1)) return `${dateStr} 明天`;
    if (dateStr === addDays(today, 2)) return `${dateStr} 後天`;
    return dateStr;
  }

  function normalizeDate(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return "";
    return dateToStr(date);
  }

  function parseDate(rawText) {
    let cleaned = String(rawText || "").trim();
    let dateStr = getTodayDateStr();

    if (/後天/.test(cleaned)) {
      cleaned = cleaned.replace(/後天/g, " ");
      dateStr = addDays(getTodayDateStr(), 2);
    } else if (/明天/.test(cleaned)) {
      cleaned = cleaned.replace(/明天/g, " ");
      dateStr = addDays(getTodayDateStr(), 1);
    } else if (/今天|今日/.test(cleaned)) {
      cleaned = cleaned.replace(/今天|今日/g, " ");
      dateStr = getTodayDateStr();
    } else {
      const ymd = cleaned.match(/(20\d{2})[\/\-年](\d{1,2})[\/\-月](\d{1,2})(?:日)?/);
      const mdSlash = ymd ? null : cleaned.match(/(^|[^\d])(\d{1,2})\/(\d{1,2})(?!\d)/);
      const mdDash = ymd || mdSlash ? null : cleaned.match(/(^|[^\d])(\d{1,2})-(\d{1,2})(?!\d)/);
      const mdZh = ymd || mdSlash || mdDash ? null : cleaned.match(/(\d{1,2})月(\d{1,2})日?/);
      const match = ymd || mdSlash || mdDash || mdZh;
      if (match) {
        const year = ymd ? match[1] : new Date().getFullYear();
        const month = ymd ? match[2] : (mdZh ? match[1] : match[2]);
        const day = ymd ? match[3] : (mdZh ? match[2] : match[3]);
        const parsed = normalizeDate(year, month, day);
        if (parsed) {
          cleaned = cleaned.replace(match[0], " ");
          dateStr = parsed;
        }
      }
    }

    return {
      dateStr,
      dateLabel: formatDateLabel(dateStr),
      cleanedText: cleaned.replace(/\s+/g, " ").trim(),
    };
  }

  function timeToMin(clock) {
    if (typeof timeToMinutes === "function") return timeToMinutes(clock);
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
    const depMin = timeToMin(dep);
    const arrMin = timeToMin(arr);
    if (depMin === null || arrMin === null) return "--";
    const diff = arrMin >= depMin ? arrMin - depMin : arrMin + 1440 - depMin;
    return formatDurationMinutes(diff);
  }

  function parseTimeWindow(rawText) {
    let cleaned = String(rawText || "").trim();
    let timeStartMin = null;
    let timeEndMin = null;
    let timeLabel = "";

    const rangeMatch = cleaned.match(/(\d{1,2}:\d{2})\s*(?:-|~|到)\s*(\d{1,2}:\d{2})/);
    if (rangeMatch) {
      const start = timeToMin(rangeMatch[1]);
      const end = timeToMin(rangeMatch[2]);
      if (start !== null && end !== null) {
        timeStartMin = start;
        timeEndMin = end;
        timeLabel = `${rangeMatch[1]}-${rangeMatch[2]}`;
        cleaned = cleaned.replace(rangeMatch[0], " ");
      }
    } else {
      const singleMatch = cleaned.match(/(^|[^\d])(\d{1,2}:\d{2})(?!\d)/);
      if (singleMatch) {
        const start = timeToMin(singleMatch[2]);
        if (start !== null) {
          timeStartMin = start;
          timeLabel = `${singleMatch[2]} 之後`;
          cleaned = cleaned.replace(singleMatch[2], " ");
        }
      }
    }

    return {
      timeStartMin,
      timeEndMin,
      timeLabel,
      hasTimeFilter: Number.isFinite(timeStartMin),
      cleanedText: cleaned.replace(/\s+/g, " ").trim(),
    };
  }

  function currentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function withDelayClock(clock, delayMin) {
    const base = timeToMin(clock);
    if (base === null) return clock || "--";
    let value = base + Math.max(0, Number(delayMin || 0));
    value = ((value % 1440) + 1440) % 1440;
    return `${pad2(Math.floor(value / 60))}:${pad2(value % 60)}`;
  }

  function countdownText(diff) {
    if (!Number.isFinite(diff)) return "";
    if (diff <= 0) return "已到站";
    return formatDurationMinutes(diff);
  }

  function etaText(clock, remainText) {
    if (!clock) return "--";
    if (!remainText) return `${clock} 抵達`;
    if (remainText === "已到站") return `${clock} 抵達 ｜ ${remainText}`;
    return `${clock} 抵達 ｜ 約還有 ${remainText}`;
  }

  function detectSystem(text) {
    if (/高鐵|thsr|hsr/i.test(text)) return "thsr";
    if (/台鐵|臺鐵|tra/i.test(text)) return "tr";
    return "";
  }

  function detectTraType(text) {
    if (/自強.*3000|3000型自強/.test(text)) return "自強號3000";
    if (/自強/.test(text)) return "自強號";
    if (/普悠瑪/.test(text)) return "普悠瑪";
    if (/太魯閣/.test(text)) return "太魯閣";
    if (/區間快/.test(text)) return "區間快";
    if (/區間/.test(text)) return "區間車";
    if (/莒光/.test(text)) return "莒光號";
    return "";
  }

  function matchesTraType(typeName, preference) {
    if (!preference) return true;
    const a = simplifyTypeName(typeName).replace(/\s+/g, "");
    const b = simplifyTypeName(preference).replace(/\s+/g, "");
    return a.includes(b) || b.includes(a);
  }

  function findMentionedStations(text, sys) {
    const normalizedText = normalizeLoose(text);
    const hits = [];
    (stationDB[sys] || []).forEach((item) => {
      const key = normalizeLoose(item.name);
      const idx = normalizedText.indexOf(key);
      if (idx >= 0) hits.push({ name: item.name, idx, len: key.length, sys });
    });
    const seen = new Set();
    return hits
      .sort((a, b) => a.idx - b.idx || b.len - a.len)
      .filter((item) => {
        const key = `${item.sys}|${item.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function cleanupRouteToken(value) {
    return String(value || "")
      .replace(/^(高鐵|台鐵|臺鐵|TRA|THSR)\s*/i, "")
      .replace(/\s*(高鐵|台鐵|臺鐵|TRA|THSR)$/i, "")
      .replace(/\s*(自強(?:號|3000)?|普悠瑪|太魯閣|區間快|區間車|區間|莒光號|莒光|直達優先|直達|不轉乘|免轉乘|可轉乘|轉乘|有沒有票|有票|票況|可訂|訂票|座位|班次|查詢|呢|嗎|全部站|停靠站|停靠|沿途)+\s*$/g, "")
      .replace(/\s*(車站|站)$/g, "")
      .trim();
  }

  function parseRouteTokens(text) {
    const routeMatch = text.match(/(.+?)(?:到|->|→|至)(.+)/);
    if (!routeMatch) return null;
    const startRaw = cleanupRouteToken(routeMatch[1]);
    const endRaw = cleanupRouteToken(routeMatch[2]);
    if (!startRaw || !endRaw || startRaw === endRaw) return null;
    return { startRaw, endRaw };
  }

  function parseIntent(rawText) {
    const dateInfo = parseDate(rawText);
    const timeInfo = parseTimeWindow(dateInfo.cleanedText);
    const text = timeInfo.cleanedText;
    if (!text) return null;

    const preference = detectSystem(text);
    const typePreference = detectTraType(text);
    const directOnly = /直達|不轉乘|免轉乘|直達優先/.test(text);
    const allowTransfer = /轉乘|換車|接駁/.test(text);
    const wantsTicket = /有票|票況|可訂|訂票|座位/.test(text);
    const showStops = /停靠|停靠站|沿途|全部站/.test(text);

    const trainMatch = text.match(/(?:車次|列車|高鐵|台鐵|臺鐵)?\s*(\d{1,4}[A-Z]?)\s*(?:次|號)?/i);
    if (trainMatch && String(trainMatch[1]).length >= 2) {
      const remaining = text.replace(trainMatch[0], " ");
      const targetMentions = [
        ...findMentionedStations(remaining, "tr"),
        ...findMentionedStations(remaining, "thsr"),
      ].sort((a, b) => a.idx - b.idx || b.len - a.len);

      return {
        kind: "train",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        preference,
        trainNoRaw: String(trainMatch[1]).toUpperCase(),
        targetRaw: targetMentions[0] ? targetMentions[0].name : "",
        showStops,
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }

    const routeTokens = parseRouteTokens(text);
    if (routeTokens) {
      return {
        kind: "route",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        preference,
        startRaw: routeTokens.startRaw,
        endRaw: routeTokens.endRaw,
        displayStart: routeTokens.startRaw,
        displayEnd: routeTokens.endRaw,
        typePreference,
        directOnly,
        allowTransfer,
        wantsTicket,
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }

    const stationMentions = [
      ...(preference === "thsr" ? [] : findMentionedStations(text, "tr")),
      ...(preference === "tr" ? [] : findMentionedStations(text, "thsr")),
    ].sort((a, b) => a.idx - b.idx || b.len - a.len);

    if (stationMentions.length && (/有什麼車|班次|列車|車站|站/.test(text) || stationMentions.length === 1)) {
      return {
        kind: "station",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        preference,
        stationRaw: stationMentions[0].name,
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }

    return null;
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

  function buildStopTimeline(stops) {
    let lastAbs = null;
    return (stops || []).map((stop) => {
      const arrMin = timeToMin(stop.arr || stop.dep || "");
      const depMin = timeToMin(stop.dep || stop.arr || "");
      let arrAbs = arrMin;
      let depAbs = depMin;

      if (Number.isFinite(arrAbs)) {
        while (lastAbs !== null && arrAbs < lastAbs) arrAbs += 1440;
        lastAbs = arrAbs;
      }
      if (Number.isFinite(depAbs)) {
        while (lastAbs !== null && depAbs < lastAbs) depAbs += 1440;
        lastAbs = depAbs;
      }

      return { ...stop, arrAbs, depAbs };
    });
  }

  function buildStopMap(stops) {
    const map = {};
    (stops || []).forEach((stop, index) => {
      if (stop && stop.name) map[stop.name] = index;
    });
    return map;
  }

  function getStopAbs(stop, kind) {
    if (!stop) return null;
    if (kind === "arr") return Number.isFinite(stop.arrAbs) ? stop.arrAbs : stop.depAbs;
    return Number.isFinite(stop.depAbs) ? stop.depAbs : stop.arrAbs;
  }

  function buildDateTimeByAbs(originDate, absMin) {
    if (!originDate || !Number.isFinite(absMin)) return null;
    const base = new Date(`${originDate}T00:00:00`);
    return new Date(base.getTime() + absMin * 60000);
  }

  function getDisplayDateByAbs(originDate, absMin) {
    const dt = buildDateTimeByAbs(originDate, absMin);
    return dt ? dateToStr(dt) : originDate || "";
  }

  function getNowRelativeAbs(originDate) {
    if (!originDate) return null;
    const base = new Date(`${originDate}T00:00:00`);
    return Math.floor((Date.now() - base.getTime()) / 60000);
  }

  function mapDailyTrain(item, sys, originDate) {
    const rawStops = (item.StopTimes || []).map((stop) => ({
      name: stop.StationName && stop.StationName.Zh_tw ? stop.StationName.Zh_tw : "",
      dep: stop.DepartureTime || stop.ArrivalTime || "",
      arr: stop.ArrivalTime || stop.DepartureTime || "",
    }));
    const stops = buildStopTimeline(rawStops);
    return {
      trainNo: sys === "tr"
        ? (item.TrainInfo && item.TrainInfo.TrainNo ? item.TrainInfo.TrainNo : "")
        : (item.DailyTrainInfo && item.DailyTrainInfo.TrainNo
            ? item.DailyTrainInfo.TrainNo
            : (item.TrainDate && item.TrainDate.TrainNo ? item.TrainDate.TrainNo : "")),
      type: sys === "tr"
        ? simplifyTypeName(item.TrainInfo && item.TrainInfo.TrainTypeName ? item.TrainInfo.TrainTypeName.Zh_tw || "" : "")
        : "高鐵",
      originDate,
      stops,
      stopMap: buildStopMap(stops),
    };
  }

  async function ensureToken() {
    if (typeof getTdxToken === "function") await getTdxToken();
    if (typeof tdxToken !== "undefined" && tdxToken) return tdxToken;
    return window.tdxToken || "";
  }

  async function loadDailyDataset(sys, originDate) {
    const token = await ensureToken();
    if (!token) return [];
    const headers = { Authorization: `Bearer ${token}` };
    const url = sys === "tr"
      ? `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${originDate}?%24format=JSON`
      : `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainDate/${originDate}?$format=JSON`;
    try {
      const data = await fetchJsonWithTimeout(url, { headers }, 9000);
      const list = sys === "tr" ? (data.TrainTimetables || []) : (Array.isArray(data) ? data : []);
      return list.map((item) => mapDailyTrain(item, sys, originDate));
    } catch (_) {
      return [];
    }
  }

  async function ensureData(dateStr, systems) {
    const wanted = Array.isArray(systems) ? systems : ["tr", "thsr"];
    if (assistantRouteCache.date !== dateStr) {
      assistantRouteCache = window.assistantRouteCache = { date: dateStr, tra: null, thsr: null };
    }
    const tasks = [];
    if (wanted.includes("tr") && !assistantRouteCache.tra) {
      tasks.push(
        Promise.all([loadDailyDataset("tr", dateStr), loadDailyDataset("tr", addDays(dateStr, -1))])
          .then(([current, previous]) => {
            assistantRouteCache.tra = [...current, ...previous];
          })
          .catch(() => {
            assistantRouteCache.tra = [];
          })
      );
    }
    if (wanted.includes("thsr") && !assistantRouteCache.thsr) {
      tasks.push(
        Promise.all([loadDailyDataset("thsr", dateStr), loadDailyDataset("thsr", addDays(dateStr, -1))])
          .then(([current, previous]) => {
            assistantRouteCache.thsr = [...current, ...previous];
          })
          .catch(() => {
            assistantRouteCache.thsr = [];
          })
      );
    }
    await Promise.all(tasks);
  }

  function trainVariants(trainNo, sys) {
    const raw = String(trainNo || "").trim().toUpperCase();
    if (!raw) return [];
    const set = new Set([raw]);
    if (sys === "thsr" && /^\d{3}$/.test(raw)) set.add(raw.padStart(4, "0"));
    if (sys === "tr" && /^\d{4}$/.test(raw) && raw.startsWith("0")) set.add(String(Number(raw)));
    return Array.from(set);
  }

  function getStationMeta(name, sys) {
    return (stationDB[sys] || []).find((item) => item.name === name) || null;
  }

  async function fetchSeatStatus(dateStr, startName, endName) {
    const startMeta = getStationMeta(startName, "thsr");
    const endMeta = getStationMeta(endName, "thsr");
    if (!startMeta || !endMeta || !startMeta.id || !endMeta.id) return {};
    const key = `${dateStr}|${startMeta.id}|${endMeta.id}`;
    if (assistantSeatCache[key]) return assistantSeatCache[key];

    const token = await ensureToken();
    if (!token) return {};
    try {
      const data = await fetchJsonWithTimeout(
        `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/AvailableSeatStatus/Train/OD/${startMeta.id}/to/${endMeta.id}/TrainDate/${dateStr}?$format=JSON`,
        { headers: { Authorization: `Bearer ${token}` } },
        6000
      );
      const map = {};
      (data.AvailableSeats || []).forEach((item) => {
        map[String(item.TrainNo)] = item.StandardSeatStatus;
      });
      assistantSeatCache[key] = map;
      return map;
    } catch (_) {
      return {};
    }
  }

  function seatMeta(code) {
    if (code === "O") return { text: "座位充裕", cls: "ok" };
    if (code === "L") return { text: "座位有限", cls: "warn" };
    if (code === "X") return { text: "接近售完", cls: "bad" };
    return null;
  }

  async function fetchTraLive(trainNo) {
    const key = `${getTodayDateStr()}|${trainNo}`;
    if (assistantTrainLiveCache[key] !== undefined) return assistantTrainLiveCache[key];
    const token = await ensureToken();
    if (!token) return null;
    try {
      const data = await fetchJsonWithTimeout(
        `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard/TrainNo/${trainNo}?%24format=JSON`,
        { headers: { Authorization: `Bearer ${token}` } },
        5000
      );
      assistantTrainLiveCache[key] = data.TrainLiveBoards ? data.TrainLiveBoards[0] : null;
      return assistantTrainLiveCache[key];
    } catch (_) {
      assistantTrainLiveCache[key] = null;
      return null;
    }
  }

  function matchesQueryTime(minuteValue, options) {
    if (!Number.isFinite(options && options.timeStartMin)) return true;
    if (!Number.isFinite(minuteValue)) return false;
    const start = options.timeStartMin;
    const end = Number.isFinite(options.timeEndMin) ? options.timeEndMin : null;
    if (end === null) return minuteValue >= start;
    if (end >= start) return minuteValue >= start && minuteValue <= end;
    return minuteValue >= start || minuteValue <= end;
  }

  async function addTodayLiveStatus(sys, services, dateStr) {
    if (sys !== "tr" || dateStr !== getTodayDateStr()) return services;
    const nowTs = Date.now();
    return Promise.all((services || []).map(async (service) => {
      if (!Number.isFinite(service.depTimestamp) || service.depTimestamp > nowTs) {
        return { ...service, depDisplay: service.dep, arrDisplay: service.arr };
      }
      const live = await fetchTraLive(service.trainNo);
      const delayMin = Math.max(0, Number(live && live.DelayTime ? live.DelayTime : 0));
      return {
        ...service,
        depDisplay: withDelayClock(service.dep, delayMin),
        arrDisplay: withDelayClock(service.arr, delayMin),
        delayMin,
        hasAdjustedTime: delayMin > 0,
        liveStatusText: delayMin > 0 ? `目前狀態：晚 ${delayMin} 分` : "目前狀態：準點",
      };
    }));
  }

  function collectDirect(dataset, startName, endName, options) {
    const useNow = options.dateStr === getTodayDateStr() && !options.hasTimeFilter;
    const nowTs = Date.now();
    const all = (dataset || []).map((train) => {
      const startIdx = train.stopMap ? train.stopMap[startName] : undefined;
      const endIdx = train.stopMap ? train.stopMap[endName] : undefined;
      if (!Number.isInteger(startIdx) || !Number.isInteger(endIdx) || endIdx <= startIdx) return null;
      if (options.sys === "tr" && options.typePreference && !matchesTraType(train.type, options.typePreference)) return null;

      const startStop = train.stops[startIdx];
      const endStop = train.stops[endIdx];
      const dep = startStop.dep || startStop.arr || "";
      const arr = endStop.arr || endStop.dep || "";
      const depAbs = getStopAbs(startStop, "dep");
      const arrAbs = getStopAbs(endStop, "arr");
      const depMin = timeToMin(dep);
      const depDT = buildDateTimeByAbs(train.originDate, depAbs);
      const arrDT = buildDateTimeByAbs(train.originDate, arrAbs);
      if (depMin === null || !depDT || !arrDT) return null;
      if (getDisplayDateByAbs(train.originDate, depAbs) !== options.dateStr) return null;
      if (!matchesQueryTime(depMin, options)) return null;

      let durationMin = Math.round((arrDT.getTime() - depDT.getTime()) / 60000);
      if (!Number.isFinite(durationMin) || durationMin < 0) durationMin += 1440;

      return {
        trainNo: train.trainNo,
        type: train.type,
        dep,
        arr,
        depMin,
        depTimestamp: depDT.getTime(),
        stopCount: Math.max(0, endIdx - startIdx - 1),
        duration: formatDurationMinutes(durationMin),
      };
    }).filter(Boolean).sort((a, b) => a.depTimestamp - b.depTimestamp);

    const filtered = useNow ? all.filter((item) => item.depTimestamp >= nowTs - 60000) : all;
    return {
      total: all.length,
      matches: filtered.slice(0, 3),
    };
  }

  function collectTransfer(dataset, startName, endName, options) {
    if (!Array.isArray(dataset) || !dataset.length) return [];
    const useNow = options.dateStr === getTodayDateStr() && !options.hasTimeFilter;
    const nowTs = Date.now();
    const plans = [];

    (dataset || []).forEach((firstTrain) => {
      if (options.typePreference && !matchesTraType(firstTrain.type, options.typePreference)) return;
      const startIdx = firstTrain.stopMap ? firstTrain.stopMap[startName] : undefined;
      if (!Number.isInteger(startIdx) || startIdx >= firstTrain.stops.length - 1) return;

      const startStop = firstTrain.stops[startIdx];
      const dep = startStop.dep || startStop.arr || "";
      const depAbs = getStopAbs(startStop, "dep");
      const depDT = buildDateTimeByAbs(firstTrain.originDate, depAbs);
      const depMin = timeToMin(dep);
      if (!depDT || depMin === null) return;
      if (getDisplayDateByAbs(firstTrain.originDate, depAbs) !== options.dateStr) return;
      if (!matchesQueryTime(depMin, options)) return;
      if (useNow && depDT.getTime() < nowTs - 60000) return;

      (dataset || []).forEach((secondTrain) => {
        if (secondTrain.trainNo === firstTrain.trainNo && secondTrain.originDate === firstTrain.originDate) return;
        const endIdx = secondTrain.stopMap ? secondTrain.stopMap[endName] : undefined;
        if (!Number.isInteger(endIdx) || endIdx <= 0) return;

        for (let midFirstIdx = startIdx + 1; midFirstIdx < firstTrain.stops.length; midFirstIdx += 1) {
          const transfer = firstTrain.stops[midFirstIdx].name;
          const midSecondIdx = secondTrain.stopMap ? secondTrain.stopMap[transfer] : undefined;
          if (!Number.isInteger(midSecondIdx) || midSecondIdx >= endIdx) continue;

          const firstMid = firstTrain.stops[midFirstIdx];
          const secondMid = secondTrain.stops[midSecondIdx];
          const endStop = secondTrain.stops[endIdx];
          const midArrDT = buildDateTimeByAbs(firstTrain.originDate, getStopAbs(firstMid, "arr"));
          const midDepDT = buildDateTimeByAbs(secondTrain.originDate, getStopAbs(secondMid, "dep"));
          const endArrDT = buildDateTimeByAbs(secondTrain.originDate, getStopAbs(endStop, "arr"));
          if (!midArrDT || !midDepDT || !endArrDT) continue;

          const waitMin = Math.round((midDepDT.getTime() - midArrDT.getTime()) / 60000);
          const totalMin = Math.round((endArrDT.getTime() - depDT.getTime()) / 60000);
          if (!Number.isFinite(waitMin) || waitMin < 0 || waitMin > 90) continue;
          if (!Number.isFinite(totalMin) || totalMin < 0) continue;

          plans.push({
            transfer,
            first: {
              trainNo: firstTrain.trainNo,
              type: firstTrain.type,
              dep,
              arr: firstMid.arr || firstMid.dep || "",
            },
            second: {
              trainNo: secondTrain.trainNo,
              type: secondTrain.type,
              dep: secondMid.dep || secondMid.arr || "",
              arr: endStop.arr || endStop.dep || "",
            },
            waitMin,
            totalMin,
            duration: formatDurationMinutes(totalMin),
            depTimestamp: depDT.getTime(),
          });
        }
      });
    });

    const seen = new Set();
    return plans
      .sort((a, b) => a.depTimestamp - b.depTimestamp || a.totalMin - b.totalMin)
      .filter((plan) => {
        const key = `${plan.first.trainNo}|${plan.first.dep}|${plan.second.trainNo}|${plan.transfer}|${plan.second.arr}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
  }

  function collectStation(dataset, stationName, options) {
    const useNow = options.dateStr === getTodayDateStr() && !options.hasTimeFilter;
    const nowTs = Date.now();
    const all = (dataset || []).map((train) => {
      const idx = train.stopMap ? train.stopMap[stationName] : undefined;
      if (!Number.isInteger(idx)) return null;
      const stop = train.stops[idx];
      const time = stop.dep || stop.arr || "";
      const timeMin = timeToMin(time);
      const timeAbs = getStopAbs(stop, "dep");
      const timeDT = buildDateTimeByAbs(train.originDate, timeAbs);
      if (timeMin === null || !timeDT) return null;
      if (getDisplayDateByAbs(train.originDate, timeAbs) !== options.dateStr) return null;
      if (!matchesQueryTime(timeMin, options)) return null;

      return {
        trainNo: train.trainNo,
        type: train.type,
        time,
        timeTimestamp: timeDT.getTime(),
        range: `${train.stops[0] ? train.stops[0].name : "--"} → ${train.stops[train.stops.length - 1] ? train.stops[train.stops.length - 1].name : "--"}`,
      };
    }).filter(Boolean).sort((a, b) => a.timeTimestamp - b.timeTimestamp);

    const filtered = useNow ? all.filter((item) => item.timeTimestamp >= nowTs - 60000) : all;
    return {
      total: all.length,
      matches: filtered.slice(0, 6),
    };
  }

  function isCrossDay(stops) {
    if (!Array.isArray(stops) || stops.length < 2) return false;
    const first = timeToMin(stops[0].dep || stops[0].arr || "");
    const last = timeToMin(stops[stops.length - 1].arr || stops[stops.length - 1].dep || "");
    return Number.isFinite(first) && Number.isFinite(last) && last < first;
  }

  function findNextStopIndex(stops, delayMin, nowAbs) {
    if (!Number.isFinite(nowAbs)) return -1;
    for (let index = 0; index < (stops || []).length; index += 1) {
      const value = getStopAbs(stops[index], "arr");
      if (!Number.isFinite(value)) continue;
      if (value + Math.max(0, Number(delayMin || 0)) >= nowAbs) return index;
    }
    return -1;
  }

  function buildStopPreview(stops, nextIndex, targetIndex, showAll) {
    if (!Array.isArray(stops) || !stops.length) return [];
    let from = 0;
    let to = Math.min(stops.length, 6);
    if (showAll) {
      to = stops.length;
    } else if (Number.isInteger(nextIndex) && nextIndex >= 0) {
      from = Math.max(0, nextIndex);
      to = Math.min(stops.length, nextIndex + 6);
      if (Number.isInteger(targetIndex) && targetIndex >= nextIndex) {
        to = Math.min(stops.length, targetIndex + 1);
      }
    }
    return stops.slice(from, to).map((stop) => `${stop.name}(${stop.arr || stop.dep || "--"})`);
  }

  async function buildTraTrain(train, intent, targetStation) {
    const stops = train.stops || [];
    const firstStation = stops[0] ? stops[0].name : "--";
    const lastStation = stops[stops.length - 1] ? stops[stops.length - 1].name : "--";
    const firstDep = stops[0] ? stops[0].dep || stops[0].arr || "--" : "--";
    const lastArr = stops[stops.length - 1] ? stops[stops.length - 1].arr || stops[stops.length - 1].dep || "--" : "--";
    const today = intent.dateStr === getTodayDateStr();
    const startAbs = getStopAbs(stops[0], "dep");
    const endAbs = getStopAbs(stops[stops.length - 1], "arr");
    const nowAbs = today ? getNowRelativeAbs(train.originDate) : null;
    let delayMin = 0;
    let statusText = today ? "準點" : "依時刻表";
    let currentLocation = today ? "正在整理即時位置" : "查詢日期非今日，僅顯示時刻表";
    let nextIndex = today ? findNextStopIndex(stops, 0, nowAbs) : -1;

    if (today) {
      const live = await fetchTraLive(train.trainNo);
      delayMin = Math.max(0, Number(live && live.DelayTime ? live.DelayTime : 0));
      const liveStation = live && live.StationName ? live.StationName.Zh_tw || "" : "";
      nextIndex = findNextStopIndex(stops, delayMin, nowAbs);

      if (Number.isFinite(startAbs) && Number.isFinite(nowAbs) && nowAbs < startAbs + delayMin) {
        statusText = "尚未發車";
        currentLocation = `預計 ${withDelayClock(firstDep, delayMin)} 由 ${firstStation} 發車`;
        nextIndex = 0;
      } else if (Number.isFinite(endAbs) && Number.isFinite(nowAbs) && nowAbs > endAbs + delayMin + 5) {
        statusText = "已到終點";
        currentLocation = `已抵達 ${lastStation}`;
        nextIndex = -1;
      } else {
        statusText = delayMin > 0 ? `晚 ${delayMin} 分` : "準點";
        if (liveStation) {
          currentLocation = `目前位置 ${liveStation}`;
          const liveIndex = train.stopMap ? train.stopMap[liveStation] : -1;
          if (Number.isInteger(liveIndex) && liveIndex < stops.length - 1) nextIndex = Math.max(nextIndex, liveIndex + 1);
        } else if (nextIndex > 0 && stops[nextIndex]) {
          currentLocation = `已離開 ${stops[nextIndex - 1].name}，前往 ${stops[nextIndex].name}`;
        } else if (nextIndex === 0) {
          currentLocation = `目前位置 ${firstStation}`;
        } else {
          currentLocation = `已抵達 ${lastStation}`;
        }
      }
    }

    const targetIndex = targetStation && train.stopMap ? train.stopMap[targetStation] : -1;
    const targetStop = Number.isInteger(targetIndex) ? stops[targetIndex] : null;
    const targetClock = targetStop ? targetStop.arr || targetStop.dep || "--" : "";
    const targetAbs = targetStop ? getStopAbs(targetStop, "arr") : null;
    const remainDiff = Number.isFinite(targetAbs) && Number.isFinite(nowAbs) ? targetAbs + delayMin - nowAbs : null;

    return {
      sys: "tr",
      label: "台鐵",
      routeText: `${firstStation} → ${lastStation}`,
      typeText: train.type,
      travelText: durationTextByClock(firstDep, lastArr),
      crossDayText: isCrossDay(stops) ? "跨日車" : "當日車",
      statusText,
      currentLocation,
      targetStation,
      etaClock: targetClock ? withDelayClock(targetClock, delayMin) : "",
      remainText: targetClock ? countdownText(remainDiff) : "",
      stopPreview: buildStopPreview(stops, nextIndex, targetIndex, intent.showStops),
      queryAction: `openAppOverlay("tr", { start: ${JSON.stringify(firstStation)}, end: ${JSON.stringify(lastStation)} })`,
      bookingAction: `assistantOpenTraBooking(${JSON.stringify(train.trainNo)}, ${JSON.stringify(firstStation)}, ${JSON.stringify(targetStation || lastStation)}, ${JSON.stringify(intent.dateStr)})`,
    };
  }

  async function buildThsrTrain(train, intent, targetStation) {
    const stops = train.stops || [];
    const firstStation = stops[0] ? stops[0].name : "--";
    const lastStation = stops[stops.length - 1] ? stops[stops.length - 1].name : "--";
    const firstDep = stops[0] ? stops[0].dep || stops[0].arr || "--" : "--";
    const lastArr = stops[stops.length - 1] ? stops[stops.length - 1].arr || stops[stops.length - 1].dep || "--" : "--";
    const today = intent.dateStr === getTodayDateStr();
    const startAbs = getStopAbs(stops[0], "dep");
    const endAbs = getStopAbs(stops[stops.length - 1], "arr");
    const nowAbs = today ? getNowRelativeAbs(train.originDate) : null;
    let statusText = today ? "準點" : "依時刻表";
    let currentLocation = today ? "正在整理行駛區間" : "查詢日期非今日，僅顯示時刻表";
    let nextIndex = today ? findNextStopIndex(stops, 0, nowAbs) : -1;

    if (today) {
      if (Number.isFinite(startAbs) && Number.isFinite(nowAbs) && nowAbs < startAbs) {
        statusText = "尚未發車";
        currentLocation = `預計 ${firstDep} 由 ${firstStation} 發車`;
        nextIndex = 0;
      } else if (Number.isFinite(endAbs) && Number.isFinite(nowAbs) && nowAbs > endAbs + 5) {
        statusText = "已到終點";
        currentLocation = `已抵達 ${lastStation}`;
        nextIndex = -1;
      } else if (nextIndex > 0 && stops[nextIndex]) {
        currentLocation = `已離開 ${stops[nextIndex - 1].name}，前往 ${stops[nextIndex].name}`;
      } else if (nextIndex === 0) {
        currentLocation = `目前位置 ${firstStation}`;
      } else {
        currentLocation = `已抵達 ${lastStation}`;
      }
    }

    const targetIndex = targetStation && train.stopMap ? train.stopMap[targetStation] : -1;
    const targetStop = Number.isInteger(targetIndex) ? stops[targetIndex] : null;
    const targetClock = targetStop ? targetStop.arr || targetStop.dep || "--" : "";
    const targetAbs = targetStop ? getStopAbs(targetStop, "arr") : null;
    const remainDiff = Number.isFinite(targetAbs) && Number.isFinite(nowAbs) ? targetAbs - nowAbs : null;

    return {
      sys: "thsr",
      label: "高鐵",
      routeText: `${firstStation} → ${lastStation}`,
      typeText: "高鐵",
      travelText: durationTextByClock(firstDep, lastArr),
      crossDayText: isCrossDay(stops) ? "跨日車" : "當日車",
      statusText,
      currentLocation,
      targetStation,
      etaClock: targetClock,
      remainText: targetClock ? countdownText(remainDiff) : "",
      stopPreview: buildStopPreview(stops, nextIndex, targetIndex, intent.showStops),
      queryAction: `openAppOverlay("thsr", { start: ${JSON.stringify(firstStation)}, end: ${JSON.stringify(lastStation)} })`,
      bookingAction: `assistantOpenTHSRBooking(${JSON.stringify(train.trainNo)}, ${JSON.stringify(firstStation)}, ${JSON.stringify(targetStation || lastStation)}, ${JSON.stringify(intent.dateStr)}, ${JSON.stringify(firstDep)})`,
    };
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function metaRow(items) {
    const html = (items || [])
      .filter(Boolean)
      .map((item) => `<span class="assistant-meta-pill">${escapeHtml(item)}</span>`)
      .join("");
    return html ? `<div class="assistant-meta-row">${html}</div>` : "";
  }

  function syncAssistantState(title, hint, tone) {
    if (typeof window.updateAssistantLoadingState === "function") {
      window.updateAssistantLoadingState(title, hint, tone);
    }
  }

  function getAnswerElement() {
    return window.assistantRenderTarget || document.getElementById("assistantAnswer");
  }

  function renderLoading(title, detail) {
    const answer = getAnswerElement();
    const finalTitle = title || "正在整理資料";
    const finalDetail = detail || "正在同步台鐵 / 高鐵資料、票況與列車狀態，幫你整理最適合的結果。";
    syncAssistantState(finalTitle, finalDetail, "loading");
    if (!answer) return;
    answer.innerHTML = `
      <div class="assistant-placeholder">
        <strong>${escapeHtml(finalTitle)}</strong>
        <div>${escapeHtml(finalDetail)}</div>
      </div>
    `;
  }

  function renderError(message) {
    const answer = getAnswerElement();
    syncAssistantState("這次查詢沒有成功", message, "error");
    if (!answer) return;
    answer.innerHTML = `<div class="assistant-error">${escapeHtml(message)}</div>`;
  }

  function renderRoute(intent, results) {
    const answer = getAnswerElement();
    syncAssistantState("旅程建議已整理完成", "你可以繼續換條件，或直接打開完整查詢與訂票入口。", "ready");
    if (!answer) return;
    answer.innerHTML = `
      <div class="assistant-route-title">
        <span class="assistant-helper-badge">旅程建議</span>
        <strong>${escapeHtml(intent.displayStart)} → ${escapeHtml(intent.displayEnd)}</strong>
      </div>
      ${metaRow([
        formatDateLabel(intent.dateStr),
        intent.timeLabel ? `時間 ${intent.timeLabel}` : "",
        intent.preference ? (intent.preference === "tr" ? "台鐵" : "高鐵") : "自動比較台鐵 / 高鐵",
        intent.typePreference || "",
        intent.directOnly ? "直達優先" : (intent.allowTransfer ? "可轉乘" : ""),
      ])}
      <div class="assistant-note">先整理直達班次；如果你允許轉乘，或直達不足時，會再補上 1 次轉乘建議。高鐵若有查票需求，也會一起顯示票況。</div>
      <div class="assistant-system-list" style="margin-top:14px;">
        ${results.map((result) => `
          <div class="assistant-system-card">
            <div class="assistant-system-head">
              <span class="assistant-system-tag ${result.sys === "tr" ? "tr" : "thsr"}">${escapeHtml(result.label)}</span>
              <span class="assistant-system-note">${result.direct.matches.length ? "已有可搭班次" : "目前沒有符合條件的直達班次"}</span>
            </div>
            <div class="assistant-section-block">
              <div class="assistant-section-title">直達建議</div>
              ${result.direct.matches.length ? `
                <div class="assistant-service-grid">
                  ${result.direct.matches.map((service) => `
                    <div class="assistant-service-row">
                      <div class="assistant-service-main">
                        <strong>${escapeHtml(service.trainNo)} 次${result.sys === "tr" ? ` <span class="assistant-inline-tag">${escapeHtml(service.type)}</span>` : ""}</strong>
                        <small>${escapeHtml(service.depDisplay || service.dep)} ${escapeHtml(result.start)} 出發 → ${escapeHtml(service.arrDisplay || service.arr)} ${escapeHtml(result.end)} 抵達 ｜ ${escapeHtml(service.duration)}${service.stopCount > 0 ? ` ｜ 中途 ${service.stopCount} 站` : " ｜ 直達"}${service.liveStatusText ? ` ｜ ${escapeHtml(service.liveStatusText)}` : ""}${service.hasAdjustedTime ? ` ｜ 原定 ${escapeHtml(service.dep)}→${escapeHtml(service.arr)}` : ""}</small>
                      </div>
                      <div class="assistant-service-side">
                        ${service.seat ? `<span class="assistant-seat-pill ${service.seat.cls}">${escapeHtml(service.seat.text)}</span>` : ""}
                        <button class="assistant-compact-btn" type="button" onclick='${result.sys === "tr" ? `assistantOpenTraBooking(${JSON.stringify(service.trainNo)}, ${JSON.stringify(result.start)}, ${JSON.stringify(result.end)}, ${JSON.stringify(intent.dateStr)})` : `assistantOpenTHSRBooking(${JSON.stringify(service.trainNo)}, ${JSON.stringify(result.start)}, ${JSON.stringify(result.end)}, ${JSON.stringify(intent.dateStr)}, ${JSON.stringify(service.dep)})`}'>訂票</button>
                      </div>
                    </div>
                  `).join("")}
                </div>
              ` : `<div class="assistant-empty-note">${result.direct.total > 0 ? "當日有班次，但目前時間條件下沒有符合的直達車。" : "這一天查不到符合條件的直達資料。"}</div>`}
            </div>
            ${!intent.directOnly && result.transfers.length ? `
              <div class="assistant-section-block">
                <div class="assistant-section-title">轉乘建議</div>
                <div class="assistant-service-grid">
                  ${result.transfers.map((item) => `
                    <div class="assistant-service-row">
                      <div class="assistant-service-main">
                        <strong>${escapeHtml(item.first.trainNo)} 次 <span class="assistant-inline-tag">${escapeHtml(item.first.type)}</span> → ${escapeHtml(item.second.trainNo)} 次 <span class="assistant-inline-tag">${escapeHtml(item.second.type)}</span></strong>
                        <small>${escapeHtml(item.first.dep)} ${escapeHtml(result.start)} 出發 ｜ ${escapeHtml(item.first.arr)} 於 ${escapeHtml(item.transfer)} 轉乘 ｜ 等待 ${item.waitMin} 分 ｜ ${escapeHtml(item.second.arr)} 抵達 ${escapeHtml(result.end)} ｜ 總耗時 ${escapeHtml(item.duration)}</small>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : ""}
            <div class="assistant-actions">
              <button class="assistant-action-btn" type="button" onclick='openAppOverlay(${JSON.stringify(result.sys)}, { start: ${JSON.stringify(result.start)}, end: ${JSON.stringify(result.end)} })'>打開${escapeHtml(result.label)}完整查詢</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderTrain(intent, results) {
    const answer = getAnswerElement();
    syncAssistantState("車次資訊已整理完成", "已整理目前狀態、目前位置與預估抵達資訊。", "ready");
    if (!answer) return;
    answer.innerHTML = `
      <div class="assistant-route-title">
        <span class="assistant-helper-badge">車次狀態</span>
        <strong>${escapeHtml(intent.trainNoRaw)} 次</strong>
      </div>
      ${metaRow([
        formatDateLabel(intent.dateStr),
        intent.timeLabel ? `時間 ${intent.timeLabel}` : "",
        intent.targetRaw ? `目標站 ${intent.targetRaw}` : "",
        intent.showStops ? "顯示停靠站" : "",
      ])}
      <div class="assistant-system-list" style="margin-top:14px;">
        ${results.map((result) => `
          <div class="assistant-system-card">
            <div class="assistant-system-head">
              <span class="assistant-system-tag ${result.sys === "tr" ? "tr" : "thsr"}">${escapeHtml(result.label)}</span>
              <span class="assistant-system-note">${escapeHtml(result.routeText)}</span>
            </div>
            <div class="assistant-train-grid">
              <div class="assistant-stat-card"><span>目前狀態</span><strong>${escapeHtml(result.statusText)}</strong></div>
              <div class="assistant-stat-card"><span>目前位置</span><strong>${escapeHtml(result.currentLocation)}</strong></div>
              <div class="assistant-stat-card"><span>車種 / 跨日</span><strong>${escapeHtml(result.typeText)} ｜ ${escapeHtml(result.crossDayText)}</strong></div>
              <div class="assistant-stat-card"><span>${result.targetStation ? "預估抵達" : "預估車程"}</span><strong>${result.targetStation ? escapeHtml(etaText(result.etaClock || "--", result.remainText || "")) : escapeHtml(result.travelText)}</strong></div>
            </div>
            ${result.stopPreview.length ? `<div class="assistant-section-title">停靠摘要</div><div class="assistant-stop-strip">${result.stopPreview.map((item) => `<span class="assistant-stop-chip">${escapeHtml(item)}</span>`).join("")}</div>` : ""}
            <div class="assistant-actions">
              <button class="assistant-action-btn" type="button" onclick='${result.queryAction}'>打開${escapeHtml(result.label)}完整查詢</button>
              <button class="assistant-action-btn" type="button" onclick='${result.bookingAction}'>前往訂票</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderStation(intent, results) {
    const answer = getAnswerElement();
    syncAssistantState("車站班次已整理完成", "已依日期與時間條件列出下一批班次。", "ready");
    if (!answer) return;
    answer.innerHTML = `
      <div class="assistant-route-title">
        <span class="assistant-helper-badge">車站班次</span>
        <strong>${escapeHtml(intent.stationRaw)}</strong>
      </div>
      ${metaRow([
        formatDateLabel(intent.dateStr),
        intent.timeLabel ? `時間 ${intent.timeLabel}` : "",
        intent.preference ? (intent.preference === "tr" ? "台鐵" : "高鐵") : "台鐵 / 高鐵",
      ])}
      <div class="assistant-system-list" style="margin-top:14px;">
        ${results.map((result) => `
          <div class="assistant-system-card">
            <div class="assistant-system-head">
              <span class="assistant-system-tag ${result.sys === "tr" ? "tr" : "thsr"}">${escapeHtml(result.label)}</span>
              <span class="assistant-system-note">${result.services.matches.length ? "已整理下一批班次" : "沒有符合時間條件的班次"}</span>
            </div>
            <div class="assistant-service-grid">
              ${result.services.matches.length ? result.services.matches.map((item) => `
                <div class="assistant-service-row">
                  <div class="assistant-service-main">
                    <strong>${escapeHtml(item.trainNo)} 次${result.sys === "tr" ? ` <span class="assistant-inline-tag">${escapeHtml(item.type)}</span>` : ""}</strong>
                    <small>${escapeHtml(item.time)} ｜ ${escapeHtml(item.range)}</small>
                  </div>
                </div>
              `).join("") : `<div class="assistant-empty-note">目前沒有符合這個日期與時間條件的班次。</div>`}
            </div>
            <div class="assistant-actions">
              <button class="assistant-action-btn" type="button" onclick='openAppOverlay(${JSON.stringify(result.sys)}, { station: ${JSON.stringify(result.station)} })'>打開${escapeHtml(result.label)}車站查詢</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  async function assistantOpenTraBooking(trainNo, startStationName, endStationName, dateStr) {
    try {
      const token = await ensureToken();
      if (!token) {
        alert("目前無法取得訂票授權，請稍後再試。");
        return;
      }
      const start = String(startStationName || "").replace(/台/g, "臺");
      const end = String(endStationName || "").replace(/台/g, "臺");
      const result = await fetchJsonWithTimeout(
        `https://tdx.transportdata.tw/api/maas-tra/booking/deeplink/direct/tra?start_station=${encodeURIComponent(start)}&end_station=${encodeURIComponent(end)}&train_date=${encodeURIComponent(dateStr)}&train_number=${encodeURIComponent(String(trainNo))}`,
        { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
        8000
      );
      const jumpUrl = (result.data && result.data.deeplink) || result.DeepLinkUrl || result.url;
      if (!jumpUrl) {
        alert("目前拿不到台鐵訂票連結。");
        return;
      }
      if (window.top && window.top !== window) window.top.location.href = jumpUrl;
      else window.location.href = jumpUrl;
    } catch (_) {
      alert("台鐵訂票導頁失敗，請稍後再試。");
    }
  }

  async function assistantOpenTHSRBooking(trainNo, startStationName, endStationName, dateStr, timeStr) {
    try {
      const token = typeof getAccessToken === "function" ? await getAccessToken() : await ensureToken();
      if (!token) {
        alert("目前無法取得高鐵訂票授權，請稍後再試。");
        return;
      }
      const start = String(startStationName || "").replace(/臺/g, "台");
      const end = String(endStationName || "").replace(/臺/g, "台");
      const response = await fetchWithTimeout(
        `https://tdx.transportdata.tw/api/maas-thsr/booking/deeplink/direct/hsr?start_station=${encodeURIComponent(start)}&end_station=${encodeURIComponent(end)}&train_date=${dateStr}&train_time=${encodeURIComponent(timeStr)}&train_number=${trainNo}`,
        { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
        8000
      );
      if (!response.ok) {
        alert(`高鐵訂票導頁失敗（HTTP ${response.status}）。`);
        return;
      }
      const result = await response.json();
      const jumpUrl = result.url || (result.data && result.data.deeplink) || result.DeepLinkUrl;
      if (!jumpUrl) {
        alert("目前拿不到高鐵訂票連結。");
        return;
      }
      if (window.top && window.top !== window) window.top.location.href = jumpUrl;
      else window.location.href = jumpUrl;
    } catch (_) {
      alert("高鐵訂票導頁失敗，請稍後再試。");
    }
  }

  window.assistantOpenTraBooking = assistantOpenTraBooking;
  window.assistantOpenTHSRBooking = assistantOpenTHSRBooking;
  window.ensureAssistantRouteData = ensureData;
  window.handleAssistantQuery = async function (rawText) {
    const text = String(rawText || "").trim();
    if (!text) {
      renderError("請先輸入問題，例如「今天 08:00 台北到台中」「4/5 08:10-12:00 高鐵台北到左營」「412次台中幾點到」或「板橋站有什麼車」。");
      return;
    }

    if ((!stationDB.tr || !stationDB.tr.length) || (!stationDB.thsr || !stationDB.thsr.length)) {
      renderLoading("正在同步站點資料", "第一次查詢會先確認台鐵與高鐵站名資料。");
      if (typeof fetchAllStations === "function") await fetchAllStations();
    }

    const intent = parseIntent(text);
    if (!intent) {
      renderError("我目前支援三種問法：起訖站旅程、車次狀態、車站班次，也支援加上時間條件。例如「明天台北到台中自強號」「高鐵台北到左營有沒有票」「126次現在到哪了」或「台中站 08:10-12:00 有什麼車」。");
      return;
    }

    renderLoading("正在解析問題", "正在確認日期、時間、車次與車站條件。");

    if (intent.kind === "route") {
      const systems = intent.preference ? [intent.preference] : (intent.typePreference ? ["tr"] : ["tr", "thsr"]);
      const candidates = systems.map((sys) => {
        const start = resolveLocalStationName(intent.startRaw, sys);
        const end = resolveLocalStationName(intent.endRaw, sys);
        if (!start || !end || start === end) return null;
        return { sys, label: sys === "tr" ? "台鐵" : "高鐵", start, end };
      }).filter(Boolean);

      if (!candidates.length) {
        renderError(`我暫時找不到「${intent.startRaw} → ${intent.endRaw}」對應的站名，請再試一次完整站名。`);
        return;
      }

      renderLoading("正在同步時刻表", "正在讀取查詢日期與前一天的台鐵 / 高鐵時刻資料。");
      await ensureData(intent.dateStr, candidates.map((item) => item.sys));

      const results = [];
      for (let index = 0; index < candidates.length; index += 1) {
        const item = candidates[index];
        const dataset = item.sys === "tr" ? assistantRouteCache.tra : assistantRouteCache.thsr;
        const direct = collectDirect(dataset, item.start, item.end, {
          dateStr: intent.dateStr,
          sys: item.sys,
          typePreference: intent.typePreference,
          timeStartMin: intent.timeStartMin,
          timeEndMin: intent.timeEndMin,
          hasTimeFilter: intent.hasTimeFilter,
        });

        if (item.sys === "thsr" && direct.matches.length && intent.wantsTicket) {
          renderLoading("正在查詢高鐵票況", `正在確認 ${item.start} → ${item.end} 的可售座位。`);
          const seatMap = await fetchSeatStatus(intent.dateStr, item.start, item.end);
          direct.matches = direct.matches.map((service) => ({
            ...service,
            seat: seatMeta(seatMap[String(service.trainNo)]),
          }));
        }

        renderLoading("正在整理列車狀態", "正在比對今日班次的準點、誤點與調整後時間。");
        direct.matches = await addTodayLiveStatus(item.sys, direct.matches, intent.dateStr);

        const transfers = !intent.directOnly && item.sys === "tr" && (intent.allowTransfer || !direct.matches.length)
          ? collectTransfer(dataset, item.start, item.end, {
              dateStr: intent.dateStr,
              typePreference: intent.typePreference,
              timeStartMin: intent.timeStartMin,
              timeEndMin: intent.timeEndMin,
              hasTimeFilter: intent.hasTimeFilter,
            })
          : [];

        results.push({ ...item, direct, transfers });
      }

      renderRoute(intent, results);
      return;
    }

    if (intent.kind === "train") {
      const systems = intent.preference ? [intent.preference] : ["tr", "thsr"];
      renderLoading("正在查詢列車資料", "正在讀取該車次的完整停靠、跨日與即時狀態資訊。");
      await ensureData(intent.dateStr, systems);
      const results = [];
      for (let index = 0; index < systems.length; index += 1) {
        const sys = systems[index];
        const dataset = sys === "tr" ? assistantRouteCache.tra : assistantRouteCache.thsr;
        const train = (dataset || []).find((item) => trainVariants(intent.trainNoRaw, sys).includes(String(item.trainNo).toUpperCase()));
        if (!train) continue;
        const targetStation = intent.targetRaw ? resolveLocalStationName(intent.targetRaw, sys) : "";
        const summary = sys === "tr" ? await buildTraTrain(train, intent, targetStation) : await buildThsrTrain(train, intent, targetStation);
        results.push(summary);
      }
      if (!results.length) {
        renderError(`我暫時找不到 ${intent.trainNoRaw} 次在 ${formatDateLabel(intent.dateStr)} 的資料，請確認車次或日期。`);
        return;
      }
      renderTrain(intent, results);
      return;
    }

    if (intent.kind === "station") {
      const systems = intent.preference ? [intent.preference] : ["tr", "thsr"];
      renderLoading("正在查詢車站班次", "正在整理指定日期與時間條件下的下一批班次。");
      await ensureData(intent.dateStr, systems);
      const results = [];
      for (let index = 0; index < systems.length; index += 1) {
        const sys = systems[index];
        const station = resolveLocalStationName(intent.stationRaw, sys);
        if (!station) continue;
        const dataset = sys === "tr" ? assistantRouteCache.tra : assistantRouteCache.thsr;
        results.push({
          sys,
          label: sys === "tr" ? "台鐵" : "高鐵",
          station,
          services: collectStation(dataset, station, {
            dateStr: intent.dateStr,
            sys,
            timeStartMin: intent.timeStartMin,
            timeEndMin: intent.timeEndMin,
            hasTimeFilter: intent.hasTimeFilter,
          }),
        });
      }
      if (!results.length) {
        renderError(`我暫時找不到 ${intent.stationRaw} 的班次資料，請再試一次完整站名。`);
        return;
      }
      renderStation(intent, results);
    }
  };
})();
