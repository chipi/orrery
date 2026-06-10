# /fly Cinematic Shot Language — Guide for Polish Waves

> Compiled 2026-06-10 to gate the next /fly polish wave (post v0.7 Cassini
> hero-shot pass). Reference principles for camera, composition, light,
> and pacing on the /fly route. Quote in polish PRs and code review. The
> meta-rule below is the standing test: every choice serves it.
>
> **Meta-rule:** make the viewer feel small in the presence of something
> ancient and large. Real spacecraft, real trajectories, real geometry —
> the discipline is to frame that genuine substance the way Cassini's
> "Day the Earth Smiled," Cowboy Bebop's Jupiter Gate, Planetes' wrench
> drift, and 2001's docking sequence in silence all do it.

---

## Principles (the rules that don't change)

### P1. Space is dark, not black
A pure `#000` sky is the #1 amateur-CG tell. Real deep-space photography
has structure: zodiacal light, galactic plane gradient, stellar
parallax dust. Use a faint warm-cool gradient + sparse stars + a Milky
Way hint. Cowboy Bebop paints this; JPL Eyes On bakes it as a cubemap.

### P2. One hard light, one soft fill, nothing else
The Sun is one source. Bounce comes from planet albedo lighting the
shadow side. Two-key-light setups read as studio product CG. Sun
direction must be consistent across foreground, midground, background.

### P3. The silhouette test
At 64×64 black-on-white, the spacecraft + planet + motion vector must
still be readable. NASA mission art passes this; the Cassini-Saturn
hero shot is recognizable at thumbnail size. Composition that fails
silhouette cannot be saved with shading.

### P4. Three layers of depth, minimum
**Foreground** (spacecraft, antenna, instrument) /
**midground** (the body being approached, its rings, its moons) /
**background** (star field, distant Sun, distant other body).
Two layers feels like a screensaver. Galileo-Jupiter shots always
include Io or Europa as midground anchor.

### P5. Scale is communicated by reference, not size
You don't feel Jupiter's scale by rendering Jupiter. You feel it when
a 10-pixel spacecraft hangs against a limb that fills 80% of frame
and the limb is still curving out of view. Containment kills awe;
**let the limb arc out of frame**.

### P6. Motion has weight when camera disagrees with subject
Interstellar's Endurance moves slowly; the camera drifts in a
parallax arc disagreeing with the ship's motion vector — reads as
massive. Camera locked-rigid to the ship reads as a toy on a string.

### P7. Logarithmic time around mission events
Closest-approach is 90 seconds in real life. Cinema stretches it to
30 seconds of screen time. The cruise weeks compress to 3 seconds.
Music, sound, and camera moves all stretch in and contract out.

---

## Tactics (Three.js implementations)

### T1. CameraRig abstraction
Build a rig object: `{ target, lookAtOffset, boomLength, boomYaw, boomPitch, fov }`.
Animate the rig, not the camera directly. Enables:
- **Parallax tilts** — animate boomYaw while target locked
- **Dolly push** — animate boomLength while fov holds
- **Focal-length zoom** — animate fov while boomLength holds (gives JPL's
  "telephoto compression" feel — flattens depth, more cinematic)

Default FOV: 40–55° vertical for cruise (~35–50mm equiv), 15–25° for hero
close-ups (~85–135mm equiv). The telephoto end is what makes JPL
renders read as massive.

### T2. Rule of thirds
Spacecraft on the **left or right vertical third**, never centred. Planet
limb arcs through opposite third + bottom edge. Stars and Sun occupy
the diagonal negative space. Implement as a runtime invariant during
cinema phase: assert spacecraft screen-X is in `[0.30, 0.40]` or
`[0.60, 0.70]`; nudge boomYaw if outside.

### T3. Limb-grazing pass
Closest-approach window: constrain camera so planet limb is **tangent
to one screen third**. Place planet center off-frame such that the
limb crosses the vertical third line. Spacecraft grazes within 5–10%
of viewport-width from the limb. This is the Cassini-Saturn hero
composition.

### T4. Asymmetric Freytag flyby pacing
Replace the symmetric "25 days before / 25 days after" with a 3-stage
pyramid:

| Stage | Window | Camera | FOV | On screen |
|-------|--------|--------|-----|-----------|
| Approach | T−25d → T−5d | Slow dolly-in, boom shrinks 30% | 45° → 30° | Planet grows midground → limb-filling; ship tiny lower-third |
| Peak | T−5d → T+2d | Boom yaw arcs 60–90°, parallax around ship | 30° → 18° | Limb-grazing; ship hero, planet silhouette wall |
| Departure | T+2d → T+25d | Long slow pull-out, FOV widens | 18° → 50° | Ship recedes; melancholy register |

**Departure should be 3–4× longer in screen-time than approach.** The
"afterglow beat" 99% of amateur sims skip — JPL Cassini end-of-mission
lingers ten beats after the burn.

### T5. Lighting rig
```
DirectionalLight (Sun) — intensity 3–5 (PBR), color #fff4e8, castShadow
HemisphereLight — sky #08101a, ground #000, intensity 0.05–0.10
AmbientLight — DO NOT USE
```
Add a **planet-bounce light** on the spacecraft only: a second
DirectionalLight pointing from planet → spacecraft, intensity scaled by
`(planet_albedo / dist²)`, color tinted by the planet body (warm for
Jupiter/Saturn, cool blue for Neptune/Uranus, ochre for Mars).

### T6. Rim light from the limb
When spacecraft is in the cinema window AND between Sun and planet,
add a Fresnel-based rim shader on the spacecraft material — brightens
grazing-angle pixels with a warm tint. In Three.js: `MeshStandardMaterial`
with `onBeforeCompile` fresnel injection, or a separate `ShaderMaterial`
pass. **#1 visual signature of cinematic spacecraft.**

### T7. Post-processing stack
Use `EffectComposer` with this order:

1. `RenderPass` — base scene
2. `UnrealBloomPass` — radius 0.4–0.6, threshold 0.85, strength 0.3–0.5.
   Sun + plumes bloom; planets do not (clamp HDR).
3. `BokehPass` — focal distance = ship distance, aperture 0.0001–0.0005,
   max blur 0.005. **Subtle.** Stars just slightly defocused.
4. `FilmPass` (or custom grain) — noise 0.05–0.10. Below conscious
   perception but above zero. **More impact than any other post effect.**
5. `VignettePass` — offset 1.0, darkness 0.6.
6. `THREE.ACESFilmicToneMapping` on renderer; `toneMappingExposure 1.0–1.2`.
   **Single most important line for cinematic feel** — HDR Sun → SDR display.

### T8. Skydome with structure
Replace solid-black with a cubemap skydome: sparse star field (Hipparcos-
weighted magnitudes), faint Milky Way band, near-imperceptible warm
gradient toward ecliptic. Lazy-load — stub starfield on initial paint,
promote to full skydome on first cinema frame.

### T9. Particle dust
50–200 sparse particles (≤2 px), additive blend, lit by Sun, emitted
along ship motion vector during cinema. Conveys velocity. Dense
particles read as snow — keep sparse.

### T10. Lens flare — almost never
Only when Sun is in frame AND deliberately invoking "spacecraft camera
POV." Single subtle anamorphic streak, not a JJ-Abrams light show. Tune
Three.js `Lensflare` addon to ≤30% default intensity.

### T11. Engine plume glow
During burn events (TCM, capture, departure): billboarded sprite, additive
blend, soft-falloff radial gradient, tinted by propellant chemistry
(blue-white hypergolic, orange solid, faint blue ion). Intensity from
burn-magnitude data. The mission-art leitmotif: small orange spark
against planet limb.

### T12. Performance budget
60fps on 2020 MacBook Air → 16.6ms/frame.
- Scene render ≤8ms
- Bloom ≤2ms (half-res)
- DoF ≤2ms (quarter-res CoC)
- Tonemap + grain + vignette ≤1ms
- Headroom 3.6ms

Drop DoF first on mobile. Drop bloom radius next. **Never drop
tonemapping** — costs almost nothing, provides almost everything.

---

## The Checklist (a shot ships when it passes all 8)

1. **Silhouette test** — readable at 64×64 black-on-white?
2. **Three-layer test** — foreground / midground / background each at
   distinct depth?
3. **Limb-rim test** — planet limb arcs across one screen-third with
   spacecraft silhouetted against it (at least one shot per flyby)?
4. **Single-source-light test** — every lit pixel consistent with one
   Sun position? No second key, no flat ambient?
5. **Negative-space test** — ≥30% of frame is "empty" deep space?
6. **Camera-disagree test** — camera doing something the ship is not
   (parallax / dolly / FOV breath)?
7. **Scale-reference test** — second body (moon, ring, distant planet)
   in frame, OR limb gracefully exits frame?
8. **Logarithmic-pacing test** — closest-approach has more screen-seconds
   than equal-time cruise? Departure ≥3× approach in screen time?

---

## Anti-patterns

- Pure `#000` sky
- Whole planet centred, fitting frame (wallpaper feel)
- Ambient light flattening shadow contrast
- Two key lights (product-render feel)
- Camera locked to ship's motion (toy-on-string feel)
- Symmetric flyby timing (departure = approach = boring)
- No post-processing stack (raw WebGL = cutscene feel)
- Lens flare every frame
- Oversaturated planet textures
- Spacecraft fully lit with no rim
- Single FOV across cruise + flyby
- Dense particle effects (snow feel)
- Centred spacecraft on every frame
- Music-less hold shots <2 seconds (the hero pull-out wants 5–8)

---

## Reference set
- NASA/JPL Eyes On Solar System (open source at github.com/nasa)
- NASA mission art prints: Cassini-Saturn, Galileo-Jupiter, Pioneer 10/11,
  Juno-Jupiter, Europa Clipper concepts
- Cowboy Bebop ep. 5 — Jupiter approach sequence
- Planetes — OP + EVA sequences
- Interstella 5555 — Daft Punk / Toei, sci-fi composition rules
- 2001: A Space Odyssey — docking, opening
- Interstellar — Endurance shots (Double Negative VFX breakdowns
  document the camera-disagree principle)
- Cassini Imaging Team (Space Science Institute) — limb-grazing photos
- Wired magazine — Cassini end-of-mission illustrations
- Three.js postprocessing community examples
