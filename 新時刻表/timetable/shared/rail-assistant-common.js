(function () {
  if (window.RailAssistantCommon) return;

  const LANG_KEY = "rail_app_lang";
  const STATION_LOCALE_CACHE_KEY = "rail_station_locale_v1";
  const STATION_LOCALE_TTL = 7 * 24 * 60 * 60 * 1000;
  const TRA_TYPE_EN = {
    新自強: "Tze-Chiang Limited Express 3000",
    普悠瑪: "Puyuma Express",
    太魯閣: "Taroko Express",
    自強號: "Tze-Chiang Limited Express",
    自強: "Tze-Chiang Limited Express",
    莒光號: "Chu-Kuang Express",
    復興號: "Fu-Hsing Semi Express",
    區間快: "Fast Local Train",
    區間車: "Local Train",
    普快車: "Ordinary Fast Train",
    柴快車: "Diesel Fast Train",
    柴油客車: "Diesel Rail Car",
    普通車: "Ordinary Train",
    加班車: "Extra Service",
    列車: "Train",
  };
  const COMMON_TIME_RE = /(?:凌晨|清晨|早上|上午|中午|下午|傍晚|晚上)?\s*(?:\d{1,2}:\d{2}|\d{1,2}\s*點(?:\s*(?:半|\d{1,2}\s*分?))?|[零〇○一二兩三四五六七八九十]{1,3}\s*點(?:\s*(?:半|[零〇○一二兩三四五六七八九十]{1,3}\s*分?))?)/g;

  let localeMaps = { tr: {}, thsr: {} };
  let localePromise = null;
  let googlePromise = null;

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function dateToStr(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function getTodayDateStr() {
    return dateToStr(new Date());
  }

  function addDays(dateStr, offset) {
    const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    base.setDate(base.getDate() + offset);
    return dateToStr(base);
  }

  function startAlignedPolling(callback, options = {}) {
    const task = typeof callback === "function" ? callback : () => {};
    const readInterval = typeof options.getIntervalMs === "function"
      ? options.getIntervalMs
      : () => Number(options.intervalMs) || 60000;
    let timer = 0;
    let stopped = false;
    let running = false;

    function getDelayMs() {
      const intervalMs = Math.max(1000, Number(readInterval()) || 60000);
      const now = Date.now();
      const remainder = now % intervalMs;
      return remainder === 0 ? intervalMs : (intervalMs - remainder);
    }

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
    }

    function scheduleNext() {
      if (stopped) return;
      clearTimer();
      timer = window.setTimeout(run, getDelayMs());
    }

    async function run() {
      if (stopped || running) {
        scheduleNext();
        return;
      }
      running = true;
      try {
        await task();
      } catch (error) {
        console.warn("aligned polling failed", error);
      } finally {
        running = false;
        scheduleNext();
      }
    }

    scheduleNext();

    return {
      run,
      stop() {
        stopped = true;
        clearTimer();
      },
      restart() {
        stopped = false;
        scheduleNext();
      },
    };
  }

  function nextAnimationFrame() {
    return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
  }

  async function preserveViewport(task, options = {}) {
    const runTask = typeof task === "function" ? task : () => task;
    const shouldRestoreFocus = options.restoreFocus !== false;
    const docEl = document.documentElement;
    const body = document.body;
    const scrollEl = document.scrollingElement || docEl || body;
    const beforeX = window.pageXOffset ?? scrollEl?.scrollLeft ?? 0;
    const beforeY = window.pageYOffset ?? scrollEl?.scrollTop ?? 0;
    const activeEl = shouldRestoreFocus ? document.activeElement : null;
    const selection =
      activeEl &&
      typeof activeEl.selectionStart === "number" &&
      typeof activeEl.selectionEnd === "number"
        ? { start: activeEl.selectionStart, end: activeEl.selectionEnd }
        : null;
    const prevDocScrollBehavior = docEl?.style?.scrollBehavior || "";
    const prevBodyScrollBehavior = body?.style?.scrollBehavior || "";
    const prevOverflowAnchor = docEl?.style?.overflowAnchor || "";

    if (docEl?.style) {
      docEl.style.scrollBehavior = "auto";
      docEl.style.overflowAnchor = "none";
    }
    if (body?.style) {
      body.style.scrollBehavior = "auto";
    }

    try {
      const result = await runTask();
      await nextAnimationFrame();
      await nextAnimationFrame();
      const maxScrollY = Math.max(
        0,
        ((scrollEl?.scrollHeight || docEl?.scrollHeight || body?.scrollHeight || 0) - window.innerHeight)
      );
      window.scrollTo(beforeX, Math.min(beforeY, maxScrollY));

      if (activeEl && activeEl.isConnected && typeof activeEl.focus === "function") {
        try {
          activeEl.focus({ preventScroll: true });
        } catch (_) {
          try {
            activeEl.focus();
          } catch (_) {}
        }
        if (selection && typeof activeEl.setSelectionRange === "function") {
          try {
            activeEl.setSelectionRange(selection.start, selection.end);
          } catch (_) {}
        }
      }

      await nextAnimationFrame();
      window.scrollTo(beforeX, Math.min(beforeY, maxScrollY));
      return result;
    } finally {
      if (docEl?.style) {
        docEl.style.scrollBehavior = prevDocScrollBehavior;
        docEl.style.overflowAnchor = prevOverflowAnchor;
      }
      if (body?.style) {
        body.style.scrollBehavior = prevBodyScrollBehavior;
      }
    }
  }

  function normalizeText(raw) {
    return String(raw || "")
      .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248))
      .replace(/[：]/g, ":")
      .replace(/[．]/g, ".")
      .replace(/[／]/g, "/")
      .replace(/[（(]\s*時\s*[)）]/g, "點")
      .replace(/[（(]\s*分\s*[)）]/g, "分")
      .replace(/[（(](?:星期|週|礼拜)?[一二三四五六日天][)）]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeLooseStation(text) {
    return String(text || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/車站/g, "")
      .replace(/站/g, "")
      .replace(/臺/g, "台");
  }

  function parseChineseNumber(token) {
    const value = String(token || "").trim();
    if (!value) return NaN;
    if (/^\d+$/.test(value)) return Number(value);
    const digits = { "零": 0, "〇": 0, "○": 0, "一": 1, "二": 2, "兩": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
    if (value === "十") return 10;
    if (value.includes("十")) {
      const [tenText, oneText] = value.split("十");
      const tens = tenText ? digits[tenText] : 1;
      const ones = oneText ? parseChineseNumber(oneText) : 0;
      if (!Number.isFinite(tens) || !Number.isFinite(ones)) return NaN;
      return tens * 10 + ones;
    }
    if (value.split("").every((char) => Object.prototype.hasOwnProperty.call(digits, char))) {
      if (value.length > 1) return Number(value.split("").map((char) => digits[char]).join(""));
      return digits[value];
    }
    return NaN;
  }

  function normalizeDate(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return "";
    return dateToStr(date);
  }

  function formatDateLabel(dateStr, todayStr = getTodayDateStr()) {
    if (dateStr === todayStr) return "今天";
    if (dateStr === addDays(todayStr, 1)) return "明天";
    if (dateStr === addDays(todayStr, 2)) return "後天";
    return dateStr;
  }

  function parseFlexibleDate(rawText, todayFn) {
    let text = normalizeText(rawText);
    const todayStr = typeof todayFn === "function" ? todayFn() : getTodayDateStr();
    let dateStr = todayStr;
    let dateLabel = "今天";

    if (/後天/.test(text)) {
      text = text.replace(/後天/g, " ");
      dateStr = addDays(todayStr, 2);
      dateLabel = "後天";
    } else if (/明天/.test(text)) {
      text = text.replace(/明天/g, " ");
      dateStr = addDays(todayStr, 1);
      dateLabel = "明天";
    } else if (/今天|今日/.test(text)) {
      text = text.replace(/今天|今日/g, " ");
      dateStr = todayStr;
      dateLabel = "今天";
    } else {
      const ymd = text.match(/(20\d{2})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})日?/);
      const mdSlash = ymd ? null : text.match(/(^|[^\d])(\d{1,2})\/(\d{1,2})(?!\d)/);
      const mdDash = ymd || mdSlash ? null : text.match(/(^|[^\d])(\d{1,2})-(\d{1,2})(?!\d)/);
      const mdDot = ymd || mdSlash || mdDash ? null : text.match(/(^|[^\d])(\d{1,2})\.(\d{1,2})(?!\d)/);
      const mdZh = ymd || mdSlash || mdDash || mdDot
        ? null
        : text.match(/([0-9零〇○一二兩三四五六七八九十]{1,3})月([0-9零〇○一二兩三四五六七八九十]{1,3})日?/);
      const match = ymd || mdSlash || mdDash || mdDot || mdZh;
      if (match) {
        const year = ymd ? match[1] : new Date(`${todayStr}T00:00:00`).getFullYear();
        const monthRaw = ymd ? match[2] : mdZh ? match[1] : match[2];
        const dayRaw = ymd ? match[3] : mdZh ? match[2] : match[3];
        const month = parseChineseNumber(monthRaw);
        const day = parseChineseNumber(dayRaw);
        const parsed = normalizeDate(year, month, day);
        if (parsed) {
          text = text.replace(match[0], " ");
          dateStr = parsed;
          dateLabel = formatDateLabel(parsed, todayStr);
        }
      }
    }

    return {
      dateStr,
      dateLabel,
      cleanedText: text.replace(/\s+/g, " ").trim(),
    };
  }

  function parseTimeExpression(expression) {
    let text = normalizeText(expression);
    if (!text) return null;

    let meridiem = "";
    const meridiemMatch = text.match(/^(凌晨|清晨|早上|上午|中午|下午|傍晚|晚上)/);
    if (meridiemMatch) {
      meridiem = meridiemMatch[1];
      text = text.replace(meridiemMatch[0], "").trim();
    }

    let hour = NaN;
    let minute = 0;
    if (/^\d{1,2}:\d{2}$/.test(text)) {
      const [hourText, minuteText] = text.split(":");
      hour = Number(hourText);
      minute = Number(minuteText);
    } else {
      const pointMatch = text.match(/^([0-9零〇○一二兩三四五六七八九十]{1,3})點(?:\s*(半|[0-9零〇○一二兩三四五六七八九十]{1,3})\s*分?)?$/);
      if (!pointMatch) return null;
      hour = parseChineseNumber(pointMatch[1]);
      if (pointMatch[2] === "半") minute = 30;
      else if (pointMatch[2]) minute = parseChineseNumber(pointMatch[2]);
    }

    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    if (/凌晨|清晨|早上|上午/.test(meridiem)) {
      if (hour === 12) hour = 0;
    } else if (/中午/.test(meridiem)) {
      if (hour >= 1 && hour <= 11) hour += 12;
    } else if (/下午|傍晚|晚上/.test(meridiem)) {
      if (hour < 12) hour += 12;
    }

    if (hour < 0 || hour > 23) return null;
    return {
      hour,
      minute,
      totalMinutes: hour * 60 + minute,
      display: `${pad2(hour)}:${pad2(minute)}`,
    };
  }

  function parseFlexibleTimeWindow(rawText) {
    let text = normalizeText(rawText);
    let timeStartMin = null;
    let timeEndMin = null;
    let timeLabel = "";
    const matches = Array.from(text.matchAll(COMMON_TIME_RE));
    if (matches.length >= 2) {
      const first = matches[0];
      const second = matches[1];
      const between = text.slice(first.index + first[0].length, second.index);
      if (/^(?:\s|到|至|-|~|～)+$/.test(between)) {
        const start = parseTimeExpression(first[0]);
        const end = parseTimeExpression(second[0]);
        if (start && end) {
          timeStartMin = start.totalMinutes;
          timeEndMin = end.totalMinutes;
          timeLabel = `${start.display}-${end.display}`;
          text = `${text.slice(0, first.index)} ${text.slice(second.index + second[0].length)}`;
        }
      }
    }
    if (!Number.isFinite(timeStartMin) && matches.length) {
      const single = parseTimeExpression(matches[0][0]);
      if (single) {
        timeStartMin = single.totalMinutes;
        timeLabel = `${single.display} 之後`;
        text = `${text.slice(0, matches[0].index)} ${text.slice(matches[0].index + matches[0][0].length)}`;
      }
    }

    return {
      timeStartMin,
      timeEndMin,
      timeLabel,
      hasTimeFilter: Number.isFinite(timeStartMin),
      cleanedText: text.replace(/\s+/g, " ").trim(),
    };
  }

  function readLocaleCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(STATION_LOCALE_CACHE_KEY) || "null");
      if (!cached || !cached.savedAt || !cached.data) return null;
      if (Date.now() - Number(cached.savedAt || 0) > STATION_LOCALE_TTL) return null;
      return cached.data;
    } catch (_) {
      return null;
    }
  }

  function writeLocaleCache(data) {
    try {
      localStorage.setItem(STATION_LOCALE_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (_) {
    }
  }

  async function ensureToken() {
    if (window.tdxToken) return window.tdxToken;
    if (typeof window.getTdxToken === "function") {
      const token = await window.getTdxToken();
      if (token) return token;
    }
    if (typeof window.getAccessToken === "function") {
      const token = await window.getAccessToken();
      if (token) return token;
    }
    return window.tdxToken || "";
  }

  async function ensureStationLocaleData(force = false) {
    if (!force && Object.keys(localeMaps.tr || {}).length && Object.keys(localeMaps.thsr || {}).length) return localeMaps;
    if (!force) {
      const cached = readLocaleCache();
      if (cached) {
        localeMaps = cached;
        return localeMaps;
      }
    }
    if (localePromise && !force) return localePromise;
    localePromise = (async () => {
      const token = await ensureToken();
      if (!token) return localeMaps;
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [trResponse, thsrResponse] = await Promise.all([
          fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Station?%24format=JSON", { headers }),
          fetch("https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/Station?%24format=JSON", { headers }),
        ]);
        const [trData, thsrData] = await Promise.all([trResponse.json(), thsrResponse.json()]);
        localeMaps = {
          tr: Object.fromEntries((trData.Stations || []).map((station) => [
            normalizeLooseStation(station?.StationName?.Zh_tw || ""),
            station?.StationName?.En || station?.StationName?.Zh_tw || "",
          ]).filter((item) => item[0] && item[1])),
          thsr: Object.fromEntries((Array.isArray(thsrData) ? thsrData : []).map((station) => [
            normalizeLooseStation(station?.StationName?.Zh_tw || ""),
            station?.StationName?.En || station?.StationName?.Zh_tw || "",
          ]).filter((item) => item[0] && item[1])),
        };
        writeLocaleCache(localeMaps);
      } catch (_) {
      }
      return localeMaps;
    })().finally(() => {
      localePromise = null;
    });
    return localePromise;
  }

  function translateStationName(name, sys, lang = getLang()) {
    if (lang !== "en") return String(name || "");
    const normalized = normalizeLooseStation(name);
    if (!normalized) return String(name || "");
    if (sys && localeMaps[sys] && localeMaps[sys][normalized]) return localeMaps[sys][normalized];
    return localeMaps.tr[normalized] || localeMaps.thsr[normalized] || String(name || "");
  }

  function translateTraType(typeName, lang = getLang()) {
    const value = String(typeName || "").trim();
    if (lang !== "en") return value;
    return TRA_TYPE_EN[value] || value;
  }

  function getLang() {
    return localStorage.getItem(LANG_KEY) || localStorage.getItem("lang") || "zh";
  }

  function setLang(lang) {
    const value = lang === "en" ? "en" : "zh";
    localStorage.setItem(LANG_KEY, value);
    localStorage.setItem("lang", value);
    document.documentElement.lang = value === "en" ? "en" : "zh-Hant";
    document.body?.setAttribute("data-rail-lang", value);
    return value;
  }

  function ensureGoogleTranslateStyle() {
    if (document.getElementById("railGoogleTranslateStyle")) return;
    const style = document.createElement("style");
    style.id = "railGoogleTranslateStyle";
    style.textContent = `
      .skiptranslate{font-size:0 !important;}
      .goog-te-banner-frame.skiptranslate{display:none !important;}
      body{top:0 !important;}
      .goog-logo-link,.goog-te-gadget span{display:none !important;}
    `;
    document.head.appendChild(style);
  }

  function ensureGoogleContainer() {
    if (document.getElementById("railGoogleTranslateElement")) return;
    const host = document.createElement("div");
    host.id = "railGoogleTranslateElement";
    host.style.display = "none";
    document.body.appendChild(host);
  }

  function waitForGoogleCombo() {
    return new Promise((resolve) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const combo = document.querySelector(".goog-te-combo");
        if (combo || Date.now() - started > 8000) {
          clearInterval(timer);
          resolve(combo || null);
        }
      }, 120);
    });
  }

  function loadGoogleTranslate() {
    if (googlePromise) return googlePromise;
    googlePromise = new Promise((resolve) => {
      ensureGoogleTranslateStyle();
      ensureGoogleContainer();
      if (window.google?.translate?.TranslateElement) {
        resolve();
        return;
      }
      window.__railGoogleTranslateInit = function () {
        try {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: "zh-TW",
              includedLanguages: "en,zh-TW",
              autoDisplay: false,
            },
            "railGoogleTranslateElement"
          );
        } catch (_) {
        }
        resolve();
      };
      const script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=__railGoogleTranslateInit";
      script.async = true;
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
    return googlePromise;
  }

  async function applyGoogleLanguage(lang) {
    if (lang === "zh") {
      const combo = document.querySelector(".goog-te-combo");
      if (combo) {
        combo.value = "";
        combo.dispatchEvent(new Event("change"));
      }
      document.cookie = "googtrans=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/";
      return;
    }
    await loadGoogleTranslate();
    const combo = await waitForGoogleCombo();
    if (!combo) return;
    combo.value = "en";
    combo.dispatchEvent(new Event("change"));
  }

  async function changeLanguage(lang) {
    const next = setLang(lang);
    await ensureStationLocaleData();
    await applyGoogleLanguage(next);
    document.querySelectorAll(".lang-switch").forEach((select) => {
      select.value = next;
    });
    window.dispatchEvent(new CustomEvent("rail:languagechange", { detail: { lang: next } }));
    return next;
  }

  function bindLangSelect(select) {
    if (!select || select.dataset.railLangBound) return;
    select.dataset.railLangBound = "1";
    select.classList.add("lang-switch");
    select.innerHTML = `
      <option value="zh">繁體中文</option>
      <option value="en">English</option>
    `;
    select.value = getLang();
    select.addEventListener("change", (event) => {
      changeLanguage(event.target.value);
    });
  }

  function shouldShowLanguageControl() {
    const path = String(location.pathname || "").replace(/\\/g, "/").toLowerCase();
    return /\/home\/(?:index\.html)?$/.test(path);
  }

  function injectLanguageControl() {
    const existingControls = Array.from(document.querySelectorAll("select.lang-switch"));
    if (!shouldShowLanguageControl()) {
      existingControls.forEach((select) => select.remove());
      document.querySelectorAll('[data-rail-lang-injected="1"]').forEach((select) => select.remove());
      return;
    }

    existingControls.forEach(bindLangSelect);
    if (existingControls.length || document.querySelector('[data-rail-lang-injected="1"]')) return;

    const host = document.querySelector(".nav-actions") || document.querySelector(".ai-nav") || document.querySelector(".header-content") || document.querySelector(".header-actions");
    if (!host) return;
    const select = document.createElement("select");
    select.setAttribute("data-rail-lang-injected", "1");
    select.style.cssText = "min-width:118px; height:36px; border-radius:12px; border:1px solid var(--border, rgba(148,163,184,0.25)); background:var(--bg-surface, rgba(255,255,255,0.12)); color:var(--text-main, #e2e8f0); padding:0 12px; font:inherit; cursor:pointer;";
    bindLangSelect(select);
    host.appendChild(select);
  }

  function init() {
    setLang(getLang());
    injectLanguageControl();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.changeLanguage = changeLanguage;
  window.RailAssistantCommon = {
    addDays,
    changeLanguage,
    dateToStr,
    ensureStationLocaleData,
    formatDateLabel,
    getLang,
    getTodayDateStr,
    normalizeLooseStation,
    parseFlexibleDate,
    parseFlexibleTimeWindow,
    preserveViewport,
    setLang,
    startAlignedPolling,
    translateStationName,
    translateTraType,
  };
})();
