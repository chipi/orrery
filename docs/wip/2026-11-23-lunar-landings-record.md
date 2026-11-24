# Lunar robotic landings: the record against the profiles (pass 2 input)

Gathered 2026-11-23 by a research subagent (13 web searches). It worked from search-result
summaries and did not open the primary papers. Facts it could not source are marked UNVERIFIED.
Verify against the primary source before changing a profile.

## What the engine can express today

- `LUNAR_POWERED`:
  - braking (ends at `highGateSpeedMs`, emits `retro_ignition`);
  - approach (`approachFpaDeg`, ends at `lowGateAltM`);
  - a vertical final to the ground.
- `LUNA_DIRECT_IMPACT`: retro to `airbagReleaseAltM`, then a coast that emits `airbag_deploy`.
- `recordEndsAltM`: the profile stops short of the ground (chandrayaan2).
- Missing:
  - a hover;
  - a jettison event;
  - an engine cutoff above the ground followed by verniers or free fall;
  - an engine failure;
  - a pitch-up event.

## Gaps by mission

| id | Record | Profile gap |
| --- | --- | --- |
| luna9 | At 75 km the retro fires, 300 kg of side modules are jettisoned and the airbags inflate. At 5 m a contact probe cuts the engine and ejects the capsule. It lands at 6.1 m/s, bounces, sheds the bags, then opens its petals about 250 s later. | Provenance says "cut at 250 m": the 250 is seconds after landing. No jettison or inflation at 75 km; no bounce or petals. |
| luna16 / 24 | KTDU-417 (~1,920 kgf) burns about 360 s from 15.1 km. Main cutoff at about 20 m, verniers to about 2 m (< 2.4 m/s), then free fall. Afterwards the drill, then the ascent stage lifts off from the descent stage. | The main engine burns to the ground; no handover to the verniers. Luna 24's 12 km start is unverified. |
| luna17 / 21 | Same scheme. Luna 21: braking from about 16 km, mains from 750 m to 22 m, engine off at 1.5 m. Ramps deploy and the Lunokhod drives off. | Luna 17's start is copied from Luna 21 (no source). No handover. |
| change3 / 4 | Main deceleration from 15 km at 1.7 km/s to 3 km at 70 m/s. Attitude change from 3 km to 2.4 km. About 45° approach to 100 m. **Hover at 100 m.** Hazard avoidance from 100 m to 30 m at 1.5 m/s. Slow vertical descent 30 m → 2 m. **Cutoff at about 4 m**, then free fall. Yutu by ramp. | No hover; approach at 18° against the record's 45°; no cutoff at 4 m. |
| change5 / 6 | Same family, hover at 100 m. Chang'e 6: powered descent 06:09 → 06:23 Beijing, about 14 min. | No hover. Chang'e 6 profile runs about 900 s against about 14 min: check it. Its 16 km start is an estimate. |
| chandrayaan2 | Rough braking 30 → 7.4 km (1,683 → 146 m/s) nominal. Over-braking in the next phase; contact lost at about 2.1 km; hard landing within 500 m. | Truncated at 7.4 km by design; no failure or impact beat. |
| chandrayaan3 | Rough braking 30 → 7.4 km. Attitude hold. Fine braking to 800 m. **Two engines off, 12 s hover at 800 m.** Down to 150 m, **hover up to 22 s**. Retarget, 60 m. 10 m at −1 m/s. Ramp and Pragyan. | No hovers, attitude hold or retarget; one low gate at 150 m. |
| slim | Two ~500 N mains and 12 RCS thrusters. Vertical descent from about 7 km. **One main lost at about 50 m.** Touchdown under 1.4 m/s but sideways. Planned two-step landing (rear leg, then tip forward); it **ended nose-down**. | Total thrust 1,000 N; no failure, no two-step, no overturn. |
| beresheet | IMU fault from about 14 km. **Main engine cut at about 10 km**, restarted too late. Impact at about 139 m/s, about 150 m altitude at loss of contact, 11 Apr 2019 19:23 UTC. | Starts at 2.5 km nearly dry: right impact speed, but none of the story. |
| blue-moon-mk1 | Not flown (manifested late 2026). Cargo lander, BE-7, targeting the Shackleton connecting ridge. | Placeholder numbers copied from Beresheet. The site (−84, 20) is not the Shackleton ridge: confirm. |

## Engine features pass 2 needs

1. A **hover** phase or beat: Chang'e 3–6 at 100 m; Chandrayaan-3 at 800 m and 150 m.
2. **Engine cutoff above the ground**, then verniers or free fall: Luna E-8 at about 20 m, then about
   2 m; Chang'e at about 4 m.
3. **Luna 9**: jettison and inflation at 75 km; capsule ejected at 5 m; bounce; petals.
4. **Failures**: SLIM (engine loss at 50 m, nose-down), Beresheet (engine cut and restart, impact),
   Chandrayaan-2 (loss at about 2.1 km).
5. **Attitude**: a pitch-up beat; the Chang'e 3 approach at about 45°.

## Sources

- Luna 9: https://en.wikipedia.org/wiki/Luna_9 ·
  https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-006A
- Luna 16: https://en.wikipedia.org/wiki/Luna_16 ·
  https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1970-072A
- Luna 17: https://en.wikipedia.org/wiki/Luna_17
- Luna 21: https://en.wikipedia.org/wiki/Luna_21 ·
  https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-001A
- Luna 24: https://en.wikipedia.org/wiki/Luna_24 ·
  https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1976-081A
- Chang'e 3: https://www.atlantis-press.com/article/25759.pdf ·
  https://www.planetary.org/articles/12151057-amazing-change-3-descent ·
  https://eoportal.org/satellite-missions/chang-e-3
- Chang'e 4: https://www.planetary.org/space-missions/change-4
- Chang'e 5: https://www.sciopen.com/article/10.34133/2021/9823609
- Chang'e 6: https://www.chinadaily.com.cn/a/202406/02/WS665ba1e9a31082fc043ca68d.html
- Chandrayaan-2: https://pib.gov.in/PressReleasePage.aspx?PRID=1592495 ·
  https://arxiv.org/pdf/2309.14384 · https://lroc.im-ldi.com/posts/1131
- Chandrayaan-3: https://arxiv.org/pdf/2511.03594 · https://en.wikipedia.org/wiki/Chandrayaan-3
- SLIM: https://global.jaxa.jp/press/2024/01/20240125-1_e.html ·
  https://www.planetary.org/space-missions/slim-japans-precision-lunar-lander
- Beresheet: https://www.space.com/beresheet-moon-crash-engine-glitch.html ·
  https://spaceflightnow.com/2019/04/18/errant-command-doomed-israeli-moon-lander-officials-vow-to-try-again/
- Blue Moon MK1: https://www.blueorigin.com/lunar-transport ·
  https://www.nasa.gov/event/clps-flight-blue-origins-blue-moon-mark-1/
