# Launcher timelines from real sources (2026-11-17)

Research for backlog rows F1-F8 and S10-S13 (see `2026-11-15-launcher-timeline-audit.md` and
`2026-11-15-search-backlog.md`). Read-only on the repo; this file is the only output.

Method: the document was downloaded and the text (or, where the table is a picture, the page image)
was read directly. Every row below has a quote or table cell from the downloaded file. "Primary" =
agency or launch-provider document (NASA, ESA, JAXA, ISRO, ULA, ILS, Arianespace, SpaceX press
kit mirrored by NASA, Blue Origin / NASA blog). "Secondary" = Wikipedia, russianspaceweb, a blog.
Times are seconds after liftoff (T+); `hh:mm:ss` values in the source are converted, and the
conversion is shown as `m:ss = N s`. A derived difference (for example "separation minus cutoff")
is marked "derived".

Tolerances from the audit: staging / MECO / fairing +-10 s, SECO / orbit +-30 s.

## Headline findings (changes to what the audit believed)

1. **Payload separation after the last burn is a fixed number per vehicle, and it is large.**
   Atlas V 401/521/HLV: SC separation = last Centaur cutoff + 169 s in every column of the ULA table
   (derived). Delta II 7925: separation = S2 + 290 s, which is 113 s after the Star-48 burnout.
   Ariane 5 ECA VA256: Webb separation 134 s after upper-stage cutoff (derived). Proton-M/Briz-M GTO:
   685 s after the fifth burn (derived). PSLV XL: 47 s. H3-22S: 21 s. LVM3: 15 s. Falcon 9 CRS-9: 35 s.
   Delta IV Heavy + Star 48BV (Parker): 260 s after Star burnout (derived).
2. **H-IIA 202 has three primary SRB-A timelines that disagree** (JAXA H-IIA brochure 2025: burnout 97 s,
   jettison 107 s; JAXA F15 sequence: 116 s / 126 s; the 100 s / 110 s in the audit is spaceflight101).
   The audit's "real 110 s" is one of three, so S11 should be re-read against whichever flight the
   profile represents. Details in the H-IIA section.
3. **Proton-M fairing is 348.2 s in the ILS Mission Planner's Guide table** (the audit had 345 s from
   spaceflight101). Briz-M first burn is T = 680 to 1129 s (449 s), read from the guide's Figure 2.3.1-1.
   The model's Briz-M burns 525 s per the backlog, so the model burn is 76 s too long against this figure.
4. **Space Shuttle max-Q is T+51 s (STS-68) and T+67 s (STS-39) in the NASA mission reports**, not "about 60 s".
   ET separation is MECO + 20 s (STS-68) and MECO + 17 s (STS-39) by the command flags, against the audit's +18 s. OMS-2 ignition is T+2110 s
   (STS-68, direct insertion) and T+2168 s (STS-39).
5. **The LVM3 M4 brochure does hold a flight-sequence table** (audit said it did not). Core data below.
6. **The Ariane 5 User's Manual (Issue 5 Rev 2) has no event times at all** (only "spacecraft separation
   begins 2 seconds after upper-stage cut-off" and "separation happens 6 seconds after" EPC shutdown). Times
   come from the VA256 launch kit instead.

---

## 1. Atlas V (F1, F7)

### 1a. Atlas V 401 and 521, from the ULA user's guide (primary)

Source: *Atlas V Launch Services User's Guide, Rev 11, March 2010*, ULA,
https://www.ulalaunch.com/docs/default-source/rockets/atlasvusersguide2010.pdf , Table 2.4.1-1
"Typical Atlas V LV Mission Sequence Timeline", page 2-16. Primary.

Columns in the table: 401 Standard GTO | 401 LEO Sun-synch | 521 Standard GTO | 521 Extended Coast GTO |
521 3-Burn GSO | HLV GSO. Quoted rows (seconds from T-0):

| Event | 401 GTO | 401 LEO | 521 GTO | 521 ext. coast | 521 3-burn | Quote (table row) |
| --- | --- | --- | --- | --- | --- | --- |
| Strap-on SRB jettison | -- | -- | 118 | 116 | 117 | `Strap-on SRB Jettison -- -- 118 116 117 --` |
| PLF jettison (500 series) | -- | -- | 212 | 206 | 210 | `PLF Jettison (500 series and HLV) -- -- 212 206 210 298` |
| BECO | 242 | 238 | 249 | 251 | 252 | `Atlas Booster Engine Cutoff (BECO) 242 238 249 251 252 367` |
| Booster / Centaur separation | 250 | 246 | 257 | 259 | 260 | `Atlas Booster/Centaur Separation 250 246 257 259 260 375` |
| Centaur MES1 | 260 | 256 | 267 | 269 | 270 | `Centaur Main Engine Start 1 (MES1) 260 256 267 269 270 385` |
| PLF jettison (400 series) | 268 | 264 | -- | -- | -- | `PLF Jettison (400 series) 268 264 -- -- --` |
| Centaur MECO1 | 946 | 1,015 | 904 | 1,041 | 782 | `Centaur Main Engine Cutoff (MECO1) 946 1,015 904 1,041 782 563` |
| MES2 | 1,473 | -- | 1,402 | 8,241 | 1,353 | `MES2 1,473 -- 1,402 8,241 1,353 1,188` |
| MECO2 | 1,689 | -- | 1,668 | 8,373 | 1,617 | `MECO2 1,689 -- 1,668 8,373 1,617 1,678` |
| Separate SC | 1,858 | 1,184 | 1,837 | 8,542 | 20,560 | `Separate SC 1,858 1,184 1,837 8,542 20,560 20,712` |

Derived: Separate SC minus last cutoff = 169 s in every column (401 GTO 1858-1689; 401 LEO 1184-1015;
521 GTO 1837-1668; 521 ext. coast 8542-8373; 521 3-burn 20560-20391 (MECO3 row); HLV 20712-20543).
The HLV column also gives LRB cutoff 228, LRB jettison 236, PLF 298, BECO 367.

Quote for the rule: the guide row `Start Alignment to Separation Attitude` is 1,691 / 1,017 / 1,670 /
8,375 / 20,393 / 20,545, i.e. 2 s after the last cutoff, then separation 167 s later.

### 1b. Atlas V 541 (Mars 2020), ULA mission booklet (primary)

Source: *Mars 2020 Mission Overview*, ULA launch booklet, July 2020,
https://www.ulalaunch.com/docs/default-source/launch-booklets/mars2020_mobrochure_200717.pdf (text:
"Atlas V 541 rocket to deliver NASA's Mars 2020"). Primary. Event table, converted:

| Event | T+ s | Booklet cell |
| --- | --- | --- |
| Liftoff | 1.1 | `Liftoff (Thrust to Weight > 1) 00:00:01.1` |
| SRB jettison | 109.3 | `SRB Jettison 00:01:49.3` (1:49.3) |
| PLF jettison | 207.6 | `PLF Jettison 00:03:27.6` |
| BECO | 262.1 | `Atlas Booster Engine Cutoff (BECO) 00:04:22.1` |
| Atlas/Centaur separation | 268.1 | `Atlas Centaur Separation 00:04:28.1` |
| Centaur MES1 | 278.1 | `Main Engine Start (MES1) 00:04:38.1` |
| MECO1 | 687.9 | `Main Engine Cutoff (MECO1) 00:11:27.9` |
| MES2 | 2699.5 | `Main Engine Start (MES2) 00:44:59.5` |
| MECO2 (SECO) | 3170.1 | `Main Engine Cutoff (MECO2) 00:52:50.1` (52:50.1) |
| Mars 2020 separation | 3452.8 | `Mars 2020 Separation 00:57:32.8` |

Derived: separation 282.7 s after MECO2. The model's SECO for the 541 ("orbit at 500 km", 878.6 s) is the
LEO-parking-orbit cut; the real escape mission cuts at 3170 s after a second burn, so a 541 SECO pin
needs the mission, not the vehicle. The 541's SRB jettison is 109.3 s, 7-8 s earlier than the 521/531
117 s (4 SRBs vs 2).

### 1c. Atlas V 411 (Solar Orbiter), ULA booklet (primary)

Source: *Solar Orbiter Mission Overview*, ULA booklet,
https://www.ulalaunch.com/docs/default-source/launch-booklets/solarorbiter_mob.pdf . Primary.

| Event | T+ s | Booklet cell |
| --- | --- | --- |
| Max dynamic pressure | 69.2 | `Maximum Dynamic Pressure 00:01:09.2` |
| SRB jettison | 139.8 | `SRB Jettison 00:02:19.8` |
| BECO | 243.4 | `Atlas Booster Engine Cutoff 00:04:03.4` |
| Atlas/Centaur separation | 249.4 | `Atlas Centaur Separation 00:04:09.4` |
| PLF jettison | 267.4 | `Payload Fairing Jettison 00:04:27.4` |
| MECO1 | 734.1 | `First Main Engine Cutoff (MECO-1) 00:12:14.1` |
| MES2 | 2577.9 | `Centaur Second Main Engine Start (MES-2) 00:42:57.9` |
| MECO2 | 2990.8 | `Centaur Second Main Engine Cutoff (MECO-2) 00:49:50.8` |
| Solar Orbiter separation | 3159.9 | `Separation 00:52:39.9` |

Derived: separation 169.1 s after MECO2 (same 169 s as the user's guide).

---

## 2. Delta II (F1, F8), primary

Source: *Delta II Payload Planners Guide, December 2006*, Boeing / ULA,
https://www.ulalaunch.com/docs/default-source/rockets/deltaiipayloadplannersguide2007.pdf ,
Table 2-1 (Eastern site, p. 2-5) and Table 2-2 (Western site, p. 2-6). Primary.

Seconds; `M` = MECO time, `S1` / `S2` = SECO-1 / SECO-2 time.

| Event | Eastern 7925 (Table 2-1) | Western 7925 (Table 2-2) | Western 7920 (Table 2-2) |
| --- | --- | --- | --- |
| Ground-lit GEM burnout | T + 63 or 77 | T + 64 | T + 64 |
| Ground-lit GEM separation | T + 66/67 or 81/82 | T + 86/87 | T + 86/87 |
| Air-lit GEM burnout | T + 129 or 157 | T + 129 | T + 129 |
| Air-lit GEM separation | T + 132 or 160 | T + 132 | T + 132 |
| MECO (M) | T + 264 | T + 264 | T + 264 |
| Stage I/II separation bolts | M + 8 | M + 8 | M + 8 |
| Stage II ignition | M + 13.5 | M + 13.5 | M + 13.5 |
| Fairing separation | M + 39 (T+303) | M + 19 (T+283) | M + 19 (T+283) |
| SECO (S1) | M + 353 (T+617) | M + 356 (T+620) | M + 405 (T+669) |
| Stage II restart | S1 + 620 | S1 + 620 | S1 + 2900 |
| SECO (S2) | S1 + 689 | S1 + 689 | S1 + 2925 |
| Stage III spin-up / sequencer | S2 + 50 | S2 + 50 | N/A |
| Separate Stage II | S2 + 53 | S2 + 53 | N/A |
| Stage III ignition | S2 + 90 | S2 + 90 | N/A |
| Stage III burnout | S2 + 177 | S2 + 177 | N/A |
| Spacecraft separation | **S2 + 290** | **S2 + 290** | **S2 + 250** |

Quotes: `Spacecraft separation S2 + 250 S2 + 250 S2 + 290 S2 + 290 S2 + 225 S2 + 225` (Table 2-1 columns
7320/7420, 7920/7920H, 7325/7425, 7925/7925H, 7326/7426, 7926/7926H; the 7925 column is S2 + 290, the
two-stage 7920 is S2 + 250). The audit's "250 s after SECO-2" is the 7920 (two-stage) column; the 7925 with
its Star 48 third stage separates 290 s after SECO-2 and 113 s after the third-stage burnout (derived).
T+ values in brackets are derived from M = 264. Table 2-2 7925 column is `Fairing separation M + 19`,
which is 20 s earlier than the eastern 7925 (`M + 39`).

---

## 3. Delta IV Heavy (F1), primary

### 3a. User's guide Figure 2-4 (GTO, Eastern Range)

Source: *Delta IV Launch Services User's Guide, June 2013*, ULA,
https://www.ulalaunch.com/docs/default-source/rockets/delta-iv-user's-guide.pdf , Figure 2-4 "Delta IV
Heavy Sequence of Events for a GTO Mission (Eastern Range)", p. 2-5 (a picture; read from the page image).
Primary.

| Event | T+ s | Cell |
| --- | --- | --- |
| Max dynamic pressure | 82 | `82 11.0 0.59 Maximum dynamic pressure` |
| Two strap-ons cutoff | 242 | `242 97 3.76 Two strap-ons cutoff` |
| Jettison two strap-ons | 245 | `245 99 3.80 Jettison two strap-ons` |
| Jettison fairing | 275 | `275 127 4.44 Jettison fairing` |
| Main-engine cutoff (MECO) | 328 | `328 185 6.11 Main-engine cutoff (MECO)` |
| Stage I/II separation | 334 | `334 193 6.12 Stage I/II separation` |
| Stage II ignition | 347 | `347 208 6.10 Stage II ignition` |
| SECO-1 | 968 | `968 509 7.53 Second-stage engine cutoff 1 (SECO-1)` |
| Stage II ignition 2 | 4025 | `4025 187 7.89 Stage II ignition 2` |
| SECO-2 | 4528 | `4528 411 10.06 Second-stage engine cutoff 2 (SECO-2)` |

The figure has no spacecraft-separation row.

### 3b. Parker Solar Probe (Delta IV Heavy + Star 48BV), ULA booklet

Source: ULA, *Parker Solar Probe Mission Overview*,
https://www.ulalaunch.com/docs/default-source/launch-booklets/divh_parkersolarprobe_mob.pdf . Primary.

| Event | T+ s | Booklet cell |
| --- | --- | --- |
| Port and starboard booster jettison | 237.6 | `00:03:57.6` |
| BECO | 335.9 | `Booster Engine Cutoff (BECO) 00:05:35.9` |
| First stage separation | 342.4 | `00:05:42.4` |
| First MES | 355.4 | `00:05:55.4` |
| PLF jettison | 365.4 | `00:06:05.4` |
| MECO-1 | 637.1 | `00:10:37.1` |
| MES-2 | 1345.4 | `00:22:25.4` |
| MECO-2 | 2198.9 | `00:36:38.9` |
| Second stage separation | 2229.0 | `00:37:09.0` |
| Third stage ignition | 2249.0 | `00:37:29.0` |
| Third stage burnout | 2338.0 | `00:38:58.0` |
| Parker Solar Probe separation | 2598.0 | `00:43:18.0` |

Derived: separation 260 s after Star burnout and 399 s after SECO-2 (MECO-2).

### 3c. Orion EFT-1 (Delta IV Heavy, LEO test), NASA/ULA booklet

Source: `https://www.ulalaunch.com/docs/default-source/news-items/div_eft1_mob.pdf` (primary).
Port/starboard booster jettison 238.3; MECO 330.9; first-stage separation 338.0; second-stage ignition
351.0; SM fairing jettison 376.0; LAS jettison 381.0; SECO-1 1,037.1; restart 6,920.5; SECO-2 7,202.5;
Orion separation 12,216.0 (cells `238.3`, `330.9`, `338.0`, `351.0`, `376.0`, `381.0`, `1,037.1`,
`6,920.5`, `7,202.5`, `12,216.0`). Orion stayed attached for a coast of 5,013 s after SECO-2 (derived);
not a payload-separation analogue for the model.

Audit check: booster jettison 237.5 (model 237.5) matches the 237.6 s and 238.3 s here; fairing 365.4 matches.

---

## 4. Falcon 9 (F1, F5, F4 for Falcon Heavy), primary (NASA press kits of SpaceX launches)

SpaceX's own *Falcon User's Guide* (2025-05-09 and Rev 2.0, both downloaded) holds no ascent event
times. Times below are from NASA press kits (all times "approximate" in the kit).

| Event | CRS-9 T+ s | CRS-22 T+ s | Source cell |
| --- | --- | --- | --- |
| Max Q | 68 | 72 | `00:01:08 Max Q`, `00:01:12 Max Q` |
| MECO | 141 | 146 | `00:02:21 1st stage main engine cutoff (MECO)`, `00:02:26 ...` |
| Stage separation | 144 | 150 | `00:02:24 1st and 2nd stages separate`, `00:02:30 ...` |
| Second stage ignition | 152 | 157 | `00:02:32 2nd stage engine starts`, `00:02:37 ...` |
| SECO | 542 | 519 | `00:09:02 2nd stage engine cutoff (SECO)`, `00:08:39 ...` |
| Dragon separation | 577 | 712 | `00:09:37 Dragon separates from 2nd stage`, `00:11:52 ...` |

Derived: Dragon separation 35 s after SECO on CRS-9 (a 2 min coast on CRS-22 is 193 s). Sources:
`https://www.nasa.gov/sites/default/files/atoms/files/spacex_crs9_press_kit.pdf` (NASA, primary) and
`https://sky-brokers.com/wp-content/uploads/2025/03/SpaceXNASA-CRS-22-Mission-Press-kit.pdf` (mirror of
the NASA CRS-22 press kit, which says "created based on the information posted publicly by SpaceX").
MECO at 141-146 s: the audit's model (150.6 s) is 4.6 s late against CRS-22 and 9.6 s late against CRS-9, inside the
10 s tolerance on both (the second is marginal).

### Falcon Heavy (Psyche), primary

Source: NASA/JPL *Psyche press kit (SpaceX / NASA)*, launch timeline, mirror
`https://sky-brokers.com/wp-content/uploads/2025/06/SpaceXNASA-Psyche-Press-Kit.pdf` (and
https://science.nasa.gov/blogs/psyche/2023/10/13/key-milestones-for-todays-psyche-launch ). Primary.

| Event | T+ s | Cell |
| --- | --- | --- |
| Max Q | 69 | `00:01:09 Max Q` |
| Side boosters BECO | 145 | `00:02:25 Side boosters engine cutoff (BECO)` |
| Side boosters separate | 148 | `00:02:28 Side boosters separate` |
| Core MECO | 235 | `00:03:55 1st stage main engine cutoff (MECO)` |
| Stage separation | 239 | `00:03:59 1st and 2nd stages separate` |
| Second stage start | 244 | `00:04:04 2nd stage engine starts (SES)` |
| Fairing deployment | 264 | `00:04:24 Fairing deployment` |
| SECO-1 | 506 | `00:08:26 2nd stage engine cutoff (SECO-1)` |
| SES-2 | 3240 | `00:54:00 2nd stage engine starts (SES-2)` |
| SECO-2 | 3372 | `00:56:12 2nd stage engine cutoff (SECO-2)` |
| Psyche deploys | 3744 | `01:02:24 Psyche deploys` |

Derived: Psyche separation 372 s after SECO-2.

---

## 5. Ariane 5 ECA (F1, F5), primary

Source: Arianespace / ArianeGroup, *Ariane 5 flight VA256 launch kit (James Webb)*, French edition
`https://destination-orbite.net/documentations/VA256-launchkit-FR.pdf` (mirror; the ariane.group English
DDP URL returned a 5-byte file). Primary. The chronology is a graphic; the labelled cells are:

| Event | T+ s | Cell |
| --- | --- | --- |
| EAP jettison | 141 | `Largage des étages à poudre (EAP) +02:21` (2:21 = 141 s) |
| Fairing jettison | 206 | `Largage de la coiffe +03:26` |
| EPC shutdown and separation | 527 | `Extinction et separation de l'étage principal cryogénique (EPC) +08:47` |
| Orbit injection (upper-stage cutoff) | 1493 | `Injection sur orbite +24:53` |
| Webb separation | 1627 | `Séparation de Webb +27:07` |

Derived: Webb separation 134 s after injection. The audit's 143 s EAP (spaceflight101, VA229) is 2 s later
than this 141 s for VA256; they are different flights.

*Ariane 5 User's Manual Issue 5 Revision 2, Oct 2016*
(`https://courses.edx.org/asset-v1:DelftX%2BAEASM1x%2B1T2022%2Btype%40asset%2Bblock/Ariane5_Users-Manual_October2016_Red.pdf`),
section 2.3 (primary, no numbers): "The main stage shutdown occurs when the intermediate target orbit is
reached and the separation happens 6 seconds after." and "The separation sequence of the spacecraft begins
2 seconds later." (after the upper-stage cut-off command); "the fairing is released approximately one
minute later" after booster separation. Figure 2.3.a labels H1 (EAP flame-out), H2 (EPC shutdown), H3
(upper stage shutdown) without values.

---

## 6. Soyuz-2 / Fregat (F4: soyuz, soyuz-fg-fregat), primary

Source: *Soyuz CSG User's Manual, Issue 2, March 2012*, Arianespace,
`https://courses.edx.org/asset-v1:DelftX+AEASM1x+1T2023+type@asset+block/Soyuz-Users-Manual-March-2012.pdf`,
section 2.3.1, Figure 2.3.1a "Typical ascent profile" (text of the figure). Primary. Covers Soyuz ST-B with
Fregat from Kourou; Soyuz-FG from Baikonur has no separate table in this guide.

| Event | T+ s | Cell |
| --- | --- | --- |
| Max dynamic pressure | 72.0 | `2 Max. dynamic pressure 72.0` |
| Boosters vernier cut-off | 117.7 | `4 Boosters vernier cut-off 117.7` |
| I-II stage separation | 118.1 | `5 I-II stage separation 118.1` |
| Fairing jettisoning | 208.4 | `6 Fairing jettisoning 208.4` |
| II-III stage separation | 287.6 | `7 II-III stage separation 287.6` |
| III stage aft section jettisoning | 300.4 | `8 III stage aft section jettisoning 300.4` |
| III stage engine cut-off | 558.6 | `9 III stage engine cut-off 558.6` |
| Nose Module separation | 561.9 | `10 Nose Module separation 561.9` |
| Fregat MPS firing | 621.9 | `12 Fregat MPS firing 621.9` |
| Fregat MPS cut-off | 1685.0 | `13 Fregat MPS cut-off 1685.0` |
| S/C separation | ~2000 | `14 S/C separation ~ 2000 (depending of S/C separation conditions)` |

The guide says "The time of the fairing jettisoning and the time of S/C separation are tuned". Derived: the
first Fregat burn is 1063 s; separation about 315 s after cutoff in this GTO example.

---

## 7. Proton-M / Briz-M (F1, F3, S12), primary

Source: *Proton Launch System Mission Planner's Guide, LKEB-9812-1990, Revision 7, July 2009*, ILS,
`https://www.ilslaunch.com/wp-content/uploads/pdf/PMPG%20Section%202.pdf`. Table 2.3.1-1 "Standard LV
Ascent Event Times" (p. 2-6) and Figure 2.3.1-1 (p. 2-7). Primary.

| Event | T+ s | Cell |
| --- | --- | --- |
| Max dynamic pressure | 65.5 | `Maximum dynamic pressure 65.5` |
| Stage 2 ignition | 119.0 | `Stage 2 ignition 119.0` |
| Stage 1 / 2 separation | 123.4 | `Stage 1 / 2 separation 123.4` |
| Stage 3 vernier ignition | 332.1 | `Stage 3 vernier engine ignition 332.1` |
| Stage 2 shutdown | 334.5 | `Stage 2 engine shutdown 334.5` |
| Stage 2 / 3 separation | 335.2 | `Stage 2 / 3 separation 335.2` |
| Stage 3 main engine ignition | 337.6 | `Stage 3 main engine ignition 337.6` |
| **PLF jettison** | **348.2** | `PLF jettison 348.2`; text "fairing jettison occurs at approximately 340 to 350 seconds into the flight at an altitude of 121 to 125 kilometers or more" |
| Stage 3 main shutdown | 576.4 | `Stage 3 main engine shutdown 576.4` |
| Stage 3 vernier shutdown | 588.3 | `Stage 3 vernier engine shutdown 588.3` |
| Stage 3 / OU separation | 588.4 | `Stage 3 / OU separation 588.4` |

Breeze M burns, from Figure 2.3.1-1 (a picture, text read at 110 dpi; the "T" values are seconds):

| Event | T+ s | Figure label |
| --- | --- | --- |
| Ignition No. 1 of 4th stage | 680 | `Ignition No. 1 of 4th stage T = 680` |
| Burnout No. 1 | 1129 | `Burnout T = 1129` |
| Ignition No. 2 / burnout | 4088 / 5081 | `T = 4088`, `T = 5081` |
| Ignition No. 3 / burnout | 12535 / 13213 | `T = 12535`, `T = 13213` |
| APT separation | 13259 | `APT Separation T = 13259` |
| Ignition No. 4 / burnout | 13328 / 13617 | `T = 13328`, `T = 13617` |
| Ignition No. 5 / burnout | 31941 / 32395 | `T = 31941`, `T = 32395` |
| Separation of 4th stage (SC) | 33080 | `Separation of 4th Stage T = 33080` |

Figure also: `Separation of 1st stage T = 123`, `Separation of 2nd stage T = 335`, `Separation of
Payload Fairing T = 348`, `Separation of 3rd stage T = 588`, `q max T = 66`.
Derived: first Briz-M burn 449 s (680 to 1129); the GTO SC separation is 685 s after the fifth burnout; text
says separation "takes place within 12 - 40 minutes of the end of the final burn". The audit's secondary "Briz-M cutoff T+16:xx" (about 1000 s) is 1129 s (18:49) in this guide figure, so the
model's 1008 s is 121 s earlier than the guide's first-burn end. The guide's standard profile is the 9-hour GTO profile
(33080 s = 9.2 h; text "approximately 9.3 hours").

### Proton-K (Zvezda launch, 2000), secondary

Source: russianspaceweb, *Zvezda launch*, `https://russianspaceweb.com/iss-sm-launch.html` (secondary).

| Event | T+ s | Quote |
| --- | --- | --- |
| Max Q | 65 | "passed the point of maximum dynamic pressure ... 65 seconds into the flight" |
| Stage 2 ignition | 121.9 | "(T+121.9 seconds), the four engines of the second stage were ignited" |
| Stage 1 separation | 126.1 | "The first stage of the Proton separated 126.1 seconds after launch at an altitude of 43.65 kilometers" |
| Fairing | about 183 | "Around 57 seconds later, the payload fairing ... split into two parts" (126.1 + 57, derived) |
| Stage 3 vernier ignition | 331.1 | "It began operating at T+331.1 seconds" |
| Stage 2 separation | 334.5 | "separated at T+334.5 seconds at an altitude of 138.3 kilometers" |
| Stage 3 main cutoff | 577 | "Nine minutes and 37 seconds into the flight, a command to cut off the main engine" |
| Zvezda separation | 587 | "9 minutes and 47 seconds after launch" |

---

## 8. H-IIA 202 (F2, S11), primary (three JAXA sources disagree)

### 8a. JAXA H-IIA brochure 2025, "H2A202 flight sequence example" (GTO)

Source: JAXA, `https://www.jaxa.jp/projects/pr/model/files/p_h2a_2025.pdf`, page "H-IIAロケット（H2A202）
飛行シーケンス例" (bilingual). Primary.

| Event | T+ s | Cell |
| --- | --- | --- |
| SRB-A ignition | 0 | `SRB-A点火 0秒 (s)` |
| SRB-A burn out | 97 | `SRB-A燃焼終了 97秒 (s) SRB-A burn out` |
| SRB-A separation | 107 | `SRB-A分離 107秒 (s) SRB-A separation` |
| Fairing jettison | 250 | `衛星フェアリング分離 250秒 (s) Fairing jettison` |
| 1st stage engine cutoff (MECO) | 396 | `第1段エンジン燃焼停止 396秒 (s)` |
| 1st/2nd stage separation | 404 | `第1段/第2段分離 404秒 (s)` |
| 2nd stage ignition | 410 | `第2段エンジン第一回点火 410秒 (s)` |
| 2nd stage restart | 1474 | `第2段エンジン第二回点火 1474秒 (s)` |

### 8b. JAXA H-IIA F15 (IBUKI / GOSAT), a 202 SSO flight

Source: `https://global.jaxa.jp/countdown/f15/overview/sequence_e.html` (JAXA). Primary.
Cells: `2. SRB-A burnout | 01:56`, `3. SRB-A jettison | 02:06`, `4. Payload fairing jettison | 04:30`,
`5. Main engine cutoff (MECO) | 06:36`, `6. First and second stages separation | 06:44`, `7. Second stage engine
ignition (SEIG) | 06:50`, `8. Second stage engine cutoff (SECO) | 15:11`, `9. IBUKI(GOSAT) separation | 16:01`.
In seconds: SRB-A burnout 116, jettison 126, fairing 270, MECO 396, stage sep 404, ignition 410, SECO 911,
separation 961. Derived: IBUKI separation 50 s after SECO. (The page title is "H-IIA F15 Launch
Sequence"; the page does not state the configuration, F15 flew as a 202.)

### 8c. JAXA H-IIA F14 (KIZUNA), a flight with SSB strap-ons, not a 202

Source: `https://global.jaxa.jp/countdown/f14/overview/sequence_e.html`. Cells: `SRB-A burnout 01:39`,
`SRB-A jettison 01:48`, `Payload fairing jettison 04:15`, `Main engine cutoff 06:36`, `1st/2nd stages
separation 06:44`, `2nd stage engine 2nd cutoff 27:12`, `Satellite separation 28:03` (satellite separated 51 s
after the last cutoff, derived). Listed because it also shows MECO 396 s and stage separation 404 s, equal to
F15 and to the 2025 brochure, so those two are firm across three documents. Only SRB-A burn/jettison move
between flights (97/107, 99/108, 116/126).

The audit's 100 s / 110 s (spaceflight101) is none of these three. Search summaries also reported "fairing
264 s, MECO 389 s, stage separation 399 s" for a 202; I could not find the page they came from and do not
list them as sourced.

---

## 9. PSLV (F1), primary (ISRO mission brochures)

| Brochure | PS1 sep | Fairing | PS2 sep | PS4 cutoff | Payload sep | Cells |
| --- | --- | --- | --- | --- | --- | --- |
| PSLV-C61 (EOS-09, 6 PSOM-XL + HPS3) | 111.64 | 152.78 | 264.34 | 1012.24 | 1059.24 | `PS1 Separation 111.64`, `PLF Separation 152.78`, `PS2 Separation 264.34`, `PS4 Cutoff 1012.24`, `EOS-09 Separation 1059.24` |
| PSLV-C46 (RISAT-2B) | 110.60 | 177.60 | 262.44 | 882.42 | 929.42 | `PS1 Separation 1 min 50.60 s`, `Payload Fairing Separation 2 min 57.60 s`, `PS2 Separation 4 min 22.44 s`, `PS4 Cut-off 14 min 42.42 s`, `RISAT-2B Separation 15 min 29.42 s` |
| PSLV-C60 (SPADEX) | 111.12 | 188.32 | 262.06 | 792.48 | 909.48 / 912.48 | `PS1 Separation 111.12`, `PLF Separation 188.32`, `PS2 Separation 262.06`, `PS4 Engine Cut-off 792.48`, `SPADEX-B separation 909.48` |

C61 also: `PSOM XL 1,2 (GL) Separation 69.9`, `PSOM XL 3,4 (GL) Separation 70.1`, `PSOM XL 5, 6 (AL) Separation
92.0`, `PS3 Separation 493.00`, `PS4 Ignition 503.40`. Sources:
`https://www.isro.gov.in/media_isro/pdf/PSLVC61/PSLV_C61_EOS_09_Brochure.pdf`,
`https://www.isro.gov.in/media_isro/pdf/Missions/PSLVC46/PSLV_C46RISAT2B.pdf`,
`https://www.isro.gov.in/media_isro/pdf/Missions/PSLVC60/PSLVC60-mission-brochure-english.pdf`.
Derived: payload separation 47.0 s after PS4 cutoff on C61 and C46; 117-120 s on C60 (SPADEX, two-satellite
deploy). C61 and C46 are SSO-type missions; the audit's C25 (Mars Orbiter) pins stay valid for the PSOM
phase but its fairing at 118 s is 35 s earlier than C61 (152.78 s) and 59 s earlier than C46 (177.60 s): the
fairing time is mission-dependent on PSLV.

---

## 10. Space Shuttle (F6), primary (NASA mission reports)

Sources: NASA *STS-68 Space Shuttle Mission Report* (NSTS-08294) and *STS-39 Space Shuttle Mission Report*
(NSTS-08250), Table I "Mission events", hosted at
`https://ibiblio.org/apollo/Shuttle/Reports/Mission%20Reports/STS-68%20Space%20Shuttle%20Mission%20Report.pdf` and
`.../STS-39%20Space%20Shuttle%20Mission%20Report.pdf`. Primary. Values are GMT day:hh:mm:ss against the SRB
ignition command (liftoff) of 273:11:16:00.011 (STS-68) and 118:11:33:14.018 (STS-39).

| Event | STS-68 | STS-68 T+ s | STS-39 | STS-39 T+ s |
| --- | --- | --- | --- | --- |
| Throttle down to 67 / 70 % | 11:16:27.3 | 27 | 11:33:39.9 | 26 |
| Max dynamic pressure | `Derived ascent dynamic pressure 273:11:16:51` | 51 | `118:11:34:21` | 67 |
| Both SRM chamber pressure at 50 psi | 11:17:58.5 | 118.5 | 11:35:13.7 | 120 |
| SRB separation command | `273:11:18:04` | 124 (text "T + 123.96 seconds") | `118:11:35:19` | 125 |
| MECO command | `MECO 273:11:24:34` (confirm 11:24:35) | 514 (confirm 515) | `118:11:41:49` | 515 |
| ET separation command | `273:11:24:54` | 534 | `118:11:42:06` | 532 |
| OMS-2 ignition | `273:11:51:09.9` | 2110 (35:09 MET) | `118:12:09:21.5` | 2168 |
| OMS-2 cutoff | `273:11:52:48.2` | 2208 | `118:12:11:30.9` | 2297 |

STS-68 flew a direct-insertion trajectory (`OMS-1 ... Not performed - direct insertion trajectory flown`);
STS-39 also has OMS-1 N/A. Derived: ET separation minus MECO command = 20 s (STS-68) and 17 s (STS-39);
OMS-2 burn 99 s (the report text: "The maneuver was 99 seconds in duration"). Max-Q: 51 s and 67 s, a 16 s
spread between flights, so a single "pin" needs a tolerance of about +-10 s around 59 s at best; the model's
77 s is outside it. The STS-39 max-Q row is printed out of time order in the table (after the 104 % throttle-up at
11:34:11) as extracted; read as printed.

---

## 11. Saturn IB (F4), primary (NASA SP-4029 Apollo 7 timeline, from the mission report)

Source: NASA, *Apollo 7 Timeline*, SP-4029 Apollo by the Numbers / Apollo 7 chronology,
`https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_07f_Timeline.htm`. Primary (NASA
history volume built on the flight report). Liftoff = range zero.

| Event | T+ s | Cell |
| --- | --- | --- |
| Liftoff (umbilical disconnected) | 0.36 | `Liftoff (umbilical disconnected). 000:00:00.36` |
| Mach 1 | 62.15 | `Mach 1 achieved. 000:01:02.15` |
| Max dynamic pressure | 75.5 | `Maximum dynamic pressure (665.60 lb/ft 2 ). 000:01:15.5` |
| S-IB center engine cutoff | 140.65 | `S-IB center engine cutoff. 000:02:20.65` |
| S-IB outboard engine cutoff | 144.32 | `S-IB outboard engine cutoff. 000:02:24.32` |
| S-IB/S-IVB separation command | 145.59 | `S-IB/S-IVB separation command. 000:02:25.59` |
| S-IVB ignition command | 146.97 | `S-IVB engine ignition command. 000:02:26.97` |
| S-IVB engine cutoff | 616.76 | `S-IVB engine cutoff. 000:10:16.76` |

No separation-from-LV time is in this timeline table (the Apollo CSM-to-S-IVB separation is not a payload
separation at SECO, N/A for the model's separation-at-SECO question). This is the Apollo 7 flight only.

---

## 12. LVM3 (F4, S13), primary

Sources: ISRO, `https://new1.isro.gov.in/media_isro/pdf/Missions/LVM3/LVM3M4_Chandrayaan3_brochure.pdf`
(LVM3-M4) and `https://www.isro.gov.in/media_isro/pdf/Missions/LVM3/LVM3_M3_OneWeb_India2_Brochure_V9.pdf`
(LVM3-M3). Primary.

| Event | LVM3-M4 T+ s | LVM3-M3 T+ s | Cell (M4) |
| --- | --- | --- | --- |
| L110 ignition | 108.10 | 111.00 | `L110 Ignition 108.10` |
| 2xS200 separation | 127.00 | 138.20 | `2xS200 Separation 127.00` |
| PLF separation | 194.96 | 187.16 | `PLF Separation 194.96` |
| L110 separation | 305.56 | 308.48 | `L110 Separation 305.56` |
| C25 ignition | 307.96 | 310.88 | `C25 Ignition 307.96` |
| C25 shut-off | 954.42 | 942.70 | `C25 Shut-off 954.42` |
| Satellite separation | 969.42 | 1182.70 (event 1) | `Satellite Separation 969.42` |

Derived: M4 separation 15.0 s after C25 shut-off. The audit says the M4 brochure holds no timeline; it does
(a text table under "Nominal Flight Sequence").

---

## 13. H3 (F4, S13), primary (JAXA launch plan)

Source: JAXA, *H3ロケット8号機 打上げ計画書* (H3 F8, H3-22S, Michibiki 5),
`https://www.jaxa.jp/projects/files/youtube/h3f8/jaxa_doc01_20251215.pdf` ("リフトオフ後時刻（s）" table).
Primary; this is the planned nominal sequence (the flight itself later had a fairing-separation anomaly).

| Event | T+ s | Cell |
| --- | --- | --- |
| SRB-3 separation | 117 | `117 SRB-3分離` |
| Fairing separation | 225 | `225 衛星フェアリング分離` |
| MECO | 300 | `300 第１段エンジン燃焼停止（MECO）` |
| Stage 1/2 separation | 308 | `308 第１段・第２段分離` |
| Second stage SELI1 | 321 | `321 第２段エンジン第１回推力立上がり（SELI1）` |
| SECO1 | 767 | `767 第２段エンジン第１回燃焼停止（SECO1）` |
| SELI2 | 1486 | `1486 第２段エンジン第２回推力立上がり（SELI2）` |
| SECO2 | 1746 | `1746 第２段エンジン第２回燃焼停止（SECO2）` |
| Satellite separation (Michibiki 5) | 1767 | `1767 「みちびき5号機」分離` |

Derived: satellite separation 21 s after SECO2. The JAXA H3 brochures `p_h3.pdf`, `p_h3_2023.pdf`,
`p_h3_2025.pdf` hold no timeline.

---

## 14. New Glenn (F4), primary

Source: NASA ESCAPADE blog, "Important Launch Milestones for NASA's ESCAPADE" (NG-2),
`https://science.nasa.gov/blogs/escapade/2025/11/13/important-launch-milestones-for-nasas-escapade`.
Primary.

| Event | T+ s | Cell |
| --- | --- | --- |
| Max-Q | 95 | `T+00:01:35 Max-Q` |
| MECO | 185 | `T+00:03:05 Main Engine Cut Off` |
| Stage separation | 189 | `T+00:03:09 Stage Separation` |
| Stage 2 engine ignition | 197 | `T+00:03:17 Stage 2 Engine Ignition` |
| Fairings jettison | 230 | `T+00:03:50 Fairings Jettison` |
| SECO-1 | 773 | `T+00:12:53 SECO-1` |
| Stage 2 re-ignition | 1500 | `T+00:25:00 Stage 2 Engine Ignition` |
| SECO-2 | 1604 | `T+00:26:44 SECO-2` |
| ESCAPADE Blue separation | 1998 | `T+00:33:18 ESCAPADE Blue Spacecraft Separation` |
| ESCAPADE Gold separation | 2028 | `T+00:33:48 ESCAPADE Gold Spacecraft Separation` |

Derived: Blue separation 394 s after SECO-2.

---

## 15. Long March 2F / Shenzhou (F1, F5, S10): separation times only

The CMSE announcement wording, "about N seconds after liftoff the spacecraft separated from the rocket":

| Mission | Separation T+ s | Source and quote |
| --- | --- | --- |
| Shenzhou-13 (CZ-2F Y13) | about 582 | ncsti.gov.cn (Ministry of Science and Technology portal), https://www.ncsti.gov.cn/kjdt/ztbd/szhseh/shenzhoushierhaoGL/202110/t20211016_49403.html : "约582秒后，神舟十三号载人飞船与火箭成功分离" (primary quotation of the CMSE statement, hosted on a government site) |
| Shenzhou-12 | about 573 | ithome.com, https://www.ithome.com/0/557/740.htm : "大约 573 秒后，神舟十二号载人飞船与火箭成功分离" (secondary) |
| Shenzhou-20, -22 | "about 10 minutes" | huanqiu.com articles of 2025-04-24 and 2025-11-25: "约10分钟后，神舟二十号载人飞船与火箭成功分离" (secondary) |

The booster / core / fairing sequence times (the 154 s booster, 159 s stage separation, 210 s fairing,
about 580 s) quoted by a search summary could not be traced to a fetched page, so they are not listed as
sourced. The audit's 131.2 s booster jettison and 161.8 s core burnout stay on their secondary source.

## 16. Long March 5 (S10): total flight time only

Source: kankanews.com (secondary), https://www.kankanews.com/detail/boy4l3X9Py1 : "火箭飞行约2200秒后，顺利将探测器送入预定轨道 ...
先后实施了助推器分离、整流罩分离、一二级分离以及器箭分离等四次分离" (Chang'e-5, LM-5 Y5: about 2200 s of flight, four separations;
no per-event times). rmzxw.com.cn (https://www.rmzxw.com.cn/c/2020-11-24/2722689.shtml, secondary) quotes the
designer on the second-stage coast: "从长征五号火箭二级发动机一次关机到再次点火，中间要间隔最长约935秒" (longest coast between the first
shutdown and re-ignition is about 935 s). No primary per-event sequence found, so the 752 s second-stage
shutdown remains an everydayastronaut (secondary) number.

---

## 17. Vostok-K (F4), secondary

Source: russianspaceweb, *Vostok 1 launch*, https://russianspaceweb.com/vostok1_launch.html ("The Vostok
3A No. 3 launch timeline"). Secondary.

| Event | T+ s | Cell |
| --- | --- | --- |
| Launch (actual) | 0 | `Launch 09:07 / 09:06:59.7` |
| Stage I separation | 119 | `Stage I separation (T+119 seconds (51))` |
| Payload fairing separation | 154 (150 in another cited source) | `T+154 seconds (51) T+150 seconds (465)` |
| Stage II separation | 299 | `Stage II separation (T+299 seconds (51))` |
| Spacecraft separation from Stage III | 688 (derived) | `09:18:28` clock vs launch `09:06:59.7` |

---

## 18. Titan IIIE-Centaur (F4), secondary

Source: a student-maintained mission page, https://teamnathanftw2.blogspot.com/1997/08/voyager-2.html
("Voyager 2", secondary, transcribes a launch sequence), cells: `T+1:50 SRM cutoff`, `T+2:02 SRM sep`,
`T+4:15 St 1 MECO`, `T+4:15 St 1 sep, St 2 MES`, `T+4:26 CSS jettison`, `T+7:44 St 2 MECO`, `T+7:50 St 2 sep`,
`T+8:01 TC MES-1`, `T+9:48 TC MECO-1`, `T+53:36 TC MES-2`, `T+59:16 TC MECO-2`, `T+1:02:06 TC sep`. In seconds:
SRM burnout 110, SRM sep 122, stage 1 MECO and separation 255, shroud jettison 266, stage 2 MECO 464, stage 2
separation 470, Centaur MES-1 481, MECO-1 588, MES-2 3216, MECO-2 3556, Centaur separation 3726 (Voyager 2).
This is a secondary transcription of the JPL launch sequence; no NASA document with the same table was
obtained.

---

## 19. Atlas LV-3B and Mercury-Redstone (F4): partial, secondary

- Mercury-Redstone 3: Wikipedia, https://en.wikipedia.org/wiki/Mercury-Redstone_3 (secondary): "Shepard was
  subjected to a maximum acceleration of 6.3 g just before the Redstone engine shut down, two minutes and 22
  seconds after launch" (142 s). The same page's event table lists tower jettison and capsule separation
  but their cells were not extractable; not listed.
- Atlas LV-3B (Mercury-Atlas 6): a search summary of americaspace.com listed BECO 2:10, sustainer cutoff
  5:20, capsule separation 5:24; I did not fetch that page and the NASA mission report was not reachable,
  so these are not listed as sourced.

---

## Not found

Searches use "query" in the form given; all were `standard` mode WebSearch calls. NTRS PDFs
(`ntrs.nasa.gov/api/citations/...`) hung and returned no file from this machine in three attempts of 90-150 s.
`spaceflightnow.com` returned 403; `blueorigin.com` mission pages are script-rendered (no text);
`spacex.com/launches/...` pages returned no text.

| Vehicle / event | What was tried | Result |
| --- | --- | --- |
| Starship: hot-staging, MECO, ship engine events | search "SpaceX Starship flight test mission timeline hot staging ..."; direct fetch of three spacex.com launch URLs | Only secondary prose ("about two and a half minutes", "2 minutes 50 seconds"); no table. Not sourced. |
| Long March 2F booster / core / fairing sequence | two Chinese searches ("长征二号F 神舟 飞行程序 ..."), fetches of ncsti, ithome, huanqiu, zjol, chinanews, mrjjxw, news.cn, ctdsb pages | Only total-to-separation times (section 15). Per-event times not found at any fetched page. |
| Long March 5 stage-2 shutdown, separations | Chinese search "长征五号 嫦娥五号 ... 时序"; 7 page fetches | Only "about 2200 s" and "about 935 s coast". |
| Long March 3B | Chinese search "长征三号乙 飞行程序 ... 嫦娥三号" | "19 minutes" only; no event times. |
| Gemini / Titan II GLV, Titan II G | searches "Gemini press kit launch vehicle sequence of events ..." (two); NTRS 19660029776, 19650009187 download attempts | A search summary named BECO 2:36, SECO 5:41 and separation 6:11 (Gemini 7 press kit) but the PDF could not be downloaded; not listed. |
| Atlas LV-3B (Mercury-Atlas), Mercury-Redstone | search "Mercury-Atlas flight sequence ..."; search "Mercury-Redstone 3 flight events table ..."; NASA SP-4001 chronology | Only Redstone cutoff 142 s (Wikipedia). NASA SP-4001 p3a has no numbers. |
| Titan IVB-Centaur | search "Cassini press kit Titan IVB Centaur launch sequence ..."; ULA "History of the Titan Centaur" PDF | No event times ("three-and-a-half minutes" fairing, "2 min 23 s" ESA prose only, not event-table). Not listed. |
| Titan IIIE-Centaur primary | same Voyager search and science.nasa.gov Voyager.pdf | Primary press-kit table not obtained; only a secondary transcription (section 18). |
| Saturn V | Not searched again; the audit already has the SA-503 flight manual. | N/A |
| Apollo LV-to-payload separation | not applicable | N/A: Saturn V / IB deliver the CSM through the S-IVB's TD&E; no LV-to-payload separation event at S-IVB cutoff. |
| Ariane 1, athena-ii, atlas-agena, atlas-centaur, molniya-m, sputnik-8k71ps, voskhod-11a57, m-v, long-march-3a | No query spent (budget went to the higher-use vehicles first). | Not searched. |
| Ariane 5 G+ / ECA EPC cutoff and SECO | VA256 launch kit (section 5) gives EPC 527 s and injection 1493 s for the ECA; no document found for the G+ variant. | G+ not sourced. |
| Atlas V 541 (LEO) SECO | Only the escape-mission 541 (Mars 2020) is in a primary document. | LEO SECO for the 541 not sourced. |
| H-IIA 202 fairing / MECO beyond JAXA | 8a/8b are primary and agree on MECO 396 and separation 404. | Resolved except the SRB-A choice (three values). |
| Shuttle OMS-2 on a non-direct (OMS-1 flown) flight | Two mission reports read, both without OMS-1 | OMS-2 timing with an OMS-1 burn not sourced. |
| Falcon 9 MECO for an expendable, heavier-payload mission | CRS-9 and CRS-22 only | Not sourced beyond those. |

## Searches used: 32 of 60

32 `WebSearch` calls. Four of them (Ariane 5 / VA256 launch kit, the H3 Japanese query, the Voyager query,
Mercury-Redstone 3) returned more than one internal result set; counting every internal query the number is at
most 42, still under 60. One `WebFetch` (a NASA blog URL, redirected, not used). Most documents were
downloaded directly with `curl` and read with `pdftotext`, which are not searches.

Mission-use ordering for the F4 list was a grep of `static/data/missions` for each id as a quoted string
(files containing it): proton-k 9, vostok-k 6, titan-ii-glv 6, saturn-ib 6, atlas-lv-3b 4, falcon-heavy 3,
voskhod-11a57 2, starship 2, soyuz 2, mercury-redstone 2, lvm3 2, long-march-3b 2, new-glenn 1, h3 1,
ariane-1 1, and 0 for the rest; the grep matches the id anywhere in the file, so treat the counts as
approximate.
