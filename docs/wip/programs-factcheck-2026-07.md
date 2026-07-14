# /programs peer-review — full 42-program fact-check (July 2026)

Independent science review of every program editorial (`i18n-src/en-US/programs/{id}.json`)
+ base data (`static/data/programs/{id}.json`), run through the `science-reviewer`
agent. Each claim assumed wrong until a web/source check confirmed it. Findings by
severity: 🔴 ERROR (wrong fact — must fix) · 🟠 OVERREACH (claim > evidence) ·
🟡 UNSUPPORTED (needs source/softening) · 🔵 NIT (imprecision).

**Headline pattern:** the *robotic / science / launcher* editorials are museum-grade
clean. The *future / planned* programs (Artemis, Gaganyaan, ROS, commercial-stations,
Kuiper) and a few *superlative* claims carry the real errors — almost all from the
2026 present moving past the authoring date, or from "first/only" claims that a
non-US mission already beat.

Status: **review complete (42/42). No fixes applied yet — awaiting go.**

---

## 🔴 ERRORS — factually wrong, must fix before these ship

| # | Program | Claim (quote) | Fix | Source |
|---|---------|---------------|-----|--------|
| 1 | **artemis** | Artemis II framed as upcoming; Artemis III as the first crewed landing | STALE: Artemis II **flew Apr 2026**; post-Feb-2026 replan makes Artemis III a **LEO/lunar demo** and **Artemis IV the first landing**. Rework the roadmap. | NASA Artemis updates |
| 2 | **artemis** | (2nd staleness instance — milestone dates/sequence) | Refresh the whole flight manifest to the current plan. | NASA |
| 3 | **starship** | Starship as the sole/only Artemis human lander | No longer sole-source — Blue Moon (Blue Origin) is a competing HLS. Soften to "one of two". | NASA HLS |
| 4 | **tiangong** | "continuously crewed since June **2021**" | → **June 2022** (Shenzhou-14; continuous permanent crewing began then, not 2021). | CMSA |
| 5 | **tiangong** | "first single-country station since Skylab" | **False** — Mir (and the Salyut/Almaz line) were Soviet single-country stations. Cut or reframe. | Wikipedia Mir |
| 6 | **shenzhou** | base-data note "continuous occupation 2021" | → **2022**. | CMSA |
| 7 | **ariane** | JWST = Ariane 5's "final crowning payload" | **False** — Ariane 5's last flight was **VA261 (July 2023)** with Heinrich Hertz + Syracuse 4B. JWST (Dec 2021) was not the finale. | Arianespace |
| 8 | **voyager** | "the only two objects leaving the solar system" | **False** — five: Voyager 1/2, Pioneer 10/11, New Horizons. Reframe (e.g. "two of only five"). | NASA |
| 9 | **mariner** | "1962 and 1973" (Mariner span/dates) | Date error — Mariner program ran to **1973–75** (Mariner 10 = 1973 launch, 1974–75 ops). Verify the specific sentence. | NASA |
| 10 | **vostok** | Nedelin catastrophe / R-16 tied to Vostok | Misattribution — the Nedelin disaster (Oct 1960) was an **R-16 ICBM** (Yangel), not the Vostok/R-7 line (Korolev). Cut or correct. | Wikipedia |
| 11 | **viking** | Viking "first photograph from the surface of Mars" | **Mars 3 (USSR, 1971)** returned the first (partial) surface transmission. Qualify to "first *sustained/complete* images". | NASA / Wikipedia |
| 12 | **chandrayaan** | water "overturned in 2008" / "found lunar water (2008)" | Discovery **published Sept 2009** (mission *launched* 2008). Date the discovery to 2009. | Science 2009 |
| 13 | **gaganyaan** | base roster "First crewed flight 2026" + "mid-2020s" | STALE — slipped to **Q1 2027** (ISRO, May 2026); G1 uncrewed itself now H2 2026. Update roster year + "mid-2020s" line. | Space.com |
| 14 | **ros** | base "First module 2027" / start_year 2027 | STALE — after the **Dec 2025 architecture reversal**, first module (UUM) is **late 2028**, NEM 2029. | Wikipedia ROS |

---

## 🟠 OVERREACH — claim stronger than the evidence

- **apollo** — Saturn V "the most powerful rocket ever to fly": present-tense superlative now contested by SLS Block 1 (more thrust at liftoff by some measures) and Starship. Reframe to past-tense/qualified ("the most powerful rocket to carry humans", or "for over 50 years").
- **tiangong** — station mass stated ~100 t; actual assembled mass ≈ **66–70 t** (three-module) / ~90 t with visiting vehicles. Correct the figure.
- **shenzhou** — "before 2030" crewed-Moon → CMSA's own phrasing is "**by 2030**".
- **starship** — currency drift: booster catch is now a *repeated* achievement; Starlink-class payload deploy has happened. Refresh "will" → "has".
- **kuiper** — rebranded **"Amazon Leo" (Nov 2025)**; the "half by July 2026" FCC deadline was **waived (June 2026)**. Update name + deadline framing.
- **buran** — "no main engines": → "no main *ascent* engines" (it had OMS). "Energia the most powerful ever" superlative — qualify.
- **mangalyaan** — "India reached Mars on its first attempt — something **no nation had ever done**" + "**Europe** … crashed, missed, or fell silent on their early attempts": backwards — **ESA's Mars Express orbiter succeeded on its first attempt (2003)**. Reframe to "first *country* (vs multinational ESA)" and drop Europe from the failers list (only Beagle 2 lander failed).
- **mangalyaan** — "first Asian nation to reach Mars **at all**" → "first Asian nation to reach Mars **orbit**" (Japan's Nozomi was an earlier Asian Mars *attempt*).
- **chandrayaan** — water discovery credited solely "to ISRO" / "it came from ISRO": the detecting instrument was **NASA/JPL's Moon Mineralogy Mapper (M3)** flown on the ISRO platform. Credit the platform to ISRO but name M3 as a NASA payload (neutrality).
- **commercial-stations** — Axiom "attach modules to the ISS then detach": superseded **Dec 2024** — Axiom now assembles as an **independent free-flyer** (only the first module docks briefly). Reframe.
- **jwst** — "roughly 344 'single-point failures': deployments": conflates all 344 SPF with deployment steps; **~80%** were deployment-related. Reword; drop "roughly" before the exact 344.
- **ros** — "high-inclination, near-polar orbit … passes over the Arctic every revolution": **reversed Dec 2025** — assembling on the ISS forces the **51.6°** ISS plane, not near-polar. Frame the ~98° rationale as the *original* plan.
- **ros** — "a Russian station, in a Russian orbit … answerable to no partner" / "fly alone": contradicted by the current build-on-ISS plan. Soften to intent/end-state.
- **ros** — Salyut/Mir "entirely their own": glosses Shuttle-Mir (NASA module/astronauts). Trim "entirely their own"; keep "Mir, the first modular station".
- **change** — "the hemisphere that never faces Earth": far-side phrasing is load-bearing across 5 blocks; fine but watch a reader inferring the *whole* back half is permanently unseen. Low priority.

---

## 🟡 UNSUPPORTED / 🔵 NIT — per-program (softening or precision only)

- **great-observatories** — 🟡 Roman FOV "a hundred times Hubble's" → NASA cites **~200×** (100× is a floor). 🔵 Roman launch 2027 vs current NLT **2026** target.
- **jwst** — 🟡 "within a single vote of collapsing" (no source for a single-vote margin; it was an appropriations-committee process) → soften/cut. 🟡 "for twenty-five years … late, expensive, nearly cancelled" overstates the calm early phase. 🔵 all core facts (25 Dec 2021, Ariane 5 VA256, 6.5 m, L2, ~$10 B, July 2022 first images) verified clean.
- **hayabusa** — 🟡 OSIRIS-REx "flew in dialogue with the Hayabusa team" (soft; real link is sample exchange). 🔵 "a few thousand … grains" → ~**1,500** (Itokawa). 🔵 "reaction wheels failed" → **2 of 3**.
- **jaxa-robotic** — 🟡 Kaguya "most detailed lunar survey since Apollo" outdated by **LRO (2009)** → "largest since Apollo" (matches base data) or "until LRO". 🔵 "first HD Earthrise since Apollo" (Apollo shot film, not HD) → drop "since Apollo". 🔵 Akatsuki main engine "ruptured" → **failed** (clogged valve → cracked nozzle throat). 🔵 SLIM "within metres" → **~55 m** achieved (100 m was the goal).
- **esa-science** — 🟡 Gaia "positions and motions of nearly two billion stars": ~1.8 B *positions* but ~**1.46 B** with proper motions → "positions of nearly two billion" or "motions of more than a billion". 🔵 Rosetta "billion-kilometre chase" → **6.4 billion km**. Watch-item: Gaia science ops **ended Jan 2025** (prose is present-tense; defensible for the archive but could read as "still observing").
- **change** — 🟡 Chang'e 6 "may finally explain why the hemispheres differ": samples *constrain* rather than resolve; hedge is present, keep hedged. 🔵 "before 2030" → "by 2030". Chang'e 5 "first samples in 44 years" (2020−1976) verified exact.
- **chandrayaan** — 🟡 water "across wide areas" was latitude-dependent (polar-weighted). 🔵 Luna-25 "same region" (Boguslawsky ~72.9°S vs Shiv Shakti 69.4°S — both south-polar, defensible). "Fourth country to land on the Moon", "first near the south pole" (consistently qualified "near"), Chandrayaan-2 orbiter still operating — all verified clean.
- **mangalyaan** — 🔵 "~$74 M" (₹450 cr), "less than the film *Gravity*", "fraction of MAVEN", "roughly eight years" (7 yr 6 mo), end 2022 — all verified clean.
- **commercial-stations** — 🟡 roster dates lag: Axiom → **2027**, Starlab → **2029**. 🟡 **Haven-1 (Vast)** omitted — the likely first-mover (Q1 2027), should be in the roster. 🔵 start_year 2025 vs CLD awards 2021.
- **gaganyaan** — 🔵 fleet cross-link "year 2025" (no orbital hardware flew in 2025). 🔵 "a few days" vs ~48 h debut. "Fourth nation" framing, LVM3, TV-D1 Oct 2023, 400 km — verified clean.
- **ros** — 🔵 "Announced 2022" (Borisov's "after 2024" was walked back to the **2028** ISS commitment). "Nine years" Soyuz-only (2011→2020) — verified correct.

---

## Verified CLEAN / SHIP (no material findings)

iss · spacex · starlink · esa-human · buran (minor) · **change** · **great-observatories**
· **hayabusa** · **esa-science** · (plus the wave-1 deep-space set that passed).
These need at most a NIT touch, not a fix.

---

## Recommended fix order

1. **The 14 🔴** — non-negotiable factual corrections. Group by file; most are one-line
   edits (dates, a superlative, a rebrand). Artemis + ROS need a small paragraph rework
   (staleness against a changed plan), not a one-liner.
2. **The 🟠 superlative/attribution set** — Mangalyaan "no nation ever", Chandrayaan M3
   credit, Apollo Saturn V, Tiangong mass, commercial-stations Axiom architecture.
   These are the museum-neutrality / overreach fixes.
3. **🟡/🔵** — sweep in the same pass per file (cheap once the file is open).
4. Re-run the changed prose through `science-reviewer` (spot-check the 🔴 files), then
   `npm run preflight`. English-first exemption already covers `essays/`; program edits
   are English-source too but the other 13 locales already exist — **translation drift**:
   fixing en-US prose means the 13 locale overlays now disagree. Decide per-fix whether
   to re-translate the touched blocks (script) or accept en-US-ahead until a batch
   i18n pass.

**Open question for Marko:** apply all tiers now, or 🔴+🟠 only and defer 🟡/🔵? And
handle the 13-locale re-translation of corrected blocks now or in a batched i18n pass?
