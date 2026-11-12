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
// hero. The seam is `assetUrl()` (offline copy → stream origin → local `base`).
// Since B3 the hero is drawn by UniversePanelBody: the star panel hands it the
// root-relative path and the body applies assetUrl to the hero and every gallery image.
const read = (f: string) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
const star = read('./StarPanel.svelte');
const body = read('./UniversePanelBody.svelte');

describe('StarPanel star hero image origin', () => {
  it('hands the hero photo to the shared body, which resolves it through assetUrl', () => {
    expect(star).toMatch(/src: star\.photo\.src/);
    expect(body).toContain("import { assetUrl } from '$lib/asset-url'");
    expect(body).toMatch(/src=\{assetUrl\(hero\.src\)\}/);
    expect(body).toMatch(/gallery\.map\(assetUrl\)/);
  });

  it('never concatenates the local base with the photo path (the mobile-broken form)', () => {
    for (const src of [star, body]) {
      expect(src).not.toMatch(/\{base\}\{star\.photo/);
      expect(src).not.toMatch(/base\}\{star\.photo/);
    }
  });

  it('draws the hero once: the star panel keeps no private image block', () => {
    expect(star).not.toContain('<img');
    expect(star).not.toContain('star-hero');
  });
});
