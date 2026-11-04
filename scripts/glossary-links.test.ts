import { describe, expect, it } from 'vitest';
import { articleLinks, plainText, sharesBinding } from './glossary-links.mjs';

// A small glossary: English pattern from the term (or _en), stems per locale, binding form.
const terms = {
  orbit: {
    de: 'Umlaufbahn',
    _match: { de: ['Umlaufbahn', 'Bahn'] },
    _read_more: 'orbits/keplerian-orbit',
  },
  orbiter: { de: 'Orbiter', _match: { de: ['Orbiter'] }, _en: '\\borbiters?\\b' },
  burn: { de: 'Zündung', _match: { de: ['Zündung', 'Manöver'] } },
  payload: { de: 'Nutzlast', _match: { de: ['Nutzlast'] } },
  perigee: { de: 'Perigäum', _match: { de: ['Perigäum'] }, _en_skip: ['science/skip/'] },
};
const rel = 'science/orbits/apsides.json';

describe('glossary term links (PRD-038 §5)', () => {
  it('links each term once, at most 2 per paragraph; a crowded-out term moves on', () => {
    const en = {
      body_paragraphs: [
        'An orbit, a burn and a payload at perigee.',
        'The payload again, and the perigee.',
      ],
    };
    const de = {
      body_paragraphs: [
        'Eine Umlaufbahn, eine Zündung und eine Nutzlast im Perigäum.',
        'Wieder die Nutzlast und das Perigäum.',
      ],
    };
    expect(articleLinks(terms, 'de', rel, en, de)).toEqual({
      'body_paragraphs.0': [
        ['orbit', 5, 'Umlaufbahn'],
        ['burn', 22, 'Zündung'],
      ],
      'body_paragraphs.1': [
        ['payload', 11, 'Nutzlast'],
        ['perigee', 28, 'Perigäum'],
      ],
    });
  });

  it("skips the term's own read-more article and pages where _en_skip gives another sense", () => {
    const en = { body_paragraphs: ['An orbit and a perigee.'] };
    const de = { body_paragraphs: ['Eine Umlaufbahn und ein Perigäum.'] };
    expect(articleLinks(terms, 'de', 'science/orbits/keplerian-orbit.json', en, de)).toEqual({
      'body_paragraphs.0': [['perigee', 24, 'Perigäum']],
    });
    expect(articleLinks(terms, 'de', 'science/skip/page.json', en, de)).toEqual({
      'body_paragraphs.0': [['orbit', 5, 'Umlaufbahn']],
    });
  });

  it('never links a compound, a plain word that is not the term, or a longer word of another term', () => {
    const en = {
      body_paragraphs: ['The payload specialists, the docking burn, the orbiter in orbit.'],
    };
    // «Nutzlastspezialisten» is a compound; «Andockmanöver» shares nothing with «Zündung»;
    // «Orbiter» is the orbiter's word, not orbit's («Bahn» is orbit's).
    const de = {
      body_paragraphs: [
        'Die Nutzlastspezialisten, das Andockmanöver, der Orbiter auf seiner Bahn.',
      ],
    };
    expect(articleLinks(terms, 'de', rel, en, de)).toEqual({
      'body_paragraphs.0': [
        ['orbiter', 49, 'Orbiter'],
        ['orbit', 68, 'Bahn'],
      ],
    });
  });

  it('counts offsets in the plain text, never links inside an author link', () => {
    const en = { body_paragraphs: ['See [the orbit](orbits/keplerian-orbit), then the burn.'] };
    const de = {
      body_paragraphs: ['Siehe [die Umlaufbahn](orbits/keplerian-orbit), dann die Zündung.'],
    };
    const links = articleLinks(terms, 'de', rel, en, de);
    expect(links).toEqual({ 'body_paragraphs.0': [['burn', 31, 'Zündung']] });
    expect(plainText(de.body_paragraphs[0]).startsWith('Zündung', 31)).toBe(true);
  });

  it('sharesBinding: a piece of the binding form, 2 characters in CJK', () => {
    expect(sharesBinding('de', 'Umlaufbahnen', 'Umlaufbahn')).toBe(true);
    expect(sharesBinding('de', 'Andockmanöver', 'Zündung')).toBe(false);
    expect(sharesBinding('ja', '探査機', '周回機')).toBe(false);
    expect(sharesBinding('ja', '周回軌道', '周回機')).toBe(true);
  });
});
