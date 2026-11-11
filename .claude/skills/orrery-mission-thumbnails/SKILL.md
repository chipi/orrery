---
name: orrery-mission-thumbnails
description: Add, refresh or check a mission's trajectory thumbnail (static/images/missions/thumbnails/<id>.webp) — the 736x414 plot drawn from /fly's own trajectory code (plus its label-free 420x312 card crop in thumbnails/card/), its placeholder for missions with no orbit data, the style rules, the checks and the colophon credit.
when_to_use: Use when asked to "add a mission thumbnail", "refresh the trajectory thumbnails", "a mission has no thumbnail", "the thumbnail looks wrong", after adding a mission or changing flight data, waypoints, fly-trajectories, the Earth-orbit registry or the cislunar geometry, or when validate-data says "no trajectory thumbnail".
---

# orrery-mission-thumbnails

The procedure, data per mission kind, style rules, checks and credit are in
[`docs/guides/mission-thumbnail-runbook.md`](../../../docs/guides/mission-thumbnail-runbook.md). Read it first.

Short form:

```bash
npx tsx scripts/render-mission-thumbnails.ts --out=/tmp/thumbs --png=/tmp/thumbs-png   # preview all, repo untouched
npx tsx scripts/render-mission-thumbnails.ts                                           # write webp + ladder, retire PNGs
node scripts/build-original-work.mjs                                                   # colophon "Mission trajectory plots"
npm run validate-data                                                                  # every mission has a .webp
```

Rules that bite: the generator calls /fly's code (`computeMissionApply`, `flyTrajectoryPath`, the Earth-orbit
registry), so a wrong picture is usually wrong data, not a drawing bug; no cyan/teal; no invented trajectory for a
mission without orbit data (placeholder says "NO TRAJECTORY DATA"); thumbnails get no `image-provenance.json` row;
look at every thumbnail in a contact sheet before committing.
