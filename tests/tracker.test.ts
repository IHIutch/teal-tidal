import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, qualified, threshold, toRecord, validSample } from '../src/tracker';
import type { ListeningState, Sample } from '../src/types';

const track = { id: '123', title: 'A song', artists: ['An artist'], album: 'An album', duration: 300 };
const sample = (position: number, playing = true): Sample => ({ track, position, playing });

test('threshold follows Teal rules for short, medium and long tracks', () => {
  assert.deepEqual([45, 90, 120, 180, 240, 300, 600].map(threshold), [45, 90, 120, 120, 120, 150, 240]);
});
test('normal playback qualifies once and maps to the current lexicon', () => {
  let state: ListeningState | undefined;
  for (let i = 0; i <= 150; i++) state = advance(state, sample(i), 1_000_000 + i * 1000);
  assert.equal(state!.listened, 150);
  assert.equal(qualified(state!), true);
  const record = toRecord(state!);
  assert.equal(record.$type, 'fm.teal.feed.play');
  assert.equal(record.playedTime, new Date(1_000_000).toISOString());
  assert.deepEqual(record.artists, [{ artistName: 'An artist' }]);
  assert.equal(record.originUri, 'https://tidal.com/track/123');
  assert.equal(qualified({ ...state!, queued: true }), false);
});
test('seeking forward and sleep gaps do not count as listening', () => {
  let state = advance(undefined, sample(0), 1000);
  state = advance(state, sample(1), 2000);
  state = advance(state, sample(200), 3000);
  assert.equal(state.listened, 1);
  state = advance(state, sample(250), 53_000);
  assert.equal(state.listened, 1);
  state = advance(state, sample(251), 54_000);
  assert.equal(state.listened, 2);
});
test('pause and resume credit only time spent playing', () => {
  let state = advance(undefined, sample(0), 1000);
  state = advance(state, sample(1, false), 2000);
  state = advance(state, sample(1, false), 3000);
  state = advance(state, sample(1), 4000);
  state = advance(state, sample(2), 5000);
  assert.equal(state.listened, 2);
});
test('new tracks and repeats get their own listening state', () => {
  let state = advance(undefined, sample(298), 1000);
  state = { ...state, listened: 200, queued: true };
  state = advance(state, sample(0), 2000);
  assert.equal(state.listened, 0);
  assert.equal(state.queued, false);
  state = advance(state, { ...sample(10), track: { ...track, id: '456' } }, 3000);
  assert.equal(state.track.id, '456');
  assert.equal(state.listened, 0);
});
test('record validation rejects malformed and oversized page metadata', () => {
  assert.equal(validSample(sample(10)), true);
  for (const value of [null, {}, { ...sample(10), position: NaN }, { ...sample(10), position: -1 },
    { ...sample(10), track: { ...track, id: 'https://attacker.test' } },
    { ...sample(10), track: { ...track, title: 'é'.repeat(200) } },
    { ...sample(10), track: { ...track, artists: [] } }]) assert.equal(validSample(value), false);
});
