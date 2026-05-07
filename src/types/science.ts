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
  /** Optional 1-4 paragraph conversational lead-in that expands the matching
   * landing-page chapter. Renders above the formula/body in the section view. */
  narrative_101?: string[];
  formula_caption?: string;
  diagram_caption?: string;
}

export type ScienceSection = ScienceSectionBase & ScienceSectionOverlay;

/** Editorial 101 lead-in shown at the top of /science/[tab]. Loaded from
 * `i18n/[locale]/science/[tab]/_intro.json` per ADR-017. */
export interface ScienceTabIntro {
  headline: string;
  paragraphs: string[];
}
