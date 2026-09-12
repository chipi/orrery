<!--
  CardOverlay (#547 S1+S2) — modal presenting an entity's collectible card
  with BOTH share affordances:
    - Share link: the current URL (panels already sync their ?id= deep link)
    - Share card: the build-generated PNG (S2 generator) handed to the
      native share sheet where files are supported, downloaded otherwise.
      Probes the PNG on open; a 404 (entity newer than the last card
      build) hides the button rather than sharing a broken file.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { shareCurrent, sharePath } from '$lib/share';
  import { assetUrl } from '$lib/asset-url';
  import CollectibleCard from './CollectibleCard.svelte';
  import type { CardSpec } from './card-spec';

  type Props = { spec: CardSpec; open: boolean; onClose: () => void };
  let { spec, open, onClose }: Props = $props();

  let feedback = $state<'shared' | 'copied' | 'saved' | null>(null);
  let cardImageOk = $state(false);

  // Probe the generated PNG when the overlay opens (cheap HEAD).
  $effect(() => {
    cardImageOk = false;
    if (!open || !spec.imagePath) return;
    const url = assetUrl(spec.imagePath);
    void fetch(url, { method: 'HEAD' })
      .then((r) => (cardImageOk = r.ok))
      .catch(() => (cardImageOk = false));
  });

  function flash(kind: 'shared' | 'copied' | 'saved'): void {
    feedback = kind;
    setTimeout(() => (feedback = null), 2200);
  }

  async function shareLink(): Promise<void> {
    // Prefer the OG stub (recipients get the card unfurl); fall back to
    // the current URL for specs without one.
    const result = spec.shareHref
      ? await sharePath(spec.shareHref, spec.title)
      : await shareCurrent();
    if (result === 'shared' || result === 'copied') flash(result);
  }

  async function shareCard(): Promise<void> {
    if (!spec.imagePath) return;
    const url = assetUrl(spec.imagePath);
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File(
        [blob],
        `orrery-card-${spec.title.replace(/\s+/g, '-').toLowerCase()}.jpg`,
        {
          type: 'image/jpeg',
        },
      );
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: spec.title });
        flash('shared');
        return;
      }
      // Desktop fallback — download the PNG.
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
      flash('saved');
    } catch {
      /* share sheet dismissed or fetch failed — no feedback */
    }
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
  <div
    class="backdrop"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div class="sheet" role="dialog" aria-modal="true" aria-label={spec.title}>
      <CollectibleCard {spec} />
      <div class="actions">
        {#if cardImageOk}
          <button type="button" class="act primary" onclick={shareCard} data-testid="share-card">
            {feedback === 'saved' ? m.card_saved() : m.card_share_card()}
          </button>
        {/if}
        <button
          type="button"
          class="act"
          class:primary={!cardImageOk}
          onclick={shareLink}
          data-testid="share-card-link"
        >
          {feedback === 'copied' ? m.card_link_copied() : m.card_share_link()}
        </button>
        <button type="button" class="act" onclick={onClose}>{m.card_close()}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 220;
    display: grid;
    place-items: center;
    background: rgba(2, 2, 8, 0.82);
    backdrop-filter: blur(6px);
    padding: 20px;
  }
  .sheet {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    max-height: 100%;
    overflow-y: auto;
  }
  .actions {
    display: flex;
    gap: 10px;
  }
  .act {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 6px;
    padding: 9px 16px;
    cursor: pointer;
  }
  .act.primary {
    color: #04121a;
    background: #ffffff;
    border-color: #ffffff;
    font-weight: 700;
  }
  .act:hover:not(.primary) {
    border-color: rgba(255, 255, 255, 0.4);
  }
</style>
