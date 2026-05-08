<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
  import { getMarsSites, getMarsTraverse, getMarsSiteGallery } from '$lib/data';
  import type { Traverse } from '$types/mars-site';
  import { localeFromPage } from '$lib/locale';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import { latLonToUnitSphere } from '$lib/moon-projection';
  import { buildSatelliteModel } from '$lib/earth-satellite-models';
  import * as m from '$lib/paraglide/messages';
  import type { MarsSite } from '$types/mars-site';
  import Panel from '$lib/components/Panel.svelte';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';
  import ScienceLensBanner from '$lib/components/ScienceLensBanner.svelte';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import { onLayerChange } from '$lib/science-layers';
  import ImageCredit from '$lib/components/ImageCredit.svelte';
  import LearnLink from '$lib/components/LearnLink.svelte';

  // ─── Nation palette (PRD-009 / RFC-012) ──────────────────────────
  // Mirrors /moon's palette + adds Europe (ESA-led missions like Mars
  // Express, Schiaparelli, ExoMars) and UAE (Hope orbiter). USSR + Russia
  // collapse onto one entry: Roscosmos is the legal continuation of the
  // Soviet space programme, so on a Mars map their landers belong to
  // the same lineage. Inline (not from --color-*) because the 2D canvas
  // legend can't read CSS custom properties cheaply.
  const NATION_COLORS: Record<string, string> = {
    USA: '#0B3D91',
    'USSR/Russia': '#8B0000',
    Europe: '#003299',
    China: '#DE2910',
    India: '#FF9933',
    Japan: '#003087',
    UAE: '#00732F',
  };

  function nationKey(nation: string): string {
    if (nation === 'USSR' || nation === 'Russia') return 'USSR/Russia';
    return nation;
  }

  function colorFor(site: MarsSite): string {
    return NATION_COLORS[nationKey(site.nation)] ?? '#888';
  }

  // ─── State ───────────────────────────────────────────────────────
  let view: '3d' | '2d' = $state('3d');
  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let sites: MarsSite[] = $state([]);
  let loadFailed = $state(false);
  let selected: MarsSite | null = $state(null);
  let panelOpen = $state(false);
  let cleanup: (() => void) | undefined;

  // Layer toggles. SURFACE = lander/rover markers; ORBITERS = dots
  // on inclined rings; TRAVERSES = rover-track polylines clamped to
  // the surface (Curiosity, Perseverance, Opportunity, Spirit).
  // All default-on. Traverses fade in past a zoom threshold so the
  // global view stays clean — the toggle is a "show even at far zoom"
  // override.
  let layerSurface = $state(true);
  let layerOrbiters = $state(true);
  let layerOrbits = $state(true);
  let layerTraverses = $state(true);
  let autoSpin = $state(true);
  let resetMarsCamera: () => void = () => {};
  let hoverLabelText = $state('');
  let hoverLabelVisible = $state(false);
  let hoverLabelLeft = $state(0);
  let hoverLabelTop = $state(0);
  let hoverLabelEl: HTMLDivElement | undefined = $state();
  // Per-rover traverses keyed by rover_id, populated after fetch.
  let traverses: Record<string, Traverse> = $state({});

  // ─── Detail-panel tabs (mirrors /moon pattern v0.1.10) ───────────
  type PanelTab = 'overview' | 'gallery' | 'learn';
  let panelTab: PanelTab = $state('overview');
  let lastSelectedId = $state<string | null>(null);
  let panelGallery: string[] = $state([]);
  let panelGalleryGrid = $derived(panelGallery.length <= 1 ? panelGallery : panelGallery.slice(1));
  let panelLightbox = $state<string | null>(null);
  $effect(() => {
    if (selected && selected.id !== lastSelectedId) {
      panelTab = 'overview';
      lastSelectedId = selected.id;
      panelGallery = [];
      panelLightbox = null;
      void getMarsSiteGallery(selected.id, selected.mission_id).then((urls) => {
        if (selected && selected.id === lastSelectedId) panelGallery = urls;
      });
    }
  });
  type PanelLinks = NonNullable<MarsSite['links']>;
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
  let panelHasLinks = $derived.by(() => {
    const sel = selected as MarsSite | null;
    return sel != null && sel.links.length > 0;
  });

  function selectSite(id: string) {
    const s = sites.find((x) => x.id === id);
    if (s) {
      selected = s;
      panelOpen = true;
    }
  }
  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }

  // 2D hit-test — site id → screen position
  const sitePos2d = new Map<string, { x: number; y: number }>();

  // Status badge tone for the OVERVIEW header.
  function statusTone(s: string): { label: string; color: string } {
    if (s === 'ACTIVE') return { label: 'ACTIVE', color: '#4ecdc4' };
    if (s === 'CRASHED') return { label: 'CRASHED', color: '#ff6b6b' };
    if (s === 'LOST') return { label: 'LOST', color: '#ff8c42' };
    if (s === 'PLANNED') return { label: 'PLANNED', color: '#7b9cff' };
    if (s === 'ENDED') return { label: 'ENDED', color: 'rgba(255,255,255,0.5)' };
    return { label: 'FLOWN', color: 'rgba(255,255,255,0.5)' };
  }

  onMount(() => {
    if (!container || !canvas2d) return;

    getMarsSites(localeFromPage($page))
      .then((list) => {
        sites = list;
        // Apply ?site= deep-link directly after data lands (deterministic
        // timing, no $effect ordering surprises). selectSite is a no-op
        // when the id is unknown.
        const siteParam = $page.url.searchParams.get('site');
        if (siteParam) selectSite(siteParam);
      })
      .catch((err) => {
        console.error('Failed to load Mars sites:', err);
        loadFailed = true;
      });

    // Fetch the four rover traverses in parallel. Each lands as a
    // Traverse object indexed by rover_id and triggers the rebuild
    // effect downstream. Failures are silent — if a JSON file is
    // missing the rover simply has no rendered track.
    Promise.all(
      ['curiosity', 'perseverance', 'opportunity', 'spirit'].map((id) =>
        getMarsTraverse(id).then((t) => (t ? [id, t] : null)),
      ),
    ).then((entries) => {
      const next: Record<string, Traverse> = {};
      for (const e of entries) if (e) next[e[0] as string] = e[1] as Traverse;
      traverses = next;
    });

    // ──────────────────────────────────────────────────────────────
    // 3D — Mars sphere with surface texture, 25° axial tilt
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

    // EffectComposer for hover-outline (matches /iss post-V1 pattern).
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

    scene.add(new THREE.AmbientLight(0x886655, 0.8));
    const sun = new THREE.DirectionalLight(0xfff4d0, 1.2);
    sun.position.set(120, 60, 100);
    scene.add(sun);

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

    const textureLoader = new THREE.TextureLoader();
    const marsMap = textureLoader.load(`${base}/textures/2k_mars.jpg`);
    const marsRadius = 30;
    // Mars's actual obliquity is 25.19° — set the rotation axis on a
    // Group wrapping the sphere so the axial tilt is real and visible
    // (orbital rings tilt with it for educational-honesty consistency).
    const marsAxis = new THREE.Group();
    marsAxis.rotation.z = (25.19 * Math.PI) / 180;
    scene.add(marsAxis);
    const marsMesh = new THREE.Mesh(
      new THREE.SphereGeometry(marsRadius, 64, 64),
      new THREE.MeshPhongMaterial({ map: marsMap, color: 0xffffff, shininess: 4 }),
    );
    marsAxis.add(marsMesh);

    // J.3 — Atmosphere shell at ~120 km altitude. Mars's atmosphere is
    // 1% Earth's pressure but reaches similar altitude before fading.
    // Scene scale: marsRadius=30 → real 3389 km, so 1 unit ≈ 113 km;
    // 120 km ≈ 1.06 units → shell radius ≈ 31.1.
    const marsAtmosphereR = marsRadius + 120 / 113;
    const marsAtmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(marsAtmosphereR, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffaa66,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    const marsAtmoRing = new THREE.Mesh(
      new THREE.RingGeometry(marsAtmosphereR * 0.999, marsAtmosphereR * 1.002, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffaa66,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    marsAtmoRing.rotation.x = Math.PI / 2;
    marsAtmosphere.userData.layerKey = 'atmosphere';
    marsAtmoRing.userData.layerKey = 'atmosphere';
    marsAtmosphere.visible = false;
    marsAtmoRing.visible = false;
    scene.add(marsAtmosphere);
    scene.add(marsAtmoRing);
    const stopMarsAtmosphereLayer = onLayerChange('atmosphere', (on) => {
      marsAtmosphere.visible = on;
      marsAtmoRing.visible = on;
    });

    type SurfaceMarker = {
      group: THREE.Group;
      siteId: string;
    };
    type OrbitalMarker = {
      group: THREE.Group;
      ringMesh: THREE.Mesh;
      dotGroup: THREE.Group;
      siteId: string;
      altitude: number;
      ringRadius: number;
      orbitSpeed: number;
      orbitPhase: number;
    };
    const surfaceMarkers: SurfaceMarker[] = [];
    const orbitalMarkers: OrbitalMarker[] = [];
    type TraverseLine = {
      line: THREE.Line;
      endDot: THREE.Mesh;
      roverId: string;
      isActive: boolean;
    };
    const traverseLines: TraverseLine[] = [];

    function disposeMesh(obj: THREE.Object3D) {
      obj.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((mat) => mat.dispose());
          else o.material?.dispose();
        } else if (o instanceof THREE.Line) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((mat) => mat.dispose());
          else o.material?.dispose();
        }
      });
    }

    function rebuildSurfaceMarkers() {
      for (const mk of surfaceMarkers) {
        disposeMesh(mk.group);
        marsMesh.remove(mk.group);
      }
      surfaceMarkers.length = 0;
      for (const site of sites) {
        if (site.kind !== 'surface') continue;
        if (site.lat == null || site.lon == null) continue;
        const { x, y, z } = latLonToUnitSphere(site.lat, site.lon);
        const r = marsRadius;
        const color = colorFor(site);
        const group = new THREE.Group();
        const mat = new THREE.MeshPhongMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.2,
          shininess: 30,
        });
        // Marker shape varies by hardware type:
        //   - Rover (active or completed) → squat box on wheels
        //   - Soviet lander (Mars 2/3/6, ROSCOSMOS) → spherical
        //     petal-capsule, the iconic Soviet design that descended
        //     under parachute and opened like a flower on landing
        //   - Other lander → octahedron probe with antenna
        // Failure status (CRASHED/LOST) is conveyed via reduced
        // opacity + the dashed-outline marker in 2D + the panel's
        // status badge — the 3D model itself shows the actual
        // hardware so users can see what they were before they failed.
        const isFailed = site.status === 'CRASHED' || site.status === 'LOST';
        const isRover =
          site.mission_type?.toLowerCase().includes('rover') ||
          site.mission_id === 'curiosity' ||
          site.mission_id === 'perseverance';
        const isSovietLander = site.agency === 'ROSCOSMOS';
        if (isRover) {
          // Rover — squat box on wheels.
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), mat);
          body.position.y = 0.3;
          group.add(body);
          for (const dx of [-0.3, 0.3]) {
            for (const dz of [-0.2, 0.2]) {
              const wheel = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 6, 6),
                new THREE.MeshPhongMaterial({ color: 0x222222 }),
              );
              wheel.position.set(dx, 0.12, dz);
              group.add(wheel);
            }
          }
        } else if (isSovietLander) {
          // Soviet petal-capsule — central spherical body with four
          // open petal panels around the base. This is the silhouette
          // of the Mars 2/3/6 landers (and the Venera lineage they
          // descended from). Descended on a parachute, opened like a
          // flower on touchdown.
          const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), mat);
          capsule.position.y = 0.42;
          group.add(capsule);
          // Four petals — flat triangular panels splayed out at ground
          // level around the base.
          for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI * 2;
            const petal = new THREE.Mesh(
              new THREE.BoxGeometry(0.42, 0.02, 0.34),
              new THREE.MeshPhongMaterial({
                color: '#888888',
                emissive: color,
                emissiveIntensity: 0.05,
                shininess: 5,
              }),
            );
            petal.position.set(Math.cos(ang) * 0.42, 0.05, Math.sin(ang) * 0.42);
            petal.rotation.y = ang;
            // Tilt downward so petals flare outward from the capsule.
            petal.rotation.z = -0.35;
            group.add(petal);
          }
          // Tiny antenna whip on top.
          const antenna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.4, 4),
            new THREE.MeshPhongMaterial({ color: 0xeeeeee }),
          );
          antenna.position.y = 0.95;
          group.add(antenna);
        } else {
          // Generic Western lander — octahedron probe.
          const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), mat);
          body.position.y = 0.5;
          group.add(body);
          const antenna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4),
            new THREE.MeshPhongMaterial({ color: 0xeeeeee }),
          );
          antenna.position.y = 1.05;
          group.add(antenna);
        }
        // Crashed/lost markers get reduced opacity so the wreckage is
        // visually de-emphasised vs. operational hardware. The 2D
        // dashed-outline marker carries the same info on the flat map.
        if (isFailed) {
          group.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              const om = o.material as THREE.Material & { opacity?: number; transparent?: boolean };
              if (om) {
                om.transparent = true;
                om.opacity = 0.55;
              }
            }
          });
        }
        // Anchor on surface; orient so +Y points outward.
        group.position.set(x * r, y * r, z * r);
        const up = new THREE.Vector3(x, y, z);
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
        group.quaternion.copy(quat);
        group.userData = { siteId: site.id };
        // Invisible click target — 3u sphere for forgiving picking.
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(3.0, 8, 8),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        hit.userData = { siteId: site.id };
        group.add(hit);
        marsMesh.add(group);
        surfaceMarkers.push({ group, siteId: site.id });
      }
    }

    function rebuildOrbitalMarkers() {
      for (const om of orbitalMarkers) {
        disposeMesh(om.group);
        marsAxis.remove(om.group);
      }
      orbitalMarkers.length = 0;
      let phase = 0;
      for (const site of sites) {
        if (site.kind !== 'orbiter') continue;
        if (site.altitude_km == null || site.inclination_deg == null) continue;
        const color = colorFor(site);
        // Visual altitude — scale altitude in km to scene units. Real
        // altitudes range from ~50 (LRO) to ~80,000 (Mangalyaan apoapsis).
        // Compress with log scale so all rings are readable on screen.
        // Ring radius: marsRadius + log-scaled offset.
        const altScale = marsRadius + 4 + Math.log10(1 + site.altitude_km / 100) * 5; // 50km→~5; 1000→~9; 20000→~16
        const inc = (site.inclination_deg * Math.PI) / 180;
        const group = new THREE.Group();
        // Faint inclined ring at altScale radius.
        const ringGeo = new THREE.RingGeometry(altScale - 0.06, altScale + 0.06, 96);
        const dimmed = site.status !== 'ACTIVE';
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: dimmed ? 0.18 : 0.35,
          side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        // Ring is in XY plane by default; tilt around X for inclination.
        ringMesh.rotation.x = inc;
        group.add(ringMesh);

        // 3D model — shared earth-satellite-models factory. Mars
        // orbiter ids don't match any dedicated builder, so they fall
        // through to the generic-orbiter silhouette (hex bus + wings
        // + dish + accent ring). Scaled 2x for the larger Mars scene.
        const dotGroup = buildSatelliteModel(site.id, color);
        dotGroup.scale.setScalar(2.0);
        if (dimmed) {
          dotGroup.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              const mat = o.material as THREE.Material & {
                opacity?: number;
                transparent?: boolean;
              };
              if (mat) {
                mat.transparent = true;
                mat.opacity = 0.5;
              }
            }
          });
        }
        dotGroup.traverse((o) => {
          if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
            o.userData = { siteId: site.id };
          }
        });
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(3, 8, 8),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        hit.userData = { siteId: site.id };
        dotGroup.add(hit);
        dotGroup.userData = { siteId: site.id };
        group.add(dotGroup);

        marsAxis.add(group);
        orbitalMarkers.push({
          group,
          ringMesh,
          dotGroup,
          siteId: site.id,
          altitude: altScale,
          ringRadius: altScale,
          // Animation policy (RFC-012 OQ-7): perception-scaled, not
          // ephemeris-correct. Each dot completes a full ring in
          // ~30s real time; offset so rings don't all line up.
          orbitSpeed: dimmed ? 0.06 : 0.2,
          orbitPhase: phase,
        });
        phase += Math.PI / 5;
      }
    }

    function rebuildTraverses() {
      for (const tl of traverseLines) {
        disposeMesh(tl.line);
        marsMesh.remove(tl.line);
        disposeMesh(tl.endDot);
        marsMesh.remove(tl.endDot);
      }
      traverseLines.length = 0;
      for (const tr of Object.values(traverses)) {
        if (!tr.points || tr.points.length < 2) continue;
        // Map each [lat, lon] waypoint onto the unit sphere, scale to
        // marsRadius + 0.05u so the line sits visibly above the
        // surface without z-fighting.
        const verts: number[] = [];
        const r = marsRadius + 0.05;
        for (const [lat, lon] of tr.points) {
          const { x, y, z } = latLonToUnitSphere(lat, lon);
          verts.push(x * r, y * r, z * r);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        // Match the rover's surface-marker colour by looking up its
        // mission_id site (Curiosity, Perseverance, etc. are surface
        // sites with the same id as their rover_id).
        const site = sites.find((s) => s.id === tr.rover_id);
        const color = site ? colorFor(site) : '#ffffff';
        const isActive = tr.status === 'ACTIVE';
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: isActive ? 0.95 : 0.7,
          }),
        );
        line.userData = { roverId: tr.rover_id, kind: 'traverse' };
        marsMesh.add(line);
        // End-of-track dot — pulses for active rovers (animation loop).
        const last = tr.points[tr.points.length - 1];
        const lastPos = latLonToUnitSphere(last[0], last[1]);
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 12, 12),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
        );
        dot.position.set(lastPos.x * r, lastPos.y * r, lastPos.z * r);
        marsMesh.add(dot);
        traverseLines.push({ line, endDot: dot, roverId: tr.rover_id, isActive });
      }
    }

    // Apply current layer visibility to freshly-rebuilt markers.
    // Without this, newly-created groups default to .visible=true
    // even when the user has already toggled a layer off.
    function applyLayerVisibility() {
      for (const sm of surfaceMarkers) sm.group.visible = layerSurface;
      for (const om of orbitalMarkers) {
        om.dotGroup.visible = layerOrbiters;
        om.ringMesh.visible = layerOrbiters && layerOrbits;
      }
      for (const tl of traverseLines) {
        tl.line.visible = layerTraverses;
        tl.endDot.visible = layerTraverses;
      }
    }

    // Reactive: rebuild markers whenever the sites array updates.
    $effect(() => {
      if (sites.length === 0) return;
      rebuildSurfaceMarkers();
      rebuildOrbitalMarkers();
      applyLayerVisibility();
    });
    // Reactive: rebuild traverses when their data lands (independent
    // of sites — they fetch in parallel).
    $effect(() => {
      void traverses;
      if (sites.length === 0) return;
      rebuildTraverses();
      applyLayerVisibility();
    });

    // Visibility toggles wired to layer state. Read the layer flags
    // OUTSIDE the for-loops so Svelte 5 tracks them as deps even when
    // the marker arrays are empty at the effect's first fire (which
    // they are — sites haven't loaded yet). Reading inside an
    // empty-array for-loop short-circuits and the dep never registers,
    // so subsequent layer-flag changes don't re-trigger the effect.
    $effect(() => {
      const surf = layerSurface;
      const orb = layerOrbiters;
      const orbR = layerOrbits;
      const trav = layerTraverses;
      for (const sm of surfaceMarkers) sm.group.visible = surf;
      for (const om of orbitalMarkers) {
        om.dotGroup.visible = orb;
        om.ringMesh.visible = orb && orbR;
      }
      for (const tl of traverseLines) {
        tl.line.visible = trav;
        tl.endDot.visible = trav;
      }
    });

    // ──────────────────────────────────────────────────────────────
    // Camera — spherical (θ,φ,r) controls (drag to orbit, pinch/wheel to zoom)
    // ──────────────────────────────────────────────────────────────
    let camR = 90;
    let camP = (45 * Math.PI) / 180;
    let camT = 0;
    const camR0 = camR;
    const camP0 = camP;
    const camT0 = camT;
    function applyCamera() {
      camera.position.x = camR * Math.sin(camP) * Math.cos(camT);
      camera.position.y = camR * Math.cos(camP);
      camera.position.z = camR * Math.sin(camP) * Math.sin(camT);
      camera.lookAt(0, 0, 0);
    }
    applyCamera();
    resetMarsCamera = () => {
      camR = camR0;
      camP = camP0;
      camT = camT0;
      applyCamera();
    };

    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragMoved = false;

    function onMouseDown(e: MouseEvent) {
      dragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    }
    function onMouseMove(e: MouseEvent) {
      if (!dragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
      camT -= dx * 0.005;
      camP = Math.max(0.15, Math.min(Math.PI - 0.15, camP - dy * 0.005));
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      applyCamera();
    }
    function onMouseUp(e: MouseEvent) {
      const wasDragging = dragging;
      dragging = false;
      if (wasDragging && !dragMoved) handlePick(e.clientX, e.clientY);
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      camR = Math.max(45, Math.min(180, camR + e.deltaY * 0.05));
      applyCamera();
    }

    // Touch
    let touchStart: { x: number; y: number } | null = null;
    let pinchDist: number | null = null;
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        dragMoved = false;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDist = Math.hypot(dx, dy);
        touchStart = null;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 1 && touchStart) {
        const t = e.touches[0];
        const dx = t.clientX - dragStartX;
        const dy = t.clientY - dragStartY;
        if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
        camT -= dx * 0.005;
        camP = Math.max(0.15, Math.min(Math.PI - 0.15, camP - dy * 0.005));
        dragStartX = t.clientX;
        dragStartY = t.clientY;
        applyCamera();
        e.preventDefault();
      } else if (e.touches.length === 2 && pinchDist) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.hypot(dx, dy);
        camR = Math.max(45, Math.min(180, camR * (pinchDist / d)));
        pinchDist = d;
        applyCamera();
        e.preventDefault();
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (touchStart && !dragMoved) {
        handlePick(touchStart.x, touchStart.y);
      }
      touchStart = null;
      pinchDist = null;
      void e;
    }

    function pickSiteAt(clientX: number, clientY: number): string | null {
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(x, y), camera);
      const targets: THREE.Object3D[] = [];
      for (const sm of surfaceMarkers) if (sm.group.visible) targets.push(sm.group);
      for (const om of orbitalMarkers) if (om.group.visible) targets.push(om.dotGroup);
      const hits = ray.intersectObjects(targets, true);
      for (const h of hits) {
        let obj: THREE.Object3D | null = h.object;
        while (obj && !obj.userData.siteId) obj = obj.parent;
        if (obj?.userData.siteId) return obj.userData.siteId as string;
      }
      return null;
    }

    function handlePick(clientX: number, clientY: number) {
      const id = pickSiteAt(clientX, clientY);
      if (id) selectSite(id);
    }

    let hoveredSiteId: string | null = null;
    let hoveredClientX = 0;
    let hoveredClientY = 0;
    function handleHover(e: MouseEvent) {
      if (dragging) return;
      hoveredClientX = e.clientX;
      hoveredClientY = e.clientY;
      const id = pickSiteAt(e.clientX, e.clientY);
      hoveredSiteId = id;
    }
    renderer.domElement.addEventListener('mousemove', handleHover);
    renderer.domElement.addEventListener('mouseleave', () => {
      hoveredSiteId = null;
    });

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd);

    // ──────────────────────────────────────────────────────────────
    // Animation loop
    // ──────────────────────────────────────────────────────────────
    let reduced = false;
    const stopRm = onReducedMotionChange((r) => (reduced = r));
    let raf = 0;
    let lastT = performance.now();
    function frame() {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = (now - lastT) / 1000;
      lastT = now;
      // Mars rotation gated on autoSpin so the user can pause/resume
      // from the HUD. Reduced-motion users always pause.
      if (!reduced && autoSpin) marsMesh.rotation.y += dt * 0.05;
      // Traverse end-dot pulse — only for active rovers, only when
      // visible. Uses sine-wave scale (0.85 → 1.25) at ~1 Hz.
      const pulse = 1.05 + 0.2 * Math.sin(now * 0.006);
      for (const tl of traverseLines) {
        if (!tl.endDot.visible) continue;
        if (tl.isActive && !reduced) {
          tl.endDot.scale.setScalar(pulse);
        } else {
          tl.endDot.scale.setScalar(1);
        }
      }
      // Orbital dot motion — perception-scaled; one ring per ~30s.
      for (const om of orbitalMarkers) {
        if (!om.group.visible) continue;
        if (!reduced) om.orbitPhase += dt * om.orbitSpeed;
        // Position the dot on the inclined ring at ringRadius and
        // angle orbitPhase. Ring is rotated around X by inclination,
        // so dot position in ring's local frame is (cos a, 0, sin a) * R,
        // then transformed by the ring's rotation. We replicate that
        // here so the dot tracks the ring exactly.
        const a = om.orbitPhase;
        const lx = Math.cos(a) * om.ringRadius;
        const ly = 0;
        const lz = Math.sin(a) * om.ringRadius;
        // Apply ringMesh's rotation.x to the dot's local position.
        const inc = om.ringMesh.rotation.x;
        const cosI = Math.cos(inc);
        const sinI = Math.sin(inc);
        om.dotGroup.position.set(lx, ly * cosI - lz * sinI, ly * sinI + lz * cosI);
      }

      // Outline-on-hover: pass the hovered marker group to OutlinePass.
      const outlineMeshes: THREE.Object3D[] = [];
      const selectedId = selected?.id;
      if (hoveredSiteId && hoveredSiteId !== selectedId) {
        const sm = surfaceMarkers.find((s) => s.siteId === hoveredSiteId);
        if (sm) outlineMeshes.push(sm.group);
        const om = orbitalMarkers.find((o) => o.dotGroup.userData.siteId === hoveredSiteId);
        if (om) outlineMeshes.push(om.dotGroup);
      }
      outlinePass.selectedObjects = outlineMeshes;

      // Scale-pulse on selected marker group.
      const pulseScale = 1 + Math.sin(now * 0.0026) * 0.06;
      for (const sm of surfaceMarkers) {
        sm.group.scale.setScalar(sm.siteId === selectedId ? pulseScale : 1);
      }
      for (const om of orbitalMarkers) {
        const id = om.dotGroup.userData.siteId as string | undefined;
        om.dotGroup.scale.setScalar(id === selectedId ? pulseScale : 1);
      }

      // Hover label HTML overlay (suppressed under @media (hover:none)).
      if (hoveredSiteId) {
        const site = sites.find((s) => s.id === hoveredSiteId);
        if (site && container) {
          const rect = container.getBoundingClientRect();
          hoverLabelText = site.name ?? site.id;
          hoverLabelLeft = hoveredClientX - rect.left;
          hoverLabelTop = hoveredClientY - rect.top;
          hoverLabelVisible = true;
        }
      } else if (hoverLabelVisible) {
        hoverLabelVisible = false;
      }

      // 2D draw on each frame so rotation + dots stay live.
      if (view === '2d') draw2d();
      composer.render();
    }
    frame();

    // ──────────────────────────────────────────────────────────────
    // 2D — equirectangular projection of Mars surface
    // ──────────────────────────────────────────────────────────────
    const c2 = canvas2d;
    const ctx2 = c2.getContext('2d')!;
    const marsImage = new Image();
    let marsImageLoaded = false;
    marsImage.onload = () => {
      marsImageLoaded = true;
      if (view === '2d') draw2d();
    };
    marsImage.src = `${base}/textures/2k_mars.jpg`;

    function size2d() {
      if (!canvas2d) return { W: 0, H: 0 };
      // Read from the canvas's own bounding box rather than the 3D
      // container — when view='2d' the 3D container has display:none,
      // so its clientWidth/Height collapse to 0 and the canvas would
      // size to 0×0. The canvas itself, with width:100% / height:100%
      // anchored to .mars (position:absolute inset:nav 0 0 0), gets
      // proper dimensions from its containing block.
      const rect = canvas2d.getBoundingClientRect();
      const W = Math.max(1, Math.round(rect.width));
      const H = Math.max(1, Math.round(rect.height));
      const ratio = window.devicePixelRatio || 1;
      canvas2d.width = W * ratio;
      canvas2d.height = H * ratio;
      canvas2d.style.width = `${W}px`;
      canvas2d.style.height = `${H}px`;
      ctx2.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { W, H };
    }

    function draw2d() {
      const { W, H } = size2d();
      ctx2.clearRect(0, 0, W, H);
      ctx2.fillStyle = '#04040c';
      ctx2.fillRect(0, 0, W, H);

      // Equirectangular map: full-bleed, 2:1 aspect → fit within container.
      const mapW = Math.min(W - 40, (H - 80) * 2);
      const mapH = mapW / 2;
      const mapX = (W - mapW) / 2;
      const mapY = (H - mapH) / 2;

      if (marsImageLoaded) {
        ctx2.drawImage(marsImage, mapX, mapY, mapW, mapH);
      } else {
        const gr = ctx2.createLinearGradient(mapX, mapY, mapX, mapY + mapH);
        gr.addColorStop(0, '#3a1a0e');
        gr.addColorStop(1, '#2a0e06');
        ctx2.fillStyle = gr;
        ctx2.fillRect(mapX, mapY, mapW, mapH);
      }

      // Subtle frame
      ctx2.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx2.lineWidth = 1;
      ctx2.strokeRect(mapX, mapY, mapW, mapH);

      // Lat/lon graticule — every 30°
      ctx2.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx2.lineWidth = 0.5;
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = mapY + ((90 - lat) / 180) * mapH;
        ctx2.beginPath();
        ctx2.moveTo(mapX, y);
        ctx2.lineTo(mapX + mapW, y);
        ctx2.stroke();
      }
      for (let lon = 30; lon < 360; lon += 30) {
        const x = mapX + (lon / 360) * mapW;
        ctx2.beginPath();
        ctx2.moveTo(x, mapY);
        ctx2.lineTo(x, mapY + mapH);
        ctx2.stroke();
      }

      // Traverse polylines — drawn beneath the markers so site dots
      // remain on top. Each traverse is a connected polyline tinted
      // by the rover's agency colour with reduced opacity for ENDED
      // missions.
      if (layerTraverses) {
        for (const tr of Object.values(traverses)) {
          if (!tr.points || tr.points.length < 2) continue;
          const site = sites.find((s) => s.id === tr.rover_id);
          ctx2.strokeStyle = site ? colorFor(site) : '#ffffff';
          ctx2.globalAlpha = tr.status === 'ACTIVE' ? 0.95 : 0.7;
          ctx2.lineWidth = 1.6;
          ctx2.beginPath();
          for (let i = 0; i < tr.points.length; i++) {
            let pLon = tr.points[i][1];
            if (pLon < 0) pLon += 360;
            const px = mapX + (pLon / 360) * mapW;
            const py = mapY + ((90 - tr.points[i][0]) / 180) * mapH;
            if (i === 0) ctx2.moveTo(px, py);
            else ctx2.lineTo(px, py);
          }
          ctx2.stroke();
          ctx2.globalAlpha = 1;
        }
      }

      // Surface markers
      sitePos2d.clear();
      if (layerSurface) {
        for (const site of sites) {
          if (site.kind !== 'surface') continue;
          if (site.lat == null || site.lon == null) continue;
          // Normalise lon to [0, 360) for east-positive convention used
          // by NASA's Mars Trek and the ESA Mars Express atlas.
          let lon = site.lon;
          if (lon < 0) lon += 360;
          const x = mapX + (lon / 360) * mapW;
          const y = mapY + ((90 - site.lat) / 180) * mapH;
          sitePos2d.set(site.id, { x, y });
          const isFailed = site.status === 'CRASHED' || site.status === 'LOST';
          // Glow when selected
          if (selected?.id === site.id) {
            ctx2.fillStyle = colorFor(site);
            ctx2.shadowColor = colorFor(site);
            ctx2.shadowBlur = 12;
            ctx2.beginPath();
            ctx2.arc(x, y, 7, 0, Math.PI * 2);
            ctx2.fill();
            ctx2.shadowBlur = 0;
          }
          ctx2.fillStyle = colorFor(site);
          ctx2.beginPath();
          ctx2.arc(x, y, 4, 0, Math.PI * 2);
          ctx2.fill();
          // Outline (dashed for failures)
          ctx2.strokeStyle = '#ffffff';
          ctx2.lineWidth = 1;
          if (isFailed) ctx2.setLineDash([2, 2]);
          ctx2.beginPath();
          ctx2.arc(x, y, 4.5, 0, Math.PI * 2);
          ctx2.stroke();
          ctx2.setLineDash([]);
        }
      }

      // Orbiter "presence indicator" along top of the map — just shows
      // they exist; clicking any opens the panel. 2D view is primarily
      // about the surface but we don't want to hide orbiters entirely.
      if (layerOrbiters) {
        let strip = mapY - 16;
        let x = mapX;
        ctx2.font = "bold 7px 'Space Mono', monospace";
        ctx2.fillStyle = 'rgba(255,255,255,0.5)';
        ctx2.textAlign = 'left';
        ctx2.fillText('IN ORBIT', x, strip);
        x += 60;
        const orbiters = sites.filter((s) => s.kind === 'orbiter');
        for (const o of orbiters) {
          ctx2.fillStyle = colorFor(o);
          ctx2.beginPath();
          ctx2.arc(x, strip - 3, 4, 0, Math.PI * 2);
          ctx2.fill();
          // Click target — same map registers in sitePos2d.
          sitePos2d.set(o.id, { x, y: strip - 3 });
          x += 14;
        }
        void strip;
      }

      // Legend
      const legendY = H - 24;
      let legendX = 36;
      ctx2.font = "bold 7px 'Space Mono', monospace";
      ctx2.textAlign = 'left';
      for (const [nation, color] of Object.entries(NATION_COLORS)) {
        ctx2.beginPath();
        ctx2.arc(legendX + 5, legendY + 6, 3, 0, Math.PI * 2);
        ctx2.fillStyle = color;
        ctx2.fill();
        ctx2.fillStyle = 'rgba(255,255,255,0.7)';
        ctx2.fillText(nation, legendX + 12, legendY + 9);
        legendX += ctx2.measureText(nation).width + 32;
      }
    }

    function on2dClick(e: MouseEvent) {
      const rect = c2.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      let bestId: string | null = null;
      let bestD = 18; // px tolerance
      for (const [id, p] of sitePos2d.entries()) {
        const d = Math.hypot(p.x - cx, p.y - cy);
        if (d < bestD) {
          bestD = d;
          bestId = id;
        }
      }
      if (bestId) selectSite(bestId);
    }
    c2.addEventListener('click', on2dClick);

    // ──────────────────────────────────────────────────────────────
    // Resize
    // ──────────────────────────────────────────────────────────────
    function onResize() {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
      outlinePass.resolution.set(container.clientWidth, container.clientHeight);
      if (view === '2d') draw2d();
    }
    window.addEventListener('resize', onResize);

    // Re-draw 2D on view toggle.
    $effect(() => {
      if (view === '2d') draw2d();
    });

    cleanup = () => {
      cancelAnimationFrame(raf);
      stopRm();
      stopMarsAtmosphereLayer?.();
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      c2.removeEventListener('click', on2dClick);
      for (const sm of surfaceMarkers) disposeMesh(sm.group);
      for (const om of orbitalMarkers) disposeMesh(om.group);
      marsMesh.geometry.dispose();
      (marsMesh.material as THREE.Material).dispose();
      outlinePass.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  });

  onDestroy(() => cleanup?.());
</script>

<svelte:head>
  <title>{m.mars_page_title()}</title>
  <meta name="description" content={m.mars_meta_description()} />
</svelte:head>

<div class="mars">
  <!-- 3D layer -->
  <div
    bind:this={container}
    class="layer"
    class:hidden={view !== '3d'}
    aria-label={m.mars_globe_aria()}
  ></div>
  <!-- 2D layer -->
  <canvas
    bind:this={canvas2d}
    class="layer"
    class:hidden={view !== '2d'}
    aria-label={m.mars_map_aria()}
  ></canvas>

  <!-- Top-left HUD (matches /explore convention) -->
  <div class="hud-controls" role="group" aria-label={m.ui_view_controls()}>
    <div class="ctrl-row">
      <button
        type="button"
        class="toggle"
        onclick={toggleView}
        aria-pressed={view === '2d'}
        data-testid="mode-toggle"
      >
        {view === '3d' ? m.ui_view_2d() : m.ui_view_3d()}
      </button>
      {#if view === '3d'}
        <button
          type="button"
          class="toggle"
          data-testid="reset-camera"
          onclick={() => resetMarsCamera()}
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
        class:active={layerSurface}
        aria-pressed={layerSurface}
        onclick={() => (layerSurface = !layerSurface)}
        title={m.mars_layer_tip_surface()}
        data-testid="layer-surface"
      >
        {m.ui_layer_surface()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layerOrbiters}
        aria-pressed={layerOrbiters}
        onclick={() => (layerOrbiters = !layerOrbiters)}
        title={m.mars_layer_tip_orbiters()}
        data-testid="layer-orbiters"
      >
        {m.ui_layer_orbiters()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layerOrbits}
        aria-pressed={layerOrbits}
        onclick={() => (layerOrbits = !layerOrbits)}
        title={m.mars_layer_tip_orbit_rings()}
        data-testid="layer-orbits"
      >
        {m.ui_layer_orbits()}
      </button>
      <button
        type="button"
        class="chip"
        class:active={layerTraverses}
        aria-pressed={layerTraverses}
        onclick={() => (layerTraverses = !layerTraverses)}
        title={m.mars_layer_tip_traverses()}
        data-testid="layer-traverses"
      >
        {m.ui_layer_traverses()}
      </button>
    </div>
  </div>

  {#if loadFailed}
    <div class="load-failed" role="alert">{m.mars_load_failed()}</div>
  {/if}

  <!-- Legend overlay (3D view; 2D paints its own legend on the canvas) -->
  {#if view === '3d'}
    <div class="legend-3d" aria-label={m.mars_legend_nation_aria()}>
      {#each Object.entries(NATION_COLORS) as [nation, color] (nation)}
        <span class="legend-item">
          <span class="legend-dot" style:background={color}></span>
          {nation}
        </span>
      {/each}
    </div>
  {/if}

  <div
    bind:this={hoverLabelEl}
    class="hover-label"
    class:hidden={!hoverLabelVisible || view !== '3d'}
    style="left: {hoverLabelLeft}px; top: {hoverLabelTop}px"
    aria-hidden="true"
  >
    {hoverLabelText}
  </div>
</div>

<Panel
  open={panelOpen}
  title={selected?.name ?? selected?.id ?? ''}
  onClose={() => (panelOpen = false)}
>
  {#if selected}
    {@const tone = statusTone(selected.status)}
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
    <div class="panel-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="tab-btn"
        class:active={panelTab === 'overview'}
        aria-selected={panelTab === 'overview'}
        onclick={() => (panelTab = 'overview')}
      >
        OVERVIEW
      </button>
      {#if panelGallery.length > 0}
        <button
          type="button"
          role="tab"
          class="tab-btn"
          class:active={panelTab === 'gallery'}
          aria-selected={panelTab === 'gallery'}
          onclick={() => (panelTab = 'gallery')}
        >
          GALLERY
        </button>
      {/if}
      {#if panelHasLinks}
        <button
          type="button"
          role="tab"
          class="tab-btn"
          class:active={panelTab === 'learn'}
          aria-selected={panelTab === 'learn'}
          onclick={() => (panelTab = 'learn')}
        >
          LEARN
        </button>
      {/if}
    </div>

    {#if panelTab === 'overview'}
      <div class="panel-body">
        <div class="badges">
          <span class="badge agency" style:background={colorFor(selected)}>{selected.agency}</span>
          <span class="badge status" style:color={tone.color} style:border-color={tone.color}>
            {tone.label}
          </span>
          <span class="badge kind">{selected.kind === 'orbiter' ? 'IN ORBIT' : 'ON SURFACE'}</span>
        </div>
        {#if selected.mission_type}
          <p class="mission-type">
            {selected.mission_type}<ScienceChip
              tab="mission-phases"
              section="mission-types"
              label={m.chip_label_mission_types()}
            />
          </p>
        {/if}
        <dl class="meta-grid">
          <dt>Year</dt>
          <dd>{selected.year}</dd>
          {#if selected.landing_date}
            <dt>Landing</dt>
            <dd>{selected.landing_date}</dd>
          {/if}
          {#if selected.kind === 'surface' && selected.lat != null && selected.lon != null}
            <dt>
              Coordinates<WhyPopover
                title={m.why_landing_site_title()}
                body={m.why_landing_site_body()}
              />
            </dt>
            <dd>{selected.lat.toFixed(2)}°, {selected.lon.toFixed(2)}°</dd>
          {/if}
          {#if selected.kind === 'orbiter'}
            <dt>Altitude</dt>
            <dd>{selected.altitude_km?.toLocaleString()} km</dd>
            <dt>
              Inclination<WhyPopover
                title={m.why_arrival_inclination_title()}
                body={m.why_arrival_inclination_body()}
                tab="orbits"
                section="inclination"
              />
            </dt>
            <dd>{selected.inclination_deg?.toFixed(1)}°</dd>
          {/if}
          {#if selected.site_name}
            <dt>{selected.kind === 'orbiter' ? 'Orbit' : 'Site'}</dt>
            <dd>{selected.site_name}</dd>
          {/if}
          {#if selected.surface_duration_days}
            <dt>
              Duration<WhyPopover
                title={m.why_surface_time_title()}
                body={m.why_surface_time_body()}
              />
            </dt>
            <dd>{selected.surface_duration_days.toLocaleString()} days</dd>
          {/if}
        </dl>
        {#if selected.fact}
          <p class="fact">{selected.fact}</p>
        {/if}
        {#if selected.capability}
          <p class="capability"><em>{selected.capability}</em></p>
        {/if}
        {#if selected.mission_id}
          <a class="mission-link" href="{base}/missions?id={selected.mission_id}">
            FULL MISSION CARD →
          </a>
        {/if}
        <p class="credit">{selected.credit}</p>
      </div>
    {:else if panelTab === 'gallery'}
      <div class="panel-body">
        <div class="gallery-grid">
          {#each panelGalleryGrid as src (src)}
            <button
              type="button"
              class="gallery-thumb"
              onclick={() => (panelLightbox = src)}
              aria-label={m.mars_lightbox_open_aria()}
            >
              <img {src} alt="" loading="lazy" />
            </button>
          {/each}
        </div>
        {#if panelGalleryGrid.length > 0}
          <p class="gallery-credit">{m.panel_gallery_credit()}</p>
        {/if}
      </div>
    {:else if panelTab === 'learn'}
      <div class="panel-body">
        {#if panelLinksByTier.intro.length}
          <h4 class="learn-tier intro">INTRO</h4>
          <ul class="learn-links">
            {#each panelLinksByTier.intro as link (link.u)}
              <li><LearnLink entityId={selected.id} url={link.u} label={link.l} /></li>
            {/each}
          </ul>
        {/if}
        {#if panelLinksByTier.core.length}
          <h4 class="learn-tier core">CORE</h4>
          <ul class="learn-links">
            {#each panelLinksByTier.core as link (link.u)}
              <li><LearnLink entityId={selected.id} url={link.u} label={link.l} /></li>
            {/each}
          </ul>
        {/if}
        {#if panelLinksByTier.deep.length}
          <h4 class="learn-tier deep">DEEP</h4>
          <ul class="learn-links">
            {#each panelLinksByTier.deep as link (link.u)}
              <li><LearnLink entityId={selected.id} url={link.u} label={link.l} /></li>
            {/each}
          </ul>
        {/if}
      </div>
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

<!-- J.2 — Science Lens banner on /mars. Top-center, lens-gated;
     links into the EDL chapter — the seven-minute gauntlet every
     Mars surface mission has to survive. -->
<ScienceLensBanner
  placement="top"
  title="Mars · cold, thin air, half-Earth gravity"
  body="Atmosphere is 1% of Earth's — too thin to brake on alone, too thick to ignore. EDL (entry, descent, landing) compresses 6 km/s of arrival speed into 7 minutes of choreographed parachutes, retrorockets, and skycranes."
  tab="mission-phases"
  section="edl"
/>

<!-- /mars Layers panel — atmosphere shell at ~120 km altitude is the
     first wired layer. -->
<ScienceLayersPanel available={['atmosphere']} />

<style>
  .mars {
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
       from the toggle row above. */
    width: 140px;
    align-items: stretch;
  }
  .toggle {
    min-width: 44px;
    min-height: 36px;
    max-width: 70px;
    padding: 4px 8px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(193, 68, 14, 0.45);
    color: #ffd2c0;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.15;
    letter-spacing: 0.04em;
    text-align: center;
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
    border-color: #c1440e;
    background: rgba(60, 18, 8, 0.95);
    outline: none;
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
    border-color: rgba(193, 68, 14, 0.65);
    outline: none;
  }
  .chip.active {
    background: rgba(193, 68, 14, 0.18);
    border-color: rgba(193, 68, 14, 0.7);
    color: #ffb799;
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
    .chip {
      padding: 0 8px;
      font-size: 9px;
      min-width: 92px;
    }
    .ctrl-row.chips {
      width: 120px;
    }
  }

  .hover-label {
    position: absolute;
    z-index: 5;
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 16px));
    padding: 4px 8px;
    background: rgba(8, 10, 22, 0.85);
    border: 1px solid rgba(78, 205, 196, 0.5);
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: #4ecdc4;
    white-space: nowrap;
    text-transform: uppercase;
    backdrop-filter: blur(4px);
  }
  .hover-label.hidden {
    display: none;
  }
  @media (hover: none) {
    .hover-label {
      display: none;
    }
  }
  .legend-3d {
    position: fixed;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
    padding: 8px 14px;
    background: rgba(8, 10, 22, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    backdrop-filter: blur(6px);
    z-index: 30;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.7);
  }
  .legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .load-failed {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 14px;
    background: rgba(193, 68, 14, 0.15);
    border: 1px solid #c1440e;
    color: #ffb799;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    border-radius: 4px;
    z-index: 40;
  }

  /* Panel internals */
  .panel-tabs {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 12px;
  }
  .tab-btn {
    background: transparent;
    border: 0;
    padding: 8px 4px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.45);
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .tab-btn.active {
    color: #fff;
    border-bottom-color: #c1440e;
  }
  .panel-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .badge {
    padding: 3px 8px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    border-radius: 3px;
    text-transform: uppercase;
  }
  .badge.agency {
    color: #fff;
  }
  .badge.status {
    background: transparent;
    border: 1px solid;
  }
  .badge.kind {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.7);
  }
  .mission-type {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.65);
    margin: 0;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 12px;
    margin: 0;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
  }
  .meta-grid dt {
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 1px;
    text-transform: uppercase;
    font-size: 9px;
  }
  .meta-grid dd {
    margin: 0;
    color: rgba(255, 255, 255, 0.85);
  }
  .fact {
    font-family: 'Crimson Pro', serif;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
  }
  .capability {
    font-family: 'Crimson Pro', serif;
    font-size: 13px;
    color: rgba(255, 200, 80, 0.88);
    border-left: 2px solid rgba(255, 200, 80, 0.45);
    padding-left: 10px;
    margin: 0;
  }
  .mission-link {
    align-self: flex-start;
    padding: 6px 10px;
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
    font-family: 'Crimson Pro', serif;
    font-size: 11px;
    font-style: italic;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }
  .learn-tier {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    margin: 8px 0 4px;
  }
  .learn-tier.intro {
    color: var(--color-tier-intro);
  }
  .learn-tier.core {
    color: var(--color-tier-core);
  }
  .learn-tier.deep {
    color: var(--color-tier-deep);
  }
  .learn-links {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .learn-links li {
    padding: 4px 0;
  }
  /* `:global(a)` so the route-level styling reaches the anchor inside
     <LearnLink/> (whose CSS is scoped to that component). */
  .learn-links :global(a) {
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    border-bottom: 1px dotted rgba(255, 255, 255, 0.3);
  }
  .learn-links :global(a:hover),
  .learn-links :global(a:focus-visible) {
    color: #fff;
    border-bottom-color: #fff;
    outline: none;
  }

  /* GALLERY tab */
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .gallery-thumb {
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    border-radius: 4px;
    overflow: hidden;
    aspect-ratio: 4 / 3;
  }
  .gallery-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 200ms;
  }
  .gallery-thumb:hover img,
  .gallery-thumb:focus-visible img {
    transform: scale(1.04);
  }
  .gallery-thumb:focus-visible {
    outline: 2px solid #c1440e;
    outline-offset: 2px;
  }

  /* Lightbox */
  :global(.lightbox) {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.92);
    border: 0;
    padding: 0;
    cursor: zoom-out;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :global(.lightbox img) {
    max-width: 92vw;
    max-height: 92vh;
    object-fit: contain;
  }
  :global(.lightbox-close) {
    position: absolute;
    top: 12px;
    right: 16px;
    color: rgba(255, 255, 255, 0.85);
    font-size: 32px;
    line-height: 1;
  }
</style>
