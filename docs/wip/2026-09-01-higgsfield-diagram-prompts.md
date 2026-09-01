# Higgsfield polish brief — the 6 new /science diagrams (#32)

The Higgsfield MCP connector doesn't authenticate in Claude Code CLI (its OAuth uses Clerk +
a non-standard `/register` path the CLI client can't complete). It IS live in the Claude **web
app** — so run these 6 there, then hand the results back and I'll convert + wire them in.

## Settings (per the diagram-art-style guide)
- Model: **nano_banana_pro** · aspect **16:9** · resolution **2k**
- Reference image (attach as `role: image`): the matching **sketch PNG** at
  `docs/wip/essay-diagram-sources/_lab-systems-science/<id>.png`
- After generating: download the raw art. I'll `sharp().resize(1600).webp({quality:86})` it into
  `static/diagrams/science/<id>.webp` (overwriting the sketch webp; the `.svg` stays as source).

## The locked style prefix (same for all 6)
> Reinterpret this schematic as a hand-drawn editorial feature illustration for WIRED magazine —
> art-directed, not a clean computer diagram. Elegant, confident hand-sketched ink linework with
> light cross-hatching and a few loose construction strokes; hand-lettered annotations that feel
> drawn, not typed. Deep midnight-navy ground with subtle printed-paper grain and a faint blueprint
> grid ghosted behind the art; luminous cyan linework, warm-cream highlights, a single warm-amber
> glow accent. Spare, atmospheric, sophisticated — a beautiful magazine science spread, not busy.
> Not photorealistic, not a flat vector chart. KEEP the geometry and these labels legible and in
> place:

Then append, per diagram, the **label list** + **Subject** below.

---

### 1 · lifting-entry  (ref: lifting-entry.png)
Labels: "LIFTING ENTRY — STEERING WITH BANK"; "L/D ≈ 0.3 — small, but not zero"; "LIFT"; "CG
(offset)"; "velocity"; "HEAT SHIELD"; "BANK ANGLE φ — the one control"; "EARTH"; "ENTRY INTERFACE";
"LIFT-UP → stretch the glide, low peak-g, land far"; "LIFT-DOWN — steepen, high peak-g, land short";
"lift widens the survivable corridor 3–5× vs a ballistic plunge".
Subject: a blunt re-entry capsule's small lift vector and bank-angle roll steering it through the
survivable corridor over Earth's limb.

### 2 · skip-entry  (ref: skip-entry.png)
Labels: "SKIP ENTRY — SURFING BACK OUT"; "EARTH"; "SENSIBLE ATMOSPHERE (~105 km)"; "lunar return ≈
11 km/s (super-circular)"; "FIRST ENTRY — lift-up bleeds energy"; "SKIP OUT"; "EXO-ATMOSPHERIC COAST
— energy conserved, no drag"; "SECOND ENTRY → final descent"; "lower peak-g + peak heating ·
thousands of km more range · Zond · Chang'e 5 · Orion".
Subject: a capsule dipping into the upper atmosphere, skipping back out into a coast arc, then
re-entering — a two-dip skip trajectory above Earth's limb.

### 3 · entry-footprint  (ref: entry-footprint.png)
Labels: "THE LANDING FOOTPRINT"; "GROUND TRACK (downrange →)"; "entry interface"; "LIFT-UP → far
edge, LOW peak-g"; "LIFT-DOWN — near edge, HIGH g"; "FOOTPRINT — reachable band"; "crossrange (bank
sideways)"; "TARGET — guidance solves the bank schedule to land here"; "outside the footprint →
unreachable; guidance clamps to the nearest edge".
Subject: the teardrop-shaped reachable landing footprint on the ground, with lift-up (long/low-g)
and lift-down (short/high-g) entry trajectories bounding it.

### 4 · ascent-guidance  (ref: ascent-guidance.png)
Labels: "ASCENT GUIDANCE — OPEN-LOOP → PEG"; "PAD"; "TOP OF SENSIBLE ATMOSPHERE"; "liftoff +
pitch-over kick"; "OPEN-LOOP pitch program (gravity turn, α ≈ 0, low loads)"; "handover";
"CLOSED-LOOP PEG — re-solve steering to cutoff every second (linear-tangent law + time-to-go)";
"CUTOFF — horizontal, orbital speed 7.8 km/s"; "a per-second boundary-value problem — why spaceflight
needed the onboard computer".
Subject: a rocket's ascent arc from the pad curving over to orbit, an open-loop pitch program in the
atmosphere handing over to closed-loop PEG above it.

### 5 · escape-velocity  (ref: escape-velocity.png)
Labels: "ESCAPE VELOCITY — THREE FATES"; "PLANET (μ, radius r)"; "launch point"; "< v_esc → bound
ELLIPSE (falls back)"; "= v_esc → PARABOLA (just escapes)"; "> v_esc → HYPERBOLA (leaves with v∞)";
"v_esc = √(2μ / r) = √2 × v_circular"; "Earth surface 11.2 km/s · Moon 2.4 · Mars 5.0 · Sun @ 1 AU
42.1 km/s".
Subject: three trajectories launched from one planet — a bound ellipse, an escape parabola, and a
hyperbola leaving to infinity.

### 6 · synodic-period  (ref: synodic-period.png)
Labels: "SYNODIC PERIOD — THE LAUNCH-WINDOW CLOCK"; "SUN"; "Earth orbit"; "Mars orbit"; "EARTH —
departure"; "MARS at launch (leads by ≈ 44°)"; "rendezvous — Mars arrives here"; "phase angle";
"transfer ellipse (~259 d)"; "1/S = |1/T₁ − 1/T₂|"; "Earth–Mars S ≈ 780 d (~26 mo)".
Subject: a Sun-centred diagram of Earth's and Mars's circular orbits with the Hohmann transfer
ellipse and the phase-angle lead between the planets.

---

## When the art is back
Drop the 6 files anywhere (e.g. `~/Desktop/higgsfield/<id>.png|.webp`) and tell me the folder. I'll
convert each to `static/diagrams/science/<id>.webp`, visually verify the labels survived (regenerate
any that garbled a number), run validate-diagrams + preflight, and commit.
