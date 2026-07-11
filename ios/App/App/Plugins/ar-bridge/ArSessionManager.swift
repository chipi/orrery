// ArSessionManager (#206 / RFC-021 §4) — wraps ARSession + world tracking + the
// per-frame delegate. Shows the ARKit camera feed natively BEHIND the (made-
// transparent) Capacitor WebView, so Three.js renders 3D over the live camera —
// the iPhone analogue of the WebXR compositor the browser gives us on Android.
//
// NOT compiled here (no Xcode). Build + verify on device in Xcode.

import ARKit
import UIKit

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

    init(webView: UIView?) {
        self.webView = webView
        super.init()
        session.delegate = self
    }

    var isSupported: Bool { ARWorldTrackingConfiguration.isSupported }

    /// Start world tracking + insert the camera-background ARSCNView behind the
    /// transparent WebView. Idempotent.
    func start() {
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

        // Make the WebView transparent so the camera shows through.
        previousWebViewBackground = webView.backgroundColor
        webView.isOpaque = false
        webView.backgroundColor = .clear

        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal, .vertical]
        config.environmentTexturing = .automatic
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
        }
        delegate?.arSessionEnded()
    }

    /// The current world-tracking frame (nil until tracking initialises).
    var currentFrame: ARFrame? { session.currentFrame }

    // MARK: ARSessionDelegate

    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        delegate?.arSession(didUpdatePose: ArCameraPoseEmitter.pose(from: frame.camera.transform))
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        stop()
    }
}
