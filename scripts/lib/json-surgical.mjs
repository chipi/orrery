/**
 * Write string edits into a JSON file without reformatting it, and without
 * clobbering anyone else's edits. Overlays keep hand-chosen layouts (one-line
 * event objects); a JSON.stringify rewrite expands them and buries a five-word edit
 * in a 30-line diff. Two translation runs writing the same file (2026-10-17) showed
 * the second hazard: a writer that saves the document it loaded minutes earlier
 * erases whatever changed in between.
 *
 * So the file is re-read at write time. Each edit {at, old, nu} replaces the old
 * string's JSON encoding in the raw text when it occurs exactly once; otherwise
 * that edit is applied by path to the freshly parsed document, which is then
 * re-serialised. An edit whose current value is no longer `old` (someone else
 * changed it) is skipped and reported. The result is parsed back and every applied
 * edit verified.
 *
 * `at` is a dotted path ("events.3.note"), or a flat key when `flat` is true
 * (messages/<loc>.json).
 */
import fs from 'node:fs';

const seg = (k) => (/^\d+$/.test(k) ? Number(k) : k);
function getAt(o, at, flat) {
  return flat ? o[at] : at.split('.').reduce((a, k) => (a == null ? a : a[seg(k)]), o);
}
function setAt(o, at, v, flat) {
  if (flat) return void (o[at] = v);
  const s = at.split('.');
  const last = s.pop();
  s.reduce((a, k) => a[seg(k)], o)[seg(last)] = v;
}

/** @returns {{applied:number, skipped:string[], surgical:boolean}} */
export function writeJsonEdits(file, edits, { flat = false } = {}) {
  let raw = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(raw);
  const skipped = [];
  const live = edits.filter((e) => {
    if (getAt(doc, e.at, flat) === e.old) return true;
    skipped.push(e.at);
    return false;
  });
  let surgical = true;
  const byPath = [];
  for (const e of live) {
    const from = JSON.stringify(e.old);
    const first = raw.indexOf(from);
    if (first >= 0 && raw.indexOf(from, first + from.length) < 0)
      raw = raw.slice(0, first) + JSON.stringify(e.nu) + raw.slice(first + from.length);
    else byPath.push(e);
  }
  let out = raw;
  if (byPath.length) {
    surgical = false;
    const d = JSON.parse(raw);
    for (const e of byPath) setAt(d, e.at, e.nu, flat);
    out = JSON.stringify(d, null, 2) + '\n';
  }
  const check = JSON.parse(out);
  for (const e of live)
    if (getAt(check, e.at, flat) !== e.nu) throw new Error(`${file}: edit at ${e.at} did not land`);
  if (live.length) fs.writeFileSync(file, out, 'utf8');
  return { applied: live.length, skipped, surgical };
}
