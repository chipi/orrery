# Deep text, batch 5b: science review outcome

Objects: 47 Tucanae (`ngc-104`) and NGC 6752 (`ngc-6752`). Draft: `batch-05b.md` (commit `0194e8b5531`).

**Verdict: FIX-THEN-SHIP.** The fixes below are applied in the overlays.

## Findings and what was done

| # | Finding | Fix |
|---|---|---|
| 1 | Baumgardt and Vasiliev 2021 (2021MNRAS.505.5957B) is the distance paper; the masses come from Baumgardt's globular cluster database (N-body fits), not from that paper. | Text credits "Baumgardt's globular cluster database" for the masses. The bibcode stays on `dist_ly` only, never on a mass. |
| 2 | Milone et al. 2012 (47 Tuc): about 30% of the stars have primeval abundances, the rest are enriched in nitrogen and slightly in helium. "Enhanced nitrogen and helium" overstated the helium. | "about 30% of the stars have primeval abundances and the rest are enriched in nitrogen and slightly in helium"; the inference "did not all form alike" became "holds more than one stellar population". |
| 3 | Milone et al. 2010 (NGC 6752): the abstract supports "signs of", not "show". | "signs of more than one stellar population"; the broadened main sequence and the red giants' sodium and oxygen colour trend are stated separately. |
| 4 | Blue stragglers: "younger and more massive than the cluster" is loose; NASA says they look too young and massive for a cluster this old. | "stars that look too young and massive for a cluster this old, possibly made by collisions and mergers". |
| 5 | Lacaille's date: only the SEDS compilation gives 14 September 1751; no primary source was read. | Softened to "in 1751". |
| 6 | NGC 6752 distance: the Baumgardt table gives 4.12 kpc (13,438 ly), the per-cluster page 4.13 kpc. | The catalogue keeps 4.12 kpc; the `dist_ly` note reads "table 4.12 kpc; per-cluster page 4.13 kpc". The text says 13,400. |

## Not verified

- Lacaille's discovery rests on one secondary source (SEDS), hence the year only.
- "More than 40 radio pulsars" rests on one maintained list (Freire), not a paper.
- NGC 6752's "over 10 billion years" is NASA's popular wording; no measured age was read.
- The panel label for 47 Tucanae reads "~15,000 light-years" (two significant digits) while the text says 14,700, as for Omega Centauri; the text follows the catalogue value.
