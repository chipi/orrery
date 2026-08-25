import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Regression guard for the /explore stellar-neighborhood "no hero image" bug.
//
// Star hero photos live under `/images/stars/…`, a bucket pruned from the
// Capacitor on-device bundle (scripts/mobile/prune-streamed-assets.mjs removes
// build/images/ wholesale) and streamed from the asset origin at runtime
// (ADR-079 D1). Building the src from `$app/paths` `base` resolves to the local
// capacitor:// origin on mobile, where the image no longer exists → a 404 and no
// hero. The seam is `assetUrl()` (offline copy → stream origin → local `base`),
// exactly as MissionPanel / StationTimelineStrip do for their heroes.
const src = readFileSync(
  fileURLToPath(new URL('./StarPanel.svelte', import.meta.url)),
  'utf8',
);

describe('StarPanel star hero image origin', () => {
  it('resolves the hero photo through assetUrl (streamed/offline-aware), not base', () => {
    expect(src).toContain("import { assetUrl } from '$lib/asset-url'");
    // The real-photo <img> src must go through assetUrl.
    expect(src).toMatch(/src=\{assetUrl\(star\.photo\.src\)\}/);
    // And must NOT concatenate the local `base` with the photo path — that is
    // the mobile-broken form that shipped the empty hero.
    expect(src).not.toMatch(/\{base\}\{star\.photo\.src\}/);
    expect(src).not.toMatch(/base\}\{star\.photo/);
  });
});
