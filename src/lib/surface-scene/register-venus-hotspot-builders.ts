/**
 * Tier-1 hotspot-model registration for /venus (RFC-034 §12).
 *
 * Venus has no Tier-1 hi-LOD hotspot models yet — the three Venera/Vega sites
 * render from the Tier-0 `buildVenusLanderModel` glyph. This registrar is a
 * no-op that keeps the SurfaceScene config contract uniform across bodies; when
 * a hi-LOD Venera model is authored it plugs in here (same as the moon/mars
 * registrars).
 */
export function registerVenusHotspotBuilders(): void {
  // intentionally empty — no Tier-1 Venus models registered
}
