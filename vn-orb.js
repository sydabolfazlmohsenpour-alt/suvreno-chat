/* =====================================================
   Suvreno — کره ذرات سه‌بعدی برای دفترچه صوتی
   - هزاران نقطه نورانی که یک کره سه‌بعدی می‌سازن
   - با حالت (گوش دادن / فکر کردن / حرف زدن / قطع) و
     شدت واقعی صدای کاربر تغییر شکل می‌دن
   - اگه این فایل لود نشه، ظاهر قبلی دست‌نخورده می‌مونه
   ===================================================== */
(function () {
    "use strict";

    var orb = document.getElementById("voiceNotebookOrb");
    var modal = document.getElementById("voiceNotebookModal");
    if (!orb || !modal) return;

    var canvas = document.createElement("canvas");
    canvas.className = "vn-pcanvas";
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    orb.appendChild(canvas);
    orb.classList.add("vn-p-on");

    /* ---------- ذرات ---------- */
    var weak = (navigator.hardwareConcurrency || 8) <= 4;
    var N = 640;                                  // کل نقاط روی کره
    var nActive = weak ? 320 : 540;               // تعداد نقاطی که واقعاً رسم می‌شن (خودکار کم می‌شه)
    var B = 24;                                   // تعداد رنگ‌ها
    var D = 4;                                    // سطح‌های عمق (شفافیت)
    var DA = [0.3, 0.52, 0.76, 1];

    var px = new Float32Array(N);
    var py = new Float32Array(N);
    var pz = new Float32Array(N);
    var ph = new Float32Array(N);
    var bk = new Uint8Array(N);

    var GOLDEN = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
        var y = 1 - 2 * (i + 0.5) / N;
        var r = Math.sqrt(Math.max(0, 1 - y * y));
        var th = i * GOLDEN;
        px[i] = Math.cos(th) * r;
        py[i] = y;
        pz[i] = Math.sin(th) * r;
        ph[i] = (i * 0.61803398875 % 1) * 6.2831853;
        var frac = (th % 6.2831853) / 6.2831853;
        bk[i] = Math.floor(((y * 0.5 + 0.5) * 0.6 + frac * 0.4) * B) % B;
    }

    /* ---------- رنگ‌ها: آبی → بنفش → صورتی (چرخه‌ای) ---------- */
    var C0 = [57, 199, 255], C1 = [118, 92, 255], C2 = [233, 87, 255];

    function mix(a, b, u) {
        return [
            Math.round(a[0] + (b[0] - a[0]) * u),
            Math.round(a[1] + (b[1] - a[1]) * u),
            Math.round(a[2] + (b[2] - a[2]) * u)
        ];
    }

    /* رنگ‌های کره از تمِ رنگیِ انتخاب‌شده می‌آیند: --ac1 → --ac3 → --ac2 */
    function readTheme() {
        try {
            var cs = getComputedStyle(document.documentElement);
            var rd = function (n, d) {
                var m = (cs.getPropertyValue(n) || "").trim().match(/^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/);
                return m ? [+m[1], +m[2], +m[3]] : d;
            };
            C0 = rd("--ac1-rgb", C0); C1 = rd("--ac3-rgb", C1); C2 = rd("--ac2-rgb", C2);
        } catch (e) {}
    }

    var sprites = [];
    function buildSprites() {
        readTheme();
        sprites = [];
        for (var s = 0; s < B; s++) {
            var m = 0.5 - 0.5 * Math.cos((s / B) * 6.2831853);   // 0 → 1 → 0
            var col = m < 0.5 ? mix(C0, C1, m * 2) : mix(C1, C2, (m - 0.5) * 2);
            var row = [];
            for (var dd = 0; dd < D; dd++) {
                var sc = document.createElement("canvas");
                sc.width = sc.height = 24;
                var sx = sc.getContext("2d");
                var g = sx.createRadialGradient(12, 12, 0, 12, 12, 12);
                var al = DA[dd];
                g.addColorStop(0, "rgba(255,255,255," + (0.95 * al).toFixed(2) + ")");
                g.addColorStop(0.25, "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + (0.9 * al).toFixed(2) + ")");
                g.addColorStop(1, "rgba(" + col[0] + "," + col[1] + "," + col[2] + ",0)");
                sx.fillStyle = g;
                sx.fillRect(0, 0, 24, 24);
                row.push(sc);
            }
            sprites.push(row);
        }
    }
    buildSprites();
    try {
        new MutationObserver(function () { buildSprites(); })
            .observe(document.documentElement, { attributes: true, attributeFilter: ["data-color"] });
    } catch (e) {}

    /* ---------- حالت‌ها ---------- */
    function getState() {
        var c = orb.classList;
        if (c.contains("vn-muted")) return "muted";
        if (c.contains("vn-error")) return "error";
        if (c.contains("vn-processing")) return "processing";
        if (c.contains("vn-speaking")) return "speaking";
        if (c.contains("vn-listening")) return "listening";
        return "idle";
    }

    function targets(st, t) {
        switch (st) {
            case "listening":
                return { speed: 0.4, amp: 0.05, alpha: 1, scale: 1, twist: 0, voice: 1, size: 1.1, shimmer: 0 };
            case "processing":
                return { speed: 1.5, amp: 0.09, alpha: 0.95, scale: 0.93 + 0.03 * Math.sin(t * 3), twist: 1.2 * Math.sin(t * 1.3), voice: 0, size: 0.95, shimmer: 8 };
            case "speaking":
                return { speed: 0.7, amp: 0.07, alpha: 1, scale: 1.02, twist: 0, voice: 1.3, size: 1.15, shimmer: 0 };
            case "muted":
                return { speed: 0.06, amp: 0.01, alpha: 0.28, scale: 0.94, twist: 0, voice: 0, size: 0.9, shimmer: 0 };
            case "error":
                return { speed: 0.5, amp: 0.12, alpha: 0.9, scale: 1, twist: 0, voice: 0, size: 1, shimmer: 0 };
            default:
                return { speed: 0.28, amp: 0.035, alpha: 0.85, scale: 1 + 0.02 * Math.sin(t * 1.4), twist: 0, voice: 0, size: 1, shimmer: 0 };
        }
    }

    var cur = { speed: 0.28, amp: 0.035, alpha: 0.85, scale: 1, twist: 0, voice: 0, size: 1, shimmer: 0 };
    var W = 0, H = 0, dpr = 1;
    var last = 0, t = 0, ay = 0, lvl = 0;
    var frameNo = 0, slowCount = 0, costAvg = 0;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 1.25);
        var w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) { W = 0; return; }
        var nw = Math.round(w * dpr), nh = Math.round(h * dpr);
        if (canvas.width !== nw || canvas.height !== nh) {
            canvas.width = nw;
            canvas.height = nh;
        }
        W = nw;
        H = nh;
    }

    function frame(ts) {
        if (!modal.classList.contains("show") || document.hidden) {
            last = 0;
            setTimeout(function () { requestAnimationFrame(frame); }, 400);
            return;
        }

        var el = last ? ts - last : 33;
        var stNow = getState();
        var minGap = (stNow === "idle" || stNow === "muted") ? 48 : (stNow === "processing" ? 40 : 30);
        if (el < minGap - 2) { requestAnimationFrame(frame); return; }
        last = ts;
        var dt = Math.min(0.06, el / 1000);
        t += dt;

        if (!W || frameNo % 45 === 0) resize();
        if (!W) { requestAnimationFrame(frame); return; }
        var t0 = (window.performance && performance.now) ? performance.now() : 0;
        frameNo++;
        if (el > 42) slowCount++;

        var st = getState();
        var tg = targets(st, t);
        var k = 1 - Math.exp(-dt * 4);
        for (var key in tg) cur[key] += (tg[key] - cur[key]) * k;

        /* شدت صدا: صدای واقعی کاربر در حالت گوش دادن، شبیه‌سازی نرم در حالت حرف زدن */
        var raw = 0;
        if (st === "listening") {
            if (Date.now() - (window.__vnLevelAt || 0) < 450) {
                raw = Math.min(1, (window.__vnLevel || 0) * 6);
            }
        } else if (st === "speaking") {
            raw = 0.35 + 0.3 * Math.abs(Math.sin(t * 6.1)) * Math.abs(Math.sin(t * 2.3 + 1)) + 0.2 * Math.abs(Math.sin(t * 11.7));
        }
        var rate = raw > lvl ? 0.45 : 0.1;
        lvl += (raw - lvl) * Math.min(1, rate * dt * 60);

        ay += cur.speed * dt;

        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, W, H);

        var cx = W / 2, cy = H / 2;
        var R = Math.min(W, H) * 0.34 * cur.scale * (1 + lvl * 0.16);

        ctx.globalAlpha = cur.alpha;

        var cosA = Math.cos(ay), sinA = Math.sin(ay);
        var tilt = 0.38 + 0.08 * Math.sin(t * 0.5);
        var cT = Math.cos(tilt), sT = Math.sin(tilt);
        var sh = cur.shimmer > 0.5 ? Math.floor(t * cur.shimmer) : 0;
        var twist = cur.twist, amp = cur.amp, vc = lvl * cur.voice;
        var base = dpr * cur.size * (1 + lvl * 0.35) * (N / nActive > 1.5 ? 1.25 : 1);

        var stride = N / nActive;
        for (var j = 0; j < nActive; j++) {
            var i = (j * stride) | 0;
            var x = px[i], y = py[i], z = pz[i];

            var n = Math.sin(x * 3.1 + t * 1.2 + ph[i] * 0.3) *
                    Math.sin(y * 2.6 - t * 0.9) *
                    Math.sin(z * 3.4 + t * 1.5);
            var d = 1 + amp * n +
                    vc * 0.22 * (0.5 + 0.5 * Math.sin(ph[i] * 5 + t * 8 + y * 4));

            if (twist !== 0) {
                var a = twist * y, ca = Math.cos(a), sa = Math.sin(a);
                var xt = x * ca + z * sa;
                z = -x * sa + z * ca;
                x = xt;
            }

            var x2 = x * cosA + z * sinA;
            var z2 = -x * sinA + z * cosA;
            var y3 = y * cT - z2 * sT;
            var z3 = y * sT + z2 * cT;

            x2 *= d; y3 *= d; z3 *= d;

            var f = 2.6 / (2.6 - z3);
            var sx2 = cx + x2 * R * f;
            var sy2 = cy + y3 * R * f;

            var depth = (z3 + 1) * 0.5;
            if (depth < 0) depth = 0; else if (depth > 1) depth = 1;

            var sz = (1.7 + 3 * depth) * base;
            var di = (depth * D) | 0;
            if (di >= D) di = D - 1;
            ctx.drawImage(sprites[(bk[i] + sh) % B][di], sx2 - sz, sy2 - sz, sz * 2, sz * 2);
        }

        ctx.globalAlpha = 1;

        /* کیفیت خودکار: اگه گوشی کند بود، تعداد نقطه‌ها کم می‌شه */
        var cost = t0 ? performance.now() - t0 : 0;
        if (cost > 9) slowCount++;
        if (frameNo % 30 === 0) {
            if (slowCount >= 8 && nActive > 200) {
                nActive = Math.max(200, Math.floor(nActive * 0.75));
            }
            slowCount = 0;
        }
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();
