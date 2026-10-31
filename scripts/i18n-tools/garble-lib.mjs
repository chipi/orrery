// Shared helpers of the garble-pass tools (garble-flags, term-misses, schema-caps, number-loss,
// edit-fixes, show-edits, split-work, term-forms, garble-tally, grade-pack): JSON in/out, a
// flag parser, code-point length (what JSON Schema maxLength and the old Python tools counted).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 1));
export const isMain = (url) =>
  Boolean(process.argv[1]) && fileURLToPath(url) === path.resolve(process.argv[1]);
export const cpLen = (s) => [...s].length;
export const cut = (s, n) => (n == null ? s : [...s].slice(0, n).join(''));
export const keyOf = (x) => `${x.rel}:${x.at}`;

// `--name=value` and bare `--name` flags (a repeated flag keeps every value); the rest is positional.
export function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (const a of argv) {
    const m = /^--([\w-]+)(?:=(.*))?$/s.exec(a);
    if (!m) pos.push(a);
    else (opts[m[1]] ??= []).push(m[2] ?? true);
  }
  const one = (k, d) => opts[k]?.[0] ?? d;
  return { pos, opts, one };
}

// {rel:at → en} from a work file ([{rel, at, en, …}]).
export const enByKey = (work) => new Map(work.map((x) => [keyOf(x), x.en]));

// A Python `re` pattern as a JS RegExp: \w and \b see every script's letters (JS's are ASCII-only),
// which the old Python tools relied on for ru/ja/zh/… text. Falls back to the plain pattern when
// the `u`-flag form does not compile.
export function pyRegex(pattern, flags = 'g') {
  const W = '\\p{L}\\p{M}\\p{N}_';
  let out = '';
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\' && i + 1 < pattern.length) {
      const n = pattern[++i];
      if (n === 'w') out += inClass ? W : `[${W}]`;
      else if (n === 'b' && !inClass) out += `(?:(?<![${W}])(?=[${W}])|(?<=[${W}])(?![${W}]))`;
      else out += c + n;
      continue;
    }
    if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    out += c;
  }
  try {
    return new RegExp(out, flags + 'u');
  } catch {
    return new RegExp(pattern, flags);
  }
}
