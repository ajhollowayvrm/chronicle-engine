// MINT THE KEYS SHE KNOCKS WITH.
//
//   npm run vapid
//
// The PUBLIC key is not a secret — it is compiled into the web client, because the browser
// uses it to pin the subscription to us. The PRIVATE key signs every knock and must never
// leave the Lambda: anybody holding it can send push notifications to every phone that has
// ever subscribed to this app. It goes in as a CloudFormation parameter, is stored NoEcho,
// and is not committed to this repo.
//
// Run this ONCE. Regenerating invalidates every existing subscription on earth — every
// phone that has her installed silently stops being knocked on, and nobody finds out, which
// is the worst failure mode this system has.

import { newVapidKeys } from '../server/push.js';

const { publicKey, privateKey } = newVapidKeys();

console.log(`
VAPID keys. Run this once, and once only.

  public   ${publicKey}
  private  ${privateKey}

The public key goes in web/config.js and is committed.
The private key goes to the deploy and NOWHERE ELSE:

  sam deploy --parameter-overrides VapidPublic=${publicKey} VapidPrivate=${privateKey}
`);
