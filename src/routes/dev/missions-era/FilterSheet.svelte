<!--
  The agency filter with colour dots: the row as it is today and three dot sources side by side,
  so the operator can pick (brief D11 a / b, and the proposed palette). The dot is drawn here
  inside the chip; the real build adds one `dotColor` prop to Chip.
-->
<script lang="ts">
  import { agencyColor, agencyFullName, agencyLogo } from '$lib/agencies';
  import { agencyRingColor } from '$lib/surface-map/nation-palette';
  import Chip from '$lib/components/Chip.svelte';
  import ChipGroup from '$lib/components/ChipGroup.svelte';
  import { PROPOSED_PALETTE, agencyCounts, filterOrder, type MissionLite } from './proto';

  let { missions }: { missions: MissionLite[] } = $props();
  const names = $derived(filterOrder([...agencyCounts(missions).keys()]));
  let picked = $state('NASA');

  const rows: { title: string; sub: string; colorOf: ((n: string) => string) | null }[] = [
    { title: 'Today', sub: 'logo only, no colour', colorOf: null },
    {
      title: 'D11a: the card colour (registry brand colour) as a 10 px dot with a light ring',
      sub: 'what the card badge shows today; 7 of the dots are dark on the page',
      colorOf: (n) => agencyColor(n) ?? '#888888',
    },
    {
      title: 'D11b: the chip colour (nationChipFor) as a dot',
      sub: 'readable everywhere, 6 distinct colours for 13 agencies, differs from the card',
      colorOf: (n) => agencyRingColor(n),
    },
    {
      title: 'Proposed palette as a dot (no ring needed, 4.5:1 or better)',
      sub: 'one colour per agency, the same on card badge, filter dot and strip dots',
      colorOf: (n) => PROPOSED_PALETTE[n] ?? '#888888',
    },
  ];
</script>

<section class="entity-browse-page sheet" data-sheet="filter">
  {#each rows as row (row.title)}
    <h3>{row.title}</h3>
    <p class="sub">{row.sub}</p>
    <div class="filters" style="margin-bottom: 18px; border: 0; padding: 0;">
      <ChipGroup role="radiogroup" label="Agency" class="filter-group">
        <span class="filter-label">AGENCY</span>
        <Chip kind="choice" active={picked === 'ALL'} onclick={() => (picked = 'ALL')}>ALL</Chip>
        {#each names as n (n)}
          {@const logo = agencyLogo(n)}
          {@const color = row.colorOf ? row.colorOf(n) : null}
          <Chip
            kind="choice"
            class="agency-chip"
            active={picked === n}
            aria-label={agencyFullName(n)}
            title={agencyFullName(n)}
            onclick={() => (picked = n)}
          >
            {#if color}<i
                class="agency-dot"
                class:ring={row.colorOf !== null && row.title.startsWith('D11')}
                style:background={color}
                aria-hidden="true"
              ></i>{/if}
            {#if logo}<img src={logo} alt="" class="agency-pill-logo" />{:else}<span>{n}</span>{/if}
          </Chip>
        {/each}
      </ChipGroup>
    </div>
  {/each}
</section>

<style>
  .sheet {
    font-family: var(--font-mono);
    color: var(--color-text);
  }
  h3 {
    font-size: 12px;
    margin: 0;
  }
  .sub {
    font-size: 11px;
    color: var(--color-text-dim);
    margin: 2px 0 8px;
  }
  .agency-dot {
    display: inline-block;
    flex: none;
    inline-size: 10px;
    block-size: 10px;
    border-radius: 50%;
  }
  .agency-dot.ring {
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
  }
</style>
