# F · T4 ask-box client (#535) — Fable-5 design pre-review + build record

*2026-09-07 · consumes: D (/ask server, docs/wip/2026-09-02-d-*) + E (auth
door, docs/wip/2026-09-06-e-*) · the LLM path went LIVE during this slice
(operator decisions 2026-09-06/07, below)*

## Operator decisions during the slice

- Ask surface = a **third view tab** (Notebook · Canvas · Ask) + a visible
  **sign-out** link — both explicitly confirmed ("yes both").
- **LLM routing**: app → LiteLLM only; provider keys live INSIDE the
  gateways. Model = **DeepSeek v4 Flash** via the project alias `orrery-ask`
  (NOT Haiku). Same dedicated OpenRouter key on BOTH gateways; prod gateway
  is the prod path, homelab is the dev path.
- Weekly budget **$5 / 7d** per gateway on LiteLLM virtual keys
  (`proj-orrery-lab` on prod — minted + smoke-tested; `proj-orrery-lab-dev`
  on homelab, key in ~/secrets/orrery-litellm-dev-key.txt).
- Live evidence: prod `/ask` end-to-end through the prod gateway (SSH tunnel
  + real lab-api): Hohmann question → `interplanetary-transfer` toolCall →
  kernel values → Flash narration; `ORRERY-PROD-ALIAS-OK` on the deployed
  `orrery-ask` alias via the virtual key; spend accounting visible on
  /key/info. Gateway deploy operator-approved; podcast tenants smoke 2/2.

## Pre-review conformance (binding order → shipped)

1. **Auth core** `src/lib/lab/ask/auth.ts` + `config.ts` — PKCE S256 public
   client (verifier parked per-state in sessionStorage), RFC 8707 `resource`
   sent, RFC 9207 `iss` REQUIRED on the callback, access token in memory,
   RT in localStorage, silent single-flight refresh, refresh-then-retry-once
   on 401, and the **multi-tab rotation-race protocol**: navigator.locks
   when available + adopt-and-retry-once on invalid_grant with a differing
   stored RT; identical RT = genuine revocation → signed-out.
2. **Callback route** `src/routes/lab/callback/+page.svelte` — prerendered,
   explicit `entries` addition (NOT site-routes: redirect URIs are exact
   locale-agnostic strings), distinct not-allowlisted message, bounces to
   /lab only.
3. **Token lifecycle** — above, plus logout-epoch guard (an in-flight
   exchange can't resurrect cleared tokens) and cross-tab logout listener.
4. **Ask view** — `ask-state.svelte.ts` (instance-per-page rune module; the
   transcript survives tab switches), `Ask.svelte` (explicit states:
   signed-out/signing-in/denied/loading/429+retry-after/502 "narrator down,
   Lab still works"/503/offline/generic; single-turn note; honesty caption
   naming the model as first-class UI; submit on click/Enter only),
   `AskToolResult.svelte` (read-only kernel cards: localized title,
   registry-labelled values, FigureSpec through FigureRenderer, kernel
   badge).
5. **PWA** — NetworkOnly for the lab-api origin as the FIRST runtimeCaching
   rule, closure-free (generateSW stringifies it — verified in built
   sw.js), plus the POST twin so the rule guards what it says.
6. **i18n** — 27 `lab_ask_*`/`lab_ui_view_ask` keys ×14; the parity gate's
   chrome list extended; the server's budget-exhausted answer localized
   (full-arc MINOR-2).
7. **Tests** — auth unit suite (12: PKCE math vs the AS's s256, rotation
   race both branches, lock serialization, network≠revocation, askFetch
   retry-once); **cross-slice contract suite** (real `buildLabApi` on the
   client's baked dev base + stub Google + stub LiteLLM → full login,
   /ask with REAL kernel compute, RT rotation, de-allowlist death, denied
   login); e2e `lab-ask.spec.ts` (stub-routed at the network layer:
   signed-out gate + zero ambient traffic, full PKCE round-trip through the
   REAL callback route, 502 state with the Lab still usable, SW cache
   audit). Server fold-ins: malformed-LLM-JSON → 502 (m-3), budget answer
   localized.
8. **Mobile** — 16px input (no iOS zoom), 44px targets, safe-area padding,
   third tab in normal flow.

## Fable-5 holistic (post-build) — findings + resolutions

- **MAJOR-1** server/lab-api/ask.test.ts was RED in-tree (stale assertion vs
  the newly-localized budget answer) — the slice's own "green" claim had not
  re-run that dir. FIXED + full `src/lib/lab` + `server/lab-api` re-run:
  124/124.
- **MAJOR-2** the documented dev login path couldn't work (`lab-api:dev`
  defaulted to the prod issuer → `invalid_target` for the dev client).
  FIXED: `LAB_ISSUER=http://localhost:8093` baked into the npm script.
- **MINOR-1** rejected-call cards showed a raw titleKey → `t()` fallback.
  **MINOR-2** auth header claimed a live rotation listener that isn't how
  adoption works → comment now tells the truth (+ the no-lock fallback
  window documented, m-1). **MINOR-4** the SW rule was GET-only while its
  comment claimed /token + /ask protection → POST twin added. **MINOR-5**
  iss now REQUIRED (RFC 9207) and resource=issuer=base collapsed to one
  constant. Nits: logout epoch (m-2), contract-test env restore (m-3),
  denied-callback verifier cleanup (m-4), question restored on error (m-5),
  2000-char client cap (m-6).
- **MINOR-3 — ACCEPTED RISK (recorded)**: on GH Pages the RT lives in
  localStorage under `chipi.github.io`, an origin shared by every other repo
  Pages site under the account — any script there could read+redeem it. The
  access token stays ≤1h and memory-only; the allowlist is ~6 accounts; the
  revocation lever (allowlist edit) kills refresh within the hour. Accepted
  for the beta; revisit if the Pages surface or the allowlist grows.
- m-7 (tablist arrow-key roving/aria-controls) — pre-existing 2-tab pattern
  F extends; folded to H's a11y sweep.

## Acceptance evidence (2026-09-07)

- vitest `src/lib/lab` + `server/lab-api`: **124/124** (post-fix, incl. the
  suite the holistic caught red).
- e2e (targeted, both projects, post-build): desktop **12 passed**, mobile
  **10 passed**, 0 failures — incl. the real-callback PKCE round-trip and
  the SW cache audit. Full-suite runs recorded separately below.
- Live prod LLM path: see operator-decisions section (smoke evidence).

## NOT covered / NOT verified (F exit honesty)

- **Real Google sign-in from the deployed SPA** — deploy-day (E+F
  acceptance share it); the stub IdP + stub route layers stand in.
- **Deployed lab-api + Caddy CORS/WWW-Authenticate passthrough**,
  GH-Pages/VPS extensionless serving of `lab/callback.html` — deploy-day
  checklist items on #534.
- Real `navigator.locks` behavior across browsers (Safari fallback path is
  the documented m-1 window).
- Translation QUALITY ×13 (machine-only policy; key-parity enforced).
- SSE streaming, conversation memory, transcript persistence, rate-limit
  countdown UI — scope traps, deliberately out (pre-review).
