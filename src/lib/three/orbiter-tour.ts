/**
 * Saturn-anchored orbiter tour render group (#306 Slice D).
 *
 * Cassini orbited Saturn 294 times over 13 years (2004-2017). To
 * visualise that story on /explore without a frame switch we attach
 * a tour group to Saturn's local frame the same way satellites do:
 * the group rides Saturn's heliocentric position, and its contents
 * render at Saturn-system scene units so the orbits resolve when the
 * camera zooms into Saturn — invisible at wide solar-system view,
 * full-detail at planet zoom.
 *
 * Each orbit is a closed elliptical line at (semi_major_units,
 * eccentricity, incl_deg, raan_deg). Flybys are bright dot markers
 * positioned at a sampled phase angle on the appropriate inclined
 * plane. Grand Finale is highlighted via a higher-opacity orbit.
 */

import * as THREE from 'three';

export interface OrbitSpec {
  id: string;
  label: string;
  phase?: string;
  semi_major_units: number;
  eccentricity: number;
  incl_deg: number;
  raan_deg: number;
  opacity?: number;
  highlight?: boolean;
}

export interface FlybySpec {
  id: string;
  body: string;
  label: string;
  distance_units: number;
  angle_deg: number;
  incl_deg: number;
  color: string;
  marker?: 'sphere' | 'diamond';
}

export interface OrbiterTourData {
  id: string;
  name: string;
  mission_id: string;
  parent_planet: string;
  color: string;
  orbits: OrbitSpec[];
  flybys?: FlybySpec[];
}

export interface OrbiterTourHandle {
  group: THREE.Group;
  setVisible: (v: boolean) => void;
  dispose: () => void;
  /** Click target on the tour banner (atmospheric-entry marker by default). */
  clickTarget: THREE.Object3D;
}

/**
 * Sample a closed Keplerian ellipse in the orbital plane defined by
 * inclination + right ascension of the ascending node. The orbit is
 * rendered as a LineLoop with `segments` points. Returns the line +
 * a function that picks a 3D position at a given true-anomaly angle
 * (for placing flyby markers on the ring).
 */
function buildEllipseLine(
  semiMajor: number,
  eccentricity: number,
  inclRad: number,
  raanRad: number,
  color: number,
  opacity: number,
  segments = 192,
): { line: THREE.LineLoop; sample: (trueAnomalyDeg: number) => THREE.Vector3 } {
  // Position in the orbital plane: r = a(1-e²) / (1 + e cos ν)
  // Parametrise by true anomaly ν, then rotate by inclination (around
  // ascending-node line) and RAAN (around z) to place in the planet
  // frame. Saturn frame uses +z as Saturn's rotation axis approximate.
  const pts: THREE.Vector3[] = [];
  const cosI = Math.cos(inclRad);
  const sinI = Math.sin(inclRad);
  const cosRa = Math.cos(raanRad);
  const sinRa = Math.sin(raanRad);
  const sample = (trueAnomalyDeg: number): THREE.Vector3 => {
    const nu = (trueAnomalyDeg * Math.PI) / 180;
    const r = (semiMajor * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(nu));
    // Plane coords (perifocal): x = r cos ν, y = r sin ν, z = 0
    const xp = r * Math.cos(nu);
    const yp = r * Math.sin(nu);
    // Rotate by inclination around the x-axis (line of nodes)
    const xi = xp;
    const yi = yp * cosI;
    const zi = yp * sinI;
    // Rotate by RAAN around the z-axis
    return new THREE.Vector3(xi * cosRa - yi * sinRa, xi * sinRa + yi * cosRa, zi);
  };
  for (let i = 0; i <= segments; i++) {
    pts.push(sample((i / segments) * 360));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const line = new THREE.LineLoop(geo, mat);
  return { line, sample };
}

export function buildOrbiterTour(opts: {
  data: OrbiterTourData;
  visible: boolean;
}): OrbiterTourHandle {
  const { data, visible } = opts;
  const group = new THREE.Group();
  group.visible = visible;
  // Anchor at Saturn's local frame. Caller adds this group to the
  // planet's THREE.Group, inheriting its world transform.
  group.userData = { kind: 'orbiter-tour', missionId: data.mission_id };

  const baseColor = new THREE.Color(data.color);
  const orbitSamples = new Map<string, (deg: number) => THREE.Vector3>();
  const disposables: { dispose: () => void }[] = [];

  for (const orbit of data.orbits) {
    const inclRad = (orbit.incl_deg * Math.PI) / 180;
    const raanRad = (orbit.raan_deg * Math.PI) / 180;
    const opacity = orbit.opacity ?? 0.5;
    const colorHex = orbit.highlight ? 0xff7b72 : baseColor.getHex();
    const { line, sample } = buildEllipseLine(
      orbit.semi_major_units,
      orbit.eccentricity,
      inclRad,
      raanRad,
      colorHex,
      opacity,
    );
    line.userData = { kind: 'orbiter-tour-orbit', orbitId: orbit.id, missionId: data.mission_id };
    group.add(line);
    disposables.push(line.geometry, line.material as THREE.Material);
    orbitSamples.set(orbit.id, sample);
  }

  // Default click target is the atmospheric-entry marker (the
  // dramatic end-of-mission point). Falls back to the first flyby if
  // none is tagged as the entry, and ultimately to the group root.
  let entryTarget: THREE.Object3D | null = null;
  if (data.flybys) {
    for (const flyby of data.flybys) {
      const inclRad = (flyby.incl_deg * Math.PI) / 180;
      const cosI = Math.cos(inclRad);
      const sinI = Math.sin(inclRad);
      const angleRad = (flyby.angle_deg * Math.PI) / 180;
      const x = flyby.distance_units * Math.cos(angleRad);
      const y = flyby.distance_units * Math.sin(angleRad) * cosI;
      const z = flyby.distance_units * Math.sin(angleRad) * sinI;
      const isDiamond = flyby.marker === 'diamond';
      const geo = isDiamond
        ? new THREE.OctahedronGeometry(0.6, 0)
        : new THREE.SphereGeometry(0.35, 12, 12);
      const mat = new THREE.MeshBasicMaterial({ color: flyby.color, depthWrite: false });
      const marker = new THREE.Mesh(geo, mat);
      marker.position.set(x, y, z);
      marker.userData = {
        kind: 'orbiter-tour-flyby',
        flybyId: flyby.id,
        missionId: data.mission_id,
        label: flyby.label,
      };
      group.add(marker);
      disposables.push(geo, mat);
      if (flyby.id === 'atmospheric-entry') {
        entryTarget = marker;
      }
    }
  }
  const clickTarget = entryTarget ?? group.children[group.children.length - 1] ?? group;

  return {
    group,
    clickTarget,
    setVisible: (v: boolean) => {
      group.visible = v;
    },
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
