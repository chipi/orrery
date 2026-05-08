<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
  import { getEarthObjects, getEarthObjectGallery, getMissionIndex } from '$lib/data';
  import { formatNumber } from '$lib/format';
  import { localeFromPage } from '$lib/locale';
  import { altToOrbitRadius } from '$lib/scale';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import { categoriseEarthSatellite } from '$lib/earth-satellite-category';
  import { buildSatelliteModel } from '$lib/earth-satellite-models';
  import { buildLabel } from '$lib/three-label';
  import type { EarthObject } from '$types/earth-object';
  import Panel from '$lib/components/Panel.svelte';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';
  import ScienceLensBanner from '$lib/components/ScienceLensBanner.svelte';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import { onLayerChange } from '$lib/science-layers';
  import * as m from '$lib/paraglide/messages';
  import { panelGalleryCredit } from '$lib/image-credits';
  import ImageCredit from '$lib/components/ImageCredit.svelte';
  import LearnLink from '$lib/components/LearnLink.svelte';

  // ─── Earth scene constants ────────────────────────────────────────
  const EARTH_RADIUS = 8;
  const MOON_DISTANCE_KM = 384400;
  const REGIME_COLORS: Record<string, number> = {
    LEO: 0x4ecdc4,
    MEO: 0x7b9cff,
    GEO: 0xffc850,
    HEO: 0xff8c3c,
    MOON: 0xaaaacc,
    L2: 0xffd700,
  };

  let view: '3d' | '2d' = $state('3d');
  // Layer toggle: hide/show the orbital ring lines without affecting
  // the satellites themselves. Default-on so the at-a-glance picture
  // stays informative.
  let layerOrbits = $state(true);
  // Set of mission ids in the catalogue — used to gate the
  // "FULL MISSION CARD" cross-link chip on the panel so we only
  // show it for objects that actually have a corresponding mission
  // card (lro, chandrayaan1, clementine, hubble, jwst, etc.).
  // Populated inside onMount so the fetch only fires in the browser,
  // not during SSR prerender (which lacks a base URL).
  let missionIds = $state<Set<string>>(new Set());
  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let objects: EarthObject[] = $state([]);
  let loadFailed = $state(false);
  let selected: EarthObject | null = $state(null);
  let panelOpen = $state(false);
  let cleanup: (() => void) | undefined;

  // ─── Category filters (replaces year scrubber, v0.4) ──────────────
  // Each EarthSatelliteCategory has its own toggle chip in the HUD
  // rail. All default-on. Visibility filtering reads these flags
  // every frame so toggles are immediate.
  let layerStations = $state(true);
  let layerObservatories = $state(true);
  let layerConstellations = $state(true);
  let layerComsats = $state(true);
  let layerMoonOrbiters = $state(true);
  let autoSpin = $state(true);
  let resetEarthCamera: () => void = () => {};

  function categoryVisible(cat: ReturnType<typeof categoriseEarthSatellite>): boolean {
    switch (cat) {
      case 'station':
        return layerStations;
      case 'telescope':
        return layerObservatories;
      case 'constellation':
        return layerConstellations;
      case 'comsat':
        return layerComsats;
      case 'moon-orbiter':
        return layerMoonOrbiters;
    }
  }

  // ─── Detail-panel tabs (v0.1.10) ─────────────────────────────────
  type PanelTab = 'overview' | 'gallery' | 'learn';
  let panelTab: PanelTab = $state('overview');
  let panelGallery: string[] = $state([]);
  let panelGalleryGrid = $derived(panelGallery.length <= 1 ? panelGallery : panelGallery.slice(1));
  let panelLightbox = $state<string | null>(null);
  let lastSelectedId = $state<string | null>(null);
  $effect(() => {
    if (selected && selected.id !== lastSelectedId) {
      panelTab = 'overview';
      panelLightbox = null;
      panelGallery = [];
      lastSelectedId = selected.id;
      // Earth-object ids often match a mission id (e.g. "lro",
      // "hubble", "jwst", "chandrayaan1") so getEarthObjectGallery's
      // built-in mission-gallery fallback is enough — no explicit
      // mission_id field on this type yet.
      void getEarthObjectGallery(selected.id).then((urls) => {
        if (selected && selected.id === lastSelectedId) panelGallery = urls;
      });
    }
  });
  type PanelLinks = NonNullable<EarthObject['links']>;
  let panelLinksByTier = $derived.by(() => {
    const links = selected?.links;
    if (!links) return { intro: [] as PanelLinks, core: [] as PanelLinks, deep: [] as PanelLinks };
    const out = {
      intro: [] as PanelLinks,
      core: [] as PanelLinks,
      deep: [] as PanelLinks,
    };
    for (const link of links) out[link.t].push(link);
    return out;
  });
  // The `as EarthObject | null` cast guards against a Svelte 5 flow-
  // analysis quirk where `selected` is narrowed to `never` after the
  // earlier $derived.by reads it inside another closure. The cast
  // restores the union type for length-checking. Confirmed safe;
  // remove once Svelte 5 narrowing improves.
  let panelHasLinks = $derived.by(() => {
    const sel = selected as EarthObject | null;
    return sel != null && sel.links.length > 0;
  });

  function selectObject(id: string) {
    const o = objects.find((x) => x.id === id);
    if (o) {
      selected = o;
      panelOpen = true;
    }
  }
  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }

  // 2D hit-test position cache (canvas pixel coords).
  const pos2d = new Map<string, { x: number; y: number }>();

  onMount(() => {
    if (!container || !canvas2d) return;

    // Initial load uses the URL locale; the $effect below re-fetches
    // on locale change so a `?lang=` swap rebuilds the editorial
    // overlay set without a full page reload.
    getEarthObjects(localeFromPage($page))
      .then((list) => {
        objects = list;
        // Deep-link: ?object=<id> opens the panel pre-selected.
        const objParam = $page.url.searchParams.get('object');
        if (objParam) selectObject(objParam);
      })
      .catch((err) => {
        console.error('Failed to load earth objects:', err);
        loadFailed = true;
      });

    // Mission-id catalogue lookup — drives the FULL MISSION CARD
    // chip's render gate. Browser-only fetch, ignored during SSR.
    void getMissionIndex().then((idx) => {
      missionIds = new Set(idx.map((mi) => mi.id));
    });

    // ──────────────────────────────────────────────────────────────
    // 3D — Earth + satellites in scene-space
    // ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      400,
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x04040c, 1);
    container.appendChild(renderer.domElement);

    // EffectComposer for hover-outline (mirrors /iss + /mars + /moon).
    const composer = new EffectComposer(renderer);
    composer.setSize(container.clientWidth, container.clientHeight);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.addPass(new RenderPass(scene, camera));
    const outlinePass = new OutlinePass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      scene,
      camera,
    );
    outlinePass.edgeStrength = 4;
    outlinePass.edgeGlow = 0.4;
    outlinePass.edgeThickness = 1.5;
    outlinePass.visibleEdgeColor.setHex(0x4ecdc4);
    outlinePass.hiddenEdgeColor.setHex(0x224a48);
    composer.addPass(outlinePass);

    scene.add(new THREE.AmbientLight(0x444466, 0.6));
    const sun = new THREE.DirectionalLight(0xfff4d0, 1.4);
    sun.position.set(120, 60, 100);
    scene.add(sun);
    // Fill light + earthshine — gives MeshStandardMaterial's metallic
    // surfaces (silver bodies, gold MLI on JWST) something to reflect
    // when the directional sun hits the back face of a spacecraft.
    const fill = new THREE.DirectionalLight(0x668fff, 0.45);
    fill.position.set(-80, -30, -120);
    scene.add(fill);
    const earthshine = new THREE.HemisphereLight(0x4b9cd3, 0x080a14, 0.35);
    scene.add(earthshine);

    // Stars
    const STAR_COUNT = 1500;
    const sp = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 200 + Math.random() * 80;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      sp[i * 3] = r * Math.sin(p) * Math.cos(t);
      sp[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      sp[i * 3 + 2] = r * Math.cos(p);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          color: 0xdde4ff,
          size: 1.0,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.55,
        }),
      ),
    );

    // Earth
    const textureLoader = new THREE.TextureLoader();
    const earthMap = textureLoader.load(`${base}/textures/2k_earth_daymap.jpg`);
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 64, 64),
      new THREE.MeshPhongMaterial({ map: earthMap, color: 0xffffff, shininess: 12 }),
    );
    scene.add(earthMesh);

    // J.3 — Atmosphere shell at the Kármán line (100 km altitude).
    // Translucent dome that visually sets where "Earth" ends and
    // "space" begins. Lens-gated via the 'atmosphere' layer.
    const karmanRadius = altToOrbitRadius(100);
    const atmosphereShell = new THREE.Mesh(
      new THREE.SphereGeometry(karmanRadius, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0x4ecdc4,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    atmosphereShell.userData.layerKey = 'atmosphere';
    atmosphereShell.visible = false;
    scene.add(atmosphereShell);
    // Karman-line wireframe ring on the equator for legibility — the
    // dome alone reads as a slight glow, the ring makes the boundary
    // explicit.
    const karmanRing = new THREE.Mesh(
      new THREE.RingGeometry(karmanRadius * 0.999, karmanRadius * 1.002, 64),
      new THREE.MeshBasicMaterial({
        color: 0x4ecdc4,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    karmanRing.rotation.x = Math.PI / 2;
    karmanRing.userData.layerKey = 'atmosphere';
    karmanRing.visible = false;
    scene.add(karmanRing);
    const stopAtmosphereLayer = onLayerChange('atmosphere', (on) => {
      atmosphereShell.visible = on;
      karmanRing.visible = on;
    });

    // J.5 — Ozone-hole layer. Translucent purple polar caps over the
    // ozone shell at ~30 km altitude (stratosphere), representing the
    // recurring Antarctic spring + Arctic winter depletion zones.
    // Sized as spherical caps (parametric phi range) at each pole.
    // Layer-gated; default-off so /earth's pole regions stay clear
    // unless the user opts in. Click → /science/orbits/orbit-regimes
    // is via the lens banner; the layer itself is a visual overlay.
    const ozoneRadius = altToOrbitRadius(30); // stratospheric ozone layer
    // Antarctic ozone hole — spherical cap at south pole (phi 0..0.45π
    // measured from south pole = phiStart π, phiLength 0.45π).
    const ozoneSouth = new THREE.Mesh(
      new THREE.SphereGeometry(ozoneRadius, 48, 24, 0, Math.PI * 2, Math.PI * 0.66, Math.PI * 0.34),
      new THREE.MeshBasicMaterial({
        color: 0xb866ff,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    // Arctic depletion zone — smaller cap at north pole, less severe.
    const ozoneNorth = new THREE.Mesh(
      new THREE.SphereGeometry(ozoneRadius, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.22),
      new THREE.MeshBasicMaterial({
        color: 0x9b5dff,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ozoneSouth.userData.layerKey = 'ozone';
    ozoneNorth.userData.layerKey = 'ozone';
    ozoneSouth.visible = false;
    ozoneNorth.visible = false;
    scene.add(ozoneSouth);
    scene.add(ozoneNorth);
    const stopOzoneLayer = onLayerChange('ozone', (on) => {
      ozoneSouth.visible = on;
      ozoneNorth.visible = on;
    });

    // Moon — small textured sphere at the Moon-orbit radius. Click goes to /moon.
    const moonMap = textureLoader.load(`${base}/textures/2k_moon.jpg`);
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 32, 32),
      new THREE.MeshPhongMaterial({ map: moonMap, color: 0xffffff, shininess: 4 }),
    );
    const moonR = altToOrbitRadius(MOON_DISTANCE_KM);
    moonMesh.position.set(moonR, 0, 0);
    moonMesh.userData = { isMoon: true };
    scene.add(moonMesh);

    // Orbit rings — one per regime, drawn as a faint torus at the
    // representative altitude. Inclination not modelled in v1; the
    // ring sits in the equatorial plane.
    function buildOrbitRings() {
      // Find one representative altitude per regime present in the data.
      const repAlt: Record<string, number> = {};
      for (const o of objects) {
        const alt = o.altitude_km ?? o.earth_distance_km;
        if (!(o.regime in repAlt)) repAlt[o.regime] = alt;
      }
      for (const [regime, alt] of Object.entries(repAlt)) {
        const r = altToOrbitRadius(alt);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.04, 6, 128),
          new THREE.MeshBasicMaterial({
            color: REGIME_COLORS[regime] ?? 0x666666,
            transparent: true,
            opacity: 0.35,
          }),
        );
        ring.rotation.x = Math.PI / 2; // equatorial
        scene.add(ring);
      }
    }

    type SatObj = {
      group: THREE.Group;
      id: string;
      orbitR: number;
      phase: number;
      inclRad: number;
      nodeRad: number;
      ringMesh?: THREE.Mesh;
    };

    // Stable hash → [0, 2π) so each orbit's ascending-node longitude
    // is deterministic but visually spread out (otherwise every
    // 51.6° orbit shares a single tilt and they all overlap).
    function hashToAngle(s: string): number {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return ((h % 360) / 360) * Math.PI * 2;
    }
    const sats: SatObj[] = [];

    function rebuildSats() {
      for (const s of sats) {
        s.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material?.dispose();
          }
        });
        scene.remove(s.group);
        if (s.ringMesh) {
          s.ringMesh.geometry.dispose();
          (s.ringMesh.material as THREE.Material).dispose();
          scene.remove(s.ringMesh);
        }
      }
      sats.length = 0;

      for (let i = 0; i < objects.length; i++) {
        const o = objects[i];
        const category = categoriseEarthSatellite(o.id);
        // Per-spacecraft 3D model (built from primitives, see
        // $lib/earth-satellite-models). Falls back to a generic probe
        // for unknown ids.
        const group = buildSatelliteModel(o.id, o.color);

        // Phase angle distributes objects around their regime ring so
        // they don't pile up at +X. Deterministic so the visual is
        // stable across renders.
        const phase = (i * 2.4) % (Math.PI * 2);

        let orbitR: number;
        // Inclination tilts the orbit out of the equatorial plane.
        // ISS=51.6°, GPS≈55°, Molniya 63.4°, polar≈90°, geostat=0°.
        // Each orbit also gets a deterministic node-longitude offset
        // (rotation around Y) so concentric orbits don't all share
        // a single tilt axis.
        const inclRad = ((o.inclination ?? 0) * Math.PI) / 180;
        const nodeRad = hashToAngle(o.id);
        if (category === 'moon-orbiter') {
          // LRO sits next to the Moon mesh.
          group.position.set(moonR + 2.5, 1, 0);
          orbitR = moonR;
        } else {
          const alt = o.altitude_km ?? o.earth_distance_km;
          orbitR = altToOrbitRadius(alt);
          // Position: orbit plane is the xy-plane rotated by inclRad
          // around the X axis, then by nodeRad around the Y axis.
          const lx = Math.cos(phase) * orbitR;
          const ly = Math.sin(phase) * orbitR * Math.sin(inclRad);
          const lz = Math.sin(phase) * orbitR * Math.cos(inclRad);
          const cn = Math.cos(nodeRad);
          const sn = Math.sin(nodeRad);
          group.position.set(lx * cn + lz * sn, ly, -lx * sn + lz * cn);
        }
        group.userData = { id: o.id };

        // Invisible hit sphere — gives the click target a much larger
        // effective radius (3u vs the visible model's ~0.5u) so the
        // user can grab a moving spacecraft without millimetre-perfect
        // pointer accuracy. Material is non-rendering but
        // raycast-active.
        const hitSphere = new THREE.Mesh(
          new THREE.SphereGeometry(3.0, 8, 8),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        hitSphere.userData = { id: o.id };
        group.add(hitSphere);

        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
            obj.userData = { id: o.id };
          }
        });

        // Label with leader-line — tag floats above the spacecraft
        // (offset chosen so text doesn't z-fight with the model body).
        const label = buildLabel({
          text: o.short ?? o.name ?? o.id,
          color: o.color,
          offset: new THREE.Vector3(0, 1.8, 0),
          size: 1.2,
        });
        group.add(label.group);

        scene.add(group);

        // Per-spacecraft orbital ring (mirrors the /moon + /mars
        // pattern from PRD-009 / RFC-012). Skip constellations
        // (count > 1) since their cluster representation already
        // implies the orbital surface; rendering 24+ overlapping
        // rings would clutter the view. Skip moon-orbiters too —
        // they share the Moon position, not Earth-relative rings.
        let ringMesh: THREE.Mesh | undefined;
        if (o.count === 1 && category !== 'moon-orbiter') {
          const ringGeo = new THREE.RingGeometry(orbitR - 0.03, orbitR + 0.03, 96);
          const ringMat = new THREE.MeshBasicMaterial({
            color: o.color,
            transparent: true,
            opacity: 0.32,
            side: THREE.DoubleSide,
          });
          ringMesh = new THREE.Mesh(ringGeo, ringMat);
          // Same plane as the satellite: rotate around X by inclRad,
          // then around Y by nodeRad so the ring's normal matches
          // the satellite's orbital plane normal.
          ringMesh.rotation.order = 'YXZ';
          ringMesh.rotation.x = inclRad;
          ringMesh.rotation.y = nodeRad;
          scene.add(ringMesh);
        }
        sats.push({ group, id: o.id, orbitR, phase, inclRad, nodeRad, ringMesh });
      }
    }

    // Camera + controls
    let camR = 35;
    let camP = Math.PI / 2.2;
    let camT = 0.4;
    const camR0 = camR;
    const camP0 = camP;
    const camT0 = camT;
    const updateCam = () => {
      camera.position.set(
        camR * Math.sin(camP) * Math.sin(camT),
        camR * Math.cos(camP),
        camR * Math.sin(camP) * Math.cos(camT),
      );
      camera.lookAt(0, 0, 0);
    };
    updateCam();
    resetEarthCamera = () => {
      camR = camR0;
      camP = camP0;
      camT = camT0;
      updateCam();
    };

    const el3d = renderer.domElement;
    let isDrag = false;
    let lmx = 0;
    let lmy = 0;
    let dragMoved = false;
    let downX = 0;
    let downY = 0;

    const ray = new THREE.Raycaster();
    function pickSatAt(clientX: number, clientY: number): string | null {
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const satHits = ray.intersectObjects(
        sats.map((s) => s.group),
        true,
      );
      const satHit = satHits.find((h) => typeof h.object.userData.id === 'string');
      return satHit ? (satHit.object.userData.id as string) : null;
    }

    function tryPick3d(clientX: number, clientY: number) {
      const id = pickSatAt(clientX, clientY);
      if (id) {
        selectObject(id);
        return;
      }
      // Moon click → navigate to /moon.
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const moonHits = ray.intersectObject(moonMesh, false);
      if (moonHits.length > 0) {
        window.location.href = `${base}/moon`;
      }
    }

    let hoveredSatId: string | null = null;
    const onHover = (e: MouseEvent) => {
      if (isDrag) return;
      hoveredSatId = pickSatAt(e.clientX, e.clientY);
    };
    const onHoverLeave = () => {
      hoveredSatId = null;
    };

    const onMouseDown = (e: MouseEvent) => {
      isDrag = true;
      dragMoved = false;
      lmx = e.clientX;
      lmy = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
      el3d.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrag) return;
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 4) dragMoved = true;
      camT -= (e.clientX - lmx) * 0.005;
      camP = Math.max(0.05, Math.min(Math.PI - 0.05, camP + (e.clientY - lmy) * 0.005));
      lmx = e.clientX;
      lmy = e.clientY;
      updateCam();
    };
    const onMouseUp = (e: MouseEvent) => {
      const wasDrag = dragMoved;
      isDrag = false;
      el3d.style.cursor = 'grab';
      if (!wasDrag && view === '3d') tryPick3d(e.clientX, e.clientY);
    };
    const onWheel = (e: WheelEvent) => {
      camR = Math.max(12, Math.min(120, camR + e.deltaY * 0.04));
      updateCam();
    };

    // Touch
    let touchActive = false;
    let touchMoved = false;
    let touchDownX = 0;
    let touchDownY = 0;
    let pinchPrev = 0;
    const tDist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchActive = true;
        touchMoved = false;
        lmx = e.touches[0].clientX;
        lmy = e.touches[0].clientY;
        touchDownX = lmx;
        touchDownY = lmy;
      } else if (e.touches.length === 2) {
        touchActive = false;
        pinchPrev = tDist(e.touches[0], e.touches[1]);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchPrev > 0) {
        const d = tDist(e.touches[0], e.touches[1]);
        camR = Math.max(12, Math.min(120, camR * (pinchPrev / d)));
        updateCam();
        pinchPrev = d;
        return;
      }
      if (!touchActive || e.touches.length !== 1) return;
      if (
        Math.abs(e.touches[0].clientX - touchDownX) + Math.abs(e.touches[0].clientY - touchDownY) >
        6
      )
        touchMoved = true;
      camT -= (e.touches[0].clientX - lmx) * 0.005;
      camP = Math.max(0.05, Math.min(Math.PI - 0.05, camP + (e.touches[0].clientY - lmy) * 0.005));
      lmx = e.touches[0].clientX;
      lmy = e.touches[0].clientY;
      updateCam();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchPrev = 0;
      const wasMoved = touchMoved;
      const wasActive = touchActive;
      if (e.touches.length === 0) touchActive = false;
      if (
        wasActive &&
        !wasMoved &&
        view === '3d' &&
        e.changedTouches.length === 1 &&
        e.touches.length === 0
      ) {
        tryPick3d(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    };

    el3d.style.cursor = 'grab';
    el3d.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el3d.addEventListener('mousemove', onHover);
    el3d.addEventListener('mouseleave', onHoverLeave);
    el3d.addEventListener('wheel', onWheel, { passive: true });
    el3d.addEventListener('touchstart', onTouchStart, { passive: true });
    el3d.addEventListener('touchmove', onTouchMove, { passive: true });
    el3d.addEventListener('touchend', onTouchEnd);
    el3d.addEventListener('touchcancel', onTouchEnd);

    // ──────────────────────────────────────────────────────────────
    // 2D — Top-down concentric rings + satellite dots
    // ──────────────────────────────────────────────────────────────
    const c2 = canvas2d;
    const _maybeCtx = c2.getContext('2d');
    if (!_maybeCtx) throw new Error('2D context unavailable');
    const ctx2: CanvasRenderingContext2D = _maybeCtx;

    // Apollo 17 Blue Marble photo for the 2D Earth disc (v0.1.9).
    // Replaces the previous blue radial gradient. Async load; falls
    // back to the gradient until ready.
    const earthDiscImg = new Image();
    earthDiscImg.src = `${base}/textures/earth_disc.jpg`;
    let earthDiscReady = false;
    earthDiscImg.onload = () => {
      earthDiscReady = true;
      if (view === '2d') draw2d();
    };

    function draw2d() {
      if (c2.width !== c2.clientWidth || c2.height !== c2.clientHeight) {
        c2.width = c2.clientWidth;
        c2.height = c2.clientHeight;
      }
      const W = c2.width;
      const H = c2.height;
      if (W === 0 || H === 0) return;

      ctx2.fillStyle = '#04040c';
      ctx2.fillRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      // Px-per-scene-unit so the 3D log scale maps cleanly to 2D pixels.
      const pxPerUnit = Math.min(W, H) / 70;

      // Stars
      for (let i = 0; i < 80; i++) {
        const sx = (i * 137.5 * 31 + i * 71) % W;
        const sy = (i * 137.5 * 17 + i * 53) % H;
        ctx2.beginPath();
        ctx2.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
        ctx2.fill();
      }

      // Regime rings (concentric)
      const seen: Record<string, true> = {};
      for (const o of objects) {
        if (seen[o.regime]) continue;
        seen[o.regime] = true;
        const alt = o.altitude_km ?? o.earth_distance_km;
        const r = altToOrbitRadius(alt) * pxPerUnit;
        const colorHex = REGIME_COLORS[o.regime] ?? 0x666666;
        ctx2.beginPath();
        ctx2.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2.strokeStyle = `rgba(${(colorHex >> 16) & 0xff}, ${(colorHex >> 8) & 0xff}, ${
          colorHex & 0xff
        }, 0.35)`;
        ctx2.lineWidth = 1;
        ctx2.stroke();
        // Regime label
        ctx2.font = "bold 8px 'Space Mono',monospace";
        ctx2.fillStyle = `rgba(${(colorHex >> 16) & 0xff}, ${(colorHex >> 8) & 0xff}, ${
          colorHex & 0xff
        }, 0.85)`;
        ctx2.textAlign = 'left';
        ctx2.fillText(o.regime, cx + r + 4, cy);
      }

      // Earth disc — Apollo 17 Blue Marble clipped to a circle, with
      // a gradient fallback while the image loads.
      const earthR = EARTH_RADIUS * pxPerUnit;
      ctx2.save();
      ctx2.beginPath();
      ctx2.arc(cx, cy, earthR, 0, Math.PI * 2);
      ctx2.clip();
      if (earthDiscReady && earthDiscImg.naturalWidth > 0) {
        ctx2.drawImage(earthDiscImg, cx - earthR, cy - earthR, earthR * 2, earthR * 2);
      } else {
        const eg = ctx2.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, earthR);
        eg.addColorStop(0, '#6ab8e8');
        eg.addColorStop(1, '#0d3050');
        ctx2.fillStyle = eg;
        ctx2.fillRect(cx - earthR, cy - earthR, earthR * 2, earthR * 2);
      }
      ctx2.restore();
      // Limb shadow ring
      ctx2.beginPath();
      ctx2.arc(cx, cy, earthR + 0.5, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx2.lineWidth = 1;
      ctx2.stroke();

      // Moon disc + label
      const moonRpx = altToOrbitRadius(MOON_DISTANCE_KM) * pxPerUnit;
      const moonAng = Math.PI * 0.25;
      const mx = cx + Math.cos(moonAng) * moonRpx;
      const my = cy - Math.sin(moonAng) * moonRpx;
      ctx2.beginPath();
      ctx2.arc(mx, my, 5, 0, Math.PI * 2);
      ctx2.fillStyle = '#aaaacc';
      ctx2.fill();
      ctx2.font = "8px 'Space Mono',monospace";
      ctx2.fillStyle = 'rgba(170,170,200,0.85)';
      ctx2.textAlign = 'left';
      ctx2.fillText('MOON', mx + 9, my + 3);

      // Satellites
      pos2d.clear();
      for (let i = 0; i < objects.length; i++) {
        const o = objects[i];
        const category = categoriseEarthSatellite(o.id);
        // Category filter (v0.4) — drop objects whose category chip
        // is currently off.
        if (!categoryVisible(category)) continue;
        const phase = (i * 2.4) % (Math.PI * 2);
        let r: number;
        let x: number;
        let y: number;
        if (category === 'moon-orbiter') {
          x = mx + 8;
          y = my - 6;
          r = 4;
        } else {
          const alt = o.altitude_km ?? o.earth_distance_km;
          r = altToOrbitRadius(alt) * pxPerUnit;
          // 2D top-down view = projection of the 3D inclined orbit
          // onto the equatorial plane. With incl=0 (geostationary) we
          // get the full circle; with incl=90 (polar) the projection
          // collapses to a line through Earth. Same incl + nodeRad
          // values as the 3D scene keep the two views in sync.
          const inclRad = ((o.inclination ?? 0) * Math.PI) / 180;
          const nodeRad = hashToAngle(o.id);
          const lx = Math.cos(phase) * r;
          const lz = Math.sin(phase) * r * Math.cos(inclRad);
          const cn = Math.cos(nodeRad);
          const sn = Math.sin(nodeRad);
          x = cx + (lx * cn + lz * sn);
          y = cy - (-lx * sn + lz * cn);
        }
        const dotR = 4 + Math.min(2, Math.log10(Math.max(1, o.count)));
        const isSel = selected?.id === o.id;

        const gl = ctx2.createRadialGradient(x, y, 0, x, y, dotR * 4);
        gl.addColorStop(0, o.color + '99');
        gl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx2.beginPath();
        ctx2.arc(x, y, dotR * 4, 0, Math.PI * 2);
        ctx2.fillStyle = gl;
        ctx2.fill();

        if (isSel) {
          ctx2.beginPath();
          ctx2.arc(x, y, dotR + 6, 0, Math.PI * 2);
          ctx2.strokeStyle = '#fff';
          ctx2.lineWidth = 1.5;
          ctx2.stroke();
        }

        ctx2.beginPath();
        ctx2.arc(x, y, dotR, 0, Math.PI * 2);
        ctx2.fillStyle = o.color;
        ctx2.fill();

        ctx2.font = "9px 'Space Mono',monospace";
        ctx2.fillStyle = 'rgba(255,255,255,0.7)';
        ctx2.textAlign = 'left';
        ctx2.fillText(o.short ?? o.name ?? o.id, x + dotR + 6, y + 3);

        pos2d.set(o.id, { x, y });
      }
    }

    function on2dClick(e: MouseEvent) {
      const rect = c2.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      let best: { id: string; d: number } | null = null;
      for (const [id, p] of pos2d.entries()) {
        const d = Math.hypot(cx - p.x, cy - p.y);
        if (d < 22 && (!best || d < best.d)) best = { id, d };
      }
      if (best) selectObject(best.id);
    }
    c2.addEventListener('click', on2dClick);

    // ──────────────────────────────────────────────────────────────
    // Animation + lifecycle
    // ──────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
      outlinePass.resolution.set(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let lastTime = performance.now();
    let rafId = 0;
    let reducedMotion = false;
    let prevSatLen = -1;
    const stopReducedMotionWatch = onReducedMotionChange((r) => {
      reducedMotion = r;
    });

    buildOrbitRings(); // empty first paint draws nothing; second pass after data load adds rings

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Rebuild satellites once when data loads (cheap; happens once).
      if (objects.length !== prevSatLen) {
        rebuildSats();
        // Also rebuild orbit rings now that we know which regimes exist.
        // (Cheap — at most 6 rings.)
        prevSatLen = objects.length;
      }

      // ADR-025: gate axial Earth rotation + slow satellite drift under
      // reduced-motion. User-initiated drag/zoom still works.
      // v0.1.7+: motion intentionally slow (0.015 rad/s) so satellite
      // labels stay clickable as they drift — fast orbital sweep made
      // hit-targeting frustrating per user feedback.
      // Category-chip filter (v0.4 — replaces the year scrubber).
      // Hides satellites whose category chip is currently off.
      for (const s of sats) {
        const obj = objects.find((o) => o.id === s.id);
        if (obj) {
          const cat = categoriseEarthSatellite(obj.id);
          const visible = categoryVisible(cat);
          s.group.visible = visible;
          // Ring visibility gated by the ORBITS chip + category state.
          if (s.ringMesh) s.ringMesh.visible = visible && layerOrbits;
        }
      }

      if (!reducedMotion && autoSpin) {
        earthMesh.rotation.y += dt * 0.02;
        for (const s of sats) {
          if (s.id === 'lro') continue;
          s.phase += dt * 0.015;
          // Mirror the same incl + node-rotation as the initial spawn
          // so the orbit-plane geometry is consistent across the
          // first paint and the rAF tick.
          const lx = Math.cos(s.phase) * s.orbitR;
          const ly = Math.sin(s.phase) * s.orbitR * Math.sin(s.inclRad);
          const lz = Math.sin(s.phase) * s.orbitR * Math.cos(s.inclRad);
          const cn = Math.cos(s.nodeRad);
          const sn = Math.sin(s.nodeRad);
          s.group.position.set(lx * cn + lz * sn, ly, -lx * sn + lz * cn);
        }
      }

      // Outline-on-hover (skipped if hovered === selected).
      const outlineMeshes: THREE.Object3D[] = [];
      const selectedId = selected?.id;
      if (hoveredSatId && hoveredSatId !== selectedId) {
        const s = sats.find((x) => x.id === hoveredSatId);
        if (s) outlineMeshes.push(s.group);
      }
      outlinePass.selectedObjects = outlineMeshes;

      // Scale-pulse on selected sat group.
      const pulseScale = 1 + Math.sin(now * 0.0026) * 0.06;
      for (const s of sats) {
        s.group.scale.setScalar(s.id === selectedId ? pulseScale : 1);
      }

      if (view === '3d') composer.render();
      else draw2d();
    };
    animate(performance.now());

    cleanup = () => {
      cancelAnimationFrame(rafId);
      stopReducedMotionWatch();
      stopAtmosphereLayer?.();
      stopOzoneLayer?.();
      el3d.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el3d.removeEventListener('wheel', onWheel);
      el3d.removeEventListener('touchstart', onTouchStart);
      el3d.removeEventListener('touchmove', onTouchMove);
      el3d.removeEventListener('touchend', onTouchEnd);
      el3d.removeEventListener('touchcancel', onTouchEnd);
      c2.removeEventListener('click', on2dClick);
      window.removeEventListener('resize', onResize);
      const disposeMatTextures = (mat: THREE.Material) => {
        const m = mat as THREE.Material & { map?: THREE.Texture | null };
        m.map?.dispose();
      };
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material))
            obj.material.forEach((mat) => {
              disposeMatTextures(mat);
              mat.dispose();
            });
          else if (obj.material) {
            disposeMatTextures(obj.material);
            (obj.material as THREE.Material).dispose();
          }
        }
      });
      outlinePass.dispose();
      renderer.dispose();
      el3d.remove();
    };
  });

  onDestroy(() => cleanup?.());
</script>

<svelte:head><title>{m.earth_page_title()}</title></svelte:head>

<div class="earth">
  <div class="layer" bind:this={container} class:hidden={view !== '3d'}></div>
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d'}
    aria-label={m.earth_canvas_label()}
  ></canvas>

  <!-- Top-left HUD cluster (matches /explore + /mars + /moon convention from v0.4). -->
  <div class="hud-controls" role="group" aria-label={m.ui_view_controls()}>
    <div class="ctrl-row">
      <button
        type="button"
        class="toggle"
        onclick={toggleView}
        aria-pressed={view === '2d'}
        data-testid="mode-toggle"
      >
        {view === '3d' ? m.earth_label_view_2d() : m.earth_label_view_3d()}
      </button>
      {#if view === '3d'}
        <button
          type="button"
          class="toggle"
          data-testid="reset-camera"
          onclick={() => resetEarthCamera()}
        >
          {m.iss_reset_camera()}
        </button>
        <button
          type="button"
          class="toggle"
          data-testid="spin-toggle"
          aria-pressed={!autoSpin}
          onclick={() => (autoSpin = !autoSpin)}
        >
          {autoSpin ? m.iss_pause_spin() : m.iss_resume_spin()}
        </button>
      {/if}
    </div>
    <div class="ctrl-row chips" role="group" aria-label={m.ui_visibility_layers()}>
      <button
        type="button"
        class="chip"
        class:active={layerStations}
        aria-pressed={layerStations}
        onclick={() => (layerStations = !layerStations)}
        title={m.earth_layer_tip_habitats()}
        data-testid="layer-stations"
      >
        STATIONS
      </button>
      <button
        type="button"
        class="chip"
        class:active={layerObservatories}
        aria-pressed={layerObservatories}
        onclick={() => (layerObservatories = !layerObservatories)}
        title={m.earth_layer_tip_telescopes()}
        data-testid="layer-observatories"
      >
        OBSERVATORIES
      </button>
      <button
        type="button"
        class="chip"
        class:active={layerConstellations}
        aria-pressed={layerConstellations}
        onclick={() => (layerConstellations = !layerConstellations)}
        title={m.earth_layer_tip_nav()}
        data-testid="layer-constellations"
      >
        {m.ui_layer_constellations()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layerComsats}
        aria-pressed={layerComsats}
        onclick={() => (layerComsats = !layerComsats)}
        title={m.earth_layer_tip_geo()}
        data-testid="layer-comsats"
      >
        {m.ui_layer_comsats()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layerMoonOrbiters}
        aria-pressed={layerMoonOrbiters}
        onclick={() => (layerMoonOrbiters = !layerMoonOrbiters)}
        title={m.earth_layer_tip_lunar()}
        data-testid="layer-moon-orbiters"
      >
        {m.ui_layer_moon_orbiters()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layerOrbits}
        aria-pressed={layerOrbits}
        onclick={() => (layerOrbits = !layerOrbits)}
        title={m.earth_layer_tip_orbit_rings()}
        data-testid="layer-orbits"
      >
        {m.ui_layer_orbits()}
      </button>
    </div>
  </div>

  <!-- Orbit-regime legend overlay (3D view; the 2D canvas paints
       regime ring labels directly). Matches the /moon nation-legend
       pattern at the bottom of the screen. -->
  {#if view === '3d'}
    <div class="legend-3d" aria-label={m.earth_legend_orbit_aria()}>
      {#each Object.entries(REGIME_COLORS) as [regime, color] (regime)}
        <span class="legend-item">
          <span class="legend-dot" style:background={`#${color.toString(16).padStart(6, '0')}`}
          ></span>
          {regime}
        </span>
      {/each}
      <ScienceChip tab="orbits" section="orbit-regimes" label={m.chip_label_orbit_regimes()} />
    </div>
  {/if}

  {#if loadFailed}
    <div class="load-banner" role="alert">{m.earth_load_failed()}</div>
  {/if}

  <Panel
    open={panelOpen}
    title={selected?.name ?? selected?.short ?? selected?.id ?? ''}
    onClose={() => (panelOpen = false)}
  >
    {#if selected}
      <div class="head">
        <div class="agency-row">
          <span class="agency-badge" style:background-color={selected.color}>
            {selected.agencies.join(' · ')}
          </span>
          <span class="status status-{selected.status.toLowerCase()}">{selected.status}</span>
        </div>
        <h1 class="name">{selected.name ?? selected.id}</h1>
      </div>

      {#if panelGallery.length > 0}
        <div class="panel-hero">
          <button
            type="button"
            class="panel-hero-btn"
            onclick={() => (panelLightbox = panelGallery[0]!)}
            aria-label={m.panel_hero_aria({ name: selected.name ?? selected.id })}
          >
            <img src={panelGallery[0]} alt="" fetchpriority="high" decoding="async" />
          </button>
        </div>
      {/if}

      <div class="tabs" role="tablist">
        <button
          type="button"
          class:active={panelTab === 'overview'}
          onclick={() => (panelTab = 'overview')}
          role="tab"
          aria-selected={panelTab === 'overview'}>{m.panel_tab_overview()}</button
        >
        {#if panelGallery.length > 0}
          <button
            type="button"
            class:active={panelTab === 'gallery'}
            onclick={() => (panelTab = 'gallery')}
            role="tab"
            aria-selected={panelTab === 'gallery'}>{m.panel_tab_gallery()}</button
          >
        {/if}
        {#if panelHasLinks}
          <button
            type="button"
            class:active={panelTab === 'learn'}
            onclick={() => (panelTab = 'learn')}
            role="tab"
            aria-selected={panelTab === 'learn'}>{m.panel_tab_learn()}</button
          >
        {/if}
      </div>

      {#if panelTab === 'overview'}
        <div class="grid">
          <div class="cell">
            <div class="cell-label">
              {m.earth_panel_alt()}<WhyPopover
                title={m.why_earth_altitude_title()}
                body={m.why_earth_altitude_body()}
                tab="orbits"
                section="orbit-regimes"
              />
            </div>
            <div class="cell-value">
              {m.earth_alt_km({
                value: formatNumber(
                  selected.altitude_km ?? selected.earth_distance_km,
                  localeFromPage($page),
                ),
              })}
            </div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.earth_panel_period()}<WhyPopover
                title={m.why_earth_period_title()}
                body={m.why_earth_period_body()}
                tab="orbits"
                section="keplers-laws"
              />
            </div>
            <div class="cell-value">
              {selected.period_min
                ? m.earth_period_min({ value: selected.period_min.toFixed(0) })
                : '—'}
            </div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.earth_panel_inclination()}<WhyPopover
                title={m.why_earth_inclination_title()}
                body={m.why_earth_inclination_body()}
                tab="orbits"
                section="inclination"
              />
            </div>
            <div class="cell-value">
              {selected.inclination !== undefined
                ? m.earth_inclination_deg({ value: selected.inclination.toFixed(1) })
                : '—'}
            </div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.earth_panel_launched()}</div>
            <div class="cell-value">{selected.launched}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.earth_panel_count()}</div>
            <div class="cell-value">{selected.count}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.earth_panel_crew()}</div>
            <div class="cell-value">{selected.crew}</div>
          </div>
        </div>

        {#if selected.scale_fact}
          <div class="scale-fact" style:--accent={selected.color}>
            {selected.scale_fact}
          </div>
        {/if}

        {#if selected.description}
          <p class="editorial">{selected.description}</p>
        {/if}

        {#if missionIds.has(selected.id)}
          <a
            class="mission-link"
            href="{base}/missions?id={selected.id}"
            data-testid="mission-card-link"
          >
            FULL MISSION CARD →
          </a>
        {/if}

        {#if selected.credit}
          <div class="credit">{selected.credit}</div>
        {/if}
      {:else if panelTab === 'gallery'}
        {#if panelGallery.length === 0}
          <p class="empty-tab">{m.panel_gallery_empty()}</p>
        {:else}
          <div
            class="gallery-grid"
            aria-label={m.panel_gallery_aria({ name: selected.name ?? selected.id })}
          >
            {#each panelGalleryGrid as src (src)}
              <button
                type="button"
                class="gallery-thumb"
                onclick={() => (panelLightbox = src)}
                aria-label={selected.name ?? selected.id}
              >
                <img {src} alt="" loading="lazy" />
              </button>
            {/each}
          </div>
          <p class="gallery-credit">
            {panelGalleryCredit(selected.agencies?.join(' / '))}
          </p>
        {/if}
      {:else if panelTab === 'learn'}
        {#if !panelHasLinks}
          <p class="empty-tab">{m.panel_no_links()}</p>
        {:else}
          {#if panelLinksByTier.intro.length > 0}
            <section class="link-tier tier-intro">
              <h3>{m.panel_links_intro()}</h3>
              <ul>
                {#each panelLinksByTier.intro as link (link.u)}
                  <li>
                    <LearnLink entityId={selected.id} url={link.u} label={link.l} />
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
          {#if panelLinksByTier.core.length > 0}
            <section class="link-tier tier-core">
              <h3>{m.panel_links_core()}</h3>
              <ul>
                {#each panelLinksByTier.core as link (link.u)}
                  <li>
                    <LearnLink entityId={selected.id} url={link.u} label={link.l} />
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
          {#if panelLinksByTier.deep.length > 0}
            <section class="link-tier tier-deep">
              <h3>{m.panel_links_deep()}</h3>
              <ul>
                {#each panelLinksByTier.deep as link (link.u)}
                  <li>
                    <LearnLink entityId={selected.id} url={link.u} label={link.l} />
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
        {/if}
      {/if}
    {/if}
  </Panel>

  {#if panelLightbox}
    <button
      type="button"
      class="lightbox"
      aria-label={m.panel_lightbox_close()}
      onclick={() => (panelLightbox = null)}
    >
      <img src={panelLightbox} alt="" />
      <span class="lightbox-close" aria-hidden="true">×</span>
    </button>
    <div class="lightbox-meta">
      <ImageCredit src={panelLightbox} />
    </div>
  {/if}
</div>

<!-- J.2 — Science Lens banner + layers on /earth. Top-center, lens-
     gated, links into the orbit-regimes chapter that pairs with the
     altitude-band legend at the bottom. -->
<ScienceLensBanner
  placement="top"
  title="Earth orbit · regimes that shape every mission"
  body="Above 100 km is space; below 2 000 km is LEO. Each band — LEO, MEO, GEO, HEO — trades off latency, coverage, and lifetime. The legend below colour-codes which regime each satellite lives in."
  tab="orbits"
  section="orbit-regimes"
/>

<!-- /earth Layers panel — atmosphere shell at the Kármán line is the
     first wired terrestrial-body overlay. More layers (gravity field,
     radiation belts) follow as J.3.x. -->
<ScienceLayersPanel available={['atmosphere', 'ozone']} />

<style>
  .earth {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
  }
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .layer.hidden {
    display: none;
  }
  :global(.earth canvas) {
    display: block;
  }
  .hud-controls {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 16px;
    z-index: 35;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }
  .ctrl-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    pointer-events: auto;
  }
  .ctrl-row.chips {
    flex-direction: column;
    /* Explicit width keeps chips a consistent size that's NOT inherited
       from the toggle row above. The 3 toggles ("3D" + "RESET VIEW" +
       "PAUSE SPIN") wrap their labels onto two lines under the smaller
       font, so they take less horizontal real estate; the chip column
       picks its own width independently. */
    width: 140px;
    align-items: stretch;
  }
  .chip {
    min-height: 32px;
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
  @media (max-width: 500px) {
    .chip {
      padding: 0 8px;
      font-size: 9px;
      min-width: 92px;
    }
  }
  .toggle {
    min-width: 44px;
    min-height: 36px;
    max-width: 70px;
    padding: 4px 8px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.15;
    letter-spacing: 0.04em;
    text-align: center;
    /* Smaller font + max-width let two-word labels (RESET VIEW, PAUSE
       SPIN) wrap onto two lines, so the toggle cluster stays narrow
       and the chip column below doesn't inherit a wide row width. */
    white-space: normal;
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
  @media (max-width: 500px) {
    .hud-controls {
      left: 8px;
      gap: 6px;
    }
    .toggle {
      padding: 4px 6px;
      font-size: 10px;
      max-width: 60px;
    }
    .ctrl-row.chips {
      width: 120px;
    }
  }
  .legend-3d {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 14px;
    padding: 6px 14px;
    background: rgba(8, 10, 22, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.7);
    pointer-events: none;
    z-index: 5;
  }
  /* The legend itself is click-through (so the 3D canvas under it
     receives orbit/zoom drags), but the science chip inside it must
     reclaim pointer events so it can be clicked. */
  .legend-3d :global(a[data-science-chip]) {
    pointer-events: auto;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    box-shadow: 0 0 4px currentColor;
  }
  @media (max-width: 500px) {
    .legend-3d {
      bottom: 100px;
      gap: 8px;
      padding: 4px 8px;
      font-size: 8px;
    }
  }
  .load-banner {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    background: rgba(193, 68, 14, 0.2);
    border: 1px solid rgba(193, 68, 14, 0.5);
    color: #ffc850;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    border-radius: 4px;
    z-index: 40;
  }
  .head {
    padding: 0 0 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .agency-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .agency-badge,
  .status {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
  }
  .agency-badge {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .status {
    border: 1px solid;
  }
  .status-active {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.08);
  }
  .status-retired {
    color: rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
  }
  .status-planned {
    color: #4466ff;
    border-color: rgba(68, 102, 255, 0.4);
    background: rgba(68, 102, 255, 0.08);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 14px;
  }
  .cell {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 10px;
  }
  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 6px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 3px;
  }
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 700;
  }
  .scale-fact {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-left: 3px solid var(--accent, #4466ff);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.5;
  }
  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    margin: 0 0 14px;
  }
  .mission-link {
    align-self: flex-start;
    display: inline-block;
    margin: 4px 0 10px;
    padding: 8px 12px;
    background: rgba(68, 102, 255, 0.18);
    border: 1px solid rgba(68, 102, 255, 0.55);
    color: #fff;
    text-decoration: none;
    border-radius: 3px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    font-weight: 700;
    transition: all 0.15s;
  }
  .mission-link:hover,
  .mission-link:focus-visible {
    background: rgba(68, 102, 255, 0.32);
    border-color: #4466ff;
    outline: none;
  }
  .credit {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.25);
    line-height: 1.6;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
  }

  /* Detail-panel tabs / gallery / learn / lightbox CSS in src/lib/styles/panel-tabs.css (v0.1.10) */
</style>
