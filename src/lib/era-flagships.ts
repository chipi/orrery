/**
 * The photo of each era tile on /missions and /fleet (UXD-048): the hero of one mission, chosen
 * by hand from the shipped mission heroes, never a new image. The tile shows it small (about
 * 60 px wide, on the right, full brightness), so the rule is: a real photograph whose subject
 * reads at that size (a craft, a person, a rocket, on a dark or plain ground), from a mission that
 * sits inside the era's own years (`epochForYear`; `era-flagships.test.ts` holds it). The tile
 * uses the hero's square crop (`<slot>.1x1.jpg`) with the object position below to centre the
 * subject. The one exception is Mars Era, whose only mission (a crewed Starship, 2031) has a
 * computer render for a hero: it shows the Spirit rover (a real photograph of a Mars rover). Credits are
 * those of the hero image in `static/data/image-provenance.json`, listed on /credits like every
 * hero.
 */
import type { FleetEpoch } from '$types/fleet';

export const ERA_FLAGSHIP: Record<FleetEpoch, string> = {
  'first-steps': 'sputnik1',
  'space-race': 'gemini4',
  'lunar-era': 'apollo17',
  'first-stations': 'skylab-4',
  'shuttle-and-mir': 'sts-1',
  'iss-assembly': 'curiosity',
  'commercial-era': 'chandrayaan3',
  'lunar-return': 'artemis2',
  'mars-era': 'spirit',
};

/** CSS object-position of each pick inside the tile's narrow slot (the subject's centre). */
export const ERA_PHOTO_POSITION: Record<FleetEpoch, string> = {
  'first-steps': '68% 35%',
  'space-race': '55% 40%',
  'lunar-era': '38% 55%',
  'first-stations': '50% 30%',
  'shuttle-and-mir': '45% 50%',
  'iss-assembly': '50% 45%',
  'commercial-era': '55% 60%',
  'lunar-return': '50% 55%',
  'mars-era': '50% 55%',
};
