# Asset caching + response-header contract (edge/origin)

Closes **#387**. One source of truth for how Orrery's assets are cached and which
response headers each tier carries, now that prod is served from the VPS
(Caddy edge → nginx origin, ADR-114) instead of GitHub Pages' free defaults.

**Topology.** `www.orrerylearn.com` → Caddy (`ops/caddy/orrery.caddy`, TLS +
`import hardened`) → `reverse_proxy 127.0.0.1:8090` → nginx
(`ops/docker/nginx.conf`, the origin that owns `Cache-Control`). Cloudflare-free
is an optional future layer in front of Caddy; the tiers below are written so a
CDN can honour them without extra config.

## Tiers

| Tier | Paths | `Cache-Control` | Revalidation | Why |
|---|---|---|---|---|
| **1 · fingerprinted** | `/_app/immutable/*` | `public, max-age=31536000, immutable` | none (URL changes on content change) | the content hash is in the filename → a changed file is a new URL |
| **2 · stable-path content** | `/images/*`, `/audio/*` | `public, max-age=3600, stale-while-revalidate=86400` | **ETag** (nginx default) → 304 on unchanged | the URL is deliberately stable (ladder/provenance/srcset key on `/images/<stem>`); a swapped file keeps its URL, so it can't be immutable |
| **3 · live data** | `/data/*` (launch JSON, TLEs, i18n bundles, image-ladder) | `no-cache` | always revalidate | pipelines rewrite these in place (RFC-035); nginx must not lie about freshness or the PWA `NetworkFirst` SW can't catch refreshes |
| **4 · never-cache** | `/sw.js`, `/manifest.webmanifest` | `no-cache` | always | browsers must pick up new SW / manifest immediately |
| **5 · HTML shell** | `/` and route `*.html` (SPA fallback) | nginx default (ETag) | ETag | small, cheap to revalidate; carries the security-header set |

## Cross-origin (CORS)

- **`/data/*` sends `Access-Control-Allow-Origin: *`** — the Capacitor app
  (`capacitor://localhost`) `fetch()`es the ladder manifest (`/data/image-ladder.json`)
  and non-default locale bundles (`/data/i18n/<locale>.json`) **cross-origin**;
  without ACAO the ladder silently falls back to base-size images and non-en
  locales fail to stream. GitHub Pages sent `*`; the VPS must too.
- **`/images/*` does NOT need CORS** — served via `<img srcset>`, which is not a
  CORS-gated fetch. Kept header-free to avoid implying otherwise.

## Cache invalidation on image churn

Image paths are not content-hashed, so a swapped `01.webp` keeps its URL and a
long-TTL CDN would serve stale. Tier 2's short `max-age` + `stale-while-revalidate`
+ ETag already bounds staleness to ~1 h with instant serve. If Cloudflare is
added and long edge TTLs are wanted, prefer **purge-by-URL on deploy**
(`git diff` → the exact changed image paths → Cloudflare purge API) over a
query-string `?v=<hash>` bust (which kills cache efficiency for every image each
deploy). Purge-by-URL keeps long TTLs + exact correctness; unchanged images keep
their cache.

## Where this is implemented

- Tiers 1–4: `ops/docker/nginx.conf` (per-`location` `add_header Cache-Control`).
- Edge TLS + routing: `ops/caddy/orrery.caddy`.
- Security headers (CSP, etc.): server-level in `nginx.conf`, inherited by the
  HTML shell.

Change a tier here **and** in `nginx.conf` together — this doc is the contract,
`nginx.conf` is the enforcement.
