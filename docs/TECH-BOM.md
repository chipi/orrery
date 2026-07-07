# Tech Bill of Materials

> Auto-generated. **Do not edit by hand.** Re-run `npm run build-tech-bom`.

Every npm package that ships with Orrery, every build-time tool, every transitive dependency. License-audited fail-closed in CI — if a new dep ships with a license that is not in our allowlist, the build breaks and we have to make a decision.

Companion to the [image bill of materials](../static/data/image-provenance.json) and the [outbound-link bill of materials](../static/data/link-provenance.json) — every kind of "what is in this app and where did it come from" question is answered by one of those three sources.

| | |
|---|---|
| **Project** | `orrery@0.8.0-wip` |
| **Generated** | 2026-07-07 |
| **Total packages** | 881 (145 runtime · 736 development) |
| **Top-level runtime deps** | 13 |
| **Top-level dev deps** | 34 |
| **Transitive deps** | 834 |
| **Distinct licenses** | 16 |

## License summary

| License | Count | Notes |
|---|---|---|
| `MIT` | 721 |  |
| `Apache-2.0` | 55 |  |
| `ISC` | 52 |  |
| `BSD-2-Clause` | 20 |  |
| `BSD-3-Clause` | 11 |  |
| `BlueOak-1.0.0` | 8 |  |
| `Unlicense` | 3 |  |
| `FSL-1.1-MIT` | 2 |  |
| `MPL-2.0` | 2 |  |
| `CC-BY-4.0` | 1 |  |
| `0BSD` | 1 |  |
| `MIT-0` | 1 |  |
| `CC0-1.0` | 1 |  |
| `LGPL-3.0-or-later` | 1 |  |
| `Python-2.0` | 1 |  |
| `BSD` | 1 |  |

## Top-level runtime dependencies

_Bundled into the SPA and shipped to every visitor. Smallest possible surface area is the goal — we go to lengths to keep this list short._

| Package | Version | License | Description |
|---|---|---|---|
| [`@capacitor-community/safe-area`](https://github.com/capacitor-community/safe-area) | 8.0.1 | `MIT` | Capacitor Plugin that patches the safe area for older versions of Chromium |
| [`@capacitor/android`](https://capacitorjs.com) | 8.4.1 | `MIT` | Capacitor: Cross-platform apps with JavaScript and the web |
| [`@capacitor/app`](https://github.com/ionic-team/capacitor-plugins) | 8.1.0 | `MIT` | The App API handles high level App state and events.For example, this API emits events when the app enters and |
| [`@capacitor/browser`](https://github.com/ionic-team/capacitor-plugins) | 8.0.3 | `MIT` | The Browser API provides the ability to open an in-app browser and subscribe to browser events. |
| [`@capacitor/core`](https://capacitorjs.com) | 8.4.1 | `MIT` | Capacitor: Cross-platform apps with JavaScript and the web |
| [`@capacitor/haptics`](https://github.com/ionic-team/capacitor-haptics) | 8.0.2 | `MIT` | The Haptics API provides physical feedback to the user through touch or vibration. |
| [`@capacitor/ios`](https://capacitorjs.com) | 8.4.1 | `MIT` | Capacitor: Cross-platform apps with JavaScript and the web |
| [`@capacitor/share`](https://github.com/ionic-team/capacitor-plugins) | 8.0.1 | `MIT` | The Share API provides methods for sharing content in any sharing-enabled apps the user may have installed. |
| [`@capacitor/splash-screen`](https://github.com/ionic-team/capacitor-plugins) | 8.0.1 | `MIT` | The Splash Screen API provides methods for showing or hiding a Splash image. |
| [`@sentry/sveltekit`](https://github.com/getsentry/sentry-javascript/tree/master/packages/sveltekit) | 10.63.0 | `MIT` | Official Sentry SDK for SvelteKit |
| [`detect-gpu`](https://github.com/pmndrs/detect-gpu#readme) | 5.0.70 | `MIT` | Classify GPU's based on their benchmark score in order to provide an adaptive experience. |
| [`katex`](https://katex.org) | 0.16.47 | `MIT` | Fast math typesetting for the web. |
| [`three`](https://threejs.org/) | 0.128.0 | `MIT` | JavaScript 3D library |

## Top-level development dependencies

_Build-time tools — not shipped to browsers._

| Package | Version | License | Description |
|---|---|---|---|
| [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript) | 0.96.0 | `MIT` | The official TypeScript library for the Anthropic API |
| [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm) | 4.12.1 | `MPL-2.0` | Provides a method to inject and analyze web pages using axe |
| [`@capacitor/assets`](https://ionicframework.com) | 3.0.5 | `MIT` | Generate icon and splash screen images for Capacitor apps |
| [`@capacitor/cli`](https://capacitorjs.com) | 8.4.1 | `MIT` | Capacitor: Cross-platform apps with JavaScript and the web |
| [`@eslint/js`](https://eslint.org) | 9.17.0 | `MIT` | ESLint JavaScript language implementation |
| [`@google-cloud/text-to-speech`](https://github.com/googleapis/google-cloud-node/tree/main/packages/google-cloud-texttospeech) | 6.4.1 | `Apache-2.0` | Cloud Text-to-Speech API client for Node.js |
| [`@inlang/paraglide-js`](https://paraglidejs.com) | 2.20.2 | `MIT` |  |
| [`@playwright/test`](https://playwright.dev) | 1.60.0 | `Apache-2.0` | A high-level API to automate web browsers |
| [`@sveltejs/adapter-static`](https://svelte.dev/docs/kit/adapter-static) | 3.0.10 | `MIT` | Adapter for SvelteKit apps that prerenders your entire site as a collection of static files |
| [`@types/katex`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/katex) | 0.16.8 | `MIT` | TypeScript definitions for katex |
| [`@types/node`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node) | 22.10.2 | `MIT` | TypeScript definitions for node |
| [`@types/three`](https://github.com/DefinitelyTyped/DefinitelyTyped) | 0.128.0 | `MIT` | TypeScript definitions for three |
| [`@vite-pwa/sveltekit`](https://github.com/vite-pwa/sveltekit#readme) | 1.1.0 | `MIT` | Zero-config PWA for SvelteKit |
| [`@vitest/coverage-v8`](https://vitest.dev/guide/coverage) | 4.1.10 | `MIT` | V8 coverage provider for Vitest |
| [`ajv`](https://ajv.js.org) | 8.20.0 | `MIT` | Another JSON Schema Validator |
| [`ajv-formats`](https://github.com/ajv-validator/ajv-formats#readme) | 3.0.1 | `MIT` | Format validation for Ajv v7+ |
| [`canvas`](https://github.com/Automattic/node-canvas) | 3.2.3 | `MIT` | Canvas graphics API backed by Cairo |
| [`eslint`](https://eslint.org) | 9.17.0 | `MIT` | An AST-based pattern checker for JavaScript. |
| [`eslint-config-prettier`](https://github.com/prettier/eslint-config-prettier#readme) | 10.1.8 | `MIT` | Turns off all rules that are unnecessary or might conflict with Prettier. |
| [`eslint-plugin-svelte`](https://sveltejs.github.io/eslint-plugin-svelte) | 2.46.1 | `MIT` | ESLint plugin for Svelte using AST |
| [`gdal-async`](https://github.com/mmomtchev/node-gdal-async) | 3.12.3 | `Apache-2.0` | Bindings to GDAL (Geospatial Data Abstraction Library) with full async support |
| [`globals`](https://github.com/sindresorhus/globals) | 17.6.0 | `MIT` | Global identifiers from different JavaScript environments |
| [`jsdom`](https://github.com/jsdom/jsdom) | 26.0.0 | `MIT` | A JavaScript implementation of many web standards |
| [`prettier`](https://prettier.io) | 3.4.2 | `MIT` | Prettier is an opinionated code formatter |
| [`prettier-plugin-svelte`](https://github.com/sveltejs/prettier-plugin-svelte#readme) | 3.5.2 | `MIT` | Svelte plugin for prettier |
| [`sharp`](https://sharp.pixelplumbing.com) | 0.34.5 | `Apache-2.0` | High performance Node.js image processing, the fastest module to resize JPEG, PNG, WebP, GIF, AVIF and TIFF im |
| [`svelte-check`](https://github.com/sveltejs/language-tools#readme) | 4.7.2 | `MIT` | Svelte Code Checker Terminal Interface |
| [`tslib`](https://www.typescriptlang.org/) | 2.8.1 | `0BSD` | Runtime library for TypeScript helper functions |
| [`tsx`](https://tsx.hirok.io) | 4.22.3 | `MIT` | TypeScript Execute (tsx): Node.js enhanced with esbuild to run TypeScript & ESM files |
| [`typescript-eslint`](https://typescript-eslint.io/packages/typescript-eslint) | 8.63.0 | `MIT` | Tooling which enables you to use TypeScript with ESLint |
| [`vite-plugin-compression2`](https://github.com/nonzzz/vite-plugin-compression#readme) | 2.5.3 | `MIT` | a fast vite compression plugin |
| [`vitepress`](https://vitepress.dev/) | 1.5.0 | `MIT` | Vite & Vue powered static site generator |
| [`vitepress-sidebar`](https://vitepress-sidebar.cdget.com) | 1.25.2 | `MIT` | A VitePress auto sidebar plugin that automatically creates a simple configuration. |
| [`vitest`](https://vitest.dev) | 4.1.10 | `MIT` | Next generation testing framework powered by Vite |

## Transitive dependencies

<details><summary>Show all 834 transitive packages</summary>

| Package | Version | License | Scope |
|---|---|---|---|
| [`@apm-js-collab/code-transformer`](https://github.com/nodejs/orchestrion-js) | 0.15.0 | `Apache-2.0` | runtime |
| [`@apm-js-collab/code-transformer-bundler-plugins`](https://github.com/apm-js-collab/code-transformer-bundler-plugins) | 0.5.0 | `MIT` | runtime |
| [`@apm-js-collab/tracing-hooks`](https://github.com/apm-js-collab/tracing-hooks) | 0.10.1 | `Apache-2.0` | runtime |
| [`@babel/code-frame`](https://babel.dev/docs/en/next/babel-code-frame) | 7.29.7 | `MIT` | runtime |
| [`@babel/compat-data`](https://github.com/babel/babel) | 7.29.7 | `MIT` | runtime |
| [`@babel/core`](https://babel.dev/docs/en/next/babel-core) | 7.29.7 | `MIT` | runtime |
| [`@babel/generator`](https://babel.dev/docs/en/next/babel-generator) | 7.29.7 | `MIT` | runtime |
| [`@babel/helper-compilation-targets`](https://github.com/babel/babel) | 7.29.7 | `MIT` | runtime |
| [`@babel/helper-module-imports`](https://babel.dev/docs/en/next/babel-helper-module-imports) | 7.29.7 | `MIT` | runtime |
| [`@babel/helper-module-transforms`](https://babel.dev/docs/en/next/babel-helper-module-transforms) | 7.29.7 | `MIT` | runtime |
| [`@babel/helper-validator-identifier`](https://github.com/babel/babel) | 7.29.7 | `MIT` | runtime |
| [`@babel/helper-validator-option`](https://github.com/babel/babel) | 7.29.7 | `MIT` | runtime |
| [`@babel/helpers`](https://babel.dev/docs/en/next/babel-helpers) | 7.29.7 | `MIT` | runtime |
| [`@babel/parser`](https://babel.dev/docs/en/next/babel-parser) | 7.29.7 | `MIT` | runtime |
| [`@babel/template`](https://babel.dev/docs/en/next/babel-template) | 7.29.7 | `MIT` | runtime |
| [`@babel/traverse`](https://babel.dev/docs/en/next/babel-traverse) | 7.29.7 | `MIT` | runtime |
| [`@babel/types`](https://babel.dev/docs/en/next/babel-types) | 7.29.7 | `MIT` | runtime |
| [`@jridgewell/gen-mapping`](https://github.com/jridgewell/sourcemaps/tree/main/packages/gen-mapping) | 0.3.13 | `MIT` | runtime |
| [`@jridgewell/remapping`](https://github.com/jridgewell/sourcemaps/tree/main/packages/remapping) | 2.3.5 | `MIT` | runtime |
| [`@jridgewell/sourcemap-codec`](https://github.com/jridgewell/sourcemaps/tree/main/packages/sourcemap-codec) | 1.5.5 | `MIT` | runtime |
| [`@jridgewell/trace-mapping`](https://github.com/jridgewell/sourcemaps/tree/main/packages/trace-mapping) | 0.3.31 | `MIT` | runtime |
| [`@opentelemetry/api`](https://github.com/open-telemetry/opentelemetry-js/tree/main/api) | 1.9.1 | `Apache-2.0` | runtime |
| [`@opentelemetry/api-logs`](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/api-logs) | 0.214.0 | `Apache-2.0` | runtime |
| [`@opentelemetry/core`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-core) | 2.9.0 | `Apache-2.0` | runtime |
| [`@opentelemetry/instrumentation`](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation) | 0.214.0 | `Apache-2.0` | runtime |
| [`@opentelemetry/resources`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-resources) | 2.9.0 | `Apache-2.0` | runtime |
| [`@opentelemetry/sdk-trace`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/sdk-trace) | 2.9.0 | `Apache-2.0` | runtime |
| [`@opentelemetry/sdk-trace-base`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-base) | 2.9.0 | `Apache-2.0` | runtime |
| [`@opentelemetry/semantic-conventions`](https://github.com/open-telemetry/opentelemetry-js/tree/main/semantic-conventions) | 1.42.0 | `Apache-2.0` | runtime |
| [`@polka/url`](https://github.com/lukeed/polka) | 1.0.0-next.29 | `MIT` | runtime |
| [`@sentry/babel-plugin-component-annotate`](https://github.com/getsentry/sentry-javascript-bundler-plugins/tree/main/packages/babel-plugin-component-annotate) | 5.3.0 | `MIT` | runtime |
| [`@sentry/browser`](https://github.com/getsentry/sentry-javascript/tree/master/packages/browser) | 10.63.0 | `MIT` | runtime |
| [`@sentry/browser-utils`](https://github.com/getsentry/sentry-javascript/tree/master/packages/browser-utils) | 10.63.0 | `MIT` | runtime |
| [`@sentry/bundler-plugin-core`](https://github.com/getsentry/sentry-javascript-bundler-plugins/tree/main/packages/bundler-plugin-core) | 5.3.0 | `MIT` | runtime |
| [`@sentry/cli`](https://docs.sentry.io/hosted/learn/cli/) | 2.58.6 | `FSL-1.1-MIT` | runtime |
| [`@sentry/cli-darwin`](https://github.com/getsentry/sentry-cli) | 2.58.6 | `FSL-1.1-MIT` | runtime |
| [`@sentry/cloudflare`](https://github.com/getsentry/sentry-javascript/tree/master/packages/cloudflare) | 10.63.0 | `MIT` | runtime |
| [`@sentry/conventions`](https://github.com/getsentry/sentry-conventions#readme) | 0.12.0 | `MIT` | runtime |
| [`@sentry/core`](https://github.com/getsentry/sentry-javascript/tree/master/packages/core) | 10.63.0 | `MIT` | runtime |
| [`@sentry/feedback`](https://github.com/getsentry/sentry-javascript/tree/master/packages/feedback) | 10.63.0 | `MIT` | runtime |
| [`@sentry/node`](https://github.com/getsentry/sentry-javascript/tree/master/packages/node) | 10.63.0 | `MIT` | runtime |
| [`@sentry/node-core`](https://github.com/getsentry/sentry-javascript/tree/master/packages/node-core) | 10.63.0 | `MIT` | runtime |
| [`@sentry/opentelemetry`](https://github.com/getsentry/sentry-javascript/tree/master/packages/opentelemetry) | 10.63.0 | `MIT` | runtime |
| [`@sentry/replay`](https://docs.sentry.io/platforms/javascript/session-replay/) | 10.63.0 | `MIT` | runtime |
| [`@sentry/replay-canvas`](https://docs.sentry.io/platforms/javascript/session-replay/) | 10.63.0 | `MIT` | runtime |
| [`@sentry/rollup-plugin`](https://github.com/getsentry/sentry-javascript-bundler-plugins/tree/main/packages/rollup-plugin) | 5.3.0 | `MIT` | runtime |
| [`@sentry/server-utils`](https://github.com/getsentry/sentry-javascript/tree/master/packages/server-utils) | 10.63.0 | `MIT` | runtime |
| [`@sentry/svelte`](https://github.com/getsentry/sentry-javascript/tree/master/packages/svelte) | 10.63.0 | `MIT` | runtime |
| [`@sentry/vite-plugin`](https://github.com/getsentry/sentry-javascript-bundler-plugins/tree/main/packages/vite-plugin) | 5.3.0 | `MIT` | runtime |
| [`@standard-schema/spec`](https://standardschema.dev) | 1.1.0 | `MIT` | runtime |
| [`@sveltejs/acorn-typescript`](https://github.com/sveltejs/acorn-typescript#readme) | 1.0.11 | `MIT` | runtime |
| [`@sveltejs/kit`](https://svelte.dev) | 2.61.1 | `MIT` | runtime |
| [`@sveltejs/vite-plugin-svelte`](https://github.com/sveltejs/vite-plugin-svelte#readme) | 4.0.4 | `MIT` | runtime |
| [`@sveltejs/vite-plugin-svelte-inspector`](https://github.com/sveltejs/vite-plugin-svelte#readme) | 3.0.1 | `MIT` | runtime |
| [`@types/cookie`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/cookie) | 0.6.0 | `MIT` | runtime |
| [`@types/estree`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/estree) | 1.0.9 | `MIT` | runtime |
| [`@types/trusted-types`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/trusted-types) | 2.0.7 | `MIT` | runtime |
| [`@typescript-eslint/types`](https://typescript-eslint.io) | 8.63.0 | `MIT` | runtime |
| [`acorn`](https://github.com/acornjs/acorn) | 8.17.0 | `MIT` | runtime |
| [`agent-base`](https://github.com/TooTallNate/node-agent-base) | 6.0.2 | `MIT` | runtime |
| [`aria-query`](https://github.com/A11yance/aria-query#readme) | 5.3.1 | `Apache-2.0` | runtime |
| [`axobject-query`](https://github.com/A11yance/axobject-query#readme) | 4.1.0 | `Apache-2.0` | runtime |
| [`balanced-match`](https://github.com/juliangruber/balanced-match) | 1.0.2 | `MIT` | runtime |
| [`baseline-browser-mapping`](https://github.com/web-platform-dx/baseline-browser-mapping) | 2.10.42 | `Apache-2.0` | runtime |
| [`brace-expansion`](https://github.com/juliangruber/brace-expansion) | 1.1.15 | `MIT` | runtime |
| [`browserslist`](https://github.com/browserslist/browserslist) | 4.28.5 | `MIT` | runtime |
| [`caniuse-lite`](https://github.com/browserslist/caniuse-lite) | 1.0.30001803 | `CC-BY-4.0` | runtime |
| [`clsx`](https://github.com/lukeed/clsx) | 2.1.1 | `MIT` | runtime |
| [`commander`](https://github.com/tj/commander.js) | 12.1.0 | `MIT` | runtime |
| [`convert-source-map`](https://github.com/thlorenz/convert-source-map) | 2.0.0 | `MIT` | runtime |
| [`cookie`](https://github.com/jshttp/cookie) | 0.6.0 | `MIT` | runtime |
| [`debug`](https://github.com/debug-js/debug) | 4.4.3 | `MIT` | runtime |
| [`deepmerge`](https://github.com/TehShrike/deepmerge) | 4.3.1 | `MIT` | runtime |
| [`devalue`](https://github.com/sveltejs/devalue) | 5.8.1 | `MIT` | runtime |
| [`dotenv`](https://github.com/motdotla/dotenv#readme) | 16.6.1 | `BSD-2-Clause` | runtime |
| [`electron-to-chromium`](https://github.com/Kilian/electron-to-chromium) | 1.5.388 | `ISC` | runtime |
| [`es-module-lexer`](https://github.com/guybedford/es-module-lexer#readme) | 2.3.0 | `MIT` | runtime |
| [`escalade`](https://github.com/lukeed/escalade) | 3.2.0 | `MIT` | runtime |
| [`esm-env`](https://github.com/benmccann/esm-env) | 1.2.2 | `MIT` | runtime |
| [`esrap`](https://github.com/sveltejs/esrap) | 2.2.13 | `MIT` | runtime |
| [`find-up`](https://github.com/sindresorhus/find-up) | 5.0.0 | `MIT` | runtime |
| [`gensync`](https://github.com/loganfsmyth/gensync) | 1.0.0-beta.2 | `MIT` | runtime |
| [`glob`](https://github.com/isaacs/node-glob) | 13.0.6 | `BlueOak-1.0.0` | runtime |
| [`globalyzer`](https://github.com/terkelg/globalyzer) | 0.1.0 | `MIT` | runtime |
| [`globrex`](https://github.com/terkelg/globrex) | 0.1.2 | `MIT` | runtime |
| [`https-proxy-agent`](https://github.com/TooTallNate/node-https-proxy-agent) | 5.0.1 | `MIT` | runtime |
| [`import-in-the-middle`](https://github.com/nodejs/import-in-the-middle#readme) | 3.3.0 | `Apache-2.0` | runtime |
| [`is-reference`](https://github.com/Rich-Harris/is-reference#readme) | 3.0.3 | `MIT` | runtime |
| [`isexe`](https://github.com/isaacs/isexe#readme) | 2.0.0 | `ISC` | runtime |
| [`js-tokens`](https://github.com/lydell/js-tokens) | 4.0.0 | `MIT` | runtime |
| [`jsesc`](https://mths.be/jsesc) | 3.1.0 | `MIT` | runtime |
| [`json5`](http://json5.org/) | 2.2.3 | `MIT` | runtime |
| [`kleur`](https://github.com/lukeed/kleur) | 4.1.5 | `MIT` | runtime |
| [`locate-character`](https://gitlab.com/Rich-Harris/locate-character#README) | 3.0.0 | `MIT` | runtime |
| [`locate-path`](https://github.com/sindresorhus/locate-path) | 6.0.0 | `MIT` | runtime |
| [`lru-cache`](https://github.com/isaacs/node-lru-cache) | 5.1.1 | `ISC` | runtime |
| [`magic-string`](https://github.com/Rich-Harris/magic-string) | 0.30.21 | `MIT` | runtime |
| [`minimatch`](https://github.com/isaacs/minimatch) | 3.1.5 | `ISC` | runtime |
| [`minimist`](https://github.com/minimistjs/minimist) | 1.2.8 | `MIT` | runtime |
| [`minipass`](https://github.com/isaacs/minipass) | 7.1.3 | `BlueOak-1.0.0` | runtime |
| [`module-details-from-path`](https://github.com/watson/module-details-from-path#readme) | 1.0.4 | `MIT` | runtime |
| [`mrmime`](https://github.com/lukeed/mrmime) | 2.0.1 | `MIT` | runtime |
| [`node-fetch`](https://github.com/bitinn/node-fetch) | 2.7.0 | `MIT` | runtime |
| [`node-releases`](https://github.com/chicoxyzzy/node-releases) | 2.0.50 | `MIT` | runtime |
| [`p-limit`](https://github.com/sindresorhus/p-limit) | 3.1.0 | `MIT` | runtime |
| [`p-locate`](https://github.com/sindresorhus/p-locate) | 5.0.0 | `MIT` | runtime |
| [`path-exists`](https://github.com/sindresorhus/path-exists) | 4.0.0 | `MIT` | runtime |
| [`path-scurry`](https://github.com/isaacs/path-scurry) | 2.0.2 | `BlueOak-1.0.0` | runtime |
| [`picocolors`](https://github.com/alexeyraspopov/picocolors) | 1.1.1 | `ISC` | runtime |
| [`progress`](https://github.com/visionmedia/node-progress) | 2.0.3 | `MIT` | runtime |
| [`proxy-from-env`](https://github.com/Rob--W/proxy-from-env#readme) | 1.1.0 | `MIT` | runtime |
| [`require-in-the-middle`](https://github.com/nodejs/require-in-the-middle#readme) | 8.0.1 | `MIT` | runtime |
| [`rollup`](https://rollupjs.org/) | 4.62.2 | `MIT` | runtime |
| [`semver`](https://github.com/npm/node-semver) | 7.8.5 | `ISC` | runtime |
| [`set-cookie-parser`](https://github.com/nfriedly/set-cookie-parser) | 3.1.1 | `MIT` | runtime |
| [`sirv`](https://github.com/lukeed/sirv) | 3.0.2 | `MIT` | runtime |
| [`sorcery`](https://github.com/Rich-Harris/sorcery) | 1.0.0 | `MIT` | runtime |
| [`svelte`](https://svelte.dev) | 5.56.4 | `MIT` | runtime |
| [`tiny-glob`](https://github.com/terkelg/tiny-glob) | 0.2.9 | `MIT` | runtime |
| [`totalist`](https://github.com/lukeed/totalist) | 3.0.1 | `MIT` | runtime |
| [`tr46`](https://github.com/jsdom/tr46) | 5.1.1 | `MIT` | runtime |
| [`typescript`](https://www.typescriptlang.org/) | 5.7.2 | `Apache-2.0` | runtime |
| [`update-browserslist-db`](https://github.com/browserslist/update-db) | 1.2.3 | `MIT` | runtime |
| [`vite`](https://vite.dev) | 5.4.21 | `MIT` | runtime |
| [`vitefu`](https://github.com/svitejs/vitefu) | 1.1.3 | `MIT` | runtime |
| `webgl-constants` | 1.1.1 | `MIT` | runtime |
| [`webidl-conversions`](https://github.com/jsdom/webidl-conversions) | 7.0.0 | `BSD-2-Clause` | runtime |
| [`whatwg-url`](https://github.com/jsdom/whatwg-url) | 14.2.0 | `MIT` | runtime |
| [`which`](https://github.com/isaacs/node-which) | 2.0.2 | `ISC` | runtime |
| [`yallist`](https://github.com/isaacs/yallist) | 3.1.1 | `ISC` | runtime |
| [`yocto-queue`](https://github.com/sindresorhus/yocto-queue) | 0.1.0 | `MIT` | runtime |
| [`zimmerframe`](https://github.com/sveltejs/zimmerframe) | 1.1.4 | `MIT` | runtime |
| [`@algolia/autocomplete-core`](https://github.com/algolia/autocomplete) | 1.17.9 | `MIT` | development |
| [`@algolia/autocomplete-plugin-algolia-insights`](https://github.com/algolia/autocomplete) | 1.17.9 | `MIT` | development |
| [`@algolia/autocomplete-preset-algolia`](https://github.com/algolia/autocomplete) | 1.17.9 | `MIT` | development |
| [`@algolia/autocomplete-shared`](https://github.com/algolia/autocomplete) | 1.17.9 | `MIT` | development |
| [`@algolia/client-common`](https://github.com/algolia/algoliasearch-client-javascript#readme) | 5.55.1 | `MIT` | development |
| [`@algolia/client-search`](https://github.com/algolia/algoliasearch-client-javascript/tree/main/packages/client-search#readme) | 5.55.1 | `MIT` | development |
| [`@algolia/requester-browser-xhr`](https://github.com/algolia/algoliasearch-client-javascript#readme) | 5.55.1 | `MIT` | development |
| [`@algolia/requester-fetch`](https://github.com/algolia/algoliasearch-client-javascript#readme) | 5.55.1 | `MIT` | development |
| [`@algolia/requester-node-http`](https://github.com/algolia/algoliasearch-client-javascript#readme) | 5.55.1 | `MIT` | development |
| [`@apideck/better-ajv-errors`](https://github.com/apideck-libraries/better-ajv-errors) | 0.3.7 | `MIT` | development |
| [`@asamuzakjp/css-color`](https://github.com/asamuzaK/cssColor#readme) | 3.2.0 | `MIT` | development |
| [`@babel/helper-annotate-as-pure`](https://babel.dev/docs/en/next/babel-helper-annotate-as-pure) | 7.29.7 | `MIT` | development |
| [`@babel/helper-create-class-features-plugin`](https://github.com/babel/babel) | 7.29.7 | `MIT` | development |
| [`@babel/helper-create-regexp-features-plugin`](https://github.com/babel/babel) | 7.29.7 | `MIT` | development |
| [`@babel/helper-define-polyfill-provider`](https://github.com/babel/babel-polyfills) | 0.6.8 | `MIT` | development |
| [`@babel/helper-globals`](https://github.com/babel/babel) | 7.29.7 | `MIT` | development |
| [`@babel/helper-member-expression-to-functions`](https://babel.dev/docs/en/next/babel-helper-member-expression-to-functions) | 7.29.7 | `MIT` | development |
| [`@babel/helper-optimise-call-expression`](https://babel.dev/docs/en/next/babel-helper-optimise-call-expression) | 7.29.7 | `MIT` | development |
| [`@babel/helper-plugin-utils`](https://babel.dev/docs/en/next/babel-helper-plugin-utils) | 7.29.7 | `MIT` | development |
| [`@babel/helper-remap-async-to-generator`](https://babel.dev/docs/en/next/babel-helper-remap-async-to-generator) | 7.29.7 | `MIT` | development |
| [`@babel/helper-replace-supers`](https://babel.dev/docs/en/next/babel-helper-replace-supers) | 7.29.7 | `MIT` | development |
| [`@babel/helper-skip-transparent-expression-wrappers`](https://github.com/babel/babel) | 7.29.7 | `MIT` | development |
| [`@babel/helper-wrap-function`](https://babel.dev/docs/en/next/babel-helper-wrap-function) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-bugfix-firefox-class-in-computed-class-key`](https://babel.dev/docs/en/next/babel-plugin-bugfix-firefox-class-in-computed-class-key) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-bugfix-safari-class-field-initializer-scope`](https://babel.dev/docs/en/next/babel-plugin-bugfix-safari-class-field-initializer-scope) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-bugfix-safari-id-destructuring-collision-in-function-expression`](https://babel.dev/docs/en/next/babel-plugin-bugfix-safari-id-destructuring-collision-in-function-expression) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-bugfix-safari-rest-destructuring-rhs-array`](https://babel.dev/docs/en/next/babel-plugin-bugfix-safari-rest-destructuring-rhs-array) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-bugfix-v8-spread-parameters-in-optional-chaining`](https://babel.dev/docs/en/next/babel-plugin-bugfix-v8-spread-parameters-in-optional-chaining) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-bugfix-v8-static-class-fields-redefine-readonly`](https://babel.dev/docs/en/next/babel-plugin-bugfix-v8-static-class-fields-redefine-readonly) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-proposal-private-property-in-object`](https://babel.dev/docs/en/next/babel-plugin-proposal-private-property-in-object) | 7.21.0-placeholder-for-preset-env.2 | `MIT` | development |
| [`@babel/plugin-syntax-import-assertions`](https://github.com/babel/babel) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-syntax-import-attributes`](https://github.com/babel/babel) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-syntax-unicode-sets-regex`](https://babel.dev/docs/en/next/babel-plugin-syntax-unicode-sets-regex) | 7.18.6 | `MIT` | development |
| [`@babel/plugin-transform-arrow-functions`](https://babel.dev/docs/en/next/babel-plugin-transform-arrow-functions) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-async-generator-functions`](https://babel.dev/docs/en/next/babel-plugin-transform-async-generator-functions) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-async-to-generator`](https://babel.dev/docs/en/next/babel-plugin-transform-async-to-generator) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-block-scoped-functions`](https://babel.dev/docs/en/next/babel-plugin-transform-block-scoped-functions) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-block-scoping`](https://babel.dev/docs/en/next/babel-plugin-transform-block-scoping) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-class-properties`](https://babel.dev/docs/en/next/babel-plugin-transform-class-properties) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-class-static-block`](https://babel.dev/docs/en/next/babel-plugin-transform-class-static-block) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-classes`](https://babel.dev/docs/en/next/babel-plugin-transform-classes) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-computed-properties`](https://babel.dev/docs/en/next/babel-plugin-transform-computed-properties) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-destructuring`](https://babel.dev/docs/en/next/babel-plugin-transform-destructuring) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-dotall-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-dotall-regex) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-duplicate-keys`](https://babel.dev/docs/en/next/babel-plugin-transform-duplicate-keys) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-duplicate-named-capturing-groups-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-duplicate-named-capturing-groups-regex) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-dynamic-import`](https://github.com/babel/babel) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-explicit-resource-management`](https://babel.dev/docs/en/next/babel-plugin-transform-explicit-resource-management) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-exponentiation-operator`](https://babel.dev/docs/en/next/babel-plugin-transform-exponentiation-operator) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-export-namespace-from`](https://babel.dev/docs/en/next/babel-plugin-transform-export-namespace-from) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-for-of`](https://babel.dev/docs/en/next/babel-plugin-transform-for-of) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-function-name`](https://babel.dev/docs/en/next/babel-plugin-transform-function-name) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-json-strings`](https://babel.dev/docs/en/next/babel-plugin-transform-json-strings) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-literals`](https://babel.dev/docs/en/next/babel-plugin-transform-literals) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-logical-assignment-operators`](https://babel.dev/docs/en/next/babel-plugin-transform-logical-assignment-operators) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-member-expression-literals`](https://babel.dev/docs/en/next/babel-plugin-transform-member-expression-literals) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-modules-amd`](https://babel.dev/docs/en/next/babel-plugin-transform-modules-amd) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-modules-commonjs`](https://babel.dev/docs/en/next/babel-plugin-transform-modules-commonjs) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-modules-systemjs`](https://babel.dev/docs/en/next/babel-plugin-transform-modules-systemjs) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-modules-umd`](https://babel.dev/docs/en/next/babel-plugin-transform-modules-umd) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-named-capturing-groups-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-named-capturing-groups-regex) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-new-target`](https://babel.dev/docs/en/next/babel-plugin-transform-new-target) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-nullish-coalescing-operator`](https://babel.dev/docs/en/next/babel-plugin-transform-nullish-coalescing-operator) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-numeric-separator`](https://babel.dev/docs/en/next/babel-plugin-transform-numeric-separator) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-object-rest-spread`](https://babel.dev/docs/en/next/babel-plugin-transform-object-rest-spread) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-object-super`](https://babel.dev/docs/en/next/babel-plugin-transform-object-super) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-optional-catch-binding`](https://babel.dev/docs/en/next/babel-plugin-transform-optional-catch-binding) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-optional-chaining`](https://babel.dev/docs/en/next/babel-plugin-transform-optional-chaining) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-parameters`](https://babel.dev/docs/en/next/babel-plugin-transform-parameters) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-private-methods`](https://babel.dev/docs/en/next/babel-plugin-transform-private-methods) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-private-property-in-object`](https://babel.dev/docs/en/next/babel-plugin-transform-private-property-in-object) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-property-literals`](https://babel.dev/docs/en/next/babel-plugin-transform-property-literals) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-regenerator`](https://babel.dev/docs/en/next/babel-plugin-transform-regenerator) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-regexp-modifiers`](https://babel.dev/docs/en/next/babel-plugin-transform-regexp-modifiers) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-reserved-words`](https://babel.dev/docs/en/next/babel-plugin-transform-reserved-words) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-shorthand-properties`](https://babel.dev/docs/en/next/babel-plugin-transform-shorthand-properties) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-spread`](https://babel.dev/docs/en/next/babel-plugin-transform-spread) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-sticky-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-sticky-regex) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-template-literals`](https://babel.dev/docs/en/next/babel-plugin-transform-template-literals) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-typeof-symbol`](https://babel.dev/docs/en/next/babel-plugin-transform-typeof-symbol) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-unicode-escapes`](https://babel.dev/docs/en/next/babel-plugin-transform-unicode-escapes) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-unicode-property-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-unicode-property-regex) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-unicode-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-unicode-regex) | 7.29.7 | `MIT` | development |
| [`@babel/plugin-transform-unicode-sets-regex`](https://babel.dev/docs/en/next/babel-plugin-transform-unicode-sets-regex) | 7.29.7 | `MIT` | development |
| [`@babel/preset-env`](https://babel.dev/docs/en/next/babel-preset-env) | 7.29.7 | `MIT` | development |
| [`@babel/preset-modules`](https://github.com/babel/preset-modules) | 0.1.6-no-external-plugins | `MIT` | development |
| [`@babel/runtime`](https://babel.dev/docs/en/next/babel-runtime) | 7.29.7 | `MIT` | development |
| [`@bcoe/v8-coverage`](https://github.com/bcoe/v8-coverage) | 1.0.2 | `MIT` | development |
| [`@cspotcode/source-map-support`](https://github.com/cspotcode/node-source-map-support) | 0.8.1 | `MIT` | development |
| [`@csstools/color-helpers`](https://github.com/csstools/postcss-plugins/tree/main/packages/color-helpers#readme) | 5.1.0 | `MIT-0` | development |
| [`@csstools/css-calc`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-calc#readme) | 2.1.4 | `MIT` | development |
| [`@csstools/css-color-parser`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-color-parser#readme) | 3.1.0 | `MIT` | development |
| [`@csstools/css-parser-algorithms`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-parser-algorithms#readme) | 3.0.5 | `MIT` | development |
| [`@csstools/css-tokenizer`](https://github.com/csstools/postcss-plugins/tree/main/packages/css-tokenizer#readme) | 3.0.4 | `MIT` | development |
| [`@docsearch/css`](https://docsearch.algolia.com) | 3.9.0 | `MIT` | development |
| [`@docsearch/js`](https://docsearch.algolia.com) | 3.9.0 | `MIT` | development |
| [`@docsearch/react`](https://docsearch.algolia.com) | 3.9.0 | `MIT` | development |
| [`@esbuild/darwin-arm64`](https://github.com/evanw/esbuild) | 0.28.1 | `MIT` | development |
| [`@eslint-community/eslint-utils`](https://github.com/eslint-community/eslint-utils#readme) | 4.9.1 | `MIT` | development |
| [`@eslint-community/regexpp`](https://github.com/eslint-community/regexpp#readme) | 4.12.2 | `MIT` | development |
| [`@grpc/grpc-js`](https://grpc.io/) | 1.14.4 | `Apache-2.0` | development |
| [`@grpc/proto-loader`](https://grpc.io/) | 0.8.1 | `Apache-2.0` | development |
| [`@hutson/parse-repository-url`](https://gitlab.com/hyper-expanse/open-source/parse-repository-url#readme) | 3.0.2 | `Apache-2.0` | development |
| [`@iconify-json/simple-icons`](https://icon-sets.iconify.design/simple-icons/) | 1.2.89 | `CC0-1.0` | development |
| [`@iconify/types`](https://github.com/iconify/iconify) | 2.0.0 | `MIT` | development |
| [`@img/colour`](https://github.com/lovell/colour) | 1.1.0 | `MIT` | development |
| [`@img/sharp-darwin-arm64`](https://sharp.pixelplumbing.com) | 0.34.5 | `Apache-2.0` | development |
| [`@img/sharp-libvips-darwin-arm64`](https://sharp.pixelplumbing.com) | 1.2.4 | `LGPL-3.0-or-later` | development |
| `@inlang/recommend-sherlock` | 0.2.1 | `MIT` | development |
| [`@inlang/sdk`](https://inlang.com/documentation/sdk) | 2.10.2 | `MIT` | development |
| [`@ionic/cli-framework-output`](https://ionicframework.com/) | 2.2.8 | `MIT` | development |
| [`@ionic/utils-array`](https://ionicframework.com/) | 2.1.6 | `MIT` | development |
| [`@ionic/utils-fs`](https://ionicframework.com/) | 3.1.7 | `MIT` | development |
| [`@ionic/utils-object`](https://ionicframework.com/) | 2.1.6 | `MIT` | development |
| [`@ionic/utils-process`](https://ionicframework.com/) | 2.1.12 | `MIT` | development |
| [`@ionic/utils-stream`](https://ionicframework.com/) | 3.1.7 | `MIT` | development |
| [`@ionic/utils-subprocess`](https://ionicframework.com/) | 3.0.1 | `MIT` | development |
| [`@ionic/utils-terminal`](https://ionicframework.com/) | 2.3.5 | `MIT` | development |
| [`@isaacs/cliui`](https://github.com/yargs/cliui) | 8.0.2 | `ISC` | development |
| [`@isaacs/fs-minipass`](https://github.com/npm/fs-minipass) | 4.0.1 | `ISC` | development |
| [`@jridgewell/resolve-uri`](https://github.com/jridgewell/resolve-uri) | 3.1.2 | `MIT` | development |
| [`@js-sdsl/ordered-map`](https://js-sdsl.org) | 4.4.2 | `MIT` | development |
| `@lix-js/sdk` | 0.4.10 | `Apache-2.0` | development |
| `@lix-js/server-protocol-schema` | 0.1.1 | `Apache-2.0` | development |
| [`@oozcitak/dom`](http://github.com/oozcitak/dom) | 2.0.2 | `MIT` | development |
| [`@oozcitak/infra`](http://github.com/oozcitak/infra) | 2.0.2 | `MIT` | development |
| [`@oozcitak/url`](http://github.com/oozcitak/url) | 3.0.0 | `MIT` | development |
| [`@oozcitak/util`](http://github.com/oozcitak/util) | 10.0.0 | `MIT` | development |
| [`@petamoriken/float16`](https://github.com/petamoriken/float16) | 3.9.3 | `MIT` | development |
| [`@prettier/plugin-xml`](https://github.com/prettier/plugin-xml#readme) | 2.2.0 | `MIT` | development |
| [`@rollup/plugin-babel`](https://github.com/rollup/plugins/tree/master/packages/babel#readme) | 6.1.0 | `MIT` | development |
| [`@rollup/plugin-node-resolve`](https://github.com/rollup/plugins/tree/master/packages/node-resolve/#readme) | 16.0.3 | `MIT` | development |
| [`@rollup/plugin-replace`](https://github.com/rollup/plugins/tree/master/packages/replace#readme) | 6.0.3 | `MIT` | development |
| [`@rollup/plugin-terser`](https://github.com/rollup/plugins/tree/master/packages/terser#readme) | 1.0.0 | `MIT` | development |
| [`@rollup/pluginutils`](https://github.com/rollup/plugins/tree/master/packages/pluginutils#readme) | 5.4.0 | `MIT` | development |
| [`@shikijs/core`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/engine-javascript`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/engine-oniguruma`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/langs`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/themes`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/transformers`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/types`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`@shikijs/vscode-textmate`](https://github.com/shikijs/vscode-textmate) | 10.0.2 | `MIT` | development |
| [`@sinclair/typebox`](https://github.com/sinclairzx81/typebox) | 0.31.28 | `MIT` | development |
| [`@stablelib/base64`](https://github.com/StableLib/stablelib/tree/master/packages/base64) | 1.0.1 | `MIT` | development |
| [`@sveltejs/load-config`](https://github.com/sveltejs/language-tools) | 0.2.0 | `MIT` | development |
| `@trapezedev/gradle-parse` | 7.1.3 | `MIT` | development |
| [`@trapezedev/project`](https://github.com/ionic-team/capacitor-configure) | 7.1.4 | `MIT` | development |
| [`@trickfilm400/rollup-plugin-off-main-thread`](https://github.com/Trickfilm400/rollup-plugin-off-main-thread) | 3.0.0-pre1 | `Apache-2.0` | development |
| [`@tsconfig/node10`](https://github.com/tsconfig/bases) | 1.0.12 | `MIT` | development |
| [`@tsconfig/node12`](https://github.com/tsconfig/bases) | 1.0.11 | `MIT` | development |
| [`@tsconfig/node14`](https://github.com/tsconfig/bases) | 1.0.3 | `MIT` | development |
| [`@tsconfig/node16`](https://github.com/tsconfig/bases) | 1.0.4 | `MIT` | development |
| [`@types/hast`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/hast) | 3.0.4 | `MIT` | development |
| [`@types/linkify-it`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/linkify-it) | 5.0.0 | `MIT` | development |
| [`@types/markdown-it`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/markdown-it) | 14.1.2 | `MIT` | development |
| [`@types/mdast`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/mdast) | 4.0.4 | `MIT` | development |
| [`@types/mdurl`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/mdurl) | 2.0.0 | `MIT` | development |
| [`@types/minimist`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/minimist) | 1.2.5 | `MIT` | development |
| [`@types/normalize-package-data`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/normalize-package-data) | 2.4.4 | `MIT` | development |
| [`@types/resolve`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/resolve) | 1.20.2 | `MIT` | development |
| [`@types/unist`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/unist) | 3.0.3 | `MIT` | development |
| [`@types/web-bluetooth`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/web-bluetooth) | 0.0.20 | `MIT` | development |
| [`@typescript-eslint/eslint-plugin`](https://typescript-eslint.io/packages/eslint-plugin) | 8.63.0 | `MIT` | development |
| [`@typescript-eslint/parser`](https://typescript-eslint.io/packages/parser) | 8.63.0 | `MIT` | development |
| [`@typescript-eslint/scope-manager`](https://typescript-eslint.io/packages/scope-manager) | 8.63.0 | `MIT` | development |
| [`@typescript-eslint/type-utils`](https://typescript-eslint.io) | 8.63.0 | `MIT` | development |
| [`@typescript-eslint/typescript-estree`](https://typescript-eslint.io/packages/typescript-estree) | 8.63.0 | `MIT` | development |
| [`@typescript-eslint/utils`](https://typescript-eslint.io/packages/utils) | 8.63.0 | `MIT` | development |
| [`@typescript-eslint/visitor-keys`](https://typescript-eslint.io) | 8.63.0 | `MIT` | development |
| [`@ungap/structured-clone`](https://github.com/ungap/structured-clone#readme) | 1.3.2 | `ISC` | development |
| [`@vitejs/plugin-vue`](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue#readme) | 5.2.4 | `MIT` | development |
| [`@vitest/pretty-format`](https://github.com/vitest-dev/vitest/tree/main/packages/pretty-format) | 4.1.10 | `MIT` | development |
| [`@vitest/utils`](https://github.com/vitest-dev/vitest/tree/main/packages/utils) | 4.1.10 | `MIT` | development |
| [`@vue/devtools-api`](https://github.com/vuejs/devtools) | 7.7.10 | `MIT` | development |
| [`@vue/devtools-kit`](https://github.com/vuejs/devtools) | 7.7.10 | `MIT` | development |
| [`@vue/devtools-shared`](https://github.com/vuejs/devtools) | 7.7.10 | `MIT` | development |
| [`@vue/shared`](https://github.com/vuejs/core/tree/main/packages/shared#readme) | 3.5.39 | `MIT` | development |
| [`@vueuse/core`](https://github.com/vueuse/vueuse#readme) | 11.3.0 | `MIT` | development |
| [`@vueuse/integrations`](https://github.com/vueuse/vueuse/tree/main/packages/integrations#readme) | 11.3.0 | `MIT` | development |
| [`@vueuse/metadata`](https://github.com/vueuse/vueuse/tree/main/packages/metadata#readme) | 11.3.0 | `MIT` | development |
| [`@vueuse/shared`](https://github.com/vueuse/vueuse/tree/main/packages/shared#readme) | 11.3.0 | `MIT` | development |
| [`@xml-tools/parser`](https://github.com/sap/xml-tools/) | 1.0.11 | `Apache-2.0` | development |
| [`@xmldom/xmldom`](https://github.com/xmldom/xmldom) | 0.9.10 | `MIT` | development |
| [`abbrev`](https://github.com/npm/abbrev-js) | 4.0.0 | `ISC` | development |
| [`acorn-jsx`](https://github.com/acornjs/acorn-jsx) | 5.3.2 | `MIT` | development |
| [`acorn-walk`](https://github.com/acornjs/acorn) | 8.3.5 | `MIT` | development |
| [`add-stream`](https://github.com/wilsonjackson/add-stream) | 1.0.0 | `MIT` | development |
| [`algoliasearch`](https://github.com/algolia/algoliasearch-client-javascript/tree/main/packages/algoliasearch#readme) | 5.55.1 | `MIT` | development |
| [`ansi-styles`](https://github.com/chalk/ansi-styles) | 4.3.0 | `MIT` | development |
| [`arg`](https://github.com/zeit/arg) | 4.1.3 | `MIT` | development |
| [`argparse`](https://github.com/nodeca/argparse) | 2.0.1 | `Python-2.0` | development |
| [`array-buffer-byte-length`](https://github.com/inspect-js/array-buffer-byte-length#readme) | 1.0.2 | `MIT` | development |
| [`array-ify`](https://github.com/stevemao/array-ify) | 1.0.0 | `MIT` | development |
| [`array-timsort`](https://github.com/kaelzhang/node-array-timsort) | 1.0.3 | `MIT` | development |
| [`arraybuffer.prototype.slice`](https://github.com/es-shims/ArrayBuffer.prototype.slice#readme) | 1.0.4 | `MIT` | development |
| [`arrify`](https://github.com/sindresorhus/arrify) | 1.0.1 | `MIT` | development |
| [`ast-v8-to-istanbul`](https://github.com/AriPerkkio/ast-v8-to-istanbul) | 1.0.4 | `MIT` | development |
| [`async`](https://caolan.github.io/async/) | 3.2.6 | `MIT` | development |
| [`async-function`](https://github.com/ljharb/async-function#readme) | 1.0.0 | `MIT` | development |
| [`asynckit`](https://github.com/alexindigo/asynckit#readme) | 0.4.0 | `MIT` | development |
| [`at-least-node`](https://github.com/RyanZim/at-least-node#readme) | 1.0.0 | `ISC` | development |
| [`available-typed-arrays`](https://github.com/inspect-js/available-typed-arrays#readme) | 1.0.7 | `MIT` | development |
| [`axe-core`](https://www.deque.com/axe/) | 4.12.1 | `MPL-2.0` | development |
| [`b4a`](https://github.com/holepunchto/b4a#readme) | 1.8.1 | `Apache-2.0` | development |
| [`babel-plugin-polyfill-corejs2`](https://github.com/babel/babel-polyfills) | 0.4.17 | `MIT` | development |
| [`babel-plugin-polyfill-corejs3`](https://github.com/babel/babel-polyfills) | 0.14.2 | `MIT` | development |
| [`babel-plugin-polyfill-regenerator`](https://github.com/babel/babel-polyfills) | 0.6.8 | `MIT` | development |
| [`bare-events`](https://github.com/holepunchto/bare-events#readme) | 2.9.1 | `Apache-2.0` | development |
| [`bare-fs`](https://github.com/holepunchto/bare-fs#readme) | 4.7.3 | `Apache-2.0` | development |
| [`bare-path`](https://github.com/holepunchto/bare-path#readme) | 3.1.0 | `Apache-2.0` | development |
| [`bare-stream`](https://github.com/holepunchto/bare-stream#readme) | 2.13.3 | `Apache-2.0` | development |
| [`bare-url`](https://github.com/holepunchto/bare-url) | 2.4.5 | `Apache-2.0` | development |
| [`base64-js`](https://github.com/beatgammit/base64-js) | 1.5.1 | `MIT` | development |
| [`big-integer`](https://github.com/peterolson/BigInteger.js) | 1.6.52 | `Unlicense` | development |
| [`bignumber.js`](https://github.com/MikeMcl/bignumber.js) | 9.3.1 | `MIT` | development |
| [`birpc`](https://github.com/antfu-collective/birpc#readme) | 2.9.0 | `MIT` | development |
| [`boolbase`](https://github.com/fb55/boolbase) | 1.0.0 | `ISC` | development |
| [`bplist-creator`](https://github.com/nearinfinity/node-bplist-creator) | 0.1.0 | `MIT` | development |
| [`bplist-parser`](https://github.com/nearinfinity/node-bplist-parser) | 0.3.2 | `MIT` | development |
| [`call-bind`](https://github.com/ljharb/call-bind#readme) | 1.0.9 | `MIT` | development |
| [`call-bind-apply-helpers`](https://github.com/ljharb/call-bind-apply-helpers#readme) | 1.0.2 | `MIT` | development |
| [`call-bound`](https://github.com/ljharb/call-bound#readme) | 1.0.4 | `MIT` | development |
| [`camelcase`](https://github.com/sindresorhus/camelcase) | 5.3.1 | `MIT` | development |
| [`camelcase-keys`](https://github.com/sindresorhus/camelcase-keys) | 6.2.2 | `MIT` | development |
| [`ccount`](https://github.com/wooorm/ccount) | 2.0.1 | `MIT` | development |
| [`chalk`](https://github.com/chalk/chalk) | 4.1.2 | `MIT` | development |
| [`character-entities-html4`](https://github.com/wooorm/character-entities-html4) | 2.1.0 | `MIT` | development |
| [`character-entities-legacy`](https://github.com/wooorm/character-entities-legacy) | 3.0.0 | `MIT` | development |
| [`chevrotain`](https://sap.github.io/chevrotain/docs/) | 7.1.1 | `Apache-2.0` | development |
| [`chokidar`](https://github.com/paulmillr/chokidar) | 4.0.3 | `MIT` | development |
| [`chownr`](https://github.com/isaacs/chownr) | 3.0.0 | `BlueOak-1.0.0` | development |
| [`cliui`](https://github.com/yargs/cliui) | 8.0.1 | `ISC` | development |
| [`color`](https://github.com/Qix-/color) | 4.2.3 | `MIT` | development |
| [`color-convert`](https://github.com/Qix-/color-convert) | 2.0.1 | `MIT` | development |
| [`color-name`](https://github.com/colorjs/color-name) | 1.1.4 | `MIT` | development |
| [`color-string`](https://github.com/Qix-/color-string) | 1.9.1 | `MIT` | development |
| [`combined-stream`](https://github.com/felixge/node-combined-stream) | 1.0.8 | `MIT` | development |
| [`comma-separated-tokens`](https://github.com/wooorm/comma-separated-tokens) | 2.0.3 | `MIT` | development |
| [`comment-json`](https://github.com/kaelzhang/node-comment-json) | 4.6.2 | `MIT` | development |
| [`common-tags`](https://github.com/zspecza/common-tags) | 1.8.2 | `MIT` | development |
| [`compare-func`](https://github.com/stevemao/compare-func) | 2.0.0 | `MIT` | development |
| [`consola`](https://github.com/unjs/consola) | 3.4.0 | `MIT` | development |
| [`conventional-changelog`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog#readme) | 3.1.25 | `MIT` | development |
| [`conventional-changelog-angular`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular#readme) | 5.0.13 | `ISC` | development |
| [`conventional-changelog-atom`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-atom#readme) | 2.0.8 | `ISC` | development |
| [`conventional-changelog-codemirror`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-codemirror#readme) | 2.0.8 | `ISC` | development |
| [`conventional-changelog-conventionalcommits`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-conventionalcommits#readme) | 4.6.3 | `ISC` | development |
| [`conventional-changelog-core`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-core#readme) | 4.2.4 | `MIT` | development |
| [`conventional-changelog-ember`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-ember#readme) | 2.0.9 | `ISC` | development |
| [`conventional-changelog-eslint`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-eslint#readme) | 3.0.9 | `ISC` | development |
| [`conventional-changelog-express`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-express#readme) | 2.0.6 | `ISC` | development |
| [`conventional-changelog-jquery`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-jquery#readme) | 3.0.11 | `ISC` | development |
| [`conventional-changelog-jshint`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-jshint#readme) | 2.0.9 | `ISC` | development |
| [`conventional-changelog-preset-loader`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-preset-loader#readme) | 2.3.4 | `MIT` | development |
| [`conventional-changelog-writer`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-writer#readme) | 5.0.1 | `MIT` | development |
| [`conventional-commits-filter`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-commits-filter#readme) | 2.0.7 | `MIT` | development |
| [`conventional-commits-parser`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-commits-parser#readme) | 3.2.4 | `MIT` | development |
| [`copy-anything`](https://github.com/mesqueeb/copy-anything#readme) | 4.0.5 | `MIT` | development |
| [`core-js-compat`](https://core-js.io) | 3.49.0 | `MIT` | development |
| [`core-util-is`](https://github.com/isaacs/core-util-is) | 1.0.3 | `MIT` | development |
| [`create-require`](https://github.com/nuxt-contrib/create-require) | 1.1.1 | `MIT` | development |
| [`cross-spawn`](https://github.com/moxystudio/node-cross-spawn) | 7.0.6 | `MIT` | development |
| [`crypto-random-string`](https://github.com/sindresorhus/crypto-random-string) | 2.0.0 | `MIT` | development |
| [`css-select`](https://github.com/fb55/css-select) | 4.3.0 | `BSD-2-Clause` | development |
| [`css-what`](https://github.com/fb55/css-what) | 6.2.2 | `BSD-2-Clause` | development |
| [`cssesc`](https://mths.be/cssesc) | 3.0.0 | `MIT` | development |
| [`cssstyle`](https://github.com/jsdom/cssstyle) | 4.6.0 | `MIT` | development |
| [`dargs`](https://github.com/sindresorhus/dargs) | 7.0.0 | `MIT` | development |
| [`data-uri-to-buffer`](https://github.com/TooTallNate/node-data-uri-to-buffer) | 4.0.1 | `MIT` | development |
| [`data-urls`](https://github.com/jsdom/data-urls) | 5.0.0 | `MIT` | development |
| [`data-view-buffer`](https://github.com/inspect-js/data-view-buffer#readme) | 1.0.2 | `MIT` | development |
| [`data-view-byte-length`](https://github.com/inspect-js/data-view-byte-length#readme) | 1.0.2 | `MIT` | development |
| [`data-view-byte-offset`](https://github.com/inspect-js/data-view-byte-offset#readme) | 1.0.1 | `MIT` | development |
| [`dateformat`](https://github.com/felixge/node-dateformat) | 3.0.3 | `MIT` | development |
| [`decamelize`](https://github.com/sindresorhus/decamelize) | 1.2.0 | `MIT` | development |
| [`decamelize-keys`](https://github.com/sindresorhus/decamelize-keys) | 1.1.1 | `MIT` | development |
| [`decimal.js`](https://github.com/MikeMcl/decimal.js) | 10.6.0 | `MIT` | development |
| [`decompress-response`](https://github.com/sindresorhus/decompress-response) | 6.0.0 | `MIT` | development |
| [`dedent`](https://github.com/dmnd/dedent) | 1.5.1 | `MIT` | development |
| [`define-data-property`](https://github.com/ljharb/define-data-property#readme) | 1.1.4 | `MIT` | development |
| [`define-properties`](https://github.com/ljharb/define-properties) | 1.2.1 | `MIT` | development |
| [`delayed-stream`](https://github.com/felixge/node-delayed-stream) | 1.0.0 | `MIT` | development |
| [`dequal`](https://github.com/lukeed/dequal) | 2.0.3 | `MIT` | development |
| [`detect-libc`](https://github.com/lovell/detect-libc) | 2.1.2 | `Apache-2.0` | development |
| [`devlop`](https://github.com/wooorm/devlop) | 1.1.0 | `MIT` | development |
| [`diff`](https://github.com/kpdecker/jsdiff) | 5.2.2 | `BSD-3-Clause` | development |
| [`dom-serializer`](https://github.com/cheeriojs/dom-renderer) | 1.4.1 | `MIT` | development |
| [`domelementtype`](https://github.com/fb55/domelementtype) | 2.3.0 | `BSD-2-Clause` | development |
| [`domhandler`](https://github.com/fb55/domhandler) | 4.3.1 | `BSD-2-Clause` | development |
| [`domutils`](https://github.com/fb55/domutils) | 2.8.0 | `BSD-2-Clause` | development |
| [`dot-prop`](https://github.com/sindresorhus/dot-prop) | 5.3.0 | `MIT` | development |
| [`dunder-proto`](https://github.com/es-shims/dunder-proto#readme) | 1.0.1 | `MIT` | development |
| [`duplexify`](https://github.com/mafintosh/duplexify) | 4.1.3 | `MIT` | development |
| [`ecdsa-sig-formatter`](https://github.com/Brightspace/node-ecdsa-sig-formatter#readme) | 1.0.11 | `Apache-2.0` | development |
| [`ejs`](https://github.com/mde/ejs) | 3.1.10 | `Apache-2.0` | development |
| [`emoji-regex-xs`](https://github.com/slevithan/emoji-regex-xs) | 1.0.0 | `MIT` | development |
| [`end-of-stream`](https://github.com/mafintosh/end-of-stream) | 1.4.5 | `MIT` | development |
| [`entities`](https://github.com/fb55/entities) | 6.0.1 | `BSD-2-Clause` | development |
| [`env-paths`](https://github.com/sindresorhus/env-paths) | 2.2.1 | `MIT` | development |
| [`error-ex`](https://github.com/qix-/node-error-ex) | 1.3.4 | `MIT` | development |
| [`es-abstract`](https://github.com/ljharb/es-abstract) | 1.24.2 | `MIT` | development |
| [`es-abstract-get`](https://github.com/ljharb/es-abstract-get#readme) | 1.0.0 | `MIT` | development |
| [`es-define-property`](https://github.com/ljharb/es-define-property#readme) | 1.0.1 | `MIT` | development |
| [`es-errors`](https://github.com/ljharb/es-errors#readme) | 1.3.0 | `MIT` | development |
| [`es-object-atoms`](https://github.com/ljharb/es-object-atoms#readme) | 1.1.2 | `MIT` | development |
| [`es-set-tostringtag`](https://github.com/es-shims/es-set-tostringtag#readme) | 2.1.0 | `MIT` | development |
| [`es-to-primitive`](https://github.com/ljharb/es-to-primitive) | 1.3.4 | `MIT` | development |
| [`esbuild`](https://github.com/evanw/esbuild) | 0.28.1 | `MIT` | development |
| [`escape-string-regexp`](https://github.com/sindresorhus/escape-string-regexp) | 4.0.0 | `MIT` | development |
| [`eslint-compat-utils`](https://github.com/ota-meshi/eslint-compat-utils#readme) | 0.5.1 | `MIT` | development |
| [`eslint-scope`](https://github.com/eslint/js/blob/main/packages/eslint-scope/README.md) | 8.4.0 | `BSD-2-Clause` | development |
| [`eslint-visitor-keys`](https://github.com/eslint/js/blob/main/packages/eslint-visitor-keys/README.md) | 4.2.1 | `Apache-2.0` | development |
| [`espree`](https://github.com/eslint/js/blob/main/packages/espree/README.md) | 10.4.0 | `BSD-2-Clause` | development |
| [`esprima`](http://esprima.org) | 4.0.1 | `BSD-2-Clause` | development |
| [`esrecurse`](https://github.com/estools/esrecurse) | 4.3.0 | `BSD-2-Clause` | development |
| [`estraverse`](https://github.com/estools/estraverse) | 5.3.0 | `BSD-2-Clause` | development |
| [`estree-walker`](https://github.com/Rich-Harris/estree-walker) | 3.0.3 | `MIT` | development |
| [`esutils`](https://github.com/estools/esutils) | 2.0.3 | `BSD-2-Clause` | development |
| [`eta`](https://eta.js.org) | 4.6.0 | `MIT` | development |
| [`exponential-backoff`](https://github.com/coveooss/exponential-backoff#readme) | 3.1.3 | `Apache-2.0` | development |
| [`extend`](https://github.com/justmoon/node-extend) | 3.0.2 | `MIT` | development |
| [`extend-shallow`](https://github.com/jonschlinkert/extend-shallow) | 2.0.1 | `MIT` | development |
| [`fast-fifo`](https://github.com/mafintosh/fast-fifo) | 1.3.2 | `MIT` | development |
| [`fast-json-stable-stringify`](https://github.com/epoberezkin/fast-json-stable-stringify) | 2.1.0 | `MIT` | development |
| [`fast-sha256`](https://github.com/dchest/fast-sha256-js) | 1.3.0 | `Unlicense` | development |
| [`fdir`](https://github.com/thecodrr/fdir#readme) | 6.5.0 | `MIT` | development |
| [`fetch-blob`](https://github.com/node-fetch/fetch-blob#readme) | 3.2.0 | `MIT` | development |
| [`filelist`](https://github.com/mde/filelist) | 1.0.6 | `Apache-2.0` | development |
| [`focus-trap`](https://github.com/focus-trap/focus-trap#readme) | 7.8.0 | `MIT` | development |
| [`for-each`](https://github.com/Raynos/for-each) | 0.3.5 | `MIT` | development |
| [`foreground-child`](https://github.com/tapjs/foreground-child) | 3.3.1 | `ISC` | development |
| [`form-data`](https://github.com/form-data/form-data) | 4.0.6 | `MIT` | development |
| [`formdata-polyfill`](https://github.com/jimmywarting/FormData#readme) | 4.0.10 | `MIT` | development |
| [`fs-extra`](https://github.com/jprichardson/node-fs-extra) | 11.3.6 | `MIT` | development |
| [`fs-minipass`](https://github.com/npm/fs-minipass#readme) | 2.1.0 | `ISC` | development |
| [`fs.realpath`](https://github.com/isaacs/fs.realpath) | 1.0.0 | `ISC` | development |
| [`fsevents`](https://github.com/fsevents/fsevents) | 2.3.2 | `MIT` | development |
| [`function-bind`](https://github.com/Raynos/function-bind) | 1.1.2 | `MIT` | development |
| [`function.prototype.name`](https://github.com/es-shims/Function.prototype.name) | 1.2.0 | `MIT` | development |
| [`functions-have-names`](https://github.com/inspect-js/functions-have-names#readme) | 1.2.3 | `MIT` | development |
| [`gaxios`](https://github.com/googleapis/google-cloud-node/tree/main/core/packages/gaxios) | 7.1.6 | `Apache-2.0` | development |
| [`gcp-metadata`](https://github.com/googleapis/google-cloud-node-core/tree/main/packages/gcp-metadata) | 8.1.3 | `Apache-2.0` | development |
| [`generator-function`](https://github.com/TimothyGu/generator-function#readme) | 2.0.1 | `MIT` | development |
| [`get-caller-file`](https://github.com/stefanpenner/get-caller-file#readme) | 2.0.5 | `ISC` | development |
| [`get-intrinsic`](https://github.com/ljharb/get-intrinsic#readme) | 1.3.0 | `MIT` | development |
| [`get-own-enumerable-property-symbols`](https://github.com/mightyiam/get-own-enumerable-property-symbols#readme) | 3.0.2 | `ISC` | development |
| [`get-pkg-repo`](https://github.com/conventional-changelog/get-pkg-repo#readme) | 4.2.1 | `MIT` | development |
| [`get-proto`](https://github.com/ljharb/get-proto#readme) | 1.0.1 | `MIT` | development |
| [`get-symbol-description`](https://github.com/inspect-js/get-symbol-description#readme) | 1.1.0 | `MIT` | development |
| [`git-raw-commits`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/git-raw-commits#readme) | 2.0.11 | `MIT` | development |
| [`git-remote-origin-url`](https://github.com/sindresorhus/git-remote-origin-url) | 2.0.0 | `MIT` | development |
| [`git-semver-tags`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/git-semver-tags#readme) | 4.1.1 | `MIT` | development |
| [`gitconfiglocal`](https://github.com/soldair/node-gitconfiglocal) | 1.0.0 | `BSD` | development |
| [`globalthis`](https://github.com/ljharb/System.global) | 1.0.4 | `MIT` | development |
| [`google-auth-library`](https://github.com/googleapis/google-auth-library-nodejs) | 10.5.0 | `Apache-2.0` | development |
| [`google-gax`](https://github.com/googleapis/google-cloud-node-core/tree/main/packages/gax) | 5.0.7 | `Apache-2.0` | development |
| [`google-logging-utils`](https://github.com/googleapis/google-cloud-node-core/tree/main/dev-packages/logging-utils) | 1.1.3 | `Apache-2.0` | development |
| [`gopd`](https://github.com/ljharb/gopd#readme) | 1.2.0 | `MIT` | development |
| [`graceful-fs`](https://github.com/isaacs/node-graceful-fs) | 4.2.11 | `ISC` | development |
| [`gradle-to-js`](https://github.com/ninetwozero/gradle-to-js#readme) | 2.0.1 | `Apache-2.0` | development |
| [`gray-matter`](https://github.com/jonschlinkert/gray-matter) | 4.0.3 | `MIT` | development |
| [`gtoken`](https://github.com/google/node-gtoken) | 8.0.0 | `MIT` | development |
| [`handlebars`](https://handlebarsjs.com/) | 4.7.9 | `MIT` | development |
| [`hard-rejection`](https://github.com/sindresorhus/hard-rejection) | 2.1.0 | `MIT` | development |
| [`has-bigints`](https://github.com/ljharb/has-bigints#readme) | 1.1.0 | `MIT` | development |
| [`has-flag`](https://github.com/sindresorhus/has-flag) | 4.0.0 | `MIT` | development |
| [`has-property-descriptors`](https://github.com/inspect-js/has-property-descriptors#readme) | 1.0.2 | `MIT` | development |
| [`has-proto`](https://github.com/inspect-js/has-proto#readme) | 1.2.0 | `MIT` | development |
| [`has-symbols`](https://github.com/ljharb/has-symbols#readme) | 1.1.0 | `MIT` | development |
| [`has-tostringtag`](https://github.com/inspect-js/has-tostringtag#readme) | 1.0.2 | `MIT` | development |
| [`hasown`](https://github.com/inspect-js/hasOwn#readme) | 2.0.4 | `MIT` | development |
| [`hast-util-to-html`](https://github.com/syntax-tree/hast-util-to-html) | 9.0.5 | `MIT` | development |
| [`hast-util-whitespace`](https://github.com/syntax-tree/hast-util-whitespace) | 3.0.0 | `MIT` | development |
| [`he`](https://mths.be/he) | 1.2.0 | `MIT` | development |
| [`hookable`](https://github.com/unjs/hookable) | 5.5.3 | `MIT` | development |
| [`hosted-git-info`](https://github.com/npm/hosted-git-info) | 4.1.0 | `ISC` | development |
| [`html-encoding-sniffer`](https://github.com/jsdom/html-encoding-sniffer) | 4.0.0 | `MIT` | development |
| [`html-escaper`](https://github.com/WebReflection/html-escaper) | 2.0.2 | `MIT` | development |
| [`html-void-elements`](https://github.com/wooorm/html-void-elements) | 3.0.0 | `MIT` | development |
| [`http-proxy-agent`](https://github.com/TooTallNate/proxy-agents) | 7.0.2 | `MIT` | development |
| [`human-id`](https://github.com/RienNeVaPlus/human-id#readme) | 4.2.0 | `MIT` | development |
| [`idb`](https://github.com/jakearchibald/idb) | 7.1.1 | `ISC` | development |
| [`ignore`](https://github.com/kaelzhang/node-ignore) | 5.3.2 | `MIT` | development |
| [`indent-string`](https://github.com/sindresorhus/indent-string) | 4.0.0 | `MIT` | development |
| [`inflight`](https://github.com/isaacs/inflight) | 1.0.6 | `ISC` | development |
| [`inherits`](https://github.com/isaacs/inherits) | 2.0.4 | `ISC` | development |
| [`ini`](https://github.com/npm/ini) | 4.1.3 | `ISC` | development |
| [`internal-slot`](https://github.com/ljharb/internal-slot#readme) | 1.1.0 | `MIT` | development |
| [`is-array-buffer`](https://github.com/inspect-js/is-array-buffer#readme) | 3.0.5 | `MIT` | development |
| [`is-arrayish`](https://github.com/qix-/node-is-arrayish) | 0.2.1 | `MIT` | development |
| [`is-async-function`](https://github.com/inspect-js/is-async-function) | 2.1.1 | `MIT` | development |
| [`is-callable`](https://github.com/inspect-js/is-callable) | 1.2.7 | `MIT` | development |
| [`is-data-view`](https://github.com/inspect-js/is-data-view#readme) | 1.0.2 | `MIT` | development |
| [`is-date-object`](https://github.com/inspect-js/is-date-object) | 1.1.0 | `MIT` | development |
| [`is-document.all`](https://github.com/inspect-js/is-document.all#readme) | 1.0.0 | `MIT` | development |
| [`is-extendable`](https://github.com/jonschlinkert/is-extendable) | 0.1.1 | `MIT` | development |
| [`is-finalizationregistry`](https://github.com/inspect-js/is-finalizationregistry#readme) | 1.1.1 | `MIT` | development |
| [`is-generator-function`](https://github.com/inspect-js/is-generator-function) | 1.1.2 | `MIT` | development |
| [`is-map`](https://github.com/inspect-js/is-map#readme) | 2.0.3 | `MIT` | development |
| [`is-module`](https://github.com/component/is-module) | 1.0.0 | `MIT` | development |
| [`is-negative-zero`](https://github.com/inspect-js/is-negative-zero) | 2.0.3 | `MIT` | development |
| [`is-obj`](https://github.com/sindresorhus/is-obj) | 1.0.1 | `MIT` | development |
| [`is-plain-obj`](https://github.com/sindresorhus/is-plain-obj) | 1.1.0 | `MIT` | development |
| [`is-potential-custom-element-name`](https://github.com/mathiasbynens/is-potential-custom-element-name) | 1.0.1 | `MIT` | development |
| [`is-regex`](https://github.com/inspect-js/is-regex) | 1.2.1 | `MIT` | development |
| [`is-regexp`](https://github.com/sindresorhus/is-regexp) | 1.0.0 | `MIT` | development |
| [`is-set`](https://github.com/inspect-js/is-set#readme) | 2.0.3 | `MIT` | development |
| [`is-shared-array-buffer`](https://github.com/inspect-js/is-shared-array-buffer#readme) | 1.0.4 | `MIT` | development |
| [`is-stream`](https://github.com/sindresorhus/is-stream) | 2.0.1 | `MIT` | development |
| [`is-string`](https://github.com/inspect-js/is-string) | 1.1.1 | `MIT` | development |
| [`is-symbol`](https://github.com/inspect-js/is-symbol) | 1.1.1 | `MIT` | development |
| [`is-text-path`](https://github.com/sindresorhus/is-text-path) | 1.0.1 | `MIT` | development |
| [`is-typed-array`](https://github.com/inspect-js/is-typed-array) | 1.1.15 | `MIT` | development |
| [`is-weakmap`](https://github.com/inspect-js/is-weakmap#readme) | 2.0.2 | `MIT` | development |
| [`is-weakref`](https://github.com/inspect-js/is-weakref#readme) | 1.1.1 | `MIT` | development |
| [`is-weakset`](https://github.com/inspect-js/is-weakset#readme) | 2.0.4 | `MIT` | development |
| [`is-what`](https://github.com/mesqueeb/is-what#readme) | 5.5.0 | `MIT` | development |
| [`isarray`](https://github.com/juliangruber/isarray) | 2.0.5 | `MIT` | development |
| [`istanbul-lib-coverage`](https://istanbul.js.org/) | 3.2.2 | `BSD-3-Clause` | development |
| [`istanbul-lib-report`](https://istanbul.js.org/) | 3.0.1 | `BSD-3-Clause` | development |
| [`istanbul-reports`](https://istanbul.js.org/) | 3.2.0 | `BSD-3-Clause` | development |
| [`jackspeak`](https://github.com/isaacs/jackspeak) | 3.4.3 | `BlueOak-1.0.0` | development |
| [`jake`](https://github.com/jakejs/jake) | 10.9.4 | `Apache-2.0` | development |
| [`js-sha256`](https://github.com/emn178/js-sha256) | 0.11.1 | `MIT` | development |
| [`js-yaml`](https://github.com/nodeca/js-yaml) | 4.3.0 | `MIT` | development |
| [`json-bigint`](https://github.com/sidorares/json-bigint) | 1.0.0 | `MIT` | development |
| [`json-parse-even-better-errors`](https://github.com/npm/json-parse-even-better-errors) | 2.3.1 | `MIT` | development |
| [`json-schema-to-ts`](https://github.com/ThomasAribart/json-schema-to-ts#readme) | 3.1.1 | `MIT` | development |
| [`json-stringify-safe`](https://github.com/isaacs/json-stringify-safe) | 5.0.1 | `ISC` | development |
| [`jsonfile`](https://github.com/jprichardson/node-jsonfile) | 6.2.1 | `MIT` | development |
| [`jsonparse`](http://github.com/creationix/jsonparse) | 1.3.1 | `MIT` | development |
| [`jsonpointer`](https://github.com/janl/node-jsonpointer) | 5.0.1 | `MIT` | development |
| [`JSONStream`](http://github.com/dominictarr/JSONStream) | 1.3.5 | `MIT` | development |
| [`jws`](https://github.com/brianloveswords/node-jws) | 4.0.1 | `MIT` | development |
| [`kind-of`](https://github.com/jonschlinkert/kind-of) | 6.0.3 | `MIT` | development |
| [`known-css-properties`](https://github.com/known-css/known-css-properties#readme) | 0.35.0 | `MIT` | development |
| [`kolorist`](https://github.com/marvinhagemeister/kolorist) | 1.8.0 | `MIT` | development |
| [`kysely`](https://kysely.dev) | 0.28.17 | `MIT` | development |
| [`leven`](https://github.com/sindresorhus/leven) | 3.1.0 | `MIT` | development |
| [`lilconfig`](https://github.com/antonk52/lilconfig) | 2.1.0 | `MIT` | development |
| [`lines-and-columns`](https://github.com/eventualbuddha/lines-and-columns#readme) | 1.2.4 | `MIT` | development |
| [`lodash`](https://lodash.com/) | 4.18.1 | `MIT` | development |
| [`lodash.debounce`](https://lodash.com/) | 4.0.8 | `MIT` | development |
| [`lodash.ismatch`](https://lodash.com/) | 4.4.0 | `MIT` | development |
| [`lodash.merge`](https://lodash.com/) | 4.6.2 | `MIT` | development |
| [`lodash.sortby`](https://lodash.com/) | 4.7.0 | `MIT` | development |
| [`magicast`](https://github.com/unjs/magicast) | 0.5.3 | `MIT` | development |
| [`make-dir`](https://github.com/sindresorhus/make-dir) | 4.0.0 | `MIT` | development |
| [`make-error`](https://github.com/JsCommunity/make-error) | 1.3.6 | `ISC` | development |
| [`map-obj`](https://github.com/sindresorhus/map-obj) | 4.3.0 | `MIT` | development |
| [`mark.js`](https://markjs.io/) | 8.11.1 | `MIT` | development |
| [`math-intrinsics`](https://github.com/es-shims/math-intrinsics#readme) | 1.1.0 | `MIT` | development |
| [`mdast-util-to-hast`](https://github.com/syntax-tree/mdast-util-to-hast) | 13.2.1 | `MIT` | development |
| [`meow`](https://github.com/sindresorhus/meow) | 8.1.2 | `MIT` | development |
| [`micromark-util-character`](https://github.com/micromark/micromark/tree/main/packages/micromark-util-character) | 2.1.1 | `MIT` | development |
| [`micromark-util-encode`](https://github.com/micromark/micromark/tree/main/packages/micromark-util-encode) | 2.0.1 | `MIT` | development |
| [`micromark-util-sanitize-uri`](https://github.com/micromark/micromark/tree/main/packages/micromark-util-sanitize-uri) | 2.0.1 | `MIT` | development |
| [`micromark-util-symbol`](https://github.com/micromark/micromark/tree/main/packages/micromark-util-symbol) | 2.0.1 | `MIT` | development |
| [`micromark-util-types`](https://github.com/micromark/micromark/tree/main/packages/micromark-util-types) | 2.0.2 | `MIT` | development |
| [`mime-db`](https://github.com/jshttp/mime-db) | 1.52.0 | `MIT` | development |
| [`mime-types`](https://github.com/jshttp/mime-types) | 2.1.35 | `MIT` | development |
| [`mimic-response`](https://github.com/sindresorhus/mimic-response) | 3.1.0 | `MIT` | development |
| [`min-indent`](https://github.com/thejameskyle/min-indent) | 1.0.1 | `MIT` | development |
| [`minimist-options`](https://github.com/vadimdemedes/minimist-options) | 4.1.0 | `MIT` | development |
| [`minisearch`](https://lucaong.github.io/minisearch/) | 7.2.0 | `MIT` | development |
| [`minizlib`](https://github.com/isaacs/minizlib) | 3.1.0 | `MIT` | development |
| [`mitt`](https://github.com/developit/mitt) | 3.0.1 | `MIT` | development |
| [`mkdirp`](https://github.com/isaacs/node-mkdirp) | 1.0.4 | `MIT` | development |
| [`modify-values`](https://github.com/sindresorhus/modify-values) | 1.0.1 | `MIT` | development |
| [`mri`](https://github.com/lukeed/mri) | 1.2.0 | `MIT` | development |
| [`nan`](https://github.com/nodejs/nan) | 2.28.0 | `MIT` | development |
| [`native-run`](https://github.com/ionic-team/native-run#readme) | 2.0.3 | `MIT` | development |
| [`natural-compare`](https://github.com/litejs/natural-compare-lite) | 1.4.0 | `MIT` | development |
| [`neo-async`](https://github.com/suguru03/neo-async) | 2.6.2 | `MIT` | development |
| [`node-addon-api`](https://github.com/nodejs/node-addon-api) | 7.1.1 | `MIT` | development |
| [`node-gyp`](https://github.com/nodejs/node-gyp) | 12.4.0 | `MIT` | development |
| [`node-html-parser`](https://github.com/taoqf/node-fast-html-parser) | 5.4.2 | `MIT` | development |
| [`nopt`](https://github.com/npm/nopt) | 9.0.0 | `ISC` | development |
| [`normalize-package-data`](https://github.com/npm/normalize-package-data) | 3.0.3 | `BSD-2-Clause` | development |
| [`nth-check`](https://github.com/fb55/nth-check) | 2.1.1 | `BSD-2-Clause` | development |
| [`nwsapi`](https://javascript.nwbox.com/nwsapi/) | 2.2.24 | `MIT` | development |
| [`object-hash`](https://github.com/puleos/object-hash) | 3.0.0 | `MIT` | development |
| [`object-inspect`](https://github.com/inspect-js/object-inspect) | 1.13.4 | `MIT` | development |
| [`object-keys`](https://github.com/ljharb/object-keys) | 1.1.1 | `MIT` | development |
| [`object.assign`](https://github.com/ljharb/object.assign) | 4.1.7 | `MIT` | development |
| [`obug`](https://github.com/sxzz/obug#readme) | 2.1.3 | `MIT` | development |
| [`once`](https://github.com/isaacs/once) | 1.4.0 | `ISC` | development |
| [`oniguruma-to-es`](https://github.com/slevithan/oniguruma-to-es) | 2.3.0 | `MIT` | development |
| [`open`](https://github.com/sindresorhus/open) | 8.4.2 | `MIT` | development |
| [`own-keys`](https://github.com/ljharb/own-keys#readme) | 1.0.1 | `MIT` | development |
| [`p-try`](https://github.com/sindresorhus/p-try) | 2.2.0 | `MIT` | development |
| [`package-json-from-dist`](https://github.com/isaacs/package-json-from-dist) | 1.0.1 | `BlueOak-1.0.0` | development |
| [`parse-json`](https://github.com/sindresorhus/parse-json) | 4.0.0 | `MIT` | development |
| [`parse5`](https://parse5.js.org) | 7.3.0 | `MIT` | development |
| [`path-is-absolute`](https://github.com/sindresorhus/path-is-absolute) | 1.0.1 | `MIT` | development |
| [`perfect-debounce`](https://github.com/unjs/perfect-debounce) | 1.0.0 | `MIT` | development |
| [`picomatch`](https://github.com/micromatch/picomatch) | 4.0.5 | `MIT` | development |
| [`pify`](https://github.com/sindresorhus/pify) | 2.3.0 | `MIT` | development |
| [`playwright`](https://playwright.dev) | 1.60.0 | `Apache-2.0` | development |
| [`playwright-core`](https://playwright.dev) | 1.61.1 | `Apache-2.0` | development |
| [`plist`](https://github.com/TooTallNate/node-plist) | 3.1.1 | `MIT` | development |
| [`possible-typed-array-names`](https://github.com/ljharb/possible-typed-array-names#readme) | 1.1.0 | `MIT` | development |
| [`postcss`](https://postcss.org/) | 8.5.16 | `MIT` | development |
| [`postcss-load-config`](https://github.com/postcss/postcss-load-config) | 3.1.4 | `MIT` | development |
| [`postcss-safe-parser`](https://github.com/postcss/postcss-safe-parser) | 6.0.0 | `MIT` | development |
| [`postcss-scss`](https://github.com/postcss/postcss-scss) | 4.0.9 | `MIT` | development |
| [`postcss-selector-parser`](https://github.com/postcss/postcss-selector-parser) | 6.1.4 | `MIT` | development |
| [`preact`](https://preactjs.com) | 10.29.5 | `MIT` | development |
| [`prebuild-install`](https://github.com/prebuild/prebuild-install) | 7.1.3 | `MIT` | development |
| [`pretty-bytes`](https://github.com/sindresorhus/pretty-bytes) | 6.1.1 | `MIT` | development |
| [`proc-log`](https://github.com/npm/proc-log) | 6.1.0 | `ISC` | development |
| [`process-nextick-args`](https://github.com/calvinmetcalf/process-nextick-args) | 2.0.1 | `MIT` | development |
| [`prompts`](https://github.com/terkelg/prompts) | 2.4.2 | `MIT` | development |
| [`property-information`](https://github.com/wooorm/property-information) | 7.2.0 | `MIT` | development |
| [`proto3-json-serializer`](https://github.com/googleapis/google-cloud-node-core) | 3.0.4 | `Apache-2.0` | development |
| [`protobufjs`](https://protobufjs.github.io/protobuf.js/) | 7.6.5 | `BSD-3-Clause` | development |
| [`pump`](https://github.com/mafintosh/pump) | 3.0.4 | `MIT` | development |
| [`punycode`](https://mths.be/punycode) | 2.3.1 | `MIT` | development |
| [`q`](https://github.com/kriskowal/q) | 1.5.1 | `MIT` | development |
| [`quick-lru`](https://github.com/sindresorhus/quick-lru) | 4.0.1 | `MIT` | development |
| [`read-pkg`](https://github.com/sindresorhus/read-pkg) | 3.0.0 | `MIT` | development |
| [`read-pkg-up`](https://github.com/sindresorhus/read-pkg-up) | 3.0.0 | `MIT` | development |
| [`readable-stream`](https://github.com/nodejs/readable-stream) | 3.6.2 | `MIT` | development |
| [`readdirp`](https://github.com/paulmillr/readdirp) | 4.1.2 | `MIT` | development |
| [`redent`](https://github.com/sindresorhus/redent) | 3.0.0 | `MIT` | development |
| [`reflect.getprototypeof`](https://github.com/es-shims/Reflect.getPrototypeOf) | 1.0.10 | `MIT` | development |
| [`regenerate`](https://mths.be/regenerate) | 1.4.2 | `MIT` | development |
| [`regenerate-unicode-properties`](https://github.com/mathiasbynens/regenerate-unicode-properties) | 10.2.2 | `MIT` | development |
| [`regex`](https://github.com/slevithan/regex) | 5.1.1 | `MIT` | development |
| [`regex-recursion`](https://github.com/slevithan/regex-recursion) | 5.1.1 | `MIT` | development |
| [`regex-utilities`](https://github.com/slevithan/regex-utilities) | 2.3.0 | `MIT` | development |
| [`regexp-to-ast`](https://github.com/bd82/regexp-to-ast) | 0.5.0 | `MIT` | development |
| [`regexp.prototype.flags`](https://github.com/es-shims/RegExp.prototype.flags) | 1.5.4 | `MIT` | development |
| [`regexpu-core`](https://mths.be/regexpu) | 6.4.0 | `MIT` | development |
| [`regjsgen`](https://github.com/bnjmnt4n/regjsgen) | 0.8.0 | `MIT` | development |
| [`regjsparser`](https://github.com/jviereck/regjsparser) | 0.13.2 | `BSD-2-Clause` | development |
| [`replace`](https://github.com/ALMaclaine/replace) | 1.2.2 | `MIT` | development |
| [`require-directory`](https://github.com/troygoode/node-require-directory/) | 2.1.1 | `MIT` | development |
| [`require-main-filename`](https://github.com/yargs/require-main-filename#readme) | 2.0.0 | `ISC` | development |
| [`resolve`](ssh://github.com/browserify/resolve) | 1.22.12 | `MIT` | development |
| [`retry-request`](https://github.com/googleapis/google-cloud-node-core/tree/main/packages/retry-request) | 8.0.3 | `MIT` | development |
| [`rfdc`](https://github.com/davidmarkclements/rfdc#readme) | 1.4.1 | `MIT` | development |
| [`rimraf`](https://github.com/isaacs/rimraf) | 6.1.3 | `BlueOak-1.0.0` | development |
| [`rrweb-cssom`](https://github.com/rrweb-io/CSSOM) | 0.8.0 | `MIT` | development |
| [`sade`](https://github.com/lukeed/sade) | 1.8.1 | `MIT` | development |
| [`safe-array-concat`](https://github.com/ljharb/safe-array-concat#readme) | 1.1.4 | `MIT` | development |
| [`safe-buffer`](https://github.com/feross/safe-buffer) | 5.2.1 | `MIT` | development |
| [`safe-push-apply`](https://github.com/ljharb/safe-push-apply#readme) | 1.0.0 | `MIT` | development |
| [`safe-regex-test`](https://github.com/ljharb/safe-regex-test#readme) | 1.1.0 | `MIT` | development |
| [`sax`](https://github.com/isaacs/sax-js) | 1.1.4 | `ISC` | development |
| [`saxes`](https://github.com/lddubeau/saxes) | 6.0.0 | `ISC` | development |
| [`search-insights`](https://github.com/algolia/search-insights.js) | 2.17.3 | `MIT` | development |
| [`section-matter`](https://github.com/jonschlinkert/section-matter) | 1.0.0 | `MIT` | development |
| [`serialize-javascript`](https://github.com/yahoo/serialize-javascript) | 7.0.7 | `BSD-3-Clause` | development |
| [`set-blocking`](https://github.com/yargs/set-blocking#readme) | 2.0.0 | `ISC` | development |
| [`set-function-length`](https://github.com/ljharb/set-function-length#readme) | 1.2.2 | `MIT` | development |
| [`set-function-name`](https://github.com/ljharb/set-function-name#readme) | 2.0.2 | `MIT` | development |
| [`set-proto`](https://github.com/ljharb/set-proto#readme) | 1.0.0 | `MIT` | development |
| [`shiki`](https://github.com/shikijs/shiki#readme) | 1.29.2 | `MIT` | development |
| [`side-channel`](https://github.com/ljharb/side-channel#readme) | 1.1.1 | `MIT` | development |
| [`side-channel-list`](https://github.com/ljharb/side-channel-list#readme) | 1.0.1 | `MIT` | development |
| [`side-channel-map`](https://github.com/ljharb/side-channel-map#readme) | 1.0.1 | `MIT` | development |
| [`side-channel-weakmap`](https://github.com/ljharb/side-channel-weakmap#readme) | 1.0.2 | `MIT` | development |
| [`signal-exit`](https://github.com/tapjs/signal-exit) | 3.0.7 | `ISC` | development |
| [`simple-concat`](https://github.com/feross/simple-concat) | 1.0.1 | `MIT` | development |
| [`simple-get`](https://github.com/feross/simple-get) | 4.0.1 | `MIT` | development |
| [`simple-plist`](https://github.com/wollardj/simple-plist.git) | 1.3.1 | `MIT` | development |
| [`simple-swizzle`](https://github.com/qix-/node-simple-swizzle) | 0.2.4 | `MIT` | development |
| [`smob`](https://github.com/Tada5hi/smob#readme) | 1.6.2 | `MIT` | development |
| [`source-map`](https://github.com/mozilla/source-map) | 0.6.1 | `BSD-3-Clause` | development |
| [`source-map-js`](https://github.com/7rulnik/source-map-js) | 1.2.1 | `BSD-3-Clause` | development |
| [`space-separated-tokens`](https://github.com/wooorm/space-separated-tokens) | 2.0.2 | `MIT` | development |
| [`speakingurl`](http://pid.github.io/speakingurl/) | 14.0.1 | `BSD-3-Clause` | development |
| [`split`](http://github.com/dominictarr/split) | 1.0.1 | `MIT` | development |
| [`split2`](https://github.com/mcollina/split2) | 4.2.0 | `ISC` | development |
| [`sprintf-js`](https://github.com/alexei/sprintf.js) | 1.0.3 | `BSD-3-Clause` | development |
| `sqlite-wasm-kysely` | 0.3.0 | `MIT` | development |
| [`standardwebhooks`](https://github.com/standard-webhooks/standard-webhooks/tree/main/libraries/javascript) | 1.0.0 | `MIT` | development |
| [`std-env`](https://github.com/unjs/std-env) | 4.1.0 | `MIT` | development |
| [`stop-iteration-iterator`](https://github.com/ljharb/stop-iteration-iterator#readme) | 1.1.0 | `MIT` | development |
| [`stream-buffers`](https://github.com/samcday/node-stream-buffer) | 2.2.0 | `Unlicense` | development |
| [`stream-events`](https://github.com/stephenplusplus/stream-events) | 1.0.5 | `MIT` | development |
| [`stream-shift`](https://github.com/mafintosh/stream-shift) | 1.0.3 | `MIT` | development |
| [`streamx`](https://github.com/mafintosh/streamx) | 2.28.0 | `MIT` | development |
| [`string_decoder`](https://github.com/nodejs/string_decoder) | 1.3.0 | `MIT` | development |
| [`string-width`](https://github.com/sindresorhus/string-width) | 4.2.3 | `MIT` | development |
| [`string.prototype.matchall`](https://github.com/es-shims/String.prototype.matchAll#readme) | 4.0.12 | `MIT` | development |
| [`string.prototype.trim`](https://github.com/es-shims/String.prototype.trim) | 1.2.11 | `MIT` | development |
| [`string.prototype.trimend`](https://github.com/es-shims/String.prototype.trimEnd) | 1.0.10 | `MIT` | development |
| [`string.prototype.trimstart`](https://github.com/es-shims/String.prototype.trimStart) | 1.0.8 | `MIT` | development |
| [`stringify-entities`](https://github.com/wooorm/stringify-entities) | 4.0.4 | `MIT` | development |
| [`stringify-object`](https://github.com/yeoman/stringify-object) | 3.3.0 | `BSD-2-Clause` | development |
| [`strip-ansi`](https://github.com/chalk/strip-ansi) | 6.0.1 | `MIT` | development |
| [`strip-bom-string`](https://github.com/jonschlinkert/strip-bom-string) | 1.0.0 | `MIT` | development |
| [`strip-comments`](https://github.com/jonschlinkert/strip-comments) | 2.0.1 | `MIT` | development |
| [`strip-indent`](https://github.com/sindresorhus/strip-indent) | 3.0.0 | `MIT` | development |
| [`stubs`](https://github.com/stephenplusplus/stubs) | 3.0.0 | `MIT` | development |
| [`superjson`](https://github.com/blitz-js/superjson) | 2.2.6 | `MIT` | development |
| [`supports-color`](https://github.com/chalk/supports-color) | 7.2.0 | `MIT` | development |
| [`svelte-eslint-parser`](https://github.com/sveltejs/svelte-eslint-parser#readme) | 0.43.0 | `MIT` | development |
| [`symbol-tree`](https://github.com/jsdom/js-symbol-tree#symbol-tree) | 3.2.4 | `MIT` | development |
| [`tar`](https://github.com/isaacs/node-tar) | 7.5.19 | `BlueOak-1.0.0` | development |
| [`tar-fs`](https://github.com/mafintosh/tar-fs) | 2.1.5 | `MIT` | development |
| [`tar-mini`](https://github.com/nonzzz/tar#readme) | 0.2.0 | `MIT` | development |
| [`tar-stream`](https://github.com/mafintosh/tar-stream) | 2.2.0 | `MIT` | development |
| [`teeny-request`](https://github.com/googleapis/google-cloud-node-core/tree/main/packages/teeny-request) | 10.1.3 | `Apache-2.0` | development |
| [`teex`](https://github.com/mafintosh/teex) | 1.0.1 | `MIT` | development |
| [`temp-dir`](https://github.com/sindresorhus/temp-dir) | 2.0.0 | `MIT` | development |
| [`tempy`](https://github.com/sindresorhus/tempy) | 0.6.0 | `MIT` | development |
| [`terser`](https://terser.org) | 5.48.0 | `BSD-2-Clause` | development |
| [`text-extensions`](https://github.com/sindresorhus/text-extensions) | 1.9.0 | `MIT` | development |
| [`through`](https://github.com/dominictarr/through) | 2.3.8 | `MIT` | development |
| [`through2`](https://github.com/rvagg/through2) | 4.0.2 | `MIT` | development |
| [`tinyglobby`](https://superchupu.dev/tinyglobby) | 0.2.17 | `MIT` | development |
| [`tinyrainbow`](https://github.com/tinylibs/tinyrainbow#readme) | 3.1.0 | `MIT` | development |
| [`tldts`](https://github.com/remusao/tldts#readme) | 6.1.86 | `MIT` | development |
| [`tldts-core`](https://github.com/remusao/tldts#readme) | 6.1.86 | `MIT` | development |
| [`tmp`](http://github.com/raszi/node-tmp) | 0.2.7 | `MIT` | development |
| [`tough-cookie`](https://github.com/salesforce/tough-cookie) | 5.1.2 | `BSD-3-Clause` | development |
| [`tree-kill`](https://github.com/pkrumins/node-tree-kill) | 1.2.2 | `MIT` | development |
| [`trim-lines`](https://github.com/wooorm/trim-lines) | 3.0.1 | `MIT` | development |
| [`trim-newlines`](https://github.com/sindresorhus/trim-newlines) | 3.0.1 | `MIT` | development |
| [`ts-algebra`](https://github.com/ThomasAribart/ts-algebra#readme) | 2.0.0 | `MIT` | development |
| [`ts-api-utils`](https://github.com/JoshuaKGoldberg/ts-api-utils) | 2.5.0 | `MIT` | development |
| [`ts-node`](https://typestrong.org/ts-node) | 10.9.2 | `MIT` | development |
| [`tunnel-agent`](https://github.com/mikeal/tunnel-agent) | 0.6.0 | `Apache-2.0` | development |
| [`type-fest`](https://github.com/sindresorhus/type-fest) | 0.16.0 | `MIT` | development |
| [`typed-array-buffer`](https://github.com/inspect-js/typed-array-buffer#readme) | 1.0.3 | `MIT` | development |
| [`typed-array-byte-length`](https://github.com/inspect-js/typed-array-byte-length#readme) | 1.0.3 | `MIT` | development |
| [`typed-array-byte-offset`](https://github.com/inspect-js/typed-array-byte-offset#readme) | 1.0.4 | `MIT` | development |
| [`typed-array-length`](https://github.com/inspect-js/typed-array-length#readme) | 1.0.8 | `MIT` | development |
| [`uglify-js`](https://github.com/mishoo/UglifyJS) | 3.19.3 | `BSD-2-Clause` | development |
| [`unbox-primitive`](https://github.com/ljharb/unbox-primitive#readme) | 1.1.0 | `MIT` | development |
| [`undici`](https://undici.nodejs.org) | 6.27.0 | `MIT` | development |
| [`unicode-canonical-property-names-ecmascript`](https://github.com/mathiasbynens/unicode-canonical-property-names-ecmascript) | 2.0.1 | `MIT` | development |
| [`unicode-match-property-ecmascript`](https://github.com/mathiasbynens/unicode-match-property-ecmascript) | 2.0.0 | `MIT` | development |
| [`unicode-match-property-value-ecmascript`](https://github.com/mathiasbynens/unicode-match-property-value-ecmascript) | 2.2.1 | `MIT` | development |
| [`unicode-property-aliases-ecmascript`](https://github.com/mathiasbynens/unicode-property-aliases-ecmascript) | 2.2.0 | `MIT` | development |
| [`unique-string`](https://github.com/sindresorhus/unique-string) | 2.0.0 | `MIT` | development |
| [`unist-util-is`](https://github.com/syntax-tree/unist-util-is) | 6.0.1 | `MIT` | development |
| [`unist-util-position`](https://github.com/syntax-tree/unist-util-position) | 5.0.0 | `MIT` | development |
| [`unist-util-stringify-position`](https://github.com/syntax-tree/unist-util-stringify-position) | 4.0.0 | `MIT` | development |
| [`unist-util-visit`](https://github.com/syntax-tree/unist-util-visit) | 5.1.0 | `MIT` | development |
| [`unist-util-visit-parents`](https://github.com/syntax-tree/unist-util-visit-parents) | 6.0.2 | `MIT` | development |
| [`universalify`](https://github.com/RyanZim/universalify#readme) | 2.0.1 | `MIT` | development |
| [`unplugin`](https://unplugin.unjs.io) | 2.3.11 | `MIT` | development |
| [`upath`](http://github.com/anodynos/upath/) | 1.2.0 | `MIT` | development |
| [`urlpattern-polyfill`](https://github.com/kenchris/urlpattern-polyfill) | 10.1.0 | `MIT` | development |
| [`util-deprecate`](https://github.com/TooTallNate/util-deprecate) | 1.0.2 | `MIT` | development |
| [`uuid`](https://github.com/uuidjs/uuid) | 14.0.1 | `MIT` | development |
| [`v8-compile-cache-lib`](https://github.com/cspotcode/v8-compile-cache-lib) | 3.0.1 | `MIT` | development |
| [`validate-npm-package-license`](https://github.com/kemitchell/validate-npm-package-license.js) | 3.0.4 | `Apache-2.0` | development |
| [`vfile`](https://github.com/vfile/vfile) | 6.0.3 | `MIT` | development |
| [`vfile-message`](https://github.com/vfile/vfile-message) | 4.0.3 | `MIT` | development |
| [`vite-plugin-pwa`](https://github.com/vite-pwa/vite-plugin-pwa#readme) | 1.3.0 | `MIT` | development |
| [`vue`](https://vuejs.org/) | 3.5.39 | `MIT` | development |
| [`w3c-xmlserializer`](https://github.com/jsdom/w3c-xmlserializer) | 5.0.0 | `MIT` | development |
| [`webpack-virtual-modules`](https://github.com/sysgears/webpack-virtual-modules#readme) | 0.6.2 | `MIT` | development |
| [`whatwg-encoding`](https://github.com/jsdom/whatwg-encoding) | 3.1.1 | `MIT` | development |
| [`whatwg-mimetype`](https://github.com/jsdom/whatwg-mimetype) | 4.0.0 | `MIT` | development |
| [`which-boxed-primitive`](https://github.com/inspect-js/which-boxed-primitive#readme) | 1.1.1 | `MIT` | development |
| [`which-builtin-type`](https://github.com/inspect-js/which-builtin-type#readme) | 1.2.1 | `MIT` | development |
| [`which-collection`](https://github.com/inspect-js/which-collection#readme) | 1.0.2 | `MIT` | development |
| [`which-module`](https://github.com/nexdrew/which-module#readme) | 2.0.1 | `ISC` | development |
| [`which-typed-array`](https://github.com/inspect-js/which-typed-array) | 1.1.22 | `MIT` | development |
| [`wordwrap`](https://github.com/substack/node-wordwrap) | 1.0.0 | `MIT` | development |
| [`workbox-background-sync`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-broadcast-update`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-build`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-cacheable-response`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-core`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-expiration`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-google-analytics`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-navigation-preload`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-precaching`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-range-requests`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-recipes`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-routing`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-strategies`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-streams`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-sw`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`workbox-window`](https://github.com/GoogleChrome/workbox) | 7.4.1 | `MIT` | development |
| [`wrap-ansi`](https://github.com/chalk/wrap-ansi) | 7.0.0 | `MIT` | development |
| [`wrappy`](https://github.com/npm/wrappy) | 1.0.2 | `ISC` | development |
| [`ws`](https://github.com/websockets/ws) | 8.21.0 | `MIT` | development |
| [`xcode`](https://github.com/apache/cordova-node-xcode) | 3.0.1 | `Apache-2.0` | development |
| [`xml-js`](https://github.com/nashwaan/xml-js#readme) | 1.6.11 | `MIT` | development |
| [`xml-name-validator`](https://github.com/jsdom/xml-name-validator) | 5.0.0 | `Apache-2.0` | development |
| [`xml2js`](https://github.com/Leonidas-from-XIV/node-xml2js) | 0.6.2 | `MIT` | development |
| [`xmlbuilder`](http://github.com/oozcitak/xmlbuilder-js) | 15.1.1 | `MIT` | development |
| [`xmlbuilder2`](https://github.com/oozcitak/xmlbuilder2) | 4.0.3 | `MIT` | development |
| [`xmlchars`](https://github.com/lddubeau/xmlchars) | 2.2.0 | `MIT` | development |
| [`xpath`](https://github.com/goto100/xpath) | 0.0.32 | `MIT` | development |
| [`xtend`](https://github.com/Raynos/xtend) | 4.0.2 | `MIT` | development |
| [`y18n`](https://github.com/yargs/y18n) | 5.0.8 | `ISC` | development |
| [`yaml`](https://eemeli.org/yaml/v1/) | 1.10.3 | `ISC` | development |
| [`yargs`](https://yargs.js.org/) | 17.7.3 | `MIT` | development |
| [`yargs-parser`](https://github.com/yargs/yargs-parser) | 21.1.1 | `ISC` | development |
| [`yatag`](https://github.com/mmomtchev/yatag#readme) | 1.3.0 | `ISC` | development |
| [`yn`](https://github.com/sindresorhus/yn) | 3.1.1 | `MIT` | development |
| [`zwitch`](https://github.com/wooorm/zwitch) | 2.0.4 | `MIT` | development |

</details>

## How this is maintained

- **Re-generation**: `npm run build-tech-bom` reads `node_modules/`, walks the npm dep tree, and rewrites this file + `static/data/tech-bom.json`. Run after every `npm install` / dep bump.
- **CI check**: chained into `validate-data` so a license that is not on the allowlist breaks the build. To add a new license, edit `LICENSE_ALLOWLIST` in `scripts/build-tech-bom.ts`.
- **No new dependencies were added to make this work.** Generator is pure Node + npm CLI; output formats are markdown + a CycloneDX-shaped JSON subset.
- **Project license**: `MIT` (see [LICENSE](https://github.com/chipi/orrery/blob/main/LICENSE)). All bundled deps are compatible.

