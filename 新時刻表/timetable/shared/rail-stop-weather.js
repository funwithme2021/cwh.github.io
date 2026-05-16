(function () {
  const STYLE_ID = "rail-stop-weather-style";
  function readStoredAuth() {
    try {
      return localStorage.getItem("rail_cwa_auth");
    } catch (_) {
      return "";
    }
  }

  const CWA_AUTH =
    window.RAIL_CWA_AUTH ||
    readStoredAuth() ||
    "CWA-037FE620-63E1-4CAB-B159-84853F6CA215";
  const CWA_DATASTORE = "https://opendata.cwa.gov.tw/api/v1/rest/datastore";
  const FORECAST_DATASET = "F-D0047-089";
  const OBSERVATION_DATASETS = ["O-A0003-001", "O-A0001-001", "O-A0002-001"];
  const FORECAST_CACHE_KEY = "rail_stop_weather_forecast_v3";
  const OBSERVATION_CACHE_KEY = "rail_stop_weather_observation_v3";
  const FORECAST_CACHE_MS = 12 * 60 * 60 * 1000;
  const OBSERVATION_CACHE_MS = 12 * 60 * 1000;
  const OBSERVATION_WINDOW_MS = 60 * 60 * 1000;
  const STORAGE_CACHE_MAX_CHARS = 1200000;
  let forecastPromise = null;
  let observationPromise = null;
  const memoryCache = new Map();
  const activeNoteNodes = new Set();
  let noteTicker = null;

  function scheduleIdle(callback, timeout = 1200) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(callback, { timeout });
      return;
    }
    window.setTimeout(callback, 0);
  }

  function waitForIdle(timeout = 1200) {
    return new Promise((resolve) => scheduleIdle(resolve, timeout));
  }

  function delay(ms = 0) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .rail-stop-weather-slot{display:inline-flex; align-items:center; align-self:center; flex:0 0 auto; min-width:0;}
      .rail-stop-weather-chip{display:inline-flex; align-items:center; justify-content:center; width:21px; height:21px; padding:0; border-radius:8px; background:transparent; line-height:1;}
      .rail-stop-weather-chip svg{display:block; width:21px; height:21px; overflow:visible;}
      .rail-stop-weather-note{display:inline-flex; align-items:center; min-width:0; color:var(--text-muted, #64748b); font-size:.74rem; font-weight:850; line-height:1.35; white-space:nowrap;}
      .rail-stop-weather-note.is-rotating{min-width:42px;}
      .modal-stop-weather-slot{display:inline-flex; align-items:center; margin-left:3px;}
      .modal-stop-weather-note{font-size:.74rem;}
      .rtq2-state .rail-stop-weather-note,
      .modal-stop-state .rail-stop-weather-note{display:inline-flex; align-items:center; justify-content:flex-start; min-height:1.35em; width:100%; color:inherit; font-size:inherit; font-weight:inherit; line-height:inherit; text-align:left;}
      .rtq2-state,
      .modal-stop-state{display:flex; align-items:center; justify-content:flex-start; min-height:100%; text-align:left;}
      .rtq2-station-main .rail-stop-weather-slot,
      .modal-stop-station-main .rail-stop-weather-slot{align-self:center;}
      body.dark-mode .rail-stop-weather-note{color:#a9bbd4;}
      body.dark-mode .rtq2-state .rail-stop-weather-note,
      body.dark-mode .modal-stop-state .rail-stop-weather-note{color:inherit;}
      @media (max-width: 720px){
        .rail-stop-weather-chip,.rail-stop-weather-chip svg{width:18px; height:18px;}
        .rail-stop-weather-note,.modal-stop-weather-note{font-size:.68rem;}
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeText(value) {
    return String(value ?? "").trim().replace(/臺/g, "台");
  }

  function normalizeKey(value) {
    return normalizeText(value).replace(/\s+/g, "");
  }

  function isMissing(value) {
    const text = normalizeText(value).toUpperCase();
    return !text || ["-", "--", "-99", "-999", "N/A", "NULL", "NONE"].includes(text);
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    return value == null ? [] : [value];
  }

  function getField(source, keys) {
    if (!source || typeof source !== "object") return null;
    for (const key of keys) {
      const candidates = [key, key.charAt(0).toLowerCase() + key.slice(1), key.toLowerCase()];
      for (const candidate of candidates) {
        if (!Object.prototype.hasOwnProperty.call(source, candidate)) continue;
        const value = source[candidate];
        if (value !== undefined && value !== null && !isMissing(value)) return value;
      }
    }
    return null;
  }

  function numeric(value) {
    const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function readJsonCache(key, maxAgeMs) {
    const memory = memoryCache.get(key);
    if (memory && Date.now() - Number(memory.ts || 0) <= maxAgeMs && Array.isArray(memory.items)) return memory.items;
    try {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (!cached || !Array.isArray(cached.items)) return null;
      if (Date.now() - Number(cached.ts || 0) > maxAgeMs) return null;
      memoryCache.set(key, { ts: Number(cached.ts || Date.now()), items: cached.items });
      return cached.items;
    } catch (_) {
      return null;
    }
  }

  function writeJsonCache(key, items) {
    const payload = { ts: Date.now(), items };
    memoryCache.set(key, payload);
    scheduleIdle(() => {
      try {
        const text = JSON.stringify(payload);
        if (text.length > STORAGE_CACHE_MAX_CHARS) return;
        localStorage.setItem(key, text);
      } catch (_) {
      }
    }, 2500);
  }

  async function fetchCwaDataset(dataset, params = {}) {
    const url = new URL(`${CWA_DATASTORE}/${dataset}`);
    url.searchParams.set("Authorization", CWA_AUTH);
    url.searchParams.set("format", "JSON");
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== "") url.searchParams.set(key, value);
    });
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`CWA ${dataset} ${response.status}`);
    return response.json();
  }

  function getCwaLocations(data) {
    const groups = [
      ...toArray(data?.records?.Locations),
      ...toArray(data?.records?.locations),
      ...toArray(data?.cwaopendata?.Dataset?.Locations),
    ];
    const result = [];
    groups.forEach((group) => {
      toArray(getField(group, ["Location"])).forEach((location) => result.push({ group, location }));
    });
    return result;
  }

  function getElementName(element) {
    return normalizeText(getField(element, ["ElementName"]) || "");
  }

  function getElementValues(timeItem) {
    return toArray(getField(timeItem, ["ElementValue"]))
      .map((value) => {
        if (value && typeof value === "object") {
          return getField(value, ["Value", "Weather", "WeatherCode", "Temperature", "ProbabilityOfPrecipitation"]);
        }
        return value;
      })
      .filter((value) => !isMissing(value));
  }

  function getElementValue(timeItem, keys, element) {
    const values = toArray(getField(timeItem, ["ElementValue"]));
    for (const value of values) {
      if (!value || typeof value !== "object") continue;
      for (const key of keys) {
        const direct = getField(value, [key]);
        if (!isMissing(direct)) return direct;
      }
    }
    const name = getElementName(element);
    const generic = getElementValues(timeItem);
    if (!generic.length) return null;
    const wants = (pattern) => keys.some((key) => pattern.test(key));
    if ((/^T$/i.test(name) || name === "溫度") && wants(/Temperature/)) return generic[0];
    if (/降雨機率|PoP/i.test(name) && wants(/ProbabilityOfPrecipitation/)) return generic[0];
    if (/天氣現象|Wx/i.test(name) && wants(/Weather/)) {
      return generic.find((value) => !/^-?\d+(?:\.\d+)?$/.test(String(value))) || generic[0];
    }
    if (/天氣現象|Wx/i.test(name) && wants(/WeatherCode/)) {
      return generic.find((value) => /^-?\d+(?:\.\d+)?$/.test(String(value))) || null;
    }
    return null;
  }

  function findElement(location, keys, namePattern) {
    return toArray(getField(location, ["WeatherElement"])).find((element) => {
      const name = getElementName(element);
      const first = toArray(getField(element, ["Time"]))[0] || null;
      return (first && getElementValue(first, keys, element) != null) || (namePattern && namePattern.test(name));
    }) || null;
  }

  function parseTimeMs(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    const ms = Date.parse(text.replace(/\//g, "-"));
    return Number.isFinite(ms) ? ms : null;
  }

  function findPeriodAt(element, targetMs) {
    const times = toArray(getField(element, ["Time"]));
    return times.find((time) => {
      const start = parseTimeMs(getField(time, ["StartTime", "DataTime", "Time"]));
      const end = parseTimeMs(getField(time, ["EndTime"]));
      if (start == null) return false;
      if (end == null) return Math.abs(start - targetMs) <= 90 * 60 * 1000;
      return targetMs >= start && targetMs < end;
    }) || times.find((time) => {
      const start = parseTimeMs(getField(time, ["StartTime", "DataTime", "Time"]));
      return start != null && Math.abs(start - targetMs) <= 3 * 60 * 60 * 1000;
    }) || null;
  }

  function getLocationLatLon(location) {
    const lat = numeric(getField(location, ["Latitude", "Lat"]));
    const lon = numeric(getField(location, ["Longitude", "Lon"]));
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  }

  function parseForecastLocation(entry) {
    const location = entry?.location || {};
    const coords = getLocationLatLon(location);
    if (!coords) return null;
    const tempElement = findElement(location, ["Temperature"], /^T$|溫度/);
    const wxElement = findElement(location, ["Weather", "WeatherCode"], /^Wx$|天氣現象/);
    const popElement = findElement(location, ["ProbabilityOfPrecipitation"], /降雨機率|PoP/);
    const makeSeries = (element, keys) => toArray(getField(element, ["Time"]))
      .map((time) => ({
        start: parseTimeMs(getField(time, ["StartTime", "DataTime", "Time"])),
        end: parseTimeMs(getField(time, ["EndTime"])),
        value: getElementValue(time, keys, element),
      }))
      .filter((item) => item.start != null && !isMissing(item.value));
    return {
      name: normalizeText(getField(location, ["LocationName"]) || ""),
      county: normalizeText(getField(entry.group, ["LocationsName"]) || ""),
      lat: coords.lat,
      lon: coords.lon,
      temp: makeSeries(tempElement, ["Temperature"]),
      wx: makeSeries(wxElement, ["Weather", "WeatherCode"]),
      pop: makeSeries(popElement, ["ProbabilityOfPrecipitation"]),
    };
  }

  async function getForecastLocations() {
    const cached = readJsonCache(FORECAST_CACHE_KEY, FORECAST_CACHE_MS);
    if (cached) return cached;
    if (!forecastPromise) {
      forecastPromise = fetchCwaDataset(FORECAST_DATASET, {
        elementName: "溫度,3小時降雨機率,天氣現象",
      }).then((data) => {
        const items = getCwaLocations(data).map(parseForecastLocation).filter(Boolean);
        writeJsonCache(FORECAST_CACHE_KEY, items);
        return items;
      }).finally(() => {
        forecastPromise = null;
      });
    }
    return forecastPromise;
  }

  function getObservationStations(data) {
    return [
      ...toArray(data?.records?.Station),
      ...toArray(data?.records?.station),
      ...toArray(data?.records?.location),
    ];
  }

  function parseObservationStation(station) {
    const geoInfo = getField(station, ["GeoInfo"]) || {};
    const coords = getLocationLatLon(geoInfo) || getLocationLatLon(station);
    if (!coords) return null;
    const weatherElement = getField(station, ["WeatherElement"]) || {};
    const now = getField(weatherElement, ["Now"]) || {};
    return {
      name: normalizeText(getField(station, ["StationName", "LocationName"]) || ""),
      lat: coords.lat,
      lon: coords.lon,
      weather: normalizeText(getField(weatherElement, ["Weather"]) || ""),
      temp: numeric(getField(weatherElement, ["AirTemperature", "Temperature"]) || getField(now, ["AirTemperature", "Temperature"])),
    };
  }

  async function getObservationLocations() {
    const cached = readJsonCache(OBSERVATION_CACHE_KEY, OBSERVATION_CACHE_MS);
    if (cached) return cached;
    if (!observationPromise) {
      observationPromise = Promise.allSettled(OBSERVATION_DATASETS.map((dataset) => fetchCwaDataset(dataset))).then((results) => {
        const items = results.flatMap((result) => {
          if (result.status !== "fulfilled") return [];
          return getObservationStations(result.value).map(parseObservationStation).filter(Boolean);
        });
        writeJsonCache(OBSERVATION_CACHE_KEY, items);
        return items;
      }).finally(() => {
        observationPromise = null;
      });
    }
    return observationPromise;
  }

  function distanceScore(a, b) {
    if (!a || !b) return Infinity;
    const lat = Number(a.lat) - Number(b.lat);
    const lon = (Number(a.lon) - Number(b.lon)) * Math.cos((((Number(a.lat) + Number(b.lat)) / 2) * Math.PI) / 180);
    return Math.hypot(lat, lon);
  }

  function nearest(items, coords) {
    return (Array.isArray(items) ? items : []).reduce((best, item) => {
      const score = distanceScore(item, coords);
      return !best || score < best.score ? { item, score } : best;
    }, null)?.item || null;
  }

  function inferSeriesEnd(series, index) {
    const items = Array.isArray(series) ? series : [];
    const current = items[index];
    if (!current || !Number.isFinite(current.start)) return null;
    if (Number.isFinite(current.end) && current.end > current.start) return current.end;
    const nextStart = Number(items[index + 1]?.start);
    if (Number.isFinite(nextStart) && nextStart > current.start) return nextStart;
    const prevStart = Number(items[index - 1]?.start);
    if (Number.isFinite(prevStart) && current.start > prevStart) {
      return current.start + (current.start - prevStart);
    }
    return current.start + 60 * 60 * 1000;
  }

  function getSeriesValue(series, targetMs) {
    const items = Array.isArray(series) ? series : [];
    if (!items.length || !Number.isFinite(targetMs)) return null;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!Number.isFinite(item?.start)) continue;
      const end = inferSeriesEnd(items, index);
      if (Number.isFinite(end) && targetMs >= item.start && targetMs < end) return item.value;
      if (!Number.isFinite(end) && targetMs === item.start) return item.value;
    }
    let sameHour = null;
    let nearest = null;
    for (const item of items) {
      if (!Number.isFinite(item?.start)) continue;
      const distance = Math.abs(item.start - targetMs);
      if (distance < 60 * 60 * 1000 && (!sameHour || distance < sameHour.distance)) {
        sameHour = { value: item.value, distance };
      }
      if (!nearest || distance < nearest.distance) nearest = { value: item.value, distance };
    }
    if (sameHour) return sameHour.value;
    return nearest && nearest.distance <= 3 * 60 * 60 * 1000 ? nearest.value : null;
  }

  function getWeatherType(text, targetMs) {
    const value = normalizeText(text);
    const hour = new Date(targetMs).getHours();
    const isNight = hour >= 18 || hour < 6;
    if (/雷/.test(value)) return isNight ? "thunder-night" : "thunder";
    if (/冰雹|雹/.test(value)) return "hail";
    if (/雪|霰|積冰|暴風雪/.test(value)) return isNight ? "snow-night" : "snow";
    if (/霧|霾|靄/.test(value)) return isNight ? "fog-night" : "fog";
    if (/雨|陣雨|豪雨|毛雨/.test(value)) {
      if (/晴/.test(value)) return isNight ? "partly-rain-night" : "partly-rain";
      if (/多雲/.test(value)) return isNight ? "cloud-rain-night" : "cloud-rain";
      if (/陰/.test(value)) return "cloud-rain";
      return isNight ? "rain-night" : "rain";
    }
    if (/陰/.test(value)) return "cloudy";
    if (/多雲|雲/.test(value)) return isNight ? "partly-night" : "partly";
    if (/晴/.test(value)) return hour >= 18 || hour < 6 ? "clear-night" : "clear";
    return hour >= 18 || hour < 6 ? "clear-night" : "partly";
  }

  function getWeatherSvg(type) {
    const rawType = String(type || "partly");
    const isNightVisual = rawType.endsWith("-night") && rawType !== "clear-night";
    const baseType = rawType === "clear-night" ? rawType : rawType.replace(/-night$/, "");
    const isDarkTheme = document.body?.classList?.contains("dark-mode");
    const palette = isDarkTheme
      ? {
          sun: "#FBBF24",
          sunStroke: "#FCD34D",
          moon: "#F8C53A",
          moonCut: "#1B2843",
          cloudDark: "#6F86A5",
          cloudMid: "#8FA8C4",
          cloudLight: "#B8CCE0",
          rain: "#60A5FA",
          storm: "#5B6F89",
          bolt: "#FBBF24",
          fog: "#AAB9C7",
          snow: "#E2F0FF",
          hail: "#D6E4F2",
        }
      : {
          sun: "#FDB813",
          sunStroke: "#F59E0B",
          moon: "#F4B000",
          moonCut: "#EEF5FF",
          cloudDark: "#8FA3BC",
          cloudMid: "#A9BCD0",
          cloudLight: "#C7D8E8",
          rain: "#3B82F6",
          storm: "#7D90A7",
          bolt: "#FBBF24",
          fog: "#94A3B8",
          snow: "#E0F2FE",
          hail: "#E2E8F0",
        };
    const moonShape = (cx, cy, r) => `
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="${palette.moon}"/>
            <circle cx="${cx + r * 0.58}" cy="${cy - r * 0.32}" r="${r * 0.95}" fill="${palette.moonCut}"/>`;
    const sunShape = (cx, cy, r) => `
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="${palette.sun}"/>
            <g stroke="${palette.sunStroke}" stroke-width="4" stroke-linecap="round">
              <path d="M${cx} ${cy - 21}v8"/><path d="M${cx - 22} ${cy}h8"/><path d="M${cx + 14} ${cy}h8"/><path d="M${cx - 16} ${cy - 16}l6 6"/><path d="M${cx + 12} ${cy + 18}l6 6"/>
            </g>`;
    const dayNightOrb = (cx, cy, r = 15) => isNightVisual ? moonShape(cx, cy, r) : sunShape(cx, cy, r);
    const nightHint = isNightVisual ? moonShape(62, 25, 12) : "";
    switch (baseType) {
      case "clear":
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
            <circle cx="48" cy="48" r="18" fill="${palette.sun}"/>
            <g stroke="${palette.sunStroke}" stroke-width="5" stroke-linecap="round">
              <path d="M48 12v10"/><path d="M48 74v10"/><path d="M12 48h10"/><path d="M74 48h10"/>
              <path d="M23 23l7 7"/><path d="M66 66l7 7"/><path d="M23 73l7-7"/><path d="M66 30l7-7"/>
            </g>
          </svg>`;
      case "clear-night":
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
${moonShape(46, 48, 20)}
          </svg>`;
      case "cloudy":
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
            <ellipse cx="50" cy="56" rx="28" ry="17" fill="${palette.cloudDark}"/>
            <circle cx="34" cy="53" r="13" fill="${palette.cloudMid}"/>
            <circle cx="54" cy="46" r="16" fill="${palette.cloudLight}"/>
            <circle cx="68" cy="55" r="12" fill="${palette.cloudMid}"/>
          </svg>`;
      case "rain":
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
${nightHint}
            <ellipse cx="49" cy="42" rx="26" ry="15" fill="${palette.cloudDark}"/>
            <circle cx="34" cy="40" r="12" fill="${palette.cloudMid}"/>
            <circle cx="54" cy="34" r="15" fill="${palette.cloudLight}"/>
            <g stroke="${palette.rain}" stroke-width="5" stroke-linecap="round">
              <path d="M34 60l-4 10"/><path d="M48 62l-4 10"/><path d="M62 60l-4 10"/>
            </g>
          </svg>`;
      case "partly-rain":
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
${dayNightOrb(58, 29, 15)}
            <ellipse cx="44" cy="50" rx="26" ry="15" fill="${palette.cloudDark}"/>
            <circle cx="29" cy="47" r="12" fill="${palette.cloudMid}"/>
            <circle cx="50" cy="41" r="15" fill="${palette.cloudLight}"/>
            <g stroke="${palette.rain}" stroke-width="4.5" stroke-linecap="round">
              <path d="M32 64l-4 9"/><path d="M48 66l-4 9"/><path d="M63 64l-4 9"/>
            </g>
          </svg>`;
      case "cloud-rain":
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
${nightHint}
            <ellipse cx="50" cy="40" rx="28" ry="16" fill="${palette.cloudDark}"/>
            <circle cx="34" cy="38" r="13" fill="${palette.cloudMid}"/>
            <circle cx="55" cy="32" r="16" fill="${palette.cloudLight}"/>
            <circle cx="69" cy="42" r="12" fill="${palette.cloudMid}"/>
            <g stroke="${palette.rain}" stroke-width="5" stroke-linecap="round">
              <path d="M30 60l-5 11"/><path d="M46 62l-5 11"/><path d="M62 60l-5 11"/><path d="M76 62l-5 11"/>
            </g>
          </svg>`;
      case "thunder":
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
${nightHint}
            <ellipse cx="49" cy="40" rx="26" ry="15" fill="${palette.storm}"/>
            <circle cx="34" cy="38" r="12" fill="${palette.cloudMid}"/>
            <circle cx="54" cy="32" r="15" fill="${palette.cloudLight}"/>
            <path d="M47 49h10l-9 16h8L40 85l6-18h-9Z" fill="${palette.bolt}"/>
            <g stroke="${palette.rain}" stroke-width="4" stroke-linecap="round">
              <path d="M28 60l-3 8"/><path d="M64 60l-3 8"/>
            </g>
          </svg>`;
      case "fog":
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
${nightHint}
            <ellipse cx="50" cy="38" rx="24" ry="14" fill="${palette.cloudMid}"/>
            <circle cx="35" cy="36" r="11" fill="${palette.cloudLight}"/>
            <circle cx="55" cy="31" r="14" fill="${isDarkTheme ? "#D6E3EE" : "#D2DCE4"}"/>
            <g stroke="${palette.fog}" stroke-width="5" stroke-linecap="round">
              <path d="M22 56h44"/><path d="M30 66h40"/><path d="M20 76h38"/>
            </g>
          </svg>`;
      case "snow":
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
${nightHint}
            <ellipse cx="49" cy="38" rx="24" ry="14" fill="${palette.cloudMid}"/>
            <circle cx="34" cy="36" r="11" fill="${palette.cloudLight}"/>
            <circle cx="55" cy="31" r="14" fill="${isDarkTheme ? "#E6F0FA" : "#DCE9F6"}"/>
            <g stroke="${palette.snow}" stroke-width="4" stroke-linecap="round">
              <path d="M32 60v10"/><path d="M27 65h10"/><path d="M29 62l6 6"/><path d="M35 62l-6 6"/>
              <path d="M56 60v10"/><path d="M51 65h10"/><path d="M53 62l6 6"/><path d="M59 62l-6 6"/>
            </g>
          </svg>`;
      case "hail":
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
            <ellipse cx="49" cy="38" rx="24" ry="14" fill="${palette.cloudDark}"/>
            <circle cx="34" cy="36" r="11" fill="${palette.cloudMid}"/>
            <circle cx="55" cy="31" r="14" fill="${palette.cloudLight}"/>
            <g fill="${palette.hail}">
              <circle cx="34" cy="65" r="5"/><circle cx="49" cy="70" r="5"/><circle cx="63" cy="64" r="5"/>
            </g>
          </svg>`;
      case "partly":
      default:
        return `
          <svg viewBox="0 0 96 96" aria-hidden="true">
${dayNightOrb(56, 30, 16)}
            <ellipse cx="43" cy="56" rx="26" ry="15" fill="${palette.cloudDark}"/>
            <circle cx="28" cy="53" r="12" fill="${palette.cloudMid}"/>
            <circle cx="49" cy="47" r="15" fill="${palette.cloudLight}"/>
          </svg>`;
    }
  }

  function resolveStationGeo(stationName) {
    const raw = normalizeText(stationName);
    const keys = [raw, raw.replace(/台/g, "臺"), raw.replace(/臺/g, "台")].filter(Boolean);
    const map = window.stationGeoMap || {};
    for (const key of keys) {
      const item = map[key];
      const lat = Number(item?.lat);
      const lon = Number(item?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon, name: item.name || key };
    }
    const list = Array.isArray(window.stationGeoList) ? window.stationGeoList : [];
    const found = list.find((item) => keys.includes(normalizeText(item?.name)));
    if (found && Number.isFinite(Number(found.lat)) && Number.isFinite(Number(found.lon))) {
      return { lat: Number(found.lat), lon: Number(found.lon), name: found.name };
    }
    for (const key of keys) {
      const item = window.RailNetwork?.getTraSupplementalStationGeo?.(key);
      const lat = Number(item?.lat);
      const lon = Number(item?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { lat, lon, name: item?.name || key };
      }
    }
    return null;
  }

  function formatTemp(value, decimals = 0) {
    const temp = numeric(value);
    if (!Number.isFinite(temp)) return "";
    const places = Math.max(0, Number(decimals) || 0);
    return `${temp.toFixed(places)}度`;
  }

  function makeForecastParts(forecastLocation, targetMs) {
    if (!forecastLocation) return { temp: null, wx: "", pop: null };
    return {
      temp: getSeriesValue(forecastLocation.temp, targetMs),
      wx: normalizeText(getSeriesValue(forecastLocation.wx, targetMs) || ""),
      pop: numeric(getSeriesValue(forecastLocation.pop, targetMs)),
    };
  }

  function startNoteTicker() {
    if (noteTicker) return;
    noteTicker = window.setInterval(() => {
      activeNoteNodes.forEach((node) => {
        if (!node?.isConnected) {
          activeNoteNodes.delete(node);
          return;
        }
        const items = Array.isArray(node._railStopWeatherItems) ? node._railStopWeatherItems : [];
        if (items.length <= 1 || node.hidden) return;
        node._railStopWeatherIndex = ((Number(node._railStopWeatherIndex) || 0) + 1) % items.length;
        node.textContent = items[node._railStopWeatherIndex];
      });
      if (!activeNoteNodes.size) {
        window.clearInterval(noteTicker);
        noteTicker = null;
      }
    }, 3000);
  }

  function setNoteItems(note, items) {
    if (!note) return;
    const baseText = normalizeText(note.dataset.weatherBaseText || note.textContent || "");
    const cleanItems = [baseText, ...(Array.isArray(items) ? items : [])]
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index);
    if (!cleanItems.length) return;
    activeNoteNodes.delete(note);
    note._railStopWeatherItems = cleanItems;
    note._railStopWeatherIndex = 0;
    note.textContent = cleanItems[0];
    note.classList.toggle("is-rotating", cleanItems.length > 1);
    note.hidden = false;
    note.closest("[data-stop-weather-note-line]")?.removeAttribute("hidden");
    if (cleanItems.length > 1) {
      activeNoteNodes.add(note);
      startNoteTicker();
    }
  }

  async function getStopWeather(stationName, targetMs) {
    const coords = resolveStationGeo(stationName);
    if (!coords || !Number.isFinite(targetMs)) return null;
    const now = Date.now();
    let obs = null;
    if (Math.abs(targetMs - now) <= OBSERVATION_WINDOW_MS) {
      try {
        obs = nearest(await getObservationLocations(), coords);
      } catch (error) {
        console.warn("stop weather observation failed", error);
      }
    }
    let forecastParts = { temp: null, wx: "", pop: null };
    try {
      forecastParts = makeForecastParts(nearest(await getForecastLocations(), coords), targetMs);
    } catch (error) {
      console.warn("stop weather forecast failed", error);
    }
    const hasObsTemp = obs && Number.isFinite(Number(obs.temp));
    const weatherText = normalizeText(obs?.weather || "") || forecastParts.wx;
    const tempText = hasObsTemp ? formatTemp(obs.temp, 1) : formatTemp(forecastParts.temp, 0);
    const rainText = Number.isFinite(forecastParts.pop) ? `雨 ${Math.round(forecastParts.pop)}%` : "";
    if (!weatherText && !tempText && !rainText) return null;
    const type = getWeatherType(weatherText, targetMs);
    return {
      iconHtml: getWeatherSvg(type),
      iconLabel: weatherText || "天氣",
      noteItems: [tempText, rainText].filter(Boolean),
      source: hasObsTemp ? "obs" : "forecast",
    };
  }

  async function runLimited(items, limit, worker) {
    let cursor = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        await worker(items[index], index);
        if (index && index % 4 === 0) await delay(0);
      }
    });
    await Promise.allSettled(runners);
  }

  async function decorate(root = document) {
    ensureStyles();
    const targets = Array.from(root.querySelectorAll("[data-stop-weather='1']"));
    if (!targets.length) return;
    await waitForIdle(900);
    const noteMap = new Map(Array.from(root.querySelectorAll("[data-stop-weather-note]"))
      .map((node) => [node.dataset.weatherKey || "", node])
      .filter(([key]) => key));
    const requestCache = new Map();
    await runLimited(targets, 3, async (target) => {
      if (!target?.isConnected) return;
      if (target.dataset.weatherPassed === "1") return;
      const station = target.dataset.weatherStation || "";
      const targetMs = Number(target.dataset.weatherTimeMs);
      if (!station || !Number.isFinite(targetMs)) return;
      const requestKey = `${station}|${Math.round(targetMs / (30 * 60 * 1000))}`;
      if (!requestCache.has(requestKey)) requestCache.set(requestKey, getStopWeather(station, targetMs));
      const weather = await requestCache.get(requestKey);
      if (!weather?.iconHtml) return;
      const key = target.dataset.weatherKey || "";
      const chip = target.querySelector("[data-stop-weather-chip]");
      const note = noteMap.get(key);
      if (chip) {
        chip.innerHTML = weather.iconHtml;
        chip.title = weather.iconLabel || "";
        chip.setAttribute("aria-label", weather.iconLabel || "天氣");
        chip.hidden = false;
      }
      setNoteItems(note, weather.noteItems);
    });
  }

  window.RailStopWeather = { decorate, getStopWeather };
})();
