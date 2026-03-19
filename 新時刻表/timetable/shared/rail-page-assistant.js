(function () {
  const STYLE_ID = "rail-page-assistant-styles";
  const RESULT_PAGE_SIZE = {
    direct: 5,
    transfer: 4,
    station: 10,
  };

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function dateToStr(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function todayDateStr() {
    return dateToStr(new Date());
  }

  function addDays(dateStr, offset) {
    const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    base.setDate(base.getDate() + offset);
    return dateToStr(base);
  }

  function timeToMinutes(clock) {
    const match = String(clock || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
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
    if (window.RailAssistantCommon?.parseFlexibleDate) {
      return window.RailAssistantCommon.parseFlexibleDate(rawText, todayDateStr);
    }
    let text = String(rawText || "").trim();
    let dateStr = todayDateStr();
    let dateLabel = "今天";

    if (/後天/.test(text)) {
      text = text.replace(/後天/g, " ");
      dateStr = addDays(todayDateStr(), 2);
      dateLabel = "後天";
    } else if (/明天/.test(text)) {
      text = text.replace(/明天/g, " ");
      dateStr = addDays(todayDateStr(), 1);
      dateLabel = "明天";
    } else if (/今天|今日/.test(text)) {
      text = text.replace(/今天|今日/g, " ");
      dateStr = todayDateStr();
      dateLabel = "今天";
    } else {
      const ymd = text.match(/(20\d{2})[\/\-年](\d{1,2})[\/\-月](\d{1,2})日?/);
      const mdSlash = ymd ? null : text.match(/(^|[^\d])(\d{1,2})\/(\d{1,2})(?!\d)/);
      const mdDash = ymd || mdSlash ? null : text.match(/(^|[^\d])(\d{1,2})-(\d{1,2})(?!\d)/);
      const mdZh = ymd || mdSlash || mdDash ? null : text.match(/(\d{1,2})月(\d{1,2})日?/);
      const match = ymd || mdSlash || mdDash || mdZh;
      if (match) {
        const year = ymd ? match[1] : new Date().getFullYear();
        const month = ymd ? match[2] : (mdZh ? match[1] : match[2]);
        const day = ymd ? match[3] : (mdZh ? match[2] : match[3]);
        const parsed = normalizeDate(year, month, day);
        if (parsed) {
          text = text.replace(match[0], " ");
          dateStr = parsed;
          dateLabel = parsed;
        }
      }
    }

    return {
      dateStr,
      dateLabel,
      cleanedText: text.replace(/\s+/g, " ").trim(),
    };
  }

  function parseTimeWindow(rawText) {
    if (window.RailAssistantCommon?.parseFlexibleTimeWindow) {
      return window.RailAssistantCommon.parseFlexibleTimeWindow(rawText);
    }
    let text = String(rawText || "").trim();
    let timeStartMin = null;
    let timeEndMin = null;
    let timeLabel = "";
    const rangeMatch = text.match(/(\d{1,2}:\d{2})\s*(?:-|~|～|到|至)\s*(\d{1,2}:\d{2})/);
    if (rangeMatch) {
      const start = timeToMinutes(rangeMatch[1]);
      const end = timeToMinutes(rangeMatch[2]);
      if (start !== null && end !== null) {
        timeStartMin = start;
        timeEndMin = end;
        timeLabel = `${rangeMatch[1]}-${rangeMatch[2]}`;
        text = text.replace(rangeMatch[0], " ");
      }
    } else {
      const singleMatch = text.match(/(^|[^\d])(\d{1,2}:\d{2})(?!\d)/);
      if (singleMatch) {
        const start = timeToMinutes(singleMatch[2]);
        if (start !== null) {
          timeStartMin = start;
          timeLabel = `${singleMatch[2]} 之後`;
          text = text.replace(singleMatch[2], " ");
        }
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

  function currentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function matchesTimeFilter(minuteValue, intent) {
    if (!Number.isFinite(intent && intent.timeStartMin)) return true;
    if (!Number.isFinite(minuteValue)) return false;
    const start = intent.timeStartMin;
    const end = Number.isFinite(intent.timeEndMin) ? intent.timeEndMin : null;
    if (end === null) return minuteValue >= start;
    if (end >= start) return minuteValue >= start && minuteValue <= end;
    return minuteValue >= start || minuteValue <= end;
  }

  function formatDurationMinutes(totalMinutes) {
    if (!Number.isFinite(totalMinutes)) return "--";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return `${minutes} 分`;
    if (!minutes) return `${hours} 小時`;
    return `${hours} 小時 ${minutes} 分`;
  }

  function formatRemainText(diff) {
    if (!Number.isFinite(diff)) return "";
    if (diff <= 0) return "已到站或即將到站";
    return formatDurationMinutes(diff);
  }

  function etaText(clock, remainText) {
    if (!clock) return "--";
    if (!remainText) return `${clock} 抵達`;
    if (remainText === "已到站或即將到站") return `${clock} 抵達｜${remainText}`;
    return `${clock} 抵達｜約還有 ${remainText}`;
  }

  function detectSystem(text) {
    if (/高鐵|thsr|hsr/i.test(text)) return "thsr";
    if (/台鐵|臺鐵|火車|TRA/i.test(text)) return "tr";
    return "";
  }

  function detectTraType(text) {
    if (/自強(?:號)?3000|騰雲座艙|3000/i.test(text)) return "新自強";
    if (/普悠瑪/i.test(text)) return "普悠瑪";
    if (/太魯閣/i.test(text)) return "太魯閣";
    if (/莒光/i.test(text)) return "莒光號";
    if (/區間快/i.test(text)) return "區間快";
    if (/區間(?:車)?/i.test(text)) return "區間車";
    if (/自強(?:號)?/i.test(text)) return "自強號";
    return "";
  }

  function normalizeTraTypeText(value) {
    if (window.RailNetwork?.normalizeTraDisplayType) {
      return window.RailNetwork.normalizeTraDisplayType(value);
    }
    return String(value || "").trim() || "列車";
  }

  function getTraTypeColor(value) {
    if (window.RailNetwork?.getTraTypeColor) {
      return window.RailNetwork.getTraTypeColor(value);
    }
    return "#64748b";
  }

  function normalizeTypeName(value) {
    return normalizeTraTypeText(value).replace(/\s+/g, "").replace(/號/g, "").replace(/臺/g, "台");
  }

  function getAssistantLang() {
    return window.RailAssistantCommon?.getLang?.() || localStorage.getItem("lang") || "zh";
  }

  function translateStationLabel(name, system) {
    return window.RailAssistantCommon?.translateStationName?.(name, system, getAssistantLang()) || String(name || "");
  }

  function renderStationLabel(name, system) {
    return `<span class="notranslate" translate="no">${escapeHtml(translateStationLabel(name, system))}</span>`;
  }

  function typeMatches(source, target) {
    if (!target) return true;
    const a = normalizeTypeName(source);
    const b = normalizeTypeName(target);
    return a.includes(b) || b.includes(a);
  }

  function renderTraTypeInline(value) {
    const type = normalizeTraTypeText(value);
    const label = window.RailAssistantCommon?.translateTraType?.(type, getAssistantLang()) || type;
    return `<span class="notranslate" translate="no" style="color:${escapeHtml(getTraTypeColor(type))};font-weight:700">${escapeHtml(label)}</span>`;
  }

  function detectDirection(text, system) {
    if (system === "tr") {
      if (/順行|偶數|南下|下行/.test(text)) return "even";
      if (/逆行|奇數|北上|上行/.test(text)) return "odd";
      return "";
    }
    if (/南下/.test(text)) return "south";
    if (/北上/.test(text)) return "north";
    return "";
  }

  function normalizeStationName(name, system) {
    let value = String(name || "").trim().replace(/台/g, "臺");
    value = value.replace(/(?:高鐵|台鐵|臺鐵|火車|車站|車次|列車)/g, "").trim();
    if (system === "thsr" && /^(新左營|高雄)$/.test(value)) value = "左營";
    return value;
  }

  function normalizeLoose(text, system) {
    return normalizeStationName(text, system)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[.,，。；、\/\\()（）【】\[\]「」『』:：]/g, "");
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function getStationNames(system) {
    const map = window.stationMap || {};
    return unique(Object.values(map).map((name) => normalizeStationName(name, system)));
  }

  function findMentionedStations(text, system) {
    const normalizedText = normalizeLoose(text, system);
    const candidates = getStationNames(system).map((name) => {
      const key = normalizeLoose(name, system);
      return { name, key, idx: normalizedText.indexOf(key) };
    }).filter((item) => item.key && item.idx >= 0);

    if (system === "thsr") {
      [
        { alias: "新左營", name: "左營" },
        { alias: "高雄", name: "左營" },
      ].forEach((item) => {
        const key = normalizeLoose(item.alias, system);
        const idx = normalizedText.indexOf(key);
        if (idx >= 0) candidates.push({ name: item.name, key, idx });
      });
    }

    const seen = new Set();
    return candidates
      .sort((a, b) => a.idx - b.idx || b.key.length - a.key.length)
      .filter((item) => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      });
  }

  function resolveStationName(raw, system) {
    const value = String(raw || "").trim();
    if (!value) return "";
    try {
      if (typeof window.extractStationNameFromInput === "function") {
        const resolved = window.extractStationNameFromInput(value);
        if (resolved) return normalizeStationName(resolved, system);
      }
    } catch (_) {}
    const normalized = normalizeStationName(value, system);
    const target = normalizeLoose(normalized, system);
    return getStationNames(system).find((name) => normalizeLoose(name, system) === target) || normalized;
  }

  function parseIntent(rawText, system) {
    const dateInfo = parseDate(rawText);
    const timeInfo = parseTimeWindow(dateInfo.cleanedText);
    const text = timeInfo.cleanedText;
    const requestedSystem = detectSystem(text);
    if (requestedSystem && requestedSystem !== system) {
      return {
        kind: "switch",
        requestedSystem,
        dateStr: dateInfo.dateStr,
      };
    }
    const stations = findMentionedStations(text, system);
    const typePreference = system === "tr" ? detectTraType(text) : "";
    const direction = detectDirection(text, system);
    const trainMatch = text.match(/(?:車次|列車|班次)?\s*(\d{1,4}[A-Z]?)(?:\s*次)?/i);
    if (trainMatch) {
      return {
        kind: "train",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        trainNoRaw: String(trainMatch[1]).toUpperCase(),
        targetRaw: stations[0] ? stations[0].name : "",
        showStops: /停靠|沿途|時間軸|經過/.test(text),
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }
    if (stations.length >= 2) {
      return {
        kind: "route",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        startRaw: stations[0].name,
        endRaw: stations[1].name,
        typePreference,
        direction,
        directOnly: /直達|不要轉乘|不轉乘|免轉乘|只看直達/.test(text),
        allowTransfer: system === "tr" && /轉乘|換車|可轉乘/.test(text),
        wantsTicket: /有票|票況|座位|訂票|導訂/.test(text),
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }
    if (stations.length >= 1) {
      return {
        kind: "station",
        dateStr: dateInfo.dateStr,
        dateLabel: dateInfo.dateLabel,
        stationRaw: stations[0].name,
        direction,
        typePreference,
        timeStartMin: timeInfo.timeStartMin,
        timeEndMin: timeInfo.timeEndMin,
        timeLabel: timeInfo.timeLabel,
        hasTimeFilter: timeInfo.hasTimeFilter,
      };
    }
    return null;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .rail-ai-panel{margin-top:16px; display:flex; flex-direction:column; gap:14px; border:1px solid color-mix(in srgb, var(--primary) 16%, var(--border)); background:
        radial-gradient(circle at top right, color-mix(in srgb, var(--primary) 14%, transparent), transparent 34%),
        linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 92%, #dbeafe 8%), var(--bg-surface)); box-shadow:0 24px 48px rgba(15,23,42,0.08);}
      .rail-ai-head{display:flex; align-items:flex-start; justify-content:space-between; gap:14px;}
      .rail-ai-head p{margin:4px 0 0; color:var(--text-muted); line-height:1.65; font-size:.94rem;}
      .rail-ai-badges{display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end;}
      .rail-ai-badge{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid color-mix(in srgb, var(--primary) 26%, var(--border)); border-radius:999px; font-size:.78rem; letter-spacing:.08em; font-weight:800; color:var(--primary); background:color-mix(in srgb, var(--primary) 9%, var(--bg-body));}
      .rail-ai-bar{display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center;}
      .rail-ai-input{width:100%; min-height:48px; border-radius:16px; border:1px solid var(--border); background:var(--bg-body); color:var(--text-main); padding:0 16px; font:inherit;}
      .rail-ai-input:focus{outline:none; border-color:var(--primary); box-shadow:0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);}
      .rail-ai-run{min-width:108px;}
      .rail-ai-chip-row{display:flex; flex-wrap:wrap; gap:10px;}
      .rail-ai-chip{border:1px solid var(--border); background:var(--bg-body); color:var(--text-muted); border-radius:999px; padding:8px 12px; font:inherit; cursor:pointer; transition:.18s ease;}
      .rail-ai-chip:hover{color:var(--text-main); border-color:color-mix(in srgb, var(--primary) 40%, var(--border)); transform:translateY(-1px);}
      .rail-ai-answer{border-top:1px solid var(--border); padding-top:14px; display:flex; flex-direction:column; gap:14px;}
      .rail-ai-empty,.rail-ai-error{padding:14px 16px; border-radius:16px; border:1px dashed var(--border); color:var(--text-muted); background:color-mix(in srgb, var(--bg-body) 84%, transparent); line-height:1.7;}
      .rail-ai-error{color:#b91c1c; border-style:solid; border-color:color-mix(in srgb, #ef4444 35%, var(--border)); background:color-mix(in srgb, #fee2e2 65%, var(--bg-body));}
      .rail-ai-title{display:flex; flex-wrap:wrap; align-items:center; gap:10px;}
      .rail-ai-title strong{font-size:1.08rem; display:flex; flex-wrap:wrap; align-items:center; gap:8px;}
      .rail-ai-meta-row{display:flex; flex-wrap:wrap; gap:8px;}
      .rail-ai-meta-pill{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; border:1px solid var(--border); background:var(--bg-body); color:var(--text-main); font-size:.82rem; font-weight:600;}
      .rail-ai-note{margin:0; color:var(--text-muted); line-height:1.7; font-size:.92rem;}
      .rail-ai-section{display:flex; flex-direction:column; gap:10px;}
      .rail-ai-section-head{display:flex; align-items:center; justify-content:space-between; gap:10px; padding:2px 2px 0;}
      .rail-ai-section-head strong{font-size:.96rem;}
      .rail-ai-section-head span{font-size:.82rem; color:var(--text-muted);}
      .rail-ai-list{display:grid; gap:10px; grid-template-columns:repeat(auto-fit,minmax(280px,1fr));}
      .rail-ai-card{border:1px solid color-mix(in srgb, var(--primary) 10%, var(--border)); border-radius:18px; background:linear-gradient(180deg, color-mix(in srgb, var(--primary) 4%, var(--bg-body)), var(--bg-body)); padding:14px 16px; display:flex; flex-direction:column; gap:10px; box-shadow:0 16px 32px rgba(15,23,42,0.06);}
      .rail-ai-card-head{display:flex; align-items:flex-start; justify-content:space-between; gap:12px;}
      .rail-ai-card-head strong{font-size:1rem;}
      .rail-ai-card-main{display:flex; flex-direction:column; gap:6px;}
      .rail-ai-line{margin:0; color:var(--text-main); line-height:1.6;}
      .rail-ai-subline{margin:0; color:var(--text-muted); line-height:1.6; font-size:.92rem;}
      .rail-ai-seat-line{display:inline-flex; flex-wrap:wrap; align-items:center; gap:8px; vertical-align:middle;}
      .rail-ai-seat-group{display:inline-flex; align-items:center; gap:6px;}
      .rail-ai-seat-label{color:var(--text-muted);}
      .rail-ai-seat-pill{display:inline-flex; align-items:center; justify-content:center; padding:2px 8px; border-radius:999px; font-size:.78rem; font-weight:800; line-height:1.35; background:rgba(148,163,184,0.16); color:#cbd5e1;}
      .rail-ai-seat-pill.ok{background:rgba(34,197,94,0.16); color:#86efac;}
      .rail-ai-seat-pill.warn{background:rgba(245,158,11,0.16); color:#fdba74;}
      .rail-ai-seat-pill.bad{background:rgba(239,68,68,0.16); color:#fda4af;}
      body.light-mode .rail-ai-seat-pill{color:#475569;}
      body.light-mode .rail-ai-seat-pill.ok{color:#166534;}
      body.light-mode .rail-ai-seat-pill.warn{color:#b45309;}
      body.light-mode .rail-ai-seat-pill.bad{color:#be123c;}
      .rail-ai-actions{display:flex; flex-wrap:wrap; gap:8px;}
      .rail-ai-btn{border:1px solid var(--border); background:var(--bg-surface); color:var(--text-main); border-radius:12px; padding:9px 12px; font:inherit; font-size:.9rem; cursor:pointer;}
      .rail-ai-btn.primary{background:var(--primary); border-color:var(--primary); color:#fff;}
      .rail-ai-pagination{display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; margin-top:4px;}
      .rail-ai-pagination-note{color:var(--text-muted); font-size:.84rem; line-height:1.6;}
      .rail-ai-pagination-actions{display:flex; flex-wrap:wrap; gap:8px;}
      .rail-ai-grid{display:grid; gap:10px; grid-template-columns:repeat(2,minmax(0,1fr));}
      .rail-ai-stat{border:1px solid var(--border); border-radius:16px; background:var(--bg-body); padding:12px 14px; display:flex; flex-direction:column; gap:6px;}
      .rail-ai-stat span{font-size:.82rem; color:var(--text-muted);}
      .rail-ai-stat strong{font-size:1rem; line-height:1.4;}
      .rail-ai-switch{display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; padding:14px 16px; border:1px solid var(--border); border-radius:18px; background:var(--bg-body);}
      @media (max-width: 860px){
        .rail-ai-head,.rail-ai-bar,.rail-ai-switch{grid-template-columns:1fr; display:flex; flex-direction:column; align-items:stretch;}
        .rail-ai-badges{justify-content:flex-start;}
      }
      @media (max-width: 640px){
        .rail-ai-grid{grid-template-columns:1fr;}
        .rail-ai-panel{gap:12px;}
        .rail-ai-input{min-height:44px; padding:0 14px;}
        .rail-ai-card{padding:12px 14px; border-radius:16px;}
        .rail-ai-chip-row{gap:8px;}
        .rail-ai-chip{padding:7px 11px; font-size:.88rem;}
      }
    `;
    document.head.appendChild(style);
  }

  function getTomorrowDate() {
    const value = new Date();
    value.setDate(value.getDate() + 1);
    return value;
  }

  function formatExampleSlashDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function formatExampleChineseDate(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function getNextHourExampleDate() {
    const value = new Date();
    value.setMinutes(0, 0, 0);
    value.setHours(value.getHours() + 1);
    return value;
  }

  function formatExampleHourClock(date) {
    return `${String(date.getHours()).padStart(2, "0")}:00`;
  }

  function formatExampleRelativeDay(date) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
    if (diffDays <= 0) return "今天";
    if (diffDays === 1) return "明天";
    return formatExampleSlashDate(date);
  }

  function buildPanelHTML(system) {
    const isTra = system === "tr";
    const tomorrow = getTomorrowDate();
    const nextHour = getNextHourExampleDate();
    const tomorrowSlash = formatExampleSlashDate(tomorrow);
    const tomorrowChinese = formatExampleChineseDate(tomorrow);
    const nextHourPrompt = `${formatExampleRelativeDay(nextHour)} ${formatExampleHourClock(nextHour)}`;
    const title = isTra ? "台鐵 AI 助手" : "高鐵 AI 助手";
    const lead = isTra
      ? "可直接輸入日期、時間、時段、起訖站、車種、轉乘、車次或車站，助手會幫你套用到頁面查詢並整理重點。"
      : "可直接輸入日期、時間、時段、起訖站、直達條件、車次或車站，助手會幫你套用到頁面查詢並整理重點。";
    const placeholder = isTra
      ? `例如：${nextHourPrompt} 台北到台中 自強號 / 明天上午 花蓮往台南 可轉乘 / 271次 台中幾點到 / ${tomorrowSlash} 板橋站有什麼車`
      : `例如：${nextHourPrompt} 台北到左營 / ${nextHourPrompt} 台中站有什麼車 / ${tomorrowChinese} 高鐵台北到左營有沒有票 / 125次 台南幾點到`;
    const chips = (isTra
      ? [
          `${nextHourPrompt} 台北到台中 自強號`,
          "明天上午 花蓮往台南 可轉乘",
          "271次 台中幾點到",
          `${tomorrowSlash} 板橋站有什麼車`,
        ]
      : [
          `${nextHourPrompt} 台北到左營`,
          `${nextHourPrompt} 台中站有什麼車`,
          "125次 台南幾點到",
          `${tomorrowChinese} 高鐵台北到左營有沒有票`,
          `${tomorrowChinese} 板橋往左營`,
        ])
      .map((item) => `<button class="rail-ai-chip" type="button" data-ai-prompt="${escapeHtml(item)}">${escapeHtml(item)}</button>`)
      .join("");

    return `
      <div class="rail-ai-head">
        <div>
          <div class="section-title">${title}</div>
          <p>${lead}</p>
        </div>
        <div class="rail-ai-badges">
          <span class="rail-ai-badge">${isTra ? "TRA COMMAND" : "THSR COMMAND"}</span>
          <span class="rail-ai-badge">日期 / 時間 / 車次</span>
        </div>
      </div>
      <div class="rail-ai-bar">
        <input id="railAssistantInput" class="rail-ai-input" type="text" placeholder="${escapeHtml(placeholder)}" />
        <button id="railAssistantRun" class="btn-primary rail-ai-run" type="button">分析</button>
      </div>
      <div class="rail-ai-chip-row">${chips}</div>
      <div id="railAssistantAnswer" class="rail-ai-answer"></div>
    `;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderEmpty(state) {
    state.renderState = null;
    state.answer.innerHTML = `
      <div class="rail-ai-empty">
        直接輸入旅程、車次或車站需求即可。支援日期、單一時間、時間區間，例如「今天 08:00 台北到台中」或「412次 台中幾點到」。
      </div>
    `;
  }

  function renderError(state, message) {
    state.renderState = null;
    state.answer.innerHTML = `<div class="rail-ai-error">${escapeHtml(message)}</div>`;
  }

  function buildMetaPills(items) {
    const html = items
      .filter(Boolean)
      .map((item) => `<span class="rail-ai-meta-pill">${escapeHtml(item)}</span>`)
      .join("");
    return html ? `<div class="rail-ai-meta-row">${html}</div>` : "";
  }

  function getResultPageSize(section) {
    const wide = typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1180px)").matches;
    const desktop = typeof window.matchMedia === "function" && window.matchMedia("(min-width: 860px)").matches;
    if (section === "direct") return wide ? 6 : (desktop ? RESULT_PAGE_SIZE.direct : 4);
    if (section === "transfer") return wide ? 5 : (desktop ? RESULT_PAGE_SIZE.transfer : 3);
    if (section === "station") return wide ? 12 : (desktop ? RESULT_PAGE_SIZE.station : 8);
    return RESULT_PAGE_SIZE[section] || 5;
  }

  function getPagedItems(items, rawOffset, pageSize) {
    const list = Array.isArray(items) ? items : [];
    const size = Math.max(1, Number(pageSize || 1));
    if (!list.length) {
      return { items: [], offset: 0, hasPrev: false, hasNext: false, start: 0, end: 0, total: 0 };
    }
    const maxOffset = Math.max(0, list.length - size);
    const offset = Math.min(Math.max(0, Number(rawOffset || 0)), maxOffset);
    const slice = list.slice(offset, offset + size);
    return {
      items: slice,
      offset,
      hasPrev: offset > 0,
      hasNext: offset + size < list.length,
      start: offset + 1,
      end: offset + slice.length,
      total: list.length,
    };
  }

  function ensureViewState(state) {
    if (!state.view) {
      state.view = {
        route: { direct: 0, transfer: 0 },
        station: 0,
      };
    }
    if (!state.view.route) state.view.route = { direct: 0, transfer: 0 };
    if (!Number.isFinite(state.view.route.direct)) state.view.route.direct = 0;
    if (!Number.isFinite(state.view.route.transfer)) state.view.route.transfer = 0;
    if (!Number.isFinite(state.view.station)) state.view.station = 0;
    return state.view;
  }

  function buildPaginationBlock(page, target, pageSize, prevLabel, nextLabel) {
    if (!page.total || (!page.hasPrev && !page.hasNext)) return "";
    return `
      <div class="rail-ai-pagination">
        <div class="rail-ai-pagination-note">目前顯示第 ${page.start}-${page.end} 筆，共 ${page.total} 筆。</div>
        <div class="rail-ai-pagination-actions">
          ${page.hasPrev ? `<button class="rail-ai-btn" type="button" data-ai-page="${target}" data-delta="-${pageSize}">${escapeHtml(prevLabel)}</button>` : ""}
          ${page.hasNext ? `<button class="rail-ai-btn primary" type="button" data-ai-page="${target}" data-delta="${pageSize}">${escapeHtml(nextLabel)}</button>` : ""}
        </div>
      </div>
    `;
  }

  function pageIsDesktopDevice() {
    if (typeof window.isDesktopDevice === "function") {
      try {
        return !!window.isDesktopDevice();
      } catch (_) {}
    }
    const ua = navigator.userAgent || "";
    const isTouchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return !isTouchMac && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }

  async function handleTraBookingAction(action) {
    if (pageIsDesktopDevice()) {
      const seatQty = typeof window.showTraSeatQuantityDialog === "function"
        ? await maybePromise(window.showTraSeatQuantityDialog(1))
        : 1;
      if (!seatQty) return;
      if (typeof window.openTraBookingWeb === "function") {
        window.openTraBookingWeb(action.trainNo, action.start, action.end, action.date, seatQty);
        return;
      }
    }

    const bookingChoice = typeof window.showTraBookingChoiceDialog === "function"
      ? await maybePromise(window.showTraBookingChoiceDialog())
      : "app";
    if (bookingChoice === "cancel") return;
    if (bookingChoice === "web") {
      const seatQty = typeof window.showTraSeatQuantityDialog === "function"
        ? await maybePromise(window.showTraSeatQuantityDialog(1))
        : 1;
      if (!seatQty) return;
      if (typeof window.openTraBookingWeb === "function") {
        window.openTraBookingWeb(action.trainNo, action.start, action.end, action.date, seatQty);
        return;
      }
    }

    await maybePromise(window.openTraBookingDeepLink?.(action.trainNo, action.start, action.end, action.date));
  }

  async function handleTHSRBookingAction(action) {
    if (typeof window.handleTHSRBookingRequest === "function") {
      await maybePromise(window.handleTHSRBookingRequest(action.trainNo, action.date, action.time, action.start, action.end));
      return;
    }
    if (pageIsDesktopDevice()) {
      window.open("https://irs.thsrc.com.tw/IMINT/?locale=tw", "_blank", "noopener");
      return;
    }
    await maybePromise(window.openTHSRBookingDeepLink?.(action.trainNo, action.date, action.time, action.start, action.end));
  }

  function bindActionButtons(state) {
    state.answer.querySelectorAll("[data-ai-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const index = Number(button.dataset.aiAction);
        const action = state.actions[index];
        if (!action) return;
        if (action.type === "tra-detail") {
          window.showTrainDetails?.(action.trainNo, action.originDate);
        } else if (action.type === "tra-book") {
          await handleTraBookingAction(action);
        } else if (action.type === "tra-transfer") {
          window.showTransferDetails?.(action.plan);
        } else if (action.type === "thsr-detail") {
          window.showTrainDetails?.(action.trainNo, action.originDate);
        } else if (action.type === "thsr-book") {
          await handleTHSRBookingAction(action);
        } else if (action.type === "switch") {
          location.href = action.href;
        }
      });
    });
  }

  function rerenderStoredState(state) {
    const renderState = state.renderState;
    if (!renderState) return;
    if (renderState.kind === "tr-route") {
      renderTraRoute(state, renderState.intent, renderState.directRows, renderState.transferRows, false);
      return;
    }
    if (renderState.kind === "thsr-route") {
      renderThsrRoute(state, renderState.intent, renderState.rows, false);
      return;
    }
    if (renderState.kind === "station") {
      renderStationAnswer(state, renderState.intent, renderState.rows, renderState.system, false);
    }
  }

  function bindPagerButtons(state) {
    state.answer.querySelectorAll("[data-ai-page]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = String(button.dataset.aiPage || "");
        const delta = Number(button.dataset.delta || 0);
        const view = ensureViewState(state);
        if (target === "route-direct") {
          view.route.direct = Math.max(0, view.route.direct + delta);
        } else if (target === "route-transfer") {
          view.route.transfer = Math.max(0, view.route.transfer + delta);
        } else if (target === "station") {
          view.station = Math.max(0, view.station + delta);
        } else {
          return;
        }
        rerenderStoredState(state);
      });
    });
  }

  function bindRenderedButtons(state) {
    bindActionButtons(state);
    bindPagerButtons(state);
  }

  function addAction(state, action) {
    state.actions.push(action);
    return state.actions.length - 1;
  }

  async function ensureDateLoaded(dateStr) {
    const dateInput = document.getElementById("mainQueryDate");
    const current = readPageValue("currentQueryDateStr");
    const baseSchedule = readPageValue("baseSchedule");
    if (dateInput) dateInput.value = dateStr;
    const needsRefresh = current !== dateStr || !baseSchedule || !Object.keys(baseSchedule).length;
    if (needsRefresh && typeof window.refreshData === "function") {
      await maybePromise(window.refreshData(dateStr));
    }
  }

  function setTraTypeFilters(scope, typePreference) {
    const ids = scope === "station"
      ? ["trainTypeChipsStation", "trainTypeChipsStationMobile"]
      : ["trainTypeChipsStartEnd", "trainTypeChipsMobile"];
    ids.forEach((id) => {
      document.querySelectorAll(`#${id} input[type="checkbox"]`).forEach((checkbox) => {
        checkbox.checked = !!typePreference && typeMatches(checkbox.value, typePreference);
      });
    });
  }

  function settleSearch(system) {
    return delay(system === "tr" ? 90 : 30);
  }

  function upcomingByIntent(items, intent, accessor, statusAccessor) {
    return (items || []).filter((item) => {
      const depMin = accessor(item);
      if (!matchesTimeFilter(depMin, intent)) return false;
      if (intent.hasTimeFilter || intent.dateStr !== todayDateStr()) return true;
      if (!Number.isFinite(depMin)) return !/已過站|已到終點/.test(String(statusAccessor(item) || ""));
      return depMin >= currentMinutes() - 1;
    });
  }

  function collectTraStationRows(station, intent) {
    const scheduleKeyList = readPageValue("scheduleKeyList") || [];
    return scheduleKeyList
      .map((item) => {
        const data = item?.data;
        if (!data) return null;
        if (intent.typePreference && !typeMatches(data["車種"], intent.typePreference)) return null;
        const arr = data["車站時間"] || [];
        const idx = arr.findIndex((stop) => stop[0] === station);
        if (idx < 0) return null;
        if (intent.direction) {
          const isEven = typeof window.isEvenTrainNo === "function" ? window.isEvenTrainNo(item.trainNo) : null;
          if (intent.direction === "even" && isEven !== true) return null;
          if (intent.direction === "odd" && isEven !== false) return null;
        }
        const dep = window.splitArrDep?.(arr[idx])?.dep || "--";
        const abs = window.buildAbsMinutes?.(arr);
        const absMin = abs?.[idx]?.abs;
        const stopDate = Number.isFinite(absMin) ? window.getStopDateStr?.(item.originDate, absMin) : "";
        if (stopDate !== intent.dateStr) return null;
        const status = window.getTrainStatusLabel?.(
          item.trainNo,
          item.originDate,
          arr[0]?.[2] || arr[0]?.[1] || "",
          arr[arr.length - 1]?.[1] || arr[arr.length - 1]?.[2] || "",
          absMin
        ) || "--";
        const depAdj = window.getAdjustedTime?.(item.trainNo, dep, intent.dateStr);
        return {
          trainNo: item.trainNo,
          originDate: item.originDate,
          type: normalizeTraTypeText(data["車種"] || ""),
          range: `${arr[0]?.[0] || "--"}→${arr[arr.length - 1]?.[0] || "--"}`,
          depHTML: typeof window.renderTimeWithDelay === "function"
            ? window.renderTimeWithDelay(item.trainNo, dep, intent.dateStr, { suppressStrike: status === "已過站" })
            : escapeHtml(dep),
          depMin: status === "已過站" ? (timeToMinutes(dep) ?? 9999) : (depAdj?.adjMin ?? timeToMinutes(dep) ?? 9999),
          status,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.depMin ?? 9999) - (b.depMin ?? 9999));
  }

  function collectThsrStationRows(station, intent) {
    const base = readPageValue("baseSchedule") || {};
    const prev = readPageValue("prevSchedule") || {};
    const currentDate = intent.dateStr;
    const rows = [];
    [
      { map: base, origin: currentDate },
      { map: prev, origin: addDays(currentDate, -1) },
    ].forEach((source) => {
      Object.keys(source.map || {}).forEach((trainNo) => {
        const data = source.map?.[trainNo];
        const stops = data?.["車站時間"] || [];
        const idx = stops.findIndex((stop) => normalizeStationName(stop[0], "thsr") === station);
        if (idx < 0) return;
        const stopDate = typeof window.stopDisplayDate === "function" ? window.stopDisplayDate(source.origin, stops, idx) : source.origin;
        if (stopDate !== currentDate) return;
        const first = normalizeStationName(stops[0]?.[0] || "", "thsr");
        const last = normalizeStationName(stops[stops.length - 1]?.[0] || "", "thsr");
        if (intent.direction) {
          const firstIdx = typeof window.thsrStationIndex === "function" ? window.thsrStationIndex(first) : -1;
          const lastIdx = typeof window.thsrStationIndex === "function" ? window.thsrStationIndex(last) : -1;
          const isSouth = firstIdx >= 0 && lastIdx >= 0 ? firstIdx < lastIdx : true;
          if (intent.direction === "south" && !isSouth) return;
          if (intent.direction === "north" && isSouth) return;
        }
        const ad = window.splitArrDep?.(stops[idx]) || {};
        const time = ad.dep || ad.arr || "";
        const firstDep = window.splitArrDep?.(stops[0])?.dep || "";
        const lastArr = window.splitArrDep?.(stops[stops.length - 1])?.arr || window.splitArrDep?.(stops[stops.length - 1])?.dep || "";
        const status = window.getStatusLabel?.(source.origin, time, lastArr, firstDep, "list") || "--";
        rows.push({
          trainNo,
          originDate: source.origin,
          range: `${first}→${last}`,
          time,
          status,
        });
      });
    });
    return rows.sort((a, b) => (timeToMinutes(a.time) ?? 9999) - (timeToMinutes(b.time) ?? 9999));
  }

  function findTraTrain(trainNo, queryDate) {
    const base = readPageValue("baseSchedule") || {};
    const prev = readPageValue("prevSchedule") || {};
    if (base[trainNo]) return { train: base[trainNo], originDate: queryDate };
    if (prev[trainNo]) return { train: prev[trainNo], originDate: addDays(queryDate, -1) };
    return null;
  }

  function findThsrTrain(trainNo, queryDate) {
    const base = readPageValue("baseSchedule") || {};
    const prev = readPageValue("prevSchedule") || {};
    if (base[trainNo]) return { train: base[trainNo], originDate: queryDate };
    if (prev[trainNo]) return { train: prev[trainNo], originDate: addDays(queryDate, -1) };
    return null;
  }

  function renderSwitchCard(state, requestedSystem) {
    state.renderState = null;
    const targetLabel = requestedSystem === "thsr" ? "高鐵頁面" : "台鐵頁面";
    const targetHref = requestedSystem === "thsr" ? "../thsr/thsr.html" : "../tr/tr.html";
    state.actions = [];
    const actionIndex = addAction(state, { type: "switch", href: targetHref });
    state.answer.innerHTML = `
      <div class="rail-ai-switch">
        <div>
          <div class="rail-ai-title"><strong>這個指令比較像 ${requestedSystem === "thsr" ? "高鐵" : "台鐵"} 查詢</strong></div>
          <p class="rail-ai-note">這裡先保留摘要；只有在你要進一步套用完整查詢時，再跳到對應頁面。</p>
        </div>
        <button class="rail-ai-btn primary" type="button" data-ai-action="${actionIndex}">前往 ${targetLabel} 詳細查詢</button>
      </div>
    `;
    bindActionButtons(state);
  }

  function renderTraRoute(state, intent, directRows, transferRows, persist = true) {
    if (persist) {
      state.renderState = { kind: "tr-route", intent, directRows, transferRows };
    }
    const view = ensureViewState(state);
    state.actions = [];
    const meta = buildMetaPills([
      intent.dateLabel,
      intent.timeLabel,
      intent.typePreference,
      intent.allowTransfer ? "可轉乘" : "直達優先",
    ]);
    const directPageSize = getResultPageSize("direct");
    const directPage = getPagedItems(directRows, view.route.direct, directPageSize);
    view.route.direct = directPage.offset;
    const directHtml = directPage.items.length
      ? directPage.items.map((item) => {
          const detailAction = addAction(state, { type: "tra-detail", trainNo: item.num, originDate: item.originDate });
          const booking = typeof window.getBookingEligibilityByRow === "function" ? window.getBookingEligibilityByRow(item) : { ok: false };
          const bookingAction = booking.ok
            ? addAction(state, { type: "tra-book", trainNo: item.num, start: item.startStation, end: item.endStation, date: intent.dateStr })
            : -1;
          return `
            <article class="rail-ai-card">
              <div class="rail-ai-card-head">
                <div class="rail-ai-card-main">
                  <strong>${escapeHtml(item.num)} 次 ${renderTraTypeInline(item.type)}</strong>
                  <p class="rail-ai-line">${item.depHTML || escapeHtml(item.depSched)} ${renderStationLabel(item.startStation, "tr")} 出發 → ${item.arrHTML || escapeHtml(item.arrSched)} ${renderStationLabel(item.endStation, "tr")} 抵達</p>
                  <p class="rail-ai-subline">${escapeHtml(item.travel)} ｜ ${item.stopsCount > 0 ? `中途 ${item.stopsCount} 站` : "直達"} ｜ 目前狀態 ${escapeHtml(item.status)}</p>
                </div>
              </div>
              <div class="rail-ai-actions">
                <button class="rail-ai-btn" type="button" data-ai-action="${detailAction}">查看詳情</button>
                ${booking.ok ? `<button class="rail-ai-btn primary" type="button" data-ai-action="${bookingAction}">直接訂票</button>` : ""}
              </div>
            </article>
          `;
        }).join("")
      : `<div class="rail-ai-empty">這個條件下沒有找到符合的直達班次。</div>`;
    const directPagination = buildPaginationBlock(
      directPage,
      "route-direct",
      directPageSize,
      "更早班次",
      directPage.offset > 0 ? "更晚班次" : "更多班次"
    );

    const transferOnly = (transferRows || []).filter((item) => !item.isDirect);
    const transferPageSize = getResultPageSize("transfer");
    const transferPage = getPagedItems(transferOnly, view.route.transfer, transferPageSize);
    view.route.transfer = transferPage.offset;
    const transferHtml = !intent.directOnly
      ? (transferPage.items.length
          ? transferPage.items.map((item) => {
              const actionIndex = addAction(state, { type: "tra-transfer", plan: item });
              return `
                <article class="rail-ai-card">
                  <div class="rail-ai-card-main">
                    <strong>${escapeHtml(item.n1)} 次 → ${escapeHtml(item.n2)} 次</strong>
                    <p class="rail-ai-line">${item.depHTML || escapeHtml(item.depSched)} ${renderStationLabel(item.startStation, "tr")} 出發 ｜ ${renderStationLabel(item.transferStation, "tr")} 轉乘 ${item.waitMin} 分 ｜ ${item.arrHTML || escapeHtml(item.arrSched)} 抵達 ${renderStationLabel(item.endStation, "tr")}</p>
                    <p class="rail-ai-subline">總耗時 ${escapeHtml(item.travel)} ｜ 第 1 段 ${renderTraTypeInline(item.type1)} ｜ 第 2 段 ${renderTraTypeInline(item.type2)}</p>
                  </div>
                  <div class="rail-ai-actions">
                    <button class="rail-ai-btn" type="button" data-ai-action="${actionIndex}">查看轉乘詳細</button>
                  </div>
                </article>
              `;
            }).join("")
          : `<div class="rail-ai-empty">沒有找到更合適的 1 次轉乘方案。</div>`)
      : "";
    const transferPagination = !intent.directOnly
      ? buildPaginationBlock(
          transferPage,
          "route-transfer",
          transferPageSize,
          "更早轉乘",
          transferPage.offset > 0 ? "更晚轉乘" : "更多轉乘"
        )
      : "";

    state.answer.innerHTML = `
      <div class="rail-ai-title">
        <span class="rail-ai-badge">旅程建議</span>
        <strong>${renderStationLabel(intent.startRaw, "tr")} → ${renderStationLabel(intent.endRaw, "tr")}</strong>
      </div>
      ${meta}
      <p class="rail-ai-note">已同步套用到頁面查詢；下方是依日期與時間條件整理出的快速建議。</p>
      <section class="rail-ai-section">
        <div class="rail-ai-section-head"><strong>直達建議</strong><span>${directRows.length ? `共 ${directRows.length} 筆可參考` : "沒有符合條件的直達"}</span></div>
        <div class="rail-ai-list">${directHtml}</div>
        ${directPagination}
      </section>
      ${!intent.directOnly ? `<section class="rail-ai-section"><div class="rail-ai-section-head"><strong>轉乘建議</strong><span>${transferOnly.length ? `共 ${transferOnly.length} 筆候選` : "沒有更好的轉乘"}</span></div><div class="rail-ai-list">${transferHtml}</div>${transferPagination}</section>` : ""}
    `;
    bindRenderedButtons(state);
  }

  function seatMeta(code) {
    if (code === "O") return { text: "座位充裕", cls: "ok" };
    if (code === "L") return { text: "座位有限", cls: "warn" };
    if (code === "X") return { text: "接近售完", cls: "bad" };
    return { text: "--", cls: "" };
  }

  function renderSeatPill(label, code) {
    const meta = seatMeta(code);
    return `<span class="rail-ai-seat-group"><span class="rail-ai-seat-label">${escapeHtml(label)}</span><span class="rail-ai-seat-pill ${meta.cls}">${escapeHtml(meta.text)}</span></span>`;
  }

  function renderThsrRoute(state, intent, rows, persist = true) {
    if (persist) {
      state.renderState = { kind: "thsr-route", intent, rows };
    }
    const view = ensureViewState(state);
    state.actions = [];
    const seatMap = readPageValue("currentSeatMap") || {};
    const meta = buildMetaPills([
      intent.dateLabel,
      intent.timeLabel,
      intent.directOnly ? "只看直達" : "",
      intent.wantsTicket ? "附票況" : "",
    ]);
    const directPageSize = getResultPageSize("direct");
    const page = getPagedItems(rows, view.route.direct, directPageSize);
    view.route.direct = page.offset;
    const html = page.items.length
      ? page.items.map((item) => {
          const detailAction = addAction(state, { type: "thsr-detail", trainNo: item.trainNo, originDate: item.originDate });
          const bookable = item.originDate > todayDateStr() || (item.originDate === todayDateStr() && (timeToMinutes(item.dep) ?? -9999) - currentMinutes() > 10);
          const bookingAction = bookable
            ? addAction(state, { type: "thsr-book", trainNo: item.trainNo, start: intent.startRaw, end: intent.endRaw, date: item.originDate, time: item.dep })
            : -1;
          const seatInfo = seatMap[`${item.trainNo}|${item.originDate}`] || null;
          const seatLine = seatInfo
            ? ` ｜ <span class="rail-ai-seat-line">${renderSeatPill("標準座", seatInfo.standard)}${renderSeatPill("商務座", seatInfo.business)}</span>`
            : "";
          return `
            <article class="rail-ai-card">
              <div class="rail-ai-card-main">
                <strong>${escapeHtml(item.trainNo)} 次</strong>
                <p class="rail-ai-line">${escapeHtml(item.dep)} ${renderStationLabel(intent.startRaw, "thsr")} 出發 → ${escapeHtml(item.arr)} ${renderStationLabel(intent.endRaw, "thsr")} 抵達</p>
                <p class="rail-ai-subline">${escapeHtml(formatDurationMinutes(item.durMin))} ｜ ${item.stopBetween > 0 ? `中途 ${item.stopBetween} 站` : "直達"} ｜ 目前狀態 ${escapeHtml(item.status)}${seatLine}</p>
              </div>
              <div class="rail-ai-actions">
                <button class="rail-ai-btn" type="button" data-ai-action="${detailAction}">查看詳情</button>
                ${bookable ? `<button class="rail-ai-btn primary" type="button" data-ai-action="${bookingAction}">直接訂票</button>` : ""}
              </div>
            </article>
          `;
        }).join("")
      : `<div class="rail-ai-empty">這個條件下沒有找到符合的高鐵班次。</div>`;
    const pagination = buildPaginationBlock(
      page,
      "route-direct",
      directPageSize,
      "更早班次",
      page.offset > 0 ? "更晚班次" : "更多班次"
    );

    state.answer.innerHTML = `
      <div class="rail-ai-title">
        <span class="rail-ai-badge">旅程建議</span>
        <strong>${renderStationLabel(intent.startRaw, "thsr")} → ${renderStationLabel(intent.endRaw, "thsr")}</strong>
      </div>
      ${meta}
      <p class="rail-ai-note">已同步套用到頁面查詢；如果你有指定時間或票況，這裡會先整理最接近的班次。</p>
      <section class="rail-ai-section">
        <div class="rail-ai-section-head"><strong>班次建議</strong><span>${rows.length ? `共 ${rows.length} 筆候選` : "沒有符合條件的班次"}</span></div>
        <div class="rail-ai-list">${html}</div>
        ${pagination}
      </section>
    `;
    bindRenderedButtons(state);
  }

  function renderTraTrain(state, intent, result) {
    state.renderState = null;
    state.actions = [];
    const detailAction = addAction(state, { type: "tra-detail", trainNo: result.trainNo, originDate: result.originDate });
    const meta = buildMetaPills([intent.dateLabel, result.crossDayText]);
    state.answer.innerHTML = `
      <div class="rail-ai-title">
        <span class="rail-ai-badge">車次助手</span>
        <strong>${escapeHtml(result.trainNo)} 次 ${renderTraTypeInline(result.typeText)}</strong>
      </div>
      ${meta}
      <div class="rail-ai-grid">
        <div class="rail-ai-stat"><span>目前狀態</span><strong>${escapeHtml(result.statusText)}</strong></div>
        <div class="rail-ai-stat"><span>目前位置</span><strong>${escapeHtml(result.currentLocation)}</strong></div>
        <div class="rail-ai-stat"><span>${result.targetStation ? "預估抵達" : "預估車程"}</span><strong>${escapeHtml(result.etaLine)}</strong></div>
        <div class="rail-ai-stat"><span>行駛區間</span><strong>${renderStationLabel(result.firstStation, "tr")} → ${renderStationLabel(result.lastStation, "tr")}</strong></div>
      </div>
      <p class="rail-ai-note">${escapeHtml(result.stopSummary)}</p>
      <div class="rail-ai-actions">
        <button class="rail-ai-btn" type="button" data-ai-action="${detailAction}">打開列車詳細</button>
      </div>
    `;
    bindRenderedButtons(state);
  }

  function renderThsrTrain(state, intent, result) {
    state.renderState = null;
    state.actions = [];
    const detailAction = addAction(state, { type: "thsr-detail", trainNo: result.trainNo, originDate: result.originDate });
    state.answer.innerHTML = `
      <div class="rail-ai-title">
        <span class="rail-ai-badge">車次助手</span>
        <strong>${escapeHtml(result.trainNo)} 次</strong>
      </div>
      ${buildMetaPills([intent.dateLabel, result.crossDayText])}
      <div class="rail-ai-grid">
        <div class="rail-ai-stat"><span>目前狀態</span><strong>${escapeHtml(result.statusText)}</strong></div>
        <div class="rail-ai-stat"><span>目前位置</span><strong>${escapeHtml(result.currentLocation)}</strong></div>
        <div class="rail-ai-stat"><span>${result.targetStation ? "預估抵達" : "預估車程"}</span><strong>${escapeHtml(result.etaLine)}</strong></div>
        <div class="rail-ai-stat"><span>行駛區間</span><strong>${renderStationLabel(result.firstStation, "thsr")} → ${renderStationLabel(result.lastStation, "thsr")}</strong></div>
      </div>
      <p class="rail-ai-note">${escapeHtml(result.stopSummary)}</p>
      <div class="rail-ai-actions">
        <button class="rail-ai-btn" type="button" data-ai-action="${detailAction}">打開列車詳細</button>
      </div>
    `;
    bindRenderedButtons(state);
  }

  function renderStationAnswer(state, intent, rows, system, persist = true) {
    if (persist) {
      state.renderState = { kind: "station", intent, rows, system };
    }
    const view = ensureViewState(state);
    state.actions = [];
    const stationPageSize = getResultPageSize("station");
    const page = getPagedItems(rows, view.station, stationPageSize);
    view.station = page.offset;
    const html = page.items.length
      ? page.items.map((row) => {
          const actionType = system === "tr" ? "tra-detail" : "thsr-detail";
          const actionIndex = addAction(state, { type: actionType, trainNo: row.trainNo, originDate: row.originDate });
          return `
            <article class="rail-ai-card">
              <div class="rail-ai-card-main">
                <strong>${escapeHtml(row.trainNo)} 次${row.type ? ` ${renderTraTypeInline(row.type)}` : ""}</strong>
                <p class="rail-ai-line">${row.depHTML || escapeHtml(row.time || "--")}</p>
                <p class="rail-ai-subline">${escapeHtml(row.range)} ｜ 目前狀態 ${escapeHtml(row.status)}</p>
              </div>
              <div class="rail-ai-actions">
                <button class="rail-ai-btn" type="button" data-ai-action="${actionIndex}">查看詳情</button>
              </div>
            </article>
          `;
        }).join("")
      : `<div class="rail-ai-empty">這個日期與時間條件下沒有找到符合的班次。</div>`;
    const pagination = buildPaginationBlock(
      page,
      "station",
      stationPageSize,
      "更早班次",
      page.offset > 0 ? "更晚班次" : "更多班次"
    );
    const directionText = state.system === "tr"
      ? (intent.direction === "even" ? "順行 / 偶數車次" : intent.direction === "odd" ? "逆行 / 奇數車次" : "雙向整理")
      : (intent.direction === "south" ? "南下" : intent.direction === "north" ? "北上" : "雙向整理");

    state.answer.innerHTML = `
      <div class="rail-ai-title">
        <span class="rail-ai-badge">車站班次</span>
        <strong>${renderStationLabel(intent.stationRaw, system)}</strong>
      </div>
      ${buildMetaPills([intent.dateLabel, intent.timeLabel, directionText, intent.typePreference])}
      <p class="rail-ai-note">已同步帶入車站查詢；這裡先整理最接近的班次摘要。</p>
      <section class="rail-ai-section">
        <div class="rail-ai-section-head"><strong>接下來班次</strong><span>${rows.length ? `共 ${rows.length} 筆候選` : "沒有符合條件的班次"}</span></div>
        <div class="rail-ai-list">${html}</div>
        ${pagination}
      </section>
    `;
    bindRenderedButtons(state);
  }

  async function runTraRoute(state, intent) {
    const start = resolveStationName(intent.startRaw, "tr");
    const end = resolveStationName(intent.endRaw, "tr");
    if (!start || !end || start === end) {
      renderError(state, "起訖站辨識失敗，請再輸入一次，例如：今天 08:00 台北到台中 自強號。");
      return;
    }

    await ensureDateLoaded(intent.dateStr);
    setTraTypeFilters("startend", intent.typePreference);
    const startInput = document.getElementById("startStation");
    const endInput = document.getElementById("endStation");
    const transferInput = document.getElementById("acceptTransfers");
    if (startInput) startInput.value = start;
    if (endInput) endInput.value = end;
    if (transferInput) transferInput.checked = !!intent.allowTransfer && !intent.directOnly;
    window.runStartEndSearch?.();
    await settleSearch("tr");

    const directRows = upcomingByIntent(
      readPageValue("currentStartEndList") || [],
      intent,
      (item) => item?.depSortMin ?? timeToMinutes(item?.depSched),
      (item) => item?.status
    );

    window.buildTransferList?.(start, end);
    const transferRows = upcomingByIntent(
      readPageValue("currentTransferList") || [],
      intent,
      (item) => item?.depSortMin ?? timeToMinutes(item?.depSched),
      (item) => item?.status
    );

    renderTraRoute(state, { ...intent, startRaw: start, endRaw: end }, directRows, transferRows);
  }

  async function runThsrRoute(state, intent) {
    const start = resolveStationName(intent.startRaw, "thsr");
    const end = resolveStationName(intent.endRaw, "thsr");
    if (!start || !end || start === end) {
      renderError(state, "起訖站辨識失敗，請再輸入一次，例如：今天 08:00 台北到左營 直達。");
      return;
    }

    await ensureDateLoaded(intent.dateStr);
    const startInput = document.getElementById("startStation");
    const endInput = document.getElementById("endStation");
    const directInput = document.getElementById("onlyDirect");
    if (startInput) startInput.value = start;
    if (endInput) endInput.value = end;
    if (directInput) directInput.checked = !!intent.directOnly;
    await maybePromise(window.runStartEndSearch?.());
    await settleSearch("thsr");

    const rows = upcomingByIntent(
      readPageValue("currentStartEndList") || [],
      intent,
      (item) => timeToMinutes(item?.dep),
      (item) => item?.status
    );
    renderThsrRoute(state, { ...intent, startRaw: start, endRaw: end }, rows);
  }

  async function runTraTrain(state, intent) {
    await ensureDateLoaded(intent.dateStr);
    const trainNo = typeof window.extractTrainNoFromInput === "function"
      ? window.extractTrainNoFromInput(intent.trainNoRaw)
      : intent.trainNoRaw;
    const input = document.getElementById("trainNumberInput");
    if (input) input.value = trainNo;
    window.filterTrainScheduleByNumber?.();
    await settleSearch("tr");

    const match = findTraTrain(trainNo, intent.dateStr);
    if (!match) {
      renderError(state, `查無 ${trainNo} 次，請確認日期或車次是否正確。`);
      return;
    }

    const stops = match.train["車站時間"] || [];
    if (!stops.length) {
      renderError(state, `查無 ${trainNo} 次的停靠資訊。`);
      return;
    }

    const statusText = typeof window.getStatusForModal === "function"
      ? window.getStatusForModal(trainNo, match.originDate, stops)
      : "--";
    const abs = window.buildAbsMinutes?.(stops) || [];
    const lastAbs = abs[abs.length - 1]?.abs;
    const nowAbs = typeof window.getNowAbsFromOrigin === "function" ? window.getNowAbsFromOrigin(match.originDate) : null;
    const isActiveWindow = match.originDate === todayDateStr() || (match.originDate === addDays(todayDateStr(), -1) && Number.isFinite(lastAbs) && Number.isFinite(nowAbs) && nowAbs <= lastAbs + 360);
    const canNext = isActiveWindow && (!Number.isFinite(lastAbs) || !Number.isFinite(nowAbs) || nowAbs <= lastAbs + 5);
    let nextIndex = -1;
    if (canNext) {
      for (let i = 0; i < stops.length; i += 1) {
        const stopAbs = abs[i]?.abs;
        const delayMin = typeof window.getDelayMinutes === "function" ? Number(window.getDelayMinutes(trainNo) || 0) : 0;
        if (Number.isFinite(stopAbs) && Number.isFinite(nowAbs) && stopAbs + Math.max(0, delayMin) >= nowAbs) {
          nextIndex = i;
          break;
        }
      }
      if (nextIndex === -1) nextIndex = stops.length - 1;
    }

    const targetStation = resolveStationName(intent.targetRaw, "tr");
    const targetIndex = targetStation ? stops.findIndex((stop) => stop[0] === targetStation) : -1;
    const targetStop = targetIndex >= 0 ? stops[targetIndex] : null;
    const targetClock = targetStop ? (window.splitArrDep?.(targetStop)?.arr || window.splitArrDep?.(targetStop)?.dep || "") : "";
    const targetAbs = targetIndex >= 0 ? abs[targetIndex]?.abs : null;
    const targetAdjusted = targetClock && typeof window.getAdjustedTime === "function"
      ? window.getAdjustedTime(trainNo, targetClock, intent.dateStr, targetAbs, match.originDate)
      : null;
    const remain = targetAdjusted && Number.isFinite(targetAdjusted.adjAbsMin) && Number.isFinite(nowAbs) ? formatRemainText(targetAdjusted.adjAbsMin - nowAbs) : "";
    const etaLine = targetStation
      ? etaText(targetAdjusted?.adj || targetClock || "--", remain)
      : (typeof window.getTravelTextFromStops === "function" ? window.getTravelTextFromStops(stops) : "--");
    const stopSummary = targetStation && targetIndex >= 0
      ? `${targetStation} 之前共 ${targetIndex + 1} 站；沿途停靠：${stops.slice(0, Math.min(targetIndex + 1, 8)).map((stop) => stop[0]).join("、")}${targetIndex + 1 > 8 ? " 等" : ""}`
      : `沿途停靠共 ${stops.length} 站：${stops.slice(0, 8).map((stop) => stop[0]).join("、")}${stops.length > 8 ? " 等" : ""}`;
    const crossDay = typeof window.getCrossDayInfo === "function" ? window.getCrossDayInfo(stops) : { label: "當日車" };
    const currentLocation = typeof window.getCurrentLocationText === "function"
      ? window.getCurrentLocationText(stops, nextIndex, statusText, canNext)
      : (stops[nextIndex]?.[0] || "--");

    renderTraTrain(state, intent, {
      trainNo,
      originDate: match.originDate,
      statusText,
      currentLocation,
      typeText: normalizeTraTypeText(match.train["車種"] || "列車"),
      crossDayText: crossDay.label || "當日車",
      targetStation: targetIndex >= 0 ? targetStation : "",
      etaLine,
      firstStation: stops[0]?.[0] || "--",
      lastStation: stops[stops.length - 1]?.[0] || "--",
      routeText: `${stops[0]?.[0] || "--"} → ${stops[stops.length - 1]?.[0] || "--"}`,
      stopSummary,
    });
  }

  async function runThsrTrain(state, intent) {
    await ensureDateLoaded(intent.dateStr);
    const trainNo = typeof window.extractTrainNoFromInput === "function"
      ? window.extractTrainNoFromInput(intent.trainNoRaw)
      : intent.trainNoRaw;
    const input = document.getElementById("trainNumberInput");
    if (input) input.value = trainNo;
    window.filterTrainScheduleByNumber?.();
    await settleSearch("thsr");

    const match = findThsrTrain(trainNo, intent.dateStr);
    if (!match) {
      renderError(state, `查無 ${trainNo} 次，請確認日期或車次是否正確。`);
      return;
    }

    const stops = match.train["車站時間"] || [];
    if (!stops.length) {
      renderError(state, `查無 ${trainNo} 次的停靠資訊。`);
      return;
    }

    const firstDep = window.splitArrDep?.(stops[0])?.dep || window.splitArrDep?.(stops[0])?.arr || "";
    const lastArr = window.splitArrDep?.(stops[stops.length - 1])?.arr || window.splitArrDep?.(stops[stops.length - 1])?.dep || "";
    const statusText = typeof window.getStatusLabel === "function"
      ? window.getStatusLabel(match.originDate, firstDep, lastArr, firstDep, "train")
      : "--";
    const todayQuery = intent.dateStr === todayDateStr();
    let nextIndex = -1;
    if (todayQuery) {
      for (let i = 0; i < stops.length; i += 1) {
        const dep = window.splitArrDep?.(stops[i])?.dep || window.splitArrDep?.(stops[i])?.arr || "";
        const depMin = timeToMinutes(dep);
        if (Number.isFinite(depMin) && depMin >= currentMinutes()) {
          nextIndex = i;
          break;
        }
      }
    }
    const currentLocation = !todayQuery ? "依時刻推估" : (nextIndex >= 0 ? stops[nextIndex]?.[0] || "--" : "已到終點");
    const targetStation = resolveStationName(intent.targetRaw, "thsr");
    const targetIndex = targetStation ? stops.findIndex((stop) => normalizeStationName(stop[0], "thsr") === targetStation) : -1;
    const targetArr = targetIndex >= 0
      ? (window.splitArrDep?.(stops[targetIndex])?.arr || window.splitArrDep?.(stops[targetIndex])?.dep || "")
      : "";
    const remain = targetArr && todayQuery ? formatRemainText((timeToMinutes(targetArr) ?? 0) - currentMinutes()) : "";
    const depMin = timeToMinutes(firstDep);
    const arrMin = timeToMinutes(lastArr);
    const crossDayText = Number.isFinite(depMin) && Number.isFinite(arrMin) && arrMin < depMin ? "跨日車" : "當日車";
    const etaLine = targetIndex >= 0 ? etaText(targetArr, remain) : formatDurationMinutes(((arrMin ?? 0) - (depMin ?? 0) + 1440) % 1440);
    const stopSummary = targetIndex >= 0
      ? `${targetStation} 之前共 ${targetIndex + 1} 站；沿途停靠：${stops.slice(0, Math.min(targetIndex + 1, 8)).map((stop) => normalizeStationName(stop[0], "thsr")).join("、")}${targetIndex + 1 > 8 ? " 等" : ""}`
      : `沿途停靠共 ${stops.length} 站：${stops.slice(0, 8).map((stop) => normalizeStationName(stop[0], "thsr")).join("、")}${stops.length > 8 ? " 等" : ""}`;

    renderThsrTrain(state, intent, {
      trainNo,
      originDate: match.originDate,
      statusText,
      currentLocation,
      crossDayText,
      targetStation: targetIndex >= 0 ? targetStation : "",
      etaLine,
      firstStation: normalizeStationName(stops[0]?.[0] || "", "thsr") || "--",
      lastStation: normalizeStationName(stops[stops.length - 1]?.[0] || "", "thsr") || "--",
      routeText: `${normalizeStationName(stops[0]?.[0] || "", "thsr")} → ${normalizeStationName(stops[stops.length - 1]?.[0] || "", "thsr")}`,
      stopSummary,
    });
  }

  async function runTraStation(state, intent) {
    const station = resolveStationName(intent.stationRaw, "tr");
    if (!station) {
      renderError(state, "車站辨識失敗，請再輸入一次，例如：板橋站 08:10-12:00。");
      return;
    }
    await ensureDateLoaded(intent.dateStr);
    setTraTypeFilters("station", intent.typePreference);
    const input = document.getElementById("stationNameInput");
    if (input) input.value = station;
    const directionSelect = document.getElementById("directionSelect");
    if (directionSelect && intent.direction) directionSelect.value = intent.direction;
    window.filterTrainScheduleByStationName?.();
    await settleSearch("tr");
    const rows = upcomingByIntent(
      collectTraStationRows(station, intent),
      intent,
      (item) => item?.depMin,
      (item) => item?.status
    );
    renderStationAnswer(state, { ...intent, stationRaw: station }, rows, "tr");
  }

  async function runThsrStation(state, intent) {
    const station = resolveStationName(intent.stationRaw, "thsr");
    if (!station) {
      renderError(state, "車站辨識失敗，請再輸入一次，例如：台中站 08:10-12:00。");
      return;
    }
    await ensureDateLoaded(intent.dateStr);
    const input = document.getElementById("stationNameInput");
    if (input) input.value = station;
    const directionSelect = document.getElementById("directionSelect");
    if (directionSelect && intent.direction) directionSelect.value = intent.direction;
    window.filterTrainScheduleByStationName?.();
    await settleSearch("thsr");
    const rows = upcomingByIntent(
      collectThsrStationRows(station, intent),
      intent,
      (item) => timeToMinutes(item?.time),
      (item) => item?.status
    );
    renderStationAnswer(state, { ...intent, stationRaw: station }, rows, "thsr");
  }

  async function executeIntent(state, intent) {
    if (intent.kind === "switch") {
      renderSwitchCard(state, intent.requestedSystem);
      return;
    }
    if (state.system === "tr") {
      if (intent.kind === "route") return runTraRoute(state, intent);
      if (intent.kind === "train") return runTraTrain(state, intent);
      if (intent.kind === "station") return runTraStation(state, intent);
    } else {
      if (intent.kind === "route") return runThsrRoute(state, intent);
      if (intent.kind === "train") return runThsrTrain(state, intent);
      if (intent.kind === "station") return runThsrStation(state, intent);
    }
    renderError(state, "目前只支援起訖站、車次或車站查詢。");
  }

  async function runAssistant(state, prompt) {
    const raw = String(prompt || state.input.value || "").trim();
    if (!raw) {
      renderEmpty(state);
      return;
    }
    state.lastPrompt = raw;
    state.input.value = raw;
    state.view = { route: { direct: 0, transfer: 0 }, station: 0 };
    state.renderState = null;
    await window.RailAssistantCommon?.ensureStationLocaleData?.();
    const intent = parseIntent(raw, state.system);
    if (!intent) {
      renderError(state, "我還沒看懂這句，建議直接輸入起訖站、車次或車站，例如：今天 08:00 台北到台中。");
      return;
    }

    const button = state.runButton;
    const previousLabel = button.textContent;
    button.disabled = true;
    button.textContent = "分析中...";
    try {
      await executeIntent(state, intent);
    } catch (error) {
      console.error(error);
      renderError(state, "這次整理失敗了，請稍後再試一次。");
    } finally {
      button.disabled = false;
      button.textContent = previousLabel;
    }
  }

  function isEmbeddedAssistantMode() {
    try {
      return new URLSearchParams(location.search).get("home_ai_embed") === "1";
    } catch (_) {
      return false;
    }
  }

  function notifyEmbeddedAssistantHeight(state) {
    if (!isEmbeddedAssistantMode()) return;
    try {
      const panel = document.getElementById("panel-ai");
      if (!panel) return;
      const height = Math.max(panel.scrollHeight || 0, Math.ceil(panel.getBoundingClientRect().height || 0)) + 24;
      window.parent?.postMessage({ type: "RAIL_AI_HEIGHT", system: state.system, height }, "*");
    } catch (_) {}
  }

  function syncEmbeddedTheme(theme) {
    if (!isEmbeddedAssistantMode()) return;
    const isLight = theme === "light";
    document.body.classList.toggle("light-mode", isLight);
    document.body.classList.toggle("dark-mode", !isLight);
  }

  function injectEmbeddedAssistantStyles() {
    if (!isEmbeddedAssistantMode() || document.getElementById("rail-page-assistant-embed-style")) return;
    const style = document.createElement("style");
    style.id = "rail-page-assistant-embed-style";
    style.textContent = `
      html, body{
        margin:0 !important;
        padding:0 !important;
        overflow-x:hidden !important;
      }
      .bg-blobs,
      #loading-overlay,
      header,
      .header,
      .query-tabs{
        display:none !important;
      }
      main,
      .container{
        width:100% !important;
        max-width:none !important;
        margin:0 !important;
        padding:0 !important;
      }
      main .grid{
        display:block !important;
        gap:0 !important;
      }
      main .grid > :not(#panel-ai){
        display:none !important;
      }
      #panel-ai,
      #panel-ai.hidden{
        display:flex !important;
        margin:0 !important;
        padding:10px !important;
        border:0 !important;
        border-radius:0 !important;
        box-shadow:none !important;
        background:transparent !important;
        box-sizing:border-box !important;
      }
      #panel-ai .rail-ai-panel{
        margin-top:0 !important;
      }
      #panel-ai .section-title{
        margin-top:0 !important;
      }
      @media (max-width: 760px){
        #panel-ai,
        #panel-ai.hidden{
          padding:8px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setupEmbeddedAssistantBridge(state) {
    if (!isEmbeddedAssistantMode()) return;

    injectEmbeddedAssistantStyles();
    syncEmbeddedTheme(localStorage.getItem("theme") === "light" ? "light" : "dark");

    try {
      window.switchQueryPanel?.("panel-ai");
    } catch (_) {}

    const panel = document.getElementById("panel-ai");
    panel?.classList.remove("hidden");

    if (!window.__railAssistantEmbedMessageBound) {
      window.__railAssistantEmbedMessageBound = true;
      window.addEventListener("message", (event) => {
        const data = event?.data;
        if (!data || typeof data !== "object") return;
        if (data.type === "RAIL_AI_THEME") {
          syncEmbeddedTheme(data.theme === "light" ? "light" : "dark");
          return;
        }
        if (data.type === "RAIL_AI_RUN" && data.system === state.system) {
          const query = String(data.query || "").trim();
          if (!query) return;
          state.input.value = query;
          runAssistant(state, query).finally(() => notifyEmbeddedAssistantHeight(state));
        }
      });
    }

    if (!window.__railAssistantEmbedResizeBound && typeof ResizeObserver === "function" && panel) {
      window.__railAssistantEmbedResizeBound = true;
      const observer = new ResizeObserver(() => notifyEmbeddedAssistantHeight(state));
      observer.observe(panel);
      if (document.body) observer.observe(document.body);
      window.__railAssistantEmbedResizeObserver = observer;
    }

    window.parent?.postMessage({ type: "RAIL_AI_READY", system: state.system }, "*");
    notifyEmbeddedAssistantHeight(state);
  }

  function initRailPageAssistant(system) {
    if (system !== "tr" && system !== "thsr") return;
    const grid = document.querySelector("main .grid");
    const tabs = grid?.querySelector(".query-tabs");
    if (!grid || !tabs || document.getElementById("panel-ai")) return;

    injectStyles();

    const tab = document.createElement("button");
    tab.className = "query-tab";
    tab.id = "tab-ai";
    tab.type = "button";
    tab.dataset.target = "panel-ai";
    tab.textContent = "AI 助手";
    tab.addEventListener("click", () => {
      window.switchQueryPanel?.("panel-ai");
    });
    tabs.appendChild(tab);

    const panel = document.createElement("section");
    panel.id = "panel-ai";
    panel.className = "card query-panel rail-ai-panel hidden";
    panel.innerHTML = buildPanelHTML(system);

    const lastPanel = Array.from(grid.querySelectorAll(".query-panel")).slice(-1)[0];
    if (lastPanel) {
      lastPanel.insertAdjacentElement("afterend", panel);
    } else {
      tabs.insertAdjacentElement("afterend", panel);
    }

    const state = {
      system,
      panel,
      input: panel.querySelector("#railAssistantInput"),
      runButton: panel.querySelector("#railAssistantRun"),
      answer: panel.querySelector("#railAssistantAnswer"),
      actions: [],
      lastPrompt: "",
      renderState: null,
      view: { route: { direct: 0, transfer: 0 }, station: 0 },
    };

    state.runButton.addEventListener("click", () => runAssistant(state));
    state.input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      runAssistant(state);
    });
    panel.querySelectorAll("[data-ai-prompt]").forEach((button) => {
      button.addEventListener("click", () => runAssistant(state, button.dataset.aiPrompt));
    });

    window.addEventListener("rail:languagechange", () => {
      const prompt = String(state.lastPrompt || state.input.value || "").trim();
      if (!prompt) return;
      runAssistant(state, prompt);
    });

    renderEmpty(state);
    setupEmbeddedAssistantBridge(state);
  }

  window.initRailPageAssistant = initRailPageAssistant;
})();
