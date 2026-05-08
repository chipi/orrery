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

export type BlueprintView = 'top' | 'side';

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
  isVisitor?: boolean;
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

  // Pick scene axes per view. Both views show X horizontally
  // (forward-aft of station). Vertical axis differs: side = Y (zenith-
  // nadir), top = Z (port-starboard).
  const horizAxis: 'x' | 'y' | 'z' = 'x';
  const vertAxis: 'x' | 'y' | 'z' = view === 'side' ? 'y' : 'z';

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
      isVisitor: m.isVisitor,
    };
  });
}

/** Find which module (if any) sits under a pixel coordinate. */
export function hitTest(modules: ProjectedModule[], px: number, py: number): string | null {
  // Last-drawn = topmost; iterate reverse for proper z-order priority.
  for (let i = modules.length - 1; i >= 0; i--) {
    const m = modules[i];
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

  // View label, top-left.
  ctx.fillStyle = BLUEPRINT_LABEL;
  ctx.font = '11px "Space Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(view === 'top' ? 'TOP VIEW · XZ' : 'SIDE VIEW · XY', 12, 12);
  // Axis hints, bottom-right.
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    view === 'top'
      ? '← AFT  /  FWD →    ↑ STARBOARD  /  PORT ↓'
      : '← AFT  /  FWD →    ↑ ZENITH  /  NADIR ↓',
    canvasW - 12,
    canvasH - 12,
  );

  // Modules.
  for (const m of modules) {
    const isSel = m.id === selectedId;
    const isHov = m.id === hoveredId;
    const fill = m.isVisitor ? BLUEPRINT_VISITOR_FILL : BLUEPRINT_FILL;
    const stroke = isSel
      ? BLUEPRINT_SELECTED
      : isHov
        ? BLUEPRINT_HOVER
        : m.isVisitor
          ? BLUEPRINT_VISITOR_OUTLINE
          : BLUEPRINT_OUTLINE;

    ctx.fillStyle = fill;
    ctx.fillRect(m.px, m.py, m.pw, m.ph);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = isSel ? 2 : 1;
    ctx.strokeRect(m.px + 0.5, m.py + 0.5, m.pw - 1, m.ph - 1);

    // Label centred on the module rectangle if there's room; otherwise
    // anchored just below it.
    ctx.font = '10px "Space Mono", monospace';
    ctx.fillStyle = BLUEPRINT_LABEL;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = m.name.toUpperCase();
    if (m.pw > 60 && m.ph > 16) {
      ctx.fillText(label, m.px + m.pw / 2, m.py + m.ph / 2);
    } else {
      ctx.textBaseline = 'top';
      ctx.fillText(label, m.px + m.pw / 2, m.py + m.ph + 4);
    }
  }
}
