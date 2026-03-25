(function () {
  const COUNTER_ID = "89504295";
  const STRIP_ID = "railUsageStrip";
  const STYLE_ID = "rail-usage-strip-style";
  const REFRESH_MS = 60000;

  function shouldRenderFooter() {
    try {
      return window.top === window.self;
    } catch (_) {
      return false;
    }
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body.rail-usage-strip-mounted{
        padding-bottom: calc(58px + env(safe-area-inset-bottom, 0px));
      }
      body.rail-usage-strip-mounted .dock-container{
        bottom: calc(82px + env(safe-area-inset-bottom, 0px)) !important;
      }
      .rail-usage-strip{
        position:fixed;
        left:0;
        right:0;
        bottom:0;
        z-index:1400;
        border-top:1px solid var(--glass-border, rgba(255,255,255,0.08));
        background:var(--dock-bg, rgba(15, 23, 42, 0.92));
        backdrop-filter:blur(16px);
        -webkit-backdrop-filter:blur(16px);
        box-shadow:0 -14px 40px rgba(2,6,23,0.18);
      }
      body.light-mode .rail-usage-strip{
        border-top-color:rgba(15,23,42,0.08);
        box-shadow:0 -10px 28px rgba(15,23,42,0.08);
      }
      .rail-usage-strip-inner{
        min-height:44px;
        width:min(1180px, calc(100% - 24px));
        margin:0 auto;
        padding:8px 0 calc(8px + env(safe-area-inset-bottom, 0px));
        display:flex;
        align-items:center;
        justify-content:center;
        gap:18px;
        flex-wrap:wrap;
        color:var(--text-main, #e2e8f0);
        font-family:'Roboto Mono','Inter','Noto Sans TC',sans-serif;
        font-size:.86rem;
        font-weight:800;
        line-height:1.2;
        letter-spacing:.02em;
      }
      .rail-usage-item{
        display:inline-flex;
        align-items:center;
        gap:8px;
        white-space:nowrap;
      }
      .rail-usage-label{
        color:var(--text-main, #e2e8f0);
      }
      .rail-usage-number{
        display:inline-flex;
        align-items:center;
        min-height:16px;
      }
      .rail-usage-number img{
        display:block;
        height:14px;
        width:auto;
        image-rendering:auto;
      }
      @media (max-width: 720px){
        body.rail-usage-strip-mounted{
          padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
        }
        body.rail-usage-strip-mounted .dock-container{
          bottom: calc(88px + env(safe-area-inset-bottom, 0px)) !important;
        }
        .rail-usage-strip-inner{
          gap:8px 14px;
          min-height:48px;
          font-size:.78rem;
        }
        .rail-usage-number img{
          height:12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function buildCounterUrl(kind) {
    const cacheBust = `t=${Date.now()}`;
    if (kind === "views") return `https://counter1.fc2.com/counter_now.php?id=${COUNTER_ID}&${cacheBust}`;
    return `https://counter1.fc2.com/counter_img.php?id=${COUNTER_ID}&${cacheBust}`;
  }

  function refreshImages(root) {
    if (!root) return;
    root.querySelectorAll("img[data-counter-kind]").forEach((img) => {
      const kind = img.getAttribute("data-counter-kind");
      img.src = buildCounterUrl(kind);
    });
  }

  function mountFooter() {
    if (!shouldRenderFooter()) return;
    if (document.getElementById(STRIP_ID)) return;
    injectStyle();
    document.body.classList.add("rail-usage-strip-mounted");

    const strip = document.createElement("div");
    strip.id = STRIP_ID;
    strip.className = "rail-usage-strip";
    strip.innerHTML = `
      <div class="rail-usage-strip-inner" aria-label="網站使用統計">
        <div class="rail-usage-item">
          <span class="rail-usage-label">累積使用次數</span>
          <span class="rail-usage-number">
            <img data-counter-kind="total" src="${buildCounterUrl("total")}" alt="累積使用次數">
          </span>
        </div>
        <div class="rail-usage-item">
          <span class="rail-usage-label">在線人數</span>
          <span class="rail-usage-number">
            <img data-counter-kind="views" src="${buildCounterUrl("views")}" alt="在線人數">
          </span>
        </div>
      </div>
    `;

    document.body.appendChild(strip);
    window.setInterval(() => refreshImages(strip), REFRESH_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountFooter, { once: true });
  } else {
    mountFooter();
  }
})();
