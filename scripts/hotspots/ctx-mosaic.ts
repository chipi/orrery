import { createReadStream, existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';

/**
 * Murray Lab Global CTX Mosaic V01 — tile fetcher.
 *
 * Reference: Dickson et al. 2024, "A Global, Blended CTX Mosaic of
 * Mars with Vectorized Seam Mapping: A New Mosaicking Pipeline
 * Using Principles of Non-Destructive Image Editing" — Earth and
 * Space Science (DOI 10.1029/2024EA003555).
 *
 * The mosaic is published as 3,960 × 4°×4° tiles in equirectangular
 * projection, 5 m/px, < 200 m absolute registration error. Each tile
 * is a ZIP containing:
 *   - MurrayLab_GlobalCTXMosaic_V01_E{lon}_N{lat}.tif  (the GeoTIFF
 *     mosaic; typically ~15-20 GB uncompressed at 5 m/px over
 *     ~190k×190k pixels)
 *   - MurrayLab_GlobalCTXMosaic_V01_E{lon}_N{lat}_Imageseams.shp +
 *     siblings (vector seam map)
 *   - MurrayLab_GlobalCTXMosaic_V01_E{lon}_N{lat}_TiePoints.shp +
 *     siblings (tie-point registration map)
 *   - README.txt
 *
 * We only need the GeoTIFF for the crop. The other artifacts are
 * dropped after extraction to keep cache size manageable.
 *
 * URL pattern (signed -180..+180 longitude convention, east positive):
 *   https://murray-lab.caltech.edu/CTX/V01/tiles/MurrayLab_GlobalCTXMosaic_V01_E{LON}_N{LAT}.zip
 *
 * Where LON = floor(lon / 4) * 4 (padded with sign as e.g. "E136"
 * or "E-004"), and LAT = floor(lat / 4) * 4 (e.g. "N16" or "N-08").
 *
 * Cache layout:
 *   .image-cache/ctx-mosaic/
 *     E136_N-08.zip                       (downloaded ZIP, dropped after extract)
 *     E136_N-08/                           (extracted dir — only the .tif kept)
 *       MurrayLab_GlobalCTXMosaic_V01_E136_N-08.tif
 *
 * Per-tile bandwidth: ~1.7 GB download, ~17 GB uncompressed on disk.
 * For the v0.7 set of 13 Mars sites, ~8-10 unique tiles are needed
 * (some sites share a tile e.g. Curiosity + Spirit are both in the
 * -8°N latitude band, Opportunity + Schiaparelli + Meridiani are
 * all in the +/-4° latitude band). Total cache ~80-170 GB; operator
 * can clear after a successful run.
 */

const TILE_CACHE_DIR = path.join('.image-cache', 'ctx-mosaic');
const TILE_URL_BASE = 'https://murray-lab.caltech.edu/CTX/V01/tiles';
/** Per-URL download attempts on flaky connections. Same shape as
 *  the HiRISE downloader. ZIP is one big blob — no resume. */
const DOWNLOAD_MAX_ATTEMPTS = 3;

/**
 * Compute the tile name `E{lon}_N{lat}` for the (lat, lon) point.
 * Longitudes use signed -180..+180 convention (east positive) — the
 * Murray Lab tiles span the planet on a 4° grid starting at
 * (-180°, -88°) → (180°, 88°). Both axes truncate toward -inf.
 */
export function tileNameForLatLon(lat: number, lon: number): string {
  // Normalise lon into -180..+180 (some upstream sidecars use 0-360).
  let lonSigned = lon;
  if (lonSigned > 180) lonSigned -= 360;
  if (lonSigned < -180) lonSigned += 360;
  const tileLon = Math.floor(lonSigned / 4) * 4;
  const tileLat = Math.floor(lat / 4) * 4;
  // Mosaic tile grid extends to ±88°; clamp so callers can't request
  // a non-existent polar tile.
  const lonClamp = Math.max(-180, Math.min(176, tileLon));
  const latClamp = Math.max(-88, Math.min(84, tileLat));
  return `E${formatLon(lonClamp)}_N${formatLat(latClamp)}`;
}

/**
 * Murray Lab tile naming (confirmed against the published tile
 * listing):
 *   - Longitude axis: always 3 digits of absolute value.
 *     "E000", "E004", "E136"     for positives 0–176
 *     "E-004", "E-048", "E-180"  for negatives -4 to -180
 *   - Latitude axis: always 2 digits of absolute value.
 *     "N00", "N04", "N84"        for positives 0–84
 *     "N-04", "N-08", "N-88"     for negatives -4 to -88
 *
 * Note: the lon axis values are always MULTIPLES OF 4 (0, 4, 8 …),
 * but Murray Lab pads to 3 digits regardless (E000, E004, E008 …).
 * Negative sign counts as a character but NOT toward the 3-digit
 * absolute-value width — so "-048" is a 4-character token.
 */
function formatLon(n: number): string {
  const abs = String(Math.abs(n)).padStart(3, '0');
  return n < 0 ? `-${abs}` : abs;
}

function formatLat(n: number): string {
  const abs = String(Math.abs(n)).padStart(2, '0');
  return n < 0 ? `-${abs}` : abs;
}

/**
 * Build the full Murray Lab ZIP URL for a given tile.
 */
export function tileUrlForName(tileName: string): string {
  return `${TILE_URL_BASE}/MurrayLab_GlobalCTXMosaic_V01_${tileName}.zip`;
}

/**
 * Download + extract the Murray Lab CTX mosaic tile that contains
 * (lat, lon), returning the local filesystem path to the extracted
 * GeoTIFF. Idempotent — cache-hits return immediately.
 *
 * Throws on download failure (after retries). Caller decides whether
 * to skip the site or fail the run.
 */
export async function ensureCtxMosaicTile(lat: number, lon: number): Promise<string> {
  const tile = tileNameForLatLon(lat, lon);
  const tileDir = path.join(TILE_CACHE_DIR, tile);
  // First check if any .tif is already extracted in tileDir.
  const existing = await findGeotiff(tileDir);
  if (existing) return existing;
  await fs.mkdir(tileDir, { recursive: true });
  const url = tileUrlForName(tile);
  const zipPath = path.join(TILE_CACHE_DIR, `${tile}.zip`);
  await downloadWithRetry(url, zipPath);
  console.log(`  extracting ${path.basename(zipPath)}…`);
  const result = spawnSync('unzip', ['-o', '-q', zipPath, '-d', tileDir]);
  if (result.status !== 0) {
    throw new Error(`Failed to unzip ${zipPath}: ${result.stderr?.toString() ?? 'unknown error'}`);
  }
  await flattenSingleSubdir(tileDir, tile);
  // Drop ZIP + non-GeoTIFF artifacts to reclaim disk.
  await fs.unlink(zipPath).catch(() => {});
  for (const entry of await fs.readdir(tileDir)) {
    const ep = path.join(tileDir, entry);
    const stat = await fs.stat(ep);
    if (stat.isFile() && !entry.endsWith('.tif')) {
      await fs.unlink(ep).catch(() => {});
    }
    if (stat.isDirectory()) {
      await fs.rm(ep, { recursive: true, force: true }).catch(() => {});
    }
  }
  const found = await findGeotiff(tileDir);
  if (!found) {
    throw new Error(
      `Extraction produced no GeoTIFF under ${tileDir} — Murray Lab archive layout may have changed.`,
    );
  }
  return found;
}

/** Locate any .tif file directly under tileDir. Murray Lab uses a
 *  naming convention that has varied across releases
 *  (`MurrayLab_GlobalCTXMosaic_V01_E136_N-08.tif` vs
 *  `MurrayLab_CTX_V01_E136_N-08_Mosaic.tif`), so we discover by
 *  extension rather than build the expected path up-front. */
async function findGeotiff(dir: string): Promise<string | null> {
  if (!existsSync(dir)) return null;
  for (const entry of await fs.readdir(dir)) {
    if (entry.toLowerCase().endsWith('.tif')) {
      return path.join(dir, entry);
    }
  }
  return null;
}

/**
 * Murray Lab sometimes nests tile contents inside an extra named
 * subdirectory (e.g. `tileDir/MurrayLab_GlobalCTXMosaic_V01_E136_N-08/`).
 * If we detect a single subdirectory after extraction, hoist its
 * contents up one level so callers find the GeoTIFF at the expected
 * path.
 */
async function flattenSingleSubdir(tileDir: string, tileName: string): Promise<void> {
  const entries = await fs.readdir(tileDir);
  if (entries.length !== 1) return;
  const inner = path.join(tileDir, entries[0]);
  const stat = await fs.stat(inner);
  if (!stat.isDirectory()) return;
  for (const child of await fs.readdir(inner)) {
    await fs.rename(path.join(inner, child), path.join(tileDir, child));
  }
  await fs.rmdir(inner);
  void tileName;
}

async function downloadWithRetry(url: string, outPath: string): Promise<void> {
  // Node fetch chokes on Caltech's TLS chain (InCommon → USERTrust)
  // with UNABLE_TO_VERIFY_LEAF_SIGNATURE; the host's system trust
  // store has the right CAs but Node's bundled CAs don't. Rather
  // than disable TLS verification process-wide, shell out to curl
  // (uses system CAs, universally available, handles flaky network
  // retries gracefully). `--retry`/`--retry-delay` give us free
  // exponential-ish backoff for resumable failures.
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= DOWNLOAD_MAX_ATTEMPTS; attempt++) {
    const label = attempt > 1 ? ` (attempt ${attempt}/${DOWNLOAD_MAX_ATTEMPTS})` : '';
    console.log(`  downloading ${url.slice(0, 80)}…${label}`);
    const t0 = Date.now();
    if (existsSync(outPath)) await fs.unlink(outPath);
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(
          'curl',
          [
            '-sSL',
            '--fail',
            '--connect-timeout',
            '30',
            '--max-time',
            '1800', // 30 min ceiling per attempt for a ~1.7GB file
            '-o',
            outPath,
            url,
          ],
          { stdio: ['ignore', 'inherit', 'pipe'] },
        );
        let stderr = '';
        proc.stderr.on('data', (b) => {
          stderr += b.toString();
        });
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`curl exit ${code}: ${stderr.trim() || 'unknown'}`));
        });
        proc.on('error', (e) => reject(e));
      });
      const sz = (await fs.stat(outPath)).size;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  downloaded ${(sz / 1024 / 1024).toFixed(1)} MB in ${elapsed}s`);
      return;
    } catch (err) {
      lastErr = err;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `  download attempt ${attempt} failed after ${elapsed}s: ${(err as Error).message}`,
      );
      if (attempt < DOWNLOAD_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
    }
  }
  if (existsSync(outPath)) await fs.unlink(outPath).catch(() => {});
  throw new Error(
    `Failed to download ${url} after ${DOWNLOAD_MAX_ATTEMPTS} attempts: ${(lastErr as Error)?.message ?? 'unknown'}`,
  );
}

// Re-export the read shim so other modules don't need their own.
export { createReadStream };
