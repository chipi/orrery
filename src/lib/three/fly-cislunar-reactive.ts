import * as THREE from 'three';
import { buildTubeFromPoints } from '$lib/three/glow-line';
import { onLayerChange } from '$lib/science-layers';
import { isScienceLensOn, onScienceLensChange } from '$lib/science-lens';
import {
  moonEciPos,
  type Vec3Km,
  type CislunarTrajectory,
  type CislunarProfile,
} from '$lib/orbital/cislunar/cislunar-geometry';
import type { BoldArrow } from '$lib/three/bold-arrow';
import type { MissionTimeline } from '$lib/physics/transfer/mission-arc';
import type { LoadedMission } from '$lib/fly-mission-apply';
import {
  CISLUNAR_PHASE_COLORS,
  LUNAR_LOCAL_PHASE_TYPES,
  buildCislunarStarField,
  buildCislunarLineMaterial,
  buildCislunarSpacecraftSprite,
  buildAnnotationSprite,
} from '$lib/three/fly-cislunar-overlays';

/**
 * `/fly` cislunar REACTIVE overlay layer (RFC-036 WS-B — scene-host teardown).
 *
 * The cislunar counterpart of fly-helio-reactive: the per-phase trajectory tubes
 * (rebuilt in-place on mission swap), the ∆v annotation sprites, the spacecraft
 * marker + moon-frame group, and the science-layer subscriptions — plus the
 * per-frame updaters (`rebuildCislunarLines` / `updateCislunarLineProgress` /
 * `updateCislunarSpacecraft` / `rebuildCislunarAnnotations`) that the page publishes
 * through `flyUpdaters.cislunar` and calls each frame. Extracted verbatim from the
 * `onMount` closure. Live reactive reads (`arcTimeline`, `mission`) thread as getter
 * deps; the updaters + refs return on the handle and destructure back into the same
 * names the frame loop + mission-swap effect already use. Byte-identical.
 */

/** The static cislunar-scene refs this layer drives (from buildCislunarScene). */
export interface CislunarReactiveDeps {
  scene: THREE.Scene;
  moon: THREE.Mesh;
  scaleCislunar: number;
  earthSoI: THREE.Mesh;
  moonSoI: THREE.Mesh;
  overlays: {
    gravityEarth: BoldArrow;
    gravityMoon: BoldArrow;
    velocity: BoldArrow;
    centripetal: BoldArrow;
    periMarker: THREE.Mesh;
    apoMarker: THREE.Mesh;
    coastLine: THREE.Line;
  };
  /** Live reactive reads. */
  getArcTimeline: () => MissionTimeline;
  getMission: () => LoadedMission;
}

/** The handle the page holds — refs + the per-frame/per-mission updaters + cleanup. */
export interface CislunarReactiveOverlays {
  cislunarMoonFrameGroup: THREE.Group;
  cislunarSpacecraft: THREE.Sprite;
  /** The per-phase tube meshes, keyed by phase type — the frame loop iterates them
   *  for the zoom-invariant thickness rebuild (#83). */
  cislunarPhaseLines: Map<string, THREE.Mesh>;
  ensureCislunarPhaseLine: (type: string) => THREE.Mesh;
  rebuildCislunarLines: (traj: CislunarTrajectory | null) => void;
  updateCislunarLineProgress: (traj: CislunarTrajectory | null, met_days: number) => void;
  updateCislunarSpacecraft: (traj: CislunarTrajectory | null, met_days: number) => void;
  rebuildCislunarAnnotations: (
    traj: CislunarTrajectory | null,
    profile: CislunarProfile | undefined,
  ) => void;
  clearCislunarAnnotations: () => void;
  dispose: () => void;
}

/** Build the cislunar reactive overlay layer, add it to the scene, return the
 *  handle. Mirrors the inline construction + listener wiring + updaters 1:1. */
export function buildCislunarReactiveOverlays(
  deps: CislunarReactiveDeps,
): CislunarReactiveOverlays {
  const { scene, moon, scaleCislunar, earthSoI, moonSoI, overlays } = deps;

  const stops: Array<(() => void) | undefined> = [];
  stops.push(
    onLayerChange('soi', (on) => {
      earthSoI.visible = on;
      moonSoI.visible = on;
    }),
  );
  stops.push(
    onLayerChange('gravity', (on) => {
      overlays.gravityEarth.visible = on;
      overlays.gravityMoon.visible = on;
    }),
  );
  stops.push(onLayerChange('velocity', (on) => (overlays.velocity.visible = on)));
  stops.push(onLayerChange('centripetal', (on) => (overlays.centripetal.visible = on)));
  stops.push(
    onLayerChange('apsides', (on) => {
      overlays.periMarker.visible = on;
      overlays.apoMarker.visible = on;
    }),
  );
  stops.push(onLayerChange('coast', (on) => (overlays.coastLine.visible = on)));

  scene.add(buildCislunarStarField());

  const cislunarPhaseLines = new Map<string, THREE.Mesh>();
  const cislunarMoonFrameGroup = new THREE.Group();
  scene.add(cislunarMoonFrameGroup);

  function ensureCislunarPhaseLine(type: string): THREE.Mesh {
    const existing = cislunarPhaseLines.get(type);
    if (existing) return existing;
    const line = new THREE.Mesh(
      new THREE.BufferGeometry(),
      buildCislunarLineMaterial(CISLUNAR_PHASE_COLORS[type] ?? 0xffffff),
    );
    if (LUNAR_LOCAL_PHASE_TYPES.has(type)) {
      cislunarMoonFrameGroup.add(line);
    } else {
      scene.add(line);
    }
    cislunarPhaseLines.set(type, line);
    return line;
  }

  const { sprite: cislunarSpacecraft } = buildCislunarSpacecraftSprite();
  scene.add(cislunarSpacecraft);

  const cislunarAnnotations: THREE.Sprite[] = [];
  function clearCislunarAnnotations(): void {
    for (const s of cislunarAnnotations) {
      scene.remove(s);
      s.material.map?.dispose();
      s.material.dispose();
    }
    cislunarAnnotations.length = 0;
  }

  function rebuildCislunarAnnotations(
    traj: CislunarTrajectory | null,
    profile: CislunarProfile | undefined,
  ): void {
    clearCislunarAnnotations();
    if (!traj) return;
    const annotations: Array<{ position: Vec3Km; line1: string; line2: string; accent: string }> =
      [];

    const tliPhase = traj.phases.find((p) => p.type === 'tli_coast' || p.type === 'spiral_earth');
    const tliDv = profile?.tli?.dv_kms;
    if (tliPhase && tliPhase.points.length > 0 && tliDv != null) {
      annotations.push({
        position: tliPhase.points[0],
        line1: 'TLI',
        line2: `${tliDv.toFixed(2)} km/s`,
        accent: '#ffd166',
      });
    }

    const hasLunarPhase = traj.phases.some(
      (p) => p.type === 'lunar_orbit' || p.type === 'spiral_lunar',
    );
    if (!hasLunarPhase && tliPhase && profile?.lunar_arrival?.periselene_km != null) {
      const last = tliPhase.points[tliPhase.points.length - 1];
      annotations.push({
        position: last,
        line1: 'PERISELENE',
        line2: `${profile.lunar_arrival.periselene_km.toLocaleString()} km`,
        accent: '#ff9933',
      });
    }

    const lunarPhase = traj.phases.find((p) => p.type === 'lunar_orbit');
    const loiDv =
      profile?.lunar_arrival?.type === 'orbit' || profile?.lunar_arrival?.type === 'lor_orbit'
        ? deps.getMission().flight?.arrival?.orbit_insertion_dv_km_s
        : undefined;
    if (lunarPhase && lunarPhase.points.length > 0 && loiDv != null) {
      annotations.push({
        position: lunarPhase.points[0],
        line1: 'LOI',
        line2: `${loiDv.toFixed(2)} km/s`,
        accent: '#c77dff',
      });
    }

    const teiPhase = traj.phases.find((p) => p.type === 'tei_coast');
    const teiDv = profile?.return?.dv_kms;
    if (teiPhase && teiPhase.points.length > 0 && teiDv != null) {
      annotations.push({
        position: teiPhase.points[0],
        line1: 'TEI',
        line2: `${teiDv.toFixed(2)} km/s`,
        accent: '#06d6a0',
      });
    }

    for (const a of annotations) {
      const sprite = buildAnnotationSprite(a.line1, a.line2, a.accent);
      sprite.position.set(
        a.position.x * scaleCislunar,
        a.position.y * scaleCislunar + 2,
        a.position.z * scaleCislunar,
      );
      scene.add(sprite);
      cislunarAnnotations.push(sprite);
    }
    const lensOn = isScienceLensOn();
    for (const s of cislunarAnnotations) s.visible = lensOn;
  }
  stops.push(
    onScienceLensChange((on) => {
      for (const s of cislunarAnnotations) s.visible = on;
    }),
  );

  function rebuildCislunarLines(traj: CislunarTrajectory | null): void {
    for (const line of cislunarPhaseLines.values()) line.visible = false;
    if (!traj) {
      cislunarSpacecraft.visible = false;
      moon.visible = false;
      return;
    }
    cislunarSpacecraft.visible = true;
    moon.visible = true;
    const moonAtFlybyRef = moonEciPos(deps.getArcTimeline().flyby_day);
    for (const phase of traj.phases) {
      const line = ensureCislunarPhaseLine(phase.type);
      const lunarLocal = LUNAR_LOCAL_PHASE_TYPES.has(phase.type);
      const n = phase.points.length;
      const verts = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const p = phase.points[i];
        const x = lunarLocal ? p.x - moonAtFlybyRef.x : p.x;
        const y = lunarLocal ? p.y - moonAtFlybyRef.y : p.y;
        const z = lunarLocal ? p.z - moonAtFlybyRef.z : p.z;
        verts[i * 3] = x * scaleCislunar;
        verts[i * 3 + 1] = y * scaleCislunar;
        verts[i * 3 + 2] = z * scaleCislunar;
      }
      const tubePts: THREE.Vector3[] = [];
      for (let i = 0; i < n; i++) {
        tubePts.push(new THREE.Vector3(verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]));
      }
      line.geometry.dispose();
      line.geometry = buildTubeFromPoints(tubePts, 0.16);
      line.userData.srcPts = tubePts;
      line.userData.tubeRadius = 0.16;
      const mat = line.material as THREE.ShaderMaterial;
      mat.uniforms.uProgress.value = 0;
      line.visible = true;
    }
  }

  function updateCislunarLineProgress(traj: CislunarTrajectory | null, met_days: number): void {
    if (!traj) return;
    for (const phase of traj.phases) {
      const line = cislunarPhaseLines.get(phase.type);
      if (!line) continue;
      const mat = line.material as THREE.ShaderMaterial;
      const span = phase.end_met_days - phase.start_met_days;
      let progress: number;
      if (span <= 0) progress = met_days >= phase.end_met_days ? 1 : 0;
      else if (met_days <= phase.start_met_days) progress = 0;
      else if (met_days >= phase.end_met_days) progress = 1;
      else progress = (met_days - phase.start_met_days) / span;
      mat.uniforms.uProgress.value = progress;
    }
  }

  function updateCislunarSpacecraft(traj: CislunarTrajectory | null, met_days: number): void {
    if (!traj || traj.phases.length === 0) return;
    let phase = traj.phases[0];
    for (const p of traj.phases) {
      if (met_days >= p.start_met_days && met_days <= p.end_met_days) {
        phase = p;
        break;
      }
    }
    const span = phase.end_met_days - phase.start_met_days;
    const t = span > 0 ? Math.max(0, Math.min(1, (met_days - phase.start_met_days) / span)) : 0;
    const last = phase.points.length - 1;
    const f = t * last;
    const i = Math.min(last - 1, Math.max(0, Math.floor(f)));
    const frac = f - i;
    const a = phase.points[i];
    const b = phase.points[i + 1] ?? a;
    let offsetX = 0;
    let offsetY = 0;
    let offsetZ = 0;
    if (LUNAR_LOCAL_PHASE_TYPES.has(phase.type)) {
      const moonNow = moonEciPos(deps.getArcTimeline().dep_day + met_days);
      const moonRef = moonEciPos(deps.getArcTimeline().flyby_day);
      offsetX = moonNow.x - moonRef.x;
      offsetY = moonNow.y - moonRef.y;
      offsetZ = moonNow.z - moonRef.z;
    }
    cislunarSpacecraft.position.set(
      (a.x + (b.x - a.x) * frac + offsetX) * scaleCislunar,
      (a.y + (b.y - a.y) * frac + offsetY) * scaleCislunar,
      (a.z + (b.z - a.z) * frac + offsetZ) * scaleCislunar,
    );
  }

  return {
    cislunarMoonFrameGroup,
    cislunarSpacecraft,
    cislunarPhaseLines,
    ensureCislunarPhaseLine,
    rebuildCislunarLines,
    updateCislunarLineProgress,
    updateCislunarSpacecraft,
    rebuildCislunarAnnotations,
    clearCislunarAnnotations,
    dispose() {
      for (const s of stops) s?.();
    },
  };
}
