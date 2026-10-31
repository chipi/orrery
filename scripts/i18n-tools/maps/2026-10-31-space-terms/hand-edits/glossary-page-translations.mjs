// /glossary definitions and UI text in 13 locales (one in-session translation round,
// 2026-10-31): writes i18n-src/<loc>/glossary/terms.json and the glossary_* / layout_footer_glossary
// messages, after running every string through translate-quality problems().
//   node …/glossary-page-translations.mjs <glossary-tr.json>
import fs from 'node:fs';
import { problems } from '../../../../lib/translate-quality.mjs';
const tr = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const enTerms = JSON.parse(fs.readFileSync('i18n-src/en-US/glossary/terms.json', 'utf8'));
const enMsgs = JSON.parse(fs.readFileSync('messages/en-US.json', 'utf8'));
let bad = 0;
for (const [loc, { terms, messages }] of Object.entries(tr)) {
  for (const [k, v] of Object.entries(terms)) {
    if (!(k in enTerms)) throw new Error(`${loc}: unknown term ${k}`);
    const p = problems(loc, enTerms[k], v);
    if (p.length) {
      bad++;
      console.log(`${loc} term ${k}: ${p.join('; ')}`);
    }
  }
  for (const [k, v] of Object.entries(messages)) {
    const p = problems(loc, enMsgs[k], v, { ui: true });
    if (p.length) {
      bad++;
      console.log(`${loc} msg ${k}: ${p.join('; ')}`);
    }
  }
  if (Object.keys(terms).length !== Object.keys(enTerms).length)
    throw new Error(`${loc}: term count`);
}
if (bad) {
  console.log(`${bad} strings with problems — nothing written`);
  process.exit(1);
}
for (const [loc, { terms, messages }] of Object.entries(tr)) {
  fs.mkdirSync(`i18n-src/${loc}/glossary`, { recursive: true });
  const ordered = Object.fromEntries(Object.keys(enTerms).map((k) => [k, terms[k]]));
  fs.writeFileSync(`i18n-src/${loc}/glossary/terms.json`, JSON.stringify(ordered, null, 2) + '\n');
  const mf = `messages/${loc}.json`;
  const msgs = JSON.parse(fs.readFileSync(mf, 'utf8'));
  Object.assign(msgs, messages);
  fs.writeFileSync(mf, JSON.stringify(msgs, null, 2) + '\n');
}
console.log(`written: ${Object.keys(tr).length} locales`);
// After writing: "Read more" and "Used on" already exist (explore_*_learn_more, credits_used_on);
// the glossary copies those translations so each short label has one form per language.
