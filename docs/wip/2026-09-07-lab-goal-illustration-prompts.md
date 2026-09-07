# Higgsfield brief — Lab goal illustrations, all 25 goals (G · #536)

The Higgsfield MCP doesn't authenticate in Claude Code CLI — run these in the
Claude **web app** (same as the /science diagrams), one batch. Hand back the
raw files named `<goal-id>.<ext>`; I convert to webp and stage them into
`static/images/lab/goals/_staging/` for your per-image review at
**`/dev/lab-illustrations`** on the dev server (Approve there writes the
manifest + provenance automatically).

Operator decisions baked in: all 25 goals · locked "sketched Wired" style ·
**NO TEXT in the art** (the register badge + i18n carry the semantics — this
also keeps the set ×14-clean).

**Reference sketches (operator correction 2026-09-07):** the 12
geometry-bearing goals carry a deterministic SVG reference each — freestyle
generation reliably breaks orbital geometry (ellipse tangency, the Apollo
figure-eight, phase arcs). Marked **[REF]** in the table; the PNGs live at
`docs/wip/essay-diagram-sources/lab-goals/<goal-id>.png` — attach as the
reference image (`role: image`) for those 12. The 13 painterly scene goals
run freestyle (a sketch would constrain without correcting anything there).

## Settings (every image)
- Model: **nano_banana_pro** · aspect **16:9** · resolution **2k**
- [REF] rows: attach `lab-goals/<goal-id>.png` as reference. Others: none.
- For [REF] rows append to the prompt: "Follow the attached schematic's
  geometry and composition exactly — reinterpret its line art in the style;
  do not change orbit shapes, tangencies or path topology."

## The locked style prefix (use verbatim on every prompt)
> A hand-drawn editorial feature illustration for WIRED magazine — art-directed,
> not a clean computer diagram. Elegant, confident hand-sketched ink linework
> with light cross-hatching and a few loose construction strokes. Deep
> midnight-navy ground with subtle printed-paper grain and a faint blueprint
> grid ghosted behind the art; luminous cyan linework, warm-cream highlights, a
> single warm-amber glow accent. Spare, atmospheric, sophisticated — a
> beautiful magazine science spread, not busy. Not photorealistic, not a flat
> vector chart. ABSOLUTELY NO TEXT, no labels, no lettering, no numbers
> anywhere in the image. Subject:

Then append the subject line:

| goal-id | Subject |
|---|---|
| launch-a-rocket | a slender rocket at the instant of liftoff, exhaust plume blooming beneath it, gantry falling away, the curve of Earth faint below |
| scale-a-rocket | three rockets of wildly different sizes side by side in silhouette, the largest towering, propellant tanks ghosted through their skins |
| reach-orbit **[REF]** | a rocket's ascent arc bending from vertical into a closed orbital ellipse around Earth, the turn traced as one continuous confident stroke |
| land-on-earth | a blunt capsule descending under three domed parachutes toward an ocean, glow of entry heat fading above it |
| motion-first-principles | an astronaut adrift beside a wrench floating mid-throw, equal-and-opposite motion implied by their diverging paths |
| reach-the-moon **[REF]** | a translunar trajectory arcing from Earth to a waiting Moon, the transfer ellipse ghosted, spacecraft tiny on the arc |
| land-on-the-moon | a spidery lunar lander on final descent above cratered ground, engine glow lighting the dust, Earth small in the black sky |
| get-to-mars **[REF]** | Earth and Mars on their sun-centred orbits with the tangent transfer ellipse bridging them, the Sun's amber glow at centre |
| land-on-mars | a capsule under one huge parachute above a rust-toned cratered plain, sky-crane rockets sketched firing below |
| land-on-venus | an armoured spherical probe sinking through crushing layered clouds, glow of heat and pressure all around |
| land-on-titan | a small probe under a tiny drogue chute drifting through thick orange haze toward a dim frozen shoreline |
| probe-jupiter | a heat-shielded probe plunging into towering cloud decks of a gas giant, no surface below, banded storms swallowing it |
| engines-of-the-world | a rocket engine in cutaway half-silhouette, turbopump and bell nozzle sketched, exhaust plume as one amber-lit stroke |
| land-on-mercury | a lander braking on pure rocket fire over a scorched airless cratered surface, an enormous Sun dominating the black sky |
| touch-small-world | a tiny spacecraft touching a rubble-pile asteroid so small its horizon curves sharply away, dust drifting weightless |
| leave-the-solar-system **[REF]** | a lone probe crossing outward past the last planet orbits, the Sun shrunk to a bright star behind, hyperbolic path unbending |
| moon-phases **[REF]** | the Moon repeated in an arc across the frame through its phases, crescent to full, Earth's shadow geometry ghosted |
| choose-an-orbit **[REF]** | Earth ringed by nested orbit ellipses of different heights and tilts, one highlighted in amber as the chosen path |
| catch-the-iss **[REF]** | the ISS sketched in solar-panel silhouette with a small capsule closing along a rendezvous spiral beneath it |
| observe-the-sky | a low horizon with a hand-sketched star field above, one bright planet marked by an amber glow, sight-lines rising from a small observer |
| plan-a-mission **[REF]** | a mission's full arc in one frame: launch, orbit, transfer ellipse, arrival — a single continuous journey line across the system |
| flying-computer **[REF]** | a rocket mid-ascent with its guidance arc traced ahead of it, the steering vector sketched as a confident correcting stroke |
| landing-computer **[REF]** | a lander hovering on a throttled engine above the surface, its descent-rate curve ghosted beside it easing to zero |
| entry-computer **[REF]** | a lifting capsule banking through entry plasma, its steered corridor sketched as a narrowing channel to a target |
| apollo-round-trip **[REF]** | the full Apollo figure-eight: Earth and Moon with the free-return trajectory looping around both, capsule tiny on the path |

## After generation
1. Hand the ~25 raw images back (any folder/zip).
2. I run `sharp().resize(1600).webp({quality:86})` → `_staging/<goal-id>.webp`.
3. You review at `/dev/lab-illustrations` — Approve/Reject per image
   (Approve = manifest + provenance + your approval timestamp).
4. I author the 25 alt texts ×14 (the fail-closed gate demands them before
   anything ships), re-run gates, commit.

Garbled/off-style results: reject in the review UI and we regenerate just
those — never ship a bad one, never regenerate the whole batch.
