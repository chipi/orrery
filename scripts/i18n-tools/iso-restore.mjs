// Put back ISO dates a translation spelled out (the site keeps the English ISO dates, 1969-07-16,
// in every locale). For each YYYY-MM-DD / YYYY-MM in the English that the new text lacks, replaces
// the locale's spelled form with the ISO string: CJK 1969年7月16日 / 1969年7月, ko 1969년 7월 16일.
// Only those exact forms are touched; anything else is left for reading.
//   node scripts/i18n-tools/iso-restore.mjs <edits.json>   (rewrites the file; prints counts)
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: iso-restore.mjs <edits.json>');
  process.exit(2);
}
const edits = JSON.parse(fs.readFileSync(file, 'utf8'));
let fixed = 0;
let left = 0;
for (const e of edits) {
  for (const iso of e.en.match(/\b\d{4}-\d{2}(?:-\d{2})?\b/g) ?? []) {
    const [y, m, d] = iso.split('-').map(Number);
    if (m > 12 || e.new.includes(iso)) continue;
    const forms = d
      ? [`${y}年${m}月${d}日`, `${y} 年 ${m} 月 ${d} 日`, `${y}년 ${m}월 ${d}일`]
      : [`${y}年${m}月`, `${y} 年 ${m} 月`, `${y}년 ${m}월`];
    const hit = forms.find((f) => e.new.includes(f));
    if (hit) {
      e.new = e.new.replace(hit, iso);
      fixed++;
    } else left++;
  }
}
fs.writeFileSync(file, JSON.stringify(edits, null, 1));
console.log(
  `iso-restore: ${fixed} restored, ${left} ISO dates missing in another form (read them)`,
);
