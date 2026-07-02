// Shared flag: a surface route is in an immersive full-screen mode (panorama /
// flat-patch detail). The global layout hides its footer on mobile so the
// mode's own bottom controls (compass, fullscreen, Mission, traverse) don't
// collide with it (2026-07 user direction).
export const immersiveMode = $state({ active: false });
