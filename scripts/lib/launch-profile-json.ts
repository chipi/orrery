/** Shared by the launch-profile fit scripts (`fit-launch-timeline.ts`, `fit-launch-states.ts`). */

/** `stages[1].separationDelayS` / `boosters` / `fairingJettisonS` → [container, key]. */
export function slot(p: Record<string, unknown>, path: string): [Record<string, unknown>, string] {
  const parts = path.match(/[^.[\]]+/g)!;
  let o: Record<string, unknown> = p;
  for (const k of parts.slice(0, -1)) o = o[k] as Record<string, unknown>;
  return [o, parts.at(-1)!];
}

/** Apply a spec's `set` map (`{ "stages[3].ignitionS": 676 }`) to a profile in place. */
export function applySet(p: object, set: Record<string, unknown> = {}): void {
  for (const [path, v] of Object.entries(set)) {
    const [o, k] = slot(p as Record<string, unknown>, path);
    o[k] = v;
  }
}

/** The launch-profile JSON style: a value that fits the line stays on one line, else expands. */
export function stringifyProfile(v: unknown, indent = ''): string {
  const flat = JSON.stringify(v, null, 1)
    .replace(/\n\s*/g, ' ')
    .replace(/\[ /g, '[')
    .replace(/ \]/g, ']');
  if (typeof v !== 'object' || v === null || indent.length + flat.length <= 96) {
    return flat;
  }
  const inner = indent + '  ';
  if (Array.isArray(v))
    return `[\n${v.map((x) => inner + stringifyProfile(x, inner)).join(',\n')}\n${indent}]`;
  const rows = Object.entries(v).map(
    ([k, x]) => `${inner}${JSON.stringify(k)}: ${stringifyProfile(x, inner)}`,
  );
  return `{\n${rows.join(',\n')}\n${indent}}`;
}
