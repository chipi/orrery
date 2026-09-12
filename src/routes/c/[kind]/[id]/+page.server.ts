/**
 * Share-link stub pages (#547 S3) — `/c/<kind>/<id>`.
 *
 * Social crawlers don't execute JS and the app's query-param deep links all
 * serve the same prerendered shell — so per-entity link previews need real
 * static pages. Each stub prerenders with the entity's Open Graph tags
 * (og:image = the S2 card PNG) and instantly forwards humans into the app
 * view. The card overlay shares THESE urls: recipients get the unfurled
 * card in the chat/social preview, then land on the live panel.
 *
 * `entries` enumerates from the mission index at build time; more kinds
 * join as their resolvers land (fleet, explore, sites — S4+).
 */
import { readFileSync } from 'node:fs';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;

interface IndexRow {
  id: string;
  dest: string;
}

export const entries: EntryGenerator = () => {
  const index = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8')) as IndexRow[];
  return index.map((mi) => ({ kind: 'mission', id: mi.id }));
};

/** Public origin for absolute og:image / og:url — crawlers need absolute
 *  URLs, and previews should always point at prod regardless of which
 *  deploy served the stub. */
const PUBLIC_ORIGIN = 'https://www.orrerylearn.com';

export const load: PageServerLoad = ({ params }) => {
  if (params.kind !== 'mission') throw error(404, 'unknown card kind');
  const index = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8')) as IndexRow[];
  const row = index.find((mi) => mi.id === params.id);
  if (!row) throw error(404, 'unknown mission');

  const destLower = row.dest.toLowerCase();
  const overlay = JSON.parse(
    readFileSync(`i18n-src/en-US/missions/${destLower}/${params.id}.json`, 'utf8'),
  ) as { name?: string; description?: string };

  return {
    title: overlay.name ?? params.id,
    description: overlay.description?.split(/(?<=[.!?])\s+/)[0] ?? '',
    image: `${PUBLIC_ORIGIN}/images/cards/mission/${params.id}.png`,
    pageUrl: `${PUBLIC_ORIGIN}/c/mission/${params.id}`,
    target: `/missions?id=${params.id}`,
  };
};
