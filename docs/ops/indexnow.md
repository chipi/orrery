# IndexNow submission — `scripts/indexnow-submit.mjs`

`npm run indexnow` tells Bing, Yandex and the other IndexNow engines which URLs exist, so a
deploy is crawled in hours instead of waiting for the next sitemap fetch. Google does not use
IndexNow.

## When to run it

Once after each verified prod deploy (`orrery-deploy-verify`, after `validate-prod` is green).
Not in CI, not on a schedule: a submission is a statement to a third party, so the real run
needs the operator's go.

```sh
npm run indexnow -- --dry-run      # always first: fetches our sitemaps, sends NOTHING to IndexNow
npm run indexnow                   # the real submission
npm run indexnow -- --since 2026-11-01
npm run indexnow -- --base https://www.orrerylearn.com --key <key>
```

## What it does

1. Reads `<base>/sitemap.xml`, follows it to every `/sitemaps/<locale>.xml`, collects each
   `<loc>` (and `<lastmod>`), dedupes. Today: 14 locales, ~13,170 URLs (the 0.9.9 star pages and hub add 938, the black-hole pages and hub 70, the deep-sky pages 1,680: 14,850 in all).
2. `--since YYYY-MM-DD` keeps URLs whose `<lastmod>` is on or after the date. Every URL in our
   sitemaps carries one (the date git last changed the page's content, from
   `src/lib/generated/route-lastmod.json`, regenerated in the release PR), so `--since` narrows to
   the pages changed since the date. A URL without one is kept: unknown is not "old". Run it
   against a deploy whose sitemaps have `<lastmod>`; the sitemaps of a deploy before that have none and
   `--since` sends everything.
3. Checks the key file is live at `<base>/<key>.txt` with exactly the key as body. A real run
   aborts (exit 1) if not; a dry run prints a warning and goes on. The key file is
   `static/<key>.txt`, committed, public by design (the engines fetch it to verify ownership);
   it ships to the site root with the build like `robots.txt` (nginx serves it as `text/plain`
   from `try_files`; it is not in the service-worker precache globs).
4. POSTs `{host, key, keyLocation, urlList}` to `https://api.indexnow.org/indexnow` in batches
   of at most 10,000 URLs, 30 s timeout per request, up to 4 attempts with 1/2/4 s backoff on
   429 and 5xx only. Prints one line per batch; exit 1 on any batch that is not 200/202.

## Responses

| Status | Meaning |
| --- | --- |
| 200 | URLs submitted |
| 202 | accepted; the key file validation is still pending (normal on the first submission) |
| 400 | invalid format |
| 403 | key not valid: the key file is missing or its content differs from the key |
| 422 | URLs do not belong to the host, or the key does not match the schema |
| 429 | too many requests (potential spam); the tool backs off and retries |

## Cloudflare also submits

Cloudflare Crawler Hints submits to IndexNow on its own, with its own key. That is fine: the
engines accept submissions from both, and this tool's key and Cloudflare's do not interact.
This tool exists to submit the full URL list on demand after a deploy.

## Tests

`scripts/indexnow-submit.test.ts` runs the tool against a recorded sitemap index and two locale
sitemaps with `fetch` mocked: parsing, dedupe, `--since`, batching at 10,000, dry run sends no
POST, abort without the key file, non-2xx exit codes. No network.
