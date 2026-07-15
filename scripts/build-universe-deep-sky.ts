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
// Run: tsx scripts/build-universe-deep-sky.ts
import fs from 'node:fs';
import path from 'node:path';

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

// Curated real distances for catalogue objects that have no gallery photo (the
// gallery is the usual distance source, so photo-less objects would otherwise show
// no distance). Real, sourced values — not guesses. M13: Harris globular-cluster
// catalogue, ~7.7 kpc.
const DIST_OVERRIDE: Record<string, string> = {
  M13: '~25,000 light-years',
};

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
  const commonName = (o.common || '').split(',')[0].trim() || o.name || o.designation;
  return {
    id: slug(o.designation),
    designation: o.designation,
    name: commonName,
    category,
    ra: o.ra,
    dec: o.dec,
    x: dir.x,
    y: dir.y,
    z: dir.z,
    mag: o.mag,
    size_arcmin: o.size,
    con: o.con,
    dist_ly: parseDistLy(photo?.distance ?? DIST_OVERRIDE[o.designation]),
    dist_label: photo?.distance ?? DIST_OVERRIDE[o.designation] ?? null,
    photoKey: photo?.key ?? null,
    photoTitle: photo?.title ?? null,
    gatewaySystem: GATEWAY[o.designation] ?? null,
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
  _source: 'joins scripts/data-snapshots/messier-catalog.json × static/data/deep-sky.json',
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
