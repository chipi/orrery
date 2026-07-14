// Portrait parameters for a curated named star (/explore v2 Slice 1). Derives how
// a star should be drawn — core/corona spread + diffraction-spike strength — from
// its spectral luminosity class and absolute magnitude, so a supergiant reads as a
// vast diffuse glow and a dwarf as a tight point. Colour comes separately from B−V
// (bv-to-rgb). Pure so it's unit-tested; StarPortrait.svelte does the canvas draw.
//
// This is a *representation* from catalogued values, not a photograph — the panel
// labels it as such. A star is an unresolved point; this conveys colour + class.

export interface PortraitParams {
  /** Bright core radius, 0..1 of the canvas half-size. */
  coreScale: number;
  /** Soft corona/glow radius, 0..1. */
  coronaScale: number;
  /** Diffraction-spike strength, 0..1 (brighter/hotter stars spike more). */
  spikeStrength: number;
}

/** Luminosity class parsed from a spectral type string, or null. */
export function luminosityClass(spect: string | null | undefined): string | null {
  if (!spect) return null;
  // The luminosity class is a roman-numeral suffix after the temperature subclass
  // (e.g. K5III, M2Ib, A7IV, G2V). Match the first roman token, longest-first so
  // 'III' beats 'II' beats 'I'. No \b — spectral types have no internal word
  // boundaries. White dwarfs / subdwarfs (DA, sdM4) have no class → null.
  const m = /(Ia0|Iab|Ia|Ib|III|II|IV|VI|V|I)/.exec(spect);
  return m ? m[1] : null;
}

/**
 * Portrait geometry from spectral class (+ a nudge from absolute magnitude for
 * intrinsic luminosity). Supergiants → large diffuse; dwarfs → tight core.
 */
export function portraitParams(spect: string | null | undefined, absmag: number): PortraitParams {
  const cls = luminosityClass(spect);
  let coreScale: number;
  let coronaScale: number;
  switch (cls) {
    case 'Ia0':
    case 'Ia':
    case 'Iab':
    case 'Ib':
    case 'I': // supergiant
      coreScale = 0.3;
      coronaScale = 0.95;
      break;
    case 'II':
    case 'III': // giant
      coreScale = 0.24;
      coronaScale = 0.78;
      break;
    case 'IV': // subgiant
      coreScale = 0.2;
      coronaScale = 0.64;
      break;
    default: // dwarf / unknown
      coreScale = 0.16;
      coronaScale = 0.55;
  }
  // Intrinsically luminous stars (very negative absmag) spike more; faint red
  // dwarfs barely at all.
  const spikeStrength = Math.min(1, Math.max(0.1, (6 - absmag) / 12));
  return { coreScale, coronaScale, spikeStrength };
}
