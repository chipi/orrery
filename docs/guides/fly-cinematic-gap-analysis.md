# /fly Cinematic Gap Analysis — Current State vs Shot-Language Guide

> Compiled 2026-06-10 after the Cassini hero-shot polish landed. Cross-
> references the standing shot-language doc
> ([fly-cinematic-shot-language.md](./fly-cinematic-shot-language.md))
> against the four lifecycle moments of a /fly mission:
> **Start / Cruise / Flyby / Landing**. Each row is a checklist principle;
> each column is where we are right now and what gets us to "good enough
> to ship on YouTube next to a National Geographic flyby."
>
> Quote the gaps as PR rationale in the next polish wave.

---

## Lifecycle moments
1. **Start** — mission load → camera converges on Earth → Launch (T+0)
2. **Cruise** — post-Launch interplanetary coast
3. **Flyby** — each cinema sub-phase (T−25d → T+25d around a planetary flyby)
4. **Landing / Arrival** — final destination contact (Saturn OI for Cassini,
   the Mars descent for a lander mission, the lunar touchdown for Apollo)

---

## Checklist scorecard

### P1. Space is dark, not black
| Moment | State | Gap |
|--------|-------|-----|
| Start  | Solid `#000` sky with sparse stars | Add cubemap skydome with Milky Way + ecliptic gradient |
| Cruise | Same | Same |
| Flyby  | Same | Same — most critical here, the limb shot needs the bg gradient |
| Landing| Same | Same |

**Action:** ship a baked TychoSkymap-style cubemap, lazy-promoted on
first cinema frame. T8 in the guide.

---

### P2. One hard light, one soft fill, nothing else
| Moment | State | Gap |
|--------|-------|-----|
| Start  | `PointLight(0xfff4d0, 3.5, 2000, 1.2)` + `AmbientLight(0x111133, 0.8)` | **Ambient light is the #1 anti-pattern.** Replace with HemisphereLight at intensity 0.05–0.10 |
| Cruise | Same | Same |
| Flyby  | Same — no planet-bounce light on spacecraft | Add per-frame DirectionalLight aimed planet→spacecraft, intensity scaled by albedo/dist² |
| Landing| Same | Same |

**Action:** rip out `AmbientLight`. Wire a planet-bounce
DirectionalLight that tracks the active body. T5 in the guide.

---

### P3. The silhouette test
| Moment | State | Gap |
|--------|-------|-----|
| Start  | Earth + ship readable | ✓ Mostly passes |
| Cruise | Ship + trajectory readable but planets not silhouetted | OK — cruise is informational, not heroic |
| Flyby  | Cassini at 64×64: bus + dish recognizable on Jupiter; barely on Venus | Push model scale up slightly OR rim-light so silhouette reads at thumbnail |
| Landing| Saturn rings dominate; ship invisible at 64×64 | **Needs limb-grazing recomposition** (T3) |

**Action:** rim-light shader pass (T6) is the highest-impact single fix
for the silhouette test. Costs ~1 ShaderMaterial; gains a CG → mission-
art jump.

---

### P4. Three layers of depth
| Moment | State | Gap |
|--------|-------|-----|
| Start  | Earth + trajectory + stars (2 layers) | Add the Moon + Sun-as-bright-disc for 4 layers |
| Cruise | Sun + asteroid belt + trajectory tube + stars (3-4 layers) | ✓ Cruise is already strong |
| Flyby  | Ship + planet + (moons if lens on) + stars (3-4 layers) | ✓ With moons-on, Jupiter passes; Venus/Mercury have no moons → add zodiacal dust or distant context planet |
| Landing| Ship + Saturn + rings + stars | ✓ Passes — rings provide the midground anchor |

**Action:** turn moons layer ON by default during flyby cinema for
bodies that have them. For moonless flybys (Mercury, Venus), pull the
Sun into frame at small angular size as a third-layer reference (P5).

---

### P5. Scale by reference, not size
| Moment | State | Gap |
|--------|-------|-----|
| Start  | Earth fully framed | Crop Earth limb. Show only a quarter of Earth, ship in foreground hanging off North Pole |
| Cruise | Wide-angle solar system | ✓ Cruise is correctly scaled — sees Sun, belt, planets in correct proportion |
| Flyby  | Planet at ~40-45% frame width — body still fully containable | **Cinema is too contained.** Let the limb exit frame top + bottom. Reframe to limb-grazing (T3) |
| Landing| Saturn + rings fully visible | Same — let rings exit top of frame; close to Saturn limb |

**Action:** rewrite cinema-target lerp so the planet *centre* drifts
off-frame and the *limb* sits on the rule-of-thirds line. Highest-
impact rewrite. T3 in the guide.

---

### P6. Camera disagrees with subject
| Moment | State | Gap |
|--------|-------|-----|
| Start  | Camera holds while ship leaves Earth | ✓ Disagree works |
| Cruise | Slow azimuthal drift + zoom breathing + tilt drift | ✓ Three layered oscillations — strongest current cinematic moment |
| Flyby  | Camera follows planet-center target with 35% ship bias; ship pushed toward camera | Camera and ship are too correlated. **Add a parallax arc** during the cinema peak — boomYaw sweeps 60–90° as the ship reaches closest approach |
| Landing| Camera lerps to Saturn closeup | Add departure-style slow pull-out after arrival; "afterglow beat" |

**Action:** in the cinema sub-phase, add a `peakOrbitDeg` clip that
sweeps camT by ~60° around the body during the T−5d → T+2d window.
Simplest cinematic upgrade after light. T4 in the guide.

---

### P7. Logarithmic time around events
| Moment | State | Gap |
|--------|-------|-----|
| Start  | 3.5s launch dwell ✓ | Could extend to a slow Earth orbit reveal before the launch dwell ends |
| Cruise | Standard sim-speed | OK as a base rate; cinematic stretching belongs to the event windows |
| Flyby  | Symmetric 25 days before / 25 days after | **Anti-pattern.** Replace with asymmetric Freytag (T4) — approach 20d, peak 7d, departure 25-40d, slowed via sim-speed override during peak |
| Landing| Sim freezes on arrival | Add 5-8s departure-style pull-out on arrival before freeze |

**Action:** introduce a `cinemaSimSpeedMultiplier` per stage so the
3-stage flyby Freytag stretches the peak in screen-time without
touching the underlying physics. Same multiplier on landing afterglow.

---

## Post-processing readiness
We currently have **no post stack**. Single highest-impact addition.

| Pass | Impact | Cost | Priority |
|------|--------|------|----------|
| `ACESFilmicToneMapping` | Massive — instantly cinematic | ~0ms | **Land first** |
| `UnrealBloomPass` | Sun bloom + plume glow | ~2ms | High |
| `FilmPass` (grain) | "It's film not WebGL" | ~0.5ms | High |
| `VignettePass` | Subtle eye-pull | ~0.3ms | Medium |
| `BokehPass` (DoF) | Telephoto compression | ~2ms | Medium — drop on mobile |
| `Lensflare` | One subtle anamorphic streak | ~0.2ms | Low — sparingly |

**Action:** add `THREE.ACESFilmicToneMapping` to the renderer in the
*next commit*. Zero risk, immediate visual upgrade across every shot.

---

## Lifecycle-specific gaps (what to do next)

### Start — the launch
- ✓ Launch dwell holds MET 0 for 3.5s
- ✗ Composition is "Earth fully in frame" — should be Earth limb cropped, ship hanging off the pole
- ✗ No sense of acceleration — ship just departs at sim-speed. Need a brief telephoto compression + camera dolly that conveys *escape velocity*
- ✗ No engine plume glow (T11) at the moment of departure — a 1-second orange burst against Earth's limb would sell the launch

### Cruise — the long coast
- ✓ Layered camera oscillations (cruise drift + zoom breath + tilt drift) are the strongest current cinematic moment
- ✓ Asteroid belt + Kuiper belt visible at correct scales
- ✓ Diamonds-on-path + chip overlay system
- ✗ No engine-burn beats at TCM events (Trajectory Correction Manoeuvres)
- ✗ No mid-cruise "scale beat" — e.g., at the asteroid belt crossing, pause and let the ship drift through the dust field

### Flyby — the hero shot
- ✓ Ship in front of planet
- ✓ Per-body composition variation
- ✓ Boom orientation graceful
- ✓ Chip docks at bottom out of the hero area
- ✓ Anchor rings hidden at closeup
- ✗ **Symmetric pacing** (anti-pattern T4)
- ✗ **Planet centred-and-contained** vs limb-grazing (anti-pattern P5/T3)
- ✗ **No rim-light** on spacecraft (anti-pattern T6)
- ✗ **No parallax disagree** during peak (anti-pattern P6/T4-Peak)
- ✗ Stars + Sun background not richer (anti-pattern P1/T8)

### Landing / Arrival
- ✓ Saturn OI without ARRIVAL banner clutter (just shipped)
- ✗ Composition is "Saturn fully framed with rings around" not "Cassini grazing
  Saturn's ring-plane edge" (the actual mission-art reference)
- ✗ No "afterglow" beat — sim freezes immediately on arrival
- ✗ No engine plume glow during the 96-minute SOI burn
- ✗ No music or sound cue (out of scope for /fly but worth noting)

---

## Prioritised polish-wave-2 plan

Ranked by impact-per-effort. Each item is roughly one commit.

1. **`ACESFilmicToneMapping` on renderer** — zero effort, every shot
   improves. *(2 lines)*
2. **Replace `AmbientLight` with `HemisphereLight(0.05)`** — restores
   shadow contrast. *(3 lines)*
3. **Skydome cubemap** with sparse stars + Milky Way + ecliptic
   gradient — kills the `#000` anti-pattern. *(1 asset + 10 lines)*
4. **Rim-light Fresnel shader on scModel materials** — the single
   biggest "cinematic spacecraft" upgrade. *(1 ShaderMaterial inject)*
5. **Asymmetric Freytag pacing** — 20d approach / 7d peak / 30d
   departure, with a sim-speed dilation during peak. *(30 lines refactor
   in updateHelioAutoZoomTargets)*
6. **Limb-grazing target lerp** — push planet centre off-frame so the
   limb arcs across rule-of-thirds. Highest visual jump after rim
   light. *(15 lines)*
7. **Parallax orbit during peak** — camT sweeps 60° during T−5d to
   T+2d window. Camera-disagree principle. *(10 lines)*
8. **`UnrealBloomPass` post stack** — Sun bloom + plume glow when we
   add plumes. *(15 lines + EffectComposer wiring)*
9. **Engine plume billboard at burn events** — Earth-departure burst,
   Saturn-SOI 96-minute glow. *(20 lines + sprite asset)*
10. **Saturn-OI limb-grazing composition** — per-body camera target
    override that puts Cassini's POV alongside the ring-plane edge.
    *(per-flyby override hook)*

Items 1–4 land "the post stack era" of /fly. Items 5–7 land "the
cinematic shot-language era." Items 8–10 are the polish layer.

---

## When to call the wave done
A polish wave converges when 6 of the 8 checklist items pass at the
hero moment of every flyby + arrival on every iconic mission. Use the
Cassini Saturn-OI moment as the regression test: if it passes the
silhouette test, three-layer test, limb-rim test, single-source-light
test, negative-space test, and camera-disagree test, the wave is
ready to ship.

Current Cassini hero shots pass:
- ✓ Three-layer (with moons-on)
- ✓ Negative-space (mostly)
- ✓ Single-source-light (mostly — ambient still flattens)
- ✗ Silhouette (at 64×64 the ship reads only on Jupiter)
- ✗ Limb-rim (planets are centred + contained)
- ✗ Camera-disagree (ship and camera move together)

**3/8 → 6/8 is the realistic next-wave target.**

---

*Cross-link:*
[fly-cinematic-shot-language.md](./fly-cinematic-shot-language.md)
[../adr/TA.md](../adr/TA.md) — architecture map
[/Users/markodragoljevic/.claude/projects/-Users-markodragoljevic-Projects-orrery/memory/project_fly_cinematic_vision.md](file:///Users/markodragoljevic/.claude/projects/-Users-markodragoljevic-Projects-orrery/memory/project_fly_cinematic_vision.md) — vision memory
