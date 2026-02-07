/* monitor.js - v11 強制顯示目標版 */

window.TDX_CONFIG = window.TDX_CONFIG || { clientId: 'r36144112-d7b2ebdd-ce4c-40c3', clientSecret: '141d81d1-a450-4610-9309-412c8151cc3d' };

let tdxToken = null;
let marqueeMsgs = [];
let mIdx = 0;
const notifyState = { map: {} };

// --- 路徑修正 ---
const isTrPage = window.location.pathname.includes('/tr/');
const isThsrPage = window.location.pathname.includes('/thsr/');
const isHomePage = window.location.pathname.includes('/home/');
// sw.js 放在 /timetable/ 底下（home/tr/thsr 都往上一層）
const SW_PATH = (isHomePage || isTrPage || isThsrPage) ? '../sw.js' : './sw.js';
// icon 放在 /timetable/home/
const ICON_PATH = isHomePage ? './icon-192.png' : '../home/icon-192.png';


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

// --- 通知發送器 ---
function sendCleanNotification(title, body) {
    const pushEnabled = localStorage.getItem('push_enabled') === 'true';
    if (!pushEnabled || Notification.permission === 'denied') return;

    if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => {
            if(p === 'granted') sendCleanNotification(title, body);
        });
        return;
    }

    const options = {
        body: body,
        icon: ICON_PATH,
        tag: title,
        requireInteraction: false
    };

    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options))
            .catch(() => new Notification(title, options));
    } else {
        new Notification(title, options);
    }
}

// --- 輔助：計算時刻表時間 ---
function parseScheduleTime(baseDateStr, timeStr, previousTimeObj) {
    const [h, m] = timeStr.split(':').map(Number);
    let d = new Date(`${baseDateStr}T${timeStr}:00`);
    if (previousTimeObj && d < previousTimeObj) d.setDate(d.getDate() + 1);
    return d;
}

// --- 台鐵邏輯 ---
async function checkTRA(mon, forceFirst) {
    if (!mon.train) return null;
    try {
        // 1. LiveBoard
        const liveUrl = `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard/TrainNo/${mon.train}?$format=JSON`;
        const liveRes = await fetch(liveUrl, { headers: { Authorization: `Bearer ${tdxToken}` }});
        const liveData = await liveRes.json();
        const live = liveData.TrainLiveBoards?.[0];
        
        if (!live) return { msg: `${mon.train}次 無行駛資料`, color: '#64748b' };

        const delay = parseInt(live.DelayTime || 0);
        const statusText = delay > 0 ? `晚${delay}分` : "準點";
        const currentSt = live.StationName.Zh_tw;
        const trainType = (live.TrainTypeName?.Zh_tw || "").replace(/\(.*\)/, '');
        let actionText = "通過";

        // 2. Timetable (今天 + 昨天)
        const todayStr = getYmd(new Date());
        const yestDate = new Date(); yestDate.setDate(yestDate.getDate() - 1);
        const yestStr = getYmd(yestDate);

        const p1 = fetch(`https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${todayStr}/TrainNo/${mon.train}?$format=JSON`, { headers: { Authorization: `Bearer ${tdxToken}` }});
        const p2 = fetch(`https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${yestStr}/TrainNo/${mon.train}?$format=JSON`, { headers: { Authorization: `Bearer ${tdxToken}` }});
        
        const [res1, res2] = await Promise.all([p1, p2]);
        const data1 = await res1.json();
        const data2 = await res2.json();
        
        const candidates = [];
        if (data1.TrainTimetables) candidates.push({ date: todayStr, stops: data1.TrainTimetables[0].StopTimes });
        if (data2.TrainTimetables) candidates.push({ date: yestStr, stops: data2.TrainTimetables[0].StopTimes });

        // 3. 智慧比對
        let activeTargetStop = null;
        let foundStopInSchedule = false; // 是否在時刻表中找到目標站
        let minDiff = Infinity;
        const nowMs = new Date().getTime();

        for (let cand of candidates) {
            const currStopIdx = cand.stops.findIndex(s => normalizeName(s.StationName.Zh_tw) === normalizeName(currentSt));
            if (currStopIdx === -1) continue;

            // 如果目前車站在這份時刻表裡，我們就假設這份是可能的時刻表
            if (cand.stops[currStopIdx].StationName.Zh_tw === currentSt) {
                 actionText = "抵達"; // 修正狀態為抵達
            }

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
                    foundStopInSchedule = true;
                }
            }

            if (currTimeObj) {
                const estNow = currTimeObj.getTime() + (delay * 60000);
                const diff = Math.abs(estNow - nowMs);
                
                // 選出時間差距最小的 (或是唯一的) 班表
                if (diff < minDiff) {
                    minDiff = diff;
                    activeTargetStop = targetTimeObj; 
                }
            }
        }

        // 4. 準備輸出
        let etaStr = "";
        let diffMinutes = null;
        let targetInfoText = "";

        if (mon.target) {
            if (activeTargetStop) {
                // 有找到目標站與時間
                activeTargetStop.setMinutes(activeTargetStop.getMinutes() + delay);
                etaStr = `${pad2(activeTargetStop.getHours())}:${pad2(activeTargetStop.getMinutes())}`;
                
                // 計算倒數
                let arrTime = new Date(activeTargetStop);
                // 跨日最後防線：如果目標時間比現在早超過12小時，加一天
                if (arrTime < new Date() && (new Date() - arrTime) > 12 * 3600 * 1000) {
                     arrTime.setDate(arrTime.getDate() + 1);
                }
                diffMinutes = (arrTime - new Date()) / 60000;
                
                targetInfoText = ` ➔ ${mon.target} (${etaStr})`;
            } else if (!foundStopInSchedule) {
                // 該車次時刻表沒有這個站
                targetInfoText = ` ➔ ${mon.target} (該車次不停靠)`;
            } else {
                // 有這個站但算不出時間 (極罕見)
                targetInfoText = ` ➔ ${mon.target} (計算中)`;
            }
        }

        const title = `${mon.train}次 ${trainType} (${statusText})`;
        const body = `📍 目前在 ${currentSt}${mon.target ? '\n🏁 前往 ' + mon.target + (etaStr ? ' (' + etaStr + ')' : '') : ''}`;
        
        // 5. 通知與跑馬燈
        const st = getState(mon.id);
        const sig = `${mon.train}-${currentSt}-${statusText}-${etaStr}`;

        if (forceFirst || st.sig !== sig) {
            const isArrivalUpdate = (actionText === "抵達" && st.lastSt !== currentSt);
            const isStatusChange = (statusText !== (st.sig ? st.sig.split('-')[1] : ""));
            
            if (forceFirst || isArrivalUpdate || isStatusChange) {
                sendCleanNotification(title, body);
            }
            st.sig = sig;
            st.lastSt = currentSt;
        }

        if (diffMinutes !== null) {
            if (diffMinutes <= 11 && diffMinutes > 9 && !st.s10) { 
                st.s10 = true; 
                sendCleanNotification(`🔔 下車提醒`, `約 10 分鐘後抵達 ${mon.target}`); 
            }
            if (diffMinutes <= 6 && diffMinutes > 4 && !st.s5) { 
                st.s5 = true; 
                sendCleanNotification(`🔔 下車提醒`, `約 5 分鐘後抵達 ${mon.target}`); 
            }
        }

        return { msg: `${title} | ${currentSt}${targetInfoText}`, color: delay > 0 ? '#f87171' : '' };

    } catch (e) { console.error(e); return null; }
}

// --- 高鐵邏輯 ---
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
        let targetInfoText = "";
        let diffMinutes = null;

        if (mon.target) {
            if (etaTime) {
                targetInfoText = ` ➔ ${mon.target} (${etaTime})`;
                // 計算 Diff
                const now = new Date();
                const arr = new Date();
                const [h, m] = etaTime.split(':').map(Number);
                arr.setHours(h, m, 0);
                if(arr < now && (now - arr) > 12*3600*1000) arr.setDate(arr.getDate()+1);
                diffMinutes = (arr - now) / 60000;
            } else {
                targetInfoText = ` ➔ ${mon.target}`;
            }
        }
        
        const body = `📍 目前 ${actionText} ${currentSt}${mon.target ? '\n🏁 前往 ' + mon.target + (etaTime ? ' (' + etaTime + ')' : '') : ''}`;
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

        return { msg: `${title} | ${currentSt}${targetInfoText}`, color: '#fb923c' };

    } catch (e) { console.error(e); return null; }
}

// --- 系統啟動 ---
async function startMonitorSystem(forceFirst = false) {
    const enabled = (localStorage.getItem('monitor_enabled') === 'true' || localStorage.getItem('mon_enabled') === 'true');
    const marquee = document.getElementById('monitorStatusText');
    
    if (!enabled) {
        if(marquee) { marquee.innerText = "監控未啟用"; marquee.className = "monitor-text static"; }
        return;
    }

    const mons = [
  { id: 'tr1', mode: 'TRA', train: (localStorage.getItem('mon_tr1_train')||localStorage.getItem('mon_train')||''), target: (localStorage.getItem('mon_tr1_station')||localStorage.getItem('mon_station')||'') },
  { id: 'tr2', mode: 'TRA', train: (localStorage.getItem('mon_tr2_train')||''), target: (localStorage.getItem('mon_tr2_station')||'') },
  { id: 'thsr', mode: 'THSR', train: (localStorage.getItem('mon_thsr_train')||''), target: (localStorage.getItem('mon_thsr_station')||'') }
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
    if((localStorage.getItem('monitor_enabled') === 'true' || localStorage.getItem('mon_enabled') === 'true')) {
        await getTdxToken();
        startMonitorSystem(false);
        setInterval(() => startMonitorSystem(false), 45000); 
        setInterval(() => { if(marqueeMsgs.length > 0) updateMarqueeDisplay(); }, 5000); 
    }
});