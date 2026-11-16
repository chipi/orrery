/**
 * The catalogue layer on the page (GitHub #658): a value that comes from an authoritative
 * catalogue carries `{ value, source, bibcode, record_url, note? }`; these helpers name the
 * catalogue for a link, build the ADS page of its paper, and group the entries of one object
 * into the rows of its "Data sources" block.
 */

export interface CatalogueEntry {
  value: number | number[];
  source: string;
  bibcode: string | null;
  record_url: string;
  note?: string;
}

export type CatalogueMap = Partial<Record<string, CatalogueEntry>>;

/** The short catalogue name: the source text up to its first comma that is outside parentheses. */
export function catalogueLabel(source: string): string {
  let depth = 0;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ',' && depth === 0) {
      return normalise(source.slice(0, i));
    }
  }
  return normalise(source);
}

const normalise = (s: string): string => {
  const t = s.trim();
  if (/^Harris$/.test(t)) return 'Harris 1996 (2010 edition)';
  const hyg = /^HYG Database v([\d.]+)/.exec(t);
  if (hyg) return `HYG v${hyg[1]}`;
  return t;
};

/** The ADS abstract page of a bibcode. */
export const adsHref = (bibcode: string): string =>
  `https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(bibcode)}/abstract`;

/** One catalogue in a "Data sources" block: what it supplied, its paper and any note. */
export interface DataSourceItem {
  label: string;
  url: string;
  bibcode: string | null;
  fields: string[];
  notes: string[];
}

/**
 * Group an object's entries by catalogue (same short name and bibcode). `fieldLabel` turns a
 * catalogue key into the label the page shows for that value, or null to leave the value out
 * (positions and sizes are catalogue data but are not shown as values on the page).
 */
export function dataSourceItems(
  catalogue: CatalogueMap | undefined,
  fieldLabel: (key: string) => string | null,
): DataSourceItem[] {
  const items = new Map<string, DataSourceItem>();
  for (const [key, e] of Object.entries(catalogue ?? {})) {
    const field = e ? fieldLabel(key) : null;
    if (!e || field === null) continue;
    const label = catalogueLabel(e.source);
    const id = `${label}|${e.bibcode ?? ''}`;
    const item = items.get(id) ?? {
      label,
      url: e.record_url,
      bibcode: e.bibcode,
      fields: [],
      notes: [],
    };
    item.fields.push(field);
    if (e.note) item.notes.push(`${field}: ${e.note}`);
    items.set(id, item);
  }
  return [...items.values()];
}

/** A catalogue's link with its name, for a value's source line. Null when the value has no entry. */
export function sourceLink(
  entry: CatalogueEntry | undefined,
): { label: string; url: string } | null {
  return entry ? { label: catalogueLabel(entry.source), url: entry.record_url } : null;
}

/** The NASA Exoplanet Archive's name: a proper noun, never translated. */
export const ARCHIVE_LABEL = 'NASA Exoplanet Archive';

/** The object-page links (SIMBAD, NED, NASA Exoplanet Archive) of a `records` map, in a fixed order. */
export function recordLinks(
  records: Partial<Record<'simbad' | 'ned' | 'exoplanet_archive', string>> | undefined,
): Array<{ label: string; url: string }> {
  const names: Array<['simbad' | 'ned' | 'exoplanet_archive', string]> = [
    ['simbad', 'SIMBAD'],
    ['ned', 'NED'],
    ['exoplanet_archive', ARCHIVE_LABEL],
  ];
  return names.flatMap(([k, label]) =>
    records?.[k] ? [{ label, url: records[k] as string }] : [],
  );
}
