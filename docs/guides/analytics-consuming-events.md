# Consuming the analytics — configuring Umami

Operator guide. The events are defined in `src/lib/analytics.ts` (that registry
is the single source of truth); this is the other half — **what to set up in
Umami so the events answer questions**. Decisions: [ADR-081](../adr/ADR-081.md)
(integration), [ADR-082](../adr/ADR-082.md) (env ladder),
[ADR-092](../adr/ADR-092.md) (opt-out + privacy posture).

**Instance: Umami 3.3.0**, self-hosted on the mini. Verified 2026-09-10.

## Access

- **Admin UI** — the tailnet caddy-tailscale node (see the homelab repo,
  `infra/umami/README.md`). Credentials: user `admin`, password in `~/il/.env`
  (`UMAMI_ADMIN_PASSWORD`) on the mini, also on the homelab start page.
- **The public `analytics.orrerylearn.com` vhost serves only `/script.js` and
  `/api/send`** and 404s everything else, by design (ADR-081). This matters for
  heatmaps — see below.
- **Direct SQL, no credentials needed, on the mini:**
  `docker exec -it umami-db psql -U umami -d umami`
- **Sites:** prod `4a25d8da…` (orrerylearn.com), staging `6e7ddfce…`
  (chipi.github.io), dev `1d2f214c…`. Three isolated sites — check which one
  you're looking at before drawing conclusions.

## What this Umami build actually offers

Report types present in 3.3.0: **funnel, journey, retention, goals, heatmap,
breakdown, attribution, UTM, performance, revenue.**

Two different surfaces, and the distinction governs everything below:

| Surface | Where | Matches on |
|---|---|---|
| **Events + Properties** | Events page → **Properties** tab | event name **and its property values** |
| **Reports** (funnel/journey/goal) | **Analysis →** the report | event **name** or URL only — **not properties** |

> **The constraint that matters.** Funnel, Journey and Goal steps are "Viewed
> page" or "Triggered event" — you type a URL or an **event name**. There is no
> property condition in the step form. So a single event carrying a
> discriminating property (a hypothetical `fly-phase` + `phase=cruise`) could
> **not** be split into funnel steps. That is exactly why `/fly` emits one event
> name per act (`fly-ascent` … `fly-recovery`) instead. Property analysis
> happens on the Events → Properties tab, or in SQL.

## Recipes per question

### 1. Planner engagement — Funnel ✅ works today

**Analysis → Funnel → add Funnel.**

- **Window:** 30 minutes (max gap allowed between steps).
- **Step 1:** Triggered event → `plan-run`
- **Step 2:** Triggered event → `plan-window-select`

Gives conversion + drop-off between computing a porkchop and engaging a
solution. Works because these are two distinct event *names*.

### 2. Exploration → learning — Journey ✅ works today

**Analysis → Journey.** 3–7 sequential steps; start/end can be a page or an
event. Set start = Viewed page `/explore*`, end = Viewed page `/science*` to see
the real paths between them (and where people drop instead).

### 3. Property breakdowns — Events → Properties tab ✅ works today, zero setup

No report needed. Events page → **Properties** shows every property key and a
breakdown of its values, with filtering by property name/value. Use it for:

- `explore-depth` → `level` — how far out the scale ladder people get
- `science-section-view` → `source` — **which route sent them to the science
  content** (`(none)` = cold entry from search/direct link)
- `science-to-app` → `destination` — where learning sends them next
- `plan-run` → `trigger` — `initial` (landed) vs `destination-change`
  (deliberately compared destinations)
- `fly-ascent` … `fly-recovery` → `mission` / `dest` — which missions reach which act

### 4. Returning visitors — Retention ✅ works today

**Analysis → Retention**, pick a month. Daily-cohort grid. No event setup.

### 5. Conversion points — Goals ✅ works today

**Analysis → Goals.** One action per goal: a URL or an event name. Good
candidates: `mission-complete`, `tour-complete`, `plan-window-select`.

### 6. Flight progression — Funnel ✅ works today

`/fly` emits **one event name per act**, precisely so this report works:

**Analysis → Funnel → add Funnel.** Window 60 minutes, then:

- Step 1: Triggered event → `fly-ascent`
- Step 2: Triggered event → `fly-coast` *(Earth-orbit capsules only — omit for
  interplanetary missions)*
- Step 3: Triggered event → `fly-cruise`
- Step 4: Triggered event → `fly-descent`
- Step 5: Triggered event → `fly-recovery`

Each fires once per mission+act, so scrubbing the master timeline back and forth
does not inflate the funnel. `mission` and `dest` ride along as properties for
filtering on the Events page.

`explore-depth` stays as one event with a `level` property: the scale ladder is
strictly monotonic (you cannot reach `milky-way` without passing
`neighborhood`), so the Properties breakdown already gives the same drop-off
curve without adding eight event names.

### 7. Heatmaps — NOT ENABLED, deliberately

Umami 3.3 supports heatmaps, but they are driven by the **session recorder**,
and we are **not turning it on** (operator decision, 2026-09-10). For the record,
enabling it would require all four of:

1. Websites → Edit → **Replays & Heatmaps** → toggle Replay (sample rate
   default `0.15`). Currently `recorder_enabled = false` on every site.
2. A **different tracker script** — `/recorder.js`, not `/script.js` — i.e. a
   code change in `initAnalytics()`.
3. **An edge change:** `ops/caddy/orrery-analytics.caddy` allowlists exactly
   `/script.js` and `/api/send`, so `/recorder.js` 404s at our own edge.
4. **A CSP change:** the overlay iframes the live page from the Umami origin, so
   `ops/docker/nginx.conf` would need
   `frame-ancestors 'self' https://<umami-origin>` in place of the current
   `'none'`.

Why we are not doing it: session replay is a materially different category of
collection from counting events, `/privacy` currently tells users something
narrower (ADR-092), and (4) loosens a security header we set to `none` on
purpose. Revisit only with an ADR amendment and a `/privacy` copy change.

## The zero that means BROKEN, not unused

On 2026-09-10 the event list showed **`app-load` with 0 events against 731
`route-enter`s**. Not unused — broken. `+layout.svelte` called `initAnalytics()`
(which appends a `<script defer>`) then `track()` on the next line, while
`window.umami` was still undefined, so the event evaporated. The module even
claimed events were "safe before the script loads (it queues)" — false; Umami's
queue only exists once its script defines the global. Fixed by buffering
pre-load events and flushing on script load.

**After any deploy that touches instrumentation, open the Events page.** An
event in `EVENT_NAMES` with no rows is a bug report, not a usage statistic.

## Before you trust a number

- **Check the site** — prod / staging / dev are separate; staging gets CI and
  deploy-smoke traffic.
- **Opted-out visitors are invisible** (ADR-092: opt-out cookie, GPC, or DNT
  suppress everything, including the script — and, since the 2026-09-10 review,
  Sentry crash reports too). Totals under-count real traffic by an unknown
  margin. That is the design.
- **`explore-depth` never emits the entry shell** (`solar-system`). It means
  "left the opening view", so it is not a count of `/explore` visitors — use the
  `/explore` pageview as the denominator for any exploration rate.
- **Milestone events dedupe per page-load**, not per session — a reload counts
  again. Count distinct sessions for rates.
- **`route-enter`/`route-exit` duplicate stock pageviews.** Use them for
  `dwell_ms` and `from_route`; use pageviews for traffic.
- **The last route of a session never emits `route-exit`** — no unload flush, so
  final-route dwell is structurally missing.
- **Event names are capped at 50 chars** and event data cannot be sent without
  an event name.

## Appendix — SQL and the optional Grafana dashboard

Umami's UI cannot express session-scoped ratios ("sessions containing X ÷
sessions that entered Y"). For those, query Postgres directly.

Schema (verified 2026-09-10 against the running instance):
`website_event(event_id, website_id, session_id, visit_id, created_at, url_path,
event_type, event_name, …)` — `event_type` 1 = pageview, 2 = custom;
`event_data(website_event_id, website_id, data_key, string_value, number_value,
data_type, …)`; `session(session_id, website_id, browser, os, device, country,
…)`.

Exploration rate — of sessions that opened `/explore`, how many interacted:

```sql
with explorers as (
  select distinct session_id from website_event
  -- regex, not '/explore%': localized routes are /de/explore and staging is
  -- served under an /orrery base.
  where website_id = :site and url_path ~ '(^|/)explore(/|$)'
),
interacted as (
  select distinct session_id from website_event
  where website_id = :site
    and (event_name = 'explore-depth'   -- never emitted for the entry shell
         or (event_name = 'item-click' and url_path ~ '(^|/)explore(/|$)'))
)
select (select count(*) from explorers) as explore_sessions,
       (select count(*) from explorers e join interacted i using (session_id)) as interacted;
```

Engaged Learning Session — a session that both interacted *and* learned:

```sql
with per_session as (
  select session_id,
    bool_or(event_name in ('item-click','explore-depth','plan-run',
                           'fly-ascent','fly-coast','fly-cruise','fly-descent','fly-recovery')) as interacted,
    bool_or(event_name in ('science-section-view','science-to-app')) as learned
  from website_event
  where website_id = :site and event_type = 2
  group by session_id
)
select count(*) filter (where interacted and learned) from per_session;
```

**`ops/observability/dashboards/orrery-analytics.json`** wraps these as Grafana
panels (every query executed against the live DB before commit). It is
*optional* — Umami's own UI is the primary surface; the dashboard exists because
it is version-controlled and therefore survives a reprovision of the Umami
instance, which the homelab docs record as having happened once already. Add the
`umami-db` Postgres as a Grafana datasource, then
`./ops/observability/dashboards/import.sh`.

## Sources

- [Funnel report](https://docs.umami.is/docs/funnel) ·
  [Goals](https://docs.umami.is/docs/goals) ·
  [Journey](https://docs.umami.is/docs/journey) ·
  [Retention](https://docs.umami.is/docs/retention) ·
  [Heatmaps](https://docs.umami.is/docs/heatmaps) ·
  [Track events](https://docs.umami.is/docs/track-events)
