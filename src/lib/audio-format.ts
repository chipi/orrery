// Shared time formatter used by AudioOverlay transport, tour bar, and the
// /library/episodes index. `withHours` switches between m:ss and h:mm:ss
// depending on whether the value can exceed an hour (tour totals, multi-hour
// playlists). Non-finite / negative input clamps to `0:00` / `0:00:00`.

export interface FmtTimeOptions {
  withHours?: boolean;
}

export function fmtTime(sec: number, opts: FmtTimeOptions = {}): string {
  const safe = Number.isFinite(sec) && sec >= 0 ? Math.floor(sec) : 0;

  if (opts.withHours) {
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
