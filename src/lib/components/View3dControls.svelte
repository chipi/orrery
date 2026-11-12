<!--
  Reset-camera + spin-toggle controls for the 3D surface view (#42).

  Two buttons that go together in the control row. They are always rendered (so no chip beside
  them shifts) and disabled while the view is not 3D.
  /moon and /mars rendered the same markup with per-route reset
  function names (resetMoonCamera vs resetMarsCamera) and per-route
  autoSpin state.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import Chip from './Chip.svelte';
  import ResetViewButton from './ResetViewButton.svelte';

  interface Props {
    onReset: () => void;
    autoSpin: boolean;
    onToggleSpin: () => void;
    disabled?: boolean;
  }
  let { onReset, autoSpin, onToggleSpin, disabled = false }: Props = $props();
</script>

<ResetViewButton data-testid="reset-camera" onclick={onReset} {disabled} />
<Chip
  kind="toggle"
  active={!autoSpin}
  data-testid="spin-toggle"
  title={m.iss_btn_spin_title()}
  onclick={onToggleSpin}
  {disabled}
>
  {m.iss_btn_spin()}
</Chip>
