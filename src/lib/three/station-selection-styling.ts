/**
 * Per-frame selection / hover styling for station modules (#57).
 *
 * Pre-extraction this lived as a 22-line `refreshMeshMaterials(timeSec)`
 * function in /iss and /tiangong, identical character-for-character apart
 * from the visual-ref name. The pulse + emissive colour palette is the
 * shared station-route visual contract.
 *
 * Selected + panel open  → blue emissive that pulses with the scale.
 * Selected only          → blue emissive, flat brightness.
 * Otherwise              → no emissive.
 *
 * Hover feedback lives on the OutlinePass (caller wires that
 * separately); this function only touches scale + emissive.
 */
import * as THREE from 'three';

export interface StationSelectionInput {
  /** Map of moduleId → all Three.js meshes that represent that module. */
  meshById: Map<string, THREE.Object3D[]>;
  /** Currently selected module id, or null. */
  selectedId: string | null;
  /** Whether the detail panel is open (drives the pulse + brighter glow). */
  panelOpen: boolean;
  /** Wall-clock time in seconds — used for the Math.sin pulse phase. */
  timeSec: number;
}

const EMISSIVE_BLUE = 0x4466ff;
const EMISSIVE_OFF = 0x000000;

export function refreshStationSelectionStyling(input: StationSelectionInput): void {
  const { meshById, selectedId, panelOpen, timeSec } = input;
  const pulseScale = 1 + Math.sin(timeSec * 2.6) * 0.04;
  meshById.forEach((meshes, id) => {
    const isSel = id === selectedId;
    const targetScale = isSel && panelOpen ? pulseScale : 1;
    for (const mesh of meshes) {
      mesh.scale.setScalar(targetScale);
      const mat = (mesh as THREE.Mesh).material;
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
      if (isSel && panelOpen) {
        mat.emissive.setHex(EMISSIVE_BLUE);
        mat.emissiveIntensity = 0.32 + Math.sin(timeSec * 2.6) * 0.14;
      } else if (isSel) {
        mat.emissive.setHex(EMISSIVE_BLUE);
        mat.emissiveIntensity = 0.38;
      } else {
        mat.emissive.setHex(EMISSIVE_OFF);
        mat.emissiveIntensity = 0;
      }
    }
  });
}
