# Handover — PRD-031 Video & Live Feeds: docs + S0 spine (2026-07-16)

Single-session. Everything below is on the working tree (branch `content`),
**nothing committed, nothing pushed** — awaiting Marko's review.

## What landed

### Design docs (both wired into their indices; VitePress strict build green)
- **PRD-031** (`docs/prd/PRD-031.md`) — Video & Live Feeds. Two phases: P1 curated
  in-gallery videos (link-embed, provenance-first); P2 `/live` (ISS pin + launch
  broadcasts off `$lib/launches`). 9 locked decisions, non-goals fenced.
- **RFC-033** (`docs/rfc/RFC-033.md`) — technical design closing PRD-031: the
  `video-provenance` manifest, the hand-rolled click-to-load `<MediaPlayer>`
  facade, the live-feed pipeline, validators. Slice→section map.

### S0 — the manifest spine (no UI), all green
- `static/data/schemas/video-provenance.schema.json` — manifest schema (sibling
  of link/image provenance).
- `scripts/video-channel-allowlist.ts` — official agency channels + curated
  trusted-third-party (each needs a fair-use rationale). Fail-closed gate.
- `scripts/build-video-provenance.ts` — reads `video-sources.json`,
  allowlist-checks, canonicalises URL, hashes `vid-<12>` id, emits the manifest.
  `npm run build-video-provenance` wired into the `fetch` chain.
- `static/data/video-sources.json` — curated seed (author input).
- `static/data/video-provenance.json` — generated manifest (4 entries).
- `src/lib/video-provenance.ts` + `.test.ts` — runtime resolver
  (`getVideo` / `getVideosForEntity` / `embedUrlFor`, privacy-preserving embeds,
  no autoplay). **14/14 tests pass.**
- `scripts/validate-data.ts` — new `validateVideoProvenance` + a fail-closed
  integrity pass (channel ∈ allowlist, ids unique), summed into the exit code.
- `static/data/schemas/{mission,fleet-entry}.schema.json` — extended with an
  optional `videos:[{id}]` array (existing files stay valid).
- 4 entity refs wired: `apollo11`, `perseverance`, `chandrayaan3` (missions) +
  `starship` (fleet).

### Green status (local)
- `validate-data` ✓ (`4 video entries — channels allowlisted, ids unique`)
- resolver vitest ✓ 14/14 · `typecheck` ✓ 0 errors · `typecheck:scripts` ✓ ·
  eslint on the new files ✓ 0 problems.

## The seed (all oEmbed-verified official channels)

| Entity | Family | Clip | Channel | Kind | id |
|---|---|---|---|---|---|
| apollo11 | mission | Restored Apollo 11 moonwalk — first steps | NASA | milestone | vid-612cd0489c9c |
| perseverance | mission | Descent & touchdown on Mars | NASA | edl | vid-54cee894b509 |
| starship | fleet | Starship SN15 high-altitude test + landing | SpaceX | milestone | vid-f9fd2a71d5f8 |
| chandrayaan3 | mission | Soft-landing live telecast | ISRO Official | landing | vid-654cc435c4dd |

**oEmbed verification is load-bearing.** The `?url=…&format=json` oEmbed
endpoint returns `author_name` (the real uploader). Generic YouTube search is
dominated by re-uploads: across this session the "official" hits included JP
Major, Ahmad Saad, VideoFromSpace, CBS News, Cosmosphere, SciNews, WION, and
even Narendra Modi's channel — none first-party. **Verify every clip's
`author_name` against the allowlist before it enters `video-sources.json`.**

## Decisions locked with Marko

- Link + embed only (zero hosted bytes); in-app player default, never redirect.
- Click-to-load facade mandatory (no eager iframes) — e2e-enforced later.
- Hand-rolled player, no dependency. Loss-of-life footage → click-through
  interstitial (built in S3).
- `videos:[{id}]` on entity JSON (authored placement) + curated rows in a single
  `video-sources.json`. Channel allowlist = official + trusted-third-party.
- Seed = iconic-firsts, global spread (added ISRO now, not NASA-only).

## Deferred / next

- **Challenger + Columbia** (`content_advisory: loss-of-life`) — Marko wants them
  authored now, but **no STS-51-L / STS-107 mission entities exist yet**. They
  need their entities first; author with the S2 curated set (schema + gate are
  already ready for the advisory path).
- **Entity-ref resolution check** in validate-data (every `videos[].id` resolves
  in the manifest) — deferred to S1 when the gallery UI consumes refs. Today the
  resolver looks up by `entity_id`, so a dangling ref is low-risk in S0.
- **Build-script negative test** (assert an un-allowlisted channel aborts the
  build) — worth adding; the logic is covered by the passing integrity run but
  not by a dedicated fixture.
- **Next slice = S1**: `<MediaPlayer>` facade + gallery interleave on missions
  end-to-end + `/credits` Video section (RFC-033 §5/§6/§8).

## S1 — player + gallery interleave + credits (shipped locally, green)

The first slice with pixels. RFC-033 §5/§6/§8.

- `src/lib/components/MediaPlayer.svelte` — the click-to-load modal facade.
  Poster tile (in the gallery) → click → nocookie iframe (autoplay appended
  only on the click). content_advisory interstitial (loss-of-life / graphic).
  Capture-phase Escape so it closes the player, not the underlying Panel.
- `$lib/video-provenance.ts` — `posterUrlFor()` added (hosted poster →
  youtube thumbnail fallback → null placeholder). Tests now **17/17**.
- `MissionPanel.svelte` — loads `getVideosForEntity(mission.id)`; video tiles
  interleave at the head of the GALLERY grid (play badge + duration chip);
  the tab now shows when videos exist even with no photos; clicking a tile
  opens `<MediaPlayer>`.
- `src/lib/styles/panel-tabs.css` — shared `.video-thumb / .video-play /
  .video-duration / .video-poster-fallback` (fleet/other panels inherit in S2).
- `src/routes/credits/+page.svelte` — a **Video** section (mirrors the audio
  block): title · channel · agency · license/fair-use · watch link.
- 7 player/credits i18n keys added to `messages/en-US.json` (en-US only —
  the 14-locale translate pass is a follow-up; runtime falls back to en-US).

### S1 green (local)
- Perf contract **proven programmatically**: `.vp-overlay iframe` count = **0
  at rest**, **1 after click** (RFC-033 V-B — no eager iframes).
- resolver vitest 17/17 ✓ · `typecheck` 0 errors ✓ · eslint on the 4 changed
  source files ✓ 0 problems · i18n:compile ✓.
- Screenshots (on ~/Desktop): gallery video tile, player open (real NASA
  nocookie embed), credits Video section.

### S1 follow-ups
- **Translate the 7 new UI keys** ×14 locales (separate i18n pass).
- **e2e spec** asserting the no-eager-iframe contract + tile-opens-player (the
  RFC-033 §13 e2e; proven by script today, not yet a committed spec).
- **S2**: roll `videos:[{id}]` to launch-site / fleet / landing-site panels
  (fleet panel interleave + schema extensions), broaden the curated set +
  author the Challenger/Columbia advisory clips once their entities exist.

## S2 — roll to more families + poster strategy (partial, green)

- **Fleet + launch-site families wired** — `FleetEntryPanel.svelte` interleaves
  videos exactly like `MissionPanel` (it's rendered by both `/fleet` and
  `SurfaceScene` Earth launch-site markers, so one wiring covers both). Starship
  launcher shows its SN15 tile.
- **`VideoThumb.svelte`** — the resting facade tile extracted into a component
  (DRYs mission + fleet; will serve landing-site too). Poster = provider
  thumbnail (we do NOT host — see decision), lazy + async, with an `onerror`
  fall back to a **pure-CSS gradient** so a dead/slow thumbnail CDN can never
  show a broken image, hang, or otherwise affect the page.
- **Credits Video section now has thumbnails** (64px, mirrors the image rows) +
  the same `onerror` graceful hide.

### Poster decision (locked with Marko)
- **Do NOT host posters.** Investigating "host through the image pipeline"
  surfaced a conflict: a hosted poster is a still *frame* of the video —
  fine for PD clips, but for copyrighted clips (SpaceX, ISRO) it (a) breaks the
  link-not-host principle and (b) fails the image-provenance PD/CC license gate.
  Marko's call: **provider thumbnail + generic CSS-gradient fallback; a thumbnail
  outage must not impact performance in any way.**
- Proven: with `i.ytimg.com` fully blocked, the tile renders the gradient
  fallback, zero broken images, page stays interactive.

### S2 green (local)
- typecheck 0 errors · eslint on the 5 changed files 0 problems · resolver
  17/17 · validate-data 4 entries green.

### S2 landing-site family — DONE (all 4 families now wired)
- `SurfaceScene.svelte` interleaves videos into the landing-site gallery
  (loads `getVideosForEntity(site.id)`; `VideoThumb` tiles; `MediaPlayer`;
  `buildSurfacePanelTabs` gallery tab shows when videos exist). `surface-site`
  schema gains `videos:[{id}]`. Proven on the Chang'e-4 `/moon` site.
- **Four families complete:** mission · fleet · launch-site (both via
  FleetEntryPanel) · landing-site (SurfaceScene).

### Curated set — 8 clips, 5 agencies
Apollo 11 moonwalk (NASA) · Perseverance EDL (NASA) · Curiosity 7-min-terror
animation (NASA/JPL) · Starship SN15 (SpaceX) · Falcon Heavy demo (SpaceX) ·
Chandrayaan-3 landing (ISRO) · Rosetta/Philae (ESA) · Chang'e-4 far-side (CNSA
via CGTN). All oEmbed-verified official uploaders.

### Credits poster fix
Credit-row thumbnails were `loading="lazy"` and never fired on the long
`/credits` page (0/7 loaded) — made them eager, 7/7 render.

### Still open (follow-ups, not blockers)
- **JAXA touchdown clip** — Hayabusa2/Ryugu footage is dominated by re-uploads
  (SciNews etc.); needs a native-language (ja) sourcing pass to find JAXA's own.
- **Challenger/Columbia advisory clips** — need their mission entities authored
  first; schema + interstitial gate are ready.
- **One video → one entity** — the `vid-<hash(provider|ref)>` id means a clip
  can't be attached to two entities (build fails on duplicate id). Fine today;
  revisit if we want cross-entity sharing.
- **i18n (7 UI keys ×14) + the e2e no-eager-iframe spec** — DONE in S3 (below).

## S3 — finish + harden Phase 1 (done)

- **i18n**: 10 player + credits UI strings translated into all 13 non-en
  locales via `translate-v07-ui.mjs` (Claude API). Verified + compiled.
- **e2e**: `tests/e2e/video-media.spec.ts` — asserts the RFC-033 V-B facade
  (0 iframes at rest, exactly 1 on tile click), capture-phase Escape closes the
  player not the Panel, and the `/credits` Video section renders with source
  links. 2/2 green (ran against dev via `PLAYWRIGHT_BASE_URL`).
- **a11y**: `cc_load_policy=1` on the YouTube embed auto-shows captions when the
  source has them (the caption path for linked, not-hosted video).
- **docs fix**: RFC-033 §8 corrected — linked video is disclosed on `/credits`
  (the third-party/reused surface), NOT `/colophon` (original-works only). The
  earlier draft mis-placed it.

**Phase 1 (curated gallery videos) is complete.**

## Phase 2 — Live feeds (done)

- **New `live` video kind** + a NASA ISS **live-pin** (`entity_kind: 'live-pin'`,
  `awQzjn72bI0`, oEmbed-verified NASA) in the manifest (70 clips now).
- **`$lib/live-feeds.ts`** — `getLiveFeeds(now)`: unions the ISS pin (embeddable,
  click-to-load facade) with launch broadcasts derived from `$lib/launches`,
  **time-gated on scheduled `net` vs the real `now`** (not the snapshot's stale
  `webcast_live`): `imminent` T-60min→T-0, `live` T-0→T+30min, else dropped.
  `deriveLaunchFeedState` is pure + unit-tested (7). `getNextLaunch` powers the
  empty state.
- **`/live` route** — ISS hero (facade + red LIVE badge) + a time-gated launch
  section. Launches **link out** (the manifest has the launch-detail URL, not the
  stream URL — embedding is the one deferred follow-up: extend the LL2 adapter to
  carry `vidURLs` → `webcast_url`). Honest empty state: "No launches live right
  now — next up: <name> at <time>".
- **i18n**: 10 `/live` strings translated ×13. **e2e**: `/live` facade test added
  (3/3 green). **prerender**: `/live` added to `SEED_ROUTES`.

### Entry points into /live (done — was previously URL-only)
- **Nav**: `/live` added under the Catalog group (desktop dropdown + mobile
  drawer) + a `/catalog` hub card with a live-broadcast icon (RouteCardGrid).
- **Launch calendar → /live**: a "live now" pill on the `/missions` launch banner
  when any launch is live/imminent (`deriveLaunchFeedState`), scoped to launches
  (not the always-on ISS, which would make it permanent).
- **/iss → 'Watch the ISS live'** link; **/live → 'full launch calendar'** link.
- 5 nav/cross-link strings translated ×13.

### P2 deferred (noted, not blocking)
- **Embed launch webcasts** — needs `fetch-launches` + the LL2 adapter to capture
  `vidURLs` into a `webcast_url` field, then re-fetch. Currently link-out.

**The PRD-031 / RFC-033 video + live-feeds epic is functionally complete** (P1 +
P2), pending the two deferrals above and a push.

## Content expansion — 65 clips across 9 agencies (all oEmbed-verified)

Widened the curated set well beyond the S2 seed (Marko: "well-curated coverage
we're proud of", Mars/Moon epic by default, non-US focus). Agency spread:
NASA 31 · CNSA 9 · SpaceX 6 · ESA 6 · JAXA 5 · Roscosmos 4 · ISRO 2 ·
Blue Origin 1 · CSA 1.

Highlights: all major Mars landings (InSight/Spirit/Opportunity/Phoenix/Viking/
Pathfinder/Tianwen-Zhurong), Moon (Apollo 8/12/13/15/17, Chang'e 3/4/5/6, SLIM,
Chandrayaan-3, Artemis II), modern reuse (Falcon 9 first landing, Starship
Mechazilla catch, New Glenn), deep-space flybys (Voyager 1/2, Cassini, New
Horizons, Juno, Galileo, DART, OSIRIS-REx, Parker, Dawn), Shuttle (STS-1,
orbiter landing), stations (ISS timelapse, Tiangong + first EVA, Mir, Salyut 1,
Skylab), observatories (Hubble, JWST, Gaia), Soviet firsts (Gagarin, Leonov's
spacewalk), JAXA (Hayabusa1/2, Akatsuki, H3), ISRO (LVM3), and Chris Hadfield's
"Space Oddity" on the ISS.

**Sourcing discipline held throughout:** every clip's uploader was verified via
the YouTube oEmbed `author_name` against the channel allowlist. Re-uploads were
rejected wholesale (JP Major, VideoFromSpace, SciNews, WION, Narendra Modi, CBS,
Cosmosphere, The Sun, APOD Videos, NOVA, "The Launch Pad", …). New official
channels added to the allowlist: CGTN, Blue Origin, JAXA (full name), NASA KSC/
Goddard/STI, JHU-APL, Роскосмос ТВ, Chris Hadfield (first-party astronaut).

Multiple clips per entity now supported (Starship ×2, Tiangong ×2, ISS ×2).

### Held / follow-ups (unverified or blocked, NOT authored)
- **Ed White (Gemini 4) + McCandless (STS-41-B) spacewalks** — footage only found
  on the "NASA Video" channel (ambiguous authenticity); needs a clean NASA-main-
  channel source. Iconic; worth a targeted retry.
- **Apollo-Soyuz 1975** — same "NASA Video" issue.
- **Chandrayaan-1, Mangalyaan** — no ISRO-Official upload passes oEmbed.
- **Luna 9 / Luna 16** — no Roscosmos-official upload found.
- **Long March-10B first booster recovery (10 Jul 2026)** — verified on CCTV, but
  no matching fleet entity (needs a `long-march-10` entity created first).

## Commits (branch `content`, not pushed)
- `5fb06b4b` feat(video): linked-video media layer (S0–S2)
- `02e50c97` content(video): broaden curated set — ESA, NASA/JPL, Falcon Heavy
- `fd638fb4` fix(video): credits posters were lazy-gated and never loaded
- `b15a0b34` feat(video): landing-site family + Chang'e-4 (CNSA) — 8 clips, 5 agencies

## Tracking

- Epic tracking issue filed: #413.
  tracking issue). Awaiting Marko's go.
