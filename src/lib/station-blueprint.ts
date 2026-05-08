/**
 * 2D blueprint projection + drawing for /iss and /tiangong.
 * Renders the same canonical module positions used by the 3D proxy
 * models (iss-proxy-model.ts, tiangong-proxy-model.ts) as a flat
 * blueprint diagram with selectable modules.
 *
 * Two projections per station: 'top' (XZ-plane) and 'side' (XY-plane).
 * Each projection maps scene units → canvas pixels and exposes a
 * hit-test API for click → module selection.
 */

export type BlueprintView = 'top' | 'side' | 'front';

export type BlueprintKind = 'module' | 'visitor' | 'truss' | 'solar' | 'radiator' | 'pma';

export interface BlueprintModule {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  /** Length along the module's long axis (scene units). */
  len: number;
  /** Cylinder radius (scene units). */
  radius: number;
  /** Long axis direction in scene frame. */
  axis: 'x' | 'y' | 'z';
  /** Render kind — defaults to 'module'. Controls colour + clickability + label. */
  kind?: BlueprintKind;
  /** @deprecated use kind: 'visitor'. Retained for back-compat. */
  isVisitor?: boolean;
}

export interface ProjectedModule {
  id: string;
  name: string;
  /** Top-left pixel coords of the module's drawn rectangle. */
  px: number;
  py: number;
  /** Pixel width / height of the drawn rectangle. */
  pw: number;
  ph: number;
  kind: BlueprintKind;
}

/**
 * Project a list of modules to canvas pixel coords for the given view.
 * Computes a uniform scale factor that fits all modules + a generous
 * margin into the canvas, then maps each module to a pixel rectangle.
 */
export function projectModules(
  modules: BlueprintModule[],
  view: BlueprintView,
  canvasW: number,
  canvasH: number,
): ProjectedModule[] {
  if (modules.length === 0) return [];

  // Pick scene axes per view.
  //   top/side: X horizontal (forward-aft); vertical = Z (port-stbd) or Y (zenith).
  //   front: looking along -X (from forward end inward) → Z horizontal, Y vertical.
  const horizAxis: 'x' | 'y' | 'z' = view === 'front' ? 'z' : 'x';
  const vertAxis: 'x' | 'y' | 'z' = view === 'top' ? 'z' : 'y';

  // Compute scene-frame bounds across all modules.
  let minH = Infinity;
  let maxH = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const m of modules) {
    const halfLen = m.len / 2;
    const halfRad = m.radius;
    // For long axis along horizAxis the module extends [-halfLen, +halfLen]
    // along H and [-halfRad, +halfRad] along V (and vice versa).
    const hHalf = m.axis === horizAxis ? halfLen : halfRad;
    const vHalf = m.axis === vertAxis ? halfLen : halfRad;
    const hCoord = m[horizAxis];
    const vCoord = m[vertAxis];
    minH = Math.min(minH, hCoord - hHalf);
    maxH = Math.max(maxH, hCoord + hHalf);
    minV = Math.min(minV, vCoord - vHalf);
    maxV = Math.max(maxV, vCoord + vHalf);
  }

  const sceneW = maxH - minH;
  const sceneH = maxV - minV;

  // Generous margin (canvas units), then choose uniform scale that fits.
  const margin = 36;
  const usableW = canvasW - 2 * margin;
  const usableH = canvasH - 2 * margin;
  const scale = Math.min(usableW / sceneW, usableH / sceneH);

  // Centring offsets: place scene centre at canvas centre.
  const sceneCenterH = (minH + maxH) / 2;
  const sceneCenterV = (minV + maxV) / 2;
  const offsetX = canvasW / 2 - sceneCenterH * scale;
  // Vertical scene axis flipped — scene +Y is zenith (up) but canvas +Y is down.
  const offsetY = canvasH / 2 + sceneCenterV * scale;

  return modules.map((m) => {
    const halfLen = m.len / 2;
    const halfRad = m.radius;
    const hHalf = m.axis === horizAxis ? halfLen : halfRad;
    const vHalf = m.axis === vertAxis ? halfLen : halfRad;
    const hCoord = m[horizAxis];
    const vCoord = m[vertAxis];
    const cx = hCoord * scale + offsetX;
    const cy = -vCoord * scale + offsetY;
    const pw = hHalf * 2 * scale;
    const ph = vHalf * 2 * scale;
    return {
      id: m.id,
      name: m.name,
      px: cx - pw / 2,
      py: cy - ph / 2,
      pw,
      ph,
      kind: m.kind ?? (m.isVisitor ? 'visitor' : 'module'),
    };
  });
}

/** Find which module (if any) sits under a pixel coordinate. Only clickable
 * kinds (modules + visitors) participate; structural elements (truss, arrays,
 * radiators, PMAs) are not selectable. */
export function hitTest(modules: ProjectedModule[], px: number, py: number): string | null {
  // Last-drawn = topmost; iterate reverse for proper z-order priority.
  for (let i = modules.length - 1; i >= 0; i--) {
    const m = modules[i];
    if (m.kind !== 'module' && m.kind !== 'visitor') continue;
    if (px >= m.px && px <= m.px + m.pw && py >= m.py && py <= m.py + m.ph) {
      return m.id;
    }
  }
  return null;
}

const BLUEPRINT_BG = '#04080f';
const BLUEPRINT_GRID = 'rgba(78, 205, 196, 0.08)';
const BLUEPRINT_OUTLINE = 'rgba(78, 205, 196, 0.7)';
const BLUEPRINT_FILL = 'rgba(78, 205, 196, 0.06)';
const BLUEPRINT_VISITOR_OUTLINE = 'rgba(255, 200, 80, 0.75)';
const BLUEPRINT_VISITOR_FILL = 'rgba(255, 200, 80, 0.08)';
const BLUEPRINT_SELECTED = '#4ecdc4';
const BLUEPRINT_HOVER = 'rgba(78, 205, 196, 0.95)';
const BLUEPRINT_LABEL = 'rgba(220, 230, 235, 0.8)';

export function drawBlueprint(
  ctx: CanvasRenderingContext2D,
  modules: ProjectedModule[],
  selectedId: string | null,
  hoveredId: string | null,
  view: BlueprintView,
  canvasW: number,
  canvasH: number,
): void {
  // Background.
  ctx.fillStyle = BLUEPRINT_BG;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Grid (every ~32 px, low contrast).
  ctx.strokeStyle = BLUEPRINT_GRID;
  ctx.lineWidth = 1;
  for (let x = 0; x < canvasW; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvasH);
    ctx.stroke();
  }
  for (let y = 0; y < canvasH; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvasW, y + 0.5);
    ctx.stroke();
  }

  // Axis hints, bottom-CENTER. (Top-left view label removed — the HUD
  // chip already shows the same view info. Bottom-right was overlapping
  // the credits + library links and the panel; centre keeps it clear of
  // both edges.)
  ctx.fillStyle = BLUEPRINT_LABEL;
  ctx.font = '11px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    view === 'top'
      ? '← AFT  /  FWD →    ↑ STARBOARD  /  PORT ↓'
      : view === 'side'
        ? '← AFT  /  FWD →    ↑ ZENITH  /  NADIR ↓'
        : '← STARBOARD  /  PORT →    ↑ ZENITH  /  NADIR ↓',
    canvasW / 2,
    canvasH - 12,
  );

  // Per-kind palette. Structural elements (truss / solar / radiator / pma)
  // sit BEHIND modules + visitors so the foreground items read clearly.
  const STYLE: Record<BlueprintKind, { fill: string; stroke: string }> = {
    module: { fill: BLUEPRINT_FILL, stroke: BLUEPRINT_OUTLINE },
    visitor: { fill: BLUEPRINT_VISITOR_FILL, stroke: BLUEPRINT_VISITOR_OUTLINE },
    truss: { fill: 'rgba(154, 158, 168, 0.18)', stroke: 'rgba(154, 158, 168, 0.6)' },
    solar: { fill: 'rgba(60, 110, 200, 0.22)', stroke: 'rgba(120, 170, 240, 0.7)' },
    radiator: { fill: 'rgba(220, 230, 240, 0.18)', stroke: 'rgba(220, 230, 240, 0.55)' },
    pma: { fill: 'rgba(200, 160, 76, 0.28)', stroke: 'rgba(200, 160, 76, 0.85)' },
  };

  // Sort: structural first, modules + visitors on top so they draw above.
  const drawOrder: BlueprintKind[] = ['truss', 'solar', 'radiator', 'pma', 'module', 'visitor'];
  const sorted = [...modules].sort((a, b) => drawOrder.indexOf(a.kind) - drawOrder.indexOf(b.kind));

  // First pass: rectangles only.
  for (const m of sorted) {
    const isSel = m.id === selectedId;
    const isHov = m.id === hoveredId;
    const style = STYLE[m.kind];
    const stroke = isSel
      ? BLUEPRINT_SELECTED
      : isHov && (m.kind === 'module' || m.kind === 'visitor')
        ? BLUEPRINT_HOVER
        : style.stroke;

    ctx.fillStyle = style.fill;
    ctx.fillRect(m.px, m.py, m.pw, m.ph);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = isSel ? 2 : 1;
    ctx.strokeRect(m.px + 0.5, m.py + 0.5, m.pw - 1, m.ph - 1);
  }

  // Labels — second pass with collision avoidance. Compute desired
  // rect for each label, then shift overlapping ones vertically until
  // they're clear of already-placed labels.
  ctx.font = '10px "Space Mono", monospace';
  const labelHeight = 14; // approx for 10px font + padding
  const labelPad = 3;
  const placedRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  const drawCalls: Array<{
    x: number;
    y: number;
    text: string;
    leader?: { fromX: number; fromY: number; toX: number; toY: number };
  }> = [];

  for (const m of modules) {
    // Labels only on clickable items — structural elements stay clean.
    if (m.kind !== 'module' && m.kind !== 'visitor') continue;
    const text = m.name.toUpperCase();
    const textW = ctx.measureText(text).width;
    // Desired position: centred on module if there's room; otherwise
    // immediately below.
    const cx = m.px + m.pw / 2;
    let cy: number;
    if (m.pw > 60 && m.ph > 16) {
      cy = m.py + m.ph / 2;
    } else {
      cy = m.py + m.ph + labelHeight / 2 + 2;
    }
    let rect = {
      x: cx - textW / 2 - labelPad,
      y: cy - labelHeight / 2,
      w: textW + 2 * labelPad,
      h: labelHeight,
    };

    // Collision avoidance — shift down in 16-px steps until clear of
    // every previously-placed label rect. Cap at ~6 attempts to avoid
    // runaway shifts in extremely cluttered spots.
    const moduleAnchorY = cy;
    let attempts = 0;
    while (attempts < 6 && placedRects.some((p) => rectsOverlap(rect, p))) {
      cy += labelHeight + 2;
      rect = {
        x: cx - textW / 2 - labelPad,
        y: cy - labelHeight / 2,
        w: textW + 2 * labelPad,
        h: labelHeight,
      };
      attempts++;
    }

    placedRects.push(rect);
    // Draw a leader line from module centre to label if we had to shift
    // it more than a couple of pixels (otherwise the label looks
    // unanchored).
    const leader =
      Math.abs(cy - moduleAnchorY) > labelHeight
        ? {
            fromX: cx,
            fromY: m.py + m.ph,
            toX: cx,
            toY: cy - labelHeight / 2 - 1,
          }
        : undefined;
    drawCalls.push({ x: cx, y: cy, text, leader });
  }

  // Draw leader lines first (under labels)
  ctx.strokeStyle = 'rgba(78, 205, 196, 0.3)';
  ctx.lineWidth = 1;
  for (const dc of drawCalls) {
    if (dc.leader) {
      ctx.beginPath();
      ctx.moveTo(dc.leader.fromX, dc.leader.fromY);
      ctx.lineTo(dc.leader.toX, dc.leader.toY);
      ctx.stroke();
    }
  }

  // Draw labels with a faint background pill so they read on top of
  // overlapping rectangles.
  for (const dc of drawCalls) {
    ctx.fillStyle = 'rgba(4, 8, 15, 0.78)';
    const w = ctx.measureText(dc.text).width;
    ctx.fillRect(dc.x - w / 2 - labelPad, dc.y - labelHeight / 2, w + 2 * labelPad, labelHeight);
    ctx.fillStyle = BLUEPRINT_LABEL;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dc.text, dc.x, dc.y);
  }
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}
