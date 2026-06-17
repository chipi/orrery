/**
 * Shared state for the global graphics-settings button + panel
 * (2026-06-17 consolidation).
 *
 * Pre-#XYZ each 3D-heavy route (/fly, /explore, /iss, /tiangong)
 * mounted its own fixed-position ⚙ button via `<QualitySettingsModal>`.
 * That meant the button materialised mid-canvas on supported routes
 * and was absent everywhere else — inconsistent affordance.
 *
 * Now: the ⚙ button lives in `<Nav>` permanently. Each route that
 * surfaces graphics-quality settings calls `setSettingsAvailable(tier)`
 * on mount + `clearSettingsAvailable()` on unmount via the existing
 * `<QualitySettingsModal>` plumbing. The Nav button reads
 * `settingsAvailable` to decide its enabled / disabled chrome; the
 * popup panel reads `settingsOpen` to decide whether to render.
 *
 * Routes that don't surface settings just never call the registration
 * fn — the Nav button stays disabled + dim, with an explanatory title.
 */
import type { QualityTier } from '$lib/quality/quality-tier';

interface SettingsState {
  /** True while a route surfaces graphics-quality settings. */
  available: boolean;
  /**
   * The quality tier the renderer actually resolved at mount. Shown in
   * the "Active:" hint inside the popup. Null when no settings-capable
   * route is mounted.
   */
  activeTier: QualityTier | null;
  /** Popup open state. Toggled by the Nav button + the popup's close
   *  button; also forced to false when `available` flips to false (a
   *  navigation away from a settings-capable route closes the popup
   *  automatically). */
  open: boolean;
}

export const settingsState = $state<SettingsState>({
  available: false,
  activeTier: null,
  open: false,
});

export function setSettingsAvailable(tier: QualityTier): void {
  settingsState.available = true;
  settingsState.activeTier = tier;
}

export function clearSettingsAvailable(): void {
  settingsState.available = false;
  settingsState.activeTier = null;
  // Close the popup if it was open — the popup belongs to the route
  // that's just unmounting.
  settingsState.open = false;
}

export function toggleSettingsOpen(): void {
  if (!settingsState.available) return;
  settingsState.open = !settingsState.open;
}

export function closeSettings(): void {
  settingsState.open = false;
}
