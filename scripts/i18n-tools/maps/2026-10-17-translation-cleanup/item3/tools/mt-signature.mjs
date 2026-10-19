// Count strings carrying the old-MT signature: CJK full stop followed by an ASCII space (ja/zh), and translated link paths ](<non-ascii>/...).
import fs from 'node:fs';
import path from 'node:path';
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(d, e.name))
        : e.name.endsWith('.json')
          ? [path.join(d, e.name)]
          : [],
    );
for (const l of process.argv.slice(2)) {
  let sig = 0,
    link = 0;
  const byDir = {};
  const out = [];
  const visit = (v, at, rel) => {
    if (typeof v === 'string') {
      const a = /[。！？] [^\s]/.test(v),
        b = /\]\([^)]*\P{ASCII}[^)]*\)/u.test(v) && !/\]\(https?:/.test(v);
      if (a) {
        sig++;
        const d = rel.split('/')[0];
        byDir[d] = (byDir[d] ?? 0) + 1;
        out.push(`${rel}:${at}`);
      }
      if (b) {
        link++;
        out.push(`LINK ${rel}:${at}`);
      }
    } else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) visit(x, at ? `${at}.${k}` : k, rel);
  };
  for (const p of walk(`i18n-src/${l}`))
    visit(JSON.parse(fs.readFileSync(p, 'utf8')), '', p.slice(`i18n-src/${l}/`.length));
  fs.writeFileSync(`${process.env.OUTD}/mtsig-${l}.txt`, out.join('\n') + '\n');
  console.log(l, 'sig', sig, 'translated-link', link, JSON.stringify(byDir));
}
