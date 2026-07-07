# Mobile app — build, run, deploy (contributor guide)

*PRD-015 / RFC-018 · ADR-078 (iOS-first + stream-heavy) · ADR-079 (assetUrl spine) · v0.8*

The operator-side companion to PRD-015 + RFC-018. How a contributor builds the
Capacitor iOS/Android app, runs it on a simulator/device, and ships it — plus
the sharp edges this codebase hit on the first on-device run so you don't
re-discover them.

> **The web app is the product.** Capacitor wraps the SvelteKit static `build/`
> in a WKWebView (iOS) / Chromium WebView (Android). There is no native UI. The
> `android/` and `ios/` directories are committed (Capacitor convention).

> **Validating your changes:** see **[Mobile testing strategy](/guides/mobile-testing)**.
> `npm run test:e2e:mobile` (device-free, in CI) asserts the streaming contract +
> size budget on the pruned bundle; the guide's Layer 3 checklist covers the
> on-device bits before a mobile release.

---

## 1 · Prerequisites

| Target | Toolchain | Notes |
|---|---|---|
| **iOS** | Xcode 26+, CocoaPods (`brew install cocoapods`) | Accept the Xcode licence: `sudo xcodebuild -license accept`. `pod` uses system Ruby — install via brew, not gem. |
| **Android** | JDK **21** (`brew install --cask temurin@21`), Android Studio + SDK 35, an **arm64** emulator image | Capacitor 8 requires JDK 21. `export JAVA_HOME="$(/usr/libexec/java_home -v 21)"`. Android Studio bundles its own JDK for the emulator. |
| **Both** | Node 20+, `npm install` | Capacitor 8.4.1. |

Verify: `xcodebuild -version && pod --version` (iOS) · `java -version && adb --version` (Android).

---

## 2 · The build → sync → run loop

```bash
npm run build:mobile   # MOBILE=1 build + prune (stream-heavy, ~160 MB on-device)
npx cap sync           # copy build/ into ios/ + android/, install pods/plugins
npx cap run ios --target "<simulator-udid>"       # build + deploy + launch (iOS)
npx cap run android --target "<emulator-name>"    # (Android)
# or open the native IDE:
npm run open:ios       # npx cap open ios
npm run open:android
```

- **`build:mobile`** = `MOBILE=1 npm run build && MOBILE=1 node scripts/mobile/prune-streamed-assets.mjs`. The `MOBILE=1` prefix must repeat before the prune (env doesn't cross `&&`). The prune strips `build/images` (1.6 GB), `build/audio` (97 MB), the 13 non-default locale bundles + raw i18n trees, and dead `.br/.gz` siblings — taking a ~2 GB naive build down to ~160 MB.
- **Simulator UDIDs:** `xcrun simctl list devices available | grep iPhone`. Boot one: `xcrun simctl boot <udid>`.
- **Screenshot (headless):** `xcrun simctl io <udid> screenshot /tmp/x.png` (iOS) · `adb exec-out screencap -p > /tmp/x.png` (Android).

---

## 3 · How streaming works (why the bundle is 160 MB, not 2 GB)

The naive build is ~2 GB — 10× the iOS 200 MB OTA cap. So (ADR-078 / ADR-079):

- **Bundled on-device:** code, planet textures, core mission/site/fleet JSON, the **en-US** locale bundle.
- **Streamed from `chipi.github.io/orrery`** (SW-cached on first view): all gallery/hero imagery, narration audio, the other 13 locale bundles.

The switch is `src/lib/asset-url.ts` — `assetOrigin` / `assetUrl()` / `streamedUrl()` / `localeBundleOrigin()` resolve to the CDN origin **only when `__MOBILE__` is true** (a Vite `define`, `MOBILE=1`). In every browser build `assetOrigin === base`, so URLs are byte-identical. When adding a new consumer of `/images/…` or `/audio/…`, **route it through `assetUrl`/`streamedUrl`** or it 404s on mobile (the panorama `swapTexture` bug was exactly this).

**Trade-off (PRD-015 M5):** core experience works offline from install; galleries + audio need one online view to cache.

---

## 4 · Sharp edges (learned the hard way, 2026-07-07)

- **`env(safe-area-inset-*)` returns 0 in Capacitor iOS.** The nav/footer render under the status bar / Dynamic Island. Fixed by a native shim — `SafeAreaViewController` (`ios/App/App/AppDelegate.swift`, wired via `Main.storyboard`) injects the real `view.safeAreaInsets` as CSS vars; CSS reads `var(--safe-area-inset-top, env(...))`. Don't trust `env()` here; **instrument** the computed value on-screen when debugging.
- **`ios.scrollEnabled` config isn't reliably applied.** The shim also forces `webView.scrollView.isScrollEnabled = true`. Config alone left touch-scroll dead (programmatic scroll worked — the tell).
- **`capacitor-assets generate` errors on the PWA step** (looks for `www/manifest.json`). Use `--ios` / `--android` flags to scope it; it still generates the native icons/splash. Source art: `assets/icon.png` (1024) + `assets/splash.png` (2732) rendered from `static/favicon.svg` via `sharp`. It also drops a stray `icons/` at repo root — delete it.
- **Splash flashes by unseen** without `@capacitor/splash-screen`. Installed + `launchShowDuration: 1800`.
- **macOS lockfile trap:** an incremental `npm i <pkg>` on macOS can strip Linux-only optionals (`@rollup/rollup-linux-*`) from `package-lock.json` → CI `npm ci` fails on Linux. After adding a dep, `git diff package-lock.json | grep '^-.*linux'` and grep-confirm `@rollup/rollup-linux-x64-gnu` survives (a full `rm lock && npm install` regen usually restores them; verify).
- **tech-bom license gate:** `@capacitor/assets` pulls `@trapezedev/*` (MIT, but `package.json` says non-SPDX "SEE LICENSE"). Add to `PACKAGE_LICENSE_OVERRIDES` in `scripts/build-tech-bom.ts`, then `npm run build-tech-bom`.
- **Locale flags** were dropped — flag emoji tofu ("?") on the iOS Simulator (and Windows). The `EN/ES/FR` shortTag stays.

---

## 5 · Ship — iOS TestFlight (S13)

CI does **not** build the native binaries (no Xcode/Android SDK in the runners); mobile builds are local. Version lives in `package.json` (0.8.0-wip → PWA/footer), iOS `MARKETING_VERSION` (numeric, Apple requires it), Android `versionName`.

1. `npm run sync:mobile` (build:mobile + cap sync).
2. `npm run open:ios` → in Xcode, select the **App** target → Signing & Capabilities → set your Apple Developer **Team** (auto-manage signing). This step needs your Apple ID; it can't be scripted here.
3. Product → Archive → Distribute App → App Store Connect → upload.
4. In App Store Connect, create the app record (bundle id `io.github.chipi.orrery`); it appears in **TestFlight** for internal testers.

**Android (later):** `npm run open:android` → Build → Generate Signed App Bundle → upload the `.aab` to Play Console (Internal Testing track). Needs JDK 21.

---

## 6 · Deep links + share

- **Deep links:** `orrery://fly?mission=curiosity` → `/fly?mission=curiosity`. Scheme registered in `ios/App/App/Info.plist` (`CFBundleURLTypes`) + `AndroidManifest.xml` (intent-filter); handled in `src/lib/native/deep-links.ts`.
- **Share:** the nav share button (`src/lib/share.ts`) → native share sheet on Capacitor, `navigator.share` on web, copy-link fallback. It shares a **public** `chipi.github.io/orrery/<route>` URL (not the internal `capacitor://localhost` one).

---

## 7 · Architecture map

See **[TA.md §Mobile subsystem](../adr/TA.md)** for the full component map, and:
- **ADR-078** — iOS-first + stream-heavy bundle
- **ADR-079** — `assetUrl()` origin spine + source/derived separation
- **RFC-018** — the Capacitor integration (read the v0.5 correction notes)
- **#195** — WebGL context-loss (shipped reload; per-scene reinit deferred)

---

*Orrery · docs/guides/mobile-build-and-deploy.md · July 2026*
