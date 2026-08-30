/**
 * Per-body display palette, anchored to the surface-route chip tint
 * (Mars red / Earth blue / Moon silver — see each route's `bodyTintCss`).
 * Shared by the atmosphere-voice waveform + the instrument tiles (#385)
 * so every HUD visual reads as belonging to *this* body.
 */
export interface BodyPalette {
  core: string;
  bright: string;
  mid: string;
  deep: string;
  /** "r,g,b" triple for rgba() glows. */
  glowRGB: string;
}

export const BODY_PALETTE: Record<string, BodyPalette> = {
  mars: {
    core: '#fff1e6',
    bright: '#ff9a4d',
    mid: '#ff6a2e',
    deep: '#c8371a',
    glowRGB: '255,122,60',
  },
  earth: {
    core: '#ecffff',
    bright: '#7fe0ff',
    mid: '#3aa0ff',
    deep: '#2b6cff',
    glowRGB: '90,190,255',
  },
  moon: {
    core: '#ffffff',
    bright: '#e6ebf5',
    mid: '#c1c6d4',
    deep: '#9298aa',
    glowRGB: '205,213,233',
  },
};
