/**
 * `EsaSource` — ESA press calendar scraper.
 *
 * ESA's /Press_Releases doesn't expose a clean feed for launches v0.1; the
 * parser extracts press-release articles with launch-shaped titles. v0.2
 * hardens.
 *
 * Per RFC-023 §12.2: may return zero entries on a given fetch.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { LaunchSource, LaunchSourceAttribution, LaunchSourceWindow } from './provider.js';
import type { RawLaunchEntry } from '../types.js';
import { buildStableId } from '../id.js';

const ESA_URL = 'https://www.esa.int/Press_Releases';
const CACHE_PATH = '.launches-cache/esa/press.html';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const LAUNCH_PATTERN = /(Ariane\s?\d+\w*|Vega-?C?|Soyuz)\s+(launches|returns to flight with|carries)\s+(.+)/i;

type ParsedArticle = { title: string; isoDate: string; description: string };

export function parseEsaHtml(html: string): ParsedArticle[] {
  const out: ParsedArticle[] = [];
  const articleRe = /<article[^>]*class="press-release"[^>]*>([\s\S]*?)<\/article>/g;
  let m: RegExpExecArray | null;
  while ((m = articleRe.exec(html)) !== null) {
    const block = m[1];
    const title = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]?.trim();
    const isoDate = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
    const description = block.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1]?.trim() ?? '';
    if (title && isoDate) out.push({ title, isoDate, description });
  }
  return out;
}

export function esaArticleToRawEntry(
  art: ParsedArticle,
  source_observed_at: string,
): RawLaunchEntry | null {
  const m = art.title.match(LAUNCH_PATTERN);
  if (!m) return null;
  const rocketFamily = m[1].trim();
  const missionName = m[3].trim();
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
    rocket_family: rocketFamily.startsWith('Ariane') ? rocketFamily : rocketFamily,
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
