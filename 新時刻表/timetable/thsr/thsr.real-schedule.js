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
let accessToken = "";
let accessTokenExpireAt = 0;
window.stationMap = {}; 
window.TDX_CONFIG = { ...TDX_CONFIG };

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

function isAccessTokenValid() {
    return !!accessToken && Date.now() < (accessTokenExpireAt - 30000);
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
        if (!res.ok) throw new Error(`Token 取得失敗: HTTP ${res.status}`);
        const data = await res.json();
        accessToken = data.access_token || "";
        accessTokenExpireAt = Date.now() + (Math.max(0, Number(data.expires_in) || 0) * 1000);
        return accessToken;
    } catch (error) {
        accessToken = "";
        accessTokenExpireAt = 0;
        console.error("Token Error:", error);
        return "";
    }
}

async function initStationMap() {
    const token = await getAccessToken();
    if (!token) return;
    try {
        const res = await fetch("https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/Station?$format=JSON", {
            headers: buildTdxAuthHeaders(token, { includeApiKey: false })
        });
        const data = await res.json();
        window.stationMap = {};
        data.forEach(s => { window.stationMap[s.StationID] = s.StationName.Zh_tw; });
    } catch (error) {
        console.error("車站資料抓取失敗:", error);
    }
}

async function fetchRealData(date) {
    const token = await getAccessToken();
    if (!token) return {};
    if (Object.keys(window.stationMap || {}).length === 0) await initStationMap();
    try {
        const url = `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainDate/${date}?$format=JSON`;
        const res = await fetch(url, { headers: buildTdxAuthHeaders(token, { includeApiKey: false }) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const translated = {};
        data.forEach(item => {
            translated[item.DailyTrainInfo.TrainNo] = {
                '車站時間': item.StopTimes.map(stop => ([
                    stop.StationName.Zh_tw,
                    stop.DepartureTime, 
                    stop.ArrivalTime
                ]))
            };
        });
        window.trainSchedule = translated;
        return translated;
    } catch (error) {
        console.error("時刻表解析失敗:", error);
        return {};
    }
}

window.fetchSeatStatusOD = async function(date, originID, destinationID) {
    // 修正：參數安全性檢查，防止產生 400 錯誤
    if (!date || !originID || !destinationID || originID === "" || destinationID === "") return {};
    const token = await getAccessToken();
    if (!token) return {};
    const url = `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/AvailableSeatStatus/Train/OD/${originID}/to/${destinationID}/TrainDate/${date}?$format=JSON`;
    try {
        const res = await fetch(url, { headers: buildTdxAuthHeaders(token, { includeApiKey: false }) });
        if (!res.ok) return {}; 
        const data = await res.json();
        const results = {};
        (data.AvailableSeats || []).forEach(item => {
            results[String(item.TrainNo)] = { standard: item.StandardSeatStatus, business: item.BusinessSeatStatus };
        });
        return results;
    } catch (error) {
        return {};
    }
};

async function updateLiveDelay() { return Promise.resolve(); }
