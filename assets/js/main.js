/* ==========================================================================
   Wildroot Trip Studio — shared behaviour
   Vanilla JS, no dependencies, no build step.

   Contents
     1.  Utilities
     2.  Image fallback (never ship a broken image)
     3.  Header: transparent -> sand solid on scroll
     4.  Mobile navigation + dropdowns
     5.  Scroll reveals + gentle media zoom
     6.  Back to top
     7.  Accordions (FAQ)
     8.  Cookie consent (Accept / Reject / Manage)
     9.  Form validation with inline messages
     10. Trip planner (itinerary builder)
     11. Packing checklist progress
     12. Pricing monthly/annual toggle
     13. Footer year
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     1. Utilities
     --------------------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function usd(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  /* ---------------------------------------------------------------------
     2. Image fallback
     Photography is loaded from remote hosts. If any single URL fails we
     swap in a same-subject replacement so the layout never shows a broken
     image icon. Capture phase is required: `error` does not bubble.
     --------------------------------------------------------------------- */
  document.addEventListener(
    "error",
    function (e) {
      var el = e.target;
      if (!el || el.tagName !== "IMG" || el.dataset.fallbackApplied) return;
      el.dataset.fallbackApplied = "1";
      var seed = (el.dataset.fallback || el.alt || "wildroot-travel")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40);
      var w = el.getAttribute("width") || 1200;
      var h = el.getAttribute("height") || 900;
      el.src = "https://picsum.photos/seed/" + seed + "/" + w + "/" + h;
    },
    true
  );

  /* ---------------------------------------------------------------------
     3. Header state
     A zero-height sentinel is observed instead of listening to scroll,
     so there is no per-frame work on the main thread.
     --------------------------------------------------------------------- */
  var header = $(".site-header");
  if (header && "IntersectionObserver" in window) {
    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;";
    document.body.insertBefore(sentinel, document.body.firstChild);

    new IntersectionObserver(
      function (entries) {
        header.classList.toggle("is-solid", !entries[0].isIntersecting);
      },
      { threshold: 0 }
    ).observe(sentinel);
  } else if (header) {
    header.classList.add("is-solid");
  }

  /* ---------------------------------------------------------------------
     4. Mobile navigation + dropdowns
     --------------------------------------------------------------------- */
  var navToggle = $(".nav-toggle");
  var primaryNav = $(".primary-nav");

  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      primaryNav.classList.toggle("is-open", !open);
      navToggle.querySelector(".nav-toggle-text").textContent = !open ? "Close" : "Menu";
    });

    // Escape closes the drawer and returns focus to the trigger.
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (primaryNav.classList.contains("is-open")) {
        primaryNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.querySelector(".nav-toggle-text").textContent = "Menu";
        navToggle.focus();
      }
      $$(".nav-trigger[aria-expanded='true']").forEach(function (t) {
        t.setAttribute("aria-expanded", "false");
        var sub = document.getElementById(t.getAttribute("aria-controls"));
        if (sub) sub.classList.remove("is-open");
      });
    });
  }

  $$(".nav-trigger").forEach(function (trigger) {
    var submenu = document.getElementById(trigger.getAttribute("aria-controls"));
    if (!submenu) return;
    trigger.addEventListener("click", function () {
      var open = trigger.getAttribute("aria-expanded") === "true";
      // Close sibling menus so only one column is open at a time.
      $$(".nav-trigger").forEach(function (other) {
        if (other === trigger) return;
        other.setAttribute("aria-expanded", "false");
        var os = document.getElementById(other.getAttribute("aria-controls"));
        if (os) os.classList.remove("is-open");
      });
      trigger.setAttribute("aria-expanded", String(!open));
      submenu.classList.toggle("is-open", !open);
    });
  });

  // Clicking outside closes any open desktop dropdown.
  document.addEventListener("click", function (e) {
    if (e.target.closest(".nav-parent")) return;
    $$(".nav-trigger[aria-expanded='true']").forEach(function (t) {
      t.setAttribute("aria-expanded", "false");
      var sub = document.getElementById(t.getAttribute("aria-controls"));
      if (sub) sub.classList.remove("is-open");
    });
  });

  /* ---------------------------------------------------------------------
     5. Scroll reveals + media zoom
     Content is visible by default in CSS; the `js-motion` class is what
     enables the hidden-then-revealed state, so a headless render or a
     stalled observer can never leave a section blank.
     --------------------------------------------------------------------- */
  var revealTargets = $$(".reveal, .media-zoom");
  if (revealTargets.length && "IntersectionObserver" in window && !prefersReducedMotion) {
    document.documentElement.classList.add("js-motion");
    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------------------------------------------------------------
     6. Back to top
     --------------------------------------------------------------------- */
  var toTop = $(".to-top");
  if (toTop) {
    if ("IntersectionObserver" in window) {
      var topSentinel = document.createElement("div");
      topSentinel.setAttribute("aria-hidden", "true");
      topSentinel.style.cssText = "position:absolute;top:600px;left:0;width:1px;height:1px;pointer-events:none;";
      document.body.appendChild(topSentinel);
      new IntersectionObserver(function (entries) {
        toTop.classList.toggle("is-shown", !entries[0].isIntersecting);
      }).observe(topSentinel);
    } else {
      toTop.classList.add("is-shown");
    }
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
      var skip = $(".skip-link");
      if (skip) skip.focus();
    });
  }

  /* ---------------------------------------------------------------------
     7. Accordions
     --------------------------------------------------------------------- */
  $$(".accordion-trigger").forEach(function (trigger) {
    var panel = document.getElementById(trigger.getAttribute("aria-controls"));
    if (!panel) return;
    trigger.addEventListener("click", function () {
      var open = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!open));
      panel.classList.toggle("is-open", !open);
    });
  });

  /* ---------------------------------------------------------------------
     8. Cookie consent
     Non-essential storage is never written before a choice is recorded.
     --------------------------------------------------------------------- */
  var CONSENT_KEY = "wildroot_consent_v1";
  var banner = $(".cookie-banner");

  function readConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || "null"); }
    catch (err) { return null; }
  }
  function writeConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)); }
    catch (err) { /* storage blocked: the choice simply is not remembered */ }
  }
  function applyConsent(value) {
    // Analytics and advertising tags would be initialised here, and only here.
    window.wildrootConsent = value;
    document.dispatchEvent(new CustomEvent("wildroot:consent", { detail: value }));
  }

  if (banner) {
    var stored = readConsent();
    if (!stored) {
      // Delay to the next frame so the banner slides in and never causes CLS.
      requestAnimationFrame(function () { banner.classList.add("is-shown"); });
    } else {
      applyConsent(stored);
    }

    var prefsPanel = $(".cookie-prefs", banner);

    function settle(value) {
      value.date = new Date().toISOString();
      writeConsent(value);
      applyConsent(value);
      banner.classList.remove("is-shown");
    }

    var acceptBtn = $("[data-consent='accept']", banner);
    var rejectBtn = $("[data-consent='reject']", banner);
    var manageBtn = $("[data-consent='manage']", banner);
    var saveBtn = $("[data-consent='save']", banner);

    if (acceptBtn) acceptBtn.addEventListener("click", function () {
      settle({ essential: true, analytics: true, advertising: true });
    });
    if (rejectBtn) rejectBtn.addEventListener("click", function () {
      settle({ essential: true, analytics: false, advertising: false });
    });
    if (manageBtn && prefsPanel) manageBtn.addEventListener("click", function () {
      var open = manageBtn.getAttribute("aria-expanded") === "true";
      manageBtn.setAttribute("aria-expanded", String(!open));
      prefsPanel.classList.toggle("is-open", !open);
    });
    if (saveBtn) saveBtn.addEventListener("click", function () {
      settle({
        essential: true,
        analytics: !!($("#cookie-analytics") && $("#cookie-analytics").checked),
        advertising: !!($("#cookie-advertising") && $("#cookie-advertising").checked)
      });
    });
  }

  // Any "Cookie preferences" link on the site can re-open the banner.
  $$("[data-open-consent]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      if (!banner) { window.location.href = "cookie-policy.html"; return; }
      banner.classList.add("is-shown");
      var prefs = $(".cookie-prefs", banner);
      var manage = $("[data-consent='manage']", banner);
      if (prefs && manage) { prefs.classList.add("is-open"); manage.setAttribute("aria-expanded", "true"); }
      banner.scrollIntoView({ block: "nearest" });
      var firstControl = $("button, input", banner);
      if (firstControl) firstControl.focus();
    });
  });

  /* ---------------------------------------------------------------------
     9. Form validation
     Inline, next to the field, announced to assistive tech.
     These demo forms do not post anywhere; they report success locally so
     the page never sends data to a server that is not configured yet.
     --------------------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  var PHONE_RE = /^[0-9()+\-.\s]{10,20}$/;

  function setError(field, message) {
    var input = $("input, select, textarea", field);
    var box = $(".field-error", field);
    if (!input || !box) return;
    if (message) {
      input.setAttribute("aria-invalid", "true");
      box.textContent = message;
      box.classList.add("is-shown");
    } else {
      input.removeAttribute("aria-invalid");
      box.textContent = "";
      box.classList.remove("is-shown");
    }
  }

  function validateField(field) {
    var input = $("input, select, textarea", field);
    if (!input || input.type === "hidden") return true;
    var value = (input.value || "").trim();
    var label = field.dataset.label || (($("label", field) || {}).textContent || "This field").replace(/\*/g, "").trim();

    if (input.required && !value && input.type !== "checkbox") {
      setError(field, label + " is required.");
      return false;
    }
    if (input.type === "checkbox" && input.required && !input.checked) {
      setError(field, "Please tick this box to continue.");
      return false;
    }
    if (value && input.type === "email" && !EMAIL_RE.test(value)) {
      setError(field, "Enter an email address in the format name@example.com.");
      return false;
    }
    if (value && input.type === "tel" && !PHONE_RE.test(value)) {
      setError(field, "Enter a US phone number, for example +1 (720) 555-0148.");
      return false;
    }
    if (value && input.dataset.minlength && value.length < Number(input.dataset.minlength)) {
      setError(field, label + " needs at least " + input.dataset.minlength + " characters.");
      return false;
    }
    setError(field, "");
    return true;
  }

  $$("form[data-validate]").forEach(function (form) {
    var status = $(".form-status", form);

    $$(".field", form).forEach(function (field) {
      var input = $("input, select, textarea", field);
      if (!input) return;
      input.addEventListener("blur", function () { validateField(field); });
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true") validateField(field);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = $$(".field", form);
      var firstBad = null;
      fields.forEach(function (field) {
        if (!validateField(field) && !firstBad) firstBad = field;
      });

      // Required standalone checkboxes (consent boxes) live outside .field
      $$(".checkline input[required]", form).forEach(function (box) {
        var wrap = box.closest(".checkline");
        var msg = wrap ? $(".field-error", wrap) : null;
        if (!box.checked) {
          if (msg) { msg.textContent = "Please tick this box to continue."; msg.classList.add("is-shown"); }
          box.setAttribute("aria-invalid", "true");
          if (!firstBad) firstBad = wrap;
        } else {
          if (msg) { msg.textContent = ""; msg.classList.remove("is-shown"); }
          box.removeAttribute("aria-invalid");
        }
      });

      if (firstBad) {
        if (status) {
          status.textContent = "Some details still need attention. The fields are marked below.";
          status.className = "form-status is-shown is-error";
        }
        var focusable = $("input, select, textarea", firstBad);
        if (focusable) focusable.focus();
        return;
      }

      if (status) {
        status.textContent = form.dataset.successMessage ||
          "Thank you. Your message has been prepared for our travel team. We reply to every enquiry within one business day.";
        status.className = "form-status is-shown is-ok";
        status.setAttribute("tabindex", "-1");
        status.focus();
      }
      form.reset();
    });
  });

  /* ---------------------------------------------------------------------
     10. Trip planner
     A working day-by-day itinerary builder. State lives in memory and is
     mirrored to localStorage only after cookie consent has been recorded,
     because the saved plan is a non-essential convenience.
     --------------------------------------------------------------------- */
  var plannerRoot = $("[data-planner]");
  if (plannerRoot) {
    var board = $("[data-planner-board]", plannerRoot);
    var libraryEl = $("[data-planner-library]", plannerRoot);
    var summaryEl = $("[data-planner-summary]", plannerRoot);
    var destSelect = $("#planner-destination");
    var partySize = $("#planner-party");
    var addDayBtn = $("[data-planner-add-day]");
    var resetBtn = $("[data-planner-reset]");
    var printBtn = $("[data-planner-print]");

    // Stop library, grouped by destination. Costs are per person, in USD.
    var LIBRARY = {
      iceland: [
        { t: "08:00", n: "Reykjavik bakery breakfast", d: "Cardamom buns and coffee before the drive out", c: 18, m: 60 },
        { t: "10:00", n: "Thingvellir National Park", d: "Walk the rift valley boardwalk", c: 10, m: 120 },
        { t: "13:00", n: "Geysir geothermal field", d: "Strokkur erupts every 6 to 10 minutes", c: 0, m: 90 },
        { t: "15:00", n: "Gullfoss waterfall", d: "Upper and lower viewing platforms", c: 0, m: 75 },
        { t: "17:30", n: "Secret Lagoon soak", d: "Quieter and cheaper than the famous one", c: 32, m: 90 },
        { t: "20:00", n: "Seljalandsfoss at golden hour", d: "Waterproof layer required, you walk behind it", c: 8, m: 60 },
        { t: "21:30", n: "Northern lights watch", d: "September to March, check the aurora forecast", c: 0, m: 120 }
      ],
      kyoto: [
        { t: "06:30", n: "Fushimi Inari early climb", d: "Beat the crowd on the torii gate trail", c: 0, m: 150 },
        { t: "09:30", n: "Nishiki Market breakfast", d: "Tamagoyaki, soy milk doughnuts, pickles", c: 16, m: 75 },
        { t: "11:30", n: "Nijo Castle nightingale floors", d: "Audio guide included with entry", c: 9, m: 90 },
        { t: "14:00", n: "Arashiyama bamboo grove", d: "Enter from the north gate for fewer people", c: 0, m: 90 },
        { t: "16:00", n: "Okochi Sanso villa garden", d: "Entry includes matcha and a sweet", c: 11, m: 75 },
        { t: "18:30", n: "Pontocho Alley dinner", d: "Riverside lantern-lit lane", c: 42, m: 105 },
        { t: "20:30", n: "Kiyomizu-dera evening illumination", d: "Seasonal, check the temple calendar", c: 6, m: 90 }
      ],
      utah: [
        { t: "06:00", n: "Delicate Arch sunrise hike", d: "3 miles round trip, no shade", c: 0, m: 165 },
        { t: "09:30", n: "Windows Section loop", d: "Short flat trail, best light before 10am", c: 0, m: 60 },
        { t: "12:00", n: "Moab lunch stop", d: "Refill water and top off the gas tank", c: 19, m: 75 },
        { t: "14:30", n: "Dead Horse Point overlook", d: "State park, separate entry fee", c: 20, m: 90 },
        { t: "17:00", n: "Island in the Sky scenic drive", d: "Mesa Arch, Grand View Point", c: 0, m: 120 },
        { t: "19:30", n: "Campsite dinner", d: "Cook at the site or grab takeout in Moab", c: 22, m: 75 },
        { t: "21:00", n: "Dark sky stargazing", d: "Both parks are certified dark sky parks", c: 0, m: 60 }
      ],
      lisbon: [
        { t: "08:30", n: "Pastel de nata and bica", d: "Stand at the counter like a local", c: 6, m: 45 },
        { t: "10:00", n: "Alfama walking loop", d: "Steep cobbles, wear real shoes", c: 0, m: 120 },
        { t: "12:30", n: "Time Out Market lunch", d: "Shared tables, many stalls", c: 24, m: 75 },
        { t: "15:00", n: "Tram 28 to Graca", d: "Ride outside peak hours to get a seat", c: 4, m: 60 },
        { t: "17:00", n: "Miradouro sunset", d: "Senhora do Monte has the widest view", c: 0, m: 60 },
        { t: "20:00", n: "Fado dinner in Bairro Alto", d: "Reserve ahead, sets start around 9pm", c: 55, m: 150 }
      ],
      generic: [
        { t: "08:00", n: "Slow breakfast near the hotel", d: "Budget 45 minutes before the first stop", c: 15, m: 45 },
        { t: "10:00", n: "Anchor sight for the morning", d: "Book timed entry if the site offers it", c: 25, m: 120 },
        { t: "12:30", n: "Local lunch", d: "Keep it walking distance from the morning stop", c: 22, m: 75 },
        { t: "14:30", n: "Neighborhood wander", d: "One district, on foot, no agenda", c: 0, m: 105 },
        { t: "17:00", n: "Golden hour viewpoint", d: "Check sunset time for your travel dates", c: 0, m: 60 },
        { t: "19:30", n: "Dinner reservation", d: "Book two weeks out for popular rooms", c: 48, m: 120 }
      ]
    };

    var state = { days: [[], [], []], dest: "iceland", party: 2 };

    function minutesLabel(mins) {
      if (mins < 60) return mins + " min";
      var h = Math.floor(mins / 60), m = mins % 60;
      return m ? h + " hr " + m + " min" : h + " hr";
    }

    function renderLibrary() {
      var items = LIBRARY[state.dest] || LIBRARY.generic;
      libraryEl.innerHTML = "";
      items.forEach(function (item, i) {
        var row = document.createElement("div");
        row.className = "library-item";
        row.innerHTML =
          '<div class="library-item-body"><strong>' + item.n + "</strong>" +
          "<span>" + item.t + " &middot; " + minutesLabel(item.m) + " &middot; " + usd(item.c) + " per person</span></div>";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "library-add";
        btn.setAttribute("aria-label", "Add " + item.n + " to your plan");
        btn.textContent = "+";
        btn.addEventListener("click", function () {
          var target = Number($("#planner-target-day").value || 0);
          state.days[target].push(Object.assign({}, item));
          state.days[target].sort(function (a, b) { return a.t.localeCompare(b.t); });
          renderBoard();
          announce(item.n + " added to Day " + (target + 1) + ".");
        });
        row.appendChild(btn);
        libraryEl.appendChild(row);
        void i;
      });
    }

    var live = null;
    function announce(msg) {
      if (!live) {
        live = document.createElement("p");
        live.className = "visually-hidden";
        live.setAttribute("role", "status");
        live.setAttribute("aria-live", "polite");
        plannerRoot.appendChild(live);
      }
      live.textContent = msg;
    }

    function renderBoard() {
      board.innerHTML = "";
      state.days.forEach(function (stops, dayIndex) {
        var day = document.createElement("article");
        day.className = "planner-day";

        var dayCost = stops.reduce(function (sum, s) { return sum + s.c; }, 0) * state.party;
        var dayMinutes = stops.reduce(function (sum, s) { return sum + s.m; }, 0);

        var head = document.createElement("div");
        head.className = "planner-day-head";
        head.innerHTML =
          "<h3>Day " + (dayIndex + 1) + "</h3>" +
          '<span class="pill pill-moss">' + usd(dayCost) + " &middot; " + minutesLabel(dayMinutes) + "</span>";
        day.appendChild(head);

        if (!stops.length) {
          var empty = document.createElement("p");
          empty.className = "planner-empty";
          empty.textContent = "No stops yet. Pick a day above, then add stops from the list on the left.";
          day.appendChild(empty);
        } else {
          var list = document.createElement("ul");
          list.className = "planner-stops";
          stops.forEach(function (stop, stopIndex) {
            var li = document.createElement("li");
            li.className = "planner-stop";
            li.innerHTML =
              '<span class="planner-stop-time">' + stop.t + "</span>" +
              '<span class="planner-stop-body"><strong>' + stop.n + "</strong><span>" +
              stop.d + " &middot; " + minutesLabel(stop.m) + " &middot; " + usd(stop.c) + " per person</span></span>";
            var rm = document.createElement("button");
            rm.type = "button";
            rm.className = "planner-remove";
            rm.setAttribute("aria-label", "Remove " + stop.n + " from Day " + (dayIndex + 1));
            rm.innerHTML = "&times;";
            rm.addEventListener("click", function () {
              state.days[dayIndex].splice(stopIndex, 1);
              renderBoard();
              announce(stop.n + " removed.");
            });
            li.appendChild(rm);
            list.appendChild(li);
          });
          day.appendChild(list);
        }
        board.appendChild(day);
      });

      renderTargetOptions();
      renderSummary();
      persist();
    }

    function renderTargetOptions() {
      var sel = $("#planner-target-day");
      var current = Number(sel.value || 0);
      sel.innerHTML = "";
      state.days.forEach(function (_, i) {
        var opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = "Day " + (i + 1);
        sel.appendChild(opt);
      });
      sel.value = String(Math.min(current, state.days.length - 1));
    }

    function renderSummary() {
      var allStops = state.days.reduce(function (a, d) { return a.concat(d); }, []);
      var perPerson = allStops.reduce(function (s, x) { return s + x.c; }, 0);
      var totalMinutes = allStops.reduce(function (s, x) { return s + x.m; }, 0);
      summaryEl.innerHTML =
        '<div class="planner-summary-row"><span>Days planned</span><strong>' + state.days.length + "</strong></div>" +
        '<div class="planner-summary-row"><span>Stops added</span><strong>' + allStops.length + "</strong></div>" +
        '<div class="planner-summary-row"><span>Time on plan</span><strong>' + minutesLabel(totalMinutes) + "</strong></div>" +
        '<div class="planner-summary-row"><span>Activity cost per person</span><strong>' + usd(perPerson) + "</strong></div>" +
        '<div class="planner-summary-row"><span>Activity cost for ' + state.party + " traveler" + (state.party > 1 ? "s" : "") +
        "</span><strong>" + usd(perPerson * state.party) + "</strong></div>";
    }

    function persist() {
      // Only cache the plan once the visitor has made a cookie choice.
      var consent = readConsent();
      if (!consent) return;
      try { localStorage.setItem("wildroot_plan_v1", JSON.stringify(state)); }
      catch (err) { /* ignore quota or private-mode errors */ }
    }

    function restore() {
      var consent = readConsent();
      if (!consent) return false;
      try {
        var saved = JSON.parse(localStorage.getItem("wildroot_plan_v1") || "null");
        if (saved && Array.isArray(saved.days) && saved.days.length) {
          state = saved;
          if (destSelect) destSelect.value = state.dest;
          if (partySize) partySize.value = String(state.party);
          return true;
        }
      } catch (err) { /* corrupted cache, start fresh */ }
      return false;
    }

    if (destSelect) destSelect.addEventListener("change", function () {
      state.dest = destSelect.value;
      renderLibrary();
      persist();
    });
    if (partySize) partySize.addEventListener("change", function () {
      state.party = Math.max(1, Math.min(12, Number(partySize.value) || 1));
      partySize.value = String(state.party);
      renderBoard();
    });
    if (addDayBtn) addDayBtn.addEventListener("click", function () {
      if (state.days.length >= 14) { announce("Fourteen days is the maximum for one plan."); return; }
      state.days.push([]);
      renderBoard();
      announce("Day " + state.days.length + " added.");
    });
    if (resetBtn) resetBtn.addEventListener("click", function () {
      state.days = [[], [], []];
      renderBoard();
      announce("Plan cleared. Three empty days are ready.");
    });
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

    restore();
    renderLibrary();
    renderBoard();
  }

  /* ---------------------------------------------------------------------
     11. Packing checklist progress
     --------------------------------------------------------------------- */
  $$("[data-checklist]").forEach(function (listWrap) {
    var boxes = $$("input[type='checkbox']", listWrap);
    var fill = $(".progress-fill", listWrap);
    var label = $("[data-checklist-count]", listWrap);
    function update() {
      var done = boxes.filter(function (b) { return b.checked; }).length;
      var pct = boxes.length ? Math.round((done / boxes.length) * 100) : 0;
      if (fill) {
        fill.style.width = pct + "%";
        var track = fill.parentElement;
        if (track) {
          track.setAttribute("role", "progressbar");
          track.setAttribute("aria-valuemin", "0");
          track.setAttribute("aria-valuemax", "100");
          track.setAttribute("aria-valuenow", String(pct));
          track.setAttribute("aria-label", "Packing progress");
        }
      }
      if (label) label.textContent = done + " of " + boxes.length + " packed (" + pct + "%)";
    }
    boxes.forEach(function (b) { b.addEventListener("change", update); });
    var clear = $("[data-checklist-clear]", listWrap);
    if (clear) clear.addEventListener("click", function () {
      boxes.forEach(function (b) { b.checked = false; });
      update();
    });
    update();
  });

  /* ---------------------------------------------------------------------
     12. Pricing monthly / annual toggle
     --------------------------------------------------------------------- */
  var billingToggle = $("[data-billing-toggle]");
  if (billingToggle) {
    var buttons = $$("button", billingToggle);
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.dataset.billing;
        buttons.forEach(function (b) {
          var on = b === btn;
          b.setAttribute("aria-pressed", String(on));
          b.classList.toggle("btn-primary", on);
          b.classList.toggle("btn-ghost", !on);
        });
        $$("[data-price-monthly]").forEach(function (el) {
          el.textContent = mode === "annual" ? el.dataset.priceAnnual : el.dataset.priceMonthly;
        });
        $$("[data-period-label]").forEach(function (el) {
          el.textContent = mode === "annual" ? "per month, billed annually" : "per month, billed monthly";
        });
        $$("[data-annual-note]").forEach(function (el) {
          el.hidden = mode !== "annual";
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
     13. Footer year
     --------------------------------------------------------------------- */
  $$("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
