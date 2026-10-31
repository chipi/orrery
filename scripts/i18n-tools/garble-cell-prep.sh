#!/usr/bin/env bash
# Garble pass, one locale × trees, up to the reading: check the reviewers' decisions, list the
# flags, long taglines, refusals and term misses, then revert the applied edits.
#   scripts/i18n-tools/garble-cell-prep.sh <loc> <name> <trees,comma> <workdir>
# <workdir> holds <loc>.json (work file) and out/part*.json (decisions); it gets edits.json,
# edits.flags.json and misses.json. <name> (the cell's bucket) only labels the output.
# Applies the edits to i18n-src/<loc>/<tree> to see the refusals and misses, then runs
# `git checkout --` on those trees, so do not run it with uncommitted work in them or while another
# job reads them.
set -uo pipefail
loc=${1:?loc} name=${2:?name} trees=${3:?trees} D=${4:?workdir}
cd "$(git rev-parse --show-toplevel)"
T=scripts/i18n-tools
revert() { for t in ${trees//,/ }; do git checkout -- "i18n-src/$loc/$t"; done; }
trap revert EXIT
echo "== $loc $name"
node $T/garble-check.mjs "$loc" "$D/$loc.json" $(ls "$D"/out/part*.json | sort -V) --out="$D/edits.json" | head -1
node $T/garble-flags.mjs "$D/edits.flags.json" --headers --kinds=ISO,tagline,link,number,separator | cut -c1-220
node $T/garble-flags.mjs --long="$D/edits.json" --cap=140 --headers
node $T/apply-edits.mjs "$loc" "$D/edits.json" | cut -c1-260
node $T/term-drift.mjs --locales="$loc" --trees="$trees" --misses="$D/misses.json" >/dev/null 2>&1
node $T/term-misses.mjs show "$D/misses.json" --no-en | cut -c1-230
