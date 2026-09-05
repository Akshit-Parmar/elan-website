/* ============================================================================
   Élan — NOTE नीति trading floor
   Live market with price history, volatility, liquidity, per-holding profit
   and loss, a market ticker and trade history.
   Trades execute through the nn_trade() database function, so a team can never
   overspend or oversell even if both partners act at the same moment.
   ========================================================================== */
(function () {
  "use strict";

  var NOTE = "NOTE \u0928\u0940\u0924\u093F";
  var sb = null, P = null;
  var COS = [], HOLD = {}, HIST = {}, TRADES = [], CASH = 0, OPEN = false, board = [];
  var busy = false, ran = false, pending = null, lastHist = 0, rendering = false;

  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function money(n) { return Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
  function el(id) { return document.getElementById(id); }

  function start(p) {
    if (ran || !p || p.centsible_theme !== NOTE) return;
    ran = true; sb = window.__elanSb; P = p; mount();
  }
  document.addEventListener("elan:participant", function (e) { start(e.detail || {}); });
  var tries = 0, poll = setInterval(function () {
    if (window.__elanParticipant && window.__elanSb) { clearInterval(poll); start(window.__elanParticipant); }
    else if (++tries > 40) clearInterval(poll);
  }, 250);

  function mount() {
    var host = el("centWorkspace");
    if (!host) {
      host = document.createElement("div");
      host.id = "centWorkspace"; host.className = "ep-flag-strip";
      var a = document.querySelector(".ep-flag-strip") || document.querySelector(".page-hero");
      if (a) a.insertAdjacentElement("afterend", host);
      else (el("ep-main") || document.body).appendChild(host);
    }
    host.innerHTML =
      '<div class="nn-ticker" id="nnTicker"><div class="nn-ticker-track" id="nnTickerTrack"></div></div>' +
      '<article class="white-card ws"><span class="section-label">Trading floor</span>' +
      '<h2 class="ws-h">NOTE \u0928\u0940\u0924\u093F</h2>' +
      '<div id="nnBody"><p class="ws-note">Loading the market\u2026</p></div></article>';
    refresh();
    setInterval(refresh, 15000);
    subscribe();
  }

  /* ---------- data ---------- */
  async function refresh() {
    if (pending || busy) return;                 // never redraw mid-decision
    if (document.hidden) return;                 // pause when the tab is not visible
    if (!P.team_id) { renderNoTeam(); return; }

    var st = await sb.from("nn_state").select("*").eq("id", 1).maybeSingle();
    OPEN = !!(st.data && st.data.is_open);

    var c = await sb.from("nn_companies").select("*").eq("is_active", true).order("sort_order");
    COS = c.error ? [] : (c.data || []);

    var a = await sb.from("nn_accounts").select("*").eq("team_id", P.team_id).maybeSingle();
    CASH = a.data ? Number(a.data.cash) : 1000000;

    var h = await sb.from("nn_holdings").select("*").eq("team_id", P.team_id);
    HOLD = {}; (h.error ? [] : (h.data || [])).forEach(function (x) { HOLD[x.company_id] = x.qty; });

    // Price history is only needed for sparklines and volatility, so refresh it
    // at most every 20 seconds rather than on every poll.
    var now = Date.now();
    if (!lastHist || now - lastHist > 20000) {
      lastHist = now;
      var pr = await sb.from("nn_prices").select("company_id,price")
                       .order("changed_at", { ascending: true }).limit(1200);
      HIST = {};
      (pr.error ? [] : (pr.data || [])).forEach(function (r) {
        (HIST[r.company_id] = HIST[r.company_id] || []).push(Number(r.price));
      });
    }

    var t = await sb.from("nn_trades").select("*").eq("team_id", P.team_id)
                    .order("traded_at", { ascending: false }).limit(60);
    TRADES = t.error ? [] : (t.data || []);

    var b = await sb.from("nn_leaderboard").select("*").order("net_worth", { ascending: false });
    board = b.error ? [] : (b.data || []);

    render();
  }

  function renderNoTeam() {
    el("nnBody").innerHTML = '<p class="ws-note">You registered with a partner. Once the \u00c9lan team links your ' +
      "pair, your trading account opens here with your starting balance of 10,00,000 \u00a2.</p>";
    var tk = el("nnTicker"); if (tk) tk.style.display = "none";
  }

  /* ---------- market maths ---------- */
  var VOLC = {};
  function vol(id) {
    if (VOLC[id] != null) return VOLC[id];
    var h = HIST[id] || [];
    if (h.length < 3) return (VOLC[id] = 0);
    var r = [], i;
    for (i = 1; i < h.length; i++) if (h[i - 1]) r.push((h[i] - h[i - 1]) / h[i - 1] * 100);
    if (!r.length) return 0;
    var m = r.reduce(function (a, b) { return a + b; }, 0) / r.length;
    var v = r.reduce(function (a, b) { return a + Math.pow(b - m, 2); }, 0) / r.length;
    return (VOLC[id] = Math.sqrt(v));
  }
  function volBand(v) { return v >= 4 ? ["High", "hi"] : v >= 1.8 ? ["Medium", "md"] : ["Low", "lo"]; }

  var AVG = null;                       // rebuilt once per render, not per row
  function buildAvg() {
    AVG = {};
    var acc = {};
    TRADES.slice().reverse().forEach(function (t) {
      var a = acc[t.company_id] = acc[t.company_id] || { qty: 0, cost: 0 };
      if (t.side === "buy") { a.cost += Number(t.total); a.qty += t.qty; }
      else { var unit = a.qty ? a.cost / a.qty : 0; a.cost -= unit * t.qty; a.qty -= t.qty; }
    });
    Object.keys(acc).forEach(function (k) { AVG[k] = acc[k].qty > 0 ? acc[k].cost / acc[k].qty : null; });
  }
  function avgCost(id) { return AVG ? (AVG[id] == null ? null : AVG[id]) : null; }

  function spark(id, up) {
    var h = (HIST[id] || []).slice(-24);
    if (h.length < 2) return '<span class="nn-spark-empty">\u2013</span>';
    var lo = Math.min.apply(null, h), hi = Math.max.apply(null, h), rng = (hi - lo) || 1;
    var W = 68, H = 22;
    var pts = h.map(function (v, i) {
      return (i / (h.length - 1) * W).toFixed(1) + "," + (H - ((v - lo) / rng) * H).toFixed(1);
    }).join(" ");
    var col = up > 0 ? "#166534" : up < 0 ? "#b91c1c" : "#6b7280";
    return '<svg class="nn-spark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.6" ' +
      'stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  function pctMove(c) {
    var p = Number(c.price), pv = Number(c.prev_price || p);
    return pv ? ((p - pv) / pv) * 100 : 0;
  }

  /* ---------- render ---------- */
  function render() {
    if (rendering) return;
    rendering = true;
    VOLC = {}; buildAvg();
    var pv = 0, invested = 0;
    COS.forEach(function (c) {
      var q = HOLD[c.id] || 0; if (!q) return;
      pv += q * Number(c.price);
      var ac = avgCost(c.id); if (ac != null) invested += q * ac;
    });
    var net = CASH + pv, rank = 0;
    board.forEach(function (r, i) { if (String(r.team_id) === String(P.team_id)) rank = i + 1; });
    var START = 1000000, total = net - START, totalPct = total / START * 100;

    var track = el("nnTickerTrack");
    if (track) {
      var items = COS.map(function (c) {
        var d = pctMove(c), cls = d > 0.001 ? "up" : d < -0.001 ? "down" : "flat";
        return '<span class="nn-tick ' + cls + '"><b>' + esc(c.ticker) + "</b> " + money(c.price) +
               " <i>" + (d > 0 ? "\u25B2" : d < 0 ? "\u25BC" : "\u2013") + Math.abs(d).toFixed(1) + "%</i></span>";
      }).join("");
      track.innerHTML = items + items;
    }

    var h = '<div class="nn-top">' +
      '<div class="nn-stat"><span>Cash</span><strong>' + money(CASH) + "</strong></div>" +
      '<div class="nn-stat"><span>Holdings</span><strong>' + money(pv) + "</strong></div>" +
      '<div class="nn-stat is-net"><span>Net worth</span><strong>' + money(net) + "</strong>" +
        '<em class="' + (total >= 0 ? "up" : "down") + '">' + (total >= 0 ? "+" : "") + money(total) +
        " (" + (total >= 0 ? "+" : "") + totalPct.toFixed(1) + "%)</em></div>" +
      '<div class="nn-stat"><span>Rank</span><strong>' + (rank ? "#" + rank : "\u2014") +
        "</strong><em>of " + board.length + " teams</em></div>" +
      "</div>" +
      '<p class="nn-status ' + (OPEN ? "is-open" : "is-shut") + '">' +
        (OPEN ? "Market is OPEN \u00b7 you can buy and sell"
              : "Market is CLOSED \u00b7 prices are live, trading is paused") + "</p>";

    var held = COS.filter(function (c) { return (HOLD[c.id] || 0) > 0; });
    if (held.length) {
      h += '<div class="ws-sep"></div><h3 class="ws-h3">Your positions</h3>' +
        '<p class="ws-note">Profit and loss is measured against what you actually paid.</p>' +
        '<div class="nn-table-wrap"><table class="nn-table"><tr><th>Stock</th><th>Qty</th>' +
        "<th>Avg cost</th><th>Now</th><th>Value</th><th>P&amp;L</th></tr>" +
        held.map(function (c) {
          var q = HOLD[c.id], ac = avgCost(c.id), now = Number(c.price);
          var val = q * now, gain = ac != null ? (now - ac) * q : 0;
          var gp = ac ? ((now - ac) / ac * 100) : 0;
          var cls = gain > 0 ? "up" : gain < 0 ? "down" : "flat";
          return "<tr><td><strong>" + esc(c.ticker) + "</strong></td>" +
            '<td class="nn-num">' + q + "</td>" +
            '<td class="nn-num">' + (ac != null ? money(ac) : "\u2014") + "</td>" +
            '<td class="nn-num">' + money(now) + "</td>" +
            '<td class="nn-num">' + money(val) + "</td>" +
            '<td class="nn-move ' + cls + '">' + (gain >= 0 ? "+" : "") + money(gain) +
            " <small>(" + (gp >= 0 ? "+" : "") + gp.toFixed(1) + "%)</small></td></tr>";
        }).join("") + "</table></div>";
    }

    h += '<div class="ws-sep"></div><h3 class="ws-h3">The market</h3>' +
      '<p class="ws-note">Prices move as the anchors call them. Volatility is measured from how much a ' +
      "stock has actually moved; liquidity tells you how freely it trades.</p>" +
      '<div class="nn-table-wrap"><table class="nn-table"><tr><th>Stock</th><th>Price</th><th>Trend</th>' +
      "<th>Move</th><th>Day range</th><th>Risk</th><th>Held</th><th>Trade</th></tr>" +
      COS.map(function (c) {
        var d = pctMove(c), cls = d > 0.001 ? "up" : d < -0.001 ? "down" : "flat";
        var arrow = cls === "up" ? "\u25B2" : cls === "down" ? "\u25BC" : "\u2013";
        var q = HOLD[c.id] || 0, v = vol(c.id), vb = volBand(v);
        var lq = c.liquidity || "medium";
        return "<tr><td><strong>" + esc(c.ticker) + "</strong><br>" +
          "<span class='note'>" + esc(c.name) + "</span><br>" +
          "<span class='nn-sector'>" + esc(c.sector || "") + "</span></td>" +
          '<td class="nn-num"><strong>' + money(c.price) + "</strong></td>" +
          '<td class="nn-sparkcell">' + spark(c.id, d) + "</td>" +
          '<td class="nn-move ' + cls + '">' + arrow + " " + Math.abs(d).toFixed(1) + "%</td>" +
          '<td class="nn-num nn-range">' + money(c.day_low || c.price) + " \u2013 " + money(c.day_high || c.price) + "</td>" +
          '<td><span class="nn-badge v-' + vb[1] + '">' + vb[0] + " risk</span>" +
            '<span class="nn-badge l-' + lq + '">' + lq + " liq.</span></td>" +
          '<td class="nn-num">' + (q || "\u2014") + "</td>" +
          '<td class="nn-act">' +
            (OPEN
              ? '<input class="nn-qty" type="number" min="1" step="1" value="1" id="q-' + c.id + '"/>' +
                '<button class="mini-btn" data-buy="' + c.id + '">Buy</button>' +
                '<button class="mini-btn' + (q ? "" : " is-off") + '" data-sell="' + c.id + '"' + (q ? "" : " disabled") + ">Sell</button>"
              : '<span class="note">closed</span>') +
          "</td></tr>";
      }).join("") + "</table></div>" +
      '<p class="nn-msg" id="nnMsg"></p>';

    if (TRADES.length) {
      h += '<div class="ws-sep"></div><h3 class="ws-h3">Your trades</h3>' +
        '<p class="ws-note">Every decision you have made, most recent first. Useful when you have to explain the calls you made.</p>' +
        '<div class="nn-trades">' + TRADES.slice(0, 12).map(function (t) {
          var c = COS.filter(function (x) { return x.id === t.company_id; })[0] || {};
          return '<div class="nn-trade ' + t.side + '"><span class="nn-side">' + t.side.toUpperCase() + "</span>" +
            "<span><strong>" + t.qty + " \u00d7 " + esc(c.ticker || "?") + "</strong> at " + money(t.price) + "</span>" +
            '<span class="nn-total">' + money(t.total) + " \u00a2</span>" +
            '<span class="note">' + esc(String(t.traded_at).slice(11, 16)) + "</span></div>";
        }).join("") + "</div>";
    }

    h += '<div class="ws-sep"></div><h3 class="ws-h3">Leaderboard</h3>' +
      '<div class="nn-board">' + (board.length
        ? board.map(function (r, i) {
            var me = String(r.team_id) === String(P.team_id);
            var g = Number(r.net_worth) - START;
            return '<div class="nn-row' + (me ? " is-me" : "") + '"><span class="nn-rank">' + (i + 1) + "</span>" +
              "<span class='nn-team'>" + esc(r.team_name) + (me ? " (you)" : "") + "</span>" +
              "<span class='nn-worth'>" + money(r.net_worth) + " \u00a2<em class='" +
              (g >= 0 ? "up" : "down") + "'>" + (g >= 0 ? "+" : "") + money(g) + "</em></span></div>";
          }).join("")
        : '<p class="note">No teams trading yet.</p>') + "</div>";

    // preserve whatever quantity the user was typing across re-renders
    var typed = {};
    document.querySelectorAll('.nn-qty').forEach(function(i){ if(i.value && i.value!=='1') typed[i.id]=i.value; });
    el("nnBody").innerHTML = h;
    Object.keys(typed).forEach(function(id){ var i=el(id); if(i) i.value=typed[id]; });
    wire();
    rendering = false;
  }

  /* ---------- trading ---------- */
  function wire() {
    document.querySelectorAll("[data-buy]").forEach(function (b) {
      b.addEventListener("click", function () { confirmTrade(b.dataset.buy, "buy"); });
    });
    document.querySelectorAll("[data-sell]").forEach(function (b) {
      b.addEventListener("click", function () { confirmTrade(b.dataset.sell, "sell"); });
    });
  }

  function confirmTrade(id, side) {
    var q = el("q-" + id), qty = parseInt(q && q.value, 10);
    var msg = el("nnMsg");
    if (!qty || qty < 1) { msg.textContent = "Enter a quantity of at least 1."; msg.className = "nn-msg is-err"; return; }
    var c = COS.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    var total = qty * Number(c.price);
    var thin = c.liquidity === "low" && total > 150000;

    // A native confirm, not a custom overlay. The styled dialog depended on a
    // stylesheet and a body-level element rendering correctly, and when either
    // failed the participant got a dimmed page with nothing to click and no way
    // to scroll. A browser confirm cannot fail to render, on any device.
    var lines =
      (side === "buy" ? "Confirm purchase" : "Confirm sale") + "\n\n" +
      qty + " \u00d7 " + c.ticker + " at " + money(c.price) + " Cents each\n" +
      (side === "buy" ? "Cost: " : "Proceeds: ") + money(total) + " Cents\n" +
      (side === "buy" ? "Cash after this trade: " + money(CASH - total) + " Cents\n" : "") +
      (thin ? "\n" + c.ticker + " is thinly traded. Large positions in low-liquidity stocks are harder to exit if the price turns.\n" : "");

    if (!window.confirm(lines)) { pending = null; return; }
    pending = { id: id, side: side, qty: qty };
    doTrade();
  }

  async function doTrade() {
    if (busy || !pending) return;
    busy = true;
    var side = pending.side, qty = pending.qty;
    var msg = el("nnMsg");
    msg.textContent = "Placing your " + side + "\u2026"; msg.className = "nn-msg";
    var r = await sb.rpc("nn_trade", { p_company: pending.id, p_side: side, p_qty: qty });
    busy = false; pending = null;
    if (r.error) { msg.textContent = r.error.message; msg.className = "nn-msg is-err"; return; }
    var d = r.data || {};
    if (!d.ok) { msg.textContent = d.error || "That trade could not be placed."; msg.className = "nn-msg is-err"; return; }
    msg.textContent = (side === "buy" ? "Bought " : "Sold ") + qty + " share(s) at " + money(d.price) + " \u00a2.";
    msg.className = "nn-msg is-ok";
    refresh();
  }

  var rtTimer = null;
  function debouncedRefresh() {
    clearTimeout(rtTimer);
    rtTimer = setTimeout(refresh, 700);          // collapse bursts into one redraw
  }
  function subscribe() {
    if (!sb.channel) return;
    sb.channel("nn-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "nn_companies" }, debouncedRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "nn_state" }, debouncedRefresh)
      .subscribe();
  }
})();
