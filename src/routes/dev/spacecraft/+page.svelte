<!--
  Dev-only spacecraft model gallery — renders every entry in
  src/lib/three/interplanetary-spacecraft-models.ts so the supervising
  architect can scan all silhouettes at once and sign off as a set.

  Chrome caps WebGL contexts at 16 per page; we have 21 spacecraft.
  The first try used one WebGLRenderer per card and Chrome evicted
  the first 5 contexts to make room for the newer ones — leaving the
  Cassini / Voyager / Galileo cards visually blank with the browser's
  default "no-context" placeholder. Fix: one shared WebGLRenderer
  with viewport + scissor per card. Each card still owns its own
  Scene + Camera; the renderer paints into the card's screen rect.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { buildInterplanetarySpacecraft } from '$lib/three/interplanetary-spacecraft-models';

  const MISSIONS: Array<{ id: string; label: string; era: string }> = [
    { id: 'cassini', label: 'Cassini–Huygens', era: '1997–2017 · ref.' },
    { id: 'cassini-tour', label: 'Cassini (Saturn tour)', era: 'shares cassini' },
    { id: 'voyager-1', label: 'Voyager 1', era: '1977–' },
    { id: 'voyager-2', label: 'Voyager 2', era: '1977– · shares voyager' },
    { id: 'galileo', label: 'Galileo', era: '1989–2003' },
    { id: 'galileo-tour', label: 'Galileo (Jupiter tour)', era: 'shares galileo' },
    { id: 'new-horizons', label: 'New Horizons', era: '2006–' },
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

  function buildScene(missionId: string): {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    group: THREE.Group | null;
  } {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060e);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    camera.position.set(3.5, 1.5, 3.5);
    camera.lookAt(0, 0, 0);
    const key = new THREE.DirectionalLight(0xfff4d0, 1.8);
    key.position.set(3, 2, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x4080ff, 0.4);
    fill.position.set(-2, -1, -2);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0x404060, 0.55));
    const group = buildInterplanetarySpacecraft(missionId);
    if (group) scene.add(group);
    else console.warn(`[showcase] no builder for ${missionId}`);
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
    // Black clear for off-card areas. The shared canvas is fixed-positioned
    // behind the grid, so anything not covered by a scissor stays
    // transparent / scrolls with the page (CSS handles that).
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    const t = performance.now() * 0.0004;
    for (const card of cards) {
      const rect = card.container.getBoundingClientRect();
      // Skip off-screen cards — no need to render.
      if (rect.bottom < 0 || rect.top > H || rect.right < 0 || rect.left > W) continue;
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) continue;
      // Three.js uses bottom-left origin for viewport/scissor.
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
    // Defer one frame so the grid layout has settled before we read
    // dimensions. ResizeObserver isn't needed — tick() re-reads
    // getBoundingClientRect every frame.
    requestAnimationFrame(() => {
      // Single shared canvas, position:fixed behind the grid so
      // getBoundingClientRect coordinates match viewport coords.
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
        renderer = new THREE.WebGLRenderer({
          canvas: sharedCanvas,
          antialias: true,
          alpha: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight, false);
      } catch (err) {
        console.error('[showcase] WebGL renderer init failed:', err);
        sharedCanvas.remove();
        sharedCanvas = null;
        return;
      }
      for (let i = 0; i < MISSIONS.length; i++) {
        const node = containers[i];
        if (!node) {
          console.warn(`[showcase] no container at index ${i} for ${MISSIONS[i].id}`);
          continue;
        }
        const { scene, camera, group } = buildScene(MISSIONS[i].id);
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
    sharedCanvas?.remove();
    sharedCanvas = null;
    renderer = null;
  });
</script>

<svelte:head><title>Spacecraft showcase · Orrery dev</title></svelte:head>

<main class="showcase">
  <header>
    <h1>Spacecraft model showcase</h1>
    <p>
      All {MISSIONS.length} entries in interplanetary-spacecraft-models.ts. One shared WebGL canvas paints
      each card's silhouette into the card's screen rect (so we side-step Chrome's 16-context cap that
      would otherwise blank the first 5 cards as 17-21 came online).
    </p>
  </header>
  <div class="grid">
    {#each MISSIONS as mission, i (mission.id)}
      <figure class="card">
        <div class="canvas" bind:this={containers[i]}></div>
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
  :global(body) {
    background: #03050b;
  }
  .showcase {
    padding: 32px 22px 60px;
    color: rgba(255, 255, 255, 0.92);
    min-height: 100vh;
    position: relative;
    z-index: 1; /* sit above the shared canvas */
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
    /* Transparent so the shared WebGL canvas underneath shows through
       only where we set the viewport+scissor. */
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
