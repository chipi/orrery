// nl buran-ok-gli tagline over the 140-character limit after the fleet orbit edit.
//   node …/nl-buran-tagline.mjs <out.json>
import fs from 'node:fs';
const rel = 'fleet/crewed-spacecraft/buran-ok-gli.json';
const doc = JSON.parse(fs.readFileSync(`i18n-src/nl/${rel}`, 'utf8'));
const nu =
  "Burans atmosferische analoog, vergelijkbaar met NASA's Enterprise. Vier straalmotoren, 24 testvluchten 1985-88, nooit in een baan";
console.log([...nu].length);
fs.writeFileSync(
  process.argv[2],
  JSON.stringify([{ rel, at: 'tagline', old: doc.tagline, new: nu }]),
);
