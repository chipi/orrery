import * as m from '$lib/paraglide/messages';

/** A credit's `license_short` as shown to the viewer: licence codes (CC BY-SA 4.0, PD-USGov …)
 *  stay as written; the two plain-English values, "Public domain" and "Facts-only", are translated. */
export function licenseLabel(licenseShort: string): string {
  if (licenseShort === 'Public domain') return m.license_public_domain();
  if (licenseShort === 'Facts-only') return m.license_facts_only();
  return licenseShort;
}
