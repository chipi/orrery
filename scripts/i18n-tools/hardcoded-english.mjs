// Hard-coded English in Svelte markup — text nodes, user-facing static attributes
// (aria-label, title, placeholder, alt, component label/title props, meta content) and string
// literals inside template expressions. Guarded by hardcoded-english.test.ts against
// hardcoded-english-allowlist.json.
//
// Not scanned, by design:
// - <script> code and .ts modules (label tables there go through messages by review);
// - src/routes/dev/ and the developer panels in SKIP_FILES;
// - blocks that only render for developers: {#if …debug…}, {#snippet …Debug…}, and the
//   label of <DebugPanelRegistrar>/<RenderingDebugRegistrar>.
//
// CLI: node scripts/i18n-tools/hardcoded-english.mjs [--all]  (--all also prints allowlisted hits)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { parse } = require('svelte/compiler');

export const SKIP_FILES = new Set([
  'src/lib/components/DebugPanel.svelte',
  'src/lib/components/FlybyDebugViewer.svelte',
  'src/lib/components/AscentCameraDebug.svelte',
  'src/lib/components/TargetEnvSwitcher.svelte',
]);
const DEBUG_COMPONENTS = new Set(['DebugPanelRegistrar', 'RenderingDebugRegistrar']);
const ATTRS = new Set([
  'aria-label',
  'title',
  'placeholder',
  'alt',
  'aria-description',
  'label',
  'content',
  'aria-roledescription',
  'aria-valuetext',
]);
// A word of English: 3+ Latin letters that is not an acronym, unit or brand every locale keeps.
const TOKENS = new Set([
  'km',
  'AU',
  'ly',
  'pc',
  'kg',
  'ms',
  'Hz',
  'kHz',
  'MB',
  'GB',
  'KB',
  'HUD',
  'ISS',
  'NASA',
  'ESA',
  'JAXA',
  'CNSA',
  'ISRO',
  'SpaceX',
  'JPL',
  'JWST',
  'MET',
  'UTC',
  'GMT',
  'LEO',
  'GEO',
  'MEO',
  'HEO',
  'TLI',
  'TMI',
  'LOI',
  'MOI',
  'EDL',
  'TCM',
  'TEI',
  'Isp',
  'TWR',
  'Orrery',
  'ORRERY',
  'Gyr',
  'Myr',
  'GCAT',
]);
const englishy = (t) => (t.match(/[A-Za-z]{3,}/g) ?? []).some((w) => !TOKENS.has(w));
const CODEISH =
  /^(?:[a-z0-9_$.\-/:#?=&%@+]*|[A-Za-z0-9_-]+(?:\.[a-z]+)?|https?:\/\/\S*|[\w-]+\s*:\s*[^;]+;.*)$/;
const PROSE = /[A-Za-z]{3,}\s+[A-Za-z]|^[A-Z][a-z]{2,}|^[A-Z]{3,}/;

const walkExpr = (node, enter, parent = null) => {
  if (!node || typeof node.type !== 'string') return;
  if (enter(node, parent) === 'skip') return;
  for (const [k, v] of Object.entries(node)) {
    if (k === 'parent' || k === 'loc' || k === 'metadata') continue;
    if (Array.isArray(v)) v.forEach((c) => c && typeof c === 'object' && walkExpr(c, enter, node));
    else if (v && typeof v === 'object' && typeof v.type === 'string') walkExpr(v, enter, node);
  }
};

/** Hits in one file: [{ file, line, kind, text }]. */
export function scanSource(file, src) {
  const hits = [];
  let ast;
  try {
    ast = parse(src, { modern: true });
  } catch (e) {
    return [{ file, line: 0, kind: 'parse-error', text: String(e.message).slice(0, 80) }];
  }
  const lineOf = (pos) => src.slice(0, pos).split('\n').length;
  const push = (pos, kind, t) =>
    hits.push({ file, line: lineOf(pos), kind, text: t.replace(/\s+/g, ' ').trim() });
  const exprLiterals = (expr, kind) => {
    if (!expr || typeof expr !== 'object') return;
    walkExpr(expr, (n, parent) => {
      if (n.type === 'BinaryExpression' && /^[!=]==?$/.test(n.operator)) return 'skip';
      if (n.type === 'Literal' && typeof n.value === 'string') {
        if (parent?.type === 'Property' && parent.key === n) return;
        const v = n.value.trim();
        if (v.length >= 3 && !CODEISH.test(v) && englishy(v) && PROSE.test(v))
          push(n.start, `${kind}-literal`, v);
      }
      if (n.type === 'TemplateLiteral') {
        for (const q of n.quasis) {
          const v = (q.value.cooked ?? '').trim();
          if (v.length >= 3 && englishy(v) && !CODEISH.test(v))
            push(q.start, `${kind}-template`, v);
        }
      }
    });
  };
  const exprSource = (e) => (e ? src.slice(e.start, e.end) : '');
  const visit = (node, parentTag) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach((n) => visit(n, parentTag));
    if (node.type === 'IfBlock' && /debug/i.test(exprSource(node.test)))
      return visit(node.alternate, parentTag);
    if (node.type === 'SnippetBlock' && /debug/i.test(node.expression?.name ?? '')) return;
    if (node.type === 'Component' && DEBUG_COMPONENTS.has(node.name)) return;
    if (node.type === 'Text' && parentTag !== 'style' && parentTag !== 'script') {
      const t = node.data.replace(/\s+/g, ' ').trim();
      if (t && englishy(t)) push(node.start, 'text', t);
    }
    if (node.type === 'ExpressionTag' && parentTag !== 'style')
      exprLiterals(node.expression, 'expr');
    if (node.attributes) {
      for (const a of node.attributes) {
        if (a.type !== 'Attribute' || !ATTRS.has(a.name)) continue;
        if (
          a.name === 'content' &&
          !node.attributes.some(
            (b) =>
              b.type === 'Attribute' &&
              ['name', 'property'].includes(b.name) &&
              Array.isArray(b.value) &&
              /description|title/.test(b.value.map((v) => v.data ?? '').join('')),
          )
        )
          continue;
        const vals = Array.isArray(a.value) ? a.value : [a.value];
        const t = vals
          .filter((v) => v?.type === 'Text')
          .map((v) => v.data)
          .join('')
          .trim();
        if (t && englishy(t)) push(a.start, `@${a.name}`, t);
        for (const v of vals)
          if (v?.type === 'ExpressionTag') exprLiterals(v.expression, `@${a.name}`);
      }
    }
    const tag = node.type === 'RegularElement' ? node.name : parentTag;
    for (const k of [
      'fragment',
      'nodes',
      'children',
      'body',
      'consequent',
      'alternate',
      'pending',
      'then',
      'catch',
      'fallback',
    ])
      if (node[k]) visit(node[k], tag);
  };
  visit(ast.fragment, null);
  return hits;
}

export function svelteFiles() {
  return execSync("git ls-files 'src/**/*.svelte'", { encoding: 'utf8', cwd: ROOT })
    .split('\n')
    .filter((f) => f && !f.startsWith('src/routes/dev/') && !SKIP_FILES.has(f));
}

export function scanAll() {
  return svelteFiles().flatMap((f) => scanSource(f, readFileSync(path.join(ROOT, f), 'utf8')));
}

/** { file: { text: reason } } — an allowlisted hit is matched by file + exact text. */
export function readAllowlist() {
  const j = JSON.parse(
    readFileSync(path.join(ROOT, 'scripts/i18n-tools/hardcoded-english-allowlist.json'), 'utf8'),
  );
  delete j._comment;
  return j;
}

export function compare(hits = scanAll(), allow = readAllowlist()) {
  const isAllowed = (h) => Object.hasOwn(allow[h.file] ?? {}, h.text);
  const unexpected = hits
    .filter((h) => !isAllowed(h))
    .map((h) => `${h.file}:${h.line} ${h.kind} | ${h.text}`);
  const seen = new Set(hits.map((h) => `${h.file}\u0000${h.text}`));
  const stale = Object.entries(allow).flatMap(([f, texts]) =>
    Object.keys(texts)
      .filter((t) => !seen.has(`${f}\u0000${t}`))
      .map((t) => `${f} | ${t}`),
  );
  return { unexpected, stale };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const hits = scanAll();
  const { unexpected, stale } = compare(hits);
  if (process.argv.includes('--all'))
    for (const h of hits) console.log(`${h.file}:${h.line} ${h.kind} | ${h.text}`);
  console.log(
    `hits ${hits.length} · not allowlisted ${unexpected.length} · stale allowlist entries ${stale.length}`,
  );
  for (const u of unexpected) console.log(`  NEW   ${u}`);
  for (const s of stale) console.log(`  STALE ${s}`);
  process.exitCode = unexpected.length || stale.length ? 1 : 0;
}
