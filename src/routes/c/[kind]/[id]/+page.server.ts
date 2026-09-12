/**
 * Share-link stub pages (#547 S3) — `/c/<kind>/<id>`.
 *
 * Social crawlers don't execute JS and the app's query-param deep links all
 * serve the same prerendered shell — so per-entity link previews need real
 * static pages. Each stub prerenders with the entity's Open Graph tags
 * (og:image = the S2 card JPEG) and instantly forwards humans into the app
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
import { SITE_ORIGIN } from '$lib/seo';
// Shared enumerator (scripts/site-routes.mjs pattern) — the generator, this
// route and the validate-data parity gate all read the same target sets.
import { stubEntries, aliasStubTargets } from '../../../../../scripts/card-targets.mjs';
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

interface SiteRow {
  id: string;
  kind: 'surface' | 'orbiter';
  mission_id?: string;
}

const missionIndex = (): IndexRow[] =>
  JSON.parse(readFileSync('static/data/missions/index.json', 'utf8')) as IndexRow[];
const fleetIndex = (): FleetIndexRow[] =>
  JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8')) as FleetIndexRow[];
const siteRows = (body: 'moon' | 'mars'): SiteRow[] =>
  JSON.parse(readFileSync(`static/data/${body}-sites.json`, 'utf8')) as SiteRow[];
const planetIds = (): string[] =>
  (
    JSON.parse(readFileSync('static/data/planets.json', 'utf8')) as {
      planets: Array<{ name: string }>;
    }
  ).planets
    .map((p) => p.name.toLowerCase())
    // Pluto's canonical card is the small-body kind (its /explore panel
    // is the SmallBodyPanel).
    .filter((id) => id !== 'pluto');
const satelliteRows = (): Array<{ id: string; parent_planet_id: string }> =>
  (
    JSON.parse(readFileSync('static/data/satellites.json', 'utf8')) as {
      satellites: Array<{ id: string; parent_planet_id: string }>;
    }
  ).satellites;
const smallBodyRows = (): Array<{ id: string; name: string; description?: string }> =>
  (
    JSON.parse(readFileSync('static/data/small-bodies.json', 'utf8')) as {
      bodies: Array<{ id: string; name: string; description?: string }>;
    }
  ).bodies;

export const entries: EntryGenerator = () => stubEntries() as Array<{ kind: string; id: string }>;

export const load: PageServerLoad = ({ params }) => {
  const shared = (title: string, description: string, target: string) => ({
    title,
    description,
    image: `${SITE_ORIGIN}/images/cards/${params.kind}/${params.id}.jpg`,
    pageUrl: `${SITE_ORIGIN}/c/${params.kind}/${params.id}`,
    target,
  });

  const missionOg = (missionId: string): { title: string; description: string } => {
    const row = missionIndex().find((mi) => mi.id === missionId);
    if (!row) throw error(404, 'unknown mission');
    const destLower = row.dest.toLowerCase();
    const overlay = JSON.parse(
      readFileSync(`i18n-src/en-US/missions/${destLower}/${missionId}.json`, 'utf8'),
    ) as { name?: string; description?: string };
    return {
      title: overlay.name ?? missionId,
      description: overlay.description?.split(/(?<=[.!?])\s+/)[0] ?? '',
    };
  };

  // Alias stubs (link permanence): a fleet entry / site whose canonical card
  // is a mission still serves ITS OWN /c/ URL, unfurling the canonical
  // mission's card and landing on the surface the link names.
  const alias = aliasStubTargets().find((a) => a.kind === params.kind && a.id === params.id);
  if (alias) {
    const og = missionOg(alias.canonicalMission);
    const target =
      params.kind === 'fleet'
        ? `/fleet?id=${params.id}`
        : `/${params.kind.replace('-site', '')}?site=${params.id}`;
    return {
      title: og.title,
      description: og.description,
      image: `${SITE_ORIGIN}/images/cards/mission/${alias.canonicalMission}.jpg`,
      pageUrl: `${SITE_ORIGIN}/c/${params.kind}/${params.id}`,
      target,
    };
  }

  if (params.kind === 'mission') {
    const og = missionOg(params.id);
    return shared(og.title, og.description, `/missions?id=${params.id}`);
  }

  if (params.kind === 'moon-site' || params.kind === 'mars-site') {
    const body = params.kind === 'moon-site' ? 'moon' : 'mars';
    const row = siteRows(body).find((s) => s.id === params.id);
    if (!row) throw error(404, 'unknown site');
    let overlay: { name?: string; fact?: string } = {};
    try {
      overlay = JSON.parse(
        readFileSync(`i18n-src/en-US/${body}-sites/${params.id}.json`, 'utf8'),
      ) as { name?: string; fact?: string };
    } catch {
      /* no overlay — id fallback below */
    }
    // Orbiter sites deep-link via ?site= too — ?object= is the /earth
    // satellite layer's param, not the moon/mars orbiter ring's.
    return shared(
      overlay.name ?? params.id,
      overlay.fact?.split(/(?<=[.!?])\s+/)[0] ?? '',
      `/${body}?site=${params.id}`,
    );
  }

  if (params.kind === 'planet') {
    if (!planetIds().includes(params.id)) throw error(404, 'unknown planet');
    const overlay = JSON.parse(
      readFileSync(`i18n-src/en-US/planets/${params.id}.json`, 'utf8'),
    ) as { name?: string; fact?: string };
    return shared(
      overlay.name ?? params.id,
      overlay.fact?.split(/(?<=[.!?])\s+/)[0] ?? '',
      `/explore?id=${params.id}`,
    );
  }

  if (params.kind === 'moon') {
    const row = satelliteRows().find((s) => s.id === params.id);
    if (!row) throw error(404, 'unknown satellite');
    let overlay: { description?: string } = {};
    try {
      overlay = JSON.parse(readFileSync(`i18n-src/en-US/satellites/${params.id}.json`, 'utf8')) as {
        description?: string;
      };
    } catch {
      /* base description fallback handled by empty overlay */
    }
    const sat = (
      JSON.parse(readFileSync('static/data/satellites.json', 'utf8')) as {
        satellites: Array<{ id: string; name: string; description?: string }>;
      }
    ).satellites.find((s) => s.id === params.id)!;
    return shared(
      sat.name,
      (overlay.description ?? sat.description)?.split(/(?<=[.!?])\s+/)[0] ?? '',
      `/explore?id=${row.parent_planet_id}:${params.id}`,
    );
  }

  if (params.kind === 'small-body') {
    const row = smallBodyRows().find((b) => b.id === params.id);
    if (!row) throw error(404, 'unknown small body');
    let overlay: { name?: string; description?: string } = {};
    try {
      overlay = JSON.parse(
        readFileSync(`i18n-src/en-US/small-bodies/${params.id}.json`, 'utf8'),
      ) as { name?: string; description?: string };
    } catch {
      /* base description fallback below */
    }
    return shared(
      overlay.name ?? row.name,
      (overlay.description ?? row.description)?.split(/(?<=[.!?])\s+/)[0] ?? '',
      `/explore?id=${params.id}`,
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
