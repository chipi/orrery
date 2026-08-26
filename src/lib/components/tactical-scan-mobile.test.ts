import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Regression guard for #49 — the /explore planet-stats tactical scan was dead on
// phones: the floating overlay is display:none ≤600px (deliberately — too tall
// for a phone), but /explore never rendered the inline copy the surface routes
// put in their mobile "Scan" drawer. So toggling the planet-stats lens on a phone
// did nothing. The fix mirrors the surface pattern: an inline TacticalScan in a
// mobile drawer tab. These two invariants keep that reachable.

const scan = readFileSync(fileURLToPath(new URL('./TacticalScan.svelte', import.meta.url)), 'utf8');
const explore = readFileSync(
  fileURLToPath(new URL('../../routes/explore/+page.svelte', import.meta.url)),
  'utf8',
);

describe('TacticalScan inline mode stays mobile-visible', () => {
  it('renders the inline (drawer) copy as a visible block — not viewport-gated', () => {
    // The floating overlay is display:none until ≥601px; the inline copy must
    // NOT inherit that gate, or the mobile drawer body would be blank.
    expect(scan).toMatch(/\.tactical-scan\.inline\s*\{[^}]*display:\s*block/);
  });
});

describe('/explore wires the tactical scan into its mobile drawer (#49)', () => {
  it('has a mobileScanContent snippet using an inline TacticalScan', () => {
    expect(explore).toMatch(/\{#snippet mobileScanContent\b/);
    // The snippet must render TacticalScan with the `inline` flag (drawer body).
    const snippet = explore.slice(explore.indexOf('{#snippet mobileScanContent'));
    expect(snippet).toMatch(/<TacticalScan[\s\S]*?\binline\b[\s\S]*?\/>/);
  });

  it('adds a Scan drawer tab wired to that snippet', () => {
    expect(explore).toMatch(/id:\s*'scan'[\s\S]*?content:\s*mobileScanContent/);
  });
});
