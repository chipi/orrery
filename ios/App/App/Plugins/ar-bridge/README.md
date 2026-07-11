# @orrery/ar-bridge — ARKit Capacitor plugin (#206 / RFC-021 §4)

Native ARKit bridge for the wrapped iPhone app. Apple ships no WebXR, so this
Swift plugin is the only path to real AR on iPhone. The JS side (`ArBackend`
arkit-capacitor adapter, #207) calls it through the Capacitor bridge as `ArBridge`.

**⚠ Written without Xcode (this laptop has none) — build + verify on your dev
machine + a real device before shipping.** ARKit can't run in the simulator.

## Files

| File | Role |
|---|---|
| `ArBridgePlugin.swift` | Capacitor plugin entry — JS ⇄ ARKit. Emits `frame` / `session-started` / `session-ended`; methods `requestSession`, `endSession`, `hitTest`, `addAnchor`, `removeAnchor`. |
| `ArBridgePlugin.m` | Capacitor registration macro (discovers the plugin). |
| `ArSessionManager.swift` | `ARSession` + world tracking + the transparent-WebView-over-camera compositor. |
| `ArHitTester.swift` | `ARRaycastQuery` — screen tap → world point + normal. |
| `ArAnchorTracker.swift` | `ARAnchor` add/remove + string-id lifecycle. |
| `ArCameraPoseEmitter.swift` | `simd_float4x4` → `{ position, rotation:quaternion }` (Three.js/WebXR-compatible; both are RH, Y-up, metres — no axis flip). |

## Build steps (Xcode, on your machine)

1. `npx cap sync ios`.
2. In Xcode, add this `ar-bridge/` folder to the **App** target (File ▸ Add Files
   to "App"… → check the App target). Capacitor discovers the plugin via the
   `CAP_PLUGIN` macro in `ArBridgePlugin.m` once it's in the target.
3. **Camera permission** — add `NSCameraUsageDescription` to `Info.plist` (this is
   slice #214). ARKit refuses to start without it.
4. Build to a real device (ARKit is unavailable in the simulator).
5. Verify: enter AR on a globe scene → camera feed shows behind the 3D, tap places
   the scene, `frame` poses drive the XR camera.

## Known follow-ups
- Frame events fire at 30–60 Hz over the Capacitor bridge — throttle or share a
  buffer if the bridge traffic is heavy (measure on device first).
- `ArHitTester` uses `.estimatedPlane`; tune allowed target types after testing.
