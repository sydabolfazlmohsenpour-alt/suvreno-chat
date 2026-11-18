/* =====================================================================
   Suvreno — مجلس مشورت (Council)
   فایل مستقل: اگر لود نشود یا خطا بدهد، بقیه‌ی اپ دست‌نخورده می‌ماند.
   - دکمه در منوی ＋  - انتخاب شخصیت‌ها (۲ تا ۴)  - پیشنهاد خودکار وقتی کاربر مردد است
   ===================================================================== */
(function () {
  "use strict";
  try {
    var WORKER = "https://suvreno.sydabolfazlmohsenpour.workers.dev/";
    var $ = function (id) { return document.getElementById(id); };
    var isEn = function () { try { return localStorage.getItem("AM_LANG_PREF") === "en"; } catch (e) { return false; } };
    var t = function (fa, en) { return isEn() ? en : fa; };
    var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

    var PERSONAS = [
      { id: "optimist", ic: "🌞", fa: "خوش‌بین", en: "Optimist" },
      { id: "pessimist", ic: "🌧️", fa: "بدبین", en: "Pessimist" },
      { id: "logic", ic: "🧠", fa: "منطقی", en: "Logician" },
      { id: "money", ic: "💰", fa: "متخصص پول", en: "Money Expert" },
      { id: "future", ic: "🔮", fa: "خودِ ده‌سال بعد", en: "You in 10 Years" },
      { id: "friend", ic: "🤝", fa: "رفیق صمیمی", en: "Best Friend" },
      { id: "devil", ic: "😈", fa: "وکیل شیطان", en: "Devil's Advocate" },
      { id: "heart", ic: "💗", fa: "صدای دل", en: "Inner Voice" }
    ];
    var ICON = {}; PERSONAS.forEach(function (p) { ICON[p.fa] = p.ic; ICON[p.en] = p.ic; });

    /* ---------- استایل ---------- */
    var css = "" +
      ".cn-ov{position:fixed;inset:0;z-index:9999;background:rgba(3,7,14,.66);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:0}" +
      "@media(min-width:700px){.cn-ov{align-items:center;padding:20px}}" +
      ".cn-card{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:var(--sv-surface-solid,#0a1120);color:var(--text,#f4f7fb);border:1px solid var(--border,rgba(255,255,255,.12));border-radius:22px 22px 0 0;padding:18px 16px 20px;box-shadow:0 20px 60px rgba(0,0,0,.5)}" +
      "@media(min-width:700px){.cn-card{border-radius:22px}}" +
      ".cn-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}" +
      ".cn-h h2{margin:0;font-size:19px}" +
      ".cn-x{background:var(--sv-glass,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.12));color:inherit;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer}" +
      ".cn-sub{margin:0 0 12px;color:var(--muted,#8e9bb0);font-size:13px;line-height:1.7}" +
      ".cn-q{width:100%;min-height:84px;resize:vertical;box-sizing:border-box;background:var(--sv-glass,rgba(255,255,255,.05));color:inherit;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:14px;padding:10px 12px;font:inherit;font-size:14px;line-height:1.8}" +
      ".cn-l{margin:12px 0 6px;font-size:13px;color:var(--muted,#8e9bb0)}" +
      ".cn-chips{display:flex;flex-wrap:wrap;gap:8px}" +
      ".cn-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;border:1px solid var(--border,rgba(255,255,255,.12));background:var(--sv-glass,rgba(255,255,255,.05));color:inherit;font:inherit;font-size:13px;cursor:pointer}" +
      ".cn-chip.on{background:linear-gradient(135deg,rgba(45,226,200,.28),rgba(255,200,87,.22));border-color:var(--sv-turq,#2de2c8)}" +
      ".cn-custom{display:flex;gap:8px;margin-top:8px}" +
      ".cn-custom input{flex:1;min-width:0;box-sizing:border-box;background:var(--sv-glass,rgba(255,255,255,.05));color:inherit;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:12px;padding:9px 12px;font:inherit;font-size:13px}" +
      ".cn-go{width:100%;margin-top:16px;padding:13px;border:0;border-radius:14px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;background:linear-gradient(135deg,#2de2c8,#ffc857);color:var(--sv-on-accent,#04141a)}" +
      ".cn-go[disabled]{opacity:.55;cursor:default}" +
      ".cn-err{margin-top:10px;color:#ff8a7b;font-size:13px;line-height:1.7;min-height:1px}" +
      ".cn-res{border:1px solid var(--border,rgba(255,255,255,.12));background:var(--sv-glass,rgba(255,255,255,.05));border-radius:18px;padding:12px;margin:4px 0;max-width:100%}" +
      ".cn-res h3{margin:0 0 8px;font-size:15px}" +
      ".cn-q0{font-size:12.5px;color:var(--muted,#8e9bb0);margin:0 0 10px;line-height:1.8}" +
      ".cn-t{display:flex;gap:9px;margin:9px 0;animation:cnIn .35s ease both}" +
      ".cn-av{flex:none;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--sv-glass,rgba(255,255,255,.07));border:1px solid var(--border,rgba(255,255,255,.12))}" +
      ".cn-b{min-width:0}.cn-n{font-size:12px;font-weight:700;color:var(--sv-turq,#2de2c8);margin-bottom:2px}" +
      ".cn-tx{font-size:14px;line-height:1.9;white-space:pre-wrap;word-break:break-word}" +
      ".cn-sum{margin-top:12px;padding:12px;border-radius:14px;border:1px solid var(--sv-gold,#ffc857);background:rgba(255,200,87,.08);animation:cnIn .4s ease both}" +
      ".cn-sum .cn-n{color:var(--sv-gold,#ffc857)}" +
      ".cn-wait{font-size:13px;color:var(--muted,#8e9bb0);padding:6px 2px}" +
      ".cn-chipbar{display:none;align-items:center;gap:8px;margin:0 0 8px;padding:8px 10px;border-radius:14px;border:1px solid var(--sv-turq,#2de2c8);background:rgba(45,226,200,.10);font-size:13px}" +
      ".cn-chipbar.show{display:flex;animation:cnIn .3s ease both}" +
      ".cn-chipbar button{font:inherit;cursor:pointer;border-radius:10px;border:0}" +
      ".cn-chipbar .cn-yes{background:linear-gradient(135deg,#2de2c8,#ffc857);color:var(--sv-on-accent,#04141a);padding:6px 10px;font-weight:700}" +
      ".cn-chipbar .cn-no{background:transparent;color:inherit;padding:4px 8px;font-size:16px}" +
      ".cn-chipbar span{flex:1}" +
      ".messages:has(.cn-res)~#suvHero,.messages:has(.cn-res)~.welcome-info{display:none!important}" +
      ".message.ai.cn-row{justify-content:center}" +
      ".message.ai.cn-row .bubble-col{width:100%;max-width:640px;align-items:stretch}" +
      ".cn-row .bubble{width:100%;padding:0;background:none;border:0;border-radius:0;backdrop-filter:none;-webkit-backdrop-filter:none;white-space:normal}" +
      ".cn-res{direction:rtl;text-align:right;white-space:normal;background:var(--sv-surface-solid,#0a1120);padding:14px;border-radius:18px}" +
      ".cn-res .cn-tx{color:var(--text,#f4f7fb)}" +
      ".cn-res .cn-sum{background:rgba(255,200,87,.10)}" +
      ".cn-res .cn-b{flex:1}" +
      "@keyframes cnIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}";
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

    /* ---------- کمک‌ها ---------- */
    function lastUserText() {
      var nodes = document.querySelectorAll("#messages .message.user .bubble, #messages .message.user");
      for (var i = nodes.length - 1; i >= 0; i--) {
        var tx = (nodes[i].innerText || "").trim();
        if (tx) return tx.slice(0, 1200);
      }
      return "";
    }
    function chatContext() {
      try {
        var rows = Array.prototype.slice.call(document.querySelectorAll("#messages .message.user, #messages .message.ai")).slice(-6);
        return rows.map(function (r) { return (r.classList.contains("user") ? "User: " : "Assistant: ") + (r.innerText || "").trim().slice(0, 300); }).join("\n").slice(0, 1500);
      } catch (e) { return ""; }
    }
    function authBody() {
      var b = {};
      try { var s = localStorage.getItem("SUVRENO_SESSION"); if (s) b.sessionToken = s; } catch (e) {}
      try { var d = localStorage.getItem("AM_AI_DEVICE_ID"); if (d) b.userId = d; } catch (e) {}
      return b;
    }
    function scrollDown() { var m = $("messages"); if (m) m.scrollTop = m.scrollHeight; }

    /* ---------- پنجره‌ی انتخاب ---------- */
    var selected = ["optimist", "pessimist", "logic"];
    var busy = false;

    function amIsGuest() { try { return typeof window.__amIsGuest === "function" && window.__amIsGuest() === true; } catch (e) { return false; } }
    function openModal(prefill) {
      if (amIsGuest()) { try { window.amGuestModal && window.amGuestModal(); } catch (e) {} return; }
      if (document.getElementById("cnOv")) return;
      var ov = document.createElement("div"); ov.className = "cn-ov"; ov.id = "cnOv";
      var q0 = prefill || (($("messageInput") || {}).value || "").trim() || lastUserText();
      ov.innerHTML =
        '<div class="cn-card" role="dialog" aria-modal="true">' +
        '<div class="cn-h"><h2>🏛️ ' + esc(t("مجلس مشورت", "The Council")) + '</h2><button class="cn-x" type="button" id="cnClose" aria-label="close">×</button></div>' +
        '<p class="cn-sub">' + esc(t("چند شخصیت درباره‌ی تصمیمت با هم بحث می‌کنن و آخرش یه جمع‌بندی می‌گیری.", "Several characters debate your decision, then you get a summary.")) + '</p>' +
        '<textarea class="cn-q" id="cnQ" maxlength="1200" placeholder="' + esc(t("درباره‌ی چی مردد هستی؟ مثلاً: برم دانشگاه یا کار کنم؟", "What are you torn about? e.g. study abroad or take the job?")) + '"></textarea>' +
        '<div class="cn-l">' + esc(t("شخصیت‌ها رو انتخاب کن (۲ تا ۴ تا)", "Pick your council (2 to 4)")) + '</div>' +
        '<div class="cn-chips" id="cnChips"></div>' +
        '<div class="cn-l">' + esc(t("یا شخصیت دلخواه خودت (اختیاری)", "Or add your own character (optional)")) + '</div>' +
        '<div class="cn-custom"><input id="cnCName" maxlength="30" placeholder="' + esc(t("مثلاً: مادربزرگ", "e.g. Grandma")) + '"></div>' +
        '<button class="cn-go" id="cnGo" type="button">' + esc(t("شروع مجلس", "Start the council")) + '</button>' +
        '<div class="cn-err" id="cnErr"></div></div>';
      document.body.appendChild(ov);
      $("cnQ").value = q0;
      renderChips();
      ov.addEventListener("click", function (e) { if (e.target === ov) closeModal(); });
      $("cnClose").addEventListener("click", closeModal);
      $("cnGo").addEventListener("click", start);
      $("cnCName").addEventListener("input", renderChips);
    }
    function closeModal() { var o = document.getElementById("cnOv"); if (o) o.remove(); }

    function customName() { var c = $("cnCName"); return c ? c.value.trim().slice(0, 30) : ""; }
    function totalCount() { return selected.length + (customName() ? 1 : 0); }
    function renderChips() {
      var box = $("cnChips"); if (!box) return;
      box.innerHTML = "";
      PERSONAS.forEach(function (p) {
        var b = document.createElement("button"); b.type = "button";
        b.className = "cn-chip" + (selected.indexOf(p.id) >= 0 ? " on" : "");
        b.textContent = p.ic + " " + t(p.fa, p.en);
        b.addEventListener("click", function () {
          var i = selected.indexOf(p.id);
          if (i >= 0) selected.splice(i, 1);
          else if (totalCount() < 4) selected.push(p.id);
          renderChips();
        });
        box.appendChild(b);
      });
      var go = $("cnGo"); if (go) go.disabled = totalCount() < 2 || busy;
    }

    async function start() {
      if (busy) return;
      var q = ($("cnQ").value || "").trim(), err = $("cnErr");
      if (q.length < 4) { err.textContent = t("اول بنویس درباره‌ی چی مردد هستی.", "Write what you are torn about first."); return; }
      if (totalCount() < 2) { err.textContent = t("حداقل ۲ شخصیت انتخاب کن.", "Pick at least 2 characters."); return; }
      busy = true; err.textContent = "";
      var go = $("cnGo"); go.disabled = true; go.textContent = t("در حال جمع‌کردن مجلس…", "Gathering the council…");
      var personas = selected.slice(); var cn = customName();
      if (cn) personas.push({ custom: true, name: cn, desc: "" });
      var body = Object.assign({ mode: "council", question: q, personas: personas, context: chatContext() }, authBody());
      var data = null;
      try {
        var ctl = new AbortController(); var to = setTimeout(function () { ctl.abort(); }, 70000);
        var res = await fetch(WORKER, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
        clearTimeout(to); data = await res.json();
      } catch (e) { data = null; }
      busy = false;
      if (!data || !data.ok) {
        go.disabled = false; go.textContent = t("شروع مجلس", "Start the council");
        err.textContent = (data && data.message) || t("اتصال برقرار نشد؛ دوباره امتحان کن.", "Connection failed; please try again.");
        return;
      }
      closeModal();
      showResult(q, data);
    }

    /* ---------- نمایش نتیجه داخل چت ---------- */
    function showResult(q, data) {
      var msgs = $("messages"); if (!msgs) return;
      var wl = $("welcomeLogoWrap"); if (wl) wl.remove();
      var row = document.createElement("div"); row.className = "message ai cn-row";
      var col = document.createElement("div"); col.className = "bubble-col";
      var bub = document.createElement("div"); bub.className = "bubble";
      var card = document.createElement("div"); card.className = "cn-res";
      card.innerHTML = '<h3>🏛️ ' + esc(t("مجلس مشورت", "The Council")) + '</h3><p class="cn-q0">' + esc(q) + '</p>';
      bub.appendChild(card); col.appendChild(bub); row.appendChild(col); msgs.appendChild(row); scrollDown();
      var turns = Array.isArray(data.turns) ? data.turns : [];
      var i = 0;
      function next() {
        if (i < turns.length) {
          var tr = turns[i++];
          var d = document.createElement("div"); d.className = "cn-t";
          d.innerHTML = '<div class="cn-av">' + esc(ICON[tr.who] || "💬") + '</div><div class="cn-b"><div class="cn-n">' + esc(tr.who) + '</div><div class="cn-tx">' + esc(tr.text) + '</div></div>';
          card.appendChild(d); scrollDown(); setTimeout(next, 650);
        } else if (data.summary) {
          var s = document.createElement("div"); s.className = "cn-sum";
          s.innerHTML = '<div class="cn-n">⚖️ ' + esc(t("جمع‌بندی", "Summary")) + '</div><div class="cn-tx">' + esc(data.summary) + '</div>';
          card.appendChild(s); scrollDown();
        }
      }
      next();
    }

    /* ---------- دکمه در منوی ＋ ---------- */
    function addMenuButton() {
      var menu = $("composerMenu"); if (!menu || $("svMenuCouncil")) return;
      var b = document.createElement("button"); b.type = "button"; b.id = "svMenuCouncil";
      b.innerHTML = '<span>🏛️</span><span data-fa="مجلس مشورت" data-en="The Council">' + esc(t("مجلس مشورت", "The Council")) + '</span>';
      b.addEventListener("click", function () { menu.classList.remove("show"); openModal(); });
      menu.insertBefore(b, menu.firstChild);
    }

    /* ---------- پیشنهاد خودکار وقتی کاربر مردد است ---------- */
    var UNDECIDED = /(نمی[‌ ]?دون(?:م|ی)|مردد|دو\s*راهی|کدوم(?:ش)?\s*(?:رو|بهتر)|کدام\s*(?:بهتر|را)|بهتره[^؟\n]{0,60}یا\s|ترجیح|تصمیم(?:\s*گرفتن|\s*بگیرم)?|انتخاب\s*کنم|برم\s[^؟\n]{0,40}یا\s|should i|can'?t decide|torn between|which (?:one )?is better|or should i|not sure (?:if|whether))/i;
    var lastSuggest = 0, barTimer = null;

    function ensureBar() {
      var bar = $("cnBar"); if (bar) return bar;
      var wrap = document.querySelector(".composer-wrap"); if (!wrap) return null;
      bar = document.createElement("div"); bar.className = "cn-chipbar"; bar.id = "cnBar";
      bar.innerHTML = '<span id="cnBarTx"></span><button class="cn-yes" type="button" id="cnBarYes"></button><button class="cn-no" type="button" id="cnBarNo" aria-label="close">×</button>';
      wrap.insertBefore(bar, wrap.firstChild);
      $("cnBarNo").addEventListener("click", hideBar);
      return bar;
    }
    function hideBar() { var b = $("cnBar"); if (b) b.classList.remove("show"); if (barTimer) { clearTimeout(barTimer); barTimer = null; } }
    function suggest(q) {
      if (amIsGuest()) return;
      var bar = ensureBar(); if (!bar) return;
      $("cnBarTx").textContent = t("مردد به نظر می‌رسی 🤔 مجلس مشورت رو امتحان کن؟", "Sounds like a tough call 🤔 Try the Council?");
      var yes = $("cnBarYes"); yes.textContent = t("باز کن", "Open");
      yes.onclick = function () { hideBar(); openModal(q); };
      bar.classList.add("show");
      if (barTimer) clearTimeout(barTimer);
      barTimer = setTimeout(hideBar, 20000);
    }
    function watchMessages() {
      var msgs = $("messages"); if (!msgs) return;
      var obs = new MutationObserver(function (list) {
        list.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            try {
              if (!(n instanceof HTMLElement) || !n.classList.contains("message") || !n.classList.contains("user")) return;
              var tx = (n.innerText || "").trim();
              if (tx.length < 12 || tx.length > 700) return;
              if (!UNDECIDED.test(tx)) return;
              if (Date.now() - lastSuggest < 180000) return;
              lastSuggest = Date.now();
              setTimeout(function () { suggest(tx); }, 1800);
            } catch (e) {}
          });
        });
      });
      obs.observe(msgs, { childList: true });
    }

    function boot() { try { addMenuButton(); watchMessages(); } catch (e) { console.error("COUNCIL_BOOT", e); } }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
    window.SuvCouncil = { open: openModal };
  } catch (e) { try { console.error("COUNCIL_INIT", e); } catch (x) {} }
})();
