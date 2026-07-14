// WHERE SHE KNOCKS FROM.
//
// Both of these are public by design. The VAPID PUBLIC key is what the browser uses to pin
// its subscription to us — it is not a secret and it is meant to be here. The private half
// lives only in the Lambda (see infra/.vapid, which is gitignored) and anybody holding it
// could push to every phone that has her installed.
//
// If API is empty the game still works completely — it simply cannot reach you. That is the
// correct failure: the game has no backend and never needs one, and the server exists for
// exactly one purpose, which is to knock on your lock screen when she needs you.

export const API = 'https://d3tnrxfufy7qmen26co5je3opi0zmvtq.lambda-url.us-west-2.on.aws';

export const VAPID_PUBLIC = 'BM2Teq5QEkQnXkL96s3QaIwetcT1pAxp7mdq8hweL7RHmgBvUerHw_hP8z44-bw23LuBeaoK9SjHHb2Ip8D3T8k';

export const VIGIL_KEY = 'chronicle.vigil.v1';   // the subscription id, in localStorage
