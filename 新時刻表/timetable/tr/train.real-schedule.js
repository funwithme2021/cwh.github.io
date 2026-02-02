
const TDX_CONFIG = {
    clientId: 'r36144112-d7b2ebdd-ce4c-40c3',
    clientSecret: '141d81d1-a450-4610-9309-412c8151cc3d'
};

// 全域變數，保持與原網頁邏輯銜接
window.trainSchedule = {}; 
let accessToken = "";
let stationMap = {}; // ID 轉 中文名
let liveDelayMap = {}; // 車次轉 誤點分鐘

// 1. 取得 TDX 存取權杖 (Access Token)
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

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Token 取得失敗: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        accessToken = data.access_token;
        console.log("Token 取得成功");
        return accessToken;
    } catch (error) {
        console.error("Critical Error (getAccessToken):", error);
        // 如果是在瀏覽器環境，這通常是 Client Secret 錯誤或 CORS 問題
    }
}




// 2. 初始化車站資料 (stationMap)
async function initStationMap() {
    if (!accessToken) await getAccessToken();
    try {
        const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Station?%24format=JSON", {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();

        // ✅ 重建並寫回 window.stationMap，確保 HTML 端拿得到
        window.stationMap = {};
        data.Stations.forEach(s => {
            window.stationMap[s.StationID] = s.StationName.Zh_tw;
        });
    } catch (error) {
        console.error("車站資料抓取失敗:", error);
    }
}

async function fetchRealData(date) {
    if (!accessToken) await getAccessToken();
    if (Object.keys(stationMap).length === 0) await initStationMap();

    try {
        const url = `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${date}?%24format=JSON`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const data = await res.json();

        const translated = {};

        // 這裡對應你貼出的 TrainTimetables 結構
        data.TrainTimetables.forEach(item => {
            const info = item.TrainInfo;
            const trainNo = info.TrainNo;

            // 處理車種名稱 (因為 API 會回傳長串如 "自強(3000)..."，我們簡化它)
            let typeName = info.TrainTypeName.Zh_tw;
            if (typeName.includes("自強(3000)")) typeName = "新自強";
            else if (typeName.includes("普悠瑪")) typeName = "普悠瑪";
            else if (typeName.includes("自強")) typeName = "自強號";
            else if (typeName.includes("區間快")) typeName = "區間快";
            else if (typeName.includes("區間")) typeName = "區間車";
            else if (typeName.includes("太魯閣(太魯閣)")) typeName = "太魯閣";
            else if (typeName.includes("莒光(無身障座位)")) typeName = "莒光號";
            else if (typeName.includes("莒光(有身障座位)")) typeName = "莒光號";

            translated[trainNo] = {
                '車種': typeName,
                '車站時間': item.StopTimes.map(stop => ([
  stop.StationName.Zh_tw,
  stop.DepartureTime, // ✅ 開車時間（station timetable 用這個）
  stop.ArrivalTime    // ✅ 到達時間（起迄查詢終點用這個）
]))

            };
        });

        window.trainSchedule = translated;
        console.log("資料轉換成功！範例車次 111:", window.trainSchedule['111']);
        
    } catch (error) {
        console.error("解析失敗:", error);
    }
}

// 4. 更新即時誤點資訊
async function updateLiveDelay() {
    if (!accessToken) await getAccessToken();
    try {
        const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard?%24format=JSON", {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        liveDelayMap = {};
        data.TrainLiveBoards.forEach(b => {
            liveDelayMap[b.TrainNo] = b.DelayTime;
        });
        console.log("即時誤點資訊已同步");
    } catch (error) {
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