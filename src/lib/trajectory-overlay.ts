// Locale overlay merge for iconic trajectories, kept apart from the Three.js renderer so the
// data loader (and its tests) never load WebGL code.
import type { IconicTrajectoryData } from './three/iconic-trajectory';

/** Locale overlay for a trajectory (i18n-src/<locale>/trajectories/<id>.json):
 *  display text only, waypoints by index. */
export interface IconicTrajectoryOverlay {
  name?: string;
  current_distance_label?: string;
  interstellar_since_label?: string;
  waypoints?: Array<{ label?: string } | null>;
}

/** Apply a locale overlay: the name and distance labels are replaced (display only),
 *  waypoint labels go to `display_label` so code matching on `label` keeps working. */
export function localizeTrajectory<T extends IconicTrajectoryData>(
  data: T,
  overlay: IconicTrajectoryOverlay | null | undefined,
): T {
  if (!overlay) return data;
  return {
    ...data,
    name: overlay.name || data.name,
    current_distance_label: overlay.current_distance_label || data.current_distance_label,
    ...(data.interstellar_since_label
      ? {
          interstellar_since_label:
            overlay.interstellar_since_label || data.interstellar_since_label,
        }
      : {}),
    waypoints: data.waypoints.map((wp, i) => {
      const t = overlay.waypoints?.[i]?.label;
      return t && wp.label ? { ...wp, display_label: t } : wp;
    }),
  };
}
