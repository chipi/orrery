/**
 * Launcher engine spec — the single source of truth for how many engines /
 * nozzles each stage of each launch vehicle actually has, and how they're
 * clustered. Retained as DATA (not just baked into the 3D geometry) so it can
 * be surfaced on the launcher detail surface and referenced later.
 *
 * `launcher-models.ts` reads `mainNozzles` + `arrangement` to render the exact
 * visible engine cluster at each stage's base (the signature of a real rocket —
 * Falcon 9's 9-Merlin octaweb, Saturn V's 5 F-1s, Soyuz's 4-chamber RD-107s).
 *
 * Fact-checked 2026-07-29 against the sources listed per vehicle. Key subtlety:
 * some engines are ONE engine but present MULTIPLE nozzles (a viewer sees the
 * nozzles, not the engines) — RD-107/108 (4 chambers), RD-180 (2), LR87 (2),
 * YF-77/YF-100 (2). `nozzlesPerEngine` captures that; `mainNozzles` is the total
 * a viewer sees at the base. Low-confidence items are flagged in `note` /
 * `confidence` and modelled conservatively.
 */

export type EngineArrangement =
  | 'single' // one nozzle, centred
  | 'pair' // two side by side (RD-180, LR87, YF-77, YF-75, LE-9/H3-22)
  | 'triple' // three in a triangle (SSME)
  | 'quad' // four in a square (R-7 chambers, Proton S2)
  | 'cross-5' // one centre + four outboard (Saturn V F-1 / J-2)
  | 'octagon-8' // eight in a ring (Saturn IB H-1)
  | 'octaweb-9' // one centre + eight ring (Falcon 9)
  | 'ring-6' // six around a central tank (Proton S1)
  | 'superheavy-33' // 3 centre + 10 mid ring + 20 outer ring (Super Heavy)
  | 'starship-6' // 3 sea-level centre + 3 RVac ring (Starship upper)
  | 'per-booster'; // count applies across N strap-on boosters (see boosterCount)

export interface EngineStage {
  /** Human-readable stage/booster label, e.g. "S-IC (Stage 1)". */
  stage: string;
  /** Engine designation, e.g. "F-1", "RD-107A". */
  engine: string;
  /** Number of engines in this group (across all boosters for a strap-on set). */
  engineCount: number;
  /** Nozzles per engine (>1 for multi-chamber engines like RD-107/RD-180). */
  nozzlesPerEngine: number;
  /** Total visible MAIN nozzles for the group (engineCount × nozzlesPerEngine). */
  mainNozzles: number;
  /** Visible vernier / secondary nozzles (R-7 family, Proton stage 3). */
  vernierNozzles?: number;
  /** Layout hint consumed by the 3D builder + shown in the UI. */
  arrangement: EngineArrangement;
  /** For 'per-booster' rows: how many strap-on boosters this group spans. */
  boosterCount?: number;
  /** Caveat / low-confidence note surfaced verbatim. */
  note?: string;
}

export interface LauncherEngineSpec {
  name: string;
  agency: string;
  stages: EngineStage[];
  confidence: 'high' | 'medium';
  sources: string[];
}

const S = (
  stage: string,
  engine: string,
  engineCount: number,
  nozzlesPerEngine: number,
  arrangement: EngineArrangement,
  extra: Partial<EngineStage> = {},
): EngineStage => ({
  stage,
  engine,
  engineCount,
  nozzlesPerEngine,
  mainNozzles: engineCount * nozzlesPerEngine,
  arrangement,
  ...extra,
});

/** Keyed by the launcher id used in `launcher-models.ts` BUILDERS + the registry. */
export const LAUNCHER_ENGINES: Record<string, LauncherEngineSpec> = {
  'falcon-9': {
    name: 'Falcon 9 (Block 5)',
    agency: 'SpaceX',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/Falcon_9_Block_5'],
    stages: [
      S('Stage 1', 'Merlin 1D', 9, 1, 'octaweb-9'),
      S('Stage 2', 'Merlin 1D Vacuum', 1, 1, 'single'),
    ],
  },
  'saturn-v': {
    name: 'Saturn V',
    agency: 'NASA',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/S-IC', 'https://en.wikipedia.org/wiki/S-II'],
    stages: [
      S('S-IC (Stage 1)', 'F-1', 5, 1, 'cross-5'),
      S('S-II (Stage 2)', 'J-2', 5, 1, 'cross-5'),
      S('S-IVB (Stage 3)', 'J-2', 1, 1, 'single'),
    ],
  },
  'saturn-ib': {
    name: 'Saturn IB',
    agency: 'NASA',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/S-IB'],
    stages: [
      S('S-IB (Stage 1)', 'H-1', 8, 1, 'octagon-8', {
        note: '4 inboard fixed + 4 outboard gimbaled.',
      }),
      S('S-IVB (Stage 2)', 'J-2', 1, 1, 'single'),
    ],
  },
  'vostok-k': {
    name: 'Vostok-K (8K72K)',
    agency: 'OKB-1 (Soviet)',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/RD-107', 'https://en.wikipedia.org/wiki/Vostok-K'],
    stages: [
      S('Strap-ons ×4 (Blok B–D)', 'RD-107', 4, 4, 'per-booster', {
        boosterCount: 4,
        vernierNozzles: 8,
        note: '16 main nozzles (4 per booster) + 2 verniers per booster.',
      }),
      S('Core (Blok-A)', 'RD-108', 1, 4, 'quad', { vernierNozzles: 4 }),
      S('Upper (Blok-E)', 'RD-0109', 1, 1, 'single'),
    ],
  },
  'voskhod-11a57': {
    name: 'Voskhod (11A57)',
    agency: 'OKB-1 (Soviet)',
    confidence: 'medium',
    sources: ['https://en.wikipedia.org/wiki/Voskhod_(rocket)'],
    stages: [
      S('Strap-ons ×4', 'RD-107', 4, 4, 'per-booster', { boosterCount: 4, vernierNozzles: 8 }),
      S('Core (Blok-A)', 'RD-108', 1, 4, 'quad', { vernierNozzles: 4 }),
      S('Blok-I (upper)', 'RD-0107', 1, 4, 'quad', {
        vernierNozzles: 4,
        note: 'RD-0107 chamber count inferred from the RD-0110 family — low confidence.',
      }),
    ],
  },
  soyuz: {
    name: 'Soyuz (11A511 class)',
    agency: 'Roscosmos',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/RD-0110', 'https://en.wikipedia.org/wiki/RD-107'],
    stages: [
      S('Strap-ons ×4 (Blok B–D)', 'RD-107A', 4, 4, 'per-booster', {
        boosterCount: 4,
        vernierNozzles: 8,
      }),
      S('Core (Blok-A)', 'RD-108A', 1, 4, 'quad', { vernierNozzles: 4 }),
      S('Blok-I (upper)', 'RD-0110', 1, 4, 'quad', { vernierNozzles: 4 }),
    ],
  },
  'atlas-v': {
    name: 'Atlas V',
    agency: 'ULA / NASA',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/Atlas_V', 'https://en.wikipedia.org/wiki/AJ-60A'],
    stages: [
      S('Solid boosters (0–5)', 'AJ-60A', 5, 1, 'per-booster', {
        boosterCount: 5,
        note: 'Variant-dependent (0–5); canted outboard.',
      }),
      S('CCB core', 'RD-180', 1, 2, 'pair', { note: 'One engine, two thrust-chamber nozzles.' }),
      S('Centaur', 'RL10C-1', 1, 1, 'single'),
    ],
  },
  'proton-k': {
    name: 'Proton-K',
    agency: 'Roscosmos',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/RD-253', 'https://en.wikipedia.org/wiki/RD-0214'],
    stages: [
      S('Stage 1', 'RD-253', 6, 1, 'ring-6', { note: 'Six around the central oxidiser tank.' }),
      S('Stage 2', 'RD-0210/0211', 4, 1, 'quad'),
      S('Stage 3', 'RD-0213 + RD-0214', 1, 1, 'single', {
        vernierNozzles: 4,
        note: '1 main (RD-0213) + a 4-nozzle vernier (RD-0214) → 5 visible.',
      }),
    ],
  },
  'titan-ii-glv': {
    name: 'Titan II GLV',
    agency: 'NASA / USAF',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/Titan_II_GLV'],
    stages: [
      S('Stage 1', 'LR87-AJ-7', 1, 2, 'pair', { note: 'One engine, two chambers/nozzles.' }),
      S('Stage 2', 'LR91-AJ-7', 1, 1, 'single'),
    ],
  },
  'atlas-lv-3b': {
    name: 'Atlas LV-3B (Mercury-Atlas)',
    agency: 'NASA',
    confidence: 'high',
    sources: ['https://handwiki.org/wiki/Engineering:Atlas_LV-3B'],
    stages: [
      S('Booster (jettisoned)', 'LR89-5', 2, 1, 'pair'),
      S('Sustainer', 'LR105-5', 1, 1, 'single'),
      S('Verniers', 'LR101', 2, 1, 'pair', {
        note: 'Small attitude nozzles; 5 visible at liftoff.',
      }),
    ],
  },
  'ariane-5': {
    name: 'Ariane 5 ECA',
    agency: 'ESA',
    confidence: 'high',
    sources: ['https://handwiki.org/wiki/Engineering:Ariane_5'],
    stages: [
      S('Solid boosters ×2 (EAP)', 'P230', 2, 1, 'per-booster', { boosterCount: 2 }),
      S('EPC core', 'Vulcain 2', 1, 1, 'single'),
      S('ESC-A (upper)', 'HM7B', 1, 1, 'single'),
    ],
  },
  'h-iia': {
    name: 'H-IIA (202)',
    agency: 'JAXA',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/H-IIA'],
    stages: [
      S('SRB-A ×2', 'SRB-A', 2, 1, 'per-booster', {
        boosterCount: 2,
        note: '202 config; 204 uses 4.',
      }),
      S('Stage 1 core', 'LE-7A', 1, 1, 'single'),
      S('Stage 2', 'LE-5B', 1, 1, 'single'),
    ],
  },
  'space-shuttle-stack': {
    name: 'Space Shuttle',
    agency: 'NASA',
    confidence: 'medium',
    sources: ['https://science.ksc.nasa.gov/shuttle/technology/sts-newsref/srb.html'],
    stages: [
      S('SRB ×2', 'RSRM', 2, 1, 'per-booster', { boosterCount: 2 }),
      S('Orbiter (SSME)', 'RS-25', 3, 1, 'triple', {
        note: 'Triangular cluster; exact apex/numbering not authoritatively sourced.',
      }),
      S('OMS ×2', 'AJ10-190', 2, 1, 'pair', {
        note: 'Orbital Manoeuvring System pods flanking the tail (not ascent thrust).',
      }),
    ],
  },
  'long-march-2f': {
    name: 'Long March 2F',
    agency: 'CNSA',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/Long_March_2F', 'https://en.wikipedia.org/wiki/YF-20'],
    stages: [
      S('Strap-ons ×4', 'YF-20B', 4, 1, 'per-booster', { boosterCount: 4 }),
      S('Core (Stage 1)', 'YF-21B (4× YF-20B)', 4, 1, 'quad'),
      S('Stage 2', 'YF-24B', 1, 1, 'single', {
        vernierNozzles: 4,
        note: '1 main + a 4-chamber vernier (YF-23B).',
      }),
    ],
  },
  'long-march-3b': {
    name: 'Long March 3B',
    agency: 'CNSA',
    confidence: 'medium',
    sources: ['https://en.wikipedia.org/wiki/Long_March_3B'],
    stages: [
      S('Strap-ons ×4', 'YF-25', 4, 1, 'per-booster', {
        boosterCount: 4,
        note: 'YF-25 single-nozzle assumed from family; not spec-confirmed.',
      }),
      S('Core (Stage 1)', 'YF-21C (4× YF-20C)', 4, 1, 'quad'),
      S('Stage 2', 'YF-24E', 1, 1, 'single', { vernierNozzles: 4 }),
      S('Stage 3', 'YF-75', 2, 1, 'pair'),
    ],
  },
  'long-march-5': {
    name: 'Long March 5',
    agency: 'CNSA',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/Long_March_5', 'https://en.wikipedia.org/wiki/YF-100'],
    stages: [
      S('Strap-ons ×4', 'YF-100', 8, 1, 'per-booster', {
        boosterCount: 4,
        note: '2 YF-100 per booster → 8 nozzles across the four.',
      }),
      S('Core (Stage 1)', 'YF-77', 2, 1, 'pair'),
      S('Stage 2', 'YF-75D', 2, 1, 'pair'),
    ],
  },
  pslv: {
    name: 'PSLV-XL',
    agency: 'ISRO',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle'],
    stages: [
      S('PSOM-XL strap-ons ×6', 'PSOM-XL (solid)', 6, 1, 'per-booster', { boosterCount: 6 }),
      S('PS1 (Stage 1)', 'S139 (solid)', 1, 1, 'single'),
      S('PS2 (Stage 2)', 'Vikas', 1, 1, 'single'),
      S('PS4 (Stage 4)', 'L-2-5', 2, 1, 'pair'),
    ],
  },
  lvm3: {
    name: 'LVM3 (GSLV Mk III)',
    agency: 'ISRO',
    confidence: 'high',
    sources: [
      'https://en.wikipedia.org/wiki/CE-20',
      'https://en.wikipedia.org/wiki/Vikas_(rocket_engine)',
    ],
    stages: [
      S('S200 boosters ×2', 'S200 (solid)', 2, 1, 'per-booster', { boosterCount: 2 }),
      S('L110 core', 'Vikas', 2, 1, 'pair'),
      S('C25 (upper)', 'CE-20', 1, 1, 'single'),
    ],
  },
  'm-v': {
    name: 'M-V',
    agency: 'JAXA / ISAS',
    confidence: 'high',
    sources: ['https://www.isas.jaxa.jp/e/enterp/rockets/vehicles/m-v/config.shtml'],
    stages: [
      S('Stage 1', 'M-14 (solid)', 1, 1, 'single'),
      S('Stage 2', 'M-25 (solid)', 1, 1, 'single', { note: 'M-24 on early flights.' }),
      S('Stage 3', 'M-34 (solid)', 1, 1, 'single'),
    ],
  },
  'ariane-1': {
    name: 'Ariane 1',
    agency: 'ESA / CNES',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/Ariane_1'],
    stages: [
      S('Stage 1', 'Viking 5', 4, 1, 'quad'),
      S('Stage 2', 'Viking 4', 1, 1, 'single'),
      S('Stage 3', 'HM7', 1, 1, 'single'),
    ],
  },
  h3: {
    name: 'H3 (H3-22)',
    agency: 'JAXA',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/H3_(rocket)'],
    stages: [
      S('SRB-3 ×2', 'SRB-3', 2, 1, 'per-booster', {
        boosterCount: 2,
        note: 'H3-22; H3-30 has none.',
      }),
      S('Stage 1 core', 'LE-9', 2, 1, 'pair', { note: 'H3-22 has 2; H3-30 has 3.' }),
      S('Stage 2', 'LE-5B-3', 1, 1, 'single'),
    ],
  },
  starship: {
    name: 'Starship / Super Heavy',
    agency: 'SpaceX',
    confidence: 'high',
    sources: ['https://en.wikipedia.org/wiki/SpaceX_Starship'],
    stages: [
      S('Super Heavy (Booster)', 'Raptor 2', 33, 1, 'superheavy-33', {
        note: '3 centre (gimballing) + 10 mid ring + 20 outer ring.',
      }),
      S('Starship (Upper)', 'Raptor / RVac', 6, 1, 'starship-6', {
        note: '3 sea-level Raptor (centre) + 3 Raptor Vacuum (outer).',
      }),
    ],
  },
};

export function getLauncherEngines(id: string | undefined | null): LauncherEngineSpec | null {
  if (!id) return null;
  return LAUNCHER_ENGINES[id] ?? null;
}

/** Ids with a verified engine spec (join-test guard against the model builders). */
export const LAUNCHER_ENGINE_IDS = Object.keys(LAUNCHER_ENGINES);
