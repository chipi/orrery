<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { createStarField } from '$lib/three/star-field';
  import { createSceneRenderer } from '$lib/three/scene-renderer';
  import { disposeScene } from '$lib/three/dispose-object3d';
  import { getPlanets, getSun, getMissionIndex, getMission } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import { auToPx } from '$lib/scale';
  import { earthPos, outboundArc, type Vec2 } from '$lib/mission-arc';
  import { missionDestToHeliocentricDestinationId } from '$lib/mission-dest';
  import { dateToSimDay } from '$lib/sim-day';
  import { DESTINATIONS, type DestinationId } from '$lib/lambert-grid.constants';
  import smallBodiesData from '$data/small-bodies.json';
  import exploreOrbitersData from '$data/explore-orbiters.json';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import type { LocalizedPlanet } from '$types/planet';
  import type { LocalizedSun } from '$types/sun';
  import type { Mission } from '$types/mission';
  import PlanetPanel from '$lib/components/PlanetPanel.svelte';
  import SunPanel from '$lib/components/SunPanel.svelte';
  import SizesCanvas from '$lib/components/SizesCanvas.svelte';
  import SmallBodyPanel from '$lib/components/SmallBodyPanel.svelte';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import {
    gravityAccel,
    logScaleLength,
    BODY_MASS_KG,
    buildArrowTipLabel,
  } from '$lib/orbit-overlays';
  import { buildLocalGroupLayer } from '$lib/galaxies-layer';
  import { onLayerChange } from '$lib/science-layers';
  import { onScienceLensChange } from '$lib/science-lens';
  import * as m from '$lib/paraglide/messages';

  // ──────────────────────────────────────────────────────────────────
  // Planet visual config — compressed orbital radii & display sizes,
  // ported faithfully from P01 prototype. Physical params (a, e, T, L0)
  // live in static/data/planets.json; these values are screen-specific
  // visualisation parameters that don't belong in the data layer.
  //
  // size3 = sphere radius in 3D scene units (AU-scaled)
  // size2 = pixel radius in 2D top-down canvas
  // color3 = THREE numeric colour
  // css = CSS hex string used by 2D canvas gradients & labels
  // ──────────────────────────────────────────────────────────────────

  type PlanetVisual = {
    id: string;
    name: string;
    orbitR: number;
    size3: number;
    size2: number;
    color3: number;
    css: string;
    period: number;
    a0: number;
    inc: number;
    hasRings?: boolean;
    /** Filename in static/textures/. ADR-016: assets are local. */
    texture: string;
    /**
     * Optional 4K daymap, lazy-loaded when the camera approaches this
     * planet (#287). Omit for bodies where SSS only publishes a 2K
     * source — Uranus and Neptune in v1. Earth uses 4k_earth_daymap.jpg
     * which already shipped with #284. Venus uses the atmosphere map
     * at native 4K (SSS publishes a native 4K atmosphere variant).
     */
    texture4k?: string;
    /**
     * Optional emissive (night-side glow) texture — PRD-023 Slice A.
     * Used for Earth's city lights. Applied as MeshPhongMaterial's
     * `emissiveMap` so the glow only reads on the unlit hemisphere
     * (the bright day texture overwhelms the emission contribution
     * on the lit side). Omit on bodies with no significant
     * night-side luminosity.
     */
    emissiveMap?: string;
    /**
     * Optional natural-satellite list — only renders when the camera
     * is zoomed in close enough that the parent body itself has
     * promoted to 4K (same threshold as the LOD-in ratio, so satellites
     * appear at the same moment the parent's detail kicks in). Kept
     * hidden at heliocentric framing to avoid crowding /explore's
     * default top-down view.
     */
    satellites?: SatelliteDef[];
    /**
     * Optional atmospheric / limb-glow halo — thin emissive shell
     * around the planet's silhouette, gated on the same zoom-in
     * threshold as the satellite layer (#287 Slice F). Earth gets a
     * blue Rayleigh-scattering tint; Venus a pale sulfuric yellow;
     * Jupiter + Saturn beige cloud-band glow. Bodies with thin or no
     * atmosphere (Mercury / Mars / Uranus / Neptune today) omit it.
     */
    halo?: { color: number; opacityMax: number };
    /**
     * Real obliquity in degrees, from planets.json — used to render
     * the spin-axis indicator line through the planet's poles at the
     * correct tilt. Most planets are within 30° of upright; Uranus
     * sits at 97.77° (effectively rolled onto its side), Venus at
     * 177.36° (upside-down + retrograde). PRD-023 Slice A.
     */
    axialTiltDeg: number;
    /**
     * Sidereal rotation period in hours. Negative = retrograde
     * (Venus + Uranus). Used by the rotation-direction arrow on the
     * spin axis (Slice E.3a) — direction of curl reflects the sign.
     */
    rotationHours: number;
    /**
     * Magnetic dipole tilt relative to the rotation axis (degrees).
     * `undefined` = no intrinsic global dipole (Venus, Mars, Pluto).
     * Saturn ≈ 0° (uniquely aligned); Uranus 58.6° and Neptune 46.9°
     * are wildly off-axis with the dipole also offset from planet
     * centre. PRD-023 Slice E.3b — gated on the magnetosphere lens
     * layer alongside the magnetotail shell.
     */
    magneticTiltDeg?: number;
  };

  /**
   * A single natural-satellite around a parent planet. Distances and
   * sizes are scene-units, not km — scaled so the moon reads as
   * meaningful (visually present + clickable) at the parent's 4K zoom
   * level without overlapping the parent sphere. Real km values live
   * in the related /science articles; this is presentation geometry.
   */
  type SatelliteDef = {
    id: string;
    name: string;
    /** Filename under static/textures/. Same provenance contract as
     *  PlanetVisual.texture — Solar System Scope where available, NASA
     *  / USGS Astrogeology for outer-system bodies. */
    texture: string;
    /** Scene-units radius of the satellite mesh. Sized so the body is
     *  visible at parent's 4K zoom without dominating. */
    sizeUnits: number;
    /** Scene-units orbital radius (distance from parent centre to
     *  satellite centre). For Earth-Moon scaled to ~6 × Earth's size3
     *  unit (real ratio ~30; condensed for legibility). */
    orbitUnits: number;
    /** Sidereal period in days. Drives the per-frame angular
     *  position via the same simT clock that moves the planets. */
    periodDays: number;
    /** Orbital inclination relative to the parent's equator,
     *  degrees. */
    inclDeg?: number;
  };

  const PLANETS: PlanetVisual[] = [
    {
      id: 'mercury',
      name: 'Mercury',
      orbitR: 52,
      size3: 2.8,
      size2: 3,
      color3: 0xb5b5b5,
      css: '#b5b5b5',
      period: 0.241,
      a0: 0.5,
      inc: 7.0,
      axialTiltDeg: 0.034,
      rotationHours: 1407.5,
      magneticTiltDeg: 0.7, // weak but present
      texture: '2k_mercury.jpg',
      texture4k: '4k_mercury.jpg',
    },
    {
      id: 'venus',
      name: 'Venus',
      orbitR: 83,
      size3: 5.0,
      size2: 5,
      color3: 0xe8cda0,
      css: '#e8cda0',
      period: 0.615,
      a0: 2.1,
      inc: 3.4,
      axialTiltDeg: 177.36,
      rotationHours: -5832.5, // retrograde
      // magneticTiltDeg omitted — Venus has no intrinsic dipole.
      texture: '2k_venus_atmosphere.jpg',
      texture4k: '4k_venus_atmosphere.jpg',
      // Sulfuric-acid cloud deck — dense yellow atmosphere, 92×
      // Earth surface pressure. The thickest of any rocky body.
      halo: { color: 0xe8cda0, opacityMax: 0.28 },
    },
    {
      id: 'earth',
      name: 'Earth',
      orbitR: 113,
      size3: 5.2,
      size2: 5.5,
      color3: 0x3a8fcc,
      css: '#4b9cd3',
      period: 1.0,
      a0: 0,
      inc: 0.0,
      axialTiltDeg: 23.4393,
      rotationHours: 23.9345,
      magneticTiltDeg: 10.5,
      texture: '2k_earth_daymap.jpg',
      texture4k: '4k_earth_daymap.jpg',
      // Earth's night-side city lights — NASA Black Marble derivative
      // via Solar System Scope (CC-BY-4.0). PRD-023 Slice A.
      emissiveMap: '2k_earth_nightmap.jpg',
      // Rayleigh-blue limb glow — Earth's signature atmosphere read.
      halo: { color: 0x6aa8ff, opacityMax: 0.25 },
      satellites: [
        {
          id: 'moon',
          name: 'Moon',
          // 4k_moon.jpg already shipped — Solar System Scope, CC BY 4.0.
          texture: '4k_moon.jpg',
          // Real Moon : Earth radius ≈ 0.27. Compressed slightly so the
          // moon reads at the parent's zoom level without dominating.
          sizeUnits: 1.4,
          // Real Moon-Earth distance / Earth radius ≈ 60. At that ratio
          // the moon would sit at ~312 scene units from Earth's centre,
          // way off-frame from the planet's 4K zoom. Compressed to 12
          // so both are simultaneously legible.
          orbitUnits: 12,
          // Sidereal month — 27.32 days.
          periodDays: 27.32,
          // Lunar orbit is inclined 5.14° to the ecliptic.
          inclDeg: 5.14,
        },
      ],
    },
    {
      id: 'mars',
      name: 'Mars',
      orbitR: 155,
      size3: 3.8,
      size2: 4,
      color3: 0xc1440e,
      css: '#c1440e',
      period: 1.881,
      a0: 1.8,
      inc: 1.85,
      axialTiltDeg: 25.19,
      rotationHours: 24.6229,
      // magneticTiltDeg omitted — Mars lost its global dynamo ~4 Gyr ago.
      texture: '2k_mars.jpg',
      texture4k: '4k_mars.jpg',
      // Phobos + Deimos (#287 Slice D). Real bodies are 22 km + 12 km
      // irregular fragments — almost certainly captured asteroids
      // from the Mars-Jupiter belt. Sized small + presented as spheres
      // (their real shapes would need custom geometry; tracked as a
      // follow-up polish item if anyone asks).
      satellites: [
        {
          id: 'phobos',
          name: 'Phobos',
          texture: '2k_phobos.jpg',
          // Real Phobos mean radius 11 km — tiny. Bumped to 0.45 units
          // (still small vs Earth-Moon 1.4) so it's pickable at zoom.
          sizeUnits: 0.45,
          // Real Phobos-Mars distance 9376 km ≈ 2.76 Mars radii. With
          // real geometry it would orbit inside the 4K view —
          // condensed slightly to 12 for visual separation.
          orbitUnits: 12,
          // 7.65 h sidereal period (Phobos orbits faster than Mars
          // rotates — only known moon to rise in the west on its
          // parent body).
          periodDays: 0.3189,
          inclDeg: 1.08,
        },
        {
          id: 'deimos',
          name: 'Deimos',
          texture: '2k_deimos.jpg',
          // Real Deimos mean radius 6.2 km — about half of Phobos.
          sizeUnits: 0.32,
          // Real Deimos-Mars distance 23 463 km ≈ 6.9 Mars radii.
          orbitUnits: 18,
          // 30.3 h sidereal period.
          periodDays: 1.263,
          inclDeg: 1.79,
        },
      ],
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      orbitR: 248,
      size3: 13.5,
      size2: 13,
      color3: 0xc88b3a,
      css: '#c88b3a',
      period: 11.86,
      a0: 1.2,
      inc: 1.3,
      axialTiltDeg: 3.13,
      rotationHours: 9.925,
      magneticTiltDeg: 9.6,
      texture: '2k_jupiter.jpg',
      texture4k: '4k_jupiter.jpg',
      // Beige cloud-band glow — dense H/He envelope, Great Red Spot
      // tone. Low opacity so the band detail underneath still reads.
      halo: { color: 0xd0b07a, opacityMax: 0.18 },
      // Galilean moons (#287 Slice B). All four discovered by Galileo
      // in 1610 — the observation that broke geocentrism. Relative
      // sizing + orbit ordering preserved; orbital distances
      // condensed for legibility. Periods are real sidereal values.
      satellites: [
        {
          id: 'io',
          name: 'Io',
          texture: '4k_io.jpg',
          sizeUnits: 1.3,
          orbitUnits: 24,
          periodDays: 1.769,
        },
        {
          id: 'europa',
          name: 'Europa',
          texture: '2k_europa.jpg',
          sizeUnits: 1.1,
          orbitUnits: 30,
          periodDays: 3.551,
        },
        {
          id: 'ganymede',
          name: 'Ganymede',
          texture: '2k_ganymede.jpg',
          sizeUnits: 1.7,
          orbitUnits: 38,
          periodDays: 7.155,
        },
        {
          id: 'callisto',
          name: 'Callisto',
          texture: '2k_callisto.jpg',
          sizeUnits: 1.6,
          orbitUnits: 48,
          periodDays: 16.689,
        },
      ],
    },
    {
      id: 'saturn',
      name: 'Saturn',
      orbitR: 320,
      size3: 11.0,
      size2: 11,
      color3: 0xe4d191,
      css: '#e4d191',
      period: 29.46,
      a0: 3.5,
      inc: 2.49,
      axialTiltDeg: 26.73,
      rotationHours: 10.656,
      // Saturn's magnetic dipole is uniquely aligned with its rotation
      // axis to within 1° — no other planet does this. PRD-023 Slice E.3b.
      magneticTiltDeg: 0.0,
      hasRings: true,
      texture: '2k_saturn.jpg',
      texture4k: '4k_saturn.jpg',
      // Pale gold halo — similar H/He envelope to Jupiter.
      halo: { color: 0xd0c08a, opacityMax: 0.15 },
      // Titan + Enceladus (#287 Slice C). Two of the system's most
      // scientifically iconic moons — Titan has a thick nitrogen
      // atmosphere + methane lakes; Enceladus has a subsurface ocean
      // venting through south-pole tiger stripes. Sized for legibility
      // at Saturn's zoom level; periods are real.
      satellites: [
        {
          id: 'titan',
          name: 'Titan',
          texture: '4k_titan.jpg',
          // Titan radius 2575 km — solar system's second-largest moon,
          // bigger than Mercury. Sized accordingly (1.7 vs Ganymede's
          // 1.7 — they're effectively peers).
          sizeUnits: 1.7,
          // Real distance 1 222 000 km ≈ 20 Saturn radii. Condensed
          // to ~3.3 × Saturn.size3 so Titan clears the rings.
          orbitUnits: 36,
          periodDays: 15.945,
          inclDeg: 0.33,
        },
        {
          id: 'enceladus',
          name: 'Enceladus',
          texture: '4k_enceladus.jpg',
          // Enceladus radius 252 km — tiny vs Titan, but iconic.
          // Bumped to 0.8 units for visual presence (would be 0.17 at
          // Titan's scale ratio).
          sizeUnits: 0.8,
          // Real distance 238 000 km ≈ 3.95 Saturn radii. Condensed.
          orbitUnits: 22,
          periodDays: 1.37,
          inclDeg: 0.02,
        },
      ],
    },
    {
      id: 'uranus',
      name: 'Uranus',
      orbitR: 378,
      size3: 7.5,
      size2: 7.5,
      color3: 0x7de8e8,
      css: '#7de8e8',
      period: 84.01,
      a0: 5.1,
      inc: 0.77,
      // Uranus rotates on its side — 97.77° tilt is the system's most
      // dramatic, the result of a giant collision early in the planet's
      // history. The spin-axis indicator from PRD-023 Slice A renders
      // this visibly: a near-horizontal line through the planet's body.
      axialTiltDeg: 97.77,
      rotationHours: -17.24, // retrograde
      // Magnetic dipole sits 58.6° off the rotation axis (which is
      // itself tilted 97°) AND is offset from planet centre by ~30%
      // of the planet's radius. PRD-023 Slice E.3b.
      magneticTiltDeg: 58.6,
      texture: '2k_uranus.jpg',
    },
    {
      id: 'neptune',
      name: 'Neptune',
      orbitR: 430,
      size3: 7.0,
      size2: 7,
      color3: 0x3f54ba,
      css: '#3f54ba',
      period: 164.8,
      a0: 2.8,
      inc: 1.77,
      axialTiltDeg: 28.32,
      rotationHours: 16.11,
      // Similar dynamo chaos to Uranus — 46.9° off-axis + offset
      // from planet centre.
      magneticTiltDeg: 46.9,
      texture: '2k_neptune.jpg',
    },
    // Pluto-Charon binary (#287 Slice E). Promoted from SMALL_BODIES so
    // the planet-relative camera + Charon satellite work pick it up.
    // Real Pluto orbit is eccentric (e=0.25) and inclined 17° —
    // modelled here as a circular ring at 580 units for visual
    // consistency with the other planets. The dwarf-planet panel
    // copy was authored as a fresh i18n overlay (planets/pluto.json)
    // and matching planets.json entry; SMALL_BODIES filters Pluto
    // out at both 3D and 2D render paths to avoid double-rendering.
    // Charon is half Pluto's diameter — biggest moon:planet mass
    // ratio in the system; they co-orbit a barycenter outside
    // Pluto's surface.
    {
      id: 'pluto',
      name: 'Pluto',
      orbitR: 580,
      size3: 1.5,
      size2: 1.8,
      color3: 0xd0b48c,
      css: '#d0b48c',
      period: 247.94,
      a0: 4.2,
      inc: 17.16,
      axialTiltDeg: 122.53,
      rotationHours: -153.3, // retrograde
      // magneticTiltDeg omitted — no measured global dipole.
      texture: '4k_pluto.jpg',
      texture4k: '4k_pluto.jpg',
      satellites: [
        {
          id: 'charon',
          name: 'Charon',
          texture: '2k_charon.jpg',
          // Charon radius 606 km vs Pluto 1188 km — half Pluto's
          // diameter. Sized proportionally.
          sizeUnits: 0.78,
          // Real Charon-Pluto distance 19 591 km ≈ 16.5 Pluto radii.
          orbitUnits: 6,
          periodDays: 6.387,
          inclDeg: 0.0,
        },
      ],
    },
  ];

  // Small bodies: dwarf planets, comets, the one known interstellar
  // visitor. Clickable on the 2D view since v0.x.x — same data drives
  // the SmallBodyPanel's overview/technical/learn tabs.
  type SmallBody = {
    id: string;
    name: string;
    type: 'dwarf' | 'comet' | 'interstellar';
    a: number;
    e: number;
    T: number;
    L0: number;
    incl: number;
    color: string;
    radius_km?: number;
    discovered?: string;
    mission_visited?: string | null;
    next_perihelion?: string;
    description?: string;
    wiki?: string;
    note?: string;
  };
  const SMALL_BODIES: SmallBody[] = smallBodiesData.bodies as SmallBody[];
  const smallBodyById = new Map(SMALL_BODIES.map((b) => [b.id, b]));

  /**
   * Sample points along a body's trajectory in heliocentric AU-pixel
   * coordinates. Closed elliptic orbits return a full ring; hyperbolic
   * (interstellar) trajectories return an open curve over the valid
   * true-anomaly interval (where 1 + e·cos ν > 0).
   *
   * Used by both 2D and 3D rendering. Pure function — `auToPx` is the
   * only side-input.
   */
  function sampleOrbitPoints(b: SmallBody, steps: number): { x: number; y: number; z: number }[] {
    // Build the orbit in two stages so inclination renders correctly
    // in 3D: (1) generate points in the orbit's local plane (xL, 0, zL)
    // — closed ellipse for dwarfs/comets, open hyperbola for
    // interstellar visitors. (2) tilt out of the ecliptic by `incl`
    // around the local X-axis (line of nodes is arbitrary without Ω,
    // which we don't carry — visually this still gives Pluto its
    // 17° lift, ʻOumuamua its 122° plunge, etc.). (3) rotate the
    // tilted plane about Y by L0 so the perihelion direction sits
    // where the data wants it. The 2D top-down view consumes only
    // {x, z} and ignores y, so a flat ecliptic projection still
    // works for 2D mode.
    const pts: { x: number; y: number; z: number }[] = [];
    const cosL = Math.cos(b.L0);
    const sinL = Math.sin(b.L0);
    const incRad = ((b.incl ?? 0) * Math.PI) / 180;
    const cosI = Math.cos(incRad);
    const sinI = Math.sin(incRad);
    function pushTilted(xL: number, zL: number) {
      // Tilt around local X: (xL, 0, zL) → (xL, -zL·sinI, zL·cosI)
      const yT = -zL * sinI;
      const zT = zL * cosI;
      // Rotate about world Y by L0.
      pts.push({ x: xL * cosL - zT * sinL, y: yT, z: xL * sinL + zT * cosL });
    }
    if (b.type === 'interstellar') {
      const absA = Math.abs(b.a);
      const semiLatus = absA * (b.e * b.e - 1);
      const nuMax = Math.acos(-1 / b.e) * 0.985;
      for (let i = 0; i <= steps; i++) {
        const nu = -nuMax + (2 * nuMax * i) / steps;
        const rAu = semiLatus / (1 + b.e * Math.cos(nu));
        pushTilted(Math.cos(nu) * auToPx(rAu), Math.sin(nu) * auToPx(rAu));
      }
    } else {
      const semiMajor = auToPx(b.a);
      const semiMinor = semiMajor * Math.sqrt(1 - b.e * b.e);
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        pushTilted(Math.cos(a) * semiMajor - semiMajor * b.e, Math.sin(a) * semiMinor);
      }
    }
    return pts;
  }

  /**
   * Body position for a given simT (years from epoch). Interstellar
   * bodies pin to perihelion (no time evolution — they passed through
   * once in 2017 and are gone). Closed orbits advance with simT.
   */
  function smallBodyPosition(b: SmallBody, simT: number): { x: number; y: number; z: number } {
    // Mirrors the same tilt-then-rotate transform as sampleOrbitPoints
    // so the body sits exactly on the rendered orbit ring in 3D. 2D
    // callers ignore y (top-down ecliptic projection).
    const cosL = Math.cos(b.L0);
    const sinL = Math.sin(b.L0);
    const incRad = ((b.incl ?? 0) * Math.PI) / 180;
    const cosI = Math.cos(incRad);
    const sinI = Math.sin(incRad);
    if (b.type === 'interstellar') {
      // Pin at perihelion (ν=0). zL=0 at perihelion under our
      // line-of-nodes-along-X convention, so y=0 here too.
      const absA = Math.abs(b.a);
      const semiLatus = absA * (b.e * b.e - 1);
      const rAu = semiLatus / (1 + b.e);
      const xL = auToPx(rAu);
      return { x: xL * cosL, y: 0, z: xL * sinL };
    }
    const semiMajor = auToPx(b.a);
    const semiMinor = semiMajor * Math.sqrt(1 - b.e * b.e);
    const Tyr = b.T / 365.25;
    const ang = b.L0 + simT * ((2 * Math.PI) / Tyr);
    const xL = Math.cos(ang) * semiMajor - semiMajor * b.e;
    const zL = Math.sin(ang) * semiMinor;
    const yT = -zL * sinI;
    const zT = zL * cosI;
    return { x: xL * cosL - zT * sinL, y: yT, z: xL * sinL + zT * cosL };
  }

  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let view: '3d' | '2d' = $state('3d');
  let localizedPlanets: LocalizedPlanet[] = $state([]);
  let localizedSun: LocalizedSun | null = $state(null);
  let selectedId: string | null = $state(null);
  let panelOpen = $state(false);
  let sunPanelOpen = $state(false);
  let sizesOpen = $state(false);
  let selectedSmallBodyId: string | null = $state(null);
  let smallBodyPanelOpen = $state(false);
  let selectedSmallBody = $derived(
    selectedSmallBodyId ? (smallBodyById.get(selectedSmallBodyId) ?? null) : null,
  );

  // ─── Layers (issue #32) ──────────────────────────────────────────
  // Four toggleable visibility layers — Sun is always on (centre of
  // the scene). All default to true so first paint matches today.
  // Runtime-only state per CLAUDE.md (no localStorage).
  let layers = $state({
    planets: true,
    dwarfs: true,
    comets: true,
    interstellar: true,
  });
  // ESC closes the sizes overlay. Using a window listener here (gated
  // by sizesOpen) so the dialog is keyboard-dismissible without a
  // svelte:window element inside the {#if} block, which prettier
  // doesn't like nested.
  $effect(() => {
    if (!sizesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') sizesOpen = false;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  let hoverData: {
    name: string;
    velocity: string;
    distance: string;
    extras: string;
    /** Live numeric values used by the lens-mode expanded card. */
    velocityKms: number;
    distanceAU: number;
    eccentricity: number;
    inclinationDeg: number;
    x: number;
    y: number;
  } | null = $state(null);
  // Hover-card lens state: when both the master lens AND the 'hover'
  // layer are on, the tooltip expands with click-through chips into
  // /science. When the lens is off, the tooltip behaves as it always
  // did (always-on terse text). When the lens is on but the 'hover'
  // layer is off, the tooltip is hidden — letting users opt for a
  // fully clean view of the scene.
  let lensOn = $state(false);
  let hoverLayerOn = $state(false);
  let stopLensWatch: (() => void) | undefined;
  let stopHoverLayerWatch: (() => void) | undefined;
  let tooltipVisible = $derived(hoverData !== null && (!lensOn || hoverLayerOn));
  let tooltipExpanded = $derived(lensOn && hoverLayerOn);
  let cleanup: (() => void) | undefined;

  // ─── Mission overlay (Theme A.A1 — v0.1.10 / issue #16) ──────────
  // When `/explore?mission=ID` is loaded, fetch the mission and
  // compute its outbound arc once. Rendered as a 2D Canvas line in
  // draw2d (3D rendering is stretch — deferred to a follow-up).
  let overlayMission: Mission | null = $state(null);
  let overlayArcPx: { x: number; z: number }[] = $state([]);
  let overlayArrivalPx: { x: number; z: number } | null = $state(null);
  $effect(() => {
    const id = $page.url.searchParams.get('mission');
    if (!id) {
      overlayMission = null;
      overlayArcPx = [];
      overlayArrivalPx = null;
      return;
    }
    let cancelled = false;
    void (async () => {
      const idx = await getMissionIndex();
      const entry = idx.find((m) => m.id === id);
      if (!entry || cancelled) return;
      const mission = await getMission(id, entry.dest, localeFromPage($page));
      if (!mission || cancelled) return;
      const depDay = dateToSimDay(mission.departure_date) ?? 0;
      const earthDep = earthPos(depDay);
      const helioId = missionDestToHeliocentricDestinationId(entry.dest);
      const arcBodyId: DestinationId = helioId ?? 'mars';
      const destA = DESTINATIONS[arcBodyId].a;
      const vInf = mission.flight?.arrival?.v_infinity_km_s;
      const arc: Vec2[] = outboundArc(earthDep, 120, destA, vInf);
      overlayMission = mission;
      overlayArcPx = arc.map((p) => ({ x: auToPx(p.x), z: auToPx(p.z) }));
      const arr = arc[arc.length - 1];
      overlayArrivalPx = { x: auToPx(arr.x), z: auToPx(arr.z) };
    })();
    return () => {
      cancelled = true;
    };
  });

  // Lookup keyed by id; reactive to localizedPlanets.
  let planetById = $derived(new Map(localizedPlanets.map((p) => [p.id, p])));
  let selectedPlanet = $derived(selectedId ? (planetById.get(selectedId) ?? null) : null);

  // PRD-023 Slice E.2/E.4 — script-level state for the close-zoom HUD
  // overlays. `focusedOnPlanet` flips true when the camera completes
  // a fly-to a planet, false on Reset View / Sun selection. Drives
  // the Earth-comparison ghost (E.2, always-on at focus) and the
  // tactical stats overlay (E.4, lens-gated).
  let focusedOnPlanet = $state(false);

  // Per-planet stats for the tactical overlay. Values are real
  // (surface gravity in g, atmospheric pressure in bar, sidereal
  // rotation period in hours, mean diameter in km). Earth-diameter
  // ratio drives the comparison ghost label.
  type PlanetStats = {
    diameterKm: number;
    diameterRatioEarth: number;
    surfaceGravityG: number;
    /** Surface atmospheric pressure in bar. 0 for airless bodies;
     *  gas giants use the 1-bar pressure level by convention. */
    atmoBar: number;
  };
  const PLANET_STATS: Record<string, PlanetStats> = {
    mercury: { diameterKm: 4880, diameterRatioEarth: 0.38, surfaceGravityG: 0.38, atmoBar: 0 },
    venus: { diameterKm: 12104, diameterRatioEarth: 0.95, surfaceGravityG: 0.91, atmoBar: 92 },
    earth: { diameterKm: 12742, diameterRatioEarth: 1.0, surfaceGravityG: 1.0, atmoBar: 1.0 },
    mars: { diameterKm: 6779, diameterRatioEarth: 0.53, surfaceGravityG: 0.38, atmoBar: 0.006 },
    jupiter: { diameterKm: 139820, diameterRatioEarth: 10.97, surfaceGravityG: 2.53, atmoBar: 1 },
    saturn: { diameterKm: 116460, diameterRatioEarth: 9.14, surfaceGravityG: 1.07, atmoBar: 1 },
    uranus: { diameterKm: 50724, diameterRatioEarth: 3.98, surfaceGravityG: 0.89, atmoBar: 1 },
    neptune: { diameterKm: 49244, diameterRatioEarth: 3.86, surfaceGravityG: 1.14, atmoBar: 1 },
    pluto: { diameterKm: 2376, diameterRatioEarth: 0.19, surfaceGravityG: 0.06, atmoBar: 1e-6 },
  };
  let focusedStats = $derived(selectedId ? (PLANET_STATS[selectedId] ?? null) : null);
  let focusedRotationHours = $derived(
    selectedId ? (PLANETS.find((p) => p.id === selectedId)?.rotationHours ?? null) : null,
  );
  let statsOverlayOn = $state(false);

  // Plumbed into the 3D scene's RAF tween from inside onMount once
  // the planetObjs array is built. Top-level selectPlanet / selectSun
  // wrappers call through so the camera flies to the target body when
  // the user picks one — without this the camera was stuck looking at
  // the Sun, and per-planet 4K LOD swaps (#287) never fired for
  // anything past Mercury. See `focusOnBody` inside onMount.
  let flyToBodyFn: ((bodyId: string | null) => void) | null = null;

  function selectPlanet(id: string) {
    selectedId = id;
    panelOpen = true;
    sunPanelOpen = false;
    smallBodyPanelOpen = false;
    flyToBodyFn?.(id);
  }

  function selectSun() {
    sunPanelOpen = true;
    panelOpen = false;
    smallBodyPanelOpen = false;
    flyToBodyFn?.(null);
  }

  function selectSmallBody(id: string) {
    selectedSmallBodyId = id;
    smallBodyPanelOpen = true;
    panelOpen = false;
    sunPanelOpen = false;
  }

  // ?id=<planetId|sun|smallBodyId> deep-link → opens the matching panel
  // directly, mirroring the /mars?site= and /fly?mission= patterns.
  // Bookmarkable + share-friendly; also lets e2e tests open a planet
  // panel without depending on canvas-pixel pick math (which is fragile
  // under mobile-chromium DPR + animation timing).
  $effect(() => {
    const id = $page.url.searchParams.get('id');
    if (!id) return;
    if (id === 'sun') {
      selectSun();
    } else if (planetById.has(id)) {
      selectPlanet(id);
    } else if (smallBodyById.has(id)) {
      selectSmallBody(id);
    }
    // Unknown id → no-op; do not crash.
  });

  function closePanel() {
    panelOpen = false;
  }

  function closeSunPanel() {
    sunPanelOpen = false;
  }

  function onPlanMission() {
    if (selectedPlanet?.missionable) {
      goto(`${base}/plan`);
    }
  }

  onMount(() => {
    if (!container || !canvas2d) return;

    // Hover-card lens subscriptions. Both signals start in browser only,
    // so they're safe inside onMount. When either flips we re-derive
    // tooltip visibility / expansion via the existing $derived above.
    stopLensWatch = onScienceLensChange((on) => {
      lensOn = on;
    });
    stopHoverLayerWatch = onLayerChange('hover', (on) => {
      hoverLayerOn = on;
    });

    // Async-load localised planet + sun data; safe to run alongside scene setup.
    const initialLocale = localeFromPage($page);
    getPlanets(initialLocale)
      .then((p) => {
        localizedPlanets = p;
      })
      .catch((err) => console.error('Failed to load planets:', err));
    getSun(initialLocale)
      .then((s) => {
        localizedSun = s;
      })
      .catch((err) => console.error('Failed to load sun:', err));

    // ──────────────────────────────────────────────────────────────
    // 3D — Three.js scene
    // ──────────────────────────────────────────────────────────────

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.5,
      8000,
    );
    const renderer = createSceneRenderer(container);

    scene.add(new THREE.PointLight(0xfff4d0, 3.5, 2500, 1.2));
    scene.add(new THREE.AmbientLight(0x111133, 0.8));
    const fill = new THREE.DirectionalLight(0x223366, 0.3);
    fill.position.set(-200, 100, -200);
    scene.add(fill);

    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (file: string): THREE.Texture =>
      textureLoader.load(`${base}/textures/${file}`);

    // Per-planet texture LOD swap (#287). 2K base loads eagerly so
    // the first paint of /explore stays cheap. 4K lazy-loads when the
    // camera approaches a planet (per-body distance threshold). Sun
    // gets the same treatment via its own pair below. Uranus +
    // Neptune skip LOD because SSS doesn't publish a 4K source for
    // either; they stay 2K eagerly.
    const SUN_RADIUS = 18;
    const PLANET_LOD_IN_RATIO = 4; // distance / planet_size ≤ this → swap to 4K
    const PLANET_LOD_OUT_RATIO = 5; // distance / planet_size ≥ this → swap back to 2K
    type LodState = {
      currentLevel: '2k' | '4k';
      tex2k: THREE.Texture;
      tex4k: THREE.Texture | null;
      loadStarted: boolean;
    };

    const sunMap2k = loadTexture('2k_sun.jpg');
    let sunMap4k: THREE.Texture | null = null;
    let sun4kLoadStarted = false;
    let sunLodLevel: '2k' | '4k' = '2k';
    const sunMaterial = new THREE.MeshBasicMaterial({ map: sunMap2k, color: 0xfff0a0 });
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, 32, 32), sunMaterial);
    sunMesh.userData = { planetId: '__sun__' };
    scene.add(sunMesh);
    function ensureSun4kLoaded(): void {
      if (sun4kLoadStarted) return;
      sun4kLoadStarted = true;
      textureLoader.load(
        `${base}/textures/4k_sun.jpg`,
        (tex) => {
          sunMap4k = tex;
        },
        undefined,
        () => {
          sun4kLoadStarted = false; // allow retry next threshold cross
        },
      );
    }
    function updateSunLod(distanceToSun: number): void {
      const ratio = distanceToSun / SUN_RADIUS;
      if (ratio <= PLANET_LOD_IN_RATIO) {
        ensureSun4kLoaded();
        if (sunMap4k && sunLodLevel !== '4k') {
          sunMaterial.map = sunMap4k;
          sunMaterial.needsUpdate = true;
          sunLodLevel = '4k';
        }
      } else if (ratio >= PLANET_LOD_OUT_RATIO && sunLodLevel !== '2k') {
        sunMaterial.map = sunMap2k;
        sunMaterial.needsUpdate = true;
        sunLodLevel = '2k';
      }
    }
    const glowConfigs: Array<{ r: number; color: number; opacity: number }> = [
      { r: 22, color: 0xffdd66, opacity: 0.18 },
      { r: 40, color: 0xff9922, opacity: 0.08 },
      { r: 58, color: 0xff6600, opacity: 0.04 },
      { r: 76, color: 0xff4400, opacity: 0.02 },
    ];
    for (const g of glowConfigs) {
      scene.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(g.r, 16, 16),
          new THREE.MeshBasicMaterial({
            color: g.color,
            transparent: true,
            opacity: g.opacity,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
    }

    scene.add(
      createStarField({ count: 3000, radius: 3000, jitter: 1000, size: 1.2, opacity: 0.7 }),
    );

    const BELT_COUNT = 1800;
    const bp = new Float32Array(BELT_COUNT * 3);
    for (let i = 0; i < BELT_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 195 + Math.random() * 42;
      bp[i * 3] = Math.cos(a) * r;
      bp[i * 3 + 1] = (Math.random() - 0.5) * 8;
      bp[i * 3 + 2] = Math.sin(a) * r;
    }
    const beltGeo = new THREE.BufferGeometry();
    beltGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    scene.add(
      new THREE.Points(
        beltGeo,
        new THREE.PointsMaterial({
          color: 0xb8a470,
          size: 1.0,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );

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
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      });
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
      planetOrbitLines.push(line);
      scene.add(line);
    });

    type SatelliteObj = {
      def: SatelliteDef;
      mesh: THREE.Mesh;
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
      material: THREE.MeshPhongMaterial;
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
      // Earth's city lights. MeshPhongMaterial adds emission on top
      // of the lighting calculation; emission isn't multiplied by
      // light direction, so on the day side the bright day texture
      // overwhelms the city lights, and on the night side the lit-
      // up cities glow against the dark surface. emissiveIntensity
      // is bumped from the default 0.06 (faint planet-tint glow) to
      // 1.0 when an emissiveMap is supplied so the cities read.
      const emissiveMapTex = p.emissiveMap ? loadTexture(p.emissiveMap) : undefined;
      const mat = new THREE.MeshPhongMaterial({
        map: tex2k,
        color: 0xffffff,
        emissive: p.emissiveMap ? 0xffffff : p.color3,
        emissiveMap: emissiveMapTex,
        emissiveIntensity: p.emissiveMap ? 1.0 : 0.06,
        shininess: 25,
        specular: 0x222222,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size3, 32, 32), mat);
      mesh.userData = { planetId: p.id };
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
      pickAid.userData = { planetId: p.id };
      group.add(pickAid);
      if (p.hasRings) {
        const rg = new THREE.RingGeometry(p.size3 * 1.4, p.size3 * 2.6, 64);
        const rm = new THREE.MeshBasicMaterial({
          color: 0xe4d191,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(rg, rm);
        ring.rotation.x = Math.PI / 2.2;
        group.add(ring);
      }
      // Satellites — built up-front (no lazy load) since their
      // textures share the same lazy 4K LOD philosophy as the parent
      // planet: only loaded once but only revealed when the camera
      // zooms in close. Hidden by default so the heliocentric default
      // view stays uncluttered.
      const satellitesGroup = new THREE.Group();
      satellitesGroup.visible = false;
      const satellites: SatelliteObj[] = (p.satellites ?? []).map((s) => {
        const satTex = loadTexture(s.texture);
        const satMat = new THREE.MeshPhongMaterial({
          map: satTex,
          color: 0xffffff,
          shininess: 8,
        });
        const satMesh = new THREE.Mesh(new THREE.SphereGeometry(s.sizeUnits, 32, 32), satMat);
        satMesh.userData = { satelliteId: s.id, parentPlanetId: p.id };
        satellitesGroup.add(satMesh);
        return {
          def: s,
          mesh: satMesh,
          // Initial angle deterministically spread by id-hash so
          // multiple moons around a single parent don't pile up at
          // phase 0 when the page first loads.
          angle:
            ([...s.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % 360) *
            (Math.PI / 180),
          inclRad: ((s.inclDeg ?? 0) * Math.PI) / 180,
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
      lagrangeL1.visible = false;
      group.add(lagrangeL1);
      const lagrangeL2 = new THREE.Mesh(
        new THREE.SphereGeometry(p.size3 * 0.18, 16, 16),
        lagrangeMat,
      );
      lagrangeL2.userData.layerKey = 'lagrange-points';
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
        if (lod && obj.planet.texture4k) {
          if (ratio <= PLANET_LOD_IN_RATIO) {
            if (!lod.loadStarted) {
              lod.loadStarted = true;
              const file = obj.planet.texture4k;
              textureLoader.load(
                `${base}/textures/${file}`,
                (tex) => {
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

        // Natural-satellite reveal — same threshold as 4K LOD-in so
        // the moons appear at the moment the parent's detail kicks
        // in. Single group-level visibility flip per planet per frame.
        // Always-hidden when ratio > PLANET_LOD_OUT_RATIO so the
        // heliocentric framing stays uncluttered.
        const shouldShow = ratio <= PLANET_LOD_IN_RATIO;
        if (obj.satellites.length > 0 && obj.satellitesGroup.visible !== shouldShow) {
          obj.satellitesGroup.visible = shouldShow;
        }
        // Atmospheric halo reveal — shares the satellite threshold.
        if (obj.haloMesh && obj.haloMesh.visible !== shouldShow) {
          obj.haloMesh.visible = shouldShow;
        }
        // Spin-axis indicator (PRD-023 Slice A) — same gating.
        if (obj.spinAxis.visible !== shouldShow) {
          obj.spinAxis.visible = shouldShow;
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
        // Orbiters group (PRD-023 Slice A.3) — same gating.
        if (obj.orbiters.length > 0 && obj.orbitersGroup.visible !== shouldShow) {
          obj.orbitersGroup.visible = shouldShow;
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
      if (reducedMotion) return;
      for (const obj of planetObjs) {
        if (obj.satellites.length > 0) {
          for (const s of obj.satellites) {
            // Sidereal rate — same time-compression as the planets
            // (simT advances at 0.04 × dt per second elsewhere). The
            // moon's angular velocity scales as 1 / periodDays so a
            // sidereal month plays out in the same compressed window
            // as Earth's orbital year.
            s.angle += (dt * 0.04 * (2 * Math.PI)) / s.def.periodDays;
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
    // PRD-023 Slice E.4 — tactical-scan overlay. DOM-driven (HUD
    // element below); just track the layer's on/off state in a
    // script-level $state so the template's {#if} reads it directly.
    const stopExplorePlanetStatsLayer = onLayerChange('planet-stats', (on) => {
      statsOverlayOn = on;
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
      body: SmallBody;
    };
    // #287 Slice E — Pluto promoted to PLANETS so the planet-relative
    // camera + Charon satellite pick it up. Filter from the small-body
    // render path so Pluto doesn't render twice. SMALL_BODIES keeps
    // the original entry so any code that lookups via smallBodyById
    // still resolves (no current call-site does though — selection
    // routes via planet path now).
    const SMALL_BODIES_RENDERED = SMALL_BODIES.filter((b) => b.id !== 'pluto');
    const smallBodyObjs: SmallBodyObj[] = SMALL_BODIES_RENDERED.map((b) => {
      // Orbit path — closed ellipse for dwarf/comet, open hyperbola
      // for interstellar bodies. Use Line (open) for interstellar so
      // the trajectory doesn't visually close back on itself. Ref
      // captured so the LAYERS panel can hide it with the body.
      const orbitPts = sampleOrbitPoints(b, 128).map((p) => new THREE.Vector3(p.x, p.y, p.z));
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
      scene.add(orbit);

      // Body mesh — tiny coloured sphere.
      const colorInt = parseInt(b.color.slice(1), 16);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(b.type === 'comet' ? 1.2 : 1.8, 12, 12),
        new THREE.MeshPhongMaterial({
          color: colorInt,
          emissive: colorInt,
          emissiveIntensity: 0.5,
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
      pickAid.userData = { smallBodyId: b.id };
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
    // A camera-facing ring sprite is the canonical "this is selected"
    // cue in 3D modelling apps: always renders as a clean circle
    // outline regardless of view angle, doesn't compete with the
    // atmospheric halo's full-shell illumination, scales with planet
    // size, and pulses via material opacity.
    const selRingCanvas = document.createElement('canvas');
    selRingCanvas.width = 256;
    selRingCanvas.height = 256;
    {
      const c = selRingCanvas.getContext('2d')!;
      const cx = 128;
      const cy = 128;
      const outerR = 120;
      const ringW = 3;
      // Soft outer glow → crisp inner stroke.
      const grad = c.createRadialGradient(cx, cy, outerR - ringW * 4, cx, cy, outerR + ringW);
      grad.addColorStop(0, 'rgba(160, 200, 255, 0)');
      grad.addColorStop(0.85, 'rgba(160, 200, 255, 0)');
      grad.addColorStop(0.95, 'rgba(180, 220, 255, 0.55)');
      grad.addColorStop(1.0, 'rgba(160, 200, 255, 0)');
      c.fillStyle = grad;
      c.fillRect(0, 0, 256, 256);
      // Crisp 2 px ring on top of the glow.
      c.strokeStyle = 'rgba(200, 225, 255, 0.92)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(cx, cy, outerR, 0, Math.PI * 2);
      c.stroke();
    }
    const selRingTexture = new THREE.Texture(selRingCanvas);
    selRingTexture.needsUpdate = true;
    selRingTexture.minFilter = THREE.LinearFilter;
    selRingTexture.magFilter = THREE.LinearFilter;
    const selRingMat = new THREE.SpriteMaterial({
      map: selRingTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const selHalo = new THREE.Sprite(selRingMat);
    selHalo.visible = false;
    // Renders on top of the planet sphere so the ring outline is
    // never occluded by the body itself at any view angle.
    selHalo.renderOrder = 999;
    scene.add(selHalo);

    let camR = 680;
    let camP = 1.05;
    let camT = 0.6;
    // Focus origin — the point the camera orbits + looks at. Heliocentric
    // by default (Sun at origin); when the user picks a planet, this
    // tweens to that planet's world position so wheel/pinch zoom +
    // drag-orbit become planet-relative. The per-planet 4K LOD swap
    // (#287) reads camera→planet distance, so planet-relative camR is
    // what makes the 4K texture fire for anything past Mercury.
    const focusOrigin = new THREE.Vector3(0, 0, 0);
    // Per-mode zoom envelope. Heliocentric is the original [60, 1400].
    // When focused on a planet, the floor drops to ~1.5 × planet
    // radius (close enough that the camera grazes the LOD threshold
    // at 4 × radius and digs well inside it for the 4K view) and the
    // ceiling caps at 50× radius so the user can pan outward without
    // accidentally re-entering heliocentric framing.
    let camRMin = 60;
    let camRMax = 1400;
    // Default heliocentric pose — captured once so the Reset View
    // button can fly back to a stable known framing.
    const HELIO_DEFAULT_CAMR = 680;
    const HELIO_DEFAULT_CAMP = 1.05;
    const HELIO_DEFAULT_CAMT = 0.6;

    const updateCam = () => {
      camera.position.set(
        focusOrigin.x + camR * Math.sin(camP) * Math.sin(camT),
        focusOrigin.y + camR * Math.cos(camP),
        focusOrigin.z + camR * Math.sin(camP) * Math.cos(camT),
      );
      camera.lookAt(focusOrigin);
    };
    updateCam();

    // ── Fly-to-body tween (#287 polish) ───────────────────────────────
    // Tweens focusOrigin from current to the target body's world
    // position + camR/camP/camT to a close-orbit pose around it. Pass
    // null to fly back to the heliocentric default. Ease-out cubic
    // over 600 ms; cancelled by any subsequent fly-to call. Read by
    // the animate loop below (`if (flyActive) ...`).
    const FLY_DURATION_MS = 600;
    let flyActive = false;
    let flyStart = 0;
    const flyFromOrigin = new THREE.Vector3();
    const flyToOrigin = new THREE.Vector3();
    let flyFromR = 0;
    let flyToR = 0;
    let flyFromP = 0;
    let flyToP = 0;
    let flyFromT = 0;
    let flyToT = 0;
    let flyToMinR = 60;
    let flyToMaxR = 1400;

    let focusedPlanetObj: (typeof planetObjs)[number] | null = null;

    function focusOnBody(bodyId: string | null): void {
      const next = bodyId ? (planetObjs.find((o) => o.planet.id === bodyId) ?? null) : null;
      flyFromOrigin.copy(focusOrigin);
      flyFromR = camR;
      flyFromP = camP;
      flyFromT = camT;
      if (next) {
        const target = new THREE.Vector3();
        next.mesh.getWorldPosition(target);
        flyToOrigin.copy(target);
        // Land at 3× planet radius — inside the 4× LOD-in ratio so the
        // 4K texture is already swapped in by the time the tween ends.
        flyToR = next.planet.size3 * 3;
        flyToMinR = next.planet.size3 * 1.5;
        flyToMaxR = next.planet.size3 * 50;
        // Pose: look at the planet from roughly the same angle the user
        // had before (camP/camT carry over). For very oblique entries
        // we clamp camP into the legal envelope to avoid flipping.
        flyToP = Math.max(0.08, Math.min(Math.PI * 0.48, camP));
        flyToT = camT;
        focusedPlanetObj = next;
        focusedOnPlanet = true;
      } else {
        flyToOrigin.set(0, 0, 0);
        flyToR = HELIO_DEFAULT_CAMR;
        flyToP = HELIO_DEFAULT_CAMP;
        flyToT = HELIO_DEFAULT_CAMT;
        flyToMinR = 60;
        flyToMaxR = 1400;
        focusedPlanetObj = null;
        focusedOnPlanet = false;
      }
      flyStart = performance.now();
      flyActive = true;
    }

    // Exposed to the top-level selectPlanet / selectSun handlers.
    flyToBodyFn = focusOnBody;

    const el3d = renderer.domElement;
    let isDrag3d = false;
    let lmx3d = 0;
    let lmy3d = 0;
    let dragMoved3d = false;
    let downX3d = 0;
    let downY3d = 0;

    const ray3d = new THREE.Raycaster();
    const planetMeshes = planetObjs.map((o) => o.mesh);
    const planetPickAids = planetObjs.map((o) => o.pickAid);
    const smallBodyMeshes = smallBodyObjs.map((o) => o.mesh);
    const smallBodyPickAids = smallBodyObjs.map((o) => o.pickAid);
    // Pickables: Sun (never selected planet), all planets, all small
    // bodies (visible mesh + invisible pickAid). The pickAid widens
    // the click target for the 1.2-1.8u small-body spheres so they're
    // not effectively unclickable in 3D. Raycaster respects
    // `.visible: false` on the visible mesh; the LAYERS panel toggles
    // both `mesh.visible` and `pickAid.visible` for hidden bodies so
    // they can't be selected when filtered out.
    const pickables: THREE.Object3D[] = [
      ...planetMeshes,
      ...planetPickAids,
      sunMesh,
      ...smallBodyMeshes,
      ...smallBodyPickAids,
    ];

    const tryPick3d = (e: MouseEvent) => {
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3d.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      // First: solar-system pickables (planets / Sun / small bodies)
      const hits = ray3d.intersectObjects(pickables, false);
      const hit = hits.find(
        (h) =>
          typeof h.object.userData.planetId === 'string' ||
          typeof h.object.userData.smallBodyId === 'string',
      );
      if (hit) {
        const planetId = hit.object.userData.planetId as string | undefined;
        const smallBodyId = hit.object.userData.smallBodyId as string | undefined;
        if (planetId === '__sun__') selectSun();
        else if (planetId) selectPlanet(planetId);
        else if (smallBodyId) selectSmallBody(smallBodyId);
        return;
      }
      // Second: galaxy sprites (only pickable when the layer is on,
      // since group.visible gates them). Deep-link to the matching
      // /science/observation article rather than opening an in-app
      // panel — the article is the canonical place to read about it.
      if (localGroup.group.visible) {
        const galaxyHits = ray3d.intersectObjects(localGroup.group.children, false);
        const galaxyHit = galaxyHits.find(
          (h) => typeof h.object.userData.galaxyScienceSection === 'string',
        );
        if (galaxyHit) {
          const section = galaxyHit.object.userData.galaxyScienceSection as string;
          goto(`${base}/science/observation/${section}`);
        }
      }
    };

    // ── 3D hover tooltip — mean orbital velocity (vis-viva at r=a) ──
    // The /explore visualisation uses circular orbits at compressed
    // radii (orbitR), not Keplerian r(t), so the live r is constant
    // per planet. Vis-viva at r=a simplifies to sqrt(μ/a). When we
    // ship a true Kepler simulation (slice 4+ for /fly), we'll plumb
    // the current r through to this tooltip so it varies in real time
    // along the orbit. Until then the value matches the panel's
    // MEAN VELOCITY cell — which is intentional, not a bug.
    const ray3dHover = new THREE.Raycaster();
    // Hover targets mirror click pickables minus the Sun (Sun has its
    // own hover handling via SunPanel) so dwarfs / comets / interstellar
    // bodies get the same vis-viva velocity tooltip as planets.
    const hoverTargets: THREE.Object3D[] = [
      ...planetMeshes,
      ...smallBodyMeshes,
      ...smallBodyPickAids,
    ];
    const onHover = (e: MouseEvent) => {
      if (view !== '3d' || isDrag3d) {
        if (hoverData) hoverData = null;
        return;
      }
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3dHover.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = ray3dHover.intersectObjects(hoverTargets, false);
      if (hits.length === 0) {
        if (hoverData) hoverData = null;
        return;
      }
      const planetId = hits[0].object.userData.planetId as string | undefined;
      const smallBodyId = hits[0].object.userData.smallBodyId as string | undefined;
      // Mean velocity via vis-viva at r=a; collapses to sqrt(μ/a).
      // μ ≈ 4π² in AU³/yr², 4.7404 km/s per AU/yr (IAU 2012).
      if (planetId) {
        const planet = planetById.get(planetId);
        if (!planet) return;
        const v = Math.sqrt((4 * Math.PI ** 2) / planet.a) * 4.7404;
        hoverData = {
          name: planet.name,
          velocity: m.explore_tt_velocity_planet({ value: v.toFixed(2) }),
          distance: m.explore_tt_distance_sun({
            mkm: (planet.a * 149.5978707).toFixed(0),
          }),
          extras: m.explore_tt_extras_planet({
            e: planet.e.toFixed(3),
            i: planet.incl.toFixed(1),
            tilt: planet.axialTilt.toFixed(1),
          }),
          velocityKms: v,
          distanceAU: planet.a,
          eccentricity: planet.e,
          inclinationDeg: planet.incl,
          x: e.clientX,
          y: e.clientY,
        };
      } else if (smallBodyId) {
        const body = smallBodyById.get(smallBodyId);
        if (!body) return;
        const v = Math.sqrt((4 * Math.PI ** 2) / body.a) * 4.7404;
        const typeLabel =
          body.type === 'dwarf'
            ? m.explore_tt_kind_dwarf()
            : body.type === 'comet'
              ? m.explore_tt_kind_comet()
              : m.explore_tt_kind_interstellar();
        hoverData = {
          name: body.name,
          velocity: m.explore_tt_velocity_small({ value: v.toFixed(2) }),
          distance: m.explore_tt_distance_small({
            mkm: (body.a * 149.5978707).toFixed(0),
            kind: typeLabel,
          }),
          extras: m.explore_tt_extras_small({
            e: body.e.toFixed(3),
            i: body.incl.toFixed(1),
          }),
          velocityKms: v,
          distanceAU: body.a,
          eccentricity: body.e,
          inclinationDeg: body.incl,
          x: e.clientX,
          y: e.clientY,
        };
      }
    };
    const onHoverLeave = () => {
      hoverData = null;
    };

    const on3dMouseDown = (e: MouseEvent) => {
      isDrag3d = true;
      dragMoved3d = false;
      lmx3d = e.clientX;
      lmy3d = e.clientY;
      downX3d = e.clientX;
      downY3d = e.clientY;
      el3d.style.cursor = 'grabbing';
    };
    const on3dMouseMove = (e: MouseEvent) => {
      if (!isDrag3d) return;
      const dx = e.clientX - lmx3d;
      const dy = e.clientY - lmy3d;
      if (Math.abs(e.clientX - downX3d) + Math.abs(e.clientY - downY3d) > 4) {
        dragMoved3d = true;
      }
      camT -= dx * 0.006;
      camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
      lmx3d = e.clientX;
      lmy3d = e.clientY;
      updateCam();
    };
    const on3dMouseUp = (e: MouseEvent) => {
      const wasDrag = dragMoved3d;
      isDrag3d = false;
      el3d.style.cursor = 'grab';
      if (!wasDrag && view === '3d') tryPick3d(e);
    };
    const on3dWheel = (e: WheelEvent) => {
      // Trackpad pinch on macOS dispatches a synthetic wheel event
      // with ctrlKey=true; without preventDefault the browser zooms
      // the whole page (nav + chrome) instead of the canvas. Same
      // for Ctrl+scroll on desktop. preventDefault keeps the gesture
      // bound to the 3D camera. Listener also needs `passive: false`
      // — see the addEventListener call below.
      e.preventDefault();
      camR = Math.max(camRMin, Math.min(camRMax, camR + e.deltaY * 0.7));
      updateCam();
    };
    let touchActive3d = false;
    let touchMoved3d = false;
    let touchDownX3d = 0;
    let touchDownY3d = 0;
    let pinchPrev3d = 0; // Previous two-finger distance for pinch-zoom.

    const touchDist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const on3dTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchActive3d = true;
        touchMoved3d = false;
        lmx3d = e.touches[0].clientX;
        lmy3d = e.touches[0].clientY;
        touchDownX3d = lmx3d;
        touchDownY3d = lmy3d;
      } else if (e.touches.length === 2) {
        // Switching to pinch — clear single-touch state so subsequent
        // pinch deltas don't get treated as orbit drag.
        touchActive3d = false;
        pinchPrev3d = touchDist(e.touches[0], e.touches[1]);
      }
    };
    const on3dTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch-zoom on the camera radius. Per CLAUDE.md mobile rules:
        // 3D screens are single-finger orbit + two-finger zoom.
        const dist = touchDist(e.touches[0], e.touches[1]);
        if (pinchPrev3d > 0) {
          const ratio = pinchPrev3d / dist;
          camR = Math.max(camRMin, Math.min(camRMax, camR * ratio));
          updateCam();
        }
        pinchPrev3d = dist;
        return;
      }
      if (!touchActive3d || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lmx3d;
      const dy = e.touches[0].clientY - lmy3d;
      if (
        Math.abs(e.touches[0].clientX - touchDownX3d) +
          Math.abs(e.touches[0].clientY - touchDownY3d) >
        6
      ) {
        touchMoved3d = true;
      }
      camT -= dx * 0.006;
      camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
      lmx3d = e.touches[0].clientX;
      lmy3d = e.touches[0].clientY;
      updateCam();
    };
    const on3dTouchEnd = (e: TouchEvent) => {
      // Reset pinch state when fingers lift below 2.
      if (e.touches.length < 2) pinchPrev3d = 0;
      const wasMoved = touchMoved3d;
      const wasActive = touchActive3d;
      if (e.touches.length === 0) touchActive3d = false;
      if (
        wasActive &&
        !wasMoved &&
        view === '3d' &&
        e.changedTouches.length === 1 &&
        e.touches.length === 0
      ) {
        const t = e.changedTouches[0];
        tryPick3d({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
      }
    };

    el3d.style.cursor = 'grab';
    el3d.addEventListener('mousedown', on3dMouseDown);
    window.addEventListener('mousemove', on3dMouseMove);
    window.addEventListener('mouseup', on3dMouseUp);
    // passive: false so on3dWheel can preventDefault against trackpad
    // pinch (macOS Ctrl+wheel) hijacking browser zoom.
    el3d.addEventListener('wheel', on3dWheel, { passive: false });
    el3d.addEventListener('touchstart', on3dTouchStart, { passive: true });
    el3d.addEventListener('touchmove', on3dTouchMove, { passive: true });
    el3d.addEventListener('touchend', on3dTouchEnd);
    el3d.addEventListener('mousemove', onHover);
    el3d.addEventListener('mouseleave', onHoverLeave);

    // ──────────────────────────────────────────────────────────────
    // 2D — Canvas top-down view (pan + zoom)
    // ──────────────────────────────────────────────────────────────

    const c2 = canvas2d;
    const ctx2 = c2.getContext('2d');
    if (!ctx2) throw new Error('2D canvas context unavailable');

    let zoom2d = 1;
    let zx2d = 0;
    let zy2d = 0;
    let isDrag2d = false;
    let drag2dX = 0;
    let drag2dY = 0;
    let drag2dMoved = false;
    let drag2dDownX = 0;
    let drag2dDownY = 0;

    // World-space planet positions, updated by draw2d each frame.
    const planet2dPos = new Map<string, { x: number; y: number }>();
    const smallBody2dPos = new Map<string, { x: number; y: number }>();

    const resize2d = () => {
      c2.width = c2.clientWidth;
      c2.height = c2.clientHeight;
    };
    resize2d();

    const on2dWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = c2.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const W = c2.width;
      const H = c2.height;
      const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zx2d = (mx - W / 2) * (1 - f) + zx2d * f;
      zy2d = (my - H / 2) * (1 - f) + zy2d * f;
      zoom2d = Math.max(0.12, Math.min(5, zoom2d * f));
    };
    const tryPick2d = (clientX: number, clientY: number) => {
      const rect = c2.getBoundingClientRect();
      const W = c2.width;
      const H = c2.height;
      // Inverse of the canvas transform: world = (screen - centre) / zoom
      const wx = (clientX - rect.left - (W / 2 + zx2d)) / zoom2d;
      const wy = (clientY - rect.top - (H / 2 + zy2d)) / zoom2d;

      // Sun first — sits at world origin, draw radius 14 + glow halo.
      if (Math.hypot(wx, wy) < Math.max(20, 14 / zoom2d)) {
        selectSun();
        return;
      }

      // Generous hit radius — Mercury sweeps ~54 px/s in screen space at
      // default sim speed, so a tight pixel-perfect click radius makes
      // the inner planets effectively unclickable. The 18 px floor (in
      // world units after the zoom inverse) gives a ~330 ms aim window
      // on the fastest body without overlapping neighbouring orbits.
      const FLOOR = 18;
      let best: { id: string; d: number; kind: 'planet' | 'small' } | null = null;
      for (const p of PLANETS) {
        const pos = planet2dPos.get(p.id);
        if (!pos) continue;
        const dx = wx - pos.x;
        const dy = wy - pos.y;
        const d = Math.hypot(dx, dy);
        const hitR = Math.max(p.size2 * 3.5, FLOOR / zoom2d);
        if (d < hitR && (!best || d < best.d)) best = { id: p.id, d, kind: 'planet' };
      }
      // Small bodies (dwarfs, comets, interstellar) — same generous
      // floor. They're drawn as 1.6/2.2px dots and tend to sit alone
      // on their orbit rings, so a wide hit radius is safe.
      for (const b of SMALL_BODIES) {
        const pos = smallBody2dPos.get(b.id);
        if (!pos) continue;
        const dx = wx - pos.x;
        const dy = wy - pos.y;
        const d = Math.hypot(dx, dy);
        const drawR = b.type === 'comet' ? 1.6 : 2.2;
        const hitR = Math.max(drawR * 4, FLOOR / zoom2d);
        if (d < hitR && (!best || d < best.d)) best = { id: b.id, d, kind: 'small' };
      }
      if (!best) return;
      if (best.kind === 'planet') selectPlanet(best.id);
      else selectSmallBody(best.id);
    };

    const on2dMouseDown = (e: MouseEvent) => {
      isDrag2d = true;
      drag2dMoved = false;
      drag2dX = e.clientX;
      drag2dY = e.clientY;
      drag2dDownX = e.clientX;
      drag2dDownY = e.clientY;
      c2.style.cursor = 'grabbing';
    };
    const on2dMouseUp = (e: MouseEvent) => {
      const wasMoved = drag2dMoved;
      isDrag2d = false;
      if (view === '2d') c2.style.cursor = 'grab';
      if (!wasMoved && view === '2d') tryPick2d(e.clientX, e.clientY);
    };
    const on2dMouseMove = (e: MouseEvent) => {
      if (!isDrag2d || view !== '2d') return;
      if (Math.abs(e.clientX - drag2dDownX) + Math.abs(e.clientY - drag2dDownY) > 4) {
        drag2dMoved = true;
      }
      zx2d += e.clientX - drag2dX;
      zy2d += e.clientY - drag2dY;
      drag2dX = e.clientX;
      drag2dY = e.clientY;
    };
    let touchActive2d = false;
    let touch2dMoved = false;
    let touch2dDownX = 0;
    let touch2dDownY = 0;
    let pinchPrev2d = 0;
    let pinchCenter2d: { x: number; y: number } | null = null;

    const on2dTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchActive2d = true;
        touch2dMoved = false;
        drag2dX = e.touches[0].clientX;
        drag2dY = e.touches[0].clientY;
        touch2dDownX = drag2dX;
        touch2dDownY = drag2dY;
      } else if (e.touches.length === 2) {
        touchActive2d = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchPrev2d = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        pinchCenter2d = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      }
    };
    const on2dTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchCenter2d) {
        // Pinch-zoom on the 2D canvas, anchored at the gesture centre
        // so the world point under the fingers stays put. Mirrors the
        // wheel-zoom math in on2dWheel.
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (pinchPrev2d > 0) {
          const f = pinchPrev2d / dist;
          const rect = c2.getBoundingClientRect();
          const mx = pinchCenter2d.x - rect.left;
          const my = pinchCenter2d.y - rect.top;
          const W = c2.width;
          const H = c2.height;
          zx2d = (mx - W / 2) * (1 - f) + zx2d * f;
          zy2d = (my - H / 2) * (1 - f) + zy2d * f;
          zoom2d = Math.max(0.12, Math.min(5, zoom2d / f));
        }
        pinchPrev2d = dist;
        pinchCenter2d = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
        return;
      }
      if (!touchActive2d || e.touches.length !== 1) return;
      if (
        Math.abs(e.touches[0].clientX - touch2dDownX) +
          Math.abs(e.touches[0].clientY - touch2dDownY) >
        6
      ) {
        touch2dMoved = true;
      }
      zx2d += e.touches[0].clientX - drag2dX;
      zy2d += e.touches[0].clientY - drag2dY;
      drag2dX = e.touches[0].clientX;
      drag2dY = e.touches[0].clientY;
    };
    const on2dTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchPrev2d = 0;
        pinchCenter2d = null;
      }
      const wasMoved = touch2dMoved;
      const wasActive = touchActive2d;
      if (e.touches.length === 0) touchActive2d = false;
      if (
        wasActive &&
        !wasMoved &&
        view === '2d' &&
        e.changedTouches.length === 1 &&
        e.touches.length === 0
      ) {
        const t = e.changedTouches[0];
        tryPick2d(t.clientX, t.clientY);
      }
    };

    c2.style.cursor = 'grab';
    c2.addEventListener('wheel', on2dWheel, { passive: false });
    c2.addEventListener('mousedown', on2dMouseDown);
    window.addEventListener('mouseup', on2dMouseUp);
    window.addEventListener('mousemove', on2dMouseMove);
    c2.addEventListener('touchstart', on2dTouchStart, { passive: true });
    c2.addEventListener('touchmove', on2dTouchMove, { passive: true });
    c2.addEventListener('touchend', on2dTouchEnd);

    // ──────────────────────────────────────────────────────────────
    // 2D draw — ported from P01 lines 393–533
    // Deferred to later checkpoints: SMALL bodies, comets, Kuiper Belt,
    // Planet Nine ring, selection ring, tooltip (3a-5/3a-6).
    // ──────────────────────────────────────────────────────────────

    const draw2d = () => {
      // Defensive sync: the canvas is `display: none` while view='3d',
      // so its clientWidth/clientHeight are 0 at onMount and resize2d()
      // sets c2.width=c2.height=0. When the user toggles to 2D the
      // canvas's layout size becomes non-zero again — re-pick it up
      // here so the very first frame after the toggle isn't blank.
      // Cheap: a single property compare on the hot path.
      if (c2.width !== c2.clientWidth || c2.height !== c2.clientHeight) {
        c2.width = c2.clientWidth;
        c2.height = c2.clientHeight;
      }
      const W = c2.width;
      const H = c2.height;
      if (W === 0 || H === 0) return; // Layout still pending; skip frame.
      ctx2.fillStyle = '#04040c';
      ctx2.fillRect(0, 0, W, H);

      // Stars in screen space (deterministic positions)
      for (let i = 0; i < 200; i++) {
        const sx = (i * 137.5 * 31 + i * 71) % W;
        const sy = (i * 137.5 * 17 + i * 53) % H;
        ctx2.beginPath();
        ctx2.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
        ctx2.fill();
      }

      ctx2.save();
      ctx2.translate(W / 2 + zx2d, H / 2 + zy2d);
      ctx2.scale(zoom2d, zoom2d);

      // Orbit rings (highlighted for the selected planet). Tonal
      // balance matches the 3D LineBasicMaterial (white opacity 0.06,
      // 1u line) so the two views read with the same emphasis. The
      // previous 0.05 opacity at 0.5 lineWidth was nearly invisible
      // on most monitors due to subpixel anti-aliasing.
      PLANETS.forEach((p) => {
        const isSel = selectedId === p.id;
        ctx2.beginPath();
        ctx2.arc(0, 0, p.orbitR, 0, Math.PI * 2);
        ctx2.strokeStyle = isSel ? 'rgba(68,102,255,0.55)' : 'rgba(255,255,255,0.18)';
        ctx2.lineWidth = isSel ? 1.5 : 1;
        ctx2.stroke();
      });

      // Mission overlay arc (Theme A.A1) — drawn after orbit rings
      // but before planets so the arc sits behind the planet dots.
      if (overlayArcPx.length > 1 && overlayMission) {
        const accent = overlayMission.color || '#4ecdc4';
        ctx2.save();
        ctx2.beginPath();
        ctx2.moveTo(overlayArcPx[0].x, overlayArcPx[0].z);
        for (let i = 1; i < overlayArcPx.length; i++) {
          ctx2.lineTo(overlayArcPx[i].x, overlayArcPx[i].z);
        }
        ctx2.strokeStyle = accent;
        ctx2.lineWidth = 1.6;
        ctx2.shadowColor = accent;
        ctx2.shadowBlur = 6;
        ctx2.stroke();
        // Departure node (teal) + arrival node (gold) per UXS-001 §Extension.
        ctx2.shadowBlur = 4;
        ctx2.fillStyle = '#4ecdc4';
        ctx2.beginPath();
        ctx2.arc(overlayArcPx[0].x, overlayArcPx[0].z, 4, 0, Math.PI * 2);
        ctx2.fill();
        if (overlayArrivalPx) {
          ctx2.fillStyle = '#ffc850';
          ctx2.beginPath();
          ctx2.arc(overlayArrivalPx.x, overlayArrivalPx.z, 4, 0, Math.PI * 2);
          ctx2.fill();
        }
        ctx2.restore();
      }

      // Small-body orbit paths — closed dashed ellipses for dwarfs and
      // comets, open hyperbola for interstellar (Oumuamua). Uses
      // sampleOrbitPoints so the math stays consistent with 3D mode.
      // Each type gated by its layer flag (issue #32).
      SMALL_BODIES.forEach((b) => {
        if (b.type === 'dwarf' && !layers.dwarfs) return;
        if (b.type === 'comet' && !layers.comets) return;
        if (b.type === 'interstellar' && !layers.interstellar) return;
        const pts = sampleOrbitPoints(b, 96);
        ctx2.save();
        ctx2.beginPath();
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) ctx2.moveTo(pts[i].x, pts[i].z);
          else ctx2.lineTo(pts[i].x, pts[i].z);
        }
        if (b.type === 'interstellar') {
          ctx2.strokeStyle = 'rgba(255,136,102,0.45)';
          ctx2.lineWidth = 0.8;
        } else {
          ctx2.strokeStyle =
            b.type === 'comet' ? 'rgba(136,221,255,0.18)' : 'rgba(200,180,140,0.14)';
          ctx2.lineWidth = 0.6;
          ctx2.setLineDash([3, 6]);
          ctx2.closePath();
        }
        ctx2.stroke();
        ctx2.setLineDash([]);
        ctx2.restore();
      });

      // Asteroid belt
      for (let i = 0; i < 280; i++) {
        const a = (i / 280) * Math.PI * 2 + simT * 0.016;
        const r = 192 + (i % 38) * 1.1;
        ctx2.beginPath();
        ctx2.arc(Math.cos(a) * r, Math.sin(a) * r, 0.85, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(185,162,110,${0.05 + (i % 7) * 0.03})`;
        ctx2.fill();
      }

      // Kuiper Belt — icy bodies beyond Neptune (30–50 AU).
      for (let i = 0; i < 500; i++) {
        const a = (i / 500) * Math.PI * 2 + simT * 0.003;
        const r = 438 + (i % 44) * 0.9;
        ctx2.beginPath();
        ctx2.arc(Math.cos(a) * r, Math.sin(a) * r, 0.75, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(140,160,210,${0.035 + (i % 9) * 0.018})`;
        ctx2.fill();
      }

      // Planet Nine — hypothetical, ~600 AU. Drawn as a dashed ring with
      // a small caption that floats above. Visible only at moderate zoom.
      const pnR = Math.min(W, H) * 0.49;
      ctx2.beginPath();
      ctx2.arc(0, 0, pnR, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(160,120,220,0.14)';
      ctx2.lineWidth = 1;
      ctx2.setLineDash([4, 9]);
      ctx2.stroke();
      ctx2.setLineDash([]);
      ctx2.save();
      ctx2.font = "7px 'Space Mono',monospace";
      ctx2.fillStyle = 'rgba(160,120,220,0.32)';
      ctx2.textAlign = 'center';
      ctx2.fillText('PLANET NINE? · HYPOTHETICAL · ~600 AU', 0, -pnR - 6);
      ctx2.restore();

      // Sun glow + core
      for (let r = 90; r > 0; r -= 6) {
        const sg = ctx2.createRadialGradient(0, 0, 0, 0, 0, r);
        sg.addColorStop(0, `rgba(255,228,130,${0.012 * (90 / r)})`);
        sg.addColorStop(1, 'rgba(255,120,0,0)');
        ctx2.beginPath();
        ctx2.arc(0, 0, r, 0, Math.PI * 2);
        ctx2.fillStyle = sg;
        ctx2.fill();
      }
      ctx2.beginPath();
      ctx2.arc(0, 0, 14, 0, Math.PI * 2);
      ctx2.fillStyle = '#fff8e7';
      ctx2.fill();
      ctx2.save();
      ctx2.font = "7px 'Space Mono',monospace";
      ctx2.fillStyle = 'rgba(255,220,100,0.5)';
      ctx2.textAlign = 'center';
      ctx2.fillText('SUN', 0, 22);
      ctx2.restore();

      // Planets — gated by the PLANETS layer (issue #32). When the
      // layer is off we skip drawing AND populating planet2dPos so
      // the pick logic ignores invisible bodies too.
      if (!layers.planets) planet2dPos.clear();
      if (layers.planets)
        PLANETS.forEach((p) => {
          const ang = p.a0 + simT * ((2 * Math.PI) / p.period);
          const pr = Math.max(3, p.size2);
          const px = Math.cos(ang) * p.orbitR;
          const py = Math.sin(ang) * p.orbitR;
          planet2dPos.set(p.id, { x: px, y: py });

          const isSel = selectedId === p.id;

          // Selection ring (pulsing) — drawn before sphere so it sits behind glow
          if (isSel) {
            const pulse = 0.5 + 0.5 * Math.sin(simT * 80);
            ctx2.beginPath();
            ctx2.arc(px, py, pr + 10 + pulse * 3, 0, Math.PI * 2);
            ctx2.strokeStyle = `rgba(68,102,255,${0.55 + pulse * 0.3})`;
            ctx2.lineWidth = 1.5;
            ctx2.stroke();
          }

          // Outer glow
          const gl = ctx2.createRadialGradient(px, py, 0, px, py, pr * 4);
          gl.addColorStop(0, p.css + '55');
          gl.addColorStop(1, 'rgba(0,0,0,0)');
          ctx2.beginPath();
          ctx2.arc(px, py, pr * 4, 0, Math.PI * 2);
          ctx2.fillStyle = gl;
          ctx2.fill();

          // Saturn rings (behind sphere)
          if (p.id === 'saturn') {
            ctx2.save();
            ctx2.translate(px, py);
            ctx2.scale(1, 0.3);
            ctx2.beginPath();
            ctx2.ellipse(0, 0, pr + 14, pr + 14, 0, 0, Math.PI * 2);
            ctx2.strokeStyle = 'rgba(228,209,145,0.22)';
            ctx2.lineWidth = 7;
            ctx2.stroke();
            ctx2.restore();
          }

          // Planet sphere with per-planet shading
          ctx2.beginPath();
          ctx2.arc(px, py, pr, 0, Math.PI * 2);
          const sg = ctx2.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.1, px, py, pr);
          if (p.id === 'earth') {
            sg.addColorStop(0, '#6ab8e8');
            sg.addColorStop(1, '#0d3050');
          } else if (p.id === 'mars') {
            sg.addColorStop(0, '#e0704a');
            sg.addColorStop(1, '#7a2000');
          } else if (p.id === 'jupiter') {
            sg.addColorStop(0, '#deb878');
            sg.addColorStop(1, '#6a3a0e');
          } else if (p.id === 'saturn') {
            sg.addColorStop(0, '#ece8b0');
            sg.addColorStop(1, '#9a8830');
          } else if (p.id === 'venus') {
            sg.addColorStop(0, '#f0e0a0');
            sg.addColorStop(1, '#9a7820');
          } else if (p.id === 'uranus') {
            sg.addColorStop(0, '#a8f0f0');
            sg.addColorStop(1, '#207878');
          } else if (p.id === 'neptune') {
            sg.addColorStop(0, '#6080d8');
            sg.addColorStop(1, '#101858');
          } else if (p.id === 'mercury') {
            sg.addColorStop(0, '#d0c8c0');
            sg.addColorStop(1, '#504840');
          } else {
            sg.addColorStop(0, p.css);
            sg.addColorStop(1, p.css + '88');
          }
          ctx2.fillStyle = sg;
          ctx2.fill();

          // Jupiter bands
          if (p.id === 'jupiter' && pr > 6) {
            ctx2.save();
            ctx2.beginPath();
            ctx2.arc(px, py, pr, 0, Math.PI * 2);
            ctx2.clip();
            const bands: Array<[number, string]> = [
              [pr * 0.22, 'rgba(160,90,40,0.28)'],
              [pr * 0.65, 'rgba(140,80,30,0.28)'],
            ];
            for (const [dy, col] of bands) {
              ctx2.fillStyle = col;
              ctx2.fillRect(px - pr, py - dy - pr * 0.07, pr * 2, pr * 0.14);
            }
            ctx2.restore();
          }

          // Saturn rings (front)
          if (p.id === 'saturn') {
            ctx2.save();
            ctx2.translate(px, py);
            ctx2.scale(1, 0.3);
            ctx2.beginPath();
            ctx2.ellipse(0, 0, pr + 14, pr + 14, 0, 0, Math.PI * 2);
            ctx2.strokeStyle = 'rgba(228,209,145,0.5)';
            ctx2.lineWidth = 3.5;
            ctx2.stroke();
            ctx2.restore();
          }

          // Specular highlight
          ctx2.beginPath();
          ctx2.arc(px - pr * 0.28, py - pr * 0.28, pr * 0.2, 0, Math.PI * 2);
          ctx2.fillStyle = 'rgba(255,255,255,0.18)';
          ctx2.fill();

          // Label
          ctx2.save();
          ctx2.font = "8px 'Space Mono',monospace";
          ctx2.shadowColor = 'rgba(0,0,0,0.9)';
          ctx2.shadowBlur = 6;
          ctx2.fillStyle = p.css + 'cc';
          ctx2.textAlign = 'left';
          ctx2.fillText(p.name, px + pr + 5, py + 3);
          ctx2.restore();
        });

      // Small bodies — dots + labels. Closed-orbit bodies advance with
      // simT; interstellar visitors stay pinned at perihelion (since
      // they passed through once and are gone). Gated per-type by
      // the dwarfs/comets/interstellar layer flags (issue #32).
      smallBody2dPos.clear();
      SMALL_BODIES.forEach((b) => {
        if (b.type === 'dwarf' && !layers.dwarfs) return;
        if (b.type === 'comet' && !layers.comets) return;
        if (b.type === 'interstellar' && !layers.interstellar) return;
        // #287 Slice E — Pluto rendered as a planet, skip the 2D
        // small-body draw to avoid duplicate dot + orbit ring.
        if (b.id === 'pluto') return;
        const { x: px, z: py } = smallBodyPosition(b, simT);
        smallBody2dPos.set(b.id, { x: px, y: py });

        // Glow
        const gl = ctx2.createRadialGradient(px, py, 0, px, py, 6);
        gl.addColorStop(0, b.color + '88');
        gl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx2.beginPath();
        ctx2.arc(px, py, 6, 0, Math.PI * 2);
        ctx2.fillStyle = gl;
        ctx2.fill();

        // Comet tail — simple line pointing away from Sun.
        if (b.type === 'comet') {
          const distFromSun = Math.hypot(px, py);
          if (distFromSun > 0) {
            const tailLen = 18;
            const tx = px + (px / distFromSun) * tailLen;
            const ty = py + (py / distFromSun) * tailLen;
            ctx2.beginPath();
            ctx2.moveTo(px, py);
            ctx2.lineTo(tx, ty);
            ctx2.strokeStyle = `${b.color}88`;
            ctx2.lineWidth = 1.5;
            ctx2.stroke();
          }
        }

        // Body dot
        ctx2.beginPath();
        ctx2.arc(px, py, b.type === 'comet' ? 1.6 : 2.2, 0, Math.PI * 2);
        ctx2.fillStyle = b.color;
        ctx2.fill();

        // Label
        ctx2.save();
        ctx2.font = "7px 'Space Mono',monospace";
        ctx2.shadowColor = 'rgba(0,0,0,0.9)';
        ctx2.shadowBlur = 5;
        ctx2.fillStyle = b.color + 'aa';
        ctx2.textAlign = 'left';
        ctx2.fillText(b.name, px + 5, py + 2);
        ctx2.restore();
      });

      ctx2.restore();

      // Bottom hint in screen space
      ctx2.save();
      ctx2.font = "8px 'Space Mono',monospace";
      ctx2.fillStyle = 'rgba(255,255,255,0.08)';
      ctx2.fillText('ECLIPTIC PLANE · TOP-DOWN · SCROLL TO ZOOM · DRAG TO PAN', 22, H - 10);
      ctx2.restore();
    };

    // ──────────────────────────────────────────────────────────────
    // Resize
    // ──────────────────────────────────────────────────────────────

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      resize2d();
    };
    window.addEventListener('resize', onResize);

    // ──────────────────────────────────────────────────────────────
    // Animation loop — dispatches by `view`
    // ──────────────────────────────────────────────────────────────

    let simT = 0;
    let lastTime = performance.now();
    let rafId = 0;
    let reducedMotion = false;
    const stopReducedMotionWatch = onReducedMotionChange((r) => {
      reducedMotion = r;
    });
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      // ADR-025: when prefers-reduced-motion is set we freeze sim
      // time. User-initiated camera drag still works.
      if (!reducedMotion) simT += dt * 0.04;

      // Fly-to-body tween (#287 polish). When focused on a planet, the
      // target world position drifts with the planet's own orbital
      // motion — re-read it each frame so the tween lands on the
      // planet's current position, not where it was when focus() fired.
      if (flyActive) {
        if (focusedPlanetObj) {
          focusedPlanetObj.mesh.getWorldPosition(flyToOrigin);
        }
        const t = Math.min(1, (now - flyStart) / FLY_DURATION_MS);
        const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
        focusOrigin.lerpVectors(flyFromOrigin, flyToOrigin, e);
        camR = flyFromR + (flyToR - flyFromR) * e;
        camP = flyFromP + (flyToP - flyFromP) * e;
        camT = flyFromT + (flyToT - flyFromT) * e;
        if (t >= 1) {
          flyActive = false;
          camRMin = flyToMinR;
          camRMax = flyToMaxR;
        }
        updateCam();
      } else if (focusedPlanetObj) {
        // Steady-state planet focus — keep focusOrigin glued to the
        // planet's drifting world position so wheel-zoom and drag
        // stay planet-relative across orbital motion.
        focusedPlanetObj.mesh.getWorldPosition(focusOrigin);
        updateCam();
      }

      // #287 per-planet 4K LOD swap. Cheap per-frame — a single
      // distance check + threshold compare per planet. Active in 3D
      // only (2D top-down view doesn't sample texture pixels in a
      // way that benefits from 4K). Same loop now also gates moon
      // visibility on the same threshold so satellites appear at
      // the moment the parent's detail kicks in.
      if (view === '3d') {
        updateSunLod(camera.position.length());
        updatePlanetLods();
        updateSatellites(dt);
      }

      if (view === '3d') {
        // Apply layer visibility (issue #32). Cheap — just sets the
        // .visible flag on the existing scene refs each frame so
        // toggling the LAYERS panel takes effect on the very next
        // tick without rebuilding any geometry.
        for (const line of planetOrbitLines) line.visible = layers.planets;
        for (const o of planetObjs) o.group.visible = layers.planets;
        for (const o of smallBodyObjs) {
          const on =
            o.body.type === 'dwarf'
              ? layers.dwarfs
              : o.body.type === 'comet'
                ? layers.comets
                : layers.interstellar;
          o.mesh.visible = on;
          o.pickAid.visible = on;
          o.orbit.visible = on;
          if (o.tail) o.tail.visible = on;
        }

        planetObjs.forEach(({ group, mesh, planet }, idx) => {
          const angle = planet.a0 + (2 * Math.PI * simT) / planet.period;
          const inc = (planet.inc * Math.PI) / 180;
          const x = Math.cos(angle) * planet.orbitR;
          const zf = Math.sin(angle) * planet.orbitR;
          group.position.set(x, zf * Math.sin(inc), zf * Math.cos(inc));
          // ADR-025: gate the per-frame axial spin under reduced-motion
          // alongside the orbit advance. The audit caught this bypass
          // in v1.0 — planets kept spinning even with simT frozen.
          if (!reducedMotion) mesh.rotation.y += 0.005;

          // PRD-023 Slice B — position L1 + L2 markers along the planet→
          // Sun line. Sun is at origin, planet at group.position; the
          // unit vector from planet to Sun in WORLD space is
          // -group.position.normalize(). L1 sits inside the planet's
          // orbit (toward Sun); L2 outside (away from Sun). Distance
          // from planet matches the stylised Hill-sphere radius
          // (6 × planet size3). Markers + labels are parented to the
          // planet's group (translation only) so the local position
          // equals the world direction.
          const obj = planetObjs[idx];
          // PRD-023 Slice B + D — bodies needing the planet→Sun unit
          // vector each frame: L1/L2 markers, sub-solar marker on the
          // sunlit surface, magnetosphere orientation (stretches
          // along anti-sun axis).
          if (
            obj.hillSphere.visible ||
            obj.lagrangeL1.visible ||
            obj.lagrangeL2.visible ||
            obj.subSolar.visible ||
            (obj.magnetosphere?.visible ?? false)
          ) {
            const sunDir = group.position.length();
            if (sunDir > 0.0001) {
              const ux = -group.position.x / sunDir;
              const uy = -group.position.y / sunDir;
              const uz = -group.position.z / sunDir;
              if (obj.lagrangeL1.visible || obj.lagrangeL2.visible) {
                const lagrangeDist = planet.size3 * 6;
                obj.lagrangeL1.position.set(
                  ux * lagrangeDist,
                  uy * lagrangeDist,
                  uz * lagrangeDist,
                );
                obj.lagrangeL2.position.set(
                  -ux * lagrangeDist,
                  -uy * lagrangeDist,
                  -uz * lagrangeDist,
                );
                obj.lagrangeL1Label.position.copy(obj.lagrangeL1.position).multiplyScalar(1.18);
                obj.lagrangeL2Label.position.copy(obj.lagrangeL2.position).multiplyScalar(1.18);
              }
              if (obj.subSolar.visible) {
                // Sub-solar point on the planet surface, at the
                // longitude where the Sun is directly overhead.
                obj.subSolar.position.set(ux * planet.size3, uy * planet.size3, uz * planet.size3);
              }
              if (obj.magnetosphere?.visible) {
                // Orient the magnetotail along the anti-sun axis —
                // the ellipsoid's long axis (scale Z=2.4) points
                // AWAY from the Sun. lookAt() points the local Z
                // toward the given world coordinate; passing planet
                // position - sun-direction = planet position +
                // anti-sun-direction gives the right orientation.
                obj.magnetosphere.lookAt(
                  group.position.x - ux,
                  group.position.y - uy,
                  group.position.z - uz,
                );
              }
            }
          }

          // Phase H — overlay arrow updates. Group is at planet's world
          // pos; arrows live in the group's local frame, so directions
          // need transforming back from world space.
          //
          // Close-zoom polish (2026-06-03): at heliocentric framing the
          // arrows use log-scaled lengths optimised for cross-system
          // comparison. When the camera focuses on a single planet
          // those same lengths overshoot the planet sphere with the
          // base hidden INSIDE the silhouette and labels sitting on
          // top of the planet's body. The `closeZoom` lerp below
          // smoothly transitions to a planet-relative pose: arrow
          // base offset just outside the selection halo, length
          // compacted to ~1.5× planet radius, labels follow the new
          // tip.
          const ov = overlayPerPlanet[idx];
          if (!ov) return;
          if (ov.gravity.visible || ov.centripetal.visible || ov.velocity.visible) {
            // World vector pointing planet → Sun (origin), normalised.
            const worldToSun = new THREE.Vector3(
              -group.position.x,
              -group.position.y,
              -group.position.z,
            );
            const dist = worldToSun.length();
            if (dist > 0.0001) {
              worldToSun.divideScalar(dist);

              // Distance ratio drives the wide→close lerp. Same
              // threshold the moon-reveal + 4K LOD already use.
              mesh.getWorldPosition(tmpWorldPos);
              const camRatio = camera.position.distanceTo(tmpWorldPos) / planet.size3;
              const tWide = Math.max(
                0,
                Math.min(
                  1,
                  (camRatio - PLANET_LOD_IN_RATIO) / (PLANET_LOD_OUT_RATIO - PLANET_LOD_IN_RATIO),
                ),
              );
              // Close-zoom presentation: base just past the selection
              // halo (1.18× radius), length ~1.5× planet radius — so
              // the whole arrow sits in the empty space between the
              // planet's silhouette and the inner moon ring.
              const closeBase = planet.size3 * 1.3;
              const closeLen = planet.size3 * 1.5;
              // Label sprites are built at worldScale=14 (constant
              // world units). At close zoom that's wider than the
              // planet itself; lerp scale down so labels stay
              // readable but proportional. Aspect 4:1 preserved.
              const labelScale = 4 + (14 - 4) * tWide;
              // Arrow head ratios — at close zoom the default
              // 0.22 / 0.13 made the cone ~1/5 of planet diameter.
              // Halve them at close zoom.
              const headRatio = 0.11 + (0.22 - 0.11) * tWide;
              const headWidthRatio = 0.065 + (0.13 - 0.065) * tWide;

              // Group has only translation (no rotation), so world dir
              // == local dir — pass directly to setDirection.
              if (ov.gravity.visible) {
                // Acceleration in m/s² at this orbit radius (use a as proxy
                // for r — circular). Length log-scaled to fit the 1/r²
                // dynamic range across Mercury → Pluto.
                const aAU = Math.pow(planet.period, 2 / 3);
                const aG = gravityAccel(BODY_MASS_KG.sun, aAU * 149_597_870.7);
                const wideLen = logScaleLength(aG, 6, 26, 1e-7, 1e-2);
                const len = closeLen + (wideLen - closeLen) * tWide;
                const base = closeBase * (1 - tWide);
                ov.gravity.setDirection(worldToSun);
                ov.gravity.position.copy(worldToSun).multiplyScalar(base);
                ov.gravity.setLength(len, len * headRatio, len * headWidthRatio);
                // Label sits past the arrow tip = base + length, +20%
                // overshoot so the arrow head doesn't occlude the text.
                ov.gravityLabel.position.copy(worldToSun).multiplyScalar(base + len * 1.2);
                ov.gravityLabel.scale.set(labelScale, labelScale * 0.25, 1);
              }
              if (ov.centripetal.visible) {
                // Same direction (inward) as gravity — for a circular
                // orbit, gravity provides exactly the centripetal
                // acceleration (F = ma). Y-offset prevents overlap.
                const aAU = Math.pow(planet.period, 2 / 3);
                const aG = gravityAccel(BODY_MASS_KG.sun, aAU * 149_597_870.7);
                const wideLen = logScaleLength(aG, 5, 22, 1e-7, 1e-2);
                const len = closeLen + (wideLen - closeLen) * tWide;
                const base = closeBase * (1 - tWide);
                ov.centripetal.setDirection(worldToSun);
                ov.centripetal.position.copy(worldToSun).multiplyScalar(base);
                ov.centripetal.setLength(len, len * headRatio, len * headWidthRatio);
                ov.centripetalLabel.position.copy(worldToSun).multiplyScalar(base + len * 1.2);
                // Lift label by the same Y offset as the arrow base so
                // it tracks the arrow's offset position. At close zoom
                // the offset is smaller (proportional to the now
                // shorter overall length).
                ov.centripetalLabel.position.y += planet.size3 * (0.6 + tWide * 1.0);
                ov.centripetalLabel.scale.set(labelScale, labelScale * 0.25, 1);
              }
              if (ov.velocity.visible) {
                // Tangent to orbit, in the planet's orbital plane. Cross
                // (worldToSun, orbital plane normal) gives the prograde
                // direction; for the small inclinations used here, we
                // approximate the plane normal as world-Y.
                const tangent = new THREE.Vector3()
                  .crossVectors(new THREE.Vector3(0, 1, 0), worldToSun)
                  .normalize();
                // Speed in km/s via vis-viva at r = a (circular).
                const aAU = Math.pow(planet.period, 2 / 3);
                const v = Math.sqrt((4 * Math.PI * Math.PI) / aAU) * 4.7404; // km/s
                // Linear scale on velocity, clamped for visibility.
                const wideLen = Math.min(20, Math.max(4, v * 0.3));
                const len = closeLen + (wideLen - closeLen) * tWide;
                const base = closeBase * (1 - tWide);
                ov.velocity.setDirection(tangent);
                ov.velocity.position.copy(tangent).multiplyScalar(base);
                ov.velocity.setLength(len, len * headRatio, len * headWidthRatio);
                ov.velocityLabel.position.copy(tangent).multiplyScalar(base + len * 1.2);
                ov.velocityLabel.scale.set(labelScale, labelScale * 0.25, 1);
              }
            }
          }
        });

        // Small bodies — closed ellipse advance for dwarfs/comets,
        // pinned-to-perihelion for interstellar visitors (Oumuamua).
        // Comet tails recompute per-frame pointing anti-solar.
        smallBodyObjs.forEach(({ mesh, pickAid, tail, body }) => {
          const { x: px, y: py, z: pz } = smallBodyPosition(body, simT);
          mesh.position.set(px, py, pz);
          pickAid.position.set(px, py, pz);

          if (tail) {
            // 3D anti-solar tail: take the body's heliocentric position
            // vector, normalise it, and extend by tailLen so the comet
            // tail points away from the Sun in full 3D — important now
            // that y is non-zero for inclined orbits.
            const dist = Math.hypot(px, py, pz);
            if (dist > 0) {
              const tailLen = 12;
              const ux = px / dist;
              const uy = py / dist;
              const uz = pz / dist;
              const tx = px + ux * tailLen;
              const ty = py + uy * tailLen;
              const tz = pz + uz * tailLen;
              tail.geometry.dispose();
              tail.geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(px, py, pz),
                new THREE.Vector3(tx, ty, tz),
              ]);
            }
          }
        });

        // Track selected planet with the 3D selection halo — a thin
        // BackSide sphere that reads as a soft glow on the silhouette.
        // Sized just outside the per-planet atmospheric halo (1.06×
        // size3) so the two don't overlap at close zoom; at wide
        // heliocentric framing it's still visually distinct against
        // the starfield. Opacity pulses to communicate "selected".
        if (selectedId) {
          const selObj = planetObjs.find((o) => o.planet.id === selectedId);
          if (selObj) {
            // Sprite is camera-facing — set scale by planet diameter
            // ×1.25 so the ring sits just outside the silhouette with
            // a small visual margin. Sprite uses x/y scale only (z is
            // ignored for billboards). The sprite canvas is 256² with
            // the ring at radius 120 = 47 % of canvas; combined with
            // the 1.25× sprite scale the ring lands at ~0.94× planet
            // radius from the centre on screen — flush with the limb
            // with a thin bright outline.
            const diam = selObj.planet.size3 * 2.5;
            selHalo.scale.set(diam, diam, 1);
            selHalo.position.copy(selObj.group.position);
            const pulse = 0.5 + 0.5 * Math.sin(simT * 80);
            selRingMat.opacity = 0.55 + pulse * 0.35;
            selHalo.visible = true;
          } else {
            selHalo.visible = false;
          }
        } else {
          selHalo.visible = false;
        }

        renderer.render(scene, camera);
      } else {
        draw2d();
      }
    };
    animate(performance.now());

    cleanup = () => {
      cancelAnimationFrame(rafId);
      stopReducedMotionWatch();
      stopLensWatch?.();
      stopHoverLayerWatch?.();
      stopExploreGravityLayer?.();
      stopExploreVelocityLayer?.();
      stopExploreCentripetalLayer?.();
      stopExploreGalaxiesLayer?.();
      stopExploreHillSphereLayer?.();
      stopExploreLagrangeLayer?.();
      stopExploreMagnetosphereLayer?.();
      stopExploreSubSolarLayer?.();
      stopExplorePlanetStatsLayer?.();
      localGroup.dispose();
      el3d.removeEventListener('mousedown', on3dMouseDown);
      window.removeEventListener('mousemove', on3dMouseMove);
      window.removeEventListener('mouseup', on3dMouseUp);
      el3d.removeEventListener('wheel', on3dWheel);
      el3d.removeEventListener('touchstart', on3dTouchStart);
      el3d.removeEventListener('touchmove', on3dTouchMove);
      el3d.removeEventListener('touchend', on3dTouchEnd);
      el3d.removeEventListener('mousemove', onHover);
      el3d.removeEventListener('mouseleave', onHoverLeave);
      c2.removeEventListener('wheel', on2dWheel);
      c2.removeEventListener('mousedown', on2dMouseDown);
      window.removeEventListener('mouseup', on2dMouseUp);
      window.removeEventListener('mousemove', on2dMouseMove);
      c2.removeEventListener('touchstart', on2dTouchStart);
      c2.removeEventListener('touchmove', on2dTouchMove);
      c2.removeEventListener('touchend', on2dTouchEnd);
      window.removeEventListener('resize', onResize);
      disposeScene(scene);
      // #287 — dispose lazy-loaded 4K textures that are held in
      // closures / per-planet state. disposeScene walks the scene
      // graph, but a planet's `lod.tex4k` may have been loaded
      // without ever being assigned to material.map (user zoomed
      // close but the texture finished loading after the camera
      // pulled back), and the Sun's 4K texture lives outside the
      // PLANETS loop. Without these explicit disposes those
      // textures stay resident in GPU memory after route teardown.
      sunMap4k?.dispose();
      for (const obj of planetObjs) {
        obj.lod?.tex4k?.dispose();
      }
      renderer.dispose();
      el3d.remove();
    };
  });

  onDestroy(() => {
    cleanup?.();
  });

  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }
</script>

<svelte:head><title>{m.explore_page_title()}</title></svelte:head>

<div class="explore">
  <div
    class="layer"
    bind:this={container}
    class:hidden={view !== '3d'}
    role="region"
    aria-label={m.explore_canvas_aria_3d()}
  ></div>
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d'}
    aria-label={m.explore_canvas_aria_2d()}
  ></canvas>

  <!-- PRD-023 Slice E.2 — Earth-comparison ghost. Always-on at
       planet focus; hidden at heliocentric framing and on Earth
       itself (you don't compare Earth to Earth). Bottom-right
       corner so it doesn't collide with the HUD cluster or panel. -->
  {#if focusedOnPlanet && selectedId && selectedId !== 'earth' && focusedStats}
    <div class="earth-compare" aria-hidden="true">
      <img src="{base}/textures/2k_earth_daymap.1x1.jpg" alt="" loading="lazy" decoding="async" />
      <div class="earth-compare-label">
        EARTH FOR SCALE<br />
        <span class="ratio">{focusedStats.diameterRatioEarth.toFixed(2)}× diameter</span>
      </div>
    </div>
  {/if}

  <!-- PRD-023 Slice E.4 — Tactical-scan overlay. Surface gravity,
       atmospheric pressure, rotation period. Lens-gated by the
       'planet-stats' layer. Only when also focused on a planet. -->
  {#if focusedOnPlanet && statsOverlayOn && selectedId && focusedStats}
    <div class="tactical-scan" aria-hidden="true">
      <div class="scan-eyebrow">TACTICAL SCAN · {selectedId.toUpperCase()}</div>
      <div class="scan-row">
        <span class="scan-label">GRAVITY</span>
        <span class="scan-value">{focusedStats.surfaceGravityG.toFixed(2)} g</span>
      </div>
      <div class="scan-row">
        <span class="scan-label">ATMOSPHERE</span>
        <span class="scan-value">
          {focusedStats.atmoBar === 0
            ? 'none'
            : focusedStats.atmoBar < 0.01
              ? `${(focusedStats.atmoBar * 1000).toFixed(2)} mbar`
              : focusedStats.atmoBar < 10
                ? `${focusedStats.atmoBar.toFixed(2)} bar`
                : `${focusedStats.atmoBar.toFixed(0)} bar`}
        </span>
      </div>
      <div class="scan-row">
        <span class="scan-label">ROTATION</span>
        <span class="scan-value">
          {#if focusedRotationHours !== null}
            {Math.abs(focusedRotationHours) < 48
              ? `${Math.abs(focusedRotationHours).toFixed(2)} h`
              : `${(Math.abs(focusedRotationHours) / 24).toFixed(1)} d`}
            {focusedRotationHours < 0 ? '· retrograde' : ''}
          {/if}
        </span>
      </div>
      <div class="scan-row">
        <span class="scan-label">DIAMETER</span>
        <span class="scan-value">{focusedStats.diameterKm.toLocaleString()} km</span>
      </div>
    </div>
  {/if}

  <!-- HUD controls cluster (top-left). Two rows: mode toggles
       (2D/3D + SIZES) and visibility-layer chips. Sits on the
       opposite side of the detail panel so they never collide. -->
  <div class="hud-controls" role="group" aria-label={m.ui_view_controls()}>
    <div class="ctrl-row">
      <button
        class="toggle"
        type="button"
        onclick={toggleView}
        aria-pressed={view === '2d'}
        data-testid="explore-view-toggle"
      >
        {view === '3d' ? m.ui_view_2d() : m.ui_view_3d()}
      </button>
      <button
        class="toggle sizes-toggle"
        type="button"
        onclick={() => (sizesOpen = !sizesOpen)}
        aria-pressed={sizesOpen}
        aria-label={m.explore_sizes_toggle()}
        data-testid="sizes-toggle"
      >
        {m.explore_sizes_toggle()}
      </button>
      {#if selectedId || selectedSmallBodyId}
        <button
          class="toggle"
          type="button"
          onclick={() => {
            selectedId = null;
            selectedSmallBodyId = null;
            panelOpen = false;
            sunPanelOpen = false;
            smallBodyPanelOpen = false;
            flyToBodyFn?.(null);
          }}
          data-testid="explore-reset-view"
        >
          RESET VIEW
        </button>
      {/if}
    </div>
    <div class="ctrl-row chips" role="group" aria-label={m.ui_visibility_layers()}>
      <button
        type="button"
        class="chip"
        class:active={layers.planets}
        aria-pressed={layers.planets}
        onclick={() => (layers.planets = !layers.planets)}
        data-testid="layer-planets"
        title={m.explore_layer_tip_planets()}
      >
        {m.ui_layer_planets()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layers.dwarfs}
        aria-pressed={layers.dwarfs}
        onclick={() => (layers.dwarfs = !layers.dwarfs)}
        data-testid="layer-dwarfs"
        title={m.explore_layer_tip_dwarfs()}
      >
        {m.ui_layer_dwarfs()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layers.comets}
        aria-pressed={layers.comets}
        onclick={() => (layers.comets = !layers.comets)}
        data-testid="layer-comets"
        title={m.explore_layer_tip_comets()}
      >
        {m.ui_layer_comets()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layers.interstellar}
        aria-pressed={layers.interstellar}
        onclick={() => (layers.interstellar = !layers.interstellar)}
        data-testid="layer-interstellar"
        title={m.explore_layer_tip_interstellar()}
      >
        {m.ui_layer_interstellar_short()}
      </button>
    </div>
  </div>

  {#if sizesOpen}
    <!-- Size comparison overlay — modal-style, mirrors selected planet
         (if any) so the user keeps context. ESC + backdrop click close. -->
    <button
      type="button"
      class="sizes-backdrop"
      aria-label={m.explore_sizes_close()}
      onclick={() => (sizesOpen = false)}
    ></button>
    <div class="sizes-card" role="dialog" aria-modal="true" aria-label={m.explore_sizes_toggle()}>
      <button
        type="button"
        class="sizes-close"
        aria-label={m.explore_sizes_close()}
        onclick={() => (sizesOpen = false)}>×</button
      >
      <div class="sizes-canvas-wrap">
        <SizesCanvas highlightId={selectedId} />
      </div>
    </div>
  {/if}

  {#if hoverData && view === '3d' && tooltipVisible}
    <div
      class="tooltip"
      class:expanded={tooltipExpanded}
      role="status"
      aria-live="polite"
      aria-label="{hoverData.name} — {hoverData.velocity}, {hoverData.distance}, {hoverData.extras}"
      style:left="{Math.min(hoverData.x + 14, (container?.clientWidth ?? 0) - 220)}px"
      style:top="{Math.max(hoverData.y - 60, 60)}px"
    >
      {#if tooltipExpanded}
        <!-- Lens-on expanded card. The cursor-tracking tooltip can't be
             clicked-through (mouse leaves the planet immediately on
             entry into the card area), so we drop the ScienceChip info
             icons and surface only the live numbers. Users navigate to
             /science via the lens banner instead. -->
        <div class="tt-eyebrow">{hoverData.name.toUpperCase()}</div>
        <div class="tt-row">
          <span class="tt-key">SPEED</span>
          <span class="tt-val">{hoverData.velocityKms.toFixed(2)} km/s</span>
        </div>
        <div class="tt-row">
          <span class="tt-key">DIST</span>
          <span class="tt-val">
            {hoverData.distanceAU.toFixed(3)} AU ·
            {(hoverData.distanceAU * 8.317).toFixed(1)} l-min
          </span>
        </div>
        <div class="tt-row">
          <span class="tt-key">ECC</span>
          <span class="tt-val">{hoverData.eccentricity.toFixed(3)}</span>
        </div>
        <div class="tt-row">
          <span class="tt-key">INCL</span>
          <span class="tt-val">{hoverData.inclinationDeg.toFixed(1)}°</span>
        </div>
      {:else}
        <div class="tt-line">{hoverData.velocity}</div>
        <div class="tt-line dim">{hoverData.distance}</div>
        <div class="tt-line dim">{hoverData.extras}</div>
      {/if}
    </div>
  {/if}
</div>

<PlanetPanel
  planet={selectedPlanet}
  open={panelOpen}
  onClose={closePanel}
  onPlanMission={selectedPlanet?.missionable ? onPlanMission : undefined}
/>

<SunPanel sun={localizedSun} open={sunPanelOpen} onClose={closeSunPanel} />

<SmallBodyPanel
  body={selectedSmallBody}
  open={smallBodyPanelOpen}
  onClose={() => (smallBodyPanelOpen = false)}
/>

<!-- Unified Science Lens panel — lens story + layer toggles in one
     collapse. Replaces the previous two-panel arrangement (banner +
     layers) per the v0.6 Science-Lens UX pass. /explore wires four
     layers: hover-cards (lens-on tooltip expansion), gravity (per-
     planet arrow toward Sun), velocity (tangent), centripetal (paired
     inward arrow). SoI and apsides are omitted — planets render on
     circular orbits at this visual scale, so apsides degenerate to
     single points and SoIs are sub-pixel. -->
<ScienceLayersPanel
  title="Heliocentric view · ecliptic plane"
  body="Every planet's orbit is an ellipse with the Sun at one focus. Same five Keplerian numbers (size, shape, tilt, orientation, position) describe each one — same six laws move them."
  tab="orbits"
  section="keplerian-orbit"
  available={[
    'hover',
    'gravity',
    'velocity',
    'centripetal',
    'galaxies',
    'hill-sphere',
    'lagrange-points',
    'magnetosphere',
    'sub-solar',
    'planet-stats',
  ]}
/>

<style>
  .explore {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
  }
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    /* Disable native touch gestures (scroll, pinch-zoom of the page) so
       the canvas owns single-finger orbit + two-finger pinch. */
    touch-action: none;
  }
  .layer.hidden {
    display: none;
  }
  :global(.explore canvas) {
    display: block;
  }
  /* PRD-023 Slice E.2 — Earth comparison ghost. Bottom-right corner. */
  .earth-compare {
    position: fixed;
    bottom: 16px;
    left: 16px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px 6px 6px;
    background: rgba(8, 10, 22, 0.6);
    border: 1px solid rgba(75, 156, 211, 0.25);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: none;
  }
  .earth-compare img {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: block;
  }
  .earth-compare-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1.4px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.4;
  }
  .earth-compare-label .ratio {
    color: rgba(255, 255, 255, 0.9);
    font-size: 10px;
    letter-spacing: 1.2px;
  }
  @media (max-width: 600px) {
    .earth-compare {
      bottom: 8px;
      left: 8px;
      padding: 4px 8px 4px 4px;
    }
    .earth-compare img {
      width: 24px;
      height: 24px;
    }
  }
  /* PRD-023 Slice E.4 — Tactical scan overlay. Bottom-center, between
     the layer chips and the detail panel on desktop. */
  .tactical-scan {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    min-width: 220px;
    padding: 8px 14px;
    background: rgba(8, 10, 22, 0.7);
    border: 1px solid rgba(78, 205, 196, 0.35);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: none;
    font-family: 'Space Mono', monospace;
  }
  .scan-eyebrow {
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(78, 205, 196, 0.85);
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(78, 205, 196, 0.15);
  }
  .scan-row {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 2px 0;
    font-size: 11px;
  }
  .scan-label {
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 1.3px;
    font-size: 9px;
  }
  .scan-value {
    color: rgba(255, 255, 255, 0.92);
    font-weight: 700;
  }
  @media (max-width: 600px) {
    .tactical-scan {
      min-width: 180px;
      bottom: 56px;
      padding: 6px 10px;
    }
    .scan-row {
      font-size: 10px;
    }
  }
  /* HUD controls cluster — top-left, opposite the detail panel.
     Two rows (mode toggles + visibility chips). Stays under the nav
     but always above the canvas. Pinned to the left so it never
     collides with the right-drawer detail panel on desktop. */
  .hud-controls {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 16px;
    z-index: 35;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none; /* children re-enable */
  }
  .ctrl-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    pointer-events: auto;
  }
  .ctrl-row.chips {
    /* Layer chips stack vertically so their on/off state reads as a
       compact left-edge column rather than a wide horizontal strip.
       align-items: stretch so all chips on the page render at the
       same width regardless of label length. */
    flex-direction: column;
    align-items: stretch;
  }
  .toggle {
    min-width: 44px;
    min-height: 44px;
    padding: 0 14px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.06em;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      border-color 120ms,
      background 120ms;
  }
  .toggle:hover,
  .toggle:focus-visible {
    border-color: #4466ff;
    background: rgba(20, 26, 50, 0.95);
    outline: none;
  }

  /* Layer chips — always-visible visibility toggles. Inactive chips
     are dim outlines; active chips are filled with the teal accent
     so the on-state is obvious. 32 px tall keeps them subordinate to
     the 44 px primary toggles above. */
  .chip {
    min-height: 32px;
    /* Fixed min-width keeps all four chips aligned to a single column
       width regardless of label length, so the stack reads as a tidy
       on/off rail rather than a ragged list. */
    min-width: 110px;
    padding: 0 10px;
    background: rgba(8, 10, 22, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.55);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-align: center;
    border-radius: 999px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      border-color 120ms,
      background 120ms,
      color 120ms;
  }
  .chip:hover,
  .chip:focus-visible {
    color: #fff;
    border-color: rgba(78, 205, 196, 0.6);
    outline: none;
  }
  .chip.active {
    background: rgba(78, 205, 196, 0.18);
    border-color: rgba(78, 205, 196, 0.7);
    color: #4ecdc4;
  }
  .chip.active:hover,
  .chip.active:focus-visible {
    color: #fff;
    background: rgba(78, 205, 196, 0.32);
    border-color: #4ecdc4;
  }

  /* Chip rail wraps as soon as we leave desktop. Was gated on 500 px
     which only kicked in for phone-narrow widths — anyone resizing a
     desktop browser between 501–768 still saw the vertical column. */
  @media (max-width: 768px) {
    .ctrl-row.chips {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      max-width: calc(100vw - 24px);
    }
  }

  /* Mobile: shrink the chip row so 4 chips fit comfortably at 375 px,
     and tighten the cluster's left gutter. */
  @media (max-width: 500px) {
    .hud-controls {
      left: 8px;
      top: calc(var(--nav-height) + 8px);
      gap: 6px;
    }
    .toggle {
      padding: 0 10px;
      font-size: 12px;
    }
    .chip {
      padding: 0 8px;
      font-size: 9px;
      letter-spacing: 1.2px;
      min-height: 30px;
    }
  }

  .sizes-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2, 4, 12, 0.78);
    backdrop-filter: blur(4px);
    z-index: 60;
    border: 0;
    cursor: pointer;
    /* Reset button defaults so it behaves as a click target only. */
    padding: 0;
    margin: 0;
  }
  .sizes-card {
    position: fixed;
    z-index: 61;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(8, 10, 22, 0.96);
    border: 1px solid rgba(68, 102, 255, 0.4);
    border-radius: 8px;
    padding: 18px 18px 14px;
    width: min(640px, calc(100vw - 48px));
    max-height: calc(100vh - 48px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  }
  .sizes-close {
    position: absolute;
    top: 8px;
    right: 10px;
    background: transparent;
    border: 0;
    color: rgba(255, 255, 255, 0.6);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }
  .sizes-close:hover,
  .sizes-close:focus-visible {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
    outline: none;
  }
  .sizes-canvas-wrap {
    width: 100%;
    /* The diorama renders Jupiter at maxVR ≈ 70 px tall; total
       content fills ~320 px (header + bodies + 2 label rows + source).
       A rectangular 16:9-ish frame avoids the bottom-half emptiness
       that came with the previous 540 px container. */
    aspect-ratio: 16 / 7;
    max-height: calc(100vh - 110px);
  }
  .sizes-canvas-wrap :global(canvas) {
    width: 100%;
    height: 100%;
  }

  .tooltip {
    position: absolute;
    z-index: 24;
    min-width: 170px;
    pointer-events: none;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(68, 102, 255, 0.5);
    border-radius: 4px;
    padding: 8px 12px;
    font-family: 'Space Mono', monospace;
    backdrop-filter: blur(6px);
  }
  /* Lens-on expanded card: gold border (matches the lens family) +
     pointer-events enabled so users can click the science chips
     into /science. */
  .tooltip.expanded {
    pointer-events: auto;
    min-width: 220px;
    border-color: rgba(255, 200, 80, 0.6);
    padding: 10px 12px 8px;
  }
  .tt-line {
    font-size: 9px;
    line-height: 1.5;
    color: rgba(230, 235, 255, 0.85);
  }
  .tt-line.dim {
    color: rgba(255, 255, 255, 0.5);
    font-size: 8px;
  }
  .tt-eyebrow {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 13px;
    letter-spacing: 2px;
    color: rgba(255, 200, 80, 0.92);
    margin-bottom: 6px;
    border-bottom: 1px solid rgba(255, 200, 80, 0.18);
    padding-bottom: 4px;
  }
  .tt-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    font-size: 9px;
    line-height: 1.55;
  }
  .tt-row + .tt-row {
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    padding-top: 2px;
  }
  .tt-key {
    color: rgba(255, 255, 255, 0.55);
    letter-spacing: 1px;
    font-size: 8px;
    display: inline-flex;
    align-items: baseline;
  }
  .tt-val {
    color: rgba(255, 255, 255, 0.92);
  }
</style>
