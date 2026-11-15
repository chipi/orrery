<!--
  EntityList — the compact row view of /missions and /fleet (UXD-048, the grid's List view). One
  row per record: name, kind, agencies, year, status. A page maps its records to rows; the status
  class is the same vocabulary as the card's pill. Rows are buttons that open the detail panel.
-->
<script lang="ts">
  interface Row {
    id: string;
    name: string;
    kind: string;
    agency: string;
    year: string | number;
    status: string;
    statusLabel: string;
  }
  interface Props {
    rows: Row[];
    label: string;
    onOpen: (id: string) => void;
  }
  let { rows, label, onOpen }: Props = $props();
</script>

<ul class="entity-list" aria-label={label} data-testid="entity-list">
  {#each rows as r (r.id)}
    <li>
      <button
        type="button"
        class="list-row"
        data-testid="list-row-{r.id}"
        onclick={() => onOpen(r.id)}
      >
        <span class="list-name">{r.name}</span>
        <span class="list-cat">{r.kind}</span>
        <span class="list-agency">{r.agency}</span>
        <span class="list-year">{r.year}</span>
        <span class="list-status status-{r.status.toLowerCase()}">{r.statusLabel}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .entity-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .entity-list > li {
    content-visibility: auto;
    contain-intrinsic-size: auto 50px;
  }
  .list-row {
    width: 100%;
    background: transparent;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: inherit;
    text-align: start;
    padding: 8px 12px;
    min-block-size: 44px;
    cursor: pointer;
    display: grid;
    grid-template-columns: 2fr 1fr 1.2fr 0.6fr 0.7fr;
    align-items: center;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 11.5px;
  }
  .list-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }
  .list-row:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }
  .list-name {
    color: #fff;
    font-weight: 600;
  }
  .list-cat,
  .list-agency,
  .list-year {
    color: rgba(255, 255, 255, 0.7);
  }
  .list-status {
    text-transform: uppercase;
    font-size: var(--size-label);
    letter-spacing: 0.06em;
    padding: 1px 6px;
    border-radius: 3px;
    text-align: center;
  }
  .list-status.status-active {
    background: rgba(136, 159, 231, 0.18);
    color: #889fe7;
  }
  .list-status.status-flown {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    color: var(--color-state);
  }
  .list-status.status-retired {
    background: rgba(255, 200, 80, 0.18);
    color: #ffc850;
  }
  .list-status.status-failed,
  .list-status.status-lost {
    background: rgba(193, 68, 14, 0.22);
    color: #ff6b3a;
  }
  .list-status.status-planned,
  .list-status.status-cancelled {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.78);
  }
  @media (max-width: 600px) {
    .list-row {
      grid-template-columns: 2fr 1fr 0.6fr;
      grid-template-areas:
        'name name year'
        'cat agency status';
    }
    .list-name {
      grid-area: name;
    }
    .list-year {
      grid-area: year;
      text-align: end;
    }
    .list-cat {
      grid-area: cat;
    }
    .list-agency {
      grid-area: agency;
    }
    .list-status {
      grid-area: status;
    }
  }
</style>
