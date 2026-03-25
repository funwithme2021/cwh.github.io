(function () {
  const STYLE_ID = "rail-operation-diagram-styles";
  const TAB_ID = "tab-operation-diagram";
  const PANEL_ID = "panel-operation-diagram";
  const MASTER_TAB_ID = "tab-master-table";
  const MASTER_PANEL_ID = "panel-master-table";

  const TRA_TYPE_COLORS = {
    新自強: "#7c3aed",
    普悠瑪: "#db2777",
    太魯閣: "#2563eb",
    自強號: "#e11d48",
    自強: "#e11d48",
    "自強號(新)": "#b45309",
    莒光號: "#ea580c",
    復興號: "#0284c7",
    區間快: "#16a34a",
    區間車: "#475569",
    普快車: "#0f766e",
    柴快車: "#7c2d12",
    柴油客車: "#92400e",
    普通車: "#1d4ed8",
    觀光列車: "#be185d",
    團體列車: "#7c3aed",
    專列: "#7c3aed",
    加班車: "#0ea5e9",
  };

  const SCALE_OPTIONS = {
    compact: { label: "緊湊", pxPerHour: 132, rowHeight: 34, axisHeight: 40 },
    standard: { label: "標準", pxPerHour: 168, rowHeight: 38, axisHeight: 44 },
    wide: { label: "寬版", pxPerHour: 212, rowHeight: 42, axisHeight: 48 },
    xwide: { label: "特寬", pxPerHour: 268, rowHeight: 48, axisHeight: 52 },
    ultra: { label: "超寬", pxPerHour: 332, rowHeight: 54, axisHeight: 58 },
  };

  const LABEL_OPTIONS = [
    { value: "smart", label: "精簡" },
    { value: "all", label: "全部" },
    { value: "none", label: "關閉" },
  ];

  const THSR_DIRECTION_COLORS = {
    north: "#2563eb",
    south: "#ea580c",
  };

  const TRA_SEGMENT_GROUPS = [
    {
      id: "main-west",
      title: "主線｜西部幹線",
      description: "北段、山線、海線、南段、屏東線",
      segments: [
        {
          id: "west-north",
          title: "西部幹線北段",
          subtitle: "基隆 - 竹南",
          stations: ["基隆", "三坑", "八堵", "七堵", "百福", "五堵", "汐止", "汐科", "南港", "松山", "臺北", "萬華", "板橋", "浮洲", "樹林", "南樹林", "山佳", "鶯歌", "鳳鳴", "桃園", "內壢", "中壢", "埔心", "楊梅", "富岡", "新富", "北湖", "湖口", "新豐", "竹北", "北新竹", "新竹", "三姓橋", "香山", "崎頂", "竹南"],
          excludeAny: ["八斗子", "海科館", "大華", "十分", "望古", "嶺腳", "平溪", "菁桐", "六家", "竹中", "上員", "榮華", "竹東", "橫山", "九讚頭", "合興", "富貴", "內灣"],
        },
        {
          id: "west-mountain",
          title: "西部幹線山線",
          subtitle: "竹南 - 彰化",
          stations: ["竹南", "造橋", "豐富", "苗栗", "南勢", "銅鑼", "三義", "泰安", "后里", "豐原", "栗林", "潭子", "頭家厝", "松竹", "太原", "精武", "臺中", "五權", "大慶", "烏日", "新烏日", "成功", "彰化"],
          includeAny: ["造橋", "豐富", "苗栗", "南勢", "銅鑼", "三義", "泰安", "后里", "豐原", "栗林", "潭子", "頭家厝", "松竹", "太原", "精武", "臺中", "五權", "大慶", "烏日", "新烏日", "成功"],
        },
        {
          id: "west-sea",
          title: "西部幹線海線",
          subtitle: "竹南 - 彰化",
          stations: ["竹南", "談文", "大山", "後龍", "龍港", "白沙屯", "新埔", "通霄", "苑裡", "日南", "大甲", "臺中港", "清水", "沙鹿", "龍井", "大肚", "追分", "彰化"],
          includeAny: ["談文", "大山", "後龍", "龍港", "白沙屯", "新埔", "通霄", "苑裡", "日南", "大甲", "臺中港", "清水", "沙鹿", "龍井", "大肚", "追分"],
        },
        {
          id: "west-south",
          title: "西部幹線南段",
          subtitle: "彰化 - 高雄",
          stations: ["彰化", "花壇", "大村", "員林", "永靖", "社頭", "田中", "二水", "林內", "石榴", "斗六", "斗南", "石龜", "大林", "民雄", "嘉北", "嘉義", "水上", "南靖", "後壁", "新營", "柳營", "林鳳營", "隆田", "拔林", "善化", "南科", "新市", "永康", "大橋", "臺南", "保安", "仁德", "中洲", "大湖", "路竹", "岡山", "橋頭", "楠梓", "新左營", "左營", "內惟", "美術館", "鼓山", "三塊厝", "高雄"],
          includeAny: ["花壇", "大村", "員林", "永靖", "社頭", "田中", "二水", "林內", "石榴", "斗六", "斗南", "石龜", "大林", "民雄", "嘉北", "嘉義", "水上", "南靖", "後壁", "新營", "柳營", "林鳳營", "隆田", "拔林", "善化", "南科", "新市", "永康", "大橋", "臺南", "保安", "仁德", "中洲", "大湖", "路竹", "岡山", "橋頭", "楠梓", "新左營", "左營", "內惟", "美術館", "鼓山", "三塊厝"],
          excludeAny: ["沙崙", "長榮大學"],
        },
        {
          id: "pingtung",
          title: "屏東線",
          subtitle: "高雄 - 枋寮",
          stations: ["高雄", "民族", "科工館", "正義", "鳳山", "後庄", "九曲堂", "六塊厝", "屏東", "歸來", "麟洛", "西勢", "竹田", "潮州", "崁頂", "南州", "鎮安", "林邊", "佳冬", "東海", "枋寮"],
          includeAny: ["民族", "科工館", "正義", "鳳山", "後庄", "九曲堂", "六塊厝", "屏東", "歸來", "麟洛", "西勢", "竹田", "潮州", "崁頂", "南州", "鎮安", "林邊", "佳冬", "東海"],
        },
      ],
    },
    {
      id: "main-east",
      title: "主線｜東部幹線與南迴線",
      description: "宜蘭線、北迴線、台東線、南迴線",
      segments: [
        {
          id: "yilan",
          title: "宜蘭線",
          subtitle: "八堵 - 蘇澳",
          stations: ["八堵", "暖暖", "四腳亭", "瑞芳", "猴硐", "三貂嶺", "牡丹", "雙溪", "貢寮", "福隆", "石城", "大里", "大溪", "龜山", "外澳", "頭城", "頂埔", "礁溪", "四城", "宜蘭", "二結", "中里", "羅東", "冬山", "新馬", "蘇澳新", "蘇澳"],
          excludeAny: ["八斗子", "海科館", "大華", "十分", "望古", "嶺腳", "平溪", "菁桐"],
        },
        {
          id: "beihui",
          title: "北迴線",
          subtitle: "蘇澳新 - 花蓮",
          stations: ["蘇澳新", "永樂", "東澳", "南澳", "武塔", "漢本", "和平", "和仁", "崇德", "新城", "景美", "北埔", "花蓮"],
          includeAny: ["永樂", "東澳", "南澳", "武塔", "漢本", "和平", "和仁", "崇德", "新城", "景美", "北埔"],
        },
        {
          id: "taitung",
          title: "台東線",
          subtitle: "花蓮 - 臺東",
          stations: ["花蓮", "吉安", "志學", "平和", "壽豐", "豐田", "林榮新光", "南平", "鳳林", "萬榮", "光復", "大富", "富源", "瑞穗", "三民", "玉里", "東里", "東竹", "富里", "池上", "海端", "關山", "瑞和", "瑞源", "鹿野", "山里", "臺東"],
          includeAny: ["吉安", "志學", "平和", "壽豐", "豐田", "林榮新光", "南平", "鳳林", "萬榮", "光復", "大富", "富源", "瑞穗", "三民", "玉里", "東里", "東竹", "富里", "池上", "海端", "關山", "瑞和", "瑞源", "鹿野", "山里"],
        },
        {
          id: "south-link",
          title: "南迴線",
          subtitle: "臺東 - 枋寮",
          stations: ["臺東", "康樂", "知本", "太麻里", "金崙", "瀧溪", "大武", "古莊", "枋山", "內獅", "加祿", "枋寮"],
          includeAny: ["康樂", "知本", "太麻里", "金崙", "瀧溪", "大武", "古莊", "枋山", "內獅", "加祿"],
        },
      ],
    },
    {
      id: "branch",
      title: "支線",
      description: "平溪深澳線、內灣線、六家線、集集線、沙崙線",
      segments: [
        {
          id: "pingxi-shenao",
          title: "平溪深澳線",
          subtitle: "八斗子 - 菁桐",
          stations: ["八斗子", "海科館", "瑞芳", "猴硐", "三貂嶺", "大華", "十分", "望古", "嶺腳", "平溪", "菁桐"],
          includeAny: ["八斗子", "海科館", "大華", "十分", "望古", "嶺腳", "平溪", "菁桐"],
        },
        {
          id: "neiwan",
          title: "內灣線",
          subtitle: "新竹 - 內灣",
          stations: ["新竹", "北新竹", "千甲", "新莊", "竹中", "上員", "榮華", "竹東", "橫山", "九讚頭", "合興", "富貴", "內灣"],
          includeAny: ["上員", "榮華", "竹東", "橫山", "九讚頭", "合興", "富貴", "內灣"],
        },
        {
          id: "liujia",
          title: "六家線",
          subtitle: "新竹 - 六家",
          stations: ["新竹", "北新竹", "千甲", "新莊", "竹中", "六家"],
          includeAny: ["六家"],
        },
        {
          id: "jiji",
          title: "集集線",
          subtitle: "二水 - 車埕",
          stations: ["二水", "源泉", "濁水", "龍泉", "集集", "水里", "車埕"],
          includeAny: ["源泉", "濁水", "龍泉", "集集", "水里", "車埕"],
        },
        {
          id: "shalun",
          title: "沙崙線",
          subtitle: "中洲 - 沙崙",
          stations: ["中洲", "長榮大學", "沙崙"],
          includeAny: ["長榮大學", "沙崙"],
        },
      ],
    },
  ];

  function maybePromise(value) {
    return value && typeof value.then === "function" ? value : Promise.resolve(value);
  }

  async function ensureOperationDiagramAccess() {
    if (!window.RailFeatureGate?.ensureAccess) return true;
    try {
      return await window.RailFeatureGate.ensureAccess("operation-diagram");
    } catch (_) {
      return false;
    }
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function readPageValue(expression) {
    try {
      return window.eval(expression);
    } catch (_) {
      return undefined;
    }
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

  function diffDateDays(fromDate, toDate) {
    if (!fromDate || !toDate) return 0;
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T00:00:00`);
    return Math.round((to - from) / 86400000);
  }

  function normalizeTraStation(name) {
    return String(name || "").trim().replace(/台/g, "臺");
  }

  function normalizeThsrStation(name) {
    return String(name || "").trim().replace(/臺/g, "台");
  }

  function parseMinutes(time) {
    const match = String(time || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function displayStopTime(stop) {
    if (!Array.isArray(stop)) return "";
    return String(stop[1] || stop[2] || "").trim();
  }

  function unique(list) {
    return Array.from(new Set((list || []).filter(Boolean)));
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
    if (value === "#475569" || value === "#64748b" || value === "#334155" || value === "#000" || value === "#000000") return true;
    const channels = parseColorChannels(value);
    if (!channels) return false;
    const max = Math.max(...channels);
    const min = Math.min(...channels);
    return max - min <= 18;
  }

  function getReadableRailColor(color) {
    return document.body.classList.contains("dark-mode") && needsDarkModeNeutralSwap(color) ? "#f8fafc" : color;
  }

  function getTraTypeColor(type) {
    const normalized = window.RailNetwork?.normalizeTraDisplayType ? window.RailNetwork.normalizeTraDisplayType(type) : String(type || "").trim();
    let pageColor = "";
    if (typeof window.getTrainTypeColor === "function") {
      try {
        pageColor = window.getTrainTypeColor(normalized) || "";
      } catch (_) {
      }
    }
    const text = normalized;
    if (!text) return getReadableRailColor("#64748b");
    if (TRA_TYPE_COLORS[text]) return getReadableRailColor(TRA_TYPE_COLORS[text]);
    if (/自強.*3000|3000/.test(text)) return TRA_TYPE_COLORS["新自強"];
    if (/普悠瑪/.test(text)) return TRA_TYPE_COLORS["普悠瑪"];
    if (/太魯閣/.test(text)) return TRA_TYPE_COLORS["太魯閣"];
    if (/莒光/.test(text)) return TRA_TYPE_COLORS["莒光號"];
    if (/復興/.test(text)) return TRA_TYPE_COLORS["復興號"];
    if (/區間快/.test(text)) return TRA_TYPE_COLORS["區間快"];
    if (/區間/.test(text)) return TRA_TYPE_COLORS["區間車"];
    if (/普快/.test(text)) return TRA_TYPE_COLORS["普快車"];
    if (/柴快/.test(text)) return TRA_TYPE_COLORS["柴快車"];
    if (/柴油客車|柴客/.test(text)) return TRA_TYPE_COLORS["柴油客車"];
    if (/普通車|普車/.test(text)) return TRA_TYPE_COLORS["普通車"];
    if (/觀光/.test(text)) return TRA_TYPE_COLORS["觀光列車"];
    if (/團體/.test(text)) return TRA_TYPE_COLORS["團體列車"];
    if (/專列|郵輪式/.test(text)) return TRA_TYPE_COLORS["專列"];
    if (/加班/.test(text)) return TRA_TYPE_COLORS["加班車"];
    if (/自強/.test(text)) return TRA_TYPE_COLORS["自強號"];
    return getReadableRailColor(pageColor || "#64748b");
  }

  function getTrainNoParity(trainNo) {
    const digits = String(trainNo || "").match(/\d+/g);
    if (!digits || !digits.length) return "";
    const number = Number(digits.join(""));
    if (!Number.isFinite(number)) return "";
    return number % 2 === 0 ? "even" : "odd";
  }

  function getDirectionOptions(system) {
    if (system === "tr") {
      return [
        { value: "all", label: "全部" },
        { value: "even", label: "順行(偶數車次)" },
        { value: "odd", label: "逆行(奇數車次)" },
      ];
    }
    return [
      { value: "all", label: "全部" },
      { value: "north", label: "北上(偶數車次)" },
      { value: "south", label: "南下(奇數車次)" },
    ];
  }

  function getDirectionKey(system, trainNo) {
    const parity = getTrainNoParity(trainNo);
    if (system === "thsr") return parity === "even" ? "north" : "south";
    return parity;
  }

  function matchesDirectionFilter(system, trainNo, filterValue) {
    if (!filterValue || filterValue === "all") return true;
    return getDirectionKey(system, trainNo) === filterValue;
  }

  function getEntryColor(system, entry) {
    if (system === "tr") return getReadableRailColor(getTraTypeColor(entry.type));
    return THSR_DIRECTION_COLORS[getDirectionKey(system, entry.trainNo)] || "#64748b";
  }

  function getStationOrder(system) {
    if (system === "tr") {
      const list = readPageValue("stationListSorted") || [];
      const seen = new Set();
      return list
        .map((item) => normalizeTraStation(item?.name || ""))
        .filter((name) => name && !seen.has(name) && seen.add(name));
    }
    const thsrOrder = readPageValue("THSR_STATION_ORDER");
    if (Array.isArray(thsrOrder) && thsrOrder.length) {
      return unique(thsrOrder.map((name) => normalizeThsrStation(name)));
    }
    const list = readPageValue("stationListSorted") || [];
    const seen = new Set();
    return list
      .map((item) => normalizeThsrStation(item?.name || ""))
      .filter((name) => name && !seen.has(name) && seen.add(name));
  }

  async function ensureScheduleReady() {
    const dateStr = getQueryDate();
    let baseSchedule = readPageValue("baseSchedule") || window.trainSchedule || {};
    let prevSchedule = readPageValue("prevSchedule") || {};
    if ((!baseSchedule || !Object.keys(baseSchedule).length) && typeof window.refreshData === "function" && dateStr) {
      await maybePromise(window.refreshData(dateStr));
      baseSchedule = readPageValue("baseSchedule") || window.trainSchedule || {};
      prevSchedule = readPageValue("prevSchedule") || {};
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
    return window.RailNetwork?.normalizeTraDisplayType?.(raw) || raw;
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

  function buildTimedStops(stops) {
    const timedStops = [];
    let previousAbsoluteMinute = null;
    const stopCount = (stops || []).length;

    const resolveAbsoluteMinute = (rawMinute) => {
      if (rawMinute === null) return null;
      let absoluteMinute = rawMinute;
      while (previousAbsoluteMinute !== null && absoluteMinute < previousAbsoluteMinute) {
        absoluteMinute += 1440;
      }
      previousAbsoluteMinute = absoluteMinute;
      return absoluteMinute;
    };

    (stops || []).forEach((stop, index) => {
      const arrivalMinuteRaw = parseMinutes(stop.arrival);
      const departureMinuteRaw = parseMinutes(stop.departure);
      const hasArrival = arrivalMinuteRaw !== null;
      const hasDeparture = departureMinuteRaw !== null;
      timedStops.push({
        ...stop,
        hasArrival,
        hasDeparture,
        isPassOnly: index > 0 && index < stopCount - 1 && hasArrival !== hasDeparture,
        arrivalMinute: resolveAbsoluteMinute(arrivalMinuteRaw),
        departureMinute: resolveAbsoluteMinute(departureMinuteRaw),
      });
    });

    return timedStops;
  }

  function mergePathSegments(first, second) {
    if (!first.length) return second.slice();
    if (!second.length) return first.slice();
    return first.concat(second.slice(1));
  }

  function expandEntryPathStations(system, stops) {
    const names = (stops || []).map((stop) => stop.name).filter(Boolean);
    if (names.length < 2) return names.slice();
    const findPath =
      system === "tr"
        ? window.RailNetwork?.findTraRoutePath
        : window.RailNetwork?.findThsrRoutePath;
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
        const passMinute = Number.isFinite(current.departureMinute) ? current.departureMinute : current.arrivalMinute;
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

  function enrichEntryWithPath(entry, system) {
    const timedStops = buildTimedStops(entry.stops);
    const fullPathStations = expandEntryPathStations(system, entry.stops);
    return {
      ...entry,
      timedStops,
      fullPathStations,
      fullPathSet: new Set(fullPathStations),
      fullPathPoints: buildJourneyPathPoints(timedStops, fullPathStations),
    };
  }

  function buildTraEntries(scheduleSources) {
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
                name: normalizeTraStation(stop?.[0] || ""),
                arrival: times.arrival,
                departure: times.departure,
              };
            })
            .filter((stop) => stop.name && (stop.arrival || stop.departure));
          if (stops.length < 2) return null;
          return {
            key: `${trainNo}@${source.originDate || ""}`,
            originDate: source.originDate || getQueryDate(),
            trainNo: String(trainNo),
            rawType: String(raw["原始車種"] || raw["車種"] || "列車").trim() || "列車",
            type: window.RailNetwork?.normalizeTraDisplayType
              ? window.RailNetwork.normalizeTraDisplayType(raw["原始車種"] || raw["車種"] || "列車")
              : String(raw["原始車種"] || raw["車種"] || "列車").trim() || "列車",
            tripLine: raw["行別"] ?? "",
            stationSet: new Set(stops.map((stop) => stop.name)),
            stops,
          };
        })
        .map((entry) => (entry ? enrichEntryWithPath(entry, "tr") : null))
        .filter(Boolean)
    );
  }

  function buildThsrEntries(scheduleSources) {
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
                name: normalizeThsrStation(stop?.[0] || ""),
                arrival: times.arrival,
                departure: times.departure,
              };
            })
            .filter((stop) => stop.name && (stop.arrival || stop.departure));
          if (stops.length < 2) return null;
          return {
            key: `${trainNo}@${source.originDate || ""}`,
            originDate: source.originDate || getQueryDate(),
            trainNo: String(trainNo),
            type: "THSR",
            stationSet: new Set(stops.map((stop) => stop.name)),
            stops,
          };
        })
        .map((entry) => (entry ? enrichEntryWithPath(entry, "thsr") : null))
        .filter(Boolean)
    );
  }

  function buildTraEntries(scheduleSources) {
    const sources = Array.isArray(scheduleSources) ? scheduleSources : [{ map: scheduleSources || {}, originDate: getQueryDate() }];
    return sources.flatMap((source) =>
      Object.keys(source.map || {})
        .sort((a, b) => String(a).localeCompare(String(b), "en"))
        .map((trainNo) => {
          const raw = source.map?.[trainNo];
          if (!raw) return null;
          const rawType = String(raw["原始車種"] || raw["車種"] || "列車").trim() || "列車";
          const stopRows = raw["車站時間"] || [];
          const stops = stopRows
            .map((stop, index) => {
              const times = splitStopTimes(stop);
              const normalizedStop = normalizeSingleTimeTraStop(
                {
                  name: normalizeTraStation(stop?.[0] || ""),
                  arrival: times.arrival,
                  departure: times.departure,
                },
                index,
                stopRows.length,
                rawType
              );
              return {
                ...normalizedStop,
                name: normalizeTraStation(stop?.[0] || ""),
              };
            })
            .filter((stop) => stop.name && (stop.arrival || stop.departure));
          if (stops.length < 2) return null;
          return {
            key: `${trainNo}@${source.originDate || ""}`,
            originDate: source.originDate || getQueryDate(),
            trainNo: String(trainNo),
            rawType,
            type: window.RailNetwork?.normalizeTraDisplayType
              ? window.RailNetwork.normalizeTraDisplayType(rawType)
              : rawType,
            tripLine: raw["路線"] ?? raw["TripLine"] ?? raw["銵"] ?? "",
            stationSet: new Set(stops.map((stop) => stop.name)),
            stops,
          };
        })
        .map((entry) => (entry ? enrichEntryWithPath(entry, "tr") : null))
        .filter(Boolean)
    );
  }

  function normalizeSegment(segment, system) {
    const normalize = system === "tr" ? normalizeTraStation : normalizeThsrStation;
    return {
      ...segment,
      stations: unique((segment.stations || []).map((name) => normalize(name))),
      includeAny: unique((segment.includeAny || []).map((name) => normalize(name))),
      excludeAny: unique((segment.excludeAny || []).map((name) => normalize(name))),
    };
  }

  function buildTraSegmentGroups() {
    if (window.RailNetwork?.getTraSegmentGroups) {
      return window.RailNetwork.getTraSegmentGroups();
    }
    return TRA_SEGMENT_GROUPS.map((group) => ({
      ...group,
      segments: group.segments.map((segment) => normalizeSegment(segment, "tr")),
    }));
  }

  function buildThsrSegments(stationOrder) {
    if (!stationOrder.length) return [];
    return [
      {
        id: "thsr-main",
        title: "高鐵全線",
        subtitle: `${stationOrder[0]} → ${stationOrder[stationOrder.length - 1]}`,
        stations: stationOrder.slice(),
      },
    ];
  }

  function buildRouteChoices(system, stationOrder) {
    if (system === "tr") {
      return buildTraSegmentGroups().flatMap((group) =>
        group.segments.map((segment) => ({
          value: `${group.id}::${segment.id}`,
          label: `${group.title}｜${segment.title}`,
          groups: [{ ...group, segments: [segment] }],
        }))
      );
    }
    return buildThsrSegments(stationOrder).map((segment) => ({
      value: segment.id,
      label: segment.title,
      groups: [{ id: "thsr-main", title: segment.title, description: segment.subtitle || "", segments: [segment] }],
    }));
  }

  function syncRouteChoices(state, stationOrder) {
    const select = state.routeSelect;
    if (!select) return [];
    const previousValue = select.value;
    const nextChoices = buildRouteChoices(state.system, stationOrder);
    const changed =
      nextChoices.length !== state.routeChoices.length ||
      nextChoices.some((choice, index) => choice.value !== state.routeChoices[index]?.value || choice.label !== state.routeChoices[index]?.label);
    state.routeChoices = nextChoices;
    if (changed) {
      select.innerHTML = `
        <option value="">請選擇路線</option>
        ${nextChoices.map((choice) => `<option value="${escapeAttr(choice.value)}">${escapeHtml(choice.label)}</option>`).join("")}
      `;
    }
    select.value = nextChoices.some((choice) => choice.value === previousValue) ? previousValue : "";
    return nextChoices;
  }

  function renderLegendHint(state, message) {
    if (!state.legend) return;
    state.legend.innerHTML = `<div class="rail-op-empty">${escapeHtml(message)}</div>`;
  }

  function matchesSegmentEntry(entry, segment) {
    const stationSet = entry.fullPathSet || entry.stationSet || new Set(entry.stops.map((stop) => stop.name));
    if (segment.includeAny?.length && !segment.includeAny.some((name) => stationSet.has(name))) return false;
    if (segment.excludeAny?.length && segment.excludeAny.some((name) => stationSet.has(name))) return false;
    let hitCount = 0;
    for (const station of segment.stations) {
      if (!stationSet.has(station)) continue;
      hitCount += 1;
      if (hitCount >= 2) return true;
    }
    return false;
  }

  function buildSegmentRuns(entry, segmentStations, queryDate) {
    const routeIndexMap = new Map((segmentStations || []).map((name, index) => [name, index]));
    const points = (entry.fullPathPoints || [])
      .filter((point) => routeIndexMap.has(point.station))
      .map((point) => ({
        ...point,
        stationIndex: routeIndexMap.get(point.station),
      }))
      .filter((point) => Number.isFinite(point.stationIndex));
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

    return pointGroups
      .map((pointGroup, visitIndex) => {
        const firstMinuteRaw = pointGroup[0].minute;
        const lastMinuteRaw = pointGroup[pointGroup.length - 1].minute;
        const actualDate = addDays(entry.originDate || queryDate, Math.floor(firstMinuteRaw / 1440));
        if (queryDate && actualDate !== queryDate) return null;

        const offsetMinutes = diffDateDays(entry.originDate || queryDate, queryDate || entry.originDate || getQueryDate()) * 1440;
        const stopDetails = (entry.timedStops || [])
          .map((stop) => {
            const stationIndex = routeIndexMap.get(stop.name);
            const referenceMinute = stop.departureMinute ?? stop.arrivalMinute;
            if (!Number.isFinite(stationIndex)) return null;
            if (stop.isPassOnly) return null;
            if (!Number.isFinite(referenceMinute) || referenceMinute < firstMinuteRaw || referenceMinute > lastMinuteRaw) return null;
            return {
              ...stop,
              station: stop.name,
              stationIndex,
              arrivalMinute: Number.isFinite(stop.arrivalMinute) ? stop.arrivalMinute - offsetMinutes : stop.arrivalMinute,
              departureMinute: Number.isFinite(stop.departureMinute) ? stop.departureMinute - offsetMinutes : stop.departureMinute,
              isEndpoint: stop.name === entry.firstStation || stop.name === entry.lastStation,
            };
          })
          .filter(Boolean);
        const annotationDetails = [];
        const seenAnnotationKeys = new Set();
        const pushAnnotation = (detail) => {
          if (!detail) return;
          const minuteValue = detail.timeMinute ?? detail.departureMinute ?? detail.arrivalMinute ?? detail.minute;
          const key = `${detail.kind || "stop"}|${detail.station}|${minuteValue}`;
          if (seenAnnotationKeys.has(key)) return;
          seenAnnotationKeys.add(key);
          annotationDetails.push(detail);
        };
        stopDetails.forEach((detail) => {
          pushAnnotation({
            ...detail,
            kind: "stop",
            timeMinute: detail.departureMinute ?? detail.arrivalMinute,
          });
        });
        pointGroup.forEach((point) => {
          if (point.isStop) return;
          pushAnnotation({
            station: point.station,
            stationIndex: point.stationIndex,
            kind: "pass",
            minute: point.minute - offsetMinutes,
            timeMinute: point.minute - offsetMinutes,
          });
        });
        annotationDetails.sort((a, b) => (a.timeMinute ?? 0) - (b.timeMinute ?? 0) || a.stationIndex - b.stationIndex);

        return {
          ...entry,
          segmentVisitKey: `${entry.key || entry.trainNo}|${visitIndex}`,
          actualDate,
          points: pointGroup.map((point) => ({
            ...point,
            minute: point.minute - offsetMinutes,
          })),
          annotationDetails,
          stopDetails,
          firstMinute: firstMinuteRaw - offsetMinutes,
          lastMinute: lastMinuteRaw - offsetMinutes,
        };
      })
      .filter(Boolean);
  }

  function formatHourLabel(hour) {
    const day = Math.floor(hour / 24);
    const displayHour = String(hour % 24).padStart(2, "0");
    return day ? `${displayHour}:00+${day}` : `${displayHour}:00`;
  }

  function formatMinuteLabel(minuteValue) {
    if (!Number.isFinite(minuteValue)) return "--";
    const day = Math.floor(minuteValue / 1440);
    const minute = ((minuteValue % 1440) + 1440) % 1440;
    const hour = String(Math.floor(minute / 60)).padStart(2, "0");
    const minuteText = String(minute % 60).padStart(2, "0");
    return day ? `${hour}:${minuteText}+${day}` : `${hour}:${minuteText}`;
  }

  function getTimeSpanText(seriesList) {
    if (!seriesList.length) return "無符合條件班次";
    const first = Math.min(...seriesList.map((series) => series.firstMinute));
    const last = Math.max(...seriesList.map((series) => series.lastMinute));
    return `${formatMinuteLabel(first)} - ${formatMinuteLabel(last)}`;
  }

  function buildCountMap(entries, keyGetter) {
    const counts = new Map();
    (entries || []).forEach((entry) => {
      const key = keyGetter(entry);
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function getSegmentChipData(system, entries) {
    if (system === "tr") {
      const counts = buildCountMap(entries, (entry) => entry.type);
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"))
        .map(([type, count]) => ({
          label: type,
          count,
          color: getReadableRailColor(getTraTypeColor(type)),
        }));
    }
    const counts = buildCountMap(entries, (entry) => getDirectionKey(system, entry.trainNo));
    return [
      { label: "北上", count: counts.get("north") || 0, color: THSR_DIRECTION_COLORS.north },
      { label: "南下", count: counts.get("south") || 0, color: THSR_DIRECTION_COLORS.south },
    ];
  }

  function buildStationRail(stations, metrics) {
    return `
      <div class="rail-op-station-axis" style="height:${metrics.axisHeight}px">車站</div>
      ${stations
        .map(
          (station) => `
            <div class="rail-op-station-item" style="height:${metrics.rowHeight}px">
              <span>${escapeHtml(station)}</span>
            </div>
          `
        )
        .join("")}
    `;
  }

  function roundRectPath(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function getCanvasPalette() {
    const dark = document.body.classList.contains("dark-mode");
    return dark
      ? {
          bg: "#111827",
          axisBg: "#0f172a",
          axisText: "#e2e8f0",
          gridHour: "rgba(148,163,184,0.24)",
          gridHalf: "rgba(148,163,184,0.10)",
          rowEven: "rgba(255,255,255,0.02)",
          rowOdd: "rgba(255,255,255,0.05)",
          stationLine: "rgba(148,163,184,0.14)",
          labelBg: "rgba(15,23,42,0.92)",
          labelText: "#f8fafc",
        }
      : {
          bg: "#ffffff",
          axisBg: "#f8fafc",
          axisText: "#0f172a",
          gridHour: "rgba(100,116,139,0.22)",
          gridHalf: "rgba(100,116,139,0.10)",
          rowEven: "rgba(15,23,42,0.015)",
          rowOdd: "rgba(15,23,42,0.04)",
          stationLine: "rgba(148,163,184,0.26)",
          labelBg: "rgba(255,255,255,0.94)",
          labelText: "#0f172a",
        };
  }

  function shouldDrawLabel(index, total, mode, force) {
    if (force) return true;
    if (mode === "none") return false;
    if (mode === "all" || total <= 24) return true;
    const step = Math.max(1, Math.ceil(total / 30));
    return index % step === 0;
  }

  function drawTrainLabel(ctx, text, x, y, color, palette, occupiedRects, canvasWidth, canvasHeight) {
    const paddingX = 7;
    ctx.font = "700 11px Inter, Noto Sans TC, sans-serif";
    const textWidth = ctx.measureText(text).width;
    const width = textWidth + paddingX * 2;
    const height = 22;
    const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));
    const intersectsRect = (first, second, padding = 5) =>
      !(
        first.x + first.width + padding <= second.x ||
        second.x + second.width + padding <= first.x ||
        first.y + first.height + padding <= second.y ||
        second.y + second.height + padding <= first.y
      );
    const baseX = clampValue(x - width / 2, 12, Math.max(12, canvasWidth - width - 12));
    const baseY = y - height - 6;
    const offsets = [0, -26, 26, -52, 52, -78, 78, -104, 104];
    let chosenRect = null;
    let bestRect = null;
    let bestScore = Number.POSITIVE_INFINITY;

    offsets.forEach((offset) => {
      const rect = {
        x: baseX,
        y: clampValue(baseY + offset, 8, Math.max(8, canvasHeight - height - 8)),
        width,
        height,
      };
      const overlapCount = (occupiedRects || []).reduce((count, occupied) => count + (intersectsRect(rect, occupied) ? 1 : 0), 0);
      const score = overlapCount * 1000 + Math.abs(offset);
      if (!chosenRect && overlapCount === 0) chosenRect = rect;
      if (score < bestScore) {
        bestScore = score;
        bestRect = rect;
      }
    });

    const finalRect = chosenRect || bestRect || {
      x: baseX,
      y: clampValue(baseY, 8, Math.max(8, canvasHeight - height - 8)),
      width,
      height,
    };
    if (occupiedRects) occupiedRects.push(finalRect);

    roundRectPath(ctx, finalRect.x, finalRect.y, width, height, 10);
    ctx.fillStyle = palette.labelBg;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.fillStyle = color || palette.labelText;
    ctx.textBaseline = "middle";
    ctx.fillText(text, finalRect.x + paddingX, finalRect.y + height / 2 + 0.5);
  }

  function formatAnnotationText(detail) {
    if (detail?.kind === "pass") {
      const passText = Number.isFinite(detail.timeMinute) ? formatMinuteLabel(detail.timeMinute) : (Number.isFinite(detail.minute) ? formatMinuteLabel(detail.minute) : "");
      return passText ? `通 ${passText}` : "";
    }
    let arrivalText = Number.isFinite(detail.arrivalMinute) ? formatMinuteLabel(detail.arrivalMinute) : (detail.arrival || "");
    let departureText = Number.isFinite(detail.departureMinute) ? formatMinuteLabel(detail.departureMinute) : (detail.departure || "");

    if (!arrivalText && departureText && detail?.isEndpoint) arrivalText = departureText;
    if (!departureText && arrivalText && detail?.isEndpoint) departureText = arrivalText;
    if (arrivalText && departureText) return `到${arrivalText}/開${departureText}`;
    return departureText ? `開${departureText}` : (arrivalText ? `到${arrivalText}` : "");
  }

  function formatStopDetail(detail) {
    return formatAnnotationText(detail);
  }

  function drawSegmentCanvas(canvas, system, segment, seriesList, scaleKey, labelMode, query) {
    const scale = SCALE_OPTIONS[scaleKey] || SCALE_OPTIONS.standard;
    const maxMinute = Math.max(1440, ...seriesList.map((series) => series.lastMinute));
    const hourCount = Math.max(24, Math.ceil((maxMinute + 30) / 60));
    const width = Math.round(scale.pxPerHour * hourCount + 44);
    const height = Math.round(scale.axisHeight + scale.rowHeight * segment.stations.length);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, width > 4200 ? 1 : 1.25);
    const palette = getCanvasPalette();
    const queryText = String(query || "").trim();

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const axisHeight = scale.axisHeight;
    const leftPad = 22;
    const rightPad = 22;
    const graphWidth = width - leftPad - rightPad;
    const totalMinutes = hourCount * 60;
    const matchedSeries = queryText ? seriesList.filter((series) => series.trainNo.includes(queryText)) : [];
    const showStopAnnotations = matchedSeries.length > 0;
    const occupiedLabelRects = [];

    const xForMinute = (minute) => leftPad + (minute / totalMinutes) * graphWidth;
    const yForStation = (index) => axisHeight + scale.rowHeight * index + scale.rowHeight / 2;

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = palette.axisBg;
    ctx.fillRect(0, 0, width, axisHeight);

    for (let minute = 0; minute <= totalMinutes; minute += 10) {
      const x = xForMinute(minute);
      const isHour = minute % 60 === 0;
      const isHalfHour = minute % 30 === 0;
      ctx.strokeStyle = isHour ? palette.gridHour : isHalfHour ? palette.gridHalf : "rgba(148,163,184,0.08)";
      ctx.lineWidth = isHour ? 1.25 : isHalfHour ? 1 : 0.7;
      ctx.beginPath();
      ctx.moveTo(x, isHalfHour ? 0 : axisHeight);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (minute < totalMinutes && isHalfHour) {
        ctx.fillStyle = palette.axisText;
        ctx.font = "700 11px Inter, Noto Sans TC, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(formatMinuteLabel(minute), Math.min(width - 64, x + 4), axisHeight / 2 + 0.5);
      }
    }

    segment.stations.forEach((_, index) => {
      const top = axisHeight + scale.rowHeight * index;
      ctx.fillStyle = index % 2 === 0 ? palette.rowEven : palette.rowOdd;
      ctx.fillRect(0, top, width, scale.rowHeight);
      ctx.strokeStyle = palette.stationLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(width, top);
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.moveTo(0, height - 0.5);
    ctx.lineTo(width, height - 0.5);
    ctx.strokeStyle = palette.stationLine;
    ctx.stroke();

    seriesList.forEach((series, index) => {
      const matchesQuery = !queryText || series.trainNo.includes(queryText);
      const alpha = queryText ? (matchesQuery ? 0.96 : 0.16) : 0.88;
      const color = getEntryColor(system, series);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = matchesQuery ? 2.35 : 1.9;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.globalAlpha = alpha;
      ctx.beginPath();

      series.points.forEach((point, pointIndex) => {
        const x = xForMinute(point.minute);
        const y = yForStation(point.stationIndex);
        if (pointIndex === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const firstPoint = series.points[0];
      const lastPoint = series.points[series.points.length - 1];
      [firstPoint, lastPoint].forEach((point) => {
        const x = xForMinute(point.minute);
        const y = yForStation(point.stationIndex);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, matchesQuery ? 2.6 : 2.1, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      if (!shouldDrawLabel(index, seriesList.length, labelMode, queryText && matchesQuery)) return;
      if (queryText && !matchesQuery) return;

      const midPoint = series.points[Math.floor(series.points.length / 2)];
      drawTrainLabel(ctx, series.trainNo, xForMinute(midPoint.minute), yForStation(midPoint.stationIndex), color, palette, occupiedLabelRects, width, height);

      if (!showStopAnnotations || !matchesQuery) return;
      ctx.save();
      ctx.fillStyle = palette.axisText;
      ctx.font = "600 10px Inter, Noto Sans TC, sans-serif";
      (series.annotationDetails || series.stopDetails || []).forEach((detail) => {
        const timeText = formatAnnotationText(detail);
        const minuteValue = detail.timeMinute ?? detail.departureMinute ?? detail.arrivalMinute ?? detail.minute;
        if (!timeText || !Number.isFinite(minuteValue)) return;
        const x = xForMinute(minuteValue) + 4;
        const y = yForStation(detail.stationIndex) + (detail.kind === "pass" ? 12 : -9);
        ctx.fillText(timeText, x, y);
      });
      ctx.restore();
    });
  }

  function renderEmpty(state, message) {
    state.output.innerHTML = `<div class="rail-op-empty">${escapeHtml(message)}</div>`;
  }

  function renderMeta(state, title, subtitle) {
    const meta = state.output.querySelector(".rail-op-meta-line");
    if (!meta) return;
    meta.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(subtitle)}</span>
    `;
  }

  function updateTraLegend(state, entries) {
    const host = state.legend;
    if (!host) return;
    const previousTypes = state.allTypes.slice();
    const hadAllSelected =
      previousTypes.length > 0 &&
      state.selectedTypes.size === previousTypes.length &&
      previousTypes.every((type) => state.selectedTypes.has(type));
    const types = unique(entries.map((entry) => entry.type)).sort((a, b) => a.localeCompare(b, "zh-Hant"));
    state.allTypes = types.slice();
    const counts = buildCountMap(entries, (entry) => entry.type);
    const normalizedSelection = new Set(Array.from(state.selectedTypes).filter((type) => types.includes(type)));
    if (!state.hasTypeSelection || hadAllSelected || (!normalizedSelection.size && !previousTypes.length)) {
      types.forEach((type) => normalizedSelection.add(type));
      state.hasTypeSelection = true;
    }
    state.selectedTypes = normalizedSelection;

    host.innerHTML = `
      <div class="rail-op-legend-head">
        <strong>車種圖例</strong>
        <div class="rail-op-legend-actions">
          <button type="button" class="btn-ghost rail-op-mini-btn" data-legend-action="all">全選</button>
          <button type="button" class="btn-ghost rail-op-mini-btn" data-legend-action="none">全無</button>
        </div>
      </div>
      <div class="rail-op-legend-list">
        ${types
          .map(
            (type) => `
              <button
                type="button"
                class="rail-op-type-chip ${state.selectedTypes.has(type) ? "active" : ""}"
                data-type="${escapeAttr(type)}"
                style="--rail-op-chip:${escapeAttr(getReadableRailColor(getTraTypeColor(type)))}"
              >
                <span class="rail-op-type-dot"></span>
                <span>${escapeHtml(type)}</span>
                <b>${counts.get(type) || 0}</b>
              </button>
            `
          )
          .join("")}
      </div>
    `;

    host.querySelector('[data-legend-action="all"]')?.addEventListener("click", () => {
      state.selectedTypes = new Set(types);
      renderOperationDiagram(state);
    });
    host.querySelector('[data-legend-action="none"]')?.addEventListener("click", () => {
      state.selectedTypes = new Set();
      renderOperationDiagram(state);
    });
    host.querySelectorAll("[data-type]").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.getAttribute("data-type");
        if (!type) return;
        if (state.selectedTypes.has(type)) state.selectedTypes.delete(type);
        else state.selectedTypes.add(type);
        renderOperationDiagram(state);
      });
    });
  }

  function updateThsrLegend(state, entries) {
    const host = state.legend;
    if (!host) return;
    const counts = buildCountMap(entries, (entry) => getDirectionKey("thsr", entry.trainNo));
    host.innerHTML = `
      <div class="rail-op-legend-head">
        <strong>方向圖例</strong>
      </div>
      <div class="rail-op-legend-list">
        <div class="rail-op-static-chip" style="--rail-op-chip:${THSR_DIRECTION_COLORS.north}">
          <span class="rail-op-type-dot"></span>
          <span>北上</span>
          <b>${counts.get("north") || 0}</b>
        </div>
        <div class="rail-op-static-chip" style="--rail-op-chip:${THSR_DIRECTION_COLORS.south}">
          <span class="rail-op-type-dot"></span>
          <span>南下</span>
          <b>${counts.get("south") || 0}</b>
        </div>
      </div>
    `;
  }

  function buildSegmentEntryList(entries, segment, queryDate) {
    return (entries || [])
      .filter((entry) => matchesSegmentEntry(entry, segment))
      .flatMap((entry) => buildSegmentRuns(entry, segment.stations, queryDate))
      .sort((a, b) => a.firstMinute - b.firstMinute || a.lastMinute - b.lastMinute || a.trainNo.localeCompare(b.trainNo, "en"));
  }

  function createSegmentBlock(state, segment, segmentEntries, queryText) {
    const scale = SCALE_OPTIONS[state.scaleSelect.value] || SCALE_OPTIONS.standard;
    const metrics = { axisHeight: scale.axisHeight, rowHeight: scale.rowHeight };
    const card = document.createElement("section");
    card.className = "rail-op-card";

    const chipData = getSegmentChipData(state.system, segmentEntries).slice(0, state.system === "tr" ? 6 : 2);
    const matchedCount = queryText ? segmentEntries.filter((entry) => entry.trainNo.includes(queryText)).length : segmentEntries.length;
    const matchedDetails = queryText ? segmentEntries.filter((entry) => entry.trainNo.includes(queryText)).slice(0, 3) : [];

    card.innerHTML = `
      <div class="rail-op-card-head">
        <div>
          <h3>${escapeHtml(segment.title)}</h3>
          <p>${escapeHtml(segment.subtitle || "")}</p>
        </div>
        <div class="rail-op-card-meta">
          <span>${segment.stations.length} 站</span>
          <span>${segmentEntries.length} 班</span>
          <span>${getTimeSpanText(segmentEntries)}</span>
          ${queryText ? `<span>高亮 ${matchedCount} 班</span>` : ""}
          ${queryText ? `<span>高亮可顯示通過/停靠時間</span>` : ""}
        </div>
      </div>
      <div class="rail-op-chip-row">
        ${chipData
          .map(
            (chip) => `
              <span class="rail-op-chip" style="--rail-op-chip:${escapeAttr(chip.color)}">
                <span class="rail-op-type-dot"></span>
                <span>${escapeHtml(chip.label)}</span>
                <b>${chip.count}</b>
              </span>
            `
          )
          .join("")}
      </div>
      <div class="rail-op-shell">
        <div class="rail-op-stations">
          ${buildStationRail(segment.stations, metrics)}
        </div>
        <div class="rail-op-canvas-scroll"></div>
      </div>
      ${
        matchedDetails.length
          ? `
            <div class="rail-op-detail-list">
              ${matchedDetails
                .map(
                  (entry) => `
                    <div class="rail-op-detail-card">
                      <div class="rail-op-detail-head">
                        <strong>${escapeHtml(entry.trainNo)}</strong>
                        <span style="color:${escapeAttr(getEntryColor(state.system, entry))}">${escapeHtml(state.system === "tr" ? entry.type : getDirectionKey("thsr", entry.trainNo) === "north" ? "北上" : "南下")}</span>
                      </div>
                      <div class="rail-op-detail-stops">
                        ${(entry.annotationDetails || entry.stopDetails || [])
                          .map(
                            (detail) => `
                              <span class="rail-op-detail-stop">
                                <b>${escapeHtml(detail.station)}</b>
                                <small>${escapeHtml(formatStopDetail(detail))}</small>
                              </span>
                            `
                          )
                          .join("")}
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }
    `;

    if (!segmentEntries.length) {
      card.querySelector(".rail-op-canvas-scroll").innerHTML = `<div class="rail-op-empty rail-op-block-empty">這個分段目前沒有符合條件的班次。</div>`;
      return card;
    }

    const scroll = card.querySelector(".rail-op-canvas-scroll");
    const canvas = document.createElement("canvas");
    canvas.className = "rail-op-canvas";
    scroll?.appendChild(canvas);
    drawSegmentCanvas(canvas, state.system, segment, segmentEntries, state.scaleSelect.value, state.labelSelect.value, queryText);
    return card;
  }

  function createGroupBlock(state, group, queryText) {
    const wrapper = document.createElement("section");
    wrapper.className = "rail-op-group";
    wrapper.innerHTML = `
      <div class="rail-op-group-head">
        <h2>${escapeHtml(group.title)}</h2>
        <p>${escapeHtml(group.description || "")}</p>
      </div>
      <div class="rail-op-group-list"></div>
    `;
    const list = wrapper.querySelector(".rail-op-group-list");
    (group.segmentData || []).forEach(({ segment, entries }) => {
      list?.appendChild(createSegmentBlock(state, segment, entries, queryText));
    });
    return wrapper;
  }

  async function renderOperationDiagram(state) {
    if (!(await ensureOperationDiagramAccess())) return;
    const button = state.renderButton;
    const previousLabel = button.textContent;
    button.disabled = true;
    button.textContent = "繪製中...";

    try {
      const scheduleSources = await ensureScheduleReady();
      if (!scheduleSources.length) {
        renderEmpty(state, `${state.system === "tr" ? "台鐵" : "高鐵"}真實班表尚未就緒，請先更新頁面資料後再試。`);
        return;
      }

      const stationOrder = getStationOrder(state.system);
      if (state.system === "thsr" && !stationOrder.length) {
        renderEmpty(state, "站點索引尚未完成，請稍後再試。");
        return;
      }

      const routeChoices = syncRouteChoices(state, stationOrder);
      if (!routeChoices.length) {
        renderLegendHint(state, "目前沒有可選擇的路線。");
        renderEmpty(state, "找不到可繪製的路線。");
        return;
      }
      const selectedRoute = routeChoices.find((choice) => choice.value === (state.routeSelect?.value || "")) || null;
      if (!selectedRoute) {
        renderLegendHint(state, state.system === "tr" ? "請先選擇路線後再篩選車種。" : "請先選擇路線後再顯示全線運行圖。");
        renderEmpty(state, "請先選擇路線後再顯示運行圖。");
        return;
      }

      const queryDate = getQueryDate();
      const baseEntries = state.system === "tr" ? buildTraEntries(scheduleSources) : buildThsrEntries(scheduleSources);
      const directionValue = state.directionSelect.value || "all";
      const scopedEntries = baseEntries.filter((entry) => matchesDirectionFilter(state.system, entry.trainNo, directionValue));
      const routeScopedEntries = scopedEntries.filter((entry) =>
        selectedRoute.groups.some((group) => group.segments.some((segment) => matchesSegmentEntry(entry, segment)))
      );
      const activeGroups = selectedRoute.groups;
      const segmentCount = activeGroups.reduce((sum, group) => sum + group.segments.length, 0);
      if (!segmentCount) {
        renderEmpty(state, "找不到可繪製的路線分段。");
        return;
      }

      const availableGroups = activeGroups.map((group) => ({
        ...group,
        segmentData: group.segments.map((segment) => ({
          segment,
          entries: buildSegmentEntryList(routeScopedEntries, segment, queryDate),
        })),
      }));
      const availableRuns = availableGroups.flatMap((group) => group.segmentData.flatMap((item) => item.entries));
      if (state.system === "tr") {
        updateTraLegend(state, availableRuns);
      } else {
        updateThsrLegend(state, availableRuns);
      }

      const displayedGroups = activeGroups.map((group) => ({
        ...group,
        segmentData: group.segments.map((segment) => {
          const entries = buildSegmentEntryList(routeScopedEntries, segment, queryDate).filter((entry) =>
            state.system !== "tr" ? true : state.selectedTypes.has(entry.type)
          );
          return { segment, entries };
        }),
      }));
      const displayedRuns = displayedGroups.flatMap((group) => group.segmentData.flatMap((item) => item.entries));
      if (!displayedRuns.length) {
        renderEmpty(state, state.system === "tr" ? "目前沒有符合方向 / 車種條件的台鐵班次。" : "目前沒有符合方向條件的高鐵班次。");
        return;
      }

      const queryText = String(state.searchInput.value || "").trim();
      const highlightedCount = queryText ? displayedRuns.filter((entry) => entry.trainNo.includes(queryText)).length : displayedRuns.length;
      const effectiveQuery = queryText && highlightedCount ? queryText : "";

      state.output.innerHTML = `
        <div class="rail-op-export-scope">
          <div class="rail-op-meta-line"></div>
          <div class="rail-op-section-list"></div>
        </div>
      `;

      const directionLabel = getDirectionOptions(state.system).find((option) => option.value === directionValue)?.label || "全部";
      const scopeLabel = selectedRoute.label;
      const highlightText = queryText ? `｜高亮 ${highlightedCount} 班` : "";
      const routeLabel = selectedRoute.label;
      renderMeta(
        state,
        `${state.system === "tr" ? "台鐵" : "高鐵"}運行圖`,
        `${getQueryDate() || "未指定日期"}｜${routeLabel}｜方向 ${directionLabel}｜顯示 ${displayedRuns.length} 班${highlightText}`
      );

      const sectionList = state.output.querySelector(".rail-op-section-list");
      for (const group of displayedGroups) {
        sectionList?.appendChild(createGroupBlock(state, group, effectiveQuery));
        await nextFrame();
      }
    } catch (error) {
      console.error(error);
      renderEmpty(state, "運行圖建立失敗，請稍後再試。");
    } finally {
      button.disabled = false;
      button.textContent = previousLabel;
    }
  }

  function resetState(state) {
    if (state.routeSelect) state.routeSelect.value = "";
    state.directionSelect.value = "all";
    state.scaleSelect.value = "standard";
    state.labelSelect.value = "smart";
    state.searchInput.value = "";
    if (state.system === "tr") state.selectedTypes = new Set(state.allTypes || []);
    renderOperationDiagram(state);
  }

  function buildPanelHTML(system) {
    const directionOptions = getDirectionOptions(system)
      .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
      .join("");

    return `
      <div class="section-title">運行圖</div>
      <p class="rail-op-lead">${
        system === "tr"
          ? "依目前查詢日期的真實台鐵班表繪出主線 / 支線運行圖。台鐵以完整車種配色，列車若有停靠會用到達 / 開車雙時分繪出停站段；輸入車次時，下面會同步列出停靠站的到開時分。"
          : "依目前查詢日期的真實高鐵班表繪出全線運行圖。高鐵改用北上 / 南下雙色，停靠站同樣會以到達 / 開車雙時分畫出停站段，方便一眼抓到班距與停站節奏。"
      }</p>
      <div class="rail-op-toolbar">
        <div class="rail-op-control">
          <span>路線</span>
          <select id="railOpRoute" class="rail-op-select">
            <option value="">請選擇路線</option>
          </select>
        </div>
        <div class="rail-op-control">
          <span>方向</span>
          <select id="railOpDirection" class="rail-op-select">${directionOptions}</select>
        </div>
        <div class="rail-op-control">
          <span>密度</span>
          <select id="railOpScale" class="rail-op-select">
            ${Object.entries(SCALE_OPTIONS)
              .map(([value, option]) => `<option value="${escapeAttr(value)}" ${value === "standard" ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
              .join("")}
          </select>
        </div>
        <div class="rail-op-control">
          <span>車次標示</span>
          <select id="railOpLabelMode" class="rail-op-select">
            ${LABEL_OPTIONS.map((option) => `<option value="${escapeAttr(option.value)}" ${option.value === "smart" ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
          </select>
        </div>
        <div class="rail-op-control rail-op-search">
          <input id="railOpTrainSearch" class="rail-op-input" type="text" placeholder="高亮車次，例如 110 或 803">
          <button id="railOpRender" type="button" class="btn-primary">重新繪製</button>
          <button id="railOpReset" type="button" class="btn-ghost">重設</button>
        </div>
      </div>
      <div id="railOpLegend" class="rail-op-legend"></div>
      <div id="railOpOutput" class="rail-op-output">
        <div class="rail-op-empty">可直接產生目前查詢日期的運行圖，並保留各分段 / 全線的實際班表節奏。</div>
      </div>
    `;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .rail-op-panel{display:flex; flex-direction:column; gap:14px;}
      .rail-op-lead{margin:0; color:var(--text-muted); line-height:1.75;}
      .rail-op-toolbar{display:flex; flex-wrap:wrap; gap:10px;}
      .rail-op-control{display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:16px; border:1px solid var(--border); background:var(--bg-body);}
      .rail-op-control span{font-size:.85rem; color:var(--text-muted); font-weight:700; white-space:nowrap;}
      .rail-op-select,.rail-op-input{height:38px; border-radius:12px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-main); padding:0 12px; font:inherit;}
      .rail-op-search{flex:1 1 380px; justify-content:flex-end;}
      .rail-op-input{min-width:160px; flex:1 1 160px;}
      .rail-op-legend{display:flex; flex-direction:column; gap:10px; padding:14px; border-radius:18px; border:1px solid var(--border); background:var(--bg-body);}
      .rail-op-legend-head{display:flex; align-items:center; justify-content:space-between; gap:12px;}
      .rail-op-legend-head strong{font-size:.95rem;}
      .rail-op-legend-actions{display:flex; gap:8px;}
      .rail-op-mini-btn{padding:6px 10px !important; font-size:.82rem !important;}
      .rail-op-legend-list{display:flex; flex-wrap:wrap; gap:8px;}
      .rail-op-type-chip,.rail-op-static-chip,.rail-op-chip{display:inline-flex; align-items:center; gap:8px; border-radius:999px; border:1px solid color-mix(in srgb, var(--rail-op-chip) 42%, var(--border)); background:color-mix(in srgb, var(--rail-op-chip) 10%, var(--bg-surface)); color:var(--text-main); padding:8px 12px; font:inherit; white-space:nowrap;}
      .rail-op-type-chip{cursor:pointer; transition:transform .18s ease, border-color .18s ease, background .18s ease; opacity:.58;}
      .rail-op-type-chip:hover{transform:translateY(-1px);}
      .rail-op-type-chip.active{opacity:1; border-color:var(--rail-op-chip); box-shadow:0 10px 24px color-mix(in srgb, var(--rail-op-chip) 18%, transparent);}
      .rail-op-type-chip b,.rail-op-static-chip b,.rail-op-chip b{font-size:.82rem;}
      .rail-op-type-dot{width:10px; height:10px; border-radius:50%; background:var(--rail-op-chip); flex:0 0 auto;}
      .rail-op-output{display:flex; flex-direction:column; gap:14px;}
      .rail-op-export-scope,.rail-op-section-list{display:flex; flex-direction:column; gap:14px;}
      .rail-op-meta-line{display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; padding:12px 14px; border-radius:16px; border:1px solid var(--border); background:var(--bg-body);}
      .rail-op-meta-line strong{font-size:.96rem;}
      .rail-op-meta-line span{color:var(--text-muted); font-size:.88rem;}
      .rail-op-group{display:flex; flex-direction:column; gap:12px;}
      .rail-op-group-head{display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:10px; padding:14px 16px; border-radius:18px; border:1px solid var(--border); background:linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, var(--bg-surface)), var(--bg-body));}
      .rail-op-group-head h2{margin:0; font-size:1.12rem;}
      .rail-op-group-head p{margin:0; color:var(--text-muted); font-size:.88rem;}
      .rail-op-group-list{display:flex; flex-direction:column; gap:12px;}
      .rail-op-card{display:flex; flex-direction:column; gap:12px; padding:16px; border-radius:22px; border:1px solid var(--border); background:var(--bg-surface); box-shadow:0 16px 34px rgba(15,23,42,0.08);}
      .rail-op-card-head{display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:12px;}
      .rail-op-card-head h3{margin:0; font-size:1.06rem;}
      .rail-op-card-head p{margin:4px 0 0; color:var(--text-muted); font-size:.88rem;}
      .rail-op-card-meta{display:flex; flex-wrap:wrap; gap:8px;}
      .rail-op-card-meta span{display:inline-flex; align-items:center; min-height:30px; padding:0 10px; border-radius:999px; background:var(--bg-body); color:var(--text-muted); font-size:.82rem; font-weight:700;}
      .rail-op-chip-row{display:flex; flex-wrap:wrap; gap:8px;}
      .rail-op-shell{display:grid; grid-template-columns:120px minmax(0,1fr); border:1px solid var(--border); border-radius:18px; overflow:hidden; background:var(--bg-body);}
      .rail-op-stations{border-right:1px solid var(--border); background:color-mix(in srgb, var(--bg-surface) 82%, var(--bg-body));}
      .rail-op-station-axis{display:flex; align-items:center; justify-content:flex-end; padding:0 14px; font-size:.76rem; font-weight:800; letter-spacing:.04em; color:var(--text-muted); background:var(--bg-body); border-bottom:1px solid var(--border);}
      .rail-op-station-item{display:flex; align-items:center; justify-content:flex-end; padding:0 14px; border-bottom:1px solid color-mix(in srgb, var(--border) 75%, transparent);}
      .rail-op-station-item span{font-size:.82rem; font-weight:700; color:var(--text-main);}
      .rail-op-station-item:last-child{border-bottom:none;}
      .rail-op-canvas-scroll{position:relative; overflow:auto; background:var(--bg-surface);}
      .rail-op-canvas{display:block;}
      .rail-op-detail-list{display:flex; flex-direction:column; gap:10px;}
      .rail-op-detail-card{padding:12px 14px; border-radius:16px; border:1px solid var(--border); background:var(--bg-body);}
      .rail-op-detail-head{display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px;}
      .rail-op-detail-head strong{font-size:.96rem;}
      .rail-op-detail-head span{font-size:.84rem; font-weight:700;}
      .rail-op-detail-stops{display:flex; flex-wrap:wrap; gap:8px;}
      .rail-op-detail-stop{display:flex; flex-direction:column; gap:2px; padding:8px 10px; border-radius:12px; background:var(--bg-surface); border:1px solid var(--border);}
      .rail-op-detail-stop b{font-size:.84rem;}
      .rail-op-detail-stop small{font-size:.76rem; color:var(--text-muted);}
      .rail-op-empty{padding:16px 18px; border-radius:16px; border:1px dashed var(--border); color:var(--text-muted); background:color-mix(in srgb, var(--bg-body) 86%, transparent); line-height:1.75;}
      .rail-op-block-empty{margin:14px;}
      @media (max-width: 980px){
        .rail-op-search{flex:1 1 100%; justify-content:flex-start;}
      }
      @media (max-width: 760px){
        .rail-op-card{padding:14px; border-radius:18px;}
        .rail-op-shell{grid-template-columns:88px minmax(0,1fr);}
        .rail-op-station-axis,.rail-op-station-item{padding:0 10px;}
        .rail-op-station-item span{font-size:.76rem;}
      }
      @media (max-width: 640px){
        .rail-op-toolbar{gap:8px;}
        .rail-op-control{width:100%; flex-wrap:wrap; justify-content:flex-start; border-radius:14px;}
        .rail-op-select,.rail-op-input{min-width:0; flex:1 1 140px;}
        .rail-op-shell{grid-template-columns:82px minmax(0,1fr);}
      }
    `;
    document.head.appendChild(style);
  }

  function buildState(system, panel) {
    return {
      system,
      panel,
      allTypes: [],
      hasTypeSelection: false,
      routeChoices: [],
      selectedTypes: new Set(),
      routeSelect: panel.querySelector("#railOpRoute"),
      directionSelect: panel.querySelector("#railOpDirection"),
      scaleSelect: panel.querySelector("#railOpScale"),
      labelSelect: panel.querySelector("#railOpLabelMode"),
      searchInput: panel.querySelector("#railOpTrainSearch"),
      renderButton: panel.querySelector("#railOpRender"),
      resetButton: panel.querySelector("#railOpReset"),
      legend: panel.querySelector("#railOpLegend"),
      output: panel.querySelector("#railOpOutput"),
    };
  }

  function placeAfterMaster(tab, panel) {
    const grid = document.querySelector("main .grid");
    const tabs = grid?.querySelector(".query-tabs");
    const anchorTab = document.getElementById(MASTER_TAB_ID) || document.getElementById("tab-ai");
    const anchorPanel = document.getElementById(MASTER_PANEL_ID) || document.getElementById("panel-ai");

    if (tabs && tab && anchorTab?.parentElement === tabs && anchorTab.nextElementSibling !== tab) {
      anchorTab.insertAdjacentElement("afterend", tab);
    }
    if (grid && panel && anchorPanel?.parentElement === grid && anchorPanel.nextElementSibling !== panel) {
      anchorPanel.insertAdjacentElement("afterend", panel);
    }
  }

  function insertOperationPanel(system) {
    const grid = document.querySelector("main .grid");
    const tabs = grid?.querySelector(".query-tabs");
    if (!grid || !tabs || document.getElementById(PANEL_ID)) return null;

    const tab = document.createElement("button");
    tab.className = "query-tab";
    tab.id = TAB_ID;
    tab.type = "button";
    tab.dataset.target = PANEL_ID;
    tab.textContent = "運行圖";

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "card query-panel rail-op-panel hidden";
    panel.innerHTML = buildPanelHTML(system);

    const anchorTab = document.getElementById(MASTER_TAB_ID) || document.getElementById("tab-ai");
    const anchorPanel = document.getElementById(MASTER_PANEL_ID) || document.getElementById("panel-ai");
    if (anchorTab?.parentElement === tabs) anchorTab.insertAdjacentElement("afterend", tab);
    else tabs.appendChild(tab);

    if (anchorPanel?.parentElement === grid) anchorPanel.insertAdjacentElement("afterend", panel);
    else {
      const lastPanel = Array.from(grid.querySelectorAll(".query-panel")).slice(-1)[0];
      if (lastPanel) lastPanel.insertAdjacentElement("afterend", panel);
      else tabs.insertAdjacentElement("afterend", panel);
    }

    placeAfterMaster(tab, panel);
    return { tab, panel };
  }

  function bindOperationPanel(state, tab) {
    const render = () => renderOperationDiagram(state);
    tab.addEventListener("click", async () => {
      if (!(await ensureOperationDiagramAccess())) return;
      window.switchQueryPanel?.(PANEL_ID);
      if (!state.output.querySelector(".rail-op-export-scope")) render();
    });
    state.renderButton.addEventListener("click", async () => {
      if (!(await ensureOperationDiagramAccess())) return;
      render();
    });
    state.resetButton.addEventListener("click", () => resetState(state));

    [state.routeSelect, state.directionSelect, state.scaleSelect, state.labelSelect].forEach((element) => {
      element?.addEventListener("change", render);
    });

    let timer = null;
    state.searchInput?.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(render, 180);
    });

    document.getElementById("mainQueryDate")?.addEventListener("change", () => {
      if (!state.panel.classList.contains("hidden")) render();
    });

    const observer = new MutationObserver(() => {
      if (!state.panel.classList.contains("hidden") && state.output.querySelector(".rail-op-export-scope")) {
        render();
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  function init() {
    const system = getSystem();
    if (system !== "tr" && system !== "thsr") return;
    injectStyles();
    const inserted = insertOperationPanel(system);
    if (!inserted) return;
    const state = buildState(system, inserted.panel);
    bindOperationPanel(state, inserted.tab);
    const syncPlacement = () => placeAfterMaster(inserted.tab, inserted.panel);
    if (document.readyState === "complete") {
      setTimeout(syncPlacement, 0);
    } else {
      window.addEventListener("load", () => setTimeout(syncPlacement, 0), { once: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
