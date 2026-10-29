import { describe, it, expect } from 'vitest';
import { anomalyLevel, dvRemaining, pastEvents } from './capcom';
import type { MissionEvent } from '$types/mission';

const ev = (met: number, type: MissionEvent['type'] = 'info'): MissionEvent => ({
  met,
  label: `e${met}`,
  note: '',
  type,
});

describe('dvRemaining', () => {
  it('is null when the source has no ledger', () => {
    expect(dvRemaining(12, null)).toBeNull();
  });
  it('is total minus used, floored at 0', () => {
    expect(dvRemaining(12, 4)).toBe(8);
    expect(dvRemaining(12, 15)).toBe(0);
  });
});

describe('pastEvents', () => {
  const events = [ev(1), ev(5), ev(9)];
  it('keeps events at or before the current MET, newest first', () => {
    expect(pastEvents(events, 5).map((e) => e.met)).toEqual([5, 1]);
  });
  it('is empty before the first event', () => {
    expect(pastEvents(events, 0.5)).toEqual([]);
  });
  it('does not mutate its input', () => {
    pastEvents(events, 9);
    expect(events.map((e) => e.met)).toEqual([1, 5, 9]);
  });
});

describe('anomalyLevel', () => {
  it('is nominal with no warning and no ledger', () => {
    expect(anomalyLevel(null, [ev(1)])).toBe('nominal');
  });
  it('is caution once a warning event is past', () => {
    expect(anomalyLevel(null, [ev(1, 'warning')])).toBe('caution');
  });
  it('is critical under 0.3 km/s remaining, overriding caution', () => {
    expect(anomalyLevel(0.29, [ev(1, 'warning')])).toBe('critical');
    expect(anomalyLevel(0, [])).toBe('critical');
  });
  it('treats exactly 0.3 km/s as not critical', () => {
    expect(anomalyLevel(0.3, [])).toBe('nominal');
  });
  it('never goes critical without a ledger', () => {
    expect(anomalyLevel(null, [])).toBe('nominal');
  });
});
