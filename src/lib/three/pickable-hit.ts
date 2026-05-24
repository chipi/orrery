/**
 * Make a marker dot-group pickable by raycast (#42).
 *
 * Pre-extraction /moon + /mars each inlined the same 14-line block
 * inside their orbital-marker builders:
 *
 *   1. Tag every renderable child with `userData.siteId` so a
 *      raycast hit at any depth carries the id.
 *   2. Add an invisible sphere as a generous click-target — the
 *      satellite models are small at typical zooms and the bare
 *      meshes were hard to click.
 *   3. Tag the group itself with `userData.siteId` so a hit on the
 *      invisible sphere also routes correctly.
 */
import * as THREE from 'three';

export function attachPickableHit({
  dotGroup,
  siteId,
  hitRadius = 3,
}: {
  dotGroup: THREE.Group;
  siteId: string;
  hitRadius?: number;
}): void {
  dotGroup.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
      o.userData = { siteId };
    }
  });
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(hitRadius, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.userData = { siteId };
  dotGroup.add(hit);
  dotGroup.userData = { siteId };
}
