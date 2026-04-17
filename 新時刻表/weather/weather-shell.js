(function () {
  if (window.__weatherShellLoaded) return;
  window.__weatherShellLoaded = true;

  function isEmbedded() {
    return window.parent && window.parent !== window;
  }

  function closeWeatherPage() {
    if (isEmbedded()) {
      window.parent.postMessage("APP_CLOSE", "*");
      return;
    }
    if (history.length > 1) history.back();
    else location.href = "index.html";
  }

  function addHeader() {
    if (document.querySelector(".weather-unified-header")) return;
    document.body.classList.add("weather-legacy-page");
    const header = document.createElement("header");
    header.className = "weather-unified-header";
    header.innerHTML = `
      <a class="weather-unified-brand" href="index.html" aria-label="回氣象專區首頁">
        <span>Wx</span>
        <div>
          <strong>氣象專區</strong>
          <small>Weather Console</small>
        </div>
      </a>
      <nav class="weather-unified-links" aria-label="氣象專區導覽">
        <a href="latest.html">最新天氣</a>
        <a href="alerts.html">警特報</a>
        <a href="earthquake.html">近期地震</a>
        <a href="index.html">工具首頁</a>
        <button type="button" data-weather-close>返回</button>
      </nav>
    `;
    document.body.prepend(header);
    header.querySelector("[data-weather-close]")?.addEventListener("click", closeWeatherPage);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addHeader);
  } else {
    addHeader();
  }
})();
