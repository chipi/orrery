# Sensory feedback — cue vocabulary (taste definition)

*Draft for Marko's review. Defines how the sensory layer's **discrete event cues**
feel — the sound each one makes, when it's allowed to fire, and what must stay
silent. Once you've marked this up, I sweep `cue()` across the routes from it.
This is the "80% of the feel" tier (sound everywhere + haptic on mobile); the two
continuous hero sonifications (/fly velocity, /explore Kepler) are separate.*

---

## Principles (the feel we're aiming for)

1. **Confirm, don't announce.** A cue acknowledges *your* action landed — it's the
   click of the brass gear, not a notification. It never volunteers information.
2. **Musical, not mechanical.** Tones sit on a small consonant palette (A4 / C5 /
   G5) so they read as intentional, never as a system beep. The one exception is
   `warning`, which is *meant* to be rough.
3. **Quiet by default.** Peak gain ≤0.14 (≈ well under speech). You should feel the
   layer more than notice it. It ducks to near-silence under narration.
4. **One action, one cue.** Debounced selection fires once. No double-taps, no
   stacking.
5. **Sound is universal; touch is the bonus.** Every cue plays a tone on *all*
   platforms — desktop is the audio-first experience, not second-class. Mobile
   layers a haptic pulse on top (the two senses confirm each other).
6. **Only user-initiated, discrete moments.** Never on hover, scroll, camera
   drag/zoom/tilt, passive animation, autoplay, route navigation, or programmatic
   state (deep-link focus, restore). Pointer-move events stay silent by rule
   (they drive lightweight state only — the render-storm lesson).
7. **Respect the body.** Reduced-motion removes haptics (and gyro); an active
   screen reader mutes the tones (voice owns the audio channel).

---

## The five cues

| Cue | Means | Sound | Haptic (mobile) |
|---|---|---|---|
| **select** | "you picked this" | soft sine **660 Hz**, 80 ms | light |
| **confirm** | "that completed" | rising two-note **C5→G5** (523→784 Hz), 180 ms | success |
| **threshold** | "a boundary was crossed" | triangle **440 Hz** (A4), 120 ms | medium |
| **warning** | "caution / limit hit" | rough sawtooth **220 Hz**, 200 ms | warning |

*(Dropped `back` — panel dismiss stays silent, per review: "we don't want to overdo it.")*

### Where each fires (the sweep map)

- **select** — tapping any object that focuses/opens a detail. **Wired across:**
  `/explore` (planet · sun · small body · satellite · belt) · `/earth` `/moon`
  `/mars` (surface site + orbital object, canvas + index list) · `/earth` `/mars`
  (orbital-regime pick) · `/missions` (card) · `/fleet` (spacecraft) · `/iss`
  `/tiangong` (module + ship) · `/fly` (jump to a mission event). All at true
  user-click seams; deep-link / tour / restore paths stay silent.

### ⚠ confirm / threshold / warning — no natural triggers today

Reality check from the sweep: the current app is **selection-driven**. The
`confirm` (solver-complete) · `threshold` (mission arc crossing an orbit) ·
`warning` (Δv over budget · fuel exhausted) moments were designed for an
*interactive-solver* `/fly` that was never built — today's `/fly` is a cinematic
playback (no fuel/Δv model, no solver, no user-facing crossing events). Rather
than invent features to hang cues on, these three stay **defined but unwired**.
They're ready for: (a) any future interactive feature that genuinely completes /
warns, and (b) the Phase-4 hero sonifications, which mark real physical moments.
`select` is the primary wired cue.

---

## What must stay SILENT (restraint list)

Hover / focus · scroll · camera drag / zoom / **tilt (gyro)** · pinch · the tab
strip *inside* a panel (too chatty) · route-to-route navigation · settings toggles
(including the sensory toggles themselves) · autoplay / sim-time ticks · any
programmatic selection (deep-link `?id=`, session restore). When in doubt: silent.

---

## Mix & timing

- Peak gain ≤ 0.14 linear; chords share one envelope (no click transients).
- Ducks to 0.02 gain within ~50 ms when narration plays; restores over ~200 ms.
- Cue tones are ≤ 200 ms — a punctuation mark, never a phrase.
- Haptic kinds map to Capacitor's coarse styles (light/medium/heavy impact +
  success/warning notification); web Android uses short `navigator.vibrate`
  patterns; iOS-web + desktop have no haptic (tone only).

---

## Review outcome (locked 2026-07-11)

1. **In-panel tab switches** — **silent**. ✓
2. **Panel close / `back`** — **silent**; the `back` cue is dropped entirely
   ("we don't want to overdo it"). Only the *open* side (`select`) sounds.
3. **Volume** — **keep 0.14** peak.
4. **Interaction mapping** — good start; proceed with the sweep and iterate from
   real use. No launch/play-control cues for now.

→ Sweeping `cue()` across the routes to this spec.
