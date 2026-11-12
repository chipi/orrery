<script lang="ts">
  import { onMount } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { PLANET_SIZES } from '$lib/explore/planet-sizes';

  const SIZES = PLANET_SIZES;

  // `hoverId` is the legend cell under the pointer or focus: its body gets the ring too.
  type Props = { highlightId: string | null; hoverId?: string | null };
  let { highlightId, hoverId = null }: Props = $props();

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

    // Background — subtle starfield to make the scene feel like a
    // diorama, not a chart row.
    ctx.fillStyle = '#06061a';
    ctx.fillRect(0, 0, cssW, cssH);
    const starSeed = 17;
    ctx.fillStyle = 'rgba(220,225,255,0.35)';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 73 + starSeed * 11) % cssW) + 0.5;
      const y = ((i * 31 + starSeed * 7) % (cssH - 24)) + 12.5;
      const r = i % 6 === 0 ? 0.9 : 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // True relative diameters across all 8 planets: each planet's drawn diameter is
    // r * scale; `scale` is chosen so the total width (sum of diameters + 7 gaps) fills the
    // canvas, capped so Jupiter fits the height. The names and diameters are the DOM legend
    // under the canvas (SizesOverlay), not drawn here.
    const padX = 16;
    const padTop = 14;
    const padBottom = 14;
    const gapPx = Math.max(6, Math.min(20, cssW * 0.03));
    const jupiterR = SIZES.find((s) => s.id === 'jupiter')?.r ?? 69911;
    const sumR = SIZES.reduce((acc, s) => acc + s.r, 0);
    const usableW = cssW - 2 * padX - gapPx * (SIZES.length - 1);
    const scaleH = usableW / (2 * sumR);
    const scaleV = (cssH - padTop - padBottom) / (2 * jupiterR);
    const scale = Math.max(0.0001, Math.min(scaleH, scaleV));
    // Planets sit on a common baseline so size differences read at a glance.
    const baselineY = padTop + 2 * jupiterR * scale;
    const totalRenderW =
      SIZES.reduce((acc, s) => acc + 2 * s.r * scale, 0) + gapPx * (SIZES.length - 1);
    let cursorX = padX + (cssW - 2 * padX - totalRenderW) / 2;

    for (const s of SIZES) {
      const radius = Math.max(2, s.r * scale);
      const cx = cursorX + radius;
      const cy = baselineY - radius;
      cursorX += 2 * radius + gapPx;
      const isThis = highlightId === s.id;
      const isHover = hoverId === s.id;

      // Sphere body with radial gradient for the lit-from-top-left look.
      const grad = ctx.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.4,
        radius * 0.05,
        cx,
        cy,
        radius * 1.05,
      );
      grad.addColorStop(0, s.col + 'ff');
      grad.addColorStop(0.6, s.col + 'cc');
      grad.addColorStop(1, s.col + '33');
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Ring for the open planet's body; a softer one for the legend cell under the pointer.
      if (isThis || isHover) {
        ctx.strokeStyle = isThis ? '#fff' : 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Saturn ring — angled ellipse around the body. Ratio is the
      // approximate visual span of the A-ring outer edge.
      if (s.id === 'saturn') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.25);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 1.85, radius * 0.45, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(228,209,145,0.65)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 1.55, radius * 0.38, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(228,209,145,0.35)';
        ctx.stroke();
        ctx.restore();
      }
    }

    // Baseline tick (subtle horizontal line under all planets).
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padX, baselineY + 0.5);
    ctx.lineTo(cssW - padX, baselineY + 0.5);
    ctx.stroke();
  }

  onMount(() => {
    draw();
    const observer = new ResizeObserver(() => draw());
    if (canvas) observer.observe(canvas);
    return () => observer.disconnect();
  });

  $effect(() => {
    void highlightId;
    void hoverId;
    draw();
  });
</script>

<canvas bind:this={canvas} aria-label={m.sizes_canvas_label()}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 4px;
  }
</style>
