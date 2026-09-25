/* On the Go — app logic. No build step, no framework.
   Flow: map → tap a pin or search → Order here → that shop's menu → bag → pickup ticket. */
(function () {
  'use strict';
  const D = window.OTG_DATA;
  const C = D.catalog;
  const STORAGE_KEY = 'onthego.v3';

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + n.toFixed(2);
  const storeById = (id) => D.stores.find((s) => s.id === id);
  const uid = () => Math.random().toString(36).slice(2, 8);
  const isDrink = (id) => C[id] && C[id].kind !== 'food';
  const priceAt = (store, id) => { const r = store.menu.find((m) => m[0] === id); return r ? r[1] : null; };

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable; keep going in memory */ }
  }

  /* ---------- state ---------- */
  const state = Object.assign({
    screen: 'stores',
    storeId: null,        /* shop open on the map sheet */
    orderStoreId: null,   /* shop whose menu and bag you're ordering from */
    favorites: [],
    bag: [],
    orders: [],
    punches: D.me.punches,
    freeDrinks: 0,
    pickupMode: 'store',
    pickupIn: 0,
    filter: 'all',
    query: ''
  }, load());

  /* map projection: equirectangular around Boca Raton, 1 unit ≈ 2 m */
  const M = window.OTG_MAP;
  const KX = 49900, KY = 55450;
  const project = (lng, lat) => ({ x: (lng - M.bounds.west) * KX, y: (M.bounds.north - lat) * KY });
  const pts = (arr) => arr.map((c) => { const q = project(c[0], c[1]); return q.x.toFixed(1) + ' ' + q.y.toFixed(1); });
  const poly = (arr) => 'M' + pts(arr).join('L') + 'Z';
  const line = (arr) => 'M' + pts(arr).join('L');
  D.stores.forEach((s) => Object.assign(s, project(s.lng, s.lat)));
  Object.assign(D.me, project(D.me.lng, D.me.lat));

  /* straight-line distance from you, in miles */
  function distMi(s) {
    const R = 3958.8, toR = Math.PI / 180;
    const dLat = (s.lat - D.me.lat) * toR, dLng = (s.lng - D.me.lng) * toR;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(D.me.lat * toR) * Math.cos(s.lat * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  const walkMin = (s) => Math.max(1, Math.round(distMi(s) * 20));
  /* under a mile: walking time; farther: a rough Boca drive time with lights */
  const travel = (s) => distMi(s) < 1 ? walkMin(s) + ' min walk' : Math.round(distMi(s) * 2.6 + 3) + ' min drive';
  const sortedStores = () => D.stores.slice().sort((a, b) => distMi(a) - distMi(b));

  /* "6:30 AM – 7 PM" → open right now? */
  function toMin(t) {
    const m = t.trim().match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (!m) return 0;
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + Number(m[2] || 0);
  }
  function isOpen(s) {
    const [a, b] = s.hours.split('–');
    const now = new Date(), n = now.getHours() * 60 + now.getMinutes();
    return n >= toMin(a) && n < toMin(b);
  }
  const closesAt = (s) => s.hours.split('–')[1].trim();

  /* ---------- icons (1.75 stroke, drawn for this app) ---------- */
  const sv = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</svg>';
  const I = {
    cup: sv('<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c0 1 1 1.3 1 2.3M12 3.5c0 1 1 1.3 1 2.3"/>', ' stroke-width="2"'),
    map: sv('<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5Z"/><path d="M9 4v13M15 6.5v13"/>'),
    menu: sv('<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16"/>'),
    bag: sv('<path d="M5.5 8h13l-1 12h-11Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
    orders: sv('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/>'),
    search: sv('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
    heart: sv('<path d="M12 19.5s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.2-7 9.6-7 9.6Z"/>'),
    heartFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 19.5s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.2-7 9.6-7 9.6Z"/></svg>',
    locate: sv('<path d="M20 4 4 11l7 2 2 7Z"/>'),
    plus: sv('<path d="M12 6v12M6 12h12"/>', ' stroke-width="2"'),
    minus: sv('<path d="M6 12h12"/>', ' stroke-width="2"'),
    close: sv('<path d="M6 6l12 12M18 6 6 18"/>', ' stroke-width="2"'),
    check: sv('<path d="m5 12.5 4.5 4.5L19 7.5"/>', ' stroke-width="2.5"'),
    arrow: sv('<path d="M5 12h14M13 6l6 6-6 6"/>')
  };

  /* ---------- top-down drawings, like a coffee color chart ---------- */
  const SAUCER = 'fill="var(--saucer)" stroke="var(--saucer-line)"';
  const CUP = 'fill="var(--cup)" stroke="var(--saucer-line)"';
  const HEART = '<path d="M32 39.5c-5.2-3.4-8-6.3-8-9.4a4 4 0 0 1 8-.9 4 4 0 0 1 8 .9c0 3.1-2.8 6-8 9.4Z" fill="rgba(255,246,234,.82)"/>';

  function foodShape(def) {
    const t = def.tint;
    switch (def.shape) {
      case 'croissant': return [[17, 39, 6, 7], [23, 31, 7, 8], [32, 27, 8, 9], [41, 31, 7, 8], [47, 39, 6, 7]].map((e) =>
        '<ellipse cx="' + e[0] + '" cy="' + e[1] + '" rx="' + e[2] + '" ry="' + e[3] + '" fill="#D9A15B" stroke="#B57A3A" stroke-width="1"/>').join('') +
        (t ? '<path d="M24 33q8-5 16 0" stroke="' + t + '" stroke-width="3" fill="none" stroke-linecap="round"/>' : '');
      case 'cookie': return '<circle cx="32" cy="32" r="16" fill="#C99560" stroke="#A97A48"/>' +
        [[26, 27], [36, 25], [39, 35], [29, 38], [33, 31], [23, 34]].map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.2" fill="' + (t || '#4A2C1A') + '"/>').join('');
      case 'muffin': return '<circle cx="32" cy="32" r="16" fill="#C98F55" stroke="#A8743F"/><path d="M22 30q10-8 20 0M24 37q8-5 16 0" stroke="#A8743F" fill="none"/>' +
        [[27, 26], [37, 28], [31, 34], [38, 38], [25, 36]].map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2" fill="' + (t || '#4B4A8C') + '"/>').join('');
      case 'bagel': return '<circle cx="32" cy="32" r="17" fill="#D6A86A" stroke="#B5864B"/><circle cx="32" cy="32" r="5" fill="var(--saucer)" stroke="#B5864B"/>' +
        [[25, 24], [39, 25], [42, 36], [30, 43], [22, 35], [35, 21]].map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1" fill="' + (i % 2 ? '#2A2A2A' : '#F4EEE2') + '"/>').join('');
      case 'toast': return '<rect x="17" y="18" width="30" height="28" rx="6" fill="#D9AE6C" stroke="#B9864A" stroke-width="2"/>' +
        '<ellipse cx="27" cy="30" rx="5" ry="3.5" fill="#9CBF5C"/><ellipse cx="37" cy="29" rx="5" ry="3.5" fill="#8DB24F"/><ellipse cx="31" cy="37" rx="5" ry="3.5" fill="#A6C76A"/>';
      case 'bowl': return '<circle cx="32" cy="32" r="21" fill="#EFE9E1" stroke="var(--saucer-line)"/><circle cx="32" cy="32" r="17" fill="#5B2D52"/>' +
        '<circle cx="27" cy="27" r="3.5" fill="#F1E3A6"/><circle cx="33" cy="25" r="3.5" fill="#F1E3A6"/><circle cx="38" cy="36" r="2.5" fill="#C23B4A"/><circle cx="34" cy="39" r="2.5" fill="#3E3A7A"/>' +
        '<path d="M22 36h8" stroke="#C69A5B" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 3"/>';
      case 'macaron': return [[24, 27, '#E9B4C0'], [40, 27, '#BFD8A8'], [32, 40, '#E8D39A']].map((m) =>
        '<circle cx="' + m[0] + '" cy="' + m[1] + '" r="8.5" fill="' + m[2] + '" stroke="rgba(0,0,0,.12)"/><circle cx="' + m[0] + '" cy="' + m[1] + '" r="5.5" fill="none" stroke="rgba(255,255,255,.5)"/>').join('');
      case 'crepe': return '<path d="M16 20h32L32 48Z" fill="#E8C48A" stroke="#C99A58" stroke-linejoin="round"/><path d="M22 26q10 6 20 0" stroke="#5A3622" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
      case 'cannoli': return '<rect x="14" y="27" width="36" height="11" rx="5.5" fill="#D9A15B" stroke="#B57A3A" transform="rotate(-18 32 32)"/>' +
        '<circle cx="15.5" cy="38" r="5" fill="#F4EBDC"/><circle cx="48.5" cy="26" r="5" fill="#F4EBDC"/><circle cx="15.5" cy="38" r="1.2" fill="#7BA05B"/><circle cx="48.5" cy="26" r="1.2" fill="#7BA05B"/>';
      case 'tart': return '<circle cx="32" cy="32" r="17" fill="#D9A15B" stroke="#B57A3A"/><circle cx="32" cy="32" r="13" fill="#F3E3C3"/>' +
        [[27, 28], [37, 28], [32, 35], [26, 37], [38, 37]].map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.2" fill="' + (t || '#C8475A') + '"/>').join('');
      case 'loaf': return '<rect x="18" y="21" width="28" height="22" rx="5" fill="#9E6B3C"/><rect x="21" y="24" width="22" height="16" rx="3" fill="#D8B07A"/><circle cx="27" cy="30" r="1.3" fill="#F6F0E4"/><circle cx="36" cy="34" r="1.3" fill="#F6F0E4"/>';
      case 'empanada': return '<path d="M15 38a17 17 0 0 1 34 0Z" fill="#D8A05A" stroke="#B57A3A"/>' + [18, 23, 28, 33, 38, 43].map((x) => '<circle cx="' + (x + 1) + '" cy="37" r="1.2" fill="#B57A3A"/>').join('');
      case 'sandwich': return '<rect x="12" y="24" width="40" height="15" rx="7.5" fill="#D9A15B" stroke="#B57A3A" transform="rotate(-12 32 32)"/><path d="M16 33q8-4 16-1t16-4" stroke="#7BA05B" stroke-width="2" fill="none" transform="rotate(-12 32 32)"/>';
      case 'cake': return '<rect x="19" y="19" width="26" height="26" rx="3" fill="#8A5A3C"/>' + [[24, 25], [31, 23], [38, 27], [26, 33], [35, 35], [29, 40], [39, 40]].map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1" fill="#4A2C1A"/>').join('');
      default: return '';
    }
  }

  function art(id, size) {
    const def = C[id], c = def.color;
    const cls = 'art' + (size ? ' art--' + size : '');
    let g = '';
    if (def.kind === 'food') {
      g = '<circle cx="32" cy="32" r="30" ' + SAUCER + '/><circle cx="32" cy="32" r="23" fill="none" stroke="var(--saucer-line)"/>' + foodShape(def);
    } else if (def.kind === 'espresso') {
      g = '<circle cx="32" cy="32" r="25" ' + SAUCER + '/><rect x="42" y="28.5" width="9" height="7" rx="3.5" ' + CUP + '/><circle cx="32" cy="32" r="15" ' + CUP + '/>' +
        '<circle cx="32" cy="32" r="12" fill="' + c + '"/>' + (def.milk ? '<circle cx="32" cy="32" r="5" fill="rgba(255,246,234,.8)"/>' : '<circle cx="32" cy="32" r="12" fill="none" stroke="rgba(200,148,90,.55)" stroke-width="2"/>');
    } else if (def.kind === 'hot' || def.kind === 'black') {
      g = '<circle cx="32" cy="32" r="30" ' + SAUCER + '/><rect x="49" y="28" width="12" height="8" rx="4" ' + CUP + '/><circle cx="32" cy="32" r="21" ' + CUP + '/>' +
        '<circle cx="32" cy="32" r="17.5" fill="' + c + '"/>' +
        (def.kind === 'hot' ? HEART : '<path d="M22 26a12 12 0 0 1 10-6" stroke="rgba(255,255,255,.18)" stroke-width="2.5" fill="none" stroke-linecap="round"/>');
    } else if (def.kind === 'affogato') {
      g = '<circle cx="32" cy="32" r="25" fill="rgba(255,255,255,.6)" stroke="#CBD5D8" stroke-width="1.5"/><circle cx="32" cy="32" r="14" fill="#F4ECDF"/>' +
        '<path d="M24 28q8-6 14 2t-4 10q-6 2-10-4" fill="' + c + '" opacity=".85"/>';
    } else {
      const milk = def.milk ? '<path d="M20 36q6-8 12-2t12-4" stroke="rgba(255,255,255,.55)" stroke-width="3" fill="none" stroke-linecap="round"/>' : '';
      const top = def.kind === 'frozen'
        ? '<circle cx="32" cy="32" r="13" fill="rgba(255,255,255,.35)"/><circle cx="32" cy="32" r="8" fill="rgba(255,255,255,.35)"/>'
        : '<rect x="20" y="21" width="9" height="9" rx="2" fill="rgba(255,255,255,.5)" transform="rotate(14 24 25)"/><rect x="33" y="33" width="9" height="9" rx="2" fill="rgba(255,255,255,.45)" transform="rotate(-10 37 37)"/><rect x="21" y="34" width="8" height="8" rx="2" fill="rgba(255,255,255,.4)"/>';
      g = '<circle cx="32" cy="32" r="26" fill="rgba(255,255,255,.55)" stroke="#C7D2D6" stroke-width="1.5"/><circle cx="32" cy="32" r="22.5" fill="' + c + '"/>' +
        milk + top + '<circle cx="41" cy="23" r="3.4" fill="#1E1612"/><circle cx="41" cy="23" r="1.6" fill="#F4F1EC"/>';
    }
    return '<div class="' + cls + '"><svg viewBox="0 0 64 64" aria-hidden="true">' + g + '</svg></div>';
  }

  /* ---------- navigation ---------- */
  function go(screen) {
    state.screen = screen;
    $$('.screen').forEach((el) => el.classList.toggle('is-active', el.dataset.screen === screen));
    $$('.tab').forEach((el) => el.classList.toggle('is-active', el.dataset.go === screen));
    ({ stores: renderStores, menu: renderMenu, bag: renderBag, orders: renderOrders })[screen]();
    renderTopbar();
    save();
  }

  function renderTopbar() {
    const n = state.punches % D.rewardAt;
    $('#miniPunch').innerHTML = Array.from({ length: D.rewardAt }, (_, i) => '<i' + (i < n ? ' class="on"' : '') + '></i>').join('');
    $('#punchText').textContent = n + '/' + D.rewardAt;
    const q = state.bag.reduce((t, l) => t + l.qty, 0);
    const b = $('#bagBadge');
    b.textContent = q;
    b.hidden = q === 0;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 2000);
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
      '<g id="mapMe"><circle class="me-ring" cx="' + D.me.x + '" cy="' + D.me.y + '" r="22"/><circle class="me-dot" cx="' + D.me.x + '" cy="' + D.me.y + '" r="7"/></g>';

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
    const tx = x - map.vb.w / 2, ty = y - map.vb.h / 2 + (animate ? map.vb.h * (state.storeId ? 0.28 : 0.18) : 0);
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

  /* ---------- map: list, pins, shop sheet ---------- */
  function visibleStores() {
    const q = state.query.trim().toLowerCase();
    return sortedStores().filter((s) => {
      if (state.filter === 'fav' && !state.favorites.includes(s.id)) return false;
      if (state.filter === 'curbside' && !s.pickup.includes('curbside')) return false;
      if (state.filter === 'quiet' && s.wait > 3) return false;
      if (state.filter === 'open' && !isOpen(s)) return false;
      if (q) {
        const hay = (s.name + ' ' + s.address + ' ' + s.menu.map((m) => C[m[0]].name).join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderPins() {
    const list = visibleStores();
    $('#mapPins').innerHTML = list.map((s, i) => {
      const sel = s.id === state.storeId, fav = state.favorites.includes(s.id);
      return '<g class="pin' + (sel ? ' is-selected' : '') + (fav ? ' is-fav' : '') + '" data-store="' + s.id + '" data-x="' + s.x + '" data-y="' + s.y + '">' +
        '<circle class="pin-ring" r="19" cy="-19"/>' +
        '<path class="pin-body" d="M0 2C-8 -7 -13 -13 -13 -20a13 13 0 0 1 26 0c0 7-5 13-13 22Z"/>' +
        '<text class="pin-glyph" y="-16" text-anchor="middle" font-size="11" font-weight="600">' + (i + 1) + '</text>' +
        (sel ? '<text class="pin-label" y="17" text-anchor="middle">' + esc(s.name) + '</text>' : '') +
        '</g>';
    }).join('');
    applyViewBox();
  }

  const statusLine = (s) => '<span class="status status--' + s.busy + '">' + s.busy + ' · ' + s.wait + ' min</span>';

  function bagStore() { return state.bag.length ? storeById(state.orderStoreId) : null; }

  function renderStores() {
    buildMap();
    renderPins();
    const list = visibleStores();
    const s = storeById(state.storeId);
    const body = $('#sheetBody'), head = $('#sheetHead');
    $('#storeSheet').classList.toggle('is-tall', !!s);
    $$('.map-filters [data-filter]').forEach((c) => c.classList.toggle('is-on', c.dataset.filter === state.filter));

    if (s) {
      const fav = state.favorites.includes(s.id);
      const other = bagStore() && bagStore().id !== s.id ? bagStore() : null;
      const sig = s.signature;
      head.innerHTML = '<span class="label">' + (sortedStores().indexOf(s) + 1) + ' of ' + D.stores.length + ' nearby</span><button class="icon-btn" data-deselect aria-label="Back to the list">' + I.close + '</button>';
      body.innerHTML =
        '<div class="store-detail"><h2>' + esc(s.name) + '</h2>' +
        '<div class="addr">' + esc(s.address) + '</div>' +
        '<div class="facts">' +
          '<div><div class="label">Wait now</div><div class="v">' + statusLine(s) + '</div></div>' +
          '<div><div class="label">Hours</div><div class="v">' + s.hours + (isOpen(s) ? '' : ' <span class="faint small">· closed</span>') + '</div></div>' +
          '<div><div class="label">Distance</div><div class="v mono">' + distMi(s).toFixed(1) + ' mi · ' + travel(s) + '</div></div>' +
          '<div><div class="label">Pickup</div><div class="v">' + s.pickup.map((p) => p === 'store' ? 'Counter' : 'Curbside').join(', ') + '</div></div>' +
        '</div>' +
        '<p class="about">' + esc(s.about) + '</p>' +
        '<button class="special-row" data-item="' + sig + '" data-item-store="' + s.id + '" style="width:100%">' + art(sig, 'sm') +
          '<div class="grow"><div class="label">Known for</div><h3>' + esc(C[sig].name) + '</h3></div><span class="mono">' + money(priceAt(s, sig)) + '</span></button>' +
        '<div class="btn-row"><button class="btn" data-order-at="' + s.id + '">Order here ' + I.arrow.replace('<svg', '<svg width="18" height="18"') + '</button>' +
        '<button class="icon-btn' + (fav ? ' is-on' : '') + '" data-fav="' + s.id + '" aria-label="' + (fav ? 'Remove from saved' : 'Save this shop') + '">' + (fav ? I.heartFill : I.heart) + '</button></div>' +
        (other ? '<p class="small muted" style="margin-top:10px">Your bag has items from ' + esc(other.name) + '. Ordering here starts a new bag.</p>' : '') +
        '</div>';
    } else {
      const q = state.query.trim();
      head.innerHTML = '<h2>' + (q ? 'Results for “' + esc(q) + '”' : 'Coffee near you') + '</h2><span class="label">' + list.length + ' shop' + (list.length === 1 ? '' : 's') + '</span>';
      body.innerHTML = list.length ? list.map((st, i) =>
        '<button class="list-row store-row" data-select="' + st.id + '"><span class="n">' + (i + 1) + '</span>' +
        '<div class="grow"><h3>' + esc(st.name) + (state.favorites.includes(st.id) ? ' <span style="color:var(--busy)" aria-label="saved">♥</span>' : '') + '</h3>' +
        '<div class="sub">' + (isOpen(st) ? statusLine(st) : '<span class="status">Closed</span>') + '<span>' + (isOpen(st) ? 'Open till ' + closesAt(st) : 'Hours ' + st.hours) + '</span></div></div>' +
        '<div class="dist">' + distMi(st).toFixed(1) + ' mi<small>' + travel(st) + '</small></div></button>'
      ).join('') : '<div class="empty"><h2>No shops match</h2><p>Try a different name or clear the filter.</p></div>';
    }
  }

  function selectStore(id, pan) {
    state.storeId = id;
    save();
    renderStores();
    const s = storeById(id);
    if (pan) centerOn(s.x, s.y, true);
  }

  /* Choosing a shop to order from. A bag belongs to one shop, like a real ticket. */
  function startOrderAt(id) {
    if (state.bag.length && state.orderStoreId !== id) {
      const old = storeById(state.orderStoreId);
      state.bag = [];
      toast('Started a new bag at ' + storeById(id).name + (old ? '. Cleared ' + old.name : ''));
    }
    state.orderStoreId = id;
    menuCat = null;
    go('menu');
    $('[data-screen="menu"]').scrollTop = 0;
  }

  /* ---------- menu for one shop ---------- */
  let menuCat = null;
  function renderMenu() {
    const el = $('[data-screen="menu"]');
    const s = storeById(state.orderStoreId);
    if (!s) {
      el.innerHTML = '<div class="empty"><h2>Pick a shop first</h2><p>Tap a pin on the map or search for a shop, then tap Order here.</p><button class="btn" data-go="stores">Open the map</button></div>';
      return;
    }
    const cats = D.categories.filter((c) => s.menu.some((m) => C[m[0]].cat === c.id));
    if (!menuCat || !cats.find((c) => c.id === menuCat)) menuCat = cats[0].id;
    el.innerHTML =
      '<div class="menu-store"><div class="grow"><div class="label">Ordering from</div><h3>' + esc(s.name) + '</h3>' +
        '<div class="small">' + esc(s.address) + ' · <span class="mono">' + distMi(s).toFixed(1) + ' mi</span> · ready in about ' + s.wait + ' min</div></div>' +
        '<button class="link" data-go="stores">Change shop</button></div>' +
      '<div class="cat-tabs">' + cats.map((c) => '<button class="cat-tab' + (c.id === menuCat ? ' is-on' : '') + '" data-cat="' + c.id + '">' + c.name + '</button>').join('') + '</div>' +
      cats.map((c) => '<div class="menu-group" id="cat-' + c.id + '"><h2>' + c.name + '</h2>' +
        s.menu.filter((m) => C[m[0]].cat === c.id).map((m) => {
          const def = C[m[0]];
          return '<button class="list-row" data-item="' + m[0] + '">' + art(m[0]) +
            '<div class="grow"><h3>' + esc(def.name) + (m[0] === s.signature ? ' <span class="label" style="margin-left:4px">Known for</span>' : '') + '</h3><div class="desc">' + esc(def.desc) + '</div></div>' +
            '<span class="price">' + money(m[1]) + '</span></button>';
        }).join('') + '</div>').join('') +
      '<p class="pad small faint" style="padding-top:12px">Menu from ' + esc(s.name) + '. Prices may differ in store.</p>';
  }

  /* ---------- item sheet ---------- */
  let draft = null;
  function openItem(id) {
    const s = storeById(state.orderStoreId);
    const def = C[id];
    draft = { itemId: id, storeId: s.id, base: priceAt(s, id), size: def.sized ? 'reg' : null, milk: def.milk ? 'whole' : null, shots: 0, syrups: [], warm: false, qty: 1 };
    renderModal();
    $('#itemModal').classList.add('is-open');
  }
  function closeModal() { $('#itemModal').classList.remove('is-open'); draft = null; }

  function linePrice(l) {
    const s = storeById(l.storeId);
    let p = l.base;
    if (l.size) p += D.sizes.find((z) => z.id === l.size).delta;
    if (l.milk) p += D.milks.find((k) => k.id === l.milk).delta;
    p += (l.shots || 0) * s.shot + (l.syrups || []).length * s.syrup;
    return p;
  }
  function lineTitle(l) {
    return (l.size === 'lg' ? 'Large ' : '') + C[l.itemId].name;
  }
  function lineMods(l) {
    const parts = [];
    if (l.milk && l.milk !== 'whole') parts.push(D.milks.find((k) => k.id === l.milk).name + ' milk');
    if (l.shots) parts.push('+' + l.shots + ' shot' + (l.shots > 1 ? 's' : ''));
    (l.syrups || []).forEach((x) => parts.push(D.syrups.find((y) => y.id === x).name));
    if (l.warm) parts.push('Warmed');
    return parts.join(', ');
  }

  function renderModal() {
    const def = C[draft.itemId], s = storeById(draft.storeId);
    const drink = def.kind !== 'food';
    const check = (on, attr, label, note) => '<button class="check-row' + (on ? ' is-on' : '') + '" ' + attr + ' role="checkbox" aria-checked="' + on + '"><span class="lbl">' + label + (note ? '<small>' + note + '</small>' : '') + '</span><span class="box">' + I.check + '</span></button>';
    $('#modalBody').innerHTML =
      '<div class="item-hero">' + art(draft.itemId, 'lg') + '<div class="grow"><div class="label">' + esc(s.name) + '</div><h2>' + esc(def.name) + '</h2><p class="desc">' + esc(def.desc) + '</p><p class="cal">' + def.cal + ' cal · ' + money(draft.base) + '</p></div></div>' +
      (def.sized ? '<div class="opt"><div class="label">Size</div><div class="seg">' + D.sizes.map((z) =>
        '<button class="' + (z.id === draft.size ? 'is-on' : '') + '" data-size="' + z.id + '">' + z.name + '<small>' + z.oz + ' oz' + (z.delta ? ' · +' + money(z.delta) : '') + '</small></button>').join('') + '</div></div>' : '') +
      (def.milk ? '<div class="opt"><div class="label">Milk</div><div class="opts">' + D.milks.map((k) =>
        '<button class="opt-btn' + (k.id === draft.milk ? ' is-on' : '') + '" data-milk="' + k.id + '">' + k.name + (k.delta ? '<small>+' + money(k.delta) + '</small>' : '') + '</button>').join('') + '</div></div>' : '') +
      (drink && (def.coffee || def.milk) ? '<div class="opt"><div class="label">Extras</div>' +
        (def.coffee ? '<div class="check-row"><span class="lbl">Extra shot<small>+' + money(s.shot) + ' each</small></span><span class="stepper"><button data-shots="-1" aria-label="Fewer shots">−</button><span>' + draft.shots + '</span><button data-shots="1" aria-label="More shots">+</button></span></div>' : '') +
        D.syrups.map((y) => check(draft.syrups.includes(y.id), 'data-syrup="' + y.id + '"', y.name + ' syrup', '+' + money(s.syrup))).join('') + '</div>' : '') +
      (def.warm ? '<div class="opt">' + check(draft.warm, 'data-warm', 'Warm it up', 'free') + '</div>' : '');
    $('#modalFoot').innerHTML = '<span class="stepper"><button data-qty="-1" aria-label="Fewer">−</button><span>' + draft.qty + '</span><button data-qty="1" aria-label="More">+</button></span>' +
      '<button class="btn" data-add>Add to bag · <span class="mono">' + money(linePrice(draft) * draft.qty) + '</span></button>';
  }

  function addToBag() {
    const key = JSON.stringify([draft.itemId, draft.size, draft.milk, draft.shots, draft.syrups.slice().sort(), draft.warm]);
    const existing = state.bag.find((l) => l.key === key);
    if (existing) existing.qty += draft.qty;
    else state.bag.push(Object.assign({ id: uid(), key }, draft));
    const name = C[draft.itemId].name;
    save();
    closeModal();
    renderTopbar();
    toast(name + ' added to your bag');
    if (state.screen === 'bag') renderBag();
  }

  /* ---------- bag: pickup details + receipt ---------- */
  function totals() {
    const sub = state.bag.reduce((t, l) => t + linePrice(l) * l.qty, 0);
    const drinkPrices = state.bag.filter((l) => isDrink(l.itemId)).map((l) => linePrice(l));
    const reward = state.freeDrinks > 0 && drinkPrices.length ? Math.min.apply(null, drinkPrices) : 0;
    const tax = (sub - reward) * D.taxRate;
    return { sub, reward, tax, total: sub - reward + tax };
  }

  function renderBag() {
    const el = $('[data-screen="bag"]');
    const s = bagStore();
    if (!s) {
      el.innerHTML = '<div class="screen-title">Bag</div><div class="empty"><h2>Nothing in your bag yet</h2><p>Find a shop on the map and add something from its menu.</p><button class="btn" data-go="' + (state.orderStoreId ? 'menu' : 'stores') + '">' + (state.orderStoreId ? 'Back to the menu' : 'Open the map') + '</button></div>';
      return;
    }
    if (!s.pickup.includes(state.pickupMode)) state.pickupMode = s.pickup[0];
    const t = totals();
    const ready = state.pickupIn || s.wait;
    const now = new Date(Date.now() + ready * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    el.innerHTML =
      '<div class="screen-title">Bag</div>' +
      '<div class="field"><div class="label">Pick up at</div><div class="field-row"><div class="grow"><h3>' + esc(s.name) + '</h3><div class="small muted">' + esc(s.address) + '</div></div><button class="link" data-show-store="' + s.id + '">Map</button></div></div>' +
      (s.pickup.length > 1 ? '<div class="field"><div class="label">How</div><div class="seg">' + D.pickupModes.filter((p) => s.pickup.includes(p.id)).map((p) =>
        '<button class="' + (p.id === state.pickupMode ? 'is-on' : '') + '" data-mode="' + p.id + '">' + p.name + '</button>').join('') + '</div>' +
        '<p class="small muted" style="margin-top:8px">' + D.pickupModes.find((p) => p.id === state.pickupMode).hint + '</p></div>' : '') +
      '<div class="field"><div class="label">When</div><div class="seg">' + [0, 15, 30, 60].map((n) =>
        '<button class="' + ((state.pickupIn || 0) === n ? 'is-on' : '') + '" data-time="' + n + '">' + (n ? n + ' min' : 'ASAP') + '<small>' + (n ? 'from now' : '~' + s.wait + ' min') + '</small></button>').join('') + '</div></div>' +

      '<div class="receipt-wrap"><div class="receipt">' +
        '<div class="receipt-head"><strong>' + esc(s.name) + '</strong><span>' + esc(s.address) + '<br>PICKUP ' + now.toUpperCase() + ' · ' + (state.pickupMode === 'curbside' ? 'CURBSIDE' : 'COUNTER') + '</span></div>' +
        state.bag.map((l) => '<div class="r-line"><div class="r-main"><span>' + l.qty + '×</span><span class="name">' + esc(lineTitle(l)) + '</span><span>' + money(linePrice(l) * l.qty) + '</span></div>' +
          (lineMods(l) ? '<div class="r-mods">' + esc(lineMods(l)) + '</div>' : '') +
          '<div class="r-ctl"><span class="stepper"><button data-line-qty="' + l.id + '" data-d="-1" aria-label="Fewer">−</button><span>' + l.qty + '</span><button data-line-qty="' + l.id + '" data-d="1" aria-label="More">+</button></span><button class="remove" data-remove="' + l.id + '">Remove</button></div></div>').join('') +
        '<div class="r-totals"><span>Subtotal</span><span>' + money(t.sub) + '</span>' +
          (t.reward ? '<span>Punch card: free drink</span><span>−' + money(t.reward) + '</span>' : '') +
          '<span>Tax 7%</span><span>' + money(t.tax) + '</span><span class="t">Total</span><span class="t">' + money(t.total) + '</span></div>' +
      '</div></div>' +
      '<div class="field"><div class="label">Pay with</div><div class="field-row"><div class="grow"><h3>Visa <span class="mono">•••• 4021</span></h3><div class="small muted">Earns a punch for every drink</div></div></div></div>' +
      '<div class="cta"><button class="btn btn--block" data-place>Place order · <span class="mono">' + money(t.total) + '</span></button></div>';
  }

  function placeOrder() {
    const s = bagStore();
    const t = totals();
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const code = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)] + Math.floor(10 + Math.random() * 90);
    const drinks = state.bag.filter((l) => isDrink(l.itemId)).reduce((n, l) => n + l.qty, 0);
    if (t.reward) state.freeDrinks -= 1;
    const before = state.punches;
    state.punches += drinks;
    state.freeDrinks += Math.floor(state.punches / D.rewardAt) - Math.floor(before / D.rewardAt);
    state.orders.unshift({
      id: uid(), code, storeId: s.id, mode: state.pickupMode, scheduledIn: state.pickupIn || 0, waitMin: s.wait,
      lines: state.bag.map((l) => Object.assign({}, l)), total: t.total, placedAt: Date.now()
    });
    state.bag = [];
    state.pickupIn = 0;
    save();
    go('orders');
    $('[data-screen="orders"]').scrollTop = 0;
    toast('Sent to ' + s.name + (drinks ? ' · +' + drinks + ' punch' + (drinks > 1 ? 'es' : '') : ''));
  }

  /* ---------- orders: punch card + pickup tickets ---------- */
  /* Status comes from elapsed time so it survives a reload. Demo pace: received 12 s, then making. */
  function orderTimes(o) {
    const made = o.placedAt + 12000 + (o.scheduledIn ? o.scheduledIn * 60000 : 0);
    return { placed: o.placedAt, making: o.placedAt + 12000, ready: made + 30000 };
  }
  function orderStatus(o) {
    const t = orderTimes(o), n = Date.now();
    if (n < t.making) return 'received';
    if (n < t.ready) return 'making';
    if (n < t.ready + 180000) return 'ready';
    return 'done';
  }
  const hhmm = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  function punchCard() {
    const n = state.punches % D.rewardAt;
    return '<div class="block"><div class="block-head"><h2>Punch card</h2><span class="mono small">' + n + ' of ' + D.rewardAt + '</span></div>' +
      '<div class="punch-card"><div class="punches">' + Array.from({ length: D.rewardAt }, (_, i) =>
        i === D.rewardAt - 1 && i >= n ? '<span class="punch free">FREE</span>' : '<span class="punch' + (i < n ? ' on' : '') + '"></span>').join('') + '</div>' +
      '<p>' + (state.freeDrinks ? 'You have a free drink. It comes off your next order automatically.' : (D.rewardAt - n) + ' more drink' + (D.rewardAt - n === 1 ? '' : 's') + ' and the next one is free. Works at every shop in the app.') + '</p></div></div>';
  }

  let ordersTimer;
  function renderOrders() {
    const el = $('[data-screen="orders"]');
    clearInterval(ordersTimer);
    const active = state.orders.filter((o) => orderStatus(o) !== 'done');
    const past = state.orders.filter((o) => orderStatus(o) === 'done');
    el.innerHTML = '<div class="screen-title">Orders</div>' +
      active.map((o) => {
        const st = orderStatus(o), s = storeById(o.storeId), t = orderTimes(o);
        const steps = [['received', 'Sent to the shop', hhmm(t.placed)], ['making', 'Barista is making it', st === 'received' ? '' : hhmm(t.making)], ['ready', o.mode === 'curbside' ? 'Ready for curbside' : 'On the pickup shelf', (st === 'ready' ? '' : '~') + hhmm(t.ready)]];
        const idx = ['received', 'making', 'ready'].indexOf(st);
        return '<div class="ticket"><div class="ticket-top"><div class="label">Pickup code</div><div class="code">' + o.code + '</div>' +
          '<div class="where">' + esc(s.name) + ' · ' + esc(s.address) + '</div></div><div class="perf"></div>' +
          '<div class="ticket-body"><ol class="timeline">' + steps.map((x, i) => '<li class="' + (i < idx || (st === 'ready' && i === idx) ? 'done' : i === idx ? 'now' : '') + '"><span class="dot"></span>' + x[1] + '<span class="t">' + x[2] + '</span></li>').join('') + '</ol>' +
          (st === 'ready' ? '<div class="ready-note">It\'s ready. Say "' + o.code + '" at the ' + (o.mode === 'curbside' ? 'car window' : 'counter') + '.</div>' : '') +
          '<div class="ticket-items">' + o.lines.map((l) => '<span>' + l.qty + '× ' + esc(lineTitle(l)) + (lineMods(l) ? ' (' + esc(lineMods(l)) + ')' : '') + '</span>').join('') + '<span style="color:var(--ink)">Total ' + money(o.total) + '</span></div>' +
          '<div class="btn-row"><button class="btn btn--line btn--sm" data-show-store="' + s.id + '">Directions</button><button class="btn btn--ink btn--sm" data-picked="' + o.id + '">' + (o.mode === 'curbside' && st !== 'ready' ? 'I\'m here' : 'Picked it up') + '</button></div>' +
          '</div></div>';
      }).join('') +
      punchCard() +
      (past.length ? '<div class="block"><div class="block-head"><h2>Past orders</h2></div>' + past.slice(0, 12).map((o) =>
        '<div class="list-row past">' + art(o.lines[0].itemId, 'sm') + '<div class="grow"><h3>' + esc(storeById(o.storeId).name) + '</h3><div class="sub">' + o.lines.map((l) => l.qty + '× ' + esc(lineTitle(l))).join(', ') + '</div>' +
        '<div class="when">' + new Date(o.placedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' · ' + money(o.total) + '</div></div>' +
        '<button class="btn btn--line btn--sm" data-reorder="' + o.id + '">Reorder</button></div>').join('') + '</div>'
        : (active.length ? '' : '<div class="empty"><h2>No orders yet</h2><p>Your pickup tickets show up here.</p><button class="btn" data-go="stores">Find a shop</button></div>'));
    if (active.length) ordersTimer = setInterval(() => { if (state.screen === 'orders') renderOrders(); }, 3000);
  }

  function reorder(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return;
    state.orderStoreId = o.storeId;
    state.bag = o.lines.map((l) => Object.assign({}, l, { id: uid() }));
    save();
    go('bag');
    toast('Same order as last time, at ' + storeById(o.storeId).name);
  }

  /* ---------- events (one delegated listener) ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-order-at],[data-item],[data-reorder],[data-select],[data-deselect],[data-fav],[data-filter],[data-zoom],[data-locate],[data-cat],[data-size],[data-milk],[data-shots],[data-syrup],[data-warm],[data-qty],[data-add],[data-close],[data-line-qty],[data-remove],[data-mode],[data-time],[data-place],[data-show-store],[data-picked]');
    if (!t) return;
    const d = t.dataset;
    if (d.go) return go(d.go);
    if (d.orderAt) return startOrderAt(d.orderAt);
    if (d.item && !draft) {
      if (d.itemStore && d.itemStore !== state.orderStoreId) {
        if (state.bag.length) state.bag = [];
        state.orderStoreId = d.itemStore;
      }
      return openItem(d.item);
    }
    if (d.reorder) return reorder(d.reorder);
    if (d.select) return selectStore(d.select, true);
    if (d.deselect !== undefined) { state.storeId = null; save(); return renderStores(); }
    if (d.fav) {
      const i = state.favorites.indexOf(d.fav);
      i >= 0 ? state.favorites.splice(i, 1) : state.favorites.push(d.fav);
      save(); toast(i >= 0 ? 'Removed from saved shops' : 'Saved. Find it under Saved on the map'); return renderStores();
    }
    if (d.filter) { state.filter = d.filter; state.storeId = null; save(); return renderStores(); }
    if (d.zoom) return zoom(d.zoom === 'in' ? 1 / 1.4 : 1.4);
    if (d.locate !== undefined) return centerOn(D.me.x, D.me.y, true);
    if (d.cat) {
      menuCat = d.cat;
      $$('.cat-tab').forEach((c) => c.classList.toggle('is-on', c.dataset.cat === d.cat));
      const g = $('#cat-' + d.cat);
      if (g) g.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (draft) {
      if (d.size) draft.size = d.size;
      else if (d.milk) draft.milk = d.milk;
      else if (d.shots) draft.shots = Math.min(4, Math.max(0, draft.shots + Number(d.shots)));
      else if (d.syrup) { const i = draft.syrups.indexOf(d.syrup); i >= 0 ? draft.syrups.splice(i, 1) : draft.syrups.push(d.syrup); }
      else if (d.warm !== undefined) draft.warm = !draft.warm;
      else if (d.qty) draft.qty = Math.min(10, Math.max(1, draft.qty + Number(d.qty)));
      else if (d.add !== undefined) return addToBag();
      else if (d.close !== undefined) return closeModal();
      return renderModal();
    }
    if (d.lineQty) { const l = state.bag.find((x) => x.id === d.lineQty); l.qty = Math.min(10, Math.max(1, l.qty + Number(d.d))); save(); renderTopbar(); return renderBag(); }
    if (d.remove) { state.bag = state.bag.filter((x) => x.id !== d.remove); save(); renderTopbar(); return renderBag(); }
    if (d.mode) { state.pickupMode = d.mode; save(); return renderBag(); }
    if (d.time) { state.pickupIn = Number(d.time); save(); return renderBag(); }
    if (d.place !== undefined) return placeOrder();
    if (d.showStore) { state.storeId = d.showStore; go('stores'); const s = storeById(d.showStore); return centerOn(s.x, s.y, true); }
    if (d.picked) {
      const o = state.orders.find((x) => x.id === d.picked);
      if (o.mode === 'curbside' && orderStatus(o) !== 'ready') { toast(storeById(o.storeId).name + ' knows you\'re outside'); return; }
      o.placedAt = 0; save(); toast('Enjoy it'); return renderOrders();
    }
  });

  const search = $('#storeSearch');
  search.addEventListener('input', (e) => { state.query = e.target.value; state.storeId = null; renderStores(); });
  search.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const first = visibleStores()[0];
    if (first) { search.blur(); selectStore(first.id, true); }
  });
  $('#itemModal').addEventListener('click', (e) => { if (e.target.classList.contains('modal-scrim')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && draft) closeModal(); });
  window.addEventListener('resize', () => { if (map.built) applyViewBox(); });

  /* ---------- boot ---------- */
  search.value = state.query || '';
  $$('.tab').forEach((t) => { t.innerHTML = I[t.dataset.icon] + '<span>' + t.textContent.trim() + '</span>' + (t.dataset.go === 'bag' ? '<span class="badge" id="bagBadge" hidden>0</span>' : ''); });
  $('#brandMark').innerHTML = I.cup;
  $('[data-zoom="in"]').innerHTML = I.plus;
  $('[data-zoom="out"]').innerHTML = I.minus;
  $('[data-locate]').innerHTML = I.locate;
  $('#searchIcon').innerHTML = I.search;
  $('#modalClose').innerHTML = I.close;
  go(['stores', 'menu', 'bag', 'orders'].includes(state.screen) ? state.screen : 'stores');
})();
