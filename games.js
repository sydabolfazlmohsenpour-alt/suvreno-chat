"use strict";
/* =====================================================================
   Suvreno — بازی‌خونه (games.js)
   ✦ فایل جدا؛ بعد از theme.js لود می‌شود و ۱۰ بازی را با window.SuvArcade.register ثبت می‌کند.
   ✦ سطح دسترسی هر بازی با tier مشخص می‌شود:  "free" (۷ بازی) | "start" (+۱ بازی) | "plus" (+۲ بازی)
   ✦ هر خطایی اینجا رخ بده فقط بازی‌خونه تأثیر می‌بیند؛ چت و بقیه‌ی اپ دست‌نخورده می‌مانند.
   ✦ شخصیتِ مخصوصِ Suvreno: «سووی» — کره‌ی فیروزه‌ایِ کوچک با حلقه‌ی طلایی (برگرفته از لوگو).
   ===================================================================== */
(function () {
  try {
    const A = window.SuvArcade;
    if (!A || typeof A.register !== "function") { console.warn("games.js: SuvArcade not found"); return; }

    /* ---------------- ابزارهای عمومی ---------------- */
    const isEn = () => document.documentElement.lang === "en";
    const t = (fa, en) => (isEn() ? en : fa);
    const C = { turq: "#2de2c8", turqD: "#14b8a6", turqDD: "#0f766e", gold: "#ffc857", coral: "#ff7a6b", ind: "#6d7cff", ink: "#060a14", txt: "#f4f7fb", t: "45,226,200", g: "255,200,87", turqL: "#b5fbef", goldD: "#b7791f" };
    /* رنگ‌های بازی‌ها از تمِ رنگیِ انتخاب‌شده می‌آیند (هر بار که بازی باز می‌شود تازه می‌شوند) */
    function syncTheme() {
      try {
        const cs = getComputedStyle(document.documentElement), v = (n, d) => (cs.getPropertyValue(n) || "").trim() || d;
        const hex = (s) => /^#[0-9a-f]{6}$/i.test(s);
        const mixW = (h, k) => { const n = parseInt(h.slice(1), 16), m = (x) => Math.round(x + (255 - x) * k).toString(16).padStart(2, "0"); return "#" + m(n >> 16 & 255) + m(n >> 8 & 255) + m(n & 255); };
        const a1 = v("--ac1", C.turq), a1d = v("--ac1d", C.turqD), a2 = v("--ac2", C.gold), a3 = v("--ac3", C.ind), b1 = v("--bub1", C.turqDD), ink = v("--ac2-ink", C.goldD);
        if (hex(a1)) { C.turq = a1; C.turqL = mixW(a1, 0.7); }
        if (hex(a1d)) C.turqD = a1d;
        if (hex(b1)) C.turqDD = b1;
        if (hex(a2)) C.gold = a2;
        if (hex(a3)) C.ind = a3;
        if (hex(ink)) C.goldD = ink;
        const r1 = v("--ac1-rgb", ""), r2 = v("--ac2-rgb", "");
        if (/^\d+,\d+,\d+$/.test(r1)) C.t = r1;
        if (/^\d+,\d+,\d+$/.test(r2)) C.g = r2;
      } catch {}
    }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const ri = (a, b) => Math.floor(rnd(a, b + 1));
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const keep = (a, fn) => { let j = 0; for (let i = 0; i < a.length; i++) { const v = a[i]; if (fn(v)) a[j++] = v; } a.length = j; return a; };
    const getBest = (id) => { try { return Number(localStorage.getItem("SUVG_best_" + id)) || 0; } catch { return 0; } };
    const setBest = (id, v) => { try { localStorage.setItem("SUVG_best_" + id, String(v)); } catch {} };
    const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
    const vib = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} };
    const toFa = (n) => (isEn() ? String(n) : String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]));

    function rr(ctx, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
    function star(ctx, x, y, r, rot) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2 + (rot || 0), rad = i % 2 ? r * 0.45 : r;
        const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    }
    function bg(ctx, W, H, c1, c2) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, c1 || "#0b1428"); g.addColorStop(1, c2 || "#060a14");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    function text(ctx, s, x, y, size, color, align, weight) {
      ctx.font = (weight || "800") + " " + size + "px Vazirmatn, system-ui, sans-serif";
      ctx.fillStyle = color || "#fff"; ctx.textAlign = align || "center"; ctx.textBaseline = "middle";
      ctx.fillText(s, x, y);
    }
    /* «سووی» — شخصیت مخصوص Suvreno */
    function suvi(ctx, x, y, r, o) {
      o = o || {};
      ctx.save(); ctx.translate(x, y);
      if (o.glow !== false) {
        const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2);
        g.addColorStop(0, "rgba(" + C.t + ",.32)"); g.addColorStop(1, "rgba(" + C.t + ",0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2, 0, Math.PI * 2); ctx.fill();
      }
      const b = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
      b.addColorStop(0, C.turqL); b.addColorStop(0.55, C.turq); b.addColorStop(1, C.turqD);
      ctx.fillStyle = b; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = r * 0.17; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(0, 0, r * 0.86, Math.PI * 0.12, Math.PI * 0.72); ctx.stroke();
      const tt = o.t || 0, blink = (tt % 3.4) < 0.11 ? 0.12 : 1;
      const lx = (o.lx || 0) * r * 0.1, ly = (o.ly || 0) * r * 0.1;
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(s * r * 0.34, -r * 0.1, r * 0.22, r * 0.27 * blink, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#04141a"; ctx.beginPath(); ctx.ellipse(s * r * 0.34 + lx, -r * 0.1 + ly, r * 0.11, r * 0.15 * blink, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = "#04141a"; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.lineCap = "round";
      ctx.beginPath();
      if (o.mouth) { ctx.fillStyle = "#04141a"; ctx.ellipse(0, r * 0.34, r * 0.17, r * 0.05 + r * 0.17 * o.mouth, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.arc(0, r * 0.2, r * 0.22, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke(); }
      ctx.restore();
    }

    /* ---------------- پوسته‌ی مشترک (امتیاز/رکورد/شروع/پایان) ---------------- */
    function shell(stage, api, def) {
      syncTheme();
      const root = el("div", "svg-root"); root.setAttribute("data-no-iconize", "");
      const hud = el("div", "svg-hud");
      const scB = el("b", "", "0"), bsB = el("b", "", String(getBest(def.id)));
      const sc = el("div", "svg-stat"), bs = el("div", "svg-stat");
      sc.append(el("small", "", t("امتیاز", "Score")), scB);
      bs.append(el("small", "", t("رکورد", "Best")), bsB);
      const mid = el("div", "svg-mid");
      hud.append(sc, mid, bs);
      const body = el("div", "svg-body");
      const ov = el("div", "svg-ov");
      root.append(hud, body, ov);
      stage.appendChild(root);
      const S = { root, body, mid, hud, state: "ready", score: 0, best: getBest(def.id), onStart: null, dead: false };
      S.setScore = (v) => { S.score = v; scB.textContent = toFa(v); };
      S.setMid = (h) => { mid.innerHTML = h; };
      S.setLives = (n) => { mid.textContent = n > 0 ? "❤️".repeat(clamp(n, 0, 6)) : "💔"; };
      S.hideOv = () => { ov.className = "svg-ov"; ov.innerHTML = ""; };
      S.showReady = () => {
        S.state = "ready";
        ov.className = "svg-ov show";
        ov.innerHTML = '<div class="svg-card"><div class="svg-ic">' + def.emoji + '</div><h3>' + (isEn() ? def.titleEn || def.title : def.title) + '</h3><p>' + (isEn() ? def.howEn || def.how : def.how) +
          '</p><button type="button" class="svg-btn" data-a="go">' + t("شروع بازی", "Play") + '</button><button type="button" class="svg-btn alt" data-a="exit">' + t("بازگشت به بازی‌ها", "Back to games") + '</button></div>';
      };
      S.over = (score, note) => {
        if (S.state !== "playing") return;
        S.state = "over";
        const nb = score > S.best;
        if (nb) { S.best = score; setBest(def.id, score); bsB.textContent = toFa(score); }
        vib(40);
        ov.className = "svg-ov show";
        ov.innerHTML = '<div class="svg-card"><div class="svg-ic">' + (nb ? "🏆" : "💫") + '</div><h3>' + (nb ? t("رکورد جدید!", "New record!") : t("بازی تموم شد", "Game over")) + '</h3><div class="svg-big">' + toFa(score) +
          '</div><p>' + (note ? note + " · " : "") + t("رکورد", "Best") + ": " + toFa(S.best) + '</p><button type="button" class="svg-btn" data-a="go">' + t("دوباره", "Again") + '</button><button type="button" class="svg-btn alt" data-a="exit">' + t("بازگشت به بازی‌ها", "Back to games") + '</button></div>';
      };
      ov.addEventListener("click", (e) => {
        const b = e.target && e.target.closest ? e.target.closest("[data-a]") : null;
        if (!b) return;
        if (b.getAttribute("data-a") === "exit") { try { api.exit(); } catch {} return; }
        if (S.onStart) { S.hideOv(); S.score = 0; scB.textContent = toFa(0); S.state = "playing"; S.onStart(); }
      });
      S.showReady();
      return S;
    }

    /* ---------------- موتور بوم (Canvas) ---------------- */
    function run(stage, api, def, make) {
      const S = shell(stage, api, def);
      const cv = el("canvas", "svg-cv");
      S.body.appendChild(cv);
      const ctx = cv.getContext("2d");
      const G = { ctx, W: 0, H: 0, dpr: 1, S, t: 0 };
      let hooks = null, raf = 0, last = 0, alive = true, broken = false;
      /* عملکرد: اندازه فقط وقتی دوباره خوانده می‌شود که واقعاً عوض شده باشد */
      let dirty = true, rectC = null, ro = null, slow = 0, shadowsOn = true;
      const markDirty = () => { dirty = true; rectC = null; };
      try { if (typeof ResizeObserver === "function") { ro = new ResizeObserver(markDirty); ro.observe(S.body); } } catch {}
      window.addEventListener("resize", markDirty);
      window.addEventListener("orientationchange", markDirty);
      /* عملکرد: اگر گوشی ضعیفه و فریم‌ها کند شدن، افکت‌های درخشش (shadowBlur) که سنگین‌ترین کارِ بوم‌اند خودکار خاموش می‌شن */
      try {
        const sd = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), "shadowBlur");
        if (sd && sd.get && sd.set) Object.defineProperty(ctx, "shadowBlur", { configurable: true, get() { return sd.get.call(ctx); }, set(v) { sd.set.call(ctx, shadowsOn ? v : 0); } });
      } catch {}
      function fit() {
        if (!dirty && G.W > 1 && (Math.min(window.devicePixelRatio || 1, 2) === G.dpr)) return true;
        const r = S.body.getBoundingClientRect();
        const w = Math.floor(r.width), h = Math.floor(r.height);
        const d = Math.min(window.devicePixelRatio || 1, 2);
        if (w < 2 || h < 2) return false;
        dirty = false;
        if (w === G.W && h === G.H && d === G.dpr) return true;
        G.W = w; G.H = h; G.dpr = d;
        cv.width = Math.floor(w * d); cv.height = Math.floor(h * d);
        cv.style.width = w + "px"; cv.style.height = h + "px";
        ctx.setTransform(d, 0, 0, d, 0, 0);
        if (hooks && hooks.resize) { try { hooks.resize(w, h); } catch (e) { console.warn(def.id, e); } }
        return true;
      }
      function fail(e) {
        if (broken) return; broken = true;
        console.warn("game error (" + def.id + "):", e && e.message || e);
        S.state = "over";
        const ov = S.root.querySelector(".svg-ov");
        if (ov) { ov.className = "svg-ov show"; ov.innerHTML = '<div class="svg-card"><div class="svg-ic">🛠️</div><h3>' + t("یه مشکل کوچیک پیش اومد", "Something went wrong") + '</h3><button type="button" class="svg-btn alt" data-a="exit">' + t("بازگشت به بازی‌ها", "Back to games") + '</button></div>'; }
      }
      fit();
      try { hooks = make(G) || {}; } catch (e) { fail(e); hooks = {}; }
      S.onStart = () => { try { if (hooks.reset) hooks.reset(); } catch (e) { fail(e); } };
      let fcount = 0;
      function frame(ts) {
        if (!alive) return;
        raf = requestAnimationFrame(frame);
        if (!ro && ++fcount % 30 === 0) dirty = true;
        if (!fit()) return;
        let dt = last ? (ts - last) / 1000 : 0.016; last = ts;
        if (!(dt > 0)) dt = 0.016;
        if (shadowsOn && S.state === "playing") { if (dt > 0.034) { if (++slow > 40) shadowsOn = false; } else if (slow > 0) slow--; }
        if (dt > 0.05) dt = 0.05;
        if (document.hidden || broken) return;
        G.t += dt;
        try {
          if (S.state === "playing" && hooks.update) hooks.update(dt);
          else if (hooks.idle) hooks.idle(dt);
          if (hooks.draw) hooks.draw(ctx, G.W, G.H);
        } catch (e) { fail(e); }
      }
      raf = requestAnimationFrame(frame);
      const pos = (e) => { const r = rectC || (rectC = cv.getBoundingClientRect()); return [e.clientX - r.left, e.clientY - r.top]; };
      const ptr = (name) => (e) => {
        if (S.state !== "playing" || !hooks[name] || broken) return;
        try { const p = pos(e); hooks[name](p[0], p[1], e); } catch (er) { fail(er); }
      };
      const onDown = (e) => { rectC = null; try { cv.setPointerCapture(e.pointerId); } catch {} ptr("down")(e); };
      const onMove = ptr("move"), onUp = ptr("up");
      cv.addEventListener("pointerdown", onDown);
      cv.addEventListener("pointermove", onMove);
      cv.addEventListener("pointerup", onUp);
      cv.addEventListener("pointercancel", onUp);
      const onKey = (e) => {
        if (S.state !== "playing" || !hooks.key || broken) return;
        try { if (hooks.key(e) === true) e.preventDefault(); } catch (er) { fail(er); }
      };
      window.addEventListener("keydown", onKey);
      return {
        destroy() {
          alive = false; S.dead = true;
          try { cancelAnimationFrame(raf); } catch {}
          try { if (ro) ro.disconnect(); } catch {}
          window.removeEventListener("resize", markDirty); window.removeEventListener("orientationchange", markDirty);
          window.removeEventListener("keydown", onKey);
          try { if (hooks && hooks.destroy) hooks.destroy(); } catch {}
        }
      };
    }
    function defineCanvas(def, make) {
      let inst = null;
      return Object.assign({}, def, {
        mount(stage, api) { inst = run(stage, api, def, make); },
        unmount() { if (inst) { try { inst.destroy(); } catch {} inst = null; } }
      });
    }
    function defineDom(def, make) {
      let inst = null;
      return Object.assign({}, def, {
        mount(stage, api) {
          const S = shell(stage, api, def);
          const timers = new Set();
          const T = { later: (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!S.dead) fn(); }, ms); timers.add(id); return id; } };
          let h = {};
          try { h = make(S, T) || {}; } catch (e) { console.warn(def.id, e); }
          S.onStart = () => { try { h.reset && h.reset(); } catch (e) { console.warn(def.id, e); } };
          const onKey = (e) => { if (S.state === "playing" && h.key) { try { if (h.key(e) === true) e.preventDefault(); } catch {} } };
          window.addEventListener("keydown", onKey);
          inst = { destroy() { S.dead = true; timers.forEach((id) => clearTimeout(id)); timers.clear(); window.removeEventListener("keydown", onKey); try { h.destroy && h.destroy(); } catch {} } };
        },
        unmount() { if (inst) { try { inst.destroy(); } catch {} inst = null; } }
      });
    }
    const reg = (g) => { try { A.register(g); } catch (e) { console.warn("register failed", g && g.id, e); } };

    /* =====================================================================
       ۱) سبد ستاره‌ها (رایگان) — ستاره‌ها را بگیر؛ نذار به زمین برسن
       ===================================================================== */
    reg(defineCanvas({
      id: "catch", tier: "free", emoji: "🧺", title: "سبد ستاره‌ها", titleEn: "Star Catcher",
      desc: "ستاره‌ها رو بگیر، نذار زمین بخورن", descEn: "Catch the stars, don't let them fall",
      how: "انگشتت رو روی صفحه بکش تا سووی با سبدش ستاره‌های طلایی رو بگیره. ⚡ بمب‌ها رو نگیر! اگه ۳ ستاره از دستت بیفته می‌بازی.",
      howEn: "Drag to move Suvi's basket and catch the golden stars. Avoid the ⚡ bombs! Miss 3 stars and it's over."
    }, (G) => {
      let items, x, tx, lives, spawn, face;
      const bw = () => Math.min(120, G.W * 0.3);
      const reset = () => { items = []; x = tx = G.W / 2; lives = 3; spawn = 0.3; face = 0; G.S.setLives(lives); };
      reset();
      function lose() { lives--; G.S.setLives(lives); vib(25); face = 0.6; if (lives <= 0) G.S.over(G.S.score); }
      return {
        reset,
        update(dt) {
          const sc = G.S.score;
          x += (tx - x) * Math.min(1, dt * 14);
          face = Math.max(0, face - dt);
          spawn -= dt;
          if (spawn <= 0) {
            spawn = Math.max(0.36, 0.95 - sc * 0.011);
            const r = Math.random();
            const type = r < 0.14 ? "bomb" : r < 0.26 ? "gem" : "star";
            items.push({ type, x: rnd(24, G.W - 24), y: -24, vy: (170 + Math.min(330, sc * 5)) * rnd(0.9, 1.15), ph: rnd(0, 6), rot: 0 });
          }
          const by = G.H - 64, half = bw() / 2;
          for (const it of items) {
            it.y += it.vy * dt; it.rot += dt * 2; it.ph += dt * 3;
            if (!it.dead && it.y > by - 14 && it.y < by + 20 && Math.abs(it.x - x) < half + 6) {
              it.dead = true;
              if (it.type === "star") { G.S.setScore(G.S.score + 1); face = 0.25; }
              else if (it.type === "gem") { G.S.setScore(G.S.score + 3); face = 0.25; }
              else lose();
            } else if (!it.dead && it.y > G.H + 24) {
              it.dead = true;
              if (it.type === "star") lose();
            }
          }
          items = items.filter((i) => !i.dead);
        },
        draw(c, W, H) {
          bg(c, W, H, "#0c1630", "#070d1c");
          for (let i = 0; i < 26; i++) { c.fillStyle = "rgba(255,255,255," + (0.15 + ((i * 37) % 10) / 40) + ")"; c.fillRect((i * 97) % W, (i * 53 + G.t * 8 * (1 + (i % 3))) % H, 2, 2); }
          for (const it of items) {
            if (it.type === "star") { c.fillStyle = C.gold; c.shadowColor = C.gold; c.shadowBlur = 14; star(c, it.x, it.y, 15, it.rot); c.fill(); }
            else if (it.type === "gem") { c.fillStyle = C.turq; c.shadowColor = C.turq; c.shadowBlur = 14; c.beginPath(); c.moveTo(it.x, it.y - 16); c.lineTo(it.x + 13, it.y); c.lineTo(it.x, it.y + 16); c.lineTo(it.x - 13, it.y); c.closePath(); c.fill(); }
            else { c.shadowColor = C.coral; c.shadowBlur = 14; c.fillStyle = "#2a1220"; c.strokeStyle = C.coral; c.lineWidth = 2.5; c.beginPath(); c.arc(it.x, it.y, 13, 0, 7); c.fill(); c.stroke(); text(c, "⚡", it.x, it.y + 1, 14); }
            c.shadowBlur = 0;
          }
          const by = H - 64, w = bw();
          suvi(c, x, by - 14, 22, { t: G.t, mouth: face > 0 ? 0.9 : 0, ly: -2 });
          c.fillStyle = "rgba(" + C.g + ",.95)"; c.strokeStyle = C.goldD; c.lineWidth = 2;
          c.beginPath(); c.moveTo(x - w / 2, by - 8); c.lineTo(x + w / 2, by - 8); c.quadraticCurveTo(x + w / 2 - 6, by + 30, x, by + 30); c.quadraticCurveTo(x - w / 2 + 6, by + 30, x - w / 2, by - 8); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = "rgba(255,255,255,.35)"; rr(c, x - w / 2 + 8, by - 4, w - 16, 5, 3); c.fill();
        },
        down(px) { tx = clamp(px, bw() / 2, G.W - bw() / 2); },
        move(px) { tx = clamp(px, bw() / 2, G.W - bw() / 2); },
        key(e) { if (e.key === "ArrowLeft") { tx = clamp(tx - 70, bw() / 2, G.W - bw() / 2); return true; } if (e.key === "ArrowRight") { tx = clamp(tx + 70, bw() / 2, G.W - bw() / 2); return true; } }
      };
    }));

    /* =====================================================================
       ۲) پرش سووی (رایگان) — با هر ضربه بپر و از ستون‌ها رد شو
       ===================================================================== */
    reg(defineCanvas({
      id: "flap", tier: "free", emoji: "🚀", title: "پرش سووی", titleEn: "Suvi Hop",
      desc: "با هر ضربه بپر، از ستون‌ها رد شو", descEn: "Tap to hop through the pillars",
      how: "با هر ضربه روی صفحه سووی کمی بالا می‌پره و بعد دوباره پایین میاد. از بین ستون‌های کریستالی رد شو و به هیچ‌کدوم نخور!",
      howEn: "Each tap makes Suvi hop up, then gravity pulls it down. Slip between the crystal pillars without touching them!"
    }, (G) => {
      let y, vy, pipes, dist, armed, u, px;
      const reset = () => {
        u = G.H / 700; y = G.H * 0.45; vy = 0; pipes = []; dist = 0; armed = false; px = G.W * 0.28;
        let sx = G.W + 80;
        for (let i = 0; i < 4; i++) { pipes.push(newPipe(sx)); sx += 230 * u + 70; }
      };
      function newPipe(xx) { const gap = 190 * u + 30; return { x: xx, gap, cy: rnd(G.H * 0.28, G.H * 0.72), passed: false }; }
      const flap = () => { armed = true; vy = -440 * u - 40; vib(8); };
      reset();
      return {
        reset,
        resize() { u = G.H / 700; px = G.W * 0.28; },
        update(dt) {
          const sp = (150 + Math.min(110, G.S.score * 4)) * Math.max(u, 0.7);
          if (armed) { vy += 1400 * u * dt + 0; vy = Math.min(vy, 760 * u + 100); y += vy * dt; }
          else y = G.H * 0.45 + Math.sin(G.t * 4) * 8;
          if (armed) {
            for (const p of pipes) p.x -= sp * dt;
            const w = 62;
            const first = pipes[0];
            if (first.x + w < -10) { pipes.shift(); const lastp = pipes[pipes.length - 1]; pipes.push(newPipe(lastp.x + 230 * u + 70)); }
            const r = 17;
            for (const p of pipes) {
              if (!p.passed && p.x + w < px - r) { p.passed = true; G.S.setScore(G.S.score + 1); }
              if (px + r * 0.8 > p.x && px - r * 0.8 < p.x + w) {
                if (y - r * 0.8 < p.cy - p.gap / 2 || y + r * 0.8 > p.cy + p.gap / 2) return G.S.over(G.S.score);
              }
            }
            if (y + r > G.H - 18 || y - r < -30) return G.S.over(G.S.score);
          }
        },
        draw(c, W, H) {
          bg(c, W, H, "#0d1b3a", "#071024");
          c.fillStyle = "rgba(" + C.t + ",.07)"; c.beginPath(); c.moveTo(0, H);
          for (let i = 0; i <= W; i += 20) c.lineTo(i, H - 40 - Math.sin(i * 0.02 + G.t * 0.4) * 14); c.lineTo(W, H); c.fill();
          for (const p of pipes) {
            const w = 62, tg = p.cy - p.gap / 2, bgp = p.cy + p.gap / 2;
            const g = c.createLinearGradient(p.x, 0, p.x + w, 0);
            g.addColorStop(0, C.turqDD); g.addColorStop(0.5, C.turq); g.addColorStop(1, C.turqD);
            c.fillStyle = g; c.fillRect(p.x, -4, w, tg + 4); c.fillRect(p.x, bgp, w, H - bgp);
            c.fillStyle = C.gold; rr(c, p.x - 6, tg - 16, w + 12, 16, 6); c.fill(); rr(c, p.x - 6, bgp, w + 12, 16, 6); c.fill();
          }
          c.fillStyle = "#0a1a30"; c.fillRect(0, H - 18, W, 18); c.fillStyle = C.turqD; c.fillRect(0, H - 18, W, 3);
          suvi(c, px, y, 17, { t: G.t, ly: vy > 0 ? 2 : -2, mouth: armed && vy < 0 ? 0.7 : 0 });
          if (!armed) text(c, t("ضربه بزن 👆", "Tap 👆"), W / 2, H * 0.22, 22, "#fff");
        },
        down() { flap(); },
        key(e) { if (e.key === " " || e.key === "ArrowUp") { flap(); return true; } }
      };
    }));

    /* =====================================================================
       ۳) مار سووی (رایگان) — با ضربه جهتش رو عوض کن، ستاره بخور و بزرگ شو
       ===================================================================== */
    reg(defineCanvas({
      id: "snake", tier: "free", emoji: "🪱", title: "مار سووی", titleEn: "Suvi Snake",
      desc: "جهت مار رو عوض کن، ستاره بخور", descEn: "Steer the snake, eat the stars",
      how: "به هر جای صفحه بزنی مار به اون سمت می‌پیچه (یا با کشیدنِ انگشت). ستاره‌ها رو بخور تا بزرگ‌تر بشی؛ به دیوار و به خودت نخور!",
      howEn: "Tap anywhere and the snake turns that way (or swipe). Eat stars to grow — don't hit the walls or yourself!"
    }, (G) => {
      let cols, rows, snake, dir, queue, food, acc, down0, grow, stepT;
      const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
      const opp = { U: "D", D: "U", L: "R", R: "L" };
      function layout() {
        if (G.W <= G.H) { cols = 16; rows = clamp(Math.floor(16 * G.H / G.W), 12, 34); }
        else { rows = 16; cols = clamp(Math.floor(16 * G.W / G.H), 12, 30); }
      }
      function metrics() { const cell = Math.min(G.W / cols, G.H / rows); return { cell, ox: (G.W - cell * cols) / 2, oy: (G.H - cell * rows) / 2 }; }
      function placeFood() {
        for (let k = 0; k < 400; k++) {
          const f = { x: ri(0, cols - 1), y: ri(0, rows - 1) };
          if (!snake.some((s) => s.x === f.x && s.y === f.y)) { food = f; return; }
        }
        food = null;
      }
      function reset() {
        layout();
        const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
        snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
        dir = "R"; queue = []; acc = 0; grow = 0; stepT = 0.17; placeFood();
      }
      function turn(d) {
        const cur = queue.length ? queue[queue.length - 1] : dir;
        if (d === cur || d === opp[cur]) return;
        if (queue.length < 2) queue.push(d);
      }
      function tapTurn(px, py) {
        const m = metrics(), h = snake[0];
        const hx = m.ox + (h.x + 0.5) * m.cell, hy = m.oy + (h.y + 0.5) * m.cell;
        const dx = px - hx, dy = py - hy;
        const cur = queue.length ? queue[queue.length - 1] : dir;
        const horiz = cur === "L" || cur === "R";
        let d;
        if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? "R" : "L"; else d = dy > 0 ? "D" : "U";
        if (d === cur || d === opp[cur]) d = horiz ? (dy >= 0 ? "D" : "U") : (dx >= 0 ? "R" : "L");
        turn(d);
      }
      layout(); reset();
      return {
        reset,
        resize() { if (G.S.state !== "playing") layout(); },
        update(dt) {
          acc += dt;
          while (acc >= stepT && G.S.state === "playing") {
            acc -= stepT;
            if (queue.length) dir = queue.shift();
            const h = snake[0], v = DIRS[dir], n = { x: h.x + v[0], y: h.y + v[1] };
            if (n.x < 0 || n.y < 0 || n.x >= cols || n.y >= rows) return G.S.over(G.S.score);
            const body = grow > 0 ? snake : snake.slice(0, -1);
            if (body.some((s) => s.x === n.x && s.y === n.y)) return G.S.over(G.S.score);
            snake.unshift(n);
            if (grow > 0) grow--; else snake.pop();
            if (food && n.x === food.x && n.y === food.y) {
              grow += 1; G.S.setScore(G.S.score + 1); vib(10);
              stepT = Math.max(0.075, 0.17 - G.S.score * 0.0035);
              placeFood();
            }
          }
        },
        draw(c, W, H) {
          bg(c, W, H, "#091326", "#060b18");
          const m = metrics(), cell = m.cell;
          for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            if ((x + y) % 2) { c.fillStyle = "rgba(255,255,255,.025)"; c.fillRect(m.ox + x * cell, m.oy + y * cell, cell, cell); }
          }
          c.strokeStyle = "rgba(" + C.t + ",.55)"; c.lineWidth = 3; c.shadowColor = C.turq; c.shadowBlur = 12;
          c.strokeRect(m.ox, m.oy, cell * cols, cell * rows); c.shadowBlur = 0;
          if (food) { c.fillStyle = C.gold; c.shadowColor = C.gold; c.shadowBlur = 14; star(c, m.ox + (food.x + 0.5) * cell, m.oy + (food.y + 0.5) * cell, cell * 0.46, G.t * 2); c.fill(); c.shadowBlur = 0; }
          for (let i = snake.length - 1; i >= 1; i--) {
            const s = snake[i], k = i / snake.length;
            c.fillStyle = k < 0.5 ? C.turq : C.turqD; c.globalAlpha = 1 - k * 0.35;
            rr(c, m.ox + s.x * cell + cell * 0.08, m.oy + s.y * cell + cell * 0.08, cell * 0.84, cell * 0.84, cell * 0.3); c.fill();
          }
          c.globalAlpha = 1;
          const h = snake[0]; const v = DIRS[dir];
          suvi(c, m.ox + (h.x + 0.5) * cell, m.oy + (h.y + 0.5) * cell, cell * 0.52, { t: G.t, lx: v[0], ly: v[1], glow: false });
        },
        down(px, py) { down0 = [px, py]; },
        up(px, py) {
          if (!down0) return;
          const dx = px - down0[0], dy = py - down0[1];
          if (Math.hypot(dx, dy) > 22) { Math.abs(dx) > Math.abs(dy) ? turn(dx > 0 ? "R" : "L") : turn(dy > 0 ? "D" : "U"); }
          else tapTurn(px, py);
          down0 = null;
        },
        key(e) {
          const map = { ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R", w: "U", s: "D", a: "L", d: "R" };
          if (map[e.key]) { turn(map[e.key]); return true; }
        }
      };
    }));

    /* =====================================================================
       ۴) جفت‌یاب سووی (رایگان) — کارت‌های هم‌شکل رو پیدا کن
       ===================================================================== */
    reg(defineDom({
      id: "memory", tier: "free", emoji: "🃏", title: "جفت‌یاب سووی", titleEn: "Suvi Match",
      desc: "کارت‌های هم‌شکل رو پیدا کن", descEn: "Find the matching cards",
      how: "کارت‌ها رو یکی‌یکی برگردون و جفتِ هم‌شکلشون رو پیدا کن. هرچی سریع‌تر و با حرکت کمتر تموم کنی، امتیازت بیشتره!",
      howEn: "Flip cards to find matching pairs. The faster and the fewer moves, the higher your score!"
    }, (S, T) => {
      const EM = ["🚀", "🌙", "⭐", "🎨", "🎧", "🍉", "🦋", "🔮"];
      const grid = el("div", "svg-mem");
      S.body.appendChild(grid);
      let cards = [], open = [], lock = false, moves = 0, found = 0, t0 = 0, tick = 0;
      const upd = () => S.setMid("🔁 " + toFa(moves) + " &nbsp; ⏱ " + toFa(Math.floor((Date.now() - t0) / 1000)));
      function reset() {
        const deck = EM.concat(EM).sort(() => Math.random() - 0.5);
        grid.innerHTML = ""; cards = []; open = []; lock = false; moves = 0; found = 0; t0 = Date.now();
        deck.forEach((e, i) => {
          const b = el("button", "svg-mc", '<span class="f"></span><span class="b">' + e + "</span>");
          b.type = "button"; b.setAttribute("aria-label", t("کارت", "Card") + " " + (i + 1));
          b.addEventListener("click", () => flip(i));
          grid.appendChild(b); cards.push({ e, b, done: false });
        });
        upd(); clearInterval(tick); tick = setInterval(() => { if (!S.dead && S.state === "playing") upd(); }, 1000);
      }
      function flip(i) {
        if (S.state !== "playing" || lock) return;
        const c = cards[i]; if (!c || c.done || open.includes(i)) return;
        c.b.classList.add("flip"); open.push(i);
        if (open.length === 2) {
          moves++; upd(); lock = true;
          const [a, b] = open;
          if (cards[a].e === cards[b].e) {
            T.later(() => { cards[a].done = cards[b].done = true; cards[a].b.classList.add("ok"); cards[b].b.classList.add("ok"); open = []; lock = false; found++; S.setScore(found * 100); vib(10);
              if (found === EM.length) { clearInterval(tick); const sec = Math.floor((Date.now() - t0) / 1000); const sc = Math.max(50, 1500 - moves * 30 - sec * 6); S.setScore(sc); S.over(sc, "🔁 " + toFa(moves) + " · ⏱ " + toFa(sec)); } }, 350);
          } else {
            T.later(() => { cards[a].b.classList.remove("flip"); cards[b].b.classList.remove("flip"); open = []; lock = false; }, 750);
          }
        }
      }
      return { reset, destroy() { clearInterval(tick); } };
    }));

    /* =====================================================================
       ۵) آجرشکن نور (رایگان) — توپ رو برگردون و همه‌ی آجرها رو بشکن
       ===================================================================== */
    reg(defineCanvas({
      id: "brick", tier: "free", emoji: "🧱", title: "آجرشکن نور", titleEn: "Light Breaker",
      desc: "توپ رو برگردون، آجرها رو بشکن", descEn: "Bounce the ball, break the bricks",
      how: "انگشتت رو بکش تا پدال حرکت کنه و توپ رو برگردونه. همه‌ی آجرها رو بشکن تا بری مرحله‌ی بعد. ۳ جون داری!",
      howEn: "Drag to move the paddle and bounce the ball. Clear every brick to reach the next level. You have 3 lives!"
    }, (G) => {
      let pad, ball, bricks, lives, level, stuck, speed, tx;
      const COLS = 8;
      const PH = 12;
      const padW = () => Math.max(74, G.W * 0.22);
      function build() {
        bricks = [];
        const rows = Math.min(8, 4 + level);
        const gap = 4, bw = (G.W - 24 - gap * (COLS - 1)) / COLS, bh = Math.max(16, Math.min(24, G.H * 0.035));
        const colors = [C.coral, C.gold, C.turq, C.ind, "#a78bfa", "#fb7185", "#34d399", "#38bdf8"];
        for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
          bricks.push({ x: 12 + c * (bw + gap), y: 62 + r * (bh + gap), w: bw, h: bh, hp: level >= 3 && r < Math.floor(level / 2) ? 2 : 1, col: colors[r % colors.length] });
        }
      }
      function serve() { stuck = true; ball = { x: pad, y: G.H - 52 - 8, vx: 0, vy: 0, r: 7 }; }
      function reset() {
        level = 1; lives = 3; speed = Math.max(340, G.H * 0.52); pad = tx = G.W / 2; G.S.setLives(lives); G.S.setMid("❤️❤️❤️ · " + t("مرحله", "Lv") + " 1"); build(); serve();
      }
      function launch() { if (!stuck) return; stuck = false; const a = rnd(-0.35, 0.35); ball.vx = Math.sin(a) * speed; ball.vy = -Math.cos(a) * speed; }
      function hud() { G.S.setMid("❤️".repeat(Math.max(0, lives)) + " · " + t("مرحله", "Lv") + " " + toFa(level)); }
      reset();
      return {
        reset,
        resize() { pad = clamp(pad, padW() / 2, G.W - padW() / 2); if (G.S.state !== "playing") { build(); serve(); } },
        update(dt) {
          pad += (tx - pad) * Math.min(1, dt * 18);
          pad = clamp(pad, padW() / 2, G.W - padW() / 2);
          const py = G.H - 52;
          if (stuck) { ball.x = pad; ball.y = py - PH / 2 - ball.r - 1; return; }
          const dist = Math.hypot(ball.vx, ball.vy) * dt, steps = Math.max(1, Math.ceil(dist / 4)), sdt = dt / steps;
          for (let s = 0; s < steps; s++) {
            ball.x += ball.vx * sdt; ball.y += ball.vy * sdt;
            if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
            if (ball.x > G.W - ball.r) { ball.x = G.W - ball.r; ball.vx = -Math.abs(ball.vx); }
            if (ball.y < ball.r + 44) { ball.y = ball.r + 44; ball.vy = Math.abs(ball.vy); }
            if (ball.vy > 0 && ball.y + ball.r >= py - PH / 2 && ball.y - ball.r <= py + PH / 2 && Math.abs(ball.x - pad) <= padW() / 2 + ball.r) {
              const rel = clamp((ball.x - pad) / (padW() / 2), -1, 1), a = rel * 1.05;
              const sp = Math.hypot(ball.vx, ball.vy);
              ball.vx = Math.sin(a) * sp; ball.vy = -Math.abs(Math.cos(a) * sp); ball.y = py - PH / 2 - ball.r - 0.5;
            }
            for (const b of bricks) {
              if (b.hp <= 0) continue;
              const nx = clamp(ball.x, b.x, b.x + b.w), ny = clamp(ball.y, b.y, b.y + b.h);
              const dx = ball.x - nx, dy = ball.y - ny;
              if (dx * dx + dy * dy <= ball.r * ball.r) {
                if (Math.abs(dx) > Math.abs(dy)) { ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx); ball.x += dx > 0 ? 1 : -1; }
                else { ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy); ball.y += dy > 0 ? 1 : -1; if (dy === 0) ball.vy = -ball.vy; }
                b.hp--; if (b.hp <= 0) G.S.setScore(G.S.score + 10 * level); else G.S.setScore(G.S.score + 2);
                break;
              }
            }
            if (ball.y - ball.r > G.H) {
              lives--; hud(); vib(30);
              if (lives <= 0) return G.S.over(G.S.score);
              serve(); return;
            }
          }
          if (!bricks.some((b) => b.hp > 0)) { level++; speed = Math.min(speed * 1.07, G.H * 1.1); hud(); build(); serve(); G.S.setScore(G.S.score + 50); }
        },
        draw(c, W, H) {
          bg(c, W, H, "#0b1226", "#060a16");
          for (const b of bricks) {
            if (b.hp <= 0) continue;
            c.fillStyle = b.col; c.globalAlpha = b.hp > 1 ? 1 : 0.88; rr(c, b.x, b.y, b.w, b.h, 5); c.fill(); c.globalAlpha = 1;
            c.fillStyle = "rgba(255,255,255,.28)"; rr(c, b.x + 2, b.y + 2, b.w - 4, b.h * 0.35, 3); c.fill();
            if (b.hp > 1) { c.strokeStyle = "#fff"; c.lineWidth = 2; rr(c, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 4); c.stroke(); }
          }
          const py = H - 52, w = padW();
          const g = c.createLinearGradient(pad - w / 2, 0, pad + w / 2, 0); g.addColorStop(0, C.turqD); g.addColorStop(0.5, C.turq); g.addColorStop(1, C.gold);
          c.fillStyle = g; c.shadowColor = C.turq; c.shadowBlur = 14; rr(c, pad - w / 2, py - PH / 2, w, PH, 6); c.fill(); c.shadowBlur = 0;
          c.fillStyle = "#fff"; c.shadowColor = "#fff"; c.shadowBlur = 12; c.beginPath(); c.arc(ball.x, ball.y, ball.r, 0, 7); c.fill(); c.shadowBlur = 0;
          if (stuck) text(c, t("ضربه بزن تا توپ پرتاب بشه 👆", "Tap to launch 👆"), W / 2, H * 0.62, 17, "rgba(255,255,255,.85)");
        },
        down(px) { tx = px; launch(); },
        move(px) { tx = px; },
        key(e) { if (e.key === "ArrowLeft") { tx = pad - 80; return true; } if (e.key === "ArrowRight") { tx = pad + 80; return true; } if (e.key === " " || e.key === "ArrowUp") { launch(); return true; } }
      };
    }));

    /* =====================================================================
       ۶) برج نور (رایگان) — بلوک‌ها رو دقیق روی هم بذار
       ===================================================================== */
    reg(defineCanvas({
      id: "stack", tier: "free", emoji: "🗼", title: "برج نور", titleEn: "Light Tower",
      desc: "بلوک‌ها رو دقیق روی هم بذار", descEn: "Stack the blocks perfectly",
      how: "بلوکِ در حال حرکت رو با یک ضربه رها کن. هرچی دقیق‌تر روی بلوک قبلی بیفته، برجت پهن‌تر می‌مونه. چند بار پشت سرهم دقیق بذاری، پاداش می‌گیری!",
      howEn: "Tap to drop the moving block. The more precisely it lands, the wider your tower stays. Chain perfect drops for a bonus!"
    }, (G) => {
      let tower, cur, dirn, speed, cam, camT, debris, combo, bh, dead, flash;
      const hBlock = () => clamp(Math.round(G.H * 0.045), 22, 36);
      const hue = (i) => [C.turq, C.turqD, C.ind, C.gold, C.coral, "#38bdf8"][i % 6];
      function reset() {
        bh = hBlock(); const w0 = clamp(G.W * 0.5, 110, 260);
        tower = [{ x: (G.W - w0) / 2, w: w0, i: 0 }]; debris = []; combo = 0; cam = camT = 0; dead = false; flash = 0;
        spawn();
      }
      function spawn() {
        const top = tower[tower.length - 1], n = tower.length;
        dirn = n % 2 ? 1 : -1; speed = (G.W / 2.1) * (1 + Math.min(n, 40) * 0.028);
        cur = { x: dirn > 0 ? -top.w : G.W, w: top.w, i: n };
      }
      function drop() {
        if (dead) return;
        const top = tower[tower.length - 1];
        const left = Math.max(cur.x, top.x), right = Math.min(cur.x + cur.w, top.x + top.w), ov = right - left;
        if (ov <= 1) { dead = true; debris.push({ x: cur.x, w: cur.w, y: 0, vy: 0, i: cur.i, off: tower.length }); setTimeout(() => { if (!G.S.dead) G.S.over(G.S.score, t("طبقه", "Floors") + " " + toFa(tower.length - 1)); }, 650); return; }
        const perfect = Math.abs(cur.x - top.x) < 5;
        let nb;
        if (perfect) {
          combo++; nb = { x: top.x, w: Math.min(top.w + (combo >= 3 ? 8 : 0), clamp(G.W * 0.5, 110, 260) + 40), i: cur.i }; flash = 0.35; vib(12);
          if (combo >= 3) nb.x = top.x - (nb.w - top.w) / 2;
        } else {
          combo = 0; nb = { x: left, w: ov, i: cur.i };
          const cutL = cur.x < top.x;
          debris.push({ x: cutL ? cur.x : right, w: cur.w - ov, y: 0, vy: 0, i: cur.i, off: tower.length });
        }
        tower.push(nb);
        G.S.setScore(G.S.score + 1 + (perfect ? Math.min(combo, 5) : 0));
        camT = Math.max(0, (tower.length - 7) * bh);
        spawn();
      }
      reset();
      return {
        reset,
        update(dt) {
          if (dead) { for (const d of debris) { d.vy += 1600 * dt; d.y += d.vy * dt; } return; }
          cur.x += dirn * speed * dt;
          if (cur.x + cur.w > G.W + 20) { cur.x = G.W + 20 - cur.w; dirn = -1; }
          if (cur.x < -20) { cur.x = -20; dirn = 1; }
        },
        idle() {},
        draw(c, W, H, ) {
          bg(c, W, H, "#0b1530", "#060a16");
          cam += (camT - cam) * 0.12; flash = Math.max(0, flash - 0.016);
          const base = H - 70 + cam;
          const by = (i) => base - i * bh;
          for (const b of tower) {
            const y = by(b.i); if (y < -bh || y > H + bh) continue;
            c.fillStyle = hue(b.i); rr(c, b.x, y - bh + 2, b.w, bh - 2, 5); c.fill();
            c.fillStyle = "rgba(255,255,255,.22)"; c.fillRect(b.x + 3, y - bh + 4, b.w - 6, 3);
          }
          if (!dead) {
            const y = by(cur.i); c.fillStyle = hue(cur.i); c.shadowColor = hue(cur.i); c.shadowBlur = 14; rr(c, cur.x, y - bh + 2, cur.w, bh - 2, 5); c.fill(); c.shadowBlur = 0;
          }
          for (const d of debris) { const y = by(d.i) + d.y; c.globalAlpha = Math.max(0, 1 - d.y / 400); c.fillStyle = hue(d.i); rr(c, d.x, y - bh + 2, d.w, bh - 2, 5); c.fill(); c.globalAlpha = 1; }
          debris = debris.filter((d) => d.y < 700);
          if (flash > 0) { c.fillStyle = "rgba(" + C.g + "," + flash * 0.5 + ")"; c.fillRect(0, 0, W, H); }
          if (combo >= 2) text(c, "✨ ×" + combo, W / 2, 80, 26, C.gold);
        },
        down() { if (G.S.state === "playing") drop(); },
        key(e) { if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") { drop(); return true; } }
      };
    }));

    /* =====================================================================
       ۷) طوفان شهاب (رایگان) — از شهاب‌ها فرار کن، جرقه‌ها رو جمع کن
       ===================================================================== */
    reg(defineCanvas({
      id: "dodge", tier: "free", emoji: "☄️", title: "طوفان شهاب", titleEn: "Meteor Storm",
      desc: "از شهاب‌ها فرار کن", descEn: "Dodge the meteors",
      how: "سووی رو با انگشتت حرکت بده و از شهاب‌ها فرار کن. ✨ جرقه‌های طلایی امتیاز می‌دن و 🛡️ سپر یک برخورد رو جذب می‌کنه.",
      howEn: "Drag Suvi around and dodge the meteors. ✨ Golden sparks give points and 🛡️ shields absorb one hit."
    }, (G) => {
      let px, py, tx, ty, rocks, orbs, time, spawn, shield, hurt;
      function reset() { px = tx = G.W / 2; py = ty = G.H * 0.78; rocks = []; orbs = []; time = 0; spawn = 0.5; shield = false; hurt = 0; G.S._coins = 0; }
      const bound = () => { tx = clamp(tx, 24, G.W - 24); ty = clamp(ty, G.H * 0.3, G.H - 40); };
      reset();
      return {
        reset,
        update(dt) {
          time += dt; hurt = Math.max(0, hurt - dt);
          bound();
          px += (tx - px) * Math.min(1, dt * 13); py += (ty - py) * Math.min(1, dt * 13);
          spawn -= dt;
          if (spawn <= 0) {
            spawn = Math.max(0.16, 0.62 - time * 0.011);
            const r = rnd(11, 30 + Math.min(14, time * 0.3));
            rocks.push({ x: rnd(0, G.W), y: -40, r, vx: rnd(-60, 60), vy: rnd(190, 330) + time * 5, rot: rnd(0, 6), vr: rnd(-3, 3), sh: Array.from({ length: 8 }, () => rnd(0.78, 1.15)) });
            if (Math.random() < 0.28) orbs.push({ x: rnd(30, G.W - 30), y: -20, vy: rnd(120, 190), type: Math.random() < 0.15 ? "shield" : "spark" });
          }
          const score = Math.floor(time * 10);
          let coins = G.S._coins || 0;
          for (const r of rocks) {
            r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt;
            if (!r.dead && Math.hypot(r.x - px, r.y - py) < r.r * 0.82 + 15) {
              if (shield) { shield = false; r.dead = true; hurt = 0.3; vib(20); }
              else return G.S.over(G.S.score);
            }
          }
          for (const o of orbs) {
            o.y += o.vy * dt;
            if (!o.dead && Math.hypot(o.x - px, o.y - py) < 30) { o.dead = true; if (o.type === "spark") coins += 1; else shield = true; }
          }
          G.S._coins = coins;
          G.S.setScore(score + coins * 5);
          rocks = rocks.filter((r) => !r.dead && r.y < G.H + 60 && r.x > -80 && r.x < G.W + 80);
          orbs = orbs.filter((o) => !o.dead && o.y < G.H + 30);
        },
        draw(c, W, H) {
          bg(c, W, H, "#0a1022", "#05080f");
          for (let i = 0; i < 40; i++) { c.fillStyle = "rgba(255,255,255," + (0.15 + (i % 5) * 0.08) + ")"; c.fillRect((i * 73) % W, ((i * 41) + G.t * (30 + (i % 4) * 25)) % H, 2, 2 + (i % 3)); }
          for (const r of rocks) {
            c.save(); c.translate(r.x, r.y); c.rotate(r.rot);
            c.fillStyle = "#3b2f4a"; c.strokeStyle = C.coral; c.lineWidth = 2; c.shadowColor = C.coral; c.shadowBlur = 12;
            c.beginPath(); r.sh.forEach((k, i) => { const a = (i / r.sh.length) * Math.PI * 2; const x = Math.cos(a) * r.r * k, y = Math.sin(a) * r.r * k; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.fill(); c.stroke();
            c.restore();
          }
          c.shadowBlur = 0;
          for (const o of orbs) {
            if (o.type === "spark") { c.fillStyle = C.gold; c.shadowColor = C.gold; c.shadowBlur = 14; star(c, o.x, o.y, 11, G.t * 2); c.fill(); c.shadowBlur = 0; }
            else { c.strokeStyle = C.turq; c.lineWidth = 3; c.shadowColor = C.turq; c.shadowBlur = 12; c.beginPath(); c.arc(o.x, o.y, 12, 0, 7); c.stroke(); c.shadowBlur = 0; text(c, "🛡️", o.x, o.y + 1, 13); }
          }
          if (shield) { c.strokeStyle = "rgba(" + C.t + ",.85)"; c.lineWidth = 3; c.beginPath(); c.arc(px, py, 30, 0, 7); c.stroke(); }
          if (hurt > 0) { c.fillStyle = "rgba(255,122,107," + hurt + ")"; c.fillRect(0, 0, W, H); }
          suvi(c, px, py, 16, { t: G.t, mouth: 0 });
        },
        down(x, y) { tx = x; ty = y - 40; bound(); },
        move(x, y) { tx = x; ty = y - 40; bound(); },
        key(e) {
          if (e.key === "ArrowLeft") { tx -= 70; bound(); return true; }
          if (e.key === "ArrowRight") { tx += 70; bound(); return true; }
          if (e.key === "ArrowUp") { ty -= 70; bound(); return true; }
          if (e.key === "ArrowDown") { ty += 70; bound(); return true; }
        }
      };
    }));

    /* =====================================================================
       ۸) ۲۰۴۸ سووی (فقط اشتراک Start و Plus) — کاشی‌ها رو بکش و ادغام کن
       ===================================================================== */
    reg(defineDom({
      id: "n2048", tier: "start", emoji: "🔢", title: "۲۰۴۸ سووی", titleEn: "Suvi 2048",
      desc: "کاشی‌های هم‌عدد رو ادغام کن", descEn: "Merge matching tiles",
      how: "انگشتت رو (یا کلیدهای جهت‌دار رو) به هر سمت بکش؛ کاشی‌های هم‌عدد ادغام می‌شن. به ۲۰۴۸ برس و بعدش هم ادامه بده!",
      howEn: "Swipe (or use arrow keys) in any direction; matching tiles merge. Reach 2048 and keep going!"
    }, (S, T) => {
      const board = el("div", "svg-2048");
      const wrap = el("div", "svg-2048-wrap"); wrap.appendChild(board); S.body.appendChild(wrap);
      const N = 4;
      let grid, tiles, nid = 1, size = 300, won = false, sx = 0, sy = 0, tracking = false, busy = false;
      const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => { layoutSize(); renderAll(); }) : null;
      if (ro) ro.observe(S.body);
      function layoutSize() { const r = S.body.getBoundingClientRect(); size = Math.max(200, Math.floor(Math.min(r.width - 24, r.height - 24, 520))); board.style.width = board.style.height = size + "px"; }
      const gap = () => size * 0.03, cellSz = () => (size - gap() * (N + 1)) / N;
      const posX = (c) => gap() + c * (cellSz() + gap());
      function place(tl) { const s = cellSz(); tl.el.style.width = tl.el.style.height = s + "px"; tl.el.style.transform = "translate(" + posX(tl.c) + "px," + posX(tl.r) + "px)"; tl.el.style.fontSize = (tl.v >= 1024 ? s * 0.3 : tl.v >= 128 ? s * 0.36 : s * 0.44) + "px"; }
      function mk(r, c, v) { const e = el("div", "svg-tile v" + Math.min(v, 4096), toFa(v)); const tl = { id: nid++, r, c, v, el: e }; board.appendChild(e); place(tl); e.classList.add("pop"); return tl; }
      function renderAll() { if (!tiles) return; tiles.forEach(place); }
      function bgCells() { board.querySelectorAll(".svg-cellbg").forEach((n) => n.remove()); for (let i = 0; i < N * N; i++) { const b = el("div", "svg-cellbg"); const s = cellSz(); b.style.cssText = "width:" + s + "px;height:" + s + "px;transform:translate(" + posX(i % N) + "px," + posX(Math.floor(i / N)) + "px)"; board.insertBefore(b, board.firstChild); } }
      function addRandom() {
        const free = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) free.push([r, c]);
        if (!free.length) return; const [r, c] = pick(free); const tl = mk(r, c, Math.random() < 0.9 ? 2 : 4); grid[r][c] = tl; tiles.push(tl);
      }
      function reset() {
        board.innerHTML = ""; grid = Array.from({ length: N }, () => Array(N).fill(null)); tiles = []; won = false; busy = false; layoutSize(); bgCells(); addRandom(); addRandom();
      }
      function canMove() {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const a = grid[r][c]; if (!a) return true; if (c < N - 1 && grid[r][c + 1] && grid[r][c + 1].v === a.v) return true; if (r < N - 1 && grid[r + 1][c] && grid[r + 1][c].v === a.v) return true; }
        return false;
      }
      function move(dir) { // 0=چپ 1=بالا 2=راست 3=پایین
        if (S.state !== "playing" || busy) return;
        let moved = false, gained = 0; const dead = [];
        for (let k = 0; k < N; k++) {
          const line = []; // مختصات خط، از سمتی که کاشی‌ها به آن می‌چسبند
          for (let i = 0; i < N; i++) { const r = dir === 0 || dir === 2 ? k : (dir === 1 ? i : N - 1 - i); const c = dir === 1 || dir === 3 ? k : (dir === 0 ? i : N - 1 - i); line.push([r, c]); }
          const items = line.map(([r, c]) => grid[r][c]).filter(Boolean); const out = [];
          for (let i = 0; i < items.length; i++) {
            if (i + 1 < items.length && items[i].v === items[i + 1].v) { items[i].v *= 2; gained += items[i].v; dead.push([items[i + 1], items[i]]); out.push(items[i]); i++; } else out.push(items[i]);
          }
          line.forEach(([r, c], i) => { const tl = out[i] || null; if (grid[r][c] !== tl) moved = true; grid[r][c] = tl; if (tl) { if (tl.r !== r || tl.c !== c) moved = true; tl.r = r; tl.c = c; } });
        }
        if (!moved) return;
        busy = true;
        tiles.forEach(place);
        dead.forEach(([gone, keep]) => { gone.r = keep.r; gone.c = keep.c; place(gone); });
        T.later(() => {
          dead.forEach(([gone, keep]) => { gone.el.remove(); tiles = tiles.filter((x) => x !== gone); keep.el.className = "svg-tile v" + Math.min(keep.v, 4096) + " pop"; keep.el.textContent = toFa(keep.v); place(keep); });
          addRandom(); busy = false;
          if (gained) S.setScore(S.score + gained);
          if (!won && tiles.some((x) => x.v >= 2048)) { won = true; S.setMid("🎉 2048!"); }
          if (!canMove()) { S.over(S.score); }
        }, 130);
      }
      const dirKey = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3, a: 0, w: 1, d: 2, s: 3 };
      wrap.addEventListener("pointerdown", (e) => { tracking = true; sx = e.clientX; sy = e.clientY; });
      const end = (e) => {
        if (!tracking) return; tracking = false;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        move(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 2) : (dy < 0 ? 1 : 3));
      };
      wrap.addEventListener("pointerup", end); wrap.addEventListener("pointercancel", () => { tracking = false; });
      return { reset, key(e) { if (e.key in dirKey) { move(dirKey[e.key]); return true; } }, destroy() { if (ro) ro.disconnect(); } };
    }));

    /* =====================================================================
       ۹) مسابقه‌ی نئونی (فقط اشتراک Plus) — در جاده‌ی بی‌پایان بتاز
       ===================================================================== */
    reg(defineCanvas({
      id: "racer", tier: "plus", emoji: "🏎️", title: "مسابقه‌ی نئونی", titleEn: "Neon Racer",
      desc: "در جاده‌ی نئونی بتاز، نیترو بگیر", descEn: "Race the neon highway, grab nitro",
      how: "با ضربه روی نیمه‌ی چپ/راست صفحه (یا کشیدنِ انگشت) بین ۳ لاین جابه‌جا شو و از ماشین‌ها جا خالی بده. 🪙 سکه جمع کن و ⚡ نیترو بگیر تا چند ثانیه همه‌چی رو له کنی!",
      howEn: "Tap the left/right half (or swipe) to switch between 3 lanes and dodge the cars. Collect 🪙 coins and grab ⚡ nitro to smash through traffic!"
    }, (G) => {
      let lane, laneF, objs, speed, dist, nextAt, time, nitro, bonus, coins, shake, down0;
      const ZF = 14;
      function reset() { lane = 1; laneF = 1; objs = []; speed = 5.5; dist = 0; nextAt = 6; time = 0; nitro = 0; bonus = 0; coins = 0; shake = 0; }
      const geo = () => { const hy = G.H * 0.36, by = G.H - 78, cx = G.W / 2, Wr = Math.min(G.W * 0.94, 600); return { hy, by, cx, Wr }; };
      const hw = (g, s) => (g.Wr / 2) * (0.07 + 0.93 * s);
      const sy = (g, s) => g.hy + (g.by - g.hy) * s;
      const lx = (g, s, l) => g.cx + (l - 1) * ((2 * hw(g, s)) / 3);
      function spawnRow() {
        const r = Math.random();
        if (r < 0.62) {
          const two = time > 14 && Math.random() < 0.35, free = ri(0, 2);
          for (let l = 0; l < 3; l++) { if (l === free) continue; if (!two && l !== (free + 1) % 3) continue; objs.push({ k: "car", l, z: ZF, col: pick([C.coral, C.ind, "#a78bfa", "#fb7185"]) }); }
        } else if (r < 0.92) { const l = ri(0, 2); for (let i = 0; i < 4; i++) objs.push({ k: "coin", l, z: ZF + i * 0.8 }); }
        else if (nitro <= 0) objs.push({ k: "nitro", l: ri(0, 2), z: ZF });
      }
      reset();
      return {
        reset,
        update(dt) {
          time += dt; nitro = Math.max(0, nitro - dt); shake = Math.max(0, shake - dt * 3);
          const base = Math.min(11, 5.5 + time * 0.11), v = nitro > 0 ? base * 1.55 : base; speed = v;
          dist += v * dt;
          laneF += (lane - laneF) * Math.min(1, dt * 12);
          if (dist >= nextAt) { spawnRow(); nextAt = dist + rnd(2.4, 4.4) * (1 - Math.min(0.38, time * 0.004)); }
          for (const o of objs) {
            o.z -= v * dt;
            if (!o.dead && o.z < 1.2 && o.z > 0.72 && Math.abs(o.l - laneF) < 0.55) {
              if (o.k === "coin") { o.dead = true; coins++; }
              else if (o.k === "nitro") { o.dead = true; nitro = 4.5; vib(15); }
              else if (nitro > 0) { o.dead = true; bonus += 20; shake = 1; vib(12); }
              else { return G.S.over(Math.floor(dist * 4) + coins * 5 + bonus, "🪙 " + toFa(coins)); }
            }
          }
          objs = objs.filter((o) => !o.dead && o.z > 0.55);
          G.S.setScore(Math.floor(dist * 4) + coins * 5 + bonus);
          G.S.setMid(nitro > 0 ? "⚡ " + nitro.toFixed(1) : "🪙 " + toFa(coins));
        },
        draw(c, W, H) {
          const g = geo();
          const sky = c.createLinearGradient(0, 0, 0, g.hy); sky.addColorStop(0, "#0a0f2c"); sky.addColorStop(0.7, "#3a1e5a"); sky.addColorStop(1, "#ff7a6b"); c.fillStyle = sky; c.fillRect(0, 0, W, g.hy + 1);
          const sun = c.createLinearGradient(0, g.hy - 90, 0, g.hy); sun.addColorStop(0, "#ffe08a"); sun.addColorStop(1, "#ff9a6b");
          c.save(); c.beginPath(); c.arc(g.cx, g.hy, 88, Math.PI, 0); c.clip(); c.fillStyle = sun; c.fillRect(g.cx - 90, g.hy - 90, 180, 90);
          c.fillStyle = "#3a1e5a"; for (let i = 1; i < 6; i++) c.fillRect(g.cx - 90, g.hy - i * 15 + ((G.t * 6) % 15), 180, i * 1.6); c.restore();
          const ground = c.createLinearGradient(0, g.hy, 0, H); ground.addColorStop(0, "#150a2e"); ground.addColorStop(1, "#06030f"); c.fillStyle = ground; c.fillRect(0, g.hy, W, H - g.hy);
          c.strokeStyle = "rgba(" + C.t + ",.22)"; c.lineWidth = 1;
          for (let i = 1; i < 12; i++) { const s = ((i - (dist % 1)) / 12); if (s <= 0) continue; const y = sy(g, s * s); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
          const topY = g.hy, botY = g.by + 80;
          c.fillStyle = "#0c0f1e"; c.beginPath(); c.moveTo(g.cx - hw(g, 0), topY); c.lineTo(g.cx + hw(g, 0), topY); c.lineTo(g.cx + hw(g, 1.25), botY); c.lineTo(g.cx - hw(g, 1.25), botY); c.closePath(); c.fill();
          c.strokeStyle = C.turq; c.lineWidth = 3; c.shadowColor = C.turq; c.shadowBlur = 14;
          for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(g.cx + sd * hw(g, 0), topY); c.lineTo(g.cx + sd * hw(g, 1.25), botY); c.stroke(); }
          c.shadowBlur = 0;
          c.fillStyle = "rgba(" + C.g + ",.8)";
          for (const l of [1, 2]) {
            for (let k = 0; k < 12; k++) {
              const z0 = ZF - ((k * 1.2 + (dist % 1.2)) % 14), z1 = z0 + 0.5; if (z0 < 0.9) continue;
              const s0 = 1 / z0, s1 = 1 / Math.min(z1, ZF), xa = (s) => g.cx + (l - 1.5) * ((2 * hw(g, s)) / 3);
              c.beginPath(); c.moveTo(xa(s0) - 2.2 * s0, sy(g, s0)); c.lineTo(xa(s0) + 2.2 * s0, sy(g, s0)); c.lineTo(xa(s1) + 2.2 * s1, sy(g, s1)); c.lineTo(xa(s1) - 2.2 * s1, sy(g, s1)); c.closePath(); c.fill();
            }
          }
          const list = objs.slice().sort((a, b) => b.z - a.z);
          for (const o of list) {
            const s = 1 / o.z; if (s > 1.5 || s < 0.05) continue;
            const x = lx(g, s, o.l), y = sy(g, s), lw = (2 * hw(g, s)) / 3;
            if (o.k === "car") {
              const w = lw * 0.62, h = w * 1.05;
              c.fillStyle = o.col; c.shadowColor = o.col; c.shadowBlur = 10 * s; rr(c, x - w / 2, y - h, w, h, w * 0.18); c.fill(); c.shadowBlur = 0;
              c.fillStyle = "rgba(10,14,30,.8)"; rr(c, x - w * 0.36, y - h * 0.82, w * 0.72, h * 0.34, w * 0.1); c.fill();
              c.fillStyle = "#ff3b3b"; c.fillRect(x - w * 0.42, y - h * 0.3, w * 0.2, h * 0.1); c.fillRect(x + w * 0.22, y - h * 0.3, w * 0.2, h * 0.1);
            } else if (o.k === "coin") {
              const r = lw * 0.18, sq = Math.abs(Math.cos(G.t * 4 + o.z));
              c.fillStyle = C.gold; c.shadowColor = C.gold; c.shadowBlur = 10 * s; c.beginPath(); c.ellipse(x, y - r * 1.4, Math.max(1, r * sq), r, 0, 0, 7); c.fill(); c.shadowBlur = 0;
            } else {
              const r = lw * 0.26; c.fillStyle = C.turq; c.shadowColor = C.turq; c.shadowBlur = 16 * s; c.beginPath(); c.arc(x, y - r * 1.3, r, 0, 7); c.fill(); c.shadowBlur = 0; text(c, "⚡", x, y - r * 1.3, r * 1.3);
            }
          }
          const pxx = lx(g, 1, laneF) + (shake > 0 ? Math.sin(G.t * 90) * 4 * shake : 0), pw = ((2 * hw(g, 1)) / 3) * 0.62, ph = pw * 1.05, py = g.by;
          if (nitro > 0) { c.fillStyle = "rgba(" + C.t + ",.55)"; c.beginPath(); c.moveTo(pxx - pw * 0.3, py); c.lineTo(pxx, py + 40 + Math.random() * 18); c.lineTo(pxx + pw * 0.3, py); c.fill(); }
          c.fillStyle = C.turq; c.shadowColor = C.turq; c.shadowBlur = nitro > 0 ? 26 : 12; rr(c, pxx - pw / 2, py - ph, pw, ph, pw * 0.2); c.fill(); c.shadowBlur = 0;
          c.fillStyle = C.gold; c.fillRect(pxx - pw * 0.06, py - ph, pw * 0.12, ph);
          suvi(c, pxx, py - ph * 0.55, pw * 0.2, { t: G.t, glow: false, ly: -2 });
          c.fillStyle = "#ff3b3b"; c.fillRect(pxx - pw * 0.44, py - ph * 0.12, pw * 0.2, ph * 0.08); c.fillRect(pxx + pw * 0.24, py - ph * 0.12, pw * 0.2, ph * 0.08);
        },
        down(x, y) { down0 = [x, y]; },
        up(x, y) {
          if (!down0) return; const dx = x - down0[0];
          if (Math.abs(dx) > 26) lane = clamp(lane + (dx > 0 ? 1 : -1), 0, 2);
          else lane = clamp(lane + (x < G.W / 2 ? -1 : 1), 0, 2);
          down0 = null;
        },
        key(e) { if (e.key === "ArrowLeft" || e.key === "a") { lane = clamp(lane - 1, 0, 2); return true; } if (e.key === "ArrowRight" || e.key === "d") { lane = clamp(lane + 1, 0, 2); return true; } }
      };
    }));

    /* =====================================================================
       ۱۰) نبرد کهکشان (فقط اشتراک Plus) — موج‌های دشمن و باس‌های غول‌پیکر
       ===================================================================== */
    reg(defineCanvas({
      id: "galaxy", tier: "plus", emoji: "🛸", title: "نبرد کهکشان", titleEn: "Galaxy Battle",
      desc: "موج‌های دشمن و باس‌های غول‌پیکر", descEn: "Waves of enemies and giant bosses",
      how: "انگشتت رو بکش تا سفینه‌ی سووی حرکت کنه؛ تیراندازی خودکاره. با ⚡ سلاحت قوی‌تر می‌شه، 🛡️ سپر می‌ده و 💣 همه‌ی دشمن‌ها رو می‌زنه. هر ۵ موج یه باس منتظرته!",
      howEn: "Drag to fly Suvi's ship — it fires automatically. ⚡ upgrades your weapon, 🛡️ gives a shield and 💣 blasts every enemy. A boss awaits every 5 waves!"
    }, (G) => {
      let me, bullets, ebul, foes, fx, pups, lives, wave, toSpawn, spT, fire, inv, shield, weapon, boss, waveT, banner, tx, ty, stars;
      function reset() {
        me = { x: G.W / 2, y: G.H * 0.8 }; tx = me.x; ty = me.y; bullets = []; ebul = []; foes = []; fx = []; pups = [];
        lives = 3; wave = 0; toSpawn = 0; spT = 0; fire = 0; inv = 0; shield = 0; weapon = 1; boss = null; waveT = 1; banner = 0;
        stars = Array.from({ length: 50 }, () => { const s = rnd(0.4, 1.6); return { x: rnd(0, G.W), y: rnd(0, G.H), s, c: "rgba(255,255,255," + (0.25 + s * 0.3) + ")" }; });
        G.S.setLives(lives);
      }
      function nextWave() {
        wave++; banner = 2;
        if (wave % 5 === 0) { boss = { x: G.W / 2, y: -80, hp: 50 + wave * 9, max: 50 + wave * 9, ph: 0, sh: 1.2, vx: 90 }; toSpawn = 0; }
        else toSpawn = 5 + wave * 2;
        spT = 0.6;
      }
      function boom(x, y, col, n) { for (let i = 0; i < (n || 10); i++) { const a = rnd(0, 6.28), s = rnd(60, 220); fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.7), col: col || C.gold }); } }
      function hitMe() {
        if (inv > 0) return;
        if (shield > 0) { shield = 0; inv = 0.8; return; }
        lives--; G.S.setLives(lives); weapon = Math.max(1, weapon - 1); inv = 1.6; vib(40); boom(me.x, me.y, C.coral, 16);
        if (lives <= 0) G.S.over(G.S.score, t("موج", "Wave") + " " + toFa(wave));
      }
      function kill(f) { G.S.setScore(G.S.score + (f.t === "c" ? 40 : f.t === "b" ? 20 : 10)); boom(f.x, f.y, f.t === "c" ? C.coral : C.turq, 12); if (Math.random() < 0.11) pups.push({ x: f.x, y: f.y, k: pick(["w", "w", "s", "b"]) }); }
      reset();
      return {
        reset,
        resize() { if (me) { me.x = clamp(me.x, 20, G.W - 20); me.y = clamp(me.y, 40, G.H - 20); } },
        update(dt) {
          me.x += (tx - me.x) * Math.min(1, dt * 16); me.y += (ty - me.y) * Math.min(1, dt * 16);
          me.x = clamp(me.x, 20, G.W - 20); me.y = clamp(me.y, 60, G.H - 24);
          inv = Math.max(0, inv - dt); shield = Math.max(0, shield - dt); banner = Math.max(0, banner - dt);
          for (const s of stars) { s.y += 40 * s.s * dt * 3; if (s.y > G.H) { s.y = 0; s.x = rnd(0, G.W); } }
          fire -= dt;
          if (fire <= 0) {
            fire = 0.17;
            const mk = (dx, vx) => bullets.push({ x: me.x + dx, y: me.y - 18, vx: vx || 0, vy: -640 });
            if (weapon === 1) mk(0); else if (weapon === 2) { mk(-9); mk(9); } else { mk(0); mk(-12, -90); mk(12, 90); }
          }
          for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
          keep(bullets, (b) => b.y > -20 && b.x > -20 && b.x < G.W + 20);
          // موج‌ها
          if (!boss && toSpawn <= 0 && foes.length === 0) { waveT -= dt; if (waveT <= 0) { nextWave(); waveT = 1.4; } }
          if (toSpawn > 0) {
            spT -= dt;
            if (spT <= 0) {
              spT = Math.max(0.35, 0.9 - wave * 0.04); toSpawn--;
              const r = Math.random(), tp = wave >= 4 && r < 0.2 ? "c" : wave >= 2 && r < 0.5 ? "b" : "a";
              foes.push({ t: tp, x: rnd(30, G.W - 30), y: -30, x0: 0, hp: tp === "c" ? 4 : tp === "b" ? 2 : 1, vy: (tp === "c" ? 70 : 90) + wave * 6 + rnd(0, 40), ph: rnd(0, 6), sh: rnd(0.8, 1.6) });
              foes[foes.length - 1].x0 = foes[foes.length - 1].x;
            }
          }
          for (const f of foes) {
            f.ph += dt * 2.4;
            if (f.t === "b") { f.y += f.vy * dt; f.x = clamp(f.x0 + Math.sin(f.ph) * 70, 20, G.W - 20); }
            else if (f.t === "c") { if (f.y < G.H * 0.22) f.y += f.vy * dt; else f.y += 8 * dt; f.sh -= dt; if (f.sh <= 0) { f.sh = Math.max(0.9, 1.7 - wave * 0.04); const a = Math.atan2(me.y - f.y, me.x - f.x); ebul.push({ x: f.x, y: f.y + 10, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230 }); } }
            else f.y += f.vy * dt;
          }
          if (boss) {
            if (boss.y < 90) boss.y += 70 * dt; else {
              boss.x += boss.vx * dt; if (boss.x < 70) { boss.x = 70; boss.vx = Math.abs(boss.vx); } if (boss.x > G.W - 70) { boss.x = G.W - 70; boss.vx = -Math.abs(boss.vx); }
              boss.sh -= dt;
              if (boss.sh <= 0) {
                boss.sh = 1.15; boss.ph++;
                const n = 5 + Math.min(4, Math.floor(wave / 5)), base = boss.ph % 2 ? 0 : 0.3;
                for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.32 + base * (i % 2 ? 1 : -1) * 0.2; ebul.push({ x: boss.x, y: boss.y + 36, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 }); }
              }
            }
          }
          for (const e of ebul) { e.x += e.vx * dt; e.y += e.vy * dt; }
          keep(ebul, (e) => e.y < G.H + 20 && e.y > -30 && e.x > -30 && e.x < G.W + 30);
          // برخوردها
          for (const b of bullets) {
            if (b.dead) continue;
            for (const f of foes) { if (!f.dead && Math.abs(b.x - f.x) < 22 && Math.abs(b.y - f.y) < 22) { f.hp--; b.dead = true; if (f.hp <= 0) { f.dead = true; kill(f); } else boom(b.x, b.y, "#fff", 3); break; } }
            if (!b.dead && boss && boss.y >= 90 && Math.abs(b.x - boss.x) < 62 && Math.abs(b.y - boss.y) < 40) {
              b.dead = true; boss.hp--; boom(b.x, b.y, "#fff", 2);
              if (boss.hp <= 0) { G.S.setScore(G.S.score + 500); boom(boss.x, boss.y, C.gold, 50); boom(boss.x, boss.y, C.coral, 30); boss = null; ebul = []; lives = Math.min(5, lives + 1); G.S.setLives(lives); waveT = 1.2; vib(60); }
            }
          }
          keep(bullets, (b) => !b.dead); keep(foes, (f) => !f.dead && f.y < G.H + 40);
          for (const f of foes) if (!f.dead && Math.hypot(f.x - me.x, f.y - me.y) < 26) { f.dead = true; boom(f.x, f.y, C.coral, 10); hitMe(); }
          keep(foes, (f) => !f.dead);
          for (const e of ebul) if (!e.dead && Math.hypot(e.x - me.x, e.y - me.y) < 14) { e.dead = true; hitMe(); }
          keep(ebul, (e) => !e.dead);
          if (boss && boss.y >= 90 && Math.abs(boss.x - me.x) < 60 && Math.abs(boss.y - me.y) < 40) hitMe();
          for (const p of pups) {
            p.y += 90 * dt;
            if (!p.dead && Math.hypot(p.x - me.x, p.y - me.y) < 28) {
              p.dead = true;
              if (p.k === "w") weapon = Math.min(3, weapon + 1);
              else if (p.k === "s") shield = 7;
              else { for (const f of foes) { f.hp -= 6; if (f.hp <= 0 && !f.dead) { f.dead = true; kill(f); } } if (boss) boss.hp -= 12; ebul = []; boom(me.x, me.y - 60, C.turq, 40); }
            }
          }
          keep(foes, (f) => !f.dead); keep(pups, (p) => !p.dead && p.y < G.H + 20);
          if (boss && boss.hp <= 0) { G.S.setScore(G.S.score + 500); boom(boss.x, boss.y, C.gold, 50); boss = null; waveT = 1.2; }
          for (const f of fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; }
          keep(fx, (f) => f.life > 0);
          if (fx.length > 260) fx.splice(0, fx.length - 260);
        },
        draw(c, W, H) {
          bg(c, W, H, "#070b1f", "#04060f");
          for (const s of stars) { c.fillStyle = s.c; c.fillRect(s.x, s.y, s.s * 1.5, s.s * 1.5 + 1); }
          if (bullets.length) { c.fillStyle = "rgba(" + C.g + ",.28)"; c.beginPath(); for (const b of bullets) c.rect(b.x - 5, b.y - 12, 10, 20); c.fill(); c.fillStyle = C.gold; c.beginPath(); for (const b of bullets) c.rect(b.x - 2, b.y - 9, 4, 14); c.fill(); }
          c.shadowBlur = 0;
          if (ebul.length) { c.fillStyle = "rgba(255,122,107,.3)"; c.beginPath(); for (const e of ebul) { c.moveTo(e.x + 9, e.y); c.arc(e.x, e.y, 9, 0, 7); } c.fill(); c.fillStyle = C.coral; c.beginPath(); for (const e of ebul) { c.moveTo(e.x + 5, e.y); c.arc(e.x, e.y, 5, 0, 7); } c.fill(); }
          c.shadowBlur = 0;
          for (const f of foes) {
            c.save(); c.translate(f.x, f.y);
            const col = f.t === "c" ? C.coral : f.t === "b" ? C.ind : "#a78bfa";
            c.fillStyle = col; c.globalAlpha = 0.18; c.beginPath(); c.arc(0, 0, 24, 0, 7); c.fill(); c.globalAlpha = 1;
            c.beginPath(); c.moveTo(0, 18); c.lineTo(-20, -10); c.lineTo(-8, -4); c.lineTo(0, -16); c.lineTo(8, -4); c.lineTo(20, -10); c.closePath(); c.fill(); c.shadowBlur = 0;
            c.fillStyle = "#fff"; c.beginPath(); c.arc(-5, 0, 3, 0, 7); c.arc(5, 0, 3, 0, 7); c.fill(); c.fillStyle = "#111"; c.beginPath(); c.arc(-5, 1, 1.5, 0, 7); c.arc(5, 1, 1.5, 0, 7); c.fill();
            c.restore();
          }
          if (boss) {
            c.save(); c.translate(boss.x, boss.y); c.shadowColor = C.coral; c.shadowBlur = 14;
            const g = c.createLinearGradient(-70, 0, 70, 0); g.addColorStop(0, "#7c3aed"); g.addColorStop(0.5, C.coral); g.addColorStop(1, "#7c3aed"); c.fillStyle = g;
            c.beginPath(); c.moveTo(0, 44); c.lineTo(-70, -6); c.lineTo(-52, -30); c.lineTo(-18, -18); c.lineTo(0, -36); c.lineTo(18, -18); c.lineTo(52, -30); c.lineTo(70, -6); c.closePath(); c.fill(); c.shadowBlur = 0;
            c.fillStyle = "#fff"; c.beginPath(); c.ellipse(-16, 0, 9, 11, 0, 0, 7); c.ellipse(16, 0, 9, 11, 0, 0, 7); c.fill(); c.fillStyle = "#1a0a1e"; c.beginPath(); c.arc(-16, 3, 4.5, 0, 7); c.arc(16, 3, 4.5, 0, 7); c.fill();
            c.restore();
            c.fillStyle = "rgba(255,255,255,.15)"; rr(c, W * 0.15, 14, W * 0.7, 9, 5); c.fill();
            c.fillStyle = C.coral; rr(c, W * 0.15, 14, Math.max(6, W * 0.7 * (boss.hp / boss.max)), 9, 5); c.fill();
          }
          for (const p of pups) { c.strokeStyle = p.k === "w" ? C.gold : p.k === "s" ? C.turq : C.coral; c.lineWidth = 3; c.shadowColor = c.strokeStyle; c.shadowBlur = 12; c.beginPath(); c.arc(p.x, p.y, 13, 0, 7); c.stroke(); c.shadowBlur = 0; text(c, p.k === "w" ? "⚡" : p.k === "s" ? "🛡️" : "💣", p.x, p.y + 1, 13); }
          for (const f of fx) { c.globalAlpha = clamp(f.life * 2, 0, 1); c.fillStyle = f.col; c.fillRect(f.x - 2, f.y - 2, 4, 4); }
          c.globalAlpha = 1;
          if (inv <= 0 || Math.floor(G.t * 14) % 2) {
            c.save(); c.translate(me.x, me.y);
            c.fillStyle = C.turqD; c.shadowColor = C.turq; c.shadowBlur = 14;
            c.beginPath(); c.moveTo(0, -24); c.lineTo(-24, 18); c.lineTo(-9, 11); c.lineTo(0, 20); c.lineTo(9, 11); c.lineTo(24, 18); c.closePath(); c.fill(); c.shadowBlur = 0;
            c.fillStyle = C.gold; c.beginPath(); c.moveTo(-24, 18); c.lineTo(-17, 6); c.lineTo(-12, 15); c.closePath(); c.fill(); c.beginPath(); c.moveTo(24, 18); c.lineTo(17, 6); c.lineTo(12, 15); c.closePath(); c.fill();
            c.fillStyle = "rgba(255,160,60,.9)"; c.beginPath(); c.moveTo(-5, 18); c.lineTo(0, 30 + Math.random() * 8); c.lineTo(5, 18); c.fill();
            c.restore();
            suvi(c, me.x, me.y - 2, 9, { t: G.t, glow: false });
          }
          if (shield > 0) { c.strokeStyle = "rgba(" + C.t + "," + (0.5 + 0.3 * Math.sin(G.t * 8)) + ")"; c.lineWidth = 3; c.beginPath(); c.arc(me.x, me.y, 32, 0, 7); c.stroke(); }
          if (banner > 0) text(c, boss ? t("⚠️ باس! موج ", "⚠️ BOSS! Wave ") + toFa(wave) : t("موج ", "Wave ") + toFa(wave), W / 2, H * 0.4, 30, "rgba(255,255,255," + Math.min(1, banner) + ")");
        },
        down(x, y) { tx = x; ty = y - 70; },
        move(x, y) { tx = x; ty = y - 70; },
        key(e) {
          if (e.key === "ArrowLeft") { tx -= 70; return true; } if (e.key === "ArrowRight") { tx += 70; return true; }
          if (e.key === "ArrowUp") { ty -= 70; return true; } if (e.key === "ArrowDown") { ty += 70; return true; }
        }
      };
    }));

  } catch (e) {
    console.warn("Suvreno games skipped:", e && e.message || e);
  }
})();
