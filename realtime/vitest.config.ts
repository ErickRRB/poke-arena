import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

export default defineConfig({
  plugins: [cloudflareTest({ config: './cloudflare.config.ts' })],
  test: { include: ['tests/**/*.test.js'], testTimeout: 15000, hookTimeout: 15000 },
});
