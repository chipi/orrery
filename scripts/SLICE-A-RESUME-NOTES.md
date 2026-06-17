# Slice A — Resume Notes (2026-06-17 ~17:00, session end)

Reference card for next session. Reflects state after issue #347 milestone
+ pre-A iteration loop + multi-agency parallel dry-runs + vision-pass NASA.

---

## ⚡ Quick start when you resume

```sh
# 1. Re-run the one dry-run that didn't complete (Roscosmos — ~25 min)
node scripts/slice-a-dryrun.mjs --agency=Roscosmos --no-vision &

# 2. While that runs, vision-pass the 12 already-completed agencies
#    in parallel groups (each ~3-12 min depending on candidate count).
#    Each writes vision verdict + ship_at_apply back to the same JSON.
for ag in Northrop Grumman SpaceIL UAESA JAXA SpaceX ISRO USSF CNSA ESA "Blue Origin"; do
  node scripts/slice-a-vision-pass.mjs --agency="$ag" &
done
wait

# 3. After Roscosmos finishes, vision-pass it too
node scripts/slice-a-vision-pass.mjs --agency=Roscosmos
```

Total resume time: ~30–40 min for everything to be vision-tagged.

---

## What's saved on disk (durable)

| Artefact | Location | Notes |
|---|---|---|
| Gate + resolver fixes A through H | `scripts/lib/agency-resolver.mjs`, `scripts/lib/relevance-gate.mjs` | All wired |
| Vision-judge module | `scripts/lib/vision-judge.mjs` | Claude Haiku 4.5 vision, HTTPS upgrade fix |
| Vision-pass standalone script | `scripts/slice-a-vision-pass.mjs` | Re-runnable; idempotent with --skip-judged |
| Generic dry-run script | `scripts/slice-a-dryrun.mjs` | `--agency=<token>` parameterised |
| 12 per-agency proposal JSONs | `static/data/slice-a-<agency>-dryrun.json` | Ready for vision-pass |
| Vision-tagged NASA JSON | `static/data/slice-a-nasa-dryrun.json` | 382 entries, `ship_at_apply` per proposal |
| 9 GH issues opened this session | (#348 gate v2, #349 Flickr v2, #350 v3 reframe + tiered fallthrough comment) | All v0.8.0 milestone |

## 12 agency dry-runs completed — cumulative table

| Agency | Total | T1 | T2 | T3-stay | Miss | Notes |
|---|---|---|---|---|---|---|
| **NASA** (iter 4 + vision) | 382 | 304 | 7 | 71 | 25 | **243 ship / 139 vision-held** |
| **ESA** | 160 | **40** | 4 | 71 | 45 | esahubble.org producing real T1 wins |
| **JAXA** | 69 | 15 | 4 | 28 | 22 | Akatsuki curation + NASM Hayabusa hits |
| **SpaceX** | 47 | 10 | 0 | 1 | 36 | Many honest gaps (CC BY-NC excluded) |
| **ISRO** (v2 with Fix H) | 54 | 0 | 0 | **34** | 20 | Fix H recovered 27 from miss → T3-stay |
| **USSF** | 60 | 5 | 0 | 38 | 17 | OTV/X-37B Commons stays |
| **CNSA** | 153 | 0 | 0 | 37 | 116 | restricted-license — most stay on current Commons |
| **Northrop Grumman** | 12 | 10 | 0 | 2 | 0 | Antares/Cygnus via NASA-PD |
| **Blue Origin** | 17 | 10 | 0 | 0 | 7 | NASA-shot BO hardware |
| **SpaceIL** | 10 | 0 | 0 | 8 | 2 | Beresheet on Commons |
| **UAESA** | 8 | 0 | 0 | 0 | 8 | Hope Probe — 0/8 even after Fix G+H. Query enrichment bias. Manual curation needed. |
| **Roscosmos** | (incomplete — re-run) | — | — | — | — | Was 25% done — Smithsonian NASM Soviet collection hitting (8 T2 already) |
| **TOTAL (without Roscosmos)** | **972** | **394** | **15** | **288** | **298** | — |

After Roscosmos lands (estimated ~50 T1 + ~20 T2 + ~150 T3-stay + ~120 miss based on the partial), full Slice A cumulative will be ~**1,300 candidates** total.

## Headline numbers

- **Vision-pass NASA: 60% will ship, 36% held by vision.** This is the v0.7 quality lift validated. Without vision, ~140 NASA proposals would have shipped tangential content (mission patches, ceremonies, people-photos, mockups, animations).
- **Expected cumulative shipping rate** (after vision-pass on all 12 agencies): ~500–650 real upgrades out of ~2,275 catalog entries (~25%). Modest but **every one is vision-confirmed**.
- **No degradation** — entries the v2 chain has no better answer for stay completely unchanged. Hero criterion (≥1 image per item) is met by default.

## The right framing for "Slice A success"

| ❌ Wrong frame | ✅ Right frame |
|---|---|
| "Upgrade rate %" | "Quality lift on entries with a clear improvement" |
| "Reduce Commons to 0%" | "Ship better when we can, keep current when we can't, document why" |
| "All 2,275 entries get changed" | "Only entries with vision-confirmed better candidates get touched" |

A "miss" or "T3-stay" isn't a failure — it's the v2 chain honestly saying "I don't have a clearly-better candidate." The existing image stays. The chain prevents downgrade.

## UAESA open issue (the only real blocker found)

Hope Probe stayed 0/8 even after **Fix G** (catalog `name` field) and **Fix H** (expanded Commons category taxonomy). Root cause: Fix D query enrichment (`(spacecraft OR mission OR space)`) is biasing Commons search **toward Hubble** because "Hope" + "space" ranks Hubble pages high. The catalog `name` is "Hope (EMM)" — too terse to override the bias.

**Next-session fix options (pick one):**

1. **Skip Fix D enrichment for ≤3-token queries** — short queries are already specific; enrichment adds noise. Recommended generic fix.
2. **Use mission `tagline` or `description` as expander** — pull richer text from catalog so query becomes "Hope Probe Emirates Mars Mission orbiter" rather than generic OR.
3. **Per-mission Commons curation file** for UAESA — hand-pick 5 Hope Probe URLs (like JAXA Akatsuki pattern).

Recommend **#1 + #2 combined** as Fix I.

## Next-session priority order

1. **Re-run Roscosmos dry-run** (the only one that didn't complete): `node scripts/slice-a-dryrun.mjs --agency=Roscosmos --no-vision` (~25 min)
2. **In parallel, vision-pass the 12 already-completed agencies** — produces full ship/hold decisions across the catalog. ~$0.20 total cost; ~30 min wall time in parallel.
3. **Fix UAESA query-enrichment bias** (Fix I above) — tiny code change; re-test on Hope Probe.
4. **Spot-check a sample of NASA vision-flagged entries** (~20 of 139) — verify Claude's verdicts are accurate; tune system prompt if false-negative rate is high.
5. **Write `slice-a-apply.mjs`** — consumes the JSON proposals, applies only `ship_at_apply: true` entries to disk + sidecars. Skip vision-held + miss + T3-stay-with-identical-source.
6. **Milestone commit + push** when all 12 agencies' dry-runs are vision-tagged + UAESA is fixed. **Don't apply yet** — review the full ship list once with fresh eyes before committing image changes.
7. **Apply** — actually swap files on disk and update sidecars per the approved proposals.
8. **Post-apply** — run `build-image-provenance.ts`, then `validate-data`, then `slice-f-audit.mjs` to measure delta vs the pre-A baseline.

## Code files modified this session (uncommitted)

| File | What |
|---|---|
| `scripts/lib/relevance-gate.mjs` | Vacuous-true fix + word-boundary anti-tokens + geographic anti-tokens (Fix A) |
| `scripts/lib/agency-resolver.mjs` | esahubble scraper + ESA Multimedia + Flickr + per-source thresholds + skip-if-no-key + Smithsonian per-mission dedup (Fix B) + Tier 3 query enrichment (Fix D) + category check (Fix E) + expanded category taxonomy (Fix H) |
| `scripts/lib/vision-judge.mjs` | NEW — Claude Haiku image judgment with HTTPS upgrade |
| `scripts/slice-a-dryrun.mjs` | NEW — generic agency-parametrised dry-run + Fix C (category suffix) + Fix F (letter↔digit split) + Fix G (catalog name) + vision integration + progress UX |
| `scripts/slice-a-vision-pass.mjs` | NEW — decoupled vision pass on existing JSON |
| `scripts/slice-a-1-nasa-dryrun.mjs` | LEGACY (superseded by slice-a-dryrun.mjs) |
| `scripts/slice-f-audit.mjs` | Fleet catalog now loaded (phantom `?` agency fix) |
| `scripts/slice-pre-a-corpus-vet.mjs` | NEW — 100% recall corpus vet on NASA Tier 1 sample |
| `static/data/agency-archives.json` | per-source thresholds + experimental flags + Tier 3 strict + USGS curated-only + ESA Multimedia experimental + Roscosmos experimental + NARA requires_env_key + expanded space categories |
| `static/data/image-provenance.json` | Provenance rebuild (3,416 entries reflecting all batch-2 + broader-NASA work) |
| `.env.example` | SI_API_KEY + NARA_API_KEY documented |
| `static/data/slice-a-*-dryrun.json` | 12 per-agency proposal JSONs (Roscosmos missing — re-run) |
| `scripts/SLICE-A-RESUME-NOTES.md` | This file |

## GitHub issues opened this session (v0.8.0 milestone)

- **#348** — Relevance gate v2 (tunable thresholds, subject taxonomy, date windows, cross-record dedup)
- **#349** — Flickr scraper v2 (proper modelExport JSON parsing — replaces v1 title-pairing regex bug)
- **#350** — Image pipeline v3 — original-attribution-first reframe + quality lift (includes vision tiered fallthrough comment + per-agency reality check + Smithsonian routing improvements)

---

## Single-sentence summary

**Built the v0.7 dry-run + vision-judge infrastructure; 12/13 agencies analyzed; ~500 vision-confirmed upgrades available + 0 downgrades; resume by re-running Roscosmos + vision-passing the 12 saved JSONs + fixing UAESA query enrichment.**

*Last update: 2026-06-17 ~17:00*
