#!/usr/bin/env bash
# Garble pass, one locale × trees: record the round (reviewer parts, edits, hand fixes), then
# garble-cell-commit.sh applies the edits, runs the gates and commits (never pushes).
#   scripts/i18n-tools/garble-round-commit.sh <loc> <name> <trees,comma> <workdir> "<summary>"
# <workdir> is the one garble-cell-prep.sh used: out/part*.json, edits.json, optional hand*.json.
# The record is copied from <workdir>/rec as r3-<file>.
set -euo pipefail
loc=${1:?loc} name=${2:?name} trees=${3:?trees} D=${4:?workdir} summary=${5:-}
cd "$(git rev-parse --show-toplevel)"
R=$D/rec
rm -rf "$R"; mkdir -p "$R"
for f in "$D"/out/part*.json; do cp "$f" "$R/r3-$(basename "$f")"; done
cp "$D/edits.json" "$R/r3-edits.json"
for h in "$D"/hand*.json; do
  if [ -f "$h" ]; then cp "$h" "$R/r3-$(basename "$h")"; fi
done
bash scripts/i18n-tools/garble-cell-commit.sh "$loc" "$name:$trees" "$D/edits.json" "$R" "$summary"
