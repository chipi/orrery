<!--
  Panel tab-button row for /earth /mars /moon detail panels (#57 piece 7/N).

  Pre-extraction each route inlined a ~30-line tabs block: 3-4 buttons
  each with class:active + onclick + aria-selected + aria-controls
  toggle. The component owns the markup so adding a new tab anywhere
  becomes a one-line addition to the `tabs` prop instead of three
  parallel edits.

  Tab-content rendering stays in the caller — only the button row +
  active-state binding is shared.

  Usage:
    <script>
      type PanelTab = 'overview' | 'gallery' | 'learn';
      let panelTab: PanelTab = $state('overview');
    </script>

    <PanelTabRow
      tabs={[
        { id: 'overview', label: m.panel_tab_overview() },
        { id: 'gallery', label: m.panel_tab_gallery(), visible: panelGallery.length > 0 },
        { id: 'learn', label: m.panel_tab_learn(), visible: panelHasLinks },
      ]}
      bind:active={panelTab}
    />
-->
<script lang="ts">
  interface TabDef {
    id: string;
    label: string;
    /** Optional gate — when false, tab button is not rendered. Default true. */
    visible?: boolean;
    /** Optional test id for Playwright (e.g. 'panel-tab-story'). */
    testid?: string;
  }
  interface Props {
    tabs: TabDef[];
    /** Active tab id. Bindable. Type-erased to string here so the component
     *  works across /earth (3 tabs) / /mars + /moon (4 tabs) without
     *  Svelte 5 generics — callers narrow the type on their own side. */
    active: string;
    /** Optional CSS class on the wrapper. Default 'tabs'. */
    rowClass?: string;
    /** Optional CSS class on each button (e.g. 'tab-btn' on /mars). */
    buttonClass?: string;
  }
  let { tabs, active = $bindable(), rowClass = 'tabs', buttonClass = '' }: Props = $props();
</script>

<div class={rowClass} role="tablist">
  {#each tabs as tab (tab.id)}
    {#if tab.visible !== false}
      <button
        type="button"
        class={buttonClass}
        class:active={active === tab.id}
        onclick={() => (active = tab.id)}
        role="tab"
        aria-selected={active === tab.id}
        data-testid={tab.testid}
      >
        {tab.label}
      </button>
    {/if}
  {/each}
</div>
