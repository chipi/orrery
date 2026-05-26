/**
 * 2D-canvas nation-color legend for surface-map flat view (#42).
 *
 * Renders inline "● USA   ● USSR/Russia   ● China …" at a fixed Y,
 * advancing X by measured text width + 32 px padding. Both /moon and
 * /mars's `draw2d()` painted this verbatim.
 */

export function drawNationLegend2d(
  ctx: CanvasRenderingContext2D,
  { startX, y, palette }: { startX: number; y: number; palette: Record<string, string> },
): void {
  let legendX = startX;
  for (const [nation, color] of Object.entries(palette)) {
    ctx.beginPath();
    ctx.arc(legendX + 5, y + 6, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(nation, legendX + 12, y + 9);
    legendX += ctx.measureText(nation).width + 32;
  }
}
