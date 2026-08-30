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
        __BUILD_TAG__: 'readonly',
        __MOBILE__: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // eslint-plugin-svelte v3 flags every `new Map()` / `new Set()` in
      // .svelte / .svelte.ts files. Orrery uses Map/Set overwhelmingly as
      // plain data structures — hit-test caches in the Three.js render loop,
      // local temporaries, pure-function accumulators — none of which are
      // reactive UI state. Swapping them to SvelteMap/SvelteSet would add
      // reactivity machinery to hot paths for no benefit. Genuine reactive
      // collections opt into SvelteMap/SvelteSet explicitly where needed.
      'svelte/prefer-svelte-reactivity': 'off',
      // SvelteKit's resolve() is built for route IDs + params and is typed to
      // accept only static route literals. Orrery navigates overwhelmingly by
      // query string (/missions?id=X, modals on the index route — there is no
      // /missions/[id] route by design) and by paths computed at runtime
      // (localizeHref for i18n, routes stored in data). resolve() cannot
      // type-check those, so this rule only fits a route-ID navigation style
      // that isn't ours. Base-correctness — the real requirement across the
      // /orrery/ base path, capacitor:// and dev — is handled uniformly by
      // `base` from $app/paths (still first-class SvelteKit). Revisit adopting
      // resolve() if we ever move deep-links to real dynamic routes.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    // Physics-kernel purity gate (RFC-037 §3 / D1 · epic #458 · S1.0 scaffold).
    // `src/lib/physics/**` is the pure, framework-free kernel imported unchanged
    // by both the SvelteKit app and a standalone Node process. It may NOT depend
    // on the renderer (three), the framework (svelte / $app), app-internal $lib
    // modules, or the DOM. Shared `$types/*` and intra-kernel `$lib/physics/*`
    // imports are allowed. ENFORCED at 'error' (S1.5 — kernel fully carved); the
    // pure core cannot regain a framework dependency. What ADR-030 kept by
    // convention is now a lint gate (docs/wip/2026-08-29-s1-kernel-boundary-manifest.md §5).
    files: ['src/lib/physics/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'three',
                'three/*',
                'svelte',
                'svelte/*',
                '$app/*',
                '$lib/components/*',
                '$lib/three/*',
                '$lib/stores/*',
                '$lib/fly/*',
                '$lib/data/*',
                '$lib/science-layers',
                '$lib/paraglide/*',
              ],
              message:
                'physics kernel must stay pure — no three / svelte / $app / app-internal $lib / DOM (RFC-037 §3). Move the impure part app-side.',
            },
          ],
        },
      ],
    },
  },
  {
    // eslint-plugin-svelte v3 routes .svelte, .svelte.ts and .svelte.js
    // (Svelte 5 rune modules) through svelte-eslint-parser; give it the
    // TypeScript sub-parser so the .svelte.ts modules parse as TS.
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
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
      // Capacitor native project dirs — platform-generated + the synced web
      // bundle copy (cap sync populates ios/App/App/public +
      // android/.../assets/public with build/; Xcode writes ios/DerivedData).
      // All gitignored where generated; never hand-authored source to lint.
      'ios/',
      'android/',
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
      // Linux node_modules cache (gitignored) — populated by
      // scripts/regenerate-visual-baselines-linux.sh inside the
      // Playwright Docker image. Contains arch-specific binaries +
      // bundled/minified vendor JS that ESLint shouldn't lint.
      '.linux-node-modules/',
      // Retired one-shot scripts (per-wave migrations, slice fetches,
      // translation passes). Kept for historical reference only — never
      // re-run, and their relative imports no longer resolve from the
      // archive depth. Inventory: docs/reference/tooling/archive.md.
      'scripts/_archive/',
      // Scratch: POC scripts + validation composites/screenshots (gitignored).
      '.moon-shots/',
    ],
  },
];
