/**
 * The collectible card on demand. card-spec's resolvers, CollectibleCard and the
 * card messages are ~13 KB br and only show when a visitor opens a card; a panel
 * that imported them statically put them on /missions and /fleet's first load
 * (/missions measured 133 / 130 KB with prod's debug ids, 0.9.7). Panels call
 * this when they open (the chunk is fetched then, before any click) and derive
 * the card spec from the loaded module.
 */
import type { Component } from 'svelte';

export interface CardModules {
  spec: typeof import('./card-spec');
  CardOverlay: Component<{
    spec: import('./card-spec').CardSpec;
    open: boolean;
    onClose: () => void;
  }>;
}

let pending: Promise<CardModules> | null = null;

export function loadCardModules(): Promise<CardModules> {
  pending ??= Promise.all([import('./card-spec'), import('./CardOverlay.svelte')]).then(
    ([spec, overlay]) => ({ spec, CardOverlay: overlay.default as CardModules['CardOverlay'] }),
  );
  // A failed fetch (offline) is retried on the next panel open, not cached.
  pending.catch(() => (pending = null));
  return pending;
}
