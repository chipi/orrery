<!--
  AgencyFilterRow — the agency chips of /missions and /fleet (UXD-048): one choice chip per
  agency with its data dot, its short name as text and its count. The accessible name is the full
  name and the count. A logo is not drawn because several are dark on the dark chip. One row for
  both pages, always visible under the era strip. A long list (/fleet has 40 agencies) shows the
  `limit` agencies with the most records, the chosen one always, and "Show all <n>" for the rest.
-->
<script lang="ts">
  import { agencyDataColor, agencyFullName } from '$lib/agencies';
  import * as m from '$lib/paraglide/messages';
  import Chip from './Chip.svelte';
  import ChipGroup from './ChipGroup.svelte';

  interface Props {
    agencies: { name: string; count: number }[];
    value: string;
    onSelect: (v: string) => void;
    label: string;
    allLabel: string;
    limit?: number;
  }
  let { agencies, value, onSelect, label, allLabel, limit = 14 }: Props = $props();

  let expanded = $state(false);
  const shown = $derived.by(() => {
    if (expanded || agencies.length <= limit) return agencies;
    const top = new Set(
      [...agencies]
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, limit)
        .map((a) => a.name),
    );
    top.add(value);
    return agencies.filter((a) => top.has(a.name));
  });
</script>

<ChipGroup role="radiogroup" {label} class="filter-group agency-filter">
  <span class="filter-label">{label}</span>
  <Chip kind="choice" active={value === 'ALL'} onclick={() => onSelect('ALL')}>{allLabel}</Chip>
  {#each shown as a, ki (ki + ':' + a.name)}
    {@const full = agencyFullName(a.name)}
    <Chip
      kind="choice"
      class="agency-chip"
      dotColor={agencyDataColor(a.name) ?? undefined}
      count={a.count}
      active={value === a.name}
      aria-label={`${full}, ${a.count}`}
      title={full}
      onclick={() => onSelect(a.name)}><span class="agency-name">{a.name}</span></Chip
    >
  {/each}
  {#if shown.length < agencies.length}
    <Chip kind="action" quiet onclick={() => (expanded = true)}
      >{m.colophon_show_all({ count: agencies.length })}</Chip
    >
  {:else if expanded && agencies.length > limit}
    <Chip kind="action" quiet onclick={() => (expanded = false)}>{m.browse_show_fewer()}</Chip>
  {/if}
</ChipGroup>

<style>
  .agency-name {
    max-inline-size: 22ch;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
