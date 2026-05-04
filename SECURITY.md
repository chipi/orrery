# Security policy

## Reporting a vulnerability

Orrery is a fully static site with no server, no user accounts, no database, no `localStorage`, no third-party fonts/scripts at runtime, and no analytics. The realistic vulnerability surface is:

- A dependency (npm package) shipping malicious or vulnerable code.
- A bug that could leak the URL parameters (`?lang=`, `?mission=`, `?dest=`) somewhere unexpected — though those are intentionally non-sensitive.
- A bundled-in image that infringes a copyright or carries a payload.

If you find something:

1. **Do not file a public issue** for vulnerabilities you believe are exploitable.
2. Email the maintainer (see commit log for `marko.dragoljevic@gmail.com`) with `[SECURITY]` in the subject.
3. Include: the repo + commit hash, a reproduction or proof of concept, the impact you believe it has, and your suggested fix if you have one.

For non-exploitable concerns (e.g. a stale dependency that has a published CVE but isn't actually reachable in the bundle), a regular GitHub issue is fine.

## What to expect

Solo project, hobby cadence. I aim to:

- Acknowledge receipt within a week.
- Triage within two weeks.
- Patch within a month for anything plausibly exploitable.

I cannot guarantee a bounty.

## Scope

In scope:

- Bundled JavaScript / WASM
- The static SPA on `chipi.github.io/orrery/` (and any future production hosting)
- `scripts/fetch-assets.ts` (build-time only — but image-fetch URLs are public input)
- Mission-data JSON files (could in theory carry XSS via `description` if rendered as HTML — they're not, but the schema is the trust boundary)

Out of scope:

- Third-party dependencies (file with the upstream maintainer instead).
- The GitHub Pages CDN itself.
- The NASA Images API / Wikimedia Commons / Solar System Scope (upstream sources).

## Public-disclosure policy

I'd like 30 days from receipt to coordinate a fix before public disclosure. Severe issues that are already being exploited in the wild override this — disclose immediately if needed.
