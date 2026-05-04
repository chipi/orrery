<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { setLanguageTag } from '$lib/paraglide/runtime';
  import {
    SUPPORTED_LOCALES,
    isSupportedLocale,
    localeFromPage,
    type LocaleCode,
  } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';

  let open = $state(false);
  // Currently-resolved locale, derived from the URL each render so the
  // chip stays in sync if another component changes ?lang=.
  let active = $derived<LocaleCode>(localeFromPage($page));
  let activeEntry = $derived(
    SUPPORTED_LOCALES.find((l) => l.code === active) ?? SUPPORTED_LOCALES[0],
  );

  /**
   * Switch locale: rewrite the URL `?lang=` parameter and tell
   * Paraglide to use the new tag for compile-time string lookups
   * inside `$derived` blocks. Storage-free per CLAUDE.md (URL is
   * the only source of truth — see ADR-031 + RFC-010 §Maintainer-decisions).
   */
  async function pick(code: LocaleCode) {
    open = false;
    if (code === active) return;
    const url = new URL($page.url);
    if (code === 'en-US') url.searchParams.delete('lang');
    else url.searchParams.set('lang', code);
    setLanguageTag(code);
    await goto(url.pathname + url.search, { replaceState: false, keepFocus: true });
  }

  // Close dropdown on Escape or outside-click.
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
  function onWindowClick(e: MouseEvent) {
    if (!open) return;
    const target = e.target as HTMLElement | null;
    if (target && !target.closest('[data-locale-picker]')) open = false;
  }

  // Apply the resolved locale to Paraglide on mount + whenever it
  // changes (e.g. user pastes a `?lang=es` URL). Without this the
  // chip would show ES but Paraglide would still compile en-US strings.
  $effect(() => {
    if (isSupportedLocale(active)) setLanguageTag(active);
  });
</script>

<svelte:window onkeydown={onKeydown} onclick={onWindowClick} />

<div class="locale-picker" data-locale-picker>
  <button
    type="button"
    class="chip"
    aria-label={m.nav_locale_picker_aria()}
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    {activeEntry.shortTag}
  </button>
  {#if open}
    <ul class="menu" role="listbox" aria-label={m.nav_locale_picker_aria()}>
      {#each SUPPORTED_LOCALES as entry (entry.code)}
        <li>
          <button
            type="button"
            class="option"
            class:active={entry.code === active}
            role="option"
            aria-selected={entry.code === active}
            onclick={() => pick(entry.code)}
          >
            <span class="native">{entry.nativeName}</span>
            <span class="tag">{entry.shortTag}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .locale-picker {
    position: relative;
    display: inline-block;
  }
  .chip {
    min-width: 44px;
    min-height: 44px;
    padding: 0 10px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    color: var(--color-text);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }
  .chip:hover,
  .chip[aria-expanded='true'] {
    border-color: rgba(78, 205, 196, 0.7);
  }
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    margin: 0;
    padding: 4px;
    list-style: none;
    background: rgba(15, 18, 35, 0.97);
    border: 1px solid rgba(78, 205, 196, 0.4);
    border-radius: 4px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
    z-index: 30;
    min-width: 160px;
  }
  .option {
    width: 100%;
    min-height: 44px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: var(--color-text);
    /* Match the nav wordmark / HUD aesthetic — Bebas Neue display
       face with wide letter-spacing reads as part of the same UI
       family as the rest of the chrome (avoids the Crimson Pro
       italic that felt editorial-out-of-place in a control). */
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: 2px;
    cursor: pointer;
    text-align: left;
  }
  .option:hover {
    background: rgba(78, 205, 196, 0.12);
  }
  .option.active {
    color: #4ecdc4;
  }
  .option .native {
    /* Inherits display font from .option. No italic — UI label, not
       editorial body text. */
    color: inherit;
  }
  .option .tag {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.55);
  }
  .option.active .tag {
    color: #4ecdc4;
  }
</style>
