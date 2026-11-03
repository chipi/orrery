/**
 * build-model-references.ts — credits the pages Orrery's ORIGINAL 3D models took their sizes and
 * shapes from. The models (launchers, showcase spacecraft, landmarks, the cartoon cast) are our
 * own geometry; their dimensions come from public pages, listed in three places:
 *
 *  - each showcase model's `refs` (src/lib/three/showcase/*.ts),
 *  - the `links` of every fleet entry the /fleet line-ups draw (launchers with a dedicated
 *    model, the spacecraft with a showcase or line-up model),
 *  - the landmark and cartoon-cast sources named in the header comments of
 *    src/lib/three/lineup/scale-figures.ts and cartoon-figures.ts.
 *
 * It rewrites the `models-ref-*` entries of static/data/data-sources.json (one per publisher,
 * with a `references` list of every page) and leaves all other entries untouched. A page from a
 * publisher not listed in PUBLISHERS fails the run, so a new source is never credited by accident
 * under the wrong publisher.
 *
 *   npx tsx scripts/build-model-references.ts
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { SHOWCASE as CAPSULES } from '../src/lib/three/showcase/capsules-commercial';
import { SHOWCASE as SOYUZ } from '../src/lib/three/showcase/soyuz-progress';
import { SHOWCASE as FREIGHTERS } from '../src/lib/three/showcase/station-freighters';
import { SHOWCASE as WINGED } from '../src/lib/three/showcase/winged';

interface Ref {
  l: string;
  u: string;
}
interface Publisher {
  id: string;
  name: string;
  hosts: RegExp;
  home: string;
  what: string;
  license_short: string;
  license_url: string;
  license_rationale: string;
}

const FACTS_ONLY =
  'Only individual measurements (lengths, diameters, heights, stage and engine counts) were read from these pages; facts are not eligible for copyright, and no text, photograph or drawing was copied.';

const PUBLISHERS: Publisher[] = [
  {
    id: 'models-ref-wikipedia',
    name: '3D model references — Wikipedia',
    hosts: /(^|\.)wikipedia\.org$/,
    home: 'https://www.wikipedia.org/',
    what: 'Wikipedia articles (English, Russian and Chinese) that gave the lengths, diameters and proportions of the launcher and spacecraft models and the heights of the landmarks, statues and animals drawn beside them in the /fleet line-ups. The models and outlines are our own; only measurements were read.',
    license_short: 'CC-BY-SA-4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    license_rationale:
      'Wikipedia text is published under Creative Commons Attribution-ShareAlike. Only measurements were read; none of the article text is reproduced, and each page is credited here.',
  },
  {
    id: 'models-ref-nssdca',
    name: '3D model references — NASA NSSDCA',
    hosts: /^nssdc\.gsfc\.nasa\.gov$/,
    home: 'https://nssdc.gsfc.nasa.gov/',
    what: 'NASA Space Science Data Coordinated Archive (NSSDCA) spacecraft and launch-vehicle pages that gave the masses, lengths and diameters of the craft and rockets modelled for /fly and the /fleet line-ups.',
    license_short: 'PD-NASA',
    license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    license_rationale:
      'NASA-produced material is generally not copyrighted (17 U.S.C. §105). Only measurements were read.',
  },
  {
    id: 'models-ref-nasa',
    name: '3D model references — NASA',
    hosts: /(^|\.)(nasa\.gov)$/,
    home: 'https://www.nasa.gov/',
    what: 'NASA mission, vehicle and history pages (nasa.gov, history.nasa.gov, science.nasa.gov) that gave the dimensions of the crewed capsules, cargo craft, Shuttle orbiters and launchers modelled for /fly and the /fleet line-ups.',
    license_short: 'PD-NASA',
    license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    license_rationale:
      'NASA-produced material is generally not copyrighted (17 U.S.C. §105). Only measurements were read.',
  },
  {
    id: 'models-ref-nps',
    name: '3D model references — U.S. National Park Service',
    hosts: /^www\.nps\.gov$/,
    home: 'https://www.nps.gov/',
    what: 'The National Park Service “Statue Statistics” page for the Statue of Liberty: its 92.99 m height from the ground to the torch tip, with the pedestal and the statue itself — the scale figure beside the rockets in the /fleet launcher line-up.',
    license_short: 'PD-USGov',
    license_url: 'https://www.usa.gov/government-works',
    license_rationale:
      'Created by U.S. federal government employees as part of their official duties — not subject to U.S. copyright.',
  },
  {
    id: 'models-ref-esa',
    name: '3D model references — ESA',
    hosts: /(^|\.)esa\.int$/,
    home: 'https://www.esa.int/',
    what: 'European Space Agency pages (ATV, Ariane, Rosetta and others) that gave the dimensions of the European craft and launchers modelled for /fly and the /fleet line-ups.',
    license_short: 'CC-BY-SA-3.0-IGO',
    license_url: 'https://creativecommons.org/licenses/by-sa/3.0/igo/',
    license_rationale:
      'ESA publishes most of its material under CC BY-SA 3.0 IGO. Only measurements were read.',
  },
  {
    id: 'models-ref-jaxa',
    name: '3D model references — JAXA',
    hosts: /(^|\.)jaxa\.jp$/,
    home: 'https://global.jaxa.jp/',
    what: 'JAXA pages on the H-IIA, H3, M-V and the HTV / HTV-X transfer vehicles that gave the dimensions of the Japanese launchers and cargo craft modelled for /fly and the /fleet line-ups.',
    license_short: 'JAXA-OPEN',
    license_url: 'https://global.jaxa.jp/policy.html',
    license_rationale:
      'JAXA permits non-commercial reuse with attribution under its open distribution policy. Only measurements were read.',
  },
  {
    id: 'models-ref-isro',
    name: '3D model references — ISRO',
    hosts: /(^|\.)isro\.gov\.in$/,
    home: 'https://www.isro.gov.in/',
    what: 'ISRO launcher and Gaganyaan pages (PSLV, GSLV Mk III / LVM3, the crew module) that gave the dimensions of the Indian vehicles modelled for /fly and the /fleet line-ups.',
    license_short: 'ISRO-EDU',
    license_url: 'https://www.isro.gov.in/',
    license_rationale:
      'ISRO publishes for educational, non-commercial use with attribution. Only measurements were read.',
  },
  {
    id: 'models-ref-agencies',
    name: '3D model references — agencies and manufacturers',
    hosts:
      /^(www\.roscosmos\.ru|www\.spacex\.com|www\.ulalaunch\.com|www\.spaceforce\.mil|www\.boeing\.com|www\.northropgrumman\.com|fireflyspace\.com|www\.arianespace\.com|en\.cmse\.gov\.cn|www\.spacechina\.com)$/,
    home: 'https://www.roscosmos.ru/',
    what: 'Official pages of space agencies and manufacturers (Roscosmos, SpaceX, United Launch Alliance, Boeing, Northrop Grumman, Firefly, Arianespace, the China Manned Space Agency and CASC, the U.S. Space Force) that gave vehicle dimensions for the launcher and spacecraft models.',
    license_short: 'PD-trivial',
    license_url: 'https://en.wikipedia.org/wiki/Threshold_of_originality',
    license_rationale: FACTS_ONLY,
  },
  {
    id: 'models-ref-independent',
    name: '3D model references — reference sites and museums',
    hosts:
      /^(space\.skyrocket\.de|www\.astronautix\.com|www\.russianspaceweb\.com|www\.buran-energia\.com|spaceflightnow\.com|www\.kennedyspacecenter\.com|www\.technik-museum\.de|airandspace\.si\.edu|californiasciencecenter\.org|intrepidmuseum\.org)$/,
    home: 'https://space.skyrocket.de/',
    what: 'Independent spaceflight references and museum pages (Gunter’s Space Page, Encyclopedia Astronautica, RussianSpaceWeb, the Smithsonian National Air and Space Museum, the Technik Museum Speyer and others) that gave the sizes of the Soviet, Shuttle and Buran-era vehicles.',
    license_short: 'PD-trivial',
    license_url: 'https://en.wikipedia.org/wiki/Threshold_of_originality',
    license_rationale: FACTS_ONLY,
  },
];

const read = (p: string): string => readFileSync(p, 'utf8');

/** Trim punctuation a sentence puts after a URL, keeping a ")" that closes a "(" inside it. */
function cleanUrl(raw: string): string {
  let u = raw;
  for (;;) {
    const t = u.replace(/[.,;:]+$/, '');
    if (t.endsWith(')') && (t.match(/\(/g) ?? []).length < (t.match(/\)/g) ?? []).length) {
      u = t.slice(0, -1);
    } else if (t !== u) u = t;
    else return u;
  }
}

function labelFor(u: string): string {
  const url = new URL(u);
  if (/wikipedia\.org$/.test(url.host)) {
    const title = decodeURIComponent(url.pathname.split('/').pop() ?? '').replace(/_/g, ' ');
    return `${title} — Wikipedia`;
  }
  if (url.host === 'www.nps.gov') return 'Statue Statistics — National Park Service';
  return u;
}

const refs = new Map<string, Ref>();
const add = (r: Ref): void => {
  const u = cleanUrl(r.u);
  const prev = refs.get(u);
  if (!prev || (!prev.l && r.l)) refs.set(u, { l: r.l || labelFor(u), u });
};

// 1. Showcase models' own refs.
for (const map of [CAPSULES, SOYUZ, FREIGHTERS, WINGED]) {
  for (const m of Object.values(map)) m.refs.forEach(add);
}

// 2. Landmarks and cast: URLs named in the two files' header comments.
for (const f of ['scale-figures.ts', 'cartoon-figures.ts']) {
  const header = read(`src/lib/three/lineup/${f}`).split('*/')[0];
  for (const m of header.matchAll(/https?:\/\/[^\s'"]+/g)) add({ l: '', u: m[0] });
}

// 3. Fleet entries the line-ups draw: launchers with a dedicated model, spacecraft with a
//    showcase or line-up model. Fleet links keep their own labels.
const launcherSrc = read('src/lib/three/launcher-models.ts');
const buildersBlock = launcherSrc.slice(
  launcherSrc.indexOf('const BUILDERS'),
  launcherSrc.indexOf('export const LAUNCHER_MODEL_IDS'),
);
const launcherIds = new Set(
  [...buildersBlock.matchAll(/^ {2}'?([a-z0-9-]+)'?:/gm)].map((m) => m[1]),
);
const registry = read('src/lib/physics/ascent/launch-profile-registry.ts');
const canon = new Map(
  [
    ...(registry.match(/LAUNCHER_ID_CANON[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '').matchAll(
      /'?([a-z0-9-]+)'?:\s*'([a-z0-9-]+)'/g,
    ),
  ].map((m) => [m[1], m[2]]),
);
canon.set('soyuz-u', 'soyuz'); // LINEUP_LAUNCHER_ALIAS in lineup-catalog.ts
const catalog = read('src/lib/three/lineup/lineup-catalog.ts');
const spacecraftBlock = catalog.slice(
  catalog.indexOf('const SPACECRAFT_MODELS'),
  catalog.indexOf('/** Fleet spacecraft ids the line-up can draw. */'),
);
const spacecraftIds = new Set([
  ...[...spacecraftBlock.matchAll(/^ {2}'?([a-z0-9-]+)'?:\s*\{/gm)].map((m) => m[1]),
  ...[CAPSULES, SOYUZ, FREIGHTERS, WINGED].flatMap((m) => Object.keys(m)),
]);

let fleetEntries = 0;
for (const cat of ['launcher', 'crewed-spacecraft', 'cargo-spacecraft']) {
  for (const file of readdirSync(`static/data/fleet/${cat}`)) {
    const e = JSON.parse(read(`static/data/fleet/${cat}/${file}`)) as {
      id: string;
      links?: Ref[];
    };
    const modelled =
      cat === 'launcher'
        ? launcherIds.has(canon.get(e.id) ?? e.id)
        : spacecraftIds.has(e.id) || spacecraftIds.has(canon.get(e.id) ?? e.id);
    if (!modelled) continue;
    fleetEntries++;
    for (const l of e.links ?? []) add({ l: l.l, u: l.u });
  }
}

// Group by publisher.
const groups = new Map<string, Ref[]>(PUBLISHERS.map((p) => [p.id, []]));
for (const r of refs.values()) {
  const host = new URL(r.u).host;
  const pub = PUBLISHERS.find((p) => p.hosts.test(host));
  if (!pub) throw new Error(`No publisher group for ${r.u} (${host}) — add it to PUBLISHERS.`);
  groups.get(pub.id)!.push(r);
}

const PATH = 'static/data/data-sources.json';
const manifest = JSON.parse(read(PATH)) as { schema_version: number; entries: { id: string }[] };
const kept = manifest.entries.filter((e) => !e.id.startsWith('models-ref-'));
const generated = PUBLISHERS.filter((p) => groups.get(p.id)!.length > 0).map((p) => ({
  id: p.id,
  name: p.name,
  catalog: `${groups.get(p.id)!.length} pages — sizes and proportions for the 3D models`,
  category: 'model-reference',
  description: p.what,
  source_url: p.home,
  license_short: p.license_short,
  license_url: p.license_url,
  license_rationale: p.license_rationale,
  used_on: ['fleet'],
  references: groups
    .get(p.id)!
    .sort((a, b) => a.l.localeCompare(b.l, 'en', { numeric: true }) || a.u.localeCompare(b.u)),
}));
manifest.entries = [...kept, ...generated];
writeFileSync(PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `data-sources.json: ${generated.length} model-reference entries, ${refs.size} pages from ${fleetEntries} fleet entries + showcase + landmark/cast sources`,
);
for (const g of generated) console.log(`  ${g.id}: ${g.references.length}`);
