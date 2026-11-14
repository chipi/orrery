# UXD-034 — The Worlds: an orbiter's panel has a DETAIL tab ("The spacecraft"); "Stand here" opens on the photograph

- **Status**: accepted (built; checked by unit tests, e2e on three projects and screenshots, not yet by the operator)
- **Date**: 2026-11-14 (proposed 2026-11-13, decided and built)
- **Decider**: the operator, 2026-11-14 — the recommendations of `docs/wip/2026-11-13-slice-D2-brief.md` §12 approved as written ("Ok with all 12": D-decisions 4a, 5a, 6a, 7a); "don't touch heroes ... what we have now is good" (2026-11-14)
- **Answers**: WM1 and W6 of the UX feedback plan; slice D2 (W6 is the point [UXD-007](UXD-007-panorama-opens-facing-the-photo.md) decided; this record is its build and audit)
- **Builds on**: [UXD-007](UXD-007-panorama-opens-facing-the-photo.md), [UXD-018](UXD-018-panel-shell-and-actions.md) (the panel order, the hero below the action row), [UXD-030](UXD-030-worlds-selected-orbiter-stays-visible-and-framed.md) (a selected orbiter stays visible beside its panel)
- **Changes**: `src/lib/surface-map/build-panel-tabs.ts` and `panel-tabs.ts` (`kind`, `details`), `src/lib/surface-scene/site-anatomy.ts` (orbiter rule), `SiteLandingPanel.svelte` (`heading`), `SurfaceScene.svelte` (DETAIL body; `enterPanorama` ends a running fly-in), `EarthObjectPanel.svelte` (DETAIL tab), `src/types/earth-object.ts` (`fleet_refs`), `src/types/surface-site.ts` (`photo_span_deg`), `PanoramaCompassRose.svelte` (`data-yaw`), `static/data/surface-hotspots.json`, `messages/*.json` (one key), tests listed in Verification

## Context

**WM1.** All 19 Moon and Mars orbiters have a story file that is `null`, yet twelve of them showed a tab called STORY (the craft's cutaway was found by `siteAnatomy`) and drew the cutaway under "On the surface", for a craft that never touched a surface. Five more had a drawing the panel hid: two because the `STAYED_IN_ORBIT` filter (which keeps an orbiter out of a *lander's* panel) also dropped the orbiter's own site (Mars 3 orbiter, Viking 1 orbiter), three because the site row has no `fleet_refs` (Clementine, MAVEN, Hope). Earth's panel showed no drawing at all.

**W6.** The panorama opens at `entry_yaw_deg` (0 when absent). The brief counted 13 of 30 panoramas with one. The audit below read all 30 first frames.

## Decision

1. **Orbiters get a DETAIL tab (decision 4a).** `buildSurfacePanelTabs({ kind: 'orbiter' })` swaps STORY for DETAIL (`panel_tab_detail`, the existing key; DETAILS in de) and shows it when the site has a drawing. STORY comes back beside it only if an orbiter ever gets a story (`orbiter-detail.data.test.ts` names the orbiter that does). Landers keep STORY and "On the surface".
2. **The heading is "The spacecraft"** (`site_spacecraft_heading`, the one new key, 14 locales by hand from the glossary's spacecraft forms already used for `fly_opening_role_spacecraft`). The DETAIL body is the craft's drawing, its exploded cutaway when it has one, and the fleet link, as the STORY body drew them; no landing sheet (no orbiter has one).
3. **The 9 Earth objects with a drawing get the same tab (decision 5a)** (ISS, Tiangong, Hubble, Chandra, XMM-Newton, Clementine, Chang'e 2, JWST, Gaia: the objects whose `fleet_refs` name a drawn craft). The Earth-object data already carried `fleet_refs`; the type now says so.
4. **Orbiters show their own drawing (decision 6a).** `siteAnatomy` skips the lander filter when the site's `kind` is `orbiter`, and falls back to the site id when the row has no `fleet_refs`: Mars 3 orbiter, Viking 1 orbiter, Clementine, MAVEN and Hope gain a DETAIL tab; TGO and Tianwen-1 orbiter have no drawing and no tab. 17 of 19 orbiters have it. No data row and no image added.
5. **The photo stays first, below the action row (decision 7a).** Header, action row, hero (the first gallery image), tabs, body, unchanged; the guard test `surface-panel-order.spec.ts` asserts the hero precedes the tab row on every Moon and Mars site that has a gallery. Venus has no site gallery until slice D3, so its guard is armed but judges nothing yet.
6. **No hero image, hero slot or gallery order is changed** (operator, 2026-11-14).
7. **"Stand here" opens on the photograph, and the audit.** A new `panorama_metadata.photo_span_deg: [from, to]` (yaw degrees, increasing, wrapping through 0 when from > to) names where the photograph sits on the 18 panoramas that have a horizontal gap; the 12 full-width ones have none. `panorama-entry.data.test.ts` checks that the opening yaw (`entry_yaw_deg`, else 0) is inside the span and clear of its edge by min(35°, 40 % of the span) (the view is 70° wide; a 50° photograph can only be centred), that every `unphotographed` wedge already in the data has a matching span, and that the list of 18 is the audited list.

### Audit of the 30 panoramas

Method: a contact sheet of all 30 first frames with the opening yaw drawn (a 70° box), read by eye; the horizontal span read from the data's own `unphotographed` wedge (12 sites) and, for the six Earth pads, from the vertical edges of the pasted photograph (found by column differences, checked by eye).

| Result | Sites |
|---|---|
| Full-width band, no span (12): any yaw is on the photograph; apollo12, 14, 15 and opportunity have a hand-set "best view" yaw, the rest open at 0. The vertical partials among them (apollo11, curiosity, perseverance, change4) have pitch 0 inside the band | apollo11, apollo12, apollo14, apollo15, curiosity, perseverance, phoenix, spirit, mars-pathfinder, opportunity, change3, change4 |
| Partial, yaw already inside the photograph, clear of the edge (9) | apollo16, apollo17, luna9, luna17, change5, change6, zhurong, chandrayaan3, slim (hand-set yaws, centred) |
| Partial, a narrow wedge, yaw 0 inside the photograph (2) | viking1-lander 287.5..270, viking2-lander 300..270 |
| Earth pads, partial, yaw 0 inside the photograph (6) | baikonur-1-5 295..65, baikonur-31-6 260..100, jiuquan-slc-43 285..75, sriharikota-slp 285..75, vandenberg-slc-4e 304..55, wenchang-lc-101 265..95 |
| **Fixed: Insight** (1) opened 20° from the end of its photograph, so a third of the view was the unphotographed wedge | `entry_yaw_deg: 160`, on the lander deck (photograph 340..270) |

`panorama-entry-yaw.mjs` was not re-run with `--write`: it reports apollo12, apollo14, apollo15, opportunity, zhurong and slim as "full" (the gap graticule is texture) and would delete their hand-set yaws.

### A second cause found by the e2e: the fly-in

The e2e on the camera the user gets failed for baikonur-1-5 (opened at yaw 180, not 0), wenchang (207) and change6 (296, not 176), on the first run, with the data right. `enterPanorama` set `camT` and `camP`, but a fly-in still running from selecting the site (about 1.5 s) overwrote them every frame, so the panorama opened on the globe's longitude when "Stand here" was pressed soon after the site was selected. `enterPanorama` now ends the fly-in (`flyActive = false`). After the fix the same three pass.

## Consequences

- One new key in 14 locales (`site_spacecraft_heading`); its hash is in `en-source-hashes.json`. `programs_on_surface` stays (landers, `/programs/<id>`).
- Orbiter and Earth-object panels have a `data-testid="panel-tab-details"` tab; `PanoramaCompassRose` carries `data-yaw` (the rounded camera yaw), which the e2e reads.
- `panorama-entry-yaw.mjs` is unchanged; `photo_span_deg` is set by hand (the `unphotographed` wedge, or the pasted photograph's edges) and the data test holds the two together.
- Not done: the vertical position of every photograph against the horizon is checked by eye only (the Earth pads and the Moon bands include pitch 0); a panorama set with a different photo span per entry would open at the first entry's yaw (no site has a set).

## Verification

Unit: `build-panel-tabs.test.ts` (orbiter DETAIL, STORY back with a story, landers unchanged), `site-anatomy.test.ts` (orbiter rule, id fallback, lander filter kept), `orbiter-detail.data.test.ts` (19 orbiters, none has a story, the 5 hidden drawings shown, TGO and Tianwen-1 without), `panorama-entry.data.test.ts` (spans, wedge agreement, Insight red at yaw 0 and green at 160). E2E on desktop-chromium, mobile-chromium and mobile-landscape-chromium: `surface-orbiter-details.spec.ts` (8 orbiters, TGO, 2 landers, Hubble and ISS), `panorama-entry.spec.ts` (the 18 partial panoramas and a `?yaw=` deep link that still wins), `surface-panel-order.spec.ts` (hero before the tabs: Moon, Mars; Venus armed), `a11y-orbiter-details.spec.ts` (DETAIL open in en, ar, ru: 0 critical or serious). Screenshots read at 1440 x 900 and 390 x 844: LRO, MRO and MAVEN DETAIL, Apollo 11 STORY, Hubble DETAIL, "Stand here" at Insight and Baikonur 1/5. Not run: a real device, Firefox and WebKit, `preflight:coverage`.
