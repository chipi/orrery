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

Not done: moving the cron off 00:00Z. Five of the six failures were in the
00:00Z run, but every run starts on the hour, so the logs do not show whether a
different minute or hour would avoid the 504s. It is a one-line change to the
crontab in `deploy-prod.yml`; it waits for the operator. Takes effect on prod at
the next deploy (the script ships with it).

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

Not covered: dynamic routes (`/missions?id=`, `/programs/[id]`, `/essays/[slug]`,
science sections, cards) and panel states opened by interaction; minor and
moderate axe findings are logged, not gated.
