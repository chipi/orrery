/**
 * The photo of each era tile on /missions and /fleet (UXD-048): one shipped image per era, chosen
 * by hand, never a new image. The tile shows it on the end side (70 % of its width, fading in from
 * the text), so the rule is: a real photograph whose subject reads at about 100 px, on a dark or
 * plain ground, using the image's square crop (`<slot>.1x1.jpg`, which has to exist). Where the
 * image belongs to a mission it sits inside the era's own years (`epochForYear`;
 * `era-flagships.test.ts` holds it); the exceptions are listed there. Credits are those of the
 * image in `static/data/image-provenance.json`, listed on /credits like every image.
 */
import type { FleetEpoch } from '$types/fleet';

export interface EraPhoto {
  /** Folder under `static/images/` (`missions`, `fleet-galleries`, ...). */
  dir: string;
  id: string;
  /** Two-digit slot of the image. */
  slot: string;
  /** CSS object-position of the square crop inside the tile's slot. */
  position?: string;
  /** Mirror the picture in right-to-left (only for one with no text, flag or logo). */
  flipRtl?: boolean;
}

export const ERA_PHOTO: Record<FleetEpoch, EraPhoto> = {
  'first-steps': {
    dir: 'missions',
    id: 'sputnik1',
    slot: '01',
    position: '50% 50%',
    flipRtl: true,
  },
  'space-race': { dir: 'missions', id: 'gemini4', slot: '01', position: '55% 40%' },
  'lunar-era': { dir: 'missions', id: 'apollo17', slot: '01', position: '38% 55%' },
  'first-stations': { dir: 'missions', id: 'skylab-4', slot: '04', position: '50% 30%' },
  'shuttle-and-mir': { dir: 'missions', id: 'sts-1', slot: '01', position: '45% 50%' },
  'iss-assembly': { dir: 'fleet-galleries', id: 'iss', slot: '03', position: '50% 50%' },
  'commercial-era': { dir: 'missions', id: 'chandrayaan3', slot: '03', position: '55% 60%' },
  'lunar-return': { dir: 'missions', id: 'artemis1', slot: '02', position: '50% 50%' },
  'mars-era': { dir: 'fleet-galleries', id: 'starship', slot: '01', position: '50% 45%' },
};

/** Root-relative URL of an era's tile image (the square crop). */
export const eraPhotoPath = (p: EraPhoto) => `/images/${p.dir}/${p.id}/${p.slot}.1x1.jpg`;
