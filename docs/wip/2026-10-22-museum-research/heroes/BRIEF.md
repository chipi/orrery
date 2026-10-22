# Hero image search (museums + observatories, 2026-10-22)

For EACH place in your input file, find the ONE best photograph to head its card on /earth.

## HARD RULES
- Do not call WebSearch (budget exhausted). Use WebFetch only.
- Licence must be one of: public domain (PD, PD-USGov, PD-NASA), CC0, CC BY (any version), CC BY-SA (any version). NEVER CC BY-NC, NC-SA, ND, "all rights reserved", "courtesy of", press/editorial-only, or unknown.
- The photo must show THIS place: for a museum, the building exterior or its main hall with the space exhibits (a museum building is preferred over a single exhibit); for an observatory, the telescope(s) — the dish, the array, the dome(s) — on site. No logos, maps, diagrams, renders, people-only shots, or a different site.
- Real photograph, landscape orientation preferred, original at least 1600 px wide (1200 minimum if nothing better). No watermarks.
- Read the licence and author from the source's own metadata, never guess.

## Where to look, in this order
1. Open institutional archives with clear licences: ESO (`https://www.eso.org/public/images/` — CC BY 4.0, credit "ESO/…"), NRAO/AUI/NSF image library (check licence), NASA images API (`https://images-api.nasa.gov/search?q=<terms>&media_type=image` — NASA PD) for NASA sites, Smithsonian Open Access (CC0) for NASM/Udvar-Hazy.
2. Wikimedia Commons (failover, usually the answer for museum buildings): category for the place (`https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtype=file&cmlimit=100&format=json&cmtitle=Category:<Name>`), file search (`...&list=search&srnamespace=6&srlimit=20&srsearch=<words>`), then per candidate: `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|size|extmetadata&format=json&titles=File:<name>` (extmetadata gives LicenseShortName, Artist, Credit, ImageDescription; `url` is the original).

## Output (write JSON to the path in your task)
`{ "heroes": [ { "id", "type", "found": true|false, "page_url" (file/description page), "original_url" (direct image URL), "width", "height", "license" (e.g. "CC BY-SA 4.0"), "license_url", "author" (plain text, no HTML), "credit_line" (e.g. "Photo: Jane Doe, CC BY-SA 4.0, via Wikimedia Commons"), "source_type" ("eso" | "nasa-image-library" | "smithsonian-openaccess" | "nrao" | "wikimedia-commons" | ...), "shows" (one plain English sentence describing exactly what is in the photo, usable as alt text), "why" (one line: why this one over others) } ] }`
`found: false` with a short `why` when nothing qualifies. Final reply: 3 lines max — found/total, any doubtful licence, output path.
