import { defineConfig } from 'rolldown';

export default defineConfig({
  input: './src/index.ts',
  output: {
    file: './dist/index.js',
    format: 'esm',
    sourcemap: true,
  },
  external: ['@mks2508/better-logger', '@mks2508/no-throw'],
});
