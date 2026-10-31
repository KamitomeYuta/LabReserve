import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['apps/**/*.unit.test.ts', 'examples/**/*.test.ts'] } });
