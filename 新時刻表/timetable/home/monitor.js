/* monitor.js - v10 智慧跨日修正版 */

const TDX_CONFIG = {
    clientId: 'r36144112-d7b2ebdd-ce4c-40c3',
    clientSecret: '141d81d1-a450-4610-9309-412c8151cc3d'
};

let tdxToken = null;
let marqueeMsgs = [];
let mIdx = 0;
const notifyState = { map: {} };

// --- 路徑修正 ---
const isSubPage = window.location.pathname.includes('/tr/') || window.location.pathname.includes('/thsr/');
const BASE_PATH = isSubPage ? '../' : './';
const ICON_PATH = `${BASE_PATH}icon-192.png`;
const SW_PATH = `${BASE_PATH}sw.js`;

// --- 工具函式 ---
function normalizeName(str) { return str ? str.replace(/台/g, '臺').trim() : ''; }
function pad2(n) { return String(n).padStart(2,'0'); }
function getYmd(date) { return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`; }
function getState(id) {
    if (!notifyState.map[id]) notifyState.map[id] = { sig:null, lastSt:null, s10:false, s5:false };
    return notifyState.map[id];
}

// --- TDX Token ---
async function getTdxToken() {
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', TDX_CONFIG.clientId);
        params.append('client_secret', TDX_CONFIG.clientSecret);
        const res = await fetch('https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        const data = await res.json();
        if(data.access_token) { tdxToken = data.access_token; return true; }
    } catch (e) { console.error("Token Error", e); }
    return false;
}

// --- 通知發送器 (強制跳出) ---
function sendCleanNotification(title, body) {
    const pushEnabled = localStorage.getItem('push_enabled') === 'true';
    if (!pushEnabled || Notification.permission === 'denied') return;

    // 請求權限
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => {
            if(p === 'granted') sendCleanNotification(title, body);
        });
        return;
    }

    const options = {
        body: body,
        icon: ICON_PATH,
        tag: title, // 使用標題作為 tag，避免重複通知堆疊，但內容更新時會刷新
        requireInteraction: false, // 是否需手動關閉
        silent: false
    };

    // 優先嘗試 Service Worker (Android 支援度較好)
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, options);
        }).catch(() => new Notification(title, options));
    } else {
        new Notification(title, options);
    }
}

// --- 輔助：計算某個時刻表的時間點 (處理跨日) ---
function parseScheduleTime(baseDateStr, timeStr, previousTimeObj) {
    // baseDateStr: "2024-02-06", timeStr: "00:30"
    const [h, m] = timeStr.split(':').map(Number);
    let d = new Date(`${baseDateStr}T${timeStr}:00`);
    
    // 如果這個時間點比前一站的時間早 (例如前一站 23:50，這一站 00:10)，代表跨日了
    if (previousTimeObj && d < previousTimeObj) {
        d.setDate(d.getDate() + 1);
    }
    return d;
}

// --- 台鐵邏輯 (智慧雙日比對) ---
async function checkTRA(mon, forceFirst) {
    if (!mon.train) return null;
    try {
        // 1. LiveBoard: 先看車子現在在哪
        const liveUrl = `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard/TrainNo/${mon.train}?$format=JSON`;
        const liveRes = await fetch(liveUrl, { headers: { Authorization: `Bearer ${tdxToken}` }});
        const liveData = await liveRes.json();
        const live = liveData.TrainLiveBoards?.[0];
        
        if (!live) return { msg: `${mon.train}次 無即時資料`, color: '#64748b' };

        const delay = parseInt(live.DelayTime || 0);
        const statusText = delay > 0 ? `晚${delay}分` : "準點";
        const currentSt = live.StationName.Zh_tw;
        const trainType = (live.TrainTypeName?.Zh_tw || "").replace(/\(.*\)/, '');
        
        let actionText = "通過"; // LiveBoard 預設不給抵達資訊，除非是終點
        // 但我們可以透過 API 的 IsStationTerminal 或其他欄位判斷，這裡先保留「通過/在」的語意

        // 2. Timetable: 抓取 今天 與 昨天 的班表
        const today = new Date();
        const todayStr = getYmd(today);
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        const yestStr = getYmd(yest);

        const p1 = fetch(`https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${todayStr}/TrainNo/${mon.train}?$format=JSON`, { headers: { Authorization: `Bearer ${tdxToken}` }});
        const p2 = fetch(`https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${yestStr}/TrainNo/${mon.train}?$format=JSON`, { headers: { Authorization: `Bearer ${tdxToken}` }});
        
        const [res1, res2] = await Promise.all([p1, p2]);
        const data1 = await res1.json(); // 今天
        const data2 = await res2.json(); // 昨天

        // 整理候選名單
        let candidates = [];
        if (data1.TrainTimetables) candidates.push({ date: todayStr, stops: data1.TrainTimetables[0].StopTimes });
        if (data2.TrainTimetables) candidates.push({ date: yestStr, stops: data2.TrainTimetables[0].StopTimes });

        // 3. 智慧比對：哪一個班表才是「現在這班車」？
        let activeSchedule = null;
        let activeTargetStop = null;
        let activeDateBase = null;

        // 我們計算「目前車站」在時刻表上的時間，與「現在時間」的差距，最小的就是正確的班表
        let minDiff = Infinity;
        const nowMs = new Date().getTime();

        for (let cand of candidates) {
            // 找到目前車站在這份班表的位置
            const currStopIdx = cand.stops.findIndex(s => normalizeName(s.StationName.Zh_tw) === normalizeName(currentSt));
            if (currStopIdx === -1) continue; // 這份班表沒有這個站，跳過

            // 依序推算時間 (處理跨日)
            let prevTime = null;
            let currTimeObj = null;
            let targetTimeObj = null;

            for (let i = 0; i < cand.stops.length; i++) {
                const s = cand.stops[i];
                const tStr = s.ArrivalTime || s.DepartureTime;
                const tObj = parseScheduleTime(cand.date, tStr, prevTime);
                prevTime = tObj;

                if (i === currStopIdx) currTimeObj = tObj;
                if (mon.target && normalizeName(s.StationName.Zh_tw) === normalizeName(mon.target)) {
                    targetTimeObj = tObj;
                }
            }

            if (currTimeObj) {
                // 加上誤點後的預估現在時間
                const estimatedArrivalNow = currTimeObj.getTime() + (delay * 60000);
                const diff = Math.abs(estimatedArrivalNow - nowMs);
                
                // 如果誤差在 12 小時內 (避免抓到明年今天的車)，且比之前的更準
                if (diff < 12 * 3600 * 1000 && diff < minDiff) {
                    minDiff = diff;
                    activeSchedule = cand;
                    activeTargetStop = targetTimeObj; // 這是已經計算好日期的 Date 物件
                    activeDateBase = cand.date;

                    // 順便判斷是不是停靠站
                    if (currStopIdx >= 0) {
                        // 簡單邏輯：如果時刻表有列出，通常是停靠，除非 StopSequence 有特殊標記
                        // 這裡假設有列出就是停靠站，除非是通過站(通常API不回傳通過站)
                         actionText = "抵達"; // 修改狀態為抵達
                    }
                }
            }
        }

        // 4. 準備輸出資訊
        let etaStr = "";
        let diffMinutes = null;
        let targetLine = "";

        if (activeTargetStop) {
            // 加上誤點
            activeTargetStop.setMinutes(activeTargetStop.getMinutes() + delay);
            
            etaStr = `${pad2(activeTargetStop.getHours())}:${pad2(activeTargetStop.getMinutes())}`;
            diffMinutes = (activeTargetStop.getTime() - new Date().getTime()) / 60000;
            
            targetLine = `\n🏁 往 ${mon.target} 預計 ${etaStr} 抵達`;
        } else if (mon.target) {
            targetLine = `\n🏁 往 ${mon.target} (查無時刻)`;
        }

        // 標題與內文
        const title = `${mon.train}次 ${trainType} (${statusText})`;
        const body = `📍 目前在 ${currentSt}${targetLine}`;
        
        // 5. 通知邏輯
        const st = getState(mon.id);
        const sig = `${mon.train}-${currentSt}-${statusText}-${etaStr}`; // 狀態簽名

        // A. 狀態更新 (站點改變、誤點改變、或第一次)
        // 這裡放寬條件：只要站點變了，或者第一次，就跳通知
        if (forceFirst || st.lastSt !== currentSt) {
            sendCleanNotification(title, body);
            st.sig = sig;
            st.lastSt = currentSt;
        }

        // B. 到站提醒 (10分鐘 / 5分鐘)
        // 使用 diffMinutes，範圍放寬一點避免漏掉
        if (diffMinutes !== null) {
            // 10分鐘提醒 (範圍 9~11分，且之前沒跳過)
            if (diffMinutes <= 11 && diffMinutes > 9 && !st.s10) {
                st.s10 = true;
                sendCleanNotification(`🔔 即將抵達 ${mon.target}`, `剩餘約 10 分鐘 (${etaStr} 抵達)`);
            }
            // 5分鐘提醒 (範圍 4~6分)
            if (diffMinutes <= 6 && diffMinutes > 4 && !st.s5) {
                st.s5 = true;
                sendCleanNotification(`🔔 快到了！${mon.target}`, `剩餘約 5 分鐘 (${etaStr} 抵達)，請準備下車`);
            }
        }

        const marqueeText = `${title} | ${currentSt} ${etaStr ? '➔ '+etaStr : ''}`;
        return { msg: marqueeText, color: delay > 0 ? '#f87171' : '' };

    } catch (e) { console.error(e); return null; }
}

// --- 高鐵邏輯 (維持原樣，但確保格式一致) ---
async function checkTHSR(mon, forceFirst) {
    if (!mon.train) return null;
    try {
        const todayStr = getYmd(new Date());
        const url = `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainNo/${mon.train}/TrainDate/${todayStr}?$format=JSON`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${tdxToken}` }});
        const data = await res.json();
        const tt = data?.[0];

        if (!tt) return { msg: `高鐵 ${mon.train} | 無今日時刻`, color: '#64748b' };

        const nowStr = `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`;
        let currentSt = "起站";
        let actionText = "在";
        let etaTime = "";

        if (tt.StopTimes) {
            for (let s of tt.StopTimes) {
                const dep = s.DepartureTime;
                const arr = s.ArrivalTime;
                if (nowStr >= arr && nowStr <= dep) { currentSt = s.StationName.Zh_tw; actionText = "抵達"; }
                else if (dep < nowStr) { currentSt = s.StationName.Zh_tw; actionText = "通過"; }
                
                if (mon.target && normalizeName(s.StationName.Zh_tw) === normalizeName(mon.target)) {
                    etaTime = s.ArrivalTime;
                }
            }
        }

        const title = `🚅 高鐵 ${mon.train}次`;
        let targetLine = "";
        let diffMinutes = null;

        if (mon.target) {
            if (etaTime) {
                targetLine = `\n🏁 往 ${mon.target} 預計 ${etaTime} 抵達`;
                // 計算 diff
                const now = new Date();
                const arr = new Date();
                const [h, m] = etaTime.split(':').map(Number);
                arr.setHours(h, m, 0);
                if(arr < now && (now - arr) > 12*3600*1000) arr.setDate(arr.getDate()+1);
                diffMinutes = (arr - now) / 60000;
            } else {
                targetLine = `\n🏁 往 ${mon.target}`;
            }
        }
        
        const body = `目前 ${actionText} ${currentSt}${targetLine}`;
        const sig = `THSR-${currentSt}-${actionText}`;
        const st = getState(mon.id);

        if (forceFirst || st.sig !== sig) {
            sendCleanNotification(title, body);
            st.sig = sig;
        }

        if (diffMinutes !== null) {
            if (diffMinutes <= 11 && diffMinutes > 9 && !st.s10) { st.s10 = true; sendCleanNotification(`🔔 下車提醒`, `約 10 分鐘後抵達 ${mon.target}`); }
            if (diffMinutes <= 6 && diffMinutes > 4 && !st.s5)   { st.s5 = true; sendCleanNotification(`🔔 下車提醒`, `約 5 分鐘後抵達 ${mon.target}`); }
        }

        return { msg: `${title} | ${currentSt}`, color: '#fb923c' };

    } catch (e) { console.error(e); return null; }
}

// --- 系統啟動 ---
async function startMonitorSystem(forceFirst = false) {
    const enabled = localStorage.getItem('mon_enabled') === 'true';
    const marquee = document.getElementById('monitorStatusText');
    
    if (!enabled) {
        if(marquee) { marquee.innerText = "監控未啟用"; marquee.className = "monitor-text static"; }
        return;
    }

    const mons = [
        { id: 'tr1', mode: 'TRA', train: localStorage.getItem('mon_tr1_train'), target: localStorage.getItem('mon_tr1_station') },
        { id: 'tr2', mode: 'TRA', train: localStorage.getItem('mon_tr2_train'), target: localStorage.getItem('mon_tr2_station') },
        { id: 'thsr', mode: 'THSR', train: localStorage.getItem('mon_thsr_train'), target: localStorage.getItem('mon_thsr_station') }
    ];

    let results = [];
    for (let m of mons) {
        if (m.train) {
            if(!tdxToken) await getTdxToken();
            const res = m.mode === 'TRA' ? await checkTRA(m, forceFirst) : await checkTHSR(m, forceFirst);
            if (res) results.push(res);
        }
    }
    
    marqueeMsgs = results;
    if(marquee && results.length > 0) updateMarqueeDisplay();
}

function updateMarqueeDisplay() {
    const el = document.getElementById('monitorStatusText');
    if (!el || marqueeMsgs.length === 0) return;
    el.className = "monitor-text";
    el.innerText = marqueeMsgs[mIdx].msg;
    el.style.color = marqueeMsgs[mIdx].color || "";
    mIdx = (mIdx + 1) % marqueeMsgs.length;
}

window.addEventListener('load', async () => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(SW_PATH).catch(console.error);
    if(localStorage.getItem('mon_enabled') === 'true') {
        await getTdxToken();
        // 第一次不強制跳通知，避免重新整理時一直跳
        startMonitorSystem(false);
        // 每 20 秒檢查一次
        setInterval(() => startMonitorSystem(false), 20000); 
        // 每 5 秒切換跑馬燈
        setInterval(() => { if(marqueeMsgs.length > 0) updateMarqueeDisplay(); }, 5000); 
    }
});