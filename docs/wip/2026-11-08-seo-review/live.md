# Orrery live SEO checks, 2026-11-08

All read-only. User-Agent for scripted HTTP: `orrery-seo-check (+https://github.com/chipi/orrery)`. No email sent anywhere.
Scripts and raw outputs in this directory: `psi.sh`, `umami.sh`, `umami.out`, `sm.xml`, `robots.txt`, `home.html`.

## 1. Redirects and host hygiene

Commands: `curl -sI -A "$UA" -H 'Accept-Encoding: gzip, br' <url>` for each row; GET with `-D` for sitemap/home body and encoding.

| Request | Result |
|---|---|
| http://www.orrerylearn.com/ | 308 -> https://www.orrerylearn.com/ |
| http://orrerylearn.com/ | 301 -> https://www.orrerylearn.com/ (one hop, straight to https+www) |
| https://orrerylearn.com/ | 301 -> https://www.orrerylearn.com/ |
| https://www.orrerylearn.com/ | 200 text/html, br (12,287 B on the wire, 58,111 B decoded) |
| /missions and /missions/ | both 200, no redirect; both carry canonical `https://www.orrerylearn.com/missions` (no duplicate-content issue) |
| /index.html | 200 (canonical not checked) |
| /de/missions | 200, self canonical `/de/missions`, German title |
| /this-does-not-exist-xyz | 404 (correct status) |
| /' (apostrophe path seen in Umami) | 404 |
| https://orrery.day/ | resolves, 200 on Vercel, but it is a different site: `<title>Orrery — astrological timing`, canonical `https://orrery.day`. Not ours, not a redirect. `www.orrery.day` 307 -> orrery.day |
| robots.txt | 200 text/plain; charset=utf-8, br, `cache-control: max-age=14400`, ends with `Sitemap: https://www.orrerylearn.com/sitemap.xml` |
| sitemap.xml | 200 `text/xml`, `content-encoding: gzip`, 83,722 B gzipped / 7,105,221 B decoded, 3,892 `<loc>` URLs, 58,380 `xhtml:link` alternates. HEAD shows `content-length: 20`, a HEAD artefact (GET returns the full body) |

Sitemap URL spread: 278 per non-English locale x 13 locales + the English set (science 192, programs 43, essays 14, others). Under the 50,000-URL and 50 MB limits.

HTML response headers (home, /missions, /de/missions, 404): no `cache-control`, no `etag`, `last-modified: Thu, 05 Nov 2026 04:25:07 GMT`, `cf-cache-status: DYNAMIC`, `via: 1.1 Caddy`, `vary: Accept-Encoding`, brotli when asked. HSTS preload, CSP, nosniff present. Home has title, description, canonical, hreflang alternates, og:locale; 0 `application/ld+json` blocks on the home page.

robots.txt (Cloudflare managed block + repo block): `User-agent: *` Allow all; Disallows GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, **Baiduspider**, PetalBot, Bytespider and others. Googlebot, Bingbot, DuckDuckBot, YandexBot are not blocked.

## 2. PageSpeed Insights

NOT OBTAINED. Command (`psi.sh`): `curl -G https://www.googleapis.com/pagespeedonline/v5/runPagespeed --data-urlencode url=... -d strategy=mobile -d category=performance -d category=seo -d category=accessibility`, 10 s between calls, 3 tries 30 s apart. Every call (6 routes tried, 18 attempts, 19:54-20:04) returned HTTP 429 with body `Quota exceeded for quota metric 'Queries' and limit 'Queries per day' of service 'pagespeedonline.googleapis.com' for consumer 'project_number:583797351490'`. That is the shared keyless project's daily quota, not a per-minute limit, so retrying within the day cannot work. I stopped the script after /essays/delta-v mobile.

| Route | Mobile perf | LCP | CLS | TBT | SEO score | Failed SEO audits | CrUX |
|---|---|---|---|---|---|---|---|
| all 12 routes x mobile/desktop | no data | no data | no data | no data | no data | no data | no data |

Routes planned: `/ /missions /fleet /science /science/orbits /essays/delta-v /explore /moon /mars /plan /fly /lab`. A local Chromium exists at /usr/bin/chromium but no Lighthouse; I did not install one (new dependency, needs approval). Options: a PSI API key from the operator, rerun after the quota resets (daily), or approve `npx lighthouse` for a lab-only run.

## 3. Search traffic (Umami, website "Orrery" = orrerylearn.com, id 4a25d8da-63a1-4ef7-b9d3-1b6b8c8a6bce)

Recipe: agent-access.md section 6 (API login with `~/umami/.env` on the mini, `/stats`, `/metrics?type=referrer|country|path`, plus its SQL block via `docker exec umami-db psql`). Run with `~/.claude/skills/host-run/scripts/run.sh homelab umami.sh`; output in `umami.out`. Read-only. Window asked: 90 days; **data only exists from 2026-08-16 14:49 UTC (84 days)** to 2026-11-08.

Totals: 3,836 pageviews, 1,883 visitors, 2,025 visits, 580 bounces (28.6% of visits).

Share of the 2,025 visits by first referrer (referrer metric counts visits; google.com 197 matches SQL distinct sessions):

| Channel | Visits | Share |
|---|---|---|
| Direct / no referrer | 1,622 | 80.1% |
| Search | 246 | 12.1% |
| Social (LinkedIn 73, Facebook 49) | 122 | 6.0% |
| AI chat (chatgpt.com) | 24 | 1.2% |
| Other (classroom.google.com 4, humancopilot.eu 3, accounts.google.com 2, misc 2) | ~11 | 0.5% |

Search split:

| Engine | Visits |
|---|---|
| Google (google.com 197, google.com.hk 1, Android Google app 1) | 199 |
| Bing (bing.com 23, cn.bing.com 1) | 24 |
| DuckDuckGo | 13 |
| Yahoo (search.yahoo.com 3, search.yahoo.co.jp 3) | 6 |
| Ecosia | 3 |
| Yandex | 1 |
| Baidu | 0 |

Top landing pages from search referrers (pageviews with a search referrer):

| Page | Referrer | Views |
|---|---|---|
| / | google | 17 |
| /live | google | 10 |
| /de/science/cosmology/cosmic-distance-ladder | google | 7 |
| /ko/science/planets/regolith | google | 7 |
| /science/propulsion/oberth-effect | duckduckgo | 7 |
| / | duckduckgo | 7 |
| /' (404 page) | bing | 6 |
| / | bing | 5 |
| /ja/science/propulsion/throttling-and-gimbaling | google | 5 |
| /science/life-in-space/suit-lineage | bing | 4 |
| /ru/, /ko/science/orbits/orbit-regimes, /sr-Cyrl/moon | google | 4 each |

Most Google landings are localized science articles (de, ko, ja, es, it, ru, fr), spread 2-7 views each: the long tail of translated /science pages is what Google indexes and sends traffic to.

Countries (visits-ish, top 15): US 323, SG 270, DE 262, NL 164, FR 102, GB 87, HK 80, PL 74, CN 58, JP 49, IT 41, RS 40, RO 33, KR 31, SE 30.

Top paths overall: / 336, /fleet 267, /explore 223, /missions 182, /earth 82, /missions/launches 57, /fly 57, /moon 52, /mars 38, /plan 34.

Not covered by the recipe: Search Console queries/impressions/positions (the recipe has no Search Console access), Bing Webmaster data, per-visit landing page (I used pageview rows with a search referrer, which includes non-landing views).

## Ranked findings

1. PSI data could not be collected: keyless daily quota exhausted (429 on every call). Speed, Core Web Vitals and Lighthouse SEO audits are unmeasured.
2. Search is 12.1% of visits (246 of 2,025); 80% is direct. Google is 81% of search. Direct share is high enough that bots/unattributed traffic could be inflating it (SG 270 and HK 80 visits are unusual for the audience); not investigated.
3. Sitemap is 7.1 MB decoded with 58,380 hreflang annotations in 3,892 URLs: valid, but heavy for crawlers to fetch; splitting per locale or a sitemap index would be lighter. Within limits.
4. HTML is not cached at the edge (`cf-cache-status: DYNAMIC`, no `cache-control`, no `etag`): every HTML request goes to the origin via Caddy, and browsers fall back to heuristic caching from `last-modified`.
5. A broken URL `/'` (trailing apostrophe) got 35 pageviews, 6 with a Bing referrer, and returns 404. Somewhere (a link, a Bing-indexed URL) a malformed link exists; source not identified.
6. `orrery.day` is an unrelated astrology site titled "Orrery" on Vercel. Not a redirect issue of ours; brand-name SERP competition for "Orrery".
7. robots.txt disallows Baiduspider (Cloudflare managed block); Umami shows 58 visits from CN and 0 from Baidu. Intentional or not, Baidu cannot index the site.
8. No JSON-LD structured data on the home page (0 blocks); other routes not checked.
9. Title casing: /science/orbits has `<title>ORBITS · Science · Orrery` (all caps slug label); minor.
10. Redirects are clean: single-hop http/apex to https www, 404 status correct, trailing-slash variants canonicalized, locale canonicals self-referencing.

## Not checked

- PageSpeed / Lighthouse / CrUX for all 12 routes x 2 strategies (quota). No field data.
- Google Search Console and Bing Webmaster (queries, indexing coverage, CWV report): no access path in the handbook.
- Canonical and hreflang correctness on pages other than home, /missions, /de/missions, /science/orbits; reciprocal hreflang validity across the 14 locales; sitemap URLs actually returning 200 (not crawled).
- Sitemap vs hreflang mismatch (home hreflang uses `/es/` with trailing slash, sitemap lists non-locale URLs without); not verified for all locales.
- Structured data on routes other than home; Open Graph image existence; mobile rendering of client-side-rendered routes (/fly, /lab, /explore) as Googlebot sees them.
- Whether "direct" contains bot traffic; Umami data before 2026-08-16 does not exist.
- Staging site ("Orrery Staging", chipi.github.io) leaking into search; not looked at.
