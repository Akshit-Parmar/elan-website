/* ============================================================================
   Élan — Cent$ible portal workspace
   BRAND बनाओ  : pre-event product brief form (drives their Round 2 crisis)
   VIRAL व्यापार : live-format briefing, nothing to submit
   प्रश्न PRODIGY : live-format briefing, nothing to submit
   NOTE नीति    : handled by portal-note.js (live trading floor)
   ========================================================================== */
(function () {
  "use strict";

  var BRAND  = "BRAND \u092C\u0928\u093E\u0913";
  var VIRAL  = "VIRAL \u0935\u094D\u092F\u093E\u092A\u093E\u0930";
  var NOTE   = "NOTE \u0928\u0940\u0924\u093F";
  var PRODIGY = "\u092A\u094D\u0930\u0936\u094D\u0928 PRODIGY";

  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---- the nine fields the organising committee needs from BRAND बनाओ ---- */
  var BRIEF_FIELDS = [
    ["brand_name",  "Brand name",              "What is your startup called?", false],
    ["product",     "Product or service",      "What exactly do you sell?", true],
    ["customer",    "Target customer",         "Who buys it? Age, need, behaviour, segment.", true],
    ["price",       "Price range",             "e.g. \u20B9299 to \u20B9799", false],
    ["model",       "Business model",          "How does the company make money? Pricing, revenue stream, sales model.", true],
    ["channel",     "Primary sales channel",   "e.g. own website, Instagram, retail stores, marketplace", false],
    ["differentiator","Key differentiator",    "What makes you different from what already exists?", true],
    ["dependency",  "One major dependency",    "One thing your business relies on: a supplier, a technology, a platform, an influencer, a partner.", true],
    ["expansion",   "Future expansion idea",   "Where would you take this next?", true]
  ];

  /* ---- live-format briefings ---- */
  var BRIEF = {};
  BRIEF[VIRAL] = {
    intro: "VIRAL \u0935\u094D\u092F\u093E\u092A\u093E\u0930 is judged live in the room. There is nothing to submit before the event. " +
           "Both rounds give you thirty minutes to prepare and five minutes to pitch, so what decides your result is how " +
           "quickly you can find an angle and how convincingly you sell it.",
    rounds: [
      ["Round 1", "The Comeback Pitch",
       "You are handed a real brand that failed because of its marketing, not its product. Your sheet gives you the brand, " +
       "a product image, a short history, why it failed and where it stands now. Work out what went wrong, what the brand " +
       "should become, who it should target and how you would make it relevant again. A slide deck or a reference picture " +
       "of the product is required. You must work with the brand you are given."],
      ["Round 2", "Unexpected Collab",
       "Two fish bowls. Draw one brand from the first and one product category from the second, then make that collaboration " +
       "believable. Your pitch has to answer what the collaboration is, why these two work together, what exactly you are " +
       "launching, who it is for, what makes it unique, how you would market it and what the campaign idea is."]
    ],
    judged: [
      "Creativity and originality of the idea",
      "Marketing strategy and how well it is reasoned",
      "Understanding of the challenge you were given",
      "Execution and presentation",
      "Audience engagement",
      "Time management, in both rounds"
    ],
    prep: [
      "Practise finding the marketing failure in brands you already know. Ask why it did not connect, not why the product was bad.",
      "Rehearse pitching to a five-minute limit. Both rounds use it.",
      "Agree how you and your partner split speaking time before Day 1.",
      "Have a way to show a picture or slide, since Round 1 requires one.",
      "Bring a pen and notebook. Thirty minutes goes quickly."
    ],
    practice: [
      ["The Comeback Pitch", "Take a brand you think deserved better. In thirty minutes decide what killed it and what it should become. Pitch it in five."],
      ["The Comeback Pitch", "Pick something your parents used to buy and no longer do. Reposition it for people your age."],
      ["The Comeback Pitch", "Choose a good product with a forgettable name. Rename and reposition it without changing the product."],
      ["Unexpected Collab", "Crocs and luggage. Make it make sense in five minutes."],
      ["Unexpected Collab", "Spotify and furniture. What are you launching, and who buys it?"],
      ["Unexpected Collab", "LEGO and cosmetics. Find the audience before you find the product."],
      ["Unexpected Collab", "Draw any two at random from things around you and force a collaboration. The stranger the pairing, the better the practice."]
    ],
    mistakes: [
      "Replacing the brand you were given with a different idea. Round 1 requires you to work with what is on your sheet.",
      "Explaining the failure for four minutes and leaving one minute for the fix.",
      "Naming a target audience but never showing why they would care.",
      "In Round 2, saying the brand will simply make the product, instead of selling the collaboration.",
      "One partner doing all the talking.",
      "Running long. Time management is scored in both rounds."
    ]
  };

  BRIEF[PRODIGY] = {
    intro: "\u092A\u094D\u0930\u0936\u094D\u0928 PRODIGY runs live in the room, in teams of two, and takes roughly two to three " +
           "hours in total. There is nothing to submit before the event. You have two scored rounds on Day 1 and nobody is " +
           "eliminated after Round 1, so the Cents you earn early become the ammunition you bid with later. The top three teams " +
           "then go through to the Boardroom Finale on Day 2, which in this theme is called the Nova Boardroom.",
    rounds: [
      ["Round 1", "Rapid Vision Rush",
       "One minute per team, and as many questions as you can take in it. Business and commerce, famous brands, company logos, " +
       "founders and CEOs, startups and entrepreneurs, products and services, brand taglines, current business affairs, emoji " +
       "brand clues, founder and CEO images, product silhouettes, advertisement visuals and business personalities, deliberately " +
       "shuffled so you can never settle into one kind of thinking. Every correct answer is 100 Cents, a wrong answer costs you " +
       "nothing, and a skip is worth zero. Nine correct in the minute is 900 Cents. Nobody is eliminated, and whatever you earn " +
       "here becomes your starting score for the bidding."],
      ["Round 2", "The Bidding War",
       "The host reveals a question for bidding and teams bid each other up for the right to answer it, opening at 100 Cents. " +
       "The highest bidder gets the question. Answer correctly and your full bid is added to your score. Answer wrong and half " +
       "your bid is taken away, so a well-judged risk is often worth taking. Between battles there are audience activities: " +
       "prediction questions, live business polls, guess-the-bid challenges, market reaction activities and bonus questions, so " +
       "you stay in it even when another team holds the question. Scores are totalled at the end and the top three teams go through."]
    ],
    judged: [
      "Speed of recall and accuracy under a one-minute clock",
      "Breadth of business knowledge across brands, founders and current affairs",
      "Visual intelligence: logos, silhouettes, advertisements",
      "Risk assessment and financial judgement when bidding",
      "Composure under pressure",
      "How well the two of you work as a pair"
    ],
    prep: [
      "Learn logos and taglines as a pair, testing each other in short bursts rather than long sessions.",
      "Follow business news for a few weeks before Élan. Current affairs questions appear.",
      "Practise founders and CEOs, both names and faces.",
      "Agree a rule for skipping. In a one-minute round, hesitating on one question can cost you three.",
      "Decide in advance who calls the bids, so you are not arguing while the bidding runs.",
      "Agree when to sit a battle out. Conserving Cents for a category you actually know is a strategy, not a retreat."
    ],
    practice: [
      ["Rapid Vision Rush", "Set a one-minute timer. Name as many brand taglines as you can. Count them, then beat it tomorrow."],
      ["Rapid Vision Rush", "Show each other twenty logos with the names covered. Anything slower than two seconds is a skip."],
      ["Rapid Vision Rush", "Founders and CEOs: one of you names the company, the other names the person. Swap."],
      ["The Bidding War", "Decide together: at 500 Cents, how sure do you need to be before you bid? Write the number down and stick to it."],
      ["The Bidding War", "Practise the maths out loud. If you hold 900 Cents and bid 600 and lose, what are you left with?"]
    ],
    mistakes: [
      "Getting stuck on one question in Rapid Vision Rush. Skipping costs nothing; hesitating costs everything.",
      "Both partners answering at once and cancelling each other out.",
      "Bidding high early to look confident, then having nothing left to bid with.",
      "Forgetting that a wrong answer only costs half the bid, so a well-judged risk is often worth taking.",
      "Bidding on a question you have no feel for simply because another team wanted it."
    ]
  };

  /* ---------------------------------------------------------------------- */
  var ranFor = null;

  function start(p) {
    var sb = window.__elanSb;
    if (!p || !sb) return;
    if (p.flagship !== "Cent$ible") return;
    if (p.centsible_theme === NOTE) return;          // portal-note.js handles this
    if (ranFor === p.participant_uid) return;
    ranFor = p.participant_uid;

    var mount = document.getElementById("centWorkspace");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "centWorkspace";
      mount.className = "ep-flag-strip";
      var anchor = document.querySelector(".ep-flag-strip") || document.querySelector(".page-hero");
      if (anchor && anchor.parentNode) anchor.insertAdjacentElement("afterend", mount);
      else (document.getElementById("ep-main") || document.body).appendChild(mount);
    }
    build(p, sb, mount);
  }
  document.addEventListener("elan:participant", function (ev) { start(ev.detail || {}); });
  var tries = 0, poll = setInterval(function () {
    if (window.__elanParticipant && window.__elanSb) { clearInterval(poll); start(window.__elanParticipant); }
    else if (++tries > 40) clearInterval(poll);
  }, 250);

  function field(key, label, val, hint, big, off) {
    var d = off ? " disabled" : "";
    return '<label class="pd-lab" for="pf-' + key + '">' + esc(label) + "</label>" +
      (big
        ? '<textarea class="pd-in" id="pf-' + key + '" data-k="' + key + '" rows="2"' + d + ' placeholder="' + esc(hint) + '">' + esc(val || "") + "</textarea>"
        : '<input class="pd-in" id="pf-' + key + '" data-k="' + key + '"' + d + ' placeholder="' + esc(hint) + '" value="' + esc(val || "") + '"/>');
  }

  async function build(p, sb, mount) {
    var theme = p.centsible_theme || "";
    var linked = !!p.team_id, teamName = "", mates = [];

    if (linked) {
      var t = await sb.from("cc_teams").select("*").eq("id", p.team_id).maybeSingle();
      var mm = await sb.from("participants").select("full_name,participant_uid,school")
                       .eq("team_id", p.team_id).order("full_name");
      teamName = (t.data && t.data.name) || "Your team";
      mates = mm.error ? [] : (mm.data || []);
    }

    function teamBlock() {
      return linked
        ? '<div class="rp-mates">' + mates.map(function (m) {
            var me = m.participant_uid === p.participant_uid;
            return '<span class="rp-mate' + (me ? " is-me" : "") + '"><strong>' +
                   esc(m.school || "") + "</strong>" + esc(m.full_name) + (me ? " (you)" : "") + "</span>";
          }).join("") + "</div>"
        : '<p class="ws-note" style="margin:0">You registered with a partner. Once the \u00c9lan team links you, ' +
          "both names appear here. Nothing is required from you in the meantime.</p>";
    }

    /* ---------- live-format themes: briefing only ---------- */
    if (BRIEF[theme]) {
      var B = BRIEF[theme];
      mount.innerHTML = '<article class="white-card ws">' +
        '<span class="section-label">Your pair</span>' +
        '<h2 class="ws-h">' + (linked ? esc(teamName) : "Being confirmed") + "</h2>" + teamBlock() +

        '<div class="ws-sep"></div><h3 class="ws-h3">How your theme is run</h3>' +
        '<p class="ws-note">' + esc(B.intro) + "</p>" +
        '<div class="cc-phases">' + B.rounds.map(function (r) {
          return '<div class="cc-phase"><span class="cc-phase-time">' + esc(r[0]) + "</span>" +
                 "<strong>" + esc(r[1]) + "</strong><p>" + esc(r[2]) + "</p></div>";
        }).join("") + "</div>" +

        '<div class="ws-sep"></div><h3 class="ws-h3">What the judges reward</h3>' +
        '<ul class="ws-list">' + B.judged.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +

        '<div class="ws-sep"></div><h3 class="ws-h3">How to prepare</h3>' +
        '<p class="ws-note">Nothing is submitted before the event. Preparation is about being ready to think quickly.</p>' +
        '<ul class="ws-list">' + B.prep.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +

        '<div class="ws-sep"></div><h3 class="ws-h3">Practise before you come</h3>' +
        '<p class="ws-note">None of this is scored or submitted. Set a timer, take a prompt, and go.</p>' +
        '<div class="vp-list">' + B.practice.map(function (x) {
          return '<div class="vp-item"><span class="vp-tag">' + esc(x[0]) + "</span><p>" + esc(x[1]) + "</p></div>";
        }).join("") + "</div>" +

        '<div class="ws-sep"></div><h3 class="ws-h3">What costs teams marks</h3>' +
        '<ul class="ws-list">' + B.mistakes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
        "</article>";
      return;
    }

    /* ---------- BRAND बनाओ: product brief ---------- */
    if (theme !== BRAND) {
      mount.innerHTML = '<article class="white-card ws"><span class="section-label">Your team</span>' +
        '<h2 class="ws-h">' + (linked ? esc(teamName) : "Being confirmed") + "</h2>" + teamBlock() + "</article>";
      return;
    }

    var S = {};
    if (linked) {
      var secs = await sb.from("cc_sections").select("*").eq("team_id", p.team_id).eq("round", "brief");
      (secs.error ? [] : (secs.data || [])).forEach(function (x) { S[x.role] = x.body || ""; });
    }
    var done = BRIEF_FIELDS.filter(function (f) { return (S[f[0]] || "").trim(); }).length;

    mount.innerHTML = '<article class="white-card ws">' +
      '<span class="section-label">Your workspace</span>' +
      '<h2 class="ws-h">' + (linked ? esc(teamName) : "Waiting for your team") + "</h2>" +
      (linked ? teamBlock()
              : '<div class="ws-wait"><strong>Your partner is not linked yet.</strong>' +
                "<span>You and your partner registered separately, so the \u00c9lan team needs to link you before you can " +
                "fill this in. Nothing is required from you right now.</span>" +
                '<span>If it has been more than a day or two, email <a href="mailto:elan@sgischool.in">elan@sgischool.in</a> with both names.</span></div>') +

      '<div class="ws-sep"></div>' +
      '<h3 class="ws-h3">Your product brief</h3>' +
      '<p class="ws-note"><strong>Due two days before \u00c9lan, by 3 September.</strong> This is the only thing BRAND ' +
      "\u092C\u0928\u093E\u0913 teams submit in advance. The organising team uses your answers to build the crisis you " +
      "will face in Round 2, which is written specifically for your startup. The more real your brief, the sharper your crisis " +
      "will be. You will not be told what it is.</p>" +
      (linked ? '<p class="ws-note"><strong>' + done + " of " + BRIEF_FIELDS.length +
                " answered.</strong> Either partner can edit this, and it saves as you type.</p>" : "") +
      '<div class="ws-fields' + (linked ? "" : " is-locked") + '">' +
        BRIEF_FIELDS.map(function (f) { return field(f[0], f[1], S[f[0]], f[2], f[3], !linked); }).join("") +
        '<span class="ws-saved" id="pdSaved"></span>' +
      "</div>" +

      '<div class="ws-sep"></div>' +
      '<h3 class="ws-h3">What happens on the day</h3>' +
      '<ul class="ws-list">' +
        "<li><strong>Round 1, The Founder Pitch.</strong> Five minutes, pitched as founders: brand name and meaning, logo and " +
        "the thinking behind it, target audience, business model, marketing strategy, future vision. Judges may stop you at five minutes.</li>" +
        "<li><strong>Round 2, Brand Under Pressure.</strong> You receive a sealed envelope with your crisis. Twenty minutes to " +
        "rebuild your strategy, then three minutes to present: what happened, what you do first, what changes, how you protect " +
        "customer trust, and how you stop it happening again.</li>" +
        "<li><strong>Top three teams</strong> go through to the Cent\\$ible Boardroom on Day 2.</li>" +
      "</ul>" +
      '<p class="ws-note">Bring your Round 1 materials in the format the organising committee specifies. Envelopes stay sealed ' +
      "until the official announcement, and your Round 2 response has to address the crisis rather than repeat your original pitch.</p>" +
      "</article>";

    if (!linked) return;

    var tmr = {};
    mount.querySelectorAll(".pd-in").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var k = inp.dataset.k, saved = document.getElementById("pdSaved");
        if (saved) saved.textContent = "saving\u2026";
        clearTimeout(tmr[k]);
        tmr[k] = setTimeout(async function () {
          var r = await sb.from("cc_sections").upsert({ team_id: p.team_id, round: "brief", role: k,
            body: inp.value, updated_at: new Date().toISOString(), updated_by: p.auth_user_id || null },
            { onConflict: "team_id,round,role" });
          if (saved) saved.textContent = r.error ? "not saved, retrying" : "saved";
        }, 800);
      });
    });
  }
})();
