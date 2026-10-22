/**
 * Observatories on Earth (PRD-028): radio and optical observatories, the
 * Deep Space Network and SETI sites, shown as pins on /earth and linked
 * from the /science articles they illustrate. Base record at
 * static/data/observatories.json; per-locale text in
 * i18n-src/{locale}/observatories/{id}.json, merged at fetch time.
 */

export type ObservatoryKind = 'radio' | 'optical' | 'deep-space' | 'seti';
export type ObservatoryStatus = 'active' | 'historic' | 'building';

export interface ObservatoryBase {
  id: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  lat: number;
  lon: number;
  /** Official website. */
  website: string;
  kind: ObservatoryKind;
  status: ObservatoryStatus;
  /** Year it began work (first light, inauguration or start of science
   *  operations, whichever the sources give), YYYY. */
  since?: string;
  /** /science/<tab>/<slug> paths this observatory illustrates. */
  science: string[];
  /** Serious films about real science only (PRD-028 §1.5). */
  films?: Array<'contact' | 'the-dish'>;
  /** Main source for the facts on the card. */
  evidence: string;
}

export interface ObservatoryOverlay {
  name: string;
  /** Site and region, e.g. "Socorro, New Mexico". */
  place: string;
  description: string;
  highlights: string[];
  /** One line about the film, present exactly when `films` is set. */
  film?: string;
}

export type Observatory = ObservatoryBase & ObservatoryOverlay;
