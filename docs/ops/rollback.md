# Rolling back a bad prod deploy

**Decision (2026-11-09):** the rollback for a bad prod deploy is to **redeploy
the previous working release**, then **fix forward on `main`**. No revert-and-wait
cycle during an incident.

**Status:** this runbook describes `Deploy to prod VPS (orrery)` with the
`release_tag` input from `docs/wip/2026-11-09-deploy-release-tag.patch`. Until
that patch is applied to `.github/workflows/deploy-prod.yml`, the input does not
exist and the older procedure in [deploy-prod-vps.md](deploy-prod-vps.md)
("Rollback") is the only one.

## When to roll back

Roll back when a deploy left the public site or a backend broken and the cause is
not a one-line fix you can ship in minutes: the `validate` job is red on
something users hit, routes 500/blank, lab-api or mcp crash-looping, the wrong
data served. Do not roll back for a problem the previous release also had.

## Roll back

From any checkout with `gh` authenticated, dispatch from `main` (the deploy job
only runs on `main`) and name the last good release tag:

```bash
gh workflow run "Deploy to prod VPS (orrery)" --ref main -f release_tag=v0.9.7
```

What the tag drives (blank `release_tag` = today's behaviour, main HEAD):

| Part | Comes from with `release_tag` |
|---|---|
| Static bundle (`build/`, `static/data` seed) | built in the job from the tag's commit |
| Server files (compose, Caddy drop-ins, `ops/`) | VPS `git fetch <sha>` + `git reset --hard <sha>` |
| `orrery-mcp`, `orrery-lab-api`, `orrery-pipeline-runner` | GHCR `sha-<7>` of the tag's commit |
| `ORRERY_RELEASE` / `PUBLIC_SENTRY_RELEASE` / source-map artifact name | the tag's commit (`sha-<7>` / `gha-<8>`) |
| Post-deploy `validate` job | checks out the tag's commit, so the release's own validator judges it |

Refusals, all before anything is built or touched: tag not matching `vX.Y.Z[-pre]`,
tag does not exist, tag's commit is not an ancestor of `main`, the commit's three
`sha-<7>` images are not all on GHCR, or `override_image_sha` is also set (the two
inputs are exclusive).

Not rolled back (a deploy never touches them): `lab-api-state` (keys, allowlist),
the on-box `static/data` overlay (the seed is additive, so files newer than the
release stay), and anything a migration changed outside the repo.

## Watch it

```bash
gh run list --workflow "Deploy to prod VPS (orrery)" --limit 3
gh run watch <run-id> --exit-status          # approve the prod environment gate if asked
```

The "Resolve release tag (rollback)" step prints
`<tag> -> <sha>; compare main...<sha>: identical|behind` and the notice
`ROLLBACK: deploying <tag> (<sha7>), not main HEAD`. If you do not see that
notice, the input was blank and you deployed main HEAD.

## Verify

1. The run's `validate` job is green (it runs `npm run validate-prod` against the
   public URL, using the tag's own validator).
2. The live site reports the release. `PUBLIC_SENTRY_RELEASE` is `gha-` plus the
   first 8 chars of the deployed commit:

   ```bash
   curl -s https://www.orrerylearn.com/_app/env.js | grep -o 'PUBLIC_SENTRY_RELEASE:"[^"]*"'
   git rev-parse --short=8 v0.9.7       # must match the part after gha-
   ```

   The footer version chip shows `package.json` version of the same commit.
3. On the box, `grep ORRERY_RELEASE /srv/orrery/.env` is `sha-<7>` of the tag's
   commit and `git -C /srv/orrery rev-parse --short HEAD` matches.
4. The separate `Validate prod` workflow also fires on deploy completion but runs
   **main's** validator (checks out main HEAD). On a rollback a red result there
   can be main-only assertions failing against the older release; the deploy's own
   `validate` job is the gate.

## Then fix forward

Fix the bug on `main` as usual (repro first), let CI and docker-e2e publish the
new `sha-<7>` images, and deploy normally (blank `release_tag`). Until then the
prod VPS checkout sits on the tag's commit, not on `origin/main`; the next normal
deploy puts it back.

## Static bundle and chunk caveat

The bundle is content-hashed chunks plus HTML that names them. A redeploy rsyncs
the whole `build/` with `--delete`, so HTML and chunks always come from the same
release; a rollback does not leave the server serving HTML that names a deleted chunk.
Clients that cached HTML or chunks from the bad release (browser cache, the PWA
service worker) are not verified here; check a hard reload after rolling back.
