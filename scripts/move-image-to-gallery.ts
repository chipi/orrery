/**
 * Move already-built images (a served WebP ladder + master) into a gallery as new numbered slots,
 * everywhere the gallery system keeps them. One image library per place: supporting surfaces
 * (Apollo annotation ring photos, …) reference gallery slots, not separate pools.
 *
 * drop-gallery-slots.mjs renumbers inside one gallery and replace-gallery-slots.ts re-fetches an
 * original over an existing slot; neither moves a built image between directories, hence this.
 *
 * Spec: `<from stem>=<to slot>[@x,y]`, both relative to static/images, e.g.
 *   moon-sites/annotations/as11-40-5948=missions/apollo11/06@0.5,0.5
 * The target must be the next free number of its gallery (no gaps). @x,y is the 1x1 crop focal
 * point (0..1, default centre).
 *
 * What moves / is written:
 * - static/images/<from>*.webp (base + ladder rungs) and masters/<from>.jpg → the slot's names;
 * - every JSON under static/data and the alt-text sources map: keys and strings naming the old
 *   path are rewritten (provenance ids recomputed from the new path; files already sorted stay
 *   sorted);
 * - what a gallery slot has and a bare ladder does not: the 1x1 crop, its provenance row, alt
 *   text under the 1x1 key in all locales + the alt-text sources hash, a hand-set vision row
 *   (score 8, like replace-gallery-slots), image-approved's NN.jpg / NN.1x1.jpg (the ladder-rung
 *   entries a bare image carried are dropped).
 *
 * Usage: npx tsx scripts/move-image-to-gallery.ts [--apply] <spec> …   (dry run without --apply)
 * Then: rebuild-gallery-manifests.ts (counts), vision/build-credit-thumbs.mjs, build-i18n-bundles.mjs,
 * mobile/build-offline-manifest.mjs and npm run validate-image-integrity.
 * Masters live in LFS: git lfs pull -I 'masters/<from dir>/**' first if they are pointers.
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { generateVariants } from './vision/crop-variants.ts';

const APPLY = process.argv.includes('--apply');
const specs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!specs.length) {
  console.error('usage: npx tsx scripts/move-image-to-gallery.ts [--apply] <from>=<to>[@x,y] …');
  process.exit(2);
}

interface Move {
  from: string;
  to: string;
  focal: [number, number];
}
const moves: Move[] = specs.map((s) => {
  const m = s.match(/^([a-z0-9/-]+)=([a-z0-9-]+\/[a-z0-9-]+\/\d\d)(?:@([\d.]+),([\d.]+))?$/);
  if (!m) throw new Error(`bad spec: ${s}`);
  return { from: m[1], to: m[2], focal: [Number(m[3] ?? 0.5), Number(m[4] ?? 0.5)] };
});

// Refuse before touching anything: source built, target the next contiguous free slot.
const nextFree = new Map<string, number>();
for (const mv of moves) {
  if (!existsSync(`static/images/${mv.from}.webp`)) throw new Error(`not on disk: ${mv.from}`);
  if (!existsSync(`masters/${mv.from}.jpg`)) throw new Error(`no master: masters/${mv.from}.jpg`);
  const dir = dirname(mv.to);
  if (!nextFree.has(dir)) {
    const nn = readdirSync(`static/images/${dir}`).filter((f) => /^\d\d\.webp$/.test(f)).length;
    nextFree.set(dir, nn + 1);
  }
  const want = nextFree.get(dir)!;
  if (mv.to !== `${dir}/${String(want).padStart(2, '0')}`)
    throw new Error(`${mv.to}: next free slot of ${dir} is ${String(want).padStart(2, '0')}`);
  nextFree.set(dir, want + 1);
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(`/images/(${moves.map((m) => esc(m.from)).join('|')})(?=[.\\-"]|$)`, 'g');
const target = new Map(moves.map((m) => [m.from, m.to]));
const rewrite = (s: string) => s.replace(re, (_a, from) => `/images/${target.get(from)}`);
const idOf = (p: string) => createHash('sha256').update(p).digest('hex').slice(0, 16);

const isSorted = (xs: string[]) => xs.every((x, i) => i === 0 || xs[i - 1] <= x);
const sortKey = (v: unknown) =>
  typeof v === 'string' ? v : ((v as { path?: string })?.path ?? '');
function walk(v: unknown): unknown {
  if (Array.isArray(v)) {
    const out = v.map(walk);
    const wasSorted = isSorted(v.map(sortKey));
    return wasSorted && !isSorted(out.map(sortKey))
      ? out.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1))
      : out;
  }
  if (v && typeof v === 'object') {
    const src = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(src)) out[rewrite(k)] = walk(x);
    if (typeof src.path === 'string' && typeof out.path === 'string' && out.path !== src.path)
      out.id = idOf(out.path as string);
    const wasSorted = isSorted(Object.keys(src));
    const keys = Object.keys(out);
    if (wasSorted && !isSorted(keys)) {
      const sorted: Record<string, unknown> = {};
      for (const k of keys.sort()) sorted[k] = out[k];
      return sorted;
    }
    return out;
  }
  return typeof v === 'string' ? rewrite(v) : v;
}

const files: string[] = ['scripts/i18n-tools/maps/alt-text-sources.json'];
const scan = (d: string) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) {
      if (p !== 'static/data/i18n') scan(p);
    } else if (e.name.endsWith('.json')) files.push(p);
  }
};
scan('static/data');
const indentOf = (text: string) => text.match(/^[{[]\r?\n([ \t]+)/)?.[1] ?? 0;
const writeLike = (p: string, text: string, v: unknown) =>
  writeFileSync(p, JSON.stringify(v, null, indentOf(text)) + (text.endsWith('\n') ? '\n' : ''));

let changed = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  re.lastIndex = 0;
  if (!re.test(text)) continue;
  re.lastIndex = 0;
  changed++;
  console.log(`  json ${f}`);
  if (APPLY) writeLike(f, text, walk(JSON.parse(text)));
}
console.log(`${moves.length} slots · ${changed} JSON files rewritten`);
if (!APPLY) {
  console.log('[dry run] nothing written');
  process.exit(0);
}

// Files: base + rungs of the served ladder, then the master.
for (const mv of moves) {
  const [dir, stem] = [dirname(mv.from), mv.from.split('/').pop()!];
  const toDir = dirname(mv.to);
  const nn = mv.to.split('/').pop()!;
  mkdirSync(`static/images/${toDir}`, { recursive: true });
  mkdirSync(`masters/${toDir}`, { recursive: true });
  for (const name of readdirSync(`static/images/${dir}`)) {
    const m = name.match(new RegExp(`^${esc(stem)}((?:-\\d+)?\\.webp)$`));
    if (m) renameSync(`static/images/${dir}/${name}`, `static/images/${toDir}/${nn}${m[1]}`);
  }
  renameSync(`masters/${mv.from}.jpg`, `masters/${mv.to}.jpg`);
}

// The 1x1 crop, then everything a gallery slot carries for it.
for (const mv of moves) {
  const master = `masters/${mv.to}.jpg`;
  await generateVariants({
    sourcePath: master,
    sourceBytes: readFileSync(master),
    focalPoint: { x: mv.focal[0], y: mv.focal[1] },
    outputBase: `static/images/${mv.to}`,
    forceRefresh: true,
  });
}
const webp = (m: Move) => `/images/${m.to}.webp`;
const crop = (m: Move) => `/images/${m.to}.1x1.jpg`;
const insertSorted = <T extends object>(o: T, add: Record<string, unknown>): T => {
  const keys = Object.keys(o);
  const out = { ...o, ...add } as Record<string, unknown>;
  if (!isSorted(keys)) return out as T;
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k];
  return sorted as T;
};
// Manifests are heterogeneous JSON; each edit below states the shape it needs.
/* eslint-disable @typescript-eslint/no-explicit-any */
const edit = (p: string, fn: (j: any) => any) => {
  const text = readFileSync(p, 'utf8');
  writeLike(p, text, fn(JSON.parse(text)));
};

edit('static/data/image-provenance.json', (j) => {
  const rows: any[] = j.entries;
  const sorted = isSorted(rows.map((r) => r.path));
  for (const m of moves) {
    const row = rows.find((r) => r.path === webp(m));
    if (!row) throw new Error(`no provenance row for ${webp(m)}`);
    rows.push({ ...row, id: idOf(crop(m)), path: crop(m) });
  }
  if (sorted) rows.sort((a, b) => (a.path < b.path ? -1 : 1));
  return j;
});
const LOCALES = readdirSync('static/data/image-alt-text').map((f) => f.replace(/\.json$/, ''));
let enAlt: Record<string, string> = {};
for (const l of LOCALES)
  edit(`static/data/image-alt-text/${l}.json`, (j) => {
    const map = j.entries ?? j;
    const add: Record<string, string> = {};
    for (const m of moves) {
      if (!map[webp(m)]) throw new Error(`${l}: no alt text for ${webp(m)}`);
      add[crop(m)] = map[webp(m)];
    }
    if (l === 'en-US') enAlt = { ...map };
    const next = insertSorted(map, add);
    return j.entries ? { ...j, entries: next } : next;
  });
edit('scripts/i18n-tools/maps/alt-text-sources.json', (j) => {
  const add: Record<string, string> = {};
  for (const m of moves) {
    const h = createHash('sha1')
      .update(String(enAlt[webp(m)]))
      .digest('base64url')
      .slice(0, 10);
    add[webp(m)] = h;
    add[crop(m)] = h;
  }
  return insertSorted(j, add);
});
edit('static/data/image-vision.json', (j) => {
  const add: Record<string, unknown> = {};
  for (const m of moves)
    add[`/images/${m.to}.jpg`] = {
      score: 8,
      subject: enAlt[webp(m)],
      category: 'surface',
      focal_point: { x: m.focal[0], y: m.focal[1] },
      subject_match: true,
      rejected_by: null,
      scored_at: new Date().toISOString(),
      scoring_cost_usd: 0,
    };
  return { ...j, entries: insertSorted(j.entries, add) };
});
edit('static/data/image-approved.json', (j) => {
  const gone = new RegExp(`^/images/(${moves.map((m) => esc(m.to)).join('|')})(-\\d+)?\\.webp$`);
  const keep: string[] = j.approved.filter((p: string) => !gone.test(p));
  for (const m of moves) keep.push(`/images/${m.to}.jpg`, crop(m));
  j.approved = [...new Set(keep)].sort();
  j.count = j.approved.length;
  return j;
});
console.log(
  'next: rebuild-gallery-manifests.ts · vision/build-credit-thumbs.mjs · build-i18n-bundles.mjs · build-offline-manifest.mjs · validate-image-integrity',
);
