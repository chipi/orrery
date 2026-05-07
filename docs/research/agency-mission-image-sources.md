# Agency mission imagery — build-time source map (ADR-046)

Evidence-backed notes for **where each operator publishes mission stills**, what Orrery can use **anonymously at build time** (CI / `npm run fetch-assets`), and **licensing**. Canonical mission ids and agency strings match `static/data/missions/index.json` plus legacy fetch ids `mars2`, `mars6` (Soviet Mars programme, same editorial class as `mars3`).

**Gate:** Implementation prefers **(A)** stable direct image URLs or JSON search APIs, or **(B)** **curated Wikimedia Commons** filenames verified in-repo, then **NASA Images API** as a broad fallback with a **strict credit filter** (extended only for named missions; see ADR-046).

---

## NASA

| Topic | Notes |
|--------|--------|
| **Primary** | [NASA Images API](https://images.nasa.gov/docs/images.nasa.gov_api_docs.html) — anonymous `GET`, JSON, preview `href` links suitable for build-time download. |
| **Fallbacks** | Wikimedia Commons for catalogue rows where API credits are thin; curated lists in `scripts/fetch-assets.ts`. |
| **Feasibility** | **Go** — already integrated. |
| **License / credit** | NASA media usage guidelines; `secondary_creator` filtered in code for US NASA–family strings. |

---

## ROSCOSMOS (incl. Soviet lunar / Mars heritage)

| Topic | Notes |
|--------|--------|
| **Primary operator** | [Roscosmos EN](https://www.roscosmos.ru/en/) — press releases and galleries; **no** stable public JSON image search comparable to NASA Images API found for machine bulk download. |
| **National wires** | TASS and partner outlets often mirror handouts; URLs are **HTML / CDN–opaque**, not suitable as deterministic CI fetches. |
| **Feasibility** | **No-go** for automated anonymous primary fetch without scraping or brittle HTML parsing (**red-list**). |
| **Implementation** | **Curated Commons** (`mars3`, `luna9`, `luna17`, `luna24`, legacy `mars2` / `mars6`) as editorial primary; NASA API **last**, with queries tuned to **historic cooperation / PIA** assets where credits remain honest. |

---

## ESA

| Topic | Notes |
|--------|--------|
| **Primary operator** | [ESA Science & Exploration images](https://www.esa.int/Science_Exploration/Space_Science), [Photolibrary](https://photolibrary.esa.int/) — browse-first web UI; image pages are **HTML** with assets behind site mechanics and session/cookie banners. |
| **Machine API** | No small, documented, **anonymous** JSON endpoint equivalent to NASA’s `/search` was identified for **bulk** mission stills suitable for this repo’s fetch script. |
| **Spike outcome** | **No-go** for a dedicated `fetchEsaImageUrls()` adapter in CI without auth, headless browsing, or contractual API access. |
| **Implementation** | **Curated Commons** for `mars-express` (hero + gallery). NASA fallback allowed only when `secondary_creator` matches extended allowlist for **`mars-express`** (partner / ESA-credited NASA archive entries). |

---

## CNSA

| Topic | Notes |
|--------|--------|
| **Primary** | CNSA / state press imagery is typically distributed via **Chinese state media** and exhibition photo sets; no assumed **stable anonymous JSON** image API for mission press packs. |
| **Feasibility** | **No-go** for automated primary HTTP adapter. |
| **Implementation** | **Curated Commons** for `tianwen1`, `change4`, `change5`, `change6`; NASA API **last** and **query-tuned** (often thin); do not prefer NASA over Commons for these ids. |

---

## ISRO

| Topic | Notes |
|--------|--------|
| **Primary** | ISRO press gallery / social distribution; public **Bhoonidhi**-class portals target **Earth observation products**, not Mars/Moon press galleries — wrong domain for hero sourcing. |
| **Feasibility** | **No-go** for EO API as mission gallery source. |
| **Implementation** | **Curated Commons** for `mangalyaan`, `chandrayaan1`, `chandrayaan3`; NASA fallback only with honest credits. |

---

## JAXA

| Topic | Notes |
|--------|--------|
| **Primary** | [JAXA Digital Archives](https://jaxa.repo.nii.ac.jp/), mission pages, SLIM/MMX press kits — **browse-first** or repository metadata; not a single obvious anonymous **image search JSON** for scripted gallery fill. |
| **Spike outcome** | **No-go** for a minimal anonymous adapter without deeper integration or scraping. |
| **Implementation** | **Curated Commons** for `slim`, `mmx`. NASA fallback with **`mmx` / `slim`-scoped** credit allowlist (`jaxa`, `isas`, etc.) where editorially appropriate. |

---

## UAESA / MBRSC (Hope)

| Topic | Notes |
|--------|--------|
| **Primary** | [Emirates Mars Mission](https://www.emiratesmarsmission.ae/) — official imagery; many pages are **marketing HTML** without stable direct JPEG URLs for CI. |
| **Spike outcome** | **No-go** for non-scraping automated primary fetch; verify **Terms** before any future HTTP adapter. |
| **Implementation** | **Curated Commons** + NASA fallback with query `emirates mars mission hope spacecraft`; allowlist may include `mbrsc`, `uae`, `emirates mars` for **`hope-probe`** only. |

---

## SpaceX

| Topic | Notes |
|--------|--------|
| **Primary** | Official site / X / **Flickr history** — URL patterns and CDNs change; bulk download risks **ToS** issues. |
| **Feasibility** | **No-go** for scraping `spacex.com`. |
| **Implementation** | **Curated Commons** for `starship-demo`, `starship-mars-crew`; NASA fallback only for clearly **NASA–SpaceX cooperation** results (credit filter). |

---

## Blue Origin

| Topic | Notes |
|--------|--------|
| **Primary** | Corporate press pages; no stable anonymous image API assumed. |
| **Implementation** | **Curated Commons** + tight NASA query for `blue-moon-mk1`. |

---

## Inspiration Mars

| Topic | Notes |
|--------|--------|
| **Primary** | Concept / foundation imagery — mixed rights; prefer **Commons** files with clear licenses aligned to mission `credit` in base JSON. |
| **Implementation** | **Curated Commons**; avoid misleading NASA-only Orion imagery unless copy ties the foundation concept to NASA hardware **and** credits remain accurate. |

---

## Pipeline order (implemented)

1. Optional **Commons hero** (`commonsCoverFirst`) → `01.jpg` + legacy card cover.  
2. **`fetchAgencyPrimaryImageUrls`** — returns NASA API preview URLs **only** when `normalizeAgency(agency) === 'NASA'`; otherwise `[]` (agency “primary” is the curated Commons pass).  
3. **Wikimedia** fallback + gallery lists.  
4. **NASA Images API** fill for remaining slots (non-NASA agencies), with **mission-scoped** credit extensions documented in ADR-046.

---

## Commons filename drift

Wikimedia Commons **renames or deletes** files over time. Curated lists in `scripts/fetch-assets.ts` are **spot-checked** with `Special:FilePath` during maintenance; broken `commonsCoverFirst` entries skip the hero and NASA search fills `01.jpg` with a **noisier** default.

**Maintenance recipe:** for each curated Commons title (`commonsCoverFirst` / `commonsHeroFirst` / `WIKIMEDIA_ISS_FALLBACK` / `wikimediaFallback` / gallery arrays in `scripts/fetch-assets.ts`), `GET`  
`https://commons.wikimedia.org/wiki/Special:FilePath/{urlencoded_title}?width=800`  
with a descriptive `User-Agent` and ≥300–500 ms between checks; on **404**, search `action=query&list=search&srnamespace=6` on Commons, skip `.pdf`/`.webm`/unrelated hits, then re-verify the replacement.

**Audits:** **2026-05-07** — mission `MISSION_IMAGE_QUERIES` + `WIKIMEDIA_MISSION_*`. **2026-05-07** — ISS module heroes + cupola/canadarm gallery lists; earth-object panel heroes (Hubble, Chandra, XMM, JWST, Galileo nav, Ceres, Halley, 67P, …); small-body gallery strings; moon-site `change3` Wikimedia list.

## Changelog

- **2026-05-06** — Initial map + ESA / JAXA / UAESA spike **no-go** for CI-grade HTTP adapters; Commons + NASA fallback strategy locked for implementation.
