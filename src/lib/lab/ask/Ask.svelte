<!--
  The ask box (F · #535 · T4) — third Lab view. Single-turn question → answer:
  the LLM narrates, the KERNEL computes; every numeric card below an answer is
  verbatim FormulaResult, and the narration block is explicitly labelled with
  the model that wrote it (the honesty caption is first-class UI, not a
  tooltip). Explicit states for every way this can honestly fail.

  Pointer-events rule: nothing fetches on hover/focus — submit only on
  click/Enter.
-->
<script lang="ts">
  import { getLocale } from '$lib/paraglide/runtime';
  import AskToolResult from './AskToolResult.svelte';
  import AskScenarioView from './AskScenarioView.svelte';
  import type { AskState } from './ask-state.svelte';

  type Props = {
    ask: AskState;
    t: (key: string, params?: Record<string, string | number>) => string;
  };
  let { ask, t }: Props = $props();

  let question = $state('');

  function submit(e: SubmitEvent): void {
    e.preventDefault();
    const q = question;
    question = '';
    void ask.ask(q, getLocale()).then(() => {
      // Don't eat the question on failure (holistic m-5) — restore it so the
      // user can retry or edit, unless they already typed something new.
      const last = ask.entries.at(-1);
      if (last?.state === 'error' && last.question === q && !question) question = q;
    });
  }
</script>

<section class="ask" aria-label={t('lab.ask.aria-view')}>
  {#if ask.phase === 'signed-out'}
    <div class="ask__gate">
      <p>{t('lab.ask.signed-out')}</p>
      <button class="ask__primary" onclick={() => void ask.signIn()}>
        {t('lab.ask.sign-in')}
      </button>
    </div>
  {:else if ask.phase === 'signing-in'}
    <div class="ask__gate"><p>{t('lab.ask.signing-in')}</p></div>
  {:else if ask.phase === 'denied'}
    <div class="ask__gate">
      <p>{t('lab.ask.denied')}</p>
    </div>
  {:else}
    <p class="ask__note">{t('lab.ask.single-turn-note')}</p>

    <div class="ask__transcript">
      {#each ask.entries as entry, i (i)}
        <div class="ask__q">{entry.question}</div>
        {#if entry.state === 'loading'}
          <p class="ask__loading" role="status">{t('lab.ask.computing')}</p>
        {:else if entry.state === 'error'}
          <p class="ask__error" role="alert">
            {t(entry.errorKey ?? 'lab.ask.err-generic', {
              seconds: entry.retryAfterS ?? 30,
            })}
          </p>
        {:else}
          {#if entry.scenario}
            <AskScenarioView scenario={entry.scenario} {t} />
          {/if}
          {#if entry.toolCalls?.some((c) => c.tool !== 'compose_scenario')}
            <div class="ask__tools">
              {#each entry.toolCalls.filter((c) => c.tool !== 'compose_scenario') as call, j (j)}
                <AskToolResult {call} {t} />
              {/each}
            </div>
          {/if}
          <div class="ask__answer">
            <p class="ask__honesty">{t('lab.ask.honesty', { model: entry.model ?? '?' })}</p>
            <div class="ask__answer-text">{entry.answer}</div>
          </div>
        {/if}
      {/each}
    </div>

    <form class="ask__form" onsubmit={submit}>
      <textarea
        class="ask__input"
        bind:value={question}
        rows="2"
        maxlength={2000}
        placeholder={t('lab.ask.placeholder')}
        aria-label={t('lab.ask.aria-input')}
        onkeydown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}></textarea>
      <button class="ask__primary" type="submit" disabled={ask.busy || !question.trim()}>
        {t('lab.ask.submit')}
      </button>
    </form>

    <button class="ask__signout" onclick={() => ask.signOut()}>
      {t('lab.ask.sign-out')}
    </button>
  {/if}
</section>

<style>
  .ask {
    display: grid;
    gap: 1rem;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .ask__gate {
    display: grid;
    place-items: center;
    gap: 1rem;
    min-height: 12rem;
    text-align: center;
    padding: 1rem;
  }
  .ask__note {
    margin: 0;
    font-size: 0.85rem;
    opacity: 0.7;
  }
  .ask__transcript {
    display: grid;
    gap: 0.75rem;
  }
  .ask__q {
    justify-self: end;
    max-width: 85%;
    background: var(--lab-accent-dim, #1d2a3a);
    border-radius: 10px;
    padding: 0.5rem 0.8rem;
    white-space: pre-wrap;
  }
  .ask__tools {
    display: grid;
    gap: 0.6rem;
  }
  .ask__answer {
    display: grid;
    gap: 0.35rem;
  }
  .ask__honesty {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    opacity: 0.65;
  }
  .ask__answer-text {
    white-space: pre-wrap;
    line-height: 1.55;
  }
  .ask__loading,
  .ask__error {
    margin: 0;
    font-size: 0.9rem;
    opacity: 0.85;
  }
  .ask__form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: end;
  }
  .ask__input {
    /* ≥16px blocks iOS focus-zoom (pre-review item 8). */
    font-size: 16px;
    font-family: inherit;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    border: 1px solid var(--lab-line, #2a3040);
    background: transparent;
    color: inherit;
    resize: vertical;
    min-height: 44px;
  }
  .ask__primary {
    min-height: 44px;
    min-width: 44px;
    padding: 0.55rem 1.1rem;
    border-radius: 8px;
    border: 1px solid var(--lab-line, #2a3040);
    background: var(--lab-accent-dim, #1d2a3a);
    color: inherit;
    cursor: pointer;
  }
  .ask__primary:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .ask__signout {
    justify-self: start;
    background: none;
    border: none;
    color: inherit;
    opacity: 0.6;
    text-decoration: underline;
    cursor: pointer;
    padding: 0.25rem 0;
    font-size: 0.85rem;
  }
</style>
