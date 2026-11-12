<!--
  The one chip (UXD-014). kind decides the element and the ARIA wiring; the look is
  src/lib/styles/chip.css. There is no size prop: a second size is how 17 recipes happened.

  toggle  <button aria-pressed>      layers, group-by, on/off HUD buttons
  choice  <button role=radio>        one of a set; the parent is <ChipGroup role="radiogroup">
  action  <button>                   Reset view, Clear filters, Show all
  link    <a href>                   Watch live, launches from here
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    kind?: 'toggle' | 'choice' | 'action' | 'link';
    active?: boolean;
    disabled?: boolean;
    count?: number | string;
    /** Data colour: the leading dot and, when on, the edge. */
    tone?: string;
    dot?: boolean;
    quiet?: boolean;
    dismiss?: boolean;
    href?: string;
    icon?: Snippet;
    children?: Snippet;
    class?: string;
    [key: string]: unknown;
  }

  let {
    kind = 'action',
    active = false,
    disabled = false,
    count,
    tone,
    dot = false,
    quiet = false,
    dismiss = false,
    href,
    icon,
    children,
    class: extra = '',
    style = '',
    ...rest
  }: Props = $props();

  const classes = $derived(['ui-chip', quiet && 'ui-chip--quiet', extra].filter(Boolean).join(' '));
  const styled = $derived([tone ? `--chip-tone: ${tone}` : '', style].filter(Boolean).join(';'));
</script>

{#snippet inner()}
  {#if dot}<span class="ui-chip__dot" aria-hidden="true"></span>{/if}
  {#if icon}<span class="ui-chip__icon" aria-hidden="true">{@render icon()}</span>{/if}
  {#if children}{@render children()}{/if}
  {#if count !== undefined && count !== ''}<span class="ui-chip__count">{count}</span>{/if}
  {#if dismiss}<span class="ui-chip__x" aria-hidden="true">×</span>{/if}
{/snippet}

{#if kind === 'link'}
  <a {...rest} {href} class={classes} style={styled || undefined}>{@render inner()}</a>
{:else if kind === 'choice'}
  <button
    type="button"
    {...rest}
    class={classes}
    style={styled || undefined}
    role="radio"
    aria-checked={active}
    tabindex={active ? 0 : -1}
    {disabled}
  >
    {@render inner()}
  </button>
{:else}
  <button
    type="button"
    {...rest}
    class={classes}
    style={styled || undefined}
    aria-pressed={kind === 'toggle' ? active : undefined}
    aria-disabled={disabled || undefined}
    {disabled}
  >
    {@render inner()}
  </button>
{/if}
