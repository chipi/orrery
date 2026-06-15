import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CURATOR_FULL_TOUR,
  CURATOR_EXTENDED_TOUR,
  EPISODE_STAGES,
  stagesForEpisode,
} from './audio-tour';

interface MinimalProvenanceEntry {
  episode_id: string;
}

function loadProvenanceIds(): Set<string> {
  const raw = readFileSync(join(process.cwd(), 'static/data/audio/audio-provenance.json'), 'utf-8');
  const data = JSON.parse(raw) as { entries: MinimalProvenanceEntry[] };
  return new Set(data.entries.map((e) => e.episode_id));
}

describe('CURATOR_FULL_TOUR', () => {
  it('opens with pale-blue-dot and closes with capability-ladder-close', () => {
    expect(CURATOR_FULL_TOUR[0]).toBe('pale-blue-dot');
    expect(CURATOR_FULL_TOUR[CURATOR_FULL_TOUR.length - 1]).toBe('capability-ladder-close');
  });

  it('has 21 episodes (the v0.7 documentary-order length)', () => {
    expect(CURATOR_FULL_TOUR.length).toBe(21);
  });

  it('contains no duplicate ids', () => {
    const set = new Set(CURATOR_FULL_TOUR);
    expect(set.size).toBe(CURATOR_FULL_TOUR.length);
  });

  it('every id is a valid kebab-case identifier', () => {
    for (const id of CURATOR_FULL_TOUR) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('places the moon-deep-time Curator piece between guide-moon and the Moon Atmospheric Moves', () => {
    const guideMoonIdx = CURATOR_FULL_TOUR.indexOf('guide-moon');
    const moonLifetimeIdx = CURATOR_FULL_TOUR.indexOf('moon-one-lifetime');
    const cernanIdx = CURATOR_FULL_TOUR.indexOf('cernan-last-words');
    expect(guideMoonIdx).toBeGreaterThanOrEqual(0);
    expect(moonLifetimeIdx).toBe(guideMoonIdx + 1);
    expect(cernanIdx).toBeGreaterThan(moonLifetimeIdx);
  });

  it('places mars-what-for Curator piece between guide-mars and Mars Atmospheric Moves', () => {
    const guideMarsIdx = CURATOR_FULL_TOUR.indexOf('guide-mars');
    const marsWhatForIdx = CURATOR_FULL_TOUR.indexOf('mars-what-for');
    const signalDelayIdx = CURATOR_FULL_TOUR.indexOf('signal-delay');
    expect(guideMarsIdx).toBeGreaterThanOrEqual(0);
    expect(marsWhatForIdx).toBe(guideMarsIdx + 1);
    expect(signalDelayIdx).toBeGreaterThan(marsWhatForIdx);
  });
});

describe('stagesForEpisode', () => {
  it('returns the authored stages for known episodes', () => {
    const stages = stagesForEpisode('guide-explore');
    expect(stages.length).toBeGreaterThan(0);
    for (const stage of stages) {
      expect(stage.at_sec).toBeGreaterThanOrEqual(0);
      expect(['flash', 'scroll-to', 'click', 'open-tab', 'cue', 'drag', 'zoom']).toContain(
        stage.action,
      );
      expect(typeof stage.target).toBe('string');
      expect(stage.target.length).toBeGreaterThan(0);
    }
  });

  it('returns empty array for unknown episode id', () => {
    expect(stagesForEpisode('this-id-does-not-exist')).toEqual([]);
  });

  it('every cue stage has a non-empty message', () => {
    for (const [id, stages] of Object.entries(EPISODE_STAGES)) {
      for (const s of stages) {
        if (s.action === 'cue') {
          expect(s.target, `episode ${id} stage at ${s.at_sec}s`).toMatch(/\S/);
        }
      }
    }
  });

  it('every episode in EPISODE_STAGES has stages sorted by at_sec', () => {
    for (const [id, stages] of Object.entries(EPISODE_STAGES)) {
      for (let i = 1; i < stages.length; i++) {
        expect(
          stages[i].at_sec,
          `episode ${id}: stage ${i} (${stages[i].action} at ${stages[i].at_sec}s) must come after stage ${i - 1} (at ${stages[i - 1].at_sec}s)`,
        ).toBeGreaterThanOrEqual(stages[i - 1].at_sec);
      }
    }
  });
});

// Tour ↔ provenance integrity (#8). Every id in CURATOR_FULL_TOUR and
// every key in EPISODE_STAGES must resolve to an actual provenance row,
// otherwise the tour will silently skip episodes and stage hooks will
// no-op against episodes that never play.
describe('tour ↔ provenance integrity', () => {
  it('every CURATOR_FULL_TOUR id has a provenance entry', () => {
    const ids = loadProvenanceIds();
    const missing = CURATOR_FULL_TOUR.filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });

  it('every CURATOR_EXTENDED_TOUR id has a provenance entry', () => {
    const ids = loadProvenanceIds();
    const missing = CURATOR_EXTENDED_TOUR.filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });

  it('every EPISODE_STAGES key has a provenance entry', () => {
    const ids = loadProvenanceIds();
    const missing = Object.keys(EPISODE_STAGES).filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });
});

// CURATOR_EXTENDED_TOUR structural invariants (#305).
describe('CURATOR_EXTENDED_TOUR', () => {
  it('opens with pale-blue-dot and closes with capability-ladder-close', () => {
    expect(CURATOR_EXTENDED_TOUR[0]).toBe('pale-blue-dot');
    expect(CURATOR_EXTENDED_TOUR[CURATOR_EXTENDED_TOUR.length - 1]).toBe('capability-ladder-close');
  });

  it('contains every CURATOR_FULL_TOUR id (extended is a superset)', () => {
    const set = new Set(CURATOR_EXTENDED_TOUR);
    const missing = CURATOR_FULL_TOUR.filter((id) => !set.has(id));
    expect(missing).toEqual([]);
  });

  it('contains exactly 10 ids beyond CURATOR_FULL_TOUR (the enthusiast insertions)', () => {
    const standard = new Set(CURATOR_FULL_TOUR);
    const extras = CURATOR_EXTENDED_TOUR.filter((id) => !standard.has(id));
    expect(extras).toHaveLength(10);
  });

  it('contains no duplicate ids', () => {
    const set = new Set(CURATOR_EXTENDED_TOUR);
    expect(set.size).toBe(CURATOR_EXTENDED_TOUR.length);
  });
});

// PRD-016 §S11 / RFC-019 §12 — guided-tour stage authoring.
//
// Stage authoring pilot: pale-blue-dot must demonstrate the mixed-action
// pattern (cue + scroll-to + flash) so the "proper guided tour" promise
// is visible from the first segment of every play-through. These tests
// guard against accidental regressions during the corpus rollout.
describe('pale-blue-dot pilot (PRD-016 §S11)', () => {
  const stages = stagesForEpisode('pale-blue-dot');

  it('uses at least three of the five action types', () => {
    const actions = new Set(stages.map((s) => s.action));
    expect(actions.size).toBeGreaterThanOrEqual(3);
  });

  it('includes cue + scroll-to + flash (the showcase trio)', () => {
    const actions = new Set(stages.map((s) => s.action));
    expect(actions.has('cue')).toBe(true);
    expect(actions.has('scroll-to')).toBe(true);
    expect(actions.has('flash')).toBe(true);
  });

  it('every non-cue stage targets a [data-audio-stage="..."] selector', () => {
    for (const stage of stages) {
      if (stage.action === 'cue') continue;
      expect(stage.target, `pale-blue-dot stage at ${stage.at_sec}s`).toMatch(
        /^\[data-audio-stage="[a-z0-9-]+"\]$/,
      );
    }
  });

  it('every targeted data-audio-stage anchor exists on src/routes/+page.svelte', () => {
    const page = readFileSync(join(process.cwd(), 'src/routes/+page.svelte'), 'utf-8');
    for (const stage of stages) {
      if (stage.action === 'cue') continue;
      const match = stage.target.match(/data-audio-stage="([^"]+)"/);
      expect(match, `selector ${stage.target} should parse`).not.toBeNull();
      const name = match![1];
      // Static check: route-card-* names are emitted dynamically via
      // `route.slice(1)`, so allow the templated form too.
      const literalPresent = page.includes(`data-audio-stage="${name}"`);
      const templatedPresent =
        name.startsWith('route-card-') && page.includes('data-audio-stage="route-card-');
      expect(
        literalPresent || templatedPresent,
        `pale-blue-dot stage references "${name}" but src/routes/+page.svelte has no matching data-audio-stage attribute`,
      ).toBe(true);
    }
  });

  it('all stages fit inside the episode duration (≤115s)', () => {
    for (const stage of stages) expect(stage.at_sec).toBeLessThanOrEqual(115);
  });
});

// Guard against a future episode silently re-introducing pure-cue stages
// after the §S11 rollout begins. Tour episodes that have been STAGED
// (i.e. landed in the corpus authoring pass) should keep at least one
// non-cue action. Starts permissive (only pale-blue-dot enforced today);
// add an episode-id to STAGED_EPISODES as each Phase-1/2 episode lands.
describe('staged-episode invariants (RFC-019 §12.6 rollout)', () => {
  // Every tour episode listed here has been rolled out with mixed-action
  // staging (Phase 0 pilot + Phase 1/2 corpus). Adding a new episode here
  // is the gate that says "this one has been authored, regress on it."
  const STAGED_EPISODES = new Set<string>([
    'pale-blue-dot',
    'guide-explore',
    'guide-earth',
    'guide-moon',
    'moon-one-lifetime',
    'cernan-last-words',
    'far-side',
    'guide-iss',
    'guide-tiangong',
    'guide-missions',
    'guide-mars',
    'mars-what-for',
    'signal-delay',
    'one-way-light-time',
    'curiosity-persistence',
    'guide-fly',
    'guide-plan',
    'porkchop',
    'guide-fleet',
    'guide-science',
    'capability-ladder-close',
    // Extended-Tour enthusiast deep-dives (#305) — same authoring bar as
    // the standard tour: VTT-derived timings + at least one non-cue
    // action wired to the route the episode anchors to.
    'saturn-rings',
    'jupiter-storm',
    'jwst-l2-halo',
    'queqiao-magpie',
    'zarya-first-module',
    'tianhe-core',
    'voyager-grand-tour',
    'cassini-finale',
    'saturn-v-anchor',
    'vis-viva',
  ]);

  for (const id of STAGED_EPISODES) {
    it(`${id} retains at least one scroll-to / flash / click action`, () => {
      const actions = stagesForEpisode(id).map((s) => s.action);
      const hasVisualAction = actions.some(
        (a) => a === 'scroll-to' || a === 'flash' || a === 'click' || a === 'open-tab',
      );
      expect(hasVisualAction).toBe(true);
    });
  }

  it('the staged set covers every CURATOR_FULL_TOUR id (corpus rollout complete)', () => {
    const missing = CURATOR_FULL_TOUR.filter((id) => !STAGED_EPISODES.has(id));
    expect(missing).toEqual([]);
  });

  it('the staged set covers every CURATOR_EXTENDED_TOUR id (#305 rollout complete)', () => {
    const missing = CURATOR_EXTENDED_TOUR.filter((id) => !STAGED_EPISODES.has(id));
    expect(missing).toEqual([]);
  });

  it('every non-cue selector across the staged corpus matches a data-audio-stage anchor somewhere under src/', () => {
    // Walk a curated set of route + shared-component files where we add
    // tour anchors. A single missing anchor here means the executor will
    // silently no-op when it reaches that stage on the live page.
    const SOURCE_FILES = [
      'src/routes/+page.svelte',
      'src/routes/missions/+page.svelte',
      'src/routes/fleet/+page.svelte',
      'src/routes/science/+layout.svelte',
      'src/routes/plan/+page.svelte',
      'src/routes/fly/+page.svelte',
      'src/routes/explore/+page.svelte',
      'src/routes/iss/+page.svelte',
      'src/routes/tiangong/+page.svelte',
      'src/lib/surface-scene/SurfaceScene.svelte',
      // Shared chrome components that carry tour anchors used across routes.
      'src/lib/components/Nav.svelte',
      'src/lib/components/PlanetPanel.svelte',
      'src/lib/components/PanoramaToggleButton.svelte',
      'src/lib/components/PanoramaAutoTour.svelte',
      // Surface-scene routes (anchors live in route-level pages and call
      // into the SurfaceScene window-hook).
      'src/routes/earth/+page.svelte',
      'src/routes/moon/+page.svelte',
      'src/routes/mars/+page.svelte',
      // Templated anchors (science-tab-{tab}, science-section-{id}).
      'src/routes/science/+layout.svelte',
    ];
    // Some anchors are emitted with template interpolation (e.g.
    //   data-audio-stage="route-card-{card.route.slice(1)}"
    //   data-audio-stage="science-tab-{tab}"
    //   data-audio-stage="science-section-{section.id}"
    //   data-audio-stage="missions-select-{mission.id}"
    // We can't statically resolve the interpolated value, so we allow
    // any selector whose prefix matches one of these templated bases.
    const TEMPLATED_PREFIXES = [
      'route-card-',
      'science-tab-',
      'science-section-',
      'missions-select-',
      'fleet-select-',
      'mars-select-',
      'explore-select-',
    ];
    const haystack = SOURCE_FILES.map((p) => readFileSync(join(process.cwd(), p), 'utf-8')).join(
      '\n',
    );
    const missing: string[] = [];
    for (const id of STAGED_EPISODES) {
      for (const stage of stagesForEpisode(id)) {
        if (stage.action === 'cue') continue;
        const match = stage.target.match(/data-audio-stage="([^"]+)"/);
        if (!match) continue;
        const name = match[1];
        const literalPresent = haystack.includes(`data-audio-stage="${name}"`);
        const templatedPresent = TEMPLATED_PREFIXES.some(
          (prefix) => name.startsWith(prefix) && haystack.includes(`data-audio-stage="${prefix}`),
        );
        if (!literalPresent && !templatedPresent) {
          missing.push(`${id} → ${name}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
