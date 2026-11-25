# IM-1 "Odysseus" descent — sourced facts (2026-11-25)

Rule: every line has a URL that was opened in this research pass unless marked otherwise. "not found" means no source gave the number. The existing mission page is static/data/missions/moon/im-1.json (launch, LOI date, site, tilt, end date already there).

## Launch and lander
| Fact | Value | Source |
|---|---|---|
| Launch | 2024-02-15 06:05 UTC (NASA TM: 06:05:00; Wikipedia 06:05:37), Falcon 9 (B1060), LC-39A | NASA NTRS TM-20250010290 https://ntrs.nasa.gov/api/citations/20250010290/downloads/NASA%20TM%2020250010290.pdf ; Wikipedia https://en.wikipedia.org/wiki/IM-1 |
| Size | 3.9 m tall x 1.6 m diameter, hexagonal (NASA TM); other sources 4.3 m (14 ft) | NTRS TM; Space.com https://www.space.com/intuitive-machines-odysseus-moon-lander-tipped-over |
| Mass | wet at launch 2,035 kg, dry 677 kg (NASA TM); Wikipedia 1,900 kg launch mass; Astronomy.com 675 kg | NTRS TM; https://www.astronomy.com/space-exploration/odysseus-traveled-to-the-moon-broke-its-leg-and-still-pinged-earth-to-tell-the-story/ |
| Engine | VR900, LOX/liquid methane, gimbaled. Thrust 3,100 N (700 lbf) per Wikipedia Nova-C; a search snippet gave 4,000 N (900 lbf). No primary figure. Isp and throttle range: not found. | https://en.wikipedia.org/wiki/Intuitive_Machines_Nova-C |
| Legs | six | Wikipedia IM-1 |

## Descent timeline (UTC, 2024-02-22 unless noted)
| Event | Value | Source |
|---|---|---|
| Lunar orbit insertion | 2024-02-21 14:35:51 UTC, into a 20 x 200 km orbit (Wikipedia: 92 km, 408 s burn, 800 m/s) | NTRS TM; Wikipedia |
| Deorbit insertion | 05:49:29 UTC | NTRS TM |
| Delay | the landing was delayed ~2 h to load software patches after the laser rangefinders were found not working | TechCrunch https://techcrunch.com/2024/02/23/quick-thinking-and-a-stroke-of-luck-averted-a-moon-lander-disaster-for-intuitive-machines |
| Powered descent start | 23:10:32 UTC | NTRS TM |
| NDL ranging with all three beams | from 23:18:20.6 UTC; Beam A range over 20 km (design 5 km) | NTRS TM |
| IMU data segment starts | 23:20:41 UTC at 1,921 m above ground, 283.5 m/s | NTRS TM |
| NDL reconstruction start | 8,017.7 m above ground, 543.3 m/s | NTRS TM |
| First contact | 23:23:45.0 UTC in the NDL data set; the TM also quotes a landing time 23:23:00 UTC from another source; Wikipedia 23:23:53; NASA LRO page 6:24 p.m. EST (23:24) | NTRS TM; Wikipedia; https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/ |
| Phases (pitch-over, braking, hover) | not found with times or altitudes; only the reconstruction above | |

## Touchdown
| Fact | Value | Source |
|---|---|---|
| Speed at first contact | NASA TM reconstruction: Moon-relative speed 7.79 to 7.80 m/s, flight-path angle about -44.5 degrees relative to the local terrain (my arithmetic: vertical ~5.5 m/s, along-ground ~5.5 m/s). | NTRS TM |
| Speed per press briefing | about 6 mph (~2.7 m/s) vertical, ~2 mph (~0.9 m/s) sideways, versus a 2 mph vertical, 0 horizontal plan | Space.com https://www.space.com/intuitive-machines-odysseus-moon-lander-tipped-over |
| Conflict | The NASA TM numbers are about three times the press numbers. Not resolved. A note: the TM header says the lander had no NDL data in its navigation filter at landing; press reports said NDL was used. Both are as written in the sources. | NTRS TM; TechCrunch URL above |
| Pitch at contact | 76.83 degrees relative to terrain; 85.42 degrees relative to local horizontal (nearly vertical) | NTRS TM |
| Site | near Malapert A; NTRS TM: 80.1276 S, 1.4367 E; LRO/NASA: 80.13 S, 1.44 E, elevation 2,579 m (8,461 ft), local slope 12 degrees, LROC frame M1463440322L | NTRS TM; NASA LRO page above |
| Offset | ~1.5 km (0.9 mi) outside the intended landing zone, on a 12 degree slope in a small crater | Astronomy.com URL above |
| Leg and tip | broke one (possibly two) legs; "hit harder, and sort of skidded"; upright ~2 s before tipping; rest at ~30 degrees from horizontal | Astronomy.com URL above (Altemus quotes) |
| Final attitude | on its side, ~30 degrees, resting on an externally mounted helium tank (Wikipedia) | Astronomy.com; Wikipedia IM-1 |
| What went wrong | the laser rangefinder was not working: a physical safety switch (eye safety) had not been enabled before launch and could not be flipped remotely. Crain: "cabling configuration issue"; "We didn't verify the cabling implementation by firing the laser before [launch]". | TechCrunch URL above; Payload https://payloadspace.com/talking-im-2-with-tim-crain/ |
| Backup | NASA Navigation Doppler Lidar (NDL), a technology payload. NASA's Desai said it "performed flawlessly" (TechCrunch). The TM says the filter change to use NDL "proved to be unsuccessful" and the landing used no NDL data. Conflict noted above. | TechCrunch; NTRS TM |
| NDL performance | range and velocity valid beyond preflight expectations; model-measurement agreement within about 5 m and 0.5 m/s | NTRS https://ntrs.nasa.gov/citations/20250010290 |
| SCALPSS | powered on never during descent (no altitude data streamed), so no plume imagery | NTRS SCALPSS paper https://ntrs.nasa.gov/api/citations/20250010973/downloads/2026_SciTech_SCALPSS_MissionOverview_FINAL.pdf |

## Surface operations
Seven days; power lost with lunar night on 2024-02-29 (Wikipedia, NASA/IM per the repo's credit line); mission declared over 2024-03-23 (Wikipedia). Source: https://en.wikipedia.org/wiki/IM-1 . NASA CLPS press kit says ~7 Earth days: https://www.nasa.gov/wp-content/uploads/2025/01/np-2025-01-001-jsc-clps-firefly-press-kit-screen-508-1-10-25-final.pdf

## Cameras and imagery
| Item | Fact | Source |
|---|---|---|
| Descent camera | Intuitive Machines released two images: one wide-angle during the descent (legs visible at the right, over Schomberger crater ~200 km from the site, ~10 km up) and one ~35 s after the lander tipped; also an image from ~30 m (100 ft) on the descent. Search snippet only (Space.com/AOL); not opened. | https://www.aol.com/odysseus-lunar-lander-shares-photos-153120008.html |
| Narrow-field camera image | retrieved Feb 27: hardware in the foreground and a crater ~500 m to the near lip | NASA https://www.nasa.gov/image-article/odysseus-lands-on-the-moon/ |
| EagleCam | Embry-Riddle CubeSat; planned ejection ~30 m above the surface; did not deploy on landing; ejected on Feb 28 about 4 m from the lander; no post-landing images | Wikipedia IM-1; search snippet of https://news.erau.edu/headlines/eaglecam-updates-embry-riddle-device-lands-on-moon (not opened) |

| Photo | URL | Licence and credit |
|---|---|---|
| LROC Odysseus site, 2024-02-24 (M1463440322L) | https://commons.wikimedia.org/wiki/File:Image_(M1463440322L)_of_Intuitive_Machines_IM-1_Nova-C,_known_as_Odysseus_landing_site_captured_by_Lunar_Reconnaissance_Orbiter_Camera_(LROC)_(with_arrow).png | Public domain; NASA/GSFC/ASU |
| LROC IM-1 landing region (LROC1321) | https://commons.wikimedia.org/wiki/File:IM-1_Landing_Region_(LROC1321_-_content_im1_1100_85cm).png | Public domain; NASA/GSFC/ASU |
| Nova-C lander before launch (IM_00309) | https://commons.wikimedia.org/wiki/File:Intuitive_Machines%E2%80%99_Nova-C_lunar_lander_(IM_00309).jpg | Public domain; NASA Marshall / Intuitive Machines |
| NASA/IM news conference (RGM_4450) | https://commons.wikimedia.org/wiki/File:For_the_first_time_in_more_than_50_years,_new_NASA_science_instruments_and_technology_demonstrations_are_operating_on_the_Moon_following_the_first_successful_delivery_of_the_agency%E2%80%99s_CLPS_(Commercial_Lunar_Payload_Service_(RGM_4450).jpg | Public domain; NASA HQ / Robert Markowitz |
| Descent-camera and surface images | NASA page above | credit Intuitive Machines; no open licence found |

## Not found
Phase times and altitudes (braking, pitch-over, hover) from a primary source; a resolution of the 7.8 m/s versus ~2.7 m/s vertical conflict; a licence for the descent-camera images; Isp and throttle range; VR900 thrust from a primary source.
