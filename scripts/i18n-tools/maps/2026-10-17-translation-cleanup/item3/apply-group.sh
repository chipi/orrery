#!/usr/bin/env bash
# 9b item 3: apply one reviewed group (all its fixes/<loc>-<seg>-NN.json) through the checker,
# then run the name gates for that locale. validate-data and the commit are separate steps.
#   bash apply-group.sh <loc> <seg>
set -euo pipefail
loc=$1 seg=$2
M=scripts/i18n-tools/maps/2026-10-17-translation-cleanup
for f in "$M"/item3/fixes/"$loc"-"$seg"-[0-9][0-9].json; do
  mise exec -- node scripts/i18n-tools/apply-edits.mjs "$loc" "$f" 2>&1 | grep -v '^\s*$'
done
PASS_TAG=verify mise exec -- node scripts/i18n-tools/glossary-apply.mjs "$loc" body,feature,place,station,facility,person,star,agency
if [ -s "$M/glossary-edits-$loc-verify.json" ] && [ "$(node -e "console.log(require('./$M/glossary-edits-$loc-verify.json').length)")" != 0 ]; then
  mv "$M/glossary-edits-$loc-verify.json" "$M/item3/fixes/$loc-$seg-glossary.json"
  echo "GLOSSARY PROPOSALS: $M/item3/fixes/$loc-$seg-glossary.json (review, then apply)"
else
  rm -f "$M/glossary-edits-$loc-verify.json"
fi
mise exec -- node scripts/i18n-tools/name-drift-scan.mjs | head -3
