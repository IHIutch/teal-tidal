import { test } from 'node:test';
import assert from 'node:assert/strict';

test('extension flow: connect, capture, survive restart, retry once, and protect credentials', async t => {
  const memory: Record<string, unknown> = {};
  let listener: (message: unknown, sender: chrome.runtime.MessageSender, reply: (value: unknown) => void) => unknown;
  let alarmListener: (alarm: chrome.alarms.Alarm) => void;
  const runtimeId = 'test-extension';
  let accessLevel: string | undefined;
  let clock = 1_800_000_000_000;
  t.mock.method(Date, 'now', () => clock);
  const mockChrome = {
    runtime: { id: runtimeId, getURL: (path: string) => `chrome-extension://${runtimeId}/${path}`,
      onMessage: { addListener: (fn: typeof listener) => { listener = fn; } } },
    storage: { local: {
      setAccessLevel: async (options: { accessLevel: string }) => { accessLevel = options.accessLevel; },
      get: async () => structuredClone(memory),
      set: async (value: Record<string, unknown>) => { Object.assign(memory, structuredClone(value)); },
      remove: async (key: string) => { delete memory[key]; },
    } },
    alarms: { create: async () => {}, onAlarm: { addListener: (fn: typeof alarmListener) => { alarmListener = fn; } } },
    tabs: { onRemoved: { addListener: () => {} } },
  };
  Object.defineProperty(globalThis, 'chrome', { value: mockChrome, configurable: true });
  t.after(() => { Reflect.deleteProperty(globalThis, 'chrome'); });
  const recordIds: string[] = [];
  let offline = true;
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('createSession')) return Response.json({ did: 'did:plc:test', handle: 'test.bsky.social',
      accessJwt: 'secret-access', refreshJwt: 'secret-refresh', active: true,
      didDoc: { id: 'did:plc:test', service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.example' }] } });
    if (url.endsWith('putRecord')) {
      assert.ok(url.startsWith('https://pds.example/'));
      const body = JSON.parse(init?.body as string);
      recordIds.push(body.rkey);
      assert.equal(body.collection, 'fm.teal.feed.play');
      if (offline) throw new TypeError('Lost response');
      return Response.json({ uri: `at://did:plc:test/fm.teal.feed.play/${body.rkey}`, cid: 'bafyreitest' });
    }
    if (url.endsWith('deleteSession')) return new Response(null, { status: 200 });
    throw new Error(`Unexpected request: ${url}`);
  });
  const backgroundModule = process.env.TEST_BACKGROUND_BUNDLE ? '../dist/background.js' : '../src/background.ts';
  await import(backgroundModule);
  const ui = { id: runtimeId, url: mockChrome.runtime.getURL('popup.html') };
  const page: chrome.runtime.MessageSender = { id: runtimeId, url: 'https://listen.tidal.com/album/1', tab: { id: 1 } as chrome.tabs.Tab, frameId: 0 };
  const send = (message: unknown, sender: chrome.runtime.MessageSender = ui) => new Promise<any>(resolve => {
    listener(message, sender, resolve);
  });
  const login = await send({ type: 'login', handle: 'test.bsky.social', password: 'test-app-password', service: 'https://bsky.social' });
  assert.equal(login.ok, true);
  assert.equal(accessLevel, 'TRUSTED_CONTEXTS');
  assert.equal(JSON.stringify(memory).includes('test-app-password'), false);
  assert.equal(JSON.stringify(login).includes('secret-access'), false);
  assert.equal((await send({ type: 'status' }, page)).ok, false);
  assert.equal((await send({ type: 'logout' }, page)).ok, false);
  const sample = (position: number) => ({ type: 'sample', sample: {
    track: { id: '123', title: 'Example', artists: ['Artist'], duration: 4 }, position, playing: true,
  } });
  for (let second = 0; second <= 4; second++) {
    clock += 1000;
    assert.equal((await send(sample(second), page)).ok, true);
  }
  let response = await send({ type: 'status' });
  assert.equal(response.status.queueLength, 1);
  assert.equal(response.status.sent, 0);
  assert.equal(recordIds.length, 1);
  // Simulate service-worker termination and restart, preserving browser storage.
  const restartedModule = `${backgroundModule}?restart`;
  await import(restartedModule);
  clock += 1000;
  await send(sample(4), page);
  assert.equal(recordIds.length, 1);
  offline = false;
  response = await send({ type: 'retry' });
  assert.equal(response.status.queueLength, 0);
  assert.equal(response.status.sent, 1);
  assert.equal(recordIds.length, 2);
  assert.equal(recordIds[0], recordIds[1]);
  assert.match(recordIds[0]!, /^[234567a-z]{13}$/);
  assert.equal((await send({ type: 'logout' })).ok, true);
  assert.equal(memory.session, undefined);
  response = await send({ type: 'status' });
  assert.equal(response.status.account, undefined);
});
