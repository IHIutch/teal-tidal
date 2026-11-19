import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deliver, nextRetry } from '../src/queue';
import { pending } from './helpers';
test('failed writes retain the same record ID and back off before retrying', async () => {
  const queue = [pending()];
  const key = queue[0]!.rkey;
  let writes = 0;
  await deliver(queue, 'did:plc:test', 1000, async () => { writes++; throw new Error('offline'); }, async () => {}, () => {});
  assert.equal(queue.length, 1);
  assert.equal(queue[0]!.attempts, 1);
  assert.equal(queue[0]!.nextAttempt, 31_000);
  await deliver(queue, 'did:plc:test', 2000, async () => { writes++; return 'uri'; }, async () => {}, () => {});
  assert.equal(writes, 1);
  await deliver(queue, 'did:plc:test', 31_000, async play => { assert.equal(play.rkey, key); return 'uri'; }, async () => {}, () => {});
  assert.equal(queue.length, 0);
  assert.equal(nextRetry(99, 0), 3_600_000);
});
test('never submits queued plays as a different account', async () => {
  const queue = [pending('did:plc:other'), pending()];
  const sent: string[] = [];
  await deliver(queue, 'did:plc:test', 1000, async play => { sent.push(play.did); return 'uri'; }, async () => {}, () => {});
  assert.deepEqual(sent, ['did:plc:test']);
  assert.equal(queue.length, 1);
  assert.equal(queue[0]!.did, 'did:plc:other');
});
test('stops at a failed record to avoid hammering the server', async () => {
  const queue = [pending(), pending()];
  let writes = 0;
  await deliver(queue, 'did:plc:test', 1000, async () => { writes++; throw Error(); }, async () => {}, () => {});
  assert.equal(writes, 1);
  assert.equal(queue.length, 2);
});
