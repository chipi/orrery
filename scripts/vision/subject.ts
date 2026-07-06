/**
 * Subject resolver for vision scoring (PRD-018 / RFC-022 — subject-match
 * elevation, 0.7.3). Builds the CONTEXT hint the vision model uses to judge
 * whether an image is ABOUT what a slot is for. ENTITY-AWARE: it loads the
 * mission catalog (agency + destination folder) so the hint can say
 * "rosetta — an ESA mission to a comet", letting the model recognise a
 * mission's own science imagery (a comet 67P photo IS on-subject for Rosetta)
 * instead of flagging it off just because it only saw the bare id "rosetta".
 * Corpus evidence (2026-07 missions pass) proved the id-only hint over-flagged
 * legitimate target/science imagery at score 9; enrichment fixes that.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface SubjectSource {
  id?: string;
  agency?: string;
}

interface Identity {
  agency?: string;
  target?: string;
}

// Lazy identity map: mission id -> { agency (from JSON), target (dest folder) }.
let _identity: Record<string, Identity> | null = null;
function identityMap(): Record<string, Identity> {
  if (_identity) return _identity;
  _identity = {};
  const root = path.join('static', 'data', 'missions');
  let dests: string[];
  try {
    dests = readdirSync(root);
  } catch {
    return _identity; // catalog unreachable — enrichment simply absent
  }
  for (const dest of dests) {
    let files: string[];
    try {
      files = readdirSync(path.join(root, dest));
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const id = f.slice(0, -5);
      let agency: string | undefined;
      try {
        agency = JSON.parse(readFileSync(path.join(root, dest, f), 'utf-8')).agency;
      } catch {
        /* keep the target even if the file won't parse */
      }
      _identity[id] = { agency, target: dest };
    }
  }
  return _identity;
}

function surfaceOf(imagePath: string): string | null {
  const m = imagePath.match(/\/images\/([^/]+)\//);
  return m ? m[1] : null;
}

const BODY_SURFACES = new Set([
  'moon',
  'mars',
  'earth',
  'mercury',
  'venus',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'sun',
  'pluto',
]);

/**
 * Public identity lookup — mission id -> { agency, target }. Reused by
 * fetch-query construction (fill-gallery-gaps) so re-fetches aren't poisoned
 * by bare ids (e.g. "juice" -> orange juice).
 */
export function resolveIdentity(id: string): Identity | undefined {
  return identityMap()[id];
}

export function resolveSubject(imagePath: string, source: SubjectSource = {}): string | undefined {
  const surface = surfaceOf(imagePath);
  if (!surface) return undefined;

  const id = source.id;
  const ident = id ? identityMap()[id] : undefined;
  const agency = ident?.agency ?? source.agency;
  const target = ident?.target;

  const idBits: string[] = [];
  if (id) idBits.push(`"${id}"`);
  if (agency) idBits.push(`a ${agency} mission/craft`);
  if (target) idBits.push(`destination/target: ${target}`);
  const idClause = idBits.length ? `This entry is ${idBits.join(', ')}. ` : '';

  if (BODY_SURFACES.has(surface)) {
    return `${idClause}The planetary body / surface of ${surface} — the frame should show that world itself, not an unrelated object.`;
  }
  if (surface === 'missions') {
    const t = target ?? 'the world it explored';
    return `${idClause}A real space mission — the frame should show its spacecraft, launch, flight hardware, its actual flight crew, or its target (${t}) / science imagery.`;
  }
  if (surface === 'fleet-galleries' || surface === 'fleet') {
    return `${idClause}A real spacecraft or launch vehicle — the frame should show the CRAFT itself: the vehicle, its flight hardware, its launch, or the vehicle AT its destination. A bare planet or target image with no spacecraft in frame does NOT belong in this hardware gallery.`;
  }
  if (surface === 'posters') {
    return `${idClause}A stylised space poster / artwork.`;
  }
  return `${idClause}Space imagery for the "${surface}" collection.`;
}
