// ArHitTester (#206 / RFC-021 §4) — wraps ARRaycastQuery so a screen-space tap
// resolves to a real-world point + surface normal. Uses the modern raycast API
// (ARFrame.raycastQuery + ARSession.raycast), not the deprecated hitTest.
//
// NOT compiled here (no Xcode). Build + verify on device.

import ARKit
import CoreGraphics

enum ArHitTester {
    /// Raycast from a screen point (pixels) against detected planes. Returns the
    /// world position + normal of the nearest hit, or nil.
    static func hitTest(
        session: ARSession,
        screenX: Double,
        screenY: Double,
        viewportSize: CGSize
    ) -> [String: Any]? {
        guard let frame = session.currentFrame, viewportSize.width > 0, viewportSize.height > 0 else {
            return nil
        }
        // ARFrame.raycastQuery takes a point in normalised image space (0…1).
        let normalized = CGPoint(
            x: screenX / Double(viewportSize.width),
            y: screenY / Double(viewportSize.height)
        )
        guard
            let query = frame.raycastQuery(
                from: normalized,
                allowing: .estimatedPlane,
                alignment: .any
            )
        else {
            return nil
        }
        guard let result = session.raycast(query).first else { return nil }

        let t = result.worldTransform.columns.3
        // Surface normal = the hit transform's +Y axis (planes are Y-up locally).
        let n = result.worldTransform.columns.1
        return [
            "worldPosition": [t.x, t.y, t.z],
            "worldNormal": [n.x, n.y, n.z],
        ]
    }
}
