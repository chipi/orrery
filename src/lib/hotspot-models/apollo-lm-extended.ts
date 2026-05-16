import * as THREE from 'three';
import { buildApolloLMHotspot } from './apollo-lm';

/**
 * Apollo J-mission Lunar Module Tier 1 engineering model — used for
 * Apollo 15, 16, 17 (PRD-014 / RFC-017 §S3, ADR-062).
 *
 * Builds on top of buildApolloLMHotspot (base Apollo 11/12/14 LM) by
 * adding the Lunar Roving Vehicle (LRV), parked ~0.6u from the LM on
 * the regolith. The J-missions were the only Apollo flights to carry
 * the LRV; without it they look identical to the earlier landers.
 *
 * Dimensions sourced from public NASA technical reports:
 *   - LRV: 3.10 m long × 1.83 m wide × 1.14 m tall (NASA SP-289,
 *     Apollo Lunar Roving Vehicle Operations Handbook, p. 2-1).
 *   - Wheel diameter: 81.8 cm; wheelbase: 2.29 m.
 *   - High-gain dish antenna: 0.81 m diameter, mounted on a swing-up
 *     mast on the LRV's forward chassis.
 *   - Battery + electronics housings on the chassis sides.
 *
 * Editorial choice: the LRV sits to the LM's left, oriented so the
 * "front" (TV camera + dish) faces away from the viewer at default
 * camera azimuth — recognisable from above (the iconic "buggy"
 * silhouette). Engineering-blueprint aesthetic, same material
 * palette as the base LM.
 */

const SILVER = 0xc0c0c0;
const ALUMINIUM = 0x9a9a9a;
const TYRE_DARK = 0x222222;
const SEAT_FABRIC = 0x3a3a3a;

function chassisMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALUMINIUM, metalness: 0.6, roughness: 0.5 });
}

function wheelMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: TYRE_DARK, metalness: 0.1, roughness: 0.95 });
}

function seatMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: SEAT_FABRIC, metalness: 0.1, roughness: 0.9 });
}

function dishMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: SILVER, metalness: 0.85, roughness: 0.3 });
}

/**
 * Build the Lunar Roving Vehicle alone. Returned group is centred at
 * (0,0,0) with +Y up. Wheels rest at y=0; the chassis floats at the
 * wheel-radius height. Caller positions it on the surface beside the
 * LM (the composite J-mission builder below handles the offset).
 *
 * Scale: real LRV is 3.1 m long. Here it's 0.46u long — about a
 * third of the LM's 1.4u total height. Visually distinct from the LM
 * at Tier 1 zoom without being absurdly oversized.
 */
function buildLRV(): THREE.Group {
  const g = new THREE.Group();
  const wheelRadius = 0.045;
  const wheelbase = 0.34;
  const trackWidth = 0.22;
  const chassisLen = 0.46;
  const chassisHeight = 0.045;

  // Chassis — flat rectangular plate.
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(chassisLen, chassisHeight, trackWidth - 0.06),
    chassisMat(),
  );
  chassis.position.y = wheelRadius + chassisHeight / 2;
  g.add(chassis);

  // 4 wheels (wire-mesh tyres on the real LRV, dark cylinders here).
  for (const dx of [-wheelbase / 2, wheelbase / 2]) {
    for (const dz of [-trackWidth / 2, trackWidth / 2]) {
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.035, 12),
        wheelMat(),
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(dx, wheelRadius, dz);
      g.add(w);
    }
  }

  // Two upright seat backs (Commander + LMP side-by-side).
  for (const dx of [-0.05, 0.05]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.07), seatMat());
    seat.position.set(dx, wheelRadius + chassisHeight + 0.07, 0);
    g.add(seat);
  }

  // Battery + electronics housing under the seats (the "console").
  const console = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.08), chassisMat());
  console.position.set(0, wheelRadius + chassisHeight + 0.03, 0);
  g.add(console);

  // High-gain dish antenna on a swing-up mast (forward of seats).
  const mastHeight = 0.18;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, mastHeight, 4),
    chassisMat(),
  );
  mast.position.set(chassisLen / 2 - 0.04, wheelRadius + chassisHeight + mastHeight / 2, 0);
  g.add(mast);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 16), dishMat());
  dish.position.set(chassisLen / 2 - 0.04, wheelRadius + chassisHeight + mastHeight, 0);
  // Tilt the dish slightly toward Earth (assume Earth is in the +X / +Y
  // direction from the typical landing site at default camera azimuth).
  dish.rotation.x = Math.PI / 2.2;
  g.add(dish);

  // TV camera assembly — small cube on a short tripod, forward of the
  // dish. The iconic "robot eye" that filmed each Apollo liftoff.
  const camera = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.03), chassisMat());
  camera.position.set(chassisLen / 2 + 0.02, wheelRadius + chassisHeight + 0.04, 0);
  g.add(camera);

  return g;
}

/**
 * Apollo J-mission LM Tier 1 model = base Apollo LM + LRV parked
 * beside it. Accent colour applies to the base LM's agency ring.
 */
export function buildApolloLMExtendedHotspot(accentColor: string): THREE.Group {
  const g = buildApolloLMHotspot(accentColor);
  const lrv = buildLRV();
  // Park the LRV to the LM's left-rear, roughly where the actual
  // J-missions parked it (so the surface tracks visible in LROC NAC
  // patches read consistently when the patch is fetched).
  lrv.position.set(-0.62, 0, 0.32);
  lrv.rotation.y = -Math.PI / 5;
  g.add(lrv);
  return g;
}
