// THE CRON. Every five minutes, it asks one question: is anybody's alarm due?
//
// Nothing runs between the alarms. There is no per-player process, no clock ticking on a
// server, no live world — because there does not need to be one. `foresee()` already worked
// out the exact minute she will need you and wrote it down, and this is just the thing that
// notices the minute has arrived.
//
// A SCAN, DELIBERATELY. At this scale (a handful of vigils) a Scan is one read unit and an
// index would be a second table to keep consistent for no benefit. If this is ever running
// for thousands of people, the fix is a GSI on a bucketed `dueHour` — and not before.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { sendPush } from './push.js';
import { foresee } from './foresee.js';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE;

const vapid = () => ({
  publicKey: process.env.VAPID_PUBLIC,
  privateKey: process.env.VAPID_PRIVATE,
  subject: process.env.VAPID_SUBJECT,
});

export async function handler() {
  const now = Date.now();

  const due = await db.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'nextAt <= :now AND nextAt > :zero',
    ExpressionAttributeValues: { ':now': now, ':zero': 0 },
  }));

  const knocked = [];

  for (const row of due.Items ?? []) {
    // ONE BAD VIGIL MUST NOT TAKE THE OTHERS DOWN WITH IT.
    //
    // This is not defensive programming for its own sake — it shipped as a real bug and was
    // caught by a smoke test with a deliberately malformed key: the crypto threw, the cron
    // died, and every OTHER person's notification would have stopped arriving from that
    // moment on, silently, with nobody able to tell why. A push loop must be able to lose a
    // row and keep walking.
    try {
      await knock(row, now, knocked);
    } catch (err) {
      console.error(JSON.stringify({ id: row.id, failed: String(err?.message ?? err) }));
      // Do not retry it in five minutes forever. Push her alarm out and let the next pass
      // try again, so a poisoned row cannot pin the cron.
      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: row.id },
        UpdateExpression: 'SET nextAt = :a',
        ExpressionAttributeValues: { ':a': now + 3600 * 1000 },
      })).catch(() => {});
    }
  }

  // The cron's return value is only ever read by a human staring at CloudWatch at midnight
  // wondering why she has gone quiet. Make it worth their while.
  console.log(JSON.stringify({ scanned: due.Items?.length ?? 0, knocked }));
  return { knocked: knocked.length };
}

// One vigil: knock, and work out when she will need us next.
async function knock(row, now, knocked) {
  const e = row.nextEvent;

  // No event, just a re-check: her horizon was quiet. Look again from here.
  if (!e) return rearm(row, now);

  const res = await sendPush(
    { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
    { title: e.title, body: e.body, tag: e.kind === 'death' ? 'death' : 'ask' },
    vapid()
  );

  // SHE WAS DELETED FROM THE HOME SCREEN — or the keys were never usable. Either way there
  // is no door to knock on any more, and that is not an error: that is the player leaving.
  if (res.gone) {
    await db.send(new DeleteCommand({ TableName: TABLE, Key: { id: row.id } }));
    knocked.push({ id: row.id, gone: true, why: res.why });
    return;
  }

  // She is dead. There is nothing further to foresee, and nothing further to say.
  if (e.kind === 'death') {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: row.id },
      UpdateExpression: 'SET nextAt = :z, nextEvent = :n',
      ExpressionAttributeValues: { ':z': 0, ':n': null },
    }));
    knocked.push({ id: row.id, dead: true, ok: res.ok });
    return;
  }

  knocked.push({ id: row.id, day: e.day, ok: res.ok, status: res.status, why: res.why });
  await rearm({ ...row, told: [...(row.told ?? []), e.id] }, now);
}

// She has been told. When does she need us next?
async function rearm(row, now) {
  const next = foresee(row.journal, now, row.told ?? []);
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: row.id },
    UpdateExpression: 'SET told = :t, nextAt = :a, nextEvent = :e',
    ExpressionAttributeValues: {
      ':t': row.told ?? [],
      ':a': next ? Math.max(next.at, now + 60_000) : now + 24 * 3600 * 1000,
      ':e': next ?? null,
    },
  }));
}
