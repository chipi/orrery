import { createHash } from 'node:crypto';
import path from 'node:path';
import gdal from 'gdal-async';
import { hiriseProductIdToJP2Url } from './hotspots/hirise-catalog.ts';
const products = [
  ['ESP_030313_1755', 'curiosity (broken)'],
  ['PSP_001890_1995', 'pathfinder (broken)'],
  ['ESP_017716_2485', 'phoenix (valid)'],
  ['ESP_037228_1755', 'opportunity? (test)'],
];
for (const [productId, label] of products) {
  const url = hiriseProductIdToJP2Url(productId);
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 16);
  const cachePath = path.join('.image-cache/hotspots/raw', `${hash}.JP2`);
  try {
    const ds = await gdal.openAsync(cachePath);
    const band = ds.bands.get(1);
    console.log(
      `${productId.padEnd(20)} ${label.padEnd(25)} dataType=${band.dataType}, bands=${ds.bands.count()}`,
    );
  } catch {
    console.log(`${productId.padEnd(20)} ${label.padEnd(25)} not in cache`);
  }
}
