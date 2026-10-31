import { getIssModules, getIssVisitors, getIssModuleGallery } from '$lib/data';
import { buildIssProxyStation, MODULE_BOXES } from '$lib/iss-proxy-model';
import { ISS_DOCK_EVENTS, ISS_TRUSS_PHASES } from '$lib/iss-assembly-phases';
import type { BlueprintModule } from '$lib/station-blueprint';
import type { StationModule, StationRouteConfig } from '$lib/station-route';
import * as m from '$lib/paraglide/messages';

// Blueprint module list — derives from MODULE_BOXES (canonical 3D
// positions) plus structural elements (truss, main solar arrays, HRS
// radiators, PMA cones) and visiting craft so the 2D view reads as a
// full station diagram, not just a modules-only abstraction.
//
// Excluded by design: Pirs (retired 2021, replaced by Nauka at the
// same nadir port — rendering both would imply a 4-deep stack that
// never existed); Canadarm2 (articulated arm — no useful 2D footprint);
// iROSA (visually overlaps mains, adds clutter); truss segment labels
// (S0/P1/etc — too dense at blueprint scale); AMS-02 / ELC / antennas
// (small details, lost at this scale).
function buildIssBlueprint(modules: StationModule[], visitors: StationModule[]): BlueprintModule[] {
  if (modules.length === 0) return [] as BlueprintModule[];
  const nameById = new Map(modules.map((x) => [x.id, x.name]));
  const visitorNameById = new Map(visitors.map((v) => [v.id, v.name]));
  const out: BlueprintModule[] = [];

  // Pressurised modules — straight from MODULE_BOXES. Leonardo's
  // forward-port position is now baked into MODULE_BOXES so no 2D
  // override is needed.
  for (const [id, x, y, z, len, radius, axis] of MODULE_BOXES) {
    if (id === 'canadarm2') continue;
    if (id === 'pirs') continue; // retired; same port as Nauka
    out.push({
      id,
      name: nameById.get(id) ?? id,
      x,
      y,
      z,
      len,
      radius,
      axis,
      kind: 'module',
    });
  }

  // Truss — long bar perpendicular to the module stack, anchored above
  // Destiny in 3D at world (0, 0.42, 0); spans ±5.5 along Z.
  out.push({
    id: 'truss',
    name: 'TRUSS',
    x: 0,
    y: 0.42,
    z: 0,
    len: 11.0,
    radius: 0.05,
    axis: 'z',
    kind: 'truss',
  });

  // Main solar arrays — 8 wings, 2 per anchor at P4 / P6 / S4 / S6.
  // Wings extend ±X from each anchor; long axis along X.
  const wingHalfLen = 1.34;
  const wingDepth = 0.475; // half-depth in the Z direction (from blueprint perspective)
  const ANCHORS: { id: string; z: number }[] = [
    { id: 'p4', z: -3.77 },
    { id: 'p6', z: -5.5 },
    { id: 's4', z: 3.77 },
    { id: 's6', z: 5.5 },
  ];
  for (const a of ANCHORS) {
    for (const xSign of [-1, 1] as const) {
      out.push({
        id: `array_${a.id}_${xSign > 0 ? 'fwd' : 'aft'}`,
        name: '',
        x: xSign * (wingHalfLen + 0.04),
        y: 0.42,
        z: a.z,
        len: wingHalfLen * 2,
        radius: wingDepth,
        axis: 'x',
        kind: 'solar',
      });
    }
  }

  // HRS radiators — 2 vertical white panels deployed nadir from inboard
  // truss on the aft (−X) side near the Russian segment, matching the
  // 3D model's Zvezda-side placement.
  const HRS: { z: number }[] = [{ z: -1.0 }, { z: 1.0 }];
  for (const r of HRS) {
    out.push({
      id: `radiator_${r.z}`,
      name: '',
      x: -1.08,
      y: -0.18,
      z: r.z,
      len: 1.8,
      radius: 0.09,
      axis: 'x',
      kind: 'radiator',
    });
  }

  // PMA gold cones — small adapter rings between modules + visiting craft.
  out.push(
    {
      id: 'pma1',
      name: 'PMA-1',
      x: -1.0,
      y: 0,
      z: 0,
      len: 0.15,
      radius: 0.085,
      axis: 'x',
      kind: 'pma',
    },
    {
      id: 'pma2',
      name: 'PMA-2',
      x: 1.02,
      y: 0,
      z: 0,
      len: 0.15,
      radius: 0.085,
      axis: 'x',
      kind: 'pma',
    },
    {
      id: 'pma3',
      name: 'PMA-3',
      x: 0.66,
      y: 0.35,
      z: 0,
      len: 0.15,
      radius: 0.085,
      axis: 'y',
      kind: 'pma',
    },
  );

  // Visiting craft — same port positions as the 3D fleet (see
  // buildVisitingFleet in iss-proxy-model.ts). Only included if
  // present in the visitors list.
  type VisitorPort = {
    id: string;
    x: number;
    y: number;
    z: number;
    len: number;
    radius: number;
    axis: 'x' | 'y' | 'z';
  };
  const VISITOR_PORTS: VisitorPort[] = [
    // Soyuz at Rassvet nadir (Zarya nadir port further out)
    { id: 'soyuz_ms', x: -1.53, y: -0.95, z: 0, len: 0.59, radius: 0.107, axis: 'y' },
    // Progress at Poisk zenith (Zvezda zenith port)
    { id: 'progress_ms', x: -2.58, y: 0.95, z: 0, len: 0.57, radius: 0.107, axis: 'y' },
    // Crew Dragon at PMA-2 (Harmony forward, +X)
    { id: 'crew_dragon', x: 1.55, y: 0, z: 0, len: 0.85, radius: 0.157, axis: 'x' },
    // Cargo Dragon at PMA-3 (Harmony zenith, +Y)
    { id: 'cargo_dragon', x: 0.66, y: 1.0, z: 0, len: 0.85, radius: 0.157, axis: 'y' },
    // Cygnus at Unity nadir
    { id: 'cygnus', x: -0.59, y: -0.78, z: 0, len: 0.6, radius: 0.121, axis: 'y' },
    // HTV-X at Harmony nadir
    { id: 'htv_x', x: 0.66, y: -0.78, z: 0, len: 0.7, radius: 0.173, axis: 'y' },
    // Starliner at Harmony starboard
    { id: 'starliner', x: 0.66, y: 0, z: 0.85, len: 0.5, radius: 0.18, axis: 'z' },
  ];
  for (const v of VISITOR_PORTS) {
    if (!visitorNameById.has(v.id)) continue;
    out.push({
      id: v.id,
      name: visitorNameById.get(v.id) ?? v.id,
      x: v.x,
      y: v.y,
      z: v.z,
      len: v.len,
      radius: v.radius,
      axis: v.axis,
      kind: 'visitor',
    });
  }

  return out;
}

export const issRouteConfig: StationRouteConfig = {
  id: 'iss',
  stationName: 'ISS',
  msg: {
    pageTitle: m.iss_page_title,
    loadFailed: m.iss_load_failed,
    a11yModulesList: m.a11y_iss_modules_list_aria,
    canvasAria: m.iss_canvas_aria,
    listHeading: m.iss_list_heading,
    indexClose: m.iss_index_close,
    visitorsHeading: m.iss_visitors_heading,
    btnModulesTitle: m.iss_btn_modules_title,
    toggleTimelineAria: m.iss_toggle_timeline_aria,
    timelineTitle: m.iss_timeline_title,
    hudAria: m.iss_hud_aria,
    btnBlueprintTitle: m.iss_btn_blueprint_title,
    blueprintLabel3d: m.iss_blueprint_label_3d,
    blueprintLabelTop: m.iss_blueprint_label_top,
    blueprintLabelSide: m.iss_blueprint_label_side,
    blueprintLabelFront: m.iss_blueprint_label_front,
    btnSpinTitle: m.iss_btn_spin_title,
    btnSpin: m.iss_btn_spin,
    fallbackPerf: m.iss_fallback_perf,
    fallbackMemory: m.iss_fallback_memory,
    hudHint: m.iss_hud_hint,
    dockedLegend: m.iss_docked_legend,
    blueprintViewTop: m.iss_blueprint_view_top,
    blueprintViewSide: m.iss_blueprint_view_side,
    blueprintViewFront: m.iss_blueprint_view_front,
    btnResetTitle: m.iss_btn_reset_title,
    watchAssemblyTitle: m.iss_watch_assembly_title,
  },
  loadModules: getIssModules,
  loadVisitors: getIssVisitors,
  loadGallery: getIssModuleGallery,
  buildStation: buildIssProxyStation,
  blueprint: { build: buildIssBlueprint },
  camera: {
    position: [2.0, -3.0, 13.0],
    target: [0, 0.1, 0],
    portraitMaxScale: 1.7,
    portraitMinAspect: 0.5,
  },
  assembly: {
    durationMs: 50_000,
    dockEvents: ISS_DOCK_EVENTS,
    trussPhases: ISS_TRUSS_PHASES,
    // dock-soyuz_ms → soyuz_ms; dock-crew_dragon → crew_dragon; etc.
    dockPickableId: (dockEventId) => dockEventId.replace(/^dock-/, ''),
    beforeSunTracking: false,
  },
  orbit: { altitudeKm: 408, inclinationDeg: 51.6, periodMin: 92.7 },
  tourAnchors: ['zarya', 'unity', 'destiny', 'kibo', 'columbus'],
  tourAssemblyAnchor: false,
  srListIncludesVisitors: false,
  timelineOverlayHoverSyncsSelection: false,
  liveLinkLabel: m.live_iss_watch,
};
