import { getTiangongModules, getTiangongVisitors, getTiangongModuleGallery } from '$lib/data';
import { buildTiangongProxyStation } from '$lib/tiangong-proxy-model';
import { TIANGONG_DOCK_EVENTS } from '$lib/tiangong-assembly-phases';
import type { BlueprintModule } from '$lib/station-blueprint';
import type { StationModule, StationRouteConfig } from '$lib/station-route';
import * as m from '$lib/paraglide/messages';

// Tiangong blueprint module list — hardcoded canonical positions
// (Tianhe along X, Wentian +Y, Mengtian -Y, branches off forward node).
// Names come from the loaded modules + visitors so they're localised.
function buildTiangongBlueprint(
  modules: StationModule[],
  visitors: StationModule[],
): BlueprintModule[] {
  if (modules.length === 0) return [] as BlueprintModule[];
  const all = [...modules, ...visitors];
  const nameById = new Map(all.map((x) => [x.id, x.name]));
  const layout: BlueprintModule[] = [
    {
      id: 'tianhe',
      name: nameById.get('tianhe') ?? 'Tianhe',
      x: 0,
      y: 0,
      z: 0,
      len: 2.6,
      radius: 0.22,
      axis: 'x',
    },
    // Wentian + Mengtian: long axis along Y, branching from Tianhe forward node
    {
      id: 'wentian',
      name: nameById.get('wentian') ?? 'Wentian',
      x: 1.44,
      y: 1.2,
      z: 0,
      len: 2.4,
      radius: 0.24,
      axis: 'y',
    },
    {
      id: 'mengtian',
      name: nameById.get('mengtian') ?? 'Mengtian',
      x: 1.44,
      y: -1.2,
      z: 0,
      len: 2.4,
      radius: 0.24,
      axis: 'y',
    },
    // Chinarm — small box rendered as a short cylinder
    {
      id: 'chinarm',
      name: nameById.get('chinarm') ?? 'Chinarm',
      x: 1.44,
      y: 0.55,
      z: 0.7,
      len: 1.1,
      radius: 0.04,
      axis: 'z',
    },
  ];
  if (visitors.length > 0) {
    // Shenzhou docks aft of Tianhe; Tianzhou docks forward of node.
    layout.push(
      {
        id: 'shenzhou',
        name: nameById.get('shenzhou') ?? 'Shenzhou',
        x: -1.95,
        y: 0,
        z: 0,
        len: 1.45,
        radius: 0.21,
        axis: 'x',
        kind: 'visitor',
      },
      {
        id: 'tianzhou',
        name: nameById.get('tianzhou') ?? 'Tianzhou',
        x: 2.55,
        y: 0,
        z: 0,
        len: 1.66,
        radius: 0.27,
        axis: 'x',
        kind: 'visitor',
      },
    );
  }

  // Tiangong solar arrays — gold/bronze gallium-arsenide. 4 wings on
  // Tianhe (2 pairs along ±Z, perpendicular to module long axis X);
  // 2 wings each at the outboard tips of Wentian (+Y end) and Mengtian
  // (−Y end). Arrays extend perpendicular to the module's long axis.
  //
  // Excluded by design: tiny detail bits (truss not present on
  // Tiangong — modules connect via the spherical hub, not a truss);
  // Chinarm-related rails (already shown as the chinarm module);
  // visiting-craft solar panels (would clutter; the visitor rectangles
  // already convey their presence).

  // Tianhe arrays: 4 wings deployed along ±Z from 2 mast positions
  // along Tianhe's X axis (aft half of the core).
  const tianheMastXs = [-tianheLen() * 0.45, -tianheLen() * 0.1];
  function tianheLen() {
    return 2.6;
  }
  for (const mastX of tianheMastXs) {
    for (const zSign of [-1, 1] as const) {
      layout.push({
        id: `tianhe_array_${mastX.toFixed(2)}_${zSign}`,
        name: '',
        x: mastX,
        y: 0,
        z: zSign * 1.2,
        len: 1.6, // wing length along Z (12.6m / 12.7 ≈ 1)
        radius: 0.18, // wing depth perpendicular (4.65m / 12.7 ≈ 0.37, half = 0.18)
        axis: 'z',
        kind: 'solar-gold',
      });
    }
  }

  // Wentian arrays: 2 wings at outboard tip (top of +Y), extending ±X.
  for (const xSign of [-1, 1] as const) {
    layout.push({
      id: `wentian_array_${xSign}`,
      name: '',
      x: xSign * 1.8,
      y: 2.4, // outboard tip of Wentian (z=0, y=1.2 + len/2 + offset)
      z: 0,
      len: 3.6, // 27m / 12.7 ≈ 2.13... using 3.6 to match the 3D model
      radius: 0.18,
      axis: 'x',
      kind: 'solar-gold',
    });
  }

  // Mengtian arrays: mirrored to -Y.
  for (const xSign of [-1, 1] as const) {
    layout.push({
      id: `mengtian_array_${xSign}`,
      name: '',
      x: xSign * 1.8,
      y: -2.4,
      z: 0,
      len: 3.6,
      radius: 0.18,
      axis: 'x',
      kind: 'solar-gold',
    });
  }

  return layout;
}

export const tiangongRouteConfig: StationRouteConfig = {
  id: 'tiangong',
  stationName: 'Tiangong',
  msg: {
    pageTitle: m.tiangong_page_title,
    loadFailed: m.tiangong_load_failed,
    a11yModulesList: m.a11y_tiangong_modules_list_aria,
    canvasAria: m.tiangong_canvas_aria,
    listHeading: m.tiangong_list_heading,
    indexClose: m.tiangong_index_close,
    visitorsHeading: m.tiangong_visitors_heading,
    btnModulesTitle: m.tiangong_btn_modules_title,
    toggleTimelineAria: m.tiangong_toggle_timeline_aria,
    timelineTitle: m.tiangong_timeline_title,
    hudAria: m.tiangong_hud_aria,
    btnBlueprintTitle: m.tiangong_btn_blueprint_title,
    blueprintLabel3d: m.tiangong_blueprint_label_3d,
    blueprintLabelTop: m.tiangong_blueprint_label_top,
    blueprintLabelSide: m.tiangong_blueprint_label_side,
    blueprintLabelFront: m.tiangong_blueprint_label_front,
    btnSpinTitle: m.tiangong_btn_spin_title,
    btnSpin: m.tiangong_btn_spin,
    fallbackPerf: m.tiangong_fallback_perf,
    fallbackMemory: m.tiangong_fallback_memory,
    hudHint: m.tiangong_hud_hint,
    dockedLegend: m.tiangong_docked_legend,
    blueprintViewTop: m.tiangong_blueprint_view_top,
    blueprintViewSide: m.tiangong_blueprint_view_side,
    blueprintViewFront: m.tiangong_blueprint_view_front,
    btnResetTitle: m.tiangong_btn_reset_title,
    watchAssemblyTitle: m.tiangong_watch_assembly_title,
  },
  loadModules: getTiangongModules,
  loadVisitors: getTiangongVisitors,
  loadGallery: getTiangongModuleGallery,
  buildStation: buildTiangongProxyStation,
  blueprint: { build: buildTiangongBlueprint },
  // T-silhouette: framed slightly off-axis so both Tianhe (along X) and the
  // Wentian/Mengtian cross-bar (along Y) are visible at first paint. Camera
  // doubled-out from the original (2.4, 2.6, 7.2) so the station renders at
  // ~50% apparent size by default.
  camera: {
    position: [4.2, 5.2, 14.4],
    target: [0.6, 0.0, 0],
    portraitMaxScale: 1.5,
    portraitMinAspect: 0.55,
  },
  assembly: {
    durationMs: 24_000,
    // Each dock fly-in is tied to a real CMSA mission; the dockEventId values
    // mirror userData.animModuleId in tiangong-proxy-model.ts. The data lives
    // in $lib/tiangong-assembly-phases so the AR replay shares it (#408).
    dockEvents: TIANGONG_DOCK_EVENTS,
    trussPhases: [],
    // dock-tianzhou-2 → tianzhou panel; dock-shenzhou-12 → shenzhou.
    dockPickableId: (dockEventId) => dockEventId.split('-')[1] ?? dockEventId,
    // Chinarm rode up pre-installed on Tianhe (same launch date), so Tianhe's
    // chip covers both; the chinarm mesh still flies in via launchEpochOf.
    skipModuleChip: (moduleId) => moduleId === 'chinarm',
    moduleChipName: (mod) => (mod.id === 'tianhe' ? `${mod.name} + Chinarm` : mod.name),
    beforeSunTracking: true,
  },
  orbit: { altitudeKm: 385, inclinationDeg: 41.5, periodMin: 91.9 },
  tourAnchors: ['tianhe', 'wentian', 'mengtian', 'shenzhou', 'tianzhou'],
  tourAssemblyAnchor: true,
  srListIncludesVisitors: true,
  timelineOverlayHoverSyncsSelection: true,
};
