/* Underground — app logic. No build step, no framework.
   Radar (dated events) → event sheet → save / calendar / directions. Weekly nights, saved list, scene guide. */
(function () {
  'use strict';
  const D = window.UG_DATA;
  const STORAGE_KEY = 'underground.v1';

  /* ---------- helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const dateOf = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const safeUrl = (u) => /^https?:\/\//i.test(u || '') ? u : '';

  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* in-memory only */ } }

  const state = Object.assign({
    screen: 'radar', when: 'all', genre: '', deep: true, query: '',
    home: 'Boca Raton', here: null, radius: 0, saved: []
  }, load());
  state.query = '';

  /* ---------- geography ---------- */
  const CITIES = {
    'Boca Raton': [26.3683, -80.1289], 'Delray Beach': [26.4615, -80.0728], 'West Palm Beach': [26.7153, -80.0534],
    'Lake Worth': [26.6168, -80.0684], 'Jupiter': [26.9342, -80.0942], 'Fort Lauderdale': [26.1224, -80.1373],
    'Oakland Park': [26.1723, -80.1320], 'Wilton Manors': [26.1604, -80.1389], 'Hollywood': [26.0112, -80.1495],
    'Dania Beach': [26.0523, -80.1439], 'Pembroke Pines': [26.0078, -80.2963], 'Broward County': [26.2400, -80.4300],
    'Miami': [25.7743, -80.1937], 'Miami Beach': [25.7907, -80.1300], 'North Miami': [25.8901, -80.1867],
    'Hialeah': [25.8576, -80.2781], 'Doral': [25.8195, -80.3553], 'Coral Gables': [25.7215, -80.2684],
    'Kendall': [25.6793, -80.3173], 'Homestead': [25.4687, -80.4776]
  };
  const HOMES = ['Boca Raton', 'West Palm Beach', 'Fort Lauderdale', 'Hollywood', 'Miami', 'Miami Beach'];
  const RADII = [[0, 'Any'], [15, '15 mi'], [30, '30 mi'], [60, '60 mi']];

  function miles(a, b) {
    const R = 3958.8, r = Math.PI / 180;
    const h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const origin = () => state.here || CITIES[state.home] || CITIES['Boca Raton'];
  const cityPos = (c) => CITIES[c] || CITIES[Object.keys(CITIES).find((k) => (c || '').includes(k))] || CITIES.Miami;
  const distOf = (e) => miles(origin(), cityPos(e.city));
  const distLabel = (e) => { const d = distOf(e); return d < 3 ? 'nearby' : Math.round(d) + ' mi'; };

  /* ---------- sound + depth ---------- */
  const GENRES = [
    ['techno', 'Techno', ['techno', 'schranz', 'minimal', 'acid', 'industrial', 'prhg']],
    ['house', 'House', ['house', 'playa tech']],
    ['bass', 'Bass', ['dubstep', 'bass', 'riddim', 'trap', 'midtempo', 'glitch', 'beats']],
    ['dnb', 'DnB / Jungle', ['drum and bass', 'dnb', 'jungle']],
    ['breaks', 'Breaks / Garage', ['breaks', 'garage', 'electro']],
    ['trance', 'Trance', ['trance']],
    ['dark', 'Dark / EBM', ['ebm', 'darkwave', 'coldwave', 'post-punk', 'goth', 'synthpop']],
    ['disco', 'Disco / Funk', ['disco', 'funk', 'french touch']],
    ['left', 'Leftfield', ['idm', 'experimental', 'leftfield', 'downtempo', 'live electronic', 'open jam', 'open decks', 'ambient', 'chillwave']]
  ];
  const inGenre = (e, key) => {
    const g = GENRES.find((x) => x[0] === key);
    return !g || e.tags.some((t) => g[2].some((k) => t.toLowerCase().includes(k)));
  };

  const UG_TAGS = ['techno', 'schranz', 'acid', 'minimal', 'ebm', 'darkwave', 'coldwave', 'industrial', 'jungle', 'drum and bass', 'dnb', 'breaks',
    'idm', 'experimental', 'leftfield', 'garage', 'bassline', 'midtempo', 'miami bass', 'live electronic', 'open decks', 'open jam', 'goth', 'post-punk', 'electro', 'prhg'];
  const MAIN_TAGS = ['big room', 'pop edm', 'edm', 'pop', 'hip-hop', 'country', 'electropop', 'r&b', 'latin'];
  const UG_VENUES = ['the ground', 'floyd', 'boombox', 'gramps', 'kill your idol', 'jolene', 'domicile', 'churchill', 'dale zine', 'little river studios',
    'tacos and tattoos', 'tenth level', 'kemistry', 'la otra', 'mad radio', 'basement', 'do not sit', 'foxhole', 'respectable street', 'the pickle', 'ebar13'];
  const MAIN_VENUES = ['e11even', 'liv', 'kaseya', 'hyde', 'daer', 'jungle island', 'hialeah park', 'war memorial', 'palm tree club', 'hard rock', 'story'];
  const hiddenVenue = (v) => /^(tba|tbd|secret|undisclosed)/i.test(v) || /^\d/.test(v) || /warehouse|studio|gallery|zine|collective/i.test(v);

  function prices(p) { return (String(p).match(/\$\s?(\d+(?:\.\d+)?)/g) || []).map((x) => parseFloat(x.replace(/[$\s]/g, ''))); }
  function endHour(t) {
    const m = String(t).match(/-\s*(\d+)(?::\d+)?\s*(am|pm)/i);
    if (!m) return null;
    return (Number(m[1]) % 12) + (m[2].toLowerCase() === 'pm' ? 12 : 0);
  }

  function depthOf(e) {
    if (e._depth) return e._depth;
    const tags = e.tags.map((t) => t.toLowerCase());
    const v = (e.venue || '').toLowerCase();
    const why = [];
    let s = 0;
    const ug = tags.filter((t) => UG_TAGS.some((k) => t.includes(k)) && !/big room|melodic/.test(t));
    if (ug.length) { s += ug.length > 1 ? 2 : 1; why.push('Heads-only sound: ' + ug.slice(0, 3).join(', ')); }
    const main = tags.filter((t) => MAIN_TAGS.some((k) => t.startsWith(k)));
    if (main.length) { s -= Math.min(2, main.length); why.push('Commercial sound: ' + main.slice(0, 2).join(', ')); }
    if (hiddenVenue(e.venue || '')) { s += 1; why.push('Off-grid or undisclosed location'); }
    if (UG_VENUES.some((k) => v.includes(k))) { s += 1; why.push('Known underground room'); }
    if (MAIN_VENUES.some((k) => v.startsWith(k))) { s -= 2; why.push('Mega-club or arena'); }
    const ps = prices(e.price);
    if (ps.length ? Math.max(...ps) <= 15 : /free/i.test(e.price)) { s += 1; why.push('Cheap or free door'); }
    else if (ps.length && Math.min(...ps) >= 50) { s -= 1; why.push('Premium ticket'); }
    const end = endHour(e.time);
    if (end !== null && end >= 4 && end <= 8) { s += 1; why.push('Runs till ' + end + 'am'); }
    e._depth = { level: s >= 3 ? 3 : s >= 2 ? 2 : s >= 1 ? 1 : 0, why };
    return e._depth;
  }
  const meter = (lvl) => '<span class="meter" aria-label="Underground level ' + lvl + ' of 3">' + [1, 2, 3].map((i) => '<i class="' + (i <= lvl ? 'on' : '') + '"></i>').join('') + '</span>';

  /* ---------- icons ---------- */
  const sv = (d, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const I = {
    radar: sv('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18 6"/><circle cx="12" cy="12" r="1" fill="currentColor"/>', 1.8),
    repeat: sv('<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>', 1.8),
    bookmark: sv('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>', 1.8),
    bookmarkFill: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    users: sv('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>', 1.8),
    search: sv('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 2.2),
    x: sv('<path d="M18 6 6 18M6 6l12 12"/>', 3),
    pin: sv('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    clock: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    ticket: sv('<path d="M3 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M13 4v2M13 11v2M13 18v2"/>'),
    id: sv('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2"/><path d="M14 10h4M14 14h3"/>'),
    crew: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    cal: sv('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    nav: sv('<path d="M3 11 22 2l-9 19-2-8z"/>'),
    share: sv('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4M12 2v13"/>'),
    ext: sv('<path d="M7 17 17 7M8 7h9v9"/>'),
    sliders: sv('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
    locate: sv('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
    check: sv('<path d="m5 12 5 5L20 7"/>', 2.6)
  };
  $$('[data-icon]').forEach((el) => { el.insertAdjacentHTML('afterbegin', I[el.dataset.icon] || ''); });
  $('#qClear').innerHTML = I.x;

  /* ---------- data ---------- */
  const today = () => isoOf(new Date());
  const keyOf = (e) => e.date + '|' + e.title + '|' + e.venue;
  D.events.forEach((e) => { e.key = keyOf(e); });
  const upcoming = () => D.events.filter((e) => e.date >= today());
  const byKey = (k) => D.events.find((e) => e.key === k);

  function weekendRange() {
    const t = new Date(), dow = t.getDay(); /* 0 Sun … 5 Fri 6 Sat */
    if (dow === 0) return [isoOf(t), isoOf(t)];
    if (dow >= 5) return [isoOf(t), isoOf(addDays(t, 7 - dow))];
    const fri = addDays(t, 5 - dow);
    return [isoOf(fri), isoOf(addDays(fri, 2))];
  }
  function matchesWhen(e) {
    const t = today();
    if (state.when === 'tonight') return e.date === t;
    if (state.when === 'weekend') { const [a, b] = weekendRange(); return e.date >= a && e.date <= b && e.date >= t; }
    if (state.when === 'week') return e.date <= isoOf(addDays(new Date(), 6));
    return true;
  }
  function matchesQuery(e, q) {
    if (!q) return true;
    const hay = [e.title, e.venue, e.city, e.crew, e.tags.join(' '), e.when || ''].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  }
  const inRange = (e) => !state.radius || distOf(e) <= state.radius;

  function results() {
    return upcoming().filter((e) => matchesWhen(e) && inRange(e) && (!state.genre || inGenre(e, state.genre))
      && matchesQuery(e, state.query) && (!state.deep || depthOf(e).level >= 2));
  }

  /* ---------- formatting ---------- */
  function dayLabel(iso) {
    const t = today(), tm = isoOf(addDays(new Date(), 1));
    if (iso === t) return 'Tonight';
    if (iso === tm) return 'Tomorrow';
    return dateOf(iso).toLocaleDateString([], { weekday: 'long' });
  }
  const shortDate = (iso) => dateOf(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const longDate = (iso) => dateOf(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtTime = (t) => (t || 'Time TBA').replace(/-/g, '–');
  const where = (e) => (e.venue || 'Location TBA') + (e.city ? ' · ' + e.city : '');
  const isSaved = (k) => state.saved.includes(k);

  function card(e) {
    const dp = depthOf(e);
    const tags = e.tags.slice(0, 4).map((t) => '<span class="tag' + (UG_TAGS.some((k) => t.toLowerCase().includes(k)) ? ' hot' : '') + '">' + esc(t) + '</span>').join('');
    return '<button class="card' + (dp.level === 3 ? ' deep' : '') + '" data-open="' + esc(e.key) + '">'
      + '<span class="time">' + esc(fmtTime(e.time)) + '</span>'
      + '<h4>' + esc(e.title) + '</h4>'
      + '<span class="where">' + esc(where(e)) + '</span>'
      + '<span class="side">' + meter(dp.level) + '<span class="price">' + esc(e.price ? e.price.split('/').pop().trim() : '') + '</span><span class="dist">' + esc(distLabel(e)) + '</span></span>'
      + (tags ? '<span class="tags">' + tags + '</span>' : '')
      + (isSaved(e.key) ? '<span class="saved-dot">' + I.bookmarkFill + '</span>' : '')
      + '</button>';
  }

  /* ---------- radar ---------- */
  const WHEN = [['tonight', 'Tonight'], ['weekend', 'Weekend'], ['week', '7 days'], ['all', 'All']];
  let limit = 40;

  function renderChips() {
    $('#whenChips').innerHTML = '<button class="chip depth' + (state.deep ? ' is-on' : '') + '" data-deep aria-pressed="' + state.deep + '">' + meter(state.deep ? 2 : 0) + 'Underground</button>'
      + WHEN.map(([k, l]) => '<button class="chip' + (state.when === k ? ' is-on' : '') + '" data-when="' + k + '" aria-pressed="' + (state.when === k) + '">' + l + '</button>').join('');
    $('#genreChips').innerHTML = '<button class="chip' + (!state.genre ? ' is-on' : '') + '" data-genre="">All sounds</button>'
      + GENRES.map(([k, l]) => '<button class="chip' + (state.genre === k ? ' is-on' : '') + '" data-genre="' + k + '">' + l + '</button>').join('');
    $('#locBtn').innerHTML = I.pin + esc(state.here ? 'Near you' : state.home) + (state.radius ? ' · ' + state.radius + ' mi' : '');
  }

  function banner() {
    const age = Math.floor((new Date() - dateOf(D.updated)) / 864e5);
    const stale = age > 7;
    return '<div class="banner' + (stale ? ' stale' : '') + '"><b>●</b><span>' + (stale ? 'Listings are ' + age + ' days old — check crews for changes' : 'Listings updated ' + esc(shortDate(D.updated)))
      + ' · South Florida</span></div>';
  }

  function renderFeed() {
    const list = results();
    let html = banner();
    if (!list.length) {
      const loose = state.deep && upcoming().some((e) => matchesWhen(e) && inRange(e) && (!state.genre || inGenre(e, state.genre)) && matchesQuery(e, state.query));
      html += '<div class="empty"><b>Nothing on the radar</b>' + (loose ? 'Only above-ground events match. Turn off <em>Underground</em> to see them.' : 'Try a wider radius, another night, or all sounds.') + '</div>';
      $('#feed').innerHTML = html;
      return;
    }
    let last = '';
    list.slice(0, limit).forEach((e) => {
      if (e.date !== last) {
        last = e.date;
        html += '<div class="day"><h3>' + esc(dayLabel(e.date)) + '</h3><span>' + esc(shortDate(e.date)) + ' · ' + list.filter((x) => x.date === e.date).length + '</span></div>';
      }
      html += card(e);
    });
    if (list.length > limit) html += '<button class="more" data-more>Show ' + Math.min(40, list.length - limit) + ' more of ' + (list.length - limit) + '</button>';
    $('#feed').innerHTML = html;
  }

  /* ---------- weekly ---------- */
  const DOW = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  function nextOccurrence(r) {
    const m = r.when.match(/(\d)(?:st|nd|rd|th)\s+(\w+)/i);
    const dayName = (m ? m[2] : r.when).replace(/s$/i, '') + 's';
    const dow = DOW.findIndex((d) => d.toLowerCase() === dayName.toLowerCase());
    if (dow < 0) return null;
    for (let i = 0; i < 70; i++) {
      const d = addDays(new Date(), i);
      if (d.getDay() !== dow) continue;
      if (m && Math.ceil(d.getDate() / 7) !== Number(m[1])) continue;
      return d;
    }
    return null;
  }
  D.recurring.forEach((r, i) => {
    const n = nextOccurrence(r);
    r.key = 'weekly|' + i; r.date = n ? isoOf(n) : today(); r.crew = r.crew || ''; r.weekly = true;
  });

  function renderWeekly() {
    const rows = D.recurring.filter(inRange).slice().sort((a, b) => a.date.localeCompare(b.date));
    $('#weekly').innerHTML = rows.length ? rows.map((r) => {
      const dp = depthOf(r);
      return '<button class="card' + (dp.level === 3 ? ' deep' : '') + '" data-open="' + esc(r.key) + '">'
        + '<span class="time">' + esc(r.when.toUpperCase()) + ' · ' + esc(fmtTime(r.time)) + '</span>'
        + '<h4>' + esc(r.title) + '</h4><span class="where">' + esc(where(r)) + ' · next ' + esc(dayLabel(r.date) === 'Tonight' ? 'tonight' : shortDate(r.date)) + '</span>'
        + '<span class="side">' + meter(dp.level) + '<span class="price">' + esc(r.price) + '</span><span class="dist">' + esc(distLabel(r)) + '</span></span>'
        + '<span class="tags">' + r.tags.slice(0, 4).map((t) => '<span class="tag">' + esc(t) + '</span>').join('') + '</span></button>';
    }).join('') : '<div class="empty"><b>No weekly nights in range</b>Widen your radius.</div>';
  }

  /* ---------- saved ---------- */
  function renderSaved() {
    const list = state.saved.map(byKey).filter((e) => e && e.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
    const html = list.length ? list.map((e) => '<div class="day"><h3>' + esc(dayLabel(e.date)) + '</h3><span>' + esc(shortDate(e.date)) + '</span></div>' + card(e)).join('')
      : '<div class="empty"><b>Nothing saved</b>Tap an event and hit Save to build your lineup.</div>';
    $('#saved').innerHTML = html;
    const n = list.length, tab = $('.tab[data-go="saved"]');
    const b = $('.badge', tab);
    if (b) b.remove();
    if (n) tab.insertAdjacentHTML('beforeend', '<span class="badge">' + n + '</span>');
  }

  /* ---------- scene ---------- */
  const SOURCES = [
    ['19hz — Miami / South Florida', 'Hand-curated underground calendar. This app’s source.', D.source],
    ['Resident Advisor — Miami', 'Techno and house listings, promoter pages', 'https://ra.co/events/us/miami'],
    ['Shotgun', 'Where many Miami crews sell tickets and drop locations', 'https://shotgun.live/en/cities/miami'],
    ['DICE', 'Club Space, Floyd, Jolene, Kemistry', 'https://dice.fm/browse/miami'],
    ['Posh', 'RSVP lists for smaller parties', 'https://posh.vip/explore'],
    ['Edmtrain — Miami', 'Bigger shows and festivals', 'https://edmtrain.com/miami-fl'],
    ['r/aves', 'Ask locals, find rave buddies', 'https://www.reddit.com/r/aves/']
  ];
  const TIPS = [
    ['Go to the regular ones first', 'The top answer on r/aves: <q>go to regular ones and make friends.</q> The people you meet at Floyd or The Ground are the ones who get the warehouse texts.'],
    ['Word of mouth runs it', 'The best ones never hit a listing. Talk to the DJs and door staff, and ask what’s next.'],
    ['Follow the crews, not the venues', 'Underground crews post on Instagram, Shotgun and Posh. Locations often drop the day of, only to ticket holders or the RSVP list.'],
    ['Be a regular somewhere', 'Weekly nights (see Weekly) are where scenes form. Show up three times and you’re in.']
  ];
  const SAFETY = [
    ['Never go solo', 'Bring a buddy, agree on a meeting spot, and share your live location.'],
    ['Screenshot the address', 'Warehouse spots have bad signal. Save the location and a ride home before you go.'],
    ['Water and air', 'South Florida heat plus packed rooms dehydrates you fast. Sip water steadily and take breaks outside.'],
    ['Test, don’t guess', 'DanceSafe sells fentanyl strips and reagent kits and runs harm-reduction booths.', 'https://dancesafe.org'],
    ['Know the exits', 'Unofficial venues can lack fire exits. Find two ways out when you arrive.']
  ];
  let showAllCrews = false;

  function renderScene() {
    const crews = D.crews.filter((c) => !/ IG$|Shotgun ?Live$/i.test(c.name));
    const shown = showAllCrews ? crews : crews.slice(0, 36);
    $('#scene').innerHTML =
      '<div class="block"><h3>How to get in</h3>' + TIPS.map(([t, p]) => '<div class="tip"><b>' + esc(t) + '</b><p>' + p + '</p></div>').join('') + '</div>'
      + '<div class="block"><h3>Local crews · ' + crews.length + '</h3><div class="crews">'
      + shown.map((c) => safeUrl(c.url) ? '<a class="chip" href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.name) + '</a>' : '').join('')
      + (crews.length > shown.length ? '<button class="chip is-on" data-crews>+' + (crews.length - shown.length) + ' more</button>' : '') + '</div></div>'
      + '<div class="block"><h3>Where listings come from</h3><div class="list">'
      + SOURCES.map(([t, s, u]) => '<a class="row" href="' + esc(u) + '" target="_blank" rel="noopener"><span class="t"><b>' + esc(t) + '</b><small>' + esc(s) + '</small></span><span class="go">' + I.ext + '</span></a>').join('')
      + '</div></div>'
      + '<div class="block"><h3>Stay safe</h3>' + SAFETY.map(([t, p, u]) => '<div class="tip"><b>' + esc(t) + '</b><p>' + esc(p) + (u ? ' <a href="' + esc(u) + '" target="_blank" rel="noopener">dancesafe.org</a>' : '') + '</p></div>').join('') + '</div>';
  }

  /* ---------- event sheet ---------- */
  const findAny = (k) => byKey(k) || D.recurring.find((r) => r.key === k);

  function openEvent(k) {
    const e = findAny(k);
    if (!e) return;
    const dp = depthOf(e);
    const url = safeUrl(e.url);
    const tba = /^(tba|tbd|secret|undisclosed)/i.test(e.venue || '') || !e.venue;
    const saved = isSaved(e.key);
    $('#modalBody').innerHTML =
      '<div class="d-when">' + esc(e.weekly ? e.when.toUpperCase() + ' · next ' + longDate(e.date) : longDate(e.date)) + '</div>'
      + '<h2 class="d-title">' + esc(e.title) + '</h2>'
      + '<div class="tags">' + e.tags.map((t) => '<span class="tag' + (UG_TAGS.some((x) => t.toLowerCase().includes(x)) ? ' hot' : '') + '">' + esc(t) + '</span>').join(' ') + '</div>'
      + '<dl class="d-grid">'
      + '<dt>' + I.clock + '</dt><dd>' + esc(fmtTime(e.time)) + '</dd>'
      + '<dt>' + I.pin + '</dt><dd>' + esc(e.venue || 'Location TBA') + '<small>' + esc((D.venues[e.venue] || {}).address || e.city || '') + ' · ' + esc(distLabel(e)) + ' from ' + esc(state.here ? 'you' : state.home) + '</small></dd>'
      + (e.price ? '<dt>' + I.ticket + '</dt><dd>' + esc(e.price) + '</dd>' : '')
      + (e.age ? '<dt>' + I.id + '</dt><dd>' + esc(e.age) + '</dd>' : '')
      + (e.crew ? '<dt>' + I.crew + '</dt><dd>' + esc(e.crew) + '</dd>' : '')
      + '</dl>'
      + (tba ? '<div class="drop">Secret location. The address drops close to the date, usually to ticket holders or the RSVP list.</div>' : '')
      + '<div class="depth-note">' + meter(dp.level) + '<span>' + esc(['Above ground', 'Semi-underground', 'Underground', 'Deep underground'][dp.level]) + (dp.why.length ? ' — ' + esc(dp.why.join('; ')) : '') + '</span></div>'
      + '<div class="actions">'
      + (url ? '<a class="btn primary" href="' + esc(url) + '" target="_blank" rel="noopener">' + I.ticket + (e.weekly ? 'Crew page' : 'Tickets & info') + '</a>' : '')
      + (e.weekly ? '' : '<button class="btn' + (saved ? ' is-on' : '') + '" data-save="' + esc(e.key) + '">' + (saved ? I.bookmarkFill + 'Saved' : I.bookmark + 'Save') + '</button>')
      + '<button class="btn" data-ics="' + esc(e.key) + '">' + I.cal + 'Calendar</button>'
      + (tba ? '' : '<a class="btn" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(((D.venues[e.venue] || {}).address || e.venue + ', ' + e.city) + ', FL') + '" target="_blank" rel="noopener">' + I.nav + 'Directions</a>')
      + '<button class="btn" data-share="' + esc(e.key) + '">' + I.share + 'Share</button>'
      + '</div>';
    openModal();
  }

  function openModal() { $('#modal').classList.add('is-open'); $('.panel-body').scrollTop = 0; }
  function closeModal() { $('#modal').classList.remove('is-open'); }

  /* ---------- location sheet ---------- */
  function openLocation() {
    $('#modalBody').innerHTML = '<h2 class="sheet-h">Where are you?</h2><p class="sub">Distances and radius are measured from here.</p>'
      + '<button class="opt' + (state.here ? ' is-on' : '') + '" data-here>' + '<span>Use my location</span>' + (state.here ? I.check : I.locate) + '</button>'
      + HOMES.map((h) => '<button class="opt' + (!state.here && state.home === h ? ' is-on' : '') + '" data-home="' + esc(h) + '"><span>' + esc(h) + '</span>'
        + '<small>' + upcoming().filter((e) => miles(CITIES[h], cityPos(e.city)) <= 30).length + ' within 30 mi</small></button>').join('')
      + '<h3 class="block" style="margin:18px 0 0;font-size:13px;font-family:var(--mono);color:var(--text-3);letter-spacing:.12em">RADIUS</h3>'
      + '<div class="seg">' + RADII.map(([r, l]) => '<button class="chip' + (state.radius === r ? ' is-on' : '') + '" data-radius="' + r + '">' + l + '</button>').join('') + '</div>';
    openModal();
  }

  /* ---------- calendar + share ---------- */
  function parseStart(t) {
    const m = String(t).match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
    if (!m) return [21, 0];
    return [(Number(m[1]) % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0), Number(m[2] || 0)];
  }
  function parseEnd(t) {
    const m = String(t).match(/-\s*(\d+)(?::(\d+))?\s*(am|pm)/i);
    return m ? [(Number(m[1]) % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0), Number(m[2] || 0)] : null;
  }
  const icsStamp = (d) => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  const icsText = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');

  function downloadIcs(e) {
    const [sh, sm] = parseStart(e.time);
    const start = dateOf(e.date); start.setHours(sh, sm);
    const eh = parseEnd(e.time);
    let end = new Date(start.getTime() + 5 * 36e5);
    if (eh) { end = dateOf(e.date); end.setHours(eh[0], eh[1]); if (end <= start) end = new Date(end.getTime() + 864e5); }
    let rrule = '';
    if (e.weekly) {
      const m = e.when.match(/(\d)(?:st|nd|rd|th)/);
      const by = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][start.getDay()];
      rrule = m ? 'RRULE:FREQ=MONTHLY;BYDAY=' + m[1] + by : 'RRULE:FREQ=WEEKLY;BYDAY=' + by;
    }
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Underground//EN', 'BEGIN:VEVENT',
      'UID:' + icsText(e.key).replace(/\W/g, '') + '@underground', 'DTSTAMP:' + icsStamp(new Date()),
      'DTSTART:' + icsStamp(start), 'DTEND:' + icsStamp(end), rrule,
      'SUMMARY:' + icsText(e.title), 'LOCATION:' + icsText(where(e)),
      'DESCRIPTION:' + icsText([e.price, e.age, e.url].filter(Boolean).join(' · ')),
      'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = e.title.replace(/[^\w]+/g, '-').slice(0, 40) + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Calendar file downloaded');
  }

  function share(e) {
    const text = e.title + ' — ' + (e.weekly ? e.when : longDate(e.date)) + ', ' + fmtTime(e.time) + ' @ ' + where(e);
    const url = safeUrl(e.url);
    if (navigator.share) { navigator.share({ title: e.title, text, url: url || undefined }).catch(() => {}); return; }
    const full = text + (url ? '\n' + url : '');
    if (navigator.clipboard) navigator.clipboard.writeText(full).then(() => toast('Copied to clipboard'), () => toast('Copy failed'));
    else toast('Sharing not supported');
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------- navigation ---------- */
  function go(screen) {
    state.screen = screen;
    $$('.screen').forEach((s) => s.classList.toggle('is-active', s.dataset.screen === screen));
    $$('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.go === screen));
    render();
    save();
  }

  function render() {
    renderChips();
    if (state.screen === 'radar') renderFeed();
    if (state.screen === 'weekly') renderWeekly();
    if (state.screen === 'scene') renderScene();
    renderSaved();
  }
  function refresh() { limit = 40; $('#feed').scrollTop = 0; render(); save(); }

  /* ---------- events ---------- */
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('button, a');
    if (!t) { if (ev.target.closest('[data-close]')) closeModal(); return; }
    const d = t.dataset;
    if (d.go) return go(d.go);
    if (d.open) return openEvent(d.open);
    if (d.when) { state.when = d.when; return refresh(); }
    if ('deep' in d) { state.deep = !state.deep; return refresh(); }
    if ('genre' in d) { state.genre = d.genre; return refresh(); }
    if ('more' in d) { limit += 40; return renderFeed(); }
    if ('crews' in d) { showAllCrews = true; return renderScene(); }
    if (t.id === 'locBtn') return openLocation();
    if (t.id === 'qClear') { $('#q').value = ''; state.query = ''; t.hidden = true; return refresh(); }
    if (d.home) { state.home = d.home; state.here = null; closeModal(); return refresh(); }
    if (d.radius !== undefined) { state.radius = Number(d.radius); refresh(); return openLocation(); }
    if ('here' in d) return locate();
    if (d.save) {
      const k = d.save;
      state.saved = isSaved(k) ? state.saved.filter((x) => x !== k) : state.saved.concat(k);
      toast(isSaved(k) ? 'Saved to your lineup' : 'Removed');
      save(); render(); return openEvent(k);
    }
    if (d.ics) { const e = findAny(d.ics); if (e) downloadIcs(e); return; }
    if (d.share) { const e = findAny(d.share); if (e) share(e); return; }
  });

  function locate() {
    if (!navigator.geolocation) return toast('Location not available');
    toast('Finding you…');
    navigator.geolocation.getCurrentPosition((p) => {
      state.here = [p.coords.latitude, p.coords.longitude];
      closeModal(); refresh(); toast('Using your location');
    }, () => toast('Location permission denied'), { timeout: 10000, maximumAge: 6e5 });
  }

  let qTimer;
  $('#q').addEventListener('input', (ev) => {
    $('#qClear').hidden = !ev.target.value;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.query = ev.target.value.trim(); limit = 40; renderFeed(); }, 120);
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });

  go(state.screen || 'radar');
})();
