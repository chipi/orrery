/**
 * Credit for static/textures/* (#596): which publisher/licence each texture comes
 * from, crops included. Shared by scripts/build-image-provenance.ts (writes the
 * credits) and scripts/fetch-assets.ts (downloads the Solar System Scope set).
 */

export const SOLAR_SYSTEM_SCOPE_URL = 'https://www.solarsystemscope.com/textures/';

/** Solar System Scope 2K maps (CC BY 4.0), fetched by scripts/fetch-assets.ts. */
export const TEXTURES = [
  '2k_sun.jpg',
  '2k_mercury.jpg',
  '2k_venus_atmosphere.jpg',
  '2k_earth_daymap.jpg',
  '2k_mars.jpg',
  '2k_jupiter.jpg',
  '2k_saturn.jpg',
  '2k_uranus.jpg',
  '2k_neptune.jpg',
  '2k_moon.jpg',
];

// Mapping for static/textures/*. Solar System Scope publishes its
// textures under CC BY 4.0 (https://www.solarsystemscope.com/textures/).
const SSS_TEXTURES = new Set(TEXTURES);

// Björn Jónsson's planetary maps (https://bjj.mmedia.is) — publicly
// available with attribution; original source data NASA PDS public
// domain. Used for /explore natural-satellite textures where Solar
// System Scope doesn't publish a map (#287 Slice B + parts of D).
const BJJ_TEXTURES = new Set(['4k_io.jpg', '2k_europa.jpg', '2k_ganymede.jpg', '2k_callisto.jpg']);
const BJJ_URL = 'https://bjj.mmedia.is/data/planetary_maps.html';

// Wikimedia Commons — NASA mission imagery (public domain by US
// federal work-product rule). Per-file mapping below; titles match
// the original Commons filenames so credit lines remain traceable.
const WIKIMEDIA_TEXTURES: Record<string, { mission: string; commons_title: string }> = {
  '4k_titan.jpg': {
    mission: 'NASA / JPL-Caltech / University of Arizona / Cassini ISS',
    commons_title: 'PIA22770-SaturnMoon-Titan-Surface-20181206.jpg',
  },
  '4k_enceladus.jpg': {
    mission: 'NASA / JPL-Caltech / SSI / Cassini ISS',
    commons_title: 'Map of Enceladus December 2008 PIA11145.jpg',
  },
  // HiRISE PSP_007769_9010 (2008-03-23), per the Commons file page — not Mars Express.
  '2k_phobos.jpg': {
    mission: 'NASA / JPL-Caltech / University of Arizona / MRO HiRISE',
    commons_title: 'Phobos colour 2008.jpg',
  },
  '2k_deimos.jpg': {
    mission: 'NASA / JPL-Caltech / Viking 1 orbiter',
    commons_title: 'Deimos-viking1.jpg',
  },
  '2k_charon.jpg': {
    mission: 'NASA / JHUAPL / SwRI / New Horizons LORRI',
    commons_title: 'Charon Basemap DEM Grid.jpg',
  },
  '4k_pluto.jpg': {
    mission: 'NASA / JHUAPL / SwRI / New Horizons LORRI',
    commons_title: 'NH-Pluto-GlobalMosaic-TrueColor-20150714-Released20150724.jpg',
  },
};

/**
 * Credit for a static/textures/ file. Crop variants (`2k_mars.1x1.jpg`, `.4x3`,
 * `.16x9`) take the credit of their base texture — they used to fall through to the
 * Solar System Scope default, mis-crediting the BJJ and Wikimedia ones (#596).
 */
export function textureLicense(file: string): {
  license: string;
  agency: string;
  author: string;
  source_url: string;
  modifications: string[];
} {
  const filename = file.replace(/\.(1x1|4x3|16x9)(\.[a-z]+)$/i, '$2');
  if (SSS_TEXTURES.has(filename)) {
    return {
      license: 'CC-BY-4.0',
      agency: 'Solar System Scope',
      author: 'Solar System Scope',
      source_url: SOLAR_SYSTEM_SCOPE_URL,
      modifications: ['downloaded-from-publisher'],
    };
  }
  if (BJJ_TEXTURES.has(filename)) {
    return {
      license: 'BJJ-attribution',
      agency: 'Björn Jónsson (bjj.mmedia.is, NASA PDS source data)',
      author: 'Björn Jónsson',
      source_url: BJJ_URL,
      modifications: ['downloaded-from-publisher'],
    };
  }
  if (filename in WIKIMEDIA_TEXTURES) {
    const meta = WIKIMEDIA_TEXTURES[filename];
    return {
      license: 'PD-NASA',
      agency: meta.mission,
      author: meta.mission,
      source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(meta.commons_title).replace(/%20/g, '_')}`,
      modifications: ['downloaded-from-wikimedia-commons'],
    };
  }
  // Fallback — unknown texture. Keep SSS default but flag it so the
  // provenance index doesn't silently mis-attribute a new asset.
  return {
    license: 'CC-BY-4.0',
    agency: 'Solar System Scope',
    author: 'Solar System Scope',
    source_url: SOLAR_SYSTEM_SCOPE_URL,
    modifications: ['downloaded-from-publisher', 'NEEDS-VERIFICATION'],
  };
}
