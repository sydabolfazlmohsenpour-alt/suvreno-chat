"use strict";
/* =====================================================================
   Suvreno — انتخابگرِ تمِ رنگی (دور ۵۰)
   • انتخاب در localStorage با کلیدِ SUV_COLOR ذخیره می‌شود و اسکریپتِ کوچکِ <head>
     (index.html و login.html) آن را قبل از رندر روی <html data-color> می‌گذارد.
   • رنگ‌های اپ را theme.css با متغیرها می‌سازد؛ این فایل فقط: ذخیره/اعمال، کارت‌های تنظیمات،
     theme-color مرورگر و هم‌رنگ‌کردنِ لوگو (بازسازیِ وکتوری با رنگ‌های تم).
   • مستقل از script.js/theme.js است و کاملاً داخل try/catch؛ اگر خراب شود فقط تمِ پیش‌فرض می‌ماند.
   ===================================================================== */
(function () {
  var KEY = "SUV_COLOR", DEF = "firouzeh";

  /* stops: سه رنگِ گرادیانِ لوگو (null = لوگوی اصلی بدونِ تغییر) */
  var THEMES = [
    { id: "firouzeh", fa: "شبِ فیروزه", en: "Turquoise Night", dot: "linear-gradient(135deg,#14b8a6,#2de2c8 55%,#ffc857)", meta: ["#060a14", "#f4f8f8"], stops: null },
    { id: "suvreno",  fa: "Suvreno",    en: "Suvreno",         dot: "linear-gradient(135deg,#00cfff,#7b4dff 55%,#ff4be4)", meta: ["#070812", "#f5f4ff"], stops: ["#00cfff", "#7b4dff", "#ff4be4"] },
    { id: "minimal",  fa: "مینیمال",     en: "Minimal",         dot: "linear-gradient(135deg,#5b7cf0,#c2cbe0)",              meta: ["#0b0c10", "#f5f6f8"], stops: ["#5b7cf0", "#8fa8ff", "#dfe5f5"] },
    { id: "amoled",   fa: "AMOLED",     en: "AMOLED",          dot: "linear-gradient(135deg,#000 35%,#c6ff3d)",             meta: ["#000000", "#fafbf6"], stops: ["#6fbf00", "#c6ff3d", "#f4ffc4"] },
    { id: "sunset",   fa: "غروب",        en: "Sunset",          dot: "linear-gradient(135deg,#b86bff,#ff8a3d 55%,#ffd166)", meta: ["#0f0a14", "#fff6ee"], stops: ["#8b5cf6", "#ff6b6b", "#ffb347"] },
    { id: "forest",   fa: "جنگل",        en: "Forest",          dot: "linear-gradient(135deg,#2f9e5f,#5fd08a 55%,#d9c27a)", meta: ["#07100c", "#f3f9f4"], stops: ["#2f9e5f", "#6fc4b8", "#d9c27a"] }
  ];
  function find(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i]; return null; }

  var root = document.documentElement;

  function stored() {
    var c = "";
    try { c = localStorage.getItem(KEY) || ""; } catch (e) {}
    return find(c) ? c : DEF;
  }
  function cur() { return find(root.getAttribute("data-color")) || find(DEF); }
  function isEn() { return /^en/i.test(root.getAttribute("lang") || ""); }

  /* ---------------- theme-color مرورگر ---------------- */
  function updateMeta() {
    try {
      var m = document.querySelector('meta[name="theme-color"]');
      if (!m) return;
      var light = root.getAttribute("data-theme") === "light";
      m.setAttribute("content", cur().meta[light ? 1 : 0]);
    } catch (e) {}
  }

  /* ---------------- لوگوی اختصاصیِ هر تم (دور ۵۶) ----------------
     هر تمِ غیرِ پیش‌فرض یک لوگوی آماده دارد (فایلِ logo-themes.js، شیء window.AM_LOGO_THEMES با کلیدِ شناسه‌ی تم)؛
     لوگوها از روی لوگوی اصلی با حفظِ شکل/سایه/برق و رنگ‌های همان تم ساخته شده‌اند، پس طبیعی و یکدست‌اند.
     تمِ پیش‌فرض (stops=null) لوگوی اصلیِ logo-data.js را نشان می‌دهد. فایلِ لوگوها فقط وقتی لازم شود لود می‌شود. */
  var LOGO_FILE = "logo-themes.js?v=1";
  var _logoLoading = false, _logoSet = null, _logoSetFor = null;
  function logoMap() { return window.AM_LOGO_THEMES || null; }
  function themedSet() {
    var m = logoMap();
    if (!m) return null;
    if (_logoSet && _logoSetFor === m) return _logoSet;
    _logoSet = {}; _logoSetFor = m;
    for (var k in m) if (m[k]) _logoSet[m[k]] = k;
    return _logoSet;
  }
  function loadLogoFile() {
    if (logoMap() || _logoLoading) return;
    _logoLoading = true;
    try {
      var s = document.createElement("script");
      s.src = LOGO_FILE; s.async = true;
      s.onload = function () { _logoLoading = false; applyLogos(); };
      s.onerror = function () { _logoLoading = false; };
      (document.head || root).appendChild(s);
    } catch (e) { _logoLoading = false; }
  }
  function handleImg(img) {
    try {
      var th = cur(), src = img.getAttribute("src") || "";
      if (!src) return;
      var set = themedSet(), isThemed = !!(set && set[src]);
      if (!isThemed) img.__suvOrig = src;           // آخرین تصویرِ اصلی که script.js/login.js گذاشته
      var orig = img.__suvOrig;
      if (!th.stops) { if (isThemed && orig) img.setAttribute("src", orig); return; }   // لوگوی اصلی
      var m = logoMap();
      if (!m || !m[th.id]) { loadLogoFile(); return; }  // تا لودِ فایل، همان لوگوی اصلی می‌ماند
      if (src !== m[th.id]) img.setAttribute("src", m[th.id]);
    } catch (e) {}
  }
  function applyLogos() {
    try { var l = document.querySelectorAll("img.am-logo-img"); for (var i = 0; i < l.length; i++) handleImg(l[i]); } catch (e) {}
  }

  var _mo = null, _tm = 0;
  function schedule() { clearTimeout(_tm); _tm = setTimeout(applyLogos, 120); }
  function watchLogos() {
    try {
      if (_mo) { _mo.disconnect(); _mo = null; }
      if (!cur().stops || !window.MutationObserver || !document.body) return;
      _mo = new MutationObserver(function (recs) {
        for (var i = 0; i < recs.length; i++) {
          var r = recs[i];
          if (r.type === "attributes") { schedule(); return; }
          for (var j = 0; j < r.addedNodes.length; j++) { var nd = r.addedNodes[j]; if (nd.nodeType === 1) { schedule(); return; } }
        }
      });
      _mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
    } catch (e) {}
  }

  /* ---------------- اعمال و ذخیره ---------------- */
  function apply(id, save) {
    var th = find(id) || find(DEF);
    root.setAttribute("data-color", th.id);
    if (save) { try { localStorage.setItem(KEY, th.id); } catch (e) {} }
    updateMeta();
    markCards();
    applyLogos();
    watchLogos();
  }

  /* ---------------- کارت‌های تنظیمات ---------------- */
  function markCards() {
    try {
      var c = cur().id, row = document.getElementById("colorThemeRow");
      if (!row) return;
      var bs = row.querySelectorAll("[data-color-choice]");
      for (var i = 0; i < bs.length; i++) {
        var on = bs[i].getAttribute("data-color-choice") === c;
        bs[i].classList.toggle("active", on);
        bs[i].setAttribute("aria-pressed", on ? "true" : "false");
      }
    } catch (e) {}
  }
  function labels() {
    try {
      var en = isEn(), lab = document.getElementById("colorThemeLabel");
      if (lab) lab.textContent = en ? "Color theme" : "تمِ رنگی";
      var bs = document.querySelectorAll("#colorThemeRow [data-color-choice]");
      for (var i = 0; i < bs.length; i++) {
        var th = find(bs[i].getAttribute("data-color-choice")), sp = bs[i].querySelector(".cs-name");
        if (th && sp) sp.textContent = en ? th.en : th.fa;
      }
    } catch (e) {}
  }
  function wireUI() {
    var row = document.getElementById("colorThemeRow");
    if (!row) return;
    var bs = row.querySelectorAll("[data-color-choice]");
    for (var i = 0; i < bs.length; i++) {
      var th = find(bs[i].getAttribute("data-color-choice")), dot = bs[i].querySelector(".cs-dot");
      if (th && dot) dot.style.background = th.dot;
    }
    row.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-color-choice]") : null;
      if (b) apply(b.getAttribute("data-color-choice"), true);
    });
    labels(); markCards();
  }

  function init() {
    apply(stored(), false);
    wireUI();
    try {
      if (window.MutationObserver) {
        new MutationObserver(function (recs) {
          for (var i = 0; i < recs.length; i++) {
            var a = recs[i].attributeName;
            if (a === "data-theme") updateMeta();
            else if (a === "lang") labels();
            else if (a === "data-color") { /* از جای دیگری عوض شد */ markCards(); }
          }
        }).observe(root, { attributes: true, attributeFilter: ["data-theme", "lang", "data-color"] });
      }
    } catch (e) {}
    /* لوگوها معمولاً کمی بعد از لود توسط script.js/login.js جایگزین می‌شوند */
    setTimeout(applyLogos, 400); setTimeout(applyLogos, 1500);
  }

  window.SuvColor = { list: THEMES, get: function () { return cur().id; }, set: function (id) { apply(id, true); } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
