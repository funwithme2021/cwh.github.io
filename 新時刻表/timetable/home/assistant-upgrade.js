(function () {
  function pad2(num) {
    return String(num).padStart(2, "0");
  }

  function dateToStr(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function addDays(dateStr, offset) {
    const date = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    date.setDate(date.getDate() + offset);
    return dateToStr(date);
  }

  function formatDateLabel(dateStr) {
    const today = todayDateStr();
    if (dateStr === today) return `${dateStr} 今日`;
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
    let dateStr = todayDateStr();
    let dateLabel = "今天";

    if (/後天/.test(cleaned)) {
      cleaned = cleaned.replace(/後天/g, " ");
      dateStr = addDays(todayDateStr(), 2);
      dateLabel = "後天";
    } else if (/明天/.test(cleaned)) {
      cleaned = cleaned.replace(/明天/g, " ");
      dateStr = addDays(todayDateStr(), 1);
      dateLabel = "明天";
    } else if (/今天|今日/.test(cleaned)) {
      cleaned = cleaned.replace(/今天|今日/g, " ");
      dateStr = todayDateStr();
      dateLabel = "今天";
    } else {
      const ymd = cleaned.match(/(20\d{2})[\/\-年](\d{1,2})[\/\-月](\d{1,2})日?/);
      const mdSlash = ymd ? null : cleaned.match(/(^|[^\d])(\d{1,2})\/(\d{1,2})(?!\d)/);
      const mdDash = ymd || mdSlash ? null : cleaned.match(/(^|[^\d])(\d{1,2})-(\d{1,2})(?!\d)/);
      const mdZh = ymd || mdSlash || mdDash ? null : cleaned.match(/(\d{1,2})月(\d{1,2})日/);
      if (ymd) {
        const parsed = normalizeDate(ymd[1], ymd[2], ymd[3]);
        if (parsed) {
          cleaned = cleaned.replace(ymd[0], " ");
          dateStr = parsed;
          dateLabel = parsed;
        }
      } else {
        const match = mdSlash || mdDash || mdZh;
        if (match) {
          const month = mdZh ? match[1] : match[2];
          const day = mdZh ? match[2] : match[3];
          const parsed = normalizeDate(new Date().getFullYear(), month, day);
          if (parsed) {
            cleaned = cleaned.replace(match[0], " ");
            dateStr = parsed;
            dateLabel = parsed;
          }
        }
      }
    }

    return {
      dateStr,
      dateLabel,
      cleanedText: cleaned.replace(/\s+/g, " ").trim(),
    };
  }

  function parseTimeWindow(rawText) {
    let cleaned = String(rawText || "").trim();
    let timeStartMin = null;
    let timeEndMin = null;
    let timeLabel = "";

    const rangeMatch = cleaned.match(/(\d{1,2}:\d{2})\s*(?:-|~|～|到|至)\s*(\d{1,2}:\d{2})/);
    if (rangeMatch) {
      const start = timeToMinutes(rangeMatch[1]);
      const end = timeToMinutes(rangeMatch[2]);
      if (start !== null && end !== null) {
        timeStartMin = start;
        timeEndMin = end;
        timeLabel = `${rangeMatch[1]}-${rangeMatch[2]}`;
        cleaned = cleaned.replace(rangeMatch[0], " ");
      }
    } else {
      const singleMatch = cleaned.match(/(^|[^\d])(\d{1,2}:\d{2})(?!\d)/);
      if (singleMatch) {
        const start = timeToMinutes(singleMatch[2]);
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
      hasTimeFilter: timeStartMin !== null,
      cleanedText: cleaned.replace(/\s+/g, " ").trim(),
    };
  }

  function currentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function withDelayClock(clock, delayMin) {
    const base = timeToMinutes(clock);
    if (base === null) return clock || "--";
    let value = base + Math.max(0, Number(delayMin || 0));
    value = ((value % 1440) + 1440) % 1440;
    return `${pad2(Math.floor(value / 60))}:${pad2(value % 60)}`;
  }

  function minutesUntil(clock, dateStr, delayMin) {
    if (dateStr !== todayDateStr()) return null;
    const base = timeToMinutes(clock);
    if (base === null) return null;
    let value = base + Math.max(0, Number(delayMin || 0));
    const nowMin = currentMinutes();
    if (value < nowMin - 720) value += 1440;
    return value - nowMin;
  }

  function countdownText(diff) {
    if (!Number.isFinite(diff)) return "—";
    if (diff <= 0) return "已到站或即將到站";
    if (diff >= 60) return `${Math.floor(diff / 60)} 小時 ${diff % 60} 分`;
    return `${diff} 分`;
  }

  function etaText(clock, remainText) {
    if (!clock) return "--";
    if (!remainText) return `${clock} 抵達`;
    if (remainText === "已到站或即將到站") return `${clock} 抵達 ｜ ${remainText}`;
    return `${clock} 抵達 ｜ 約還有 ${remainText}`;
  }

  function detectSystem(text) {
    if (/高鐵|thsr|hsr/i.test(text)) return "thsr";
    if (/台鐵|臺鐵|tra|火車|自強|普悠瑪|太魯閣|區間|莒光/i.test(text)) return "tr";
    return "";
  }

  function detectTraType(text) {
    if (/新自強|3000/i.test(text)) return "新自強";
    if (/普悠瑪/i.test(text)) return "普悠瑪";
    if (/太魯閣/i.test(text)) return "太魯閣";
    if (/區間快/i.test(text)) return "區間快";
    if (/區間/i.test(text)) return "區間車";
    if (/莒光/i.test(text)) return "莒光";
    if (/復興/i.test(text)) return "復興";
    if (/自強/i.test(text)) return "自強號";
    return "";
  }

  function matchesTraType(typeName, preference) {
    if (!preference) return true;
    const a = simplifyTraTypeName(typeName).replace(/號/g, "");
    const b = simplifyTraTypeName(preference).replace(/號/g, "");
    return a.includes(b) || b.includes(a);
  }

  function findMentionedStations(text, sys) {
    const normalized = normalizeLooseStation(text);
    const hits = [];
    (stationDB[sys] || []).forEach((item) => {
      const key = normalizeLooseStation(item.name);
      const idx = normalized.indexOf(key);
      if (idx >= 0) hits.push({ name: item.name, idx, len: key.length });
      if (sys === "thsr" && item.name === "左營") {
        const aliasIdx = normalized.indexOf(normalizeLooseStation("新左營"));
        if (aliasIdx >= 0) hits.push({ name: item.name, idx: aliasIdx, len: 3 });
      }
    });
    const seen = new Set();
    return hits
      .sort((a, b) => a.idx - b.idx || b.len - a.len)
      .filter((item) => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      });
  }

  function parseIntent(rawText) {
    const dateInfo = parseDate(rawText);
    const timeInfo = parseTimeWindow(dateInfo.cleanedText);
    const text = timeInfo.cleanedText;
    if (!text) return null;
    const routeMatch = text.replace(/[，、。？]/g, " ").match(/(?:從)?\s*([^\s]+?)\s*(?:到|至|去|→|->)\s*([^\s]+)(?:\s|$)/);
    if (routeMatch) {
      const cleanToken = (value) =>
        String(value || "")
          .replace(/^(高鐵|台鐵|臺鐵|火車|列車|我要|我想|請問|幫我查|查一下)/i, "")
          .replace(/(怎麼搭|怎麼去|有票嗎|有沒有票|可轉乘|轉乘|直達|幾點到|多久|車種|票況|座位|班次)$/g, "")
          .trim();
      const startRaw = cleanToken(routeMatch[1]);
      const endRaw = cleanToken(routeMatch[2]);
      if (startRaw && endRaw && startRaw !== endRaw) {
        return {
          kind: "route",
          dateStr: dateInfo.dateStr,
          dateLabel: dateInfo.dateLabel,
          preference: detectSystem(text),
          startRaw,
          endRaw,
          displayStart: startRaw,
          displayEnd: endRaw,
          typePreference: detectTraType(text),
          directOnly: /直達|不要轉乘|不轉乘|免轉乘/.test(text),
          allowTransfer: /轉乘|換車|可轉乘/.test(text),
          wantsTicket: /有票|票況|可訂|訂票|座位/.test(text),
          timeStartMin: timeInfo.timeStartMin,
          timeEndMin: timeInfo.timeEndMin,
          timeLabel: timeInfo.timeLabel,
          hasTimeFilter: timeInfo.hasTimeFilter,
        };
      }
    }

    const trainMatch = text.match(/(?:車次|列車|高鐵|台鐵|臺鐵|火車)?\s*(\d{1,4}[A-Z]?)(?:\s*次)?/i);
    if (trainMatch && String(trainMatch[1]).length >= 2) {
      const preference = detectSystem(text);
      const remaining = text.replace(trainMatch[0], " ");
      const mentions = [];
      if (preference !== "thsr") mentions.push(...findMentionedStations(remaining, "tr").map((item) => ({ ...item, sys: "tr" })));
      if (preference !== "tr") mentions.push(...findMentionedStations(remaining, "thsr").map((item) => ({ ...item, sys: "thsr" })));
      mentions.sort((a, b) => a.idx - b.idx || b.len - a.len);
      return {
        kind: "train",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        preference,
        trainNoRaw: String(trainMatch[1]).toUpperCase(),
        targetRaw: mentions[0] ? mentions[0].name : "",
        showStops: /停靠|停哪些站|停哪裡|沿途|停靠站|全部站/.test(text),
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }

    const stationPreference = detectSystem(text);
    const systems = stationPreference ? [stationPreference] : ["tr", "thsr"];
    const stationMentions = systems
      .flatMap((sys) => findMentionedStations(text, sys).map((item) => ({ ...item, sys })))
      .sort((a, b) => a.idx - b.idx || b.len - a.len);
    const wantsStationInfo = /車站|班次|列車|有什麼車|有什麼班次|下一班|出發|到站|進站/.test(text);
    if (stationMentions.length && (wantsStationInfo || normalizeLooseStation(text) === normalizeLooseStation(stationMentions[0].name))) {
      return {
        kind: "station",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        preference: stationPreference,
        stationRaw: stationMentions[0].name,
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }

    return null;
  }

  function buildStopMap(stops) {
    const map = {};
    (stops || []).forEach((stop, idx) => {
      if (stop && stop.name) map[stop.name] = idx;
    });
    return map;
  }

  async function ensureData(dateStr, systems) {
    const wanted = Array.isArray(systems) ? systems : ["tr", "thsr"];
    if (!tdxToken) await getTdxToken();
    if (!tdxToken) return;
    if (assistantRouteCache.date !== dateStr) {
      assistantRouteCache = { date: dateStr, tra: null, thsr: null };
    }
    const headers = { Authorization: `Bearer ${tdxToken}` };
    const tasks = [];
    if (wanted.includes("tr") && !assistantRouteCache.tra) {
      tasks.push(
        fetch(`https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${dateStr}?%24format=JSON`, { headers })
          .then((res) => res.json())
          .then((data) => {
            assistantRouteCache.tra = (data.TrainTimetables || []).map((item) => {
              const stops = (item.StopTimes || []).map((stop) => ({
                name: stop.StationName && stop.StationName.Zh_tw ? stop.StationName.Zh_tw : "",
                dep: stop.DepartureTime || stop.ArrivalTime || "",
                arr: stop.ArrivalTime || stop.DepartureTime || "",
              }));
              return {
                trainNo: item.TrainInfo && item.TrainInfo.TrainNo ? item.TrainInfo.TrainNo : "",
                type: simplifyTraTypeName(item.TrainInfo && item.TrainInfo.TrainTypeName ? item.TrainInfo.TrainTypeName.Zh_tw || "" : ""),
                stops,
                stopMap: buildStopMap(stops),
              };
            });
          })
          .catch(() => {
            assistantRouteCache.tra = [];
          })
      );
    }
    if (wanted.includes("thsr") && !assistantRouteCache.thsr) {
      tasks.push(
        fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainDate/${dateStr}?$format=JSON`, { headers })
          .then((res) => res.json())
          .then((data) => {
            assistantRouteCache.thsr = (Array.isArray(data) ? data : []).map((item) => {
              const stops = (item.StopTimes || []).map((stop) => ({
                name: stop.StationName && stop.StationName.Zh_tw ? stop.StationName.Zh_tw : "",
                dep: stop.DepartureTime || stop.ArrivalTime || "",
                arr: stop.ArrivalTime || stop.DepartureTime || "",
              }));
              return {
                trainNo: item.DailyTrainInfo && item.DailyTrainInfo.TrainNo ? item.DailyTrainInfo.TrainNo : (item.TrainDate && item.TrainDate.TrainNo ? item.TrainDate.TrainNo : ""),
                type: "高鐵",
                stops,
                stopMap: buildStopMap(stops),
              };
            });
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
    const resolved = resolveStationName(name, sys);
    if (!resolved) return null;
    return (stationDB[sys] || []).find((item) => item.name === resolved) || null;
  }

  async function fetchSeatStatus(dateStr, startName, endName) {
    const startMeta = getStationMeta(startName, "thsr");
    const endMeta = getStationMeta(endName, "thsr");
    if (!startMeta || !startMeta.id || !endMeta || !endMeta.id) return {};
    const key = `${dateStr}|${startMeta.id}|${endMeta.id}`;
    if (assistantSeatCache[key]) return assistantSeatCache[key];
    if (!tdxToken) await getTdxToken();
    if (!tdxToken) return {};
    try {
      const res = await fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/AvailableSeatStatus/Train/OD/${startMeta.id}/to/${endMeta.id}/TrainDate/${dateStr}?$format=JSON`, {
        headers: { Authorization: `Bearer ${tdxToken}` },
      });
      if (!res.ok) return {};
      const data = await res.json();
      const map = {};
      (data.AvailableSeats || []).forEach((item) => {
        map[String(item.TrainNo)] = item.StandardSeatStatus;
      });
      assistantSeatCache[key] = map;
      return map;
    } catch (e) {
      return {};
    }
  }

  function seatMeta(code) {
    if (code === "O") return { text: "標準車廂可訂", cls: "ok" };
    if (code === "L") return { text: "座位有限", cls: "warn" };
    if (code === "X") return { text: "接近售完", cls: "bad" };
    return null;
  }

  async function fetchTraLive(trainNo) {
    const key = `${todayDateStr()}|${trainNo}`;
    if (assistantTrainLiveCache[key] !== undefined) return assistantTrainLiveCache[key];
    if (!tdxToken) await getTdxToken();
    if (!tdxToken) return null;
    try {
      const res = await fetch(`https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard/TrainNo/${trainNo}?%24format=JSON`, {
        headers: { Authorization: `Bearer ${tdxToken}` },
      });
      const data = await res.json();
      assistantTrainLiveCache[key] = data.TrainLiveBoards ? data.TrainLiveBoards[0] : null;
      return assistantTrainLiveCache[key];
    } catch (e) {
      assistantTrainLiveCache[key] = null;
      return null;
    }
  }

  function matchesQueryTime(depMin, options) {
    const hasTimeFilter = Number.isFinite(options && options.timeStartMin);
    if (!hasTimeFilter) return true;
    const start = options.timeStartMin;
    const end = Number.isFinite(options.timeEndMin) ? options.timeEndMin : null;
    if (end === null) return depMin >= start;
    if (end >= start) return depMin >= start && depMin <= end;
    return depMin >= start || depMin <= end;
  }

  async function addTodayLiveStatus(sys, services, dateStr) {
    if (dateStr !== todayDateStr()) return services;
    const nowMin = currentMinutes();
    if (sys !== "tr") return services;
    return Promise.all(
      (services || []).map(async (service) => {
        if (!Number.isFinite(service.depMin) || service.depMin > nowMin) {
          return {
            ...service,
            depDisplay: service.dep,
            arrDisplay: service.arr,
          };
        }
        const live = await fetchTraLive(service.trainNo);
        const delayMin = Number(live && live.DelayTime ? live.DelayTime : 0);
        if (live) {
          return {
            ...service,
            depDisplay: withDelayClock(service.dep, delayMin),
            arrDisplay: withDelayClock(service.arr, delayMin),
            delayMin: Math.max(0, delayMin),
            hasAdjustedTime: delayMin > 0,
            liveStatusText: delayMin > 0 ? `目前狀態：晚 ${delayMin} 分` : "目前狀態：準點",
          };
        }
        return {
          ...service,
          depDisplay: service.dep,
          arrDisplay: service.arr,
        };
      })
    );
  }

  function collectDirect(dataset, startName, endName, options) {
    const useNow = options.dateStr === todayDateStr() && !options.hasTimeFilter;
    const nowMin = currentMinutes();
    const all = (dataset || [])
      .map((train) => {
        const startIdx = train.stopMap ? train.stopMap[startName] : undefined;
        const endIdx = train.stopMap ? train.stopMap[endName] : undefined;
        if (!Number.isInteger(startIdx) || !Number.isInteger(endIdx) || endIdx <= startIdx) return null;
        if (options.sys === "tr" && options.typePreference && !matchesTraType(train.type, options.typePreference)) return null;
        const dep = train.stops[startIdx].dep || train.stops[startIdx].arr || "";
        const arr = train.stops[endIdx].arr || train.stops[endIdx].dep || "";
        const depMin = timeToMinutes(dep);
        if (depMin === null) return null;
        if (!matchesQueryTime(depMin, options)) return null;
        return {
          trainNo: train.trainNo,
          type: train.type,
          dep,
          arr,
          depMin,
          stopCount: Math.max(0, endIdx - startIdx - 1),
          duration: durationTextByClock(dep, arr),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.depMin - b.depMin);
    const filtered = useNow ? all.filter((item) => item.depMin >= nowMin - 1) : all;
    return {
      total: all.length,
      matches: filtered.slice(0, 3),
    };
  }

  function collectTransfer(dataset, startName, endName, options) {
    if (!Array.isArray(dataset) || !dataset.length) return [];
    const useNow = options.dateStr === todayDateStr() && !options.hasTimeFilter;
    const nowMin = currentMinutes();
    const firstByStation = new Map();
    const secondByStation = new Map();

    (dataset || []).forEach((train) => {
      if (options.typePreference && !matchesTraType(train.type, options.typePreference)) return;
      const startIdx = train.stopMap ? train.stopMap[startName] : undefined;
      if (Number.isInteger(startIdx) && startIdx < train.stops.length - 1) {
        const dep = train.stops[startIdx].dep || train.stops[startIdx].arr || "";
        const depMin = timeToMinutes(dep);
        if (depMin !== null && matchesQueryTime(depMin, options) && (!useNow || depMin >= nowMin - 1)) {
          for (let i = startIdx + 1; i < train.stops.length - 1; i += 1) {
            const arr = train.stops[i].arr || train.stops[i].dep || "";
            const arrMin = timeToMinutes(arr);
            if (arrMin === null) continue;
            const bucket = firstByStation.get(train.stops[i].name) || [];
            bucket.push({ trainNo: train.trainNo, type: train.type, dep, depMin, arr, arrMin, transfer: train.stops[i].name });
            firstByStation.set(train.stops[i].name, bucket);
          }
        }
      }

      const endIdx = train.stopMap ? train.stopMap[endName] : undefined;
      if (Number.isInteger(endIdx) && endIdx > 0) {
        for (let i = 1; i < endIdx; i += 1) {
          const dep = train.stops[i].dep || train.stops[i].arr || "";
          const depMin = timeToMinutes(dep);
          const arr = train.stops[endIdx].arr || train.stops[endIdx].dep || "";
          const arrMin = timeToMinutes(arr);
          if (depMin === null || arrMin === null || (useNow && depMin < nowMin - 1)) continue;
          const bucket = secondByStation.get(train.stops[i].name) || [];
          bucket.push({ trainNo: train.trainNo, type: train.type, dep, depMin, arr, arrMin, transfer: train.stops[i].name });
          secondByStation.set(train.stops[i].name, bucket);
        }
      }
    });

    const results = [];
    const seen = new Set();
    Array.from(firstByStation.keys()).forEach((transfer) => {
      const firstList = (firstByStation.get(transfer) || []).sort((a, b) => a.depMin - b.depMin).slice(0, 10);
      const secondList = (secondByStation.get(transfer) || []).sort((a, b) => a.depMin - b.depMin);
      firstList.forEach((first) => {
        const second = secondList.find((item) => item.trainNo !== first.trainNo && item.depMin >= first.arrMin + 5 && item.depMin <= first.arrMin + 50);
        if (!second) return;
        const key = `${first.trainNo}|${transfer}|${second.trainNo}|${second.dep}`;
        if (seen.has(key)) return;
        seen.add(key);
        let totalMin = second.arrMin - first.depMin;
        if (totalMin < 0) totalMin += 1440;
        results.push({
          transfer,
          first,
          second,
          waitMin: second.depMin - first.arrMin,
          duration: durationTextByClock(first.dep, second.arr),
          totalMin,
        });
      });
    });

    return results.sort((a, b) => a.totalMin - b.totalMin || a.first.depMin - b.first.depMin).slice(0, 3);
  }

  function collectStation(dataset, stationName, options) {
    const useNow = options.dateStr === todayDateStr() && !options.hasTimeFilter;
    const nowMin = currentMinutes();
    const all = (dataset || [])
      .map((train) => {
        const idx = train.stopMap ? train.stopMap[stationName] : undefined;
        if (!Number.isInteger(idx)) return null;
        const time = train.stops[idx].dep || train.stops[idx].arr || "";
        const timeMin = timeToMinutes(time);
        if (timeMin === null) return null;
        if (!matchesQueryTime(timeMin, options)) return null;
        return {
          trainNo: train.trainNo,
          type: train.type,
          time,
          timeMin,
          range: `${train.stops[0] && train.stops[0].name ? train.stops[0].name : "--"} → ${train.stops[train.stops.length - 1] && train.stops[train.stops.length - 1].name ? train.stops[train.stops.length - 1].name : "--"}`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.timeMin - b.timeMin);
    const filtered = useNow ? all.filter((item) => item.timeMin >= nowMin - 1) : all;
    return {
      total: all.length,
      matches: filtered.slice(0, 6),
    };
  }

  function isCrossDay(stops) {
    if (!Array.isArray(stops) || stops.length < 2) return false;
    const first = timeToMinutes(stops[0].dep || stops[0].arr);
    const last = timeToMinutes(stops[stops.length - 1].arr || stops[stops.length - 1].dep);
    return first !== null && last !== null && last < first;
  }

  function findNextStopIndex(stops, delayMin) {
    const nowMin = currentMinutes();
    for (let i = 0; i < (stops || []).length; i += 1) {
      const value = timeToMinutes(stops[i].arr || stops[i].dep);
      if (value === null) continue;
      let adjusted = value + Math.max(0, Number(delayMin || 0));
      if (adjusted < nowMin - 720) adjusted += 1440;
      if (adjusted >= nowMin) return i;
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
    const firstStation = stops[0] && stops[0].name ? stops[0].name : "--";
    const lastStation = stops[stops.length - 1] && stops[stops.length - 1].name ? stops[stops.length - 1].name : "--";
    const firstDep = stops[0] ? stops[0].dep || stops[0].arr || "--" : "--";
    const lastArr = stops[stops.length - 1] ? stops[stops.length - 1].arr || stops[stops.length - 1].dep || "--" : "--";
    const today = intent.dateStr === todayDateStr();
    let delayMin = 0;
    let statusText = today ? "行駛中" : "非今日查詢";
    let currentLocation = today ? "同步中" : "依時刻表顯示";
    let nextIndex = today ? findNextStopIndex(stops, 0) : -1;
    if (today) {
      const live = await fetchTraLive(train.trainNo);
      delayMin = Number(live && live.DelayTime ? live.DelayTime : 0);
      if (!Number.isFinite(delayMin)) delayMin = 0;
      const liveStation = live && live.StationName ? live.StationName.Zh_tw || "" : "";
      const startMin = timeToMinutes(firstDep);
      const endMin = timeToMinutes(lastArr);
      const nowMin = currentMinutes();
      nextIndex = findNextStopIndex(stops, delayMin);
      if (startMin !== null && nowMin < startMin) {
        statusText = "尚未發車";
        currentLocation = `預計 ${withDelayClock(firstDep, delayMin)} 自 ${firstStation} 發車`;
        nextIndex = 0;
      } else if (endMin !== null && nowMin > endMin + delayMin + 5) {
        statusText = "已到終點";
        currentLocation = "已到終點";
        nextIndex = -1;
      } else if (liveStation) {
        statusText = delayMin > 0 ? `晚 ${delayMin} 分` : "準點";
        currentLocation = `目前在 ${liveStation}`;
        const liveIndex = train.stopMap ? train.stopMap[liveStation] : undefined;
        if (Number.isInteger(liveIndex) && liveIndex < stops.length - 1) nextIndex = Math.max(nextIndex, liveIndex + 1);
      } else {
        statusText = delayMin > 0 ? `晚 ${delayMin} 分` : "已發車";
        currentLocation = nextIndex >= 0 ? `前往 ${stops[nextIndex] && stops[nextIndex].name ? stops[nextIndex].name : lastStation}` : "已到終點";
      }
    }
    const targetIndex = targetStation && train.stopMap ? train.stopMap[targetStation] : -1;
    const targetStop = Number.isInteger(targetIndex) ? stops[targetIndex] : null;
    const targetClock = targetStop ? targetStop.arr || targetStop.dep || "--" : "";
    return {
      sys: "tr",
      label: "臺鐵",
      routeText: `${firstStation} → ${lastStation}`,
      typeText: train.type,
      travelText: durationTextByClock(firstDep, lastArr),
      crossDayText: isCrossDay(stops) ? "跨日車" : "當日車",
      statusText,
      currentLocation,
      targetStation,
      etaClock: targetClock ? withDelayClock(targetClock, delayMin) : "",
      remainText: targetClock ? countdownText(minutesUntil(targetClock, intent.dateStr, delayMin)) : "",
      stopPreview: buildStopPreview(stops, nextIndex, targetIndex, intent.showStops),
      queryAction: `openAppOverlay("tr", { start: ${JSON.stringify(firstStation)}, end: ${JSON.stringify(lastStation)} })`,
      bookingAction: `assistantOpenTraBooking(${JSON.stringify(train.trainNo)}, ${JSON.stringify(firstStation)}, ${JSON.stringify(targetStation || lastStation)}, ${JSON.stringify(intent.dateStr)})`,
    };
  }

  async function buildThsrTrain(train, intent, targetStation) {
    const stops = train.stops || [];
    const firstStation = stops[0] && stops[0].name ? stops[0].name : "--";
    const lastStation = stops[stops.length - 1] && stops[stops.length - 1].name ? stops[stops.length - 1].name : "--";
    const firstDep = stops[0] ? stops[0].dep || stops[0].arr || "--" : "--";
    const lastArr = stops[stops.length - 1] ? stops[stops.length - 1].arr || stops[stops.length - 1].dep || "--" : "--";
    const today = intent.dateStr === todayDateStr();
    let statusText = today ? "行駛中" : "非今日查詢";
    let currentLocation = today ? "行駛中" : "依時刻表顯示";
    let nextIndex = today ? findNextStopIndex(stops, 0) : -1;
    if (today) {
      const startMin = timeToMinutes(firstDep);
      const endMin = timeToMinutes(lastArr);
      const nowMin = currentMinutes();
      if (startMin !== null && nowMin < startMin) {
        statusText = "尚未發車";
        currentLocation = `預計 ${firstDep} 自 ${firstStation} 發車`;
        nextIndex = 0;
      } else if (endMin !== null && nowMin > endMin + 5) {
        statusText = "已到終點";
        currentLocation = "已到終點";
        nextIndex = -1;
      } else {
        statusText = "已發車";
        const lastPassed = stops.reduce((idx, stop, stopIdx) => {
          const value = timeToMinutes(stop.dep || stop.arr);
          return value !== null && value <= nowMin ? stopIdx : idx;
        }, -1);
        if (lastPassed >= 0 && nextIndex >= 0 && nextIndex !== lastPassed) currentLocation = `已通過 ${stops[lastPassed].name}，前往 ${stops[nextIndex].name}`;
        else if (lastPassed >= 0) currentLocation = `目前在 ${stops[lastPassed].name}`;
        else currentLocation = `前往 ${firstStation}`;
      }
    }
    const targetIndex = targetStation && train.stopMap ? train.stopMap[targetStation] : -1;
    const targetStop = Number.isInteger(targetIndex) ? stops[targetIndex] : null;
    const targetClock = targetStop ? targetStop.arr || targetStop.dep || "--" : "";
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
      remainText: targetClock ? countdownText(minutesUntil(targetClock, intent.dateStr, 0)) : "",
      stopPreview: buildStopPreview(stops, nextIndex, targetIndex, intent.showStops),
      queryAction: `openAppOverlay("thsr", { start: ${JSON.stringify(firstStation)}, end: ${JSON.stringify(lastStation)} })`,
      bookingAction: `assistantOpenTHSRBooking(${JSON.stringify(train.trainNo)}, ${JSON.stringify(firstStation)}, ${JSON.stringify(targetStation || lastStation)}, ${JSON.stringify(intent.dateStr)}, ${JSON.stringify(firstDep)})`,
    };
  }

  function metaRow(items) {
    const html = (items || [])
      .filter(Boolean)
      .map((item) => `<span class="assistant-meta-pill">${escapeHtml(item)}</span>`)
      .join("");
    return html ? `<div class="assistant-meta-row">${html}</div>` : "";
  }

  function renderLoading() {
    const answer = document.getElementById("assistantAnswer");
    if (!answer) return;
    answer.innerHTML = `
      <div class="assistant-placeholder">
        <strong>正在整理資料</strong>
        <div>我正在同步臺鐵 / 高鐵資料、票況與列車狀態，幫你整理最適合的結果。</div>
      </div>
    `;
  }

  function renderError(message) {
    const answer = document.getElementById("assistantAnswer");
    if (!answer) return;
    answer.innerHTML = `<div class="assistant-error">${escapeHtml(message)}</div>`;
  }

  async function assistantOpenTraBooking(trainNo, startStationName, endStationName, dateStr) {
    try {
      if (!tdxToken) await getTdxToken();
      if (!tdxToken) {
        alert("認證授權失敗，請稍後再試。");
        return;
      }
      const start = String(startStationName || "").replace(/台/g, "臺");
      const end = String(endStationName || "").replace(/台/g, "臺");
      const response = await fetch(`https://tdx.transportdata.tw/api/maas-tra/booking/deeplink/direct/tra?start_station=${encodeURIComponent(start)}&end_station=${encodeURIComponent(end)}&train_date=${encodeURIComponent(dateStr)}&train_number=${encodeURIComponent(String(trainNo))}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tdxToken}`,
          Accept: "application/json",
        },
      });
      const result = await response.json();
      const jumpUrl = (result.data && result.data.deeplink) || result.DeepLinkUrl || result.url;
      if (!jumpUrl) {
        alert("取得訂票連結失敗。");
        return;
      }
      try {
        if (window.top && window.top !== window) window.top.location.href = jumpUrl;
        else window.location.href = jumpUrl;
      } catch (e) {
        window.location.href = jumpUrl;
      }
    } catch (e) {
      alert("訂票流程暫時無法使用。");
    }
  }

  async function assistantOpenTHSRBooking(trainNo, startStationName, endStationName, dateStr, timeStr) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
      alert("限使用行動裝置並已下載高鐵 T Express 行動購票 App 使用。");
      return;
    }
    try {
      if (!tdxToken) await getTdxToken();
      if (!tdxToken) {
        alert("認證授權失敗，請稍後再試。");
        return;
      }
      const start = String(startStationName || "").replace(/台/g, "臺");
      const end = String(endStationName || "").replace(/台/g, "臺");
      const response = await fetch(`https://tdx.transportdata.tw/api/maas-thsr/booking/deeplink/direct/hsr?start_station=${encodeURIComponent(start)}&end_station=${encodeURIComponent(end)}&train_date=${dateStr}&train_time=${encodeURIComponent(timeStr)}&train_number=${trainNo}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tdxToken}`,
          Accept: "application/json",
        },
      });
      const result = await response.json();
      const jumpUrl = (result.data && result.data.deeplink) || result.DeepLinkUrl || result.url;
      if (!jumpUrl) {
        alert("取得訂票連結失敗。");
        return;
      }
      try {
        if (window.top && window.top !== window) window.top.location.href = jumpUrl;
        else window.location.href = jumpUrl;
      } catch (e) {
        window.location.href = jumpUrl;
      }
    } catch (e) {
      alert("高鐵訂票流程暫時無法使用。");
    }
  }

  function renderRoute(intent, results) {
    const answer = document.getElementById("assistantAnswer");
    if (!answer) return;
    answer.innerHTML = `
      <div class="assistant-route-title">
        <span class="assistant-helper-badge">旅程建議</span>
        <strong>${escapeHtml(intent.displayStart)} → ${escapeHtml(intent.displayEnd)}</strong>
      </div>
      ${metaRow([
        formatDateLabel(intent.dateStr),
        intent.timeLabel ? `時段 ${intent.timeLabel}` : "",
        intent.preference ? (intent.preference === "tr" ? "臺鐵" : "高鐵") : "自動比較臺鐵 / 高鐵",
        intent.typePreference || "",
        intent.directOnly ? "只看直達" : (intent.allowTransfer ? "可轉乘" : "直達優先"),
      ])}
      <div class="assistant-note">先整理最接近的直達班次；如果你允許轉乘，或直達不足時，會再補上 1 次轉乘建議。</div>
      <div class="assistant-system-list" style="margin-top:14px;">
        ${results.map((result) => `
          <div class="assistant-system-card">
            <div class="assistant-system-head">
              <span class="assistant-system-tag ${result.sys === "tr" ? "tr" : "thsr"}">${escapeHtml(result.label)}</span>
              <span class="assistant-system-note">${result.direct.matches.length ? "優先整理直達" : "改看轉乘或完整查詢"}</span>
            </div>
            <div class="assistant-section-block">
              <div class="assistant-section-title">直達建議</div>
              ${result.direct.matches.length ? `<div class="assistant-service-grid">
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
              </div>` : `<div class="assistant-empty-note">${result.direct.total > 0 ? "這一天符合條件的直達班次已經沒有更晚的選項。" : "這條路線沒有找到符合條件的直達班次。"}</div>`}
            </div>
            ${!intent.directOnly && result.transfers.length ? `<div class="assistant-section-block">
              <div class="assistant-section-title">轉乘建議</div>
              <div class="assistant-service-grid">
                ${result.transfers.map((item) => `
                  <div class="assistant-service-row">
                    <div class="assistant-service-main">
                      <strong>${escapeHtml(item.first.trainNo)} 次 <span class="assistant-inline-tag">${escapeHtml(item.first.type)}</span> → ${escapeHtml(item.second.trainNo)} 次 <span class="assistant-inline-tag">${escapeHtml(item.second.type)}</span></strong>
                      <small>${escapeHtml(item.first.dep)} ${escapeHtml(result.start)} 出發 ｜ ${escapeHtml(item.first.arr)} 在 ${escapeHtml(item.transfer)} 轉乘 ｜ 等待 ${item.waitMin} 分 ｜ ${escapeHtml(item.second.arr)} 抵達 ${escapeHtml(result.end)} ｜ 總耗時 ${escapeHtml(item.duration)}</small>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>` : ""}
            <div class="assistant-actions">
              <button class="assistant-action-btn" type="button" onclick='openAppOverlay(${JSON.stringify(result.sys)}, { start: ${JSON.stringify(result.start)}, end: ${JSON.stringify(result.end)} })'>打開${escapeHtml(result.label)}完整查詢</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderTrain(intent, results) {
    const answer = document.getElementById("assistantAnswer");
    if (!answer) return;
    answer.innerHTML = `
      <div class="assistant-route-title">
        <span class="assistant-helper-badge">車次助手</span>
        <strong>${escapeHtml(intent.trainNoRaw)} 次</strong>
      </div>
      ${metaRow([
        formatDateLabel(intent.dateStr),
        intent.timeLabel ? `時間 ${intent.timeLabel}` : "",
        intent.targetRaw ? `目標站 ${intent.targetRaw}` : "",
        intent.showStops ? "顯示停靠站" : "精簡摘要",
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
              <div class="assistant-stat-card"><span>車種 / 區間</span><strong>${escapeHtml(result.typeText)} ｜ ${escapeHtml(result.crossDayText)}</strong></div>
              <div class="assistant-stat-card"><span>${result.targetStation ? "預估抵達" : "預估車程"}</span><strong>${result.targetStation ? escapeHtml(etaText(result.etaClock || "--", result.remainText || "")) : escapeHtml(result.travelText)}</strong></div>
            </div>
            ${result.stopPreview.length ? `<div class="assistant-section-title">停靠摘要</div><div class="assistant-stop-strip">${result.stopPreview.map((item) => `<span class="assistant-stop-chip">${escapeHtml(item)}</span>`).join("")}</div>` : ""}
            <div class="assistant-actions">
              <button class="assistant-action-btn" type="button" onclick='${result.queryAction}'>打開${escapeHtml(result.label)}完整查詢</button>
              <button class="assistant-action-btn" type="button" onclick='${result.bookingAction}'>導訂這班車</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderStation(intent, results) {
    const answer = document.getElementById("assistantAnswer");
    if (!answer) return;
    answer.innerHTML = `
      <div class="assistant-route-title">
        <span class="assistant-helper-badge">車站班次</span>
        <strong>${escapeHtml(intent.stationRaw)}</strong>
      </div>
      ${metaRow([
        formatDateLabel(intent.dateStr),
        intent.timeLabel ? `時段 ${intent.timeLabel}` : "",
        intent.preference ? (intent.preference === "tr" ? "臺鐵" : "高鐵") : "同時比對臺鐵 / 高鐵",
      ])}
      <div class="assistant-system-list" style="margin-top:14px;">
        ${results.map((result) => `
          <div class="assistant-system-card">
            <div class="assistant-system-head">
              <span class="assistant-system-tag ${result.sys === "tr" ? "tr" : "thsr"}">${escapeHtml(result.label)}</span>
              <span class="assistant-system-note">${result.services.matches.length ? "接下來可搭" : "尚無可整理班次"}</span>
            </div>
            <div class="assistant-service-grid">
              ${result.services.matches.length ? result.services.matches.map((item) => `
                <div class="assistant-service-row">
                  <div class="assistant-service-main">
                    <strong>${escapeHtml(item.trainNo)} 次${result.sys === "tr" ? ` <span class="assistant-inline-tag">${escapeHtml(item.type)}</span>` : ""}</strong>
                    <small>${escapeHtml(item.time)} ｜ ${escapeHtml(item.range)}</small>
                  </div>
                </div>
              `).join("") : `<div class="assistant-empty-note">這一天目前沒有可直接整理的班次資料。</div>`}
            </div>
            <div class="assistant-actions">
              <button class="assistant-action-btn" type="button" onclick='openAppOverlay(${JSON.stringify(result.sys)}, { station: ${JSON.stringify(result.station)} })'>打開${escapeHtml(result.label)}車站查詢</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  window.assistantOpenTraBooking = assistantOpenTraBooking;
  window.assistantOpenTHSRBooking = assistantOpenTHSRBooking;
  window.ensureAssistantRouteData = ensureAssistantRouteData = ensureData;
  window.handleAssistantQuery = handleAssistantQuery = async function (rawText) {
    const text = String(rawText || "").trim();
    if (!text) {
      renderError("請先輸入問題，例如「今天 08:00 台北到台中」「4/5 08:10-12:00 高鐵台北到左營」「412次台中幾點到」或「板橋站有什麼車」。");
      return;
    }
    if (!tdxToken) await getTdxToken();
    if ((!stationDB.tr || !stationDB.tr.length) || (!stationDB.thsr || !stationDB.thsr.length)) {
      await fetchAllStations();
    }
    const intent = parseIntent(text);
    if (!intent) {
      renderError("我目前支援三種問法：起訖站旅程、車次狀態、車站班次，也支援加上時間條件。例如「今天 08:00 台北到台中」「126次現在到哪了」「台中站 08:10-12:00 有什麼車」。");
      return;
    }
    renderLoading();

    if (intent.kind === "route") {
      const candidates = [];
      const traLocked = !!intent.typePreference && intent.preference !== "thsr";
      if (intent.preference !== "thsr") {
        const start = resolveStationName(intent.startRaw, "tr");
        const end = resolveStationName(intent.endRaw, "tr");
        if (start && end) candidates.push({ sys: "tr", label: "臺鐵", start, end });
      }
      if (intent.preference !== "tr" && !traLocked) {
        const start = resolveStationName(intent.startRaw, "thsr");
        const end = resolveStationName(intent.endRaw, "thsr");
        if (start && end) candidates.push({ sys: "thsr", label: "高鐵", start, end });
      }
      if (!candidates.length) {
        renderError(`我暫時找不到「${intent.startRaw} → ${intent.endRaw}」對應的站名，請再試一次完整站名。`);
        return;
      }
      await ensureData(intent.dateStr, candidates.map((item) => item.sys));
      const results = [];
      for (let i = 0; i < candidates.length; i += 1) {
        const item = candidates[i];
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
          const seatMap = await fetchSeatStatus(intent.dateStr, item.start, item.end);
          direct.matches = direct.matches.map((service) => ({
            ...service,
            seat: seatMeta(seatMap[String(service.trainNo)]),
          }));
        }
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
      await ensureData(intent.dateStr, systems);
      const results = [];
      for (let i = 0; i < systems.length; i += 1) {
        const sys = systems[i];
        const dataset = sys === "tr" ? assistantRouteCache.tra : assistantRouteCache.thsr;
        const train = (dataset || []).find((item) => trainVariants(intent.trainNoRaw, sys).includes(String(item.trainNo).toUpperCase()));
        if (!train) continue;
        const targetStation = intent.targetRaw ? resolveStationName(intent.targetRaw, sys) : "";
        const summary = sys === "tr"
          ? await buildTraTrain(train, intent, targetStation)
          : await buildThsrTrain(train, intent, targetStation);
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
      await ensureData(intent.dateStr, systems);
      const results = [];
      for (let i = 0; i < systems.length; i += 1) {
        const sys = systems[i];
        const station = resolveStationName(intent.stationRaw, sys);
        if (!station) continue;
        const dataset = sys === "tr" ? assistantRouteCache.tra : assistantRouteCache.thsr;
        results.push({
          sys,
          label: sys === "tr" ? "臺鐵" : "高鐵",
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
