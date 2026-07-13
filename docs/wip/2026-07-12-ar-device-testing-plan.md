# AR device-testing plan — #150 Immersive Mode (for the home session)

*Written 2026-07-12 after merging `three-upgrade` → `main` (`9d455af4f5`). Everything
here is the stuff CI/jsdom **cannot** validate — the real XR session, on-surface
placement, spatial-audio pan, and the ARKit Swift path that never compiled on this
laptop.*

Two devices, two independent AR paths:

| Device | Path | Blocker to first run |
|---|---|---|
| **Moto Nav rugged (Android, 7")** | WebXR (`src/lib/ar/webxr.ts`) | (a) is it ARCore-certified? (b) needs an **HTTPS** origin |
| **iPhone** (Apple dev acct, no Xcode yet) | ARKit Swift plugin (`ios/.../ar-bridge/`, #206) | needs **Xcode** on the Mac to build the plugin into the app |

Start with **Path A (Android)** — it's the fast one. Path B needs an Xcode install first.

---

## Pre-flight (do these before touching a globe route)

### A0 · Is the Moto Nav ARCore-certified?
Rugged tablets often are **not**. If it isn't, `isArSessionSupported()` returns false →
the "View in AR" button is **hidden by design** and the flat scene is the (correct)
fallback. That's not a bug — it's the graceful-degrade path (mirrors WebGL).
- Check: install **"Google Play Services for AR"** from the Play Store, then open a
  known WebXR AR demo (e.g. `immersive-web.github.io/webxr-samples/immersive-ar-session.html`).
  If that sample can't start an AR session, our button will (correctly) never appear.
- If unsupported: Android AR is **untestable on this device** → all real-AR verification
  falls to the iPhone (Path B). Note it and move on; don't chase a hidden button.

### A1 · WebXR needs a secure context (HTTPS) — the #1 gotcha
`navigator.xr` is **only exposed over HTTPS or localhost**. Pointing the phone at the
laptop dev server as `http://<lan-ip>:5173` will make AR silently unavailable even on a
supported device. Options, best first:
1. **Test the deployed site** once the main→prod deploy is live (HTTPS). Simplest.
2. **Tailscale serve / `cap`-less HTTPS tunnel** to the dev server (you already run
   Tailscale). `tailscale serve https / http://localhost:5173` → open the `*.ts.net`
   URL on the phone.
3. `vite --https` with a local cert (phone must trust it — fiddlier).

---

## Path A — Android WebXR (Moto Nav)

**Test in Chrome-on-Android over HTTPS, not the wrapped APK.** WebXR `immersive-ar`
is generally not exposed by the Android System WebView Capacitor wraps, so the
realistic path is the deployed HTTPS site (or a `tailscale serve https` tunnel to
the dev server) opened in **Chrome** with *Google Play Services for AR* installed.

**Android scope (what should appear):** the **4 globe routes** (`/explore` ·
`/earth` · `/moon` · `/mars`) + the **2 stations** (`/iss` · `/tiangong`, now with
the #408 assembly replay on placement). The **`SKY` button will NOT appear on
Android by design** (`skyAvailability()` — sky-pointing needs ARKit's true-north
alignment, which WebXR lacks). Don't chase its absence; it's iPhone-only. Grant
the **location** prompt when a real-now/Earth route asks (manifest now carries
`ACCESS_COARSE_LOCATION`).

Open each globe route and tap **"View in AR"**:
`/explore` · `/earth` · `/moon` · `/mars`

For each, verify the on-device chain (this is the wiring hardened this session):

1. **Session starts** — camera passthrough appears, flat scene is replaced.
2. **Tap-to-place** — tap a real surface (floor/table). The scene should drop onto the
   *tapped point*, not screen-centre (this is the new transient-input hit-test). Move
   around it — it should stay anchored to the spot (real `frame.createAnchor`).
3. **Placement haptic** — a short buzz the instant it places (`arHaptic('anchor-placed')`).
4. **Spatial audio** — quiet per-body tones that **pan** as you physically walk around
   the scene (each body has its own HRTF voice at its world position). With headphones
   the panning should be crisp (HRTF); on the speaker it auto-switches to equal-power.
5. **Narration** — ~2 s after placement the **Guide** episode auto-plays, and the body
   tones **duck** under it (via the audio-bus). A short success buzz when narration ends.
6. **Walk-around orientation** — surfaces should be lit/oriented correctly. *(We fixed a
   flipped-sign bug in the hit-normal math this session — confirm nothing looks
   inside-out or mis-shaded at the placement point.)*

### Things to watch hard (device-only unknowns)
- **Audio won't start without a user gesture** — the tap that places *should* be the
  gesture that unlocks the AudioContext. If tones/narration are silent, note whether a
  second tap fixes it (autoplay-policy edge).
- **Enter → exit → re-enter AR several times** — watch for audio getting louder each
  time or the app hitching (oscillator/GPU leak). The `stop()` re-entrancy guard added
  this session should prevent double-teardown; verify.
- **Frame rate** — target is ~72 fps / smooth. Simplified scene (100 stars, no trails).
- **Anchor drift** — does the scene hold its spot over ~30 s, or slide?

---

## Path B — iPhone ARKit (needs Xcode first)

This path has **never been compiled** (no Xcode here). One-time setup on the Mac:

1. **Install Xcode** (App Store) + open it once to accept the license / install
   components.
2. Sign into your **Apple Developer account** in Xcode → Settings → Accounts.
3. From the repo:
   ```
   npm run build:mobile        # or: npm run build && npx cap sync ios
   npx cap open ios            # opens ios/App/App.xcworkspace in Xcode
   ```
4. **Add the AR-bridge plugin to the App target** — the Swift files under
   `ios/App/App/Plugins/ar-bridge/` (#206) must be members of the App target
   (Xcode → select files → File Inspector → Target Membership → App). They're committed
   but may not be wired into the `.pbxproj` target yet.
5. Set the **signing team** (App target → Signing & Capabilities → your team) and a
   bundle id; plug in the iPhone, trust the Mac, select it as the run destination.
6. **Build & run to the device.** Grant the **camera permission** when prompted
   (`NSCameraUsageDescription` is already in Info.plist, #214).

Then run the **same 6-step verification** as Path A on `/explore` `/earth` `/moon`
`/mars`. On iPhone the backend is `arkit-capacitor` (the app applies the ARKit pose to
our camera; the same scene/audio/haptic wiring rides on top).

### iPhone-specific watch items
- **iOS haptics** go through `@capacitor/haptics` (Taptic) — should feel crisper than
  Android's `navigator.vibrate`.
- **Safari (not the wrapped app)** on iPhone will show the **greyed "App Store" button**
  (`ios-fallback`) — that's correct; real AR only exists in the wrapped app. *(The
  App-Store URL is still a `#217` placeholder — a dead link until the app is published.
  Don't treat the 404 as a bug.)*

---

## What to write down (so the report is actionable)

Per device + route, note: did the button appear? did placement land on the tapped
point? haptic? audio (and did it pan / duck)? narration autoplay? any leak on
re-entry? fps feel? Screenshots/screen-recordings where possible. A "works" / "broke at
step N" per route is enough to turn into fixes.

---

## Epic slices gated on this session's results

- **#216** · cross-platform parity test (you + 2 reviewers, Android + iPhone) — this
  device pass *is* the input to it.
- **#217** · TestFlight roll-out (needs a real App Store id → also unblocks the
  `APP_STORE_URL` placeholder).
- **#218** · v0.8 release gate (full Playwright e2e on **both** desktop-chromium **and**
  mobile-chromium locally, then tag — see AGENTS.md "Before tagging").
- **#195** · per-scene WebGL `reinit()` — *deferred pending exactly this device pass*:
  only build it if you observe the route-reload recovery (`webgl-recovery.ts`) is
  actually insufficient on the real WKWebView. Don't build blind.

## Where the code lives (quick map)
- Backend seam + gate: `src/lib/ar.ts` (`getArBackend`, `isArSessionSupported`)
- WebXR: `src/lib/ar/webxr.ts` · ARKit JS: `src/lib/ar/arkit-capacitor.ts` · Swift:
  `ios/App/App/Plugins/ar-bridge/`
- Scene + sensory wiring: `src/lib/ar/ar-scene.ts` · launch/teardown:
  `src/lib/ar/launch-ar.ts` · audio: `ar-audio.ts` · haptics: `ar-haptics.ts` ·
  narration: `ar-narrator.ts`
- Button: `src/lib/components/EnterArButton.svelte`
- Full architecture: **TA.md §immersive** · spec: **RFC-021** / **PRD-019**

---

## SESSION 1 log (2026-07-12, iPhone 15 Pro tethered) — where we stopped

**Done + working:**
- `build:mobile` (49.4 MB) → `cap sync ios` → app **builds + installs + launches on the
  iPhone 15 Pro** (Developer Mode on). Flat scenes render fine.
- **#206 wired**: added the 6 `ar-bridge` files to the App target (2nd time, WITHOUT
  "Copy items" — the 1st add duplicated them to `ios/App/` and compiled the buggy copies;
  now one clean set under `App/Plugins/ar-bridge/`). Xcode created `App-Bridging-Header.h`.
- **Fixed 1 real Swift bug** (`ArHitTester.swift:28`): `frame.raycastQuery(...)` is
  non-optional in current ARKit → dropped the `guard let`. Verified `xcodebuild … BUILD
  SUCCEEDED` (simulator).
- Signing set to Marko's team; app category Education; status-bar Light; display name Orrery.

**Uncommitted working tree (do NOT commit until AR is verified on-device):**
`ios/App/App-Bridging-Header.h` (new), `project.pbxproj` (target+signing), `Info.plist`,
`Plugins/ar-bridge/ArHitTester.swift` (the fix). main is 0/0 vs origin, untouched.

**BLOCKER A — "View in AR" button not showing on /explore.** The button component IS in
the DOM (explore/+page.svelte:5219, ungated) but renders nothing → its internal state
resolved to `hidden`. On a wrapped iPhone that only happens if `detectArPlatform()` falls
to `unsupported`, i.e. Capacitor isn't reporting native-iOS.
→ **FIRST STEP WHEN BACK:** Safari Web Inspector on the phone webview
(iPhone Settings→Safari→Advanced→Web Inspector ON; Mac Safari→Develop→[iPhone]→
`capacitor://localhost`), Console:
```
Capacitor.getPlatform()      // expect "ios"
Capacitor.isNativePlatform() // expect true
navigator.userAgent
```
If either is wrong → that's the gate bug (fix in src/lib/ar.ts detectArPlatform /
classifyArPlatform). If both are right → the bug is elsewhere in EnterArButton's
onMount gate; add a temp console.log of `detectArPlatform()` (logs surface in the Xcode
console, e.g. the ⚡️ lines) and rebuild.

**THREAD B (separate layout bug Marko spotted)** — the `ExploreBodyIndex` toggle
(`.body-index-toggle`, explore/+page.svelte:5557) sits "up" instead of grouped with the
other buttons. Check on the deployed **PWA** too, and on the surface routes where the
same index pattern was added (**moon / mars / earth** via SurfaceScene). Not AR-related.
