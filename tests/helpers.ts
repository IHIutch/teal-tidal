import { toRecord, advance } from '../src/tracker';
import type { PendingPlay } from '../src/types';

export function pending(did: PendingPlay['did'] = 'did:plc:test'): PendingPlay {
  const state = advance(undefined, { track: { id: '123', title: 'Track', artists: ['Artist'], duration: 300 }, position: 0, playing: true }, 1000);
  return { did, rkey: '3m5testtest222', record: toRecord(state), attempts: 0, nextAttempt: 0 };
}
