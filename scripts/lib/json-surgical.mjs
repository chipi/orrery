/**
 * Write string edits into a JSON file without reformatting it. Overlays keep
 * hand-chosen layouts (one-line event objects); a JSON.stringify rewrite expands
 * them and buries a five-word edit in a 30-line diff.
 *
 * Each edit replaces the old string's JSON encoding with the new one, in the raw
 * text, when the old encoding occurs exactly once. If any edit can't be placed
 * that way, the whole document is re-serialised instead (correct, just noisier).
 * The result is parsed back and compared with the intended object either way.
 */
import fs from 'node:fs';

/** @param {string} file @param {object} obj the edited document @param {Array<[string,string]>} edits [old, new] */
export function writeJsonEdits(file, obj, edits) {
  let raw = fs.readFileSync(file, 'utf8');
  let surgical = true;
  for (const [oldS, newS] of edits) {
    const from = JSON.stringify(oldS);
    const first = raw.indexOf(from);
    if (first < 0 || raw.indexOf(from, first + from.length) >= 0) {
      surgical = false;
      break;
    }
    raw = raw.slice(0, first) + JSON.stringify(newS) + raw.slice(first + from.length);
  }
  const out = surgical ? raw : JSON.stringify(obj, null, 2) + '\n';
  if (JSON.stringify(JSON.parse(out)) !== JSON.stringify(obj))
    throw new Error(`${file}: edited text does not match the intended document`);
  fs.writeFileSync(file, out, 'utf8');
  return surgical;
}
