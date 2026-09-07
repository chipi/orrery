<script lang="ts">
  /**
   * /dev/lab-illustrations — the per-image approval surface (G · #536).
   * Candidates dropped into static/images/lab/goals/_staging/<goalId>.webp
   * appear here beside their goal title; Approve moves the file into the
   * shipped path AND writes the manifest + provenance (operator_approved
   * timestamp) in one click. Dev server only.
   */
  import { GOALS } from '$lib/physics/registry/goals';
  import { t } from '$lib/lab/t';

  let candidates = $state<string[]>([]);
  let approved = $state<string[]>([]);
  let busy = $state('');

  async function load(): Promise<void> {
    const r = (await (await fetch('api')).json()) as {
      candidates: string[];
      approved: string[];
    };
    candidates = r.candidates;
    approved = r.approved;
  }

  async function act(action: 'approve' | 'reject', goalId: string): Promise<void> {
    busy = goalId;
    await fetch('api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, goalId, model: 'nano_banana_pro' }),
    });
    busy = '';
    await load();
  }

  void load();
</script>

<main class="rev">
  <h1>Lab illustrations — review ({candidates.length} pending, {approved.length} approved)</h1>
  <p class="rev__hint">
    Drop candidates as <code>static/images/lab/goals/_staging/&lt;goalId&gt;.webp</code>. Approve
    writes manifest + provenance; the fail-closed test then demands the alt key ×14 before this can
    ship.
  </p>
  {#each candidates as goalId (goalId)}
    <section class="rev__item">
      <h2>{GOALS.has(goalId) ? t(GOALS.get(goalId)!.titleKey) : `⚠ unknown goal: ${goalId}`}</h2>
      <img src={`/images/lab/goals/_staging/${goalId}.webp`} alt={goalId} />
      <div class="rev__actions">
        <button disabled={busy !== '' || !GOALS.has(goalId)} onclick={() => act('approve', goalId)}>
          Approve
        </button>
        <button disabled={busy !== ''} onclick={() => act('reject', goalId)}>Reject</button>
      </div>
    </section>
  {:else}
    <p>No pending candidates.</p>
  {/each}
</main>

<style>
  .rev {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1rem;
    display: grid;
    gap: 1.5rem;
  }
  .rev__hint {
    opacity: 0.7;
  }
  .rev__item {
    display: grid;
    gap: 0.5rem;
  }
  .rev__item img {
    width: 100%;
    border-radius: 8px;
  }
  .rev__actions {
    display: flex;
    gap: 0.75rem;
  }
  .rev__actions button {
    padding: 0.5rem 1.25rem;
  }
</style>
