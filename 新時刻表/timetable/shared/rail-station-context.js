(function () {
  const STYLE_ID = "rail-station-context-style";
  const ALERT_CACHE_KEY = "rail_station_context_alert_v1";
  const ALERT_CACHE_MS = 10 * 60 * 1000;
  const CWA_DATASTORE = "https://opendata.cwa.gov.tw/api/v1/rest/datastore";

  function readStoredAuth() {
    try {
      return localStorage.getItem("rail_cwa_auth") || "";
    } catch (_) {
      return "";
    }
  }

  const CWA_AUTH =
    window.RAIL_CWA_AUTH ||
    readStoredAuth() ||
    "CWA-037FE620-63E1-4CAB-B159-84853F6CA215";
  const ASSET_BASE = (() => {
    try {
      return document.currentScript?.src ? new URL(".", document.currentScript.src).href : "../shared/";
    } catch (_) {
      return "../shared/";
    }
  })();

  const BRANDS = {
    tra: { label: "TRA", name: "臺鐵", file: "tr.png" },
    thsr: { label: "HSR", name: "高鐵", file: "thsl.png" },
    trtc: { label: "北捷", name: "台北捷運", file: "tpe.png" },
    tymc: { label: "桃捷", name: "桃園捷運", file: "taoyuan.png" },
    tmrt: { label: "中捷", name: "台中捷運", file: "taichung.png" },
    krtc: { label: "高捷", name: "高雄捷運", file: "kao.png" },
    ntp: { label: "新北捷", name: "新北捷運", file: "ntp.png" },
  };

  const TRANSFERS_BY_CONTEXT = {
    thsr: {
      "南港": ["tra", "trtc"],
      "台北": ["tra", "trtc", "tymc"],
      "板橋": ["tra", "trtc", "ntp"],
      "桃園": ["tymc"],
      "新竹": ["tra"],
      "苗栗": ["tra"],
      "台中": ["tra", "tmrt"],
      "台南": ["tra"],
      "左營": ["tra", "krtc"],
    },
    tr: {
      "南港": ["thsr", "trtc"],
      "松山": ["trtc"],
      "台北": ["thsr", "trtc", "tymc"],
      "萬華": ["trtc"],
      "板橋": ["thsr", "trtc", "ntp"],
      "六家": ["thsr"],
      "豐富": ["thsr"],
      "松竹": ["tmrt"],
      "大慶": ["tmrt"],
      "新烏日": ["thsr", "tmrt"],
      "沙崙": ["thsr"],
      "新左營": ["thsr", "krtc"],
      "岡山": ["krtc"],
      "橋頭": ["krtc"],
      "美術館": ["krtc"],
      "鼓山": ["krtc"],
      "高雄": ["krtc"],
      "科工館": ["krtc"],
    },
  };

  const TRANSFERS_FALLBACK = {};

  const COUNTY_BY_STATION = {
    "南港": "臺北市",
    "松山": "臺北市",
    "台北": "臺北市",
    "臺北": "臺北市",
    "萬華": "臺北市",
    "板橋": "新北市",
    "淡水": "新北市",
    "桃園": "桃園市",
    "新竹": "新竹縣",
    "六家": "新竹縣",
    "苗栗": "苗栗縣",
    "豐富": "苗栗縣",
    "台中": "臺中市",
    "臺中": "臺中市",
    "新烏日": "臺中市",
    "彰化": "彰化縣",
    "雲林": "雲林縣",
    "斗六": "雲林縣",
    "嘉義": "嘉義市",
    "台南": "臺南市",
    "臺南": "臺南市",
    "沙崙": "臺南市",
    "左營": "高雄市",
    "新左營": "高雄市",
    "高雄": "高雄市",
    "美術館": "高雄市",
    "鼓山": "高雄市",
    "橋頭": "高雄市",
    "鳳山": "高雄市",
    "屏東": "屏東縣",
    "宜蘭": "宜蘭縣",
    "花蓮": "花蓮縣",
    "台東": "臺東縣",
    "臺東": "臺東縣",
  };

  const FACILITY_BY_STATION = {
    "台北": {
      exits: ["台北車站地下街", "捷運淡水信義線/板南線", "桃園機場捷運"],
      accessibility: ["站內電梯串聯各層", "無障礙廁所", "服務台可協助轉乘"],
    },
    "臺北": {
      exits: ["台北車站地下街", "捷運淡水信義線/板南線", "桃園機場捷運"],
      accessibility: ["站內電梯串聯各層", "無障礙廁所", "服務台可協助轉乘"],
    },
    "南港": {
      exits: ["高鐵/臺鐵共構大廳", "捷運南港站", "CityLink 南港"],
      accessibility: ["電梯往返月台與大廳", "無障礙坡道", "站務協助"],
    },
    "板橋": {
      exits: ["捷運板南線", "新北市政府", "客運轉運站"],
      accessibility: ["電梯與無障礙廁所", "站內轉乘動線明確"],
    },
    "台中": {
      exits: ["高鐵台中站大廳", "臺鐵新烏日站連通道", "台中捷運高鐵台中站"],
      accessibility: ["電梯往返月台與連通層", "無障礙廁所", "服務台協助"],
    },
    "臺中": {
      exits: ["車站大廳", "公車轉乘區", "計程車排班區"],
      accessibility: ["電梯往返月台與大廳", "無障礙廁所", "站務協助"],
    },
    "新烏日": {
      exits: ["高鐵台中站連通道", "台中捷運高鐵台中站", "客運轉乘區"],
      accessibility: ["無障礙連通道", "電梯", "無障礙廁所"],
    },
    "台南": {
      exits: ["高鐵台南站大廳", "臺鐵沙崙站連通道", "公車轉乘區"],
      accessibility: ["電梯往返月台與大廳", "無障礙廁所"],
    },
    "臺南": {
      exits: ["前站", "後站", "公車轉乘區"],
      accessibility: ["電梯", "無障礙廁所", "站務協助"],
    },
    "左營": {
      exits: ["高鐵/臺鐵共構大廳", "高雄捷運左營站", "公車與計程車轉乘區"],
      accessibility: ["電梯往返月台與大廳", "無障礙廁所", "服務台協助"],
    },
    "新左營": {
      exits: ["高鐵左營站連通道", "高雄捷運左營站", "公車轉乘區"],
      accessibility: ["電梯", "無障礙廁所", "無障礙連通道"],
    },
    "高雄": {
      exits: ["高雄車站大廳", "高雄捷運紅線", "公車轉乘區"],
      accessibility: ["電梯往返月台與大廳", "無障礙廁所", "服務台協助"],
    },
  };

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .rail-transfer-badges{display:inline-flex;align-items:center;justify-content:flex-start;gap:2px;flex:0 0 100%;flex-wrap:wrap;margin:2px 0 0 0;vertical-align:middle}
      .rail-transfer-logo{display:block;width:15px;height:15px;object-fit:contain;line-height:1;vertical-align:middle}
      .rail-station-weather-summary{display:inline-flex;align-items:center;gap:5px;max-width:100%;margin-left:8px;padding:4px 7px;border:1px solid color-mix(in srgb,var(--border,#cbd5e1) 82%,transparent);border-radius:8px;background:color-mix(in srgb,var(--bg-surface,#fff) 84%,transparent);color:var(--text-muted,#64748b);font-size:.76rem;font-weight:850;line-height:1.25;vertical-align:middle}
      .rail-station-weather-summary svg{width:18px;height:18px;flex:0 0 auto;overflow:visible}.rail-station-weather-summary strong{color:var(--text-main,#0f172a);font-weight:950}.rail-station-weather-summary .is-alert{color:#dc2626}.rail-station-weather-summary .is-muted{color:var(--text-muted,#64748b)}
      .rail-summary-transfer-line{display:block;margin-top:4px;line-height:1}
      .rail-summary-transfer-line .rail-transfer-badges{display:inline-flex;flex:0 0 auto}
      .rail-station-context-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.rail-station-context-card{padding:12px;border:1px solid var(--border,#dbe3ef);border-radius:8px;background:var(--bg-surface,#fff)}.rail-station-context-card span{display:block;color:var(--text-muted,#64748b);font-size:.74rem;font-weight:800}.rail-station-context-card strong{display:block;margin-top:4px;color:var(--text-main,#0f172a);font-size:.92rem;line-height:1.45}
      body.dark-mode .rail-station-weather-summary{background:rgba(15,23,42,.72);border-color:rgba(148,163,184,.22)}
      body.dark-mode .rail-station-weather-summary strong{color:#f8fafc}
      .rtq2-station-main,.modal-stop-station-main{flex-wrap:wrap}
      @media(max-width:720px){.rail-transfer-logo{width:14px;height:14px}.rail-station-weather-summary{display:flex;width:fit-content;margin:5px 0 0 0;font-size:.7rem}}
    `;
    document.head.appendChild(style);
  }

  function normalizeStationName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/臺/g, "台")
      .replace(/[()（）]/g, "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function unique(list) {
    return Array.from(new Set((list || []).filter(Boolean)));
  }

  function getPageSystem() {
    const path = String(location.pathname || "").toLowerCase();
    if (path.includes("/thsr/")) return "thsr";
    if (path.includes("/tr/")) return "tr";
    return "";
  }

  function getTransferSystems(stationName, options = {}) {
    const key = normalizeStationName(stationName);
    const context = options.system || options.context || getPageSystem();
    const byContext = context && TRANSFERS_BY_CONTEXT[context]?.[key];
    const fallback = TRANSFERS_FALLBACK[key] || TRANSFERS_FALLBACK[String(stationName || "").trim()] || [];
    return unique(byContext || fallback || []);
  }

  function renderTransferBadges(stationName, options = {}) {
    ensureStyles();
    const systems = getTransferSystems(stationName, options);
    if (!systems.length) return "";
    return `<span class="rail-transfer-badges" title="${escapeHtml(getTransferTitle(stationName, options))}">${systems.map((system) => {
      const brand = BRANDS[system];
      if (!brand) return "";
      const src = (() => {
        try {
          return new URL(brand.file, ASSET_BASE).href;
        } catch (_) {
          return `../shared/${brand.file}`;
        }
      })();
      return `<img class="rail-transfer-logo" src="${escapeHtml(src)}" alt="${escapeHtml(brand.name)}" title="${escapeHtml(brand.name)}" loading="lazy">`;
    }).join("")}</span>`;
  }

  function getTransferTitle(stationName, options = {}) {
    const names = getTransferSystems(stationName, options).map((system) => BRANDS[system]?.name).filter(Boolean);
    return names.length ? `${stationName} 可轉乘：${names.join("、")}` : "";
  }

  function getTransferInfo(stationName, options = {}) {
    const systems = getTransferSystems(stationName, options);
    return {
      station: stationName,
      systems,
      names: systems.map((system) => BRANDS[system]?.name).filter(Boolean),
      badgesHtml: renderTransferBadges(stationName, options),
      summary: systems.length ? `${stationName} 可轉乘 ${systems.map((system) => BRANDS[system]?.name).filter(Boolean).join("、")}` : `${stationName} 暫無已整理轉乘標示`,
    };
  }

  function findStationNameFromNode(node) {
    const weatherNode = node.querySelector?.("[data-stop-weather]");
    if (weatherNode?.dataset?.weatherStation) return weatherNode.dataset.weatherStation;
    const nameNode = node.querySelector?.(".rtq2-station-name,.modal-stop-station-main > span:first-child");
    return (nameNode?.textContent || node.textContent || "").trim();
  }

  function decorateTransferBadges(root = document) {
    ensureStyles();
    root.querySelectorAll?.(".rtq2-station-main,.modal-stop-station-main").forEach((node) => {
      if (node.querySelector(".rail-transfer-badges")) return;
      const station = findStationNameFromNode(node);
      const html = renderTransferBadges(station);
      if (!html) return;
      const slot = node.querySelector("[data-stop-weather]");
      const holder = document.createElement("span");
      holder.innerHTML = html;
      const badges = holder.firstElementChild;
      if (!badges) return;
      const nameNode = node.querySelector(".rtq2-station-name,.modal-stop-station-main > span:first-child");
      if (slot?.parentNode === node && nameNode?.parentNode === node && slot.previousElementSibling !== nameNode) {
        nameNode.insertAdjacentElement("afterend", slot);
      }
      if (slot?.parentNode === node) slot.insertAdjacentElement("afterend", badges);
      else if (nameNode?.parentNode === node) nameNode.insertAdjacentElement("afterend", badges);
      else node.appendChild(badges);
    });
  }

  function readJsonCache(key, maxAgeMs) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || Date.now() - Number(parsed.savedAt || 0) > maxAgeMs) return null;
      return parsed.value;
    } catch (_) {
      return null;
    }
  }

  function writeJsonCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
    } catch (_) {}
  }

  async function fetchWeatherAlerts() {
    const cached = readJsonCache(ALERT_CACHE_KEY, ALERT_CACHE_MS);
    if (cached) return cached;
    const url = new URL(`${CWA_DATASTORE}/W-C0033-003`);
    url.searchParams.set("Authorization", CWA_AUTH);
    url.searchParams.set("format", "JSON");
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`alert ${response.status}`);
    const data = await response.json();
    const list = Array.isArray(data?.records?.info) ? data.records.info : [];
    writeJsonCache(ALERT_CACHE_KEY, list);
    return list;
  }

  function normalizePlace(value) {
    return String(value || "").trim().replace(/\s+/g, "").replace(/台/g, "臺");
  }

  function getStationCounty(stationName) {
    const key = normalizeStationName(stationName);
    return COUNTY_BY_STATION[key] || COUNTY_BY_STATION[String(stationName || "").trim()] || "";
  }

  function extractAlertTitle(item) {
    const paramTitle = Array.isArray(item?.parameter)
      ? item.parameter.find((param) => param?.valueName === "alert_title")?.value
      : "";
    return String(paramTitle || item?.headline || item?.event || "天氣警特報").trim();
  }

  async function getStationAlert(stationName) {
    const county = getStationCounty(stationName);
    if (!county) return null;
    try {
      const list = await fetchWeatherAlerts();
      const now = Date.now();
      const target = normalizePlace(county);
      const matches = list.filter((item) => {
        const headline = String(item?.headline || "");
        const urgency = String(item?.urgency || "");
        const expires = item?.expires ? Date.parse(item.expires) : NaN;
        const areas = Array.isArray(item?.area) ? item.area : [];
        const hits = areas.some((area) => normalizePlace(area?.areaDesc || "") === target);
        if (!hits || headline.includes("解除") || urgency === "Past") return false;
        if (Number.isFinite(expires) && expires < now) return false;
        return true;
      });
      if (!matches.length) return null;
      const title = extractAlertTitle(matches[0]);
      return {
        title,
        count: matches.length,
        text: matches.length > 1 ? `${title} 等${matches.length}則` : title,
        county,
        raw: matches,
      };
    } catch (error) {
      console.warn("station alert failed", error);
      return null;
    }
  }

  function getQueryTargetMs() {
    const input =
      document.getElementById("mainQueryDate") ||
      document.getElementById("homeQueryDate") ||
      document.querySelector("input[type='date']");
    const dateStr = String(input?.value || "").trim();
    if (!dateStr) return Date.now();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (dateStr === todayStr) return Date.now();
    const parsed = Date.parse(`${dateStr}T12:00:00+08:00`);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  function extractTemperature(noteItems) {
    const match = (noteItems || []).join(" ").match(/(-?\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : NaN;
  }

  function describeComfort(temp) {
    if (!Number.isFinite(temp)) return "";
    if (temp >= 34) return "體感炎熱";
    if (temp >= 30) return "體感悶熱";
    if (temp >= 24) return "舒適偏暖";
    if (temp >= 18) return "舒適";
    if (temp >= 13) return "偏涼";
    return "偏冷";
  }

  function getRainText(noteItems) {
    return (noteItems || []).find((item) => /%/.test(String(item || ""))) || "";
  }

  function getTempText(noteItems) {
    return (noteItems || []).find((item) => /-?\d/.test(String(item || "")) && !/%/.test(String(item || ""))) || "";
  }

  async function getStationContext(stationName, targetMs = Date.now(), options = {}) {
    const [weather, alert] = await Promise.all([
      window.RailStopWeather?.getStopWeather
        ? window.RailStopWeather.getStopWeather(stationName, targetMs).catch(() => null)
        : Promise.resolve(null),
      getStationAlert(stationName),
    ]);
    const noteItems = Array.isArray(weather?.noteItems) ? weather.noteItems : [];
    const temp = extractTemperature(noteItems);
    return {
      station: stationName,
      targetMs,
      weather,
      alert,
      tempText: getTempText(noteItems),
      rainText: getRainText(noteItems),
      comfortText: describeComfort(temp),
      transfer: getTransferInfo(stationName, options),
      facilities: getStationFacilities(stationName),
      metro: getMetroArrivalPreview(stationName, options),
    };
  }

  function renderWeatherSummary(context) {
    const weather = context?.weather || null;
    const alert = context?.alert || null;
    const parts = [];
    if (alert?.text) parts.push(`<strong class="is-alert">${escapeHtml(alert.text)}</strong>`);
    if (context?.tempText) parts.push(`<strong>${escapeHtml(context.tempText)}</strong>`);
    if (context?.comfortText) parts.push(`<span>${escapeHtml(context.comfortText)}</span>`);
    if (context?.rainText) parts.push(`<span>${escapeHtml(context.rainText)}</span>`);
    if (!parts.length) parts.push(`<span class="is-muted">氣象更新中</span>`);
    return `${weather?.iconHtml || ""}${parts.join("")}`;
  }

  function cleanSummaryStationText(text) {
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    const arrowParts = raw.split(/→|->|到達|抵達/).map((part) => part.trim()).filter(Boolean);
    const station = (arrowParts.length ? arrowParts[arrowParts.length - 1] : raw)
      .replace(/[\d,]+.*$/g, "")
      .replace(/總班次.*$/g, "")
      .replace(/站時刻.*$/g, "")
      .replace(/時刻表.*$/g, "")
      .trim();
    return station;
  }

  function decorateSummaryWeather(root = document) {
    ensureStyles();
    root.querySelectorAll?.(".rod2-title,.rsv2-title").forEach((node) => {
      if (node.querySelector(".rail-station-weather-summary")) return;
      const station = cleanSummaryStationText(node.textContent);
      if (!station) return;
      const chip = document.createElement("span");
      chip.className = "rail-station-weather-summary";
      chip.dataset.stationWeatherSummary = "1";
      chip.textContent = "氣象讀取中";
      node.appendChild(chip);
      const transferHtml = renderTransferBadges(station);
      if (transferHtml) {
        const transferLine = document.createElement("span");
        transferLine.className = "rail-summary-transfer-line";
        transferLine.innerHTML = transferHtml;
        node.appendChild(transferLine);
      }
      getStationContext(station, getQueryTargetMs()).then((context) => {
        if (!chip.isConnected) return;
        chip.innerHTML = renderWeatherSummary(context);
        chip.title = context.alert?.text ? `${station}：${context.alert.text}` : `${station}：目前無警特報`;
      });
    });
  }

  function getStationFacilities(stationName) {
    const key = normalizeStationName(stationName);
    const direct = FACILITY_BY_STATION[key] || FACILITY_BY_STATION[String(stationName || "").trim()];
    if (direct) return direct;
    return {
      exits: ["站前出入口", "公車/計程車轉乘區", "依現場標示前往月台"],
      accessibility: ["電梯或無障礙坡道依站內標示", "可洽站務人員協助", "建議預留轉乘步行時間"],
    };
  }

  function getMetroArrivalPreview(stationName, options = {}) {
    const transfer = getTransferInfo(stationName, options);
    const metroSystems = transfer.systems.filter((system) => ["trtc", "tymc", "tmrt", "krtc", "ntp"].includes(system));
    if (!metroSystems.length) return [];
    const now = Date.now();
    return metroSystems.slice(0, 3).map((system, index) => {
      const headwaySeconds = system === "tymc" ? 900 : system === "ntp" ? 480 : 360;
      const seed = normalizeStationName(stationName).length * 37 + index * 83;
      const remainSeconds = headwaySeconds - ((Math.floor(now / 1000) + seed) % headwaySeconds);
      return {
        system,
        name: BRANDS[system]?.name || system,
        label: BRANDS[system]?.label || system,
        remainSeconds,
        note: "依目前時間推估，實際進站請以各捷運公司公告為準",
      };
    });
  }

  function decorate(root = document) {
    decorateTransferBadges(root);
    decorateSummaryWeather(root);
  }

  let scheduled = 0;
  function scheduleDecorate(root = document) {
    if (scheduled) window.clearTimeout(scheduled);
    scheduled = window.setTimeout(() => {
      scheduled = 0;
      decorate(root);
    }, 80);
  }

  function initObserver() {
    if (document.body?.dataset?.railStationContextObserver === "1") return;
    if (document.body) document.body.dataset.railStationContextObserver = "1";
    scheduleDecorate(document);
    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((item) => item.addedNodes && item.addedNodes.length)) return;
      scheduleDecorate(document);
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  window.RailStationContext = {
    decorate,
    renderTransferBadges,
    getTransferInfo,
    getStationContext,
    renderWeatherSummary,
    getStationFacilities,
    getMetroArrivalPreview,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initObserver, { once: true });
  } else {
    initObserver();
  }
})();
