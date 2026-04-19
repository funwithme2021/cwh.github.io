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
          subtitle: "枋寮 - 臺東",
          stations: ["枋寮", "加祿", "內獅", "枋山", "古莊", "大武", "瀧溪", "金崙", "太麻里", "知本", "康樂", "臺東"],
          includeAny: ["加祿", "內獅", "枋山", "古莊", "大武", "瀧溪", "金崙", "太麻里", "知本", "康樂"],
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
    if (/[（(][^）)]*專[^）)]*[）)]/.test(text)) return text.replace(/[（(][^）)]*專[^）)]*[）)]/g, "(\u5c08\u8eca)");
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
    const baseCandidate = normalized
      .replace(/[（(].*$/, "")
      .replace(/\u5c08\u958b\u5217\u8eca/g, "")
      .trim();
    const baseNormalized = baseCandidate && baseCandidate !== normalized
      ? normalizeTraDisplayType(baseCandidate)
      : normalized;
    return TRA_TYPE_COLORS[normalized] || TRA_TYPE_COLORS[baseNormalized] || "#64748b";
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

  const TRA_CUMULATIVE_MILEAGE_SPECS = [
    {
      id: "west-main",
      stations: [
        ["基隆", 0.0], ["三坑", 1.5], ["八堵", 3.9], ["七堵", 6.2], ["百福", 8.9], ["五堵", 11.9],
        ["汐止", 13.3], ["汐科", 14.6], ["南港", 19.3], ["松山", 22.1], ["臺北", 28.5], ["萬華", 31.3],
        ["板橋", 35.7], ["浮洲", 38.1], ["樹林", 41.1], ["南樹林", 43.1], ["山佳", 45.0], ["鶯歌", 49.4],
        ["鳳鳴", 54.4], ["桃園", 57.6], ["內壢", 63.5], ["中壢", 67.5], ["埔心", 73.3], ["楊梅", 77.3],
        ["富岡", 84.1], ["新富", 85.8], ["北湖", 87.3], ["湖口", 89.8], ["新豐", 96.0], ["竹北", 100.8],
        ["北新竹", 105.2], ["新竹", 106.6], ["三姓橋", 111.4], ["香山", 114.6], ["崎頂", 120.8], ["竹南", 125.3],
        ["造橋", 130.7], ["豐富", 136.6], ["苗栗", 140.6], ["南勢", 147.2], ["銅鑼", 151.4], ["三義", 158.8],
        ["泰安", 169.7], ["后里", 172.3], ["豐原", 179.0], ["栗林", 181.6], ["潭子", 184.1], ["頭家厝", 186.0],
        ["松竹", 187.7], ["太原", 189.5], ["精武", 191.2], ["臺中", 193.1], ["五權", 195.3], ["大慶", 197.4],
        ["烏日", 200.5], ["新烏日", 201.4], ["成功", 203.8], ["彰化", 210.9], ["花壇", 217.5], ["大村", 222.1],
        ["員林", 225.6], ["永靖", 229.1], ["社頭", 232.8], ["田中", 237.1], ["二水", 242.9], ["林內", 251.0],
        ["石榴", 255.8], ["斗六", 260.6], ["斗南", 268.2], ["石龜", 272.1], ["大林", 276.7], ["民雄", 282.5],
        ["嘉北", 289.2], ["嘉義", 291.8], ["水上", 298.4], ["南靖", 301.0], ["後壁", 307.0], ["新營", 314.7],
        ["柳營", 318.0], ["林鳳營", 321.9], ["隆田", 327.4], ["拔林", 329.6], ["善化", 334.2], ["南科", 337.1],
        ["新市", 341.8], ["永康", 346.8], ["大橋", 350.5], ["臺南", 353.2], ["保安", 360.8], ["仁德", 362.2],
        ["中洲", 364.7], ["大湖", 367.6], ["路竹", 370.6], ["岡山", 378.4], ["橋頭", 382.0], ["楠梓", 386.2],
        ["新左營", 391.3], ["左營", 393.3], ["內惟", 394.4], ["美術館", 396.1], ["鼓山", 397.3], ["三塊厝", 399.0],
        ["高雄", 399.9],
      ],
    },
    {
      id: "west-sea",
      stations: [
        ["竹南", 0.0], ["談文", 4.5], ["大山", 11.3], ["後龍", 15.0], ["龍港", 18.6], ["白沙屯", 26.7],
        ["新埔", 29.8], ["通霄", 35.6], ["苑裡", 41.7], ["日南", 49.4], ["大甲", 54.1], ["臺中港", 59.3],
        ["清水", 65.3], ["沙鹿", 68.5], ["龍井", 73.1], ["大肚", 78.1], ["追分", 83.1], ["彰化", 90.3],
      ],
    },
    {
      id: "pingtung",
      stations: [
        ["高雄", 0.0], ["民族", 1.3], ["科工館", 2.4], ["正義", 4.2], ["鳳山", 5.5], ["後庄", 9.4],
        ["九曲堂", 13.6], ["六塊厝", 18.6], ["屏東", 20.9], ["歸來", 23.5], ["麟洛", 25.8], ["西勢", 28.2],
        ["竹田", 31.9], ["潮州", 35.9], ["崁頂", 40.8], ["南州", 43.2], ["鎮安", 47.0], ["林邊", 50.1],
        ["佳冬", 54.0], ["東海", 57.1], ["枋寮", 61.2],
      ],
    },
    {
      id: "south-link",
      stations: [
        ["枋寮", 0.0], ["加祿", 5.3], ["內獅", 8.8], ["枋山", 13.6], ["古莊", 28.7], ["大武", 43.8], ["瀧溪", 55.5],
        ["金崙", 63.9], ["太麻里", 74.8], ["知本", 86.5], ["康樂", 93.6], ["臺東", 98.1],
      ],
    },
    {
      id: "yilan",
      stations: [
        ["八堵", 0.0], ["暖暖", 1.6], ["四腳亭", 3.9], ["瑞芳", 8.9], ["猴硐", 13.5], ["三貂嶺", 16.0],
        ["牡丹", 19.5], ["雙溪", 22.9], ["貢寮", 28.2], ["福隆", 32.0], ["石城", 37.4], ["大里", 40.1],
        ["大溪", 44.8], ["龜山", 49.4], ["外澳", 52.9], ["頭城", 56.6], ["頂埔", 58.8], ["礁溪", 62.9],
        ["四城", 67.6], ["宜蘭", 71.3], ["二結", 77.1], ["中里", 78.3], ["羅東", 80.1], ["冬山", 85.1],
        ["新馬", 89.3], ["蘇澳新", 90.2], ["蘇澳", 93.5],
      ],
    },
    {
      id: "beihui",
      stations: [
        ["蘇澳新", 0.0], ["永樂", 5.2], ["東澳", 10.9], ["南澳", 18.9], ["武塔", 22.6], ["漢本", 35.5],
        ["和平", 39.9], ["和仁", 47.8], ["崇德", 57.8], ["新城", 63.1], ["景美", 68.4], ["北埔", 74.9],
        ["花蓮", 79.5],
      ],
    },
    {
      id: "taitung",
      stations: [
        ["花蓮", 0.0], ["吉安", 3.5], ["志學", 12.3], ["平和", 15.3], ["壽豐", 17.1], ["豐田", 19.9],
        ["林榮新光", 26.1], ["南平", 28.3], ["鳳林", 32.5], ["萬榮", 37.4], ["光復", 43.0], ["大富", 50.5],
        ["富源", 53.7], ["瑞穗", 62.8], ["三民", 72.2], ["玉里", 83.0], ["東里", 89.8], ["東竹", 95.8],
        ["富里", 101.9], ["池上", 108.7], ["海端", 114.4], ["關山", 120.9], ["瑞和", 128.4], ["瑞源", 131.1],
        ["鹿野", 136.6], ["山里", 142.7], ["臺東", 150.9],
      ],
    },
    {
      id: "pingxi",
      stations: [
        ["三貂嶺", 0.0], ["大華", 3.6], ["十分", 6.4], ["望古", 8.1], ["嶺腳", 10.2], ["平溪", 11.2], ["菁桐", 12.9],
      ],
    },
    {
      id: "deepao",
      stations: [
        ["瑞芳", 0.0], ["海科館", 4.3], ["八斗子", 4.7],
      ],
    },
    {
      id: "neiwan",
      stations: [
        ["新竹", 0.0], ["北新竹", 1.4], ["千甲", 3.6], ["新莊", 6.6], ["竹中", 7.9], ["上員", 10.6],
        ["榮華", 15.0], ["竹東", 16.6], ["橫山", 20.1], ["九讚頭", 22.1], ["合興", 24.3], ["富貴", 25.7], ["內灣", 27.9],
      ],
    },
    {
      id: "liujia",
      stations: [
        ["竹中", 0.0], ["六家", 3.1],
      ],
    },
    {
      id: "jiji",
      stations: [
        ["二水", 0.0], ["源泉", 3.0], ["濁水", 10.8], ["龍泉", 15.7], ["集集", 20.0], ["水里", 27.4], ["車埕", 29.6],
      ],
    },
    {
      id: "shalun",
      stations: [
        ["中洲", 0.0], ["長榮大學", 2.6], ["沙崙", 5.7],
      ],
    },
  ];

  function makeTraEdgeKey(startStation, endStation) {
    return `${normalizeTraStation(startStation)}>>${normalizeTraStation(endStation)}`;
  }

  function buildTraEdgeDistanceMap() {
    const map = new Map();
    const setEdge = (startStation, endStation, distanceKm) => {
      const start = normalizeTraStation(startStation);
      const end = normalizeTraStation(endStation);
      const value = Number(distanceKm);
      if (!start || !end || !Number.isFinite(value) || value <= 0) return;
      const forwardKey = makeTraEdgeKey(start, end);
      const reverseKey = makeTraEdgeKey(end, start);
      if (!map.has(forwardKey)) map.set(forwardKey, value);
      if (!map.has(reverseKey)) map.set(reverseKey, value);
    };
    TRA_CUMULATIVE_MILEAGE_SPECS.forEach((line) => {
      const stations = Array.isArray(line?.stations) ? line.stations : [];
      for (let index = 0; index < stations.length - 1; index += 1) {
        const current = stations[index] || [];
        const next = stations[index + 1] || [];
        const currentKm = Number(current[1]);
        const nextKm = Number(next[1]);
        if (!Number.isFinite(currentKm) || !Number.isFinite(nextKm)) continue;
        setEdge(current[0], next[0], Math.abs(nextKm - currentKm));
      }
    });

    const mileageLineMaps = TRA_CUMULATIVE_MILEAGE_SPECS.map((line) => {
      const stationMap = new Map();
      (Array.isArray(line?.stations) ? line.stations : []).forEach((item) => {
        const name = normalizeTraStation(item?.[0]);
        const km = Number(item?.[1]);
        if (name && Number.isFinite(km)) stationMap.set(name, km);
      });
      return stationMap;
    }).filter((stationMap) => stationMap.size);

    const getSpanDistance = (stations, leftIndex, rightIndex) => {
      const leftName = normalizeTraStation(stations?.[leftIndex]);
      const rightName = normalizeTraStation(stations?.[rightIndex]);
      if (!leftName || !rightName || leftName === rightName) return null;
      for (const stationMap of mileageLineMaps) {
        const leftKm = Number(stationMap.get(leftName));
        const rightKm = Number(stationMap.get(rightName));
        if (Number.isFinite(leftKm) && Number.isFinite(rightKm) && leftKm !== rightKm) {
          return Math.abs(rightKm - leftKm);
        }
      }
      return null;
    };

    const setAverageEdgesFromKnownSpan = (stations, missingIndex) => {
      for (let left = missingIndex; left >= 0; left -= 1) {
        for (let right = missingIndex + 1; right < stations.length; right += 1) {
          const steps = right - left;
          if (steps <= 0) continue;
          const distance = getSpanDistance(stations, left, right);
          if (!Number.isFinite(distance) || distance <= 0) continue;
          const average = distance / steps;
          for (let index = left; index < right; index += 1) {
            if (!map.has(makeTraEdgeKey(stations[index], stations[index + 1]))) {
              setEdge(stations[index], stations[index + 1], average);
            }
          }
          return true;
        }
      }
      return false;
    };

    getTraSegments().forEach((segment) => {
      const stations = Array.isArray(segment?.stations) ? segment.stations : [];
      for (let index = 0; index < stations.length - 1; index += 1) {
        if (map.has(makeTraEdgeKey(stations[index], stations[index + 1]))) continue;
        if (setAverageEdgesFromKnownSpan(stations, index)) continue;
        setEdge(stations[index], stations[index + 1], 5);
      }
    });
    return map;
  }

  const TRA_EDGE_DISTANCE_MAP = buildTraEdgeDistanceMap();

  function getTraAdjacentDistance(startStation, endStation) {
    const key = makeTraEdgeKey(startStation, endStation);
    const distance = TRA_EDGE_DISTANCE_MAP.get(key);
    return Number.isFinite(distance) ? distance : null;
  }

  function sumTraPathDistance(fullPathStations, startPathIndex, endPathIndex) {
    if (!Array.isArray(fullPathStations)) return null;
    if (!Number.isFinite(startPathIndex) || !Number.isFinite(endPathIndex)) return null;
    if (startPathIndex === endPathIndex) return 0;
    const step = endPathIndex > startPathIndex ? 1 : -1;
    let total = 0;
    for (let index = startPathIndex; index !== endPathIndex; index += step) {
      const from = fullPathStations[index];
      const to = fullPathStations[index + step];
      const distance = getTraAdjacentDistance(from, to);
      if (!Number.isFinite(distance)) return null;
      total += distance;
    }
    return total;
  }

  function getTraPathInterpolationRatio(fullPathStations, startPathIndex, endPathIndex, currentPathIndex, fallbackRatio) {
    const fallback = Number.isFinite(fallbackRatio) ? fallbackRatio : 0;
    const totalDistance = sumTraPathDistance(fullPathStations, startPathIndex, endPathIndex);
    const currentDistance = sumTraPathDistance(fullPathStations, startPathIndex, currentPathIndex);
    if (!(Number.isFinite(totalDistance) && totalDistance > 0 && Number.isFinite(currentDistance) && currentDistance >= 0)) {
      return Math.min(1, Math.max(0, fallback));
    }
    const ratio = currentDistance / totalDistance;
    return Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : Math.min(1, Math.max(0, fallback));
  }

  const TRA_ACCEL_KM_PER_MIN2_BY_TYPE = {
    "新自強": 2.52,
    "普悠瑪": 2.2,
    "太魯閣": 2.2,
    "自強號": 1.44,
    "莒光號": 1.44,
    "區間車": 2.52,
    "區間快": 2.52,
  };
  const TRA_DEFAULT_ACCEL_KM_PER_MIN2 = 1.44;
  const TRA_DECEL_KM_PER_MIN2 = 3.5;

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

  const THSR_ACCEL_KM_PER_MIN2 = 2.0;
  const THSR_DECEL_KM_PER_MIN2 = 2.7;

  function clampRatio(value, fallbackRatio) {
    const fallback = Number.isFinite(fallbackRatio) ? fallbackRatio : 0;
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
  }

  function solveCruiseSpeed(totalDistanceKm, totalMinutes, accelKmPerMin2, decelKmPerMin2, startStop, endStop) {
    if (!Number.isFinite(totalDistanceKm) || totalDistanceKm <= 0 || !Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
    if (!startStop && !endStop) return totalDistanceKm / totalMinutes;
    const coeff =
      (startStop && accelKmPerMin2 > 0 ? (1 / (2 * accelKmPerMin2)) : 0) +
      (endStop && decelKmPerMin2 > 0 ? (1 / (2 * decelKmPerMin2)) : 0);
    if (!(coeff > 0)) return totalDistanceKm / totalMinutes;
    const discriminant = (totalMinutes * totalMinutes) - (4 * coeff * totalDistanceKm);
    if (discriminant < 0) return null;
    const sqrtDisc = Math.sqrt(discriminant);
    const candidates = [
      (totalMinutes - sqrtDisc) / (2 * coeff),
      (totalMinutes + sqrtDisc) / (2 * coeff),
    ].filter((value) => Number.isFinite(value) && value > 0);
    if (!candidates.length) return null;
    const valid = candidates.filter((speed) => {
      const accelDistance = startStop && accelKmPerMin2 > 0 ? ((speed * speed) / (2 * accelKmPerMin2)) : 0;
      const decelDistance = endStop && decelKmPerMin2 > 0 ? ((speed * speed) / (2 * decelKmPerMin2)) : 0;
      return accelDistance + decelDistance <= totalDistanceKm + 1e-6;
    });
    const picked = (valid.length ? valid : candidates).sort((a, b) => a - b)[0];
    return Number.isFinite(picked) ? picked : null;
  }

  function getTimedDistanceInterpolationRatio(distanceFromStartKm, totalDistanceKm, totalMinutes, accelKmPerMin2, decelKmPerMin2, startStop, endStop, fallbackRatio) {
    const fallback = clampRatio(fallbackRatio, 0);
    if (!Number.isFinite(totalDistanceKm) || totalDistanceKm <= 0 || !Number.isFinite(distanceFromStartKm)) return fallback;
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return clampRatio(distanceFromStartKm / totalDistanceKm, fallback);
    const cruiseSpeed = solveCruiseSpeed(totalDistanceKm, totalMinutes, accelKmPerMin2, decelKmPerMin2, startStop, endStop);
    if (!Number.isFinite(cruiseSpeed) || cruiseSpeed <= 0) return clampRatio(distanceFromStartKm / totalDistanceKm, fallback);

    const accelDistanceKm = startStop && accelKmPerMin2 > 0 ? ((cruiseSpeed * cruiseSpeed) / (2 * accelKmPerMin2)) : 0;
    const accelMinutes = startStop && accelKmPerMin2 > 0 ? (cruiseSpeed / accelKmPerMin2) : 0;
    const decelDistanceKm = endStop && decelKmPerMin2 > 0 ? ((cruiseSpeed * cruiseSpeed) / (2 * decelKmPerMin2)) : 0;
    const cruiseDistanceKm = Math.max(0, totalDistanceKm - accelDistanceKm - decelDistanceKm);
    const cruiseMinutes = cruiseDistanceKm > 0 ? (cruiseDistanceKm / cruiseSpeed) : 0;
    const targetDistanceKm = Math.max(0, Math.min(totalDistanceKm, distanceFromStartKm));

    let elapsedMinutes = 0;
    if (startStop && targetDistanceKm <= accelDistanceKm + 1e-6) {
      elapsedMinutes = Math.sqrt((2 * targetDistanceKm) / accelKmPerMin2);
    } else if (targetDistanceKm <= accelDistanceKm + cruiseDistanceKm + 1e-6) {
      elapsedMinutes = accelMinutes + (Math.max(0, targetDistanceKm - accelDistanceKm) / cruiseSpeed);
    } else if (endStop && decelKmPerMin2 > 0) {
      const decelProgressKm = Math.max(0, targetDistanceKm - accelDistanceKm - cruiseDistanceKm);
      const underRoot = Math.max(0, (cruiseSpeed * cruiseSpeed) - (2 * decelKmPerMin2 * decelProgressKm));
      elapsedMinutes = accelMinutes + cruiseMinutes + ((cruiseSpeed - Math.sqrt(underRoot)) / decelKmPerMin2);
    } else {
      elapsedMinutes = totalMinutes;
    }

    return clampRatio(elapsedMinutes / totalMinutes, fallback);
  }

  function getThsrMileageInterpolationRatio(startStation, endStation, currentStation, fallbackRatio) {
    const startKm = Number(getThsrStationMileage(startStation));
    const endKm = Number(getThsrStationMileage(endStation));
    const currentKm = Number(getThsrStationMileage(currentStation));
    if (![startKm, endKm, currentKm].every(Number.isFinite)) return clampRatio(fallbackRatio, 0);
    const totalDistance = endKm - startKm;
    if (!totalDistance) return clampRatio(fallbackRatio, 0);
    return clampRatio((currentKm - startKm) / totalDistance, fallbackRatio);
  }

  function solveThsrCruiseSpeed(totalDistanceKm, totalMinutes, startStop, endStop) {
    return solveCruiseSpeed(totalDistanceKm, totalMinutes, THSR_ACCEL_KM_PER_MIN2, THSR_DECEL_KM_PER_MIN2, startStop, endStop);
  }

  function getThsrTimedInterpolationRatio(startStation, endStation, currentStation, totalMinutes, startStop, endStop, fallbackRatio) {
    const startKm = Number(getThsrStationMileage(startStation));
    const endKm = Number(getThsrStationMileage(endStation));
    const currentKm = Number(getThsrStationMileage(currentStation));
    if (![startKm, endKm, currentKm].every(Number.isFinite)) return clampRatio(fallbackRatio, 0);
    const totalDistanceKm = Math.abs(endKm - startKm);
    if (!(totalDistanceKm > 0) || !Number.isFinite(totalMinutes) || totalMinutes <= 0) return clampRatio(fallbackRatio, 0);
    return getTimedDistanceInterpolationRatio(
      Math.max(0, Math.min(totalDistanceKm, Math.abs(currentKm - startKm))),
      totalDistanceKm,
      totalMinutes,
      THSR_ACCEL_KM_PER_MIN2,
      THSR_DECEL_KM_PER_MIN2,
      startStop,
      endStop,
      getThsrMileageInterpolationRatio(startStation, endStation, currentStation, fallbackRatio)
    );
  }

  function getTraAccelerationRate(type) {
    const normalizedType = normalizeTraDisplayType(type);
    return TRA_ACCEL_KM_PER_MIN2_BY_TYPE[normalizedType] || TRA_DEFAULT_ACCEL_KM_PER_MIN2;
  }

  function getTraTimedInterpolationRatio(fullPathStations, startPathIndex, endPathIndex, currentPathIndex, totalMinutes, startStop, endStop, trainType, fallbackRatio) {
    const fallback = getTraPathInterpolationRatio(fullPathStations, startPathIndex, endPathIndex, currentPathIndex, fallbackRatio);
    const totalDistanceKm = sumTraPathDistance(fullPathStations, startPathIndex, endPathIndex);
    const distanceFromStartKm = sumTraPathDistance(fullPathStations, startPathIndex, currentPathIndex);
    if (!(Number.isFinite(totalDistanceKm) && totalDistanceKm > 0 && Number.isFinite(distanceFromStartKm) && distanceFromStartKm >= 0)) {
      return fallback;
    }
    return getTimedDistanceInterpolationRatio(
      distanceFromStartKm,
      totalDistanceKm,
      totalMinutes,
      getTraAccelerationRate(trainType),
      TRA_DECEL_KM_PER_MIN2,
      startStop,
      endStop,
      fallback
    );
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
    getTraAdjacentDistance,
    getTraPathInterpolationRatio,
    getTraTimedInterpolationRatio,
    getThsrStationOrder,
    getThsrStationMileageMap,
    getThsrStationMileage,
    getThsrMileageInterpolationRatio,
    getThsrTimedInterpolationRatio,
    findTraRoutePath,
    findThsrRoutePath,
    findRoutePath,
    matchesTraSegment,
    expandTraStopPath,
    expandThsrStopPath,
    expandStopPath,
  };
})();
