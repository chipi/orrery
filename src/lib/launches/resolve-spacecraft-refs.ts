/**
 * Per-launch → fleet-spacecraft cross-reference resolver (#306-follow / PRD-020 ext).
 *
 * `LaunchEntry.orrery_launcher_ref` only links a launch to the *rocket*
 * (Falcon 9, Ariane 6, …). For the LauncherFlightsWidget on the
 * spacecraft-side fleet entries (Crew Dragon, Cargo Dragon, Cygnus,
 * HTV-X, Tianzhou, …) we need an additional cross-reference to the
 * spacecraft that actually flew. This file declares the rule table
 * that the build pipeline (`scripts/fetch-launches.ts`) consults when
 * enriching each entry; the resolved list lands as
 * `orrery_spacecraft_refs: string[]` in the manifest.
 *
 * Rule schema — `launcher` must match `orrery_launcher_ref` exactly,
 * `pattern` is tested against the launch's `mission_name` and `name`
 * fields (RawLaunchEntry / ManifestEntry both carry them). Multiple
 * rules can fire and contribute different spacecraft refs; the
 * resolver dedupes the result.
 *
 * Convention — pick the *currently-active* variant when a spacecraft
 * has multiple fleet entries (e.g. `cargo-dragon-2` not
 * `cargo-dragon-v1`; `cygnus-enhanced` for post-NG-21 Falcon 9 flights;
 * `soyuz-ms` for current Soyuz crew rotations). Historic flights would
 * be handled by a separate per-decade rule layer if/when we expand
 * coverage backwards.
 */

export interface SpacecraftRefRule {
  /** When set, the launch's `orrery_launcher_ref` must equal this id.
   *  Omit to match by pattern alone — useful when the spacecraft is
   *  the canonical identifier in mission naming and rides on multiple
   *  rockets across its history (Cygnus: Antares → Falcon 9). */
  launcher?: string;
  /** Tested against `mission_name` then `name` (CI), concatenated. */
  pattern: RegExp;
  spacecraft: readonly string[];
}

export const SPACECRAFT_REF_RULES: readonly SpacecraftRefRule[] = [
  // SpaceX Crew Dragon — current naming (Crew-N / Axiom / Polaris) plus
  // historic GCAT serial-number naming (Dragon C20[0-9]+). Launcher-
  // gated to falcon-9 / falcon-heavy because SpaceX has the monopoly
  // on Crew Dragon launches.
  { launcher: 'falcon-9', pattern: /^Crew-\d+/i, spacecraft: ['crew-dragon'] },
  { launcher: 'falcon-9', pattern: /Axiom\s+Space\s+Mission/i, spacecraft: ['crew-dragon'] },
  { launcher: 'falcon-9', pattern: /Polaris\s+Dawn/i, spacecraft: ['crew-dragon'] },
  { launcher: 'falcon-9', pattern: /Dragon\s+C20\d(\.\d+)?\b/i, spacecraft: ['crew-dragon'] },
  { launcher: 'falcon-heavy', pattern: /^Crew-\d+/i, spacecraft: ['crew-dragon'] },

  // SpaceX Cargo Dragon — current naming (CRS-2/SpX-N) + historic
  // serial naming (Dragon C21[0-9]+).
  { launcher: 'falcon-9', pattern: /Dragon\s+CRS-2|SpX-\d+/i, spacecraft: ['cargo-dragon-2'] },
  { launcher: 'falcon-9', pattern: /Dragon\s+C21\d(\.\d+)?\b/i, spacecraft: ['cargo-dragon-2'] },

  // Northrop Grumman Cygnus — launcher-agnostic: Cygnus rode Antares
  // 200 / 230 / 230+ historically and moves to Falcon 9 with NG-22+.
  // Spacecraft is what the mission_name identifies regardless of rocket.
  { pattern: /Cygnus\s+(CRS-?2|NG-?\d+)/i, spacecraft: ['cygnus-enhanced'] },

  // China's Tianzhou cargo spacecraft. Launcher-agnostic: rode LM-7
  // historically, moving to LM-5B for heavier resupply missions.
  { pattern: /Tianzhou(\s|-)?\d/i, spacecraft: ['tianzhou'] },

  // JAXA's HTV-X cargo spacecraft → H3.
  { launcher: 'h3', pattern: /HTV-?X/i, spacecraft: ['htv-x'] },

  // Roscosmos Soyuz MS crewed spacecraft + Progress MS cargo → Soyuz-2
  // family (post 2019 — earlier MS flights used Soyuz-FG and have
  // their own cross-ref via the older launcher).
  { launcher: 'soyuz-2', pattern: /Soyuz\s*MS-?\d+/i, spacecraft: ['soyuz-ms'] },
  { launcher: 'soyuz-fg', pattern: /Soyuz\s*MS-?\d+/i, spacecraft: ['soyuz-ms'] },
  { launcher: 'soyuz-2', pattern: /Progress\s*MS-?\d+/i, spacecraft: ['progress-ms'] },

  // Boeing Starliner (CST-100) → Atlas V historically, Vulcan going
  // forward. Mission naming uses "Starliner" or "CFT" (Crew Flight
  // Test).
  { launcher: 'atlas-v', pattern: /Starliner|CST-100|CFT-?\d|Boe-CFT/i, spacecraft: ['starliner'] },
  { launcher: 'vulcan', pattern: /Starliner|CST-100/i, spacecraft: ['starliner'] },
];

/**
 * Resolve the spacecraft fleet IDs carried by a launch. Returns an
 * empty array when no rule matches — the widget reads that as "no
 * spacecraft cross-reference" and only filters by launcher_ref.
 */
export function resolveSpacecraftRefs(
  launcherRef: string | null | undefined,
  missionName: string | null | undefined,
  name: string | null | undefined,
): string[] {
  const text = `${missionName ?? ''}\n${name ?? ''}`;
  if (!text.trim()) return [];
  const out = new Set<string>();
  for (const rule of SPACECRAFT_REF_RULES) {
    // Launcher gate is optional — see SpacecraftRefRule.launcher.
    if (rule.launcher !== undefined && rule.launcher !== launcherRef) continue;
    if (!rule.pattern.test(text)) continue;
    for (const sc of rule.spacecraft) out.add(sc);
  }
  return [...out];
}
