// LETTING HER REACH YOU.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE THING THAT WILL WASTE YOUR AFTERNOON, WRITTEN DOWN ONCE:
//
// On iOS this only works if she has been ADDED TO THE HOME SCREEN. In a Safari tab,
// `Notification.requestPermission` does not exist, `PushManager` does not exist, and there
// is no error — the feature simply is not there. So we detect standalone mode and, if we
// are in a tab on an iPhone, we do not offer something we cannot deliver. We tell the
// player what to do instead.
//
// And the prompt must be raised BY A TAP. Ask on page load and the browser rejects it
// permanently, without telling anybody, and the player can never be asked again.

import { API, VAPID_PUBLIC, VIGIL_KEY } from './config.js';

const store = window.localStorage;

// base64url → the Uint8Array the PushManager insists on
const key = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const onHomeScreen = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// What we can actually offer this device, right now. Four answers, and they need four
// different sentences — "notifications unavailable" is a lie in three of them.
export function reachable() {
  if (!('serviceWorker' in navigator)) return 'never';
  if (!API) return 'never';

  // iOS in a tab: push genuinely does not exist here, but it WILL if she is installed.
  if (isIOS() && !onHomeScreen()) return 'install-first';
  if (!('PushManager' in window) || !('Notification' in window)) return 'never';

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'can-ask';
}

export const vigilId = () => store.getItem(VIGIL_KEY);

// ── SHE MAY REACH YOU. Called from a tap, and never from anywhere else.
export async function letHerReachYou(journal) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, why: permission };

  const reg = await navigator.serviceWorker.ready;

  // An existing subscription is reused — resubscribing mints a new endpoint and orphans the
  // old row, and she ends up knocking on a door that is not there any more.
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,               // iOS requires this, and enforces it: a push that
      applicationServerKey: key(VAPID_PUBLIC),  // shows no notification gets the subscription revoked
    }));

  const res = await fetch(`${API}/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), journal }),
  });
  if (!res.ok) return { ok: false, why: 'the server would not have her' };

  const { id, next } = await res.json();
  store.setItem(VIGIL_KEY, id);
  return { ok: true, next };
}

// ── YOU ANSWERED HER, SO HER FUTURE IS A DIFFERENT FUTURE.
//
// The whole notification layer rests on the server being able to foresee her, and it can
// only do that if it has every input you have given her. This is fire-and-forget on purpose:
// the game does not wait on the network for anything, ever, and if this fails she is simply
// foreseen from a slightly stale journal and knocks a little early. Not worth a spinner.
export function tellTheServer(journal) {
  const id = vigilId();
  if (!id || !API) return;
  fetch(`${API}/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, journal }),
    keepalive: true,      // survives the tab being closed the instant after you answer
  }).catch(() => {});
}

// ── YOU HAVE STOPPED WATCHING.
export function stopWatching() {
  const id = vigilId();
  store.removeItem(VIGIL_KEY);
  if (!id || !API) return;
  fetch(`${API}/unsubscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
    keepalive: true,
  }).catch(() => {});
}
