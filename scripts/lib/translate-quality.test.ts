import { describe, expect, it } from 'vitest';
import { problems, termNotes } from './translate-quality.mjs';

const nameProblem = (loc: string, src: string, out: string) =>
  problems(loc, src, out).filter((p) => /^names (translated|changed) or missing/.test(p));

describe('problems — names that contain a glossary term', () => {
  it('flags a vehicle name translated with its body word (Mars Express → 화성 익스프레스)', () => {
    expect(
      nameProblem(
        'ko',
        'Mars Express — flight over Nili Fossae',
        '화성 익스프레스 — 닐리 포새 상공 비행',
      ),
    ).not.toEqual([]);
  });
  it('accepts the vehicle name kept while the body word elsewhere is native', () => {
    expect(
      nameProblem(
        'ko',
        'Mars Express — flight over Nili Fossae',
        'Mars Express — 닐리 포새 상공 비행',
      ),
    ).toEqual([]);
  });
  it('accepts a pad designation whose generic words are translated', () => {
    expect(
      nameProblem('ru', 'Starbase Orbital Pad A', 'Starbase, орбитальный стартовый стол A'),
    ).toEqual([]);
  });
  it('still accepts a native place with its code kept (Cape Canaveral SLC-40)', () => {
    expect(
      nameProblem('ru', 'Launched from Cape Canaveral SLC-40.', 'Запуск с мыса Канаверал, SLC-40.'),
    ).toEqual([]);
  });
});

describe('problems — numbered stages are words, not designations', () => {
  it('accepts "Stage-2" translated (ar)', () => {
    expect(
      nameProblem(
        'ar',
        'Stage-2 cutoff + payload separation; orbit 215 × 939 km.',
        'قطع المحرك في المرحلة الثانية + فصل الحمولة؛ مدار بارتفاعات 215 × 939 كم.',
      ),
    ).toEqual([]);
  });
  it('still requires a vehicle code (RD-181) to survive', () => {
    expect(nameProblem('ar', 'Two RD-181 engines.', 'محركان من طراز آر دي.')).not.toEqual([]);
  });
});

// 2026-10-30 UI audit (ar, hi, ja): defects the older checks let through.
const has = (loc: string, src: string, out: string, re: RegExp) =>
  problems(loc, src, out, { ui: true }).some((p) => re.test(p));

describe('problems — UI labels (ui: true)', () => {
  it('flags an ordinary English word copied into a non-Latin label (ko "Vendor")', () => {
    expect(has('ko', 'Vendor · official', 'Vendor · 공식', /^English words left/)).toBe(true);
  });
  it('flags an ALL-CAPS ordinary word (ko "STARBOARD")', () => {
    expect(has('ko', 'PORT · STARBOARD', '포트 · STARBOARD', /^English words left/)).toBe(true);
  });
  it('keeps names, acronyms, units, placeholders and routes', () => {
    for (const [loc, src, out] of [
      ['ja', 'Voyager 2 · {value} km', 'Voyager 2 · {value} km', ''],
      ['ko', 'TLI ∆V', 'TLI ∆V', ''],
      ['ja', '→ Read in /science', '→ /scienceで読む', ''],
      ['ja', 'WLM (Wolf-Lundmark-Melotte)', 'WLM (Wolf-Lundmark-Melotte)', ''],
      ['hi', 'Shuttle & Stations · 1971–2011', 'Shuttle और स्टेशन · 1971–2011', ''],
      ['ja', 'Exit panorama view (Esc)', 'パノラマ表示を終了 (Esc)', ''],
    ])
      expect(has(loc, src, out, /^English words left/)).toBe(false);
  });
  it('flags a glossary body left in English (ko "Phobos")', () => {
    expect(has('ko', 'Phobos & Deimos', 'Phobos & 데이모스', /^science or place names/)).toBe(true);
  });
  // Only whole glossary terms count: "Andromeda" alone is not one ("Andromeda Galaxy"
  // is), so ko "Andromeda 위성" is left to the audit and ui-senses.json.
  it('runs the word checks only on UI strings, not prose', () => {
    expect(
      problems('ko', 'Vendor · official', 'Vendor · 공식').some((p) => /^English words/.test(p)),
    ).toBe(false);
  });
});

describe('problems — the site name', () => {
  it('flags "Orrery" transliterated in a page title', () => {
    expect(
      problems('ja', 'Solar System Explorer · Orrery', '太陽系エクスプローラー · オーラリー').some(
        (p) => /Orrery/.test(p),
      ),
    ).toBe(true);
  });
  it('accepts it kept', () => {
    expect(
      problems('ja', 'Solar System Explorer · Orrery', '太陽系エクスプローラー · Orrery'),
    ).toEqual([]);
  });
});

describe('problems — arrows in right-to-left text', () => {
  const arrow = (out: string) => problems('ar', 'Earth → Moon', out).some((p) => /→/.test(p));
  it('flags "→" next to Arabic words', () => expect(arrow('الأرض → القمر')).toBe(true));
  it('accepts "←"', () => expect(arrow('الأرض ← القمر')).toBe(false));
  it('accepts "→" between Latin symbols (e→1)', () =>
    expect(problems('ar', 'e→1', 'e→1').some((p) => /→/.test(p))).toBe(false));
});

// Garble pass 2026-10-31: every writer gets the technical-term bindings the term gate checks.
describe('termNotes', () => {
  it('lists the bindings for the terms an English source uses, with forms to avoid', () => {
    const nl = termNotes('nl', 'A gravity assist from Mars, then a burn into orbit.');
    expect(nl).toContain('gravity assist → zwaartekrachtassist');
    expect(nl).toContain('burn → ontsteking');
    expect(termNotes('zh-CN', 'The free-return trajectory.')).toContain('never 自由返回轨迹');
  });
  it('is empty when the source uses no glossary term, and for en-US', () => {
    expect(termNotes('de', 'A history of Mars.')).toBe('');
    expect(termNotes('en-US', 'orbit')).toBe('');
  });
});

// The gap translator must never shorten by dropping content or cutting a string
// (the 2026-07-14 retranslation did both and left cut-off sentences in 13 locales).
describe('translate-i18n-gaps length caps', () => {
  it('has no shortening or hard-cut path', async () => {
    const src = (await import('node:fs')).readFileSync('scripts/translate-i18n-gaps.mjs', 'utf8');
    expect(src).not.toMatch(/drop a clause or a non-essential detail/);
    expect(src).not.toMatch(/\.slice\(0, limit\)/);
    expect(src).toMatch(/translations are never cut/);
  });
});
