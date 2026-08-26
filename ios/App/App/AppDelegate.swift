import UIKit
import Capacitor
import WebKit

// Safe-area shim (ADR-079 follow-up / #192). Capacitor's iOS WKWebView does not
// surface the device safe-area insets to CSS env(...) (measured env()=0), so the
// nav/footer render under the status bar / Dynamic Island / home indicator. This
// subclass reads the native UIView.safeAreaInsets and injects them as CSS custom
// properties (--safe-area-inset-*), which the app CSS reads via
// var(--safe-area-inset-top, env(safe-area-inset-top)) — real inset under
// Capacitor, env() fallback in the browser. Wired via Main.storyboard.
class SafeAreaViewController: CAPBridgeViewController {
    // App-local plugins (files in the App target, not an npm package) are NOT
    // auto-discovered in Capacitor 6+ — CAPBridgedPlugin conformance alone isn't
    // enough. Register ArBridge explicitly here so its JS→native calls resolve
    // instead of hanging forever (#206 / RFC-021 §4).
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ArBridgePlugin())
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        applySafeAreaInsets()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Force user scrolling on. The `ios.scrollEnabled` config isn't
        // reliably applied to the scrollView (programmatic scroll worked but
        // touch/drag didn't — the classic isScrollEnabled=false signature).
        // Content pages must scroll; 3D routes block it via CSS touch-action.
        webView?.scrollView.isScrollEnabled = true
        webView?.scrollView.bounces = true
        applySafeAreaInsets()
        // viewDidAppear can fire before the SPA's document is ready, so a single
        // inject is lost. Re-apply across the web-content load window.
        for delay in [0.1, 0.3, 0.6, 1.0, 2.0, 3.0] {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                self?.applySafeAreaInsets()
            }
        }
    }

    private func applySafeAreaInsets() {
        let insets = view.safeAreaInsets
        let js = """
        (function(){var s=document.documentElement.style;\
        s.setProperty('--safe-area-inset-top','\(insets.top)px');\
        s.setProperty('--safe-area-inset-right','\(insets.right)px');\
        s.setProperty('--safe-area-inset-bottom','\(insets.bottom)px');\
        s.setProperty('--safe-area-inset-left','\(insets.left)px');})();
        """
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        purgeStaleServiceWorker()
        return true
    }

    // #53 — one-time purge of the WKWebView service worker + web caches. A workbox
    // SW (now removed from the native build) precached the JS shell and served it
    // cache-first, stranding the app on OLD code across .app updates: the update
    // shipped a new bundle, but the persisted SW kept serving the old shell. This
    // clears it once so already-installed builds self-heal even before the JS
    // layer loads; the JS layer no longer registers a SW on native. localStorage,
    // cookies and the Capacitor Filesystem (offline downloads) are left intact.
    // Bump the key to force a re-purge if this class of stale cache recurs.
    private func purgeStaleServiceWorker() {
        let key = "sw-purge-v1"
        guard !UserDefaults.standard.bool(forKey: key) else { return }
        let types: Set<String> = [
            WKWebsiteDataTypeServiceWorkerRegistrations,
            WKWebsiteDataTypeFetchCache,
            WKWebsiteDataTypeDiskCache,
            WKWebsiteDataTypeMemoryCache,
            WKWebsiteDataTypeOfflineWebApplicationCache,
        ]
        WKWebsiteDataStore.default().removeData(
            ofTypes: types,
            modifiedSince: Date(timeIntervalSince1970: 0)
        ) {
            UserDefaults.standard.set(true, forKey: key)
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
