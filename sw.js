/* سبورة الرياضيات — عامل الخدمة (يشغّل الموقع بدون نت)
   عند كل تحديث للسبورة: غيّر رقم VERSION حتى يستلم الجميع النسخة الجديدة */
const VERSION = 'v1.0.1';
const CACHE = 'sabora-' + VERSION;
const FONTS = 'sabora-fonts';
const CORE = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys())
      if (k.startsWith('sabora-') && k !== CACHE && k !== FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // الخطوط: من الذاكرة أولاً، وتنحفظ أول مرة يفتح بيها الموقع بالنت
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }
      catch (_) { return new Response('', {status: 504}); }
    }));
    return;
  }
  if (url.origin !== location.origin || url.searchParams.has('callback')) return;

  // ملفات الموقع: من الذاكرة فوراً (يشتغل بدون نت)
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, {ignoreSearch: true}) ||
                (req.mode === 'navigate' ? await c.match('./index.html') : null);
    if (hit) return hit;
    try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
    catch (_) { return (await c.match('./index.html')) || new Response('غير متصل', {status: 503}); }
  })());
});
