import * as THREE from 'three';
import { MOON_FLY_RADIUS_AU } from '$lib/fly-moon-arc';
import { SCALE_3D } from '$lib/fly-scene-constants';
import type { Vec2 } from '$lib/orbital/mission-arc';
import { buildInterplanetarySpacecraft } from '$lib/three/interplanetary-spacecraft-models';
import { buildLanderCruiseCraft } from '$lib/three/lander-cruise-models';
import {
  buildTubeGeometry,
  buildTubeMaterial,
  buildLabelSprite,
  drawLabelTexture,
} from '$lib/three/fly-helio-overlays';

/**
 * `/fly` heliocentric PER-MISSION overlay layer (RFC-036 WS-B — scene-host teardown).
 *
 * The mission-specific overlays that swap/rebuild when the mission changes: the
 * outbound/return trajectory tubes, the recognisable per-mission spacecraft model
 * (`applyMissionSpacecraftModel`), the LAUNCH/ARRIVAL/RETURN anchor rings, the moon
 * orbit ring, and the anchor label sprites (`refreshSpriteTextures`). Extracted
 * verbatim from the `onMount` closure. The refs return on the handle and destructure
 * back into the same names the page's mission-swap `$effect`s + the frame loop use;
 * `scModel` (reassigned on every mission swap, read each frame) is a handle getter.
 * Byte-identical to the inline code.
 */

/** The handle the page holds — the per-mission overlay refs + swap methods. */
export interface HelioMissionOverlays {
  outLine: THREE.Mesh;
  retLine: THREE.Mesh;
  depMarker: THREE.Mesh;
  arrMarker: THREE.Mesh;
  retMarker: THREE.Mesh;
  moonOrbitRing: THREE.Mesh;
  depLabelSprite: THREE.Sprite;
  arrLabelSprite: THREE.Sprite;
  retLabelSprite: THREE.Sprite;
  /** The active per-mission 3D model (null for missions that keep the sprite glyph);
   *  reassigned by applyMissionSpacecraftModel, read each frame. */
  readonly scModel: THREE.Group | null;
  /** Swap the spacecraft glyph for the mission's recognisable 3D model (or null). */
  applyMissionSpacecraftModel: (missionId: string) => void;
  /** Redraw the LAUNCH/ARRIVAL/RETURN label textures (ret params only for round-trips). */
  refreshSpriteTextures: (
    depLine1: string,
    depLine2: string,
    depColor: string,
    arrLine1: string,
    arrLine2: string,
    arrColor: string,
    retLine1?: string,
    retLine2?: string,
    retColor?: string,
  ) => void;
}

export interface HelioMissionDeps {
  scene: THREE.Scene;
  /** Initial arc points for the first tube build (rebuilt per-swap by the page $effect). */
  outPts: Vec2[];
  retPts: Vec2[];
}

/** Build the per-mission helio overlay layer, add it to the scene, return the handle. */
export function buildHelioMissionOverlays(deps: HelioMissionDeps): HelioMissionOverlays {
  const { scene } = deps;

  const outLine = new THREE.Mesh(
    buildTubeGeometry(deps.outPts, 0.46),
    buildTubeMaterial(0x4488ff, 0.95, 0.22),
  );
  const retLine = new THREE.Mesh(
    buildTubeGeometry(deps.retPts, 0.4),
    buildTubeMaterial(0x9966ff, 0.9, 0.2),
  );
  scene.add(outLine);
  scene.add(retLine);

  let scModel: THREE.Group | null = null;
  function applyMissionSpacecraftModel(missionId: string): void {
    if (scModel) {
      scene.remove(scModel);
      (scModel.userData.dispose as (() => void) | undefined)?.();
      scModel = null;
    }
    scModel = buildInterplanetarySpacecraft(missionId) ?? buildLanderCruiseCraft(missionId);
    if (scModel) {
      scModel.scale.setScalar(1.5);
      scModel.renderOrder = 999;
      // Rim-light injection (#84 / T6) — Fresnel emissive via onBeforeCompile so the
      // model reads as a glowing silhouette; per-part emissive bump preserves colour
      // through ACES + bloom.
      scModel.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as THREE.MeshPhongMaterial;
        if (!mat || mat.userData?.rimPatched) return;
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.rimColor = { value: new THREE.Color(0xffd9a3) };
          shader.uniforms.rimStrength = { value: 0.5 };
          shader.uniforms.rimPower = { value: 3.0 };
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
              uniform vec3 rimColor;
              uniform float rimStrength;
              uniform float rimPower;`,
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
              {
                vec3 viewDir = normalize(-vViewPosition);
                vec3 nrm = normalize(normal);
                float rim = 1.0 - max(dot(viewDir, nrm), 0.0);
                rim = pow(rim, rimPower) * rimStrength;
                totalEmissiveRadiance += rimColor * rim;
              }`,
          );
        };
        mat.emissiveIntensity = Math.min(1.0, (mat.emissiveIntensity ?? 0.4) * 2.0);
        mat.userData = { ...(mat.userData ?? {}), rimPatched: true };
        mat.needsUpdate = true;
      });
      scene.add(scModel);
    }
  }

  // ─── LAUNCH / ARRIVAL / RETURN anchor rings ──────────────────────
  const depMarker = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.25, 12, 64),
    new THREE.MeshBasicMaterial({
      color: 0x4b9cd3,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  depMarker.rotation.x = Math.PI / 2;
  scene.add(depMarker);
  const arrMarker = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.25, 12, 64),
    new THREE.MeshBasicMaterial({
      color: 0xc1440e,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  arrMarker.rotation.x = Math.PI / 2;
  scene.add(arrMarker);
  const retMarker = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.25, 12, 64),
    new THREE.MeshBasicMaterial({
      color: 0x4b9cd3,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  retMarker.rotation.x = Math.PI / 2;
  retMarker.visible = false;
  scene.add(retMarker);

  const moonOrbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(MOON_FLY_RADIUS_AU * SCALE_3D, 0.05, 8, 96),
    new THREE.MeshBasicMaterial({
      color: 0xcfcfcf,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
  );
  moonOrbitRing.rotation.x = Math.PI / 2;
  moonOrbitRing.visible = false;
  scene.add(moonOrbitRing);

  // ─── Anchor label sprites ────────────────────────────────────────
  const dep = buildLabelSprite();
  const arr = buildLabelSprite();
  const ret = buildLabelSprite();
  const depLabelSprite = dep.sprite;
  const arrLabelSprite = arr.sprite;
  const retLabelSprite = ret.sprite;
  const depCanvas = dep.canvas;
  const arrCanvas = arr.canvas;
  const retCanvas = ret.canvas;
  drawLabelTexture(depCanvas, 'LAUNCH', '—', '#4b9cd3');
  drawLabelTexture(arrCanvas, 'ARRIVAL', '—', '#c1440e');
  drawLabelTexture(retCanvas, 'RETURN', '—', '#4b9cd3');
  (depLabelSprite.material.map as THREE.Texture).needsUpdate = true;
  (arrLabelSprite.material.map as THREE.Texture).needsUpdate = true;
  (retLabelSprite.material.map as THREE.Texture).needsUpdate = true;
  retLabelSprite.visible = false;
  scene.add(depLabelSprite);
  scene.add(arrLabelSprite);
  scene.add(retLabelSprite);

  function refreshSpriteTextures(
    depLine1: string,
    depLine2: string,
    depColor: string,
    arrLine1: string,
    arrLine2: string,
    arrColor: string,
    retLine1?: string,
    retLine2?: string,
    retColor?: string,
  ): void {
    drawLabelTexture(depCanvas, depLine1, depLine2, depColor);
    drawLabelTexture(arrCanvas, arrLine1, arrLine2, arrColor);
    const depTex = (depLabelSprite.material as THREE.SpriteMaterial).map;
    const arrTex = (arrLabelSprite.material as THREE.SpriteMaterial).map;
    if (depTex) depTex.needsUpdate = true;
    if (arrTex) arrTex.needsUpdate = true;
    if (retLine1 != null && retLine2 != null && retColor != null) {
      drawLabelTexture(retCanvas, retLine1, retLine2, retColor);
      const retTex = (retLabelSprite.material as THREE.SpriteMaterial).map;
      if (retTex) retTex.needsUpdate = true;
    }
  }

  return {
    outLine,
    retLine,
    depMarker,
    arrMarker,
    retMarker,
    moonOrbitRing,
    depLabelSprite,
    arrLabelSprite,
    retLabelSprite,
    get scModel() {
      return scModel;
    },
    applyMissionSpacecraftModel,
    refreshSpriteTextures,
  };
}
