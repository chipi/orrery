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

## Close-out 2026-11-19 (F4, F5, S10, S13, L63)

Two research passes (41 WebSearch calls of a 60 cap), then a timing fit with
`scripts/fit-launch-timeline.ts`: each fitted event moves by scaling one stage's thrust (propellant and
Isp kept), fairings take their published time, coasts are `separationDelayS`. Every fitted profile
still reaches orbit (`npx vitest run src scripts`: 542 files, 9349 tests). What is pinned, fitted or
recorded as a gap is in `src/lib/orbital/launch-timeline.test.ts`; the sources follow.

**Outcome per vehicle.** Pinned (primary): titan-ii-glv, atlas-lv-3b, atlas-agena, atlas-centaur,
titan-ivb-centaur, athena-ii, mercury-redstone, long-march-3a, long-march-3b, m-v, h3, the Helios A
cross-check on titan-iiie-centaur, soyuz-fg-fregat II-III separation. Pinned (secondary, no primary
exists): starship, sputnik-8k71ps, proton-k, long-march-5, vostok-k (already pinned). Unsourceable
after the searches below: ariane-1, titan-ii-g, molniya-m, soyuz (11A511), voskhod-11a57 (one
ambiguous 523 s figure), Vostok-K third-stage cutoff, Long March 2F per-event times (two Spaceflight
Now pages disagree with each other and with the existing spaceflight101 pin; no CASC table), Long
March 5 stage-2 shutdown (secondary only). Gaps the timing fit cannot close (the trajectory, not a burn
time): elliptical / high-energy injections (atlas-v 541, lvm3, new-glenn, atlas-centaur Centaur MECO,
h3 SECO1), Saturn IB S-IVB (the real 18.5 t payload does not reach orbit in the model), Proton-M Briz-M,
the Shuttle OMS-2 (`it.todo` rows).

**L63 separation delays** (`payloadSeparationDelayS`, and the new per-mission
`payloadSeparationDelayByMissionS`): atlas-lv-3b 2.2 s (MA-6, primary), titan-ii-glv 30 s (planned in
the GT-7 / GT-10 reports; flown 23.2-31.8 s), mercury-redstone 9.5 s (Mercury-Redstone Project
Table 3-1), soyuz-fg-fregat 3.3 s (ST-B guide nose-module separation; Soyuz-FG crewed 3.30 s,
secondary), sputnik-8k71ps 19.9 s (secondary), Falcon 9 Inspiration4 198 s and Polaris Dawn 197 s
(secondary), Ariane 5 SMART-1 884 s (secondary; the last of three payloads). Not applicable: Saturn IB
(the CSM stays on the S-IVB about 3 h, TD&E). Unsourceable: OTV-5, OTV-7, Vostok-K, Voskhod, Long
March 2F (no stage-2 cutoff time).

## Launch-timeline research, west vehicles (plan B: F4 / F5 / S10 / S13 / L63)

Researcher output, 2026-11-19. Times are seconds after liftoff. `m:ss` converted, conversion shown. "derived" = my subtraction.
Scanned-PDF OCR cells I could not read cleanly are flagged "(OCR)"; where it mattered I rendered the page and read it by eye.
NTRS pattern that worked: `https://ntrs.nasa.gov/api/citations/<id>/downloads/<id>.pdf` (curl, 60-150 s). NTRS keyword API
`https://ntrs.nasa.gov/api/citations/search?q=<words>` works for short queries (not counted as WebSearch).
jsc.nasa.gov / historycollection.jsc.nasa.gov mission_trans PDFs return an HTML wrapper to curl (no PDF).

### Headline findings

1. **Mercury-Atlas 6 (Friendship 7) primary table settles the disagreement**: sustainer cutoff (SECO) 5:01.4 = 301.4 s, tail-off complete 5:02 = 302 s,
   capsule separation 5:03.6 = 303.6 s (actual). The secondary "5:20 cutoff / 5:24 separation" is wrong by about 20 s on both; the 5:24 figure is
   the 5:03.6 separation misread. Separation is 2.2 s after SECO (derived). Planned: separation 5:03.8.
2. **Gemini / Titan II GLV spacecraft separation is 23 to 32 s after SECO**, five flights from the NASA Gemini Program Mission Reports
   (GT-4 31.8, GT-5 23.6, GT-7 31.8, GT-10 30.9, GT-12 23.2). BECO 152.4 to 155.6 s, SECO 333.3 to 343.5 s.
3. **Apollo 7 CSM did NOT separate from the S-IVB after cutoff**: S-IVB cutoff 616.76 s, CSM/S-IVB separation at 002:55:02.40 = 10,502.4 s
   (9,885.6 s after cutoff, derived). The spacecraft rode the S-IVB through the first two revolutions (manual attitude control test, LOX dump,
   then separation for the rendezvous exercise). Model for L63: Saturn IB crewed flights have no short "separation delay"; the planned time
   in the trajectory document is 10,495 s.
4. **Mercury-Redstone nominal**: cutoff 142.5 s, escape tower separation 143.0 s, capsule separation cutoff + 9.5 = 152.0 s (MSFC/NASA
   "The Mercury-Redstone Project"). MR-3 actual cutoff 142 s.
5. **Titan IVB/Centaur (Cassini) primary event times found** in the NASA/JPL Cassini launch press kit (all rows below). Cassini separates
   6 min after MECO-2 (plus about 0.5 min of settling).
6. **Titan IIIE/Centaur has a primary TC-2 (Helios A) and TC-5 (Helios B) flight-data report** with all stage events (NASA NTRS). The profile
   `titan-iiie-centaur` already cites the TC-4 (Viking 1) flight data (TM X-73475); the Helios reports give the two-burn escape sequence and
   spacecraft separation. No primary Voyager sequence was found.
7. **Athena II**: LMMS Lunar Prospector Mission Handbook Table 6.3-3 has the whole nominal sequence incl. separation from the OAM at 3,315 s.
8. **Atlas-Centaur AC-19/AC-20 (Mariner 6/7)**: NASA TM X-2278 flight events: BECO 147.1 s (AC-20), spacecraft separation 820.6 s,
   95 s after Centaur MECO 725.5 s.
9. **Falcon 9 Crew Dragon**: Dragon separates 198 s after SECO-1 (Inspiration4) and 197 s after SECO-1 (Polaris Dawn). Secondary (both are
   reproductions of SpaceX's published timeline; not NASA).
10. **Ariane 5 / SMART-1 (VA162)**: SMART-1 was the third and last satellite released; separation 41:40 = 2,500 s, 884 s after the upper-stage
    shutdown at 26:56 = 1,616 s. First satellite (Insat 3E) separates 125 s after shutdown.

---

### titan-ii-glv (Gemini: GT-3, GT-4, GT-6A, GT-7, GT-8, GT-12)

Primary: NASA *Gemini Program Mission Report* per flight (MSC), "Table 4-I / 4.2-I Sequence of events", times from lift-off.
I obtained GT-4, GT-5, GT-7, GT-10, GT-12. GT-3, GT-6A, GT-8 reports were not found as downloadable files (see tried list).

| event | T+ s | flight | source | primary/secondary | quote |
| --- | --- | --- | --- | --- | --- |
| BECO (stage I shutdown, 87FS2) | 152.43 | Gemini 4 (GLV-4) | *Gemini Program Mission Report: Gemini IV*, NTRS 19670095754, https://ntrs.nasa.gov/api/citations/19670095754/downloads/19670095754.pdf, Table 4-I | primary | `BECO (stage I engine shutdown (87FS2)) 153.37 152.43` (planned, actual) |
| stage separation begin | 153.14 | Gemini 4 | same | primary | `Stage separation begin 154.07 153.14 -0.93` |
| SECO (stage II shutdown, 91FS2) | 333.75 | Gemini 4 | same | primary | `SECO (stage II engine shutdown (91FS2)) 335.82 333.75 -2.07` (OCR "333.75") |
| spacecraft separation (shaped charge fired) | 365.55 | Gemini 4 | same | primary | `Spacecraft separation (shaped charge fired) 365.82 365.55 -0.27` |
| SECO to separation | 31.8 | Gemini 4 | derived | | 365.55 - 333.75 |
| BECO | 153.55 | Gemini 5 | *Gemini Program Mission Report Gemini V*, MSC-G-R-66-7 (ibiblio mirror) https://www.ibiblio.org/apollo/Documents/Gemini5MissionReport.pdf, Table 4.2-I | primary | `BECO (stage I engine shutdown (87FS2)) 154.83 153.55 -1.25` (OCR) |
| SECO | about 333.3 | Gemini 5 | same | primary | `Redundant stage II shutdown 336.93 333.32`; SECO row OCR "3_.28" (333.28 by the +3.65 diff to planned 336.95 is consistent) |
| spacecraft separation | 356.91 | Gemini 5 | same | primary | `Spacecraft separation (shape charge fired) 356.93 356.91 -0.02` (OCR) ; text: `Spacecraft separation from the launch vehicle occurred 23.6 seconds after SECO.` |
| BECO | 155.61 | Gemini 7 (GT-7, GLV-7) | *Gemini Program Mission Report Gemini VII*, https://www.ibiblio.org/apollo/Documents/Gemini7MissionReport.pdf, Table 4.2-I | primary | `BECO (stage I engine shutdown (87FS2)) 155.55 155.61 +0.26` |
| SECO | 337.01 | Gemini 7 | same | primary | `SECO (stage II engine shutdown (91FS2)) 338.61 337.01 -1.60` |
| spacecraft separation (shaped charge) | 368.79 | Gemini 7 | same | primary | `Spacecraft separation (shaped charge fire) 368.61 368.79 +0.18`; text: `Spacecraft separation was initiated by the pilot at second-stage engine cutoff (SECO) + 31.9 seconds` |
| BECO | 152.38 | Gemini 10 | *Gemini Program Mission Report Gemini X*, https://www.ibiblio.org/apollo/Documents/ (file 19750067644_1975067644.pdf; NTRS 1975 reprint), Table 4.2 | primary | `BECO (stage I engine cutoff) (87FS2) 152.38 152.38 0.00` |
| SECO | 340.57 | Gemini 10 | same | primary | `SECO (stage II engine cutoff) (91FS2) 339.74 340.57 +0.83` |
| spacecraft separation | 371.44 | Gemini 10 | same | primary | `Spacecraft separation (shaped charge fired) 369.74 371.44 +1.70` |
| BECO | 154.75 | Gemini 12 (GLV-12) | *Gemini Program Mission Report Gemini XII*, https://www.ibiblio.org/apollo/Documents/Gemini12MissionReport.pdf, Table 4.3-1 | primary | `BECO Time from lift-off, sec 153.38 (planned) 154.75 154.75 (actual preliminary, final)` |
| SECO | 343.54 | Gemini 12 | same | primary | `SECO Time from lift-off, sec 339.76 343.54 343.54`; text `SECO occurred at LO + 343.539 seconds` |
| spacecraft separation | 366.72 | Gemini 12 | same | primary | `Spacecraft separation Time from lift-off, sec 360.00 366.72 366.72` |
| SECO to separation | 23.2 | Gemini 12 | derived | | 366.72 - 343.54 |

Other: Gemini 7 press-kit values (BECO 2:36 = 156 s, SECO 5:41 = 341 s, separation 6:11 = 371 s) came only from a search summary and do NOT
match the Gemini 7 mission report actuals (155.61, 337.01, 368.79): they are planned values, not used. Gemini 4 "6 min 5.6 s = 365.6 s" from
a search summary agrees with the mission report 365.55.
Planned SECO to separation was 30 s in the Gemini 7 and 10 reports (planned sep - planned SECO: 368.61-338.61 = 30.0; 369.74-339.74 = 30.0).
Gemini 5 was planned as SECO + 20 (the report footnote "planned values are for spacecraft separation at SECO + 20 seconds") and flew 23.6.
For L63: a constant of about 30 s after SECO is the nominal GLV value (about 20 s on GT-5, 23 s on GT-12).

### titan-ii-g (Clementine, Titan II(23)G)

Unsourceable: one search ("Clementine launch ... flight sequence ..."), only launch date and mass; no event times. Not in the prior note's list;
no primary seen. (The NASA Clementine mission handbook was not located.)

### atlas-lv-3b (Mercury-Atlas: MA-6 Friendship 7; MA-7, MA-8, MA-9 use the same vehicle)

Primary: *Results of the First United States Manned Orbital Space Flight, February 20, 1962*, NASA Manned Spacecraft Center, NTRS 19930074071,
https://ntrs.nasa.gov/api/citations/19930074071/downloads/19930074071.pdf, Table 6-II "Sequence of Events During MA-6 Flight" (PDF page 79,
report p. 71). Rendered and read by eye; times are hr:min:sec from lift-off.

| event | T+ s | flight | source | primary/secondary | quote |
| --- | --- | --- | --- | --- | --- |
| Booster-engine cutoff (BECO) | 129.6 actual (planned 131.4) | MA-6 | NTRS 19930074071 Table 6-II | primary | `Booster-engine cutoff ... 00:02:11.4 | 00:02:09.6` (planned, actual) |
| Tower release | 153.3 actual (planned 154.2) | MA-6 | same | primary | `Tower release 00:02:34.2 | 00:02:33.3` |
| Escape rocket firing | 153.4 (planned 154.2) | MA-6 | same | primary | `Escape rocket firing 00:02:34.2 | 00:02:33.4` |
| Sustainer-engine cutoff (SECO) | 301.4 actual | MA-6 | same | primary | `Sustainer-engine cutoff (SECO) ... | 00:05:01.4` (no planned value printed) |
| Tail-off complete | 302 actual (planned 303.8) | MA-6 | same | primary | `Tail-off complete 00:05:03.8 | 00:05:02` |
| Spacecraft (capsule) separation | 303.6 actual (planned 303.8) | MA-6 | same | primary | `Spacecraft separation 00:05:03.8 | 00:05:03.6` |
| SECO to separation | 2.2 | MA-6 | derived | | 303.6 - 301.4 |

Same report text (Flight Control section): `The powered portion of the flight which lasted 5 minutes and 1 second was completely normal` (301 s).
Secondary values that disagreed (5:01.4 or 5:20 cutoff, 5:24 separation): 5:01.4 is the primary SECO. The "5:20 / 5:24" pair (a search
summary quoting a Mercury-Atlas 6 page, `At T+00:05:20, Atlas Sustainer Engine Cutoff ... At T+00:05:24, capsule separation`) is contradicted by
this primary table; 5:20/5:24 is about 20 s off. Use 301.4 / 303.6.
Orrery's profile cites BECO "about 2 min 9 s" (Wikipedia): the primary says 2:09.6 = 129.6 s. Agrees.

### mercury-redstone (MR-3 Freedom 7, MR-4 Liberty Bell 7)

Primary: J. L. Cassidy et al., *The Mercury-Redstone Project*, NASA, Dec 1964, NTRS 19670028606,
https://ntrs.nasa.gov/api/citations/19670028606/downloads/19670028606.pdf, Table 3-1 "MERCURY-REDSTONE Mission Sequence of Events" (nominal, seconds after liftoff).

| event | T+ s | flight | source | primary/secondary | quote |
| --- | --- | --- | --- | --- | --- |
| Begin tilt program (MR-BD, MR-3, MR-4) | 15.0 | nominal | NTRS 19670028606 Table 3-1 | primary | `(MR-BD, -3, and-4) 15.0` |
| Arm cutoff circuit to capsule | 129.5 | nominal | same | primary | `Arm cutoff circuit to capsule 129.5` |
| Arm velocity integrator cutoff circuit | 131.0 | nominal | same | primary | `Arm velocity integrator cutoff circuit 131.0` |
| Arm fuel-depletion cutoff circuit | 135.0 | nominal | same | primary | `135.0` |
| Nominal cutoff (velocity integrator) | 142.5 | nominal | same | primary | `Nominal cutoff time (initiated by velocity integrator) 142.5` |
| Escape tower separation, abort system deactivation | 143.0 | nominal | same | primary | `Escape tower separation and abort system deactivation 143.0` |
| Capsule separation | cutoff + 9.5 = 152.0 | nominal | same | primary | `Capsule separation Cutoff +9.5` ; text `[tower] jettisoned. This occurred 9.5 seconds before capsule separation.` |
| Max altitude | 308.7 (booster) / 309.1 (capsule) | nominal | same | primary | `Nominal maximum altitude (capsule) 309.1` |
| Actual cutoff | 142 | MR-3 | SP-4201 text mirrored at https://www.fplib.org/partners/mwade/details/merrymr3.htm | secondary (reproduces NASA SP-4201) | `The Redstone's engine shut down on schedule at 142 seconds` |
| Max Q | 84 (1:24) | MR-3 | Wikipedia, https://en.wikipedia.org/wiki/Mercury-Redstone_3 (cites Hammack 1961 / NASA results report) | secondary | `01:24 Max Q ... ~575 lbf/ft2` |

Disagreement: Wikipedia's table lists BECO 2:20 (140 s), tower jettison 2:22, capsule separation 2:24 (144 s), "planned" and with 4 s spacing, while
the NASA project report has nominal cutoff 142.5, tower 143.0, capsule separation 152.0. The Wikipedia numbers are about 8 s short on separation.
An MR-3 pilot-voice log (search summary, JSC transcript MR03_TEC) puts "Capsule separation is green" at 02:32.5 (152.5 s), which matches 152.0.
Use the NASA report values.

### starship (starship-demo, starship-mars-crew)

No primary table found (spacex.com launch pages render by script, content.spacex.com API paths 404). Secondary: Everyday Astronaut, *Starship/SuperHeavy
Integrated Flight Test #2*, https://everydayastronaut.com/starship-superheavy-flight-test-2/, "FLIGHT TEST TIMELINE | BEST CASE SCENARIO"
(planned, "All times approximate"; the list shows Liftoff at 00:00:02, so the clock origin is 2 s before liftoff or T-0 is ignition):

| event | clock s | flight | source | primary/secondary | quote |
| --- | --- | --- | --- | --- | --- |
| Liftoff | 2 | IFT-2 (plan) | Everyday Astronaut IFT-2 page | secondary | `00:00:02 Liftoff` |
| Max Q | 52 | IFT-2 (plan) | same | secondary | `00:00:52 Max Q` |
| Booster MECO | 159 | IFT-2 (plan) | same | secondary | `00:02:39 Booster Main Engine Cutoff` |
| Hot staging | 161 | IFT-2 (plan) | same | secondary | `00:02:41 Hot Staging` |
| Boostback start / stop | 173 / 227 | IFT-2 (plan) | same | secondary | `00:02:53 ... 00:03:47` |
| Ship engine cutoff (suborbital) | 513 | IFT-2 (plan) | same | secondary | `00:08:33 Starship Engine Cutoff` |

If the clock counts from liftoff (not from the 2 s offset) subtract 2 s; the page does not say. The "2:39 / 2:41" pair also appears in
a search summary as the IFT-2 actual. Falcon-style ship SECO / payload separation for an orbital Starship was not found.

### ariane-1 (Giotto, V14, 2 July 1985)

Unsourceable: 2 searches (4 internal queries); results give only launch time 11:23 UTC and stage burn times from Wikipedia (145 / 132 / 563 s). ESA
Giotto pages (sci.esa.int/web/giotto/-/36680, /13810) and fplib.org contain no event table (fetched, grepped). No Ariane 1 flight kit located.

### atlas-agena (Gemini target vehicles; Gemini 12 GATV is the only one with a table I reached)

Primary: *Gemini Program Mission Report Gemini XII*, https://www.ibiblio.org/apollo/Documents/Gemini12MissionReport.pdf, Table 4.2-III
"Sequence of events for GAATV launch phase" (Atlas SLV-3 + Agena D).

| event | T+ s | flight | source | primary/secondary | quote |
| --- | --- | --- | --- | --- | --- |
| BECO | 131.11 actual (planned 131.50) | GATV-5005 for Gemini 12 | Gemini XII mission report Table 4.2-III | primary | `Booster engine cutoff (BECO) 131.50 | 131.11 | -0.39` (OCR "13l.ll") |
| Booster engine section jettison | 134.66 (planned 134.50) | same | same | primary | `Booster engine separation (BECO + 3.0 sec) 134.50 | 134.66 | +0.16` (OCR) |
| Sustainer cutoff (SECO) | 280.12 (planned 280.73) | same | same | primary | `Sustainer engine cutoff (SECO) 280.73 | 280.12 | -0.61` |
| Vernier cutoff (VECO) | 298.06 | same | same | primary | `Vernier engine cutoff (VECO) 299.03 | 298.06 | -0.97` |
| TLV/GATV separation (retro fire) | 300.30 | same | same | primary | `TLV/GATV separation (retrorocket fire) 301.50 | 300.30 | -1.20` |
| Agena SPS ignition / PPS ignition / SPS cutoff | 353.66 / 372.51 / 373.65 | same | same | primary | rows `SPS ignition 353.60 353.66`, `PPS ignition 372.10 372.51`, `SPS thrust cutoff 373.60 373.65` |
| Nose shroud jettison squibs | 381.72 | same | same | primary | `Fire jettison nose shroud squibs 381.60 | 381.72` |
| Velocity meter cutoff (end of Agena first burn) | 555.85 | same | same | primary | `Velocity meter cutoff 553.86 | 555.85` |

L63 note: Agena/payload separation from the Atlas is 20 s after SECO and 2 s after VECO (derived: 300.30 - 280.12 = 20.2; 300.30 - 298.06 = 2.2).
The repo profile cites Mariner 5 (TM X-1826: BECO 128.6, jettison 131.6); this is a different Atlas-Agena flight.

### atlas-centaur (AC-19 / AC-20, Mariner 6 / 7, 1969; and the repo's AC-23)

Primary: NASA TM X-2278 *Atlas-Centaur AC-19 and AC-20 Performance for the 1969 Mariner Mars Missions*, NTRS 19710023020,
https://ntrs.nasa.gov/api/citations/19710023020/downloads/19710023020.pdf (curl, 6.3 MB, worked), "Flight events" text.

| event | T+ s | flight | source | primary/secondary | quote |
| --- | --- | --- | --- | --- | --- |
| BECO | 147.1 (4.9 s early; nominal about 152) | AC-20 (Mariner 7) | TM X-2278 | primary | `Atlas booster engine cutoff, on AC-20, occurred ... at T + 147.1 seconds ... 4.9 seconds earlier than expected` |
| Booster engine section jettison | 153.5 | AC-20 | same | primary | `About 3 seconds later at T + 153.5 seconds, the Atlas programmer issued the staging command` |
| Insulation panels jettison | 191.7 | AC-20 | same | primary | `Insulation panels were jettisoned ... at T + 191.7 seconds` |
| Nose fairing unlatch | 228.5 (thruster bottles +0.5) | AC-20 | same | primary | `Nose fairing unlatch was commanded at T + 228.5 seconds` |
| Sustainer cutoff (SECO) | 270.8 (AC-20); 255.0 (AC-19) | AC-20, AC-19 | same | primary | `... at T + 270.8 seconds on AC-20 and at T + 255.0 seconds on AC-19` |
| Atlas/Centaur staging (shaped charge) | 272.8 | AC-20 | same | primary | `programmer at T + 272.8 seconds. A shaped charge was fired to sever the interstage` |
| Centaur main engine start | 282.3 | AC-20 | same | primary | `A t T + 282.3 seconds, the ignition command was issued` |
| Centaur main engine cutoff | 725.5 | AC-20 | same | primary | `At T + 725.5 seconds the required injection velocity was attained and the guidance system issued the command to shut down` |
| Spacecraft separation | 820.6 | AC-20 | same | primary | `Spacecraft separation was commanded at T + 820.6 seconds, about 95 seconds after main engine cutoff` |

Derived: Centaur MECO to separation 95.1 s on AC-20. (AC-19 had a nominal SECO at 255.0, so its BECO was about 4.9 s later than AC-20's.)

### titan-ivb-centaur (Cassini, 15 Oct 1997)

Primary: NASA/JPL *Cassini Launch Press Kit, October 1997*, https://www.jpl.nasa.gov/news/press_kits/cassini.pdf, "Launch events" (p. 36) and the launch-events
figure ("* Actual time determined by Titan/Centaur guidance software"; times are nominal, pre-launch).

| event | T+ s | flight | source | primary/secondary | quote |
| --- | --- | --- | --- | --- | --- |
| Stage 1 ignition | 132 | Cassini (nominal) | Cassini press kit | primary | `The first stage of the liquid-fueled Titan ignites at 2 minutes, 12 seconds into flight` (2:12 = 132 s) |
| SRMU burnout / separation | 142 | same | same | primary | `solid rocket motors, which burn for 2 minutes, 22 seconds` ; fig `Solid Rocket Separation ... T= 0:02:22*` |
| Fairing jettison | 211 | same | same | primary | `3 minutes, 31 seconds into flight, the payload fairing ... is jettisoned` |
| Stage 2 ignition / stage 1 separation | 321 | same | same | primary | `Ignition of the Titan's second stage occurs at 5 minutes, 21 seconds` |
| Titan/Centaur (stage 2) separation | 553 | same | same | primary | `At approximately 9 minutes, 13 seconds into flight ... the Centaur upper stage and the Cassini spacecraft separate from the Titan` |
| Centaur MES-1 to MECO-1 | burn 131 s | same | same | primary | `The burn ends after 131 seconds at main engine cut-off #1` |
| Centaur second burn duration | about 420-480 s | same | same | primary | `burn for approximately 7 to 8 minutes` |
| Cassini separation | MECO-2 + 360 | same | same | primary | `Six minutes after the second engine cutoff, the Cassini spacecraft receives a command ... separating it from the Centaur. Final separation is completed by 6-1/2 minutes after the second Centaur engine cutoff.` |
| Coast between MECO-1 and MES-2 | 8 to 32 min (about 14 min on 6 Oct window opening) | same | same | primary | `The coast duration is about 14 minutes for an October 6 launch date at the opening of the daily window.` |

ESA gives Cassini separation at "T+42 m 40 s" (the profile cites this, sci.esa.int/web/cassini-huygens/2083-launch-information): 2,560 s. That
is consistent with MECO-2 + 360 s only if MECO-2 is at about 2,200 s; the press kit does not print an absolute MECO-2 time (launch-day coast
differed from the 6 Oct nominal). I did not derive one.

### titan-iiie-centaur (Voyager / Helios / Viking)

Voyager: no primary sequence found (tried: JPL press-kit URL guesses 404, one WebSearch, PDS Voyager mission papers (no ascent events), NTRS keyword
queries). The secondary Voyager 2 transcription in the earlier note remains the only Voyager source.

Primary replacements that exist: the Helios flights fly the same Titan IIIE/Centaur D-1T and give the whole two-burn escape sequence with spacecraft
separation. NASA NTRS flight data reports; I read the "Flight Trajectory and Performance Data" text.

| event | TC-2 Helios A T+ s | TC-5 Helios B T+ s | source | primary/secondary | quote (TC-2 / TC-5) |
| --- | --- | --- | --- | --- | --- |
| Stage I ignition (87FS1) | 111.6 | 114.14 | NTRS 19760006052 and 19760019166 | primary | `ignition of the Stage I engines (87FS1) occurred at 111.6 seconds` / `114.14 seconds` |
| SRM jettison | 124.6 | 126.2 | same | primary | `at 124.6 seconds into the flight, the solid rocket motors (SRM's) were jettisoned` / `126.2 seconds` |
| Stage I shutdown (staging sequence starts) | 258.3 | 265.64 | same | primary | `Stage I/Stage II staging sequence commenced at 258.3 seconds with Stage I shutdown` / `265.64` |
| Stage I/II separation | 259.6 | 265.68 | same | primary | `separation occurring at 259.6 seconds` / `265.68` |
| Centaur standard shroud jettison | 318.6 | 325.64 (OCR "325.6.4") | same | primary | `commanded jettison of the Centaur Standard Shroud at 318.6 seconds` ; `60 seconds after the Centaur flight computer senses Titan Stage I shutdown` |
| Stage II shutdown | 468.8 | 478.54 | same | primary | `Stage II shutdown occurring at 468.8 seconds` / `478.54 seconds` |
| Titan/Centaur separation | 468.8 + 3.9 s command after deceleration | 483.3 | same | primary | `Stage II separation 3.9 seconds after sensing the shutdown deceleration` / `Titan/Centaur separation occurred at T+483.3 seconds` |
| Centaur MES-1 | 483.2 | 493.74 | same | primary | `Centaur main engine start (MES-1) for first burn occurred at 483.2 seconds` / `493.74` |
| Centaur MECO-1 (parking orbit) | 584.0 | 595.08 | same | primary | `terminated ... at 584.0 seconds` / `595.08` |
| Coast | 21.93 min | 28.17 min | same | primary | |
| Centaur MES-2 | 1899.5 | 2285.42 | same | primary | `MES-2 at 1899.5 seconds` / `2285.42 seconds` |
| Centaur MECO-2 | 2172.9 | 2574.80 | same | primary | `MECO-2 at 2172.9 seconds` / `2574.80` |
| TE-M-364-4 spin-up / separation from Centaur | MECO-2 + 70 s spin-up, +2 s separation | same | same | primary | `Seventy seconds after MECO-2, the TE-M-364-4 and spacecraft were spun up. Separation occurred two seconds later.` |
| Spacecraft separation (after TE-M-364-4 burn) | 2401.46 | 2804.03 | same | primary | `spacecraft separation, which occurred at 2401.46 seconds` / `2804.03 seconds` |

Sources: *Titan/Centaur D-1T TC-2, Helios A flight data report*, NTRS 19760006052,
https://ntrs.nasa.gov/api/citations/19760006052/downloads/19760006052.pdf ; *Titan/Centaur D-1T TC-5 Helios B flight data report*, NTRS 19760019166,
https://ntrs.nasa.gov/api/citations/19760019166/downloads/19760019166.pdf . OCR is spaced text for TC-2 (read by pattern; numbers consistent with TC-5
structure). Both flights: Centaur MECO-1 to MES-2 coast is long (22 and 28 min); Helios spacecraft rides a solid kick motor, so the "payload
separation" is the Helios + TE-M-364-4 combination released 2 s after the spin-up, not a bare spacecraft.
The profile's cited TC-4 (Viking 1) data: SRM jettison 121.7, stage 1 cutoff 259.4, shroud 270.3, stage 2 cutoff 467.7, MES-1 484.3 (TM X-73475) is
a primary Titan IIIE timeline already in the repo.

### athena-ii (Lunar Prospector, 7 Jan 1998 UTC)

Primary: *Lunar Prospector Mission Handbook*, LMMS/P458481, 10 April 1998, Table 6.3-3 "Athena II-Lunar Prospector Nominal Event Sequence"
(source note: Athena II LP Launch Countdown Manual 1A54940 rev F, 27 Dec 1997),
https://pds.nasa.gov/data/lp-l-6-position-v1.0/lp_0014/DOCUMENT/SCHANDBK.PDF (curl OK).

| event | T+ s | flight | source | primary/secondary | quote |
| --- | --- | --- | --- | --- | --- |
| Stage 1 ignition | 0.0 | LP (nominal) | LP Mission Handbook Table 6.3-3 | primary | `Stage 1 Ignition 0.0` |
| Max dynamic pressure | 75.0 | same | same | primary | `Max. Dynamic Pressure 75.0` |
| Stage 1 separation, stage 2 ignition | 89.0 | same | same | primary | `Stage 1 Separation, Stage 2 Ignition 89.0` |
| Stage 2 burnout | 180.8 | same | same | primary | `Stage 2 Burnout 180.8` |
| Payload fairing separation | 232.0 | same | same | primary | `PLF Separation 232.0` |
| Stage 2 separation, ESBM (stage 3) ignition | 238.0 | same | same | primary | `Stage 2 Separation, ESBM Ignition 238.0` |
| ESBM burnout, OAM ignition | 392.0 | same | same | primary | `ESBM Burnout, OAM Ignition 392.0` |
| OAM shutdown | 844.0 | same | same | primary | `OAM Shutdown 844.0` |
| OAM / TLI stage spin-up | 845.0 | same | same | primary | `OAM, TLI Stage Spin-up 845.0` |
| LP (with TLI stage) separation from OAM | 3315.0 | same | same | primary | `LP Separation from OAM (SEP) 3315.0` |
| TLI Star 37FM ignition | SEP + 20.0 = 3335 | same | same | primary | `TLI Star 37FM Motor Ignition SEP + 20.0` |
| LP / TLI separation | SEP + 91.6 = 3406.6 | same | same | primary | `LP/TLI Separation (Primary) SEP + 91.60` |

Derived: OAM shutdown to LP separation 2,471 s (a long coast; the earlier note's "Orbus burnout 392 s" in the profile is the ESBM, not the Orbus 21D).
The profile's "Orbus burnout 392 s" label is slightly off against this table ("ESBM Burnout, OAM Ignition"); OAM shutdown is at 844 s.

### Payload separation after upper-stage cutoff (L63)

| vehicle / flight | cutoff event | cutoff T+ s | payload separation T+ s | delay s | source | primary/secondary |
| --- | --- | --- | --- | --- | --- | --- |
| Falcon 9 / Inspiration4 (Crew Dragon) | SECO-1 | 531 (8:51) | 729 (12:09) | 198 | Everyday Astronaut https://everydayastronaut.com/inspiration4-falcon-9-block-5/ : `00:08:51 2nd stage engine cutoff (SECO-1)` ... `00:12:09 Dragon separates from 2nd stage` | secondary (planned SpaceX timeline, "All Times Approximate") |
| Falcon 9 / Polaris Dawn | SECO-1 | 539 (8:59) | 736 (12:16) | 197 | spacelaunchschedule.com https://www.spacelaunchschedule.com/launch/falcon-9-block-5-polaris-dawn/ : `T+ 00 : 08 : 59 SECO-1`, `T+ 00 : 12 : 16 Dragon Separation` | secondary |
| Falcon 9 / Polaris Dawn MECO, stage sep | MECO | 158 (2:38) | n/a | n/a | same page: `T+ 00 : 02 : 38 MECO`, `T+ 00 : 02 : 42 Stage 2 Separation`, `T+ 00 : 02 : 51 SES-1`, Max-Q `T+ 00 : 00 : 58` | secondary |
| Falcon 9 / Inspiration4 MECO, stage sep | MECO | 157 (2:37) | n/a | n/a | EA page: `00:02:37 MECO`, `00:02:40 1st and 2nd stages separate`, `00:02:41 2nd stage engine starts`, `00:01:02 Max Q` | secondary |
| Falcon 9 OTV-5 (X-37B) | | | | | not disclosed | unsourceable (below) |
| Falcon Heavy OTV-7 (X-37B) | | | | | not disclosed; one unattributed search summary said "deployment at T+01:52:14" (6,734 s) and an SES-2 to SECO-2 burn of 133 s, not verifiable | unsourceable (single unattributed search summary, not verified) |
| Ariane 5 G / SMART-1 (VA162) | storable-stage shutdown | 1,616 (26:56) | Insat 3E 1,741 (29:01); e-Bird 2,057 (34:17); SMART-1 2,500 (41:40) | Insat 125; e-Bird 441; SMART-1 884 | Spaceflight Now, *Ariane Flight 162 timeline*, https://spaceflightnow.com/ariane/v162/030924ascent.html (fetched with WebFetch; curl 403): `H0+26:56 Storable Propellant Stage Shutdown`, `H0+29:01 Insat 3E Separation`, `H0+34:17 e-Bird Separation`, `H0+41:40 SMART 1 Separation`; also `H0+02:21 Booster Separation`, `H0+03:10 Jettison Payload Fairing`, `H0+09:51 Main Cryogenic Stage Extinction`, `H0+10:04 Storable Propellant Stage Ignition` | secondary (Arianespace data republished) |
| Ariane 5 / SMART-1 (ESA) | - | - | "42 minutes after launch" (about 2,520); a search summary gave 41:31 (2,491) but no fetched page confirms it | | ESA https://www.esa.int/Newsroom/Press_Releases/SMART-1_leaves_Earth_on_a_long_journey_to_the_Moon : `42 minutes after launch, SMART-1 as last of the three satellites had been successfully released` | primary, rounded |
| Saturn IB / Apollo 7 (AS-205) | S-IVB cutoff | 616.76 (10:16.76) | CSM/S-IVB separation 10,502.4 (2:55:02.40) | 9,885.6 | NASA *Apollo 7 Mission Report summary* (SP-4029 Apollo Program Summary section 07a) https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_07a_Summary.htm : `Cutoff occurred at 00:10:16.76`, `By the time the CSM/S-IVB separated at 002:55:02.40` | primary |
| Titan II GLV | SECO | 333.75 (GT-4) | 365.55 | 31.8 (GT-4, GT-7); 30.9 (GT-10); 23.6 (GT-5); about 23 (GT-12); planned 30 | Gemini mission reports above | primary |
| Atlas LV-3B / MA-6 | SECO | 301.4 | 303.6 | 2.2 | NTRS 19930074071 Table 6-II | primary |
| Titan IVB-Centaur / Cassini | MECO-2 | n/a absolute | MECO-2 + 360 s | 360 | Cassini press kit | primary |
| Titan IIIE-Centaur / Helios A, B | MECO-2 | 2172.9 / 2574.80 | 2401.46 / 2804.03 (after solid kick motor burn) | 228.6 / 229.2 | NTRS 19760006052 / 19760019166 | primary |
| Athena II / LP | OAM shutdown | 844 | 3,315 | 2,471 | LP Handbook Table 6.3-3 | primary |
| Atlas-Centaur / AC-20 | Centaur MECO | 725.5 | 820.6 | 95.1 | NASA TM X-2278 | primary |
| Atlas-Agena (Gemini 12 GATV) | Atlas SECO | 280.12 | 300.30 (TLV/GATV separation) | 20.2 (2.2 after VECO) | Gemini XII report Table 4.2-III | primary |

### saturn-ib (Apollo 7, AS-205): requested add-on (mass, thrust, burn, timeline)

AS-205 flight evaluation report (MSFC MPR-SAT-FE-68-4, NTRS 19900067467 / nasa.gov afj ap07fj pdf) could not be downloaded:
`ntrs.nasa.gov/api/citations/19900067467/downloads/...pdf` returned 404 JSON; the nasa.gov afj/alsj URLs from the search results returned 404 to curl
and WebFetch (tried 4 URL spellings). Used instead:
(a) NASA/MSFC R-AERO-FT, *The AS-205/CSM-101 Launch Vehicle Operational Trajectory, Revision 1* (pre-flight, nominal), NTRS 19700014017,
https://ntrs.nasa.gov/api/citations/19700014017/downloads/19700014017.pdf, Tables I, 11, 12; (b) NASA *Apollo 7 Mission Report* summary (SP-4029
section 07a) for actual times. (a) is predicted, (b) actual.

| item | value | source | primary/secondary | quote |
| --- | --- | --- | --- | --- |
| Center engine cutoff (S-IB) actual | 140.65 s (2:20.65) | SP-4029 07a | primary | `center engine cutoff at 000:02:20.65` |
| Outboard engine cutoff actual | 144.32 s (center + 3.67 s) | SP-4029 07a | primary | `The outboard engine shut down 3.67 seconds later` |
| S-IB / S-IVB separation actual | 145.59 s | SP-4029 07a | primary | `separated from the upper stage at 000:02:25.59` |
| S-IVB ignition actual | 146.97 s | SP-4029 07a | primary | `S-IVB engine ignition at 000:02:26.97` |
| S-IVB cutoff actual | 616.76 s (10:16.76) | SP-4029 07a | primary | `Cutoff occurred at 00:10:16.76` |
| S-IVB burn time actual | 469.79 s | SP-4029 07a | primary | `The S-IVB burn time of 469.79 seconds was within one second of prediction` |
| Orbital insertion actual | cutoff + 10 s = 626.76 | SP-4029 07a | primary | `At 000:10:26.76, the spacecraft entered Earth orbit, defined as S-IVB cutoff plus 10 seconds` |
| Insertion conditions actual | 152.34 x 123.03 n mi, 31.608 deg, 25,532.2 ft/s | SP-4029 07a | primary | `apogee and perigee 152.34 by 123.03 n mi, inclination 31.608` |
| CSM/S-IVB separation actual | 10,502.4 s (2:55:02.40) | SP-4029 07a | primary | `By the time the CSM/S-IVB separated at 002:55:02.40` |
| Nominal (pre-flight) sequence | max Q 75.0; IECO 140.11; OECO 143.11; separation 144.49; J-2 start command 145.81; 90% J-2 thrust 149.41; LES jettison 163.11; IGM 168.11; mixture-ratio shift command 454.41; guidance cutoff signal 614.63; orbital insertion 624.63; LOX dump start 5,666.83; manual attitude control 8,995 to 9,175; nominal CSM separation 10,495.00 | Trajectory doc Table I | primary (predicted) | `0:7:34.4 454.41 Command mixture ratio shift`, `0:10:14.6 614.63 Guidance cutoff signal (GCS)`, `2:54:55.0 10495.00 Nominal CSM physical separation` |
| J-2 thrust, high level (MR 5.5) | 226,019 lbf vacuum average, flow 533.97 lb/s, Isp 423.28 s, flight interval 149.4 to 454.8 s | Trajectory doc Table 11 | primary (predicted) | `High Thrust Level Flight Time Interval: 149.4 - 454.8 seconds ... Vacuum Thrust (lbs) 226019. ... Flowrate 533.97 ... Specific Impulse 423.28` |
| J-2 thrust, low level (MR 4.5) | 176,087 lbf vacuum average, flow 407.92 lb/s, Isp 431.67 s, interval 454.8 to 614.8 s | Trajectory doc Table 11 | primary (predicted) | `Low Thrust Level Flight Time Interval: 454.8 - 614.8 seconds ... 176087. ... 407.92 ... 431.67` |
| Mixture ratio schedule | 5.5:1 for about 300 s (then shift to 4.5:1 for the rest); open-loop PU | Trajectory doc text | primary | `The S-IVB stage has an open loop propellant utilization system which is set for a mixture ratio of 5.5 to 1 ... The mixture ratio then shifts to 4.5 to 1 for the remainder of the S-IVB stage.` The text says "approximately 300 seconds" but Table 11 and Table I put the shift at 454.4 to 454.8 s of flight, i.e. about 305 s after J-2 start (149.4): consistent. |
| Mass at S-IVB cutoff | 67,757 lb (text says `The nominal weight at Guidance Cutoff Signal is predicted to be 67757 pounds`) | Trajectory doc | primary (predicted) | |
| Mass breakdown above the S-IVB | spacecraft 36,600 lb (CSM 32,758 incl 9,655 SPS prop + SLA 3,842), IU 4,280 lb, S-IVB stage inert 25,285 lb, usable reserve propellant 2,452 lb, injection weight 67,617 lb, J-2 thrust-decay propellant 140 lb, cutoff weight 67,757 lb | Trajectory doc Table 12 | primary (predicted) | `Spacecraft* 36,600`, `Instrument Unit 4,280`, `S-IVB Stage Inert 25,285`, `Useable Reserve Propellant 2452`, `Injection Weight 67,617`, `S-IVB Cutoff Weight 67,757` |
| S-IVB propellant consumed (J-2 main) | 228,164 lb | Trajectory doc Table 12 | primary (predicted) | `S-IVB Propellant Consumed 228,164` ; also `S-IVB 90% Thrust Weight 305,127`, `S-IVB Stage Weight at Separation 305,803` (OCR digits) |
| S-IVB propellant at 90% thrust (derived) | about 238,960 lb (108.4 t) = 305,127 - 40,880 (SC + IU) - 25,285 (inert) | derived | derived | 305,127 - 36,600 - 4,280 - 25,285 = 238,962 |

Notes and gaps: the numbers marked "OCR" in Table 12 (305,127; 305,803; the 3.05E5 weights) are scanned digits; 36,600 = 32,758 + 3,842 and 67,617 = 36,600 + 4,280 + 25,285 + 2,452 check arithmetically.
Actual S-IVB propellant loaded for AS-205, the flown mixture-ratio shift time and flown thrust are in the flight evaluation report I could not download: NOT obtained.
The model's S-IVB burn of about 397 s is 73 s short of the real 469.79 s; the high-thrust leg alone is 305 s (149.4 to 454.8) and the low-thrust leg 160 s (454.8 to 614.8), total 465 s of burn from 90% thrust to cutoff plus about 5 s of start.

### falcon-9 primary replacements beyond CRS-22 (F5 / S10)

Not searched (low priority, budget kept for the L63 vehicles). The earlier note already holds CRS-9 and CRS-22. Observation: the Inspiration4 and Polaris Dawn
numbers above are SpaceX-sourced secondary values; no NASA press kit for a heavier expendable Falcon 9 mission was looked at.

### Tried / not found

- Gemini 7 press kit PDF: `jsc.nasa.gov/history/mission_trans/gemini7_press_kit.pdf` and historycollection.jsc.nasa.gov variants return an HTML page to curl; not obtained. Used the mission reports on ibiblio/NTRS instead.
- Gemini 3, 6A, 8 mission reports: ibiblio `Documents/Gemini{3,4,6,8,6A}MissionReport.pdf` 404 (only 7 and 12 exist); NTRS keyword search found Gemini IV (19670095754), GT-1 (19670095753) but not 3, 6A, 8; adjacent NTRS ids 19670095750 to 63 returned nothing. Not obtained.
- NTRS 19660020347 (Gemini launch vehicle development paper): downloaded, holds only a staging overview, no event times.
- MA-6 BECO etc. from NTRS: obtained. MR-3 postlaunch report (Project Mercury Working Paper 192) via `jsc.nasa.gov/history/mission_trans/MR03_TEC.PDF`: HTML wrapper, not a PDF. Used the Mercury-Redstone project report instead.
- Starship: spacex.com launch page (3 KB, script), content.spacex.com API (4 URL guesses 404). One search. Only the Everyday Astronaut plan table.
- Ariane 1 Giotto: 2 searches, ESA sci pages and fplib.org: no event table.
- Titan II G Clementine: 1 search: no event table.
- Titan IIIE Voyager primary: 1 search, 6 JPL URL guesses 404, PDS mission papers, NTRS keyword queries: not found (Helios reports found instead).
- OTV-5 / OTV-7: one search; payload deployment not announced (SpaceX cut the OTV-7 webcast before deployment); spacelaunchschedule.com pages for OTV-5 and OTV-7 have no timeline text.
- AS-205 flight evaluation report (MPR-SAT-FE-68-4): 404 on four URLs. SA-208 (Skylab 4) evaluation downloaded (NTRS 19750002068); not the requested flight, so not tabulated.
- Falcon 9 beyond CRS-22: not searched.

Search counts: WebSearch 16 calls (Gemini 7 kit; Gemini mission report; MA-6; MR-3 results; MR-3 sequence; Starship; AS-205; Inspiration4; Polaris Dawn; OTV-7; SMART-1 x2; Cassini; Voyager; Giotto; Clementine). WebFetch 2 (Spaceflight Now V162; nasa.gov AS-205 pdf, 404). Several of the WebSearch calls returned internal multi-query result sets (about 40 queries counting every internal query); the number of tool calls is 16.

## Launch timelines, east (Russia / China / Japan) - research output

All times are seconds after liftoff (T+). "derived" = difference computed by me from two cited numbers.
Scratch downloads are in the session scratchpad (pdf/txt copies named in each section).

### Headline

- H3-24L (MMX) has a primary JAXA table with SRB-3, fairing, MECO, stage sep, SECO1/2 and MMX separation.
- M-V-5 (Hayabusa) has a primary ISAS full time-sequence table (stage sep, nose-fairing open, stage burnouts, spacecraft separation).
- Long March 3A and 3B have a primary CALT user's manual flight sequence (GTO profile, not the Chang'e profile).
- Soyuz-FG (Baikonur) has a secondary full table: core separation 287.30, III cutoff 524.96, spacecraft separation 528.26.
- Sputnik 1 (8K71PS) has a secondary table from russianspaceweb with cited refs.
- Proton-K: no primary for K found; primary for Proton-M in ILS guide; K-specific numbers secondary.
- Long March 2F, Long March 5, Vostok-K cutoff, Voskhod, Soyuz 11A511, Molniya-M: not found at primary level; see sections.

---

### 1. proton-k (Zvezda 2000 = secondary; ILS guide = Proton-M, primary for the sibling)

#### 1a. Proton-K, Zvezda launch (secondary, already in docs/wip/2026-11-17 section 7)
russianspaceweb, *Zvezda launch*, https://russianspaceweb.com/iss-sm-launch.html (Proton-K/Block DM-2, 12 Jul 2000).

| event | T+ s | flight | source | primary/secondary | quote |
|---|---|---|---|---|---|
| Max Q | 65 | Zvezda | russianspaceweb iss-sm-launch | secondary | "65 seconds into the flight" |
| Stage 2 ignition | 121.9 | Zvezda | same | secondary | "(T+121.9 seconds), the four engines of the second stage were ignited" |
| Stage 1 separation | 126.1 | Zvezda | same | secondary | "separated 126.1 seconds after launch" |
| Fairing | about 183 (derived 126.1+57) | Zvezda | same | secondary | "Around 57 seconds later, the payload fairing ... split" |
| Stage 3 vernier ignition | 331.1 | Zvezda | same | secondary | "T+331.1 seconds" |
| Stage 2 separation | 334.5 | Zvezda | same | secondary | "separated at T+334.5 seconds" |
| Stage 3 main cutoff | 577 | Zvezda | same | secondary | "Nine minutes and 37 seconds" |
| Zvezda separation | 587 | Zvezda | same | secondary | "9 minutes and 47 seconds after launch" |

(From the earlier doc; I did not re-fetch it. Stage 3 main cutoff to separation = 10 s derived.)

#### 1b. Proton-M / Breeze M standard ascent (PRIMARY, but the sibling vehicle, not K)
*Proton Launch System Mission Planner's Guide, LKEB-9812-1990, Revision 7, July 2009*, ILS,
https://www.ilslaunch.com/wp-content/uploads/pdf/Proton-Mission-Planners-Guide-Revision-7-LKEB-9812-1990.pdf
Table 2.3.1-1 "Standard LV Ascent Event Times" (pdftotext of the downloaded PDF). Primary, Proton-M (same RD-276 first stage, RD-0210 second stage, RD-0213 third stage family).

| event | T+ s | flight | source | primary/secondary | quote |
|---|---|---|---|---|---|
| Maximum dynamic pressure | 65.5 | Proton-M std | ILS PMPG Rev 7 Table 2.3.1-1 | primary (Proton-M) | "Maximum dynamic pressure 65.5" |
| Stage 2 ignition | 119.0 | same | same | primary | "Stage 2 ignition 119.0" |
| Stage 1/2 separation | 123.4 | same | same | primary | "Stage 1 / 2 separation 123.4" |
| Stage 3 vernier ignition | 332.1 | same | same | primary | "Stage 3 vernier engine ignition 332.1" |
| Stage 2 shutdown | 334.5 | same | same | primary | "Stage 2 engine shutdown 334.5" |
| Stage 2/3 separation | 335.2 | same | same | primary | "Stage 2 / 3 separation 335.2" |
| Stage 3 main ignition | 337.6 | same | same | primary | "Stage 3 main engine ignition 337.6" |
| PLF jettison | 348.2 | same | same | primary | "PLF jettison 348.2" |
| Stage 3 main shutdown | 576.4 | same | same | primary | "Stage 3 main engine shutdown 576.4" |
| Stage 3 vernier shutdown | 588.3 | same | same | primary | "Stage 3 vernier engine shutdown 588.3" |
| Stage 3 / upper-unit separation | 588.4 | same | same | primary | "Stage 3 / OU separation 588.4" |

Compare Proton-K (Zvezda, secondary): stage 1 sep 126.1 vs 123.4 (M); stage 2 sep 334.5 vs 335.2; main cutoff 577 vs 576.4. Stage-3 sep after vernier shutdown: 0.1 s (M, primary). Zvezda separation is 10 s after main cutoff (secondary); in the M guide the 588.4 s event is the Breeze M / upper-unit separation (not an SC), 12 s after main shutdown and 0.1 s after vernier shutdown.
The same PDF's revision history (lines 121, 162) says Rev with "Addition of Proton K/Block DM performance" existed and K/DM data was later deleted; the old K/DM revisions were not found online (the ilslaunch PMPG Section PDFs I downloaded are Rev 7 = Proton-M only).

### 2. vostok-k (Vostok 1)

| event | T+ s | flight | source | primary/secondary | quote |
|---|---|---|---|---|---|
| Stage I (boosters) separation | 119 | Vostok 1 | russianspaceweb vostok1_launch.html, https://russianspaceweb.com/vostok1_launch.html | secondary | "Stage I separation (T+119 seconds (51))" |
| Fairing separation | 154 (150 in another ref) | Vostok 1 | same | secondary | "T+154 seconds (51) T+150 seconds (465)" |
| Stage II separation | 299 | Vostok 1 | same | secondary | "Stage II separation (T+299 seconds (51))" |
| Spacecraft separation from stage III | 688 (09:18:28 minus 09:06:59.7, derived) or 667 (09:18:07, derived) | Vostok 1 | same | secondary | "Spacecraft separation from Stage III 09:18 / 09:18:28* (463) ... *or 09:18:07 (464)" |
| Third-stage engine cutoff | NOT STATED as a number | Vostok 1 | same | secondary | "another bang marked for Gagarin the shutdown of the third stage. Some 10 seconds later, he felt the slight jolt of separation from the third stage" => cutoff about 10 s before separation (narrative, rounded; derived 678 or 657) |

Other cutoff-related primary-ish evidence: Novaya Gazeta 2021 (https://novayagazeta.ru/amp/articles/2021/04/11/podlinnaia-istoriia-poleta-gagarina, secondary, citing the post-flight analysis): "Двигатель третьей ступени также проработал на 2,4 секунды дольше расчетного времени" (third-stage engine ran 2.4 s longer than planned; no absolute time). It also says core-stage radio-control antenna power supply failed at the 156th second and the central block engine cut off 0.46 s late.
Verdict for L63: separation minus cutoff is "about 10 s" on one secondary narrative; no per-second primary found. Not usable as a precise number.

### 3. voskhod-11a57 (Voskhod 1 / 2)

| event | T+ s | flight | source | primary/secondary | quote |
|---|---|---|---|---|---|
| Orbit insertion / release by third stage | 523 | Voskhod 1 | russianspaceweb, "The USSR launches world's first space crew", https://www.russianspaceweb.com/voskhod-flight.html | secondary | "Following the exhilarating 523-second climb uphill, the third stage of the rocket flawlessly released the Voskhod into orbit." (ambiguous: cutoff or separation) |

Nothing else found: no stage-separation, fairing or cutoff times for 11A57. russianspaceweb voskhod_lv.html has no times. Voskhod 2 not found. Two Russian/English searches. UNSOURCEABLE beyond the single 523 s figure.

### 4. soyuz (11A511, Soyuz 1 / Soyuz 11, 1967-71) and Soyuz-FG (Baikonur) addition

#### 4a. 11A511: not found
Two searches (Russian "Союз 11А511 выведение ... секунда полёта"; English via the Soyuz-FG query) returned only mission-overview pages (weebau, keeptrack, spacelaunchnow, astronautix). No event table. UNSOURCEABLE for 11A511 as flown in 1967-71.

#### 4b. Soyuz-FG, crewed (the requested addition), secondary
russianspaceweb, *Soyuz launch*, https://russianspaceweb.com/soyuz_launch.html, table "Critical milestones in the Soyuz launch (as of 2014)". Secondary (downloaded and read, times in the page table).

| event | T+ s | flight | source | primary/secondary | quote |
|---|---|---|---|---|---|
| Launch escape rocket (SAS) jettison | 114.16 | Soyuz-FG crewed (2014) | russianspaceweb soyuz_launch | secondary | "Emergency escape rocket, SAS, jettison 114.16 seconds" |
| Stage I (boosters) separation | 117.80 | same | same | secondary | "Stage I separation 117.80 seconds" |
| Payload fairing separation | 157.48 | same | same | secondary | "Payload fairing separation 157.48 seconds" |
| Stage II engine cutoff command (GK-2) | 285.05 | same | same | secondary | "Stage II engine cutoff command, GK-2 285.05 seconds" |
| Stage II separation (II-III stage separation) | 287.30 | same | same | secondary | "Stage II separation 287.30 seconds" |
| Stage III tail section separation | 297.05 | same | same | secondary | "Separation of Stage III tail section 297.05 seconds" |
| Stage III main engine cutoff | 524.96 | same | same | secondary | "Stage III main engine cutoff 524.96 seconds" |
| Spacecraft separation | 528.26 | same | same | secondary | "Stage III - spacecraft separation 528.26 seconds" |

Derived: spacecraft separation = third-stage cutoff + 3.30 s (L63 for Soyuz). Core separation 287.30 against the model's 313.8 s is 26.5 s earlier. Page text also: "four boosters ... separate ... (T+118-119 seconds)", fairing "two minutes, 40 seconds", "second stage separates slightly less than five minutes after liftoff".
A search summary attributed T+4:47.30 core separation, III cutoff T+8:44.96, separation T+8:48.26 to Soyuz MS-08 (spaceflight101), but that page returned 404 and I could not verify it; it matches the russianspaceweb values to 0.0 s (287.30, 524.96, 528.26), so it is the same set, not an independent confirmation. NOT counted as a second source.

#### 4c. Soyuz-Fregat from Baikonur (Mars Express 2003), secondary
Spaceflight Now Mars Express status page (https://www.spaceflightnow.com/mars/marsexpress/status2.html and the live-log text returned by search): "T+1:58 strap-on separation, T+4:14 fairing separation, T+4:47 Blok A separation, T+4:57 KhO separation" (search-result summary; the WebFetch of the page returned only "three stages of the Soyuz rocket will fire during the first 8 minutes, 49 seconds", so the T+ list is NOT verified in the page; treat as unverified). Mars Express separated "92 minutes into the flight" (spaceflightnow 030602launch.html, verified by fetch). ESA sci.esa.int launch-phase pages give no event times. Core (Blok A) separation 287 s would be consistent with 4b (T+4:47 = 287 s) but is unverified.
Primary for Soyuz CSG ST-B: see docs/wip/2026-11-17 section 6 (II-III separation 287.6, III cutoff 558.6, separation 561.9, which is a different third stage/profile).

### 5. sputnik-8k71ps (Sputnik 1), secondary with cited references

russianspaceweb, *Sputnik mission*, https://russianspaceweb.com/sputnik_mission.html (downloaded; table "T+ ..." and prose). Secondary (cites refs 51, 84).

| event | T+ s | flight | source | primary/secondary | quote |
|---|---|---|---|---|---|
| Stage I boosters separate from Stage II | 116.38 | Sputnik 1, 4 Oct 1957 | russianspaceweb sputnik_mission | secondary | "The separation between first and second stages took place after 116.38 seconds in flight." table row "T+116.38 seconds Four Stage I boosters separate from Stage II" |
| VOD command to shut down first-stage engines | 116.71 (derived 116.38+0.33) | same | same | secondary | "Just 0.33 seconds later, a command to shut down (first stage) main engines, known as VOD, was issued" |
| Stage II engine cutoff, actual | 295.4 | same | same | secondary | "at 295.4 seconds after the liftoff (51), the engine was shut down by the AKT ... sensor" |
| Stage II engine cutoff, nominal | 296.4 | same | same | secondary | "just one second before a nominal command ... at T+296.4 seconds" |
| Satellite separation | 314.5 | same | same | secondary | "The PS-1 satellite separated 314.5 seconds after the launch, or 19.9 seconds after the engine shutdown. (A built-in nominal delay for the separation was 18-20 seconds)." |
| Reflector deployment signal | 325.44 | same | same | secondary | "sent at 325.44 seconds" |

L63: Sputnik 1 separation delay = 19.9 s after actual cutoff (stated in source), nominal 18 to 20 s. No fairing (the 8K71PS had a nose cone jettisoned with the satellite; not itemised in the table).

### 6. molniya-m: UNSOURCEABLE

Two English searches ("Molniya-M 8K78M launch sequence ..."); fetched russianspaceweb molniya_lv.html. Only failure narratives: one failure "flight was nominal for 340 seconds"; another: scheduled Block A staging at T+290 s (search summary; the page lines 203-207 of molniya_lv.html talk about a 2004 Molniya-M failure at the second/third stage separation after a nominal 340 s). No nominal event table found. UNSOURCEABLE.

### 7. long-march-3a and long-march-3b: PRIMARY (CALT user's manuals, typical GTO profile)

#### 7a. LM-3A
*LM-3A User's Manual, Chapter 3*, CALT / CGWIC, Issue 1999, https://www.globalsecurity.org/space/library/report/1999/lm3achapter3.pdf , Table 3-1 "Flight Sequence" (pdftotext). Primary (a GTO mission profile, not tied to a named flight).

| event | T+ s | quote |
|---|---|---|
| Pitch over | 12.000 | "Pitch Over 12.000" |
| Stage-1 shutdown | 146.428 | "Stage-1 Shutdown 146.428" |
| Stage-1/Stage-2 separation | 147.928 | "Stage-1/Stage-2 Separation 147.928" |
| Fairing jettison | 236.928 | "Fairing Jettisoning 236.928" |
| Stage-2 main engine shutdown | 258.278 | "Stage-2 Main Engine Shutdown 258.278" |
| Stage-2 vernier shutdown | 263.278 | "Stage-2 Vernier Engine Shutdown 263.278" |
| Stage-2/3 separation, stage-3 first start | 264.278 | same row |
| Stage-3 first shutdown | 617.299 | "Stage-3 First Shutdown 617.299" |
| Stage-3 second start | 1252.513 | "Coast Phase Ending, and Stage-3 Second Start 1252.513" |
| Stage-3 second shutdown | 1374.440 | "Stage-3 Second Shutdown, Velocity Adjustment Beginning 1374.440" |
| SC/LV separation | 1474.440 | "SC/LV Separation 1474.440" |

Derived: SC separation = second shutdown + 100.0 s (velocity adjustment ends 1394.440).

#### 7b. LM-3B
*LM-3B User's Manual, Chapter 3*, Issue 1999, https://www.globalsecurity.org/space/library/report/1999/lm3bchapter3.pdf , Table 3-1. Primary (typical GTO profile; NOT the Chang'e flight profile).

| event | T+ s | quote |
|---|---|---|
| Pitch over | 10.000 | "Pitch Over 10.000" |
| Boosters shutdown | 127.211 | "Boosters Shutdown 127.211" |
| Boosters separation | 128.711 | "Boosters Separation 128.711" |
| Stage-1 shutdown | 144.680 | "Stage-1 Shutdown 144.680" |
| Stage-1/2 separation | 146.180 | "Stage-1/Stage-2 Separation 146.180" |
| Fairing jettison | 215.180 | "Fairing Jettisoning 215.180" |
| Stage-2 main engine shutdown | 325.450 | "Stage-2 Main Engine Shutdown 325.450" |
| Stage-2 vernier shutdown | 330.450 | row |
| Stage-2/3 separation, stage-3 first start | 331.450 | row |
| Stage-3 first shutdown | 615.677 | "Stage-3 First Shutdown 615.677" |
| Stage-3 second start | 1258.424 | row |
| Stage-3 second shutdown | 1437.673 | row |
| SC/LV separation | 1537.673 | "SC/LV Separation 1537.673" |

LM-3C table (same chapter series, lm3cchapter3.pdf) has boosters separation 128.991 (not read further).

#### 7c. Chang'e-3 flight (LM-3B), what exists
Chang'e-3 liftoff 17:30 UTC 1 Dec 2013; "The robotic spacecraft separated from the Long March third stage at 1749 GMT" (Spaceflight Now, https://www.spaceflightnow.com/china/change3/131201launch/, secondary) => about 19 min, matching Xinhua/CCTV "about 19 minutes" and a search-summary "18 min 58 s" (spaceflight101, 404 on re-fetch, unverified) = 1138 s. That is 400 s EARLIER than the manual's GTO profile (1537.7), so the manual is not the Chang'e timeline for the final events; a one-burn TLI profile. No per-event Chang'e-3/4 times found (Chinese search 2x, fetches of gov.cn, chinanews, cnyes pages: nothing).
Note: the manual's "Boosters 127.2 s burn" also appears in the spaceflight101 summary ("127-second burn"), consistent.

### 8. long-march-2f (Shenzhou): no primary per-event table

| event | T+ s | flight | source | primary/secondary | quote |
|---|---|---|---|---|---|
| Escape tower jettison | 155 (2:35) | Shenzhou 11 (Oct 2016) | Spaceflight Now, https://spaceflightnow.com/2016/10/16/key-events-during-shenzhou-11s-ascent-to-orbit/ (via WebFetch) | secondary | "Escape tower jettison T+0:02:35" |
| Booster separation | 155 | Shenzhou 11 | same | secondary | "Booster separation T+0:02:35" |
| First stage separation | 160 | Shenzhou 11 | same | secondary | "First stage separation T+0:02:40" |
| Fairing separation | 210 | Shenzhou 11 | same | secondary | "Fairing separation T+0:03:30" |
| Shenzhou separation | 525 | Shenzhou 11 | same | secondary | "Shenzhou 11 separation T+0:08:45" |
| Escape tower jettison | 120 | Shenzhou 9 (2012) | https://spaceflightnow.com/china/shenzhou9/launchtimeline.html (WebFetch) | secondary | "T+02:00 Jettison Escape Tower" |
| Booster jettison | 155 | Shenzhou 9 | same | secondary | "T+02:35 Jettison Strap-on Boosters" |
| First stage separation | 159 | Shenzhou 9 | same | secondary | "T+02:39 First Stage Separation" |
| Fairing separation | 210 | Shenzhou 9 | same | secondary | "T+03:30 Fairing Separation" |
| Shenzhou separation | 585 | Shenzhou 9 | same | secondary | "T+09:45 Shenzhou 9 Deployment" |

Disagreements: (a) the two Spaceflight Now pages disagree with each other on tower jettison (155 vs 120) and on separation (525 vs 585); (b) CMSE-announced separation times are 573 (Shenzhou-12) and 582 (Shenzhou-13) (docs/wip/2026-11-17 section 15), so the 525 s Shenzhou-11 figure does not match CMSE announcements for later flights (the timeline appears to be a pre-flight, rounded template, not measured; I cannot verify Shenzhou-11's real figure). No second-stage cutoff time on either page. Chinese per-event search: 4 searches in total (long-march-2f queries x3, plus fetches of xinhuanet 2016-09-15, news.cn 2025-04-25 and 2025-11-27, bjnews, huanqiu, chinadaily, yzwb, ncsti): only escape-mode prose ("when altitude reaches 39 km the escape tower is jettisoned") and total times. No primary per-event table. Primary: NOT FOUND.
L63 for Shenzhou: ship separation after stage-2 cutoff: not sourced (no cutoff time).

### 9. long-march-5: no primary per-event table; secondary from live-broadcast timing (Y1, 2016)

Spaceflight Now, *China launches Long March 5, one of the world's most powerful rockets*, https://spaceflightnow.com/2016/11/03/china-launches-long-march-5-one-of-the-worlds-most-powerful-rockets/ (WebFetch, verbatim quotes). Secondary. Flight: Long March 5 Y1 (Shijian-17, 3 Nov 2016).

| event | T+ s | quote |
|---|---|---|
| Booster separation | about 173 (2:53) | "four liquid-fueled boosters falling away from the Long March 5's 16-foot-diameter (5-meter) core stage around 2 minutes, 53 seconds, after liftoff" |
| Fairing separation | about 285 (4:45) | "payload fairing at approximately T+plus 4 minutes, 45 seconds, once the rocket reached an altitude of more than 90 miles (147 kilometers)" |
| Core (first) stage shutdown and separation | about 475 (7:55) | "first stage shut down and separated from the rocket's upper stage at about T+plus 7 minutes, 55 seconds" |
| Second-stage first burn ends / coast | not stated | "The second stage coasted until it crossed the equator at around T+plus 27 minutes, then re-ignited the engines" |
| Payload separation | about 1800 | "deploying the Shijian 17 ... about a half-hour after liftoff" |

Other LM-5 data (all earlier fetched, secondary): Chang'e-5 (Y5) "about 2200 s" of flight and four separations (kankanews); Chang'e-5 / Y5 about 2184 s (a JDSE search summary, not opened); coast "up to 935 s" (rmzxw); Tianwen-1 payload on course "about 36 minutes after launch" (Spaceflight Now ?p=46497, verified in fetch). The two JDSE papers (journal.hep.com.cn 10.15982/j.issn.2096-9287.2021.20210003 and ...20210012) were downloaded and contain NO flight event times (engine technology and booster design only). Primary per-event table: NOT FOUND. The model's 752 s second-stage shutdown stays unsourced.

### 10. m-v (Hayabusa, M-V-5): PRIMARY, full table

*M-V ロケットの飛翔軌道／風補正／電波誘導* (Yamakawa et al.), in *M-V型ロケット(5号機から8号機まで)*, JAXA Special Publication, Feb 2008, https://jaxa.repo.nii.ac.jp/record/5575/files/64112030.pdf , figure 2.1.1-2 and Table 2.1.1-1 "M-V-5号機タイムシーケンス" (page images read directly; X = ignition = liftoff, T+0). Primary. Flight: M-V-5 / MUSES-C Hayabusa, 9 May 2003.

| event | T+ s | quote (table cell) |
|---|---|---|
| 1st stage control end | 74.5 | "1段制御終了 74.5秒" |
| 1/2 stage separation | 75 | "1/2段分離 75秒" (figure: "第1段燃焼終了=第2段点火 (X+75.0sec)") |
| 2nd stage motor ignition | 75 | "2段モータ点火 75秒" |
| 2nd stage burnout | 151 | "2段燃焼終了 151秒" |
| Nose fairing open | 186 | "NF開頭 186秒" |
| 2/3 stage separation | 200 | "2/3段分離 200秒" |
| 3rd stage motor ignition | 205 | "3段モータ点火 205秒" |
| 3rd stage burnout | 309 | "3段燃焼終了 309秒" |
| Spin motor ignition | 359 | "スピンモータ点火 359秒" |
| 3/4 stage separation | 370 | "3/4段分離 370秒" |
| 4th stage motor ignition | 374 | "4段モータ点火 374秒" |
| 4th stage burnout | 468 | "4段燃焼終了 468秒" |
| 4th stage / spacecraft (SA) separation | 610 | "4段/SA分離 610秒 (Z+243秒)" |

Derived: spacecraft separation = 4th-stage burnout + 142 s (4th stage INS off at 605). Same paper, other flights (text): satellite separation M-V-6 (ASTRO-EII, Suzaku) X+1307 s, 3rd stage burnout 311 s; M-V-8 (ASTRO-F, Akari) separation X+519 s, 3rd burnout 309 s; M-V-7 (SOLAR-B, Hinode) separation X+510 s. "第1段分離(X+75秒時)" appears for every flight.

### 11. h3 (H3-24L, MMX): PRIMARY

JAXA, *H3・MMX 打上げ計画書* (H3-24L, long fairing, LE-9 x2 + SRB-3 x4, MMX), published 2026-08-20, https://www.jaxa.jp/press/2026/08/files/jaxa20260820-1_01.pdf , 表2 "ロケットの飛行計画 (2026年10月20日(日本標準時)打上げケース)" (pdftotext). Primary. The planned case; the table notes second-burn timing depends on launch date. mmx.json is the only mission using h3.

| event | T+ s | flight | quote (row) |
|---|---|---|---|
| SRB-3 first pair separation | 116 | H3-24L MMX plan | "(2) SRB-3第1ペア分離 01 56 116" |
| SRB-3 second pair separation | 118 | same | "SRB-3第2ペア分離 01 58 118" |
| Fairing separation | 197 | same | "衛星フェアリング分離 03 17 197" |
| First-stage cutoff (MECO) | 292 | same | "第1段エンジン燃焼停止(MECO) 04 52 292" |
| Stage 1/2 separation | 299 | same | "第1段・第2段分離 04 59 299" |
| SELI1 (2nd stage ignition 1) | 312 | same | "第2段エンジン第1回推力立上がり 05 12 312" |
| SECO1 | 640 | same | "第2段エンジン第1回燃焼停止 10 40 640" |
| SELI2 | 3837 | same | "(SELI2) 1 03 57 3837" |
| SECO2 | 4221 | same | "(SECO2) 1 10 21 4221" |
| MMX separation | 4272 | same | "火星衛星探査機(MMX)分離 1 11 12 4272" |

Derived: MMX separation = SECO2 + 51 s. Other H3 documents downloaded this session: H3 F7 (H3-24W, HTV-X1) https://www.jaxa.jp/press/2025/08/files/20250822-1_01.pdf : SRB-3 pairs 116/118, fairing 175, stage sep 299, HTV-X1 sep 843 s (14:03); H3 F6 (H3-30, no SRB) https://www.jaxa.jp/press/2026/06/files/jaxa20260609-1_01.pdf : fairing about 192, MECO about 214 (3:34), 1/2 sep 222 (3:42), PETREL/STARS-X sep 976. (Both only read in the tables above; F7 and F6 listed rows, not all columns.) Earlier-found H3-22S (F8): satellite sep 21 s after SECO2 (docs/wip section 13).
Fairing 197 s (MMX long fairing) versus 175 s (F7 wide fairing): fairing time depends on fairing type.

---

### Tried / not found

- Proton-K per-event primary: ILS PMPG Rev 7 downloaded (Proton-M only; K deleted). PMPG Sections 0 and A downloaded too (same Rev 7). 2 English + 1 Russian search; no K table. The Russian query returned launch-list pages only.
- Vostok-K third-stage cutoff: russianspaceweb vostok1_launch/orbit/vostok_lv, ESA "flight of Vostok 1", thisdayinaviation, Novaya Gazeta fetched; only narrative "some 10 seconds" and +2.4 s overburn. 3 searches (Russian x2, English).
- Voskhod: 2 searches (one English, one Russian) + russianspaceweb voskhod-flight/voskhod_lv + Wikipedia. Only 523 s.
- Soyuz 11A511: 1 search + Soyuz-FG page; nothing for 1967-71.
- Molniya-M: 2 searches, russianspaceweb molniya_lv. Not found.
- LM-2F: spaceflightnow only; no CASC/CMSE per-event table. Xinhua, CCTV, news.cn, chinadaily, bjnews, huanqiu, yzwb fetched: only prose.
- LM-5: no primary; spaceflight101 pages 403/404 from this machine.
- LM-3B Chang'e 1/2/3/4: no Chinese event times; manual typical profile only.
- spaceflightnow.com returns 403 to curl but works through WebFetch; spaceflight101.com returns 403/404.
- Not verified at all: Soyuz-Fregat Baikonur strap-on 1:58 / fairing 4:14 / Blok A 4:47 / KhO 4:57 (appeared in a search summary only), Soyuz MS-08 spaceflight101 page (404), Chang'e-3 18:58 separation (search summary only).

### Search count

WebSearch calls: 25 of 30. (Queries: Proton x3, Vostok x3, LM-2F x2, LM-5/LM-3B Chinese x2, LM-5 English + Chinese paper x2, Soyuz-FG x1, Mars Express x1, Voskhod x2 [1 EN + 1 RU], Sputnik x1, Soyuz 11A511 x1, M-V x1, H3 x1, LM-2F Chinese paper x1, Molniya x1, Chang'e-3 x1, LM-3A manual x1, LM-5 manual x1; some single calls returned several internal result sets.) WebFetch calls: about 16. Direct curl / pdftotext downloads: not counted.
