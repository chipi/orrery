/**
 * `EsaSource` — ESA Space Transportation RSS feed scraper.
 *
 * After honest live-source investigation (PRD-020 follow-up): the
 * /Press_Releases page is HTML-only and noisy. The actual usable
 * feed for launch announcements is the dedicated Space Transportation
 * RSS at /rssfeed/Our_Activities/Space_Transportation — emits items
 * like "Smile launch highlights", "Smile lifts off on quest to …".
 * Mostly post-launch coverage but real launch-data signal.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { LaunchSource, LaunchSourceAttribution, LaunchSourceWindow } from './provider.js';
import type { RawLaunchEntry } from '../types.js';
import { buildStableId } from '../id.js';

const ESA_URL = 'https://www.esa.int/rssfeed/Our_Activities/Space_Transportation';
const CACHE_PATH = '.launches-cache/esa/space-transportation.xml';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Match titles where ESA actually surfaces launch events. Patterns
 * derived from the live 2026-05 feed:
 *   "Smile lifts off on quest to …"  → liftoff
 *   "Smile launch highlights"        → launch (post)
 *   "How to follow the Smile launch live"  → launch (pre)
 *   "Ariane 6 launches Galileo G2" (historical) → launches verb
 */
const LAUNCH_PATTERN =
  /(?:(?<vehicle>Ariane\s?\d+\w*|Vega-?C?|Soyuz)\s+(?:launches|returns to flight with|carries)\s+(?<mission1>[^.]+))|(?:^(?<mission2>[A-Z][\w-]+)\s+(?:lifts off|launch(?:es)?)\b)/i;

type ParsedArticle = { title: string; isoDate: string; description: string };

/** Parses an RSS feed (XML); also accepts the older HTML fixture shape. */
export function parseEsaHtml(xml: string): ParsedArticle[] {
  // RSS path — what the live ESA feed actually returns.
  const items: ParsedArticle[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title =
      block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? '';
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    const description =
      block
        .match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]
        ?.trim() ?? '';
    if (title && pubDate) {
      const isoDate = new Date(pubDate).toISOString();
      items.push({ title, isoDate, description });
    }
  }
  if (items.length > 0) return items;
  // Fallback for the legacy HTML fixture shape (used by the snapshot test).
  const articleRe = /<article[^>]*class="press-release"[^>]*>([\s\S]*?)<\/article>/g;
  while ((m = articleRe.exec(xml)) !== null) {
    const block = m[1];
    const title = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]?.trim();
    const isoDate = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
    const description = block.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1]?.trim() ?? '';
    if (title && isoDate) items.push({ title, isoDate, description });
  }
  return items;
}

export function esaArticleToRawEntry(
  art: ParsedArticle,
  source_observed_at: string,
): RawLaunchEntry | null {
  const match = art.title.match(LAUNCH_PATTERN);
  if (!match || !match.groups) return null;
  const vehicle = match.groups.vehicle?.trim();
  const missionName = (match.groups.mission1 ?? match.groups.mission2 ?? '').trim();
  if (!missionName) return null;
  const rocketFamily = vehicle ?? 'Unknown';
  const iso = new Date(art.isoDate).toISOString();
  if (Number.isNaN(Date.parse(iso))) return null;
  return {
    id: buildStableId({ iso, rocketFamily, missionName }),
    net: iso,
    net_precision: 'minute',
    status: { code: 'SUCCESS', label: 'Launched' },
    name: `${rocketFamily} | ${missionName}`,
    mission_name: missionName,
    agency_name: 'European Space Agency',
    agency_type: 'Multinational',
    rocket_config_name: rocketFamily,
    rocket_family: rocketFamily,
    pad_name: "Europe's Spaceport, Kourou, French Guiana",
    source_observed_at,
    source_name: 'esa-direct',
  };
}

async function downloadIfStale(): Promise<string> {
  if (existsSync(CACHE_PATH)) {
    const age = Date.now() - statSync(CACHE_PATH).mtimeMs;
    if (age < ONE_DAY_MS / 2) return readFileSync(CACHE_PATH, 'utf8');
  }
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  const res = await fetch(ESA_URL, {
    headers: { 'user-agent': 'OrreryLaunchesBot/0.1' },
    redirect: 'follow',
  });
  if (!res.ok) {
    if (existsSync(CACHE_PATH)) return readFileSync(CACHE_PATH, 'utf8');
    throw new Error(`ESA ${res.status}`);
  }
  const html = await res.text();
  writeFileSync(CACHE_PATH, html, 'utf8');
  return html;
}

export class EsaSource implements LaunchSource {
  readonly name = 'esa-direct';
  readonly priority = 12;
  readonly mode = 'both';
  readonly defaultRole = 'primary';

  constructor(private readonly downloader: () => Promise<string> = downloadIfStale) {}

  async fetchWindow(input: LaunchSourceWindow): Promise<RawLaunchEntry[]> {
    let html: string;
    try {
      html = await this.downloader();
    } catch {
      return [];
    }
    const arts = parseEsaHtml(html);
    const observed_at = new Date().toISOString();
    const from = Date.parse(input.fromIso);
    const to = Date.parse(input.toIso);
    const entries: RawLaunchEntry[] = [];
    for (const a of arts) {
      const e = esaArticleToRawEntry(a, observed_at);
      if (!e) continue;
      const t = Date.parse(e.net);
      if (t >= from && t < to) entries.push(e);
    }
    return entries;
  }

  attribution(): LaunchSourceAttribution {
    return {
      citation: 'European Space Agency press releases',
      url: 'https://www.esa.int/Press_Releases',
      license: 'CC-BY-3.0-IGO',
      citation_id: 'esa-press',
    };
  }
}
