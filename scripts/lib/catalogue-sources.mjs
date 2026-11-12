/**
 * Shared helpers for the authoritative-catalogue layer (GitHub #658): URL builders for the
 * record pages a value links to, fetch helpers for the services the refresh scripts query
 * (SIMBAD TAP and VizieR ASU on the CfA mirrors, NED ObjectLookup, Baumgardt, Harris), the
 * parsers, and the pure transforms (unit conversion, picking, angular matching).
 *
 * Why the CfA mirrors: the CDS Strasbourg hosts answer every path with a 404 page from the
 * dev box (docs/wip/2026-11-12-catalogue-layer-brief.md). Record URLs stored in the data
 * still name the canonical CDS hosts, because that is what a reader's browser reaches.
 *
 * Network code lives in the fetch* functions only; everything else is pure and unit-tested
 * (scripts/lib/catalogue-sources.test.ts). Run by hand from the refresh scripts, never at runtime.
 */

export const SIMBAD_TAP = 'https://simbad.cfa.harvard.edu/simbad/sim-tap/sync';
export const VIZIER_ASU = 'https://vizier.cfa.harvard.edu/viz-bin/asu-tsv';
export const NED_LOOKUP = 'https://ned.ipac.caltech.edu/srs/ObjectLookup';
export const BAUMGARDT_TABLE =
  'https://people.smp.uq.edu.au/HolgerBaumgardt/globular/orbits_table.txt';
export const HARRIS_FILE = 'https://physics.mcmaster.ca/~harris/mwgc.dat';

const USER_AGENT = 'orrery-catalogue-refresh (+https://github.com/chipi/orrery)';

export const LY_PER_PC = 3.261563777;

// ── record URLs (canonical CDS hosts: what a reader's browser reaches) ─────────────

export const simbadRecordUrl = (ident) =>
  `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(ident)}`;

export const nedRecordUrl = (name) =>
  `https://ned.ipac.caltech.edu/byname?objname=${encodeURIComponent(name)}`;

/** One row of a VizieR table, by a column constraint (the page the ASU query reads). */
export const vizierRowUrl = (table, column, value) =>
  `https://vizier.cds.unistra.fr/viz-bin/VizieR-4?-source=${encodeURIComponent(table)}&${column}=${encodeURIComponent(value)}`;

export const adsUrl = (bibcode) =>
  `https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(bibcode)}/abstract`;

export const baumgardtRecordUrl = (ongcName) =>
  `https://people.smp.uq.edu.au/HolgerBaumgardt/globular/fits/${ongcName.toLowerCase()}.html`;

export const exoplanetArchiveUrl = (host) =>
  `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(host)}`;

// ── fetching ─────────────────────────────────────────────────────────────────────

async function fetchWithRetry(url, init = {}, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        ...init,
        headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(90_000),
      });
      if (res.ok) return res;
      last = new Error(`${res.status} ${url}`);
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw last;
}

/** SIMBAD TAP query → array of row objects (CSV). */
export async function simbadQuery(adql) {
  const res = await fetchWithRetry(SIMBAD_TAP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      REQUEST: 'doQuery',
      LANG: 'ADQL',
      FORMAT: 'csv',
      QUERY: adql,
    }),
  });
  const text = await res.text();
  if (text.includes('QUERY_STATUS') && text.includes('ERROR')) {
    throw new Error(`SIMBAD TAP error: ${text.slice(0, 400)}`);
  }
  return parseCsv(text);
}

/** VizieR ASU query → { columns, rows }. `params` is a list of [key, value]. */
export async function vizierQuery(source, params = []) {
  const qs = new URLSearchParams([['-source', source], ...params]);
  let text = '';
  for (let i = 0; i < 4; i++) {
    text = await (await fetchWithRetry(`${VIZIER_ASU}?${qs.toString()}`)).text();
    if (!/^#INFO\tError=/m.test(text)) return parseAsuTsv(text);
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  throw new Error(`VizieR error for ${source}: ${(/^#INFO\tError=(.*)$/m.exec(text) ?? [])[1]}`);
}

export async function fetchText(url) {
  return (await fetchWithRetry(url)).text();
}

/** NED ObjectLookup → { name, ra, dec, type } or null when NED does not know the name. */
export async function nedLookup(name) {
  const res = await fetchWithRetry(NED_LOOKUP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: { v: name } }),
  });
  return parseNedLookup(await res.json());
}

// ── parsers (pure) ───────────────────────────────────────────────────────────────

/** Minimal RFC-4180 CSV: quoted fields, doubled quotes, CRLF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (!rows.length) return [];
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

/**
 * VizieR asu-tsv: `#` comment lines, a header line, a units line, a dashes line, then rows.
 * Cells are trimmed; empty cells are ''.
 */
export function parseAsuTsv(text) {
  const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  if (lines.length < 3) return { columns: [], rows: [] };
  const columns = lines[0].split('\t').map((c) => c.trim());
  const rows = lines.slice(3).map((l) => {
    const cells = l.split('\t');
    return Object.fromEntries(columns.map((c, i) => [c, (cells[i] ?? '').trim()]));
  });
  return { columns, rows };
}

/** NED ObjectLookup JSON → { name, ra, dec, type } or null (StatusCode ≠ 100). */
export function parseNedLookup(json) {
  if (!json || json.StatusCode !== 100 || !json.Preferred?.Name) return null;
  return {
    name: json.Preferred.Name,
    ra: json.Preferred.Position?.RA ?? null,
    dec: json.Preferred.Position?.Dec ?? null,
    type: json.ObjType?.Value ?? null,
  };
}

/**
 * Baumgardt's orbits_table.txt → Map(ongcName 'NGC5272' → { rsunKpc, errKpc, ra, dec }).
 * Names in the file look like `NGC_5272`, `Pal_5`, `Terzan_1`; only NGC / IC are keyed
 * the way OpenNGC names them.
 */
export function parseBaumgardt(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const f = line.trim().split(/\s+/);
    const m = /^(NGC|IC)_(\d+)$/.exec(f[0]);
    if (!m) continue;
    const rsun = Number(f[5]);
    const err = Number(f[6]);
    if (!Number.isFinite(rsun)) continue;
    out.set(`${m[1]}${m[2].padStart(4, '0')}`, {
      rsunKpc: rsun,
      errKpc: Number.isFinite(err) ? err : null,
      ra: Number(f[1]),
      dec: Number(f[2]),
    });
  }
  return out;
}

/**
 * Harris (2010 edition) mwgc.dat → Map(ongcName 'NGC5272' → { rsunKpc, vt }). Part I rows carry
 * the identification, positions and R_sun (third value after the coordinates); Part II rows
 * carry V_t in a fixed-width column (characters 40–46: [Fe/H] and other columns are blank for
 * some clusters, so a whitespace split would shift). Both parts key on the cluster ID.
 */
export function parseHarris(text) {
  const lines = text.split('\n');
  const partII = lines.findIndex((l) => /Part II:/.test(l) && /Metallicity/.test(l));
  const partIII = lines.findIndex((l) => /Part III:/.test(l) && /Velocities/.test(l));
  const key = (id) => {
    const m = /^(NGC|IC)\s+(\d+)\s*$/.exec(id.trim());
    return m ? `${m[1]}${m[2].padStart(4, '0')}` : null;
  };
  const out = new Map();
  for (const l of lines.slice(0, partII > 0 ? partII : lines.length)) {
    const m =
      /^\s*((?:NGC|IC)\s+\d+)\s+(?:.*?\s+)?\d\d \d\d [\d.]+\s+[+-]\d\d \d\d [\d.]+\s+(.*)$/.exec(l);
    if (!m) continue;
    const k = key(m[1]);
    if (!k) continue;
    const nums = m[2].trim().split(/\s+/).map(Number);
    // l, b, R_sun, R_gc, X, Y, Z
    out.set(k, { rsunKpc: Number.isFinite(nums[2]) ? nums[2] : null, vt: null });
  }
  if (partII > 0) {
    for (const l of lines.slice(partII, partIII > 0 ? partIII : lines.length)) {
      const k = key(l.slice(0, 11));
      if (!k || !out.has(k)) continue;
      const vt = Number(l.slice(40, 46));
      if (l.slice(40, 46).trim() !== '' && Number.isFinite(vt)) out.get(k).vt = vt;
    }
  }
  return out;
}

// ── transforms (pure) ────────────────────────────────────────────────────────────

/** Distance modulus → light-years. */
export const dmToLy = (dm) => Math.pow(10, (dm + 5) / 5) * LY_PER_PC;

export const pcToLy = (pc) => pc * LY_PER_PC;

/** A SIMBAD `mesdistance` row's distance in light-years from dist + unit (pc, kpc, Mpc). */
export function simbadDistToLy(dist, unit) {
  const d = Number(dist);
  if (!Number.isFinite(d) || d <= 0) return null;
  const u = String(unit).trim().toLowerCase();
  const pc = u === 'pc' ? d : u === 'kpc' ? d * 1e3 : u === 'mpc' ? d * 1e6 : null;
  return pc === null ? null : pcToLy(pc);
}

const bibYear = (b) => Number(String(b).slice(0, 4)) || 0;
const isParallax = (m) => /^(plx|paral)/i.test(String(m).trim());

/**
 * Pick one distance from SIMBAD `mesdistance` rows. Rule: parallax-method rows first, newest
 * bibcode year among them; when none has a parallax method, newest bibcode among all
 * when they agree within a factor of two (otherwise none). The rows that were not picked are summarised (count and range) so the data can say how much the
 * catalogue disagrees with itself.
 */
export function pickSimbadDistance(rows) {
  const usable = rows
    .map((r) => ({ ...r, ly: simbadDistToLy(r.dist, r.unit) }))
    .filter((r) => r.ly !== null && r.bibcode);
  if (!usable.length) return null;
  const plx = usable.filter((r) => isParallax(r.method));
  const spread = Math.max(...usable.map((r) => r.ly)) / Math.min(...usable.map((r) => r.ly));
  // No parallax among them and the rows disagree by more than a factor of two: no honest pick.
  if (!plx.length && spread > 2) return null;
  const pool = plx.length ? plx : usable;
  const picked = [...pool].sort(
    (a, b) => bibYear(b.bibcode) - bibYear(a.bibcode) || a.ly - b.ly,
  )[0];
  const lys = usable.map((r) => r.ly);
  return {
    ly: picked.ly,
    bibcode: picked.bibcode,
    method: String(picked.method).trim() || null,
    others: usable.length - 1,
    rangeLy: [Math.min(...lys), Math.max(...lys)],
  };
}

/**
 * Median of every usable SIMBAD distance (galaxies: single measurements by redshift, Tully-Fisher
 * or kinematics scatter widely, so no one row is picked). Returns { ly, n, rangeLy } or null.
 */
export function medianSimbadDistance(rows) {
  const lys = rows
    .map((r) => simbadDistToLy(r.dist, r.unit))
    .filter((v) => v !== null)
    .sort((a, b) => a - b);
  if (!lys.length) return null;
  const mid = lys.length >> 1;
  const ly = lys.length % 2 ? lys[mid] : (lys[mid - 1] + lys[mid]) / 2;
  return { ly, n: lys.length, rangeLy: [lys[0], lys[lys.length - 1]] };
}

/** Pick one SIMBAD V-band flux: rows with a bibcode first, newest; else the first row. */
export function pickSimbadV(rows) {
  const v = rows
    .filter(
      (r) => String(r.filter).trim() === 'V' && Number.isFinite(Number(r.flux)) && r.flux !== '',
    )
    .map((r) => ({ mag: Number(r.flux), bibcode: r.bibcode || null }));
  if (!v.length) return null;
  const withBib = v.filter((r) => r.bibcode);
  return (
    withBib.length ? [...withBib].sort((a, b) => bibYear(b.bibcode) - bibYear(a.bibcode)) : v
  )[0];
}

/** Significant-figure rounding that keeps the scale. */
export function roundSig(n, sig) {
  if (n === 0) return 0;
  const p = Math.pow(10, sig - Math.ceil(Math.log10(Math.abs(n))));
  return Math.round(n * p) / p;
}

/**
 * The panel's English distance string for a light-year value: "~1,350 light-years",
 * "~28,000 light-years", "~2.5 million light-years". Two significant figures from ten
 * thousand up (catalogue distances are never better than a few per cent), three below.
 */
export function distanceLabel(ly) {
  const r = roundSig(ly, ly >= 1e4 ? 2 : 3);
  if (r >= 1e9) return `~${trim(r / 1e9)} billion light-years`;
  if (r >= 1e6) return `~${trim(r / 1e6)} million light-years`;
  return `~${Math.round(r).toLocaleString('en-US')} light-years`;
}
const trim = (n) => String(Number(n.toPrecision(3)));

/** Angular separation of two sky points, degrees. */
export function angSepDeg(ra1, dec1, ra2, dec2) {
  const d = Math.PI / 180;
  const a =
    Math.sin(((dec2 - dec1) * d) / 2) ** 2 +
    Math.cos(dec1 * d) * Math.cos(dec2 * d) * Math.sin(((ra2 - ra1) * d) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(a))) * 180) / Math.PI;
}

/** The nearest row to a point within `maxDeg`, or null. rows need numeric ra / dec. */
export function nearest(rows, ra, dec, maxDeg) {
  let best = null;
  for (const r of rows) {
    const s = angSepDeg(ra, dec, r.ra, r.dec);
    if (s <= maxDeg && (!best || s < best.sep)) best = { row: r, sep: s };
  }
  return best;
}

/** OpenNGC name 'NGC1976' / 'IC0342' → the spaced designation 'NGC 1976' / 'IC 342'. */
export function ongcToDesignation(name) {
  const m = /^(NGC|IC)(\d+)([A-Z]*)$/.exec(name);
  return m ? `${m[1]} ${Number(m[2])}${m[3]}` : name;
}

/**
 * Candidate SIMBAD `ident.id` spellings for a plain designation. SIMBAD pads the number to a
 * prefix-specific width ('M   1', 'M  87', 'M 104', 'NGC  1976'), so every plausible width is
 * offered and the query takes whichever exists.
 */
export function simbadIdentCandidates(designation) {
  const m = /^(M|NGC|IC|HCG)\s*(\d+)([A-Za-z]*)$/.exec(designation.trim());
  if (!m) return [designation.trim()];
  const out = [];
  for (let w = String(Number(m[2])).length; w <= 5; w++) {
    out.push(`${m[1]} ${String(Number(m[2])).padStart(w, ' ')}${m[3]}`);
  }
  return [...new Set(out)];
}

/** Hunt & Reffert 2023 row name for an OpenNGC name: 'NGC6405' → 'NGC_6405'. */
export const huntReffertName = (ongcName) => {
  const m = /^(NGC|IC)(\d+)$/.exec(ongcName);
  return m ? `${m[1]}_${Number(m[2])}` : null;
};

/** McConnachie 2012 (J/AJ/144/4/catalog) rows → Map(name → { dKpc, vmag, ra, dec }). D is whole kpc. */
export function parseMcConnachie(rows) {
  const out = new Map();
  for (const r of rows) {
    const d = Number(r.D);
    if (!r.Name || !Number.isFinite(d) || d <= 0) continue;
    const v = Number(r.Vmag);
    out.set(r.Name.trim(), {
      dKpc: d,
      uncertain: r.u_D.trim() === ':',
      vmag: r.Vmag.trim() !== '' && Number.isFinite(v) ? v : null,
    });
  }
  return out;
}

/** Fetch the McConnachie 2012 catalogue. */
export async function fetchMcConnachie() {
  const t = await vizierQuery('J/AJ/144/4/catalog', [
    ['-out.max', 'unlimited'],
    ['-out', 'Name'],
    ['-out', 'D'],
    ['-out', 'u_D'],
    ['-out', 'Vmag'],
  ]);
  return parseMcConnachie(t.rows);
}
