# Surface object index — searchable orbit/land list (Mars / Moon / Earth)

**Status:** implemented (0.7.2), uncommitted. Design note for the searchable
index feature added to the three surface routes.

## Context / need
The surface routes (`/mars`, `/moon`, `/earth`, all via `SurfaceScene.svelte`)
let you select an object only by clicking a dot in the 3D scene (or via
`?site=`/`?object=` deep-links + a screen-reader-only list). There was no
visible, searchable way to browse "what's in orbit and on the ground" for a
body. This adds one, modeled on the ISS "modules" UX: a desktop toggle + a
mobile drawer tab surfacing a filterable, logo-badged list; a row click flies
the camera to the object and opens its detail card.

## What shipped
- **Adapter** — `src/lib/surface-map/surface-index.ts` (+ `.test.ts`, 19 cases).
  Pure `toIndexItems(sites, earthObjects, body)` normalises the two data shapes
  (Mars/Moon `SurfaceSite`; Earth `EarthObject`) into one `IndexItem`
  `{id, name, agencies[], domain:'orbit'|'land', category, year, status, regime?,
  color?, body}`, plus `filterIndexItems` / `indexAgencies` / `indexStatuses`.
- **Panel** — `src/lib/surface-scene/SurfaceIndexPanel.svelte`: search box +
  Domain (orbit/land) · Agency (logo chips) · Era · Status filters + a
  scrollable row list. Layout-agnostic (fills its container). Reuses
  `matchesQuery`, `splitAgencies`, `AgencyBadge`; filter model mirrors `/fleet`.
- **Wiring** — `SurfaceScene.svelte`: a `body` prop, a reactive
  `indexEarthObjects` mirror (the cache is non-reactive), `indexItems` derived,
  a desktop left edge-handle + side panel (`@media hover:hover and pointer:fine`),
  and an `Index` `MobileDrawerGroup` tab. A row calls
  `selectSite(id, { face: true })` (camera fly + detail open + URL sync).
- Routes pass `body="mars|moon|earth"`.

## Key decisions
1. **Year buckets, not launch date** — no `launch_date` exists in the data
   (0/85); the filter uses the existing `year`/`launched` as era buckets.
2. **Orbit + land, with an orbit/land filter, on all bodies.** Discovery: Earth
   already loads **launch sites** (`getEarthLaunchSites`, on land) alongside
   satellites (in orbit), so the filter is meaningful on Earth today. Mars/Moon
   split by `kind` (surface/orbiter). The `domain` field in the adapter is the
   single seam for adding more Earth land-type locations later.
3. Master→detail: desktop keeps the list open on select (detail opens right);
   mobile closes the drawer to reveal the scene.

## Notes / future
- **i18n**: all 12 new UI strings are translated into the 13 non-en-US locales
  (in `messages/<loc>.json`).
- **Desktop panel placement**: follows the ISS modules drawer
  (`top:152; left:12; bottom:12; width:min(320px, …)`) so it sits UNDER the
  top-left view controls without overlapping them.
- **URL params**: intentionally not added — the index is a transient overlay and
  selection already syncs via `?site=`/`?object=`.
- **Earth land-type locations**: the adapter already maps `domain:'land'`, so
  future ground locations beyond launch sites slot in with no consumer change.

## Verification
- Unit: `surface-index.test.ts` (adapter + filters). e2e: `surface-index.spec.ts`
  (desktop handle → search → row → detail; landscape drawer tab).
- Manual: `/mars`, `/moon`, `/earth` desktop (edge-handle) + landscape (Index tab).
