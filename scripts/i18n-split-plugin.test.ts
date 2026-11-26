import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile } from '@inlang/paraglide-js';
// @ts-expect-error — plain .mjs config, no types
import { paraglideOptions } from './paraglide-options.mjs';
import { parseMessageModule, parseDictionary, pieceModule, stubFor } from './i18n-split-plugin';

const LOCALES: string[] = JSON.parse(readFileSync('project.inlang/settings.json', 'utf8')).locales;
// The production layout (one module per message): the Vite plugin writes per-locale modules in
// dev and tests, so compile it here.
let DIR = '';
beforeAll(async () => {
  const out = mkdtempSync(join(tmpdir(), 'i18n-split-'));
  await compile({ ...paraglideOptions, outdir: out, outputStructure: 'message-modules' });
  DIR = join(out, 'messages');
}, 120_000);

describe('parseMessageModule (ADR-098)', () => {
  it('reads every compiled message: its name and one function per locale', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.js') && f !== '_index.js');
    expect(files.length).toBeGreaterThan(3000);
    for (const f of files) {
      const { name, byLocale } = parseMessageModule(readFileSync(`${DIR}/${f}`, 'utf8'), LOCALES);
      expect(f).toBe(`${name}.js`);
      expect(Object.keys(byLocale).sort()).toEqual([...LOCALES].sort());
    }
  });

  it('keeps each locale its own text and placeholders', () => {
    const { byLocale } = parseMessageModule(
      readFileSync(`${DIR}/audio_inventory_error.js`, 'utf8'),
      LOCALES,
    );
    const run = (src: string) => (0, eval)(`(${src})`)({ error: 'E' });
    expect(run(byLocale['en-US'])).toBe('Could not load episode registry: E');
    expect(run(byLocale.es)).toBe('No se pudo cargar el registro de episodios: E');
  });

  it('the default branch is the locale with no if', () => {
    const { byLocale } = parseMessageModule(readFileSync(`${DIR}/sky_enter.js`, 'utf8'), LOCALES);
    expect((0, eval)(`(${byLocale.ru})`)()).toBe('НЕБО');
  });
});

describe('the emitted modules', () => {
  it('a stub keeps the name and forwards to msg()', () => {
    expect(stubFor('sky_enter')).toContain(
      `export const sky_enter = (inputs = {}, options = {}) => msg("sky_enter", inputs, options);`,
    );
  });

  it('a piece module maps names to functions', () => {
    const src = pieceModule([['a', '() => {\n\treturn `A`\n}']]);
    const mod = (0, eval)(`(${src.replace('export default ', '').replace(/;\n$/, '')})`);
    expect(mod.a()).toBe('A');
  });
});

describe('parseDictionary', () => {
  it('route id → node indices, layouts and server-load markers included', () => {
    const app = `export const dictionary = {
\t\t"/": [4],
\t\t"/c/[kind]/[id]": [~5],
\t\t"/lab/[id]": [~44, [3]],
\t};
`.replace('\t};', '};');
    expect(parseDictionary(app)).toEqual({ '/': [4], '/c/[kind]/[id]': [5], '/lab/[id]': [44, 3] });
  });
});
