# Handover — 6 new /science articles (#32) + Higgsfield diagram polish

**Date:** 2026-09-01 · **Branch:** `mobile-fixes` · **Worktree:** `orrery-fixes-311982/1/orrery-fixes`
**Status:** content 100% done + `validate-data` all-green; **only the Higgsfield diagram restyle + final
preflight + commit remain.** Nothing from this batch is committed yet (112 uncommitted files).

---

## What's DONE (all green — `npm run validate-data` → all 14 tasks, 0 failed)

6 new /science encyclopedia articles, from the Physics-Lab gap audit (#32):
`mission-phases/`: **lifting-entry, skip-entry, entry-footprint, ascent-guidance** ·
`orbits/`: **escape-velocity, synodic-period**

Per article, all present + valid:
- **Prose** — `i18n-src/en-US/science/<tab>/<id>.json` (title, intro_sentence ≤240 in every locale,
  narrative_101×3, body_paragraphs×3, diagram_caption).
- **Metadata** — `static/data/science/<tab>/<id>.json` (order, `diagram: "<id>.webp"`,
  diagram_quality "polished", see_in_app → **/lab** + a proven route, 2 source links, review stamp).
- **Registered** in `static/data/science/<tab>/_index.json`.
- **Diagram (interim)** — deterministic SVG sketch + webp in `static/diagrams/science/<id>.{svg,webp}`,
  built by `scripts/essays/build-lab-systems-science-sketches.mjs`. **These webps are placeholders —
  they must be replaced by the Higgsfield WIRED restyle (see below).** Keep the `.svg` as source.
- **Science-reviewed** — ran the `science-reviewer` agent; ALL 12 findings applied (2 errors:
  corridor is 3–5× not 2×, ballistic lunar-return g >10 not 8–10; overreaches on Zond/Perseverance-ellipse/
  Falcon-9/New-Horizons; 2 dead NTRS URLs replaced with MIT R-415 + IGM ResearchGate; super-circular
  defined; unit + IGM-lineage nits). Re-stamped via `npm run stamp-science-review -- <ids>`.
- **Translated ×13** via `scripts/translate-i18n-gaps.mjs` (78 files, all locales).
- **Schema fix**: added `/lab` to the see_in_app route enum in
  `static/data/schemas/science-section.schema.json`.
- **Regenerated**: `npm run build-science-index`, `npm run build-i18n-bundles`, `npm run gen:doc-counts`.
- **Orphan allowlist**: the 6 added to `ORPHAN_ALLOWLIST` in `src/lib/science-orphan-detector.test.ts`
  (browse-reachable via /science nav; Lab→article deep-link is a follow-up).
- **Count fix**: `src/lib/data.test.ts` orbits count 16 → 18.

---

## THE ONE REMAINING THING — Higgsfield diagram polish (operator: MANDATORY)

The 6 shipped diagram webps are deterministic SVG sketches. They must be replaced by the Higgsfield
`nano-banana-pro` WIRED restyle. **Blocked only on Higgsfield auth**, which flapped/expired this session.

### Two independent Higgsfield routes — either works:
1. **CLI (preferred, no MCP needed).** The `higgsfield` CLI is installed
   (`~/.nvm/versions/node/v25.3.0/bin/higgsfield`); its session **expired**. Fix:
   ```
   higgsfield auth login        # browser device login — NOT `hf`, which is Hugging Face on this box
   higgsfield account status    # should show authenticated
   ```
   Then generate each (per `docs/guides/diagram-art-style.md`), e.g.:
   ```
   higgsfield generate create --model nano-banana-pro --aspect_ratio 16:9 --wait \
     --image docs/wip/essay-diagram-sources/_lab-systems-science/<id>.png \
     --prompt "<style prefix + labels + subject from the brief>"
   ```
2. **MCP connector.** `claude.ai Higgsfield` MCP was live at this session's START and dropped mid-way.
   A **fresh Claude Code session** re-runs the handshake and most likely re-exposes the
   `mcp__claude_ai_Higgsfield__*` tools. (Root cause of the drop: Higgsfield's Clerk OAuth — the CLI
   client hits `/register`→404; real path is `/oauth2/register`. Endpoint itself is up: `POST /mcp`→401.)

### The prompts + reference PNGs are READY
- **Prompts** (style prefix + per-diagram label list + subject): `docs/wip/2026-09-01-higgsfield-diagram-prompts.md`
- **Reference sketch PNGs** (attach as the img2img reference): `docs/wip/essay-diagram-sources/_lab-systems-science/<id>.png` (2048px, all 6)

### After the art is generated
For each `<id>`: download raw art → `sharp().resize(1600).webp({quality:86})` →
overwrite `static/diagrams/science/<id>.webp` → **visually verify every number/label survived the
restyle** (regenerate any that garbled one) → keep the `.svg`.

---

## FINISH SEQUENCE (next session)
1. Get Higgsfield auth (CLI login or fresh-session MCP).
2. Generate + wire the 6 polished webps (above).
3. `npm run validate-data` (diagrams still resolve) → `npm run preflight` to green.
4. **Commit** (operator gates; enumerate paths, **no AI/Claude trailer**). One commit for the whole
   /science batch: the `i18n-src/**` (14 locales × 6), `static/data/science/**`,
   `static/data/science-index.json`, `static/diagrams/science/**` (svg+webp), the schema, the two test
   files, `scripts/essays/build-lab-systems-science-sketches.mjs`, `docs/adr` n/a, the docs/wip briefs,
   `docs/adr/TA.md` (doc-counts), `static/data/i18n/*` bundles.
   Suggested msg: `feat(science): 6 Physics-Lab-derived encyclopedia articles + diagrams (#32)`.
5. Do NOT push (operator-gated).

## Context / rules to remember
- Model tier is the only i18n quality lever; translations were gap-filled (haiku→sonnet ladder).
- The two grand-hero commits (`72149344a2`, `8e7ff292ed`) are already in on `mobile-fixes` — this batch
  sits on top, uncommitted.
- `hf` = Hugging Face on this machine; the Higgsfield binary is `higgsfield`.
