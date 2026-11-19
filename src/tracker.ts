import type { ListeningState, PlayRecord, Sample } from './types';

// Whole track below 2 minutes; at least 2 minutes otherwise, increasing to
// half the track, with a 4 minute cap. Matches the current teal lexicon.
export function threshold(duration: number): number {
  return Math.max(Math.min(duration, 120), Math.min(duration / 2, 240));
}
export function advance(previous: ListeningState | undefined, sample: Sample, now: number): ListeningState {
  const looped = previous && previous.track.id === sample.track.id && sample.playing &&
    sample.position < 3 && previous.position > Math.max(3, sample.track.duration - 3);
  if (!previous || previous.track.id !== sample.track.id || looped) {
    return { track: sample.track, startedAt: now, sampledAt: now, position: sample.position,
      playing: sample.playing, listened: 0, queued: false };
  }
  const elapsed = (now - previous.sampledAt) / 1000;
  const progress = sample.position - previous.position;
  // Only credit observed playback. Seeks, paused time, and long gaps don't count.
  const credit = previous.playing && elapsed > 0 && elapsed <= 6 && progress > 0 && progress <= elapsed + 1.25
    ? Math.min(progress, elapsed + 0.25) : 0;
  return { ...previous, track: sample.track, sampledAt: now, position: sample.position,
    playing: sample.playing, listened: previous.listened + credit };
}
export function qualified(state: ListeningState): boolean {
  return !state.queued && state.listened >= threshold(state.track.duration);
}
export function toRecord(state: ListeningState): PlayRecord {
  return {
    $type: 'fm.teal.feed.play', trackName: state.track.title,
    artists: state.track.artists.map(artistName => ({ artistName })),
    ...(state.track.album ? { releaseName: state.track.album } : {}),
    duration: Math.round(state.track.duration), playedTime: new Date(state.startedAt).toISOString(),
    originUri: `https://tidal.com/track/${state.track.id}`, musicServiceUri: 'https://tidal.com',
    submissionClientAgent: 'app.teal-tidal.extension/0.1.0',
  };
}
export function validSample(value: unknown): value is Sample {
  if (!value || typeof value !== 'object') return false;
  const s = value as Sample;
  const t = s.track;
  const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && new TextEncoder().encode(v).length <= 256;
  return !!t && typeof t === 'object' && typeof t.id === 'string' && /^\d{1,20}$/.test(t.id) &&
    text(t.title) && Array.isArray(t.artists) && t.artists.length > 0 && t.artists.length <= 30 &&
    t.artists.every(text) && (t.album === undefined || text(t.album)) &&
    Number.isFinite(t.duration) && t.duration > 0 && t.duration <= 86400 &&
    Number.isFinite(s.position) && s.position >= 0 && s.position <= t.duration + 2 && typeof s.playing === 'boolean';
}
