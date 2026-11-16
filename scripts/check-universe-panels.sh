#!/usr/bin/env bash
# B3-CHECK (UXD-023, star / outer-scale / black-hole panels) — run from anywhere inside the repo:
#   bash scripts/check-universe-panels.sh
# Prints each violation as "KIND file:line text", then "B3-CHECK violations: N"; exits 1 on any.
# Allow marker: `b3-keep: <why>` on the same line as a hit. Read-only; it tests file and string
# presence, not rendering (tests/e2e/universe-panels.spec.ts and type-floor.spec.ts do that).
set -u
cd "$(git rev-parse --show-toplevel)"
C=src/lib/components
OUTER="$C/MilkyWayPanel.svelte $C/LocalGroupPanel.svelte $C/LocalSheetPanel.svelte $C/VirgoPanel.svelte $C/LaniakeaPanel.svelte $C/CosmicWebPanel.svelte $C/BlackHolePanel.svelte $C/DeepSkyPanel.svelte"
STAR=$C/StarPanel.svelte
N=0
hit() { printf '%-18s %s\n' "$1" "$2"; N=$((N + 1)); }
grep_hits() { # kind, ERE, files...
  local kind=$1 re=$2; shift 2
  local line
  while IFS= read -r line; do
    case "$line" in *b3-keep*) continue ;; esac
    hit "$kind" "$(printf '%s' "$line" | cut -c1-110)"
  done < <(grep -n -E "$re" "$@" /dev/null 2>/dev/null)
}

# 1. The star panel keeps no private tab strip or hero stack; the finder sits in the sky tab
grep_hits STAR-PRIVATE-TABS 'class="tabs"|role="tablist"' $STAR
grep_hits STAR-HERO-STACK 'class="panel-hero star-hero"|<img' $STAR
grep -q "id: 'sky'" $STAR || hit STAR-NO-SKY-TAB "$STAR:1 no sky tab"
fl=$(grep -n '<ConstellationFinder' $STAR | head -1 | cut -d: -f1)
tl=$(grep -n "active === 'sky'" $STAR | head -1 | cut -d: -f1)
{ [ -n "$fl" ] && [ -n "$tl" ] && [ "$fl" -gt "$tl" ]; } || hit FINDER-NOT-IN-TAB "$STAR:${fl:-0} ConstellationFinder is not inside the sky tab"

# 2. Outer panels: no private rem type, no private head/body rules, all on the shared body
grep_hits OUTER-REM-TYPE 'font-size:[[:space:]]*[0-9.]+rem' $OUTER $C/UniversePanelBody.svelte $C/UniverseFacts.svelte
grep_hits OUTER-PRIVATE-RULE '^[[:space:]]*\.(head|kind|name|prose|grid|cell|cell-label|cell-value|learn-link)[[:space:]]*\{' $OUTER
for f in $STAR $OUTER; do
  grep -q 'UniversePanelBody' "$f" || hit NO-SHARED-BODY "$f:1 does not use UniversePanelBody"
done

# 3. A black hole opens its panel in place; the lensing render is the panel's action
grep_hits BH-TAKEOVER-ON-PIN "enterBlackHole\('sagittarius-a-star'\)" src/lib/three/explore-scene-host.ts
grep -q 'explore_bh_see_lensing' messages/en-US.json || hit NO-LENSING-ACTION "messages/en-US.json:1 explore_bh_see_lensing is missing"
grep -q 'onSeeLensing' $C/BlackHolePanel.svelte || hit NO-LENSING-PROP "$C/BlackHolePanel.svelte:1 no onSeeLensing"

# 4. Data and provenance
grep -q '/images/black-holes/sagittarius-a-star/01.webp' static/data/image-provenance.json || hit NO-EHT-PROVENANCE "static/data/image-provenance.json:1 no row for the EHT 2022 image"
[ -f static/images/black-holes/sagittarius-a-star/01.webp ] || hit NO-EHT-FILE "static/images/black-holes/sagittarius-a-star/01.webp missing"
grep -rq 'getUniverseHero' src/lib/data || hit NO-HERO-LOADER "src/lib/data:1 getUniverseHero is missing"
grep -rq 'getNamedStarGallery' src/lib/data || hit NO-STAR-GALLERY-LOADER "src/lib/data:1 getNamedStarGallery is missing"
[ -f static/data/universe/panel-heroes.json ] || hit NO-HERO-DATA "static/data/universe/panel-heroes.json missing"

# 5. Locale keys
for k in panel_tab_sky star_show_constellations star_zodiac_note explore_bh_see_lensing panel_hero_pictured; do
  for f in messages/*.json; do
    grep -q "\"$k\"" "$f" || hit NO-KEY "$f:1 $k is missing"
  done
done

# 6. Tests
[ -f tests/e2e/universe-panels.spec.ts ] || hit NO-E2E "tests/e2e/universe-panels.spec.ts missing"
[ -f $C/UniversePanelBody.test.ts ] || hit NO-UNIT "$C/UniversePanelBody.test.ts missing"
grep -q "panel-milky-way" tests/e2e/type-floor.spec.ts || hit TYPE-FLOOR-GAP "tests/e2e/type-floor.spec.ts:1 no outer-level panel in PANEL_LINKS"

# 7. Docs say the rule
grep -q 'IN THE SKY' docs/uxs/UXS-001.md || hit DOC-UXS-001 "docs/uxs/UXS-001.md:1 no star-panel tab contract"
grep -q 'UniversePanelBody' $C/README.md || hit DOC-README "$C/README.md:1 UniversePanelBody not listed"
grep -q -E '^\| B3 .*\| (done|landed)' docs/uxs/CHANGE-INVENTORY.md || hit DOC-INVENTORY "docs/uxs/CHANGE-INVENTORY.md:36 B3 row not done"
[ -f docs/uxs/decisions/UXD-023-star-and-outer-panels-follow-the-planet-pattern.md ] || hit DOC-UXD "UXD-023 missing"

echo "B3-CHECK violations: $N"
[ "$N" -eq 0 ]
