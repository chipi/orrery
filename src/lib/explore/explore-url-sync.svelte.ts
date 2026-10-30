import { untrack } from 'svelte';
import { page } from '$app/state';
import { afterNavigate } from '$app/navigation';
import { setCurrentCard, trackCardNavigation } from '$lib/card-chain.svelte';
import { resolveSolarBodyTarget } from '$lib/explore/scale-shell-controller';
import { safeReplaceState } from '$lib/safe-replace-state';

/**
 * Resolver guards: the last value each deep-link resolver handled. Plain (not
 * reactive) on purpose — the URL mirrors write them so their own writes don't
 * re-fire the resolvers, and the scene host sets them on a cold load (bridge).
 */
export interface ExploreUrlGuards {
  lastGoto: string | null;
  lastSystem: string | null;
  lastDeepSky: string | null;
  lastGalaxy: string | null;
  lastBh: string | null;
  lastContextJump: string | null;
}

export function createUrlGuards(): ExploreUrlGuards {
  return {
    lastGoto: null,
    lastSystem: null,
    lastDeepSky: null,
    lastGalaxy: null,
    lastBh: null,
    lastContextJump: null,
  };
}

/**
 * What the URL sync reads from and calls on the page. Every member is read
 * inside an effect (so $state behind a getter is tracked) or at call time (so
 * the page's non-reactive fn pointers are read when used, as before).
 */
export interface ExploreUrlSyncDeps {
  guards: ExploreUrlGuards;
  /** Read for its dependency only: the ?id= resolver re-runs when it fills. */
  planetById(): ReadonlyMap<string, unknown>;
  smallBodyById(): ReadonlyMap<string, unknown>;
  selectSun(): void;
  selectPlanet(id: string): void;
  selectSmallBody(id: string): void;
  selectBelt(id: string): void;
  selectSatellite(parentPlanetId: string, satelliteId: string): void;
  /** The body whose panel is open, as its ?id= value. */
  openBodyUrlId(): string | null;
  openStarUrlId(): string | null;
  bodySystemUrl(): { host: string | null; planet: string | null };
  deepSkyUrlDesignation(): string | null;
  galaxyUrlId(): string | null;
  bhUrlId(): string | null;
  gotoStar(): ((id: string) => void) | null;
  enterSystem(): ((hostId: string, planetId?: string) => void) | null;
  deepSkyDeepLink(): ((designation: string) => void) | null;
  mwDeepLink(): ((id: string) => void) | null;
  bhDeepLink(): ((id: string) => void) | null;
  contextDeepLink(): ((ctx: string) => Promise<void>) | null;
  showPaths(): void;
}

/** Registers the /explore deep-link resolvers and URL mirrors. Call during component init. */
export function setupExploreUrlSync(d: ExploreUrlSyncDeps): void {
  const guards = d.guards;

  // ?id=<planetId|sun|smallBodyId> deep-link → opens the matching panel
  // directly, mirroring the /mars?site= and /fly?mission= patterns.
  // Bookmarkable + share-friendly; also lets e2e tests open a planet
  // panel without depending on canvas-pixel pick math (which is fragile
  // under mobile-chromium DPR + animation timing).
  $effect(() => {
    // Force re-run when planetById / smallBodyById populate async —
    // both are $derived from localizedPlanets / SMALL_BODIES which
    // load after mount. Without these explicit reads, the effect's
    // dep tree is shaped only by the FIRST branch the if-ladder took,
    // and mars (which lives in planetById only) wouldn't re-trigger
    // when planetById updates from empty Map → 9 entries.
    const planetById = d.planetById();
    const smallBodyById = d.smallBodyById();
    const id = page.url.searchParams.get('id');
    // The ?id= routing ladder — incl. the Pluto-in-two-catalogues nuance (it lives in
    // both planets.json + small-bodies.json; the small-body surface's curated
    // science_sections win for deep-link landings) — lives in scale-shell-controller,
    // pure + unit-tested (RFC-036 WS-C/C1). Unknown id → null → no-op, never crash.
    const target = resolveSolarBodyTarget(id, {
      isPlanet: (x) => planetById.has(x),
      isSmallBody: (x) => smallBodyById.has(x),
    });
    if (!target) return;
    switch (target.kind) {
      case 'sun':
        d.selectSun();
        break;
      case 'planet':
        d.selectPlanet(target.id);
        break;
      case 'smallBody':
        d.selectSmallBody(target.id);
        break;
      case 'belt':
        d.selectBelt(target.belt);
        break;
      case 'satellite':
        d.selectSatellite(target.parentId, target.satelliteId);
        break;
    }
  });

  // #29 back-chain — mirror the open body panel into ?id= so mission
  // cross-links can chain back here (the resolver above reopens it on
  // back-nav). Shallow replaceState keeps canvas picks a fresh grid-style
  // selection (no history entry / no chain step); only real navigations to
  // other cards get chained by trackCardNavigation.
  let everOpenedBody = false;
  $effect(() => {
    const id = d.openBodyUrlId();
    if (id) everOpenedBody = true;
    untrack(() => {
      const url = new URL(page.url);
      const cur = url.searchParams.get('id') ?? null;
      if (cur !== id && (id || everOpenedBody)) {
        // Never clobber a fresh ?id= deep-link before the resolver opens it —
        // only clear once a body has actually been open (a real user close).
        if (id) url.searchParams.set('id', id);
        else url.searchParams.delete('id');
        safeReplaceState(url, page.state);
      }
      // Record which card is on screen for the back-chain (the shallow
      // replaceState above doesn't reach SvelteKit's nav.from).
      if (everOpenedBody) setCurrentCard(id ? url : null);
    });
  });
  afterNavigate((nav) => {
    if (nav.to?.url) trackCardNavigation(nav.to.url, nav.type);
  });

  // v2 ?goto=<starId> — deep-link into the neighborhood + select + frame a named
  // star. Resolves each distinct value once (the URL-sync below re-writes the same
  // value, which must not re-fire the resolver).
  $effect(() => {
    const g = page.url.searchParams.get('goto');
    // gotoStarFn is set in onMount and isn't reactive, so a cold-load ?goto= is
    // resolved directly in onMount; this handles later in-session URL changes.
    const gotoStarFn = d.gotoStar();
    if (g && g !== guards.lastGoto && gotoStarFn) {
      guards.lastGoto = g;
      gotoStarFn(g);
    }
  });
  // Mirror the open star panel into ?goto= (shallow, no history), like ?id= above.
  let everOpenedStar = false;
  $effect(() => {
    const id = d.openStarUrlId();
    if (id) everOpenedStar = true;
    untrack(() => {
      const url = new URL(page.url);
      const cur = url.searchParams.get('goto') ?? null;
      if (cur !== id && (id || everOpenedStar)) {
        if (id) url.searchParams.set('goto', id);
        else url.searchParams.delete('goto');
        guards.lastGoto = id; // keep the resolver from re-firing on our own write
        safeReplaceState(url, page.state);
      }
    });
  });

  // v2 Slice 2 — ?system=<hostId>[&planet=<planetId>] deep-links into a BodyScene.
  $effect(() => {
    const s = page.url.searchParams.get('system');
    const pl = page.url.searchParams.get('planet');
    if (s && s !== guards.lastSystem && d.enterSystem()) {
      guards.lastSystem = s;
      untrack(() => d.enterSystem()?.(s, pl ?? undefined));
    }
  });
  // Mirror the active BodyScene + selected planet into ?system / ?planet (shallow).
  let everEnteredSystem = false;
  $effect(() => {
    const { host, planet } = d.bodySystemUrl();
    if (host) everEnteredSystem = true;
    untrack(() => {
      const url = new URL(page.url);
      const curSys = url.searchParams.get('system') ?? null;
      const curPl = url.searchParams.get('planet') ?? null;
      if (curSys !== host || curPl !== planet) {
        if (host) url.searchParams.set('system', host);
        else url.searchParams.delete('system');
        if (host && planet) url.searchParams.set('planet', planet);
        else url.searchParams.delete('planet');
        guards.lastSystem = host; // don't re-fire the resolver on our own write
        if (host || everEnteredSystem) safeReplaceState(url, page.state);
      }
    });
  });

  // v2 Slice 4 — ?deepsky=<designation> deep-links into the immersive view.
  $effect(() => {
    const ds = page.url.searchParams.get('deepsky');
    if (ds && ds !== guards.lastDeepSky && d.deepSkyDeepLink()) {
      guards.lastDeepSky = ds;
      untrack(() => d.deepSkyDeepLink()?.(ds));
    }
  });
  // Mirror the active deep-sky immersion into ?deepsky (shallow, no history).
  let everImmersedDeepSky = false;
  $effect(() => {
    const ds = d.deepSkyUrlDesignation();
    if (ds) everImmersedDeepSky = true;
    untrack(() => {
      const url = new URL(page.url);
      const cur = url.searchParams.get('deepsky') ?? null;
      if (cur !== ds && (ds || everImmersedDeepSky)) {
        if (ds) url.searchParams.set('deepsky', ds);
        else url.searchParams.delete('deepsky');
        // Only advance the resolver guard on entry; never reset it to null on
        // clear, or a transient URL write (e.g. the gateway's ?system write
        // racing our ?deepsky removal) would re-fire the resolver + re-immerse.
        if (ds) guards.lastDeepSky = ds;
        safeReplaceState(url, page.state);
      }
    });
  });

  // v2 Slice 5 — ?galaxy=<pinId> deep-links into the Milky Way + selects a pin.
  $effect(() => {
    const g = page.url.searchParams.get('galaxy');
    if (g && g !== guards.lastGalaxy && d.mwDeepLink()) {
      guards.lastGalaxy = g;
      untrack(() => d.mwDeepLink()?.(g));
    }
  });
  // Mirror the selected Milky Way pin into ?galaxy (shallow, no history).
  let everEnteredGalaxy = false;
  $effect(() => {
    const g = d.galaxyUrlId();
    if (g) everEnteredGalaxy = true;
    untrack(() => {
      const url = new URL(page.url);
      const cur = url.searchParams.get('galaxy') ?? null;
      if (cur !== g && (g || everEnteredGalaxy)) {
        if (g) url.searchParams.set('galaxy', g);
        else url.searchParams.delete('galaxy');
        if (g) guards.lastGalaxy = g; // don't re-fire the resolver on our own write
        safeReplaceState(url, page.state);
      }
    });
  });

  // v2 Slice 6 — ?bh=<id> deep-links into a black hole's lensing render.
  $effect(() => {
    const v = page.url.searchParams.get('bh');
    if (v && v !== guards.lastBh && d.bhDeepLink()) {
      guards.lastBh = v;
      untrack(() => d.bhDeepLink()?.(v));
    }
  });
  // Mirror the active black hole into ?bh (shallow, no history).
  let everEnteredBh = false;
  $effect(() => {
    const v = d.bhUrlId();
    if (v) everEnteredBh = true;
    untrack(() => {
      const url = new URL(page.url);
      const cur = url.searchParams.get('bh') ?? null;
      if (cur !== v && (v || everEnteredBh)) {
        if (v) url.searchParams.set('bh', v);
        else url.searchParams.delete('bh');
        if (v) guards.lastBh = v;
        safeReplaceState(url, page.state);
      }
    });
  });

  // Nav shortcut — ?context=<solar-system|neighborhood|milky-way|local-group>
  // jumps straight to that scale-shell, then clears the param (pure trigger, no
  // staleness once you zoom onward).
  $effect(() => {
    const c = page.url.searchParams.get('context');
    if (c && c !== guards.lastContextJump && d.contextDeepLink()) {
      guards.lastContextJump = c;
      untrack(() => {
        void d
          .contextDeepLink()?.(c)
          .then(() => {
            const url = new URL(page.url);
            if (url.searchParams.get('context') === c) {
              url.searchParams.delete('context');
              safeReplaceState(url, page.state);
            }
          });
      });
    }
  });

  // #306 deep-link from MissionPanel "See path on /explore" — `?paths=1`
  // auto-activates the PATHS layer so users land with the iconic
  // trajectories already visible. `?focus=saturn` additionally selects
  // Saturn so the Cassini orbital tour is in view at panel zoom.
  $effect(() => {
    const paths = page.url.searchParams.get('paths');
    const focus = page.url.searchParams.get('focus');
    if (paths === '1') d.showPaths();
    if (focus && d.planetById().has(focus)) d.selectPlanet(focus);
  });
}
