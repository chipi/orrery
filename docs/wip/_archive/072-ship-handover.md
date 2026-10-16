# 0.7.2 ship + release handover (2026-07-05)

End-of-session state after fixing the i18n CI blocker, deploying 0.7.2, and
backfilling the v0.7.1 / v0.7.2 GitHub Releases.
Worktree: `~/.treehouse/orrery-311982/1/orrery`, branch `pwa-i18n-bundling-precache`
(pushes to `origin/main`; Orrery uses direct-to-main, no PRs).

## Status: everything shipped + green

- `origin/main` HEAD = `c8180380b`. Working tree clean.
- Full pipeline green on `c8180380b`: CI · CodeQL · docker-e2e · Deploy preview ·
  Deploy docs · Auto-publish GH Release — all success.
- **GH Pages**: live — https://chipi.github.io/orrery/
- **VPS prod**: deployed (run #28735992312, healthcheck passed) — live at
  https://prod-podcast.tail6d0ed4.ts.net:8443/ (tailnet-only).

## Releases (both live, green, via release.yml)

- **v0.7.2** — tag → commit `c8180380b`; marked **Latest**. Published by the
  standard tag-push path. https://github.com/chipi/orrery/releases/tag/v0.7.2
- **v0.7.1** — tag → commit `4b82dd113`. Published by `workflow_dispatch`
  (retroactive path). https://github.com/chipi/orrery/releases/tag/v0.7.1

### Release-process fixes made this session
1. **CHANGELOG.md** — `[Unreleased]` was actually 0.7.0's content (never renamed
   on release). Renamed it to `## [0.7.0]`, added curated `## [0.7.1]` +
   `## [0.7.2]` sections. `release.yml` extracts the release body from these.
2. **release.yml** — added a `workflow_dispatch` path (`tag` + optional `target`)
   that reads the section from the CHANGELOG on the default branch, so a
   retroactive tag on a historical commit publishes *through the workflow*.
   Re-publish any release with `gh workflow run release.yml -f tag=vX.Y.Z
   [-f target=<full-40char-sha>]`. (Captured in memory `feedback_release_workflow`.)

Gotchas learned: `--target` needs the full 40-char SHA (short SHA → HTTP 422);
backfilling an older release with `--latest` steals the Latest marker (reset with
`gh release edit <newest> --latest`).

## What the i18n fix was (context)

The 0.7.2 mobile layout hid the translated `site-footer` on touch (links moved
into the nav drawer). That footer was the only reliable visible locale-script
text on canvas routes (`/explore`,`/fleet`,`/fly`), so `i18n-all-routes.spec.ts`'s
innerText `>10` script-char check fell to 5-9 on mobile-chromium. Fix (`d7fa45337`):
count locale-script chars across visible text AND accessible names (aria-label /
title / placeholder / alt). Captured in memory `feedback_e2e_pitfalls`.

## Open follow-up (only one, non-blocking)

- **Mobile dev-test over Tailscale isn't wired for orrery.** This worktree's vite
  dev port is **5273** (default; no `VITE_DEV_PORT` in `.env.local`). The laptop's
  active `tailscale serve` (:443 →:8080) belongs to **podcast-scraper**, not
  orrery. To test orrery on phone: `npm run dev -- --host` (0.0.0.0:5273) then
  `tailscale serve --bg --https=8443 5273` →
  `https://markos-macbook-pro-1.tail6d0ed4.ts.net:8443/`.
  - UNVERIFIED: `vite.config.ts` sets no `server.allowedHosts`; vite 5.x may block
    the tailnet hostname. If the phone gets "host not allowed", add the FQDN to
    `server.allowedHosts`. Not tested.

## Optional (not done, out of scope)

- `v0.7.0` has one pre-existing failed `release.yml` run (2026-07-03, before the
  CHANGELOG had a `## [0.7.0]` section). Its release is fine. Now that the section
  exists, `gh workflow run release.yml -f tag=v0.7.0` would refresh its body + go
  green — but it'd replace the curated title/body. Left untouched.
