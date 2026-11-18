/* =====================================================
   Suvreno — کارت تبلیغ دانلود اپ اندروید (فقط در مرورگر)
   - داخل اپ نصب‌شده / PWA نمایش داده نمی‌شه
   - فقط روی گوشی اندرویدی نمایش داده می‌شه
   - چند ثانیه بعد از ورود ظاهر می‌شه
   - با دکمه ✕ بسته می‌شه و بعد از ۱ ساعت دوباره نمایش داده می‌شه
   ===================================================== */
(function () {
    "use strict";

    var APK_URL = "https://suvreno.ir/download.html";   // صفحهٔ دانلود اپ (نه فایل مستقیم)
    var ICON_URL = "https://suvreno.ir/suvreno-icon-512.png";
    var SHOW_DELAY_MS = 6000;               // چند ثانیه بعد از ورود
    var REPEAT_MS = 60 * 60 * 1000;         // بعد از بستن: ۱ ساعت
    var KEY = "suv_app_promo_closed_at";

    function mm(q) {
        try { return !!(window.matchMedia && window.matchMedia(q).matches); }
        catch (e) { return false; }
    }

    /* آیا داخل خودِ اپ (یا حالت نصب‌شده) هستیم؟ */
    function inApp() {
        try {
            if (document.documentElement.classList.contains("in-app")) return true;
            if (/SuvrenoApp/i.test(navigator.userAgent)) return true;
            if (window.Capacitor) return true;
            if (mm("(display-mode: standalone)") ||
                mm("(display-mode: fullscreen)") ||
                mm("(display-mode: minimal-ui)") ||
                navigator.standalone) return true;
            if (/^android-app:\/\//i.test(document.referrer || "")) {
                try { sessionStorage.setItem("suv_in_app", "1"); } catch (e) {}
                return true;
            }
            try {
                if (sessionStorage.getItem("suv_in_app") === "1") return true;
            } catch (e) {}
        } catch (e) {}
        return false;
    }

    if (inApp()) return;
    if (!/Android/i.test(navigator.userAgent)) return;   // APK فقط روی اندروید نصب می‌شه

    function lastClosed() {
        try { return parseInt(localStorage.getItem(KEY) || "0", 10) || 0; }
        catch (e) { return 0; }
    }

    function markClosed() {
        try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    }

    function waitMs() {
        var left = lastClosed() + REPEAT_MS - Date.now();
        return left > 0 ? left : 0;
    }

    var card = null;
    var timer = null;

    function injectStyle() {
        if (document.getElementById("suvAppPromoStyle")) return;
        var s = document.createElement("style");
        s.id = "suvAppPromoStyle";
        s.textContent =
            ".suv-app-promo{position:fixed;left:12px;right:12px;bottom:90px;z-index:80;" +
            "max-width:460px;margin-inline:auto;display:flex;align-items:center;gap:11px;" +
            "padding:11px 12px;border-radius:20px;direction:rtl;text-align:right;" +
            "font-family:inherit;color:#f3f6ff;" +
            "background:linear-gradient(135deg,rgba(18,34,66,.96),rgba(34,22,74,.96));" +
            "border:1px solid rgba(143,184,255,.30);" +
            "box-shadow:0 14px 40px rgba(0,0,0,.45),0 0 28px rgba(118,92,255,.20);" +
            "opacity:0;transform:translateY(18px);pointer-events:none;" +
            "transition:opacity .35s ease,transform .35s ease}" +
            ".suv-app-promo.show{opacity:1;transform:translateY(0);pointer-events:auto}" +
            ".suv-app-promo img{width:44px;height:44px;border-radius:12px;flex-shrink:0;object-fit:cover}" +
            ".suv-app-promo-text{flex:1;min-width:0;line-height:1.55}" +
            ".suv-app-promo-text strong{display:block;font-size:14px;font-weight:800}" +
            ".suv-app-promo-text span{display:block;font-size:12px;color:#aebbd3}" +
            ".suv-app-promo-text a.suv-app-promo-help{display:block;margin-top:2px;font-size:11.5px;color:#8fb8ff;text-decoration:underline}" +
            ".suv-app-promo-btn{flex-shrink:0;padding:9px 14px;border-radius:13px;" +
            "color:#fff;text-decoration:none;font-size:13px;font-weight:800;white-space:nowrap;" +
            "background:linear-gradient(110deg,#39c7ff,#6971ff 50%,#d84dff)}" +
            ".suv-app-promo-close{flex-shrink:0;width:30px;height:30px;border:0;border-radius:50%;" +
            "background:rgba(255,255,255,.09);color:#cfd8ea;font-size:15px;line-height:1;cursor:pointer;" +
            "display:flex;align-items:center;justify-content:center;padding:0}";
        document.head.appendChild(s);
    }

    function build() {
        card = document.createElement("div");
        card.className = "suv-app-promo";
        card.setAttribute("role", "complementary");
        card.innerHTML =
            '<img alt="" width="44" height="44">' +
            '<div class="suv-app-promo-text">' +
            "<strong>اپ Suvreno را نصب کن</strong>" +
            "<span>تمام‌صفحه، سریع‌تر و همیشه روی صفحه گوشی</span>" +
            '<a class="suv-app-promo-help" href="install-help.html" target="_blank" rel="noopener">هشدار موقع نصب دیدی؟ راهنما</a>' +
            "</div>" +
            '<a class="suv-app-promo-btn" target="_blank" rel="noopener">دانلود اپ</a>' +
            '<button type="button" class="suv-app-promo-close" aria-label="بستن">✕</button>';

        var img = card.querySelector("img");
        img.src = ICON_URL;
        img.onerror = function () { img.style.display = "none"; };

        var link = card.querySelector(".suv-app-promo-btn");
        link.href = APK_URL;
        link.addEventListener("click", function () {
            markClosed();
            hide();
        });

        card.querySelector("button").addEventListener("click", function () {
            markClosed();
            hide();
            schedule(REPEAT_MS);
        });

        document.body.appendChild(card);
    }

    /* کارت درست بالای نوار پیام قرار بگیره */
    function place() {
        if (!card) return;
        var wrap = document.querySelector(".composer-wrap");
        var bottom = 90;
        if (wrap) {
            var r = wrap.getBoundingClientRect();
            if (r.height > 0) {
                bottom = Math.max(12, Math.round(window.innerHeight - r.top + 10));
            }
        }
        card.style.bottom = bottom + "px";
    }

    function modalOpen() {
        return !!document.querySelector(
            ".modal.show, .delete-modal.show, .voice-notebook-fullscreen.show, #sidebar.open"
        );
    }

    function show() {
        if (waitMs() > 0) { schedule(waitMs()); return; }
        if (modalOpen()) { schedule(4000); return; }
        injectStyle();
        if (!card) build();
        place();
        requestAnimationFrame(function () {
            card.classList.add("show");
        });
    }

    function hide() {
        if (card) card.classList.remove("show");
    }

    function schedule(ms) {
        clearTimeout(timer);
        timer = setTimeout(show, ms);
    }

    window.addEventListener("resize", place);

    try {
        var wrapEl = document.querySelector(".composer-wrap");
        if (wrapEl && window.ResizeObserver) {
            new ResizeObserver(place).observe(wrapEl);
        }
    } catch (e) {}

    function start() {
        schedule(Math.max(SHOW_DELAY_MS, waitMs()));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
