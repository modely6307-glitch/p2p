import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// @ts-ignore - vitest-tsconfig-paths may have resolution issues in some environments
import tsconfigPaths from 'vitest-tsconfig-paths';

export default defineConfig({
  plugins: [react() as any, tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
