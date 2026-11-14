<!--
  The "Show all N" chip under a list that `previewList` (`$lib/preview-list`) capped at its
  first PREVIEW rows. Draws nothing while the list fits or once expanded. The page keeps the
  `expanded` flag and flips it in `onexpand`; the headers above stay open, so a #anchor jump
  lands on the header with the first rows below it and expanding grows the list downwards.

  `narrow`: the cap applies only below 768 px. Put `class="preview-narrow"` (and `is-open`
  once expanded) on the list itself; its rows past the tenth are then hidden by CSS on a
  phone and drawn whole on a wide screen (the credits contents list: two columns from 768 px).
-->
<script lang="ts">
  import Chip from './Chip.svelte';
  import * as m from '$lib/paraglide/messages';
  import { isCapped } from '$lib/preview-list';

  interface Props {
    count: number;
    expanded?: boolean;
    onexpand: () => void;
    narrow?: boolean;
    /** Names the list for tests and analytics-free hooks: `data-list`. */
    list?: string;
  }

  let { count, expanded = false, onexpand, narrow = false, list }: Props = $props();
</script>

{#if isCapped(count, expanded)}
  <div class="show-all-row" class:narrow>
    <Chip kind="action" data-testid="show-all" data-list={list} onclick={onexpand}>
      {m.colophon_show_all({ count })}
    </Chip>
  </div>
{/if}

<style>
  .show-all-row {
    margin-top: 14px;
  }
  @media (min-width: 768px) {
    .show-all-row.narrow {
      display: none;
    }
  }
  /* The cap is PREVIEW (10) rows: keep the 11 in step with it. */
  @media (max-width: 767px) {
    :global(.preview-narrow:not(.is-open) > :nth-child(n + 11)) {
      display: none;
    }
  }
</style>
