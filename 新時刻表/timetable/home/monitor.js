/* monitor.js - 全域監控與通知核心 */

const TDX_CONFIG = {
    clientId: 'r36144112-d7b2ebdd-ce4c-40c3',
    clientSecret: '141d81d1-a450-4610-9309-412c8151cc3d'
};

let tdxToken = null;
let marqueeMsgs = [];
let mIdx = 0;
let marqueeInterval = null;
let monitorInterval = null;
const notifyState = { map: {} };

// --- 工具函式 ---
function normalizeName(str) { return str ? str.replace(/台/g, '臺').trim() : ''; }
function pad2(n) { return String(n).padStart(2,'0'); }
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
        if(data.access_token) {
            tdxToken = data.access_token;
            return true;
        }
    } catch (e) { console.error("Token Error:", e); }
    return false;
}

// --- 漂亮的通知發送器 ---
function sendPrettyNotification(title, status, location, target, eta, note = "") {
    // 檢查權限與開關
    const pushEnabled = localStorage.getItem('push_enabled') === 'true';
    
    if (!pushEnabled) return; // 使用者沒開推播開關，直接結束

    if (Notification.permission === 'denied') {
        // 如果被封鎖，顯示錯誤給使用者 (只顯示一次 alert 避免煩人，或在介面顯示紅字)
        console.warn("通知權限被拒絕");
        alert("⚠️ 無法發送通知\n\n您的瀏覽器已封鎖通知權限。\n請至「設定 > 網站設定 > 通知」中將此網站設為允許，才能收到到站提醒。");
        localStorage.setItem('push_enabled', 'false'); // 自動關閉開關以免重複嘗試
        location.reload(); // 重整以更新 UI 狀態
        return;
    }

    if (Notification.permission === 'default') {
        // 如果還沒詢問過，現在詢問
        Notification.requestPermission().then(p => {
            if(p === 'granted') sendPrettyNotification(title, status, location, target, eta, note);
        });
        return;
    }

    // --- 排版設計區 ---
    // 標題： [準點] 452次 新自強
    // 內容：
    // 📍 目前：台東 (抵達)
    // 🏁 前往：花蓮 (10:30)
    // ℹ️ 距離目標約 45 分鐘
    
    const bodyLines = [];
    bodyLines.push(`📍 目前：${location}`);
    if (target && eta) bodyLines.push(`🏁 前往：${target} (預計 ${eta})`);
    if (note) bodyLines.push(`ℹ️ ${note}`);

    const options = {
        body: bodyLines.join('\n'),
        icon: './icon-192.png', // 確保根目錄有此圖片
        tag: title, // 避免重複堆疊
        requireInteraction: false
    };

    // 嘗試使用 Service Worker 發送 (Android 支援度較好)
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, options);
        }).catch(() => new Notification(title, options));
    } else {
        new Notification(title, options);
    }
}

// --- 台鐵邏輯 ---
async function checkTRA(mon, forceFirst) {
    if (!mon.train) return null;
    try {
        const liveUrl = `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard/TrainNo/${mon.train}?$format=JSON`;
        const liveRes = await fetch(liveUrl, { headers: { Authorization: `Bearer ${tdxToken}` }});
        const liveData = await liveRes.json();
        const live = liveData.TrainLiveBoards?.[0];
        
        if (!live) return { msg: `台鐵 ${mon.train} | 無行駛資料`, color: '#64748b' };

        const delay = parseInt(live.DelayTime || 0);
        // 狀態圖示化
        const statusIcon = delay > 0 ? "🔴" : "🟢";
        const statusText = delay > 0 ? `晚${delay}分` : "準點";
        const statusDisplay = `${statusIcon} ${statusText}`;
        
        const currentSt = live.StationName.Zh_tw;
        let trainType = live.TrainTypeName?.Zh_tw || "";
        let actionText = "通過"; 
        let etaTime = ""; 
        let targetStop = null;
        let isStopStation = false;

        // 取得時刻表
        const ttUrl = `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainNo/${mon.train}?$format=JSON`;
        const ttRes = await fetch(ttUrl, { headers: { Authorization: `Bearer ${tdxToken}` }});
        const ttData = await ttRes.json();
        
        if (ttData.TrainTimetables && ttData.TrainTimetables.length > 0) {
            for (let tt of ttData.TrainTimetables) {
                const foundTgt = tt.StopTimes.find(s => normalizeName(s.StationName.Zh_tw) === normalizeName(mon.target));
                if (foundTgt) targetStop = foundTgt;
                const foundCurr = tt.StopTimes.find(s => normalizeName(s.StationName.Zh_tw) === normalizeName(currentSt));
                if (foundCurr) isStopStation = true;
                if (targetStop) break;
            }
        }

        if (isStopStation) actionText = "抵達"; // 若為停靠站，改為抵達

        let diffMin = null;
        if (mon.target && targetStop && targetStop.ArrivalTime) {
            const [h, m] = targetStop.ArrivalTime.split(':').map(Number);
            const d = new Date();
            d.setHours(h, m + delay);
            etaTime = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

            // 計算剩餘時間
            const now = new Date();
            const arr = new Date();
            arr.setHours(d.getHours(), d.getMinutes(), 0);
            if (arr < now && (now - arr) > 43200000) arr.setDate(arr.getDate() + 1);
            diffMin = (arr - now) / 60000;
        }

        // 組合通知
        const title = `${statusDisplay} | ${mon.train}次 ${trainType}`;
        const locationDesc = `${currentSt} (${actionText})`;
        
        const sig = `${mon.train}-${statusText}-${currentSt}-${actionText}-${etaTime}`;
        const st = getState(mon.id);

        // A. 狀態更新通知
        if (forceFirst || st.sig !== sig) {
            if (actionText === "抵達" && st.lastSt !== currentSt) {
                 sendPrettyNotification(title, statusText, locationDesc, mon.target, etaTime, "列車已進站");
            } else if (forceFirst || st.sig === null || statusText !== st.sig.split('-')[1]) {
                 sendPrettyNotification(title, statusText, locationDesc, mon.target, etaTime, "列車動態更新");
            }
            st.sig = sig;
            st.lastSt = currentSt;
        }

        // B. 下車提醒
        if (diffMin !== null) {
            if (diffMin <= 10.5 && diffMin > 9.5 && !st.s10) {
                st.s10 = true;
                sendPrettyNotification("🔔 下車提醒 (10分鐘)", statusText, locationDesc, mon.target, etaTime, "請準備收拾行李");
            }
            if (diffMin <= 5.5 && diffMin > 4.5 && !st.s5) {
                st.s5 = true;
                sendPrettyNotification("🔔 下車提醒 (5分鐘)", statusText, locationDesc, mon.target, etaTime, "即將抵達，請前往車門");
            }
        }

        const etaStr = etaTime ? ` | 預計 ${etaTime} 抵達` : "";
        return {
            msg: `台鐵 ${mon.train} ${statusText} | ${actionText} ${currentSt}${etaStr}`,
            color: delay > 0 ? '#f87171' : ''
        };

    } catch (e) { console.error(e); return null; }
}

// --- 高鐵邏輯 ---
async function checkTHSR(mon, forceFirst) {
    if (!mon.train) return null;
    try {
        const today = new Date().toISOString().split('T')[0];
        const url = `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainNo/${mon.train}/TrainDate/${today}?$format=JSON`;
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
                if (nowStr >= arr && nowStr <= dep) {
                    currentSt = s.StationName.Zh_tw;
                    actionText = "抵達";
                } else if (dep < nowStr) {
                    currentSt = s.StationName.Zh_tw; 
                    actionText = "通過"; // 已離站
                }
                if (mon.target && normalizeName(s.StationName.Zh_tw) === normalizeName(mon.target)) {
                    etaTime = s.ArrivalTime;
                }
            }
        }

        let diffMin = null;
        if (etaTime && mon.target) {
            const now = new Date();
            const arr = new Date();
            const [ah, am] = etaTime.split(':').map(Number);
            arr.setHours(ah, am, 0);
            diffMin = (arr - now) / 60000;
        }

        const title = `🚅 高鐵 ${mon.train}次`;
        const locationDesc = `${currentSt} (${actionText})`;
        const sig = `THSR-${currentSt}-${actionText}`;
        const st = getState(mon.id);

        if (forceFirst || st.sig !== sig) {
            sendPrettyNotification(title, "表定", locationDesc, mon.target, etaTime, "高鐵行駛狀態更新");
            st.sig = sig;
        }

        if (diffMin !== null) {
            if (diffMin <= 10.5 && diffMin > 9.5 && !st.s10) {
                st.s10 = true;
                sendPrettyNotification("🔔 下車提醒 (10分鐘)", "表定", locationDesc, mon.target, etaTime, "高鐵即將抵達");
            }
            if (diffMin <= 5.5 && diffMin > 4.5 && !st.s5) {
                st.s5 = true;
                sendPrettyNotification("🔔 下車提醒 (5分鐘)", "表定", locationDesc, mon.target, etaTime, "高鐵即將抵達");
            }
        }

        const etaStr = etaTime ? ` | 預計 ${etaTime} 抵達` : "";
        return {
            msg: `高鐵 ${mon.train} | ${actionText} ${currentSt}${etaStr}`,
            color: '#fb923c'
        };

    } catch (e) { console.error(e); return null; }
}

// --- 啟動器 ---
async function startMonitorSystem(forceFirst = false) {
    const enabled = localStorage.getItem('mon_enabled') === 'true';
    const marquee = document.getElementById('monitorStatusText');
    
    // 如果沒有 marquee 元素 (可能在 tr.html)，則只執行通知不執行跑馬燈
    
    if (!enabled) {
        if(marquee) {
            marquee.innerText = "監控未啟用";
            marquee.className = "monitor-text static";
        }
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
    if(marquee) {
        if (results.length === 0) {
            marquee.innerText = "無監控資料";
            marquee.className = "monitor-text static";
        } else {
            updateMarqueeDisplay();
        }
    }
}

function updateMarqueeDisplay() {
    const el = document.getElementById('monitorStatusText');
    if (!el || marqueeMsgs.length === 0) return;
    el.className = "monitor-text";
    el.innerText = marqueeMsgs[mIdx].msg;
    el.style.color = marqueeMsgs[mIdx].color || "";
    mIdx = (mIdx + 1) % marqueeMsgs.length;
}

// --- 初始化 ---
// 這裡會自動偵測頁面載入並開始監控
window.addEventListener('load', async () => {
    if(localStorage.getItem('mon_enabled') === 'true') {
        await getTdxToken();
        startMonitorSystem(false);
        // 啟動循環
        setInterval(() => startMonitorSystem(false), 20000); // 每20秒檢查一次通知
        setInterval(() => { if(marqueeMsgs.length > 0) updateMarqueeDisplay(); }, 5000); // 每5秒切換跑馬燈
    }
});