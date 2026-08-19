<script lang="ts">
  // Runtime staging↔prod target switcher (ADR-083) — INTERNAL mobile builds only.
  // `MOBILE_INTERNAL` is a compile-time `false` in web + App Store release builds,
  // so this whole component (and its target-env import) tree-shakes out there.
  import {
    MOBILE_INTERNAL,
    getTargetEnv,
    setTargetEnv,
    TARGET_ENVS,
    type TargetEnv,
  } from '$lib/target-env';

  let current = $state<TargetEnv>(MOBILE_INTERNAL ? getTargetEnv() : 'prod');
  let changed = $state(false);

  function pick(env: TargetEnv) {
    if (env === current) return;
    setTargetEnv(env); // takes effect next launch (native crash sink rebinds then)
    current = env;
    changed = true;
  }
</script>

{#if MOBILE_INTERNAL}
  <aside class="target-switcher" aria-label="Internal build — telemetry + asset target">
    <span class="label">Target</span>
    <div class="opts" role="radiogroup" aria-label="Target environment">
      {#each TARGET_ENVS as env (env)}
        <button
          type="button"
          role="radio"
          aria-checked={current === env}
          class:active={current === env}
          onclick={() => pick(env)}
        >
          {env}
        </button>
      {/each}
    </div>
    {#if changed}
      <span class="hint">relaunch to apply</span>
    {/if}
  </aside>
{/if}

<style>
  /* Renders inline at the bottom of the mobile nav drawer — moved out of a
     floating bottom-left panel (2026-08 user direction). MOBILE_INTERNAL-only. */
  .target-switcher {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font:
      11px / 1.4 ui-monospace,
      monospace;
    color: #cfd3e0;
  }
  .label {
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .opts {
    display: flex;
    gap: 2px;
  }
  button {
    padding: 2px 8px;
    border-radius: 5px;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-transform: capitalize;
  }
  button.active {
    background: #2b6cb0;
    color: #fff;
  }
  .hint {
    color: #f6ad55;
  }
</style>
