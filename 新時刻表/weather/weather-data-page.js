(function () {
  const CWA_AUTH = "rdec-key-123-45678-011121314";
  const CWA_DATASTORE = "https://opendata.cwa.gov.tw/api/v1/rest/datastore";
  const TOWNSHIP_ENDPOINT = "https://api.nlsc.gov.tw/other/TownVillagePointQuery";
  const SHARED_GEO_KEY = "home_shared_geo_snapshot_v1";
  const HOME_CACHE_KEY = "home_location_weather_v15";

  const page = document.body?.dataset?.weatherPage || "latest";
  const output = document.getElementById("weatherDataContent");
  const subtitle = document.getElementById("weatherDataSubtitle");
  const refreshBtn = document.getElementById("weatherDataRefresh");

  function toArray(value) { return Array.isArray(value) ? value : (value == null ? [] : [value]); }
  function normalizeText(value) { return String(value ?? "").replace(/\s+/g, " ").replace(/台/g, "臺").trim(); }
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function parseTime(value) {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  function formatTime(value) {
    const ms = Number(value);
    if (!Number.isFinite(ms)) return "--";
    return new Date(ms).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  }
  function numeric(value) {
    const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
    const num = match ? Number(match[0]) : NaN;
    return Number.isFinite(num) ? num : null;
  }
  function getField(obj, keys) {
    if (!obj || typeof obj !== "object") return null;
    const keyList = toArray(keys).map(String);
    for (const key of keyList) if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") {
        const found = getField(value, keyList);
        if (found !== null && found !== undefined && found !== "") return found;
      }
    }
    return null;
  }
  function readJsonStorage(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; }
  }
  function normalizeCoords(raw) {
    if (!raw) return null;
    const lat = Number(raw.latitude ?? raw.lat);
    const lon = Number(raw.longitude ?? raw.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  }
  async function getCoords() {
    const shared = normalizeCoords(readJsonStorage(SHARED_GEO_KEY));
    if (!navigator.geolocation) return shared;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(normalizeCoords(pos.coords) || shared),
        () => resolve(shared),
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 8500 }
      );
    });
  }
  async function fetchTownship(coords) {
    if (!coords) return null;
    const res = await fetch(`${TOWNSHIP_ENDPOINT}/${encodeURIComponent(coords.lon)}/${encodeURIComponent(coords.lat)}/4326`);
    if (!res.ok) throw new Error(`township ${res.status}`);
    const xml = new DOMParser().parseFromString(await res.text(), "application/xml");
    const item = xml.querySelector("townVillageItem");
    return item ? {
      county: normalizeText(item.querySelector("ctyName")?.textContent || ""),
      town: normalizeText(item.querySelector("townName")?.textContent || "")
    } : null;
  }
  function distance(a, b) {
    if (!a || !b) return Infinity;
    const avg = ((a.lat + b.lat) / 2) * Math.PI / 180;
    return Math.hypot((b.lon - a.lon) * 111320 * Math.cos(avg), (b.lat - a.lat) * 111320);
  }
  function stationCoords(station) {
    const geo = getField(station, ["GeoInfo"]) || {};
    const coords = toArray(getField(geo, ["Coordinates"]));
    const wgs = coords.find((item) => /wgs84/i.test(String(item?.CoordinateName || ""))) || coords[0] || {};
    const lat = numeric(getField(wgs, ["StationLatitude", "Latitude", "Lat"]) ?? getField(station, ["StationLatitude", "Latitude", "Lat", "lat_wgs84", "lat"]));
    const lon = numeric(getField(wgs, ["StationLongitude", "Longitude", "Lon"]) ?? getField(station, ["StationLongitude", "Longitude", "Lon", "lon_wgs84", "lon"]));
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  }
  function windLevel(speed) {
    const v = Number(speed);
    if (!Number.isFinite(v)) return "";
    const levels = [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
    const index = levels.findIndex((limit) => v < limit);
    return `${index < 0 ? 12 : index}級`;
  }
  async function fetchObservation(coords) {
    const url = new URL(`${CWA_DATASTORE}/O-A0003-001`);
    url.searchParams.set("Authorization", CWA_AUTH);
    url.searchParams.set("format", "JSON");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`observation ${res.status}`);
    const data = await res.json();
    const stations = [
      ...toArray(data?.records?.Station),
      ...toArray(data?.records?.station),
      ...toArray(data?.cwaopendata?.Dataset?.Station)
    ];
    return stations.map((station) => {
      const point = stationCoords(station);
      if (!point) return null;
      const weatherElement = getField(station, ["WeatherElement"]) || {};
      const now = getField(weatherElement, ["Now"]) || {};
      const geo = getField(station, ["GeoInfo"]) || {};
      return {
        stationName: normalizeText(getField(station, ["StationName", "LocationName"]) || ""),
        county: normalizeText(getField(geo, ["CountyName"]) || getField(station, ["CountyName", "CITY"]) || ""),
        town: normalizeText(getField(geo, ["TownName"]) || getField(station, ["TownName", "TOWN"]) || ""),
        weather: normalizeText(getField(weatherElement, ["Weather"]) || getField(station, ["Weather"]) || ""),
        temp: numeric(getField(weatherElement, ["AirTemperature", "Temperature", "TEMP"])),
        humidity: numeric(getField(weatherElement, ["RelativeHumidity", "HUMD"])),
        rain: numeric(getField(now, ["Precipitation"]) ?? getField(weatherElement, ["Precipitation", "H_24R"])),
        wind: numeric(getField(weatherElement, ["WindSpeed", "WDSD"])),
        gust: numeric(getField(weatherElement, ["PeakGustSpeed", "MaxGustSpeed", "GustSpeed", "WindGust"])),
        time: getField(getField(station, ["ObsTime"]) || {}, ["DateTime"]) || getField(station, ["DateTime", "ObsTime"]) || "",
        distance: distance(coords, point)
      };
    }).filter(Boolean).sort((a, b) => a.distance - b.distance)[0] || null;
  }
  async function fetchAlerts(county) {
    const url = new URL(`${CWA_DATASTORE}/W-C0033-003`);
    url.searchParams.set("Authorization", CWA_AUTH);
    url.searchParams.set("format", "JSON");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`alerts ${res.status}`);
    const target = normalizeText(county || "");
    const now = Date.now();
    return toArray((await res.json())?.records?.info).filter((item) => {
      const headline = normalizeText(item?.headline || "");
      const areas = toArray(item?.area);
      const expires = parseTime(item?.expires);
      const hits = !target || areas.some((area) => normalizeText(area?.areaDesc || "") === target);
      return hits && !headline.includes("解除") && (!Number.isFinite(expires) || expires >= now) && String(item?.urgency || "") !== "Past";
    }).map((item) => ({
      title: normalizeText(item?.parameter?.find?.((param) => param?.valueName === "alert_title")?.value || item?.headline || item?.event || "天氣警特報"),
      event: normalizeText(item?.event || ""),
      headline: normalizeText(item?.headline || ""),
      description: normalizeText(item?.description || ""),
      instruction: normalizeText(item?.instruction || ""),
      areas: toArray(item?.area).map((area) => normalizeText(area?.areaDesc || "")).filter(Boolean),
      effective: item?.effective || item?.onset || "",
      expires: item?.expires || "",
      senderName: normalizeText(item?.senderName || "中央氣象署"),
      web: normalizeText(item?.web || ""),
      imageUri: normalizeText(item?.ReportImageURI || item?.imageUri || "")
    }));
  }
  function intensityValue(label) {
    const text = String(label || "");
    if (/7/.test(text)) return 7;
    if (/6/.test(text)) return 6;
    if (/5/.test(text)) return 5;
    if (/4/.test(text)) return 4;
    if (/3/.test(text)) return 3;
    if (/2/.test(text)) return 2;
    if (/1/.test(text)) return 1;
    return -1;
  }
  async function fetchEarthquake() {
    const url = new URL(`${CWA_DATASTORE}/E-A0015-001`);
    url.searchParams.set("Authorization", CWA_AUTH);
    url.searchParams.set("format", "JSON");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`earthquake ${res.status}`);
    const item = (await res.json())?.records?.Earthquake?.[0];
    if (!item) return null;
    const areas = toArray(item?.Intensity?.ShakingArea).map((area) => ({
      name: normalizeText(area?.CountyName || area?.AreaName || area?.StationName || area?.AreaDesc || ""),
      intensity: normalizeText(area?.AreaIntensity || area?.StationIntensity || ""),
      value: intensityValue(area?.AreaIntensity || area?.StationIntensity)
    })).filter((item) => item.name && item.intensity && !/最大震度/.test(item.name)).sort((a, b) => b.value - a.value).slice(0, 8);
    const info = item.EarthquakeInfo || {};
    return {
      report: normalizeText(item.ReportContent || info.EarthquakeLocation || ""),
      location: normalizeText(info?.Epicenter?.Location || ""),
      magnitude: numeric(info?.EarthquakeMagnitude?.MagnitudeValue),
      depth: numeric(info?.FocalDepth),
      originTime: parseTime(info.OriginTime),
      maxIntensity: areas[0]?.intensity || "",
      areas,
      reportNo: normalizeText(item.ReportNo || item.EarthquakeNo || ""),
      web: normalizeText(item.Web || ""),
      imageUri: normalizeText(item.ReportImageURI || "")
    };
  }
  function meta(items) {
    return `<div class="weather-data-meta">${items.filter((item) => item[1]).map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>`;
  }
  function card(title, body, fields = [], extra = "") {
    return `<article class="weather-data-card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body || "")}</p>${fields.length ? meta(fields) : ""}${extra}</article>`;
  }
  function renderError(error) {
    output.innerHTML = card("資料暫時無法更新", error?.message || "請稍後再試，或返回氣象專區工具首頁。");
  }
  async function renderLatest() {
    const coords = await getCoords();
    const township = await fetchTownship(coords).catch(() => null);
    const observation = coords ? await fetchObservation(coords) : null;
    const cached = readJsonStorage(HOME_CACHE_KEY);
    const place = normalizeText([township?.county, township?.town].filter(Boolean).join(" ")) || cached?.place || observation?.county || "目前位置";
    if (subtitle) subtitle.textContent = `目前位置：${place}`;
    output.innerHTML = card("目前天氣", observation?.weather || cached?.weatherObservation || "觀測更新中", [
      ["位置", place],
      ["最近測站", observation?.stationName || ""],
      ["溫度", Number.isFinite(observation?.temp) ? `${observation.temp.toFixed(1)}度` : ""],
      ["濕度", Number.isFinite(observation?.humidity) ? `${Math.round(observation.humidity)}%` : ""],
      ["風速", Number.isFinite(observation?.wind) ? `${observation.wind} m/s (${windLevel(observation.wind)})` : ""],
      ["陣風", Number.isFinite(observation?.gust) ? `${observation.gust} m/s (${windLevel(observation.gust)})` : ""],
      ["雨量", Number.isFinite(observation?.rain) ? `${observation.rain} mm` : ""],
      ["觀測時間", observation?.time ? formatTime(parseTime(observation.time)) : ""]
    ]);
  }
  async function renderAlerts() {
    const coords = await getCoords();
    const township = await fetchTownship(coords).catch(() => null);
    const county = township?.county || readJsonStorage(HOME_CACHE_KEY)?.countyName || "";
    const alerts = await fetchAlerts(county);
    if (subtitle) subtitle.textContent = county ? `目前篩選：${county}` : "目前顯示氣象署有效警特報";
    output.innerHTML = alerts.length
      ? alerts.map((alert) => card(alert.title, alert.description || alert.headline || alert.instruction, [
          ["類型", alert.event || alert.title],
          ["影響區域", alert.areas.slice(0, 8).join("、")],
          ["發布單位", alert.senderName],
          ["生效時間", alert.effective ? formatTime(parseTime(alert.effective)) : ""],
          ["有效至", alert.expires ? formatTime(parseTime(alert.expires)) : ""]
        ], `${alert.imageUri ? `<img class="weather-data-image" src="${escapeHtml(alert.imageUri)}" alt="${escapeHtml(alert.title)}">` : ""}${alert.web ? `<p><a class="weather-data-btn" href="${escapeHtml(alert.web)}" target="_blank" rel="noopener">查看完整資料</a></p>` : ""}`)).join("")
      : card("目前無警特報", county ? `${county} 目前沒有符合中的氣象警特報。` : "目前沒有符合中的氣象警特報。");
  }
  async function renderEarthquake() {
    const eq = await fetchEarthquake();
    if (!eq) {
      output.innerHTML = card("近期無顯著地震", "目前沒有可顯示的顯著有感地震報告。");
      return;
    }
    if (subtitle) subtitle.textContent = eq.originTime ? `發生時間：${formatTime(eq.originTime)}` : "中央氣象署顯著有感地震報告";
    output.innerHTML = card("近期顯著地震", eq.report || "地震報告更新中", [
      ["震央", eq.location],
      ["規模", Number.isFinite(eq.magnitude) ? `M${eq.magnitude.toFixed(1)}` : ""],
      ["深度", Number.isFinite(eq.depth) ? `${eq.depth.toFixed(1)}公里` : ""],
      ["最大震度", eq.maxIntensity],
      ["主要有感", eq.areas.map((area) => `${area.name}${area.intensity}`).join("、")],
      ["報告編號", eq.reportNo]
    ], `${eq.imageUri ? `<img class="weather-data-image" src="${escapeHtml(eq.imageUri)}" alt="地震報告圖">` : ""}${eq.web ? `<p><a class="weather-data-btn" href="${escapeHtml(eq.web)}" target="_blank" rel="noopener">查看地震報告</a></p>` : ""}`);
  }
  async function render() {
    try {
      if (refreshBtn) refreshBtn.disabled = true;
      if (page === "alerts") await renderAlerts();
      else if (page === "earthquake") await renderEarthquake();
      else await renderLatest();
    } catch (error) {
      renderError(error);
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }
  if (refreshBtn) refreshBtn.addEventListener("click", render);
  render();
})();
