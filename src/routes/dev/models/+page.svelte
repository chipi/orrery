<!--
  Dev-only model gallery — renders EVERY distinct original mesh in the
  project isolated on a dark card, so the supervising architect can scan
  all silhouettes at once and sign off as a set, and so the /colophon
  thumbnail capture (scripts/capture-colophon-thumbs.ts) has one clean
  per-model source.

  Covers every family — interplanetary craft, lunar + Martian landers,
  Earth satellites, the launch facility, and both stations. (Replaced the
  old /dev/spacecraft gallery, which only showed the 21 interplanetary
  craft.) One shared-WebGLRenderer + viewport/scissor trick dodges
  Chrome's 16-context cap — one renderer paints each card's screen rect.

  Per-card camera auto-fit: models span tiny landers to the full ~109 m
  ISS truss, so a fixed camera distance can't frame them all. Each card
  recenters its group on the origin and pulls the camera back to the
  group's bounding sphere.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { buildInterplanetarySpacecraft } from '$lib/three/interplanetary-spacecraft-models';
  import { buildApolloLMHotspot } from '$lib/hotspot-models/apollo-lm';
  import { buildApolloLMExtendedHotspot } from '$lib/hotspot-models/apollo-lm-extended';
  import { buildLuna9Hotspot } from '$lib/hotspot-models/luna-9-spherical';
  import { buildLunaSampleReturnHotspot } from '$lib/hotspot-models/luna-sample-return';
  import { buildLunokhodHotspot } from '$lib/hotspot-models/lunokhod-rover';
  import { buildChangeLanderHotspot } from '$lib/hotspot-models/chang-e-lander';
  import { buildChandrayaan3VikramHotspot } from '$lib/hotspot-models/chandrayaan-3-vikram';
  import { buildSLIMPrecisionLanderHotspot } from '$lib/hotspot-models/slim-precision-lander';
  import { buildBeresheetHotspot } from '$lib/hotspot-models/beresheet';
  import { buildYutuRoverHotspot } from '$lib/hotspot-models/yutu-rover';
  import { buildVikingTripodHotspot } from '$lib/hotspot-models/viking-tripod';
  import { buildPathfinderSojournerHotspot } from '$lib/hotspot-models/pathfinder-sojourner';
  import { buildMERRoverHotspot } from '$lib/hotspot-models/mer-rover';
  import { buildCuriosityClassHotspot } from '$lib/hotspot-models/curiosity-class';
  import { buildPhoenixClassHotspot } from '$lib/hotspot-models/phoenix-class';
  import { buildPerseveranceRoverHotspot } from '$lib/hotspot-models/mars-perseverance-rover';
  import { buildInsightLanderHotspot } from '$lib/hotspot-models/mars-insight-lander';
  import { buildMars3PetalHotspot } from '$lib/hotspot-models/mars-3-petal';
  import { buildTianwenZhurongHotspot } from '$lib/hotspot-models/tianwen-zhurong';
  import {
    buildMercuryCapsule,
    buildGeminiCapsule,
    buildVostokSphere,
    buildVoskhodSphere,
    buildApolloCM,
    buildSoyuzDescentModule,
    buildDragonCapsule,
    buildShenzhouReentry,
  } from '$lib/three/capsule-models';
  import { buildSchiaparelliHotspot } from '$lib/hotspot-models/schiaparelli';
  import { buildBeagle2Hotspot } from '$lib/hotspot-models/beagle-2';
  import { buildSatelliteModel } from '$lib/earth-satellite-models';
  import { buildLaunchpadModel } from '$lib/earth-launchpad-models';
  import { buildIssProxyStation } from '$lib/iss-proxy-model';
  import { buildTiangongProxyStation } from '$lib/tiangong-proxy-model';
  import { buildLauncherModel } from '$lib/three/launcher-models';
  import { buildDescentModel } from '$lib/three/descent-models';
  import { buildLanderCruiseCraft } from '$lib/three/lander-cruise-models';
  import { buildVenusLanderModel } from '$lib/venus-lander-models';
  import { installHeroEnvironment } from '$lib/three/hero-materials';

  type Entry = {
    /** Stable id → capture filename `model-<family>-<id>` / `craft-<id>`. */
    id: string;
    label: string;
    family: string;
    build: () => THREE.Group | null;
    /** Tier-B PBR entries: install the IBL environment + ACES tone mapping. */
    hero?: boolean;
  };

  // Agency accent colours for the hotspot/pad builders (flag trim only).
  const US = '#0B3D91';
  const SU = '#cc4444';
  const RU = '#D52B1E';
  const CN = '#DE2910';
  const IN = '#FF9933';
  const JP = '#003247';
  const EU = '#003399';
  const IL = '#0038B8';
  // Reserved for an upcoming Russian-flagged builder; void-ref keeps
  // TS happy until that builder lands (2026-06-23 release-prep
  // unblock — other agent's WIP file flagged RU unused on preflight).
  void RU;

  const ENTRIES: Entry[] = [
    // ── Interplanetary spacecraft (distinct meshes only) ──────────────
    ...[
      'cassini',
      'voyager-1',
      'galileo',
      'new-horizons',
      'pioneer-10',
      'juno',
      'bepicolombo',
      'dawn',
      'giotto',
      'hayabusa2',
      'juice',
      'rosetta',
      'ulysses',
      'vega-1',
      'venera-13',
    ].map((id) => ({
      id,
      label: id,
      family: 'craft',
      build: () => buildInterplanetarySpacecraft(id),
    })),

    // ── Earth-orbit re-entry capsules (Tier-1) ───────────────────────
    {
      id: 'mercury-capsule',
      label: 'Mercury capsule',
      family: 'capsule',
      build: () => buildMercuryCapsule(),
    },
    {
      id: 'gemini-capsule',
      label: 'Gemini capsule',
      family: 'capsule',
      build: () => buildGeminiCapsule(),
    },
    {
      id: 'vostok-sphere',
      label: 'Vostok',
      family: 'capsule',
      build: () => buildVostokSphere(),
    },
    {
      id: 'voskhod-sphere',
      label: 'Voskhod',
      family: 'capsule',
      build: () => buildVoskhodSphere(),
    },
    { id: 'apollo-cm', label: 'Apollo CM', family: 'capsule', build: () => buildApolloCM() },
    {
      id: 'soyuz-sa',
      label: 'Soyuz descent module',
      family: 'capsule',
      build: () => buildSoyuzDescentModule(),
    },
    {
      id: 'dragon-capsule',
      label: 'Crew Dragon',
      family: 'capsule',
      build: () => buildDragonCapsule(),
    },
    {
      id: 'shenzhou-reentry',
      label: 'Shenzhou reentry module',
      family: 'capsule',
      build: () => buildShenzhouReentry(),
    },

    // ── Moon landers / rovers (Tier-1 engineering meshes) ─────────────
    { id: 'apollo-lm', label: 'Apollo LM', family: 'moon', build: () => buildApolloLMHotspot(US) },
    {
      id: 'apollo-lm-extended',
      label: 'Apollo LM (J-mission + LRV)',
      family: 'moon',
      build: () => buildApolloLMExtendedHotspot(US),
    },
    { id: 'luna-9', label: 'Luna 9', family: 'moon', build: () => buildLuna9Hotspot(SU) },
    {
      id: 'luna-sample-return',
      label: 'Luna sample-return',
      family: 'moon',
      build: () => buildLunaSampleReturnHotspot(SU),
    },
    {
      id: 'lunokhod',
      label: 'Lunokhod rover',
      family: 'moon',
      build: () => buildLunokhodHotspot(SU),
    },
    {
      id: 'chang-e-lander',
      label: "Chang'e lander",
      family: 'moon',
      build: () => buildChangeLanderHotspot(CN, { withAscentStage: true }),
    },
    { id: 'yutu', label: 'Yutu rover', family: 'moon', build: () => buildYutuRoverHotspot(CN) },
    {
      id: 'chandrayaan-3-vikram',
      label: 'Chandrayaan-3 Vikram',
      family: 'moon',
      build: () => buildChandrayaan3VikramHotspot(IN),
    },
    { id: 'slim', label: 'SLIM', family: 'moon', build: () => buildSLIMPrecisionLanderHotspot(JP) },
    { id: 'beresheet', label: 'Beresheet', family: 'moon', build: () => buildBeresheetHotspot(IL) },

    // ── Mars landers / rovers (Tier-1 engineering meshes) ─────────────
    { id: 'viking', label: 'Viking', family: 'mars', build: () => buildVikingTripodHotspot(US) },
    {
      id: 'pathfinder-sojourner',
      label: 'Pathfinder + Sojourner',
      family: 'mars',
      build: () => buildPathfinderSojournerHotspot(US),
    },
    {
      id: 'mer',
      label: 'MER (Spirit/Opportunity)',
      family: 'mars',
      build: () => buildMERRoverHotspot(US),
    },
    {
      id: 'curiosity',
      label: 'Curiosity',
      family: 'mars',
      build: () => buildCuriosityClassHotspot(US, { withIngenuity: true }),
    },
    {
      id: 'perseverance-rover',
      label: 'Perseverance + Ingenuity',
      family: 'mars',
      build: () => buildPerseveranceRoverHotspot(US),
    },
    {
      id: 'phoenix',
      label: 'Phoenix',
      family: 'mars',
      build: () => buildPhoenixClassHotspot(US),
    },
    {
      id: 'insight-lander',
      label: 'InSight',
      family: 'mars',
      build: () => buildInsightLanderHotspot(US),
    },
    { id: 'mars-3', label: 'Mars 3', family: 'mars', build: () => buildMars3PetalHotspot(SU) },
    {
      id: 'zhurong',
      label: 'Tianwen-1 Zhurong',
      family: 'mars',
      build: () => buildTianwenZhurongHotspot(CN),
    },
    {
      id: 'schiaparelli',
      label: 'Schiaparelli',
      family: 'mars',
      build: () => buildSchiaparelliHotspot(EU),
    },
    { id: 'beagle-2', label: 'Beagle 2', family: 'mars', build: () => buildBeagle2Hotspot(EU) },

    // ── Earth satellites (distinct silhouettes) ───────────────────────
    {
      id: 'hubble',
      label: 'Hubble',
      family: 'sat',
      build: () => buildSatelliteModel('hubble', US),
    },
    { id: 'jwst', label: 'JWST', family: 'sat', build: () => buildSatelliteModel('jwst', US) },
    {
      id: 'chandra',
      label: 'Chandra',
      family: 'sat',
      build: () => buildSatelliteModel('chandra', US),
    },
    { id: 'xmm', label: 'XMM-Newton', family: 'sat', build: () => buildSatelliteModel('xmm', EU) },
    { id: 'gaia', label: 'Gaia', family: 'sat', build: () => buildSatelliteModel('gaia', EU) },
    { id: 'lro', label: 'LRO', family: 'sat', build: () => buildSatelliteModel('lro', US) },
    {
      id: 'geo-comsat',
      label: 'GEO comsat',
      family: 'sat',
      build: () => buildSatelliteModel('geo', '#888'),
    },
    {
      id: 'nav-constellation',
      label: 'Nav constellation (GPS-class)',
      family: 'sat',
      build: () => buildSatelliteModel('gps', US),
    },
    {
      id: 'generic-orbiter',
      label: 'Generic orbiter bus',
      family: 'sat',
      build: () => buildSatelliteModel('__generic__', '#9aa'),
    },

    // ── Launch facility + stations ────────────────────────────────────
    {
      id: 'launchpad',
      label: 'Launch facility',
      family: 'earth',
      build: () => buildLaunchpadModel('lc-39a', undefined, '#9aa'),
    },
    {
      id: 'venera',
      label: 'Venus surface lander',
      family: 'venus',
      build: () => buildVenusLanderModel('venera-13', 'lander', '#c9a45a', 'Roscosmos'),
    },
    { id: 'iss', label: 'ISS proxy', family: 'station', build: () => buildIssProxyStation() },
    {
      id: 'tiangong',
      label: 'Tiangong proxy',
      family: 'station',
      build: () => buildTiangongProxyStation(),
    },

    // ── Launch vehicles — per-vehicle ascent silhouettes (launcher-models.ts) ─
    {
      id: 'generic',
      label: 'Generic launcher (Falcon-9-like)',
      family: 'launcher',
      build: () => buildLauncherModel(undefined, 1.2, 0).root,
    },
    {
      id: 'starship',
      label: 'Starship / Super Heavy',
      family: 'launcher',
      build: () => buildLauncherModel('starship', 1.2).root,
    },
    {
      id: 'saturn-v',
      label: 'Saturn V',
      family: 'launcher',
      build: () => buildLauncherModel('saturn-v', 1.2).root,
    },
    {
      id: 'saturn-ib',
      label: 'Saturn IB',
      family: 'launcher',
      build: () => buildLauncherModel('saturn-ib', 1.2).root,
    },
    {
      id: 'vostok-k',
      label: 'Soyuz / R-7 (Korolev cross)',
      family: 'launcher',
      build: () => buildLauncherModel('vostok-k', 1.2).root,
    },
    {
      id: 'ariane-5',
      label: 'Ariane 5',
      family: 'launcher',
      build: () => buildLauncherModel('ariane-5', 1.2).root,
    },
    {
      id: 'h-iia',
      label: 'H-IIA',
      family: 'launcher',
      build: () => buildLauncherModel('h-iia', 1.2).root,
    },
    {
      id: 'space-shuttle-stack',
      label: 'Space Shuttle stack',
      family: 'launcher',
      build: () => buildLauncherModel('space-shuttle-stack', 1.2).root,
    },
    {
      id: 'falcon-9',
      label: 'Falcon 9',
      family: 'launcher',
      build: () => buildLauncherModel('falcon-9', 1.2).root,
    },
    {
      id: 'atlas-v',
      label: 'Atlas V',
      family: 'launcher',
      build: () => buildLauncherModel('atlas-v', 1.2, 2).root,
    },
    {
      id: 'proton-k',
      label: 'Proton-K',
      family: 'launcher',
      build: () => buildLauncherModel('proton-k', 1.2).root,
    },
    {
      id: 'titan-ii-glv',
      label: 'Titan II GLV',
      family: 'launcher',
      build: () => buildLauncherModel('titan-ii-glv', 1.2).root,
    },
    {
      id: 'atlas-lv-3b',
      label: 'Atlas LV-3B (Mercury)',
      family: 'launcher',
      build: () => buildLauncherModel('atlas-lv-3b', 1.2).root,
    },
    {
      id: 'mercury-redstone',
      label: 'Mercury-Redstone',
      family: 'launcher',
      build: () => buildLauncherModel('mercury-redstone', 1.2).root,
    },
    {
      id: 'long-march-2f',
      label: 'Long March 2F (Shenzhou)',
      family: 'launcher',
      build: () => buildLauncherModel('long-march-2f', 1.2).root,
    },
    {
      id: 'long-march-3b',
      label: 'Long March 3B',
      family: 'launcher',
      build: () => buildLauncherModel('long-march-3b', 1.2).root,
    },
    {
      id: 'long-march-5',
      label: 'Long March 5',
      family: 'launcher',
      build: () => buildLauncherModel('long-march-5', 1.2).root,
    },
    {
      id: 'pslv',
      label: 'PSLV',
      family: 'launcher',
      build: () => buildLauncherModel('pslv', 1.2).root,
    },
    {
      id: 'lvm3',
      label: 'LVM3 / GSLV Mk III',
      family: 'launcher',
      build: () => buildLauncherModel('lvm3', 1.2).root,
    },
    {
      id: 'm-v',
      label: 'M-V',
      family: 'launcher',
      build: () => buildLauncherModel('m-v', 1.2).root,
    },
    {
      id: 'h3',
      label: 'H3',
      family: 'launcher',
      build: () => buildLauncherModel('h3', 1.2).root,
    },
    {
      id: 'ariane-1',
      label: 'Ariane 1',
      family: 'launcher',
      build: () => buildLauncherModel('ariane-1', 1.2).root,
    },

    // ── EDL descent stacks — entry/descent/landing hardware (descent-models.ts) ─
    {
      id: 'lunar-powered',
      label: 'Lunar powered descent',
      family: 'descent',
      build: () => buildDescentModel('apollo11', 'moon', 1).root,
    },
    {
      id: 'mars-retro',
      label: 'Mars parachute + retro',
      family: 'descent',
      build: () => buildDescentModel('viking1-lander', 'mars', 1).root,
    },
    {
      id: 'airbag',
      label: 'Mars airbag bounce',
      family: 'descent',
      build: () => buildDescentModel('mars-pathfinder', 'mars', 1).root,
    },
    {
      id: 'skycrane',
      label: 'Mars skycrane',
      family: 'descent',
      build: () => buildDescentModel('curiosity', 'mars', 1).root,
    },
    {
      id: 'venus-aeroshell',
      label: 'Venus aeroshell',
      family: 'descent',
      build: () => buildDescentModel('venera13', 'venus', 1).root,
    },
    {
      id: 'asteroid-sampler',
      label: 'Asteroid touch-and-go',
      family: 'descent',
      build: () => buildDescentModel('hayabusa1', 'itokawa', 1).root,
    },
    {
      id: 'comet-lander',
      label: 'Comet harpoon lander',
      family: 'descent',
      build: () => buildDescentModel('philae', 'comet_67p', 1).root,
    },
    {
      id: 'jupiter-probe',
      label: 'Jupiter atmospheric probe',
      family: 'descent',
      build: () => buildDescentModel('galileo-probe', 'jupiter', 1).root,
    },
    {
      id: 'titan-parachute',
      label: 'Titan parachute descent',
      family: 'descent',
      build: () => buildDescentModel('huygens', 'titan', 1).root,
    },

    // ── Lander cruise-configuration craft (transit stack carrying the lander).
    //    One representative per DISTINCT model — missions that flew the same
    //    cruise stack (Apollo ×6, Chang'e pairs…) share a builder, so we frame
    //    the model once here rather than duplicating identical thumbnails.
    ...[
      // Mars
      'curiosity',
      'perseverance',
      'insight',
      'phoenix',
      'mars-pathfinder',
      'spirit',
      'opportunity',
      'schiaparelli',
      'viking1',
      'mars3',
      'tianwen1',
      // Moon — one representative per distinct builder (shared stacks framed once)
      'apollo11',
      'artemis3',
      'luna9',
      'luna16',
      'luna17',
      'change3',
      'change5',
      'chandrayaan3',
      'slim',
      'beresheet',
      'blue-moon-mk1',
      // Small-body + Starship
      'hayabusa1',
      'osiris-rex',
      'near-shoemaker',
      'starship-demo',
    ].map((id) => ({
      id,
      label: id,
      family: 'cruise',
      build: () => buildLanderCruiseCraft(id),
    })),
  ];

  type Card = {
    container: HTMLDivElement;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    group: THREE.Group | null;
  };

  let containers: HTMLDivElement[] = [];
  let cards: Card[] = [];
  let renderer: THREE.WebGLRenderer | null = null;
  let sharedCanvas: HTMLCanvasElement | null = null;
  let raf = 0;

  const FOV = 38;

  function buildScene(entry: Entry): Omit<Card, 'container'> {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060e);
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.001, 10000);
    // Every model is now hero PBR, so all cards get the image-based-lighting
    // environment + a strong sun key, with the flat grey ambient dimmed right
    // down so the env's high-contrast metal highlights read.
    const key = new THREE.DirectionalLight(0xfff4d0, 2.6);
    key.position.set(3, 2, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6090ff, 0.15);
    fill.position.set(-2, -1, -2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.5);
    rim.position.set(-1, 1.5, -3);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x5a5a72, 0.12));
    if (renderer) installHeroEnvironment(renderer, scene);

    let group: THREE.Group | null = null;
    try {
      group = entry.build();
    } catch (err) {
      console.error(`[models] build failed for ${entry.id}:`, err);
    }
    if (group) {
      // Recenter the group on the origin so it spins in place, then fit
      // the camera to its bounding sphere for a consistent tight frame.
      // World matrices must be current or setFromObject sees an empty box
      // for the multi-child lander/station groups (nested local transforms).
      group.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(group);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      group.position.sub(sphere.center);
      const r = Math.max(sphere.radius, 0.001);
      const dist = (r / Math.sin((FOV * Math.PI) / 360)) * 1.25;
      const dir = new THREE.Vector3(1, 0.55, 1).normalize();
      camera.position.copy(dir.multiplyScalar(dist));
      camera.near = Math.max(dist - r * 2, 0.001);
      camera.far = dist + r * 3;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);
      scene.add(group);
    } else {
      console.warn(`[models] no mesh for ${entry.id}`);
    }
    return { scene, camera, group };
  }

  function tick(): void {
    if (!renderer || !sharedCanvas) {
      raf = requestAnimationFrame(tick);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (sharedCanvas.width !== W * dpr || sharedCanvas.height !== H * dpr) {
      renderer.setSize(W, H, false);
    }
    renderer.setScissorTest(true);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    const t = performance.now() * 0.0004;
    for (const card of cards) {
      const rect = card.container.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > H || rect.right < 0 || rect.left > W) continue;
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) continue;
      const x = rect.left;
      const y = H - rect.bottom;
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      card.camera.aspect = w / h;
      card.camera.updateProjectionMatrix();
      if (card.group) card.group.rotation.y = t;
      renderer.render(card.scene, card.camera);
    }
    raf = requestAnimationFrame(tick);
  }

  onMount(() => {
    requestAnimationFrame(() => {
      sharedCanvas = document.createElement('canvas');
      sharedCanvas.style.position = 'fixed';
      sharedCanvas.style.top = '0';
      sharedCanvas.style.left = '0';
      sharedCanvas.style.width = '100vw';
      sharedCanvas.style.height = '100vh';
      sharedCanvas.style.pointerEvents = 'none';
      sharedCanvas.style.zIndex = '0';
      document.body.appendChild(sharedCanvas);
      try {
        renderer = new THREE.WebGLRenderer({ canvas: sharedCanvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight, false);
      } catch (err) {
        console.error('[models] WebGL renderer init failed:', err);
        sharedCanvas.remove();
        sharedCanvas = null;
        return;
      }
      for (let i = 0; i < ENTRIES.length; i++) {
        const node = containers[i];
        if (!node) continue;
        const { scene, camera, group } = buildScene(ENTRIES[i]);
        cards.push({ container: node, scene, camera, group });
      }
      raf = requestAnimationFrame(tick);
    });
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    for (const card of cards) {
      if (card.group) (card.group.userData.dispose as (() => void) | undefined)?.();
    }
    cards = [];
    renderer?.dispose();
    // Release the WebGL context immediately (matches the app-wide #363
    // contract); dispose() alone leaves the context resident until lazy GC.
    renderer?.forceContextLoss();
    sharedCanvas?.remove();
    sharedCanvas = null;
    renderer = null;
  });
</script>

<svelte:head><title>Model showcase · Orrery dev</title></svelte:head>

<main class="showcase">
  <header>
    <h1>Original 3D model showcase</h1>
    <p>
      All {ENTRIES.length} distinct original meshes — interplanetary craft, lunar + Martian landers/rovers,
      Earth satellites, launch facility, and the two station proxies. One shared WebGL canvas paints each
      card; per-card camera auto-fits the model's bounding sphere.
    </p>
  </header>
  <div class="grid">
    {#each ENTRIES as entry, i (entry.family + '-' + entry.id)}
      <figure class="card" data-model-id="{entry.family}-{entry.id}">
        <div class="canvas" bind:this={containers[i]}></div>
        <figcaption>
          <span class="name">{entry.label}</span>
          <span class="id mono">{entry.family} · {entry.id}</span>
        </figcaption>
      </figure>
    {/each}
  </div>
</main>

<style>
  :global(body) {
    background: #03050b;
  }
  .showcase {
    padding: 32px 22px 60px;
    color: rgba(255, 255, 255, 0.92);
    min-height: 100vh;
    position: relative;
    z-index: 1;
  }
  header {
    max-width: 980px;
    margin: 0 auto 28px;
  }
  h1 {
    font-family: var(--font-display, 'Space Mono', monospace);
    font-size: 22px;
    letter-spacing: 4px;
    text-transform: uppercase;
    margin: 0 0 8px;
  }
  header p {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.68);
    margin: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 18px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .card {
    margin: 0;
    background: rgba(12, 16, 28, 0.6);
    border: 1px solid rgba(94, 234, 212, 0.18);
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .canvas {
    width: 100%;
    aspect-ratio: 10 / 7;
    background: transparent;
  }
  figcaption {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(12, 16, 28, 0.95);
  }
  .name {
    font-family: var(--font-display, 'Space Mono', monospace);
    font-size: 13px;
    letter-spacing: 2px;
    color: #fff;
    text-transform: uppercase;
  }
  .id {
    font-family: 'Space Mono', monospace;
    font-size: 9.5px;
    letter-spacing: 1.4px;
    color: rgba(255, 255, 255, 0.5);
  }
</style>
