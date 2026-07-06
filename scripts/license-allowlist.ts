/**
 * Canonical license allowlist for ADR-046 image provenance (Milestone C).
 *
 * Anything in `image-provenance.json` whose `license_short` is not in
 * `LICENSE_ALLOWLIST` AND not waived in `static/data/license-waivers.json`
 * fails build-image-provenance / validate-data. This is the fail-closed
 * stewardship gate the plan calls for.
 *
 * Adding a new license: prefer extending the allowlist (with a clear
 * comment explaining the legal status) over filing a waiver. Waivers
 * are for narrow, justified exceptions — see the waivers schema.
 */

export interface LicenseAllowlistEntry {
  short: string;
  /** Stable display name for the credits page. */
  display: string;
  /** Canonical license URL (HTTPS). */
  url: string;
  /** Plain-language explanation suitable for the public credits page. */
  rationale: string;
  /** True if attribution is required (CC BY / BY-SA). */
  requires_attribution: boolean;
  /** True if downstream users must share derivatives under the same license. */
  share_alike: boolean;
}

export const LICENSE_ALLOWLIST: readonly LicenseAllowlistEntry[] = [
  {
    short: 'PD-NASA',
    display: 'NASA media (public domain)',
    url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    rationale:
      'NASA-produced media is generally not copyrighted (17 U.S.C. §105). Use is permitted; trademark + endorsement rules apply.',
    requires_attribution: false,
    share_alike: false,
  },
  {
    short: 'PD-USGov',
    display: 'U.S. Government work (public domain)',
    url: 'https://www.usa.gov/government-works',
    rationale:
      'Created by U.S. federal government employees as part of their official duties — not subject to U.S. copyright.',
    requires_attribution: false,
    share_alike: false,
  },
  {
    short: 'PD-Russia',
    display: 'Public domain (Russian Federation / Soviet)',
    url: 'https://en.wikipedia.org/wiki/Russian_copyright_law',
    rationale:
      'Soviet government works pre-1973 and many Russian Federation government works are public domain under §1259 of the Civil Code.',
    requires_attribution: false,
    share_alike: false,
  },
  {
    short: 'PD-Old',
    display: 'Public domain (term expired)',
    url: 'https://en.wikipedia.org/wiki/Public_domain',
    rationale: 'Copyright term expired worldwide.',
    requires_attribution: false,
    share_alike: false,
  },
  {
    short: 'PD-trivial',
    display: 'Public domain (trivial / not eligible for copyright)',
    url: 'https://en.wikipedia.org/wiki/Threshold_of_originality',
    rationale:
      'Below the threshold of originality (simple geometry, plain wordmarks). Trademark may still apply.',
    requires_attribution: false,
    share_alike: false,
  },
  {
    short: 'PD-self',
    display: 'Public domain (released by author)',
    url: 'https://creativecommons.org/publicdomain/mark/1.0/',
    rationale: 'Author has released the work into the public domain via PD dedication.',
    requires_attribution: false,
    share_alike: false,
  },
  {
    short: 'CC0',
    display: 'Creative Commons CC0 1.0 Universal',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    rationale: 'No rights reserved.',
    requires_attribution: false,
    share_alike: false,
  },
  {
    short: 'Unsplash-License',
    display: 'Unsplash License',
    url: 'https://unsplash.com/license',
    rationale:
      'Unsplash grants an irrevocable, worldwide, non-exclusive licence to use photos for free — commercial and non-commercial — without permission or attribution. (Photos may not be sold unmodified, nor compiled to replicate a competing service.) Orrery uses individual mission-relevant photos and retains voluntary photographer/agency credit in provenance.',
    requires_attribution: false,
    share_alike: false,
  },
  {
    short: 'GODL-India',
    display: 'Government Open Data License – India',
    url: 'https://data.gov.in/Godl',
    rationale:
      'India Government Open Data License — free reuse with attribution; ISRO/Department of Space release imagery under it (the only license under which Chandrayaan-3 imagery is published). Accepted on Wikimedia Commons.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'CC-BY-1.0',
    display: 'Creative Commons Attribution 1.0',
    url: 'https://creativecommons.org/licenses/by/1.0/',
    rationale: 'Reuse with attribution.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'CC-BY-2.0',
    display: 'Creative Commons Attribution 2.0',
    url: 'https://creativecommons.org/licenses/by/2.0/',
    rationale: 'Reuse with attribution.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'CC-BY-2.5',
    display: 'Creative Commons Attribution 2.5',
    url: 'https://creativecommons.org/licenses/by/2.5/',
    rationale: 'Reuse with attribution.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'CC-BY-3.0',
    display: 'Creative Commons Attribution 3.0 Unported',
    url: 'https://creativecommons.org/licenses/by/3.0/',
    rationale: 'Reuse with attribution.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'CC-BY-3.0-IGO',
    display: 'Creative Commons Attribution 3.0 IGO',
    url: 'https://creativecommons.org/licenses/by/3.0/igo/',
    rationale: 'Inter-governmental organisation port of CC BY 3.0.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'CC-BY-4.0',
    display: 'Creative Commons Attribution 4.0 International',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    rationale: 'Reuse with attribution.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'CC-BY-4.0-IGO',
    display: 'Creative Commons Attribution 4.0 IGO',
    url: 'https://creativecommons.org/licenses/by/4.0/igo/',
    rationale: 'Inter-governmental organisation port of CC BY 4.0.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'CC-BY-Murray-Lab',
    display: 'Murray Lab CTX Global Mosaic (CC BY 4.0)',
    url: 'https://murray-lab.caltech.edu/CTX/',
    rationale:
      'The Murray Lab Global CTX Mosaic (Caltech) is released under CC BY 4.0; this short-name preserves the partner provenance for the credits page while inheriting standard CC BY 4.0 terms.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'CNSA-EDU',
    display: 'CNSA imagery (educational fair-use)',
    url: 'https://www.cnsa.gov.cn/english/',
    rationale:
      'China National Space Administration publishes Tianwen-1 / Zhurong (Mars) and Chang’e (Moon) imagery on cnsa.gov.cn without a formal Creative Commons license. Standard practice across the planetary-science community (Planetary Society, academic publications, Xinhua redistribution) is editorial / educational reuse with full attribution. Orrery embeds with the canonical "CNSA / PEC" attribution string under this tag. Reused across #PD-mars (Zhurong panorama) and the upcoming #PC (Chang’e 2 regional + Chang’e lander panoramas). This entry is the deliberate precedent for non-Western agencies that publish imagery without formal CC licensing.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'ISRO-EDU',
    display: 'ISRO imagery (educational fair-use)',
    url: 'https://www.isro.gov.in/',
    rationale:
      'Indian Space Research Organisation publishes Chandrayaan-2/3 (Moon) and Mangalyaan / MOM (Mars) imagery on isro.gov.in for "personal, educational, and non-commercial" use with attribution. No formal Creative Commons license. Mirrors the CNSA-EDU precedent for agencies that publish openly without formal CC licensing. Canonical attribution: "ISRO / Chandrayaan-3 Team" or similar mission-specific string.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'JAXA-OPEN',
    display: 'JAXA imagery (open distribution)',
    url: 'https://global.jaxa.jp/policy.html',
    rationale:
      'Japan Aerospace Exploration Agency publishes mission imagery (Hayabusa2, SLIM, MMX, ISAS planetary missions) under a permissive "open data" policy permitting non-commercial reuse with attribution. No formal Creative Commons label. Mirrors the CNSA-EDU / ISRO-EDU precedent. Canonical attribution: "JAXA" or mission-specific string ("JAXA / SLIM Team", "JAXA / Sora-Q LEV-2").',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'SpaceIL-EDU',
    display: 'SpaceIL imagery (educational fair-use)',
    url: 'https://www.spaceil.com/',
    rationale:
      'SpaceIL is the Israeli non-profit behind the Beresheet lunar lander (2019, crashed at ~149 m altitude). Beresheet final-descent imagery was released through SpaceIL communications + Israeli news outlets without a formal Creative Commons license, but with broad permission for editorial / educational reuse. Mirrors the CNSA-EDU precedent. Canonical attribution: "SpaceIL · IAI · Beresheet mission".',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'BJJ-attribution',
    display: 'Björn Jónsson planetary maps (attribution-required)',
    url: 'https://bjj.mmedia.is/acknow.html',
    rationale:
      'Björn Jónsson processes NASA PDS public-domain imaging data (Voyager + Galileo SSI etc.) into ready-to-use equirectangular planetary maps. The source data is PD-NASA; his processing is publicly available with attribution per the site policy ("e.g. created by Björn Jónsson or something equivalent"). Used for the /explore Galilean-moon textures (#287 Slice B) since Solar System Scope doesn\'t publish maps for the outer-system bodies.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'fair-use-cover',
    display: 'Cover / poster thumbnail (nominative fair use)',
    url: 'https://www.copyright.gov/title17/92chap1.html#107',
    rationale:
      'Low-resolution thumbnail of a commercial work (book cover, film poster, podcast art, channel avatar, site logo) used for identification + recommendation purposes on /science/reading-list and /science/watch-list. The standard nominative-fair-use pattern recognised in US 17 USC §107 + equivalent doctrine internationally, used by every online bookshop / podcast directory / film database. Copyright remains with the rightsholder; takedown contact in static/images/recommendations/README.md.',
    requires_attribution: true,
    share_alike: false,
  },
  {
    short: 'CC-BY-SA-1.0',
    display: 'Creative Commons Attribution-ShareAlike 1.0',
    url: 'https://creativecommons.org/licenses/by-sa/1.0/',
    rationale: 'Reuse with attribution; derivatives under same license.',
    requires_attribution: true,
    share_alike: true,
  },
  {
    short: 'CC-BY-SA-2.0',
    display: 'Creative Commons Attribution-ShareAlike 2.0',
    url: 'https://creativecommons.org/licenses/by-sa/2.0/',
    rationale: 'Reuse with attribution; derivatives under same license.',
    requires_attribution: true,
    share_alike: true,
  },
  {
    short: 'CC-BY-SA-2.5',
    display: 'Creative Commons Attribution-ShareAlike 2.5',
    url: 'https://creativecommons.org/licenses/by-sa/2.5/',
    rationale: 'Reuse with attribution; derivatives under same license.',
    requires_attribution: true,
    share_alike: true,
  },
  {
    short: 'CC-BY-SA-3.0',
    display: 'Creative Commons Attribution-ShareAlike 3.0 Unported',
    url: 'https://creativecommons.org/licenses/by-sa/3.0/',
    rationale: 'Reuse with attribution; derivatives under same license.',
    requires_attribution: true,
    share_alike: true,
  },
  {
    short: 'CC-BY-SA-3.0-IGO',
    display: 'Creative Commons Attribution-ShareAlike 3.0 IGO',
    url: 'https://creativecommons.org/licenses/by-sa/3.0/igo/',
    rationale: 'Inter-governmental organisation port of CC BY-SA 3.0.',
    requires_attribution: true,
    share_alike: true,
  },
  {
    short: 'CC-BY-SA-4.0',
    display: 'Creative Commons Attribution-ShareAlike 4.0 International',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    rationale: 'Reuse with attribution; derivatives under same license.',
    requires_attribution: true,
    share_alike: true,
  },
  {
    short: 'CC-BY-SA-4.0-IGO',
    display: 'Creative Commons Attribution-ShareAlike 4.0 IGO',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/igo/',
    rationale: 'Inter-governmental organisation port of CC BY-SA 4.0.',
    requires_attribution: true,
    share_alike: true,
  },
  {
    // Project-internal label for original Orrery prose (UI strings,
    // editorial copy authored by maintainers). Not used for redistributed
    // imagery; only valid in `text-sources.json`.
    short: 'Orrery-Original',
    display: 'Original prose by Orrery maintainers (MIT-licensed alongside source)',
    url: 'https://github.com/chipi/orrery/blob/main/LICENSE',
    rationale:
      'Written by the Orrery maintainers and released under the project MIT license. Reuse permitted under MIT terms.',
    requires_attribution: true,
    share_alike: false,
  },
];

const ALLOWLIST_INDEX = new Map(LICENSE_ALLOWLIST.map((e) => [e.short, e]));

export function getAllowlistEntry(licenseShort: string): LicenseAllowlistEntry | undefined {
  return ALLOWLIST_INDEX.get(licenseShort);
}

export function isAllowedLicense(licenseShort: string): boolean {
  return ALLOWLIST_INDEX.has(licenseShort);
}

/**
 * Loose normaliser that maps free-text license short-names found in
 * Wikimedia `extmetadata.LicenseShortName.value` (which is sometimes
 * lower-case, sometimes wrapped in HTML, sometimes with extra spaces)
 * to the canonical allowlist short id. Falls back to the raw string
 * when no rule matches — caller is responsible for deciding whether
 * to fail closed or look up a waiver.
 */
export function normaliseLicenseShortName(raw: string): string {
  const cleaned = raw
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (!cleaned) return raw;
  switch (cleaned) {
    case 'PUBLIC DOMAIN':
    case 'PD':
      return 'PD-Old';
    case 'CC0':
    case 'CC-ZERO':
      return 'CC0';
  }
  // Normalise CC variants regardless of casing/spacing/dashes.
  const m = cleaned.match(/^(CC[\s-]*BY(?:[\s-]*SA)?)[\s-]*([0-9.]+)?(?:[\s-]*(IGO))?$/);
  if (m) {
    const base = m[1].replace(/\s+/g, '-');
    const ver = m[2] ?? '4.0';
    const igo = m[3] ? '-IGO' : '';
    return `${base}-${ver}${igo}`.replace(/--/g, '-');
  }
  // Common Wikimedia template strings.
  if (cleaned.includes('CC BY-SA')) return 'CC-BY-SA-4.0';
  if (cleaned.includes('CC BY')) return 'CC-BY-4.0';
  return raw;
}
