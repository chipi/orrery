# Booster recovery per flight, from sources (0.9.11 F2, 2026-11-22)

What the /fly landing inset shows for each mission flown on a recoverable launcher: landed, caught
or expended, where, and when. **Time class:** *sourced* = the flight's own published timeline;
*approx* = the source gives only "about N minutes"; *typical* = nothing found for this flight, the
value is a sourced sibling flight's (same vehicle, same landing site type) and is labelled so.

| Mission (id) | Vehicle | Part | Outcome | Site | Landing burn / touchdown T+ | Time class | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| psyche-mission | Falcon Heavy | side boosters | landed | LZ-1 and LZ-2 | 8:00 / 8:17 | sourced | NASA Psyche blog, "Key milestones for today's Psyche launch" (also: boostback 2:40-3:51, entry burn 6:47-7:04) |
| psyche-mission | Falcon Heavy | centre core | expended | - | - | sourced | same; NASA Psyche blog "Successful landing of side boosters" |
| europa-clipper | Falcon Heavy | all three cores | expended | - | - | sourced | Spaceflight Now / Space.com, 14 Oct 2024: first Falcon Heavy to expend all three |
| otv-7 | Falcon Heavy | side boosters | landed | LZ-1 and LZ-2 | 8:00 / 8:17 | typical (Psyche) | Wikipedia OTV-7 (B1064-5, B1065-5 to LZ-1 / LZ-2, core expended); no USSF-52 time found |
| otv-7 | Falcon Heavy | centre core | expended | - | - | sourced | same |
| hera | Falcon 9 | booster | expended | - | - | sourced | Spaceflight Now / NSF, 7 Oct 2024: B1061's 23rd and last flight, expended for Hera's performance |
| dart | Falcon 9 | booster | landed | drone ship (OCISLY) | - / 8:52 | sourced | Spaceflight Now "Falcon 9 launch timeline with DART" (SpaceX's sequence): entry burn 6:40, stage 1 landing 8:52 |
| inspiration4 | Falcon 9 | booster | landed | drone ship (JRTI, B1062-3; was OCISLY here, corrected 11-24 from Wikipedia "List of Falcon 9 and Falcon Heavy launches (2020–2022)": "Success (JRTI)"; 543 km downrange, Everyday Astronaut) | 9:04 / 9:31 | sourced | SpaceX's timeline as printed by Space Explored, 15 Sep 2021 (entry burn 7:30) |
| polaris-dawn | Falcon 9 | booster | landed | drone ship (JRTI, B1083) | - / ~9:30 | approx | Space.com / Spaceflight Now, 10 Sep 2024: "about 9.5 minutes after liftoff" |
| otv-5 | Falcon 9 | booster | landed | LZ-1 | - / ~8:00 | approx | Space.com / Live Science, 7 Sep 2017: "approximately eight minutes after launch" |
| im-1 | Falcon 9 | booster | landed | LZ-1 (B1060) | - / ~8:00 | typical (OTV-5) | NSF / Everyday Astronaut, 15 Feb 2024: RTLS to LZ-1; no time found |
| beresheet | Falcon 9 | booster | landed | drone ship (OCISLY, B1048) | - / 8:52 | typical (DART) | Planetary Society / Spaceflight Now, 22 Feb 2019: B1048 landed on OCISLY; no time found |
| blue-moon-mk1 | New Glenn | GS1 | landed | drone ship (Jacklyn) | - / ~10:00 | approx (NG-2) | Space.com / Spaceflight Now, 13 Nov 2025: NG-2's booster landed "about 10 minutes after liftoff"; Blue Moon MK1 has not flown, NG-2 is the vehicle default |
| starship-demo, starship-mars-crew | Starship | Super Heavy | caught | launch tower | - / ~7:00 | approx | EarthSky / Fortune: the three Super Heavy catches came "roughly seven minutes after launch"; these missions have not flown |

**Landing-burn start where none is published:** the inset needs one. Psyche's burn is 17 s
(8:00 to 8:17), Inspiration4's 27 s (9:04 to 9:31); flights without a published start use 25 s
before touchdown, marked in the data as not published.

**Found on the way (F3):** Starship Flight 15 (13-14 Nov 2026): the tower caught the *ship* after
22 h and 14 orbits; the Super Heavy catch failed (engines shut down early, diverted, exploded over
the Gulf). Al Jazeera, IBTimes, 15 Nov 2026. F3 starts from here.

**Not found** (searched): USSF-52 landing time (Spaceflight Now launch page has no timeline text),
IM-1 landing time (Spaceflight Now, Everyday Astronaut pages), Beresheet / Nusantara Satu landing
time, NG-2 landing time to the second (blueorigin.com is script-rendered), a Super Heavy catch time
to the second.

Searches: 10 WebSearch, page reads by curl. Polaris Dawn: one search summary mixed in the 28 Aug
2024 Starlink booster crash ("8 minutes 20 seconds", tipped over); that was B1062 on a Starlink
flight, not Polaris Dawn, and is not used.
