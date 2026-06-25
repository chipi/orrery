import fs from 'node:fs';
const P = 'static/data/surface-hotspots.json';
const data = JSON.parse(fs.readFileSync(P, 'utf8'));

// Regional GSD (m/px) per Kaguya site from the last fetch run × 2560px crop.
const KAGUYA_GSD = {
  luna9: 10.8, luna16: 11.3, luna17: 5.6, luna21: 6.3, luna24: 6.7,
  change3: 10.1, change4: 7.6, change5: 9.9, change6: 10.8,
  chandrayaan3: 9.6, slim: 6.0, beresheet: 10.7,
};
const KAGUYA_CROP_PX = 2560;

// Detail (LROC) ground coverage in metres. The 12 new sites use LROC Featured
// Images (~1–2 km, a few state an exact width); Apollo uses the NAC ROI _5M
// mosaic (2048 px × 5 m/px ≈ 10.2 km). These feed the co-scale so the detail
// patch sizes like Mars's HiRISE window for a smooth progressive reveal.
const DETAIL_GROUND_M = {
  chandrayaan3: 1738, // stated width
  change5: 1000,
  beresheet: 1000,
  slim: 1000,
  // remaining featured images default below
};
const FEATURED_DEFAULT = 1500;
const KAGUYA_SITES = Object.keys(KAGUYA_GSD);
const APOLLO = ['apollo11', 'apollo12', 'apollo14', 'apollo15', 'apollo16', 'apollo17'];

let n = 0;
for (const [id, e] of Object.entries(data.entries)) {
  if (!e.hotspot_tier2_source?.includes('/moon/') || (e.hotspot_tier_max ?? 0) < 2) continue;
  if (KAGUYA_SITES.includes(id)) {
    e.hotspot_tier2_regional_ground_m = Math.round(KAGUYA_CROP_PX * KAGUYA_GSD[id]);
    e.hotspot_tier2_ground_m = DETAIL_GROUND_M[id] ?? FEATURED_DEFAULT;
    n++;
  } else if (APOLLO.includes(id)) {
    e.hotspot_tier2_regional_ground_m = 15360; // LROC NAC ROI regional _5M (3072 × 5)
    e.hotspot_tier2_ground_m = 10240; // LROC NAC ROI detail _5M (2048 × 5)
    n++;
  }
  if (e.hotspot_tier2_ground_m) {
    console.log(`  ${id.padEnd(13)} detail=${e.hotspot_tier2_ground_m}m regional=${e.hotspot_tier2_regional_ground_m}m  (ratio 1/${Math.round(e.hotspot_tier2_regional_ground_m / e.hotspot_tier2_ground_m)})`);
  }
}
fs.writeFileSync(P, JSON.stringify(data, null, 2) + '\n');
console.log(`\nAuthored co-scale ground extents for ${n} moon sites.`);
