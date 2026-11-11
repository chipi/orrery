import { describe, it, expect } from 'vitest';
import { essayPlainText } from './essay-md';

describe('essayPlainText', () => {
  it('keeps link text and drops the URL', () => {
    expect(essayPlainText('ion drives, [solar sail](/science/propulsion/solar-sail)s')).toBe(
      'ion drives, solar sails',
    );
  });

  it('drops strong and em markers', () => {
    expect(essayPlainText('a **bold** and *quiet* claim')).toBe('a bold and quiet claim');
  });

  it('leaves plain text unchanged', () => {
    expect(essayPlainText('No markup here.')).toBe('No markup here.');
  });
});
