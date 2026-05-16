/** /science encyclopedia types — base record + locale overlay (ADR-017, PRD-008). */

export type ScienceTabId =
  | 'orbits'
  | 'transfers'
  | 'propulsion'
  | 'mission-phases'
  | 'scales-time'
  | 'porkchop'
  | 'space-stations'
  | 'history'
  | 'observation'
  | 'life-in-space'
  // v0.6.3 — curated companion lists (issue #128 + #129). Standalone
  // pages (no sections); the rail's tab card links straight to
  // /science/reading-list and /science/watch-list. Layout's
  // right-rail gracefully hides when tabSections is empty.
  | 'reading-list'
  | 'watch-list';

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
    | '/fleet'
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

/** A single chapter inside the /science landing narrative — heading, optional
 * diagram, and 1-6 paragraphs. Inline link syntax: `[text](tab/section)` for
 * /science deep-links, `[text](app:/route)` for app routes. */
export interface ScienceLandingChapter {
  heading: string;
  diagram?: string;
  diagram_alt?: string;
  diagram_caption?: string;
  paragraphs: string[];
}

/** A single bullet in the closing tools section of the /science landing —
 * one-or-more app paths plus the editorial blurb. */
export interface ScienceLandingTool {
  paths: string[];
  text: string;
}

/** Editorial Space-101 narrative shown on /science. Per-locale; loaded from
 * `i18n/[locale]/science/_landing.json` per ADR-017. */
export interface ScienceLanding {
  intro_heading: string;
  intro_paragraphs: string[];
  chapters: ScienceLandingChapter[];
  tools_heading: string;
  tools_intro: string;
  tools: ScienceLandingTool[];
  closing: string;
}
