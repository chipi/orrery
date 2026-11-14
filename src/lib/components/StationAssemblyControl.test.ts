import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import StationAssemblyControl from './StationAssemblyControl.svelte';
import { ISS_DOCK_EVENTS, ISS_TRUSS_PHASES } from '../iss-assembly-phases';
import { TIANGONG_DOCK_EVENTS } from '../tiangong-assembly-phases';

const noop = () => {};
type Chip = { name: string; launcher: string; date: string; pickableId: string | null };
const html = (latestChip: Chip | null) =>
  render(StationAssemblyControl, {
    props: {
      playing: false,
      progress: 0.5,
      startEpoch: 0,
      endEpoch: 1000,
      durationMs: 20_000,
      latestChip,
      onTogglePlay: noop,
      onScrub: noop,
      onReset: noop,
      onClose: noop,
      onChipClick: noop,
    },
  }).body;

const css = readFileSync(new URL('./StationAssemblyControl.svelte', import.meta.url), 'utf8');

describe('StationAssemblyControl fixed-height contract (UXD-031)', () => {
  const chip = {
    name: 'Z1 truss + PMA-3 (STS-92)',
    launcher: 'STS-92 Discovery · Wisoff + López-Alegría + Chiao',
    date: '2000-10-11',
    pickableId: null,
  };

  it('a phase is always exactly two chip rows, with the whole text in the title', () => {
    const out = html(chip);
    expect(out.match(/class="chip-line/g)).toHaveLength(2);
    expect(out).toContain(`title="${chip.name} · ${chip.launcher} · ${chip.date}"`);
  });

  it('the empty state fills the same two rows', () => {
    expect(html(null).match(/class="chip-line/g)).toHaveLength(2);
  });

  it('the whole phase is in the live region', () => {
    expect(html(chip)).toMatch(
      /class="sr-only[^"]*"[^>]*aria-live="polite">Z1 truss \+ PMA-3 \(STS-92\) · STS-92 Discovery/,
    );
  });

  it('the stylesheet pins each row and the hint to one fixed line', () => {
    expect(css).toMatch(/\.chip-line \{[^}]*height: 1\.3em;[^}]*white-space: nowrap;/s);
    expect(css).toMatch(/\.hint \{[^}]*height: 1\.25em;[^}]*white-space: nowrap;/s);
    expect(css).toMatch(/@media \(max-width: 480px\) \{[^@]*\.hint \{[^}]*height: 2\.5em;/s);
  });

  it('every phase string the player can show has a name, a launcher and an ISO date (the second row)', () => {
    const phases = [...ISS_DOCK_EVENTS, ...ISS_TRUSS_PHASES, ...TIANGONG_DOCK_EVENTS];
    for (const p of phases) {
      expect(p.name).toBeTruthy();
      expect(p.launcher).toBeTruthy();
      expect(p.launch_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
