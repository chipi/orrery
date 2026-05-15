import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  ...svelte.configs['flat/prettier'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Vite-injected build-time constants — see vite.config.ts `define`.
        __APP_VERSION__: 'readonly',
        __BUILD_DATE__: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
  {
    ignores: [
      'build/',
      '.svelte-kit/',
      'dist/',
      'node_modules/',
      'src/lib/paraglide/',
      'docs/.vitepress/dist/',
      'docs/.vitepress/cache/',
      'playwright-report/',
      'test-results/',
      // Generated coverage report (@vitest/coverage-v8 HTML/lcov, S1).
      'coverage/',
      // Local-only Python virtualenvs (gitignored) — used by Argos
      // Translate scripts. Ship-time CI checkouts never see these.
      '.venv-argos/',
      '.xdg-data/',
      '.xdg-config/',
      '.xdg-cache/',
    ],
  },
];
