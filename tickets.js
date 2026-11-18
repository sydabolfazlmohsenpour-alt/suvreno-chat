/* =====================================================================
   Suvreno — پشتیبانی و تیکت‌ها
   فایل مستقل (مثل council.js): اگر لود نشود یا خطا بدهد، بقیه‌ی اپ دست‌نخورده می‌ماند.
   - دکمه‌ی «پشتیبانی» در منوی کناری و تنظیمات (با نشانِ پاسخ‌های خوانده‌نشده)
   - ارسال تیکت جدید (نام، نام‌خانوادگی، ایمیل، مشکل، فایل اختیاری)
   - تیکت‌های من (در انتظار پاسخ / پاسخ داده‌شده) و دیدنِ پاسخ پشتیبانی
   ===================================================================== */
(function () {
  "use strict";
  try {
    var WORKER = "https://suvreno.sydabolfazlmohsenpour.workers.dev/";
    var MAX_FILE = 2 * 1024 * 1024;
    var FILE_RE = /\.(png|jpe?g|webp|gif|pdf|txt|log|csv|docx)$/i;
    var $ = function (id) { return document.getElementById(id); };
    var isEn = function () { try { return localStorage.getItem("AM_LANG_PREF") === "en"; } catch (e) { return false; } };
    var t = function (fa, en) { return isEn() ? en : fa; };
    var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
    var token = function () { try { return localStorage.getItem("SUVRENO_SESSION") || ""; } catch (e) { return ""; } };
    var fmtDate = function (ts) {
      try { return new Date(Number(ts)).toLocaleString(isEn() ? "en-US" : "fa-IR", { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return ""; }
    };
    var num = function (n) { try { return Number(n || 0).toLocaleString(isEn() ? "en-US" : "fa-IR"); } catch (e) { return String(n || 0); } };

    /* ---------- استایل ---------- */
    var css = "" +
      ".tk-ov{position:fixed;inset:0;z-index:10000;background:rgba(3,7,14,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:stretch;justify-content:center}" +
      ".tk-page{width:100%;max-width:640px;height:100%;display:flex;flex-direction:column;background:var(--sv-surface-solid,#0a1120);color:var(--text,#f4f7fb);box-shadow:0 0 60px rgba(0,0,0,.45)}" +
      "@media(min-width:700px){.tk-ov{padding:18px}.tk-page{height:100%;border-radius:22px;border:1px solid var(--border,rgba(255,255,255,.12));overflow:hidden}}" +
      ".tk-top{flex:none;display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border,rgba(255,255,255,.12))}" +
      ".tk-top h2{margin:0;font-size:18px;flex:1}" +
      ".tk-x,.tk-back{flex:none;background:var(--sv-glass,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.12));color:inherit;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center}" +
      ".tk-tabs{flex:none;display:flex;gap:8px;padding:10px 16px 0}" +
      ".tk-tab{flex:1;padding:10px 8px;border-radius:12px 12px 0 0;border:1px solid var(--border,rgba(255,255,255,.12));border-bottom:0;background:transparent;color:var(--muted,#8e9bb0);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;position:relative}" +
      ".tk-tab.on{background:linear-gradient(135deg,rgba(var(--ac1-rgb,45,226,200),.22),rgba(var(--ac2-rgb,255,200,87),.16));color:inherit;border-color:var(--sv-turq,#2de2c8)}" +
      ".tk-tab .tk-dot{margin-inline-start:6px}" +
      ".tk-body{flex:1;overflow:auto;padding:16px;-webkit-overflow-scrolling:touch;border-top:1px solid var(--border,rgba(255,255,255,.12))}" +
      ".tk-note{margin:0 0 14px;padding:11px 13px;border-radius:14px;background:rgba(var(--ac1-rgb,45,226,200),.09);border:1px solid rgba(var(--ac1-rgb,45,226,200),.35);font-size:13px;line-height:1.9}" +
      ".tk-warn{margin:0 0 14px;padding:10px 13px;border-radius:14px;background:rgba(var(--ac2-rgb,255,200,87),.08);border:1px solid rgba(var(--ac2-rgb,255,200,87),.35);font-size:12.5px;line-height:1.9;color:var(--sv-gold,#ffc857)}" +
      ".tk-row{display:flex;gap:10px}.tk-row>.tk-f{flex:1;min-width:0}" +
      ".tk-f{margin-bottom:12px}.tk-f label{display:block;margin:0 0 5px;font-size:12.5px;color:var(--muted,#8e9bb0)}" +
      ".tk-f input[type=text],.tk-f input[type=email],.tk-f textarea{width:100%;box-sizing:border-box;background:var(--sv-glass,rgba(255,255,255,.05));color:inherit;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:13px;padding:11px 13px;font:inherit;font-size:14px;line-height:1.8}" +
      ".tk-f input:focus,.tk-f textarea:focus{outline:none;border-color:var(--sv-turq,#2de2c8)}" +
      ".tk-f textarea{min-height:130px;resize:vertical}" +
      ".tk-f input[dir=ltr]{text-align:left}" +
      ".tk-cnt{margin-top:4px;font-size:11.5px;color:var(--muted,#8e9bb0);text-align:end}" +
      ".tk-file{display:flex;align-items:center;gap:8px;flex-wrap:wrap}" +
      ".tk-fbtn{padding:9px 13px;border-radius:12px;border:1px dashed var(--border,rgba(255,255,255,.3));background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer}" +
      ".tk-fname{font-size:12.5px;color:var(--sv-turq,#2de2c8);word-break:break-all}" +
      ".tk-frm{background:transparent;border:0;color:#ff8a7b;font-size:17px;cursor:pointer;padding:2px 6px}" +
      ".tk-acts{display:flex;gap:10px;margin-top:16px}" +
      ".tk-go,.tk-cancel,.tk-sec{padding:13px;border-radius:14px;font:inherit;font-weight:700;font-size:14.5px;cursor:pointer;border:0}" +
      ".tk-go{flex:2;background:linear-gradient(135deg,var(--ac1,#2de2c8),var(--ac2,#ffc857));color:var(--sv-on-accent,#04141a)}" +
      ".tk-cancel,.tk-sec{flex:1;background:var(--sv-glass,rgba(255,255,255,.07));color:inherit;border:1px solid var(--border,rgba(255,255,255,.18))}" +
      ".tk-go[disabled],.tk-cancel[disabled]{opacity:.55;cursor:default}" +
      ".tk-err{margin-top:10px;color:#ff8a7b;font-size:13px;line-height:1.8;min-height:1px}" +
      ".tk-ok{text-align:center;padding:26px 8px}.tk-ok .tk-big{font-size:46px;margin-bottom:6px}" +
      ".tk-ok h3{margin:6px 0 8px;font-size:18px}.tk-ok p{margin:0 0 6px;font-size:13.5px;line-height:1.9;color:var(--muted,#8e9bb0)}" +
      ".tk-code{display:inline-block;margin:8px 0 12px;padding:7px 16px;border-radius:12px;background:var(--sv-glass,rgba(255,255,255,.07));border:1px solid var(--border,rgba(255,255,255,.18));font-family:monospace;font-size:18px;font-weight:800;letter-spacing:2px;direction:ltr}" +
      ".tk-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}" +
      ".tk-chip{padding:7px 13px;border-radius:999px;border:1px solid var(--border,rgba(255,255,255,.12));background:var(--sv-glass,rgba(255,255,255,.05));color:inherit;font:inherit;font-size:12.5px;cursor:pointer}" +
      ".tk-chip.on{background:linear-gradient(135deg,rgba(var(--ac1-rgb,45,226,200),.28),rgba(var(--ac2-rgb,255,200,87),.22));border-color:var(--sv-turq,#2de2c8)}" +
      ".tk-item{display:block;width:100%;text-align:start;margin:0 0 10px;padding:13px;border-radius:16px;border:1px solid var(--border,rgba(255,255,255,.12));background:var(--sv-glass,rgba(255,255,255,.05));color:inherit;font:inherit;cursor:pointer;position:relative}" +
      ".tk-item.un{border-color:var(--sv-turq,#2de2c8);box-shadow:0 0 0 1px rgba(var(--ac1-rgb,45,226,200),.25)}" +
      ".tk-it{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px;color:var(--muted,#8e9bb0)}" +
      ".tk-it .tk-id{font-family:monospace;direction:ltr;margin-inline-start:auto}" +
      ".tk-pv{font-size:13.5px;line-height:1.8;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}" +
      ".tk-st{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11.5px;font-weight:700}" +
      ".tk-st.open{background:rgba(var(--ac2-rgb,255,200,87),.16);color:var(--sv-gold,#ffc857)}" +
      ".tk-st.answered{background:rgba(90,240,176,.15);color:#5af0b0}" +
      ".tk-st.closed{background:rgba(160,170,190,.18);color:#aab4c8}" +
      ".tk-dot{display:inline-block;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#ff5d6c;color:#fff;font-size:11px;font-weight:800;line-height:18px;text-align:center;box-sizing:border-box}" +
      ".tk-empty{text-align:center;padding:30px 10px;color:var(--muted,#8e9bb0);font-size:13.5px;line-height:2}" +
      ".tk-msg{margin:0 0 12px;padding:12px 14px;border-radius:16px;font-size:14px;line-height:1.95;white-space:pre-wrap;word-break:break-word}" +
      ".tk-msg.me{background:var(--sv-glass,rgba(255,255,255,.06));border:1px solid var(--border,rgba(255,255,255,.14))}" +
      ".tk-msg.sup{background:linear-gradient(135deg,rgba(var(--ac1-rgb,45,226,200),.14),rgba(var(--ac2-rgb,255,200,87),.1));border:1px solid var(--sv-turq,#2de2c8)}" +
      ".tk-who{display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:12px;font-weight:700;color:var(--sv-turq,#2de2c8)}" +
      ".tk-msg.me .tk-who{color:var(--muted,#8e9bb0)}.tk-who small{margin-inline-start:auto;font-weight:400;color:var(--muted,#8e9bb0)}" +
      ".tk-wait{margin:6px 0 12px;padding:11px 13px;border-radius:14px;border:1px dashed var(--border,rgba(255,255,255,.25));font-size:13px;line-height:1.9;color:var(--muted,#8e9bb0)}" +
      ".tk-side-btn{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;margin:0 0 8px;padding:11px 14px;border-radius:14px;border:1px solid var(--border,rgba(255,255,255,.14));background:var(--sv-glass,rgba(255,255,255,.05));color:inherit;font:inherit;font-size:14px;cursor:pointer}" +
      ".tk-side-btn .tk-dot{margin-inline-start:auto}" +
      ".tk-toast{position:fixed;z-index:10001;left:50%;bottom:90px;transform:translateX(-50%);max-width:92vw;padding:12px 16px;border-radius:16px;background:var(--sv-surface-solid,#0a1120);color:var(--text,#f4f7fb);border:1px solid var(--sv-turq,#2de2c8);box-shadow:0 10px 40px rgba(0,0,0,.5);font-size:13.5px;cursor:pointer;animation:tkIn .35s ease both}" +
      "@keyframes tkIn{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}";
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

    /* ---------- حالت ---------- */
    var STATUS = { open: ["در انتظار پاسخ", "Waiting for reply"], answered: ["پاسخ داده شد", "Answered"], closed: ["بسته شد", "Closed"] };
    var S = { tab: "new", draft: { fn: "", ln: "", em: "", msg: "", file: null }, tickets: null, filter: "all", detailId: "", done: null, busy: false, unread: 0, prefilled: false };

    /* ---------- ارتباط با Worker ---------- */
    async function api(mode, extra, timeoutMs) {
      var body = Object.assign({ mode: mode, sessionToken: token() }, extra || {});
      var ctl = new AbortController(); var to = setTimeout(function () { ctl.abort(); }, timeoutMs || 30000);
      try {
        var res = await fetch(WORKER, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
        var data = await res.json();
        return data || { ok: false };
      } catch (e) {
        return { ok: false, error: "NETWORK", message: t("اتصال برقرار نشد؛ اینترنتت رو چک کن و دوباره امتحان کن.", "Connection failed; check your internet and try again.") };
      } finally { clearTimeout(to); }
    }

    /* ---------- نشانِ پاسخ‌های خوانده‌نشده ---------- */
    function paintBadge() {
      var els = document.querySelectorAll(".tk-bdg");
      for (var i = 0; i < els.length; i++) {
        els[i].textContent = S.unread > 0 ? num(S.unread) : "";
        els[i].style.display = S.unread > 0 ? "inline-block" : "none";
      }
    }
    async function refreshBadge(silent) {
      if (!token()) { S.unread = 0; paintBadge(); return; }
      var d = await api("ticket-badge", {}, 15000);
      if (!d || !d.ok) return;
      var prev = S.unread; S.unread = Number(d.unread) || 0; paintBadge();
      if (!silent && S.unread > prev && !$("tkOv")) toast(t("پشتیبانی به تیکتت پاسخ داد 💬", "Support replied to your ticket 💬"), function () { openPage("list"); });
    }
    function toast(msg, onClick) {
      var old = $("tkToast"); if (old) old.remove();
      var d = document.createElement("div"); d.className = "tk-toast"; d.id = "tkToast"; d.textContent = msg;
      d.addEventListener("click", function () { d.remove(); if (onClick) onClick(); });
      document.body.appendChild(d); setTimeout(function () { if (d.parentNode) d.remove(); }, 9000);
    }

    /* ---------- صفحه ---------- */
    function openPage(tab) {
      if ($("tkOv")) { setTab(tab || S.tab); return; }
      var ov = document.createElement("div"); ov.className = "tk-ov"; ov.id = "tkOv";
      ov.innerHTML =
        '<div class="tk-page" role="dialog" aria-modal="true">' +
        '<div class="tk-top"><button class="tk-back" id="tkBack" type="button" style="display:none" aria-label="back">' + (isEn() ? "←" : "→") + '</button><h2>🎫 ' + esc(t("پشتیبانی Suvreno", "Suvreno Support")) + '</h2><button class="tk-x" id="tkClose" type="button" aria-label="close">×</button></div>' +
        '<div class="tk-tabs" id="tkTabs">' +
        '<button class="tk-tab" id="tkTabNew" type="button">✏️ ' + esc(t("ارسال تیکت جدید", "New ticket")) + '</button>' +
        '<button class="tk-tab" id="tkTabList" type="button">📨 ' + esc(t("تیکت‌های من", "My tickets")) + '<span class="tk-dot tk-bdg" style="display:none"></span></button>' +
        '</div><div class="tk-body" id="tkBody"></div></div>';
      document.body.appendChild(ov);
      ov.addEventListener("click", function (e) { if (e.target === ov) closePage(); });
      $("tkClose").addEventListener("click", closePage);
      $("tkBack").addEventListener("click", function () { setTab("list"); });
      $("tkTabNew").addEventListener("click", function () { setTab("new"); });
      $("tkTabList").addEventListener("click", function () { setTab("list"); });
      document.addEventListener("keydown", onKey);
      paintBadge();
      setTab(tab || "new");
    }
    function onKey(e) { if (e.key === "Escape" && $("tkOv")) closePage(); }
    function closePage() { saveDraft(); var o = $("tkOv"); if (o) o.remove(); document.removeEventListener("keydown", onKey); refreshBadge(true); }

    function setTab(tab) {
      S.tab = tab;
      var tabs = $("tkTabs"), back = $("tkBack"); if (!$("tkBody")) return;
      if (tab === "detail") { tabs.style.display = "none"; back.style.display = "flex"; }
      else { tabs.style.display = "flex"; back.style.display = "none"; }
      $("tkTabNew").classList.toggle("on", tab === "new");
      $("tkTabList").classList.toggle("on", tab === "list");
      if (!token()) { renderLogin(); return; }
      if (tab === "new") renderNew();
      else if (tab === "list") renderList();
      else if (tab === "detail") renderDetail(S.detailId);
    }

    function renderLogin() {
      $("tkBody").innerHTML = '<div class="tk-empty"><div style="font-size:42px">🔐</div>' + esc(t("برای ارسال تیکت و دیدنِ پاسخ‌ها اول وارد Suvreno شو تا تیکت‌هات به حساب خودت وصل بشه.", "Please sign in first so your tickets are linked to your account.")) + '<div class="tk-acts"><button class="tk-go" id="tkLogin" type="button">' + esc(t("ورود / ثبت‌نام", "Sign in / Sign up")) + '</button></div></div>';
      $("tkLogin").addEventListener("click", function () {
        closePage();
        var b = $("sidebarLoginBtn");
        if (b) b.click(); else location.href = "login.html";
      });
    }

    /* ---------- فرم تیکت جدید ---------- */
    function saveDraft() {
      if (!$("tkFn")) return;
      S.draft.fn = $("tkFn").value; S.draft.ln = $("tkLn").value; S.draft.em = $("tkEm").value; S.draft.msg = $("tkMsg").value;
    }
    async function prefill() {
      if (S.prefilled || !token()) return; S.prefilled = true;
      var d = await api("me", {}, 12000);
      if (d && d.ok && d.user) {
        if (!S.draft.em && d.user.email) S.draft.em = d.user.email;
        var nm = String(d.user.name || "").trim();
        if (nm && !/^کاربر\s*Suvreno$/i.test(nm) && !S.draft.fn && !S.draft.ln) {
          var parts = nm.split(/\s+/); S.draft.fn = parts[0] || ""; S.draft.ln = parts.slice(1).join(" ");
        }
        if ($("tkFn") && S.tab === "new" && !S.done) { if (!$("tkEm").value) $("tkEm").value = S.draft.em; if (!$("tkFn").value) $("tkFn").value = S.draft.fn; if (!$("tkLn").value) $("tkLn").value = S.draft.ln; }
      }
    }
    function renderNew() {
      if (S.done) { renderDone(); return; }
      var d = S.draft;
      $("tkBody").innerHTML =
        '<div class="tk-note">' + esc(t("مشکل یا سؤالت رو بنویس؛ معمولاً ظرف چند ساعت جواب می‌دیم و پاسخ رو همین‌جا در «تیکت‌های من» می‌بینی.", "Describe your problem or question; we usually reply within a few hours and you'll see the answer here under “My tickets”.")) + '</div>' +
        '<div class="tk-row"><div class="tk-f"><label for="tkFn">' + esc(t("نام", "First name")) + '</label><input type="text" id="tkFn" maxlength="60" autocomplete="given-name"></div>' +
        '<div class="tk-f"><label for="tkLn">' + esc(t("نام خانوادگی", "Last name")) + '</label><input type="text" id="tkLn" maxlength="60" autocomplete="family-name"></div></div>' +
        '<div class="tk-f"><label for="tkEm">' + esc(t("ایمیل (پاسخ هم به همین ایمیل خبر داده می‌شه)", "Email (we'll also notify you here)")) + '</label><input type="email" id="tkEm" dir="ltr" maxlength="200" autocomplete="email" inputmode="email"></div>' +
        '<div class="tk-f"><label for="tkMsg">' + esc(t("مشکلت چیه؟", "What's the problem?")) + '</label><textarea id="tkMsg" maxlength="4000" placeholder="' + esc(t("هرچی دقیق‌تر بنویسی، سریع‌تر و بهتر کمکت می‌کنیم…", "The more detail, the faster we can help…")) + '"></textarea><div class="tk-cnt" id="tkCnt"></div></div>' +
        '<div class="tk-f"><label>' + esc(t("فایل یا عکس (اختیاری، تا ۲ مگابایت)", "File or screenshot (optional, up to 2 MB)")) + '</label><div class="tk-file"><button class="tk-fbtn" id="tkPick" type="button">📎 ' + esc(t("انتخاب فایل", "Choose file")) + '</button><span class="tk-fname" id="tkFname"></span><button class="tk-frm" id="tkFrm" type="button" style="display:none" aria-label="remove">✕</button></div>' +
        '<input type="file" id="tkFile" accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.log,.csv,.docx,image/*" style="display:none"></div>' +
        '<div class="tk-warn">🔒 ' + esc(t("رمز عبور، شماره کارت یا اطلاعات محرمانه‌ی دیگه رو توی تیکت ننویس؛ لازم نیست.", "Please don't write passwords, card numbers or other secrets in the ticket; we don't need them.")) + '</div>' +
        '<div class="tk-acts"><button class="tk-cancel" id="tkCancel" type="button">' + esc(t("انصراف", "Cancel")) + '</button><button class="tk-go" id="tkSend" type="button">' + esc(t("ارسال تیکت", "Send ticket")) + '</button></div>' +
        '<div class="tk-err" id="tkErr"></div>';
      $("tkFn").value = d.fn; $("tkLn").value = d.ln; $("tkEm").value = d.em; $("tkMsg").value = d.msg;
      paintFile(); countMsg();
      $("tkMsg").addEventListener("input", function () { countMsg(); });
      $("tkPick").addEventListener("click", function () { $("tkFile").click(); });
      $("tkFile").addEventListener("change", onFile);
      $("tkFrm").addEventListener("click", function () { S.draft.file = null; $("tkFile").value = ""; paintFile(); });
      $("tkCancel").addEventListener("click", function () {
        saveDraft();
        var dirty = (S.draft.msg.trim() || S.draft.file);
        if (dirty && !confirm(t("متن و فایلی که نوشتی پاک بشه؟", "Discard what you've written?"))) return;
        S.draft = { fn: S.draft.fn, ln: S.draft.ln, em: S.draft.em, msg: "", file: null }; closePage();
      });
      $("tkSend").addEventListener("click", send);
      prefill();
    }
    function countMsg() { var m = $("tkMsg"), c = $("tkCnt"); if (m && c) c.textContent = num(m.value.length) + " / " + num(4000); }
    function paintFile() {
      var f = S.draft.file; if (!$("tkFname")) return;
      $("tkFname").textContent = f ? f.name + " (" + (f.size < 1024 * 100 ? Math.max(1, Math.round(f.size / 1024)) + " KB" : (f.size / 1048576).toFixed(1) + " MB") + ")" : "";
      $("tkFrm").style.display = f ? "inline-block" : "none";
    }
    function onFile() {
      var inp = $("tkFile"), f = inp && inp.files && inp.files[0], err = $("tkErr"); if (!f) return;
      err.textContent = "";
      if (!FILE_RE.test(f.name)) { err.textContent = t("فرمت فایل پشتیبانی نمی‌شود؛ عکس، PDF یا فایل متنی بفرست.", "Unsupported file type; send an image, PDF or text file."); inp.value = ""; return; }
      if (f.size > MAX_FILE) { err.textContent = t("حجم فایل بیشتر از ۲ مگابایت است.", "The file is larger than 2 MB."); inp.value = ""; return; }
      S.draft.file = f; paintFile();
    }
    function readFile(f) {
      return new Promise(function (ok, fail) {
        var r = new FileReader(); r.onload = function () { ok(String(r.result || "")); }; r.onerror = function () { fail(new Error("READ")); }; r.readAsDataURL(f);
      });
    }
    async function send() {
      if (S.busy) return;
      saveDraft();
      var d = S.draft, err = $("tkErr"), btn = $("tkSend");
      var fn = d.fn.trim(), ln = d.ln.trim(), em = d.em.trim(), msg = d.msg.trim();
      if (!fn || !ln) { err.textContent = t("نام و نام خانوادگی رو وارد کن.", "Enter your first and last name."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { err.textContent = t("ایمیل معتبر نیست.", "The email address isn't valid."); return; }
      if (msg.length < 10) { err.textContent = t("مشکلت رو کمی کامل‌تر بنویس (حداقل ۱۰ حرف).", "Please describe it in a bit more detail (at least 10 characters)."); return; }
      S.busy = true; err.textContent = ""; btn.disabled = true; btn.textContent = t("در حال ارسال…", "Sending…");
      var payload = { firstName: fn, lastName: ln, email: em, message: msg };
      try {
        if (d.file) payload.file = { name: d.file.name, type: d.file.type || "application/octet-stream", data: await readFile(d.file) };
      } catch (e) { S.busy = false; btn.disabled = false; btn.textContent = t("ارسال تیکت", "Send ticket"); err.textContent = t("خواندنِ فایل انجام نشد؛ دوباره انتخابش کن.", "Couldn't read the file; choose it again."); return; }
      var res = await api("ticket-create", payload, 90000);
      S.busy = false;
      if (!res || !res.ok) {
        if (res && res.error === "NOT_AUTHENTICATED") { renderLogin(); return; }
        if ($("tkSend")) { $("tkSend").disabled = false; $("tkSend").textContent = t("ارسال تیکت", "Send ticket"); }
        if ($("tkErr")) $("tkErr").textContent = (res && res.message) || t("ارسال انجام نشد؛ دوباره امتحان کن.", "Sending failed; please try again.");
        return;
      }
      S.draft = { fn: fn, ln: ln, em: em, msg: "", file: null };
      S.done = { id: res.id }; S.tickets = null;
      renderDone();
    }
    function renderDone() {
      $("tkBody").innerHTML = '<div class="tk-ok"><div class="tk-big">✅</div><h3>' + esc(t("تیکتت ثبت شد", "Your ticket was sent")) + '</h3>' +
        '<div class="tk-code">' + esc(S.done.id) + '</div>' +
        '<p>' + esc(t("معمولاً ظرف چند ساعت جواب می‌دیم.", "We usually reply within a few hours.")) + '</p>' +
        '<p>' + esc(t("پاسخ پشتیبانی همین‌جا در «تیکت‌های من» نشون داده می‌شه و به ایمیلت هم خبر می‌دیم.", "The reply will appear here under “My tickets” and we'll email you too.")) + '</p>' +
        '<div class="tk-acts"><button class="tk-sec" id="tkAnother" type="button">' + esc(t("تیکت جدید", "New ticket")) + '</button><button class="tk-go" id="tkToList" type="button">' + esc(t("تیکت‌های من", "My tickets")) + '</button></div></div>';
      $("tkAnother").addEventListener("click", function () { S.done = null; renderNew(); });
      $("tkToList").addEventListener("click", function () { S.done = null; setTab("list"); });
    }

    /* ---------- لیست تیکت‌ها ---------- */
    async function renderList() {
      S.done = null;
      var body = $("tkBody"); body.innerHTML = '<div class="tk-empty">' + esc(t("در حال بارگذاری…", "Loading…")) + '</div>';
      var res = await api("ticket-list", {}, 25000);
      if (!$("tkBody") || S.tab !== "list") return;
      if (!res || !res.ok) {
        if (res && res.error === "NOT_AUTHENTICATED") { renderLogin(); return; }
        body.innerHTML = '<div class="tk-empty">' + esc((res && res.message) || t("دریافت تیکت‌ها انجام نشد.", "Couldn't load tickets.")) + '<div class="tk-acts"><button class="tk-sec" id="tkRetry" type="button">' + esc(t("تلاش دوباره", "Retry")) + '</button></div></div>';
        $("tkRetry").addEventListener("click", renderList); return;
      }
      S.tickets = Array.isArray(res.tickets) ? res.tickets : [];
      S.unread = S.tickets.filter(function (x) { return x.unread; }).length; paintBadge();
      drawList();
    }
    function drawList() {
      var body = $("tkBody"); if (!body || S.tab !== "list") return;
      var all = S.tickets || [];
      if (!all.length) {
        body.innerHTML = '<div class="tk-empty"><div style="font-size:42px">📭</div>' + esc(t("هنوز تیکتی نفرستادی.", "You haven't sent any tickets yet.")) + '<div class="tk-acts"><button class="tk-go" id="tkFirst" type="button">' + esc(t("ارسال تیکت جدید", "Send a new ticket")) + '</button></div></div>';
        $("tkFirst").addEventListener("click", function () { setTab("new"); }); return;
      }
      var list = all.filter(function (x) { return S.filter === "all" ? true : S.filter === "answered" ? (x.status === "answered" || x.status === "closed") : x.status === "open"; });
      var h = '<div class="tk-chips">' +
        [["all", t("همه", "All")], ["answered", t("پاسخ داده‌شده", "Answered")], ["open", t("در انتظار پاسخ", "Waiting")]].map(function (c) {
          return '<button class="tk-chip' + (S.filter === c[0] ? " on" : "") + '" data-f="' + c[0] + '" type="button">' + esc(c[1]) + '</button>';
        }).join("") + '</div>';
      if (!list.length) h += '<div class="tk-empty">' + esc(t("چیزی در این دسته نیست.", "Nothing in this category.")) + '</div>';
      list.forEach(function (x) {
        var stt = STATUS[x.status] ? x.status : "open";
        h += '<button class="tk-item' + (x.unread ? " un" : "") + '" data-id="' + esc(x.id) + '" type="button">' +
          '<div class="tk-it"><span class="tk-st ' + stt + '">' + esc(t(STATUS[stt][0], STATUS[stt][1])) + '</span>' +
          (x.unread ? '<span class="tk-dot">' + esc(t("جدید", "New")) + '</span>' : "") +
          (x.hasFile ? '<span>📎</span>' : "") + '<span>' + esc(fmtDate(x.updatedAt || x.createdAt)) + '</span><span class="tk-id">' + esc(x.id) + '</span></div>' +
          '<div class="tk-pv">' + esc(x.preview) + '</div></button>';
      });
      body.innerHTML = h;
      body.querySelectorAll(".tk-chip").forEach(function (b) { b.addEventListener("click", function () { S.filter = b.getAttribute("data-f"); drawList(); }); });
      body.querySelectorAll(".tk-item").forEach(function (b) { b.addEventListener("click", function () { S.detailId = b.getAttribute("data-id"); setTab("detail"); }); });
    }

    /* ---------- جزئیات تیکت و پاسخ پشتیبانی ---------- */
    async function renderDetail(id) {
      var body = $("tkBody"); body.innerHTML = '<div class="tk-empty">' + esc(t("در حال بارگذاری…", "Loading…")) + '</div>';
      var res = await api("ticket-get", { id: id }, 25000);
      if (!$("tkBody") || S.tab !== "detail") return;
      if (!res || !res.ok) {
        body.innerHTML = '<div class="tk-empty">' + esc((res && res.message) || t("دریافت تیکت انجام نشد.", "Couldn't load the ticket.")) + '</div>'; return;
      }
      var k = res.ticket, rp = res.replies || [], stt = STATUS[k.status] ? k.status : "open";
      var h = '<div class="tk-it" style="margin-bottom:12px"><span class="tk-st ' + stt + '">' + esc(t(STATUS[stt][0], STATUS[stt][1])) + '</span><span>' + esc(fmtDate(k.createdAt)) + '</span><span class="tk-id">' + esc(k.id) + '</span></div>' +
        '<div class="tk-msg me"><div class="tk-who">' + esc(t("تو", "You")) + ' — ' + esc((k.firstName || "") + " " + (k.lastName || "")) + '<small>' + esc(fmtDate(k.createdAt)) + '</small></div>' + esc(k.message) +
        (k.fileName ? '<div style="margin-top:8px;font-size:12.5px;color:var(--sv-turq,#2de2c8)">📎 ' + esc(k.fileName) + '</div>' : "") + '</div>';
      if (!rp.length) h += '<div class="tk-wait">⏳ ' + esc(t("هنوز پاسخی نیومده؛ معمولاً ظرف چند ساعت جواب می‌دیم. همین‌جا بهت خبر می‌دیم.", "No reply yet; we usually answer within a few hours.")) + '</div>';
      rp.forEach(function (y) {
        h += '<div class="tk-msg sup"><div class="tk-who">🛟 ' + esc(t("پشتیبانی Suvreno", "Suvreno Support")) + '<small>' + esc(fmtDate(y.createdAt)) + '</small></div>' + esc(y.message) + '</div>';
      });
      if (k.status === "closed") h += '<div class="tk-wait">' + esc(t("این تیکت بسته شده. اگه مشکلت ادامه داشت، یه تیکت جدید بفرست.", "This ticket is closed. If the problem continues, send a new ticket.")) + '</div>';
      h += '<div class="tk-acts"><button class="tk-sec" id="tkBackList" type="button">' + esc(t("بازگشت به تیکت‌ها", "Back to tickets")) + '</button><button class="tk-go" id="tkNewFromDetail" type="button">' + esc(t("ارسال تیکت جدید", "New ticket")) + '</button></div>';
      body.innerHTML = h;
      $("tkBackList").addEventListener("click", function () { setTab("list"); });
      $("tkNewFromDetail").addEventListener("click", function () { setTab("new"); });
      S.tickets = null; refreshBadge(true);
    }

    /* ---------- دکمه‌ها در منوی کناری و تنظیمات ---------- */
    function addButtons() {
      var caps = $("settingsCapsBtn");
      if (caps && !$("tkSetBtn")) {
        var sec = caps.closest(".settings-section");
        if (sec && sec.parentNode) {
          var n = document.createElement("div"); n.className = "settings-section"; n.id = "tkSetSec";
          n.innerHTML = '<div class="id-box-label">' + esc(t("پشتیبانی", "Support")) + '</div><button class="clear-memory" id="tkSetBtn" type="button">🎫 ' + esc(t("ارسال تیکت و پیگیری پاسخ‌ها", "Send a ticket & track replies")) + ' <span class="tk-dot tk-bdg" style="display:none"></span></button>';
          sec.parentNode.insertBefore(n, sec.nextSibling);
          $("tkSetBtn").addEventListener("click", function () {
            var c = $("closeSettingsModal"); if (c) c.click();
            setTimeout(function () { openPage("new"); }, 60);
          });
        }
      }
      paintBadge();
    }

    function boot() {
      try {
        addButtons(); setTimeout(addButtons, 1500); setTimeout(addButtons, 4000);
        setTimeout(function () { refreshBadge(true); }, 2500);
        /* لینک مستقیم از سایت معرفی: https://chat.suvreno.ir/?support=1 → صفحه‌ی تیکت باز می‌شود */
        try { if (/[?&#]support(=1|=true)?(&|$)/.test(location.search + location.hash)) setTimeout(function () { openPage("new"); }, 1200); } catch (e) {}
        setInterval(function () { if (!document.hidden) refreshBadge(false); }, 90000);
        document.addEventListener("visibilitychange", function () { if (!document.hidden) refreshBadge(false); });
      } catch (e) { console.error("TICKETS_BOOT", e); }
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
    window.SuvTickets = { open: openPage };
  } catch (e) { try { console.error("TICKETS_INIT", e); } catch (x) {} }
})();
