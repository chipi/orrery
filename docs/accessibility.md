# Accessibility statement

*Orrery · target conformance: **WCAG 2.1 Level AA** · last reviewed 2026-07-09 · tracked in RFC-031 / ADR-025*

Orrery is a canvas- and WebGL-heavy solar-system explorer, which is historically the *hardest* kind of web app to make accessible. We treat accessibility as a first-class requirement, not an afterthought, and this statement is an honest account of where we conform, where we don't yet, and how to reach us.

## Conformance target

We target **WCAG 2.1 Level AA**. The app is built to be operated with **keyboard alone**, by a **screen reader**, and by a **TV D-pad remote** — one shared interaction model (a remote is a keyboard: ←→↑↓ + Enter/Back), so a fix for one surface is a fix for all three.

## What's supported

**Keyboard & remote — everything is reachable without a mouse.**
- Every interactive control is keyboard-operable (WCAG 2.1.1) with no keyboard traps (2.1.2).
- The top navigation is a **roving toolbar** — one Tab stop, ← → / D-pad move across it.
- Long lists and grids (missions, fleet, posters, station modules, surface sites) use **roving tabindex** so arrows / the D-pad move *within* the group instead of tabbing through every item (2.4.3 Focus order).
- **Canvas objects are reachable by keyboard** — the part ADR-025 originally deferred. Each 3D/2D scene has a DOM index of its selectable objects: the `/explore` **body index** (Sun, planets, small bodies), the surface **site index** (`/moon` `/mars` `/earth`), and the `/iss` · `/tiangong` module lists. Selecting a row does exactly what a canvas click does — no pointer required.
- **Visible focus** on every control (2.4.7), thickened further under the TV 10-foot layer.

**Screen readers.**
- Landmarks (`<nav>`, `<main>`, complementary panels), honest `aria-label`s on every canvas describing what it shows and how to reach details, WAI-ARIA **tabs** and **radiogroup** patterns on panels and filters, and `aria-live` regions announcing dynamic data and load failures (4.1.2, 4.1.3).

**Motion & contrast.**
- **Reduced motion** (2.3.3, 2.2.2): `prefers-reduced-motion: reduce` stops all *unsolicited* motion — auto-orbit, auto-play, auto-rotate — while user-initiated motion still works.
- **High-contrast mode** toggle in the nav.

**Targets & internationalisation.**
- Interactive targets meet the 44 × 44 px minimum (2.5.5); dense diagrams use expanded invisible hit-pads.
- 14 locales, browser-detected, including a right-to-left language (Arabic).

## Known limitations (and how we mitigate them)

- **3D scenes are pointer-driven for *manipulation*** (orbit / pan / pinch-zoom). We do **not** claim keyboard camera control yet — instead, every *object* those scenes contain is selectable from the DOM indexes above, and every fact is available in the panels. So the content is fully reachable; free-flying the camera by keyboard is future work (RFC-031 S4).
- **Screen-reader narration of the live 3D view** is limited to the honest canvas label + the object indexes; we don't read every object's changing position aloud (it floods). Focusing an index row announces that object.
- We have **not** completed a full third-party audit; conformance is self-assessed against automated (axe-core) + manual keyboard / screen-reader / contrast testing.

## Assistive technologies tested

Keyboard-only navigation and VoiceOver (macOS/iOS) on the latest Safari and Chrome; Android TalkBack and a D-pad remote on the Google-TV build.

## Feedback

Found a barrier? Please open an issue at **[github.com/chipi/orrery/issues](https://github.com/chipi/orrery/issues)** with the page, what you were trying to do, and your assistive tech + browser. Accessibility regressions are treated as bugs, not enhancements.

---

*This statement is versioned with the code (`docs/accessibility.md`) and updated as conformance changes. See RFC-031 for the roadmap and ADR-025 for the original tier-1 contract.*
