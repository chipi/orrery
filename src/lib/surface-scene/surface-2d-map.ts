/**
 * SurfaceScene's flat 2D map: the lunar near/far orthographic discs
 * (/moon) and the single equirectangular map (/mars, /earth, /venus),
 * plus the click-to-select handler that hit-tests the drawn markers.
 *
 * Extracted from SurfaceScene's onMount closure. `get*` getters read
 * reactive component state at call time so a redraw never sees a stale
 * value. The projection math is exported as pure helpers
 * (`equirectLayout`, `equirectProject`, `lunarDiscProject`).
 */
import { colorFor } from '$lib/surface-map/nation-palette';
import * as m from '$lib/paraglide/messages';
import { pickClosest2d } from '$lib/three/pick-closest-2d';
import type { SurfaceSite, Traverse } from '$types/surface-site';
import type { SurfaceSceneConfig } from '$lib/surface-scene/types';

export interface EquirectLayout {
  mapW: number;
  mapH: number;
  mapX: number;
  mapY: number;
}

/** 2:1 map fitted inside a W x H canvas (40 px side margin, 80 px top+bottom). */
export function equirectLayout(W: number, H: number): EquirectLayout {
  const mapW = Math.min(W - 40, (H - 80) * 2);
  const mapH = mapW / 2;
  const mapX = (W - mapW) / 2;
  const mapY = (H - mapH) / 2;
  return { mapW, mapH, mapX, mapY };
}

/** lat/lon (degrees, lon may be negative) -> canvas pixel on the equirect map. */
export function equirectProject(
  lat: number,
  lon: number,
  layout: EquirectLayout,
): { x: number; y: number } {
  let l = lon;
  if (l < 0) l += 360;
  const x = layout.mapX + (l / 360) * layout.mapW;
  const y = layout.mapY + ((90 - lat) / 180) * layout.mapH;
  return { x, y };
}

/**
 * lat/lon (degrees) -> canvas pixel on one lunar disc, or null when the
 * point is on the other hemisphere. Far side mirrors x so longitudes
 * past 90 stay readable left-to-right.
 */
export function lunarDiscProject(
  lat: number,
  lon: number,
  isFarSide: boolean,
  cx: number,
  cy: number,
  discR: number,
): { x: number; y: number } | null {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const z = Math.cos(latRad) * Math.cos(lonRad);
  const onThisSide = isFarSide ? z < 0 : z > 0;
  if (!onThisSide) return null;
  let xLocal = Math.sin(lonRad) * Math.cos(latRad);
  if (isFarSide) xLocal = -xLocal;
  const yLocal = -Math.sin(latRad);
  return { x: cx + xLocal * discR, y: cy + yLocal * discR };
}

export interface Surface2dMapContext {
  canvas: HTMLCanvasElement;
  twoDMode: SurfaceSceneConfig['twoDMode'];
  textureUrl: string;
  /** SvelteKit `base` path prefix for the lunar disc textures. */
  base: string;
  /** Site canvas positions for 2D hit-testing; cleared + refilled each draw. */
  sitePos2d: Map<string, { x: number; y: number }>;
  getView: () => '3d' | '2d';
  getSites: () => SurfaceSite[];
  getSelected: () => SurfaceSite | null;
  getLayerTraverses: () => boolean;
  /** True when the route supplied a traverse loader. */
  hasTraverses: () => boolean;
  getTraverses: () => Record<string, Traverse>;
  getLayerSurface: () => boolean;
  getLayerOrbiters: () => boolean;
  getOrbiterSites: () => SurfaceSite[];
  selectSite: (id: string) => void;
}

export interface Surface2dMap {
  draw2d: () => void;
  on2dClick: (e: MouseEvent) => void;
}

export function createSurface2dMap(ctx: Surface2dMapContext): Surface2dMap {
  const { sitePos2d } = ctx;
  // 2D context + body-specific raster source. Two projection modes:
  //   - 'lunar-polar-discs' (Moon): near + far hemispheres as separate
  //     orthographic discs. Loads two moon_near/_far.jpg assets.
  //   - 'equirectangular' (Mars, future Earth): single 2:1 flat map.
  //     Loads config.textureUrl directly into an HTMLImageElement.
  // Per ADR-038 / ADR-072 — Moon is tidally locked so two-disc is
  // the only honest projection; Mars rotates so equirectangular fits.
  const c2 = ctx.canvas;
  const _maybeCtx = c2.getContext('2d');
  if (!_maybeCtx) throw new Error('2D context unavailable');
  const ctx2: CanvasRenderingContext2D = _maybeCtx;

  const moonNearImg = new Image();
  const moonFarImg = new Image();
  const equirectImg = new Image();
  let nearReady = false;
  let farReady = false;
  let equirectReady = false;
  if (ctx.twoDMode === 'lunar-polar-discs') {
    moonNearImg.src = `${ctx.base}/textures/moon_near.jpg`;
    moonFarImg.src = `${ctx.base}/textures/moon_far.jpg`;
    moonNearImg.onload = () => {
      nearReady = true;
      if (ctx.getView() === '2d') draw2d();
    };
    moonFarImg.onload = () => {
      farReady = true;
      if (ctx.getView() === '2d') draw2d();
    };
  } else {
    equirectImg.src = ctx.textureUrl;
    equirectImg.onload = () => {
      equirectReady = true;
      if (ctx.getView() === '2d') draw2d();
    };
  }

  function draw2d() {
    // Defensive resize
    if (c2.width !== c2.clientWidth || c2.height !== c2.clientHeight) {
      c2.width = c2.clientWidth;
      c2.height = c2.clientHeight;
    }
    const W = c2.width;
    const H = c2.height;
    if (W === 0 || H === 0) return;
    if (ctx.twoDMode === 'equirectangular') {
      drawEquirectangular(W, H);
      return;
    }

    ctx2.fillStyle = '#04040c';
    ctx2.fillRect(0, 0, W, H);

    // v0.1.8 — two side-by-side orthographic moon discs (near + far
    // side) instead of an equirectangular flat map. Each disc shows
    // the moon as a sphere viewed straight-on; sites project via
    // (sin lon · cos lat, -sin lat) and are visible when their
    // hemisphere is the one being shown.
    const stars = 80;
    for (let i = 0; i < stars; i++) {
      const sx = (i * 137.5 * 31 + i * 71) % W;
      const sy = (i * 137.5 * 17 + i * 53) % H;
      ctx2.beginPath();
      ctx2.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
      ctx2.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
      ctx2.fill();
    }

    const discR = Math.min(W * 0.2, H * 0.42);
    const yMid = H * 0.46;
    const nearCx = W * 0.27;
    const farCx = W * 0.73;

    const sites = ctx.getSites();
    const selected = ctx.getSelected();

    const drawDisc = (
      cx: number,
      cy: number,
      labelText: string,
      labelColor: string,
      isFarSide: boolean,
    ) => {
      // Moon body — real photo of this hemisphere clipped to a circle
      // (v0.1.8). Falls back to grey gradient until images load.
      const img = isFarSide ? moonFarImg : moonNearImg;
      const ready = isFarSide ? farReady : nearReady;
      ctx2.save();
      ctx2.beginPath();
      ctx2.arc(cx, cy, discR, 0, Math.PI * 2);
      ctx2.clip();
      if (ready && img.naturalWidth > 0) {
        ctx2.drawImage(img, cx - discR, cy - discR, discR * 2, discR * 2);
      } else {
        const grad = ctx2.createRadialGradient(
          cx - discR * 0.25,
          cy - discR * 0.25,
          discR * 0.05,
          cx,
          cy,
          discR,
        );
        grad.addColorStop(0, '#cdcdc8');
        grad.addColorStop(0.6, '#7c7a76');
        grad.addColorStop(1, '#28272a');
        ctx2.fillStyle = grad;
        ctx2.fillRect(cx - discR, cy - discR, discR * 2, discR * 2);
      }
      ctx2.restore();

      // Limb shadow ring
      ctx2.beginPath();
      ctx2.arc(cx, cy, discR + 0.5, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx2.lineWidth = 1;
      ctx2.stroke();

      // Faint latitude bands at ±30, ±60 — visible as horizontal
      // chord arcs across the disc.
      ctx2.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx2.lineWidth = 0.5;
      for (const lat of [-60, -30, 0, 30, 60]) {
        const y = cy - Math.sin((lat * Math.PI) / 180) * discR;
        const halfWidth = Math.cos((lat * Math.PI) / 180) * discR;
        ctx2.beginPath();
        ctx2.moveTo(cx - halfWidth, y);
        ctx2.lineTo(cx + halfWidth, y);
        ctx2.stroke();
      }

      // Disc label
      ctx2.font = "bold 9px 'Space Mono',monospace";
      ctx2.fillStyle = labelColor;
      ctx2.textAlign = 'center';
      ctx2.fillText(labelText, cx, cy + discR + 24);

      // Site markers — only the ones on this hemisphere. Skip
      // orbiter entries (no lat/lon); they're catalogued in
      // moon-sites.json but not yet rendered on /moon — see filter
      // in onMount, and the Mars-first orbiter rollout in PRD-009.
      for (const site of sites) {
        if (site.lat == null || site.lon == null) continue;
        const p = lunarDiscProject(site.lat, site.lon, isFarSide, cx, cy, discR);
        if (!p) continue;
        const px = p.x;
        const py = p.y;

        const color = colorFor(site);
        const isSel = selected?.id === site.id;

        // Glow
        const gl = ctx2.createRadialGradient(px, py, 0, px, py, 10);
        gl.addColorStop(0, color + '99');
        gl.addColorStop(1, 'transparent');
        ctx2.beginPath();
        ctx2.arc(px, py, 10, 0, Math.PI * 2);
        ctx2.fillStyle = gl;
        ctx2.fill();

        if (isSel) {
          ctx2.beginPath();
          ctx2.arc(px, py, 9, 0, Math.PI * 2);
          ctx2.strokeStyle = '#fff';
          ctx2.lineWidth = 1.5;
          ctx2.stroke();
        }

        ctx2.beginPath();
        ctx2.arc(px, py, 4, 0, Math.PI * 2);
        ctx2.fillStyle = color;
        ctx2.fill();

        // Site label
        ctx2.font = "7px 'Space Mono',monospace";
        ctx2.fillStyle = color + 'cc';
        ctx2.shadowColor = 'rgba(0,0,0,0.85)';
        ctx2.shadowBlur = 4;
        ctx2.textAlign = 'left';
        ctx2.fillText(site.name ?? site.id, px + 6, py + 3);
        ctx2.shadowBlur = 0;

        sitePos2d.set(site.id, { x: px, y: py });
      }
    };

    sitePos2d.clear();
    drawDisc(nearCx, yMid, m.surface_near_side(), 'rgba(220,220,200,0.85)', false);
    drawDisc(farCx, yMid, m.surface_far_side(), 'rgba(220,220,200,0.85)', true);

    // Nation legend is now the shared interactive HTML overlay (#363) —
    // painted for both 2D and 3D outside the canvas. No canvas legend here.
  }

  // Equirectangular 2D mode — Mars (and future Earth-surface). Single
  // 2:1 flat map with optional graticule + traverses + markers +
  // orbiter strip. Port of /mars's draw2d (per ADR-038 / ADR-072
  // Drift 18 — 2D pick tolerance set to 20 in on2dClick below).
  function drawEquirectangular(W: number, H: number) {
    const sites = ctx.getSites();
    const selected = ctx.getSelected();
    ctx2.clearRect(0, 0, W, H);
    ctx2.fillStyle = '#04040c';
    ctx2.fillRect(0, 0, W, H);

    // Equirectangular map: 2:1 aspect → fit within container.
    const layout = equirectLayout(W, H);
    const { mapW, mapH, mapX, mapY } = layout;

    if (equirectReady) {
      ctx2.drawImage(equirectImg, mapX, mapY, mapW, mapH);
    } else {
      const gr = ctx2.createLinearGradient(mapX, mapY, mapX, mapY + mapH);
      gr.addColorStop(0, '#3a1a0e');
      gr.addColorStop(1, '#2a0e06');
      ctx2.fillStyle = gr;
      ctx2.fillRect(mapX, mapY, mapW, mapH);
    }

    // Subtle frame
    ctx2.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx2.lineWidth = 1;
    ctx2.strokeRect(mapX, mapY, mapW, mapH);

    // Lat/lon graticule — every 30°
    ctx2.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx2.lineWidth = 0.5;
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = mapY + ((90 - lat) / 180) * mapH;
      ctx2.beginPath();
      ctx2.moveTo(mapX, y);
      ctx2.lineTo(mapX + mapW, y);
      ctx2.stroke();
    }
    for (let lon = 30; lon < 360; lon += 30) {
      const x = mapX + (lon / 360) * mapW;
      ctx2.beginPath();
      ctx2.moveTo(x, mapY);
      ctx2.lineTo(x, mapY + mapH);
      ctx2.stroke();
    }

    // Traverse polylines beneath markers (active = bright, ended = muted).
    if (ctx.getLayerTraverses() && ctx.hasTraverses()) {
      for (const tr of Object.values(ctx.getTraverses())) {
        if (!tr.points || tr.points.length < 2) continue;
        const site = sites.find((s) => s.id === tr.rover_id);
        ctx2.strokeStyle = site ? colorFor(site) : '#ffffff';
        ctx2.globalAlpha = tr.status === 'ACTIVE' ? 0.95 : 0.7;
        ctx2.lineWidth = 1.6;
        ctx2.beginPath();
        for (let i = 0; i < tr.points.length; i++) {
          const { x: px, y: py } = equirectProject(tr.points[i][0], tr.points[i][1], layout);
          if (i === 0) ctx2.moveTo(px, py);
          else ctx2.lineTo(px, py);
        }
        ctx2.stroke();
        ctx2.globalAlpha = 1;
      }
    }

    // Surface markers
    sitePos2d.clear();
    if (ctx.getLayerSurface()) {
      for (const site of sites) {
        if (site.kind !== 'surface') continue;
        if (site.lat == null || site.lon == null) continue;
        const { x, y } = equirectProject(site.lat, site.lon, layout);
        sitePos2d.set(site.id, { x, y });
        const isFailed = site.status === 'CRASHED' || site.status === 'LOST';
        if (selected?.id === site.id) {
          ctx2.fillStyle = colorFor(site);
          ctx2.shadowColor = colorFor(site);
          ctx2.shadowBlur = 12;
          ctx2.beginPath();
          ctx2.arc(x, y, 7, 0, Math.PI * 2);
          ctx2.fill();
          ctx2.shadowBlur = 0;
        }
        ctx2.fillStyle = colorFor(site);
        ctx2.beginPath();
        ctx2.arc(x, y, 4, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.strokeStyle = '#ffffff';
        ctx2.lineWidth = 1;
        if (isFailed) ctx2.setLineDash([2, 2]);
        ctx2.beginPath();
        ctx2.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx2.stroke();
        ctx2.setLineDash([]);
      }
    }

    // Orbiter "presence indicator" strip along the top.
    if (ctx.getLayerOrbiters()) {
      const strip = mapY - 16;
      let x = mapX;
      ctx2.font = "bold 7px 'Space Mono',monospace";
      ctx2.fillStyle = 'rgba(255,255,255,0.5)';
      ctx2.textAlign = 'left';
      ctx2.fillText('IN ORBIT', x, strip);
      x += 60;
      for (const o of ctx.getOrbiterSites()) {
        ctx2.fillStyle = colorFor(o);
        ctx2.beginPath();
        ctx2.arc(x, strip - 3, 4, 0, Math.PI * 2);
        ctx2.fill();
        sitePos2d.set(o.id, { x, y: strip - 3 });
        x += 14;
      }
    }

    // Nation legend is the shared interactive HTML overlay (#363) — not
    // painted into the canvas anymore.
  }

  function on2dClick(e: MouseEvent) {
    const id = pickClosest2d({
      canvas: c2,
      clientX: e.clientX,
      clientY: e.clientY,
      positions: sitePos2d,
      tolerance: 20,
    });
    if (id) ctx.selectSite(id);
  }

  return { draw2d, on2dClick };
}
