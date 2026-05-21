/**
 * `SpaceXSource` — spacex.com/launches scraper.
 *
 * SpaceX's /launches page is JS-rendered; the first-paint HTML is a thin
 * shell. v0.1 parser walks `<article class="launch">` elements which the
 * page documents using. Live-source extraction (with proper SPA hydration
 * or unofficial endpoint) is a v0.2 hardening task.
 *
 * Per RFC-023 §12.2: provider may return zero entries v0.1. Orchestrator
 * falls back to LL2.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { LaunchSource, LaunchSourceAttribution, LaunchSourceWindow } from './provider.js';
import type { RawLaunchEntry } from '../types.js';
import { buildStableId } from '../id.js';

const SPACEX_URL = 'https://www.spacex.com/launches/';
const CACHE_PATH = '.launches-cache/spacex/launches.html';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type ParsedArticle = {
  title: string;
  isoDate: string;
  vehicle: string;
  pad: string;
};

export function parseSpaceXHtml(html: string): ParsedArticle[] {
  const out: ParsedArticle[] = [];
  const articleRe = /<article[^>]*class="[^"]*launch[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  let m: RegExpExecArray | null;
  while ((m = articleRe.exec(html)) !== null) {
    const block = m[1];
    const title = block.match(/<h2[^>]*class="launch__title"[^>]*>([\s\S]*?)<\/h2>/)?.[1]?.trim();
    const isoDate = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
    const vehicle = block
      .match(/<p[^>]*class="launch__vehicle"[^>]*>([\s\S]*?)<\/p>/)?.[1]
      ?.trim();
    const pad = block.match(/<p[^>]*class="launch__pad"[^>]*>([\s\S]*?)<\/p>/)?.[1]?.trim();
    if (title && isoDate && vehicle) {
      out.push({ title, isoDate, vehicle, pad: pad ?? '' });
    }
  }
  return out;
}

export function spaceXArticleToRawEntry(
  art: ParsedArticle,
  source_observed_at: string,
): RawLaunchEntry | null {
  const iso = new Date(art.isoDate).toISOString();
  if (Number.isNaN(Date.parse(iso))) return null;
  const rocketFamily = art.vehicle.replace(/\s+/g, ' ').trim();
  return {
    id: buildStableId({ iso, rocketFamily, missionName: art.title }),
    net: iso,
    net_precision: 'minute',
    status: { code: 'GO', label: 'Go for Launch' },
    name: `${rocketFamily} | ${art.title}`,
    mission_name: art.title,
    agency_name: 'SpaceX',
    agency_type: 'Commercial',
    rocket_config_name: rocketFamily,
    rocket_family: rocketFamily,
    pad_name: art.pad || undefined,
    source_observed_at,
    source_name: 'spacex-direct',
  };
}

async function downloadIfStale(): Promise<string> {
  if (existsSync(CACHE_PATH)) {
    const age = Date.now() - statSync(CACHE_PATH).mtimeMs;
    if (age < ONE_DAY_MS / 2) return readFileSync(CACHE_PATH, 'utf8');
  }
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  const res = await fetch(SPACEX_URL, { headers: { 'user-agent': 'OrreryLaunchesBot/0.1' } });
  if (!res.ok) {
    if (existsSync(CACHE_PATH)) return readFileSync(CACHE_PATH, 'utf8');
    throw new Error(`SpaceX ${res.status}`);
  }
  const html = await res.text();
  writeFileSync(CACHE_PATH, html, 'utf8');
  return html;
}

export class SpaceXSource implements LaunchSource {
  readonly name = 'spacex-direct';
  readonly priority = 11;
  readonly mode = 'upcoming';
  readonly defaultRole = 'primary';

  constructor(private readonly downloader: () => Promise<string> = downloadIfStale) {}

  async fetchWindow(input: LaunchSourceWindow): Promise<RawLaunchEntry[]> {
    if (input.mode !== 'upcoming') return [];
    let html: string;
    try {
      html = await this.downloader();
    } catch {
      return [];
    }
    const arts = parseSpaceXHtml(html);
    const observed_at = new Date().toISOString();
    const from = Date.parse(input.fromIso);
    const to = Date.parse(input.toIso);
    const entries: RawLaunchEntry[] = [];
    for (const a of arts) {
      const e = spaceXArticleToRawEntry(a, observed_at);
      if (!e) continue;
      const t = Date.parse(e.net);
      if (t >= from && t < to) entries.push(e);
    }
    return entries;
  }

  attribution(): LaunchSourceAttribution {
    return {
      citation: 'SpaceX upcoming-launches page (operator portal)',
      url: 'https://www.spacex.com/launches/',
      license: 'PD-trivial',
      citation_id: 'spacex-direct',
    };
  }
}
