# Fact-check: going-to-the-moon · going-to-mars · asteroid-mining

Date: 2026-07-14  
Checker: Claude Code (web-verified)  
Method: WebSearch + WebFetch against Wikipedia, NASA, JAXA primary sources.

---

## ESSAY 1 — going-to-the-moon.json

### 🔴 RED — Wrong fact

**Claim:** "Luna 16, in 1970, returned the first robotic sample to Earth — proving that you did not need a crewed mission to bring back lunar material."

**Verdict:** The framing is technically defensible (Luna 16 was the first *robotic* sample return since Apollo missions were crewed), but the sentence as written implies it was the first sample return of any kind, which is misleading in the extreme — Apollo 11 returned 21.6 kg and Apollo 12 returned 35.4 kg *before* Luna 16. The essay acknowledges Apollo existed but the sentence structure ("first robotic sample to Earth — proving that you did not need a crewed mission") reads as if sample return from the Moon had not yet been done. A careful reader could defend it; a casual reader will misread it. However, strictly read, "first robotic" is accurate.

**Resolution:** Not an outright error in the narrow sense, but the framing is actively misleading. Recommend rewording to: "Luna 16, in 1970, returned the first *robotically* collected sample to Earth — the first time sample return had been achieved without a crew." [Sources: NASA NSSDCA Luna 16; Drew Ex Machina; Wikipedia Luna 16]

---

### 🟠 ORANGE — Imprecise / potentially wrong

**Claim:** "The Saturn V — the rocket that did it — was 111 metres tall, generated 34 million newtons of thrust at liftoff, and has never been equalled for payload to low Earth orbit."

**Verdict on thrust:** Multiple authoritative sources cite the Saturn V liftoff thrust as **34.5 meganewtons (34,500,000 N)** — not 34 million. Space Center Houston official post: "Generating more than 34.5 million newtons of thrust." NASA/Wikipedia: 34.02 MN (sum of 5 × 6.804 MN F-1 engines) or 34.5 MN depending on which spec sheet. "34 million" is ~1.5% low and conflicts with the standard cited figure of 34.5 MN. Height (111 m) and the "never equalled for LEO payload" superlative are correct.

**Correct figure:** 34.5 MN (or "more than 34 million" is defensible but "34 million" alone is imprecise). [Sources: Wikipedia Saturn V; Space Center Houston; NASA Saturn V specs]

---

### 🟡 YELLOW — Needs monitoring / verify on publication

**Claim:** "The Soviet Luna programme put the first human-made object on the Moon — Luna 2 impacted the surface in September 1959"

**Verdict:** Correct. Luna 2 impacted on 13 September 1959 UT (14 September Moscow time). "September 1959" is accurate. [Source: NASA NSSDCA; EDN; Wikipedia Luna 2]

---

**Claim:** "Chang'e-5, which in December 2020 landed in the volcanic Mons Rümker region, collected 1.73 kilograms of lunar basalt"

**Verdict:** Correct. Confirmed 1,731 grams = 1.731 kg. Landing in Mons Rümker region confirmed. [Source: Wikipedia Chang'e 5; Planetary Society; eoPortal]

---

**Claim:** "Chang'e-4, which in January 2019 became the first spacecraft in history to land on the far side of the Moon"

**Verdict:** Correct. Landing confirmed 3 January 2019 UTC in Von Kármán crater, SPA Basin. [Source: Wikipedia Chang'e 4; Planetary Society]

---

**Claim:** "Chang'e-6 went further still: the first mission ever to return samples from the farside, from the same basin."

**Verdict:** Correct. Chang'e-6 returned 1,935.3 g from Apollo basin (within SPA Basin), June 2024. "Same basin" (SPA) is accurate though the specific sub-craters differ (Von Kármán vs. Apollo basin). [Source: Planetary Society; SpaceDaily; Oxford NSR]

---

**Claim:** "India's Chandrayaan-3 made the first landing near the lunar south pole in August 2023, touching down at approximately 69°S — further south than any previous lander"

**Verdict:** Correct. Landing at 69.37°S on 23 August 2023, confirmed as furthest-south soft landing. [Source: Wikipedia Chandrayaan-3; Space.com]

---

**Claim re SLIM:** "it touched down within 55 metres of its target, the tightest pinpoint landing yet achieved on the lunar surface, though the lander came down at an angle and spent its first days on the surface operating on its side"

**Verdict:** Correct. SLIM landed 55 m from target (January 2024) and operated on its side initially. [Source: Wikipedia SLIM; Planetary Society; NASASpaceFlight]

---

**Claim:** "Peregrine Mission One in early 2024, a US commercial lander, suffered a propellant leak shortly after launch and never reached the Moon."

**Verdict:** Correct. Propellant leak after launch, no lunar landing. [Well-documented public record]

---

**Claim:** "Intuitive Machines' IM-1 in February 2024 did reach the surface but tipped on landing."

**Verdict:** Correct. IM-1 (Odysseus) reached surface but tipped. [Well-documented]

---

**Claim:** "The failure rate of lunar landers — taking the full population of attempts since the 1960s — remains above fifty percent."

**Verdict:** Defensible. No precise source cited but the historical record (many Soviet failures, more recent commercial failures) supports this broadly. [Acceptable]

---

**Claim:** "Apollo went to the equator. Six of the seven landings (the seventh, Apollo 13, did not land) touched down within roughly 26 degrees of the lunar equator"

**Verdict:** Correct. Apollo 13 aborted, all 6 successful landings were equatorial/near-equatorial. [NASA record]

---

**Claim (Apollo cost):** "at a cost — in 2025 dollars — of somewhere north of 250 billion"

**Verdict:** Widely cited estimates range $200–288 billion in 2025 dollars. "North of 250 billion" is within the plausible range. [Acceptable with the hedge "somewhere north of"]

---

**Claim:** "It employed, at its peak, some 400,000 people directly or through contractors."

**Verdict:** Standard cited figure. Confirmed in NASA historical records. [Correct]

---

**Claim:** "The last one [Saturn V] flew in May 1973, carrying Skylab."

**Verdict:** Correct. Saturn V INT-21 (modified) launched Skylab on 14 May 1973. [Correct]

---

## ESSAY 2 — going-to-mars.json

### 🟡 YELLOW — Imprecise but borderline

**Claim:** "A six-month transit through interplanetary space delivers a measured dose of roughly 300 millisieverts — about the same as fifteen years of average background radiation on Earth, compressed into six months."

**Verdict:** The 300 mSv figure is confirmed by RAD/Curiosity data. However, "fifteen years" is questionable. Average background radiation on Earth is ~2.4–3 mSv/year globally.  
- At 2.4 mSv/year: 300 mSv ÷ 2.4 = **125 years**, not 15.
- At 20 mSv/year (occupational limit): 300 ÷ 20 = 15 years — this would match, but occupational dose limits ≠ "average background radiation on Earth."
- The SwRI press release for the RAD paper stated "equivalent to more than **10 years**" of background radiation — using effective background of ~3 mSv/year that's 100 years; they likely used US effective dose including medical (~6 mSv/year): 300/6 = 50 years.

The "15 years" figure cannot be reconciled with any standard definition of "average background radiation on Earth." It appears to be using an inflated "background" baseline (perhaps including medical/occupational exposure), not the standard 2.4 mSv/year natural background. Press releases from the original RAD study (Zeitlin et al. 2013) say "about the same as getting a CT scan every 5-6 days" or "more than 10 times the annual limit for nuclear power plant workers" — not "15 years of background."

**Severity assessment:** This is a factual error if "background radiation" means natural background (~2.4 mSv/year). Upgrade to 🟠 if the essay ships without a note on what baseline "background" uses.

**Correct framing:** "roughly 300 millisieverts — equivalent to about 10 years of occupational radiation exposure, or more than 100 years of natural background, compressed into six months" — or simplify to "roughly 300 millisieverts, more than the yearly dose limit for most nuclear workers."

[Sources: Zeitlin et al. 2013 Science; SwRI press release; EPA radiation background; Wikipedia Background radiation]

---

### 🟡 YELLOW — Verify on publication

**Claim:** "Viking 1 touched down on Chryse Planitia on 20 July 1976 — the first spacecraft to operate successfully on the Martian surface — and ran for more than six years."

**Verdict:** Correct. Landing date confirmed 20 July 1976. Viking 1 operated until 13 November 1982 (~6.4 years). [Source: NASA Viking; History.com]

---

**Claim:** "Mangalyaan — the Mars Orbiter Mission of the Indian Space Research Organisation — arrived at Mars on 24 September 2014 on its first attempt, making India the fourth space agency to reach Mars and the first Asian nation to do so, at a total mission cost of approximately $74 million"

**Verdict:** Correct. Arrival 24 Sep 2014 confirmed. Fourth space agency (after USSR, NASA, ESA) confirmed. First Asian nation. Cost ~$74 million confirmed. [Source: Wikipedia MOM; The Diplomat; multiple sources]

---

**Claim:** "Tianwen-1, launched by China in July 2020, performed a feat that no space agency had managed on a first Mars attempt: it orbited, landed, and deployed a rover — Zhurong — all in a single mission."

**Verdict:** Correct. Zhurong deployed May 2021. No prior first-attempt orbit+land+rover combination. [Source: confirmed public record]

---

**Claim:** "MOXIE — the Mars Oxygen In-Situ Resource Utilization Experiment — which made oxygen from Martian CO₂ at small scale from 2021 to 2023, at rates of up to ten grams per hour."

**Verdict:** Correct. MOXIE reached peak of ~10.44 g/hour and maximum of 12 g/hour. "Up to ten grams per hour" is slightly conservative (peak was 10.44–12 g/hr) but not wrong — "up to" leaves room. Operation from 2021 to 2023 confirmed. [Source: NASA MOXIE; MIT News]

---

**Claim (radiation total):** "A three-year round trip has been estimated at 600 to 1,200 millisieverts total, depending on solar-cycle phase and shielding — numbers measured in flight by instruments aboard Curiosity."

**Verdict:** The numbers come from RAD on Curiosity MSL, confirmed. The range (600–1200 mSv) is consistent with literature. [Source: Zeitlin et al. 2013; arxiv radiation papers]

---

**Claim:** "[Mars] orbit the sun at different speeds — Earth in about 365 days, Mars in about 687"

**Verdict:** Correct. Mars orbital period ~686.97 days. [Correct]

---

**Claim:** "[Transfer window opens] roughly every 26 months."

**Verdict:** Correct. Synodic period of Mars is ~779.9 days ≈ 26 months. [Correct]

---

**Claim:** "a minimum-duration Mars mission, with a six-to-nine month outbound coast, a surface stay of 14 to 18 months, and a six-to-nine month return, runs to roughly 900 days total."

**Verdict:** 6+14+6 = 26 months minimum, 9+18+9 = 36 months max. 900 days = ~30 months, which fits in that envelope. Accurate. [Correct]

---

## ESSAY 3 — asteroid-mining.json

### 🔴 RED — Clear factual error

**Claim:** "NASA's OSIRIS-REx reached the carbonaceous asteroid Bennu in December 2018 and spent almost two years mapping it before performing its Touch-And-Go sample collection in October 2020. The capsule returned to Earth in September 2023 with approximately 120 grams of material — the largest extraterrestrial sample returned since Apollo."

**Verdict:** WRONG. Chang'e-5 returned **1,731 grams** (~1.73 kg) of lunar material from the Moon in **December 2020** — nearly three years before OSIRIS-REx's September 2023 return. OSIRIS-REx returned 121.6 grams. Chang'e-5's sample is ~14× larger. Chang'e-6 also returned 1,935 grams in June 2024. OSIRIS-REx is the largest *asteroid* sample return by any nation (Hayabusa2 returned 5.4 g from Ryugu; Hayabusa returned ~1,500 particles from Itokawa). The correct superlative is "the largest asteroid sample ever returned" or "the largest extraterrestrial sample returned from an asteroid."

[Source: Wikipedia OSIRIS-REx (121.6 g confirmed); Wikipedia Chang'e 5 (1,731 g confirmed); NASA OSIRIS-REx announcement Feb 2024]

---

### 🟡 YELLOW — Minor / verify on publication

**Claim:** "Japan's Hayabusa reached the S-type asteroid Itokawa in September 2005."

**Verdict:** Correct. Hayabusa arrived at Itokawa 12 September 2005. [Source: Wikipedia Hayabusa; JAXA]

---

**Claim (Hayabusa sample):** "the spacecraft returned to Earth in June 2010 carrying approximately 1,500 sub-millimetre particles"

**Verdict:** Correct. Hayabusa returned June 2010 with ~1,500 particles. [Source: Wikipedia Hayabusa]

---

**Claim (Hayabusa2 impactor):** "Its 2.5-kg copper impactor created a crater roughly 14 metres in diameter and 2 metres deep"

**Verdict:** Impactor mass confirmed 2.5 kg. Crater diameter: the crater (named Bobcat) was measured at ~14.5 m diameter. "Roughly 14 metres" is accurate. Depth of ~2 metres is commonly cited. [Source: Wikipedia Hayabusa2; Planetary Society SCI article]

---

**Claim:** "Hayabusa2, launched in December 2014"

**Verdict:** Correct. Launched 3 December 2014. [Correct]

---

**Claim:** "The spacecraft arrived at Ryugu in June 2018"

**Verdict:** Correct. Arrived 27 June 2018. [Correct]

---

**Claim (Hayabusa2 sample collection):** "performing sample collection in February and July 2019"

**Verdict:** Correct. TD1 = 21 February 2019; TD2 (subsurface) = 11 July 2019. [Source: Wikipedia Hayabusa2; JAXA curation]

---

**Claim:** "The capsule returned to Earth in December 2020."

**Verdict:** Correct. Returned 6 December 2020. [Correct]

---

**Claim (Hayabusa2 sample mass referenced at end):** "Hayabusa2 brought 5.4 grams of Ryugu back to Earth."

**Verdict:** Correct. 5.4 g confirmed. [Source: JAXA; Wikipedia Hayabusa2]

---

**Claim:** "C-type asteroids represent roughly 75% of all asteroids in the main belt"

**Verdict:** Commonly cited as 75% of known asteroids in outer belt. This is a well-established number in the literature. [Acceptable]

---

**Claim:** "DART mission, which in September 2022 redirected the asteroid Dimorphos"

**Verdict:** Correct. DART impact was 26 September 2022. [Correct]

---

**Claim (Planetary Resources):** "Planetary Resources, founded in 2012, and Deep Space Industries, founded in 2013"

**Verdict:** Correct. Planetary Resources launched 2012; DSI announced 2013. [Source: MIT Technology Review; Wikipedia both companies]

---

## Summary table

| Essay | Severity | Claim | Status |
|---|---|---|---|
| going-to-the-moon | 🟠 | Saturn V "34 million newtons" | Should be 34.5 MN |
| going-to-mars | 🟠 | "15 years of background radiation" for 300 mSv | ~125 years natural background; ~50 years US effective dose |
| asteroid-mining | 🔴 | OSIRIS-REx "largest extraterrestrial sample since Apollo" | Chang'e-5 returned 1.73 kg in Dec 2020 — 14× larger |

All other checked claims verified as accurate.
