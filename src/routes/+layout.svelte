<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import '$lib/styles/app.css';
  import Nav from '$lib/components/Nav.svelte';

  let { children } = $props();

  // ─── PWA service worker (v0.1.12 / ADR-029) ────────────────────────
  // Register on mount; show an update toast when a new SW is waiting.
  // Runtime-only state per CLAUDE.md (no localStorage). Visit counter
  // defers the beforeinstallprompt event until 3+ unique routes —
  // avoids the intrusive first-paint install banner.
  type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };

  let updateAvailable = $state(false);
  let updateSWFn: (() => Promise<void>) | null = $state(null);
  const visited = new Set<string>();
  let deferredInstall = $state<BeforeInstallPromptEvent | null>(null);
  let canInstall = $state(false);

  $effect(() => {
    visited.add($page.url.pathname);
    if (visited.size >= 3 && deferredInstall && !canInstall) {
      canInstall = true;
    }
  });

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
    const onPromptable = (e: Event) => {
      e.preventDefault();
      deferredInstall = e as BeforeInstallPromptEvent;
      if (visited.size >= 3) canInstall = true;
    };
    window.addEventListener('beforeinstallprompt', onPromptable);
    return () => window.removeEventListener('beforeinstallprompt', onPromptable);
  });

  async function refreshApp() {
    if (updateSWFn) await updateSWFn();
    updateAvailable = false;
  }

  async function triggerInstall() {
    if (!deferredInstall) return;
    await deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    canInstall = false;
  }
</script>

<Nav />
<main>
  {@render children?.()}
</main>

{#if updateAvailable}
  <div class="pwa-toast" role="status">
    <span>New version available.</span>
    <button type="button" onclick={refreshApp}>REFRESH</button>
  </div>
{/if}

{#if canInstall}
  <div class="pwa-install" role="status">
    <span>Install Orrery as an app?</span>
    <button type="button" onclick={triggerInstall}>INSTALL</button>
    <button type="button" class="dismiss" onclick={() => (canInstall = false)}>DISMISS</button>
  </div>
{/if}

<style>
  main {
    min-height: calc(100vh - var(--nav-height));
  }
  .pwa-toast,
  .pwa-install {
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
  .pwa-toast button,
  .pwa-install button {
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
  .pwa-install button.dismiss {
    background: transparent;
    color: rgba(220, 230, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
</style>
