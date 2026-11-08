import { readFileSync } from 'node:fs';
import { error } from '@sveltejs/kit';
import { getLocale } from '$lib/paraglide/runtime';
import { getBodyEntity } from '$lib/data/body-entity';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /explore/<id> — one planet, moon or small body as an indexable page (0.9.8
 * SEO). The 3D explorer's ?id= panel stays the in-app view; this page links to it.
 */
export const prerender = true;

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

// Pluto is in both planets.json and small-bodies.json; one page (the loader
// takes the planet record first).
export const entries: EntryGenerator = () =>
  [
    ...new Set([
      ...read<{ planets: { name: string }[] }>('static/data/planets.json').planets.map((p) =>
        p.name.toLowerCase(),
      ),
      ...read<{ satellites: { id: string }[] }>('static/data/satellites.json').satellites.map(
        (s) => s.id,
      ),
      ...read<{ bodies: { id: string }[] }>('static/data/small-bodies.json').bodies.map(
        (b) => b.id,
      ),
    ]),
  ].map((id) => ({ id }));

// Moon and small-body names are English in the data; the glossary holds each
// locale's native form (planets carry theirs in the overlay).
const GLOSSARY = read<{ body: Record<string, Record<string, string>> }>(
  'scripts/i18n-tools/native-terms.json',
).body;

export const load: PageServerLoad = async ({ params, fetch }) => {
  const locale = getLocale();
  const body = await getBodyEntity(params.id, locale, fetch);
  if (!body) throw error(404, `Unknown body: ${params.id}`);
  if (body.kind !== 'planet') body.name = GLOSSARY[body.name]?.[locale] ?? body.name;
  return { body };
};
