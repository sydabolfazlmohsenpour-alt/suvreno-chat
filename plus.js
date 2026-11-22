"use strict";
/* Suvreno network failover (net.js)
   آدرس workers.dev در ایران اغلب فیلتر/کند است. این فایل قبل از هر درخواست به Worker، بین دامنه‌ی اختصاصی
   (api.suvreno.ir / plus-api.suvreno.ir) و آدرس قدیمی workers.dev سریع‌ترین مسیرِ سالم را انتخاب و به‌خاطر می‌سپارد.
   اگر دامنه‌ی اختصاصی هنوز ساخته نشده باشد، همه‌چیز مثل قبل روی workers.dev می‌ماند. */
(function () {
  if (window.__suvNet) return;
  try {
    var raw = window.fetch.bind(window);
    var GROUPS = [
      { key: "m", id: "https://suvreno.sydabolfazlmohsenpour.workers.dev/", bases: ["https://api.suvreno.ir/", "https://suvreno.sydabolfazlmohsenpour.workers.dev/"] },
      { key: "p", id: "https://suvreno-plus.sydabolfazlmohsenpour.workers.dev/", bases: ["https://plus-api.suvreno.ir/", "https://suvreno-plus.sydabolfazlmohsenpour.workers.dev/"] }
    ];
    var LS = "suv_net_v1", TTL = 20 * 60 * 1000, best = {}, pend = {}, stamp = 0;
    try {
      var c = JSON.parse(localStorage.getItem(LS) || "null");
      if (c && c.b && c.t) { stamp = c.t; for (var k in c.b) { if (typeof c.b[k] === "string") best[k] = c.b[k]; } }
    } catch (e) {}
    function save() {
      try { stamp = Date.now(); localStorage.setItem(LS, JSON.stringify({ t: stamp, b: best })); } catch (e) {}
    }
    function probe(g) {
      if (pend[g.key]) return pend[g.key];
      var p = new Promise(function (resolve) {
        var done = false, fails = 0, n = g.bases.length;
        function fail() { fails++; if (!done && fails >= n) { done = true; resolve(g.id); } }
        g.bases.forEach(function (b) {
          var ac = new AbortController(), tm = setTimeout(function () { ac.abort(); }, 4500);
          raw(b + "ping?t=" + Date.now(), { method: "GET", cache: "no-store", signal: ac.signal })
            .then(function (r) { return r && r.ok ? r.json() : null; })
            .then(function (j) {
              clearTimeout(tm);
              if (j && j.ok === true) { if (!done) { done = true; best[g.key] = b; save(); resolve(b); } } else fail();
            })
            .catch(function () { clearTimeout(tm); fail(); });
        });
      });
      pend[g.key] = p;
      p.then(function () { setTimeout(function () { delete pend[g.key]; }, 1500); });
      return p;
    }
    function pick(g) {
      var b = best[g.key];
      if (b) {
        if (Date.now() - stamp > TTL) { stamp = Date.now(); probe(g); }
        return Promise.resolve(b);
      }
      return probe(g);
    }
    function groupOf(u) {
      for (var i = 0; i < GROUPS.length; i++) if (u.indexOf(GROUPS[i].id) === 0) return GROUPS[i];
      return null;
    }
    window.fetch = function (input, init) {
      var u = "";
      try { u = typeof input === "string" ? input : (input && input.url) || ""; } catch (e) {}
      var g = u ? groupOf(u) : null;
      if (!g) return raw(input, init);
      var path = u.slice(g.id.length);
      function send(base) {
        var nu = base + path;
        return raw(typeof input === "string" ? nu : new Request(nu, input), init);
      }
      return pick(g).then(function (base) {
        return send(base).catch(function (err) {
          if ((err && err.name === "AbortError") || (init && init.signal && init.signal.aborted)) throw err;
          if (best[g.key] === base) delete best[g.key];
          return probe(g).then(function (b2) {
            if (b2 === base) throw err;
            return send(b2);
          });
        });
      });
    };
    window.__suvNet = { best: best, probe: function () { return Promise.all(GROUPS.map(probe)); } };
    setTimeout(function () { GROUPS.forEach(pick); }, 0);
  } catch (e) { /* در صورت هر مشکل، رفتار قبلی حفظ می‌شود */ }
})();

/* =====================================================================
   Suvreno Plus — لایه‌ی فرانت‌اند (فایل جدا؛ فقط با یک خط <script> به index.html وصل می‌شه)
   هر خطایی اینجا رخ بده، اپ اصلی و پلن رایگان دست‌نخورده کار می‌کنن.
   ⚠️ منبع حقیقتِ پلن‌ها/قیمت‌ها/سهمیه‌ها/کیف پول/انقضا فقط Worker (plus-worker.js) است. این فایل فقط وضعیتِ برگشتی از /plus-status رو نشون می‌ده و
   «درخواست» می‌فرسته (فقط کلید پلن p7/p14 و نشست)؛ هیچ قیمت، مبلغ، شناسه‌ی کاربر یا سهمیه‌ای از این‌جا کنترل نمی‌شه. isPlus() فقط برای انتخاب مسیر
   و نمایش است؛ اگه دستکاری بشه Worker همچنان همه‌ی سقف‌ها و اعتبار رو خودش اعمال می‌کنه.
   پرداخت: کارت‌به‌کارت با تأیید دستی ادمین (بلوک «پرداخت کارت‌به‌کارت»)؛ اگه Worker مقدار payMode=zarinpal بده، مسیر درگاه قبلی خودکار فعال می‌شه.
   ===================================================================== */
(function () {
  try {
    /* ⚠️ این دو آدرس رو بعد از ساخت Worker جدید چک/اصلاح کن */
    const MAIN_URL = "https://suvreno.sydabolfazlmohsenpour.workers.dev/";
    const PLUS_URL = "https://suvreno-plus.sydabolfazlmohsenpour.workers.dev/";

    const origFetch = window.fetch.bind(window);
    const isEn = () => (localStorage.getItem("AM_LANG_PREF") || "") === "en";
    const t = (fa, en) => (isEn() ? en : fa);
    const num = (n) => Number(n).toLocaleString(isEn() ? "en-US" : "fa-IR");
    const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    /* ---------- وضعیت ---------- */
    let TOKEN = "";
    const findToken = () => {
      try {
        const main = localStorage.getItem("SUVRENO_SESSION") || ""; // کلید رسمی نشست در script.js
        if (main) return main;
      } catch {}
      return "";
    };
    let state = { plus: false, expiresAt: 0, priceToman: 139000, days: 14, limits: {}, features: {}, signedIn: false };
    try { Object.assign(state, JSON.parse(localStorage.getItem("SUV_PLUS_STATE") || "{}")); } catch {}
    const isPlus = () => !!state.plus && Number(state.expiresAt) > Date.now();
    /* فیلدهایی که مخصوص «همین کاربر» هستن؛ با خروج/تعویض حساب باید پاک بشن تا وضعیتِ حسابِ قبلی نمایش داده نشه */
    const USER_FIELDS = { plus: false, expiresAt: 0, planKey: "", planName: "", creditState: "ok", used: {}, refundable: false, refCode: "", refCount: 0, premiumImageLeft: 0, premiumEditLeft: 0, premiumImageUsed: 0, packUntil: 0, packMode: false, creditToman: 0, walletActive: false, daysLeft: 0, signedIn: false, usageUnavailable: false, cardOrder: null, card: null, taste: null };
    const clearUserState = () => Object.assign(state, USER_FIELDS);
    const tokTag = () => findToken().slice(-12);
    if (!findToken() || state.tokTag !== tokTag()) clearUserState(); // نشست عوض شده/وجود نداره: وضعیتِ ذخیره‌شده معتبر نیست
    const planLabel = () => state.planKey === "pk" ? t("اعتبار جداگانه", "Credit pack") : (state.planName || (state.planKey === "p7" ? "Suvreno Start" : "Suvreno Plus"));
    const planShort = () => (state.planKey === "p7" ? "START" : state.planKey === "pk" ? "CREDIT" : "PLUS");

    async function plusCall(payload, timeout = 15000) {
      const ac = new AbortController();
      const tm = setTimeout(() => ac.abort(), timeout);
      try {
        const body = { ...payload }; const tk = findToken(); if (tk) body.sessionToken = tk;
        const r = await origFetch(PLUS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ac.signal });
        return await r.json();
      } finally { clearTimeout(tm); }
    }
    /* عددِ «مصرف امروز» در سایدبار از Worker اصلی می‌آید (سقف رایگان)؛ برای مشترک با عددِ واقعیِ پلن هم‌تراز می‌شود */
    function syncSidebarUsage() {
      try {
        const el = document.getElementById("usageStats");
        if (!el || !isPlus() || state.usageUnavailable) return;
        const mx = state.limits && state.limits.msg;
        if (mx == null) return;
        const txt = (state.features && state.features.creditMode)
          ? "اعتبار باقی‌مانده: " + num(state.creditToman || 0)
          : "مصرف امروز: " + Number((state.used || {}).msg || 0) + " از " + mx + " پیام";
        if (el.textContent !== txt) el.textContent = txt;
      } catch {}
    }
    let usageObs = null;
    function watchSidebarUsage() {
      try {
        const el = document.getElementById("usageStats");
        if (!el || usageObs || typeof MutationObserver === "undefined") return;
        usageObs = new MutationObserver(() => syncSidebarUsage());
        usageObs.observe(el, { childList: true, characterData: true, subtree: true });
      } catch {}
    }
    async function refreshStatus() {
      try {
        const s = await plusCall({ mode: "plus-status" });
        if (s && s.ok) {
          const prevWait = !!(state.cardOrder && (state.cardOrder.status === "submitted" || state.cardOrder.status === "awaiting")), wasPlus = isPlus(), prevExp = Number(state.expiresAt) || 0;
          clearUserState(); // اول فیلدهای کاربر پاک می‌شن، بعد فقط چیزی که سرور گفته میاد (جلوی ماندنِ دیتای کهنه)
          state = { ...state, ...s, tokTag: tokTag() };
          localStorage.setItem("SUV_PLUS_STATE", JSON.stringify(state));
          renderBox(); watchSidebarUsage(); syncSidebarUsage(); renderPill(); renderOrderBanner(); renderInviteSettings(); renderBotLink(false); try { renderTaste(); } catch {}
          if (cardEl && cardEl.isConnected) renderCardSheet();
          if (prevWait && !state.cardOrder && isPlus() && (!wasPlus || Number(state.expiresAt) > prevExp)) toast(t("✨ پرداختت تأیید شد و پلنت فعال شد!", "✨ Your payment was confirmed and your plan is active!"), 6000);
        }
      } catch {}
    }

    /* ---------- استایل ---------- */
    const css = `
.plus-box{margin:0 0 10px;padding:11px 12px;border-radius:16px;background:linear-gradient(135deg,rgba(var(--ac1-rgb),.22),rgba(var(--ac3-rgb),.22),rgba(var(--ac2-rgb),.18));border:1px solid rgba(var(--ac3-rgb),.45);display:flex;align-items:center;gap:10px;cursor:pointer;color:#fff;font-family:inherit;width:100%;text-align:start}
.plus-box:active{transform:scale(.98)}
.plus-box .pb-ic{font-size:calc(22px * var(--fs,1))}.plus-box .pb-t{font-weight:700;font-size:calc(14px * var(--fs,1))}.plus-box .pb-s{font-size:calc(11.5px * var(--fs,1));opacity:.8;margin-top:2px}
.plus-box .pb-go{margin-inline-start:auto;background:linear-gradient(135deg,var(--ac1),var(--ac3));border-radius:10px;padding:6px 11px;font-size:calc(12px * var(--fs,1));font-weight:700;white-space:nowrap}
.plus-pill{display:inline-block;margin-inline-start:6px;padding:1px 7px;border-radius:8px;font-size:calc(9.5px * var(--fs,1));font-weight:700;color:#fff;background:linear-gradient(135deg,var(--ac1),var(--ac3),var(--ac2));vertical-align:middle}
#plusPage{position:fixed;inset:0;z-index:99999;background:#050b18;color:#fff;overflow-y:auto;font-family:inherit;display:none}
#plusPage.open{display:block}
#plusPage .pp-in{max-width:560px;margin:0 auto;padding:18px 16px 48px}
#plusPage .pp-x{position:sticky;top:0;float:inline-end;background:rgba(255,255,255,.1);border:0;color:#fff;width:38px;height:38px;border-radius:50%;font-size:calc(20px * var(--fs,1));cursor:pointer;z-index:2}
#plusPage h1{margin:26px 0 4px;font-size:calc(26px * var(--fs,1));font-weight:700;background:linear-gradient(135deg,var(--ac1),var(--ac3),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent;text-align:center}
#plusPage .pp-sub{text-align:center;opacity:.75;font-size:calc(13px * var(--fs,1));margin-bottom:16px}
#plusPage .pp-price{text-align:center;padding:18px;border-radius:20px;background:linear-gradient(135deg,rgba(var(--ac1-rgb),.2),rgba(var(--ac3-rgb),.2));border:1px solid rgba(var(--ac3-rgb),.5);margin-bottom:18px}
#plusPage .pp-price b{font-size:calc(34px * var(--fs,1));display:block}#plusPage .pp-price span{opacity:.8;font-size:calc(13px * var(--fs,1))}
#plusPage .pp-status{margin-bottom:14px;padding:12px;border-radius:14px;background:rgba(60,200,120,.15);border:1px solid rgba(60,200,120,.5);font-size:calc(13px * var(--fs,1));text-align:center}
#plusPage table{width:100%;border-collapse:collapse;font-size:calc(12.5px * var(--fs,1))}
#plusPage th,#plusPage td{padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.09);text-align:center;vertical-align:middle}
#plusPage th:first-child,#plusPage td:first-child{text-align:start;font-weight:600}
#plusPage th.pl{color:var(--ac-soft)}#plusPage td.pl{color:#fff;font-weight:700;background:rgba(var(--ac3-rgb),.12)}
#plusPage td.fr{opacity:.65}
#plusPage .pp-note{margin-top:14px;font-size:calc(11.5px * var(--fs,1));opacity:.6;text-align:center;line-height:1.7}
#plusPage .pp-pay{display:block;width:100%;max-width:560px;margin:0 auto;border:0;border-radius:16px;padding:15px;font-size:calc(16px * var(--fs,1));font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--ac1),var(--ac3))}
#plusPage .pp-pay[disabled]{opacity:.6}
.plus-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:var(--sv-surface-solid,#1b2540);color:#fff;padding:11px 16px;border-radius:14px;z-index:100000;font-size:calc(13px * var(--fs,1));max-width:88%;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.4)}
.plus-sheet{position:fixed;left:0;right:0;bottom:0;z-index:99998;padding:16px;background:var(--sv-surface-solid,#0d1730);color:#fff;border-top:1px solid rgba(var(--ac3-rgb),.5);border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.5);text-align:center}
.plus-sheet p{margin:0 0 12px;font-size:calc(14px * var(--fs,1));line-height:1.7}
.plus-sheet button{border:0;border-radius:12px;padding:11px 18px;font-weight:700;font-size:calc(14px * var(--fs,1));color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--ac1),var(--ac3));margin:0 4px}
.plus-sheet button.gh{background:rgba(255,255,255,.12)}
.plus-mem-chip{display:inline-block;margin:6px 12px;padding:4px 11px;border-radius:12px;font-size:calc(12px * var(--fs,1));background:rgba(var(--ac3-rgb),.16);border:1px solid rgba(var(--ac3-rgb),.4);color:inherit}
.pp-sec{margin-top:18px;padding:14px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-size:calc(13px * var(--fs,1));line-height:1.8}
.pp-sec h3{margin:0 0 8px;font-size:calc(14px * var(--fs,1))}
.pp-sec textarea{width:100%;min-height:70px;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;padding:9px;font-family:inherit;font-size:calc(13px * var(--fs,1))}
.pp-sec button,.pp-mini{border:0;border-radius:10px;padding:8px 13px;font-weight:700;font-size:calc(12.5px * var(--fs,1));color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--ac1),var(--ac3));margin:6px 4px 0 0}
.pp-sec button.gh{background:rgba(255,255,255,.14)}
#plusPage .pp-pay.alt{background:rgba(255,255,255,.14)}
.plus-search-label{margin-inline-start:8px;font-size:calc(12.5px * var(--fs,1));opacity:.85;vertical-align:middle}
#plusPage th.st{color:var(--ac-soft)}#plusPage td.st{font-weight:600}
.pp-plans{display:grid;grid-template-columns:1fr;gap:16px;margin:14px 0 10px}.pp-packs{display:grid;grid-template-columns:1fr;gap:14px;margin:8px 0 18px}.pp-sech{margin:18px 0 4px;font-weight:700;font-size:calc(15px * var(--fs,1))}.pp-sechs{font-size:calc(12px * var(--fs,1));opacity:.8;line-height:1.8;margin-bottom:6px}.pp-pack{border-style:dashed}
.pp-plan{position:relative;display:flex;flex-direction:column;padding:16px 10px 12px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);text-align:center}
.pp-plan.best{background:linear-gradient(135deg,rgba(var(--ac1-rgb),.2),rgba(var(--ac3-rgb),.2));border-color:rgba(var(--ac3-rgb),.65)}
.pp-badge{position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--ac1),var(--ac3));border-radius:9px;padding:1px 9px;font-size:calc(10px * var(--fs,1));font-weight:700;white-space:nowrap}
.pp-pn{font-weight:700;font-size:calc(14px * var(--fs,1))}
.pp-pp{margin-top:4px}.pp-pp b{font-size:calc(24px * var(--fs,1))}.pp-pp span{font-size:calc(12px * var(--fs,1));opacity:.8}
.pp-pd{font-size:calc(11px * var(--fs,1));opacity:.75;margin:2px 0 8px}
.pp-pt{font-size:calc(11.5px * var(--fs,1));opacity:.85;line-height:1.7;margin-bottom:8px}
.pp-fe{list-style:none;padding:0;margin:0 0 10px;font-size:calc(11.5px * var(--fs,1));text-align:start;line-height:1.9}
#plusPage .pp-plan .pp-pay{margin:auto 0 0;padding:11px 6px;font-size:calc(13.5px * var(--fs,1));border-radius:13px}
.pp-sec.warn{background:rgba(255,170,60,.12);border-color:rgba(255,170,60,.5)}
#plusPage .pp-legal a{color:var(--ac-soft);text-decoration:none}
#plusPage .pp-legal{opacity:.85}
.pp-sec.okc{background:rgba(60,200,120,.12);border-color:rgba(60,200,120,.45)}
.pc-ov{position:fixed;inset:0;z-index:100001;background:rgba(3,8,20,.88);overflow-y:auto;display:flex;justify-content:center;padding:14px;font-family:inherit}
.pc-box{position:relative;width:100%;max-width:520px;margin:auto;background:var(--sv-surface-solid,#0d1730);color:#fff;border:1px solid rgba(var(--ac3-rgb),.5);border-radius:20px;padding:18px 16px 16px}
.pc-x{position:absolute;top:10px;inset-inline-end:10px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font-size:calc(19px * var(--fs,1));cursor:pointer}
.pc-h{font-size:calc(18px * var(--fs,1));font-weight:700;text-align:center;margin:2px 36px 2px}
.pc-sub{text-align:center;opacity:.8;font-size:calc(13px * var(--fs,1));margin-bottom:10px}
.pc-step{margin-top:12px;padding:12px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-size:calc(13px * var(--fs,1));line-height:1.8}
.pc-step.okc{background:rgba(60,200,120,.12);border-color:rgba(60,200,120,.45)}
.pc-step.warn{background:rgba(255,170,60,.12);border-color:rgba(255,170,60,.5)}
.pc-step h4{margin:0 0 8px;font-size:calc(13.5px * var(--fs,1))}
.pc-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0;padding:9px 10px;border-radius:12px;background:rgba(0,0,0,.28)}
.pc-lbl{font-size:calc(11.5px * var(--fs,1));opacity:.72;line-height:1.7}
.pc-val{font-weight:700;font-size:calc(16px * var(--fs,1));direction:ltr;unicode-bidi:plaintext;letter-spacing:.4px;word-break:break-all;text-align:start}
.pc-cp{flex-shrink:0;border:0;border-radius:9px;padding:7px 12px;font-size:calc(12px * var(--fs,1));font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--ac1),var(--ac3));font-family:inherit}
.pc-in{width:100%;box-sizing:border-box;margin:5px 0 9px;padding:11px;border-radius:11px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;font-size:calc(16px * var(--fs,1));direction:ltr;text-align:center;font-family:inherit}
.pc-go{display:block;width:100%;margin-top:10px;border:0;border-radius:14px;padding:13px;font-size:calc(15px * var(--fs,1));font-weight:700;color:#fff;cursor:pointer;font-family:inherit;background:linear-gradient(135deg,var(--ac1),var(--ac3))}
.pc-go.pc-gh{background:rgba(255,255,255,.13);font-weight:700}
.pc-go[disabled]{opacity:.6}
.pc-note{margin-top:12px;font-size:calc(11.5px * var(--fs,1));opacity:.62;text-align:center;line-height:1.8}`;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

    const toast = (msg, ms = 3500) => {
      const d = document.createElement("div"); d.className = "plus-toast"; d.textContent = msg;
      document.body.appendChild(d); setTimeout(() => d.remove(), ms);
    };

    /* ---------- کادر سایدبار ---------- */
    let box = null;
    const packList = () => (Array.isArray(state.packs) ? state.packs : []).filter((k) => k && /^c\d+$/.test(String(k.key)) && Number(k.price) > 0 && Number(k.credits) > 0);
    const isPackOrder = (o) => !!o && /^c\d+$/.test(String(o.plan || ""));
    function renderBox() {
      const foot = document.getElementById("sidebarFooter");
      if (!foot) return;
      if (!box || !box.isConnected) {
        box = document.createElement("button"); box.type = "button"; box.className = "plus-box"; box.id = "plusPromoBox";
        box.addEventListener("click", openPage);
        foot.insertBefore(box, foot.firstChild);
      }
      if (isPlus()) {
        const d = Math.max(1, Math.ceil((state.expiresAt - Date.now()) / 864e5));
        const pkm = state.planKey === "pk";
        const go = pkm ? t("افزودن", "Add") : state.planKey === "p7" ? t("ارتقا", "Upgrade") : t("تمدید", "Renew");
        box.innerHTML = `<span class="pb-ic">✨</span><span><div class="pb-t">${esc(planLabel())}</div><div class="pb-s">${pkm ? t(num(state.creditToman || 0) + " اعتبار · " + num(d) + " روز مانده", num(state.creditToman || 0) + " credits · " + d + " days left") : t("فعال · " + num(d) + " روز مانده", "Active · " + d + " days left")}</div></span><span class="pb-go">${go}</span>`;
      } else {
        const p7 = (state.plans && state.plans.p7) || {};
        let sub = p7.price ? t("پلن‌ها از " + num(p7.price) + " تومان", "Plans from " + num(p7.price) + " Toman") : t("جواب‌ها و تصویرهای بهتر", "Better answers & images");
        const pks = packList(); if (p7.price && pks.length) { const mp = Math.min(...pks.map((k) => Number(k.price))); sub += t(" · اعتبار از " + num(mp), " · credit from " + num(mp)); }
        const oc = isMyket() ? null : state.cardOrder; let go = t("ارتقا", "Upgrade");
        if (oc && oc.status === "submitted") { sub = t("پرداختت منتظر تأییده ⏳", "Payment awaiting confirmation ⏳"); go = t("مشاهده", "View"); }
        else if (oc && oc.status === "awaiting") { sub = t("یه سفارش پرداخت باز داری", "You have an open payment order"); go = t("ادامه", "Continue"); }
        box.innerHTML = `<span class="pb-ic">✨</span><span><div class="pb-t">Suvreno Plus</div><div class="pb-s">${sub}</div></span><span class="pb-go">${go}</span>`;
      }
    }
    function renderPill() {
      const n = document.getElementById("accountChipName");
      if (!n) return;
      const old = n.parentNode.querySelector(".plus-pill");
      if (isPlus() && !old) { const p = document.createElement("span"); p.className = "plus-pill"; p.textContent = planShort(); n.after(p); }
      if (isPlus() && old && old.textContent !== planShort()) old.textContent = planShort();
      if (!isPlus() && old) old.remove();
    }

    /* ---------- صفحه‌ی Plus ---------- */
    let page = null;
    const perDay = (P) => Math.round(Number(P.price) / Math.max(1, Number(P.days)));
    /* ⚠️ منبع حقیقت = backend (/plus-status → plans/free/features). این جدول فقط «fallbackِ سازگاری» است برای وقتی که
       هنوز جوابی از سرور نیومده یا Worker قدیمیه؛ به‌محض اینکه backend مقدار معتبر بده، همیشه همون جایگزین می‌شه. */
    const FB = {
      free: { msg: 30, gen: 5, edit: 5, search: 3, history: 12, note: 8000 },
      p7: { key: "p7", name: "Suvreno Start", price: 75000, days: 7, walletToman: 4700, limits: { msg: 1000, gen: 300, edit: 300, search: 300, pmsg: 100000, premiumImage: 1, history: 18, note: 16000 } },
      p14: { key: "p14", name: "Suvreno Plus", price: 139000, days: 14, walletToman: 9500, limits: { msg: 1000, gen: 300, edit: 300, search: 300, pmsg: 100000, premiumImage: 5, history: 24, note: 24000 } },
    };
    const plansOf = () => {
      const pl = state.plans || {};
      const mk = (k, legacy) => { const b = pl[k] || {}; return { ...FB[k], ...(legacy || {}), ...b, limits: { ...FB[k].limits, ...(b.limits || {}) } }; };
      return {
        p7: mk("p7"),
        p14: mk("p14", { price: state.priceToman || FB.p14.price, days: state.days || FB.p14.days }), // priceToman/days = فیلدهای قدیمیِ Worker
      };
    };
    const freeOf = () => ({ ...FB.free, ...(state.free || {}) });
    const refOf = () => ({ days: 1, max: 10, ...(state.referral || {}) }); // fallback = مقادیر پیش‌فرض Worker (CFG.REF_DAYS / REF_MAX)
    // جدول مقایسه‌ی Free | Start | Plus؛ همه‌ی اعداد از backend (plansOf/freeOf) ساخته می‌شن
    function rows() {
      const F = state.features || {}, fr = freeOf(), P = plansOf(), L7 = P.p7.limits, L14 = P.p14.limits;
      const na = "—", soon = t("به‌زودی", "Soon");
      const msgs = (v) => t(num(v) + " پیام", v + " msgs");
      const chars = (v) => t(num(Math.round(v / 1000)) + " هزار کاراکتر", Math.round(v / 1000) + "K chars");
      const toman = (v) => t(num(v) + " تومان", num(v) + " Toman");
      const days = (v) => t(num(v) + " روز", v + " days");
      const smart = t("هوشمند، در هر پیام", "Every message, smart");
      const M = state.models || {}, mStart = M.start || "gemini-2.5-flash-lite", mPlus = M.plus || M.text || "gemini-3.1-flash-lite", mImg = M.premiumImage || M.image || "gemini-2.5-flash-image";
      const pt = !!F.premiumText, pi = !!(F.premiumImage || F.premiumEdit);
      if (F.creditMode) {
        const FC = state.freeCosts || { chat: 10, gen: 40, genQ: 60, edit: 60, search: 7 }, C = state.costs || {}, cr = (v) => t(num(v) + " اعتبار", num(v) + " credits"), ap = (v) => v == null ? na : t("≈ " + num(v) + " اعتبار", "≈ " + num(v) + " credits");
        return [
          [t("قیمت", "Price"), t("رایگان", "Free"), toman(P.p7.price), toman(P.p14.price)],
          [t("مدت اشتراک", "Duration"), na, days(P.p7.days), days(P.p14.days)],
          [t("اعتبار (هزینه‌ی هر کار از اون کم می‌شه)", "Credit (every action spends it)"), t(num((fr.credits != null ? fr.credits : Math.round((fr.msg || 0) * 10))) + " اعتبار، هر روز شارژ", num((fr.credits != null ? fr.credits : Math.round((fr.msg || 0) * 10))) + " credits, refilled daily"), cr(P.p7.walletToman), cr(P.p14.walletToman)],
          [t("هر پیام چت (بسته به طول و سختی پیام)", "Each chat message (by length & difficulty)"), ap(FC.chat), ap(C.chat), ap(C.chat)],
          [t("ساخت تصویر", "Image creation"), ap(FC.gen), ap(C.gen), ap(C.gen)],
          [t("ساخت تصویر با کیفیت بالا", "High-quality image"), ap(FC.genQ), ap(C.genQ), ap(C.genQ)],
          [t("ویرایش تصویر", "Image edit"), ap(FC.edit), ap(pi ? C.premiumImg : C.edit), ap(pi ? C.premiumImg : C.edit)],
          [t("جست‌وجوی وب (هر بار، جدا از هزینه‌ی پیام)", "Web search (each, besides message cost)"), ap(FC.search), ap(C.search), ap(C.search)],
          [t("اعتبار مصرف‌نشده با تمدید", "Unused credit on renewal"), na, t("منتقل می‌شه", "Carries over"), t("منتقل می‌شه", "Carries over")],
          [t("حافظه‌ی گفتگو", "Chat context"), msgs(fr.history), msgs(L7.history), msgs(L14.history)],
          [t("حافظه‌ی بلندمدت", "Long-term memory"), chars(fr.note), chars(L7.note), chars(L14.note)],
          [t("دسترسی به چت‌های قبلی", "Past-chat recall"), t("فقط ابتدای گفتگو", "Start of chat only"), smart, smart],
        ];
      }
      return [
        [t("قیمت", "Price"), t("رایگان", "Free"), toman(P.p7.price), toman(P.p14.price)],
        [t("مدت اشتراک", "Duration"), na, days(P.p7.days), days(P.p14.days)],
        [t("پیام در روز", "Messages / day"), num(fr.msg), num(L7.msg), num(L14.msg)],
        [t("ساخت تصویر در روز", "Images / day"), num(fr.gen), num(L7.gen), num(L14.gen)],
        [t("ویرایش تصویر در روز", "Edits / day"), num(fr.edit), num(L7.edit), num(L14.edit)],
        [t("جست‌وجوی وب در روز (بدون کسر از اعتبار)", "Web searches / day (no wallet cost)"), num(fr.search), num(L7.search), num(L14.search)],
        [t("پیام پریمیوم در روز (جزو پیام‌های روزانه)", "Premium text msgs / day (part of daily msgs)"), na, pt ? num(L7.pmsg) : soon, pt ? num(L14.pmsg) : soon],
        // یک سهمیه‌ی مشترک برای «ساخت کیفیت بالا» و «ویرایش»، برای کل دوره‌ی اشتراک (روزانه صفر نمی‌شه)
        [t("تصویر پریمیوم در کل دوره، نه روزانه (ساخت «کیفیت بالا» + ویرایش)", "Premium images per whole period, not daily (high-quality create + edit)"), na, pi ? num(L7.premiumImage) : soon, pi ? num(L14.premiumImage) : soon],
        [t("اعتبار کیف پول (متن/تصویر پریمیوم، ساخت و ویرایش)", "Wallet credit (premium text/images, create & edit)"), na, toman(P.p7.walletToman), toman(P.p14.walletToman)],
        [t("حافظه‌ی گفتگو", "Chat context"), msgs(fr.history), msgs(L7.history), msgs(L14.history)],
        [t("حافظه‌ی بلندمدت", "Long-term memory"), chars(fr.note), chars(L7.note), chars(L14.note)],
        [t("دسترسی به چت‌های قبلی", "Past-chat recall"), t("فقط ابتدای گفتگو", "Start of chat only"), smart, smart],
        [t("مدل پاسخ‌ها", "Answer model"), "Suvreno Nova", mStart, mPlus],
        [t("ساخت تصویر (بدون سهمیه‌ی پریمیوم)", "Image creation (non-premium)"), t("سرویس رایگان", "Free service"), "FLUX", "FLUX"],
        [t("مدل تصویر پریمیوم", "Premium image model"), na, pi ? mImg : soon, pi ? mImg : soon],
      ];
    }
    /* =====================================================================
       نقشه‌راه فروش: تخفیف و کد تخفیف، «اشتراک من»، بازخورد، گالری مقایسه‌ی کیفیت Free و Plus
       ===================================================================== */
    let discCode = "", discPrev = {}, acctData = null, cmpList = null, cmpKind = "gen", cmpCat = "", cmpSel = "";
    const cmpImgs = new Map();
    const faDate = (ms) => { try { return new Date(ms).toLocaleDateString(isEn() ? "en-GB" : "fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" }); } catch { return ""; } };
    function promoFor(key) {
      if (isMyket() || !(key === "p7" || key === "p14")) return null;
      const d = discPrev[key]; if (d && d.price < d.base) return { price: d.price, base: d.base, percent: d.percent, label: t("کد " + discCode, "Code " + discCode) };
      const p = (state.promo || {})[key]; if (p && p.price < p.base) return { price: p.price, base: p.base, percent: p.percent, label: p.banner || p.title || t("تخفیف ویژه", "Special offer") };
      return null;
    }
    function salesCss() {
      if (document.getElementById("plusSalesCss")) return;
      const st = document.createElement("style"); st.id = "plusSalesCss";
      st.textContent = ".pp-old{text-decoration:line-through;opacity:.55;font-size:calc(13px * var(--fs,1));margin-inline-end:6px}.pp-off{display:inline-block;margin-top:4px;padding:2px 9px;border-radius:9px;background:linear-gradient(135deg,#ff9a3c,var(--ac2));color:#fff;font-size:calc(11px * var(--fs,1));font-weight:700}"
        + ".pp-code{display:flex;gap:6px;margin-top:10px}.pp-code input{flex:1;min-width:0;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;padding:9px;font-family:inherit;direction:ltr;text-transform:uppercase}"
        + ".pp-promo{margin-top:14px;padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,rgba(255,154,60,.2),rgba(var(--ac2-rgb),.2));border:1px solid rgba(255,154,60,.5);font-size:calc(13px * var(--fs,1));line-height:1.8}"
        + ".pp-tbl{width:100%;border-collapse:collapse;margin-top:8px;font-size:calc(12px * var(--fs,1))}.pp-tbl td,.pp-tbl th{padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.1);text-align:start}"
        + ".pp-stars button{font-size:calc(20px * var(--fs,1));background:none!important;padding:2px 3px!important;opacity:.45}.pp-stars button.on{opacity:1}"
        + ".pp-sec select,.pp-sec input.pp-in2{width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;padding:9px;font-family:inherit;margin:6px 0}"
        + ".cmp-tabs,.cmp-cats{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.cmp-tabs button,.cmp-cats button{background:rgba(255,255,255,.12)!important}.cmp-tabs button.on,.cmp-cats button.on{background:linear-gradient(135deg,var(--ac1),var(--ac3))!important}"
        + ".cmp-box{position:relative;direction:ltr;border-radius:14px;overflow:hidden;background:#000;margin-top:8px;user-select:none}.cmp-box img{display:block;width:100%;height:auto}.cmp-box .cmp-top{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cmp-box .cmp-bot{position:relative}"
        + ".cmp-lb{position:absolute;top:8px;padding:2px 9px;border-radius:9px;background:rgba(0,0,0,.6);font-size:calc(11px * var(--fs,1));font-weight:700}.cmp-box input[type=range]{position:absolute;left:0;right:0;bottom:8px;width:92%;margin:0 4%}"
        + ".cmp-orig{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:calc(12px * var(--fs,1))}.cmp-orig img{width:64px;height:64px;object-fit:cover;border-radius:8px}";
      document.head.appendChild(st);
    }
    function renderPromoBox() {
      const el = page && page.querySelector("#ppPromo"); if (!el) return;
      if (isMyket()) { el.innerHTML = ""; return; }
      const ps = state.promo || {}, any = ps.p7 || ps.p14;
      let h = "";
      if (any) h += `<div class="pp-promo">${esc(any.banner || any.title || t("🎁 تخفیف ویژه", "🎁 Special offer"))} — ${t("قیمت‌های تخفیف‌خورده روی کارت‌های پایین نشان داده شده.", "Discounted prices are shown on the plan cards below.")}</div>`;
      if (findToken()) h += `<div class="pp-sec"><h3>${t("کد تخفیف داری؟", "Have a discount code?")}</h3><div class="pp-code"><input id="ppCode" maxlength="24" autocomplete="off" placeholder="CODE" value="${esc(discCode)}"><button type="button" id="ppCodeGo">${t("اعمال", "Apply")}</button>${discCode ? `<button type="button" class="gh" id="ppCodeClr">${t("حذف", "Clear")}</button>` : ""}</div><div style="font-size:11.5px;opacity:.75;margin-top:6px">${t("تخفیف‌ها جمع نمی‌شن؛ بهترین تخفیفِ مجاز برات اعمال می‌شه. تخفیف برای پرداخت کارت‌به‌کارت است.", "Discounts don't stack; the best eligible one applies. Discounts apply to card-to-card payments.")}</div></div>`;
      el.innerHTML = h;
      const go = el.querySelector("#ppCodeGo"), inp = el.querySelector("#ppCode"), clr = el.querySelector("#ppCodeClr");
      if (clr) clr.addEventListener("click", () => { discCode = ""; discPrev = {}; renderPromoBox(); fillPlansOnly(); });
      if (go) go.addEventListener("click", async () => {
        const c = String(inp.value || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24);
        if (!c) { toast(t("کد را وارد کن.", "Enter a code.")); return; }
        go.disabled = true;
        try {
          const rs = await Promise.all(["p7", "p14"].map((k) => plusCall({ mode: "plus-discount-check", plan: k, code: c })));
          const prev = {}; let msg = "";
          rs.forEach((r, i) => { if (r && r.ok) prev[i ? "p14" : "p7"] = { price: r.price, base: r.base, percent: r.percent }; else if (r && r.message) msg = r.message; });
          if (!Object.keys(prev).length) { toast(msg || t("کد معتبر نیست.", "Invalid code."), 5000); }
          else { discCode = c; discPrev = prev; toast(t("کد تخفیف اعمال شد ✅", "Discount applied ✅")); renderPromoBox(); fillPlansOnly(); }
        } catch { toast(t("بررسی کد انجام نشد؛ دوباره امتحان کن.", "Couldn't check the code; try again.")); }
        go.disabled = false;
      });
    }
    function fillPlansOnly() { if (page) page.querySelector("#ppPlans").innerHTML = planCard("p7", false) + planCard("p14", true); }
    async function renderAcct() {
      const el = page && page.querySelector("#ppAcct"); if (!el) return;
      if (!findToken()) { el.innerHTML = ""; return; }
      if (!acctData) { try { const r = await plusCall({ mode: "plus-account" }); if (r && r.ok) acctData = r; } catch {} }
      const A = acctData || { payments: [], orders: [] };
      const stName = { awaiting: t("منتظر پرداخت", "Awaiting payment"), submitted: t("در حال بررسی", "Under review"), approved: t("تأیید شد", "Approved"), rejected: t("رد شد", "Rejected"), expired: t("منقضی", "Expired"), cancelled: t("لغو شد", "Cancelled") };
      const mName = { card: t("کارت‌به‌کارت", "Card"), myket: t("مایکت", "Myket"), gateway: t("درگاه", "Gateway") };
      let h = `<div class="pp-sec"><h3>${t("اشتراک من", "My subscription")}</h3>`;
      if (isPlus()) {
        const d = Math.max(1, Math.ceil((state.expiresAt - Date.now()) / 864e5));
        h += `${esc(planLabel())} · ${t("تا " + faDate(state.expiresAt) + " (" + num(d) + " روز مانده)", "until " + faDate(state.expiresAt) + " (" + d + " days left)")}`;
        if (state.creditToman != null) h += `<br>${t("اعتبار باقی‌مانده: " + num(state.creditToman), "Remaining credit: " + num(state.creditToman))}`;
        if (d <= 3) h += `<br><b>${t("⏰ اشتراکت به‌زودی تموم می‌شه؛ از کارت‌های بالا تمدیدش کن.", "⏰ Your plan ends soon; renew it from the cards above.")}</b>`;
      } else h += t("اشتراک فعالی نداری.", "You have no active plan.");
      const open = (A.orders || []).find((o) => o.status === "awaiting" || o.status === "submitted");
      if (open) h += `<br>${t("پیگیری پرداخت: سفارش " + esc(open.code) + " — " + (stName[open.status] || ""), "Payment tracking: order " + esc(open.code) + " — " + (stName[open.status] || ""))}`;
      h += `</div><div class="pp-sec"><h3>${t("تاریخچه‌ی خرید", "Purchase history")}</h3>`;
      if (!(A.payments || []).length) h += t("هنوز خریدی ثبت نشده.", "No purchases yet.");
      else h += `<table class="pp-tbl"><tr><th>${t("تاریخ", "Date")}</th><th>${t("پلن", "Plan")}</th><th>${t("مبلغ", "Amount")}</th><th>${t("روش", "Method")}</th></tr>${A.payments.map((p) => `<tr><td>${faDate(p.at)}</td><td>${esc(p.planName)}</td><td>${p.base > p.amount ? `<s style="opacity:.55">${num(p.base)}</s> ` : ""}${num(p.amount)}${p.status === "refund_requested" ? " ↩︎" : ""}</td><td>${mName[p.method] || ""}</td></tr>`).join("")}</table>`;
      const bad = (A.orders || []).filter((o) => o.status === "rejected");
      h += `<div style="margin-top:8px;font-size:12px;opacity:.85">${t("مشکل در پرداخت؟ ", "Payment problem? ")}<a href="mailto:suvreno.ir@gmail.com?subject=${encodeURIComponent("Suvreno " + (open ? open.code : bad[0] ? bad[0].code : ""))}" style="color:var(--ac-soft)">${t("پیام به پشتیبانی", "Contact support")}</a></div></div>`;
      el.innerHTML = h;
    }
    function renderFeedback() {
      const el = page && page.querySelector("#ppFb"); if (!el) return;
      if (!findToken()) { el.innerHTML = ""; return; }
      el.innerHTML = `<div class="pp-sec"><h3>${t("نظرت درباره‌ی Suvreno", "Your feedback")}</h3>
        <select id="fbKind"><option value="praise">${t("چه چیزی خوب بود؟", "What did you like?")}</option><option value="weakness">${t("چه چیزی باید بهتر بشه؟", "What should improve?")}</option><option value="idea">${t("قابلیت پیشنهادی", "Feature suggestion")}</option><option value="bug">${t("گزارش مشکل", "Report a problem")}</option></select>
        <div class="pp-stars" id="fbStars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}">⭐</button>`).join("")}</div>
        <textarea id="fbText" maxlength="800" placeholder="${t("نظرت رو بنویس…", "Write your feedback…")}"></textarea>
        <label style="display:block;font-size:12px;margin:6px 0" id="fbPubL"><input type="checkbox" id="fbPub"> ${t("اجازه می‌دم این نظر (فقط با اسم کوچک) در سایت و اپ نمایش داده بشه", "I allow this to be shown publicly (first name only)")}</label>
        <input class="pp-in2" id="fbName" maxlength="30" placeholder="${t("نام نمایشی (اختیاری)", "Display name (optional)")}">
        <button type="button" id="fbSend">${t("ارسال", "Send")}</button></div>`;
      let rating = 0;
      const stars = el.querySelector("#fbStars");
      stars.addEventListener("click", (e) => { const b = e.target.closest("button[data-n]"); if (!b) return; rating = Number(b.getAttribute("data-n")); stars.querySelectorAll("button").forEach((x) => x.classList.toggle("on", Number(x.getAttribute("data-n")) <= rating)); });
      const kind = el.querySelector("#fbKind"), pubL = el.querySelector("#fbPubL");
      kind.addEventListener("change", () => { pubL.style.display = kind.value === "praise" ? "block" : "none"; }); pubL.style.display = "block";
      el.querySelector("#fbSend").addEventListener("click", async (ev) => {
        const b = ev.currentTarget, text = el.querySelector("#fbText").value.trim();
        if (text.length < 10) { toast(t("متن رو کمی کامل‌تر بنویس.", "Please write a bit more.")); return; }
        b.disabled = true;
        try {
          const r = await plusCall({ mode: "plus-feedback-send", kind: kind.value, rating, text, allowPublic: !!el.querySelector("#fbPub").checked && kind.value === "praise", displayName: el.querySelector("#fbName").value.trim() });
          if (r && r.ok) { toast(t("ممنون از نظرت 💙", "Thanks for your feedback 💙"), 4500); el.querySelector("#fbText").value = ""; } else toast((r && r.message) || t("ارسال نشد.", "Not sent."), 5000);
        } catch { toast(t("ارسال نشد؛ دوباره امتحان کن.", "Not sent; try again.")); }
        b.disabled = false;
      });
    }
    async function cmpImg(id, side) {
      const k = id + ":" + side; if (cmpImgs.has(k)) return cmpImgs.get(k);
      try { const r = await plusCall({ mode: "plus-compare-image", id, side }, 20000); if (r && r.ok && r.image) { cmpImgs.set(k, r.image); return r.image; } } catch {}
      return "";
    }
    async function renderCompare() {
      const el = page && page.querySelector("#ppCompare"); if (!el) return;
      if (!cmpList) { try { const r = await plusCall({ mode: "plus-compare-list" }); cmpList = r && r.ok ? (r.items || []) : []; } catch { cmpList = []; } }
      if (!cmpList.length) { el.innerHTML = ""; return; }
      const kinds = ["gen", "edit"].filter((k) => cmpList.some((i) => i.kind === k));
      if (!kinds.includes(cmpKind)) cmpKind = kinds[0];
      const ofKind = cmpList.filter((i) => i.kind === cmpKind), cats = [...new Set(ofKind.map((i) => i.cat).filter(Boolean))];
      if (cmpCat && !cats.includes(cmpCat)) cmpCat = "";
      const items = ofKind.filter((i) => !cmpCat || i.cat === cmpCat);
      if (!items.some((i) => i.id === cmpSel)) cmpSel = items[0] ? items[0].id : "";
      const cur = items.find((i) => i.id === cmpSel);
      el.innerHTML = `<div class="pp-sec"><h3>${t("تفاوت کیفیت رو با چشم خودت ببین", "See the quality difference yourself")}</h3>
        <div style="font-size:12px;opacity:.8">${t("هر دو تصویر با «دقیقاً همون پرامپت» ساخته شدن؛ فقط مدل فرق داره. نوار رو بکش.", "Both images use exactly the same prompt; only the model differs. Drag the slider.")}</div>
        <div class="cmp-tabs">${kinds.map((k) => `<button type="button" data-k="${k}" class="${k === cmpKind ? "on" : ""}">${k === "gen" ? t("ساخت تصویر", "Image creation") : t("ویرایش تصویر", "Image editing")}</button>`).join("")}</div>
        <div class="cmp-cats">${cats.map((c) => `<button type="button" data-c="${esc(c)}" class="${c === cmpCat ? "on" : ""}">${esc(c)}</button>`).join("")}</div>
        <div class="cmp-cats">${items.map((i, n) => `<button type="button" data-i="${esc(i.id)}" class="${i.id === cmpSel ? "on" : ""}">${esc(i.title || String(n + 1))}</button>`).join("")}</div>
        <div id="cmpView"></div>
        <button type="button" id="cmpGo" style="margin-top:10px">${t("تجربه‌ی کیفیت بالاتر با Suvreno Plus", "Try higher quality with Suvreno Plus")}</button></div>`;
      el.onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.id === "cmpGo") { const pl = page.querySelector("#ppPlans"); if (pl) pl.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        if (b.dataset.k) { cmpKind = b.dataset.k; cmpCat = ""; cmpSel = ""; renderCompare(); }
        else if (b.dataset.c !== undefined) { cmpCat = cmpCat === b.dataset.c ? "" : b.dataset.c; cmpSel = ""; renderCompare(); }
        else if (b.dataset.i) { cmpSel = b.dataset.i; renderCompare(); }
      };
      const v = el.querySelector("#cmpView"); if (!cur) { v.innerHTML = ""; return; }
      v.innerHTML = `<div class="loadingc" style="padding:20px;text-align:center;opacity:.7">…</div>`;
      const want = cur.id, [fr, pl, og] = await Promise.all([cmpImg(cur.id, "free"), cmpImg(cur.id, "plus"), cur.hasOrig ? cmpImg(cur.id, "orig") : Promise.resolve("")]);
      if (cmpSel !== want || !el.contains(v)) return;
      if (!fr || !pl) { v.innerHTML = `<div style="opacity:.7;padding:10px">${t("بارگذاری تصویر انجام نشد.", "Couldn't load the images.")}</div>`; return; }
      v.innerHTML = `${og ? `<div class="cmp-orig"><img src="${og}" alt=""><span>${t("عکس اصلیِ آپلودشده", "Original photo")}</span></div>` : ""}
        <div class="cmp-box"><img class="cmp-bot" src="${fr}" alt="Free"><img class="cmp-top" src="${pl}" alt="Plus" style="clip-path:inset(0 0 0 50%)"><span class="cmp-lb" style="left:8px">${t("رایگان", "Free")}</span><span class="cmp-lb" style="right:8px">Plus</span><input type="range" min="0" max="100" value="50" aria-label="compare"></div>
        ${cur.prompt ? `<div style="font-size:12px;opacity:.8;margin-top:6px">${t("پرامپت: ", "Prompt: ")}${esc(cur.prompt)}</div>` : ""}`;
      const rg = v.querySelector("input"), top = v.querySelector(".cmp-top");
      rg.addEventListener("input", () => { top.style.clipPath = "inset(0 0 0 " + rg.value + "%)"; });
    }
    /* ---------- ایجنت Suvreno (افزونه‌ی Chrome): کد اتصال ---------- */
    let agentCode = null, agentBusy = false;
    function renderAgent() {
      const x = document.getElementById("ppAgent"); if (!x) return;
      const live = agentCode && agentCode.until > Date.now();
      x.innerHTML = `<div class="pp-sec"><h3>🤖 ${t("ایجنت Suvreno (افزونه‌ی Chrome)", "Suvreno Agent (Chrome extension)")}</h3>
        <div>${t("با افزونه‌ی Chrome، ایجنت با اجازه‌ی خودت توی مرورگر کامپیوترت کار می‌کنه: جست‌وجو، افزودن به سبد خرید و نوشتن مقاله. قبل از خرید، انتشار و ارسال حتماً ازت تأیید می‌گیره و پرداخت نهایی با خودته.", "With the Chrome extension, the agent works in your desktop browser with your permission: searching, adding to cart and writing articles. It asks before buying, publishing or sending, and the final payment is always yours.")}</div>
        <div class="pp-mut" style="margin-top:6px">${t("رایگان: ۳ کار در هفته با مدل ساده و مرحله‌های محدود. پلن‌ها (Start و Plus): مدل قوی‌تر، مرحله‌ها و سهمیه‌ی روزانه‌ی خیلی بیشتر؛ اعتبار جداگانه هم کار می‌کند ولی سقفش از پلن‌ها کمتر است (هر مرحله از اعتبار کم می‌شه).", "Free: 3 tasks per week with the basic model and few steps. Plans (Start and Plus): a stronger model and much higher step and daily limits; separate credit packs work too but with lower limits than plans (each step uses credit).")}</div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" data-ag="code">${t("ساخت کد اتصال", "Create connect code")}</button>
          <a class="pp-agdl" href="suvreno-agent.zip" download style="align-self:center">⬇ ${t("دانلود افزونه", "Download extension")}</a>
        </div>
        <div id="ppAgOut">${live ? `<div style="margin-top:10px;font-size:26px;font-weight:800;letter-spacing:3px;direction:ltr;text-align:center">${esc(agentCode.code)}</div><div class="pp-mut" style="text-align:center">${esc(agentCode.note)}</div>` : ""}</div>
        <div style="margin-top:8px"><button type="button" data-ag="revoke" class="gh">${t("قطع اتصال همه‌ی افزونه‌ها", "Disconnect all extensions")}</button></div></div>`;
      x.onclick = async (e) => {
        const b = e.target && e.target.closest ? e.target.closest("button[data-ag]") : null; if (!b || agentBusy) return;
        if (!findToken()) { toast(t("اول وارد حساب Suvreno شو 🔒", "Sign in to Suvreno first 🔒")); return; }
        agentBusy = true; b.disabled = true;
        try {
          if (b.getAttribute("data-ag") === "code") {
            const r = await plusCall({ mode: "agent-pair-create", device: "web" }, 20000);
            if (r && r.ok) {
              const q = r.quota || {};
              agentCode = { code: r.code, until: Date.now() + 9 * 60000, note: t("این کد رو توی افزونه بنویس (۱۰ دقیقه اعتبار داره). سطح فعلی: ", "Enter this in the extension (valid 10 minutes). Current level: ") + (r.tierLabel || "") + (r.tier === "free" ? " — " + num(q.left) + "/" + num(q.cap) + t(" کار این هفته", " tasks this week") : "") };
            } else toast((r && r.message) || t("ساخت کد انجام نشد.", "Couldn't create the code."), 5000);
          } else {
            const r = await plusCall({ mode: "agent-revoke" }, 20000);
            agentCode = null; toast((r && r.message) || t("انجام نشد.", "Failed."));
          }
        } catch { toast(t("اتصال برقرار نشد؛ دوباره امتحان کن.", "Connection failed; try again.")); }
        agentBusy = false; renderAgent();
      };
    }
    /* ---------- ایجنت گوشی (اپ اندروید با سرویس دسترسی‌پذیری؛ فقط در ساخت‌های مخصوص دیده می‌شود) ---------- */
    let phLog = [], phRunning = false;
    const phNative = () => (window.SuvrenoNative && typeof window.SuvrenoNative.agentAvailable === "function" && window.SuvrenoNative.agentAvailable()) ? window.SuvrenoNative : null;
    window.amAgentEvent = (json) => {
      let o; try { o = JSON.parse(json); } catch { return; }
      phLog.push(o); if (phLog.length > 40) phLog.shift();
      if (o.type === "done" || o.type === "error" || o.type === "stopped") phRunning = false;
      if (o.type === "started") phRunning = true;
      try { renderPhoneAgent(); } catch {}
      try { chatAgentEvent(o); } catch {}
    };
    function renderPhoneAgent() {
      const x = document.getElementById("ppAgentPhone"); if (!x) return;
      const N = phNative(); if (!N) { x.innerHTML = ""; return; }
      const on = N.agentEnabled(); phRunning = phRunning || N.agentRunning();
      const icon = { started: "▶️", step: "•", done: "✅", error: "⚠️", stopped: "⏹" };
      const log = phLog.slice(-8).map((o) => `<div class="pp-mut" style="margin-top:3px">${icon[o.type] || "•"} ${esc(o.text || "")}</div>`).join("");
      x.innerHTML = `<div class="pp-sec"><h3>🤖 ${t("ایجنت گوشی (آزمایشی)", "Phone agent (beta)")}</h3>
        <div>${t("به ایجنت بگو چه کاری روی گوشی انجام بدهد (مثلاً «برنامه‌ی ساعت را باز کن و آلارم ۷ صبح بگذار»). خودت هر لحظه می‌توانی متوقفش کنی.", "Tell the agent what to do on your phone. You can stop it any time.")}</div>
        <div class="pp-mut" style="margin-top:6px">${t("امنیت: رمزها خوانده یا تایپ نمی‌شوند، در اپ‌های بانکی/پرداخت کار نمی‌کند و هر خرید، ارسال، حذف و تماس فقط با تأیید تو انجام می‌شود. سهمیه‌اش جدا از افزونه‌ی Chrome و کمی محدودتر است (رایگان: ۲ کار در هفته؛ پلن‌ها: سقف روزانه‌ی بیشتر).", "Safety: passwords are never read or typed, it won't work in banking/payment apps, and any purchase, send, delete or call needs your approval. Its quota is separate from the Chrome extension and a bit tighter (free: 2 tasks a week; plans: higher daily limits).")}</div>
        ${on ? `<textarea id="phTask" maxlength="600" ${phRunning ? "disabled" : ""} placeholder="${t("کار را بنویس…", "Describe the task…")}" style="margin-top:10px;min-height:70px"></textarea>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">${phRunning ? `<button type="button" data-ph="stop" class="gh">${t("توقف", "Stop")}</button>` : `<button type="button" data-ph="start">${t("شروع", "Start")}</button>`}<button type="button" data-ph="forget" class="gh">${t("قطع اتصال این گوشی", "Disconnect this phone")}</button></div>`
        : `<div style="margin-top:10px"><button type="button" data-ph="enable">${t("روشن‌کردن سرویس ایجنت گوشی", "Turn on the phone agent service")}</button></div>`}
        <div id="phLog">${log}</div></div>`;
      x.onclick = async (e) => {
        const b = e.target && e.target.closest ? e.target.closest("button[data-ph]") : null; if (!b) return;
        const act = b.getAttribute("data-ph");
        if (act === "enable") {
          if (!confirm(t("برای کار ایجنت، Android باید «سرویس دسترسی‌پذیری» را برای Suvreno روشن کند. این سرویس فقط وقتی تو یک کار را شروع می‌کنی، متن‌ها و دکمه‌های روی صفحه‌ی گوشی را (بدون رمزها) برای هوش مصنوعی Suvreno می‌فرستد تا بتواند کلیک و تایپ کند. هر لحظه می‌توانی خاموشش کنی. ادامه می‌دهی؟", "Android must enable an Accessibility service for Suvreno. It sends on-screen texts and buttons (never passwords) to Suvreno's AI only while a task you started is running, so it can tap and type. You can turn it off any time. Continue?"))) return;
          N.agentOpenSettings(); toast(t("«ایجنت گوشی Suvreno» را روشن کن و برگرد.", "Turn on “Suvreno phone agent”, then come back."), 6000); return;
        }
        if (act === "stop") { N.agentStop(); return; }
        if (act === "forget") { N.agentForget(); toast(t("اتصال این گوشی قطع شد.", "This phone was disconnected.")); return; }
        if (act === "start") {
          const task = String((x.querySelector("#phTask") || {}).value || "").trim();
          if (task.length < 5) { toast(t("کار را کامل‌تر بنویس.", "Describe the task in more detail.")); return; }
          if (!findToken()) { toast(t("اول وارد حساب Suvreno شو 🔒", "Sign in to Suvreno first 🔒")); return; }
          b.disabled = true;
          try {
            let code = "";
            if (!N.agentHasToken()) {
              const r = await plusCall({ mode: "agent-pair-create", device: "phone" }, 20000);
              if (!r || !r.ok) { toast((r && r.message) || t("اتصال برقرار نشد.", "Couldn't connect."), 5000); b.disabled = false; return; }
              code = String(r.code || "").replace(/-/g, "");
            }
            const out = JSON.parse(N.agentStart(code, task));
            if (!out.ok) { toast(out.message || t("شروع نشد.", "Couldn't start."), 6000); b.disabled = false; return; }
            phLog = []; phRunning = true; toast(t("ایجنت شروع کرد؛ برنامه به صفحه‌ی اصلی می‌رود.", "Agent started; going to the home screen."), 4000);
          } catch { toast(t("شروع نشد؛ دوباره امتحان کن.", "Couldn't start; try again.")); }
          renderPhoneAgent();
        }
      };
    }
    /* =====================================================================
       ایجنت داخل چت اصلی: Suvreno خودش می‌فهمد پیام «کار ایجنت» است یا «ابزار آماده‌ی گوشی» یا فقط گفتگو.
       اگر مردد بود، پنجره‌ی گزینه‌ها باز می‌شود. اجرای ایجنت همیشه با یک کارت «اجرا» (تأیید خود کاربر) شروع می‌شود.
       ===================================================================== */
    const agDevice = () => phNative() ? "phone_app" : (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || "") ? "phone_web" : "desktop");
    const AG_LOOKS = /(دیجی\s*[\u200c-]?\s*کالا|digikala|دیوار|divar|اسنپ|snapp|ترب(?=\s|$)|torob|تپسی|باسلام|basalam|بامیلو|ایمالز|دیجی\s*[\u200c-]?\s*استایل|آپارات|یوتیوب|youtube|اینستاگرام|instagram|تلگرام|telegram|لینکدین|گوگل|google|سایت|وب\s*[\u200c-]?\s*سایت|website|\b[a-z0-9-]+\.(?:com|ir|org|net|io)\b|آمازون|amazon|علی\s*اکسپرس|کروم|chrome|مرورگر|سبد\s*خرید|بخر(?=\s|$)|بخرم|خرید\s*کن|سفارش\s*(?:بده|بذار)|ثبت\s*سفارش|ثبت[\u200c ]?نام|فرم|پر\s*کن|جستجو\s*کن|سرچ\s*کن|لایک|فالو|منتشر\s*کن|ایجنت|\bagent\b|add\s+to\s+cart|\bbuy\b|sign\s*up|log\s*in|search\s+for)/i;
    let extSeen = !!document.documentElement.getAttribute("data-suv-agent-ext"), extAck = null;
    window.addEventListener("message", (e) => {
      if (e.source !== window || !e.data || e.data.source !== "suvreno-agent-ext") return;
      if (e.data.type === "ready") extSeen = true;
      if (e.data.type === "run-ack" && extAck) { const f = extAck; extAck = null; f(e.data); }
    });
    const say = (txt) => { try { if (window.__suvSay) window.__suvSay(txt); } catch {} };
    function agCss() {
      if (document.getElementById("agChatCss")) return;
      const st = document.createElement("style"); st.id = "agChatCss";
      st.textContent = ".ag-card{border:1px solid rgba(var(--ac1-rgb),.45)!important;background:linear-gradient(135deg,rgba(var(--ac1-rgb),.12),rgba(var(--ac1-rgb),.12))!important}.ag-card b{display:block;margin-bottom:6px}.ag-task{padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.25);margin:6px 0;line-height:1.8}.ag-mut{opacity:.78;font-size:12.5px;line-height:1.8;margin-top:6px}.ag-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.ag-actions button{border:0;border-radius:12px;padding:9px 16px;font:inherit;font-weight:700;cursor:pointer;color:#04141a;background:linear-gradient(135deg,#2de2c8,var(--ac1))}.ag-actions button.gh{background:rgba(127,127,127,.35);color:inherit}"
        + ".ag-ov{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;padding:12px}.ag-box{width:min(460px,100%);max-height:88vh;overflow:auto;border-radius:20px;padding:18px;background:var(--surface,#10151c);color:var(--text,#fff);border:1px solid rgba(127,127,127,.35);box-shadow:0 10px 40px rgba(0,0,0,.5)}.ag-box h3{margin:0 0 8px;font-size:17px}.ag-opt{display:block;width:100%;text-align:start;margin-top:8px;padding:12px 14px;border-radius:14px;border:1px solid rgba(127,127,127,.4);background:rgba(127,127,127,.14);color:inherit;font:inherit;cursor:pointer;line-height:1.7}.ag-opt:hover{border-color:#2de2c8}.ag-x{float:left;border:0;background:none;color:inherit;font-size:24px;cursor:pointer}";
      document.head.appendChild(st);
    }
    function chooseRoute(task, options) {
      agCss();
      return new Promise((res) => {
        const ov = document.createElement("div"); ov.className = "ag-ov";
        ov.innerHTML = `<div class="ag-box" dir="${isEn() ? "ltr" : "rtl"}"><h3>${t("منظورت دقیقاً کدام است؟", "What exactly do you mean?")}</h3><div class="ag-task">${esc(task)}</div>${options.map((o) => `<button type="button" class="ag-opt" data-r="${esc(o.id)}">${esc(o.label)}</button>`).join("")}<button type="button" class="ag-opt" data-r="" style="opacity:.8">${t("انصراف", "Cancel")}</button></div>`;
        const done = (v) => { ov.remove(); res(v); };
        ov.addEventListener("click", (e) => { const b = e.target.closest ? e.target.closest("button[data-r]") : null; if (b) done(b.getAttribute("data-r") || null); else if (e.target === ov) done(null); });
        document.body.appendChild(ov);
      });
    }
    function addCard(build) {
      agCss();
      const w = document.getElementById("messages"); if (!w) return null;
      const row = document.createElement("div"); row.className = "message ai";
      const col = document.createElement("div"); col.className = "bubble-col";
      const card = document.createElement("div"); card.className = "bubble ag-card";
      build(card); col.appendChild(card); row.appendChild(col); w.appendChild(row); w.scrollTop = w.scrollHeight;
      return card;
    }
    let chatRun = null;
    async function startChatAgent(task, card, note, btns) {
      const dev = agDevice(), setNote = (txt) => { note.textContent = txt; };
      btns.forEach((b) => { b.disabled = true; });
      try {
        let code = "";
        if (dev === "phone_app" && phNative().agentHasToken()) code = "";
        else { const r = await plusCall({ mode: "agent-pair-create", device: dev === "phone_app" ? "phone" : "web" }, 20000); if (!r || !r.ok) { setNote((r && r.message) || t("اتصال ایجنت برقرار نشد.", "Couldn't connect the agent.")); return; } code = String(r.code || "").replace(/-/g, ""); }
        if (dev === "phone_app") {
          const out = JSON.parse(phNative().agentStart(code, task));
          if (!out.ok) { setNote(out.message || t("شروع نشد.", "Couldn't start.")); btns[1] && (btns[1].disabled = false); return; }
          chatRun = { note: setNote, task };
          setNote(t("ایجنت شروع کرد؛ برنامه به صفحه‌ی اصلی می‌رود. با جعبه‌ی روی صفحه هر لحظه می‌توانی متوقفش کنی.", "The agent started; the app goes to the home screen. You can stop it any time from the on-screen box."));
        } else {
          const ack = await new Promise((res) => { extAck = res; setTimeout(() => { if (extAck) { extAck = null; res({ ok: false, error: "timeout" }); } }, 5000); window.postMessage({ source: "suvreno-chat", type: "run", task, code }, location.origin); });
          if (!ack.ok) { setNote(t("افزونه جواب نداد. آن را باز کن (آیکن Suvreno Agent) و دوباره امتحان کن.", "The extension didn't answer. Open it (Suvreno Agent icon) and try again.")); return; }
          setNote(t("یک تب تازه باز شد و ایجنت همان‌جا کار می‌کند؛ پیشرفت و تأییدها در پنل کناریِ افزونه است.", "A new tab opened and the agent works there; progress and approvals are in the extension's side panel.") + (ack.opened ? "" : t(" اگر پنل باز نشد، روی آیکن افزونه کلیک کن.", " If the panel didn't open, click the extension icon.")));
        }
      } catch { setNote(t("شروع نشد؛ دوباره امتحان کن.", "Couldn't start; try again.")); }
    }
    async function offerAgent(task, target) {
      const dev = agDevice();
      if (dev === "phone_web") { say(t("ایجنت روی گوشی فقط داخل اپ اندروید Suvreno (نسخه‌ی سایت) کار می‌کند. روی کامپیوتر هم با افزونه‌ی Chrome می‌شود: «تنظیمات ← ایجنت».", "The phone agent only works inside the Suvreno Android app (site build). On a computer use the Chrome extension: Settings → Agent.")); return; }
      if (dev === "phone_app") {
        const N = phNative();
        if (!N) { say(t("ایجنت گوشی در این نسخه‌ی اپ فعال نیست. نسخه‌ی سایت اپ را نصب کن (از «تنظیمات ← ایجنت» ببین)، یا از کامپیوتر با افزونه‌ی Chrome استفاده کن.", "The phone agent isn't available in this app build. Install the site build of the app, or use the Chrome extension on a computer.")); return; }
        if (!N.agentEnabled()) {
          const c = addCard((card) => { card.innerHTML = `<b>🤖 ${t("برای این کار ایجنت لازم است", "This needs the agent")}</b><div class="ag-task">${esc(task)}</div><div class="ag-mut">${t("اول «سرویس ایجنت گوشی» را در تنظیمات دسترسی‌پذیری اندروید روشن کن؛ بعد همین پیام را دوباره بفرست.", "First turn on the phone agent service in Android accessibility settings, then send this message again.")}</div><div class="ag-actions"><button type="button" data-a="on">${t("روشن‌کردن سرویس", "Turn it on")}</button></div>`; });
          if (c) c.querySelector("[data-a=on]").addEventListener("click", () => openAgentSheet());
          return;
        }
      } else if (!extSeen) {
        window.postMessage({ source: "suvreno-chat", type: "ping" }, location.origin);
        await new Promise((r) => setTimeout(r, 350));
        if (!extSeen && !document.documentElement.getAttribute("data-suv-agent-ext")) {
          const c = addCard((card) => { card.innerHTML = `<b>🤖 ${t("این کار با ایجنت انجام می‌شود", "This is a job for the agent")}</b><div class="ag-task">${esc(task)}</div><div class="ag-mut">${t("روی کامپیوتر، ایجنت با افزونه‌ی Chrome کار می‌کند و هنوز نصب نشده. بعد از نصب، همین پیام را دوباره بفرست.", "On a computer the agent runs through the Chrome extension, which isn't installed yet. Install it, then send this message again.")}</div><div class="ag-actions"><a href="suvreno-agent.zip" download><button type="button">⬇ ${t("دانلود افزونه", "Download extension")}</button></a><button type="button" class="gh" data-a="how">${t("راهنمای نصب", "How to install")}</button></div>`; });
          if (c) c.querySelector("[data-a=how]").addEventListener("click", () => openAgentSheet());
          return;
        }
      }
      const where = dev === "phone_app" ? t("روی همین گوشی", "on this phone") : t("در یک تب تازه‌ی Chrome", "in a new Chrome tab");
      addCard((card) => {
        const tg = target && target.name ? `<div class="ag-mut">${target.mode === "app" ? "📱 " + t("برنامه", "App") : "🌐 " + t("سایت", "Site")}: <b style="display:inline">${esc(target.name)}</b>${target.mode === "site" && target.url ? " <span dir=\"ltr\">(" + esc(String(target.url).replace(/^https?:\/\/(www\.)?/, "")) + ")</span>" : ""}</div>` : "";
        card.innerHTML = `<b>🤖 ${t("ایجنت آماده است", "Agent ready")}</b><div class="ag-task">${esc(task)}</div>${tg}<div class="ag-mut">${t("اجرا می‌شود " + where + ". قبل از خرید، پرداخت، ارسال، انتشار و حذف از تو تأیید می‌گیرد؛ رمزها را هرگز نمی‌خواند یا نمی‌نویسد و پرداخت نهایی با خودته.", "It runs " + where + ". It asks before buying, paying, sending, publishing or deleting; it never reads or types passwords and the final payment is yours.")}</div><div class="ag-actions"><button type="button" data-a="go">▶ ${t("اجرا", "Run")}</button><button type="button" class="gh" data-a="no">${t("انصراف", "Cancel")}</button></div><div class="ag-mut" data-a="note"></div>`;
        const go = card.querySelector("[data-a=go]"), no = card.querySelector("[data-a=no]"), note = card.querySelector("[data-a=note]");
        go.addEventListener("click", () => { go.disabled = true; no.disabled = true; startChatAgent(task, card, note, [go, no]); });
        no.addEventListener("click", () => { go.disabled = true; no.disabled = true; note.textContent = t("لغو شد.", "Cancelled."); });
      });
    }
    async function agentRoute(text) {
      try {
        if (!findToken()) return false;
        const task = String(text || "").trim();
        if (task.length < 4 || task.length > 500 || !AG_LOOKS.test(task)) return false;
        const r = await plusCall({ mode: "plus-intent", text: task, device: agDevice() }, 15000);
        if (!r || !r.ok) return false;
        let route = r.route;
        if (route === "ambiguous") { route = await chooseRoute(task, r.options || []); if (route === null) return true; }
        if (route === "agent") { await offerAgent(task, r.target); return true; }
        if (route === "phone_tool") return "phone";
        return false;
      } catch { return false; }
    }
    window.SuvAgentChat = { route: agentRoute };
    function chatAgentEvent(o) {
      if (!chatRun) return;
      if (o.type === "step" && o.text) chatRun.note(o.text);
      if (o.type === "done") { say("🤖 " + t("ایجنت: ", "Agent: ") + (o.text || t("کار تموم شد.", "Done."))); chatRun = null; }
      else if (o.type === "error") { say("⚠️ " + (o.text || t("ایجنت متوقف شد.", "The agent stopped."))); chatRun = null; }
      else if (o.type === "stopped") { say("⏹ " + t("ایجنت متوقف شد.", "The agent stopped.")); chatRun = null; }
    }
    /* ---------- «تنظیمات ← ایجنت»: همه‌ی کنترل‌های ایجنت گوشی و کامپیوتر (دیگر در صفحه‌ی پلن‌ها نیست) ---------- */
    function openAgentSheet() {
      agCss();
      let sh = document.getElementById("agSheet");
      if (!sh) {
        sh = document.createElement("div"); sh.id = "agSheet"; sh.className = "ag-ov"; sh.style.display = "none";
        sh.innerHTML = `<div class="ag-box" dir="${isEn() ? "ltr" : "rtl"}"><button type="button" class="ag-x" aria-label="close">×</button><h3>🤖 ${t("ایجنت Suvreno", "Suvreno Agent")}</h3>
          <div class="pp-mut">${t("ایجنت می‌تواند کارهای چندمرحله‌ای را روی سایت‌ها و برنامه‌ها انجام بدهد. لازم نیست به همین بخش بیایی: کافی است توی چت اصلی بگویی، مثلاً «برو توی دیجی‌کالا یک کت و شلوار مشکی مردانه به سبد خرید اضافه کن». Suvreno خودش می‌فهمد این کار ایجنت است یا کاری که با ابزار آماده‌ی گوشی (آلارم، تماس، پیامک…) انجام می‌شود، و اگر مطمئن نباشد از خودت می‌پرسد.", "The agent can do multi-step jobs on websites and apps. You don't need to come here: just say it in the main chat, e.g. “go to Digikala and add a black men's suit to the cart”. Suvreno works out whether it's an agent job or something its built-in phone tools do (alarm, call, SMS…), and asks you if it isn't sure.")}</div>
          <div id="ppAgent"></div><div id="ppAgentPhone"></div></div>`;
        sh.addEventListener("click", (e) => { if (e.target === sh || (e.target.classList && e.target.classList.contains("ag-x"))) sh.style.display = "none"; });
        document.body.appendChild(sh);
      }
      sh.style.display = "flex"; renderAgent(); renderPhoneAgent();
    }
    /* ---------- «کارهای زمان‌بندی‌شده» + «شناخت من» (مرحله‌ی ۱) ---------- */
    function jobCss() {
      if (document.getElementById("jbCss")) return;
      const st = document.createElement("style"); st.id = "jbCss";
      st.textContent = ".jb-tabs{display:flex;gap:6px;margin:10px 0}.jb-tabs button{flex:1;border:1px solid rgba(127,127,127,.4);background:rgba(127,127,127,.12);color:inherit;border-radius:12px;padding:8px 6px;font:inherit;font-size:13px;cursor:pointer}.jb-tabs button.on{background:rgba(var(--ac1-rgb),.28);border-color:rgba(var(--ac1-rgb),.7);font-weight:700}"
        + ".jb-f{display:block;width:100%;box-sizing:border-box;margin-top:8px;padding:10px 12px;border-radius:12px;border:1px solid rgba(127,127,127,.4);background:rgba(127,127,127,.12);color:inherit;font:inherit;font-size:14px}textarea.jb-f{min-height:74px;resize:vertical;line-height:1.8}.jb-row{display:flex;gap:8px}.jb-row>*{flex:1;min-width:0}"
        + ".jb-lb{font-size:12.5px;opacity:.8;margin-top:10px;display:block}.jb-it{margin-top:10px;padding:10px 12px;border-radius:14px;border:1px solid rgba(127,127,127,.3);background:rgba(127,127,127,.1);line-height:1.8}.jb-it b{display:block}.jb-bd{display:inline-block;font-size:11.5px;padding:1px 8px;border-radius:99px;background:rgba(127,127,127,.25);margin-inline-start:6px}.jb-bd.ok{background:rgba(46,204,113,.3)}.jb-bd.bad{background:rgba(231,76,60,.3)}"
        + ".jb-b{border:0;border-radius:12px;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer;color:#04141a;background:linear-gradient(135deg,rgba(var(--ac1-rgb),1),rgba(var(--ac1-rgb),.8));margin-top:10px}.jb-b.sec{color:inherit;background:rgba(127,127,127,.22);font-weight:500}.jb-b:disabled{opacity:.5}.jb-msg{margin-top:10px;font-size:13px;line-height:1.9}.jb-msg.bad{color:#ff8a7a}.jb-msg.ok{color:#5be39a}.jb-view{white-space:pre-wrap;line-height:2;margin-top:10px;padding:12px;border-radius:14px;background:rgba(0,0,0,.22);font-size:14px;max-height:50vh;overflow:auto}";
      document.head.appendChild(st);
    }
    const JB_ST = { scheduled: ["در انتظار", "Waiting", ""], running: ["در حال اجرا", "Running", ""], done: ["انجام شد", "Done", "ok"], failed: ["ناموفق", "Failed", "bad"], device_wait: ["منتظر اجرا روی دستگاه تو", "Waiting for your device", "bad"], claimed: ["در حال شروع روی دستگاه", "Starting on device", ""] };
    const JB_KIND = { article: ["مقاله", "Article"], research: ["گزارش", "Report"], monitor: ["بررسی صفحه", "Page check"], needs_login: ["نیازمند ورود (روی دستگاه)", "Needs login (on device)"], api_check: ["خواندن پنل با API", "Panel via API"] };
    function openJobsSheet(startTab) {
      jobCss(); agCss();
      let sh = document.getElementById("jbSheet");
      if (!sh) {
        sh = document.createElement("div"); sh.id = "jbSheet"; sh.className = "ag-ov"; sh.style.display = "none";
        sh.innerHTML = `<div class="ag-box" dir="${isEn() ? "ltr" : "rtl"}"><button type="button" class="ag-x" aria-label="close">×</button><h3>⏰ ${t("کارهای زمان‌بندی‌شده", "Scheduled tasks")}</h3>
          <div class="pp-mut">${t("یک کار با زمان مشخص بده (مثلاً «امشب ساعت ۱۰ از این منابع یک گزارش بساز»). Suvreno سر وقت خودش انجام می‌دهد و نتیجه را اینجا می‌گذارد؛ لازم نیست آنلاین باشی. نتیجه به اپ، چت و (اگر ایمیلت تأیید شده باشد) ایمیلت می‌رسد. اگر سایت وردپرسی‌ات را در تب «سایت من» وصل کنی، می‌توانی انتخاب کنی مستقیم منتشر شود یا اول خودت ببینی. اگر پنل‌ات API دارد، در تب «API پنل‌ها» فقط‌خواندنی وصلش کن تا سر ساعت (حتی وقتی دستگاهت خاموش است) چک شود.", "Give a task with a time. Suvreno runs it on schedule and leaves the result here; you don't need to be online. Results go to the app, chat and (if your email is verified) email. Connect your WordPress site in the My site tab to publish directly or review first. To check a panel that has an API, connect it (read-only) in the Panel APIs tab.")}</div>
          <div class="jb-tabs"><button type="button" data-tab="jobs">${t("کارها", "Tasks")}</button><button type="button" data-tab="res">${t("نتیجه‌ها", "Results")}<span id="jbUnread"></span></button><button type="button" data-tab="me">${t("شناخت من", "About me")}</button><button type="button" data-tab="api">${t("API پنل‌ها", "Panel APIs")}</button><button type="button" data-tab="site">${t("سایت من", "My site")}</button></div>
          <div id="jbBody"></div></div>`;
        sh.addEventListener("click", (e) => {
          if (e.target === sh || (e.target.classList && e.target.classList.contains("ag-x"))) { sh.style.display = "none"; return; }
          const tb = e.target.closest ? e.target.closest("button[data-tab]") : null; if (tb) { jbTab(tb.getAttribute("data-tab")); return; }
          const a = e.target.closest ? e.target.closest("[data-jb]") : null; if (a) jbAction(a);
        });
        document.body.appendChild(sh);
      }
      sh.style.display = "flex"; jbTab(startTab || "jobs");
    }
    const jbState = { tab: "jobs", list: null, prop: null, view: null, apiList: null, apiEdit: null };
    function jbMsg(text, kind) { const m = document.getElementById("jbMsg"); if (m) { m.className = "jb-msg " + (kind || ""); m.textContent = text || ""; } }
    function jbSetTabs() { document.querySelectorAll("#jbSheet .jb-tabs button").forEach((b) => b.classList.toggle("on", b.getAttribute("data-tab") === jbState.tab)); const u = document.getElementById("jbUnread"); if (u) u.textContent = jbState.list && jbState.list.unread ? " (" + num(jbState.list.unread) + ")" : ""; }
    async function jbTab(tab) {
      jbState.tab = tab; jbState.view = null; jbSetTabs();
      const body = document.getElementById("jbBody"); if (!body) return;
      if (!findToken()) { body.innerHTML = `<div class="jb-msg bad">${t("اول وارد حساب Suvreno شو.", "Please sign in first.")}</div>`; return; }
      body.innerHTML = `<div class="jb-msg">${t("در حال بارگذاری…", "Loading…")}</div>`;
      try {
        if (tab === "api") { const r = await plusCall({ mode: "plus-api-list" }); if (!r || !r.ok) throw new Error(r && r.message); jbState.apiList = r; jbRenderApi(r); return; }
        if (tab === "site") { const r = await plusCall({ mode: "plus-site-get" }); if (!r || !r.ok) throw new Error(r && r.message); jbState.siteType = ""; jbRenderSite(r); return; }
        if (tab === "me") { const r = await plusCall({ mode: "plus-profile-get" }); if (!r || !r.ok) throw new Error(r && r.message); jbRenderMe(r.profile || {}); return; }
        const r = await plusCall({ mode: "plus-job-list" }); if (!r || !r.ok) throw new Error(r && r.message);
        jbState.list = r; jbSetTabs();
        if (tab === "res") jbRenderRes(); else jbRenderJobs();
      } catch (e) { body.innerHTML = `<div class="jb-msg bad">${esc((e && e.message) || t("بارگذاری نشد؛ دوباره امتحان کن.", "Could not load; try again."))}</div>`; }
    }
    function jbDevNote(L) {
      const dj = (L.jobs || []).filter((j) => j.exec === "device"); if (!dj.length) return "";
      const w = dj.filter((j) => j.status === "device_wait" || j.status === "claimed").length;
      return `<div class="jb-it"><b>${t("کارهای نیازمند ورود (روی دستگاه خودت)", "Login-required tasks (run on your device)")}</b><div class="ag-mut">${w ? t("الان " + w + " کار منتظر اجرای توست؛ «اجرا روی این دستگاه» را بزن یا افزونه‌ی Chrome را باز کن. ", w + " task(s) waiting for you; tap \"Run on this device\" or open the Chrome extension. ") : ""}${L.deviceSeenText ? t("آخرین ارتباط دستگاه: ", "Last device contact: ") + esc(L.deviceSeenText) + (L.deviceOnline ? " ✅" : " — " + t("الان آنلاین نیست", "offline now")) : t("هنوز دستگاهی وصل نشده؛ افزونه‌ی Chrome یا اپ را از «تنظیمات ← ایجنت» وصل کن.", "No device connected yet; connect the Chrome extension or the app from Settings → Agent.")}</div></div>`;
    }
    async function jbRunOnDevice(id, el) {
      const dev = agDevice(), hasExt = extSeen || !!document.documentElement.getAttribute("data-suv-agent-ext");
      if (dev === "phone_web") { jbMsg(t("روی گوشی، اجرا فقط از داخل اپ اندروید Suvreno (ایجنت گوشی) ممکن است.", "On a phone, this only works inside the Suvreno Android app (phone agent)."), "bad"); return; }
      if (dev === "desktop" && !hasExt) { jbMsg(t("افزونه‌ی Suvreno Agent را در Chrome نصب کن و همین صفحه را دوباره باز کن.", "Install the Suvreno Agent extension in Chrome and reload this page."), "bad"); return; }
      el.disabled = true; jbMsg(t("در حال آماده‌سازی…", "Preparing…"));
      const c = await plusCall({ mode: "plus-job-device-run", id }, 20000);
      if (!c || !c.ok) { el.disabled = false; jbMsg((c && c.message) || t("آماده نشد.", "Not ready."), "bad"); return; }
      let code = "";
      if (!(dev === "phone_app" && phNative().agentHasToken())) {
        const r = await plusCall({ mode: "agent-pair-create", device: dev === "phone_app" ? "phone" : "web" }, 20000);
        if (!r || !r.ok) { el.disabled = false; jbMsg((r && r.message) || t("اتصال ایجنت برقرار نشد.", "Couldn't connect the agent."), "bad"); return; }
        code = String(r.code || "").replace(/-/g, "");
      }
      if (dev === "phone_app") {
        let out; try { out = JSON.parse(phNative().agentStart(code, c.task)); } catch { out = { ok: false }; }
        if (!out.ok) { el.disabled = false; jbMsg(out.message || t("شروع نشد.", "Couldn't start."), "bad"); return; }
        phLog = []; phRunning = true; jbMsg(t("ایجنت شروع کرد؛ برنامه به صفحه‌ی اصلی می‌رود. نتیجه بعد از پایان در تب «نتیجه‌ها» می‌آید.", "Agent started; the result will appear in Results when done."), "ok");
      } else {
        const ack = await new Promise((res) => { extAck = res; setTimeout(() => { if (extAck) { extAck = null; res({ ok: false, error: "timeout" }); } }, 5000); window.postMessage({ source: "suvreno-chat", type: "run", task: c.task, code }, location.origin); });
        el.disabled = false;
        if (!ack.ok) { jbMsg(t("افزونه جواب نداد؛ آیکن Suvreno Agent را باز کن و دوباره امتحان کن.", "The extension didn't answer; open it and retry."), "bad"); return; }
        jbMsg(t("یک تب تازه باز شد و ایجنت همان‌جا کار می‌کند؛ نتیجه بعد از پایان در تب «نتیجه‌ها» می‌آید.", "A new tab opened and the agent is working; the result will appear in Results."), "ok");
      }
    }
    function jbRenderJobs() {
      const L = jbState.list || {}, q = L.quota || {}, body = document.getElementById("jbBody"), p = jbState.prop || {};
      const per = q.per === "week" ? t("این هفته", "this week") : t("امروز", "today");
      const rows = (L.jobs || []).map((j) => {
        const st = JB_ST[j.status] || [j.status, j.status, ""], k = JB_KIND[j.kind] || JB_KIND.research;
        return `<div class="jb-it"><b>${esc(j.title || j.task)}<span class="jb-bd ${st[2]}">${t(st[0], st[1])}</span></b><div class="ag-mut">${t(k[0], k[1])} · ${t("زمان", "Time")}: ${esc(j.runAtText)}${j.repeat ? " · " + (j.repeat === "daily" ? t("هر روز", "daily") : t("هر هفته", "weekly")) : ""}${j.publish_mode === "auto" ? " · " + t("انتشار مستقیم", "direct publish") : (j.publish_mode === "ask" ? " · " + t("پیش‌نویس", "draft") : "")}${j.last_error && j.status !== "done" ? "<br>" + esc(j.last_error) : ""}</div>${["scheduled", "running", "device_wait", "claimed"].includes(j.status) ? `<div class="ag-actions">${j.status === "device_wait" || j.status === "claimed" ? `<button type="button" class="jb-b" data-jb="devrun" data-id="${esc(j.id)}">${t("اجرا روی این دستگاه", "Run on this device")}</button>` : ""}${j.status === "scheduled" ? `<button type="button" class="jb-b sec" data-jb="run" data-id="${esc(j.id)}">${t("اجرا همین حالا", "Run now")}</button>` : ""}<button type="button" class="jb-b sec" data-jb="cancel" data-id="${esc(j.id)}">${t("لغو", "Cancel")}</button></div>` : ""}</div>`;
      }).join("") || `<div class="ag-mut" style="margin-top:12px">${t("هنوز کاری ثبت نکرده‌ای.", "No tasks yet.")}</div>`;
      body.innerHTML = `${jbDevNote(L)}<label class="jb-lb">${t("کار را به زبان خودت بنویس", "Describe the task in your own words")}</label>
        <textarea class="jb-f" id="jbText" maxlength="700" placeholder="${esc(t("مثلاً: فردا ساعت ۱۰ شب از چند منبع خبری درباره‌ی … یک مقاله‌ی خلاصه‌ی منبع‌دار آماده کن", "e.g. Tomorrow at 10pm, summarize the news about … into a sourced article"))}"></textarea>
        <button type="button" class="jb-b sec" data-jb="parse">${t("بفهم و فرم را پر کن", "Understand & fill the form")}</button>
        <label class="jb-lb">${t("کار", "Task")}</label><textarea class="jb-f" id="jbTask" maxlength="800">${esc(p.task || "")}</textarea>
        <div class="jb-row"><div><label class="jb-lb">${t("تاریخ (به وقت تهران)", "Date (Tehran time)")}</label><input class="jb-f" id="jbDate" dir="ltr" type="date" value="${esc(p.date || "")}"></div><div><label class="jb-lb">${t("ساعت", "Time")}</label><input class="jb-f" id="jbTime" dir="ltr" type="time" value="${esc(p.time || "")}"></div></div>
        <label class="jb-lb">${t("تکرار", "Repeat")}</label><select class="jb-f" id="jbRep"><option value="">${t("فقط یک بار", "Once")}</option><option value="daily"${p.repeat === "daily" ? " selected" : ""}>${t("هر روز (پلن پولی)", "Daily (paid)")}</option><option value="weekly"${p.repeat === "weekly" ? " selected" : ""}>${t("هر هفته (پلن پولی)", "Weekly (paid)")}</option></select>
        <label class="jb-lb">${t("آدرس منبع‌ها (هر خط یک آدرس https؛ اختیاری، تا " + num((L.limits || {}).urls || 3) + " تا)", "Source URLs (one https URL per line, optional, up to " + ((L.limits || {}).urls || 3) + ")")}</label><textarea class="jb-f" id="jbUrls" dir="ltr" style="min-height:56px" placeholder="https://…">${esc((p.urls || []).join("\n"))}</textarea>
        <div class="ag-mut">${t("اگر آدرسی ندهی و جست‌وجوی وب سرور فعال باشد، خودش منبع پیدا می‌کند. کارهای نیازمند ورود به پنل: یا پنل را با API وصل کن و پایین انتخاب کن، یا بدون آن روی دستگاه خودت (افزونه‌ی Chrome/اپ) اجرا می‌شوند.", "If you give no URLs, web search is used when enabled. Tasks that need a panel login either use a connected panel API (select it below) or run on your own device.")}</div>
        ${(L.apiLinks || []).length ? `<label class="jb-lb">${t("خواندن از API پنل (فقط‌خواندنی، ابری)", "Read from a panel API (read-only, cloud)")}</label><select class="jb-f" id="jbApi"><option value="">${t("نه، از منابع وب/جست‌وجو", "No, use web sources")}</option>${(L.apiLinks || []).map((a) => `<option value="${esc(a.id)}" data-paths="${esc((a.paths || []).join(" | "))}">${esc(a.name)}</option>`).join("")}</select>
        <textarea class="jb-f" id="jbApiPaths" dir="ltr" style="min-height:48px" placeholder="${esc(t("مسیرهای API (اختیاری؛ هر خط یکی؛ خالی = همه‌ی مسیرهای مجاز)", "API paths (optional, one per line; empty = all allowed paths)"))}"></textarea><div class="ag-mut" id="jbApiHint"></div>` : `<div class="ag-mut">${t("پنلت API دارد؟ در تب «API پنل‌ها» وصلش کن تا سر ساعت بدون نیاز به روشن بودن دستگاهت خوانده شود.", "Does your panel have an API? Connect it in the Panel APIs tab so it is read on schedule without your device.")}</div>`}
        <label class="jb-lb">${t("انتشار در سایت من", "Publish to my site")}</label><select class="jb-f" id="jbPub"><option value="">${t("فقط برای خودم بفرست (منتشر نشود)", "Just send it to me (no publishing)")}</option><option value="ask"${p.publish === true ? " selected" : ""}>${t("پیش‌نویس بساز؛ خودم تصمیم می‌گیرم منتشر شود", "Make a draft; I decide whether to publish")}</option><option value="auto">${t("خودت مستقیم در سایتم منتشر کن", "Publish directly to my site")}</option></select>
        <div class="ag-mut">${t("انتشار فقط با سایت وصل‌شده (تب «سایت من») ممکن است. اگر «مستقیم» را انتخاب کنی، Suvreno بعد از ساخت متن خودش و بدون پرسیدن دوباره در سایتت منتشرش می‌کند.", "Publishing needs a connected site (\"My site\" tab). If you choose direct, Suvreno publishes it by itself right after writing, without asking again.")}</div>
        <label class="jb-lb" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="jbMail" checked> ${t("نتیجه به ایمیلم هم فرستاده شود (فقط اگر ایمیلت تأیید شده)", "Also email me the result (only if your email is verified)")}</label>
        <button type="button" class="jb-b" data-jb="create">${t("ثبت کار", "Schedule")}</button>
        <div id="jbMsg" class="jb-msg">${p.needsDevice ? t("این کار به‌نظر نیاز به ورود به پنل/حساب دارد: اگر پنلت API دارد پایین انتخابش کن؛ وگرنه سر ساعت روی دستگاه خودت (افزونه/اپ) اجرا می‌شود.", "This looks like it needs a login: pick a panel API below if you have one; otherwise it runs on your own device.") : ""}</div>
        <div class="ag-mut" style="margin-top:12px">${t("سطح تو: ", "Your plan: ")}<b style="display:inline">${esc(L.tierLabel || "")}</b> · ${t("ثبت کار " + per + ": " + num(q.made || 0) + " از " + num(q.createCap || 0) + " · کار فعال: " + num(q.active || 0) + " از " + num(q.activeCap || 0), "Created " + per + ": " + (q.made || 0) + "/" + (q.createCap || 0) + " · active: " + (q.active || 0) + "/" + (q.activeCap || 0))}${L.nowText ? "<br>" + t("ساعت الان (تهران): ", "Now (Tehran): ") + esc(L.nowText) : ""}</div>
        ${rows}`;
      const sel = document.getElementById("jbApi");
      if (sel) { const sync = () => { const o = sel.options[sel.selectedIndex], h = document.getElementById("jbApiHint"); if (h) h.textContent = o && o.value ? t("مسیرهای مجاز: ", "Allowed paths: ") + (o.getAttribute("data-paths") || "") : ""; }; sel.addEventListener("change", sync); sync(); }
    }
    function jbRenderRes() {
      const L = jbState.list || {}, body = document.getElementById("jbBody"), v = jbState.view;
      if (v) {
        body.innerHTML = `<button type="button" class="jb-b sec" data-jb="back">${t("← برگشت", "← Back")}</button><div class="jb-it"><b>${esc(v.title || "")}</b><div class="ag-mut">${esc(v.atText || "")}</div></div><div class="jb-view" id="jbView">${esc(v.body || "")}</div><button type="button" class="jb-b" data-jb="copy">${t("کپی متن", "Copy text")}</button>${jbPubBox(v)}<div id="jbMsg" class="jb-msg"></div>`;
        return;
      }
      body.innerHTML = (L.results || []).map((r) => `<div class="jb-it"><b>${esc(r.title || "")}<span class="jb-bd ${r.status === "ok" ? "ok" : "bad"}">${r.status === "ok" ? t("آماده", "Ready") : t("ناموفق", "Failed")}</span>${r.is_read ? "" : `<span class="jb-bd">${t("جدید", "new")}</span>`}${r.publish_state === "published" ? `<span class="jb-bd ok">${t("منتشر شد", "published")}</span>` : (r.publish_state === "draft" ? `<span class="jb-bd">${t("پیش‌نویس در سایت", "draft on site")}</span>` : "")}</b><div class="ag-mut">${esc(r.atText)}<br>${esc(String(r.snippet || "").replace(/\s+/g, " "))}…</div><div class="ag-actions"><button type="button" class="jb-b sec" data-jb="open" data-id="${esc(r.id)}">${t("باز کردن", "Open")}</button></div></div>`).join("")
        || `<div class="ag-mut" style="margin-top:12px">${t("هنوز نتیجه‌ای نیست؛ بعد از اجرای اولین کار اینجا می‌آید.", "No results yet.")}</div>`;
    }
    function jbPubBox(v) {
      if (!v || v.status !== "ok") return "";
      if (v.publish_state === "published") return `<div class="jb-it"><b>${t("منتشر شد ✅", "Published ✅")}</b>${v.publish_url ? `<a href="${esc(v.publish_url)}" target="_blank" rel="noopener">${esc(v.publish_url)}</a>` : ""}</div>`;
      if (!(jbState.list && jbState.list.siteLinked)) return `<div class="ag-mut" style="margin-top:10px">${t("برای انتشار خودکار، اول در تب «سایت من» مقصد انتشار (وردپرس، Ghost، وبهوک یا کانال تلگرام) را وصل کن؛ یا متن را کپی کن و خودت منتشر کن.", "To publish automatically, connect a destination (WordPress, Ghost, webhook or Telegram channel) in the \"My site\" tab, or copy the text and publish it yourself.")}</div>`;
      const tg = (jbState.list.siteType || "") === "telegram";
      return `<div class="ag-actions"><button type="button" class="jb-b" data-jb="pub" data-st="publish" data-id="${esc(v.id)}">${tg ? t("ارسال به کانال تلگرام", "Send to Telegram channel") : t("انتشار در سایت", "Publish to site")}</button>${tg ? "" : `<button type="button" class="jb-b sec" data-jb="pub" data-st="draft" data-id="${esc(v.id)}">${t("ذخیره‌ی پیش‌نویس در سایت", "Save draft on site")}</button>`}</div>${v.publish_state === "draft" && v.publish_url ? `<div class="ag-mut">${t("پیش‌نویس در سایت هست: ", "Draft on site: ")}${esc(v.publish_url)}</div>` : ""}`;
    }
    function jbRenderApi(r) {
      const b = document.getElementById("jbBody"), ed = jbState.apiEdit, links = r.links || [], lim = r.limits || {};
      const AT = { bearer: ["Bearer (توکن)", "Bearer token"], header: ["هدر دلخواه (مثل X-API-Key)", "Custom header (e.g. X-API-Key)"], basic: ["نام کاربری و رمز (Basic)", "Username & password (Basic)"] };
      const cards = links.map((a) => `<div class="jb-it"><b>${esc(a.name)}<span class="jb-bd ok">${t("وصل است", "Connected")}</span></b><div class="ag-mut" dir="ltr" style="text-align:left">${esc(a.base_url)}<br>${esc((a.paths || []).join("  ·  "))}</div><div class="ag-mut">${t("آخرین بررسی: ", "Last checked: ")}${esc(a.verifiedText || "")}</div><div class="ag-actions"><button type="button" class="jb-b sec" data-jb="atest" data-id="${esc(a.id)}">${t("تست اتصال", "Test")}</button><button type="button" class="jb-b sec" data-jb="aedit" data-id="${esc(a.id)}">${t("ویرایش", "Edit")}</button><button type="button" class="jb-b sec" data-jb="adel" data-id="${esc(a.id)}">${t("حذف", "Delete")}</button></div></div>`).join("");
      const canAdd = ed || links.length < (lim.links || 1);
      const form = canAdd ? `<label class="jb-lb">${t("نام اتصال", "Connection name")}</label><input class="jb-f" id="jbApiName" maxlength="40" placeholder="${esc(t("مثلاً پنل فروشگاه", "e.g. Shop panel"))}" value="${esc(ed ? ed.name : "")}">
        <label class="jb-lb">${t("آدرس پایه‌ی API", "API base URL")}</label><input class="jb-f" id="jbApiUrl" dir="ltr" placeholder="https://panel.example.com" value="${esc(ed ? ed.base_url : "")}">
        <label class="jb-lb">${t("روش احراز هویت", "Authentication")}</label><select class="jb-f" id="jbApiAuth">${Object.keys(AT).map((k) => `<option value="${k}"${ed && ed.auth_type === k ? " selected" : ""}>${t(AT[k][0], AT[k][1])}</option>`).join("")}</select>
        <div id="jbApiHdrBox"><label class="jb-lb">${t("نام هدر", "Header name")}</label><input class="jb-f" id="jbApiHdr" dir="ltr" placeholder="X-API-Key" value="${esc(ed ? ed.header_name : "")}"></div>
        <div id="jbApiUserBox"><label class="jb-lb">${t("نام کاربری", "Username")}</label><input class="jb-f" id="jbApiUser" dir="ltr" autocomplete="off" value="${esc(ed ? ed.username : "")}"></div>
        <label class="jb-lb">${t("کلید / توکن / رمز API", "API key / token / password")}</label><input class="jb-f" id="jbApiSecret" dir="ltr" type="password" autocomplete="new-password" placeholder="${esc(ed ? t("برای نگه‌داشتن کلید قبلی خالی بگذار", "Leave empty to keep the current key") : "")}">
        <label class="jb-lb">${t("مسیرهای مجاز (هر خط یکی، فقط خواندن)", "Allowed paths (one per line, read-only)")}</label><textarea class="jb-f" id="jbApiPathsDef" dir="ltr" style="min-height:70px" placeholder="/api/stats&#10;/api/orders?status=new">${esc(ed ? (ed.paths || []).join("\n") : "")}</textarea>
        <div class="ag-actions"><button type="button" class="jb-b" data-jb="asave"${ed ? ` data-id="${esc(ed.id)}"` : ""}>${t(ed ? "ذخیره و تست" : "اتصال و تست", ed ? "Save & test" : "Connect & test")}</button>${ed ? `<button type="button" class="jb-b sec" data-jb="anew">${t("انصراف", "Cancel")}</button>` : ""}</div>` : `<div class="ag-mut">${t("به سقف اتصال‌های این سطح (" + num(lim.links || 1) + ") رسیده‌ای؛ یکی را حذف کن یا پلن بالاتر بگیر.", "You reached the connection limit for your plan (" + (lim.links || 1) + ").")}</div>`;
      b.innerHTML = `<div class="ag-mut">${t("اگر پنل یا سایتت API دارد، Suvreno می‌تواند سر ساعتی که تعیین می‌کنی (حتی وقتی دستگاهت خاموش است) داده‌اش را بخواند، خلاصه کند و به تو بدهد. فقط درخواست خواندن (GET) و فقط از مسیرهایی که خودت اینجا می‌نویسی ارسال می‌شود؛ چیزی تغییر یا حذف نمی‌شود. برای امنیت، کلیدی بساز که فقط دسترسی «خواندن» داشته باشد، نه مدیر کل. کلید رمزنگاری می‌شود و هر وقت خواستی حذفش کن. ایمیل، شماره‌ی تلفن، کارت و فیلدهای شبیه رمز/توکن پیش از رسیدن به مدل پنهان می‌شوند.", "If your panel or site has an API, Suvreno can read it on schedule (even when your device is off), summarize it and send it to you. Only read requests (GET) to the paths you list are sent; nothing is changed or deleted. Create a read-only key, not a full admin key. The key is stored encrypted; delete it any time. Emails, phone numbers, cards and secret-like fields are masked before reaching the model.")}</div>
        ${r.ready ? "" : `<div class="jb-msg bad">${t("این بخش هنوز روی سرور راه‌اندازی نشده؛ به پشتیبانی خبر بده.", "This is not set up on the server yet.")}</div>`}
        ${cards}${form}<div id="jbMsg" class="jb-msg"></div><div id="jbApiOut" class="ag-mut" dir="ltr" style="text-align:left;white-space:pre-wrap"></div>`;
      const sel = document.getElementById("jbApiAuth");
      if (sel) { const sync = () => { const v = sel.value, h = document.getElementById("jbApiHdrBox"), u = document.getElementById("jbApiUserBox"); if (h) h.style.display = v === "header" ? "" : "none"; if (u) u.style.display = v === "basic" ? "" : "none"; }; sel.addEventListener("change", sync); sync(); }
    }
    function jbRenderSite(r) {
      jbState.siteR = r;
      const s0 = r.site, b = document.getElementById("jbBody");
      const TY = { wordpress: ["وردپرس", "WordPress"], ghost: ["Ghost", "Ghost"], webhook: ["وبهوک / API عمومی (هر سایت)", "Webhook / generic API"], telegram: ["کانال تلگرام", "Telegram channel"], none: ["فقط تحویل متن (کپی دستی)", "Text only (copy manually)"] };
      const ty = jbState.siteType || (s0 ? s0.type : "") || "wordpress", same = !!s0 && s0.type === ty;
      const lb = (fa, en) => `<label class="jb-lb">${t(fa, en)}</label>`;
      const inp = (id, ph, val, pw) => `<input class="jb-f" id="${id}" dir="ltr" ${pw ? 'type="password" autocomplete="new-password"' : 'autocomplete="off"'} placeholder="${esc(ph || "")}" value="${esc(val || "")}">`;
      let fields = "", help = "";
      if (ty === "wordpress") {
        fields = lb("آدرس سایت وردپرس", "WordPress site URL") + inp("jbSiteUrl", "https://example.com", same ? s0.base_url : "") + lb("نام کاربری وردپرس", "WordPress username") + inp("jbSiteUser", "", same ? s0.username : "") + lb("رمز برنامه (Application Password)", "Application Password") + inp("jbSitePass", "xxxx xxxx xxxx xxxx xxxx xxxx", "", true);
        help = t("وردپرس ← کاربران ← پروفایل ← پایین صفحه «Application Passwords» ← یک نام (مثلاً Suvreno) بنویس ← «Add New Application Password» ← رمز نمایش‌داده‌شده را همین‌جا بچسبان. رمز اصلی حسابت را هرگز اینجا نگذار. اگر این بخش را نمی‌بینی، سایتت باید HTTPS داشته باشد و افزونه‌ی امنیتی‌ات نباید REST API را ببندد.", "WordPress → Users → Profile → Application Passwords → name it → Add New → paste the password here. Never use your main password. Requires HTTPS and an unblocked REST API.");
      } else if (ty === "ghost") {
        fields = lb("آدرس سایت Ghost", "Ghost site URL") + inp("jbSiteUrl", "https://blog.example.com", same ? s0.base_url : "") + lb("کلید Admin API", "Admin API key") + inp("jbSitePass", "id:secret", "", true);
        help = t("در Ghost: Settings ← Integrations ← Add custom integration ← یک نام (مثلاً Suvreno) ← مقدار «Admin API Key» را کپی و اینجا بچسبان (شبیه id:secret). آدرس سایت همان آدرس عمومی سایت Ghost است.", "In Ghost: Settings → Integrations → Add custom integration → copy the Admin API Key (id:secret) here.");
      } else if (ty === "webhook") {
        fields = lb("آدرس وبهوک (https)", "Webhook URL (https)") + inp("jbSiteUrl", "https://example.com/hook", "") + lb("توکن (اختیاری)", "Token (optional)") + inp("jbSitePass", "", "", true);
        help = t("Suvreno هر مقاله را با POST و JSON به این آدرس می‌فرستد: event=suvreno.article و id و title و status (publish/draft) و markdown و html. اگر توکن بدهی در هدرهای Authorization: Bearer و X-Suvreno-Token می‌رود. موقع اتصال یک پیام آزمایشی (event=suvreno.ping) فرستاده می‌شود؛ گیرنده می‌تواند نادیده‌اش بگیرد. با Zapier، Make، n8n یا یک آدرس ساده‌ی خودت روی هر سایتی کار می‌کند. آدرس و توکن رمزنگاری می‌شوند.", "Suvreno POSTs each article as JSON (event=suvreno.article, id, title, status, markdown, html). A token, if given, is sent as Authorization: Bearer and X-Suvreno-Token. A test ping (event=suvreno.ping) is sent when connecting. Works with Zapier, Make, n8n or your own endpoint. URL and token are stored encrypted.");
      } else if (ty === "telegram") {
        fields = lb("کانال (مثل @mychannel)", "Channel (like @mychannel)") + inp("jbSiteUser", "@mychannel", same ? s0.username : "") + lb("توکن بات تلگرام", "Telegram bot token") + inp("jbSitePass", "123456789:ABC...", "", true);
        help = t("۱) در تلگرام با @BotFather یک بات بساز و توکنش را کپی کن. ۲) بات را به کانالت اضافه کن و ادمین کن (با اجازه‌ی ارسال پیام). ۳) نام کانال را مثل @mychannel بنویس. تلگرام پیش‌نویس ندارد؛ مقاله مستقیم در کانال ارسال می‌شود و اگر طولانی باشد در چند پیام می‌آید.", "1) Create a bot with @BotFather and copy its token. 2) Add the bot to your channel as admin with permission to post. 3) Enter the channel like @mychannel. Telegram has no drafts; articles are posted directly (split into several messages if long).");
      } else {
        help = t("بدون اتصال، نتیجه فقط در تب «نتیجه‌ها» (و اعلان/ایمیل) می‌آید و خودت متن را کپی و منتشر می‌کنی. اگر الان به جایی وصلی و می‌خواهی قطع شود، دکمه‌ی «قطع اتصال» را بزن.", "Without a connection the result stays in the Results tab (and notification/email) and you copy and publish it yourself. Use Disconnect to remove an existing connection.");
      }
      const btns = `<div class="ag-actions">${ty !== "none" ? `<button type="button" class="jb-b" data-jb="ssave">${t(same ? "به‌روزرسانی اتصال" : "اتصال", same ? "Update" : "Connect")}</button>` : ""}${s0 ? `<button type="button" class="jb-b sec" data-jb="sclear">${t("قطع اتصال", "Disconnect")}</button>` : ""}</div>`;
      const sub = s0 ? (s0.type === "telegram" ? s0.username : s0.type === "ghost" || s0.type === "webhook" ? s0.base_url : s0.base_url + " · " + s0.username) : "";
      b.innerHTML = `<div class="ag-mut">${t("مقصدی که مقاله‌ها در آن منتشر می‌شود را انتخاب کن. رمز، کلید و توکن رمزنگاری می‌شوند، فقط برای انتشار مطلب‌هایی که خودت سفارش دادی استفاده می‌شوند و هر وقت خواستی قطعشان می‌کنی. اگر انتشار انجام نشود، متن در تب «نتیجه‌ها» می‌ماند و خبر می‌گیری.", "Choose where articles are published. Secrets are stored encrypted, used only for content you ordered, and you can disconnect any time. If publishing fails, the text stays in Results and you are notified.")}</div>
        ${r.ready ? "" : `<div class="jb-msg bad">${t("اتصال سایت هنوز روی سرور راه‌اندازی نشده؛ به پشتیبانی خبر بده.", "Site connection is not set up on the server yet.")}</div>`}
        ${s0 ? `<div class="jb-it"><b>${esc(s0.site_name || s0.base_url)}<span class="jb-bd ok">${t("وصل است", "Connected")}</span></b><div class="ag-mut">${t(TY[s0.type] ? TY[s0.type][0] : s0.type, TY[s0.type] ? TY[s0.type][1] : s0.type)} · ${esc(sub)}${s0.type === "wordpress" && !s0.can_publish ? "<br>" + t("این کاربر فقط پیش‌نویس می‌سازد؛ برای انتشار مستقیم نقش «نویسنده» یا بالاتر لازم است.", "This user can only create drafts.") : ""}</div></div>` : ""}
        ${lb("نوع مقصد", "Destination type")}<select class="jb-f" id="jbSiteType">${Object.keys(TY).map((k) => `<option value="${k}"${k === ty ? " selected" : ""}>${t(TY[k][0], TY[k][1])}</option>`).join("")}</select>
        <details style="margin-top:10px" open><summary class="jb-lb" style="cursor:pointer">${t("راهنمای اتصال", "Setup help")}</summary><div class="ag-mut">${help}</div></details>
        ${fields}${btns}<div id="jbMsg" class="jb-msg"></div>`;
      const sel = document.getElementById("jbSiteType");
      if (sel) sel.addEventListener("change", () => { jbState.siteType = sel.value; jbRenderSite(jbState.siteR); });
    }
    function jbRenderMe(pr) {
      const f = (k, fa, en, ph, big) => `<label class="jb-lb">${t(fa, en)}</label>${big ? `<textarea class="jb-f" data-pf="${k}" maxlength="1200" placeholder="${esc(ph)}">${esc(pr[k] || "")}</textarea>` : `<input class="jb-f" data-pf="${k}" maxlength="300" placeholder="${esc(ph)}" value="${esc(pr[k] || "")}">`}`;
      document.getElementById("jbBody").innerHTML = `<div class="ag-mut">${t("هر چه اینجا بنویسی فقط خودت می‌بینی و هر وقت خواستی پاکش می‌کنی. Suvreno در کارهای زمان‌بندی‌شده از آن استفاده می‌کند تا متن‌ها به کسب‌وکار و لحن تو نزدیک‌تر باشد. رمز و اطلاعات حساس اینجا ننویس.", "Only you can see this and you can delete it any time. It is used to tailor your scheduled tasks. Don't write passwords or secrets here.")}</div>
        ${f("business", "نام کسب‌وکار", "Business name", "")}${f("kind", "نوع کسب‌وکار", "Type of business", t("مثلاً فروشگاه آنلاین چای", "e.g. online tea shop"))}${f("site", "آدرس سایت", "Website", "example.com")}${f("audience", "مخاطب‌ها", "Audience", t("مثلاً خانم‌های ۲۵ تا ۴۵ ساله", ""))}${f("tone", "لحن نوشتن", "Writing tone", t("مثلاً صمیمی و ساده / رسمی", ""))}${f("topics", "موضوع‌های مهم برای تو", "Topics you care about", "")}${f("notes", "یادداشت‌های دیگر", "Other notes", "", true)}
        <div class="ag-actions"><button type="button" class="jb-b" data-jb="psave">${t("ذخیره", "Save")}</button><button type="button" class="jb-b sec" data-jb="pclear">${t("پاک کردن همه", "Delete all")}</button></div><div id="jbMsg" class="jb-msg"></div>`;
    }
    /* آلارم گوشی از داخل «کارهای زمان‌بندی‌شده»: اپ اندروید همان لحظه آلارم را در ساعت گوشی می‌گذارد و گوشی سر ساعت زنگ می‌زند
       (آلارم ساعت گوشی فقط تا ۲۴ ساعت آینده قابل تنظیم است). این نوع درخواست «کار ابری» ساخته نمی‌کند. */
    async function jbPhoneAlarm(pr) {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(pr.time || ""));
      if (!m) { jbMsg(t("ساعت آلارم را متوجه نشدم؛ مثلاً بنویس: «فردا ساعت ۷ صبح آلارم بذار».", "I couldn't tell the alarm time; e.g. \"set an alarm for 7 AM tomorrow\"."), "bad"); return; }
      const hour = Number(m[1]), minute = Number(m[2]);
      if (!(window.SuvNative && window.SuvNative.on && window.SuvNative.on())) { jbMsg(t("برای گذاشتن آلارم روی گوشی باید داخل اپ اندروید سوورنو باشی (در سایت مرورگر دسترسی به ساعت گوشی ندارم).", "To set a phone alarm you need to be inside the Suvreno Android app."), "bad"); return; }
      if (pr.date) {
        const at = Date.parse(pr.date + "T" + String(pr.time).padStart(5, "0") + ":00+03:30");
        if (isFinite(at) && at - Date.now() > 24 * 36e5) { jbMsg(t("آلارم ساعت گوشی فقط برای ۲۴ ساعت آینده تنظیم می‌شه؛ نزدیک‌تر به اون روز دوباره بگو.", "Phone alarms can only be set for the next 24 hours; ask again closer to the day."), "bad"); return; }
      }
      jbMsg(t("در حال تنظیم آلارم…", "Setting the alarm…"));
      const r = await window.SuvNative.run({ type: "alarm", hour, minute, label: String(pr.title || "Suvreno").slice(0, 60) });
      jbMsg((r && r.message) || t("آلارم تنظیم نشد.", "The alarm was not set."), r && r.ok ? "ok" : "bad");
    }
    async function jbAction(el) {
      const a = el.getAttribute("data-jb"), id = el.getAttribute("data-id");
      try {
        if (a === "parse") {
          const text = (document.getElementById("jbText") || {}).value || ""; el.disabled = true; jbMsg(t("در حال فهمیدن…", "Working…"));
          const r = await plusCall({ mode: "plus-job-parse", text }, 25000); el.disabled = false;
          if (!r || !r.ok) { jbMsg((r && r.message) || t("متوجه نشدم؛ فرم را دستی پر کن.", "Could not parse; fill the form manually."), "bad"); return; }
          if (r.proposal && r.proposal.kind === "phone_alarm") { await jbPhoneAlarm(r.proposal); return; }
          jbState.prop = r.proposal; jbRenderJobs();
          jbMsg(r.proposal.needsDevice ? t("این کار به‌نظر نیاز به ورود به پنل دارد: اگر پنلت API دارد انتخابش کن؛ وگرنه روی دستگاهت اجرا می‌شود.", "Needs a panel login: choose a panel API if you have one; otherwise it runs on your device.") : (r.whenText ? t("زمان فهمیده‌شده (تهران): ", "Understood time (Tehran): ") + r.whenText + t(" — بررسی کن و «ثبت کار» را بزن.", " — check and press Schedule.") : t("زمان را خودت وارد کن.", "Please enter the time.")), "ok");
        } else if (a === "create") {
          const p = jbState.prop || {}, urls = String((document.getElementById("jbUrls") || {}).value || "").split(/\s+/).map((s) => s.trim()).filter(Boolean), pubMode = (document.getElementById("jbPub") || {}).value || "";
          el.disabled = true;
          const r = await plusCall({ mode: "plus-job-create", task: (document.getElementById("jbTask") || {}).value, date: (document.getElementById("jbDate") || {}).value, time: (document.getElementById("jbTime") || {}).value, repeat: (document.getElementById("jbRep") || {}).value, urls, apiId: (document.getElementById("jbApi") || {}).value || "", apiPaths: String((document.getElementById("jbApiPaths") || {}).value || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean), kind: (document.getElementById("jbApi") || {}).value ? "api_check" : (p.needsDevice ? "needs_login" : p.kind), title: p.title, publish: pubMode !== "", publishMode: pubMode, notifyEmail: !!((document.getElementById("jbMail") || {}).checked) }, 20000); el.disabled = false;
          if (!r || !r.ok) { jbMsg((r && r.message) || t("ثبت نشد.", "Not saved."), "bad"); return; }
          jbState.prop = null; await jbTab("jobs"); jbMsg(t("ثبت شد ✅ اجرا: ", "Scheduled ✅ at ") + r.runAtText + (r.note ? " — " + r.note : ""), "ok");
        } else if (a === "cancel") { const r = await plusCall({ mode: "plus-job-cancel", id }); await jbTab("jobs"); if (!r || !r.ok) jbMsg((r && r.message) || "", "bad"); }
        else if (a === "run") { const r = await plusCall({ mode: "plus-job-run-now", id }); jbMsg((r && (r.note || r.message)) || "", r && r.ok ? "ok" : "bad"); }
        else if (a === "open") { const r = await plusCall({ mode: "plus-job-result", id }); if (r && r.ok) { jbState.view = r.result; jbRenderRes(); const rr = (jbState.list.results || []).find((x) => x.id === id); if (rr && !rr.is_read) { rr.is_read = 1; jbState.list.unread = Math.max(0, (jbState.list.unread || 1) - 1); jbSetTabs(); } } }
        else if (a === "pub") {
          el.disabled = true; jbMsg(t("در حال ارسال به سایت…", "Sending to your site…"));
          const r = await plusCall({ mode: "plus-job-publish", id, status: el.getAttribute("data-st") || "publish" }, 30000); el.disabled = false;
          if (!r || !r.ok) { jbMsg((r && r.message) || t("انتشار نشد.", "Not published."), "bad"); return; }
          const o = await plusCall({ mode: "plus-job-result", id }); if (o && o.ok) { jbState.view = o.result; jbState.list.siteLinked = o.siteLinked; jbState.list.siteType = o.siteType; jbRenderRes(); }
          jbMsg((r.state === "published" ? t("منتشر شد ✅ ", "Published ✅ ") : t("پیش‌نویس در سایت ذخیره شد ✅ ", "Draft saved on site ✅ ")) + (r.note || ""), "ok");
        }
        else if (a === "ssave") {
          el.disabled = true; jbMsg(t("در حال بررسی اتصال…", "Checking connection…"));
          const r = await plusCall({ mode: "plus-site-set", type: (document.getElementById("jbSiteType") || {}).value || "wordpress", url: (document.getElementById("jbSiteUrl") || {}).value, username: (document.getElementById("jbSiteUser") || {}).value, password: (document.getElementById("jbSitePass") || {}).value }, 30000); el.disabled = false;
          if (!r || !r.ok) { jbMsg((r && r.message) || t("وصل نشد.", "Not connected."), "bad"); return; }
          const pw = document.getElementById("jbSitePass"); if (pw) pw.value = "";
          await jbTab("site"); jbMsg(t("وصل شد ✅ ", "Connected ✅ ") + (r.note || ""), "ok");
        }
        else if (a === "sclear") { if (!confirm(t("اتصال قطع و رمز/توکن ذخیره‌شده پاک شود؟", "Disconnect and delete the stored secret?"))) return; const r = await plusCall({ mode: "plus-site-clear" }); if (r && r.ok) { await jbTab("site"); jbMsg(t("قطع شد.", "Disconnected."), "ok"); } }
        else if (a === "asave") {
          el.disabled = true; jbMsg(t("در حال اتصال و تست…", "Connecting and testing…"));
          const g = (i) => (document.getElementById(i) || {}).value || "";
          const r = await plusCall({ mode: "plus-api-set", id: id || "", name: g("jbApiName"), url: g("jbApiUrl"), authType: g("jbApiAuth"), headerName: g("jbApiHdr"), username: g("jbApiUser"), secret: g("jbApiSecret"), paths: g("jbApiPathsDef").split(/\r?\n/).map((s) => s.trim()).filter(Boolean) }, 40000); el.disabled = false;
          if (!r || !r.ok) { jbMsg((r && r.message) || t("وصل نشد.", "Not connected."), "bad"); return; }
          jbState.apiEdit = null; await jbTab("api");
          jbMsg(t("وصل شد ✅ ", "Connected ✅ ") + (r.note || ""), "ok");
          const o = document.getElementById("jbApiOut"); if (o && r.previews) o.textContent = t("نمونه‌ای از آنچه Suvreno می‌بیند (پس از پنهان‌کردن اطلاعات شخصی):", "Sample of what Suvreno sees (after masking personal data):") + "\n" + r.previews.map((x) => x.path + " → " + x.preview).join("\n");
        }
        else if (a === "atest") {
          el.disabled = true; jbMsg(t("در حال تست…", "Testing…"));
          const r = await plusCall({ mode: "plus-api-test", id }, 40000); el.disabled = false;
          if (!r || !r.ok) { jbMsg((r && r.message) || t("تست نشد.", "Test failed."), "bad"); return; }
          jbMsg(r.allOk ? t("همه‌ی مسیرها جواب می‌دهند ✅", "All paths respond ✅") : t("بعضی مسیرها مشکل دارند ⚠️", "Some paths have problems ⚠️"), r.allOk ? "ok" : "bad");
          const o = document.getElementById("jbApiOut"); if (o) o.textContent = (r.results || []).map((x) => (x.ok ? "✅ " : "❌ ") + x.path + (x.ok ? "" : " — " + x.msg)).join("\n");
        }
        else if (a === "aedit") { jbState.apiEdit = ((jbState.apiList && jbState.apiList.links) || []).find((x) => x.id === id) || null; jbRenderApi(jbState.apiList || { links: [] }); }
        else if (a === "anew") { jbState.apiEdit = null; jbRenderApi(jbState.apiList || { links: [] }); }
        else if (a === "adel") { if (!confirm(t("این اتصال و کلید ذخیره‌شده‌اش پاک شود؟ کارهای فعالی که از آن می‌خوانند لغو می‌شوند.", "Delete this connection and its stored key? Active tasks using it will be cancelled."))) return; const r = await plusCall({ mode: "plus-api-delete", id }); if (r && r.ok) { jbState.apiEdit = null; await jbTab("api"); jbMsg(t("حذف شد.", "Deleted."), "ok"); } else jbMsg((r && r.message) || "", "bad"); }
        else if (a === "devrun") { await jbRunOnDevice(id, el); }
        else if (a === "back") { jbState.view = null; jbRenderRes(); }
        else if (a === "copy") { const v = jbState.view; try { await navigator.clipboard.writeText(v ? v.body : ""); jbMsg(t("کپی شد ✅", "Copied ✅"), "ok"); } catch { jbMsg(t("کپی نشد؛ متن را دستی انتخاب کن.", "Copy failed; select the text manually."), "bad"); } }
        else if (a === "psave") { const pr = {}; document.querySelectorAll("#jbBody [data-pf]").forEach((i) => { pr[i.getAttribute("data-pf")] = i.value; }); const r = await plusCall({ mode: "plus-profile-set", profile: pr }); jbMsg(r && r.ok ? t("ذخیره شد ✅", "Saved ✅") : (r && r.message) || t("ذخیره نشد.", "Not saved."), r && r.ok ? "ok" : "bad"); }
        else if (a === "pclear") { if (!confirm(t("همه‌ی اطلاعات ذخیره‌شده درباره‌ی تو پاک شود؟", "Delete everything saved about you?"))) return; const r = await plusCall({ mode: "plus-profile-clear" }); if (r && r.ok) { jbRenderMe({}); jbMsg(t("پاک شد.", "Deleted."), "ok"); } }
      } catch (e) { el.disabled = false; jbMsg(t("خطا؛ دوباره امتحان کن.", "Error; try again."), "bad"); }
    }
    function ensureAgentSettings() {
      try {
        const caps = document.getElementById("settingsCapsBtn"); if (!caps || document.getElementById("agentSetSec")) return;
        const sec = caps.closest(".settings-section"); if (!sec || !sec.parentNode) return;
        const n = document.createElement("div"); n.className = "settings-section"; n.id = "agentSetSec";
        n.innerHTML = `<div class="id-box-label">🤖 ${t("ایجنت", "Agent")}</div><button class="clear-memory" id="agentSetBtn" type="button">🤖 ${t("ایجنت گوشی و کامپیوتر", "Phone & computer agent")}</button><button class="clear-memory" id="jobsSetBtn" type="button" style="margin-top:8px">⏰ ${t("کارهای زمان‌بندی‌شده و شناخت من", "Scheduled tasks & about me")}</button>`;
        sec.parentNode.insertBefore(n, sec.nextSibling);
        document.getElementById("agentSetBtn").addEventListener("click", () => { const c = document.getElementById("closeSettingsModal"); if (c) c.click(); setTimeout(openAgentSheet, 60); });
        document.getElementById("jobsSetBtn").addEventListener("click", () => { const c = document.getElementById("closeSettingsModal"); if (c) c.click(); setTimeout(() => openJobsSheet("jobs"), 60); });
      } catch (e) { console.error("agent-settings", e); }
    }
    ensureAgentSettings(); document.addEventListener("DOMContentLoaded", ensureAgentSettings); setTimeout(ensureAgentSettings, 700); setTimeout(ensureAgentSettings, 2500);
    function renderSales() { try { salesCss(); renderPromoBox(); renderCompare(); renderAcct(); renderFeedback(); } catch (e) { console.error("sales-ui", e); } }
    function buildPage() {
      page = document.createElement("div"); page.id = "plusPage"; page.dir = isEn() ? "ltr" : "rtl";
      page.innerHTML = `<div class="pp-in">
        <button class="pp-x" type="button" aria-label="close">×</button>
        <h1>Suvreno Plus</h1><div class="pp-sub">${t("همون Suvreno، ولی خیلی بهتر", "The same Suvreno, just much better")}</div>
        <div id="ppStatus"></div>
        <div id="ppOrder"></div>
        <div id="ppPromo"></div>
        <div class="pp-plans" id="ppPlans"></div>
        <div id="ppPackSec"></div>
        <table><thead><tr><th></th><th>${t("رایگان", "Free")}</th><th class="st">Start</th><th class="pl">Plus</th></tr></thead><tbody id="ppRows"></tbody></table>
        <div id="ppCompare"></div>
        <div id="ppExtra"></div>
        <div id="ppAcct"></div>
        <div id="ppFb"></div>
        <div class="pp-note">${(state.features || {}).creditMode ? t("هر پیام، ساخت و ویرایش تصویر، مشورت و جست‌وجوی وب از اعتبار اشتراکت کم می‌کنن و هزینه‌ی هر کار به طول و سختی درخواستت بستگی داره (پیام کوتاه و ساده ارزون‌تره). وقتی اعتبار تموم بشه باید اشتراک رو تمدید کنی و اعتبار مصرف‌نشده با تمدید منتقل می‌شه. اعدادِ «≈» تخمینی‌ان.", "Every message, image create/edit, counsel and web search spends your plan credit, and the cost depends on the length and difficulty of your request (short, simple messages are cheaper). When credit runs out you need to renew, and unused credit carries over on renewal. Numbers marked ≈ are estimates.") : t("سهمیه‌های روزانه (پیام، ساخت/ویرایش تصویر، جست‌وجو، پیام پریمیوم) هر روز ساعت ۰۰:۰۰ به‌وقت جهانی (UTC؛ ۰۳:۳۰ تهران) صفر می‌شن. تصویر پریمیوم روزانه نیست و برای کل دوره‌ی اشتراکه. جست‌وجوی وب فقط سهمیه‌ی روزانه داره و از اعتبار کیف پول کم نمی‌کنه؛ اعتبار کیف پول فقط برای متن پریمیوم، تصویر پریمیوم و ساخت/ویرایش تصویره. با پایان اشتراک، اعتبار باقی‌مانده دیگه قابل‌استفاده نیست؛ اگه قبل از پایان تمدید کنی اعتبار جمع می‌شه.", "Daily limits (messages, image create/edit, web search, premium text) reset every day at 00:00 UTC (03:30 Tehran). Premium images are not daily; they last the whole plan period. Web search only uses its daily quota and never spends wallet credit; wallet credit is only for premium text, premium images and image create/edit. When a plan ends, leftover wallet credit can no longer be used; if you renew before it ends, credit accumulates.")}</div>
        <div class="pp-note" id="ppPayNote"></div>
        <div class="pp-note pp-legal"><a href="https://suvreno.ir/pricing.html" target="_blank" rel="noopener">${t("تعرفه‌ها", "Pricing")}</a> · <a href="https://suvreno.ir/terms.html" target="_blank" rel="noopener">${t("قوانین و مقررات", "Terms")}</a> · <a href="https://suvreno.ir/privacy.html" target="_blank" rel="noopener">${t("حریم خصوصی", "Privacy")}</a> · <a href="https://suvreno.ir/refund.html" target="_blank" rel="noopener">${t("بازگشت وجه", "Refunds")}</a> · <a href="https://suvreno.ir/contact.html" target="_blank" rel="noopener">${t("تماس با ما", "Contact")}</a></div>
      </div>`;
      document.body.appendChild(page);
      page.querySelector(".pp-x").addEventListener("click", closePage);
      page.querySelector("#ppOrder").addEventListener("click", (e) => {
        const b = e.target && e.target.closest ? e.target.closest("button[data-oa]") : null; if (!b) return;
        const a = b.getAttribute("data-oa"), o = state.cardOrder;
        if (a === "open") openCardSheet();
        else if (a === "dismiss" && o) { dismissOrder(o.id); renderOrderBanner(); renderBox(); }
      });
      const onBuy = (e) => {
        const b = e.target && e.target.closest ? e.target.closest("button[data-plan]") : null;
        if (b && !b.disabled) pay(b.getAttribute("data-plan"));
      };
      page.querySelector("#ppPlans").addEventListener("click", onBuy);
      page.querySelector("#ppPackSec").addEventListener("click", onBuy);
    }
    function btnLabel(key) {
      const P = plansOf()[key];
      const short = key === "p7" ? "Start" : "Plus";
      if (!isPlus() || state.planKey === "pk") return t("خرید " + short, "Buy " + short);
      if (state.planKey === key) return t("تمدید " + short, "Renew " + short);
      if (key === "p14") return t("ارتقا به Plus", "Upgrade to Plus");
      return t("افزودن " + num(P.days) + " روز (Start)", "Add " + P.days + " days (Start)");
    }
    function planCard(key, best) {
      const P = plansOf()[key], L = P.limits || {}, F = state.features || {};
      const soon = t("(به‌زودی)", "(soon)");
      const feats = [
        t("مدت: " + num(P.days) + " روز", "Duration: " + P.days + " days"),
        t(num(L.msg) + " پیام در روز", num(L.msg) + " messages/day"),
        t(num(L.gen) + " ساخت تصویر در روز", num(L.gen) + " image creations/day"),
        t(num(L.edit) + " ویرایش تصویر در روز", num(L.edit) + " image edits/day"),
        t(num(L.search) + " جست‌وجوی وب در روز (بدون کسر از اعتبار)", num(L.search) + " web searches/day (no wallet cost)"),
        t(num(L.pmsg) + " پیام پریمیوم در روز (جزو همین پیام‌های روزانه) " + (F.premiumText ? "" : soon), num(L.pmsg) + " premium text msgs/day (part of your daily messages) " + (F.premiumText ? "" : soon)),
        t(num(L.premiumImage) + " تصویر پریمیوم در کل دوره، نه روزانه (ساخت کیفیت بالا + ویرایش؛ از سهمیه‌ی روزانه‌ی تصویر هم حساب می‌شه) " + ((F.premiumImage || F.premiumEdit) ? "" : soon), num(L.premiumImage) + " premium images per whole period, not daily (high-quality create + edit; also counts toward the daily image limit) " + ((F.premiumImage || F.premiumEdit) ? "" : soon)),
        t("اعتبار کیف پول: " + num(P.walletToman) + " تومان (فقط برای متن/تصویر پریمیوم و ساخت/ویرایش تصویر)", "Wallet credit: " + num(P.walletToman) + " Toman (only for premium text/images and image create/edit)"),
        t("حافظه‌ی گفتگو: " + num(L.history) + " پیام", "Chat context: " + num(L.history) + " messages"),
        t("حافظه‌ی بلندمدت: " + num(Math.round((L.note || 0) / 1000)) + " هزار کاراکتر", "Long-term memory: " + Math.round((L.note || 0) / 1000) + "K chars"),
      ];
      const C = state.costs || {}, cap = (v) => v == null ? "" : t("≈ " + num(v) + " اعتبار", "≈ " + num(v) + " credits");
      const featsC = !F.creditMode ? null : [
        t("مدت: " + num(P.days) + " روز", "Duration: " + P.days + " days"),
        t("اعتبار: " + num(P.walletToman) + " (هزینه‌ی هر کار از اون کم می‌شه)", "Credit: " + num(P.walletToman) + " (every action spends it)"),
        t("هر پیام چت " + cap(C.chat) + " (بسته به طول و سختی)", "Each chat message " + cap(C.chat) + " (by length & difficulty)"),
        t("ساخت تصویر " + cap(C.gen) + "؛ کیفیت بالا " + cap(C.genQ), "Image creation " + cap(C.gen) + "; high quality " + cap(C.genQ)),
        t("ویرایش تصویر " + cap((F.premiumImage || F.premiumEdit) ? C.premiumImg : C.edit), "Image edit " + cap((F.premiumImage || F.premiumEdit) ? C.premiumImg : C.edit)),
        t("جست‌وجوی وب " + cap(C.search) + " برای هر بار", "Web search " + cap(C.search) + " each"),
        t("اعتبار مصرف‌نشده با تمدید منتقل می‌شه", "Unused credit carries over when you renew"),
        t("حافظه‌ی گفتگو: " + num(L.history) + " پیام", "Chat context: " + num(L.history) + " messages"),
        t("حافظه‌ی بلندمدت: " + num(Math.round((L.note || 0) / 1000)) + " هزار کاراکتر", "Long-term memory: " + Math.round((L.note || 0) / 1000) + "K chars"),
      ];
      const tag = key === "p7"
        ? t("مناسب کسانی که می‌خوان امکانات پیشرفته‌ی Suvreno رو با هزینه‌ی کمتر تجربه کنن.", "For people who want to try Suvreno's advanced features at a lower cost.")
        : t("سقف‌های بالاتر، حافظه‌ی بیشتر و تصویرهای پریمیوم بیشتر برای استفاده‌ی جدی‌تر.", "Higher limits, more memory and more premium images for heavier use.");
      const cheaper = best && perDay(plansOf().p14) < perDay(plansOf().p7);
      return `<div class="pp-plan${best ? " best" : ""}">${cheaper ? `<span class="pp-badge">${t("ارزان‌تر در هر روز", "Cheaper per day")}</span>` : ""}
        <div class="pp-pn">${esc(P.name)}</div>
        ${(() => { const pm = promoFor(key); return pm ? `<div class="pp-pp"><span class="pp-old">${num(pm.base)}</span><b>${num(pm.price)}</b> <span>${t("تومان", "Toman")}</span></div><div class="pp-off">${esc(pm.label)} · ${t(num(pm.percent) + "٪ تخفیف", pm.percent + "% off")}</div>` : `<div class="pp-pp"><b>${num(P.price)}</b> <span>${t("تومان", "Toman")}</span></div>`; })()}
        <div class="pp-pd">${t(num(P.days) + " روزه · حدود " + num(perDay(P)) + " تومان در روز", P.days + " days · ≈ " + num(perDay(P)) + " Toman/day")}</div>
        <div class="pp-pt">${tag}</div>
        <ul class="pp-fe">${(featsC || feats).map((f) => `<li>✓ ${f}</li>`).join("")}</ul>
        <button class="pp-pay${best ? "" : " alt"}" type="button" data-plan="${key}" id="${key === "p7" ? "ppPay7" : "ppPay"}">${btnLabel(key)}</button></div>`;
    }
function packCard(K) {
      const C = state.costs || {}, PP = state.packPlan || {}, L = PP.limits || {}, chat = Math.max(1, Number(C.chat) || 120);
      const msgsApprox = Math.floor(Number(K.credits) / chat), perK = Math.round(Number(K.price) / Number(K.credits) * 1000);
      const feats = [
        t(num(K.credits) + " اعتبار؛ هزینه‌ی هر کار از اون کم می‌شه", num(K.credits) + " credits; every action spends it"),
        t("بدون نیاز به اشتراک؛ " + num(K.days) + " روز بعد از تأیید پرداخت قابل استفاده‌ست", "No plan needed; usable for " + K.days + " days after your payment is confirmed"),
        t("هر پیام حدود " + num(chat) + " اعتبار (≈ " + num(msgsApprox) + " پیام)؛ تخمینی و بسته به طول و سختی پیام", "A message costs ≈ " + num(chat) + " credits (≈ " + num(msgsApprox) + " messages); estimate, depends on length & difficulty"),
        L.msg != null ? t("سقف‌های سبک‌تر از پلن‌ها: روزی " + num(L.msg) + " پیام، " + num(L.gen) + " ساخت و " + num(L.edit) + " ویرایش تصویر", "Lighter limits than plans: " + num(L.msg) + " messages, " + num(L.gen) + " image creations and " + num(L.edit) + " edits per day") : "",
        t("اگه مهلت تموم بشه، اعتبارِ مانده نمی‌سوزه؛ با خرید پلن یا بسته‌ی بعدی دوباره فعال می‌شه", "If the time runs out your leftover credit isn't lost; it comes back when you buy your next plan or pack"),
        t("بازگشت وجه ندارد", "Non-refundable"),
      ].filter(Boolean);
      return `<div class="pp-plan pp-pack">
        <div class="pp-pn">${esc(K.name)}</div>
        <div class="pp-pp"><b>${num(K.price)}</b> <span>${t("تومان", "Toman")}</span></div>
        <div class="pp-pd">${t(num(K.credits) + " اعتبار · " + num(K.days) + " روز مهلت · هر ۱٬۰۰۰ اعتبار " + num(perK) + " تومان", num(K.credits) + " credits · " + K.days + " days · " + num(perK) + " Toman per 1,000 credits")}</div>
        <ul class="pp-fe">${feats.map((f) => `<li>✓ ${f}</li>`).join("")}</ul>
        <button class="pp-pay alt" type="button" data-plan="${esc(K.key)}">${t("خرید اعتبار", "Buy credit")}</button></div>`;
    }
    function fillPacks() {
      const sec = page.querySelector("#ppPackSec"); if (!sec) return;
      const ks = packList();
      if (!ks.length) { sec.innerHTML = ""; return; }
      sec.innerHTML = `<div class="pp-sech">${t("اعتبار جداگانه (بدون اشتراک)", "Separate credit (no plan needed)")}</div>
        <div class="pp-sechs">${t("اگه اشتراک نمی‌خوای، فقط اعتبار بخر و هر وقت خواستی مصرف کن. هر بسته مهلت مخصوص خودش رو داره و محدودیت‌هاش از پلن‌ها سبک‌تره.", "Don't want a plan? Just buy credit and spend it whenever you like. Each pack has its own validity and lighter limits than the plans.")}</div>
        <div class="pp-packs">${ks.map(packCard).join("")}</div>`;
    }
    function fillPage() {
      page.dir = isEn() ? "ltr" : "rtl";
      page.querySelector("#ppPlans").innerHTML = planCard("p7", false) + planCard("p14", true);
      fillPacks();
      page.querySelector("#ppPayNote").innerHTML = payNote();
      renderOrderBanner();
      page.querySelector("#ppRows").innerHTML = rows().map((r) => `<tr><td>${r[0]}</td><td class="fr">${r[1]}</td><td class="st">${r[2]}</td><td class="pl">${r[3]}</td></tr>`).join("");
      const s = page.querySelector("#ppStatus");
      if (isPlus()) {
        const d = Math.max(1, Math.ceil((state.expiresAt - Date.now()) / 864e5));
        const up = state.planKey === "p7" ? t(" اگه Plus بخری، بعد از تأیید پرداخت سقف‌های Plus اعمال می‌شه و روزها به انتهای اشتراک فعلی اضافه می‌شه.", " If you buy Plus, once your payment is confirmed the Plus limits apply and the days are added to the end of your current plan.") : "";
        if (state.planKey === "pk") s.innerHTML = `<div class="pp-status">✅ ${esc(t("اعتبار جداگانه‌ات فعاله؛ " + num(state.creditToman || 0) + " اعتبار و " + num(d) + " روز مانده. می‌تونی اعتبار بیشتری بخری یا پلن بگیری؛ اعتبار مانده‌ات می‌مونه.", "Your separate credit is active — " + num(state.creditToman || 0) + " credits and " + d + " days left. You can add more credit or buy a plan; your leftover credit stays."))}</div>`;
        else s.innerHTML = `<div class="pp-status">✅ ${esc(t(planLabel() + " فعاله؛ " + num(d) + " روز باقی مونده. تمدید، روزها رو به انتهای اشتراک فعلی اضافه می‌کنه.", planLabel() + " is active — " + d + " days left. Renewing adds days to the end of your current plan."))}${up}</div>`;
      } else s.innerHTML = "";
      fillExtra();
      renderSales();
    }
    function fillExtra() {
      const x = page.querySelector("#ppExtra"); if (!x) return;
      const L = state.limits || {}, u = state.used || {}, F = state.features || {};
      let h = "";
      if (isPlus()) {
        if (state.planKey === "pk" && state.creditState === "low") h += `<div class="pp-sec warn">${t("اعتبارت داره تموم می‌شه؛ برای ادامه یک بسته‌ی اعتباری یا پلن بخر.", "Your credit is running low; buy another credit pack or a plan to keep going.")}</div>`;
        if (F.creditMode && state.creditState === "empty") h += `<div class="pp-sec warn">${t("اعتبارت تموم شده؛ برای ادامه اشتراکت رو تمدید کن. اعتبار مصرف‌نشده با تمدید منتقل می‌شه.", "Your credit is used up; renew your plan to continue. Unused credit carries over on renewal.")}</div>`;
        else if (F.creditMode && state.creditState === "low") h += `<div class="pp-sec warn">${t("اعتبارت داره تموم می‌شه؛ پیام‌های بلند، تصویر و جست‌وجو اعتبار بیشتری می‌گیرن.", "Your credit is running low; long messages, images and searches cost more.")}</div>`;
        else if (state.creditState === "empty") h += `<div class="pp-sec warn">${t("اعتبار کیف پولت برای متن پریمیوم و ساخت/ویرایش تصویر کافی نیست؛ تا شارژ مجدد (تمدید)، تصویرها با سرویس رایگان (و سقف‌های رایگان) ساخته می‌شن و پیام‌ها با مدل استاندارد جواب داده می‌شن. جست‌وجوی وب به اعتبار ربطی نداره و با سهمیه‌ی روزانه‌ی پلنت کار می‌کنه.", "Your wallet credit is too low for premium text and image create/edit; until you renew, images come from the free service (with free limits) and replies use the standard model. Web search doesn't depend on credit and keeps working within your daily quota.")}</div>`;
        else if (state.creditState === "low") h += `<div class="pp-sec warn">${t("اعتبار کیف پولت کم شده؛ متن پریمیوم و تصویر پریمیوم ممکنه اجرا نشن و پاسخ با مدل استاندارد/FLUX داده بشه. جست‌وجوی وب به اعتبار ربطی نداره.", "Your wallet credit is running low; premium text and premium images may not run and the standard model/FLUX will be used. Web search doesn't depend on credit.")}</div>`;
        const pl = state.premiumImageLeft != null ? state.premiumImageLeft : state.premiumEditLeft;
        // اگه سرور نتونست مصرف رو بخونه، عدد «۰» نشون داده نمی‌شه (فقط نمایش؛ سقف واقعی همیشه در Worker اعمال می‌شه)
        const q = (v, mx) => (state.usageUnavailable ? "—" : num(v || 0)) + "/" + (mx != null ? num(mx) : "?");
        const lines = [
          t("پیام", "Messages") + ": " + q(u.msg, L.msg),
          t("تصویر", "Images") + ": " + q(u.gen, L.gen),
          t("ویرایش", "Edits") + ": " + q(u.edit, L.edit),
          t("جست‌وجوی وب", "Web search") + ": " + q(u.search, L.search),
        ];
        if (F.premiumText && L.pmsg != null) lines.push(t("پیام پریمیوم", "Premium msgs") + ": " + q(u.pmsg, L.pmsg));
        if (!F.creditMode) h += `<div class="pp-sec"><h3>${t("مصرف امروز (صفر شدن: ۰۰:۰۰ UTC)", "Today's usage (resets 00:00 UTC)")}</h3>${state.usageUnavailable ? t("⚠️ الان امکان خواندن مصرف نیست؛ بعداً دوباره نگاه کن.", "⚠️ Usage can't be read right now; check again later.") + "<br>" : ""}${lines.join(" · ")}`;
        if (!F.creditMode && F.premiumImage && pl != null) h += `<br>${t("تصویر پریمیومِ باقی‌مانده در این دوره (روزانه نیست)", "Premium images left this period (not daily)")}: ${num(pl)}${L.premiumImage != null ? "/" + num(L.premiumImage) : ""}`;
        h += (F.creditMode ? `<div class="pp-sec"><h3>${t("اعتبار باقی‌مانده", "Remaining credit")}</h3>${t("هر پیام و هر کار از این اعتبار کم می‌شه؛ با تمدید یا خرید بسته‌ی جدید، اعتبار مصرف‌نشده منتقل می‌شه.", "Every message and action spends this credit; unused credit carries over when you renew or buy a new pack.")}${state.planKey !== "pk" && Number(state.packUntil) > Date.now() ? "<br>" + t("اعتبار جداگانه‌ی خریداری‌شده‌ات تا " + num(Math.max(1, Math.ceil((Number(state.packUntil) - Date.now()) / 864e5))) + " روز دیگه هم بعد از پایان پلن قابل مصرفه.", "Your separate credit stays usable for " + Math.max(1, Math.ceil((Number(state.packUntil) - Date.now()) / 864e5)) + " more days even after your plan ends.") : ""}` : "") + `<br>${t("اعتبار کیف پول", "Wallet credit")}: ${num(state.creditToman || 0)} ${F.creditMode ? t("اعتبار", "credits") : t("تومان", "Toman")}</div>`;
        h += `<div class="pp-sec"><h3>${t("دستور دائمی", "Standing instruction")}</h3><textarea id="ppInstr" maxlength="600" placeholder="${t("مثلاً: همیشه کوتاه و بدون مقدمه جواب بده", "e.g. Always answer briefly, no preamble")}"></textarea><button id="ppInstrSave" type="button">${t("ذخیره", "Save")}</button></div>`;
        h += `<div class="pp-sec"><h3>${t("خروجی از گفتگوی فعلی", "Export current chat")}</h3><button id="ppExPdf" type="button">PDF</button><button id="ppExDoc" type="button">Word</button></div>`;
        if (state.refundable && !isMyket()) h += `<div class="pp-sec"><h3>${t("تضمین بازگشت وجه", "Money-back guarantee")}</h3>${t("تا ۲۴ ساعت بعد از خرید و قبل از هر استفاده می‌تونی درخواست بازگشت وجه بدی؛ بعد از ثبت، مبلغ بعد از بررسی به کارتت برمی‌گرده.", "Within 24h of purchase and before any use you can request a refund; once submitted, the amount is returned to your card after review.")}<br><button class="gh" id="ppRefund" type="button">${t("درخواست بازگشت وجه", "Request refund")}</button></div>`;
      }
      x.innerHTML = h;
      const on = (id, fn) => { const e = x.querySelector(id); if (e) e.addEventListener("click", fn); };
      on("#ppExPdf", () => exportChat("pdf")); on("#ppExDoc", () => exportChat("doc"));
      on("#ppRefund", async (ev) => {
        const btn = ev.currentTarget;
        if (btn.disabled || !confirm(t("مطمئنی؟ اشتراکِ همین خرید بلافاصله لغو می‌شه.", "Are you sure? The plan from this purchase will be cancelled right away."))) return;
        btn.disabled = true; // جلوی دوبار کلیک؛ Worker هم درخواست تکراری رو اتمیک رد می‌کنه. هیچ پارامتری (شناسه/مبلغ) از این‌جا فرستاده نمی‌شه
        try { const r = await plusCall({ mode: "plus-refund" }); toast((r && r.message) || t("انجام نشد", "Failed"), 7000); await refreshStatus(); fillPage(); } catch { toast(t("انجام نشد؛ دوباره امتحان کن.", "Failed; try again.")); btn.disabled = false; }
      });
      const ta = x.querySelector("#ppInstr");
      if (ta) {
        plusCall({ mode: "plus-instr-get" }).then((r) => { if (r && r.ok) ta.value = r.text || ""; }).catch(() => {});
        on("#ppInstrSave", async () => { try { const r = await plusCall({ mode: "plus-instr-set", text: ta.value }); toast(r && r.ok ? t("ذخیره شد ✅", "Saved ✅") : (r.message || "Error")); } catch { toast(t("ذخیره نشد", "Not saved")); } });
      }
    }
    function chatHtml() {
      const out = [];
      document.querySelectorAll("#messages .message").forEach((m) => {
        if (m.classList.contains("am-thinking-row")) return;
        const b = m.querySelector(".bubble"); if (!b || !b.innerText.trim()) return;
        const who = m.classList.contains("user") ? t("من", "Me") : "Suvreno";
        const esc = b.innerText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        out.push(`<p><b>${who}:</b><br>${esc}</p>`);
      });
      return out.join("");
    }
    function exportChat(kind) {
      const body = chatHtml();
      if (!body) { toast(t("گفتگویی برای خروجی گرفتن نیست.", "No chat to export.")); return; }
      const doc = `<html dir="${isEn() ? "ltr" : "rtl"}"><head><meta charset="utf-8"><title>Suvreno</title><style>body{font-family:Tahoma,Arial;line-height:1.9;padding:24px}p{margin:0 0 14px}</style></head><body><h2>Suvreno</h2>${body}</body></html>`;
      if (kind === "doc") {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["\ufeff", doc], { type: "application/msword" }));
        a.download = "suvreno-chat.doc"; document.body.appendChild(a); a.click(); a.remove();
      } else {
        const w = window.open("", "_blank");
        if (!w) { toast(t("پنجره‌ی چاپ مسدود شد؛ اجازه بده و دوباره امتحان کن.", "Popup blocked; allow it and retry.")); return; }
        w.document.write(doc); w.document.close(); setTimeout(() => w.print(), 400);
      }
    }
    function openPage() {
      if (!page) buildPage();
      acctData = null; fillPage(); page.classList.add("open"); document.body.style.overflow = "hidden";
      refreshStatus().then(() => page && fillPage());
    }
    function closePage() { if (page) page.classList.remove("open"); document.body.style.overflow = ""; }
    /* ---------- پرداخت کارت‌به‌کارت (تأیید دستی) ----------
       فرانت فقط «درخواست» می‌فرسته؛ مبلغ، شماره کارت، کد سفارش و وضعیت همه از Worker میاد (state.card / state.cardOrder از /plus-status). */
    let cardEl = null, cardPoll = 0, cardEditing = false;
    const cardMode = () => (state.payMode || "card") !== "zarinpal";
    /* نسخه‌ی اپ مایکت: فقط وقتی SuvrenoNative.isMyket() درست باشه، پرداخت درون‌برنامه‌ای مایکت استفاده می‌شه */
    const isMyket = () => { try { const n = window.SuvrenoNative; return !!(n && typeof n.isMyket === "function" && n.isMyket() === true && typeof n.myketPurchase === "function"); } catch { return false; } };
    const MYKET_SKU = { p7: "suvreno_start", p14: "suvreno_plus" };
    const MYKET_PACK_SKU = { c5: "suvreno_credit_c5", c10: "suvreno_credit_c10", c20: "suvreno_credit_c20" }; // باید با شناسه‌ی محصولات پنل مایکت و Secretهای MYKET_SKU_C5/C10/C20 یکی باشه
    const faToEn = (s) => String(s || "").replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
    const fmtCard = (n) => String(n || "").replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    const dismissedOrder = () => { try { return localStorage.getItem("SUV_ORDER_DISMISS") || ""; } catch { return ""; } };
    const dismissOrder = (id) => { try { localStorage.setItem("SUV_ORDER_DISMISS", id); } catch {} };
    const payNote = () => isMyket()
      ? t("پرداخت از طریق درگاه پرداخت درون‌برنامه‌ای مایکت انجام می‌شه. بعد از انتخاب پلن، پنجره‌ی پرداخت مایکت باز می‌شه و بعد از پرداختِ موفق و تأییدش، پلنت خودکار فعال می‌شه. اگه پرداخت کامل نشه یا لغو بشه، پلن فعال نمی‌شه و حسابت مثل قبل می‌مونه.",
          "Payment is made through Myket's in-app payment. After choosing a plan, the Myket payment window opens, and once the payment succeeds and is confirmed your plan activates automatically. If the payment isn't completed or is cancelled, no plan is activated and your account stays as it was.")
      : cardMode()
      ? t("پرداخت به‌صورت کارت‌به‌کارت انجام می‌شه: بعد از انتخاب پلن یا بسته‌ی اعتباری، مبلغ، شماره کارت و کد پیگیری سفارش رو می‌بینی. بعد از واریز و زدنِ «پرداخت کردم»، واریزت خودکار بررسی می‌شه و اگه تأیید بشه پلنت همون لحظه فعال می‌شه؛ در غیر این صورت بررسی دستی انجام می‌شه و پلنت در عرض چند ساعت فعال می‌شه. مبلغ رو دقیقاً همونی که نشون داده می‌شه بزن. فقط ۴ رقم آخر کارتت یا شماره پیگیری بانکی لازمه؛ هیچ‌وقت رمز یا CVV2 نمی‌خوایم. اگه پرداخت تأیید نشه، حسابت رایگان می‌مونه.",
          "Payment is by card-to-card transfer: after choosing a plan you'll see the amount, the card number and your order's tracking code. After you transfer and tap “I paid”, the deposit is checked automatically and your plan activates right away if it is confirmed; otherwise it is reviewed manually and activated within a few hours. Send exactly the amount shown. We only need the last 4 digits of your card or the bank tracking number — never your PIN or CVV2. If the payment can't be confirmed, your account stays on the free plan.")
      : t("پرداخت روی صفحه‌ی امن درگاه زرین‌پال انجام می‌شه و Suvreno به شماره کارتت دسترسی نداره. پلن فقط بعد از تأیید واقعی پرداخت فعال می‌شه؛ اگه پرداخت کامل نشه، حسابت رایگان می‌مونه.",
          "Payment happens on the ZarinPal gateway's secure page; Suvreno never sees your card. Your plan activates only after payment is truly confirmed; otherwise your account stays on the free plan.");
    async function copyText(v, msg) {
      try { await navigator.clipboard.writeText(String(v)); toast(msg || t("کپی شد ✅", "Copied ✅")); } catch { toast(String(v), 9000); }
    }
    /* ۱۰ دقیقه‌ی اول هر ۵ ثانیه (تأیید خودکار با پیامک بانک)، بعد از اون هر ۳۰ ثانیه */
    const autoChecking = (o) => Date.now() - (Number(o && o.submittedAt) || 0) < 600000;
    function startCardPoll() { stopCardPoll(); let n = 0; cardPoll = 1; const tick = () => { cardPoll = setTimeout(async () => { if (!document.hidden && !cardEditing) await refreshStatus(); n++; if (cardPoll) tick(); }, n < 120 ? 5000 : 30000); }; tick(); }
    function stopCardPoll() { if (cardPoll) { clearTimeout(cardPoll); clearInterval(cardPoll); cardPoll = 0; } }
    function closeCardSheet() { stopCardPoll(); cardEditing = false; if (cardEl) { cardEl.remove(); cardEl = null; } }
    function payForm(o, withCancel) {
      return `<div class="pc-step"><h4>${t("۲) بعد از واریز، اینجا اعلام کن", "2) After transferring, tell us here")}</h4>
        <div class="pc-lbl">${t("۴ رقم آخر کارتی که ازش واریز کردی", "Last 4 digits of the card you paid from")}</div>
        <input id="pcCard4" class="pc-in" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="1234" value="${esc(o.payerCard4 || "")}">
        <div class="pc-lbl">${t("یا شماره پیگیری بانکی (اگه ۴ رقم رو نوشتی لازم نیست)", "Or the bank tracking number (not needed if you entered the 4 digits)")}</div>
        <input id="pcRef" class="pc-in" inputmode="text" maxlength="32" autocomplete="off" placeholder="" value="${esc(o.bankRef || "")}">
        <button class="pc-go" type="button" data-a="submit">${t("پرداخت کردم", "I paid")}</button>
        ${withCancel ? `<button class="pc-go pc-gh" type="button" data-a="cancel">${t("لغو سفارش", "Cancel order")}</button>` : `<button class="pc-go pc-gh" type="button" data-a="stopedit">${t("برگشت", "Back")}</button>`}
      </div>`;
    }
    function renderCardSheet() {
      if (!cardEl) return;
      const o = state.cardOrder;
      if (!o || (o.status === "rejected" && dismissedOrder() === o.id)) { closeCardSheet(); return; }
      const card = state.card || {};
      const cp = (label, val, copyVal, extra) => `<div class="pc-row"><div><div class="pc-lbl">${label}</div><div class="pc-val">${val}</div>${extra || ""}</div><button class="pc-cp" type="button" data-a="copy" data-v="${esc(copyVal)}">${t("کپی", "Copy")}</button></div>`;
      let body = "";
      if (o.status === "awaiting" || (o.status === "submitted" && cardEditing)) {
        body = `<div class="pc-step"><h4>${t("۱) مبلغ رو کارت‌به‌کارت کن", "1) Transfer the amount card-to-card")}</h4>
          ${cp(t("مبلغ", "Amount"), num(o.amount) + " " + t("تومان", "Toman"), String(o.amount), `<div class="pc-lbl">${t("معادل " + num(o.amount * 10) + " ریال (اگه بانکت ریالی می‌خواد)", "= " + num(o.amount * 10) + " Rial (if your bank asks in Rial)")}</div><div class="pc-lbl" style="margin-top:4px">${t("⚠️ دقیقاً همین مبلغ رو بزن (رقم‌های آخرش برای تشخیص خودکار پرداخت توئه) و فقط کارت‌به‌کارت.", "⚠️ Send exactly this amount (its last digits identify your payment) and use card-to-card only.")}</div>`)}
          ${cp(t("شماره کارت مقصد", "Destination card"), esc(fmtCard(card.number)), String(card.number || ""), card.holder ? `<div class="pc-lbl">${t("به نام ", "Holder: ")}${esc(card.holder)}</div>` : "")}
          ${cp(t("کد پیگیری سفارش", "Order tracking code"), esc(o.code), o.code, `<div class="pc-lbl">${t("مخصوص همین سفارشه. اگه بانکت بخش «توضیحات/شرح» داره، کد رو اونجا بنویس.", "Specific to this order. If your bank has a description field, write it there.")}</div>`)}
        </div>` + payForm(o, o.status === "awaiting");
      } else if (o.status === "submitted") {
        body = `<div class="pc-step okc"><h4>${autoChecking(o) ? t("🔎 در حال بررسی پرداخت…", "🔎 Checking your payment…") : t("⏳ پرداختت ثبت شد و در صف بررسیه", "⏳ Payment submitted and in the review queue")}</h4>
          ${autoChecking(o) ? t("واریز با مبلغ دقیق " + num(o.amount) + " تومان داره بررسی می‌شه. اگه تأیید بشه، " + (isPackOrder(o) ? "اعتبارت" : "پلنت") + " همین‌جا و همون لحظه فعال می‌شه؛ این صفحه رو نبند.", "Looking for your exact deposit of " + num(o.amount) + " Toman. If it is confirmed, your " + (isPackOrder(o) ? "credit" : "plan") + " activates right here, right away; keep this page open.") : t("هنوز واریزی با مبلغ دقیق " + num(o.amount) + " تومان تأیید نشد. اگه با پایا/ساتنا یا از بانک دیگه‌ای فرستادی ممکنه دیر برسه، یا شاید مبلغ دقیق نبوده. سفارشت توی صف بررسی دستیه و " + (isPackOrder(o) ? "اعتبارت" : "پلنت") + " بعد از تأیید در عرض چند ساعت فعال می‌شه (اگه واریز پیدا نشه، دلیلش همین‌جا نوشته می‌شه). لازم نیست این صفحه باز بمونه.", "Your exact deposit of " + num(o.amount) + " Toman hasn't been confirmed yet. It may be late if sent via Paya/Satna or the amount may not have been exact. Your order is in the manual review queue and your " + (isPackOrder(o) ? "credit" : "plan") + " activates within a few hours after confirmation (if no deposit is found, the reason will be shown here). You don't need to keep this page open.")}
          <div class="pc-lbl" style="margin-top:8px">${t("کد سفارش", "Order code")}: <b dir="ltr">${esc(o.code)}</b>${o.payerCard4 ? " · " + t("۴ رقم آخر کارت", "Card last 4") + ": <b dir=\"ltr\">" + esc(o.payerCard4) + "</b>" : ""}${o.bankRef ? " · " + t("پیگیری بانکی", "Bank ref") + ": <b dir=\"ltr\">" + esc(o.bankRef) + "</b>" : ""}</div>
        </div>
        <button class="pc-go" type="button" data-a="refresh">${t("بروزرسانی وضعیت", "Refresh status")}</button>
        <button class="pc-go pc-gh" type="button" data-a="edit">${t("اصلاح اطلاعات واردشده", "Edit submitted info")}</button>`;
      } else if (o.status === "rejected") {
        body = `<div class="pc-step warn"><h4>${t("❌ پرداخت تأیید نشد", "❌ Payment not confirmed")}</h4>
          ${o.decisionNote ? esc(o.decisionNote) + "<br>" : ""}${t("اگه واقعاً واریز کردی، یک سفارش جدید بساز و شماره پیگیری بانکی رو هم وارد کن؛ یا به suvreno.ir@gmail.com پیام بده.", "If you did transfer the money, create a new order and enter the bank tracking number too; or email suvreno.ir@gmail.com.")}</div>
        <button class="pc-go" type="button" data-a="dismiss">${t("فهمیدم", "Got it")}</button>`;
      }
      cardEl.querySelector(".pc-box").innerHTML = `<button class="pc-x" type="button" data-a="close" aria-label="close">×</button>
        <div class="pc-h">${t("پرداخت کارت‌به‌کارت", "Card-to-card payment")}</div>
        <div class="pc-sub">${esc(o.planName || "")} · ${num(o.amount)} ${t("تومان", "Toman")}</div>${body}
        <div class="pc-note">${isPackOrder(o) ? t("اعتبارت بعد از بررسی و تأیید پرداخت اضافه می‌شه (معمولاً در عرض چند ساعت). ما هیچ‌وقت رمز یا CVV2 کارتت رو نمی‌خوایم.", "Your credit is added after the payment is reviewed and confirmed (usually within a few hours). We never ask for your PIN or CVV2.") : t("پلن بعد از بررسی و تأیید پرداخت فعال می‌شه (معمولاً در عرض چند ساعت). ما هیچ‌وقت رمز یا CVV2 کارتت رو نمی‌خوایم.", "Your plan is activated after the payment is reviewed and confirmed (usually within a few hours). We never ask for your PIN or CVV2.")}</div>`;
    }
    function openCardSheet() {
      if (!state.cardOrder || isMyket()) return;
      if (!cardEl || !cardEl.isConnected) {
        cardEl = document.createElement("div"); cardEl.className = "pc-ov"; cardEl.dir = isEn() ? "ltr" : "rtl";
        cardEl.innerHTML = '<div class="pc-box"></div>';
        document.body.appendChild(cardEl);
        cardEl.addEventListener("click", async (ev) => {
          if (ev.target === cardEl) { closeCardSheet(); return; }
          const b = ev.target && ev.target.closest ? ev.target.closest("[data-a]") : null;
          if (!b || b.disabled) return;
          const a = b.getAttribute("data-a"), o = state.cardOrder;
          if (a === "close") closeCardSheet();
          else if (a === "copy") copyText(b.getAttribute("data-v"));
          else if (a === "refresh") { b.disabled = true; await refreshStatus(); if (b.isConnected) b.disabled = false; }
          else if (a === "edit") { cardEditing = true; renderCardSheet(); }
          else if (a === "stopedit") { cardEditing = false; renderCardSheet(); }
          else if (a === "dismiss" && o) { dismissOrder(o.id); closeCardSheet(); renderOrderBanner(); renderBox(); }
          else if (a === "cancel" && o) {
            if (!confirm(t("سفارش لغو بشه؟ اگه هنوز واریز نکردی مشکلی نیست.", "Cancel this order? Fine if you haven't paid yet."))) return;
            b.disabled = true;
            try { const r = await plusCall({ mode: "plus-card-cancel", orderId: o.id }); if (!(r && r.ok)) toast((r && r.message) || t("انجام نشد", "Failed")); } catch { toast(t("انجام نشد؛ دوباره امتحان کن.", "Failed; try again.")); }
            await refreshStatus(); if (state.cardOrder && state.cardOrder.id === o.id) { state.cardOrder = null; } closeCardSheet(); renderOrderBanner(); renderBox();
          }
          else if (a === "submit" && o) {
            const c4 = faToEn((cardEl.querySelector("#pcCard4") || {}).value).replace(/\D/g, "");
            const ref = faToEn((cardEl.querySelector("#pcRef") || {}).value).replace(/\s/g, "");
            if (!c4 && !ref) { toast(t("۴ رقم آخر کارت یا شماره پیگیری بانکی رو وارد کن.", "Enter the last 4 card digits or the bank tracking number.")); return; }
            if (c4 && c4.length !== 4) { toast(t("۴ رقم آخر کارت باید دقیقاً ۴ رقم باشه.", "The card digits must be exactly 4.")); return; }
            b.disabled = true; const old = b.textContent; b.textContent = t("در حال ثبت...", "Submitting...");
            try {
              const r = await plusCall({ mode: "plus-card-submit", orderId: o.id, payerCard4: c4, bankRef: ref }, 20000);
              if (r && r.ok && r.approved) { cardEditing = false; await refreshStatus(); closeCardSheet(); renderOrderBanner(); renderBox(); return; }
              if (r && r.ok && r.order) {
                state.cardOrder = r.order; cardEditing = false;
                try { localStorage.setItem("SUV_PLUS_STATE", JSON.stringify(state)); } catch {}
                toast(t("پرداختت ثبت شد ✅ در حال بررسی خودکار…", "Payment submitted ✅ Checking it automatically…"), 6000);
                renderCardSheet(); renderOrderBanner(); renderBox(); startCardPoll();
                return;
              }
              toast((r && r.message) || t("ثبت نشد؛ دوباره امتحان کن.", "Couldn't submit; try again."), 6000);
            } catch { toast(t("ثبت نشد؛ اتصال رو چک کن و دوباره امتحان کن.", "Couldn't submit; check your connection and retry."), 6000); }
            if (b.isConnected) { b.disabled = false; b.textContent = old; }
          }
        });
      }
      renderCardSheet();
      if (cardEl && state.cardOrder && state.cardOrder.status === "submitted") startCardPoll();
    }
    async function payCard(plan, b) {
      paying = true; b.disabled = true; b.textContent = t("در حال ساخت سفارش...", "Creating your order...");
      try {
        const r = await plusCall({ mode: "plus-card-create", plan, code: (!isPackOrder({ plan }) && discPrev[plan]) ? discCode : "" }, 20000);
        if (r && r.order) {
          state.cardOrder = r.order; if (r.card) state.card = r.card; cardEditing = false;
          try { localStorage.setItem("SUV_PLUS_STATE", JSON.stringify(state)); } catch {}
          renderBox(); renderOrderBanner(); openCardSheet();
          if (r.ok === false && r.message) toast(r.message, 6000);
        } else toast((r && r.message) || t("ساخت سفارش انجام نشد؛ دوباره امتحان کن.", "Couldn't create the order; try again."), 5000);
      } catch { toast(t("ساخت سفارش انجام نشد؛ دوباره امتحان کن.", "Couldn't create the order; try again.")); }
      paying = false;
      fillPage();
    }
    function renderOrderBanner() {
      const el = page && page.querySelector("#ppOrder"); if (!el) return;
      if (isMyket()) { el.innerHTML = ""; return; }
      const o = state.cardOrder;
      if (!o || (o.status === "rejected" && dismissedOrder() === o.id)) { el.innerHTML = ""; return; }
      const nm = esc(o.planName || "");
      if (o.status === "awaiting") el.innerHTML = `<div class="pp-sec warn">${t("یه سفارش پرداخت باز داری: " + nm + " · " + num(o.amount) + " تومان. اگه واریز کردی، «ادامه پرداخت» رو بزن و اعلام کن.", "You have an open payment order: " + nm + " · " + num(o.amount) + " Toman. If you've transferred, tap “Continue” and submit it.")}<br><button type="button" data-oa="open">${t("ادامه پرداخت", "Continue payment")}</button></div>`;
      else if (o.status === "submitted") el.innerHTML = `<div class="pp-sec okc">${t("⏳ پرداخت " + nm + " در حال بررسیه؛ اگه واریز تأیید بشه همون لحظه فعال می‌شه، وگرنه تا چند ساعت.", "⏳ Your " + nm + " payment is being checked; it activates right away once the deposit is confirmed, otherwise within a few hours.")}<br><button type="button" data-oa="open">${t("مشاهده وضعیت", "View status")}</button></div>`;
      else if (o.status === "rejected") el.innerHTML = `<div class="pp-sec warn">${t("❌ پرداخت تأیید نشد.", "❌ Payment wasn't confirmed.")} ${esc(o.decisionNote || "")}<br><button type="button" data-oa="open">${t("جزئیات", "Details")}</button><button type="button" class="gh" data-oa="dismiss">${t("فهمیدم", "Got it")}</button></div>`;
      else el.innerHTML = "";
    }
    let paying = false;
    async function pay(planArg) {
      const isPk = packList().some((k) => k.key === planArg);
      const plan = isPk ? String(planArg) : planArg === "p7" ? "p7" : "p14"; // فقط کلید پلن/بسته فرستاده می‌شه؛ قیمت و مدت همیشه در Worker تعیین می‌شن
      const b = page.querySelector('button[data-plan="' + plan + '"]');
      if (paying || !b) return;
      if (!findToken()) {
        toast(t("برای خرید اول وارد حساب Suvreno شو 🔒", "Please sign in to Suvreno first 🔒"));
        setTimeout(() => { location.href = "login.html"; }, 1200);
        return;
      }
      if (isMyket()) return isPk ? payMyketPack(plan, b) : payMyket(plan, b);
      if (isPk && !cardMode()) { toast(t("خرید اعتبار جداگانه فعلاً فقط با کارت‌به‌کارت ممکنه.", "Separate credit can only be bought by card-to-card for now.")); return; }
      if (cardMode()) return payCard(plan, b);
      paying = true; b.disabled = true; b.textContent = t("در حال اتصال به درگاه...", "Connecting to gateway...");
      try {
        const r = await plusCall({ mode: "plus-checkout", plan }, 20000);
        if (r && r.ok && typeof r.url === "string" && r.url.indexOf("https://www.zarinpal.com/pg/StartPay/") === 0) { location.href = r.url; return; }
        toast((r && r.message) || t("اتصال به درگاه انجام نشد؛ دوباره امتحان کن.", "Couldn't reach the gateway; try again."));
      } catch { toast(t("اتصال به درگاه انجام نشد؛ دوباره امتحان کن.", "Couldn't reach the gateway; try again.")); }
      paying = false;
      fillPage();
    }
    /* ---------- پرداخت درون‌برنامه‌ای مایکت (فقط وقتی اپ مایکتی است) ----------
       اپِ نیتیو بعد از پایان پرداخت، window.__suvMyketResult({ok, sku, token, message}) رو صدا می‌زنه.
       پلن فقط وقتی فعال می‌شه که Worker از سرور مایکت تأیید بگیره؛ توکنِ تأییدنشده در حافظه می‌مونه و دوباره تلاش می‌شه. */
    const MYKET_PENDING = "SUV_MYKET_PENDING";
    const myketPackOf = (sku) => { for (const k in MYKET_PACK_SKU) if (MYKET_PACK_SKU[k] === sku) return k; return ""; };
    const myketPlanOf = (sku) => (sku === MYKET_SKU.p7 ? "p7" : sku === MYKET_SKU.p14 ? "p14" : "");
    const getPending = () => { try { const v = JSON.parse(localStorage.getItem(MYKET_PENDING) || "null"); return v && v.sku && v.token ? v : null; } catch { return null; } };
    const setPending = (v) => { try { v ? localStorage.setItem(MYKET_PENDING, JSON.stringify(v)) : localStorage.removeItem(MYKET_PENDING); } catch {} };
    let myketVerifying = false, myketTimer = 0;
    function myketDone() { paying = false; if (myketTimer) { clearTimeout(myketTimer); myketTimer = 0; } try { fillPage(); } catch {} }
    async function myketVerify(it, quiet) {
      if (myketVerifying) return false;
      myketVerifying = true;
      try {
        const r = await plusCall(it.pack ? { mode: "plus-myket-verify", pack: it.pack, sku: it.sku, purchaseToken: it.token } : { mode: "plus-myket-verify", plan: it.plan, sku: it.sku, purchaseToken: it.token }, 30000);
        if (r && r.ok) {
          setPending(null);
          if (r.consumed === false) { try { window.SuvrenoNative.myketConsume && window.SuvrenoNative.myketConsume(it.token); } catch {} }
          await refreshStatus();
          toast(it.pack ? t("✨ پرداختت تأیید شد و اعتبار اضافه شد!", "✨ Your payment was confirmed and credit was added!") : t("✨ پرداختت تأیید شد و پلنت فعال شد!", "✨ Your payment was confirmed and your plan is active!"), 6000);
          return true;
        }
        const code = r && r.error;
        if (code === "PAY_NOT_PAID" || code === "INVALID_PLAN" || code === "INVALID_TOKEN" || code === "TOKEN_USED") setPending(null);
        if (!quiet || code === "PAY_NOT_PAID") toast((r && r.message) || t("تأیید پرداخت انجام نشد؛ دوباره امتحان کن.", "Couldn't confirm the payment; try again."), 6000);
      } catch {
        if (!quiet) toast(t("اتصال برقرار نشد؛ پرداختت از بین نمی‌ره و دوباره تأیید می‌شه.", "Connection failed; your payment isn't lost and will be re-checked."), 6000);
      } finally { myketVerifying = false; }
      return false;
    }
    window.__suvMyketResult = async (res) => {
      try {
        if (typeof res === "string") { try { res = JSON.parse(res); } catch { res = null; } }
        if (!res || !res.ok || !res.sku || !res.token) {
          myketDone();
          if (!res || !res.silent) toast((res && res.message) || t("پرداخت انجام نشد یا لغو شد؛ پلنی فعال نشد.", "Payment wasn't completed or was cancelled; no plan was activated."), 5000);
          return;
        }
        const plan = myketPlanOf(String(res.sku)), pack = plan ? "" : myketPackOf(String(res.sku));
        if (!plan && !pack) { myketDone(); return; }
        const it = pack ? { pack, sku: String(res.sku), token: String(res.token) } : { plan, sku: String(res.sku), token: String(res.token) };
        setPending(it);
        if (!findToken()) { myketDone(); if (!res.recovered) toast(t("برای فعال‌شدن پلن اول وارد حساب Suvreno شو؛ پرداختت از بین نمی‌ره.", "Sign in to Suvreno to activate your plan; your payment isn't lost."), 6000); return; }
        await myketVerify(it, !!res.recovered);
        myketDone();
      } catch { myketDone(); }
    };
    function retryMyketPending() { const it = getPending(); if (it && findToken() && isMyket()) myketVerify(it, true); }
    async function payMyketPack(key, b) {
      const sku = MYKET_PACK_SKU[key]; if (!sku || !b) return;
      paying = true; b.disabled = true; b.textContent = t("در حال باز کردن پرداخت مایکت...", "Opening Myket payment...");
      const payload = "suv" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      let started = false;
      try { started = window.SuvrenoNative.myketPurchase(sku, payload) !== false; } catch {}
      if (!started) { toast(t("پرداخت مایکت باز نشد؛ مطمئن شو مایکت نصب و به‌روز است و دوباره امتحان کن.", "Couldn't open Myket payment; make sure Myket is installed and up to date, then try again."), 6000); myketDone(); return; }
      myketTimer = setTimeout(() => { if (paying) myketDone(); }, 240000);
    }
    async function payMyket(plan, b) {
      paying = true; b.disabled = true; b.textContent = t("در حال باز کردن پرداخت مایکت...", "Opening Myket payment...");
      const payload = "suv" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      let started = false;
      try { started = window.SuvrenoNative.myketPurchase(MYKET_SKU[plan], payload) !== false; } catch {}
      if (!started) { toast(t("پرداخت مایکت باز نشد؛ مطمئن شو مایکت نصب و به‌روز است و دوباره امتحان کن.", "Couldn't open Myket payment; make sure Myket is installed and up to date, then try again."), 6000); myketDone(); return; }
      myketTimer = setTimeout(() => { if (paying) myketDone(); }, 240000);
    }
    setTimeout(() => { try { retryMyketPending(); } catch {} }, 5000);
    window.SuvrenoPlus = { open: openPage, upsell: () => { try { upsell(); } catch {} }, promo: () => { try { promoBar(true); } catch {} } };

    /* ---------- پیشنهاد خرید وقتی کاربر رایگان به سقف می‌خوره ---------- */
    const LIMIT_CODES = new Set(["QUOTA_EXCEEDED", "IMAGE_GEN_QUOTA_EXCEEDED", "IMAGE_EDIT_QUOTA_EXCEEDED", "IMAGE_UPLOAD_QUOTA_EXCEEDED", "FILE_UPLOAD_QUOTA_EXCEEDED", "TTS_QUOTA_EXCEEDED", "SEARCH_QUOTA_EXCEEDED", "WEB_SEARCH_QUOTA_EXCEEDED"]);
    let lastSheet = 0, adN = 0;
    /* متن‌های تبلیغ اشتراک (Start و Plus) — با هر بار نمایش، یکی از این‌ها می‌آید */
    const AD_LIMIT = [
      ["به سقف روزانه‌ی پلن رایگان رسیدی 😅 با اشتراک <b>Start</b> یا <b>Plus</b> سقف پیام، ساخت تصویر و جست‌وجوی وب خیلی بالاتر می‌ره و وسط حرف قطع نمی‌شی ✨", "You've hit the free daily limit 😅 With <b>Start</b> or <b>Plus</b> you get much higher message, image and web-search limits ✨"],
      ["سقف امروزت پر شد. با <b>Suvreno Plus</b> مدل‌های قوی‌تر، تصویرهای باکیفیت‌تر و سقف خیلی بیشتر داری 🚀 اشتراک <b>Start</b> هم برای شروع عالیه.", "Today's limit is used up. <b>Suvreno Plus</b> gives stronger models, sharper images and far higher limits 🚀 <b>Start</b> is a great way to begin."],
      ["نمی‌خوای صبر کنی تا فردا؟ 😉 با یک اشتراک کوتاه (Start یا Plus) همین الان می‌تونی ادامه بدی؛ هم پیام بیشتر، هم تصویر بیشتر.", "Don't want to wait until tomorrow? 😉 A short Start or Plus plan lets you keep going right now, with more messages and images."]
    ];
    const AD_BAR = [
      ["✨ با اشتراک <b>Start</b> یا <b>Plus</b> سقف پیام روزانه چند برابر می‌شه.", "✨ <b>Start</b> or <b>Plus</b> multiplies your daily message limit."],
      ["🎨 تصویر باکیفیت‌تر، ساخت و ویرایش بیشتر و مدل‌های قوی‌تر؛ همه‌ش با <b>Suvreno Plus</b>.", "🎨 Sharper images, more creating and editing, and stronger models, all with <b>Suvreno Plus</b>."],
      ["🔎 جست‌وجوی وب بیشتر و جواب‌های دقیق‌تر با اشتراک؛ کمتر منتظر می‌مونی، بیشتر کار انجام می‌شه.", "🔎 More web search and sharper answers with a plan; less waiting, more done."],
      ["🧠 با <b>Plus</b> مدل‌های پریمیوم داری و Suvreno بهتر می‌شناستت.", "🧠 With <b>Plus</b> you get premium models and Suvreno gets to know you better."],
      ["⚡ اشتراک‌های کوتاه ۷ و ۱۴ روزه: <b>Start</b> برای شروع، <b>Plus</b> برای همه‌چی.", "⚡ Short 7 and 14-day plans: <b>Start</b> to begin, <b>Plus</b> for everything."],
      ["📸 عکس واقعی از اینترنت و ساخت تصویر با سقف خیلی بیشتر؛ همه‌ش با اشتراک <b>Start</b> یا <b>Plus</b>.", "📸 Far higher limits for web photos and image creation with <b>Start</b> or <b>Plus</b>."],
      ["💬 دیگه نگران تموم شدن پیام‌های امروز نباش؛ با <b>Plus</b> سقف پیام چند برابره.", "💬 Stop worrying about today's messages running out; <b>Plus</b> multiplies your limit."],
      ["🚀 فقط ۷ روز <b>Start</b> هم حس‌وحال Suvreno رو عوض می‌کنه؛ امتحانش کن!", "🚀 Even 7 days of <b>Start</b> changes how Suvreno feels; give it a try!"],
      ["🎁 دوستت رو دعوت کن؛ هر دو نفرتون ۲۴ ساعت اشتراک Start هدیه می‌گیرید (از «تنظیمات»).", "🎁 Invite a friend; you both get 24 hours of Start free (see Settings)."]
    ];
    function pickAd(list, skipRef) {
      let i = 0;
      try { i = Number(localStorage.getItem("SUV_AD_IDX") || 0) || 0; localStorage.setItem("SUV_AD_IDX", String(i + 1)); } catch { i = adN; }
      adN++;
      for (let k = 0; k < list.length; k++) {
        const it = list[(i + k) % list.length];
        if (skipRef && /🎁/.test(it[0]) && !(state.signedIn && state.refCode)) continue;
        return it;
      }
      return list[0];
    }
    function upsell() {
      if (isPlus() || Date.now() - lastSheet < 90e3 || document.querySelector(".plus-sheet")) return;
      lastSheet = Date.now();
      const ad = pickAd(AD_LIMIT, false);
      const s = document.createElement("div"); s.className = "plus-sheet"; s.dir = isEn() ? "ltr" : "rtl";
      s.innerHTML = `<p>${t(ad[0], ad[1])}</p><button data-a="go">${t("دیدن پلن‌ها", "See plans")}</button><button class="gh" data-a="x">${t("بعداً", "Later")}</button>`;
      document.body.appendChild(s);
      s.addEventListener("click", (e) => {
        const a = e.target && e.target.getAttribute && e.target.getAttribute("data-a");
        if (a === "go") { s.remove(); openPage(); } else if (a === "x") s.remove();
      });
      setTimeout(() => s.remove(), 25000);
    }
    /* ---------- تبلیغ دوره‌ای (نوار کوچک بالای کادر پیام) برای کاربران بدون اشتراک ----------
       هر PROMO_EVERY_H ساعت یک‌بار؛ برای تغییر تعداد ساعت فقط همین عدد رو عوض کن. */
    const PROMO_EVERY_MIN = 40, PROMO_KEY = "SUV_PROMO_LAST"; // هر ۴۰ دقیقه یک نوار تبلیغ (برای تغییر، فقط همین عدد)
    function promoBar(force, gapMin) {
      try {
        if (isPlus() || document.hidden || document.querySelector(".plus-promo") || document.querySelector(".plus-sheet")) return;
        const last = Number(localStorage.getItem(PROMO_KEY) || 0);
        if (!force && Date.now() - last < (gapMin != null ? gapMin : PROMO_EVERY_MIN) * 60e3) return;
        const ad = pickAd(AD_BAR, true);
        const bar = document.createElement("div"); bar.className = "plus-promo"; bar.dir = isEn() ? "ltr" : "rtl";
        bar.innerHTML = `<p>${t(ad[0], ad[1])}</p><button data-a="go">${t("دیدن پلن‌ها", "See plans")}</button><button class="gh" data-a="x" aria-label="${t("بستن", "Close")}">×</button>`;
        const wrap = document.querySelector(".composer-wrap");
        if (wrap) wrap.insertBefore(bar, wrap.firstChild); else { bar.classList.add("fixed"); document.body.appendChild(bar); }
        localStorage.setItem(PROMO_KEY, String(Date.now()));
        bar.addEventListener("click", (e) => {
          const a = e.target && e.target.getAttribute && e.target.getAttribute("data-a");
          if (a === "go") { bar.remove(); openPage(); } else if (a === "x") bar.remove();
        });
        setTimeout(() => { try { bar.remove(); } catch {} }, 20000);
      } catch {}
    }
    /* ---------- کارت «مزایای اشتراک» + یادآوری بعد از چند پیام (فقط کاربر بدون اشتراک) ---------- */
    let nudgeN = 0;
    function benefitsSheet() {
      try {
        if (isPlus() || document.hidden || document.querySelector(".plus-sheet") || document.querySelector(".plus-promo")) return;
        const last = Number(localStorage.getItem("SUV_BEN_LAST") || 0);
        if (Date.now() - last < 3 * 3600e3) return; // حداکثر هر ۳ ساعت یک‌بار
        localStorage.setItem("SUV_BEN_LAST", String(Date.now()));
        const items = isEn()
          ? ["💬 Far higher daily message limit", "🎨 Sharper images, more creating and editing", "📸 More real photos from the web", "🔎 More web search, sharper answers", "🧠 Premium models that know you better"]
          : ["💬 سقف پیام روزانه‌ی خیلی بیشتر", "🎨 تصویر باکیفیت‌تر، ساخت و ویرایش بیشتر", "📸 عکس واقعی بیشتر از اینترنت", "🔎 جست‌وجوی وب بیشتر و جواب دقیق‌تر", "🧠 مدل‌های پریمیوم که بهتر می‌شناسنت"];
        const s = document.createElement("div"); s.className = "plus-sheet"; s.dir = isEn() ? "ltr" : "rtl";
        s.innerHTML = `<p><b>${t("✨ چرا اشتراک Suvreno؟", "✨ Why a Suvreno plan?")}</b></p><ul class="plus-ben">${items.map((x) => `<li>${x}</li>`).join("")}</ul><button data-a="go">${t("دیدن پلن‌ها", "See plans")}</button><button class="gh" data-a="x">${t("بعداً", "Later")}</button>`;
        document.body.appendChild(s);
        s.addEventListener("click", (e) => {
          const a = e.target && e.target.getAttribute && e.target.getAttribute("data-a");
          if (a === "go") { s.remove(); openPage(); } else if (a === "x") s.remove();
        });
        setTimeout(() => { try { s.remove(); } catch {} }, 22000);
      } catch {}
    }
    function msgNudge() {
      try {
        if (isPlus()) return;
        nudgeN++;
        if (nudgeN % 8 === 0) benefitsSheet();   // هر ۸ پیام: کارت مزایا
        else if (nudgeN % 4 === 0) promoBar(false, 12); // هر ۴ پیام: نوار کوچک (حداقل ۱۲ دقیقه فاصله)
      } catch {}
    }
    function startPromo() {
      try {
        const st = document.createElement("style");
        st.textContent = ".plus-promo{display:flex;align-items:center;gap:8px;margin:0 0 8px;padding:9px 12px;border-radius:16px;background:linear-gradient(135deg,rgba(var(--ac1-rgb),.2),rgba(var(--ac3-rgb),.22));border:1px solid rgba(var(--ac3-rgb),.45);color:#fff;font-size:calc(13px * var(--fs,1));line-height:1.7;animation:plusPromoIn .35s ease both}.plus-promo p{margin:0;flex:1}.plus-promo button{border:0;border-radius:11px;padding:7px 12px;font-weight:700;font-size:calc(12.5px * var(--fs,1));color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--ac1),var(--ac3));flex:none}.plus-promo button.gh{background:rgba(255,255,255,.14);padding:6px 10px}.plus-promo.fixed{position:fixed;left:10px;right:10px;bottom:90px;z-index:99997}@keyframes plusPromoIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.plus-ben{list-style:none;margin:0 0 12px;padding:0;text-align:start;font-size:calc(13px * var(--fs,1));line-height:2}";
        document.head.appendChild(st);
        setTimeout(() => promoBar(false), 25e3);
        setInterval(() => promoBar(false), 2 * 60e3);
        document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(() => promoBar(false), 2500); });
      } catch {}
    }

    /* ---------- نشانگر «در حال جست‌وجو» (فقط وقتی واقعاً جست‌وجو هست) ---------- */
    let searching = false;
    const STRAY = /^\s*(در حال جست‌?وجو\.*|Searching\.*)\s*$/;
    function labelRows() {
      if (!searching && !document.querySelector(".plus-search-label")) return;
      document.querySelectorAll(".am-thinking-row").forEach((row) => {
        const has = row.querySelector(".plus-search-label");
        if (searching && !has) { const l = document.createElement("span"); l.className = "plus-search-label"; l.textContent = t("در حال جست‌وجو...", "Searching..."); row.appendChild(l); }
        if (!searching && has) has.remove();
      });
    }
    function setSearching(v) { searching = v; labelRows(); }
    const msgs = document.getElementById("messages");
    if (msgs) {
      new MutationObserver((muts) => {
        for (const m of muts) for (const n of m.addedNodes) {
          if (n.nodeType === 1 && !n.classList.contains("plus-search-label") && n.children.length === 0 && STRAY.test(n.textContent || "") && !n.closest(".plus-search-label")) n.remove();
        }
        labelRows();
      }).observe(msgs, { childList: true, subtree: true });
    }

    /* ---------- نوار «حافظه به‌روز شد» بالای پیام Suvreno ---------- */
    function memChip() {
      const m = document.getElementById("messages");
      if (!m) return;
      let last = m.lastElementChild;
      while (last && (last.classList.contains("am-thinking-row") || last.classList.contains("plus-mem-chip"))) last = last.previousElementSibling;
      if (!last) return;
      const c = document.createElement("div"); c.className = "plus-mem-chip"; c.textContent = t("🧠 حافظه به‌روزرسانی شد", "🧠 Memory updated");
      last.parentNode.insertBefore(c, last);
    }
    async function drain(res) {
      try {
        if (res.body && res.body.getReader) { const rd = res.body.getReader(); while (!(await rd.read()).done) {} } else await res.text();
      } catch {}
    }
    async function afterChat(res, message) {
      try {
        if (!findToken()) return;
        await drain(res);
        refreshStatus();
        const mtxt = String(message || "");
        if (mtxt.length < 15 || !/اسمم|اسم من|شغلم|کارم|رشته‌ام|رشته ام|ساکن|زندگی می‌?کنم|دانشجو|متاهل|مجرد|همسرم|بچه‌?هام|بچه‌?ام|دوست دارم|دوست ندارم|علاقه|عاشق|ترجیح|\bmy name\b|\bi am an?\b|\bi'm an?\b|\bi live\b|\bi work\b|\bi like\b|\bi love\b|\bi hate\b|\bi prefer\b|\bmy (?:job|wife|husband|son|daughter|goal)\b/i.test(mtxt)) return;
        await new Promise((r) => setTimeout(r, 1800)); // بعد از ذخیره‌ی تاریخچه‌ی Worker اصلی
        const r = await plusCall({ mode: "auto-memory", message }, 20000);
        if (r && r.updated) memChip();
      } catch {}
    }


    /* ---------- «چشیدن»: پاسخ پریمیومِ اختیاری (فقط کاربر واردشده‌ی بدون اشتراک؛ پیش‌فرض خاموش) ----------
       دستی روشن می‌شود و فقط برای «همین یک پیام» اعمال می‌شود (بعد از ارسال خودکار خاموش می‌شود)؛ پیام عادی هرگز از سهمیه کم نمی‌کند.
       سهمیه و ریست هفتگی را Worker تعیین می‌کند (state.taste از plus-status). */
    let tasteOn = false;
    const tInfo = () => (state.taste && typeof state.taste === "object") ? state.taste : null;
    const tasteAvail = () => !!(findToken() && !isPlus() && tInfo() && tInfo().enabled);
    const tasteLeft = () => (tasteAvail() ? Math.max(0, Number(tInfo().left) || 0) : 0);
    function tasteResetText() {
      const r = tInfo() && Number(tInfo().resetAt); if (!r) return "";
      const ms = Math.max(0, r - Date.now()), d = Math.floor(ms / 864e5), h = Math.max(1, Math.ceil((ms % 864e5) / 36e5));
      return d > 0 ? t(num(d) + " روز و " + num(h) + " ساعت دیگر", d + "d " + h + "h from now") : t(num(h) + " ساعت دیگر", h + "h from now");
    }
    function renderTaste() {
      try {
        let b = document.getElementById("tasteBtn");
        if (!tasteAvail()) { if (b) b.remove(); tasteOn = false; return; }
        if (!b) {
          const plus = document.getElementById("composerPlusBtn"); if (!plus || !plus.parentNode) return;
          b = document.createElement("button"); b.id = "tasteBtn"; b.type = "button"; b.className = "round-action taste-btn";
          b.innerHTML = '<span class="taste-ic">✨</span><span class="taste-n"></span>';
          plus.after(b);
          b.addEventListener("click", onTasteClick);
        }
        const left = tasteLeft(), max = Number(tInfo().max) || 3;
        b.querySelector(".taste-n").textContent = num(left) + "/" + num(max);
        b.classList.toggle("off", left <= 0); b.classList.toggle("on", tasteOn && left > 0);
        b.setAttribute("aria-pressed", String(tasteOn && left > 0));
        b.title = left > 0 ? t("پاسخ چشیدن / عمیق (" + num(left) + " از " + num(max) + " این هفته)", "Taste / deep answer (" + left + " of " + max + " this week)")
                           : t("سهمیه‌ی چشیدن تموم شد؛ ریست: " + tasteResetText(), "Taste quota used; resets " + tasteResetText());
      } catch {}
    }
    function tasteSheet(msg, withPlans) {
      try {
        if (document.querySelector(".plus-sheet")) return;
        const s = document.createElement("div"); s.className = "plus-sheet"; s.dir = isEn() ? "ltr" : "rtl";
        s.innerHTML = `<p>${msg}</p>` + (withPlans ? `<button data-a="go">${t("دیدن پلن‌ها", "See plans")}</button>` : "") + `<button class="gh" data-a="x">${t("باشه", "OK")}</button>`;
        document.body.appendChild(s);
        s.addEventListener("click", (e) => { const a = e.target && e.target.getAttribute && e.target.getAttribute("data-a"); if (a === "go") { s.remove(); openPage(); } else if (a === "x") s.remove(); });
        setTimeout(() => { try { s.remove(); } catch {} }, 20000);
      } catch {}
    }
    function onTasteClick() {
      const left = tasteLeft(), max = Number((tInfo() || {}).max) || 3;
      if (left <= 0) {
        // پیشنهاد خرید: openPage خودش مسیر پرداختِ درست را نشان می‌دهد (اپ مایکت: فقط درگاه مایکت؛ وب: روش‌های وب)
        tasteSheet(t("سهمیه‌ی «چشیدن» این هفته‌ات (" + num(max) + " از " + num(max) + ") تموم شده و " + tasteResetText() + " دوباره پر می‌شه. برای پاسخ‌های پریمیوم بدون محدودیتِ هفتگی، پلن‌ها و بسته‌های اعتبار رو ببین.", "Your weekly taste quota is used up and refills " + tasteResetText() + ". See plans and credit packs for premium answers without the weekly limit."), true);
        return;
      }
      tasteOn = !tasteOn; renderTaste();
      toast(tasteOn ? t("✨ پاسخ چشیدن برای پیام بعدی روشنه (یک بار مصرف از " + num(left) + " سهمیه‌ی باقی‌مانده)", "✨ Taste answer is on for your next message (uses 1 of " + left + " remaining)")
                    : t("پاسخ چشیدن خاموش شد؛ چیزی از سهمیه کم نشد.", "Taste answer is off; nothing was used."), 3200);
    }
    /* برچسب زیر پاسخ: فقط وقتی Worker اعلام کرده همین مسیر/مدل واقعاً اجرا شده */
    function queueTag(label, tier) {
      try {
        if (!label) return;
        const live = () => Array.from(document.querySelectorAll("#messages .message.ai")).filter((el) => !el.classList.contains("am-thinking-row"));
        const before = live().length; let tries = 0;
        const iv = setInterval(() => {
          const ais = live();
          if (ais.length > before) {
            clearInterval(iv);
            const last = ais[ais.length - 1], col = last.querySelector(".bubble-col") || last;
            if (!col.querySelector(".am-eng-tag")) { const s = document.createElement("div"); s.className = "am-eng-tag " + (tier || ""); s.textContent = label; col.appendChild(s); }
          } else if (++tries > 120) clearInterval(iv);
        }, 150);
      } catch {}
    }
    function tasteApply(info) { if (info && typeof info === "object") { state.taste = { ...(state.taste || {}), ...info }; try { localStorage.setItem("SUV_PLUS_STATE", JSON.stringify(state)); } catch {} renderTaste(); } }
    try {
      const st = document.createElement("style");
      st.textContent = ".taste-btn{position:relative;font-size:calc(19px * var(--fs,1));flex:0 0 50px}.taste-btn .taste-n{position:absolute;bottom:2px;left:0;right:0;font-size:9px;line-height:1;text-align:center;opacity:.8}.taste-btn.on{background:linear-gradient(135deg,rgba(var(--ac1-rgb),.30),rgba(var(--ac3-rgb),.34),rgba(var(--ac2-rgb),.26));border-color:rgba(var(--ac3-rgb),.65);box-shadow:0 0 14px rgba(var(--ac3-rgb),.45)}.taste-btn.off{opacity:.5}.am-eng-tag{margin-top:4px;font-size:calc(11px * var(--fs,1));color:var(--ac-soft);opacity:.9}.am-eng-tag.taste{color:var(--ac-soft)}";
      document.head.appendChild(st);
      setTimeout(renderTaste, 1200); setInterval(renderTaste, 15000);
    } catch {}

    /* ---------- رهگیر fetch: مسیریابی هوشمند، بدون دست‌زدن به script.js ---------- */
    const ROUTED = new Set(["chat", "search", "image", "generate-image", "file-analysis", "multi-attach"]);
    // فقط «مسیریابیِ عمدی» به Worker اصلی: اشتراک ندارد/وارد نشده، یا خودِ Plus گفته این درخواست (Vision، لینک، اعتبار تموم) مالِ Worker اصلی است.
    // ⚠️ PLUS_INTERNAL، خطای HTTP و قطعیِ شبکه عمداً اینجا نیستن: برای کاربرِ دارای اشتراک، خرابیِ موقتِ Plus نباید بی‌صدا به سرویس رایگان
    // (با سهمیه/حسابِ جدا) برگرده؛ به‌جاش یک خطای روشنِ قابل‌تکرار نشون داده می‌شه (fail-closed) و چیزی از سهمیه/اعتبار مصرف نمی‌شه.
    const FALLBACK = new Set(["NOT_PLUS", "NOT_AUTHENTICATED", "PLUS_PASSTHROUGH", "TASTE_LIMIT"]);
    // سقف‌های اشتراک (پر شدنِ سهمیه) عمداً به سرویس رایگان برنمی‌گردن؛ پیام Worker به کاربر نشون داده می‌شه
    const PLUS_LIMITS = new Set(["PLUS_MSG_LIMIT", "PLUS_GEN_LIMIT", "PLUS_EDIT_LIMIT", "PLUS_CREDIT_EMPTY"]);
    let lastSoftSt = 0;
    function softRefresh() { if (Date.now() - lastSoftSt < 8000) return; lastSoftSt = Date.now(); refreshStatus(); }
    /* وقتی Plus برای کاربرِ دارای اشتراک در دسترس نیست: پاسخِ خطای استانداردِ Suvreno ساخته می‌شه (همون قالبِ ok:false/message که script.js نشون می‌ده)
       و هیچ درخواستی به Worker اصلی فرستاده نمی‌شه. */
    function plusDownResponse(code, serverMessage) {
      console.warn("SUVRENO_PLUS_UNAVAILABLE", code);
      const nm = planLabel(), net = code === "NETWORK";
      const msg = (serverMessage && String(serverMessage).trim())
        ? String(serverMessage).trim().replace("سرور اشتراک", "سرور " + nm).replace("The subscription server", "The " + nm + " server")
        : (net
          ? t("اتصال به سرور " + nm + " برقرار نشد؛ اینترنتت رو چک کن و دوباره امتحان کن. چیزی از سهمیه و اعتبارت کم نشد.", "Couldn't reach the " + nm + " server; check your internet and try again. Nothing was deducted from your quota or credit.")
          : t("سرور " + nm + " این بار نتونست جواب بده (احتمالاً ظرفیت هوش مصنوعی موقتاً پره)؛ چیزی از سهمیه و اعتبارت کم نشد. چند لحظه بعد دوباره امتحان کن.", "The " + nm + " server couldn't answer this time (the AI service may be temporarily busy); nothing was deducted from your quota or credit. Please try again in a moment."));
      return new Response(JSON.stringify({ ok: false, error: "PLUS_INTERNAL", code, message: msg }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    let lastCreditToast = 0;
    function creditNotice() {
      if (Date.now() - lastCreditToast < 6 * 3600e3) return;
      lastCreditToast = Date.now();
      toast(t("اعتبار کیف پولت برای این درخواست کافی نبود؛ این بار با سرویس رایگان انجام شد. جست‌وجوی وب به اعتبار ربطی نداره.", "Your wallet credit wasn't enough for this request; the free service handled it this time. Web search doesn't depend on credit."), 6000);
      refreshStatus();
    }
    let lastSearchToast = 0;
    function searchNotice(j) {
      try {
        if (!j || Date.now() - lastSearchToast < 30 * 60e3) return;
        if (j.searchLimited) { lastSearchToast = Date.now(); toast(t("اعتبار برای جست‌وجوی وب کافی نبود؛ این جواب بدون جست‌وجو داده شد.", "Not enough credit for web search; this answer came without search."), 5500); }
        else if (j.searchUnavailable) { lastSearchToast = Date.now(); toast(t("جست‌وجوی وب الان در دسترس نبود؛ چیزی از سهمیه‌ات کم نشد و جواب بدون جست‌وجو داده شد.", "Web search was unavailable; nothing was deducted from your quota and the answer came without search."), 5500); }
      } catch {}
    }
    async function searchIntent(message) {
      try { const r = await plusCall({ mode: "search-intent", message }, 7000); return r && r.ok ? !!r.search : null; } catch { return null; }
    }
    window.fetch = async function (input, init) {
      let url = ""; try { url = typeof input === "string" ? input : (input && input.url) || ""; } catch {}
      if (!(url && url.indexOf(MAIN_URL) === 0 && init && init.method === "POST" && typeof init.body === "string")) return origFetch(input, init);
      let body; try { body = JSON.parse(init.body); } catch { return origFetch(input, init); }
      if (body.sessionToken) TOKEN = body.sessionToken;
      const mode = String(body.mode || "chat").toLowerCase();
      const chatty = mode === "chat" || mode === "search";
      /* سقف حجم پیام (کاهش هزینه‌ی مدل) */
      if (ROUTED.has(mode) && !body.imageData && !body.image) {
        const lim = ((state.msgMax || {})[isPlus() ? "plus" : "free"]) || (isPlus() ? { chars: 8000, lines: 150 } : { chars: 4000, lines: 80 });
        const raw = String(body.message || body.prompt || "");
        if (raw.length > lim.chars || raw.split("\n").length > lim.lines) {
          const msg = t("پیامت خیلی طولانیه؛ لطفاً کوتاه‌ترش کن (حداکثر " + num(lim.chars) + " کاراکتر و " + num(lim.lines) + " خط) یا در چند پیام بفرست 🙏", "Your message is too long; please shorten it (max " + lim.chars + " characters / " + lim.lines + " lines) or split it up 🙏");
          toast(msg, 5000);
          return new Response(JSON.stringify({ ok: false, error: "MESSAGE_TOO_LONG", message: msg }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      }
      let out = { ...body, lang: isEn() ? "en" : "fa" };
            try {
                if (chatty && !body.imageData && !body.image) {
                    const ais = Array.from(document.querySelectorAll("#messages .message.ai")).filter((el) => !el.classList.contains("am-thinking-row"));
                    const last = ais[ais.length - 1];
                    if (last && last.querySelector("img"))
                        out.prevImage = true; // پیام قبلیِ Suvreno یک تصویر بود: «دوباره بساز» یعنی تصویر
                }
            }
            catch { }
      let res = null, plusFailed = null; // بیرون از try تا catch نهایی هم ببینه
      try {
        if (chatty && body.message && (body.webSearch === true || mode === "search")) {
          const need = await searchIntent(String(body.message));
          if (need !== null) {
            out.webSearch = need; out.searchDecided = need;
            if (mode === "search" && !need) out.mode = "chat";
            if (need) setSearching(true);
          }
        }
        const sendMain = (b) => origFetch(input, { ...init, body: JSON.stringify(b) });
        /* «چشیدن»: فقط اگر کاربر دستی روشنش کرده؛ هر ناکامی (سهمیه/خطا/پشتیبانی‌نشدن) بی‌صدا به مسیر عادیِ رایگان می‌رود و چیزی کم نمی‌شود */
        if (!isPlus() && tasteOn && mode === "chat" && tasteLeft() > 0 && !out.imageData && !out.image && out.generateImage !== true) {
          tasteOn = false; renderTaste();
          try {
            const pr = await origFetch(PLUS_URL, { ...init, body: JSON.stringify({ ...out, taste: true }) });
            let j = null; try { j = await pr.clone().json(); } catch {}
            if (pr.ok && j && j.ok === true && j.taste === true) {
              res = pr; tasteApply(j.tasteInfo); queueTag(j.engineLabel, j.engineTier);
              if (tasteLeft() <= 0) setTimeout(() => tasteSheet(t("این آخرین «چشیدن» این هفته بود. برای پاسخ‌های پریمیوم بدون محدودیتِ هفتگی، پلن‌ها و بسته‌های اعتبار رو ببین.", "That was your last taste answer this week. See plans and credit packs for premium answers without the weekly limit."), true), 2500);
            } else if (j && j.error === "TASTE_LIMIT") { tasteApply(j.taste); if (j.message) toast(j.message, 4500); }
            else if (j && j.ok === false && j.error === "MESSAGE_TOO_LONG") { res = pr; }
            else if (j && j.error === "PLUS_PASSTHROUGH") { refreshStatus(); }
          } catch (e) { if (e && e.name === "AbortError") throw e; }
        }
        if (!res && isPlus() && ROUTED.has(mode)) {
          try {
            const pr = await origFetch(PLUS_URL, { ...init, body: JSON.stringify(out) });
            let j = null; try { j = await pr.clone().json(); } catch {}
            if (pr.ok && j && j.ok === false && j.error === "PLUS_INTERNAL") plusFailed = plusDownResponse("PLUS_INTERNAL", j.message); // خطای داخلیِ Plus (fail-closed)
            else if (!pr.ok || !j) plusFailed = plusDownResponse("HTTP_" + pr.status);                                                         // خرابیِ پلتفرم/پاسخ نامعتبر
            else if (!(j.ok === false && FALLBACK.has(j.error))) { res = pr; searchNotice(j); if (j.ok === true && j.engineLabel) queueTag(j.engineLabel, j.engineTier); if (j.ok === false && PLUS_LIMITS.has(j.error) && j.message) toast(j.message, 5500); softRefresh(); }
            else if (j.error === "PLUS_PASSTHROUGH" && j.reason === "credit") creditNotice();
            else if (j.error === "NOT_PLUS" || j.error === "NOT_AUTHENTICATED") refreshStatus(); // وضعیتِ ذخیره‌شده کهنه بود (اشتراک تموم شده/نشست عوض شده)
          } catch (e) { if (e && e.name === "AbortError") throw e; plusFailed = plusDownResponse("NETWORK"); }
        }
        if (plusFailed) { setSearching(false); return plusFailed; } // هرگز بی‌صدا به سرویس رایگان (Worker اصلی) برنمی‌گردیم
        if (!res) res = await sendMain(out);
        setSearching(false);
        const ct = res.headers.get("content-type") || "";
        if (!isPlus() && /json/i.test(ct)) {
          try { const j = await res.clone().json(); if (j && j.ok === false && LIMIT_CODES.has(j.error)) upsell(); } catch {}
        }
        if (chatty && body.message && res.ok) afterChat(res.clone(), String(body.message));
        if (chatty && body.message && res.ok && !isPlus()) setTimeout(msgNudge, 2500);
        return res;
      } catch (e) {
        try { setSearching(false); } catch {}
        if (e && e.name === "AbortError") throw e;
        if (res) return res; // پاسخ از قبل دریافت شده؛ خطا بعد از آن بوده، درخواست دوباره فرستاده نمی‌شه
        /* ⚠️ کاربر Plus هرگز بی‌صدا به Worker اصلی/سرویس رایگان برنمی‌گرده؛ خطای روشن و قابل‌تکرار (fail-closed). فقط کاربر رایگان مسیر اصلی رو می‌گیره. */
        if (isPlus() && ROUTED.has(mode)) return plusDownResponse("PLUS_CLIENT_ROUTING_ERROR");
        return origFetch(input, init);
      }
    };

    /* ---------- شروع ---------- */
    /* ---------- اتصال حساب به بات‌ها: روبیکا، تلگرام، بله، سروش پلاس (داخل تنظیمات ← بات‌های سوورنو) ----------
       مسیر ۱: «اتصال حساب» کد ۱۰ دقیقه‌ای می‌دهد ← کاربر در بات می‌فرستد: /link کد
       مسیر ۲: کاربر در بات /link را می‌زند و کدی که بات داده را همین‌جا وارد می‌کند. */
    let botLinkInfo = null, botLinkCode = null, botLinkTimer = 0, botLinkErr = "";
    function botLinkStop() { if (botLinkTimer) { clearInterval(botLinkTimer); botLinkTimer = 0; } }
    async function renderBotLink(force) {
      try {
        const box = document.getElementById("botLinkBox");
        if (!box) return;
        if (!state.signedIn) { box.style.display = "none"; botLinkStop(); return; }
        box.style.display = "";
        if (force || !botLinkInfo) {
          try { const r = await plusCall({ mode: "bot-link-status" }, 12000); if (r && r.ok) { botLinkInfo = r; botLinkErr = ""; } else botLinkErr = (r && (r.message || r.code)) || ""; } catch { botLinkErr = ""; }
        }
        drawBotLink(box);
      } catch (e) { console.error("bot-link", e); }
    }
    const PLAT_NAMES = { rubika: ["روبیکا", "Rubika"], telegram: ["تلگرام", "Telegram"], bale: ["بله", "Bale"], splus: ["سروش پلاس", "Soroush Plus"] };
    const platName = (p) => { const x = PLAT_NAMES[p] || PLAT_NAMES.rubika; return t(x[0], x[1]); };
    const botUrlsOfInfo = (info) => { const o = Object.assign({}, (info && info.bots) || {}); if (!o.rubika) o.rubika = (info && info.botUrl) || "https://rubika.ir/Suvreno_bot"; return o; };
    let botLinkBefore = 0;
    /* دکمه‌های «استفاده از بات سوورنو در …» برای تلگرام، بله و سروش پلاس (روبیکا دکمه‌ی خودش را در index.html دارد).
       لینک‌ها از Worker می‌آید (bot-info)؛ باتی که لینکش تنظیم نشده نمایش داده نمی‌شود. */
    async function renderBotButtons() {
      try {
        const host = document.getElementById("botOtherBtns");
        if (!host) return;
        let bots = null;
        try { const r = await plusCall({ mode: "bot-info" }, 10000); if (r && r.ok) bots = r.bots; } catch {}
        bots = Object.assign({ telegram: "https://t.me/Suvreno_bot", bale: "https://ble.ir/Suvreno_bot", splus: "https://splus.ir/Suvreno_bot" }, bots || {});
        host.textContent = "";
        for (const p of ["telegram", "bale", "splus"]) {
          const url = bots && bots[p];
          if (!url) continue;
          const x = PLAT_NAMES[p];
          const b = document.createElement("button");
          b.type = "button"; b.className = "clear-memory";
          b.textContent = t("💬 استفاده از بات سوورنو در " + x[0], "💬 Use the Suvreno bot in " + x[1]);
          b.onclick = () => { try { if (window.suvOpenBot) window.suvOpenBot(p, url); else { const w = window.open(url, "_blank"); if (!w) location.href = url; } } catch { try { location.href = url; } catch {} } };
          host.appendChild(b);
        }
      } catch (e) { console.error("bot-buttons", e); }
    }
    function drawBotLink(box) {
      const mk = (tag, text, css) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (css) n.style.cssText = css; return n; };
      const btn = (text, fn, cls) => { const b = mk("button", text); b.type = "button"; b.className = cls || "clear-memory"; b.onclick = fn; return b; };
      box.textContent = "";
      let info = botLinkInfo;
      if (!info) {
        /* وضعیت نیامد؛ دکمه‌ها و کادر کد را باز هم نشان می‌دهیم تا کاربر گیر نکند. */
        box.appendChild(mk("p", t("الان نتونستم وضعیت اتصال رو بگیرم", "Couldn't load the link status") + (botLinkErr ? " (" + botLinkErr + ")" : "") + t("؛ می‌تونی دوباره امتحان کنی یا همین‌جا کد رو وارد کنی.", "; you can retry or enter the code here."), "font-size:12px;opacity:.8;margin:4px 0"));
        box.appendChild(btn(t("🔄 تلاش دوباره", "🔄 Retry"), () => renderBotLink(true)));
        info = { ok: true, enabled: true, linked: false, links: [], bots: {} };
      }
      if (info.enabled === false) return;
      const links = Array.isArray(info.links) ? info.links : [];
      const urls = botUrlsOfInfo(info);
      if (info.linked) {
        const names = [...new Set(links.map((l) => platName(l.p || "rubika")))].join(t("، ", ", "));
        box.appendChild(mk("p", t("✅ حسابت به بات وصله" + (names ? " (" + names + ")" : "") + "؛ حافظه، اشتراک و سقف استفاده با بات مشترکه.", "✅ Your account is linked to the bot" + (names ? " (" + names + ")" : "") + "; memory, plan and limits are shared."), "font-size:13px;margin:6px 0"));
        box.appendChild(btn(t("🔌 قطع اتصال از همه‌ی بات‌ها", "🔌 Disconnect from all bots"), async () => {
          if (!confirm(t("اتصال حساب به همه‌ی بات‌ها قطع بشه؟", "Disconnect your account from all bots?"))) return;
          try { const r = await plusCall({ mode: "bot-unlink" }, 15000); if (r && r.ok) { botLinkInfo = Object.assign({}, botLinkInfo, { linked: false, links: [] }); botLinkCode = null; toast(t("اتصال قطع شد", "Disconnected")); drawBotLink(box); } else toast((r && r.message) || t("نشد؛ دوباره امتحان کن", "Failed; try again")); } catch { toast(t("نشد؛ دوباره امتحان کن", "Failed; try again")); }
        }));
      } else {
        box.appendChild(mk("p", t("برای اینکه حافظه و اشتراکت داخل بات هم کار کنه، حساب سوورنوت رو به بات وصل کن.", "Link your Suvreno account to the bot to share memory and your plan."), "font-size:12px;opacity:.85;margin:6px 0"));
      }
      if (botLinkCode && botLinkCode.expiresAt > Date.now()) {
        const c = botLinkCode;
        box.appendChild(mk("div", c.code, "direction:ltr;font-family:monospace;font-size:26px;font-weight:800;letter-spacing:4px;text-align:center;padding:10px 0"));
        box.appendChild(mk("p", t("تو بات سوورنو (روبیکا، تلگرام، بله یا سروش پلاس) این رو بفرست (۱۰ دقیقه اعتبار داره، فقط یک‌بار کار می‌کنه):", "Send this to the Suvreno bot (Rubika, Telegram, Bale or Soroush Plus) (valid 10 minutes, one use):"), "font-size:12px;margin:2px 0"));
        box.appendChild(mk("div", c.command, "direction:ltr;font-family:monospace;text-align:center;font-size:15px;padding:4px 0 8px"));
        box.appendChild(btn(t("📋 کپی دستور", "📋 Copy command"), async () => { try { await navigator.clipboard.writeText(c.command); toast(t("کپی شد ✅", "Copied ✅")); } catch { toast(c.command, 8000); } }));
        const cu = botUrlsOfInfo(c.bots ? c : info);
        for (const p of ["rubika", "telegram", "bale", "splus"]) {
          if (!cu[p]) continue;
          box.appendChild(btn(t("💬 باز کردن بات " + platName(p), "💬 Open the bot in " + platName(p)), () => { try { if (window.suvOpenBot) window.suvOpenBot(p, cu[p]); else window.open(cu[p], "_blank"); } catch {} }));
        }
        if (!botLinkTimer) {
          botLinkTimer = setInterval(async () => {
            try {
              if (!document.getElementById("botLinkBox") || !botLinkCode || botLinkCode.expiresAt < Date.now()) { botLinkStop(); botLinkCode = null; renderBotLink(false); return; }
              const r = await plusCall({ mode: "bot-link-status" }, 10000);
              const done = r && r.ok && (Array.isArray(r.links) ? r.links.length > botLinkBefore : r.linked);
              if (done) { botLinkInfo = r; botLinkCode = null; botLinkStop(); toast(t("✅ وصل شد!", "✅ Linked!")); drawBotLink(document.getElementById("botLinkBox")); }
            } catch {}
          }, 4000);
        }
      } else {
        botLinkCode = null;
        box.appendChild(btn(info.linked ? t("🔗 اتصال بات دیگر", "🔗 Link another bot") : t("🔗 اتصال حساب به بات", "🔗 Link account to the bot"), async () => {
          try {
            botLinkBefore = links.length;
            const r = await plusCall({ mode: "bot-link-create" }, 15000);
            if (r && r.ok && r.code) { botLinkCode = r; drawBotLink(box); } else toast((r && r.message) || t("نشد؛ دوباره امتحان کن", "Failed; try again"));
          } catch { toast(t("نشد؛ دوباره امتحان کن", "Failed; try again")); }
        }));
      }
      const row = mk("div", null, "display:flex;gap:6px;margin-top:8px;align-items:center");
      const inp = mk("input"); inp.type = "text"; inp.placeholder = t("کد گرفته‌شده از بات (/link)", "Code from the bot (/link)"); inp.dir = "ltr"; inp.maxLength = 24; inp.style.cssText = "flex:1;min-width:0;padding:8px;border-radius:8px";
      const go = btn(t("تأیید", "Confirm"), async () => {
        const code = inp.value.trim();
        if (!code) return;
        try {
          const r = await plusCall({ mode: "bot-link-claim", code }, 20000);
          if (r && r.ok) { botLinkInfo = Object.assign({}, botLinkInfo, { linked: true }); botLinkCode = null; toast(t("✅ وصل شد!", "✅ Linked!")); renderBotLink(true); } else toast((r && r.message) || t("نشد؛ دوباره امتحان کن", "Failed; try again"), 6000);
        } catch { toast(t("نشد؛ دوباره امتحان کن", "Failed; try again")); }
      }); go.style.flex = "0 0 auto";
      row.appendChild(inp); row.appendChild(go);
      box.appendChild(row);
    }
    /* ---------- کد معرف (داخل تنظیمات) ----------
       فقط خودِ «کد» کپی می‌شه، نه لینک؛ دوستت کد رو موقع ثبت‌نام توی مودال «کد معرف» وارد می‌کنه. */
    function renderInviteSettings() {
      try {
        const sec = document.getElementById("settingsInviteSection");
        if (!sec) return;
        const code = String(state.refCode || "").toUpperCase();
        if (!state.signedIn || !code) { sec.style.display = "none"; return; }
        sec.style.display = "";
        const rf = refOf();
        const q = (id) => sec.querySelector(id);
        q("#settingsInviteLabel").textContent = t("🎁 کد معرف", "🎁 Referral code");
        q("#settingsInviteHint").textContent = t(
          "کدت رو به دوستت بده. وقتی تازه ثبت‌نام کرد و کد رو وارد کرد، هر دو نفرتون " + num(rf.days) + " روز اشتراک Start هدیه می‌گیرید (تا " + num(rf.max) + " دعوت). دعوت موفق تا الان: " + num(state.refCount || 0),
          "Give your code to a friend. When they sign up and enter it, you both get " + rf.days + " free day(s) of Start (up to " + rf.max + " invites). Successful invites so far: " + (state.refCount || 0));
        q("#settingsInviteCode").textContent = code;
        const btn = q("#settingsInviteCopyBtn");
        btn.textContent = t("📋 کپی کد معرف", "📋 Copy referral code");
        btn.onclick = async () => {
          try { await navigator.clipboard.writeText(code); toast(t("کد معرف کپی شد ✅", "Referral code copied ✅")); } catch { toast(code, 8000); }
        };
      } catch {}
    }
    function welcomeRef() {
      try {
        if (localStorage.getItem("SUV_REF_WELCOME") !== "1") return;
        localStorage.removeItem("SUV_REF_WELCOME");
        const d = refOf().days;
        toast(t("🎁 " + num(d) + " روز اشتراک Start هدیه گرفتی!", "🎁 You got " + d + " free day(s) of Start!"), 5000);
      } catch {}
    }
    function expiryReminder() {
      try {
        if (!isPlus()) return;
        const d = Math.ceil((state.expiresAt - Date.now()) / 864e5);
        const k = "SUV_REMIND_" + new Date().toISOString().slice(0, 10);
        if (d <= 2 && !localStorage.getItem(k)) { localStorage.setItem(k, "1"); toast(t("اشتراک " + planLabel() + " تا " + num(d) + " روز دیگه تموم می‌شه؛ از کادر Plus تمدید کن ✨", "Your " + planLabel() + " ends in " + d + " day(s); renew from the Plus box ✨"), 6000); }
      } catch {}
    }
    function boot() {
      try { localStorage.removeItem("SUV_REF"); } catch {} // لینک دعوت حذف شد؛ فقط «کد معرف» داریم
      renderBox(); renderPill(); renderInviteSettings(); renderBotLink(false); renderBotButtons();
      try { // لینک «خرید» از pricing.html → index.html?upgrade=1 : صفحه‌ی پلن‌ها رو باز کن
        if (new URLSearchParams(location.search).get("upgrade")) { history.replaceState(null, "", location.pathname); setTimeout(openPage, 700); }
      } catch {}
      const q = new URLSearchParams(location.search).get("plus");
      if (q) {
        history.replaceState(null, "", location.pathname);
        refreshStatus().then(() => {
          if (q === "success" && isPlus()) { toast(t("✨ " + planLabel() + " فعال شد؛ لذت ببر!", "✨ " + planLabel() + " is active — enjoy!"), 5000); renderBox(); }
          else if (q === "success" || q === "pending") {
            toast(t("پرداختت در حال تأییده؛ چند لحظه‌ی دیگه دوباره سر بزن.", "Your payment is being confirmed; check back in a moment."), 5000);
            // Worker خودش سفارش‌های باز رو با زرین‌پال تطبیق می‌ده (reconcile)؛ چند بار وضعیت رو دوباره می‌گیریم تا فعال‌شدن سریع نمایش داده بشه
            [12000, 40000, 90000].forEach((ms) => setTimeout(() => refreshStatus().then(() => { if (isPlus()) { renderBox(); renderPill(); } }), ms));
          }
          else toast(t("پرداخت کامل نشد؛ حسابت روی پلن رایگان موند.", "Payment wasn't completed; you're still on the free plan."), 5000);
        });
      } else refreshStatus().then(() => { welcomeRef(); expiryReminder(); });
      document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshStatus(); });
      setInterval(refreshStatus, 5 * 60e3);
      startPromo();
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  } catch (e) {
    console.error("SUVRENO_PLUS_INIT_FAILED", e); // اپ اصلی ادامه می‌ده
  }
})();
