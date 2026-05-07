/** /science encyclopedia types — base record + locale overlay (ADR-017, PRD-008). */

export type ScienceTabId =
  | 'orbits'
  | 'transfers'
  | 'propulsion'
  | 'mission-phases'
  | 'scales-time'
  | 'porkchop';

export interface ScienceLink {
  l: string;
  u: string;
  t: 'intro' | 'core' | 'deep';
}

export interface SeeInApp {
  route:
    | '/explore'
    | '/plan'
    | '/fly'
    | '/missions'
    | '/earth'
    | '/moon'
    | '/mars'
    | '/iss'
    | '/tiangong';
  context_key: string;
}

export interface ScienceSectionPhoto {
  src: string;
  credit: string;
  alt_key?: string;
}

export interface ScienceSectionBase {
  id: string;
  tab: ScienceTabId;
  order: number;
  formula_latex?: string;
  diagram?: string;
  diagram_quality?: 'schematic' | 'polished';
  photo?: ScienceSectionPhoto;
  see_in_app?: SeeInApp[];
  links: ScienceLink[];
}

export interface ScienceSectionOverlay {
  title: string;
  intro_sentence: string;
  body_paragraphs: string[];
  formula_caption?: string;
  diagram_caption?: string;
}

export type ScienceSection = ScienceSectionBase & ScienceSectionOverlay;
