# Mobile polish audit — 375px, release-grade sweep (2026-08-02)

Branch: `mobile-fixes`. Method: dev server on `:5401`, headless chromium at
375×812 (@2x, isMobile), screen-by-screen. Screenshots in `/tmp/mobile-audit/`.

Each item is tagged **[AUTO]** (I can just fix it) or **[INPUT]** (needs your
creative decision — the question is stated). Nothing here is optional.

---

## A. `/explore` — the three seeds + what the sweep confirmed

### A1. Solar-system INDEX is a bottom button, not the left pullout tab **[INPUT]**
- Evidence: in the **zoomed-out Stellar-Neighborhood context**, `INDEX` is
  ALREADY a vertical **left pullout tab**. In the default **solar-system**
  context it's a bottom-row button (`RULER · CONTROLS · ▶MISSIONS · INDEX`).
  So the target pattern already exists in the same route.
- Proposed: make solar-system INDEX the same left pullout tab.
- **Your input:** should the left pullout tab *replace* the bottom INDEX button
  in solar-system view (fully consistent with zoom-out), or should INDEX stay in
  the bottom bar AND gain the pullout? And should this pullout-tab pattern also
  apply on the body-scene pages (earth/moon/mars/venus), which today also have a
  bottom `INDEX` button?

### A2. Distance card overlaps the bottom bars **[AUTO]**
- The bottom of solar-system view is two stacked bars (button row + SCALE/time
  playback). The selected-body distance card floats over them. Fix = reposition
  / raise above the bars / respect safe-area. I'll reproduce the exact selection
  and fix the stacking.

### A3. Zoom-out (Stellar Neighborhood / Milky Way) top is overcrowded **[INPUT]**
- Evidence: below the nav there's a breadcrumb (`‹ Solar System › Stellar
  Neighborhood`) PLUS two rows of context chips (`Constellations · Deep Sky ·
  HR Diagram · Light cones`). Three stacked header rows eat the top third.
- Also **right-edge overflow**: `HR Diagram` chip and star labels
  (`PROXIMA CENTAUR`, `RIGIL KENTAURUS`) run past the 375px edge.
- **Your input:** how to declutter the header? Options: (a) horizontal-scroll
  the chip row (one line), (b) collapse chips into a single "Layers" pullout,
  (c) merge breadcrumb into the nav, (d) auto-hide chrome on idle. The
  right-edge label overflow itself is **[AUTO]** (clamp/wrap).

---

## B. Cross-scene inconsistencies

### B1. Body-page top toggles are inconsistent three ways **[INPUT/verify]**
- `/moon`, `/mars`: `2D · RESET VIEW · PAUSE SPIN · SKY` (full set)
- `/earth`: `RESET VIEW · PAUSE SPIN · SKY` — **missing `2D`**
- `/venus`: `2D · RESET VIEW · PAUSE SPIN` — **missing `SKY`**
- **Your input:** are these intentional (e.g. no `SKY` view for Venus, no `2D`
  for Earth for a reason), or should all four bodies carry the same toggle set?
  If intentional, I'll leave them; if not, I standardize.

### B2. Toggle-label drift: `2D`/`3D` and `PAUSE SPIN`/`SPIN` **[INPUT]**
- Body pages: `2D` + `PAUSE SPIN`. Station pages (`/iss`, `/tiangong`): `3D` +
  `SPIN`. Same concept, different labels.
- **Your input:** pick the canonical labels — is the toggle "2D/3D" or a single
  "Flatten/Globe"? Is it "SPIN" or "PAUSE SPIN" (state vs action naming)? I'll
  standardize once you choose.

### B3. Bottom-bar action sets differ by scene **[INPUT]**
- solar `RULER · CONTROLS · ▶MISSIONS · INDEX`; body `RULER · LAYERS · SCAN ·
  NATIONS · INDEX`; station `LIST · ASSEMBLY · MODULES`. Some divergence is
  legitimate (different content), but the shared actions (INDEX, RULER) should
  be positioned/styled identically.
- **Your input:** confirm which actions are meant to be universal vs
  scene-specific, so I standardize the shared ones and leave the rest.

---

## C. Text / overflow bugs **[AUTO]**

### C1. `/fly` shows `Eart` — truncated "Earth"
- The ORRERY DEMO destination label reads `Eart` (clipped). Text-overflow /
  width bug on the destination string.

### C2. Right-edge label overflow in `/explore` zoom-out (see A3)
- Star labels + one chip run past the viewport edge.

---

## D. Minor / verify

### D1. `/plan` — "Touch & hold to peek" hint overlaps porkchop corner **[AUTO/verify]**
- Floats over the plot's bottom-right axis area. May be intentional; verify then
  clamp inside the plot or move to a caption.

---

## E. Screens confirmed clean (375px, this pass)
`/home`, `/missions`, `/fleet`, `/science`, `/programs`, `/library`, `/posters`,
`/patches`, `/plan` (aside D1). Scrollable, responsive, breadcrumb + card/grid
pattern, no overlaps.

## F. Captured, final confirmatory read pending
`/gallery`, `/catalog`, `/essays`, `/learn`, `/credits`, `/colophon`,
`/sourcing`, `/live` — all content/gallery-type pages that follow the same
clean scrollable pattern confirmed on 8 sibling pages. Screenshots in
`/tmp/mobile-audit/`; I'll do a final read-through to close the inventory, but
no scene-page-class overlaps are expected here.

---

## DECISIONS (locked with operator, 2026-08-02)

- **A1** — INDEX becomes the **left pullout tab everywhere**: solar-system AND all
  body pages (earth/moon/mars/venus); remove today's bottom INDEX button.
- **A3** — context chip row → **one line** under the breadcrumb (horizontal
  scroll). **Move `HR Diagram` + `Light cones` into the science lens**
  (ScienceLensBanner/ScienceLayersPanel) — they're hardcore-science overlays;
  leave `Constellations · Deep Sky` as the two default chips. **Breadcrumb** →
  compact `‹ current-level` (drop the full path); collapse into nav only if
  still too heavy.
- **B1** — body-page top toggles standardized to one set across all bodies.
- **B2** — label = **"SPIN"** (not "PAUSE SPIN"); **2D/3D toggle shows the
  target state** (in 2D the button reads "3D" → tap goes to 3D).
- **B3** — **fixed semantic slots** bottom bar: `[Measure][Overlays][Highlight]
  [Scene]`, same positions every scene, empty slots hidden, INDEX = left pullout.
- **Everything standardized to look the same** across scene types; only
  genuinely different *content* actions differ, but follow the same layout/style.

### Typography (task #15)
- Essays correctly use `--font-editorial` (by design — no change).
- Fix undefined tokens: `StationAssemblyControl` (`--font-stack`→`--font-mono`),
  `programs/[id]` (`--font-sans`→ **operator call: mono (UI-consistent) vs
  editorial (reads like essays)**).
- Review `IBM Plex Mono` in fly/CoastScene/bold-arrow (canvas text).
- Systemic: 454 hardcoded `'Space Mono'` vs ~15 `var(--font-mono)` — enforce the
  token so the locked design system is actually used.

## Split for you

**I can just do (AUTO):** A2, B1, C1, C2, D1, plus the right-edge-overflow half
of A3.

**Needs your input (INPUT):** A1 (pullout replaces vs coexists; apply to body
pages?), A3 (declutter strategy), B2 (canonical toggle labels), B3 (universal vs
scene-specific actions).
