"use strict";

/* =========================================
   Suvreno LOGIN PAGE
   این فایل کاملاً مستقل از script.js اجراست (صفحه‌ی جدایی‌ه)،
   ولی از همون WORKER_URL و همون کلید localStorage برای توکن ورود
   (SUVRENO_SESSION) استفاده می‌کنه تا index.html بلافاصله بعد از
   ریدایرکت، کاربر رو واردشده تشخیص بده.
========================================= */

const WORKER_URL = "https://suvreno.sydabolfazlmohsenpour.workers.dev/";
const SESSION_KEY = "SUVRENO_SESSION";
const PLUS_URL = "https://suvreno-plus.sydabolfazlmohsenpour.workers.dev/";

const $ = id => document.getElementById(id);

/* fetch با زمان‌سنج: اگر سرور فیلتر/کند باشد، دکمه‌ها برای همیشه بی‌پاسخ نمی‌مانند */
function fetchT(url, opts, ms) {
  const ac = new AbortController();
  const tm = setTimeout(() => ac.abort(), ms || 20000);
  return fetch(url, { ...(opts || {}), signal: ac.signal }).finally(() => clearTimeout(tm));
}

/* =========================================
   LOGO DATA
   دقیقاً همون الگوی index.html/script.js: لوگوی واقعی از
   logo-data.js میاد (که حالا توی login.html هم لود می‌شه).
   قبلاً این صفحه اصلاً logo-data.js رو لود نمی‌کرد و همیشه
   یه SVG جایگزینِ ساده (نه لوگوی واقعی) نشون می‌داد. اگه اون
   فایل به هر دلیلی لود نشه، همون placeholder امنی که خودِ
   HTML داره باقی می‌مونه — هیچ‌وقت آیکن شکسته دیده نمی‌شه.
========================================= */
const AM_LOGO_DATA = (typeof window !== "undefined" && window.AM_LOGO_DATA) ? window.AM_LOGO_DATA : "";

function applyLogoImages() {
  if (!AM_LOGO_DATA) return; // placeholder already in the HTML stays as-is
  document.querySelectorAll(".am-logo-img").forEach(img => {
    if (img.src !== AM_LOGO_DATA) img.src = AM_LOGO_DATA;
  });
  const favIcon = $("favIcon");
  if (favIcon) favIcon.href = AM_LOGO_DATA;
}
applyLogoImages();

function setSessionToken(token) {
  try { localStorage.setItem(SESSION_KEY, token); } catch {}
}

/* =========================================
   «ورود با Suvreno» — فهرستِ حساب‌های قبلیِ همین دستگاه
   فقط {email, method, last} در localStorage نگه داشته می‌شود؛
   هرگز توکنِ نشست، کد یا رمز ذخیره نمی‌شود. روشِ ورود: google | github | email
========================================= */
const ACC_KEY = "SUV_ACCOUNTS";
const ACC_METHOD_KEY = "SUV_LOGIN_M";
const ACC_METHODS = /^(google|github|email)$/;

function amNormEmail(v) {
  const e = String(v || "").replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\s]/g, "").toLowerCase();
  return e.length <= 254 && /^[^@]+@[^@]+\.[^@]+$/.test(e) ? e : "";
}
function amAccLoad() {
  try {
    const a = JSON.parse(localStorage.getItem(ACC_KEY) || "[]");
    if (!Array.isArray(a)) return [];
    return a
      .filter(x => x && typeof x.email === "string" && ACC_METHODS.test(String(x.method)))
      .map(x => ({ email: x.email, method: x.method, last: Number(x.last) || 0 }))
      .sort((p, q) => q.last - p.last);
  } catch { return []; }
}
function amAccSave(list) {
  try { localStorage.setItem(ACC_KEY, JSON.stringify(list.slice(0, 8))); } catch {}
}
function amAccAdd(email, method) {
  const list = amAccLoad().filter(x => x.email !== email);
  list.unshift({ email, method, last: Date.now() });
  amAccSave(list);
}
function amAccRemove(email) {
  amAccSave(amAccLoad().filter(x => x.email !== email));
}

/* روشِ ورودی که کاربر همین الان زده (برای ورودهایی که با ریدایرکت برمی‌گردند و فقط session دارند) */
function _markMethod(m) {
  try { localStorage.setItem(ACC_METHOD_KEY, JSON.stringify({ m, t: Date.now() })); } catch {}
}
function _takeMethod(def) {
  let m = "";
  try {
    const o = JSON.parse(localStorage.getItem(ACC_METHOD_KEY) || "null");
    if (o && ACC_METHODS.test(String(o.m)) && Date.now() - Number(o.t) < 20 * 60 * 1000) m = o.m;
    localStorage.removeItem(ACC_METHOD_KEY);
  } catch {}
  return m || def || "";
}

/* ایمیلِ داخلِ idToken گوگل (فقط برای نمایش؛ اعتبارسنجیِ واقعی سمتِ سرور است) */
function _jwtEmail(tok) {
  try {
    let p = String(tok).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    p += "=".repeat((4 - p.length % 4) % 4);
    const j = JSON.parse(decodeURIComponent(escape(atob(p))));
    return j && j.email_verified === false ? "" : amNormEmail(j && j.email);
  } catch { return ""; }
}

/* ثبتِ حساب بعد از ورودِ موفق؛ اگر ایمیل در دست نبود از mode:"me" می‌گیرد. هر خطا بی‌صدا نادیده گرفته می‌شود. */
async function amAccRecord(method, emailHint) {
  try {
    if (!ACC_METHODS.test(String(method || ""))) return;
    let email = amNormEmail(emailHint);
    if (!email) {
      let tk = "";
      try { tk = localStorage.getItem(SESSION_KEY) || ""; } catch {}
      if (!tk) return;
      const res = await fetchT(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "me", sessionToken: tk })
      }, 6000);
      const d = await res.json().catch(() => null);
      email = amNormEmail(d && ((d.user && d.user.email) || d.email || (d.profile && d.profile.email) || (d.data && d.data.email)));
    }
    if (email) amAccAdd(email, method);
    return email || "";
  } catch { return ""; }
}

/* ذخیره‌ی نشستِ این حساب به‌صورت رمزنگاری‌شده داخلِ خودِ گوشی (فقط اپ اندروید ۲.۲.۰+).
   اگر Worker حالتِ device-session را داشته باشد یک نشستِ مستقل می‌گیریم تا «خروج از حساب» در اپ، ورودِ سریعِ این حساب را خراب نکند؛
   وگرنه همان نشستِ فعلی ذخیره می‌شود. هر خطا بی‌صدا نادیده گرفته می‌شود. */
async function amDeviceSave(email) {
  try {
    const N = window.SuvrenoNative;
    if (!email || !(N && typeof N.saveAccount === "function")) return;
    let tk = "";
    try { tk = localStorage.getItem(SESSION_KEY) || ""; } catch {}
    if (!tk) return;
    let save = tk;
    try {
      const res = await fetchT(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "device-session", sessionToken: tk })
      }, 5000);
      const d = await res.json().catch(() => null);
      if (d && d.ok && typeof d.sessionToken === "string" && d.sessionToken.length >= 16) save = d.sessionToken;
    } catch {}
    N.saveAccount(email, save);
  } catch {}
}

/* ---- حساب مسدود: پیام + دکمه‌ی «دیدن دلیل مسدودیت» (پنجره‌ی خودکفا، بدون وابستگی به CSS صفحه) ---- */
function amRmBlockBtn() { const b = document.getElementById("amBlkBtn"); if (b) b.remove(); }
function amBlockModal(reason) {
  const old = document.getElementById("amBlkModal"); if (old) old.remove();
  const ov = document.createElement("div");
  ov.id = "amBlkModal";
  ov.setAttribute("style", "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.65)");
  const box = document.createElement("div");
  box.setAttribute("dir", "rtl");
  box.setAttribute("style", "max-width:420px;width:100%;background:#0f1a30;color:#fff;border:1px solid var(--ac1,#2de2c8);border-radius:18px;padding:22px;line-height:2;font-family:inherit");
  const t = document.createElement("b"); t.textContent = "دلیل مسدودیت";
  const p = document.createElement("p"); p.setAttribute("style", "margin:10px 0 16px;white-space:pre-wrap");
  p.textContent = String(reason || "").trim() || "دلیلی ثبت نشده است. برای اطلاعات بیشتر به suvreno.ir@gmail.com ایمیل بزن.";
  const c = document.createElement("button"); c.type = "button"; c.textContent = "بستن";
  c.setAttribute("style", "padding:10px 22px;border:0;border-radius:12px;background:var(--ac1,#2de2c8);color:#04211d;font-weight:700;cursor:pointer;font:inherit");
  c.addEventListener("click", () => ov.remove());
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
  box.append(t, p, c); ov.appendChild(box); document.body.appendChild(ov);
}
function amShowBlocked(data, errEl) {
  if (!errEl) return;
  amRmBlockBtn();
  errEl.textContent = data?.message || "حساب تو مسدود شده و فعلاً نمی‌تونی وارد بشی.";
  errEl.classList.add("show");
  const b = document.createElement("button");
  b.type = "button"; b.id = "amBlkBtn"; b.textContent = "دیدن دلیل مسدودیت";
  b.setAttribute("style", "display:block;margin:10px auto 0;padding:10px 20px;border:0;border-radius:12px;background:var(--ac1,#2de2c8);color:#04211d;font-weight:700;cursor:pointer;font:inherit");
  b.addEventListener("click", () => amBlockModal(data?.reason));
  errEl.insertAdjacentElement("afterend", b);
}

function showError(msg) {
  amRmBlockBtn();
  const el = $("authError");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
}

function clearError() {
  amRmBlockBtn();
  const el = $("authError");
  if (el) { el.textContent = ""; el.classList.remove("show"); }
}

function goToApp() {
  location.href = "index.html";
}

/* =========================================
   کد معرف (اختیاری)
   بعد از ورود موفق (کد ایمیل / گوگل)، اگه حساب تازه‌ساز باشه و هنوز کد معرف وارد نکرده/رد نکرده،
   قبل از رفتن به چت یه مودال «کد معرف» نشون می‌دیم. هر خطا/کندیِ سرور → مستقیم وارد چت می‌شه.
========================================= */
async function plusPost(payload, timeout = 8000) {
  const ac = new AbortController();
  const tm = setTimeout(() => ac.abort(), timeout);
  try {
    let tk = "";
    try { tk = localStorage.getItem(SESSION_KEY) || ""; } catch {}
    const res = await fetch(PLUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, sessionToken: tk }),
      signal: ac.signal
    });
    return await res.json();
  } finally { clearTimeout(tm); }
}

async function afterLogin(method, email) {
  /* ثبتِ حساب در فهرستِ «ورود با Suvreno» هم‌زمان با بررسیِ کد معرف؛ حداکثر ۲.۵ ثانیه صبر می‌کنیم */
  const rec = amAccRecord(method, email).then(em => amDeviceSave(em));
  let eligible = false;
  try {
    const r = await plusPost({ mode: "plus-ref-check" }, 5000);
    eligible = !!(r && r.ok === true && r.eligible === true);
  } catch {}
  await Promise.race([rec, new Promise(r => setTimeout(r, 5000))]);
  if (eligible) { openRefOverlay(); return; }
  goToApp();
}

function normRefInput(v) {
  return String(v || "")
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/[^0-9A-Za-z]/g, "")
    .toLowerCase();
}

function refShow(which) {
  const a = $("refInputCard"), b = $("refWrongCard");
  if (a) a.style.display = which === "input" ? "" : "none";
  if (b) b.style.display = which === "wrong" ? "" : "none";
}

function refError(msg) {
  const el = $("refError");
  if (!el) return;
  el.textContent = msg || "";
  el.classList.toggle("show", !!msg);
}

function openRefOverlay() {
  const ov = $("refOverlay");
  if (!ov) { goToApp(); return; }
  refError("");
  refShow("input");
  ov.classList.add("show");
  setTimeout(() => { try { $("refCodeInput")?.focus(); } catch {} }, 80);
}

async function refSkip() {
  try { await plusPost({ mode: "plus-ref-skip" }, 3000); } catch {}
  goToApp();
}

async function refSubmit() {
  refError("");
  const code = normRefInput($("refCodeInput")?.value);
  if (code.length !== 8) { refError("کد معرف ۸ کاراکتره؛ دوباره چک کن."); return; }
  const btn = $("refSubmitBtn"), skip = $("refSkipBtn");
  const label = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "در حال بررسی..."; }
  if (skip) skip.disabled = true;
  try {
    const r = await plusPost({ mode: "plus-ref-claim", ref: code }, 10000);
    if (r && r.ok === true) {
      if (r.claimed) {
        try { localStorage.setItem("SUV_REF_WELCOME", "1"); } catch {}
        goToApp();
        return;
      }
      const reason = r.reason || "INVALID";
      if (reason === "NOT_ELIGIBLE" || reason === "ALREADY") { goToApp(); return; }
      const wt = $("refWrongText"), retry = $("refRetryBtn");
      if (wt) wt.textContent =
        reason === "LIMIT" ? "ظرفیت این کد معرف پر شده؛ کد دیگه‌ای امتحان کن." :
        reason === "TOO_MANY" ? "تعداد تلاش‌های اشتباه زیاد بود؛ فعلاً بدون کد معرف ادامه بده." :
        "کد معرف اشتباه است.";
      if (retry) retry.style.display = reason === "TOO_MANY" ? "none" : "";
      refShow("wrong");
      return;
    }
    refError("مشکلی پیش اومد؛ دوباره امتحان کن.");
  } catch {
    refError("اتصال به سرور برقرار نشد؛ دوباره امتحان کن.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = label; }
    if (skip) skip.disabled = false;
  }
}

$("refSubmitBtn")?.addEventListener("click", refSubmit);
$("refSkipBtn")?.addEventListener("click", refSkip);
$("refSkipBtn2")?.addEventListener("click", refSkip);
$("refRetryBtn")?.addEventListener("click", () => { refError(""); refShow("input"); setTimeout(() => { try { $("refCodeInput")?.select(); } catch {} }, 50); });
$("refCodeInput")?.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); refSubmit(); } });

/* =========================================
   خطاها/توکن برگشته از ریدایرکت گوگل
   (worker.js بعد از ورود موفق با گوگل، کاربر رو به همین صفحه با
   ?session=... برمی‌گردونه؛ در صورت خطا هم با ?error=...)
========================================= */

/* توکنِ موقتِ ورود با گیت‌هاب وقتی ایمیلِ تأییدشده نداشت؛ همراه با کدِ ایمیل به سرور می‌ره تا حساب وصل بشه */
let _ghPending = "";
function _ghNeedEmail(tok) {
  _ghPending = String(tok || "");
  try { history.replaceState(null, "", location.pathname); } catch {}
  showError("گیت‌هاب ایمیلِ تأییدشده‌ای نداد؛ ایمیلت رو وارد کن تا کد تأیید بفرستیم و حساب گیت‌هابت بهش وصل بشه.");
  setTimeout(() => { try { $("emailInput")?.focus(); } catch {} }, 100);
}

(function handleRedirectParams() {
  const params = new URLSearchParams(location.search);
  const session = params.get("session");
  const error = params.get("error");
  const ghTok = params.get("gh");
  if (ghTok && /^[a-f0-9]{32}$/.test(ghTok)) { _ghNeedEmail(ghTok); return; }

  if (session) {
    setSessionToken(session);
    afterLogin(_takeMethod(""));
    return;
  }

  if (error) {
    const messages = {
      GOOGLE_OAUTH_NOT_CONFIGURED: "ورود با گوگل هنوز روی سرور تنظیم نشده.",
      GOOGLE_NO_CODE: "ورود با گوگل لغو شد یا ناقص بود.",
      GOOGLE_TOKEN_FAILED: "اتصال به گوگل موفق نبود؛ دوباره امتحان کن.",
      GOOGLE_USERINFO_FAILED: "دریافت اطلاعات حساب گوگل ناموفق بود.",
      DB_NOT_CONFIGURED: "سیستم ورود هنوز روی سرور راه‌اندازی نشده.",
      GOOGLE_OAUTH_ERROR: "یه مشکلی توی ورود با گوگل پیش اومد؛ دوباره امتحان کن.",
      GITHUB_OAUTH_NOT_CONFIGURED: "ورود با گیت‌هاب هنوز روی سرور تنظیم نشده.",
      GITHUB_NO_CODE: "ورود با گیت‌هاب لغو شد یا ناقص بود.",
      GITHUB_TOKEN_FAILED: "اتصال به گیت‌هاب موفق نبود؛ دوباره امتحان کن.",
      GITHUB_USERINFO_FAILED: "دریافت اطلاعات حساب گیت‌هاب ناموفق بود.",
      GITHUB_OAUTH_ERROR: "یه مشکلی توی ورود با گیت‌هاب پیش اومد؛ دوباره امتحان کن."
    };
    showError(messages[error] || "یه مشکلی پیش اومد؛ دوباره امتحان کن.");
  }
})();

/* =========================================
   PASSWORDLESS LOGIN (کد یک‌بارمصرف روی ایمیل)
   -----------------------------------------------------------
   دیگه هیچ فرمِ رمزدار/تب ورود-ثبت‌نامی وجود نداره (طبق درخواستِ
   صریح: بدون password، هیچ bypass، هیچ hardcode). فرمِ authForm
   فقط ایمیل می‌گیره و «ارسال کد» می‌کنه — سرور (worker.js، مسیرِ
   request-login-code) خودش تشخیص می‌ده ایمیل حساب داره یا نه و در
   صورت نبودن، خودش یه حسابِ بدون‌رمز می‌سازه؛ یعنی همین یک فرم هم
   نقشِ ثبت‌نام و هم ورود رو داره — کاربر لازم نیست این تفاوت رو
   بدونه یا انتخاب کنه.
========================================= */

let pendingLoginEmail = "";

/* ارقام فارسی/عربی (کیبورد فارسی) → لاتین؛ هر چیزِ غیرعدد حذف می‌شه */
function normCode(v) {
  return String(v || "")
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/\D/g, "")
    .slice(0, 6);
}
$("loginCodeInput")?.addEventListener("input", e => { const n = normCode(e.target.value); if (n !== e.target.value) e.target.value = n; });
$("loginCodeInput")?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("codeSubmitBtn")?.click(); } });

const authCard = document.querySelector(".auth-card");
const authForm = $("authForm");
const codeStepCard = $("codeStepCard");
const sendCodeBtn = $("sendCodeBtn");
const codeSubmitBtn = $("codeSubmitBtn");
const resendCodeBtn = $("resendCodeBtn");
const backToLoginBtn = $("backToLoginBtn");

function showCodeStepError(msg) {
  amRmBlockBtn();
  const el = $("codeStepError");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
}

function clearCodeStepError() {
  amRmBlockBtn();
  const el = $("codeStepError");
  if (el) { el.textContent = ""; el.classList.remove("show"); }
}

function goToCodeStep(email) {
  pendingLoginEmail = email;
  const note = $("codeStepEmailNote");
  if (note) note.textContent = `یه کد ۶رقمی به ${email} فرستاده شد — توی جیمیل یا ایمیلت چکش کن.`;
  if (authCard) authCard.style.display = "none";
  if (codeStepCard) codeStepCard.style.display = "block";
  clearCodeStepError();
  const codeInput = $("loginCodeInput");
  if (codeInput) { codeInput.value = ""; codeInput.focus(); }
}

function backToLoginForm() {
  if (codeStepCard) codeStepCard.style.display = "none";
  if (authCard) authCard.style.display = "block";
}

async function submitSendCode() {
  clearError();
  const email = ($("emailInput")?.value || "").replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\s]/g, "").toLowerCase();
  if (!email) { showError("اول ایمیلت رو وارد کن"); return; }

  if (sendCodeBtn) { sendCodeBtn.disabled = true; }
  const originalText = sendCodeBtn?.textContent;
  if (sendCodeBtn) sendCodeBtn.textContent = "در حال ارسال...";

  try {
    const res = await fetchT(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "request-login-code", email })
    }, 25000);
    const data = await res.json().catch(() => null);
    if (data?.ok || data?.error === "VERIFY_RESEND_TOO_SOON") {
      /* اگه کدِ چند ثانیه پیش فرستاده شده، کاربر رو مستقیم به مرحله‌ی واردکردنِ همون کد ببر */
      goToCodeStep(email);
    } else if (data?.error === "ACCOUNT_BLOCKED") {
      amShowBlocked(data, $("authError"));
    } else {
      showError((data?.message || "ارسال کد انجام نشد؛ دوباره امتحان کن.") + (data?.hint ? " (" + data.hint + ")" : ""));
    }
  } catch (e) {
    showError(e && e.name === "AbortError"
      ? "سرور دیر جواب داد؛ دوباره «ارسال کد» رو بزن."
      : "اتصال به سرور برقرار نشد؛ اینترنتت رو چک کن.");
  } finally {
    if (sendCodeBtn) { sendCodeBtn.disabled = false; sendCodeBtn.textContent = originalText; }
  }
}

if (authForm) {
  authForm.addEventListener("submit", event => {
    event.preventDefault();
    submitSendCode();
  });
}

if (codeSubmitBtn) {
  codeSubmitBtn.addEventListener("click", async () => {
    clearCodeStepError();
    const code = normCode($("loginCodeInput")?.value);
    if (!code || code.length !== 6) { showCodeStepError("یه کد ۶رقمی وارد کن"); return; }

    codeSubmitBtn.disabled = true;
    const originalText = codeSubmitBtn.textContent;
    codeSubmitBtn.textContent = "لطفاً صبر کن...";

    try {
      const res = await fetchT(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "verify-login-code", email: pendingLoginEmail, code, ghPending: _ghPending || undefined })
      }, 25000);
      const data = await res.json().catch(() => null);
      if (data?.ok && data.sessionToken) {
        setSessionToken(data.sessionToken);
        afterLogin(_ghPending ? "github" : "email", pendingLoginEmail);
        return;
      }
      if (data?.error === "ACCOUNT_BLOCKED") { amShowBlocked(data, $("codeStepError")); return; }
      showCodeStepError(data?.message || "کد اشتباهه یا منقضی شده.");
    } catch {
      showCodeStepError("اتصال به سرور برقرار نشد؛ اینترنتت رو چک کن.");
    } finally {
      codeSubmitBtn.disabled = false;
      codeSubmitBtn.textContent = originalText;
    }
  });
}

if (resendCodeBtn) {
  resendCodeBtn.addEventListener("click", async () => {
    if (!pendingLoginEmail) return;
    clearCodeStepError();
    resendCodeBtn.disabled = true;
    try {
      const res = await fetchT(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "request-login-code", email: pendingLoginEmail })
      }, 25000);
      const data = await res.json().catch(() => null);
      showCodeStepError(data?.ok ? "کد جدید فرستاده شد 📧" : ((data?.message || "ارسال نشد") + (data?.hint ? " (" + data.hint + ")" : "")));
    } catch {
      showCodeStepError("اتصال به سرور برقرار نشد.");
    } finally {
      resendCodeBtn.disabled = false;
    }
  });
}

if (backToLoginBtn) backToLoginBtn.addEventListener("click", backToLoginForm);

/* ورود با گوگل داخلِ اپ:
   گوگل ورود از داخلِ WebView رو مسدود می‌کنه، پس توی اندروید ورود توی Chrome (Custom Tab) باز
   می‌شه و بعد از ورود، Worker کاربر رو با suvreno://auth?code=... به اپ برمی‌گردونه؛ اپ اون کدِ
   یک‌بارمصرف رو با توکنِ ورود عوض می‌کنه. توی iOS (به‌خاطر قانونِ «ورود با اپل») دکمه‌ی گوگل مخفیه. */
const _cap = window.Capacitor;
const _platform = (() => {
  try {
    if (!_cap) return "web";
    if (typeof _cap.getPlatform === "function") return _cap.getPlatform();
    if (typeof _cap.isNativePlatform === "function" && _cap.isNativePlatform()) return "android";
  } catch {}
  return "web";
})();
const _suvNativeApp = !!(window.SuvrenoNative && typeof window.SuvrenoNative.openAuth === "function");
const _isNativeApp = _platform !== "web" || _suvNativeApp;

if (_platform === "ios") {
  const gb = $("googleBtn"); if (gb) gb.style.display = "none";
  document.querySelectorAll(".auth-divider").forEach(d => { d.style.display = "none"; });
}

async function handleAuthDeepLink(url) {
  if (!url || !/^suvreno:\/\/auth/i.test(url)) return false;
  try { await _cap?.Plugins?.Browser?.close?.(); } catch {}
  const ghM = url.match(/[?&]gh=([a-f0-9]{32})/);
  if (ghM) { _ghNeedEmail(ghM[1]); return true; }
  const errM = url.match(/[?&]error=([^&#]+)/);
  const codeM = url.match(/[?&]code=([A-Za-z0-9]+)/);
  if (errM && !codeM) {
    const _gh = /^GITHUB_/.test(errM[1]), _nm = _gh ? "گیت‌هاب" : "گوگل";
    showError(/_NO_CODE$/.test(errM[1]) ? `ورود با ${_nm} لغو شد یا ناقص بود.` : `یه مشکلی توی ورود با ${_nm} پیش اومد؛ دوباره امتحان کن.`);
    return true;
  }
  if (!codeM) return false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchT(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "google-app-exchange", code: codeM[1] })
      }, 15000);
      const data = await res.json();
      if (data?.ok && data.sessionToken) {
        setSessionToken(data.sessionToken);
        afterLogin(_takeMethod("google"));
        return true;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1500));
  }
  showError("ورود با گوگل کامل نشد؛ دوباره امتحان کن.");
  return true;
}

window.handleAuthDeepLink = handleAuthDeepLink;

try {
  const AppPlugin = _cap?.Plugins?.App;
  if (_isNativeApp && AppPlugin) {
    AppPlugin.addListener("appUrlOpen", ev => { handleAuthDeepLink(ev?.url); });
    if (typeof AppPlugin.getLaunchUrl === "function") {
      AppPlugin.getLaunchUrl().then(r => { if (r?.url) handleAuthDeepLink(r.url); }).catch(() => {});
    }
  }
} catch {}

function _browserGoogle() {
  const url = `${WORKER_URL}auth/google?app=1`;
  if (_suvNativeApp) { try { window.SuvrenoNative.openAuth(url); return true; } catch {} }
  return false;
}

let _gTm = 0;
function _googleBusy(on) {
  const b = $("googleBtn");
  clearTimeout(_gTm);
  if (!b) return;
  if (on) {
    if (b.dataset.t == null) b.dataset.t = b.innerHTML;
    b.disabled = true;
    b.style.opacity = ".7";
    _gTm = setTimeout(() => _googleBusy(false), 12000);
  } else {
    b.disabled = false;
    b.style.opacity = "";
    if (b.dataset.t != null) { b.innerHTML = b.dataset.t; delete b.dataset.t; }
  }
}

window.handleNativeGoogle = async function (status, token) {
  if (status === "cancel") { _googleBusy(false); return; }
  /* «slow»: پنجره‌ی انتخاب حساب هنوز باز است؛ هیچ چیزی نشون نده و نتیجه‌ی بعدی را قبول کن */
  if (status === "slow") return;
  if (status === "ok" && token) {
    try {
      const res = await fetchT(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "google-id-token", idToken: token })
      }, 20000);
      const data = await res.json();
      if (data?.ok && data.sessionToken) {
        setSessionToken(data.sessionToken);
        afterLogin("google", _jwtEmail(token));
        return;
      }
      if (data?.error === "ACCOUNT_BLOCKED") { amShowBlocked(data, $("authError")); return; }
    } catch {}
    _googleBusy(false);
    showError("ورود با گوگل کامل نشد؛ دوباره امتحان کن.");
    return;
  }
  /* دکمه‌ی «ورود از طریق مرورگر» دیگه همیشه دیده نمی‌شه؛ فقط وقتی ورود داخل اپ واقعاً شکست خورد (نه وقتی کاربر لغو کرد) ظاهر می‌شه */
  _googleBusy(false);
  _googleBrowserLink("ورود با گوگل داخل اپ انجام نشد؛ دوباره امتحان کن. اگه باز نشد، از دکمه‌ی «ورود از طریق مرورگر» پایین استفاده کن.");
};

/* مرورگر فقط با زدنِ همین دکمه باز می‌شه؛ هیچ‌وقت خودکار و وسطِ انتخابِ حساب */
function _googleBrowserLink(msg) {
  if (msg) showError(msg);
  if ($("googleBrowserBtn")) return;
  const gb = $("googleBtn");
  if (!gb) return;
  const b = document.createElement("button");
  b.type = "button";
  b.id = "googleBrowserBtn";
  b.className = "auth-guest-btn";
  b.textContent = "ورود از طریق مرورگر";
  b.addEventListener("click", () => {
    clearError();
    if (_browserGoogle()) return;
    location.href = `${WORKER_URL}auth/google`;
  });
  gb.insertAdjacentElement("afterend", b);
}

/* ورود با پنجره‌ی انتخاب حساب گوگل (Google Identity Services / One Tap) برای اپ اندروید TWA و PWA نصب‌شده؛
   اگه پنجره باز نشد یا گوگل لود نشد، خودکار به روش قبلی (صفحه‌ی گوگل در مرورگر) می‌ره. بقیه‌ی محیط‌ها (دسکتاپ/مرورگر معمولی) تغییری نمی‌کنن. */
const _isStandaloneAndroid = (() => {
  try {
    const ua = navigator.userAgent || "";
    const standalone = (window.matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches)) || /^android-app:\/\//.test(document.referrer || "");
    return /Android/i.test(ua) && standalone;
  } catch { return false; }
})();
let _gisTried = false;
function _gisLoad() {
  return new Promise((res, rej) => {
    if (window.google && window.google.accounts && window.google.accounts.id) return res();
    const tm = setTimeout(() => rej(new Error("gsi-timeout")), 7000);
    const sc = document.createElement("script");
    sc.src = "https://accounts.google.com/gsi/client"; sc.async = true;
    sc.onload = () => { clearTimeout(tm); res(); };
    sc.onerror = () => { clearTimeout(tm); rej(new Error("gsi-load")); };
    document.head.appendChild(sc);
  });
}
/* true = پنجره‌ی گوگل نشون داده شد/کار به callback سپرده شد؛ "closed" = کاربر پنجره رو بست؛ false = گوگل پنجره رو نشون نداد (به مرورگر خودکار نمی‌ریم؛ فقط دکمه‌ی دستی نشون داده می‌شه) */
async function _googleOneTap() {
  try {
    const r = await fetchT(`${WORKER_URL}auth/google-client`, {}, 6000);
    const d = await r.json();
    if (!d?.clientId) return false;
    await _gisLoad();
    return await new Promise(resolve => {
      let done = false;
      const fin = v => { if (!done) { done = true; resolve(v); } };
      google.accounts.id.initialize({
        client_id: d.clientId, use_fedcm_for_prompt: true, auto_select: false, cancel_on_tap_outside: false,
        callback: resp => { fin(true); if (resp && resp.credential) window.handleNativeGoogle("ok", resp.credential); }
      });
      google.accounts.id.prompt(n => {
        try {
          if (n.isDisplayed && n.isDisplayed()) fin(true);
          else if (n.isNotDisplayed && n.isNotDisplayed()) fin(false);
          else if ((n.isSkippedMoment && n.isSkippedMoment()) || (n.isDismissedMoment && n.isDismissedMoment())) fin("closed");
        } catch {}
      });
      setTimeout(() => fin(true), 4000); /* اگه گوگل خبری نداد، دکمه آزاد می‌شه؛ بار دوم زدن مستقیم میره مرورگر */
    });
  } catch { return false; }
}

const googleBtn = $("googleBtn");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    clearError();
    _markMethod("google");
    if (_isNativeApp) {
      const url = `${WORKER_URL}auth/google?app=1`;
      _googleBusy(true);
      if (_suvNativeApp && typeof window.SuvrenoNative.googleSignIn === "function") {
        try {
          const r = await fetchT(`${WORKER_URL}auth/google-client`, {}, 6000);
          const d = await r.json();
          if (d?.clientId) { window.SuvrenoNative.googleSignIn(d.clientId); return; }
        } catch {}
        _googleBusy(false);
        _googleBrowserLink("اتصال به سرور برای ورود با گوگل برقرار نشد؛ دوباره امتحان کن.");
        return;
      }
      if (_suvNativeApp) {
        try { window.SuvrenoNative.openAuth(url); return; } catch {}
      }
      const B = _cap?.Plugins?.Browser;
      if (B && typeof B.open === "function") {
        try { await B.open({ url }); return; } catch {}
      }
      _googleBusy(false);
      showError("ورود با گوگل در دسترس نیست؛ با «ارسال کد ورود» به ایمیل وارد شو.");
      return;
    }
    if (_isStandaloneAndroid) {
      _googleBusy(true);
      const shown = await _googleOneTap();
      _googleBusy(false);
      if (shown === false) _googleBrowserLink("گوگل الان پنجره‌ی انتخاب حساب رو نشون نداد (ممکنه چند دقیقه‌ای بسته باشه). کمی بعد دوباره امتحان کن، یا از دکمه‌ی «ورود از طریق مرورگر» استفاده کن.");
      return;
    }
    location.href = `${WORKER_URL}auth/google`;
  });
}

function _githubBusy(on) {
  const b = $("githubBtn");
  if (!b) return;
  b.disabled = !!on;
  b.style.opacity = on ? ".7" : "";
  if (on) setTimeout(() => _githubBusy(false), 12000);
}

const githubBtn = $("githubBtn");
if (_platform === "ios" && githubBtn) githubBtn.style.display = "none";
if (githubBtn) {
  githubBtn.addEventListener("click", async () => {
    clearError();
    _markMethod("github");
    /* نسخه‌های جدید اپ (۲.۱.۹+): گیت‌هاب داخل خودِ WebView باز می‌شود، نه مرورگر؛ برگشت هم با ?session= به همین صفحه است */
    if (_suvNativeApp && typeof window.SuvrenoNative.githubInApp === "function") {
      _githubBusy(true);
      location.href = `${WORKER_URL}auth/github`;
      return;
    }
    if (_isNativeApp) {
      const url = `${WORKER_URL}auth/github?app=1`;
      _githubBusy(true);
      if (_suvNativeApp) {
        try { window.SuvrenoNative.openAuth(url); return; } catch {}
      }
      const B = _cap?.Plugins?.Browser;
      if (B && typeof B.open === "function") {
        try { await B.open({ url }); return; } catch {}
      }
      _githubBusy(false);
      showError("ورود با گیت‌هاب در دسترس نیست؛ با «ارسال کد ورود» به ایمیل وارد شو.");
      return;
    }
    location.href = `${WORKER_URL}auth/github`;
  });
}

/* =========================================
   «ورود با Suvreno» — رابطِ کاربری
   • دکمه فقط وقتی دیده می‌شود که حداقل یک حسابِ ذخیره‌شده باشد.
   • لمسِ یک ایمیل: (در اپِ اندروید اول تأییدِ اثرِ انگشت/رمزِ گوشی) سپس همان روشِ قبلیِ آن حساب:
     google ← دکمه‌ی گوگل، github ← دکمه‌ی گیت‌هاب، email ← ارسالِ کدِ ۶رقمی به همان ایمیل.
   • ×: ایمیل از فهرست حذف می‌شود (فقط از همین دستگاه؛ خودِ حساب پاک نمی‌شود).
========================================= */
const _ACC_ICONS = {
  google: '<svg viewBox="0 0 48 48" width="18" height="18"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.4 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16 4 9 8.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.7 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9 39.4 16 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.4 36 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>',
  github: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>',
  email: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 8 8 6 8-6"/></svg>'
};
const _ACC_LABEL = { google: "گوگل", github: "گیت‌هاب", email: "کد ایمیل" };

function _accVisible() {
  const list = amAccLoad();
  return _platform === "ios" ? list.filter(x => x.method === "email") : list;
}

function amAccRefreshBtn() {
  const b = $("suvAccBtn");
  if (b) b.style.display = _accVisible().length ? "" : "none";
}

function amAccRender() {
  const box = $("accList");
  if (!box) return;
  box.textContent = "";
  const list = _accVisible();
  if (!list.length) { amAccClose(); amAccRefreshBtn(); return; }
  list.forEach(acc => {
    const row = document.createElement("div");
    row.className = "acc-row";

    const main = document.createElement("button");
    main.type = "button";
    main.className = "acc-main";
    const av = document.createElement("span");
    av.className = "acc-av";
    av.textContent = (acc.email.charAt(0) || "?").toUpperCase();
    const mail = document.createElement("span");
    mail.className = "acc-mail";
    mail.setAttribute("dir", "ltr");
    mail.textContent = acc.email;
    const m = document.createElement("span");
    m.className = "acc-m";
    m.title = _ACC_LABEL[acc.method] || "";
    m.innerHTML = _ACC_ICONS[acc.method] || "";
    main.append(av, mail, m);
    main.addEventListener("click", () => amAccPick(acc));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "acc-del";
    del.setAttribute("aria-label", "حذف از فهرست");
    del.title = "حذف از فهرست";
    del.textContent = "×";
    del.addEventListener("click", e => {
      e.stopPropagation();
      amAccRemove(acc.email);
      try { const N = window.SuvrenoNative; if (N && typeof N.removeAccount === "function") N.removeAccount(acc.email); } catch {}
      amAccRender();
      amAccRefreshBtn();
    });

    row.append(main, del);
    box.appendChild(row);
  });
}

function amAccOpen() {
  clearError();
  amAccRender();
  const ov = $("accOverlay");
  if (ov && _accVisible().length) ov.classList.add("show");
}
function amAccClose() {
  const ov = $("accOverlay");
  if (ov) ov.classList.remove("show");
}

/* تأییدِ اثرِ انگشت/رمزِ گوشی — فقط وقتی اپِ اندروید متدِ SuvrenoNative.authenticate را داشته باشد.
   نتیجه: window.handleNativeAuth(id, "ok" | "nolock" | "fail" | "cancel").
   وب و اپ‌های قدیمی (بدونِ این متد) بدونِ تأیید ادامه می‌دهند (مثلِ ورودِ معمولیِ گوگل/گیت‌هاب). */
function amAccGate() {
  return new Promise(resolve => {
    const N = window.SuvrenoNative;
    if (!(N && typeof N.authenticate === "function")) { resolve(true); return; }
    const id = "a" + Date.now();
    const prev = window.handleNativeAuth;
    let done = false, tm = 0;
    const fin = v => {
      if (done) return;
      done = true;
      clearTimeout(tm);
      window.handleNativeAuth = prev;
      resolve(v);
    };
    window.handleNativeAuth = function (rid, st) {
      if (rid !== id) { if (typeof prev === "function") prev(rid, st); return; }
      if (st === "ok") { fin(true); return; }
      if (st === "nolock") {
        showError("قفلِ صفحه‌ی گوشی‌ات فعال نیست؛ برای امنیتِ بیشتر یک اثر انگشت یا رمز برای گوشی بگذار.");
        fin(true);
        return;
      }
      if (st === "fail") showError("تأییدِ هویت انجام نشد؛ دوباره امتحان کن یا از روش‌های معمولیِ ورود استفاده کن.");
      fin(false);
    };
    tm = setTimeout(() => fin(false), 90000);
    try { N.authenticate(id); }
    catch {
      showError("تأییدِ هویت در دسترس نیست؛ از روش‌های معمولیِ ورود استفاده کن.");
      fin(false);
    }
  });
}

/* ورودِ مستقیم با نشستِ ذخیره‌شده‌ی داخلِ گوشی: اول تأییدِ اثر انگشت/رمزِ گوشی (در خودِ اپ)، بعد باز شدنِ نشست.
   نتیجه: {status: ok|none|nolock|fail|cancel, token} */
function amAccNativeLogin(email) {
  return new Promise(resolve => {
    const N = window.SuvrenoNative;
    const id = "n" + Date.now();
    const prev = window.handleNativeAcc;
    let done = false, tm = 0;
    const fin = v => {
      if (done) return;
      done = true;
      clearTimeout(tm);
      window.handleNativeAcc = prev;
      resolve(v);
    };
    window.handleNativeAcc = function (rid, st, tok) {
      if (rid !== id) { if (typeof prev === "function") prev(rid, st, tok); return; }
      fin({ status: String(st || "fail"), token: String(tok || "") });
    };
    tm = setTimeout(() => fin({ status: "fail", token: "" }), 90000);
    try { N.loginWithAccount(id, email); } catch { fin({ status: "fail", token: "" }); }
  });
}

/* بررسیِ نشستِ ذخیره‌شده: "ok" | "expired" | "net" */
async function amAccVerify(token) {
  try {
    const res = await fetchT(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "me", sessionToken: token })
    }, 12000);
    const d = await res.json().catch(() => null);
    if (d && d.ok === true && d.user) return "ok";
    if (d && d.error === "NOT_AUTHENTICATED") return "expired";
    return "net";
  } catch { return "net"; }
}

function amAccRunMethod(acc) {
  if (acc.method === "google" && googleBtn) { googleBtn.click(); return; }
  if (acc.method === "github" && githubBtn) { githubBtn.click(); return; }
  const inp = $("emailInput");
  if (inp) inp.value = acc.email;
  submitSendCode();
}

let _accBusy = false;
async function amAccPick(acc) {
  if (_accBusy) return;
  _accBusy = true;
  try {
    amAccClose();
    clearError();
    const N = window.SuvrenoNative;
    let gated = false;
    if (N && typeof N.loginWithAccount === "function" && typeof N.hasAccount === "function" && N.hasAccount(acc.email)) {
      const r = await amAccNativeLogin(acc.email);
      if (r.status === "cancel") return;
      if (r.status === "fail") { showError("تأییدِ هویت انجام نشد؛ دوباره امتحان کن یا از روش‌های معمولیِ ورود استفاده کن."); return; }
      if (r.status === "ok" && r.token) {
        const v = await amAccVerify(r.token);
        if (v === "ok") {
          setSessionToken(r.token);
          _markMethod(acc.method);
          goToApp();
          return;
        }
        if (v === "net") { showError("اتصال به سرور برقرار نشد؛ اینترنتت رو چک کن و دوباره امتحان کن."); return; }
        /* نشست منقضی/باطل شده → از گاوصندوق پاکش کن و با روشِ معمولیِ همین حساب وارد شو (تأییدِ هویت قبلاً انجام شده) */
        try { N.removeAccount(acc.email); } catch {}
        showError("نشستِ این حساب منقضی شده؛ یک‌بار دیگر به روشِ معمولی وارد شو تا دوباره یک‌لمسی بشود.");
        gated = true;
      } else if (r.status === "nolock") {
        gated = false; /* همان مسیرِ قدیمی، با هشدارِ نبودنِ قفلِ گوشی */
      }
    }
    if (!gated && !(await amAccGate())) return;
    amAccRunMethod(acc);
  } finally { _accBusy = false; }
}

$("suvAccBtn")?.addEventListener("click", amAccOpen);
$("accCloseBtn")?.addEventListener("click", amAccClose);
$("accOverlay")?.addEventListener("click", e => { if (e.target === $("accOverlay")) amAccClose(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") amAccClose(); });
amAccRefreshBtn();

const guestBtn = $("guestBtn");
if (guestBtn) {
  guestBtn.addEventListener("click", goToApp);
}
