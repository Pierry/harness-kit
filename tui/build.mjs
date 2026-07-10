// Bundle the cockpit TUI into a single self-contained file shipped with harness-kit.
// No runtime dependencies land in the root package; everything is inlined here.
import { build, context } from 'esbuild';
import { chmodSync } from 'node:fs';

// Ink statically imports react-devtools-core, only used under DEV. Stub it to an
// empty module so the bundle stays self-contained and never requires it at runtime.
const stubDevtools = {
  name: 'stub-devtools',
  setup(b) {
    b.onResolve({ filter: /^react-devtools-core$/ }, () => ({
      path: 'react-devtools-core',
      namespace: 'stub-devtools',
    }));
    b.onLoad({ filter: /.*/, namespace: 'stub-devtools' }, () => ({
      contents: 'export default {}',
      loader: 'js',
    }));
  },
};

const opts = {
  entryPoints: ['src/cockpit.tsx'],
  outfile: 'dist/cockpit.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  jsx: 'automatic',
  banner: { js: '#!/usr/bin/env node' },
  plugins: [stubDevtools],
  // yoga-layout-prebuilt (Ink 4) is asm.js and bundles cleanly.
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const ctx = await context(opts);
  await ctx.watch();
  console.log('cockpit: watching for changes...');
} else {
  await build(opts);
  chmodSync('dist/cockpit.cjs', 0o755); // executable, so the hk-tui bin works directly
  console.log('cockpit: built dist/cockpit.cjs');
}
