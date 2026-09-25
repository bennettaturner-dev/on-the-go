/* On the Go — app logic. No build step, no framework.
   Map → tap a pin or search → Order → that shop's menu → Your Order → order status. */
(function () {
  'use strict';
  const D = window.OTG_DATA, C = D.catalog, M = window.OTG_MAP;
  const STORAGE_KEY = 'onthego.v4';

  /* ---------- helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + n.toFixed(2);
  const storeById = (id) => D.stores.find((s) => s.id === id);
  const uid = () => Math.random().toString(36).slice(2, 8);
  const priceAt = (store, id) => { const r = store.menu.find((m) => m[0] === id); return r ? r[1] : 0; };
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
  const miles = (s) => distMi(s).toFixed(1) + ' mi';
  const sorted = () => D.stores.slice().sort((a, b) => distMi(a) - distMi(b));

  function toMin(t) {
    const m = t.trim().match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (!m) return 0;
    return ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2] || 0);
  }
  function hoursLine(s) {
    const [a, b] = s.hours.split('–');
    const n = new Date().getHours() * 60 + new Date().getMinutes();
    return n >= toMin(a) && n < toMin(b)
      ? '<span class="open">Open</span> · Closes ' + b.trim()
      : '<span class="closed">Closed</span> · Opens ' + a.trim();
  }

  /* ---------- icons ---------- */
  const sv = (d, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const I = {
    cup: sv('<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16"/>', 2.2),
    map: sv('<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5Z"/><path d="M9 4v13M15 6.5v13"/>', 1.8),
    receipt: sv('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/>', 1.8),
    back: sv('<path d="M15 5l-7 7 7 7"/>', 2.4),
    close: sv('<path d="M7 7l10 10M17 7 7 17"/>', 2.6),
    plus: sv('<path d="M12 6v12M6 12h12"/>', 2.6),
    minus: sv('<path d="M6 12h12"/>', 2.6),
    locate: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3 3 10.5l7.4 2.1L12.5 20Z"/></svg>'
  };

  /* ---------- navigation ---------- */
  function go(screen) {
    state.screen = screen;
    $$('.screen').forEach((el) => el.classList.toggle('is-active', el.dataset.screen === screen));
    $('#tabbar').hidden = !(screen === 'map' || screen === 'orders');
    $$('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.go === screen));
    ({ map: renderMap, menu: renderMenu, cart: renderCart, orders: renderOrders })[screen]();
    save();
  }

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
    map.vb.y = D.me.y - map.vb.w * 0.42;

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
    map.vb.h = map.vb.w * (r.height / (r.width || 1));
    map.svg.setAttribute('viewBox', [map.vb.x, map.vb.y, map.vb.w, map.vb.h].join(' '));
    const k = map.vb.w / (r.width || 400);
    map.svg.style.setProperty('--k', k);
    map.svg.classList.toggle('is-far', map.vb.w > 1500);
    map.svg.classList.toggle('is-mid', map.vb.w > 900);
    $$('.pin', map.svg).forEach((p) => p.setAttribute('transform', 'translate(' + p.dataset.x + ' ' + p.dataset.y + ') scale(' + k * (p.classList.contains('is-selected') ? 1.25 : 1) + ')'));
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
    $('#pins').innerHTML = list.map((s) =>
      '<g class="pin' + (s.id === state.storeId ? ' is-selected' : '') + '" data-id="' + s.id + '" data-x="' + s.x + '" data-y="' + s.y + '">' +
      '<circle class="pin-dot" r="13" filter="url(#pinShadow)"/>' +
      '<path class="pin-cup" d="M-5.5 -3.5h8.5v3.8a4.2 4.2 0 0 1-4.2 4.2h-0.1a4.2 4.2 0 0 1-4.2-4.2Z M3 -2.3h1.3a1.9 1.9 0 0 1 0 3.8H3"/>' +
      '<text class="pin-name" y="27" text-anchor="middle">' + esc(s.name) + '</text></g>').join('');
    applyViewBox();
  }

  function renderMap() {
    buildMap();
    renderPins();
    const s = storeById(state.storeId);
    const sheet = $('#sheet'), body = $('#sheetBody');
    sheet.classList.toggle('is-tall', !!s);
    $('#qClear').hidden = !state.query;
    if (s) {
      const other = state.bag.length && state.orderStoreId !== s.id ? storeById(state.orderStoreId) : null;
      body.innerHTML = '<div class="store-card">' +
        '<div class="top"><div class="grow"><h2>' + esc(s.name) + '</h2><p class="meta">Coffee shop · ' + esc(s.address) + '</p></div>' +
        '<button class="circle" data-deselect aria-label="Close">' + I.close + '</button></div>' +
        '<div class="facts"><div>Hours<b>' + hoursLine(s) + '</b></div><div>Distance<b>' + miles(s) + '</b></div><div>Pickup<b>~' + s.wait + ' min</b></div></div>' +
        '<div class="actions"><button class="btn" data-order="' + s.id + '">Order</button>' +
        '<a class="btn btn--light" href="https://maps.apple.com/?daddr=' + s.lat + ',' + s.lng + '&q=' + encodeURIComponent(s.name) + '" target="_blank" rel="noopener">Directions</a></div>' +
        (other ? '<p class="note">You have an order started at ' + esc(other.name) + '. Ordering here will replace it.</p>' : '') +
        '</div>';
    } else {
      const list = matches();
      body.innerHTML = '<div class="sheet-title">' + (state.query ? list.length + ' result' + (list.length === 1 ? '' : 's') : 'Nearby') + '</div>' +
        (list.length ? list.map((st) => '<button class="row" data-select="' + st.id + '"><div class="grow"><div class="t">' + esc(st.name) + '</div><div class="s">' + hoursLine(st) + '</div></div><span class="end">' + miles(st) + '</span></button>').join('')
          : '<div class="row"><span class="muted">No coffee shops match “' + esc(state.query) + '”.</span></div>');
    }
  }

  function selectStore(id) {
    state.storeId = id;
    save();
    renderMap();
    const s = storeById(id);
    centerOn(s.x, s.y, 0.2);
  }

  function startOrder(id) {
    if (state.bag.length && state.orderStoreId !== id) state.bag = [];
    state.orderStoreId = id;
    menuCat = null;
    go('menu');
    $('#menuBody').scrollTop = 0;
  }

  /* ---------- menu ---------- */
  let menuCat = null;
  const bagCount = () => state.bag.reduce((n, l) => n + l.qty, 0);

  function renderMenu() {
    const s = storeById(state.orderStoreId);
    if (!s) return go('map');
    const cats = D.categories.filter((c) => s.menu.some((m) => C[m[0]].cat === c.id));
    if (!menuCat || !cats.find((c) => c.id === menuCat)) menuCat = cats[0].id;
    const inBag = (id) => state.bag.filter((l) => l.itemId === id).reduce((n, l) => n + l.qty, 0);
    $('#menuTitle').textContent = s.name;
    $('#menuBody').innerHTML =
      '<div class="store-strip"><h2>' + esc(s.name) + '</h2><p>Pickup · Ready in about ' + s.wait + ' min · ' + miles(s) + '</p></div>' +
      '<div class="cats">' + cats.map((c) => '<button class="cat' + (c.id === menuCat ? ' is-on' : '') + '" data-cat="' + c.id + '">' + c.name + '</button>').join('') + '</div>' +
      cats.map((c) => '<div class="menu-group" id="cat-' + c.id + '"><div class="section-title">' + c.name + '</div>' +
        s.menu.filter((m) => C[m[0]].cat === c.id).map((m) => {
          const n = inBag(m[0]);
          return '<button class="item" data-item="' + m[0] + '"><div class="n">' + esc(C[m[0]].name) + '</div><div class="d">' + esc(C[m[0]].desc) + '</div><div class="p">' + money(m[1]) + '</div>' +
            (n ? '<span class="qty">' + n + '</span>' : '') + '</button>';
        }).join('') + '</div>').join('') +
      '<p class="menu-foot">Prices may vary at the shop.</p>';
    const bar = $('#cartBar');
    bar.hidden = !state.bag.length;
    if (state.bag.length) bar.innerHTML = '<button class="btn btn--split" data-go="cart"><span>View Order (' + bagCount() + ')</span><span>' + money(totals().sub) + '</span></button>';
  }

  /* ---------- item sheet ---------- */
  let draft = null;
  function openItem(id) {
    const s = storeById(state.orderStoreId), def = C[id];
    draft = { itemId: id, storeId: s.id, base: priceAt(s, id), size: def.sized ? 'reg' : null, milk: def.milk ? 'whole' : null, shots: 0, syrups: [], warm: false, qty: 1 };
    renderItem();
    $('#itemModal').classList.add('is-open');
    $('#modalBody').scrollTop = 0;
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
    (l.syrups || []).forEach((x) => out.push(D.syrups.find((y) => y.id === x).name));
    if (l.warm) out.push('Warmed');
    return out.join(', ');
  }

  function renderItem() {
    const def = C[draft.itemId], s = storeById(draft.storeId);
    const radio = (on, attr, label, extra) => '<button class="choice' + (on ? ' is-on' : '') + '" ' + attr + ' role="radio" aria-checked="' + on + '"><span class="radio"></span>' + label + (extra ? '<span class="x">' + extra + '</span>' : '') + '</button>';
    const tick = (on, attr, label, extra) => '<button class="choice' + (on ? ' is-on' : '') + '" ' + attr + ' role="checkbox" aria-checked="' + on + '"><span class="radio tick"></span>' + label + (extra ? '<span class="x">' + extra + '</span>' : '') + '</button>';
    const head = (t, note) => '<div class="group-head"><h3>' + t + '</h3><span>' + note + '</span></div>';
    $('#modalBody').innerHTML =
      '<div class="item-head"><h2>' + esc(def.name) + '</h2><p class="p">' + money(draft.base) + ' · ' + def.cal + ' cal</p><p class="d">' + esc(def.desc) + '</p></div>' +
      (def.sized ? '<div class="gap"></div>' + head('Size', 'Required') + D.sizes.map((z) => radio(draft.size === z.id, 'data-size="' + z.id + '"', z.name + ' <span class="muted">&nbsp;' + z.oz + ' oz</span>', z.delta ? '+' + money(z.delta) : '')).join('') : '') +
      (def.milk ? '<div class="gap"></div>' + head('Milk', 'Required') + D.milks.map((k) => radio(draft.milk === k.id, 'data-milk="' + k.id + '"', k.name, k.delta ? '+' + money(k.delta) : '')).join('') : '') +
      (def.coffee || def.milk ? '<div class="gap"></div>' + head('Add-ins', 'Optional') +
        (def.coffee ? '<div class="choice">Extra shot<span class="x" style="margin-left:8px">+' + money(s.shot) + '</span><span class="stepper"><button class="circle" data-shots="-1" aria-label="Fewer shots"' + (draft.shots ? '' : ' disabled') + '>' + I.minus + '</button><b>' + draft.shots + '</b><button class="circle" data-shots="1" aria-label="More shots">' + I.plus + '</button></span></div>' : '') +
        D.syrups.map((y) => tick(draft.syrups.includes(y.id), 'data-syrup="' + y.id + '"', y.name + ' syrup', '+' + money(s.syrup))).join('') : '') +
      (def.warm ? '<div class="gap"></div>' + head('Preparation', 'Optional') + tick(draft.warm, 'data-warm', 'Warmed') : '') +
      '<div style="height:16px"></div>';
    $('#modalFoot').innerHTML = '<span class="stepper"><button class="circle" data-qty="-1" aria-label="Fewer"' + (draft.qty > 1 ? '' : ' disabled') + '>' + I.minus + '</button><b>' + draft.qty + '</b><button class="circle" data-qty="1" aria-label="More">' + I.plus + '</button></span>' +
      '<button class="btn btn--split" data-add><span>Add to Order</span><span>' + money(linePrice(draft) * draft.qty) + '</span></button>';
  }

  function addToBag() {
    const key = JSON.stringify([draft.itemId, draft.size, draft.milk, draft.shots, draft.syrups.slice().sort(), draft.warm]);
    const same = state.bag.find((l) => l.key === key);
    if (same) same.qty += draft.qty; else state.bag.push(Object.assign({ id: uid(), key }, draft));
    save();
    closeItem();
    renderMenu();
  }

  /* ---------- your order ---------- */
  function totals() {
    const sub = state.bag.reduce((t, l) => t + linePrice(l) * l.qty, 0);
    const tax = sub * D.taxRate;
    return { sub, tax, total: sub + tax };
  }

  function renderCart() {
    const s = storeById(state.orderStoreId);
    if (!s || !state.bag.length) {
      $('#cartBody').innerHTML = '<div class="empty"><h2>Your order is empty</h2><p>Add something from the menu.</p><button class="btn btn--sm" data-go="' + (s ? 'menu' : 'map') + '">' + (s ? 'Back to Menu' : 'Find a Shop') + '</button></div>';
      $('#placeBar').hidden = true;
      return;
    }
    if (!s.pickup.includes(state.pickupMode)) state.pickupMode = s.pickup[0];
    const t = totals();
    const radio = (on, attr, label, extra) => '<button class="choice' + (on ? ' is-on' : '') + '" ' + attr + ' role="radio" aria-checked="' + on + '"><span class="radio"></span>' + label + (extra ? '<span class="x">' + extra + '</span>' : '') + '</button>';
    const times = [[0, 'As soon as possible', '~' + s.wait + ' min'], [15, 'In 15 minutes', clock(Date.now() + 15 * 60000)], [30, 'In 30 minutes', clock(Date.now() + 30 * 60000)], [60, 'In 1 hour', clock(Date.now() + 60 * 60000)]];
    $('#cartBody').innerHTML =
      '<div class="section-title">Pickup</div>' +
      '<div class="row"><div class="grow"><div class="t">' + esc(s.name) + '</div><div class="s">' + esc(s.address) + '</div></div><button class="end" style="color:var(--blue)" data-change-store>Change</button></div>' +
      (s.pickup.length > 1 ? '<div class="gap"></div>' + radio(state.pickupMode === 'store', 'data-mode="store"', 'In store') + radio(state.pickupMode === 'curbside', 'data-mode="curbside"', 'Curbside') : '') +
      '<div class="gap"></div>' + times.map((x) => radio((state.pickupIn || 0) === x[0], 'data-time="' + x[0] + '"', x[1], x[2])).join('') +
      '<div class="gap"></div><div class="section-title">Items</div>' +
      state.bag.map((l) => '<div class="line"><div class="grow"><div class="n">' + esc(lineName(l)) + '</div>' + (lineMods(l) ? '<div class="m">' + esc(lineMods(l)) + '</div>' : '') +
        '<div class="edit"><span class="stepper" style="margin-left:0"><button class="circle" data-line="' + l.id + '" data-d="-1" aria-label="' + (l.qty > 1 ? 'One fewer' : 'Remove') + '">' + I.minus + '</button><b>' + l.qty + '</b><button class="circle" data-line="' + l.id + '" data-d="1" aria-label="One more">' + I.plus + '</button></span></div></div>' +
        '<div class="pr">' + money(linePrice(l) * l.qty) + '</div></div>').join('') +
      '<button class="row" data-go="menu"><span style="color:var(--blue)">Add more items</span></button>' +
      '<div class="gap"></div>' +
      '<div class="sum"><span>Subtotal</span><span>' + money(t.sub) + '</span><span>Tax</span><span>' + money(t.tax) + '</span><span class="tot">Total</span><span class="tot">' + money(t.total) + '</span></div>' +
      '<div class="gap"></div><div class="row"><div class="grow"><div class="t">Payment</div></div><span class="end">Visa •••• 4021</span></div>' +
      '<p class="fine">Demo only. Orders are not sent to the shop and no card is charged.</p>';
    $('#placeBar').hidden = false;
    $('#placeBar').innerHTML = '<button class="btn btn--split" data-place><span>Place Order</span><span>' + money(t.total) + '</span></button>';
  }

  function placeOrder() {
    const s = storeById(state.orderStoreId), t = totals();
    const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    state.orders.unshift({
      id: uid(), code: L[Math.floor(Math.random() * 24)] + Math.floor(100 + Math.random() * 900), storeId: s.id,
      mode: state.pickupMode, scheduledIn: state.pickupIn || 0, lines: state.bag.map((l) => Object.assign({}, l)), total: t.total, placedAt: Date.now()
    });
    state.bag = [];
    state.pickupIn = 0;
    go('orders');
    $('#ordersBody').scrollTop = 0;
  }

  /* ---------- orders ---------- */
  /* Demo pacing: received for 10 s, then preparing until the ready time. */
  function readyAt(o) { return o.placedAt + (o.scheduledIn ? o.scheduledIn * 60000 : 40000); }
  function stage(o) {
    const n = Date.now();
    if (o.done) return 3;
    if (n < o.placedAt + 10000) return 0;
    if (n < readyAt(o)) return 1;
    return 2;
  }
  let timer;
  function renderOrders() {
    clearInterval(timer);
    const active = state.orders.filter((o) => stage(o) < 3);
    const past = state.orders.filter((o) => stage(o) === 3);
    const titles = ['Order received', 'Preparing your order', 'Ready for pickup'];
    $('#ordersBody').innerHTML = '<div class="large-title">Orders</div>' +
      active.map((o) => {
        const st = stage(o), s = storeById(o.storeId);
        return '<div class="status"><div class="when">' + (st === 2 ? 'Ready since ' + clock(readyAt(o)) : 'Ready around ' + clock(readyAt(o))) + '</div>' +
          '<h2>' + titles[st] + '</h2><div class="where">' + esc(s.name) + ' · ' + (o.mode === 'curbside' ? 'Curbside' : 'In store') + '</div>' +
          '<div class="bars">' + [0, 1, 2].map((i) => '<i' + (i <= st ? ' class="on"' : '') + '></i>').join('') + '</div>' +
          '<div class="bar-labels"><span>Received</span><span>Preparing</span><span>Ready</span></div>' +
          '<div class="num">Order<b>' + o.code + '</b></div>' +
          '<div class="actions"><a class="btn btn--light btn--sm" href="https://maps.apple.com/?daddr=' + s.lat + ',' + s.lng + '&q=' + encodeURIComponent(s.name) + '" target="_blank" rel="noopener">Directions</a>' +
          '<button class="btn btn--sm" data-done="' + o.id + '">Picked Up</button></div></div>' +
          o.lines.map((l) => '<div class="line"><span class="q">' + l.qty + '×</span><div class="grow"><div class="n">' + esc(lineName(l)) + '</div>' + (lineMods(l) ? '<div class="m">' + esc(lineMods(l)) + '</div>' : '') + '</div><div class="pr">' + money(linePrice(l) * l.qty) + '</div></div>').join('') +
          '<div class="sum"><span class="tot">Total</span><span class="tot">' + money(o.total) + '</span></div><div class="gap"></div>';
      }).join('') +
      (past.length ? '<div class="section-title">Past Orders</div>' + past.slice(0, 15).map((o) =>
        '<div class="row"><div class="grow"><div class="t">' + esc(storeById(o.storeId).name) + '</div><div class="s">' + new Date(o.placedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + o.lines.map((l) => esc(lineName(l))).join(', ') + '</div></div>' +
        '<button class="btn btn--light btn--sm" data-reorder="' + o.id + '">Reorder</button></div>').join('') : '') +
      (!state.orders.length ? '<div class="empty"><h2>No orders yet</h2><p>Orders you place will show up here.</p><button class="btn btn--sm" data-go="map">Find a Shop</button></div>' : '');
    if (active.length) timer = setInterval(() => { if (state.screen === 'orders') renderOrders(); }, 2000);
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
    if (d.go) return go(d.go);
    if (d.back !== undefined) return go('map');
    if (d.select) return selectStore(d.select);
    if (d.deselect !== undefined) { state.storeId = null; save(); return renderMap(); }
    if (d.order) return startOrder(d.order);
    if (d.item) return openItem(d.item);
    if (d.cat) {
      menuCat = d.cat;
      $$('.cat').forEach((c) => c.classList.toggle('is-on', c.dataset.cat === d.cat));
      const g = $('#cat-' + d.cat), body = $('#menuBody');
      if (g) body.scrollTo({ top: g.offsetTop - 44, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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
    if (d.changeStore !== undefined) { state.storeId = state.orderStoreId; return go('map'); }
    if (d.place !== undefined) return placeOrder();
    if (d.done) { state.orders.find((o) => o.id === d.done).done = true; save(); return renderOrders(); }
    if (d.reorder) return reorder(d.reorder);
  });

  const q = $('#q');
  q.addEventListener('input', () => { state.query = q.value; state.storeId = null; renderMap(); });
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = matches()[0]; if (f) { q.blur(); selectStore(f.id); } } });
  $('#qClear').addEventListener('click', () => { q.value = ''; state.query = ''; renderMap(); q.focus(); });
  $('#locate').addEventListener('click', () => centerOn(D.me.x, D.me.y, 0.3));
  $('#itemModal').addEventListener('click', (e) => { if (e.target.classList.contains('modal-scrim')) closeItem(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && draft) closeItem(); });
  window.addEventListener('resize', () => { if (map.built) applyViewBox(); });

  /* ---------- boot ---------- */
  q.value = state.query || '';
  $('#logo').innerHTML = I.cup;
  $('#qClear').innerHTML = I.close;
  $('#locate').innerHTML = I.locate;
  $('#closeBtn').innerHTML = I.close;
  $$('[data-back], .nav .back').forEach((b) => { b.innerHTML = I.back; });
  $$('.tab').forEach((t) => { t.innerHTML = I[t.dataset.icon] + '<span>' + t.textContent.trim() + '</span>'; });
  go(['map', 'menu', 'cart', 'orders'].includes(state.screen) ? state.screen : 'map');
})();
