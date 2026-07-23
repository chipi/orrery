# Mobile crash observability — Capacitor → GlitchTip + store consoles (#428)

Unifies crash/error signal from the Capacitor iOS/Android/TV shells so GlitchTip
is the single correlation view (web + mobile JS + native events), with the store
consoles as the symbolicated native detail. Three layers.

## Layer 1 — Web JS inside the webview → GlitchTip
Done in code:
- `src/lib/observability/sentry.ts` tags every event with `platform`
  (`web|ios|android`) and reports the shells under a `mobile-<platform>`
  environment, so a shell-only JS regression is separable from web.

**Operator action — bake the DSN into the mobile build.** The app builds locally
(Xcode / Android Studio), and only the *web CI* sets `PUBLIC_SENTRY_DSN`. So
before building the app, export it:
```sh
export PUBLIC_SENTRY_DSN='https://<key>@telemetry.orrerylearn.com/4'
export PUBLIC_SENTRY_ENVIRONMENT=prod   # (web only; native overrides to mobile-<platform>)
npm run sync:mobile                      # build:mobile + cap sync
```
Without the export the in-app web-JS path is silent (empty DSN → fork-silent).

## Layer 2 — Native shell crashes → GlitchTip (`@sentry/capacitor`)
Done in code:
- Added `@sentry/capacitor@^4`; **pinned the whole `@sentry/*` stack to
  `10.60.0`** — the exact version capacitor@4's `check-siblings` requires (a
  minor downgrade from 10.65; the web SDK is unaffected in our usage).
- `sentry.ts` inits `@sentry/capacitor` on native (native crash handlers +
  the `@sentry/svelte` JS sibling); web stays on `@sentry/sveltekit`. Isolated:
  if the native path ever misbehaves it can't touch the working web path.

**Operator action — sync + rebuild + device-test (I can't run a device from CI):**
```sh
npm run sync:mobile     # cap sync auto-links the SentryCapacitor pod (iOS) + gradle dep (Android)
npm run open:ios        # Xcode → run on a device/simulator
npm run open:android    # Android Studio → run on a device/emulator
```
Then **force a native crash** to verify it reaches GlitchTip project 4, e.g. a
temporary native throw or `Sentry.nativeCrash()` from the JS console, and confirm
an event appears tagged `platform:ios|android`, `environment:mobile-<platform>`.

**Known limits:**
- GlitchTip 6.2.2 does **not** symbolicate native frames → native events arrive
  but as addresses, not function names. That's expected; use Layer 3 for detail.
- JS-triggered init means a crash *before* the webview loads may be missed by
  this layer — Layer 3 catches those.

## Layer 3 — Store-native crash reporting (symbolicated native detail)
Free, fully symbolicated, authoritative for native. Enable in the consoles:
- **iOS — App Store Connect → Xcode Organizer → Crashes.** Automatic for
  TestFlight/App Store builds; ensure **"Upload debug symbols (dSYM)"** is on in
  the Xcode archive/upload so frames symbolicate.
- **Android — Play Console → Android vitals → Crashes & ANRs.** Automatic for
  Play-distributed AABs; ensure the **R8/ProGuard mapping file** is uploaded
  (Gradle uploads it with the AAB when `android.buildTypes.release` keeps
  mapping; Play also lets you upload it manually per version).

## Net
- **GlitchTip:** web JS + mobile JS + native *events* — one place to correlate.
- **Store consoles:** the *readable* native stack traces.
- Split/filter in GlitchTip by `platform` / `environment:mobile-*`.

Tracking: [#428](https://github.com/chipi/orrery/issues/428).
