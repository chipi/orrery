import { describe, expect, it } from 'vitest';
import { nameCandidates, nonNameChanges } from './i18n-names-pass.mjs';

// Cases are the edits the 2026-10-17 ja/de pilot actually produced.
describe('nonNameChanges', () => {
  it('accepts a localised name swapped for the English one', () => {
    expect(
      nonNameChanges(
        'その後クルーがゲール・クレーターに着陸した。',
        'その後クルーがGale Craterに着陸した。',
        'The crew then landed in Gale Crater.',
        'char',
      ),
    ).toEqual([]);
    expect(
      nonNameChanges(
        'Sie landeten im Ozean der Stürme nahe Surveyor 3.',
        'Sie landeten im Ocean of Storms nahe Surveyor 3.',
        'They landed in the Ocean of Storms near Surveyor 3.',
      ),
    ).toEqual([]);
  });

  it('accepts a one-or-two character particle added next to a name', () => {
    expect(
      nonNameChanges(
        'Curiosity、ゲール・クレーターAeolis Palusに到達。',
        'Curiosity、Gale CraterのAeolis Palusに到達。',
        'Curiosity reaches Aeolis Palus in Gale Crater.',
        'char',
      ),
    ).toEqual([]);
  });

  it('rejects an ordinary noun anglicised (planet, country)', () => {
    expect(
      nonNameChanges(
        'ロケットでマーストに降下された。',
        'ロケットでMarsに降下された。',
        'lowered to Mars by a rocket',
        'char',
      ),
    ).not.toEqual([]);
    expect(
      nonNameChanges(
        'erste US-UdSSR-Rendezvous',
        'erste US-USSR-Rendezvous',
        'the first US-USSR rendezvous',
      ),
    ).not.toEqual([]);
  });

  it('rejects an English possessive replacing a German genitive', () => {
    expect(
      nonNameChanges(
        'war Alan Shepards Flug kürzer',
        "war Alan Shepard's Flug kürzer",
        "Alan Shepard's flight was shorter",
      ),
    ).toContain("added an English possessive ('s)");
  });

  it('rejects English pasted in front of the kept localised text', () => {
    expect(
      nonNameChanges(
        'ヴァンデンバーグ空軍基地からアトラス V 401 — 米西海岸初。',
        'Atlas V 401 from Vandenberg AFB からのアトラス V 401 — 米西海岸初。',
        'Atlas V 401 from Vandenberg AFB — first West Coast interplanetary launch.',
        'char',
      ),
    ).not.toEqual([]);
  });

  it('rejects a garble outside the names', () => {
    expect(
      nonNameChanges(
        'それ以来、ゲール・クレーターを横断し、',
        'それ以来、ガル・クレーターを横断し、',
        'Since then it has crossed Gale Crater,',
        'char',
      ),
    ).not.toEqual([]);
  });
});

describe('nameCandidates', () => {
  it('finds names, not counts, labels, dates or ordinary nouns', () => {
    const c = nameCandidates(
      "Glenn's 3 orbits; Bean and Conrad landed Apollo 12 near Surveyor 3 in April 1969 on the Moon.",
    );
    expect(c).toEqual(expect.arrayContaining(['Bean', 'Conrad', 'Apollo 12']));
    expect(c).not.toContain("Glenn's 3");
    expect(c).not.toContain('April 1969');
    expect(c).not.toContain('Moon');
    expect(nameCandidates('TOUCHDOWN')).toEqual([]);
  });
});
