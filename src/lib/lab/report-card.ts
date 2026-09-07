/**
 * PNG share card (G · #536 · operator-chosen extra scope) — a 1200×630
 * client-composed image: goal title, up to four kernel numbers, the goal's
 * illustration (when one exists, drawn WITH its register badge — the honesty
 * line survives compositing), and the share URL. Pure canvas, zero deps,
 * built on click only (pointer-events rule: heavy work behind explicit
 * action). The kernel numbers come straight from computed cells — this module
 * formats, it never computes.
 */
export interface ReportCardLine {
  label: string;
  value: string;
}

export interface ReportCardInput {
  title: string;
  lines: ReportCardLine[];
  /** Resolved asset URL of the goal illustration, if any. */
  illustrationUrl?: string;
  /** The permanent register badge text (always drawn when art is drawn). */
  illustrationBadge: string;
  shareUrl: string;
  wordmark: string;
}

const W = 1200;
const H = 630;

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Never hang the card on an image that fires neither event (holistic
    // follow-on): after 4s the card composes without art, graceful-absent.
    const timer = setTimeout(() => resolve(null), 4000);
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null); // graceful-absent: card renders without art
    };
    img.src = url;
  });
}

/** Compose the card; returns a PNG blob (null only if canvas is unavailable). */
export async function composeReportCard(input: ReportCardInput): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background — the Lab's dark slate.
  ctx.fillStyle = '#0b0f17';
  ctx.fillRect(0, 0, W, H);

  // Illustration panel (right 40%) when present.
  const art = input.illustrationUrl ? await loadImage(input.illustrationUrl) : null;
  const artW = art ? Math.floor(W * 0.4) : 0;
  if (art) {
    const panelX = W - artW;
    // Cover-fit crop.
    const scale = Math.max(artW / art.width, H / art.height);
    const dw = art.width * scale;
    const dh = art.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX, 0, artW, H);
    ctx.clip();
    ctx.drawImage(art, panelX + (artW - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.restore();
    // The register badge — non-negotiable whenever art is drawn.
    ctx.font = '600 18px system-ui, sans-serif';
    const badge = input.illustrationBadge.toUpperCase();
    const bw = ctx.measureText(badge).width + 28;
    ctx.fillStyle = 'rgba(11, 15, 23, 0.85)';
    ctx.beginPath();
    ctx.roundRect(panelX + 16, H - 52, bw, 34, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(badge, panelX + 30, H - 29);
  }

  const textW = W - artW - 120;

  // Wordmark.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText(input.wordmark.toUpperCase(), 60, 78);

  // Title (wrap to two lines max).
  ctx.fillStyle = '#f5f7fa';
  ctx.font = '700 52px system-ui, sans-serif';
  const words = input.title.split(' ');
  let line = '';
  let y = 160;
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (ctx.measureText(probe).width > textW && line) {
      ctx.fillText(line, 60, y);
      y += 62;
      line = w;
      if (y > 260) break;
    } else {
      line = probe;
    }
  }
  if (line && y <= 260) ctx.fillText(line, 60, y);

  // Kernel numbers.
  let ly = y + 80;
  for (const l of input.lines.slice(0, 4)) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '400 24px system-ui, sans-serif';
    ctx.fillText(l.label, 60, ly);
    ctx.fillStyle = '#8fd4ff';
    ctx.font = '600 32px ui-monospace, monospace';
    ctx.fillText(l.value, 60, ly + 38);
    ly += 92;
    if (ly > H - 90) break;
  }

  // Share URL footer.
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '400 20px ui-monospace, monospace';
  ctx.fillText(input.shareUrl.slice(0, 90), 60, H - 40);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Trigger a browser download of the composed card. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // Appended + delayed revoke (holistic MINOR-5): Safari aborts downloads
  // whose blob URL is revoked before the download actually starts.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
