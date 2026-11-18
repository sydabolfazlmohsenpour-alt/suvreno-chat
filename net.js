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
