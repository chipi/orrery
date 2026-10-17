import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeJsonEdits } from './json-surgical.mjs';

const RAW = `{
  "title": "Old title",
  "events": [
    { "met": 0, "note": "Launch from LC-39A.", "type": "nominal" },
    { "met": 1, "note": "Orbit.", "type": "nominal" }
  ]
}
`;

function tmp(raw: string) {
  const dir = mkdtempSync(join(tmpdir(), 'json-surgical-'));
  const file = join(dir, 'x.json');
  writeFileSync(file, raw);
  return { dir, file };
}

describe('writeJsonEdits', () => {
  it('edits strings in place and keeps one-line objects one-line', () => {
    const t = tmp(RAW);
    try {
      const w = writeJsonEdits(t.file, [
        { at: 'events.0.note', old: 'Launch from LC-39A.', nu: 'Start von LC-39A.' },
      ]);
      expect(w).toEqual({ applied: 1, skipped: [], surgical: true });
      expect(readFileSync(t.file, 'utf8')).toBe(
        RAW.replace('Launch from LC-39A.', 'Start von LC-39A.'),
      );
    } finally {
      rmSync(t.dir, { recursive: true, force: true });
    }
  });

  it('never overwrites a field someone else changed since it was read', () => {
    const t = tmp(RAW.replace('Old title', 'Title changed by another run'));
    try {
      const w = writeJsonEdits(t.file, [
        { at: 'title', old: 'Old title', nu: 'My title' },
        { at: 'events.1.note', old: 'Orbit.', nu: 'Umlaufbahn.' },
      ]);
      expect(w.skipped).toEqual(['title']);
      const doc = JSON.parse(readFileSync(t.file, 'utf8'));
      expect(doc.title).toBe('Title changed by another run');
      expect(doc.events[1].note).toBe('Umlaufbahn.');
    } finally {
      rmSync(t.dir, { recursive: true, force: true });
    }
  });

  it('falls back to a by-path edit when the old string is not unique', () => {
    const t = tmp('{"a":"same","b":"same"}\n');
    try {
      const w = writeJsonEdits(t.file, [{ at: 'b', old: 'same', nu: 'other' }]);
      expect(w.surgical).toBe(false);
      expect(JSON.parse(readFileSync(t.file, 'utf8'))).toEqual({ a: 'same', b: 'other' });
    } finally {
      rmSync(t.dir, { recursive: true, force: true });
    }
  });

  it('supports flat keys (messages bundles)', () => {
    const t = tmp('{\n  "nav.fly": "Fly",\n  "x": "y"\n}\n');
    try {
      writeJsonEdits(t.file, [{ at: 'nav.fly', old: 'Fly', nu: 'Fliegen' }], { flat: true });
      expect(JSON.parse(readFileSync(t.file, 'utf8'))['nav.fly']).toBe('Fliegen');
    } finally {
      rmSync(t.dir, { recursive: true, force: true });
    }
  });
});
