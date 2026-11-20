import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, finish, qualified, threshold, toRecord, validSample } from '../src/tracker';
import type { ListeningState, Sample } from '../src/types';

const track = { id: '123', title: 'A song', artists: ['An artist'], album: 'An album', duration: 300 };
const sample = (position: number, playing = true): Sample => ({ track, position, playing });
const nextSample = (position: number, playing = true): Sample => ({ ...sample(position, playing), track: { ...track, id: '456' } });

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
test('short tracks qualify on a supported transition, including repeats, without duplicating', () => {
  const short = (position: number): Sample => ({ ...sample(position), track: { ...track, duration: 90 } });
  let state: ListeningState | undefined;
  for (let second = 1; second <= 89; second++) state = advance(state, short(second), second * 1000);
  assert.equal(state!.listened, 89);
  assert.equal(state!.startedAt, 0);
  assert.equal(qualified(state!), false);
  for (const next of [nextSample(0), short(0)]) {
    const completed = finish(state, next, 90_000)!;
    assert.equal(completed.track.duration, 90);
    assert.equal(completed.listened, 90);
    assert.equal(qualified(completed), true);
    assert.equal(qualified(finish({ ...state!, queued: true }, next, 90_000)!), false);
    assert.equal(advance(state, next, 90_000).listened, 0);
  }
});
test('completion inference excludes pauses, seeks, missing starts, long gaps and unsupported timing', () => {
  const state: ListeningState = { track: { ...track, duration: 90 }, startedAt: 0,
    sampledAt: 89_000, position: 89, playing: true, listened: 89, queued: false };
  for (const [previous, next, now] of [
    [{ ...state, playing: false }, nextSample(0), 90_000],
    [state, nextSample(0, false), 90_000],
    [{ ...state, listened: 85 }, nextSample(0), 90_000],
    [{ ...state, position: 87, listened: 87 }, nextSample(0), 90_000],
    [state, nextSample(0), 100_000],
    [state, nextSample(0), 89_500],
    [state, nextSample(1), 90_000],
    [state, nextSample(4), 94_000],
  ] as const) {
    assert.equal(qualified(finish(previous, next, now)!), false);
  }
  assert.equal(finish(state, { ...sample(89), track: state.track }, 90_000), undefined);
  assert.equal(advance(undefined, sample(2), 1000).listened, 0);
  assert.equal(advance(undefined, sample(1, false), 1000).listened, 0);
});
test('record validation rejects malformed and oversized page metadata', () => {
  assert.equal(validSample(sample(10)), true);
  for (const value of [null, {}, { ...sample(10), position: NaN }, { ...sample(10), position: -1 },
    { ...sample(10), track: { ...track, id: 'https://attacker.test' } },
    { ...sample(10), track: { ...track, title: 'é'.repeat(200) } },
    { ...sample(10), track: { ...track, artists: [] } }]) assert.equal(validSample(value), false);
});
