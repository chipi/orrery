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
| Tianwen-1 | Ramps and egress beats added 11-24 (merged from p2-tw1). Measured 11-24: the rover path matches the ramp (along z, 40° slope from a 3.38 m deck); the odd T643 frame is the 40° ramp from the estimated 1.7× platform scale. A real deck height would fix it; not sourced. Egress real time 616900 s is from memory, unsourced |
| Curiosity, Perseverance | Phone: the chute is cropped at the top while the capsule hangs below |
| Chandrayaan-3 | Not done: the hovers at 800 m and 150 m need the rate controller to resume a descent (the untested `hovers` code above low gate is in the registry) |
| Blue Moon MK1 | Not reached |
| Chang'e 3/4 | Descent 781 s against the record's ~720 s after the hover was added |
| Chandrayaan-2 | Not done: the loss at ~2.1 km (a test pins the published end at 7.4 km) |
| Beresheet | The real engine cut at 10 km and the late restart are not drawn (the profile starts at 2.5 km) |
| SLIM | The f0.5 phone frame is black; the engine loss shows only as the plume going out |
| Galileo probe | 11-24: cloud-deck detail at 500 km–0.5 km periods (Jupiter-only scale): faint streaks on the deck at f0.005–f0.02. Subtle. True bands are wider than the horizon from 450 km, so none are drawn |
| Vega 1/2 | The balloon deployment is not drawn; no sourced figures in the records |
| Venera 13, Huygens | Viewed only, no change made |
| Gemini ×6 | The heat-shield cone stays upright under the tilted capsule at -6 s and splashdown (reads as detached); no pilot chute or R&R section |
| Mercury ×6 | Uncommitted in its worktree (git refused there); landing-bag skirt not seen on screen; no retropack; no Liberty Bell 7 hatch blow |
| Hayabusa 1/2, OSIRIS-REx | Touch-and-go has no back-away: the craft lands and stays (needs an ascent in physics and scene) |
| NEAR Shoemaker | Done 11-24: octagonal bus, dish, panel cross; framed below 600 m (all small bodies). Open: OSIRIS-REx f0.9 frame came out dimmed incl. HUD after this change, cause not checked; NEAR cruise scene scale with the new real-metre model not checked |
| Philae | Two bounces added (estimates) but unverified on screen; still a dot at f0.5 and 0; camera inside the comet at -30 and -6 |
| Soyuz-11, Voskhod-1 | Camera at -20/-6 s: Soyuz from below with the canopy filling the frame; Voskhod's canopy beside the capsule (another camera path than the capsule fix) |
| Apollo 7/8/9, ASTP, Skylab | At f0.7 (mains opening) the camera sits at the riser point inside the lines; apex cover not seen on screen; no pilot chutes |
| Shenzhou-1 | -6 s camera inside the canopy (the Soyuz path); f0.7 capsule shows no chute, the line hangs to the side |
| Starship Flight 5 | Upright with the plume already at f0.5–f0.7; the belly-flop should hold until the flip just before splashdown |
| Inspiration4, Polaris Dawn | 11-24: the capsule flag keeps the canopy out of frame by design; the opening shot lasts 3 s per stage. An 8 s opening was tried but not verified: the shot tool's T and -N specs both landed after the chutes (-236 gave E+11:51, not 09:58), reverted. Next: map shot time to physics t, then re-try |
| Starship (all three) | Entry plasma is a flat orange ellipse beside the ship (f0.1); Mars: after the flip the camera pulls far back (f0.66, f0.7) instead of the close orbit; flight 5 f0.7 grey disc on the sea |
| Blue Moon Mk 2 | Done 11-24 (ae6ad1ae8d2): faceted silver shroud, roundel, RCS puffs coded. Not seen: the puffs at shot distance; skirt narrower than the photo |
| Small bodies: shapes and surfaces | All five are spheres with one grey crater texture: Itokawa a peanut rubble pile with a smooth "sea", Ryugu and Bennu dark spinning-top diamonds with boulders, Eros an elongated potato, 67P the near-black two-lobed duck with cliffs. Procedural shapes first; the published shape models (JAXA, NASA PDS, ESA) need a licence and size check, which ties to the Eyes on the Solar System backlog item |
| Opening shot, Moon and Mars (operator) | Like Hayabusa's first frames: the craft small against the whole body/landing region, then the camera moves alongside and slowly closes in; no jump straight to the landing close-up |
| Tianwen-1 | At -3 s the rover with its wheels descends on its own; the landing platform with Zhurong on top should come down |
| Mars ground | f0.2 (higher up) shows a visible checkerboard tiling of the new detail texture; Curiosity's entry shows a lit disc under the aeroshell |
| Philae | At touchdown ("0") only the contact shadow shows, the lander is not visible; at -6 a speck |
| Soyuz-11, Shenzhou-1, Voskhod-1, Apollo 8 | Fixed 11-24: the cause was the ground shot (camera on the surface looking up into the canopy); it now rides level with the capsule. Seen at -20/-6 s; Apollo 8 f0.7 no longer at the riser point |
| Gemini heat shield | Fixed 11-24: the cone was the generic backshell, not the shield; removed for Earth capsules. Seen at -6 s and 0 on Gemini 4 |
| Chandrayaan-2 | Loses contact at 2.1 km and hits at 175 m/s, but the last frame shows Vikram landed intact, firing; a crash needs an impact state (tumble/debris), like SLIM's tip |
| Mars body map | Tried 11-24: 4k map shows the same dark patches, stronger; they are true albedo features at ~5 km/px from 100 km. Kept 2k (no 2.5 MB cost). Closed unless a sharper regional map is wanted |
| Beagle 2 | Swing done 11-24: scrub-pure, lander and canopy swing; at true scale the 1 m lander is a dot under the canopy. Folded-panel struts not checked |
