# Pass 2: descents below the standard, redone at the end

The operator's order (2026-11-24): finish every batch first, then redo these.

| Descent | What is below the standard |
| --- | --- |
| Artemis 4 | Flies the generic white-tube silhouette; needs a Starship HLS model (from `buildStarshipShip`) |
| Artemis 5 | Same silhouette; needs a Blue Moon Mk 2 model |
| Luna 9 | Bags retract instead of being dropped as separate pieces; the bounces don't show in the last frames |
| Luna 16/24, 17/21 | The main-engine cutoff at ~20 m (before the verniers) is not shown |
| Phoenix, InSight | The leg deploy is not readable: the lander sits inside the backshell under the chute |
| Viking 1 | Plumes faint in the last seconds; the 2.4 m/s constant-velocity phase has no beat |
| Starship demo, Starship Mars crew | Not done: no flip or landing burn (B3 ran out of its box) |
| Tianwen-1 | No ramp or rover-egress beat after landing |
| Curiosity, Perseverance | Phone: the chute is cropped at the top while the capsule hangs below |
| Chandrayaan-3 | Not done: the hovers at 800 m and 150 m need the rate controller to resume a descent (the untested `hovers` code above low gate is in the registry) |
| Blue Moon MK1 | Not reached |
| Chang'e 3/4 | Descent 781 s against the record's ~720 s after the hover was added |
| Chandrayaan-2 | Not done: the loss at ~2.1 km (a test pins the published end at 7.4 km) |
| Beresheet | The real engine cut at 10 km and the late restart are not drawn (the profile starts at 2.5 km) |
| SLIM | The f0.5 phone frame is black; the engine loss shows only as the plume going out |
| Galileo probe | Every phone frame is solid white; Jupiter body and limb sphere ruled out, the dust disc, plasma group and vehicle group not yet |
| Vega 1/2 | The balloon deployment is not drawn; no sourced figures in the records |
| Venera 13, Huygens | Viewed only, no change made |
| Gemini ×6 | The heat-shield cone stays upright under the tilted capsule at -6 s and splashdown (reads as detached); no pilot chute or R&R section |
| Mercury ×6 | Uncommitted in its worktree (git refused there); landing-bag skirt not seen on screen; no retropack; no Liberty Bell 7 hatch blow |
| Hayabusa 1/2, OSIRIS-REx | Touch-and-go has no back-away: the craft lands and stays (needs an ascent in physics and scene) |
| NEAR Shoemaker | Not viewed; LUNAR_POWERED with one powered_retro phase, no braking parameters |
| Philae | Two bounces added (estimates) but unverified on screen; still a dot at f0.5 and 0; camera inside the comet at -30 and -6 |
| Soyuz-11, Voskhod-1 | Camera at -20/-6 s: Soyuz from below with the canopy filling the frame; Voskhod's canopy beside the capsule (another camera path than the capsule fix) |
| Apollo 7/8/9, ASTP, Skylab | At f0.7 (mains opening) the camera sits at the riser point inside the lines; apex cover not seen on screen; no pilot chutes |
| Shenzhou-1 | -6 s camera inside the canopy (the Soyuz path); f0.7 capsule shows no chute, the line hangs to the side |
| Starship Flight 5 | Upright with the plume already at f0.5–f0.7; the belly-flop should hold until the flip just before splashdown |
| Inspiration4, Polaris Dawn | Drogue-then-mains order not checked (canopies above the frame); no altitude beats |
| Beagle 2 | The lander does not swing under the chute (not scrub-pure); folded-panel struts not checked by eye |
