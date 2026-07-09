import type { CapacitorConfig } from '@capacitor/cli';

// See RFC-018 §5 + ADR-078. Web app is the product; this is the shell only.

// Local-dev live-reload origin. Set CAP_DEV_SERVER to a LOCAL Vite dev-server
// URL (e.g. http://localhost:5273) to load the whole app from it instead of the
// bundled build — 100% local, no internet, no CDN. iOS sim reaches `localhost`
// natively; the Android emulator needs `adb reverse tcp:<port> tcp:<port>`
// first. UNSET in every release build → app serves the bundle + streams heavy
// assets from STREAM_ORIGIN (the configured host).
const devServer = process.env.CAP_DEV_SERVER;

const config: CapacitorConfig = {
  appId: 'io.github.chipi.orrery',
  appName: 'Orrery',
  webDir: 'build',
  server: {
    // No live server in production — app serves from the local bundle.
    // For local dev against Vite: set url: 'http://<lan-ip>:5173' + cleartext:true
    // and run `npx cap run <platform> --live-reload --external`.
    androidScheme: 'https', // stable WebView origin for SW + History API routing
    // Live-reload against a local dev server only when CAP_DEV_SERVER is set
    // (see above). Release builds leave both unset and serve the bundle.
    ...(devServer ? { url: devServer, cleartext: true } : {}),
  },
  android: {
    backgroundColor: '#04040c', // matches --bg-base; no white flash at mount
    captureInput: true, // keyboard focus stays in the WebView
    webContentsDebuggingEnabled: false, // enable only in debug builds
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#04040c',
    // scrollEnabled must stay true — false killed scrolling on ALL content
    // pages (landing, science, missions…), not just the 3D routes. The 3D
    // canvases prevent native scroll themselves via CSS touch-action:none.
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true, // App Store requirement; external links go via @capacitor/browser
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#04040c',
      androidSplashResourceName: 'splash',
      iosSpinnerStyle: 'small',
      showSpinner: false,
    },
  },
};

export default config;
