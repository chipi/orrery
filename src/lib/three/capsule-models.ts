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
 * Eight families, eight distinct hulls — Vostok/Voskhod and Soyuz/Shenzhou are
 * lineage pairs but each gets its own mesh where the real hardware differs.
 */

import * as THREE from 'three';
import { heroMetal, heroWhite, heroDark, heroGold } from './hero-materials';

// ── Shared capsule detail parts (bring the family to the lander polish bar) ──

/** Dark reflective spacecraft glazing for crew/rendezvous windows. */
function glass(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x0a0e16, metalness: 0.9, roughness: 0.12 });
}

/** A small window pane sitting proud of the hull, oriented outward at (angle, y). */
function windowPane(g: THREE.Group, r: number, y: number, angle: number, w = 0.09, h = 0.11): void {
  const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), glass());
  pane.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
  pane.lookAt(pane.position.x * 2, y, pane.position.z * 2);
  g.add(pane);
}

/** A small RCS thruster nozzle nub (dark cone). */
function rcsNub(g: THREE.Group, r: number, y: number, angle: number, mat: THREE.Material): void {
  const n = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.024, 0.05, 8), mat);
  n.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
  n.rotation.z = Math.PI / 2;
  n.lookAt(n.position.x * 2, y, n.position.z * 2);
  g.add(n);
}

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
  const canister = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 0.12, 20),
    heroWhite(0xdedfe2),
  );
  canister.position.y = 1.18;
  g.add(canister);
  const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), light);
  spike.position.y = 1.34;
  g.add(spike);

  // Pilot's trapezoidal window on the cone + two small side portholes.
  windowPane(g, 0.3, 0.55, Math.PI * 0.15, 0.11, 0.09);
  windowPane(g, 0.36, 0.5, Math.PI * 0.15 - 1.0, 0.045, 0.045);
  windowPane(g, 0.36, 0.5, Math.PI * 0.15 + 1.0, 0.045, 0.045);

  // Retropack — the three broad titanium straps + the retro package clamped to
  // the heat shield (jettisoned pre-entry, iconic on the descending capsule).
  const strapMat = heroMetal(0x9a5a3a, 0.5); // titanium-strap bronze
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.03), strapMat);
    strap.position.set(Math.cos(a) * 0.33, 0.12, Math.sin(a) * 0.33);
    strap.lookAt(0, 0.55, 0);
    g.add(strap);
  }
  const retroPack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16),
    heroDark(0x33383f),
  );
  retroPack.position.y = -0.02;
  g.add(retroPack);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.05, 0.09, 12),
      heroDark(0x1e2126),
    );
    nozzle.position.set(Math.cos(a) * 0.08, -0.09, Math.sin(a) * 0.08);
    g.add(nozzle);
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
  // Rendezvous radar nose cone + dish.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.24, 24), skin);
  nose.position.y = 1.1;
  g.add(nose);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    heroWhite(0xdedfe2),
  );
  dish.position.y = 1.24;
  g.add(dish);

  // Two side-by-side crew windows on the re-entry cone (Gemini's signature).
  windowPane(g, 0.36, 0.55, Math.PI * 0.5 - 0.14, 0.08, 0.09);
  windowPane(g, 0.36, 0.55, Math.PI * 0.5 + 0.14, 0.08, 0.09);

  // Six RCS thruster nubs ringing the adapter.
  const rcsMat = heroDark(0x1e2126);
  for (let i = 0; i < 6; i++) rcsNub(g, 0.25, 0.86, (i / 6) * Math.PI * 2, rcsMat);
  return g;
}

/**
 * Vostok descent module — the distinctive SPHERE (Sharik). A 2.3 m ablative
 * sphere with the antenna straps + a small equipment collar; the cosmonaut
 * EJECTED at ~7 km and parachuted separately, so the bare sphere has no
 * touchdown motor (that is the external tell vs Voskhod).
 */
export function buildVostokSphere(): THREE.Group {
  const g = new THREE.Group();
  const skin = heroMetal(0x9aa0a6, 0.4);
  const char = heroDark(0x2b2622);

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), skin);
  sphere.position.y = 0.5;
  g.add(sphere);
  // Charred ablative base cap.
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38),
    char,
  );
  cap.position.y = 0.5;
  g.add(cap);
  // Antenna straps over the sphere.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.01, 6, 40, Math.PI),
      heroDark(0x40454b),
    );
    strap.rotation.y = a;
    strap.rotation.x = Math.PI / 2;
    strap.position.y = 0.5;
    g.add(strap);
  }
  // Equipment collar at the base.
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 20), char);
  collar.position.y = 0.05;
  g.add(collar);

  // Three portholes around the equator (rimmed) + the circular entry hatch.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.014, 8, 16),
      heroMetal(0xb9bec6, 0.3),
    );
    rim.position.set(Math.cos(a) * 0.49, 0.55, Math.sin(a) * 0.49);
    rim.lookAt(rim.position.x * 2, 0.55, rim.position.z * 2);
    g.add(rim);
    const pane = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), glass());
    pane.position.copy(rim.position);
    pane.lookAt(rim.position.x * 2, 0.55, rim.position.z * 2);
    g.add(pane);
  }
  const hatch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20),
    heroMetal(0x8a8f96, 0.45),
  );
  hatch.position.set(0, 0.72, 0.46);
  hatch.rotation.x = Math.PI / 2;
  g.add(hatch);
  // A couple of sensor/antenna nubs so the sphere isn't bare.
  for (const a of [Math.PI * 0.35, Math.PI * 1.4]) {
    const nub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6),
      heroMetal(0xb9bec6, 0.3),
    );
    nub.position.set(Math.cos(a) * 0.5, 0.78, Math.sin(a) * 0.5);
    nub.lookAt(nub.position.x * 2, 1.1, nub.position.z * 2);
    g.add(nub);
  }
  return g;
}

/**
 * Voskhod descent module — the same Sharik sphere as Vostok, but the crew rode
 * it to the ground, so it gains the defining external tell: the solid-propellant
 * SOFT-LANDING retro package slung on a short truss above the sphere (fires just
 * above touchdown to cushion the landing). Two side portholes instead of three.
 */
export function buildVoskhodSphere(): THREE.Group {
  const g = new THREE.Group();
  const skin = heroMetal(0x9aa0a6, 0.4);
  const char = heroDark(0x2b2622);
  const steel = heroMetal(0xb9bec6, 0.3);

  // Sharik sphere — the shared descent-module shell.
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), skin);
  sphere.position.y = 0.5;
  g.add(sphere);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38),
    char,
  );
  cap.position.y = 0.5;
  g.add(cap);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.01, 6, 40, Math.PI),
      heroDark(0x40454b),
    );
    strap.rotation.y = a;
    strap.rotation.x = Math.PI / 2;
    strap.position.y = 0.5;
    g.add(strap);
  }
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 20), char);
  collar.position.y = 0.05;
  g.add(collar);

  // Two side portholes (Voskhod flew the Vzor sight + fewer viewports).
  for (const a of [Math.PI * 0.22, Math.PI * 0.78]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 16), steel);
    rim.position.set(Math.cos(a) * 0.49, 0.55, Math.sin(a) * 0.49);
    rim.lookAt(rim.position.x * 2, 0.55, rim.position.z * 2);
    g.add(rim);
    const pane = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), glass());
    pane.position.copy(rim.position);
    pane.lookAt(rim.position.x * 2, 0.55, rim.position.z * 2);
    g.add(pane);
  }
  const hatch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20),
    heroMetal(0x8a8f96, 0.45),
  );
  hatch.position.set(0, 0.72, 0.46);
  hatch.rotation.x = Math.PI / 2;
  g.add(hatch);

  // Soft-landing solid-retro package on a 3-strut truss above the sphere.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 24), steel);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.14;
  g.add(ring);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), steel);
    strut.position.set(Math.cos(a) * 0.13, 1.04, Math.sin(a) * 0.13);
    strut.rotation.z = Math.cos(a) * 0.16;
    strut.rotation.x = -Math.sin(a) * 0.16;
    g.add(strut);
  }
  const retro = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.17, 0.16, 20),
    heroDark(0x33383f),
  );
  retro.position.y = 1.24;
  g.add(retro);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const noz = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.035, 0.06, 8),
      heroDark(0x1a1c20),
    );
    noz.position.set(Math.cos(a) * 0.08, 1.14, Math.sin(a) * 0.08);
    g.add(noz);
  }
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
  // Forward tunnel + docking ring + probe.
  const tunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.15, 0.12, 20),
    heroWhite(0xe0e2e5),
  );
  tunnel.position.y = 0.97;
  g.add(tunnel);
  const probe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.035, 0.12, 10),
    heroMetal(0xb9bec6, 0.3),
  );
  probe.position.y = 1.09;
  g.add(probe);

  // Crew + rendezvous windows (Apollo had five; three read at this scale).
  windowPane(g, 0.42, 0.62, Math.PI * 0.5, 0.1, 0.1);
  windowPane(g, 0.4, 0.66, Math.PI * 0.5 - 0.5, 0.08, 0.08);
  windowPane(g, 0.4, 0.66, Math.PI * 0.5 + 0.5, 0.08, 0.08);
  // Side hatch.
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.02), heroMetal(0xb0b4ba, 0.3));
  hatch.position.set(Math.cos(Math.PI) * 0.42, 0.5, Math.sin(Math.PI) * 0.42);
  hatch.lookAt(hatch.position.x * 2, 0.5, hatch.position.z * 2);
  g.add(hatch);
  // Four RCS thruster quads around the cone.
  const rcsMat = heroDark(0x1e2126);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    rcsNub(g, 0.34, 0.7, a - 0.06, rcsMat);
    rcsNub(g, 0.34, 0.7, a + 0.06, rcsMat);
  }
  // EVA handrails — two thin bars following the cone slope (Apollo's sea-of-
  // storms umbilical/handrail detail), reads as fine surface hardware.
  const rail = heroMetal(0xb9bec6, 0.3);
  for (const a of [Math.PI * 0.28, Math.PI * 0.72]) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 6), rail);
    bar.position.set(Math.cos(a) * 0.38, 0.56, Math.sin(a) * 0.38);
    bar.rotation.z = Math.cos(a) * 0.32;
    bar.rotation.x = -Math.sin(a) * 0.32;
    g.add(bar);
  }
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

  // Periscope (the Soyuz VSK optical sight) + a crew window on the bell.
  const periscope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.12, 10),
    heroDark(0x2a2f36),
  );
  periscope.position.set(0.14, 0.62, 0.14);
  g.add(periscope);
  windowPane(g, 0.42, 0.5, Math.PI * 0.5, 0.08, 0.08);
  // Gold thermal-blanket band around the base of the bell.
  const foil = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.1, 30), heroGold(0xc7a04e));
  foil.position.y = 0.28;
  g.add(foil);
  // Six soft-landing thruster ports on the base shield (fire just before touchdown).
  const thrMat = heroDark(0x1a1c20);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.05, 8), thrMat);
    t.position.set(Math.cos(a) * 0.22, 0.02, Math.sin(a) * 0.22);
    g.add(t);
  }
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

  const hs = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 30, 12, 0, Math.PI * 2, 0, 0.95),
    shield,
  );
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
  // Nose cone (closed in flight) + the hinge seam ring.
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.34, 0.34, 32), white);
  nose.position.y = 1.01;
  g.add(nose);
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.008, 6, 32),
    heroMetal(0x9a9ea4, 0.3),
  );
  seam.rotation.x = Math.PI / 2;
  seam.position.y = 0.84;
  g.add(seam);

  // Cupola windows (Crew Dragon's panoramic glazing) around the upper body.
  for (let i = 0; i < 4; i++)
    windowPane(g, 0.4, 0.66, (i / 4) * Math.PI * 2 + Math.PI / 8, 0.11, 0.1);
  // Draco RCS nubs between the SuperDraco pods.
  const rcsMat = heroDark(0x1c1c20);
  for (let i = 0; i < 4; i++) rcsNub(g, 0.46, 0.24, (i / 4) * Math.PI * 2 + Math.PI / 4, rcsMat);
  return g;
}

/**
 * Shenzhou re-entry module — Soyuz-lineage bell but its own hull: broader base,
 * more rounded profile, a lighter silver-white livery with a grey equipment band
 * (no olive cast), and its own window pair. Used for shenzhou-1 (Tier-1) and
 * China's crewed flights.
 */
export function buildShenzhouReentry(): THREE.Group {
  const g = new THREE.Group();
  const skin = heroMetal(0xbfc4cb, 0.32); // lighter silver than Soyuz
  const char = heroDark(0x26221f);
  const band = heroMetal(0x7d848c, 0.42); // grey equipment band
  const steel = heroMetal(0xb9bec6, 0.3);

  // Base heat shield — broader sphere-cap than Soyuz.
  const base = new THREE.Mesh(
    new THREE.SphereGeometry(0.54, 30, 14, 0, Math.PI * 2, 0, 0.95),
    char,
  );
  base.rotation.x = Math.PI;
  base.position.y = 0.16;
  base.scale.y = 0.44;
  g.add(base);

  // Bell body — wider + more rounded than the Soyuz SA.
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.54, 0.48, 32), skin);
  bell.position.y = 0.46;
  g.add(bell);
  // Grey equipment band near the shoulder.
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.08, 32), band);
  ring.position.y = 0.72;
  g.add(ring);
  // Top hatch tunnel (sits below the orbital module on the full stack).
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.16, 26), skin);
  top.position.y = 0.84;
  g.add(top);
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.08, 20), steel);
  hatch.position.y = 0.96;
  g.add(hatch);

  // Two crew windows on the bell shoulder.
  windowPane(g, 0.42, 0.52, Math.PI * 0.5 - 0.18, 0.08, 0.09);
  windowPane(g, 0.42, 0.52, Math.PI * 0.5 + 0.18, 0.08, 0.09);
  // Gold thermal band wrapping the base of the bell.
  const foil = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 0.1, 32), heroGold(0xc7a04e));
  foil.position.y = 0.3;
  g.add(foil);
  // RCS ports ringing the upper bell.
  const rcsMat = heroDark(0x1a1c20);
  for (let i = 0; i < 6; i++) rcsNub(g, 0.34, 0.6, (i / 6) * Math.PI * 2, rcsMat);
  return g;
}

/** Capsule builders keyed by family id (from the earth-orbit / descent registries). */
const CAPSULE_BUILDERS: Record<string, () => THREE.Group> = {
  mercury: buildMercuryCapsule,
  gemini: buildGeminiCapsule,
  vostok: buildVostokSphere,
  voskhod: buildVoskhodSphere,
  'apollo-cm': buildApolloCM,
  soyuz: buildSoyuzDescentModule,
  dragon: buildDragonCapsule,
  shenzhou: buildShenzhouReentry,
};

/** Resolve a capsule family id to its builder; falls back to Mercury. */
export function buildCapsuleById(capsuleId: string): THREE.Group {
  return (CAPSULE_BUILDERS[capsuleId] ?? buildMercuryCapsule)();
}

/** The capsule family ids that resolve to a dedicated builder (join-test guard). */
export const CAPSULE_FAMILY_IDS = Object.keys(CAPSULE_BUILDERS);
