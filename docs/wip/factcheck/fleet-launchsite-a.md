# Fleet launch-site fact-check — Batch A
13 entries · 2026-07-14

## Per-entry verdicts

| slug | verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| baikonur-1-5 | ISSUES | 0 | 1 | 1 | 0 |
| baikonur-200 | ISSUES | 1 | 0 | 1 | 0 |
| baikonur-31-6 | CLEAN | 0 | 0 | 0 | 1 |
| cape-canaveral-lc-36b | ISSUES | 0 | 1 | 1 | 0 |
| cape-canaveral-slc-40 | CLEAN | 0 | 0 | 0 | 0 |
| cape-canaveral-slc-41 | ISSUES | 0 | 0 | 1 | 1 |
| gagarins-start | ISSUES | 1 | 0 | 0 | 0 |
| jiuquan-slc-43 | ISSUES | 1 | 0 | 0 | 0 |
| kourou-ela-2 | ISSUES | 0 | 1 | 0 | 0 |
| kourou-ela-3 | ISSUES | 0 | 0 | 1 | 1 |
| kourou-ela-4 | CLEAN | 0 | 0 | 0 | 0 |
| lc-14 | ISSUES | 0 | 1 | 1 | 0 |
| lc-34 | ISSUES | 0 | 1 | 0 | 0 |

Totals: 🔴 3 · 🟠 5 · 🟡 6 · 🔵 3

---

## Severity key

- 🔴 Factually wrong — will mislead the reader
- 🟠 Incomplete or materially misleading omission
- 🟡 Minor inaccuracy / ambiguity / overlay-base mismatch
- 🔵 Informational note / low-confidence flag

---

## baikonur-1-5

### 🟠 MS-15 cutoff correct in base credit, but i18n description says "MS-15 in September 2019" and stops there

- **File+field:** `i18n-src/…/baikonur-1-5.json` → `description`
- **Quote:** "…the bulk of all Soyuz manifests through to MS-15 in September 2019."
- **Issue:** Correctly names MS-15 as last launch. Cross-check with `gagarins-start` entry (same physical pad, separate slug) shows MS-22 (2022) is stated there — creating a contradiction between two entries that describe the same pad. The base `credit` for baikonur-1-5 also says MS-15, which is correct.
- **Correction:** No change needed to baikonur-1-5 itself; see `gagarins-start` finding below.
- **Source:** https://en.wikipedia.org/wiki/Gagarin%27s_Start; https://en.wikipedia.org/wiki/Soyuz_MS-15
- **Confidence:** High

### 🟡 `status: RETIRED` vs `description` says "restoration funded but timeline uncertain"

- **File+field:** `static/data/fleet/launch-site/baikonur-1-5.json` → `status` / i18n `description`
- **Quote:** "Decommissioned for refurbishment; restoration is funded but the timeline is uncertain."
- **Issue:** The pad was officially transferred to Kazakhstan's ownership by June 2025 and is now designated as a museum monument — it will not be refurbished for launches. The "restoration funded" language is outdated; it reflects 2019–2022 plans that were subsequently abandoned.
- **Correction:** Description should read "preserved as a museum monument; the 2019-era refurbishment plan was abandoned when the site was transferred to Kazakhstan in 2025."
- **Source:** https://www.euronews.com/2025/05/09/kazakhstan-to-regain-legendary-soviet-space-launch-site-gagarins-start
- **Confidence:** High

---

## baikonur-200

### 🔴 `first_flight: "1980-03-14"` is wrong — Site 200 pads opened in 1977–1978, first Proton launches from LC-200 predate 1980

- **File+field:** `static/data/fleet/launch-site/baikonur-200.json` → `first_flight`
- **Quote:** `"first_flight": "1980-03-14"`
- **Issue:** Wikipedia on Baikonur Site 200 states: "construction starting in 1972, first pad completed in 1977 and the second in 1978." The first launches from LC-200/39 and LC-200/40 began in 1977/1978, not 1980. The 1980-03-14 date has no corroboration and is inconsistent with documented pad completion.
- **Correction:** `first_flight` should reflect the actual first LC-200 Proton launch (~1977 or 1978). Requires primary-source lookup of the first Proton-K launch from pad 200/39 specifically; candidate date is around 1977. Until confirmed, the date should be flagged or removed.
- **Source:** https://en.wikipedia.org/wiki/Baikonur_Cosmodrome_Site_200; https://www.russianspaceweb.com/baikonur_proton_200.html
- **Confidence:** High (1980 is wrong; exact correct date needs a primary source confirm)

### 🟡 i18n description says "Salyut stations" launched from Site 200; most Salyut modules launched from Site 81

- **File+field:** `i18n-src/…/baikonur-200.json` → `description`
- **Quote:** "multiple Salyut stations"
- **Issue:** The Salyut stations (1–7) were launched on Proton from Baikonur Site 81 (pads 23 and 24), not Site 200. Site 200 was built later (1977–78) for commercial and GEO heavy-lift Proton missions. Wikipedia confirms Site 81 as the Salyut launch site.
- **Correction:** Remove "multiple Salyut stations" from description, or replace with accurate payload types (GEO communications satellites, GLONASS, ISS modules Zarya and Zvezda, Mir modules, Luna-Glob).
- **Source:** https://en.wikipedia.org/wiki/Proton-K; https://en.wikipedia.org/wiki/Baikonur_Cosmodrome_Site_200
- **Confidence:** High

---

## baikonur-31-6

### 🔵 `era: "1957-1969"` label does not match the pad's present-day active crewed role

- **File+field:** `static/data/fleet/launch-site/baikonur-31-6.json` → `era`
- **Quote:** `"era": "1957-1969"`
- **Issue:** Site 31/6 has been the sole active crewed launch pad since 2020; labelling it with the 1957-1969 era is misleading even if it refers to the pad's construction era. This is a display/UX concern more than a factual error, but may confuse users.
- **Correction:** Consider `era: "2011-now"` or add a note in the UI that the era field reflects original construction.
- **Source:** https://en.wikipedia.org/wiki/Baikonur_Cosmodrome_Site_31
- **Confidence:** Medium (depends on what the `era` field means in the UI)

---

## cape-canaveral-lc-36b

### 🟠 Pioneer 11 launch pad is ambiguous — multiple sources disagree on LC-36A vs. LC-36B

- **File+field:** `i18n-src/…/cape-canaveral-lc-36b.json` → `description`, `best_known_for`; `static/data/…/cape-canaveral-lc-36b.json` → `best_known_for`, `credit`
- **Quote:** "Pioneer 11 (1973-04-06, first Saturn flyby)" listed as a mission of LC-36B in both overlay and base.
- **Issue:** Wikipedia's Pioneer 11 article and several corroborating sources state Pioneer 11 launched from LC-36A, not LC-36B. Astronautix and a NASA source say LC-36B. The discrepancy is real and unresolved in open literature. A YouTube upload of the Pioneer 11 launch video is titled "Cape Canaveral, LC-36B" (which is a primary-source label). However, the claim is contested enough to flag.
- **Correction:** Append a note of uncertainty, or cross-check against NSSDC records. If LC-36A is confirmed, remove Pioneer 11 from the LC-36B entry and add it to a potential LC-36A entry.
- **Source:** https://en.wikipedia.org/wiki/Pioneer_11; https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-019A; https://www.youtube.com/watch?v=Wyij1ZGUhjQ
- **Confidence:** Medium (genuine source conflict)

### 🟡 i18n tagline says "since 2015" for Blue Origin occupancy; this is correct but first New Glenn flight was 2025-01-16 — a ten-year gap worth noting

- **File+field:** `i18n-src/…/cape-canaveral-lc-36b.json` → `tagline`
- **Quote:** "now Blue Origin New Glenn (since 2015)"
- **Issue:** 2015 is the lease/demolition date, not first flight. The reader may interpret "since 2015" as operational. First New Glenn flight was January 16, 2025. This is not wrong but is ambiguous.
- **Correction:** Clarify: "now Blue Origin New Glenn (leased 2015, first flight 2025)".
- **Source:** https://en.wikipedia.org/wiki/Cape_Canaveral_Launch_Complex_36
- **Confidence:** High

---

## cape-canaveral-slc-40

No issues found. First flight date 1965-06-18 (Titan IIIC confirmed). SpaceX refit, AMOS-6 explosion and rebuild, current Falcon 9 cadence — all verified.

---

## cape-canaveral-slc-41

### 🟡 `description` says "rebuilt for Atlas V from 2002 onward" — first Atlas V launch at SLC-41 was actually August 21, 2002

- **File+field:** `i18n-src/…/cape-canaveral-slc-41.json` → `description`
- **Quote:** "rebuilt for Atlas V from 2002 onward"
- **Issue:** The old Titan III pad was demolished with explosives in October 1999 and an entirely new pad was erected. The first Atlas V launch (AC-001, Hot Bird 6) occurred on August 21, 2002. "From 2002 onward" is accurate but understates that the original Titan structure was completely removed, not "rebuilt." Minor.
- **Correction:** "Entirely demolished in 1999 and rebuilt as the Atlas V pad; first Atlas V flight 2002-08-21." The word "rebuilt" implies the same structure was adapted, which is wrong.
- **Source:** https://en.wikipedia.org/wiki/Cape_Canaveral_Space_Launch_Complex_41
- **Confidence:** High

### 🔵 Vulcan Centaur is already flying from SLC-41 (first flight January 8, 2024) — `description` says "slated to host Vulcan Centaur going forward" as if future

- **File+field:** `i18n-src/…/cape-canaveral-slc-41.json` → `description`
- **Quote:** "Slated to host Vulcan Centaur going forward."
- **Issue:** Vulcan Centaur's inaugural flight (Peregrine Mission One / VC2S) launched from SLC-41 on January 8, 2024. The "slated" framing is outdated — Vulcan is operational from this pad.
- **Correction:** "Also hosts Vulcan Centaur, which began flying from SLC-41 in January 2024."
- **Source:** https://en.wikipedia.org/wiki/Cape_Canaveral_Space_Launch_Complex_41
- **Confidence:** High

---

## gagarins-start

### 🔴 `best_known_for` and `credit` both claim "every crewed Soyuz through MS-22 (2022)" — the last crewed launch from Site 1 was MS-15 in September 2019

- **File+field:** `static/data/fleet/launch-site/gagarins-start.json` → `best_known_for`, `credit`; `i18n-src/…/gagarins-start.json` → `tagline`
- **Quote (base best_known_for):** "Baikonur Site 1 — Sputnik 1 (1957-10-04), Gagarin's Vostok 1 (1961-04-12), every crewed Soyuz through MS-22 (2022). Retired 2019"
- **Quote (base credit):** "every crewed Soyuz from Soyuz 1 (1967) through Soyuz MS-22 (2022) launched from Site 1."
- **Quote (i18n tagline):** "Baikonur Site 1 — Sputnik 1 (1957-10-04), Gagarin's Vostok 1 (1961-04-12), every crewed Soyuz through MS-22 (2022). Retired 2019"
- **Issue:** Direct factual contradiction. Soyuz MS-15 (September 25, 2019) was the last crewed launch from Gagarin's Start. Soyuz MS-16 (April 2020) onward launched from Site 31/6. Soyuz MS-22 was launched from Site 31/6 in September 2022. The entry says "Retired 2019" in the same field that says "through MS-22 (2022)" — an internal contradiction alongside the factual error.
- **Correction:** Replace "every crewed Soyuz through MS-22 (2022)" with "every crewed Soyuz through MS-15 (2019)." The retirement year 2019 is correct and should be retained.
- **Source:** https://en.wikipedia.org/wiki/Soyuz_MS-15; https://en.wikipedia.org/wiki/Baikonur_Cosmodrome_Site_31; https://en.wikipedia.org/wiki/Gagarin%27s_Start
- **Confidence:** High

---

## jiuquan-slc-43

### 🔴 Tianzhou cargo runs do NOT fly from Jiuquan SLC-43 — they fly Long March 7 from Wenchang

- **File+field:** `i18n-src/…/jiuquan-slc-43.json` → `description`, `tagline`, `best_known_for`
- **Quote (tagline / best_known_for):** "every Shenzhou crew, every Tianzhou cargo run"
- **Quote (description):** "Tianzhou cargo runs to Tiangong fly Long March 7 from the same complex."
- **Issue:** Long March 7 is Wenchang-only — it physically cannot launch from Jiuquan. All Tianzhou missions (1 through 10 as of 2026) have launched from LC-201 at Wenchang Space Launch Site in Hainan. Jiuquan SLC-43 launches Shenzhou on Long March 2F only.
- **Correction:** Remove all Tianzhou references from this entry. Tagline → "China's crewed-spaceflight pad — every Shenzhou crew". Description → delete the sentence "Tianzhou cargo runs to Tiangong fly Long March 7 from the same complex."
- **Source:** https://en.wikipedia.org/wiki/Long_March_7; https://en.wikipedia.org/wiki/Jiuquan_Satellite_Launch_Center; https://everydayastronaut.com/tianzhou-7-long-march-7/
- **Confidence:** High

---

## kourou-ela-2

### 🟠 Description and tagline say "flew every Ariane 4 mission (1988-2003)" — ELA-2 also flew Ariane 2 (×1) and Ariane 3 (×2) before Ariane 4

- **File+field:** `i18n-src/…/kourou-ela-2.json` → `description`, `tagline`, `best_known_for`; `static/data/…/kourou-ela-2.json` → `best_known_for`
- **Quote:** "ELA-2 … hosted all 116 launches of the Ariane 4 rocket between 1988 and 2003."
- **Issue:** ELA-2 hosted 119 launches total: 1 Ariane 2, 2 Ariane 3, and 116 Ariane 4. The first ELA-2 flight was Ariane 2 on 1986-03-28 (matching the `first_flight` date in base JSON), two years before the first Ariane 4. Saying it "hosted all 116 launches of the Ariane 4 rocket" is technically true but creates the false impression that Ariane 4 was the only rocket to fly from ELA-2. The tagline says "flew every Ariane 4 mission" which is accurate but the description's "hosted all 116 launches" phrasing drops the three pre-Ariane-4 missions.
- **Correction:** "ELA-2 hosted 119 Ariane launches (1986-2003): one Ariane 2, two Ariane 3, and 116 Ariane 4 flights."
- **Source:** https://en.wikipedia.org/wiki/ELA-2
- **Confidence:** High

---

## kourou-ela-3

### 🟡 ELA-3 maiden flight 1996-06-04 was a failure (Ariane 5 Flight 501 self-destructed 37 seconds after launch) — description does not mention this

- **File+field:** `i18n-src/…/kourou-ela-3.json` → `description`
- **Quote:** "ELA-3 hosted Ariane 5 from its maiden flight in 1996 through the final mission in July 2023"
- **Issue:** The maiden flight (Ariane 5 Flight 501 on 1996-06-04) was a spectacular failure: the rocket self-destructed 37 seconds after launch due to a guidance software overflow (the famous Ariane 5 integer overflow bug). The base entry correctly states `first_flight: "1996-06-04"` but the description says "from its maiden flight in 1996" implying a successful start. Not mentioning the failure is an omission that could mislead.
- **Correction:** Acknowledge the failure: "ELA-3 hosted Ariane 5 from its maiden flight in June 1996 — which failed 37 seconds after launch due to a software error — through the successful final mission VA261 in July 2023."
- **Source:** https://en.wikipedia.org/wiki/Ariane_5; https://en.wikipedia.org/wiki/ELA-3
- **Confidence:** High

### 🔵 Final flight designation: description says "final mission in July 2023" correctly (VA261, July 5 2023) — confirmed good

- **File+field:** `static/data/…/kourou-ela-3.json` → `last_flight: "2023-07-05"` ✓
- **Note:** Base last_flight and description final date are consistent and correct.
- **Source:** https://en.wikipedia.org/wiki/ELA-3
- **Confidence:** High

---

## kourou-ela-4

No issues found. VA262, July 9 2024, ELA-4, Ariane 62 — all confirmed. `first_flight: "2024-07-09"` ✓.

---

## lc-14

### 🟠 Description says "bronze Mercury 7 monument (added 1964)" and "donated by the Mercury 7 astronauts themselves" — the monument material is steel, not bronze, and was dedicated in 1964 not donated/given at programme close

- **File+field:** `i18n-src/…/lc-14.json` → `description`
- **Quote:** "A bronze Mercury 7 monument (added 1964) stands at the pad — donated by the Mercury 7 astronauts themselves at the close of the programme."
- **Issue:** The monument is made from the same metal alloy as the Atlas rockets — specifically described by the Cape Canaveral Space Force Museum and Space.com as "Washington Steel" (steel alloy), not bronze. Additionally, the Space.com article says the monument was "dedicated" on November 10, 1964 — the description's "donated by the Mercury 7 astronauts themselves" is an unsourced characterisation not confirmed by primary sources for this review; the monument was commissioned and dedicated, not simply donated by the astronauts.
- **Correction:** "A steel Mercury 7 monument was dedicated on November 10, 1964 at the pad." Remove "donated by the Mercury 7 astronauts themselves" or confirm with a primary source.
- **Source:** https://www.space.com/project-mercury-monument-time-capsule-60-years; https://ccspacemuseum.org/facilities/launch-complex-14/
- **Confidence:** High (steel vs bronze); Medium (donated language — unsourced but not disproven)

### 🟡 `description` says "LC-14 hosted four Atlas-Agena uncrewed missions before being deactivated in 1968" — deactivation was 1967 not 1968

- **File+field:** `i18n-src/…/lc-14.json` → `description`
- **Quote:** "After Mercury, LC-14 hosted four Atlas-Agena uncrewed missions before being deactivated in 1968."
- **Issue:** Confirmed sources (Wikipedia on LC-14; CCAFS Space Force Museum) state LC-14 was deactivated in 1967, then abandoned in place in 1973, declared a National Historic Landmark in 1984. The year "1968" appears to be an off-by-one error.
- **Correction:** "…before being deactivated in 1967."
- **Source:** https://en.wikipedia.org/wiki/Cape_Canaveral_Launch_Complex_14; https://ccspacemuseum.org/facilities/launch-complex-14/
- **Confidence:** High

---

## lc-34

### 🟠 Description says "four uncrewed Saturn I flights then was reconstructed for Saturn IB" — LC-34 actually launched four Saturn I (Block I) plus two Saturn IB uncrewed missions before Apollo 1, totalling six launches before the fire

- **File+field:** `i18n-src/…/lc-34.json` → `description`
- **Quote:** "LC-34's single steel umbilical tower hosted four uncrewed Saturn I flights then was reconstructed for Saturn IB."
- **Issue:** This is correct as far as Saturn I goes (SA-1 through SA-4), but the "then was reconstructed" phrasing skips over the two uncrewed Saturn IB flights (AS-201, February 26, 1966; AS-202, August 25, 1966) that launched from the reconstructed LC-34 before the Apollo 1 fire on January 27, 1967. A reader would believe LC-34 went directly from Saturn I to Apollo 1. The credit and dispatch do not mention AS-201/AS-202 at all.
- **Correction:** "LC-34's umbilical tower hosted four Saturn I flights (SA-1 through SA-4, 1961-1963), was then reconstructed for Saturn IB, and flew two uncrewed Saturn IB flights (AS-201 in 1966, AS-202 in 1966) before Apollo 1."
- **Source:** https://en.wikipedia.org/wiki/Cape_Canaveral_Launch_Complex_34
- **Confidence:** High
