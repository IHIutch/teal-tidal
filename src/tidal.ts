import type { Sample } from './types';

export function parseTime(text: string | null): number | undefined {
  if (!text) return undefined;
  const parts = text.trim().split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some(p => !/^\d{1,3}$/.test(p))) return undefined;
  if (parts.slice(1).some(p => Number(p) >= 60)) return undefined;
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
}
export function readTidal(doc: Document, metadata?: Pick<MediaMetadata, 'album'> | null): Sample | undefined {
  const player = doc.querySelector('#footerPlayer');
  if (!player) return undefined;
  const titleNode = player.querySelector('[data-test="footer-track-title"]');
  const trackLink = titleNode?.querySelector('a[href]')?.getAttribute('href');
  const id = trackLink?.match(/\/track\/(\d+)(?:[/?#]|$)/)?.[1];
  const title = titleNode?.textContent?.trim();
  const artists = [...player.querySelectorAll('a[data-test="grid-item-detail-text-title-artist"]')]
    .map(el => el.textContent?.trim()).filter((v): v is string => !!v);
  const album = metadata?.album?.trim() || [...player.querySelectorAll('a[href^="/album/"]')]
    .find(el => !el.getAttribute('href')?.includes('/track/'))?.textContent?.trim();
  const position = parseTime(player.querySelector('[data-test="current-time"]')?.textContent ?? null);
  const duration = parseTime(player.querySelector('[data-test="duration"]')?.textContent ?? null);
  const pause = player.querySelector('button[data-test="pause"]');
  const play = player.querySelector('button[data-test="play"]');
  if (!id || !title || !artists.length || position === undefined || !duration || (!pause && !play)) return undefined;
  return { track: { id, title, artists: [...new Set(artists)], ...(album ? { album } : {}), duration },
    position, playing: !!pause };
}
