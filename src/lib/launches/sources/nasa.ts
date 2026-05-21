/**
 * `NasaSource` — NASA news-release RSS feed.
 *
 * REALITY CHECK (after live-source investigation, 2026-05-21): NASA's
 * /news-release/feed/ contains roughly zero launch-announcement items
 * at any given time. Press releases are dominated by competition
 * announcements, mission-progress updates, and educational programmes.
 * Actual launch announcements live in per-mission press kits hosted
 * under launches.nasa.gov, kennedy.nasa.gov, and per-centre subsites —
 * each of which would require a bespoke scraper.
 *
 * For PRD-020 we therefore accept that NasaSource returns ~zero entries
 * on most days. The orchestrator's audit-report.html surfaces this gap
 * (every NASA-led launch falls through to LL2 fallback-primary). A
 * proper fix would need per-mission press-kit discovery + ATS-friendly
 * structured parsing — out of scope for v0.7.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { LaunchSource, LaunchSourceAttribution, LaunchSourceWindow } from './provider.js';
import type { RawLaunchEntry } from '../types.js';
import { buildStableId } from '../id.js';

const NASA_RSS_URL = 'https://www.nasa.gov/news-release/feed/';
const CACHE_PATH = '.launches-cache/nasa/news-release.xml';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const LAUNCH_PATTERN =
  /^(NASA|ULA|SpaceX|Northrop[\s-]?Grumman|Blue\s?Origin|Rocket\s?Lab)[^A-Z]*Launches?[^A-Z]+(.+)$/i;

type ParsedItem = { title: string; pubDate: string; description: string };

export function parseNasaRssXml(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '';
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? '';
    const description =
      block.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim() ?? '';
    if (title && pubDate) items.push({ title, pubDate, description });
  }
  return items;
}

export function rssItemToRawEntry(
  item: ParsedItem,
  source_observed_at: string,
): RawLaunchEntry | null {
  // Decode common entities (&amp; &#8211; &nbsp;)
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&#8211;/g, '-')
      .replace(/&nbsp;/g, ' ');

  const title = decode(item.title);
  const m = title.match(LAUNCH_PATTERN);
  if (!m) return null;
  const missionName = m[2].trim();
  const iso = new Date(item.pubDate).toISOString();
  // Try to extract a vehicle from the description; fallback to "Unknown".
  const descMatch = decode(item.description).match(/\b(Falcon\s?[A-Z0-9]+|Atlas\s?V|Delta\s?IV|Saturn\s?V|SLS|Ariane\s?\d+|Vega-?C|Antares|Electron|Soyuz\b)/i);
  const rocketFamily = descMatch?.[1]?.trim() ?? 'Unknown';
  return {
    id: buildStableId({ iso, rocketFamily, missionName }),
    net: iso,
    net_precision: 'minute',
    status: { code: 'SUCCESS', label: 'Launched' },
    name: `${rocketFamily} | ${missionName}`,
    mission_name: missionName,
    agency_name: 'NASA',
    agency_type: 'Government',
    rocket_config_name: rocketFamily,
    rocket_family: rocketFamily,
    source_observed_at,
    source_name: 'nasa-direct',
  };
}

async function downloadIfStale(): Promise<string> {
  if (existsSync(CACHE_PATH)) {
    const age = Date.now() - statSync(CACHE_PATH).mtimeMs;
    if (age < ONE_DAY_MS / 2) return readFileSync(CACHE_PATH, 'utf8');
  }
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  const res = await fetch(NASA_RSS_URL);
  if (!res.ok) {
    if (existsSync(CACHE_PATH)) return readFileSync(CACHE_PATH, 'utf8');
    throw new Error(`NASA RSS ${res.status}`);
  }
  const xml = await res.text();
  writeFileSync(CACHE_PATH, xml, 'utf8');
  return xml;
}

export class NasaSource implements LaunchSource {
  readonly name = 'nasa-direct';
  readonly priority = 10;
  readonly mode = 'both';
  readonly defaultRole = 'primary';

  constructor(private readonly downloader: () => Promise<string> = downloadIfStale) {}

  async fetchWindow(input: LaunchSourceWindow): Promise<RawLaunchEntry[]> {
    let xml: string;
    try {
      xml = await this.downloader();
    } catch {
      return [];
    }
    const items = parseNasaRssXml(xml);
    const observed_at = new Date().toISOString();
    const from = Date.parse(input.fromIso);
    const to = Date.parse(input.toIso);
    const entries: RawLaunchEntry[] = [];
    for (const item of items) {
      const e = rssItemToRawEntry(item, observed_at);
      if (!e) continue;
      const t = Date.parse(e.net);
      if (t >= from && t < to) entries.push(e);
    }
    return entries;
  }

  attribution(): LaunchSourceAttribution {
    return {
      citation: 'NASA news releases — public domain (17 U.S.C. §105)',
      url: 'https://www.nasa.gov/news/',
      license: 'PD-NASA',
      citation_id: 'nasa-news',
    };
  }
}
