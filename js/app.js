/* On the Go — app logic. No build step, no framework. */
(function () {
  'use strict';
  const D = window.OTG_DATA;
  const STORAGE_KEY = 'onthego.v2';

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + n.toFixed(2);
  const storeById = (id) => D.stores.find((s) => s.id === id);
  const itemById = (id) => D.menu.find((m) => m.id === id);
  const uid = () => Math.random().toString(36).slice(2, 8);

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable; keep going in memory */ }
  }

  /* ---------- state ---------- */
  const saved = load();
  const state = Object.assign({
    screen: 'home',
    storeId: null,
    favorites: [],
    bag: [],
    orders: [],
    beans: D.me.beans,
    pickupMode: 'store',
    pickupIn: 0,
    filter: 'all',
    query: ''
  }, saved);

  /* map projection: equirectangular around Boca Raton, 1 unit ≈ 2 m */
  const M = window.OTG_MAP;
  const KX = 49900, KY = 55450;
  const project = (lng, lat) => ({ x: (lng - M.bounds.west) * KX, y: (M.bounds.north - lat) * KY });
  const pts = (arr) => arr.map((c) => { const q = project(c[0], c[1]); return q.x.toFixed(1) + ' ' + q.y.toFixed(1); });
  const poly = (arr) => 'M' + pts(arr).join('L') + 'Z';
  const line = (arr) => 'M' + pts(arr).join('L');
  D.stores.forEach((s) => Object.assign(s, project(s.lng, s.lat)));
  Object.assign(D.me, project(D.me.lng, D.me.lat));

  /* straight-line distance from the user, in miles */
  function distMi(s) {
    const R = 3958.8, toR = Math.PI / 180;
    const dLat = (s.lat - D.me.lat) * toR, dLng = (s.lng - D.me.lng) * toR;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(D.me.lat * toR) * Math.cos(s.lat * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  const walkMin = (s) => Math.max(1, Math.round(distMi(s) * 20));
  const sortedStores = () => D.stores.slice().sort((a, b) => distMi(a) - distMi(b));
  const currentStore = () => storeById(state.storeId) || sortedStores()[0];

  /* ---------- icons ---------- */
  const I = {
    bean: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 5.8c3.6-3.6 9.4-3.6 12.4-.6 3 3 2.6 8.6-1 12.2s-9.2 4-12.2 1c-3-3-2.8-9 .8-12.6Z" fill="currentColor"/><path d="M7.5 7.5c2.2 1.6 3.6 4 3.6 6.2 0 1.8-.6 3.3-1.6 4.6" stroke="var(--paper)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    cup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-11.5a7 7 0 0 0-14 0C5 14.5 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 13H5Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z"/></svg>',
    heartFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z"/></svg>',
    locate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    zoomIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg>',
    zoomOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 12h12"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 7"/></svg>',
    walk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="1.5"/><path d="m8 21 3-7 3 2 2 5"/><path d="M11 14 9 9l4-2 3 4 2-1"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16 6.5 9h11L19 16"/><path d="M3 16h18v3H3Z"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>'
  };

  /* ---------- drink illustrations ---------- */
  function art(item, cls) {
    if (item.kind === 'food') return '<span class="food" aria-hidden="true">' + item.emoji + '</span>';
    const c = item.color;
    if (item.kind === 'hot') {
      return '<svg viewBox="0 0 64 80" aria-hidden="true">' +
        '<path d="M13 22h38l-5 50q-14 6-28 0Z" fill="#F4EDE1"/>' +
        '<path d="M15.5 44h33l-1.6 16h-29.8Z" fill="' + c + '"/>' +
        '<path d="M15.5 44h33l-.4 4h-32.2Z" fill="rgba(0,0,0,.12)"/>' +
        '<rect x="9" y="14" width="46" height="9" rx="4" fill="#2C2A27"/>' +
        '<rect x="20" y="9" width="24" height="6" rx="3" fill="#3D3B37"/>' +
        '<path d="M24 5c0-3 3-3 3-6" stroke="#CFC8BB" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>' +
        '<path d="M34 6c0-3 3-3 3-6" stroke="#CFC8BB" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>' +
        '</svg>';
    }
    const whip = item.kind === 'frozen'
      ? '<circle cx="24" cy="24" r="7" fill="#FFF"/><circle cx="40" cy="24" r="7" fill="#FFF"/><circle cx="32" cy="18" r="8" fill="#FFF"/><path d="M26 16q6-8 12 0" stroke="' + c + '" stroke-width="2" fill="none" stroke-linecap="round"/>'
      : '<path d="M11 24Q32 6 53 24Z" fill="#E9F0EC" stroke="#CDD8D2" stroke-width="1.5"/>' +
        '<rect x="35" y="0" width="5" height="34" rx="2" fill="#6F4E37" transform="rotate(7 37 17)"/>';
    return '<svg viewBox="0 0 64 80" aria-hidden="true">' +
      '<path d="M13 24h38l-5 48q-14 6-28 0Z" fill="#FFFFFF" stroke="#CFD8D3" stroke-width="1.5"/>' +
      '<path d="M15.5 36h33l-3.2 36q-13 5.5-26.6 0Z" fill="' + c + '" opacity=".92"/>' +
      '<rect x="20" y="42" width="9" height="9" rx="2" fill="#FFF" opacity=".55"/>' +
      '<rect x="34" y="50" width="9" height="9" rx="2" fill="#FFF" opacity=".5"/>' +
      '<rect x="24" y="58" width="9" height="9" rx="2" fill="#FFF" opacity=".45"/>' +
      whip +
      '</svg>';
  }

  /* ---------- navigation ---------- */
  function go(screen) {
    state.screen = screen;
    $$('.screen').forEach((el) => el.classList.toggle('is-active', el.dataset.screen === screen));
    $$('.tab').forEach((el) => el.classList.toggle('is-active', el.dataset.go === screen));
    render(screen);
    save();
  }

  function render(screen) {
    ({ home: renderHome, stores: renderStores, menu: renderMenu, bag: renderBag, orders: renderOrders })[screen]();
    renderTopbar();
  }

  function renderTopbar() {
    $('#beansCount').textContent = state.beans;
    const n = state.bag.reduce((t, l) => t + l.qty, 0);
    const b = $('#bagBadge');
    b.textContent = n;
    b.hidden = n === 0;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 1800);
  }

  /* ---------- home ---------- */
  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function renderHome() {
    const s = currentStore();
    const active = state.orders.find((o) => orderStatus(o) !== 'done');
    const last = state.orders[0];
    const toReward = D.rewardAt - (state.beans % D.rewardAt);
    const pct = ((state.beans % D.rewardAt) / D.rewardAt) * 100;
    const featured = ['shakerato', 'flatwhite', 'frmocha', 'matcha', 'pastelito', 'coldbrew'].map(itemById);

    $('[data-screen="home"]').innerHTML =
      '<div class="greeting"><h1>' + greeting() + ' ☕</h1><p>' + (active ? 'Your order is on the bar. ' : 'What are we picking up today?') + '</p></div>' +

      '<div class="rewards">' +
        '<div class="eyebrow" style="color:rgba(255,255,255,.7)">Bean bank</div>' +
        '<div class="big">' + state.beans + '<span>' + I.bean + '</span></div>' +
        '<div class="meter"><i style="width:' + pct.toFixed(0) + '%"></i></div>' +
        '<div class="meta"><span>' + toReward + ' beans to a free drink</span><span>' + D.beansPerDollar + ' bean per $1</span></div>' +
      '</div>' +

      (active ? '<div class="section"><button class="card order-card" data-go="orders" style="width:100%;text-align:left">' +
        '<div class="row"><div class="grow"><div class="eyebrow">' + esc(statusLabel(orderStatus(active))) + ' · ' + esc(storeById(active.storeId).name) + '</div>' +
        '<div class="code">' + active.code + '</div><div class="small muted">Show this code at pickup</div></div>' + I.chevron.replace('<svg', '<svg width="22" height="22"') + '</div></button></div>' : '') +

      '<div class="section"><div class="section-head"><h2>Pick up at</h2><button class="link" data-go="stores">Change</button></div>' +
        '<div class="card pickup-card"><div class="store-thumb">' + I.map + '</div>' +
        '<div class="grow"><h3>' + esc(s.name) + '</h3><div class="small muted">' + esc(s.address) + ' · ' + distMi(s).toFixed(1) + ' mi · ' + s.wait + ' min wait</div></div>' +
        '<button class="btn btn--sm" data-order-at="' + s.id + '">Order</button></div></div>' +

      (last ? '<div class="section"><div class="section-head"><h2>Order again</h2><button class="link" data-go="orders">History</button></div>' +
        '<div class="card reorder"><div class="mini-art">' + art(itemById(last.lines[0].itemId)) + '</div>' +
        '<div class="grow"><h3 style="font-size:14px">' + esc(lineTitle(last.lines[0])) + (last.lines.length > 1 ? ' + ' + (last.lines.length - 1) + ' more' : '') + '</h3>' +
        '<div class="small muted">' + esc(storeById(last.storeId).name) + ' · ' + money(last.total) + '</div></div>' +
        '<button class="btn btn--ghost btn--sm" data-reorder="' + last.id + '">Reorder</button></div></div>' : '') +

      '<div class="section"><div class="section-head"><h2>Featured</h2><button class="link" data-go="menu">Full menu</button></div>' +
        '<div class="h-scroll">' + featured.map((m) =>
          '<button class="feat" data-item="' + m.id + '"><div class="art">' + art(m) + '</div><h3>' + esc(m.name) + '</h3><div class="price">' + money(m.price) + '</div></button>'
        ).join('') + '</div></div>' +

      '<div class="section"><div class="card promo"><div class="art">🌤️</div><div class="grow"><h3>Afternoon pick-me-up</h3>' +
        '<p class="small muted">Double beans on any iced coffee ordered ahead between 2 and 5 PM.</p></div></div></div>';
  }

  /* ---------- map ---------- */
  const map = { built: false, svg: null, vb: { x: 0, y: 0, w: 1400, h: 1400 }, drag: null, moved: false };

  function buildMap() {
    if (map.built) return;
    map.built = true;
    const svg = $('#mapSvg');
    map.svg = svg;
    const b = M.bounds;
    const tl = project(b.west - 0.1, b.north + 0.1), br = project(b.east + 0.1, b.south - 0.1);
    const roadW = { hwy: 34, major: 20, minor: 11 };

    const ocean = poly(M.coast.concat([[b.east + 0.1, b.south - 0.1], [b.east + 0.1, b.north + 0.1]]));
    const areas = M.areas.map((a) => '<path d="' + poly(a.pts) + '" class="area area--' + a.cls + '"/>').join('');
    const areaLabels = M.areas.map((a) => {
      const c = a.pts.reduce((acc, p) => [acc[0] + p[0] / a.pts.length, acc[1] + p[1] / a.pts.length], [0, 0]);
      const q = project(c[0], c[1]);
      return '<text class="map-street map-street--area" x="' + q.x.toFixed(1) + '" y="' + q.y.toFixed(1) + '" text-anchor="middle">' + esc(a.name) + '</text>';
    }).join('');
    const casing = M.roads.filter((r) => r.cls !== 'minor').map((r) => '<path d="' + line(r.pts) + '" class="road-casing" stroke-width="' + (roadW[r.cls] + 4) + '"/>').join('');
    const roads = M.roads.map((r, i) => '<path id="rd' + i + '" d="' + line(r.pts) + '" class="road road--' + r.cls + '" stroke-width="' + roadW[r.cls] + '"/>').join('');
    const roadNames = M.roads.map((r, i) => '<text class="map-street" dy="3"><textPath href="#rd' + i + '" startOffset="' + (r.cls === 'minor' ? '30%' : '18%') + '">' + esc(r.name) + '</textPath></text>').join('');
    const labels = M.labels.map((l) => {
      const q = project(l.lon, l.lat);
      return '<text class="map-label map-label--' + l.cls + '" x="' + q.x.toFixed(1) + '" y="' + q.y.toFixed(1) + '" text-anchor="middle"' + (l.size ? ' style="font-size:calc(' + l.size + 'px * var(--k))"' : '') + (l.rotate ? ' transform="rotate(' + l.rotate + ' ' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + ')"' : '') + '>' + esc(l.name) + '</text>';
    }).join('');

    svg.innerHTML =
      '<rect x="' + tl.x.toFixed(0) + '" y="' + tl.y.toFixed(0) + '" width="' + (br.x - tl.x).toFixed(0) + '" height="' + (br.y - tl.y).toFixed(0) + '" fill="var(--map-land)"/>' +
      '<path d="' + ocean + '" class="water"/>' +
      '<path d="' + line(M.icw) + '" class="water-line" stroke-width="60"/>' +
      '<path d="' + poly(M.lake) + '" class="water"/>' +
      '<path d="' + line(M.inlet) + '" class="water-line" stroke-width="22"/>' +
      '<path d="' + line(M.canal) + '" class="water-line" stroke-width="10"/>' +
      areas +
      '<path d="' + line(M.runway) + '" class="runway" stroke-width="14"/>' +
      casing + roads + roadNames + areaLabels + labels +
      '<g id="mapPins"></g>' +
      '<g id="mapMe"><circle class="me-ring" cx="' + D.me.x + '" cy="' + D.me.y + '" r="26"/><circle class="me-dot" cx="' + D.me.x + '" cy="' + D.me.y + '" r="8"/></g>';

    map.vb.x = D.me.x - map.vb.w / 2;
    map.vb.y = D.me.y - map.vb.w / 2;

    /* pan */
    svg.addEventListener('pointerdown', (e) => {
      map.drag = { x: e.clientX, y: e.clientY, vb: Object.assign({}, map.vb) };
      map.moved = false;
      svg.setPointerCapture(e.pointerId);
      svg.classList.add('is-dragging');
    });
    svg.addEventListener('pointermove', (e) => {
      if (!map.drag) return;
      const r = svg.getBoundingClientRect();
      const dx = (e.clientX - map.drag.x) * map.vb.w / r.width;
      const dy = (e.clientY - map.drag.y) * map.vb.h / r.height;
      if (Math.abs(e.clientX - map.drag.x) + Math.abs(e.clientY - map.drag.y) > 6) map.moved = true;
      map.vb.x = map.drag.vb.x - dx;
      map.vb.y = map.drag.vb.y - dy;
      applyViewBox();
    });
    const end = () => { map.drag = null; svg.classList.remove('is-dragging'); };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    svg.addEventListener('click', (e) => {
      if (map.moved) return;
      const pin = e.target.closest('.pin');
      if (pin) selectStore(pin.dataset.store, true);
      else if (state.storeId) { state.storeId = null; renderStores(); }
    });
    applyViewBox();
  }

  function applyViewBox() {
    const r = map.svg.getBoundingClientRect();
    const aspect = r.height / (r.width || 1);
    map.vb.h = map.vb.w * aspect;
    map.svg.setAttribute('viewBox', [map.vb.x, map.vb.y, map.vb.w, map.vb.h].join(' '));
    /* pins keep a constant screen size */
    /* k = map units per screen pixel; pins and labels use it to keep a constant on-screen size */
    const k = map.vb.w / (r.width || 430);
    map.svg.style.setProperty('--k', k);
    map.svg.classList.toggle('is-far', map.vb.w > 1250);
    $$('.pin', map.svg).forEach((p) => p.setAttribute('transform', 'translate(' + p.dataset.x + ' ' + p.dataset.y + ') scale(' + (k * 0.8) + ')'));
    const me = $('#mapMe');
    if (me) me.setAttribute('transform', 'translate(' + D.me.x + ' ' + D.me.y + ') scale(' + (k * 0.8) + ') translate(' + -D.me.x + ' ' + -D.me.y + ')');
  }

  function zoom(f) {
    const cx = map.vb.x + map.vb.w / 2, cy = map.vb.y + map.vb.h / 2;
    map.vb.w = Math.min(5200, Math.max(350, map.vb.w * f));
    map.vb.x = cx - map.vb.w / 2;
    applyViewBox();
    map.vb.y = cy - map.vb.h / 2;
    applyViewBox();
  }

  function centerOn(x, y, animate) {
    const tx = x - map.vb.w / 2, ty = y - map.vb.h / 2 + (animate ? map.vb.h * 0.18 : 0);
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { map.vb.x = tx; map.vb.y = ty; applyViewBox(); return; }
    const sx = map.vb.x, sy = map.vb.y, t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 320), e = 1 - Math.pow(1 - p, 3);
      map.vb.x = sx + (tx - sx) * e; map.vb.y = sy + (ty - sy) * e;
      applyViewBox();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function visibleStores() {
    const q = state.query.trim().toLowerCase();
    return sortedStores().filter((s) => {
      if (state.filter === 'fav' && !state.favorites.includes(s.id)) return false;
      if (state.filter === 'curbside' && !s.pickup.includes('curbside')) return false;
      if (state.filter === 'quiet' && s.busy !== 'Quiet') return false;
      if (q && !(s.name + ' ' + s.address).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderPins() {
    const list = visibleStores();
    const g = $('#mapPins');
    g.innerHTML = list.map((s, i) => {
      const sel = s.id === state.storeId, fav = state.favorites.includes(s.id);
      return '<g class="pin' + (sel ? ' is-selected' : '') + (fav ? ' is-fav' : '') + '" data-store="' + s.id + '" data-x="' + s.x + '" data-y="' + s.y + '">' +
        '<circle class="pin-ring" r="20"/>' +
        '<path class="pin-body" d="M0 4C-9 -6 -14 -12 -14 -20a14 14 0 0 1 28 0c0 8-5 14-14 24Z" transform="translate(0 -2)"/>' +
        '<text class="pin-glyph" y="-16" text-anchor="middle" font-size="11" font-weight="800" font-family="Outfit, sans-serif">' + (i + 1) + '</text>' +
        (sel ? '<text class="pin-label" y="18" text-anchor="middle">' + esc(s.name) + '</text>' : '') +
        '</g>';
    }).join('');
    applyViewBox();
  }

  function busyPill(s) {
    const cls = s.busy === 'Quiet' ? 'pill--ok' : s.busy === 'Busy' ? 'pill--busy' : 'pill--warn';
    return '<span class="pill ' + cls + '">' + s.busy + ' · ' + s.wait + ' min</span>';
  }

  function renderStores() {
    buildMap();
    renderPins();
    const list = visibleStores();
    const s = storeById(state.storeId);
    const body = $('#sheetBody');
    const head = $('#sheetHead');
    $('#storeSheet').classList.toggle('is-tall', !!s);
    $$('.map-filters .chip').forEach((c) => c.classList.toggle('is-on', c.dataset.filter === state.filter));

    if (s) {
      const fav = state.favorites.includes(s.id);
      head.innerHTML = '<h2>Store</h2><button class="icon-btn" data-deselect aria-label="Back to list" style="box-shadow:none;background:var(--surface-2)">' + I.close + '</button>';
      body.innerHTML =
        '<div class="store-detail"><h2>' + esc(s.name) + '</h2><div class="addr">' + esc(s.address) + ' · ' + distMi(s).toFixed(1) + ' mi · ' + walkMin(s) + ' min walk</div>' +
        '<div class="facts">' + busyPill(s) + '<span class="pill">Open ' + s.open + ' – ' + s.close + '</span><span class="pill">★ ' + s.rating.toFixed(1) + '</span>' +
        s.pickup.map((p) => '<span class="pill">' + D.pickupModes.find((m) => m.id === p).name + '</span>').join('') + '</div>' +
        '<p class="tagline">“' + esc(s.tagline) + '”</p>' +
        '<div class="special" style="margin-top:12px"><div class="art">' + art(itemById(s.special)) + '</div><div class="grow"><div class="eyebrow">Store special</div><h3>' + esc(itemById(s.special).name) + '</h3></div>' +
        '<button class="btn btn--sm btn--ghost" data-item="' + s.special + '" data-item-store="' + s.id + '">Add</button></div>' +
        '<div class="actions"><button class="btn" data-order-at="' + s.id + '">Order here</button>' +
        '<button class="icon-btn' + (fav ? ' is-on' : '') + '" data-fav="' + s.id + '" aria-label="Favorite">' + (fav ? I.heartFill : I.heart) + '</button></div></div>';
    } else {
      head.innerHTML = '<h2>' + (state.filter === 'all' && !state.query ? 'Nearby' : list.length + ' match' + (list.length === 1 ? '' : 'es')) + '</h2><span class="small muted">' + list.length + ' store' + (list.length === 1 ? '' : 's') + '</span>';
      body.innerHTML = list.length ? list.map((st, i) =>
        '<button class="store-row" data-select="' + st.id + '"><div class="n">' + (i + 1) + '</div>' +
        '<div class="grow"><h3>' + esc(st.name) + (state.favorites.includes(st.id) ? ' <span style="color:var(--danger)">♥</span>' : '') + '</h3>' +
        '<div class="sub">' + busyPill(st) + '<span>' + esc(st.address) + '</span></div></div>' +
        '<div class="dist">' + distMi(st).toFixed(1) + ' mi<br><span class="small muted" style="font-weight:400">' + walkMin(st) + ' min</span></div></button>'
      ).join('') : '<div class="empty"><div class="art">🗺️</div>No stores match. Try clearing the filter.</div>';
    }
  }

  function selectStore(id, pan) {
    state.storeId = id;
    save();
    renderStores();
    const s = storeById(id);
    if (pan) centerOn(s.x, s.y, true);
  }

  /* ---------- menu ---------- */
  let menuCat = 'hot';
  function renderMenu() {
    const s = currentStore();
    state.storeId = s.id;
    const special = itemById(s.special);
    $('[data-screen="menu"]').innerHTML =
      '<div class="menu-store"><div class="store-thumb">' + I.map + '</div><div class="grow"><div class="eyebrow">Ordering from</div><h3>' + esc(s.name) + '</h3>' +
      '<div class="small">' + distMi(s).toFixed(1) + ' mi · ready in about ' + s.wait + ' min</div></div><button class="link" data-go="stores">Change</button></div>' +
      '<div class="special"><div class="art">' + art(special) + '</div><div class="grow"><div class="eyebrow">' + esc(s.name.split(' ')[0]) + ' special</div><h3>' + esc(special.name) + '</h3><div class="small muted">' + money(special.price) + '</div></div>' +
      '<button class="btn btn--sm" data-item="' + special.id + '">Add</button></div>' +
      '<div class="cat-tabs">' + D.categories.map((c) => '<button class="cat-tab' + (c.id === menuCat ? ' is-on' : '') + '" data-cat="' + c.id + '">' + c.name + '</button>').join('') + '</div>' +
      D.categories.map((c) => '<div class="menu-group" id="cat-' + c.id + '"><h2>' + c.name + '</h2>' +
        D.menu.filter((m) => m.cat === c.id).map((m) =>
          '<button class="menu-item" data-item="' + m.id + '"><div class="art">' + art(m) + '</div><div class="grow"><h3>' + esc(m.name) + '</h3><div class="desc">' + esc(m.desc) + '</div>' +
          '<div class="meta">' + money(m.price) + (m.kind === 'food' ? '' : ' · Small') + ' · ' + m.cal + ' cal</div></div><div class="add">' + I.plus + '</div></button>'
        ).join('') + '</div>').join('');
  }

  /* ---------- item modal ---------- */
  let draft = null;
  function openItem(id, qtyPreset) {
    const m = itemById(id);
    draft = { itemId: id, size: m.kind === 'food' ? null : 'small', milk: 'whole', shots: 0, extras: [], qty: qtyPreset || 1 };
    renderModal();
    $('#itemModal').classList.add('is-open');
  }
  function closeModal() { $('#itemModal').classList.remove('is-open'); draft = null; }

  function linePrice(l) {
    const m = itemById(l.itemId);
    let p = m.price;
    if (l.size) p += D.sizes.find((s) => s.id === l.size).delta;
    if (l.milk) p += D.milks.find((k) => k.id === l.milk).delta;
    p += (l.shots || 0) * D.shotPrice;
    (l.extras || []).forEach((x) => { p += D.extras.find((e) => e.id === x).delta; });
    return p;
  }
  function lineTitle(l) {
    const m = itemById(l.itemId);
    return (l.size ? D.sizes.find((s) => s.id === l.size).name + ' ' : '') + m.name;
  }
  function lineMods(l) {
    const parts = [];
    if (l.milk && l.milk !== 'whole') parts.push(D.milks.find((k) => k.id === l.milk).name + ' milk');
    if (l.shots) parts.push('+' + l.shots + ' shot' + (l.shots > 1 ? 's' : ''));
    (l.extras || []).forEach((x) => parts.push(D.extras.find((e) => e.id === x).name));
    return parts.join(' · ');
  }

  function renderModal() {
    const m = itemById(draft.itemId);
    const drink = m.kind !== 'food';
    const sizes = D.sizes;
    $('#modalBody').innerHTML =
      '<div class="modal-hero"><div class="art">' + art(m) + '</div><div class="grow"><h2>' + esc(m.name) + '</h2><p class="desc">' + esc(m.desc) + '</p><p class="small muted" style="margin-top:6px">' + m.cal + ' cal</p></div></div>' +
      (drink ? '<div class="opt"><h3>Size</h3><div class="size-grid">' + sizes.map((s) =>
        '<button class="size' + (s.id === draft.size ? ' is-on' : '') + '" data-size="' + s.id + '"><i class="cup" style="height:' + (10 + s.oz) + 'px"></i>' + s.name + '<small>' + s.oz + ' oz</small></button>'
      ).join('') + '</div></div>' +
      (m.id === 'batch' || m.id === 'coldbrew' || m.id === 'tonic' || m.id === 'hibiscus' ? '' : '<div class="opt"><h3>Milk</h3><div class="chip-row">' + D.milks.map((k) =>
        '<button class="chip' + (k.id === draft.milk ? ' is-on' : '') + '" data-milk="' + k.id + '">' + k.name + (k.delta ? ' +' + money(k.delta).slice(1) : '') + '</button>'
      ).join('') + '</div></div>') +
      '<div class="opt"><h3>Customize</h3>' +
      '<div class="toggle-row"><div class="lbl">Espresso shots<small>+' + money(D.shotPrice) + ' each</small></div><div class="stepper"><button data-shots="-1" aria-label="Fewer shots">−</button><span>' + draft.shots + '</span><button data-shots="1" aria-label="More shots">+</button></div></div>' +
      D.extras.map((x) => '<div class="toggle-row"><div class="lbl">' + x.name + (x.delta ? '<small>+' + money(x.delta) + '</small>' : '<small>Free</small>') + '</div><button class="switch' + (draft.extras.includes(x.id) ? ' is-on' : '') + '" data-extra="' + x.id + '" role="switch" aria-checked="' + draft.extras.includes(x.id) + '" aria-label="' + x.name + '"></button></div>').join('') +
      '</div>' : '') +
      '<div class="opt"><h3>Quantity</h3><div class="stepper"><button data-qty="-1" aria-label="Fewer">−</button><span>' + draft.qty + '</span><button data-qty="1" aria-label="More">+</button></div></div>';
    $('#modalTotal').textContent = money(linePrice(draft) * draft.qty);
  }

  function addToBag() {
    const key = JSON.stringify([draft.itemId, draft.size, draft.milk, draft.shots, draft.extras.slice().sort()]);
    const existing = state.bag.find((l) => l.key === key);
    if (existing) existing.qty += draft.qty;
    else state.bag.push(Object.assign({ id: uid(), key }, draft));
    save();
    closeModal();
    renderTopbar();
    toast('Added to bag');
    if (state.screen === 'bag') renderBag();
  }

  /* ---------- bag ---------- */
  function totals() {
    const sub = state.bag.reduce((t, l) => t + linePrice(l) * l.qty, 0);
    const tax = sub * D.taxRate;
    return { sub, tax, total: sub + tax };
  }

  function renderBag() {
    const s = currentStore();
    const el = $('[data-screen="bag"]');
    if (!state.bag.length) {
      el.innerHTML = '<h1 style="font-size:24px;margin-top:8px">Bag</h1><div class="empty"><div class="art">☕</div><p>Your bag is empty.</p><button class="btn" style="margin-top:14px" data-go="menu">Browse the menu</button></div>';
      return;
    }
    if (!s.pickup.includes(state.pickupMode)) state.pickupMode = s.pickup[0];
    const t = totals();
    const readyIn = (state.pickupIn || s.wait);
    el.innerHTML =
      '<h1 style="font-size:24px;margin-top:8px">Bag</h1>' +
      '<div class="section"><div class="menu-store"><div class="store-thumb">' + I.map + '</div><div class="grow"><div class="eyebrow">Pickup at</div><h3>' + esc(s.name) + '</h3><div class="small">' + esc(s.address) + '</div></div><button class="link" data-go="stores">Change</button></div></div>' +
      '<div class="section"><div class="card" style="padding:4px 16px">' + state.bag.map((l) => {
        const m = itemById(l.itemId);
        return '<div class="bag-item"><div class="art">' + art(m) + '</div><div class="grow"><h3>' + esc(lineTitle(l)) + '</h3>' + (lineMods(l) ? '<div class="mods">' + esc(lineMods(l)) + '</div>' : '') +
          '<div class="ctl"><button data-line-qty="' + l.id + '" data-d="-1" aria-label="Fewer">−</button><span class="q">' + l.qty + '</span><button data-line-qty="' + l.id + '" data-d="1" aria-label="More">+</button><button class="remove" data-remove="' + l.id + '">Remove</button></div></div>' +
          '<div class="price">' + money(linePrice(l) * l.qty) + '</div></div>';
      }).join('') + '</div></div>' +

      '<div class="section"><div class="section-head"><h2>Pickup</h2></div><div class="card"><div class="chip-row">' + D.pickupModes.filter((p) => s.pickup.includes(p.id)).map((p) =>
        '<button class="chip' + (p.id === state.pickupMode ? ' is-on' : '') + '" data-mode="' + p.id + '">' + p.name + '</button>').join('') + '</div>' +
        '<p class="small muted" style="margin-top:8px">' + D.pickupModes.find((p) => p.id === state.pickupMode).hint + '.</p>' +
        '<div class="divider"></div><div class="eyebrow" style="margin-bottom:8px">Ready in</div><div class="time-grid">' + [0, 15, 30, 60].map((n) =>
          '<button class="size' + ((state.pickupIn || 0) === n ? ' is-on' : '') + '" data-time="' + n + '">' + (n ? n + ' min' : 'ASAP') + '<small>' + (n ? 'scheduled' : '~' + s.wait + ' min') + '</small></button>').join('') + '</div></div></div>' +

      '<div class="section"><div class="section-head"><h2>Payment</h2></div><div class="card pay-row"><div class="card-art"></div><div class="grow"><div style="font-weight:700">Visa ending 4021</div><div class="small muted">Pay in app · earns ' + D.beansPerDollar + ' bean per $1</div></div>' + I.check.replace('<svg', '<svg width="20" height="20" style="color:var(--brew)"') + '</div></div>' +

      '<div class="section"><div class="card"><div class="totals"><span class="muted">Subtotal</span><span>' + money(t.sub) + '</span><span class="muted">Tax</span><span>' + money(t.tax) + '</span><span class="t">Total</span><span class="t">' + money(t.total) + '</span></div></div></div>' +
      '<div class="sticky-cta"><button class="btn btn--block" data-place>Place order · ' + money(t.total) + ' · ready in ' + readyIn + ' min</button></div>';
  }

  function placeOrder() {
    const s = currentStore();
    const t = totals();
    const code = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Math.floor(100 + Math.random() * 900);
    const order = {
      id: uid(), code, storeId: s.id, mode: state.pickupMode, scheduledIn: state.pickupIn || 0, waitMin: s.wait,
      lines: state.bag.map((l) => Object.assign({}, l)), total: t.total, placedAt: Date.now()
    };
    state.orders.unshift(order);
    state.beans += Math.round(t.total * D.beansPerDollar);
    state.bag = [];
    state.pickupIn = 0;
    save();
    go('orders');
    toast('Order placed · ' + code);
  }

  /* ---------- orders ---------- */
  /* Status is derived from elapsed time so it survives a reload:
     received for the first 12 s, preparing until "ready", then ready for 3 min, then done. */
  function orderStatus(o) {
    const el = (Date.now() - o.placedAt) / 1000;
    const readyAt = 12 + (o.scheduledIn ? o.scheduledIn * 60 : 0) + 30;
    if (el < 12) return 'received';
    if (el < readyAt) return 'preparing';
    if (el < readyAt + 180) return 'ready';
    return 'done';
  }
  const statusLabel = (st) => ({ received: 'Order received', preparing: 'Preparing', ready: 'Ready for pickup', done: 'Picked up' })[st];

  let ordersTimer;
  function renderOrders() {
    const el = $('[data-screen="orders"]');
    clearInterval(ordersTimer);
    if (!state.orders.length) {
      el.innerHTML = '<h1 style="font-size:24px;margin-top:8px">Orders</h1><div class="empty"><div class="art">🧾</div><p>No orders yet. Your pickups will show up here.</p><button class="btn" style="margin-top:14px" data-go="menu">Start an order</button></div>';
      return;
    }
    const active = state.orders.filter((o) => orderStatus(o) !== 'done');
    const past = state.orders.filter((o) => orderStatus(o) === 'done');
    el.innerHTML = '<h1 style="font-size:24px;margin-top:8px">Orders</h1>' +
      active.map((o) => {
        const st = orderStatus(o), s = storeById(o.storeId);
        const idx = ['received', 'preparing', 'ready'].indexOf(st);
        const mode = D.pickupModes.find((p) => p.id === o.mode);
        return '<div class="section"><div class="card order-card"><div class="row"><div class="grow"><div class="eyebrow">' + esc(s.name) + ' · ' + mode.name + '</div><div class="code">' + o.code + '</div></div>' +
          '<div style="text-align:right"><div class="price">' + money(o.total) + '</div><div class="small muted">' + o.lines.reduce((n, l) => n + l.qty, 0) + ' item' + (o.lines.length === 1 && o.lines[0].qty === 1 ? '' : 's') + '</div></div></div>' +
          '<div class="steps">' + ['Received', 'Preparing', 'Ready'].map((n, i) => '<div class="step' + (i < idx ? ' is-done' : i === idx ? (st === 'ready' ? ' is-done' : ' is-now') : '') + '"><div class="bar"><i></i></div>' + n + '</div>').join('') + '</div>' +
          (st === 'ready' ? '<div class="ready-banner">' + I.check.replace('<svg', '<svg width="20" height="20"') + ' Ready at the ' + (o.mode === 'drive' ? 'window' : o.mode === 'curbside' ? 'curb' : 'pickup counter') + ' · ' + esc(s.address) + '</div>'
            : '<p class="small muted" style="margin-top:6px">' + (st === 'received' ? 'The barista just picked up your ticket.' : o.scheduledIn ? 'Scheduled for ' + o.scheduledIn + ' min from order time.' : 'About ' + o.waitMin + ' min. We will show it here when it is up.') + '</p>') +
          '<div class="order-lines">' + o.lines.map((l) => l.qty + ' × ' + esc(lineTitle(l))).join(' · ') + '</div>' +
          '<div class="row" style="margin-top:12px;gap:8px"><button class="btn btn--ghost btn--sm" data-show-store="' + s.id + '">Show on map</button><button class="btn btn--outline btn--sm" data-picked="' + o.id + '">I picked it up</button></div>' +
          '</div></div>';
      }).join('') +
      (past.length ? '<div class="section"><div class="section-head"><h2>Past orders</h2></div><div class="card" style="padding:4px 16px">' + past.map((o) =>
        '<div class="past"><div class="grow"><div style="font-weight:700">' + esc(storeById(o.storeId).name) + '</div><div class="small muted">' + o.lines.map((l) => l.qty + ' × ' + esc(lineTitle(l))).join(', ') + '</div><div class="when">' + new Date(o.placedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' · ' + money(o.total) + '</div></div>' +
        '<button class="btn btn--ghost btn--sm" data-reorder="' + o.id + '">Reorder</button></div>').join('') + '</div></div>' : '');
    if (active.length) ordersTimer = setInterval(() => { if (state.screen === 'orders') renderOrders(); }, 3000);
  }

  function reorder(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return;
    state.storeId = o.storeId;
    state.bag = o.lines.map((l) => Object.assign({}, l, { id: uid() }));
    save();
    go('bag');
    toast('Bag restored from your order');
  }

  /* ---------- events (one delegated listener) ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-order-at],[data-item],[data-reorder],[data-select],[data-deselect],[data-fav],[data-filter],[data-zoom],[data-locate],[data-cat],[data-size],[data-milk],[data-shots],[data-extra],[data-qty],[data-add],[data-close],[data-line-qty],[data-remove],[data-mode],[data-time],[data-place],[data-show-store],[data-picked]');
    if (!t) return;
    const d = t.dataset;
    if (d.go) return go(d.go);
    if (d.orderAt) { state.storeId = d.orderAt; return go('menu'); }
    if (d.item) { if (d.itemStore) state.storeId = d.itemStore; if (!state.storeId) state.storeId = currentStore().id; return openItem(d.item); }
    if (d.reorder) return reorder(d.reorder);
    if (d.select) return selectStore(d.select, true);
    if (d.deselect !== undefined) { state.storeId = null; return renderStores(); }
    if (d.fav) {
      const i = state.favorites.indexOf(d.fav);
      i >= 0 ? state.favorites.splice(i, 1) : state.favorites.push(d.fav);
      save(); toast(i >= 0 ? 'Removed from favorites' : 'Saved to favorites'); return renderStores();
    }
    if (d.filter) { state.filter = d.filter; save(); return renderStores(); }
    if (d.zoom) return zoom(d.zoom === 'in' ? 1 / 1.4 : 1.4);
    if (d.locate !== undefined) return centerOn(D.me.x, D.me.y, true);
    if (d.cat) { menuCat = d.cat; $$('.cat-tab').forEach((c) => c.classList.toggle('is-on', c.dataset.cat === d.cat)); const g = $('#cat-' + d.cat); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (draft) {
      if (d.size) draft.size = d.size;
      else if (d.milk) draft.milk = d.milk;
      else if (d.shots) draft.shots = Math.min(4, Math.max(0, draft.shots + Number(d.shots)));
      else if (d.extra) { const i = draft.extras.indexOf(d.extra); i >= 0 ? draft.extras.splice(i, 1) : draft.extras.push(d.extra); }
      else if (d.qty) draft.qty = Math.min(10, Math.max(1, draft.qty + Number(d.qty)));
      else if (d.add !== undefined) return addToBag();
      else if (d.close !== undefined) return closeModal();
      return renderModal();
    }
    if (d.lineQty) { const l = state.bag.find((x) => x.id === d.lineQty); l.qty = Math.max(1, l.qty + Number(d.d)); save(); renderTopbar(); return renderBag(); }
    if (d.remove) { state.bag = state.bag.filter((x) => x.id !== d.remove); save(); renderTopbar(); return renderBag(); }
    if (d.mode) { state.pickupMode = d.mode; save(); return renderBag(); }
    if (d.time) { state.pickupIn = Number(d.time); save(); return renderBag(); }
    if (d.place !== undefined) return placeOrder();
    if (d.showStore) { state.storeId = d.showStore; go('stores'); return centerOn(storeById(d.showStore).x, storeById(d.showStore).y, true); }
    if (d.picked) { const o = state.orders.find((x) => x.id === d.picked); o.placedAt = 0; save(); toast('Enjoy!'); return renderOrders(); }
  });

  $('#storeSearch').addEventListener('input', (e) => { state.query = e.target.value; renderStores(); });
  $('#itemModal').addEventListener('click', (e) => { if (e.target.classList.contains('modal-scrim')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && draft) closeModal(); });
  window.addEventListener('resize', () => { if (map.built) applyViewBox(); });

  /* ---------- boot ---------- */
  $('#storeSearch').value = state.query || '';
  $$('.tab').forEach((t) => { t.innerHTML = I[t.dataset.icon] + '<span>' + t.textContent.trim() + '</span>' + (t.dataset.go === 'bag' ? '<span class="badge" id="bagBadge" hidden>0</span>' : ''); });
  $('#brandMark').innerHTML = I.cup;
  $('#beanIcon').innerHTML = I.bean;
  $$('.map-ctrls [data-zoom="in"]').forEach((b) => b.innerHTML = I.zoomIn);
  $$('.map-ctrls [data-zoom="out"]').forEach((b) => b.innerHTML = I.zoomOut);
  $$('.map-ctrls [data-locate]').forEach((b) => b.innerHTML = I.locate);
  $('#searchIcon').innerHTML = I.search;
  $('#modalClose').innerHTML = I.close;
  go(state.screen || 'home');
})();
