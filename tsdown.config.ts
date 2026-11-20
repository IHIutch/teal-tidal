import { defineConfig, type UserConfig } from 'tsdown';

const common: UserConfig = {
  platform: 'browser',
  target: 'chrome120',
  outDir: 'dist',
  clean: true,
  dts: false,
  minify: true,
  outputOptions: { entryFileNames: '[name].js', codeSplitting: false },
};

export default defineConfig(
  (['background', 'content', 'popup'] as const).map((name): UserConfig => ({
    ...common,
    name,
    entry: { [name]: `src/${name}.ts` },
    format: name === 'content' ? 'iife' : 'esm',
    // Browser scripts must be self-contained. Only the worker uses atcute.
    deps: {
      alwaysBundle: [/^@atcute\//],
      onlyBundle: name === 'background' ? [/^@atcute\//] : [],
      onlyImport: [],
    },
    copy: name === 'background'
      ? ['src/manifest.json', 'src/popup.html', 'LICENSE', 'THIRD_PARTY_NOTICES.md']
      : undefined,
  })),
);
