"use strict";

/* =========================================
   AM AI SERVICE WORKER
   فقط برای نصب‌پذیری PWA و کارکرد آفلاین پایه.
   همیشه network-first — یعنی اول تلاش می‌کنه
   از اینترنت بگیره تا آپدیت‌های جدید همیشه فوری
   اعمال بشن، و فقط وقتی آفلاینه از کش استفاده
   می‌کنه. هرگز درخواست‌های POST یا آدرس Worker
   (API) رو دست نمی‌زنه، فقط فایل‌های ثابت اپ.
========================================= */

const CACHE_NAME = "suvreno-shell-v37";
const SHELL_FILES = ["./index.html", "./style.css", "./script.js", "./plus.js", "./theme.css", "./theme.js", "./theme-color.js", "./games.js", "./council.js", "./tickets.js", "./logo-data.js", "./net.js", "./vn-orb.js", "./app-promo.js", "./logo.svg", "./manifest.json", "./Vazirmatn.woff2"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.all(SHELL_FILES.map(f => cache.add(f).catch(() => {})))).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;

  // فقط GET، فقط فایل‌های ثابت هم‌دامنه‌ی خود اپ — هیچ‌وقت به Worker API یا POST دست نمی‌زنیم
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has("range")) return;

  // صفحه‌های ورود/برگشتِ گوگل (حاویِ توکن در آدرس) اصلاً کش نمی‌شن
  const sensitive = /auth-callback/i.test(url.pathname) || /[?&](session|code|state|error|token)=/i.test(url.search);
  if (sensitive) return;

  // سرعت: فایل‌های ثابت اول از کش می‌آیند و پشت‌صحنه به‌روز می‌شوند؛
  // صفحه‌ها (HTML) اول از شبکه با مهلت ۳ ثانیه، اگر کند بود از کش
  if (/\.(json|apk|aab)$/i.test(url.pathname)) return;
  const isDoc = req.mode === "navigate" || /\.html$/i.test(url.pathname) || url.pathname.endsWith("/");
  const net = () => fetch(req).then(res => {
    if (res && res.ok && res.type === "basic") {
      const resClone = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, resClone)).catch(() => {});
    }
    return res;
  });
  if (!isDoc) {
    event.respondWith(caches.match(req).then(hit => {
      const p = net().catch(() => hit);
      return hit || p;
    }));
    return;
  }
  event.respondWith(
    new Promise(resolve => {
      let done = false;
      const tm = setTimeout(() => caches.match(req).then(hit => { if (hit && !done) { done = true; resolve(hit); } }), 3000);
      net().then(r => { if (!done) { done = true; clearTimeout(tm); resolve(r); } })
        .catch(() => caches.match(req).then(hit => { if (!done) { done = true; clearTimeout(tm); resolve(hit || caches.match("./index.html")); } }));
    })
  );
});
