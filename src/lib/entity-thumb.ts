/**
 * Round list thumbnails (L45, UXD-025): which file is the small photo of a row's own thing, and
 * what colour its ring is.
 *
 * The file is the 192 px WebP of the entity's blessed hero slot, listed in
 * static/data/entity-thumbs.json (scripts/build-entity-thumbs.ts reads the hero overrides, so the
 * slot the operator's review picked is the slot shown, as entityHero() does for the big hero).
 * Returned paths are root-relative; EntityThumb passes them through assetUrl().
 */
import manifestJson from '$data/entity-thumbs.json';

export interface EntityThumbManifest {
  surfaces: Record<
    string,
    { dir: string; flat?: boolean; slots: Record<string, string>; none: string[] }
  >;
  /** Worlds' INDEX sites: id -> `<dir>/<folder>/<slot>` of the folder the site's panel shows. */
  sites: Record<string, { slots: Record<string, string>; none: string[] }>;
}

/** The thumb of `id` on `surface` (`missions`, `fleet`, `planets`, ...), or null when it has none. */
export function resolveThumb(
  manifest: EntityThumbManifest,
  surface: string,
  id: string,
): string | null {
  const s = manifest.surfaces[surface];
  const slot = s?.slots[id];
  if (!s || !slot) return null;
  return `/credit-thumbs/images/${s.dir}/${s.flat ? '' : `${id}/`}${slot}.1x1.webp`;
}

export const thumbOf = (surface: string, id: string): string | null =>
  resolveThumb(manifestJson as EntityThumbManifest, surface, id);

/**
 * The thumb of a site of a Worlds' INDEX (`moon`, `mars`, `venus`, `earth-objects`): the blessed
 * slot of the folder the site's panel gallery resolves to (own folder, else its mission, else the
 * fleet entry; scripts/build-entity-thumbs.ts runs the same ladder). Earth launch pads are the
 * fleet's own `launch-site` entries: `thumbOf('fleet', id)`.
 */
export function resolveSiteThumb(
  manifest: EntityThumbManifest,
  body: string,
  id: string,
): string | null {
  const frag = manifest.sites[body]?.slots[id];
  return frag ? `/credit-thumbs/images/${frag}.1x1.webp` : null;
}

export const thumbOfSite = (body: string, id: string): string | null =>
  resolveSiteThumb(manifestJson as EntityThumbManifest, body, id);

const SOLAR_SURFACE: Record<string, string> = {
  planet: 'planets',
  moon: 'satellites',
  belt: 'belts',
  dwarf: 'small-bodies',
  asteroid: 'small-bodies',
  comet: 'small-bodies',
  kbo: 'small-bodies',
  interstellar: 'small-bodies',
};

/** The thumb of a solar-system INDEX row (`ScaleIndexRow.kind` + id), or null when it has none. */
export function solarRowThumb(
  row: { id: string; kind: string },
  manifest: EntityThumbManifest = manifestJson as EntityThumbManifest,
): string | null {
  if (row.kind === 'sun') return resolveThumb(manifest, 'sun', 'sun');
  const surface = SOLAR_SURFACE[row.kind];
  return surface ? resolveThumb(manifest, surface, row.id) : null;
}

/**
 * The thumb of a belt's MEMBERS row. A member string starts with the body's name ("Ceres — dwarf
 * planet, ..."); that word is a small-body id (Pluto and Eris are listed there too).
 */
export function beltMemberThumb(member: string): string | null {
  const id = member
    .split(/[\s—–-]/)[0]
    ?.toLowerCase()
    .trim();
  return id ? thumbOf('small-bodies', id) : null;
}

/** `thumbOf` for a `<surface>/<id>` reference, as the regime panel's per-bundle map stores it. */
export function thumbOfRef(ref: string | undefined | null): string | null {
  const i = ref ? ref.indexOf('/') : -1;
  return ref && i > 0 ? thumbOf(ref.slice(0, i), ref.slice(i + 1)) : null;
}

export { THUMB_NEUTRAL_RING, isTealOrCyan, ringColor } from './entity-thumb-ring';
