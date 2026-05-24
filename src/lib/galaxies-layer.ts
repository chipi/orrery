/**
 * Local Group galaxy billboards on the /explore celestial sphere.
 * GH #86 Lite scope.
 *
 * Reads `static/data/local-group-galaxies.json` and renders one
 * THREE.Sprite per galaxy at the correct RA/Dec on a large celestial
 * sphere. Sky-overlay only — sprites are scale-invariant, NOT placed
 * at true distance. The honest framing lives in the corresponding
 * /science articles + the science-layers panel description.
 *
 * Coord convention: equatorial J2000 with Y-up to match the rest of
 * the /explore scene. The 23.44° ecliptic-vs-equatorial obliquity is
 * not corrected here — at the sky-overlay scale, the difference is
 * invisible and the planets are themselves on the ecliptic plane in
 * scene units that don't share a frame with the celestial sphere
 * anyway (the planets use the existing auToPx visual compression).
 *
 * Pickability: sprite.userData.galaxyId carries the id from the JSON
 * for click-routing. /explore's raycaster picks against the parent
 * group; downstream code can deep-link to /science/observation/<id>.
 */
import * as THREE from 'three';
import localGroupData from '../../static/data/local-group-galaxies.json';

export interface LocalGroupGalaxy {
  id: string;
  name: string;
  ra: number; // decimal degrees J2000
  dec: number; // decimal degrees J2000
  distance_kpc: number;
  type: 'spiral' | 'irregular' | 'dwarf-spheroidal';
  group: 'milky-way-subgroup' | 'andromeda-subgroup' | 'free';
  science_section: string;
  wikidata: string;
}

interface BuiltLayer {
  group: THREE.Group;
  /** Disposes geometries, materials, textures created by the layer. */
  dispose: () => void;
}

/** Sphere radius for the celestial-sphere overlay. Inside camera far
 * plane (8000) but well outside any planet orbit. The whole layer
 * scales with the camera so distance is purely "where the sprite sits
 * relative to other deep-sky markers". */
const SPHERE_RADIUS = 6500;

/** Sprite world size — Three.js Sprite is rendered in screen-space-
 * proportional units. 80 ≈ ~14 px at default camera distance. */
const SPRITE_SIZE = 80;

/** Convert RA/Dec (degrees, J2000) to scene-space position on the
 * celestial sphere. Y-up scene convention. */
function radecToScene(raDeg: number, decDeg: number, r: number): THREE.Vector3 {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const x = r * Math.cos(dec) * Math.cos(ra);
  const y = r * Math.sin(dec);
  const z = r * Math.cos(dec) * Math.sin(ra);
  return new THREE.Vector3(x, y, z);
}

/** Per-galaxy-type colour. Matches conventional astrophotography
 * colour psychology so spirals look distinctly different from dwarfs
 * at a glance. */
function colorForType(type: LocalGroupGalaxy['type']): string {
  switch (type) {
    case 'spiral':
      return '#b6cdff'; // cool blue — spiral arms of star formation
    case 'irregular':
      return '#ffd4a0'; // warm yellow — gas-rich star formation
    case 'dwarf-spheroidal':
      return '#cfa8ff'; // dim violet — old stellar pops, no new stars
  }
}

/** Build a canvas-backed THREE.Texture: small filled disc + text
 * label below. Power-of-two size for clean mipmaps. */
function buildGalaxySpriteTexture(name: string, color: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Disc — centred horizontally, top half
    const cx = canvas.width / 2;
    const cy = 36;
    const radius = 12;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Inner dot (slightly brighter centre)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Label below
    ctx.font = "bold 18px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = color;
    ctx.fillText(name.toUpperCase(), canvas.width / 2, 78);
  }
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/** Build the Local Group billboard layer. Caller adds the returned
 * group to the scene; toggling visibility is done via
 * `group.visible = on` from the layer-change handler. */
export function buildLocalGroupLayer(): BuiltLayer {
  const data = localGroupData as { version: string; entries: LocalGroupGalaxy[] };
  const group = new THREE.Group();
  group.name = 'local-group-galaxies';
  // Always-on-top — galaxies are visual reference, never occluded by
  // planet orbits which are far inside the celestial sphere anyway.
  group.renderOrder = 100;

  const textures: THREE.Texture[] = [];
  const materials: THREE.SpriteMaterial[] = [];

  for (const g of data.entries) {
    const color = colorForType(g.type);
    const texture = buildGalaxySpriteTexture(g.name, color);
    textures.push(texture);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    materials.push(material);
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(radecToScene(g.ra, g.dec, SPHERE_RADIUS));
    // Aspect 256:128 = 2:1. Width = SIZE, height = SIZE/2.
    sprite.scale.set(SPRITE_SIZE * 2, SPRITE_SIZE, 1);
    sprite.renderOrder = 101;
    sprite.userData.galaxyId = g.id;
    sprite.userData.galaxyName = g.name;
    sprite.userData.galaxyScienceSection = g.science_section;
    sprite.userData.galaxyType = g.type;
    sprite.userData.galaxyDistanceKpc = g.distance_kpc;
    group.add(sprite);
  }

  return {
    group,
    dispose: () => {
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
