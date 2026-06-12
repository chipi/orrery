/**
 * Svelte context for page-specific debug content. The DebugPanel
 * lives in the root layout so it's available on every route, but
 * each page can OPTIONALLY register its own page-specific debug
 * surface (e.g. /fly's FlybyDebugViewer) via this context.
 *
 * Pattern:
 *
 *   // Root layout
 *   <DebugPanel />
 *
 *   // Page wants to inject content
 *   <script>
 *     import { setPageDebugContent } from '$lib/components/debug-panel-context';
 *     // ...
 *     setPageDebugContent({ label: 'FLY', content: pageDebugSnippet });
 *   </script>
 *
 *   {#snippet pageDebugSnippet()}
 *     <FlybyDebugViewer ... />
 *   {/snippet}
 *
 * If no page registers content, the DebugPanel hides its "Page" tab
 * and shows only the generic Perf / i18n / Route tabs.
 */

import { getContext, setContext } from 'svelte';
import type { Snippet } from 'svelte';

const DEBUG_PANEL_KEY = Symbol('debug-panel-page-content');

export interface PageDebugRegistration {
  label: string;
  content: Snippet | null;
}

interface DebugPanelContext {
  registration: PageDebugRegistration;
}

export function createDebugPanelContext(initial: PageDebugRegistration): DebugPanelContext {
  // Use $state inside a wrapper so any component can read + mutate
  // the registration reactively. The actual $state is created in
  // the layout and passed down via context.
  const ctx: DebugPanelContext = {
    registration: initial,
  };
  setContext(DEBUG_PANEL_KEY, ctx);
  return ctx;
}

export function getDebugPanelContext(): DebugPanelContext | null {
  return getContext<DebugPanelContext | null>(DEBUG_PANEL_KEY) ?? null;
}

export function setPageDebugContent(reg: PageDebugRegistration): void {
  const ctx = getDebugPanelContext();
  if (!ctx) return;
  ctx.registration.label = reg.label;
  ctx.registration.content = reg.content;
}
