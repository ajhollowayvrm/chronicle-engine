// THE SERVICE WORKER.
//
// Two jobs, and the second one is the reason this file exists at all.
//
// 1. SHE RUNS WITH THE LIGHTS OFF. The game is a deterministic function of (seed, inputs)
//    and has no backend — so once this is cached, the whole thing works on a plane, in a
//    tunnel, with the wifi off, forever. That is not a nice-to-have for an idle game you
//    check on from a phone; it is the difference between a game and a website.
//
// 2. SHE CAN REACH YOU. iOS gives a home-screen web app NO background execution — you
//    cannot schedule a local notification for "in three hours", and there is no timer that
//    survives the app being closed. The only way she can get to your lock screen is a
//    server push waking this worker up. That is what `push` below is for.
//
// THE PUSH CARRIES HER ACTUAL WORDS, encrypted end-to-end (RFC 8291) so that Apple, who
// relay it, cannot read it. That is not gold-plating: the payload is the entire point. A
// notification that says "You have 1 pending decision" is a task manager, and this is not a
// task manager. She should be able to say what she wants, in her own voice, on the lock
// screen of somebody who has not thought about her all day.
//
// WE SHOW A NOTIFICATION ON EVERY PUSH, WITHOUT EXCEPTION — even a malformed one. iOS
// silently REVOKES a push subscription that receives a push and shows nothing, and a silent
// revocation is the worst bug this system can have: she would simply stop being able to
// reach you, and nobody would ever find out why.

const VERSION = 'vigil-v2';

// The whole app, which is small enough to name. index.html imports these as ES modules
// straight from source — no bundler — so the precache list IS the import graph.
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './web/style.css',
  './web/app.js',
  './web/config.js',
  './web/reach.js',
  './web/icons/icon-192.png',
  './web/icons/icon-512.png',
  './src/game.js',
  './src/sim.js',
  './src/bonds.js',
  './src/web-of.js',
  './src/kit.js',
  './gen/worldgen.js',
  './gen/node.js',
  './gen/patch.js',
  './gen/hooks.js',
  './gen/validate.js',
  './gen/tables/chronicle.js',
  './gen/tables/people.js',
  './gen/tables/stats.js',
  './gen/tables/systems.js',
  './gen/tables/traits.js',
  './gen/tables/voice.js',
  './gen/tables/goods.js',
  './gen/tables/marks.js',
  './gen/tables/callings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // A SINGLE 404 IN THE LIST FAILS THE WHOLE INSTALL, and the worker never activates —
      // which presents as "the app just doesn't work offline" with nothing in the console.
      // So each file is added on its own and a miss is survivable.
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first, then revalidate in the background. She opens instantly and offline, and a
// new deploy lands the next time you open her.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then((hit) => {
      const live = fetch(req)
        .then((res) => {
          if (res && res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => hit);          // no network. she does not need one.
      return hit || live;
    })
  );
});

// ══════════════════════════════════════════════════════════════════ SHE REACHES YOU
//
// The server knocked. It did not say what for — so we ask, and then we tell you, in her
// words, because a notification that says "You have 1 pending decision" is a task manager
// and this is not a task manager.
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let title = 'She is asking you.';
    let body = 'She has turned to the thing she believes is listening. Come and see.';
    let tag = 'vigil';

    try {
      const payload = e.data ? e.data.json() : null;
      if (payload?.body) {
        title = payload.title ?? title;
        body = payload.body;
        tag = payload.tag ?? tag;
      }
    } catch {
      // a knock with no readable payload is still a knock, and she still gets to speak
    }

    await self.registration.showNotification(title, {
      body,
      tag,                         // she does not stack up. the newest thing she said wins.
      renotify: true,
      icon: './web/icons/icon-192.png',
      badge: './web/icons/icon-192.png',
      data: { url: './' },
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) {
      if ('focus' in c) return c.focus();      // she is already open. go to her.
    }
    return self.clients.openWindow(e.notification.data?.url ?? './');
  })());
});
