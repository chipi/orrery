# Tech-debt Phase 6 — robustness

Branch `tech-debt/phases` (never merged to main from this arc). Follows Phase 5
([2026-10-30-phase5-bundle-size-plan.md](2026-10-30-phase5-bundle-size-plan.md)).

Items (from the 2026-10-29 plan): launch-data refresh retry + log rotation;
lab-api `/ask` deadline and limits, refresh-token TTL, DCR eviction, corrupt
`state.json`; MCP JWKS 503; axe on 16 routes; iOS privacy manifest and backup
rules; observability gaps. Optional at the end, to be discussed first: a hand
read of the translated essays and science pages.

## 1. Launch-data refresh — done

Evidence (VictoriaLogs, job `orrery-data-refresh` + the pipeline-runner
container, 2026-10-23 → 10-29): LL2's `launches/upcoming` answered
`504 Gateway Timeout` on 2026-10-23, 10-25, 10-28 and 10-29 (twice), mostly on a
later page (`offset=100`/`200`), five of six in the 00:00Z run. A failed page
threw (only 429 was retried), so the whole upcoming queue was dropped; the
manifest then fell under the size floor and `refresh-prod-data.sh` restored the
previous `launches.json` ("FETCH FAILED or empty"). The site stayed up with data
six hours older.

Fix: `fetchLL2Page` (src/lib/launches/sources/ll2.ts) retries network errors
and 5xx twice, after 10 s and 30 s (the free tier allows ~15 calls an hour); a
429 still waits for `retry-after` and does not use up a retry; 4xx is final.
Five unit tests; with the old function all five fail.

Log rotation: the deploy@ crontab appends to `/srv/orrery/data-refresh.log` with
no rotation and `deploy` cannot install a root logrotate config. The script
trims the file in place once it passes 2 MB, keeping the last 5,000 lines (in
place because cron's `>>` already holds the file open). Tested against a log held
open in append mode: a 100-line log is left alone; a 6,000-line one keeps lines
1001–6000 plus the notice, and a later write through the open descriptor lands at
the end.

Cron moved off the hour (operator yes, 2026-10-31): `17 1-23/6` — 01:17, 07:17,
13:17, 19:17 UTC. Five of the six failures were in the 00:00Z run; every run
started on the hour, so the logs could not show whether another time avoids the
504s — the retries are the fix, the shift is a cheap bet. The homelab alert
(`orrery-launch-data-stale`) counts successes over 7h, so the shift cannot trip
it. Both reach prod at the next deploy (the deploy installs the crontab).

## 2. lab-api — done

Source: GitHub #597 (v1.0 security review). Already in the code before this
phase: the `redirect_uris` caps, the `/register` and pre-auth rate limits keyed
on the Caddy-set client IP, `no-store` on `/token`, skipping a null `history` item.

`/ask` (ask.ts, index.ts): one request could make 7 LLM calls of up to 60 s
(~7 minutes). Now a 120 s deadline per request: each tool round gets the time
left minus a 20 s reserve for the final synthesis; under 5 s it goes straight to
synthesis, and with no time it returns the localized budget message without an
LLM call. The question is capped at 2,000 characters (400), and at most 8 tool
calls run per round (the rest get an error result the model can read).

Tokens (tokens.ts, as.ts):

- Refresh tokens expire 30 days after issue. They rotate on every use, so this is
  an idle timeout; expired ones are pruned. Tokens in a state file from before
  this change get 30 days from the first load, not instant expiry.
- DCR eviction: when the 500-client store is full, the least recently used client
  with no live refresh token goes. A `/register` flood (its clients never sign in)
  can only evict itself; if every client is in use, `/register` answers 503.
- A corrupt `state.json` no longer stops the server starting (`JSON.parse`
  threw in `TokenCore.load`): it is moved to
  `state.json.corrupt-<ms>` and the server starts with new keys (every client
  signs in again).

Tests: 3 /ask unit tests + 1 route test, 5 token tests; with the old files, 3/3
and 4/5 fail (the fifth checks old tokens are not expired at once, which the old
code also satisfies). The lab-api tests also had a port race in their setup
(EADDRINUSE once locally): `test-listen.ts` retries on a fresh port; 5/5 runs
pass.

Not done from #597: a consent page or redirect-host allowlist for DCR clients
(the MCP tools are pure math today). Sign-in emails in `as.ts`/`google.ts` are
already logged through `redactEmail`; whether the server's Sentry `beforeSend`
drops breadcrumbs was not checked.

## 3. MCP server: issuer unreachable — done

With a cold JWKS cache and lab-api unreachable, `verifyRequestToken` caught every
error as `invalid_token`, so `/mcp` answered 401. A 401 tells the client (Claude.ai)
its token is bad, so it drops it and the user has to sign in again. Probed against
jose 6.2.10: a refused connection throws `TypeError: fetch failed`, a non-200
`/jwks` a bare `JOSEError` (`ERR_JOSE_GENERIC`), a timeout `JWKSTimeout`, a
missing key `JWKSNoMatchingKey`. The first three (plus `JWKSInvalid`) now give
`issuer_unavailable` → 503 with `Retry-After: 30`; a missing key and every token
fault stay 401. Three new tests (refused, 500, the route's 503) fail against the
old code; a bad token with the issuer up still gives `invalid_token`.

## 4. axe on every static route — done

`tests/e2e/a11y.spec.ts` gated 11 routes. A survey of the other 23 static routes
(desktop + mobile) found serious findings on 12: muted text at 3.1–4.4:1
(white at 0.35–0.45 alpha, 9–12 px), links told apart from prose by colour only,
`aria-label` on a role-less `div` (lab equation), the mars red as text (3.98:1),
the white-on-orange "imminent" badge on /live (4.11:1), and the fixed footer menu
(55 % backdrop) over the gold launcher cards on /fleet. Fixed in place: the
flagged rules raised to 0.55–0.6 alpha (the high-contrast theme's faint level is
0.5), links in prose underlined, `role="group"` on the equation, a lighter red
for the failure readout, a darker badge, an 85 % footer backdrop. All 23 are now
in the gate (34 routes): 68 passed on desktop + mobile. Screenshots of /credits,
/posters and the /fleet footer checked by eye.

CI (ee4174ea1d9) then timed out on /credits on three shards: axe walked all
2,760 photo rows (57–60 s locally, more on a CI runner). The gate now scans the
first 5 rows per source (`exclude: '.photo-list > .photo:nth-child(n+6)'`):
22–26 s locally, and putting back one of the fixed low-contrast labels still
fails it (150 nodes).

Not covered: dynamic routes (`/missions?id=`, `/programs/[id]`, `/essays/[slug]`,
science sections, cards) and panel states opened by interaction; minor and
moderate axe findings are logged, not gated.

## 5. iOS privacy manifest and backup rules — done (iOS build unverified locally)

Privacy manifest: the App target had none, and `AppDelegate.swift` uses
`UserDefaults` (a required-reason API; Apple rejects uploads that use one
undeclared). `ios/App/App/PrivacyInfo.xcprivacy` declares UserDefaults `CA92.1`,
no tracking, and the data the app sends, taken from the code: crash data
(GlitchTip, `sendDefaultPii: false`, traces off), product interaction (Umami,
analytics), and the email of a Lab sign-in (linked, app functionality). These must
match the App Store Connect privacy answers — **the operator should check them**.
Registered in `project.pbxproj` (file reference, group, Resources phase); the
`native-build` iOS job now fails if `App.app/PrivacyInfo.xcprivacy` is missing or
fails `plutil -lint`.

Backup: offline packs (basic 170 MB, full ~800 MB) are written to Capacitor
`Directory.Data`, which is Documents on iOS (iCloud-backed by default) and
`filesDir` on Android (Auto Backup, which stops altogether past 25 MB) — mappings
read from the plugin source. iOS: `AppDelegate` creates `Documents/offline` and
sets `isExcludedFromBackup` on it at launch (covers existing downloads in place;
moving to `Directory.LibraryNoCloud` would orphan them). Android:
`res/xml/backup_rules.xml` + `data_extraction_rules.xml` exclude `file:offline/`,
wired in the manifest; `./gradlew :app:processDebugResources` links them and the
merged manifest carries both attributes. The native-build Android job now checks
the APK manifest for them.

Not verified locally: the iOS build and the Swift (no Xcode on Linux) — the CI
`ios` job builds it; no device test of the exclusion flag.

## 6. Observability gaps — done

Source: the 2026-10-29 "not covered" review of observability config. The code
gaps it named:

- Breadcrumbs: the web hook only stripped navigation URLs, so http/fetch/xhr
  crumbs kept query strings (an OAuth `code`/`state`, search terms), and the
  servers had no `beforeBreadcrumb`. One scrubber,
  `src/lib/observability/scrub-breadcrumb.ts`, now serves both: typed input
  dropped, query and hash stripped from every crumb URL, emails masked in console
  crumbs. Tested as a unit, through the web `initSentry` options, and end to end
  on the server (an envelope sent to a sink carries the scrubbed crumbs; removing
  the hook fails that test). Both server bundles build with it.
- `/ask` 502 and 503 had no HTTP test: an unreachable gateway gives
  `502 llm_unavailable`; a fifth ask while four are held open by a gateway that
  never answers gives `503` with `Retry-After: 10`. Server + observability suites
  passed 3/3 runs (205 tests).

Not changed: Umami `search` / `cmdk-search-hit` events still carry the typed query
(truncated to 40 characters); the OTLP exporter has no sampler set (the default
applies). The review's "not verified" items (Umami ingestion, source-map
resolution, an outage drill on prod) are checks against live systems, not code.

### 5a. App Store Connect privacy answers (2026-10-31)

Apple has no API-key route for the App Privacy answers (fastlane:
`upload_app_privacy_details_to_app_store` needs an Apple ID), and no App Store
Connect key is on the workstation or the mini, so they could not be read or set
from here. Instead `ios/App/fastlane/app_privacy_details.json` holds the answers
and `APPLE_ID=… bundle exec fastlane privacy` (from `ios/App`) uploads them; a
script check confirms they match `PrivacyInfo.xcprivacy` one for one.

Re-derived from the code: crash data (not linked, app functionality); product
interaction and search history (Umami keeps the first 40 characters of a query;
not linked, analytics); other user content (Lab /ask questions go to the LLM
gateway with a random request id; not linked, app functionality); email address
(Lab sign-in; linked, app functionality). Location is not collected: /earth and
/moon use it on the device only. No tracking.

Open: the /privacy page says "You never need an account … no name, email
address or password to give" and does not mention the Lab sign-in or that /ask
questions go to an LLM; it needs a section in all 14 locales.

## 7. Last item of the phase: a Glossary page (operator idea, 2026-10-31)

To reassess after the space-terms pilot
([2026-10-31-space-terms-glossary-pilot.md](2026-10-31-space-terms-glossary-pilot.md)).
A low-profile `/glossary` page, like the glossary at the back of a technical book:
each technical term with a short definition in the reader's language, built from
the glossary's `term` section, and optionally a reverse index of the site pages
that use it most (`term-drift.mjs` already finds every field that uses a term).
