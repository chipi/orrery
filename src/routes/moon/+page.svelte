<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import * as THREE from 'three';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
  import { getMoonSites, getMoonSiteGallery, getSiteStory, type SiteStory } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import { latLonToUnitSphere } from '$lib/moon-projection';
  import { buildMoonLanderModel } from '$lib/moon-lander-models';
  import { buildSatelliteModel } from '$lib/earth-satellite-models';
  import {
    createHotspotEntry,
    getHotspotMode,
    getHotspotModelBuilder,
    registerHotspotModelBuilder,
    setHotspotMode,
    updateHotspotLOD,
    type HotspotEntry,
    type HotspotMode,
  } from '$lib/hotspot-lod-dispatcher';
  import { buildApolloLMHotspot } from '$lib/hotspot-models/apollo-lm';
  import { buildApolloLMExtendedHotspot } from '$lib/hotspot-models/apollo-lm-extended';
  import { buildLuna9Hotspot } from '$lib/hotspot-models/luna-9-spherical';
  import { buildLunaSampleReturnHotspot } from '$lib/hotspot-models/luna-sample-return';
  import { buildLunokhodHotspot } from '$lib/hotspot-models/lunokhod-rover';
  import { buildChangeLanderHotspot } from '$lib/hotspot-models/chang-e-lander';
  import { buildChandrayaan3VikramHotspot } from '$lib/hotspot-models/chandrayaan-3-vikram';
  import { buildSLIMPrecisionLanderHotspot } from '$lib/hotspot-models/slim-precision-lander';
  import { buildBeresheetHotspot } from '$lib/hotspot-models/beresheet';
  import { buildHotspotSurfacePatch } from '$lib/hotspot-surface-patch';
  import { createSkybox, isSaveDataActive, type SkyboxHandle } from '$lib/hotspot-tier3-skybox';
  import { loadImageVisionManifest, getImageEntry, pickVariant } from '$lib/image-vision';
  import { buildLabel } from '$lib/three-label';
  import type { MoonSite } from '$types/moon-site';
  import Panel from '$lib/components/Panel.svelte';
  import SiteStoryPanel from '$lib/components/SiteStoryPanel.svelte';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';
  import ScienceLayersPanel from '$lib/components/ScienceLayersPanel.svelte';
  import { onLayerChange } from '$lib/science-layers';
  import * as m from '$lib/paraglide/messages';
  import { panelGalleryCredit } from '$lib/image-credits';
  import ImageCredit from '$lib/components/ImageCredit.svelte';
  import LearnLink from '$lib/components/LearnLink.svelte';

  // ─── Nation palette (per IA §shared-tokens) ──────────────────────
  // Mirrors the agency tokens in `src/lib/styles/tokens.css` where the
  // mapping is 1:1 (USA→nasa, China→cnsa, India→isro, Russia→roscosmos,
  // Japan→jaxa). USSR + Russia share a single legend entry/colour
  // because Roscosmos is the legal/programmatic continuation of the
  // Soviet space programme (Roscosmos was founded in 1992 from the
  // Soviet ministry's lunar/Mars assets); their landers belong to the
  // same lineage on a moon map. Inline (not from --color-*) because
  // the 2D canvas legend can't read CSS custom properties cheaply.
  const NATION_COLORS: Record<string, string> = {
    USA: '#0B3D91',
    'USSR/Russia': '#8B0000',
    China: '#DE2910',
    India: '#FF9933',
    Japan: '#003087',
  };

  // Resolve a site's nation field to a legend key. USSR + Russia
  // collapse to one entry so the lineage reads as a single space
  // programme on the legend.
  function nationKey(nation: string): string {
    if (nation === 'USSR' || nation === 'Russia') return 'USSR/Russia';
    return nation;
  }

  let view: '3d' | '2d' = $state('3d');
  let container: HTMLDivElement | undefined = $state();
  let canvas2d: HTMLCanvasElement | undefined = $state();
  let sites: MoonSite[] = $state([]);
  let loadFailed = $state(false);
  let selected: MoonSite | null = $state(null);
  let panelOpen = $state(false);
  let cleanup: (() => void) | undefined;

  // Layer toggles. SURFACE = lander/rover markers; ORBITERS = dots
  // on inclined rings around the Moon (LRO, Clementine, Chandrayaan-1,
  // Chang'e 1/2, SMART-1, Lunar Prospector, Luna 10). Both default-on.
  let layerSurface = $state(true);
  let layerOrbiters = $state(true);
  let layerOrbits = $state(true);
  let autoSpin = $state(true);
  let resetMoonCamera: () => void = () => {};

  // Surface Hotspots mode (PRD-014 / RFC-017 §S7). 'auto' = LOD
  // dispatcher picks tier from screen-projected size; 'low' = all
  // sites pinned to Tier 0 silhouette; 'high' = all sites pinned
  // to their hotspot_tier_max. Initial value resolves from the
  // ?hotspots= URL param if present, else falls back to LOW under
  // reduced-motion or saveData, else AUTO.
  let hotspotsMode: HotspotMode = $state('auto');

  /**
   * Tier 3 panorama state (Phase 6 / #118). Only the currently
   * "stood at" site has an active skybox; only one panorama is
   * active at a time. Per RFC-017 §ADR-061, the skybox is created
   * lazily on first activation and disposed when the user exits.
   */
  let panoramaActive = $state(false);
  let panoramaSkybox: SkyboxHandle | null = null;
  // Reactive function pointers — assigned inside onMount once the
  // scene + camera closures exist. $state ensures Svelte re-renders
  // the template handlers when the pointers are updated.
  let enterPanorama: (textureUrl: string, siteId: string) => void = $state(() => {});
  let exitPanorama: () => void = $state(() => {});

  /** Resolve the initial HOTSPOTS mode from URL + accessibility hints. */
  function resolveInitialHotspotsMode(url: URL): HotspotMode {
    const param = url.searchParams.get('hotspots');
    if (param === 'low' || param === 'high' || param === 'auto') return param;
    // Reduced-motion users default to LOW (less GPU work + lower
    // visual motion as zoom triggers tier swaps). Save-Data
    // (Chromium) users also default to LOW (skips texture fetches).
    if (typeof window !== 'undefined') {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
      const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const saveData = conn?.saveData === true;
      if (reduced || saveData) return 'low';
    }
    return 'auto';
  }

  function cycleHotspotsMode(): void {
    const next: HotspotMode =
      hotspotsMode === 'auto' ? 'low' : hotspotsMode === 'low' ? 'high' : 'auto';
    hotspotsMode = next;
  }

  // Resolve initial mode once on mount (needs window for
  // matchMedia + navigator.connection). Subsequent changes go
  // through cycleHotspotsMode + the $effect below.
  onMount(() => {
    hotspotsMode = resolveInitialHotspotsMode($page.url);
    showDebug = $page.url.searchParams.get('debug') === '1';
    // Sidecar fetch probe — fills the overlay's sidecarStatus.
    fetch('/data/surface-hotspots.json')
      .then((r) => r.json())
      .then((d) => {
        debugInfo.sidecarStatus = `ok ${Object.keys(d.entries || {}).length} entries · apollo11 tier ${d.entries?.apollo11?.hotspot_tier_max ?? '?'}`;
      })
      .catch((e) => {
        debugInfo.sidecarStatus = `FAIL ${(e as Error).message}`;
      });
  });

  // Reactive: sync mode → dispatcher + URL.
  $effect(() => {
    setHotspotMode(hotspotsMode);
    if (typeof window === 'undefined') return;
    const url = new URL($page.url);
    const current = url.searchParams.get('hotspots');
    // Strip the param when mode is the default ('auto'), otherwise
    // write it explicitly. replaceState to keep back-button clean.
    if (hotspotsMode === 'auto') {
      if (current !== null) {
        url.searchParams.delete('hotspots');
        void goto(url, { replaceState: true, keepFocus: true, noScroll: true });
      }
    } else if (current !== hotspotsMode) {
      url.searchParams.set('hotspots', hotspotsMode);
      void goto(url, { replaceState: true, keepFocus: true, noScroll: true });
    }
  });

  function colorFor(site: MoonSite): string {
    return NATION_COLORS[nationKey(site.nation)] ?? '#888';
  }

  /**
   * Zoom taper for tier 0/1 models. Port of /mars's computeTierScale.
   * camR ≥ 60 → 1.0 (overview); camR ≤ 30.6 → 0.2 (closest zoom).
   * As the user zooms in onto the LROC patch, the lander model + tier-0
   * marker shrink so they don't visually dominate the disc underneath.
   */
  function computeTierScale(camR: number): number {
    const minR = 30.6;
    const maxR = 60;
    const minScale = 0.2;
    if (camR >= maxR) return 1;
    if (camR <= minR) return minScale;
    return minScale + (1 - minScale) * ((camR - minR) / (maxR - minR));
  }

  // Debug overlay state — same shape as /mars's debugInfo so a
  // ?debug=1 toggle surfaces dispatcher internals (current/target
  // tier, projected px sample, tier2 built/visible, patch detail).
  let debugInfo = $state<{
    sidecarStatus: string;
    siteCount: number;
    hotspotCount: number;
    maxTierAcrossSites: number;
    currentTopTier: number;
    targetTopTier: number;
    pageMode: string;
    dispatcherMode: string;
    camR: number;
    projectedPxSample: string;
    tier2Status: string;
    patchDetail: string;
  }>({
    sidecarStatus: 'pending',
    siteCount: 0,
    hotspotCount: 0,
    maxTierAcrossSites: 0,
    currentTopTier: 0,
    targetTopTier: 0,
    pageMode: 'auto',
    dispatcherMode: 'auto',
    camR: 0,
    projectedPxSample: '',
    tier2Status: '',
    patchDetail: '',
  });
  let showDebug = $state(false);

  /**
   * Contextual info card state (PRD-014 §v0.7.x + RFC-017 §OQ-12).
   * Mirrors /mars's TierContext: when the camera is in the Tier 2
   * zoom band on a hotspot, the card surfaces (a) site context —
   * name, agency, brief mission tagline — and (b) the dominant
   * imagery layer's source + attribution + resolution. Two-layer
   * composition (regional + detail) stacks both attribution rows.
   */
  type TierLayer = {
    layerLabel: string; // 'Regional view' | 'Detail view'
    sourceTitle: string;
    sourceAuthor: string;
    resolutionText: string;
    sourceUrl?: string;
    licenseShort: string;
  };
  type TierContext = {
    siteId: string;
    siteName: string;
    nation: string;
    nationColor: string;
    missionContext: string;
    layers: TierLayer[];
    uncertaintyM?: number;
  };
  let tierContext = $state<TierContext | null>(null);

  /**
   * Nation chip label + colour for the info card's site header.
   * Same shape as /mars's nationChipFor — Moon includes USSR (Luna)
   * which collapses with Russia for the chip (Roscosmos is the
   * programmatic continuation of the Soviet space programme).
   */
  function nationChipFor(site: MoonSite): { label: string; color: string } {
    const nation = site.nation ?? '';
    const agency = site.agency ?? '';
    if (nation === 'USA' || agency === 'NASA') return { label: 'USA · NASA', color: '#3b82f6' };
    if (nation === 'USSR' || nation === 'Russia' || agency === 'ROSCOSMOS')
      return { label: 'USSR · Roscosmos', color: '#ef4444' };
    if (nation === 'China' || agency === 'CNSA') return { label: 'China · CNSA', color: '#dc2626' };
    if (nation === 'India' || agency === 'ISRO') return { label: 'India · ISRO', color: '#f97316' };
    if (nation === 'Japan' || agency === 'JAXA') return { label: 'Japan · JAXA', color: '#1d4ed8' };
    if (nation === 'Israel' || agency === 'SpaceIL')
      return { label: 'Israel · SpaceIL', color: '#1d4ed8' };
    if (nation === 'Europe' || agency === 'ESA') return { label: 'Europe · ESA', color: '#1d4ed8' };
    return { label: nation || agency || '—', color: 'rgba(255,255,255,0.5)' };
  }

  /**
   * Compact mission-context tagline: "Apollo 11 crewed lander ·
   * landed 1969-07-20" — feeds the info card's second line.
   */
  function missionContextFor(site: MoonSite): string {
    const bits: string[] = [];
    if (site.mission_type) bits.push(site.mission_type);
    if (site.landing_date) bits.push(`landed ${site.landing_date}`);
    return bits.join(' · ') || '';
  }

  // Auto-switch OVERVIEW → STORY when tierContext flips on for the
  // first time on a site. Same rule as /mars: only when (a) story
  // exists, (b) user hasn't picked a different tab manually,
  // (c) we haven't already auto-switched for THIS site.
  let prevTierContextActive = $state(false);
  let storyAutoSwitchedForSite = $state<string | null>(null);
  $effect(() => {
    const active = tierContext !== null;
    const becameActive = active && !prevTierContextActive;
    prevTierContextActive = active;
    if (!becameActive) return;
    if (!selected) return;
    if (panelStory == null) return;
    if (panelTab !== 'overview') return;
    if (storyAutoSwitchedForSite === selected.id) return;
    panelTab = 'story';
    storyAutoSwitchedForSite = selected.id;
  });

  // ─── Detail-panel tabs (v0.1.10) ─────────────────────────────────
  type PanelTab = 'overview' | 'gallery' | 'story' | 'learn';
  let panelTab: PanelTab = $state('overview');
  let panelGallery: string[] = $state([]);
  let panelGalleryGrid = $derived(panelGallery.length <= 1 ? panelGallery : panelGallery.slice(1));
  let panelLightbox = $state<string | null>(null);
  let lastSelectedId = $state<string | null>(null);
  // #PE path-B: rich multi-agency narrative panel (the STORY tab).
  // Loaded from static/data/site-stories/<id>.json. Null when no
  // story file exists for this site → tab is hidden.
  let panelStory: SiteStory | null = $state(null);
  $effect(() => {
    if (selected && selected.id !== lastSelectedId) {
      panelTab = 'overview';
      panelLightbox = null;
      panelGallery = [];
      panelStory = null;
      lastSelectedId = selected.id;
      void getMoonSiteGallery(selected.id, selected.mission_id).then((urls) => {
        if (selected && selected.id === lastSelectedId) panelGallery = urls;
      });
      void getSiteStory(selected.id, localeFromPage($page)).then((story) => {
        if (selected && selected.id === lastSelectedId) panelStory = story;
      });
    }
  });
  type PanelLinks = NonNullable<MoonSite['links']>;
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
  // The `as MoonSite | null` cast guards against a Svelte 5 flow-
  // analysis quirk where `selected` is narrowed to `never` after the
  // earlier $derived.by reads it inside another closure. The cast
  // restores the union type for length-checking.
  let panelHasLinks = $derived.by(() => {
    const sel = selected as MoonSite | null;
    return sel != null && sel.links.length > 0;
  });

  // `face: true` is set by the URL-deep-link path so the moon rotates
  // to bring the selected site to camera-facing (otherwise the
  // halo + panel open but the site itself can be on the far side,
  // hidden until the user manually drags the moon — issue #227).
  // Click handlers don't pass `face` so picking a marker on screen
  // doesn't lurch the camera off whatever the user was looking at.
  let faceMoonAtSite: ((site: MoonSite) => void) | undefined;
  function selectSite(id: string, options: { face?: boolean } = {}) {
    const s = sites.find((x) => x.id === id);
    if (s) {
      selected = s;
      panelOpen = true;
      if (options.face) faceMoonAtSite?.(s);
    }
  }
  function toggleView() {
    view = view === '3d' ? '2d' : '3d';
  }

  // Site canvas positions for 2D hit-testing.
  const sitePos2d = new Map<string, { x: number; y: number }>();

  onMount(() => {
    if (!container || !canvas2d) return;

    getMoonSites(localeFromPage($page))
      .then((list) => {
        sites = list;
        // Deep-link: ?site=<id> opens the panel pre-selected. The
        // `face: true` flag also rotates the moon so the site faces
        // the camera (issue #227) — otherwise the halo opens but the
        // site itself can be on the far side, invisible until the
        // user manually drags.
        const siteParam = $page.url.searchParams.get('site');
        if (siteParam) selectSite(siteParam, { face: true });
      })
      .catch((err) => {
        console.error('Failed to load moon sites:', err);
        loadFailed = true;
      });

    // ──────────────────────────────────────────────────────────────
    // 3D — Moon sphere with surface texture
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

    // EffectComposer for hover-outline (mirrors /iss + /mars pattern).
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

    scene.add(new THREE.AmbientLight(0x666688, 0.7));
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
    const moonMap = textureLoader.load(`${base}/textures/2k_moon.jpg`);
    const moonRadius = 30;
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(moonRadius, 64, 64),
      new THREE.MeshPhongMaterial({ map: moonMap, color: 0xffffff, shininess: 4 }),
    );
    scene.add(moonMesh);

    // Issue #227 — `faceMoonAtSite(site)` rotates the moon mesh so
    // the site sits on the +Z hemisphere (camera-facing), and stops
    // autoSpin so the site stays put while the user reads the
    // panel. Only invoked from the URL deep-link path; ordinary
    // click selection doesn't trigger it (would feel jarring to
    // have the moon lurch under the user's cursor). Latitude isn't
    // adjusted — handling that would require moving the camera or
    // tilting the moon, both heavier changes; the longitude flip
    // alone covers the "site is on the far side" cases that
    // motivated the issue.
    faceMoonAtSite = (site: MoonSite) => {
      if (site.lat == null || site.lon == null) return;
      const { x, z } = latLonToUnitSphere(site.lat, site.lon);
      // Atan2(x, z) returns the longitude angle of the marker in
      // local frame; negate to rotate that angle TO +Z (the
      // default camera-facing axis).
      moonMesh.rotation.y = -Math.atan2(x, z);
      autoSpin = false;
    };

    // J.4 — Tidal-lock indicator. The Moon is in 1:1 synchronous
    // rotation with Earth, so one hemisphere (the "near side") always
    // faces Earth. We mark that hemisphere with a faint teal tint that
    // PARENTS to moonMesh — so when the user rotates the Moon (autoSpin
    // or drag), the marker rotates with the body, demonstrating that
    // a fixed lunar hemisphere is what stays Earth-facing in real life
    // (the Moon ISN'T idle in this view — autoSpin is purely visual).
    // Convention: lunar longitude 0 is +X in scene; near-side spans
    // -90° to +90° (i.e. +X half-sphere).
    const nearSideGeo = new THREE.SphereGeometry(
      moonRadius * 1.005,
      48,
      32,
      -Math.PI / 2,
      Math.PI, // half-sphere: π radians of azimuth = +X hemisphere
    );
    const nearSideOverlay = new THREE.Mesh(
      nearSideGeo,
      new THREE.MeshBasicMaterial({
        color: 0x4ecdc4,
        transparent: true,
        opacity: 0.18,
        side: THREE.FrontSide,
        depthWrite: false,
      }),
    );
    nearSideOverlay.userData.layerKey = 'tidal-lock';
    nearSideOverlay.visible = false;
    moonMesh.add(nearSideOverlay);
    const _stopTidalLockLayer = onLayerChange('tidal-lock', (on) => {
      nearSideOverlay.visible = on;
    });

    // Site markers — per-category geometry, anchored on the surface,
    // parented to moonMesh so they rotate with the sphere (post-v0.1.0
    // fix: previously markers floated in scene-space while the moon
    // spun underneath, breaking spatial reference). Markers are
    // tangent-aligned via lookAt(origin) so they "stand up" from the
    // surface instead of pointing along world axes.
    type MarkerObj = {
      group: THREE.Group;
      siteId: string;
      halo?: THREE.Mesh;
      labelGroup?: THREE.Group;
    };
    const markers: MarkerObj[] = [];

    // Surface Hotspots LOD dispatcher entries (PRD-014 / RFC-017 S1
    // — Apollo 11 Tier 0+1 swap demo). One entry per site whose
    // surface-hotspots.json sidecar gives hotspot_tier_max >= 1.
    // updateHotspotLOD() in the RAF loop swaps Tier 0 silhouette for
    // a hand-authored engineering model when the marker's screen-
    // projected radius exceeds 20 px.
    const hotspots: HotspotEntry[] = [];
    // Selected-site clamp scaffolding (port of /mars). Remember each
    // hotspot's data-driven maxTier so the per-frame clamp can read
    // back the original cap. Selected site keeps full maxTier; others
    // collapse to ≤ Tier 1 so neighbouring discs don't fight.
    const originalMaxTier = new Map<string, 0 | 1 | 2 | 3>();
    // Register the Tier 1 builders for ids the dispatcher might need
    // to lazy-instantiate. Per-route registration keeps the import
    // graph small for routes that don't use hotspots.
    registerHotspotModelBuilder('apollo-lm', buildApolloLMHotspot);
    registerHotspotModelBuilder('apollo-lm-extended', buildApolloLMExtendedHotspot);
    registerHotspotModelBuilder('luna-9-spherical', buildLuna9Hotspot);
    registerHotspotModelBuilder('luna-sample-return', buildLunaSampleReturnHotspot);
    registerHotspotModelBuilder('lunokhod-rover', buildLunokhodHotspot);
    registerHotspotModelBuilder('chang-e-lander', buildChangeLanderHotspot);
    registerHotspotModelBuilder('chang-e-lander-sample-return', (accent) =>
      buildChangeLanderHotspot(accent, { withAscentStage: true }),
    );
    registerHotspotModelBuilder('chandrayaan-3-vikram', buildChandrayaan3VikramHotspot);
    registerHotspotModelBuilder('slim-precision-lander', buildSLIMPrecisionLanderHotspot);
    registerHotspotModelBuilder('beresheet', buildBeresheetHotspot);
    // Preload the Image Pipeline v2 manifest so Tier 2 patch URLs are
    // ready by the time the user zooms in. Soft-fails to an empty
    // manifest if the file isn't deployed yet — patches fall back to
    // the placeholder material.
    void loadImageVisionManifest();

    // Selection-halo helper — small flat ring around a marker so the
    // user can tell which one they picked. Visibility toggled by the
    // $effect tied to `selected`.
    function makeHalo(color: string, radius: number): THREE.Mesh {
      const haloGeo = new THREE.RingGeometry(radius * 0.92, radius, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.visible = false;
      return halo;
    }

    // Per-mission surface markers come from `moon-lander-models.ts`,
    // mirroring the `earth-satellite-models.ts` pattern: each known
    // mission id gets a recognisable silhouette built from primitives
    // (Apollo LM descent stage, Lunokhod bathtub-on-wheels, Chang'e
    // hex bus, SLIM nose-down, Vikram + Pragyan pair, etc.), with
    // category-based fallbacks for ids without a dedicated builder.

    // Orbital ring + dot rendering (lunar orbiters — LRO, Clementine,
    // etc.). Mirrors the /mars pattern from PRD-009 / RFC-012 OQ-7.
    // Parented to scene rather than moonMesh so the dots don't
    // co-rotate with the Moon's tidally-locked-Earth-facing rotation —
    // orbiters track an inertial frame.
    type OrbitalMarker = {
      group: THREE.Group;
      ringMesh: THREE.Mesh;
      dotGroup: THREE.Group;
      siteId: string;
      ringRadius: number;
      orbitSpeed: number;
      orbitPhase: number;
      halo?: THREE.Mesh;
    };
    const orbitalMarkers: OrbitalMarker[] = [];

    function rebuildOrbitalMarkers() {
      for (const om of orbitalMarkers) {
        om.group.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry?.dispose();
            if (Array.isArray(o.material)) o.material.forEach((mat) => mat.dispose());
            else o.material?.dispose();
          }
        });
        scene.remove(om.group);
      }
      orbitalMarkers.length = 0;
      let phase = 0;
      for (const site of sites) {
        if (site.kind !== 'orbiter') continue;
        if (site.altitude_km == null || site.inclination_deg == null) continue;
        const color = colorFor(site);
        // Lunar orbital altitudes range from ~50 km (LRO) to ~470 km
        // (SMART-1). Compress with log scale so all rings fit cleanly
        // around the 30u Moon sphere without overlapping.
        const altScale = moonRadius + 4 + Math.log10(1 + site.altitude_km / 50) * 5;
        const inc = (site.inclination_deg * Math.PI) / 180;
        const group = new THREE.Group();
        const dimmed = site.status !== 'ACTIVE';
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: dimmed ? 0.2 : 0.4,
          side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(
          new THREE.RingGeometry(altScale - 0.06, altScale + 0.06, 96),
          ringMat,
        );
        ringMesh.rotation.x = inc;
        group.add(ringMesh);

        // 3D model — use the shared earth-satellite-models factory so
        // each spacecraft gets its real silhouette (LRO's asymmetric
        // single-wing bus, Clementine's compact tower, generic-orbiter
        // for the rest). Scale up 2x because the /moon scene is at
        // a larger world-unit scale than /earth (moonRadius 30 vs
        // earthRadius 8); without scaling the model reads as a dot.
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
        // Tag every child for raycast pick-routing back to the site.
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

        // Selection halo attached to dotGroup so it travels with the
        // orbiter around its ring.
        const halo = makeHalo(color, 1.8);
        dotGroup.add(halo);

        scene.add(group);
        orbitalMarkers.push({
          group,
          ringMesh,
          dotGroup,
          siteId: site.id,
          ringRadius: altScale,
          orbitSpeed: dimmed ? 0.06 : 0.2,
          orbitPhase: phase,
          halo,
        });
        phase += Math.PI / 5;
      }
    }

    function rebuildMarkers() {
      for (const mk of markers) {
        mk.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material?.dispose();
          }
        });
        moonMesh.remove(mk.group);
      }
      markers.length = 0;
      hotspots.length = 0;
      for (const site of sites) {
        // Skip orbiter entries — they go through rebuildOrbitalMarkers.
        if (site.kind === 'orbiter') continue;
        // Orbiter entries (kind:'orbiter') are filtered out at fetch
        // time on this route, but TS doesn't know that — guard so
        // surface-only positioning math doesn't deal with undefined.
        if (site.lat == null || site.lon == null) continue;
        const { x, y, z } = latLonToUnitSphere(site.lat, site.lon);
        const r = moonRadius;
        // Wrapper group — positions + orients the entire marker on
        // the planet surface. Contains the Tier 0 silhouette sub-group
        // (always present), plus any lazy-built Tier 1+ sub-groups
        // added by the hotspot LOD dispatcher, plus hit sphere + label
        // + halo as siblings.
        const group = new THREE.Group();
        const tier0Group = buildMoonLanderModel(site.id, site.mission_type, colorFor(site));
        group.add(tier0Group);
        // Anchor on the surface; orient the group so +Y points away from
        // Moon centre (radially outward), so cone-style markers stand up.
        group.position.set(x * r, y * r, z * r);
        const up = new THREE.Vector3(x, y, z);
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
        group.quaternion.copy(quat);
        group.userData = { siteId: site.id };

        // Invisible hit sphere — gives the click target a much larger
        // effective radius (3u vs the visible marker's ~0.6u) so the
        // user can grab a marker without the moon's rotation making
        // it slip away. Material is non-rendering but raycast-active.
        const hitSphere = new THREE.Mesh(
          new THREE.SphereGeometry(3.0, 8, 8),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        hitSphere.userData = { siteId: site.id };
        group.add(hitSphere);

        // Make every child (mesh + label sprite) pickable.
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
            obj.userData = { siteId: site.id };
          }
        });
        // Label with leader line, floating radially outward (along the
        // group's local +Y, which is surface-normal away from Moon
        // centre after the tangent-orient quat above).
        const label = buildLabel({
          text: site.name ?? site.id,
          color: colorFor(site),
          offset: new THREE.Vector3(0, 3.2, 0),
          size: 1.6,
        });
        group.add(label.group);

        // Selection halo (visible only while site === selected).
        const halo = makeHalo(colorFor(site), 1.8);
        halo.position.y = 0.02;
        halo.rotation.x = -Math.PI / 2;
        group.add(halo);

        // Surface Hotspot LOD enrolment (PRD-014 / RFC-017 S1).
        // Sites whose surface-hotspots.json sidecar gives
        // hotspot_tier_max >= 1 + a known hotspot_model id get a
        // dispatcher entry. The Tier 1 mesh is built lazily on first
        // promotion (when the user zooms in past the 20-px screen-
        // radius threshold) and added as a sibling of tier0Group
        // inside the wrapper.
        const maxTier = (site.hotspot_tier_max ?? 0) as 0 | 1 | 2 | 3;
        const builderId = site.hotspot_model;
        if (maxTier >= 1 && builderId) {
          const builder = getHotspotModelBuilder(builderId);
          if (builder) {
            const accent = colorFor(site);
            const tier2Source = site.hotspot_tier2_source;
            const tier2RegionalSource = site.hotspot_tier2_regional_source;
            // Tier 2 builder is wired only when the site declares a
            // tier2 source path. Texture URL is resolved against the
            // image-vision.json manifest (lazy 1:1 variant lookup);
            // if the manifest doesn't have an entry yet, fall back
            // to the raw 2048² JPEG at the sidecar's hotspot_tier2_source
            // path — soft-fail keeps Tier 2 visible during development
            // (same pattern as /mars).
            const annotations = site.hotspot_annotations;
            const tier2Builder =
              maxTier >= 2 && tier2Source
                ? () => {
                    const entry = getImageEntry(tier2Source);
                    const textureUrl =
                      (entry ? pickVariant(entry, 'thumbnail', false) : undefined) ?? tier2Source;
                    // Same resolution chain for the regional layer
                    // (Chang'e 2 mosaic or LROC WAC placeholder when
                    // wired; undefined today on /moon — patch builder
                    // skips the regional disc cleanly).
                    let regionalTextureUrl: string | undefined;
                    if (tier2RegionalSource) {
                      const rEntry = getImageEntry(tier2RegionalSource);
                      regionalTextureUrl =
                        (rEntry ? pickVariant(rEntry, 'thumbnail', false) : undefined) ??
                        tier2RegionalSource;
                    }
                    return buildHotspotSurfacePatch({
                      textureUrl,
                      regionalTextureUrl,
                      accentColor: accent,
                      siteId: site.id,
                      annotations,
                    });
                  }
                : undefined;
            const entry = createHotspotEntry({
              siteId: site.id,
              maxTier,
              group,
              tier0Group,
              tier1Builder: () => builder(accent),
              tier2Builder,
            });
            // Eager-build the tier2 patch when one is configured so
            // the camR-based opacity ramp has something to fade in
            // even before the dispatcher's Tier 2 promotion threshold
            // (projected radius >= 120 px ≈ camR ~38) fires. Without
            // this, the patch can only start to materialize once the
            // dispatcher decides we've earned Tier 2 — too late for
            // the user-expected "fade starts at camR ~50" smoothness.
            if (tier2Builder) {
              entry.tier2Group = tier2Builder();
              entry.tier2Group.visible = false;
              group.add(entry.tier2Group);
            }
            hotspots.push(entry);
            originalMaxTier.set(site.id, maxTier);
          }
        }

        moonMesh.add(group);
        markers.push({ group, siteId: site.id, halo, labelGroup: label.group });
      }
    }

    // Camera + controls
    let camR = 80;
    let camP = Math.PI / 2;
    let camT = 0;
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
    resetMoonCamera = () => {
      camR = camR0;
      camP = camP0;
      camT = camT0;
      updateCam();
    };

    // Phase 6 (#118) — panorama enter/exit hooks. Closure over
    // moonMesh + camR + scene; exposed to the route's outer state
    // via the enterPanorama / exitPanorama function pointers.
    let savedCamR = camR;
    enterPanorama = (textureUrl: string, siteId: string) => {
      if (panoramaActive) return;
      // saveData users get a heads-up affordance handled outside; if
      // we reach here, the user explicitly opted in.
      panoramaSkybox = createSkybox({ textureUrl, siteId });
      scene.add(panoramaSkybox.group);
      panoramaSkybox.activate();
      moonMesh.visible = false;
      savedCamR = camR;
      // Move camera close to origin so the user's drag-to-rotate
      // feels like spinning their head inside the skybox.
      camR = 0.5;
      updateCam();
      panoramaActive = true;
    };
    exitPanorama = () => {
      if (!panoramaActive) return;
      panoramaActive = false;
      panoramaSkybox?.deactivate();
      // Defer dispose so the fade-out completes.
      const handle = panoramaSkybox;
      panoramaSkybox = null;
      setTimeout(() => handle?.dispose(), 1300);
      moonMesh.visible = true;
      camR = savedCamR;
      updateCam();
    };
    // ESC exits panorama mode.
    const onPanoramaKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panoramaActive) exitPanorama();
    };
    window.addEventListener('keydown', onPanoramaKey);

    const el3d = renderer.domElement;
    let isDrag = false;
    let lmx = 0;
    let lmy = 0;
    let dragMoved = false;
    let downX = 0;
    let downY = 0;

    const ray = new THREE.Raycaster();
    function pickSiteAt(clientX: number, clientY: number): string | null {
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const targets: THREE.Object3D[] = [];
      if (layerSurface) for (const mk of markers) targets.push(mk.group);
      if (layerOrbiters) for (const om of orbitalMarkers) targets.push(om.dotGroup);
      const hits = ray.intersectObjects(targets, true);
      const hit = hits.find((h) => typeof h.object.userData.siteId === 'string');
      return hit ? (hit.object.userData.siteId as string) : null;
    }

    function tryPick3d(clientX: number, clientY: number) {
      const id = pickSiteAt(clientX, clientY);
      if (id) selectSite(id);
    }

    let hoveredSiteId: string | null = null;
    const onHover = (e: MouseEvent) => {
      if (isDrag) return;
      hoveredSiteId = pickSiteAt(e.clientX, e.clientY);
    };
    const onHoverLeave = () => {
      hoveredSiteId = null;
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
      // Panorama-mode tilt clamp (±20° around horizon). Same shape
      // as /mars's panorama clamp: skybox padding tops/bottoms only
      // cover ~25° before exposing the sky band — ±20° keeps the
      // user inside published imagery on every site without per-site
      // bookkeeping. Outside panorama the existing near-poles clamp
      // applies.
      if (panoramaActive) {
        const tiltClamp = 0.349; // ≈ 20° in radians
        camP = Math.max(
          Math.PI / 2 - tiltClamp,
          Math.min(Math.PI / 2 + tiltClamp, camP + (e.clientY - lmy) * 0.005),
        );
      } else {
        camP = Math.max(0.05, Math.min(Math.PI - 0.05, camP + (e.clientY - lmy) * 0.005));
      }
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
      // preventDefault prevents trackpad pinch-zoom from triggering
      // browser-level zoom (Cmd-scroll). Registered with passive:false
      // below so this works (was passive:true → browser zoomed and
      // the moon stayed put).
      e.preventDefault();
      camR = Math.max(30.2, Math.min(200, camR + e.deltaY * 0.05));
      updateCam();
    };

    // Touch — single-finger orbit + two-finger pinch
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
        // Two-finger pinch — preventDefault so the browser doesn't
        // also do its native pinch-zoom on the page itself.
        e.preventDefault();
        const d = tDist(e.touches[0], e.touches[1]);
        camR = Math.max(30.2, Math.min(200, camR * (pinchPrev / d)));
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
      // Panorama-mode tilt clamp (±20°), same as the mouse path.
      if (panoramaActive) {
        const tiltClamp = 0.349;
        camP = Math.max(
          Math.PI / 2 - tiltClamp,
          Math.min(Math.PI / 2 + tiltClamp, camP + (e.touches[0].clientY - lmy) * 0.005),
        );
      } else {
        camP = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, camP + (e.touches[0].clientY - lmy) * 0.005),
        );
      }
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
    // wheel + touchmove must be passive:false so onWheel /
    // onTouchMove can preventDefault() against browser zoom /
    // scroll. touchstart stays passive (no preventDefault inside).
    el3d.addEventListener('wheel', onWheel, { passive: false });
    el3d.addEventListener('touchstart', onTouchStart, { passive: true });
    el3d.addEventListener('touchmove', onTouchMove, { passive: false });
    el3d.addEventListener('touchend', onTouchEnd);
    el3d.addEventListener('touchcancel', onTouchEnd);

    // 2D context + lunar disc photos for the orthographic discs.
    // Loading async; until ready, draw2d falls back to the gradient.
    const c2 = canvas2d;
    const _maybeCtx = c2.getContext('2d');
    if (!_maybeCtx) throw new Error('2D context unavailable');
    const ctx2: CanvasRenderingContext2D = _maybeCtx;

    const moonNearImg = new Image();
    moonNearImg.src = `${base}/textures/moon_near.jpg`;
    const moonFarImg = new Image();
    moonFarImg.src = `${base}/textures/moon_far.jpg`;
    let nearReady = false;
    let farReady = false;
    moonNearImg.onload = () => {
      nearReady = true;
      if (view === '2d') draw2d();
    };
    moonFarImg.onload = () => {
      farReady = true;
      if (view === '2d') draw2d();
    };

    function draw2d() {
      // Defensive resize
      if (c2.width !== c2.clientWidth || c2.height !== c2.clientHeight) {
        c2.width = c2.clientWidth;
        c2.height = c2.clientHeight;
      }
      const W = c2.width;
      const H = c2.height;
      if (W === 0 || H === 0) return;

      ctx2.fillStyle = '#04040c';
      ctx2.fillRect(0, 0, W, H);

      // v0.1.8 — two side-by-side orthographic moon discs (near + far
      // side) instead of an equirectangular flat map. Each disc shows
      // the moon as a sphere viewed straight-on; sites project via
      // (sin lon · cos lat, -sin lat) and are visible when their
      // hemisphere is the one being shown.
      const stars = 80;
      for (let i = 0; i < stars; i++) {
        const sx = (i * 137.5 * 31 + i * 71) % W;
        const sy = (i * 137.5 * 17 + i * 53) % H;
        ctx2.beginPath();
        ctx2.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
        ctx2.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
        ctx2.fill();
      }

      const discR = Math.min(W * 0.2, H * 0.42);
      const yMid = H * 0.46;
      const nearCx = W * 0.27;
      const farCx = W * 0.73;

      const drawDisc = (
        cx: number,
        cy: number,
        labelText: string,
        labelColor: string,
        isFarSide: boolean,
      ) => {
        // Moon body — real photo of this hemisphere clipped to a circle
        // (v0.1.8). Falls back to grey gradient until images load.
        const img = isFarSide ? moonFarImg : moonNearImg;
        const ready = isFarSide ? farReady : nearReady;
        ctx2.save();
        ctx2.beginPath();
        ctx2.arc(cx, cy, discR, 0, Math.PI * 2);
        ctx2.clip();
        if (ready && img.naturalWidth > 0) {
          ctx2.drawImage(img, cx - discR, cy - discR, discR * 2, discR * 2);
        } else {
          const grad = ctx2.createRadialGradient(
            cx - discR * 0.25,
            cy - discR * 0.25,
            discR * 0.05,
            cx,
            cy,
            discR,
          );
          grad.addColorStop(0, '#cdcdc8');
          grad.addColorStop(0.6, '#7c7a76');
          grad.addColorStop(1, '#28272a');
          ctx2.fillStyle = grad;
          ctx2.fillRect(cx - discR, cy - discR, discR * 2, discR * 2);
        }
        ctx2.restore();

        // Limb shadow ring
        ctx2.beginPath();
        ctx2.arc(cx, cy, discR + 0.5, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx2.lineWidth = 1;
        ctx2.stroke();

        // Faint latitude bands at ±30, ±60 — visible as horizontal
        // chord arcs across the disc.
        ctx2.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx2.lineWidth = 0.5;
        for (const lat of [-60, -30, 0, 30, 60]) {
          const y = cy - Math.sin((lat * Math.PI) / 180) * discR;
          const halfWidth = Math.cos((lat * Math.PI) / 180) * discR;
          ctx2.beginPath();
          ctx2.moveTo(cx - halfWidth, y);
          ctx2.lineTo(cx + halfWidth, y);
          ctx2.stroke();
        }

        // Disc label
        ctx2.font = "bold 9px 'Space Mono',monospace";
        ctx2.fillStyle = labelColor;
        ctx2.textAlign = 'center';
        ctx2.fillText(labelText, cx, cy + discR + 24);

        // Site markers — only the ones on this hemisphere. Skip
        // orbiter entries (no lat/lon); they're catalogued in
        // moon-sites.json but not yet rendered on /moon — see filter
        // in onMount, and the Mars-first orbiter rollout in PRD-009.
        for (const site of sites) {
          if (site.lat == null || site.lon == null) continue;
          const latRad = (site.lat * Math.PI) / 180;
          const lonRad = (site.lon * Math.PI) / 180;
          const z = Math.cos(latRad) * Math.cos(lonRad);
          const onThisSide = isFarSide ? z < 0 : z > 0;
          if (!onThisSide) continue;

          // Project: x flows with sin(lon); far-side mirrors so
          // longitudes >90 stay readable left-to-right.
          let xLocal = Math.sin(lonRad) * Math.cos(latRad);
          if (isFarSide) xLocal = -xLocal;
          const yLocal = -Math.sin(latRad);
          const px = cx + xLocal * discR;
          const py = cy + yLocal * discR;

          const color = colorFor(site);
          const isSel = selected?.id === site.id;

          // Glow
          const gl = ctx2.createRadialGradient(px, py, 0, px, py, 10);
          gl.addColorStop(0, color + '99');
          gl.addColorStop(1, 'transparent');
          ctx2.beginPath();
          ctx2.arc(px, py, 10, 0, Math.PI * 2);
          ctx2.fillStyle = gl;
          ctx2.fill();

          if (isSel) {
            ctx2.beginPath();
            ctx2.arc(px, py, 9, 0, Math.PI * 2);
            ctx2.strokeStyle = '#fff';
            ctx2.lineWidth = 1.5;
            ctx2.stroke();
          }

          ctx2.beginPath();
          ctx2.arc(px, py, 4, 0, Math.PI * 2);
          ctx2.fillStyle = color;
          ctx2.fill();

          // Site label
          ctx2.font = "7px 'Space Mono',monospace";
          ctx2.fillStyle = color + 'cc';
          ctx2.shadowColor = 'rgba(0,0,0,0.85)';
          ctx2.shadowBlur = 4;
          ctx2.textAlign = 'left';
          ctx2.fillText(site.name ?? site.id, px + 6, py + 3);
          ctx2.shadowBlur = 0;

          sitePos2d.set(site.id, { x: px, y: py });
        }
      };

      sitePos2d.clear();
      drawDisc(nearCx, yMid, 'NEAR SIDE · EARTH-FACING', 'rgba(220,220,200,0.85)', false);
      drawDisc(farCx, yMid, 'FAR SIDE', 'rgba(220,220,200,0.85)', true);

      // Nation legend (bottom)
      const legendY = H - 32;
      ctx2.font = "bold 7px 'Space Mono',monospace";
      ctx2.textAlign = 'left';
      ctx2.shadowBlur = 0;
      let legendX = 36;
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
      let best: { id: string; d: number } | null = null;
      for (const [id, pos] of sitePos2d.entries()) {
        const d = Math.hypot(cx - pos.x, cy - pos.y);
        if (d < 22 && (!best || d < best.d)) best = { id, d };
      }
      if (best) selectSite(best.id);
    }
    c2.addEventListener('click', on2dClick);

    // Resize + animation loop
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
    const stopReducedMotionWatch = onReducedMotionChange((r) => {
      reducedMotion = r;
    });
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Rebuild markers if the site list changed (cheap — happens once
      // when the data loads). Same trigger covers the orbital ring
      // rebuild (8 lunar orbiters added in v0.4 — Issue #40 / PRD-009).
      const surfaceCount = sites.filter((s) => s.kind !== 'orbiter').length;
      const orbitalCount = sites.filter((s) => s.kind === 'orbiter').length;
      if (surfaceCount !== markers.length) rebuildMarkers();
      if (orbitalCount !== orbitalMarkers.length) rebuildOrbitalMarkers();

      // Apply layer visibility every frame so chip toggles take effect
      // immediately (cheap — small static arrays).
      const selId = selected?.id ?? null;
      // Selection-ring hide at Tier 2+ (port of /mars). The halo ring
      // visually fights the LROC disc once the camera is in close —
      // hide it when the site's currently-displayed tier ≥ 2 (or
      // mid-transition with targetTier ≥ 2). Build a quick lookup so
      // the halo loop stays a single pass.
      const tierBySiteId = new Map<string, number>();
      for (const h of hotspots) {
        const t = Math.max(h.currentTier, h.targetTier);
        tierBySiteId.set(h.siteId, t);
      }
      for (const mk of markers) {
        mk.group.visible = layerSurface;
        if (mk.halo) {
          const t = tierBySiteId.get(mk.siteId) ?? 0;
          mk.halo.visible = layerSurface && mk.siteId === selId && t < 2;
        }
      }
      for (const om of orbitalMarkers) {
        // ORBITERS chip controls the spacecraft model. ORBITS chip
        // independently hides the ring lines (cleaner sky for users
        // who just want to see where the orbiters are right now).
        om.dotGroup.visible = layerOrbiters;
        om.ringMesh.visible = layerOrbiters && layerOrbits;
        if (om.halo) om.halo.visible = layerOrbiters && om.siteId === selId;
      }

      // ADR-025: auto-rotate stops when prefers-reduced-motion is set.
      // Drag-to-orbit still works.
      // v0.1.7+: rotation slowed (was 0.05 rad/s) so users have time
      // to track and click moving labels. ADR-025 reduced-motion gate
      // still applies.
      if (!reducedMotion && autoSpin) moonMesh.rotation.y += dt * 0.015;

      // Orbital dot motion — perception-scaled, ~30 s per ring.
      for (const om of orbitalMarkers) {
        if (!om.group.visible) continue;
        if (!reducedMotion) om.orbitPhase += dt * om.orbitSpeed;
        const a = om.orbitPhase;
        const lx = Math.cos(a) * om.ringRadius;
        const lz = Math.sin(a) * om.ringRadius;
        const inc = om.ringMesh.rotation.x;
        const cosI = Math.cos(inc);
        const sinI = Math.sin(inc);
        // Apply ringMesh's rotation.x to the dot's local position so
        // the dot tracks the inclined ring exactly (mirror of /mars).
        om.dotGroup.position.set(lx, -lz * sinI, lz * cosI);
      }

      // Outline-on-hover (skipped if hovered === selected).
      const outlineMeshes: THREE.Object3D[] = [];
      const selectedId = selected?.id;
      if (hoveredSiteId && hoveredSiteId !== selectedId) {
        const mk = markers.find((x) => x.siteId === hoveredSiteId);
        if (mk) outlineMeshes.push(mk.group);
        const om = orbitalMarkers.find((x) => x.dotGroup.userData.siteId === hoveredSiteId);
        if (om) outlineMeshes.push(om.dotGroup);
      }
      outlinePass.selectedObjects = outlineMeshes;

      // Scale-pulse on selected marker.
      const pulseScale = 1 + Math.sin(now * 0.0026) * 0.06;
      for (const mk of markers) {
        mk.group.scale.setScalar(mk.siteId === selectedId ? pulseScale : 1);
      }
      for (const om of orbitalMarkers) {
        const id = om.dotGroup.userData.siteId as string | undefined;
        om.dotGroup.scale.setScalar(id === selectedId ? pulseScale : 1);
      }

      // Surface Hotspots LOD (PRD-014 / RFC-017 S1).
      // Per-frame tier selection based on screen-projected marker size.
      // For S1, only Apollo 11 swaps Tier 0 → Tier 1; other hotspots
      // join the dispatcher as their sub-issues land.
      if (hotspots.length) {
        // Selected-site clamp (port of /mars). Without a selection
        // every hotspot uses its data-driven maxTier; with one,
        // non-selected sites clamp to ≤ Tier 1 so adjacent discs
        // don't visually fight. Dispatcher reads entry.maxTier each
        // frame so mutating in-place here is safe.
        const selectedHotspotId = selected?.id;
        for (const h of hotspots) {
          const orig = originalMaxTier.get(h.siteId) ?? (h.maxTier as 0 | 1 | 2 | 3);
          if (selectedHotspotId == null || selectedHotspotId === h.siteId) {
            h.maxTier = orig;
          } else {
            h.maxTier = Math.min(1, orig) as 0 | 1;
          }
        }
        const canvasH = renderer.domElement.clientHeight || 1;
        updateHotspotLOD(hotspots, camera, canvasH, now, dt * 1000);
        // Publish the highest currently-displayed tier on the canvas
        // for e2e assertions (#116 S8).
        let topTier = 0;
        for (const h of hotspots) if (h.currentTier > topTier) topTier = h.currentTier;
        const target = renderer.domElement;
        const attr = target.getAttribute('data-hotspot-tier');
        const next = String(topTier);
        if (attr !== next) target.setAttribute('data-hotspot-tier', next);

        // Zoom-aware model scaling. tier0 marker + tier1 lander shrink
        // toward 0.2× at the closest zoom so they sit readably on the
        // LROC patch rather than dominating it. Same shape as /mars.
        const zoomScale = computeTierScale(camR);
        for (const h of hotspots) {
          if (h.tier0Group) h.tier0Group.scale.setScalar(zoomScale);
          if (h.tier1Group) h.tier1Group.scale.setScalar(zoomScale);
        }

        // Site labels — shrink with zoomScale but floored at 0.65 so
        // they stay readable. Hide entirely when promoted to Tier 2+
        // (the label is at the patch centre and visually crowds the
        // disc; /mars uses the same pattern).
        const tierByIdForLabels = new Map<string, number>();
        for (const h of hotspots) {
          tierByIdForLabels.set(h.siteId, Math.max(h.currentTier, h.targetTier));
        }
        for (const mk of markers) {
          if (!mk.labelGroup) continue;
          const t = tierByIdForLabels.get(mk.siteId) ?? 0;
          if (t >= 2) {
            mk.labelGroup.visible = false;
            continue;
          }
          mk.labelGroup.visible = true;
          mk.labelGroup.scale.setScalar(Math.max(0.65, zoomScale));
        }

        // Tier-2 detail opacity ramp. Patch is eager-built at site
        // creation so tier2Group exists even when curTier < 2; we
        // override the dispatcher's "tier2 hidden when tier<2"
        // decision and control visibility 100% via camR. The ramp
        // runs from detailFadeStart (patch begins to appear) down
        // to detailFadeEnd (patch fully solid). Window deliberately
        // wide (50→33 = 17u) so the fade reads as a real transition.
        const detailFadeStart = 50;
        const detailFadeEnd = 33;
        const detailOpacity =
          camR >= detailFadeStart
            ? 0
            : camR <= detailFadeEnd
              ? 1
              : 1 - (camR - detailFadeEnd) / (detailFadeStart - detailFadeEnd);
        for (const h of hotspots) {
          if (!h.tier2Group) continue;
          // Force group visible when ramp is > 0 (dispatcher would
          // otherwise hide it whenever currentTier !== 2).
          h.tier2Group.visible = detailOpacity > 0.01;
          h.tier2Group.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            // Apply ramp to the detail layer; regional layer (when
            // wired in Phase 2) follows the same opacity for now.
            const layer = obj.userData?.layer;
            if (layer !== 'detail' && layer !== 'regional') return;
            const mat = obj.material as THREE.Material & { opacity: number };
            mat.opacity = detailOpacity;
            mat.transparent = detailOpacity < 0.99;
          });
        }

        // TierContext info card (PRD-014 §v0.7.x). When any hotspot
        // is at Tier 2+, surface attribution for the layers currently
        // composed on its disc. Same pattern as /mars.
        let bestH: { siteId: string } | null = null;
        let bestTier = 0;
        for (const h of hotspots) {
          if (h.currentTier >= 2 && h.currentTier > bestTier) {
            bestTier = h.currentTier;
            bestH = { siteId: h.siteId };
          }
        }
        if (bestH) {
          const site = sites.find((s) => s.id === bestH!.siteId);
          if (site) {
            const hasRegional = !!site.hotspot_tier2_regional_source;
            const hasDetail = !!site.hotspot_tier2_source;
            const agencyChip = nationChipFor(site);
            const layers: TierLayer[] = [];
            // Regional layer — undefined on Moon today; Phase 2 with
            // Chang'e 2 mosaic will fill this. The block is wired so
            // the moment a regional source lands, the row appears.
            if (hasRegional) {
              layers.push({
                layerLabel: 'Regional view',
                sourceTitle: 'Regional mosaic',
                sourceAuthor: 'TBD — placeholder until Phase 2 lands',
                resolutionText: 'TBD',
                licenseShort: 'TBD',
              });
            }
            if (hasDetail) {
              layers.push({
                layerLabel: 'Detail view',
                sourceTitle: 'LROC NAC ROI mosaic',
                sourceAuthor: 'NASA / GSFC / Arizona State University LROC team',
                resolutionText: '5 m/px',
                sourceUrl: 'https://pds.lroc.im-ldi.com/',
                licenseShort: 'PD-NASA',
              });
            }
            tierContext = {
              siteId: site.id,
              siteName: site.name ?? site.id,
              nation: agencyChip.label,
              nationColor: agencyChip.color,
              missionContext: missionContextFor(site),
              layers,
              uncertaintyM: site.location_uncertainty_m,
            };
          }
        } else if (tierContext !== null) {
          tierContext = null;
        }

        // Debug overlay write — guarded by showDebug (?debug=1).
        // Same shape as /mars's debugInfo block.
        if (showDebug) {
          let maxAcross = 0;
          for (const h of hotspots) if (h.maxTier > maxAcross) maxAcross = h.maxTier;
          let curTop = 0;
          for (const h of hotspots) if (h.currentTier > curTop) curTop = h.currentTier;
          let tgtTop = 0;
          for (const h of hotspots) if (h.targetTier > tgtTop) tgtTop = h.targetTier;
          debugInfo.siteCount = sites.length;
          debugInfo.hotspotCount = hotspots.length;
          debugInfo.maxTierAcrossSites = maxAcross;
          debugInfo.currentTopTier = curTop;
          debugInfo.targetTopTier = tgtTop;
          debugInfo.pageMode = hotspotsMode;
          debugInfo.dispatcherMode = getHotspotMode();
          debugInfo.camR = camR;
          if (hotspots.length > 0) {
            const h = hotspots[0];
            const wp = new THREE.Vector3();
            h.group.getWorldPosition(wp);
            const canvasH = renderer.domElement.clientHeight || 1;
            const distance = camera.position.distanceTo(wp);
            const halfH = distance * Math.tan((camera.fov * Math.PI) / 360);
            const pxPerUnit = canvasH / (2 * halfH);
            debugInfo.projectedPxSample = `${h.siteId} dist=${distance.toFixed(1)}u px/u=${pxPerUnit.toFixed(0)}`;
          }
          let t2built = 0;
          let t2visible = 0;
          for (const h of hotspots) {
            if (h.tier2Group) {
              t2built++;
              if (h.tier2Group.visible) t2visible++;
            }
          }
          debugInfo.tier2Status = `${t2built} built / ${t2visible} visible`;
          const h0 = hotspots[0];
          if (h0?.tier2Group) {
            const tg = h0.tier2Group;
            const fmRef: Array<THREE.Mesh> = [];
            tg.traverse((o) => {
              if (fmRef.length === 0 && o instanceof THREE.Mesh) fmRef.push(o);
            });
            const firstMesh: THREE.Mesh | null = fmRef[0] ?? null;
            const wp = new THREE.Vector3();
            if (firstMesh) firstMesh.getWorldPosition(wp);
            else tg.getWorldPosition(wp);
            let cur: THREE.Object3D | null = tg as THREE.Object3D;
            let hidden = false;
            while (cur) {
              if (!cur.visible) {
                hidden = true;
                break;
              }
              cur = cur.parent;
            }
            const reachable = !hidden;
            const m = firstMesh
              ? (firstMesh.material as THREE.Material & { opacity?: number })
              : null;
            debugInfo.patchDetail = `tg.children=${tg.children.length} tg.visible=${tg.visible} reachable=${reachable} meshVis=${firstMesh?.visible ?? '?'} matOp=${m?.opacity ?? '?'} worldR=${wp.length().toFixed(2)}`;
          }
        }
      }

      if (view === '3d') composer.render();
      else draw2d();
    };
    animate(performance.now());

    cleanup = () => {
      cancelAnimationFrame(rafId);
      stopReducedMotionWatch();
      _stopTidalLockLayer?.();
      window.removeEventListener('keydown', onPanoramaKey);
      panoramaSkybox?.dispose();
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

<svelte:head><title>{m.moon_page_title()}</title></svelte:head>

<div class="moon">
  <!-- Non-visual parallel mode (PRD-007 / GH #256 / ADR-025 v0.7.0).
       Screen-reader-only mirror of the 3D-canvas site markers. Each
       button fires the same selectSite handler that a canvas click
       does, so a screen-reader user can navigate to any landing
       site without sighted help. Visually hidden via .sr-only;
       always present in the DOM + tab order. -->
  <ul class="sr-only sr-site-list" aria-label={m.a11y_moon_sites_list_aria()}>
    {#each sites as site (site.id)}
      <li>
        <button
          type="button"
          onclick={() => selectSite(site.id, { face: true })}
          aria-current={selected?.id === site.id ? 'true' : undefined}
        >
          {m.a11y_select_site_template({
            name: site.name ?? site.site_name ?? site.id,
            agency: site.agency ?? '',
          })}
        </button>
      </li>
    {/each}
  </ul>

  <div class="layer" bind:this={container} class:hidden={view !== '3d'}></div>
  <canvas
    class="layer"
    bind:this={canvas2d}
    class:hidden={view !== '2d'}
    aria-label={m.moon_canvas_label()}
    data-sites-count={sites.length}
  ></canvas>

  <!-- Top-left HUD cluster (matches /explore + /mars convention from v0.4). -->
  <div class="hud-controls" role="group" aria-label={m.ui_view_controls()}>
    <div class="ctrl-row">
      <button
        type="button"
        class="toggle"
        onclick={toggleView}
        aria-pressed={view === '2d'}
        data-testid="mode-toggle"
      >
        {view === '3d' ? m.moon_label_view_2d() : m.moon_label_view_3d()}
      </button>
      {#if view === '3d'}
        <button
          type="button"
          class="toggle"
          data-testid="reset-camera"
          onclick={() => resetMoonCamera()}
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
        title={m.moon_layer_tip_surface()}
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
        title={m.moon_layer_tip_orbiters()}
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
        title={m.moon_layer_tip_orbit_rings()}
        data-testid="layer-orbits"
      >
        {m.ui_layer_orbits()}
      </button>
      <button
        type="button"
        class="chip chip-hotspots"
        class:active={hotspotsMode !== 'low'}
        onclick={cycleHotspotsMode}
        title="Surface Hotspots LOD · click to cycle AUTO ↔ LOW ↔ HIGH"
        aria-label="Hotspots tier: {hotspotsMode}"
        data-testid="layer-hotspots"
        data-hotspots-mode={hotspotsMode}
      >
        HOTSPOTS · {hotspotsMode.toUpperCase()}
      </button>
    </div>
  </div>

  {#if loadFailed}
    <div class="load-banner" role="alert">{m.moon_load_failed()}</div>
  {/if}

  {#if showDebug}
    {@const debugText = `hotspots debug (moon)
sidecar     ${debugInfo.sidecarStatus}
sites       ${debugInfo.siteCount}
hotspots    ${debugInfo.hotspotCount}
maxTier     ${debugInfo.maxTierAcrossSites}  (sidecar joined to sites)
targetTier  ${debugInfo.targetTopTier}  (dispatcher's intended top tier)
curTier     ${debugInfo.currentTopTier}  (dispatcher's settled top tier)
pageMode    ${debugInfo.pageMode}
dispMode    ${debugInfo.dispatcherMode}  (currentMode in dispatcher module)
tier2       ${debugInfo.tier2Status}
patch[0]    ${debugInfo.patchDetail}
camR        ${debugInfo.camR.toFixed(1)}
sample      ${debugInfo.projectedPxSample}`}
    <div
      style="position:fixed;top:80px;left:12px;z-index:9999;background:rgba(0,0,0,0.85);color:#0f0;font:11px/1.4 ui-monospace,SFMono-Regular,monospace;padding:8px 10px;border:1px solid #0f0;border-radius:4px;user-select:text;-webkit-user-select:text;"
    >
      <pre
        style="margin:0;color:inherit;font:inherit;white-space:pre;user-select:text;">{debugText}</pre>
      <button
        type="button"
        style="margin-top:6px;background:#0f0;color:#000;border:0;padding:2px 8px;font:inherit;cursor:pointer;border-radius:2px;"
        onclick={() => {
          void navigator.clipboard?.writeText(debugText);
        }}>copy</button
      >
    </div>
  {/if}

  <!-- TierContext info card — same shape as /mars. Visible only at
       Tier 2+ when not in panorama mode. aria-live so screen-readers
       announce the layer changes as the user zooms in/out. -->
  {#if view === '3d' && tierContext && !panoramaActive}
    <div class="tier-context-card" aria-live="polite">
      <div class="tcc-head">
        <span class="tcc-site">{tierContext.siteName}</span>
        <span class="tcc-chip" style="color: {tierContext.nationColor};">{tierContext.nation}</span>
      </div>
      {#if tierContext.missionContext}
        <div class="tcc-mission">{tierContext.missionContext}</div>
      {/if}
      {#each tierContext.layers as layer, i (layer.layerLabel)}
        <div class="tcc-layer-block" class:tcc-layer-block-next={i > 0}>
          <div class="tcc-layer">{layer.layerLabel} · {layer.resolutionText}</div>
          <div class="tcc-source">{layer.sourceTitle}</div>
          <div class="tcc-author">{layer.sourceAuthor}</div>
          <div class="tcc-footer">
            <span class="tcc-license">{layer.licenseShort}</span>
            {#if i === tierContext.layers.length - 1 && tierContext.uncertaintyM != null}
              <span class="tcc-uncertainty">±{tierContext.uncertaintyM} m</span>
            {/if}
            {#if layer.sourceUrl}
              <a
                class="tcc-link"
                href={layer.sourceUrl}
                target="_blank"
                rel="noopener noreferrer external"
                title="Open the source page in a new tab">source ↗</a
              >
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Panorama mode overlay (Phase 6 / #118). The "Return to orbit"
       button is the visible exit; ESC also exits. Hidden-text desc
       is read by screen readers for vision-impaired users. -->
  {#if panoramaActive}
    <div
      class="panorama-overlay"
      role="region"
      aria-label="Ground-view panorama mode — press ESC to return to orbit"
      data-testid="panorama-overlay"
    >
      <span class="sr-only">
        You are standing at the landing site. The lander is in front of you. Drag to look around.
        Press the Exit panorama view button in the detail panel, or press Esc, to return to orbit.
      </span>
    </div>
  {/if}

  <!-- Nation legend overlay. The 2D view paints this directly into
       the canvas (line 617 of the 2D draw); the 3D view is a Three.js
       scene that can't host text reliably, so we mirror the legend as
       a CSS overlay. Same NATION_COLORS keep the two views in sync. -->
  {#if view === '3d'}
    <div class="legend-3d" aria-label={m.moon_legend_nation_aria()}>
      {#each Object.entries(NATION_COLORS) as [nation, color] (nation)}
        <span class="legend-item">
          <span class="legend-dot" style:background={color}></span>
          {nation}
        </span>
      {/each}
    </div>
  {/if}

  <Panel
    open={panelOpen}
    title={selected?.name ?? selected?.id ?? ''}
    onClose={() => (panelOpen = false)}
  >
    {#if selected}
      <div class="head" style:--accent={colorFor(selected)}>
        <div class="agency-row">
          <span class="agency-badge" style:background-color={colorFor(selected)}>
            {selected.nation} · {selected.agency}
          </span>
          <span class="status status-{selected.surface_status}"
            >{selected.surface_status.toUpperCase()}</span
          >
        </div>
        <h1 class="name">{selected.name ?? selected.id}</h1>
        {#if selected.mission_type || selected.site_name}
          <p class="type">
            {selected.mission_type ?? ''}
            {#if selected.site_name}· {selected.site_name}{/if}
            {#if selected.mission_type}
              <ScienceChip
                tab="mission-phases"
                section="mission-types"
                label={m.chip_label_mission_types()}
              />
            {/if}
          </p>
        {/if}
        {#if selected.hotspot_tier3_panorama}
          {#if panoramaActive}
            <button
              type="button"
              class="stand-at-site stand-at-site--exit"
              data-testid="exit-panorama"
              onclick={exitPanorama}
              title="Exit panorama view (Esc)"
            >
              Exit panorama view
            </button>
          {:else}
            <button
              type="button"
              class="stand-at-site"
              data-testid="stand-at-site"
              onclick={() =>
                enterPanorama(`${base}${selected!.hotspot_tier3_panorama!}`, selected!.id)}
              title={isSaveDataActive()
                ? 'Tap to load panorama (~8 MB) — saveData is on'
                : 'Stand at this landing site — wrap-around ground view'}
            >
              Stand at site{isSaveDataActive() ? ' (tap to load)' : ''}
            </button>
          {/if}
        {/if}
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
        {#if panelStory}
          <button
            type="button"
            class:active={panelTab === 'story'}
            onclick={() => (panelTab = 'story')}
            role="tab"
            aria-selected={panelTab === 'story'}
            data-testid="panel-tab-story">{m.panel_tab_story()}</button
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
            <div class="cell-label">{m.moon_panel_year()}</div>
            <div class="cell-value">{selected.year}</div>
          </div>
          {#if selected.kind === 'orbiter'}
            <!-- Orbiter cells: altitude + inclination instead of lat/lon. -->
            <div class="cell">
              <div class="cell-label">{m.earth_panel_alt()}</div>
              <div class="cell-value">{selected.altitude_km?.toLocaleString() ?? '—'} km</div>
            </div>
            <div class="cell">
              <div class="cell-label">{m.panel_label_inclination()}</div>
              <div class="cell-value">{selected.inclination_deg?.toFixed(1) ?? '—'}°</div>
            </div>
            <div class="cell">
              <div class="cell-label">{m.moon_panel_status()}</div>
              <div class="cell-value short">{selected.status}</div>
            </div>
          {:else}
            <div class="cell">
              <div class="cell-label">{m.moon_panel_landing()}</div>
              <div class="cell-value">{selected.landing_date ?? '—'}</div>
            </div>
            <div class="cell">
              <div class="cell-label">
                {m.moon_panel_lat()}<WhyPopover
                  title={m.why_landing_site_title()}
                  body={m.why_landing_site_body()}
                />
              </div>
              <div class="cell-value">
                {selected.lat != null ? m.moon_lat_deg({ value: selected.lat.toFixed(2) }) : '—'}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">{m.moon_panel_lon()}</div>
              <div class="cell-value">
                {selected.lon != null ? m.moon_lon_deg({ value: selected.lon.toFixed(2) }) : '—'}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">
                {m.moon_panel_duration()}<WhyPopover
                  title={m.why_surface_time_title()}
                  body={m.why_surface_time_body()}
                />
              </div>
              <div class="cell-value">
                {selected.surface_duration_days
                  ? m.moon_days({ value: selected.surface_duration_days.toString() })
                  : '—'}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">
                {m.moon_panel_eva()}<WhyPopover
                  title={m.why_eva_time_title()}
                  body={m.why_eva_time_body()}
                />
              </div>
              <div class="cell-value">
                {selected.eva_duration_hours
                  ? m.moon_hours({ value: selected.eva_duration_hours.toString() })
                  : '—'}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">
                {m.moon_panel_samples()}<WhyPopover
                  title={m.why_samples_title()}
                  body={m.why_samples_body()}
                />
              </div>
              <div class="cell-value">
                {m.moon_kg({ value: (selected.samples_kg ?? 0).toString() })}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">{m.moon_panel_crew()}</div>
              <div class="cell-value short">
                {selected.crew && selected.crew.length > 0 ? selected.crew.join(', ') : '—'}
              </div>
            </div>
          {/if}
        </div>

        {#if selected.left}
          <section class="left-block" style:--accent={colorFor(selected)}>
            <h3>{m.moon_panel_left_title()}</h3>
            <p>{selected.left}</p>
          </section>
        {/if}

        {#if selected.fact}
          <p class="editorial">{selected.fact}</p>
        {/if}

        {#if selected.capability}
          <section class="capability-block">
            <h3>{m.moon_panel_capability_title()}</h3>
            <p>{selected.capability}</p>
          </section>
        {/if}

        {#if selected.mission_id}
          <a
            class="mission-link"
            href="{base}/missions?id={selected.mission_id}"
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
          <p class="gallery-credit">{panelGalleryCredit(selected.agency)}</p>
        {/if}
      {:else if panelTab === 'story' && panelStory}
        <SiteStoryPanel story={panelStory} onLightbox={(src) => (panelLightbox = src)} />
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

<!-- J.2 — Science Lens banner on /moon. Top-center, lens-gated;
     links into the free-return chapter that's central to lunar
     mission architecture. -->
<!-- Unified Science Lens panel — lens story + tidal-lock indicator in
     one collapse. -->
<ScienceLayersPanel
  title="The Moon · 384 000 km out, three days each way"
  body="Lunar surface gravity is 1/6 g; a vacuum-thin exosphere offers no aerobraking, so every mission has to carry full ∆v for the descent. Apollo's free-return trajectory let the Earth-Moon-Earth figure-8 act as a built-in abort path."
  tab="transfers"
  section="free-return"
  available={['tidal-lock']}
/>

<style>
  .moon {
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
  :global(.moon canvas) {
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
  /* Port of /mars's stand-at-site button — same slot in the detail
     panel handles both enter + exit states. Glyph + transparent
     dark-glass styling match Mars; enter glyph "◐" (planet at
     night), exit glyph "✕". */
  .stand-at-site {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    margin-top: 12px;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 2px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }
  .stand-at-site::before {
    content: '◐';
    font-size: 13px;
    line-height: 1;
    color: var(--accent, #4ecdc4);
  }
  .stand-at-site--exit::before {
    content: '✕';
    color: var(--accent, #4ecdc4);
  }
  .stand-at-site:hover,
  .stand-at-site:focus-visible {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--accent, #4ecdc4);
    color: #fff;
    outline: none;
  }
  .panorama-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 50;
  }
  .panorama-exit {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: auto;
    padding: 8px 16px;
    background: rgba(4, 4, 12, 0.8);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    cursor: pointer;
    backdrop-filter: blur(8px);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .ctrl-row.chips {
    flex-direction: column;
    /* Explicit width keeps chips a consistent size that's NOT inherited
       from the toggle row above. */
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
    border-color: rgba(190, 195, 210, 0.55);
    outline: none;
  }
  .chip.active {
    background: rgba(190, 195, 210, 0.16);
    border-color: rgba(190, 195, 210, 0.7);
    color: #c8cdda;
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
    border: 1px solid rgba(190, 195, 210, 0.4);
    color: #d6d9e2;
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
    border-color: rgba(220, 225, 240, 0.7);
    background: rgba(34, 38, 56, 0.95);
    outline: none;
  }
  @media (max-width: 768px) {
    .hud-controls {
      z-index: 25;
    }
    /* Chip rail wraps as soon as we leave desktop. Was gated on 500 px
       which only kicked in for phone-narrow widths — anyone resizing a
       desktop browser between 501–768 still saw the vertical column. */
    .ctrl-row.chips {
      flex-direction: row;
      flex-wrap: wrap;
      width: auto;
      max-width: calc(100vw - 24px);
      align-items: center;
    }
  }

  @media (max-width: 500px) {
    .hud-controls {
      left: 8px;
      gap: 6px;
    }
    .toggle {
      padding: 3px 5px;
      font-size: 9px;
      max-width: 54px;
      min-height: 32px;
    }
    .chip {
      padding: 0 6px;
      font-size: 8.5px;
      min-width: 78px;
      min-height: 28px;
    }
  }
  .load-banner {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 40;
    padding: 8px 16px;
    background: rgba(193, 68, 14, 0.2);
    border: 1px solid rgba(193, 68, 14, 0.5);
    color: #ffc850;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    border-radius: 4px;
  }

  .legend-3d {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
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
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(255, 255, 255, 0.6);
  }
  .status-completed {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.08);
  }
  .status-ongoing {
    color: #4466ff;
    border-color: rgba(68, 102, 255, 0.4);
    background: rgba(68, 102, 255, 0.08);
  }
  .status-planned {
    color: #ffc850;
    border-color: rgba(255, 200, 80, 0.4);
    background: rgba(255, 200, 80, 0.08);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 0 0 4px;
  }
  .type {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.4);
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
  .cell-value.short {
    font-size: 9px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.7);
  }

  .left-block {
    margin-bottom: 14px;
    padding: 12px 14px;
    border-left: 4px solid var(--accent, #4466ff);
    background: rgb(from var(--accent, #4466ff) r g b / 0.08);
    border-radius: 0 4px 4px 0;
  }
  .left-block h3 {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    margin: 0 0 6px;
    color: var(--accent, #4466ff);
  }
  .left-block p {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.5;
    margin: 0;
  }

  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    margin: 0 0 14px;
  }

  .capability-block {
    padding: 10px 12px;
    background: rgba(78, 205, 196, 0.06);
    border: 1px solid rgba(78, 205, 196, 0.25);
    border-radius: 4px;
    margin-bottom: 14px;
  }
  .capability-block h3 {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: #4ecdc4;
    margin: 0 0 4px;
  }
  .capability-block p {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
    line-height: 1.5;
  }

  .mission-link {
    align-self: flex-start;
    display: inline-block;
    margin-top: 10px;
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

  /* TierContext info card — port of /mars's .tier-context-card.
     Visible at Tier 2+ when not in panorama mode. Layered attribution
     block stacks regional + detail credits with a thin divider. */
  .tier-context-card {
    position: absolute;
    left: 12px;
    bottom: 56px;
    z-index: 6;
    max-width: 360px;
    padding: 10px 14px;
    background: rgba(8, 10, 22, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(6px);
    animation: tcc-fade-in 600ms ease-out;
  }
  .tcc-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 4px;
  }
  .tcc-site {
    font-size: 13px;
    color: #fff;
    letter-spacing: 0.5px;
  }
  .tcc-chip {
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .tcc-mission {
    color: rgba(255, 255, 255, 0.6);
    font-size: 10px;
    margin-bottom: 6px;
  }
  .tcc-layer-block-next {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .tcc-layer {
    color: #4ecdc4;
    letter-spacing: 1px;
    text-transform: uppercase;
    font-size: 10px;
    margin-bottom: 4px;
  }
  .tcc-source {
    color: rgba(255, 255, 255, 0.9);
    font-size: 11px;
  }
  .tcc-author {
    color: rgba(255, 255, 255, 0.55);
    font-size: 10px;
    margin-bottom: 6px;
  }
  .tcc-footer {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
  }
  .tcc-license {
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 3px;
    padding: 1px 6px;
    letter-spacing: 0.5px;
  }
  .tcc-uncertainty {
    color: rgba(255, 200, 100, 0.7);
  }
  .tcc-link {
    margin-left: auto;
    color: rgba(78, 205, 196, 0.85);
    text-decoration: none;
  }
  .tcc-link:hover {
    text-decoration: underline;
  }
  @keyframes tcc-fade-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Detail-panel tabs / gallery / learn / lightbox CSS in src/lib/styles/panel-tabs.css (v0.1.10) */
</style>
