// Small operations on an edits file ([{rel, at, old, new}]) between review rounds.
//   node scripts/i18n-tools/edit-fixes.mjs refused <loc> <workdir>
//   node scripts/i18n-tools/edit-fixes.mjs merge <edits.json> <fix.json>
//   node scripts/i18n-tools/edit-fixes.mjs drop <edits.json> <rel:at>…
// refused: runs apply-edits.mjs <loc> <workdir>/edits.json --check and writes
//   <workdir>/refused-in.json, [{rel, at, en, new, guard}] (en from <workdir>/<loc>.json), for the
//   translator who redoes the refused fields.
// merge: copies `new` from the fix file's [{rel, at, new}] into the matching edits, in place.
// drop: removes the edits with these rel:at keys, in place.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, enByKey, isMain, keyOf, readJson, writeJson } from './garble-lib.mjs';

export function parseRefused(stdout) {
  const why = new Map();
  for (const line of stdout.split('\n')) {
    const i = line.indexOf(' — ');
    if (i >= 0) why.set(line.slice(0, i), line.slice(i + 3));
  }
  return why;
}

export function refusedIn(edits, en, why) {
  return edits
    .filter((e) => why.has(keyOf(e)))
    .map((e) => ({
      rel: e.rel,
      at: e.at,
      en: en.get(keyOf(e)) ?? e.en,
      new: e.new,
      guard: why.get(keyOf(e)),
    }));
}

export function mergeFix(edits, fix) {
  const fx = new Map(fix.map((f) => [keyOf(f), f.new]));
  let n = 0;
  for (const e of edits)
    if (fx.has(keyOf(e))) {
      e.new = fx.get(keyOf(e));
      n++;
    }
  return { n, of: fx.size };
}

export const dropEdits = (edits, keys) => edits.filter((e) => !keys.has(keyOf(e)));

if (isMain(import.meta.url)) {
  const [cmd, a, b, ...rest] = process.argv.slice(2);
  if (cmd === 'refused' && a && b) {
    const edits = path.resolve(b, 'edits.json');
    const r = spawnSync(
      process.execPath,
      [path.join(import.meta.dirname, 'apply-edits.mjs'), a, edits, '--check'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 },
    );
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout);
      process.exit(1);
    }
    const out = refusedIn(
      readJson(edits),
      enByKey(readJson(path.join(b, `${a}.json`))),
      parseRefused(r.stdout),
    );
    writeJson(path.join(b, 'refused-in.json'), out);
    console.log(out.length);
  } else if (cmd === 'merge' && a && b) {
    const edits = readJson(a);
    const { n, of } = mergeFix(edits, readJson(b));
    writeJson(a, edits);
    console.log('merged', n, 'of', of);
  } else if (cmd === 'drop' && a) {
    const edits = readJson(a);
    const keep = dropEdits(edits, new Set([b, ...rest].filter(Boolean)));
    writeJson(a, keep);
    console.log('dropped', edits.length - keep.length);
  } else {
    console.error(
      'usage: edit-fixes.mjs refused <loc> <workdir> | merge <edits.json> <fix.json> | drop <edits.json> <rel:at>…',
    );
    process.exit(2);
  }
}
