"use strict";
/* =====================================================================
   Suvreno — لایه‌ی رفتاریِ تمِ «شبِ فیروزه» (فایل جدا؛ بعد از script.js و plus.js لود می‌شود)
   ✦ هر خطایی اینجا رخ بده، اپ اصلی دست‌نخورده کار می‌کنه (همه‌چیز داخل try/catch است).
   ✦ این فایل هیچ منطقِ اپ را عوض نمی‌کند؛ فقط:
       ۱) صفحه‌ی خوش‌آمدگویی (هیرو) با کارت‌های ابزار می‌سازد (کلیک‌ها به دکمه‌های اصلیِ اپ پراکسی می‌شوند)
       ۲) «بازی‌خونه‌ی Suvreno» را به‌صورت جای خالیِ آماده می‌سازد (۷ اسلات)
       ۳) میانبرِ بازی‌خونه به سایدبار و منوی ＋ نوار پیام اضافه می‌کند
   ✦ بعداً برای افزودنِ بازی‌ها فقط همین را صدا بزن:
       window.SuvArcade.register({ id, title, desc, emoji, mount(container, api){...}, unmount(){...} })
   ===================================================================== */
(function () {
  try {
    const $ = (id) => document.getElementById(id);
    const isEn = () => document.documentElement.lang === "en";
    const t = (fa, en) => (isEn() ? en : fa);
    const fd = (n) => (isEn() ? String(n) : String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]));
    const click = (id) => { try { const b = $(id); if (b) b.click(); } catch {} };
    const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const closeSidebar = () => { try { const s = $("sidebar"); if (s && s.classList.contains("open")) click("closeSidebar"); } catch {} };
    const closeComposerMenu = () => {
      try {
        if (typeof window.__amCloseComposerMenu === "function") window.__amCloseComposerMenu();
        else { const m = $("composerMenu"); if (m) m.classList.remove("show"); }
      } catch {}
    };
    function setInput(text, caret) {
      try {
        const ta = $("messageInput"); if (!ta) return;
        ta.value = text;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.focus();
        const p = typeof caret === "number" ? caret : text.length;
        try { ta.setSelectionRange(p, p); } catch {}
      } catch {}
    }

    /* ================= بازی‌خونه‌ی Suvreno ================= */
    const SLOTS = 10;
    const RANK = { free: 0, start: 1, plus: 2 };
    /* وارد شده؟ (همان نشانه‌ای که script.js بعد از تأییدِ نشست روی فوترِ سایدبار می‌گذارد + وجودِ توکن) */
    function loggedIn() {
      try {
        const row = $("accountRowWithGear");
        if (!row || row.style.display === "none") return false;
        return !!localStorage.getItem("SUVRENO_SESSION");
      } catch { return false; }
    }
    /* سطح اشتراک: free | start | plus — از وضعیتی که plus.js نگه می‌دارد (مثل خودِ plus.js: نشستِ عوض‌شده یعنی بی‌اعتبار) */
    function userTier() {
      try {
        if (!loggedIn()) return "free";
        const st = JSON.parse(localStorage.getItem("SUV_PLUS_STATE") || "{}");
        const tok = (localStorage.getItem("SUVRENO_SESSION") || "").slice(-12);
        if (!st || st.tokTag !== tok) return "free";
        if (!st.plus || !(Number(st.expiresAt) > Date.now())) return "free";
        return st.planKey === "p7" ? "start" : "plus";
      } catch { return "free"; }
    }
    function access(g) {
      if (!loggedIn()) return { ok: false, why: "login" };
      const need = g.tier || "free";
      if ((RANK[userTier()] || 0) >= (RANK[need] || 0)) return { ok: true };
      return { ok: false, why: need };
    }
    const arcade = {
      games: [], el: null, playing: null,
      register(g) {
        try {
          if (!g || !g.id || typeof g.mount !== "function") return false;
          const i = this.games.findIndex((x) => x.id === g.id);
          if (i >= 0) this.games[i] = g; else this.games.push(g);
          this.games.sort((a, b) => (RANK[a.tier || "free"] || 0) - (RANK[b.tier || "free"] || 0));
          this.renderGrid();
          refreshArcadeBadges();
          return true;
        } catch { return false; }
      },
      build() {
        if (this.el) return this.el;
        const el = document.createElement("div");
        el.id = "suvArcade"; el.className = "sv-arcade"; el.setAttribute("role", "dialog"); el.setAttribute("aria-hidden", "true");
        el.innerHTML =
          '<div class="sv-arc-head"><button type="button" class="sv-arc-back" id="svArcBack" aria-label="' + esc(t("بازگشت", "Back")) + '">' + (isEn() ? "‹" : "›") + '</button>' +
          '<div class="sv-arc-ttl"><b id="svArcTitle"></b><span id="svArcSub"></span></div></div>' +
          '<div class="sv-arc-body"><div class="sv-arc-banner" id="svArcBanner"></div><div class="sv-arc-grid" id="svArcGrid"></div></div>' +
          '<div class="sv-arc-stage"><div class="sv-arc-stage-body" id="svArcStage"></div></div>' +
          '<div class="sv-gate" id="svGate" aria-hidden="true"></div>';
        document.body.appendChild(el);
        this.el = el;
        $("svArcBack").addEventListener("click", () => { if (this.playing) this.stop(); else this.close(); });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape" && el.classList.contains("open")) { if ($("svGate").classList.contains("show")) this.hideGate(); else if (this.playing) this.stop(); else this.close(); } });
        el.addEventListener("click", (e) => {
          const gt = e.target && e.target.closest ? e.target.closest("[data-gate]") : null;
          if (gt) { this.gateAction(gt.getAttribute("data-gate")); return; }
          const b = e.target && e.target.closest ? e.target.closest(".sv-game.ready") : null;
          if (b) this.play(b.getAttribute("data-id"));
        });
        this.renderGrid();
        return el;
      },
      texts() {
        const ti = $("svArcTitle"), su = $("svArcSub");
        if (ti) ti.textContent = t("بازی‌خونه‌ی Suvreno", "Suvreno Arcade");
        if (su) {
          if (!this.games.length) su.textContent = t("بازی‌های مخصوص Suvreno — به‌زودی 🎮", "Suvreno's own games — coming soon 🎮");
          else if (!loggedIn()) su.textContent = t(fd(this.games.length) + " بازی منتظرته — برای بازی کردن وارد شو 🔒", this.games.length + " games waiting — log in to play 🔒");
          else { const n = this.games.filter((g) => access(g).ok).length; su.textContent = t(fd(n) + " از " + fd(this.games.length) + " بازی برات بازه 🎮", n + " of " + this.games.length + " games unlocked 🎮"); }
        }
        const bn = $("svArcBanner");
        if (bn) {
          const tr = userTier();
          if (!loggedIn()) bn.innerHTML = '<span>' + esc(t("برای بازی کردن اول وارد Suvreno شو.", "Log in to Suvreno to play.")) + '</span><button type="button" data-gate="login">' + esc(t("ورود / ثبت‌نام", "Log in / Sign up")) + '</button>';
          else if (tr === "free") bn.innerHTML = '<span>' + esc(t("۱ بازی ویژه‌ی Start و ۲ بازی خفنِ Plus هم منتظرتن ✨", "1 Start-only and 2 Plus-only games await ✨")) + '</span><button type="button" data-gate="plans">' + esc(t("دیدن اشتراک‌ها", "See plans")) + '</button>';
          else if (tr === "start") bn.innerHTML = '<span>' + esc(t("با Plus دو بازی خفنِ دیگه هم باز می‌شه ✨", "Plus unlocks two more epic games ✨")) + '</span><button type="button" data-gate="plans">' + esc(t("ارتقا به Plus", "Upgrade to Plus")) + '</button>';
          else bn.innerHTML = '<span>' + esc(t("همه‌ی بازی‌ها برات بازه — لذت ببر! 🎉", "Every game is unlocked — enjoy! 🎉")) + '</span>';
          bn.style.display = "flex";
        }
      },
      renderGrid() {
        const g = $("svArcGrid"); if (!g) return;
        const n = Math.max(SLOTS, this.games.length);
        let h = "";
        for (let i = 0; i < n; i++) {
          const x = this.games[i];
          if (x) {
            const ac = access(x), tier = x.tier || "free";
            const tag = tier === "plus" ? '<i class="sv-tier plus">PLUS</i>' : tier === "start" ? '<i class="sv-tier start">START</i>' : "";
            const lock = ac.ok ? "" : '<i class="sv-lock">🔒</i>';
            h += '<button type="button" class="sv-game ready' + (ac.ok ? "" : " locked") + ' t-' + esc(tier) + '" data-id="' + esc(x.id) + '">' + tag + lock + '<span class="sv-g-ic">' + esc(x.emoji || "🎮") + '</span><b>' + esc(isEn() ? x.titleEn || x.title || x.id : x.title || x.id) + '</b><small>' + esc(isEn() ? x.descEn || x.desc || "" : x.desc || "") + '</small></button>';
          } else h += '<div class="sv-game empty"><span class="sv-g-ic">🎮</span><b>' + esc(t("به‌زودی", "Coming soon")) + '</b><small>' + esc(t("بازی شماره‌ی ", "Game #")) + (i + 1) + '</small></div>';
        }
        g.innerHTML = h;
        this.texts();
      },
      showGate(why) {
        const gt = $("svGate"); if (!gt) return;
        let ic = "🔒", ti, tx, btn, act;
        if (why === "login") { ti = t("اول وارد شو", "Log in first"); tx = t("بازی‌خونه‌ی Suvreno مخصوص کاربرهای واردشده‌ست. ورود فقط چند ثانیه طول می‌کشه!", "The arcade is for logged-in users. It only takes a few seconds!"); btn = t("ورود / ثبت‌نام", "Log in / Sign up"); act = "login"; }
        else if (why === "start") { ic = "⭐"; ti = t("بازی ویژه‌ی اشتراک Start", "Start-plan game"); tx = t("این بازی با اشتراک Start (یا Plus) باز می‌شه.", "This game unlocks with the Start (or Plus) plan."); btn = t("دیدن اشتراک‌ها", "See plans"); act = "plans"; }
        else { ic = "👑"; ti = t("بازی ویژه‌ی اشتراک Plus", "Plus-plan game"); tx = t("این بازی فقط با اشتراک Plus باز می‌شه.", "This game unlocks with the Plus plan."); btn = t("دیدن اشتراک‌ها", "See plans"); act = "plans"; }
        gt.innerHTML = '<div class="sv-gate-card"><div class="sv-gate-ic">' + ic + '</div><h3>' + esc(ti) + '</h3><p>' + esc(tx) + '</p><button type="button" class="svg-btn" data-gate="' + act + '">' + esc(btn) + '</button><button type="button" class="svg-btn alt" data-gate="close">' + esc(t("بعداً", "Not now")) + '</button></div>';
        gt.classList.add("show"); gt.setAttribute("aria-hidden", "false");
      },
      hideGate() { const gt = $("svGate"); if (gt) { gt.classList.remove("show"); gt.setAttribute("aria-hidden", "true"); } },
      gateAction(a) {
        this.hideGate();
        if (a === "login") { try { location.href = "login.html"; } catch {} }
        else if (a === "plans") {
          this.close();
          try { if (window.SuvrenoPlus && typeof window.SuvrenoPlus.open === "function") window.SuvrenoPlus.open(); } catch {}
        }
      },
      open() {
        try {
          const el = this.build(); this.renderGrid(); this.hideGate();
          el.classList.add("open"); el.setAttribute("aria-hidden", "false");
        } catch {}
      },
      close() {
        try { this.stop(); this.hideGate(); if (this.el) { this.el.classList.remove("open"); this.el.setAttribute("aria-hidden", "true"); } } catch {}
      },
      play(id) {
        try {
          const g = this.games.find((x) => x.id === id); if (!g) return;
          const ac = access(g);
          if (!ac.ok) { this.showGate(ac.why); return; }
          const el = this.build(), stage = $("svArcStage");
          this.stop();
          stage.innerHTML = "";
          el.classList.add("playing"); this.playing = g;
          const ti = $("svArcTitle"); if (ti) ti.textContent = isEn() ? g.titleEn || g.title || g.id : g.title || g.id;
          const su = $("svArcSub"); if (su) su.textContent = "";
          g.mount(stage, { exit: () => this.stop() });
        } catch (e) { console.warn("arcade play failed:", e && e.message || e); this.stop(); }
      },
      stop() {
        try {
          const g = this.playing; this.playing = null;
          if (g && typeof g.unmount === "function") { try { g.unmount(); } catch {} }
          const stage = $("svArcStage"); if (stage) stage.innerHTML = "";
          if (this.el) this.el.classList.remove("playing");
          this.texts();
        } catch {}
      }
    };
    window.SuvArcade = arcade;
    const openArcade = () => { closeSidebar(); closeComposerMenu(); arcade.open(); };

    /* ================= صفحه‌ی خوش‌آمدگویی (هیرو) ================= */
    let hero = null, foot = null;
    function greeting() {
      const h = new Date().getHours();
      if (isEn()) return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good night";
      return h < 5 ? "شب بخیر 🌙" : h < 12 ? "صبح بخیر ☀️" : h < 17 ? "ظهر بخیر 🌤️" : h < 21 ? "عصر بخیر 🌇" : "شب بخیر 🌙";
    }
    function userName() {
      try {
        const row = $("accountRowWithGear");
        if (!row || row.style.display === "none") return "";
        const n = ($("accountChipName") && $("accountChipName").textContent || "").trim();
        return n && n.length <= 18 ? n : "";
      } catch { return ""; }
    }
    function heroHTML() {
      const nm = userName();
      const chips = isEn()
        ? ["Give me a business idea", "Summarize this text for me", "Send me a photo of Mount Fuji from the web", "Write a short story", "Explain AI simply"]
        : ["یه ایده‌ی کسب‌وکار بده", "این متن رو برام خلاصه کن", "یه عکس از برج ایفل از گوگل برام بفرست", "یه داستان کوتاه بنویس", "هوش مصنوعی رو ساده توضیح بده"];
      return (
        '<div class="sv-greet"><div class="sv-hello" id="svHello">' + esc(greeting() + (nm ? "، " + nm : "")) + '</div>' +
        '<h1 class="sv-title">' + esc(t("امروز چی بسازیم؟", "What shall we create today?")) + '</h1>' +
        '<p class="sv-sub">' + esc(t("بپرس، بساز، ویرایش کن یا یه عکس واقعی پیدا کن؛ Suvreno همه‌ش رو بلده.", "Ask, create, edit or find a real photo — Suvreno does it all.")) + '</p></div>' +
        '<div class="sv-tools">' +
          '<button type="button" class="sv-tool" data-act="gen"><span class="sv-tool-ic">🎨</span><b>' + esc(t("ساخت تصویر", "Create image")) + '</b><span class="sv-s">' + esc(t("از یک جمله، تصویر بساز", "Turn a sentence into art")) + '</span></button>' +
          '<button type="button" class="sv-tool gold" data-act="edit"><span class="sv-tool-ic">🪄</span><b>' + esc(t("ویرایش تصویر", "Edit image")) + '</b><span class="sv-s">' + esc(t("عکست رو با یک دستور تغییر بده", "Change your photo with one command")) + '</span></button>' +
          '<button type="button" class="sv-tool indigo" data-act="web"><span class="sv-tool-ic">📸</span><b>' + esc(t("عکس از اینترنت", "Photo from the web")) + '</b><span class="sv-s">' + esc(t("عکس واقعی پیدا می‌کنم و با منبع می‌فرستم", "I find real photos and send them with sources")) + '</span></button>' +
          '<button type="button" class="sv-tool coral" data-act="gallery"><span class="sv-tool-ic">🖼️</span><b>' + esc(t("گالری", "Gallery")) + '</b><span class="sv-s">' + esc(t("تصویرهای ساخته‌شده‌ی تو", "Your created images")) + '</span></button>' +
        '</div>' +
        '<button type="button" class="sv-arcade-card" data-act="arcade"><span class="sv-arc-ic">🎮</span><span class="sv-arc-t"><b>' + esc(t("بازی‌خونه‌ی Suvreno", "Suvreno Arcade")) + '</b><span>' + esc(t("۱۰ بازی مخصوص Suvreno؛ هر وقت دلت خواست بازی کن", "10 games made just for Suvreno — play anytime")) + '</span></span><span class="sv-badge" id="svArcBadge">' + esc(arcade.games.length ? t("بازی کن", "Play") : t("به‌زودی", "Soon")) + '</span></button>' +
        '<div class="sv-chips">' + chips.map((c) => '<button type="button" class="sv-chip" data-chip="' + esc(c) + '">' + esc(c) + '</button>').join("") + '</div>'
      );
    }
    function renderHero() {
      if (!hero) return;
      hero.innerHTML = heroHTML();
      if (foot) hero.appendChild(foot);
    }
    function buildHero() {
      try {
        if ($("suvHero")) { hero = $("suvHero"); return; }
        const msgs = $("messages"); if (!msgs) return;
        hero = document.createElement("div"); hero.id = "suvHero";
        foot = document.createElement("div"); foot.className = "sv-hero-foot";
        const wi = $("welcomeInfo"); if (wi) foot.appendChild(wi); // نشانی‌های قوانین همچنان همین‌جا می‌مانند
        msgs.insertAdjacentElement("afterend", hero);
        renderHero();
        hero.addEventListener("click", (e) => {
          const chip = e.target && e.target.closest ? e.target.closest("[data-chip]") : null;
          if (chip) { setInput(chip.getAttribute("data-chip")); return; }
          const b = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
          if (!b) return;
          const a = b.getAttribute("data-act");
          if (a === "gen") click("sideImageGenBtn");
          else if (a === "edit") click("sideImageEditBtn");
          else if (a === "gallery") click("galleryBtn");
          else if (a === "arcade") openArcade();
          else if (a === "web") {
            const pre = t("یه عکس از ", "Send me a photo of ");
            const post = t(" از اینترنت برام بفرست", " from the web");
            setInput(pre + post, pre.length);
          }
        });
        // سلام و نام کاربر وقتی صفحه‌ی خوش‌آمد دوباره دیده می‌شود تازه می‌شود
        const refresh = () => { try { const h = $("svHello"); if (h) { const nm = userName(); h.textContent = greeting() + (nm ? "، " + nm : ""); } } catch {} };
        new MutationObserver(refresh).observe(msgs, { childList: true });
        document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
      } catch (e) { console.warn("theme hero skipped:", e && e.message || e); }
    }
    function refreshArcadeBadges() {
      try {
        const b = $("svArcBadge"); if (b) b.textContent = arcade.games.length ? t("بازی کن", "Play") : t("به‌زودی", "Soon");
        const s = $("sideArcadeBadge"); if (s) s.textContent = arcade.games.length ? t(fd(arcade.games.length) + " بازی", arcade.games.length + " games") : t("به‌زودی", "Soon");
      } catch {}
    }

    /* ================= میانبرها: سایدبار و منوی ＋ ================= */
    function addSidebarShortcut() {
      try {
        if ($("sideArcadeBtn")) return;
        const after = $("sideImageEditBtn"); if (!after) return;
        const b = document.createElement("button");
        b.type = "button"; b.className = "side-action"; b.id = "sideArcadeBtn";
        b.innerHTML = '<span>🎮</span><span id="sideArcadeLabel"></span><small id="sideArcadeBadge"></small>';
        after.insertAdjacentElement("afterend", b);
        b.addEventListener("click", openArcade);
        refreshSideLabels();
      } catch {}
    }
    function refreshSideLabels() {
      try {
        const l = $("sideArcadeLabel"); if (l) l.textContent = t("بازی‌خونه", "Arcade");
        refreshArcadeBadges();
      } catch {}
    }
    function addMenuShortcuts() {
      try {
        const menu = $("composerMenu"); if (!menu || $("svMenuGen")) return;
        const mk = (id, ic, fa, en, fn) => {
          const b = document.createElement("button");
          b.type = "button"; b.id = id;
          b.innerHTML = '<span>' + ic + '</span><span data-fa="' + esc(fa) + '" data-en="' + esc(en) + '">' + esc(t(fa, en)) + '</span>';
          b.addEventListener("click", () => { closeComposerMenu(); fn(); });
          return b;
        };
        const first = menu.firstChild;
        [
          mk("svMenuGen", "🎨", "ساخت تصویر", "Create image", () => click("sideImageGenBtn")),
          mk("svMenuEdit", "🪄", "ویرایش تصویر", "Edit image", () => click("sideImageEditBtn")),
          mk("svMenuArcade", "🎮", "بازی‌خونه", "Arcade", openArcade)
        ].forEach((b) => menu.insertBefore(b, first));
      } catch {}
    }
    function relabelMenu() {
      try {
        document.querySelectorAll("#composerMenu [data-fa]").forEach((s) => { s.textContent = isEn() ? s.getAttribute("data-en") : s.getAttribute("data-fa"); });
      } catch {}
    }

    /* ================= شروع ================= */
    function boot() {
      buildHero();
      addSidebarShortcut();
      addMenuShortcuts();
      // تغییر زبان: متن‌ها دوباره ساخته می‌شوند
      try {
        new MutationObserver(() => { renderHero(); refreshSideLabels(); relabelMenu(); if (arcade.el) { arcade.renderGrid(); } })
          .observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
      } catch {}
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  } catch (e) {
    console.warn("Suvreno theme skipped:", e && e.message || e);
  }
})();
