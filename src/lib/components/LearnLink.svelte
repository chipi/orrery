<!--
  LearnLink — wraps a single outbound LEARN-tab anchor with the rendering
  rules locked by ADR-051: rel="noopener noreferrer external", hreflang
  derived from the per-link provenance row, and a LinkCredit footer
  showing source · language · last-verified.

  Drop-in replacement for raw <a href>{label}</a> in panel + route LEARN
  sections. When the manifest is missing or the link isn't recorded
  (offline cache, dev hot-reload before fetch resolves), it gracefully
  renders a credit-less anchor with the safe rel attributes.
-->
<script lang="ts">
  import {
    getLinkProvenance,
    canonicaliseLinkUrl,
    type LinkProvenanceEntry,
  } from '$lib/link-provenance';
  import LinkCredit from './LinkCredit.svelte';

  type Props = {
    entityId: string;
    url: string;
    label: string;
    /** Optional — caller can pass a pre-resolved entry to skip the lookup. */
    provenance?: LinkProvenanceEntry | null;
  };
  let { entityId, url, label, provenance: provenanceProp }: Props = $props();

  let resolved = $state<LinkProvenanceEntry | null>(null);

  $effect(() => {
    if (provenanceProp) {
      resolved = provenanceProp;
      return;
    }
    let cancelled = false;
    void getLinkProvenance(entityId, url).then((entry) => {
      if (!cancelled) resolved = entry;
    });
    return () => {
      cancelled = true;
    };
  });

  // Authoring URL may differ from the canonical manifest key (e.g.
  // `?utm_source=foo`). Render the canonical one to avoid sending
  // users through a tracker chain.
  let href = $derived(canonicaliseLinkUrl(url));
  let hreflang = $derived(
    resolved?.language && resolved.language !== '*' ? resolved.language : undefined,
  );
</script>

<a {href} target="_blank" rel="noopener noreferrer external" {hreflang}>{label} ↗</a>
{#if resolved}
  <LinkCredit link={resolved} />
{/if}

<style>
  a {
    color: var(--color-accent, #4466ff);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  a:hover,
  a:focus-visible {
    color: var(--color-teal, #4ecdc4);
  }
</style>
