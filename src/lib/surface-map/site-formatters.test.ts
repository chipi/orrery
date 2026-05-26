import { describe, expect, it } from 'vitest';
import { missionContextFor } from './site-formatters';

describe('missionContextFor', () => {
  it('returns empty string when neither field is present', () => {
    expect(missionContextFor({})).toBe('');
  });

  it('returns just the mission type when landing_date is missing', () => {
    expect(missionContextFor({ mission_type: 'Apollo 11 crewed lander' })).toBe(
      'Apollo 11 crewed lander',
    );
  });

  it('returns just the landing date when mission_type is missing', () => {
    expect(missionContextFor({ landing_date: '1969-07-20' })).toBe('landed 1969-07-20');
  });

  it('joins both fields with ·', () => {
    expect(
      missionContextFor({
        mission_type: 'Mars Science Laboratory rover',
        landing_date: '2012-08-06',
      }),
    ).toBe('Mars Science Laboratory rover · landed 2012-08-06');
  });
});
