/**
 * Human-facing version label for the footer chip.
 *
 * Keeps the pre-release suffix (e.g. `-wip`, `-rc.1`) and collapses a `.0`
 * patch so the line reads cleanly:
 *   `0.8.0-2026-07-30-1` → `0.8-2026-07-30-1`
 *   `0.8.0-wip`          → `0.8-wip`
 *   `0.7.3`              → `0.7.3`
 *   `0.8.0`              → `0.8`
 * The raw `__APP_VERSION__` (full `MAJOR.MINOR.PATCH-pre` shape) stays
 * available for Sentry releases + analytics — this is only the label.
 *
 * VERSIONING CONVENTION (from 2026-07-30, pre-0.8 release): the pre-release
 * identifier is a **dated build number** — `MAJOR.MINOR.PATCH-<ISO-date>-<N>`,
 * where `<N>` is the Nth deploy that day. Bump `package.json#version` on every
 * deploy: new day → roll the date, reset `<N>` to 1; same-day redeploy →
 * increment `<N>`. Hyphens (not dots) keep it valid semver — `07`/`30` as
 * dot-separated numeric identifiers would be illegal leading-zero fields.
 */
export function formatDisplayVersion(raw: string): string {
  const [core, ...pre] = raw.split('-');
  const [maj, min, patch] = core.split('.');
  const base = patch === '0' ? `${maj}.${min}` : `${maj}.${min}.${patch}`;
  return pre.length ? `${base}-${pre.join('-')}` : base;
}
