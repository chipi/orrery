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
    // Physics-kernel purity gate (RFC-037 §3 / D1 · epic #458 · S1.5 seal, hardened).
    // `src/lib/physics/**` is the pure, framework-free kernel imported unchanged by
    // both the SvelteKit app and a standalone Node process. DENY-BY-DEFAULT: it may
    // depend ONLY on `$types/*` (shared types), `$data/*` (sanctioned build-time JSON,
    // D2-b) and intra-kernel `$lib/physics/*`. Everything else — the renderer (three),
    // the framework (svelte/$app), any app-internal `$lib/*`, dynamic import(), DOM
    // globals — is forbidden. What ADR-030 kept by convention is now enforced.
    // (Fable-5 S1 holistic B1: the earlier allowlist was decorative — top-level
    // $lib/*.ts, relative escapes, dynamic imports and DOM globals all slipped through.)
    files: ['src/lib/physics/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Deny all $lib EXCEPT the kernel itself; deny framework/renderer.
              // $types/* and $data/* are NOT $lib, so remain allowed by omission.
              group: [
                'three',
                'three/*',
                'svelte',
                'svelte/*',
                '$app/*',
                '$lib/**',
                '!$lib/physics',
                '!$lib/physics/**',
              ],
              message:
                'physics kernel must stay pure — only $types/*, $data/* (D2-b) and $lib/physics/* are allowed (RFC-037 §3). Move the impure part app-side.',
            },
          ],
        },
      ],
    },
  },
  {
    // MCP-consumer boundary (S4 · #462 · 2026-09-01 plan review MAJOR-4). The
    // standalone MCP server (`server/**`) and the app-side lab modules it consumes
    // (codec + recompute engine) must run in bare Node — an app edit coupling them
    // to svelte/$app/three would only surface at the MCP container's cold CI
    // build. Enforce the boundary where the edit happens instead.
    files: ['server/**/*.ts', 'src/lib/lab/codec.ts', 'src/lib/lab/notebook.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['three', 'three/*', 'svelte', 'svelte/*', '$app/*'],
              message:
                'consumed by the standalone MCP server (server/mcp) — must stay framework-free (bare Node).',
            },
          ],
        },
      ],
    },
  },
  {
    // Stricter rules for NON-TEST kernel files (the shipped contract). Tests are
    // exempt: they legitimately use dynamic import() for orchestration and reach
    // `../../test-helpers/*`. (Fable-5 S1 holistic B1.)
    // - relative-escape ban: a kernel module lives at physics/<domain>/x.ts, so
    //   `../<domain>` (intra-kernel) is legal but `../../` escapes into app-side src/lib.
    // - no dynamic import() (no-restricted-imports can't see ImportExpression).
    // - no DOM / browser globals.
    files: ['src/lib/physics/**/*.ts'],
    ignores: ['src/lib/physics/**/*.test.ts'],
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
                '$lib/**',
                '!$lib/physics',
                '!$lib/physics/**',
                '../../**',
              ],
              message:
                'physics kernel: no relative import escaping src/lib/physics (`../../` and deeper) — use $types/*, $data/* or $lib/physics/* (RFC-037 §3).',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression',
          message: 'physics kernel: no dynamic import() — static imports only (RFC-037 §3).',
        },
        {
          // Ban `x as Unit` — it smuggles a wrong unit past the compiler (the exact
          // hazard the closed Unit union prevents; S2a/B4). Use a Unit-union literal.
          selector: "TSAsExpression[typeAnnotation.typeName.name='Unit']",
          message:
            'physics kernel: no `as Unit` cast — assign a literal member of the Unit union instead (S2a B4).',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'physics kernel must not touch the DOM.' },
        { name: 'document', message: 'physics kernel must not touch the DOM.' },
        { name: 'localStorage', message: 'physics kernel must not touch storage.' },
        { name: 'sessionStorage', message: 'physics kernel must not touch storage.' },
        { name: 'navigator', message: 'physics kernel must not touch navigator.' },
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
      'dist-mcp/', // esbuild-bundled MCP server output (S4) — generated, gitignored
      'dist-lab-api/', // esbuild-bundled lab-api output (D) — generated, gitignored
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
