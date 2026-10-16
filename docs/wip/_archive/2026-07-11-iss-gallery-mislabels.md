# ISS gallery mislabels (found 2026-07-11)

While building the `/programs` ESA + ISS pages I hit two data-quality bugs in
the **`fleet-galleries/iss`** gallery. Surfaced when I went to reuse ISS imagery
for the ESA-human and ISS program figures. Both are visible on the live
`/fleet` ISS panel and `/colophon` credits.

## The two bugs

| slot | served image (what it actually shows) | provenance credit (`image-provenance.json`) | problem |
|---|---|---|---|
| `iss/02.webp` | **the real ISS** — modern truss + arrays over Earth | `File:STS071-744-011 … Full view of the Mir` (STS-71, 1995) | **wrong credit** — a correct ISS photo attributed to an STS-71 *Mir* frame |
| `iss/03.webp` | **actually Mir** — the dark modular cross-shape, film frame `950704 114620 STS71 744 010` | `File:STS071-744-010 … Full view of the Mir` | **wrong image** — a Mir photo mis-filed in the ISS gallery |

`iss/01` (ISS, Aug 2005), `iss/04` (station from Crew Dragon) and `iss/05`
("Step Inside the ISS") are all correct ISS images — the contamination is
limited to slots 02 and 03, both traceable to STS-71 (the first Shuttle-Mir
docking, July 1995). Looks like two STS-71 Mir survey frames leaked into the
ISS gallery during an early sourcing pass; one slot was later overwritten with a
real ISS image but kept the Mir provenance row, the other was never replaced.

The `fleet-galleries/mir` gallery itself is clean (its images are correct
STS-89/81/74 Mir survey shots).

## Fix

Re-source **both** slots with fresh, known-provenance PD-NASA ISS images
(masters → WebP ladder + 1x1, corrected provenance rows), rather than trying to
back-derive the true source of the existing `iss/02` file. Folded into the ISS
capstone program slice (task #42) — the ISS page needs strong, correctly-
credited imagery regardless, so the fix and the enrichment happen together.

Status: **FIXED** — both slots re-sourced (ISS-56 2018 fly-around → `iss/02`,
STS-132 2010 → `iss/03`), full WebP ladder + 1x1 regenerated from new masters,
and the two provenance rows corrected to the real PD-NASA sources (tagged
`corrected-mislabel-iss-gallery`). `iss/02` is now the ISS program hero. Fixed
in the ISS program slice.
