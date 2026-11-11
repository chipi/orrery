/**
 * One gallery per place. A moon/mars site whose mission also has a gallery (missions/<id>) shows two
 * different photo sets in its site panel and its mission panel. This folds the site's own gallery
 * (moon-sites/<id>, mars-sites/<id>) into the mission gallery both panels then load: the loaders
 * (getMoonSiteGallery / getMarsSiteGallery) already fall back to missions/<mission_id|site id> once
 * the site has no gallery of its own, so no loader change and no duplicated files.
 *
 * Per site:
 * - photos of the site gallery that are perceptual near-dupes (Hamming <= 14, the validator's
 *   within-card limit) of a mission slot are dropped, every reference re-pointed to the mission slot;
 * - the other site slots are appended to the mission gallery (move-image-to-gallery.ts);
 * - the retired site gallery is removed (drop-gallery-slots.mjs --whole);
 * - the site panel's current hero becomes the mission gallery's hero (missions-hero-overrides.json,
 *   only when it is not slot 01 already), the site's own override entry goes.
 *
 * A mission with several sites (viking1: lander + orbiter, tianwen1: orbiter + Zhurong, mars3: lander +
 * orbiter) folds only its primary site (the one whose id is the mission id, else the one named in
 * PRIMARY below); the others are different places with their own gallery.
 *
 * Usage: npx tsx scripts/merge-place-galleries.ts [--apply] [<site id> …]   (dry run without --apply)
 * Then: rebuild-gallery-manifests.ts, vision/build-credit-thumbs.mjs, build-i18n-bundles.mjs,
 * mobile/build-offline-manifest.mjs and npm run validate-image-integrity.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hammingDistance } from './lib/phash.ts';

const APPLY = process.argv.includes('--apply');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const NEAR = 14;

/* eslint-disable @typescript-eslint/no-explicit-any */
const json = (p: string): any => JSON.parse(readFileSync(p, 'utf8'));
const phashes: Record<string, string> = json('static/data/image-phashes.json').phashes;
const missionCounts: Record<string, number> = json('static/data/mission-galleries.json');
const nn = (n: number) => String(n).padStart(2, '0');
const ph = (dir: string, n: number) => phashes[`/images/${dir}/${nn(n)}.jpg`];

interface Plan {
  site: string;
  siteDir: string;
  missionDir: string;
  siteCount: number;
  dups: [number, number][];
  moves: [number, number][];
  hero: number;
}
interface Site {
  id: string;
  mission_id?: string;
}
const plans: Plan[] = [];
const skipped: string[] = [];
// A mission shared by several sites folds one of them: the site named like the mission, else the
// one listed here (the lander of viking1, the orbiter of tianwen1 — their galleries held the
// mission's photos). The others are different places and keep their own gallery.
const PRIMARY: Record<string, string> = { viking1: 'viking1-lander', tianwen1: 'tianwen1-orbiter' };
const byMission = new Map<string, { site: Site; kind: string; own: number }[]>();
for (const kind of ['moon', 'mars']) {
  const counts: Record<string, number> = json(`static/data/${kind}-site-galleries.json`);
  for (const site of json(`static/data/${kind}-sites.json`) as Site[]) {
    const mid = [site.mission_id, site.id].find((m) => m && (missionCounts[m] ?? 0) > 0);
    if (mid)
      byMission.set(mid, [
        ...(byMission.get(mid) ?? []),
        { site, kind, own: counts[site.id] ?? 0 },
      ]);
  }
}
for (const [mid, group] of byMission) {
  const primary =
    group.length === 1
      ? group[0]
      : (group.find((g) => g.site.id === mid) ?? group.find((g) => g.site.id === PRIMARY[mid]));
  for (const g of group)
    if (g !== primary && g.own > 0)
      skipped.push(`${g.site.id}: another place of mission ${mid}, keeps its gallery`);
  if (!primary?.own) continue;
  const { site, kind, own } = primary;
  if (only.length && !only.includes(site.id)) continue;
  const [siteDir, missionDir] = [`${kind}-sites/${site.id}`, `missions/${mid}`];
  const dups: [number, number][] = [];
  const moves: [number, number][] = [];
  let next = missionCounts[mid] + 1;
  for (let a = 1; a <= own; a++) {
    let best: [number, number] = [99, 0];
    for (let b = 1; b <= missionCounts[mid]; b++) {
      const [pa, pb] = [ph(siteDir, a), ph(missionDir, b)];
      const d = pa && pb ? hammingDistance(pa, pb) : 99;
      if (d < best[0]) best = [d, b];
    }
    if (best[0] <= NEAR) dups.push([a, best[1]]);
    else moves.push([a, next++]);
  }
  const override = json(`static/data/${kind}-sites-hero-overrides.json`).overrides?.[site.id]?.slot;
  const heroOld = Number((override ?? '01.jpg').slice(0, 2));
  const hero = (dups.find(([a]) => a === heroOld) ?? moves.find(([a]) => a === heroOld))![1];
  plans.push({ site: site.id, siteDir, missionDir, siteCount: own, dups, moves, hero });
}

const SKIP_REFS =
  /(image-(provenance|vision|approved|ladder|phashes)|credit-thumbs|offline-manifest|alt-text-sources|-hero-overrides|-galleries)\.json$|image-alt-text\//;
const refFiles: string[] = [];
const scan = (d: string) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) {
      if (p !== 'static/data/i18n') scan(p);
    } else if (e.name.endsWith('.json') && !SKIP_REFS.test(p)) refFiles.push(p);
  }
};
['static/data', 'scripts/hotspots', 'i18n-src'].forEach(scan);
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function heroOverride(surface: string, edit: (o: Record<string, any>) => void) {
  const f = `static/data/${surface}-hero-overrides.json`;
  const text = readFileSync(f, 'utf8');
  const j = JSON.parse(text);
  edit(j.overrides);
  writeFileSync(
    f,
    JSON.stringify(j, null, text.match(/^\{\r?\n([ \t]+)/)?.[1] ?? 1) +
      (text.endsWith('\n') ? '\n' : ''),
  );
}

for (const p of plans) {
  const dupList = p.dups.map(([a, b]) => `${nn(a)}→${nn(b)}`).join(' ') || '-';
  const moveList = p.moves.map(([a, b]) => `${nn(a)}→${nn(b)}`).join(' ') || '-';
  console.log(
    `${p.site}: ${p.siteDir} (${p.siteCount}) into ${p.missionDir} · dup ${dupList} · move ${moveList} · hero ${nn(p.hero)}`,
  );
  if (!APPLY) continue;
  const kind = p.siteDir.split('/')[0];

  // 1. references to a dropped dupe follow it to its mission slot (manifests describing the slot
  //    itself are dropped with it, not re-pointed)
  for (const f of refFiles) {
    let text = readFileSync(f, 'utf8');
    const before = text;
    for (const [a, b] of p.dups)
      text = text.replace(
        new RegExp(`/images/${escRe(p.siteDir)}/${nn(a)}(?=(?:-\\d+)?[."])`, 'g'),
        `/images/${p.missionDir}/${nn(b)}`,
      );
    if (text !== before) writeFileSync(f, text);
  }

  // 2. the hero: the site panel's hero leads the merged gallery; the site's own override goes
  heroOverride(kind, (o) => delete o[p.site]);
  const mid = p.missionDir.split('/')[1];
  heroOverride('missions', (o) => {
    if (p.hero === 1 && !o[mid]) return;
    if (o[mid] && Number(o[mid].slot.slice(0, 2)) === p.hero) return;
    if (p.hero === 1) delete o[mid];
    else
      o[mid] = {
        slot: `${nn(p.hero)}.jpg`,
        reason: `site panel hero of ${p.site}, merged gallery 2026-11-09`,
        approved_at: '2026-11-09',
      };
  });

  // 3. the other slots are appended, then what is left of the site gallery is retired
  if (p.moves.length)
    execFileSync(
      'npx',
      [
        'tsx',
        'scripts/move-image-to-gallery.ts',
        '--apply',
        ...p.moves.map(([a, b]) => `${p.siteDir}/${nn(a)}=${p.missionDir}/${nn(b)}`),
      ],
      { stdio: 'inherit' },
    );
  if (p.dups.length)
    execFileSync(
      'node',
      [
        'scripts/drop-gallery-slots.mjs',
        '--apply',
        '--whole',
        ...p.dups.map(([a]) => `${p.siteDir}/${nn(a)}`),
      ],
      { stdio: 'inherit' },
    );
  for (const root of ['static/images', 'static/credit-thumbs/images', 'masters'])
    if (existsSync(`${root}/${p.siteDir}`) && !readdirSync(`${root}/${p.siteDir}`).length)
      rmdirSync(`${root}/${p.siteDir}`);
}
for (const s of skipped) console.log(`skip ${s}`);
if (!APPLY) console.log('[dry run] nothing written');
