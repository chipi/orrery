# Fact-check — Earth-orbit missions: Vostok / Voskhod / Shenzhou-1

**Reviewer:** science-reviewer (independent, web-verified)
**Date:** 2026-07-14
**Scope:** 9 missions × 2 files each (prose overlay `i18n-src/en-US/missions/earth/<slug>.json` + base data `static/data/missions/earth/<slug>.json`)
**Method:** Every claim assumed wrong until web-verified. Primary source: English Wikipedia mission pages, cross-checked against NSSDCA / spacefacts / astronautix / drewexmachina for contested dates & times.

---

## Per-mission verdicts

| Mission | Verdict | Highest severity |
|---|---|---|
| vostok-1 | PASS (minor) | LOW — perigee value disputed |
| vostok-2 | PASS | — clean |
| vostok-3 | **FAIL** | **HIGH — wrong landing time (~1h off) + wrong launch time** |
| vostok-4 | **FAIL** | **HIGH — wrong landing time (~1h off) + wrong "four minutes" gap** |
| vostok-5 | PASS (minor) | LOW — orbit count 81 vs 82 |
| vostok-6 | **FAIL** | **HIGH — fabricated "until Soyuz MS-22 in 2022" solo-woman caveat** |
| voskhod-1 | PASS (minor) | LOW — landing-site name unverified |
| voskhod-2 | **FAIL** | **HIGH — wrong rescue date; MED — O₂ fire event mistimed to "after re-entry"** |
| shenzhou-1 | **FAIL** | **HIGH — one-day date error (both files); MED — landing banner + orbit apogee** |

**Totals:** 9 missions · 5 FAIL / 4 PASS · HIGH: 5 · MED: 2 · LOW: 6 · **No Nedelin/R-16 contamination found (good).**

---

## vostok-1 — Vostok 1 (Gagarin) — PASS (minor)

Core narrative all correct: first human in space, 108 min, single orbit, ejected ~7 km, 12 Apr 1961 06:07 UTC, Baikonur Site 1, service-module strap partial failure → tumble, launch mass 4725 kg, Vostok-K 8K72K, Smelovka/Saratov landing. All verified. ✓

### LOW — perigee 169 km disputed
- **File/field:** prose `description` & `events[1].note`; base data (implied) — "orbit 169 × 327 km, inclination 65°"
- **Quote:** `"orbit 169 × 327 km, inclination 65°"`
- **Issue:** English Wikipedia gives perigee **181 km** × apogee 327 km, incl **64.95°**. NSSDCA and other sources list **169 km** perigee. Sources genuinely disagree on the perigee figure (measurement/epoch differences).
- **Correction:** Acceptable as-is (169 is a sourced value); optionally note the 181 km alternate. Inclination 65° ≈ 64.95° — fine.
- **Source:** https://en.wikipedia.org/wiki/Vostok_1
- **Confidence:** Medium (genuine source disagreement, not an error)

---

## vostok-2 — Vostok 2 (Titov) — PASS

All claims verified:
- 6 Aug 1961 06:00 UTC launch, landed 7 Aug 07:18 UTC near Krasny Kut ✓
- 17 orbits / ~25 h (Wikipedia: 17.5 orbits, 1 d 1 h 18 m) ✓
- Youngest person in space until **2021 (Oliver Daemen, Blue Origin NS-16)** ✓
- First space (motion) sickness, first sleep in orbit (~8 h), first hand-camera Earth photos ✓
- Launch mass 4731 kg ✓
- Titov age "25 years 10 months" — Wikipedia "a month short of 26" ✓
- **Source:** https://en.wikipedia.org/wiki/Vostok_2 · https://en.wikipedia.org/wiki/Gherman_Titov
- **Confidence:** High

---

## vostok-3 — Vostok 3 (Nikolayev) — FAIL

### HIGH — wrong landing time (~1 hour off)
- **File/field:** prose `description`; prose `events[2].note`
- **Quote:** `"Nikolayev landed 1962-08-15 07:55 UTC near Karaganda"` / `"Nikolayev landed near Karaganda 1962-08-15 07:55 UTC after 64 orbits."`
- **Issue:** Wikipedia and astronautix both give the Vostok 3 landing as **06:52 UTC**, not 07:55 UTC — an error of ~1 hour.
- **Correction:** Change `07:55 UTC` → `06:52 UTC`.
- **Source:** https://en.wikipedia.org/wiki/Vostok_3_and_4 · http://www.astronautix.com/v/vostok3.html
- **Confidence:** High (two independent sources agree on 06:52)

### HIGH — wrong launch time
- **File/field:** prose `description` + `events[0].note`; base data `departure_date` (date OK, time only in prose)
- **Quote:** `"launched 1962-08-11 08:30 UTC"` / `"Vostok-K from Baikonur Site 1 1962-08-11 08:30 UTC."`
- **Issue:** Wikipedia gives launch **08:24 UTC** (some sources 08:24:22). File says 08:30 UTC — ~6 min off.
- **Correction:** Change `08:30 UTC` → `08:24 UTC`.
- **Source:** https://en.wikipedia.org/wiki/Vostok_3_and_4
- **Confidence:** High

Correct in this file: 64 orbits ✓, ~4 days ✓, closest approach ~6.5 km ✓, no maneuvering capability ✓, launch mass 4722 kg ✓, Karaganda landing ✓. The dual-flight framing (first two crewed craft in orbit together, "magic trick" precise-launch, no rendezvous) is accurate.

---

## vostok-4 — Vostok 4 (Popovich) — FAIL

### HIGH — wrong landing time + wrong landing-gap ("four minutes")
- **File/field:** prose `description`; prose `events[2].note`
- **Quote:** `"Landed 1962-08-15 07:59 UTC near Karaganda, four minutes after Vostok 3."`
- **Issue:** Two errors. (1) Vostok 4 landed **06:59 UTC**, not 07:59 UTC (~1 h off). (2) With Vostok 3 landing at 06:52 UTC, the gap is **~7 minutes**, not "four minutes."
- **Correction:** `07:59 UTC` → `06:59 UTC`; `four minutes after` → `seven minutes after`.
- **Source:** https://en.wikipedia.org/wiki/Vostok_3_and_4 (V3 06:52, V4 06:59) · http://www.astronautix.com/v/vostok4.html
- **Confidence:** High

Correct: launch 12 Aug 1962 08:02 UTC (08:02:33) ✓, 48 orbits ✓, ~6.5 km closest approach ✓, first inter-craft voice comms ✓, launch mass 4728 kg ✓. The "coded thunder phrase misinterpreted as duress → ordered down early" anecdote is a widely reported (astronautix/Siddiqi) account — plausible, not contradicted; left as-is (Confidence: Medium on that anecdote).

Note: base data `transit_days: 3` for a 2 d 22 h 56 m flight — calendar-span rounding (11th→15th style); prose says "48-orbit"; internally consistent. LOW/none.

---

## vostok-5 — Vostok 5 (Bykovsky) — PASS (minor)

### LOW — orbit count 81 vs 82
- **File/field:** prose `name` (`first`), `description`, `events[2].note`
- **Quote:** `"4 days 23 hours, 81 orbits"` / `"81-orbit, 4-day-23-hour flight"`
- **Issue:** Wikipedia gives **82 orbits**; NSSDCA and some sources give **81**. Genuine source split. Duration 4 d 23 h ✓ (4 d 23 h 7 m).
- **Correction:** Acceptable (81 is sourced); optionally note "81–82 (sources vary)."
- **Source:** https://en.wikipedia.org/wiki/Vostok_5
- **Confidence:** Medium (source disagreement)

Verified correct & important: **longest solo Earth-orbital flight — still the record** ✓; launch 14 Jun 1963 11:59 UTC (11:58:58) ✓; landed 19 Jun 11:06 UTC ✓; planned **8-day** duration cut short by **solar-flare activity + orbital-decay** concern ✓; Vostok 6 launched during his flight ✓; launch mass 4720 kg ✓. Landing "near Karaganda" — precise site is ~2 km NW of Karatal, North Kazakhstan; "near Karaganda" is the conventional cite and acceptable (LOW). "Vostok 6 launched 2 days later" — calendar 14→16 = 2 days (Wikipedia phrases "three days after"); the file's arithmetic is defensible. LOW/none.

---

## vostok-6 — Vostok 6 (Tereshkova) — FAIL

### HIGH — fabricated "until Soyuz MS-22 in 2022" solo-woman caveat
- **File/field:** prose `description`
- **Quote:** `"the first woman in space, and (until Soyuz MS-22 in 2022) the only woman to have flown a solo space mission."`
- **Issue:** **Tereshkova remains the only woman ever to fly a solo space mission** — this is still true in 2026. Soyuz MS-22 (Sep 2022) was a **three-person** crew (Prokopyev, Petelin, Rubio); Anna Kikina was reassigned off it and flew on **Crew Dragon (SpaceX Crew-5)**, also a multi-person crew. There is no "until 2022" end to Tereshkova's solo record. The caveat is fabricated and reverses a true "still the only one" fact into a false "was surpassed" fact.
- **Correction:** Delete the parenthetical, or restate as `"and still the only woman ever to have flown a solo space mission."`
- **Source:** https://en.wikipedia.org/wiki/Valentina_Tereshkova · https://en.wikipedia.org/wiki/Soyuz_MS-22
- **Confidence:** High

Verified correct: first woman in space ✓; 48 orbits ✓; 2 d 22 h 50 m ✓ (prose "2-day-23-hour" ≈ ok); launched 16 Jun 1963 09:30 UTC (09:29:52) ✓; landed 19 Jun 08:20 UTC near Bayevo, Altai Krai ✓; upward-instead-of-downward attitude/orbit-correction error, spotted by her and corrected via uploaded data ✓; textile worker + amateur parachutist ✓; youngest woman to orbit Earth, age 26 ✓; US didn't match until 1983 (Sally Ride) — "unmatched by the US until 1983" ✓; "stood alone for nineteen years" (1963→1982 Svetlana Savitskaya) ✓; launch mass 4713 kg ✓.

Note: dispatch says woman-in-space milestone "unmatched by the United States until 1983" and description says "only 2 years after Gagarin" — both correct.

---

## voskhod-1 — Voskhod 1 (Komarov/Feoktistov/Yegorov) — PASS (minor)

Verified correct: **first multi-crew (3-person) spaceflight** ✓; no spacesuits, no ejection seats ✓; launched 12 Oct 1964 07:30 UTC, landed 13 Oct 07:47 UTC ✓; 16 orbits ✓; ~1 day ✓; Voskhod 11A57 launcher ✓; Khrushchev deposed during the flight ✓; launch mass 5320 kg ✓; crew Komarov/Feoktistov/Yegorov ✓.

### LOW — landing-site name "Marevka" unverified
- **File/field:** prose `description` + `events[2].note`
- **Quote:** `"Landed 1964-10-13 07:47 UTC near Marevka, Kazakhstan"` / `"touchdown near Marevka 1964-10-13 07:47 UTC."`
- **Issue:** Wikipedia gives coordinates 52°02′N 68°08′E (Kustanai/Kostanay region, Kazakhstan) but does not name "Marevka." Could not confirm the toponym in the sources checked; astronautix cites "312 km NE of Kustanai." Not contradicted, but unverified.
- **Correction:** Verify "Marevka" against a Russian-language source, or change to "near Kustanai, Kazakhstan."
- **Source:** https://en.wikipedia.org/wiki/Voskhod_1
- **Confidence:** Low (unverified toponym, not a proven error)

---

## voskhod-2 — Voskhod 2 (Belyayev/Leonov) — FAIL

### HIGH — wrong rescue/recovery date
- **File/field:** prose `description`; prose `events[4].note`
- **Quote:** `"before rescue helicopters arrived 1965-03-20"` / `"recovery helicopters reached them 1965-03-20."`
- **Issue:** They landed 19 Mar 1965 (09:02 UTC) and spent **two nights** in the forest; rescuers on skis reached them and they were extracted on **21 March 1965** ("3 days, two nights"). The date **20 March is wrong** — should be **21 March**. (The dispatch's "waited out a night" — singular — also understates it as one night; it was two.)
- **Correction:** `1965-03-20` → `1965-03-21` in both places; dispatch "waited out a night" → "waited out two nights."
- **Source:** https://en.wikipedia.org/wiki/Voskhod_2 ("3 days, two nights"; skied 9 km after the second night)
- **Confidence:** High

Note: base data `arrival_date: 1965-03-19` is the **landing** date and is correct; it's the *rescue* date in prose that's wrong. The events note also says "2 nights" (correct) but pairs it with the wrong 03-20 date — internally inconsistent with "2 nights" (2 nights after a 19 Mar landing = 21 Mar).

### MED — O₂-rich fire risk mistimed to "after re-entry"
- **File/field:** prose `description`
- **Quote:** `"The cabin atmosphere also became O₂-rich after re-entry, briefly risking spontaneous combustion."`
- **Issue:** The 45%-oxygen fire-hazard buildup happened **in orbit**, not after re-entry: after Leonov's EVA the descent-module hatch would not fully re-seal, so the environmental control system flooded the cabin with O₂ to compensate over the orbital phase (~24 h). "After re-entry" is wrong — by re-entry the cabin was already O₂-rich, and the hazard was an orbital-phase problem. (The event itself is real — this is a mechanism/timing error, not a fabrication.)
- **Correction:** `"after re-entry"` → `"in orbit, after the EVA hatch failed to re-seal"` (or similar).
- **Source:** https://en.wikipedia.org/wiki/Voskhod_2 · https://www.smithsonianmag.com/air-space-magazine/the-nightmare-of-voskhod-2-8655378/ · https://www.drewexmachina.com/2015/03/18/the-mission-of-voskhod-2/
- **Confidence:** High

### LOW — off-target distance 390 km vs 386 km
- **File/field:** prose `description`; `events[3].note`
- **Quote:** `"~390 km off-target"` / `"390 km off-target hard landing in Perm Oblast snow."`
- **Issue:** Wikipedia gives **386 km (240 mi)**. Rounding to 390 is within tolerance.
- **Correction:** Optional: 386 km (or keep "~390 km").
- **Source:** https://en.wikipedia.org/wiki/Voskhod_2
- **Confidence:** High (both figures effectively agree)

Verified correct: **first EVA in history** ✓; Leonov 12 min (12 min 9 s) outside 18 Mar 1965 ✓; inflatable Volga airlock ✓; suit ballooned → vented pressure to re-enter ✓; automatic landing system failed → Belyayev manual descent ✓; landed in Perm-region taiga/forest ✓; orbit 167 × 475 km, 64.8° ✓; launch 18 Mar 07:00 UTC ✓; launch mass 5682 kg ✓; crew survived ~−30 °C, wolves anecdote (widely reported) ✓. Note the `events[3].note` says "Perm Oblast" while dispatch says "Urals" — both consistent (Perm is in the Urals). The `events[4]` "2 nights" is correct; only the paired date is wrong (see HIGH above).

---

## shenzhou-1 — Shenzhou 1 (uncrewed) — FAIL

### HIGH — one-day date error (BOTH files)
- **File/field:** prose `description` + `events[0].note` + `events[3].note`; **base data** `departure_date`, `arrival_date`
- **Quote (prose):** `"Launched 1999-11-20 22:30 UTC"` … `"recovery on the Inner Mongolia steppe 1999-11-21 19:41 UTC"`; `"Capsule descended to Siziwang Banner, Inner Mongolia, 1999-11-21 19:41 UTC."`
- **Quote (base):** `"departure_date": "1999-11-20"`, `"arrival_date": "1999-11-21"`
- **Issue:** In UTC the launch was **19 November 1999 22:30 UTC** and recovery **20 November 1999 19:41 UTC**. The files label the times as UTC but use the **Beijing-local calendar date** (UTC+8: 22:30 UTC 19 Nov = 06:30 CST 20 Nov). So every date is one day late for the stated UTC times. Either the dates must shift back one day (to keep the UTC label) or the times must be relabeled as local (CST). As written, date+time+"UTC" is internally inconsistent with the source.
- **Correction:** For UTC labels: launch `1999-11-19 22:30 UTC`, recovery `1999-11-20 19:41 UTC`; base `departure_date: 1999-11-19`, `arrival_date: 1999-11-20`.
- **Source:** https://en.wikipedia.org/wiki/Shenzhou_1 (launch 19 Nov 1999 22:30 UTC; landing 20 Nov 1999 19:41 UTC; duration 21 h 11 m)
- **Confidence:** High

### MED — landing banner: "Siziwang Banner" vs "Dorbod Banner"
- **File/field:** prose `events[3].note`
- **Quote:** `"Capsule descended to Siziwang Banner, Inner Mongolia"`
- **Issue:** Wikipedia states Shenzhou 1 landed in the **Dorbod (Darhan Muminggan) Banner** area, ~415 km east of the launch site, ~110 km NW of Wuhai. **Siziwang Banner** is the *standard Shenzhou crewed-return* landing zone (Shenzhou 5+), not where Shenzhou 1 came down. Likely a mix-up with the later main landing site.
- **Correction:** Verify; Wikipedia supports "Dorbod Banner" for Shenzhou 1. If kept as Siziwang, cite a source.
- **Source:** https://en.wikipedia.org/wiki/Shenzhou_1
- **Confidence:** Medium (Wikipedia is explicit but Chinese primary sources vary on banner naming)

### MED — orbit apogee 324 km vs 315 km
- **File/field:** prose `description` + `events[1].note`
- **Quote:** `"196 × 324 km, 42.6° inclination"`
- **Issue:** Wikipedia gives **195 × 315 km**, incl 42.6°. Perigee 196≈195 fine; **apogee 324 vs 315 km** is a ~9 km discrepancy. Inclination ✓.
- **Correction:** Consider `195 × 315 km` (or cite the 324 source).
- **Source:** https://en.wikipedia.org/wiki/Shenzhou_1
- **Confidence:** Medium

### LOW — launch pad designation
- **File/field:** prose `events[0].note` ("Jiuquan SLC-43"); base `fleet_refs[2].id` = `jiuquan-slc-43`
- **Quote:** `"Long March 2F maiden flight from Jiuquan SLC-43"`
- **Issue:** Wikipedia lists the pad as **LA-4 / SLS-1** (Launch Area 4). "SLC-43" (a Cape Canaveral designation style) is not the standard Jiuquan pad name; the correct local designation is LA-4/921 pad. This propagates to the fleet_ref id.
- **Correction:** Verify pad naming; standard is Jiuquan LA-4 (SLS-1 / 921 pad).
- **Source:** https://en.wikipedia.org/wiki/Shenzhou_1 · https://en.wikipedia.org/wiki/Long_March_2F
- **Confidence:** Medium

Verified correct: **first uncrewed Chinese/Shenzhou test flight** ✓; LM-2F maiden flight ✓; 14 orbits ✓; 42.6° incl ✓; carried seeds (~100 kg) + flag ✓; uncrewed prototype with mock-up systems, no life-support ✓; launch mass 7600 kg ✓; led directly to Shenzhou 5 (2003, Yang Liwei) ✓; Jiuquan ✓; Inner Mongolia recovery ✓. Type label "CREW-RATED TEST · UNCREWED · FLOWN" is accurate.

---

## Cross-cutting notes

- **Nedelin / R-16 disaster:** NOT attributed to any Vostok file. No contamination found. ✓
- **`delta_v: "~9.4 km/s (LEO)"`** appears identically across all base files — a nominal LEO-insertion figure, not a per-mission measured value; acceptable as a coarse constant but note it is not mission-specific.
- **`transit_days`** in base data reflects calendar span, occasionally rounding oddly against orbit-based duration (e.g. vostok-4 `3` for a 2 d 22 h flight; vostok-6 `3` for 2 d 22 h; voskhod files `1`). Internally consistent with departure/arrival dates; low concern.
- **Landing-time convention:** the Vostok 3/4 ~1-hour landing-time errors (07:55/07:59 vs 06:52/06:59) look like a systematic offset, not random — worth checking whether other Vostok-era files share the same +1h drift.
