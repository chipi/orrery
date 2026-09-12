/**
 * Collectible cards (#547) — the CardSpec contract + per-type resolvers.
 *
 * ONE data shape feeds every card template. Templates are pure HTML/CSS
 * (`CollectibleCard.svelte`); restyling is a template edit that applies to
 * every card instantly — nothing is ever pre-generated per entity
 * (operator direction 2026-09-12: Higgsfield was design consultation only;
 * production cards are live markup).
 *
 * Resolvers are pure mappings over data the app already loads — panel
 * descriptions (translated), structured stats, pickHero imagery, computed
 * figure assets (e.g. the mission trajectory thumbnails). Adding a card
 * type = adding a resolver; no new content authoring.
 */
import type { Mission, MissionIndex } from '$types/mission';

export interface CardStat {
  label: string;
  value: string;
}

export interface CardSpec {
  /** Collection name, uppercase — 'MISSIONS', 'FLEET', 'DEEP SPACE'… */
  collection: string;
  /** Position within the collection, e.g. '012/125'. */
  number: string;
  title: string;
  /** One-line context under the title: 'NASA · CREWED LANDER · 1969'. */
  kicker: string;
  /** 1–2 sentence story (from the translated panel description). */
  story: string;
  /** Up to 6 label/value pairs. Values carry the visual weight. */
  stats: CardStat[];
  /** The footer highlight line. `factLabel` names its register — 'FIRST'
   *  for milestone facts (the mission `first` field), 'FACT' otherwise. */
  fact?: string;
  factLabel?: string;
  heroUrl?: string;
  /** The figure slot — a computed visual (trajectory thumbnail, orbit
   *  glyph…). Rendered monochrome by the template. */
  figureUrl?: string;
  figureCaption?: string;
  creditLine: string;
  /** Human-readable share slug shown on the card. */
  slug: string;
}

/** First `n` sentences of a paragraph, tolerant of abbreviations-free prose. */
function leadSentences(text: string, n: number): string {
  const parts = text.split(/(?<=[.!?])\s+/).slice(0, n);
  return parts.join(' ').trim();
}

/** Shorten a data value for a stat chip — strip parentheticals, cap length. */
function chip(value: string, max = 26): string {
  const cleaned = value.replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

export function cardForMission(
  mission: Mission,
  index: MissionIndex[],
  heroUrl?: string,
): CardSpec {
  const pos = index.findIndex((mi) => mi.id === mission.id);
  const total = index.length;
  const number = pos >= 0 ? `${String(pos + 1).padStart(3, '0')}/${total}` : `—/${total}`;

  const year = mission.year ? String(mission.year) : '';
  const kicker = [mission.agency, mission.type ?? mission.dest, year].filter(Boolean).join(' · ');

  const stats: CardStat[] = [];
  if (mission.departure_date) stats.push({ label: 'LAUNCH', value: mission.departure_date });
  if (mission.vehicle) stats.push({ label: 'VEHICLE', value: chip(mission.vehicle) });
  if (mission.transit_days) stats.push({ label: 'TRANSIT', value: `${mission.transit_days} D` });
  if (mission.delta_v) stats.push({ label: 'ΔV', value: chip(mission.delta_v, 18) });
  if (mission.payload) stats.push({ label: 'PAYLOAD', value: chip(mission.payload) });
  stats.push({ label: 'STATUS', value: mission.status });

  return {
    collection: 'MISSIONS',
    number,
    title: mission.name ?? mission.id,
    kicker,
    story: mission.description ? leadSentences(mission.description, 2) : '',
    stats: stats.slice(0, 6),
    fact: mission.first,
    factLabel: mission.first ? 'FIRST' : undefined,
    heroUrl,
    figureUrl: `/images/missions/thumbnails/${mission.id}.webp`,
    figureCaption: 'TRAJECTORY',
    creditLine: mission.credit ? `SOURCES: ${chip(mission.credit, 60)}` : '',
    slug: `orrery.day/missions/${mission.id}`,
  };
}
