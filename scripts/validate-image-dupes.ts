/**
 * Cross-surface byte-dupe detector for static/images/.
 *
 * Walks every base .jpg in static/images/, SHA-256-hashes it, and
 * groups by hash. Fails the build when two or more files in DIFFERENT
 * surfaces share a hash — that's the cross-surface byte-dupe pattern
 * (e.g. `moon-sites/apollo11/01.jpg` == `missions/apollo11/01.jpg`)
 * cleaned up in the Cat 1A pass on 2026-06-13.
 *
 * Sourcing scripts (`source-known-gaps.ts`, `fetch-assets.ts`) bypass
 * this check by writing into the canonical surface only — they
 * shouldn't be silently producing cross-surface copies any more.
 * If a future legitimate editorial reuse needs to share bytes (Cat 1B:
 * one rocket photo legitimately serving as both `rockets/X.jpg` and
 * a mission's slot 04, or one Sojourner photo serving as both
 * `fleet-galleries/sojourner/01.jpg` and `mars-sites/mars-pathfinder/02.jpg`),
 * add the SHA-256 prefix (8 chars) to ALLOWLIST below with a comment
 * explaining the editorial intent.
 *
 * Same-surface dupes (e.g. `missions/otv-1/02.jpg` == `missions/otv-1/03.jpg`)
 * are out of scope for this check — they're flagged by Cat 2 work
 * which involves slot renumbering and lives in a separate script.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES_DIR = join(ROOT, 'static/images');

/** SHA-256 8-char prefixes of byte-dupes the curator has signed off
 *  on. Each entry needs a short comment naming the editorial intent.
 *  Snapshot taken 2026-06-13 after the Cat 1A mechanical-dupe sweep —
 *  every entry below is a legitimate cross-surface reuse, not a
 *  mistake. Future cross-surface dupes that don't appear here fail
 *  the build until a curator reviews + allowlists or removes them. */
const ALLOWLIST: ReadonlySet<string> = new Set<string>([
  // ── /science encyclopedia reuses fleet-gallery suit/IVA photos
  //    as inline illustrations — same image, two distinct
  //    contexts (catalog detail vs in-article callout).
  '1a31a493', // science/lunar-suits-aldrin.jpg ← fleet-galleries/a7l/01.jpg
  '2b05d1dd', // science/iva-suits-crew10.jpg ← fleet-galleries/crew-dragon-iva/01.jpg
  'bcee2891', // science/eva-suits-orlan.jpg ← fleet-galleries/orlan-mks/01.jpg
  // ── hotspots/moon tier-3 pan = panorama-tier composite that
  //    re-uses the mission's hero photo as its high-LOD source.
  //    Same image, different LOD tier in the hotspot pipeline.
  '8ba75ba6', // hotspots/moon/beresheet/tier3-pan.jpg ← missions/beresheet/01.jpg
  '48e655bc', // hotspots/moon/change3/tier3-pan.jpg ← missions/change3/01.jpg
  '895b2de9', // hotspots/moon/luna16/tier3-pan.jpg ← missions/luna16/01.jpg
  // ── /rockets surface = thumbnail-sized rocket reference cards
  //    that share the canonical fleet-gallery photo. Same image,
  //    two render contexts (catalog grid vs hero card).
  '04af120d', // rockets/long-march-3b.jpg ← fleet-galleries/long-march-3b/02.jpg + xichang-lc-2/02.jpg
  'a2cce511', // rockets/starship.jpg ← missions/starship-demo/03.jpg
  '53f39dc8', // rockets/pslv-xl.jpg ← missions/chandrayaan1/04.jpg
  // ── /planets hero = mission close-up of the same body. The
  //    Perseverance Mars panorama IS the canonical Mars surface
  //    photo; the New Horizons Pluto encounter image IS Pluto.
  'e600ee22', // planets/mars/01.jpg ← missions/perseverance/05.jpg
  // ── /small-bodies hero = the discovering / rendezvousing
  //    spacecraft's signature shot. Rosetta + 67P share an image
  //    because the spacecraft AND the comet ARE the same scene.
  'a374b46f', // small-bodies/67p/01.jpg ← missions/rosetta/01.jpg
  '28ebc10a', // small-bodies/halley/01.jpg ← missions/giotto/04.jpg
  // ── /tiangong-modules per-module galleries share images with
  //    earth-objects/tiangong (which renders the whole station as
  //    a single orbital object). 4 modules × 3 panorama slots all
  //    show the same docked stack photo.
  '80a3788a', // earth-objects/tiangong/01.jpg ← tiangong-modules/{chinarm,mengtian,tianzhou,wentian}/02.jpg
  '62b03029', // earth-objects/tiangong/02.jpg ← tiangong-modules/{chinarm,mengtian,tianzhou,wentian}/03.jpg
  'af492a81', // earth-objects/tiangong/03.jpg ← tiangong-modules/{mengtian,wentian}/{01,04}.jpg
  // ── earth-objects ← moon-site for entities that orbit + landed
  //    (chang'e 2 hero shared with its lunar-site panel).
  '821cae2f', // earth-objects/change2/01.jpg ← moon-sites/change2/01.jpg
  // ── X-37B (fleet entry) shares its hero/gallery photos with
  //    each individual OTV mission since the spacecraft is the
  //    same hardware re-flown 7 times.
  '5c230e2d', // fleet-galleries/x37b/01.jpg ← missions/otv-{1,2,3,6}/0X.jpg
  '59fb3b8a', // fleet-galleries/x37b/03.jpg ← missions/otv-7/02.jpg
  '40d29b4e', // fleet-galleries/x37b/04.jpg ← missions/otv-7/05.jpg
  // ── Mars Pathfinder mission site shares photos with the
  //    Sojourner rover (fleet entry). They are the same hardware
  //    in the same scene — the mission deployed the rover.
  '57fb4c41', // mars-sites/mars-pathfinder/02.jpg ← fleet-galleries/sojourner/01.jpg
  '7ee875a4', // mars-sites/mars-pathfinder/03.jpg ← fleet-galleries/sojourner/02.jpg
  'affb59fd', // mars-sites/mars-pathfinder/04.jpg ← fleet-galleries/sojourner/03.jpg
  '21c5b18e', // mars-sites/mars-pathfinder/05.jpg ← fleet-galleries/sojourner/04.jpg
  // ── Mars-3 (mission site) shares its hero with the fleet
  //    entry — same spacecraft photo seen from two surfaces.
  'c658c2fd', // mars-sites/mars3/01.jpg ← fleet-galleries/mars-3/05.jpg
  // ── Viking 1 lander + orbiter on /mars share the fleet hero
  //    because the operator-published photo IS the spacecraft.
  '3c94e82c', // mars-sites/viking1-{lander,orbiter}/01.jpg ← fleet-galleries/viking-1/03.jpg
  // ── Mars Express + Phobos-2 fleet entry: phobos-2's flyby
  //    of Mars IS the mars-express site context photo.
  'ac806b35', // mars-sites/mars-express/02.jpg ← fleet-galleries/phobos-2/02.jpg
  // ── MAVEN at Mars shares the Perseverance Mars panorama
  //    because both look at the same surface from orbit.
  '6b4c9fc3', // mars-sites/maven/02.jpg ← fleet-galleries/perseverance/04.jpg
  // ── Tianwen-1 orbiter + Zhurong rover (both at Mars) share
  //    photos since they arrived as one stack.
  'b5657304', // mars-sites/tianwen1-orbiter/03.jpg ← fleet-galleries/zhurong/02.jpg + missions/tianwen1/03.jpg
  '35ab1735', // mars-sites/tianwen1-orbiter/02.jpg ← fleet-galleries/zhurong/04.jpg
  // ── Mariner 9 site shares an early-era body photo with the
  //    Pioneer 11 mission gallery. Editorial linkage.
  '4fcea2ad', // mars-sites/mariner9/03.jpg ← missions/pioneer-11/01.jpg
  // ── Hope (Al-Amal) Mars probe + mission site share the same
  //    Mars dust-storm photo from the same orbit.
  '0f74222c', // mars-sites/hope/02.jpg ← missions/hope-probe/02.jpg
  // ── Vostok-K rocket fleet entry = Vostok 1 mission slot 05
  //    (mission's archival photo IS the rocket's catalog photo).
  '5aea31fa', // fleet-galleries/vostok-k/02.jpg ← missions/vostok-1/05.jpg
  // ── Luna 10 has a hero shared between fleet + mission — same
  //    spacecraft from same operator archive.
  '16f415cc', // fleet-galleries/luna10/01.jpg ← missions/luna10/01.jpg
  // ── Rosetta fleet entry shares slot 02 with the mission
  //    gallery slot 05 — different slots, same canonical photo.
  '7334abe6', // fleet-galleries/rosetta/02.jpg ← missions/rosetta/05.jpg
]);

/** Surface roots under static/images/. Top-level subdir of a base
 *  jpg = the surface. `tiangong-modules` and `iss-modules` count as
 *  surfaces in their own right (separate panels). Files outside these
 *  surfaces (rockets/, hotspots/, etc.) are checked too. */
function surfaceOf(path: string): string {
  const rel = path.slice(IMAGES_DIR.length + 1);
  const slash = rel.indexOf('/');
  return slash === -1 ? rel : rel.slice(0, slash);
}

function* walkJpgs(dir: string): Iterable<string> {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkJpgs(full);
    } else if (
      ent.isFile() &&
      ent.name.endsWith('.jpg') &&
      !ent.name.includes('.1x1.') &&
      !ent.name.includes('.4x3.') &&
      !ent.name.includes('.16x9.')
    ) {
      yield full;
    }
  }
}

function sha256Prefix(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8);
}

interface DupeGroup {
  hashPrefix: string;
  paths: string[];
  surfaces: Set<string>;
}

function findCrossSurfaceDupes(): DupeGroup[] {
  const byHash = new Map<string, string[]>();
  for (const path of walkJpgs(IMAGES_DIR)) {
    const h = sha256Prefix(path);
    const arr = byHash.get(h);
    if (arr) arr.push(path);
    else byHash.set(h, [path]);
  }
  const groups: DupeGroup[] = [];
  for (const [h, paths] of byHash) {
    if (paths.length < 2) continue;
    const surfaces = new Set(paths.map(surfaceOf));
    if (surfaces.size < 2) continue;
    if (ALLOWLIST.has(h)) continue;
    groups.push({ hashPrefix: h, paths, surfaces });
  }
  return groups;
}

function rel(p: string): string {
  return p.slice(ROOT.length + 1);
}

function main(): void {
  console.log('Cross-surface image byte-dupe check…');
  const groups = findCrossSurfaceDupes();
  if (groups.length === 0) {
    console.log(
      `✓ no cross-surface byte-dupes across ${execSync(
        `find ${IMAGES_DIR} -name '*.jpg' ! -name '*.1x1.jpg' ! -name '*.4x3.jpg' ! -name '*.16x9.jpg' | wc -l`,
        { encoding: 'utf-8' },
      ).trim()} base jpgs`,
    );
    return;
  }
  console.error(`✘ ${groups.length} cross-surface byte-dupe group(s):`);
  console.error('');
  for (const g of groups) {
    console.error(`  ${g.hashPrefix}  surfaces: [${[...g.surfaces].join(', ')}]`);
    for (const p of g.paths) {
      console.error(`    ${rel(p)}`);
    }
    console.error('');
  }
  console.error(
    'Either:\n' +
      '  1. Delete the redundant on-disk copies (preferred — the gallery\n' +
      "     loader's fallback ladder handles serving the canonical file), OR\n" +
      '  2. Add the 8-char SHA-256 prefix to ALLOWLIST in this script with a\n' +
      '     short comment explaining the editorial intent.\n',
  );
  process.exit(1);
}

main();
