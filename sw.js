/* سبورة الرياضيات — عامل الخدمة (يشغّل الموقع بدون نت)
   عند كل تحديث للسبورة: غيّر رقم VERSION حتى يستلم الجميع النسخة الجديدة */
const VERSION = 'v1.8.9';
const CACHE = 'sabora-' + VERSION;
const FONTS = 'sabora-fonts';
const CORE = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, {cache: 'reload'})))));
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

  // الصفحة: من النت أولاً (حتى تطلع آخر نسخة)، وإذا ماكو نت أو تأخر أكثر من 4 ثواني فمن الذاكرة
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isPage) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const net = fetch(req, {cache: 'no-store'}).then(res => {
        if (res.ok) c.put('./index.html', res.clone());
        return res;
      });
      const cached = await c.match('./index.html');
      if (!cached) return net.catch(() => new Response('غير متصل', {status: 503}));
      e.waitUntil(net.catch(() => {}));
      const timeout = new Promise(r => setTimeout(() => r(cached), 4000));
      return Promise.race([net.catch(() => cached), timeout]);
    })());
    return;
  }

  // باقي الملفات (الأيقونات...): من الذاكرة، وإذا ما موجودة فمن النت
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, {ignoreSearch: true});
    if (hit) return hit;
    try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
    catch (_) { return new Response('', {status: 504}); }
  })());
});
