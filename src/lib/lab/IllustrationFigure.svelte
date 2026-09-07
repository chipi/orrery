<!--
  The illustration register (G · #536 · T3) — the ONLY component that renders
  generated art, and it is structurally incapable of rendering kernel output:
  it takes a LabIllustration, not a FigureSpec, imports nothing from
  figure-style.ts, and mounts only in the Notebook's goal header (narrative
  chrome — never a card's figure slot). The badge is permanent and
  non-dismissable: generated art announces itself, which is exactly what makes
  the unbadged kernel figures trustworthy.
-->
<script lang="ts">
  import { assetUrl } from '$lib/asset-url';
  import type { LabIllustration } from './illustration';

  type Props = {
    illustration: LabIllustration;
    t: (key: string, params?: Record<string, string | number>) => string;
  };
  let { illustration, t }: Props = $props();
</script>

<figure class="illus">
  <img
    class="illus__img"
    src={assetUrl(`/${illustration.file}`)}
    alt={t(illustration.altKey)}
    loading="lazy"
    decoding="async"
  />
  <figcaption class="illus__caption">
    <span class="illus__badge">{t('lab.illustration.badge')}</span>
    <span class="illus__credit">
      {t('lab.illustration.credit', {
        date: illustration.generated,
      })}
    </span>
  </figcaption>
</figure>

<style>
  .illus {
    margin: 0 0 1rem;
    display: grid;
    gap: 0.35rem;
  }
  .illus__img {
    width: 100%;
    height: auto;
    border-radius: 10px;
    display: block;
  }
  .illus__caption {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
    font-size: 0.75rem;
    opacity: 0.75;
  }
  .illus__badge {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    border: 1px solid currentColor;
    border-radius: 999px;
    padding: 0.05rem 0.55rem;
    /* Dashed — visually rhymes with the fail-honest cards, never with the
       solid computed-register frames. */
    border-style: dashed;
  }
</style>
