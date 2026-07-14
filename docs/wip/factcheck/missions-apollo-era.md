# Fact-check — Apollo-era + early stations + Sputnik (earth-orbit missions)

Reviewer: science-reviewer (skeptical, web-verified). Date: 2026-07-14.
Scope: 10 missions × 2 files each (prose overlay `i18n-src/en-US/missions/earth/<slug>.json` + base data `static/data/missions/earth/<slug>.json`). **No edits made** — findings only.

## Per-mission verdict

| Mission | Verdict | Highest severity |
|---|---|---|
| apollo-1 | PASS | — (clean) |
| apollo7 | PASS | — (clean) |
| apollo9 | ISSUE | MEDIUM (descent/ascent stage swapped) |
| apollo-soyuz | ISSUE | MEDIUM (docking count + handshake timing) |
| skylab-2 | PASS | — (clean) |
| skylab-3 | PASS (minor) | LOW (recovery detail not stated — n/a) |
| skylab-4 | ISSUE | HIGH ("last US water landing" wrong) + MEDIUM (strike claim) |
| soyuz-1 | PASS | — (clean) |
| soyuz-11 | ISSUE | MEDIUM ("23 days aboard" — was 22) |
| sputnik1 | PASS | — (clean) |

## Totals
- HIGH: 1  (skylab-4 "last US water landing until 2020")
- MEDIUM: 4 (apollo9 stage swap; apollo-soyuz docking count; apollo-soyuz handshake timing; soyuz-11 days-aboard; skylab-4 strike-as-fact — counted separately below)
- LOW: 1  (skylab-4 met/date mismatch for strike event)
- Clean missions: 6 of 10 (apollo-1, apollo7, skylab-2, skylab-3, soyuz-1, sputnik1)

MEDIUM count breakdown: apollo9 (1), apollo-soyuz (2), soyuz-11 (1), skylab-4 strike-as-fact (1) = 5 medium-tier items across 4 missions.

---

## apollo-1 — PASS

All claims verified. Pad fire 1967-01-27 17:31 EST ✓; crew Grissom + White + Chaffee ✓; AS-204 / CSM-012 Block I ✓; LC-34 ✓; originally scheduled ~Feb 1967 ✓; hatch inward-opening / pressure spike ✓; posthumous Apollo 1 designation ✓; ~21-month program pause (event says "21 months") ✓ — Apollo 1 Jan 1967 → Apollo 7 Oct 1968 = ~20.5 months, "21 months" is an accepted rounding. No corrections.

Source: https://en.wikipedia.org/wiki/Apollo_1

---

## apollo7 — PASS

Verified: launch 1968-10-11 ✓; splashdown 1968-10-22 11:11 UTC ✓; 163 orbits ✓; recovery USS Essex ✓; splashdown North Atlantic (~200 nmi SSW of Bermuda) — prose "North Atlantic" ✓; first live TV from a crewed US spacecraft ✓; 10 d 20 h ✓; CSM-101 ✓; first crewed Apollo ✓; SPS fired 8 times ✓; Schirra head cold / crew never flew again ✓; launch site LC-34 ✓.

Minor note (not an error): launch time. Prose event says "1968-10-11 15:02 UTC". NASA/Wikipedia give 11:02:45 EDT = 15:02:45 UTC ✓ — consistent.

Source: https://en.wikipedia.org/wiki/Apollo_7

---

## apollo9 — ISSUE (MEDIUM ×1)

### MEDIUM — descent/ascent stage swapped in LM JETTISON event
- File/field: `i18n-src/en-US/missions/earth/apollo9.json` → `events[].note` (label "LM JETTISON")
- Quote: "Spider ascent stage jettisoned to deorbit; **descent stage remained in orbit and decayed 1981**."
- What's wrong: Reversed. The **descent stage** reentered quickly — March 22, 1969 (days after jettison), into the Indian Ocean. The **ascent stage** is the one that stayed in orbit and decayed **October 23, 1981** (~7.5 years later than the predicted 5). The note attributes the 1981 long-orbit decay to the descent stage; it was the ascent stage.
- Correction: "Spider **descent** stage deorbited (reentered March 1969); the **ascent** stage was boosted to a high orbit and decayed 1981." (Note also: the ascent stage was fired to depletion / boosted, not simply "jettisoned to deorbit.")
- Source: https://en.wikipedia.org/wiki/Apollo_9 ; https://www.drewexmachina.com/2019/03/19/apollo-9-giving-the-spider-wings/
- Confidence: HIGH

### Verified-clean on apollo9
Launch 1969-03-03 (Saturn V AS-504, LC-39A) ✓; crew McDivitt + Scott + Schweickart, first crewed LM ✓; Spider max sep ~183 km (183.5 km) ✓; Schweickart EVA ~37 min (prose "38-min" — off by 1 min, within rounding tolerance, LOW-noise, not flagged) ; Scott stand-up EVA from CSM ✓; splashdown 1969-03-13 ✓; 151 orbits ✓; recovery USS Guadalcanal ✓; first crewed transposition + docking ✓. Gumdrop = CSM-104, Spider = LM-3 ✓.
- Note: prose EVA duration "38-min" vs sourced "37 min" — borderline; flag as trivial only.

---

## apollo-soyuz — ISSUE (MEDIUM ×2)

### MEDIUM — "4 dockings" overstated
- File/field: `i18n-src/en-US/missions/earth/apollo-soyuz.json` → `description` AND `events[].note` (label "JOINT OPS")
- Quotes: description "…joint experiments through **4 separate docking sequences** across 44 hours docked."; JOINT OPS note "…**4 dockings** across 44 hours docked."
- What's wrong: There were **two** dockings, not four: the initial docking on July 17, then after a period undocked, a second brief ("practice") docking on July 19, then final undock. Total docked time ~1 d 23 h ("44 hours") is right, but that time was accumulated across 2 docking periods, not 4.
- Correction: "2 dockings across ~44 hours docked" (or "docked twice").
- Source: https://en.wikipedia.org/wiki/Apollo%E2%80%93Soyuz (undocked, then "another brief docking")
- Confidence: HIGH

### MEDIUM — handshake placed at hatch-open; it was ~3 h later
- File/field: `i18n-src/en-US/missions/earth/apollo-soyuz.json` → `events[].note` (label "DOCKING")
- Quote: "…Hatch opens at 19:17 UTC; \"Glad to see you\" handshake."
- What's wrong: The event ties the Stafford–Leonov handshake to the 19:17 UTC hatch opening. The historic first handshake occurred **~3 hours after** the hatches were opened (multiple sources: "three hours later"). Placing the handshake at hatch-open (19:17) is a timing error of ~3 h. (Minor secondary: the famous exchanged greeting is usually rendered "Glad to see you" from Stafford in Russian — wording itself is fine.)
- Correction: separate the two — hatch open 19:17 UTC; first handshake ~3 h later (~22:19 UTC region).
- Source: https://en.wikipedia.org/wiki/Apollo%E2%80%93Soyuz ; https://www.nasa.gov/history/the-apollo-soyuz-test-project-success-achieved-for-first-rendezvous-and-docking-of-two-nations-spacecraft-in-space/
- Confidence: MEDIUM-HIGH

### Verified-clean on apollo-soyuz
Apollo launch 1975-07-15 19:50 UTC LC-39B ✓; Soyuz 19 launch same day, Baikonur, 12:20 UTC ✓ (prose "7.5 h after Soyuz" ✓); docking 1975-07-17 ✓; crews Stafford+Brand+Slayton / Leonov+Kubasov ✓; APAS androgynous docking ✓; Soyuz landed 1975-07-21 Kazakhstan ✓; Apollo splashdown 1975-07-24 Pacific near Hawaii ✓ (prose "Pacific" ✓); last Apollo CSM (CSM-111) ✓; CSM-111 at California Science Center ✓; final undock 1975-07-19 ✓; first international crewed docking ✓.

---

## skylab-2 — PASS

Verified: Conrad + Kerwin + Weitz, first crew ✓; launch 1973-05-25 13:00 UTC, Saturn IB SA-206 ✓; Skylab damaged ~11 days earlier (Skylab launched 1973-05-14) ✓; Weitz stand-up EVA failed to free wing ✓; Conrad+Kerwin freed wing on ~3.5 h EVA (sourced 3 h 25 min, "3.5-hour"/"3.5h" ✓, longest orbital EVA to date ✓); parasol through scientific airlock dropped temp from 54 °C to ~24 °C (sourced 54 °C → 23 °C; prose "54°C to 24°C" ✓ within rounding); 28-day mission ✓; returned 1973-06-22 13:50 UTC ✓; CSM-116 at NASM ✓.
- Trivial note: Weitz stand-up EVA prose "38-minute" — sources describe it but the 38-min figure is plausible; not flagged.

Source: https://en.wikipedia.org/wiki/Skylab_2 ; https://www.nasa.gov/history/50-years-ago-skylab-2-astronauts-deploy-jammed-solar-array-during-spacewalk-2/

---

## skylab-3 — PASS

Verified: Bean + Garriott + Lousma ✓; 59 days 11 h (sourced 59 d 11 h 9 m) ✓; launch 1973-07-28 11:11 UTC, Saturn IB SA-207 ✓; RCS/attitude-control thruster leak → backup CSM (rescue) prepped, not flown ✓; twin-pole sun shield deployed over parasol ✓; ATM solar observations ✓; splashdown 1973-09-25 ~22:19 UTC (sourced 22:20 UTC — prose 22:19, off by ~1 min, trivial) ✓; second crew ✓.
- Note (not flagged): prose says CSM-117 at "Glenn Visitor Center, Cleveland." Skylab 3 CM is displayed at the Great Lakes Science Center (which houses the NASA Glenn Visitor Center), Cleveland — substantively correct.
- Note: prose "305 hours of solar observations" — plausible ATM figure, not independently pinned; low-risk.

Source: https://en.wikipedia.org/wiki/Skylab_3 ; https://www.nasa.gov/history/50-years-ago-skylab-3-astronauts-splash-down-after-record-59-days-in-space/

---

## skylab-4 — ISSUE (HIGH ×1, MEDIUM ×1, LOW ×1)

### HIGH — "last US crewed water landing until SpaceX Crew Dragon in 2020" is WRONG
- File/field: `i18n-src/en-US/missions/earth/skylab-4.json` → `description` AND `events[].note` (label "SPLASHDOWN")
- Quotes: description "…Splashed down 1974-02-08…, **the last US crewed water landing until SpaceX Crew Dragon in 2020**."; SPLASHDOWN note "…**last US crewed water landing until Crew Dragon**."
- What's wrong: Skylab 4 (Feb 1974) was NOT the last US crewed water landing before 2020. **Apollo-Soyuz splashed down in the Pacific on July 24, 1975** — that ASTP splashdown is the last US crewed water landing before Crew Dragon (2020). Skylab 4 is off by one mission / ~17 months.
- Correction: attribute the "last US water landing until 2020" superlative to Apollo-Soyuz (July 1975), not Skylab 4. For Skylab 4, drop the claim or reword to "last Skylab splashdown" / "last US crewed water landing until Apollo-Soyuz 18 months later."
- Note: this same "last splashdown until 2020" superlative is correctly ownable by the apollo-soyuz editorial — cross-check that ASTP claims it (ASTP prose does NOT currently assert this, so the superlative is only stated on the wrong mission).
- Source: https://en.wikipedia.org/wiki/Apollo%E2%80%93Soyuz ; https://www.nasa.gov/history/50-years-ago-skylab-4-astronauts-return-from-record-breaking-spaceflight/
- Confidence: HIGH

### MEDIUM — "Skylab strike" stated as fact; the strike is disputed/likely apocryphal
- File/field: `i18n-src/en-US/missions/earth/skylab-4.json` → `dispatch`, `first`, `description`, `events[].note` (label "TIMELINE RESET")
- Quotes: first "…\"Skylab strike\" rest day dispute"; description "…best remembered for the unofficial 'Skylab strike' on day 45 when the crew turned off radios for a half-day…"; dispatch "…took an unscheduled day of rest and forcing mission control to negotiate…"
- What's wrong: The "Skylab 4 strike / astronauts switched off the radio for a day" is a widely-repeated but **disputed** story. NASA, the crew (Carr, Gibson, Pogue), and spaceflight historians have stated **no strike occurred**; the account (originating in a 1976 New Yorker piece) appears to conflate the alleged Dec 28 stand-down with a scheduled day off on Dec 26 (following a long EVA). Presenting it flatly as a factual event overstates a contested claim.
- Correction: hedge — "the (disputed / often-mythologized) 'Skylab strike'" or note that NASA and the crew dispute a deliberate work stoppage; the underlying real issue (overloaded timeline → renegotiated workload) is accurate and can be kept without asserting a literal strike.
- Source: https://en.wikipedia.org/wiki/Skylab_4 ("However, NASA, the astronauts involved, and spaceflight historians have stated that no strike occurred…")
- Confidence: MEDIUM (real-timeline-overload true; literal "strike" false/disputed)

### LOW — strike event MET vs date inconsistency
- File/field: `i18n-src/en-US/missions/earth/skylab-4.json` → `events[]` "TIMELINE RESET" `met: 45`; `description` says "on day 45"
- What's wrong: The alleged incident date is Dec 28, 1973. Launch was 1973-11-16, so Dec 28 = mission **day ~42**, not day 45 (met:45 = Dec 31). Internal date/MET mismatch (compounding the disputed-claim issue above).
- Correction: if the event is retained, align MET (~42) with the cited date, or drop the specific day number given the dispute.
- Source: date arithmetic from launch 1973-11-16 (https://en.wikipedia.org/wiki/Skylab_4)
- Confidence: MEDIUM

### Verified-clean on skylab-4
Carr + Gibson + Pogue, all-rookie ✓; 84 days 1 h (sourced 84 d 1 h 16 m; prose "84 days 1 hour" ✓); launch 1973-11-16 14:01 UTC Saturn IB SA-208 ✓; Comet Kohoutek campaign Dec–Jan ✓; longest Skylab stay / US endurance record ✓; splashdown 1974-02-08 15:17 UTC ✓; CSM-118 at National Museum of the US Air Force, Dayton ✓.

---

## soyuz-1 — PASS

Verified: launch 1967-04-23 00:35 UTC, Baikonur ✓; Vladimir Komarov, sole crew ✓; 7K-OK No.4 ✓; first crewed Soyuz ✓; rushed vehicle, cascading in-orbit failures (undeployed solar panel, attitude control) ✓; parachute failure on reentry (drogue failed to extract main; manually-deployed reserve fouled) ✓; Komarov killed — first in-flight spaceflight fatality ✓. Prose framing (political pressure, known faults, "should never have flown") is consistent with the well-documented account.

Source: https://en.wikipedia.org/wiki/Soyuz_1 ; https://en.wikipedia.org/wiki/Vladimir_Komarov

---

## soyuz-11 — ISSUE (MEDIUM ×1)

### MEDIUM — "23 days aboard" overstated by one day (was 22)
- File/field: `i18n-src/en-US/missions/earth/soyuz-11.json` → `dispatch`, `description`, `events[].note` (label "DOCK — SALYUT 1")
- Quotes: dispatch "…spending **twenty-three days** on Salyut 1…"; description "The crew spent **23 days aboard the station.**"; DOCK note "…**23 days aboard.**"
- What's wrong: The crew docked June 7, 1971 and undocked June 29, 1971 — **22 days aboard Salyut 1** (Wikipedia and NASA both say "22 days"). The **23-day** figure belongs to the **total mission** (launch to death: 23 d 18 h 21 m). Prose conflates total-mission duration with time-aboard-station.
- Correction: "22 days aboard Salyut 1" (or keep 23 only if explicitly labeled total mission time, not time on station).
- Source: https://en.wikipedia.org/wiki/Soyuz_11 (docked Jun 7, undocked Jun 29 18:28 UTC; "22 days"; total mission 23 d 18 h)
- Confidence: HIGH

### Verified-clean on soyuz-11
Launch 1971-06-06 04:55 UTC Baikonur ✓; crew Dobrovolsky + Volkov + Patsayev ✓; first crew to a space station (Salyut 1) ✓; reentry 1971-06-30 (undock Jun 29 18:28, deorbit/death early Jun 30 UTC — prose says reentry "on 30 June", ✓); pressure-equalization valve opened at module separation, cabin depressurized at ~168 km ✓; unsuited crew, died within seconds (~<1 min) ✓; capsule landed normally ✓; "only humans to die above the Kármán line / in space proper" ✓ (168 km > 100 km — VERIFIED CORRECT, not an error).

Note: the recurring "24" MET on the DECOMPRESSION event ≈ ~24 days into mission — consistent with total-mission timing; fine.

---

## sputnik1 — PASS

Verified: launch 1957-10-04 19:28 UTC (prose 19:28:34) ✓; first artificial satellite ✓; 83.6 kg ✓; Ø 58 cm ✓; transmitters 20.005 + 40.002 MHz ✓; silver-zinc batteries ✓; batteries depleted 1957-10-26 (~22 days — prose says "21 days"/"~315 orbits", see note) ; reentry/burn-up 1958-01-04 ✓; inclination 65.1° ✓; period ~96.2 min ✓; Korolev / OKB-1 / R-7 / PS-1 "Prosteyshiy Sputnik" ✓; Khrushchev pitch ✓; triggered ARPA (1958) + NASA/Space Act (1958) ✓; ionospheric + atmospheric-density data from radio propagation + orbital drag ✓ ("first orbital ionospheric and atmospheric-density data" — supported; drag gave upper-atmosphere density ~3.8e-13 g/cc at ~220 km, beacon gave ionospheric electron density).

Trivial notes (NOT flagged as errors):
- "beeped ~21 days" / "315 orbits" — canonical figure is 21–22 days of transmission (Wikipedia "22 days"). Prose's "21 days" is within the accepted spread (some sources give 21, some 22); base data and prose are internally consistent. Borderline; leave as-is or standardize to 21–22.
- Orbit "215 × 939 km" — sources vary (Wikipedia gives 215 × 939 km apogee/perigee in one place, 223 × 950 km in another; NSSDCA differs slightly). 215 × 939 is a sourced pair. Not an error.
- "~1440 orbits" total to reentry — plausible (≈92 days × ~15 orbits/day ≈ 1380–1440); consistent with reentry MET ≈ day 92 (Oct 4 + 92 = Jan 4 ✓).

Source: https://en.wikipedia.org/wiki/Sputnik_1 ; https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1957-001B

---

## Cross-mission observation
The "last US crewed water landing until 2020" superlative is currently asserted on **skylab-4** (wrong) and is **absent** from **apollo-soyuz** (where it belongs). Fixing skylab-4 should move the claim to the ASTP editorial, not just delete it.
