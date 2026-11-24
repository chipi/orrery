# Pass 2: descents below the standard, redone at the end

After the redo list (operator 2026-11-24): booster landing scenes for Falcon 9 and New Glenn, with
the side thrusters, grid fins and legs modelled and working on the descent. The Falcon 9 sea
landing comes down on a 3D model of the drone ship (the floating platform), never on open water;
the launch inset's drone ship (`src/lib/three/landing-inset.ts`) is the starting point, brought up
to the scene's model standard.

The operator's order (2026-11-24): finish every batch first, then redo these.

| Descent | What is below the standard |
| --- | --- |
| Artemis 4 | Flies the generic white-tube silhouette; needs a Starship HLS model (from `buildStarshipShip`) |
| Artemis 5 | Same silhouette; needs a Blue Moon Mk 2 model |
| Luna 9 | Bags retract instead of being dropped as separate pieces; the bounces don't show in the last frames |
| Luna 16/24, 17/21 | Done 11-24 (3e464744d06): main cuts at 20 m, two vernier plumes burn on; seen at T350/T358 |
| Phoenix, InSight | The leg deploy is not readable: the lander sits inside the backshell under the chute |
| Viking 1 | Plumes faint in the last seconds; the 2.4 m/s constant-velocity phase has no beat |
| Starship demo, Starship Mars crew | Not done: no flip or landing burn (B3 ran out of its box) |
| Tianwen-1 | Ramps and egress beats added 11-24 (merged from p2-tw1). Open: on the ramp (T643) the rover is pitched across the ramp, not along it; the path assumes the ramp runs along z (`platformEgress`), the picture suggests x. Egress real time 616900 s is from memory, unsourced |
| Curiosity, Perseverance | Phone: the chute is cropped at the top while the capsule hangs below |
| Chandrayaan-3 | Not done: the hovers at 800 m and 150 m need the rate controller to resume a descent (the untested `hovers` code above low gate is in the registry) |
| Blue Moon MK1 | Not reached |
| Chang'e 3/4 | Descent 781 s against the record's ~720 s after the hover was added |
| Chandrayaan-2 | Not done: the loss at ~2.1 km (a test pins the published end at 7.4 km) |
| Beresheet | The real engine cut at 10 km and the late restart are not drawn (the profile starts at 2.5 km) |
| SLIM | The f0.5 phone frame is black; the engine loss shows only as the plume going out |
| Galileo probe | Visible (fixed earlier). Cloud bands: the deck is flat tan at f0.005–f0.02 and murk below; the 5 km ground-detail layer was tried 11-24 and is sub-pixel from 450 km (reverted). Needs a large-scale band layer: a new build, ask first |
| Vega 1/2 | The balloon deployment is not drawn; no sourced figures in the records |
| Venera 13, Huygens | Viewed only, no change made |
| Gemini ×6 | The heat-shield cone stays upright under the tilted capsule at -6 s and splashdown (reads as detached); no pilot chute or R&R section |
| Mercury ×6 | Uncommitted in its worktree (git refused there); landing-bag skirt not seen on screen; no retropack; no Liberty Bell 7 hatch blow |
| Hayabusa 1/2, OSIRIS-REx | Touch-and-go has no back-away: the craft lands and stays (needs an ascent in physics and scene) |
| NEAR Shoemaker | Viewed 11-24: f0.9 the craft is a speck on a blank Eros wall; model is a gold cylinder with a white dome (real: octagonal box, 1.5 m dish, four panels in a cross); small in frame at touchdown |
| Philae | Two bounces added (estimates) but unverified on screen; still a dot at f0.5 and 0; camera inside the comet at -30 and -6 |
| Soyuz-11, Voskhod-1 | Camera at -20/-6 s: Soyuz from below with the canopy filling the frame; Voskhod's canopy beside the capsule (another camera path than the capsule fix) |
| Apollo 7/8/9, ASTP, Skylab | At f0.7 (mains opening) the camera sits at the riser point inside the lines; apex cover not seen on screen; no pilot chutes |
| Shenzhou-1 | -6 s camera inside the canopy (the Soyuz path); f0.7 capsule shows no chute, the line hangs to the side |
| Starship Flight 5 | Upright with the plume already at f0.5–f0.7; the belly-flop should hold until the flip just before splashdown |
| Inspiration4, Polaris Dawn | Viewed 11-24 T600–T700: camera holds the capsule, no canopy ever in frame, so the drogue-then-mains order cannot be seen; HUD has no mains beat (same camera path as the parked canopy item) |
| Starship (all three) | Entry plasma is a flat orange ellipse beside the ship (f0.1); Mars: after the flip the camera pulls far back (f0.66, f0.7) instead of the close orbit; flight 5 f0.7 grey disc on the sea |
| Blue Moon Mk 2 | Done 11-24 (ae6ad1ae8d2): faceted silver shroud, roundel, RCS puffs coded. Not seen: the puffs at shot distance; skirt narrower than the photo |
| Small bodies: shapes and surfaces | All five are spheres with one grey crater texture: Itokawa a peanut rubble pile with a smooth "sea", Ryugu and Bennu dark spinning-top diamonds with boulders, Eros an elongated potato, 67P the near-black two-lobed duck with cliffs. Procedural shapes first; the published shape models (JAXA, NASA PDS, ESA) need a licence and size check, which ties to the Eyes on the Solar System backlog item |
| Opening shot, Moon and Mars (operator) | Like Hayabusa's first frames: the craft small against the whole body/landing region, then the camera moves alongside and slowly closes in; no jump straight to the landing close-up |
| Tianwen-1 | At -3 s the rover with its wheels descends on its own; the landing platform with Zhurong on top should come down |
| Mars ground | f0.2 (higher up) shows a visible checkerboard tiling of the new detail texture; Curiosity's entry shows a lit disc under the aeroshell |
| Philae | At touchdown ("0") only the contact shadow shows, the lander is not visible; at -6 a speck |
| Soyuz-11, Shenzhou-1, Voskhod-1, Apollo 8 (parked) | Two fix rounds did not change the -20/-6 s canopy frames or Apollo 8's riser-point frame; cause unknown (not the capsule/opening flag path). Next step: log the active shot kind and flags at those times. Parked to avoid a rabbit hole; ask the operator before a third round |
| Gemini heat shield (parked) | Two rounds failed: the white cone stays upright under the tilted capsule; it is probably not `model.heatshield` (forcing that part's pose changed nothing; that edit is reverted). Next step: identify the mesh by name at runtime. Ask the operator before a third round |
| Chandrayaan-2 | Loses contact at 2.1 km and hits at 175 m/s, but the last frame shows Vikram landed intact, firing; a crash needs an impact state (tumble/debris), like SLIM's tip |
| Mars body map | Large blurry dark blotches from altitude come from the 2k body map, not the detail layer |
| Beagle 2 | Swing done 11-24: scrub-pure, lander and canopy swing; at true scale the 1 m lander is a dot under the canopy. Folded-panel struts not checked |
