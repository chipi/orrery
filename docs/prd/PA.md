# PA — Product Authority
*Orrery · Reference document · v1.0 · April 2026*

This is the reference document for the product plane. PRDs anchor to it by section. When audiences, promises, or principles change, this document is amended and the Changelog is updated.

---

## §audiences

Three audiences. They are not mutually exclusive.

**The curious learner.** Watched Perseverance land and wanted to understand more. Not a scientist, not an engineer — someone with genuine curiosity about space and the patience to click around. They want to understand *why* things work the way they do: why it takes seven months to reach Mars, why you can only launch every 26 months, why the Moon matters for getting there. They come for the visuals and stay for the explanation.

**The STEM student.** Taking physics, astronomy, or aerospace engineering. Knows the Hohmann transfer in principle but hasn't seen it move. Needs a tool that shows real numbers — vis-viva velocity, actual Keplerian elements, real mission delta-v budgets — not a cartoon. Uses Orrery alongside coursework. Will notice if the physics is wrong and will trust it more for being verifiable.

**The contributor.** A developer, data curator, or space enthusiast who wants to add a mission, fix a date, or build a new screen. Needs a codebase that is legible without archaeology and a data model simple enough to extend without touching code. The contributor's experience is part of the product.

---

## §promises

What Orrery commits to delivering. These are not aspirations — they are the things that, if absent, mean Orrery has failed.

**Real physics, not approximations that mislead.** Keplerian mechanics, vis-viva equation, real Keplerian elements from JPL, real Lambert solutions for porkchop plots. Simplifications are acceptable when they are educationally transparent. Simplifications that produce wrong intuitions are not. The curious learner should be able to trust every number they see.

**Real mission data, fully attributed.** Every mission has a real departure date, real transit time, real agency, real outcome. Every image carries a credit. Every number has a source. The data layer is the curation — finding the right sources, attributing them correctly, presenting them in a way that serves learners. The science belongs to the scientists; Orrery's contribution is the assembly.

**Works offline after first load.** The production build bundles all dependencies locally. The NASA Images API is the one intentional live dependency and degrades gracefully to a placeholder when unavailable. An internet connection should not be required to use the application.

**Educational at every level.** Every screen explains what it shows. Planet panels have OVERVIEW, TECHNICAL, and LEARN tabs. Mission panels have editorial descriptions and tiered links. The TECHNICAL tab shows the actual orbital mechanics, not a simplified proxy. The LEARN tab links to Wikipedia, NASA, Planetary Society, MIT OCW, and peer-reviewed papers — in three tiers so learners can go as deep as they want.

**Open source and contributable.** MIT licence. Adding a mission is editing a JSON file — no JavaScript required. The architecture makes contribution accessible to people who know the domain (space exploration) even if they don't know the codebase.

---

## §principles

How decisions are made when they are hard.

**Physics first.** When there is tension between visual appeal and physical accuracy, accuracy wins. When a simplification is needed for performance, it is documented and the simplification does not produce wrong intuitions. The curious learner and the STEM student both trust Orrery more for being honest about what it is and isn't doing.

**The prototype is ground truth.** The six prototype HTML files in `docs/prototypes/` are the authoritative reference for all design and physics decisions. When documentation disagrees with a prototype, the prototype is correct. When code disagrees with a prototype, the code is wrong. Prototypes were built before documents; documents were written to describe what was built.

**Data over code.** Mission data, orbital constants, rocket specs live in JSON files, not JavaScript. Updating a mission requires editing a JSON file and restarting. It does not require understanding the codebase. The data model is the most public-facing part of the architecture.

**Attribution is design.** Every data source is credited. Every image has a licence note. This is not a legal compliance step — it is a design principle. Orrery models the right relationship with the sources it depends on, and that relationship is visible to users. A student who sees a NASA credit learns that the image came from somewhere real.

**Fail honestly.** If a mission's data quality is poor, the UI says so. If a trajectory is approximate, the tooltip says so. If the Lambert solver finds no viable window, the UI does not hide the failure — it explains what running out of delta-v means. The product teaches more through honest failure than through smoothed-over success.

---

## Changelog

| Version | Date | Change |
|---|---|---|
| v1.0 | April 2026 | Initial version — audiences, promises, and principles extracted from concept package (01_Orrery_Vision.md, 02_Project_Concept.md) |
