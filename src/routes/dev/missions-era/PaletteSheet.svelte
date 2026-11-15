<script lang="ts">
  import { agencyColor } from '$lib/agencies';
  import { agencyRingColor } from '$lib/surface-map/nation-palette';
  import { readableTextOn } from '$lib/readable-text';
  import {
    CARD_BG,
    PAGE_BG,
    PROPOSED_PALETTE,
    agencyCounts,
    contrast,
    filterOrder,
    hueOf,
    isCyanTeal,
    minPairDelta,
    simulate,
    type Cvd,
    type MissionLite,
  } from './proto';

  let { missions }: { missions: MissionLite[] } = $props();

  const counts = $derived(agencyCounts(missions));
  const names = $derived(filterOrder([...counts.keys()]));
  const kinds: Cvd[] = ['normal', 'protan', 'deutan', 'tritan'];
  const fmt = (n: number) => n.toFixed(2);
  const pass = (n: number, floor: number) => (n >= floor ? 'ok' : 'fail');

  const pairs = $derived.by(() => {
    const out: { a: string; b: string; de: number; kind: Cvd }[] = [];
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) {
        const r = minPairDelta(PROPOSED_PALETTE[names[i]], PROPOSED_PALETTE[names[j]]);
        out.push({ a: names[i], b: names[j], de: r.de, kind: r.kind });
      }
    return out.sort((x, y) => x.de - y.de);
  });
  const adjacent = $derived(
    names.slice(0, -1).map((n, i) => {
      const r = minPairDelta(PROPOSED_PALETTE[n], PROPOSED_PALETTE[names[i + 1]]);
      return { a: n, b: names[i + 1], de: r.de, kind: r.kind };
    }),
  );
</script>

<section class="sheet" data-sheet="palette">
  <h2>Agency palette (proposed) — {names.length} agencies on /missions</h2>
  <p class="note">
    Floors: 4.5:1 on the page ({PAGE_BG}) and on the card ({CARD_BG}); delta-E 2000 above 2.3 is a
    visible difference, above about 10 is easy to tell apart; cyan/teal (hue 160 to 200) excluded.
  </p>
  <table>
    <thead>
      <tr>
        <th>Agency</th><th>n</th><th>Proposed</th><th>Badge</th><th>Dot</th>
        <th>vs page</th><th>vs card</th><th>hue</th>
        {#each kinds as k (k)}<th>{k}</th>{/each}
        <th>Brand today</th><th>vs page</th><th>Chip today</th><th>vs page</th>
      </tr>
    </thead>
    <tbody>
      {#each names as n (n)}
        {@const c = PROPOSED_PALETTE[n]}
        {@const brand = agencyColor(n)}
        {@const chip = agencyRingColor(n)}
        <tr>
          <td class="nm">{n}</td>
          <td>{counts.get(n)}</td>
          <td class="mono">{c}</td>
          <td
            ><span class="badge" style:background={c} style:color={readableTextOn(c)}>{n}</span></td
          >
          <td><i class="dot" style:background={c}></i></td>
          <td class={pass(contrast(c, PAGE_BG), 4.5)}>{fmt(contrast(c, PAGE_BG))}</td>
          <td class={pass(contrast(c, CARD_BG), 4.5)}>{fmt(contrast(c, CARD_BG))}</td>
          <td class={isCyanTeal(c) ? 'fail' : 'ok'}>{hueOf(c)}</td>
          {#each kinds as k (k)}
            <td><i class="sw" style:background={simulate(c, k)}></i></td>
          {/each}
          <td class="mono">{brand ?? '-'}</td>
          <td class={brand ? pass(contrast(brand, PAGE_BG), 3) : ''}
            >{brand ? fmt(contrast(brand, PAGE_BG)) : '-'}</td
          >
          <td class="mono">{chip.startsWith('#') ? chip : 'grey'}</td>
          <td class={chip.startsWith('#') ? pass(contrast(chip, PAGE_BG), 3) : ''}
            >{chip.startsWith('#') ? fmt(contrast(chip, PAGE_BG)) : '-'}</td
          >
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="two">
    <div>
      <h3>Neighbours in the filter row (delta-E, worst vision)</h3>
      <ul class="pairs">
        {#each adjacent as p (p.a + p.b)}
          <li>
            <i class="dot" style:background={PROPOSED_PALETTE[p.a]}></i><i
              class="dot"
              style:background={PROPOSED_PALETTE[p.b]}
            ></i>
            {p.a} / {p.b}:
            <b class={p.de >= 10 ? 'ok' : p.de >= 6 ? 'warn' : 'fail'}>{p.de.toFixed(1)}</b>
            ({p.kind})
          </li>
        {/each}
      </ul>
    </div>
    <div>
      <h3>Ten closest pairs of all {(names.length * (names.length - 1)) / 2}</h3>
      <ul class="pairs">
        {#each pairs.slice(0, 10) as p (p.a + p.b)}
          <li>
            <i class="dot" style:background={PROPOSED_PALETTE[p.a]}></i><i
              class="dot"
              style:background={PROPOSED_PALETTE[p.b]}
            ></i>
            {p.a} / {p.b}:
            <b class={p.de >= 10 ? 'ok' : p.de >= 6 ? 'warn' : 'fail'}>{p.de.toFixed(1)}</b>
            ({p.kind})
          </li>
        {/each}
      </ul>
    </div>
  </div>
  <h3>On the card surface (accent bar + badge, as on a mission card)</h3>
  <div class="cards">
    {#each names as n (n)}
      {@const c = PROPOSED_PALETTE[n]}
      <div class="mini" style:--accent={c}>
        <b class="bar"></b>
        <span class="badge" style:background={c} style:color={readableTextOn(c)}>{n}</span>
      </div>
    {/each}
  </div>
</section>

<style>
  .sheet {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-text);
  }
  h2 {
    font-size: 14px;
    margin: 0 0 6px;
  }
  h3 {
    font-size: 12px;
    margin: 14px 0 6px;
  }
  .note {
    color: var(--color-text-dim);
    margin: 0 0 10px;
  }
  table {
    border-collapse: collapse;
    inline-size: 100%;
  }
  th,
  td {
    padding: 3px 6px;
    text-align: start;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    white-space: nowrap;
  }
  th {
    color: var(--color-text-dim);
    font-weight: 400;
  }
  .nm {
    font-weight: 700;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-weight: 700;
    text-shadow: none;
  }
  .dot {
    display: inline-block;
    inline-size: 10px;
    block-size: 10px;
    border-radius: 50%;
    margin-inline-end: 4px;
    vertical-align: middle;
  }
  .sw {
    display: inline-block;
    inline-size: 26px;
    block-size: 14px;
    border-radius: 2px;
  }
  .ok {
    color: #4ade80;
  }
  .warn {
    color: #ffc850;
  }
  .fail {
    color: #ff6b6b;
  }
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .pairs {
    list-style: none;
    margin: 0;
    padding: 0;
    line-height: 1.7;
  }
  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .mini {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px 8px 0;
    background: rgba(10, 10, 22, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 6px;
    overflow: hidden;
  }
  .bar {
    align-self: stretch;
    inline-size: 4px;
    background: var(--accent);
  }
  @media (max-width: 700px) {
    .two {
      grid-template-columns: 1fr;
    }
  }
</style>
