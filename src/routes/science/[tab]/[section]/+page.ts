import { error } from '@sveltejs/kit';
import { SCIENCE_TABS, getScienceSection } from '$lib/data';
import { renderKatex } from '$lib/katex';
import type { ScienceTabId } from '$types/science';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

/**
 * Hardcoded (tab, section) pairs that the prerender should generate. The
 * source of truth is `static/data/science/[tab]/_index.json`; we duplicate
 * the list here because `+page.ts` is a universal module — node:fs is
 * unavailable. When a new section lands, add its (tab, section) pair here
 * and to the matching _index.json simultaneously. validate-data.ts will
 * fail if the JSON files don't exist for a declared section.
 */
const SECTION_ENTRIES: { tab: ScienceTabId; section: string }[] = [
  { tab: 'orbits', section: 'keplerian-orbit' },
  { tab: 'orbits', section: 'semi-major-axis' },
  { tab: 'orbits', section: 'eccentricity' },
  { tab: 'orbits', section: 'inclination' },
  { tab: 'orbits', section: 'true-anomaly' },
  { tab: 'orbits', section: 'vis-viva' },
  { tab: 'orbits', section: 'keplers-laws' },
  { tab: 'orbits', section: 'apsides' },
  { tab: 'orbits', section: 'orbit-regimes' },
  { tab: 'transfers', section: 'hohmann-transfer' },
  { tab: 'transfers', section: 'lambert-problem' },
  { tab: 'transfers', section: 'transfer-ellipse' },
  { tab: 'transfers', section: 'conic-sections' },
  { tab: 'transfers', section: 'free-return' },
  { tab: 'transfers', section: 'gravity-assist' },
  { tab: 'transfers', section: 'patched-conics' },
  { tab: 'propulsion', section: 'dv-budget' },
  { tab: 'propulsion', section: 'tsiolkovsky' },
  { tab: 'propulsion', section: 'specific-impulse' },
  { tab: 'propulsion', section: 'c3' },
  { tab: 'propulsion', section: 'v-infinity' },
  { tab: 'propulsion', section: 'oberth-effect' },
  { tab: 'mission-phases', section: 'launch' },
  { tab: 'mission-phases', section: 'trans-x-injection' },
  { tab: 'mission-phases', section: 'tcm' },
  { tab: 'mission-phases', section: 'orbit-insertion' },
  { tab: 'mission-phases', section: 'edl' },
  { tab: 'mission-phases', section: 'met' },
  { tab: 'mission-phases', section: 'nrho' },
  { tab: 'mission-phases', section: 'mission-types' },
  { tab: 'scales-time', section: 'au' },
  { tab: 'scales-time', section: 'light-minute' },
  { tab: 'scales-time', section: 'j2000' },
  { tab: 'scales-time', section: 'sidereal-synodic' },
  { tab: 'scales-time', section: 'ecliptic-plane' },
  { tab: 'scales-time', section: 'frames' },
  { tab: 'porkchop', section: 'what-is-a-porkchop' },
  { tab: 'porkchop', section: 'departure-axis' },
  { tab: 'porkchop', section: 'tof-axis' },
  { tab: 'porkchop', section: 'dv-heatmap' },
  { tab: 'porkchop', section: 'contour-reading' },
  { tab: 'porkchop', section: 'viability' },
  { tab: 'life-in-space', section: 'microgravity-physiology' },
  { tab: 'life-in-space', section: 'bone-density-loss' },
  { tab: 'life-in-space', section: 'muscle-atrophy' },
  { tab: 'life-in-space', section: 'radiation-exposure' },
  { tab: 'life-in-space', section: 'vestibular-adaptation' },
  { tab: 'life-in-space', section: 'eva-physiology' },
  { tab: 'life-in-space', section: 'long-duration-effects' },
];

export const entries: EntryGenerator = () => SECTION_ENTRIES;

export const load: PageLoad = async ({ params, fetch }) => {
  const tab = params.tab as ScienceTabId;
  if (!SCIENCE_TABS.includes(tab)) throw error(404, `Unknown science tab: ${tab}`);
  // Pass SvelteKit's fetch through so the data-layer get<T> can resolve
  // /data/science/... at prerender time. (data.ts uses global fetch by
  // default; passing fetch ensures the prerender context is used.)
  const section = await getScienceSection(tab, params.section, 'en-US', fetch);
  if (!section) throw error(404, `Unknown section: ${tab}/${params.section}`);
  // KaTeX is rendered at build time during prerender. Output is plain HTML;
  // client never loads the KaTeX library (ADR-034).
  const formulaHtml = section.formula_latex ? renderKatex(section.formula_latex) : null;
  return { section, formulaHtml };
};
