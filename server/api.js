// THE ONLY THING SHE ASKS OF A SERVER.
//
// A Lambda Function URL with three routes and no auth. Read that again, because it sounds
// worse than it is:
//
//   THE SERVER HOLDS NOTHING WORTH STEALING. The save lives in the browser. What we keep is
//   a push endpoint (which is a capability, not an identity — it lets you knock on one
//   device and do nothing else) and a journal, which is a seed and a list of answers to
//   questions about an imaginary woman. There is no account, no email, no password, and
//   nothing to breach. Adding auth would mean inventing an identity for a game whose whole
//   subject is that nobody knows who you are.
//
// The id is a random 128-bit token minted here and known only to the browser that owns it,
// so knowing it is the same as owning the subscription. That is the entire security model
// and it is the correct size for the problem.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'node:crypto';
import { foresee } from './foresee.js';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE;

// She is not a stranger to your phone forever. If a vigil goes untouched for this long the
// row expires on its own and we stop knocking — DynamoDB does the sweeping.
const TTL_DAYS = 400;

const json = (code, body) => ({
  statusCode: code,
  headers: {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST,OPTIONS',
  },
  body: JSON.stringify(body),
});

// Work out when she next needs you, and write the alarm. Called on subscribe and again on
// every sync — because the moment you answer her, her future is a different future.
async function setAlarm(id, journal, told) {
  const next = foresee(journal, Date.now(), told);
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: 'SET journal = :j, told = :t, nextAt = :a, nextEvent = :e, expires = :x',
    ExpressionAttributeValues: {
      ':j': journal,
      ':t': told,
      // No alarm means she gets through the whole horizon without turning round. Look again
      // in a day rather than never: the horizon may simply have been quiet.
      ':a': next ? next.at : Date.now() + 24 * 3600 * 1000,
      ':e': next ?? null,
      ':x': Math.floor(Date.now() / 1000) + TTL_DAYS * 86400,
    },
  }));
  return next;
}

export async function handler(event) {
  const method = event.requestContext?.http?.method ?? 'POST';
  if (method === 'OPTIONS') return json(204, {});

  const path = (event.requestContext?.http?.path ?? '/').replace(/\/+$/, '') || '/';
  let body = {};
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'that was not json' });
  }

  // ── SHE MAY REACH YOU. The browser has just been given permission, and hands us the
  //    endpoint to knock on and the journal to foresee.
  if (path === '/subscribe') {
    const { subscription, journal } = body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !journal?.seed) {
      return json(400, { error: 'need a subscription and a journal' });
    }
    const id = crypto.randomBytes(16).toString('hex');
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        journal,
        told: [],
        nextAt: 0,
        began: Date.now(),
        expires: Math.floor(Date.now() / 1000) + TTL_DAYS * 86400,
      },
    }));
    const next = await setAlarm(id, journal, []);
    return json(200, { id, next: next ? { day: next.day, at: next.at } : null });
  }

  // ── YOU ANSWERED HER, so her future is a different future and the alarm is wrong.
  if (path === '/sync') {
    const { id, journal } = body;
    if (!id || !journal?.seed) return json(400, { error: 'need an id and a journal' });

    const got = await db.send(new GetCommand({ TableName: TABLE, Key: { id } }));
    if (!got.Item) return json(404, { error: 'no such vigil' });

    const next = await setAlarm(id, journal, got.Item.told ?? []);
    return json(200, { next: next ? { day: next.day, at: next.at } : null });
  }

  // ── YOU HAVE STOPPED WATCHING. She does not get a death for it. She simply stops.
  if (path === '/unsubscribe') {
    if (!body.id) return json(400, { error: 'need an id' });
    await db.send(new DeleteCommand({ TableName: TABLE, Key: { id: body.id } }));
    return json(200, { ok: true });
  }

  return json(404, { error: 'nothing here' });
}
