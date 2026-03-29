(function () {
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
          includeAny: ["八斗子", "海科館", "瑞芳", "猴硐", "三貂嶺", "大華", "十分", "望古", "嶺腳", "平溪", "菁桐"],
        },
        {
          id: "neiwan",
          title: "內灣線",
          subtitle: "新竹 - 內灣",
          stations: ["新竹", "北新竹", "千甲", "新莊", "竹中", "上員", "榮華", "竹東", "橫山", "九讚頭", "合興", "富貴", "內灣"],
          includeAny: ["新竹", "北新竹", "千甲", "新莊", "竹中", "上員", "榮華", "竹東", "橫山", "九讚頭", "合興", "富貴", "內灣"],
        },
        {
          id: "liujia",
          title: "六家線",
          subtitle: "新竹 - 六家",
          stations: ["新竹", "北新竹", "千甲", "新莊", "竹中", "六家"],
          includeAny: ["新竹", "北新竹", "千甲", "新莊", "竹中", "六家"],
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

  const THSR_FALLBACK_ORDER = ["南港", "台北", "板橋", "桃園", "新竹", "苗栗", "台中", "彰化", "雲林", "嘉義", "台南", "左營"];
  const THSR_FALLBACK_MILEAGE_KM = {
    "南港": -3.2,
    "臺北": 6.1,
    "板橋": 13.1,
    "桃園": 42.3,
    "新竹": 72.2,
    "苗栗": 104.9,
    "臺中": 165.7,
    "彰化": 193.9,
    "雲林": 218.5,
    "嘉義": 251.6,
    "臺南": 313.9,
    "左營": 345.2,
  };
  const TRA_TYPE_COLORS = {
    新自強: "#7c3aed",
    普悠瑪: "#db2777",
    太魯閣: "#2563eb",
    自強號: "#e11d48",
    "自強號(新)": "#b45309",
    莒光號: "#ea580c",
    復興號: "#0284c7",
    區間快: "#16a34a",
    區間車: "#475569",
    普快車: "#0f766e",
    柴快車: "#7c2d12",
    柴油客車: "#92400e",
    普通車: "#1d4ed8",
    加班車: "#0ea5e9",
  };

  function unique(list) {
    return Array.from(new Set((list || []).filter(Boolean)));
  }

  function normalizeTraStation(name) {
    return String(name || "").trim().replace(/台/g, "臺");
  }

  function normalizeThsrStation(name) {
    return String(name || "").trim().replace(/臺/g, "台");
  }

  function normalizeTraDisplayType(type) {
    const text = String(type || "").trim();
    if (!text) return "列車";
    if (/專開列車/.test(text)) return text;
    if (/自強.*3000|3000|新自強|騰雲/.test(text)) return "新自強";
    if (/普悠瑪/.test(text)) return "普悠瑪";
    if (/太魯閣/.test(text)) return "太魯閣";
    if (/莒光/.test(text)) return "莒光號";
    if (/復興/.test(text)) return "復興號";
    if (/區間快/.test(text)) return "區間快";
    if (/區間/.test(text)) return "區間車";
    if (/普快/.test(text)) return "普快車";
    if (/柴快/.test(text)) return "柴快車";
    if (/柴油客車|柴客/.test(text)) return "柴油客車";
    if (/普通車|普車/.test(text)) return "普通車";
    if (/加班/.test(text)) return "加班車";
    if (/自強/.test(text)) return "自強號";
    return text;
  }

  function getTraTypeColor(type) {
    const normalized = normalizeTraDisplayType(type);
    return TRA_TYPE_COLORS[normalized] || "#64748b";
  }

  function normalizeSegment(segment, normalize) {
    return {
      ...segment,
      stations: unique((segment.stations || []).map((name) => normalize(name))),
      includeAny: unique((segment.includeAny || []).map((name) => normalize(name))),
      excludeAny: unique((segment.excludeAny || []).map((name) => normalize(name))),
    };
  }

  function getTraSegmentGroups() {
    return TRA_SEGMENT_GROUPS.map((group) => ({
      ...group,
      segments: group.segments.map((segment) => normalizeSegment(segment, normalizeTraStation)),
    }));
  }

  function getTraSegments() {
    return getTraSegmentGroups().flatMap((group) => group.segments.map((segment) => ({ ...segment, groupId: group.id, groupTitle: group.title })));
  }

  function getTraStationCatalog() {
    return unique(getTraSegments().flatMap((segment) => segment.stations));
  }

  function getThsrStationOrder() {
    const liveOrder = Array.isArray(window.THSR_STATION_ORDER) && window.THSR_STATION_ORDER.length
      ? window.THSR_STATION_ORDER
      : THSR_FALLBACK_ORDER;
    return unique(liveOrder.map((name) => normalizeThsrStation(name)));
  }

  function buildThsrMileageMap(source) {
    const map = new Map();
    Object.entries(source || {}).forEach(([name, km]) => {
      const normalizedName = normalizeThsrStation(name);
      const value = Number(km);
      if (!normalizedName || !Number.isFinite(value)) return;
      map.set(normalizedName, value);
    });
    return map;
  }

  const THSR_FALLBACK_MILEAGE_MAP = buildThsrMileageMap(THSR_FALLBACK_MILEAGE_KM);

  function getThsrStationMileageMap() {
    const liveMap = window.THSR_STATION_MILEAGE_KM;
    if (liveMap && typeof liveMap === "object" && !Array.isArray(liveMap)) {
      const normalizedMap = buildThsrMileageMap(liveMap);
      if (normalizedMap.size) return normalizedMap;
    }
    return new Map(THSR_FALLBACK_MILEAGE_MAP);
  }

  function getThsrStationMileage(stationName) {
    const normalizedName = normalizeThsrStation(stationName);
    if (!normalizedName) return null;
    const mileage = getThsrStationMileageMap().get(normalizedName);
    return Number.isFinite(mileage) ? mileage : null;
  }

  function buildGraph(segments) {
    const graph = new Map();
    const addEdge = (from, to, segmentId) => {
      if (!graph.has(from)) graph.set(from, []);
      const list = graph.get(from);
      if (!list.some((item) => item.station === to && item.segmentId === segmentId)) {
        list.push({ station: to, segmentId });
      }
    };
    segments.forEach((segment) => {
      for (let i = 0; i < segment.stations.length - 1; i += 1) {
        const from = segment.stations[i];
        const to = segment.stations[i + 1];
        addEdge(from, to, segment.id);
        addEdge(to, from, segment.id);
      }
    });
    return graph;
  }

  const TRA_GRAPH = buildGraph(getTraSegments());
  const TRA_PATH_CACHE = new Map();

  function makeCacheKey(start, end) {
    return `${start}>>${end}`;
  }

  function bfsPath(graph, start, end) {
    if (!start || !end || !graph.has(start) || !graph.has(end)) return [];
    if (start === end) return [start];
    const key = makeCacheKey(start, end);
    if (graph === TRA_GRAPH && TRA_PATH_CACHE.has(key)) return TRA_PATH_CACHE.get(key).slice();

    const queue = [start];
    const visited = new Set([start]);
    const parent = new Map();

    while (queue.length) {
      const current = queue.shift();
      const neighbors = graph.get(current) || [];
      for (const next of neighbors) {
        if (visited.has(next.station)) continue;
        visited.add(next.station);
        parent.set(next.station, current);
        if (next.station === end) {
          const path = [end];
          let cursor = end;
          while (parent.has(cursor)) {
            cursor = parent.get(cursor);
            path.push(cursor);
          }
          path.reverse();
          if (graph === TRA_GRAPH) TRA_PATH_CACHE.set(key, path.slice());
          return path;
        }
        queue.push(next.station);
      }
    }
    return [];
  }

  function mergePaths(first, second) {
    if (!first.length) return second.slice();
    if (!second.length) return first.slice();
    return first.concat(second.slice(1));
  }

  function findTraRoutePath(startStation, endStation, pivotStation) {
    const start = normalizeTraStation(startStation);
    const end = normalizeTraStation(endStation);
    const pivot = normalizeTraStation(pivotStation);
    if (!start || !end) return [];
    if (pivot && pivot !== start && pivot !== end) {
      const first = bfsPath(TRA_GRAPH, start, pivot);
      const second = bfsPath(TRA_GRAPH, pivot, end);
      if (first.length && second.length) return mergePaths(first, second);
    }
    return bfsPath(TRA_GRAPH, start, end);
  }

  function findThsrRoutePath(startStation, endStation, pivotStation) {
    const stations = getThsrStationOrder();
    const normalize = normalizeThsrStation;
    const start = normalize(startStation);
    const end = normalize(endStation);
    const pivot = normalize(pivotStation);
    const slicePath = (from, to) => {
      let startIndex = stations.indexOf(from);
      let endIndex = stations.indexOf(to);
      if (startIndex < 0 || endIndex < 0) return [];
      if (startIndex <= endIndex) return stations.slice(startIndex, endIndex + 1);
      return stations.slice(endIndex, startIndex + 1).reverse();
    };
    if (!start || !end) return [];
    if (pivot && pivot !== start && pivot !== end) {
      const first = slicePath(start, pivot);
      const second = slicePath(pivot, end);
      if (first.length && second.length) return mergePaths(first, second);
    }
    return slicePath(start, end);
  }

  function findRoutePath(system, startStation, endStation, pivotStation) {
    return system === "tr"
      ? findTraRoutePath(startStation, endStation, pivotStation)
      : findThsrRoutePath(startStation, endStation, pivotStation);
  }

  function matchesTraSegment(entry, segment) {
    const stationSet = entry.fullPathSet || entry.stationSet || new Set((entry.stops || []).map((stop) => normalizeTraStation(stop.name || stop[0] || "")));
    if (segment.includeAny?.length && !segment.includeAny.some((name) => stationSet.has(name))) return false;
    if (segment.excludeAny?.length && segment.excludeAny.some((name) => stationSet.has(name))) return false;
    let hitCount = 0;
    for (const station of segment.stations) {
      if (stationSet.has(station)) hitCount += 1;
      if (hitCount >= 2) return true;
    }
    return false;
  }

  function expandTraStopPath(stops) {
    const names = unique((stops || []).map((stop) => normalizeTraStation(stop?.name || stop?.[0] || "")));
    if (names.length < 2) return names;
    let expanded = [];
    for (let i = 0; i < names.length - 1; i += 1) {
      const start = names[i];
      const end = names[i + 1];
      const pairPath = bfsPath(TRA_GRAPH, start, end);
      if (!pairPath.length) {
        if (!expanded.length) expanded.push(start);
        expanded.push(end);
        continue;
      }
      expanded = mergePaths(expanded, pairPath);
    }
    return unique(expanded);
  }

  function expandThsrStopPath(stops) {
    const names = unique((stops || []).map((stop) => normalizeThsrStation(stop?.name || stop?.[0] || "")));
    if (names.length < 2) return names;
    let expanded = [];
    for (let i = 0; i < names.length - 1; i += 1) {
      const pairPath = findThsrRoutePath(names[i], names[i + 1]);
      expanded = mergePaths(expanded, pairPath);
    }
    return unique(expanded);
  }

  function expandStopPath(system, stops) {
    return system === "tr" ? expandTraStopPath(stops) : expandThsrStopPath(stops);
  }

  window.RailNetwork = {
    normalizeTraStation,
    normalizeThsrStation,
    normalizeTraDisplayType,
    getTraTypeColor,
    getTraSegmentGroups,
    getTraSegments,
    getTraStationCatalog,
    getThsrStationOrder,
    getThsrStationMileageMap,
    getThsrStationMileage,
    findTraRoutePath,
    findThsrRoutePath,
    findRoutePath,
    matchesTraSegment,
    expandTraStopPath,
    expandThsrStopPath,
    expandStopPath,
  };
})();
