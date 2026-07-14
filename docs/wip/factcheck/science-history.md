# Fact-check — SCIENCE / history overlays

Reviewer: science-reviewer (independent, adversarial). Date: 2026-07-14.
Scope: `i18n-src/en-US/science/history/<slug>.json` + base `static/data/...` where present.
Method: every claim assumed wrong until web-verified.

Severity legend: 🔴 ERROR · 🟠 OVERREACH · 🟡 UNSUPPORTED · 🔵 NIT

## Per-overlay verdicts

| Overlay | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| _intro | PASS | 0 | 0 | 0 | 1 |
| apollo-11-1969 | PASS w/ notes | 1 | 1 | 0 | 1 |
| goddard-liquid-rocket-1926 | ERROR | 1 | 0 | 0 | 1 |
| keplers-laws-1609 | OVERREACH | 0 | 2 | 0 | 1 |
| newton-principia-1687 | PASS w/ notes | 0 | 1 | 1 | 1 |
| sputnik-1957 | ERROR | 1 | 0 | 0 | 1 |
| tsiolkovsky-equation-1903 | OVERREACH | 0 | 1 | 0 | 1 |
| **TOTAL** | | **3** | **5** | **1** | **7** |

Total findings: **16** (3 ERROR · 5 OVERREACH · 1 UNSUPPORTED · 7 NIT).

---

## _intro

🔵 NIT — `_intro.json` › paragraphs[1]
Quote: "We've cherry-picked six pivots."
The history tab contains **seven** overlays (`_intro` aside): apollo-11, goddard,
keplers-laws, newton, sputnik, tsiolkovsky = six *milestone* entries. Six is
correct if `_intro` is excluded from the count — but the six are Kepler, Newton,
Tsiolkovsky, Goddard, Sputnik, Apollo, i.e. the intro's own opening list names
**five** ("Kepler's ellipses, Newton's gravity, Tsiolkovsky's rocket equation,
Goddard's first liquid burn, Korolev's R-7") and omits Apollo. Internally
consistent count-wise (6 overlays) but the prose list undercounts. Low-stakes.
Confidence: high (file inventory).

---

## apollo-11-1969

Verified OK: JFK May 25 1961 speech wording ✓; landing 20:17 UTC July 20 ✓;
first step 02:56 UTC July 21 ✓; splashdown July 24 ✓; duration 8d 3h 18m ✓
(actual 8d 3h 18m 35s); Saturn V 110 m / 5× F-1 / 7.6 Mlbf ✓; free-return for
Apollo 11 ✓ (Apollo 8/10/11 flew true free-return; 12+ went hybrid); Apollo 13
free-return loop, no lunar orbit ✓; last man Cernan Dec 14 1972 ✓; six landings
11/12/14/15/16/17 ✓.
Sources: https://en.wikipedia.org/wiki/Apollo_11 ·
https://airandspace.si.edu/explore/stories/apollo-missions/apollo-11-moon-landing/apollo-11-timeline ·
https://en.wikipedia.org/wiki/Free-return_trajectory

🔴 ERROR — `apollo-11-1969.json` › body_paragraphs[0]
Quote: "Still the most powerful rocket to fly successfully (until SLS Block 1 /
Starship matched or exceeded it 50+ years later)."
Ambiguity/overstatement: by liftoff thrust, SLS Block 1 (~8.8 Mlbf) and Starship
(~16 Mlbf) exceed Saturn V; but Saturn V remains the most powerful rocket to
deliver **payload to TLI / fly a fully successful crewed mission**. The paren is
defensible on thrust but the "matched or exceeded" for SLS on *capability* is
loose — SLS Block 1 has lower payload-to-LEO than Saturn V. Recommend tightening
to "highest-thrust until SLS/Starship" or specify metric. Confidence: medium
(claim is metric-dependent, currently reads as unqualified superlative).

🟠 OVERREACH — `apollo-11-1969.json` › narrative_101[0]
Quote: "the programme cost ~$25 billion (1969 dollars), about 4% of the federal
budget at peak."
The ~$25.4 B figure is the **total Apollo program cost through 1973** (nominal,
not "1969 dollars"). NASA's budget peaked at ~4.4% of the federal budget in 1966;
Apollo itself was a large share of that. Conflating "$25 B (1969 dollars)" with
"4% of budget at peak" mixes a cumulative total with a single-year ratio.
Correction: "~$25.4 B total (1960–1973, nominal); NASA peaked at ~4.4% of the
federal budget in 1966." Confidence: high.
Source: https://en.wikipedia.org/wiki/Apollo_program (Cost section).

🔵 NIT — `apollo-11-1969.json` › narrative_101[2]
Quote: "watched live by an estimated 600 million people."
Widely cited but an estimate; ranges 500–650 M appear in sources. "Estimated"
already hedges it. Acceptable. Confidence: high.

---

## goddard-liquid-rocket-1926

Verified OK: March 16 1926 ✓; Auburn MA (Aunt Effie Ward's farm — see NIT) ✓;
2.5 s flight ✓; 41 ft (12.5 m) altitude ✓; 184 ft downrange ✓; LOX + gasoline ✓;
"Nell" ✓; Esther Goddard photographed ✓; 1920 NYT mockery ✓; Roswell flights,
1.7 mi Mar 1937 ✓; Goddard Space Flight Center 1959 ✓.
Sources: https://www.nasa.gov/history/95-years-ago-goddards-first-liquid-fueled-rocket/ ·
https://airandspace.si.edu/stories/editorial/robert-goddard-and-first-liquid-propellant-rocket ·
https://en.wikipedia.org/wiki/Robert_H._Goddard

🔴 ERROR — `goddard-liquid-rocket-1926.json` › narrative_101[0]
Quote: "The Times retracted in 1969, three days after Apollo 11 launched."
The NYT correction ran **July 17, 1969 — the day after** the July 16 launch, not
three days. Correction: "the day after Apollo 11 launched" (or "as Apollo 11 was
en route to the Moon"). Confidence: high.
Source: https://www.forbes.com/sites/kionasmith/2018/07/19/the-correction-heard-round-the-world-when-the-new-york-times-apologized-to-robert-goddard/

🔵 NIT — `goddard-liquid-rocket-1926.json` › narrative_101[1] & body_paragraphs[0]
Quote: "on his Aunt Marion's farm" / "Aunt Marion Goddard's farm, Auburn."
The 1926 launch site is standardly given as the farm of his **Aunt Effie Ward**
("Effie", not "Marion"). Multiple sources name Effie Ward; "Aunt Marion" appears
unsupported. Verify against NASM/NASA; likely a name error. Confidence: medium
(sources consistently say Effie Ward, but a couple of secondary sources vary).
Source: https://airandspace.si.edu/stories/editorial/robert-goddard-and-first-liquid-propellant-rocket

---

## keplers-laws-1609

Verified OK: three laws stated correctly (ellipse/focus; equal areas; T²∝a³) ✓;
Astronomia Nova 1609 = Laws 1+2 ✓; Harmonices Mundi 1619 = Law 3 ✓; Newton
supplied the "why" ~70 yr later ✓; Mars eccentricity 0.0934 ✓ (Kepler derived
0.09264, modern 0.0934); Brahe ~1 arcmin precision ✓; Galileo's telescope 1609 ✓.
Sources: https://en.wikipedia.org/wiki/Kepler%27s_laws_of_planetary_motion ·
https://en.wikipedia.org/wiki/Astronomia_nova ·
https://www.astronomy.ohio-state.edu/pogge.1/Ast161/Au06/Unit3/watershed.html

🟠 OVERREACH — `keplers-laws-1609.json` › narrative_101[0]
Quote: "Tycho Brahe spent 30 years at the Uraniborg observatory on Hven."
Uraniborg operated ~1576–1597 (Brahe left Hven in 1597) — **~20–21 years**, not
30. His total observing career was ~38 years but Hven/Uraniborg was ~20.
Correction: "~20 years at Uraniborg on Hven." Confidence: high.
Source: https://en.wikipedia.org/wiki/Uraniborg ·
https://www.cabinet.ox.ac.uk/hven-1576-97-tycho-brahes-observatory

🟠 OVERREACH — `keplers-laws-1609.json` › narrative_101[0]
Quote: "He died in 1601 having published almost nothing."
Brahe published substantially: *De Nova Stella* (1573), *Astronomiae Instauratae
Mechanica* (1598), *Astronomiae Instauratae Progymnasmata* (posthumous 1602,
prepared by him), and a ~1000-star catalog. "Almost nothing" is false — the point
is he didn't publish his **Mars planetary theory / full reduced dataset**.
Correction: "having published little of his planetary results" or "leaving his
Mars data unreduced." Confidence: high.
Source: https://en.wikipedia.org/wiki/Tycho_Brahe

🔵 NIT — `keplers-laws-1609.json` › body_paragraphs[1]
Quote: "Newton would supply the why 70 years later."
1687 − 1609 = 78; 1687 − 1619 = 68. "70 years later" is a round approximation
from Law 3 (1619). Fine as prose. Confidence: high.

---

## newton-principia-1687

Verified OK: Halley/Wren/Hooke 1684 episode ✓; Newton answered "ellipse" ✓;
Halley funded printing, Royal Society broke after *De Historia Piscium* (History
of Fishes, 1686) ✓; three laws + F=Gm₁m₂/r² ✓; three books (motion in free
spaces; resisting media; system of the world) ✓; fluxions vs Leibniz priority ✓;
G ≈ 6.674×10⁻¹¹ ✓; formula_latex correct.
Sources: https://en.wikipedia.org/wiki/Philosophi%C3%A6_Naturalis_Principia_Mathematica ·
https://www.astronomy.com/today-in-the-history-of-astronomy/july-5-1687-newtons-principia-is-published/ ·
https://royalsociety.org/blog/2014/07/principia/

🟠 OVERREACH — `newton-principia-1687.json` › narrative_101[1] and title
Quote: title "Newton's Principia · 1687"; body "published July 1687."
The 1st edition was published **5 July 1687** (registered/licensed 1686; printed
copies mid-1687). "July 1687" ✓ but note some sources give the presentation date
as summer 1687; the precise "July 5" is the standard date and would be stronger.
Minor. Also: the intro_sentence + body frame everything on the 1687 edition — see
the UNSUPPORTED note below re "Hypotheses non fingo." Confidence: high.

🟡 UNSUPPORTED — `newton-principia-1687.json` › body_paragraphs[2]
Quote: "His own famous comment: \"Hypotheses non fingo\" — \"I feign no
hypotheses.\""
Presented inside an overlay titled "Principia · 1687," implying it's from the
1687 work. The phrase is from the **General Scholium, added only in the 1713
second edition** — it does not appear in the 1687 first edition. Not wrong that
Newton wrote it, but the 1687 framing is misleading. Recommend "added to the 1713
edition" or drop the date implication. Confidence: high.
Source: https://en.wikipedia.org/wiki/Hypotheses_non_fingo ·
https://en.wikipedia.org/wiki/General_Scholium

🔵 NIT — `newton-principia-1687.json` › narrative_101[2] & body_paragraphs[2]
Quote: "The mechanism would wait for Einstein in 1915."
General relativity's field equations are 1915 ✓; fine. (The *explanation* of
gravity's mechanism is arguably still open, but 1915 GR is the standard answer.)
Confidence: high.

---

## sputnik-1957

Verified OK: Oct 4 1957 ✓; R-7 (Semyorka), world's first ICBM, repurposed ✓;
58 cm sphere, four antennas ✓; beep at 20 & 40 MHz ✓; perigee 215 km / apogee
939 km / incl 65° / period 96 min ✓; reentry Jan 4 1958, ~1440 orbits, ~92 days ✓;
Korolev "Chief Designer" secret until 1966 obituary ✓; Vanguard TV-3 exploded Dec
1957 ✓; Explorer 1 Jan 31 1958 ✓; NASA founded 1958 ✓; ARPA 1958 ✓; 84 kg
(actual 83.6 kg, rounding OK) ✓; Soyuz lineage from R-7 ✓.
Sources: https://en.wikipedia.org/wiki/Sputnik_1 ·
https://space.skyrocket.de/doc_sdat/sputnik-1.htm ·
https://www.nasa.gov/history/story-of-explorer-1/

🔴 ERROR — `sputnik-1957.json` › narrative_101[1]
Quote: "His engineering team launched a 1.5-ton biological satellite (Sputnik 2,
with the dog Laika) one month later."
Sputnik 2's payload/capsule massed **~508 kg (~0.5 t)**, not 1.5 t. The only
"tonnage" that reaches ~7.8 t is the **total mass in orbit including the R-7 core
stage** (Sputnik 2 didn't separate). Neither figure is 1.5 t. Correction: "a
~500 kg biological satellite" (or "~7.8 t total in orbit, un-separated"). "One
month later" ✓ (Nov 3 1957). Confidence: high.
Source: https://en.wikipedia.org/wiki/Sputnik_2 ·
https://space.skyrocket.de/doc_sdat/sputnik-2.htm

🔵 NIT — `sputnik-1957.json` › narrative_101[0] and body_paragraphs
Quote: "Baikonur Cosmodrome, Kazakh SSR."
Anachronism: in 1957 the site was **NIIP-5 / Tyuratam**; the name "Baikonur
Cosmodrome" is the standard retrospective name (and the Soviets deliberately
mislabeled the location "Baikonur" as disinformation). Museum-neutral and
technically fine to use the modern name, but a purist would note it wasn't called
that in 1957. Confidence: high.
Source: https://en.wikipedia.org/wiki/Baikonur_Cosmodrome

---

## tsiolkovsky-equation-1903

Verified OK: rocket equation Δv = vₑ·ln(m₀/m₁) ✓ (formula_latex correct);
mass-ratio/log intuition ✓; escape velocity 11.2 km/s, vₑ≈4.4 → ratio ≈13 ✓
(e^(11.2/4.4)=e^2.545≈12.7); Saturn V ~85% propellant ✓; Kaluga schoolteacher,
deaf from scarlet fever at ~10 ✓; 1903 publication ✓; died 1935 ✓; predicted
liquid fuels, multistaging, orbital stations ✓; Tsiolkovsky crater on lunar far
side ✓; Kaluga house museum ✓.
Sources: https://en.wikipedia.org/wiki/Konstantin_Tsiolkovsky ·
https://en.wikipedia.org/wiki/Tsiolkovsky_rocket_equation ·
https://en.wikipedia.org/wiki/Tsiolkovskiy_(crater)

🟠 OVERREACH — `tsiolkovsky-equation-1903.json` › narrative_101[2]
Quote: "He died in 1935, two years before Goddard's first liquid-fuel test
reached real altitude."
Conflation: Goddard's **first** liquid-fuel flight was 1926 (during Tsiolkovsky's
life). The "two years after his death" event is Goddard's **highest** flight
(~1.7 mi, Mar 1937) — his *first* test was 11 years earlier. As written it
implies Goddard's first liquid test post-dated Tsiolkovsky by 2 years, which is
false and contradicts this very overlay's own body ("Goddard would build the
first liquid-fuel rocket in 1926"). Correction: "two years before Goddard's
rockets reached serious altitude" or "…before Goddard's highest flight."
Confidence: high.
Source: https://en.wikipedia.org/wiki/Robert_H._Goddard

🔵 NIT — `tsiolkovsky-equation-1903.json` › narrative_101[0] & links
Quote: title of 1903 paper "The Investigation of Space by Means of Reactive
Devices."
Title translations vary across sources ("Exploration of Outer Space by Means of
Rocket Devices" / "Investigation of Outer Space by Reaction Devices"). The
overlay's rendering is an acceptable variant. Note: some scholarship dates the
serial *print* appearance to 1911–1912, with 1903 the journal (Nauchnoye
Obozreniye) date — the overlay's "1903 published in an obscure Russian journal"
is the standard claim and fine. Confidence: medium.

---

## Cross-cutting note

`_intro.json` promises the story "isn't owned by any one nation" and the overlays
do span US/USSR/Germany/England — consistent with Orrery's global-representation
rule. No agency-bias flags. The three 🔴 ERRORs are the priority fixes:
Goddard NYT "three days" → "day after"; Sputnik 2 "1.5-ton" → ~500 kg;
Apollo Saturn-V superlative wording. The Tsiolkovsky/Goddard timeline conflation
(🟠) is the most likely to mislead a careful reader since it self-contradicts.
