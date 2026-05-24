<!--
  Hero image at the top of /moon + /mars site-detail panels (#42).

  Click anywhere on the image opens the full-screen lightbox showing
  the first gallery entry. Image carries `fetchpriority="high"` +
  `decoding="async"` so it lands above the fold on slow connections
  without blocking the main thread.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  interface Props {
    src: string;
    name: string;
    onOpen: () => void;
  }
  let { src, name, onOpen }: Props = $props();
</script>

<div class="panel-hero">
  <button
    type="button"
    class="panel-hero-btn"
    onclick={onOpen}
    aria-label={m.panel_hero_aria({ name })}
  >
    <img {src} alt="" fetchpriority="high" decoding="async" />
  </button>
</div>
