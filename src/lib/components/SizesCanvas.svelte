<script lang="ts">
  import { onMount } from 'svelte';
  import * as m from '$lib/paraglide/messages';

  // True relative radii (km, IAU mean values).
  type SizeEntry = {
    id: string;
    name: string;
    r: number;
    col: string;
    km: string;
  };

  const SIZES: SizeEntry[] = [
    { id: 'jupiter', name: 'Jupiter', r: 69911, col: '#c88b3a', km: '69,911 km' },
    { id: 'saturn', name: 'Saturn', r: 58232, col: '#e4d191', km: '58,232 km' },
    { id: 'uranus', name: 'Uranus', r: 25362, col: '#7de8e8', km: '25,362 km' },
    { id: 'neptune', name: 'Neptune', r: 24622, col: '#4466bb', km: '24,622 km' },
    { id: 'earth', name: 'Earth', r: 6371, col: '#4b9cd3', km: '6,371 km' },
    { id: 'venus', name: 'Venus', r: 6052, col: '#e8cda0', km: '6,052 km' },
    { id: 'mars', name: 'Mars', r: 3390, col: '#c1440e', km: '3,390 km' },
    { id: 'mercury', name: 'Mercury', r: 2440, col: '#c8c8c8', km: '2,440 km' },
  ];

  type Props = { highlightId: string | null };
  let { highlightId }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  function draw() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#06061a';
    ctx.fillRect(0, 0, cssW, cssH);

    const maxR = SIZES[0].r;
    const maxVR = 60;
    const scale = maxVR / maxR;

    const LABEL_X = 12;
    const BAR_X = 80;
    const BAR_MAX = cssW - BAR_X - 12;

    let y = 8;
    ctx.font = '6px "Space Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.textAlign = 'left';
    ctx.fillText(m.sizes_header(), LABEL_X, y + 6);
    y += 16;

    for (const s of SIZES) {
      const vr = Math.max(1.5, s.r * scale);
      const isThis = highlightId === s.id;
      const rowH = Math.max(vr * 2 + 6, 18);
      const cy = y + rowH / 2;

      if (isThis) {
        ctx.fillStyle = 'rgba(68,102,255,0.08)';
        ctx.fillRect(0, y, cssW, rowH);
      }

      ctx.font = `${isThis ? 'bold ' : ''}${Math.min(8, 6 + vr * 0.05)}px "Space Mono", monospace`;
      ctx.fillStyle = isThis ? '#fff' : s.col + 'cc';
      ctx.textAlign = 'left';
      ctx.fillText(s.name, LABEL_X, cy + 3);

      const barW = Math.max(2, (s.r / maxR) * BAR_MAX);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(BAR_X, cy - 2.5, BAR_MAX, 5);
      const bg = ctx.createLinearGradient(BAR_X, 0, BAR_X + barW, 0);
      bg.addColorStop(0, s.col + 'cc');
      bg.addColorStop(1, s.col + '44');
      ctx.fillStyle = bg;
      ctx.fillRect(BAR_X, cy - 2.5, barW, 5);

      const circleX = BAR_X + barW + vr + 4;
      if (circleX + vr < cssW - 2) {
        const g = ctx.createRadialGradient(
          circleX - vr * 0.3,
          cy - vr * 0.3,
          vr * 0.05,
          circleX,
          cy,
          vr,
        );
        g.addColorStop(0, s.col + 'ee');
        g.addColorStop(1, s.col + '44');
        ctx.beginPath();
        ctx.arc(circleX, cy, vr, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        if (isThis) {
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      ctx.font = '6px "Space Mono", monospace';
      ctx.fillStyle = isThis ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)';
      ctx.textAlign = 'right';
      ctx.fillText(s.km, cssW - 4, cy + 3);

      y += rowH + 3;
      if (y > cssH - 10) break;
    }

    ctx.font = '5px "Space Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.textAlign = 'left';
    ctx.fillText(m.sizes_source(), LABEL_X, cssH - 4);
  }

  onMount(() => {
    draw();
    const observer = new ResizeObserver(() => draw());
    if (canvas) observer.observe(canvas);
    return () => observer.disconnect();
  });

  $effect(() => {
    void highlightId;
    draw();
  });
</script>

<canvas bind:this={canvas} aria-label={m.sizes_canvas_label()}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 380px;
    border-radius: 4px;
  }
</style>
