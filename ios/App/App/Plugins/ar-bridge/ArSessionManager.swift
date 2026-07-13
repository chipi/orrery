// ArSessionManager (#206 / RFC-021 §4) — wraps ARSession + world tracking + the
// per-frame delegate. Shows the ARKit camera feed natively BEHIND the (made-
// transparent) Capacitor WebView, so Three.js renders 3D over the live camera —
// the iPhone analogue of the WebXR compositor the browser gives us on Android.
//
// NOT compiled here (no Xcode). Build + verify on device in Xcode.

import ARKit
import UIKit
import WebKit

protocol ArSessionManagerDelegate: AnyObject {
    func arSession(didUpdatePose pose: [String: Any])
    func arSessionStarted()
    func arSessionEnded()
}

final class ArSessionManager: NSObject, ARSessionDelegate {
    weak var delegate: ArSessionManagerDelegate?

    private(set) var session = ARSession()
    private var arView: ARSCNView?
    /// The WebView we make transparent + composite over the camera feed.
    private weak var webView: UIView?
    private var previousWebViewBackground: UIColor?
    private var running = false
    /// Last pose-emit time (ARFrame timestamp). Throttles the per-frame bridge
    /// push — 60 fps of notifyListeners saturates the main thread + freezes the
    /// WebView. See session(_:didUpdate:).
    private var lastPoseEmit: TimeInterval = 0

    init(webView: UIView?) {
        self.webView = webView
        super.init()
        session.delegate = self
    }

    var isSupported: Bool { ARWorldTrackingConfiguration.isSupported }

    /// Start world tracking + insert the camera-background ARSCNView behind the
    /// transparent WebView. Idempotent. `headingAligned` requests
    /// `.gravityAndHeading` world alignment (true north + gravity) for the
    /// sky-pointing mode (#393); otherwise the default `.gravity` is used.
    func start(headingAligned: Bool = false) {
        guard isSupported, !running, let webView = webView, let host = webView.superview else {
            return
        }
        running = true

        // Camera feed layer — an ARSCNView with no scene content, purely the
        // captured-image background. Sized to the host + inserted below the WebView.
        let view = ARSCNView(frame: host.bounds)
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.session = session
        view.automaticallyUpdatesLighting = true
        view.scene = SCNScene()
        host.insertSubview(view, belowSubview: webView)
        arView = view

        // Make the WebView transparent so the camera shows through. The WKWebView's
        // inner scrollView carries its own (opaque) background — clearing only the
        // web view leaves an opaque backdrop that hides the camera, so clear both.
        previousWebViewBackground = webView.backgroundColor
        webView.isOpaque = false
        webView.backgroundColor = .clear
        if let wk = webView as? WKWebView {
            wk.scrollView.backgroundColor = .clear
            wk.scrollView.isOpaque = false
        }

        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal, .vertical]
        config.environmentTexturing = .automatic
        // Sky mode: align the world frame to true north + gravity so a body's
        // azimuth/altitude maps straight to a world direction. Needs the location
        // permission (Info.plist NSLocationWhenInUseUsageDescription).
        config.worldAlignment = headingAligned ? .gravityAndHeading : .gravity
        session.run(config, options: [.resetTracking, .removeExistingAnchors])
        delegate?.arSessionStarted()
    }

    /// Pause tracking, restore the WebView, and tear down the camera layer.
    func stop() {
        guard running else { return }
        running = false
        session.pause()
        arView?.removeFromSuperview()
        arView = nil
        if let webView = webView {
            webView.isOpaque = true
            webView.backgroundColor = previousWebViewBackground
            if let wk = webView as? WKWebView {
                wk.scrollView.backgroundColor = previousWebViewBackground
                wk.scrollView.isOpaque = true
            }
        }
        delegate?.arSessionEnded()
    }

    /// The current world-tracking frame (nil until tracking initialises).
    var currentFrame: ARFrame? { session.currentFrame }

    // MARK: ARSessionDelegate

    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        // Throttle to ~30 Hz. Emitting every frame (~60 fps) via notifyListeners
        // floods the Capacitor bridge and wedges the main thread / WebView. The
        // JS render loop reads the cached pose each rAF, so 30 Hz stays smooth.
        guard frame.timestamp - lastPoseEmit >= 1.0 / 30.0 else { return }
        lastPoseEmit = frame.timestamp
        delegate?.arSession(didUpdatePose: ArCameraPoseEmitter.pose(from: frame.camera.transform))
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        stop()
    }
}
