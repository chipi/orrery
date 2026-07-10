# Adding a site story — runbook

The prescribed path for bringing a narrative sidecar (intro + chapters + images) into a mission or landing site. Site stories are optional but first-class: a rich multi-chapter gallery paired with a prose intro, rendered in the SiteStoryPanel when accessed via mission detail. **Read this before hand-authoring site-story JSON.**

Worked example throughout: **Apollo 11** (`apollo11`), the first crewed Moon landing.

## The model — hand-authored JSON, gated by `validate-data`

A site story is static JSON validated by fail-closed gates. **`npm run validate-data` is your checklist**: it names every missing/asymmetric touchpoint. Author → `validate-data` → fix what it flags → repeat until green. Site stories are bundled into the iOS/Android apps and render on mobile + TV through the same SiteStoryPanel component — no per-device step.

### Design intent — curate narrative, never invent content

- **Intro + chapter text are hand-authored.** Write the prose, source the story from mission records (NASA/ESA/JAXA/CNSA/ROSCOSMOS archives, peer-reviewed papers, crew interviews).
- **Images are sourced through the existing image pipeline** (same workflow as mission galleries). Site stories reference images already in the mission gallery or sourced fresh via the pipeline.
- **Translations are core content.** All 14 locales must be authored before the story is done — this is the same tier as the hero image. A story rendering English into 13 locales is half-authored, not shipped.

## The schema

A site story file lives at `static/data/site-stories/<siteId>.json` and carries this shape:

```json
{
  "site": "apollo11",
  "intro": "A short (1–3 sentence) narrative hook: context, stakes, outcome.",
  "chapters": [
    {
      "id": "hardware",
      "title": "Hardware",
      "subtitle": "Saturn V + Command Module Columbia + Lunar Module Eagle",
      "images": [
        {
          "src": "/images/missions/apollo11/01.webp",
          "caption": "The alt-text + descriptive caption (read by screen readers, shown in lightbox)."
        }
      ]
    }
  ]
}
```

**Field reference:**
- **`site` (required, string):** kebab-case ID matching the mission/site (e.g. `apollo11`, `curiosity`, `chang-e-3`). Must match a real mission in the index.
- **`intro` (required, string):** 1–3 sentences setting the narrative frame. ~100–200 characters preferred (readable in the story header before chapter tabs).
- **`chapters` (required, array):** at least 1 chapter. Each carries:
  - **`id` (required, string):** kebab-case identifier (`hardware`, `launch`, `surface`, `science`, `people`). Canonical ids get localized chapter titles (see "Rendering" below); custom ids render the `title` field verbatim.
  - **`title` (required, string):** display name for the chapter rail.
  - **`subtitle` (optional, string):** subheading (often specs or context). Omit if the title suffices.
  - **`images` (required, array):** at least 1 image. Each carries:
    - **`src` (required, string):** relative URL path to the image (usually `/images/missions/<id>/<N>.webp` from the mission gallery, or `/images/hotspots/<planet>/<site>/<name>.jpg` from hotspot panoramas).
    - **`caption` (required, string):** the image's alt-text + descriptive caption. Screen-reader users see this via `aria-label`; sighted users see it in the lightbox. ~80–160 characters.

**No image refs outside the mission/site's own gallery.** Reuse the mission's hero + numbered files (01.webp, 02.webp, etc.) or hotspot panoramas; do not link to external URLs.

## Touchpoints (in order)

| # | Touchpoint | File | Required | Notes |
|---|---|---|---|---|
| 1 | **Base record** | `static/data/site-stories/<siteId>.json` | ✅ | hand-author; schema above |
| 2 | **Index entry** | `static/data/site-stories/index.json` | ✅ automatic | run `npm run build-site-stories-index` after creating the base file |
| 3 | **Image refs** | `/images/missions/<id>/*` or `/images/hotspots/<planet>/<site>/*` | ✅ | sourced via the [image pipeline](image-pipeline-v2.md#adding-a-new-gallery-image) |
| 4 | **en-US overlay (optional, reserve for future edits)** | `i18n-src/en-US/site-stories/<siteId>.json` | optional | editorial tweaks to the base; usually omitted |
| 5 | **Translations (all 14 locales)** | `i18n-src/<locale>/site-stories/<siteId>.json` | ✅ **required** | [see "Translations" below](#translations--core-content-not-optional) |

### 1 · Base record

Author the JSON following the schema above. Canonical chapter ids are `hardware`, `launch`, `surface`, `science`, `people` — use these where they fit the story arc. Custom ids are allowed (e.g., `crew`, `discovery`, `legacy`) and fall back to rendering `chapter.title` verbatim in the UI.

Copy the shape from an existing story:
```bash
cat static/data/site-stories/apollo11.json | jq . > static/data/site-stories/my-new-story.json
# Edit the new file to fit your mission.
```

**Image path notes:**
- If the mission already has a gallery (hero + numbered images), reuse those: `/images/missions/<id>/01.webp`, `/images/missions/<id>/02.webp`, etc.
- Hotspot panoramas (e.g., Mars rover vistas): `/images/hotspots/mars/<site>/tier3-pan.jpg` or `/images/hotspots/moon/<site>/<panorama-id>.jpg`.
- **Do not invent image paths.** Validate that the image exists before committing (check the static directory or verify via the image pipeline's provenance manifest).

### 2 · Index entry — automatic

After creating the base file, regenerate the index:
```bash
npm run build-site-stories-index
```

This scans `static/data/site-stories/` for all `.json` files, builds the id list, and writes `static/data/site-stories/index.json`. The loader probes this index before fetching stories — without an index entry, a story cannot be loaded (hard membership gate, to avoid 404 console noise for every launch site that doesn't have a story).

### 3 · Image refs — sourced via the pipeline

Image paths must resolve to real WebP files in the static directory. If the mission has an existing gallery (e.g., `static/images/missions/apollo11/`), reuse those paths. If you need new images, source them via the **[image pipeline runbook](image-pipeline-v2.md#adding-a-new-gallery-image)** — the same workflow as mission galleries.

For Apollo 11, the images already exist in the mission gallery:
- `/images/missions/apollo11/01.webp` (Saturn V on launch pad)
- `/images/missions/apollo11/02.webp` (liftoff, July 16)
- `/images/missions/apollo11/03.webp` (Buzz Aldrin on lunar surface)
- etc.

Each image carries provenance (agency, photographer, source) in `static/data/image-provenance.json`. The SiteStoryPanel reads provenance at render time and badges each image with the agency's name + accent color (NASA blue, ESA teal, etc.).

### 4 · en-US overlay (optional, for future edits)

Site-story overlays (like mission overlays) allow editorial tweaks without re-shipping the base file. An overlay is optional at authoring time — the base story stands alone. If you need to edit the intro or chapter text later (e.g., fact-check, wording polish), author an overlay file at `i18n-src/en-US/site-stories/<siteId>.json`:

```json
{
  "intro": "Revised intro text",
  "chapters": [
    {
      "id": "hardware",
      "title": "Revised title",
      "subtitle": "Revised subtitle",
      "images": [
        {
          "src": "/images/missions/apollo11/01.webp",
          "caption": "Revised caption"
        }
      ]
    }
  ]
}
```

Only fields that differ from the base are required. Image paths, chapter ids, and overall structure stay shared. This is a **future-proofing tool** — at authoring time, keep the base file clean and skip the overlay unless you're revising an existing story.

### 5 · Translations — CORE content, not optional

**Localization is content work — the same tier as sourcing the hero image, and it cannot be skipped.** All 14 locales must be authored before the story is done. When the `validate-data` build finishes, run:

```bash
set -a; source .env; set +a
node scripts/translate-i18n-gaps.mjs   # scans for missing locale overlays + fills them (Claude API, ADR-033)
npm run i18n:compile
```

This scans `static/data/site-stories/<siteId>.json`, detects that overlays are missing for all 14 locales, and auto-generates them via the Claude API. The generated overlays are reviewed (intentionally rough translations → iterate locally if needed), then compiled into the per-locale bundles at build time.

**A story rendering English into 13 locales is not shipped — it's half-authored.** Treat translation as a non-negotiable part of authoring, same as sourcing the hero image (see AGENTS.md §"Localization is core content").

## Validation = the done-signal

```bash
npm run validate-data     # schema + overlay-completeness + image-path validation
npm run preflight         # full pre-push (typecheck → lint → test → validate → build)
npm run preview           # eyeball the story at localhost in /missions/<mission-id>
```

Each `validate-data` failure names the touchpoint and usually the fix command — treat it as the interactive checklist.

## Rendering and UI

**Canonical chapter ids** (`hardware`, `launch`, `surface`, `science`, `people`) get localized chapter titles via the SiteStoryPanel's `CHAPTER_TITLE_MESSAGES` map. Custom chapter ids render their `title` field verbatim (in English).

**Images** are badged with agency name + accent color (NASA, ESA, CNSA, ROSCOSMOS, ISRO, JAXA, SPACE-IL, or a neutral CREDIT pill if provenance is missing). A lightbox shows the full caption on click.

**Locale fallback** works like missions: if a locale overlay is missing, the base story (English) is rendered gracefully. But for user-visible UX (text flowing into a user's language), a story with no translated overlay is incomplete — the locale bundle build will flag it.

## Gotchas (learned in early site-story work)

- **i18n overlays are NOT optional.** All 14 locales are required. A story that renders English into 13 locales looks complete on `/missions` but is unfinished per AGENTS.md.
- **`site` id must match a real mission or site.** The loader probes `site-stories/index.json` first and returns null if the id is not present — avoiding speculative 404 fetches for every launch site without a story.
- **Image paths must exist.** Validate that `/images/missions/<id>/<N>.webp` or `/images/hotspots/<planet>/<site>/<name>.jpg` is physically present before committing. A broken path breaks the story rendering (no fallback image, just an empty slot).
- **Captions are load-bearing.** `caption` is used as both alt-text (for screen readers) and the lightbox label (for sighted users). Write captions as full sentences, not terse tags.
- **Chapter ids are case-sensitive.** `Hardware` (capital H) will not match the canonical `hardware` and will fall back to rendering the `title` field instead of the localized chapter name.

## Cross-links

- **[Mission-addition runbook](mission-addition-runbook.md)** — adding the mission itself (base data, fleet, flight, gallery images).
- **[Image pipeline runbook](image-pipeline-v2.md)** — sourcing + crediting images.
- **AGENTS.md §[Localization is core content](../../AGENTS.md#localization-is-core-content)** — why all 14 locales are required at authoring time.
- **[TA.md](../adr/TA.md)** — architecture overview; site stories are covered under the mission detail panel section.

---

*Site story runbook · site-story-addition-runbook.md*
