(function () {
  const STYLE_ID = "rail-master-table-styles";
  const TAB_ID = "tab-master-table";
  const PANEL_ID = "panel-master-table";
  const MAX_CAPTURE_CANVAS_DIMENSION = 8192;
  const MAX_CAPTURE_CANVAS_AREA = 16000000;
  const SEA_LINE_STATIONS = new Set([
    "談文",
    "大山",
    "後龍",
    "龍港",
    "白沙屯",
    "新埔",
    "通霄",
    "苑裡",
    "日南",
    "大甲",
    "台中港",
    "清水",
    "沙鹿",
    "龍井",
    "大肚",
    "追分",
    "臺中港",
  ]);
  const WEST_BRANCH_START = "竹南";
  const WEST_BRANCH_END = "彰化";
  const WEST_MOUNTAIN_UNIQUE_STATIONS = [
    "造橋",
    "豐富",
    "苗栗",
    "南勢",
    "銅鑼",
    "三義",
    "泰安",
    "后里",
    "豐原",
    "栗林",
    "潭子",
    "頭家厝",
    "松竹",
    "太原",
    "精武",
    "臺中",
    "五權",
    "大慶",
    "烏日",
    "新烏日",
    "成功",
  ];
  const WEST_SEA_UNIQUE_STATIONS = [
    "談文",
    "大山",
    "後龍",
    "龍港",
    "白沙屯",
    "新埔",
    "通霄",
    "苑裡",
    "日南",
    "大甲",
    "臺中港",
    "清水",
    "沙鹿",
    "龍井",
    "大肚",
    "追分",
  ];
  const WEST_MOUNTAIN_STATIONS = new Set(WEST_MOUNTAIN_UNIQUE_STATIONS);
  const TRA_NON_RESERVED_TYPES = new Set(["區間快", "區間車"]);
  const TRA_TYPE_COLORS = {
    新自強: "#7c3aed",
    普悠瑪: "#e11d48",
    太魯閣: "#be123c",
    自強號: "#ea580c",
    自強: "#ea580c",
    "自強號(新)": "#b45309",
    莒光號: "#d97706",
    復興號: "#0284c7",
    區間快: "#15803d",
    區間車: "#334155",
  };

  function maybePromise(value) {
    return value && typeof value.then === "function" ? value : Promise.resolve(value);
  }

  async function ensureMasterTableAccess() {
    if (!window.RailFeatureGate?.ensureAccess) return true;
    try {
      return await window.RailFeatureGate.ensureAccess("master-table");
    } catch (_) {
      return false;
    }
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

  function getRailNetwork() {
    return window.RailNetwork || null;
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

  function formatDuration(start, end) {
    const startMin = parseMinutes(start);
    const endMin = parseMinutes(end);
    if (startMin === null || endMin === null) return "";
    let diff = endMin - startMin;
    if (diff < 0) diff += 1440;
    if (diff > 720) diff = Math.abs(diff - 1440);
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours ? `${hours}時` : ""}${minutes}分`;
  }

  function displayStopTime(stop) {
    if (!Array.isArray(stop)) return "";
    return String(stop[1] || stop[2] || "").trim();
  }

  function getTrainDirectionOptions(system) {
    if (system === "tr") {
      return [
        { value: "all", label: "全部" },
        { value: "even", label: "順行(偶數車次)" },
        { value: "odd", label: "逆行(奇數車次)" },
      ];
    }
    return [
      { value: "all", label: "全部" },
      { value: "even", label: "北上(偶數車次)" },
      { value: "odd", label: "南下(奇數車次)" },
    ];
  }

  function getTrainNoParity(trainNo) {
    const digits = String(trainNo || "").match(/\d+/g);
    if (!digits || !digits.length) return "";
    const number = Number(digits.join(""));
    if (!Number.isFinite(number)) return "";
    return number % 2 === 0 ? "even" : "odd";
  }

  function matchesDirectionFilter(trainNo, filterValue) {
    if (!filterValue || filterValue === "all") return true;
    return getTrainNoParity(trainNo) === filterValue;
  }

  function getDisplayStationOrderSign(direction, entries) {
    if (!direction || direction === "all") return 1;
    let score = 0;
    (entries || []).forEach((entry) => {
      const sign = Number(entry?.routeDirection) || 0;
      if (sign > 0) score += 1;
      else if (sign < 0) score -= 1;
    });
    return score < 0 ? -1 : 1;
  }

  function getDisplayStationList(system, stations, direction, entries) {
    if (!Array.isArray(stations)) return [];
    const list = stations.slice();
    return getDisplayStationOrderSign(direction, entries) < 0 ? list.reverse() : list;
  }

  function sanitizeFilename(name) {
    return String(name || "download")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function waitFrames(count = 2) {
    for (let i = 0; i < count; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }
  }

  function getSafeCaptureScale(width, height, requestedScale) {
    const safeWidth = Math.max(1, Number(width) || 1);
    const safeHeight = Math.max(1, Number(height) || 1);
    const requested = Math.max(0.35, Number(requestedScale || 1) || 1);
    const byDimension = Math.min(MAX_CAPTURE_CANVAS_DIMENSION / safeWidth, MAX_CAPTURE_CANVAS_DIMENSION / safeHeight);
    const byArea = Math.sqrt(MAX_CAPTURE_CANVAS_AREA / Math.max(1, safeWidth * safeHeight));
    return Math.max(0.35, Math.min(2, requested, byDimension, byArea));
  }

  function inlineComputedStyles(source, target) {
    if (!source || !target || source.nodeType !== 1 || target.nodeType !== 1) return;
    const computed = getComputedStyle(source);
    for (let i = 0; i < computed.length; i += 1) {
      const propertyName = computed[i];
      target.style.setProperty(propertyName, computed.getPropertyValue(propertyName), computed.getPropertyPriority(propertyName));
    }
    if (source instanceof HTMLInputElement) {
      target.value = source.value;
      if (source.checked) target.setAttribute("checked", "checked");
      else target.removeAttribute("checked");
    } else if (source instanceof HTMLTextAreaElement || source instanceof HTMLSelectElement) {
      target.value = source.value;
    } else if (source instanceof HTMLCanvasElement) {
      const dataUrl = source.toDataURL();
      const image = document.createElement("img");
      image.src = dataUrl;
      image.alt = "";
      image.style.cssText = target.style.cssText;
      image.width = source.width;
      image.height = source.height;
      target.replaceWith(image);
      target = image;
    }
    const sourceChildren = Array.from(source.childNodes);
    const targetChildren = Array.from(target.childNodes);
    for (let i = 0; i < sourceChildren.length; i += 1) {
      inlineComputedStyles(sourceChildren[i], targetChildren[i]);
    }
  }

  async function loadSvgImage(svg) {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const candidates = [blobUrl, dataUrl];
    try {
      for (const src of candidates) {
        try {
          const image = new Image();
          image.decoding = "async";
          await new Promise((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("畫面擷取失敗，請稍後再試。"));
            image.src = src;
          });
          return image;
        } catch (_) {
        }
      }
      throw new Error("畫面擷取失敗，請稍後再試。");
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  function createDetachedClone(element, options = {}) {
    const cloneHost = document.createElement("div");
    cloneHost.style.position = "fixed";
    cloneHost.style.left = "-200000px";
    cloneHost.style.top = "0";
    cloneHost.style.zIndex = "-1";
    cloneHost.style.pointerEvents = "none";
    cloneHost.style.opacity = "0";
    cloneHost.style.visibility = "hidden";
    cloneHost.style.width = "max-content";
    cloneHost.style.height = "auto";
    cloneHost.style.overflow = "visible";
    const clone = element.cloneNode(true);
    inlineComputedStyles(element, clone);
    if (typeof options.prepareClone === "function") options.prepareClone(clone);
    cloneHost.appendChild(clone);
    clone.style.margin = "0";
    clone.style.transform = "none";
    clone.style.maxHeight = "none";
    clone.style.height = "auto";
    clone.style.overflow = "visible";
    document.body.appendChild(cloneHost);
    return { cloneHost, clone };
  }

  async function captureElementToCanvas(element, options = {}) {
    if (!element) throw new Error("找不到要匯出的內容。");
    await waitFrames(2);
    const rect = element.getBoundingClientRect();
    const padding = Math.max(0, Number(options.padding || 0));
    const requestedScale = Number(options.scale || window.devicePixelRatio || 1);
    let cloneHost = null;
    const clonePack = createDetachedClone(element, options);
    cloneHost = clonePack.cloneHost;
    const clone = clonePack.clone;
    await waitFrames(1);
    const width = Math.max(1, Math.ceil(options.width || clone.scrollWidth || clone.getBoundingClientRect().width || element.scrollWidth || rect.width || 1));
    const height = Math.max(1, Math.ceil(options.height || clone.scrollHeight || clone.getBoundingClientRect().height || element.scrollHeight || rect.height || 1));
    clone.style.width = `${width}px`;
    clone.style.maxWidth = "none";
    clone.style.minWidth = `${width}px`;
    await waitFrames(1);
    const serialized = new XMLSerializer().serializeToString(clone);
    const bg = options.background || getComputedStyle(document.body).backgroundColor || "#ffffff";
    const totalWidth = width + padding * 2;
    const totalHeight = height + padding * 2;
    const scale = getSafeCaptureScale(totalWidth, totalHeight, requestedScale);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
        <foreignObject x="0" y="0" width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" class="${escapeAttr(document.body.className)}" style="margin:0;padding:${padding}px;width:${totalWidth}px;height:${totalHeight}px;overflow:hidden;background:${escapeAttr(bg)};">
            ${serialized}
          </div>
        </foreignObject>
      </svg>
    `;
    const image = await loadSvgImage(svg);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(totalWidth * scale));
    canvas.height = Math.max(1, Math.ceil(totalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("畫布初始化失敗，請稍後再試。");
    ctx.scale(scale, scale);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    ctx.drawImage(image, 0, 0, totalWidth, totalHeight);
    cloneHost?.remove();
    return { canvas, width: totalWidth, height: totalHeight, scale };
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("檔案產生失敗。"));
      }, type, quality);
    });
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = sanitizeFilename(filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function concatUint8(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    parts.forEach((part) => {
      merged.set(part, offset);
      offset += part.length;
    });
    return merged;
  }

  function toBytes(text) {
    return new TextEncoder().encode(text);
  }

  function buildPdfFromJpeg(jpegBytes, imageWidthPx, imageHeightPx, pageWidthPx = imageWidthPx, pageHeightPx = imageHeightPx) {
    const widthPt = Math.max(72, Math.round((pageWidthPx * 72) / 96));
    const heightPt = Math.max(72, Math.round((pageHeightPx * 72) / 96));
    const content = `q\n${widthPt} 0 0 ${heightPt} 0 0 cm\n/Im0 Do\nQ\n`;
    const objects = [
      toBytes("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
      toBytes("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
      toBytes(
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
      ),
      concatUint8([
        toBytes(
          `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidthPx} /Height ${imageHeightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
        ),
        jpegBytes,
        toBytes("\nendstream\nendobj\n"),
      ]),
      toBytes(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`),
    ];

    const header = toBytes("%PDF-1.4\n%\u00ff\u00ff\u00ff\u00ff\n");
    const parts = [header];
    const offsets = [0];
    let cursor = header.length;
    objects.forEach((objectBytes) => {
      offsets.push(cursor);
      parts.push(objectBytes);
      cursor += objectBytes.length;
    });
    const xrefOffset = cursor;
    const xref = [
      "xref",
      `0 ${objects.length + 1}`,
      "0000000000 65535 f ",
      ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
      "trailer",
      `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
      "startxref",
      `${xrefOffset}`,
      "%%EOF",
      "",
    ].join("\n");
    parts.push(toBytes(xref));
    return new Blob(parts, { type: "application/pdf" });
  }

  async function downloadElementAsPdf(element, filename, options = {}) {
    const capture = await captureElementToCanvas(element, options);
    const jpeg = await canvasToBlob(capture.canvas, "image/jpeg", 0.92);
    const pdf = buildPdfFromJpeg(
      new Uint8Array(await jpeg.arrayBuffer()),
      capture.canvas.width,
      capture.canvas.height,
      capture.width,
      capture.height
    );
    triggerDownload(pdf, filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  }

  async function downloadElementAsImage(element, filename, options = {}) {
    const capture = await captureElementToCanvas(element, options);
    const png = await canvasToBlob(capture.canvas, "image/png");
    triggerDownload(png, filename.endsWith(".png") ? filename : `${filename}.png`);
  }

  async function shareElementAsImage(element, filename, options = {}) {
    const capture = await captureElementToCanvas(element, options);
    const png = await canvasToBlob(capture.canvas, "image/png");
    const file = new File([png], filename.endsWith(".png") ? filename : `${filename}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: options.title || "列車資訊",
        text: options.text || "",
        files: [file],
      });
      return;
    }
    triggerDownload(png, file.name);
  }

  async function printElementAsPdf(element, title, options = {}) {
    let cloneHost = null;
    try {
      const clonePack = createDetachedClone(element, options);
      cloneHost = clonePack.cloneHost;
      const clone = clonePack.clone;
      clone.style.width = "max-content";
      clone.style.maxWidth = "none";
      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1400,height=900");
      if (!printWindow) throw new Error("print-window-blocked");
      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
    <style>
      :root{color-scheme:light;}
      *{box-sizing:border-box;}
      html,body{margin:0;padding:0;background:#ffffff;color:#0f172a;font-family:"Segoe UI","Noto Sans TC",sans-serif;}
      body{padding:12mm;}
      @page{margin:10mm; size:auto;}
      @media print{body{padding:0;}}
    </style>
  </head>
  <body>${clone.outerHTML}<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},120);});</script></body>
</html>`);
      printWindow.document.close();
    } finally {
      cloneHost?.remove();
    }
  }

  function getTraTypeColor(type) {
    if (typeof window.getTrainTypeColor === "function") {
      try {
        return window.getTrainTypeColor(type);
      } catch (_) {
      }
    }
    return TRA_TYPE_COLORS[type] || "#475569";
  }

  function getStationOrder(system) {
    const network = getRailNetwork();
    if (system === "tr" && network?.getTraStationCatalog) {
      const stations = network.getTraStationCatalog();
      if (stations.length) return stations;
    }
    if (system === "thsr" && network?.getThsrStationOrder) {
      const stations = network.getThsrStationOrder();
      if (stations.length) return stations;
    }
    if (system === "tr") {
      const list = readPageValue("stationListSorted") || [];
      const seen = new Set();
      return list
        .map((item) => normalizeTraStation(item?.name || ""))
        .filter((name) => name && !seen.has(name) && seen.add(name));
    }
    const thsrOrder = readPageValue("THSR_STATION_ORDER");
    if (Array.isArray(thsrOrder) && thsrOrder.length) {
      const seen = new Set();
      return thsrOrder
        .map((name) => normalizeThsrStation(name))
        .filter((name) => name && !seen.has(name) && seen.add(name));
    }
    const list = readPageValue("stationListSorted") || [];
    const seen = new Set();
    return list
      .map((item) => normalizeThsrStation(item?.name || ""))
      .filter((name) => name && !seen.has(name) && seen.add(name));
  }

  function getDefaultRange(system, stations) {
    const startField = document.getElementById("startStation");
    const endField = document.getElementById("endStation");
    const normalize = system === "tr" ? normalizeTraStation : normalizeThsrStation;
    const startValue = normalize(startField?.value || "");
    const endValue = normalize(endField?.value || "");
    const defaultStart = stations.includes(startValue) ? startValue : stations[0];
    const defaultEnd = stations.includes(endValue) ? endValue : stations[stations.length - 1];
    return { start: defaultStart, end: defaultEnd };
  }

  function ensureRange(start, end, stations) {
    let startIndex = stations.indexOf(start);
    let endIndex = stations.indexOf(end);
    if (startIndex < 0 || endIndex < 0) return [];
    if (startIndex > endIndex) {
      const tmp = startIndex;
      startIndex = endIndex;
      endIndex = tmp;
    }
    return stations.slice(startIndex, endIndex + 1);
  }

  function canonicalizeRangeOrder(range, stationOrder) {
    if (!Array.isArray(range)) return [];
    if (!Array.isArray(stationOrder) || !stationOrder.length || range.length < 2) return range.slice();
    const firstIndex = stationOrder.indexOf(range[0]);
    const lastIndex = stationOrder.indexOf(range[range.length - 1]);
    if (firstIndex >= 0 && lastIndex >= 0 && firstIndex > lastIndex) {
      return range.slice().reverse();
    }
    return range.slice();
  }

  function mergePathSegments(first, second) {
    if (!first.length) return second.slice();
    if (!second.length) return first.slice();
    return first.concat(second.slice(1));
  }

  function getTraBranchByTripLine(tripLine) {
    const value = String(tripLine || "").trim();
    if (!value) return "";
    if (/[海]/.test(value) || /^2$/.test(value) || /sea/i.test(value)) return "sea";
    if (/[山]/.test(value) || /^1$/.test(value) || /mountain/i.test(value)) return "mountain";
    return "";
  }

  function getTraBranchByStation(stationName) {
    if (WEST_MOUNTAIN_STATIONS.has(stationName)) return "mountain";
    if (SEA_LINE_STATIONS.has(stationName)) return "sea";
    return "";
  }

  function buildWestBranchStations(mode, isReverse = false) {
    const forward = mode === "sea"
      ? [WEST_BRANCH_START, ...WEST_SEA_UNIQUE_STATIONS, WEST_BRANCH_END]
      : mode === "mountain"
        ? [WEST_BRANCH_START, ...WEST_MOUNTAIN_UNIQUE_STATIONS, WEST_BRANCH_END]
        : [WEST_BRANCH_START, ...WEST_MOUNTAIN_UNIQUE_STATIONS, ...WEST_SEA_UNIQUE_STATIONS, WEST_BRANCH_END];
    return isReverse ? forward.slice().reverse() : forward;
  }

  function expandWestBranchPath(path, mode) {
    const source = Array.isArray(path) ? path : [];
    if (!source.length || !mode) return source.slice();
    const branchStartIndex = source.indexOf(WEST_BRANCH_START);
    const branchEndIndex = source.indexOf(WEST_BRANCH_END);
    if (branchStartIndex < 0 || branchEndIndex < 0 || branchStartIndex === branchEndIndex) return source.slice();
    const firstIndex = Math.min(branchStartIndex, branchEndIndex);
    const lastIndex = Math.max(branchStartIndex, branchEndIndex);
    const prefix = source.slice(0, firstIndex + 1);
    const suffix = source.slice(lastIndex);
    const branchStations = buildWestBranchStations(mode, branchStartIndex > branchEndIndex);
    return mergePathSegments(mergePathSegments(prefix, branchStations), suffix);
  }

  function inferTraBranchHint(stops, tripLine, trainNo, path) {
    const names = (stops || []).map((stop) => normalizeTraStation(stop?.name || stop?.[0] || "")).filter(Boolean);
    if (names.some((name) => SEA_LINE_STATIONS.has(name))) return "sea";
    if (names.some((name) => WEST_MOUNTAIN_STATIONS.has(name))) return "mountain";
    const tripLineBranch = getTraBranchByTripLine(tripLine);
    if (tripLineBranch) return tripLineBranch;
    if (/A/i.test(String(trainNo || "").trim())) return "sea";
    if (Array.isArray(path) && path.includes(WEST_BRANCH_START) && path.includes(WEST_BRANCH_END)) return "mountain";
    return "";
  }

  function buildTraMasterRange(start, end, pivot, stationOrder) {
    const rawRange = getRailNetwork()?.findTraRoutePath
      ? getRailNetwork().findTraRoutePath(start, end, pivot)
      : ensureRange(start, end, stationOrder);
    if (!rawRange.length || pivot) return rawRange;
    if (getTraBranchByStation(start) || getTraBranchByStation(end)) return rawRange;
    return expandWestBranchPath(rawRange, "both");
  }

  function expandEntryPathStations(system, stops, options = {}) {
    const names = (stops || []).map((stop) => stop.name).filter(Boolean);
    if (names.length < 2) return names.slice();
    const findPath = system === "tr" ? getRailNetwork()?.findTraRoutePath : getRailNetwork()?.findThsrRoutePath;
    if (findPath) {
      const basePath = system === "tr" ? findPath(names[0], names[names.length - 1]) : [];
      const branchHint = system === "tr"
        ? inferTraBranchHint(stops, options.tripLine, options.trainNo, basePath)
        : "";
      let expanded = [];
      for (let index = 0; index < names.length - 1; index += 1) {
        let pairPath = findPath(names[index], names[index + 1]);
        if (system === "tr") pairPath = expandWestBranchPath(pairPath, branchHint);
        expanded = mergePathSegments(expanded, Array.isArray(pairPath) && pairPath.length ? pairPath : [names[index], names[index + 1]]);
      }
      if (expanded.length) return expanded;
    }
    return names.slice();
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
    return getRailNetwork()?.normalizeTraDisplayType?.(raw) || raw;
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

  function buildTimedStops(routeStops) {
    const timedStops = [];
    let previousAbsoluteMinute = null;
    const stopCount = (routeStops || []).length;
    const resolveAbsoluteMinute = (rawMinute) => {
      if (rawMinute === null) return null;
      let absoluteMinute = rawMinute;
      while (previousAbsoluteMinute !== null && absoluteMinute < previousAbsoluteMinute) {
        absoluteMinute += 1440;
      }
      previousAbsoluteMinute = absoluteMinute;
      return absoluteMinute;
    };
    routeStops.forEach((stop, index) => {
      const arrivalRaw = parseMinutes(stop.arrival);
      const departureRaw = parseMinutes(stop.departure);
      const hasArrival = arrivalRaw !== null;
      const hasDeparture = departureRaw !== null;
      timedStops.push({
        ...stop,
        hasArrival,
        hasDeparture,
        isPassOnly: index > 0 && index < stopCount - 1 && hasArrival !== hasDeparture,
        arrivalMinute: resolveAbsoluteMinute(arrivalRaw),
        departureMinute: resolveAbsoluteMinute(departureRaw),
      });
    });
    return timedStops;
  }

  function getStopArrivalMinute(stop) {
    return stop?.arrivalMinute ?? stop?.departureMinute;
  }

  function getStopDepartureMinute(stop) {
    return stop?.departureMinute ?? stop?.arrivalMinute;
  }

  function getStopEventMinute(stop) {
    return getStopDepartureMinute(stop) ?? getStopArrivalMinute(stop);
  }

  function getJourneyInterpolationRatio(system, fullPathStations, startPathIndex, endPathIndex, currentPathIndex, totalMinutes, startStop, endStop) {
    const totalSteps = Math.abs(endPathIndex - startPathIndex);
    const fallbackRatio = totalSteps > 0 ? Math.abs(currentPathIndex - startPathIndex) / totalSteps : 0;
    if (system !== "thsr") return fallbackRatio;
    const startStation = fullPathStations?.[startPathIndex];
    const endStation = fullPathStations?.[endPathIndex];
    const currentStation = fullPathStations?.[currentPathIndex];
    const getTimedRatio = getRailNetwork()?.getThsrTimedInterpolationRatio;
    if (typeof getTimedRatio !== "function") return fallbackRatio;
    return getTimedRatio(startStation, endStation, currentStation, totalMinutes, startStop, endStop, fallbackRatio);
  }

  function buildJourneyPathPoints(system, timedStops, fullPathStations) {
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
        const passMinute = getStopEventMinute(current);
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
      const totalMinutes = Number.isFinite(travelStart) && Number.isFinite(travelEnd) ? (travelEnd - travelStart) : null;
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
          minute: Math.round(
            travelStart +
              (travelEnd - travelStart) *
                getJourneyInterpolationRatio(
                  system,
                  fullPathStations,
                  current.pathIndex,
                  next.pathIndex,
                  pathIndex,
                  totalMinutes,
                  !current.isPassOnly,
                  !next.isPassOnly
                )
          ),
          kind: "pass",
          isStop: false,
        });
      }
    });

    return points;
  }

  function getDateByOriginMinute(originDate, minute) {
    if (!originDate || !Number.isFinite(minute)) return "";
    return addDays(originDate, Math.floor(minute / 1440));
  }

  function getQueryRelativeMinute(originDate, minute, queryDate) {
    if (!Number.isFinite(minute)) return null;
    return minute - diffDateDays(originDate || queryDate, queryDate) * 1440;
  }

  function getProjectionMinute(entry, stationName) {
    if (!stationName) return null;
    const minute = entry?.routeMinuteMap?.get(stationName);
    return Number.isFinite(minute) ? minute : null;
  }

  function buildMasterEntries(system, scheduleSources) {
    const normalizeStation = system === "tr" ? normalizeTraStation : normalizeThsrStation;
    const sources = Array.isArray(scheduleSources) ? scheduleSources : [{ map: scheduleSources || {}, originDate: getQueryDate() }];
    return sources.flatMap((source) =>
      Object.keys(source.map || {})
        .sort((a, b) => String(a).localeCompare(String(b), "en"))
        .map((trainNo) => {
          const raw = source.map?.[trainNo];
          if (!raw) return null;
          const type = system === "tr" ? String(raw["車種"] || "").trim() : "";
          if (system === "tr" && !type) return null;
          const stops = (raw["車站時間"] || [])
            .map((stop) => {
              const times = splitStopTimes(stop);
              return {
                name: normalizeStation(stop?.[0] || ""),
                time: displayStopTime(stop),
                arrival: times.arrival,
                departure: times.departure,
              };
            })
            .filter((stop) => stop.name && (stop.time || stop.arrival || stop.departure));
          if (!stops.length) return null;
          const stopMap = new Map(stops.map((stop) => [stop.name, stop.time]));
          return {
            key: `${trainNo}@${source.originDate || ""}`,
            originDate: source.originDate || "",
            trainNo: String(trainNo),
            type,
            stops,
            stopMap,
            stationSet: new Set(stops.map((stop) => stop.name)),
            fullPathStations: expandEntryPathStations(system, stops),
            firstStation: stops[0].name,
            lastStation: stops[stops.length - 1].name,
            isReserved: system === "tr" ? !TRA_NON_RESERVED_TYPES.has(type) : true,
            isSea: system === "tr" ? stops.some((stop) => SEA_LINE_STATIONS.has(stop.name)) : false,
          };
        })
        .filter(Boolean)
    );
  }

  function buildMasterEntries(system, scheduleSources) {
    const normalizeStation = system === "tr" ? normalizeTraStation : normalizeThsrStation;
    const sources = Array.isArray(scheduleSources) ? scheduleSources : [{ map: scheduleSources || {}, originDate: getQueryDate() }];
    return sources.flatMap((source) =>
      Object.keys(source.map || {})
        .sort((a, b) => String(a).localeCompare(String(b), "en"))
        .map((trainNo) => {
          const raw = source.map?.[trainNo];
          if (!raw) return null;
          const type = system === "tr" ? String(raw["車種"] || "").trim() : "";
          if (system === "tr" && !type) return null;
          const stopRows = raw["車站時間"] || [];
          const stops = stopRows
            .map((stop, index) => {
              const times = splitStopTimes(stop);
              const baseStop = {
                name: normalizeStation(stop?.[0] || ""),
                time: displayStopTime(stop),
                arrival: times.arrival,
                departure: times.departure,
              };
              return system === "tr"
                ? normalizeSingleTimeTraStop(baseStop, index, stopRows.length, type)
                : baseStop;
            })
            .filter((stop) => stop.name && (stop.time || stop.arrival || stop.departure));
          if (!stops.length) return null;
          const tripLine = system === "tr" ? (raw["行別"] ?? raw["路線"] ?? raw["TripLine"] ?? raw["銵"] ?? "") : "";
          const basePath = system === "tr" && getRailNetwork()?.findTraRoutePath
            ? getRailNetwork().findTraRoutePath(stops[0].name, stops[stops.length - 1].name)
            : [];
          const branchHint = system === "tr" ? inferTraBranchHint(stops, tripLine, trainNo, basePath) : "";
          const stopMap = new Map(stops.map((stop) => [stop.name, stop.time]));
          return {
            key: `${trainNo}@${source.originDate || ""}`,
            originDate: source.originDate || "",
            trainNo: String(trainNo),
            type,
            tripLine,
            branchHint,
            stops,
            stopMap,
            stationSet: new Set(stops.map((stop) => stop.name)),
            fullPathStations: expandEntryPathStations(system, stops, { tripLine, trainNo, branchHint }),
            firstStation: stops[0].name,
            lastStation: stops[stops.length - 1].name,
            isReserved: system === "tr" ? !TRA_NON_RESERVED_TYPES.has(type) : true,
            isSea: system === "tr" ? branchHint === "sea" : false,
          };
        })
        .filter(Boolean)
    );
  }

  function buildMasterProjections(system, entry, routeStations, queryDate) {
    const routeIndexMap = new Map((routeStations || []).map((name, index) => [name, index]));
    const fullTimedStops = buildTimedStops(entry.stops || []);
    const fullPathPoints = buildJourneyPathPoints(system, fullTimedStops, entry.fullPathStations || []);
    const points = (fullPathPoints || [])
      .filter((point) => routeIndexMap.has(point.station))
      .map((point) => ({
        ...point,
        routeIndex: routeIndexMap.get(point.station),
      }))
      .filter((point) => Number.isFinite(point.routeIndex));
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
        const firstPoint = pointGroup[0];
        const lastPoint = pointGroup[pointGroup.length - 1];
        const routeCoveredSet = new Set(pointGroup.map((point) => point.station));
        if (routeCoveredSet.size < 2) return null;

        let routeDirection = 0;
        for (let index = 1; index < pointGroup.length; index += 1) {
          const delta = pointGroup[index].routeIndex - pointGroup[index - 1].routeIndex;
          if (!delta) continue;
          routeDirection = delta > 0 ? 1 : -1;
          break;
        }
        if (!routeDirection) routeDirection = 1;

        const routeMinuteMap = new Map();
        pointGroup.forEach((point) => {
          if (!routeMinuteMap.has(point.station)) routeMinuteMap.set(point.station, point.minute);
        });

        const routeStopMap = new Map();
        (fullTimedStops || []).forEach((stop) => {
          if (!routeIndexMap.has(stop.name)) return;
          if (stop.isPassOnly) return;
          const arrivalMinute = getStopArrivalMinute(stop);
          const departureMinute = getStopDepartureMinute(stop);
          const eventStart = Number.isFinite(arrivalMinute) ? arrivalMinute : departureMinute;
          const eventEnd = Number.isFinite(departureMinute) ? departureMinute : arrivalMinute;
          if (!Number.isFinite(eventStart) || !Number.isFinite(eventEnd)) return;
          if (eventEnd < firstPoint.minute || eventStart > lastPoint.minute) return;
          if (!stop.time) return;
          routeStopMap.set(stop.name, stop.time);
        });

        const boundaryStop = (fullTimedStops || []).find((stop) => stop.name === firstPoint.station) || null;
        const boundaryMinute = Number.isFinite(getStopDepartureMinute(boundaryStop))
          ? getStopDepartureMinute(boundaryStop)
          : firstPoint.minute;

        return {
          ...entry,
          projectionKey: `${entry.key || entry.trainNo}|${visitIndex}`,
          routeStations,
          routeIndexMap,
          routeStopMap,
          routeCoveredSet,
          routeMinuteMap,
          routeDirection,
          rangeFirstMinute: firstPoint.minute,
          rangeLastMinute: lastPoint.minute,
          rangeBoundaryMinute: boundaryMinute,
          rangeDisplayDate: getDateByOriginMinute(entry.originDate, boundaryMinute),
          rangeFirstQueryMinute: getQueryRelativeMinute(entry.originDate, boundaryMinute, queryDate),
        };
      })
      .filter(Boolean);
  }

  function sortProjectedEntries(entries, range, pivotStation, queryDate) {
    const getStationMinute = (entry, station) => getQueryRelativeMinute(entry.originDate, getProjectionMinute(entry, station), queryDate);
    return (entries || []).slice().sort((a, b) => {
      if (pivotStation) {
        const aPivot = getStationMinute(a, pivotStation);
        const bPivot = getStationMinute(b, pivotStation);
        if ((aPivot ?? 999999) !== (bPivot ?? 999999)) return (aPivot ?? 999999) - (bPivot ?? 999999);
      }
      for (const station of range || []) {
        const aTime = getStationMinute(a, station);
        const bTime = getStationMinute(b, station);
        if (aTime === null || bTime === null) continue;
        if (aTime !== bTime) return aTime - bTime;
      }
      return (a.rangeFirstQueryMinute ?? 999999) - (b.rangeFirstQueryMinute ?? 999999);
    });
  }

  function buildTraEntries(schedule) {
    const network = getRailNetwork();
    return Object.keys(schedule || {})
      .sort((a, b) => String(a).localeCompare(String(b), "en"))
      .map((trainNo) => {
        const raw = schedule?.[trainNo];
        if (!raw) return null;
        const type = String(raw["車種"] || "").trim();
        if (!type || type === "加班車") return null;
        const stops = (raw["車站時間"] || [])
          .map((stop) => ({
            name: normalizeTraStation(stop?.[0] || ""),
            time: displayStopTime(stop),
            arr: String(stop?.[2] || "").trim(),
            dep: String(stop?.[1] || "").trim(),
          }))
          .filter((stop) => stop.name);
        if (!stops.length) return null;
        const stopMap = new Map(stops.map((stop) => [stop.name, stop.time]));
        const stationSet = new Set(stops.map((stop) => stop.name));
        return {
          trainNo: String(trainNo),
          type,
          stops,
          stopMap,
          stationSet,
          fullPathStations: network?.expandTraStopPath ? network.expandTraStopPath(stops) : stops.map((stop) => stop.name),
          firstStation: stops[0].name,
          lastStation: stops[stops.length - 1].name,
          isReserved: !TRA_NON_RESERVED_TYPES.has(type),
          isSea: stops.some((stop) => SEA_LINE_STATIONS.has(stop.name)),
        };
      })
      .filter(Boolean);
  }

  function buildThsrEntries(schedule) {
    const network = getRailNetwork();
    return Object.keys(schedule || {})
      .sort((a, b) => String(a).localeCompare(String(b), "en"))
      .map((trainNo) => {
        const raw = schedule?.[trainNo];
        if (!raw) return null;
        const stops = (raw["車站時間"] || [])
          .map((stop) => ({
            name: normalizeThsrStation(stop?.[0] || ""),
            time: displayStopTime(stop),
            arr: String(stop?.[2] || "").trim(),
            dep: String(stop?.[1] || "").trim(),
          }))
          .filter((stop) => stop.name);
        if (!stops.length) return null;
        const stopMap = new Map(stops.map((stop) => [stop.name, stop.time]));
        return {
          trainNo: String(trainNo),
          type: "",
          stops,
          stopMap,
          stationSet: new Set(stops.map((stop) => stop.name)),
          fullPathStations: network?.expandThsrStopPath ? network.expandThsrStopPath(stops) : stops.map((stop) => stop.name),
          firstStation: stops[0].name,
          lastStation: stops[stops.length - 1].name,
          isReserved: true,
          isSea: false,
        };
      })
      .filter(Boolean);
  }

  function buildRouteProjection(entry, routeStations) {
    const routeIndexMap = new Map(routeStations.map((name, idx) => [name, idx]));
    const fullPathIndexMap = new Map((entry.fullPathStations || []).map((name, idx) => [name, idx]));
    const covered = routeStations
      .map((station, routeIdx) => ({ station, routeIdx, pathIdx: fullPathIndexMap.get(station) }))
      .filter((item) => Number.isFinite(item.pathIdx));
    if (covered.length < 2) return null;

    const minPathIdx = Math.min(...covered.map((item) => item.pathIdx));
    const maxPathIdx = Math.max(...covered.map((item) => item.pathIdx));
    const routeCoveredSet = new Set(
      routeStations.filter((station) => {
        const pathIdx = fullPathIndexMap.get(station);
        return Number.isFinite(pathIdx) && pathIdx >= minPathIdx && pathIdx <= maxPathIdx;
      })
    );
    if (routeCoveredSet.size < 2) return null;

    const routeStopMap = new Map(
      (entry.stops || [])
        .filter((stop) => routeIndexMap.has(stop.name))
        .map((stop) => [stop.name, stop.time])
    );

    return {
      ...entry,
      routeStations,
      routeStopMap,
      routeCoveredSet,
      routeIndexMap,
    };
  }

  function passesStation(entry, stationName) {
    return !!entry.routeCoveredSet?.has(stationName) && !entry.routeStopMap?.has(stationName);
  }

  function firstTimeInRange(entry, rangeSet) {
    const sequence = [];
    entry.stops.forEach((stop) => {
      if (!rangeSet.has(stop.name)) return;
      const min = parseMinutes(stop.time);
      if (min !== null) sequence.push(min);
    });
    if (!sequence.length) return null;
    let offset = 0;
    let previous = sequence[0];
    const adjusted = [previous];
    for (let i = 1; i < sequence.length; i += 1) {
      if (sequence[i] < previous) offset += 1440;
      adjusted.push(sequence[i] + offset);
      previous = sequence[i];
    }
    return adjusted[0];
  }

  function isOvernightInRange(entry, rangeSet) {
    let previous = null;
    for (const stop of entry.stops) {
      if (!rangeSet.has(stop.name)) continue;
      const min = parseMinutes(stop.time);
      if (min === null) continue;
      if (previous !== null && min < previous) return true;
      previous = min;
    }
    return false;
  }

  function sortEntries(entries, range, rangeSet, pivotStation) {
    const pivot = pivotStation || "";
    const sorter = (a, b) => {
      if (pivot) {
        const aPivot = parseMinutes(a.stopMap.get(pivot)) ?? 9999;
        const bPivot = parseMinutes(b.stopMap.get(pivot)) ?? 9999;
        if (aPivot !== bPivot) return aPivot - bPivot;
      }
      for (const station of range) {
        if (!a.stopMap.has(station) || !b.stopMap.has(station)) continue;
        const aTime = parseMinutes(a.stopMap.get(station));
        const bTime = parseMinutes(b.stopMap.get(station));
        if (aTime !== bTime) return (aTime ?? 9999) - (bTime ?? 9999);
      }
      return (firstTimeInRange(a, rangeSet) ?? 9999) - (firstTimeInRange(b, rangeSet) ?? 9999);
    };
    const daytime = [];
    const overnight = [];
    entries.forEach((entry) => (isOvernightInRange(entry, rangeSet) ? overnight : daytime).push(entry));
    daytime.sort(sorter);
    overnight.sort(sorter);
    return [...daytime, ...overnight];
  }

  function createSelectOptions(select, stations, defaultValue) {
    if (!select) return;
    select.innerHTML = stations.map((station) => `<option value="${escapeAttr(station)}">${escapeHtml(station)}</option>`).join("");
    if (stations.includes(defaultValue)) {
      select.value = defaultValue;
    }
  }

  function buildTraTypeControls(state, entries) {
    if (state.system !== "tr") return;
    const host = state.panel.querySelector("#railMasterTypeDropdown");
    const count = state.panel.querySelector("#railMasterTypeCount");
    if (!host || !count) return;
    const nextTypes = Array.from(new Set(entries.map((entry) => entry.type).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hant"));
    const listChanged =
      nextTypes.length !== state.allTypes.length ||
      nextTypes.some((type, index) => type !== state.allTypes[index]);
    if (!listChanged && host.childElementCount) {
      count.textContent = state.selectedTypes.size === state.allTypes.length ? "(全)" : `(${state.selectedTypes.size})`;
      return;
    }
    state.allTypes = nextTypes;
    if (!state.selectedTypes.size || listChanged) {
      state.selectedTypes = new Set(nextTypes);
    }
    host.innerHTML = `
      <div class="rail-master-type-actions">
        <button type="button" class="btn-ghost rail-master-mini-btn" data-master-type="all">全選</button>
        <button type="button" class="btn-ghost rail-master-mini-btn" data-master-type="none">全無</button>
      </div>
      <div class="rail-master-type-list">
        ${nextTypes
          .map(
            (type) => `
              <label class="rail-master-type-item">
                <span class="rail-master-type-dot" style="background:${getTraTypeColor(type)}"></span>
                <span>${escapeHtml(type)}</span>
                <input type="checkbox" value="${escapeAttr(type)}" ${state.selectedTypes.has(type) ? "checked" : ""}>
              </label>
            `
          )
          .join("")}
      </div>
    `;
    host.querySelector('[data-master-type="all"]')?.addEventListener("click", () => {
      state.selectedTypes = new Set(state.allTypes);
      buildTraTypeControls(state, entries);
      renderMasterTable(state);
    });
    host.querySelector('[data-master-type="none"]')?.addEventListener("click", () => {
      state.selectedTypes = new Set();
      buildTraTypeControls(state, entries);
      renderMasterTable(state);
    });
    host.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selectedTypes.add(checkbox.value);
        else state.selectedTypes.delete(checkbox.value);
        count.textContent = state.selectedTypes.size === state.allTypes.length ? "(全)" : `(${state.selectedTypes.size})`;
        renderMasterTable(state);
      });
    });
    count.textContent = state.selectedTypes.size === state.allTypes.length ? "(全)" : `(${state.selectedTypes.size})`;
  }

  function getDurationTag(entry, startStation, endStation) {
    if (!entry.stopMap.has(startStation) || !entry.stopMap.has(endStation)) return "";
    const duration = formatDuration(entry.stopMap.get(startStation), entry.stopMap.get(endStation));
    return duration ? `<div class="rail-master-train-duration">${escapeHtml(duration)}</div>` : "";
  }

  function createMatrixBlock(system, title, entries, stationList, startStation, endStation, stationOrderSign) {
    const section = document.createElement("section");
    section.className = "rail-master-block";
    section.innerHTML = `<div class="rail-master-section-title">${escapeHtml(title)} <span>${entries.length} 班</span></div>`;

    const shell = document.createElement("div");
    shell.className = "rail-master-table-shell";
    const scroll = document.createElement("div");
    scroll.className = "rail-master-scroll";
    const table = document.createElement("table");
    table.className = "rail-master-table";

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const corner = document.createElement("th");
    corner.className = "rail-master-corner";
    corner.textContent = "車站";
    headerRow.appendChild(corner);

    entries.forEach((entry) => {
      const th = document.createElement("th");
      th.className = "rail-master-train-header";
      const color = system === "tr" ? getTraTypeColor(entry.type) : "var(--primary)";
      const seaTag = system === "tr" && entry.isSea ? `<span class="rail-master-inline-badge sea">海</span>` : "";
      th.innerHTML = `
        <div class="rail-master-train-stack">
          <div>
            <span class="rail-master-train-no" style="color:${color}">${escapeHtml(entry.trainNo)}</span>
            ${
              system === "tr"
                ? `<span class="rail-master-train-type" style="color:${color}">${escapeHtml(entry.type)}${seaTag}</span>`
                : `<span class="rail-master-train-type rail-master-thsr-tag">THSR</span>`
            }
          </div>
          <div class="rail-master-route-stack">
            <span class="rail-master-route">${escapeHtml(entry.firstStation)}<br>↓<br>${escapeHtml(entry.lastStation)}</span>
            ${getDurationTag(entry, startStation, endStation)}
          </div>
        </div>
      `;
      headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    stationList.forEach((station) => {
      const row = tbody.insertRow();
      const nameCell = row.insertCell();
      nameCell.className = "rail-master-station";
      nameCell.textContent = station;
      entries.forEach((entry) => {
        const cell = row.insertCell();
        if (entry.routeStopMap?.has(station)) {
          cell.className = "rail-master-time";
          cell.textContent = entry.routeStopMap.get(station);
        } else if (passesStation(entry, station)) {
          cell.className = "rail-master-pass";
          cell.textContent = "↓";
        }
      });
    });

    scroll.appendChild(table);
    shell.appendChild(scroll);
    section.appendChild(shell);
    return section;
  }

  function createMatrixBlock(system, title, entries, stationList, startStation, endStation, stationOrderSign) {
    const section = document.createElement("section");
    section.className = "rail-master-block";
    section.innerHTML = `<div class="rail-master-section-title">${escapeHtml(title)} <span>${entries.length} 班</span></div>`;

    const shell = document.createElement("div");
    shell.className = "rail-master-table-shell";
    const scroll = document.createElement("div");
    scroll.className = "rail-master-scroll";
    const table = document.createElement("table");
    table.className = "rail-master-table";

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const corner = document.createElement("th");
    corner.className = "rail-master-corner";
    corner.textContent = "車站";
    headerRow.appendChild(corner);

    entries.forEach((entry) => {
      const th = document.createElement("th");
      th.className = "rail-master-train-header";
      const color = system === "tr" ? getTraTypeColor(entry.type) : "var(--primary)";
      const seaTag = system === "tr" && entry.isSea ? `<span class="rail-master-inline-badge sea">海</span>` : "";
      th.innerHTML = `
        <div class="rail-master-train-stack">
          <div>
            <span class="rail-master-train-no" style="color:${color}">${escapeHtml(entry.trainNo)}</span>
            ${
              system === "tr"
                ? `<span class="rail-master-train-type" style="color:${color}">${escapeHtml(entry.type)}${seaTag}</span>`
                : `<span class="rail-master-train-type rail-master-thsr-tag">THSR</span>`
            }
          </div>
          <div class="rail-master-route-stack">
            <span class="rail-master-route">${escapeHtml(entry.firstStation)}<br>↓<br>${escapeHtml(entry.lastStation)}</span>
            ${getDurationTag(entry, startStation, endStation)}
          </div>
        </div>
      `;
      headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    stationList.forEach((station) => {
      const row = tbody.insertRow();
      const nameCell = row.insertCell();
      nameCell.className = "rail-master-station";
      nameCell.textContent = station;
      entries.forEach((entry) => {
        const cell = row.insertCell();
        if (entry.routeStopMap?.has(station)) {
          cell.className = "rail-master-time";
          cell.textContent = entry.routeStopMap.get(station);
          return;
        }
        if (passesStation(entry, station)) {
          cell.className = "rail-master-pass";
          cell.textContent = Number(entry.routeDirection || 1) * Number(stationOrderSign || 1) < 0 ? "↑" : "↓";
        }
      });
    });

    scroll.appendChild(table);
    shell.appendChild(scroll);
    section.appendChild(shell);
    return section;
  }

  function renderEmpty(state, message) {
    state.output.innerHTML = `<div class="rail-master-empty">${escapeHtml(message)}</div>`;
  }

  function renderSummary(state, title, subtitle) {
    const meta = state.output.querySelector(".rail-master-meta-line");
    if (!meta) return;
    meta.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(subtitle)}</span>
    `;
  }

  async function ensureScheduleReady(state) {
    const dateStr = getQueryDate();
    let schedule = readPageValue("baseSchedule") || window.trainSchedule || {};
    if ((!schedule || !Object.keys(schedule).length) && typeof window.refreshData === "function" && dateStr) {
      await maybePromise(window.refreshData(dateStr));
      schedule = readPageValue("baseSchedule") || window.trainSchedule || {};
    }
    return schedule || {};
  }

  async function renderTraTable(state) {
    const schedule = await ensureScheduleReady(state);
    if (!Object.keys(schedule).length) {
      renderEmpty(state, "目前還沒有台鐵真實時刻資料，請先更新頁面資料後再試。");
      return;
    }
    if (!syncStationControls(state)) {
      renderEmpty(state, "台鐵站點索引尚未完成，請稍後再試一次。");
      return;
    }
    const entries = buildTraEntries(schedule);
    buildTraTypeControls(state, entries);
    const start = normalizeTraStation(state.startSelect.value);
    const end = normalizeTraStation(state.endSelect.value);
    const pivot = normalizeTraStation(state.pivotSelect.value);
    const range = getRailNetwork()?.findTraRoutePath
      ? getRailNetwork().findTraRoutePath(start, end, pivot)
      : ensureRange(start, end, state.stationOrder);
    if (range.length < 2) {
      renderEmpty(state, "找不到這組起訖站範圍。");
      return;
    }
    const direction = state.directionSelect?.value || "all";
    const rangeSet = new Set(range);
    const query = String(state.searchInput.value || "").trim();
    const filtered = entries
      .map((entry) => buildRouteProjection(entry, range))
      .filter((entry) => {
        if (!entry) return false;
        if (state.selectedTypes.size && !state.selectedTypes.has(entry.type)) return false;
        if (!matchesDirectionFilter(entry.trainNo, direction)) return false;
        if (query && !entry.trainNo.includes(query)) return false;
        if (pivot && !entry.routeCoveredSet?.has(pivot)) return false;
        return Array.from(entry.routeCoveredSet || []).some((station) => rangeSet.has(station));
      });
    const reserved = sortEntries(filtered.filter((entry) => entry.isReserved), range, rangeSet, pivot);
    const nonReserved = sortEntries(filtered.filter((entry) => !entry.isReserved), range, rangeSet, pivot);
    const reservedStations = getDisplayStationList(
      "tr",
      state.onlyStopCheckbox.checked
        ? range.filter((station) => reserved.some((entry) => entry.routeStopMap?.has(station)))
        : range,
      direction
    );
    const nonReservedStations = getDisplayStationList(
      "tr",
      state.onlyStopCheckbox.checked
        ? range.filter((station) => nonReserved.some((entry) => entry.routeStopMap?.has(station)))
        : range,
      direction
    );
    state.output.innerHTML = `
      <div class="rail-master-export-scope">
        <div class="rail-master-meta-line"></div>
      </div>
    `;
    const directionLabel = getTrainDirectionOptions("tr").find((item) => item.value === direction)?.label || "全部";
    renderSummary(state, "台鐵時刻總表", `${getQueryDate() || "未指定日期"}｜方向 ${directionLabel}｜對號 ${reserved.length} 班｜區間 ${nonReserved.length} 班`);
    const scope = state.output.querySelector(".rail-master-export-scope");
    if (reserved.length) {
      scope.appendChild(createMatrixBlock("tr", "對號列車", reserved, reservedStations, start, end));
    }
    if (nonReserved.length) {
      scope.appendChild(createMatrixBlock("tr", "區間 / 區間快", nonReserved, nonReservedStations, start, end));
    }
    if (!reserved.length && !nonReserved.length) {
      renderEmpty(state, "這個範圍沒有符合條件的台鐵班次。");
    }
  }

  async function renderThsrTable(state) {
    const schedule = await ensureScheduleReady(state);
    if (!Object.keys(schedule).length) {
      renderEmpty(state, "目前還沒有高鐵真實時刻資料，請先更新頁面資料後再試。");
      return;
    }
    if (!syncStationControls(state)) {
      renderEmpty(state, "高鐵站點索引尚未完成，請稍後再試一次。");
      return;
    }
    const entries = buildThsrEntries(schedule);
    const start = normalizeThsrStation(state.startSelect.value);
    const end = normalizeThsrStation(state.endSelect.value);
    const pivot = normalizeThsrStation(state.pivotSelect.value);
    const range = getRailNetwork()?.findThsrRoutePath
      ? getRailNetwork().findThsrRoutePath(start, end, pivot)
      : ensureRange(start, end, state.stationOrder);
    if (range.length < 2) {
      renderEmpty(state, "找不到這組起訖站範圍。");
      return;
    }
    const direction = state.directionSelect?.value || "all";
    const rangeSet = new Set(range);
    const query = String(state.searchInput.value || "").trim();
    const filtered = entries
      .map((entry) => buildRouteProjection(entry, range))
      .filter((entry) => {
        if (!entry) return false;
        if (!matchesDirectionFilter(entry.trainNo, direction)) return false;
        if (query && !entry.trainNo.includes(query)) return false;
        if (pivot && !entry.routeCoveredSet?.has(pivot)) return false;
        return Array.from(entry.routeCoveredSet || []).some((station) => rangeSet.has(station));
      });
    const sorted = sortEntries(filtered, range, rangeSet, pivot);
    const stationList = getDisplayStationList(
      "thsr",
      state.onlyStopCheckbox.checked
        ? range.filter((station) => sorted.some((entry) => entry.routeStopMap?.has(station)))
        : range,
      direction
    );
    state.output.innerHTML = `
      <div class="rail-master-export-scope">
        <div class="rail-master-meta-line"></div>
      </div>
    `;
    const directionLabel = getTrainDirectionOptions("thsr").find((item) => item.value === direction)?.label || "全部";
    renderSummary(state, "高鐵時刻總表", `${getQueryDate() || "未指定日期"}｜方向 ${directionLabel}｜共 ${sorted.length} 班`);
    const scope = state.output.querySelector(".rail-master-export-scope");
    if (sorted.length) {
      scope.appendChild(createMatrixBlock("thsr", "高鐵班次", sorted, stationList, start, end));
    } else {
      renderEmpty(state, "這個範圍沒有符合條件的高鐵班次。");
    }
  }

  async function ensureScheduleReady(state) {
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

  async function renderTraTable(state) {
    const queryDate = getQueryDate();
    const schedules = await ensureScheduleReady(state);
    if (!schedules.length) {
      renderEmpty(state, "目前沒有可顯示的台鐵時刻總表資料。");
      return;
    }
    if (!syncStationControls(state)) {
      renderEmpty(state, "目前無法取得台鐵站序，請稍後再試。");
      return;
    }

    const entries = buildMasterEntries("tr", schedules);
    buildTraTypeControls(state, entries);

    const start = normalizeTraStation(state.startSelect.value);
    const end = normalizeTraStation(state.endSelect.value);
    const pivot = normalizeTraStation(state.pivotSelect.value);
    const rawRange = buildTraMasterRange(start, end, pivot, state.stationOrder);
    const range = canonicalizeRangeOrder(rawRange, state.stationOrder);
    if (range.length < 2) {
      renderEmpty(state, "目前無法建立這個區間的顯示範圍。");
      return;
    }

    const direction = state.directionSelect?.value || "all";
    const query = String(state.searchInput.value || "").trim();
    const filtered = entries
      .flatMap((entry) => buildMasterProjections("tr", entry, range, queryDate))
      .filter((entry) => {
        if (!entry) return false;
        if (entry.rangeDisplayDate !== queryDate) return false;
        if (state.selectedTypes.size && !state.selectedTypes.has(entry.type)) return false;
        if (!matchesDirectionFilter(entry.trainNo, direction)) return false;
        if (query && !entry.trainNo.includes(query)) return false;
        if (pivot && !entry.routeCoveredSet?.has(pivot)) return false;
        return true;
      });

    const reserved = sortProjectedEntries(
      filtered.filter((entry) => entry.isReserved),
      range,
      pivot,
      queryDate
    );
    const nonReserved = sortProjectedEntries(
      filtered.filter((entry) => !entry.isReserved),
      range,
      pivot,
      queryDate
    );
    const stationOrderSign = getDisplayStationOrderSign(direction, filtered);
    const reservedStations = getDisplayStationList(
      "tr",
      state.onlyStopCheckbox.checked
        ? range.filter((station) => reserved.some((entry) => entry.routeStopMap?.has(station)))
        : range,
      direction,
      filtered
    );
    const nonReservedStations = getDisplayStationList(
      "tr",
      state.onlyStopCheckbox.checked
        ? range.filter((station) => nonReserved.some((entry) => entry.routeStopMap?.has(station)))
        : range,
      direction,
      filtered
    );

    state.output.innerHTML = `
      <div class="rail-master-export-scope">
        <div class="rail-master-meta-line"></div>
      </div>
    `;
    const directionLabel = getTrainDirectionOptions("tr").find((item) => item.value === direction)?.label || "全部";
    renderSummary(
      state,
      "台鐵時刻總表",
      `${queryDate || "--"}｜${directionLabel}｜對號 ${reserved.length} 班｜非對號 ${nonReserved.length} 班`
    );
    const scope = state.output.querySelector(".rail-master-export-scope");
    if (reserved.length) {
      scope.appendChild(createMatrixBlock("tr", "對號列車", reserved, reservedStations, start, end, stationOrderSign));
    }
    if (nonReserved.length) {
      scope.appendChild(createMatrixBlock("tr", "非對號列車", nonReserved, nonReservedStations, start, end, stationOrderSign));
    }
    if (!reserved.length && !nonReserved.length) {
      renderEmpty(state, "這個日期與區間目前沒有符合條件的台鐵列車。");
    }
  }

  async function renderThsrTable(state) {
    const queryDate = getQueryDate();
    const schedules = await ensureScheduleReady(state);
    if (!schedules.length) {
      renderEmpty(state, "目前沒有可顯示的高鐵時刻總表資料。");
      return;
    }
    if (!syncStationControls(state)) {
      renderEmpty(state, "目前無法取得高鐵站序，請稍後再試。");
      return;
    }

    const entries = buildMasterEntries("thsr", schedules);
    const start = normalizeThsrStation(state.startSelect.value);
    const end = normalizeThsrStation(state.endSelect.value);
    const pivot = normalizeThsrStation(state.pivotSelect.value);
    const rawRange = getRailNetwork()?.findThsrRoutePath
      ? getRailNetwork().findThsrRoutePath(start, end, pivot)
      : ensureRange(start, end, state.stationOrder);
    const range = canonicalizeRangeOrder(rawRange, state.stationOrder);
    if (range.length < 2) {
      renderEmpty(state, "目前無法建立這個區間的顯示範圍。");
      return;
    }

    const direction = state.directionSelect?.value || "all";
    const query = String(state.searchInput.value || "").trim();
    const filtered = entries
      .flatMap((entry) => buildMasterProjections("thsr", entry, range, queryDate))
      .filter((entry) => {
        if (!entry) return false;
        if (entry.rangeDisplayDate !== queryDate) return false;
        if (!matchesDirectionFilter(entry.trainNo, direction)) return false;
        if (query && !entry.trainNo.includes(query)) return false;
        if (pivot && !entry.routeCoveredSet?.has(pivot)) return false;
        return true;
      });

    const sorted = sortProjectedEntries(filtered, range, pivot, queryDate);
    const stationOrderSign = getDisplayStationOrderSign(direction, sorted);
    const stationList = getDisplayStationList(
      "thsr",
      state.onlyStopCheckbox.checked
        ? range.filter((station) => sorted.some((entry) => entry.routeStopMap?.has(station)))
        : range,
      direction,
      sorted
    );

    state.output.innerHTML = `
      <div class="rail-master-export-scope">
        <div class="rail-master-meta-line"></div>
      </div>
    `;
    const directionLabel = getTrainDirectionOptions("thsr").find((item) => item.value === direction)?.label || "全部";
    renderSummary(state, "高鐵時刻總表", `${queryDate || "--"}｜${directionLabel}｜${sorted.length} 班`);
    const scope = state.output.querySelector(".rail-master-export-scope");
    if (sorted.length) {
      scope.appendChild(createMatrixBlock("thsr", "高鐵列車", sorted, stationList, start, end, stationOrderSign));
    } else {
      renderEmpty(state, "這個日期與區間目前沒有符合條件的高鐵列車。");
    }
  }

  async function renderMasterTable(state) {
    if (!(await ensureMasterTableAccess())) return;
    const button = state.renderButton;
    const exportButton = state.exportButton;
    const oldLabel = button.textContent;
    button.disabled = true;
    exportButton.disabled = true;
    button.textContent = "產生中...";
    try {
      if (state.system === "tr") await renderTraTable(state);
      else await renderThsrTable(state);
      if (state.output.querySelector(".rail-master-export-scope")) {
        exportButton.disabled = false;
      }
    } catch (error) {
      console.error(error);
      renderEmpty(state, "總表建立失敗，請稍後再試。");
    } finally {
      button.disabled = false;
      button.textContent = oldLabel;
    }
  }

  function resetState(state) {
    const defaults = getDefaultRange(state.system, state.stationOrder);
    state.startSelect.value = defaults.start;
    state.endSelect.value = defaults.end;
    state.pivotSelect.value = "";
    if (state.directionSelect) state.directionSelect.value = "all";
    state.searchInput.value = "";
    state.onlyStopCheckbox.checked = false;
    if (state.system === "tr") {
      state.selectedTypes = new Set(state.allTypes);
      buildTraTypeControls(state, []);
    }
    renderMasterTable(state);
  }

  function prepareExportClone(clone) {
    clone.style.width = "max-content";
    clone.style.maxWidth = "none";
    clone.style.minWidth = "fit-content";
    clone.style.overflow = "visible";
    clone.querySelectorAll(".rail-master-scroll").forEach((el) => {
      el.style.maxHeight = "none";
      el.style.overflow = "visible";
    });
    clone.querySelectorAll(".rail-master-table-shell").forEach((el) => {
      el.style.overflow = "visible";
      el.style.width = "max-content";
      el.style.maxWidth = "none";
    });
    clone.querySelectorAll(".rail-master-table").forEach((el) => {
      el.style.width = "max-content";
      el.style.minWidth = "auto";
    });
    clone.querySelectorAll(".rail-master-corner, .rail-master-station").forEach((el) => {
      el.style.position = "static";
      el.style.left = "auto";
      el.style.top = "auto";
    });
    clone.querySelectorAll(".rail-master-table thead").forEach((el) => {
      el.style.position = "static";
    });
  }

  async function exportMasterPdf(state) {
    const target = state.output.querySelector(".rail-master-export-scope");
    if (!target) return;
    const dateStr = getQueryDate() || "today";
    try {
      await downloadElementAsPdf(target, `${state.system}-master-table-${dateStr}.pdf`, {
        padding: 14,
        scale: 1.6,
        prepareClone: prepareExportClone,
      });
    } catch (error) {
      console.error(error);
      await printElementAsPdf(target, `${state.system}-master-table-${dateStr}`, {
        prepareClone: prepareExportClone,
      });
    }
  }

  function buildPanelHTML(system) {
    const isTra = system === "tr";
    const directionOptions = getTrainDirectionOptions(system)
      .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
      .join("");
    return `
      <div class="section-title">時刻總表</div>
      <p class="rail-master-lead">${isTra ? "依目前查詢日期的真實台鐵資料，以主線 / 支線實際路徑整理矩陣總表；起迄站會優先取最小路徑，並保留列車實際運行方向。" : "依目前查詢日期的真實高鐵資料，以起迄站最小路徑整理完整矩陣總表。"}</p>
      <div class="rail-master-toolbar">
        <div class="rail-master-control">
          <span>起</span>
          <select id="railMasterStart" class="rail-master-select"></select>
          <button id="railMasterSwap" class="btn-ghost rail-master-icon-btn" type="button" title="交換起訖">⇄</button>
          <span>迄</span>
          <select id="railMasterEnd" class="rail-master-select"></select>
        </div>
        <div class="rail-master-control">
          <span>經</span>
          <select id="railMasterPivot" class="rail-master-select"><option value="">-</option></select>
          <label class="rail-master-check">
            <input id="railMasterOnlyStop" type="checkbox">
            <span>僅停靠</span>
          </label>
        </div>
        <div class="rail-master-control">
          <span>方向</span>
          <select id="railMasterDirection" class="rail-master-select">${directionOptions}</select>
        </div>
        <div class="rail-master-control rail-master-search">
          <input id="railMasterTrainSearch" class="rail-master-input" type="text" placeholder="搜尋車次">
          <button id="railMasterRender" class="btn-primary" type="button">產生總表</button>
          <button id="railMasterReset" class="btn-ghost" type="button">重設</button>
          <button id="railMasterExportPdf" class="btn-ghost" type="button" disabled>匯出 PDF</button>
        </div>
      </div>
      ${
        isTra
          ? `
            <details class="rail-master-type-box">
              <summary>車種 <span id="railMasterTypeCount">(全)</span></summary>
              <div id="railMasterTypeDropdown"></div>
            </details>
          `
          : ""
      }
      <div id="railMasterOutput" class="rail-master-output">
        <div class="rail-master-empty">可直接產生目前查詢日期的時刻總表，並支援匯出 PDF。</div>
      </div>
    `;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .rail-master-panel{display:flex; flex-direction:column; gap:14px;}
      .rail-master-lead{margin:0; color:var(--text-muted); line-height:1.7;}
      .rail-master-toolbar{display:flex; flex-wrap:wrap; gap:10px;}
      .rail-master-control{display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:16px; border:1px solid var(--border); background:var(--bg-body);}
      .rail-master-control span{font-size:.85rem; color:var(--text-muted); font-weight:700;}
      .rail-master-search{flex:1 1 340px; justify-content:flex-end;}
      .rail-master-select,.rail-master-input{height:38px; border-radius:12px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-main); padding:0 12px; font:inherit;}
      .rail-master-select{min-width:112px;}
      .rail-master-input{min-width:120px; flex:1 1 120px;}
      .rail-master-icon-btn{min-width:38px; height:38px; padding:0 12px;}
      .rail-master-check{display:inline-flex; align-items:center; gap:6px; cursor:pointer; color:var(--text-main); font-size:.88rem;}
      .rail-master-type-box{border:1px solid var(--border); border-radius:16px; background:var(--bg-body); overflow:hidden;}
      .rail-master-type-box summary{cursor:pointer; list-style:none; padding:12px 14px; font-weight:700; display:flex; align-items:center; gap:8px;}
      .rail-master-type-box summary::-webkit-details-marker{display:none;}
      #railMasterTypeDropdown{padding:0 14px 14px; display:flex; flex-direction:column; gap:10px;}
      .rail-master-type-actions{display:flex; gap:8px; padding-top:2px;}
      .rail-master-mini-btn{padding:6px 10px !important; font-size:.82rem !important;}
      .rail-master-type-list{display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:8px;}
      .rail-master-type-item{display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:12px; border:1px solid var(--border); background:var(--bg-surface); font-size:.88rem; cursor:pointer;}
      .rail-master-type-dot{width:10px; height:10px; border-radius:50%; flex:0 0 auto;}
      .rail-master-type-item input{margin-left:auto;}
      .rail-master-output{display:flex; flex-direction:column; gap:14px;}
      .rail-master-export-scope{display:flex; flex-direction:column; gap:14px;}
      .rail-master-meta-line{display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; padding:12px 14px; border-radius:16px; border:1px solid var(--border); background:var(--bg-body);}
      .rail-master-meta-line strong{font-size:.96rem;}
      .rail-master-meta-line span{color:var(--text-muted); font-size:.88rem;}
      .rail-master-block{display:flex; flex-direction:column; gap:8px;}
      .rail-master-section-title{display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:1rem; font-weight:800; color:var(--text-main);}
      .rail-master-section-title span{font-size:.86rem; color:var(--text-muted);}
      .rail-master-table-shell{border:1px solid var(--border); border-radius:18px; background:var(--bg-surface); overflow:hidden;}
      .rail-master-scroll{overflow:auto; max-height:70vh;}
      .rail-master-table{border-collapse:separate; border-spacing:0; width:max-content; min-width:100%;}
      .rail-master-table th,.rail-master-table td{padding:6px 4px; text-align:center; border-right:1px solid var(--border); border-bottom:1px solid var(--border); font-size:11px; background-clip:padding-box;}
      .rail-master-table thead{position:sticky; top:0; z-index:20;}
      .rail-master-corner{position:sticky; left:0; top:0; z-index:30; min-width:74px; background:var(--bg-surface); border-right:2px solid var(--border); border-bottom:2px solid var(--border); color:var(--text-muted);}
      .rail-master-train-header{position:sticky; top:0; z-index:20; min-width:58px; height:114px; vertical-align:top; background:var(--bg-surface);}
      .rail-master-train-stack{display:flex; flex-direction:column; justify-content:space-between; height:100%;}
      .rail-master-train-no{display:block; font-weight:900; font-size:12px;}
      .rail-master-train-type{display:block; margin-top:2px; font-size:11px; font-weight:700; line-height:1.25;}
      .rail-master-route-stack{margin-top:auto; display:flex; flex-direction:column; align-items:center; gap:3px;}
      .rail-master-route{color:var(--text-muted); font-size:10px; line-height:1.2;}
      .rail-master-train-duration{display:inline-flex; align-items:center; justify-content:center; padding:2px 5px; border-radius:999px; background:rgba(59,130,246,0.12); color:#2563eb; font-size:10px; font-weight:800;}
      .rail-master-station{position:sticky; left:0; z-index:15; min-width:74px; background:var(--bg-surface); border-right:2px solid var(--border); font-weight:800; color:var(--text-main);}
      .rail-master-time{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-variant-numeric:tabular-nums; white-space:nowrap;}
      .rail-master-pass{color:#cbd5e1;}
      .rail-master-inline-badge{display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:16px; margin-left:4px; padding:0 4px; border-radius:999px; font-size:10px; font-weight:800; border:1px solid currentColor;}
      .rail-master-inline-badge.sea{color:#2563eb;}
      .rail-master-thsr-tag{color:#ea580c;}
      .rail-master-empty{padding:14px 16px; border-radius:16px; border:1px dashed var(--border); color:var(--text-muted); background:color-mix(in srgb, var(--bg-body) 85%, transparent); line-height:1.7;}
      .rail-modal-actions{display:flex; align-items:center; gap:8px; margin-left:auto; padding-left:12px;}
      .rail-modal-export-btn{border:1px solid var(--border); background:var(--bg-surface); color:var(--text-main); border-radius:12px; padding:8px 10px; font:inherit; font-size:.86rem; cursor:pointer; white-space:nowrap;}
      .rail-modal-export-btn:hover{transform:translateY(-1px);}
      @media (max-width: 860px){
        .rail-master-search{flex:1 1 100%; justify-content:flex-start;}
        .rail-master-table-shell{border-radius:16px;}
      }
      @media (max-width: 640px){
        .rail-master-toolbar{gap:8px;}
        .rail-master-control{width:100%; flex-wrap:wrap; justify-content:flex-start; border-radius:14px;}
        .rail-master-search{flex-direction:row; align-items:center;}
        .rail-master-select,.rail-master-input{min-width:0; flex:1 1 140px;}
        .rail-master-table th,.rail-master-table td{padding:5px 4px; font-size:10px;}
        .rail-master-corner,.rail-master-station{min-width:64px;}
        .rail-master-train-header{min-width:52px; height:108px;}
        .rail-modal-actions{width:100%; margin-left:0; padding-left:0; padding-top:10px; justify-content:flex-end;}
      }
    `;
    document.head.appendChild(style);
  }

  function buildState(system, panel) {
    const stationOrder = getStationOrder(system);
    const defaults = getDefaultRange(system, stationOrder);
    const state = {
      system,
      panel,
      stationOrder,
      allTypes: [],
      selectedTypes: new Set(),
      startSelect: panel.querySelector("#railMasterStart"),
      endSelect: panel.querySelector("#railMasterEnd"),
      pivotSelect: panel.querySelector("#railMasterPivot"),
      directionSelect: panel.querySelector("#railMasterDirection"),
      searchInput: panel.querySelector("#railMasterTrainSearch"),
      onlyStopCheckbox: panel.querySelector("#railMasterOnlyStop"),
      renderButton: panel.querySelector("#railMasterRender"),
      resetButton: panel.querySelector("#railMasterReset"),
      exportButton: panel.querySelector("#railMasterExportPdf"),
      output: panel.querySelector("#railMasterOutput"),
    };
    createSelectOptions(state.startSelect, stationOrder, defaults.start);
    createSelectOptions(state.endSelect, stationOrder, defaults.end);
    state.pivotSelect.insertAdjacentHTML("beforeend", stationOrder.map((station) => `<option value="${escapeAttr(station)}">${escapeHtml(station)}</option>`).join(""));
    state.startSelect.value = defaults.start;
    state.endSelect.value = defaults.end;
    if (state.directionSelect) state.directionSelect.value = "all";
    return state;
  }

  function syncStationControls(state) {
    const nextOrder = getStationOrder(state.system);
    if (!nextOrder.length) return false;
    const changed =
      nextOrder.length !== state.stationOrder.length ||
      nextOrder.some((station, index) => station !== state.stationOrder[index]);
    if (!changed) return true;
    const previousStart = state.startSelect.value;
    const previousEnd = state.endSelect.value;
    const previousPivot = state.pivotSelect.value;
    const defaults = getDefaultRange(state.system, nextOrder);
    state.stationOrder = nextOrder;
    createSelectOptions(state.startSelect, nextOrder, nextOrder.includes(previousStart) ? previousStart : defaults.start);
    createSelectOptions(state.endSelect, nextOrder, nextOrder.includes(previousEnd) ? previousEnd : defaults.end);
    state.pivotSelect.innerHTML = '<option value="">-</option>' + nextOrder.map((station) => `<option value="${escapeAttr(station)}">${escapeHtml(station)}</option>`).join("");
    if (previousPivot && nextOrder.includes(previousPivot)) state.pivotSelect.value = previousPivot;
    return true;
  }

  function placeAfterAi(tab, panel) {
    const grid = document.querySelector("main .grid");
    const tabs = grid?.querySelector(".query-tabs");
    const aiTab = document.getElementById("tab-ai");
    const aiPanel = document.getElementById("panel-ai");
    if (tabs && tab && aiTab?.parentElement === tabs && aiTab.nextElementSibling !== tab) {
      aiTab.insertAdjacentElement("afterend", tab);
    }
    if (grid && panel && aiPanel?.parentElement === grid && aiPanel.nextElementSibling !== panel) {
      aiPanel.insertAdjacentElement("afterend", panel);
    }
  }

  function insertMasterPanel(system) {
    const grid = document.querySelector("main .grid");
    const tabs = grid?.querySelector(".query-tabs");
    if (!grid || !tabs || document.getElementById(PANEL_ID)) return null;

    const tab = document.createElement("button");
    tab.className = "query-tab";
    tab.id = TAB_ID;
    tab.type = "button";
    tab.dataset.target = PANEL_ID;
    tab.textContent = "時刻總表";

    const aiTab = document.getElementById("tab-ai");
    if (aiTab?.parentElement === tabs) aiTab.insertAdjacentElement("afterend", tab);
    else tabs.appendChild(tab);

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "card query-panel rail-master-panel hidden";
    panel.innerHTML = buildPanelHTML(system);

    const aiPanel = document.getElementById("panel-ai");
    if (aiPanel?.parentElement === grid) aiPanel.insertAdjacentElement("afterend", panel);
    else {
      const lastPanel = Array.from(grid.querySelectorAll(".query-panel")).slice(-1)[0];
      if (lastPanel) lastPanel.insertAdjacentElement("afterend", panel);
      else tabs.insertAdjacentElement("afterend", panel);
    }

    placeAfterAi(tab, panel);
    return { tab, panel };
  }

  function bindMasterPanel(state, tab) {
    const render = () => renderMasterTable(state);
    tab.addEventListener("click", async () => {
      if (!(await ensureMasterTableAccess())) return;
      window.switchQueryPanel?.(PANEL_ID);
      if (!state.output.querySelector(".rail-master-export-scope")) render();
    });
    state.renderButton.addEventListener("click", async () => {
      if (!(await ensureMasterTableAccess())) return;
      render();
    });
    state.exportButton.addEventListener("click", () => exportMasterPdf(state));
    state.resetButton.addEventListener("click", () => resetState(state));
    state.panel.querySelector("#railMasterSwap")?.addEventListener("click", () => {
      const temp = state.startSelect.value;
      state.startSelect.value = state.endSelect.value;
      state.endSelect.value = temp;
      render();
    });
    [state.startSelect, state.endSelect, state.pivotSelect, state.directionSelect, state.onlyStopCheckbox].forEach((el) => {
      el?.addEventListener("change", render);
    });
    let timer = null;
    state.searchInput?.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(render, 180);
    });
    document.getElementById("mainQueryDate")?.addEventListener("change", () => {
      if (!state.panel.classList.contains("hidden")) render();
    });
  }

  function buildModalFilename(system) {
    const ctx = readPageValue("modalCtx");
    const tag = ctx?.trainNo ? `-${ctx.trainNo}` : "";
    return sanitizeFilename(`${system}-detail${tag}`);
  }

  function prepareModalClone(clone) {
    clone.querySelector(".rail-modal-actions")?.remove();
    clone.querySelectorAll(".close, #modalClose").forEach((el) => el.remove());
    clone.style.maxHeight = "none";
    clone.style.height = "auto";
    clone.style.maxWidth = "none";
    clone.style.overflow = "visible";
    clone.querySelectorAll(".modal-body").forEach((el) => {
      el.style.maxHeight = "none";
      el.style.height = "auto";
      el.style.overflow = "visible";
    });
  }

  function initModalCapture(system) {
    return;
    const modal = document.getElementById("trainModal");
    const header = modal?.querySelector(".modal-header");
    const content = modal?.querySelector(".modal-content");
    if (!modal || !header || !content || header.querySelector(".rail-modal-actions")) return;
    const actions = document.createElement("div");
    actions.className = "rail-modal-actions";
    actions.innerHTML = `
      <button type="button" class="rail-modal-export-btn" data-export="image">下載圖片</button>
      <button type="button" class="rail-modal-export-btn" data-export="share">分享圖片</button>
    `;
    const closeButton = header.querySelector("#modalClose") || header.querySelector(".close");
    if (closeButton) closeButton.insertAdjacentElement("beforebegin", actions);
    else header.appendChild(actions);

    const clickHandler = async (mode) => {
      if (modal.style.display !== "flex") return;
      const filename = buildModalFilename(system);
      const button = actions.querySelector(`[data-export="${mode}"]`);
      const original = button.textContent;
      button.disabled = true;
      button.textContent = mode === "share" ? "整理中..." : "匯出中...";
      try {
        if (mode === "share") {
          await shareElementAsImage(content, `${filename}.png`, {
            title: "列車資訊",
            prepareClone: prepareModalClone,
            padding: 12,
            scale: 1.5,
          });
        } else {
          await downloadElementAsImage(content, `${filename}.png`, {
            prepareClone: prepareModalClone,
            padding: 12,
            scale: 1.5,
          });
        }
      } catch (error) {
        console.error(error);
        alert("圖片匯出失敗，請稍後再試。");
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    };

    actions.querySelector('[data-export="image"]')?.addEventListener("click", () => clickHandler("image"));
    actions.querySelector('[data-export="share"]')?.addEventListener("click", () => clickHandler("share"));
  }

  function init() {
    const system = getSystem();
    if (system !== "tr" && system !== "thsr") return;
    injectStyles();
    const inserted = insertMasterPanel(system);
    if (!inserted) {
      initModalCapture(system);
      return;
    }
    const state = buildState(system, inserted.panel);
    bindMasterPanel(state, inserted.tab);
    initModalCapture(system);
    const syncPlacement = () => placeAfterAi(inserted.tab, inserted.panel);
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
