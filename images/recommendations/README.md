# Recommendation cover thumbnails

Small cover thumbnails (~150-300 px on the long edge) for the curated entries on `/science/reading-list` and `/science/watch-list`. Rendered at 60-80 px in the UI; the source files here are slightly larger so the build can produce sharper variants if we ever add `srcset`. Total directory footprint: under 700 KB across all 31 files.

## Provenance + use case

Each file is a low-resolution thumbnail of an existing commercial work — book covers, film posters, podcast / channel artwork — used here for **identification + recommendation**, the same way an online bookshop or podcast directory or film database does. This is the standard **nominative fair use** pattern recognized in US copyright doctrine (17 U.S.C. § 107) and the equivalent provisions in other jurisdictions.

The Orrery project does not claim ownership of any of these thumbnails. Copyright remains with the original rightsholder (publisher, studio, podcast network, YouTube channel owner). The thumbnails are deliberately *not* high-resolution scans suitable for reuse as the primary work — they're navigational signposts.

If you are the rightsholder for one of these works and would prefer your thumbnail not appear here, open an issue at https://github.com/chipi/orrery/issues and we will remove it.

## Sources

| Subfolder | Source | Notes |
|---|---|---|
| `books/` | [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers) | CC0 metadata; cover images themselves remain with publishers |
| `films/`, `docs/` | Wikipedia infobox images (`/api/rest_v1/page/summary/<title>`) | Hosted on `upload.wikimedia.org/wikipedia/en/` under Wikipedia's fair-use rationale for film article infoboxes |
| `podcasts/` | iTunes Search API (`itunes.apple.com/search?entity=podcast`) | Artwork uploaded to Apple by the podcast publisher for distribution; the `artworkUrl600` field is meant for embedding |
| `channels/` | YouTube channel avatars from `youtube.com/@<handle>` page metadata | Avatars are publicly published by the channel owner; YouTube's embedding policies permit this use |
| `blogs/` | OpenGraph `<meta og:image>` or `<link rel="apple-touch-icon">` from each site | Site logos / favicons designed by the publisher for embedding by indexers |

## Updating a thumbnail

Replace the file at the same path with a same-or-smaller JPEG. The cover paths in `src/routes/science/{reading,watch}-list/+page.svelte` are static strings pointing at these files — no manifest, no script. If you change the slug, update the `cover:` field on the corresponding entry.

To regenerate from scratch, the fetch flow lives in `scripts/fetch-recommendation-covers.sh` (one-off helper, not in `npm run` because it only runs when adding new entries).

## Adding a new entry

1. Add the entry to the `books` / `films` / `docs` / `podcasts` / `channels` / `blogs` array in `src/routes/science/{reading,watch}-list/+page.svelte`.
2. Run the appropriate fetch one-liner for that source (see commit history for examples).
3. Resize the result to ~300 px on the long edge (`sips -Z 300 file.jpg`) and recompress (`sips -s format jpeg -s formatOptions 80 file.jpg --out file.jpg`).
4. Add `cover: '/images/recommendations/<category>/<slug>.jpg'` to the entry.

Until step 4, the entry renders with the deterministic gradient placeholder — perfectly acceptable as a stop-gap.

---

*Orrery · static/images/recommendations/README.md · 2026-05-23*
