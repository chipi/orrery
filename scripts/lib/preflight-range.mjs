/**
 * The git range the smart preflight diffs (plan E3). PREFLIGHT_BASE is the remote tip of the
 * branch a push updates (.husky/pre-push sets it): only what the push adds is checked. On a long
 * arc branch the diff against main always holds a config file, so every push used to run the
 * full mirror (~20 min) for one new commit; the earlier commits were checked when they were
 * pushed. No base, a malformed one, or one that is not an ancestor of HEAD (a force-push after a
 * rebase) keeps the diff against main.
 *
 * @param {string | undefined} base - PREFLIGHT_BASE
 * @param {(sha: string) => boolean} isAncestor - `git merge-base --is-ancestor <sha> HEAD`
 * @returns {{ range: string, note?: string }}
 */
export function preflightRange(base, isAncestor) {
  const main = 'origin/main...HEAD';
  const sha = base?.trim();
  if (!sha) return { range: main };
  if (!/^[0-9a-f]{7,40}$/.test(sha))
    return { range: main, note: `PREFLIGHT_BASE "${sha}" is not a sha` };
  if (!isAncestor(sha))
    return {
      range: main,
      note: `PREFLIGHT_BASE ${sha.slice(0, 11)} is not an ancestor of HEAD (rebased?) — diffing against origin/main`,
    };
  return { range: `${sha}..HEAD` };
}
