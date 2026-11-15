# L46 phase 1: candidate photos for the neighbourhood INDEX and the six outer-scale INDEXes

**Status (2026-11-15):** candidates found and staged, nothing turned on, no shipped file or data touched. Phase 2 (thumbs on) waits for the operator's per-image approval.

Brief: [L45 brief](2026-11-13-L45-thumbnail-scan-brief.md) §4.2 and decision 3. Row: L46 in [the plan](2026-11-11-ux-feedback-plan.md).

## What is missing (measured from the data files, not from the brief)

| List | Rows | Photo today | Missing |
|---|---|---|---|
| Neighbourhood INDEX: stars | 66 (62 named + 4 host-only) | 10 (`static/images/stars/<id>/`) | 56 (52 named, 4 host-only: trappist-1, 51-pegasi, toi-700, kepler-16) |
| Neighbourhood INDEX: deep sky | 143 | 44 (`photoKey`) | 99: 31 globular clusters, 25 open clusters, 34 galaxies, 3 nebulae, 3 planetary nebulae, 1 star-forming region, 2 other |
| Milky Way | 20 | 5 (Sgr A*, Sun, omega-centauri, LMC, SMC) | 15 |
| Local Group | 33 | 4 (andromeda, triangulum, LMC, SMC) | 29 |
| Local Sheet | 9 | 2 | 7 |
| Virgo | 7 | 0 | 7 |
| Laniakea | 8 | 0 | 8 |
| Cosmic Web | 7 | 1 (perseus-pisces) | 6 |

The brief counted 4 / 3 for the Milky Way and Local Group; the data gives 5 / 4 (the Sun and Triangulum are counted here because their panel heroes exist). Many outer rows are the same object as a deep-sky row (m3 m4 m5 m13 m15 m22 m92 ngc-6752 47-tucanae in the Milky Way; m32 m110 in the Local Group), so one deep-sky photo covers both lists.

## Method

- Deep sky and outer scale: Wikimedia Commons API (the `list=search` / category path AGENTS.md allows, not web search), 3 queries per object, licence and credit read from `extmetadata`, candidates filtered to free licences (public domain, CC0, CC BY, CC BY-SA), agency credit preferred (NASA, ESA/Hubble, ESO, NOIRLab, Chandra, Spitzer, WISE, Rubin). Top 3 per object looked at one by one on a contact sheet; the pick is recorded below. Files staged at 1600 px wide as JPEG.
- Stars: no Commons photograph exists for most of them (the search returned ships, streets and moths). The crop method: NASA SkyView (HEASARC) Digitized Sky Survey plates (DSS2 IR, Red, Blue), each background- and 99.7th-percentile-matched, composed to RGB at 50 % saturation, centred on the star by HIP number, field 1.5 / 1.0 / 0.4 / 0.15 / 0.06 degrees by magnitude, 512 px. DSS terms (MAST data attributions page, DSS section): free for scientific, educational and non-profit use including websites, **CC BY-NC-SA 4.0**; this project is non-commercial, ShareAlike applies to the derived crop. Copyright holders to name in provenance: STScI/AURA, Caltech (Palomar), UK STFC and the AAO Board (UK Schmidt).
- The repo tools were not enough on their own: `image-find-source.mjs` matches a known shipped image to its source by dHash and searches nothing by subject; `fetch-assets.ts` stages gallery slots (`/images/<category>/<id>/<NN>`) only. Two helpers were written (a Commons candidate finder with licence filter, a SkyView DSS composer) and live in the session scratchpad, not in the repo.
- pHash gate: every staged file hashed with `scripts/lib/phash.ts` and compared with `image-phashes.json`. One real duplicate (fornax-dwarf, d = 2 against `/images/science/dwarf-spheroidals-fornax.jpg`: that picture is already shipped). Pairs at d <= 6 with other files (m59, m85, m81, m98, cygnus-x-1, lalande-21185 against dark-field images) were not looked at one by one; the DCT hash of black-background images collides.

## Counts

| Group | Staged | Kinds | Licence mix |
|---|---|---|---|
| deep-sky | 99 of 99 | photo 94, weak 5 | CC BY 4.0 47, Public domain 45, CC0 3, CC BY 3.0 1, CC BY-SA 3.0 1, CC BY 2.0 1, CC BY-SA 4.0 1 |
| outer-scale rows that are not a deep-sky object | 42 | photo 19, part-of 14, xray 3, weak 6 | CC BY 4.0 21, Public domain 14, CC BY-SA 4.0 2, CC BY 2.0 2, CC BY 3.0 1, CC0 1, CC BY-SA 3.0 1 |
| stars (DSS crop) | 56 of 56 | crop 46, defect 7, none 3 | all CC BY-NC-SA 4.0 (DSS) |
| no clean candidate | 18 outer rows + 3 faint star hosts | | |

Kinds: **photo** = a real image of the object. **part-of** = a real image of a member or core standing in for the row (needs a "pictured:" caption like the Tarantula-for-LMC precedent). **xray** = a real X-ray image. **weak** = a real image that is faint or dull at 28 px. **defect** (stars) = DSS plate seam or artefact in the crop. **none** (stars) = faint host, nothing visible at the centre.

Staged files: `static/images/_staging/l46/{deep-sky,outer,stars}/<id>.jpg` (gitignored) with `l46-candidates.json` beside them. `/dev/staging` lists them, but its Promote action moves a file to `static/images/l46/...` and appends it to `image-approved.json`, which is not what these files need; do not use Apply on these.

## Deep sky (99 rows)

| id | kind | licence | credit | source | note |
|---|---|---|---|---|---|
| m2 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 2 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_2_Hubble_WikiSky.jpg>) |  |
| m4 | photo | CC BY 3.0 | ESO. Acknowledgement: ESO Imaging Survey | [The globular star cluster Messier 4.jpg](<https://commons.wikimedia.org/wiki/File:The_globular_star_cluster_Messier_4.jpg>) |  |
| m3 | photo | CC BY 4.0 | T.A. Rector (University of Alaska Anchorage) and H. Schweiker (WIYN an | [M3, NGC 5272 (noao-m3-kpno-mayall-4-m).tiff](<https://commons.wikimedia.org/wiki/File:M3,_NGC_5272_(noao-m3-kpno-mayall-4-m).tiff>) |  |
| m5 | photo | Public domain | ESA/Hubble & NASA | [Messier 5 - HST.jpg](<https://commons.wikimedia.org/wiki/File:Messier_5_-_HST.jpg>) |  |
| m6 | photo | Public domain | AURA, NOAO, NSF | [Messier6.jpg](<https://commons.wikimedia.org/wiki/File:Messier6.jpg>) |  |
| m9 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 9 Hubble WikiSky wfpc2 patched.jpg](<https://commons.wikimedia.org/wiki/File:Messier_9_Hubble_WikiSky_wfpc2_patched.jpg>) |  |
| m10 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 10 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_10_Hubble_WikiSky.jpg>) |  |
| m7 | photo | CC BY 4.0 | ESO | [The star cluster Messier 7 (eso1406a).tiff](<https://commons.wikimedia.org/wiki/File:The_star_cluster_Messier_7_(eso1406a).tiff>) |  |
| m11 | photo | CC BY 4.0 | KPNO/NOIRLab/NSF/AURA/Adam Block | [M11 (noao-m11block).png](<https://commons.wikimedia.org/wiki/File:M11_(noao-m11block).png>) |  |
| m12 | photo | Public domain | ESA/Hubble & NASA | [M12 Hubble.jpg](<https://commons.wikimedia.org/wiki/File:M12_Hubble.jpg>) |  |
| m14 | photo | CC BY 4.0 | NOIRLAB / NSF / AURA | [Messier 14.jpg](<https://commons.wikimedia.org/wiki/File:Messier_14.jpg>) |  |
| m13 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 13 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_13_Hubble_WikiSky.jpg>) |  |
| m17 | photo | CC BY 4.0 | ESO/INAF-VST/OmegaCAM. Acknowledgement: OmegaCen/Astro-WISE/Kapteyn In | [VST image of the spectacular star-forming region M](<https://commons.wikimedia.org/wiki/File:VST_image_of_the_spectacular_star-forming_region_Messier_17_(Omega_Nebula).jpg>) |  |
| m15 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 15 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_15_Hubble_WikiSky.jpg>) |  |
| m18 | weak | CC BY 4.0 | ESO | [The star cluster Messier 18 and its surroundings.j](<https://commons.wikimedia.org/wiki/File:The_star_cluster_Messier_18_and_its_surroundings.jpg>) | a region, not the cluster alone |
| m19 | photo | CC BY 4.0 | Doug Williams, REU Program/NOIRLab/ NSF /AURA | [M19, NGC 6273 (noao-m19).tiff](<https://commons.wikimedia.org/wiki/File:M19,_NGC_6273_(noao-m19).tiff>) |  |
| m20 | photo | Public domain | NASA , ESA , and The Hubble Heritage Team ( AURA / STScI ) | [Full HST WFPC2 image of Trifid Nebula (opo0417g).j](<https://commons.wikimedia.org/wiki/File:Full_HST_WFPC2_image_of_Trifid_Nebula_(opo0417g).jpg>) |  |
| m21 | photo | CC BY 4.0 | RubinObs/NOIRLab/SLAC/NSF/DOE/AURA | [Trifid and Lagoon Nebulae Excerpt- Messier 21 (noi](<https://commons.wikimedia.org/wiki/File:Trifid_and_Lagoon_Nebulae_Excerpt-_Messier_21_(noirlab2521ag).tiff>) |  |
| m22 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 22 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_22_Hubble_WikiSky.jpg>) |  |
| m23 | photo | CC BY 4.0 | N.A.Sharp, REU program/NOIRLab/ NSF /AURA | [M23, NGC 6494 (noao-m23).tiff](<https://commons.wikimedia.org/wiki/File:M23,_NGC_6494_(noao-m23).tiff>) |  |
| m24 | photo | CC BY 4.0 | Vanessa Harvey, REU program/NOIRLab/ NSF /AURA | [Sagittarius Star Cloud (noao-m24).tiff](<https://commons.wikimedia.org/wiki/File:Sagittarius_Star_Cloud_(noao-m24).tiff>) |  |
| m25 | weak | CC BY 4.0 | Hillary Mathis, Vanessa Harvey, REU program/NOIRLab/ NSF /AURA | [M25, IC4725 (noao-m25).tiff](<https://commons.wikimedia.org/wiki/File:M25,_IC4725_(noao-m25).tiff>) | sparse field |
| m26 | photo | CC BY 4.0 | Hillary Mathis, Vanessa Harvey, REU program/NOIRLab/NSF/AURA | [Messier 26.jpg](<https://commons.wikimedia.org/wiki/File:Messier_26.jpg>) |  |
| m27 | photo | Public domain | G. Jacoby, WIYN/NOAO/NSF | [WIYN Emission Line Image of Dumbbell Nebula (groun](<https://commons.wikimedia.org/wiki/File:WIYN_Emission_Line_Image_of_Dumbbell_Nebula_(ground-based_image)_(opo0306b).jpg>) |  |
| m28 | photo | Public domain | Credits: NASA, ESA, STScI, R. Buonanno (Universita di Roma Tor Vergata | [M28 - HST-U-V-IR.jpg](<https://commons.wikimedia.org/wiki/File:M28_-_HST-U-V-IR.jpg>) |  |
| m29 | photo | CC BY 4.0 | Hillary Mathis/NOIRLab/ NSF /AURA | [M29, NGC 6913 (noao-m29).tiff](<https://commons.wikimedia.org/wiki/File:M29,_NGC_6913_(noao-m29).tiff>) |  |
| m32 | photo | Public domain | NASA, ESA, Benjamin F. Williams (UWashington), Zhuo Chen (UWashington) | [M32 crop of Hubble’s panoramic view of the Androme](<https://commons.wikimedia.org/wiki/File:M32_crop_of_Hubble%E2%80%99s_panoramic_view_of_the_Andromeda_Galaxy_(heic2501a).jpg>) |  |
| m33 | photo | CC BY 4.0 | ESO | [VST snaps a very detailed view of the Triangulum G](<https://commons.wikimedia.org/wiki/File:VST_snaps_a_very_detailed_view_of_the_Triangulum_Galaxy.jpg>) |  |
| m34 | photo | CC BY 4.0 | REU program/NOIRLab/ NSF /AURA | [M34, NGC 1039 (noao-m34).tiff](<https://commons.wikimedia.org/wiki/File:M34,_NGC_1039_(noao-m34).tiff>) |  |
| m30 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 30 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_30_Hubble_WikiSky.jpg>) |  |
| m35 | photo | CC0 | Stephen Rahn from Macon, GA, USA | [Messier 35 - Open Cluster in Gemini - Flickr - Ste](<https://commons.wikimedia.org/wiki/File:Messier_35_-_Open_Cluster_in_Gemini_-_Flickr_-_StephenGA.png>) |  |
| m36 | weak | Public domain |  | [M36 2mass.jpg](<https://commons.wikimedia.org/wiki/File:M36_2mass.jpg>) | 2MASS infrared, dull |
| m37 | photo | CC BY 4.0 | NOIRLab/ NSF /AURA | [M37, NGC 2099 (noao-m37).tiff](<https://commons.wikimedia.org/wiki/File:M37,_NGC_2099_(noao-m37).tiff>) |  |
| m38 | photo | CC BY 4.0 | NOIRLab/ NSF /AURA | [M38, NGC 1912 (noao-m38).tiff](<https://commons.wikimedia.org/wiki/File:M38,_NGC_1912_(noao-m38).tiff>) |  |
| m39 | photo | CC BY 4.0 | Heidi Schweiker/WIYN and NOIRLab/ NSF /AURA | [M39, NGC 7092 (noao-m39).tiff](<https://commons.wikimedia.org/wiki/File:M39,_NGC_7092_(noao-m39).tiff>) |  |
| m41 | photo | CC BY 4.0 | NOIRLab/ NSF /AURA | [M41, NGC 2287 (noao-m41).tiff](<https://commons.wikimedia.org/wiki/File:M41,_NGC_2287_(noao-m41).tiff>) |  |
| m43 | photo | Public domain | NASA, ESA, M. Robberto (Space Telescope Science Institute/ESA) and the | [M43 HST.jpg](<https://commons.wikimedia.org/wiki/File:M43_HST.jpg>) |  |
| m44 | photo | CC BY 4.0 | KPNO/NOIRLab/NSF/AURA/Tom Bash and John Fox/Adam Block | [M44- The Beehive Cluster (noao-m44bash).tiff](<https://commons.wikimedia.org/wiki/File:M44-_The_Beehive_Cluster_(noao-m44bash).tiff>) |  |
| m47 | photo | CC BY 4.0 | ESO | [The star cluster Messier 47 (eso1441a).tiff](<https://commons.wikimedia.org/wiki/File:The_star_cluster_Messier_47_(eso1441a).tiff>) |  |
| m46 | photo | CC BY 4.0 | N.A.Sharp/NOIRLab/ NSF /AURA | [M46, NGC 2437 (noao-m46).tiff](<https://commons.wikimedia.org/wiki/File:M46,_NGC_2437_(noao-m46).tiff>) |  |
| m48 | photo | CC BY 4.0 | NOIRLab/ NSF /AURA | [M48, NGC 2548 (noao-m48).tiff](<https://commons.wikimedia.org/wiki/File:M48,_NGC_2548_(noao-m48).tiff>) |  |
| m49 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 49 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_49_Hubble_WikiSky.jpg>) |  |
| m50 | photo | CC BY 4.0 | NOIRLab/ NSF /AURA | [M50, NGC 2323 (noao-m50).tiff](<https://commons.wikimedia.org/wiki/File:M50,_NGC_2323_(noao-m50).tiff>) |  |
| m52 | photo | CC BY 4.0 | N.A.Sharp, REU program/NOIRLab/ NSF /AURA | [M52 and the Bubble Nebula (noao-m52r).tiff](<https://commons.wikimedia.org/wiki/File:M52_and_the_Bubble_Nebula_(noao-m52r).tiff>) |  |
| m53 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 53 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_53_Hubble_WikiSky.jpg>) |  |
| m55 | photo | CC BY 4.0 | ESO/J. Emerson/VISTA | [Messier 55 VISTA.jpg](<https://commons.wikimedia.org/wiki/File:Messier_55_VISTA.jpg>) |  |
| m54 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 54 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_54_Hubble_WikiSky.jpg>) |  |
| m58 | photo | CC0 | NASA Hubble Space Telescope | [Messier 58 - Flickr - NASA Hubble.jpg](<https://commons.wikimedia.org/wiki/File:Messier_58_-_Flickr_-_NASA_Hubble.jpg>) |  |
| m56 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 56 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_56_Hubble_WikiSky.jpg>) |  |
| m59 | photo | CC BY 4.0 | Credit: ESA/Hubble & NASA, L. Ho et al. | [Messier59 - HST - Potw1921a.jpg](<https://commons.wikimedia.org/wiki/File:Messier59_-_HST_-_Potw1921a.jpg>) |  |
| m61 | photo | CC BY 4.0 | ESA/Hubble & NASA, ESO, J. Lee and the PHANGS-HST Team | [Spiral arms of M61 hubble april 2021.tif](<https://commons.wikimedia.org/wiki/File:Spiral_arms_of_M61_hubble_april_2021.tif>) |  |
| m62 | weak | Public domain | (Credit: 2MASS/UMass/IPAC-Caltech/NASA/NSF) | [2MASS Infrared Image of NGC 6266 (2003-ngc6266-mor](<https://commons.wikimedia.org/wiki/File:2MASS_Infrared_Image_of_NGC_6266_(2003-ngc6266-more-7_-_ngc6266_ir).tiff>) | IPAC 2MASS false colour, no round cluster |
| m63 | photo | Public domain | NASA/JPL-Caltech/SINGS Team | [Sunflower Galaxy Glows with Infrared Light.jpg](<https://commons.wikimedia.org/wiki/File:Sunflower_Galaxy_Glows_with_Infrared_Light.jpg>) |  |
| m60 | photo | Public domain | NASA, ESA, CXC, and J. Strader (Michigan State University) | [Messier 60 - Hubble (2013-9-24).jpg](<https://commons.wikimedia.org/wiki/File:Messier_60_-_Hubble_(2013-9-24).jpg>) |  |
| m64 | photo | Public domain | NASA, CSA, ESA, F. Belfiore (European Southern Observatory – Germany), | [Easily identified by the spectacular band of dark ](<https://commons.wikimedia.org/wiki/File:Easily_identified_by_the_spectacular_band_of_dark_dust_that_partially_obscures_its_bright_core,_Messier_64,_or_the_Black_Eye_Galaxy,_is_characterized_by_its_bizarre_internal_motion_(black-eye-galaxy).jpg>) |  |
| m65 | photo | CC BY 4.0 | KPNO/NOIRLab/NSF/AURA/Doc. G. and Dick Goddard/Adam Block | [M65 (noao-m65greiner).tiff](<https://commons.wikimedia.org/wiki/File:M65_(noao-m65greiner).tiff>) |  |
| m67 | weak | CC BY 4.0 | ESO/Digitized Sky Survey 2 Acknowledgement: Davide De Martin | [Wide-field view of the open star cluster Messier 6](<https://commons.wikimedia.org/wiki/File:Wide-field_view_of_the_open_star_cluster_Messier_67_(eso1402c).jpg>) | faint DSS field |
| m66 | photo | CC BY 4.0 | NASA, ESA and the Hubble Heritage (STScI/AURA)-ESA/Hubble Collaboratio | [Messier 66 in the Leo Triplet (captured by the Hub](<https://commons.wikimedia.org/wiki/File:Messier_66_in_the_Leo_Triplet_(captured_by_the_Hubble_Space_Telescope).jpg>) |  |
| m68 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 68 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_68_Hubble_WikiSky.jpg>) |  |
| m69 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 69 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_69_Hubble_WikiSky.jpg>) |  |
| m70 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 70 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_70_Hubble_WikiSky.jpg>) |  |
| m71 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 71 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_71_Hubble_WikiSky.jpg>) |  |
| m72 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [M72 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:M72_Hubble_WikiSky.jpg>) |  |
| m75 | photo | CC BY 4.0 | ESA/Hubble & NASA, F. Ferraro et al. | [Crowded cluster Messier 75.jpg](<https://commons.wikimedia.org/wiki/File:Crowded_cluster_Messier_75.jpg>) |  |
| m73 | photo | CC BY 4.0 | REU program/NOIRLab/ NSF /AURA | [M73, NGC 6994 (noao-m73).tiff](<https://commons.wikimedia.org/wiki/File:M73,_NGC_6994_(noao-m73).tiff>) |  |
| m77 | photo | Public domain | NASA, ESA & A. van der Hoeven | [Messier 77 spiral galaxy by HST.jpg](<https://commons.wikimedia.org/wiki/File:Messier_77_spiral_galaxy_by_HST.jpg>) |  |
| m78 | photo | CC BY 4.0 | ESO/Igor Chekalin | [Messier 78.jpg](<https://commons.wikimedia.org/wiki/File:Messier_78.jpg>) |  |
| m79 | photo | CC BY-SA 3.0 | HST / Fabian RRRR ( talk ) | [Messier79 -hst 06607 02 06095 04R555GB336 435.png](<https://commons.wikimedia.org/wiki/File:Messier79_-hst_06607_02_06095_04R555GB336_435.png>) |  |
| m76 | photo | Public domain | Image: NASA, ESA, STScI | [Little Dumbbell Nebula (WFC3 Image) (2024-013).png](<https://commons.wikimedia.org/wiki/File:Little_Dumbbell_Nebula_(WFC3_Image)_(2024-013).png>) |  |
| m80 | photo | Public domain | Hubble Space Telescope | [Globular Star Cluster NGC 6093 (M80) (2001-22-1084](<https://commons.wikimedia.org/wiki/File:Globular_Star_Cluster_NGC_6093_(M80)_(2001-22-1084).jpg>) |  |
| m81 | photo | Public domain | NASA, ESA and the Hubble Heritage Team (STScI/AURA) | [Messier 81 HST.jpg](<https://commons.wikimedia.org/wiki/File:Messier_81_HST.jpg>) |  |
| m82 | photo | Public domain | NASA, ESA, and The Hubble Heritage Team (STScI/AURA) | [M82 HST ACS 2006-14-a-large web.jpg](<https://commons.wikimedia.org/wiki/File:M82_HST_ACS_2006-14-a-large_web.jpg>) |  |
| m83 | photo | Public domain | Credit: NASA, ESA, and the Hubble Heritage Team (STScI/AURA) Acknowled | [Messier83 - Heic1403a.jpg](<https://commons.wikimedia.org/wiki/File:Messier83_-_Heic1403a.jpg>) |  |
| m85 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 85 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_85_Hubble_WikiSky.jpg>) |  |
| m84 | photo | Public domain | (Credit: Radio (NSF/NRAO/VLA/ESO/R.A.Laing et al); Optical (SDSS)) | [Optical Image of M84 (2008-m84-more-2 - m84 optica](<https://commons.wikimedia.org/wiki/File:Optical_Image_of_M84_(2008-m84-more-2_-_m84_optical).tiff>) |  |
| m86 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 86 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_86_Hubble_WikiSky.jpg>) |  |
| m87 | photo | Public domain | Credits: NASA, ESA and the Hubble Heritage Team (STScI/AURA); Acknowle | [M87-full jpg.jpg](<https://commons.wikimedia.org/wiki/File:M87-full_jpg.jpg>) |  |
| m88 | photo | Public domain | ESA/Hubble & NASA, D. Thilker | [This NASA-ESA Hubble Space Telescope image feature](<https://commons.wikimedia.org/wiki/File:This_NASA-ESA_Hubble_Space_Telescope_image_features_the_spiral_galaxy_Messier_88_(M88)_(journey-to-the-center-of-the-virgo-cluster).jpg>) |  |
| m89 | photo | CC BY 4.0 | Sloan Digital Sky Survey | [Messier89 - SDSS DR14 (panorama).jpg](<https://commons.wikimedia.org/wiki/File:Messier89_-_SDSS_DR14_(panorama).jpg>) |  |
| m90 | photo | CC BY 2.0 | Judy Schmidt from USA | [Messier 90 - HST.png](<https://commons.wikimedia.org/wiki/File:Messier_90_-_HST.png>) |  |
| m91 | photo | CC BY-SA 4.0 | NASA, ESA, and J. Lee (California Institute of Technology) | [M91 wfc3 4 crop v2 final.jpg](<https://commons.wikimedia.org/wiki/File:M91_wfc3_4_crop_v2_final.jpg>) |  |
| m92 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Messier 92 Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Messier_92_Hubble_WikiSky.jpg>) |  |
| m93 | photo | CC BY 4.0 | NOIRLab/ NSF /AURA | [M93, NGC 2447 (noao-m93).tiff](<https://commons.wikimedia.org/wiki/File:M93,_NGC_2447_(noao-m93).tiff>) |  |
| m94 | photo | CC BY 4.0 | Credit:Hillary Mathis, N.A.Sharp/NOIRLab/NSF/AURA/ | [M94 - Noao-m94.jpg](<https://commons.wikimedia.org/wiki/File:M94_-_Noao-m94.jpg>) |  |
| m95 | photo | CC0 | Image credit: NASA, ESA, J. Lee (STScI), and R. Chandar (University of | [Messier 95 (2026).jpg](<https://commons.wikimedia.org/wiki/File:Messier_95_(2026).jpg>) |  |
| m96 | photo | CC BY 4.0 | ESA/Hubble & NASA and the LEGUS Team Acknowledgement: R. Gendler | [Messier 96 - Potw1535a.tif](<https://commons.wikimedia.org/wiki/File:Messier_96_-_Potw1535a.tif>) |  |
| m98 | photo | CC BY 4.0 | NOIRLab/ NSF /AURA | [M98, NGC 4192 (noao-m98).tiff](<https://commons.wikimedia.org/wiki/File:M98,_NGC_4192_(noao-m98).tiff>) |  |
| m97 | photo | CC BY 4.0 | International Gemini Observatory/NOIRLab/ NSF /AURA/Émilie Storer (Col | [Gemini North image of the planetary nebula M97 (ge](<https://commons.wikimedia.org/wiki/File:Gemini_North_image_of_the_planetary_nebula_M97_(geminiann10008a).tiff>) |  |
| m100 | photo | Public domain | Hubble Legacy Archive, NASA, ESA - Processing & Licence: Judy Schmidt | [Messier 100 galaxy Hubble.jpg](<https://commons.wikimedia.org/wiki/File:Messier_100_galaxy_Hubble.jpg>) |  |
| m99 | photo | CC BY 4.0 | NOIRLab/ NSF /AURA | [M99; NGC 4254 (noao-m99).tiff](<https://commons.wikimedia.org/wiki/File:M99;_NGC_4254_(noao-m99).tiff>) |  |
| m103 | photo | CC BY 4.0 | Hillary Mathis, N.A.Sharp/NOIRLab/ NSF /AURA | [M103, NGC 581 (noao-m103).tiff](<https://commons.wikimedia.org/wiki/File:M103,_NGC_581_(noao-m103).tiff>) |  |
| m106 | photo | Public domain | NASA, ESA, the Hubble Heritage Team (STScI/AURA), and R. Gendler (for  | [Messier 106 visible and infrared composite.jpg](<https://commons.wikimedia.org/wiki/File:Messier_106_visible_and_infrared_composite.jpg>) |  |
| m107 | photo | CC BY 4.0 | ESO/ESO Imaging Survey | [The globular star cluster Messier 107.jpg](<https://commons.wikimedia.org/wiki/File:The_globular_star_cluster_Messier_107.jpg>) |  |
| m108 | photo | CC BY 4.0 | NOIRLab/ NSF /AURA | [M108, NGC 3556 (noao-m108).tiff](<https://commons.wikimedia.org/wiki/File:M108,_NGC_3556_(noao-m108).tiff>) |  |
| m109 | photo | CC BY 4.0 | NOIRLab/ NSF /AURA | [M109, NGC 3992 (noao-m109).tiff](<https://commons.wikimedia.org/wiki/File:M109,_NGC_3992_(noao-m109).tiff>) |  |
| m110 | photo | CC BY 4.0 | Sloan Digital Sky Survey | [Messier110 - SDSS DR14 (panorama).jpg](<https://commons.wikimedia.org/wiki/File:Messier110_-_SDSS_DR14_(panorama).jpg>) |  |
| ngc-104 | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [NGC 104 Hubble WikiSky ACS.jpg](<https://commons.wikimedia.org/wiki/File:NGC_104_Hubble_WikiSky_ACS.jpg>) |  |
| ngc-6752 | photo | CC BY 4.0 | ESO | [Star cluster NGC 6752.jpg](<https://commons.wikimedia.org/wiki/File:Star_cluster_NGC_6752.jpg>) |  |
| m105 | photo | Public domain | NASA Hubble Space Telescope | [M105 (23661262488).png](<https://commons.wikimedia.org/wiki/File:M105_(23661262488).png>) |  |

## Outer-scale rows that are not a deep-sky object (42)

| id | kind | licence | credit | source | note |
|---|---|---|---|---|---|
| cygnus-x-1 | xray | Public domain | NASA's Chandra X-ray Observatory; Credits: NASA/CXC | [Chandra image of Cygnus X-1.jpg](<https://commons.wikimedia.org/wiki/File:Chandra_image_of_Cygnus_X-1.jpg>) | Chandra X-ray image; the ESA/Hubble file is an artist impression and is not used |
| milky-way | part-of | Public domain | Credit: NASA/JPL-Caltech/S. Stolovy (Spitzer Science Center/Caltech) | [Milky Way IR Spitzer.jpg](<https://commons.wikimedia.org/wiki/File:Milky_Way_IR_Spitzer.jpg>) | Spitzer infrared view of the galactic plane |
| sagittarius-dsph | part-of | CC BY 3.0 | ESA/Hubble & NASA | [Messier 54 HST.jpg](<https://commons.wikimedia.org/wiki/File:Messier_54_HST.jpg>) | M54, the cluster at the dwarf galaxy core; the ESA file is a Gaia map |
| ursa-minor-dwarf | weak | CC0 | Giuseppe Donatiello from Oria (Brindisi), Italy | [Ursa Minor Dwarf - Giuseppe Donatiello.jpg](<https://commons.wikimedia.org/wiki/File:Ursa_Minor_Dwarf_-_Giuseppe_Donatiello.jpg>) | faint, a star field |
| draco-dwarf | weak | Public domain | Science NASA, ESA, Eduardo Vitral (STScI), Roeland van der Marel (STSc | [Draco Dwarf Spheroidal (2024-017).png](<https://commons.wikimedia.org/wiki/File:Draco_Dwarf_Spheroidal_(2024-017).png>) | faint diffuse |
| sculptor-dwarf | photo | CC BY 4.0 | ESO | [Sculptor Dwarf Galaxy ESO.jpg](<https://commons.wikimedia.org/wiki/File:Sculptor_Dwarf_Galaxy_ESO.jpg>) |  |
| carina-dwarf | weak | CC BY 4.0 | ESO/G. Bono & CTIO | [Hiding in plain sight — the elusive Carina dwarf g](<https://commons.wikimedia.org/wiki/File:Hiding_in_plain_sight_%E2%80%94_the_elusive_Carina_dwarf_galaxy_(potw1126a).tiff>) | faint diffuse |
| leo-i | photo | CC BY-SA 4.0 | NASA/ESA Hubble ACS; Tammy Smecker-Hane et al. & Melina Thévenot | [Leo I Hubble.jpg](<https://commons.wikimedia.org/wiki/File:Leo_I_Hubble.jpg>) | ranked list held only Leo IV files; this is Leo I |
| fornax-dwarf | photo | CC BY 4.0 | ESO/Digitized Sky Survey 2 | [Fornax dwarf galaxy.jpg](<https://commons.wikimedia.org/wiki/File:Fornax_dwarf_galaxy.jpg>) |  |
| leo-ii | weak | Public domain | Hubble Space Telescope - Hubble Legacy Archive | [Color cutout hst 05386 01 wfpc2 f814w f555w pc sci](<https://commons.wikimedia.org/wiki/File:Color_cutout_hst_05386_01_wfpc2_f814w_f555w_pc_sci_Leo_II.jpg>) | HST cutout with a satellite streak |
| ngc-185 | photo | CC BY 2.0 | NASA Hubble Space Telescope | [Caldwell 18 (50289818793).jpg](<https://commons.wikimedia.org/wiki/File:Caldwell_18_(50289818793).jpg>) |  |
| ngc-147 | photo | CC BY 2.0 | NASA Hubble Space Telescope | [Caldwell 17 (50290241446).jpg](<https://commons.wikimedia.org/wiki/File:Caldwell_17_(50290241446).jpg>) |  |
| andromeda-i | photo | Public domain | en:NASA , en:STScI , en:WikiSky | [Andromeda I Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Andromeda_I_Hubble_WikiSky.jpg>) | HST |
| andromeda-ii | photo | Public domain | Hubble Space Telescope - Hubble Legacy Archive | [Color cutout hst 13028 08 acs wfc f814w f475w sci ](<https://commons.wikimedia.org/wiki/File:Color_cutout_hst_13028_08_acs_wfc_f814w_f475w_sci_Andromeda_II.jpg>) | HST |
| andromeda-iii | photo | Public domain | Hubble Space Telescope - Hubble Legacy Archive | [Color cutout hst 13739 22 acs wfc f814w f475w sci ](<https://commons.wikimedia.org/wiki/File:Color_cutout_hst_13739_22_acs_wfc_f814w_f475w_sci_Andromeda_III.jpg>) | HST |
| pegasus-dsph | photo | CC BY 4.0 | Legacy Surveys / D.Lang (Perimeter Institute) & Meli thev | [Pegasus Dwarf Spheroidal Galaxy legacy dr10.jpg](<https://commons.wikimedia.org/wiki/File:Pegasus_Dwarf_Spheroidal_Galaxy_legacy_dr10.jpg>) | Legacy Surveys |
| ic-1613 | photo | CC BY 4.0 | ESO | [Dwarf galaxy IC 1613.jpg](<https://commons.wikimedia.org/wiki/File:Dwarf_galaxy_IC_1613.jpg>) |  |
| ngc-6822 | photo | CC BY 4.0 | ESO | [Barnard's Galaxy.jpg](<https://commons.wikimedia.org/wiki/File:Barnard%27s_Galaxy.jpg>) |  |
| ic-10 | photo | CC BY 4.0 | Credit: KPNO/NOIRLab/NSF/AURA Data obtained and processed by: P. Masse | [IC10 - Noirlab2013a.jpg](<https://commons.wikimedia.org/wiki/File:IC10_-_Noirlab2013a.jpg>) |  |
| wlm | photo | CC BY 4.0 | ESO Acknowledgement: VST/Omegacam Local Group Survey | [The WLM galaxy on the edge of the Local Group.jpg](<https://commons.wikimedia.org/wiki/File:The_WLM_galaxy_on_the_edge_of_the_Local_Group.jpg>) |  |
| leo-a | photo | CC BY 4.0 | Legacy Surveys / D.Lang (Perimeter Institute) & Meli thev | [Leo A legacy dr10.jpg](<https://commons.wikimedia.org/wiki/File:Leo_A_legacy_dr10.jpg>) | Legacy Surveys |
| phoenix-dwarf | photo | CC BY 4.0 | ESO | [An explosive phoenix - Phoenix Dwarf.jpg](<https://commons.wikimedia.org/wiki/File:An_explosive_phoenix_-_Phoenix_Dwarf.jpg>) |  |
| aquarius-dwarf | photo | CC BY 4.0 | Legacy Surveys / D.Lang (Perimeter Institute) & Meli thev | [Aquarius Dwarf legacy dr10.jpg](<https://commons.wikimedia.org/wiki/File:Aquarius_Dwarf_legacy_dr10.jpg>) | Legacy Surveys |
| tucana-dwarf | weak | Public domain | en:NASA , en:STScI , en:WikiSky | [Tucana Dwarf Hubble WikiSky.jpg](<https://commons.wikimedia.org/wiki/File:Tucana_Dwarf_Hubble_WikiSky.jpg>) | faint diffuse |
| sagittarius-dirr | photo | CC BY 4.0 | Acknowledgement: M. Bellazzini et al. Credit: ESO/M. Bellazzini et al. | [Sagittarius Dwarf Irregular Galaxy - ESO - Potw180](<https://commons.wikimedia.org/wiki/File:Sagittarius_Dwarf_Irregular_Galaxy_-_ESO_-_Potw1805a.tif>) |  |
| cetus-dwarf | weak | CC BY 4.0 | Legacy Surveys / D.Lang (Perimeter Institute) & Meli thev | [Cetus dSph legacy surveys.jpg](<https://commons.wikimedia.org/wiki/File:Cetus_dSph_legacy_surveys.jpg>) | Legacy Surveys, faint |
| pegasus-dirr | photo | CC BY-SA 4.0 | NASA/ESA/CSA JWST NIRCam; Alessandro Savino et al. & Melina Thévenot | [Pegasus Dwarf Irregular Galaxy JWST NIRCam.jpg](<https://commons.wikimedia.org/wiki/File:Pegasus_Dwarf_Irregular_Galaxy_JWST_NIRCam.jpg>) | JWST NIRCam |
| m81-group | part-of | CC BY 4.0 | KPNO/NOIRLab/NSF/AURA/Adam Block | [M81 and M82 (noao-m81wideblock).tiff](<https://commons.wikimedia.org/wiki/File:M81_and_M82_(noao-m81wideblock).tiff>) | M81 and M82 in one field |
| centaurus-a-group | part-of | CC BY 4.0 | ESO | [Centaurus A.jpg](<https://commons.wikimedia.org/wiki/File:Centaurus_A.jpg>) | Centaurus A, the complex's brightest member |
| sculptor-group | part-of | CC BY 4.0 | ESO/J. Emerson/VISTA. Acknowledgment: Cambridge Astronomical Survey Un | [VISTA’s infrared view of the Sculptor Galaxy (NGC ](<https://commons.wikimedia.org/wiki/File:VISTA%E2%80%99s_infrared_view_of_the_Sculptor_Galaxy_(NGC_253)_(eso1025a).tiff>) | NGC 253 |
| canes-venatici-i | part-of | Public domain | Credit: NASA, ESA, and the Hubble Heritage (STScI/AURA)-ESA/Hubble Col | [Galaxy NGC 4214- A Star-Formation Laboratory (2011](<https://commons.wikimedia.org/wiki/File:Galaxy_NGC_4214-_A_Star-Formation_Laboratory_(2011-14-2844).tiff>) | NGC 4214 |
| maffei-group | part-of | Public domain | NASA/JPL-Caltech/J. Turner (UCLA) | [Maffei 2 The Hidden Galaxy.jpg](<https://commons.wikimedia.org/wiki/File:Maffei_2_The_Hidden_Galaxy.jpg>) | Maffei 2 |
| ngc-6946-group | part-of | CC BY 4.0 | KPNO/NOIRLab/ NSF /AURA/T.A. Rector (University of Alaska Anchorage)/H | [Spiral Galaxy NGC 6946 (noao-ngc6946kpno).tiff](<https://commons.wikimedia.org/wiki/File:Spiral_Galaxy_NGC_6946_(noao-ngc6946kpno).tiff>) | NGC 6946 |
| leo-i-cloud | part-of | CC BY 4.0 | ESA/Hubble & NASA and the LEGUS Team Acknowledgement: R. Gendler | [A galactic maelstrom.jpg](<https://commons.wikimedia.org/wiki/File:A_galactic_maelstrom.jpg>) | M96, the group's namesake (the ranked #0 was the Leo Triplet, a different group) |
| virgo-cluster | xray | Public domain | NASA/CXC/Stanford/I.Zhuravleva et al | [The Virgo Cluster (55585654230).jpg](<https://commons.wikimedia.org/wiki/File:The_Virgo_Cluster_(55585654230).jpg>) | Chandra X-ray image of the cluster gas |
| ngc-5846-group | part-of | CC BY 4.0 | Sloan Digital Sky Survey | [NGC5846 - SDSS DR14.jpg](<https://commons.wikimedia.org/wiki/File:NGC5846_-_SDSS_DR14.jpg>) | NGC 5846 |
| great-attractor | part-of | Public domain | (Credit: X-ray: NASA/CXC/UVa/M. Sun, et al; H-alpha/Optical: SOAR (UVa | [Abell 3627 with Scale Bar (2010-eso137-more-2).tif](<https://commons.wikimedia.org/wiki/File:Abell_3627_with_Scale_Bar_(2010-eso137-more-2).tiff>) | Abell 3627 (Norma cluster), the attractor's core; one galaxy's gas tail dominates the frame |
| centaurus-cluster | xray | Public domain | NASA/IoA/J.Sanders & A.Fabian | [Centaurus Cluster- Vast Hot Gas Plume May Be A Pas](<https://commons.wikimedia.org/wiki/File:Centaurus_Cluster-_Vast_Hot_Gas_Plume_May_Be_A_Passing_Attraction_(2002-0146_-_0146_xray).tiff>) | Chandra X-ray image of the cluster gas |
| fornax-eridanus | part-of | CC BY 4.0 | ESO/J. Emerson/VISTA. Acknowledgment: Cambridge Astronomical Survey Un | [Fornax Cluster of Galaxies.jpg](<https://commons.wikimedia.org/wiki/File:Fornax_Cluster_of_Galaxies.jpg>) | the Fornax cluster, the supercluster's core |
| antlia-cluster | photo | CC BY 4.0 | Dark Energy Survey/DOE/FNAL/DECam/CTIO/NOIRLab/NSF/AURA Image processi | [DECam Deep View of the Antlia Cluster (noirlab2501](<https://commons.wikimedia.org/wiki/File:DECam_Deep_View_of_the_Antlia_Cluster_(noirlab2501a)_(cropped_to_NGC_3268).jpg>) |  |
| shapley-concentration | part-of | CC BY-SA 3.0 | ESA & Planck Collaboration / Rosat/ Digitised Sky Survey | [The core of the Shapley Supercluster.jpg](<https://commons.wikimedia.org/wiki/File:The_core_of_the_Shapley_Supercluster.jpg>) | composite of the supercluster core (Planck, ROSAT, DSS) |
| coma-great-wall | part-of | Public domain | NASA, ESA, J. Mack (STScI), and J. Madrid (Australian Telescope Nation | [Coma Cluster Mosaic (2018-44-4269).png](<https://commons.wikimedia.org/wiki/File:Coma_Cluster_Mosaic_(2018-44-4269).png>) | the Coma cluster |

## Stars (56 rows, DSS crops)

All: source SkyView / DSS2, credit "Digitized Sky Survey / STScI / NASA SkyView", CC BY-NC-SA 4.0.

| id | kind | note |
|---|---|---|
| canopus | defect | plate seam across the halo (usable) |
| arcturus | crop |  |
| capella | crop |  |
| procyon | crop |  |
| achernar | defect | plate seam (usable) |
| hadar | defect | plate arc artefact |
| acrux | defect | plate seam, noisy |
| aldebaran | crop |  |
| spica | crop |  |
| pollux | crop |  |
| deneb | crop |  |
| mimosa | defect | plate seam through the frame |
| regulus | crop |  |
| adhara | crop |  |
| castor | crop |  |
| gacrux | crop |  |
| bellatrix | crop |  |
| elnath | crop |  |
| miaplacidus | crop |  |
| alnilam | crop |  |
| alnair | crop |  |
| alnitak | crop |  |
| alioth | crop |  |
| mirfak | crop |  |
| kaus-australis | defect | plate seam through the frame |
| dubhe | crop |  |
| wezen | crop |  |
| alkaid | crop |  |
| sargas | crop |  |
| avior | crop |  |
| menkalinan | crop |  |
| atria | crop |  |
| alhena | crop |  |
| peacock | crop |  |
| polaris | crop |  |
| alphard | crop |  |
| hamal | crop |  |
| diphda | crop |  |
| nunki | crop |  |
| menkent | crop |  |
| alpheratz | crop |  |
| saiph | crop |  |
| rasalhague | defect | plate defect (coloured wedge in the corner) |
| algol | crop |  |
| almach | crop |  |
| denebola | crop |  |
| alphecca | crop |  |
| sadr | crop |  |
| mintaka | crop |  |
| lalande-21185 | crop |  |
| luytens-star | crop |  |
| van-maanens-star | crop |  |
| trappist-1 | none | faint M dwarf, nothing to see at the centre |
| 51-pegasi | crop |  |
| toi-700 | none | faint, a plain star field |
| kepler-16 | none | faint, a plain star field |

## No clean candidate (outer rows)

| id | why |
|---|---|
| sextans-dwarf | only a file of Sextans B (a different galaxy) |
| local-group | only the WLM galaxy came up; a group is not one picture |
| canes-venatici-spur | nothing found |
| ursa-major-cloud | nothing found |
| virgo-ii-groups | the one hit (NGC 4753) is not shown to belong to the Virgo II groups |
| virgo-supercluster | diagrams and maps only |
| hydra-centaurus | nothing found |
| pavo-indus | diagrams only |
| ophiuchus-supercluster | the one hit (Abell 2384) is not shown to be in the supercluster |
| laniakea | a computed flow map only |
| sloan-great-wall | nothing found |
| bootes-void | only unrelated concert photographs |
| horologium-reticulum | nothing found |
| perseus | artist concept only (NASA/JPL-Caltech/R. Hurt) |
| scutum-centaurus | artist concept only (NASA/JPL-Caltech/R. Hurt) |
| sagittarius | artist concept only (NGC 3582 is a nebula in the arm, not the arm) |
| norma | annotated survey strip only |
| orion-spur | artist concept only |

Reuse of shipped images instead of new files: fornax-dwarf (`/images/science/dwarf-spheroidals-fornax`, same picture as the staged candidate), Milky Way row (`/images/science/our-galaxy-hero`, not checked for provenance or fit).

## What phase 2 touches (after approval)

- Deep sky: `static/images/deep-sky/<key>.jpg` + `.thumb.jpg` + the 192 px WebP in `static/credit-thumbs/images/deep-sky/`, a row each in `static/data/deep-sky-image-sources.json` and `static/data/deep-sky.json`, and `photoKey` on the object in `static/data/universe/deep-sky-objects.json` (the galleries also grow: `/gallery/deep-sky` lists every photo; `_withPhoto` count in that file).
- Outer rows: a `panel-heroes.json` entry per row (`pictured: true` for part-of), or the deep-sky twin's `photoKey`.
- Stars: `static/images/stars/<id>/01.*` (the 10 existing folders hold `01-320.webp` and no `1x1`), credit and provenance rows, alt text in 14 locales, the pHash cache. The loaders (`src/lib/data/universe.ts`, `star-entity.ts`, `stars-hero-overrides.json`) were not traced in phase 1.
- Code: the thumb on `ScaleIndex` and the galaxy/structure Related lists (UXD-025 T2 left the slot out), then the manifests (`build-entity-thumbs`, offline manifest, mobile bundle size).
