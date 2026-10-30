<script lang="ts">
  import { anonColorLabel } from '$lib/explore/format';
  import * as m from '$lib/paraglide/messages';
  import type { AnonymousStar } from '$lib/universe/anonymous-star';

  let { star, onDismiss }: { star: AnonymousStar; onDismiss: () => void } = $props();
</script>

<div class="anon-star" role="status">
  <span class="anon-title">{m.explore_anon_unnamed()}</span>
  <span class="anon-facts">
    {star.distLy.toLocaleString(undefined, { maximumFractionDigits: 1 })} ly · mag {star.mag.toFixed(
      1,
    )} · {anonColorLabel(star.colorName)} (~{star.kelvin.toLocaleString()} K)
  </span>
  <button type="button" class="anon-close" aria-label={m.explore_anon_dismiss()} onclick={onDismiss}
    >×</button
  >
</div>

<style>
  /* v2 anonymous-star tag — top-centre, dismissible. */
  .anon-star {
    position: absolute;
    top: 64px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: min(92vw, 420px);
    padding: 8px 10px 8px 12px;
    background: rgba(6, 10, 22, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    backdrop-filter: blur(5px);
    font-family: var(--font-mono, 'Space Mono', monospace);
    color: #dde4ff;
  }
  .anon-title {
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
    flex: 0 0 auto;
  }
  .anon-facts {
    font-size: 12px;
    color: #eaf6ff;
    min-width: 0;
  }
  .anon-close {
    flex: 0 0 auto;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 4px;
    min-height: 28px;
  }
  .anon-close:hover {
    color: #fff;
  }
</style>
