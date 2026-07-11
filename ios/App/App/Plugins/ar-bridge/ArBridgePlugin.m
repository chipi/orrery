// Capacitor plugin registration for ArBridgePlugin (#206 / RFC-021 §4).
// Exposes the plugin to the JS bridge as "ArBridge" with its promise methods.
// Required alongside the Swift class — Capacitor discovers plugins via this macro.

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(ArBridgePlugin, "ArBridge",
    CAP_PLUGIN_METHOD(requestSession, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(endSession, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(hitTest, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(addAnchor, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(removeAnchor, CAPPluginReturnPromise);
)
