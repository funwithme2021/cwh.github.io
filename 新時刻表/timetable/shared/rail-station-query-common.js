(function () {
  "use strict";

  const api = window.RailStationQueryCommon = window.RailStationQueryCommon || {};
  const STYLE_ID = "rail-station-query-common-style";
  const DEFAULT_LIMIT = 50;
  const DEFAULT_EMPTY_TEXT = "找不到符合的選項";
  const DEFAULT_HOST_SELECTORS = [
    ".query-field-control",
    ".input-group",
    ".rod2-wrap",
    ".rtq2-input-wrap",
    ".rsv2-input-wrap",
  ];
  const state = {
    activeInput: null,
    activeIndex: -1,
    globalBound: false,
  };
  const configMap = new WeakMap();
  const menuMap = new WeakMap();

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.rail-query-suggest-host{
  position:relative;
}
.rail-query-suggest-menu{
  position:fixed;
  display:none;
  padding:8px;
  border-radius:18px;
  border:1px solid rgba(148,163,184,0.18);
  background:#ffffff;
  color:var(--text-main, #0f172a);
  box-shadow:0 24px 48px rgba(15,23,42,0.16);
  backdrop-filter:blur(18px);
  z-index:20050;
}
body.dark-mode .rail-query-suggest-menu{
  background:rgba(15,23,42,0.98);
  color:#e2e8f0;
  border-color:rgba(148,163,184,0.18);
  box-shadow:0 20px 40px rgba(2,6,23,0.42);
}
.rail-query-suggest-menu.is-open{
  display:block;
}
.rail-query-suggest-list{
  display:grid;
  gap:4px;
  max-height:var(--rail-query-suggest-max-height, 240px);
  overflow:auto;
}
.rail-query-suggest-item{
  display:flex;
  align-items:center;
  gap:10px;
  width:100%;
  min-height:40px;
  padding:10px 12px;
  border:none;
  border-radius:14px;
  background:transparent;
  color:inherit;
  text-align:left;
  font:inherit;
  cursor:pointer;
  transition:background .16s ease, color .16s ease, transform .16s ease;
}
body.dark-mode .rail-query-suggest-item{
  color:#e2e8f0;
}
.rail-query-suggest-item:hover,
.rail-query-suggest-item.is-active{
  background:var(--primary-bg, rgba(37,99,235,0.12));
  color:var(--primary, #2563eb);
  transform:translateY(-1px);
}
body.dark-mode .rail-query-suggest-item:hover,
body.dark-mode .rail-query-suggest-item.is-active{
  color:#ffffff;
}
.rail-query-suggest-item-label{
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-size:0.92rem;
  font-weight:800;
  line-height:1.2;
  color:inherit;
}
.rail-query-suggest-empty{
  padding:12px 14px;
  color:var(--text-muted, #64748b);
  font-size:0.86rem;
  font-weight:700;
}
body.dark-mode .rail-query-suggest-empty{
  color:#cbd5e1;
}
`;
    document.head.appendChild(style);
  }

  function ensureGlobalHandlers() {
    if (state.globalBound) return;
    state.globalBound = true;
    document.addEventListener("mousedown", (event) => {
      const input = state.activeInput;
      if (!input) return;
      const menu = menuMap.get(input);
      if (menu && menu.contains(event.target)) return;
      const host = findSuggestHost(input, configMap.get(input) || {});
      if (host && host.contains(event.target)) return;
      closeSuggestMenu(input);
    });
    window.addEventListener("resize", positionActiveSuggestMenu);
    document.addEventListener("scroll", positionActiveSuggestMenu, true);
  }

  function normalizeMatchText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[臺台]/g, "台");
  }

  function normalizeItems(items) {
    return (Array.isArray(items) ? items : [])
      .map((item) => {
        if (typeof item === "string") {
          const text = String(item || "").trim();
          return text ? { value: text, label: text, searchText: text } : null;
        }
        if (!item || typeof item !== "object") return null;
        const value = String(item.value ?? item.label ?? "").trim();
        if (!value) return null;
        const label = String(item.label ?? value).trim() || value;
        const searchText = String(item.searchText ?? `${value} ${label}`).trim();
        return { ...item, value, label, searchText };
      })
      .filter(Boolean);
  }

  function filterItems(items, query, limit) {
    const max = Math.max(1, Number(limit) || DEFAULT_LIMIT);
    const q = normalizeMatchText(query);
    if (!q) return items.slice(0, max);
    return items
      .map((item, index) => {
        const haystack = normalizeMatchText(item.searchText || item.label || item.value || "");
        const valueText = normalizeMatchText(item.value || "");
        const hitIndex = haystack.indexOf(q);
        if (hitIndex < 0) return null;
        return {
          ...item,
          _rank: valueText.startsWith(q) ? 0 : (hitIndex === 0 ? 1 : 2),
          _hitIndex: hitIndex,
          _order: index,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a._rank - b._rank || a._hitIndex - b._hitIndex || a._order - b._order)
      .slice(0, max);
  }

  function findSuggestHost(input, config) {
    const selectors = Array.isArray(config?.hostSelectors) && config.hostSelectors.length
      ? config.hostSelectors
      : DEFAULT_HOST_SELECTORS;
    for (let index = 0; index < selectors.length; index += 1) {
      const host = input.closest(selectors[index]);
      if (host) return host;
    }
    return input.parentElement || input;
  }

  function getSuggestMenu(input) {
    if (!input) return null;
    const config = configMap.get(input) || {};
    const host = findSuggestHost(input, config);
    if (!host) return null;
    host.classList.add("rail-query-suggest-host");
    let menu = menuMap.get(input);
    if (menu && menu.isConnected) return menu;
    menu = document.createElement("div");
    menu.className = "rail-query-suggest-menu";
    menu.hidden = true;
    menu.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    menu.addEventListener("click", (event) => {
      const button = event.target.closest(".rail-query-suggest-item");
      if (!button) return;
      event.preventDefault();
      selectSuggestValue(input, button.dataset.value || "");
    });
    document.body.appendChild(menu);
    menuMap.set(input, menu);
    return menu;
  }

  function positionSuggestMenu(input) {
    const menu = menuMap.get(input);
    if (!input || !menu || menu.hidden) return;
    const config = configMap.get(input) || {};
    const host = findSuggestHost(input, config);
    const anchor = host || input;
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const padding = 12;
    const width = Math.min(Math.max(rect.width, 220), Math.max(220, viewportWidth - padding * 2));
    const left = Math.min(Math.max(padding, rect.left), Math.max(padding, viewportWidth - width - padding));
    const availableBelow = Math.max(120, viewportHeight - rect.bottom - padding - 8);
    const availableAbove = Math.max(120, rect.top - padding - 8);
    const openUpward = availableBelow < 180 && availableAbove > availableBelow;
    menu.style.left = `${left}px`;
    menu.style.width = `${width}px`;
    menu.style.top = openUpward ? "auto" : `${Math.max(padding, rect.bottom + 8)}px`;
    menu.style.bottom = openUpward ? `${Math.max(padding, viewportHeight - rect.top + 8)}px` : "auto";
    menu.style.setProperty("--rail-query-suggest-max-height", `${Math.min(320, openUpward ? availableAbove : availableBelow)}px`);
  }

  function positionActiveSuggestMenu() {
    if (!state.activeInput) return;
    positionSuggestMenu(state.activeInput);
  }

  function closeSuggestMenu(targetInput) {
    const input = targetInput || state.activeInput;
    if (!input) return;
    const menu = getSuggestMenu(input);
    if (menu) {
      menu.hidden = true;
      menu.classList.remove("is-open");
      menu.innerHTML = "";
    }
    if (!targetInput || targetInput === state.activeInput) {
      state.activeInput = null;
      state.activeIndex = -1;
    }
  }

  function setActiveIndex(input, index) {
    const menu = getSuggestMenu(input);
    const buttons = Array.from(menu?.querySelectorAll(".rail-query-suggest-item") || []);
    if (!buttons.length) {
      state.activeIndex = -1;
      return;
    }
    const nextIndex = ((index % buttons.length) + buttons.length) % buttons.length;
    state.activeInput = input;
    state.activeIndex = nextIndex;
    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === nextIndex;
      button.classList.toggle("is-active", active);
      if (active) button.scrollIntoView({ block: "nearest" });
    });
  }

  function renderSuggestMenu(input) {
    if (!input || input.hidden || input.offsetParent === null) {
      closeSuggestMenu(input);
      return;
    }
    if (state.activeInput && state.activeInput !== input) {
      closeSuggestMenu(state.activeInput);
    }
    const config = configMap.get(input) || {};
    const items = filterItems(
      normalizeItems(typeof config.getItems === "function" ? config.getItems(input) : []),
      input.value || "",
      config.limit
    );
    const menu = getSuggestMenu(input);
    if (!menu) return;
    if (!items.length) {
      menu.innerHTML = `<div class="rail-query-suggest-empty">${String(config.emptyText || DEFAULT_EMPTY_TEXT)}</div>`;
      positionSuggestMenu(input);
      menu.hidden = false;
      menu.classList.add("is-open");
      state.activeInput = input;
      state.activeIndex = -1;
      return;
    }
    menu.innerHTML = `<div class="rail-query-suggest-list">${items.map((item) => `
      <button class="rail-query-suggest-item" type="button" data-value="${escapeHtml(item.value)}">
        <span class="rail-query-suggest-item-label">${escapeHtml(item.label || item.value)}</span>
      </button>
    `).join("")}</div>`;
    positionSuggestMenu(input);
    menu.hidden = false;
    menu.classList.add("is-open");
    state.activeInput = input;
    setActiveIndex(input, 0);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function selectSuggestValue(input, value) {
    if (!input) return;
    input.value = value;
    const config = configMap.get(input) || {};
    if (typeof config.onSelect === "function") {
      config.onSelect(input, value);
    }
    closeSuggestMenu(input);
    input.focus();
  }

  function queueRender(input) {
    const config = configMap.get(input) || {};
    const seq = (Number(input.dataset.rqcSuggestSeq || "0") || 0) + 1;
    input.dataset.rqcSuggestSeq = String(seq);
    Promise.resolve(typeof config.beforeOpen === "function" ? config.beforeOpen(input) : null)
      .catch(() => null)
      .then(() => {
        if (String(input.dataset.rqcSuggestSeq || "") !== String(seq)) return;
        renderSuggestMenu(input);
      });
  }

  function bindSuggestInput(inputOrId, config = {}) {
    ensureStyles();
    ensureGlobalHandlers();
    const input = typeof inputOrId === "string" ? document.getElementById(inputOrId) : inputOrId;
    if (!input) return null;

    const mergedConfig = {
      limit: DEFAULT_LIMIT,
      emptyText: DEFAULT_EMPTY_TEXT,
      hostSelectors: DEFAULT_HOST_SELECTORS,
      ...config,
    };
    configMap.set(input, mergedConfig);

    if (input.dataset.rqcSuggestBound === "1") return input;
    input.dataset.rqcSuggestBound = "1";
    input.removeAttribute("list");
    input.setAttribute("autocomplete", "off");

    input.addEventListener("focus", () => {
      queueRender(input);
    });
    input.addEventListener("input", () => {
      const currentConfig = configMap.get(input) || {};
      if (typeof currentConfig.onInput === "function") currentConfig.onInput(input);
      queueRender(input);
    });
    input.addEventListener("keydown", (event) => {
      const menu = getSuggestMenu(input);
      const buttons = Array.from(menu?.querySelectorAll(".rail-query-suggest-item") || []);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!buttons.length) {
          queueRender(input);
          return;
        }
        setActiveIndex(input, state.activeIndex + 1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!buttons.length) {
          queueRender(input);
          return;
        }
        setActiveIndex(input, state.activeIndex - 1);
        return;
      }
      if (event.key === "Escape") {
        closeSuggestMenu(input);
        return;
      }
      if (event.key === "Enter" && buttons.length && state.activeInput === input) {
        const active = buttons[state.activeIndex] || buttons[0];
        if (active) {
          event.preventDefault();
          selectSuggestValue(input, active.dataset.value || "");
        }
      }
    });
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        const currentConfig = configMap.get(input) || {};
        if (state.activeInput === input) closeSuggestMenu(input);
        if (typeof currentConfig.onBlur === "function") currentConfig.onBlur(input);
      }, 120);
    });
    return input;
  }

  api.bindSuggestInput = bindSuggestInput;
  api.closeSuggestMenu = closeSuggestMenu;
})();
