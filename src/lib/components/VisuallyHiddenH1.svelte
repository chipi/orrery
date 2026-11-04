<script lang="ts">
  /**
   * The page's <h1> for app routes whose visible chrome is a 3D scene or a tool (/explore,
   * /fly, /plan, /missions, /fleet): screen readers and the heading outline need one, the
   * layout does not show one. Pass the page's <title> message; the "· Orrery" suffix is
   * dropped.
   */
  let { title }: { title: string } = $props();
  const text = $derived(title.replace(/\s*[·|—–-]\s*Orrery\s*$/u, ''));
</script>

<h1 class="sr-only">{text}</h1>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
