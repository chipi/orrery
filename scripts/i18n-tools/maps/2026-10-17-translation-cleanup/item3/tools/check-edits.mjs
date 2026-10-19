// Check an agent edit file against the repo: old == current, links == English links, numbers of English present in new.
import fs from 'node:fs';
const [loc, f] = process.argv.slice(2);
const get = (o, at) => at.split('.').reduce((a, k) => a?.[k], o);
const rd = (l, rel, at) =>
  rel === 'messages'
    ? JSON.parse(fs.readFileSync(`messages/${l}.json`, 'utf8'))[at]
    : get(JSON.parse(fs.readFileSync(`i18n-src/${l}/${rel}`, 'utf8')), at);
const links = (s) => (s.match(/\]\([^)]*\)/g) ?? []).join(' ');
const nums = (s) =>
  new Set((s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/[,](?=\d{3}\b)/g, '')));
let bad = 0;
for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  const p = [];
  const cur = rd(loc, e.rel, e.at),
    en = rd('en-US', e.rel, e.at);
  if (cur !== e.old) p.push('OLD≠current');
  if (typeof en !== 'string') p.push('no EN');
  else {
    if (links(e.new) !== links(en)) p.push(`links ${links(en)} | ${links(e.new)}`);
    const miss = [...nums(en)].filter((n) => !nums(e.new).has(n));
    if (miss.length) p.push(`missing nums ${miss.join(' ')}`);
  }
  if (p.length) {
    bad++;
    console.log('✗', e.rel + ':' + e.at, '|', p.join(' | '));
  }
}
console.log('checked', JSON.parse(fs.readFileSync(f, 'utf8')).length, 'flagged', bad);
