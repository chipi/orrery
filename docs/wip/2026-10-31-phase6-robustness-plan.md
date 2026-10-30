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
