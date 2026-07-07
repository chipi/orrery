import type { CapacitorConfig } from '@capacitor/cli';

// See RFC-018 §5 + ADR-078. Web app is the product; this is the shell only.
const config: CapacitorConfig = {
  appId: 'io.github.chipi.orrery',
  appName: 'Orrery',
  webDir: 'build',
  server: {
    // No live server in production — app serves from the local bundle.
    // For local dev against Vite: set url: 'http://<lan-ip>:5173' + cleartext:true
    // and run `npx cap run <platform> --live-reload --external`.
    androidScheme: 'https', // stable WebView origin for SW + History API routing
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
