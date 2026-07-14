# /programs fact-check — exact fix spec (apply all tiers)

Per-program edits from the full 42-program `science-reviewer` sweep. Each entry:
**file** · exact source substring → replacement (or instruction). `en` =
`i18n-src/en-US/programs/{id}.json` (prose overlay). `base` =
`static/data/programs/{id}.json`. Apply the substring edits verbatim; for
"rework" items, apply the described correction and web-verify current status.
Match the surrounding editorial voice (modern-Wired field-historian; no hype).

Clean, no edits: **iss, spacex, starlink, esa-human**.

---

## Staleness reworks (verify current status on the web first)

### artemis — `en` (+ `base` roster)
The page predates the Feb-2026 replan and Artemis II's flight. Rework the flight
manifest: **Artemis II already flew (crewed lunar free-return, Apr 2026)** — state
it past-tense. **Artemis III is now a lunar-orbit / demonstration flight, not the
first landing; Artemis IV is now the first crewed landing.** Fix any sentence that
calls Artemis II upcoming or Artemis III "the return to the surface / first
landing." Update matching `base` roster years/notes. Keep the political-fragility
framing.

### ros — `en` + `base`
Written against the pre-Dec-2025 plan. Fixes:
- `base` first-module `year: 2027` → **2028** (UUM late 2028; NEM 2029); update `start_year` likewise.
- `en` goals: the "high-inclination, near-polar orbit … passes over the Arctic on every revolution" is the **original** plan — Roscosmos reversed it (Dec 2025) to assemble ROS docked to the ISS, forcing the **51.6° ISS-plane** orbit. Reframe as "originally planned for a near-polar orbit … a plan reversed in 2025."
- `en` the_land tagline: "a Russian station, in a Russian orbit … answerable to no partner" / "fly alone" — soften to intent/end-state (it now starts life attached to the ISS).
- `en` the_land: "the Salyut series and then Mir … entirely their own" — trim "entirely their own" (Shuttle-Mir cooperation). Keep "Mir, the first modular station."

### gaganyaan — `base` + `en`
- `base` roster "First crewed flight" `year: 2026` → **2027**; note "targeted for the mid-2020s" → "targeted for early 2027."
- `en` outcome: "the first crew is targeted for the mid-2020s." → "…targeted for 2027."
- `en` outcome: tighten "Uncrewed orbital test flights … precede any human launch" → "…*will* precede…" (they have not flown yet).

### kuiper — `en` (+ `base` if named)
- Rebranded **"Amazon Leo" (Nov 2025)** — update the name / add the rebrand.
- The "half the constellation deployed by July 2026" FCC deadline was **waived (June 2026)** — fix any "must / deadline" framing to reflect the waiver.

### commercial-stations — `en` + `base`
- `en` outcome: "Axiom intends to attach its first modules to the ISS and later detach them into a free-flying station" + `base` roster line "Axiom Space's modules are to attach to the ISS first, then detach to fly free" — **superseded Dec 2024**. Reframe: Axiom now assembles as an **independent free-flyer**; only its first module docks briefly to the ISS, then detaches to join later modules in free flight.
- `base` roster years: Axiom `2026` → **2027**; Starlab `2028` → **2029**.
- Add a roster entry for **Vast Haven-1** (year 2027, single-module free-flyer, the likely first commercial station to fly) — it's currently omitted.

---

## 🔴 / 🟠 factual corrections

### tiangong — `en` + `base`
- "continuously crewed since June 2021" → **"since June 2022"** (permanent crewing began with Shenzhou-14, not 2021). Fix every occurrence in `en` and `base`.
- "first single-country station since Skylab" → **false** (Mir + the Salyut line were Soviet single-country stations). Cut or reframe to "China's first long-term station."
- Station mass stated ~100 t → **~66–70 t** (three-module assembled; ~90 t with visiting vehicles). Correct the figure.

### shenzhou — `base` (+ `en` if repeated)
- base note "continuous occupation … 2021" → **2022**.
- "before 2030" (crewed Moon) → **"by 2030"** (CMSA phrasing).

### starship — `en`
- Any claim that Starship is the **sole/only** Artemis human lander → it is one of two (Blue Origin's **Blue Moon** is the competing HLS). Soften to "one of two landers NASA is funding."
- Currency: booster catch is now a repeated achievement and Starlink-class payload deploy has happened — change "will" framings to "has" where the milestone is done.

### ariane — `en`
- JWST described as Ariane 5's "final / crowning payload" → **false**. Ariane 5's last flight was **VA261 (July 2023)**, carrying Heinrich Hertz + Syracuse 4B. Reframe JWST (Dec 2021) as "the most celebrated of its late payloads," not the finale.

### buran — `en`
- "no main engines" → **"no main *ascent* engines"** (it had orbital-manoeuvring engines).
- Any unqualified "Energia — the most powerful rocket ever" → qualify ("one of the most powerful ever flown" / bound it in time).

### voyager — `en`
- narrative: "the only two objects we have ever launched on a course that leaves the solar system for good." → **"the only two craft yet to cross into interstellar space."** (Five craft are on escape trajectories — Voyager 1/2, Pioneer 10/11, New Horizons — but only the two Voyagers have crossed the heliopause; the Golden Record framing survives.)

### mariner — `en` + `base`
- the_land: **"Between 1962 and 1973"** → **"Between 1962 and 1975"** (Mariner 10's Mercury encounters ran 1974–75; matches `base` end_year 1975).
- "the first use of the gravity-assist slingshot" → **"the first use of an *interplanetary* gravity-assist slingshot"** (Luna 3 used a lunar assist in 1959). Fix every occurrence (outcome / legacy / narrative / lessons).
- `base` roster "Mariner 10 at Mercury" `year: 1973` → **1974** (reached Mercury 29 Mar 1974; 1973 was launch).

### viking — `en` + `base`
- tagline: "sent back the first photographs from its surface" → **"…the first clear photographs from its surface"**.
- outcome: "the first photograph ever taken from the surface of Mars" → **"the first clear photograph from the surface of Mars"** (USSR's Mars 3 sent a partial frame in 1971).
- `base` roster "Viking 1 lands" note "the first pictures ever taken from the surface of Mars" → **"the first clear pictures from the surface of Mars"**. Leave the viking-1 "land successfully … and operate" note as-is (correct).

### new-horizons — `en` + `base`
- the_land: "three billion kilometres out" → **"nearly five billion kilometres out"** (Pluto was ~4.9 bn km at flyby).
- "classical nine" / "the last unexplored classical planet" / "every classical planet had been visited" → drop "classical"; use "the nine planets as they were then counted" / "the last of the nine planets then recognised" / "every planet of the old count."
- "more than 50,000 kilometres per hour" (×2) → **"nearly 50,000 kilometres per hour."**
- `base` roster "a billion kilometres beyond Pluto" → **"a billion and a half kilometres beyond Pluto"** (matches the prose's 1.6 bn).

### cassini — `en`
- the_land: "a seven-year, two-billion-kilometre cruise" → **"a seven-year, three-and-a-half-billion-kilometre cruise"** (2 bn was the *mile* figure mislabelled km).

### mir — `en`
- legacy: "fifteen years, five more than intended" → **"fifteen years, three times as long as intended"** (design life was ~5 yr).

### mercury — `en`
- outcome: "it would soon fly a woman and walk in the void while Mercury was still counting single orbits." → reframe (false: Tereshkova June 1963 and Leonov Mar 1965 both post-date Mercury's May-1963 close; Mercury's finale flew 22 orbits). e.g. **"and within two years of Mercury's close it would fly a woman and walk in the void — firsts the American programme would not match for years."**

### apollo — `en`
- goals figure caption: "for half a century the most powerful rocket ever to fly." → **"the most powerful rocket ever to carry humans — and, for over fifty years, the most powerful ever flown, until SpaceX's Super Heavy in 2023."**
- lessons: "When Apollo 13 crippled itself 320,000 kilometres from home" → **"…roughly 400,000 kilometres from home"** (max distance 400,171 km; also fixes the internal clash with "quarter-million miles" elsewhere).

### soviet-lunar — `en` + `base`
- narrative: "hid roughly a hundred of them in a warehouse" → **"hid around sixty of them"** (~60 NK-33 survived).
- `base` LK roster note "half the mass of Apollo's LM" → **"about 40% the mass of Apollo's LM."**
- outcome: "the first living creatures to travel to the Moon's vicinity and return" → **"the first living creatures to travel around the Moon and return"** (matches base "circle the Moon").

### chandrayaan — `en`
- Water discovery pinned to **2008** ("overturned in 2008" / "found lunar water" as a 2008 event) → the detection was **published Sept 2009** (mission *launched* 2008). Reframe: "a 2008 mission whose data, published in 2009, detected water."
- "it came from ISRO" / "the spacecraft whose instruments found water" → note the detecting instrument was **NASA/JPL's Moon Mineralogy Mapper (M3)** flown on the ISRO orbiter. Credit the platform to ISRO but name M3 as a NASA payload.
- "water molecules bound into the lunar soil across wide areas of the surface" → the signal was **latitude-dependent (polar-weighted)**; soften to "across broad, mostly higher-latitude regions."

### mangalyaan — `en`
- tagline/the_land: "India reached Mars on its first attempt — something no nation had ever done" / "Reaching Mars orbit on a first try was something no country had ever managed" → **ESA's Mars Express orbiter succeeded on its first attempt in 2003.** Reframe to "the first *country* (as opposed to the multinational ESA) to reach Mars orbit on its debut, and the first to do so with indigenously developed propulsion."
- the_land: "the United States, the Soviet Union, Europe, and Japan all crashed, missed, or fell silent on their early attempts." → **remove "Europe"** (its orbiter succeeded; only Beagle 2 lander failed) or qualify to "Europe's Beagle 2 lander."
- outcome + base note: "the first Asian nation to reach Mars at all" → **"the first Asian nation to reach Mars orbit."**

---

## 🟡 / 🔵 (precision — apply in the same pass)

- **sputnik** `en` outcome: "For twenty-one days its two transmitters" → **"For twenty-two days."**
- **vostok** `en` narrative: "the launch failures that killed ground crews" → **remove/replace** the ground-crew clause (no R-7/Vostok launch killed ground crews; risks implying the R-16 Nedelin disaster) → e.g. "the dogs lost on failed test shots." Also "each flight was a flawless demonstration" → **"each flight was presented as flawless."**
- **voskhod** `en` outcome: "spent a freezing night surrounded by wolves before rescuers on skis could reach them" → **"spent two freezing nights in deep forest — wolves in the taiga around them — before skiing out to a helicopter that couldn't land in the trees."**
- **soyuz** `en` legacy: "well over a hundred and fifty crewed flights" → **"more than a hundred and fifty."** outcome: "died when its parachute failed on reentry" → **"died when its parachutes failed and the capsule struck the ground."**
- **gemini** `base`: Gemini 11 note "1,369 km" → **"1,374 km."**
- **skylab** `en`: "the empty upper stage of a Saturn V" → **"the empty S-IVB stage — the third stage of a Saturn V"** (and the figure-caption "converted Saturn V upper stage" likewise). "scattering debris across the Indian Ocean and Western Australia" → **"across the southern Indian Ocean and, unintentionally, Western Australia."**
- **salyut** `en`: the_land "on at least one, a cannon" → **"and a cannon — actually test-fired in orbit on one of them."** lessons/goals "Skylab … could not be restocked and died when it was left alone" → **"…was never resupplied or reboosted, and decayed once it was left alone."** narrative "impossible to tell apart" → **"hard to tell apart."**
- **pioneer** `en` outcome: "the first close images of the giant planet and its moons" → **drop "and its moons."** "finding the gap that the Voyagers would use a year later" → **"…in the years that followed."**
- **galileo** `en` + `base`: the recurring **"eight years"** for the orbital tour is wrong (7 yr 9 mo). Fix: tagline "flew for eight years with a crippled antenna" → **"flew a crippled antenna for over a decade"** (antenna failed 1991, mission ended 2003); the tour occurrences ("over the next eight years", "eight years arguing", "eight years in orbit", base "eight years studying") → **"nearly eight years."**
- **space-shuttle** `en` outcome: "carried 355 people" → **"flew 355 different people."**
- **great-observatories** `en`: Roman "the same sharpness across a patch of sky a hundred times larger" / base "a hundred times Hubble's" → **"over a hundred times larger"** (NASA cites ~200×). Roman roster `year: 2027` → **2026** (current target).
- **jwst** `en`: "roughly 344 'single-point failures': deployments" → **"the 344 single points of failure it carried — about 80% of them deployment steps."** "a bet that came within a single vote of collapsing" → **cut "single vote"** ("came within a congressional budget of being killed"). "For twenty-five years the telescope was late, expensive, and nearly cancelled" → qualify ("for most of two decades").
- **hayabusa** `en`: "a few thousand microscopic grains" → **"roughly 1,500 grains."** "Its reaction wheels failed" → **"Two of its three reaction wheels failed."** "OSIRIS-REx, flew in dialogue with the Hayabusa team" → **"shared samples with, and drew on the experience of, the Hayabusa team."**
- **jaxa-robotic** `en`: "the most detailed lunar survey since Apollo" / "the most complete lunar map … since Apollo" → **"the largest lunar mission since Apollo"** (LRO surpassed it in 2009). "the first HD footage of an Earthrise since Apollo" → **drop "since Apollo"** ("the first HD footage of an Earthrise"). "its main engine ruptured" → **"its main engine failed"** (clogged valve → cracked nozzle throat). "landed within metres of its target" → **"landed within about 55 metres of its target"** (100 m was the goal).
- **esa-science** `en`: "positions and motions of nearly two billion stars" → **"positions of nearly two billion stars"** (proper motions exist for ~1.46 bn). "a ten-year, billion-kilometre chase" → **"a ten-year, six-billion-kilometre chase"** (Rosetta flew 6.4 bn km).
- **change** `en`: "land Chinese astronauts on the Moon before 2030" → **"by 2030."** (Chang'e 6 dichotomy hedge already present — leave.)
- **mars-rovers** `en` + `base`: `base` roster perseverance note "landed in the delta of an ancient lake in 2021" → **"landed on the floor of Jezero Crater in 2021 — an ancient river delta and lake bed"** (it landed ~5 km from the delta, reached it Apr 2022). `en` outcome "landing in the delta of an ancient river" → **"landing on the floor of Jezero Crater — home to an ancient river delta."** `en` "Sojourner … drove a few metres" (and "Sojourner's few metres" in narrative/lessons) → **"about a hundred metres"** (Sojourner drove ~100 m total). "the longest drive on any world" → **"the longest drive on any other world."**
