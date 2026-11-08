/**
 * `GcatSource` — Jonathan McDowell's GCAT as the historic primary source
 * for the Launches Calendar pipeline.
 *
 * Released CC-BY 4.0; citation is a ship-gate per PRD-020 M14. The
 * pipeline pins to a specific GCAT release (`GCAT_RELEASE_PIN`); a
 * version bump is an explicit operator gesture per RFC-023 §12.1, so
 * silent column-name drift can't slip into the data.
 *
 * This file is build-time-only — never imported by client-side
 * components.
 */

import { closeSync, fstatSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertGcatHeader, parseGcatLaunchTsv } from '../../../../scripts/gcat/parse-launch-log.js';
import type { LaunchSource, LaunchSourceAttribution, LaunchSourceWindow } from './provider.js';
import type { RawLaunchEntry } from '../types.js';

/**
 * Pinned GCAT release version. Bump explicitly when a new GCAT release
 * lands AND the parser fixture (`scripts/gcat/__fixtures__/launch-log-header.tsv`)
 * still validates against the new TSV. A column-name change requires a
 * fixture update + operator review.
 */
export const GCAT_RELEASE_PIN = '1.8.8';
export const GCAT_TSV_URL = 'https://planet4589.org/space/gcat/tsv/launch/launch.tsv';
export const GCAT_HOMEPAGE = 'https://planet4589.org/space/gcat/';
const CACHE_ROOT = '.launches-cache/gcat';
const CACHE_FILE = join(CACHE_ROOT, `gcat-${GCAT_RELEASE_PIN}-launch.tsv`);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class GcatSourceError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
  }
}

// One open, then stat + read on the descriptor: no check-then-read race on the path.
function readCache(maxAgeMs = Infinity): string | null {
  let fd: number;
  try {
    fd = openSync(CACHE_FILE, 'r');
  } catch {
    return null;
  }
  try {
    if (Date.now() - fstatSync(fd).mtimeMs >= maxAgeMs) return null;
    return readFileSync(fd, 'utf8');
  } finally {
    closeSync(fd);
  }
}

async function downloadIfStale(force = false): Promise<string> {
  if (!force) {
    const fresh = readCache(7 * ONE_DAY_MS);
    if (fresh !== null) return fresh;
  }
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  const res = await fetch(GCAT_TSV_URL);
  if (!res.ok) {
    // Network outage / 5xx — fall back to last cached payload. RFC-023 §13.
    const stale = readCache();
    if (stale !== null) return stale;
    throw new GcatSourceError(`GCAT TSV download failed: ${res.status} ${res.statusText}`);
  }
  const tsv = await res.text();
  writeFileSync(CACHE_FILE, tsv, 'utf8');
  return tsv;
}

export class GcatSource implements LaunchSource {
  readonly name = 'gcat';
  readonly priority = 20;
  readonly mode = 'historic';
  readonly defaultRole = 'primary';

  /** Inject a custom downloader for tests. Defaults to live TSV with cache. */
  constructor(
    private readonly downloader: (force?: boolean) => Promise<string> = downloadIfStale,
  ) {}

  async fetchWindow(input: LaunchSourceWindow): Promise<RawLaunchEntry[]> {
    if (input.mode !== 'historic') return [];
    const tsv = await this.downloader();
    const headerCheck = assertGcatHeader(tsv);
    if (!headerCheck.ok) {
      throw new GcatSourceError(
        `GCAT header assertion failed (${headerCheck.reason}): ${headerCheck.details}. ` +
          `Bump GCAT_RELEASE_PIN + scripts/gcat/__fixtures__/launch-log-header.tsv after manual review.`,
      );
    }
    const observed_at = new Date().toISOString();
    const { entries } = parseGcatLaunchTsv({
      tsv,
      source_name: this.name,
      source_observed_at: observed_at,
    });
    const from = Date.parse(input.fromIso);
    const to = Date.parse(input.toIso);
    return entries.filter((e) => {
      const t = Date.parse(e.net);
      return t >= from && t < to;
    });
  }

  attribution(): LaunchSourceAttribution {
    return {
      citation: `McDowell, J.C. — General Catalog of Artificial Space Objects, Release ${GCAT_RELEASE_PIN}`,
      url: GCAT_HOMEPAGE,
      license: 'CC-BY-4.0',
      citation_id: 'gcat-mcdowell',
    };
  }
}
