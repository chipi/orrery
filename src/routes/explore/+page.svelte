<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { createLayeredStarField } from '$lib/three/star-field';
  import { createSceneRenderer } from '$lib/three/scene-renderer';
  import {
    resolveQualitySync,
    kickOffBackgroundDetect,
    resolveQualitySource,
    type QualityConfig,
    type QualityTier,
  } from '$lib/quality/quality-tier';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { Line2 } from 'three/examples/jsm/lines/Line2.js';
  import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
  import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
  import RenderingDebugRegistrar from '$lib/components/RenderingDebugRegistrar.svelte';
  import QualitySettingsModal from '$lib/components/QualitySettingsModal.svelte';
  import type { QualitySource } from '$lib/components/debug-panel-context';
  import { disposeScene } from '$lib/three/dispose-object3d';
  import { createAnimateLoop } from '$lib/three/animate-loop';
  import { createRouteLifecycle } from '$lib/three/route-lifecycle';
  import {
    buildIconicTrajectory,
    type IconicTrajectoryData,
    type IconicTrajectoryHandle,
  } from '$lib/three/iconic-trajectory';
  import { getPlanets, getSun, getMissionIndex, getMission } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import { createIconicSelectionService } from './iconic-selection.svelte';
  import { auToPx } from '$lib/scale';
  import { earthPos, outboundArc, type Vec2 } from '$lib/orbital/mission-arc';
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
  import SatellitePanel from '$lib/components/SatellitePanel.svelte';
  import BeltPanel from '$lib/components/BeltPanel.svelte';
  import MissionPanel from '$lib/components/MissionPanel.svelte';
  import { agencyToLogoPaths } from '$lib/agency-logo';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import { audio } from '$lib/audio-state.svelte';
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
  import { getLocale } from '$lib/paraglide/runtime';

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
     * Used for Earth's city lights. Applied as MeshStandardMaterial's
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
     *  / USGS Astrogeology for outer-system bodies. Optional: bodies
     *  without a sourced texture (e.g. Uranus + Neptune moons today)
     *  fall back to a flat-coloured sphere via `fallbackColor`. */
    texture?: string;
    /** Hex colour for fallback rendering when `texture` is omitted.
     *  Required when `texture` is missing. Approximates the body's
     *  real visual hue (icy moons → off-white; Triton → pinkish-tan). */
    fallbackColor?: number;
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
          // 2026-06-03 user direction: "Small enough to be well
          // visible, where Ceres size is good reference." Ceres in
          // this scene renders at 1.8 units; Moon at 0.9 = half
          // Ceres so it reads as a sub-Ceres dot at wide zoom + a
          // clearly-smaller-than-Earth body at fly-to framing.
          sizeUnits: 0.9,
          // Real Moon-Earth distance / Earth radius ≈ 60. Compressed
          // 60 → 24 so the Moon clears Earth's silhouette by a body
          // diameter at post-fly-to framing; the fly-to landing
          // distance below is what was tuned (further than 6×) so
          // both Earth + Moon fit on screen at every orbital phase.
          orbitUnits: 24,
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
      // Five major Uranian moons — all named for Shakespeare /
      // Pope characters (the only system with that convention).
      // No equirectangular maps sourced today (Voyager 2's 1986
      // flyby imaged only the southern hemisphere of each, and
      // none have been re-imaged since); fallback colours
      // approximate their telescopic albedo + tint. #304 Slice 3.
      satellites: [
        {
          id: 'miranda',
          name: 'Miranda',
          fallbackColor: 0xb8b8c0,
          sizeUnits: 0.6,
          orbitUnits: 14,
          periodDays: 1.413,
          inclDeg: 4.34,
        },
        {
          id: 'ariel',
          name: 'Ariel',
          fallbackColor: 0xd4d4d4,
          sizeUnits: 0.95,
          orbitUnits: 20,
          periodDays: 2.52,
          inclDeg: 0.04,
        },
        {
          id: 'umbriel',
          name: 'Umbriel',
          fallbackColor: 0x8c8a86,
          sizeUnits: 0.95,
          orbitUnits: 26,
          periodDays: 4.144,
          inclDeg: 0.13,
        },
        {
          id: 'titania',
          name: 'Titania',
          fallbackColor: 0xc4b8a8,
          sizeUnits: 1.2,
          orbitUnits: 33,
          periodDays: 8.706,
          inclDeg: 0.08,
        },
        {
          id: 'oberon',
          name: 'Oberon',
          fallbackColor: 0xb8a898,
          sizeUnits: 1.15,
          orbitUnits: 40,
          periodDays: 13.463,
          inclDeg: 0.07,
        },
      ],
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
      // Triton — the only large moon of Neptune, retrograde, almost
      // certainly a captured KBO. Voyager 2's 1989 flyby imaged the
      // southern hemisphere; no global equirectangular map exists.
      // Fallback colour approximates the pinkish-tan tholin terrain.
      // #304 Slice 3.
      satellites: [
        {
          id: 'triton',
          name: 'Triton',
          // USGS Voyager 2 global color mosaic (1989 flyby), 600m/px
          // upstream, downsampled to 1024×512 — see scripts/fetch-
          // satellite-textures.mjs. Fallback retained for pre-load.
          texture: '2k_triton.jpg',
          fallbackColor: 0xd4b8a0,
          sizeUnits: 1.5,
          orbitUnits: 22,
          // Negative period = retrograde orbit (only large moon to
          // do so in the solar system).
          periodDays: -5.877,
          inclDeg: 156.86,
        },
      ],
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
    type: 'dwarf' | 'comet' | 'interstellar' | 'asteroid' | 'kbo';
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
  // Phase 31 (#342) — "throne of glory" default on touch devices.
  // Mirror of /fly Phase 25: on (hover: none) devices the cinematic
  // canvas lands chrome-free; a floating ◐ button top-left expands
  // the hud-controls cluster back. Desktop / mouse devices default
  // to visible chrome (no behavioural change). One-shot at module
  // init — user's toggle wins thereafter.
  let hudCollapsed = $state(false);
  function toggleHud() {
    hudCollapsed = !hudCollapsed;
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches) {
    hudCollapsed = true;
  }
  // Phase 33 + 34 (#342) — mobile info toggle. Phase 27 hid the
  // informational overlays (.tactical-scan + .paths-legend) on
  // narrow viewports to give the canvas breathing room. This toggle
  // surfaces them on demand so the data isn't actually lost —
  // mobile users tap "i" to read the planet stats / trajectory roster
  // and tap again to dismiss. Desktop is unaffected (the toggle
  // button + CSS gate both honour (hover: none)).
  let mobileInfoOpen = $state(false);
  function toggleMobileInfo() {
    mobileInfoOpen = !mobileInfoOpen;
  }
  let localizedPlanets: LocalizedPlanet[] = $state([]);
  let localizedSun: LocalizedSun | null = $state(null);
  let selectedId: string | null = $state(null);

  // ─── Consolidated panel / layer / camera state (Action 7, #326) ──
  // Replaced 11 standalone $state bools previously scattered between
  // lines 699..1205. Three typed bags + a single reset funnel make
  // the surface easier to scan and impossible to half-reset on
  // route exit or canvas-clear.

  /** Detail-panel toggles — closed all-at-once by `resetExplorePanelState`. */
  let panelState = $state({
    planet: false,
    sun: false,
    sizes: false,
    smallBody: false,
    satellite: false,
    belt: false,
  });

  // Iconic-mission selection — service factory consolidates the old
  // `pathsLegendSelectedId` / `pathsLegendMission` / `highlightedMissionId`
  // / `panelState.pathsLegend` quartet into a single $state object with
  // action methods. See `./iconic-selection.svelte.ts` for the contract.
  // Idiomatic Svelte 5 pattern (per docs §"$state in classes / modules":
  // mutate-not-reassign on the shared object).
  const iconic = createIconicSelectionService();

  /** Visibility-layer master toggles (NOT the per-body layer flags —
   *  those live in `layers` further down). */
  let layerState = $state({
    lens: false,
    hover: false,
    statsOverlay: false,
  });

  /** `focusedOnPlanet` flips true when the camera transition into a
   *  selected planet completes — gates gravity / atmo / temp overlay
   *  rows so they only paint after the camera settles. */
  let cameraState = $state({
    focusedOnPlanet: false,
  });

  /** Close every detail panel in one call. */
  function resetExplorePanelState(): void {
    panelState.planet = false;
    panelState.sun = false;
    panelState.sizes = false;
    panelState.smallBody = false;
    panelState.satellite = false;
    panelState.belt = false;
    // Iconic-mission selection (panel + selectedId + hoveredId + pending
    // debounce timer) is owned by the service — single reset() call.
    iconic.reset();
  }

  // Roving keyboard nav for the iconic-mission legend — mirrors /iss.
  // Up/Down move the highlight (wrapping at both ends), Home/End jump to
  // first/last, Esc clears.
  //
  // Arrows move DOM FOCUS ONLY — the committed selection (is-selected)
  // and the open panel stay put while you traverse. Each focused row's
  // onfocus sets hoveredId so the arc + tagline preview where you are
  // without committing. Enter/Space commit via the native button onclick
  // → selectMission.
  let legendRowEls: HTMLButtonElement[] = [];

  function onLegendKeydown(e: KeyboardEvent, i: number): void {
    if (e.key === 'Escape') {
      iconic.reset();
      return;
    }
    const n = PATHS_LEGEND.length;
    if (n === 0) return;
    let next: number;
    if (e.key === 'ArrowDown') next = (i + 1) % n;
    else if (e.key === 'ArrowUp') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    // Focus only — selection is committed on Enter/click, not on move.
    legendRowEls[next]?.focus();
  }

  let selectedSmallBodyId: string | null = $state(null);

  // Tour / single-episode collaboration (PRD-016 §S11 / RFC-019 §12):
  // when a detail panel opens during ACTIVE audio playback (full tour
  // OR a single-episode play), collapse the audio overlay to compact
  // mode so the panel the narrator just opened is fully visible.
  // 2026-06-19 — was gated on `audio.tourActive` only, so single-
  // episode previews (the most common entry point) kept the overlay
  // at full width and the panel sat behind it. User report: "tour does
  // not go to compact mode and overlays details panel".
  $effect(() => {
    if (
      audio.currentEpisode &&
      audio.open &&
      (panelState.planet || panelState.sun || panelState.smallBody) &&
      !audio.compact
    ) {
      audio.compact = true;
    }
  });
  let selectedSmallBody = $derived(
    selectedSmallBodyId ? (smallBodyById.get(selectedSmallBodyId) ?? null) : null,
  );

  // Natural-satellite selection (#304 Slice 1). Each satellite is
  // uniquely keyed by `${parentPlanetId}:${satelliteId}` to keep
  // collisions impossible if two parents ever share a moon name.
  let selectedSatelliteKey: string | null = $state(null);

  // Belt selection (v0.7.x — user feedback 2026-06-06). One of
  // 'asteroid' | 'kuiper'; opens the BeltPanel via the same pickAid
  // raycast path the planets / small bodies use.
  let selectedBeltId: string | null = $state(null);

  // ─── Layers (issue #32) ──────────────────────────────────────────
  // Four toggleable visibility layers — Sun is always on (centre of
  // the scene). All default to true so first paint matches today.
  // Runtime-only state per CLAUDE.md (no localStorage).
  let layers = $state({
    planets: true,
    dwarfs: true,
    comets: true,
    interstellar: true,
    // PATHS — iconic spacecraft trajectories (#306). Default OFF so the
    // heliocentric view doesn't open visually busy; user opts in via
    // the chip, or the Curator Tour toggles it on at the relevant beat.
    paths: false,
  });
  // Time playback (#351 Layer 1) — user control over the live `simT`
  // clock that propagates planets, moons, and small bodies. The pills
  // are days-per-second (matching the guide-explore narration: "one day
  // per second, ten days, a hundred"); 1× ≡ 1 day/sec. This layer
  // governs the EXISTING synthetic clock only — real-calendar anchoring
  // (date readout, "Today") is Layer 2. prefers-reduced-motion still
  // wins as the hard freeze (ADR-025), independent of `simPaused`.
  const SIM_SPEEDS = [1, 10, 100] as const; // days per second
  const DAYS_PER_YEAR = 365.25; // simT is in years; pills are days/sec
  let simSpeed = $state(10);
  let simPaused = $state(false);
  // #351 Layer 2-B — give the clock a real calendar meaning WITHOUT
  // touching the (artistic) a0 start angles. Convention: simT=0 ≡ the
  // page-load day. The chip shows the running simulated date; clicking it
  // resets the clock to today. Layer 2-A (real J2000 longitudes) is a
  // separate, revertible swap of the 8 a0 constants on top of this.
  let simDateLabel = $state('');
  let resetSimToToday: (() => void) | null = null;
  // ESC closes the sizes overlay. Using a window listener here (gated
  // by panelState.sizes) so the dialog is keyboard-dismissible without a
  // svelte:window element inside the {#if} block, which prettier
  // doesn't like nested.
  $effect(() => {
    if (!panelState.sizes) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') panelState.sizes = false;
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
    /** Discriminator: planets + small bodies use vis-viva tooltip; the
     *  Lagrange-points layer uses a different schema (no orbital speed
     *  of its own — it co-orbits with the planet). When set, the
     *  template renders the lagrange-specific layout. */
    kind?: 'planet' | 'small-body' | 'lagrange';
    /** Lagrange-only — short physics blurb + notable occupants. */
    lagrangeTitle?: string;
    lagrangeBlurb?: string;
    lagrangeNotable?: string;
    x: number;
    y: number;
  } | null = $state(null);
  // Hover-card lens state: when both the master lens AND the 'hover'
  // layer are on, the tooltip expands with click-through chips into
  // /science. When the lens is off, the tooltip behaves as it always
  // did (always-on terse text). When the lens is on but the 'hover'
  // layer is off, the tooltip is hidden — letting users opt for a
  // fully clean view of the scene.
  let stopLensWatch: (() => void) | undefined;
  let stopHoverLayerWatch: (() => void) | undefined;
  let tooltipVisible = $derived(hoverData !== null && (!layerState.lens || layerState.hover));
  let tooltipExpanded = $derived(layerState.lens && layerState.hover);
  let cleanup: (() => void) | undefined;
  // Audio-tour camera-control listener teardown — set inside onMount
  // where camR / camT closures live, called from the main cleanup
  // block at unmount so we don't leak listeners on route change.
  let tourCameraTeardown: (() => void) | undefined;
  // Iconic trajectory handles (#306 Slice A). Populated inside onMount
  // after the scene mounts; exposed at component scope so the layers
  // toggle effect can flip visibility without touching the scene
  // directly.
  let iconicTrajectoryHandles: IconicTrajectoryHandle[] = [];
  // PATHS layer visibility binding.
  $effect(() => {
    const visible = layers.paths;
    for (const h of iconicTrajectoryHandles) h.setVisible(visible);
  });

  // PATHS legend roster — color + display name + mission_id for each
  // iconic trajectory. Hard-coded (mirrors ICONIC_TRAJECTORY_IDS +
  // colors in static/data/trajectories/<id>.json) to avoid a second
  // fetch round-trip just for the legend swatches. The orbiter-tour
  // variants (cassini-tour, galileo-tour, juno-tour) share colors +
  // mission with the main entry, so they don't get separate rows.
  // Sorted oldest → newest by launch date. Entries are paired with the
  // mission's primary agency so the legend renders the same logo
  // affordance as /missions cards (via agencyToLogoPaths). Voyager 2
  // (Aug 1977) shipped ~2 weeks before Voyager 1 (Sep 1977) — same
  // year, ordered by actual launch date so the chronology reads
  // cleanly top-to-bottom.
  const PATHS_LEGEND = [
    {
      mission_id: 'pioneer-10',
      color: '#f97583',
      name: 'Pioneer 10',
      launch_year: 1972,
      agency: 'NASA',
    },
    {
      mission_id: 'pioneer-11',
      color: '#ff7b72',
      name: 'Pioneer 11',
      launch_year: 1973,
      agency: 'NASA',
    },
    {
      mission_id: 'voyager-2',
      color: '#4ecdc4',
      name: 'Voyager 2',
      launch_year: 1977,
      agency: 'NASA',
    },
    {
      mission_id: 'voyager-1',
      color: '#ffa657',
      name: 'Voyager 1',
      launch_year: 1977,
      agency: 'NASA',
    },
    {
      mission_id: 'venera-13',
      color: '#da4453',
      name: 'Venera 13',
      launch_year: 1981,
      agency: 'Roscosmos',
    },
    {
      mission_id: 'vega-1',
      color: '#ed5565',
      name: 'Vega 1',
      launch_year: 1984,
      agency: 'Roscosmos / ESA',
    },
    {
      mission_id: 'vega-2',
      color: '#ec87c0',
      name: 'Vega 2',
      launch_year: 1984,
      agency: 'Roscosmos / ESA',
    },
    {
      mission_id: 'giotto',
      color: '#5d9cec',
      name: 'Giotto',
      launch_year: 1985,
      agency: 'ESA',
    },
    {
      mission_id: 'galileo',
      color: '#a5d6a7',
      name: 'Galileo',
      launch_year: 1989,
      agency: 'NASA',
    },
    {
      mission_id: 'ulysses',
      color: '#aab2bd',
      name: 'Ulysses',
      launch_year: 1990,
      agency: 'ESA / NASA',
    },
    {
      mission_id: 'cassini',
      color: '#d2a8ff',
      name: 'Cassini-Huygens',
      launch_year: 1997,
      agency: 'NASA / ESA',
    },
    {
      mission_id: 'rosetta',
      color: '#fc6e51',
      name: 'Rosetta',
      launch_year: 2004,
      agency: 'ESA',
    },
    {
      mission_id: 'new-horizons',
      color: '#ffd33d',
      name: 'New Horizons',
      launch_year: 2006,
      agency: 'NASA',
    },
    {
      mission_id: 'dawn',
      color: '#b392f0',
      name: 'Dawn',
      launch_year: 2007,
      agency: 'NASA',
    },
    {
      mission_id: 'juno',
      color: '#79c0ff',
      name: 'Juno',
      launch_year: 2011,
      agency: 'NASA',
    },
    {
      mission_id: 'hayabusa2',
      color: '#b2e066',
      name: 'Hayabusa2',
      launch_year: 2014,
      agency: 'JAXA',
    },
    {
      mission_id: 'bepicolombo',
      color: '#fcbb6d',
      name: 'BepiColombo',
      launch_year: 2018,
      agency: 'ESA / JAXA',
    },
    {
      mission_id: 'juice',
      color: '#967bdc',
      name: 'JUICE',
      launch_year: 2023,
      agency: 'ESA',
    },
  ];
  // Iconic-mission tagline lookup — one-line "why it's iconic" copy
  // surfaced as an italic subtitle under each legend row. Keys are in
  // messages/*.json under `explore_iconic_tagline_<mission_id>`. The
  // mapping is hand-rolled because Paraglide's tree-shake only sees
  // statically-referenced message functions.
  function iconicTagline(missionId: string): string {
    switch (missionId) {
      case 'pioneer-10':
        return m.explore_iconic_tagline_pioneer_10();
      case 'pioneer-11':
        return m.explore_iconic_tagline_pioneer_11();
      case 'voyager-2':
        return m.explore_iconic_tagline_voyager_2();
      case 'voyager-1':
        return m.explore_iconic_tagline_voyager_1();
      case 'venera-13':
        return m.explore_iconic_tagline_venera_13();
      case 'vega-1':
        return m.explore_iconic_tagline_vega_1();
      case 'vega-2':
        return m.explore_iconic_tagline_vega_2();
      case 'giotto':
        return m.explore_iconic_tagline_giotto();
      case 'galileo':
        return m.explore_iconic_tagline_galileo();
      case 'ulysses':
        return m.explore_iconic_tagline_ulysses();
      case 'cassini':
        return m.explore_iconic_tagline_cassini();
      case 'rosetta':
        return m.explore_iconic_tagline_rosetta();
      case 'new-horizons':
        return m.explore_iconic_tagline_new_horizons();
      case 'dawn':
        return m.explore_iconic_tagline_dawn();
      case 'juno':
        return m.explore_iconic_tagline_juno();
      case 'hayabusa2':
        return m.explore_iconic_tagline_hayabusa2();
      case 'bepicolombo':
        return m.explore_iconic_tagline_bepicolombo();
      case 'juice':
        return m.explore_iconic_tagline_juice();
      default:
        return '';
    }
  }

  // Arc-highlight effect — pushes the live "highlighted trajectory" id
  // into each iconic-trajectory handle's setHighlight. The id is the
  // hovered mission when one is hovered, falling back to the selected
  // mission so the user always sees which path the open panel is for.
  // setHighlight is a Three.js side effect (third-party library write),
  // which is the canonical $effect use case per the Svelte 5 docs.
  $effect(() => {
    const id = iconic.state.hoveredId ?? iconic.state.selectedId;
    for (const h of iconicTrajectoryHandles) h.setHighlight(h.missionId === id);
  });

  // ─── Mission overlay (Theme A.A1 — v0.1.10 / issue #16) ──────────
  // When `/explore?mission=ID` is loaded, fetch the mission and
  // compute its outbound arc once. Rendered as a 2D Canvas line in
  // draw2d (3D rendering is stretch — deferred to a follow-up).
  let overlayMission: Mission | null = $state(null);
  let overlayArcPx: { x: number; z: number }[] = $state([]);
  let overlayArrivalPx: { x: number; z: number } | null = $state(null);

  // DebugPanel "Rendering" tab bridge (#334). Filled in onMount after
  // the renderer + composer + bloom pass are built; null until then.
  let liveRenderer: THREE.WebGLRenderer | null = $state(null);
  let liveQuality: QualityConfig | null = $state(null);
  let liveQualitySource: QualitySource = $state('fallback');
  let liveBloomPass: UnrealBloomPass | null = $state(null);
  // QualitySettingsModal bridge (#339). Shown from first paint with a
  // 'medium' default; onMount updates it to the actually-resolved tier.
  let activeQualityTier: QualityTier = $state('medium');
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
  // overlays. `cameraState.focusedOnPlanet` is set true when the camera
  // completes a fly-to a planet, false on Reset View / Sun selection.
  // Drives the Earth-comparison ghost (E.2, always-on at focus) and
  // the tactical stats overlay (E.4, lens-gated). See `cameraState`
  // declaration near the top of the script.

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
    /** Atmospheric composition shorthand — chemistry symbols are
     *  universal so this string can stay English (matches the rest of
     *  the tactical-scan label convention). */
    atmoComposition: string;
    /** Mean surface temperature in kelvin (1-bar level for gas giants). */
    surfaceTempK: number;
    /** Maximum sustained surface wind in m/s. 0 for airless bodies. */
    maxWindMs: number;
    /** Escape velocity at the equator in km/s. */
    escapeKms: number;
    /** Surface kind — informs the tactical scan's SURFACE row. */
    surfaceKind: 'rocky' | 'rocky-liquid' | 'rocky-ice' | 'gas-giant' | 'ice-giant';
    /** Radiation category — informs spaceship approach decisions. */
    radiation: 'shielded' | 'moderate' | 'high' | 'extreme';
  };
  const PLANET_STATS: Record<string, PlanetStats> = {
    mercury: {
      diameterKm: 4880,
      diameterRatioEarth: 0.38,
      surfaceGravityG: 0.38,
      atmoBar: 0,
      atmoComposition: 'Na · K · O · H exosphere (trace)',
      surfaceTempK: 440,
      maxWindMs: 0,
      escapeKms: 4.3,
      surfaceKind: 'rocky',
      radiation: 'extreme',
    },
    venus: {
      diameterKm: 12104,
      diameterRatioEarth: 0.95,
      surfaceGravityG: 0.91,
      atmoBar: 92,
      atmoComposition: 'CO₂ 96.5% · N₂ 3.5% · H₂SO₄ cloud deck',
      surfaceTempK: 737,
      maxWindMs: 1,
      escapeKms: 10.4,
      surfaceKind: 'rocky',
      radiation: 'shielded',
    },
    earth: {
      diameterKm: 12742,
      diameterRatioEarth: 1.0,
      surfaceGravityG: 1.0,
      atmoBar: 1.0,
      atmoComposition: 'N₂ 78% · O₂ 21% · Ar 0.9%',
      surfaceTempK: 288,
      maxWindMs: 50,
      escapeKms: 11.2,
      surfaceKind: 'rocky-liquid',
      radiation: 'shielded',
    },
    mars: {
      diameterKm: 6779,
      diameterRatioEarth: 0.53,
      surfaceGravityG: 0.38,
      atmoBar: 0.006,
      atmoComposition: 'CO₂ 95% · N₂ 2.8% · Ar 2%',
      surfaceTempK: 210,
      maxWindMs: 30,
      escapeKms: 5.0,
      surfaceKind: 'rocky',
      radiation: 'high',
    },
    jupiter: {
      diameterKm: 139820,
      diameterRatioEarth: 10.97,
      surfaceGravityG: 2.53,
      atmoBar: 1,
      atmoComposition: 'H₂ 90% · He 10% · NH₃/H₂O/CH₄ clouds',
      surfaceTempK: 165,
      maxWindMs: 100,
      escapeKms: 59.5,
      surfaceKind: 'gas-giant',
      radiation: 'extreme',
    },
    saturn: {
      diameterKm: 116460,
      diameterRatioEarth: 9.14,
      surfaceGravityG: 1.07,
      atmoBar: 1,
      atmoComposition: 'H₂ 96% · He 3% · CH₄/NH₃ clouds',
      surfaceTempK: 134,
      maxWindMs: 500,
      escapeKms: 35.5,
      surfaceKind: 'gas-giant',
      radiation: 'high',
    },
    uranus: {
      diameterKm: 50724,
      diameterRatioEarth: 3.98,
      surfaceGravityG: 0.89,
      atmoBar: 1,
      atmoComposition: 'H₂ 83% · He 15% · CH₄ 2.3%',
      surfaceTempK: 76,
      maxWindMs: 250,
      escapeKms: 21.3,
      surfaceKind: 'ice-giant',
      radiation: 'moderate',
    },
    neptune: {
      diameterKm: 49244,
      diameterRatioEarth: 3.86,
      surfaceGravityG: 1.14,
      atmoBar: 1,
      atmoComposition: 'H₂ 80% · He 19% · CH₄ 1.5%',
      surfaceTempK: 72,
      maxWindMs: 580,
      escapeKms: 23.5,
      surfaceKind: 'ice-giant',
      radiation: 'moderate',
    },
    pluto: {
      diameterKm: 2376,
      diameterRatioEarth: 0.19,
      surfaceGravityG: 0.06,
      atmoBar: 1e-6,
      atmoComposition: 'N₂ + CH₄ + CO (~10 μbar, sublimates)',
      surfaceTempK: 44,
      maxWindMs: 0,
      escapeKms: 1.2,
      surfaceKind: 'rocky-ice',
      radiation: 'shielded',
    },
  };
  let focusedStats = $derived(selectedId ? (PLANET_STATS[selectedId] ?? null) : null);

  // Satellite stats for the Earth-for-scale widget when a moon is
  // selected. Real diameters in km. Keyed by satellite id (without
  // the parent-planet prefix used in selectedSatelliteKey). Only
  // diameter info is needed today — the tactical-scan overlay still
  // gates on `cameraState.focusedOnPlanet` so the gravity / atmo / temp rows
  // stay planet-only. Earth = 12 742 km.
  const SATELLITE_STATS: Record<string, { diameterKm: number; diameterRatioEarth: number }> = {
    moon: { diameterKm: 3474, diameterRatioEarth: 0.273 },
    phobos: { diameterKm: 22.4, diameterRatioEarth: 0.00176 },
    deimos: { diameterKm: 12.4, diameterRatioEarth: 0.00097 },
    io: { diameterKm: 3643, diameterRatioEarth: 0.286 },
    europa: { diameterKm: 3122, diameterRatioEarth: 0.245 },
    ganymede: { diameterKm: 5268, diameterRatioEarth: 0.413 },
    callisto: { diameterKm: 4821, diameterRatioEarth: 0.378 },
    titan: { diameterKm: 5150, diameterRatioEarth: 0.404 },
    enceladus: { diameterKm: 504, diameterRatioEarth: 0.04 },
    miranda: { diameterKm: 471, diameterRatioEarth: 0.037 },
    ariel: { diameterKm: 1158, diameterRatioEarth: 0.091 },
    umbriel: { diameterKm: 1169, diameterRatioEarth: 0.092 },
    titania: { diameterKm: 1577, diameterRatioEarth: 0.124 },
    oberon: { diameterKm: 1523, diameterRatioEarth: 0.12 },
    triton: { diameterKm: 2706, diameterRatioEarth: 0.212 },
  };
  let focusedSatelliteStats = $derived.by(() => {
    if (!selectedSatelliteKey) return null;
    const satId = selectedSatelliteKey.split(':')[1] ?? '';
    return SATELLITE_STATS[satId] ?? null;
  });
  let focusedRotationHours = $derived(
    selectedId ? (PLANETS.find((p) => p.id === selectedId)?.rotationHours ?? null) : null,
  );
  // PRD-023 Slice E.1 — light-time from Sun + current Earth distance.
  // Uses semi-major axes from `planetById` (the localised planet
  // catalogue) — same source the velocity tooltip uses. 8.317 min =
  // light-time of 1 AU (IAU 2012).
  let focusedLightTime = $derived.by(() => {
    if (!selectedId) return null;
    const planet = planetById.get(selectedId);
    if (!planet) return null;
    const earth = planetById.get('earth');
    const lminSun = planet.a * 8.317;
    // Earth-distance: |a_planet − a_earth| as a coarse mean. Real
    // Earth distance varies wildly through synodic period but this
    // matches /explore's constant-r-orbit visualisation.
    const lminEarth = earth ? Math.abs(planet.a - earth.a) * 8.317 : null;
    return { fromSunMin: lminSun, fromEarthMin: lminEarth };
  });

  // Plumbed into the 3D scene's RAF tween from inside onMount once
  // the planetObjs array is built. Top-level selectPlanet / selectSun
  // wrappers call through so the camera flies to the target body when
  // the user picks one — without this the camera was stuck looking at
  // the Sun, and per-planet 4K LOD swaps (#287) never fired for
  // anything past Mercury. See `focusOnBody` inside onMount.
  let flyToBodyFn: ((bodyId: string | null) => void) | null = null;

  // Panel mutex: each select* below opens its own panel and explicitly
  // closes the four other planet/sun/smallBody/satellite/belt panels.
  // The full `resetExplorePanelState()` funnel is deliberately NOT used
  // here — it would also close the iconic-mission panel + the sizes
  // overlay, which should remain open across a body selection so the
  // user can pick a body while the legend / sizes overlay stays up.

  function selectPlanet(id: string) {
    selectedId = id;
    panelState.planet = true;
    panelState.sun = false;
    panelState.smallBody = false;
    panelState.satellite = false;
    panelState.belt = false;
    flyToBodyFn?.(id);
  }

  function selectSun() {
    panelState.sun = true;
    panelState.planet = false;
    panelState.smallBody = false;
    panelState.satellite = false;
    panelState.belt = false;
    flyToBodyFn?.(null);
  }

  function selectSmallBody(id: string) {
    selectedSmallBodyId = id;
    panelState.smallBody = true;
    panelState.planet = false;
    panelState.sun = false;
    panelState.satellite = false;
    panelState.belt = false;
  }

  // Natural-satellite selection (#304 Slice 1). Compound key
  // `${parentPlanetId}:${satelliteId}` so e.g. selecting Charon
  // reads as `"pluto:charon"` — the data layer can split on `:`
  // when looking up the parent body. Same panel-mutex pattern as
  // the other select* — only one detail panel is ever open.
  function selectSatellite(parentPlanetId: string, satelliteId: string) {
    selectedSatelliteKey = `${parentPlanetId}:${satelliteId}`;
    panelState.satellite = true;
    panelState.planet = false;
    panelState.sun = false;
    panelState.smallBody = false;
    panelState.belt = false;
  }

  // Belt selection (v0.7.x). Same panel-mutex pattern.
  function selectBelt(id: string) {
    selectedBeltId = id;
    panelState.belt = true;
    panelState.planet = false;
    panelState.sun = false;
    panelState.smallBody = false;
    panelState.satellite = false;
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
    } else if (id === 'asteroid-belt' || id === 'belt:asteroid') {
      selectBelt('asteroid');
    } else if (id === 'kuiper-belt' || id === 'belt:kuiper') {
      selectBelt('kuiper');
    } else if (id.includes(':')) {
      const [parent, sat] = id.split(':', 2);
      if (parent && sat && planetById.has(parent)) selectSatellite(parent, sat);
    }
    // Unknown id → no-op; do not crash.
  });

  // #306 deep-link from MissionPanel "See path on /explore" — `?paths=1`
  // auto-activates the PATHS layer so users land with the iconic
  // trajectories already visible. `?focus=saturn` additionally selects
  // Saturn so the Cassini orbital tour is in view at panel zoom.
  $effect(() => {
    const paths = $page.url.searchParams.get('paths');
    const focus = $page.url.searchParams.get('focus');
    if (paths === '1') layers.paths = true;
    if (focus && planetById.has(focus)) selectPlanet(focus);
  });

  function closePanel() {
    panelState.planet = false;
  }

  function closeSunPanel() {
    panelState.sun = false;
  }

  function onPlanMission() {
    if (selectedPlanet?.missionable) {
      goto(`${base}/plan`);
    }
  }

  onMount(() => {
    if (!container || !canvas2d) return;

    // Single registry for every listener + disposable this scene
    // owns. The bottom-of-onMount cleanup block drains it LIFO. See
    // $lib/three/route-lifecycle.
    const lifecycle = createRouteLifecycle();

    // Hover-card lens subscriptions. Both signals start in browser only,
    // so they're safe inside onMount. When either flips we re-derive
    // tooltip visibility / expansion via the existing $derived above.
    stopLensWatch = onScienceLensChange((on) => {
      layerState.lens = on;
    });
    stopHoverLayerWatch = onLayerChange('hover', (on) => {
      layerState.hover = on;
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
    // Quality tier (URL ?quality=… > user choice > cached detect-gpu >
    // medium fallback). Sync resolver so the scene builds without
    // awaiting the GPU benchmark; the background detect updates the
    // cache for the next visit. See lib/quality/quality-tier.ts.
    const url = new URL(window.location.href);
    const quality = resolveQualitySync(url);
    void kickOffBackgroundDetect();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    // ACES filmic tone mapping — HDR Sun → SDR roll-off so bright
    // highlights (bloomed Sun + lit planet sides) don't clip to flat
    // white. Matches the /fly helio scene's stack (#322).
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    // PRD-023 Slice A — enable shadow maps for Saturn's ring-shadow
    // effect. PCFSoftShadowMap is the cheap default; we scope the
    // perf cost by setting castShadow only on the ring mesh and
    // receiveShadow only on Saturn's planet mesh. Other planets +
    // moons + small bodies don't participate so the 6 cube-map
    // passes the PointLight shadow pipeline does each frame render
    // ~2 objects total. The sun's PointLight is the shadow caster
    // since its position is the physical Sun in the scene.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const sunLight = new THREE.PointLight(0xfff4d0, 4.5, 2500, 1.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);
    // HemisphereLight replaces the prior AmbientLight(0x111133, 0.8) —
    // ambient at 0.8 was flattening shadow contrast (the #1 amateur-CG
    // tell per the shot-language guide). Hemisphere at 0.08 keeps the
    // shadow side legible without erasing the single-Sun direction.
    // Sky-side faint deep-space tint; ground-side near-black so the
    // underside doesn't pick up an unphysical glow.
    scene.add(new THREE.HemisphereLight(0x08101a, 0x000000, 0.08));
    const fill = new THREE.DirectionalLight(0x223366, 0.3);
    fill.position.set(-200, 100, -200);
    scene.add(fill);

    const textureLoader = new THREE.TextureLoader();
    // PBR migration (2026-06-15): MeshStandardMaterial expects albedo
    // textures to be tagged with `colorSpace = SRGBColorSpace` so the
    // engine de-gammas the sRGB-encoded JPGs into linear before
    // lighting math, then the renderer re-gammas at output. Without
    // this tag the texture is treated as already-linear, lighting
    // operates on the wrong values, and the output gamma pass produces
    // washed-out / desaturated colors. Applies to every albedo + every
    // emissive map; normal/roughness maps (which we don't have yet)
    // would stay Linear.
    const loadTexture = (file: string): THREE.Texture => {
      const tex = textureLoader.load(`${base}/textures/${file}`);
      // r128 API — colorSpace property was added in r152. The earlier
      // `tex.colorSpace = THREE.SRGBColorSpace` lines were silent no-ops
      // here (typeof THREE.SRGBColorSpace === 'undefined' in r128).
      tex.encoding = THREE.sRGBEncoding;
      return tex;
    };

    // Per-planet texture LOD swap (#287). 2K base loads eagerly so
    // the first paint of /explore stays cheap. 4K lazy-loads when the
    // camera approaches a planet (per-body distance threshold). Sun
    // gets the same treatment via its own pair below. Uranus +
    // Neptune skip LOD because SSS doesn't publish a 4K source for
    // either; they stay 2K eagerly.
    const SUN_RADIUS = 18;
    const PLANET_LOD_IN_RATIO = 15; // distance / planet_size ≤ this → swap to 4K + reveal moons
    const PLANET_LOD_OUT_RATIO = 20; // distance / planet_size ≥ this → swap back to 2K + hide moons
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
          // Sun map is rendered via MeshBasicMaterial (unlit) but
          // still benefits from sRGB tagging so the texture's
          // mid-tones don't shift when output gamma is applied.
          tex.encoding = THREE.sRGBEncoding;
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

    // Layered cinematic star field — dim background + bright sparkle +
    // Milky Way band, counts gated by quality tier so low-end devices
    // render fewer points. Shared with /fly + /iss + /tiangong; shell
    // radius matches /explore's wide stellar outer shell.
    scene.add(
      createLayeredStarField({
        counts: {
          dim: quality.starsDim,
          bright: quality.starsBright,
          milkyWay: quality.starsMilkyWay,
        },
        shellRadius: 3000,
      }),
    );

    // Post-processing — EffectComposer + RenderPass + (optional)
    // UnrealBloomPass. Bloom is tier-gated (medium+) so minimal/low
    // skips the extra blit on weaker GPUs. Sun glow is the marquee
    // beneficiary (already textured emissive — bloom amplifies it
    // without changing the underlying material). Selection halo +
    // material-based outline still work because the composer just
    // wraps the same scene.render call.
    const composer = new EffectComposer(renderer);
    composer.setSize(container.clientWidth, container.clientHeight);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    composer.addPass(new RenderPass(scene, camera));
    let bloomPass: UnrealBloomPass | null = null;
    if (quality.bloomEnabled) {
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        quality.bloomStrength,
        quality.bloomRadius,
        quality.bloomThreshold,
      );
      composer.addPass(bloomPass);
    }

    // Expose to the DebugPanel "Rendering" tab (#334) — the template-
    // mounted <RenderingDebugRegistrar> picks these up reactively.
    liveRenderer = renderer;
    liveQuality = quality;
    liveQualitySource = resolveQualitySource(url);
    liveBloomPass = bloomPass;
    activeQualityTier = quality.tier;

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
            ([...s.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % 360) *
            (Math.PI / 180),
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
        if (lod && obj.planet.texture4k) {
          if (ratio <= PLANET_LOD_IN_RATIO) {
            if (!lod.loadStarted) {
              lod.loadStarted = true;
              const file = obj.planet.texture4k;
              textureLoader.load(
                `${base}/textures/${file}`,
                (tex) => {
                  // PBR — tag as sRGB (matches the 2K load above) so
                  // the 4K swap doesn't shift hue/saturation when LOD
                  // crosses the in-threshold.
                  tex.encoding = THREE.sRGBEncoding;
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
          selectedSatelliteKey !== null && selectedSatelliteKey.startsWith(obj.planet.id + ':');
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
      if (reducedMotion || simPaused) return;
      // Same per-second time-compression as the planets (#351 Layer 1):
      // simSpeed days/sec → years/sec, so moons stay phase-locked to the
      // planet clock at every speed and freeze together on pause.
      const yrPerSec = simSpeed / DAYS_PER_YEAR;
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
    // PRD-023 Slice E.4 — tactical-scan overlay. DOM-driven (HUD
    // element below); just track the layer's on/off state in a
    // script-level $state so the template's {#if} reads it directly.
    const stopExplorePlanetStatsLayer = onLayerChange('planet-stats', (on) => {
      layerState.statsOverlay = on;
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
        // Land at 8× planet radius (was 3, bumped to 6 was still too
        // close per user feedback). For Earth (size3=5.2) that's
        // ~41.6 units of camR; Moon at orbitUnits=24 means the
        // camera-to-Moon distance stays in the 17.6 → 65.6 range
        // at every orbital phase, with both Earth + Moon comfortably
        // in frame and headroom to wheel-zoom in further. Still
        // inside the 15× LOD-in ratio so the 4K texture is in by
        // tween end.
        flyToR = next.planet.size3 * 8;
        flyToMinR = next.planet.size3 * 1.5;
        flyToMaxR = next.planet.size3 * 50;
        // Pose: look at the planet from roughly the same angle the user
        // had before (camP/camT carry over). For very oblique entries
        // we clamp camP into the legal envelope to avoid flipping.
        flyToP = Math.max(0.08, Math.min(Math.PI * 0.48, camP));
        flyToT = camT;
        focusedPlanetObj = next;
        cameraState.focusedOnPlanet = true;
      } else {
        flyToOrigin.set(0, 0, 0);
        flyToR = HELIO_DEFAULT_CAMR;
        flyToP = HELIO_DEFAULT_CAMP;
        flyToT = HELIO_DEFAULT_CAMT;
        flyToMinR = 60;
        flyToMaxR = 1400;
        focusedPlanetObj = null;
        cameraState.focusedOnPlanet = false;
      }
      flyStart = performance.now();
      flyActive = true;
    }

    // Exposed to the top-level selectPlanet / selectSun handlers.
    flyToBodyFn = focusOnBody;

    // ─── Audio-tour camera demos (PRD-016 §S11 / RFC-019 §12) ─────
    // The audio-tour executor dispatches `audio-stage-drag` and
    // `audio-stage-zoom` CustomEvents at scheduled positions so the
    // Curator narration "Drag to rotate" / "Scroll to zoom" beats
    // actually show camera motion, not just text overlays. Listeners
    // animate camT (azimuth) / camR (radius) over the requested ms.
    const exploreRoot = container?.parentElement; // .explore wrapper
    function easeInOut(t: number): number {
      return t * t * (3 - 2 * t);
    }
    function animateCamera(
      get: () => number,
      set: (v: number) => void,
      to: number,
      durationMs: number,
    ): void {
      const start = get();
      const startTime = performance.now();
      const step = (): void => {
        const t = Math.min(1, (performance.now() - startTime) / durationMs);
        set(start + (to - start) * easeInOut(t));
        updateCam();
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    const onTourDrag = (e: Event): void => {
      const d = (e as CustomEvent).detail as
        | { durationMs?: number; rotateRad?: number }
        | undefined;
      const rotate = d?.rotateRad ?? Math.PI / 3; // default ~60° azimuth swing
      animateCamera(
        () => camT,
        (v) => (camT = v),
        camT + rotate,
        d?.durationMs ?? 1500,
      );
    };
    const onTourZoom = (e: Event): void => {
      const d = (e as CustomEvent).detail as { durationMs?: number; factor?: number } | undefined;
      const factor = d?.factor ?? 0.55; // default zoom in to ~55% radius
      const target = Math.max(60, Math.min(1400, camR * factor));
      animateCamera(
        () => camR,
        (v) => (camR = v),
        target,
        d?.durationMs ?? 1500,
      );
    };
    exploreRoot?.addEventListener('audio-stage-drag', onTourDrag);
    exploreRoot?.addEventListener('audio-stage-zoom', onTourZoom);
    tourCameraTeardown = () => {
      exploreRoot?.removeEventListener('audio-stage-drag', onTourDrag);
      exploreRoot?.removeEventListener('audio-stage-zoom', onTourZoom);
    };

    const el3d = renderer.domElement;
    let isDrag3d = false;
    let isPan3d = false;
    let lmx3d = 0;
    let lmy3d = 0;
    let dragMoved3d = false;
    let downX3d = 0;
    let downY3d = 0;
    // Reused per-frame to avoid allocations inside the pan code path.
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();
    const camForward = new THREE.Vector3();

    const ray3d = new THREE.Raycaster();
    const planetMeshes = planetObjs.map((o) => o.mesh);
    const planetPickAids = planetObjs.map((o) => o.pickAid);
    const smallBodyMeshes = smallBodyObjs.map((o) => o.mesh);
    const smallBodyPickAids = smallBodyObjs.map((o) => o.pickAid);
    // Flatten satellite meshes across all planets — each moon mesh
    // already carries its own (invisible, larger-radius) pickAid as
    // a child, so adding the mesh alone is sufficient: ray.intersectObjects
    // with `recursive=true` would over-pick, but we use false everywhere,
    // so we collect both the satMesh + its pickAid explicitly. #304 Slice 1.
    const satelliteMeshes: THREE.Object3D[] = [];
    const satellitePickAids: THREE.Object3D[] = [];
    for (const po of planetObjs) {
      for (const sat of po.satellites) {
        satelliteMeshes.push(sat.mesh);
        for (const child of sat.mesh.children) {
          if (child instanceof THREE.Mesh && typeof child.userData?.satelliteId === 'string') {
            satellitePickAids.push(child);
          }
        }
      }
    }
    // Pickables: Sun (never selected planet), all planets, all small
    // bodies (visible mesh + invisible pickAid), all natural satellites
    // (visible mesh + invisible pickAid). The pickAid widens the click
    // target for tiny bodies so they're not effectively unclickable
    // at wide zoom. Raycaster respects `.visible: false`; the LAYERS
    // panel toggles both `mesh.visible` and `pickAid.visible` for
    // hidden bodies so they can't be selected when filtered out.
    const pickables: THREE.Object3D[] = [
      ...planetMeshes,
      ...planetPickAids,
      sunMesh,
      ...smallBodyMeshes,
      ...smallBodyPickAids,
      ...satelliteMeshes,
      ...satellitePickAids,
      // Belt pick-aids appended LAST so a planet/body always wins the
      // raycast tie-break — the asteroid belt overlaps the inner orbit
      // ribbon for Vesta + Ceres, and the Kuiper Belt overlaps Pluto's
      // orbit. Belts are the fallback target, not the primary.
      asteroidBeltPick,
      kuiperBeltPick,
    ];

    // ── Iconic spacecraft trajectories (#306 A+B+C) ──────────────────
    // Voyager 1+2 (A, B), Pioneer 10+11 + New Horizons (C), plus the
    // beyond-Mars catalog rounds (Galileo, Juno, Cassini, Dawn) all
    // fetched async; built once each JSON resolves; groups hidden by
    // default per layers.paths default. The $effect at component scope
    // binds visibility to the PATHS chip toggle. The Today marker on
    // each handle is the click target — opens the matching mission
    // record on /missions when picked.
    const ICONIC_TRAJECTORY_IDS = [
      'voyager-1',
      'voyager-2',
      'pioneer-10',
      'pioneer-11',
      'new-horizons',
      'galileo',
      'juno',
      'cassini',
      'dawn',
      // Global expansion 2026-06-07 (#306) — ESA / Roscosmos / JAXA
      // iconic-mission roster across comet / asteroid / Sun + en-route
      // Mercury / Jupiter destinations.
      'rosetta',
      'vega-1',
      'vega-2',
      'venera-13',
      'giotto',
      'hayabusa2',
      'juice',
      'bepicolombo',
      'ulysses',
    ] as const;
    // Trajectory build is the worst init long task on /explore — each
    // call creates ~5-20 sprites + CanvasTextures, and the 18-trajectory
    // roster (vetted via perf-explore-iconic-clicks.spec.ts on 2026-06-19,
    // baseline_5s.worstMs ≈ 1.5 s before this fix) was firing all the
    // builds back-to-back inside a single microtask queue → ~1.5 s
    // synchronous block. Fetches still go out in parallel (network is
    // cheap + concurrent) but the SYNC build calls are interleaved with
    // frame yields, so each frame stays under the 16 ms budget instead
    // of one frame eating the whole roster.
    const trajectoryDataPromises = ICONIC_TRAJECTORY_IDS.map((id) =>
      fetch(`${base}/data/trajectories/${id}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<IconicTrajectoryData>) : null))
        .catch(() => null),
    );
    void (async () => {
      for (let i = 0; i < ICONIC_TRAJECTORY_IDS.length; i++) {
        const data = await trajectoryDataPromises[i];
        if (!data) continue;
        const handle = buildIconicTrajectory({
          data,
          auToPx,
          width: container?.clientWidth ?? window.innerWidth,
          height: container?.clientHeight ?? window.innerHeight,
          visible: layers.paths,
        });
        scene.add(handle.group);
        iconicTrajectoryHandles.push(handle);
        pickables.push(handle.clickTarget);
        // Yield to the event loop — separates each build into its own
        // macrotask so the browser can render + process input between
        // builds instead of starving for the whole roster's duration.
        await new Promise((r) => setTimeout(r, 0));
      }
    })();

    // Orbiter-tour loops (cassini-tour, galileo-tour, juno-tour)
    // intentionally NOT loaded. The planet-anchored orbital rings made
    // the PATHS layer hard to read — too many concentric loops crowding
    // the giants. Heliocentric polylines alone tell the story; the
    // user can deep-link into a mission's panel for the orbital tour
    // detail. Keep buildOrbiterTour module around if we want to bring
    // them back behind a separate chip later.

    const tryPick3d = (e: MouseEvent) => {
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3d.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      // First: solar-system pickables (planets / Sun / small bodies)
      const hits = ray3d.intersectObjects(pickables, false);
      // Two-pass selection: a planet's wide pick-aid (sized 2.5× the
      // visible body for wide-zoom click forgiveness) can swallow the
      // inner moons of giant planets — Io + Europa orbit inside
      // Jupiter's pick-aid sphere, Enceladus inside Saturn's, Miranda
      // inside Uranus's. The raycaster's nearest hit was always the
      // pick-aid, so the inner moons were unclickable. Prefer "real"
      // hits (visible mesh / explicit marker / non-pickAid) over the
      // wide pickAid spheres; fall back to a pickAid hit if nothing
      // specific was hit (preserving wide-zoom forgiveness).
      const isSelectable = (ud: Record<string, unknown>): boolean =>
        typeof ud.planetId === 'string' ||
        typeof ud.smallBodyId === 'string' ||
        typeof ud.satelliteId === 'string' ||
        typeof ud.beltId === 'string' ||
        ud.kind === 'iconic-trajectory-today' ||
        ud.kind === 'orbiter-tour-flyby';
      const hit =
        hits.find((h) => isSelectable(h.object.userData) && !h.object.userData.isPickAid) ??
        hits.find((h) => isSelectable(h.object.userData));
      if (hit) {
        const planetId = hit.object.userData.planetId as string | undefined;
        const smallBodyId = hit.object.userData.smallBodyId as string | undefined;
        const satelliteId = hit.object.userData.satelliteId as string | undefined;
        const parentPlanetId = hit.object.userData.parentPlanetId as string | undefined;
        const beltId = hit.object.userData.beltId as string | undefined;
        const trajectoryMissionId = hit.object.userData.missionId as string | undefined;
        if (planetId === '__sun__') selectSun();
        else if (planetId) selectPlanet(planetId);
        else if (smallBodyId) selectSmallBody(smallBodyId);
        else if (satelliteId && parentPlanetId) selectSatellite(parentPlanetId, satelliteId);
        else if (beltId) selectBelt(beltId);
        else if (
          (hit.object.userData.kind === 'iconic-trajectory-today' ||
            hit.object.userData.kind === 'orbiter-tour-flyby') &&
          trajectoryMissionId
        ) {
          // Iconic trajectory Today marker + orbiter-tour flyby marker
          // both open the mission's detail panel inline on /explore
          // instead of navigating away to /missions, so the camera +
          // scene state survives the click. Same MissionPanel surface
          // used by the PATHS legend rows.
          void iconic.openMission(trajectoryMissionId, localeFromPage($page));
        }
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
    const lagrangeMeshes: THREE.Object3D[] = [];
    for (const po of planetObjs) {
      lagrangeMeshes.push(po.lagrangeL1, po.lagrangeL2);
    }
    const hoverTargets: THREE.Object3D[] = [
      ...planetMeshes,
      ...smallBodyMeshes,
      ...smallBodyPickAids,
      ...lagrangeMeshes,
    ];
    const onHover = (e: MouseEvent) => {
      if (view !== '3d' || isDrag3d) {
        if (hoverData) hoverData = null;
        if (iconic.state.hoveredId) iconic.state.hoveredId = null;
        return;
      }
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray3dHover.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      // Trajectory-marker hover — set hoveredId so the matching path
      // goes bright. Independent of the tooltip hover path below:
      // trajectories don't surface a vis-viva tooltip, only a color-
      // brighten cue.
      if (layers.paths && iconicTrajectoryHandles.length > 0) {
        // All hover-able trajectory objects — Today markers + every
        // encounter sprite. Hover on any one of them brightens the
        // mission's full path + reveals every waypoint label.
        const trajTargets: THREE.Object3D[] = [];
        for (const h of iconicTrajectoryHandles) trajTargets.push(...h.hoverTargets);
        const trajHits = ray3dHover.intersectObjects(trajTargets, false);
        const newId = (trajHits[0]?.object.userData.missionId as string | undefined) ?? null;
        if (newId !== iconic.state.hoveredId) iconic.state.hoveredId = newId;
      } else if (iconic.state.hoveredId) {
        iconic.state.hoveredId = null;
      }
      const hits = ray3dHover.intersectObjects(hoverTargets, false);
      if (hits.length === 0) {
        if (hoverData) hoverData = null;
        return;
      }
      const planetId = hits[0].object.userData.planetId as string | undefined;
      const smallBodyId = hits[0].object.userData.smallBodyId as string | undefined;
      const lagrangeKind = hits[0].object.userData.lagrangeKind as 'L1' | 'L2' | undefined;
      const lagrangePlanetId = hits[0].object.userData.lagrangePlanetId as string | undefined;
      // Mean velocity via vis-viva at r=a; collapses to sqrt(μ/a).
      // μ ≈ 4π² in AU³/yr², 4.7404 km/s per AU/yr (IAU 2012).
      if (lagrangeKind && lagrangePlanetId) {
        // Lagrange-point tooltip — co-orbits with the parent planet, so
        // no independent velocity. Distance from the parent planet is
        // the Hill radius (rendered at) — sunward for L1, anti-sunward
        // for L2. Notable occupant string is only populated for the
        // points spaceflight has actually used (Sun–Earth L1 + L2).
        const planet = planetById.get(lagrangePlanetId);
        if (!planet) return;
        const planetName = planet.name;
        const hillMkm = planet.a * 149.5978707 * Math.cbrt(3e-6); // ~1.5 Mkm at Earth
        hoverData = {
          name: `${planetName} ${lagrangeKind}`,
          velocity: '',
          distance: '',
          extras: '',
          velocityKms: 0,
          distanceAU: planet.a,
          eccentricity: planet.e,
          inclinationDeg: planet.incl,
          kind: 'lagrange',
          lagrangeTitle:
            lagrangeKind === 'L1'
              ? m.explore_tt_lagrange_l1_title({ planet: planetName })
              : m.explore_tt_lagrange_l2_title({ planet: planetName }),
          lagrangeBlurb:
            lagrangeKind === 'L1'
              ? m.explore_tt_lagrange_l1_blurb({
                  planet: planetName,
                  mkm: hillMkm.toFixed(2),
                })
              : m.explore_tt_lagrange_l2_blurb({
                  planet: planetName,
                  mkm: hillMkm.toFixed(2),
                }),
          lagrangeNotable:
            lagrangePlanetId === 'earth'
              ? lagrangeKind === 'L1'
                ? m.explore_tt_lagrange_l1_notable_earth()
                : m.explore_tt_lagrange_l2_notable_earth()
              : '',
          x: e.clientX,
          y: e.clientY,
        };
      } else if (planetId) {
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
      iconic.state.hoveredId = null;
    };

    let mouseDownOnCanvas = false;
    const on3dMouseDown = (e: MouseEvent) => {
      mouseDownOnCanvas = true;
      isDrag3d = true;
      dragMoved3d = false;
      // Right-click OR Shift+left-click → pan instead of orbit
      // (2026-06-06 user note: "either we do not support moving things
      // left/right or I don't know how to do it"). Standard 3D-scene
      // convention used by Three.js OrbitControls, Blender, Unity etc.
      isPan3d = e.button === 2 || e.shiftKey;
      lmx3d = e.clientX;
      lmy3d = e.clientY;
      downX3d = e.clientX;
      downY3d = e.clientY;
      el3d.style.cursor = isPan3d ? 'move' : 'grabbing';
    };
    const on3dMouseMove = (e: MouseEvent) => {
      if (!isDrag3d) return;
      const dx = e.clientX - lmx3d;
      const dy = e.clientY - lmy3d;
      if (Math.abs(e.clientX - downX3d) + Math.abs(e.clientY - downY3d) > 4) {
        dragMoved3d = true;
      }
      if (isPan3d) {
        // Translate focusOrigin in the screen-aligned plane. Build the
        // camera's right + up basis from its world matrix so panning
        // tracks the user's view regardless of current orbit pose.
        // Speed proportional to camR (and tan(fov/2)) so a finger-
        // width of mouse motion shifts the scene by ~one finger-width
        // of world distance at every zoom level.
        //
        // 2026-06-15 bugfix: clear focusedPlanetObj at the start of
        // any pan. The animate-loop steady-state branch re-glues
        // focusOrigin to the focused planet's world position every
        // frame, which silently overwrote panning while a planet was
        // selected (user note: "I click shift, mouse icon does change
        // to move, but I am not moving the canvas"). A pan is an
        // explicit "I'm leaving this body" gesture — drop the focus so
        // the new focusOrigin sticks.
        if (focusedPlanetObj) {
          focusedPlanetObj = null;
          flyActive = false;
        }
        const scale = (camR * 2 * Math.tan((camera.fov * Math.PI) / 360)) / window.innerHeight;
        camera.matrixWorld.extractBasis(camRight, camUp, camForward);
        focusOrigin.addScaledVector(camRight, -dx * scale);
        focusOrigin.addScaledVector(camUp, dy * scale);
      } else {
        camT -= dx * 0.006;
        camP = Math.max(0.08, Math.min(Math.PI * 0.48, camP + dy * 0.005));
      }
      lmx3d = e.clientX;
      lmy3d = e.clientY;
      updateCam();
    };
    const on3dMouseUp = (e: MouseEvent) => {
      const wasDrag = dragMoved3d;
      const wasPan = isPan3d;
      const wasOnCanvas = mouseDownOnCanvas;
      isDrag3d = false;
      isPan3d = false;
      mouseDownOnCanvas = false;
      el3d.style.cursor = 'grab';
      // Pan release shouldn't open a planet panel — only orbit-mode
      // mouseup that didn't reach drag-threshold counts as a pick.
      // Also require the mousedown to have started on the canvas —
      // otherwise clicks on overlay buttons (panel tabs etc.) bubble
      // mouseup to the window-level listener and raycast through to
      // whatever 3D pickable happens to sit behind the cursor (e.g.
      // a Kuiper-Belt torus ring under a SatellitePanel LIBRARY tab).
      if (wasOnCanvas && !wasDrag && !wasPan && view === '3d') tryPick3d(e);
    };
    // Right-click on the canvas would otherwise pop the browser's
    // context menu; suppress so right-drag pan stays usable.
    const onContextMenu3d = (e: MouseEvent) => e.preventDefault();
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
    lifecycle.on(el3d, 'mousedown', on3dMouseDown);
    lifecycle.on(el3d, 'contextmenu', onContextMenu3d);
    lifecycle.on(window, 'mousemove', on3dMouseMove);
    lifecycle.on(window, 'mouseup', on3dMouseUp);
    // passive: false so on3dWheel can preventDefault against trackpad
    // pinch (macOS Ctrl+wheel) hijacking browser zoom.
    lifecycle.on(el3d, 'wheel', on3dWheel, { passive: false });
    lifecycle.on(el3d, 'touchstart', on3dTouchStart, { passive: true });
    lifecycle.on(el3d, 'touchmove', on3dTouchMove, { passive: true });
    lifecycle.on(el3d, 'touchend', on3dTouchEnd);
    lifecycle.on(el3d, 'mousemove', onHover);
    lifecycle.on(el3d, 'mouseleave', onHoverLeave);

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
    lifecycle.on(c2, 'wheel', on2dWheel, { passive: false });
    lifecycle.on(c2, 'mousedown', on2dMouseDown);
    lifecycle.on(window, 'mouseup', on2dMouseUp);
    lifecycle.on(window, 'mousemove', on2dMouseMove);
    lifecycle.on(c2, 'touchstart', on2dTouchStart, { passive: true });
    lifecycle.on(c2, 'touchmove', on2dTouchMove, { passive: true });
    lifecycle.on(c2, 'touchend', on2dTouchEnd);

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
      composer.setSize(container.clientWidth, container.clientHeight);
      bloomPass?.setSize(container.clientWidth, container.clientHeight);
      resize2d();
      // Iconic trajectories use Line2 with screen-pixel-aware
      // LineMaterial — push the new resolution so the stroke width
      // stays crisp after a viewport change.
      for (const h of iconicTrajectoryHandles) {
        h.onResize(container.clientWidth, container.clientHeight);
      }
      // Selection ring shares the same screen-pixel-width semantics —
      // push the new resolution so the 1.2px stroke stays exact after
      // a viewport resize / device-rotation.
      selRingMat.resolution.set(container.clientWidth, container.clientHeight);
    };
    lifecycle.on(window, 'resize', onResize);

    // ──────────────────────────────────────────────────────────────
    // Animation loop — dispatches by `view`
    // ──────────────────────────────────────────────────────────────

    let simT = 0;
    // #351 Layer 2-B — simT=0 anchors to the page-load day so the date
    // chip reads a real calendar date. The date label is reformatted only
    // when the integer day (or locale) actually changes, to avoid churn.
    const simEpochMs = Date.now();
    // #351 Layer 2-A — anchor the planet start-angles to the REAL sky.
    // Overwrite the artistic a0 with each planet's real heliocentric
    // ecliptic longitude for the page-load day: J2000 mean longitude +
    // mean motion (circular 2-body — approximate, a few degrees off for
    // the eccentric ones, consistent with the stylized orrery). simT=0
    // stays "today"; small bodies / starfield are untouched. Reverting
    // this whole block falls back to Layer 2-B's decorative angles.
    {
      const J2000_MS = Date.UTC(2000, 0, 1, 12);
      const MEAN_LON_J2000_DEG: Record<string, number> = {
        mercury: 252.25,
        venus: 181.98,
        earth: 100.46,
        mars: 355.43,
        jupiter: 34.4,
        saturn: 49.94,
        uranus: 313.23,
        neptune: 304.88,
        pluto: 238.93,
      };
      const yrSinceJ2000 = (simEpochMs - J2000_MS) / (DAYS_PER_YEAR * 86_400_000);
      for (const p of PLANETS) {
        const L0 = MEAN_LON_J2000_DEG[p.id];
        if (L0 === undefined) continue;
        const deg = (((L0 + (360 * yrSinceJ2000) / p.period) % 360) + 360) % 360;
        p.a0 = deg * (Math.PI / 180);
      }
    }
    let lastSimDayIndex = Number.NaN;
    let lastDateLocale = '';
    resetSimToToday = () => {
      simT = 0;
    };
    let lastTime = performance.now();
    let reducedMotion = false;
    const stopReducedMotionWatch = onReducedMotionChange((r) => {
      reducedMotion = r;
    });
    lifecycle.add(stopReducedMotionWatch);

    // raf pump with the TA.md document.hidden contract baked in. The
    // local `reducedMotion` flag still gates the per-frame sim-time
    // advance (ADR-025) — we don't hand it to createAnimateLoop's
    // reducedMotion option because user-initiated camera drag still
    // needs to update the render even when sim time is frozen.
    // Render-loop throttle counter — composer.render() is skipped on
    // 3 of every 4 frames when a right-side detail panel covers most
    // of the canvas. Positions + arc-highlight + selection halo all
    // update every frame; only the WebGL submission is skipped, so
    // the visible image holds for ~33 ms on a 120 Hz display and
    // ~67 ms on 60 Hz (below the perceptual flicker threshold for
    // /explore's slow orbital motion). The GPU bill drops to 25% and
    // the freed main-thread budget routes to MissionPanel re-renders
    // + the Svelte reactive cascade during the click-heavy mission-
    // browsing window. Verified by perf-explore-iconic-clicks.spec.ts
    // on 2026-06-20: hero-image-loaded validation 42 → 49 / 50,
    // panel-title-match 48 → 49 / 50 (both at the ceiling).
    let frameThrottleCount = 0;
    const loop = createAnimateLoop({
      onFrame: () => {
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        // ADR-025: when prefers-reduced-motion is set we freeze sim
        // time. User-initiated camera drag still works. #351 Layer 1:
        // `simPaused` is the user-facing pause; `simSpeed` (days/sec)
        // sets the rate. simT is years → divide by DAYS_PER_YEAR.
        if (!reducedMotion && !simPaused) simT += (dt * simSpeed) / DAYS_PER_YEAR;

        // #351 Layer 2-B — surface the simulated calendar date. Reformat
        // only when the day index or locale changes (cheap guard; the
        // formatter is the only per-change cost, never per-frame).
        const simDayIndex = Math.floor(
          (simEpochMs + simT * DAYS_PER_YEAR * 86_400_000) / 86_400_000,
        );
        const dateLocale = getLocale();
        if (simDayIndex !== lastSimDayIndex || dateLocale !== lastDateLocale) {
          lastSimDayIndex = simDayIndex;
          lastDateLocale = dateLocale;
          simDateLabel = new Intl.DateTimeFormat(dateLocale, {
            year: 'numeric',
            month: 'short',
            // 2-digit day so the string never changes length as the day
            // ticks 9 → 10 (#351 Layer 2-B) — keeps the chip width stable.
            day: '2-digit',
          }).format(new Date(simDayIndex * 86_400_000));
        }

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
                  obj.subSolar.position.set(
                    ux * planet.size3,
                    uy * planet.size3,
                    uz * planet.size3,
                  );
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
          // Selection halo prefers the satellite when one is picked —
          // ring follows the moon mesh instead of staying on the parent
          // planet (#304 follow-up, 2026-06-04). Falls back to the
          // planet halo when no satellite is selected.
          // Selection-ring placement. The ring's *radius* (set via
          // mesh.scale) tracks the body's size so the circle wraps the
          // silhouette at any zoom. The line *stroke* stays constant
          // (linewidth is in screen pixels via Line2). Billboarded
          // with lookAt(camera.position) so the ring reads as a clean
          // circle outline regardless of view angle.
          if (selectedSatelliteKey) {
            const [parentId, satId] = selectedSatelliteKey.split(':');
            const parentObj = planetObjs.find((o) => o.planet.id === parentId);
            const satObj = parentObj?.satellites.find((s) => s.def.id === satId);
            if (satObj) {
              satObj.mesh.getWorldPosition(tmpWorldPos);
              const r = satObj.def.sizeUnits * 1.25;
              selHalo.scale.set(r, r, r);
              selHalo.position.copy(tmpWorldPos);
              selHalo.lookAt(camera.position);
              // Gentle pulse: 0.30 → 0.55 opacity. "Barely visible"
              // floor with a soft heartbeat to confirm aliveness; no
              // strong flash.
              const pulse = 0.5 + 0.5 * Math.sin(simT * 80);
              selRingMat.opacity = 0.3 + pulse * 0.25;
              selHalo.visible = true;
            } else {
              selHalo.visible = false;
            }
          } else if (selectedId) {
            const selObj = planetObjs.find((o) => o.planet.id === selectedId);
            if (selObj) {
              const r = selObj.planet.size3 * 1.25;
              selHalo.scale.set(r, r, r);
              selHalo.position.copy(selObj.group.position);
              selHalo.lookAt(camera.position);
              const pulse = 0.5 + 0.5 * Math.sin(simT * 80);
              selRingMat.opacity = 0.3 + pulse * 0.25;
              selHalo.visible = true;
            } else {
              selHalo.visible = false;
            }
          } else {
            selHalo.visible = false;
          }

          // Iconic-trajectory encounter labels — per-frame screen-space
          // declutter so clustered waypoints (Rosetta has 3 Earth + Mars
          // + 2 asteroid flybys in the inner solar system) don't stack
          // into one unreadable blob on hover. Each handle early-returns
          // when its labelGroup is hidden, so cost is ~10 cheap ifs.
          if (iconicTrajectoryHandles.length > 0) {
            const ch = container?.clientHeight ?? 1;
            for (const h of iconicTrajectoryHandles) h.relayoutLabels(camera, ch);
          }

          // Frame throttle — render 1 of every 4 frames when a right-
          // side detail panel covers the canvas. See module-level
          // declaration above for the why.
          const aRightPanelOpen =
            iconic.state.panelOpen ||
            panelState.planet ||
            panelState.sun ||
            panelState.smallBody ||
            panelState.satellite ||
            panelState.belt;
          if (aRightPanelOpen) {
            frameThrottleCount = (frameThrottleCount + 1) & 3;
            if (frameThrottleCount !== 0) return;
          } else {
            frameThrottleCount = 0;
          }
          composer.render();
        } else {
          draw2d();
        }
      },
    });
    lifecycle.add(loop.cleanup);
    loop.start();

    // Disposables that aren't a listener live in the same chain. LIFO
    // drain so the most recently added run first; layer-stop callbacks
    // are non-null only when the corresponding overlay registered.
    if (stopLensWatch) lifecycle.add(stopLensWatch);
    if (stopHoverLayerWatch) lifecycle.add(stopHoverLayerWatch);
    if (stopExploreGravityLayer) lifecycle.add(stopExploreGravityLayer);
    if (stopExploreVelocityLayer) lifecycle.add(stopExploreVelocityLayer);
    if (stopExploreCentripetalLayer) lifecycle.add(stopExploreCentripetalLayer);
    if (stopExploreGalaxiesLayer) lifecycle.add(stopExploreGalaxiesLayer);
    if (stopExploreHillSphereLayer) lifecycle.add(stopExploreHillSphereLayer);
    if (stopExploreLagrangeLayer) lifecycle.add(stopExploreLagrangeLayer);
    if (stopExploreMagnetosphereLayer) lifecycle.add(stopExploreMagnetosphereLayer);
    if (stopExploreSubSolarLayer) lifecycle.add(stopExploreSubSolarLayer);
    if (stopExplorePlanetStatsLayer) lifecycle.add(stopExplorePlanetStatsLayer);
    lifecycle.add(() => localGroup.dispose());
    lifecycle.add(() => disposeScene(scene));
    // #287 — dispose lazy-loaded 4K textures that are held in
    // closures / per-planet state. disposeScene walks the scene
    // graph, but a planet's `lod.tex4k` may have been loaded
    // without ever being assigned to material.map (user zoomed
    // close but the texture finished loading after the camera
    // pulled back), and the Sun's 4K texture lives outside the
    // PLANETS loop. Without these explicit disposes those
    // textures stay resident in GPU memory after route teardown.
    lifecycle.add(() => sunMap4k?.dispose());
    lifecycle.add(() => {
      for (const obj of planetObjs) {
        obj.lod?.tex4k?.dispose();
      }
    });
    lifecycle.add(() => bloomPass?.dispose());
    lifecycle.add(() => renderer.dispose());
    lifecycle.add(() => el3d.remove());

    cleanup = () => lifecycle.cleanup();
  });

  onDestroy(() => {
    cleanup?.();
    tourCameraTeardown?.();
    for (const h of iconicTrajectoryHandles) h.dispose();
    iconicTrajectoryHandles = [];
  });

  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }
</script>

<svelte:head><title>{m.explore_page_title()}</title></svelte:head>

{#if liveRenderer && liveQuality}
  <RenderingDebugRegistrar
    renderer={liveRenderer}
    quality={liveQuality}
    qualitySource={liveQualitySource}
    bloomPass={liveBloomPass}
  />
{/if}
<QualitySettingsModal {activeQualityTier} />

<div class="explore" class:mobile-info-open={mobileInfoOpen} data-audio-stage="explore-scene">
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

  <!-- PRD-023 Slice E.2 — Earth-comparison ghost, doubling as the
       REFERENCES launcher (2026-06-06 user direction: move the
       REFERENCES chip from the top HUD to the Earth-for-scale slot;
       click → open the planet-scales overlay). Always visible at the
       bottom-left so it's a stable affordance; the ratio line only
       shows when focused on a non-Earth planet. -->
  <button
    type="button"
    class="earth-compare"
    aria-label={m.explore_sizes_toggle()}
    onclick={() => (panelState.sizes = !panelState.sizes)}
    data-testid="sizes-toggle"
  >
    <img src="{base}/textures/2k_earth_daymap.1x1.jpg" alt="" loading="lazy" decoding="async" />
    <span class="earth-compare-label">
      {#if cameraState.focusedOnPlanet && selectedId && selectedId !== 'earth' && focusedStats}
        EARTH FOR SCALE<br />
        <span class="ratio">{focusedStats.diameterRatioEarth.toFixed(2)}× diameter</span>
      {:else if focusedSatelliteStats}
        EARTH FOR SCALE<br />
        <span class="ratio"
          >{focusedSatelliteStats.diameterRatioEarth < 0.01
            ? focusedSatelliteStats.diameterRatioEarth.toFixed(4)
            : focusedSatelliteStats.diameterRatioEarth.toFixed(2)}× diameter</span
        >
      {:else}
        {m.explore_sizes_toggle()}<br />
        <span class="ratio">PLANET SCALES</span>
      {/if}
    </span>
  </button>

  <!-- Time playback (#351 Layer 1) — pause + days-per-second speed over
       the live orbital clock. Pinned bottom-left beside the PLANET SCALES
       button (user direction 2026-06-21). Pills mirror the guide-explore
       narration ("one day per second, ten days, a hundred"). -->
  <div class="time-controls" data-audio-stage="explore-time">
    <button
      type="button"
      class="toggle play-btn"
      onclick={() => (simPaused = !simPaused)}
      aria-pressed={simPaused}
      aria-label={simPaused ? m.fly_play() : m.fly_pause()}
      title={simPaused ? m.fly_play() : m.fly_pause()}
      data-testid="explore-time-play"
    >
      {simPaused ? '▶' : '⏸'}
    </button>
    <div class="speed-group" role="group" aria-label={m.fly_speed_label()}>
      {#each SIM_SPEEDS as sp}
        {@const speedTip =
          sp === 1
            ? m.explore_speed_tip_1()
            : sp === 100
              ? m.explore_speed_tip_100()
              : m.explore_speed_tip_10()}
        <button
          type="button"
          class="speed-pill"
          class:active={!simPaused && simSpeed === sp}
          aria-pressed={!simPaused && simSpeed === sp}
          aria-label={speedTip}
          title={speedTip}
          onclick={() => {
            simSpeed = sp;
            simPaused = false;
          }}
          data-testid="explore-speed-{sp}"
        >
          {sp}×
        </button>
      {/each}
    </div>
    <!-- Date readout + reset (#351 Layer 2-B) — the running simulated date,
         with a dedicated reset-to-today button sized like play/pause. -->
    <span class="time-date" data-testid="explore-sim-date">{simDateLabel}</span>
    <button
      type="button"
      class="play-btn reset-btn"
      onclick={() => resetSimToToday?.()}
      title={m.explore_time_today()}
      aria-label={m.explore_time_today()}
      data-testid="explore-time-today"
    >
      ⟲
    </button>
  </div>

  <!-- PRD-023 Slice E.4 — Tactical-scan overlay. Surface gravity,
       atmospheric pressure, rotation period. Lens-gated by the
       'planet-stats' layer. Only when also focused on a planet. -->
  {#if cameraState.focusedOnPlanet && layerState.statsOverlay && selectedId && focusedStats}
    <div class="tactical-scan" aria-hidden="true">
      <div class="scan-eyebrow">{m.explore_scan_eyebrow({ planet: selectedId.toUpperCase() })}</div>
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_gravity()}</span>
        <span class="scan-value">{focusedStats.surfaceGravityG.toFixed(2)} g</span>
      </div>
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_pressure()}</span>
        <span class="scan-value">
          {focusedStats.atmoBar === 0
            ? m.explore_scan_value_pressure_none()
            : focusedStats.atmoBar < 0.01
              ? `${(focusedStats.atmoBar * 1000).toFixed(2)} mbar`
              : focusedStats.atmoBar < 10
                ? `${focusedStats.atmoBar.toFixed(2)} bar`
                : `${focusedStats.atmoBar.toFixed(0)} bar`}
        </span>
      </div>
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_atmosphere()}</span>
        <span class="scan-value scan-value-wrap">{focusedStats.atmoComposition}</span>
      </div>
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_temp()}</span>
        <span class="scan-value">
          {m.explore_scan_value_temp_format({
            k: focusedStats.surfaceTempK.toString(),
            c: (focusedStats.surfaceTempK - 273).toFixed(0),
          })}
        </span>
      </div>
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_wind()}</span>
        <span class="scan-value">
          {focusedStats.maxWindMs === 0
            ? m.explore_scan_value_wind_none()
            : m.explore_scan_value_wind_up_to({ ms: focusedStats.maxWindMs.toString() })}
        </span>
      </div>
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_rotation()}</span>
        <span class="scan-value">
          {#if focusedRotationHours !== null}
            {Math.abs(focusedRotationHours) < 48
              ? `${Math.abs(focusedRotationHours).toFixed(2)} h`
              : `${(Math.abs(focusedRotationHours) / 24).toFixed(1)} d`}
            {focusedRotationHours < 0 ? `· ${m.explore_scan_value_rotation_retrograde()}` : ''}
          {/if}
        </span>
      </div>
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_diameter()}</span>
        <span class="scan-value">{focusedStats.diameterKm.toLocaleString()} km</span>
      </div>
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_escape_v()}</span>
        <span class="scan-value">{focusedStats.escapeKms.toFixed(1)} km/s</span>
      </div>
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_surface()}</span>
        <span class="scan-value">
          {#if focusedStats.surfaceKind === 'rocky'}{m.explore_scan_value_surface_rocky()}
          {:else if focusedStats.surfaceKind === 'rocky-liquid'}{m.explore_scan_value_surface_rocky_liquid()}
          {:else if focusedStats.surfaceKind === 'rocky-ice'}{m.explore_scan_value_surface_rocky_ice()}
          {:else if focusedStats.surfaceKind === 'gas-giant'}{m.explore_scan_value_surface_gas_giant()}
          {:else}{m.explore_scan_value_surface_ice_giant()}{/if}
        </span>
      </div>
      <div class="scan-row">
        <span class="scan-label">{m.explore_scan_label_radiation()}</span>
        <span class="scan-value">
          {#if focusedStats.radiation === 'shielded'}{m.explore_scan_value_radiation_shielded()}
          {:else if focusedStats.radiation === 'moderate'}{m.explore_scan_value_radiation_moderate()}
          {:else if focusedStats.radiation === 'high'}{m.explore_scan_value_radiation_high()}
          {:else}{m.explore_scan_value_radiation_extreme()}
          {/if}
        </span>
      </div>
      {#if focusedLightTime}
        <div class="scan-row">
          <span class="scan-label">{m.explore_scan_label_light_time()}</span>
          <span class="scan-value">
            {focusedLightTime.fromSunMin < 60
              ? m.explore_scan_value_light_time_sun_min({
                  value: focusedLightTime.fromSunMin.toFixed(1),
                })
              : m.explore_scan_value_light_time_sun_hr({
                  value: (focusedLightTime.fromSunMin / 60).toFixed(2),
                })}
            {#if focusedLightTime.fromEarthMin !== null && selectedId !== 'earth'}
              · {focusedLightTime.fromEarthMin < 60
                ? m.explore_scan_value_light_time_earth_min({
                    value: focusedLightTime.fromEarthMin.toFixed(1),
                  })
                : m.explore_scan_value_light_time_earth_hr({
                    value: (focusedLightTime.fromEarthMin / 60).toFixed(2),
                  })}
            {/if}
          </span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Phase 31 (#342) — mobile HUD-collapse toggle. The expand button
       appears when the cluster is hidden; the collapse button is the
       first child of the cluster itself so it's reachable when the
       cluster is shown. Two-button pattern keeps the top-left zone
       single-claimant at every state. -->
  {#if hudCollapsed}
    <button
      type="button"
      class="hud-restore"
      onclick={toggleHud}
      aria-label="Show view controls"
      title="Show controls"
    >
      ◐
    </button>
  {/if}
  <!-- Phase 33 + 34 (#342) — mobile info toggle. Top-right; hidden
       on hoverable (desktop) devices via CSS. Toggles .tactical-scan
       (planet stats) and .paths-legend (iconic trajectory roster)
       which Phase 27 hid for canvas breathing room. -->
  <button
    type="button"
    class="mobile-info-toggle"
    class:active={mobileInfoOpen}
    onclick={toggleMobileInfo}
    aria-label={mobileInfoOpen ? 'Hide overlays' : 'Show overlays'}
    aria-pressed={mobileInfoOpen}
    title={mobileInfoOpen ? 'Hide stats + paths' : 'Show stats + paths'}
  >
    {mobileInfoOpen ? '✕' : 'ⓘ'}
  </button>
  <!-- HUD controls cluster (top-left). Two rows: mode toggles
       (2D/3D + SIZES) and visibility-layer chips. Sits on the
       opposite side of the detail panel so they never collide. -->
  <div
    class="hud-controls"
    class:hidden-on-mobile={hudCollapsed}
    data-audio-stage="explore-hud"
    role="group"
    aria-label={m.ui_view_controls()}
  >
    <!-- Inline collapse button — visible on mobile only, hides the
         cluster + reveals the floating ◐ above. -->
    <button
      type="button"
      class="hud-mobile-collapse"
      onclick={toggleHud}
      aria-label="Hide view controls"
      title="Hide controls">◑</button
    >
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
      {#if selectedId || selectedSmallBodyId || selectedSatelliteKey || selectedBeltId || panelState.sun}
        <button
          class="toggle"
          type="button"
          onclick={() => {
            selectedId = null;
            selectedSmallBodyId = null;
            selectedSatelliteKey = null;
            selectedBeltId = null;
            resetExplorePanelState();
            flyToBodyFn?.(null);
          }}
          data-testid="explore-reset-view"
          data-audio-stage="explore-reset-view"
        >
          {m.ui_reset_view()}
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
      <button
        type="button"
        class="chip"
        class:active={layers.paths}
        aria-pressed={layers.paths}
        onclick={() => (layers.paths = !layers.paths)}
        data-audio-stage="explore-layer-paths"
        data-testid="layer-paths"
        title={m.explore_layer_tip_paths()}
      >
        {m.ui_layer_paths()}
      </button>
    </div>
    {#if layers.paths}
      <div class="paths-legend" role="group" aria-label="Iconic trajectory legend">
        <a
          class="paths-legend-why"
          href="{base}/science/transfers/coplanar-trajectories"
          data-testid="paths-legend-why"
        >
          ⓘ Why are they all in one plane?
        </a>
        <!-- Hovered-mission tagline strip. Lives at the top of the
             legend so the iconic-mission "why it matters" copy is
             reachable without expanding any row (2026-06-17 user note:
             "we need to move new text to hover-only so that width
             stays the same and no jumps in width of chips"). The
             strip wraps inside the existing legend column width — it
             never pushes the chip cluster wider. -->
        <div class="paths-legend-tagline" aria-live="polite">
          {#if iconic.state.hoveredId}
            {iconicTagline(iconic.state.hoveredId)}
          {:else if iconic.state.selectedId}
            {iconicTagline(iconic.state.selectedId)}
          {:else}
            {m.explore_iconic_tagline_placeholder()}
          {/if}
        </div>
        {#each PATHS_LEGEND as entry, i (entry.mission_id)}
          <button
            type="button"
            class="paths-legend-row"
            bind:this={legendRowEls[i]}
            class:is-selected={iconic.state.selectedId === entry.mission_id}
            aria-pressed={iconic.state.selectedId === entry.mission_id}
            onclick={() => iconic.selectMission(entry.mission_id, localeFromPage($page))}
            onkeydown={(e) => onLegendKeydown(e, i)}
            onmouseenter={() => {
              // Lightweight preview — brightens the arc + swaps the
              // tagline. Does NOT open the panel; the panel only
              // opens on click (or programmatic-tour click). This is
              // intentional after the 2026-06-19 render-storm caused
              // by re-issuing the async getMission() fetch on every
              // mouseenter / mouseleave.
              iconic.state.hoveredId = entry.mission_id;
            }}
            onfocus={() => {
              // Keyboard equivalent of the hover preview — arrowing onto
              // a row brightens its arc + tagline without committing.
              iconic.state.hoveredId = entry.mission_id;
            }}
            onblur={() => {
              if (iconic.state.hoveredId === entry.mission_id) {
                iconic.state.hoveredId = null;
              }
            }}
            onmouseleave={() => {
              iconic.state.hoveredId = null;
            }}
            data-testid="paths-legend-row-{entry.mission_id}"
            data-audio-stage="iconic-mission-{entry.mission_id}"
          >
            <span class="swatch" style="background-color: {entry.color};" aria-hidden="true"></span>
            <span class="name">{entry.name}</span>
            <span class="logos" aria-hidden="true">
              {#each agencyToLogoPaths(entry.agency) as logoPath (logoPath)}
                <img src={logoPath} alt="" loading="lazy" />
              {/each}
            </span>
            <span class="year">{entry.launch_year}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if panelState.sizes}
    <!-- Size comparison overlay — modal-style, mirrors selected planet
         (if any) so the user keeps context. ESC + backdrop click close. -->
    <button
      type="button"
      class="sizes-backdrop"
      aria-label={m.explore_sizes_close()}
      onclick={() => (panelState.sizes = false)}
    ></button>
    <div class="sizes-card" role="dialog" aria-modal="true" aria-label={m.explore_sizes_toggle()}>
      <button
        type="button"
        class="sizes-close"
        aria-label={m.explore_sizes_close()}
        onclick={() => (panelState.sizes = false)}>×</button
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
      {#if hoverData.kind === 'lagrange'}
        <!-- Lagrange-point tooltip — co-orbits with the parent planet,
             so no orbital velocity. Title + physics blurb + (for the
             Sun–Earth points) notable spacecraft hosting that point. -->
        <div class="tt-eyebrow">{hoverData.lagrangeTitle}</div>
        <div class="tt-line dim">{hoverData.lagrangeBlurb}</div>
        {#if hoverData.lagrangeNotable}
          <div class="tt-line dim">{hoverData.lagrangeNotable}</div>
        {/if}
      {:else if tooltipExpanded}
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
  open={panelState.planet}
  onClose={closePanel}
  onPlanMission={selectedPlanet?.missionable ? onPlanMission : undefined}
/>

<SunPanel sun={localizedSun} open={panelState.sun} onClose={closeSunPanel} />

<SmallBodyPanel
  body={selectedSmallBody}
  open={panelState.smallBody}
  onClose={() => (panelState.smallBody = false)}
/>

<SatellitePanel
  satelliteKey={selectedSatelliteKey}
  open={panelState.satellite}
  onClose={() => (panelState.satellite = false)}
/>

<BeltPanel
  beltId={selectedBeltId}
  open={panelState.belt}
  onClose={() => (panelState.belt = false)}
/>

<MissionPanel
  mission={iconic.state.mission}
  open={iconic.state.panelOpen}
  onClose={() => iconic.reset()}
  onFly={(id) => goto(`${base}/fly?mission=${id}`)}
/>

<!-- Hidden tour anchors (PRD-016 §S11 / RFC-019 §12). Programmatic
     triggers used by the audio executor's `click` action so the tour
     can demonstrate planet-selection on a canvas-driven scene where
     there's no clickable DOM element for a planet. These buttons are
     visually offscreen but click()-able. -->
<div class="tour-anchors" aria-hidden="true">
  {#each ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as planetId (planetId)}
    <button
      type="button"
      data-audio-stage="explore-select-{planetId}"
      tabindex="-1"
      onclick={() => selectPlanet(planetId)}>select {planetId}</button
    >
  {/each}
  <button
    type="button"
    data-audio-stage="explore-select-sun"
    tabindex="-1"
    onclick={() => selectSun()}>select sun</button
  >
</div>

<!-- Unified Science Lens panel — lens story + layer toggles in one
     collapse. Replaces the previous two-panel arrangement (banner +
     layers) per the v0.6 Science-Lens UX pass. /explore wires four
     layers: hover-cards (lens-on tooltip expansion), gravity (per-
     planet arrow toward Sun), velocity (tangent), centripetal (paired
     inward arrow). SoI and apsides are omitted — planets render on
     circular orbits at this visual scale, so apsides degenerate to
     single points and SoIs are sub-pixel. -->
<ScienceLayersPanel
  title={m.explore_2d_view_title()}
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
  historicalFoundations={[
    { tab: 'history', section: 'keplers-laws-1609', label: "Kepler's three laws, 1609" },
    { tab: 'history', section: 'newton-principia-1687', label: 'Newton · Principia, 1687' },
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
  /* PRD-023 Slice E.2 — Earth comparison ghost. Bottom-right corner.
     #342 Phase 30 — mobile-first: phone values are the defaults below;
     desktop values get layered back at @min-width: 601. */
  .earth-compare {
    position: fixed;
    bottom: 8px;
    left: 8px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 8px 4px 4px;
    background: rgba(8, 10, 22, 0.6);
    border: 1px solid rgba(75, 156, 211, 0.25);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: auto;
    cursor: pointer;
    color: inherit;
    text-align: left;
    transition:
      border-color 120ms,
      background 120ms;
  }
  .earth-compare:hover,
  .earth-compare:focus-visible {
    border-color: rgba(75, 156, 211, 0.7);
    background: rgba(12, 16, 32, 0.78);
    outline: none;
  }
  .earth-compare img {
    width: 24px;
    height: 24px;
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
  /* PRD-023 Slice E.4 — Tactical scan overlay. Bottom-center, between
     the layer chips and the detail panel on desktop.
     #342 Phase 30 — mobile-first: hidden on phone unless the user
     opens the mobile info toggle (.mobile-info-open scope below).
     Re-visible at @min-width: 601 (the desktop range). */
  .tactical-scan {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    min-width: 320px;
    max-width: 420px;
    padding: 8px 14px;
    background: rgba(8, 10, 22, 0.7);
    border: 1px solid rgba(78, 205, 196, 0.35);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: none;
    font-family: 'Space Mono', monospace;
    /* Phase 27 (#342) — informational overlays are hidden by default
       at narrow widths so the canvas breathes. Phase 33 + 34 (#342)
       reverses the cut on demand via .mobile-info-toggle. */
    display: none;
  }
  .explore.mobile-info-open .tactical-scan {
    display: block;
  }
  .scan-value-wrap {
    /* Atmosphere composition string can be long; allow wrap without
       collapsing the row layout (the label stays pinned-left). */
    text-align: right;
    max-width: 60%;
    word-break: break-word;
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
    /* Phase 37 (#342) — long-locale guard. Labels like "Atmospheric
       pressure" + values like "0.006 atm" sit together in a row whose
       width is the tactical-scan envelope (~220 px on mobile). DE
       "Atmosphärischer Druck" is ~30 % wider; without min-width: 0
       the label flexbox-default-min-content overflows the parent
       envelope rather than truncating. */
    min-width: 0;
  }
  .scan-label {
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 1.3px;
    font-size: 9px;
    /* Truncate at the label's natural box; the value column stays
       right-aligned and full-text. */
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .scan-value {
    color: rgba(255, 255, 255, 0.92);
    font-weight: 700;
    /* Values are usually numeric + short unit; rare overflows
       (e.g. multi-word "no atmosphere") truncate cleanly. */
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Phase 33 + 34 (#342) — mobile info toggle. 44×44 button top-right
     of the canvas, mirrors hud-restore's style (.fly-style chrome bar).
     Display:none on hoverable devices so desktop never sees it; flips
     to inline-flex via @media (hover: none). */
  .mobile-info-toggle {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    right: 16px;
    z-index: 36;
    width: 44px;
    height: 44px;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(78, 205, 196, 0.4);
    color: rgba(220, 230, 245, 0.95);
    font-family: 'Space Mono', monospace;
    font-size: 18px;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
  }
  .mobile-info-toggle:hover,
  .mobile-info-toggle:focus-visible {
    border-color: #4ecdc4;
    background: rgba(20, 26, 50, 0.95);
    outline: none;
  }
  .mobile-info-toggle.active {
    background: rgba(78, 205, 196, 0.18);
    border-color: #4ecdc4;
    color: #4ecdc4;
  }
  @media (hover: none) {
    .mobile-info-toggle {
      display: inline-flex;
    }
  }
  /* Phase 31 (#342) — mobile HUD collapse pair.
     - .hud-restore: floating ◐ button that appears at top-left when
       the cluster is collapsed. Reachable, single-claimant of the zone.
     - .hud-mobile-collapse: ◑ button inside the cluster, visible only
       on touch devices, used to fold the cluster away.
     Desktop / hoverable devices never see either button — chrome
     stays in its default visible state with no extra UI. */
  .hud-restore {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 16px;
    z-index: 36;
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(78, 205, 196, 0.4);
    color: rgba(220, 230, 245, 0.95);
    font-family: 'Space Mono', monospace;
    font-size: 16px;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
  }
  .hud-restore:hover,
  .hud-restore:focus-visible {
    border-color: #4ecdc4;
    background: rgba(20, 26, 50, 0.95);
    outline: none;
  }
  .hud-mobile-collapse {
    display: none;
    pointer-events: auto;
    align-self: flex-start;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    background: rgba(15, 18, 35, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(220, 230, 245, 0.85);
    font-family: 'Space Mono', monospace;
    font-size: 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 4px;
  }
  .hud-mobile-collapse:hover,
  .hud-mobile-collapse:focus-visible {
    border-color: #4ecdc4;
    outline: none;
  }
  @media (hover: none) {
    .hud-mobile-collapse {
      display: inline-flex;
    }
    .hud-controls.hidden-on-mobile {
      display: none;
    }
  }

  /* HUD controls cluster — top-left, opposite the detail panel.
     Two rows (mode toggles + visibility chips). Stays under the nav
     but always above the canvas. Pinned to the left so it never
     collides with the right-drawer detail panel on desktop.
     #342 Phase 30 — mobile-first: phone-tight values are the
     defaults; @min-width: 501 + @min-width: 769 layer desktop
     spacing + the chip stretch column back. */
  .hud-controls {
    position: fixed;
    /* Mobile: tucked at left:8 / top:nav+8 / gap:6 to fit a 375 px
       viewport. Relaxed at @min-width: 501. */
    top: calc(var(--nav-height) + 8px);
    left: 8px;
    z-index: 35;
    display: flex;
    flex-direction: column;
    /* Mobile: flex-start so each row takes its natural width (the chip
       row wraps; the toggle row hugs left). align-items: stretch is
       restored at @min-width: 769 so the chip column inherits the
       top-row's computed width — 2026-06-06 user direction: "resize
       those 4 filter chips to fit new width of remaining 2 buttons
       on top". */
    align-items: flex-start;
    gap: 6px;
    pointer-events: none; /* children re-enable */
  }
  .ctrl-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    pointer-events: auto;
  }
  .ctrl-row.chips {
    /* Mobile: chip row wraps horizontally so 4 chips fit on a 375 px
       viewport without scroll. At @min-width: 769 the rail returns to
       a vertical column matching the toggle row's stretch width. */
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    max-width: calc(100vw - 24px);
  }
  .toggle {
    min-width: 44px;
    min-height: 44px;
    /* Mobile: 12 px font, 0/10 padding. Desktop bumps to 13 / 0 14. */
    padding: 0 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
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
     so the on-state is obvious. 44 px tall preserves the ADR-018
     touch-target floor.
     #342 Phase 30 — mobile-first: phone values default; desktop
     bumps padding/font/letter-spacing at @min-width: 501 and
     width:100% + chip-stretch column at @min-width: 769. */
  .chip {
    min-height: 44px;
    /* Mobile: chips flow side-by-side, natural width. width: 100%
       (chip-stretch column) reinstated at @min-width: 769. */
    width: auto;
    min-width: 110px;
    padding: 0 8px;
    background: rgba(8, 10, 22, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.55);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.2px;
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

  /* Time playback mini-panel (#351 Layer 1) — pinned bottom-left, styled
     to match the PLANET SCALES button (.earth-compare): same translucent
     navy card, blue hairline border, blur, and matching height. Holds a
     play toggle + a segmented 1×/10×/100× day-per-second speed control.
     Mobile-first: STACKED directly above the scales card (no room to sit
     beside it on a 375 px viewport). At @min-width: 601 it moves to sit
     side-by-side, right of the (larger) scales card. */
  .time-controls {
    position: fixed;
    /* Stacked above .earth-compare (bottom:8 + its ~36px height + gap). */
    bottom: 50px;
    left: 8px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 6px;
    background: rgba(8, 10, 22, 0.6);
    border: 1px solid rgba(75, 156, 211, 0.25);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: auto;
  }
  /* Play toggle — overrides .toggle's 44px floor to match the panel's
     footprint (consistent with .earth-compare, which also runs a sub-44
     affordance in this bottom-left zone). */
  .time-controls .play-btn {
    min-width: 32px;
    min-height: 32px;
    width: 32px;
    height: 32px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    line-height: 1;
    border-radius: 5px;
    background: rgba(15, 18, 35, 0.55);
    border: 1px solid rgba(75, 156, 211, 0.3);
    color: #cfe0ff;
  }
  .time-controls .play-btn:hover,
  .time-controls .play-btn:focus-visible {
    border-color: #4ecdc4;
    background: rgba(20, 26, 50, 0.85);
    color: #fff;
  }
  .time-controls .play-btn[aria-pressed='true'] {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.5);
  }
  /* Segmented speed control — one rounded track, hairline dividers, the
     active step glows teal. */
  .speed-group {
    display: flex;
    align-items: stretch;
    pointer-events: auto;
    border: 1px solid rgba(75, 156, 211, 0.3);
    border-radius: 5px;
    overflow: hidden;
  }
  .speed-pill {
    min-width: 32px;
    min-height: 32px;
    padding: 0 10px;
    border: none;
    border-right: 1px solid rgba(75, 156, 211, 0.18);
    background: rgba(15, 18, 35, 0.4);
    color: rgba(207, 224, 255, 0.55);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition:
      background 120ms,
      color 120ms;
  }
  .speed-pill:last-child {
    border-right: none;
  }
  .speed-pill:hover,
  .speed-pill:focus-visible {
    color: #fff;
    background: rgba(20, 26, 50, 0.7);
    outline: none;
  }
  .speed-pill.active {
    background: rgba(78, 205, 196, 0.22);
    color: #4ecdc4;
    box-shadow: inset 0 0 8px rgba(78, 205, 196, 0.18);
  }
  /* Date readout (#351 Layer 2-B) — non-interactive chip showing the
     running simulated date, in the panel's mono/teal language. */
  .time-date {
    display: inline-flex;
    align-items: center;
    /* Right-align the date in a fixed-width box so the chip (and the
       reset button beside it) never shift as the date ticks (#351
       Layer 2-B). Sized for the widest double-digit string. */
    justify-content: flex-end;
    text-align: right;
    min-width: 108px;
    min-height: 32px;
    padding: 0 9px;
    border: 1px solid rgba(75, 156, 211, 0.25);
    border-radius: 5px;
    background: rgba(15, 18, 35, 0.35);
    color: rgba(207, 224, 255, 0.82);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  /* Reset-to-today — same icon-button footprint as play/pause (inherits
     .time-controls .play-btn), teal tint, slightly larger glyph so the ⟲
     reads clearly. Defined after .play-btn so it wins the font-size. */
  .time-controls .reset-btn {
    font-size: 20px;
    color: #4ecdc4;
  }

  .paths-legend {
    pointer-events: auto;
    /* Mobile-first: hidden by default on phones / tablets. Phase 27
       (#342) hides the iconic-trajectory legend so the canvas
       breathes; Phase 34 (#342) re-surfaces it on demand via the
       .mobile-info-toggle button (.mobile-info-open scope below).
       At @min-width: 769 (desktop) the legend is always-on. */
    display: none;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    border-radius: 4px;
    /* Cap height so the 18-row roster doesn't spill off the bottom on
       short viewports (laptop 13" landscape ≈ 720 px; chips row above
       eats ~140 px). Scroll inside the panel when it exceeds the
       available chrome-budget instead of clipping invisibly past the
       footer. The viewport units leave room for nav + the chips
       cluster + a 24 px breathing tail at the bottom. */
    max-height: calc(100vh - var(--nav-height, 60px) - 180px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .explore.mobile-info-open .paths-legend {
    display: flex;
    position: fixed;
    bottom: 76px; /* above the detail-panel handle if open */
    left: 16px;
    right: 16px;
    max-height: 40vh;
    z-index: 35;
  }
  .paths-legend::-webkit-scrollbar {
    width: 6px;
  }
  .paths-legend::-webkit-scrollbar-thumb {
    background: rgba(68, 102, 255, 0.5);
    border-radius: 3px;
  }
  /* Single-line row — name + logos + year. Slightly more compact
     than the pre-tagline original (44 px → 36 px min-height) per
     2026-06-17 user feedback; the "why it's iconic" copy lives in
     the .paths-legend-tagline strip above so individual rows stay
     stable-width regardless of tagline length. */
  .paths-legend-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: #dde4ff;
    padding: 5px 6px;
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.04em;
    min-height: 36px;
    width: 100%;
  }
  /* Hovered-mission tagline strip. Always rendered (with a placeholder
     when no row is hovered) so the legend's vertical footprint is
     stable; only the strip's text changes. Italic + dim by default,
     full-opacity when a row is hovered. Sized generously (2026-06-17
     user note: "text is so small for description I cannot read, be
     generous and use few rows if needed there somehow") — 13.5 px
     italic Crimson Pro with 1.45 line-height, min-height reserves
     ~3 lines so short and long taglines both render without a
     vertical layout shift. */
  .paths-legend-tagline {
    margin: 4px 0 8px;
    padding: 8px 8px 10px;
    font-family: 'Crimson Pro', 'Space Mono', serif;
    font-style: italic;
    font-size: 13.5px;
    line-height: 1.45;
    color: rgba(221, 228, 255, 0.78);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    min-height: 76px;
    background: rgba(8, 10, 22, 0.4);
    border-radius: 3px;
  }
  .paths-legend-row:hover,
  .paths-legend-row:focus-visible {
    background: rgba(68, 102, 255, 0.15);
    color: #fff;
    outline: none;
  }
  .paths-legend-row.is-selected {
    background: rgba(68, 102, 255, 0.28);
    color: #fff;
    box-shadow: inset 2px 0 0 rgba(140, 170, 255, 0.95);
  }
  .paths-legend-row.is-selected .logos img {
    opacity: 1;
    filter: none;
  }
  .paths-legend-row.is-selected .year {
    color: rgba(255, 255, 255, 0.95);
  }
  .paths-legend-why {
    display: block;
    padding: 4px 6px 6px;
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(221, 228, 255, 0.65);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.02em;
    text-decoration: none;
  }
  .paths-legend-why:hover,
  .paths-legend-why:focus-visible {
    color: #fff;
    background: rgba(68, 102, 255, 0.12);
    outline: none;
  }
  .paths-legend-row .swatch {
    display: inline-block;
    width: 18px;
    height: 3px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .paths-legend-row .name {
    flex: 1;
  }
  .paths-legend-row .logos {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    margin-left: 6px;
  }
  .paths-legend-row .logos img {
    height: 14px;
    width: auto;
    max-width: 24px;
    opacity: 0.7;
    filter: grayscale(0.4);
    object-fit: contain;
  }
  .paths-legend-row:hover .logos img,
  .paths-legend-row:focus-visible .logos img {
    opacity: 1;
    filter: none;
  }
  .paths-legend-row .year {
    color: rgba(221, 228, 255, 0.55);
    font-size: 11px;
    letter-spacing: 0.02em;
    margin-left: 8px;
  }
  .paths-legend-row:hover .year,
  .paths-legend-row:focus-visible .year {
    color: rgba(255, 255, 255, 0.85);
  }

  /* ─── ≥ 501 px — relax phone-tight cluster spacing ─────────────── */
  @media (min-width: 501px) {
    .hud-controls {
      left: 16px;
      top: calc(var(--nav-height) + 12px);
      gap: 8px;
    }
    .toggle {
      padding: 0 14px;
      font-size: 13px;
    }
    .chip {
      padding: 0 10px;
      font-size: 10px;
      letter-spacing: 1.5px;
    }
  }

  /* ─── ≥ 601 px — overlays + earth-compare desktop sizing ───────── */
  @media (min-width: 601px) {
    .earth-compare {
      bottom: 16px;
      left: 16px;
      padding: 6px 10px 6px 6px;
    }
    .earth-compare img {
      width: 32px;
      height: 32px;
    }
    /* Desktop: unstack — sit side-by-side, right of the (now larger)
       PLANET SCALES card, sharing its bottom:16 baseline. */
    .time-controls {
      bottom: 16px;
      left: 188px;
    }
    .tactical-scan {
      display: block;
    }
  }

  /* ─── ≥ 769 px — chip-stretch column + always-on paths legend ──── */
  @media (min-width: 769px) {
    .paths-legend {
      display: flex;
      /* position: absolute, anchored to the fixed-positioned
         .hud-controls parent. Removed from the flex-column flow so
         its intrinsic content width can no longer drive the chip
         column wider via the parent's align-items: stretch.
         top:100% places it just below the in-flow children (toggle
         row + chip column). (2026-06-17 iteration 2: align-self
         + width was insufficient — the legend still expanded the
         flex container's natural width because flex items
         participate in max-content sizing. Absolute positioning
         fully decouples.) */
      position: absolute;
      top: 100%;
      left: 0;
      right: auto;
      bottom: auto;
      margin-top: 8px;
      width: 280px;
      box-sizing: border-box;
      max-height: calc(100vh - var(--nav-height, 60px) - 220px);
      z-index: 36;
    }
    .ctrl-row.chips {
      /* Layer chips stack vertically so their on/off state reads as a
         compact left-edge column rather than a wide horizontal strip.
         Individual chips set width: 100% so they stretch to match the
         top toggle row via .hud-controls align-items: stretch. */
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: stretch;
      max-width: none;
    }
    .hud-controls {
      align-items: stretch;
    }
    .chip {
      width: 100%;
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

  /* Hidden tour-anchor buttons (PRD-016 §S11 / RFC-019 §12). Visually
     offscreen but click()-able so the audio executor can drive planet
     selection without a DOM hit on the 3D canvas. */
  .tour-anchors {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
    pointer-events: none;
  }
  .tour-anchors button {
    pointer-events: auto;
  }
</style>
