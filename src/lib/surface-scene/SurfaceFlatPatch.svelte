<script lang="ts">
  /**
   * Flat ground-patch view for /moon and /mars (ADR-062, #283 Slice 4).
   *
   * Materialises when the user zooms past the sphere → flat-patch
   * threshold with a region selected. Renders rectangular regional +
   * detail imagery at TRUE ground extent (vs the stylized sphere
   * patches of Slice 3a), traverse polyline, scale-aware markers,
   * scale bar + lat/lon HUD, "Back to planet" affordance.
   *
   * Owned by SurfaceScene: SurfaceScene tracks `flatPatchActive` and
   * passes the selected site + traverses down. When inactive, this
   * component renders nothing (the parent .surface-flat-patch wrapper
   * is conditionally rendered via {#if flatPatchActive}).
   *
   * 2D canvas, not Three.js — scale bars + graticules + small dots
   * are way cheaper as Canvas 2D primitives than as scene objects,
   * and we lose nothing visually (the flat view is inherently 2D).
   */
  import { onMount } from 'svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { createAnimateLoop } from '$lib/three/animate-loop';
  import * as m from '$lib/paraglide/messages';
  import { colorFor } from '$lib/surface-map/nation-palette';
  import type { SurfaceSite, Traverse } from '$types/surface-site';
  import type { SurfaceSceneConfig } from '$lib/surface-scene/types';
  import { statusTone } from '$lib/surface-scene/status-tone';
  import { getLocale } from '$lib/paraglide/runtime';
  import { formatNumber } from '$lib/format';
  import { imageStats, tintFromMean, tintedCopy } from '$lib/surface-scene/globe-tint';
  import type { LocaleCode } from '$lib/locale';
  import {
    routeMidpoint,
    solRampColor,
    solTickIndices,
    solTickSpacing,
  } from '$lib/surface-scene/surface-traverses';
  import { detailGroundKm } from '$lib/surface-scene/flat-patch-extent';
  import AnnotationRings from '$lib/surface-scene/AnnotationRings.svelte';
  import {
    groundOffsetToScreen,
    ringDiameter,
    type PlacedRing,
  } from '$lib/surface-scene/annotation-rings';
  import { loadImageVisionManifest, getImageEntry, hotspotTileTexture } from '$lib/image-vision';
  import { streamedUrl } from '$lib/asset-url';

  interface Props {
    selected: SurfaceSite;
    config: SurfaceSceneConfig;
    traverses?: Record<string, Traverse>;
    /** km/px at the moment the sphere handed off to the flat-patch.
     *  Used as the initial kmPerPx so the photo stays at the same
     *  pixel scale across the transition — no jump from "sphere zoom
     *  level X" to "flat-patch zoom level Y". Optional; falls back to
     *  the detail-extent default when absent. */
    entryKmPerPx?: number;
    /** Called when the user dismisses the flat patch (Esc / back
     *  button / wheel-out exit). Receives the current kmPerPx so the
     *  sphere can resume at a camera distance that matches. */
    onClose: (exitKmPerPx?: number) => void;
    /** Globe colour (0–1) at the site: greyscale imagery is tinted to it,
     *  matching the 3D patches (#641, Mars). */
    tint?: [number, number, number];
    /** Full-size view of an annotation's photo (the page's lightbox). */
    onOpenPhoto?: (src: string) => void;
  }
  let { selected, config, traverses, entryKmPerPx, onClose, tint, onOpenPhoto }: Props = $props();
  const tinted = (img: HTMLImageElement): HTMLImageElement | HTMLCanvasElement => {
    if (!tint) return img;
    const st = imageStats(img);
    return (st?.grey && tintedCopy(img, tintFromMean(tint, st.luma))) || img;
  };

  let canvas: HTMLCanvasElement | undefined = $state();
  let viewW = $state(0);
  let viewH = $state(0);

  // Touch-portrait: the bottom tier-context card overlays roughly the lower
  // third of the screen, so centre the imagery in the visible slot above it
  // rather than on the full canvas (otherwise the detail patch hides behind the
  // card + leaves dead space up top). Desktop + touch-landscape (the card is
  // capped/short there) keep true-centre. Reactive so rotation re-centres.
  const flatCenterFrac = $derived(viewport.isTouch && !viewport.isLandscape ? 0.34 : 0.5);

  // ─── Imagery loading ───────────────────────────────────────────────
  // Resolve regional + detail texture URLs from the selected site's
  // hotspot_tier2_source / hotspot_tier2_regional_source paths through
  // the Image Vision manifest (lazy 1:1 variant lookup). Soft-fail to
  // the raw path if the manifest doesn't have an entry yet. Mirrors the
  // pattern SurfaceScene uses for the sphere's Tier-2 patch.
  let regionalImage: HTMLImageElement | HTMLCanvasElement | null = $state(null);
  let detailImage: HTMLImageElement | HTMLCanvasElement | null = $state(null);
  let regionalReady = $state(false);
  let detailReady = $state(false);

  // Kick the manifest load once on mount so subsequent lookups are
  // synchronous. Cheap soft-fail if the manifest 404s.
  onMount(() => {
    void loadImageVisionManifest();
  });

  // Reactive: when `selected` changes, re-resolve and re-load images.
  $effect(() => {
    regionalReady = false;
    detailReady = false;
    regionalImage = null;
    detailImage = null;

    const tier2Source = selected.hotspot_tier2_source;
    if (tier2Source) {
      const url = hotspotTileTexture(tier2Source, getImageEntry(tier2Source));
      const img = new Image();
      img.onload = () => {
        detailImage = tinted(img);
        detailReady = true;
      };
      img.onerror = () => {
        // Soft-fail — keep the translucent-box placeholder visible.
      };
      img.src = streamedUrl(url);
    }

    const regionalSource = selected.hotspot_tier2_regional_source;
    if (regionalSource) {
      const rUrl = hotspotTileTexture(regionalSource, getImageEntry(regionalSource));
      const rImg = new Image();
      rImg.onload = () => {
        regionalImage = tinted(rImg);
        regionalReady = true;
      };
      rImg.onerror = () => {
        // Soft-fail.
      };
      rImg.src = streamedUrl(rUrl);
    }
  });

  // ─── View state (lat/lon centred + zoom km-per-pixel) ──────────────
  // Initial view: centroid of the selected region, sized so the region
  // fills ~60 % of the viewport diagonal. Updates as the user pans/zooms.
  let centroidLat = $state(0);
  let centroidLon = $state(0);
  let kmPerPx = $state(0.1); // 100 m/px default
  /** kmPerPx the patch entered at; remembered so we can exit back to
   *  the sphere automatically once the user wheels out past it. */
  // initialKmPerPx kept as a state slot for the wheel handler /
  // future "fit to view" reset gestures, even though no live consumer
  // reads it after the 2026-06-08 wheel-out simplification.
  let initialKmPerPx = 0.1;
  void initialKmPerPx;
  let autoExitFired = $state(false);

  // Layer toggles — default-on; expose chip row in template.
  let layerRegional = $state(true);
  let layerDetail = $state(true);
  let layerTraverse = $state(true);

  // Drag state
  let dragging = $state(false);
  let lmx = 0;
  let lmy = 0;

  // Compute the deepest-zoom floor for the current site — used both
  // by the wheel handler AND the initialiser, so the state always
  // reflects the latest fix without depending on HMR resetting it.
  function deepestZoomFloor(): number {
    let extentKm = 0;
    if (selected.region_bounds) {
      const rb = selected.region_bounds;
      const dLat = Math.max(1e-6, rb.lat_max - rb.lat_min);
      const dLon = Math.max(1e-6, rb.lon_max - rb.lon_min);
      const cosLat = Math.cos(((rb.lat_min + rb.lat_max) / 2) * (Math.PI / 180));
      const widthKm = dLon * (Math.PI / 180) * config.radiusKm * cosLat;
      const heightKm = dLat * (Math.PI / 180) * config.radiusKm;
      extentKm = Math.max(extentKm, widthKm, heightKm);
    }
    const tr = traverses?.[selected.id];
    if (tr && tr.points.length >= 2) {
      let latMin = Infinity;
      let latMax = -Infinity;
      let lonMin = Infinity;
      let lonMax = -Infinity;
      for (const [la, lo] of tr.points) {
        if (la < latMin) latMin = la;
        if (la > latMax) latMax = la;
        if (lo < lonMin) lonMin = lo;
        if (lo > lonMax) lonMax = lo;
      }
      const dLat = Math.max(1e-6, latMax - latMin);
      const dLon = Math.max(1e-6, lonMax - lonMin);
      const cosLat = Math.cos(((latMin + latMax) / 2) * (Math.PI / 180));
      const widthKm = dLon * (Math.PI / 180) * config.radiusKm * cosLat;
      const heightKm = dLat * (Math.PI / 180) * config.radiusKm;
      extentKm = Math.max(extentKm, widthKm, heightKm);
    }
    if (extentKm === 0) return 0.0001;
    // 2026-06-08: floor was sized against region_bounds (~20 km on
    // Mars) which forced the initial kmPerPx clamp UP and left the
    // detail patch tiny on entry. Now the floor is the source
    // product's NATIVE resolution (or slightly past for a touch of
    // upsample headroom) — i.e. you can wheel-in until one screen
    // pixel = one HiRISE pixel. The "DEEPEST ZOOM" microcopy then
    // only fires when you're actually at the source-image limit.
    const native = config.planet === 'mars' ? 0.00025 : config.planet === 'earth' ? 0.0003 : 0.0005;
    return native * 0.5;
  }

  // ─── Initialisation from selected site ─────────────────────────────
  $effect(() => {
    if (selected.lat == null || selected.lon == null) return;
    // Centre on the site's lat/lon — not region_bounds centroid. The
    // sphere-rendered region_bounds rectangles inherited from
    // moon-sites.json drift up to 30 km from lat/lon for traverse
    // sites (Apollo 17), which would sit the marker off-centre at
    // flat-patch entry. The regional + detail layers both centre on
    // lat/lon directly now, so the view should too.
    centroidLat = selected.lat;
    centroidLon = selected.lon;
    // 2026-06-08: matching the sphere's km/px at handoff was wrong —
    // the sphere intentionally stylizes the patch to ~100× its real
    // ground extent so the photo fills the viewport, and using its
    // km/px in the flat-patch dropped you straight into true-scale
    // postage stamp (the 1.5 km HiRISE patch became 30 px on a 800 px
    // viewport). Now sized so the DETAIL patch fills ~85 % of the
    // shorter viewport dim regardless of how the sphere arrived here.
    // The entryKmPerPx prop is kept for the exit-camR map but
    // intentionally unused here.
    void entryKmPerPx;
    const detailKm = detailGroundKm(selected, config.planet);
    const vp =
      typeof window !== 'undefined'
        ? Math.max(300, Math.min(window.innerWidth, window.innerHeight))
        : 800;
    // Not `initialKmPerPx = kmPerPx`: reading it back made this effect depend on
    // kmPerPx, so every wheel-in reset the view to the entry zoom.
    const entryKm = detailKm / (0.85 * vp);
    kmPerPx = entryKm;
    initialKmPerPx = entryKm;
    autoExitFired = false;
  });

  // Unconditionally clamp kmPerPx to the current floor on every
  // run — protects against HMR-stuck state values from before the
  // floor existed, and against the user landing in flat-patch with
  // a pre-deepened kmPerPx from another route action.
  $effect(() => {
    const floor = deepestZoomFloor();
    if (kmPerPx < floor) kmPerPx = floor;
  });

  // ─── Esc to close ──────────────────────────────────────────────────
  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ─── Coordinate mapping ────────────────────────────────────────────
  // Convert (lat, lon) → canvas (px, py). Uses simple equirectangular
  // around the centroid (good for small regions; <1 % distortion within
  // a few degrees of the centroid).
  function project(lat: number, lon: number, W: number, H: number): { x: number; y: number } {
    const cosLat = Math.cos((centroidLat * Math.PI) / 180);
    const kmPerDegLat = (Math.PI / 180) * config.radiusKm;
    const kmPerDegLon = kmPerDegLat * cosLat;
    const dxKm = (lon - centroidLon) * kmPerDegLon;
    const dyKm = (lat - centroidLat) * kmPerDegLat;
    return {
      x: W / 2 + dxKm / kmPerPx,
      y: H * flatCenterFrac - dyKm / kmPerPx, // +lat = up on screen
    };
  }

  // Annotation rings: the ground offsets (metres from the site point = detail
  // image centre) projected with the same view as the imagery, so each ring
  // sits on its object at any zoom while its own size stays fixed.
  const placedRings: PlacedRing[] = $derived.by(() => {
    const list = selected.hotspot_annotations;
    if (!list?.length || !layerDetail || selected.lat == null || selected.lon == null) return [];
    const origin = project(selected.lat, selected.lon, viewW, viewH);
    return list.map((annotation) => ({
      annotation,
      ...groundOffsetToScreen(annotation.lat_offset_m, annotation.lon_offset_m, kmPerPx, origin),
    }));
  });

  // ─── Drawing ───────────────────────────────────────────────────────
  function draw(): void {
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    // Dark base
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, W, H);

    // Faint lat/lon graticule every 0.01° (≈ 600 m at lunar/Martian
    // radius — useful for orientation but not noisy).
    drawGraticule(ctx, W, H);

    // Regional rectangle (CTX / LROC NAC ROI) — true ground extent.
    // Fades out as the user zooms deep enough that the detail (HiRISE /
    // LROC NAC ROI) layer dominates the visible area. Two overlapping
    // image-source rectangles read as "is this one image or two?";
    // hiding the regional once detail is the canonical view collapses
    // it back to a single legible photo (user feedback 2026-06-08:
    // "there are 2 overlapping images, I am expecting only one").
    if (
      layerRegional &&
      selected.lat != null &&
      selected.lon != null &&
      selected.hotspot_tier2_regional_source
    ) {
      // Full opacity — the prior regionalFadeAtZoom kicked in at the
      // entry zoom and washed CTX down to ~15 % alpha, which is why
      // the regional layer looked "small and barely there" surrounded
      // by black. Now CTX stays vivid; it naturally overflows the
      // viewport behind the HiRISE patch as the surrounding texture.
      drawRegionalLayer(ctx, W, H, 1);
    }

    // Detail rectangle (HiRISE / LROC NAC closeup) — true scale, centred
    // on the site's lat/lon. For v1, the detail layer is a fixed ~500m
    // (Mars) / 250m (Moon) square — overridden by the site's published
    // HiRISE product size in future slices.
    if (layerDetail) {
      drawDetailLayer(ctx, W, H);
    }

    // Traverse polyline (rovers only).
    if (layerTraverse && traverses) {
      drawTraverse(ctx, W, H);
    }

    // Site marker — start/end pair for rovers, single dot for landings.
    drawMarkers(ctx, W, H);

    // HUD overlays (scale bar, lat/lon, layer chips) are HTML-rendered
    // in the parent template — drawn over the canvas via CSS z-index.
  }

  function drawGraticule(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    // Step size adapts to zoom — finer graticule at deeper zoom.
    const kmRange = Math.max(W, H) * kmPerPx;
    let stepKm: number;
    if (kmRange > 50) stepKm = 10;
    else if (kmRange > 5) stepKm = 1;
    else if (kmRange > 0.5) stepKm = 0.1;
    else stepKm = 0.01;
    const kmPerDegLat = (Math.PI / 180) * config.radiusKm;
    const cosLat = Math.cos((centroidLat * Math.PI) / 180);
    const dLat = stepKm / kmPerDegLat;
    const dLon = stepKm / (kmPerDegLat * cosLat);
    // Snap to nearest multiple of stepDeg around centroid
    const latStart = Math.floor(centroidLat / dLat) * dLat - 10 * dLat;
    const lonStart = Math.floor(centroidLon / dLon) * dLon - 10 * dLon;
    for (let i = 0; i < 20; i++) {
      const lat = latStart + i * dLat;
      const lon = lonStart + i * dLon;
      const p1 = project(lat, lonStart, W, H);
      const p2 = project(lat, lonStart + 20 * dLon, W, H);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      const q1 = project(latStart, lon, W, H);
      const q2 = project(latStart + 20 * dLat, lon, W, H);
      ctx.beginPath();
      ctx.moveTo(q1.x, q1.y);
      ctx.lineTo(q2.x, q2.y);
      ctx.stroke();
    }
  }

  function drawRegionalLayer(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    alpha: number = 1,
  ) {
    if (alpha < 0.01) return;
    // Regional layer ground extent — matches the fetch crop size:
    // Mars CTX = 3072 × 5 m/px ≈ 15.4 km; Moon LROC NAC = 3072 × 5 m/px
    // ≈ 15.4 km; Earth = 5 km placeholder. region_bounds (used by the
    // sphere's Tier-1/2 rendering) is intentionally NOT used here —
    // the per-site bounds vary from 1 km (mars-pathfinder) to 60 km
    // (mars2), and stretching the fixed-extent crop to those rects
    // either crushed it to a tiny dense thumbnail or pixelated it.
    // Centring on lat/lon ± half-extent keeps every site's regional
    // layer at a consistent honest 1:1 ground scale.
    if (selected.lat == null || selected.lon == null) return;
    // The crop's own ground extent when the sidecar records it (#641: rover
    // crops grow to cover the whole traverse), else the default sizes.
    const regionalExtentKm =
      selected.hotspot_tier2_regional_ground_m != null
        ? selected.hotspot_tier2_regional_ground_m / 1000
        : config.planet === 'earth'
          ? 5.0
          : 15.4;
    // Rovers' regional CTX is cut around the traverse midpoint (fetch-mars-ctx),
    // not the landing site — draw it where it was cut.
    const tr = config.planet === 'mars' ? traverses?.[selected.id] : undefined;
    const [cLat, cLon] =
      tr && tr.points.length > 1 ? routeMidpoint(tr.points) : [selected.lat, selected.lon];
    const kmPerDegLat = (Math.PI / 180) * config.radiusKm;
    const cosLat = Math.cos((cLat * Math.PI) / 180);
    const halfLat = regionalExtentKm / 2 / kmPerDegLat;
    const halfLon = regionalExtentKm / 2 / (kmPerDegLat * cosLat);
    const tl = project(cLat + halfLat, cLon - halfLon, W, H);
    const br = project(cLat - halfLat, cLon + halfLon, W, H);
    const x = tl.x;
    const y = tl.y;
    const w = br.x - tl.x;
    const h = br.y - tl.y;
    if (w < 1 || h < 1) return;
    // Real CTX / LROC WAC imagery clipped to the region bounds. When
    // the source image is loaded, drawImage maps its full extent onto
    // the region rectangle (the source image is georegistered to the
    // site's tier-2 source, sized to match landing-zone coordinates).
    if (regionalReady && regionalImage) {
      ctx.save();
      // Slight desaturation for "regional context" feel vs the detail
      // layer which renders at full saturation.
      ctx.globalAlpha = 0.95 * alpha;
      ctx.drawImage(regionalImage, x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.restore();
    } else {
      // Placeholder while image loads / when source isn't wired.
      ctx.fillStyle = `rgba(255, 200, 80, ${0.1 * alpha})`;
      ctx.fillRect(x, y, w, h);
    }
    // Crisp gold border (regional = gold per mockup frame 04).
    ctx.strokeStyle = `rgba(255, 200, 80, ${0.7 * alpha})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    // Label in corner — REGIONAL · CTX (Mars) / LROC WAC (Moon).
    ctx.fillStyle = '#ffc850';
    ctx.font = "bold 10px 'Space Mono', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const KIND: Record<string, () => string> = {
      landing_ellipse: m.surface_region_landing_ellipse,
      roi_quad: m.surface_region_roi,
      traverse_bbox: m.surface_region_traverse,
    };
    const kind = selected.region_kind ?? 'region';
    const kindLabel = KIND[kind]?.() ?? kind.replace('_', ' ').toUpperCase();
    const sourceLabel =
      config.planet === 'mars'
        ? 'CTX 5 m/px · ~15 km'
        : config.planet === 'earth'
          ? 'Sentinel-2 ~10 m/px'
          : 'LROC NAC 5 m/px · ~15 km';
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffc850';
    ctx.fillText(`${m.surface_regional_caps()} · ${sourceLabel} · ${kindLabel}`, x + 6, y + 6);
    ctx.restore();
  }

  function drawDetailLayer(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (selected.lat == null || selected.lon == null) return;
    // Fixed detail-layer extent: 1.5 km square on Mars, 1.0 km on Moon,
    // 0.5 km on Earth (launchpads are compact). Bumped from the prior
    // 500m/250m/250m so the detail patch covers a usable area around the
    // marker instead of feeling like a postage stamp surrounded by
    // black — the published HiRISE / LROC NAC ROI products cover well
    // past these footprints at their native resolution. Future: derive
    // exactly from the site's published source product.
    const detailSizeKm = detailGroundKm(selected, config.planet);
    const kmPerDegLat = (Math.PI / 180) * config.radiusKm;
    const cosLat = Math.cos((selected.lat * Math.PI) / 180);
    const halfLat = detailSizeKm / 2 / kmPerDegLat;
    const halfLon = detailSizeKm / 2 / (kmPerDegLat * cosLat);
    const tl = project(selected.lat + halfLat, selected.lon - halfLon, W, H);
    const br = project(selected.lat - halfLat, selected.lon + halfLon, W, H);
    const x = tl.x;
    const y = tl.y;
    const w = br.x - tl.x;
    const h = br.y - tl.y;
    if (w < 4 || h < 4) return; // too zoomed out to be meaningful
    // Real HiRISE / LROC NAC imagery when loaded.
    if (detailReady && detailImage) {
      ctx.drawImage(detailImage, x, y, w, h);
    } else {
      ctx.fillStyle = 'rgba(78, 205, 196, 0.10)';
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    if (w > 80) {
      ctx.fillStyle = '#4ecdc4';
      ctx.font = "bold 9px 'Space Mono', monospace";
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const px =
        config.planet === 'mars'
          ? '25 cm/px · HiRISE'
          : config.planet === 'earth'
            ? '~30 cm/px · commercial sat'
            : '50 cm/px · LROC NAC';
      ctx.fillText(`DETAIL · ${px}`, x + 6, y + 6);
    }
  }

  function drawTraverse(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (!traverses) return;
    const tr = traverses[selected.id];
    if (!tr || tr.points.length < 2) return;
    const pts = tr.points.map(([lat, lon]) => project(lat, lon, W, H));
    const sols = tr.point_sols?.length === tr.points.length ? tr.point_sols : undefined;
    const stroke = () => {
      ctx.beginPath();
      pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.stroke();
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (sols) {
      // #641 — same look as the 3D route: dark casing, line coloured by sol
      // over the whole mission, sol ticks across the path.
      const last = sols[sols.length - 1];
      ctx.strokeStyle = 'rgba(6, 8, 11, 0.75)';
      ctx.lineWidth = 8;
      stroke();
      ctx.lineWidth = 3.5;
      for (let i = 1; i < pts.length; i++) {
        ctx.strokeStyle = `#${solRampColor(last > 1 ? (sols[i] - 1) / (last - 1) : 0).getHexString()}`;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      drawSolTicks(ctx, pts, sols, solTickSpacing(last), W, H);
    } else {
      // Outer 4 px white glow + inner 2 px agency-tinted line.
      ctx.globalAlpha = tr.status === 'ACTIVE' ? 0.95 : 0.75;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 4;
      stroke();
      ctx.strokeStyle = colorFor(selected);
      ctx.lineWidth = 2;
      stroke();
      ctx.globalAlpha = 1;
    }
    // Start dot (lander = 5 m footprint) + end dot (rover = 3 m).
    // Scale-aware: tracks true scale at deep zoom, floors at clickable
    // size at wide zoom.
    const sp = pts[0];
    const ep = pts[pts.length - 1];
    const startR = scaleAwareRadius(LANDER_FOOTPRINT_KM);
    const endR = scaleAwareRadius(ROVER_FOOTPRINT_KM);
    // An annotation ring on the lander marks the start; the green dot would sit under it.
    const ringClear = ringDiameter(viewW);
    if (!placedRings.some((r) => Math.hypot(r.x - sp.x, r.y - sp.y) < ringClear)) {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, startR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = tr.status === 'ACTIVE' ? '#ef4444' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, endR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, endR + 0.5, 0, Math.PI * 2);
    ctx.stroke();
    if (tr.stops) drawTraverseStops(ctx, tr.stops, W, H);
  }

  /** Minor + labelled major sol ticks, perpendicular to the path (#641).
   *  Major labels closer than ~44 px to the last one drawn are skipped. */
  function drawSolTicks(
    ctx: CanvasRenderingContext2D,
    pts: Array<{ x: number; y: number }>,
    sols: number[],
    spacing: { minor: number; major: number },
    W: number,
    H: number,
  ) {
    const loc = getLocale() as LocaleCode;
    let lastLabel: { x: number; y: number } | null = null;
    ctx.strokeStyle = '#ffffff';
    ctx.font = "600 12px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const { sol, i } of solTickIndices(sols, spacing.minor)) {
      const q = pts[i];
      if (q.x < -20 || q.x > W + 20 || q.y < -20 || q.y > H + 20) continue;
      let k = i - 1;
      while (k > 0 && pts[k].x === q.x && pts[k].y === q.y) k--;
      const dx = q.x - pts[k].x;
      const dy = q.y - pts[k].y;
      const len = Math.hypot(dx, dy) || 1;
      const [nx, ny] = [-dy / len, dx / len];
      const major = sol % spacing.major === 0;
      const h = major ? 9 : 6;
      ctx.lineWidth = major ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(q.x - nx * h, q.y - ny * h);
      ctx.lineTo(q.x + nx * h, q.y + ny * h);
      ctx.stroke();
      if (!major) continue;
      const lx = q.x + nx * 22;
      const ly = q.y + ny * 22;
      if (lastLabel && Math.hypot(lx - lastLabel.x, ly - lastLabel.y) < 44) continue;
      lastLabel = { x: lx, y: ly };
      const text = formatNumber(sol, loc);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(6, 8, 11, 0.9)';
      ctx.strokeText(text, lx, ly);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, lx, ly);
      ctx.strokeStyle = '#ffffff';
    }
  }

  /**
   * Stops as a white ring with a kind-coloured core + a "name · Sol N"
   * pill (#641), same as the 3D route. Kind colours:
   *   sample orange · drill red-orange · panorama cyan · helicopter
   *   magenta · feature yellow.
   */
  function drawTraverseStops(
    ctx: CanvasRenderingContext2D,
    stops: Array<{ sol: number; lat: number; lon: number; label: string; kind: string }>,
    W: number,
    H: number,
  ) {
    const KIND_COLOR: Record<string, string> = {
      sample: '#fb923c',
      drill: '#f97316',
      panorama: '#22d3ee',
      helicopter: '#e879f9',
      feature: '#fde047',
    };
    ctx.font = "600 12px 'Space Mono', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const stop of stops) {
      const p = project(stop.lat, stop.lon, W, H);
      if (p.x < -200 || p.x > W + 50 || p.y < -50 || p.y > H + 50) continue;
      const color = KIND_COLOR[stop.kind] ?? '#fde047';
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = 'rgba(6, 8, 11, 0.8)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      const text = `${stop.label} · ${m.traverse_sol({ sol: stop.sol })}`;
      const w = ctx.measureText(text).width + 20;
      const [x, y, h] = [p.x + 14, p.y - 20, 22];
      ctx.beginPath();
      ctx.roundRect(x, y - h / 2, w, h, h / 2);
      ctx.fillStyle = 'rgba(11, 18, 32, 0.86)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + 10, y + 1);
    }
  }

  function drawMarkers(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // If no traverse, draw a single landing-site marker at lat/lon.
    // Scale-aware: lander footprint ~5 m, capped at the clickable
    // minimum at wide zoom.
    if (traverses && traverses[selected.id]) return;
    if (selected.lat == null || selected.lon == null) return;
    // The lander's own ring marks it; a filled disc would cover the hardware in the image.
    if (layerDetail && selected.hotspot_annotations?.some((x) => x.explain)) return;
    const p = project(selected.lat, selected.lon, W, H);
    const tone = statusTone(selected.status, selected.kind, selected.site_role);
    const trueR = scaleAwareRadius(LANDER_FOOTPRINT_KM);
    // Floor at 6 px so the marker reads against busy HiRISE/LROC
    // terrain (the prior 4 px white-50 % dot effectively disappeared on
    // Mars at deepest zoom). Crosshair + outlined disc together give a
    // hit-the-eye-instantly cue without losing true scale on the disc.
    const r = Math.max(6, trueR);
    // Dark drop shadow + thick white ring for contrast.
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = tone.color === 'rgba(255,255,255,0.5)' ? '#ffd166' : tone.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 1, 0, Math.PI * 2);
    ctx.stroke();
    // Cross-hair extending past the disc — locates the spot even when
    // the disc itself is the same tone as the underlying terrain.
    const crossExt = r + 14;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x - crossExt, p.y);
    ctx.lineTo(p.x - r - 3, p.y);
    ctx.moveTo(p.x + r + 3, p.y);
    ctx.lineTo(p.x + crossExt, p.y);
    ctx.moveTo(p.x, p.y - crossExt);
    ctx.lineTo(p.x, p.y - r - 3);
    ctx.moveTo(p.x, p.y + r + 3);
    ctx.lineTo(p.x, p.y + crossExt);
    ctx.stroke();
  }

  // ─── Resize + redraw loop ──────────────────────────────────────────
  onMount(() => {
    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      viewW = canvas.width;
      viewH = canvas.height;
    };
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    const loop = createAnimateLoop({ onFrame: () => draw(), reducedMotion: () => false });
    loop.start();
    return () => {
      loop.cleanup();
      window.removeEventListener('resize', onResize);
    };
  });

  // ─── Input handlers (pan + zoom) ───────────────────────────────────
  function onMouseDown(e: MouseEvent) {
    dragging = true;
    lmx = e.clientX;
    lmy = e.clientY;
  }
  function onMouseMove(e: MouseEvent) {
    if (!dragging) return;
    const dxPx = e.clientX - lmx;
    const dyPx = e.clientY - lmy;
    lmx = e.clientX;
    lmy = e.clientY;
    // Convert pixel delta → lat/lon delta (inverse of project).
    const kmPerDegLat = (Math.PI / 180) * config.radiusKm;
    const cosLat = Math.cos((centroidLat * Math.PI) / 180);
    const dKmX = -dxPx * kmPerPx;
    const dKmY = dyPx * kmPerPx;
    centroidLat += dKmY / kmPerDegLat;
    centroidLon += dKmX / (kmPerDegLat * cosLat);
  }
  function onMouseUp() {
    dragging = false;
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    // ANY wheel-out exits to the sphere. The flat-patch is the deep
    // end of the zoom; "wheeling out" past the entry is the same
    // gesture as "go back to tier 2" (user feedback 2026-06-08: "let
    // make zoom out work to take me back to tier 2"). Wheel-in
    // continues to zoom further into HiRISE pixels until the floor.
    if (e.deltaY > 0) {
      if (!autoExitFired) {
        autoExitFired = true;
        onClose(kmPerPx);
      }
      return;
    }
    const factor = 0.9;
    // Floor at the source product's near-native resolution — beyond
    // that the upsample warning already fires.
    const minKmPerPx = Math.max(nativeKmPerPx * 0.5, deepestZoomFloor() * 0.05);
    kmPerPx = Math.max(minKmPerPx, Math.min(10, kmPerPx * factor));
  }

  // Cluster badge click: pan the badge to the view centre while zooming in by
  // `factor`. False when the zoom floor is already reached (the badge then fans out).
  let zoomRaf = 0;
  onMount(() => () => cancelAnimationFrame(zoomRaf));
  function zoomToPoint(x: number, y: number, factor: number): boolean {
    const minKmPerPx = Math.max(nativeKmPerPx * 0.5, deepestZoomFloor() * 0.05);
    const fromKm = kmPerPx;
    const toKm = Math.max(minKmPerPx, fromKm / factor);
    if (toKm > fromKm * 0.98) return false;
    const kmPerDegLat = (Math.PI / 180) * config.radiusKm;
    const kmPerDegLon = kmPerDegLat * Math.cos((centroidLat * Math.PI) / 180);
    const toLat = centroidLat + ((viewH * flatCenterFrac - y) * fromKm) / kmPerDegLat;
    const toLon = centroidLon + ((x - viewW / 2) * fromKm) / kmPerDegLon;
    const fromLat = centroidLat;
    const fromLon = centroidLon;
    const t0 = performance.now();
    cancelAnimationFrame(zoomRaf);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 420);
      const e = 1 - Math.pow(1 - t, 3);
      centroidLat = fromLat + (toLat - fromLat) * e;
      centroidLon = fromLon + (toLon - fromLon) * e;
      kmPerPx = fromKm * Math.pow(toKm / fromKm, e);
      if (t < 1) zoomRaf = requestAnimationFrame(step);
    };
    zoomRaf = requestAnimationFrame(step);
    return true;
  }

  // Scale-aware marker sizing per ADR-072 §"scale-aware marker rule".
  // Each marker has a real-world footprint in km. Displayed pixel size
  // is footprintKm / kmPerPx (= true scale), floored at MIN_VISIBLE_PX
  // so wide-zoom markers stay clickable. Capped at MAX_PX so deep-zoom
  // markers don't dominate the frame.
  const MARKER_MIN_PX = 4;
  const MARKER_MAX_PX = 32;
  const ROVER_FOOTPRINT_KM = 0.003; // ~3 m (Curiosity-class, MER, Zhurong)
  const LANDER_FOOTPRINT_KM = 0.005; // ~5 m (Apollo LM, Phoenix, Viking)
  // STOP_FOOTPRINT_KM was used by drawTraverseStops before 2026-06-03;
  // the pin now uses a fixed-pixel head (matching the 3D handoff) so
  // the per-stop footprint no longer drives its radius.

  function scaleAwareRadius(footprintKm: number): number {
    const trueScalePx = footprintKm / kmPerPx;
    return Math.max(MARKER_MIN_PX, Math.min(MARKER_MAX_PX, trueScalePx));
  }

  // Native resolving power of the body's highest-res orbital imagery:
  // Mars HiRISE ≈ 25 cm/px, Moon LROC NAC ≈ 50 cm/px, Earth commercial
  // sat ≈ 30 cm/px (Maxar / Planet Labs reference). When the user
  // zooms in past kmPerPx < native, they're upsampling — the imagery
  // doesn't have new detail to reveal. Show a subtle vignette + a
  // "approaching pixel limit" microcopy so they don't read the blur as
  // "the planet is fuzzy." Per ADR-072 Slice 5 §"upsample warning."
  let nativeKmPerPx = $derived(
    config.planet === 'mars' ? 0.00025 : config.planet === 'earth' ? 0.0003 : 0.0005,
  );
  let upsampling = $derived(kmPerPx < nativeKmPerPx);
  /** True when the user has wheeled past the clamp floor — further
   *  wheel events get ignored. Surfaced as a small "deepest zoom" chip
   *  so the stuck feeling reads as "we hit the source-image extent",
   *  not "the app got stuck". Inlines the floor calc so the $derived
   *  re-fires on every kmPerPx change (calling the function would still
   *  work in Svelte 5, but inlining makes the reactive dep on kmPerPx
   *  explicit + skips a per-frame function call). */
  let atDeepestZoom = $derived.by(() => {
    const floor = deepestZoomFloor();
    return kmPerPx <= floor * 1.05;
  });

  // Scale-bar length & label — pick a "round" km value that fits in
  // ~120 px of screen real estate.
  let scaleBar = $derived.by(() => {
    // Shorter on a phone: the scale shares one line with the lat/lon readout.
    const targetPx = viewW > 0 && viewW < 600 ? 64 : 120;
    const targetKm = targetPx * kmPerPx;
    const niceValues = [
      0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500,
    ];
    let chosen = niceValues[0];
    for (const v of niceValues) {
      if (v <= targetKm) chosen = v;
      else break;
    }
    const widthPx = chosen / kmPerPx;
    const label = chosen >= 1 ? `${chosen} km` : `${chosen * 1000} m`;
    return { widthPx, label };
  });
</script>

<div class="flat-patch" role="region" aria-label={m.mars_map_aria()}>
  <canvas
    bind:this={canvas}
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
    onmouseup={onMouseUp}
    onmouseleave={onMouseUp}
    onwheel={onWheel}
  ></canvas>

  {#if placedRings.length > 0}
    <AnnotationRings
      rings={placedRings}
      width={viewW}
      height={viewH}
      {onWheel}
      {onOpenPhoto}
      onZoomTo={zoomToPoint}
    />
  {/if}

  <button
    class="hud-back"
    type="button"
    onclick={() => onClose(kmPerPx)}
    aria-label={m.surface_flat_back_aria()}
  >
    {m.surface_flat_back_to_planet()}
  </button>

  <!-- True-scale ground view context banner — tells you exactly what
       you're looking at when you cross from the (stylized) sphere
       into the (true-scale) flat-patch. Added back 2026-06-08 after
       being briefly removed in the seamless-transition attempt. -->
  <div class="hud-context-banner mono" aria-hidden="true">
    <span class="ctx-eyebrow">{m.surface_true_scale_eyebrow()}</span>
    <span class="ctx-subline">
      {m.surface_true_scale_sub({ name: selected.name ?? selected.id })}
    </span>
    {#if atDeepestZoom}
      <span class="ctx-limit">
        {m.surface_deepest_zoom({
          limit:
            config.planet === 'mars'
              ? m.surface_zoom_limit_hirise()
              : config.planet === 'earth'
                ? m.surface_zoom_limit_commercial()
                : m.surface_zoom_limit_lroc(),
        })}
      </span>
    {/if}
    {#if upsampling}
      <span class="ctx-warn">
        {config.planet === 'mars'
          ? m.surface_flat_upsample_warning_mars()
          : m.surface_flat_upsample_warning_moon()}
      </span>
    {/if}
  </div>

  <div class="hud-layers" role="group" aria-label={m.surface_flat_layer_toggles_aria()}>
    <button
      type="button"
      class="chip {layerRegional ? 'on' : 'off'}"
      onclick={() => (layerRegional = !layerRegional)}
    >
      {m.surface_flat_layer_regional()}
    </button>
    <button
      type="button"
      class="chip {layerDetail ? 'on' : 'off'}"
      onclick={() => (layerDetail = !layerDetail)}
    >
      {m.surface_flat_layer_detail()}
    </button>
    {#if traverses && traverses[selected.id]}
      <button
        type="button"
        class="chip {layerTraverse ? 'on' : 'off'}"
        onclick={() => (layerTraverse = !layerTraverse)}
      >
        {m.surface_flat_layer_traverse()}
      </button>
    {/if}
  </div>

  <!-- One bar on a phone (scale + lat/lon on a line); two corner boxes elsewhere. -->
  <div class="hud-bottom">
    <div class="hud-scale" aria-hidden="true">
      <span class="scale-word">{m.surface_flat_scale_label()}</span>
      <span class="bar" style:width="{scaleBar.widthPx}px"></span>
      <span class="mono">{scaleBar.label}</span>
    </div>

    <div class="hud-latlon mono" aria-hidden="true">
      {m.surface_flat_lat_lon({
        lon: centroidLon.toFixed(4),
        lat: centroidLat.toFixed(4),
      })}
    </div>
  </div>

  {#if upsampling}
    <div class="upsample-vignette" aria-hidden="true"></div>
  {/if}

  {#if atDeepestZoom}
    <!-- Deepest-zoom microcopy — surfaces the kmPerPx floor as a
         deliberate stop rather than a stuck app. Sits opposite the
         layer chips so it doesn't fight the upsample warning when both
         are active near the floor. -->
    <div class="deepest-zoom-chip mono" aria-hidden="true">
      {m.surface_deepest_zoom({
        limit:
          config.planet === 'mars'
            ? m.surface_zoom_limit_hirise()
            : config.planet === 'earth'
              ? m.surface_zoom_limit_commercial()
              : m.surface_zoom_limit_lroc(),
      })}
    </div>
  {/if}
  <!-- Earth shares the moon-warning copy in v1 (both read as "approaching
       pixel limit"); a dedicated earth-warning paraglide key will land in
       the slice that ships commercial-sat Earth insets. -->
</div>

<style>
  .flat-patch {
    position: absolute;
    inset: 0;
    background: #04040c;
    overflow: hidden;
  }
  canvas {
    width: 100%;
    height: 100%;
    cursor: grab;
    touch-action: none;
  }
  canvas:active {
    cursor: grabbing;
  }
  .hud-back {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 5;
    background: rgba(5, 5, 20, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.6);
    padding: 6px 12px;
    border-radius: 3px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 0.08em;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition:
      background 120ms,
      color 120ms,
      border-color 120ms;
  }
  .hud-back:hover {
    background: rgba(15, 15, 35, 0.92);
  }
  .hud-layers {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 5;
    display: flex;
    gap: 8px;
  }
  .chip {
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.6);
    padding: 6px 10px;
    border-radius: 3px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 0.08em;
    cursor: pointer;
    backdrop-filter: blur(4px);
  }
  .chip.on {
    color: #fff;
    border-color: rgba(78, 205, 196, 0.6);
  }
  .hud-bottom {
    display: contents;
  }
  .hud-scale {
    position: absolute;
    bottom: 24px;
    left: 24px;
    z-index: 5;
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #fff;
    padding: 6px 10px;
    border-radius: 3px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 0.08em;
    display: flex;
    align-items: center;
    gap: 10px;
    backdrop-filter: blur(4px);
  }
  .hud-scale .bar {
    display: inline-block;
    height: 3px;
    background: #fff;
  }
  .hud-latlon {
    position: absolute;
    bottom: 24px;
    right: 24px;
    z-index: 5;
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #fff;
    padding: 6px 10px;
    border-radius: 3px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 0.08em;
    backdrop-filter: blur(4px);
  }
  .mono {
    font-family: var(--font-mono, 'Space Mono', monospace);
  }
  .upsample-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at center, transparent 60%, rgba(0, 0, 0, 0.35) 100%);
    z-index: 2;
  }
  /* True-scale ground view context banner — top-center pill. */
  .hud-context-banner {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: rgba(5, 5, 20, 0.92);
    border: 1px solid rgba(78, 205, 196, 0.55);
    color: #fff;
    padding: 7px 16px;
    border-radius: 4px;
    backdrop-filter: blur(4px);
    pointer-events: none;
  }
  /* the "approaching native pixel limit" notice is a line of the banner, never a second box over it */
  .hud-context-banner .ctx-warn {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid rgba(255, 200, 80, 0.35);
    font-size: 11px;
    letter-spacing: 0.05em;
    color: #ffc850;
    text-align: center;
  }
  /* phones only: the deepest-zoom notice is a line of the banner, not a bottom chip */
  .hud-context-banner .ctx-limit {
    display: none;
  }
  .hud-context-banner .ctx-eyebrow {
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #4ecdc4;
  }
  .hud-context-banner .ctx-subline {
    font-size: 10px;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.7);
  }

  /* Deepest-zoom chip — bottom-center HUD, paired with the upsample
     warning at top-center so the two read as a "pixel-limit" status row
     when both fire near the floor. */
  .deepest-zoom-chip {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(78, 205, 196, 0.55);
    color: #4ecdc4;
    padding: 6px 12px;
    border-radius: 3px;
    font-size: 10px;
    letter-spacing: 0.12em;
    backdrop-filter: blur(4px);
    pointer-events: none;
    text-transform: uppercase;
  }
  @media (hover: none), (pointer: coarse) {
    /* SurfaceScene already renders a prominent "Exit zoom" affordance on
       mobile, so the in-component back button is redundant here — drop it. */
    .hud-back {
      display: none;
    }
    /* Clear the top-center context banner past the mobile top controls
       (Exit zoom + layer chips) so it isn't tucked behind them. */
    .hud-context-banner {
      top: 56px;
      /* shrink-to-fit inside the left:50 % box would wrap it at half the screen */
      width: max-content;
      max-width: calc(100% - 32px);
    }
    /* the deepest-zoom line says it; the pixel-limit line would only grow the banner over the imagery */
    .hud-context-banner .ctx-warn {
      display: none;
    }
    .hud-context-banner .ctx-limit {
      display: block;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid rgba(78, 205, 196, 0.35);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #4ecdc4;
      text-align: center;
    }
    .deepest-zoom-chip {
      display: none;
    }
    /* ONE bar at the bottom edge: scale and lat/lon on a line. */
    .hud-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: calc(10px + env(safe-area-inset-bottom, 0px));
      z-index: 5;
      padding: 6px 10px;
      background: rgba(5, 5, 20, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      backdrop-filter: blur(4px);
      white-space: nowrap;
    }
    .hud-bottom .hud-scale,
    .hud-bottom .hud-latlon {
      position: static;
      padding: 0;
      background: none;
      border: none;
      border-radius: 0;
      backdrop-filter: none;
    }
    .hud-bottom .hud-scale {
      gap: 8px;
    }
    .hud-bottom .scale-word {
      display: none;
    }
  }
</style>
