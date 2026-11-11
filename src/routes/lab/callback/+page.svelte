<script lang="ts">
  /**
   * OAuth callback landing (F · #535 · pre-review item 2) — the redirect URI
   * lab-api's static SPA client registers. Prerendered like every route (the
   * static adapter has no server); the ?code exchange happens CLIENT-side on
   * mount. Deliberately minimal chrome: no Notebook imports, no lab state —
   * this page's one job is to finish the handshake and bounce to /lab.
   */
  import { goto } from '$app/navigation';
  import { localHref } from '$lib/locale';
  import { browser } from '$app/environment';
  // Direct message imports, not $lib/lab/t: that resolver pulls every Lab string in
  // every locale (~640 KB br) into this one-line page.
  import {
    lab_signin_title,
    lab_ask_callback_denied,
    lab_ask_callback_back,
    lab_ask_callback_error,
    lab_ask_callback_working,
  } from '$lib/paraglide/messages';
  import { AskAuth, browserDeps } from '$lib/lab/ask/auth';
  import { redirectUri } from '$lib/lab/ask/config';

  let failed = $state<'denied' | 'error' | null>(null);

  $effect(() => {
    if (!browser) return;
    const auth = new AskAuth(browserDeps(), redirectUri(), () => {});
    void auth.completeLogin(new URLSearchParams(location.search)).then((res) => {
      if (res.ok) void goto(localHref(`/lab`), { replaceState: true });
      else failed = res.denied ? 'denied' : 'error';
    });
  });
</script>

<svelte:head>
  <title>Orrery — {lab_signin_title()}</title>
  <!-- An OAuth handshake page, not content. -->
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="callback">
  {#if failed === 'denied'}
    <p class="callback__denied">{lab_ask_callback_denied()}</p>
    <a href={localHref(`/lab`)}>{lab_ask_callback_back()}</a>
  {:else if failed === 'error'}
    <p>{lab_ask_callback_error()}</p>
    <a href={localHref(`/lab`)}>{lab_ask_callback_back()}</a>
  {:else}
    <p>{lab_ask_callback_working()}</p>
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
