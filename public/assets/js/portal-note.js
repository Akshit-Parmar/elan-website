/* ============================================================================
   Élan — NOTE नीति trading floor (participant view)
   Live prices, buy and sell, portfolio valuation and the leaderboard.
   All trades go through the nn_trade() database function, so a team can never
   oversell or overspend even if both partners press at the same moment.
   ========================================================================== */
(function () {
  "use strict";

  var NOTE = "NOTE \u0928\u0940\u0924\u093F";
  var sb = null, P = null, COS = [], HOLD = {}, CASH = 0, OPEN = false, board = [];
  var busy = false;

  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function money(n) { return Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
  function el(id) { return document.getElementById(id); }

  var ran = false;
  function start(p) {
    if (ran || !p) return;
    if (p.centsible_theme !== NOTE) return;
    ran = true;
    sb = window.__elanSb; P = p;
    mount();
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
    host.innerHTML = '<article class="white-card ws"><span class="section-label">Trading floor</span>' +
      '<h2 class="ws-h" id="nnTitle">NOTE \u0928\u0940\u0924\u093F</h2>' +
      '<div id="nnBody"><p class="ws-note">Loading the market\u2026</p></div></article>';
    refresh();
    setInterval(refresh, 8000);        // keep prices and leaderboard fresh
    subscribe();
  }

  async function refresh() {
    if (!P.team_id) { renderNoTeam(); return; }
    var st = await sb.from("nn_state").select("*").eq("id", 1).maybeSingle();
    OPEN = !!(st.data && st.data.is_open);

    var c = await sb.from("nn_companies").select("*").eq("is_active", true).order("sort_order");
    COS = c.error ? [] : (c.data || []);

    var a = await sb.from("nn_accounts").select("*").eq("team_id", P.team_id).maybeSingle();
    CASH = a.data ? Number(a.data.cash) : 1000000;

    var h = await sb.from("nn_holdings").select("*").eq("team_id", P.team_id);
    HOLD = {};
    (h.error ? [] : (h.data || [])).forEach(function (x) { HOLD[x.company_id] = x.qty; });

    var b = await sb.from("nn_leaderboard").select("*").order("net_worth", { ascending: false });
    board = b.error ? [] : (b.data || []);

    render();
  }

  function renderNoTeam() {
    el("nnBody").innerHTML = '<p class="ws-note">You registered with a partner. Once the \u00c9lan team links your ' +
      "pair, your trading account opens here with your starting balance of 10,00,000 \u00a2. Nothing is required from you in the meantime.</p>";
  }

  function portfolioValue() {
    var v = 0;
    COS.forEach(function (c) { v += (HOLD[c.id] || 0) * Number(c.price); });
    return v;
  }

  function render() {
    var pv = portfolioValue(), net = CASH + pv;
    var rank = 0;
    board.forEach(function (r, i) { if (String(r.team_id) === String(P.team_id)) rank = i + 1; });

    var h = '<div class="nn-top">' +
      '<div class="nn-stat"><span>Cash</span><strong>' + money(CASH) + ' \u00a2</strong></div>' +
      '<div class="nn-stat"><span>Holdings</span><strong>' + money(pv) + ' \u00a2</strong></div>' +
      '<div class="nn-stat is-net"><span>Net worth</span><strong>' + money(net) + ' \u00a2</strong></div>' +
      '<div class="nn-stat"><span>Rank</span><strong>' + (rank ? "#" + rank + " of " + board.length : "\u2014") + "</strong></div>" +
      "</div>" +
      '<p class="nn-status ' + (OPEN ? "is-open" : "is-shut") + '">' +
        (OPEN ? "Market is OPEN. You can buy and sell." : "Market is CLOSED. Prices are live, but trading is paused.") + "</p>";

    // market table
    h += '<div class="ws-sep"></div><h3 class="ws-h3">The market</h3>' +
      '<p class="ws-note">Prices move as the anchors call them. Your holdings are valued at the current price.</p>' +
      '<div class="nn-table-wrap"><table class="nn-table"><tr>' +
      "<th>Company</th><th>Price</th><th>Move</th><th>You hold</th><th>Trade</th></tr>" +
      COS.map(function (c) {
        var price = Number(c.price), prev = Number(c.prev_price || price);
        var diff = prev ? ((price - prev) / prev) * 100 : 0;
        var cls = diff > 0.001 ? "up" : (diff < -0.001 ? "down" : "flat");
        var arrow = cls === "up" ? "\u25B2" : (cls === "down" ? "\u25BC" : "\u2013");
        var qty = HOLD[c.id] || 0;
        return "<tr><td><strong>" + esc(c.ticker) + "</strong><br><span class='note'>" + esc(c.name) + "</span></td>" +
          '<td class="nn-num">' + money(price) + "</td>" +
          '<td class="nn-move ' + cls + '">' + arrow + " " + Math.abs(diff).toFixed(1) + "%</td>" +
          '<td class="nn-num">' + (qty || "\u2014") + "</td>" +
          '<td class="nn-act">' +
            (OPEN
              ? '<input class="nn-qty" type="number" min="1" step="1" value="1" id="q-' + c.id + '"/>' +
                '<button class="mini-btn" data-buy="' + c.id + '">Buy</button>' +
                '<button class="mini-btn' + (qty ? "" : " is-off") + '" data-sell="' + c.id + '"' + (qty ? "" : " disabled") + ">Sell</button>"
              : '<span class="note">closed</span>') +
          "</td></tr>";
      }).join("") + "</table></div>" +
      '<p class="nn-msg" id="nnMsg"></p>';

    // leaderboard
    h += '<div class="ws-sep"></div><h3 class="ws-h3">Leaderboard</h3>' +
      '<div class="nn-board">' + (board.length
        ? board.map(function (r, i) {
            var me = String(r.team_id) === String(P.team_id);
            return '<div class="nn-row' + (me ? " is-me" : "") + '"><span class="nn-rank">' + (i + 1) + "</span>" +
              "<span class='nn-team'>" + esc(r.team_name) + (me ? " (you)" : "") + "</span>" +
              "<span class='nn-worth'>" + money(r.net_worth) + " \u00a2</span></div>";
          }).join("")
        : '<p class="note">No teams trading yet.</p>') + "</div>";

    el("nnBody").innerHTML = h;
    wire();
  }

  function wire() {
    document.querySelectorAll("[data-buy]").forEach(function (b) {
      b.addEventListener("click", function () { trade(b.dataset.buy, "buy"); });
    });
    document.querySelectorAll("[data-sell]").forEach(function (b) {
      b.addEventListener("click", function () { trade(b.dataset.sell, "sell"); });
    });
  }

  async function trade(companyId, side) {
    if (busy) return;
    var q = el("q-" + companyId);
    var qty = parseInt(q && q.value, 10);
    var msg = el("nnMsg");
    if (!qty || qty < 1) { msg.textContent = "Enter a quantity of at least 1."; msg.className = "nn-msg is-err"; return; }
    busy = true; msg.textContent = "Placing your " + side + "\u2026"; msg.className = "nn-msg";
    var r = await sb.rpc("nn_trade", { p_company: companyId, p_side: side, p_qty: qty });
    busy = false;
    if (r.error) { msg.textContent = r.error.message; msg.className = "nn-msg is-err"; return; }
    var d = r.data || {};
    if (!d.ok) { msg.textContent = d.error || "That trade could not be placed."; msg.className = "nn-msg is-err"; return; }
    msg.textContent = (side === "buy" ? "Bought " : "Sold ") + qty + " share(s) at " + money(d.price) + " \u00a2.";
    msg.className = "nn-msg is-ok";
    refresh();
  }

  function subscribe() {
    if (!sb.channel) return;
    sb.channel("nn-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "nn_companies" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "nn_state" }, refresh)
      .subscribe();
  }
})();
