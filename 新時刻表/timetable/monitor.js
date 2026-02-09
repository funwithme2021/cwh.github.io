/* monitor.js - v15 (單一訊息來源：跑馬燈=通知內容；狀態變動才通知；file:// 不註冊 SW) */
(() => {
  'use strict';

  // ===== Config =====
  window.TDX_CONFIG = window.TDX_CONFIG || {
    clientId: 'r36144112-d7b2ebdd-ce4c-40c3',
    clientSecret: '141d81d1-a450-4610-9309-412c8151cc3d'
  };

  // ===== State =====
  let tdxToken = null;
  let marqueeMsgs = [];
  let mIdx = 0;

  // notify state per monitor id
  const notifyState = { map: {} };
  function getState(id) {
    if (!notifyState.map[id]) {
      notifyState.map[id] = {
        lastStatus: null,   // only for "status change" notifications
        s10: false,
        s5: false
      };
    }
    return notifyState.map[id];
  }

  // ===== Paths =====
  const path = window.location.pathname || '';
  const isTrPage   = path.includes('/tr/');
  const isThsrPage = path.includes('/thsr/');
  const isHomePage = path.includes('/home/');
  // sw.js at /timetable/
  const SW_PATH   = (isHomePage || isTrPage || isThsrPage) ? '../sw.js' : './sw.js';
  // icon is in /timetable/home/
  const ICON_PATH = isHomePage ? './icon-192.png' : '../home/icon-192.png';

  // ===== Utils =====
  const pad2 = (n) => String(n).padStart(2, '0');
  const normalizeName = (str) => (str ? str.replace(/台/g, '臺').trim() : '');
  const hhmmToMinutes = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string' || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  // handle cross-midnight: if target time is "smaller" but within 12h window, treat as next day
  const diffMinutesTo = (hhmm) => {
    const t = hhmmToMinutes(hhmm);
    if (t == null) return null;
    const n = nowMinutes();
    let diff = t - n;
    // if it's "negative" but looks like it's actually next-day (e.g., now 23:50, target 00:10)
    if (diff < -720) diff += 1440;
    return diff;
  };

  // ===== TDX Token =====
  async function getTdxToken() {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', window.TDX_CONFIG.clientId);
      params.append('client_secret', window.TDX_CONFIG.clientSecret);
      const res = await fetch(
        'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        }
      );
      const json = await res.json();
      tdxToken = json?.access_token || null;
      return tdxToken;
    } catch (e) {
      console.warn('[monitor] token error', e);
      tdxToken = null;
      return null;
    }
  }

  // ===== Notifications =====
  function canRegisterSW() {
    const p = window.location.protocol;
    // allow http/https, and also allow localhost via http
    return (p === 'https:' || p === 'http:');
  }

  async function ensureNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  async function sendCleanNotification(title, body, tag = '') {
    const isPushOn = localStorage.getItem('push_enabled') === 'true';
    if (!isPushOn) return;

    const ok = await ensureNotificationPermission();
    if (!ok) return;

    // Prefer SW showNotification when available
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: ICON_PATH,
            badge: ICON_PATH,
            tag: tag || title, // allow overwrite for same train/type
            renotify: false
          });
          return;
        }
      }
    } catch (e) {
      // fall back below
      console.warn('[monitor] sw notify fallback', e);
    }

    try {
      // fallback (may not persist)
      new Notification(title, { body, icon: ICON_PATH, tag: tag || title });
    } catch (e) {
      console.warn('[monitor] notify error', e);
    }
  }

  // ===== TRA / THSR checks (your provided logic; output text is the single source of truth) =====
  const lastNotificationStates = {}; // key -> lastStatusText (status-only)

  async function checkThsrSchedule(target, forceFirst = false) {
    try {
      if (!tdxToken) await getTdxToken();
      if (!tdxToken) return { msg: `🚅 高鐵 ${target.no}次：授權失敗`, color: '#64748b' };

      const url = `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/Today/TrainNo/${target.no}?%24format=JSON`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${tdxToken}` } });
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        const msg = `🚅 高鐵 ${target.no}次：今日無行駛`;
        // first run still can notify (optional) — keep consistent with TRA
        if (forceFirst) await sendCleanNotification(`🚅 高鐵 ${target.no}次｜狀態更新`, msg, `thsr_${target.no}_status`);
        return { msg, color: '#64748b' };
      }

      const stops = data[0].StopTimes || [];
      if (stops.length === 0) return { msg: `🚅 高鐵 ${target.no}次：無停靠資料`, color: '#64748b' };

      const startTime = stops[0].DepartureTime;
      const endTime = stops[stops.length - 1].ArrivalTime;

      const nowStr = new Date().toTimeString().slice(0, 5);

      let status = '行駛中';
      if (nowStr < startTime) status = '未發車';
      else if (nowStr > endTime) status = '已到終點';

      let arrivalStr = '';
      let etaHHMM = null;

      if (status !== '已到終點') {
        if (target.stn) {
          const targetStop = stops.find(s => normalizeName(s.StationName?.Zh_tw) === normalizeName(target.stn));
          if (targetStop) {
            etaHHMM = targetStop.ArrivalTime;
            arrivalStr = `｜預計 ${targetStop.ArrivalTime} 抵達 ${target.stn}`;
          } else {
            arrivalStr = `｜(該車次不停靠 ${target.stn})`;
          }
        } else {
          const endStn = stops[stops.length - 1].StationName?.Zh_tw || '';
          arrivalStr = endStn ? `｜往 ${endStn}` : '';
        }
      }

      const msg = `${status}${arrivalStr}`;
      const stateKey = `thsr_${target.no}`;

      // status-change notification (only when status changes)
      const statusText = status;
      if (localStorage.getItem('push_enabled') === 'true') {
        if (forceFirst || lastNotificationStates[stateKey] !== statusText) {
          await sendCleanNotification(`🚅 高鐵 ${target.no}次｜狀態更新`, msg, `${stateKey}_status`);
          lastNotificationStates[stateKey] = statusText;
        }
      }

      // arrival reminders (10/5) use same eta time
      if (target.stn && etaHHMM) {
        const st = getState(stateKey);
        const diff = diffMinutesTo(etaHHMM);
        if (diff != null) {
          if (diff <= 11 && diff > 9 && !st.s10) {
            st.s10 = true;
            await sendCleanNotification(`🔔 高鐵 ${target.no}次｜即將到站`, `約 10 分鐘後抵達 ${target.stn}（${etaHHMM}）`, `${stateKey}_10`);
          }
          if (diff <= 6 && diff > 4 && !st.s5) {
            st.s5 = true;
            await sendCleanNotification(`🔔 高鐵 ${target.no}次｜即將到站`, `約 5 分鐘後抵達 ${target.stn}（${etaHHMM}）`, `${stateKey}_5`);
          }
          if (diff <= 0 && diff > -2) {
            // simple "arrived" window
            await sendCleanNotification(`✅ 高鐵 ${target.no}次｜到站`, `已到達 ${target.stn}（${etaHHMM}）`, `${stateKey}_arr`);
          }
        }
      }

      return { msg, color: '#fb923c' };
    } catch (e) {
      return { msg: `🚅 高鐵 ${target.no}次：資料錯誤`, color: '#64748b' };
    }
  }

  async function checkTraLive(target, forceFirst = false) {
    try {
      if (!tdxToken) await getTdxToken();
      if (!tdxToken) return { msg: `🚆 臺鐵 ${target.no}次：授權失敗`, color: '#64748b' };

      const liveUrl = `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard/TrainNo/${target.no}?%24format=JSON`;
      const liveRes = await fetch(liveUrl, { headers: { 'Authorization': `Bearer ${tdxToken}` } });
      const liveData = await liveRes.json();
      const trainLive = liveData?.TrainLiveBoards ? liveData.TrainLiveBoards[0] : null;

      if (!trainLive) {
        const msg = `🚆 臺鐵 ${target.no}次：查無資料`;
        if (forceFirst) await sendCleanNotification(`🚆 臺鐵 ${target.no}次｜狀態更新`, msg, `tra_${target.no}_status`);
        return { msg, color: '#64748b' };
      }

      const currentStn = trainLive.StationName?.Zh_tw || '--';
      const delay = parseInt(trainLive.DelayTime, 10);
      const statusStr = (Number.isFinite(delay) && delay > 0) ? `晚 ${delay} 分` : '準點';

      let arrivalStr = '';
      let etaHHMM = null;

      if (target.stn) {
        const timeUrl = `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/Today/TrainNo/${target.no}?%24format=JSON`;
        const timeRes = await fetch(timeUrl, { headers: { 'Authorization': `Bearer ${tdxToken}` } });
        const timeData = await timeRes.json();
        const tt = timeData?.TrainTimetables?.[0];
        const stops = tt?.StopTimes || [];
        const targetStop = stops.find(s => normalizeName(s.StationName?.Zh_tw) === normalizeName(target.stn));
        if (targetStop) {
          // predicted arrival = timetable arrival + delay
          const [h, m] = (targetStop.ArrivalTime || '00:00').split(':').map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          if (Number.isFinite(delay) && delay > 0) d.setMinutes(d.getMinutes() + delay);
          etaHHMM = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
          arrivalStr = `｜預計 ${etaHHMM} 抵達 ${target.stn}`;
        }
      }

      const msg = `目前在 ${currentStn}｜${statusStr}${arrivalStr ? arrivalStr : ''}`;
      const stateKey = `tra_${target.no}`;

      // status-change notification (only when status changes)
      const statusText = statusStr;
      if (localStorage.getItem('push_enabled') === 'true') {
        if (forceFirst || lastNotificationStates[stateKey] !== statusText) {
          await sendCleanNotification(`🚆 臺鐵 ${target.no}次｜狀態更新`, msg, `${stateKey}_status`);
          lastNotificationStates[stateKey] = statusText;
        }
      }

      // arrival reminders use same predicted ETA
      if (target.stn && etaHHMM) {
        const st = getState(stateKey);
        const diff = diffMinutesTo(etaHHMM);
        if (diff != null) {
          if (diff <= 11 && diff > 9 && !st.s10) {
            st.s10 = true;
            await sendCleanNotification(`🔔 臺鐵 ${target.no}次｜即將到站`, `約 10 分鐘後抵達 ${target.stn}（${etaHHMM}）`, `${stateKey}_10`);
          }
          if (diff <= 6 && diff > 4 && !st.s5) {
            st.s5 = true;
            await sendCleanNotification(`🔔 臺鐵 ${target.no}次｜即將到站`, `約 5 分鐘後抵達 ${target.stn}（${etaHHMM}）`, `${stateKey}_5`);
          }
          if (diff <= 0 && diff > -2) {
            await sendCleanNotification(`✅ 臺鐵 ${target.no}次｜到站`, `已到達 ${target.stn}（${etaHHMM}）`, `${stateKey}_arr`);
          }
        }
      }

      return { msg, color: (Number.isFinite(delay) && delay > 0) ? '#f87171' : '' };
    } catch (e) {
      return { msg: `🚆 臺鐵 ${target.no}次：資料讀取錯誤`, color: '#64748b' };
    }
  }

  // ===== Monitor system =====
  async function startMonitorSystem(forceFirst = false) {
    const enabled = (localStorage.getItem('monitor_enabled') === 'true' || localStorage.getItem('mon_enabled') === 'true');
    const marqueeEl = document.getElementById('monitorStatusText');

    if (!enabled) {
      if (marqueeEl) {
        marqueeEl.innerText = '監控未啟用';
        marqueeEl.className = 'monitor-text static';
      }
      return;
    }

    // Read targets (compatible with your existing storage keys)
    const mons = [
      { mode: 'TRA', no: (localStorage.getItem('mon_tr1_train') || localStorage.getItem('mon_train') || '').trim(), stn: (localStorage.getItem('mon_tr1_station') || localStorage.getItem('mon_station') || '').trim() },
      { mode: 'TRA', no: (localStorage.getItem('mon_tr2_train') || '').trim(), stn: (localStorage.getItem('mon_tr2_station') || '').trim() },
      { mode: 'THSR', no: (localStorage.getItem('mon_thsr_train') || '').trim(), stn: (localStorage.getItem('mon_thsr_station') || '').trim() }
    ].filter(x => x.no);

    if (mons.length === 0) {
      if (marqueeEl) {
        marqueeEl.innerText = '尚未設定監控車次';
        marqueeEl.className = 'monitor-text static';
      }
      return;
    }

    let results = [];
    for (const t of mons) {
      if (t.mode === 'TRA') results.push(await checkTraLive(t, forceFirst));
      else results.push(await checkThsrSchedule(t, forceFirst));
    }
    results = results.filter(Boolean);

    marqueeMsgs = results;
    if (marqueeEl && results.length > 0) updateMarqueeDisplay();
  }

  function updateMarqueeDisplay() {
    const el = document.getElementById('monitorStatusText');
    if (!el || marqueeMsgs.length === 0) return;
    el.className = 'monitor-text';
    el.innerText = marqueeMsgs[mIdx].msg;
    el.style.color = marqueeMsgs[mIdx].color || '';
    mIdx = (mIdx + 1) % marqueeMsgs.length;
  }

  // ===== Boot =====
  let firstTick = true;

  window.addEventListener('load', async () => {
    // SW register: skip file:// (origin null)
    if ('serviceWorker' in navigator) {
      if (canRegisterSW()) {
        navigator.serviceWorker.register(SW_PATH).catch((e) => console.warn('[monitor] sw register failed', e));
      } else {
        console.warn('[monitor] skip SW register on protocol:', window.location.protocol);
      }
    }

    const enabled = (localStorage.getItem('monitor_enabled') === 'true' || localStorage.getItem('mon_enabled') === 'true');
    if (!enabled) return;

    // first run: forceFirst=true so home/tr/thsr behave the same
    await startMonitorSystem(true);
    firstTick = false;

    // refresh loop
    setInterval(() => startMonitorSystem(false), 45000);
    setInterval(() => { if (marqueeMsgs.length > 0) updateMarqueeDisplay(); }, 5000);
  });

})();
