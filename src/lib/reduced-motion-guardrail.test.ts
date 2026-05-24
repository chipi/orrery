import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Reduced-motion guardrail (RFC-005 / ADR-025 — PRD-007 piece W).
 *
 * Codifies the "no Svelte transition: directive that bypasses
 * prefers-reduced-motion" rule that's currently held by code review.
 * v0.7.0 ships this guardrail so a future commit can't silently
 * re-introduce an unrespected transition.
 *
 * The banned directives are the ones Svelte ships out of the box that
 * animate by default with no built-in `prefers-reduced-motion` check:
 *   transition:fly, transition:fade, transition:slide, transition:scale,
 *   transition:blur, transition:draw
 *
 * If a future component needs motion, wrap it: either gate the transition
 * with `prefersReducedMotion()` check from `$lib/reduced-motion`, or use
 * a CSS animation in a media query that respects `prefers-reduced-motion`.
 *
 * To add a legitimate exception: append the relative path to
 * EXCEPTION_ALLOWLIST below with a comment explaining why.
 */

const SRC_ROOT = join(__dirname, '..');
const BANNED = /\btransition:(fly|fade|slide|scale|blur|draw)\b/g;

/** Files that legitimately use a banned directive in a controlled way.
 *  Empty today — v0.7.0 shipped clean. Add entries here only with a
 *  WHY-line and an explicit `prefersReducedMotion()` gate in the file. */
const EXCEPTION_ALLOWLIST: ReadonlySet<string> = new Set([]);

function walkSvelte(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip generated / vendored / test directories.
      if (
        entry === 'paraglide' ||
        entry === 'node_modules' ||
        entry === '.svelte-kit' ||
        entry.startsWith('.')
      ) {
        continue;
      }
      walkSvelte(full, acc);
    } else if (entry.endsWith('.svelte')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('reduced-motion guardrail — no unguarded Svelte transition directives', () => {
  it('every .svelte file under src/ avoids transition:{fly,fade,slide,scale,blur,draw}', () => {
    const files = walkSvelte(SRC_ROOT);
    expect(files.length).toBeGreaterThan(0); // sanity: we found .svelte files

    const offenders: Array<{ file: string; matches: string[] }> = [];
    for (const file of files) {
      const rel = relative(SRC_ROOT, file);
      if (EXCEPTION_ALLOWLIST.has(rel)) continue;
      const src = readFileSync(file, 'utf-8');
      const matches = src.match(BANNED);
      if (matches && matches.length > 0) {
        offenders.push({ file: rel, matches: [...new Set(matches)] });
      }
    }

    if (offenders.length > 0) {
      const report = offenders.map((o) => `  ${o.file} → ${o.matches.join(', ')}`).join('\n');
      throw new Error(
        `${offenders.length} file(s) use banned Svelte transition directives:\n${report}\n\n` +
          `Fix: gate the transition with prefersReducedMotion() from $lib/reduced-motion, ` +
          `or move the motion to CSS inside a @media (prefers-reduced-motion: no-preference) block.`,
      );
    }
  });
});
