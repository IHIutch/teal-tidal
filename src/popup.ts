import type { Command, Reply, Status } from './types';
import { threshold } from './tracker';

function element<T extends HTMLElement = HTMLElement>(id: string) { return document.getElementById(id) as T; }
const notice = element('notice');
let busy = false;
function showError(message: string) { notice.textContent = message; notice.hidden = !message; }
function render(status: Status) {
  element('setup').hidden = !!status.account;
  element('connected').hidden = !status.account;
  element('disconnect').hidden = !status.account && !status.queueLength;
  element('account').textContent = status.account?.handle ?? '';
  element('sent').textContent = String(status.sent);
  element('pending').textContent = String(status.queueLength);
  element<HTMLButtonElement>('retry').disabled = !status.queueLength || busy;
  element('last').textContent = status.lastSent ? `Last submitted: ${status.lastSent.title}` : 'No listens submitted yet.';
  const state = status.listening;
  element('player-state').textContent = state ? (state.playing ? 'Listening on TIDAL' : 'Paused') : 'Waiting for TIDAL';
  element('track').textContent = state?.track.title ?? 'Play something you love.';
  element('artist').textContent = state?.track.artists.join(', ') ?? 'Open or reload the TIDAL web player.';
  const progress = element<HTMLProgressElement>('progress');
  progress.max = state ? threshold(state.track.duration) : 1;
  progress.value = state ? Math.min(state.listened, progress.max) : 0;
  element('progress-label').textContent = state ? (state.queued ? 'Listen captured. Check submitted / pending below.' :
    `${Math.floor(state.listened)} of ${Math.ceil(progress.max)} seconds listened`) : 'Only time spent playing counts.';
  showError(status.error ?? '');
}
async function send(command: Command) {
  const reply: Reply = await chrome.runtime.sendMessage(command);
  if (!reply?.ok) throw new Error(reply?.error ?? 'Extension unavailable. Reload it and TIDAL.');
  render(reply.status);
}
async function action(command: Command) {
  busy = true;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')];
  buttons.forEach(button => button.disabled = true);
  try { await send(command); }
  catch (error) { showError(error instanceof Error ? error.message : 'Request failed.'); }
  finally { busy = false; buttons.forEach(button => button.disabled = false); }
}
element<HTMLFormElement>('login').addEventListener('submit', event => {
  event.preventDefault();
  const password = element<HTMLInputElement>('password');
  const command: Command = { type: 'login', handle: element<HTMLInputElement>('handle').value,
    password: password.value };
  password.value = '';
  void action(command);
});
element('disconnect').addEventListener('click', () => void action({ type: 'logout' }));
element('retry').addEventListener('click', () => void action({ type: 'retry' }));
void send({ type: 'status' }).catch(error => showError(String(error)));
setInterval(() => { if (!busy) void send({ type: 'status' }).catch(() => undefined); }, 2000);
