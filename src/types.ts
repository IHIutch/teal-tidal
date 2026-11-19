export interface Track {
  id: string;
  title: string;
  artists: string[];
  album?: string;
  duration: number;
}
export interface Sample { track: Track; position: number; playing: boolean }
export interface ListeningState {
  track: Track;
  startedAt: number;
  sampledAt: number;
  position: number;
  playing: boolean;
  listened: number;
  queued: boolean;
}
export interface PlayRecord {
  $type: 'fm.teal.feed.play';
  trackName: string;
  artists: { artistName: string }[];
  releaseName?: string;
  duration: number;
  playedTime: string;
  originUri: string;
  musicServiceUri: string;
  submissionClientAgent: string;
}
export interface PendingPlay {
  did: `did:${string}:${string}`;
  rkey: string;
  record: PlayRecord;
  attempts: number;
  nextAttempt: number;
  error?: string;
}
export interface Store {
  enabled: boolean;
  owner?: { tabId: number; seenAt: number };
  listening?: ListeningState;
  queue: PendingPlay[];
  sent: number;
  lastSent?: { title: string; uri: string; at: number };
  error?: string;
}
export interface Status {
  account?: { handle: string; did: string };
  enabled: boolean;
  listening?: ListeningState;
  queueLength: number;
  sent: number;
  lastSent?: Store['lastSent'];
  error?: string;
}
export type Command =
  | { type: 'status' }
  | { type: 'login'; handle: string; password: string; service: string }
  | { type: 'logout' }
  | { type: 'toggle'; enabled: boolean }
  | { type: 'retry' };
export type Reply = { ok: true; status: Status } | { ok: false; error: string };
