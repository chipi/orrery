/**
 * Canonical video-channel allowlist for PRD-031 / RFC-033 (S0).
 *
 * Every entry in `static/data/video-sources.json` whose `channel` is not in
 * `VIDEO_CHANNEL_ALLOWLIST` fails build-video-provenance / validate-data. This
 * is the fail-closed sourcing gate — the video analog of the image
 * license-allowlist (scripts/license-allowlist.ts) and the no-web-search
 * curation discipline.
 *
 * Two tiers:
 *   - 'official'            — first-party agency/operator channels. The clip is
 *                             the depicted agency's own upload; provenance is
 *                             airtight.
 *   - 'trusted-third-party' — a small, named set of specialist channels that
 *                             reliably re-broadcast/archive official footage
 *                             (e.g. historic launches that only survive on a
 *                             curated channel). Each such clip MUST carry an
 *                             explicit fair-use rationale in
 *                             `license_or_fair_use` (the build gate enforces a
 *                             non-empty value; review enforces that it is a real
 *                             rationale, not a license id).
 *   - 'archival-pd'        — re-uploads of genuinely PUBLIC-DOMAIN footage the
 *                             originating agency never posted to its own channel
 *                             (e.g. 1960s-70s NASA footage that predates
 *                             YouTube). Allowed ONLY for public-domain content:
 *                             the build gate requires `license_or_fair_use` to
 *                             state public domain. The provenance note must be
 *                             honest that the agency did not post it officially.
 *
 * The `channel` match is EXACT (after trim). Adding a channel is a curation
 * decision: prefer an official channel; add a trusted-third-party only when the
 * footage does not exist first-party, and say why in `note`.
 */

export type VideoChannelTier = 'official' | 'trusted-third-party' | 'archival-pd';

export interface VideoChannelEntry {
  /** Exact `channel` value used in video-sources.json (the match key). */
  channel: string;
  /** Agency/operator this channel officially represents, or 'multi' for third-party. */
  agency: string;
  tier: VideoChannelTier;
  /** Canonical channel URL (HTTPS). */
  url: string;
  /** Why this channel is trusted / the fair-use basis for a third-party. */
  note: string;
}

export const VIDEO_CHANNEL_ALLOWLIST: readonly VideoChannelEntry[] = [
  // ── Official agency / operator channels ──────────────────────────────────
  {
    channel: 'NASA',
    agency: 'NASA',
    tier: 'official',
    url: 'https://www.youtube.com/@NASA',
    note: 'Official NASA channel. NASA-produced video is generally public domain (17 U.S.C. §105).',
  },
  {
    channel: 'NASA Jet Propulsion Laboratory',
    agency: 'NASA',
    tier: 'official',
    url: 'https://www.youtube.com/@JPLraw',
    note: 'Official NASA/JPL channel (Mars EDL, planetary missions). PD-USGov.',
  },
  {
    channel: "NASA's Kennedy Space Center",
    agency: 'NASA',
    tier: 'official',
    url: 'https://www.youtube.com/@NASAKennedy',
    note: 'Official NASA Kennedy Space Center channel (launch footage). PD-USGov.',
  },
  {
    channel: 'NASA Goddard',
    agency: 'NASA',
    tier: 'official',
    url: 'https://www.youtube.com/@NASAGoddard',
    note: 'Official NASA Goddard Space Flight Center channel (Hubble/Webb operations). PD-USGov.',
  },
  {
    channel: 'NASA STI Program',
    agency: 'NASA',
    tier: 'official',
    url: 'https://www.youtube.com/@nasastiprogram',
    note: 'Official NASA Scientific & Technical Information program channel (archival/technical). PD-USGov.',
  },
  {
    channel: 'Johns Hopkins Applied Physics Laboratory',
    agency: 'NASA',
    tier: 'official',
    url: 'https://www.youtube.com/@JHUAPL',
    note: 'JHU-APL — builds + operates NASA missions (Parker Solar Probe, New Horizons, DART, OSIRIS-REx). Official mission operator.',
  },
  {
    channel: 'European Space Agency, ESA',
    agency: 'ESA',
    tier: 'official',
    url: 'https://www.youtube.com/@EuropeanSpaceAgency',
    note: 'Official ESA channel. ESA content typically CC BY-SA 3.0 IGO — attribution recorded.',
  },
  {
    channel: 'SpaceX',
    agency: 'SpaceX',
    tier: 'official',
    url: 'https://www.youtube.com/@SpaceX',
    note: 'Official SpaceX channel. Copyrighted; embedded (not redistributed) with fair-use rationale.',
  },
  {
    channel: 'Blue Origin',
    agency: 'Blue Origin',
    tier: 'official',
    url: 'https://www.youtube.com/@blueorigin',
    note: 'Official Blue Origin channel. Copyrighted; embedded with fair-use rationale.',
  },
  {
    channel: 'Roscosmos Media',
    agency: 'Roscosmos',
    tier: 'official',
    url: 'https://www.youtube.com/@tvroscosmos',
    note: 'Official Roscosmos broadcaster (ТВ Роскосмос). Native-language sourcing per agency guidance.',
  },
  {
    channel: 'Роскосмос ТВ',
    agency: 'Roscosmos',
    tier: 'official',
    url: 'https://www.youtube.com/@tvroscosmos',
    note: "Official Roscosmos TV studio — verbatim oEmbed display name (@tvroscosmos, verified via Wikidata). Same entity as 'Roscosmos Media'. Native-language (ru) content.",
  },
  {
    channel: 'JAXA',
    agency: 'JAXA',
    tier: 'official',
    url: 'https://www.youtube.com/@JAXAchannel',
    note: 'Official JAXA channel. Native-language (ja) sourcing preferred.',
  },
  {
    channel: 'JAXA | 宇宙航空研究開発機構',
    agency: 'JAXA',
    tier: 'official',
    url: 'https://www.youtube.com/@JAXAchannel',
    note: "Official JAXA channel — the account's verbatim display name (as returned by oEmbed). Same entity as 'JAXA'.",
  },
  {
    channel: 'ISRO Official',
    agency: 'ISRO',
    tier: 'official',
    url: 'https://www.youtube.com/@isroofficial5866',
    note: 'Official Indian Space Research Organisation channel.',
  },
  {
    channel: 'CCTV Video News Agency',
    agency: 'CNSA',
    tier: 'official',
    url: 'https://www.youtube.com/@CCTVPlusChina',
    note: "China's state broadcaster — the de-facto official outlet for CNSA/CMSA launch + mission footage (no standalone CNSA channel). Native-language (zh) sourcing.",
  },
  {
    channel: 'CGTN',
    agency: 'CNSA',
    tier: 'official',
    url: 'https://www.youtube.com/@CGTN',
    note: "China Global Television Network — CCTV's international arm and the de-facto official English outlet for CNSA/CMSA mission footage (no standalone CNSA channel).",
  },
  {
    channel: 'MBRSC',
    agency: 'MBRSC',
    tier: 'official',
    url: 'https://www.youtube.com/@MBRSpaceCentre',
    note: 'Mohammed bin Rashid Space Centre (UAE) official channel.',
  },
  {
    channel: 'Canadian Space Agency',
    agency: 'CSA',
    tier: 'official',
    url: 'https://www.youtube.com/@canadianspaceagency',
    note: 'Official CSA channel.',
  },
  {
    channel: 'Chris Hadfield',
    agency: 'CSA',
    tier: 'official',
    url: 'https://www.youtube.com/@ChrisHadfield',
    note: "First-party astronaut channel — Cmdr Chris Hadfield (CSA) uploaded his own ISS 'Space Oddity' video. The creator's authoritative original, not a re-upload.",
  },

  // ── Archival re-uploads of PUBLIC-DOMAIN footage the agency never posted ──
  {
    channel: 'NASA Video',
    agency: 'NASA',
    tier: 'archival-pd',
    url: 'https://www.youtube.com/@NASAVideo',
    note: "Archival re-uploads of public-domain NASA footage (17 U.S.C. §105) that NASA never posted to its own channel — e.g. 1960s-80s Gemini/Apollo/Shuttle clips. PD content only; each entry's note states NASA did not post it officially.",
  },

  // ── Trusted third-party (each clip needs an explicit fair-use rationale) ──
  {
    channel: 'NASASpaceflight',
    agency: 'multi',
    tier: 'trusted-third-party',
    url: 'https://www.youtube.com/@NASASpaceflight',
    note: 'Long-running independent spaceflight documentarian; reliable multi-agency launch coverage where first-party footage is absent. Fair-use per clip.',
  },
  {
    channel: 'Everyday Astronaut',
    agency: 'multi',
    tier: 'trusted-third-party',
    url: 'https://www.youtube.com/@EverydayAstronaut',
    note: 'Educational spaceflight channel; used only when official footage is unavailable. Fair-use per clip.',
  },
];

const BY_CHANNEL: ReadonlyMap<string, VideoChannelEntry> = new Map(
  VIDEO_CHANNEL_ALLOWLIST.map((e) => [e.channel, e]),
);

/** Exact (trimmed) lookup. Returns the entry or null. */
export function lookupChannel(channel: string): VideoChannelEntry | null {
  return BY_CHANNEL.get(channel.trim()) ?? null;
}

export function isAllowedChannel(channel: string): boolean {
  return BY_CHANNEL.has(channel.trim());
}
