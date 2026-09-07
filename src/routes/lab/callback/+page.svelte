<script lang="ts">
  /**
   * OAuth callback landing (F · #535 · pre-review item 2) — the redirect URI
   * lab-api's static SPA client registers. Prerendered like every route (the
   * static adapter has no server); the ?code exchange happens CLIENT-side on
   * mount. Deliberately minimal chrome: no Notebook imports, no lab state —
   * this page's one job is to finish the handshake and bounce to /lab.
   */
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { t } from '$lib/lab/t';
  import { AskAuth, browserDeps } from '$lib/lab/ask/auth';
  import { redirectUri } from '$lib/lab/ask/config';

  let failed = $state<'denied' | 'error' | null>(null);

  $effect(() => {
    if (!browser) return;
    const auth = new AskAuth(browserDeps(), redirectUri(), () => {});
    void auth.completeLogin(new URLSearchParams(location.search)).then((res) => {
      if (res.ok) void goto(`${base}/lab`, { replaceState: true });
      else failed = res.denied ? 'denied' : 'error';
    });
  });
</script>

<svelte:head><title>Orrery — sign in</title></svelte:head>

<main class="callback">
  {#if failed === 'denied'}
    <p class="callback__denied">{t('lab.ask.callback-denied')}</p>
    <a href="{base}/lab">{t('lab.ask.callback-back')}</a>
  {:else if failed === 'error'}
    <p>{t('lab.ask.callback-error')}</p>
    <a href="{base}/lab">{t('lab.ask.callback-back')}</a>
  {:else}
    <p>{t('lab.ask.callback-working')}</p>
  {/if}
</main>

<style>
  .callback {
    min-height: 60dvh;
    display: grid;
    place-content: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
    padding-bottom: calc(2rem + env(safe-area-inset-bottom));
  }
  .callback__denied {
    max-width: 42ch;
  }
</style>
