// Program — editorial grouping layer over missions + fleet (PRD-029).
// Base record (static/data/programs/{id}.json) + per-locale editorial overlay
// (i18n-src/{locale}/programs/{id}.json), merged by getProgram().

export type ProgramKind =
  | 'crewed-campaign'
  | 'robotic-campaign'
  | 'station'
  | 'infrastructure'
  | 'funding-line';

export type ProgramStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

/** A roster item is either linked (to an existing orrery entry) or context-only. */
export interface ProgramRosterItem {
  linked_id?: string;
  ref?: 'mission' | 'fleet';
  role?: string;
  name?: string;
  year?: number;
  note?: string;
}

export interface ProgramLink {
  l: string;
  u: string;
  t: 'intro' | 'core' | 'deep';
}

export interface ProgramSeeAlso {
  label: string;
  href: string;
  kind: 'body' | 'science' | 'explore';
}

export interface ProgramBase {
  id: string;
  kind: ProgramKind;
  agency: string;
  agencies?: string[];
  country: string;
  start_year?: number;
  end_year?: number | null;
  status: ProgramStatus;
  epoch: string;
  hero?: string;
  roster: ProgramRosterItem[];
  related_programs?: string[];
  badge?: string;
  see_also?: ProgramSeeAlso[];
  links: ProgramLink[];
}

export type ProgramProseBlock = { type: 'prose'; md: string };
export type ProgramFigureBlock = {
  type: 'figure';
  image: { reuse?: string; id?: string };
  caption: string;
  credit?: string;
  align?: 'full' | 'left' | 'right';
};
export type ProgramBlock = ProgramProseBlock | ProgramFigureBlock;

/** Editorial overlay — the spine, each section an ordered block list. */
export interface ProgramOverlay {
  name: string;
  tagline: string;
  the_land: ProgramBlock[];
  goals: ProgramBlock[];
  outcome: ProgramBlock[];
  narrative: ProgramBlock[];
  legacy: ProgramBlock[];
  lessons: ProgramBlock[];
}

export type Program = ProgramBase & ProgramOverlay;

/** Lightweight index row for the /programs browse cards. */
export interface ProgramIndexEntry {
  id: string;
  name: string;
  tagline: string;
  kind: ProgramKind;
  agency: string;
  agencies?: string[];
  country: string;
  epoch: string;
  status: ProgramStatus;
  start_year?: number;
  end_year?: number | null;
  hero?: string;
}
