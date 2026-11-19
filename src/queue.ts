import type { PendingPlay } from './types';

export function nextRetry(attempts: number, now: number): number {
  return now + Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.min(attempts - 1, 7));
}
export async function deliver(
  queue: PendingPlay[], did: string, now: number,
  send: (play: PendingPlay) => Promise<string>, save: () => Promise<void>,
  onSuccess: (play: PendingPlay, uri: string) => void,
): Promise<void> {
  let processed = 0;
  for (const play of [...queue]) {
    if (play.did !== did) continue;
    if (play.nextAttempt > now) break;
    if (processed++ >= 5) break;
    try {
      const uri = await send(play);
      queue.splice(queue.indexOf(play), 1);
      onSuccess(play, uri);
    } catch {
      play.attempts++;
      play.nextAttempt = nextRetry(play.attempts, now);
      play.error = 'Submission failed. Check your connection or reconnect your account.';
      await save();
      break;
    }
    await save();
  }
}
