// en-US overlays for data sets whose English lives only in static/data (site stories,
// …): the translatable fields, in the overlay shape each loader merges, so the
// translators (retranslate-fields.mjs) and the all-locale overlay gate see them like
// every other surface. Also writes a retranslate manifest for the given locales, for
// target files that do not exist yet (seeded with the English, then translated).
//   node scripts/i18n-tools/build-en-overlays.mjs <surface> [--seed=de,fr,…] [--manifest=<out.json>]
import fs from 'node:fs';
import path from 'node:path';

const [surface, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(
  rest.map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=')];
  }),
);

/** surface → [{ rel (overlay path without .json), doc (overlay object) }] */
const SURFACES = {
  'site-stories': () => {
    const dir = 'static/data/site-stories';
    return (
      fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json') && f !== 'index.json')
        .map((f) => [f, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))])
        // a `null` file is a placeholder for a site without a story (not in index.json)
        .filter(([, s]) => s)
        .map(([f, s]) => {
          return {
            rel: `site-stories/${f.replace(/\.json$/, '')}`,
            doc: {
              intro: s.intro,
              chapters: s.chapters.map((c) => ({
                id: c.id,
                title: c.title,
                ...(c.subtitle ? { subtitle: c.subtitle } : {}),
                images: c.images.map((i) => ({ src: i.src, caption: i.caption })),
              })),
            },
          };
        })
    );
  },
  // deep-sky gallery: one overlay keyed by image key (src/lib/deep-sky.ts localizeDeepSky);
  // telescopes, instruments, constellations and credits are names and stay shared
  'deep-sky': () => {
    const images = JSON.parse(fs.readFileSync('static/data/deep-sky.json', 'utf8'));
    const doc = {};
    for (const img of images) {
      const o = {};
      for (const k of ['title', 'caption', 'subject', 'type', 'distance', 'taken'])
        if (typeof img[k] === 'string' && img[k] && img[k] !== '—') o[k] = img[k];
      doc[img.key] = o;
    }
    return [{ rel: 'deep-sky', doc }];
  },
  // trajectories: display text only (src/lib/three/iconic-trajectory.ts
  // localizeTrajectory); waypoints by index, unlabeled ones null
  trajectories: () => {
    const dir = 'static/data/trajectories';
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        const doc = { name: t.name };
        if (t.current_distance_label) doc.current_distance_label = t.current_distance_label;
        if (t.interstellar_since_label) doc.interstellar_since_label = t.interstellar_since_label;
        if (t.waypoints?.some((w) => w.label))
          doc.waypoints = t.waypoints.map((w) => (w.label ? { label: w.label } : null));
        return { rel: `trajectories/${f.replace(/\.json$/, '')}`, doc };
      });
  },
  // videos: title + caption by manifest id (src/lib/video-provenance.ts localizeVideos)
  videos: () => {
    const m = JSON.parse(fs.readFileSync('static/data/video-provenance.json', 'utf8'));
    const doc = {};
    for (const e of m.entries) {
      const o = {};
      if (e.title) o.title = e.title;
      if (e.caption) o.caption = e.caption;
      if (Object.keys(o).length) doc[e.id] = o;
    }
    return [{ rel: 'videos', doc }];
  },
  // /colophon original-work: per section, entries keyed like src/lib/original-work.ts
  // originalWorkKey (file, else thumbnail, else the English title; dots → _)
  'original-work': () => {
    const m = JSON.parse(fs.readFileSync('static/data/original-work.json', 'utf8'));
    const doc = {};
    for (const [section, entries] of Object.entries(m)) {
      if (!Array.isArray(entries)) continue;
      const o = {};
      for (const e of entries) {
        const t = {};
        for (const k of ['title', 'what', 'where'])
          if (typeof e[k] === 'string' && e[k]) t[k] = e[k];
        if (Object.keys(t).length) o[(e.file || e.thumb || e.title).replace(/\./g, '_')] = t;
      }
      if (Object.keys(o).length) doc[section] = o;
    }
    return [{ rel: 'original-work', doc }];
  },
};

// Fields that are keys, not text: never translated.
const KEY = /^(id|src|key|provider_ref|route|file|thumb)$/;
function textPaths(o, at = '') {
  if (typeof o === 'string') return [at];
  if (Array.isArray(o)) return o.flatMap((x, i) => textPaths(x, at ? `${at}.${i}` : `${i}`));
  if (o && typeof o === 'object')
    return Object.entries(o)
      .filter(([k, v]) => !KEY.test(k) && v != null && v !== '')
      .flatMap(([k, v]) => textPaths(v, at ? `${at}.${k}` : k));
  return [];
}

const build = SURFACES[surface];
if (!build)
  throw new Error(`unknown surface ${surface}; known: ${Object.keys(SURFACES).join(', ')}`);
const items = build();
const seed = args.seed ? args.seed.split(',') : [];
const manifest = [];
for (const { rel, doc } of items) {
  const en = path.join('i18n-src', 'en-US', `${rel}.json`);
  fs.mkdirSync(path.dirname(en), { recursive: true });
  fs.writeFileSync(en, JSON.stringify(doc, null, 2) + '\n');
  for (const loc of seed) {
    const tgt = path.join('i18n-src', loc, `${rel}.json`);
    if (fs.existsSync(tgt)) {
      // --pending: a seeded file whose fields are still the English (a run that
      // stopped part-way) gets those fields into the manifest again
      if (!args.pending) continue;
      const cur = JSON.parse(fs.readFileSync(tgt, 'utf8'));
      const at = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
      const paths = textPaths(doc).filter((p) => at(cur, p) === at(doc, p));
      if (paths.length) manifest.push({ loc, file: rel, paths });
      continue;
    }
    fs.mkdirSync(path.dirname(tgt), { recursive: true });
    fs.writeFileSync(tgt, JSON.stringify(doc, null, 2) + '\n');
    manifest.push({ loc, file: rel, paths: textPaths(doc) });
  }
}
if (args.manifest) fs.writeFileSync(args.manifest, JSON.stringify(manifest, null, 1) + '\n');
const fields = manifest.reduce((n, m) => n + m.paths.length, 0);
console.log(
  `${surface}: ${items.length} en-US overlays; seeded ${manifest.length} files, ${fields} fields`,
);
