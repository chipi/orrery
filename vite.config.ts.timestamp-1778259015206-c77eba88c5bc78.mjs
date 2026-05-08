// vite.config.ts
import { sveltekit } from "file:///Users/markodragoljevic/Projects/orrery/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { SvelteKitPWA } from "file:///Users/markodragoljevic/Projects/orrery/node_modules/@vite-pwa/sveltekit/dist/index.mjs";
import { defineConfig } from "file:///Users/markodragoljevic/Projects/orrery/node_modules/vitest/dist/config.js";
var vite_config_default = defineConfig({
  server: {
    port: 5273,
    strictPort: true,
    // Allow imports from static/ — used by $data/ alias for build-time
    // JSON imports (planets, small-bodies, scenarios). Without this,
    // Vite's default fs.allow excludes static/ and dev-only 404s flood
    // the console.
    fs: { allow: ["static"] }
  },
  preview: { port: 5273, strictPort: true },
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      strategies: "generateSW",
      registerType: "prompt",
      // Existing static manifest is the source of truth.
      manifest: false,
      injectRegister: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,webp,woff2,ico}", "manifest.webmanifest"],
        // Don't precache the porkchop grid JSONs — large + per-route.
        globIgnores: ["**/porkchop/*.json"],
        // Default cap is 2 MiB; some agency mission photos (e.g. Hope Probe
        // hi-res) sit at 3–4 MB. Bump the precache ceiling to 8 MiB so the
        // PWA build doesn't reject them.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            // Mission base files + per-locale overlays.
            urlPattern: ({ url }) => /\/data\/(missions|i18n)\/.*\.json$/.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "orrery-mission-data",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            // Gallery manifests + flight-data manifests.
            urlPattern: ({ url }) => /\/data\/(mission-galleries|planet-galleries|sun-gallery|earth-object-galleries|moon-site-galleries|iss-galleries)\.json$/.test(
              url.pathname
            ),
            handler: "NetworkFirst",
            options: {
              cacheName: "orrery-gallery-manifests",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10 }
            }
          }
        ],
        // SPA fallback so deep links work offline. SvelteKit's static
        // adapter writes 404.html as fallback (svelte.config.js:13).
        navigateFallback: "404.html"
      },
      devOptions: {
        // Don't run the SW in `vite dev` — only in `vite preview` /
        // production. Prevents stale-cache headaches during dev.
        enabled: false
      }
    })
  ],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}", "scripts/**/*.test.ts"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFya29kcmFnb2xqZXZpYy9Qcm9qZWN0cy9vcnJlcnlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYXJrb2RyYWdvbGpldmljL1Byb2plY3RzL29ycmVyeS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWFya29kcmFnb2xqZXZpYy9Qcm9qZWN0cy9vcnJlcnkvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzdmVsdGVraXQgfSBmcm9tICdAc3ZlbHRlanMva2l0L3ZpdGUnO1xuaW1wb3J0IHsgU3ZlbHRlS2l0UFdBIH0gZnJvbSAnQHZpdGUtcHdhL3N2ZWx0ZWtpdCc7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcblxuLyoqXG4gKiB2MC4xLjEyIC8gQURSLTAyOSBcdTIwMTQgc2VydmljZSB3b3JrZXIgdmlhIEB2aXRlLXB3YS9zdmVsdGVraXQuIENhY2hlXG4gKiBzdHJhdGVnaWVzOlxuICogICAtIFNoZWxsICsgdGV4dHVyZXMgKyBmb250cyArIGxvZ29zICsgaW1hZ2VzOiBwcmVjYWNoZSAoY2FjaGUtZmlyc3QpXG4gKiAgIC0gTWlzc2lvbiBKU09OICsgaTE4biBvdmVybGF5czogc3RhbGUtd2hpbGUtcmV2YWxpZGF0ZVxuICogICAtIE1pc3Npb24gZ2FsbGVyeSArIHBvcmtjaG9wIG1hbmlmZXN0czogbmV0d29yay1maXJzdFxuICpcbiAqIFRoZSBzdGF0aWMgbWFuaWZlc3QgKHN0YXRpYy9tYW5pZmVzdC53ZWJtYW5pZmVzdCkgaXMgc2hpcHBlZCBhcy1pc1xuICogYnkgYWRhcHRlci1zdGF0aWM7IHdlIHRlbGwgdGhlIHBsdWdpbiBub3QgdG8gZ2VuZXJhdGUgb25lLlxuICovXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MjczLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgLy8gQWxsb3cgaW1wb3J0cyBmcm9tIHN0YXRpYy8gXHUyMDE0IHVzZWQgYnkgJGRhdGEvIGFsaWFzIGZvciBidWlsZC10aW1lXG4gICAgLy8gSlNPTiBpbXBvcnRzIChwbGFuZXRzLCBzbWFsbC1ib2RpZXMsIHNjZW5hcmlvcykuIFdpdGhvdXQgdGhpcyxcbiAgICAvLyBWaXRlJ3MgZGVmYXVsdCBmcy5hbGxvdyBleGNsdWRlcyBzdGF0aWMvIGFuZCBkZXYtb25seSA0MDRzIGZsb29kXG4gICAgLy8gdGhlIGNvbnNvbGUuXG4gICAgZnM6IHsgYWxsb3c6IFsnc3RhdGljJ10gfSxcbiAgfSxcbiAgcHJldmlldzogeyBwb3J0OiA1MjczLCBzdHJpY3RQb3J0OiB0cnVlIH0sXG4gIHBsdWdpbnM6IFtcbiAgICBzdmVsdGVraXQoKSxcbiAgICBTdmVsdGVLaXRQV0Eoe1xuICAgICAgc3RyYXRlZ2llczogJ2dlbmVyYXRlU1cnLFxuICAgICAgcmVnaXN0ZXJUeXBlOiAncHJvbXB0JyxcbiAgICAgIC8vIEV4aXN0aW5nIHN0YXRpYyBtYW5pZmVzdCBpcyB0aGUgc291cmNlIG9mIHRydXRoLlxuICAgICAgbWFuaWZlc3Q6IGZhbHNlLFxuICAgICAgaW5qZWN0UmVnaXN0ZXI6IGZhbHNlLFxuICAgICAgd29ya2JveDoge1xuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsc3ZnLHBuZyxqcGcsd2VicCx3b2ZmMixpY299JywgJ21hbmlmZXN0LndlYm1hbmlmZXN0J10sXG4gICAgICAgIC8vIERvbid0IHByZWNhY2hlIHRoZSBwb3JrY2hvcCBncmlkIEpTT05zIFx1MjAxNCBsYXJnZSArIHBlci1yb3V0ZS5cbiAgICAgICAgZ2xvYklnbm9yZXM6IFsnKiovcG9ya2Nob3AvKi5qc29uJ10sXG4gICAgICAgIC8vIERlZmF1bHQgY2FwIGlzIDIgTWlCOyBzb21lIGFnZW5jeSBtaXNzaW9uIHBob3RvcyAoZS5nLiBIb3BlIFByb2JlXG4gICAgICAgIC8vIGhpLXJlcykgc2l0IGF0IDNcdTIwMTM0IE1CLiBCdW1wIHRoZSBwcmVjYWNoZSBjZWlsaW5nIHRvIDggTWlCIHNvIHRoZVxuICAgICAgICAvLyBQV0EgYnVpbGQgZG9lc24ndCByZWplY3QgdGhlbS5cbiAgICAgICAgbWF4aW11bUZpbGVTaXplVG9DYWNoZUluQnl0ZXM6IDggKiAxMDI0ICogMTAyNCxcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICAvLyBNaXNzaW9uIGJhc2UgZmlsZXMgKyBwZXItbG9jYWxlIG92ZXJsYXlzLlxuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgdXJsIH0pID0+IC9cXC9kYXRhXFwvKG1pc3Npb25zfGkxOG4pXFwvLipcXC5qc29uJC8udGVzdCh1cmwucGF0aG5hbWUpLFxuICAgICAgICAgICAgaGFuZGxlcjogJ1N0YWxlV2hpbGVSZXZhbGlkYXRlJyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnb3JyZXJ5LW1pc3Npb24tZGF0YScsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMjAwLCBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzMCB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIC8vIEdhbGxlcnkgbWFuaWZlc3RzICsgZmxpZ2h0LWRhdGEgbWFuaWZlc3RzLlxuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgdXJsIH0pID0+XG4gICAgICAgICAgICAgIC9cXC9kYXRhXFwvKG1pc3Npb24tZ2FsbGVyaWVzfHBsYW5ldC1nYWxsZXJpZXN8c3VuLWdhbGxlcnl8ZWFydGgtb2JqZWN0LWdhbGxlcmllc3xtb29uLXNpdGUtZ2FsbGVyaWVzfGlzcy1nYWxsZXJpZXMpXFwuanNvbiQvLnRlc3QoXG4gICAgICAgICAgICAgICAgdXJsLnBhdGhuYW1lLFxuICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ29ycmVyeS1nYWxsZXJ5LW1hbmlmZXN0cycsXG4gICAgICAgICAgICAgIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogMyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAxMCB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICAvLyBTUEEgZmFsbGJhY2sgc28gZGVlcCBsaW5rcyB3b3JrIG9mZmxpbmUuIFN2ZWx0ZUtpdCdzIHN0YXRpY1xuICAgICAgICAvLyBhZGFwdGVyIHdyaXRlcyA0MDQuaHRtbCBhcyBmYWxsYmFjayAoc3ZlbHRlLmNvbmZpZy5qczoxMykuXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICc0MDQuaHRtbCcsXG4gICAgICB9LFxuICAgICAgZGV2T3B0aW9uczoge1xuICAgICAgICAvLyBEb24ndCBydW4gdGhlIFNXIGluIGB2aXRlIGRldmAgXHUyMDE0IG9ubHkgaW4gYHZpdGUgcHJldmlld2AgL1xuICAgICAgICAvLyBwcm9kdWN0aW9uLiBQcmV2ZW50cyBzdGFsZS1jYWNoZSBoZWFkYWNoZXMgZHVyaW5nIGRldi5cbiAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICB0ZXN0OiB7XG4gICAgaW5jbHVkZTogWydzcmMvKiovKi57dGVzdCxzcGVjfS57anMsdHN9JywgJ3NjcmlwdHMvKiovKi50ZXN0LnRzJ10sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVMsU0FBUyxpQkFBaUI7QUFDalUsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxvQkFBb0I7QUFZN0IsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFLWixJQUFJLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRTtBQUFBLEVBQzFCO0FBQUEsRUFDQSxTQUFTLEVBQUUsTUFBTSxNQUFNLFlBQVksS0FBSztBQUFBLEVBQ3hDLFNBQVM7QUFBQSxJQUNQLFVBQVU7QUFBQSxJQUNWLGFBQWE7QUFBQSxNQUNYLFlBQVk7QUFBQSxNQUNaLGNBQWM7QUFBQTtBQUFBLE1BRWQsVUFBVTtBQUFBLE1BQ1YsZ0JBQWdCO0FBQUEsTUFDaEIsU0FBUztBQUFBLFFBQ1AsY0FBYyxDQUFDLGlEQUFpRCxzQkFBc0I7QUFBQTtBQUFBLFFBRXRGLGFBQWEsQ0FBQyxvQkFBb0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQUlsQywrQkFBK0IsSUFBSSxPQUFPO0FBQUEsUUFDMUMsZ0JBQWdCO0FBQUEsVUFDZDtBQUFBO0FBQUEsWUFFRSxZQUFZLENBQUMsRUFBRSxJQUFJLE1BQU0scUNBQXFDLEtBQUssSUFBSSxRQUFRO0FBQUEsWUFDL0UsU0FBUztBQUFBLFlBQ1QsU0FBUztBQUFBLGNBQ1AsV0FBVztBQUFBLGNBQ1gsWUFBWSxFQUFFLFlBQVksS0FBSyxlQUFlLEtBQUssS0FBSyxLQUFLLEdBQUc7QUFBQSxZQUNsRTtBQUFBLFVBQ0Y7QUFBQSxVQUNBO0FBQUE7QUFBQSxZQUVFLFlBQVksQ0FBQyxFQUFFLElBQUksTUFDakIsMkhBQTJIO0FBQUEsY0FDekgsSUFBSTtBQUFBLFlBQ047QUFBQSxZQUNGLFNBQVM7QUFBQSxZQUNULFNBQVM7QUFBQSxjQUNQLFdBQVc7QUFBQSxjQUNYLHVCQUF1QjtBQUFBLGNBQ3ZCLFlBQVksRUFBRSxZQUFZLEdBQUc7QUFBQSxZQUMvQjtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUE7QUFBQTtBQUFBLFFBR0Esa0JBQWtCO0FBQUEsTUFDcEI7QUFBQSxNQUNBLFlBQVk7QUFBQTtBQUFBO0FBQUEsUUFHVixTQUFTO0FBQUEsTUFDWDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLFNBQVMsQ0FBQyxnQ0FBZ0Msc0JBQXNCO0FBQUEsRUFDbEU7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
