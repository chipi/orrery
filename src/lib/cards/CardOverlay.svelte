<!--
  CardOverlay (#547 S1) — modal presenting an entity's collectible card
  with the share affordance. Shares the CURRENT url (panels already sync
  their ?id= deep link), so the link IS the card's address. PNG export is
  Slice 2; this overlay is the render + URL-share surface.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { shareCurrent } from '$lib/share';
  import CollectibleCard from './CollectibleCard.svelte';
  import type { CardSpec } from './card-spec';

  type Props = { spec: CardSpec; open: boolean; onClose: () => void };
  let { spec, open, onClose }: Props = $props();

  let feedback = $state<'shared' | 'copied' | null>(null);

  async function share(): Promise<void> {
    const result = await shareCurrent();
    if (result === 'shared' || result === 'copied') {
      feedback = result;
      setTimeout(() => (feedback = null), 2200);
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
        <button type="button" class="act primary" onclick={share}>
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
