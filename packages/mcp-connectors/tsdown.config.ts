import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  format: 'esm',
  dts: {
    tsgo: true,
  },
  clean: true,
  sourcemap: true,
  unbundle: true,
  exports: {
    devExports: 'bun',
  },
  publint: true,
  unused: true,
});
