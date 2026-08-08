import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { PLANETS, type PlanetVisual, type SatelliteDef } from '$lib/explore-scene';
import { buildDirectionLabelSprite } from '$lib/three/iconic-trajectory';
import { onLayerChange } from '$lib/science-layers';
import { buildLocalGroupLayer } from '$lib/galaxies-layer';
import { gravityAccel, BODY_MASS_KG, buildArrowTipLabel } from '$lib/orbit-overlays';
import exploreOrbitersData from '$data/explore-orbiters.json';

type LodState = {
  currentLevel: '2k' | '4k';
  tex2k: THREE.Texture;
  tex4k: THREE.Texture | null;
  loadStarted: boolean;
};

/**
 * `/explore` solar-system scene layer (RFC-036 WS-C/C2a) — the inline solar-system
 * 3D assembly lifted VERBATIM out of the explore/+page.svelte onMount: the asteroid +
 * Kuiper belts, every planet's group/mesh/rings/satellites/orbiters/science overlays,
 * the small bodies, the science-layer subscriptions (gravity/velocity/…/galaxies), the
 * selection ring, and the per-frame LOD/satellite updaters. Construction + subscriptions
 * only — it writes NO component $state; live page reads (view / layers / simSpeed /
 * simPaused / reducedMotion / selectedSatelliteKey) thread in as getter closures on
 * `deps`, and the page-shared helpers/consts (loadTexture / textureLoader / SMALL_BODIES
 * / sampleOrbitPoints / the LOD ratios) pass by reference. Every ref the frame + input
 * still touch returns on the handle. Byte-identical to the inline code.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function createExploreSolarScene(deps: any) {
  const {
    scene,
    camera,
    base,
    loadTexture,
    textureLoader,
    tex4kAllowed,
    PLANET_LOD_IN_RATIO,
    PLANET_LOD_OUT_RATIO,
    sampleOrbitPoints,
    SMALL_BODIES,
    DAYS_PER_YEAR,
  } = deps;
  // Belt geometry helper — fills a Float32 position buffer with `count`
  // particles uniformly distributed across an annulus between `inner`
  // and `outer` scene radii with a small vertical jitter `slab`.
  // Reused for the asteroid belt + Kuiper Belt so both share the same
  // sampling shape (different radii + colors + densities).
  const sampleBelt = (count: number, inner: number, outer: number, slab: number) => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = inner + Math.random() * (outer - inner);
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * slab;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  };

  // Asteroid Belt — 2.2–3.2 AU compressed to scene 195–237 (between
  // Mars at 155 and Jupiter at 248). Warm sandy palette.
  const asteroidBeltGeo = new THREE.BufferGeometry();
  asteroidBeltGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(sampleBelt(1800, 195, 237, 8), 3),
  );
  const asteroidBelt = new THREE.Points(
    asteroidBeltGeo,
    new THREE.PointsMaterial({
      color: 0xb8a470,
      size: 1.0,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
    }),
  );
  scene.add(asteroidBelt);

  // Kuiper Belt — real bounds 30–50 AU. In the compressed outer-system
  // scale (Neptune at 430, Pluto at 580) we map that to scene 460–620,
  // a wider, cooler band beyond Neptune (2026-06-06 user direction:
  // "is there another comet belt further out? I think there is").
  // Cooler bluish palette to read as icy rather than rocky; sparser
  // density (smaller particle count over a much larger area).
  const kuiperBeltGeo = new THREE.BufferGeometry();
  kuiperBeltGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(sampleBelt(2200, 460, 620, 14), 3),
  );
  const kuiperBelt = new THREE.Points(
    kuiperBeltGeo,
    new THREE.PointsMaterial({
      color: 0x9fc6e3,
      size: 1.1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.4,
    }),
  );
  scene.add(kuiperBelt);

  // Invisible pick-aid rings — wide flat tori the raycaster can hit
  // for the otherwise-unhittable particle clouds. visible:true with
  // opacity:0 keeps them in the raycaster path but invisible to the
  // user (same trick as the planet pickAids elsewhere). Tilted to
  // the ecliptic so they stay coplanar with the particles.
  const buildBeltPickAid = (id: string, inner: number, outer: number) => {
    // TorusGeometry expects (radius, tube, radialSegments, tubularSegments).
    // Use a flat disk-like torus: radius = mid, tube = (outer-inner)/2,
    // tubularSegments high so the ring is smooth at heliocentric framing.
    const radius = (inner + outer) / 2;
    const tube = (outer - inner) / 2;
    const geo = new THREE.TorusGeometry(radius, tube, 2, 96);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2; // align to ecliptic plane
    mesh.userData = { beltId: id };
    return mesh;
  };
  const asteroidBeltPick = buildBeltPickAid('asteroid', 195, 237);
  const kuiperBeltPick = buildBeltPickAid('kuiper', 460, 620);
  scene.add(asteroidBeltPick);
  scene.add(kuiperBeltPick);

  // Planet orbit rings — refs kept so the LAYERS panel can toggle
  // the entire planets layer (rings + bodies) in lockstep.
  const planetOrbitLines: THREE.LineLoop[] = [];
  PLANETS.forEach((p) => {
    const inc = (p.inc * Math.PI) / 180;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      const x = Math.cos(a) * p.orbitR;
      const zf = Math.sin(a) * p.orbitR;
      pts.push(new THREE.Vector3(x, zf * Math.sin(inc), zf * Math.cos(inc)));
    }
    // 2026-06-03 user direction: "Make planet orbits look more
    // like moon orbits (more visible)." Bumped opacity 0.06 → 0.25
    // and tinted the line pale-blue to match the moon-orbit style.
    const mat = new THREE.LineBasicMaterial({
      color: 0xc0d0ff,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
    planetOrbitLines.push(line);
    scene.add(line);
  });

  type SatelliteObj = {
    def: SatelliteDef;
    mesh: THREE.Mesh;
    /** Dashed orbit ring — gated on close zoom via PLANET_LOD_IN_RATIO
     *  in the per-frame loop so the rings only reveal alongside the
     *  spin axis + atmospheric halo. */
    orbitLine: THREE.LineLoop;
    /** Per-frame angular phase (radians) — incremented from simT
     *  scaled by 1 / periodDays. */
    angle: number;
    /** Cached inclination radians so the per-frame loop avoids the
     *  per-call deg→rad multiply. */
    inclRad: number;
  };
  type PlanetObj = {
    group: THREE.Group;
    mesh: THREE.Mesh;
    pickAid: THREE.Mesh;
    planet: PlanetVisual;
    material: THREE.MeshStandardMaterial;
    lod?: LodState;
    /** Optional natural-satellite layer. Each satellite is a child
     *  of this PlanetObj's `group` so it inherits the parent's
     *  orbital motion; per-frame code positions it relative to the
     *  parent and gates visibility on camera→parent distance. */
    satellites: SatelliteObj[];
    /** Group holding all satellites — hidden until the camera
     *  zooms close. Single visibility flip per planet per frame. */
    satellitesGroup: THREE.Group;
    /** Optional atmospheric halo shell — same reveal gating as
     *  the satellite layer. null when the planet's halo field is
     *  absent (Mercury / Mars / Uranus / Neptune). */
    haloMesh: THREE.Mesh | null;
    haloMaterial: THREE.MeshBasicMaterial | null;
    /** PRD-023 Slice A — spin-axis indicator. Thin line through
     *  the planet at its real obliquity. Universal across planets
     *  (every body has a tilt); revealed at close zoom only. */
    spinAxis: THREE.Line;
    /** PRD-023 Slice A.3 — active orbiters as 3D glyphs (MRO, Juno,
     *  Akatsuki, etc). Per-orbiter angular phase + cached
     *  inclination radians for the per-frame motion update. */
    orbiters: OrbiterObj[];
    /** Group holding all orbiter glyphs; flipped visible at close
     *  zoom alongside moons + halo + spin axis. */
    orbitersGroup: THREE.Group;
    /** PRD-023 Slice B — Hill-sphere wireframe (gravity dominance
     *  boundary). Sized 6× planet radius — stylised, not real-scale
     *  (real Hill spheres can exceed the planet's orbit). Lens-
     *  gated by 'hill-sphere' layer. */
    hillSphere: THREE.LineSegments;
    /** PRD-023 Slice B — L1 + L2 markers along the planet-Sun line.
     *  L3 / L4 / L5 are off-frame at planet-focus zoom; skipped. */
    lagrangeL1: THREE.Mesh;
    lagrangeL2: THREE.Mesh;
    lagrangeL1Label: THREE.Sprite;
    lagrangeL2Label: THREE.Sprite;
    /** PRD-023 Slice D — stylised magnetosphere shell. Only planets
     *  with substantial magnetic fields get one (Earth + the gas
     *  giants); rocky bodies sans dynamo skip. Null when absent. */
    magnetosphere: THREE.Mesh | null;
    /** PRD-023 Slice D — sub-solar point marker. Small bright sprite
     *  at the planet's surface noon longitude. Universal. */
    subSolar: THREE.Mesh;
    /** PRD-023 Slice E.3a — N + S badges at the ends of the spin
     *  axis line + a curved arrow on the equator showing rotation
     *  direction. Always-on with the spin axis. */
    northBadge: THREE.Sprite;
    southBadge: THREE.Sprite;
    rotationArrow: THREE.Line;
    /** PRD-023 Slice E.3b — magnetic dipole axis (cyan line). Null
     *  when the planet has no intrinsic dipole (Venus, Mars, Pluto).
     *  Gated by the magnetosphere lens layer. */
    magneticAxis: THREE.Line | null;
  };
  type OrbiterObj = {
    group: THREE.Group;
    fleetId: string | null;
    orbitU: number;
    phase: number;
    inclRad: number;
    nodeRad: number;
    periodFrac: number;
  };
  const planetObjs: PlanetObj[] = PLANETS.map((p) => {
    const group = new THREE.Group();
    const tex2k = loadTexture(p.texture);
    // PRD-023 Slice A — optional emissive (night-side) texture for
    // Earth's city lights. MeshStandardMaterial adds emission on
    // top of the lighting calculation; emission isn't multiplied
    // by light direction, so on the day side the bright day texture
    // overwhelms the city lights, and on the night side the lit-up
    // cities glow against the dark surface. emissiveIntensity is
    // bumped from the default 0.06 (faint planet-tint glow) to 1.0
    // when an emissiveMap is supplied so the cities read.
    //
    // 2026-06-15 — migrated MeshPhongMaterial → MeshStandardMaterial
    // (three.js PBR default). No envMap (nothing in the scene is
    // reflective enough to justify the PMREMGenerator cost).
    // roughness 1.0 + metalness 0 ≈ pure Lambertian: kills the broad
    // white specular hotspot the prior shininess: 25 + specular:
    // 0x222222 setup produced on gas-giant cloud-tops and rocky
    // surfaces. Per-planet tuning (e.g. an ocean roughness map for
    // Earth glint) can layer on top of this base without changing
    // the material type.
    const emissiveMapTex = p.emissiveMap ? loadTexture(p.emissiveMap) : undefined;
    const mat = new THREE.MeshStandardMaterial({
      map: tex2k,
      // 0xb0b0b0 (~69% gray) — multiplies the texture's albedo
      // before lighting. Real-world Bond-albedo values (Saturn ~0.34,
      // Jupiter ~0.34, Earth ~0.30, Mars ~0.25) sit well below 1.0,
      // but our public-domain equirectangular textures are baked at
      // ~0.8–0.95 brightness so the Sun-side image is recognisable
      // on unlit reference renders. Scaling color down here brings
      // the effective albedo into a range where the diffuse term
      // (color × NdotL) doesn't clip to white at sub-solar even on
      // bright bodies (Saturn cream cloud-tops, Jupiter bright belts).
      color: 0xb0b0b0,
      emissive: p.emissiveMap ? 0xffffff : p.color3,
      emissiveMap: emissiveMapTex,
      // emissive floor 0.10 (was 0.06) — gives each planet a faint
      // self-illumination tint of its own characteristic color (red
      // for Mars, blue-grey for Neptune, etc.) so heliocentric-zoom
      // views read as "colourful solar system" rather than "black
      // dots arranged around a Sun." Still tiny relative to the
      // diffuse term on the day side, so it doesn't lift the night
      // side enough to wash out the single-Sun direction cue.
      emissiveIntensity: p.emissiveMap ? 1.0 : 0.1,
      roughness: 1.0,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size3, 32, 32), mat);
    mesh.userData = { planetId: p.id };
    // PRD-023 Slice A — Saturn's planet mesh receives the ring-cast
    // shadow. Limited to Saturn because no other planet has a ring
    // system in the catalogue today, and `receiveShadow` adds a per-
    // pixel shadow-map sample that we don't need elsewhere.
    if (p.id === 'saturn') mesh.receiveShadow = true;
    group.add(mesh);
    // Pick-aid: invisible larger sphere co-located with the visible
    // mesh so hover-pick is forgiving on small / fast-moving planets.
    // Mercury's visible size3 is 2.8 units — without the aid users
    // have to land the cursor in a sub-degree window; with a 2.5×
    // pick radius the target is much more reachable. Material is
    // transparent + opacity 0 so it doesn't render but the raycaster
    // still hits it (visible:true is the magic — opacity 0 with
    // visible:true keeps geometry pickable while invisible).
    const pickAid = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(p.size3 * 2.5, 6), 16, 16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    pickAid.userData = { planetId: p.id, isPickAid: true };
    group.add(pickAid);
    if (p.hasRings) {
      // Saturn's ring system rendered as concentric bands rather than
      // a single flat disk (2026-06-06 user direction: "Saturn rings
      // are rendered in explore as flat disk, let's try to bring some
      // texture/color and make them more realistic"). Mapped to the
      // canonical C / B / A ring + Cassini Division boundaries
      // (Cassini ratio ~2.025–2.07 in Saturn radii). Inner/outer radii
      // scaled to the existing 1.4–2.6 size3 envelope so the visual
      // footprint is unchanged.
      const r0 = p.size3 * 1.4;
      const rOuter = p.size3 * 2.6;
      const span = rOuter - r0;
      const ringsGroup = new THREE.Group();
      const ringBands: Array<{
        inner: number;
        outer: number;
        color: number;
        opacity: number;
      }> = [
        // C ring — inner, dusky, semi-transparent.
        { inner: 0.0, outer: 0.18, color: 0x8a7858, opacity: 0.35 },
        // B ring — densest + brightest band.
        { inner: 0.18, outer: 0.55, color: 0xf1d7a3, opacity: 0.62 },
        // Cassini Division — sharp dark gap visible from Earth.
        { inner: 0.55, outer: 0.6, color: 0x4a3f2c, opacity: 0.18 },
        // A ring — slightly cooler tone than B.
        { inner: 0.6, outer: 0.92, color: 0xddc497, opacity: 0.5 },
        // Encke Gap — narrow dark sliver near A-ring outer.
        { inner: 0.92, outer: 0.94, color: 0x4a3f2c, opacity: 0.15 },
        // F ring outer halo — diffuse.
        { inner: 0.94, outer: 1.0, color: 0xe4d191, opacity: 0.28 },
      ];
      for (const b of ringBands) {
        const rg = new THREE.RingGeometry(r0 + b.inner * span, r0 + b.outer * span, 96);
        const rm = new THREE.MeshBasicMaterial({
          color: b.color,
          transparent: true,
          opacity: b.opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ringMesh = new THREE.Mesh(rg, rm);
        // PRD-023 Slice A — ring bands cast the shadow that lands on
        // Saturn's cloud tops. The Cassini Division + Encke Gap bands
        // also cast, but their low opacity means the shadow they
        // produce reads as a faint break in the main ring shadow —
        // matches the real photographic look.
        ringMesh.castShadow = true;
        ringsGroup.add(ringMesh);
      }
      ringsGroup.rotation.x = Math.PI / 2.2;
      group.add(ringsGroup);
    }
    // Satellites — built up-front (no lazy load) since their
    // textures share the same lazy 4K LOD philosophy as the parent
    // planet: only loaded once but only revealed when the camera
    // 2026-06-03: visible at construction (was hidden default) per
    // user direction — moons should appear at heliocentric framing
    // as well, not only after fly-to. Their small size (Moon at 0.9
    // vs Earth at 5.2) keeps the wide-zoom view uncluttered.
    const satellitesGroup = new THREE.Group();
    satellitesGroup.visible = true;
    const satellites: SatelliteObj[] = (p.satellites ?? []).map((s) => {
      // Texture optional: bodies without a sourced equirectangular
      // map (e.g. Uranus + Neptune moons today) fall back to a flat
      // colour. #304 Slice 3 — texture sourcing tracked separately.
      const satMat = s.texture
        ? new THREE.MeshStandardMaterial({
            map: loadTexture(s.texture),
            color: 0xffffff,
            roughness: 1.0,
            metalness: 0,
          })
        : new THREE.MeshStandardMaterial({
            color: s.fallbackColor ?? 0xc8c8c8,
            roughness: 1.0,
            metalness: 0,
          });
      const satMesh = new THREE.Mesh(new THREE.SphereGeometry(s.sizeUnits, 32, 32), satMat);
      satMesh.userData = { satelliteId: s.id, parentPlanetId: p.id };
      satellitesGroup.add(satMesh);
      // Invisible pick aid — co-located child of satMesh so it
      // inherits world position automatically. Sized 3× the visible
      // radius (floor at 4 units) so the moon stays clickable at
      // wide zoom where the visible body is sub-pixel (#304 Slice
      // 1, 2026-06-03).
      const satPickAid = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(s.sizeUnits * 3, 4), 12, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      satPickAid.userData = { satelliteId: s.id, parentPlanetId: p.id, isPickAid: true };
      satMesh.add(satPickAid);

      // 2026-06-03 user direction: "When we zoom in to Earth that
      // [it] is normal with texture with orbit around it and that
      // it all makes sense." Per-satellite orbit line — thin
      // LineLoop circle at radius orbitUnits, inclined by inclRad
      // around the local X axis. Parented to the satellitesGroup
      // so it inherits the same visibility + parent transform as
      // the moons themselves; opacity dialled low so the line
      // reads as a guide, not a competing visual element.
      const orbitPts: THREE.Vector3[] = [];
      const inclRad = ((s.inclDeg ?? 0) * Math.PI) / 180;
      const cosI = Math.cos(inclRad);
      const sinI = Math.sin(inclRad);
      const segments = 96;
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * 2 * Math.PI;
        orbitPts.push(
          new THREE.Vector3(
            Math.cos(a) * s.orbitUnits,
            Math.sin(a) * s.orbitUnits * sinI,
            Math.sin(a) * s.orbitUnits * cosI,
          ),
        );
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
      // 2026-06-06 user direction: "I would like to see some kind of
      // orbit of natural satellites around planet draw, maybe
      // different kind of line." Switched to a dashed white line at
      // moderate opacity so moon orbits read as a distinct visual
      // grammar from planet orbits (solid pale-blue) — dashed = sub-
      // orbit, solid = heliocentric. Requires computeLineDistances()
      // on the geometry for the dash pattern to register.
      const orbitMat = new THREE.LineDashedMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        dashSize: s.orbitUnits * 0.06,
        gapSize: s.orbitUnits * 0.035,
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      orbitLine.computeLineDistances();
      satellitesGroup.add(orbitLine);

      // Hide the dashed orbit ring at default zoom — only reveals at
      // the same PLANET_LOD_IN_RATIO threshold as the spin axis +
      // atmospheric halo (2026-06-06 user direction: "show natural
      // satellite orbits only when zoomed in"). Gated in the per-
      // frame loop alongside halo/spinAxis visibility.
      orbitLine.visible = false;
      return {
        def: s,
        mesh: satMesh,
        orbitLine,
        // Initial angle deterministically spread by id-hash so
        // multiple moons around a single parent don't pile up at
        // phase 0 when the page first loads.
        angle:
          ([...s.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % 360) * (Math.PI / 180),
        inclRad,
      };
    });
    group.add(satellitesGroup);

    // Active orbiters as 3D glyphs (PRD-023 Slice A.3) — small
    // spacecraft markers around the parent planet, sourced from
    // static/data/explore-orbiters.json. Each glyph is a tiny
    // colored cylinder + solar panel; not photo-realistic but
    // identifiable as "active spacecraft" + clickable for fleet
    // cross-link in a follow-up sub-slice. Altitude_km is
    // compressed via a planet-relative scale so multi-orbiter
    // systems (Mars has 7) read with visible spread instead of
    // piling up on one altitude band.
    const orbitersGroup = new THREE.Group();
    orbitersGroup.visible = false;
    const orbiterDefs = exploreOrbitersData.orbiters.filter((o) => o.parent === p.id);
    const orbiters: OrbiterObj[] = orbiterDefs.map((o, i) => {
      // Scale altitude into scene units. Linear: scale so the lowest
      // orbiter (~300 km MRO) sits 0.4 × planet size3 above the
      // surface and the highest (~76 000 km Mangalyaan) sits 4.0 ×
      // planet size3 above. Logarithmic feels more honest given
      // the range, but planet-size scale stays read at this view.
      const km = o.altitude_km;
      const lowKm = 300;
      const highKm = 76000;
      const lowU = p.size3 * 1.4;
      const highU = p.size3 * 5;
      const tAlt = Math.max(
        0,
        Math.min(
          1,
          (Math.log10(km) - Math.log10(lowKm)) / (Math.log10(highKm) - Math.log10(lowKm)),
        ),
      );
      const orbitU = lowU + (highU - lowU) * tAlt;

      // Simple glyph: small cylinder bus + flat solar panel. Color
      // from the JSON entry (agency-tinted).
      const orbGroup = new THREE.Group();
      const colorInt = parseInt(o.color.slice(1), 16);
      const bus = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.45, 8),
        new THREE.MeshBasicMaterial({ color: 0xeeeeee }),
      );
      bus.rotation.z = Math.PI / 2;
      orbGroup.add(bus);
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.6, 0.9),
        new THREE.MeshBasicMaterial({ color: colorInt }),
      );
      orbGroup.add(panel);
      orbGroup.userData = { orbiterId: o.fleet_id, parentPlanet: o.parent };
      orbitersGroup.add(orbGroup);

      // Initial angular spread — hash-deterministic so multiple
      // orbiters per planet don't pile up at phase 0.
      const phaseHash = [...(o.fleet_id ?? o.name)].reduce(
        (h, c) => (h * 31 + c.charCodeAt(0)) >>> 0,
        0,
      );
      return {
        group: orbGroup,
        fleetId: o.fleet_id,
        orbitU,
        phase: ((phaseHash % 360) / 360) * Math.PI * 2,
        inclRad: (o.inclination_deg * Math.PI) / 180,
        // Random-ish per-orbiter period offset so they visibly
        // separate over time. Roughly: 1 + i/4 orbital periods per
        // sim-time cycle. Not real Kepler — visualization motion.
        nodeRad: (((phaseHash >> 4) % 360) / 360) * Math.PI * 2,
        periodFrac: 1 + i * 0.25,
      };
    });
    group.add(orbitersGroup);

    // Hill sphere (PRD-023 Slice B) — stylised wireframe sphere
    // marking the planet's gravity-dominance boundary. Real Hill
    // spheres can be larger than the planet's orbit (Earth's is
    // ~236 Earth radii); at /explore's compressed scene scale we
    // render at 6× planet radius for legibility. Lens-gated by
    // the 'hill-sphere' layer.
    const hillGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(p.size3 * 6, 16, 12));
    const hillMat = new THREE.LineBasicMaterial({
      color: 0xff66cc,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const hillSphere = new THREE.LineSegments(hillGeo, hillMat);
    hillSphere.userData.layerKey = 'hill-sphere';
    hillSphere.visible = false;
    group.add(hillSphere);

    // Lagrange L1 + L2 markers (PRD-023 Slice B) — two small dots
    // along the planet-Sun line, at ~Hill-radius distance. L1 sits
    // between planet and Sun; L2 on the far side (where JWST
    // orbits Earth's L2). Lens-gated by 'lagrange-points'.
    const lagrangeMat = new THREE.MeshBasicMaterial({
      color: 0xffd766,
      transparent: true,
      opacity: 0.95,
    });
    const lagrangeL1 = new THREE.Mesh(
      new THREE.SphereGeometry(p.size3 * 0.18, 16, 16),
      lagrangeMat,
    );
    lagrangeL1.userData.layerKey = 'lagrange-points';
    lagrangeL1.userData.lagrangeKind = 'L1';
    lagrangeL1.userData.lagrangePlanetId = p.id;
    lagrangeL1.visible = false;
    group.add(lagrangeL1);
    const lagrangeL2 = new THREE.Mesh(
      new THREE.SphereGeometry(p.size3 * 0.18, 16, 16),
      lagrangeMat,
    );
    lagrangeL2.userData.layerKey = 'lagrange-points';
    lagrangeL2.userData.lagrangeKind = 'L2';
    lagrangeL2.userData.lagrangePlanetId = p.id;
    lagrangeL2.visible = false;
    group.add(lagrangeL2);
    const lagrangeL1Label = buildArrowTipLabel('L1', '#ffd766', 3.2);
    lagrangeL1Label.userData.layerKey = 'lagrange-points';
    lagrangeL1Label.visible = false;
    group.add(lagrangeL1Label);
    const lagrangeL2Label = buildArrowTipLabel('L2', '#ffd766', 3.2);
    lagrangeL2Label.userData.layerKey = 'lagrange-points';
    lagrangeL2Label.visible = false;
    group.add(lagrangeL2Label);

    // Magnetosphere shell (PRD-023 Slice D) — stylised emissive
    // ellipsoid stretched along the planet→anti-sun axis (the
    // direction the magnetotail extends). Real magnetospheres are
    // teardrop-shaped + scaled wildly (Jupiter's tail reaches past
    // Saturn's orbit); we render a compact 4× planet radius
    // ellipsoid as a sci-fi-flavoured indicator. Only planets with
    // significant dynamos get one: Earth + the four gas giants.
    let magnetosphere: THREE.Mesh | null = null;
    if (
      p.id === 'earth' ||
      p.id === 'jupiter' ||
      p.id === 'saturn' ||
      p.id === 'uranus' ||
      p.id === 'neptune'
    ) {
      const magGeo = new THREE.SphereGeometry(p.size3 * 4, 24, 16);
      const magMat = new THREE.MeshBasicMaterial({
        color: p.id === 'jupiter' ? 0xff66dd : 0x66ddff,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        depthWrite: false,
      });
      magnetosphere = new THREE.Mesh(magGeo, magMat);
      magnetosphere.scale.set(1, 0.7, 2.4); // stretched along Z
      magnetosphere.userData.layerKey = 'magnetosphere';
      magnetosphere.visible = false;
      group.add(magnetosphere);
    }

    // Sub-solar point marker (PRD-023 Slice D) — small bright dot
    // at the planet's surface where the Sun is directly overhead
    // (i.e. the noon longitude). Per-frame the position is set
    // from the planet→Sun unit vector × planet radius.
    const subSolar = new THREE.Mesh(
      new THREE.SphereGeometry(p.size3 * 0.08, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95 }),
    );
    subSolar.userData.layerKey = 'sub-solar';
    subSolar.visible = false;
    group.add(subSolar);

    // Spin-axis indicator (PRD-023 Slice A) — a thin line through
    // the planet's centre at the real obliquity. Rendered along
    // (sin(tilt), cos(tilt), 0) so the tilt is visible from the
    // default camera azimuth. Extends 1.5× planet radius past each
    // pole. Hidden by default; reveals at close zoom alongside the
    // moon + halo layers.
    const spinAxisLen = p.size3 * 1.5;
    const spinTiltRad = (p.axialTiltDeg * Math.PI) / 180;
    const spinAxisPts = [
      new THREE.Vector3(
        Math.sin(spinTiltRad) * spinAxisLen,
        Math.cos(spinTiltRad) * spinAxisLen,
        0,
      ),
      new THREE.Vector3(
        -Math.sin(spinTiltRad) * spinAxisLen,
        -Math.cos(spinTiltRad) * spinAxisLen,
        0,
      ),
    ];
    const spinAxisGeo = new THREE.BufferGeometry().setFromPoints(spinAxisPts);
    const spinAxisMat = new THREE.LineBasicMaterial({
      color: 0xffd766,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const spinAxis = new THREE.Line(spinAxisGeo, spinAxisMat);
    spinAxis.visible = false;
    group.add(spinAxis);

    // PRD-023 Slice E.3a — N + S badges at the spin-axis endpoints.
    // The labels make N pole position explicit at a glance — critical
    // for Venus (177° tilt = N "down") and Uranus (97° tilt = N
    // pointing toward the orbit). Plus a curved arrow on the equator
    // showing rotation direction (counterclockwise viewed from N for
    // prograde rotation; flipped for Venus + Uranus's negative
    // rotation period). Always-on at close zoom alongside the spin
    // axis itself.
    const northBadge = buildArrowTipLabel('N', '#ffd766', 1.6);
    northBadge.position.copy(spinAxisPts[0]).multiplyScalar(1.15);
    northBadge.visible = false;
    group.add(northBadge);
    const southBadge = buildArrowTipLabel('S', '#9aa6b8', 1.6);
    southBadge.position.copy(spinAxisPts[1]).multiplyScalar(1.15);
    southBadge.visible = false;
    group.add(southBadge);

    // Rotation-direction arrow — a small arc on the equator (in the
    // tilted equatorial plane) with a chevron at one end. Direction
    // (forward / backward) tracks the sign of rotationHours so Venus
    // + Uranus visibly curl the other way.
    const isRetrograde = p.rotationHours < 0;
    const rotArcPts: THREE.Vector3[] = [];
    const rotArcR = p.size3 * 1.1;
    const arcSpan = Math.PI / 1.5; // about 120° of arc
    // Equatorial plane = perpendicular to the spin axis. Spin axis
    // points along (sin(tilt), cos(tilt), 0); the equator lies in
    // the plane containing the Z-axis + the tilted-X-direction.
    // For visual clarity we sweep a fixed arc + flip its direction
    // based on retrograde sign.
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * arcSpan * (isRetrograde ? -1 : 1);
      const ex = Math.cos(t) * rotArcR;
      const ez = Math.sin(t) * rotArcR;
      // Rotate the (ex, 0, ez) point into the planet's equatorial
      // plane (perpendicular to the tilted spin axis). For now we
      // approximate by tilting around Z by spinTiltRad.
      rotArcPts.push(
        new THREE.Vector3(ex * Math.cos(spinTiltRad), -ex * Math.sin(spinTiltRad), ez),
      );
    }
    const rotArcGeo = new THREE.BufferGeometry().setFromPoints(rotArcPts);
    const rotArcMat = new THREE.LineBasicMaterial({
      color: 0xffd766,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const rotationArrow = new THREE.Line(rotArcGeo, rotArcMat);
    rotationArrow.visible = false;
    group.add(rotationArrow);

    // PRD-023 Slice E.3b — magnetic dipole axis. Only planets with
    // an intrinsic dipole get one (Venus + Mars + Pluto skip). Color
    // is cyan to distinguish from the yellow spin axis. Length
    // matches the spin axis so the two read as parallel structures.
    // Tilted from the rotation axis by magneticTiltDeg — Saturn's
    // perfect alignment (0°), Earth's 10.5°, Uranus's 58.6° all
    // show up directly. Gated by the magnetosphere lens layer.
    let magneticAxis: THREE.Line | null = null;
    if (p.magneticTiltDeg !== undefined) {
      const magTilt = ((p.axialTiltDeg + p.magneticTiltDeg) * Math.PI) / 180;
      const magPts = [
        new THREE.Vector3(Math.sin(magTilt) * spinAxisLen, Math.cos(magTilt) * spinAxisLen, 0),
        new THREE.Vector3(-Math.sin(magTilt) * spinAxisLen, -Math.cos(magTilt) * spinAxisLen, 0),
      ];
      const magGeo = new THREE.BufferGeometry().setFromPoints(magPts);
      const magMat = new THREE.LineBasicMaterial({
        color: 0x66ddff,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      });
      magneticAxis = new THREE.Line(magGeo, magMat);
      magneticAxis.userData.layerKey = 'magnetosphere';
      magneticAxis.visible = false;
      group.add(magneticAxis);
    }

    // Atmospheric halo (#287 Slice F) — thin emissive shell ~6% larger
    // than the planet sphere, BackSide so the limb glow appears as a
    // soft halo on the silhouette rather than a colored sphere
    // covering the planet. Hidden by default; same reveal gating as
    // the satellite layer flips it on at close zoom.
    let haloMesh: THREE.Mesh | null = null;
    let haloMaterial: THREE.MeshBasicMaterial | null = null;
    if (p.halo) {
      haloMaterial = new THREE.MeshBasicMaterial({
        color: p.halo.color,
        transparent: true,
        opacity: p.halo.opacityMax,
        side: THREE.BackSide,
        depthWrite: false,
      });
      haloMesh = new THREE.Mesh(new THREE.SphereGeometry(p.size3 * 1.06, 32, 32), haloMaterial);
      haloMesh.visible = false;
      group.add(haloMesh);
    }

    scene.add(group);
    const lod: LodState | undefined = p.texture4k
      ? { currentLevel: '2k', tex2k, tex4k: null, loadStarted: false }
      : undefined;
    return {
      group,
      mesh,
      pickAid,
      planet: p,
      material: mat,
      lod,
      satellites,
      satellitesGroup,
      haloMesh,
      haloMaterial,
      spinAxis,
      orbiters,
      orbitersGroup,
      hillSphere,
      lagrangeL1,
      lagrangeL2,
      lagrangeL1Label,
      lagrangeL2Label,
      magnetosphere,
      subSolar,
      northBadge,
      southBadge,
      rotationArrow,
      magneticAxis,
    };
  });

  /**
   * Per-frame LOD swap — for each planet whose `texture4k` is set,
   * measure the camera-to-planet distance and compare to a
   * planet-size-normalised ratio. When the camera gets close enough
   * (≤ PLANET_LOD_IN_RATIO × size3), kick off the 4K fetch + swap
   * material.map once it lands. Hysteresis (PLANET_LOD_OUT_RATIO)
   * keeps the swap from thrashing at the boundary. Mirrors the
   * single-planet pattern shipped on /earth in #284 Layer B.
   */
  const tmpWorldPos = new THREE.Vector3();
  function updatePlanetLods(): void {
    for (let idx = 0; idx < planetObjs.length; idx++) {
      const obj = planetObjs[idx];
      obj.mesh.getWorldPosition(tmpWorldPos);
      const dist = camera.position.distanceTo(tmpWorldPos);
      const ratio = dist / obj.planet.size3;

      // 4K texture swap (#287). Skip when the planet has no 4K
      // variant (Uranus, Neptune today).
      const lod = obj.lod;
      if (lod && obj.planet.texture4k && tex4kAllowed) {
        if (ratio <= PLANET_LOD_IN_RATIO) {
          if (!lod.loadStarted) {
            lod.loadStarted = true;
            const file = obj.planet.texture4k;
            textureLoader.load(
              `${base}/textures/${file}`,
              (tex: THREE.Texture) => {
                // PBR — tag as sRGB (matches the 2K load above) so
                // the 4K swap doesn't shift hue/saturation when LOD
                // crosses the in-threshold.
                tex.colorSpace = THREE.SRGBColorSpace;
                lod.tex4k = tex;
              },
              undefined,
              () => {
                lod.loadStarted = false; // allow retry next cross
              },
            );
          }
          if (lod.tex4k && lod.currentLevel !== '4k') {
            obj.material.map = lod.tex4k;
            obj.material.needsUpdate = true;
            lod.currentLevel = '4k';
          }
        } else if (ratio >= PLANET_LOD_OUT_RATIO && lod.currentLevel !== '2k') {
          obj.material.map = lod.tex2k;
          obj.material.needsUpdate = true;
          lod.currentLevel = '2k';
        }
      }

      // Natural-satellite reveal — 2026-06-03 user direction:
      // "Honestly maybe we can [show moons] at start as well, small
      // enough to be well visible." Satellites now always visible
      // at any zoom level — sized small enough (Moon at 0.9 vs
      // Earth at 5.2) to read as a tiny dot at heliocentric framing
      // and a clearly-smaller-than-parent body at fly-to framing.
      // No zoom gate; the natural perspective scaling handles the
      // reveal.
      if (obj.satellites.length > 0 && !obj.satellitesGroup.visible) {
        obj.satellitesGroup.visible = true;
      }
      // Atmospheric halo reveal — keeps the original LOD-in gating
      // (Earth's blue limb tint at close zoom only). Suppressed when
      // a satellite of THIS planet is selected so only the moon's
      // selection ring reads as the active halo (#304 follow-up,
      // 2026-06-04: user saw earth's atmospheric halo + moon's
      // selection ring simultaneously and read both as "selected").
      const shouldShow = ratio <= PLANET_LOD_IN_RATIO;
      const satOfThisPlanetSelected =
        deps.getSelectedSatelliteKey() !== null &&
        deps.getSelectedSatelliteKey().startsWith(obj.planet.id + ':');
      const haloVisible = shouldShow && !satOfThisPlanetSelected;
      if (obj.haloMesh && obj.haloMesh.visible !== haloVisible) {
        obj.haloMesh.visible = haloVisible;
      }
      // Spin-axis indicator (PRD-023 Slice A) — same gating.
      if (obj.spinAxis.visible !== shouldShow) {
        obj.spinAxis.visible = shouldShow;
      }
      // Natural-satellite orbit rings (2026-06-06 user direction:
      // "show satellite orbits only when zoomed in"). Hide at default
      // zoom so the dashed rings don't compete with planet orbits in
      // the heliocentric view; reveal alongside spin axis + halo
      // when the user flies in to a planet.
      for (const sat of obj.satellites) {
        if (sat.orbitLine.visible !== shouldShow) {
          sat.orbitLine.visible = shouldShow;
        }
      }
      // PRD-023 Slice E.3a — N/S badges + rotation arrow ride
      // alongside the spin axis itself (always-on at close zoom).
      if (obj.northBadge.visible !== shouldShow) {
        obj.northBadge.visible = shouldShow;
      }
      if (obj.southBadge.visible !== shouldShow) {
        obj.southBadge.visible = shouldShow;
      }
      if (obj.rotationArrow.visible !== shouldShow) {
        obj.rotationArrow.visible = shouldShow;
      }
      // Orbiters group (PRD-023 Slice A.3) permanently hidden per
      // 2026-06-03 user direction: "Drop all orbiters from explore
      // and keep focus on natural bodies only." Group stays in the
      // scene graph (visibility flipped at construction time) so
      // we can flip it back on if the decision is reversed; the
      // per-frame motion code below short-circuits when invisible.
      if (obj.orbiters.length > 0 && obj.orbitersGroup.visible) {
        obj.orbitersGroup.visible = false;
      }
    }
  }

  /**
   * Per-frame satellite motion — advances each moon's angular phase
   * at its real sidereal rate (scaled by the global simT clock) and
   * positions the mesh on a circle of radius `orbitUnits` inclined
   * by `inclRad`. Skipped entirely on planets with no satellites.
   * Cheap: at most a handful of trig ops per frame per moon.
   */
  function updateSatellites(dt: number): void {
    if (deps.getReducedMotion() || deps.getSimPaused()) return;
    // Same per-second time-compression as the planets (#351 Layer 1):
    // simSpeed days/sec → years/sec, so moons stay phase-locked to the
    // planet clock at every speed and freeze together on pause.
    const yrPerSec = deps.getSimSpeed() / DAYS_PER_YEAR;
    for (const obj of planetObjs) {
      if (obj.satellites.length > 0) {
        for (const s of obj.satellites) {
          // Sidereal rate — the moon's angular velocity scales as
          // 1 / periodDays so a sidereal month plays out in the same
          // compressed window as the parent's orbital year.
          s.angle += (dt * yrPerSec * (2 * Math.PI)) / s.def.periodDays;
          const ca = Math.cos(s.angle);
          const sa = Math.sin(s.angle);
          const ci = Math.cos(s.inclRad);
          const si = Math.sin(s.inclRad);
          s.mesh.position.set(
            ca * s.def.orbitUnits,
            sa * s.def.orbitUnits * si,
            sa * s.def.orbitUnits * ci,
          );
        }
      }
      // Active orbiters (PRD-023 Slice A.3) — same orbital-circle
      // motion as moons, but with the additional node-rotation so
      // multi-orbiter planets (Mars has 7) don't collapse onto a
      // single equatorial plane. Rate is `periodFrac × dt` —
      // visualization motion, not real Kepler.
      if (obj.orbiters.length > 0) {
        for (const o of obj.orbiters) {
          o.phase += dt * 0.2 * o.periodFrac;
          const ca = Math.cos(o.phase);
          const sa = Math.sin(o.phase);
          const ci = Math.cos(o.inclRad);
          const si = Math.sin(o.inclRad);
          const lx = ca * o.orbitU;
          const ly = sa * o.orbitU * si;
          const lz = sa * o.orbitU * ci;
          const cn = Math.cos(o.nodeRad);
          const sn = Math.sin(o.nodeRad);
          o.group.position.set(lx * cn + lz * sn, ly, -lx * sn + lz * cn);
        }
      }
    }
  }

  // ── Phase H — per-planet science overlay arrows ────────────────
  // Each planet gets three ArrowHelpers parented to its group so they
  // travel with the planet automatically. Direction + length update
  // per frame in the planet animation block. Hidden by default; the
  // layer subscription flips visibility on opt-in.
  const overlayPerPlanet = planetObjs.map(({ group, planet }) => {
    // Pre-compute the constant per-planet values used by both the
    // arrow lengths and the new tip labels. Circular orbit means
    // gravity == centripetal magnitude (F = ma).
    const aAU = Math.pow(planet.period, 2 / 3);
    const aG = gravityAccel(BODY_MASS_KG.sun, aAU * 149_597_870.7);
    const v = Math.sqrt((4 * Math.PI * Math.PI) / aAU) * 4.7404; // km/s

    // Gravity arrow — blue, points toward Sun (origin in world).
    const gravity = new THREE.ArrowHelper(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      12,
      0x6aa9ff,
      2.5,
      1.4,
    );
    gravity.userData.layerKey = 'gravity';
    gravity.visible = false;
    group.add(gravity);

    // Velocity arrow — teal, tangent to orbit (perpendicular to
    // gravity in the planet's orbital plane).
    const velocity = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      12,
      0x4ecdc4,
      2.5,
      1.4,
    );
    velocity.userData.layerKey = 'velocity';
    velocity.visible = false;
    group.add(velocity);

    // Centripetal arrow — red, also points toward Sun. Offset
    // slightly above the planet (along Y) so it doesn't visually
    // collide with the gravity arrow; equal magnitude on a circular
    // orbit teaches F = ma.
    const centripetal = new THREE.ArrowHelper(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, planet.size3 * 1.6, 0),
      10,
      0xff6b6b,
      2.2,
      1.2,
    );
    centripetal.userData.layerKey = 'centripetal';
    centripetal.visible = false;
    group.add(centripetal);

    // Arrow-tip value labels. Static text per planet (circular orbit
    // → constant values) so we build once. Position updates per frame
    // from the arrow's current length. Format gravity in mm/s² for
    // outer planets so Neptune doesn't read "0.000 m/s²".
    const formatG = (g: number) =>
      g >= 1 ? `${g.toFixed(2)} m/s²` : `${(g * 1000).toFixed(g >= 0.001 ? 1 : 2)} mm/s²`;
    const gravityLabel = buildArrowTipLabel(formatG(aG), '#aac6ff', 14);
    const velocityLabel = buildArrowTipLabel(`${v.toFixed(1)} km/s`, '#92e8df', 14);
    const centripetalLabel = buildArrowTipLabel(formatG(aG), '#ffb1b1', 14);
    gravityLabel.userData.layerKey = 'gravity';
    velocityLabel.userData.layerKey = 'velocity';
    centripetalLabel.userData.layerKey = 'centripetal';
    gravityLabel.visible = false;
    velocityLabel.visible = false;
    centripetalLabel.visible = false;
    group.add(gravityLabel);
    group.add(velocityLabel);
    group.add(centripetalLabel);

    return {
      gravity,
      velocity,
      centripetal,
      gravityLabel,
      velocityLabel,
      centripetalLabel,
      planet,
    };
  });

  // Local Group galaxies — billboard sprites on celestial sphere
  // (GH #86 Lite). Sky-overlay only, not true scale. Hidden by
  // default; toggled by the 'galaxies' science-layer.
  const localGroup = buildLocalGroupLayer();
  localGroup.group.visible = false;
  scene.add(localGroup.group);
  const stopExploreGalaxiesLayer = onLayerChange('galaxies', (on) => {
    localGroup.group.visible = on;
  });

  const stopExploreGravityLayer = onLayerChange('gravity', (on) => {
    overlayPerPlanet.forEach((o) => {
      o.gravity.visible = on;
      o.gravityLabel.visible = on;
    });
  });
  const stopExploreVelocityLayer = onLayerChange('velocity', (on) => {
    overlayPerPlanet.forEach((o) => {
      o.velocity.visible = on;
      o.velocityLabel.visible = on;
    });
  });
  const stopExploreCentripetalLayer = onLayerChange('centripetal', (on) => {
    overlayPerPlanet.forEach((o) => {
      o.centripetal.visible = on;
      o.centripetalLabel.visible = on;
    });
  });
  // PRD-023 Slice B — Hill sphere + Lagrange points. Universal across
  // planets (every body has both); reveal gated on the lens layer
  // sub-toggle. Per-frame positions in the animate loop position L1
  // + L2 along the live planet→Sun vector + 6× planet radius.
  const stopExploreHillSphereLayer = onLayerChange('hill-sphere', (on) => {
    planetObjs.forEach((o) => {
      o.hillSphere.visible = on;
    });
  });
  const stopExploreLagrangeLayer = onLayerChange('lagrange-points', (on) => {
    planetObjs.forEach((o) => {
      o.lagrangeL1.visible = on;
      o.lagrangeL2.visible = on;
      o.lagrangeL1Label.visible = on;
      o.lagrangeL2Label.visible = on;
    });
  });
  // PRD-023 Slice D — Magnetosphere shell. Only the 5 bodies with
  // significant dynamos get one (Earth + the 4 gas giants); the
  // .magnetosphere ref is null on the rest so the visibility flip
  // skips them.
  const stopExploreMagnetosphereLayer = onLayerChange('magnetosphere', (on) => {
    planetObjs.forEach((o) => {
      if (o.magnetosphere) o.magnetosphere.visible = on;
      // PRD-023 Slice E.3b — magnetic axis is the same physics as
      // the magnetosphere shell; they toggle together.
      if (o.magneticAxis) o.magneticAxis.visible = on;
    });
  });
  // PRD-023 Slice D — Sub-solar point marker. Universal.
  const stopExploreSubSolarLayer = onLayerChange('sub-solar', (on) => {
    planetObjs.forEach((o) => {
      o.subSolar.visible = on;
    });
  });
  // ── Small bodies (3D) ─────────────────────────────────────────
  // Mirrors the 2D treatment: eccentric ellipse + foci offset + L0
  // rotation, plus a small sphere mesh per body. Comets get a faint
  // anti-solar tail line that updates each frame.
  type SmallBodyObj = {
    mesh: THREE.Mesh;
    /** Invisible larger sphere co-located with `mesh` for raycaster
     *  pick assistance — small bodies are 1.2-1.8 unit spheres next
     *  to Earth's 2.6, so a tight pixel-perfect click radius makes
     *  them effectively unclickable in 3D. The pickAid widens the
     *  hit target without bloating the visible body. */
    pickAid: THREE.Mesh;
    tail?: THREE.Line;
    orbit: THREE.Object3D;
    body: any;
  };
  // #287 Slice E — Pluto promoted to PLANETS so the planet-relative
  // camera + Charon satellite pick it up. Filter from the small-body
  // render path so Pluto doesn't render twice. SMALL_BODIES keeps
  // the original entry so any code that lookups via smallBodyById
  // still resolves (no current call-site does though — selection
  // routes via planet path now).
  const SMALL_BODIES_RENDERED = SMALL_BODIES.filter((b: any) => b.id !== 'pluto');
  const smallBodyObjs: SmallBodyObj[] = SMALL_BODIES_RENDERED.map((b: any) => {
    // Orbit path — closed ellipse for dwarf/comet, open hyperbola
    // for interstellar bodies. Use Line (open) for interstellar so
    // the trajectory doesn't visually close back on itself. Ref
    // captured so the LAYERS panel can hide it with the body.
    const orbitPts = sampleOrbitPoints(b, 128).map(
      (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z),
    );
    const trajColor =
      b.type === 'interstellar' ? 0xff8866 : b.type === 'comet' ? 0x88ddff : 0xc8b48c;
    const TrajCtor = b.type === 'interstellar' ? THREE.Line : THREE.LineLoop;
    const orbit = new TrajCtor(
      new THREE.BufferGeometry().setFromPoints(orbitPts),
      new THREE.LineBasicMaterial({
        color: trajColor,
        transparent: true,
        opacity: b.type === 'interstellar' ? 0.4 : 0.22,
        depthWrite: false,
      }),
    );
    // #410 — ʻOumuamua's inbound radiant vector. It arrived from the direction
    // of Vega (Lyra); annotate the inbound asymptote end of the hyperbola with a
    // short "← Vega" arrow + label. Added as a CHILD of the orbit line so it
    // inherits the interstellar layer's visibility toggle. Schematic like the
    // arc itself — a direction cue, not a to-scale line to Vega (25 ly away).
    if (b.type === 'interstellar' && b.inbound_radiant && orbitPts.length >= 2) {
      const inEnd = orbitPts[0];
      const inDir = new THREE.Vector3().subVectors(orbitPts[0], orbitPts[1]).normalize();
      const tip = new THREE.Vector3().copy(inEnd).addScaledVector(inDir, 70);
      const vec = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([inEnd.clone(), tip]),
        new THREE.LineBasicMaterial({ color: trajColor, transparent: true, opacity: 0.55 }),
      );
      orbit.add(vec);
      const label = buildDirectionLabelSprite(`← ${b.inbound_radiant}`, `#${b.color.slice(1)}`);
      label.position.copy(tip);
      orbit.add(label);
    }
    scene.add(orbit);

    // Body mesh — tiny coloured sphere.
    const colorInt = parseInt(b.color.slice(1), 16);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(b.type === 'comet' ? 1.2 : 1.8, 12, 12),
      new THREE.MeshStandardMaterial({
        color: colorInt,
        emissive: colorInt,
        emissiveIntensity: 0.5,
        roughness: 1.0,
        metalness: 0,
      }),
    );
    mesh.userData = { smallBodyId: b.id };
    scene.add(mesh);

    // Pick aid — invisible sphere ~3× the body's visible radius.
    // Carries the same userData so a raycast hit routes through the
    // existing selectSmallBody() flow. Visibility tracks the body's
    // layer toggle so hidden bodies stay unselectable.
    const pickAid = new THREE.Mesh(
      new THREE.SphereGeometry(b.type === 'comet' ? 4 : 5, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false, depthWrite: false }),
    );
    pickAid.userData = { smallBodyId: b.id, isPickAid: true };
    scene.add(pickAid);

    // Comet tail (line, recomputed per frame in animate).
    let tail: THREE.Line | undefined;
    if (b.type === 'comet') {
      const tailGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      tail = new THREE.Line(
        tailGeo,
        new THREE.LineBasicMaterial({ color: colorInt, transparent: true, opacity: 0.6 }),
      );
      scene.add(tail);
    }

    return { mesh, pickAid, tail, orbit, body: b };
  });

  // Selection ring (3D) — single torus reused for whichever planet is
  // selected. Hidden when nothing is selected. Pulses by modulating
  // material opacity in the animation loop.
  // Selection cue — camera-facing thin ring sprite. The previous
  // BackSide spherical halo (1.18×) read as a second translucent
  // shell stacked outside the atmospheric halo (1.06×); user
  // feedback 2026-06-03: "selected halo on planets when zoomed in
  // is too thin and like there are 2 of them. Can we trim this
  // down and be more sophisticated."
  //
  // Selection ring — a Line2 circle around the selected body.
  // 2026-06-15 user direction: "thin, barely visible, like orbital,
  // and don't scale it up as we zoom — it always retains thin
  // appearance." Line2 + LineMaterial gives screen-pixel-constant
  // stroke width (linewidth is in screen pixels regardless of camera
  // distance), so the ring stays the same thickness whether the
  // camera is at heliocentric framing or flown in close. The ring's
  // radius scales with planet size each frame, but the line stroke
  // does not. Billboarded per-frame so the ring always reads as a
  // clean circle outline against the body silhouette.
  const SEL_RING_SEGMENTS = 96;
  const selRingPositions: number[] = [];
  for (let i = 0; i <= SEL_RING_SEGMENTS; i++) {
    const theta = (i / SEL_RING_SEGMENTS) * Math.PI * 2;
    selRingPositions.push(Math.cos(theta), Math.sin(theta), 0);
  }
  const selRingGeo = new LineGeometry();
  selRingGeo.setPositions(selRingPositions);
  const selRingMat = new LineMaterial({
    color: 0xa8c8ff, // pale-blue, same family as orbit lines
    linewidth: 1.2, // screen pixels — Line2 holds this regardless of zoom
    transparent: true,
    opacity: 0.45,
    depthTest: false,
    dashed: false,
  });
  selRingMat.resolution.set(window.innerWidth, window.innerHeight);
  const selHalo = new Line2(selRingGeo, selRingMat);
  selHalo.computeLineDistances();
  selHalo.visible = false;
  // Render order high so the ring is drawn on top of the planet
  // sphere even when oriented away — combined with depthTest:false
  // the ring outline is never occluded by the body itself.
  selHalo.renderOrder = 999;
  scene.add(selHalo);

  return {
    asteroidBeltPick,
    kuiperBeltPick,
    localGroup,
    overlayPerPlanet,
    planetObjs,
    planetOrbitLines,
    selHalo,
    selRingMat,
    smallBodyObjs,
    stopExploreCentripetalLayer,
    stopExploreGalaxiesLayer,
    stopExploreGravityLayer,
    stopExploreHillSphereLayer,
    stopExploreLagrangeLayer,
    stopExploreMagnetosphereLayer,
    stopExploreSubSolarLayer,
    stopExploreVelocityLayer,
    tmpWorldPos,
    updatePlanetLods,
    updateSatellites,
  };
}
