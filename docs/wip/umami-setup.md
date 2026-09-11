# Umami — behavioral analytics setup & operations (Orrery)

Self-hosted Umami **v3.3.0** on homelab, shared with podcast_scraper (Player, Operator
viewer). Orrery prod website_id `4a25d8da-63a1-4ef7-b9d3-1b6b8c8a6bce`. Admin UI:
`https://umami.tail6d0ed4.ts.net` (tailnet, operator login). DB access +
query recipes: `docs/wip/2026-08-31-prod-observability-sweep.md`.

**Shared-infra rule:** additive/Orrery-scoped changes are safe; **never restart the
shared Umami container without operator approval** (briefly drops analytics for all
tenants). The exclusion + reports below need NO restart.

---

## 1. Exclude operator/dev traffic (data hygiene — priority 1)

Goal: stop the operator's own test/dev traffic from polluting analytics, WITHOUT
excluding real friends-and-family traffic (which is the current, wanted audience). The
per-browser flag is exactly right for that.

### Method (verified working 2026-08-31): `umami.disabled` localStorage flag
The tracker checks `localStorage.getItem("umami.disabled")` — confirmed in the live
`script.js`. Verified live: with the flag set, `script.js` still loads but **no
`/api/send` beacon fires**.

**Operator, run once in EACH browser/device you use to test** (devtools Console on any
`orrerylearn.com` page):
```js
localStorage.setItem('umami.disabled', '1')   // stop counting me here
// to re-enable: localStorage.removeItem('umami.disabled')
```
Verify: `localStorage.getItem('umami.disabled')` → `"1"`, and the Network tab shows no
`analytics.orrerylearn.com/api/send` POST after a navigation.

Note: it's per-origin per-browser, and clears if you wipe site data — re-run if so.
Do it on: laptop Chrome, phone browser, and any PWA install you test with.

### Alternative (server-side, needs approval): `IGNORE_IPS`
Umami supports an `IGNORE_IPS` env var (comma-separated IPs/CIDRs). Currently **not
set**. To use it: add `IGNORE_IPS=<operator public IP(s)>` to the umami service env in
`~/projects/agentic-ai-homelab/infra/umami/docker-compose.yml` and **restart the umami
container** — that restart is a shared-tenant action → **operator approval required**,
and it needs the operator's (possibly dynamic) public IP. The localStorage method is
preferred: reliable, immediate, no shared-state change.

### Historical cleanup (optional, approval-gated, DESTRUCTIVE)
Past synthetic sessions pollute history: entry pages `/final-verify`, `/post-closure`,
and the deepest audio-tour sessions (84/77 fires) are almost certainly operator/dev.
These can be deleted from `website_event`/`session` for the Orrery website_id — but it's
a destructive delete on the shared prod DB → **do NOT run without explicit per-instance
approval**. Going forward, the exclusion flag prevents new pollution; cleaning history
is cosmetic.

---

## 2. UTM tagging for shared links (separate campaigns/sources)

Umami auto-parses `utm_*` params — **no server config needed**. Just share tagged URLs;
they show up under Umami → the campaign/UTM breakdown. Use this to (a) know which
LinkedIn post drove a spike, and (b) measure the localized-share strategy.

Ready-to-share:
```
English launch:   https://www.orrerylearn.com/?utm_source=linkedin&utm_medium=social&utm_campaign=launch
Science post:     https://www.orrerylearn.com/science/life-in-space/suit-lineage?utm_source=linkedin&utm_medium=social&utm_campaign=suit_lineage
Russian (share on RU channels):  https://www.orrerylearn.com/ru/?utm_source=linkedin&utm_medium=social&utm_campaign=launch_russian
German:   https://www.orrerylearn.com/de/?utm_source=linkedin&utm_medium=social&utm_campaign=launch_german
Spanish:  https://www.orrerylearn.com/es/?utm_source=linkedin&utm_medium=social&utm_campaign=launch_spanish
Italian:  https://www.orrerylearn.com/it/?utm_source=linkedin&utm_medium=social&utm_campaign=launch_italian
Dutch:    https://www.orrerylearn.com/nl/?utm_source=linkedin&utm_medium=social&utm_campaign=launch_dutch
```
Convention: `utm_source` = where (linkedin/twitter/newsletter), `utm_medium` = kind
(social/email/referral), `utm_campaign` = the specific push (launch / suit_lineage /
launch_russian). Keep names lowercase + stable so they group cleanly.

---

## 3. Funnels / Retention / Goals (Umami UI — reports)

These are UI-created reports (stored in the `report` table). I did **not** DB-insert
them: the container is a compiled Next standalone with no readable schema, so hand-
crafting v3.3.0 report JSON into the shared prod DB would be fragile. They take ~2 min
to click, or can be created via the authenticated API if a token is provided. Exact
recipes:

**Funnel — "Explore → Fly" (the key drop-off):** Umami → Reports → Funnel → website
Orrery. Steps (by event/URL):
1. url `/` (or `/explore`) — landing
2. event `mission-view` — opened a mission
3. event `mission-load` — started a flight on /fly
4. event `mission-complete` — finished
Window 30d. → shows exactly where the flagship loses people. (Richer once #521 adds
`fly-reached` / `fly-mission-list-open` / playback-progress stages.)

**Retention:** Umami → Reports → Retention → Orrery, 30d. → do visitors come back?
The single most telling "is it sticky" number; we have zero read on it today.

**Goals:** Umami → Reports → Goals → Orrery. Create goals for the desired outcomes:
- event `mission-complete` (finished a flight)
- event `locale-switch` (or `locale-suggest-accepted` once #519 ships)
- url `/fly` (reached the flagship)
- event `audio-stage-fire` (engaged the tour)

**Journey / Insights:** ad-hoc under Reports → Journey (paths) and Insights (segments)
— useful for "do science-landers go on to /explore or bounce?".

---

## 4. What needs app code (tracked in #521)

Funnels are only as rich as the events emitted. #521 adds: `/fly` stage events, science
read-depth, PWA install/display-mode, search reachability, and an optional in-app
exclusion toggle. Keep event names in sync between #521 and the funnels/goals above.

---

## Status (2026-08-31)
- [x] Exclusion method verified + documented (operator to run the one-liner per browser).
- [x] UTM URLs generated (share them).
- [x] Report recipes documented (operator/pickup-agent to click, ~2 min; or API w/ token).
- [x] Code blind-spots filed as #521.
- [ ] Operator: run the exclusion flag on your devices.
- [ ] Operator: create the funnel + retention + goals reports (or grant an API token and
      a follow-up can script them).
