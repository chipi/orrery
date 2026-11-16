/**
 * The photo of each era tile on /missions, /fleet, /programs and /missions/launches (UXD-048): one
 * shipped image per era, chosen by hand, never a new image. The photo is drawn across the whole
 * tile, sized and placed so its subject sits large in the end half; a gradient from the tile's own
 * dark runs from the text side to clear at about two thirds, so the photo fades in under the text
 * instead of starting at a hard edge. Where the image belongs to a mission it sits inside the
 * era's own years (`epochForYear`; `era-flagships.test.ts` holds it); the exceptions are listed
 * there. Credits are those of the image in `static/data/image-provenance.json`, listed on /credits
 * like every image.
 */
import type { FleetEpoch } from '$types/fleet';

export interface EraPhoto {
  /** Folder under `static/images/` (`missions`, `fleet-galleries`, ...). */
  dir: string;
  id: string;
  /** Two-digit slot of the image. */
  slot: string;
  /** Ladder rung file suffix to load (`-640` or `-1280`; the full image is too heavy for a tile). */
  rung: '-640' | '-1280';
  /** Width / height of the source image. */
  aspect: number;
  /** Centre of the subject in the source, as fractions of its width and height. */
  focus: [number, number];
  /** Height the whole image is drawn at, in px, so the subject reads at tile size. */
  height: number;
  /** Mirror the picture in right-to-left (only for one with no text, flag or logo). */
  flipRtl?: boolean;
}

/** Where the subject's centre lands in the tile, as fractions of the tile (end side). */
export const ERA_SUBJECT_AT: [number, number] = [0.72, 0.5];
/** The tile's fixed height in px (the strip's `block-size`). */
export const ERA_TILE_HEIGHT = 96;

export const ERA_PHOTO: Record<FleetEpoch, EraPhoto> = {
  'first-steps': {
    dir: 'missions',
    id: 'sputnik1',
    slot: '01',
    rung: '-640',
    aspect: 640 / 524,
    focus: [0.74, 0.34],
    height: 170,
    flipRtl: true,
  },
  'space-race': {
    dir: 'missions',
    id: 'gemini4',
    slot: '01',
    rung: '-640',
    aspect: 640 / 429,
    focus: [0.55, 0.48],
    height: 136,
  },
  'lunar-era': {
    dir: 'missions',
    id: 'apollo17',
    slot: '01',
    rung: '-640',
    aspect: 1,
    focus: [0.47, 0.3],
    height: 175,
  },
  'first-stations': {
    dir: 'missions',
    id: 'skylab-4',
    slot: '04',
    rung: '-640',
    aspect: 640 / 632,
    focus: [0.26, 0.32],
    height: 190,
  },
  'shuttle-and-mir': {
    dir: 'missions',
    id: 'sts-1',
    slot: '01',
    rung: '-640',
    aspect: 640 / 809,
    focus: [0.5, 0.52],
    height: 140,
  },
  'iss-assembly': {
    dir: 'fleet-galleries',
    id: 'iss',
    slot: '03',
    rung: '-1280',
    aspect: 3072 / 1959,
    focus: [0.5, 0.47],
    height: 104,
  },
  'commercial-era': {
    dir: 'missions',
    id: 'chandrayaan3',
    slot: '03',
    rung: '-640',
    aspect: 640 / 361,
    focus: [0.5, 0.64],
    height: 150,
  },
  'lunar-return': {
    dir: 'missions',
    id: 'artemis1',
    slot: '02',
    rung: '-1280',
    aspect: 3072 / 2048,
    focus: [0.5, 0.55],
    height: 165,
  },
  'mars-era': {
    dir: 'fleet-galleries',
    id: 'starship',
    slot: '01',
    rung: '-640',
    aspect: 640 / 685,
    focus: [0.56, 0.5],
    height: 112,
  },
};

/** Root-relative URL of an era's tile image (a ladder rung, not the full file). */
export const eraPhotoPath = (p: EraPhoto) => `/images/${p.dir}/${p.id}/${p.slot}${p.rung}.webp`;

/** Placement of the image inside the tile: the subject's centre lands on ERA_SUBJECT_AT on the
 *  end side (`leftLtr`), or on the mirrored point in right-to-left (`leftRtl`; for a `flipRtl`
 *  picture the subject's own x is mirrored too). Lengths are CSS values for physical `left`. */
export function eraPhotoPlacement(p: EraPhoto): {
  width: string;
  height: string;
  top: string;
  leftLtr: string;
  leftRtl: string;
} {
  const w = p.height * p.aspect;
  const [tx, ty] = ERA_SUBJECT_AT;
  const fxRtl = p.flipRtl ? 1 - p.focus[0] : p.focus[0];
  return {
    width: `${w.toFixed(1)}px`,
    height: `${p.height}px`,
    top: `${(ty * ERA_TILE_HEIGHT - p.focus[1] * p.height).toFixed(1)}px`,
    leftLtr: `calc(${(tx * 100).toFixed(1)}% - ${(p.focus[0] * w).toFixed(1)}px)`,
    leftRtl: `calc(${((1 - tx) * 100).toFixed(1)}% - ${(fxRtl * w).toFixed(1)}px)`,
  };
}
