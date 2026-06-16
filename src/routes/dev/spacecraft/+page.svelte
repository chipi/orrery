<!--
  Dev-only spacecraft model gallery — renders every entry in
  src/lib/three/interplanetary-spacecraft-models.ts on its own canvas
  so the supervising architect can scan all 21 silhouettes at once,
  identify which need rework, and sign off as a set.

  Each card spins slowly so the silhouette reads from multiple angles.
  Lighting matches /fly's heliocentric scene: a single warm key light
  (the Sun) plus a thin cool fill so RTG / solar-panel contrast reads
  the way it will in the live fly-through.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { buildInterplanetarySpacecraft } from '$lib/three/interplanetary-spacecraft-models';

  // Stable order — `cassini` first as the reference, then the 4 prior
  // builders, then the 13 new ones grouped roughly by family.
  const MISSIONS: Array<{ id: string; label: string; era: string }> = [
    { id: 'cassini', label: 'Cassini–Huygens', era: '1997–2017 · ref.' },
    { id: 'cassini-tour', label: 'Cassini (Saturn tour)', era: 'shares cassini' },
    { id: 'voyager-1', label: 'Voyager 1', era: '1977–' },
    { id: 'voyager-2', label: 'Voyager 2', era: '1977– · shares voyager' },
    { id: 'galileo', label: 'Galileo', era: '1989–2003' },
    { id: 'galileo-tour', label: 'Galileo (Jupiter tour)', era: 'shares galileo' },
    { id: 'new-horizons', label: 'New Horizons', era: '2006–' },
    // 2026-06-16 additions
    { id: 'pioneer-10', label: 'Pioneer 10', era: '1972–2003' },
    { id: 'pioneer-11', label: 'Pioneer 11', era: '1973–1995 · shares pioneer' },
    { id: 'juno', label: 'Juno', era: '2011–' },
    { id: 'juno-tour', label: 'Juno (Jupiter tour)', era: 'shares juno' },
    { id: 'bepicolombo', label: 'BepiColombo', era: '2018–' },
    { id: 'dawn', label: 'Dawn', era: '2007–2018' },
    { id: 'giotto', label: 'Giotto', era: '1985–1992' },
    { id: 'hayabusa2', label: 'Hayabusa2', era: '2014–2020' },
    { id: 'juice', label: 'JUICE', era: '2023–' },
    { id: 'rosetta', label: 'Rosetta', era: '2004–2016' },
    { id: 'ulysses', label: 'Ulysses', era: '1990–2009' },
    { id: 'vega-1', label: 'Vega 1', era: '1984–1987' },
    { id: 'vega-2', label: 'Vega 2', era: '1984–1987 · shares vega' },
    { id: 'venera-13', label: 'Venera 13', era: '1981–1983' },
  ];

  type Card = {
    container: HTMLDivElement | null;
    renderer: THREE.WebGLRenderer | null;
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    group: THREE.Group | null;
  };
  const cards: Card[] = MISSIONS.map(() => ({
    container: null,
    renderer: null,
    scene: null,
    camera: null,
    group: null,
  }));

  let raf = 0;
  let mounted = false;

  function setupCard(idx: number, missionId: string): void {
    const card = cards[idx];
    if (!card.container) return;
    const w = card.container.clientWidth;
    const h = card.container.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060e);
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.01, 100);
    camera.position.set(2.4, 1.0, 2.4);
    camera.lookAt(0, 0, 0);
    // Warm key (Sun) + cool fill so RTG / solar-blue read as intended.
    const key = new THREE.DirectionalLight(0xfff4d0, 1.8);
    key.position.set(3, 2, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x4080ff, 0.4);
    fill.position.set(-2, -1, -2);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0x404060, 0.55));
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    card.container.appendChild(renderer.domElement);
    const group = buildInterplanetarySpacecraft(missionId);
    if (group) scene.add(group);
    card.renderer = renderer;
    card.scene = scene;
    card.camera = camera;
    card.group = group;
  }

  function tick(): void {
    const t = performance.now() * 0.0004;
    for (const card of cards) {
      if (!card.group || !card.scene || !card.camera || !card.renderer) continue;
      card.group.rotation.y = t;
      card.renderer.render(card.scene, card.camera);
    }
    raf = requestAnimationFrame(tick);
  }

  onMount(() => {
    mounted = true;
    for (let i = 0; i < MISSIONS.length; i++) setupCard(i, MISSIONS[i].id);
    raf = requestAnimationFrame(tick);
    const onResize = () => {
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        if (!c.container || !c.renderer || !c.camera) continue;
        const w = c.container.clientWidth;
        const h = c.container.clientHeight;
        c.renderer.setSize(w, h);
        c.camera.aspect = w / h;
        c.camera.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    for (const c of cards) {
      if (c.group) (c.group.userData.dispose as (() => void) | undefined)?.();
      c.renderer?.dispose();
    }
  });
</script>

<svelte:head><title>Spacecraft showcase · Orrery dev</title></svelte:head>

<main class="showcase" class:ready={mounted}>
  <header>
    <h1>Spacecraft model showcase</h1>
    <p>
      All {MISSIONS.length} entries in interplanetary-spacecraft-models.ts. Each silhouette spins
      slowly so the proportions read from multiple angles. Lighting matches /fly's heliocentric
      key+fill so the gold-MLI / solar-blue / RTG-dark palette renders as it will in the live
      fly-through.
    </p>
  </header>
  <div class="grid">
    {#each MISSIONS as mission, i (mission.id)}
      <figure class="card">
        <div class="canvas" bind:this={cards[i].container}></div>
        <figcaption>
          <span class="name">{mission.label}</span>
          <span class="era">{mission.era}</span>
          <span class="id mono">{mission.id}</span>
        </figcaption>
      </figure>
    {/each}
  </div>
</main>

<style>
  .showcase {
    padding: 32px 22px 60px;
    color: rgba(255, 255, 255, 0.92);
    background: #03050b;
    min-height: 100vh;
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
    aspect-ratio: 4 / 3;
    background: #05060e;
  }
  .canvas :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
  figcaption {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }
  .name {
    font-family: var(--font-display, 'Space Mono', monospace);
    font-size: 13px;
    letter-spacing: 2px;
    color: #fff;
    text-transform: uppercase;
  }
  .era {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.6px;
    color: rgba(255, 200, 80, 0.8);
    text-transform: uppercase;
  }
  .id {
    font-family: 'Space Mono', monospace;
    font-size: 9.5px;
    letter-spacing: 1.4px;
    color: rgba(255, 255, 255, 0.5);
  }
</style>
