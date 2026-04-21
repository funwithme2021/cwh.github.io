const DEFAULT_TDX_CONFIG = {
    clientId: 'r36144112-d7b2ebdd-ce4c-40c3',
    clientSecret: '141d81d1-a450-4610-9309-412c8151cc3d'
};
const TDX_CONFIG_STORAGE_KEYS = {
    clientId: 'tdx_client_id',
    clientSecret: 'tdx_client_secret'
};

function readStoredTdxConfig() {
    try {
        const clientId = String(localStorage.getItem(TDX_CONFIG_STORAGE_KEYS.clientId) || '').trim();
        const clientSecret = String(localStorage.getItem(TDX_CONFIG_STORAGE_KEYS.clientSecret) || '').trim();
        if (clientId && clientSecret) {
            return { clientId, clientSecret };
        }
    } catch (_) {}
    const globalConfig = window.TDX_CONFIG || {};
    const clientId = String(globalConfig.clientId || '').trim();
    const clientSecret = String(globalConfig.clientSecret || '').trim();
    if (clientId && clientSecret) {
        return { clientId, clientSecret };
    }
    return { ...DEFAULT_TDX_CONFIG };
}

const TDX_CONFIG = readStoredTdxConfig();
window.trainSchedule = {};

// 全域變數，保持與原網頁邏輯銜接
let accessToken = "";
let accessTokenExpireAt = 0;
let accessTokenPromise = null;
let accessTokenBackoffUntil = 0;
const TDX_TOKEN_CACHE_KEY = 'tdx_access_token_cache_v1';
const TDX_TOKEN_REFRESH_BUFFER_MS = 30 * 1000;
const TDX_TOKEN_RATE_LIMIT_BACKOFF_MS = 60 * 1000;
let stationMap = {}; // ID 轉 中文名
let liveDelayMap = {};
let stationLiveBoardMap = {};
window.stationGeoList = [];
window.stationGeoMap = {};
const TRA_SUPPLEMENTAL_STATIONS = [
    { id: '5170', name: '枋野', lat: 22.279722, lon: 120.718611 },
    { id: '5175', name: '中央號誌', lat: 22.278889, lon: 120.743056 },
    { id: '5180', name: '古莊', lat: 22.348333, lon: 120.881667 }
];
window.TDX_CONFIG = { ...TDX_CONFIG };
let liveBoardMap = {};
window.getTraLiveBoardEntry = function(trainNo) {
    return liveBoardMap[String(trainNo || '').trim()] || null;
};
window.getTraLivePassedStationName = function(trainNo) {
    return window.getTraLiveBoardEntry(trainNo)?.stationName || '';
};
window.getTraStationLiveEntries = function(trainNo) {
    return (stationLiveBoardMap[String(trainNo || '').trim()] || []).slice();
};

function applyTdxConfig(nextConfig) {
    if (!nextConfig || !nextConfig.clientId || !nextConfig.clientSecret) return window.TDX_CONFIG;
    TDX_CONFIG.clientId = String(nextConfig.clientId).trim();
    TDX_CONFIG.clientSecret = String(nextConfig.clientSecret).trim();
    window.TDX_CONFIG = { ...TDX_CONFIG };
    accessToken = "";
    accessTokenExpireAt = 0;
    return window.TDX_CONFIG;
}

window.setTDXCredentials = function(clientId, clientSecret, options = {}) {
    const nextConfig = {
        clientId: String(clientId || '').trim(),
        clientSecret: String(clientSecret || '').trim()
    };
    if (!nextConfig.clientId || !nextConfig.clientSecret) return window.TDX_CONFIG;
    if (options.persist !== false) {
        try {
            localStorage.setItem(TDX_CONFIG_STORAGE_KEYS.clientId, nextConfig.clientId);
            localStorage.setItem(TDX_CONFIG_STORAGE_KEYS.clientSecret, nextConfig.clientSecret);
        } catch (_) {}
    }
    return applyTdxConfig(nextConfig);
};

window.clearTDXCredentials = function() {
    try {
        localStorage.removeItem(TDX_CONFIG_STORAGE_KEYS.clientId);
        localStorage.removeItem(TDX_CONFIG_STORAGE_KEYS.clientSecret);
    } catch (_) {}
    return applyTdxConfig(DEFAULT_TDX_CONFIG);
};

function normalizeTraTypeName(typeName) {
    const text = String(typeName || '').trim();
    if (!text) return '列車';
    if (window.RailNetwork?.normalizeTraDisplayType) {
        return window.RailNetwork.normalizeTraDisplayType(text);
    }
    if (/[（(][^）)]*專[^）)]*[）)]/.test(text)) return text.replace(/[（(][^）)]*專[^）)]*[）)]/g, '(\u5c08\u8eca)');
    if (/專開列車/.test(text)) return text;
    if (/自強.*3000|3000|新自強|騰雲/.test(text)) return '新自強';
    if (/普悠瑪/.test(text)) return '普悠瑪';
    if (/太魯閣/.test(text)) return '太魯閣';
    if (/莒光/.test(text)) return '莒光號';
    if (/復興/.test(text)) return '復興號';
    if (/區間快/.test(text)) return '區間快';
    if (/區間/.test(text)) return '區間車';
    if (/普快/.test(text)) return '普快車';
    if (/柴快/.test(text)) return '柴快車';
    if (/柴油客車|柴客/.test(text)) return '柴油客車';
    if (/普通車|普車/.test(text)) return '普通車';
    if (/加班/.test(text)) return '加班車';
    if (/自強/.test(text)) return '自強號';
    return text;
}

function normalizeTraStationName(name) {
    return String(name || '').trim().replace(/台/g, '臺');
}

function mergeSupplementalTraStations() {
    window.stationMap = window.stationMap || {};
    window.stationGeoList = Array.isArray(window.stationGeoList) ? window.stationGeoList : [];
    window.stationGeoMap = window.stationGeoMap || {};
    const geoList = window.stationGeoList;
    TRA_SUPPLEMENTAL_STATIONS.forEach((station) => {
        const normalizedName = normalizeTraStationName(station.name);
        if (!normalizedName || !station.id) return;
        window.stationMap[station.id] = normalizedName;
        const existingIndex = geoList.findIndex((item) =>
            String(item?.id || '').trim() === station.id ||
            normalizeTraStationName(item?.name) === normalizedName
        );
        const nextItem = { id: station.id, name: normalizedName, lat: Number(station.lat), lon: Number(station.lon) };
        if (existingIndex >= 0) {
            geoList[existingIndex] = { ...geoList[existingIndex], ...nextItem };
        } else {
            geoList.push(nextItem);
        }
        window.stationGeoMap[normalizedName] = nextItem;
    });
}

// 1. 取得 TDX 存取權杖 (Access Token)
function isAccessTokenValid() {
    return !!accessToken && Date.now() < (accessTokenExpireAt - 30000);
}

function readSharedAccessToken() {
    try {
        const cached = JSON.parse(localStorage.getItem(TDX_TOKEN_CACHE_KEY) || 'null');
        const token = String(cached?.token || '');
        const expiresAt = Number(cached?.expiresAt || 0);
        if (
            token &&
            cached?.clientId === TDX_CONFIG.clientId &&
            Date.now() < expiresAt - TDX_TOKEN_REFRESH_BUFFER_MS
        ) {
            accessToken = token;
            accessTokenExpireAt = expiresAt;
            return token;
        }
    } catch (_) {}
    return "";
}

function writeSharedAccessToken(token, expiresInSeconds) {
    accessToken = token || "";
    accessTokenExpireAt = Date.now() + Math.max(0, Number(expiresInSeconds) || 0) * 1000;
    try {
        localStorage.setItem(TDX_TOKEN_CACHE_KEY, JSON.stringify({
            token: accessToken,
            expiresAt: accessTokenExpireAt,
            clientId: TDX_CONFIG.clientId
        }));
    } catch (_) {}
}

function getTdxClientId() {
    return (window.TDX_CONFIG && window.TDX_CONFIG.clientId) || TDX_CONFIG.clientId || '';
}

function buildTdxAuthHeaders(token, options = {}) {
    const headers = {
        'Accept': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.includeApiKey !== false) {
        const clientId = getTdxClientId();
        if (clientId) headers['x-api-key'] = clientId;
    }
    return headers;
}

window.buildTdxAuthHeaders = buildTdxAuthHeaders;

async function getAccessTokenLegacy(force = false) {
    if (!force && isAccessTokenValid()) return accessToken;
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', TDX_CONFIG.clientId);
        params.append('client_secret', TDX_CONFIG.clientSecret);

        const res = await fetch("https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token", {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Token 取得失敗: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        accessToken = data.access_token || "";
        accessTokenExpireAt = Date.now() + (Math.max(0, Number(data.expires_in) || 0) * 1000);
        console.log("Token 取得成功");
        return accessToken;
        try {
            const stationRes = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/StationLiveBoard?%24format=JSON", {
                headers: buildTdxAuthHeaders(token, { includeApiKey: false })
            });
            const stationData = await stationRes.json();
            stationLiveBoardMap = {};
            const latestByKey = new Map();
            (stationData?.StationLiveBoards || []).forEach(b => {
                const trainNo = String(b?.TrainNo || '').trim();
                const stationName = String(b?.StationName?.Zh_tw || b?.StationName?.ZhTw || '').trim();
                if (!trainNo || !stationName) return;
                const entry = {
                    trainNo,
                    stationId: String(b?.StationID || '').trim(),
                    stationName,
                    delayMin: Number.isFinite(Number(b?.DelayTime)) ? Number(b.DelayTime) : 0,
                    scheduleArrivalTime: String(b?.ScheduleArrivalTime || '').trim(),
                    scheduleDepartureTime: String(b?.ScheduleDepartureTime || '').trim(),
                    runningStatus: String(b?.RunningStatus || '').trim(),
                    srcUpdateTime: String(b?.SrcUpdateTime || '').trim(),
                    updateTime: String(b?.UpdateTime || '').trim()
                };
                const key = `${trainNo}@@${stationName}`;
                const current = latestByKey.get(key);
                const currentStamp = Date.parse(current?.srcUpdateTime || current?.updateTime || '') || 0;
                const nextStamp = Date.parse(entry.srcUpdateTime || entry.updateTime || '') || 0;
                if (!current || nextStamp >= currentStamp) latestByKey.set(key, entry);
            });
            latestByKey.forEach((entry) => {
                if (!stationLiveBoardMap[entry.trainNo]) stationLiveBoardMap[entry.trainNo] = [];
                stationLiveBoardMap[entry.trainNo].push(entry);
            });
        } catch (stationError) {
            stationLiveBoardMap = {};
            console.warn("StationLiveBoard 取得失敗:", stationError);
        }
    } catch (error) {
        accessToken = "";
        accessTokenExpireAt = 0;
        console.error("Critical Error (getAccessToken):", error);
        // 如果是在瀏覽器環境，這通常是 Client Secret 錯誤或 CORS 問題
        return "";
    }
}




// 2. 初始化車站資料 (stationMap)
async function getAccessToken(force = false) {
    if (!force && isAccessTokenValid()) return accessToken;
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', TDX_CONFIG.clientId);
        params.append('client_secret', TDX_CONFIG.clientSecret);

        const res = await fetch("https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token", {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Token ??憭望?: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        accessToken = data.access_token || "";
        accessTokenExpireAt = Date.now() + (Math.max(0, Number(data.expires_in) || 0) * 1000);
        console.log("Token ????");
        return accessToken;
    } catch (error) {
        accessToken = "";
        accessTokenExpireAt = 0;
        console.error("Critical Error (getAccessToken):", error);
        return "";
    }
}

getAccessToken = async function(force = false) {
    if (!force && isAccessTokenValid()) return accessToken;
    if (!force && readSharedAccessToken()) return accessToken;
    if (!force && accessTokenPromise) return accessTokenPromise;
    if (!force && Date.now() < accessTokenBackoffUntil) return "";

    accessTokenPromise = (async () => {
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', TDX_CONFIG.clientId);
            params.append('client_secret', TDX_CONFIG.clientSecret);

            const res = await fetch("https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token", {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });

            if (!res.ok) {
                if (res.status === 429) accessTokenBackoffUntil = Date.now() + TDX_TOKEN_RATE_LIMIT_BACKOFF_MS;
                const errorText = await res.text().catch(() => "");
                throw new Error(`Token fetch failed: ${res.status} ${errorText}`);
            }

            const data = await res.json();
            writeSharedAccessToken(data.access_token || "", data.expires_in);
            return accessToken;
        } catch (error) {
            accessToken = "";
            accessTokenExpireAt = 0;
            console.error("Critical Error (getAccessToken):", error);
            return "";
        }
    })();

    try {
        return await accessTokenPromise;
    } finally {
        accessTokenPromise = null;
    }
};

async function updateStationLiveBoard(token) {
    try {
        const stationRes = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/StationLiveBoard?%24format=JSON", {
            headers: buildTdxAuthHeaders(token, { includeApiKey: false })
        });
        if (!stationRes.ok) {
            throw new Error(`StationLiveBoard fetch failed: ${stationRes.status}`);
        }
        const stationData = await stationRes.json();
        stationLiveBoardMap = {};
        const latestByKey = new Map();
        (stationData?.StationLiveBoards || []).forEach((board) => {
            const trainNo = String(board?.TrainNo || '').trim();
            const stationName = String(board?.StationName?.Zh_tw || board?.StationName?.ZhTw || '').trim();
            if (!trainNo || !stationName) return;
            const entry = {
                trainNo,
                stationId: String(board?.StationID || '').trim(),
                stationName,
                delayMin: Number.isFinite(Number(board?.DelayTime)) ? Number(board.DelayTime) : 0,
                scheduleArrivalTime: String(board?.ScheduleArrivalTime || '').trim(),
                scheduleDepartureTime: String(board?.ScheduleDepartureTime || '').trim(),
                runningStatus: String(board?.RunningStatus || '').trim(),
                srcUpdateTime: String(board?.SrcUpdateTime || '').trim(),
                updateTime: String(board?.UpdateTime || '').trim()
            };
            const key = `${trainNo}@@${stationName}`;
            const current = latestByKey.get(key);
            const currentStamp = Date.parse(current?.srcUpdateTime || current?.updateTime || '') || 0;
            const nextStamp = Date.parse(entry.srcUpdateTime || entry.updateTime || '') || 0;
            if (!current || nextStamp >= currentStamp) latestByKey.set(key, entry);
        });
        latestByKey.forEach((entry) => {
            if (!stationLiveBoardMap[entry.trainNo]) stationLiveBoardMap[entry.trainNo] = [];
            stationLiveBoardMap[entry.trainNo].push(entry);
        });
    } catch (stationError) {
        stationLiveBoardMap = {};
        console.warn("StationLiveBoard ??憭望?:", stationError);
    }
}

async function initStationMap() {
    const token = await getAccessToken();
    if (!token) return;
    try {
        const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Station?%24format=JSON", {
            headers: buildTdxAuthHeaders(token, { includeApiKey: false })
        });
        if (!res.ok) throw new Error(`Station fetch failed: ${res.status}`);
        const data = await res.json();

        // ✅ 重建並寫回 window.stationMap，確保 HTML 端拿得到
        window.stationMap = {};
        window.stationGeoList = [];
        window.stationGeoMap = {};
        const rows = Array.isArray(data?.Stations) ? data.Stations : [];
        rows.forEach(s => {
            const name = s?.StationName?.Zh_tw || '';
            const lat = Number(s?.StationPosition?.PositionLat);
            const lon = Number(s?.StationPosition?.PositionLon);
            window.stationMap[s.StationID] = name;
            if (name && Number.isFinite(lat) && Number.isFinite(lon)) {
                const normalizedName = String(name).trim().replace(/台/g, '臺');
                const item = { id: s.StationID, name, lat, lon };
                window.stationGeoList.push(item);
                window.stationGeoMap[normalizedName] = item;
            }
        });
        mergeSupplementalTraStations();
        stationMap = window.stationMap;
    } catch (error) {
        mergeSupplementalTraStations();
        stationMap = window.stationMap;
        console.error("車站資料抓取失敗:", error);
    }
}

async function fetchRealData(date) {
    const token = await getAccessToken();
    if (!token) return {};
    if (Object.keys(stationMap).length === 0) await initStationMap();

    try {
        const url = `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${date}?%24format=JSON`;
        const res = await fetch(url, { headers: buildTdxAuthHeaders(token, { includeApiKey: false }) });
        if (!res.ok) throw new Error(`DailyTrainTimetable fetch failed: ${res.status}`);
        const data = await res.json();

        const translated = {};

        // 這裡對應你貼出的 TrainTimetables 結構
        const rows = Array.isArray(data?.TrainTimetables) ? data.TrainTimetables : [];
        rows.forEach(item => {
            const info = item.TrainInfo;
            const trainNo = info.TrainNo;

            // 處理車種名稱 (因為 API 會回傳長串如 "自強(3000)..."，我們簡化它)
            const originalTypeName = info.TrainTypeName.Zh_tw;
            const typeName = normalizeTraTypeName(originalTypeName);

            translated[trainNo] = {
                '車種': typeName,
                '原始車種': originalTypeName,
                '行別': info.TripLine ?? item.TripLine ?? '',
                '車站時間': item.StopTimes.map(stop => ([
  stop.StationName.Zh_tw,
  stop.DepartureTime, // ✅ 開車時間（station timetable 用這個）
  stop.ArrivalTime    // ✅ 到達時間（起迄查詢終點用這個）
]))

            };
        });

        window.trainSchedule = translated;
        console.log("資料轉換成功！範例車次 111:", window.trainSchedule['111']);
        return translated;
        
    } catch (error) {
        console.error("解析失敗:", error);
        return {};
    }
}

// 4. 更新即時誤點資訊
async function updateLiveDelay() {
    const token = await getAccessToken();
    if (!token) return;
    try {
        const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard?%24format=JSON", {
            headers: buildTdxAuthHeaders(token, { includeApiKey: false })
        });
        if (!res.ok) throw new Error(`TrainLiveBoard fetch failed: ${res.status}`);
        const data = await res.json();
        liveDelayMap = {};
        liveBoardMap = {};
        const rows = Array.isArray(data?.TrainLiveBoards) ? data.TrainLiveBoards : [];
        rows.forEach(b => {
            const trainNo = String(b?.TrainNo || '').trim();
            if (!trainNo) return;
            const delayMin = Number(b?.DelayTime);
            const stationName = String(b?.StationName?.Zh_tw || b?.StationName?.ZhTw || '').trim();
            liveDelayMap[trainNo] = Number.isFinite(delayMin) ? delayMin : 0;
            liveBoardMap[trainNo] = {
                trainNo,
                delayMin: Number.isFinite(delayMin) ? delayMin : 0,
                stationId: String(b?.StationID || '').trim(),
                stationName,
                trainStationStatus: b?.TrainStationStatus,
                srcUpdateTime: String(b?.SrcUpdateTime || '').trim(),
                updateTime: String(b?.UpdateTime || '').trim()
            };
        });
        await updateStationLiveBoard(token);
        console.log("即時誤點資訊已同步");
    } catch (error) {
        stationLiveBoardMap = {};
        console.error("即時資訊抓取失敗:", error);
    }
}

// 輔助函式：取得特定車次的誤點文字
function getDelayStatus(trainNo) {
    const delay = liveDelayMap[trainNo];
    if (delay === undefined) return "";
    if (delay === 0) return '<span style="color:green"> (準點)</span>';
    return `<span style="color:red"> (晚 ${delay} 分)</span>`;
}
