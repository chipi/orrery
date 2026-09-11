# Orrery — behavioral analytics running log

A living log of what real users do on prod, so over the first 1-2 months we build a
picture and then improve user flows toward desired outcomes (explore more, discover
/fly, use their own language, complete tours). **Append a dated entry per review**
(roughly weekly). Keep raw numbers + the *behavioral read* + *hypotheses to test*.

Data sources + how to pull: `reference_homelab_observability_access` (memory) and
`docs/wip/2026-08-31-prod-observability-sweep.md` (method). Umami prod website_id
`4a25d8da-63a1-4ef7-b9d3-1b6b8c8a6bce`.

**Caveat on every entry:** numbers are small (new site) and include some operator/dev
traffic (sr-Cyrl locale, `/final-verify` + `/post-closure` entry pages, the deepest
audio-tour sessions). Treat as directional. Real-user counts are slightly lower.

---

## Standing questions we're tracking (the "desired outcomes")

1. **Language:** do non-EN users arrive and stay in their language? (Currently no —
   ~99.5% EN. Levers: multilingual SEO + on-site language suggestion. See
   `multilingual-seo-analysis.md`.)
2. **/fly discovery:** does the flagship cinematic simulator get found & completed?
   (Currently almost never — 4 sessions/30d. Lever: discoverability / entry points.)
3. **Depth & retention:** do people explore beyond the landing page? (Half bounce,
   half go multi-page, 15% go deep — watch the trend.)
4. **Acquisition mix:** social vs search vs direct over time; SEO ramp.
5. **Feature adoption:** audio tour, science content, missions — what pulls & holds.

---

## 2026-08-31 — baseline (first sweep)

**Windows:** 24h / 7d / 30d as noted. First real data after the 2026-08-28 SEO
sitemap submission + a LinkedIn/social wave.

### Acquisition
- 206 sessions/30d, 183/7d. Spike **2026-08-28** (1,554 events / 94 sessions) = social wave.
- **64% of origin requests are bots** (Googlebot/Semrush/Wget/Ahrefs), 35% human-UA.
- Referrers (7d, by session): direct 134 · **LinkedIn 61 (dominant)** · Facebook ~21 ·
  google 8 · bing 7 · chatgpt 6 · duckduckgo 2.
- Geography (7d): US 59 · NL 36 · RS 18 · NZ 14 · DE 8 · IN 7 · IE/GB/SG.
- Devices: laptop/mobile mix; iOS PWA/WebView notable (26+18 /7d).
- **SEO status:** Googlebot actively crawling (1,294+/24h); first google/bing referrals
  appearing. Very early (day 3 post-sitemap).

### Behavior
- **Language: ~99.5% English.** en-US 206 sess vs every other locale ≈0 (sr-Cyrl 1 =
  likely operator). locale-switch fired **once** in 30d. → users don't find/￼use the
  switcher; the answer is localized search landing, not the toggle.
- **Entry pages (30d):** `/` 143 · **`/science/life-in-space/suit-lineage` 15** ·
  `/science/orbits/disposal-end-of-life` 10 · `/explore` 8 · `/science/propulsion/v-infinity` 3.
  → **science deep-content is the #2 acquisition vector** and a proven pull.
- **/fly (flagship simulator):** only **4 sessions** loaded a mission/30d, **1
  completed**. → severe discoverability gap for the crown-jewel feature.
- **Search (in-app):** 0 query events/30d → unused / undiscovered.
- **Bounce:** 105/206 ≈ 51% single-pageview (normal); 42 did 2-3, 28 did 4-6, **31
  (15%) did 7+**. Healthy tail of deep sessions.
- **Audio tour:** 13 sessions/30d fired it (6%); a few very deep (84/77/47 stages, top
  ones likely operator).
- **Most-viewed missions (30d):** voyager-2 3 · artemis2 2 · juice 2 · hera · change6 ·
  rosetta · vega-1/2 · vostok-1 · europa-clipper. → outer-planet + current missions draw interest.

### Durability (context)
- 0 5xx, 0 OOM, hosts healthy. Open tech issues: #517 (i18n bundle 404s), #518 (SW
  install ~8%). Neither user-blocking.

### Reads & hypotheses to test over coming weeks
- **H1 (language):** localized pages are technically well-formed but unindexed; non-EN
  organic will appear as Google indexes (weeks). *Watch:* first non-EN organic session
  + GSC per-locale impressions. *Act:* sitemap hreflang annotations + language-suggestion
  banner (see multilingual-seo-analysis.md).
- **H2 (/fly):** people don't reach /fly because it's not surfaced from where they are
  (home, science, mission pages). *Watch:* mission-load sessions. *Act:* add prominent
  entry points; measure lift.
- **H3 (science pulls):** science essays are the best top-of-funnel. *Act:* more/linked
  science content; watch whether science entries → deeper exploration (do suit-lineage
  landers go on to /explore or /fly, or bounce?).
- **H4 (tour):** audio tour engages a niche deeply. *Watch:* distinct-session count trend
  once operator traffic is excluded.

### Open data-quality to-dos
- Tag/exclude operator/dev traffic (a self-hosted Umami exclusion or a known-session
  filter) so real-user numbers are clean.
- The `search` event fires 0 — confirm it's genuinely unused vs not wired on prod.

---

<!-- APPEND NEXT ENTRY BELOW (copy the 2026-08-31 section shape) -->
## 20XX-XX-XX — (next weekly review)
- Acquisition:
- Behavior (language / /fly / entry pages / bounce / features):
- Deltas vs last entry:
- Hypotheses confirmed/refuted:
- Actions taken / to take:
