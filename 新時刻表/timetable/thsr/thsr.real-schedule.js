const TDX_CONFIG = {
    clientId: 'r36144112-d7b2ebdd-ce4c-40c3',
    clientSecret: '141d81d1-a450-4610-9309-412c8151cc3d'
};

window.trainSchedule = {}; 
let accessToken = "";
window.stationMap = {}; 

async function getAccessToken() {
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
        const data = await res.json();
        accessToken = data.access_token;
        return accessToken;
    } catch (error) {
        console.error("Token Error:", error);
    }
}

async function initStationMap() {
    if (!accessToken) await getAccessToken();
    try {
        const res = await fetch("https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/Station?$format=JSON", {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        window.stationMap = {};
        data.forEach(s => { window.stationMap[s.StationID] = s.StationName.Zh_tw; });
    } catch (error) {
        console.error("車站資料抓取失敗:", error);
    }
}

async function fetchRealData(date) {
    if (!accessToken) await getAccessToken();
    if (Object.keys(window.stationMap || {}).length === 0) await initStationMap();
    try {
        const url = `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainDate/${date}?$format=JSON`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
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
    if (!accessToken) await getAccessToken();
    const url = `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/AvailableSeatStatus/Train/OD/${originID}/to/${destinationID}/TrainDate/${date}?$format=JSON`;
    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
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