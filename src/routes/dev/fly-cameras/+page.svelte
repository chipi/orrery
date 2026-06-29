<!--
  /fly montage camera audit — dev-only.
  Visit localhost:5373/dev/fly-cameras. Runs EVERY heliocentric
  flyby/arrival mission through the montage shot rigs (establish /
  approach / hero / depart) at each event and shows a per-shot verdict:
  is each shot's frame composed correctly (hero = iconic; the wide/moving
  shots = both actors framed, ship un-occluded)?

  Data source: static/data/fly-camera-audit.json (regenerate with
  `npm run audit:fly-cameras`). Read-only — no API; the script is the
  single source of truth so dashboard + scene + script can't drift.

  Reason legend: ship-on-disc (buried), ship-behind-planet (occluded),
  ship-out-of-frame, planet-too-small (inherent for sub-km bodies),
  body-too-tiny, no-plan (event past the modeled arc), n/a (depart on an
  arrival — the ship doesn't leave).
-->
<script lang="ts">
  import type { PageData } from './$types';

  const SHOTS = ['establish', 'approach', 'hero', 'depart'] as const;
  type Row = {
    id: string;
    dest: string;
    eventType: string;
    label: string;
    metDays: number;
    planetId: string;
    shots: Record<string, string>;
    heroOk: boolean;
    montageClean: boolean;
    error?: string;
  };

  let { data }: { data: PageData } = $props();
  const audit = $derived(
    data.audit as {
      totals: { events: number; heroIconic: number; montageClean: number };
      results: Row[];
      generatedNote?: string;
    },
  );

  // Filters
  let filter = $state<'all' | 'issues' | 'arrivals' | 'flybys'>('all');
  let query = $state('');

  const filtered = $derived(
    audit.results.filter((r) => {
      if (query && !`${r.id} ${r.planetId} ${r.label}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      switch (filter) {
        case 'issues':
          return !r.montageClean;
        case 'arrivals':
          return r.eventType === 'edl_or_oi' || r.eventType === 'arrival';
        case 'flybys':
          return r.eventType === 'flyby';
        default:
          return true;
      }
    }),
  );

  function shotClass(reason: string) {
    if (reason === 'ok') return 'ok';
    if (reason === 'n/a') return 'na';
    return 'bad';
  }
</script>

<div class="dash">
  <header>
    <h1>/fly iconic-camera audit</h1>
    <p class="note">
      {audit.generatedNote ?? ''} · regenerate with <code>npm run audit:fly-cameras</code>
    </p>
  </header>

  {#if audit.totals}
    <div class="totals">
      <div class="stat"><span>{audit.totals.events}</span>flyby/arrival events</div>
      <div class="stat good"><span>{audit.totals.heroIconic}</span>hero iconic</div>
      <div class="stat good"><span>{audit.totals.montageClean}</span>montage clean (all shots)</div>
    </div>
  {/if}

  <div class="controls">
    {#each ['all', 'issues', 'arrivals', 'flybys'] as f}
      <button class:active={filter === f} onclick={() => (filter = f as typeof filter)}>{f}</button>
    {/each}
    <input type="search" placeholder="filter by mission / planet / label" bind:value={query} />
    <span class="count">{filtered.length} shown</span>
  </div>
  <p class="legend">
    Per-shot montage verdict. <b>establish · approach · hero · depart</b> — green = framed (hero =
    iconic), red = reason, grey = n/a. <code>no-plan</code> = event past the modeled arc.
  </p>

  <table>
    <thead>
      <tr>
        <th>mission</th>
        <th>event</th>
        <th>body</th>
        <th>MET</th>
        <th>establish</th>
        <th>approach</th>
        <th>hero</th>
        <th>depart</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each filtered as r}
        <tr class:row-clean={r.montageClean}>
          <td class="mono">{r.id}</td>
          <td class="dim">{r.eventType}</td>
          <td class="mono">{r.planetId}</td>
          <td class="dim">{r.metDays?.toFixed?.(0)}</td>
          {#each SHOTS as s}
            <td class={shotClass(r.shots?.[s] ?? '?')}>
              {r.shots?.[s] === 'ok' ? '✓' : (r.shots?.[s] ?? '?')}
            </td>
          {/each}
          <td class="tag">
            {#if r.montageClean}<span class="badge fix">CLEAN</span>{/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .dash {
    font-family: system-ui, sans-serif;
    color: #dde6f5;
    background: #06070f;
    min-height: 100vh;
    padding: 24px;
  }
  header h1 {
    font-size: 18px;
    margin: 0 0 4px;
    letter-spacing: 1px;
  }
  .note {
    font-size: 11px;
    color: #7a8aa5;
    margin: 0 0 16px;
  }
  code {
    color: #5eead4;
    background: rgba(94, 234, 212, 0.1);
    padding: 1px 5px;
    border-radius: 3px;
  }
  .totals {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .stat {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9fb0cc;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .stat span {
    font-size: 22px;
    font-weight: 700;
    color: #dde6f5;
  }
  .stat.good span {
    color: #4ecdc4;
  }
  .controls {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .controls button {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #9fb0cc;
    border-radius: 5px;
    padding: 4px 10px;
    font-size: 11px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .controls button.active {
    background: rgba(94, 234, 212, 0.18);
    border-color: #5eead4;
    color: #5eead4;
  }
  .controls input {
    flex: 1;
    min-width: 200px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(94, 234, 212, 0.3);
    color: #dde6f5;
    padding: 4px 8px;
    border-radius: 5px;
    font-size: 12px;
  }
  .count {
    font-size: 11px;
    color: #7a8aa5;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    text-align: left;
    padding: 6px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    color: #7a8aa5;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  td {
    padding: 5px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .mono {
    font-family: ui-monospace, monospace;
  }
  .dim {
    color: #7a8aa5;
  }
  .ok {
    color: #4ecdc4;
  }
  .bad {
    color: #ff9a9a;
    font-family: ui-monospace, monospace;
    font-size: 11px;
  }
  .na {
    color: #5b6680;
    font-family: ui-monospace, monospace;
    font-size: 11px;
  }
  .legend {
    font-size: 11px;
    color: #9fb0cc;
    margin: 0 0 12px;
  }
  .legend code {
    font-size: 11px;
  }
  .row-clean {
    background: rgba(78, 205, 196, 0.05);
  }
  .badge {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    letter-spacing: 1px;
  }
  .badge.fix {
    background: rgba(78, 205, 196, 0.2);
    color: #4ecdc4;
  }
</style>
