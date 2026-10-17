import { describe, expect, it } from 'vitest';
import { launchStatusLabel } from './status-label';

describe('launchStatusLabel', () => {
  it('maps every normalised code to a message, not the raw GCAT label', () => {
    expect(launchStatusLabel({ code: 'SUCCESS', label: 'OS' })).toBe('Success');
    expect(launchStatusLabel({ code: 'FAILURE', label: 'OF40' })).toBe('Failure');
    expect(launchStatusLabel({ code: 'TBD', label: 'To Be Determined' })).toBe('TBD');
    expect(launchStatusLabel({ code: 'GO', label: 'Go for Launch' })).toBe('Go');
    expect(launchStatusLabel({ code: 'PARTIAL', label: 'x' })).toBe('Partial');
    expect(launchStatusLabel({ code: 'HOLD', label: 'x' })).toBe('Hold');
    expect(launchStatusLabel({ code: 'IN_FLIGHT', label: 'x' })).toBe('In flight');
  });

  it('falls back to the raw label for an unknown code', () => {
    expect(launchStatusLabel({ code: 'WEIRD', label: 'Something' })).toBe('Something');
  });
});
