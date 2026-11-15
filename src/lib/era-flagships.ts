/**
 * The photo of each era tile on /missions and /fleet (UXD-048): the hero of one mission, chosen
 * by hand from the shipped mission heroes, never a new image. The rule: the mission whose
 * existing hero shows what the era is remembered for, preferring one that sits inside the era's
 * own years (`epochForYear`); where no mission of the index shows it, the nearest picture of
 * the subject (the Shuttle's first flight, STS-1, for Shuttle & Mir). Credits are the ones of
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
  'mars-era': 'starship-mars-crew',
};
