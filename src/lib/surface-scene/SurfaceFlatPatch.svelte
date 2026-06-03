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
  import * as m from '$lib/paraglide/messages';
  import { colorFor } from '$lib/surface-map/nation-palette';
  import type { SurfaceSite, Traverse } from '$types/surface-site';
  import type { SurfaceSceneConfig } from '$lib/surface-scene/types';
  import { statusTone } from '$lib/surface-scene/status-tone';
  import { loadImageVisionManifest, getImageEntry, pickVariant } from '$lib/image-vision';

  interface Props {
    selected: SurfaceSite;
    config: SurfaceSceneConfig;
    traverses?: Record<string, Traverse>;
    /** Called when the user dismisses the flat patch (Esc / back button). */
    onClose: () => void;
  }
  let { selected, config, traverses, onClose }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  // ─── Imagery loading ───────────────────────────────────────────────
  // Resolve regional + detail texture URLs from the selected site's
  // hotspot_tier2_source / hotspot_tier2_regional_source paths through
  // the Image Vision manifest (lazy 1:1 variant lookup). Soft-fail to
  // the raw path if the manifest doesn't have an entry yet. Mirrors the
  // pattern SurfaceScene uses for the sphere's Tier-2 patch.
  let regionalImage: HTMLImageElement | null = $state(null);
  let detailImage: HTMLImageElement | null = $state(null);
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
      const entry = getImageEntry(tier2Source);
      const url = (entry ? pickVariant(entry, 'thumbnail', false) : undefined) ?? tier2Source;
      const img = new Image();
      img.onload = () => {
        detailImage = img;
        detailReady = true;
      };
      img.onerror = () => {
        // Soft-fail — keep the translucent-box placeholder visible.
      };
      img.src = url;
    }

    const regionalSource = selected.hotspot_tier2_regional_source;
    if (regionalSource) {
      const rEntry = getImageEntry(regionalSource);
      const rUrl = (rEntry ? pickVariant(rEntry, 'thumbnail', false) : undefined) ?? regionalSource;
      const rImg = new Image();
      rImg.onload = () => {
        regionalImage = rImg;
        regionalReady = true;
      };
      rImg.onerror = () => {
        // Soft-fail.
      };
      rImg.src = rUrl;
    }
  });

  // ─── View state (lat/lon centred + zoom km-per-pixel) ──────────────
  // Initial view: centroid of the selected region, sized so the region
  // fills ~60 % of the viewport diagonal. Updates as the user pans/zooms.
  let centroidLat = $state(0);
  let centroidLon = $state(0);
  let kmPerPx = $state(0.1); // 100 m/px default

  // Layer toggles — default-on; expose chip row in template.
  let layerRegional = $state(true);
  let layerDetail = $state(true);
  let layerTraverse = $state(true);

  // Drag state
  let dragging = $state(false);
  let lmx = 0;
  let lmy = 0;

  // ─── Initialisation from selected region ───────────────────────────
  $effect(() => {
    if (!selected.region_bounds) return;
    const rb = selected.region_bounds;
    centroidLat = (rb.lat_min + rb.lat_max) / 2;
    centroidLon = (rb.lon_min + rb.lon_max) / 2;
    // Size the initial zoom so the region's longer dimension occupies
    // ~60 % of the viewport's shorter dimension. Δlat or Δlon × cos(lat)
    // in degrees → km via (deg × π/180 × radiusKm).
    const dLat = Math.max(1e-6, rb.lat_max - rb.lat_min);
    const dLon = Math.max(1e-6, rb.lon_max - rb.lon_min);
    const cosLat = Math.cos((centroidLat * Math.PI) / 180);
    const widthKm = dLon * (Math.PI / 180) * config.radiusKm * cosLat;
    const heightKm = dLat * (Math.PI / 180) * config.radiusKm;
    const regionKm = Math.max(widthKm, heightKm);
    // Map to ~60% of an estimated viewport min(w, h)=600 px.
    kmPerPx = regionKm / (0.6 * 600);
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
      y: H / 2 - dyKm / kmPerPx, // +lat = up on screen
    };
  }

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
    if (layerRegional && selected.region_bounds) {
      drawRegionalLayer(ctx, W, H);
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
    let stepKm = 1;
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

  function drawRegionalLayer(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const rb = selected.region_bounds!;
    const tl = project(rb.lat_max, rb.lon_min, W, H);
    const br = project(rb.lat_min, rb.lon_max, W, H);
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
      ctx.globalAlpha = 0.95;
      ctx.drawImage(regionalImage, x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.restore();
    } else {
      // Placeholder while image loads / when source isn't wired.
      ctx.fillStyle = 'rgba(255, 200, 80, 0.10)';
      ctx.fillRect(x, y, w, h);
    }
    // Crisp gold border (regional = gold per mockup frame 04).
    ctx.strokeStyle = 'rgba(255, 200, 80, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    // Label in corner — REGIONAL · CTX (Mars) / LROC WAC (Moon).
    ctx.fillStyle = '#ffc850';
    ctx.font = "bold 10px 'Space Mono', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const kind = selected.region_kind ?? 'region';
    const sourceLabel =
      config.planet === 'mars'
        ? 'CTX 5 m/px'
        : config.planet === 'earth'
          ? 'Sentinel-2 ~10 m/px'
          : 'LROC NAC 5 m/px';
    ctx.fillText(
      `REGIONAL · ${sourceLabel} · ${kind.replace('_', ' ').toUpperCase()}`,
      x + 6,
      y + 6,
    );
  }

  function drawDetailLayer(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (selected.lat == null || selected.lon == null) return;
    // Fixed detail-layer extent for v1: 500m square on Mars, 250m on
    // Moon, 250m on Earth (launchpads are compact). Future: derive
    // from the site's published HiRISE/LROC/commercial-sat footprint.
    const detailSizeKm = config.planet === 'mars' ? 0.5 : 0.25;
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
    const color = colorFor(selected);
    // Bold polyline (Slice 5 §"traverse polyline as first-class primitive").
    // Outer 4 px white glow + inner 2.5 px agency-tinted line.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 4;
    ctx.globalAlpha = tr.status === 'ACTIVE' ? 0.95 : 0.75;
    ctx.beginPath();
    for (let i = 0; i < tr.points.length; i++) {
      const [lat, lon] = tr.points[i];
      const p = project(lat, lon, W, H);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < tr.points.length; i++) {
      const [lat, lon] = tr.points[i];
      const p = project(lat, lon, W, H);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Start dot (lander = 5 m footprint) + end dot (rover = 3 m).
    // Scale-aware: tracks true scale at deep zoom, floors at clickable
    // size at wide zoom. Rover gets the smaller dot per its smaller
    // physical footprint.
    const start = tr.points[0];
    const end = tr.points[tr.points.length - 1];
    const sp = project(start[0], start[1], W, H);
    const ep = project(end[0], end[1], W, H);
    const startR = scaleAwareRadius(LANDER_FOOTPRINT_KM);
    const endR = scaleAwareRadius(ROVER_FOOTPRINT_KM);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, startR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tr.status === 'ACTIVE' ? '#ef4444' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, endR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, endR + 0.5, 0, Math.PI * 2);
    ctx.stroke();
    // Curated stops along the path (sample / drill / panorama / etc.).
    // Drawn as tube pins (kind-coloured drop shapes with white outline)
    // — distinct from the start (green) and end (red/amber) markers.
    if (tr.stops) drawTraverseStops(ctx, tr.stops, W, H);
  }

  /**
   * Drop-shape tube pins for curated traverse stops. Color by `kind`:
   *   sample      — orange (#fb923c) drill core retrieval
   *   drill       — red-orange (#f97316) wet science
   *   panorama    — cyan (#22d3ee) photo waypoint
   *   helicopter  — magenta (#e879f9) Ingenuity flight site
   *   feature     — yellow (#fde047) named terrain feature
   * Each pin shows a small label above with sol number + name.
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
    // 2026-06-03: inline "SOL N · label" text removed so the
    // flat-patch pin style matches the 3D balloon-pin handoff —
    // both show just a kind-tinted tear-drop with a white centre
    // dot, sol/label info is surfaced via the hover tooltip on
    // 3D, and on the flat-patch users can read it from the
    // detail panel + stop chip cross-link. Avoids the perceived
    // "traverse vanishes at deepest zoom" jolt during the
    // sphere → flat-patch 600 ms cross-fade.
    for (const stop of stops) {
      const p = project(stop.lat, stop.lon, W, H);
      if (p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) continue;
      const color = KIND_COLOR[stop.kind] ?? '#fde047';
      // Match the 3D pin's tear-drop proportions — head 22 / tip 38
      // → ratio 4:7. Anchor `p` at the tip so the bottom of the
      // glyph sits on the surface point (same anchoring rule as
      // sprite.center = (0.5, 0) in the 3D path).
      const headR = 9; // ≈ 26 px head/2 - outline; comparable to 3D pin
      const tipDrop = headR * 2; // pointer length from head centre
      const headY = p.y - tipDrop;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, headY, headR, Math.PI * 0.78, Math.PI * 0.22, false);
      ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, headY, headR * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMarkers(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // If no traverse, draw a single landing-site marker at lat/lon.
    // Scale-aware: lander footprint ~5 m, capped at the clickable
    // minimum at wide zoom.
    if (traverses && traverses[selected.id]) return;
    if (selected.lat == null || selected.lon == null) return;
    const p = project(selected.lat, selected.lon, W, H);
    const tone = statusTone(selected.status, selected.kind);
    const r = scaleAwareRadius(LANDER_FOOTPRINT_KM);
    ctx.fillStyle = tone.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ─── Resize + redraw loop ──────────────────────────────────────────
  let rafId = 0;
  onMount(() => {
    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    const loop = () => {
      draw();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
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
    // Zoom about the centroid. Cap at sensible bounds — the
    // closest-zoom floor adapts to whichever is larger of the
    // selected site's region_bounds span or its traverse polyline
    // span, so the user can't zoom in past the point where every
    // marker stays visible (image 21 follow-up: "on the last zoom
    // I see only green circle, nothing should be gone").
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
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
      // Polyline bounding-box extent in km (great-circle approximation).
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
    const vp = Math.max(300, Math.min(window.innerWidth, window.innerHeight));
    const minKmPerPx = Math.max(0.001, extentKm / (vp * 0.8));
    kmPerPx = Math.max(minKmPerPx, Math.min(10, kmPerPx * factor));
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

  // Scale-bar length & label — pick a "round" km value that fits in
  // ~120 px of screen real estate.
  let scaleBar = $derived.by(() => {
    const targetPx = 120;
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

  <button class="hud-back" type="button" onclick={onClose} aria-label={m.surface_flat_back_aria()}>
    {m.surface_flat_back_to_planet()}
  </button>

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

  <div class="hud-scale" aria-hidden="true">
    <span>{m.surface_flat_scale_label()}</span>
    <span class="bar" style:width="{scaleBar.widthPx}px"></span>
    <span class="mono">{scaleBar.label}</span>
  </div>

  <div class="hud-latlon mono" aria-hidden="true">
    {m.surface_flat_lat_lon({
      lon: centroidLon.toFixed(4),
      lat: centroidLat.toFixed(4),
    })}
  </div>

  {#if upsampling}
    <div class="upsample-warning mono" aria-hidden="true">
      {config.planet === 'mars'
        ? m.surface_flat_upsample_warning_mars()
        : m.surface_flat_upsample_warning_moon()}
    </div>
    <div class="upsample-vignette" aria-hidden="true"></div>
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
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #fff;
    padding: 8px 14px;
    border-radius: 3px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    cursor: pointer;
    backdrop-filter: blur(4px);
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
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    cursor: pointer;
    backdrop-filter: blur(4px);
  }
  .chip.on {
    color: #fff;
    border-color: rgba(78, 205, 196, 0.6);
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
    font-family: 'Space Mono', monospace;
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
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    backdrop-filter: blur(4px);
  }
  .mono {
    font-family: 'Space Mono', monospace;
  }
  .upsample-warning {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 200, 80, 0.45);
    color: #ffc850;
    padding: 6px 12px;
    border-radius: 3px;
    font-size: 11px;
    letter-spacing: 0.05em;
    backdrop-filter: blur(4px);
    pointer-events: none;
  }
  .upsample-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at center, transparent 60%, rgba(0, 0, 0, 0.35) 100%);
    z-index: 2;
  }
</style>
