/* On the Go — app logic. No build step, no framework.
   Map → tap a pin or search → Order → that shop's menu → Your Order → order status. */
(function () {
  'use strict';
  const D = window.OTG_DATA, C = D.catalog, M = window.OTG_MAP;
  const STORAGE_KEY = 'onthego.v5';

  /* ---------- helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + n.toFixed(2);
  const storeById = (id) => D.stores.find((s) => s.id === id);
  const uid = () => Math.random().toString(36).slice(2, 8);
  const priceAt = (store, id) => { const r = store.menu.find((m) => m[0] === id); return r ? r[1] : 0; };
  const photo = (storeId, itemId) => (D.photos && D.photos[storeId] && D.photos[storeId][itemId]) || null;
  const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* in-memory only */ } }

  const state = Object.assign({
    screen: 'map', storeId: null, orderStoreId: null, bag: [], orders: [],
    pickupMode: 'store', pickupIn: 0, query: ''
  }, load());

  /* ---------- geography ---------- */
  const KX = 49900, KY = 55450; /* degrees → map units (≈2 m) at Boca's latitude */
  const project = (lng, lat) => ({ x: (lng - M.bounds.west) * KX, y: (M.bounds.north - lat) * KY });
  const pts = (a) => a.map((c) => { const q = project(c[0], c[1]); return q.x.toFixed(1) + ' ' + q.y.toFixed(1); });
  const poly = (a) => 'M' + pts(a).join('L') + 'Z';
  const line = (a) => 'M' + pts(a).join('L');
  D.stores.forEach((s) => Object.assign(s, project(s.lng, s.lat)));
  Object.assign(D.me, project(D.me.lng, D.me.lat));

  function distMi(s) {
    const R = 3958.8, r = Math.PI / 180;
    const a = Math.sin((s.lat - D.me.lat) * r / 2) ** 2 + Math.cos(D.me.lat * r) * Math.cos(s.lat * r) * Math.sin((s.lng - D.me.lng) * r / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  const miles = (s) => (distMi(s) < 0.1 ? 'Under 0.1' : distMi(s).toFixed(1)) + ' mi';
  const sorted = () => D.stores.slice().sort((a, b) => distMi(a) - distMi(b));

  function toMin(t) {
    const m = t.trim().match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (!m) return 0;
    return ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2] || 0);
  }
  const hoursOn = (s, d) => (s.week ? s.week[d.getDay()] : s.hours);
  function openSpan(s, d) {
    const h = hoursOn(s, d);
    if (!h) return null;
    const [a, b] = h.split('–');
    return [toMin(a), toMin(b), a.trim(), b.trim()];
  }
  function isOpenAt(s, d) {
    const o = openSpan(s, d), n = d.getHours() * 60 + d.getMinutes();
    return !!o && n >= o[0] && n < o[1];
  }
  function hoursLine(s) {
    const now = new Date(), o = openSpan(s, now);
    if (isOpenAt(s, now)) return '<span class="open">Open</span> · Closes ' + o[3];
    if (o && now.getHours() * 60 + now.getMinutes() < o[0]) return '<span class="closed">Closed</span> · Opens ' + o[2];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now.getTime() + i * 86400000), n = openSpan(s, d);
      if (n) return '<span class="closed">Closed</span> · Opens ' + (i === 1 ? 'tomorrow ' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ') + n[2];
    }
    return '<span class="closed">Closed</span>';
  }

  /* ---------- how busy a shop usually is, 0–100 ----------
     Google doesn't publish its Popular Times data through any API, so this estimates it:
     a typical café curve for the hour and day, reshaped by what the shop's Google listing
     says about it (pattern) and scaled by how many people review it (traffic). */
  const WEEKDAY = { 6: 25, 7: 50, 8: 78, 9: 85, 10: 68, 11: 55, 12: 60, 13: 52, 14: 42, 15: 38, 16: 34, 17: 30, 18: 26, 19: 22, 20: 16, 21: 10 };
  const WEEKEND = { 6: 12, 7: 25, 8: 50, 9: 80, 10: 95, 11: 90, 12: 76, 13: 64, 14: 54, 15: 46, 16: 40, 17: 32, 18: 26, 19: 22, 20: 16, 21: 10 };
  function busyness(s, d) {
    if (!isOpenAt(s, d)) return 0;
    const h = d.getHours(), wkend = d.getDay() === 0 || d.getDay() === 6;
    let v = (wkend ? WEEKEND : WEEKDAY)[h] || 10;
    const am = h < 11, pm = h >= 14;
    switch (s.pattern) {
      case 'breakfast': v *= am ? 1.15 : pm ? 0.8 : 1; break;
      case 'office':    v *= wkend ? 0.55 : (h >= 7 && h < 10 ? 1.25 : 1); break;
      case 'commuter':  v *= !wkend && h >= 7 && h < 9 ? 1.3 : 1; break;
      case 'mall':      v *= h < 11 ? 0.55 : (h >= 12 && h < 17 ? (wkend ? 1.45 : 1.3) : 1); break;
      case 'evening':   v *= h >= 18 ? 2.4 : 1; break;
      case 'downtown':  v *= h >= 17 ? (wkend ? 1.9 : 1.4) : 1; break;
    }
    return Math.max(5, Math.min(100, Math.round(v * (s.traffic || 1))));
  }
  const busyWord = (b) => b >= 80 ? 'Very busy' : b >= 55 ? 'Busy' : b >= 30 ? 'A little busy' : 'Not busy';

  /* minutes of barista time per item, before any line */
  function prepMin(l) {
    const def = C[l.itemId];
    if (def.kind === 'food') return ['toast', 'bowl', 'crepe', 'sandwich'].includes(def.shape) ? 6 : (l.warm ? 3 : 1);
    return { espresso: 2, hot: 3, black: 1.5, iced: 2.5, frozen: 4, affogato: 3 }[def.kind] + (l.shots ? 0.5 : 0);
  }
  /* estimate for an order placed at time d: the line ahead of you plus your own items */
  function eta(s, lines, d) {
    const b = busyness(s, d || new Date());
    const items = lines.length ? lines : [{ itemId: 'latte', qty: 1 }];
    const times = items.flatMap((l) => Array(l.qty).fill(prepMin(l)));
    const own = Math.max.apply(null, times) + (times.reduce((a, t) => a + t, 0) - Math.max.apply(null, times)) * 0.5;
    const queue = (b / 100) * 6;                      /* a full shop adds about 6 minutes of line */
    const mid = Math.max(3, Math.round((own + queue) * (1 + b / 500)));
    return { busy: b, min: mid, lo: Math.max(2, Math.round(mid * 0.85)), hi: Math.round(mid * 1.2) + 1 };
  }
  const etaText = (e) => e.lo + '–' + e.hi + ' min';

  /* ---------- icons ---------- */
  const sv = (d, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="square" stroke-linejoin="miter">' + d + '</svg>';
  const I = {
    cup: sv('<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16"/>', 2.2),
    map: sv('<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5Z"/><path d="M9 4v13M15 6.5v13"/>', 2),
    tag: sv('<path d="M3 3h8l10 10-8 8L3 11Z"/><rect x="6.5" y="6.5" width="2" height="2"/>', 2),
    star: sv('<path d="M12 3.5 14.6 9l6 .6-4.5 4 1.3 5.9L12 16.6l-5.4 2.9 1.3-5.9-4.5-4 6-.6Z"/>', 2),
    receipt: sv('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/>', 2),
    back: sv('<path d="M15 5l-7 7 7 7"/>', 2.6),
    go: sv('<path d="M9 5l7 7-7 7"/>', 2.4),
    plus: sv('<path d="M12 5v14M5 12h14"/>', 2.6),
    minus: sv('<path d="M5 12h14"/>', 2.6),
    check: sv('<path d="M5 12.5 10 17 19 7"/>', 3),
    search: sv('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>', 2.2),
    locate: sv('<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><rect x="7" y="7" width="10" height="10"/>', 2.2)
  };
  const box = '<span class="box">' + I.check + '</span>';

  /* ---------- navigation ---------- */
  function go(screen) {
    state.screen = screen;
    $$('.screen').forEach((el) => el.classList.toggle('is-active', el.dataset.screen === screen));
    $('#tabbar').hidden = !['map', 'shop', 'specials', 'orders'].includes(screen);
    const tab = screen === 'shop' ? 'map' : screen;
    $$('.tab').forEach((t) => { t.classList.toggle('is-active', t.dataset.go === tab); t.setAttribute('aria-current', t.dataset.go === tab ? 'page' : 'false'); });
    ({ map: renderMap, shop: renderShop, menu: renderMenu, cart: renderCart, specials: renderSpecials, orders: renderOrders })[screen]();
    save();
  }

  /* ---------- drink of the day: each shop gets one weekday ---------- */
  const isFeatureDay = (s, d) => s.featureDay === (d || new Date()).getDay();
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* ---------- map ---------- */
  const map = { built: false, svg: null, vb: { x: 0, y: 0, w: 1300, h: 1300 }, ptrs: new Map(), last: null, pinch: 0, moved: false };

  function buildMap() {
    if (map.built) return;
    map.built = true;
    const svg = map.svg = $('#mapSvg');
    const b = M.bounds;
    const tl = project(b.west - 0.1, b.north + 0.1), br = project(b.east + 0.1, b.south - 0.1);
    const W = { hwy: 30, major: 18, minor: 10 };
    const centroid = (p) => project(p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length);
    svg.innerHTML =
      '<defs><filter id="pinShadow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-opacity=".35"/></filter></defs>' +
      '<rect x="' + tl.x + '" y="' + tl.y + '" width="' + (br.x - tl.x) + '" height="' + (br.y - tl.y) + '" fill="var(--map-land)"/>' +
      '<path class="water" d="' + poly(M.coast.concat([[b.east + 0.1, b.south - 0.1], [b.east + 0.1, b.north + 0.1]])) + '"/>' +
      '<path class="water-line" d="' + line(M.icw) + '" stroke-width="60"/>' +
      '<path class="water" d="' + poly(M.lake) + '"/>' +
      '<path class="water-line" d="' + line(M.inlet) + '" stroke-width="22"/>' +
      '<path class="water-line" d="' + line(M.canal) + '" stroke-width="10"/>' +
      M.areas.map((a) => '<path class="area area--' + a.cls + '" d="' + poly(a.pts) + '"/>').join('') +
      '<path class="runway" d="' + line(M.runway) + '" stroke-width="14"/>' +
      M.roads.filter((r) => r.cls !== 'minor').map((r) => '<path class="road-casing" d="' + line(r.pts) + '" stroke-width="' + (W[r.cls] + 3) + '"/>').join('') +
      M.roads.map((r, i) => '<path id="rd' + i + '" class="road road--' + r.cls + '" d="' + line(r.pts) + '" stroke-width="' + W[r.cls] + '"/>').join('') +
      M.roads.map((r, i) => '<text class="map-street" dy="3.5"><textPath href="#rd' + i + '" startOffset="' + (r.cls === 'minor' ? '30%' : '18%') + '">' + esc(r.name) + '</textPath></text>').join('') +
      M.areas.filter((a) => a.cls === 'park').map((a) => { const c = centroid(a.pts); return '<text class="map-street map-street--area" x="' + c.x + '" y="' + c.y + '" text-anchor="middle">' + esc(a.name) + '</text>'; }).join('') +
      M.labels.map((l) => { const q = project(l.lon, l.lat); return '<text class="map-label map-label--' + l.cls + '" x="' + q.x + '" y="' + q.y + '" text-anchor="middle"' + (l.rotate ? ' transform="rotate(' + l.rotate + ' ' + q.x + ' ' + q.y + ')"' : '') + '>' + esc(l.name) + '</text>'; }).join('') +
      '<g id="me"><circle class="me-ring" r="20"/><circle class="me-dot" r="7"/></g>' +
      '<g id="pins"></g>';

    map.vb.x = D.me.x - map.vb.w / 2;
    map.vb.y = D.me.y - map.vb.h / 2;
    if (window.ResizeObserver) new ResizeObserver(() => applyViewBox()).observe(svg);

    const rect = () => svg.getBoundingClientRect();
    svg.addEventListener('pointerdown', (e) => {
      svg.setPointerCapture(e.pointerId);
      map.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (map.ptrs.size === 1) { map.moved = false; map.last = { x: e.clientX, y: e.clientY }; }
      if (map.ptrs.size === 2) { const [a, c] = [...map.ptrs.values()]; map.pinch = Math.hypot(a.x - c.x, a.y - c.y); map.last = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }; }
      svg.classList.add('is-dragging');
    });
    svg.addEventListener('pointermove', (e) => {
      if (!map.ptrs.has(e.pointerId)) return;
      map.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = rect();
      let cur;
      if (map.ptrs.size >= 2) {
        const [a, c] = [...map.ptrs.values()];
        cur = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
        const d = Math.hypot(a.x - c.x, a.y - c.y);
        if (map.pinch) zoomAt(map.pinch / d, cur.x, cur.y);
        map.pinch = d;
        map.moved = true;
      } else {
        cur = { x: e.clientX, y: e.clientY };
      }
      const dx = cur.x - map.last.x, dy = cur.y - map.last.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) {
        if (map.ptrs.size === 1 && Math.hypot(e.clientX - map.last.x, e.clientY - map.last.y) > 0) {
          if (!map.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
          map.moved = true;
        }
        map.vb.x -= dx * map.vb.w / r.width;
        map.vb.y -= dy * map.vb.h / r.height;
        map.last = cur;
        applyViewBox();
      }
    });
    const up = (e) => {
      map.ptrs.delete(e.pointerId);
      if (map.ptrs.size === 1) { const p = [...map.ptrs.values()][0]; map.last = { x: p.x, y: p.y }; map.pinch = 0; }
      if (!map.ptrs.size) svg.classList.remove('is-dragging');
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(Math.exp(e.deltaY * 0.0022), e.clientX, e.clientY); }, { passive: false });
    svg.addEventListener('dblclick', (e) => zoomAt(0.6, e.clientX, e.clientY));
    svg.addEventListener('click', (e) => {
      if (map.moved) return;
      const pin = e.target.closest('.pin');
      if (pin) selectStore(pin.dataset.id);
      else if (state.storeId) { state.storeId = null; save(); renderMap(); }
    });
  }

  function applyViewBox() {
    const r = map.svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const h = map.vb.w * (r.height / r.width);
    map.vb.y += (map.vb.h - h) / 2;   /* keep the same center when the map changes size */
    map.vb.h = h;
    map.svg.setAttribute('viewBox', [map.vb.x, map.vb.y, map.vb.w, map.vb.h].join(' '));
    const k = map.vb.w / (r.width || 400);
    map.svg.style.setProperty('--k', k);
    map.svg.classList.toggle('is-far', map.vb.w > 1500);
    map.svg.classList.toggle('is-mid', map.vb.w > 900);
    $$('.pin', map.svg).forEach((p) => p.setAttribute('transform', 'translate(' + p.dataset.x + ' ' + p.dataset.y + ') scale(' + k * (p.classList.contains('is-selected') ? 1.2 : 1) + ')'));
    $('#me').setAttribute('transform', 'translate(' + D.me.x + ' ' + D.me.y + ') scale(' + k + ')');
  }

  function zoomAt(f, cx, cy) {
    const r = map.svg.getBoundingClientRect();
    const fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height;
    const mx = map.vb.x + fx * map.vb.w, my = map.vb.y + fy * map.vb.h;
    map.vb.w = Math.min(5200, Math.max(300, map.vb.w * f));
    map.vb.h = map.vb.w * (r.height / r.width);
    map.vb.x = mx - fx * map.vb.w;
    map.vb.y = my - fy * map.vb.h;
    applyViewBox();
  }

  /* pan so (x, y) sits at a fraction of the visible map height, above the sheet */
  function centerOn(x, y, frac) {
    const tx = x - map.vb.w / 2, ty = y - map.vb.h * frac;
    const sx = map.vb.x, sy = map.vb.y, t0 = performance.now();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { map.vb.x = tx; map.vb.y = ty; return applyViewBox(); }
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 350), e = 1 - Math.pow(1 - p, 3);
      map.vb.x = sx + (tx - sx) * e; map.vb.y = sy + (ty - sy) * e;
      applyViewBox();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function matches() {
    const q = state.query.trim().toLowerCase();
    const list = sorted();
    if (!q) return list;
    return list.filter((s) => (s.name + ' ' + s.address + ' ' + s.menu.map((m) => C[m[0]].name).join(' ')).toLowerCase().includes(q));
  }

  function renderPins() {
    const list = matches();
    $('#pins').innerHTML = list.map((s) => {
      let deal = '';
      if (isFeatureDay(s)) {
        const name = C[s.signature].name + '  ' + money(priceAt(s, s.signature));
        const w = Math.max(96, Math.round(name.length * 7 + 16));
        deal = '<g class="pin-deal" transform="translate(' + (-w / 2) + ' -62)"><rect width="' + w + '" height="36" rx="8"/><path d="M' + (w / 2 - 6) + ' 36h12l-6 7Z" fill="#000"/>' +
          '<text class="k" x="8" y="14">TODAY ONLY</text><text x="8" y="29">' + esc(name) + '</text></g>';
      }
      return '<g class="pin' + (s.id === state.storeId ? ' is-selected' : '') + '" data-id="' + s.id + '" data-x="' + s.x + '" data-y="' + s.y + '">' +
        deal +
        '<circle class="pin-box" r="17" fill="' + s.brand.bg + '"/>' +
        '<text class="pin-mono" y="' + (s.brand.mono.length > 2 ? 4 : 5) + '" text-anchor="middle" fill="' + s.brand.fg + '" font-size="' + (s.brand.mono.length > 2 ? 10 : 13) + '">' + esc(s.brand.mono) + '</text>' +
        '<text class="pin-name" y="32" text-anchor="middle">' + esc(s.name) + '</text></g>';
    }).join('');
    /* drink-of-the-day pins draw on top */
    $$('#pins .pin-deal').forEach((d) => d.parentNode.parentNode.appendChild(d.parentNode));
    applyViewBox();
  }

  const tile = (s, big) => '<span class="tile' + (big ? ' tile--big' : '') + '" style="background:' + s.brand.bg + ';color:' + s.brand.fg + '" aria-hidden="true">' + esc(s.brand.mono) + '</span>';
  const band = (s) => 'style="background:' + s.brand.bg + ';color:' + s.brand.fg + '"';

  function todayCard(s, attrs) {
    return '<button class="today" ' + attrs + '><div class="grow"><div class="k">' + DAYS[s.featureDay] + ' drink of the day</div><div class="n">' + esc(C[s.signature].name) + '</div></div><span class="p">' + money(priceAt(s, s.signature)) + '</span></button>';
  }

  function renderMap() {
    buildMap();
    renderPins();
    $('#qClear').hidden = !state.query;
    const list = matches();
    $('#sheetBody').innerHTML = '<div class="head">' + (state.query ? list.length + ' result' + (list.length === 1 ? '' : 's') : 'Coffee shops near you') + '</div>' +
      (list.length ? list.map((st) => '<button class="row" data-select="' + st.id + '">' + tile(st) + '<div class="grow"><div class="t">' + esc(st.name) + '</div>' +
        '<div class="s">' + esc(st.tag) + '</div><div class="s">' + hoursLine(st) + ' · ' + miles(st) + '</div>' +
        (isFeatureDay(st) ? '<span class="pick">Today: ' + esc(C[st.signature].name) + '</span>' : '') + '</div>' +
        '<span class="go">' + I.go + '</span></button>').join('')
        : '<p class="note">No shops match “' + esc(state.query) + '”. Try a shop name or a drink like “latte”.</p>');
  }

  /* ---------- a shop's own page (the map steps aside) ---------- */
  function renderShop() {
    const s = storeById(state.storeId);
    if (!s) return go('map');
    const now = new Date(), open = isOpenAt(s, now), e = eta(s, []);
    const other = state.bag.length && state.orderStoreId !== s.id ? storeById(state.orderStoreId) : null;
    $('#shopBody').innerHTML = '<div class="shop-body">' +
      '<div class="band" ' + band(s) + '>' + tile(s, true) + '<div class="grow"><h2>' + esc(s.name) + '</h2><p>' + esc(s.tag) + '</p></div></div>' +
      '<div class="shop-info"><p class="about">' + esc(s.about) + '</p>' +
      '<div class="facts">' +
        '<div><span>Address</span><span>' + esc(s.address) + '</span></div>' +
        '<div><span>Hours today</span><span>' + hoursLine(s) + '</span></div>' +
        '<div><span>Distance</span><span>' + miles(s) + '</span></div>' +
        (open ? '<div><span>Right now</span><span>' + busyWord(e.busy) + '</span></div><div><span>Order ready in</span><span>' + etaText(e) + '</span></div>' : '') +
      '</div></div>' +
      (isFeatureDay(s) ? todayCard(s, 'data-item="' + s.signature + '" data-item-store="' + s.id + '"') : '') +
      '<div class="shop-actions"><button class="btn" data-order="' + s.id + '"' + (open ? '' : ' disabled') + '>' + (open ? 'Order here' : 'Closed now') + '</button>' +
      '<a class="btn btn--line" href="https://maps.apple.com/?daddr=' + s.lat + ',' + s.lng + '&q=' + encodeURIComponent(s.name) + '" target="_blank" rel="noopener">Directions</a></div>' +
      (other ? '<p class="warn">You have items from ' + esc(other.name) + ' in your order. Ordering here will remove them.</p>' : '') +
      '<div class="head">On the menu</div>' +
      s.menu.slice(0, 6).map((m) => itemRow(s, m[0], m[1])).join('') +
      '<div class="row"><button class="link" data-order="' + s.id + '"' + (open ? '' : ' disabled') + '>See the full menu (' + s.menu.length + ' items)</button></div>' +
      '</div>';
    showBar();
  }

  function selectStore(id) {
    state.storeId = id;
    go('shop');
    $('#shopBody').scrollTop = 0;
  }

  function backToMap() {
    const s = storeById(state.storeId);
    go('map');
    if (s) centerOn(s.x, s.y, 0.5);
  }

  function startOrder(id) {
    if (state.bag.length && state.orderStoreId !== id) state.bag = [];
    state.orderStoreId = id;
    state.storeId = id;
    menuCat = null;
    go('menu');
    $('#menuBody').scrollTop = 0;
  }

  /* ---------- menu ---------- */
  let menuCat = null;
  const bagCount = () => state.bag.reduce((n, l) => n + l.qty, 0);

  function itemRow(s, id, price) {
    const img = photo(s.id, id);
    const n = state.bag.filter((l) => l.itemId === id).reduce((a, l) => a + l.qty, 0);
    return '<button class="item' + (isFeatureDay(s) && id === s.signature ? ' is-today' : '') + '" data-item="' + id + '"><div class="grow">' +
      '<div class="n">' + esc(C[id].name) + '</div><div class="d">' + esc(C[id].desc) + '</div><div class="p">' + money(price) + '</div>' +
      (n ? '<span class="qty">' + n + ' in your order</span>' : '') + '</div>' +
      (img ? '<img class="thumb" src="' + esc(img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + '</button>';
  }

  function renderMenu() {
    const s = storeById(state.orderStoreId);
    if (!s) return go('map');
    const cats = D.categories.filter((c) => s.menu.some((m) => C[m[0]].cat === c.id));
    if (!menuCat || !cats.find((c) => c.id === menuCat)) menuCat = cats[0].id;
    const now = new Date(), e = eta(s, state.bag);
    $('#menuTitle').textContent = s.name;
    $('#menuBody').innerHTML =
      '<div class="band" ' + band(s) + '>' + tile(s, true) + '<div class="grow"><h2>' + esc(s.name) + '</h2><p>' + esc(s.tag) + '</p></div></div>' +
      '<div class="menu-top"><p>' + (isOpenAt(s, now) ? '<span class="ready">Ready in ' + etaText(e) + '</span> · ' + busyWord(e.busy) + ' now' : hoursLine(s)) + '</p>' +
        '<p>' + esc(s.address) + ' · ' + miles(s) + '</p></div>' +
      (isFeatureDay(s) ? '<div class="menu-group"><div class="head">Drink of the day</div>' + itemRow(s, s.signature, priceAt(s, s.signature)) + '</div>' : '') +
      '<div class="cats" role="tablist">' + cats.map((c) => '<button class="cat' + (c.id === menuCat ? ' is-on' : '') + '" data-cat="' + c.id + '" role="tab" aria-selected="' + (c.id === menuCat) + '">' + c.name + '</button>').join('') + '</div>' +
      cats.map((c) => '<div class="menu-group" id="cat-' + c.id + '"><div class="head">' + c.name + '</div>' +
        s.menu.filter((m) => C[m[0]].cat === c.id).map((m) => itemRow(s, m[0], m[1])).join('') + '</div>').join('') +
      '<p class="note">Prices may be different at the shop.</p>';
    const bar = $('#cartBar');
    bar.hidden = !state.bag.length;
    if (state.bag.length) bar.innerHTML = '<button class="btn btn--split" data-go="cart"><span>View order (' + bagCount() + ')</span><span>' + money(totals().sub) + '</span></button>';
  }

  /* ---------- item screen ---------- */
  let draft = null;
  function openItem(id) {
    const s = storeById(state.orderStoreId), def = C[id];
    draft = { itemId: id, storeId: s.id, base: priceAt(s, id), size: def.sized ? 'reg' : null, milk: def.milk ? 'whole' : null, shots: 0, syrups: [], warm: false, qty: 1 };
    renderItem();
    $('#itemModal').classList.add('is-open');
    $('#modalBody').scrollTop = 0;
    $('#itemModal .back').focus();
  }
  function closeItem() { $('#itemModal').classList.remove('is-open'); draft = null; }

  function linePrice(l) {
    const s = storeById(l.storeId);
    let p = l.base;
    if (l.size) p += D.sizes.find((z) => z.id === l.size).delta;
    if (l.milk) p += D.milks.find((k) => k.id === l.milk).delta;
    return p + (l.shots || 0) * s.shot + (l.syrups || []).length * s.syrup;
  }
  const lineName = (l) => (l.size === 'lg' ? 'Large ' : '') + C[l.itemId].name;
  function lineMods(l) {
    const out = [];
    if (l.milk && l.milk !== 'whole') out.push(D.milks.find((k) => k.id === l.milk).name + ' milk');
    if (l.shots) out.push(l.shots + ' extra shot' + (l.shots > 1 ? 's' : ''));
    (l.syrups || []).forEach((x) => out.push(D.syrups.find((y) => y.id === x).name + ' syrup'));
    if (l.warm) out.push('Warmed');
    return out.join(', ');
  }
  const stepper = (attr, val, min, label) => '<span class="stepper"><button class="sq" ' + attr + '="-1" aria-label="Less ' + label + '"' + (val > min ? '' : ' disabled') + '>' + I.minus + '</button><b aria-live="polite">' + val + '</b><button class="sq" ' + attr + '="1" aria-label="More ' + label + '">' + I.plus + '</button></span>';
  const choice = (on, attr, label, extra, role) => '<button class="choice' + (on ? ' is-on' : '') + '" ' + attr + ' role="' + (role || 'radio') + '" aria-checked="' + on + '">' + box + '<span>' + label + '</span>' + (extra ? '<span class="x">' + extra + '</span>' : '') + '</button>';

  function renderItem() {
    const def = C[draft.itemId], s = storeById(draft.storeId), img = photo(s.id, draft.itemId);
    const head = (t, note) => '<div class="group-head"><h3>' + t + '</h3><span>' + note + '</span></div>';
    $('#modalBody').innerHTML =
      (img ? '<img class="hero-img" src="' + esc(img) + '" alt="' + esc(def.name) + '" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      '<div class="item-head"><h2 id="itemTitle">' + esc(def.name) + '</h2><p class="p">' + money(draft.base) + '</p><p class="d">' + esc(def.desc) + ' ' + def.cal + ' calories.</p></div>' +
      (def.sized ? head('Size', 'Pick one') + D.sizes.map((z) => choice(draft.size === z.id, 'data-size="' + z.id + '"', z.name + ' (' + z.oz + ' oz)', z.delta ? '+' + money(z.delta) : '')).join('') : '') +
      (def.milk ? head('Milk', 'Pick one') + D.milks.map((k) => choice(draft.milk === k.id, 'data-milk="' + k.id + '"', k.name, k.delta ? '+' + money(k.delta) : '')).join('') : '') +
      (def.coffee || def.milk ? head('Extras', 'Optional') +
        (def.coffee ? '<div class="choice"><span>Extra shot <span style="color:var(--text-2)">+' + money(s.shot) + ' each</span></span>' + stepper('data-shots', draft.shots, 0, 'shots') + '</div>' : '') +
        D.syrups.map((y) => choice(draft.syrups.includes(y.id), 'data-syrup="' + y.id + '"', y.name + ' syrup', '+' + money(s.syrup), 'checkbox')).join('') : '') +
      (def.warm ? head('Warm it up?', 'Optional') + choice(draft.warm, 'data-warm', 'Yes, warm it', 'Free', 'checkbox') : '');
    $('#modalFoot').innerHTML = stepper('data-qty', draft.qty, 1, 'quantity') +
      '<button class="btn btn--split" data-add><span>Add</span><span>' + money(linePrice(draft) * draft.qty) + '</span></button>';
  }

  function addToBag() {
    const key = JSON.stringify([draft.itemId, draft.size, draft.milk, draft.shots, draft.syrups.slice().sort(), draft.warm]);
    const same = state.bag.find((l) => l.key === key);
    if (same) same.qty += draft.qty; else state.bag.push(Object.assign({ id: uid(), key }, draft));
    save();
    closeItem();
    if (state.screen === 'shop') { renderShop(); showBar(); } else renderMenu();
  }

  /* the View order bar also shows on a shop page once something is in the order */
  function showBar() {
    const bar = $('#shopBar');
    if (!bar) return;
    bar.hidden = !state.bag.length;
    if (state.bag.length) bar.innerHTML = '<button class="btn btn--split" data-go="cart"><span>View order (' + bagCount() + ')</span><span>' + money(totals().sub) + '</span></button>';
  }

  /* ---------- your order ---------- */
  function totals() {
    const sub = state.bag.reduce((t, l) => t + linePrice(l) * l.qty, 0);
    const tax = sub * D.taxRate;
    return { sub, tax, total: sub + tax };
  }

  function renderCart() {
    const s = storeById(state.orderStoreId);
    const bar = $('#placeBar');
    if (s && state.bag.length && !isOpenAt(s, new Date())) {
      $('#cartBody').innerHTML = '<div class="empty"><h2>' + esc(s.name) + ' is closed</h2><p>' + hoursLine(s).replace(/<[^>]+>/g, '') + '.</p><button class="btn btn--auto" data-go="map">Find an open shop</button></div>';
      bar.hidden = true;
      return;
    }
    if (!s || !state.bag.length) {
      $('#cartBody').innerHTML = '<div class="empty"><h2>Your order is empty</h2><p>Add something from the menu.</p><button class="btn btn--auto" data-go="' + (s ? 'menu' : 'map') + '">' + (s ? 'Back to menu' : 'Find a shop') + '</button></div>';
      bar.hidden = true;
      return;
    }
    if (!s.pickup.includes(state.pickupMode)) state.pickupMode = s.pickup[0];
    const t = totals(), e = eta(s, state.bag);
    const later = [15, 30, 60].filter((m) => m > e.hi && isOpenAt(s, new Date(Date.now() + m * 60000)));
    if (state.pickupIn && !later.includes(state.pickupIn)) state.pickupIn = 0;
    $('#cartBody').innerHTML =
      '<div class="eta-box"><b>Ready in ' + etaText(e) + '</b><span>' + esc(s.name) + ' is usually ' + busyWord(e.busy).toLowerCase() + ' at this time of day.</span></div>' +
      '<div class="head">Pick up at</div>' +
      '<div class="row">' + tile(s) + '<div class="grow"><div class="t">' + esc(s.name) + '</div><div class="s">' + esc(s.address) + '</div></div><button class="link" data-change-store>Change</button></div>' +
      (s.pickup.length > 1 ? '<div class="head">How</div>' + choice(state.pickupMode === 'store', 'data-mode="store"', 'Walk in and pick up') + choice(state.pickupMode === 'curbside', 'data-mode="curbside"', 'Curbside, they bring it out') : '') +
      (later.length ? '<div class="head">When</div>' + choice(!state.pickupIn, 'data-time="0"', 'As soon as it\'s ready', etaText(e)) +
        later.map((m) => choice(state.pickupIn === m, 'data-time="' + m + '"', m === 60 ? 'In 1 hour' : 'In ' + m + ' minutes', clock(Date.now() + m * 60000))).join('') : '') +
      '<div class="head">Items</div>' +
      state.bag.map((l) => '<div class="line"><div class="grow"><div class="n">' + esc(lineName(l)) + '</div>' + (lineMods(l) ? '<div class="m">' + esc(lineMods(l)) + '</div>' : '') +
        '<div class="edit">' + '<span class="stepper"><button class="sq" data-line="' + l.id + '" data-d="-1" aria-label="' + (l.qty > 1 ? 'One less ' : 'Remove ') + esc(lineName(l)) + '">' + I.minus + '</button><b>' + l.qty + '</b><button class="sq" data-line="' + l.id + '" data-d="1" aria-label="One more ' + esc(lineName(l)) + '">' + I.plus + '</button></span></div></div>' +
        '<div class="pr">' + money(linePrice(l) * l.qty) + '</div></div>').join('') +
      '<div class="row"><button class="link" data-go="menu">Add more items</button></div>' +
      '<div class="sum"><span>Subtotal</span><span>' + money(t.sub) + '</span><span>Tax</span><span>' + money(t.tax) + '</span><span class="tot">Total</span><span class="tot">' + money(t.total) + '</span></div>' +
      '<div class="row"><div class="grow"><div class="t">Pay with</div><div class="s">Visa ending in 4021</div></div></div>' +
      '<p class="note">This is a demo. Orders are not sent to the shop and no card is charged.</p>';
    bar.hidden = false;
    bar.innerHTML = '<button class="btn btn--split" data-place><span>Place order</span><span>' + money(t.total) + '</span></button>';
  }

  function placeOrder() {
    const s = storeById(state.orderStoreId), t = totals();
    const e = eta(s, state.bag), now = Date.now();
    const ready = Math.max(now + e.min * 60000, now + (state.pickupIn || 0) * 60000);
    const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    state.orders.unshift({
      id: uid(), code: L[Math.floor(Math.random() * 24)] + Math.floor(100 + Math.random() * 900), storeId: s.id,
      mode: state.pickupMode, scheduledIn: state.pickupIn || 0, lines: state.bag.map((l) => Object.assign({}, l)), total: t.total, placedAt: now, readyAt: ready, busy: e.busy
    });
    state.bag = [];
    state.pickupIn = 0;
    go('orders');
    $('#ordersBody').scrollTop = 0;
  }

  /* ---------- specials: every shop's drink of the day, today first ---------- */
  function renderSpecials() {
    const now = new Date(), today = now.getDay();
    const byDay = (d) => sorted().filter((s) => s.featureDay === d);
    const row = (s, live) => '<button class="row" ' + (live ? 'data-special="' + s.id + '"' : 'data-select="' + s.id + '"') + '>' + tile(s) +
      '<div class="grow"><div class="t">' + esc(C[s.signature].name) + '</div><div class="s">' + esc(s.name) + ' · ' + miles(s) + '</div>' +
      (live && !isOpenAt(s, now) ? '<div class="s">' + hoursLine(s) + '</div>' : '') + '</div>' +
      '<span class="end"><b style="color:var(--text)">' + money(priceAt(s, s.signature)) + '</b></span></button>';
    const todays = byDay(today);
    $('#specialsBody').innerHTML = '<h1 class="page-title">Promotions</h1>' +
      '<p class="note" style="padding-top:0">Each shop features its best drink one day a week.</p>' +
      '<div class="head">Today, ' + DAYS[today] + '</div>' +
      (todays.length ? todays.map((s) => row(s, true)).join('') : '<p class="note">No specials today.</p>') +
      '<div class="head">Later this week</div>' +
      [1, 2, 3, 4, 5, 6].map((i) => (today + i) % 7).map((d) => {
        const list = byDay(d);
        return list.length ? '<div class="day">' + DAYS[d] + '</div>' + list.map((s) => row(s, false)).join('') : '';
      }).join('');
  }

  /* ---------- orders ---------- */
  /* The ready time is set when the order is placed, from eta(). The shop "accepts" within a minute. */
  function readyAt(o) { return o.readyAt || o.placedAt + 5 * 60000; }
  function stage(o) {
    const n = Date.now();
    if (o.done) return 3;
    if (n < Math.min(o.placedAt + 45000, readyAt(o) - 60000)) return 0;
    if (n < readyAt(o)) return 1;
    return 2;
  }
  let timer;
  function renderOrders() {
    clearInterval(timer);
    const active = state.orders.filter((o) => stage(o) < 3);
    const past = state.orders.filter((o) => stage(o) === 3);
    const steps = ['The shop got your order', 'They are making it', 'Ready to pick up'];
    $('#ordersBody').innerHTML = '<h1 class="page-title">Orders</h1>' +
      active.map((o) => {
        const st = stage(o), s = storeById(o.storeId);
        const mins = Math.max(0, Math.ceil((readyAt(o) - Date.now()) / 60000));
        return '<div class="band band--thin" ' + band(s) + '>' + tile(s) + '<div class="grow"><h2>' + esc(s.name) + '</h2></div></div><div class="status"><div class="big">' + (st === 2 ? 'Ready now' : 'Ready in about ' + mins + ' min') + '</div>' +
          '<div class="when">' + (st === 2 ? 'Since ' : 'Around ') + clock(readyAt(o)) + '</div>' +
          '<div class="where">' + esc(s.name) + ', ' + esc(s.address) + ' · ' + (o.mode === 'curbside' ? 'Curbside' : 'Walk in') + '</div>' +
          '<ul class="steps">' + steps.map((x, i) => '<li class="' + (i < st || (st === 2 && i === 2) ? 'done' : i === st ? 'now' : '') + '">' + box + x + '</li>').join('') + '</ul>' +
          '<div class="code">Your order number<b>' + o.code + '</b></div>' +
          '<div class="actions"><a class="btn btn--line" href="https://maps.apple.com/?daddr=' + s.lat + ',' + s.lng + '&q=' + encodeURIComponent(s.name) + '" target="_blank" rel="noopener">Directions</a>' +
          '<button class="btn" data-done="' + o.id + '">I got it</button></div></div>' +
          o.lines.map((l) => '<div class="line"><div class="grow"><div class="n">' + l.qty + ' × ' + esc(lineName(l)) + '</div>' + (lineMods(l) ? '<div class="m">' + esc(lineMods(l)) + '</div>' : '') + '</div><div class="pr">' + money(linePrice(l) * l.qty) + '</div></div>').join('') +
          '<div class="sum"><span class="tot">Total</span><span class="tot">' + money(o.total) + '</span></div>';
      }).join('') +
      (past.length ? '<div class="head">Past orders</div>' + past.slice(0, 15).map((o) =>
        '<div class="row">' + tile(storeById(o.storeId)) + '<div class="grow"><div class="t">' + esc(storeById(o.storeId).name) + '</div><div class="s">' + new Date(o.placedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + o.lines.map((l) => esc(lineName(l))).join(', ') + '</div></div>' +
        '<button class="link" data-reorder="' + o.id + '">Order again</button></div>').join('') : '') +
      (!state.orders.length ? '<div class="empty"><h2>No orders yet</h2><p>When you place an order, it shows up here.</p><button class="btn btn--auto" data-go="map">Find a shop</button></div>' : '');
    if (active.length) timer = setInterval(() => { if (state.screen === 'orders') renderOrders(); }, 5000);
  }

  function reorder(id) {
    const o = state.orders.find((x) => x.id === id);
    state.orderStoreId = o.storeId;
    state.bag = o.lines.map((l) => Object.assign({}, l, { id: uid() }));
    go('cart');
  }

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-item]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (draft) {
      if (d.size) draft.size = d.size;
      else if (d.milk) draft.milk = d.milk;
      else if (d.shots) draft.shots = Math.min(4, Math.max(0, draft.shots + Number(d.shots)));
      else if (d.syrup) { const i = draft.syrups.indexOf(d.syrup); i >= 0 ? draft.syrups.splice(i, 1) : draft.syrups.push(d.syrup); }
      else if (d.warm !== undefined) draft.warm = !draft.warm;
      else if (d.qty) draft.qty = Math.min(10, Math.max(1, draft.qty + Number(d.qty)));
      else if (d.add !== undefined) return addToBag();
      else if (d.close !== undefined) return closeItem();
      else return;
      return renderItem();
    }
    if (d.special) {
      const s = storeById(d.special);
      if (!isOpenAt(s, new Date())) return selectStore(s.id);
      startOrder(s.id);
      return openItem(s.signature);
    }
    if (d.go) return go(d.go);
    if (d.back !== undefined) return backToMap();
    if (d.select) return selectStore(d.select);
    if (d.order) return startOrder(d.order);
    if (d.item) {
      if (state.screen === 'shop' && state.orderStoreId !== state.storeId) { if (state.bag.length) state.bag = []; state.orderStoreId = state.storeId; }
      if (d.itemStore && d.itemStore !== state.orderStoreId) { if (state.bag.length) state.bag = []; state.orderStoreId = d.itemStore; }
      return openItem(d.item);
    }
    if (d.cat) {
      menuCat = d.cat;
      $$('.cat').forEach((c) => { c.classList.toggle('is-on', c.dataset.cat === d.cat); c.setAttribute('aria-selected', c.dataset.cat === d.cat); });
      const g = $('#cat-' + d.cat);
      if (g) $('#menuBody').scrollTo({ top: g.offsetTop - 54 });
      return;
    }
    if (d.line) {
      const l = state.bag.find((x) => x.id === d.line);
      l.qty += Number(d.d);
      if (l.qty < 1) state.bag = state.bag.filter((x) => x !== l);
      save();
      return renderCart();
    }
    if (d.mode) { state.pickupMode = d.mode; save(); return renderCart(); }
    if (d.time) { state.pickupIn = Number(d.time); save(); return renderCart(); }
    if (d.changeStore !== undefined) return go('map');
    if (d.place !== undefined) return placeOrder();
    if (d.done) { state.orders.find((o) => o.id === d.done).done = true; save(); return renderOrders(); }
    if (d.reorder) return reorder(d.reorder);
  });

  const q = $('#q');
  q.addEventListener('input', () => { state.query = q.value; state.storeId = null; renderMap(); });
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = matches()[0]; if (f) { q.blur(); selectStore(f.id); } } });
  $('#qClear').addEventListener('click', () => { q.value = ''; state.query = ''; renderMap(); q.focus(); });
  $('#locate').addEventListener('click', () => centerOn(D.me.x, D.me.y, 0.5));
  $('#zoomIn').addEventListener('click', () => { const r = map.svg.getBoundingClientRect(); zoomAt(1 / 1.5, r.left + r.width / 2, r.top + r.height / 2); });
  $('#zoomOut').addEventListener('click', () => { const r = map.svg.getBoundingClientRect(); zoomAt(1.5, r.left + r.width / 2, r.top + r.height / 2); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && draft) closeItem(); });
  window.addEventListener('resize', () => { if (map.built) applyViewBox(); });

  /* ---------- boot ---------- */
  q.value = state.query || '';
  $('#logo').innerHTML = I.cup;
  $('#searchIcon').innerHTML = I.search;
  $('#locate').innerHTML = I.locate;
  $('#zoomIn').innerHTML = I.plus;
  $('#zoomOut').innerHTML = I.minus;
  $$('.bk').forEach((b) => { b.outerHTML = I.back; });
  $$('.tab').forEach((t) => { t.innerHTML = I[t.dataset.icon] + '<span>' + t.textContent.trim() + '</span>'; });
  go(['map', 'shop', 'menu', 'cart', 'specials', 'orders'].includes(state.screen) ? state.screen : 'map');
})();
