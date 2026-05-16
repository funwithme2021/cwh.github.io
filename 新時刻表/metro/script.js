// 車站資料
const stations = [
  { code: "BL01", name: "頂埔", en: "Dingpu", city: "新北市", district: "土城區", distanceFromPrev: 0.00, cumulativeDistance: 0.00, transfer: ["三鶯線"] },
  { code: "BL02", name: "永寧", en: "Yongning", distanceFromPrev: 1.95, cumulativeDistance: 1.95, transfer: ["萬大樹林線 LB12"] },
  { code: "BL03", name: "土城", en: "Tucheng", distanceFromPrev: 1.11, cumulativeDistance: 3.06, transfer: ["萬大樹林線"] },
  { code: "BL04", name: "海山", en: "Haishan", distanceFromPrev: 1.47, cumulativeDistance: 4.53, transfer: [] },
  { code: "BL05", name: "亞東醫院", en: "Far Eastern Hospital", city: "新北市", district: "板橋區", distanceFromPrev: 1.64, cumulativeDistance: 6.17, transfer: [] },
  { code: "BL06", name: "府中", en: "Fuzhong", distanceFromPrev: 1.45, cumulativeDistance: 7.45, transfer: [] },
  { code: "BL07", name: "板橋", en: "Banqiao", distanceFromPrev: 0.65, cumulativeDistance: 8.10, transfer: ["環狀線", "台鐵", "台灣高鐵"] },
  { code: "BL08", name: "新埔", en: "Xinpu", distanceFromPrev: 1.28, cumulativeDistance: 9.38, transfer: ["環狀線：新埔民生"] },
  { code: "BL09", name: "江子翠", en: "Jiangzicui", distanceFromPrev: 0.87, cumulativeDistance: 10.25, transfer: [] },
  { code: "BL10", name: "龍山寺", en: "Longshan Temple", city: "臺北市", district: "萬華區", distanceFromPrev: 3.08, cumulativeDistance: 13.33, transfer: [] },
  { code: "BL11", name: "西門", en: "Ximen", city: "臺北市", district: "中正區", distanceFromPrev: 1.31, cumulativeDistance: 14.64, transfer: ["松山新店線"] },
  { code: "BL12", name: "台北車站", en: "Taipei Main Station", distanceFromPrev: 1.35, cumulativeDistance: 15.99, transfer: ["淡水信義線", "台鐵", "台灣高鐵", "桃園機場捷運"] },
  { code: "BL13", name: "善導寺", en: "Shandao Temple", distanceFromPrev: 0.68, cumulativeDistance: 16.67, transfer: [] },
  { code: "BL14", name: "忠孝新生", en: "Zhongxiao Xinsheng", distanceFromPrev: 0.94, cumulativeDistance: 17.61, transfer: ["中和新蘆線"] },
  { code: "BL15", name: "忠孝復興", en: "Zhongxiao Fuxing", city: "臺北市", district: "大安區", distanceFromPrev: 1.12, cumulativeDistance: 18.73, transfer: ["文湖線"] },
  { code: "BL16", name: "忠孝敦化", en: "Zhongxiao Dunhwa", distanceFromPrev: 0.67, cumulativeDistance: 19.40, transfer: [] },
  { code: "BL17", name: "國父紀念館", en: "Sun Yat-Sen Memorial Hall", city: "臺北市", district: "信義區", distanceFromPrev: 0.73, cumulativeDistance: 20.13, transfer: [] },
  { code: "BL18", name: "市政府", en: "Taipei City Hall", distanceFromPrev: 0.84, cumulativeDistance: 20.97, transfer: [] },
  { code: "BL19", name: "永春", en: "Yongchun", distanceFromPrev: 0.99, cumulativeDistance: 21.96, transfer: ["環狀線"] },
  { code: "BL20", name: "後山埤", en: "Houshanpi", city: "臺北市", district: "南港區", distanceFromPrev: 0.82, cumulativeDistance: 22.78, transfer: [] },
  { code: "BL21", name: "昆陽", en: "Kunyang", distanceFromPrev: 1.36, cumulativeDistance: 24.14, transfer: [] },
  { code: "BL22", name: "南港", en: "Nangang", distanceFromPrev: 1.42, cumulativeDistance: 25.56, transfer: ["基隆捷運", "台鐵", "台灣高鐵"] },
  { code: "BL23", name: "南港展覽館", en: "Taipei Nangang Exhibition Center", distanceFromPrev: 1.09, cumulativeDistance: 26.65, transfer: ["文湖線", "基隆捷運"] }
];

const defaultSchedules = [
  { id: "001", origin: "頂埔", destination: "南港展覽館", departureTime: "07:00", direction: "east", isExtra: false, enabled: true },
  { id: "003", origin: "頂埔", destination: "南港展覽館", departureTime: "07:06", direction: "east", isExtra: false, enabled: true },
  { id: "005", origin: "頂埔", destination: "南港展覽館", departureTime: "07:12", direction: "east", isExtra: false, enabled: true },
  { id: "002", origin: "南港展覽館", destination: "頂埔", departureTime: "07:03", direction: "west", isExtra: false, enabled: true },
  { id: "004", origin: "南港展覽館", destination: "頂埔", departureTime: "07:09", direction: "west", isExtra: false, enabled: true }
];

// 班表資料
let schedules = [];
// 加班車資料
let extraTrains = [];
// 事件紀錄
let eventLogs = [];

const BIG_STATION_DWELL = {
  "府中": 35,
  "板橋": 40,
  "新埔": 35,
  "龍山寺": 40,
  "西門": 40,
  "台北車站": 50,
  "忠孝新生": 40,
  "忠孝復興": 45,
  "忠孝敦化": 35,
  "市政府": 40,
  "南港": 40
};
const PEAK_STATIONS = ["府中", "板橋", "新埔", "龍山寺", "西門", "台北車站", "忠孝新生", "忠孝復興", "忠孝敦化", "市政府", "南港"];
const SAFE_TRAIN_SPACING_KM = 0.8;
const HARD_BRAKE_SPACING_KM = 0.35;
const RANDOM_EVENTS = [
  { text: "車門重開", min: 20, max: 90, probability: 0.018 },
  { text: "旅客身體不適", min: 60, max: 180, probability: 0.008 },
  { text: "訊號確認", min: 30, max: 120, probability: 0.012 },
  { text: "月台人潮眾多", min: 20, max: 80, probability: 0.018 }
];

let simulationSeconds = 7 * 3600;
let isRunning = false;
let speedMultiplier = 1;
let avgSpeedKmh = 38;
let lastTick = null;
let timerId = null;
let currentFilter = "all";
let routeMetrics = { left: 48, right: 1552, width: 1504 };
let trainSnapshots = new Map();

function initApp() {
  schedules = defaultSchedules.map(createTrain);
  assignRegularTrainNumbers();
  fillStationSelects();
  initTimeSelects();
  bindEvents();
  updateScheduleAutoIdPreview();
  renderRoute();
  updateSimulationTime();
  timerId = window.setInterval(tick, 250);
}

function fillStationSelects() {
  const ids = ["scheduleOrigin", "scheduleDestination", "extraOrigin", "extraDestination", "editOrigin", "editDestination"];
  ids.forEach((id) => {
    const select = document.getElementById(id);
    select.innerHTML = stations.map((station) => `<option value="${station.name}">${station.code} ${station.name}</option>`).join("");
  });
  document.getElementById("scheduleDestination").value = "南港展覽館";
  document.getElementById("extraDestination").value = "南港展覽館";
  ["scheduleOrigin", "scheduleDestination", "scheduleDepartureHour", "scheduleDepartureMinute"].forEach((id) => {
    document.getElementById(id).addEventListener("change", updateScheduleAutoIdPreview);
  });
}

function initTimeSelects() {
  setupTimeSelect("scheduleDeparture", "07:18");
  setupTimeSelect("extraDeparture", "07:20");
  setupTimeSelect("editDeparture", "07:00");
}

function setupTimeSelect(prefix, initialTime) {
  const hourSelect = document.getElementById(`${prefix}Hour`);
  const minuteSelect = document.getElementById(`${prefix}Minute`);
  if (!hourSelect || !minuteSelect) return;
  hourSelect.innerHTML = Array.from({ length: 24 }, (_, hour) => {
    const value = String(hour).padStart(2, "0");
    return `<option value="${value}">${value} 時</option>`;
  }).join("");
  minuteSelect.innerHTML = Array.from({ length: 60 }, (_, minute) => {
    const value = String(minute).padStart(2, "0");
    return `<option value="${value}">${value} 分</option>`;
  }).join("");
  setTimeSelectValue(prefix, initialTime);
}

function bindEvents() {
  document.querySelectorAll(".workspace-tabs button").forEach((button) => {
    button.addEventListener("click", () => switchWorkspace(button.dataset.view));
  });
  document.getElementById("startBtn").addEventListener("click", () => {
    isRunning = true;
    lastTick = performance.now();
  });
  document.getElementById("pauseBtn").addEventListener("click", () => {
    isRunning = false;
  });
  document.getElementById("resetBtn").addEventListener("click", resetSimulation);
  document.getElementById("setTimeBtn").addEventListener("click", () => {
    applyManualTime();
  });
  document.getElementById("manualTime").addEventListener("change", applyManualTime);
  document.getElementById("speedSelect").addEventListener("change", (event) => {
    speedMultiplier = Number(event.target.value);
    updateTopStats();
  });
  document.getElementById("avgSpeed").addEventListener("input", (event) => {
    avgSpeedKmh = Number(event.target.value);
    document.getElementById("speedValue").textContent = avgSpeedKmh;
    rebuildAllPlans();
    recalculateAll();
  });
  document.getElementById("scheduleForm").addEventListener("submit", addSchedule);
  document.getElementById("extraForm").addEventListener("submit", addExtraTrain);
  document.getElementById("clearLogsBtn").addEventListener("click", () => {
    eventLogs = [];
    renderEventLogs();
  });
  document.getElementById("trainFilters").addEventListener("click", (event) => {
    if (!event.target.matches("button")) return;
    currentFilter = event.target.dataset.filter;
    document.querySelectorAll("#trainFilters button").forEach((button) => button.classList.remove("active"));
    event.target.classList.add("active");
    renderTrainTable();
    renderTrains();
  });
  document.getElementById("closeDialog").addEventListener("click", () => {
    document.getElementById("detailDialog").close();
  });
  document.getElementById("closeEditDialog").addEventListener("click", () => {
    document.getElementById("editTrainDialog").close();
  });
  document.getElementById("editTrainForm").addEventListener("submit", saveTrainEdit);
  document.getElementById("deleteTrainBtn").addEventListener("click", deleteEditingTrain);
  ["extraId", "editTrainId"].forEach((id) => {
    document.getElementById(id).addEventListener("input", (event) => {
      event.target.value = event.target.value.replace(/\D/g, "");
    });
  });
}

// 繪製路線
function renderRoute() {
  const canvas = document.getElementById("routeCanvas");
  const totalDistance = stations.at(-1).cumulativeDistance;
  const canvasWidth = Math.max(1600, window.innerWidth > 0 ? window.innerWidth * 1.4 : 1600);
  routeMetrics = { left: 54, right: canvasWidth - 54, width: canvasWidth - 108 };
  canvas.style.minWidth = `${canvasWidth}px`;
  canvas.innerHTML = '<div class="route-line"></div>';

  stations.forEach((station, index) => {
    const left = distanceToLeft(station.cumulativeDistance);
    const node = document.createElement("button");
    node.className = `station-node ${station.transfer.length ? "transfer" : ""}`;
    node.style.left = `${left}px`;
    node.title = `${station.code} ${station.name}`;
    node.addEventListener("click", () => showStationDetail(station));
    canvas.appendChild(node);

    const label = document.createElement("div");
    label.className = `station-label ${index % 2 === 0 ? "top" : "bottom"}`;
    label.style.left = `${left}px`;
    label.innerHTML = `<em>${station.code}</em><strong>${station.name}</strong><span>${station.en}</span>`;
    canvas.appendChild(label);

    const distance = document.createElement("div");
    distance.className = "distance-tick";
    distance.style.left = `${left}px`;
    distance.textContent = `${station.cumulativeDistance.toFixed(2)} km`;
    canvas.appendChild(distance);
  });

  function distanceToLeft(distance) {
    return routeMetrics.left + (distance / totalDistance) * routeMetrics.width;
  }
}

// 新增班次
function addSchedule(event) {
  event.preventDefault();
  const origin = document.getElementById("scheduleOrigin").value;
  const destination = document.getElementById("scheduleDestination").value;
  const raw = {
    id: "",
    origin,
    destination,
    departureTime: getTimeSelectValue("scheduleDeparture"),
    direction: inferDirection(origin, destination),
    isExtra: false,
    enabled: document.getElementById("scheduleEnabled").checked
  };
  if (!validateTrip(raw)) return;
  const train = createTrain(raw);
  schedules.push(train);
  assignRegularTrainNumbers();
  event.target.reset();
  document.getElementById("scheduleEnabled").checked = true;
  document.getElementById("scheduleDestination").value = "南港展覽館";
  setTimeSelectValue("scheduleDeparture", "07:18");
  updateScheduleAutoIdPreview();
  recalculateAll();
}

// 新增加班車
function addExtraTrain(event) {
  event.preventDefault();
  const mode = document.getElementById("extraMode").value;
  const raw = {
    id: normalizeTrainNumber(document.getElementById("extraId").value.trim()),
    origin: document.getElementById("extraOrigin").value,
    destination: document.getElementById("extraDestination").value,
    departureTime: mode === "now" ? secondsToTimeInput(simulationSeconds) : getTimeSelectValue("extraDeparture"),
    direction: "",
    isExtra: true,
    enabled: true,
    note: document.getElementById("extraNote").value.trim()
  };
  if (!validateTrip(raw)) return;
  raw.id = normalizeTrainNumber(raw.id);
  raw.direction = inferDirection(raw.origin, raw.destination);
  const train = createTrain(raw);
  schedules.push(train);
  extraTrains.push(train);
  logEvent(train, raw.origin, raw.note || "即時加班車加入營運", 0);
  event.target.reset();
  document.getElementById("extraDestination").value = "南港展覽館";
  setTimeSelectValue("extraDeparture", "07:20");
  recalculateAll();
}

// 更新模擬時間
function updateSimulationTime() {
  const text = formatTime(simulationSeconds);
  document.getElementById("currentTime").textContent = text;
  document.getElementById("topCurrentTime").textContent = text;
  const manualTime = document.getElementById("manualTime");
  if (document.activeElement !== manualTime) {
    manualTime.value = secondsToTimeInput(simulationSeconds);
  }
  renderTrains();
  renderTrainTable();
  updateTopStats();
}

function applyManualTime() {
  const value = document.getElementById("manualTime").value;
  if (!value) return;
  simulationSeconds = timeToSeconds(value);
  lastTick = performance.now();
  recalculateAll();
}

function tick() {
  if (!isRunning) return;
  const now = performance.now();
  if (lastTick === null) lastTick = now;
  const elapsed = (now - lastTick) / 1000;
  lastTick = now;
  simulationSeconds = (simulationSeconds + elapsed * speedMultiplier) % 86400;
  updateSimulationTime();
}

function createTrain(data) {
  const train = {
    ...data,
    direction: data.direction || inferDirection(data.origin, data.destination),
    delaySeconds: 0,
    eventNote: data.note || "",
    events: [],
    triggeredStops: new Set(),
    spacingDelayUntil: 0,
    trafficLogUntil: 0,
    plan: []
  };
  train.plan = buildTrainPlan(train);
  return train;
}

function buildTrainPlan(train) {
  const originIndex = stationIndex(train.origin);
  const destinationIndex = stationIndex(train.destination);
  const step = originIndex < destinationIndex ? 1 : -1;
  const departure = timeToSeconds(train.departureTime);
  let clock = departure;
  const plan = [];

  for (let index = originIndex; index !== destinationIndex; index += step) {
    const station = stations[index];
    const nextStation = stations[index + step];
    const dwell = index === originIndex ? 0 : getBaseDwell(station.name);
    const arrive = index === originIndex ? departure : clock;
    const depart = arrive + dwell;
    const distanceKm = Math.abs(nextStation.cumulativeDistance - station.cumulativeDistance);
    const runSeconds = Math.max(20, (distanceKm / avgSpeedKmh) * 3600);
    plan.push({
      stationIndex: index,
      station,
      nextStation,
      arrive,
      depart,
      leaveDistance: station.cumulativeDistance,
      nextDistance: nextStation.cumulativeDistance,
      runSeconds
    });
    clock = depart + runSeconds;
  }

  const terminal = stations[destinationIndex];
  plan.push({
    stationIndex: destinationIndex,
    station: terminal,
    nextStation: null,
    arrive: clock,
    depart: clock,
    leaveDistance: terminal.cumulativeDistance,
    nextDistance: terminal.cumulativeDistance,
    runSeconds: 0
  });
  return plan;
}

// 計算列車位置
function calculateTrainPosition(train, currentTime) {
  if (!train.enabled) return makeSnapshot(train, "未發車", "未啟用", null, null, stationDistance(train.origin), 0);
  const adjustedNow = currentTime - train.delaySeconds;
  const first = train.plan[0];
  const last = train.plan.at(-1);

  if (adjustedNow < first.arrive) {
    return makeSnapshot(train, "未發車", "未發車", first.station, first.nextStation, first.leaveDistance, 0);
  }

  if (adjustedNow >= last.arrive) {
    return makeSnapshot(train, "已抵達終點", "已抵達終點", last.station, null, last.leaveDistance, 1);
  }

  for (const segment of train.plan) {
    if (!segment.nextStation) continue;
    const dwellEnd = segment.depart;
    if (adjustedNow >= segment.arrive && adjustedNow < dwellEnd) {
      maybeGenerateStationEvents(train, segment.station, currentTime);
      return makeSnapshot(train, "停靠中", `停靠中：${segment.station.name}`, segment.station, segment.nextStation, segment.leaveDistance, routeProgress(segment.leaveDistance));
    }
    if (adjustedNow >= dwellEnd && adjustedNow < dwellEnd + segment.runSeconds) {
      const ratio = (adjustedNow - dwellEnd) / segment.runSeconds;
      const distance = segment.leaveDistance + (segment.nextDistance - segment.leaveDistance) * ratio;
      return makeSnapshot(train, "準點行駛", `行駛中：${segment.station.name} → ${segment.nextStation.name}`, segment.station, segment.nextStation, distance, routeProgress(distance));
    }
  }

  return makeSnapshot(train, "未發車", "未發車", first.station, first.nextStation, first.leaveDistance, 0);
}

// 判斷列車狀態
function getTrainStatus(train, currentTime) {
  const snapshot = trainSnapshots.get(train.id) || calculateTrainPosition(train, currentTime);
  if (snapshot.state === "已抵達終點" || snapshot.state === "未發車") return snapshot.state;
  if (snapshot.controlState === "hold") return "停等";
  if (snapshot.controlState === "brake") return "煞車調速";
  if (train.delaySeconds >= 180) return "嚴重延誤";
  if (train.delaySeconds > 0 || train.spacingDelayUntil > currentTime) return "誤點";
  return snapshot.state;
}

// 模擬尖峰延誤
function simulatePeakDelay(train, station) {
  if (!PEAK_STATIONS.includes(station.name) || !isPeakTime(simulationSeconds)) return 0;
  if (Math.random() > 0.32) return 0;
  const delay = randomInt(10, 60);
  train.delaySeconds += delay;
  train.eventNote = "尖峰人潮較多，停靠時間延長";
  logEvent(train, station.name, train.eventNote, delay);
  return delay;
}

// 模擬隨機事件
function simulateRandomEvent(train, station) {
  for (const event of RANDOM_EVENTS) {
    if (Math.random() <= event.probability) {
      const delay = randomInt(event.min, event.max);
      train.delaySeconds += delay;
      train.eventNote = `${event.text}，延誤 ${delay} 秒`;
      logEvent(train, station.name, event.text, delay);
      return delay;
    }
  }
  return 0;
}

// 判斷前車影響
function checkTrainSpacing(train, allTrains) {
  const snapshot = trainSnapshots.get(train.id);
  if (!snapshot || snapshot.state === "未發車" || snapshot.state === "已抵達終點") return "";
  const sameDirectionSnapshots = allTrains
    .filter((other) => other.id !== train.id && other.enabled && other.direction === train.direction)
    .map((other) => trainSnapshots.get(other.id))
    .filter((other) => other && other.state !== "未發車" && other.state !== "已抵達終點");

  const ahead = sameDirectionSnapshots
    .map((other) => ({
      snapshot: other,
      gap: train.direction === "east"
        ? other.distanceKm - snapshot.distanceKm
        : snapshot.distanceKm - other.distanceKm
    }))
    .filter((item) => item.gap > 0)
    .sort((a, b) => a.gap - b.gap)[0];

  if (!ahead || ahead.gap >= SAFE_TRAIN_SPACING_KM) {
    snapshot.controlState = "";
    return "";
  }

  const front = ahead.snapshot;
  const mustHold = ahead.gap < HARD_BRAKE_SPACING_KM || front.state === "停靠中" || front.controlState === "hold";
  const message = mustHold ? "前方列車尚未移動，停等中" : "前方塞車，煞車調整速度";
  const safeDistance = train.direction === "east"
    ? front.distanceKm - SAFE_TRAIN_SPACING_KM
    : front.distanceKm + SAFE_TRAIN_SPACING_KM;
  const originDistance = stationDistance(train.origin);
  const destinationDistance = stationDistance(train.destination);
  const minDistance = Math.min(originDistance, destinationDistance);
  const maxDistance = Math.max(originDistance, destinationDistance);
  const controlledDistance = Math.min(maxDistance, Math.max(minDistance, safeDistance));

  snapshot.distanceKm = controlledDistance;
  snapshot.progress = routeProgress(controlledDistance);
  snapshot.controlState = mustHold ? "hold" : "brake";
  snapshot.state = mustHold ? "停等" : "煞車調速";
  snapshot.locationText = `${message}：${snapshot.currentStation.name} → ${snapshot.nextStation ? snapshot.nextStation.name : train.destination}`;
  train.eventNote = mustHold ? "前方列車尚未離站，本站停等" : "受前車影響煞車調速";

  if (simulationSeconds > train.spacingDelayUntil) {
    const delay = mustHold ? 15 : 6;
    train.delaySeconds += delay;
    train.spacingDelayUntil = simulationSeconds + 45;
  }

  if (simulationSeconds > train.trafficLogUntil) {
    logEvent(train, snapshot.currentStation.name, train.eventNote, mustHold ? 15 : 6);
    train.trafficLogUntil = simulationSeconds + 90;
  }

  return train.eventNote;
}

// 更新列車畫面
function renderTrains() {
  const canvas = document.getElementById("routeCanvas");
  canvas.querySelectorAll(".train-pill").forEach((node) => node.remove());
  const trains = getAllTrains();
  trainSnapshots = new Map();
  trains.forEach((train) => {
    trainSnapshots.set(train.id, calculateTrainPosition(train, simulationSeconds));
  });
  applyTrafficControls(trains);

  trains.forEach((train) => {
    const snapshot = trainSnapshots.get(train.id);
    if (!snapshot || snapshot.state === "未發車" || snapshot.state === "已抵達終點" || !passesFilter(train, snapshot)) return;
    const pill = document.createElement("button");
    const status = getTrainStatus(train, simulationSeconds);
    pill.className = `train-pill ${train.direction} ${train.isExtra ? "extra" : ""} ${["誤點", "停等", "煞車調速"].includes(status) ? "delayed" : ""} ${status === "嚴重延誤" ? "severe" : ""}`;
    pill.style.left = `${distanceToLeft(snapshot.distanceKm)}px`;
    pill.setAttribute("aria-label", `${train.id} ${directionLabel(train.direction)} ${snapshot.locationText}`);
    pill.innerHTML = `<span class="train-arrow">${train.direction === "east" ? "›" : "‹"}</span>`;
    pill.title = `${train.id} ${snapshot.locationText}`;
    pill.addEventListener("click", () => showTrainDetail(train));
    canvas.appendChild(pill);
  });
}

function applyTrafficControls(trains) {
  ["east", "west"].forEach((direction) => {
    trains
      .filter((train) => train.direction === direction)
      .sort((a, b) => {
        const aSnapshot = trainSnapshots.get(a.id);
        const bSnapshot = trainSnapshots.get(b.id);
        const aDistance = aSnapshot ? aSnapshot.distanceKm : stationDistance(a.origin);
        const bDistance = bSnapshot ? bSnapshot.distanceKm : stationDistance(b.origin);
        return direction === "east" ? bDistance - aDistance : aDistance - bDistance;
      })
      .forEach((train, index) => {
        if (index > 0) checkTrainSpacing(train, trains);
      });
  });
}

function switchWorkspace(view) {
  document.querySelectorAll(".workspace-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view-section").forEach((section) => {
    section.classList.toggle("active", section.dataset.section === view);
  });
  renderRoute();
  renderTrains();
}

// 更新列車清單
function renderTrainTable() {
  const body = document.getElementById("trainTableBody");
  const rows = getAllTrains()
    .slice()
    .sort((a, b) => {
      const timeDiff = timeToSeconds(a.departureTime) - timeToSeconds(b.departureTime);
      if (timeDiff !== 0) return timeDiff;
      return a.id.localeCompare(b.id, "zh-Hant", { numeric: true });
    })
    .filter((train) => passesFilter(train, trainSnapshots.get(train.id) || calculateTrainPosition(train, simulationSeconds)))
    .map((train) => {
      const snapshot = trainSnapshots.get(train.id) || calculateTrainPosition(train, simulationSeconds);
      const status = getTrainStatus(train, simulationSeconds);
      return `<tr>
        <td><button class="linklike" data-train="${train.id}">${train.id}</button></td>
        <td>${directionLabel(train.direction)}</td>
        <td>${train.origin}</td>
        <td>${train.destination}</td>
        <td>${train.departureTime}</td>
        <td>${snapshot.locationText}</td>
        <td><span class="badge ${statusClass(status)}">${status}</span></td>
        <td>${Math.round(train.delaySeconds)} 秒</td>
        <td>${train.isExtra ? "加班車" : "一般"}</td>
        <td>${train.eventNote || "-"}</td>
        <td><button class="small-action" data-edit-train="${train.id}">編輯</button></td>
      </tr>`;
    })
    .join("");
  body.innerHTML = rows || '<tr><td colspan="11">目前沒有符合篩選條件的列車</td></tr>';
  body.querySelectorAll("[data-train]").forEach((button) => {
    button.addEventListener("click", () => showTrainDetail(getAllTrains().find((train) => train.id === button.dataset.train)));
  });
  body.querySelectorAll("[data-edit-train]").forEach((button) => {
    button.addEventListener("click", () => openTrainEditor(button.dataset.editTrain));
  });
}

// 更新事件紀錄
function renderEventLogs() {
  const logs = document.getElementById("eventLogs");
  logs.innerHTML = eventLogs.length
    ? eventLogs.slice(0, 80).map((log) => `<div class="log-line">${log}</div>`).join("")
    : '<div class="log-line">尚無事件紀錄</div>';
}

function maybeGenerateStationEvents(train, station, currentTime) {
  const key = `${station.name}-${Math.floor(currentTime / 60)}`;
  if (train.triggeredStops.has(key)) return;
  train.triggeredStops.add(key);
  simulatePeakDelay(train, station);
  simulateRandomEvent(train, station);
}

function makeSnapshot(train, state, locationText, currentStation, nextStation, distanceKm, progress) {
  return {
    train,
    state,
    controlState: "",
    locationText,
    currentStation,
    nextStation,
    distanceKm,
    progress,
    etaSeconds: estimateEta(train, nextStation)
  };
}

function estimateEta(train, nextStation) {
  if (!nextStation) return null;
  const adjustedNow = simulationSeconds - train.delaySeconds;
  const segment = train.plan.find((item) => item.nextStation && item.nextStation.name === nextStation.name && adjustedNow <= item.depart + item.runSeconds);
  if (!segment) return null;
  return Math.max(0, segment.depart + segment.runSeconds + train.delaySeconds - simulationSeconds);
}

function showStationDetail(station) {
  const upcoming = getAllTrains()
    .map((train) => ({ train, snapshot: trainSnapshots.get(train.id) || calculateTrainPosition(train, simulationSeconds) }))
    .filter(({ snapshot }) => snapshot.nextStation && snapshot.nextStation.name === station.name)
    .sort((a, b) => (a.snapshot.etaSeconds || 9999) - (b.snapshot.etaSeconds || 9999))
    .slice(0, 5)
    .map(({ train, snapshot }) => `${train.id} 約 ${formatDuration(snapshot.etaSeconds || 0)} 後到站`)
    .join("<br>") || "目前無即將到站列車";
  openDetail(`${station.code} ${station.name}`, [
    ["英文名", station.en],
    ["所在區域", `${station.city || "-"} ${station.district || ""}`.trim()],
    ["站距", `${station.distanceFromPrev.toFixed(2)} km`],
    ["累積里程", `${station.cumulativeDistance.toFixed(2)} km`],
    ["可轉乘路線", station.transfer.length ? station.transfer.join("、") : "無"],
    ["即將到站", upcoming]
  ]);
}

function showTrainDetail(train) {
  if (!train) return;
  const snapshot = trainSnapshots.get(train.id) || calculateTrainPosition(train, simulationSeconds);
  openDetail(`${train.id} 列車資料`, [
    ["起站", train.origin],
    ["終點", train.destination],
    ["方向", directionLabel(train.direction)],
    ["發車時間", train.departureTime],
    ["目前位置", snapshot.locationText],
    ["下一站", snapshot.nextStation ? snapshot.nextStation.name : "-"],
    ["預估到站", snapshot.etaSeconds === null ? "-" : formatDuration(snapshot.etaSeconds)],
    ["累積誤點", `${Math.round(train.delaySeconds)} 秒`],
    ["列車類型", train.isExtra ? "加班車" : "一般列車"],
    ["發生事件", train.events.length ? train.events.slice(-5).join("<br>") : "無"]
  ]);
}

function openDetail(title, rows) {
  document.getElementById("detailTitle").textContent = title;
  document.getElementById("detailBody").innerHTML = rows.map(([label, value]) => (
    `<div class="detail-row"><span>${label}</span><strong>${value}</strong></div>`
  )).join("");
  document.getElementById("detailDialog").showModal();
}

function openTrainEditor(trainId) {
  const train = getAllTrains().find((item) => item.id === trainId);
  if (!train) return;
  const idInput = document.getElementById("editTrainId");
  const isExtraInput = document.getElementById("editIsExtra");
  document.getElementById("editOriginalId").value = train.id;
  idInput.value = train.id;
  idInput.readOnly = !train.isExtra;
  idInput.title = train.isExtra ? "加班車可手動指定數字車次" : "一般列車會依方向與發車時間自動配號";
  document.getElementById("editOrigin").value = train.origin;
  document.getElementById("editDestination").value = train.destination;
  setTimeSelectValue("editDeparture", train.departureTime);
  isExtraInput.checked = train.isExtra;
  isExtraInput.disabled = !train.isExtra;
  document.getElementById("editEnabled").checked = train.enabled;
  document.getElementById("editTrainDialog").showModal();
}

function saveTrainEdit(event) {
  event.preventDefault();
  const originalId = document.getElementById("editOriginalId").value;
  const train = getAllTrains().find((item) => item.id === originalId);
  if (!train) return;
  const isExtra = document.getElementById("editIsExtra").checked;
  const raw = {
    id: isExtra ? normalizeTrainNumber(document.getElementById("editTrainId").value.trim()) : train.id,
    origin: document.getElementById("editOrigin").value,
    destination: document.getElementById("editDestination").value,
    departureTime: getTimeSelectValue("editDeparture"),
    isExtra,
    enabled: document.getElementById("editEnabled").checked
  };
  if (!validateTrip(raw, originalId)) return;
  Object.assign(train, raw, {
    direction: inferDirection(raw.origin, raw.destination),
    delaySeconds: 0,
    eventNote: "",
    events: [],
    triggeredStops: new Set(),
    spacingDelayUntil: 0,
    trafficLogUntil: 0
  });
  train.plan = buildTrainPlan(train);
  assignRegularTrainNumbers();
  syncExtraTrains();
  document.getElementById("editTrainDialog").close();
  recalculateAll();
}

function deleteEditingTrain() {
  const originalId = document.getElementById("editOriginalId").value;
  schedules = schedules.filter((train) => train.id !== originalId);
  syncExtraTrains();
  document.getElementById("editTrainDialog").close();
  recalculateAll();
}

function resetSimulation() {
  isRunning = false;
  simulationSeconds = 7 * 3600;
  lastTick = null;
  schedules = defaultSchedules.map(createTrain);
  assignRegularTrainNumbers();
  extraTrains = [];
  eventLogs = [];
  updateScheduleAutoIdPreview();
  recalculateAll();
}

function recalculateAll() {
  renderEventLogs();
  updateSimulationTime();
}

function rebuildAllPlans() {
  getAllTrains().forEach((train) => {
    train.plan = buildTrainPlan(train);
  });
}

function getAllTrains() {
  return schedules;
}

function validateTrip(raw, ignoreId = "") {
  if (raw.isExtra && !raw.id) {
    alert("請輸入車次編號");
    return false;
  }
  if (raw.isExtra && !/^\d+$/.test(raw.id)) {
    alert("車次只能輸入數字");
    return false;
  }
  if (raw.isExtra && getAllTrains().some((train) => train.id === raw.id && train.id !== ignoreId)) {
    alert("車次編號已存在");
    return false;
  }
  if (raw.origin === raw.destination) {
    alert("起站與終點站不能相同");
    return false;
  }
  return true;
}

function syncExtraTrains() {
  extraTrains = schedules.filter((train) => train.isExtra);
}

function assignRegularTrainNumbers() {
  const reservedIds = new Set(schedules.filter((train) => train.isExtra).map((train) => train.id));
  ["east", "west"].forEach((direction) => {
    const usedIds = new Set(reservedIds);
    let nextNumber = direction === "east" ? 1 : 2;
    schedules
      .filter((train) => !train.isExtra && train.direction === direction)
      .sort((a, b) => {
        const timeDiff = timeToSeconds(a.departureTime) - timeToSeconds(b.departureTime);
        if (timeDiff !== 0) return timeDiff;
        return stationIndex(a.origin) - stationIndex(b.origin);
      })
      .forEach((train, index) => {
        while (usedIds.has(padTrainNumber(nextNumber))) {
          nextNumber += 2;
        }
        train.id = padTrainNumber(nextNumber);
        usedIds.add(train.id);
        nextNumber += 2;
      });
  });
}

function updateScheduleAutoIdPreview() {
  const preview = document.getElementById("scheduleAutoId");
  if (!preview) return;
  const origin = document.getElementById("scheduleOrigin").value;
  const destination = document.getElementById("scheduleDestination").value;
  if (!origin || !destination || origin === destination) {
    preview.value = "---";
    return;
  }
  const direction = inferDirection(origin, destination);
  const departureTime = getTimeSelectValue("scheduleDeparture");
  const reservedIds = new Set(schedules.filter((train) => train.isExtra).map((train) => train.id));
  const sameDirectionCount = schedules
    .filter((train) => !train.isExtra && train.direction === direction)
    .map((train) => timeToSeconds(train.departureTime))
    .filter((seconds) => seconds <= timeToSeconds(departureTime)).length;
  let number = direction === "east" ? 1 : 2;
  for (let index = 0; index <= sameDirectionCount; index += 1) {
    while (reservedIds.has(padTrainNumber(number))) {
      number += 2;
    }
    if (index < sameDirectionCount) number += 2;
  }
  preview.value = padTrainNumber(number);
}

function normalizeTrainNumber(value) {
  const digits = value.replace(/\D/g, "");
  return digits ? padTrainNumber(Number(digits)) : "";
}

function padTrainNumber(number) {
  return String(number).padStart(3, "0");
}

function inferDirection(origin, destination) {
  return stationIndex(origin) < stationIndex(destination) ? "east" : "west";
}

function stationIndex(name) {
  return stations.findIndex((station) => station.name === name);
}

function stationDistance(name) {
  return stations[stationIndex(name)].cumulativeDistance;
}

function getBaseDwell(stationName) {
  return BIG_STATION_DWELL[stationName] || 25;
}

function routeProgress(distance) {
  return distance / stations.at(-1).cumulativeDistance;
}

function distanceToLeft(distance) {
  return routeMetrics.left + routeProgress(distance) * routeMetrics.width;
}

function timeToSeconds(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 3600 + minute * 60;
}

function secondsToTimeInput(seconds) {
  const normalized = Math.floor(seconds % 86400);
  const hour = String(Math.floor(normalized / 3600)).padStart(2, "0");
  const minute = String(Math.floor((normalized % 3600) / 60)).padStart(2, "0");
  return `${hour}:${minute}`;
}

function getTimeSelectValue(prefix) {
  const hour = document.getElementById(`${prefix}Hour`).value;
  const minute = document.getElementById(`${prefix}Minute`).value;
  return `${hour}:${minute}`;
}

function setTimeSelectValue(prefix, time) {
  const [hour = "00", minute = "00"] = time.split(":");
  const hourSelect = document.getElementById(`${prefix}Hour`);
  const minuteSelect = document.getElementById(`${prefix}Minute`);
  if (!hourSelect || !minuteSelect) return;
  hourSelect.value = hour.padStart(2, "0");
  minuteSelect.value = minute.padStart(2, "0");
}

function formatTime(seconds) {
  const normalized = Math.floor(seconds % 86400);
  const hour = String(Math.floor(normalized / 3600)).padStart(2, "0");
  const minute = String(Math.floor((normalized % 3600) / 60)).padStart(2, "0");
  const second = String(normalized % 60).padStart(2, "0");
  return `${hour}:${minute}:${second}`;
}

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(seconds));
  const minute = Math.floor(value / 60);
  const second = value % 60;
  if (minute === 0) return `${second} 秒`;
  return `${minute} 分 ${second} 秒`;
}

function isPeakTime(seconds) {
  const morningStart = timeToSeconds("07:00");
  const morningEnd = timeToSeconds("09:00");
  const eveningStart = timeToSeconds("17:00");
  const eveningEnd = timeToSeconds("19:30");
  return (seconds >= morningStart && seconds <= morningEnd) || (seconds >= eveningStart && seconds <= eveningEnd);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function logEvent(train, stationName, message, delay) {
  const line = `${formatTime(simulationSeconds)}｜${train.id}｜${stationName}｜${message}${delay ? `，延誤 ${delay} 秒` : ""}`;
  train.events.push(line);
  eventLogs.unshift(line);
  renderEventLogs();
}

function directionLabel(direction) {
  return direction === "east" ? "東行" : "西行";
}

function statusClass(status) {
  if (status === "未發車") return "status-not-started";
  if (status === "停靠中") return "status-stopped";
  if (status === "停等" || status === "煞車調速") return "status-delayed";
  if (status === "誤點") return "status-delayed";
  if (status === "嚴重延誤") return "status-severe";
  if (status === "已抵達終點") return "status-arrived";
  return "status-running";
}

function passesFilter(train, snapshot) {
  if (currentFilter === "all") return true;
  if (currentFilter === "east" || currentFilter === "west") return train.direction === currentFilter;
  if (currentFilter === "extra") return train.isExtra;
  if (currentFilter === "delayed") return train.delaySeconds > 0;
  if (currentFilter === "running") return snapshot && snapshot.state !== "未發車" && snapshot.state !== "已抵達終點";
  return true;
}

function updateTopStats() {
  const trains = getAllTrains();
  const active = trains.filter((train) => {
    const snapshot = trainSnapshots.get(train.id) || calculateTrainPosition(train, simulationSeconds);
    return snapshot.state !== "未發車" && snapshot.state !== "已抵達終點";
  }).length;
  const delayed = trains.filter((train) => train.delaySeconds > 0).length;
  document.getElementById("topSpeed").textContent = `${speedMultiplier}x`;
  document.getElementById("topActiveTrains").textContent = active;
  document.getElementById("topDelayedTrains").textContent = delayed;
}

window.addEventListener("resize", () => {
  renderRoute();
  renderTrains();
});

document.addEventListener("DOMContentLoaded", initApp);
