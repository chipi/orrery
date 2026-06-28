/**
 * Earth geophysics science-lens layers (PRD-024) — three stylised
 * overlays surfaced on /earth, each gated by its own science lens:
 *
 *   - 'axial-tilt' → spin axis + obliquity arc against the orbital plane
 *   - 'mag-north'  → geographic vs magnetic north pole markers
 *   - 'tides'      → Earth–Moon tidal bulges (along the +X Moon axis)
 *
 * Each builder mirrors the earth-atmosphere-layer.ts contract: returns
 * the Three.js group + a dispose callback. The caller adds the group to
 * its scene and calls dispose() on teardown.
 */
import * as THREE from 'three';
import { onLayerChange, type LayerKey } from '$lib/science-layers';

export interface GeoLayerHandle {
  group: THREE.Group;
  dispose: () => void;
}

const DEG = Math.PI / 180;

function gate(group: THREE.Group, key: LayerKey, disposables: Array<{ dispose: () => void }>) {
  group.userData.layerKey = key;
  group.visible = false;
  const stop = onLayerChange(key, (on) => {
    group.visible = on;
  });
  return {
    group,
    dispose: () => {
      stop?.();
      for (const d of disposables) d.dispose();
    },
  };
}

function ring(radius: number, mat: THREE.LineBasicMaterial, segments = 96): THREE.Line {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
}

function coneMarker(size: number, color: number): THREE.Mesh {
  const geo = new THREE.ConeGeometry(size * 0.5, size, 12);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const m = new THREE.Mesh(geo, mat);
  m.userData.disposables = [geo, mat];
  return m;
}

export interface AxialTiltOpts {
  planetRadius: number;
  spinTiltDeg: number;
  color: number;
}

/** Spin axis (through the tilted poles) + the planet's equator ring,
 *  contrasted with the horizontal orbital-plane ring, plus an obliquity
 *  arc between the spin axis and the orbital-plane normal. */
export function buildAxialTilt(opts: AxialTiltOpts): GeoLayerHandle {
  const R = opts.planetRadius;
  const tilt = opts.spinTiltDeg * DEG;
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();

  const lineMat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const faintMat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const eclipticMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  disposables.push(lineMat, faintMat, eclipticMat);

  // Tilted sub-group: spin axis + equator (inherit the obliquity).
  const tilted = new THREE.Group();
  tilted.rotation.z = tilt;
  const axisLen = R * 1.55;
  const axisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -axisLen, 0),
    new THREE.Vector3(0, axisLen, 0),
  ]);
  disposables.push(axisGeo);
  tilted.add(new THREE.Line(axisGeo, lineMat));

  const nCap = coneMarker(R * 0.12, opts.color);
  nCap.position.set(0, axisLen, 0);
  disposables.push(...(nCap.userData.disposables as Array<{ dispose: () => void }>));
  tilted.add(nCap);

  const equator = ring(R * 1.02, faintMat);
  disposables.push(equator.geometry);
  tilted.add(equator);
  group.add(tilted);

  // Orbital (ecliptic) plane — stays horizontal; its offset from the tilted
  // equator IS the obliquity.
  const ecliptic = ring(R * 1.5, eclipticMat);
  disposables.push(ecliptic.geometry);
  group.add(ecliptic);

  // Obliquity arc at the top, from vertical (orbital normal) to the spin axis.
  const arcPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = tilt * (i / 24);
    arcPts.push(new THREE.Vector3(-Math.sin(a) * axisLen, Math.cos(a) * axisLen, 0));
  }
  const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
  disposables.push(arcGeo);
  group.add(new THREE.Line(arcGeo, lineMat));

  return gate(group, 'axial-tilt', disposables);
}

export interface MagNorthOpts {
  planetRadius: number;
  spinTiltDeg: number;
  magneticOffsetDeg?: number;
  color: number;
}

/** Geographic north (spin axis) vs magnetic north (offset by the dipole
 *  tilt) pole markers + the angular gap a compass reads as declination. */
export function buildMagNorth(opts: MagNorthOpts): GeoLayerHandle {
  const R = opts.planetRadius;
  const tilt = opts.spinTiltDeg * DEG;
  const magOff = (opts.magneticOffsetDeg ?? 11) * DEG;
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();
  group.rotation.z = tilt; // align to the tilted globe

  const r = R * 1.08;

  // Geographic north — white cone on the spin axis.
  const geoMarker = coneMarker(R * 0.13, 0xffffff);
  geoMarker.position.set(0, r, 0);
  disposables.push(...(geoMarker.userData.disposables as Array<{ dispose: () => void }>));
  group.add(geoMarker);

  // Magnetic north — blue cone, offset by the dipole tilt about X.
  const magGroup = new THREE.Group();
  magGroup.rotation.x = magOff;
  const magMarker = coneMarker(R * 0.13, opts.color);
  magMarker.position.set(0, r, 0);
  disposables.push(...(magMarker.userData.disposables as Array<{ dispose: () => void }>));
  magGroup.add(magMarker);
  group.add(magGroup);

  // Declination arc between the two poles.
  const arcMat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  disposables.push(arcMat);
  const arcPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = magOff * (i / 20);
    arcPts.push(new THREE.Vector3(0, Math.cos(a) * r, Math.sin(a) * r));
  }
  const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
  disposables.push(arcGeo);
  group.add(new THREE.Line(arcGeo, arcMat));

  return gate(group, 'mag-north', disposables);
}

export interface TidesOpts {
  planetRadius: number;
  color: number;
  /** Direction toward the Moon in scene space (moonGhost sits at +X). */
  moonDir?: [number, number, number];
  /** Scene-space distance to the moon-ghost centre. When supplied, an
   *  arrow is drawn from the sub-lunar bulge to the rendered Moon so the
   *  cause of the bulge is visible (2026-06-28 user direction). */
  moonR?: number;
  /** Visible radius of the moon-ghost sphere — the arrow stops just short. */
  moonGhostRadius?: number;
}

/** Twin tidal bulges: a prolate water envelope stretched along the
 *  Earth–Moon line, with peak rings under the Moon and on the far side. */
export function buildTides(opts: TidesOpts): GeoLayerHandle {
  const R = opts.planetRadius;
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();

  // Prolate spheroid — a sphere just above the surface, stretched 1.18×
  // along the Moon axis (local +X), 0.97× across (the water pulled into
  // the two bulges thins the sides).
  const geo = new THREE.SphereGeometry(R * 1.04, 48, 32);
  geo.scale(1.18, 0.97, 0.97);
  const mat = new THREE.MeshBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(geo, mat);
  group.add(new THREE.Mesh(geo, mat));

  // Peak rings at the sub-lunar (+X) and anti-lunar (−X) bulges.
  const ringMat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  disposables.push(ringMat);
  for (const sx of [1, -1]) {
    const pr = R * 0.5;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push(new THREE.Vector3(sx * R * 1.22, Math.cos(a) * pr, Math.sin(a) * pr));
    }
    const rg = new THREE.BufferGeometry().setFromPoints(pts);
    disposables.push(rg);
    group.add(new THREE.Line(rg, ringMat));
  }

  // Connector arrow from the sub-lunar bulge (+X peak) to the rendered
  // Moon — draws the Earth–Moon line so the bulge's cause is on screen.
  // Built in local +X; the group quaternion below aims it at the Moon.
  if (opts.moonR && opts.moonR > R * 1.4) {
    const startX = R * 1.22;
    const endX = opts.moonR - (opts.moonGhostRadius ?? 2) - 1;
    const len = Math.max(1, endX - startX);
    const head = Math.min(6, len * 0.06);
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(startX, 0, 0),
      len,
      opts.color,
      head,
      head * 0.55,
    );
    const lineMat = arrow.line.material as THREE.LineBasicMaterial;
    lineMat.transparent = true;
    lineMat.opacity = 0.55;
    const coneMat = arrow.cone.material as THREE.MeshBasicMaterial;
    coneMat.transparent = true;
    coneMat.opacity = 0.85;
    group.add(arrow);
    disposables.push({
      dispose: () => {
        arrow.line.geometry.dispose();
        lineMat.dispose();
        arrow.cone.geometry.dispose();
        coneMat.dispose();
      },
    });
  }

  // Orient local +X to the Moon direction.
  const moon = new THREE.Vector3(...(opts.moonDir ?? [1, 0, 0])).normalize();
  group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), moon);

  return gate(group, 'tides', disposables);
}

export interface HydrosphereOpts {
  planetRadius: number;
  color: number;
}

/** The "water world" envelope — Earth wrapped in its oceans (71 % water,
 *  stat in the panel). Was a single near-invisible 0.16 shell that read as
 *  "blue over blue"; now a two-part read (2026-06-28 user direction):
 *  a translucent water-cyan sheen over the surface PLUS an additive
 *  back-side limb glow that concentrates at the planet's edge against
 *  space — so the layer visibly "wraps" the globe like a water skin
 *  instead of blending into the ocean texture. */
export function buildHydrosphere(opts: HydrosphereOpts): GeoLayerHandle {
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();

  // Surface sheen — front-facing, brighter water-cyan so it reads against
  // the daymap ocean instead of matching it.
  const sheenGeo = new THREE.SphereGeometry(opts.planetRadius * 1.013, 48, 32);
  const sheenMat = new THREE.MeshBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.24,
    side: THREE.FrontSide,
    depthWrite: false,
  });
  disposables.push(sheenGeo, sheenMat);
  group.add(new THREE.Mesh(sheenGeo, sheenMat));

  // Limb glow — back-side shell, additive so it builds up at the tangent
  // (the planet's edge), giving a bright water-skin halo that reads as a
  // distinct envelope rather than a flat overlay.
  const rimGeo = new THREE.SphereGeometry(opts.planetRadius * 1.03, 48, 32);
  const rimMat = new THREE.MeshBasicMaterial({
    color: 0x6fd3f0,
    transparent: true,
    opacity: 0.5,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(rimGeo, rimMat);
  group.add(new THREE.Mesh(rimGeo, rimMat));

  return gate(group, 'hydrosphere', disposables);
}
