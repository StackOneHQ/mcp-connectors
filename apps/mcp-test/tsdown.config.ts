import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts', './src/internal-server.ts'],
  format: ['esm'],
  publint: true,
  unused: true,
  unbundle: true,
  dts: false,
  sourcemap: false,
  minify: false,
  clean: true,
  banner: '#!/usr/bin/env node',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  exports: {
    devExports: true,
  }
});
