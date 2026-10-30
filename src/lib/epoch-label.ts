import * as m from '$lib/paraglide/messages';
import type { FleetEpoch } from '$types/fleet';

const LABELS: Record<FleetEpoch, () => string> = {
  'first-steps': m.epoch_first_steps,
  'space-race': m.epoch_space_race,
  'lunar-era': m.epoch_lunar_era,
  'first-stations': m.epoch_first_stations,
  'shuttle-and-mir': m.epoch_shuttle_and_mir,
  'iss-assembly': m.epoch_iss_assembly,
  'commercial-era': m.epoch_commercial_era,
  'lunar-return': m.epoch_lunar_return,
  'mars-era': m.epoch_mars_era,
};

/** Localized name of a spaceflight epoch (the bands in `$lib/epoch-bands`). */
export function epochLabel(id: FleetEpoch): string {
  return LABELS[id]();
}
