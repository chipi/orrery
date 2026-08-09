import { get, type FetchLike } from './core';
import type { Program, ProgramBase, ProgramOverlay, ProgramIndexEntry } from '$types/program';
import type { Essay, EssayBase, EssayOverlay, EssayIndexEntry } from '$types/essay';
import type {
  ScienceLanding,
  ScienceSection,
  ScienceSectionBase,
  ScienceSectionOverlay,
  ScienceTabId,
  ScienceTabIntro,
} from '$types/science';

/**
 * /science encyclopedia (PRD-008 / ADR-034 / ADR-017). Each section is
 * a base JSON record at `science/[tab]/[id].json` merged with a locale
 * overlay at `i18n/[locale]/science/[tab]/[id].json`. Falls back to
 * en-US when the requested locale's overlay is missing.
 */
export const SCIENCE_TABS: readonly ScienceTabId[] = [
  // 2026-06-06 reorder — read the encyclopedia like a book.
  // Setup → bodies → motion → engineering → presence → looking → history.
  // Planets used to sit at #11 (just before reading-list) which inverted
  // the natural "what is the solar system → how does it move → how do we
  // travel through it" reading flow; promoted to #2 so the reader meets
  // the subject before learning the mechanics.
  'scales-time', // 1. Units, frames, dimensions of the solar system
  'planets', // 2. The bodies in it (PRD-024)
  'exoplanets', // 2b. Real planets around other stars (RFC-032 S3)
  'orbits', // 3. How those bodies move (Kepler, e, i)
  'transfers', // 4. How to move between them (Hohmann, Lambert, ∆v)
  'porkchop', // 5. When to launch — transfer + time tradeoff
  'propulsion', // 6. What engines move you
  'mission-phases', // 7. The operational arc (launch → TLI → cruise → EDL)
  'space-stations', // 8. Sustained presence at LEO
  'life-in-space', // 9. Human physiology in microgravity
  'observation', // 10. Looking outward (telescopes, optical / radio / IR)
  'cosmology', // 10b. The universe at large (RFC-039 — large-scale structure, distance ladder)
  'history', // 11. What's been done, when, by whom
  // v0.6.3 — curated companion lists, anchored at the bottom of the rail
  // so the encyclopedia tabs read as a coherent block above them and
  // these read as "see also" affordances. (Issues #128 + #129.)
  'reading-list',
  'watch-list',
] as const;

export async function getScienceSection(
  tab: ScienceTabId,
  id: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<ScienceSection | null> {
  try {
    const baseRecord = await get<ScienceSectionBase>(`science/${tab}/${id}.json`, fetchFn);
    const overlay = await get<ScienceSectionOverlay>(
      `i18n/${locale}/science/${tab}/${id}.json`,
      fetchFn,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<ScienceSectionOverlay>(`i18n/en-US/science/${tab}/${id}.json`, fetchFn).catch(
            () => null,
          ));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

/** Program (PRD-029) — base record + editorial overlay, merged like a science
 * section. Overlay falls back to en-US per ADR-017. */
export async function getProgram(
  id: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<Program | null> {
  try {
    const baseRecord = await get<ProgramBase>(`programs/${id}.json`, fetchFn);
    const overlay = await get<ProgramOverlay>(`i18n/${locale}/programs/${id}.json`, fetchFn).catch(
      () => null,
    );
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<ProgramOverlay>(`i18n/en-US/programs/${id}.json`, fetchFn).catch(() => null));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

export async function getProgramIndex(
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<ProgramIndexEntry[]> {
  const base = await get<ProgramIndexEntry[]>('programs/index.json', fetchFn);
  if (locale === 'en-US') return base;
  // Card name + tagline come from the per-locale program overlays (same
  // source the detail pages use), so the index localizes fully.
  return Promise.all(
    base.map(async (entry) => {
      const overlay = await get<{ name?: string; tagline?: string }>(
        `i18n/${locale}/programs/${entry.id}.json`,
        fetchFn,
      ).catch(() => null);
      if (!overlay) return entry;
      return {
        ...entry,
        name: overlay.name ?? entry.name,
        tagline: overlay.tagline ?? entry.tagline,
      };
    }),
  );
}

// ─── The Long View (essays) ──────────────────────────────────────────────
// Same base+overlay pattern as programs: base record carries structure +
// metadata; the per-locale overlay carries the prose (title, dek, body).

export async function getEssay(
  slug: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<Essay | null> {
  try {
    const baseRecord = await get<EssayBase>(`essays/${slug}.json`, fetchFn);
    const overlay = await get<EssayOverlay>(`i18n/${locale}/essays/${slug}.json`, fetchFn).catch(
      () => null,
    );
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<EssayOverlay>(`i18n/en-US/essays/${slug}.json`, fetchFn).catch(() => null));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

export async function getEssayIndex(
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<EssayIndexEntry[]> {
  const base = await get<EssayIndexEntry[]>('essays/index.json', fetchFn);
  return Promise.all(
    base.map(async (entry) => {
      const overlay =
        (await get<{ title?: string; dek?: string }>(
          `i18n/${locale}/essays/${entry.slug}.json`,
          fetchFn,
        ).catch(() => null)) ??
        (locale === 'en-US'
          ? null
          : await get<{ title?: string; dek?: string }>(
              `i18n/en-US/essays/${entry.slug}.json`,
              fetchFn,
            ).catch(() => null));
      return overlay ? { ...entry, title: overlay.title, dek: overlay.dek } : entry;
    }),
  );
}

/** The public sourcing-debt ledger — content we could not source under the
 * licensing bar. Rendered on /sourcing; appended by hand as new walls appear. */
export interface SourcingGap {
  id: string;
  area: string;
  subjects: string[];
  want: string;
  wall: string;
  checked: string[];
  rejected?: string[];
  resolution: string;
  status: 'wall' | 'partial' | 'resolved';
  date: string;
}
export interface SourcingGaps {
  schema_version: number;
  note: string;
  gaps: SourcingGap[];
}
export async function getSourcingGaps(
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<SourcingGaps | null> {
  const overlay = await get<SourcingGaps>(`i18n/${locale}/sourcing/gaps.json`, fetchFn).catch(
    () => null,
  );
  if (overlay) return overlay;
  if (locale === 'en-US') return null;
  return get<SourcingGaps>('i18n/en-US/sourcing/gaps.json', fetchFn).catch(() => null);
}

/** Editorial Space-101 narrative shown on the /science landing. Falls back
 * to en-US per ADR-017; returns null only if both the locale and en-US files
 * are missing (which would indicate a broken build, not a runtime condition). */
export async function getScienceLanding(
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<ScienceLanding | null> {
  const overlay = await get<ScienceLanding>(`i18n/${locale}/science/_landing.json`, fetchFn).catch(
    () => null,
  );
  if (overlay) return overlay;
  if (locale === 'en-US') return null;
  return get<ScienceLanding>(`i18n/en-US/science/_landing.json`, fetchFn).catch(() => null);
}

/** Editorial 101 intro shown at the top of /science/[tab]. Falls back to
 * en-US per ADR-017; returns null if no intro file exists. */
export async function getScienceTabIntro(
  tab: ScienceTabId,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<ScienceTabIntro | null> {
  const overlay = await get<ScienceTabIntro>(
    `i18n/${locale}/science/${tab}/_intro.json`,
    fetchFn,
  ).catch(() => null);
  if (overlay) return overlay;
  if (locale === 'en-US') return null;
  return get<ScienceTabIntro>(`i18n/en-US/science/${tab}/_intro.json`, fetchFn).catch(() => null);
}

export async function getScienceTab(
  tab: ScienceTabId,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<ScienceSection[]> {
  const index = await get<{ ids: string[] }>(`science/${tab}/_index.json`, fetchFn).catch(() => ({
    ids: [] as string[],
  }));
  const sections = await Promise.all(
    index.ids.map((id) => getScienceSection(tab, id, locale, fetchFn)),
  );
  return sections.filter((s): s is ScienceSection => s !== null).sort((a, b) => a.order - b.order);
}
