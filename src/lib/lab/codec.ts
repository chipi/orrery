/**
 * Notebook serialization codec (S3c · RFC-037 §10 S3 · plan B2, freeze).
 *
 * The share/save grammar for a notebook. THREE sinks, one codec:
 *   - URL-compact: `1.<base64url>` — a version prefix then a minified cell array.
 *   - localStorage (session) + `.orrlab.json` (durable) reuse `encode`/`decode`.
 *
 * Grammar (frozen at v1):
 *   `<version>.<base64url(JSON)>` where JSON is `SerCell[]`:
 *     { f: formulaId, i: inputs, s?: selection, w?: [{from: index, out, to}] }
 *   - **index-based wires** (`from` is the source cell's position, not an id) —
 *     the engine model (`notebook.ts`). Ids are a UI concern, regenerated on load.
 *   - **selection INCLUDED** (plan B2.3): a dropped porkchop pick silently changes a
 *     downstream result, so it must round-trip. Inert for M1 (no selection formulas yet).
 *   - **note/title EXCLUDED**: user free text never goes in a URL (localStorage/.orrlab only).
 *
 * This is the UNTRUSTED boundary the S3a+S3b opus review hardened the engine for.
 * `decode` sanitises every field so a hostile link degrades fail-honest, never
 * crashes and never smuggles an out-of-domain value into the kernel:
 *   - a bad version / bad base64 / non-array payload → null (caller shows "couldn't load");
 *   - inputs are CLAMPED to each formula's `FieldSpec` (number→finite+min/max; enum/body→
 *     membership-or-default; unknown key dropped) — so a hostile `body: "xyzzy"` can never
 *     reach `bodyGravityMs2` (which throws); it decodes to the field default;
 *   - wires keep only well-formed `{integer ≥ 0, string, string}` shapes (the engine
 *     further un-honours forward/cyclic/out-of-range indices);
 *   - an unknown `formulaId` is preserved verbatim so the engine surfaces `unknown-formula`.
 */
import type { Registry, FormulaDef, FieldSpec, Notebook, Card } from '$lib/physics/spec';
import type { Cell, CellWire } from './notebook';

/** Frozen schema version. Bump only on a breaking grammar change (with a migration). */
export const NOTEBOOK_CODEC_VERSION = 1;

/** A codec cell = an engine Cell plus the (inert-for-M1) interactive selection. */
export interface CodecCell extends Cell {
  selection?: Record<string, number | string>;
}

// ─── base64url (UTF-8 safe, browser + Node) ──────────────────────────────────
function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ─── Encode ───────────────────────────────────────────────────────────────────
interface SerWire {
  from: number;
  out: string;
  to: string;
}
interface SerCell {
  f: string;
  i: Record<string, number | string>;
  s?: Record<string, number | string>;
  w?: SerWire[];
}

export function encodeNotebook(cells: CodecCell[]): string {
  const dto: SerCell[] = cells.map((c) => {
    const e: SerCell = { f: c.formulaId, i: c.inputs };
    if (c.selection && Object.keys(c.selection).length > 0) e.s = c.selection;
    const ws = (c.wires ?? []).filter((w) => Number.isInteger(w.fromIndex) && w.fromIndex >= 0);
    if (ws.length > 0) e.w = ws.map((w) => ({ from: w.fromIndex, out: w.output, to: w.toInput }));
    return e;
  });
  return `${NOTEBOOK_CODEC_VERSION}.${toB64Url(JSON.stringify(dto))}`;
}

// ─── Decode (untrusted) ─────────────────────────────────────────────────────
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Clamp a raw input map to a formula's declared FieldSpec domain. */
function sanitizeInputs(
  def: FormulaDef | undefined,
  raw: unknown,
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  if (!def) return out; // unknown formula → inputs irrelevant (engine → unknown-formula)
  const src = isRecord(raw) ? raw : {};
  for (const field of def.inputs) {
    out[field.key] = clampField(field, src[field.key]);
  }
  return out;
}

function clampField(field: FieldSpec, v: unknown): number | string {
  switch (field.kind) {
    case 'number': {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
      if (!Number.isFinite(n)) return field.default;
      let c = n;
      if (typeof field.min === 'number') c = Math.max(field.min, c);
      if (typeof field.max === 'number') c = Math.min(field.max, c);
      return c;
    }
    case 'enum': {
      const ok = (field.enumValues ?? []).some((e) => e.value === v);
      return ok ? (v as string) : field.default;
    }
    case 'body': {
      const ok = (field.bodyIds ?? []).includes(v as string);
      return ok ? (v as string) : field.default; // hostile body can never reach the kernel
    }
    case 'date':
      return typeof v === 'string' ? v : field.default;
  }
}

function sanitizeRecord(raw: unknown): Record<string, number | string> | undefined {
  if (!isRecord(raw)) return undefined;
  const out: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string') out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sanitizeWires(raw: unknown): Cell['wires'] {
  if (!Array.isArray(raw)) return undefined;
  const wires = raw
    .filter(
      (w): w is SerWire =>
        isRecord(w) &&
        Number.isInteger(w.from) &&
        (w.from as number) >= 0 &&
        typeof w.out === 'string' &&
        typeof w.to === 'string',
    )
    .map((w) => ({ fromIndex: w.from, output: w.out, toInput: w.to }));
  return wires.length > 0 ? wires : undefined;
}

/**
 * Decode a share string into cells, sanitising every field. Returns null on a
 * version mismatch, bad base64, or a non-array payload — the caller then leaves
 * the current notebook untouched and can surface "couldn't load that link".
 */
export function decodeNotebook(s: string, registry: Registry): CodecCell[] | null {
  const dot = s.indexOf('.');
  if (dot <= 0) return null;
  if (Number(s.slice(0, dot)) !== NOTEBOOK_CODEC_VERSION) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fromB64Url(s.slice(dot + 1)));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const cells: CodecCell[] = [];
  for (const raw of parsed) {
    if (!isRecord(raw) || typeof raw.f !== 'string') continue;
    const def = registry.get(raw.f);
    const cell: CodecCell = { formulaId: raw.f, inputs: sanitizeInputs(def, raw.i) };
    const sel = sanitizeRecord(raw.s);
    if (sel) cell.selection = sel;
    const wires = sanitizeWires(raw.w);
    if (wires) cell.wires = wires;
    cells.push(cell);
  }
  return cells;
}

// ─── .orrlab.json (durable file) ────────────────────────────────────────────
// The frozen `Notebook`/`Card` document format (spec.ts) — the durable sibling of
// the URL codec. It uses ID-based wires (`Card.wires.fromCard`), so this converts
// between the engine's index wires and the file's id wires (plan B2.1). The file
// carries `title` + per-card `note` (user free text kept OUT of the URL).

/** The cell shape encodeOrrlab reads: a UI cell (stable id) + optional note. */
export interface OrrlabCell extends CodecCell {
  id: string;
  note?: string;
}

export function encodeOrrlab(cells: OrrlabCell[], title: string): Notebook {
  const cards: Card[] = cells.map((c) => {
    const card: Card = { id: c.id, formulaId: c.formulaId, inputs: c.inputs };
    const wires = (c.wires ?? [])
      .filter((w) => cells[w.fromIndex] !== undefined) // valid source index
      .map((w) => ({ fromCard: cells[w.fromIndex].id, output: w.output, toInput: w.toInput }));
    if (wires.length > 0) card.wires = wires;
    if (c.selection && Object.keys(c.selection).length > 0) card.selection = c.selection;
    if (c.note) card.note = c.note;
    return card;
  });
  return { orrlab: 1, title, cards };
}

/**
 * Decode a parsed `.orrlab.json` object (UNTRUSTED). Same sanitisation as the URL
 * codec — inputs clamped to FieldSpec, unknown formula preserved — plus id→index
 * wire rehydration. Returns null on a wrong/absent version or a non-array `cards`.
 */
export function decodeOrrlab(
  json: unknown,
  registry: Registry,
): { title: string; cells: CodecCell[] } | null {
  if (!isRecord(json) || json.orrlab !== NOTEBOOK_CODEC_VERSION || !Array.isArray(json.cards)) {
    return null;
  }
  const rawCards = json.cards.filter(isRecord);
  const idToIndex = new Map<string, number>();
  rawCards.forEach((c, i) => {
    if (typeof c.id === 'string') idToIndex.set(c.id, i);
  });

  const cells: CodecCell[] = [];
  for (const rc of rawCards) {
    if (typeof rc.formulaId !== 'string') continue;
    const def = registry.get(rc.formulaId);
    const cell: CodecCell = { formulaId: rc.formulaId, inputs: sanitizeInputs(def, rc.inputs) };
    const sel = sanitizeRecord(rc.selection);
    if (sel) cell.selection = sel;
    if (Array.isArray(rc.wires)) {
      const wires = rc.wires
        .filter(isRecord)
        .map((w): CellWire | null => {
          const from = typeof w.fromCard === 'string' ? idToIndex.get(w.fromCard) : undefined;
          if (from === undefined || typeof w.output !== 'string' || typeof w.toInput !== 'string') {
            return null;
          }
          return { fromIndex: from, output: w.output, toInput: w.toInput };
        })
        .filter((w): w is CellWire => w !== null);
      if (wires.length > 0) cell.wires = wires;
    }
    cells.push(cell);
  }
  const title = typeof json.title === 'string' ? json.title : 'Notebook';
  return { title, cells };
}
