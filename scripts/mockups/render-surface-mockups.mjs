/**
 * Slice 0 visual preview generator for Issue #283.
 *
 * Renders 12 PNG mockup frames into docs/mockups/surface-redesign/ showing the
 * proposed surface-hotspot redesign at 6 zoom states × Mars + Moon.
 *
 * Each frame is a self-contained HTML page with inline SVG, rendered via
 * Playwright at 1920×1080. Backgrounds use the existing planet textures from
 * static/textures/ (the original screenshot inputs were chat attachments and
 * were not persisted to disk).
 *
 * Usage:  node scripts/mockups/render-surface-mockups.mjs
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const OUT_DIR = resolve(REPO_ROOT, 'docs/mockups/surface-redesign');
const TEX_DIR = resolve(REPO_ROOT, 'static/textures');

const W = 1920;
const H = 1080;

// ── Orrery design tokens (mirror of src/lib/styles/tokens.css) ────
const T = {
  bg: '#04040c',
  accent: '#4466ff',
  teal: '#4ecdc4',
  mars: '#c1440e',
  earth: '#4b9cd3',
  gold: '#ffc850',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.35)',
  textFaint: 'rgba(255,255,255,0.15)',
  border: 'rgba(255,255,255,0.07)',
  panelBg: 'rgba(4,4,12,0.97)',
  hudBg: 'rgba(5,5,20,0.88)',
  navBg: 'rgba(4,4,12,0.88)',
  nasa: '#0b3d91',
  esa: '#003299',
  cnsa: '#de2910',
  isro: '#ff9933',
  roscosmos: '#8b0000',
  jaxa: '#003087',
};

const FONTS = `
  body { font-family: 'Helvetica Neue', Arial, sans-serif; }
  .display { font-family: 'Bebas Neue', 'Helvetica Neue', sans-serif; letter-spacing: 0.04em; }
  .mono { font-family: 'Space Mono', 'Courier New', monospace; }
`;

// Read a texture as base64 for inline embedding
async function texAsDataUrl(name) {
  const buf = await readFile(resolve(TEX_DIR, name));
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

// ── Shared chrome (header, side rail, panel) — drawn around every frame ─
function chrome({ activeRoute = 'MARS', siteName = '', siteSub = '' } = {}) {
  const routes = [
    'HOME',
    'OUR SOLAR SYSTEM',
    'MISSIONS',
    'FLEET',
    'PLAN',
    'FLY',
    'EARTH',
    'MOON',
    'MARS',
    'ISS',
    'TIANGONG',
    'SCIENCE',
  ];
  const routesHtml = routes
    .map((r) => {
      const active = r === activeRoute;
      return `<span class="route ${active ? 'active' : ''}">${r}</span>`;
    })
    .join('');

  return `
    <div class="topnav">
      <span class="brand display">ORRERY</span>
      <div class="routes">${routesHtml}</div>
      <div class="topright">
        <span class="chip"></span>
        <span class="chip flag">EN</span>
        <span class="chip"></span>
        <span class="chip">AA</span>
      </div>
    </div>

    <div class="siderail">
      <div class="rail-btn">2D</div>
      <div class="rail-btn">RESET<br/>VIEW</div>
      <div class="rail-btn">RESUME<br/>SPIN</div>
      <div class="rail-chip">SURFACE</div>
      <div class="rail-chip">ORBITERS</div>
      <div class="rail-chip">ORBITS</div>
      <div class="rail-chip">TRAVERSES</div>
      <div class="rail-chip">HOTSPOTS · AUTO</div>
    </div>

    ${
      siteName
        ? `<div class="panel">
      <div class="panel-head display">${siteName}</div>
      ${siteSub ? `<div class="panel-sub mono">${siteSub}</div>` : ''}
      <div class="panel-photo"></div>
      <div class="panel-tabs">
        <span class="tab active">OVERVIEW</span><span class="tab">GALLERY</span><span class="tab">STORY</span><span class="tab">LEARN</span>
      </div>
      <div class="panel-body"></div>
    </div>`
        : ''
    }
  `;
}

// ── Caption strip overlaid bottom-center for the mockup itself ─────
function caption(text) {
  return `<div class="caption mono">${text}</div>`;
}

// Common CSS shared by every frame
const CHROME_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ${FONTS}
  html, body { width: ${W}px; height: ${H}px; background: ${T.bg}; color: ${T.text}; overflow: hidden; }
  .stage { position: relative; width: 100%; height: 100%; }

  .topnav {
    position: absolute; top: 0; left: 0; right: 0; height: 60px;
    background: ${T.navBg}; border-bottom: 1px solid ${T.border};
    display: flex; align-items: center; padding: 0 24px; z-index: 10;
  }
  .brand { font-size: 30px; color: ${T.text}; margin-right: 32px; }
  .routes { display: flex; gap: 24px; flex: 1; font-size: 13px; letter-spacing: 0.1em; }
  .route { color: ${T.textDim}; }
  .route.active { color: ${T.text}; background: ${T.nasa}; padding: 6px 10px; border-radius: 3px; }
  .topright { display: flex; gap: 8px; }
  .chip { width: 38px; height: 28px; border: 1px solid ${T.border}; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; color: ${T.textDim}; }
  .chip.flag { width: 56px; background: linear-gradient(90deg, #b22234 33%, #fff 33% 66%, #3c3b6e 66%); color: #fff; font-weight: bold; }

  .siderail {
    position: absolute; top: 80px; left: 16px; width: 132px; display: flex; flex-direction: column; gap: 10px; z-index: 8;
  }
  .rail-btn, .rail-chip {
    background: ${T.hudBg}; border: 1px solid ${T.border}; color: ${T.text}; text-align: center; font-size: 11px;
    letter-spacing: 0.1em; padding: 8px 6px; border-radius: 4px;
  }
  .rail-chip { background: rgba(193,68,14,0.18); border-color: rgba(193,68,14,0.45); color: rgba(255,200,170,0.95); }

  .panel {
    position: absolute; top: 80px; right: 16px; width: 360px; bottom: 80px;
    background: ${T.panelBg}; border: 1px solid ${T.border}; border-radius: 4px; padding: 24px; z-index: 8;
  }
  .panel-head { font-size: 28px; }
  .panel-sub { font-size: 11px; color: ${T.textDim}; margin: 6px 0 16px; letter-spacing: 0.06em; }
  .panel-photo { width: 100%; aspect-ratio: 16/10; background: #1a1a1a url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="%23222"/><text x="50" y="34" text-anchor="middle" fill="%23555" font-family="monospace" font-size="10">PHOTO</text></svg>') center/cover no-repeat; border-radius: 4px; margin-bottom: 16px; }
  .panel-tabs { display: flex; gap: 18px; border-bottom: 1px solid ${T.border}; padding-bottom: 8px; }
  .tab { font-size: 11px; color: ${T.textDim}; letter-spacing: 0.1em; }
  .tab.active { color: ${T.text}; border-bottom: 2px solid ${T.gold}; padding-bottom: 6px; }
  .panel-body { padding-top: 16px; font-size: 12px; color: ${T.textDim}; line-height: 1.6; }

  .caption {
    position: absolute; top: 72px; left: 50%; transform: translateX(-50%);
    background: rgba(255, 200, 80, 0.92); border: 1px solid ${T.gold}; color: #1a0e00;
    padding: 6px 14px; border-radius: 3px; font-size: 11px; letter-spacing: 0.08em; z-index: 30;
    max-width: 1200px; text-align: center;
  }

  .scenearea {
    position: absolute; top: 0; left: 0; width: ${W}px; height: ${H}px;
    overflow: hidden; z-index: 1;
  }
  .scenearea svg { display: block; width: ${W}px; height: ${H}px; }

  /* HUD elements (scale bar, lat/lon) */
  .hud-scale {
    position: absolute; bottom: 32px; left: 24px;
    background: ${T.hudBg}; border: 1px solid ${T.border}; padding: 6px 10px; border-radius: 3px;
    color: ${T.text}; font-size: 11px; display: flex; align-items: center; gap: 10px;
  }
  .hud-scale .bar { display: inline-block; height: 3px; background: ${T.text}; }
  .hud-latlon {
    position: absolute; bottom: 32px; right: 24px;
    background: ${T.hudBg}; border: 1px solid ${T.border}; padding: 6px 10px; border-radius: 3px;
    color: ${T.text}; font-size: 11px;
  }
  .hud-back {
    position: absolute; top: 16px; left: 16px;
    background: ${T.hudBg}; border: 1px solid ${T.border}; padding: 6px 12px; border-radius: 3px;
    color: ${T.text}; font-size: 11px; letter-spacing: 0.08em;
  }
`;

// ── Frame template wrapper ───────────────────────────────────────────
function frame({ title, css = '', body, captionText }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>${CHROME_CSS}${css}</style></head>
<body><div class="stage">${body}${caption(captionText)}</div></body></html>`;
}

// ── SVG helpers for proposed UI ─────────────────────────────────────
function regionRect({ x, y, w, h, label, agency = 'nasa', selected = false, labelAbove = true }) {
  const stroke = T[agency] || T.accent;
  const sel = selected
    ? `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" fill="none" stroke="${T.accent}" stroke-width="2" stroke-dasharray="0" opacity="0.95" />`
    : '';
  const labelY = labelAbove ? y - 6 : y + h + 14;
  const labelTextAnchor = 'middle';
  // Label backdrop for legibility
  const labelW = label.length * 6.8 + 8;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${stroke}" fill-opacity="0.25" stroke="${stroke}" stroke-width="2" />
    ${sel}
    <rect x="${x + w / 2 - labelW / 2}" y="${labelY - 9}" width="${labelW}" height="13" fill="rgba(0,0,0,0.75)" />
    <text x="${x + w / 2}" y="${labelY}" text-anchor="${labelTextAnchor}" fill="${T.text}" font-family="'Space Mono', monospace" font-size="10" font-weight="bold" letter-spacing="0.04em">${label}</text>
  `;
}

function roverGlyph(cx, cy, size = 8, color = T.text) {
  return `<g transform="translate(${cx},${cy})">
    <rect x="${-size / 2}" y="${-size / 3}" width="${size}" height="${size * 0.6}" fill="${color}" />
    <circle cx="${-size / 3}" cy="${size / 3}" r="${size * 0.18}" fill="${color}" />
    <circle cx="${size / 3}" cy="${size / 3}" r="${size * 0.18}" fill="${color}" />
  </g>`;
}

function landerGlyph(cx, cy, size = 10, color = T.text) {
  return `<g transform="translate(${cx},${cy})">
    <polygon points="0,${-size / 2} ${size / 2},${size / 3} ${-size / 2},${size / 3}" fill="${color}" />
    <line x1="${-size / 2}" y1="${size / 3}" x2="${-size / 1.5}" y2="${size / 1.8}" stroke="${color}" stroke-width="1.5" />
    <line x1="${size / 2}" y1="${size / 3}" x2="${size / 1.5}" y2="${size / 1.8}" stroke="${color}" stroke-width="1.5" />
  </g>`;
}

function tubePin(cx, cy, size = 6, color = T.mars) {
  return `<g transform="translate(${cx},${cy})">
    <path d="M 0 ${-size} C ${size * 0.7} ${-size}, ${size * 0.7} 0, 0 ${size * 0.4} C ${-size * 0.7} 0, ${-size * 0.7} ${-size}, 0 ${-size} Z"
          fill="${color}" stroke="${T.text}" stroke-width="0.5" />
  </g>`;
}

function scaleBar({ label, widthPx }) {
  return `<div class="hud-scale"><span>Map Scale</span><span class="bar" style="width: ${widthPx}px"></span><span class="mono">${label}</span></div>`;
}

function latLon({ lon, lat }) {
  return `<div class="hud-latlon mono">Lon ${lon}°  ·  Lat ${lat}°</div>`;
}

// ════════════════════════════════════════════════════════════════════
// FRAMES
// ════════════════════════════════════════════════════════════════════

async function frame01_marsPlanetWide() {
  const mars = await texAsDataUrl('2k_mars.1x1.jpg');
  const sceneCx = (W - 164 - 392) / 2 + 164; // center of scenearea
  const sceneCy = 60 + (H - 60) / 2;
  const planetR = 420;

  // Region positions on the planet — placed where each mission roughly is
  const regions = [
    { cx: sceneCx + 60, cy: sceneCy + 40, w: 70, h: 44, label: 'CURIOSITY', agency: 'nasa' },
    { cx: sceneCx + 180, cy: sceneCy - 70, w: 60, h: 38, label: 'PERSEVERANCE', agency: 'nasa' },
    { cx: sceneCx - 110, cy: sceneCy - 30, w: 50, h: 32, label: 'INSIGHT', agency: 'nasa' },
    { cx: sceneCx - 250, cy: sceneCy + 110, w: 48, h: 30, label: 'SPIRIT', agency: 'nasa' },
    { cx: sceneCx - 60, cy: sceneCy + 170, w: 52, h: 32, label: 'OPPORTUNITY', agency: 'nasa' },
    { cx: sceneCx + 220, cy: sceneCy + 130, w: 48, h: 30, label: 'VIKING 1', agency: 'nasa' },
    { cx: sceneCx - 200, cy: sceneCy - 130, w: 46, h: 28, label: 'ZHURONG', agency: 'cnsa' },
  ];

  const regionSvg = regions
    .map(
      (r) => `
    ${regionRect({ x: r.cx - r.w / 2, y: r.cy - r.h / 2, w: r.w, h: r.h, label: r.label, agency: r.agency })}
    ${r.label.includes('VIKING') || r.label.includes('INSIGHT') ? landerGlyph(r.cx, r.cy, 9, T.text) : roverGlyph(r.cx, r.cy, 9, T.text)}
  `,
    )
    .join('');

  const body = `
    ${chrome({ activeRoute: 'MARS' })}
    <div class="scenearea">
      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <clipPath id="planet"><circle cx="${sceneCx}" cy="${sceneCy}" r="${planetR}" /></clipPath>
          <radialGradient id="atmos" cx="50%" cy="50%" r="50%">
            <stop offset="92%" stop-color="${T.mars}" stop-opacity="0" />
            <stop offset="100%" stop-color="${T.mars}" stop-opacity="0.5" />
          </radialGradient>
        </defs>
        <image href="${mars}" x="${sceneCx - planetR}" y="${sceneCy - planetR}" width="${planetR * 2}" height="${planetR * 2}" clip-path="url(#planet)" />
        <circle cx="${sceneCx}" cy="${sceneCy}" r="${planetR + 4}" fill="url(#atmos)" />
        ${regionSvg}
      </svg>
    </div>
  `;

  return frame({
    title: 'Mars · Planet Wide',
    body,
    captionText:
      'Frame 01 / 12 · Mars planet wide · proposed: rectangular region polygons replace 3D-model + circular-ring markers',
  });
}

async function frame02_marsMidZoom() {
  const mars = await texAsDataUrl('2k_mars.jpg');
  const sceneCx = (W - 164 - 392) / 2 + 164;
  const sceneCy = 60 + (H - 60) / 2;

  // Show a closer crop on a region — simulate sphere mid-zoom
  const body = `
    ${chrome({ activeRoute: 'MARS', siteName: 'CURIOSITY', siteSub: 'Uncrewed rover · Active · Gale Crater' })}
    <div class="scenearea">
      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <clipPath id="bigplanet"><circle cx="${sceneCx}" cy="${sceneCy + 200}" r="900" /></clipPath>
        </defs>
        <image href="${mars}" x="${sceneCx - 1300}" y="${sceneCy - 400}" width="2600" height="1500" clip-path="url(#bigplanet)" preserveAspectRatio="xMidYMid slice" />

        <!-- Curiosity region: stylized rectangle, selection halo is the bounding rect (not a separate ring) -->
        <g>
          <rect x="${sceneCx - 90}" y="${sceneCy - 40}" width="180" height="120" fill="${T.gold}" fill-opacity="0.10" stroke="${T.gold}" stroke-width="2" />
          <!-- Selection bounding-rect (the only halo) -->
          <rect x="${sceneCx - 96}" y="${sceneCy - 46}" width="192" height="132" fill="none" stroke="${T.accent}" stroke-width="2" />
          <text x="${sceneCx}" y="${sceneCy - 56}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="13" letter-spacing="0.05em">CURIOSITY</text>
          ${roverGlyph(sceneCx, sceneCy + 20, 14, T.text)}
        </g>

        <!-- Microcopy hinting at the deep-zoom transition -->
        <g>
          <rect x="${sceneCx - 130}" y="${sceneCy + 110}" width="260" height="28" fill="${T.hudBg}" stroke="${T.border}" />
          <text x="${sceneCx}" y="${sceneCy + 128}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="11">Zoom in to enter ground view ↓</text>
        </g>
      </svg>

      ${latLon({ lon: '137.44', lat: '-4.59' })}
    </div>
  `;

  return frame({
    title: 'Mars · Mid Zoom Region Selected',
    body,
    captionText:
      'Frame 02 / 12 · Mars mid-zoom · selection = bounding-rect outline (no decoupled halo, no pulse)',
  });
}

async function frame03_marsThreshold() {
  const mars = await texAsDataUrl('2k_mars.jpg');
  const sceneCx = (W - 164 - 392) / 2 + 164;
  const sceneCy = 60 + (H - 60) / 2;

  const body = `
    ${chrome({ activeRoute: 'MARS', siteName: 'CURIOSITY', siteSub: 'Transitioning to ground view…' })}
    <div class="scenearea">
      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <clipPath id="thresphere"><circle cx="${sceneCx}" cy="${sceneCy - 80}" r="700" /></clipPath>
          <linearGradient id="fadeOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${T.bg}" stop-opacity="0" />
            <stop offset="0.7" stop-color="${T.bg}" stop-opacity="0" />
            <stop offset="1" stop-color="${T.bg}" stop-opacity="1" />
          </linearGradient>
        </defs>
        <image href="${mars}" x="${sceneCx - 1000}" y="${sceneCy - 700}" width="2000" height="1400" clip-path="url(#thresphere)" preserveAspectRatio="xMidYMid slice" />
        <rect x="0" y="${sceneCy - 100}" width="${W}" height="${sceneCy + 200}" fill="url(#fadeOut)" />

        <!-- Emerging flat patch below -->
        <g transform="translate(${sceneCx - 380}, ${sceneCy + 200})" opacity="0.85">
          <rect x="0" y="0" width="760" height="240" fill="#3a2418" stroke="${T.gold}" stroke-width="1.5" />
          <text x="380" y="-12" text-anchor="middle" fill="${T.textDim}" font-family="'Space Mono', monospace" font-size="11">↓ ground view forming ↓</text>
          <!-- Inner detail rect -->
          <rect x="260" y="60" width="240" height="120" fill="#5a3a28" stroke="${T.gold}" stroke-width="2" />
        </g>
      </svg>
    </div>
  `;

  return frame({
    title: 'Mars · Threshold Transition',
    body,
    captionText: 'Frame 03 / 12 · Sphere → flat ground patch threshold · animated fade (~600ms)',
  });
}

async function frame04_marsFlatPatch() {
  const sceneL = 164;
  const sceneT = 60;
  const sceneW = W - 164 - 392;
  const sceneH = H - 60;
  const cx = sceneL + sceneW / 2;
  const cy = sceneT + sceneH / 2;

  // Mocked CTX + HiRISE flat layers
  const ctxW = 900,
    ctxH = 540;
  const hirW = 360,
    hirH = 220;

  // Traverse polyline points (within HiRISE box)
  const trav = [
    [cx - 150, cy - 60],
    [cx - 100, cy - 40],
    [cx - 60, cy - 20],
    [cx - 30, cy + 10],
    [cx + 10, cy + 30],
    [cx + 60, cy + 40],
    [cx + 120, cy + 60],
  ];
  const travPath = trav.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');

  const body = `
    ${chrome({ activeRoute: 'MARS', siteName: 'CURIOSITY', siteSub: 'Ground view · Gale Crater · Sol 5,045' })}
    <div class="scenearea">
      <div class="hud-back">← BACK TO PLANET</div>

      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <pattern id="ctxtex" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#3a2418" />
            <circle cx="2" cy="3" r="0.6" fill="#2a180c" />
            <circle cx="5" cy="1" r="0.4" fill="#4a2e1c" />
          </pattern>
          <pattern id="hirtex" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#5a3624" />
            <circle cx="1" cy="2" r="0.5" fill="#3a2014" />
            <circle cx="3" cy="3" r="0.4" fill="#7a4838" />
          </pattern>
        </defs>

        <!-- CTX regional layer — rectangle = true ground extent (~10 km × 6 km) -->
        <rect x="${cx - ctxW / 2}" y="${cy - ctxH / 2}" width="${ctxW}" height="${ctxH}" fill="url(#ctxtex)" stroke="${T.gold}" stroke-width="2" />
        <text x="${cx - ctxW / 2 + 8}" y="${cy - ctxH / 2 + 18}" fill="${T.gold}" font-family="'Space Mono', monospace" font-size="11">CTX REGIONAL · 5 m/px · 10 × 6 km</text>

        <!-- HiRISE detail layer inside CTX — rectangle = true extent (~500 m × 300 m) -->
        <rect x="${cx - hirW / 2}" y="${cy - hirH / 2}" width="${hirW}" height="${hirH}" fill="url(#hirtex)" stroke="${T.teal}" stroke-width="2" />
        <text x="${cx - hirW / 2 + 8}" y="${cy - hirH / 2 + 16}" fill="${T.teal}" font-family="'Space Mono', monospace" font-size="10">HiRISE DETAIL · 25 cm/px · 500 × 300 m</text>

        <!-- Traverse polyline -->
        <path d="${travPath}" fill="none" stroke="${T.text}" stroke-width="2.5" stroke-opacity="0.9" />
        <path d="${travPath}" fill="none" stroke="${T.gold}" stroke-width="1" stroke-opacity="0.9" />

        <!-- Waypoint markers along traverse -->
        ${tubePin(trav[0][0], trav[0][1] - 4, 7, T.gold)}
        ${tubePin(trav[2][0], trav[2][1] - 4, 6, T.mars)}
        ${tubePin(trav[4][0], trav[4][1] - 4, 6, T.mars)}
        ${roverGlyph(trav[trav.length - 1][0], trav[trav.length - 1][1], 12, T.text)}

        <!-- Labels for start / waypoints / end -->
        <text x="${trav[0][0]}" y="${trav[0][1] - 14}" text-anchor="middle" fill="${T.gold}" font-family="'Space Mono', monospace" font-size="10">LANDING · SOL 0</text>
        <text x="${trav[trav.length - 1][0]}" y="${trav[trav.length - 1][1] + 22}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="11">ROVER · SOL 5,045</text>
      </svg>

      ${scaleBar({ label: '1 km', widthPx: 90 })}
      ${latLon({ lon: '137.44', lat: '-4.59' })}
    </div>
  `;

  return frame({
    title: 'Mars · Flat Patch · CTX + HiRISE + Traverse + HUD',
    body,
    captionText:
      'Frame 04 / 12 · Flat ground patch · CTX (regional) + HiRISE (detail) as true rectangles + traverse polyline + waypoints + scale bar + lat/lon',
  });
}

async function frame05_marsDeepZoom() {
  const sceneL = 164;
  const sceneT = 60;
  const sceneW = W - 164 - 392;
  const sceneH = H - 60;
  const cx = sceneL + sceneW / 2;
  const cy = sceneT + sceneH / 2;

  // Traverse zoomed in — markers visible separately
  const trav = [
    [cx - 600, cy + 200],
    [cx - 400, cy + 80],
    [cx - 240, cy - 40],
    [cx - 100, cy - 80],
    [cx + 80, cy - 40],
    [cx + 260, cy + 20],
    [cx + 460, cy + 100],
  ];
  const travPath = trav.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');

  const body = `
    ${chrome({ activeRoute: 'MARS', siteName: 'CURIOSITY', siteSub: 'Ground view · zoom ≈ native HiRISE limit' })}
    <div class="scenearea">
      <div class="hud-back">← BACK TO PLANET</div>

      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <pattern id="hirfull" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#5a3624" />
            <circle cx="2" cy="3" r="0.9" fill="#3a2014" />
            <circle cx="4" cy="1" r="0.6" fill="#7a4838" />
            <circle cx="5" cy="5" r="0.5" fill="#3a2014" />
          </pattern>
          <radialGradient id="upsample" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stop-color="black" stop-opacity="0" />
            <stop offset="100%" stop-color="black" stop-opacity="0.45" />
          </radialGradient>
        </defs>

        <!-- Background HiRISE-only -->
        <rect x="${sceneL}" y="${sceneT}" width="${sceneW}" height="${sceneH}" fill="url(#hirfull)" />

        <!-- Traverse polyline, bolder -->
        <path d="${travPath}" fill="none" stroke="${T.text}" stroke-width="4" stroke-opacity="0.95" />
        <path d="${travPath}" fill="none" stroke="${T.gold}" stroke-width="1.5" stroke-opacity="0.95" />

        <!-- Start marker (landing) -->
        ${landerGlyph(trav[0][0], trav[0][1], 14, T.gold)}
        <text x="${trav[0][0]}" y="${trav[0][1] - 18}" text-anchor="middle" fill="${T.gold}" font-family="'Space Mono', monospace" font-size="10">LANDING · SOL 0</text>

        <!-- Curated waypoints -->
        ${tubePin(trav[1][0], trav[1][1] - 6, 7, T.gold)}
        <text x="${trav[1][0]}" y="${trav[1][1] - 18}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="9">SAMPLE A · SOL 270</text>

        ${tubePin(trav[3][0], trav[3][1] - 6, 7, T.mars)}
        <text x="${trav[3][0]}" y="${trav[3][1] - 18}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="9">DRILL B · SOL 880</text>

        ${tubePin(trav[5][0], trav[5][1] - 6, 7, T.mars)}
        <text x="${trav[5][0]}" y="${trav[5][1] - 18}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="9">MARIAS PASS · SOL 1,000</text>

        <!-- End: rover, true-scale (~3 m on a 500 m horizontal field at 1080px = ~6 px) -->
        <rect x="${trav[6][0] - 4}" y="${trav[6][1] - 3}" width="8" height="6" fill="${T.text}" />
        <circle cx="${trav[6][0]}" cy="${trav[6][1] + 5}" r="3" fill="none" stroke="${T.accent}" stroke-width="1.5" />
        <text x="${trav[6][0]}" y="${trav[6][1] + 24}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="10">CURRENT · SOL 5,045 · 13.2 km</text>

        <!-- Upsample warning vignette -->
        <rect x="${sceneL}" y="${sceneT}" width="${sceneW}" height="${sceneH}" fill="url(#upsample)" pointer-events="none" />
      </svg>

      <div class="hud-scale"><span>Scale</span><span class="bar" style="width: 60px"></span><span class="mono">10 m</span></div>
      ${latLon({ lon: '137.4421', lat: '-4.5895' })}

      <div style="position:absolute; top: 16px; right: 16px; background: ${T.hudBg}; border: 1px solid rgba(255,200,80,0.45); padding: 6px 12px; border-radius: 3px; color: ${T.gold}; font-size: 11px; letter-spacing: 0.05em;" class="mono">⚠ Approaching native pixel limit (HiRISE 25 cm/px)</div>
    </div>
  `;

  return frame({
    title: 'Mars · Deep Zoom · True-scale Markers',
    body,
    captionText:
      'Frame 05 / 12 · Deep zoom · markers at real-world scale (rover ≈ 6 px) · curated traverse stops · upsample-limit cue',
  });
}

async function frame06_marsStationary() {
  const sceneL = 164;
  const sceneT = 60;
  const sceneW = W - 164 - 392;
  const sceneH = H - 60;
  const cx = sceneL + sceneW / 2;
  const cy = sceneT + sceneH / 2;

  const body = `
    ${chrome({ activeRoute: 'MARS', siteName: 'INSIGHT', siteSub: 'Stationary lander · Elysium Planitia · 2018–2022' })}
    <div class="scenearea">
      <div class="hud-back">← BACK TO PLANET</div>

      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <pattern id="insightTex" patternUnits="userSpaceOnUse" width="5" height="5">
            <rect width="5" height="5" fill="#7a5236" />
            <circle cx="2" cy="2" r="0.6" fill="#5a3a22" />
            <circle cx="4" cy="4" r="0.4" fill="#8a624c" />
          </pattern>
        </defs>

        <rect x="${sceneL}" y="${sceneT}" width="${sceneW}" height="${sceneH}" fill="url(#insightTex)" />

        <!-- Single marker for stationary lander — no traverse -->
        ${landerGlyph(cx, cy, 18, T.text)}
        <circle cx="${cx}" cy="${cy}" r="22" fill="none" stroke="${T.accent}" stroke-width="1.5" stroke-opacity="0.6" />
        <text x="${cx}" y="${cy - 30}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="11">INSIGHT · LANDED 2018-11-26</text>
        <text x="${cx}" y="${cy + 40}" text-anchor="middle" fill="${T.textDim}" font-family="'Space Mono', monospace" font-size="10">Stationary · no traverse · 1 marker</text>
      </svg>

      ${scaleBar({ label: '500 m', widthPx: 70 })}
      ${latLon({ lon: '135.6234', lat: '4.5024' })}
    </div>
  `;

  return frame({
    title: 'Mars · Stationary Site (InSight)',
    body,
    captionText:
      'Frame 06 / 12 · Stationary landing (InSight) · single marker · no traverse polyline',
  });
}

// ── Moon mirror: same 6 states ───────────────────────────────────────

async function frame07_moonPlanetWide() {
  const moon = await texAsDataUrl('2k_moon.1x1.jpg');
  const sceneCx = (W - 164 - 392) / 2 + 164;
  const sceneCy = 60 + (H - 60) / 2;
  const planetR = 420;

  const regions = [
    { cx: sceneCx + 50, cy: sceneCy + 10, w: 60, h: 40, label: 'APOLLO 11', agency: 'nasa' },
    { cx: sceneCx + 130, cy: sceneCy + 110, w: 56, h: 36, label: 'APOLLO 12', agency: 'nasa' },
    { cx: sceneCx - 50, cy: sceneCy - 80, w: 58, h: 38, label: 'APOLLO 15', agency: 'nasa' },
    { cx: sceneCx + 200, cy: sceneCy - 30, w: 56, h: 36, label: 'APOLLO 17', agency: 'nasa' },
    { cx: sceneCx - 230, cy: sceneCy + 90, w: 56, h: 36, label: 'APOLLO 14', agency: 'nasa' },
    { cx: sceneCx - 200, cy: sceneCy - 160, w: 54, h: 34, label: "CHANG'E 3", agency: 'cnsa' },
    { cx: sceneCx + 80, cy: sceneCy - 200, w: 52, h: 32, label: 'BERESHEET', agency: 'jaxa' },
    { cx: sceneCx + 280, cy: sceneCy + 200, w: 50, h: 32, label: 'LUNA 24', agency: 'roscosmos' },
    { cx: sceneCx - 100, cy: sceneCy + 220, w: 52, h: 34, label: 'SLIM', agency: 'jaxa' },
  ];

  const regionSvg = regions
    .map(
      (r) => `
    ${regionRect({ x: r.cx - r.w / 2, y: r.cy - r.h / 2, w: r.w, h: r.h, label: r.label, agency: r.agency })}
    ${landerGlyph(r.cx, r.cy, 9, T.text)}
  `,
    )
    .join('');

  const body = `
    ${chrome({ activeRoute: 'MOON' })}
    <div class="scenearea">
      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <clipPath id="moonpl"><circle cx="${sceneCx}" cy="${sceneCy}" r="${planetR}" /></clipPath>
        </defs>
        <image href="${moon}" x="${sceneCx - planetR}" y="${sceneCy - planetR}" width="${planetR * 2}" height="${planetR * 2}" clip-path="url(#moonpl)" />
        ${regionSvg}
      </svg>
    </div>
  `;

  return frame({
    title: 'Moon · Planet Wide',
    body,
    captionText:
      'Frame 07 / 12 · Moon planet wide · rectangular region polygons (multi-agency: NASA / CNSA / JAXA / Roscosmos), no 3D-model crowding',
  });
}

async function frame08_moonMidZoom() {
  const moon = await texAsDataUrl('2k_moon.jpg');
  const sceneCx = (W - 164 - 392) / 2 + 164;
  const sceneCy = 60 + (H - 60) / 2;

  const body = `
    ${chrome({ activeRoute: 'MOON', siteName: 'APOLLO 11', siteSub: 'Crewed lander · Mare Tranquillitatis · 1969' })}
    <div class="scenearea">
      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <clipPath id="moonbig"><circle cx="${sceneCx}" cy="${sceneCy + 200}" r="900" /></clipPath>
        </defs>
        <image href="${moon}" x="${sceneCx - 1300}" y="${sceneCy - 400}" width="2600" height="1500" clip-path="url(#moonbig)" preserveAspectRatio="xMidYMid slice" />

        <!-- Selection = bounding-rect outline (fixes the giant-decoupled-halo problem on the moon) -->
        <g>
          <rect x="${sceneCx - 70}" y="${sceneCy - 24}" width="140" height="80" fill="${T.accent}" fill-opacity="0.08" stroke="${T.accent}" stroke-width="1.5" />
          <rect x="${sceneCx - 76}" y="${sceneCy - 30}" width="152" height="92" fill="none" stroke="${T.accent}" stroke-width="2" />
          <text x="${sceneCx}" y="${sceneCy - 40}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="12">APOLLO 11 · LANDING ELLIPSE</text>
          ${landerGlyph(sceneCx, sceneCy + 16, 12, T.text)}
        </g>

        <!-- Previous decoupled blue ring — annotated as REMOVED -->
        <g opacity="0.55">
          <circle cx="${sceneCx}" cy="${sceneCy + 16}" r="180" fill="none" stroke="#e44" stroke-width="2" stroke-dasharray="6 6" />
          <text x="${sceneCx + 200}" y="${sceneCy - 160}" fill="#e44" font-family="'Space Mono', monospace" font-size="12">✗ no decoupled halo</text>
          <text x="${sceneCx + 200}" y="${sceneCy - 142}" fill="#e44" font-family="'Space Mono', monospace" font-size="12">✗ no disc pulse</text>
        </g>
      </svg>

      ${latLon({ lon: '23.47', lat: '0.67' })}
    </div>
  `;

  return frame({
    title: 'Moon · Mid Zoom · Bounding-rect selection',
    body,
    captionText:
      'Frame 08 / 12 · Moon mid-zoom · selection halo = bounding rectangle; removes the giant-decoupled-blue-ring problem (image 13 of current state)',
  });
}

async function frame09_moonThreshold() {
  const moon = await texAsDataUrl('2k_moon.jpg');
  const sceneCx = (W - 164 - 392) / 2 + 164;
  const sceneCy = 60 + (H - 60) / 2;

  const body = `
    ${chrome({ activeRoute: 'MOON', siteName: 'APOLLO 11', siteSub: 'Transitioning to ground view…' })}
    <div class="scenearea">
      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <clipPath id="moonthrsph"><circle cx="${sceneCx}" cy="${sceneCy - 80}" r="700" /></clipPath>
          <linearGradient id="fadeOut2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${T.bg}" stop-opacity="0" />
            <stop offset="0.7" stop-color="${T.bg}" stop-opacity="0" />
            <stop offset="1" stop-color="${T.bg}" stop-opacity="1" />
          </linearGradient>
        </defs>
        <image href="${moon}" x="${sceneCx - 1000}" y="${sceneCy - 700}" width="2000" height="1400" clip-path="url(#moonthrsph)" preserveAspectRatio="xMidYMid slice" />
        <rect x="0" y="${sceneCy - 100}" width="${W}" height="${sceneCy + 200}" fill="url(#fadeOut2)" />

        <g transform="translate(${sceneCx - 380}, ${sceneCy + 200})" opacity="0.85">
          <rect x="0" y="0" width="760" height="240" fill="#1f1f24" stroke="${T.accent}" stroke-width="1.5" />
          <text x="380" y="-12" text-anchor="middle" fill="${T.textDim}" font-family="'Space Mono', monospace" font-size="11">↓ ground view forming ↓</text>
          <rect x="260" y="60" width="240" height="120" fill="#2c2c30" stroke="${T.accent}" stroke-width="2" />
        </g>
      </svg>
    </div>
  `;

  return frame({
    title: 'Moon · Threshold Transition',
    body,
    captionText:
      'Frame 09 / 12 · Sphere → flat ground patch threshold · same transition as Mars, lunar palette',
  });
}

async function frame10_moonFlatPatch() {
  const sceneL = 164;
  const sceneT = 60;
  const sceneW = W - 164 - 392;
  const sceneH = H - 60;
  const cx = sceneL + sceneW / 2;
  const cy = sceneT + sceneH / 2;

  const ctxW = 900,
    ctxH = 540;
  const hirW = 320,
    hirH = 200;

  const body = `
    ${chrome({ activeRoute: 'MOON', siteName: 'APOLLO 11', siteSub: 'Ground view · Mare Tranquillitatis · 1969-07-20' })}
    <div class="scenearea">
      <div class="hud-back">← BACK TO PLANET</div>

      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <pattern id="lrocBg" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#2c2c30" />
            <circle cx="2" cy="3" r="0.7" fill="#1a1a1c" />
            <circle cx="5" cy="1" r="0.5" fill="#3a3a3e" />
          </pattern>
          <pattern id="lrocDetail" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#3a3a3e" />
            <circle cx="1" cy="2" r="0.5" fill="#1a1a1c" />
            <circle cx="3" cy="3" r="0.4" fill="#52525a" />
          </pattern>
        </defs>

        <!-- LROC NAC ROI mosaic (regional, ~5 m/px) -->
        <rect x="${cx - ctxW / 2}" y="${cy - ctxH / 2}" width="${ctxW}" height="${ctxH}" fill="url(#lrocBg)" stroke="${T.accent}" stroke-width="2" />
        <text x="${cx - ctxW / 2 + 8}" y="${cy - ctxH / 2 + 18}" fill="${T.accent}" font-family="'Space Mono', monospace" font-size="11">LROC NAC ROI · 5 m/px · 4.5 × 2.7 km</text>

        <!-- LROC NAC detail closeup -->
        <rect x="${cx - hirW / 2}" y="${cy - hirH / 2}" width="${hirW}" height="${hirH}" fill="url(#lrocDetail)" stroke="${T.teal}" stroke-width="2" />
        <text x="${cx - hirW / 2 + 8}" y="${cy - hirH / 2 + 16}" fill="${T.teal}" font-family="'Space Mono', monospace" font-size="10">LROC NAC DETAIL · 0.5 m/px · 250 × 160 m</text>

        <!-- Single landing marker — Apollo 11 is stationary (no traverse) -->
        ${landerGlyph(cx, cy, 14, T.text)}
        <text x="${cx}" y="${cy - 22}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="11">LM "EAGLE" · LANDED 1969-07-20</text>

        <!-- EVA microcopy: future enhancement -->
        <text x="${cx}" y="${cy + 28}" text-anchor="middle" fill="${T.textDim}" font-family="'Space Mono', monospace" font-size="10">EVA traverse data: future · single marker for v0.7</text>
      </svg>

      ${scaleBar({ label: '500 m', widthPx: 80 })}
      ${latLon({ lon: '23.473', lat: '0.674' })}
    </div>
  `;

  return frame({
    title: 'Moon · Flat Patch · LROC NAC + landing marker',
    body,
    captionText:
      'Frame 10 / 12 · Moon flat patch · LROC NAC ROI (regional) + LROC NAC detail + single Apollo 11 marker + scale bar + lat/lon',
  });
}

async function frame11_moonDeepZoom() {
  const sceneL = 164;
  const sceneT = 60;
  const sceneW = W - 164 - 392;
  const sceneH = H - 60;
  const cx = sceneL + sceneW / 2;
  const cy = sceneT + sceneH / 2;

  const body = `
    ${chrome({ activeRoute: 'MOON', siteName: 'APOLLO 11', siteSub: 'Ground view · zoom ≈ native LROC NAC limit' })}
    <div class="scenearea">
      <div class="hud-back">← BACK TO PLANET</div>

      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <pattern id="lrocCloseup" patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" fill="#3a3a3e" />
            <circle cx="2" cy="3" r="1" fill="#1a1a1c" />
            <circle cx="5" cy="6" r="0.7" fill="#52525a" />
            <circle cx="7" cy="2" r="0.5" fill="#1a1a1c" />
          </pattern>
          <radialGradient id="upsample2" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stop-color="black" stop-opacity="0" />
            <stop offset="100%" stop-color="black" stop-opacity="0.45" />
          </radialGradient>
        </defs>

        <rect x="${sceneL}" y="${sceneT}" width="${sceneW}" height="${sceneH}" fill="url(#lrocCloseup)" />

        <!-- LM at true scale — descent stage ~4.3 m wide; at this zoom (250m field on 1080px) -> ~18px -->
        <g transform="translate(${cx}, ${cy})">
          <rect x="-9" y="-7" width="18" height="14" fill="${T.gold}" stroke="${T.text}" stroke-width="0.8" />
          <line x1="-9" y1="-7" x2="-14" y2="-12" stroke="${T.text}" stroke-width="1.2" />
          <line x1="9" y1="-7" x2="14" y2="-12" stroke="${T.text}" stroke-width="1.2" />
          <line x1="-9" y1="7" x2="-14" y2="12" stroke="${T.text}" stroke-width="1.2" />
          <line x1="9" y1="7" x2="14" y2="12" stroke="${T.text}" stroke-width="1.2" />
        </g>
        <circle cx="${cx}" cy="${cy}" r="22" fill="none" stroke="${T.accent}" stroke-width="1.2" stroke-opacity="0.7" />
        <text x="${cx}" y="${cy - 32}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="10">LM DESCENT STAGE · TRUE SCALE</text>

        <!-- Apollo retroreflector + flag at offsets, true scale -->
        <circle cx="${cx + 30}" cy="${cy + 12}" r="1.5" fill="${T.gold}" />
        <text x="${cx + 40}" y="${cy + 16}" fill="${T.textDim}" font-family="'Space Mono', monospace" font-size="9">RETROREFLECTOR</text>
        <line x1="${cx - 22}" y1="${cy + 4}" x2="${cx - 22}" y2="${cy - 8}" stroke="${T.text}" stroke-width="1" />
        <rect x="${cx - 22}" y="${cy - 8}" width="6" height="3" fill="${T.text}" />
        <text x="${cx - 24}" y="${cy + 18}" text-anchor="end" fill="${T.textDim}" font-family="'Space Mono', monospace" font-size="9">U.S. FLAG</text>

        <rect x="${sceneL}" y="${sceneT}" width="${sceneW}" height="${sceneH}" fill="url(#upsample2)" pointer-events="none" />
      </svg>

      <div class="hud-scale"><span>Scale</span><span class="bar" style="width: 40px"></span><span class="mono">5 m</span></div>
      ${latLon({ lon: '23.4730', lat: '0.6740' })}

      <div style="position:absolute; top: 16px; right: 16px; background: ${T.hudBg}; border: 1px solid rgba(108,168,255,0.45); padding: 6px 12px; border-radius: 3px; color: ${T.accent}; font-size: 11px; letter-spacing: 0.05em;" class="mono">⚠ Approaching native pixel limit (LROC NAC 50 cm/px)</div>
    </div>
  `;

  return frame({
    title: 'Moon · Deep Zoom · True-scale LM + annotations',
    body,
    captionText:
      'Frame 11 / 12 · Moon deep zoom · LM descent stage at TRUE scale (4.3 m → 18 px) · annotated equipment (flag, retroreflector) · upsample-limit cue',
  });
}

async function frame12_moonStationaryChange() {
  const sceneL = 164;
  const sceneT = 60;
  const sceneW = W - 164 - 392;
  const sceneH = H - 60;
  const cx = sceneL + sceneW / 2;
  const cy = sceneT + sceneH / 2;

  const body = `
    ${chrome({ activeRoute: 'MOON', siteName: 'CHANG’E 3', siteSub: 'Stationary lander + Yutu rover (CNSA) · Mare Imbrium · 2013–present' })}
    <div class="scenearea">
      <div class="hud-back">← BACK TO PLANET</div>

      <svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <pattern id="cnsaTex" patternUnits="userSpaceOnUse" width="5" height="5">
            <rect width="5" height="5" fill="#4a4a52" />
            <circle cx="2" cy="2" r="0.6" fill="#2a2a30" />
            <circle cx="4" cy="4" r="0.4" fill="#5e5e68" />
          </pattern>
        </defs>

        <rect x="${sceneL}" y="${sceneT}" width="${sceneW}" height="${sceneH}" fill="url(#cnsaTex)" />

        <!-- Hybrid case: lander (single, stationary) + Yutu rover (short traverse) -->
        ${landerGlyph(cx - 60, cy - 20, 16, T.cnsa)}
        <text x="${cx - 60}" y="${cy - 44}" text-anchor="middle" fill="${T.cnsa}" font-family="'Space Mono', monospace" font-size="10">CHANG’E 3 LANDER</text>

        <!-- Yutu short traverse -->
        <path d="M ${cx - 60} ${cy - 20} Q ${cx} ${cy + 20}, ${cx + 80} ${cy + 60}" fill="none" stroke="${T.text}" stroke-width="2" />
        ${roverGlyph(cx + 80, cy + 60, 11, T.cnsa)}
        <text x="${cx + 80}" y="${cy + 80}" text-anchor="middle" fill="${T.text}" font-family="'Space Mono', monospace" font-size="10">YUTU · ~114 m traverse</text>

        <text x="${cx}" y="${sceneT + 80}" text-anchor="middle" fill="${T.textDim}" font-family="'Space Mono', monospace" font-size="11">Hybrid: stationary lander (1 marker) + short rover traverse (start + end)</text>
      </svg>

      ${scaleBar({ label: '50 m', widthPx: 75 })}
      ${latLon({ lon: '-19.5118', lat: '44.1214' })}
    </div>
  `;

  return frame({
    title: 'Moon · Stationary + Short Traverse (Chang’e 3)',
    body,
    captionText:
      'Frame 12 / 12 · Hybrid CNSA site · Chang’e 3 lander (1 marker) + Yutu rover short traverse (start + end markers, no curated stops at this scale)',
  });
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

const frames = [
  ['01-mars-planet-wide', frame01_marsPlanetWide],
  ['02-mars-mid-zoom-region', frame02_marsMidZoom],
  ['03-mars-threshold-transition', frame03_marsThreshold],
  ['04-mars-flatpatch-hud', frame04_marsFlatPatch],
  ['05-mars-deep-zoom-markers', frame05_marsDeepZoom],
  ['06-mars-stationary', frame06_marsStationary],
  ['07-moon-planet-wide', frame07_moonPlanetWide],
  ['08-moon-mid-zoom-region', frame08_moonMidZoom],
  ['09-moon-threshold-transition', frame09_moonThreshold],
  ['10-moon-flatpatch-hud', frame10_moonFlatPatch],
  ['11-moon-deep-zoom-markers', frame11_moonDeepZoom],
  ['12-moon-stationary-change', frame12_moonStationaryChange],
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
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
    // Keep the html temporarily for debugging; clean up at end if all succeeded
    console.log(`✓ ${name}.png`);
  }

  await browser.close();

  // Clean up temp html files
  const { unlink } = await import('node:fs/promises');
  for (const [name] of frames) {
    await unlink(resolve(OUT_DIR, `_${name}.html`)).catch(() => {});
  }

  console.log(`\nDone. 12 frames → ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
