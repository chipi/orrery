// ArCameraPoseEmitter (#206 / RFC-021 §4) — converts ARKit's column-major
// simd_float4x4 transform into a Three.js-friendly { position, rotation:quaternion }
// dictionary. Pure math; no ARKit session state. Coordinate spaces match: ARKit
// and Three.js/WebXR both use a right-handed, Y-up, metres world, so no axis flip
// is needed — only a matrix→(translation, quaternion) decomposition.
//
// NOTE: not compiled in this environment (no Xcode). Build + verify in Xcode on a
// real device before shipping.

import Foundation
import simd

enum ArCameraPoseEmitter {
    /// Decompose a world transform into position + unit quaternion (x, y, z, w),
    /// matching the ArBackend.getCameraPose() shape on the JS side.
    static func pose(from transform: simd_float4x4) -> [String: Any] {
        let t = transform.columns.3
        let q = simd_quatf(rotationMatrix(transform))
        return [
            "position": [t.x, t.y, t.z],
            "rotation": [q.imag.x, q.imag.y, q.imag.z, q.real],
        ]
    }

    /// Upper-left 3×3 rotation basis of a 4×4 transform (drops translation).
    private static func rotationMatrix(_ m: simd_float4x4) -> simd_float3x3 {
        simd_float3x3(
            simd_float3(m.columns.0.x, m.columns.0.y, m.columns.0.z),
            simd_float3(m.columns.1.x, m.columns.1.y, m.columns.1.z),
            simd_float3(m.columns.2.x, m.columns.2.y, m.columns.2.z)
        )
    }

    /// World position of a transform as a plain [x, y, z] array.
    static func position(from transform: simd_float4x4) -> [Float] {
        let t = transform.columns.3
        return [t.x, t.y, t.z]
    }
}
