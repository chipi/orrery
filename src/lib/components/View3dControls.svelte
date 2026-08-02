<!--
  Reset-camera + spin-toggle controls for the 3D surface view (#42).

  Two buttons that go together in the control row when view === '3d'.
  /moon and /mars rendered the same markup with per-route reset
  function names (resetMoonCamera vs resetMarsCamera) and per-route
  autoSpin state.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  interface Props {
    onReset: () => void;
    autoSpin: boolean;
    onToggleSpin: () => void;
  }
  let { onReset, autoSpin, onToggleSpin }: Props = $props();
</script>

<button type="button" class="toggle" data-testid="reset-camera" onclick={onReset}>
  {m.ui_reset_view()}
</button>
<button
  type="button"
  class="toggle"
  data-testid="spin-toggle"
  aria-pressed={!autoSpin}
  title={m.iss_btn_spin_title()}
  onclick={onToggleSpin}
>
  {m.iss_btn_spin()}
</button>
