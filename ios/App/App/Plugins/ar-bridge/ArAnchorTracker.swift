// ArAnchorTracker (#206 / RFC-021 §4) — add/remove ARAnchors + a stable string-id
// lifecycle so JS (ArBackend.addAnchor/removeAnchor) can lock a scene origin to a
// real-world point.
//
// NOT compiled here (no Xcode). Build + verify on device.

import ARKit
import simd

final class ArAnchorTracker {
    private var anchors: [String: ARAnchor] = [:]

    /// Add an anchor at a world position (identity rotation). Returns its id
    /// (the ARAnchor UUID string), which JS holds for later removal.
    func add(session: ARSession, position: [Float]) -> String {
        var transform = matrix_identity_float4x4
        transform.columns.3 = simd_float4(
            position.count > 0 ? position[0] : 0,
            position.count > 1 ? position[1] : 0,
            position.count > 2 ? position[2] : 0,
            1
        )
        let anchor = ARAnchor(transform: transform)
        session.add(anchor: anchor)
        let id = anchor.identifier.uuidString
        anchors[id] = anchor
        return id
    }

    /// Remove a previously-added anchor by id. No-op if unknown.
    func remove(session: ARSession, id: String) {
        guard let anchor = anchors.removeValue(forKey: id) else { return }
        session.remove(anchor: anchor)
    }

    func removeAll(session: ARSession) {
        for anchor in anchors.values { session.remove(anchor: anchor) }
        anchors.removeAll()
    }
}
