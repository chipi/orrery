# Mobile testing strategy (contributor guide)

*PRD-015 / RFC-018 · ADR-078 (stream-heavy) · ADR-079 (assetUrl spine + size budget) · v0.8*

Companion to **[Mobile build & deploy](/guides/mobile-build-and-deploy)**. That
guide is how you *build and ship* the app; this one is how you *validate* it —
and, crucially, how much you can validate **without a device**.

> **The insight that shapes everything below.** Most of what "mobile" means in
> Orrery is *web* logic — the `assetUrl` streaming spine, deep-link routing,
> share-URL rebuilding, the prune. That's why it's unit- and e2e-testable off a
> device. The genuinely *native* surface is small: the safe-area shim, plugin
> invocation, and WebGL context-loss. The strategy is to push validation **down**
> to device-free layers and reserve real hardware for the irreducible native
> bits — shrinking "manual pass" to what truly needs a phone.

---

## The pyramid

| Layer | What it covers | Device? | CI? | Status |
|-------|----------------|---------|-----|--------|
| **0 · Unit** | Pure resolvers: `assetUrl`/`streamedUrl`/`localeBundleOrigin`, `deepLinkTarget`, `publicShareUrl`, the prune (fixture) | no | ✅ | shipped |
| **1 · MOBILE=1 e2e** | The `__MOBILE__` streaming *contract* baked into the pruned bundle: CDN-routed assets, on-device prune, en-US-only SW precache, 4K textures gated, **size budget** | no | ✅ | shipped |
| **2 · Appium smoke** | The real Capacitor app on a simulator/emulator: launch, safe-area, WebGL renders, deep link, share sheet | yes | possible | roadmap |
| **3 · Manual checklist** | The irreducible hardware bits: real-notch safe-area, share UX, backgrounding→context-loss, haptics, fps | yes | no | checklist below |

---

## Layer 1 — the MOBILE=1 e2e suite (device-free)

```bash
npm run test:e2e:mobile            # build:mobile, then run the suite
npm run test:e2e:mobile:preview    # skip the build — iterate against an existing build/
```

**What it asserts** (`tests/e2e/mobile/streaming.spec.ts`):

- the landing hero `<img>` is served **absolute-to-CDN** (`chipi.github.io/orrery/images/…`), not the local bundle;
- every `/images/` + `/audio/` request goes to the **CDN origin**, never the on-device origin;
- streamed + pruned buckets **404 locally** (`de.json`, `4k_moon.jpg`, hero image) while the on-device set is served (`en-US.json`, `2k_moon.jpg`, the downscaled base-4K `4k_io.jpg`);
- the service-worker precache manifest is **en-US only**;
- non-en locale HTML is **pruned**, and the precached `404.html` shell (adapter fallback + SW `navigateFallback`) carries the app bundle so those routes render client-side.

**Two things make it correct and non-flaky:**

1. **It serves the pruned `build/`, not `vite preview`.** For a SvelteKit app
   `vite preview` serves the internal `.svelte-kit/output/` tree, which the
   prune never touches — it would serve the very files we removed. The suite
   uses `scripts/mobile/serve-build.mjs` (a `sirv` static server over `build/`),
   the exact tree Capacitor ships. Missing files 404 — that's the point.
2. **The CDN origin is stubbed**, so a GitHub Pages outage never turns it red.

Config: `playwright.mobile.config.ts` (separate from the browser
`playwright.config.ts` — the two serve different `build/` artefacts). Override
`PLAYWRIGHT_BASE_URL` to point at a device-served bundle instead of the local
static server.

### The size budget (regression gate)

`build:mobile` ends with `scripts/mobile/check-mobile-size-budget.mjs`: if the
pruned `build/` exceeds **75 MB** the build fails and prints the largest
buckets. This is what stops a leak — a re-added locale HTML tree, the
images/audio buckets, or the 4K textures slipping past their gate — from
silently re-bloating the OTA download. The pruned bundle is ~73 MB today; the
budget sits well under the iOS 200 MB cellular-OTA cap the prune exists to clear.

### CI

`.github/workflows/mobile-e2e.yml` runs Layer 1 after CI passes on `main`
(mirrors `docker-e2e.yml`'s gate). It's device-free and fast (~3–4 min), so it
gates every green main push. No nightly cron — the CDN is stubbed, so there's no
external state to drift.

---

## Layer 2 — Appium smoke (roadmap, real simulator/emulator)

When heading to TestFlight / Play, add a **small** WebdriverIO + Appium smoke
suite driving the actual Capacitor app (Appium switches into the WebView context
to drive the DOM like Selenium):

- app launches → nav sits below the status bar (safe-area screenshot);
- `/explore` WebGL canvas renders non-blank;
- tap a gallery → a streamed image loads;
- deep link `orrery://fly?mission=curiosity` opens the route;
- the share sheet appears.

Keep it a *smoke* suite — Appium is slow and flake-prone. CI: Android emulator
runs on Linux runners; iOS needs macOS runners or a cloud device farm
(BrowserStack / Sauce App Automate / AWS Device Farm). Not built yet — this
section is the design intent.

### Appium-free simulator spot-check (works today, fully local)

For a one-off "does X actually work in the native app" check, no Appium is
needed — `simctl openurl` + the `orrery://` deep-link scheme drive the app,
and the whole stream path runs against local servers (no push, no deploy):

```bash
# 1. Stream origin: full asset tree with the CORS header the WebView needs
CORS=1 DIR=static PORT=4174 node scripts/mobile/serve-build.mjs &
# 2. Pruned bundle pointed at it (ATS exempts loopback, so http:// is fine)
STREAM_ORIGIN=http://127.0.0.1:4174 npm run build:mobile && npx cap sync ios
# 3. Build + install + launch on a simulator
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath /tmp/orrery-sim-dd build
xcrun simctl boot "iPhone 17 Pro"
xcrun simctl install "iPhone 17 Pro" /tmp/orrery-sim-dd/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch "iPhone 17 Pro" io.github.chipi.orrery
# 4. Drive via deep link, verify via screenshot
xcrun simctl openurl "iPhone 17 Pro" "orrery://earth?site=baikonur-31-6&from=descent"
xcrun simctl io "iPhone 17 Pro" screenshot /tmp/sim-check.png
```

Because the pruned bundle contains no `/images`, anything image-like in the
screenshot *proves* the stream path worked. First used 2026-09-10 to verify
the #546 launch-pad tier-3 panoramas on-device pre-push.

---

## Layer 3 — manual checklist (the irreducible hardware bits)

Run on a real device before tagging a mobile release. These genuinely can't be
automated device-free:

- [ ] **Safe-area** — nav + content clear the notch/Dynamic Island and the home indicator, portrait **and** landscape, on at least one notched device.
- [ ] **Scroll** — touch scrolling works on long routes (the `SafeAreaViewController` shim force-enables it).
- [ ] **Share** — the native share sheet opens and shares a **public** `chipi.github.io` URL (never `capacitor://localhost`).
- [ ] **Deep link** — `orrery://fly?mission=curiosity` (and a `//`-in-query variant) opens the right route from cold and warm start.
- [ ] **Locale** — set the device to German: UI + overlays render German (streamed `de.json`), and no `/de/*` route 404s.
- [ ] **Offline** — airplane mode after first load: en-US routes + 2K textures still render; streamed imagery degrades gracefully.
- [ ] **WebGL context-loss** — background the app during a 3D route, return after a while: the scene recovers (reload MVP).
- [ ] **Perf** — `/fly` and `/explore` hold a smooth frame rate; textures are 2K (4K is gated off on mobile).
- [ ] **Splash + icons** — launch splash is crisp; the home-screen icon is correct.

---

## What still needs a device (honest limits)

Even with all of the above, a few things only validate on real hardware:
WKWebView context-loss *timing*, true safe-area per notch, the store share-sheet
behaviour, and sustained performance. That residue is why per-scene WebGL reinit
(#195) is deferred to device verification. The goal isn't zero manual — it's
shrinking manual to what a phone alone can answer.

---

*Orrery · mobile testing · v0.8 — Layer 1 shipped; Layers 2–3 are roadmap + checklist.*
