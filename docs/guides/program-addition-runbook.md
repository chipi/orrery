# Adding a new program — runbook

The single prescribed path for bringing a new **program** (the editorial layer over missions + fleet, PRD-029) into Orrery — program by program. Companion to two docs you must read first:

- **[PRD-029](../prd/PRD-029.md)** — the *structure*: the editorial spine, the roster model, embedded images, badges, deep-links.
- **[programs-editorial-voice.md](programs-editorial-voice.md)** — the *voice*: the modern-Wired-field-historian register every section (and every mission dispatch) is written in.

Analogous to the [mission-addition runbook](mission-addition-runbook.md) and the [flyby-body runbook](flyby-body-addition-runbook.md). **Read this before hand-authoring program JSON.**

Worked example throughout: **Apollo** (`apollo`) — the reference implementation. When in doubt, open Apollo's files and match them.

## The model — hand-authored JSON over the *existing* catalog, gated by `validate-data`

A program is static JSON, validated by fail-closed gates. Three rules define the model:

1. **A program groups + narrates what already exists — it does not expand the curated set.** The roster **links** curated flagship missions/fleet we already model, and **names** the historically-important missions we *don't* (context, no page). Adding a program never obligates a new mission or fleet entry. (If a program genuinely needs a new mission, that's the [mission runbook](mission-addition-runbook.md) first, as its own decision.)
2. **The substance is editorial, in one voice.** Every program is a full-page editorial piece (like `/science`), not a data card. Write it against `programs-editorial-voice.md` — Apollo is the calibrated reference.
3. **English-first.** Ship the en-US editorial; translation follows when the locale tier ships (§11). `npm run validate-data` is your checklist — author → validate → fix what it flags → repeat until the only reds are the known English-first locale gaps.

---

## Touchpoints (in order)

### 1 · Base record — `static/data/programs/{id}.json`

Structured, non-translatable data. Schema: `static/data/schemas/program.schema.json`. Fields: `id`, `kind` (`crewed-campaign` | `robotic-campaign` | `station` | `infrastructure` | `funding-line`), `agency` / `agencies`, `country`, `start_year` / `end_year`, `status`, `epoch` (drives era grouping), `hero`, `roster`, `related_programs`, `badge`, `see_also`, `links`.

### 2 · Roster — link flagships, name context

`roster[]` items have these shapes ([UXD-033](../uxs/decisions/UXD-033-program-roster-links-and-milestones.md)):
- **Linked** (we model it): `{ ref: "mission" | "fleet" | "module", linked_id, role, note }` — a mission row is clickable and drives the timeline + master-detail pane; a fleet row is a hardware card; a module row opens the station page (`/<program id>?module=<id>`).
- **Context** (we don't): `{ name, year, note }` — flat text, no link. This is how a program legitimately mentions missions outside the curated set (Soviet lunar names Zond 5, whose mission is not modelled).
- **Context with a link** (an event about an entry we model): `{ name, year, note, link: { ref: "fleet" | "module", id, station? } }` — Challenger's loss links the Challenger craft; Columbus under ESA human spaceflight links `/iss?module=columbus` (`station: "iss"`). A `module` link names its station.
- **Milestone**: a context row plus `milestone: true` — an episode, phase, decision or plan inside the program (not a flight, a craft or a test). Drawn under "Milestones" after Missions, no link, no card.

**A row that names an entry that exists must link to it** (as `linked_id` for a mission, or `link` for a craft or module); `src/lib/programs-roster.test.ts` fails on a name-only row equal to a mission, craft or module name. Hardware rows are the flown vehicles of the program's linked missions (`fleet_refs`): launchers, spacecraft, landers, orbiters and rovers; launch sites are left out.

**Roster text is English in the base record and translated per locale.** A row's `note`, and the `name` of a name-only row, are English here; a locale shows them through its overlay's `roster` map (§3), or English where it has none. A **deployed-from** note (a probe launched from the Shuttle is not a Shuttle mission) goes on the linked row, e.g. `{ "linked_id": "galileo", "ref": "mission", "year": 1989, "note": "deployed from Atlantis's payload bay on STS-34 …" }`.

Keep cross-refs symmetric where the linked entity points back (e.g. a mission's `program`, if/when added).

### 3 · Editorial overlay — `i18n-src/en-US/programs/{id}.json`

The spine, en-US prose first. Schema: `program-overlay.schema.json`. Required: `name`, `tagline`, `the_land`, `goals`, `outcome`, `narrative`, `legacy`, `lessons`. Each spine section is an **ordered block list**: `{ type: "prose", md }` and `{ type: "figure", image, caption, align }`. Write every block against `programs-editorial-voice.md` §5 (per-section register). Do **not** repeat the hero lower down; prefer more, smaller, single-subject figures; no collages.

**Roster text in a locale overlay** — `i18n-src/{locale}/programs/{id}.json` may carry `roster: { "<key>": { "note": "…", "name": "…" } }`, only for the rows that locale translates; `getProgram()` lays it over the base roster (`src/lib/program-roster-overlay.js`). The key is the row's `rosterKey()`, never its array position, so inserting a row keeps every translation: **`ref:linked_id`** for a linked row (`mission:galileo`, `fleet:cassini` — a mission and its craft share an id), else the row's **English `name`** (`STS-1`). `note` replaces the note of any row; `name` replaces the name of a name-only row only (a linked row's name comes from the linked entry). There is no `roster` in the en-US overlay: the English is the base record, so one source. The base rows that are not in a locale's map show English, and are counted by `node scripts/i18n-coverage-scan.mjs` as `rosterMissing` per locale (reported, not gated); a key with no row is an `extraKey`, and `src/lib/program-roster-overlay.test.ts` fails on one. Staleness: `stale-overlays.mjs --manifest=check` (in `validate-data`) hashes every base roster note and name-only name under `programs-roster/{id}.json`, so a new or edited English note fails until the translations are re-checked and `--manifest=write` is run.

### 4 · Images — reuse-first

`figure.image` is either **reuse** (`{ reuse: "missions/apollo11/03" }` or `{ reuse: "fleet/saturn-v/02" }` — resolves into an existing gallery, provenance inherited) or **new** (`{ id: "the-land/sputnik" }` under `static/images/programs/{id}/`, which needs its own provenance + `/credits` entry). Reuse covers most beats; only resource what the editorial genuinely lacks.

### 5 · Badge — program insignia, PD/CC only

Add the program's insignia via the badge pipeline: an entry in `static/data/badge-sources.json` (`kind: "program"`), then `tsx scripts/fetch-badges.ts` → saves the original to `masters/badges/programs/{id}.<ext>` (git-LFS) and writes the derived `static/images/badges/programs/{id}.webp` (one 256 px icon) + `badges.json` + `badge-provenance.json`. It's a distinct lane from the display ladder — see [IMAGE-PIPELINE.md §"Badges are a separate lane"](../../scripts/IMAGE-PIPELINE.md). You do **not** need `git lfs pull` to source a badge; the dedup gate skips LFS stubs per file. **Licensing bar: Public Domain / CC only.** Mission patches and program insignia are usually available; **per-vehicle badges for older hardware are usually trademarked contractor logos and are excluded** (Apollo fleet correctly carries none). The UI gates every badge on `badges.json`, so an absent badge simply renders nothing — never a 404.

### 6 · Dispatches — **MANDATORY follow-up** (missions + hardware)

For **every mission *and* fleet asset the roster links** (`ref: "mission" | "fleet"` + `linked_id`), author a **`dispatch`** per `programs-editorial-voice.md` §6 — one lead paragraph rendered at the top of the entry's OVERVIEW tab. The angle depends on the target:
- **Missions** → the *why-it-matters* → `i18n-src/en-US/missions/{dest}/{id}.json`.
- **Fleet/hardware** → the *innovation + purpose* of that unique asset (what made it a first, why it had to exist) → `i18n-src/en-US/fleet/{category}/{id}.json`.

Neither is a spec/fact rehash. **Launch-site assets propagate automatically** — a `dispatch` on a `fleet/launch-site/*` entry is carried through by `earth-launch-site-adapter.ts` and shows on the `/earth` pad panel too (above the coordinate grid), with zero extra work. One dispatch, three surfaces: `/fleet`, the program roster, and `/earth`. Do this **while the program's context is loaded**, not later. Context-only roster entries (no `linked_id`) get none. This step is not optional — a program is not done until every linked mission and asset carries its dispatch.

### 7 · Deep-links — `see_also`

The program page draws only the sections that have rows (no hardware row: no Hardware heading), shows `related_programs` as a card rail (so list ids that exist in `programs/index.json`; do not repeat them as `see_also` rows of kind `program`, the page drops those) and `surface_sites` as a card rail (Earth objects such as `iss` link `/earth?object=<id>`). `see_also[]` (`{ label, href, kind: "body" | "science" | "explore" | "fleet" | "gallery" }`) sends the reader into the rest of Orrery — `/moon`, `/science` articles, `/explore`. Every program should hand off to the surfaces that continue its story.

### 8 · Prerender — `src/routes/programs/[id]/+page.ts`

No list to edit: `scripts/site-routes.mjs` (`programsRoutes`) makes every program in `static/data/programs/index.json` (step 9) a prerender entry, in every locale. The universal `load` builds the roster's `missionDetails` map — it must thread `event.fetch` (not global `fetch`) through `getProgram` / `getMissionIndex` / `getMission`, or relative data URLs throw at build.

### 9 · Index — `static/data/programs/index.json`

Add the program's index entry (id, name, tagline, agency, years, epoch, hero) so it appears on `/programs`, grouped by era **and** by agency.

### 10 · Nav — already wired

`/programs` is already in `Nav.svelte` (after Fleet). No per-program nav step.

### 11 · i18n — English-first, then translate at tier

Rebuild the bundle after any overlay edit: `node scripts/build-i18n-bundles.mjs` (writes `static/data/i18n/{locale}.json`; the bundle key is `programs/{id}.json` — **with** the `.json`). Programs ship **en-US only** at first. `validate-data` enforces all-14-locale overlays as core content, so a new program shows 13 expected locale-gap reds until translated — wire the **programs known-gap exemption** for the English-first phase (mirrors how audio/missions phase locales), and translate when the program's locale tier ships. The roster's notes and name-only names are translated separately, through the overlay's `roster` map (§3); an untranslated row is a `rosterMissing` count in the coverage scan, not a `validate-data` red.

### 12 · Validate

`npm run validate-data` is the done-signal. Green except for the known English-first locale gaps = ready.

---

## Validation = the done-signal

Author → `npm run validate-data` → fix what it names → repeat. A program is done when: base + overlay validate, every linked roster entry resolves, images have provenance, the badge (if any) is PD/CC, **every linked mission carries its dispatch**, the prerender entry + index entry exist, and the only remaining reds are the expected non-en-US locale gaps.

## Gotchas (learned in the Apollo dogfood)

- **Bundle key carries `.json`.** The overlay is keyed `programs/apollo.json` in the bundle; `getProgram` must request it with the extension. A key without `.json` silently misses.
- **Universal `load` needs `event.fetch`.** Relative data URLs (`/data/...`) throw under global `fetch` at prerender — thread the page's `fetch` through every `get*` call.
- **`entries()` is not automatic.** Every program `id` must be listed or its page is missing from the build.
- **Roster ≠ new content.** Naming a mission in the roster does not model it. Resist the pull to add missions "so the roster links resolve" — name them as context instead. The reverse also binds: a mission or craft that already exists is linked, never left as a context name.
- **Badges are PD/CC or nothing.** Don't reach for a trademarked contractor logo to fill a vehicle's badge slot; leave it empty (the UI hides it). Confirm the license on the Commons file page, not by eye.
- **Dispatches are part of the program, not a follow-up PR.** They ship with the program that motivated them — step 6, every time.

---

*Orrery · program-addition runbook · July 2026 — companion to PRD-029 + programs-editorial-voice.md. Apollo is the reference implementation.*
