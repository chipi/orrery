/**
 * Bespoke crewed-capsule models for the Tier-1 Earth-orbit re-entry flights
 * (RFC-034 §13). Each builder returns a hero-PBR `THREE.Group` in a canonical
 * pose — heat-shield DOWN (−Y), recovery/nose UP (+Y) — sized to the same
 * ~1-unit scale as the fleet cruise/lander models so they read consistently in
 * the /dev/models gallery, the colophon, the LEO orbit-coast scene, and the
 * re-entry descent scene.
 *
 * Honest-config, distinct where real: one model per capsule family covers the
 * ~31 missions (all six Mercury flights share the one Mercury capsule, etc.).
 */

import * as THREE from 'three';
import { heroMetal, heroWhite, heroDark } from './hero-materials';

/**
 * Mercury capsule (Freedom 7 … Faith 7). A blunt convex ablative heat shield,
 * a shingled truncated-cone body (René 41 / beryllium), and the cylindrical
 * recovery compartment on top housing the drogue + main parachutes and the
 * destabiliser flap, capped by the antenna canister. ~1.9 m base, ~2.9 m tall.
 */
export function buildMercuryCapsule(): THREE.Group {
  const g = new THREE.Group();

  const shingle = heroMetal(0x6f747b, 0.42); // dark corrugated metal shingles
  const shield = heroDark(0x2a2622); // charred ablative
  const light = heroMetal(0xb9bec6, 0.3);

  // Convex ablative heat shield — a shallow dome at the base (points down).
  const hs = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 12, 0, Math.PI * 2, 0, 0.9), shield);
  hs.rotation.x = Math.PI; // dome bulges downward
  hs.position.y = 0.12;
  hs.scale.y = 0.34; // flatten to a shallow cap
  g.add(hs);

  // Shingled conical body — wide base tapering to the recovery section.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.5, 0.66, 28, 1, true), shingle);
  body.position.y = 0.45;
  g.add(body);

  // Corrugation rings — a few raised bands to read the shingled skin.
  for (const y of [0.28, 0.42, 0.56, 0.68]) {
    const r = 0.5 - (y - 0.12) * 0.47; // follow the taper
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 28), shingle);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }

  // Recovery compartment — cylindrical parachute/antenna housing on top.
  const recovery = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.34, 24), light);
  recovery.position.y = 0.95;
  g.add(recovery);

  // Antenna canister + spike.
  const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.12, 20), heroWhite(0xdedfe2));
  canister.position.y = 1.18;
  g.add(canister);
  const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), light);
  spike.position.y = 1.34;
  g.add(spike);

  // Retropack — three straps crossing the heat shield (jettisoned pre-entry on
  // the real flights, but iconic on the descending capsule).
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.02), heroDark(0x3a3f45));
    strap.position.set(Math.cos(a) * 0.34, 0.12, Math.sin(a) * 0.34);
    strap.lookAt(0, 0.5, 0);
    g.add(strap);
  }

  return g;
}

/**
 * Gemini capsule (Gemini 3 … 12). A two-seat scaled-up Mercury shape: a blunt
 * heat shield, a conical re-entry module, then the cylindrical rendezvous +
 * recovery section with the docking radar nose. ~2.3 m base, two crew.
 */
export function buildGeminiCapsule(): THREE.Group {
  const g = new THREE.Group();
  const skin = heroMetal(0x8f949b, 0.36);
  const shield = heroDark(0x241f1c);
  const white = heroWhite(0xe6e7ea);

  const hs = new THREE.Mesh(new THREE.SphereGeometry(0.52, 28, 12, 0, Math.PI * 2, 0, 0.9), shield);
  hs.rotation.x = Math.PI;
  hs.position.y = 0.12;
  hs.scale.y = 0.3;
  g.add(hs);

  const reentry = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.52, 0.5, 28), skin);
  reentry.position.y = 0.37;
  g.add(reentry);

  // Cylindrical adapter/recovery module (wider than Mercury's).
  const adapter = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.36, 24), white);
  adapter.position.y = 0.8;
  g.add(adapter);
  // Rendezvous radar nose cone.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.24, 24), skin);
  nose.position.y = 1.1;
  g.add(nose);
  return g;
}

/**
 * Vostok / Voskhod descent module — the distinctive SPHERE (Sharik). A 2.3 m
 * ablative sphere with the antenna straps + a small equipment collar; the crew
 * ejected (Vostok) or rode it down under a parachute (Voskhod).
 */
export function buildVostokSphere(): THREE.Group {
  const g = new THREE.Group();
  const skin = heroMetal(0x9aa0a6, 0.4);
  const char = heroDark(0x2b2622);

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), skin);
  sphere.position.y = 0.5;
  g.add(sphere);
  // Charred ablative base cap.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), char);
  cap.position.y = 0.5;
  g.add(cap);
  // Antenna straps over the sphere.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.01, 6, 40, Math.PI), heroDark(0x40454b));
    strap.rotation.y = a;
    strap.rotation.x = Math.PI / 2;
    strap.position.y = 0.5;
    g.add(strap);
  }
  // Equipment collar at the base.
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 20), char);
  collar.position.y = 0.05;
  g.add(collar);
  return g;
}

/**
 * Apollo Command Module (Apollo 7/9, Skylab ferries, ASTP). The classic ~3.9 m
 * blunt cone — a wide ablative heat shield, a steep silvered cone, and the
 * apex forward-hatch tunnel. Larger + steeper than Orion's crew module.
 */
export function buildApolloCM(): THREE.Group {
  const g = new THREE.Group();
  const skin = heroMetal(0xc4c8ce, 0.24); // silvered thermal coat
  const shield = heroDark(0x2a2724);

  const hs = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 12, 0, Math.PI * 2, 0, 0.95), shield);
  hs.rotation.x = Math.PI;
  hs.position.y = 0.14;
  hs.scale.y = 0.28;
  g.add(hs);

  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.6, 0.78, 32), skin);
  cone.position.y = 0.52;
  g.add(cone);
  // Forward tunnel + docking ring.
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 20), heroWhite(0xe0e2e5));
  tunnel.position.y = 0.97;
  g.add(tunnel);
  return g;
}

/**
 * Soyuz descent module (SA) — the "headlamp": a bell/gumdrop with a spherical
 * base heat shield and a truncated conical top ringed by the parachute + soft-
 * landing engine bay. Used for soyuz-1 / soyuz-11 (Tier-1) and every ISS ferry.
 */
export function buildSoyuzDescentModule(): THREE.Group {
  const g = new THREE.Group();
  const skin = heroMetal(0x8a8f96, 0.42);
  const char = heroDark(0x241f1c);
  const green = heroMetal(0x5f6f52, 0.5); // olive thermal blanket cast

  const base = new THREE.Mesh(new THREE.SphereGeometry(0.5, 30, 14, 0, Math.PI * 2, 0, 0.95), char);
  base.rotation.x = Math.PI;
  base.position.y = 0.16;
  base.scale.y = 0.42;
  g.add(base);

  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 0.42, 30), skin);
  bell.position.y = 0.44;
  g.add(bell);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.2, 24), green);
  top.position.y = 0.74;
  g.add(top);
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.1, 20), skin);
  hatch.position.y = 0.88;
  g.add(hatch);
  return g;
}

/**
 * Crew Dragon (Inspiration4, Polaris Dawn). A sleek modern capsule: a smooth
 * conical body with the SuperDraco pods bulging on the sidewall, a white nose
 * cone, and the black PICA-X heat shield.
 */
export function buildDragonCapsule(): THREE.Group {
  const g = new THREE.Group();
  const white = heroWhite(0xeceef0);
  const shield = heroDark(0x1c1c20);

  const hs = new THREE.Mesh(new THREE.SphereGeometry(0.52, 30, 12, 0, Math.PI * 2, 0, 0.95), shield);
  hs.rotation.x = Math.PI;
  hs.position.y = 0.1;
  hs.scale.y = 0.26;
  g.add(hs);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.52, 0.72, 32), white);
  body.position.y = 0.48;
  g.add(body);
  // Four SuperDraco pods bulging around the wall.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.16), heroMetal(0xd0d3d7, 0.3));
    pod.position.set(Math.cos(a) * 0.44, 0.44, Math.sin(a) * 0.44);
    pod.lookAt(0, 0.44, 0);
    g.add(pod);
  }
  // Nose cone (closed in flight).
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.34, 0.34, 32), white);
  nose.position.y = 1.01;
  g.add(nose);
  return g;
}

/**
 * Shenzhou re-entry module — Soyuz-derived bell, slightly larger. Used for the
 * shenzhou-1 uncrewed test (Tier-1) and China's crewed flights.
 */
export function buildShenzhouReentry(): THREE.Group {
  const g = buildSoyuzDescentModule();
  g.scale.setScalar(1.06);
  return g;
}

/** Capsule builders keyed by family id (from the earth-orbit / descent registries). */
const CAPSULE_BUILDERS: Record<string, () => THREE.Group> = {
  mercury: buildMercuryCapsule,
  gemini: buildGeminiCapsule,
  vostok: buildVostokSphere,
  voskhod: buildVostokSphere,
  'apollo-cm': buildApolloCM,
  soyuz: buildSoyuzDescentModule,
  dragon: buildDragonCapsule,
  shenzhou: buildShenzhouReentry,
};

/** Resolve a capsule family id to its builder; falls back to Mercury. */
export function buildCapsuleById(capsuleId: string): THREE.Group {
  return (CAPSULE_BUILDERS[capsuleId] ?? buildMercuryCapsule)();
}
