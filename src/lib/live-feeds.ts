/**
 * Live-feed pipeline (PRD-031 / RFC-033 §7, P2).
 *
 * Unifies two sources into one honest, time-gated list for the `/live` route:
 *   1. Curated permanent pins (the NASA ISS stream) — `entity_kind: 'live-pin'`
 *      rows in the video-provenance manifest. Embeddable via the MediaPlayer.
 *   2. Launch broadcasts — derived from `$lib/launches` (`net` scheduled time).
 *      The manifest is a periodic snapshot, so we time-gate on `net` vs the
 *      real `now` at render (never the snapshot's stale `webcast_live`). We only
 *      have the launch-detail URL, not the stream URL, so launch feeds LINK OUT
 *      (the embed upgrade is a follow-up — RFC-033 §7 / launch-webcast_url).
 *
 * `deriveLaunchFeedState` is pure (given `now`) and unit-tested; the async
 * `getLiveFeeds` fetches + maps.
 */
import { getVideoManifest, type VideoProvenanceEntry } from './video-provenance';
import { loadUpcoming, type LaunchEntry } from './launches/manifest';

export type LiveFeedKind = 'iss-permanent' | 'launch-broadcast';
export type LiveFeedState = 'live' | 'imminent';

export interface LiveFeed {
  id: string;
  kind: LiveFeedKind;
  title: string;
  agency: string;
  state: LiveFeedState;
  /** Scheduled T-0 for launches; null for the always-on ISS pin. */
  starts_at: string | null;
  /** Canonical page to watch / read more (always present). */
  source_url: string;
  /** The manifest clip for embeddable pins (ISS). Absent → link-out only. */
  video?: VideoProvenanceEntry;
}

/** A launch counts as imminent up to this long before T-0. */
export const IMMINENT_WINDOW_MS = 60 * 60 * 1000; // T-60 min
/** …and 'live' (in progress) from T-0 until this long after. */
export const LIVE_GRACE_MS = 30 * 60 * 1000; // T+30 min

/**
 * Pure: given a launch's scheduled `net` and the current time, is it
 * live-or-imminent (and which)? Returns null when it should not surface.
 */
export function deriveLaunchFeedState(net: string, now: Date): LiveFeedState | null {
  const netMs = Date.parse(net);
  if (Number.isNaN(netMs)) return null;
  const delta = netMs - now.getTime(); // >0 future, <=0 past
  if (delta <= 0 && delta >= -LIVE_GRACE_MS) return 'live';
  if (delta > 0 && delta <= IMMINENT_WINDOW_MS) return 'imminent';
  return null;
}

function launchWatchUrl(l: LaunchEntry): string {
  return l.provenance_chain?.find((p) => p.source_url)?.source_url ?? '';
}

export async function getLiveFeeds(now: Date): Promise<LiveFeed[]> {
  const feeds: LiveFeed[] = [];

  // 1. Curated permanent pins (ISS) from the video manifest.
  const vm = await getVideoManifest();
  if (vm) {
    for (const e of vm.entries) {
      if (e.entity_kind !== 'live-pin') continue;
      feeds.push({
        id: e.id,
        kind: 'iss-permanent',
        title: e.title,
        agency: e.agency,
        state: 'live',
        starts_at: null,
        source_url: e.source_url,
        video: e,
      });
    }
  }

  // 2. Launch broadcasts — time-gated on scheduled net vs real now.
  try {
    const m = await loadUpcoming();
    for (const l of Object.values(m.entries)) {
      const state = deriveLaunchFeedState(l.net, now);
      if (!state) continue;
      feeds.push({
        id: `launch-${l.id}`,
        kind: 'launch-broadcast',
        title: l.mission_name ? `${l.name} — ${l.mission_name}` : l.name,
        agency: l.agency_name,
        state,
        starts_at: l.net,
        source_url: launchWatchUrl(l),
      });
    }
  } catch {
    // launches are optional; the ISS pin still renders.
  }

  // live before imminent; within a state, soonest first (pins have no start).
  feeds.sort((a, b) => {
    if (a.state !== b.state) return a.state === 'live' ? -1 : 1;
    return (
      (a.starts_at ? Date.parse(a.starts_at) : 0) - (b.starts_at ? Date.parse(b.starts_at) : 0)
    );
  });
  return feeds;
}

/** The soonest still-upcoming launch, for the "nothing live — next up" state. */
export async function getNextLaunch(
  now: Date,
): Promise<{ name: string; net: string; source_url: string } | null> {
  try {
    const m = await loadUpcoming();
    const upcoming = Object.values(m.entries)
      .filter((l) => Date.parse(l.net) > now.getTime())
      .sort((a, b) => Date.parse(a.net) - Date.parse(b.net));
    const next = upcoming[0];
    if (!next) return null;
    return {
      name: next.mission_name ? `${next.name} — ${next.mission_name}` : next.name,
      net: next.net,
      source_url: launchWatchUrl(next),
    };
  } catch {
    return null;
  }
}
