import { build, type InlineConfig } from 'tsdown';
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist');
await cp('public', 'dist', { recursive: true });

// These are browser applications, so dependencies must be bundled rather than
// externalized as they would be for a library. Each script is self-contained.
const common: InlineConfig = {
  config: false,
  platform: 'browser',
  target: 'chrome120',
  outDir: 'dist',
  clean: false,
  dts: false,
  minify: true,
  deps: { alwaysBundle: [/.*/], onlyBundle: [/^@atcute\//], onlyImport: [] },
  outputOptions: { entryFileNames: '[name].js', codeSplitting: false },
};

const packages = new Set<string>();
for (const [name, format] of [['background', 'esm'], ['content', 'iife'], ['popup', 'esm']] as const) {
  const result = await build({ ...common, entry: { [name]: `src/${name}.ts` }, format });
  for (const bundle of result.bundles) {
    for (const chunk of bundle.chunks) {
      if (chunk.type !== 'chunk') continue;
      for (const path of Object.keys(chunk.modules)) {
        const match = path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
        if (match?.[1]) packages.add(match[1]);
      }
    }
  }
}

await cp('LICENSE', 'dist/LICENSE');
await cp('THIRD_PARTY_NOTICES.md', 'dist/THIRD_PARTY_NOTICES.md');
let licenses = '';
for (const name of [...packages].sort()) {
  let license: string | undefined;
  for (const file of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    try { license = await readFile(`node_modules/${name}/${file}`, 'utf8'); break; } catch {}
  }
  if (!license) throw new Error(`Missing license text for ${name}`);
  licenses += `${name}\n${'='.repeat(name.length)}\n${license}\n\n`;
}
await writeFile('dist/DEPENDENCY_LICENSES.txt', licenses);
console.log('Extension built in dist/. Load this directory as an unpacked extension.');
