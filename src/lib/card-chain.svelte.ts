/**
 * Detail-card navigation chain (#29 + extension #30).
 *
 * Tracks the stack of detail cards you've opened by following in-card links,
 * so a "back" affordance returns to the exact previous card. A card is any URL
 * that opens a modal detail view via ?id= (missions / fleet / explore bodies),
 * ?site= (surface sites), or ?object= (surface satellites).
 *
 * Two kinds of card transitions feed the chain:
 *   - Real navigations (missions <-> fleet <-> explore <-> surfaces) via each
 *     host page's afterNavigate -> trackCardNavigation().
 *   - Overlay opens whose URL only changes via shallow replaceState (explore
 *     bodies, surface sites): those DON'T fire afterNavigate, and their URL
 *     doesn't reach SvelteKit's nav.from — so the host calls setCurrentCard()
 *     directly to record which card is on screen.
 *
 * The chain pushes the PREVIOUS on-screen card (tracked in `current`) rather
 * than nav.from, which keeps it correct for both kinds. Picking a body / site
 * off the map is a fresh selection (setCurrentCard, no push); only following a
 * link to a DIFFERENT card chains.
 */
import { goto } from '$app/navigation';

export const cardChain = $state<{ stack: string[] }>({ stack: [] });

// The card URL currently on screen (null = not on a card).
let current: string | null = null;
// Set just before a programmatic back-navigation so the destination's
// afterNavigate doesn't re-push the card we're leaving.
let suppressPush = false;

const CARD_PARAMS = ['id', 'site', 'object'] as const;

export function isCardUrl(url: URL): boolean {
  return CARD_PARAMS.some((p) => url.searchParams.has(p));
}

function isCardHref(href: string): boolean {
  try {
    return isCardUrl(new URL(href));
  } catch {
    return false;
  }
}

/**
 * Record the card currently on screen. Called by overlay hosts (explore
 * bodies, surface sites) whose card URL changes shallowly via replaceState.
 * Does NOT push — a canvas pick is a fresh selection, not a chain step.
 */
export function setCurrentCard(url: URL | null): void {
  current = url ? url.href : null;
}

/**
 * Feed a real navigation. Pushes the previous on-screen card when moving to a
 * DIFFERENT card. Call from a host page's afterNavigate.
 */
export function trackCardNavigation(to: URL, type: string): void {
  const toHref = to.href;
  const toIsCard = isCardUrl(to);
  if (suppressPush) {
    suppressPush = false;
    current = toIsCard ? toHref : null;
    return;
  }
  if (type === 'popstate') {
    // Browser back/forward — truncate the stack to the target if present.
    const idx = cardChain.stack.lastIndexOf(toHref);
    if (idx >= 0) cardChain.stack = cardChain.stack.slice(0, idx);
    current = toIsCard ? toHref : null;
    return;
  }
  if (toIsCard) {
    if (current && isCardHref(current) && current !== toHref) {
      // Card -> different card via a link: remember where we came from.
      cardChain.stack = [...cardChain.stack, current];
    } else if (!current || !isCardHref(current)) {
      // Fresh card open from a grid / page: start a new chain.
      cardChain.stack = [];
    }
    current = toHref;
  } else {
    // Left the card flow entirely — reset.
    cardChain.stack = [];
    current = null;
  }
}

/** Pop the chain and navigate to the previous card. */
export function goBackCard(): void {
  if (cardChain.stack.length === 0) return;
  const prev = cardChain.stack[cardChain.stack.length - 1];
  cardChain.stack = cardChain.stack.slice(0, -1);
  suppressPush = true;
  void goto(prev);
}
