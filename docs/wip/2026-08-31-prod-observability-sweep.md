# Orrery prod — observability + UX analytics sweep (2026-08-31)

Cross-source review of production: VictoriaMetrics (metrics), VictoriaLogs (nginx),
GlitchTip (errors), Umami (analytics) — all self-hosted on homelab. Windows: 24h /
7d / 30d as noted. Numbers are small (new site); **some traffic is operator/dev**
(sr-Cyrl locale, `/final-verify` + `/post-closure` entry pages, the 84/77-fire audio
sessions are almost certainly test traffic) — treat absolute counts as directional.

## Durability / health — SOLID

| Layer | Signal | Verdict |
|---|---|---|
| Metrics | orrery VPS (`prod-podcast`): CPU ~10%, mem 66% free, disk 49% free, load 0.38, uptime 26d, **0 OOM (24h)** | healthy |
| Logs | 17,950 req/24h → 2xx 91.9% / 3xx 7.7% / 4xx 0.45% / **5xx 0** | healthy |
| GlitchTip | prod project 18: 3 issues, all count=1 (1 is a probe); no recurring errors | healthy |
| Umami | 206 sessions/30d, deep engagement events present | real usage |

Only DOWN scrape target is `vllm`/`dgx-llm-1` — the GPU box, unrelated to Orrery.

### Two issues filed (the only real tech items)
- **#517** (`bug, i18n, infrastructure, production`) — i18n overlay bundle
  intermittently fails to load client-side → legacy per-file 404 fallback → that
  render silently loses overlay/translation content. Origin bundle is healthy (96×200
  + 12×304 in 24h, zero real failures); 404s are bursty (5 of 24 hours; 0 in the last
  2h), mostly Googlebot. Low-medium severity, self-correcting per session.
- **#518** (`bug, infrastructure, production, performance`) — ~8% SW install-failure
  rate. Atomic 37 MB / 504-entry precache (incl. all 14 locale bundles ~24.5 MB) +
  CDN-stale `sw.js` after deploy. Cross-platform (NOT iOS-quota as the code comment
  guessed). Self-healing; delays deploy propagation for a small %.
- Both share a root fragility (large atomic precache + per-locale bundles) and both
  benefit from the pending Cloudflare `sw.js`/`env.js` cache-bypass rule
  (see `docs/wip/2026-08-30-prod-sentry-dsn-and-env-js-cache.md`).

## Traffic & acquisition (7-30d)

- **206 sessions/30d, 183/7d.** Spike 2026-08-28 (1,554 events / 94 sessions) — a
  LinkedIn/social wave.
- **64% of origin requests are bots** (Googlebot, SemrushBot, Wget, Ahrefs…), 35%
  human-UA. This quantifies the earlier "Cloudflare ~1k vs Umami ~166" gap — Umami
  counts only JS-executing humans; the CDN counts the bot bulk too.
- **Referrers (7d):** direct 134 sess · **LinkedIn 61** (dominant) · Facebook ~21 ·
  **google.com 8 · bing.com 7** · chatgpt.com 6 · duckduckgo 2.
- **SEO is starting to land:** first Google/Bing referrals + Googlebot actively
  crawling (1,294+ hits/24h) after the 2026-08-28 sitemap submission. Early days.
- **Geography (7d sess):** US 59 · NL 36 · RS 18 · NZ 14 · DE 8 · IN 7 · IE/GB/SG.
- **Devices:** healthy laptop/mobile mix; notable iOS PWA/WebView share (ios-webview
  26 + ios 18 / 7d).

## UX / product signals — the actionable part

1. **The site is ~99.5% English.** 30d: en-US 206 sessions vs **every other locale ≈0**
   (sr-Cyrl 1 = likely operator; de/fr/es/ja/zh/ar/ru/hi/it/nl/pt-BR = zero URL-prefix
   sessions). Browser languages are overwhelmingly English variants. locale-switch
   fired once (to sr-Cyrl). **Implication:** the 14-locale translation investment is
   currently unused by real traffic — which is *why #517's translation-loss impact is
   low-urgency today*. hreflang tags are in place; localized pages just aren't being
   discovered yet (very early post-SEO). Recommendation: hold further translation
   spend until non-EN traffic actually appears; keep the SEO hreflang plumbing.

2. **Science deep-content is the #2 acquisition vector after home.** Entry pages (30d):
   `/` 143 · **`/science/life-in-space/suit-lineage` 15** · `/science/orbits/disposal-
   end-of-life` 10 · `/explore` 8 · `/science/propulsion/v-infinity` 3. People land
   directly on specific science essays (LinkedIn shares + Google). **Lean into science
   content** — it pulls traffic and holds it.

3. **/fly (the flagship cinematic simulator) is under-discovered.** 30d: only **4
   sessions** loaded a mission (5 loads), **1 completed**. The crown-jewel feature is
   barely being reached. This is a discoverability problem, not a quality one — worth a
   stronger entry point from home / mission pages / science.

4. **In-app search is unused** — 0 `search` events with a query in 30d. Either
   invisible or not wanted; not currently a content-gap signal source. Consider
   surfacing it better or de-emphasizing.

5. **Engagement is real for those who stay.** Bounce (1 pageview) = 105/206 ≈ **51%**
   (normal for new + social/bot traffic); but 42 sessions did 2-3 pages, 28 did 4-6,
   **31 (15%) did 7+**. Custom events/7d: route-enter 326, audio-stage-fire 297,
   item-click 250, layer-toggle 82. The **audio tour** engaged **13 sessions** (6%),
   a few going very deep (84/77/47 stages — top ones likely operator).

6. **Most-viewed missions (30d):** voyager-2 3 · artemis2 2 · juice 2 · hera · change6
   · rosetta · vega-1/2 · vostok-1 · europa-clipper. Outer-planet + current missions
   (JUICE, Hera, Europa Clipper, Chang'e 6) draw interest — a content-priority hint.

## Recommendations (priority order)

1. Ship the Cloudflare `sw.js`/`env.js` cache-bypass (already planned) — fixes config
   freshness + helps #518 and #517 at once.
2. Improve **/fly discoverability** — the flagship is barely found. Surface it from
   home + mission detail + relevant science pages.
3. **Lean into science deep-content** for SEO/social — it's the proven pull.
4. **Pause additional translation spend** until non-EN traffic materializes; the
   plumbing (hreflang, bundles) is already in place to catch it when it does.
5. Make #517/#518 failures observable at the source (emit a Sentry event on bundle-
   load / SW-install failure) so the real rate is measured, not inferred.

## How this data was pulled (for the pickup agent)

All via `ssh homelab-claude` (user `claude`, docker at `/usr/local/bin/docker`):
- **Umami:** `docker exec -i umami-db psql -U umami -d umami` — prod website_id
  `4a25d8da-63a1-4ef7-b9d3-1b6b8c8a6bce`; custom-event props in `event_data`
  (join `website_event_id` = `website_event.event_id`).
- **GlitchTip:** `docker exec -i glitchtip-postgres-1 psql -U glitchtip -d glitchtip` —
  `issue_events_issue` + `issue_events_issueaggregate` (event counts); prod project 18.
- **VictoriaLogs:** `curl localhost:9428/select/logsql/query` — nginx stream
  `{container="orrery-web"}`; parse HTTP status positionally (byte-size field can
  false-match a naive ` 5xx ` grep — verified pitfall).
- **VictoriaMetrics:** `curl localhost:8428/api/v1/query` — PromQL (`up`, node_*).
