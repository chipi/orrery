# UXD-001 — The UI accent is blue D, and it replaces every UI teal

- **Status**: accepted
- **Date**: 2026-11-09 (teal ruled out, proposed for 0.9.9) · 2026-11-11 (blue D chosen and scoped)
- **Decider**: the operator. Blue D confirmed "after the sheet" (`docs/wip/2026-11-11-ux-feedback-plan.md`
  line 429, commit `9dda8b6813f` "Q1 blue D confirmed"); scope to every UI teal, and science
  diagrams and Lab art keep their own colours, "operator 2026-11-11" (same line). Teal ruled out
  and 0.9.9 named as the redesign arc: operator, 2026-11-09 (memory notes `no-cyan`, `099-redesign`;
  `docs/wip/2026-11-09-0.9.9-redesign.md` line 3).
- **Answers**: X2, G4, Q1; slice A3 (link and accent colour)
- **Changes**: `src/lib/styles/tokens.css` (`--color-teal`, `--color-tier-intro`, `--color-accent-text`);
  IA §shared-tokens (colour tokens, link tier colours); `docs/concept/05_Design_System.md` §2.1 to
  2.2; AGENTS.md "Design system" colour block; UXS-002 and UXS-003 teal HUD and CAPCOM colours.
  *Rules to be updated to state this and link here (UXS-000 §Next).*

## Context

- The operator ruled out cyan and teal for UI states as "out of palette" and "so fake" on
  2026-11-09 (memory `no-cyan`; `docs/wip/2026-11-09-0.9.9-redesign.md` line 7). 0.9.8 replaced
  only the surface-scene states with the muted blue `#889fe7` (marker hover, the ACTIVE status
  tone, the start of the route sol ramp, the 3D outline pass).
- The same teal `#4ecdc4` is the site's brand accent: about 780 uses in 147 files at 2026-11-09
  (`099-redesign` memory), about 640 uses in about 123 files in the slice plan (plan line 329,
  later count). `tokens.css` holds it as `--color-teal` and `--color-tier-intro`.
- The operator's list asks for it directly: links on credits, colophon and library are "a turquoise
  colour"; use the muted blue "used in many places; nothing close to glowing" (X2); the muted blue
  in the gallery footer is "a better choice for coloured text than the turquoise elsewhere" (G4).
  The operator also said to merge the teal redesign into the feedback list (plan line 5).

## Options

Q1 offered two blues (plan line 404): `#889fe7` (status chips, rings) or `#7fb0e0` (gallery,
programs), and asked whether the change covers links only or every UI teal. The operator chose
"blue D", `#5070ff`, after seeing a colour sheet. The sheet is not in the repository; what blues
A to C and the others were is not recorded in the sources.

## Decision

The UI accent colour is **blue D, `#5070ff`**, which is today's global link colour
(`--color-accent-text`). It replaces **every UI teal**: links, HUD chips, home glyphs and panels.
There is no cyan or teal anywhere in the UI.

**Science diagrams and Lab art keep their own colours** (the `/science` diagram style and the Lab
goal art are unaffected; operator 2026-11-09 and 2026-11-11). This is "for now": the operator listed
"review whether they should also move to the new palette once the UI blue is in place" as an
end-of-work check (plan lines 460–463).

## Consequences

- Slice A3 replaces teal in UI files by the token (grep: no teal in UI files outside an allow-list)
  and ends with shots of credits, colophon, library, posters, science and the explore HUD (plan
  line 329).
- Teal that is science data and not UI is outside the rule; the redesign note lists the candidates
  (Moon tidal-lock overlay, Earth limb glow, microgravity axes, Lab canvases, fly velocity arrows,
  universe scenes, `epoch-bands`) and says which stay
  (`docs/wip/2026-11-09-0.9.9-redesign.md` lines 18–22).
- Not decided in any source: the relation between `#5070ff` and the surface scenes' `#889fe7`
  (`HOVER_BLUE`, `src/lib/surface-scene/surface-markers.ts` line 45), which the operator approved
  on 2026-11-09. Listed in UXS-000 §Open.
- The status tones ACTIVE `#889fe7` and PLANNED `#7b9cff` are near-identical; the redesign note says
  to "revisit with the new palette" (lines 23–25). Open.

## Verification

Not guarded yet. The slice's check is a repo-wide search for `#4ecdc4` and `rgba(78,205,196` with a
documented allow-list (plan line 484). No test asserts it today.
