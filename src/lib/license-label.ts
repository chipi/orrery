import * as m from '$lib/paraglide/messages';

/** A credit's `license_short` as shown to the viewer: licence codes (CC BY-SA 4.0, PD-USGov …)
 *  stay as written; the one plain-English value, "Public domain", is translated. */
export function licenseLabel(licenseShort: string): string {
  return licenseShort === 'Public domain' ? m.license_public_domain() : licenseShort;
}
