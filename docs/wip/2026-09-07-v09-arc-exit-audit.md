# v0.9 Physics Lab arc — exit audit + handover (H7 · #464 / #458)

Date: 2026-09-07 · Version: `0.9-wip` (operator: more lands in 0.9 later; **no release tag**).

## Exit audit vs PRD-033 A01.5 ("MVP = the ENTIRE ladder")

A01.5's definition of done is full coverage of the ladder, not a subset. Audited:

| Criterion | State | Evidence |
|---|---|---|
| Every goal, both families | ✅ | `GOALS.size = 25` |
| Full kernel capability coverage (incl. gas-giant / micro-g) | ✅ | `pendingCapabilities() === []`, both directions armed (`capability-manifest.test.ts` — DOMAIN + DESCENT_BODY) |
| Formula registry | ✅ | 64 `FormulaDef` entries |
| Mechanics domain + kernel purity gate | ✅ | landed S1/S2 |
| Lab views (Notebook + Canvas) | ✅ | C/S5 on main |
| MCP server — full tool surface | ✅ | gate lifted (H6); `deriveTools` = 64, ids ≡ registry keys; defaults-only call on every tool computes |
| MCP OAuth 2.1 + allowlist | ✅ | E (#534) |
| T4 ask-box · T3 illustrations | ✅ | F (#535) · G (#536) |
| Attribution/credits (slice I) | ✅ | data-sources + tech-bom + colophon + original-work |

**Verdict: the arc satisfies the A01.5 exit bar.**

## What H delivered (beyond the original 6-slice epic)

H1 comment-truth (false gate/compute claims) · H2 armed compute-budget guard · H3 the
never-existed TLE refresh workflow · H4 injected-input plumbing (R1: iss-pass TLE resolved at
compute time, never a user/share-link input) · H5 TLE staleness disclosure (`epochAgeDays` vs
`staleAfterDays`, ×14) · H6 gate lift (all 64 tools) · **H-a** propagation-math verification
(first-principles geometry tests) · **H4c** TLE consolidation to the served `/data` overlay + one
resolver, no browser→Celestrak egress (ADR-091) · **H-b** AR-sky staleness disclosure.

Local commits (mobile-fixes, not yet pushed): H2 `fba6c93d4d` → H3 `e964c1963e` → H4 `66915cab32`
→ H5 `ba9d9c5c82` → H6 `2d5046111c` → H-a `f975751804` → H4c `40e5eb68ff` → H-b `6500d3c9e1`
→ H7 (this). (H1 `2813438f11` + slice-I i18n `88aef24c82` already on main.)

## NOT DONE / pending (honest)

**Operator-gated (push):**
- `git push` mobile-fixes → main (the whole H arc is committed locally, awaiting the push signal).
- After push lands green on CI: close **#464** and **#458**; reconcile the **#458** epic checklist
  (its body still shows the stale 6-slice S1–S6 list, all unchecked, "queued behind v0.8").

**Deploy day (VPS, never done for the new backend):**
- DNS: `lab-api.orrerylearn.com` + `mcp.orrerylearn.com` → VPS.
- Secrets onto VPS: OAuth client secret, JWT signing key, allowlist (operator gmail). LiteLLM path
  already live (`proj-orrery-lab`, smoke-tested).
- `chown` lab-api state dir · Caddy vhosts · `docker compose up -d` (lab-api + mcp) · Google OAuth
  consent redirect URIs + sign-in acceptance.
- CORS/CSP: nginx CSP `connect-src` includes lab-api (fixed, 7a6343dfcf); confirm the **staging**
  origin is allowed too if the ask-box is exercised on Pages.
- `ops/refresh-prod-data.sh` now also refreshes `static/data/station-tles.json` every 6h — will run
  on the next deploy's cron install.

**Separate scope (not smuggled in):**
- AR sky pass-hint (`formatPass`) is **English-only by existing design**; the H-b staleness suffix
  matches. Fully localizing that hint ×14 is its own task.
- Higgsfield ×25 illustration batch (operator-owned, deferred) — brief in
  `docs/wip/2026-09-07-lab-goal-illustration-prompts.md`.
- ADR index backfill (086–090 missing from `docs/adr/index.md` — pre-existing drift; 091 added).

**Hard constraint:** no release tag for 0.9 (operator, repeatedly).
