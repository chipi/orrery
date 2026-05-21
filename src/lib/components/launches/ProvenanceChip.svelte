<script lang="ts">
  /**
   * Per-row provenance chip — reveals the full provenance_chain on
   * hover (desktop) / tap (mobile). PRD-020 US-9 / RFC-023 §9.
   */

  import * as m from '$lib/paraglide/messages';
  import type { ProvenanceLink } from '$lib/launches/manifest.js';

  let { chain }: { chain: ProvenanceLink[] } = $props();
  let open = $state(false);

  function roleLabel(role: ProvenanceLink['role']): string {
    switch (role) {
      case 'primary':
        return m.launches_provenance_role_primary();
      case 'fallback-primary':
        return m.launches_provenance_role_fallback_primary();
      case 'confirmed-via':
        return m.launches_provenance_role_confirmed_via();
      case 'augmented-with':
        return m.launches_provenance_role_augmented_with();
    }
  }
</script>

<button
  type="button"
  class="provenance-chip"
  onclick={() => (open = !open)}
  aria-expanded={open}
  aria-label={m.launches_meta_view_provenance()}
>
  {m.launches_provenance_chip_via({ source: chain[0]?.source ?? 'unknown' })}
</button>

{#if open}
  <ul class="chain" role="list">
    {#each chain as link (link.source)}
      <li class="chain-link" data-role={link.role}>
        <span class="role">{roleLabel(link.role)}</span>
        {#if link.source_url}
          <a href={link.source_url} rel="noopener noreferrer external">{link.source}</a>
        {:else}
          <span class="source">{link.source}</span>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .provenance-chip {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    padding: 2px 6px;
    color: rgba(230, 232, 238, 0.6);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    min-height: 22px;
  }

  .provenance-chip:hover,
  .provenance-chip:focus-visible {
    color: #e6e8ee;
    border-color: rgba(255, 255, 255, 0.3);
    outline: none;
  }

  .chain {
    margin: 6px 0 0;
    padding: 8px 10px;
    background: rgba(4, 4, 12, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    list-style: none;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(230, 232, 238, 0.8);
  }

  .chain-link {
    display: flex;
    gap: 8px;
    align-items: baseline;
    padding: 2px 0;
  }

  .role {
    color: #ffc850;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-width: 80px;
  }

  .chain-link a {
    color: #4ecdc4;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
