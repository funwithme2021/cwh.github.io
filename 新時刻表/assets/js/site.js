(function(){
  const body = document.body;
  const basePath = (body.dataset.basePath || '.').replace(/\/$/, '');
  const sectionKey = body.dataset.section || 'home';
  const pageKey = body.dataset.page || '';

  const resolve = (path) => {
    if (!path || /^https?:/i.test(path) || path.startsWith('#')) {
      return path;
    }
    if (basePath === '.' || basePath === '') {
      return path.replace(/^\.\//, '');
    }
    return `${basePath}/${path}`.replace(/\/+/g, '/');
  };

  const topNav = [
    { key: 'home', label: '首頁', href: 'index.html' },
    { key: 'train', label: '鐵道服務', href: 'train/index.html' },
    { key: 'food', label: '美食地圖', href: 'food/index.html' },
    { key: 'weather', label: '天氣防災', href: 'weather/index.html' }
  ];

  const sectionNav = {
    train: [
      { key: 'overview', label: '服務總覽', href: 'train/index.html' },
      { key: 'timetable', label: '綜合時刻表', href: 'train/timetable.html' },
      { key: 'thsr', label: '高鐵專區', href: 'train/index-thsr.html' },
      { key: 'thsr-info', label: '高鐵站點資訊', href: 'train/index-thsr.station.html' },
      { key: 'tra', label: '台鐵查詢', href: 'train/index-tra.html' },
      { key: 'operation', label: '列車運用', href: 'train/index-tra.operation.html' },
      { key: 'analysis', label: '運量與評分', href: 'train/index.trainrate.html' },
      { key: 'board', label: '到站資訊板', href: 'train/train-info.html' }
    ],
    food: [
      { key: 'overview', label: '探索美食', href: 'food/index.html' },
      { key: 'map', label: '美食地圖', href: 'food/map.html' },
      { key: 'chart', label: '美食排行榜', href: 'food/chart.html' },
      { key: 'stories', label: '特色介紹', href: 'food/info.html' }
    ],
    weather: [
      { key: 'overview', label: '天氣儀表板', href: 'weather/index.html' },
      { key: 'typhoon', label: '颱風追蹤', href: 'weather/ty.html' },
      { key: 'typhoon-map', label: '動態路徑圖', href: 'weather/ty.draw1.html' },
      { key: 'storm-map', label: '災害地圖', href: 'weather/storm-map.html' },
      { key: 'suspend', label: '停班停課', href: 'weather/suspend.html' }
    ]
  };

  const createHeader = () => {
    const header = document.createElement('header');
    header.className = 'site-header';
    const inner = document.createElement('div');
    inner.className = 'inner';

    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = resolve('index.html');
    brand.innerHTML = '<span>CW</span><strong>智慧旅遊中心</strong>';

    const nav = document.createElement('nav');
    nav.className = 'primary-nav';

    topNav.forEach(item => {
      const link = document.createElement('a');
      link.href = resolve(item.href);
      link.textContent = item.label;
      link.dataset.key = item.key;
      if (item.key === sectionKey) {
        link.classList.add('active');
      }
      nav.appendChild(link);
    });

    const actions = document.createElement('div');
    actions.className = 'nav-actions';
    const toggle = document.createElement('button');
    toggle.className = 'action-btn';
    toggle.type = 'button';
    toggle.id = 'darkToggle';
    toggle.textContent = body.classList.contains('dark') ? '☾ 夜間模式' : '☀ 日間模式';
    actions.appendChild(toggle);

    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger';
    hamburger.type = 'button';
    hamburger.setAttribute('aria-label', '開啟導覽');
    hamburger.innerHTML = '<span></span><span></span><span></span>';

    inner.appendChild(brand);
    inner.appendChild(nav);
    inner.appendChild(actions);
    inner.appendChild(hamburger);
    header.appendChild(inner);

    document.body.prepend(header);

    const subLinks = sectionNav[sectionKey];
    if (subLinks && subLinks.length) {
      const sub = document.createElement('div');
      sub.className = 'sub-nav';
      const subInner = document.createElement('div');
      subInner.className = 'inner';
      subLinks.forEach(item => {
        const link = document.createElement('a');
        link.href = resolve(item.href);
        link.textContent = item.label;
        link.dataset.key = item.key;
        if (item.key === pageKey) {
          link.classList.add('active');
        }
        subInner.appendChild(link);
      });
      sub.appendChild(subInner);
      header.after(sub);
    }

    hamburger.addEventListener('click', () => {
      document.body.classList.toggle('nav-open');
    });
  };

  const wrapContent = () => {
    if (document.querySelector('main.page-content')) {
      return;
    }
    const main = document.createElement('main');
    main.className = 'page-content';
    while (body.childNodes.length > 0) {
      const node = body.childNodes[body.childNodes.length - 1];
      if (node.classList && (node.classList.contains('site-header') || node.classList.contains('sub-nav'))) {
        break;
      }
      main.prepend(body.lastChild);
    }
    body.appendChild(main);
  };

  const createFooter = () => {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="inner">
        <div>
          <strong>智慧旅遊中心</strong><br>
          統整交通、餐飲、災防資訊，提供一站式的旅遊規劃平台。
        </div>
        <div>
          若有建議或合作需求，歡迎來信 <a href="mailto:service@example.com">service@example.com</a>
        </div>
      </div>
    `;
    document.body.appendChild(footer);
  };

  const cleanupLegacyBlocks = () => {
    document.querySelectorAll('.navbar, nav.navbar, .legacy-navbar').forEach(el => el.remove());
    document.querySelectorAll('.dark-mode-toggle, .theme-toggle').forEach(el => el.remove());
    const heroCandidates = document.querySelectorAll('main.page-content > header');
    heroCandidates.forEach(header => {
      if (!header.querySelector('h1')) {
        return;
      }
      const wrapper = document.createElement('section');
      wrapper.className = 'hero';
      while (header.firstChild) {
        wrapper.appendChild(header.firstChild);
      }
      header.replaceWith(wrapper);
    });
  };

  const initTheme = () => {
    const saved = localStorage.getItem('cw-theme');
    if (saved === 'dark') {
      body.classList.add('dark');
    }
    const toggle = document.getElementById('darkToggle');
    const update = () => {
      toggle.textContent = body.classList.contains('dark') ? '☾ 夜間模式' : '☀ 日間模式';
    };
    update();
    toggle.addEventListener('click', () => {
      body.classList.toggle('dark');
      localStorage.setItem('cw-theme', body.classList.contains('dark') ? 'dark' : 'light');
      update();
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('layout-reset');
    createHeader();
    wrapContent();
    cleanupLegacyBlocks();
    createFooter();
    initTheme();
  });
})();
