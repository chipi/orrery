/**
 * Pure classification helpers for `scripts/prune-orphan-images.ts`.
 *
 * Display bases are WebP-only since #383, but the `.1x1.jpg` crops (and a few
 * `.jpg` hotspot/texture bases) kept their extension, so a variant's base can
 * be any of jpg/jpeg/png/webp.
 */
const IMG_EXT = ['webp', 'jpg', 'jpeg', 'png'];

/** `NN.1x1.jpg` -> `NN.webp`, `NN.jpg`, `NN.jpeg`, `NN.png` (static-relative or any prefix). */
export function baseCandidates(variantPath: string): string[] {
  const stem = variantPath.replace(/\.(16x9|4x3|1x1)\.(jpe?g|png|webp)$/i, '');
  return IMG_EXT.map((e) => `${stem}.${e}`);
}

export function hasLiveBase(variantPath: string, onDisk: ReadonlySet<string>): boolean {
  return baseCandidates(variantPath).some((p) => onDisk.has(p));
}

/**
 * Does a manifest key (`/images/x/01.jpg`) still point at something? The key is
 * a logical path: the served file, its `.webp` twin, or the LFS master all count.
 * `exists` takes repo-relative paths.
 */
export function manifestKeyLive(key: string, exists: (repoRel: string) => boolean): boolean {
  if (!key.startsWith('/images/')) return true;
  const rel = key.slice('/images/'.length);
  const webp = rel.replace(/\.(jpe?g|png)$/i, '.webp');
  return (
    exists(`static/images/${rel}`) || exists(`static/images/${webp}`) || exists(`masters/${rel}`)
  );
}
