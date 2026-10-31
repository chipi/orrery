#!/usr/bin/env bash
# Garble pass, one locale × tree: apply the checked edits, run the gates, commit (never push).
#   scripts/i18n-tools/garble-cell-commit.sh <loc> <tree> <edits.json> <round-dir> [summary]
# <round-dir> holds the round's inputs (decisions, check fixes) and is copied into
# scripts/i18n-tools/maps/2026-10-31-garble-pass/<loc>-<tree>/ as the record.
# Stops (exit 1) on a refused edit, a term miss, a name problem or a validate-data failure; the
# working tree then holds the applied edits for inspection (git checkout -- i18n-src/<loc>/<tree> undoes).
set -euo pipefail
loc=$1 tree=$2 edits=$3 round=$4 summary=${5:-}
cd "$(git rev-parse --show-toplevel)"
out=$(node scripts/i18n-tools/apply-edits.mjs "$loc" "$edits")
echo "$out"
if ! grep -q "refused 0" <<<"$out"; then echo "STOP: refused edits"; exit 1; fi
node scripts/i18n-tools/term-drift.mjs --gate --locales="$loc" >/tmp/garble-drift.$$ 2>&1 || {
  tail -3 /tmp/garble-drift.$$; echo "STOP: term misses (review, then term-keep.mjs)"; exit 1; }
node scripts/i18n-tools/name-drift-scan.mjs "$loc" | tail -1
node scripts/i18n-tools/name-drift-scan.mjs "$loc" | tail -1 | grep -q "name problems: 0" || { echo "STOP: names"; exit 1; }
npm run --silent validate-data >/tmp/garble-vd.$$ 2>&1 || { grep -E "✗|must" /tmp/garble-vd.$$ | head; echo "STOP: validate-data"; exit 1; }
grep -E "files passed" /tmp/garble-vd.$$ | head -1
rm -f /tmp/garble-drift.$$ /tmp/garble-vd.$$
rec=scripts/i18n-tools/maps/2026-10-31-garble-pass/$loc-$tree
mkdir -p "$rec" && cp "$round"/*.json "$rec"/ && npx prettier --write "$rec"/*.json >/dev/null
n=$(grep -o 'applied [0-9]*' <<<"$out" | grep -o '[0-9]*')
git add "i18n-src/$loc/$tree" "$rec" scripts/i18n-tools/term-keeps.json
git commit -q -F - <<EOF
fix(i18n): $loc $tree garble pass — $n fields retranslated from English

docs/wip/2026-10-31-garble-pass.md §3. ${summary}
Gates: apply-edits refused 0; term-drift --gate ($loc) 0; name-drift-scan $loc 0;
validate-data passed. Record: $rec/.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014cvkLBM2QR3nezaWmHrhTg
EOF
git log --oneline -1
