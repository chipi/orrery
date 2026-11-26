/**
 * Per-locale UI message catalogues (ADR-098), client build only.
 *
 * Paraglide compiles each message to a module that holds it in all 14 locales. In the client build
 * this plugin:
 *   1. replaces each message module with a stub of the same name that calls `msg()` from
 *      src/lib/i18n-split/registry.ts, and keeps the 14 locale functions aside;
 *   2. per locale, emits one module with the messages of the chunks every page loads (the entries,
 *      the root layout and the error page, with their lazy imports) and one per route with the
 *      messages of the chunks that route adds (its node's static and lazy closure), named by
 *      content hash: `_app/immutable/i18n/<locale>/<hash>.js`;
 *   3. per locale, emits `_app/immutable/i18n/<locale>/routes.<version>.json`:
 *      `{ root, routes: { <route id>: <hash> } }`.
 * The root layout's load awaits the root and route modules before it renders
 * (registry.loadMessagesFor).
 * Dev, SSR and prerender keep Paraglide's modules untouched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

interface ParsedMessage {
  name: string;
  /** locale → the function's source */
  byLocale: Record<string, string>;
}

const MESSAGE_MODULE = /[\\/]src[\\/]lib[\\/]paraglide[\\/]messages[\\/](?!_index\.js)[^\\/]+\.js$/;
const LOCALE_FN = /^const (\w+) = \/\*\* @type \{[^\n]*\} \*\/ (\(i?\) => \{\n[\s\S]*?\n\});$/gm;
const BRANCH = /^\tif \(locale === "([^"]+)"\) return (\w+)\(inputs\)$/gm;
const DEFAULT_BRANCH = /^\treturn (\w+)\(inputs\)$/m;
const EXPORT = /^export const (\w+) = /m;

/** Parses one Paraglide message module: its export name and each locale's function source. */
export function parseMessageModule(code: string, locales: string[]): ParsedMessage {
  const name = EXPORT.exec(code)?.[1];
  if (!name) throw new Error('i18n-split: no export in a message module');
  const fnSource = new Map<string, string>();
  for (const [, ident, src] of code.matchAll(LOCALE_FN)) fnSource.set(ident, src);
  const byLocale: Record<string, string> = {};
  for (const [, locale, ident] of code.matchAll(BRANCH))
    byLocale[locale] = fnSource.get(ident) ?? '';
  const fallback = DEFAULT_BRANCH.exec(code)?.[1];
  const rest = locales.filter((l) => !(l in byLocale));
  if (rest.length !== 1 || !fallback)
    throw new Error(`i18n-split: ${name}: unexpected locale chain`);
  byLocale[rest[0]] = fnSource.get(fallback) ?? '';
  for (const l of locales)
    if (!byLocale[l]) throw new Error(`i18n-split: ${name}: no function for ${l}`);
  return { name, byLocale };
}

export function stubFor(name: string): string {
  return `import { msg } from '$lib/i18n-split/registry';
export const ${name} = (inputs = {}, options = {}) => msg(${JSON.stringify(name)}, inputs, options);
`;
}

export function pieceModule(entries: Array<[string, string]>): string {
  return `export default {\n${entries.map(([name, src]) => `${JSON.stringify(name)}: ${src}`).join(',\n')}\n};\n`;
}

/** Route id → node indices, from SvelteKit's generated client manifest. */
export function parseDictionary(appJs: string): Record<string, number[]> {
  const body = /export const dictionary = \{([\s\S]*?)\n\};/.exec(appJs)?.[1];
  if (!body) throw new Error('i18n-split: no dictionary in the client manifest');
  const routes: Record<string, number[]> = {};
  for (const [, id, nodes] of body.matchAll(/"([^"]+)": \[([^\n]*)\],?$/gm))
    routes[id] = [...nodes.matchAll(/\d+/g)].map((n) => Number(n[0]));
  return routes;
}

export function i18nSplitPlugin(): Plugin {
  const locales: string[] = JSON.parse(
    fs.readFileSync('project.inlang/settings.json', 'utf8'),
  ).locales;
  /** message module id → parsed */
  const messages = new Map<string, ParsedMessage>();
  let version = '';
  let isBuild = false;
  return {
    name: 'orrery-i18n-split',
    enforce: 'pre',
    config(_, env) {
      isBuild = env.command === 'build';
      if (isBuild) return { define: { __I18N_SPLIT__: 'true' } };
    },
    configResolved(config) {
      const v = config.define?.__SVELTEKIT_APP_VERSION__;
      if (typeof v === 'string') version = JSON.parse(v);
    },
    transform(code, id) {
      if (!isBuild || this.environment?.name !== 'client' || !MESSAGE_MODULE.test(id)) return null;
      const parsed = parseMessageModule(code, locales);
      messages.set(id, parsed);
      return { code: stubFor(parsed.name), map: null };
    },
    generateBundle(_, bundle) {
      if (!isBuild || this.environment?.name !== 'client') return;
      if (!version) {
        const v = this.environment.config.define?.__SVELTEKIT_APP_VERSION__;
        if (typeof v === 'string') version = JSON.parse(v);
      }
      if (!version) throw new Error('i18n-split: no SvelteKit app version');
      type Out = (typeof bundle)[string];
      const chunks = Object.values(bundle).filter(
        (o): o is Extract<Out, { type: 'chunk' }> => o.type === 'chunk',
      );
      /** chunk fileName → the messages it contains */
      const msgsOf = new Map<string, ParsedMessage[]>();
      for (const c of chunks) {
        const msgs = c.moduleIds
          .map((id) => messages.get(id))
          .filter((m): m is ParsedMessage => !!m);
        if (msgs.length) msgsOf.set(c.fileName, msgs);
      }
      const byFile = new Map(chunks.map((c) => [c.fileName, c]));
      const nodeChunk = (n: number) =>
        chunks.find(
          (c) =>
            c.facadeModuleId &&
            /client-optimized[\\/]nodes[\\/](\d+)\.js$/.exec(c.facadeModuleId)?.[1] === String(n),
        );
      const nodeFiles = new Set(
        chunks
          .filter((c) => /client-optimized[\\/]nodes[\\/]\d+\.js$/.test(c.facadeModuleId ?? ''))
          .map((c) => c.fileName),
      );
      /** The chunks a start chunk loads: its static imports, and with `lazy` its own lazy ones. */
      const closure = (start: string, lazy: boolean): string[] => {
        const seen = new Set<string>();
        const walk = (f: string) => {
          if (seen.has(f)) return;
          seen.add(f);
          const c = byFile.get(f);
          if (!c) return;
          for (const i of c.imports) walk(i);
          // A node's lazy imports are its own scenes; another node is another route.
          if (lazy) for (const i of c.dynamicImports) if (!nodeFiles.has(i)) walk(i);
        };
        walk(start);
        return [...seen].filter((f) => msgsOf.has(f));
      };
      const appJs = fs.readFileSync(
        path.join('.svelte-kit', 'generated', 'client-optimized', 'app.js'),
        'utf8',
      );
      const rootFiles = new Set<string>();
      for (const c of chunks)
        if (c.isEntry) for (const f of closure(c.fileName, false)) rootFiles.add(f);
      for (const n of [0, 1]) {
        const c = nodeChunk(n);
        if (c) for (const f of closure(c.fileName, true)) rootFiles.add(f);
      }
      /** route id → the message chunks it needs beyond the root's */
      const routeFiles: Record<string, Set<string>> = {};
      for (const [id, nodes] of Object.entries(parseDictionary(appJs))) {
        const set = new Set<string>();
        for (const n of nodes) {
          const c = nodeChunk(n);
          if (!c) throw new Error(`i18n-split: no chunk for node ${n} (${id})`);
          for (const f of closure(c.fileName, true)) if (!rootFiles.has(f)) set.add(f);
        }
        routeFiles[id] = set;
      }
      // One module per locale for the root and one per route (two requests at most per page),
      // named by content hash so an unchanged catalogue stays cached across deploys.
      for (const l of locales) {
        const emitted = new Set<string>();
        const emit = (files: Iterable<string>): string | null => {
          const byName = new Map<string, string>();
          for (const f of [...files].sort())
            for (const m of msgsOf.get(f) ?? []) byName.set(m.name, m.byLocale[l]);
          if (!byName.size) return null;
          const source = pieceModule([...byName].sort(([a], [b]) => (a < b ? -1 : 1)));
          const name = createHash('sha256').update(source).digest('base64url').slice(0, 10);
          if (!emitted.has(name)) {
            emitted.add(name);
            this.emitFile({
              type: 'asset',
              fileName: `_app/immutable/i18n/${l}/${name}.js`,
              source,
            });
          }
          return name;
        };
        const routes: Record<string, string> = {};
        for (const [id, files] of Object.entries(routeFiles)) {
          const name = emit(files);
          if (name) routes[id] = name;
        }
        this.emitFile({
          type: 'asset',
          fileName: `_app/immutable/i18n/${l}/routes.${version}.json`,
          source: JSON.stringify({ root: emit(rootFiles), routes }),
        });
      }
    },
  };
}
