<!--
  StarPortrait — a live, color-accurate "portrait" of a star for the StarPanel
  hero (/explore v2 Slice 1). Drawn from catalogued values: colour from B−V, size
  + diffraction spikes from spectral luminosity class. A representation of a point
  source, not a photograph — the panel captions it as such. No fetched assets.
-->
<script lang="ts">
  import { bvToRgb } from '$lib/universe/bv-to-rgb';
  import { portraitParams } from '$lib/universe/star-portrait';

  type Props = { bv: number | null; spect: string | null; absmag: number };
  let { bv, spect, absmag }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  const SIZE = 360;

  const rgb = (a: number): string => {
    const [r, g, b] = bv !== null ? bvToRgb(bv) : [1, 1, 1];
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  };

  function draw() {
    const cv = canvas;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const { coreScale, coronaScale, spikeStrength } = portraitParams(spect, absmag);
    const c = SIZE / 2;
    const half = SIZE / 2;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#04060d';
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.globalCompositeOperation = 'lighter';

    // Corona / glow.
    const corona = ctx.createRadialGradient(c, c, 0, c, c, coronaScale * half);
    corona.addColorStop(0, rgb(0.45));
    corona.addColorStop(0.35, rgb(0.16));
    corona.addColorStop(1, rgb(0));
    ctx.fillStyle = corona;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Diffraction spikes — thin bright rays, scaled by brightness.
    if (spikeStrength > 0.05) {
      const len = coronaScale * half * 1.5;
      const a = 0.5 * spikeStrength;
      for (const ang of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        const grad = ctx.createLinearGradient(
          c - dx * len,
          c - dy * len,
          c + dx * len,
          c + dy * len,
        );
        grad.addColorStop(0, rgb(0));
        grad.addColorStop(0.5, `rgba(255,255,255,${a})`);
        grad.addColorStop(1, rgb(0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = ang % (Math.PI / 2) === 0 ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(c - dx * len, c - dy * len);
        ctx.lineTo(c + dx * len, c + dy * len);
        ctx.stroke();
      }
    }

    // Bright core — white-hot centre fading to the star's colour.
    const core = ctx.createRadialGradient(c, c, 0, c, c, coreScale * half);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.45, rgb(0.95));
    core.addColorStop(1, rgb(0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(c, c, coreScale * half, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
  }

  $effect(() => {
    // Re-read props so the portrait redraws when the selected star changes.
    void bv;
    void spect;
    void absmag;
    draw();
  });
</script>

<canvas bind:this={canvas} width={SIZE} height={SIZE} class="star-portrait" aria-hidden="true"
></canvas>

<style>
  .star-portrait {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    border-radius: 4px;
    background: #04060d;
  }
</style>
