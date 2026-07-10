/**
 * Human-facing version label for the footer chip.
 *
 * Keeps the pre-release suffix (e.g. `-wip`, `-rc.1`) and collapses a `.0`
 * patch so the wip line reads cleanly:
 *   `0.8.0-wip` → `0.8-wip`
 *   `0.7.3`     → `0.7.3`
 *   `0.8.0`     → `0.8`
 * The raw `__APP_VERSION__` (full `MAJOR.MINOR.PATCH-pre` shape) stays
 * available for Sentry releases + analytics — this is only the label.
 */
export function formatDisplayVersion(raw: string): string {
  const [core, ...pre] = raw.split('-');
  const [maj, min, patch] = core.split('.');
  const base = patch === '0' ? `${maj}.${min}` : `${maj}.${min}.${patch}`;
  return pre.length ? `${base}-${pre.join('-')}` : base;
}
