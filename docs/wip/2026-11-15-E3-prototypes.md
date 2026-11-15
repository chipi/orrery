# Slice E3, phase 1: prototype sheets (palette, agency filter dots, era strip)

Dev route `/dev/missions-era` (`?view=now|A|B|C|filter|palette`, German and Arabic under `/de/` and `/ar/`). It is built from the real mission index and excluded from the prod build by `src/routes/dev/+layout.ts` (a non-dev build returns 404 for the whole `/dev` subtree). Nothing on `/missions` or `/fleet` changed. Pure helpers and 23 unit tests: `src/routes/dev/missions-era/proto.ts`, `proto.test.ts`. Brief: `2026-11-13-slice-E3-brief.md` (decisions 11 to 14).

The operator picks first; the page is built after. Sheets live in the session scratchpad (`e3/sheet-*.png`), not in the repo.

## Measured on the real index

The index holds 139 missions and 14 agencies on the filter (the brief counted 126 and 13: Intuitive Machines is a sixth single-mission agency chip). Counts per era: 5, 28, 12, 18, 9, 24, 35, 7, 1.

Measured in headless Chromium, strip width 1356 px at 1440, 724 at 768, 346 at 390. "Clipped" is a label whose text leaves its box or is cut by ellipsis; "overlap" is two labels of different controls whose text boxes intersect.

| Strip | 1440 en / de / ar | 768 en / de / ar | 390 | Height at 1440 / 768 / 390 |
|---|---|---|---|---|
| Today (real component) | 6 / 7 / 5 clipped | 10 / 10 / 8 clipped | 0 (chip carousel, 8 chips off-screen) | 98 / 98 / 38 |
| A: nine tiles | 0 / 0 / 0 | 0 / 0 / 0 | 0 (scroll row, 6 tiles off-screen) | 78-91 / 175-187 / 91 |
| B: dot ruler | 0 / 0 / 0 | 0 / 0 / 0 | 0 (ruler + the carousel, 7 chips off-screen) | 163 / 186 / 138 |
| C: repaired axis | 0 / 0 / 0 | 0 / 0 / 0 | 0 (the carousel, as today) | 96 / 112-128 / 30 |

Overlap is 0 for A, B and C in all nine cases. Today's strip reads 2 to 4 overlaps at 1440 and 12 to 26 at 768, counted on the untruncated text, so the visible symptom is the clipping.

## What each does

- **A (tiles)**: the only option with one design at every width (9 columns, 5 + 4 under 1100 px, a scroll row under 560). Labels wrap to two lines, never clip, the German and Arabic labels fit. Loses the sense of time and the strip grows to 175-187 px at 768. The count bar is relative to the largest era (35), not to the total.
- **B (dot ruler)**: keeps time and shows the missions themselves (139 dots in the agency colours; a selected era lights its dots and dims the rest, which neither other option does). Costs the most height (163 / 186 px), stacks 11 to 12 dot rows in the 1960s and 2020s at 390, and on a phone it still needs the chip carousel for the names.
- **C (repaired axis)**: smallest change; two lanes remove the drawn-over pair, names that do not fit sit above the axis on leader lines. At 768 in German the labels take three rows and the leaders cross other labels; at 390 it is the carousel again. The squeeze stays: the 1957 to 1972 era (45 of 139 missions) is 18 % of the width.
- **Right-to-left**: A mirrors with the grid; B and C mirror the time axis (earliest era at the right), which the real strip does not do today. A and B isolate the year ranges (`bdi dir=ltr`), otherwise Arabic shows "1961-1957".

## The palette (`?view=palette`)

One colour per agency, found by a seeded search (`proto.ts` holds the result; the search script is not committed): 4.5:1 or better on the page `#04040c` and the card `#0a0a16` (lowest: NASA 4.77 and 4.59), no hue 145 to 205, brand hue as a weak pull, grey for SpaceX. Colour-blind check: CIEDE2000 under Machado protan, deutan and tritan simulation; 91 pairs, closest 5.7 (Blue Origin / USSF, protan), neighbours in the filter row 7.3 or more (Intuitive Machines / JAXA), the rest 10 or more. 2.3 is a just-noticeable difference. Today's brand colours: 7 of the 14 are under 3:1 on the page (USSF 1.45, Blue Origin 1.35, ESA 1.51, JAXA 1.72, NASA 2.03, SpaceIL 2.20, SpaceX 2.49).

This palette is a new value set, not the approved §2.4 values: it is decision 10b in the brief (one value per agency), not 10a.

## The filter with dots (`?view=filter`)

Four rows: today, D11a (brand colour dot with the 1 px ring), D11b (chip colour), the proposed palette. At 390 the dots cost 2 more chip rows (3 rows today, 5 with dots). Several logos are themselves dark on the glass chip (ASI, ESA, SpaceX, UAESA, Blue Origin), so the dot also fixes a legibility gap that exists today.

## Decisions for the operator

1. Palette: keep the approved brand colours (brief 10a, dots with ring) or take the proposed palette (10b, and the badge text colour is recomputed)?
2. Dot source: D11a brand, D11b chip, or the proposed palette.
3. Strip: A, B or C (D13); A is the only one that needs no second design on a phone.
4. If A: scroll row on a phone (6 of 9 tiles off-screen) or two columns (five rows, about 450 px).
5. Right-to-left: mirror the time axis in Arabic (B, C) or keep it left-to-right.

## Not done

No change to `/missions`, `/fleet`, `Chip` (no `dotColor` prop), `agencies.ts` or the mission data. No keyboard or screen-reader test of the prototypes (A is plain radios without arrow-key handling; the real build uses `ChipGroup`). The words "now" and the dev text are English; shipping needs 14 locales. No other locale than en, de, ar was measured. No i18n of the "· now" marker.
