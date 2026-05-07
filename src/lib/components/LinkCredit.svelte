<!--
  LinkCredit — small footer rendered under every outbound LEARN link.
  Reads the per-link provenance row (ADR-051, Milestone L-B) and renders
  source name · language · last-verified date.

  Designed as a drop-in companion to <LearnLink/> but also usable on the
  /library bill-of-links page (Milestone L-D) where each row carries
  the same metadata.
-->
<script lang="ts">
  import { getSourceLogos, type SourceLogo } from '$lib/data';
  import { type LinkProvenanceEntry } from '$lib/link-provenance';
  import * as m from '$lib/paraglide/messages';

  type Props = { link: LinkProvenanceEntry };
  let { link }: Props = $props();

  let source = $state<SourceLogo | null>(null);

  $effect(() => {
    let cancelled = false;
    void getSourceLogos().then((mf) => {
      if (cancelled) return;
      source = mf.sources.find((s) => s.id === link.source_id) ?? null;
    });
    return () => {
      cancelled = true;
    };
  });

  // Localised language label. We render the BCP-47 tag inline (`en`,
  // `ru`, `zh`, `ja`, `hi`, `ar`, `*`) — it doubles as the `hreflang`
  // value on the anchor so screen readers and search engines see the
  // same signal. `*` is rendered as the multi-lingual indicator.
  let languageLabel = $derived.by(() => {
    if (link.language === '*') return m.link_credit_multi_lang();
    return link.language;
  });
</script>

<small class="link-credit" data-tier={link.tier} data-kind={link.kind}>
  <span class="src">
    {#if source}
      {source.name}
    {:else}
      {link.source_id}
    {/if}
  </span>
  <span class="sep" aria-hidden="true">·</span>
  <span class="lang" title={m.link_credit_language_title()}>{languageLabel}</span>
  <span class="sep" aria-hidden="true">·</span>
  <span class="verified" title={m.link_credit_verified_title()}>
    {m.link_credit_verified_on({ date: link.last_verified })}
  </span>
</small>

<style>
  .link-credit {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.4px;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 2px;
    line-height: 1.4;
  }
  .src {
    color: rgba(255, 255, 255, 0.7);
  }
  .lang {
    text-transform: uppercase;
  }
  .sep {
    opacity: 0.5;
  }
</style>
