import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'playwright-report/**',
      'test-results/**',
      '.superpowers/**',
      '.local/**',
    ],
  },
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
);
