import * as THREE from 'three';

/**
 * Launch-site ground detail (RFC-034 S8).
 *
 * The global Earth daymap is ~10 km per texel — far too coarse for a pad-level
 * view (we magnify a single texel ~1000×, so it reads as blurry blue nothing).
 * This lays a real, cloudless satellite crop of the actual launch complex as a
 * flat patch tangent at the pad, so the launch sits on recognizable green land
 * and coastline. The patch fades to transparent at its rim (dissolving into the
 * global sphere) and fades out entirely with altitude, once the sphere's own
 * detail is adequate and the 66 km patch has shrunk to a dot.
 *
 * Imagery: EOX Sentinel-2 cloudless (https://s2maps.eu, CC-BY-4.0) — see
 * /colophon provenance. GIBS/Landsat was the first pick but its 30 m products
 * are unusable here (WELD is retired; live HLS granules are single-date, so
 * cloud-covered with no-data swaths).
 */
export interface LaunchGroundSite {
  /** Cloudless satellite crop of the site, north-up, square. */
  textureUrl: string;
  /** Half-width of the square crop in real km (bbox half-span in ground units). */
  halfExtentKm: number;
  /** Spin (deg) to align image-east with world downrange (+x); tuned per site. */
  orientationDeg?: number;
}

export interface LaunchGround {
  group: THREE.Group;
  /** Fade the patch by altitude (full on the pad → gone once the sphere reads). */
  setAltitudeFade(altKm: number): void;
  dispose(): void;
}

const FADE_START_KM = 10; // patch is full-strength up to here
const FADE_END_KM = 34; // …and fully gone by here (sphere detail takes over)

/** Radial alpha ramp (opaque centre → transparent rim) so the patch dissolves
 *  into the global sphere with no hard seam. Drawn once to a small canvas. */
function radialAlphaTexture(): THREE.Texture {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.28, S / 2, S / 2, S * 0.5);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#000000');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export function buildLaunchGround(site: LaunchGroundSite): LaunchGround {
  const group = new THREE.Group();

  const satTex = new THREE.TextureLoader().load(site.textureUrl);
  satTex.colorSpace = THREE.SRGBColorSpace;
  satTex.anisotropy = 8;

  const alphaTex = radialAlphaTexture();

  const size = site.halfExtentKm * 2;
  const geom = new THREE.PlaneGeometry(size, size, 1, 1);
  geom.rotateX(-Math.PI / 2); // lie flat in the XZ plane

  const mat = new THREE.MeshStandardMaterial({
    map: satTex,
    // Raw Sentinel reflectance is dark; an emissive pass of the same crop lifts
    // the greens so the terrain reads as brightly as the processed daymap
    // without washing out the sun-side shading the map still provides.
    emissive: 0xffffff,
    emissiveMap: satTex,
    emissiveIntensity: 0.9,
    alphaMap: alphaTex,
    transparent: true,
    roughness: 1,
    metalness: 0,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geom, mat);
  // Image-north (+v) maps to world −Z and image-east (+u) to +X after the
  // rotateX above; downrange is +x, so an eastbound launch needs no spin.
  group.rotation.y = ((site.orientationDeg ?? 0) * Math.PI) / 180;
  mesh.position.y = 0.02; // 20 m above the sphere top — kills z-fighting, invisible
  mesh.renderOrder = 2; // composite over the opaque sphere
  group.add(mesh);

  return {
    group,
    setAltitudeFade(altKm: number) {
      const t = (altKm - FADE_START_KM) / (FADE_END_KM - FADE_START_KM);
      mat.opacity = Math.max(0, Math.min(1, 1 - t));
      group.visible = mat.opacity > 0.001;
    },
    dispose() {
      geom.dispose();
      mat.dispose();
      satTex.dispose();
      alphaTex.dispose();
    },
  };
}

/** Known launch-site ground crops (EOX Sentinel-2 cloudless). Keyed loosely by
 *  proximity so any profile at these coords picks up its real terrain. */
export interface LaunchGroundEntry extends LaunchGroundSite {
  lat: number;
  lon: number;
}

export const LAUNCH_GROUND_SITES: LaunchGroundEntry[] = [
  // One cloudless Sentinel-2 crop per complex; each covers all nearby pads
  // (Cape's LC-5/14/34/36/39/SLC-40/41, Baikonur's sites, Kourou's ELA-2/3/4…).
  {
    lat: 28.562,
    lon: -80.577,
    textureUrl: '/images/launch-ground/cape-canaveral.jpg',
    halfExtentKm: 33,
  }, // Cape Canaveral / KSC
  { lat: 46.0, lon: 63.3, textureUrl: '/images/launch-ground/baikonur.jpg', halfExtentKm: 33 }, // Baikonur Cosmodrome
  { lat: 5.236, lon: -52.773, textureUrl: '/images/launch-ground/kourou.jpg', halfExtentKm: 33 }, // Guiana Space Centre, Kourou
  { lat: 40.96, lon: 100.299, textureUrl: '/images/launch-ground/jiuquan.jpg', halfExtentKm: 33 }, // Jiuquan
  { lat: 62.928, lon: 40.51, textureUrl: '/images/launch-ground/plesetsk.jpg', halfExtentKm: 33 }, // Plesetsk
  {
    lat: 13.736,
    lon: 80.235,
    textureUrl: '/images/launch-ground/sriharikota.jpg',
    halfExtentKm: 33,
  }, // Satish Dhawan, Sriharikota
  { lat: 25.997, lon: -97.156, textureUrl: '/images/launch-ground/starbase.jpg', halfExtentKm: 33 }, // Starbase, Boca Chica
  { lat: 38.849, lon: 111.608, textureUrl: '/images/launch-ground/taiyuan.jpg', halfExtentKm: 33 }, // Taiyuan
  {
    lat: 30.401,
    lon: 130.976,
    textureUrl: '/images/launch-ground/tanegashima.jpg',
    halfExtentKm: 33,
  }, // Tanegashima
  {
    lat: 34.632,
    lon: -120.611,
    textureUrl: '/images/launch-ground/vandenberg.jpg',
    halfExtentKm: 33,
  }, // Vandenberg
  { lat: 19.615, lon: 110.951, textureUrl: '/images/launch-ground/wenchang.jpg', halfExtentKm: 33 }, // Wenchang
  { lat: 28.246, lon: 102.027, textureUrl: '/images/launch-ground/xichang.jpg', halfExtentKm: 33 }, // Xichang
];

/** Resolve the nearest ground crop within ~0.6° of a launch site, if any. */
export function resolveLaunchGround(
  site: { lat: number; lon: number } | undefined,
): LaunchGroundEntry | null {
  if (!site) return null;
  for (const e of LAUNCH_GROUND_SITES) {
    if (Math.abs(e.lat - site.lat) < 0.6 && Math.abs(e.lon - site.lon) < 0.6) return e;
  }
  return null;
}
