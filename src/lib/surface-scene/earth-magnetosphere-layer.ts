/**
 * Earth magnetosphere science-lens layer (PRD-023 Slice D/E.3b, surfaced
 * on /earth). A stylised dipole field-line "cage" plus the magnetic axis,
 * gated by the `'magnetosphere'` science lens.
 *
 * Geometry: classic dipole field lines, drawn from the equation
 *   r(λ) = L · cos²(λ)
 * where λ is magnetic latitude and L is the field line's equatorial
 * crossing distance (the "L-shell"). Each closed line runs pole-to-pole,
 * bulging out at the magnetic equator — the recognisable bar-magnet cage.
 *
 * Orientation: the cage is tilted to the planet's spin axis (axial tilt,
 * ~23.4° for Earth) and then offset by the magnetic-dipole tilt (~11°),
 * so the magnetic axis sits visibly off the geographic pole — the same
 * offset the upcoming true-vs-magnetic-north layer keys off.
 *
 * Mirrors the earth-atmosphere-layer.ts contract: returns the Three.js
 * group + a dispose callback; the caller adds the group to its scene and
 * calls dispose() on teardown.
 */
import * as THREE from 'three';
import { onLayerChange } from '$lib/science-layers';

export interface MagnetosphereOpts {
  /** Field-line + axis colour. */
  color: number;
  /** SurfaceScene planet radius (always 30) — sets the cage scale. */
  planetRadius: number;
  /** Planet spin-axis tilt in degrees (Earth 23.4) — aligns the cage to
   *  the tilted globe. */
  spinTiltDeg: number;
  /** Magnetic-dipole offset from the spin axis in degrees (Earth ~11). */
  magneticOffsetDeg?: number;
  /** L-shells to draw, in planet radii. */
  shells?: number[];
  /** Meridional planes (field lines per shell, spaced around the axis). */
  longitudes?: number;
  /** Field-line opacity. */
  opacity?: number;
  /** Direction toward the Sun in scene space — orients the magnetopause
   *  nose (sunward) and the magnetotail (anti-sunward). Defaults to the
   *  surface-scene sun light at [120, 60, 100]. */
  sunDir?: [number, number, number];
}

export interface MagnetosphereHandle {
  group: THREE.Group;
  dispose: () => void;
}

export function buildMagnetosphere(opts: MagnetosphereOpts): MagnetosphereHandle {
  const R = opts.planetRadius;
  const shells = opts.shells ?? [1.45, 2.0, 2.65];
  const longitudes = opts.longitudes ?? 6;
  const magOffset = ((opts.magneticOffsetDeg ?? 11) * Math.PI) / 180;
  const spinTilt = (opts.spinTiltDeg * Math.PI) / 180;

  const disposables: Array<{ dispose: () => void }> = [];

  const lineMat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: opts.opacity ?? 0.55,
    depthWrite: false,
  });
  disposables.push(lineMat);

  // `inner` holds the dipole cage, tilted by the magnetic offset so its
  // axis is visibly off the spin axis (which `group` then tilts to the
  // globe). Field lines are built with the magnetic axis along +Y.
  const inner = new THREE.Group();

  for (const L of shells) {
    const Lr = L * R; // equatorial crossing distance, scene units
    // Latitude where the line meets the surface: R = Lr·cos²(λ0).
    const lambda0 = Math.acos(Math.min(1, Math.sqrt(R / Lr)));
    for (let j = 0; j < longitudes; j++) {
      const phi = (j / longitudes) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      const N = 64;
      for (let i = 0; i <= N; i++) {
        const lam = -lambda0 + 2 * lambda0 * (i / N);
        const r = Lr * Math.cos(lam) * Math.cos(lam);
        const cl = Math.cos(lam);
        pts.push(
          new THREE.Vector3(r * cl * Math.cos(phi), r * Math.sin(lam), r * cl * Math.sin(phi)),
        );
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      disposables.push(geo);
      inner.add(new THREE.Line(geo, lineMat));
    }
  }

  // Magnetic dipole axis — a faint pole-to-pole line a touch beyond the
  // outer shell, so the tilt off the geographic pole reads clearly.
  const axisLen = shells[shells.length - 1] * R * 1.08;
  const axisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -axisLen, 0),
    new THREE.Vector3(0, axisLen, 0),
  ]);
  const axisMat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: (opts.opacity ?? 0.55) * 0.6,
    depthWrite: false,
  });
  disposables.push(axisGeo, axisMat);
  inner.add(new THREE.Line(axisGeo, axisMat));

  inner.rotation.x = magOffset;

  const group = new THREE.Group();
  group.add(inner);
  group.rotation.z = spinTilt;
  group.userData.layerKey = 'magnetosphere';
  group.visible = false;

  // ── Magnetopause + bow shock + magnetotail ──────────────────────────
  // Oriented by the Sun (NOT the magnetic axis): the solar wind compresses
  // the field into a bullet nose on the day side and draws it out into a
  // long tail on the night side. Built as surfaces of revolution about
  // local +Y, then rotated so +Y points sunward.
  const sun = new THREE.Vector3(...(opts.sunDir ?? [120, 60, 100])).normalize();
  const shield = new THREE.Group();

  // Magnetopause + bow shock as faint translucent surfaces of revolution
  // — subtle volumes that give the "shield" depth without adding line
  // clutter over the crisp field cage. Kept tight so they halo the planet
  // rather than sprawl across the frame.
  const lathe = (profile: THREE.Vector2[], color: number, opacity: number) => {
    const geo = new THREE.LatheGeometry(profile, 40);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    disposables.push(geo, mat);
    return new THREE.Mesh(geo, mat);
  };

  // Magnetopause: paraboloid opening anti-sunward (nose Rs, tail radius Rt
  // over length Lt).
  const Rs = 2.1 * R;
  const Rt = 1.5 * R;
  const Lt = 3.0 * R;
  const mpProfile: THREE.Vector2[] = [];
  for (let i = 0; i <= 32; i++) {
    const y = Rs - ((Rs + Lt) * i) / 32;
    const rho = Math.min(Rt, Math.sqrt(Math.max(0, 2 * Rs * (Rs - y))) * 0.58);
    mpProfile.push(new THREE.Vector2(Math.max(rho, 0.001), y));
  }
  shield.add(lathe(mpProfile, opts.color, (opts.opacity ?? 0.5) * 0.14));

  // Bow shock: a shallow, fainter cap standing off just ahead of the nose
  // on the sunward side — the warm front the solar wind piles up.
  const bowRs = Rs * 1.25;
  const bsProfile: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const y = bowRs - bowRs * 0.85 * (i / 16);
    const rho = Math.min(Rt * 1.05, Math.sqrt(Math.max(0, 2 * bowRs * (bowRs - y))) * 0.5);
    bsProfile.push(new THREE.Vector2(Math.max(rho, 0.001), y));
  }
  shield.add(lathe(bsProfile, 0xffd27f, 0.07));

  shield.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sun);
  group.add(shield);

  const stopWatch = onLayerChange('magnetosphere', (on) => {
    group.visible = on;
  });

  return {
    group,
    dispose: () => {
      stopWatch?.();
      for (const d of disposables) d.dispose();
    },
  };
}
