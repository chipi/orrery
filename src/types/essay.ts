// The Long View — long-form editorial essays. Data model mirrors /programs:
// a base record (static/data/essays/{slug}.json — structure + metadata) plus a
// translatable overlay (i18n-src/{locale}/essays/{slug}.json — the prose).

export interface EssayReadNext {
  label: string;
  href: string;
  /** 'essay' | 'science' | 'interactive' | 'mission' | … — drives the small tag. */
  kind?: string;
}

export interface EssaySource {
  title: string;
  url: string;
}

export interface EssayBase {
  slug: string;
  /** 'into-the-dark' | 'the-machines' | 'arrival-and-the-long-view' */
  movement: string;
  order: number;
  status: 'published' | 'draft';
  /** optional hero image path, `missions/<id>/NN` or `fleet/<id>/NN` style. */
  hero?: string;
  read_next?: EssayReadNext[];
  sources?: EssaySource[];
}

export type EssayFigureKind = 'photo' | 'diagram';

export interface EssayFigure {
  type: 'figure';
  /** image path under static/, e.g. `essays/navigation/02` or a reused `missions/<id>/01`. */
  image: string;
  /** 'photo' = sourced/reused imagery; 'diagram' = the Wired-style SVG→art panels. */
  kind: EssayFigureKind;
  /** translatable caption (lives in the overlay, like a program figure caption). */
  caption: string;
  /** short credit / provenance line for photos (agency · license). */
  credit?: string;
  /** 'wide' breaks out of the text column; 'inline' sits within it. */
  align?: 'wide' | 'inline';
}

export type EssayBlock =
  { type: 'prose'; md: string } | { type: 'heading'; text: string } | EssayFigure;

export interface EssayOverlay {
  title: string;
  dek: string;
  body: EssayBlock[];
}

export type Essay = EssayBase & EssayOverlay;

export interface EssayIndexEntry {
  slug: string;
  movement: string;
  order: number;
  status: 'published' | 'draft';
  hero?: string;
  /** overlaid from the per-locale essay overlay, like the programs index. */
  title?: string;
  dek?: string;
}
