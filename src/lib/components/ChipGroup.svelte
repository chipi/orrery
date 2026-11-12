<!--
  A row of chips. role="radiogroup" adds the radio-group arrow keys (Left/Right/Up/Down move and
  select, Home/End jump) for <Chip kind="choice">; role="group" is a plain labelled wrapper for
  toggles. Exactly one choice chip must be active so the group has a Tab stop.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { nextChoiceIndex } from './chip-nav';

  interface Props {
    role?: 'group' | 'radiogroup';
    label: string;
    children: Snippet;
    class?: string;
    [key: string]: unknown;
  }
  let { role = 'group', label, children, class: extra = '', ...rest }: Props = $props();

  function onkeydown(e: KeyboardEvent) {
    if (role !== 'radiogroup') return;
    const host = e.currentTarget as HTMLElement;
    const radios = [...host.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)')];
    const index = radios.indexOf(e.target as HTMLElement);
    const rtl = getComputedStyle(host).direction === 'rtl';
    const to = nextChoiceIndex(e.key, index, radios.length, rtl);
    if (to === null) return;
    e.preventDefault();
    e.stopPropagation();
    radios[to].focus();
    radios[to].click();
  }
</script>

<div
  {...rest}
  class={['ui-chip-group', extra].filter(Boolean).join(' ')}
  {role}
  aria-label={label}
  {onkeydown}
>
  {@render children()}
</div>
