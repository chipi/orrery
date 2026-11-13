// Build-time normaliser for the deep-sky catalogue (/explore v2 Slice 4).
//
// Reads the vendored OpenNGC snapshot (refresh-messier-catalog.mjs) and the
// curated gallery (`static/data/deep-sky.json`), joins them on designation, and
// emits `static/data/universe/deep-sky-objects.json`: one entry per object with
// a normalised type, a unit sky-sphere direction (RA/Dec → xyz, matching the
// Local-Group billboard convention), the real distance (parsed from the gallery
// where a curated photo exists — catalogue-only dots stay null rather than
// guess), and `photoKey` when a curated photo backs it.
//
// Placement is direction-only: like the Local-Group billboards, deep-sky objects
// live far beyond the 60 pc neighbourhood, so the scene puts them on a distant
// celestial sphere by direction; real distance drives the panel, not xyz.
//
// Catalogue layer (GitHub #658): the snapshot carries per-field { value, source, bibcode,
// record_url, note? } entries (scripts/refresh-messier-catalog.mjs). A catalogue distance replaces
// the gallery caption's; a caption distance is kept only where no catalogue answers, and then
// carries no `catalogue.dist_ly` entry (so the panel names no source for it).
//
// Run: tsx scripts/build-universe-deep-sky.ts
import fs from 'node:fs';
import path from 'node:path';
import { distanceLabel } from './lib/catalogue-sources.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

interface SnapObject {
  designation: string;
  name: string;
  ra: number;
  dec: number;
  type: string;
  con: string;
  mag: number | null;
  size: number | null;
  common: string;
  catalogue?: Record<string, CatalogueEntry>;
  records?: { simbad?: string; ned?: string };
}
interface CatalogueEntry {
  value: number | number[];
  source: string;
  bibcode: string | null;
  record_url: string;
  note?: string;
}
interface GalleryRow {
  key: string;
  designation?: string;
  title?: string;
  subject?: string;
  type?: string;
  distance?: string;
  telescope?: string;
  constellation?: string;
}

const snap = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/data-snapshots/messier-catalog.json'), 'utf8'),
) as { objects: SnapObject[] };

const galleryRaw = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'static/data/deep-sky.json'), 'utf8'),
) as unknown;
const galleryRows: GalleryRow[] = Array.isArray(galleryRaw)
  ? (galleryRaw as GalleryRow[])
  : ((galleryRaw as { images?: GalleryRow[] }).images ??
    (Object.values(galleryRaw as Record<string, unknown>).find(Array.isArray) as GalleryRow[]));

/** Normalised category for colour + label + gateway logic. */
type Category =
  | 'galaxy'
  | 'galaxy-cluster'
  | 'nebula'
  | 'planetary-nebula'
  | 'supernova-remnant'
  | 'star-forming-region'
  | 'dark-nebula'
  | 'star-cluster'
  | 'globular-cluster'
  | 'star'
  | 'other';

function classify(ngcType: string, galleryType?: string): Category {
  const g = (galleryType ?? '').toLowerCase();
  if (g.includes('star-forming') || g.includes('stellar nursery')) return 'star-forming-region';
  if (g.includes('planetary nebula')) return 'planetary-nebula';
  if (g.includes('supernova')) return 'supernova-remnant';
  if (g.includes('dark nebula')) return 'dark-nebula';
  if (g.includes('globular')) return 'globular-cluster';
  if (g.includes('galaxy cluster') || g.includes('cluster of galaxies')) return 'galaxy-cluster';
  if (g.includes('galaxy') || g.includes('galaxies')) return 'galaxy';

  const t = ngcType.toUpperCase();
  if (t === 'PN') return 'planetary-nebula';
  if (t === 'SNR') return 'supernova-remnant';
  if (t === 'DRKN') return 'dark-nebula';
  if (t === 'GCL') return 'globular-cluster';
  if (t === 'GGROUP' || t === 'GPAIR' || t === 'GTRPL') return 'galaxy-cluster';
  if (t === 'G') return 'galaxy';
  if (t === 'HII' || t === 'CL+N' || t === 'OCL+N') return 'star-forming-region';
  if (t === 'OCL' || t === 'CL') return 'star-cluster';
  if (t.startsWith('*') || t === 'WR*' || t === 'V*') return 'star';
  if (t === 'EMN' || t === 'RFN' || t === 'NEB') return 'nebula';
  return 'other';
}

/** Parse a human distance string ("~7,600 light-years", "~2.5 million
 * light-years", "~45–65 million light-years") to light-years. Non-ly units
 * (AU) and unparseable strings return null — we label without a distance
 * rather than guess. */
function parseDistLy(s?: string): number | null {
  if (!s) return null;
  if (/\bAU\b/i.test(s) && !/light-year/i.test(s)) return null;
  const m =
    /([\d,]+(?:\.\d+)?)(?:\s*[–-]\s*([\d,]+(?:\.\d+)?))?\s*(billion|million|thousand)?/i.exec(s);
  if (!m) return null;
  const lo = parseFloat(m[1].replace(/,/g, ''));
  const hi = m[2] ? parseFloat(m[2].replace(/,/g, '')) : lo;
  const base = (lo + hi) / 2;
  const mult = m[3] ? { billion: 1e9, million: 1e6, thousand: 1e3 }[m[3].toLowerCase()]! : 1;
  return Math.round(base * mult);
}

/** RA/Dec (deg, J2000) → unit sky-sphere direction. Y-up scene convention,
 * identical to galaxies-layer.ts radecToScene (r = 1). */
function radecToUnit(raDeg: number, decDeg: number) {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  return {
    x: +(Math.cos(dec) * Math.cos(ra)).toFixed(6),
    y: +Math.sin(dec).toFixed(6),
    z: +(Math.cos(dec) * Math.sin(ra)).toFixed(6),
  };
}

function slug(designation: string): string {
  return designation
    .toLowerCase()
    .replace(/[/\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Curated "forming-system" gateways (Slice 4 Part 4). A star-forming region is
// where planetary systems are born; from inside the nursery you can zoom onward
// to a real exoplanet system as an *illustration* of what forms there (not a
// claim the system lies inside that nebula). Mapped by designation → host id in
// exoplanet-systems.json. Only a few regions carry an honest, resonant target;
// the rest have none (noted, per the plan). Rho Oph ↔ Barnard's Star share the
// Ophiuchus direction; the others are editorial archetypes.
const GATEWAY: Record<string, string> = {
  'Rho Ophiuchi': 'barnards-star',
  M42: 'trappist-1',
  'NGC 3324': '51-pegasi',
  'Serpens Nebula': 'toi-700',
};

// Corrections the deep-text science reviews settled that the catalogues do not decide: the
// common name the text uses (one name per entity), and categories the OpenNGC type gets wrong.
const NAME_OVERRIDE: Record<string, string> = {
  M11: 'Wild Duck Cluster',
  M17: 'Omega Nebula',
  M76: 'Little Dumbbell Nebula',
  'NGC 104': '47 Tucanae', // OpenNGC: "47 Tuc Cluster"
  'NGC 6752': 'NGC 6752', // OpenNGC has no common name
};
const CATEGORY_OVERRIDE: Record<string, Category> = {
  'Gum 29': 'star-cluster', // Westerlund 2: the text and caption treat it as a cluster
  M24: 'other', // the Sagittarius Star Cloud is a patch of sky, not a star
};
// OpenNGC writes Serpens Caput / Cauda as Se1 / Se2.
const CON_FIX: Record<string, string> = { Se1: 'Ser', Se2: 'Ser' };

// Index gallery rows by designation (first curated photo wins; the gallery
// often has multiple photos of the same object — the scene picks one).
const galleryByDesig = new Map<string, GalleryRow>();
for (const row of galleryRows) {
  const d = (row.designation ?? '').trim();
  if (!d) continue;
  if (!galleryByDesig.has(d)) galleryByDesig.set(d, row);
}

const objects = snap.objects.map((o) => {
  const photo = galleryByDesig.get(o.designation);
  const category = classify(o.type, photo?.type ?? photo?.subject);
  const dir = radecToUnit(o.ra, o.dec);
  // Prefer a clean common name; fall back to designation.
  const commonName =
    NAME_OVERRIDE[o.designation] ??
    ((o.common || '').split(',')[0].trim() || o.name || o.designation);
  const cat = o.catalogue ?? {};
  const catDist = cat.dist_ly && typeof cat.dist_ly.value === 'number' ? cat.dist_ly : null;
  const catLy = typeof catDist?.value === 'number' ? catDist.value : null;
  const catalogue: Record<string, CatalogueEntry> = { ...cat };
  const galleryLy = parseDistLy(photo?.distance);
  if (
    catDist &&
    catLy &&
    photo?.distance &&
    galleryLy &&
    Math.abs(galleryLy - catLy) / catLy > 0.15
  ) {
    catalogue.dist_ly = {
      ...catDist,
      note: [catDist.note, `gallery caption said ${photo.distance}`].filter(Boolean).join('; '),
    };
  }
  const distLy = catDist ? (catDist.value as number) : galleryLy;
  return {
    id: slug(o.designation),
    designation: o.designation,
    name: commonName,
    category: CATEGORY_OVERRIDE[o.designation] ?? category,
    ra: o.ra,
    dec: o.dec,
    x: dir.x,
    y: dir.y,
    z: dir.z,
    mag: o.mag,
    size_arcmin: o.size,
    con: CON_FIX[o.con] ?? o.con,
    dist_ly: distLy === null ? null : Math.round(distLy),
    dist_label: catDist ? distanceLabel(catDist.value as number) : (photo?.distance ?? null),
    photoKey: photo?.key ?? null,
    photoTitle: photo?.title ?? null,
    gatewaySystem: GATEWAY[o.designation] ?? null,
    records: o.records ?? {},
    catalogue,
  };
});

// Stable order: photo-backed objects first (by designation), then dots.
objects.sort((a, b) => {
  if (!!a.photoKey !== !!b.photoKey) return a.photoKey ? -1 : 1;
  return a.designation.localeCompare(b.designation, 'en', { numeric: true });
});

const withPhoto = objects.filter((o) => o.photoKey).length;
const out = {
  _generated: 'scripts/build-universe-deep-sky.ts — do not edit by hand',
  _source:
    'joins scripts/data-snapshots/messier-catalog.json (OpenNGC + Harris, Baumgardt & Vasiliev, Hunt & Reffert, Cosmicflows-4, McConnachie, SIMBAD) × static/data/deep-sky.json',
  _count: objects.length,
  _withPhoto: withPhoto,
  objects,
};

const OUT = path.join(ROOT, 'static/data/universe/deep-sky-objects.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(
  `✓ wrote ${objects.length} deep-sky objects (${withPhoto} photo-backed) → ${path.relative(ROOT, OUT)}`,
);

// Warn on any gallery deep-sky designation that failed to join (excluding the
// solar-system entries which are intentionally not deep-sky).
const SOLAR = new Set(['', 'Pluto', 'Sol']);
const joined = new Set(objects.filter((o) => o.photoKey).map((o) => o.designation));
const missing = [
  ...new Set(
    galleryRows
      .map((r) => (r.designation ?? '').trim())
      .filter((d) => !SOLAR.has(d) && !joined.has(d)),
  ),
];
if (missing.length) console.warn(`⚠ gallery designations not joined: ${missing.join(', ')}`);
