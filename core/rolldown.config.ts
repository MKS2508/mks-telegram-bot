import { defineConfig } from 'rolldown';

export default defineConfig({
  input: './src/index.ts',
  output: {
    file: './dist/index.js',
    format: 'esm',
    sourcemap: true,
  },
  external: ['grammy', 'telegraf', '@mks2508/telegram-bot-utils', '@mks2508/telegram-message-builder', 'zod'],
});
