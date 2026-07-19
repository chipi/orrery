<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import * as THREE from 'three';
  import { buildHeroDemoCraft } from '$lib/three/hero-demo';
  import { buildInterplanetarySpacecraft } from '$lib/three/interplanetary-spacecraft-models';
  import { installHeroEnvironment } from '$lib/three/hero-materials';

  let host: HTMLDivElement;

  onMount(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
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
      ? (buildInterplanetarySpacecraft(which) ?? buildHeroDemoCraft())
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
