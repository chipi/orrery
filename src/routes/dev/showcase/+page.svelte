<!--
  /dev/showcase — review sheet for the showcase spacecraft models (src/lib/three/showcase/*).
  ?id=<fleet id> shows one craft from four sides (front, 45°, side, top) beside a 1.75 m person,
  on a 1 m grid, under the line-up's studio light; no ?id lists every model found. Dev-only.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import type { ShowcaseModel } from '$lib/three/showcase/types';
  import { buildScaleFigure } from '$lib/three/lineup/scale-figures';
  import { installHeroEnvironment } from '$lib/three/hero-materials';
  import { buildOrbiterOpenable } from '$lib/three/showcase/winged';
  import { ORBITER_REST_PITCH_DEG } from '$lib/three/showcase/orbiter-stance';

  const modules = import.meta.glob<{ SHOWCASE?: Record<string, ShowcaseModel> }>(
    ['$lib/three/showcase/*.ts', '!$lib/three/showcase/*.test.ts'],
    { eager: true },
  );
  const all: Record<string, ShowcaseModel> = {};
  for (const mod of Object.values(modules)) Object.assign(all, mod.SHOWCASE ?? {});

  let canvas: HTMLCanvasElement;
  let id = $state('');
  let info = $state('');
  let ready = $state(false);

  onMount(() => {
    id = new URLSearchParams(location.search).get('id') ?? '';
    const m = all[id];
    if (!m) {
      ready = true;
      return;
    }
    const W = 1600;
    const H = 900;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setScissorTest(true);

    const q = new URLSearchParams(location.search);
    // ?bay=<0..1>[&arm=yaw,shoulderPitch,elbow,wristPitch,wristYaw,wristRoll in degrees]: the
    // Shuttle with its payload-bay doors open that far and the RMS posed (any orbiter id).
    // ?gear=<0..1>: the Shuttle's gear that far down (doors included); &land=1 lays any winged
    // craft (nose +y, belly +z) belly-down on the ground, the way it stands on its runway.
    const craft = q.has('bay') || q.has('gear') ? buildOrbiterOpenable() : m.build();
    if (q.has('gear')) craft.userData.setGear(Number(q.get('gear')));
    if (q.get('land') === '1') {
      craft.rotation.x = Math.PI / 2 - (ORBITER_REST_PITCH_DEG * Math.PI) / 180;
      craft.updateMatrixWorld(true);
      craft.position.y = -new THREE.Box3().setFromObject(craft).min.y;
    }
    if (q.has('bay')) {
      craft.userData.setBayDoors(Number(q.get('bay')));
      const d = (q.get('arm') ?? '').split(',').map((s) => (Number(s) * Math.PI) / 180);
      const r = craft.userData.rms;
      r.shoulderYaw.rotation.z = d[0] || 0;
      r.shoulderPitch.rotation.x = d[1] || 0;
      r.elbow.rotation.x = d[2] || 0;
      r.wristPitch.rotation.x = d[3] || 0;
      r.wristYaw.rotation.z = d[4] || 0;
      r.wristRoll.rotation.y = d[5] || 0;
    }
    const box = new THREE.Box3().setFromObject(craft);
    const size = box.getSize(new THREE.Vector3());
    info = `${id}: drawn ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m (w × h × d); heightM ${m.heightM}, diameterM ${m.diameterM}; base y ${box.min.y.toFixed(3)}`;

    // ?hero=1&az=<deg>&el=<deg>: one large perspective view in hard sunlight, for judging detail
    // (the four-view sheet draws a 7 m lander a few hundred pixels tall).
    if (q.get('hero') === '1') {
      const az = (Number(q.get('az') ?? 35) * Math.PI) / 180;
      const el = (Number(q.get('el') ?? 12) * Math.PI) / 180;
      renderer.setScissorTest(false);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x07090e);
      scene.add(new THREE.HemisphereLight(0xcfd8e8, 0x3a3a3a, 0.5));
      const sun = new THREE.DirectionalLight(0xfff6ea, 3.2);
      sun.position.set(-1, 0.9, q.get('flip') === '1' ? -1.2 : 1.2); // flip: light the dorsal (-z) side
      scene.add(sun);
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(60, 64),
        new THREE.MeshStandardMaterial({ color: 0x6b6862, roughness: 1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      scene.add(craft);
      // &ibl=0 shows it as a scene without the reflection environment does (the descent today).
      if (q.get('ibl') !== '0') installHeroEnvironment(renderer, scene);
      const cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 1000);
      const r = Math.max(size.y * 2.3, Math.max(size.x, size.z) * 1.1) * Number(q.get('zoom') ?? 1);
      const target = new THREE.Vector3(
        Number(q.get('tx') ?? 0),
        q.has('ty') ? Number(q.get('ty')) : size.y * 0.45,
        Number(q.get('tz') ?? 0),
      );
      cam.position.set(
        target.x + Math.sin(az) * Math.cos(el) * r,
        target.y + Math.sin(el) * r,
        target.z + Math.cos(az) * Math.cos(el) * r,
      );
      cam.lookAt(target);
      renderer.render(scene, cam);
      ready = true;
      return () => renderer.dispose();
    }

    const views: { pos: THREE.Vector3; label: string }[] = [
      { pos: new THREE.Vector3(0, 0, 1), label: 'front' },
      { pos: new THREE.Vector3(0.7, 0.15, 0.7), label: '45°' },
      { pos: new THREE.Vector3(1, 0, 0), label: 'side' },
      { pos: new THREE.Vector3(0, 1, 0.001), label: 'top' },
    ];
    const cw = W / 4;
    // Fit both the height and the widest span (solar wings) into the narrow cells.
    const span = Math.max(size.x, size.z, 2);
    const extent = Math.max(size.y * 0.62, ((span + 2.5) * 0.55 * H) / cw);
    views.forEach((v, i) => {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x161c28);
      scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1f2b, 1.1));
      const key = new THREE.DirectionalLight(0xfff4e6, 2.6);
      key.position.set(-0.6, 0.8, 1);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x9cc4ff, 1.6);
      rim.position.set(0.9, 0.4, -1);
      scene.add(rim);
      scene.add(m.build());
      const grid = new THREE.GridHelper(
        Math.ceil(extent * 4),
        Math.ceil(extent * 4),
        0x3a475f,
        0x262f40,
      );
      scene.add(grid);
      if (v.label !== 'top') {
        const person = buildScaleFigure('person');
        person.position.set(size.x / 2 + 1, 0, 0);
        if (v.label === 'side') person.rotation.y = Math.PI / 2;
        scene.add(person);
      }
      const a = cw / H;
      const cam = new THREE.OrthographicCamera(-extent * a, extent * a, extent, -extent, -500, 500);
      const target = new THREE.Vector3(0, size.y / 2, 0);
      cam.position.copy(target).add(v.pos.clone().normalize().multiplyScalar(100));
      cam.lookAt(target);
      renderer.setViewport(i * cw, 0, cw, H);
      renderer.setScissor(i * cw, 0, cw, H);
      renderer.render(scene, cam);
    });
    ready = true;
    return () => renderer.dispose();
  });
</script>

<div class="sheet" data-ready={ready}>
  {#if id && all[id]}
    <p>{info}</p>
  {:else}
    <p>?id= one of: {Object.keys(all).sort().join(', ') || '(no showcase models yet)'}</p>
  {/if}
  <canvas bind:this={canvas} hidden={!(id && all[id])}></canvas>
</div>

<style>
  .sheet {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: #161c28;
    color: #e6ecf5;
    font: 13px monospace;
    overflow: auto;
  }
  p {
    margin: 8px 12px;
  }
</style>
