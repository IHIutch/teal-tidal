import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
const files = ['popup.html', 'popup.css', 'popup.js', 'content.js', manifest.background.service_worker,
  ...Object.values(manifest.icons), 'LICENSE', 'THIRD_PARTY_NOTICES.md'];
for (const file of files) {
  if (!existsSync(resolve('dist', file))) throw new Error(`Missing packaged file: ${file}`);
}
if (manifest.host_permissions.includes('https://*/*')) throw new Error('Unexpected all-sites access');
mkdirSync('artifacts', { recursive: true });
const name = `teal-tidal-${manifest.version}.zip`;
const archive = resolve('artifacts', name);
rmSync(archive, { force: true });
execFileSync('zip', ['-qr', archive, '.'], { cwd: 'dist' });
const entries = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n');
if (!entries.includes('manifest.json') || files.some(file => !entries.includes(file))) {
  throw new Error('Invalid archive layout');
}
const checksum = createHash('sha256').update(readFileSync(archive)).digest('hex');
writeFileSync('artifacts/SHA256SUMS', `${checksum}  ${name}\n`);
console.log(`Packaged ${archive}\nSHA256 ${checksum}`);
