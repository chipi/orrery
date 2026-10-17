---
name: orrery-deploy-verify
description: Verify an Orrery staging or prod deploy end to end with the access that already exists — validate-prod against the URL, the o11y-review skill for logs and GlitchTip since the deploy, an Umami event check, source maps (a live chunk carries a debug id that GlitchTip resolves; Cloudflare isn't serving stale chunks) and prod container logs — before asking the homelab or prod sessions.
when_to_use: Use when asked "check staging", "did the deploy work", "verify prod", "is staging isolated", "validate the deploy", after a "Deploy preview" / "Deploy to prod VPS (orrery)" run finishes, and always between the staging deploy and dispatching prod.
---

# orrery-deploy-verify

Memory rule: validate staging (this change set, evidence per item) before dispatching prod.
On 2026-10-16/17 most of this was done by messaging the homelab and prod sessions; the
access to do it directly already exists.

## 1. The site

```bash
VALIDATE_URL=https://chipi.github.io/orrery node scripts/validate-prod.mjs     # staging
VALIDATE_URL=https://www.orrerylearn.com    node scripts/validate-prod.mjs     # prod
```

Opts out of analytics; checks headers, routes, 404s, data, the Umami SRI pin. Staging:
first wait until `/orrery/_deploy-sha.txt` equals the deployed SHA (Pages publish lag).

## 2. Logs, errors, traces since the deploy

Load **`o11y-review`** (shared skill) for project `orrery` from the deploy time: VictoriaLogs
`app:orrery`, GlitchTip (prod 18, staging 6, dev 30, lab-api 31, mcp 32), traces.
Raw queries when needed (tailnet, read-only):

```bash
VL=https://vlogs.tail6d0ed4.ts.net
curl -s --get $VL/select/logsql/query --data-urlencode 'query=_time:[<deploy>, now] container:orrery-web "_app/immutable" " 404 " | stats count() n'
curl -s --get $VL/select/logsql/query --data-urlencode 'query=_time:1h container:orrery-mcp | fields _time,_msg' --data-urlencode limit=30
```

## 3. Analytics

Umami lives on the mini (`/work/agentic-ai-homelab/docs/recipes/agent-access.md` §6). Prod
site 4a25d8da, staging 6e7ddfce, dev 90cbabf7. Bot UAs are dropped (`{"beep":"boop"}`); a
stored event answers `{"cache":…}`. If this machine has no key for the mini, that's the
one thing to ask homelab for.

## 4. Source maps (#595)

```bash
c=$(curl -s https://www.orrerylearn.com/ | grep -o '_app/immutable/[^"]*\.js' | head -1)
curl -sI https://www.orrerylearn.com/$c | grep -i 'cf-cache-status\|cache-control'
curl -s https://www.orrerylearn.com/$c | grep -o 'sentry-dbid-[0-9a-f-]\{36\}' | head -1
```

Every real-code chunk carries a debug id (3 map-less stubs/helpers don't). A chunk
without one under a hashed name = a stale Cloudflare copy → purge. Resolution to source:
a real prod error in project 18 shows source context.

## 5. Prod containers

`ssh deploy@prod-podcast.tail6d0ed4.ts.net` works from CI (pinned host key) but this
workstation's key is refused — container logs and `docker inspect` go through the prod
session. Ask it only for that.

## Report

Per check: PASS/FAIL with the command and an output fragment; and a NOT CHECKED list
(anything you asked another session for, or skipped) at least as long.
