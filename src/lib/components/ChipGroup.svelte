<!--
  A row of chips. role="radiogroup" adds the radio-group arrow keys (Left/Right/Up/Down move and
  select, Home/End jump) for <Chip kind="choice">; role="group" is a plain labelled wrapper for
  toggles. A radiogroup with no chip on (a URL value not in the list, an unavailable choice)
  gives its first enabled chip the Tab stop, so the group is never skipped by Tab.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ARROW_SELECT_ATTR, nextChoiceIndex } from './chip-nav';

  interface Props {
    role?: 'group' | 'radiogroup';
    label: string;
    children: Snippet;
    class?: string;
    [key: string]: unknown;
  }
  let { role = 'group', label, children, class: extra = '', ...rest }: Props = $props();
  let host: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (role !== 'radiogroup' || !host) return;
    const el = host;
    const ensureTabStop = () => {
      const radios = [...el.querySelectorAll<HTMLElement>('[role="radio"]')];
      const forced = radios.find((r) => r.hasAttribute('data-forced-tabstop'));
      const own = radios.some((r) => r !== forced && r.tabIndex === 0);
      if (own) {
        if (forced) {
          forced.removeAttribute('data-forced-tabstop');
          forced.setAttribute('tabindex', '-1');
        }
        return;
      }
      if (forced) return;
      const first = radios.find((r) => !r.matches(':disabled, [aria-disabled="true"]'));
      first?.setAttribute('data-forced-tabstop', '');
      first?.setAttribute('tabindex', '0');
    };
    ensureTabStop();
    const mo = new MutationObserver(ensureTabStop);
    mo.observe(el, {
      subtree: true,
      childList: true,
      attributeFilter: ['tabindex', 'aria-checked'],
    });
    return () => mo.disconnect();
  });

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
    radios[to].setAttribute(ARROW_SELECT_ATTR, '');
    radios[to].click();
    radios[to].removeAttribute(ARROW_SELECT_ATTR);
  }
</script>

<div
  bind:this={host}
  {...rest}
  class={['ui-chip-group', extra].filter(Boolean).join(' ')}
  {role}
  aria-label={label}
  {onkeydown}
>
  {@render children()}
</div>
