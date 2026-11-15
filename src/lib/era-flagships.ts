/**
 * The photo of each era tile on /missions and /fleet (UXD-048): the hero of one mission, chosen
 * by hand from the shipped mission heroes, never a new image. The rule: a real photograph of
 * what the era is remembered for, from a mission that sits inside the era's own years
 * (`epochForYear`; `era-flagships.test.ts` holds it). The one exception is Mars Era, whose only
 * mission (a crewed Starship, 2031) has a computer render for a hero: it shows the Perseverance
 * rover on Mars instead, a real photograph of the planet the era is about. Credits are those of
 * the hero image in `static/data/image-provenance.json`, listed on /credits like every hero.
 */
import type { FleetEpoch } from '$types/fleet';

export const ERA_FLAGSHIP: Record<FleetEpoch, string> = {
  'first-steps': 'sputnik1',
  'space-race': 'gemini4',
  'lunar-era': 'apollo17',
  'first-stations': 'skylab-2',
  'shuttle-and-mir': 'sts-1',
  'iss-assembly': 'spirit',
  'commercial-era': 'inspiration4',
  'lunar-return': 'artemis2',
  'mars-era': 'perseverance',
};
