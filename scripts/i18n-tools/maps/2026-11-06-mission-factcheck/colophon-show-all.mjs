// Adds the colophon "Show all {count}" button label to messages/<loc>.json, after
// colophon_toc_label in each file. Idempotent.
//   node scripts/i18n-tools/maps/2026-11-06-mission-factcheck/colophon-show-all.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const T = {
  'en-US': 'Show all {count}',
  ar: 'عرض الكل ({count})',
  de: 'Alle {count} anzeigen',
  es: 'Mostrar los {count}',
  fr: 'Tout afficher ({count})',
  hi: 'सभी {count} दिखाएँ',
  it: 'Mostra tutti ({count})',
  ja: 'すべて表示（{count}件）',
  ko: '모두 보기 ({count}개)',
  nl: 'Alle {count} tonen',
  'pt-BR': 'Mostrar todos ({count})',
  ru: 'Показать все ({count})',
  'sr-Cyrl': 'Прикажи све ({count})',
  'zh-CN': '显示全部（{count}）',
};
for (const [loc, text] of Object.entries(T)) {
  const f = `messages/${loc}.json`;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  if (j.colophon_show_all === text) continue;
  const out = {};
  for (const [k, v] of Object.entries(j)) {
    if (k === 'colophon_show_all') continue;
    out[k] = v;
    if (k === 'colophon_toc_label') out.colophon_show_all = text;
  }
  if (!('colophon_show_all' in out)) out.colophon_show_all = text;
  writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
  console.log(`${loc}: ${text}`);
}
