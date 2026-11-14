// Token Radar dashboard (model radar-2): a static page, no network.
// It reads window.RADAR from data.js, written by main.ts from the same board.json the
// gate checks. Hash routes: #board, #detail=<slug>, #live, #filter=<category>,
// #search=<text>. Every filter and sort below is a view of the same rows.
(function () {
  'use strict';
  var R = window.RADAR;
  var app = document.getElementById('app');
  var meta = document.getElementById('meta');
  if (!R || !Array.isArray(R.rows)) {
    app.innerHTML = '<div class="card"><h2>No radar data</h2><p class="sub">data.js did not load. This page only reads the data file beside it.</p></div>';
    return;
  }

  // ---- formatting -------------------------------------------------------
  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function moneyFull(n) {
    if (n === null || n === undefined) return '—';
    return '$' + n.toLocaleString('en-US');
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return '<span class="' + (n > 0 ? 'up' : n < 0 ? 'down' : '') + '">' + s + '</span>';
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ageText(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }
  function tierName(t) {
    return t === 'app' ? 'App ×1.10' : t === 'infra' ? 'Infra ×0.90' : 'Other ×1.00';
  }

  // ---- header meta ------------------------------------------------------
  meta.innerHTML =
    'Snapshot <b>' + esc(R.as_of) + '</b> · DefiLlama protocol list · ' +
    'Watchlist <b>' + R.watchlist_size + '</b> · Board <b>' + R.board_size + '</b> rows ' +
    '(<b>' + R.early_size + '</b> early) · Live tokens <b>' + R.live_size + '</b> · ' +
    'Floor <b>' + money(R.floor_usd) + '</b>';

  // ---- filter state -----------------------------------------------------
  var state = { q: '', category: '', chain: '', watchlistOnly: false, sort: 'value', view: 'board' };
  var categories = [];
  var chains = [];
  (function () {
    var c = {}, h = {};
    R.rows.forEach(function (r) {
      if (r.category) c[r.category] = 1;
      r.chains.forEach(function (ch) { h[ch] = 1; });
    });
    categories = Object.keys(c).sort();
    chains = Object.keys(h).sort();
  })();
  var watchlist = {};
  // The watchlist flag rides on each row from data.js: the toggle shows only rows
  // the house's list names.
  function isWatchlistRow(r) { return r.watchlist === true; }

  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '');
    state.view = 'board';
    if (h === 'live') { state.view = 'live'; return null; }
    var m = h.match(/^detail=([\w-]+)$/);
    if (m) { state.view = 'detail'; return m[1]; }
    m = h.match(/^filter=(.+)$/);
    if (m) { state.category = decodeURIComponent(m[1]); state.q = ''; return null; }
    m = h.match(/^search=(.+)$/);
    if (m) { state.q = decodeURIComponent(m[1]); return null; }
    return null;
  }

  function filteredRows() {
    var rows = R.rows.filter(function (r) {
      if (state.watchlistOnly && !isWatchlistRow(r)) return false;
      if (state.category && r.category !== state.category) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (state.q) {
        var q = state.q.toLowerCase();
        if (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
    var sorts = {
      value: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      growth: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
      age: function (a, b) { return (b.age_days || 0) - (a.age_days || 0); },
      name: function (a, b) { return a.name < b.name ? -1 : 1; },
    };
    return rows.slice().sort(sorts[state.sort] || sorts.value);
  }

  // ---- views ------------------------------------------------------------
  function optionList(list, current, allLabel) {
    var out = '<option value="">' + allLabel + '</option>';
    list.forEach(function (v) {
      out += '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(v) + '</option>';
    });
    return out;
  }

  function boardView() {
    var rows = filteredRows();
    var h = '';
    h += '<div class="tabs">' +
      '<button class="tab on" data-view="board">Board (' + R.board_size + ')</button>' +
      '<button class="tab" data-view="live">Live tokens (' + R.live_size + ')</button>' +
      '</div>';
    h += '<div class="card"><h2>Find the next launch</h2>' +
      '<p class="sub">Every row records no token. Implied value = TVL × 0.25 × growth × maturity × breadth × category. Click a row for its farm plan.</p>' +
      '<div class="controls">' +
      '<div class="field"><label for="q">Search</label><input id="q" type="search" placeholder="Name or slug…" value="' + esc(state.q) + '"></div>' +
      '<div class="field"><label for="cat">Category</label><select id="cat">' + optionList(categories, state.category, 'All categories') + '</select></div>' +
      '<div class="field"><label for="ch">Chain</label><select id="ch">' + optionList(chains, state.chain, 'All chains') + '</select></div>' +
      '<div class="field"><label for="sort">Sort by</label><select id="sort">' +
      '<option value="value"' + (state.sort === 'value' ? ' selected' : '') + '>Implied value</option>' +
      '<option value="tvl"' + (state.sort === 'tvl' ? ' selected' : '') + '>TVL</option>' +
      '<option value="growth"' + (state.sort === 'growth' ? ' selected' : '') + '>7-day growth</option>' +
      '<option value="age"' + (state.sort === 'age' ? ' selected' : '') + '>Age</option>' +
      '<option value="name"' + (state.sort === 'name' ? ' selected' : '') + '>Name</option>' +
      '</select></div>' +
      '<label class="check"><input id="wl" type="checkbox"' + (state.watchlistOnly ? ' checked' : '') + '> Watchlist only</label>' +
      '</div>' +
      '<p class="count">' + rows.length + ' of ' + R.board_size + ' rows shown · ranks are the model’s, the table sorts as you ask</p>' +
      '</div>';
    h += '<div class="card" style="padding:6px 12px"><table><thead><tr>' +
      '<th class="num">#</th><th>Protocol</th><th>Category</th><th>Chains</th>' +
      '<th class="num">TVL</th><th class="num">7d</th><th class="num hide-m">Age</th><th class="num">Implied value</th>' +
      '</tr></thead><tbody>';
    if (rows.length === 0) {
      h += '<tr><td colspan="8"><div class="empty">No protocol matches these filters.</div></td></tr>';
    }
    rows.forEach(function (r) {
      h += '<tr data-slug="' + esc(r.slug) + '">' +
        '<td class="num rank">' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span><br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td><span class="badge">' + esc(r.category || '—') + '</span></td>' +
        '<td>' + esc(r.chains.slice(0, 2).join(', ')) + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num hide-m">' + ageText(r.age_days) + '</td>' +
        '<td class="num val">' + money(r.implied_value_usd) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    h += '<div class="card"><h3>How the value is worked out</h3>' +
      '<p class="model-note">Implied value = <code>TVL × 0.25</code> × <code>growth</code> × <code>maturity</code> × <code>breadth</code> × <code>category</code>. ' +
      'Growth is <code>1 + clamp(7d change, −60%, +120%) × 0.5</code>. Maturity is <code>0.6 + min(age, 3y) / 3y × 0.4</code>. ' +
      'Breadth is <code>1 + 0.04 × extra chains (at most 4)</code>. Category is ×1.10 for user-facing apps, ×0.90 for ' +
      'infrastructure and wrapped products, ×1.00 otherwise — from the category’s words, never from a name. ' +
      'Every factor comes from the snapshot’s own figures. “Records no token” means the snapshot lists no market cap, ' +
      'no CoinGecko id and no symbol for it — not that it has none.</p></div>';
    return h;
  }

  function detailView(slug) {
    var r = null;
    R.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return '<div class="card"><h2>Not on the board</h2><p class="sub">No ranked protocol has that slug.</p><p><a class="back" href="#board">← Back to the board</a></p></div>';
    var base = Math.round(r.tvl_usd * R.model.base_multiple);
    var steps = r.farm_steps || [];
    var h = '<p><a class="back" href="#board">← Back to the board</a></p>';
    h += '<div class="card"><div class="detail-head"><div><h2>#' + r.rank + ' · ' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' · ' + esc(r.category || 'no category') + ' · on ' + esc(r.chains.join(', ') || 'no chain listed') + '</p></div>' +
      '<div class="big"><small>Implied value</small>' + money(r.implied_value_usd) + '</div></div>';
    h += '<div class="facts">' +
      '<div class="fact"><b>TVL</b><span>' + moneyFull(r.tvl_usd) + '</span></div>' +
      '<div class="fact"><b>7-day change</b><span>' + (r.change_7d === null ? '—' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</span></div>' +
      '<div class="fact"><b>Age</b><span>' + ageText(r.age_days) + (r.listed_at ? ' · since ' + esc(r.listed_at) : '') + '</span></div>' +
      '<div class="fact"><b>Token</b><span>None recorded</span></div>' +
      '<div class="fact"><b>Category tier</b><span>' + tierName(r.category_tier) + '</span></div>' +
      '</div>';
    h += '<h3>How the value is worked out</h3><table class="model-table"><tbody>' +
      '<tr><td>Base — TVL × 0.25</td><td class="num">' + money(base) + '</td></tr>' +
      '<tr><td>Growth — 7d change ' + (r.change_7d === null ? 'not reported' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</td><td class="num">×' + r.growth_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td>Maturity — ' + ageText(r.age_days) + ' with no token</td><td class="num">×' + r.maturity_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td>Breadth — ' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + '</td><td class="num">×' + r.breadth_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td>Category — ' + esc(r.category || 'no category') + ' (' + tierName(r.category_tier) + ')</td><td class="num">×' + r.category_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td><b>Implied value</b></td><td class="num val">' + money(r.implied_value_usd) + '</td></tr>' +
      '</tbody></table></div>';
    h += '<div class="card"><h3>Farm plan — six steps</h3>' +
      '<p class="sub">Concrete actions for this protocol, with what each costs and how long it takes. Amounts follow its TVL; the hold follows its age.</p><ol class="steps">';
    steps.forEach(function (s) {
      // Each step is "action Cost: X. Time: Y." — split the cost/time tail for display.
      var m = s.match(/^(.*?) Cost: (.*?)\. Time: (.*?)\.?$/);
      if (m) {
        h += '<li>' + esc(m[1]) + '<span class="cost"><b>Cost:</b> ' + esc(m[2]) + ' · <b>Time:</b> ' + esc(m[3]) + '</span></li>';
      } else {
        h += '<li>' + esc(s) + '</li>';
      }
    });
    h += '</ol></div>';
    return h;
  }

  function liveView() {
    var h = '';
    h += '<div class="tabs">' +
      '<button class="tab" data-view="board">Board (' + R.board_size + ')</button>' +
      '<button class="tab on" data-view="live">Live tokens (' + R.live_size + ')</button>' +
      '</div>';
    h += '<div class="card"><h2>Already trading — the market’s own values</h2>' +
      '<p class="sub">These protocols have a token, so they are not ranked for a launch. Their market caps are the market’s, not the model’s. They are here so the board’s implied values can be read against real ones.</p></div>';
    h += '<div class="card" style="padding:6px 12px"><table><thead><tr>' +
      '<th>Protocol</th><th>Category</th><th>Chains</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">7d</th>' +
      '</tr></thead><tbody>';
    R.live.forEach(function (r) {
      h += '<tr><td><span class="name">' + esc(r.name) + '</span><br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td><span class="badge">' + esc(r.category || '—') + '</span></td>' +
        '<td>' + esc(r.chains.slice(0, 2).join(', ')) + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num val">' + money(r.mcap_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    return h;
  }

  // ---- render + wiring --------------------------------------------------
  function render() {
    var slug = parseHash();
    app.setAttribute('aria-busy', 'false');
    if (state.view === 'detail') app.innerHTML = detailView(slug);
    else if (state.view === 'live') app.innerHTML = liveView();
    else app.innerHTML = boardView();
    wire();
  }

  function wire() {
    app.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        location.hash = b.getAttribute('data-view') === 'live' ? 'live' : 'board';
      });
    });
    app.querySelectorAll('tbody tr[data-slug]').forEach(function (tr) {
      tr.addEventListener('click', function () { location.hash = 'detail=' + tr.getAttribute('data-slug'); });
    });
    var q = document.getElementById('q');
    if (q) q.addEventListener('input', function () { state.q = q.value; refreshBoard(); });
    var cat = document.getElementById('cat');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; refreshBoard(); });
    var ch = document.getElementById('ch');
    if (ch) ch.addEventListener('change', function () { state.chain = ch.value; refreshBoard(); });
    var sort = document.getElementById('sort');
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; refreshBoard(); });
    var wl = document.getElementById('wl');
    if (wl) wl.addEventListener('change', function () { state.watchlistOnly = wl.checked; refreshBoard(); });
  }

  var refreshTimer = null;
  function refreshBoard() {
    // Re-render on a tick so typing in the search box stays smooth.
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      var scroll = window.scrollY;
      var active = document.activeElement && document.activeElement.id;
      app.innerHTML = boardView();
      wire();
      window.scrollTo(0, scroll);
      if (active) { var el = document.getElementById(active); if (el) { el.focus(); if (el.setSelectionRange) { try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} } } }
    }, 120);
  }

  window.addEventListener('hashchange', render);
  render();
})();
