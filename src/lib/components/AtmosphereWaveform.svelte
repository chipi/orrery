<script lang="ts">
  /**
   * "The atmosphere's voice" (diagram A of #385).
   *
   * A Siri-style mirrored bloom coloured from the body's chip tint (Mars
   * reds / Earth blues / Moon silver). Tap it to PLAY the real sound of
   * that world's atmosphere — the bloom is then driven by the actual
   * audio spectrum via Web Audio (AnalyserNode), so the shape IS the
   * signal. Idle (not playing) it drifts on a synthetic envelope so the
   * tile always reads as live.
   *
   * Audio is real + provenance-tracked (static/data/audio-source-provenance.json):
   *   Mars  — Perseverance SuperCam mic, Martian wind (NASA/JPL-Caltech, PD)
   *   Earth — pine-forest wind (W.carter, CC BY-SA 4.0)
   *   Moon  — silence (vacuum): flat line, nothing to play.
   *
   * Playback starts only on a user gesture (autoplay-safe). Honours
   * prefers-reduced-motion (static frame; audio still playable on tap).
   *
   * a11y follow-up (#385): the parent .tactical-scan is aria-hidden
   * (decorative HUD), so this control isn't exposed to AT yet — the
   * audio button should move out of the hidden HUD or the HUD be exposed.
   */
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { BODY_PALETTE } from '$lib/planet-stats';
  import * as m from '$lib/paraglide/messages';

  let { bodyKey }: { bodyKey: string } = $props();

  interface Acoustic {
    amp: number;
    rolloff: number;
    noise: number;
    caption: () => string;
    src: string | null;
  }
  const ACOUSTIC: Record<string, Acoustic> = {
    earth: {
      amp: 1.0,
      rolloff: 0.15,
      noise: 0.2,
      caption: () => m.wave_caption_earth(),
      src: 'audio/atmosphere/earth-wind.mp3',
    },
    mars: {
      amp: 0.55,
      rolloff: 0.78,
      noise: 0.14,
      caption: () => m.wave_caption_mars(),
      src: 'audio/atmosphere/mars-wind.mp3',
    },
    moon: { amp: 0, rolloff: 1, noise: 0, caption: () => m.wave_caption_moon(), src: null },
  };
  const profile = $derived(ACOUSTIC[bodyKey] ?? null);
  let canvas = $state<HTMLCanvasElement | null>(null);
  let playing = $state(false);
  let loading = $state(false);
  // Assigned in onMount; the template button calls it.
  let toggle: () => void = () => {};

  onMount(() => {
    if (!canvas || !profile) return;
    const el = canvas;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    const p = profile;
    const pal = BODY_PALETTE[bodyKey] ?? BODY_PALETTE.earth;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const glow = (a: number) => `rgba(${pal.glowRGB},${a})`;
    const win = (x: number) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, x))), 0.55);

    // ── Web Audio ────────────────────────────────────────────────
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let freq: Uint8Array | null = null;
    let buffer: AudioBuffer | null = null;
    let sourceNode: AudioBufferSourceNode | null = null;

    const stop = () => {
      try {
        sourceNode?.stop();
      } catch {
        /* already stopped */
      }
      sourceNode = null;
      playing = false;
    };

    toggle = async () => {
      if (!p.src) return; // Moon — silence, nothing to play
      if (playing) return stop();
      try {
        if (!audioCtx) {
          audioCtx = new AudioContext();
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.75;
          analyser.connect(audioCtx.destination);
          freq = new Uint8Array(analyser.frequencyBinCount);
        }
        await audioCtx.resume();
        if (!buffer) {
          loading = true;
          const res = await fetch(`${base}/${p.src}`);
          buffer = await audioCtx.decodeAudioData(await res.arrayBuffer());
          loading = false;
        }
        sourceNode = audioCtx.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.connect(analyser!);
        sourceNode.onended = () => {
          playing = false;
          sourceNode = null;
        };
        sourceNode.start();
        playing = true;
      } catch {
        loading = false;
        playing = false;
      }
    };

    const dims = () => {
      const w = el.clientWidth || 300;
      const h = el.clientHeight || 74;
      return { w, h, mid: h / 2, maxA: (h / 2) * 0.9 };
    };
    const sizeToParent = () => {
      const dpr = window.devicePixelRatio || 1;
      const { w, h } = dims();
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeToParent();
    const ro = new ResizeObserver(sizeToParent);
    ro.observe(el);

    // Envelope at x: real audio spectrum when playing, else synthetic.
    const envAt = (x: number, t: number, fx: number, sp: number, ph: number): number => {
      if (playing && freq && freq.length) {
        const i = Math.min(freq.length - 1, Math.floor(x * freq.length));
        return 0.12 + 0.95 * (freq[i] / 255);
      }
      return 0.55 + 0.45 * Math.sin(t * sp + x * fx * Math.PI * 2 + ph) * Math.sin(t * 0.7 + x * 3);
    };

    const drawFlat = () => {
      const { w, h, mid } = dims();
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.shadowColor = glow(0.8);
      ctx.shadowBlur = 8;
      ctx.strokeStyle = pal.core;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(3, mid);
      ctx.lineTo(w - 3, mid);
      ctx.stroke();
      ctx.restore();
    };

    const drawSiri = (t: number) => {
      const { w, h, mid, maxA } = dims();
      ctx.clearRect(0, 0, w, h);
      if (playing && analyser && freq) analyser.getByteFrequencyData(freq);
      const layers = [
        { hue: pal.deep, a: 0.22, sc: 1.0, fx: 2.1, sp: 1.1, ph: 0 },
        { hue: pal.mid, a: 0.28, sc: 0.78, fx: 3.3, sp: 1.7, ph: 1.7 },
        { hue: pal.bright, a: 0.34, sc: 0.55, fx: 4.9, sp: 2.3, ph: 3.1 },
      ];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const L of layers) {
        const top: Array<[number, number]> = [];
        for (let px = 0; px <= w; px += 3) {
          const x = px / w;
          const a = maxA * L.sc * p.amp * win(x) * Math.max(0, envAt(x, t, L.fx, L.sp, L.ph));
          top.push([px, mid - a]);
        }
        ctx.beginPath();
        top.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        for (let i = top.length - 1; i >= 0; i--) ctx.lineTo(top[i][0], mid + (mid - top[i][1]));
        ctx.closePath();
        ctx.fillStyle = L.hue;
        ctx.globalAlpha = L.a;
        ctx.fill();
      }
      ctx.restore();
      // Bright core line.
      ctx.save();
      ctx.shadowColor = glow(0.9);
      ctx.shadowBlur = 8;
      ctx.strokeStyle = pal.core;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      for (let px = 0; px <= w; px += 3) {
        const x = px / w;
        const base = playing ? envAt(x, t, 0, 0, 0) : 0.6 + 0.4 * Math.sin(t * 2.2 + x * 9);
        const a = 0.5 * maxA * p.amp * win(x) * base;
        if (px === 0) ctx.moveTo(px, mid - a);
        else ctx.lineTo(px, mid - a);
      }
      ctx.stroke();
      ctx.restore();
    };

    const render = (t: number) => (p.amp === 0 ? drawFlat() : drawSiri(t));

    let raf = 0;
    let disposed = false;
    if (reduce && !playing) {
      render(0.9);
      // Still animate while playing even under reduced-motion? No — respect
      // the pref; a paused static frame is the idle. Re-render on play via
      // a lightweight loop only while playing.
      const loopReduced = () => {
        if (disposed) return;
        if (playing) render(performance.now() / 1000);
        raf = requestAnimationFrame(loopReduced);
      };
      raf = requestAnimationFrame(loopReduced);
    } else {
      const start = performance.now();
      const loop = () => {
        if (disposed) return;
        render((performance.now() - start) / 1000);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      stop();
      audioCtx?.close().catch(() => {});
    };
  });
</script>

{#if profile}
  <div
    class="wave-tile"
    class:silent={!profile.src}
    role="button"
    tabindex="0"
    aria-label={profile.src ? m.wave_aria_play() : m.wave_aria_silent()}
    onclick={() => toggle()}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    }}
  >
    <canvas bind:this={canvas} class="wave-canvas"></canvas>
    <div class="wave-caption">
      <span class="wave-cue" aria-hidden="true">
        {#if !profile.src}◎{:else if loading}···{:else if playing}⏸{:else}▶{/if}
      </span>
      {profile.caption()}
      {#if profile.src}<span class="wave-hint"
          >· {playing ? m.wave_hint_playing() : m.wave_hint_tap()}</span
        >{/if}
    </div>
  </div>
{/if}

<style>
  .wave-tile {
    position: relative;
    display: block;
    width: 100%;
    margin: 2px 0 8px;
    padding: 3px;
    background: rgba(4, 8, 14, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    /* Parent .tactical-scan is pointer-events:none — re-enable here so
       the tile is tappable. */
    pointer-events: auto;
    cursor: pointer;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .wave-tile.silent {
    cursor: default;
  }
  .wave-tile:focus-visible {
    outline: 1px solid rgba(255, 255, 255, 0.6);
    outline-offset: 1px;
  }
  .wave-tile::before,
  .wave-tile::after {
    content: '';
    position: absolute;
    width: 7px;
    height: 7px;
    border: 1px solid rgba(255, 255, 255, 0.4);
    pointer-events: none;
  }
  .wave-tile::before {
    top: -1px;
    left: -1px;
    border-right: 0;
    border-bottom: 0;
  }
  .wave-tile::after {
    bottom: -1px;
    right: -1px;
    border-left: 0;
    border-top: 0;
  }
  .wave-canvas {
    display: block;
    width: 100%;
    height: 74px;
  }
  .wave-caption {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.55);
    text-align: center;
    margin-top: 3px;
  }
  .wave-cue {
    color: rgba(255, 255, 255, 0.8);
    margin-right: 4px;
  }
  .wave-hint {
    color: rgba(255, 255, 255, 0.38);
  }
</style>
