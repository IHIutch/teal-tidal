import { Client } from '@atcute/client';
import { now as tid } from '@atcute/tid';
import { PasswordSession, type PasswordSessionData } from '@atcute/password-session';
import { boundedFetch, connect, publish } from './atproto';
import { advance, qualified, toRecord, validSample } from './tracker';
import type { Command, Reply, Status, Store } from './types';

const initial: Store = { queue: [], sent: 0 };
let store: Store;
let session: PasswordSessionData | undefined;
// Serializing storage mutations prevents simultaneous tabs and alarm retries
// from racing. Capture sample timestamps on receipt, before entering the queue.
let work: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const result = work.then(task);
  work = result.catch(() => undefined);
  return result;
}

const ready = (async () => {
  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  const saved = await chrome.storage.local.get<{ store?: Store; session?: PasswordSessionData }>(['store', 'session']);
  store = saved.store ?? initial;
  session = saved.session;
  await chrome.alarms.create('retry', { periodInMinutes: 1 });
})();

function save() { return chrome.storage.local.set({ store }); }
function status(): Status {
  const live = store.listening && Date.now() - store.listening.sampledAt < 10_000 ? store.listening : undefined;
  return { account: session ? { handle: session.handle, did: session.did } : undefined,
    listening: live, queueLength: store.queue.length, sent: store.sent,
    lastSent: store.lastSent, error: store.error };
}

async function flush() {
  if (!session || !store.queue.length) return;
  const did = session.did;
  const auth = new PasswordSession(session, {
    fetch: boundedFetch,
    async onUpdate(data) {
      session = data;
      await chrome.storage.local.set({ session: data }).catch(() => {
        store.error = 'Could not save refreshed login. Reconnect your account.';
      });
    },
    async onDelete() {
      session = undefined;
      await chrome.storage.local.remove('session').catch(() => undefined);
      store.error = 'Your session expired. Reconnect your account to send pending listens.';
    },
  });
  const client = new Client({ handler: auth });
  for (const play of [...store.queue]) {
    if (play.did !== did) continue;
    try {
      await publish(client, play);
      store.queue.splice(store.queue.indexOf(play), 1);
      store.sent++;
      store.lastSent = { title: play.record.trackName };
      store.error = undefined;
    } catch {
      store.error ??= 'Could not submit. Retry when online, or reconnect if your session expired.';
      await save();
      break;
    }
    await save();
  }
}

function fromTidal(sender: chrome.runtime.MessageSender): boolean {
  if (sender.tab?.id === undefined || sender.frameId !== 0 || !sender.url) return false;
  try {
    const url = new URL(sender.url);
    return url.protocol === 'https:' && ['tidal.com', 'www.tidal.com', 'listen.tidal.com', 'www.listen.tidal.com'].includes(url.hostname);
  } catch { return false; }
}

async function receiveSample(value: unknown, tabId: number, now: number) {
  if (!session) return;
  if (value === null) {
    if (store.owner?.tabId === tabId && store.listening) {
      store.listening.playing = false;
      await save();
    }
    return;
  }
  if (!validSample(value)) return;
  if (store.owner && store.owner.tabId !== tabId) {
    // Follow one player at a time. A paused/missing/stale player releases ownership.
    if (store.listening?.playing && now - store.owner.seenAt < 6000) return;
    if (!value.playing) return;
    store.listening = undefined;
  }
  store.owner = { tabId, seenAt: now };
  store.listening = advance(store.listening, value, now);
  const captured = qualified(store.listening);
  if (captured) {
    store.queue.push({ did: session.did, rkey: tid(), record: toRecord(store.listening) });
    store.listening.queued = true;
  }
  // Persist the record and queued flag together, before attempting any network IO.
  await save();
  // Failed submissions retry on the minute alarm or manually, not every sample.
  if (captured) await flush();
}

async function command(message: Command): Promise<Status> {
  switch (message.type) {
    case 'status': break;
    case 'login': {
      if (session) throw new Error('Disconnect the current account before signing in again.');
      const data = await connect(message.handle, message.password);
      if (store.queue.some(p => p.did !== data.did)) {
        // Do not send another account's queued plays to this account.
        await PasswordSession.delete(data, { fetch: boundedFetch }).catch(() => undefined);
        throw new Error('Clear pending listens with Disconnect before changing accounts.');
      }
      session = data;
      store.listening = undefined;
      store.owner = undefined;
      store.error = undefined;
      await chrome.storage.local.set({ session, store });
      await flush();
      break;
    }
    case 'logout': {
      const old = session;
      // Clear local credentials even if the server is offline. Revoke the app
      // password on your PDS if you also want to terminate all related sessions.
      session = undefined;
      store.queue = [];
      store.listening = undefined;
      store.owner = undefined;
      store.error = undefined;
      await chrome.storage.local.remove('session');
      await save();
      if (old) await PasswordSession.delete(old, { fetch: boundedFetch }).catch(() => undefined);
      break;
    }
    case 'retry':
      store.error = undefined;
      await save();
      await flush();
      break;
    default: throw new Error('Unknown command.');
  }
  return status();
}

chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message !== 'object') return;
  const now = Date.now();
  const msg = message as Record<string, unknown>;
  const task = async (): Promise<Reply | { ok: true }> => {
    await ready;
    if (msg.type === 'sample' && fromTidal(sender)) {
      await receiveSample(msg.sample, sender.tab!.id!, now);
      return { ok: true };
    }
    // Only our UI may sign in/out, change settings, or read account status.
    if (sender.url !== chrome.runtime.getURL('popup.html')) throw new Error('Not allowed.');
    return { ok: true, status: await command(msg as unknown as Command) };
  };
  void serial(task).then(respond, () => respond({ ok: false,
    error: 'Could not complete the request. Check your handle, app password, and connection.' }));
  return true;
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'retry') void serial(async () => { await ready; await flush(); }).catch(() => undefined);
});
chrome.tabs.onRemoved.addListener(tabId => {
  void serial(async () => {
    await ready;
    if (store.owner?.tabId === tabId) {
      store.owner = undefined;
      store.listening = undefined;
      await save();
    }
  }).catch(() => undefined);
});
