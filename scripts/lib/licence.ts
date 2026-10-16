/**
 * Licence-gate helpers for scripts/build-tech-bom.ts (#592).
 */

/**
 * Whether an SPDX licence expression is acceptable under `allowed`.
 * `A AND B` needs every part allowed (all terms apply); `A OR B` needs any part
 * (we may choose); parentheses group; `X WITH exception` is judged on `X`.
 * Anything that does not parse is rejected — the gate is fail-closed.
 */
export function licenceAllowed(expression: string, allowed: ReadonlySet<string>): boolean {
  const tokens = expression.match(/\(|\)|[^\s()]+/g) ?? [];
  let i = 0;
  const peek = () => tokens[i];

  // or := and ('OR' and)* ; and := atom ('AND' atom)* ; atom := '(' or ')' | id ['WITH' id]
  function parseOr(): boolean {
    let ok = parseAnd();
    while (peek()?.toUpperCase() === 'OR') {
      i++;
      ok = parseAnd() || ok;
    }
    return ok;
  }
  function parseAnd(): boolean {
    let ok = parseAtom();
    while (peek()?.toUpperCase() === 'AND') {
      i++;
      ok = parseAtom() && ok;
    }
    return ok;
  }
  function parseAtom(): boolean {
    const t = tokens[i++];
    if (t === undefined || t === ')') throw new Error('unexpected end');
    if (t === '(') {
      const ok = parseOr();
      if (tokens[i++] !== ')') throw new Error('unbalanced parenthesis');
      return ok;
    }
    if (/^(AND|OR|WITH)$/i.test(t)) throw new Error(`operator where a licence was expected: ${t}`);
    if (peek()?.toUpperCase() === 'WITH') {
      i++;
      if (tokens[i++] === undefined) throw new Error('WITH without an exception');
    }
    return allowed.has(t);
  }

  try {
    const ok = parseOr();
    return i === tokens.length && ok;
  } catch {
    return false;
  }
}

/**
 * `name@version` of every package the lockfile marks `"dev": true` (reachable only
 * through devDependencies) at EVERY path it is installed at — one runtime copy of the
 * same version keeps it runtime. `npm ls` lists a platform-skipped optional package as
 * "extraneous" at the root, so it lands in the `--omit=dev` closure too; sharp
 * 0.35's `@img/sharp-wasm32` was classed runtime that way. The lockfile is the
 * authority for the dev flag.
 */
export function lockfileDevKeys(lock: {
  packages?: Record<string, { name?: string; version?: string; dev?: boolean }>;
}): Set<string> {
  const dev = new Set<string>();
  const runtime = new Set<string>();
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (!path || !entry.version) continue;
    const name =
      entry.name ?? path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
    (entry.dev ? dev : runtime).add(`${name}@${entry.version}`);
  }
  for (const k of runtime) dev.delete(k);
  return dev;
}
