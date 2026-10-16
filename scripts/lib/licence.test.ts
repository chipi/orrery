import { describe, expect, it } from 'vitest';
import { licenceAllowed, lockfileDevKeys } from './licence';

const ALLOW = new Set(['MIT', 'Apache-2.0', 'LGPL-3.0-or-later', 'BSD-3-Clause']);

describe('licenceAllowed (#592)', () => {
  it.each([
    ['MIT', true],
    ['GPL-3.0-only', false],
    // sharp 0.35's @img/sharp-wasm32 — every AND part allowlisted.
    ['Apache-2.0 AND LGPL-3.0-or-later AND MIT', true],
    ['Apache-2.0 AND GPL-3.0-only', false],
    ['(MIT OR GPL-3.0-only)', true],
    ['GPL-3.0-only OR AGPL-3.0-only', false],
    ['(MIT OR GPL-2.0) AND BSD-3-Clause', true],
    ['(MIT OR GPL-2.0) AND GPL-3.0-only', false],
    ['MIT AND (GPL-2.0 OR Apache-2.0)', true],
    ['Apache-2.0 WITH LLVM-exception', true],
    ['mit and apache-2.0', false], // ids are case-sensitive; operators are not
    ['MIT and Apache-2.0', true],
  ])('%s -> %s', (expr, want) => {
    expect(licenceAllowed(expr, ALLOW)).toBe(want);
  });

  it.each([
    '',
    'UNKNOWN',
    'MIT AND',
    '(MIT',
    'MIT)',
    'AND MIT',
    'MIT MIT',
    'SEE LICENSE IN LICENSE',
  ])('rejects malformed or unknown %j (fail-closed)', (expr) => {
    expect(licenceAllowed(expr, ALLOW)).toBe(false);
  });
});

describe('lockfileDevKeys (#592)', () => {
  it('collects only dev-flagged packages, keyed name@version, nested paths included', () => {
    const keys = lockfileDevKeys({
      packages: {
        '': { name: 'orrery', version: '0.9.0' },
        'node_modules/@img/sharp-wasm32': { version: '0.35.5', dev: true },
        'node_modules/three': { version: '0.185.1' },
        'node_modules/@capacitor/assets/node_modules/sharp': { version: '0.32.6', dev: true },
        'node_modules/opt-runtime': { version: '1.0.0' },
      },
    });
    expect([...keys].sort()).toEqual(['@img/sharp-wasm32@0.35.5', 'sharp@0.32.6']);
  });

  it('a version installed both dev-only and runtime stays runtime', () => {
    const keys = lockfileDevKeys({
      packages: {
        'node_modules/tooling/node_modules/semver': { version: '7.8.5', dev: true },
        'node_modules/semver': { version: '7.8.5' },
        'node_modules/yargs': { version: '17.7.2', dev: true },
      },
    });
    expect([...keys]).toEqual(['yargs@17.7.2']);
  });
});
