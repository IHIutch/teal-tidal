import { Client, ok } from '@atcute/client';
import { PasswordSession, type PasswordSessionData, type PasswordSessionOptions } from '@atcute/password-session';
import type {} from '@atcute/atproto';
import type { PendingPlay } from './types';

export const boundedFetch: typeof fetch = (input, init) => fetch(input, {
  ...init,
  signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
});
export function serviceUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Use an HTTPS server origin, such as https://bsky.social.');
  }
  return url.origin;
}
export function restoreSession(data: PasswordSessionData, options: PasswordSessionOptions): PasswordSession {
  return new PasswordSession(data, { ...options, fetch: boundedFetch });
}
export async function connect(handle: string, password: string, service: string): Promise<PasswordSessionData> {
  if (!handle.trim() || !password.trim()) throw new Error('Enter your full handle and an app password.');
  const auth = await PasswordSession.login({ identifier: handle.trim().replace(/^@/, ''),
    password: password.trim(), service: serviceUrl(service) }, { fetch: boundedFetch });
  if (!auth.session.active) throw new Error('This account is not active.');
  return auth.session;
}
// Stable TID + putRecord makes retries idempotent, including lost responses.
export async function publish(client: Client, play: PendingPlay): Promise<string> {
  const result = await ok(client.post('com.atproto.repo.putRecord', {
    input: { repo: play.did, collection: 'fm.teal.feed.play', rkey: play.rkey, record: { ...play.record } },
  }));
  return result.uri;
}
