/**
 * Visual preview generator for Issue #286 / PRD-022 / ADR-074.
 *
 * Renders 8 PNG mockup frames into docs/mockups/panorama-redesign/ showing
 * the proposed Tier-3 panorama redesign across the 7 marquee sites
 * (Apollo 11, Apollo 17, Curiosity, Perseverance, Chang'e 4, Chandrayaan-3,
 * Mars 3) plus 1 cross-link exhibit-mode frame.
 *
 * Each frame composites the existing panorama JPEG (cropped to a typical
 * ~60° FOV slice) as the background, then overlays schematic SVG of the
 * proposed UI: caption box, compass rose, annotation pins, "this region
 * not photographed" microcopy, cycler arrows for multi-pano sites,
 * cross-link footer.
 *
 * Backgrounds use static/images/hotspots/<body>/<site>/tier3-pan.jpg
 * directly — the panorama itself is the visual anchor; SVG drawn on top
 * shows what the NEW UI brings to that same view.
 *
 * Usage:  node scripts/mockups/render-panorama-redesign.mjs
 */
import { mkdir, writeFile, readFile, copyFile, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const OUT_DIR = resolve(REPO_ROOT, 'docs/mockups/panorama-redesign');
const HOTSPOT_DIR = resolve(REPO_ROOT, 'static/images/hotspots');

const W = 1920;
const H = 1080;

// Orrery design tokens (mirror of src/lib/styles/tokens.css) ────────────
const T = {
  bg: '#04040c',
  accent: '#4466ff',
  teal: '#4ecdc4',
  mars: '#c1440e',
  gold: '#ffc850',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.65)',
  textFaint: 'rgba(255,255,255,0.25)',
  border: 'rgba(255,255,255,0.15)',
  panelBg: 'rgba(4,4,12,0.78)',
  hudBg: 'rgba(5,5,20,0.88)',
  nasa: '#0b3d91',
  cnsa: '#de2910',
  isro: '#ff9933',
  roscosmos: '#8b0000',
};

const FONTS = `
  body { font-family: 'Helvetica Neue', Arial, sans-serif; }
  .mono { font-family: 'Space Mono', 'Courier New', monospace; }
  .display { font-family: 'Bebas Neue', 'Helvetica Neue', sans-serif; letter-spacing: 0.04em; }
`;

async function panoramaCrop(body, siteId, yawCenterDeg, fovDeg = 60) {
  // Copy the equirectangular panorama into OUT_DIR temporarily so the
  // HTML can reference it as a relative file (data URLs over ~256 KB
  // silently fail in Chromium's CSS parser, so we cannot inline 0.2-
  // 0.9 MB JPEGs that way).
  const srcPath = resolve(HOTSPOT_DIR, body, siteId, 'tier3-pan.jpg');
  const dstName = `_bg_${body}_${siteId}.jpg`;
  const dstPath = resolve(OUT_DIR, dstName);
  try {
    await copyFile(srcPath, dstPath);
    const cropFraction = fovDeg / 360;
    const bgWidthPct = 100 / cropFraction; // e.g. 600% for 60° FOV
    const yawShiftPct = ((yawCenterDeg + 180) / 360) * 100;
    return { url: dstName, tempPath: dstPath, bgWidthPct, yawShiftPct, missing: false };
  } catch {
    return { url: null, tempPath: null, bgWidthPct: 100, yawShiftPct: 0, missing: true };
  }
}

// ── Shared HUD chrome — drawn around every frame ──────────────────────
function captionOverlay({ sol, date, instrument, caption, credit, agency = 'NASA' }) {
  const agencyColour =
    {
      NASA: T.nasa,
      CNSA: T.cnsa,
      ISRO: T.isro,
      USSR: T.roscosmos,
      Roscosmos: T.roscosmos,
    }[agency] ?? T.nasa;
  return `
    <div class="caption-overlay" style="
      position: absolute; bottom: 24px; left: 24px; max-width: 560px;
      background: ${T.panelBg}; border: 1px solid ${T.border};
      border-left: 3px solid ${agencyColour};
      padding: 14px 18px; backdrop-filter: blur(6px);
      color: ${T.text}; font-size: 13px; line-height: 1.5;
    ">
      <div class="mono" style="font-size: 11px; color: ${T.textDim}; letter-spacing: 0.08em; margin-bottom: 6px;">
        ${sol ? `SOL ${sol} · ` : ''}${date} · ${instrument}
      </div>
      <div style="font-size: 14px; margin-bottom: 6px;">${caption}</div>
      <div class="mono" style="font-size: 10px; color: ${T.textFaint};">${credit}</div>
    </div>
  `;
}

function compassRose(yawDeg) {
  // Compass rose: cardinal markers, N-arrow rotates with the inverse of
  // camera yaw so the arrow points to panorama north.
  const arrowAngle = -yawDeg;
  return `
    <div style="
      position: absolute; top: 18px; right: 24px;
      width: 78px; height: 78px;
      background: ${T.hudBg}; border: 1px solid ${T.border};
      border-radius: 50%; backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
    ">
      <svg width="68" height="68" viewBox="-34 -34 68 68">
        <circle r="30" fill="none" stroke="${T.textFaint}" stroke-width="0.8" />
        <text x="0" y="-22" text-anchor="middle" font-size="9" fill="${T.textDim}" class="mono">N</text>
        <text x="22" y="3" text-anchor="middle" font-size="9" fill="${T.textFaint}" class="mono">E</text>
        <text x="0" y="26" text-anchor="middle" font-size="9" fill="${T.textFaint}" class="mono">S</text>
        <text x="-22" y="3" text-anchor="middle" font-size="9" fill="${T.textFaint}" class="mono">W</text>
        <g transform="rotate(${arrowAngle})">
          <polygon points="0,-18 -4,4 0,1 4,4" fill="${T.gold}" />
        </g>
      </svg>
    </div>
  `;
}

function annotationPin({ xPct, yPct, label }) {
  // SVG pin at the panorama-screen position derived from yaw/pitch.
  // Mockup uses absolute % positioning; renderer math is separate.
  return `
    <div style="
      position: absolute; left: ${xPct}%; top: ${yPct}%;
      transform: translate(-50%, -100%); pointer-events: none;
    ">
      <svg width="28" height="40" viewBox="0 0 28 40">
        <circle cx="14" cy="14" r="10" fill="${T.accent}" stroke="${T.text}" stroke-width="2" opacity="0.9" />
        <polygon points="14,40 8,24 20,24" fill="${T.accent}" opacity="0.9" />
        <circle cx="14" cy="14" r="3" fill="${T.text}" />
      </svg>
      <div class="mono" style="
        position: absolute; left: 32px; top: 4px; white-space: nowrap;
        background: ${T.panelBg}; padding: 4px 10px;
        border: 1px solid ${T.border}; color: ${T.text};
        font-size: 11px; letter-spacing: 0.05em;
      ">${label}</div>
    </div>
  `;
}

function syntheticRegionMicrocopy() {
  return `
    <div style="
      position: absolute; top: 48%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.55); border: 1px dashed ${T.textFaint};
      padding: 18px 32px; color: ${T.textDim};
      font-size: 14px; text-align: center; max-width: 480px;
      backdrop-filter: blur(3px);
    ">
      <div class="mono" style="font-size: 10px; color: ${T.textFaint}; letter-spacing: 0.12em; margin-bottom: 6px;">
        SYNTHETIC FILL
      </div>
      This region of the sky was not photographed at this site.<br/>
      The visible pattern is synthetic.
    </div>
  `;
}

function cyclerArrows(currentLabel, totalCount) {
  return `
    <div style="
      position: absolute; top: 50%; left: 24px;
      transform: translateY(-50%);
      width: 44px; height: 44px;
      background: ${T.hudBg}; border: 1px solid ${T.border};
      border-radius: 50%; backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      color: ${T.text}; font-size: 22px;
    ">‹</div>
    <div style="
      position: absolute; top: 50%; right: 24px;
      transform: translateY(-50%);
      width: 44px; height: 44px;
      background: ${T.hudBg}; border: 1px solid ${T.border};
      border-radius: 50%; backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      color: ${T.text}; font-size: 22px;
    ">›</div>
    <div class="mono" style="
      position: absolute; top: 18px; left: 50%;
      transform: translateX(-50%);
      background: ${T.hudBg}; border: 1px solid ${T.border};
      padding: 6px 14px; color: ${T.textDim};
      font-size: 11px; letter-spacing: 0.08em; backdrop-filter: blur(6px);
    ">${currentLabel} · ${totalCount} panoramas at this site</div>
  `;
}

function crossLinkFooter(links) {
  // links: Array<{ label: string, hint?: string }>
  const items = links
    .map(
      (l) => `
    <span style="
      background: ${T.hudBg}; border: 1px solid ${T.border};
      padding: 6px 12px; color: ${T.text}; font-size: 12px;
      display: inline-flex; align-items: center; gap: 6px;
    ">
      <span class="mono" style="font-size: 10px; color: ${T.textDim}; letter-spacing: 0.05em;">${l.hint ?? '→'}</span>
      ${l.label}
    </span>
  `,
    )
    .join('');
  return `
    <div style="
      position: absolute; bottom: 24px; right: 24px;
      display: flex; gap: 8px; backdrop-filter: blur(6px);
    ">${items}</div>
  `;
}

function exitButton() {
  return `
    <div style="
      position: absolute; top: 18px; left: 24px;
      background: ${T.hudBg}; border: 1px solid ${T.border};
      padding: 8px 14px; color: ${T.text};
      font-size: 12px; backdrop-filter: blur(6px);
      display: inline-flex; align-items: center; gap: 8px;
    ">
      <span style="font-size: 16px;">↩</span>
      <span class="mono" style="letter-spacing: 0.06em;">RETURN TO ORBIT · ESC</span>
    </div>
  `;
}

// ── Frame builder ─────────────────────────────────────────────────────
function frame({ background, css = '', body }) {
  // Use an absolutely-positioned <img> so we can compute crop in pixels
  // directly (more predictable than CSS background-position %).
  // For a 60° FOV out of 360°, the visible slice is 1/6 of the source
  // width. Scale source to fit the viewport horizontally at that ratio:
  // image-rendered-width = viewport-width * (360 / fovDeg) = 1920 * 6 = 11520.
  const fovScale = background.missing ? 1 : background.bgWidthPct / 100;
  const imgWidth = Math.round(W * fovScale);
  // Source is 2:1 aspect, so rendered height = imgWidth / 2.
  const imgHeight = Math.round(imgWidth / 2);
  // Horizontal offset: yaw 0 = centre of source = centre of viewport.
  // yawShiftPct is the centre of the visible slice as a percentage of
  // source width (0 = far left of source, 100 = far right). Compute
  // left offset so the visible-slice centre lands at viewport-centre.
  const sliceCentreX = imgWidth * (background.yawShiftPct / 100);
  const leftOffset = Math.round(W / 2 - sliceCentreX);
  const topOffset = Math.round(H / 2 - imgHeight / 2);

  const bgEl = background.missing
    ? `<div style="position:absolute;inset:0;background:repeating-linear-gradient(45deg,#181830 0 12px,#1a1a36 12px 24px);"></div>`
    : `<img src="${background.url}" style="position:absolute;left:${leftOffset}px;top:${topOffset}px;width:${imgWidth}px;height:${imgHeight}px;" />`;

  return `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  ${FONTS}
  html, body { margin: 0; padding: 0; width: ${W}px; height: ${H}px; background: ${T.bg}; overflow: hidden; }
  .scene { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
  ${css}
</style></head><body>
  <div class="scene">${bgEl}${body}</div>
</body></html>`;
}

// ── Frames ────────────────────────────────────────────────────────────

async function frame01_apollo11() {
  const bg = await panoramaCrop('moon', 'apollo11', 0, 60); // centred on LM
  return frame({
    background: bg,
    body: `
      ${exitButton()}
      ${compassRose(15)}
      ${captionOverlay({
        sol: null,
        date: '1969-07-20',
        instrument: 'Hasselblad 70mm',
        caption:
          'Tranquility Base, EVA-1. Buzz Aldrin photographed the LM Eagle and the U.S. flag soon after landing. Visible Hasselblad seams + chromatic stitching at LM are part of the published mosaic.',
        credit: 'NASA · Apollo Lunar Surface Journal',
        agency: 'NASA',
      })}
      ${annotationPin({ xPct: 56, yPct: 48, label: 'LM Eagle' })}
      ${annotationPin({ xPct: 48, yPct: 50, label: 'U.S. flag' })}
      ${annotationPin({ xPct: 38, yPct: 65, label: 'Buzz Aldrin shadow' })}
      ${crossLinkFooter([
        { label: 'Apollo 11 mission', hint: '↗' },
        { label: 'Audio: ep. 7', hint: '♪' },
      ])}
    `,
  });
}

async function frame02_apollo17() {
  const bg = await panoramaCrop('moon', 'apollo17', 20, 60);
  return frame({
    background: bg,
    body: `
      ${exitButton()}
      ${compassRose(-30)}
      ${captionOverlay({
        sol: null,
        date: '1972-12-12',
        instrument: 'Hasselblad 70mm',
        caption:
          'Taurus-Littrow valley, Station 5. Schmitt + Cernan worked Camelot Crater and the South Massif here. Final lunar EVA panorama in the Apollo programme.',
        credit: 'NASA · Apollo 17 / ALSJ',
        agency: 'NASA',
      })}
      ${annotationPin({ xPct: 22, yPct: 38, label: 'South Massif' })}
      ${annotationPin({ xPct: 70, yPct: 42, label: 'Camelot Crater rim' })}
      ${annotationPin({ xPct: 52, yPct: 60, label: 'Lunar Roving Vehicle' })}
      ${crossLinkFooter([
        { label: 'Apollo 17 mission', hint: '↗' },
        { label: 'Mt. Hadley traverse', hint: '↗' },
      ])}
    `,
  });
}

async function frame03_curiosity_with_cycler() {
  const bg = await panoramaCrop('mars', 'curiosity', 0, 60);
  return frame({
    background: bg,
    body: `
      ${exitButton()}
      ${compassRose(120)}
      ${cyclerArrows('Sol 3573 · Mt. Sharp climb', 4)}
      ${captionOverlay({
        sol: 3573,
        date: '2022-08-12',
        instrument: 'Mastcam-Z',
        caption:
          'Approaching Mt. Sharp, lower flanks. Curiosity drives on a south-east heading; Vera Rubin Ridge visible in the far distance, terrain becoming increasingly clay-rich.',
        credit: 'NASA/JPL-Caltech/MSSS',
        agency: 'NASA',
      })}
      ${annotationPin({ xPct: 18, yPct: 36, label: 'Vera Rubin Ridge' })}
      ${annotationPin({ xPct: 52, yPct: 30, label: 'Mt. Sharp summit (~5 km)' })}
      ${annotationPin({ xPct: 78, yPct: 55, label: 'Drill site — Glasgow' })}
      ${crossLinkFooter([
        { label: 'Curiosity mission', hint: '↗' },
        { label: 'Traverse: sol 3573 stop', hint: '↗' },
        { label: 'Audio: ep. 14', hint: '♪' },
      ])}
    `,
  });
}

async function frame04_perseverance() {
  const bg = await panoramaCrop('mars', 'perseverance', 0, 60);
  return frame({
    background: bg,
    body: `
      ${exitButton()}
      ${compassRose(80)}
      ${captionOverlay({
        sol: 46,
        date: '2021-04-06',
        instrument: 'Mastcam-Z',
        caption:
          'Three Forks depot — sample tubes laid out before Perseverance left the area. Ingenuity helicopter visible right; Jezero crater rim ~25 km away across the floor.',
        credit: 'NASA/JPL-Caltech/ASU',
        agency: 'NASA',
      })}
      ${annotationPin({ xPct: 72, yPct: 62, label: 'Ingenuity helicopter' })}
      ${annotationPin({ xPct: 35, yPct: 45, label: 'Sample tubes — Three Forks' })}
      ${annotationPin({ xPct: 12, yPct: 30, label: 'Jezero crater rim (~25 km)' })}
      ${crossLinkFooter([
        { label: 'Perseverance mission', hint: '↗' },
        { label: 'Sol 46 traverse stop', hint: '↗' },
        { label: 'Audio: ep. 18', hint: '♪' },
      ])}
    `,
  });
}

async function frame05_change4() {
  const bg = await panoramaCrop('moon', 'change4', 0, 60);
  return frame({
    background: bg,
    body: `
      ${exitButton()}
      ${compassRose(45)}
      ${captionOverlay({
        sol: null,
        date: '2019-01-03',
        instrument: 'Terrain Camera',
        caption:
          'First panorama ever transmitted from the lunar farside. Von Kármán crater within South Pole–Aitken Basin. Yutu-2 rover visible mid-distance; lander shadow lower-left.',
        credit: 'CNSA · CLEP / CAS',
        agency: 'CNSA',
      })}
      ${annotationPin({ xPct: 30, yPct: 55, label: 'Yutu-2 rover' })}
      ${annotationPin({ xPct: 65, yPct: 45, label: 'Von Kármán crater rim' })}
      ${annotationPin({ xPct: 50, yPct: 70, label: "Chang'e 4 lander shadow" })}
      ${crossLinkFooter([
        { label: "Chang'e 4 mission", hint: '↗' },
        { label: 'Yutu-2 rover · Fleet', hint: '↗' },
      ])}
    `,
  });
}

async function frame06_chandrayaan3() {
  const bg = await panoramaCrop('moon', 'chandrayaan3', 0, 60);
  return frame({
    background: bg,
    body: `
      ${exitButton()}
      ${compassRose(-15)}
      ${captionOverlay({
        sol: null,
        date: '2023-08-23',
        instrument: 'Landing Imager',
        caption:
          'Shiv Shakti Point — first panorama from the lunar south pole. Vikram lander shadow visible foreground; Pragyan rover deployed onto the regolith shortly after this image.',
        credit: 'ISRO · Chandrayaan-3 mission',
        agency: 'ISRO',
      })}
      ${annotationPin({ xPct: 42, yPct: 60, label: 'Pragyan rover (deployed sol +1)' })}
      ${annotationPin({ xPct: 64, yPct: 35, label: 'South pole crater rim' })}
      ${crossLinkFooter([
        { label: 'Chandrayaan-3 mission', hint: '↗' },
        { label: 'Vikram lander · Fleet', hint: '↗' },
      ])}
    `,
  });
}

async function frame07_mars3_honest_artifact() {
  const bg = await panoramaCrop('mars', 'mars3', 0, 60);
  return frame({
    background: bg,
    body: `
      ${exitButton()}
      ${compassRose(0)}
      ${captionOverlay({
        sol: null,
        date: '1971-12-02',
        instrument: 'Panoramic facsimile',
        caption:
          'First Mars soft landing — 14.5 s of transmitted scan data before signal lost. This panorama is reconstructed from that fragment. Most of the visible image is synthetic fill honouring the historical artifact.',
        credit: 'USSR · Soviet Academy of Sciences',
        agency: 'USSR',
      })}
      ${syntheticRegionMicrocopy()}
      ${crossLinkFooter([
        { label: 'Mars 3 mission', hint: '↗' },
        { label: 'Soviet Mars programme', hint: '↗' },
      ])}
    `,
  });
}

async function frame08_perseverance_look_up_synthetic() {
  // Same site as frame 4 but with camera pitched up — synthetic region
  // microcopy fires. Shifts background vertically.
  const bg = await panoramaCrop('mars', 'perseverance', 0, 60);
  return frame({
    background: { ...bg, yawShiftPct: bg.yawShiftPct },
    css: `
      .scene {
        background-position: -${bg.yawShiftPct}% 0%;
        /* shift background up to "look up" — top of pano becomes centre-screen */
      }
    `,
    body: `
      ${exitButton()}
      ${compassRose(80)}
      ${captionOverlay({
        sol: 46,
        date: '2021-04-06',
        instrument: 'Mastcam-Z',
        caption:
          'Three Forks depot — looking up. Mastcam-Z did not capture pixels above +15° pitch here; the visible sky-fill is synthetic, not real Mars atmosphere.',
        credit: 'NASA/JPL-Caltech/ASU',
        agency: 'NASA',
      })}
      ${syntheticRegionMicrocopy()}
      ${crossLinkFooter([
        { label: 'Perseverance mission', hint: '↗' },
        { label: 'Sol 46 traverse stop', hint: '↗' },
      ])}
    `,
  });
}

const frames = [
  ['01-apollo11', frame01_apollo11],
  ['02-apollo17', frame02_apollo17],
  ['03-curiosity-with-cycler', frame03_curiosity_with_cycler],
  ['04-perseverance', frame04_perseverance],
  ['05-change4', frame05_change4],
  ['06-chandrayaan3', frame06_chandrayaan3],
  ['07-mars3-honest-artifact', frame07_mars3_honest_artifact],
  ['08-perseverance-look-up-synthetic', frame08_perseverance_look_up_synthetic],
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  for (const [name, fn] of frames) {
    const html = await fn();
    const tmpHtml = resolve(OUT_DIR, `_${name}.html`);
    await writeFile(tmpHtml, html, 'utf8');
    await page.goto('file://' + tmpHtml);
    await page.waitForLoadState('networkidle');
    const outPng = resolve(OUT_DIR, `${name}.png`);
    await page.screenshot({
      path: outPng,
      type: 'png',
      fullPage: false,
      clip: { x: 0, y: 0, width: W, height: H },
    });
    console.log(`✓ ${name}.png`);
  }

  await browser.close();

  for (const [name] of frames) {
    await unlink(resolve(OUT_DIR, `_${name}.html`)).catch(() => {});
  }
  // Clean up temp panorama copies (the _bg_<body>_<site>.jpg files).
  const { readdir } = await import('node:fs/promises');
  for (const f of await readdir(OUT_DIR)) {
    if (f.startsWith('_bg_') && f.endsWith('.jpg')) {
      await unlink(resolve(OUT_DIR, f)).catch(() => {});
    }
  }

  console.log(`\nDone. ${frames.length} frames → ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
