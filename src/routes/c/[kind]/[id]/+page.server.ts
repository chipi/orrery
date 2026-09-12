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
 * `entries` enumerates from the mission + fleet indexes at build time; more
 * kinds join as their resolvers land (explore, sites — S5+). Fleet entries
 * that share their id with a mission are the same real thing — their
 * canonical stub is /c/mission/<id>, so no fleet duplicate is emitted.
 */
import { readFileSync } from 'node:fs';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;

interface IndexRow {
  id: string;
  dest: string;
}

interface FleetIndexRow {
  id: string;
  name: string;
  category: string;
  tagline?: string;
}

const missionIndex = (): IndexRow[] =>
  JSON.parse(readFileSync('static/data/missions/index.json', 'utf8')) as IndexRow[];
const fleetIndex = (): FleetIndexRow[] =>
  JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8')) as FleetIndexRow[];

export const entries: EntryGenerator = () => {
  const missions = missionIndex();
  const missionIds = new Set(missions.map((mi) => mi.id));
  return [
    ...missions.map((mi) => ({ kind: 'mission', id: mi.id })),
    ...fleetIndex()
      .filter((fi) => !missionIds.has(fi.id))
      .map((fi) => ({ kind: 'fleet', id: fi.id })),
  ];
};

/** Public origin for absolute og:image / og:url — crawlers need absolute
 *  URLs, and previews should always point at prod regardless of which
 *  deploy served the stub. */
const PUBLIC_ORIGIN = 'https://www.orrerylearn.com';

export const load: PageServerLoad = ({ params }) => {
  const shared = (title: string, description: string, target: string) => ({
    title,
    description,
    image: `${PUBLIC_ORIGIN}/images/cards/${params.kind}/${params.id}.jpg`,
    pageUrl: `${PUBLIC_ORIGIN}/c/${params.kind}/${params.id}`,
    target,
  });

  if (params.kind === 'mission') {
    const row = missionIndex().find((mi) => mi.id === params.id);
    if (!row) throw error(404, 'unknown mission');
    const destLower = row.dest.toLowerCase();
    const overlay = JSON.parse(
      readFileSync(`i18n-src/en-US/missions/${destLower}/${params.id}.json`, 'utf8'),
    ) as { name?: string; description?: string };
    return shared(
      overlay.name ?? params.id,
      overlay.description?.split(/(?<=[.!?])\s+/)[0] ?? '',
      `/missions?id=${params.id}`,
    );
  }

  if (params.kind === 'fleet') {
    const row = fleetIndex().find((fi) => fi.id === params.id);
    if (!row) throw error(404, 'unknown fleet entry');
    // Phase-A skeleton entries ship no en-US overlay — fall back to the
    // index row (name + tagline are always present there).
    let overlay: { name?: string; tagline?: string } = {};
    try {
      overlay = JSON.parse(
        readFileSync(`i18n-src/en-US/fleet/${row.category}/${params.id}.json`, 'utf8'),
      ) as { name?: string; tagline?: string };
    } catch {
      /* no overlay — index fallback below */
    }
    return shared(
      overlay.name ?? row.name,
      overlay.tagline ?? row.tagline ?? '',
      `/fleet?id=${params.id}`,
    );
  }

  throw error(404, 'unknown card kind');
};
