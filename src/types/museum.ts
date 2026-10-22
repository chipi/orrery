/**
 * Museums where real Orrery hardware is on public display (PRD-027).
 * Base record at static/data/museums.json; per-locale text in
 * i18n-src/{locale}/museums/{id}.json, merged at fetch time.
 */

/** A real object on display (PRD-027 §2): flown, a flight backup, a
 *  test article, a flown part, or an unflown sister unit; never a replica. */
export interface MuseumHolding {
  /** Fleet entry id, or a `/science/history/<slug>` page path. */
  ref: string;
  kind: 'flown' | 'backup' | 'test-article' | 'flown-part' | 'sister-unit';
  /** A page showing the object is on display there. */
  evidence: string;
  /** Date the evidence was read (YYYY-MM-DD). */
  checked: string;
  /** On display from this date (YYYY-MM-DD) when not yet open. */
  from?: string;
}

export interface MuseumBase {
  id: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  lat: number;
  lon: number;
  /** Official website. */
  website: string;
  holds: MuseumHolding[];
}

export interface MuseumOverlay {
  name: string;
  city: string;
  description: string;
  /** What exactly is shown, keyed by holding ref. */
  items: Record<string, string>;
}

export type Museum = MuseumBase & MuseumOverlay;

/** One museum as seen from an object page. */
export interface MuseumForObject {
  museum: Museum;
  holding: MuseumHolding;
  /** The item line for this object at this museum. */
  item: string;
}
