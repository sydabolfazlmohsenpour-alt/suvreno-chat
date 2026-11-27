/* پیام «نسخه جدید اپ» — فقط داخل اپ اندروید و فقط برای نسخه‌های قدیمی‌تر از TARGET.
   بدون ساخت APK جدید با همین فایل وب کار می‌کند. نسخه‌ی هدف/متن را همین‌جا عوض کنید. */
(function () {
  "use strict";
  var TARGET = "2.4.4";
  var URL_DL = "https://suvreno.ir/download.html";
  var KEY = "SUV_UPD_NOTICE";

  function inApp() {
    try { return /SuvrenoApp/i.test(navigator.userAgent || "") || !!window.SuvrenoNative; } catch (e) { return false; }
  }
  function parts(v) {
    var m = String(v || "").match(/\d+/g) || [];
    return [+m[0] || 0, +m[1] || 0, +m[2] || 0];
  }
  function isOlder(a, b) {
    var x = parts(a), y = parts(b);
    for (var i = 0; i < 3; i++) { if (x[i] !== y[i]) return x[i] < y[i]; }
    return false;
  }
  function appVersion() {
    try {
      var i = JSON.parse(window.SuvrenoNative.info());
      return i && i.version ? String(i.version) : "";
    } catch (e) { return ""; }
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  function show() {
    if (document.getElementById("suvUpdSheet")) return;
    var css = document.createElement("style");
    css.textContent =
      "#suvUpdBack{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .25s}" +
      "#suvUpdSheet{width:100%;max-width:520px;box-sizing:border-box;background:var(--surface,#1b1b22);color:var(--text,#fff);border-radius:22px 22px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom));direction:rtl;font-family:inherit;transform:translateY(100%);transition:transform .3s ease;box-shadow:0 -8px 30px rgba(0,0,0,.35)}" +
      "#suvUpdBack.on{opacity:1}#suvUpdBack.on #suvUpdSheet{transform:none}" +
      "#suvUpdSheet h3{margin:0 0 8px;font-size:18px}" +
      "#suvUpdSheet p{margin:0 0 16px;line-height:1.9;font-size:14px;opacity:.9}" +
      "#suvUpdSheet .r{display:flex;gap:10px}" +
      "#suvUpdSheet button{flex:1;border:0;border-radius:12px;padding:13px 10px;font-size:15px;font-family:inherit;cursor:pointer}" +
      "#suvUpdDl{background:var(--accent,#6c5ce7);color:#fff;font-weight:700}" +
      "#suvUpdLater{background:rgba(127,127,127,.2);color:inherit}";
    document.head.appendChild(css);
    var back = document.createElement("div");
    back.id = "suvUpdBack";
    back.innerHTML =
      '<div id="suvUpdSheet" role="dialog" aria-modal="true">' +
      "<h3>نسخه‌ی جدید سوورنو آمده 🎉</h3>" +
      "<p>در نسخه‌ی جدید، سوورنو <b>بدون فیلترشکن</b> هم باز می‌شود. اگر قبلاً برای باز شدن اپ مشکل داشتید، نسخه‌ی جدید را دانلود کنید.</p>" +
      '<div class="r"><button id="suvUpdDl" type="button">دانلود نسخه جدید</button>' +
      '<button id="suvUpdLater" type="button">بعداً</button></div></div>';
    document.body.appendChild(back);
    requestAnimationFrame(function () { requestAnimationFrame(function () { back.classList.add("on"); }); });
    function close() {
      back.classList.remove("on");
      setTimeout(function () { try { back.remove(); css.remove(); } catch (e) {} }, 320);
    }
    document.getElementById("suvUpdDl").addEventListener("click", function () {
      try { window.open(URL_DL, "_blank", "noopener"); } catch (e) { location.href = URL_DL; }
      close();
    });
    function later() { var s = load(); s.skip = 1; save(s); close(); }
    document.getElementById("suvUpdLater").addEventListener("click", later);
    back.addEventListener("click", function (e) { if (e.target === back) later(); });
  }

  function run() {
    if (!inApp()) return;
    var v = appVersion();
    if (v && !isOlder(v, TARGET)) return; /* نسخه‌ی جدید یا برابر: پیام نشان نده */
    /* شمارش «ورود»: فقط یک بار برای هر بار باز شدن اپ */
    try { if (sessionStorage.getItem(KEY + "_c")) return; sessionStorage.setItem(KEY + "_c", "1"); } catch (e) {}
    var s = load();
    if (s.skip > 0) { s.skip -= 1; save(s); return; } /* بعد از «بعداً»: یک ورود رد شود */
    setTimeout(show, 2500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
