/**
 * Reactive state + side-effect actions for the module / visiting-vehicle
 * selection on the station routes (/iss + /tiangong) — single source of
 * truth, shared by both because the two routes are structural twins
 * (#57; same URL contract, same list/detail shape).
 *
 * Idiomatic Svelte 5: one `$state` object exposed via a service factory,
 * mutated via named actions. Replaces an earlier shape where three
 * separate `$state` cells (`selected`, `panelOpen`, `canvasHoveredId`)
 * lived directly in each `+page.svelte` and had to be written + reset in
 * lockstep at every consumer (row click, canvas pick, URL→state effect,
 * close button). Mirrors the iconic-mission factory on /explore
 * (`src/routes/explore/iconic-selection.svelte.ts`).
 *
 * The factory closes over the debounce timer so each station-route mount
 * gets its own — avoids cross-mount leakage on HMR / test re-mount.
 *
 * Why a debounce on `select()`: arrow-key / hover preview moves the
 * highlight instantly (cheap `selectedId` write) but commits the panel
 * 250 ms later. The panel's gallery fetch (`StationModulePanel`
 * `galleryFetcher`) is the heavy part — debouncing the commit keeps fast
 * keyboard scrubbing from storming the network. See the project rule
 * "pointer events drive lightweight state only".
 *
 * Consumers in each `+page.svelte`:
 *   • Row markup + sr-only list + blueprint + canvas overlay — read
 *     `.selectedId` for `aria-current` / selection styling.
 *   • `canvas-hovered` class + canvas overlay — read `.hoveredId`.
 *   • Three.js visual-ref `$effect` — mirrors `.selectedId` / `.panelOpen`
 *     into the plain object the animate() loop reads each frame.
 *   • `StationModulePanel module={station.state.item} open={…panelOpen}>` —
 *     prop-driven (stays prop, not context, so the panel is reusable).
 *   • Row `onclick` / canvas pick → `open()`; arrow-key nav → `select()`;
 *     close button / Esc / URL-clear → `reset()`.
 */

/** Minimal contract every station list item satisfies. */
export interface StationItem {
  id: string;
}

export type StationSelectionState<T extends StationItem> = {
  /** Roving highlight id. Drives `aria-current`; updates instantly. */
  selectedId: string | null;
  /** Committed item shown in the detail panel (lags `selectedId` by the
   *  debounce window while scrubbing). */
  item: T | null;
  /** Transient hover id mirrored from the 3D canvas raycaster. */
  hoveredId: string | null;
  /** Whether the StationModulePanel is currently visible. */
  panelOpen: boolean;
};

export type StationSelectionService<T extends StationItem> = {
  /** Reactive state — read inside Svelte components / effects. */
  readonly state: StationSelectionState<T>;
  /** Arrow-key / hover preview: instant highlight + debounced panel commit. */
  select(item: T): void;
  /** Imperative open — row click, canvas pick, URL→state (no debounce). */
  open(item: T): void;
  /** Close the panel, clear selection + hover, cancel any pending commit. */
  reset(): void;
};

export interface StationSelectionOptions<T extends StationItem> {
  /** Called whenever the committed selection changes (open / debounced
   *  commit / reset). The page wires this to URL sync. Safe to fire
   *  redundantly — `syncStationUrl` short-circuits when already in sync. */
  onCommit?: (item: T | null) => void;
  /** Debounce window for `select()` commits. Default 250 ms. */
  debounceMs?: number;
}

export function createStationSelectionService<T extends StationItem>(
  opts: StationSelectionOptions<T> = {},
): StationSelectionService<T> {
  const { onCommit, debounceMs = 250 } = opts;

  const state = $state<StationSelectionState<T>>({
    selectedId: null,
    item: null,
    hoveredId: null,
    panelOpen: false,
  });

  let commitTimer: ReturnType<typeof setTimeout> | null = null;

  function cancelPendingCommit(): void {
    if (commitTimer !== null) {
      clearTimeout(commitTimer);
      commitTimer = null;
    }
  }

  function commit(item: T): void {
    state.selectedId = item.id;
    state.item = item;
    state.panelOpen = true;
    onCommit?.(item);
  }

  function open(item: T): void {
    cancelPendingCommit();
    commit(item);
  }

  function select(item: T): void {
    // Instant, cheap highlight move — drives aria-current / focus ring.
    state.selectedId = item.id;
    cancelPendingCommit();
    commitTimer = setTimeout(() => {
      commitTimer = null;
      commit(item);
    }, debounceMs);
  }

  function reset(): void {
    cancelPendingCommit();
    state.selectedId = null;
    state.item = null;
    state.hoveredId = null;
    state.panelOpen = false;
    onCommit?.(null);
  }

  return { state, select, open, reset };
}
