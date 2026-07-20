<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import * as THREE from 'three';
  import { buildHeroDemoCraft } from '$lib/three/hero-demo';
  import { buildInterplanetarySpacecraft } from '$lib/three/interplanetary-spacecraft-models';
  import { installHeroEnvironment } from '$lib/three/hero-materials';
  import { buildApolloLMHotspot } from '$lib/hotspot-models/apollo-lm';
  import { buildLuna9Hotspot } from '$lib/hotspot-models/luna-9-spherical';
  import { buildLunokhodHotspot } from '$lib/hotspot-models/lunokhod-rover';
  import { buildChandrayaan3VikramHotspot } from '$lib/hotspot-models/chandrayaan-3-vikram';
  import { buildVikingTripodHotspot } from '$lib/hotspot-models/viking-tripod';
  import { buildPhoenixClassHotspot } from '$lib/hotspot-models/phoenix-class';
  import { buildTianwenZhurongHotspot } from '$lib/hotspot-models/tianwen-zhurong';
  import { buildPathfinderSojournerHotspot } from '$lib/hotspot-models/pathfinder-sojourner';
  import { buildMars3PetalHotspot } from '$lib/hotspot-models/mars-3-petal';

  const HOTSPOT: Record<string, () => THREE.Group> = {
    'apollo-lm': () => buildApolloLMHotspot('#0B3D91'),
    'luna-9': () => buildLuna9Hotspot('#cc4444'),
    lunokhod: () => buildLunokhodHotspot('#cc4444'),
    vikram: () => buildChandrayaan3VikramHotspot('#FF9933'),
    viking: () => buildVikingTripodHotspot('#0B3D91'),
    phoenix: () => buildPhoenixClassHotspot('#0B3D91'),
    zhurong: () => buildTianwenZhurongHotspot('#DE2910'),
    pathfinder: () => buildPathfinderSojournerHotspot('#0B3D91'),
    'mars-3': () => buildMars3PetalHotspot('#cc4444'),
  };

  let host: HTMLDivElement;

  onMount(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
    // eslint-disable-next-line svelte/no-dom-manipulating
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060d);
    installHeroEnvironment(renderer, scene);

    // A single strong sun key + a faint fill; the IBL does the rest.
    const key = new THREE.DirectionalLight(0xfff4d8, 3.0);
    key.position.set(4, 3, 4);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0x334455, 0.15));

    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

    const which = $page.url.searchParams.get('model');
    const model = which
      ? (HOTSPOT[which]?.() ?? buildInterplanetarySpacecraft(which) ?? buildHeroDemoCraft())
      : buildHeroDemoCraft();
    model.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(model);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    model.position.sub(sphere.center);
    scene.add(model);
    const r = sphere.radius;
    const dist = (r / Math.sin((30 * Math.PI) / 360)) * 1.05;

    function resize(): void {
      const W = window.innerWidth;
      const H = window.innerHeight - 32;
      renderer.setSize(W, H, true);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    const loop = (): void => {
      t += 0.003;
      const a = 0.6 + Math.sin(t) * 0.6;
      camera.position.set(Math.cos(a) * dist, dist * 0.35, Math.sin(a) * dist);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      renderer.dispose();
    };
  });
</script>

<div class="wrap">
  <div class="host" bind:this={host}></div>
  <p class="cap">
    Tier-B hero demo — PBR + space IBL + greebles + bevels. Drag not wired; slow auto-orbit.
  </p>
</div>

<style>
  .wrap {
    position: fixed;
    inset: 0;
    background: #04060d;
    display: flex;
    flex-direction: column;
  }
  .host {
    flex: 1;
    width: 100%;
  }
  .cap {
    color: #8a93a8;
    font:
      12px/1.4 system-ui,
      sans-serif;
    text-align: center;
    padding: 8px;
    margin: 0;
  }
</style>
