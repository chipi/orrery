import type { SurfaceSite } from '$types/surface-site';
import * as m from '$lib/paraglide/messages';

/** Moon landers whose regional layer is a Kaguya TC crop (fetch-moon-kaguya-regional.ts). */
export const KAGUYA_REGIONAL_MOON_SITES = new Set([
  'luna9',
  'luna16',
  'luna17',
  'luna21',
  'luna24',
  'change3',
  'change4',
  'change5',
  'change6',
  'chandrayaan3',
  'slim',
  'beresheet',
]);
/** Moon landers whose DETAIL layer is the Kaguya regional crop (no LROC Featured Image). */
export const KAGUYA_DETAIL_MOON_SITES = new Set(['luna9']);
export const GSI_DETAIL_EARTH_PADS = new Set(['tanegashima-yoshinobu', 'uchinoura']);
/** LINZ 0.1 m aerial survey, read to 0.25 m/px (fetch-earth-pads.ts LINZ_SURVEY). */
export const LINZ_DETAIL_EARTH_PADS = new Set(['rocket-lab-lc-1']);

export type DetailKind = 'eox' | 'linz' | 'gsi' | 'naip' | 'hirise' | 'kaguya' | 'lroc';

type SpecSite = Pick<
  SurfaceSite,
  'id' | 'hotspot_tier2_ground_m' | 'hotspot_tier2_regional_ground_m'
>;

export interface DetailLayerSpec {
  kind: DetailKind;
  /** Short source name for the 9 px flat-view badge. */
  shortSource: string;
  /** Resolution value (m/px) as shown on the badge. */
  resValue: string;
}

export interface RegionalCropSpec {
  /** Crop width in px. */
  cropPx: number;
  groundKm: number;
  mPerPx: number;
}

const KAGUYA_CROP_PX = 2560;
const EARTH_MPX = 10;
const MARS_CTX_MPX = 5;
const LROC_ROI_MPX = 5;

/** Regional crop of an Earth / Moon site, from its recorded ground extent. Mars keeps its own (traverse-aware) branch. */
export function regionalCropSpec(site: SpecSite, planet: string): RegionalCropSpec {
  if (planet === 'earth') {
    const groundM = site.hotspot_tier2_regional_ground_m ?? 16000;
    return { cropPx: Math.round(groundM / EARTH_MPX), groundKm: groundM / 1000, mPerPx: EARTH_MPX };
  }
  if (planet === 'moon' && KAGUYA_REGIONAL_MOON_SITES.has(site.id)) {
    const groundM = site.hotspot_tier2_regional_ground_m ?? 15360;
    return { cropPx: KAGUYA_CROP_PX, groundKm: groundM / 1000, mPerPx: groundM / KAGUYA_CROP_PX };
  }
  if (planet === 'mars') {
    const groundM = site.hotspot_tier2_regional_ground_m ?? 15360;
    return {
      cropPx: Math.round(groundM / MARS_CTX_MPX),
      groundKm: groundM / 1000,
      mPerPx: MARS_CTX_MPX,
    };
  }
  const groundM = site.hotspot_tier2_regional_ground_m ?? 15360;
  return {
    cropPx: Math.round(groundM / LROC_ROI_MPX),
    groundKm: groundM / 1000,
    mPerPx: LROC_ROI_MPX,
  };
}

/** Which imagery the DETAIL layer of a site is, mirroring fetch-earth-pads.ts PAD_STRATEGY and the Moon failovers. */
export function detailLayerSpec(site: SpecSite, planet: string): DetailLayerSpec {
  if (planet === 'earth') {
    if ((site.hotspot_tier2_ground_m ?? 512) >= 2560)
      return { kind: 'eox', shortSource: 'Sentinel-2', resValue: '10' };
    if (LINZ_DETAIL_EARTH_PADS.has(site.id))
      return { kind: 'linz', shortSource: 'LINZ', resValue: '0.25' };
    if (GSI_DETAIL_EARTH_PADS.has(site.id))
      return { kind: 'gsi', shortSource: 'GSI', resValue: '0.5' };
    return { kind: 'naip', shortSource: 'NAIP', resValue: '0.5' };
  }
  if (planet === 'mars') return { kind: 'hirise', shortSource: 'HiRISE', resValue: '0.25' };
  if (KAGUYA_DETAIL_MOON_SITES.has(site.id))
    return {
      kind: 'kaguya',
      shortSource: 'Kaguya TC',
      resValue: String(Math.round(regionalCropSpec(site, 'moon').mPerPx)),
    };
  return { kind: 'lroc', shortSource: 'LROC NAC', resValue: '0.5–2' };
}

/** "~0.5 m/px · NAIP" — the flat view's DETAIL badge text, from the same spec as the layer card. */
export function detailBadgeLabel(site: SpecSite, planet: string): string {
  const s = detailLayerSpec(site, planet);
  return `~${m.unit_mpx_value({ value: s.resValue })} · ${s.shortSource}`;
}
