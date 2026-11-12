<!--
  3D ↔ 2D view toggle button (#42).

  Single button that flips view mode. /moon and /mars use slightly
  different i18n keys for the label, so the resolved label string is
  passed in via prop.
-->
<script lang="ts">
  import Chip from './Chip.svelte';

  interface Props {
    is2d: boolean;
    label: string;
    onToggle: () => void;
  }
  let { is2d, label, onToggle }: Props = $props();
</script>

<Chip kind="toggle" active={is2d} onclick={onToggle} data-testid="mode-toggle">
  {label}
</Chip>
