import { build } from 'esbuild';
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist');
await cp('public', 'dist', { recursive: true });
const common = { bundle: true, target: 'chrome120', minify: true, legalComments: 'eof', metafile: true };
const result = await build({ ...common, entryPoints: ['src/background.ts'], outfile: 'dist/background.js', format: 'esm' });
await build({ ...common, entryPoints: ['src/content.ts'], outfile: 'dist/content.js', format: 'iife' });
await build({ ...common, entryPoints: ['src/popup.ts'], outfile: 'dist/popup.js', format: 'esm' });
await cp('LICENSE', 'dist/LICENSE');
await cp('THIRD_PARTY_NOTICES.md', 'dist/THIRD_PARTY_NOTICES.md');
const packages = new Set(Object.keys(result.metafile.inputs).flatMap(path => {
  const match = path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
  return match ? [match[1]] : [];
}));
let licenses = '';
for (const name of [...packages].sort()) {
  let license;
  for (const file of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    try { license = await readFile(`node_modules/${name}/${file}`, 'utf8'); break; } catch {}
  }
  if (!license) throw new Error(`Missing license text for ${name}`);
  licenses += `${name}\n${'='.repeat(name.length)}\n${license}\n\n`;
}
await writeFile('dist/DEPENDENCY_LICENSES.txt', licenses);
console.log('Extension built in dist/. Load this directory as an unpacked extension.');
