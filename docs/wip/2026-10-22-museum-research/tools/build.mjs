import { readFileSync, writeFileSync } from 'node:fs';
const dir = process.argv[2];
const data = readFileSync(`${dir}/pagedata.json`, 'utf8').replace(/</g, '\\u003c');
const html = readFileSync(new URL('./template.html', import.meta.url), 'utf8').replace('__DATA__', () => data);
writeFileSync(`${dir}/museum-review.html`, html);
console.log('bytes', html.length);
