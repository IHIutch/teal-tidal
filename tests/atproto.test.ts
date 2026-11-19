import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, simpleFetchHandler } from '@atcute/client';
import { PasswordSession } from '@atcute/password-session';
import { publish } from '../src/atproto';
import { pending } from './helpers';

test('atcute sends the current teal record with a stable TID on retries', async () => {
  const requests: unknown[] = [];
  const client = new Client({ handler: simpleFetchHandler({ service: 'https://pds.example',
    fetch: async (input, init) => {
      assert.equal(String(input), 'https://pds.example/xrpc/com.atproto.repo.putRecord');
      requests.push(JSON.parse(init!.body as string));
      return Response.json({ uri: 'at://did:plc:test/fm.teal.feed.play/3m5testtest222', cid: 'bafyreitest' });
    },
  }) });
  const play = pending();
  await publish(client, play);
  await publish(client, play);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal((requests[0] as { collection: string }).collection, 'fm.teal.feed.play');
});
test('atcute refreshes expired access tokens and uses the saved PDS endpoint', async () => {
  const calls: { url: string; authorization: string | null }[] = [];
  let saved = false;
  const session = new PasswordSession({ service: 'https://bsky.social', pdsUri: 'https://pds.example',
    did: 'did:plc:test', handle: 'test.example', accessJwt: 'expired', refreshJwt: 'refresh', active: true }, {
    onUpdate: () => { saved = true; },
    fetch: async (input, init) => {
      const url = String(input);
      const authorization = new Headers(init?.headers).get('authorization');
      calls.push({ url, authorization });
      if (url.endsWith('refreshSession')) return Response.json({ did: 'did:plc:test', handle: 'test.example',
        accessJwt: 'renewed', refreshJwt: 'renewed-refresh', active: true });
      if (authorization === 'Bearer expired') return Response.json({ error: 'ExpiredToken' }, { status: 401 });
      return Response.json({ uri: 'at://did:plc:test/fm.teal.feed.play/3m5testtest222', cid: 'bafyreitest' });
    },
  });
  await publish(new Client({ handler: session }), pending());
  assert.equal(saved, true);
  assert.ok(calls.some(call => call.authorization === 'Bearer renewed'));
  assert.ok(calls.filter(call => call.url.endsWith('putRecord')).every(call => call.url.startsWith('https://pds.example/')));
  assert.ok(calls.some(call => call.url === 'https://bsky.social/xrpc/com.atproto.server.refreshSession' && call.authorization === 'Bearer refresh'));
});
