#!/usr/bin/env node
/**
 * Paraglide compile step for `npm run i18n:compile`.
 *
 * WHY NOT THE CLI. The locale cookie name is a compiler option
 * (`cookieName`, ADR-057) and `paraglide-js compile` has no flag for it — its
 * `--help` lists only `--project`, `--outdir`, `--strategy`, `--is-server`,
 * `--output-structure`, `--watch` and the emit toggles — and
 * `project.inlang/settings.json` carries no compiler options either. Calling
 * `compile()` directly is the only supported way to set it on this path.
 *
 * Options come from `scripts/paraglide-options.mjs`, shared with the Vite
 * plugin so the two cannot drift.
 */
import { compile } from '@inlang/paraglide-js';
import { paraglideOptions } from './paraglide-options.mjs';

await compile(paraglideOptions);
