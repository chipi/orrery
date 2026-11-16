#!/usr/bin/env bash
# Creates a detached worktree at HEAD with the four pre-slice (C2, UXD-020) element opacities
# put back, so scripts/readability-probe.mjs can measure the "before" look with the slice's own
# probe hooks. Everything but those four numbers is HEAD. Usage:
#   bash scripts/readability-before.sh /work/orrery/worktrees/probe-before
# Remove it afterwards with: git worktree remove --force <dir>
set -euo pipefail
dir=${1:?usage: readability-before.sh <new worktree dir>}
git worktree add --detach "$dir" HEAD >/dev/null
f="$dir/src/lib/three/explore-solar-scene.ts"

# restore NAME PCRE_COUNT_PATTERN SED_PATTERN OLD_VALUE: the pattern must match exactly once
restore() {
  local name=$1 count_pat=$2 sed_pat=$3 value=$4 n
  n=$(grep -Pzo "$count_pat" "$f" | tr -cd '\0' | wc -c)
  if [ "$n" != 1 ]; then
    echo "FAIL: $name: $n matches in $f (expected 1); the file moved on, update this script" >&2
    exit 1
  fi
  sed -z -E -i "s/$sed_pat/\1$value\2/" "$f"
  echo "restored $name -> $value"
}

restore "asteroid belt" \
  'size: 1\.0,\s+sizeAttenuation: true,\s+transparent: true,\s+opacity: [0-9.]+,' \
  '(size: 1\.0,\s+sizeAttenuation: true,\s+transparent: true,\s+opacity: )[0-9.]+(,)' 0.5
restore "Kuiper belt" \
  'size: 1\.1,\s+sizeAttenuation: true,\s+transparent: true,\s+opacity: [0-9.]+,' \
  '(size: 1\.1,\s+sizeAttenuation: true,\s+transparent: true,\s+opacity: )[0-9.]+(,)' 0.4
restore "planet orbit lines" \
  'color: 0xc0d0ff,\s+transparent: true,\s+opacity: [0-9.]+,' \
  '(color: 0xc0d0ff,\s+transparent: true,\s+opacity: )[0-9.]+(,)' 0.25
restore "small-body orbit lines" \
  "opacity: b\.type === 'interstellar' \? 0\.4 : [0-9.]+," \
  "(opacity: b\.type === 'interstellar' \? 0\.4 : )[0-9.]+(,)" 0.22
echo "ready: $dir (HEAD $(git -C "$dir" rev-parse --short HEAD) + 4 opacities); start a server there and run the probe against it"
