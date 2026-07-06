# Image sources to integrate (2026-07-06)

First-party / official image sources Marko found during the off-subject
re-source effort. These beat Commons keyword-search (which poisoned `juice` →
orange juice). Goal: add each as a **primary source adapter** in
`scripts/agency-mission-sources.ts` (currently NASA-API only → else Commons),
tried BEFORE the Commons failover, filtered by the new fetch quality-gate.

## The sources

| Source | URL | Access | License (VERIFY per-image) | Best for |
|---|---|---|---|---|
| **NASA on Unsplash** | https://unsplash.com/@nasa | Unsplash API | Unsplash License (free, no attribution required) | NASA missions, hero-grade |
| **SpaceX on Unsplash** | https://unsplash.com/@spacex | Unsplash API | Unsplash License | SpaceX (official moved here) |
| **SpaceX Flickr** | https://www.flickr.com/photos/spacex/ | Flickr API | SpaceX releases **CC0 / public domain** | SpaceX launches, hardware |
| **NASA galleries** | https://www.nasa.gov/gallery/ | HTML scrape | **Public domain** (US Gov) | recent missions (e.g. blue-origin-blue-moon-mark-1), KSC/shuttle history (ksc-history) |
| **ESA photo library** | https://photolibrary.esa.int/albums/ | HTML scrape / API? | ESA standard (usually **CC BY-SA 3.0 IGO** — attribution) | ESA missions (JUICE, Rosetta, Mars Express, BepiColombo, ...) |

Marko-flagged standouts: `nasa.gov/gallery/blue-origin-blue-moon-mark-1/`,
`nasa.gov/gallery/ksc-history/` (spectacular shuttle imagery).

## Licensing — the gating concern (the pipeline enforces CC/PD + credit + no-watermark)

- **NASA gov / NASA-on-Unsplash**: public domain / free — cleanest.
- **SpaceX Flickr**: SpaceX explicitly releases CC0 — cleanest.
- **SpaceX/NASA on Unsplash**: the *Unsplash License* is permissive (free, no
  attribution required) but is NOT strictly CC0/PD — confirm it clears the
  pipeline's CC/PD bar (`validate-data` license allowlist) before shipping, and
  record the right `license_short`/`license_url` in provenance.
- **ESA photo library**: usually CC BY-SA 3.0 IGO → attribution REQUIRED; must
  land the ESA credit in provenance + on /credits.

Every adapter must return, per image: `image_url`, `title`, `author/credit`,
`license_short`, `license_url`, `source_url`. No credit → don't land it.

## Integration approach (reusable adapters)

1. Extend `AgencyPrimarySourceTag` + `fetchAgencyPrimaryImageUrls` with per-source
   adapters. Each takes `{ missionId, agency, name/target }` → candidate list.
2. Order of preference per mission/agency (extend `WIKIMEDIA_*_FALLBACK` idea):
   agency-official (NASA gov / ESA portal) → agency-Unsplash/Flickr → Commons.
3. All candidates flow through the **fetch quality-gate** (score-and-reject
   infographics/diagrams/people/off-subject) already wired into
   `fill-gallery-gaps` — so a bad official image is still dropped.
4. API keys: Unsplash + Flickr need app keys (add to `.env`; document in the
   image-pipeline guide). NASA gov + ESA are scrapes (fragile — pin selectors +
   snapshot-test).

## Suggested priority

1. **Unsplash (NASA + SpaceX)** and **SpaceX Flickr** — clean public APIs +
   permissive licenses → highest value, lowest effort. Covers SpaceX + modern NASA.
2. **NASA galleries** scrape — public domain, great for recent missions + KSC history.
3. **ESA photo library** — the ESA-mission fix (JUICE, Rosetta, ...); scrape +
   CC BY-SA attribution handling.

Each is a self-contained adapter = a permanent investment, reused by every
future fetch + the 98-image re-source batch.
