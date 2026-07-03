/**
 * Detail-card navigation chain (#29).
 *
 * Tracks the stack of detail cards you've opened by following in-card links,
 * so a "back" affordance can return to the exact previous card. A card is any
 * URL that opens a modal detail view via `?id=` (missions, fleet). The stack is
 * fed by each card-host page's afterNavigate (see /missions, /fleet) and read
 * by the shared Panel.svelte, which shows the back button only while the chain
 * is non-empty AND the current view is itself a card.
 *
 * Deliberately scoped to ?id= cards: opening a mission from a grid, a page, or
 * a non-URL overlay (planet / site panel) starts a fresh chain, matching the
 * user rule "no back when I click from a grid or page, only card → card".
 */
import { goto } from '$app/navigation';

export const cardChain = $state<{ stack: string[] }>({ stack: [] });

// Set just before a programmatic back-navigation so the destination page's
// afterNavigate doesn't re-push the card we're leaving.
let suppressPush = false;

function isCardUrl(url: URL): boolean {
  return url.searchParams.has('id');
}

/**
 * Feed one navigation into the chain. Call from a card-host page's
 * afterNavigate with the SvelteKit navigation's from/to URLs + type.
 */
export function trackCardNavigation(from: URL | null, to: URL, type: string): void {
  if (suppressPush) {
    suppressPush = false;
    return;
  }
  if (!isCardUrl(to)) {
    // Left the card flow entirely — reset.
    cardChain.stack = [];
    return;
  }
  if (type === 'popstate') {
    // Browser back/forward — keep the stack in sync by truncating to the
    // target when it's already somewhere in the chain.
    const idx = cardChain.stack.lastIndexOf(to.href);
    if (idx >= 0) cardChain.stack = cardChain.stack.slice(0, idx);
    return;
  }
  if (from && isCardUrl(from) && from.href !== to.href) {
    // Card → card via a link: remember the card we came from.
    cardChain.stack = [...cardChain.stack, from.href];
  } else if (!from || !isCardUrl(from)) {
    // Fresh card open from a grid / page: start a new chain.
    cardChain.stack = [];
  }
}

/** True when there's a previous card to return to. */
export function canGoBackCard(): boolean {
  return cardChain.stack.length > 0;
}

/** Pop the chain and navigate to the previous card. */
export function goBackCard(): void {
  if (cardChain.stack.length === 0) return;
  const prev = cardChain.stack[cardChain.stack.length - 1];
  cardChain.stack = cardChain.stack.slice(0, -1);
  suppressPush = true;
  void goto(prev);
}
