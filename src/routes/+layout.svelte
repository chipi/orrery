<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import '$lib/styles/app.css';
  import Nav from '$lib/components/Nav.svelte';
  import { setLanguageTag } from '$lib/paraglide/runtime';
  import { localeFromPage, isSupportedLocale, syncDocumentLocaleAttributes } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';

  let { children } = $props();
  let activeLocale = $derived(localeFromPage($page));

  // Apply the resolved locale to Paraglide BEFORE descendant
  // components render their `m.foo()` calls. $effect.pre runs
  // synchronously before each DOM update — early enough that the
  // first paint of a `?lang=es` URL renders in Spanish, not in
  // en-US fallback that gets corrected on the second tick.
  $effect.pre(() => {
    const code = localeFromPage($page);
    if (isSupportedLocale(code)) {
      setLanguageTag(code);
      syncDocumentLocaleAttributes(code);
    }
  });

  // ─── PWA service worker (v0.1.12 / ADR-029) ────────────────────────
  // Register on mount; show an update toast when a new SW is waiting.
  // Runtime-only state per CLAUDE.md (no localStorage). The browser's
  // beforeinstallprompt event is preventDefault'd so neither Chrome's
  // native install banner nor an in-app prompt fires. Users who want
  // to install can still do so via the browser menu (⋮ → "Install
  // Orrery") — the manifest + service worker still qualify the site
  // as installable; we just don't nag.

  let updateAvailable = $state(false);
  let updateSWFn: (() => Promise<void>) | null = $state(null);

  onMount(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const { useRegisterSW } = await import('virtual:pwa-register/svelte');
      const { needRefresh, updateServiceWorker } = useRegisterSW({
        onRegisteredSW(_url: string, registration: ServiceWorkerRegistration | undefined) {
          // Hourly check for new builds.
          if (registration) {
            setInterval(() => void registration.update(), 60 * 60 * 1000);
          }
        },
      });
      updateSWFn = () => updateServiceWorker(true);
      needRefresh.subscribe((v: boolean) => {
        updateAvailable = v;
      });
    } catch {
      // SW registration failed; carry on. Manifest-only install still
      // works on Android.
    }
  });

  onMount(() => {
    if (typeof window === 'undefined') return;
    // Suppress both Chrome's native install banner and any in-app
    // prompt. preventDefault stops the browser from auto-showing.
    const onPromptable = (e: Event) => e.preventDefault();
    window.addEventListener('beforeinstallprompt', onPromptable);
    return () => window.removeEventListener('beforeinstallprompt', onPromptable);
  });

  async function refreshApp() {
    if (updateSWFn) await updateSWFn();
    updateAvailable = false;
  }
</script>

<svelte:head>
  <link rel="manifest" href="{base}/manifest.webmanifest" />
  <link rel="icon" href="{base}/logos/nasa.svg" type="image/svg+xml" />
</svelte:head>

{#key activeLocale}
  <Nav />
  <main>
    {@render children?.()}
  </main>
{/key}

{#if updateAvailable}
  <div class="pwa-toast" role="status">
    <span>{m.layout_pwa_new_version()}</span>
    <button type="button" onclick={refreshApp}>{m.layout_pwa_refresh()}</button>
  </div>
{/if}

<style>
  main {
    min-height: calc(100vh - var(--nav-height));
  }
  .pwa-toast {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 10px 16px;
    background: rgba(15, 18, 35, 0.95);
    border: 1px solid rgba(78, 205, 196, 0.5);
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #dde4ff;
    backdrop-filter: blur(6px);
  }
  .pwa-toast button {
    min-height: 32px;
    padding: 4px 12px;
    background: #4ecdc4;
    border: none;
    border-radius: 3px;
    color: #04040c;
    font-family: inherit;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    cursor: pointer;
  }
</style>
