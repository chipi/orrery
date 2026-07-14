<!--
  ConstellationFinder — a mini sky chart of a star's constellation (as seen from
  the Sun) with the star lit, for the StarPanel gallery (/explore v2 Slice 1). The
  projection is pure (constellation-finder.ts); this draws it to a canvas. Honest
  + asset-free: real line figures (d3-celestial / IAU) + the star's real direction.
-->
<script lang="ts">
  import { projectConstellation } from '$lib/universe/constellation-finder';

  type Props = { vertices: number[]; starXYZ: [number, number, number]; label?: string };
  let { vertices, starXYZ, label }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  const W = 360;
  const H = 240;

  function draw() {
    const cv = canvas;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#04060d';
    ctx.fillRect(0, 0, W, H);

    const { segments, star } = projectConstellation(vertices, starXYZ);
    if (segments.length === 0) return;

    // Fit the [0,1] projection into the canvas with a margin, keeping aspect by
    // using the smaller dimension.
    const m = 18;
    const s = Math.min(W, H) - 2 * m;
    const ox = (W - s) / 2;
    const oy = (H - s) / 2;
    const px = (x: number) => ox + x * s;
    const py = (y: number) => oy + (1 - y) * s; // flip Y for screen

    // Constellation lines.
    ctx.strokeStyle = 'rgba(120, 190, 230, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const [a, b] of segments) {
      ctx.moveTo(px(a[0]), py(a[1]));
      ctx.lineTo(px(b[0]), py(b[1]));
    }
    ctx.stroke();

    // Faint node dots at each segment endpoint.
    ctx.fillStyle = 'rgba(200, 220, 255, 0.5)';
    for (const [a, b] of segments) {
      for (const pt of [a, b]) {
        ctx.beginPath();
        ctx.arc(px(pt[0]), py(pt[1]), 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // The star — a bright teal marker with a glow.
    if (star) {
      const sx = px(star[0]);
      const sy = py(star[1]);
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
      glow.addColorStop(0, 'rgba(120, 240, 230, 0.9)');
      glow.addColorStop(1, 'rgba(120, 240, 230, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eafffb';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (label) {
      ctx.font = '10px "Space Mono", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(label.toUpperCase(), m, H - 10);
    }
  }

  $effect(() => {
    void vertices;
    void starXYZ;
    void label;
    draw();
  });
</script>

<canvas bind:this={canvas} width={W} height={H} class="finder" aria-hidden="true"></canvas>

<style>
  .finder {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 3 / 2;
    border-radius: 4px;
    background: #04060d;
  }
</style>
