// HOW SHE KNOCKS.
//
// Web Push, from scratch, on `node:crypto` alone. There is a very good npm package that
// does this (`web-push`) and I did not use it, for one reason: this repo has zero
// dependencies and that is load-bearing everywhere else in it. It is about a hundred lines.
//
// TWO PIECES OF CRYPTOGRAPHY, and they do different jobs:
//
//   VAPID (RFC 8292)  — proves to Apple/Google that the knock came from US. A signed JWT.
//                       Without it the push service refuses the request outright.
//   AES128GCM (RFC 8291) — encrypts the message so that Apple, who relay it, cannot read
//                       it. This is not paranoia, it is mandatory: the push services will
//                       not carry a plaintext payload, and a payload is the whole point.
//                       "You have 1 pending decision" is a task manager. She should be
//                       able to say what she actually wants, in her own words, on the lock
//                       screen of a person who has not thought about her all day.

import crypto from 'node:crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const unb64 = (s) => Buffer.from(String(s), 'base64url');

// ───────────────────────────────────────────────────────────────────── VAPID KEYS
// P-256. The public half goes to the browser (it pins the subscription to us); the private
// half signs, and never leaves the Lambda.
export function newVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  // the browser wants the raw uncompressed point: 0x04 || X(32) || Y(32)
  const raw = Buffer.concat([Buffer.from([4]), unb64(jwk.x), unb64(jwk.y)]);
  return { publicKey: b64url(raw), privateKey: jwk.d };
}

// Rebuild a signing key from the stored `d`. We keep the private key as the bare scalar
// because that is the only part that is secret and it survives an env var intact.
function signingKey(privateD, publicRaw) {
  const pub = unb64(publicRaw);
  return crypto.createPrivateKey({
    format: 'jwk',
    key: {
      kty: 'EC', crv: 'P-256',
      x: b64url(pub.subarray(1, 33)),
      y: b64url(pub.subarray(33, 65)),
      d: privateD,
    },
  });
}

// The JWT that says the knock is ours. `aud` is the ORIGIN of the push endpoint and not
// the endpoint itself — get that wrong and Apple returns 403 with no useful body, which is
// a genuinely miserable afternoon.
export function vapidHeader(endpoint, vapid) {
  const aud = new URL(endpoint).origin;
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64url(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,   // 12h. must be < 24h or it is rejected.
    sub: vapid.subject,
  }));
  const signed = `${header}.${claims}`;

  // ES256 wants the raw r||s pair, not the DER envelope node hands you by default.
  const sig = crypto.sign('sha256', Buffer.from(signed), {
    key: signingKey(vapid.privateKey, vapid.publicKey),
    dsaEncoding: 'ieee-p1363',
  });

  return `vapid t=${signed}.${b64url(sig)}, k=${vapid.publicKey}`;
}

// ────────────────────────────────────────────────────────────────── THE ENCRYPTION
// RFC 8291. The browser gave us two secrets when it subscribed — its public key (p256dh)
// and a 16-byte auth secret — and everything below is derived from those plus one
// throwaway keypair of ours.
export function encrypt(payload, p256dh, auth) {
  const uaPublic = unb64(p256dh);
  const authSecret = unb64(auth);

  // a fresh keypair for this one message, and a fresh salt for this one record
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const salt = crypto.randomBytes(16);

  const hkdf = (ikm, saltBuf, info, len) =>
    Buffer.from(crypto.hkdfSync('sha256', ikm, saltBuf, info, len));

  // step 1: mix the shared secret with the subscription's auth secret. The `info` here
  // binds the key to BOTH public keys, so a message encrypted for one subscription cannot
  // be replayed at another.
  const prk = hkdf(
    shared,
    authSecret,
    Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]),
    32
  );

  // step 2: the content key and the nonce, salted with this record's salt
  const cek = hkdf(prk, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(prk, salt, Buffer.from('Content-Encoding: nonce\0'), 12);

  // one record, so the padding delimiter is 0x02 ("last record"). 0x01 here means "more
  // records follow" and the browser will sit waiting for a record that never comes.
  const plain = Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([2])]);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);

  // the aes128gcm header is part of the body: salt | record size | key id length | key id
  const head = Buffer.alloc(21);
  salt.copy(head, 0);
  head.writeUInt32BE(4096, 16);
  head.writeUInt8(asPublic.length, 20);

  return Buffer.concat([head, asPublic, body]);
}

// ───────────────────────────────────────────────────────────────────────── THE KNOCK
//
// Returns { ok } — or { gone: true } when the push service tells us the subscription is
// dead (404/410). That happens when she is deleted from the home screen, and it is not an
// error: it is the player leaving. The caller deletes the row.
export async function sendPush(sub, message, vapid, ttl = 6 * 3600) {
  // A SUBSCRIPTION WE CANNOT ENCRYPT FOR IS DEAD, AND IT IS DEAD FOREVER. A p256dh that is
  // not a point on the curve will never become one. Left to throw, it takes the whole cron
  // down with it — and everybody else's notifications with that, silently, for good.
  let body;
  try {
    body = encrypt(JSON.stringify(message), sub.keys.p256dh, sub.keys.auth);
  } catch (e) {
    return { gone: true, why: `unusable keys: ${e.message}` };
  }

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      TTL: String(ttl),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      Authorization: vapidHeader(sub.endpoint, vapid),
    },
    body,
  });

  if (res.status === 404 || res.status === 410) return { gone: true };
  if (!res.ok) {
    return { ok: false, status: res.status, why: await res.text().catch(() => '') };
  }
  return { ok: true, status: res.status };
}
