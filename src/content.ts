import { readTidal } from './tidal';

async function sample() {
  try {
    await chrome.runtime.sendMessage({ type: 'sample', sample: readTidal(document) ?? null });
  } catch {
    // Reloading the extension invalidates old content scripts. Reload TIDAL too.
    clearInterval(timer);
  }
}
const timer = setInterval(() => void sample(), 1000);
void sample();
