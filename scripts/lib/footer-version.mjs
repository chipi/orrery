/**
 * The footer-version gate of validate-prod: the version the live footer shows
 * must be the version in package.json (the release PR bumps it before the
 * deploy, so a mismatch means the deploy is an older build or the bump landed
 * after the deploy — 0.9.8 shipped saying "v0.9.7" that way).
 *
 * `formatDisplayVersion` mirrors src/lib/version.ts (the footer label);
 * footer-version.test.ts pins the two together.
 */
export function formatDisplayVersion(raw) {
  const [core, ...pre] = raw.split('-');
  const [maj, min, patch] = core.split('.');
  const base = patch === '0' ? `${maj}.${min}` : `${maj}.${min}.${patch}`;
  return pre.length ? `${base}-${pre.join('-')}` : base;
}

/**
 * Compare the footer's text ("v0.9.8") with package.json's version.
 * Returns { ok, expected, actual } where expected is the label package.json
 * produces. An empty or missing footer text never passes.
 */
export function compareFooterVersion(footerText, pkgVersion) {
  const expected = `v${formatDisplayVersion(pkgVersion)}`;
  const actual = (footerText ?? '').trim();
  return { ok: actual !== '' && actual === expected, expected, actual };
}
