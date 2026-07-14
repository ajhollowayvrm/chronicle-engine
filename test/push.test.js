// THE CRYPTOGRAPHY, AND WHY IT IS TESTED AT ALL.
//
// Every failure mode in this file is SILENT. A bad VAPID signature, an off-by-one in the
// aes128gcm header, the wrong padding delimiter — none of them throw, none of them log,
// and none of them are visible from the app. What happens instead is that Apple accepts the
// request and drops it, or the phone receives a push it cannot decrypt and shows nothing,
// and the only symptom is that SHE STOPS BEING ABLE TO REACH YOU and nobody ever finds out
// why. That is the worst bug this project can have and it would be invisible in production.
//
// So we decrypt our own ciphertext, here, on the way past, exactly as a browser would.

import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { newVapidKeys, encrypt, vapidHeader } from '../server/push.js';

const b64url = (b) => Buffer.from(b).toString('base64url');
const unb64 = (s) => Buffer.from(String(s), 'base64url');

// Stand in for a phone: a P-256 keypair and a 16-byte auth secret, which is exactly what a
// browser hands you when it subscribes.
function fakePhone() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    ecdh,
    p256dh: b64url(ecdh.getPublicKey()),
    auth: b64url(crypto.randomBytes(16)),
  };
}

// RFC 8291, read backwards. If our encrypt() is right, this reproduces the plaintext.
function decryptAsBrowserWould(body, phone) {
  const salt = body.subarray(0, 16);
  const idlen = body.readUInt8(20);
  const asPublic = body.subarray(21, 21 + idlen);
  const ciphertext = body.subarray(21 + idlen);

  const shared = phone.ecdh.computeSecret(asPublic);
  const uaPublic = phone.ecdh.getPublicKey();

  const hkdf = (ikm, s, info, len) => Buffer.from(crypto.hkdfSync('sha256', ikm, s, info, len));

  const prk = hkdf(
    shared,
    unb64(phone.auth),
    Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]),
    32
  );
  const cek = hkdf(prk, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(prk, salt, Buffer.from('Content-Encoding: nonce\0'), 12);

  const tag = ciphertext.subarray(ciphertext.length - 16);
  const decipher = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([
    decipher.update(ciphertext.subarray(0, ciphertext.length - 16)),
    decipher.final(),
  ]);

  // strip the padding delimiter — 0x02 means "last record", and if we ever emit 0x01 the
  // browser sits waiting for a record that is never coming
  assert.strictEqual(plain[plain.length - 1], 2, 'wrong padding delimiter: the browser will hang');
  return plain.subarray(0, plain.length - 1).toString('utf8');
}

test('a push she sends is a push a browser can actually read', () => {
  const phone = fakePhone();
  const said = JSON.stringify({
    title: 'Willa is asking you',
    body: 'I am closer to Kessa Vane than I trust them. Do I let them all the way in?',
  });

  const body = encrypt(said, phone.p256dh, phone.auth);
  assert.strictEqual(decryptAsBrowserWould(body, phone), said);
});

test('two knocks are never the same bytes, even word for word', () => {
  // A fresh salt and a fresh ephemeral key per message. Reusing either would leak the
  // plaintext across messages, and the failure is invisible.
  const phone = fakePhone();
  const a = encrypt('the same thing', phone.p256dh, phone.auth);
  const b = encrypt('the same thing', phone.p256dh, phone.auth);
  assert.notStrictEqual(a.toString('hex'), b.toString('hex'));
});

test('a message encrypted for one phone cannot be read by another', () => {
  const her = fakePhone();
  const someone = fakePhone();
  const body = encrypt('private', her.p256dh, her.auth);
  assert.throws(() => decryptAsBrowserWould(body, someone));
});

test('the VAPID header is signed, and it is signed over the right audience', () => {
  const keys = newVapidKeys();
  const vapid = { ...keys, subject: 'mailto:someone@example.com' };
  const header = vapidHeader('https://web.push.apple.com/some/long/device/token', vapid);

  const [, t, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.strictEqual(k, keys.publicKey);

  const [h, claims, sig] = t.split('.');
  const head = JSON.parse(unb64(h));
  const body = JSON.parse(unb64(claims));

  assert.strictEqual(head.alg, 'ES256');
  // THE AUDIENCE IS THE ORIGIN, NOT THE ENDPOINT. Send the whole endpoint and Apple returns
  // a 403 with an empty body, which is a genuinely miserable afternoon.
  assert.strictEqual(body.aud, 'https://web.push.apple.com');
  assert.ok(body.exp > Date.now() / 1000, 'already expired');
  assert.ok(body.exp < Date.now() / 1000 + 24 * 3600, 'over 24h: push services reject this');

  // and it verifies against the public key we hand the browser
  const pub = unb64(keys.publicKey);
  const key = crypto.createPublicKey({
    format: 'jwk',
    key: { kty: 'EC', crv: 'P-256', x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
  });
  assert.ok(
    crypto.verify('sha256', Buffer.from(`${h}.${claims}`), { key, dsaEncoding: 'ieee-p1363' }, unb64(sig)),
    'the signature does not verify — every push will be rejected, silently'
  );
});
