<script lang="ts">
  import { onMount } from 'svelte';
  import * as m from '$lib/paraglide/messages';

  // True relative radii (km, IAU mean values). Ordered by descending
  // SIZE (Jupiter → Mercury) so the diorama reads as a clean
  // "biggest to smallest" rank. Inner-planet labels then never
  // overlap because the giants are far from them on the canvas.
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

    // Background — subtle starfield to make the scene feel like a
    // diorama, not a chart row.
    ctx.fillStyle = '#06061a';
    ctx.fillRect(0, 0, cssW, cssH);
    const starSeed = 17;
    ctx.fillStyle = 'rgba(220,225,255,0.35)';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 73 + starSeed * 11) % cssW) + 0.5;
      const y = ((i * 31 + starSeed * 7) % (cssH - 60)) + 12.5;
      const r = i % 6 === 0 ? 0.9 : 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Header at top.
    ctx.font = "bold 11px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(m.sizes_header(), 12, 14);

    // True relative diameters across all 8 planets:
    // sum(r) ≈ 196,279 km. Layout: each planet's drawn diameter is
    // r * scale; we choose `scale` so the total width (sum of
    // diameters + 7 gaps) fills the canvas with comfortable padding.
    const padX = 16;
    const padTop = 32;
    // Bigger gap helps the inner-planet cluster (Earth/Venus/Mars/
    // Mercury) breathe — at the small end the planet bodies are 2-6
    // px wide so the gap is what gives the labels room to land.
    const gapPx = 28;
    // Each label is two 11 px lines (name, diameter); rows stack below the baseline.
    const ROW_PITCH = 30;
    const FIRST_ROW = 14;
    const SOURCE_LINE = 22; // the "Diameters in km · Source" line at the bottom
    const PAD_BETWEEN = 8;
    const jupiterR = SIZES.find((s) => s.id === 'jupiter')?.r ?? 69911;
    const sumR = SIZES.reduce((acc, s) => acc + s.r, 0);
    ctx.font = "11px 'Space Mono', monospace";

    type Layout = {
      cx: number;
      cy: number;
      radius: number;
      nameLabel: string;
      kmLabel: string;
      labelW: number;
      /** Label centre, clamped so the label stays inside the canvas. */
      labelX: number;
      row: number;
    };

    // Lay the planets out for a given label-row budget; returns how many rows the labels
    // need. Inner planets pack tight at true relative scale, so their labels stagger onto
    // further rows (each row checks its own right edge, so no two labels collide).
    const layoutFor = (rows: number) => {
      const padBottom = FIRST_ROW + rows * ROW_PITCH + SOURCE_LINE;
      const usableW = cssW - 2 * padX - gapPx * (SIZES.length - 1);
      const scaleH = usableW / (2 * sumR);
      const scaleV = (cssH - padTop - padBottom) / (2 * jupiterR);
      const scale = Math.max(0.0001, Math.min(scaleH, scaleV));
      // Planets sit on a common baseline so size differences read at a glance.
      const baselineY = padTop + 2 * jupiterR * scale;
      const totalRenderW =
        SIZES.reduce((acc, s) => acc + 2 * s.r * scale, 0) + gapPx * (SIZES.length - 1);
      let cursorX = padX + (cssW - 2 * padX - totalRenderW) / 2;
      const layouts: Layout[] = [];
      const rowEnd: number[] = [];
      for (const s of SIZES) {
        const radius = Math.max(2, s.r * scale);
        const cx = cursorX + radius;
        const nameLabel = s.name.toUpperCase();
        const labelW = Math.max(ctx.measureText(nameLabel).width, ctx.measureText(s.km).width);
        const labelX = Math.min(Math.max(cx, padX + labelW / 2), cssW - padX - labelW / 2);
        let row = 0;
        while (row < rowEnd.length && labelX - labelW / 2 < rowEnd[row] + PAD_BETWEEN) row++;
        rowEnd[row] = labelX + labelW / 2;
        layouts.push({
          cx,
          cy: baselineY - radius,
          radius,
          nameLabel,
          kmLabel: s.km,
          labelW,
          labelX,
          row,
        });
        cursorX += 2 * radius + gapPx;
      }
      return { layouts, baselineY, rowsUsed: rowEnd.length };
    };
    let rows = 2;
    let plan = layoutFor(rows);
    while (plan.rowsUsed > rows && rows < SIZES.length) {
      rows = plan.rowsUsed;
      plan = layoutFor(rows);
    }
    const { layouts, baselineY } = plan;

    for (let i = 0; i < SIZES.length; i++) {
      const s = SIZES[i];
      const lay = layouts[i];
      const { cx, cy, radius } = lay;
      const isThis = highlightId === s.id;

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

      // Highlight ring for the active selection.
      if (isThis) {
        ctx.strokeStyle = '#fff';
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

      // Labels: name + diameter below the baseline, on the row the layout gave them.
      // A thin leader-line links a staggered or shifted label to its body.
      const labelTopY = baselineY + FIRST_ROW + lay.row * ROW_PITCH;
      ctx.textAlign = 'center';
      if (lay.row > 0 || Math.abs(lay.labelX - cx) > 1) {
        ctx.strokeStyle = isThis ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(cx, baselineY + 1);
        ctx.lineTo(lay.labelX, labelTopY - 9);
        ctx.stroke();
      }
      ctx.font = `${isThis ? 'bold ' : ''}11px 'Space Mono', monospace`;
      ctx.fillStyle = isThis ? '#fff' : 'rgba(255,255,255,0.85)';
      ctx.fillText(lay.nameLabel, lay.labelX, labelTopY);
      ctx.font = "11px 'Space Mono', monospace";
      ctx.fillStyle = isThis ? s.col : 'rgba(255,255,255,0.6)';
      ctx.fillText(lay.kmLabel, lay.labelX, labelTopY + 13);
    }

    // Baseline tick (subtle horizontal line under all planets).
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padX, baselineY + 0.5);
    ctx.lineTo(cssW - padX, baselineY + 0.5);
    ctx.stroke();

    // Source / scale note at the bottom.
    ctx.font = "11px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(m.sizes_source(), 12, cssH - 8);
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
