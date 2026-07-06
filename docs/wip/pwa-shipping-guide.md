# Shipping a Good PWA — a battle-tested guide

A practical, opinionated checklist for shipping a Progressive Web App that
actually installs, works offline, and — the hard part — **updates cleanly**.
Grounded in real production scars (image-precache breaking iOS install, an
update path that silently stalled, subpath-deploy SW scope), not generic advice.

Portable — nothing here is framework-specific except the noted examples.

---

## The bar: what "good PWA" means

Installable · fast first paint · works offline (or degrades honestly) · **updates
without the user noticing or getting stuck** · feels native on the home screen.
If it can't update cleanly, it isn't good — it's a trap you'll be firefighting.

## The three pillars

1. **HTTPS** — mandatory (localhost is exempt for dev).
2. **Web App Manifest** — identity + installability.
3. **Service Worker** — offline, caching, and updates.

Get all three, then spend 80% of your remaining effort on **updates** (§4) and
**not over-caching** (§3). That's where the real bugs live.

---

## 1. The Manifest — identity + installability

Minimum viable manifest:

```json
{
  "name": "My App — full name",
  "short_name": "MyApp",
  "description": "One sentence.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "theme_color": "#0b0b12",
  "background_color": "#0b0b12",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- **`start_url` + `scope`**: use `"./"` (relative) unless you have a reason not
  to — it survives subpath deploys. Get this wrong and install "works" but the
  installed app opens the wrong URL / has no offline scope.
- **Maskable icon is not optional.** Without a `purpose: "maskable"` 512px icon,
  Android wraps your icon in an ugly white rounded box. Design it with a safe
  zone (the outer ~10% gets clipped).
- **`theme_color` / `background_color`** drive the splash screen + status bar.
  Match your app's dark/light so the launch doesn't flash white.
- **`display: "standalone"`** for app-like; `"minimal-ui"` if you want the URL
  bar; `"browser"` defeats the point.

**iOS ignores most of the manifest.** You *also* need meta tags (§5).

---

## 2. Service Worker — the caching strategy is the whole game

Don't hand-write the SW. Use **Workbox** via a framework plugin
(`vite-plugin-pwa` / `@vite-pwa/*`, `next-pwa`, Angular service worker, etc.).
It generates the precache manifest and handles the update lifecycle correctly.

The one decision that matters: **precache vs. runtime-cache.**

### Precache ONLY the shell
Precache = downloaded in full on SW install. Put here: **JS, CSS, fonts, icons,
and small critical data** (e.g. i18n bundles, config). That's it.

### NEVER precache large media — this is the #1 real-world trap
Images, audio, video, big JSON → **runtime-cache on demand**, never precache.

> **War story:** an app precached ~1.7 GB of imagery. Fresh installs *appeared*
> fine on desktop but **silently failed to complete SW install on iOS/WebKit**
> (storage + time limits). The symptom looked like "updates are broken"; the
> cause was an oversized precache. Shrinking the precache from ~4,400 entries to
> ~350 (shell only) fixed install. **Keep the precache tiny.**

```js
// vite-plugin-pwa workbox config — the shape that works
workbox: {
  globPatterns: ['**/*.{js,css,woff2,svg,png,ico}', '**/i18n/*.json'], // shell only
  globIgnores: ['**/porkchop/*.json'],          // big per-route data → runtime
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // hard cap, belt-and-suspenders
  cleanupOutdatedCaches: true,                   // purge old precaches on activate
  navigateFallback: '/',                         // SPA offline deep-links (base-aware! §6)
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.includes('/images/'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 3600 },
      },
    },
    // audio/video/data: StaleWhileRevalidate or NetworkFirst with expiration
  ],
}
```

### Caching strategies, when to use which
- **CacheFirst** — hashed static assets, media that rarely changes. Fast, offline.
- **StaleWhileRevalidate** — data that can be a little stale (serve cache, update
  in background). Best default for most JSON/data.
- **NetworkFirst** — freshness-critical data (with cache fallback for offline).
- **Precache (cache-first)** — the shell only.

Always bound runtime caches with `expiration` (`maxEntries` + `maxAgeSeconds`),
or storage grows until the browser evicts your whole SW.

---

## 3. The UPDATE PATH — the hardest, most-misdiagnosed part

Read this section twice. Most PWA pain is here, not in install.

### SW lifecycle (know it cold)
`install` → **`waiting`** → `activate`. A new SW installs in the background but
**waits** until every tab controlled by the old SW closes — *unless* it calls
`skipWaiting()`. This "waiting" state is why users get stuck on old versions.

### Pick an update strategy — deliberately
- **`autoUpdate`** (vite-plugin-pwa): the new SW takes over automatically. Simple,
  but risks the **silent-update stall** — a user with a long-lived tab keeps
  running the old version until they fully close *all* tabs and reopen.
- **`prompt`**: detect the waiting SW and show *"New version available — Reload"*.
  Explicit, best for content-critical or frequently-updated apps.

```js
// prompt-style update handling (framework-agnostic)
registration.addEventListener('updatefound', () => {
  const sw = registration.installing;
  sw?.addEventListener('statechange', () => {
    if (sw.state === 'installed' && navigator.serviceWorker.controller) {
      showUpdateToast(() => { sw.postMessage({ type: 'SKIP_WAITING' }); });
    }
  });
});
navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
```

- Check for updates on `visibilitychange`/focus: `registration.update()`.
- `cleanupOutdatedCaches: true` so old precaches don't pile up.

### The debugging discipline (the expensive lesson)
> **Fresh-install working ≠ updates working.** These are DISTINCT failure modes.
> An app once looked like "the PWA won't update"; fresh installs were fine — the
> real problem was existing clients not getting the SW handoff. The team burned
> cycles re-applying *precache* fixes on a hunch. **Don't invent root causes for
> update bugs.** Get evidence:
> - Which client version is stuck? (log the running build version)
> - Does a *fresh* install get the new version? (isolates install vs. update)
> - Does it update after closing ALL tabs + reopening? (isolates skipWaiting)
> - What does DevTools → Application → Service Workers show (waiting? redundant?)
>
> Push-and-refresh-and-hope is the anti-pattern. Reproduce the exact stuck
> client state, then fix.

---

## 4. Installability + the iOS reality

### Android / Chromium
`beforeinstallprompt` fires when criteria are met (HTTPS + manifest + SW +
engagement). Capture it, `preventDefault()`, stash it, and show your own install
button — the browser's default mini-infobar is easy to miss.

### iOS / Safari — plan for it explicitly
- **No `beforeinstallprompt`.** Users install via Share → *Add to Home Screen*.
  You can't trigger it; you can only teach it (a subtle hint for iOS Safari users).
- Required meta tags (manifest alone is ignored):

```html
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="MyApp" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

- Handle the notch: `env(safe-area-inset-*)` with `viewport-fit=cover`.
- Detect standalone: `window.navigator.standalone` (iOS) or
  `matchMedia('(display-mode: standalone)')`.
- **iOS storage is tight and eviction is aggressive** → keep the precache small
  (see §2, again — this is why iOS punishes over-caching hardest).
- Push: only iOS 16.4+, only for *installed* PWAs. Don't rely on it.

---

## 5. Subpath / base-path deploys (a silent footgun)

If you deploy under a path (`example.com/app/`, GitHub Pages `/repo/`, a proxy),
the SW **scope**, manifest `start_url`/`scope`, and `navigateFallback` must all
reflect the base — or the SW controls the wrong scope and offline routing 404s.

> **War story:** a subpath GH Pages deploy needed the SW registered under the
> base path and `navigateFallback` pointed at `<base>/`, not `/`. At root it
> worked; under the base it silently didn't. If you deploy to more than one path
> (root + subpath), make the base a build variable and thread it through SW
> registration + `navigateFallback` + the manifest.

---

## 6. Performance — a PWA is not an excuse to be slow

- **Precache budget:** keep the shell lean; add a CI check that fails if the
  precache exceeds N entries / M bytes. (See the war story in §2 for why.)
- Lazy-load routes and media; don't ship it all in the shell.
- Run **Lighthouse** (PWA + Performance) — ideally gated in CI.

---

## 7. Testing — the part everyone skips (and then ships broken)

DevTools → **Application** tab is your cockpit: Manifest, Service Workers (Update
on reload, skipWaiting, Unregister), Cache Storage, Storage quota.

- **Test the UPDATE flow, not just fresh install.** Install the old version →
  deploy the new → confirm *how* it updates (silent? prompt? only after closing
  all tabs?). This is where the bugs hide.
- **Test offline** — DevTools offline throttle *and* real airplane mode.
- **Test on real devices** — iOS Safari + Android Chrome. Emulators lie about
  install criteria and SW eviction.
- **Test your deploy topology** — if you ship to a subpath, test *there*, not
  just at root.

---

## Ship checklist (copy-paste)

```
[ ] HTTPS in production
[ ] Manifest: name, short_name, start_url "./", scope "./", display, theme+bg color
[ ] Icons: 192 + 512 + MASKABLE 512 (safe zone)
[ ] apple-touch-icon (180) + apple-mobile-web-app-* meta + viewport-fit=cover
[ ] SW: precache SHELL ONLY (js/css/fonts/icons/i18n) — NO large media
[ ] Large media/audio/big-JSON → runtimeCaching with expiration bounds
[ ] maximumFileSizeToCacheInBytes set; cleanupOutdatedCaches: true
[ ] navigateFallback for offline deep-links — base-aware if subpath deploy
[ ] Update strategy chosen (autoUpdate vs prompt) + controllerchange → reload
[ ] TESTED the update path from a real prior-version install
[ ] TESTED on real iOS + Android
[ ] Subpath scope correct (SW registered under base; manifest paths relative)
[ ] Lighthouse PWA passes; precache budget guarded in CI
```

## The three lessons that cost the most

1. **Never precache large media.** It silently breaks SW install on iOS. Runtime-
   cache it with expiration bounds. Keep the precache to the shell.
2. **Fresh-install ≠ update.** They fail independently. Test and debug the update
   path on its own, with evidence — never invent a root cause.
3. **Subpath deploys** need base-aware SW scope + `navigateFallback` + relative
   manifest paths, or offline routing breaks under the base and only under it.
