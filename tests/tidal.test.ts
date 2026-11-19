import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { parseTime, readTidal } from '../src/tidal';

const fixture = `<div id="footerPlayer">
  <div data-test="footer-track-title"><a href="/album/999/track/123">Example song</a></div>
  <a data-test="grid-item-detail-text-title-artist">Artist one</a>
  <a data-test="grid-item-detail-text-title-artist">Artist two</a>
  <a href="/album/999">Example album</a>
  <button data-test="pause"></button>
  <time data-test="current-time">1:30</time><time data-test="duration">5:00</time>
</div>`;

test('reads a TIDAL footer with multiple artists and an album track URL', () => {
  const { document } = parseHTML(fixture);
  assert.deepEqual(readTidal(document), { track: { id: '123', title: 'Example song',
    artists: ['Artist one', 'Artist two'], album: 'Example album', duration: 300 }, position: 90, playing: true });
});
test('detects pause and refuses missing or malformed metadata', () => {
  assert.equal(readTidal(parseHTML(fixture.replace('data-test="pause"', 'data-test="play"')).document)?.playing, false);
  assert.equal(readTidal(parseHTML(fixture.replace('5:00', '--:--')).document), undefined);
  assert.equal(readTidal(parseHTML('<div>Login page</div>').document), undefined);
});
test('parses timestamps conservatively', () => {
  assert.equal(parseTime(' 01:30 '), 90);
  assert.equal(parseTime('1:02:03'), 3723);
  for (const text of ['', '0:99', '-1:20', 'abc', '30']) assert.equal(parseTime(text), undefined);
});
