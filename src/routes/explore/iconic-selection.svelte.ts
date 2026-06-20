/**
 * Reactive state + side-effect actions for the iconic-mission legend
 * selection on /explore (single source of truth).
 *
 * Idiomatic Svelte 5: one `$state` object exposed via a service
 * factory, mutated via named actions. Replaces an earlier shape
 * where four separate `$state` cells (`pathsLegendSelectedId`,
 * `pathsLegendMission`, `highlightedMissionId`, plus
 * `panelState.pathsLegend`) lived directly in `+page.svelte` and
 * had to be written + reset in lockstep at every consumer.
 *
 * The factory closes over the in-flight sequence counter + debounce
 * timer so each /explore mount gets its own — avoids cross-mount
 * leakage when the route ever gets re-mounted (HMR, test harness)
 * or hypothetically multiple instances.
 *
 * Consumers in `+page.svelte`:
 *   • Row markup — reads `.selectedId`, `.hoveredId` for
 *     `.is-selected` / `aria-pressed` + tagline.
 *   • Arc-highlight `$effect` — reads `.hoveredId ?? .selectedId`
 *     and pushes into 18 Three.js material handles.
 *   • Render-loop throttle — reads `.panelOpen` to gate
 *     `composer.render()`.
 *   • Row `onclick` / canvas trajectory pick — calls
 *     `selectMission()` / `openMission()`.
 *   • MissionPanel `<MissionPanel mission={iconic.state.mission}>` —
 *     prop-driven (stays prop, not context, so MissionPanel remains
 *     reusable outside /explore).
 */

import { getMission, getMissionIndex } from '$lib/data';
import type { Mission } from '$types/mission';

export type IconicSelectionState = {
  /** Click-sticky mission id. Cleared on panel close via reset(). */
  selectedId: string | null;
  /** Resolved mission record (meaningful only when panelOpen). */
  mission: Mission | null;
  /** Transient hover id from row mouseenter OR canvas trajectory hover. */
  hoveredId: string | null;
  /** Whether the MissionPanel is currently visible. */
  panelOpen: boolean;
};

export type IconicSelectionService = {
  /** Reactive state — read inside Svelte components / effects. */
  readonly state: IconicSelectionState;
  /** Row-click handler: sticky selection + 250 ms debounced panel open. */
  selectMission(missionId: string, locale: string): void;
  /** Imperative open — used by the canvas trajectory pick (no debounce). */
  openMission(missionId: string, locale: string): Promise<void>;
  /** Close the panel, clear selection + hover, cancel any pending debounce. */
  reset(): void;
};

export function createIconicSelectionService(): IconicSelectionService {
  const state = $state<IconicSelectionState>({
    selectedId: null,
    mission: null,
    hoveredId: null,
    panelOpen: false,
  });

  // Race-safe open — only the latest call's writes survive; older
  // in-flight awaits exit at the seq check before mutating state.
  let openSeq = 0;
  let openTimer: ReturnType<typeof setTimeout> | null = null;

  function cancelPendingOpen(): void {
    if (openTimer !== null) {
      clearTimeout(openTimer);
      openTimer = null;
    }
  }

  async function openMission(missionId: string, locale: string): Promise<void> {
    const seq = ++openSeq;
    state.selectedId = missionId;
    const idx = await getMissionIndex();
    if (seq !== openSeq) return;
    const entry = idx.find((e) => e.id === missionId);
    if (!entry) return;
    const m = await getMission(missionId, entry.dest, locale);
    if (seq !== openSeq) return;
    if (m) {
      state.mission = m;
      state.panelOpen = true;
    }
  }

  function selectMission(missionId: string, locale: string): void {
    state.selectedId = missionId;
    cancelPendingOpen();
    // 250 ms debounce — feels instant to users while consolidating
    // rapid-click bursts into one MissionPanel re-render. The seq
    // guard inside openMission catches racing async chains.
    openTimer = setTimeout(() => {
      openTimer = null;
      void openMission(missionId, locale);
    }, 250);
  }

  function reset(): void {
    cancelPendingOpen();
    state.selectedId = null;
    state.mission = null;
    state.hoveredId = null;
    state.panelOpen = false;
  }

  return { state, selectMission, openMission, reset };
}
