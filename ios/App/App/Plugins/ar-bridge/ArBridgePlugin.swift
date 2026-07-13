// ArBridgePlugin (#206 / RFC-021 §4) — Capacitor plugin entry that bridges JS
// (the ArBackend arkit-capacitor adapter, #207) to native ARKit. All ARKit +
// UIKit work is main-thread. Frames are emitted as `frame` events carrying the
// camera pose; the JS adapter caches the latest for synchronous getCameraPose().
//
// NOT compiled here (no Xcode). Build via `npx cap sync ios` + Xcode; verify on
// a real device.

import ARKit
import Capacitor

@objc(ArBridgePlugin)
public class ArBridgePlugin: CAPPlugin, CAPBridgedPlugin, ArSessionManagerDelegate {
    // Capacitor 6+ registers plugins via this Swift conformance (the old ObjC
    // CAP_PLUGIN macro is ignored), so without it the plugin is invisible and
    // every JS→native call hangs forever.
    public let identifier = "ArBridgePlugin"
    public let jsName = "ArBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hitTest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addAnchor", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeAnchor", returnType: CAPPluginReturnPromise),
    ]

    private var manager: ArSessionManager?
    private let anchors = ArAnchorTracker()

    @objc func requestSession(_ call: CAPPluginCall) {
        let headingAligned = call.getBool("headingAligned") ?? false
        DispatchQueue.main.async {
            let mgr = ArSessionManager(webView: self.webView)
            guard mgr.isSupported else {
                call.reject("ARKit world tracking is not supported on this device")
                return
            }
            mgr.delegate = self
            self.manager = mgr
            mgr.start(headingAligned: headingAligned)
            call.resolve()
        }
    }

    @objc func endSession(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let session = self.manager?.session {
                self.anchors.removeAll(session: session)
            }
            self.manager?.stop()
            self.manager = nil
            call.resolve()
        }
    }

    @objc func hitTest(_ call: CAPPluginCall) {
        let x = call.getDouble("x") ?? 0
        let y = call.getDouble("y") ?? 0
        DispatchQueue.main.async {
            guard let mgr = self.manager else {
                call.resolve(["hit": NSNull()])
                return
            }
            let size = self.webView?.bounds.size ?? .zero
            let hit = ArHitTester.hitTest(
                session: mgr.session,
                screenX: x,
                screenY: y,
                viewportSize: size
            )
            call.resolve(["hit": hit ?? NSNull()])
        }
    }

    @objc func addAnchor(_ call: CAPPluginCall) {
        let raw = call.getArray("position") ?? []
        let position = raw.compactMap { ($0 as? NSNumber)?.floatValue }
        DispatchQueue.main.async {
            guard let mgr = self.manager else {
                call.reject("no active AR session")
                return
            }
            let id = self.anchors.add(session: mgr.session, position: position)
            call.resolve(["anchorId": id])
        }
    }

    @objc func removeAnchor(_ call: CAPPluginCall) {
        guard let id = call.getString("anchorId") else {
            call.reject("anchorId is required")
            return
        }
        DispatchQueue.main.async {
            if let session = self.manager?.session {
                self.anchors.remove(session: session, id: id)
            }
            call.resolve()
        }
    }

    // MARK: ArSessionManagerDelegate

    func arSession(didUpdatePose pose: [String: Any]) {
        notifyListeners("frame", data: ["pose": pose])
    }

    func arSessionStarted() {
        notifyListeners("session-started", data: [:])
    }

    func arSessionEnded() {
        notifyListeners("session-ended", data: [:])
    }
}
