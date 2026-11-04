import { describe, expect, it } from 'vitest';
import { findWrongForms } from './wrong-forms.mjs';

describe('wrong forms (wrong-forms.json)', () => {
  it('none of the wrong forms the fix rounds found has come back, in any file a locale ships', () => {
    const hits = findWrongForms() as { loc: string; file: string; form: string; why: string }[];
    expect(
      hits.map((h) => `${h.loc} ${h.file}: "${h.form}" — ${h.why}`),
      "fix the text, or add the file to that form's `allow` when the form is right there",
    ).toEqual([]);
  });
});
