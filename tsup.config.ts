import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' }
    },
  },
  {
    entry: { 'cli-auth': 'src/adapters/cli-auth/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    clean: false,
    sourcemap: true,
    external: ['@marswave/listenhub-sdk'],
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' }
    },
  },
])
