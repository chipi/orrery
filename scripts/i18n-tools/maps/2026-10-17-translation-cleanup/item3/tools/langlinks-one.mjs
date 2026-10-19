// en titles -> one lang's langlink, batched <=50 per request, identified UA, backoff on 429.
const [lang, ...titles] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < titles.length; i += 50) {
  const batch = titles.slice(i, i + 50);
  const u = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=langlinks&lllang=${lang}&lllimit=max&titles=${encodeURIComponent(batch.join('|'))}`;
  let r;
  for (let k = 0; k < 4; k++) {
    r = await fetch(u, {
      headers: { 'User-Agent': 'orrery-i18n/1.0 (marko.dragoljevic@gmail.com)' },
    });
    if (r.status !== 429) break;
    await sleep(2000 * (k + 1));
  }
  const j = await r.json();
  const red = Object.fromEntries(
    [...(j.query.normalized ?? []), ...(j.query.redirects ?? [])].map((x) => [x.to, x.from]),
  );
  for (const p of Object.values(j.query.pages))
    console.log(`${red[p.title] ?? p.title} => ${p.langlinks?.[0]?.['*'] ?? '-'}`);
}
