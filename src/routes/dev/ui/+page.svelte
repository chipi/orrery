<!--
  Dev-only UI style guide — renders the whole original icon set from
  $lib/components/icons (ICON_SHOWCASE), every variant, so the supervising
  architect can scan + sign off the glyphs as a set. The same registry
  powers the /colophon "interface graphics" grid, so this is the living
  reference for what ships there.
-->
<script lang="ts">
  import { ICON_SHOWCASE } from '$lib/components/icons';
</script>

<svelte:head><title>UI style guide · Orrery dev</title></svelte:head>

<main class="guide">
  <header>
    <h1>Interface graphics — icon set</h1>
    <p>
      All {ICON_SHOWCASE.length} original inline-SVG glyphs, drawn with <code>currentColor</code>
      from
      <code>$lib/components/icons</code>. Each tile shows every meaningful state/variant. This is
      the single source of truth the live UI + /colophon both consume.
    </p>
  </header>

  <div class="grid">
    {#each ICON_SHOWCASE as icon (icon.id)}
      <figure class="card">
        <div class="swatch">
          {#each icon.variants ?? [{ props: {} }] as v (v.label ?? 'only')}
            <span class="variant">
              <icon.component {...v.props} />
              {#if v.label}<span class="vlabel">{v.label}</span>{/if}
            </span>
          {/each}
        </div>
        <figcaption>
          <span class="name">{icon.label}</span>
          <span class="what">{icon.what}</span>
          <span class="where mono">{icon.where} · {icon.id}</span>
        </figcaption>
      </figure>
    {/each}
  </div>
</main>

<style>
  :global(body) {
    background: #03050b;
  }
  .guide {
    padding: 32px 22px 60px;
    color: rgba(255, 255, 255, 0.92);
    min-height: 100vh;
  }
  header {
    max-width: 920px;
    margin: 0 auto 28px;
  }
  h1 {
    font-family: 'Space Mono', monospace;
    font-size: 22px;
    letter-spacing: 4px;
    text-transform: uppercase;
    margin: 0 0 8px;
  }
  header p {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.68);
    margin: 0;
  }
  header code {
    color: #5eead4;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    max-width: 1300px;
    margin: 0 auto;
  }
  .card {
    margin: 0;
    background: rgba(12, 16, 28, 0.6);
    border: 1px solid rgba(94, 234, 212, 0.18);
    border-radius: 6px;
    overflow: hidden;
  }
  .swatch {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 18px;
    padding: 24px 18px;
    min-height: 96px;
    color: #cfe9e4;
    background: radial-gradient(circle at 50% 38%, rgba(94, 234, 212, 0.08), transparent 70%);
  }
  .variant {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .vlabel {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
  }
  figcaption {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 11px 14px 13px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(12, 16, 28, 0.95);
  }
  .name {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 1.5px;
    color: #fff;
    text-transform: uppercase;
  }
  .what {
    font-size: 11.5px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.62);
  }
  .where {
    font-size: 9.5px;
    letter-spacing: 1px;
    color: rgba(255, 200, 80, 0.7);
  }
  .mono {
    font-family: 'Space Mono', monospace;
  }
</style>
