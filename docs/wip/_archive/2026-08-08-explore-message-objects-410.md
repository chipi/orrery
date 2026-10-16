# #410 — /explore message-object trajectories (Voyager/Pioneer/New Horizons + their messages)

*2026-08-08 · second of the four post-RFC-036 /explore v2 features. Built after #258.*

## What it is

The outbound interstellar craft — Voyager 1 & 2, Pioneer 10 & 11, New Horizons —
now surface a **"message to the cosmos" panel** from their PATHS trajectory /
legend row, carrying the culture door for the message each holds (Voyager Golden
Record, Pioneer Plaque), an honest **where-is-it-now / where-is-it-heading /
signal-reach** readout, and a **direction indicator** in the 3D scene.

## The key finding that shaped scope

Recon showed **~70% of #410 already existed**: all five craft trajectories are
already in the PATHS layer, ʻOumuamua is in small-bodies, and the culture-door
catalogue (incl. the `objectType:"message"` Golden Record + Arecibo doors, with
i18n blurbs in 12 locales) was already there — but the two message doors were
**orphaned** (no scene object / panel consumed them). So #410 was mostly
**connect-what-exists**, plus honest panels and one reframed visual.

## What was infeasible as the issue literally described

The issue asked to draw the craft "as polylines **crossing into the neighborhood
field**." Verified impossible to do honestly: the solar scene clamps everything
past ~150 AU to a 512 px shell (`scale.ts`), the neighborhood scene is true
parsecs (`neighborhood-scene.ts`), and Voyager 1 at 172 AU = **0.0008 pc** — a
dot on the Sun at neighborhood scale; the nearest star is ~1.3 pc away. **Honest
substitute (Slice C):** a short arrow continuing the craft's real final heading
in the solar context, capped by a `→ <star>` label — point, don't draw a
dishonest to-scale line.

## Slices

- **A — MessagePanel + wiring.** New `MessagePanel.svelte` (over the shared
  `Panel` + `CultureDoorCard`). A Today-marker click / legend-row click on an
  interstellar craft opens it instead of the MissionPanel, with a "Full mission
  details" hand-off. Craft detection: trajectory `category` contains
  `interstellar-bound` (host, canvas click) / an explicit id set (page, legend).
- **B — signal-reach.** One-way light-time derived from the (corrected) current
  distance; rendered as honest prose in the panel.
- **C — direction indicators.** `buildIconicTrajectory` gains a `→ <star>` label
  + short heading arrow at the Today endpoint, gated on `data.heading?.star`.
- **D — framing, fact-check, i18n.** Pioneer Plaque culture door added (so the
  Pioneers carry a message too); species-level framing carried by the culture-
  door blurbs; content fact-checked + all strings localized to 14 locales.

## Data changes

- `static/data/trajectories/{voyager-1,-2,pioneer-10,-11,new-horizons}.json` —
  added `agency`, `culture_object_id` (voyager/pioneer), `heading{star,
  constellation}`; **refreshed stale current-distance** on the three live craft
  (see fact-check below).
- `static/data/culture-doors.json` — added `pioneer-plaque` (objectId `pioneer`)
  + `i18n-src/*/culture-doors/pioneer-plaque.json` (14 locales).
- `messages/*.json` — 12 new UI/heading keys × 14 locales.

## Fact-check (science-reviewer gate) — corrections applied

The reviewer caught real errors before ship (this is why the gate exists):
- **Voyager 1 distance was stale** — 165 AU (mid-2024) → **172 AU / ~23.8 lh**
  (NASA: reaches one light-day from Earth 18 Nov 2026). Also refreshed
  **Voyager 2 → 143 AU** and **New Horizons → 66 AU** (2026 sources). Positions
  + "Today" waypoints scaled to match.
- **Pioneer Plaque blurb** "four years before Voyager" → **five** (1972→1977).
- **Voyager 2 heading** "~40,000 yr" → **~42,000 yr**.
- **Pioneer 10 heading** reworded — "crossing Aldebaran" implied a close pass;
  it's a directional drift, not a flyby prediction like the Voyager encounters.
- The two Pioneers' distances are left as honestly-caveated extrapolations
  ("last contact 2003" / "signal lost 1995") — no longer tracked live.

## i18n translation audit

Machine translation mis-rendered the obscure constellation **Camelopardalis** in
3 locales — **ja** カメレオン座 (Chamaeleon) → きりん座, **zh-CN** 麒麟座 (Monoceros)
→ 鹿豹座, **sr-Cyrl** a "Гliese" star-name corruption → "Gliese". Fixed. The
other four constellations (Andromeda / Taurus / Aquila / Sagittarius) were
audited across all 13 locales and are correct.

## Verified

- Live: Voyager 1 panel (172 AU, 23.8 lh, Gliese 445 heading, Golden Record),
  Pioneer 10 (Pioneer Plaque, Aldebaran), New Horizons (no-message note,
  Sagittarius); direction labels render in-scene (`→ Lambda Aquilae`,
  `→ Aldebaran`).
- `svelte-check` 0 errors.
- **e2e green on both projects** — `tests/e2e/explore-message-panel.spec.ts`
  (craft-with-message opens panel + door; Pioneer Plaque; New Horizons no-message)
  `10 passed` incl. the #258 regression, on `desktop-chromium` + `mobile-chromium`.
  Mobile needed the "Missions" drawer opened + the mobile legend row wired to the
  same MessagePanel routing (both legend blocks patched).
- Preflight: [filled after run].

## Slices F + G (added to scope on request)

- **F — ʻOumuamua → Vega inbound-radiant vector.** A `← Vega` label + short arrow
  at the inbound asymptote of the ʻOumuamua hyperbola (it arrived from the
  direction of Vega/Lyra). Added in `explore-solar-scene.ts` as a CHILD of the
  interstellar arc so it inherits the layer toggle; reuses the exported
  `buildDirectionLabelSprite`. Data: `inbound_radiant: "Vega"` on the oumuamua
  small-body. `orbitPts[0]` is the inbound asymptote (verified against
  `sampleOrbitPoints`). Schematic, like the arc — a radiant cue, not a to-scale
  line to Vega (25 ly). No new i18n (label is a proper noun).
- **G — Arecibo message at M13.** Rather than a floating beacon, the orphaned
  `arecibo-message` door is repointed to **M13** — its actual 1974 target. M13
  is a photo-less deep-sky object, so `enterDeepSky` now opens a **flat**
  (non-immersive) panel for photo-less objects that carry a culture door, and
  `DeepSkyPanel` gained a `children` slot to render the door via `CultureDoorCard`.
  Clicking M13 (or `?deepsky=M13`) surfaces the Arecibo message with its honest
  "any reply would take 50,000 years" caption. No new i18n (reused the existing
  Arecibo blurb, 14/14 locales).

## NOT done / deferred

- No signal-*sphere* visualization — signal-reach is honest prose, not a viz
  (matches the approved mock).
- F's `← Vega` label is code-verified + visible in-scene, but a pixel-clean
  screenshot of the text wasn't captured (run-to-run camera non-determinism);
  worth an eyeball on the real build.
