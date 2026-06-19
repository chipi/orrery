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
 * Two scopes of dupe are detected:
 *
 * 1. Cross-surface: two files in DIFFERENT top-level surfaces share
 *    bytes (e.g. moon-sites/apollo11/01.jpg == missions/apollo11/01.jpg
 *    cleaned up in Cat 1A 2026-06-13).
 *
 * 2. Same-surface: two files in the SAME entity dir (e.g.
 *    missions/otv-1/02.jpg == missions/otv-1/03.jpg cleaned up in Cat 2
 *    2026-06-13) OR same surface but different entity (e.g.
 *    fleet-galleries/mars-2/01.jpg == fleet-galleries/mars-3/01.jpg —
 *    sister mission editorial reuse cleaned up + allowlisted in Cat 3).
 *
 * Both scopes use the same ALLOWLIST keyed by 8-char SHA-256 prefix.
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
export const ALLOWLIST: ReadonlySet<string> = new Set<string>([
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
  // ── ID-mismatched mission/fleet pairs (#342 Phase 22). The fleet
  //    side carries `psyche-spacecraft` / `hayabusa` (asset names);
  //    the mission side carries `psyche-mission` / `hayabusa1`
  //    (programme designators). Runtime gallery loader's cross-
  //    surface fallback requires SAME id across surfaces, so we
  //    physically mirror these two heroes into the missions dir.
  //    Same image, two catalogue rows, two intentional on-disk copies.
  '7e065df1', // missions/hayabusa1/01.jpg ← fleet-galleries/hayabusa/01.jpg
  'b445c375', // missions/psyche-mission/01.jpg ← fleet-galleries/psyche-spacecraft/01.jpg
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
  // ── Cat 3 (same-surface inter-entity) — landed 2026-06-13
  //    Family / programme / sibling editorial reuses where one
  //    canonical archive photo serves multiple sister entities.
  //    Chang'e + Yutu Chinese lunar program — sequential missions
  //    share rover / lander / earthrise archive shots.
  'e273f1e5', // change-2 + change-3
  '166355ab', // change-3 + yutu
  '10434490', // change-4 + yutu-2
  '8ae385d1', // change-4 + yutu-2
  'a6006cc3', // change-4 + change-5 + luna-9
  'f98246f5', // change-4 + change-5 + luna-16 + venera-7
  //    Outer-system flagships — paired / sequel missions share
  //    iconic encounter photos.
  '50feffd7', // mariner-9 + voyager-2
  '658a431a', // pioneer-10 + pioneer-11
  //    JAXA H3 launcher + Tanegashima Yoshinobu pad + HTV-X cargo —
  //    same launch site / vehicle family.
  '2fb3f849', // h3 + tanegashima-yoshinobu
  'a6f8e02d', // h3 + htv-x
  //    Long March 3B + Xichang LC-2/LC-3 + Taiyuan LC-9 — same
  //    launcher + facility photos.
  '83ad4e8f', // long-march-3b + xichang-lc-2
  '5ba99e46', // long-march-3b + xichang-lc-3
  'c0d5e7d2', // taiyuan-lc-9 + xichang-lc-2 + xichang-lc-3
  '49d2cce2', // xichang-lc-2 + xichang-lc-3
  '72276470', // xichang-lc-2 + xichang-lc-3
  //    Soviet Luna program — sister missions share archival shots.
  '3d00fdc3', // luna-16 + luna-9
  //    Soviet Mars-N orbital program — Mars 2 + Mars 3 paired flights.
  'b412955e', // mars-2 + mars-3
  'e70d60b3', // mars-2 + mars-3
  '89daa1f5', // mars-2 + mars-3
  'c26a3d99', // mars-2 + mars-3
  '777dcf96', // mars2 + mars3 (site dirs use no hyphen)
  '97ae238b', // mars2 + mars3
  '60000bc0', // fleet-galleries/mars2-orbiter + mars-sites/mars3 — same Soviet
  //          Mars-N program archival photo (sourced 2026-06-14 fill round 2)
  //    Mir + Progress-M — same station ecosystem photos.
  'c277c0b5', // mir + progress-m
  //    Salyut station program — same hardware across mission numbers.
  '0778bda1', // salyut-1 + salyut-6
  '66324464', // salyut-1 + salyut-6
  '255f4dd1', // salyut-2 + salyut-3
  //    Sokol suit variants — same product line.
  '33fc61a3', // sokol-kv-2 + sokol-m
  //    Soyuz launcher / spacecraft family — variants share heritage.
  '950ef1be', // soyuz-fg + soyuz-tma
  'f6d9a517', // soyuz-tma + soyuz-u
  //    Vega 1 + Vega 2 — paired Venus/Halley flyby siblings.
  '8fc113b6', // vega-1 + vega-2
  '2f1d825f', // vega-1 + vega-2
  '039d725f', // vega-1 + vega-2
  '8e2b0c2f', // vega-1 + vega-2
  'fccbfe48', // vega-1 + vega-2
  //    Vostok program — sister crewed flights share archive shots.
  'ace3d473', // vostok-3 + vostok-4
  //    Tiangong + Shenzhou + Tianzhou (visiting vehicles to station).
  '32214862', // shenzhou + tianzhou
  '31098aeb', // shenzhou + tianzhou
  '672ad537', // tiangong-2 + tianzhou
  '1d9c3c32', // chinarm + shenzhou
  'd975f0f5', // chinarm + tianhe
  //    ISS modules sharing assembly-era / docking-bay photos.
  '3486a1ef', // unity + zvezda
  '3632f2da', // unity + zarya
  //    Mars rover pair from same Mars Exploration Rover programme.
  'eaac0de3', // opportunity + spirit
  //    Viking 1 lander + orbiter — same descent stack at Mars.
  'deb29699', // viking1-lander + viking1-orbiter
  'a990a3ef', // viking1-lander + viking1-orbiter
  'cae8df25', // viking1-lander + viking1-orbiter
  '1e135762', // viking1-lander + viking1-orbiter
  //    Freedom 7 / Mercury Redstone-3 — same first US crewed flight.
  '279f1015', // freedom-7 + mercury-redstone-3
  //    X-37B OTV missions share spacecraft photo across flights.
  '81547127', // otv-1 + otv-2 + otv-3
  '838406cc', // otv-1 + otv-2
  'a87d6afa', // otv-1 + otv-2
  //    Starship demo + Starship Mars Crew — same SpaceX vehicle line.
  '80b02832', // starship-demo + starship-mars-crew

  // ALLOWLIST_AUTHORIZED (2026-06-18) — /missions list hero loader does
  //   NOT do cross-surface fallback; it loads /images/missions/<id>/01.jpg
  //   directly and 404s when missing. For these 4 missions the canonical
  //   image lives in /images/fleet-galleries/<id>/. To stop the empty-card
  //   regression we mirror the byte-identical hero into missions/<id>/01.jpg.
  //   Proper fix (deferred): teach pickHero('missions', id) in
  //   src/lib/image-hero.ts to fall through to fleet-galleries when the
  //   missions/ slot doesn't exist, then delete these allowlist entries +
  //   the mirrored bytes.
  '34773c05', // missions/lucy + fleet-galleries/lucy
  '8cc71617', // missions/europa-clipper + fleet-galleries/europa-clipper
  '07c0486a', // missions/parker-solar-probe + fleet-galleries/parker-solar-probe
  '96f1ded6', // missions/solar-orbiter + fleet-galleries/solar-orbiter

  // ALLOWLIST_AUTHORIZED (2026-06-18) — Slice A v3 round-3 ship.
  //   Pioneer 11 NASM portrait approved by Marko for BOTH mission hero
  //   AND fleet slot 3 (he labeled the two proposals separately knowing
  //   they share the same Smithsonian record). Editorial-share, not bug.
  '003fae8f', // missions/pioneer-11/01 + fleet-galleries/pioneer-11/03

  // ALLOWLIST_AUTHORIZED (2026-06-18) — Slice A v3 round-4 rescue ship.
  //   Marko triaged ~520 cards in the dropped pool. The slice-a-*-dryrun
  //   JSONs predate Stage 2 (per-pick dedup across dry-run, commit
  //   20f3016ac), so the resolver fed top-1 for each slot within a
  //   single mission — many gallery slots (02-05) approved by Marko
  //   ended up byte-identical. Re-running the dry-runs themselves
  //   would diversify, but for THIS ship we honour the explicit
  //   approvals and allowlist the dupes. The next pipeline iteration
  //   will regenerate the dry-runs through the diversified resolver.
  // ALLOWLIST_AUTHORIZED (2026-06-19) — Slice A v3 round-5 manual
  //   promotions. Marko explicitly asked to use gallery slot N's image
  //   as the hero for these 6 missions; the gallery slot stays in place
  //   (now byte-equal to the hero). Editorial-share, not bug.
  '89f59113', // fleet-galleries/akatsuki/01 + 02 (promoted from slot 02)
  'f8ec568a', // missions/phoenix/01 + 03 (promoted from slot 03)
  'b6405663', // missions/dawn/01 + dawn/02 (promoted from slot 02)
  // juno round-5 promotion (slot 02) REVISED in round-6 to slot 03;
  // f6752d18 retired in favour of ea36d455 + fe33a433 below.
  'c0dfb5fb', // missions/lro/01 + lro/03 (promoted from slot 03)
  'f437732b', // missions/new-horizons/01 + 02 (promoted from slot 02)
  '8af1cc20', // missions/vostok-5/01 + 02 (promoted from slot 02)
  'd453422e', // missions/vostok-6/01 + 02 (promoted from slot 02)

  // ALLOWLIST_AUTHORIZED (2026-06-19) — Slice A v3 round-6 manual
  //   promotions. Marko explicitly asked "use gallery N as hero" for
  //   13 missions across both /missions and /fleet surfaces. Each
  //   hero now matches its source gallery slot bytewise; editorial
  //   share, gallery slot stays in place.
  'bb76df7b', // missions/cassini/01 + 02 (promoted from slot 02)
  '96df972a', // fleet-galleries/cassini/01 + 02 (promoted from slot 02)
  '9616b095', // missions/pioneer-10/01 + 05 (promoted from slot 05)
  '7f153de7', // fleet-galleries/pioneer-10/01 + 05 (promoted from slot 05)
  'd1f20b12', // missions/pioneer-11/01 + 05 (promoted from slot 05)
  '9e6e36a9', // fleet-galleries/pioneer-11/01 + 05 (promoted from slot 05)
  '545171e0', // missions/voyager-1/01 + 02 (promoted from slot 02)
  'c9c1524b', // fleet-galleries/voyager-1/01 + 02 (promoted from slot 02)
  'eb216309', // missions/voyager-2/01 + 02 (promoted from slot 02)
  'c37cc0b2', // fleet-galleries/voyager-2/01 + 02 (promoted from slot 02)
  'd42d71f4', // missions/venera-13/01 + 05 (promoted from slot 05)
  'd7eee3a0', // fleet-galleries/venera-13/01 + 05 (promoted from slot 05)
  '79cbcd01', // fleet-galleries/vega-1/01 + 02 (promoted from slot 02)
  '08d94211', // fleet-galleries/vega-2/01 + 03 (promoted from slot 03)
  '299d2693', // missions/galileo/01 + 05 (promoted from slot 05)
  '1ecb7e33', // fleet-galleries/galileo/01 + 05 (promoted from slot 05)
  'dde29d26', // missions/ulysses/01 + 02 (promoted from slot 02)
  'c8e0eef6', // fleet-galleries/ulysses/01 + 02 (promoted from slot 02)
  '9ef1daaa', // missions/hayabusa2/01 + 04 (promoted from slot 04)
  'f05f9834', // fleet-galleries/hayabusa-2/01 + 04 (promoted from slot 04)
  '035ed5a0', // missions/bepicolombo/01 + 02 (promoted from slot 02)
  '444c597f', // fleet-galleries/bepicolombo/01 + 02 (promoted from slot 02)
  'fe33a433', // missions/juno/01 + 03 (REVISED round-6 promotion from slot 03; supersedes f6752d18)
  'ea36d455', // fleet-galleries/juno/01 + 03 (REVISED round-6 promotion from slot 03)

  'eada8e1c', // fleet-galleries/a7l/03,04,05 (A7L spacesuit gallery)
  '702fcc41', // fleet-galleries/aces/02,03,04,05 (ACES suit gallery)
  '78248fa6', // fleet-galleries/cygnus-standard/02,03,05 (Cygnus fleet)
  '0028195c', // fleet-galleries/emu/02,03,04,05 (EMU spacesuit gallery)
  '7dacaa15', // fleet-galleries/lc-34/03,04,05 (LC-34 launch complex)
  '5671243e', // fleet-galleries/lunar-prospector/01,04 (hero + slot)
  'd79e07ae', // fleet-galleries/maven/01,04 (hero + slot)
  '12042c1f', // missions/dart/01,05 (hero + slot)
  '730db1bd', // missions/freedom-7/03,05 (gallery slots)
  '5faf9c60', // missions/friendship-7/01,02 (hero + slot)
  'f2730ab6', // missions/mercury-atlas-9/03,05 (gallery slots)
  'de85aceb', // missions/mercury-redstone-3/01,04 (hero + slot)
  'ff4e464c', // missions/spirit/01,02 (hero + slot)
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

function findDupes(): DupeGroup[] {
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
    if (ALLOWLIST.has(h)) continue;
    const surfaces = new Set(paths.map(surfaceOf));
    groups.push({ hashPrefix: h, paths, surfaces });
  }
  return groups;
}

function rel(p: string): string {
  return p.slice(ROOT.length + 1);
}

function main(): void {
  console.log('Image byte-dupe check (cross + same-surface)…');
  const groups = findDupes();
  if (groups.length === 0) {
    const n = execSync(
      `find ${IMAGES_DIR} -name '*.jpg' ! -name '*.1x1.jpg' ! -name '*.4x3.jpg' ! -name '*.16x9.jpg' | wc -l`,
      { encoding: 'utf-8' },
    ).trim();
    console.log(`✓ no un-allowlisted byte-dupes across ${n} base jpgs`);
    return;
  }
  console.error(`✘ ${groups.length} un-allowlisted byte-dupe group(s):`);
  console.error('');
  for (const g of groups) {
    const surfTag =
      g.surfaces.size === 1
        ? `same-surface: ${[...g.surfaces][0]}`
        : `surfaces: [${[...g.surfaces].join(', ')}]`;
    console.error(`  ${g.hashPrefix}  ${surfTag}`);
    for (const p of g.paths) {
      console.error(`    ${rel(p)}`);
    }
    console.error('');
  }
  console.error(
    'Either:\n' +
      '  1. Delete the redundant on-disk copies (cross-surface: rely on the\n' +
      "     gallery loader's fallback ladder; same-surface: pick canonical\n" +
      '     slot, delete others, renumber + update count manifests), OR\n' +
      '  2. Add the 8-char SHA-256 prefix to ALLOWLIST in this script with a\n' +
      '     short comment explaining the editorial intent.\n',
  );
  process.exit(1);
}

// Run main() only when this file is the CLI entrypoint; allow
// sibling scripts (the pHash validator) to import ALLOWLIST without
// triggering the byte-scan as a side effect.
const invokedDirectly = fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '');
if (invokedDirectly) main();
