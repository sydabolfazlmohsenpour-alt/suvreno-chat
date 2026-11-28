/* دکمه‌ی «گفت‌وگوی جدید»: آیکونِ اختصاصی (بدون ایموجی)، تا قبل از اولین پیام پنهان است و بعد از آن نرم ظاهر می‌شود.
   استایل در <head> صفحه (id=ncStyle) است تا قبل از اجرای اسکریپت هم دکمه نپرده. */
(function () {
  "use strict";
  var btn = document.getElementById("newChatHeaderBtn");
  var box = document.getElementById("messages");
  if (!btn || !box) return;
  btn.classList.add("nc-btn");
  btn.setAttribute("title", "گفت‌وگوی جدید");
  btn.innerHTML =
    '<svg class="nc-ic" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">' +
    '<defs><linearGradient id="ncg" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">' +
    '<stop offset="0" stop-color="#38a8ff"/><stop offset=".55" stop-color="#7b5cff"/><stop offset="1" stop-color="#ff4fa3"/></linearGradient></defs>' +
    '<path d="M5 4.5h14A2.5 2.5 0 0 1 21.5 7v8a2.5 2.5 0 0 1-2.5 2.5h-6.1l-4.4 3.3v-3.3H5A2.5 2.5 0 0 1 2.5 15V7A2.5 2.5 0 0 1 5 4.5z" stroke="url(#ncg)" stroke-width="1.7" stroke-linejoin="round"/>' +
    '<path d="M12 7.6l.95 2.25 2.25.95-2.25.95-.95 2.25-.95-2.25-2.25-.95 2.25-.95z" fill="url(#ncg)"/></svg>';
  var on = null;
  function upd() {
    var has = !!box.querySelector(".message");
    if (has === on) return;
    on = has;
    btn.classList.toggle("nc-on", has);
    btn.setAttribute("aria-hidden", has ? "false" : "true");
    btn.tabIndex = has ? 0 : -1;
  }
  try { new MutationObserver(upd).observe(box, { childList: true, subtree: true }); } catch (e) {}
  upd();
})();
