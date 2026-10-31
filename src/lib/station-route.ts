/**
 * Config contract for `StationRoute.svelte` — the shared body of /iss and
 * /tiangong. Everything that differs between the two routes (data sources,
 * i18n keys, scene numbers, assembly phases, blueprint layout, test-hook
 * ids) lives in one of these objects; the component holds none of it.
 */
import type * as THREE from 'three';
import type { IssModule } from '$types/iss-module';
import type { BlueprintModule } from '$lib/station-blueprint';

/** `IssModule` and `TiangongModule` are structurally identical. */
export type StationModule = IssModule;

type Msg = () => string;

/** One Paraglide message per slot — each route binds its own `m.<id>_*` keys. */
export interface StationRouteMessages {
  pageTitle: Msg;
  loadFailed: Msg;
  a11yModulesList: Msg;
  canvasAria: Msg;
  listHeading: Msg;
  indexClose: Msg;
  visitorsHeading: Msg;
  btnModulesTitle: Msg;
  toggleTimelineAria: Msg;
  timelineTitle: Msg;
  hudAria: Msg;
  btnBlueprintTitle: Msg;
  blueprintLabel3d: Msg;
  blueprintLabelTop: Msg;
  blueprintLabelSide: Msg;
  blueprintLabelFront: Msg;
  btnSpinTitle: Msg;
  btnSpin: Msg;
  fallbackPerf: Msg;
  fallbackMemory: Msg;
  hudHint: Msg;
  dockedLegend: Msg;
  blueprintViewTop: Msg;
  blueprintViewSide: Msg;
  blueprintViewFront: Msg;
  btnResetTitle: Msg;
  watchAssemblyTitle: Msg;
}

/** A dated assembly-timeline row (dock fly-in or truss install). */
export interface StationAssemblyEvent {
  id: string;
  name: string;
  launcher: string;
  launch_date: string;
}

export interface StationRouteConfig {
  /**
   * 'iss' | 'tiangong'. Prefixes every data-testid / data-audio-stage, the
   * `window.__<id>PickAt` test hook, the `<id>-root` class, the URL path
   * (`/<id>`) and the AR scene type.
   */
  id: 'iss' | 'tiangong';
  /** Display name used in the blueprint aria-label and timeline heading. */
  stationName: string;
  msg: StationRouteMessages;

  loadModules(locale: string): Promise<StationModule[]>;
  loadVisitors(locale: string): Promise<StationModule[]>;
  loadGallery(moduleId: string): Promise<string[]>;
  buildStation(): THREE.Group;

  blueprint: {
    build(modules: StationModule[], visitors: StationModule[]): BlueprintModule[];
  };

  camera: {
    position: [number, number, number];
    target: [number, number, number];
    /** Portrait (aspect < 1): scale the camera back by min(max, 1 / max(minAspect, aspect)). */
    portraitMaxScale: number;
    portraitMinAspect: number;
  };

  assembly: {
    durationMs: number;
    dockEvents: readonly StationAssemblyEvent[];
    trussPhases: readonly StationAssemblyEvent[];
    /** Dock-event id → the module/visitor id its chip highlights. */
    dockPickableId(dockEventId: string): string;
    /** Modules that ride up with another one and get no chip of their own. */
    skipModuleChip?(moduleId: string): boolean;
    moduleChipName?(mod: StationModule): string;
    /**
     * Frame order: apply the assembly pose before (true) or after (false)
     * the sun-tracking solar-array tick. Kept per route to leave frame
     * output untouched.
     */
    beforeSunTracking: boolean;
  };

  orbit: { altitudeKm: number; inclinationDeg: number; periodMin: number };

  /** Module ids with a hidden `<id>-select-<moduleId>` tour anchor button. */
  tourAnchors: readonly string[];
  /** Also render the hidden "play assembly" tour anchor. */
  tourAssemblyAnchor: boolean;
  /** Also list the visiting vehicles in the screen-reader-only module list. */
  srListIncludesVisitors: boolean;
  /** The floating timeline overlay's hover also mirrors into selection.state.hoveredId. */
  timelineOverlayHoverSyncsSelection: boolean;
  /** Label for the HUD "watch live" link; omit for no link. */
  liveLinkLabel?: Msg;
}
