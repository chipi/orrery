# Search backlog — what the 0.9.9 arc could not search (2026-11-15)

The session's web-search budget ran out (400 of 400) while slices D4, H and L46 were in
flight. Each item below was done with direct page fetches or Commons only, so it is
either held at a safe fallback or rests on secondary sources. Next session with a fresh
search budget: work this list top to bottom, then strike each row here.

| # | Slice | What is missing | Current state on the branch | What to search | Done when |
|---|---|---|---|---|---|
| S1 | D4 (832af819e6f) | A surveyed traverse for **Chang'e 3 / Yutu** | 9-point outline, `approximate: true`, labelled "Approximate route" in 14 locales | Peer-reviewed Yutu traverse maps (e.g. papers in *Nature Communications*, *Science*, *Icarus*, *PSS* with rover path figures or coordinate tables); CNSA / CLEP releases; LROC NAC images of the rover tracks (lroc.im-ldi.com featured sites had none, 2026-11-15) | A cited coordinate source replaces the outline and `approximate` is dropped, or the search is recorded as exhausted here |
| S2 | D4 | A surveyed traverse for **Chandrayaan-3 / Pragyan** | Same as S1 | ISRO's rover-track release (navcam / Pragyan path image of Aug-Sep 2023), peer-reviewed Pragyan papers, LROC NAC imagery of the Shiv Shakti point | Same as S1 |
| S3 | H (brief 775492b2b65) | Agency sources for the **Chandrayaan-2** facts table | Numbers rest on Wikipedia; ISRO, NSSDCA and NASA Vikram pages returned 404 to the fetcher | ISRO mission page and press releases, NSSDCA master catalog (2019-042A), LROC Vikram impact-site release | Every number in the H facts table cites an agency or peer-reviewed source |
| S4 | H | Agency sources for the **Kaguya / SELENE** facts table; the instrument count (Wikipedia 13 vs ISAS 15) | Wikipedia + ISAS + ESA Commons; instruments named without a count | JAXA / ISAS SELENE project pages, NSSDCA (2007-039A), the SELENE instrument papers (Earth Planets Space / Space Science Reviews) | Same as S3; the count is settled or kept uncounted with a cited reason |
| S5 | L46 (684e92bb280 ...) | Photos for **18 outer-scale rows** with no candidate: Sextans dwarf, the Local Group row, Virgo Supercluster, Pavo-Indus, Laniakea, Canes Venatici Spur, Ursa Major Cloud, Hydra-Centaurus, Sloan Great Wall, Horologium-Reticulum, Boötes Void, the Virgo II groups, the Ophiuchus supercluster, and the five Milky Way arms (Perseus, Scutum-Centaurus, Sagittarius, Norma, Orion Spur) | Rows keep the plain dot (no thumbnail) | esahubble.org, eso.org/public/images, noirlab.edu/public/images, NASA Images API, Chandra photo album, Legacy Survey / DESI cutouts; for structures, survey maps with a free licence (2MASS, SDSS, Cosmicflows) | Each row has an approved photo or "no free image exists" recorded here |
| S6 | L46 | **Weak or dropped picks** worth a better source: deep-sky M18, M25, M36, M62, M67; the 6 faint dwarfs; the 3 doubtful stand-ins (Great Attractor, Sagittarius dSph, Fornax-Eridanus); the 3 faint star hosts (TRAPPIST-1, TOI-700, Kepler-16) | Dropped by the operator's 2026-11-15 approval; rows keep the dot | The same agency archives as S5; for the hosts, an artist's impression is NOT a photo (skip unless the operator rules otherwise) | Better candidates staged for the operator, or the row recorded as final |
| S7 | L46 | Phase-1 licence reads came from Commons `extmetadata`, re-read via the API in phase 2, not from each rendered file page; WikiSky / Hubble Legacy Archive derivatives carry Commons' "public domain" label | Shipped with the API licence | Open each WikiSky / HLA-derived file page and its upstream terms | Each such row confirmed or replaced |

Rules that apply when this list is worked: agency-first sources; no invented coordinates
or numbers; image candidates go to staging for per-image operator approval; text changes
in all 14 locales by hand; size any paid run first (none expected here).
