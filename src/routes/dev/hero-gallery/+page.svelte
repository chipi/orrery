<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import * as THREE from 'three';
  import { installHeroEnvironment } from '$lib/three/hero-materials';
  import { buildInterplanetarySpacecraft } from '$lib/three/interplanetary-spacecraft-models';
  import { buildApolloLMHotspot } from '$lib/hotspot-models/apollo-lm';
  import { buildApolloLMExtendedHotspot } from '$lib/hotspot-models/apollo-lm-extended';
  import { buildLuna9Hotspot } from '$lib/hotspot-models/luna-9-spherical';
  import { buildLunaSampleReturnHotspot } from '$lib/hotspot-models/luna-sample-return';
  import { buildLunokhodHotspot } from '$lib/hotspot-models/lunokhod-rover';
  import { buildChangeLanderHotspot } from '$lib/hotspot-models/chang-e-lander';
  import { buildYutuRoverHotspot } from '$lib/hotspot-models/yutu-rover';
  import { buildChandrayaan3VikramHotspot } from '$lib/hotspot-models/chandrayaan-3-vikram';
  import { buildSLIMPrecisionLanderHotspot } from '$lib/hotspot-models/slim-precision-lander';
  import { buildBeresheetHotspot } from '$lib/hotspot-models/beresheet';
  import { buildVikingTripodHotspot } from '$lib/hotspot-models/viking-tripod';
  import { buildPathfinderSojournerHotspot } from '$lib/hotspot-models/pathfinder-sojourner';
  import { buildMERRoverHotspot } from '$lib/hotspot-models/mer-rover';
  import { buildCuriosityClassHotspot } from '$lib/hotspot-models/curiosity-class';
  import { buildPhoenixClassHotspot } from '$lib/hotspot-models/phoenix-class';
  import { buildMars3PetalHotspot } from '$lib/hotspot-models/mars-3-petal';
  import { buildTianwenZhurongHotspot } from '$lib/hotspot-models/tianwen-zhurong';
  import { buildSchiaparelliHotspot } from '$lib/hotspot-models/schiaparelli';
  import { buildBeagle2Hotspot } from '$lib/hotspot-models/beagle-2';
  import { buildPerseveranceRoverHotspot } from '$lib/hotspot-models/mars-perseverance-rover';
  import { buildInsightLanderHotspot } from '$lib/hotspot-models/mars-insight-lander';
  import { buildLanderCruiseCraft } from '$lib/three/lander-cruise-models';
  import { buildDescentModel } from '$lib/three/descent-models';
  import {
    buildMercuryCapsule,
    buildGeminiCapsule,
    buildVostokSphere,
    buildApolloCM,
    buildSoyuzDescentModule,
    buildDragonCapsule,
  } from '$lib/three/capsule-models';
  import { buildLauncherModel } from '$lib/three/launcher-models';
  import { buildSatelliteModel } from '$lib/earth-satellite-models';
  import { buildLaunchpadModel } from '$lib/earth-launchpad-models';
  import { buildIssProxyStation } from '$lib/iss-proxy-model';
  import { buildTiangongProxyStation } from '$lib/tiangong-proxy-model';
  import { buildVenusLanderModel } from '$lib/venus-lander-models';

  type Item = { id: string; label: string; build: () => THREE.Group | null };

  const US = '#0B3D91';
  const SU = '#cc4444';
  const CN = '#DE2910';
  const IN = '#FF9933';
  const JP = '#003247';
  const EU = '#003399';
  const IL = '#0038B8';

  // Per-family model sets. Extend as each family is converted to hero materials.
  const FAMILIES: Record<string, Item[]> = {
    capsule: [
      { id: 'mercury', label: 'Mercury', build: () => buildMercuryCapsule() },
      { id: 'gemini', label: 'Gemini', build: () => buildGeminiCapsule() },
      { id: 'vostok', label: 'Vostok / Voskhod', build: () => buildVostokSphere() },
      { id: 'apollo-cm', label: 'Apollo CM', build: () => buildApolloCM() },
      { id: 'soyuz', label: 'Soyuz DM', build: () => buildSoyuzDescentModule() },
      { id: 'dragon', label: 'Crew Dragon', build: () => buildDragonCapsule() },
    ],
    spacecraft: [
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
    ].map((id) => ({ id, label: id, build: () => buildInterplanetarySpacecraft(id) })),
    moon: [
      { id: 'apollo-lm', label: 'Apollo LM', build: () => buildApolloLMHotspot(US) },
      {
        id: 'apollo-lm-extended',
        label: 'Apollo LM + LRV',
        build: () => buildApolloLMExtendedHotspot(US),
      },
      { id: 'luna-9', label: 'Luna 9', build: () => buildLuna9Hotspot(SU) },
      {
        id: 'luna-sample-return',
        label: 'Luna sample-return',
        build: () => buildLunaSampleReturnHotspot(SU),
      },
      { id: 'lunokhod', label: 'Lunokhod', build: () => buildLunokhodHotspot(SU) },
      {
        id: 'chang-e-lander',
        label: "Chang'e lander",
        build: () => buildChangeLanderHotspot(CN, { withAscentStage: true }),
      },
      { id: 'yutu', label: 'Yutu', build: () => buildYutuRoverHotspot(CN) },
      {
        id: 'chandrayaan-3-vikram',
        label: 'Vikram',
        build: () => buildChandrayaan3VikramHotspot(IN),
      },
      { id: 'slim', label: 'SLIM', build: () => buildSLIMPrecisionLanderHotspot(JP) },
      { id: 'beresheet', label: 'Beresheet', build: () => buildBeresheetHotspot(IL) },
    ],
    mars: [
      { id: 'viking', label: 'Viking', build: () => buildVikingTripodHotspot(US) },
      {
        id: 'pathfinder-sojourner',
        label: 'Pathfinder + Sojourner',
        build: () => buildPathfinderSojournerHotspot(US),
      },
      { id: 'mer', label: 'MER', build: () => buildMERRoverHotspot(US) },
      {
        id: 'curiosity',
        label: 'Curiosity',
        build: () => buildCuriosityClassHotspot(US, { withIngenuity: true }),
      },
      { id: 'perseverance', label: 'Perseverance', build: () => buildPerseveranceRoverHotspot(US) },
      { id: 'phoenix', label: 'Phoenix', build: () => buildPhoenixClassHotspot(US) },
      { id: 'insight', label: 'InSight', build: () => buildInsightLanderHotspot(US) },
      { id: 'mars-3', label: 'Mars 3', build: () => buildMars3PetalHotspot(SU) },
      { id: 'zhurong', label: 'Zhurong', build: () => buildTianwenZhurongHotspot(CN) },
      { id: 'schiaparelli', label: 'Schiaparelli', build: () => buildSchiaparelliHotspot(EU) },
      { id: 'beagle-2', label: 'Beagle 2', build: () => buildBeagle2Hotspot(EU) },
    ],
    cruise: [
      'curiosity',
      'viking1',
      'mars3',
      'tianwen1',
      'schiaparelli',
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
      'hayabusa1',
      'osiris-rex',
      'near-shoemaker',
      'starship-demo',
    ].map((id) => ({ id, label: id, build: () => buildLanderCruiseCraft(id) })),
    descent: [
      { id: 'lunar', label: 'Lunar powered', b: () => buildDescentModel('apollo11', 'moon', 1) },
      {
        id: 'mars-retro',
        label: 'Mars retro',
        b: () => buildDescentModel('viking1-lander', 'mars', 1),
      },
      {
        id: 'airbag',
        label: 'Mars airbag',
        b: () => buildDescentModel('mars-pathfinder', 'mars', 1),
      },
      {
        id: 'skycrane',
        label: 'Mars skycrane',
        b: () => buildDescentModel('curiosity', 'mars', 1),
      },
      { id: 'venus', label: 'Venus aeroshell', b: () => buildDescentModel('venera13', 'venus', 1) },
      {
        id: 'asteroid',
        label: 'Asteroid sampler',
        b: () => buildDescentModel('hayabusa1', 'itokawa', 1),
      },
      { id: 'comet', label: 'Comet lander', b: () => buildDescentModel('philae', 'comet_67p', 1) },
      {
        id: 'jupiter',
        label: 'Jupiter probe',
        b: () => buildDescentModel('galileo-probe', 'jupiter', 1),
      },
      { id: 'titan', label: 'Titan parachute', b: () => buildDescentModel('huygens', 'titan', 1) },
    ].map((e) => ({ id: e.id, label: e.label, build: () => e.b().root })),
    launchers: [
      'saturn-v',
      'vostok-k',
      'ariane-5',
      'h-iia',
      'space-shuttle-stack',
      'falcon-9',
      'atlas-v',
      'proton-k',
      'titan-ii-glv',
      'atlas-lv-3b',
      'long-march-2f',
      'long-march-3b',
      'long-march-5',
      'pslv',
      'lvm3',
      'm-v',
      'h3',
      'ariane-1',
    ].map((id) => ({ id, label: id, build: () => buildLauncherModel(id, 1.2).root })),
    satellites: [
      ['hubble', US],
      ['jwst', US],
      ['chandra', US],
      ['xmm', EU],
      ['gaia', EU],
      ['lro', US],
      ['geo', '#888'],
      ['gps', US],
      ['__generic__', '#9aa'],
    ].map(([id, col]) => ({ id, label: id, build: () => buildSatelliteModel(id, col) })),
    facilities: [
      { id: 'iss', label: 'ISS', build: () => buildIssProxyStation() },
      { id: 'tiangong', label: 'Tiangong', build: () => buildTiangongProxyStation() },
      {
        id: 'venera',
        label: 'Venus lander',
        build: () => buildVenusLanderModel('venera-13', 'lander', '#c9a45a', 'Roscosmos'),
      },
      {
        id: 'launchpad',
        label: 'Launch facility',
        build: () => buildLaunchpadModel('lc-39a', undefined, '#9aa'),
      },
    ],
  };

  const family = $derived($page.url.searchParams.get('family') ?? 'spacecraft');
  const items = $derived(FAMILIES[family] ?? []);

  let cells: HTMLDivElement[] = $state([]);

  onMount(() => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:0';
    document.body.appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const FOV = 32;
    const scenes = items.map((it) => {
      const scene = new THREE.Scene();
      installHeroEnvironment(renderer, scene);
      const key = new THREE.DirectionalLight(0xfff4d8, 2.4);
      key.position.set(3, 2, 3);
      scene.add(key, new THREE.AmbientLight(0x223, 0.1));
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);
      let g: THREE.Group | null = null;
      try {
        g = it.build();
      } catch (e) {
        console.error('[hero-gallery]', it.id, e);
      }
      if (g) {
        g.updateWorldMatrix(true, true);
        const sph = new THREE.Box3().setFromObject(g).getBoundingSphere(new THREE.Sphere());
        g.position.sub(sph.center);
        scene.add(g);
        camera.userData.dist = (sph.radius / Math.sin((FOV * Math.PI) / 360)) * 1.15;
      }
      return { scene, camera, g };
    });

    let raf = 0;
    const tick = (): void => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.setScissorTest(true);
      renderer.setClearColor(0x05070f, 1);
      renderer.clear();
      const t = performance.now() * 0.0003;
      for (let i = 0; i < scenes.length; i++) {
        const node = cells[i];
        if (!node) continue;
        const r = node.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const y = window.innerHeight - r.bottom;
        renderer.setViewport(r.left, y, r.width, r.height);
        renderer.setScissor(r.left, y, r.width, r.height);
        const { scene, camera } = scenes[i];
        const d = camera.userData.dist ?? 3;
        const a = 0.6 + Math.sin(t + i) * 0.5;
        camera.aspect = r.width / r.height;
        camera.position.set(Math.cos(a) * d, d * 0.34, Math.sin(a) * d);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      canvas.remove();
    };
  });
</script>

<div class="head">Hero gallery — <b>{family}</b> ({items.length})</div>
<div class="grid">
  {#each items as it, i (it.id)}
    <figure class="cell">
      <div class="canvas" bind:this={cells[i]}></div>
      <figcaption>{it.label}</figcaption>
    </figure>
  {/each}
</div>

<style>
  :global(body) {
    background: #05070f;
  }
  .head {
    position: relative;
    z-index: 1;
    color: #cdd6e6;
    font:
      14px/1.4 system-ui,
      sans-serif;
    padding: 12px 16px;
  }
  .grid {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    padding: 0 16px 40px;
  }
  .cell {
    margin: 0;
  }
  .canvas {
    width: 100%;
    aspect-ratio: 4 / 3;
  }
  figcaption {
    color: #8a93a8;
    font:
      12px/1.4 ui-monospace,
      monospace;
    text-align: center;
    padding-top: 4px;
  }
</style>
