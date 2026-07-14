# Science-reviewer factcheck — SCIENCE / observation overlays

Reviewer: independent skeptical fact-check. Source of truth = `i18n-src/en-US/science/observation/<slug>.json`.
Web-verified July 2026. **No edits made** — findings only.

Severity legend: 🔴 factually wrong / misleading · 🟠 overstated certainty or contested-as-settled · 🟡 imprecise / debatable · 🔵 nitpick / stylistic.

## Per-overlay verdicts

| Overlay | Verdict | Highest sev |
|---|---|---|
| _intro | Clean | — |
| adaptive-optics | Clean (1 nitpick) | 🔵 |
| andromeda-galaxy | Issues | 🟠 |
| black-holes | Clean (1 nitpick) | 🔵 |
| coronagraphs | Clean | — |
| dwarf-spheroidals | Clean | — |
| galaxy-types | Minor | 🟡 |
| interferometry | Clean (1 nitpick) | 🔵 |
| local-group | Issues | 🟠 |
| magellanic-clouds | Minor | 🟡 |
| space-photography | Clean | — |
| spectroscopy | Clean | — |
| wormholes | Clean — exemplary framing | — |

**Totals: 🔴 0 · 🟠 3 · 🟡 3 · 🔵 4** (10 findings across 13 overlays)

The two substantive issues both concern the **Milky Way–Andromeda merger stated as a settled certainty** — the 2024/2025 Sawala et al. (Nature Astronomy) result put it at ~50/50. This appears in both `andromeda-galaxy` and `local-group`.

---

## _intro

No factual claims to flag. "shadow-images of two of them" (M87*, Sgr A*) is correct. "Wormholes are pure mathematics" framing is accurate and well-judged. **Verdict: clean.**

---

## adaptive-optics

- 🔵 **Nitpick — field: body_paragraphs[3]**
  Quote: *"The longest-wavelength bands (mid-IR, sub-mm) can be done from the ground with AO and rival space telescopes."*
  Comment: AO is genuinely easier at longer IR wavelengths (longer coherence time / larger isoplanatic patch — correctly stated). But sub-mm imaging from the ground (ALMA etc.) is not typically an "adaptive optics" regime — it's phase correction / interferometry, not deformable-mirror AO. Minor conflation; the physics direction (longer λ = easier correction) is right.
  Confidence: medium.

All core mechanism claims verified: seeing limit ~1″, Hubble diffraction limit ~0.05″ (correct for optical), sodium laser guide star at the sodium layer (~90 km), deformable mirror at ~1 kHz, Keck/VLT/Gemini/Subaru/ELTs all use AO. **Verdict: clean.**

---

## andromeda-galaxy

- 🟠 **Overstated certainty — field: intro_sentence & body_paragraphs[1] & diagram_caption**
  Quote: *"the two galaxies will start tidal disruption in about 4.5 billion years, with the central merger taking another 2 billion years… confirmed in 2019 by Gaia DR2 / DR3, is that it is on a near-head-on trajectory"*
  What's wrong: The collision is presented as an established certainty ("will start", "near-head-on"). The 2024/2025 study **Sawala et al., "No certainty of a Milky Way–Andromeda collision," Nature Astronomy (2025)** — including M33 and the LMC in the orbit integration — found only a **~50% probability of a merger within the next ~10 Gyr**, and roughly 2% within 4–5 Gyr. The 2012/2019 HST+Gaia "head-on, certain" picture is no longer the consensus.
  Correction: Frame as "long thought certain; a 2024 analysis including M33 + LMC lowered it to roughly even odds." Keep the ~4.5 Gyr figure but as *if* it happens.
  Source: https://www.nature.com/articles/s41550-025-02563-1 · https://esahubble.org/news/heic2508/ · arXiv:2408.00064
  Confidence: high.

- 🟡 **Contested-as-settled — field: intro_sentence & body_paragraphs[0]**
  Quote: *"Andromeda — catalogued as M31… is a barred spiral galaxy"*
  What's wrong: M31's bar is **not settled**. The formal RC3 classification (de Vaucouleurs 1991) is **SA(s)b — unbarred**. Photometric/kinematic evidence for a bar exists but "M31 is a barred spiral" is stated more firmly than the literature supports; visually it appears unbarred. `galaxy-types` also asserts "The Milky Way and Andromeda are both barred spirals."
  Correction: "a spiral galaxy (with kinematic evidence for a weak inner bar)" is safer.
  Source: https://en.wikipedia.org/wiki/Andromeda_Galaxy · arXiv:1707.06652 (non-axisymmetry in M31)
  Confidence: medium-high.

- 🔵 **Nitpick — field: body_paragraphs[0]**
  Quote: *"the most distant object the human eye can perceive without instruments, at about 2.5 million light-years"*
  Comment: Popular framing, but **M33 (Triangulum, ~2.7–3 Mly)** is genuinely naked-eye under exceptional dark skies and is farther. Some sources also cite naked-eye supernovae / the occasional quasar. "One of the most distant" or "the most distant object *most* people can see" would be more defensible. Low priority — the 2.5 Mly distance itself is correct.
  Source: https://en.wikipedia.org/wiki/Triangulum_Galaxy
  Confidence: medium.

Verified-correct in this overlay: distance 2.5 Mly ✓; approach velocity 110 km/s (radial) ✓; Slipher 1912 first galaxy blueshift at Lowell ✓; M31 nuclear black hole ~1.4×10⁸ M☉ ✓ (matches recent measurement); Sgr A* 4.3×10⁶ M☉ ✓; M32 / M110 companions ✓; ~trillion stars ✓; "Milkomeda" ✓.

---

## black-holes

- 🔵 **Nitpick — field: body_paragraphs[2]**
  Quote: *"the Event Horizon Telescope … imaged the shadow of M87's black hole in 2019 and Sgr A* in 2022"*
  Comment: Correct as stated (M87* image *released* April 2019 from April-2017 data; Sgr A* released May 2022). Just flagging that a reader might conflate "2019" with the observation date (2017) — the release-date phrasing is fine.
  Confidence: high (no error).

All verified: r_s = 2GM/c² ✓; Sun r_s ≈ 3 km ✓; Earth r_s ≈ 9 mm ✓; SMBH range 10⁶–10¹⁰ M☉ ✓; Sgr A* 4×10⁶ M☉ ✓ (4.297M); Nobel 2020 (Genzel/Ghez, Sgr A* stellar orbits) ✓; EHT = 8 sub-mm observatories ✓; photon sphere r = 1.5 r_s ✓; G value ✓; 1 kg r_s ≈ 1.5×10⁻²⁷ m ✓ (smaller than a proton ✓). **Verdict: clean.**

---

## coronagraphs

All verified: star/planet contrast ~10⁹ visible, ~10⁶ IR ✓; Lyot coronagraph **1930**, Bernard Lyot, solar corona ✓; two-stage Lyot mask design ✓; vortex/apodized-pupil to 10⁻⁹ ✓; JWST NIRCam + MIRI coronagraphs ✓; Roman Coronagraph as HWO tech demo ✓; starshade 30+ m, formation-flying, none flown ✓. **Verdict: clean.**

---

## dwarf-spheroidals

All verified: dSph = most numerous + most DM-dominated ✓; M/L ratios 30 (bright) to 500–3000 (ultra-faint) ✓; Aaronson 1983 Draco/Ursa Minor velocity dispersions ✓; ΛCDM hierarchical formation ✓; core-cusp + too-big-to-fail as open problems ✓; Sagittarius dSph ~22–26 kpc, stream constrains halo shape ✓; alternative-DM list (warm/SIDM/fuzzy/PBH) ✓; >60 known MW satellites ✓ (rising with Rubin/LSST). **Verdict: clean** — unusually strong overlay.

---

## galaxy-types

- 🟡 **Contested-as-settled — field: body_paragraphs[0]**
  Quote: *"The Milky Way and Andromeda are both barred spirals"*
  Same issue as andromeda-galaxy: **the Milky Way's bar is well established, but M31's is not** (formal type SA(s)b, unbarred). "Both barred" overstates M31. See andromeda-galaxy finding for source.
  Confidence: medium-high.

- 🔵 **Nitpick — field: body_paragraphs[0]**
  Quote: *"The third Hubble category — Sc / SBc — has loose, well-separated spiral arms; the Milky Way is type SBbc or SBc."*
  Comment: MW is usually cited as **SBbc** (intermediate); "SBc" is the looser-armed end and slightly overstates arm openness. Minor — SBbc is already given as the primary.
  Confidence: medium.

Verified: density-wave arms ✓; ~2/3 of bright galaxies are spirals ✓; M33 unbarred spiral ✓; ellipticals dispersion-supported, merger products ✓; M87 in Virgo, first-imaged SMBH ✓; NGC 4889 cD in Coma ✓; Local Group ellipticals = M32/M110/NGC 147/NGC 185 ✓; irregulars gas-rich star-forming ✓; ultra-faints since ~2005, <10⁵ L☉ ✓; starburst M82 / Hoag ring / UDGs (DF2, Dragonfly 44) ✓; Hubble 1936 (actually the tuning-fork refinement; "Realm of the Nebulae" 1936) ✓. **Verdict: minor.**

---

## interferometry

- 🔵 **Nitpick — field: body_paragraphs[2] & diagram_caption**
  Quote: *"Event Horizon Telescope linked 8 sub-mm observatories across 4 continents… 20 microarcsecond resolution"*
  Comment: EHT is often described as 8 stations across which is right; "4 continents" is defensible (N. America, S. America, Europe, Antarctica — arguably Antarctica counts). M87 ring diameter ~42 µas, nominal EHT resolution ~20–25 µas — the "20 µas" figure is fine. No error.
  Confidence: high (no error).

Verified: resolution ∝ λ/D ✓; N(N−1)/2 baselines ✓; correlation/phase-delay mechanism ✓; VLA 27 antennas NM ✓; ALMA 66 antennas Chile sub-mm ✓; EHT 1.3 mm, Earth-diameter ✓; optical interferometry ~nm path-matching, CHARA/NPOI/VLTI ✓; LISA laser arms, 3 spacecraft ✓. **Verdict: clean.**

---

## local-group

- 🟠 **Overstated certainty — field: body_paragraphs[3] & diagram_caption**
  Quote: *"In about 4.5 billion years the Milky Way and Andromeda **will** pass close enough to begin tidal disruption — the so-called 'Milkomeda' merger… refined by Gaia DR3 proper-motion measurements (van der Marel et al. 2019). The merger will take perhaps 2 billion years to complete…"*
  What's wrong: Same as andromeda-galaxy — merger presented as certain. **Sawala et al. (Nature Astronomy 2025)** downgraded it to ~50/50 once M33 and the LMC are included. The van der Marel 2019 "certain merger" picture is superseded.
  Correction: "may pass close enough… a 2024 analysis put the odds at roughly even." Cox & Loeb (2008) + van der Marel citations are fine as history.
  Source: https://www.nature.com/articles/s41550-025-02563-1 · arXiv:2408.00064
  Confidence: high.

- 🟡 **Imprecise — field: intro_sentence vs body_paragraphs[1]**
  Quote: intro says *"about 3 megaparsecs across"*; body says the zero-velocity boundary is *"roughly 1.5 Mpc from the … barycentre."*
  Comment: These are consistent (radius 1.5 Mpc → diameter 3 Mpc) — good. But note the Local Group's commonly cited diameter is ~3 Mpc / ~10 Mly, and membership counts vary (the "~80 known" is reasonable but rising fast; some catalogs list 100+). Not an error, just flag that "~80" will date quickly.
  Confidence: high.

Verified: 3 dominant spirals (MW/M31/M33) ✓; ~110 km/s MW–M31 approach ✓; zero-velocity surface ~1.5 Mpc ✓; Sculptor/Maffei/M81/CenA groups within ~4 Mpc, not members ✓; Cepheid distance-ladder starts in M31/M33/LMC ✓; Sagittarius stream mapped star-by-star ✓; Cox & Loeb 2008 Milkomeda ✓. **Verdict: issues (merger certainty only).**

---

## magellanic-clouds

- 🟡 **Imprecise — field: body_paragraphs[1]**
  Quote: *"supernova 1987A — the closest naked-eye supernova since Kepler's in 1604"*
  What's wrong: SN 1987A was the **brightest / closest supernova since Kepler 1604**, but **not** the closest *naked-eye* one since then — **SN 1885A (S Andromedae)** in M31 was naked-eye (peak mag ~6) and occurred in 1885, well after Kepler. The precise, standard framing is "brightest since Kepler 1604" and "first naked-eye since 1885." The overlay's diagram_caption gets it right ("closest naked-eye supernova since Kepler 1604") — same slip.
  Correction: "the brightest supernova since Kepler's in 1604 (and the first visible to the naked eye since 1885)."
  Source: https://en.wikipedia.org/wiki/SN_1987A · https://earthsky.org/space/supernova-1987a-closest-brightest-supernova-star-death/
  Confidence: high.

- 🔵 **Nitpick — field: body_paragraphs[1]**
  Quote: *"R136a1 is around 200 solar masses"*
  Comment: Correct and commendably up-to-date — the 2022 Zorro/Gemini revision put it at ~196 M☉ (down from the 2010 ~265–320 M☉ figure). Flagging only because older sources say 300+; the overlay uses the current value. No change needed.
  Confidence: high.

Verified: LMC 49.97 kpc / SMC 62.1 kpc ✓ (both current eclipsing-binary values); LMC ~10¹⁰ M☉ (~1% of MW) ✓; Tarantula/30 Dor + R136 ✓; SN 1987A neutrinos: Kamiokande 11 + IMB 8 + Baksan 5 = 24, "about 25" ✓; Magellan 1519–22 ✓; Kallivayalil et al. 2013 first-passage (too fast to be long-bound) ✓; Magellanic Stream ✓; Rubin/LSST first light 2025 ✓; circumpolar from mid-southern latitudes ✓. **Verdict: minor.**

---

## space-photography

All verified: stacking / registration / cosmic-ray rejection pipeline ✓; narrow-band filters, Hα 656.3 nm, [O III] 500.7 nm ✓; Hubble Palette (SII→R, Hα→G, OIII→B) ✓ (the "SHO" mapping); JWST MIRI false-colour ✓; MAST archive ✓. "twelve observatories" list (Hubble, JWST, Chandra, Spitzer, Kepler, TESS, Gaia, Euclid, XMM-Newton, Spektr-RG, Compton GRO, Hitomi) is internally consistent — content claim, not a physics claim. **Verdict: clean.**

---

## spectroscopy

All verified: element-specific absorption lines ✓; Fraunhofer **574 lines, 1814** ✓; Sun 73% H / 25% He / 2% metals by mass ✓ (rounded but standard — modern 3D values ~74/24/1.4, so this is the classic textbook figure, acceptable); R = λ/Δλ ✓; ESPRESSO R~140,000, cm/s reflex velocities ✓; JWST NIRSpec R~2700 ✓ (mode-dependent, in range); Doppler/Zeeman/continuum-temperature/line-profile info content ✓; transit transmission spectroscopy for exoplanet atmospheres ✓. **Verdict: clean.**

---

## wormholes

**Exemplary.** Every claim correctly framed as theoretical/speculative — exactly the brief.
Verified: Einstein–Rosen bridge **1935** ✓; non-traversable Schwarzschild interior ✓; term "wormhole" (Wheeler/Misner 1957 — not claimed here, fine); traversable wormholes need negative-energy exotic matter, **Thorne/Morris 1980s** ✓ (Morris–Thorne 1988); Hawking's objection that quantum effects destabilize them ✓; "no candidates, no lensing signature observed" ✓; ER=EPR / AdS-CFT as live frontier ✓. Framing repeatedly and unambiguously states "none observed, none flyable." **Verdict: clean — model overlay for how to handle speculative physics.**

---

*factcheck · science/observation · 13 overlays · 0🔴 3🟠 3🟡 4🔵 · July 2026*
