import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { whiteBorderToBlack } from './panorama-padder';

/** 20×10: white margin all round, a grey interior with a white blob inside. */
async function fixture(): Promise<Buffer> {
  const w = 20;
  const h = 10;
  const px = Buffer.alloc(w * h * 3, 255);
  for (let y = 2; y < 8; y++)
    for (let x = 2; x < 18; x++) px.fill(120, (y * w + x) * 3, (y * w + x) * 3 + 3);
  for (let y = 4; y < 6; y++)
    for (let x = 9; x < 11; x++) px.fill(255, (y * w + x) * 3, (y * w + x) * 3 + 3);
  return sharp(px, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toBuffer();
}

describe('whiteBorderToBlack', () => {
  it('blackens the white margin but keeps white enclosed by the mosaic', async () => {
    const out = await sharp(await whiteBorderToBlack(await fixture()))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => out.data[(y * out.info.width + x) * 3];
    expect(at(0, 0)).toBeLessThan(20); // margin
    expect(at(19, 9)).toBeLessThan(20);
    expect(at(10, 5)).toBeGreaterThan(230); // enclosed highlight (sun flare)
    expect(Math.abs(at(5, 5) - 120)).toBeLessThan(15); // mosaic untouched
  });
});
