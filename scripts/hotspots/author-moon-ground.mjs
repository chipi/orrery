import fs from 'node:fs';
const P = 'static/data/surface-hotspots.json';
const data = JSON.parse(fs.readFileSync(P, 'utf8'));

// Regional GSD (m/px) per Kaguya site from the last fetch run × 2560px crop.
const KAGUYA_GSD = {
  luna9: 10.8,
  luna16: 9.9598, // refetched since the first run; matches the committed 25497 m
  luna17: 5.6,
  luna21: 6.3,
  luna24: 6.7,
  change3: 10.1,
  change4: 10.3957, // refetched since the first run; matches the committed 26613 m
  change5: 9.9,
  change6: 10.8,
  chandrayaan3: 9.6,
  slim: 6.0,
  beresheet: 10.7,
};
const KAGUYA_CROP_PX = 2560;

// Detail (LROC) ground coverage in metres = what the 2048 px tier2-lroc.jpg
// really shows, so the true-scale view draws the patch at its real size and
// annotation offsets (metres from the patch centre) land on the hardware.
//   Featured Sites frames (luna16/17/21/24, change3): the 1000x562 jpg is at the
//     frame's native "Pixel Scale" (LROC site_images page); fetch-moon-featured-images
//     centre-crops 562 px and resizes to 2048, so width = pixel scale x 562.
//   change4, Apollo: native-pixel 2048 crop of the Featured Sites GeoTIFF
//     (fetch-hotspot-imagery for change4), width = pixel scale x 2048.
//   Blog PNGs (change5/6, chandrayaan3, slim, beresheet): the whole 1100 px
//     image is used, so width = the width LROC's caption states for the image.
const DETAIL_GROUND_M = {
  luna16: 309.1, // 0.55 m/px (M141899500L)
  luna17: 281, // 0.50 m/px (M173144480R)
  luna21: 281, // 0.50 m/px (M122007650L)
  luna24: 281, // 0.50 m/px (M137136039R)
  change3: 876.2, // 1.559 m/px (M1142596997R)
  change4: 1515.5, // 0.74 m/px (M1311886645, native crop)
  change5: 1210, // LROC post 1172: "1210 meters wide"
  change6: 552, // LROC post 1374: "552 meters wide" (the 1100 px PNG is a downscale of the 0.425 m/px original)
  chandrayaan3: 1738, // LROC post 1314: "1738 meters wide"
  slim: 880, // LROC post 1358: "880 meters wide"
  beresheet: 490, // LROC post 1101: "490 meters wide"
  apollo11: 819.2, // 0.40 m/px native 2048 crop
  apollo12: 819.2,
  apollo14: 921.6, // 0.45 m/px
  apollo15: 819.2,
  apollo16: 819.2,
  apollo17: 1024, // 0.50 m/px
};
const KAGUYA_SITES = Object.keys(KAGUYA_GSD);
const APOLLO = ['apollo11', 'apollo12', 'apollo14', 'apollo15', 'apollo16', 'apollo17'];

let n = 0;
for (const [id, e] of Object.entries(data.entries)) {
  if (!e.hotspot_tier2_source?.includes('/moon/') || (e.hotspot_tier_max ?? 0) < 2) continue;
  if (KAGUYA_SITES.includes(id) || APOLLO.includes(id)) {
    if (DETAIL_GROUND_M[id] == null) throw new Error(`no detail ground width for ${id}`);
    e.hotspot_tier2_ground_m = DETAIL_GROUND_M[id];
    e.hotspot_tier2_regional_ground_m = KAGUYA_SITES.includes(id)
      ? Math.round(KAGUYA_CROP_PX * KAGUYA_GSD[id])
      : 15360; // LROC NAC ROI regional _5M (3072 × 5)
    n++;
  }
  if (e.hotspot_tier2_ground_m) {
    console.log(
      `  ${id.padEnd(13)} detail=${e.hotspot_tier2_ground_m}m regional=${e.hotspot_tier2_regional_ground_m}m  (ratio 1/${Math.round(e.hotspot_tier2_regional_ground_m / e.hotspot_tier2_ground_m)})`,
    );
  }
}
fs.writeFileSync(P, JSON.stringify(data, null, 2) + '\n');
console.log(`\nAuthored co-scale ground extents for ${n} moon sites.`);
