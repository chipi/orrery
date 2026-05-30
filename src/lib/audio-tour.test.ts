import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CURATOR_FULL_TOUR, EPISODE_STAGES, stagesForEpisode } from './audio-tour';

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
      expect(['flash', 'scroll-to', 'click', 'open-tab', 'cue']).toContain(stage.action);
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

  it('every EPISODE_STAGES key has a provenance entry', () => {
    const ids = loadProvenanceIds();
    const missing = Object.keys(EPISODE_STAGES).filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });
});
