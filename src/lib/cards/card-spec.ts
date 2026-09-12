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
  /** Build-generated PNG of this card (S2 generator) — the Share-card
   *  file + og:image. Root-relative; may not exist yet for new entities
   *  (the overlay probes and degrades to link-only). */
  imagePath?: string;
  /** Share-stub path (S3) — '/c/<kind>/<id>', the prerendered page that
   *  carries the Open Graph card and forwards into the app view. */
  shareHref?: string;
}

/** Lead of a paragraph: up to `n` sentences, but never past ~`maxChars` —
 *  falls back to fewer sentences when the join runs long (card real estate
 *  is fixed; a 5-line story crowds the grid). */
function leadSentences(text: string, n: number, maxChars = 190): string {
  const parts = text.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const part of parts.slice(0, n)) {
    const next = out ? `${out} ${part}` : part;
    if (out && next.length > maxChars) break;
    out = next;
  }
  return out.trim();
}

/** Shorten a data value for a stat chip — strip parentheticals, cut on a
 *  word boundary (never mid-word). */
function chip(value: string, max = 26): string {
  const cleaned = value.replace(/\s*\([^)]*\)/g, '').trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > 8 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

/** Leading quantity of a spec string: '46782 kg launched (CSM…)' → '46,782 KG'. */
function leadQuantity(value: string): string | null {
  const m = /^~?([\d][\d,.]*)\s*(kg|t|lb|km\/s|m\/s)/i.exec(value.trim());
  if (!m) return null;
  const num = Number(m[1].replace(/,/g, ''));
  const formatted = Number.isFinite(num) ? num.toLocaleString('en-US') : m[1];
  return `${value.trim().startsWith('~') ? '~' : ''}${formatted} ${m[2].toUpperCase()}`;
}

/** ISO date → the card's mono register: '1969-07-16' → 'JUL 16 1969'. */
function cardDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .replace(',', '')
    .toUpperCase();
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
  // The overlay `type` often ends '· <STATUS>' ('CREWED LANDER · FLOWN');
  // the stat grid already carries STATUS — strip the dupe from the kicker.
  const typeLine = (mission.type ?? mission.dest)
    .replace(new RegExp(`\\s*·\\s*${mission.status}\\s*$`, 'i'), '')
    .trim();
  const kicker = [mission.agency, typeLine, year].filter(Boolean).join(' · ');

  const stats: CardStat[] = [];
  if (mission.departure_date)
    stats.push({ label: 'LAUNCH', value: cardDate(mission.departure_date) });
  if (mission.vehicle) stats.push({ label: 'VEHICLE', value: chip(mission.vehicle) });
  if (mission.transit_days) stats.push({ label: 'TRANSIT', value: `${mission.transit_days} D` });
  if (mission.delta_v) stats.push({ label: 'ΔV', value: chip(mission.delta_v, 18) });
  if (mission.payload)
    stats.push({ label: 'PAYLOAD', value: leadQuantity(mission.payload) ?? chip(mission.payload) });
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
    slug: `orrery.day/c/mission/${mission.id}`,
    imagePath: `/images/cards/mission/${mission.id}.png`,
    shareHref: `/c/mission/${mission.id}`,
  };
}
