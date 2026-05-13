# Tech Bill of Materials

> Auto-generated. **Do not edit by hand.** Re-run `npm run build-tech-bom`.

Every npm package that ships with Orrery, every build-time tool, every transitive dependency. License-audited fail-closed in CI — if a new dep ships with a license that is not in our allowlist, the build breaks and we have to make a decision.

Companion to the [image bill of materials](../static/data/image-provenance.json) and the [outbound-link bill of materials](../static/data/link-provenance.json) — every kind of "what is in this app and where did it come from" question is answered by one of those three sources.

| | |
|---|---|
| **Project** | `orrery@0.3.0` |
| **Generated** | 2026-05-13 |
| **Total packages** | 568 (3 runtime · 565 development) |
| **Top-level runtime deps** | 2 |
| **Top-level dev deps** | 30 |
| **Transitive deps** | 536 |
| **Distinct licenses** | 11 |

## License summary

| License | Count | Notes |
|---|---|---|
| `MIT` | 503 |  |
| `ISC` | 20 |  |
| `Apache-2.0` | 16 |  |
| `BSD-2-Clause` | 12 |  |
| `BlueOak-1.0.0` | 6 |  |
| `BSD-3-Clause` | 6 |  |
| `0BSD` | 1 |  |
| `MIT-0` | 1 |  |
| `CC0-1.0` | 1 |  |
| `Python-2.0` | 1 |  |
| `CC-BY-4.0` | 1 |  |

## Top-level runtime dependencies

_Bundled into the SPA and shipped to every visitor. Smallest possible surface area is the goal — we go to lengths to keep this list short._

| Package | Version | License | Description |
|---|---|---|---|
| [`katex`](https://katex.org) | 0.16.45 | `MIT` | Fast math typesetting for the web. |
| [`three`](https://threejs.org/) | 0.128.0 | `MIT` | JavaScript 3D library |

## Top-level development dependencies

_Build-time tools — not shipped to browsers._

| Package | Version | License | Description |
|---|---|---|---|
| [`@eslint/js`](https://eslint.org) | 9.17.0 | `MIT` | ESLint JavaScript language implementation |
| [`@inlang/paraglide-js`](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) | 1.11.2 | `Apache-2.0` |  |
| [`@playwright/test`](https://playwright.dev) | 1.59.1 | `Apache-2.0` | A high-level API to automate web browsers |
| [`@sveltejs/adapter-static`](https://svelte.dev/docs/kit/adapter-static) | 3.0.10 | `MIT` | Adapter for SvelteKit apps that prerenders your entire site as a collection of static files |
| [`@sveltejs/kit`](https://svelte.dev) | 2.10.1 | `MIT` | SvelteKit is the fastest way to build Svelte apps |
| [`@sveltejs/vite-plugin-svelte`](https://github.com/sveltejs/vite-plugin-svelte#readme) | 4.0.4 | `MIT` |  |
| [`@types/katex`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/katex) | 0.16.8 | `MIT` | TypeScript definitions for katex |
| [`@types/node`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node) | 22.10.2 | `MIT` | TypeScript definitions for node |
| [`@types/three`](https://github.com/DefinitelyTyped/DefinitelyTyped) | 0.128.0 | `MIT` | TypeScript definitions for three |
| [`@vite-pwa/sveltekit`](https://github.com/vite-pwa/sveltekit#readme) | 1.1.0 | `MIT` | Zero-config PWA for SvelteKit |
| [`ajv`](https://ajv.js.org) | 8.20.0 | `MIT` | Another JSON Schema Validator |
| [`ajv-formats`](https://github.com/ajv-validator/ajv-formats#readme) | 3.0.1 | `MIT` | Format validation for Ajv v7+ |
| [`canvas`](https://github.com/Automattic/node-canvas) | 3.2.3 | `MIT` | Canvas graphics API backed by Cairo |
| [`eslint`](https://eslint.org) | 9.17.0 | `MIT` | An AST-based pattern checker for JavaScript. |
| [`eslint-config-prettier`](prettier/eslint-config-prettier) | 9.1.0 | `MIT` | Turns off all rules that are unnecessary or might conflict with Prettier. |
| [`eslint-plugin-svelte`](https://sveltejs.github.io/eslint-plugin-svelte) | 2.46.1 | `MIT` | ESLint plugin for Svelte using AST |
| [`globals`](sindresorhus/globals) | 15.14.0 | `MIT` | Global identifiers from different JavaScript environments |
| [`jsdom`](https://github.com/jsdom/jsdom) | 26.0.0 | `MIT` | A JavaScript implementation of many web standards |
| [`prettier`](https://prettier.io) | 3.4.2 | `MIT` | Prettier is an opinionated code formatter |
| [`prettier-plugin-svelte`](https://github.com/sveltejs/prettier-plugin-svelte#readme) | 3.5.1 | `MIT` | Svelte plugin for prettier |
| [`svelte`](https://svelte.dev) | 5.16.0 | `MIT` | Cybernetically enhanced web apps |
| [`svelte-check`](https://github.com/sveltejs/language-tools#readme) | 4.4.8 | `MIT` | Svelte Code Checker Terminal Interface |
| [`tslib`](https://www.typescriptlang.org/) | 2.8.1 | `0BSD` | Runtime library for TypeScript helper functions |
| [`tsx`](https://tsx.is) | 4.19.2 | `MIT` | TypeScript Execute (tsx): Node.js enhanced with esbuild to run TypeScript & ESM files |
| [`typescript`](https://www.typescriptlang.org/) | 5.7.2 | `Apache-2.0` | TypeScript is a language for application scale JavaScript development |
| [`typescript-eslint`](https://typescript-eslint.io/packages/typescript-eslint) | 8.18.2 | `MIT` | Tooling which enables you to use TypeScript with ESLint |
| [`vite`](https://vite.dev) | 5.4.11 | `MIT` | Native-ESM powered web dev build tool |
| [`vitepress`](https://vitepress.dev/) | 1.5.0 | `MIT` | Vite & Vue powered static site generator |
| [`vitepress-sidebar`](https://vitepress-sidebar.cdget.com) | 1.25.2 | `MIT` | A VitePress auto sidebar plugin that automatically creates a simple configuration. |
| [`vitest`](https://github.com/vitest-dev/vitest#readme) | 2.1.8 | `MIT` | Next generation testing framework powered by Vite |

## Transitive dependencies

<details><summary>Show all 536 transitive packages</summary>

| Package | Version | License | Scope |
|---|---|---|---|
| [`commander`](https://github.com/tj/commander.js) | 11.1.0 | `MIT` | runtime |
| [`@algolia/autocomplete-core`](https://github.com/algolia/autocomplete) | 1.17.9 | `MIT` | development |
| [`@algolia/autocomplete-plugin-algolia-insights`](https://github.com/algolia/autocomplete) | 1.17.9 | `MIT` | development |
| [`@algolia/autocomplete-preset-algolia`](https://github.com/algolia/autocomplete) | 1.17.9 | `MIT` | development |
| [`@algolia/autocomplete-shared`](https://github.com/algolia/autocomplete) | 1.17.9 | `MIT` | development |
| [`@algolia/client-common`](https://github.com/algolia/algoliasearch-client-javascript#readme) | 5.51.0 | `MIT` | development |
| [`@algolia/client-search`](https://github.com/algolia/algoliasearch-client-javascript/tree/main/packages/client-search#readme) | 5.51.0 | `MIT` | development |
| [`@algolia/requester-browser-xhr`](https://github.com/algolia/algoliasearch-client-javascript#readme) | 5.51.0 | `MIT` | development |
| [`@algolia/requester-fetch`](https://github.com/algolia/algoliasearch-client-javascript#readme) | 5.51.0 | `MIT` | development |
| [`@algolia/requester-node-http`](https://github.com/algolia/algoliasearch-client-javascript#readme) | 5.51.0 | `MIT` | development |
| [`@apideck/better-ajv-errors`](https://github.com/apideck-libraries/better-ajv-errors) | 0.3.7 | `MIT` | development |
| [`@asamuzakjp/css-color`](https://github.com/asamuzaK/cssColor#readme) | 3.2.0 | `MIT` | development |
| [`@babel/code-frame`](https://babel.dev/docs/en/next/babel-code-frame) | 7.29.0 | `MIT` | development |
| [`@babel/compat-data`](https://github.com/babel/babel) | 7.29.3 | `MIT` | development |
| [`@babel/core`](https://babel.dev/docs/en/next/babel-core) | 7.29.0 | `MIT` | development |
| [`@babel/generator`](https://babel.dev/docs/en/next/babel-generator) | 7.29.1 | `MIT` | development |
| [`@babel/helper-annotate-as-pure`](https://babel.dev/docs/en/next/babel-helper-annotate-as-pure) | 7.27.3 | `MIT` | development |
| [`@babel/helper-compilation-targets`](https://github.com/babel/babel) | 7.28.6 | `MIT` | development |
| [`@babel/helper-create-class-features-plugin`](https://github.com/babel/babel) | 7.29.3 | `MIT` | development |
| [`@babel/helper-create-regexp-features-plugin`](https://github.com/babel/babel) | 7.28.5 | `MIT` | development |
| [`@babel/helper-define-polyfill-provider`](https://github.com/babel/babel-polyfills) | 0.6.8 | `MIT` | development |
| [`@babel/helper-globals`](https://github.com/babel/babel) | 7.28.0 | `MIT` | development |
| [`@babel/helper-member-expression-to-functions`](https://babel.dev/docs/en/next/babel-helper-member-expression-to-functions) | 7.28.5 | `MIT` | development |
| [`@babel/helper-module-imports`](https://babel.dev/docs/en/next/babel-helper-module-imports) | 7.28.6 | `MIT` | development |
| [`@babel/helper-module-transforms`](https://babel.dev/docs/en/next/babel-helper-module-transforms) | 7.28.6 | `MIT` | development |
| [`@babel/helper-optimise-call-expression`](https://babel.dev/docs/en/next/babel-helper-optimise-call-expression) | 7.27.1 | `MIT` | development |
| [`@babel/helper-plugin-utils`](https://babel.dev/docs/en/next/babel-helper-plugin-utils) | 7.28.6 | `MIT` | development |
| [`@babel/helper-remap-async-to-generator`](https://babel.dev/docs/en/next/babel-helper-remap-async-to-generator) | 7.27.1 | `MIT` | development |
| [`@babel/helper-replace-supers`](https://babel.dev/docs/en/next/babel-helper-replace-supers) | 7.28.6 | `MIT` | development |
| [`@babel/helper-skip-transparent-expression-wrappers`](https://github.com/babel/babel) | 7.27.1 | `MIT` | development |
| [`@babel/helper-validator-identifier`](https://github.com/babel/babel) | 7.28.5 | `MIT` | development |
| [`@babel/helper-validator-option`](https://github.com/babel/babel) | 7.27.1 | `MIT` | development |
| [`@babel/helper-wrap-function`](https://babel.dev/docs/en/next/babel-helper-wrap-function) | 7.28.6 | `MIT` | development |
| [`@babel/helpers`](https://babel.dev/docs/en/next/babel-helpers) | 7.29.2 | `MIT` | development |
| [`@babel/parser`](https://babel.dev/docs/en/next/babel-parser) | 7.29.2 | `MIT` | development |
| [`@babel/plugin-bugfix-firefox-class-in-computed-class-key`](https://babel.dev/docs/en/next/babel-plugin-bugfix-firefox-class-in-computed-class-key) | 7.28.5 | `MIT` | development |
| [`@babel/plugin-bugfix-safari-class-field-initializer-scope`](https://babel.dev/docs/en/next/babel-plugin-bugfix-safari-class-field-initializer-scope) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-bugfix-safari-id-destructuring-collision-in-function-expression`](https://babel.dev/docs/en/next/babel-plugin-bugfix-safari-id-destructuring-collision-in-function-expression) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-bugfix-safari-rest-destructuring-rhs-array`](https://babel.dev/docs/en/next/babel-plugin-bugfix-safari-rest-destructuring-rhs-array) | 7.29.3 | `MIT` | development |
| [`@babel/plugin-bugfix-v8-spread-parameters-in-optional-chaining`](https://babel.dev/docs/en/next/babel-plugin-bugfix-v8-spread-parameters-in-optional-chaining) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-bugfix-v8-static-class-fields-redefine-readonly`](https://babel.dev/docs/en/next/babel-plugin-bugfix-v8-static-class-fields-redefine-readonly) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-proposal-private-property-in-object`](https://babel.dev/docs/en/next/babel-plugin-proposal-private-property-in-object) | 7.21.0-placeholder-for-preset-env.2 | `MIT` | development |
| [`@babel/plugin-syntax-import-assertions`](https://github.com/babel/babel) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-syntax-import-attributes`](https://github.com/babel/babel) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-syntax-unicode-sets-regex`](https://babel.dev/docs/en/next/babel-plugin-syntax-unicode-sets-regex) | 7.18.6 | `MIT` | development |
| [`@babel/plugin-transform-arrow-functions`](https://babel.dev/docs/en/next/babel-plugin-transform-arrow-functions) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-async-generator-functions`](https://babel.dev/docs/en/next/babel-plugin-transform-async-generator-functions) | 7.29.0 | `MIT` | development |
| [`@babel/plugin-transform-async-to-generator`](https://babel.dev/docs/en/next/babel-plugin-transform-async-to-generator) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-block-scoped-functions`](https://babel.dev/docs/en/next/babel-plugin-transform-block-scoped-functions) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-block-scoping`](https://babel.dev/docs/en/next/babel-plugin-transform-block-scoping) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-class-properties`](https://babel.dev/docs/en/next/babel-plugin-transform-class-properties) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-class-static-block`](https://babel.dev/docs/en/next/babel-plugin-transform-class-static-block) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-classes`](https://babel.dev/docs/en/next/babel-plugin-transform-classes) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-computed-properties`](https://babel.dev/docs/en/next/babel-plugin-transform-computed-properties) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-destructuring`](https://babel.dev/docs/en/next/babel-plugin-transform-destructuring) | 7.28.5 | `MIT` | development |
| [`@babel/plugin-transform-dotall-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-dotall-regex) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-duplicate-keys`](https://babel.dev/docs/en/next/babel-plugin-transform-duplicate-keys) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-duplicate-named-capturing-groups-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-duplicate-named-capturing-groups-regex) | 7.29.0 | `MIT` | development |
| [`@babel/plugin-transform-dynamic-import`](https://github.com/babel/babel) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-explicit-resource-management`](https://babel.dev/docs/en/next/babel-plugin-transform-explicit-resource-management) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-exponentiation-operator`](https://babel.dev/docs/en/next/babel-plugin-transform-exponentiation-operator) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-export-namespace-from`](https://babel.dev/docs/en/next/babel-plugin-transform-export-namespace-from) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-for-of`](https://babel.dev/docs/en/next/babel-plugin-transform-for-of) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-function-name`](https://babel.dev/docs/en/next/babel-plugin-transform-function-name) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-json-strings`](https://babel.dev/docs/en/next/babel-plugin-transform-json-strings) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-literals`](https://babel.dev/docs/en/next/babel-plugin-transform-literals) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-logical-assignment-operators`](https://babel.dev/docs/en/next/babel-plugin-transform-logical-assignment-operators) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-member-expression-literals`](https://babel.dev/docs/en/next/babel-plugin-transform-member-expression-literals) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-modules-amd`](https://babel.dev/docs/en/next/babel-plugin-transform-modules-amd) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-modules-commonjs`](https://babel.dev/docs/en/next/babel-plugin-transform-modules-commonjs) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-modules-systemjs`](https://babel.dev/docs/en/next/babel-plugin-transform-modules-systemjs) | 7.29.0 | `MIT` | development |
| [`@babel/plugin-transform-modules-umd`](https://babel.dev/docs/en/next/babel-plugin-transform-modules-umd) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-named-capturing-groups-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-named-capturing-groups-regex) | 7.29.0 | `MIT` | development |
| [`@babel/plugin-transform-new-target`](https://babel.dev/docs/en/next/babel-plugin-transform-new-target) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-nullish-coalescing-operator`](https://babel.dev/docs/en/next/babel-plugin-transform-nullish-coalescing-operator) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-numeric-separator`](https://babel.dev/docs/en/next/babel-plugin-transform-numeric-separator) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-object-rest-spread`](https://babel.dev/docs/en/next/babel-plugin-transform-object-rest-spread) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-object-super`](https://babel.dev/docs/en/next/babel-plugin-transform-object-super) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-optional-catch-binding`](https://babel.dev/docs/en/next/babel-plugin-transform-optional-catch-binding) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-optional-chaining`](https://babel.dev/docs/en/next/babel-plugin-transform-optional-chaining) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-parameters`](https://babel.dev/docs/en/next/babel-plugin-transform-parameters) | 7.27.7 | `MIT` | development |
| [`@babel/plugin-transform-private-methods`](https://babel.dev/docs/en/next/babel-plugin-transform-private-methods) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-private-property-in-object`](https://babel.dev/docs/en/next/babel-plugin-transform-private-property-in-object) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-property-literals`](https://babel.dev/docs/en/next/babel-plugin-transform-property-literals) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-regenerator`](https://babel.dev/docs/en/next/babel-plugin-transform-regenerator) | 7.29.0 | `MIT` | development |
| [`@babel/plugin-transform-regexp-modifiers`](https://babel.dev/docs/en/next/babel-plugin-transform-regexp-modifiers) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-reserved-words`](https://babel.dev/docs/en/next/babel-plugin-transform-reserved-words) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-shorthand-properties`](https://babel.dev/docs/en/next/babel-plugin-transform-shorthand-properties) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-spread`](https://babel.dev/docs/en/next/babel-plugin-transform-spread) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-sticky-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-sticky-regex) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-template-literals`](https://babel.dev/docs/en/next/babel-plugin-transform-template-literals) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-typeof-symbol`](https://babel.dev/docs/en/next/babel-plugin-transform-typeof-symbol) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-unicode-escapes`](https://babel.dev/docs/en/next/babel-plugin-transform-unicode-escapes) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-unicode-property-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-unicode-property-regex) | 7.28.6 | `MIT` | development |
| [`@babel/plugin-transform-unicode-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-unicode-regex) | 7.27.1 | `MIT` | development |
| [`@babel/plugin-transform-unicode-sets-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-unicode-sets-regex) | 7.28.6 | `MIT` | development |
| [`@babel/preset-env`](https://babel.dev/docs/en/next/babel-preset-env) | 7.29.3 | `MIT` | development |
| [`@babel/preset-modules`](https://github.com/babel/preset-modules) | 0.1.6-no-external-plugins | `MIT` | development |
| [`@babel/runtime`](https://babel.dev/docs/en/next/babel-runtime) | 7.29.2 | `MIT` | development |
| [`@babel/template`](https://babel.dev/docs/en/next/babel-template) | 7.28.6 | `MIT` | development |
| [`@babel/traverse`](https://babel.dev/docs/en/next/babel-traverse) | 7.29.0 | `MIT` | development |
| [`@babel/types`](https://babel.dev/docs/en/next/babel-types) | 7.29.0 | `MIT` | development |
| [`@csstools/color-helpers`](https://github.com/csstools/postcss-plugins/tree/main/packages/color-helpers#readme) | 5.1.0 | `MIT-0` | development |
| [`@csstools/css-calc`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-calc#readme) | 2.1.4 | `MIT` | development |
| [`@csstools/css-color-parser`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-color-parser#readme) | 3.1.0 | `MIT` | development |
| [`@csstools/css-parser-algorithms`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-parser-algorithms#readme) | 3.0.5 | `MIT` | development |
| [`@csstools/css-tokenizer`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-tokenizer#readme) | 3.0.4 | `MIT` | development |
| [`@docsearch/css`](https://docsearch.algolia.com) | 3.9.0 | `MIT` | development |
| [`@docsearch/js`](https://docsearch.algolia.com) | 3.9.0 | `MIT` | development |
| [`@docsearch/react`](https://docsearch.algolia.com) | 3.9.0 | `MIT` | development |
| [`@esbuild/darwin-arm64`](https://github.com/evanw/esbuild) | 0.21.5 | `MIT` | development |
| [`@eslint-community/eslint-utils`](https://github.com/eslint-community/eslint-utils#readme) | 4.9.1 | `MIT` | development |
| [`@eslint-community/regexpp`](https://github.com/eslint-community/regexpp#readme) | 4.12.2 | `MIT` | development |
| [`@iconify-json/simple-icons`](https://icon-sets.iconify.design/simple-icons/) | 1.2.80 | `CC0-1.0` | development |
| [`@iconify/types`](https://github.com/iconify/iconify) | 2.0.0 | `MIT` | development |
| `@inlang/detect-json-formatting` | 1.0.0 | `Apache-2.0` | development |
| [`@isaacs/cliui`](https://github.com:isaacs/cliui) | 9.0.0 | `BlueOak-1.0.0` | development |
| [`@jridgewell/gen-mapping`](https://github.com/jridgewell/sourcemaps/tree/main/packages/gen-mapping) | 0.3.13 | `MIT` | development |
| [`@jridgewell/remapping`](https://github.com/jridgewell/sourcemaps/tree/main/packages/remapping) | 2.3.5 | `MIT` | development |
| [`@jridgewell/sourcemap-codec`](https://github.com/jridgewell/sourcemaps/tree/main/packages/sourcemap-codec) | 1.5.5 | `MIT` | development |
| [`@jridgewell/trace-mapping`](https://github.com/jridgewell/sourcemaps/tree/main/packages/trace-mapping) | 0.3.31 | `MIT` | development |
| [`@rollup/plugin-node-resolve`](https://github.com/rollup/plugins/tree/master/packages/node-resolve/#readme) | 15.3.1 | `MIT` | development |
| [`@rollup/plugin-terser`](https://github.com/rollup/plugins/tree/master/packages/terser#readme) | 0.4.4 | `MIT` | development |
| [`@rollup/pluginutils`](https://github.com/rollup/plugins/tree/master/packages/pluginutils#readme) | 5.3.0 | `MIT` | development |
| [`@shikijs/core`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/engine-javascript`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/engine-oniguruma`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/langs`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/themes`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/transformers`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/types`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/vscode-textmate`](https://github.com/shikijs/vscode-textmate) | 10.0.2 | `MIT` | development |
| [`@surma/rollup-plugin-off-main-thread`](https://github.com/surma/rollup-plugin-off-main-thread) | 2.2.3 | `Apache-2.0` | development |
| [`@sveltejs/vite-plugin-svelte-inspector`](https://github.com/sveltejs/vite-plugin-svelte#readme) | 3.0.1 | `MIT` | development |
| [`@types/estree`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/estree) | 1.0.8 | `MIT` | development |
| [`@types/hast`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/hast) | 3.0.4 | `MIT` | development |
| [`@types/linkify-it`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/linkify-it) | 5.0.0 | `MIT` | development |
| [`@types/markdown-it`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/markdown-it) | 14.1.2 | `MIT` | development |
| [`@types/mdast`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/mdast) | 4.0.4 | `MIT` | development |
| [`@types/mdurl`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/mdurl) | 2.0.0 | `MIT` | development |
| [`@types/resolve`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/resolve) | 1.20.2 | `MIT` | development |
| [`@types/unist`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/unist) | 3.0.3 | `MIT` | development |
| [`@types/web-bluetooth`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/web-bluetooth) | 0.0.20 | `MIT` | development |
| [`@typescript-eslint/eslint-plugin`](https://typescript-eslint.io/packages/eslint-plugin) | 8.18.2 | `MIT` | development |
| [`@typescript-eslint/parser`](https://typescript-eslint.io/packages/parser) | 8.18.2 | `MIT` | development |
| [`@typescript-eslint/scope-manager`](https://typescript-eslint.io/packages/scope-manager) | 8.18.2 | `MIT` | development |
| [`@typescript-eslint/type-utils`](https://typescript-eslint.io) | 8.18.2 | `MIT` | development |
| [`@typescript-eslint/types`](https://typescript-eslint.io) | 8.18.2 | `MIT` | development |
| [`@typescript-eslint/typescript-estree`](https://typescript-eslint.io/packages/typescript-estree) | 8.18.2 | `MIT` | development |
| [`@typescript-eslint/utils`](https://typescript-eslint.io/packages/utils) | 8.18.2 | `MIT` | development |
| [`@typescript-eslint/visitor-keys`](https://typescript-eslint.io) | 8.18.2 | `MIT` | development |
| [`@ungap/structured-clone`](https://github.com/ungap/structured-clone#readme) | 1.3.0 | `ISC` | development |
| [`@vitejs/plugin-vue`](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue#readme) | 5.2.4 | `MIT` | development |
| [`@vitest/expect`](https://github.com/vitest-dev/vitest/tree/main/packages/expect#readme) | 2.1.8 | `MIT` | development |
| [`@vitest/mocker`](https://github.com/vitest-dev/vitest/tree/main/packages/mocker#readme) | 2.1.8 | `MIT` | development |
| [`@vitest/pretty-format`](https://github.com/vitest-dev/vitest/tree/main/packages/utils#readme) | 2.1.9 | `MIT` | development |
| [`@vitest/runner`](https://github.com/vitest-dev/vitest/tree/main/packages/runner#readme) | 2.1.8 | `MIT` | development |
| [`@vitest/snapshot`](https://github.com/vitest-dev/vitest/tree/main/packages/snapshot#readme) | 2.1.8 | `MIT` | development |
| [`@vitest/spy`](https://github.com/vitest-dev/vitest/tree/main/packages/spy#readme) | 2.1.8 | `MIT` | development |
| [`@vitest/utils`](https://github.com/vitest-dev/vitest/tree/main/packages/utils#readme) | 2.1.8 | `MIT` | development |
| [`@vue/devtools-api`](https://github.com/vuejs/devtools) | 7.7.9 | `MIT` | development |
| [`@vue/devtools-kit`](https://github.com/vuejs/devtools) | 7.7.9 | `MIT` | development |
| [`@vue/devtools-shared`](https://github.com/vuejs/devtools) | 7.7.9 | `MIT` | development |
| [`@vue/shared`](https://github.com/vuejs/core/tree/main/packages/shared#readme) | 3.5.33 | `MIT` | development |
| [`@vueuse/core`](https://github.com/vueuse/vueuse#readme) | 11.3.0 | `MIT` | development |
| [`@vueuse/integrations`](https://github.com/vueuse/vueuse/tree/main/packages/integrations#readme) | 11.3.0 | `MIT` | development |
| [`@vueuse/metadata`](https://github.com/vueuse/vueuse/tree/main/packages/metadata#readme) | 11.3.0 | `MIT` | development |
| [`@vueuse/shared`](https://github.com/vueuse/vueuse/tree/main/packages/shared#readme) | 11.3.0 | `MIT` | development |
| [`acorn`](https://github.com/acornjs/acorn) | 8.16.0 | `MIT` | development |
| [`acorn-jsx`](https://github.com/acornjs/acorn-jsx) | 5.3.2 | `MIT` | development |
| [`agent-base`](https://github.com/TooTallNate/proxy-agents) | 7.1.4 | `MIT` | development |
| [`algoliasearch`](https://github.com/algolia/algoliasearch-client-javascript/tree/main/packages/algoliasearch#readme) | 5.51.0 | `MIT` | development |
| [`argparse`](nodeca/argparse) | 2.0.1 | `Python-2.0` | development |
| [`array-buffer-byte-length`](https://github.com/inspect-js/array-buffer-byte-length#readme) | 1.0.2 | `MIT` | development |
| [`arraybuffer.prototype.slice`](https://github.com/es-shims/ArrayBuffer.prototype.slice#readme) | 1.0.4 | `MIT` | development |
| [`async`](https://caolan.github.io/async/) | 3.2.6 | `MIT` | development |
| [`async-function`](https://github.com/ljharb/async-function#readme) | 1.0.0 | `MIT` | development |
| [`at-least-node`](https://github.com/RyanZim/at-least-node#readme) | 1.0.0 | `ISC` | development |
| [`available-typed-arrays`](https://github.com/inspect-js/available-typed-arrays#readme) | 1.0.7 | `MIT` | development |
| [`axios`](https://axios-http.com) | 1.15.2 | `MIT` | development |
| [`babel-plugin-polyfill-corejs2`](https://github.com/babel/babel-polyfills) | 0.4.17 | `MIT` | development |
| [`babel-plugin-polyfill-corejs3`](https://github.com/babel/babel-polyfills) | 0.14.2 | `MIT` | development |
| [`babel-plugin-polyfill-regenerator`](https://github.com/babel/babel-polyfills) | 0.6.8 | `MIT` | development |
| [`balanced-match`](https://github.com/juliangruber/balanced-match) | 1.0.2 | `MIT` | development |
| [`base64-js`](https://github.com/beatgammit/base64-js) | 1.5.1 | `MIT` | development |
| [`baseline-browser-mapping`](https://github.com/web-platform-dx/baseline-browser-mapping) | 2.10.25 | `Apache-2.0` | development |
| [`birpc`](https://github.com/antfu-collective/birpc#readme) | 2.9.0 | `MIT` | development |
| [`bl`](https://github.com/rvagg/bl) | 4.1.0 | `MIT` | development |
| [`brace-expansion`](https://github.com/juliangruber/brace-expansion) | 1.1.14 | `MIT` | development |
| [`browserslist`](browserslist/browserslist) | 4.28.2 | `MIT` | development |
| [`buffer`](https://github.com/feross/buffer) | 5.7.1 | `MIT` | development |
| [`cac`](egoist/cac) | 6.7.14 | `MIT` | development |
| [`call-bind`](https://github.com/ljharb/call-bind#readme) | 1.0.9 | `MIT` | development |
| [`call-bind-apply-helpers`](https://github.com/ljharb/call-bind-apply-helpers#readme) | 1.0.2 | `MIT` | development |
| [`call-bound`](https://github.com/ljharb/call-bound#readme) | 1.0.4 | `MIT` | development |
| [`caniuse-lite`](browserslist/caniuse-lite) | 1.0.30001791 | `CC-BY-4.0` | development |
| [`ccount`](wooorm/ccount) | 2.0.1 | `MIT` | development |
| [`chai`](http://chaijs.com) | 5.3.3 | `MIT` | development |
| [`character-entities-html4`](wooorm/character-entities-html4) | 2.1.0 | `MIT` | development |
| [`character-entities-legacy`](wooorm/character-entities-legacy) | 3.0.0 | `MIT` | development |
| [`chokidar`](https://github.com/paulmillr/chokidar) | 4.0.3 | `MIT` | development |
| [`chownr`](https://github.com/isaacs/chownr) | 1.1.4 | `ISC` | development |
| [`comma-separated-tokens`](wooorm/comma-separated-tokens) | 2.0.3 | `MIT` | development |
| [`common-tags`](https://github.com/zspecza/common-tags) | 1.8.2 | `MIT` | development |
| [`consola`](unjs/consola) | 3.2.3 | `MIT` | development |
| [`convert-source-map`](https://github.com/thlorenz/convert-source-map) | 2.0.0 | `MIT` | development |
| [`copy-anything`](https://github.com/mesqueeb/copy-anything#readme) | 4.0.5 | `MIT` | development |
| [`core-js-compat`](https://core-js.io) | 3.49.0 | `MIT` | development |
| [`cross-spawn`](https://github.com/moxystudio/node-cross-spawn) | 7.0.6 | `MIT` | development |
| [`crypto-random-string`](sindresorhus/crypto-random-string) | 2.0.0 | `MIT` | development |
| [`cssesc`](https://mths.be/cssesc) | 3.0.0 | `MIT` | development |
| [`cssstyle`](https://github.com/jsdom/cssstyle) | 4.6.0 | `MIT` | development |
| [`data-urls`](jsdom/data-urls) | 5.0.0 | `MIT` | development |
| [`data-view-buffer`](https://github.com/inspect-js/data-view-buffer#readme) | 1.0.2 | `MIT` | development |
| [`data-view-byte-length`](https://github.com/inspect-js/data-view-byte-length#readme) | 1.0.2 | `MIT` | development |
| [`data-view-byte-offset`](https://github.com/inspect-js/data-view-byte-offset#readme) | 1.0.1 | `MIT` | development |
| [`debug`](https://github.com/debug-js/debug) | 4.4.3 | `MIT` | development |
| [`decimal.js`](https://github.com/MikeMcl/decimal.js) | 10.6.0 | `MIT` | development |
| [`decompress-response`](sindresorhus/decompress-response) | 6.0.0 | `MIT` | development |
| [`dedent`](https://github.com/dmnd/dedent) | 1.5.1 | `MIT` | development |
| [`deep-extend`](https://github.com/unclechu/node-deep-extend) | 0.6.0 | `MIT` | development |
| [`deepmerge`](https://github.com/TehShrike/deepmerge) | 4.3.1 | `MIT` | development |
| [`define-data-property`](https://github.com/ljharb/define-data-property#readme) | 1.1.4 | `MIT` | development |
| [`define-properties`](https://github.com/ljharb/define-properties) | 1.2.1 | `MIT` | development |
| [`dequal`](lukeed/dequal) | 2.0.3 | `MIT` | development |
| [`detect-libc`](https://github.com/lovell/detect-libc) | 2.1.2 | `Apache-2.0` | development |
| [`devlop`](wooorm/devlop) | 1.1.0 | `MIT` | development |
| [`dunder-proto`](https://github.com/es-shims/dunder-proto#readme) | 1.0.1 | `MIT` | development |
| [`ejs`](https://github.com/mde/ejs) | 3.1.10 | `Apache-2.0` | development |
| [`electron-to-chromium`](https://github.com/Kilian/electron-to-chromium) | 1.5.349 | `ISC` | development |
| [`emoji-regex-xs`](https://github.com/slevithan/emoji-regex-xs) | 1.0.0 | `MIT` | development |
| [`end-of-stream`](https://github.com/mafintosh/end-of-stream) | 1.4.5 | `MIT` | development |
| [`entities`](https://github.com/fb55/entities) | 7.0.1 | `BSD-2-Clause` | development |
| [`es-abstract`](https://github.com/ljharb/es-abstract) | 1.24.2 | `MIT` | development |
| [`es-define-property`](https://github.com/ljharb/es-define-property#readme) | 1.0.1 | `MIT` | development |
| [`es-errors`](https://github.com/ljharb/es-errors#readme) | 1.3.0 | `MIT` | development |
| [`es-module-lexer`](https://github.com/guybedford/es-module-lexer#readme) | 1.7.0 | `MIT` | development |
| [`es-object-atoms`](https://github.com/ljharb/es-object-atoms#readme) | 1.1.1 | `MIT` | development |
| [`es-set-tostringtag`](https://github.com/es-shims/es-set-tostringtag#readme) | 2.1.0 | `MIT` | development |
| [`es-to-primitive`](https://github.com/ljharb/es-to-primitive) | 1.3.0 | `MIT` | development |
| [`esbuild`](https://github.com/evanw/esbuild) | 0.21.5 | `MIT` | development |
| [`escalade`](lukeed/escalade) | 3.2.0 | `MIT` | development |
| [`eslint-compat-utils`](https://github.com/ota-meshi/eslint-compat-utils#readme) | 0.5.1 | `MIT` | development |
| [`eslint-scope`](https://github.com/eslint/js/blob/main/packages/eslint-scope/README.md) | 8.4.0 | `BSD-2-Clause` | development |
| [`eslint-visitor-keys`](https://github.com/eslint/js/blob/main/packages/eslint-visitor-keys/README.md) | 4.2.1 | `Apache-2.0` | development |
| [`espree`](https://github.com/eslint/js/blob/main/packages/espree/README.md) | 10.4.0 | `BSD-2-Clause` | development |
| [`esprima`](http://esprima.org) | 4.0.1 | `BSD-2-Clause` | development |
| [`esrecurse`](https://github.com/estools/esrecurse) | 4.3.0 | `BSD-2-Clause` | development |
| [`estraverse`](https://github.com/estools/estraverse) | 5.3.0 | `BSD-2-Clause` | development |
| [`estree-walker`](https://github.com/Rich-Harris/estree-walker) | 3.0.3 | `MIT` | development |
| [`esutils`](https://github.com/estools/esutils) | 2.0.3 | `BSD-2-Clause` | development |
| [`expand-template`](https://github.com/ralphtheninja/expand-template) | 2.0.3 | `MIT` | development |
| [`expect-type`](https://github.com/mmkal/expect-type#readme) | 1.3.0 | `Apache-2.0` | development |
| [`extend-shallow`](https://github.com/jonschlinkert/extend-shallow) | 2.0.1 | `MIT` | development |
| [`fast-json-stable-stringify`](https://github.com/epoberezkin/fast-json-stable-stringify) | 2.1.0 | `MIT` | development |
| [`fdir`](https://github.com/thecodrr/fdir#readme) | 6.5.0 | `MIT` | development |
| [`filelist`](https://github.com/mde/filelist) | 1.0.6 | `Apache-2.0` | development |
| [`focus-trap`](https://github.com/focus-trap/focus-trap#readme) | 7.8.0 | `MIT` | development |
| [`follow-redirects`](https://github.com/follow-redirects/follow-redirects) | 1.16.0 | `MIT` | development |
| [`for-each`](https://github.com/Raynos/for-each) | 0.3.5 | `MIT` | development |
| [`foreground-child`](https://github.com/tapjs/foreground-child) | 3.3.1 | `ISC` | development |
| [`form-data`](https://github.com/form-data/form-data) | 4.0.5 | `MIT` | development |
| [`fs-constants`](https://github.com/mafintosh/fs-constants) | 1.0.0 | `MIT` | development |
| [`fs-extra`](https://github.com/jprichardson/node-fs-extra) | 9.1.0 | `MIT` | development |
| [`fsevents`](https://github.com/fsevents/fsevents) | 2.3.3 | `MIT` | development |
| [`function-bind`](https://github.com/Raynos/function-bind) | 1.1.2 | `MIT` | development |
| [`function.prototype.name`](https://github.com/es-shims/Function.prototype.name) | 1.1.8 | `MIT` | development |
| [`functions-have-names`](https://github.com/inspect-js/functions-have-names#readme) | 1.2.3 | `MIT` | development |
| [`generator-function`](https://github.com/TimothyGu/generator-function#readme) | 2.0.1 | `MIT` | development |
| [`gensync`](https://github.com/loganfsmyth/gensync) | 1.0.0-beta.2 | `MIT` | development |
| [`get-intrinsic`](https://github.com/ljharb/get-intrinsic#readme) | 1.3.0 | `MIT` | development |
| [`get-own-enumerable-property-symbols`](https://github.com/mightyiam/get-own-enumerable-property-symbols#readme) | 3.0.2 | `ISC` | development |
| [`get-proto`](https://github.com/ljharb/get-proto#readme) | 1.0.1 | `MIT` | development |
| [`get-symbol-description`](https://github.com/inspect-js/get-symbol-description#readme) | 1.1.0 | `MIT` | development |
| [`get-tsconfig`](privatenumber/get-tsconfig) | 4.14.0 | `MIT` | development |
| [`github-from-package`](https://github.com/substack/github-from-package) | 0.0.0 | `MIT` | development |
| [`glob`](git@github.com:isaacs/node-glob) | 11.1.0 | `BlueOak-1.0.0` | development |
| [`globalthis`](https://github.com/ljharb/System.global) | 1.0.4 | `MIT` | development |
| [`gopd`](https://github.com/ljharb/gopd#readme) | 1.2.0 | `MIT` | development |
| [`graceful-fs`](https://github.com/isaacs/node-graceful-fs) | 4.2.11 | `ISC` | development |
| [`graphemer`](https://github.com/flmnt/graphemer) | 1.4.0 | `MIT` | development |
| [`gray-matter`](https://github.com/jonschlinkert/gray-matter) | 4.0.3 | `MIT` | development |
| [`guess-json-indent`](https://www.github.com/ehmicky/guess-json-indent) | 2.0.0 | `MIT` | development |
| [`has-bigints`](https://github.com/ljharb/has-bigints#readme) | 1.1.0 | `MIT` | development |
| [`has-property-descriptors`](https://github.com/inspect-js/has-property-descriptors#readme) | 1.0.2 | `MIT` | development |
| [`has-proto`](https://github.com/inspect-js/has-proto#readme) | 1.2.0 | `MIT` | development |
| [`has-symbols`](https://github.com/ljharb/has-symbols#readme) | 1.1.0 | `MIT` | development |
| [`has-tostringtag`](https://github.com/inspect-js/has-tostringtag#readme) | 1.0.2 | `MIT` | development |
| [`hasown`](https://github.com/inspect-js/hasOwn#readme) | 2.0.3 | `MIT` | development |
| [`hast-util-to-html`](syntax-tree/hast-util-to-html) | 9.0.5 | `MIT` | development |
| [`hast-util-whitespace`](syntax-tree/hast-util-whitespace) | 3.0.0 | `MIT` | development |
| [`hookable`](unjs/hookable) | 5.5.3 | `MIT` | development |
| [`html-encoding-sniffer`](jsdom/html-encoding-sniffer) | 4.0.0 | `MIT` | development |
| [`html-void-elements`](wooorm/html-void-elements) | 3.0.0 | `MIT` | development |
| [`http-proxy-agent`](https://github.com/TooTallNate/proxy-agents) | 7.0.2 | `MIT` | development |
| [`https-proxy-agent`](https://github.com/TooTallNate/proxy-agents) | 7.0.6 | `MIT` | development |
| [`idb`](https://github.com/jakearchibald/idb) | 7.1.1 | `ISC` | development |
| [`ieee754`](https://github.com/feross/ieee754) | 1.2.1 | `BSD-3-Clause` | development |
| [`ignore`](git@github.com:kaelzhang/node-ignore) | 5.3.2 | `MIT` | development |
| [`inherits`](https://github.com/isaacs/inherits) | 2.0.4 | `ISC` | development |
| [`ini`](https://github.com/isaacs/ini) | 1.3.8 | `ISC` | development |
| [`internal-slot`](https://github.com/ljharb/internal-slot#readme) | 1.1.0 | `MIT` | development |
| [`is-array-buffer`](https://github.com/inspect-js/is-array-buffer#readme) | 3.0.5 | `MIT` | development |
| [`is-async-function`](https://github.com/inspect-js/is-async-function) | 2.1.1 | `MIT` | development |
| [`is-callable`](https://github.com/inspect-js/is-callable) | 1.2.7 | `MIT` | development |
| [`is-data-view`](https://github.com/inspect-js/is-data-view#readme) | 1.0.2 | `MIT` | development |
| [`is-date-object`](https://github.com/inspect-js/is-date-object) | 1.1.0 | `MIT` | development |
| [`is-extendable`](https://github.com/jonschlinkert/is-extendable) | 0.1.1 | `MIT` | development |
| [`is-finalizationregistry`](https://github.com/inspect-js/is-finalizationregistry#readme) | 1.1.1 | `MIT` | development |
| [`is-generator-function`](https://github.com/inspect-js/is-generator-function) | 1.1.2 | `MIT` | development |
| [`is-map`](https://github.com/inspect-js/is-map#readme) | 2.0.3 | `MIT` | development |
| [`is-module`](component/is-module) | 1.0.0 | `MIT` | development |
| [`is-negative-zero`](https://github.com/inspect-js/is-negative-zero) | 2.0.3 | `MIT` | development |
| [`is-obj`](sindresorhus/is-obj) | 1.0.1 | `MIT` | development |
| [`is-potential-custom-element-name`](https://github.com/mathiasbynens/is-potential-custom-element-name) | 1.0.1 | `MIT` | development |
| [`is-regex`](https://github.com/inspect-js/is-regex) | 1.2.1 | `MIT` | development |
| [`is-regexp`](sindresorhus/is-regexp) | 1.0.0 | `MIT` | development |
| [`is-set`](https://github.com/inspect-js/is-set#readme) | 2.0.3 | `MIT` | development |
| [`is-shared-array-buffer`](https://github.com/inspect-js/is-shared-array-buffer#readme) | 1.0.4 | `MIT` | development |
| [`is-stream`](sindresorhus/is-stream) | 2.0.1 | `MIT` | development |
| [`is-string`](https://github.com/inspect-js/is-string) | 1.1.1 | `MIT` | development |
| [`is-symbol`](https://github.com/inspect-js/is-symbol) | 1.1.1 | `MIT` | development |
| [`is-typed-array`](https://github.com/inspect-js/is-typed-array) | 1.1.15 | `MIT` | development |
| [`is-weakmap`](https://github.com/inspect-js/is-weakmap#readme) | 2.0.2 | `MIT` | development |
| [`is-weakref`](https://github.com/inspect-js/is-weakref#readme) | 1.1.1 | `MIT` | development |
| [`is-weakset`](https://github.com/inspect-js/is-weakset#readme) | 2.0.4 | `MIT` | development |
| [`is-what`](https://github.com/mesqueeb/is-what#readme) | 5.5.0 | `MIT` | development |
| [`isarray`](https://github.com/juliangruber/isarray) | 2.0.5 | `MIT` | development |
| [`jackspeak`](https://github.com/isaacs/jackspeak) | 4.2.3 | `BlueOak-1.0.0` | development |
| [`jake`](https://github.com/jakejs/jake) | 10.9.4 | `Apache-2.0` | development |
| [`js-tokens`](lydell/js-tokens) | 4.0.0 | `MIT` | development |
| [`js-yaml`](nodeca/js-yaml) | 4.1.1 | `MIT` | development |
| [`jsesc`](https://mths.be/jsesc) | 3.1.0 | `MIT` | development |
| [`json5`](http://json5.org/) | 2.2.3 | `MIT` | development |
| [`jsonfile`](git@github.com:jprichardson/node-jsonfile) | 6.2.1 | `MIT` | development |
| [`jsonpointer`](https://github.com/janl/node-jsonpointer) | 5.0.1 | `MIT` | development |
| [`kind-of`](https://github.com/jonschlinkert/kind-of) | 6.0.3 | `MIT` | development |
| [`kleur`](lukeed/kleur) | 4.1.5 | `MIT` | development |
| [`known-css-properties`](https://github.com/known-css/known-css-properties#readme) | 0.35.0 | `MIT` | development |
| [`kolorist`](https://github.com/marvinhagemeister/kolorist) | 1.8.0 | `MIT` | development |
| [`leven`](sindresorhus/leven) | 3.1.0 | `MIT` | development |
| [`lilconfig`](https://github.com/antonk52/lilconfig) | 2.1.0 | `MIT` | development |
| [`lodash`](https://lodash.com/) | 4.18.1 | `MIT` | development |
| [`lodash.debounce`](https://lodash.com/) | 4.0.8 | `MIT` | development |
| [`lodash.sortby`](https://lodash.com/) | 4.7.0 | `MIT` | development |
| [`lru-cache`](https://github.com/isaacs/node-lru-cache) | 10.4.3 | `ISC` | development |
| [`magic-string`](https://github.com/Rich-Harris/magic-string) | 0.30.21 | `MIT` | development |
| [`mark.js`](https://markjs.io/) | 8.11.1 | `MIT` | development |
| [`math-intrinsics`](https://github.com/es-shims/math-intrinsics#readme) | 1.1.0 | `MIT` | development |
| [`mdast-util-to-hast`](syntax-tree/mdast-util-to-hast) | 13.2.1 | `MIT` | development |
| [`micromark-util-character`](https://github.com/micromark/micromark/tree/main/packages/micromark-util-character) | 2.1.1 | `MIT` | development |
| [`micromark-util-encode`](https://github.com/micromark/micromark/tree/main/packages/micromark-util-encode) | 2.0.1 | `MIT` | development |
| [`micromark-util-sanitize-uri`](https://github.com/micromark/micromark/tree/main/packages/micromark-util-sanitize-uri) | 2.0.1 | `MIT` | development |
| [`micromark-util-symbol`](https://github.com/micromark/micromark/tree/main/packages/micromark-util-symbol) | 2.0.1 | `MIT` | development |
| [`micromark-util-types`](https://github.com/micromark/micromark/tree/main/packages/micromark-util-types) | 2.0.2 | `MIT` | development |
| [`mimic-response`](sindresorhus/mimic-response) | 3.1.0 | `MIT` | development |
| [`minimatch`](https://github.com/isaacs/minimatch) | 3.1.5 | `ISC` | development |
| [`minimist`](https://github.com/minimistjs/minimist) | 1.2.8 | `MIT` | development |
| [`minipass`](https://github.com/isaacs/minipass) | 7.1.3 | `BlueOak-1.0.0` | development |
| [`minisearch`](https://lucaong.github.io/minisearch/) | 7.2.0 | `MIT` | development |
| [`mitt`](https://github.com/developit/mitt) | 3.0.1 | `MIT` | development |
| [`mkdirp-classic`](https://github.com/mafintosh/mkdirp-classic) | 0.5.3 | `MIT` | development |
| [`napi-build-utils`](https://github.com/inspiredware/napi-build-utils#readme) | 2.0.0 | `MIT` | development |
| [`natural-compare`](https://github.com/litejs/natural-compare-lite) | 1.4.0 | `MIT` | development |
| [`node-abi`](https://github.com/electron/node-abi#readme) | 3.90.0 | `MIT` | development |
| [`node-addon-api`](https://github.com/nodejs/node-addon-api) | 7.1.1 | `MIT` | development |
| [`node-releases`](https://github.com/chicoxyzzy/node-releases) | 2.0.38 | `MIT` | development |
| [`nwsapi`](https://javascript.nwbox.com/nwsapi/) | 2.2.23 | `MIT` | development |
| [`object-inspect`](https://github.com/inspect-js/object-inspect) | 1.13.4 | `MIT` | development |
| [`object-keys`](https://github.com/ljharb/object-keys) | 1.1.1 | `MIT` | development |
| [`object.assign`](https://github.com/ljharb/object.assign) | 4.1.7 | `MIT` | development |
| [`once`](https://github.com/isaacs/once) | 1.4.0 | `ISC` | development |
| [`oniguruma-to-es`](https://github.com/slevithan/oniguruma-to-es) | 2.3.0 | `MIT` | development |
| [`own-keys`](https://github.com/ljharb/own-keys#readme) | 1.0.1 | `MIT` | development |
| [`package-json-from-dist`](https://github.com/isaacs/package-json-from-dist) | 1.0.1 | `BlueOak-1.0.0` | development |
| [`parse5`](https://parse5.js.org) | 7.3.0 | `MIT` | development |
| [`path-scurry`](https://github.com/isaacs/path-scurry) | 2.0.2 | `BlueOak-1.0.0` | development |
| [`pathe`](unjs/pathe) | 1.1.2 | `MIT` | development |
| [`perfect-debounce`](unjs/perfect-debounce) | 1.0.0 | `MIT` | development |
| [`picocolors`](alexeyraspopov/picocolors) | 1.1.1 | `ISC` | development |
| [`picomatch`](https://github.com/micromatch/picomatch) | 4.0.4 | `MIT` | development |
| [`playwright`](https://playwright.dev) | 1.59.1 | `Apache-2.0` | development |
| [`playwright-core`](https://playwright.dev) | 1.59.1 | `Apache-2.0` | development |
| [`possible-typed-array-names`](https://github.com/ljharb/possible-typed-array-names#readme) | 1.1.0 | `MIT` | development |
| [`postcss`](https://postcss.org/) | 8.5.12 | `MIT` | development |
| [`postcss-load-config`](postcss/postcss-load-config) | 3.1.4 | `MIT` | development |
| [`postcss-safe-parser`](postcss/postcss-safe-parser) | 6.0.0 | `MIT` | development |
| [`postcss-scss`](postcss/postcss-scss) | 4.0.9 | `MIT` | development |
| [`postcss-selector-parser`](https://github.com/postcss/postcss-selector-parser) | 6.1.2 | `MIT` | development |
| [`posthog-node`](PostHog/posthog-node) | 3.1.3 | `MIT` | development |
| [`preact`](https://preactjs.com) | 10.29.1 | `MIT` | development |
| [`prebuild-install`](https://github.com/prebuild/prebuild-install) | 7.1.3 | `MIT` | development |
| [`pretty-bytes`](sindresorhus/pretty-bytes) | 6.1.1 | `MIT` | development |
| [`property-information`](wooorm/property-information) | 7.1.0 | `MIT` | development |
| [`proxy-from-env`](https://github.com/Rob--W/proxy-from-env#readme) | 2.1.0 | `MIT` | development |
| [`pump`](https://github.com/mafintosh/pump) | 3.0.4 | `MIT` | development |
| [`punycode`](https://mths.be/punycode) | 2.3.1 | `MIT` | development |
| [`randombytes`](https://github.com/crypto-browserify/randombytes) | 2.1.0 | `MIT` | development |
| [`rc`](https://github.com/dominictarr/rc) | 1.2.8 | `BSD-2-Clause` | development |
| [`readable-stream`](https://github.com/nodejs/readable-stream) | 3.6.2 | `MIT` | development |
| [`readdirp`](https://github.com/paulmillr/readdirp) | 4.1.2 | `MIT` | development |
| [`reflect.getprototypeof`](https://github.com/es-shims/Reflect.getPrototypeOf) | 1.0.10 | `MIT` | development |
| [`regenerate`](https://mths.be/regenerate) | 1.4.2 | `MIT` | development |
| [`regenerate-unicode-properties`](https://github.com/mathiasbynens/regenerate-unicode-properties) | 10.2.2 | `MIT` | development |
| [`regex`](https://github.com/slevithan/regex) | 5.1.1 | `MIT` | development |
| [`regex-recursion`](https://github.com/slevithan/regex-recursion) | 5.1.1 | `MIT` | development |
| [`regex-utilities`](https://github.com/slevithan/regex-utilities) | 2.3.0 | `MIT` | development |
| [`regexp.prototype.flags`](https://github.com/es-shims/RegExp.prototype.flags) | 1.5.4 | `MIT` | development |
| [`regexpu-core`](https://mths.be/regexpu) | 6.4.0 | `MIT` | development |
| [`regjsgen`](https://github.com/bnjmnt4n/regjsgen) | 0.8.0 | `MIT` | development |
| [`regjsparser`](https://github.com/jviereck/regjsparser) | 0.13.1 | `BSD-2-Clause` | development |
| [`resolve`](ssh://github.com/browserify/resolve) | 1.22.12 | `MIT` | development |
| [`resolve-pkg-maps`](privatenumber/resolve-pkg-maps) | 1.0.0 | `MIT` | development |
| [`rfdc`](https://github.com/davidmarkclements/rfdc#readme) | 1.4.1 | `MIT` | development |
| [`rollup`](https://rollupjs.org/) | 4.60.2 | `MIT` | development |
| [`rrweb-cssom`](rrweb-io/CSSOM) | 0.8.0 | `MIT` | development |
| [`rusha`](https://github.com/srijs/rusha) | 0.8.14 | `MIT` | development |
| [`sade`](lukeed/sade) | 1.8.1 | `MIT` | development |
| [`safe-array-concat`](https://github.com/ljharb/safe-array-concat#readme) | 1.1.4 | `MIT` | development |
| [`safe-buffer`](https://github.com/feross/safe-buffer) | 5.2.1 | `MIT` | development |
| [`safe-push-apply`](https://github.com/ljharb/safe-push-apply#readme) | 1.0.0 | `MIT` | development |
| [`safe-regex-test`](https://github.com/ljharb/safe-regex-test#readme) | 1.1.0 | `MIT` | development |
| [`saxes`](https://github.com/lddubeau/saxes) | 6.0.0 | `ISC` | development |
| [`search-insights`](https://github.com/algolia/search-insights.js) | 2.17.3 | `MIT` | development |
| [`section-matter`](https://github.com/jonschlinkert/section-matter) | 1.0.0 | `MIT` | development |
| [`semver`](https://github.com/npm/node-semver) | 7.7.4 | `ISC` | development |
| [`serialize-javascript`](https://github.com/yahoo/serialize-javascript) | 6.0.2 | `BSD-3-Clause` | development |
| [`set-function-length`](https://github.com/ljharb/set-function-length#readme) | 1.2.2 | `MIT` | development |
| [`set-function-name`](https://github.com/ljharb/set-function-name#readme) | 2.0.2 | `MIT` | development |
| [`set-proto`](https://github.com/ljharb/set-proto#readme) | 1.0.0 | `MIT` | development |
| [`shiki`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`side-channel`](https://github.com/ljharb/side-channel#readme) | 1.1.0 | `MIT` | development |
| [`side-channel-list`](https://github.com/ljharb/side-channel-list#readme) | 1.0.1 | `MIT` | development |
| [`side-channel-map`](https://github.com/ljharb/side-channel-map#readme) | 1.0.1 | `MIT` | development |
| [`side-channel-weakmap`](https://github.com/ljharb/side-channel-weakmap#readme) | 1.0.2 | `MIT` | development |
| [`siginfo`](https://github.com/emilbayes/siginfo#readme) | 2.0.0 | `ISC` | development |
| [`signal-exit`](https://github.com/tapjs/signal-exit) | 4.1.0 | `ISC` | development |
| [`simple-concat`](https://github.com/feross/simple-concat) | 1.0.1 | `MIT` | development |
| [`simple-get`](https://github.com/feross/simple-get) | 4.0.1 | `MIT` | development |
| [`smob`](https://github.com/Tada5hi/smob#readme) | 1.6.1 | `MIT` | development |
| [`source-map`](https://github.com/mozilla/source-map) | 0.8.0-beta.0 | `BSD-3-Clause` | development |
| [`sourcemap-codec`](https://github.com/Rich-Harris/sourcemap-codec) | 1.4.8 | `MIT` | development |
| [`space-separated-tokens`](wooorm/space-separated-tokens) | 2.0.2 | `MIT` | development |
| [`speakingurl`](http://pid.github.io/speakingurl/) | 14.0.1 | `BSD-3-Clause` | development |
| [`sprintf-js`](https://github.com/alexei/sprintf.js) | 1.0.3 | `BSD-3-Clause` | development |
| [`stackback`](https://github.com/shtylman/node-stackback) | 0.0.2 | `MIT` | development |
| [`std-env`](unjs/std-env) | 3.10.0 | `MIT` | development |
| [`stop-iteration-iterator`](https://github.com/ljharb/stop-iteration-iterator#readme) | 1.1.0 | `MIT` | development |
| [`string.prototype.matchall`](https://github.com/es-shims/String.prototype.matchAll#readme) | 4.0.12 | `MIT` | development |
| [`string.prototype.trim`](https://github.com/es-shims/String.prototype.trim) | 1.2.10 | `MIT` | development |
| [`string.prototype.trimend`](https://github.com/es-shims/String.prototype.trimEnd) | 1.0.9 | `MIT` | development |
| [`string.prototype.trimstart`](https://github.com/es-shims/String.prototype.trimStart) | 1.0.8 | `MIT` | development |
| [`stringify-entities`](wooorm/stringify-entities) | 4.0.4 | `MIT` | development |
| [`stringify-object`](yeoman/stringify-object) | 3.3.0 | `BSD-2-Clause` | development |
| [`strip-bom-string`](https://github.com/jonschlinkert/strip-bom-string) | 1.0.0 | `MIT` | development |
| [`strip-comments`](https://github.com/jonschlinkert/strip-comments) | 2.0.1 | `MIT` | development |
| [`strip-json-comments`](sindresorhus/strip-json-comments) | 3.1.1 | `MIT` | development |
| [`superjson`](https://github.com/blitz-js/superjson) | 2.2.6 | `MIT` | development |
| [`svelte-eslint-parser`](https://github.com/sveltejs/svelte-eslint-parser#readme) | 0.43.0 | `MIT` | development |
| [`symbol-tree`](https://github.com/jsdom/js-symbol-tree#symbol-tree) | 3.2.4 | `MIT` | development |
| [`tar-fs`](https://github.com/mafintosh/tar-fs) | 2.1.4 | `MIT` | development |
| [`tar-stream`](https://github.com/mafintosh/tar-stream) | 2.2.0 | `MIT` | development |
| [`temp-dir`](sindresorhus/temp-dir) | 2.0.0 | `MIT` | development |
| [`tempy`](sindresorhus/tempy) | 0.6.0 | `MIT` | development |
| [`terser`](https://terser.org) | 5.46.2 | `BSD-2-Clause` | development |
| [`tinybench`](tinylibs/tinybench) | 2.9.0 | `MIT` | development |
| [`tinyexec`](https://github.com/tinylibs/tinyexec#readme) | 0.3.2 | `MIT` | development |
| [`tinyglobby`](https://superchupu.dev/tinyglobby) | 0.2.16 | `MIT` | development |
| [`tinypool`](https://github.com/tinylibs/tinypool#readme) | 1.1.1 | `MIT` | development |
| [`tinyrainbow`](https://github.com/tinylibs/tinyrainbow#readme) | 1.2.0 | `MIT` | development |
| [`tldts`](https://github.com/remusao/tldts#readme) | 6.1.86 | `MIT` | development |
| [`tldts-core`](https://github.com/remusao/tldts#readme) | 6.1.86 | `MIT` | development |
| [`tough-cookie`](https://github.com/salesforce/tough-cookie) | 5.1.2 | `BSD-3-Clause` | development |
| [`tr46`](https://github.com/jsdom/tr46) | 5.1.1 | `MIT` | development |
| [`trim-lines`](wooorm/trim-lines) | 3.0.1 | `MIT` | development |
| [`ts-api-utils`](https://github.com/JoshuaKGoldberg/ts-api-utils) | 1.4.3 | `MIT` | development |
| [`tunnel-agent`](https://github.com/mikeal/tunnel-agent) | 0.6.0 | `Apache-2.0` | development |
| [`type-fest`](sindresorhus/type-fest) | 0.16.0 | `MIT` | development |
| [`typed-array-buffer`](https://github.com/inspect-js/typed-array-buffer#readme) | 1.0.3 | `MIT` | development |
| [`typed-array-byte-length`](https://github.com/inspect-js/typed-array-byte-length#readme) | 1.0.3 | `MIT` | development |
| [`typed-array-byte-offset`](https://github.com/inspect-js/typed-array-byte-offset#readme) | 1.0.4 | `MIT` | development |
| [`typed-array-length`](https://github.com/inspect-js/typed-array-length#readme) | 1.0.7 | `MIT` | development |
| [`unbox-primitive`](https://github.com/ljharb/unbox-primitive#readme) | 1.1.0 | `MIT` | development |
| [`undici-types`](https://undici.nodejs.org) | 6.20.0 | `MIT` | development |
| [`unicode-canonical-property-names-ecmascript`](https://github.com/mathiasbynens/unicode-canonical-property-names-ecmascript) | 2.0.1 | `MIT` | development |
| [`unicode-match-property-ecmascript`](https://github.com/mathiasbynens/unicode-match-property-ecmascript) | 2.0.0 | `MIT` | development |
| [`unicode-match-property-value-ecmascript`](https://github.com/mathiasbynens/unicode-match-property-value-ecmascript) | 2.2.1 | `MIT` | development |
| [`unicode-property-aliases-ecmascript`](https://github.com/mathiasbynens/unicode-property-aliases-ecmascript) | 2.2.0 | `MIT` | development |
| [`unique-string`](sindresorhus/unique-string) | 2.0.0 | `MIT` | development |
| [`unist-util-is`](syntax-tree/unist-util-is) | 6.0.1 | `MIT` | development |
| [`unist-util-position`](syntax-tree/unist-util-position) | 5.0.0 | `MIT` | development |
| [`unist-util-stringify-position`](syntax-tree/unist-util-stringify-position) | 4.0.0 | `MIT` | development |
| [`unist-util-visit`](syntax-tree/unist-util-visit) | 5.1.0 | `MIT` | development |
| [`unist-util-visit-parents`](syntax-tree/unist-util-visit-parents) | 6.0.2 | `MIT` | development |
| [`universalify`](https://github.com/RyanZim/universalify#readme) | 2.0.1 | `MIT` | development |
| [`upath`](http://github.com/anodynos/upath/) | 1.2.0 | `MIT` | development |
| [`update-browserslist-db`](browserslist/update-db) | 1.2.3 | `MIT` | development |
| [`util-deprecate`](https://github.com/TooTallNate/util-deprecate) | 1.0.2 | `MIT` | development |
| [`vfile`](vfile/vfile) | 6.0.3 | `MIT` | development |
| [`vfile-message`](vfile/vfile-message) | 4.0.3 | `MIT` | development |
| [`vite-node`](https://github.com/vitest-dev/vitest/blob/main/packages/vite-node#readme) | 2.1.8 | `MIT` | development |
| [`vite-plugin-pwa`](https://github.com/vite-pwa/vite-plugin-pwa#readme) | 1.2.0 | `MIT` | development |
| [`vitefu`](https://github.com/svitejs/vitefu) | 1.1.3 | `MIT` | development |
| [`vue`](https://vuejs.org/) | 3.5.33 | `MIT` | development |
| [`w3c-xmlserializer`](jsdom/w3c-xmlserializer) | 5.0.0 | `MIT` | development |
| [`webidl-conversions`](jsdom/webidl-conversions) | 7.0.0 | `BSD-2-Clause` | development |
| [`whatwg-encoding`](jsdom/whatwg-encoding) | 3.1.1 | `MIT` | development |
| [`whatwg-mimetype`](jsdom/whatwg-mimetype) | 4.0.0 | `MIT` | development |
| [`whatwg-url`](jsdom/whatwg-url) | 14.2.0 | `MIT` | development |
| [`which-boxed-primitive`](https://github.com/inspect-js/which-boxed-primitive#readme) | 1.1.1 | `MIT` | development |
| [`which-builtin-type`](https://github.com/inspect-js/which-builtin-type#readme) | 1.2.1 | `MIT` | development |
| [`which-collection`](https://github.com/inspect-js/which-collection#readme) | 1.0.2 | `MIT` | development |
| [`which-typed-array`](https://github.com/inspect-js/which-typed-array) | 1.1.20 | `MIT` | development |
| [`why-is-node-running`](https://github.com/mafintosh/why-is-node-running) | 2.3.0 | `MIT` | development |
| [`workbox-background-sync`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-broadcast-update`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-build`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-cacheable-response`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-core`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-expiration`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-google-analytics`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-navigation-preload`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-precaching`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-range-requests`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-recipes`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-routing`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-strategies`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-streams`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-sw`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`workbox-window`](https://github.com/GoogleChrome/workbox) | 7.4.0 | `MIT` | development |
| [`ws`](https://github.com/websockets/ws) | 8.20.0 | `MIT` | development |
| [`xml-name-validator`](jsdom/xml-name-validator) | 5.0.0 | `Apache-2.0` | development |
| [`xmlchars`](https://github.com/lddubeau/xmlchars) | 2.2.0 | `MIT` | development |
| [`yallist`](https://github.com/isaacs/yallist) | 3.1.1 | `ISC` | development |
| [`yaml`](https://eemeli.org/yaml/v1/) | 1.10.3 | `ISC` | development |
| [`zwitch`](wooorm/zwitch) | 2.0.4 | `MIT` | development |

</details>

## How this is maintained

- **Re-generation**: `npm run build-tech-bom` reads `node_modules/`, walks the npm dep tree, and rewrites this file + `static/data/tech-bom.json`. Run after every `npm install` / dep bump.
- **CI check**: chained into `validate-data` so a license that is not on the allowlist breaks the build. To add a new license, edit `LICENSE_ALLOWLIST` in `scripts/build-tech-bom.ts`.
- **No new dependencies were added to make this work.** Generator is pure Node + npm CLI; output formats are markdown + a CycloneDX-shaped JSON subset.
- **Project license**: `MIT` (see [LICENSE](../LICENSE)). All bundled deps are compatible.

