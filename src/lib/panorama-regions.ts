import type { PanoramaMetadata } from '$types/surface-site';

export type SyntheticRegion = NonNullable<PanoramaMetadata['synthetic_regions']>[number];

/** A region without an azimuth range covers every yaw; one with min > max wraps through 0. */
export function inAzimuth(r: SyntheticRegion, yawDeg: number): boolean {
  if (r.azimuth_min_deg === undefined || r.azimuth_max_deg === undefined) return true;
  const y = ((yawDeg % 360) + 360) % 360;
  return r.azimuth_min_deg <= r.azimuth_max_deg
    ? y >= r.azimuth_min_deg && y <= r.azimuth_max_deg
    : y >= r.azimuth_min_deg || y <= r.azimuth_max_deg;
}

/** The first declared region containing the camera's pitch and yaw, or null. */
export function syntheticRegionAt(
  regions: readonly SyntheticRegion[] | null | undefined,
  pitchDeg: number,
  yawDeg: number,
): SyntheticRegion | null {
  return (
    regions?.find(
      (r) => pitchDeg >= r.pitch_min_deg && pitchDeg <= r.pitch_max_deg && inAzimuth(r, yawDeg),
    ) ?? null
  );
}
