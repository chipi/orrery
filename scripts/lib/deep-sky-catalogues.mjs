/**
 * Which catalogue answers which deep-sky value (GitHub #658). Pure: the refresh script does the
 * fetching and hands the results in as `data`; this module decides, builds the
 * `{ value, source, bibcode, record_url, note? }` entries, and records where catalogues disagree.
 *
 *   data = {
 *     harris, baumgardt          Map(OpenNGC name → …)   from parseHarris / parseBaumgardt
 *     hr, cg                     [{ name, ra, dec, distPc, type }]  Hunt & Reffert / Cantat-Gaudin
 *     lg                         Map(name → { dKpc, uncertain })    McConnachie 2012
 *     simbad                     Map(designation → { oid, mainId, ra, dec, vRows, distRows })
 *     cf4                        Map(designation → { pgc, dm, eDm, sepArcsec } | null)
 *     ned                        Map(designation → { name } | null)
 *   }
 *
 * An object may carry `lg` (its own McConnachie name: a Local Group member) or `lgHost` (the
 * McConnachie name of the galaxy it sits in: the cluster or nebula shares the host's distance).
 */
import {
  HARRIS_FILE,
  LY_PER_PC,
  angSepDeg,
  baumgardtRecordUrl,
  dmToLy,
  huntReffertName,
  medianSimbadDistance,
  nearest,
  nedRecordUrl,
  pcToLy,
  pickSimbadDistance,
  pickSimbadV,
  simbadRecordUrl,
  vizierRowUrl,
} from './catalogue-sources.mjs';

export const OPENNGC_FILE =
  'https://github.com/mattiaverga/OpenNGC/blob/master/database_files/NGC.csv';

export const BIB = {
  hr23: '2023A&A...673A.114H',
  cg20: '2020A&A...640A...1C',
  bv21: '2021MNRAS.505.5957B',
  harris96: '1996AJ....112.1487H',
  cf4: '2023ApJ...944...94T',
  mcc12: '2012AJ....144....4M',
};

const GALAXY_TYPES = new Set(['G', 'GPair', 'GGroup', 'GTrpl']);

/** The catalogue-relevant kind of an object, from its OpenNGC type (or an explicit hint). */
export function catalogueKind(o) {
  if (o.kind) return o.kind;
  if (o.type === 'GCl') return 'globular';
  if (o.type === 'OCl') return 'open-cluster';
  if (GALAXY_TYPES.has(o.type)) return 'galaxy';
  return 'other';
}

/** The SIMBAD page of the object SIMBAD itself resolved (its main id), else the designation. */
const simUrl = (data, o) =>
  simbadRecordUrl(
    (data.simbad.get(o.designation)?.mainId ?? o.designation).replace(/\s+/g, ' ').trim(),
  );

const round = (n, d) => Number(n.toFixed(d));
const kly = (ly) => `${(ly / 1000).toFixed(2)} kly`;

/** Kinds whose own SIMBAD V flux is the object's (not a central star's or a knot's). */
const SIMBAD_V_KINDS = new Set(['galaxy', 'open-cluster', 'globular', 'star']);

/**
 * A V magnitude entry, or null. Globular clusters: Harris V_t. Otherwise OpenNGC V-Mag (never
 * B-Mag), then SIMBAD's V flux for galaxies, clusters and stars. SIMBAD's V for a planetary
 * nebula or remnant is its central star or a knot, so it is not used for those.
 */
export function chooseMag(o, data) {
  const kind = catalogueKind(o);
  const h = kind === 'globular' ? data.harris.get(o.ongc) : null;
  if (h && h.vt !== null) {
    return {
      value: h.vt,
      source:
        'Harris, Catalog of Parameters for Milky Way Globular Clusters (1996, 2010 edition), integrated V',
      bibcode: BIB.harris96,
      record_url: HARRIS_FILE,
    };
  }
  if (o.vmag !== null && o.vmag !== undefined) {
    return {
      value: o.vmag,
      source: 'OpenNGC, V-Mag (compiled from LEDA, SIMBAD and HEASARC)',
      bibcode: null,
      record_url: OPENNGC_FILE,
    };
  }
  const sim = data.simbad.get(o.designation);
  const v = sim && SIMBAD_V_KINDS.has(kind) ? pickSimbadV(sim.vRows) : null;
  if (v) {
    return {
      value: v.mag,
      source: 'SIMBAD, V-band flux',
      bibcode: v.bibcode,
      record_url: simUrl(data, o),
    };
  }
  return null;
}

function clusterMatch(o, rows, maxDeg) {
  const byName = huntReffertName(o.ongc ?? '');
  if (byName) {
    const hit = rows.find((r) => r.name === byName);
    if (hit) return { row: hit, how: 'name' };
  }
  if (catalogueKind(o) !== 'open-cluster') return null;
  const near = nearest(
    rows.filter((r) => r.type === 'o' || r.type === ''),
    o.ra,
    o.dec,
    maxDeg,
  );
  return near ? { row: near.row, how: `position, ${(near.sep * 60).toFixed(1)} arcmin off` } : null;
}

/** Hunt & Reffert 2023 (Cantat-Gaudin 2020 in the note, or as the fallback) for cluster-like objects. */
function clusterDistance(o, data, kind) {
  const hr = clusterMatch(o, data.hr, 0.25);
  if (hr && Number.isFinite(hr.row.distPc)) {
    const cg = clusterMatch(o, data.cg, 0.25);
    const note = [`matched ${hr.row.name} by ${hr.how}`];
    if (cg && Number.isFinite(cg.row.distPc)) {
      note.push(`Cantat-Gaudin et al. 2020 (${cg.row.name}): ${Math.round(cg.row.distPc)} pc`);
    }
    return {
      value: round(pcToLy(hr.row.distPc), 0),
      source: 'Hunt & Reffert 2023, Improving the open cluster census II (Gaia DR3)',
      bibcode: BIB.hr23,
      record_url: vizierRowUrl('J/A+A/673/A114/clusters', 'Name', hr.row.name),
      note: note.join('; '),
    };
  }
  const cg = kind === 'open-cluster' ? clusterMatch(o, data.cg, 0.25) : null;
  if (cg && Number.isFinite(cg.row.distPc)) {
    return {
      value: round(pcToLy(cg.row.distPc), 0),
      source: 'Cantat-Gaudin et al. 2020, Painting a portrait of the Galactic disc (Gaia DR2)',
      bibcode: BIB.cg20,
      record_url: vizierRowUrl('J/A+A/640/A1/table1', 'Cluster', cg.row.name),
      note: `matched ${cg.row.name} by ${cg.how}`,
    };
  }
  return null;
}

function localGroupDistance(o, data) {
  const name = o.lg ?? o.lgHost;
  const m = name ? data.lg.get(name) : null;
  if (!m) return null;
  return {
    value: round(m.dKpc * 1000 * LY_PER_PC, 0),
    source:
      'McConnachie 2012, The observed properties of dwarf galaxies in and around the Local Group',
    bibcode: BIB.mcc12,
    record_url: vizierRowUrl('J/AJ/144/4/catalog', 'Name', name),
    note: [
      o.lgHost ? `distance of the host galaxy (${name}), whole kpc` : 'whole kpc',
      m.uncertain ? 'flagged uncertain in the catalogue' : null,
    ]
      .filter(Boolean)
      .join('; '),
  };
}

/** Append a note when SIMBAD's own compiled distances disagree with the primary pick by over 25 per cent. */
function withCrossCheck(entry, o, data) {
  const sim = data.simbad.get(o.designation);
  const med = sim ? medianSimbadDistance(sim.distRows) : null;
  if (!entry || !med || med.n < 2) return entry;
  const diff = Math.abs(entry.value - med.ly) / entry.value;
  if (diff <= 0.25) return entry;
  const extra = `SIMBAD compiled distances disagree: median ${kly(med.ly)} of ${med.n} (${kly(med.rangeLy[0])} to ${kly(med.rangeLy[1])})`;
  return { ...entry, note: entry.note ? `${entry.note}; ${extra}` : extra };
}

/**
 * A distance entry (value in light-years), or null. Order: Local Group member or host →
 * McConnachie; globular → Baumgardt & Vasiliev 2021; cluster → Hunt & Reffert 2023 (Cantat-Gaudin
 * 2020 in the note); galaxy → Cosmicflows-4, else the median of SIMBAD's compiled distances;
 * anything else → SIMBAD's newest parallax distance.
 */
export function chooseDistance(o, data) {
  const kind = catalogueKind(o);

  const lg = localGroupDistance(o, data);
  if (lg) return lg;

  if (kind === 'globular') {
    const b = data.baumgardt.get(o.ongc);
    if (b) {
      const h = data.harris.get(o.ongc);
      const parts = [];
      if (b.errKpc !== null) parts.push(`+/- ${b.errKpc} kpc`);
      if (h?.rsunKpc) parts.push(`Harris 1996 (2010 edition): ${h.rsunKpc} kpc`);
      return withCrossCheck(
        {
          value: round(b.rsunKpc * 1000 * LY_PER_PC, 0),
          source:
            'Baumgardt & Vasiliev 2021, Galactic globular cluster distances (Gaia EDR3, HST, N-body fits)',
          bibcode: BIB.bv21,
          record_url: baumgardtRecordUrl(o.ongc),
          ...(parts.length ? { note: parts.join('; ') } : {}),
        },
        o,
        data,
      );
    }
  }

  const cluster = clusterDistance(o, data, kind);
  if (cluster) return withCrossCheck(cluster, o, data);

  const sim = data.simbad.get(o.designation);

  if (kind === 'galaxy') {
    const cf = data.cf4.get(o.designation);
    if (cf && Number.isFinite(cf.dm)) {
      const lo = dmToLy(cf.dm - (cf.eDm || 0));
      const hi = dmToLy(cf.dm + (cf.eDm || 0));
      return withCrossCheck(
        {
          value: round(dmToLy(cf.dm), 0),
          source: 'Cosmicflows-4, Tully et al. 2023 (distance modulus, all methodologies)',
          bibcode: BIB.cf4,
          record_url: vizierRowUrl('J/ApJ/944/94/table2', 'PGC', cf.pgc),
          note: `PGC ${cf.pgc}, DM ${cf.dm}${cf.eDm ? ` +/- ${cf.eDm}` : ''} (${kly(lo)} to ${kly(hi)})`,
        },
        o,
        data,
      );
    }
    const med = sim ? medianSimbadDistance(sim.distRows) : null;
    if (med && med.n >= 3) {
      return {
        value: round(med.ly, 0),
        source: 'SIMBAD, median of compiled distance measurements (not in Cosmicflows-4)',
        bibcode: null,
        record_url: simUrl(data, o),
        note: `${med.n} measurements, ${kly(med.rangeLy[0])} to ${kly(med.rangeLy[1])}`,
      };
    }
    return null;
  }

  const d = sim ? pickSimbadDistance(sim.distRows) : null;
  if (d) {
    const note = [
      d.method ? `method ${d.method}` : 'method not stated',
      d.others
        ? `${d.others} other SIMBAD distances, ${kly(d.rangeLy[0])} to ${kly(d.rangeLy[1])}`
        : null,
    ].filter(Boolean);
    return {
      value: round(d.ly, 0),
      source: 'SIMBAD, compiled distance measurements (newest parallax-based where one exists)',
      bibcode: d.bibcode,
      record_url: simUrl(data, o),
      note: note.join('; '),
    };
  }
  return null;
}

/**
 * The full `catalogue` + `records` block for one object. Position: the hand-entered objects
 * take SIMBAD's coordinates when within 0.1 degree (the same point), otherwise they keep the
 * hand value and carry no sourced position (extended objects whose centres differ).
 */
export function enrichObject(o, data) {
  const catalogue = {};
  const records = {};
  const sim = data.simbad.get(o.designation);
  if (sim) records.simbad = simUrl(data, o);
  const ned = data.ned.get(o.designation);
  if (ned) records.ned = nedRecordUrl(ned.name);

  let ra = o.ra;
  let dec = o.dec;
  if (o.explicit) {
    if (sim && angSepDeg(o.ra, o.dec, sim.ra, sim.dec) <= 0.1) {
      ra = round(sim.ra, 5);
      dec = round(sim.dec, 5);
      catalogue.position = {
        value: [ra, dec],
        source: 'SIMBAD, ICRS J2000',
        bibcode: null,
        record_url: simUrl(data, o),
      };
    }
  } else {
    catalogue.position = {
      value: [ra, dec],
      source: 'OpenNGC, coordinates from NED',
      bibcode: null,
      record_url: records.simbad ?? OPENNGC_FILE,
    };
  }
  if (o.size !== null && o.size !== undefined && !o.explicit) {
    catalogue.size_arcmin = {
      value: o.size,
      source: 'OpenNGC, major axis (LEDA, SIMBAD, HEASARC)',
      bibcode: null,
      record_url: OPENNGC_FILE,
    };
  }
  const mag = chooseMag(o, data);
  if (mag) catalogue.mag = mag;
  const dist = chooseDistance(o, data);
  if (dist) catalogue.dist_ly = dist;

  return { ra, dec, mag: mag ? mag.value : null, catalogue, records };
}
