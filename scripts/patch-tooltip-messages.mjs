/**
 * One-off patches for explore/hud tooltip Paraglide keys (ADR-017).
 * Run: node scripts/patch-tooltip-messages.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const KEYS = [
  'explore_page_title',
  'explore_canvas_aria_3d',
  'explore_canvas_aria_2d',
  'explore_layer_tip_planets',
  'explore_layer_tip_dwarfs',
  'explore_layer_tip_comets',
  'explore_layer_tip_interstellar',
  'explore_tt_velocity_planet',
  'explore_tt_velocity_small',
  'explore_tt_distance_sun',
  'explore_tt_extras_planet',
  'explore_tt_distance_small',
  'explore_tt_extras_small',
  'explore_tt_kind_dwarf',
  'explore_tt_kind_comet',
  'explore_tt_kind_interstellar',
  'earth_layer_tip_habitats',
  'earth_layer_tip_telescopes',
  'earth_layer_tip_nav',
  'earth_layer_tip_geo',
  'earth_layer_tip_lunar',
  'earth_layer_tip_orbit_rings',
  'earth_legend_orbit_aria',
  'moon_layer_tip_surface',
  'moon_layer_tip_orbiters',
  'moon_layer_tip_orbit_rings',
  'moon_legend_nation_aria',
  'mars_globe_aria',
  'mars_map_aria',
  'mars_layer_tip_surface',
  'mars_layer_tip_orbiters',
  'mars_layer_tip_orbit_rings',
  'mars_layer_tip_traverses',
  'mars_legend_nation_aria',
  'mars_lightbox_open_aria',
  'fly_canvas_aria_3d',
  'fly_canvas_aria_2d',
  'missions_filters_aria',
  'missions_grid_aria',
  'plan_link_opens_new_tab',
  'fly_page_title',
  'earth_page_title',
  'moon_page_title',
  'mars_page_title',
  'mars_load_failed',
];

/** @type {Record<string, Record<string, string>>} */
const T = {
  fr: {
    explore_page_title: 'Explorateur du système solaire · Orrery',
    explore_canvas_aria_3d:
      'Système solaire 3D. Faites glisser pour orbiter, défilez ou pincez pour zoomer. Cliquez sur le Soleil et les planètes pour les détails.',
    explore_canvas_aria_2d:
      'Système solaire 2D vu du dessus. Faites glisser pour déplacer, défilez ou pincez pour zoomer. Touchez le Soleil et les planètes pour les détails.',
    explore_layer_tip_planets: 'Afficher ou masquer les orbites des huit planètes principales',
    explore_layer_tip_dwarfs:
      'Afficher ou masquer les planètes naines (Pluton, Éris, Cérès, Haumea, Makemake)',
    explore_layer_tip_comets:
      'Afficher ou masquer les trajectoires des comètes (Halley, Hale-Bopp, etc.)',
    explore_layer_tip_interstellar:
      'Visiteurs interstellaires — afficher ou masquer les objets traversant le système solaire (ex. ʻOumuamua)',
    explore_tt_velocity_planet: '~{value} km/s · vitesse orbitale moyenne',
    explore_tt_velocity_small: '~{value} km/s · vitesse orbitale moyenne',
    explore_tt_distance_sun: '{mkm} M km depuis le Soleil',
    explore_tt_extras_planet: 'e={e} · i={i}° · inclinaison axiale={tilt}°',
    explore_tt_distance_small: '{mkm} M km demi-grand axe · {kind}',
    explore_tt_extras_small: 'e={e} · i={i}°',
    explore_tt_kind_dwarf: 'planète naine',
    explore_tt_kind_comet: 'comète',
    explore_tt_kind_interstellar: 'objet interstellaire',
    earth_layer_tip_habitats: 'Habitats orbitaux habités — ISS, Tiangong',
    earth_layer_tip_telescopes: 'Télescopes astronomiques — Hubble, JWST, Chandra, XMM, Gaia',
    earth_layer_tip_nav: 'Constellations de navigation — GPS, Galileo, GLONASS, BeiDou',
    earth_layer_tip_geo: 'Communications géostationnaires — anneau GEO',
    earth_layer_tip_lunar: 'Orbiteurs lunaires — LRO, Clementine, Chandrayaan-1, Chang’e 1/2, etc.',
    earth_layer_tip_orbit_rings:
      'Afficher ou masquer les lignes d’orbite (les satellites restent visibles)',
    earth_legend_orbit_aria: 'Légende du régime orbital',
    moon_layer_tip_surface: 'Afficher ou masquer atterrisseurs, rovers et épaves en surface',
    moon_layer_tip_orbiters: 'Afficher ou masquer les orbiteurs lunaires actifs et historiques',
    moon_layer_tip_orbit_rings:
      'Afficher ou masquer les lignes d’orbite (les engins restent visibles)',
    moon_legend_nation_aria: 'Légende par nation',
    mars_globe_aria: 'Globe martien 3D',
    mars_map_aria: 'Carte martienne 2D équirectangulaire',
    mars_layer_tip_surface: 'Afficher ou masquer atterrisseurs, rovers et épaves en surface',
    mars_layer_tip_orbiters: 'Afficher ou masquer les orbiteurs martiens actifs et historiques',
    mars_layer_tip_orbit_rings:
      'Afficher ou masquer les lignes d’orbite (les engins restent visibles)',
    mars_layer_tip_traverses:
      'Afficher ou masquer les parcours des rovers (Curiosity, Perseverance, Opportunity, Spirit)',
    mars_legend_nation_aria: 'Légende par nation',
    mars_lightbox_open_aria: 'Ouvrir la vue agrandie',
    fly_canvas_aria_3d:
      'Arc de mission 3D. Faites glisser pour orbiter, défilez ou pincez pour zoomer.',
    fly_canvas_aria_2d: 'Arc de mission 2D vu du dessus.',
    missions_filters_aria: 'Filtres des missions',
    missions_grid_aria: 'Cartes de mission',
    plan_link_opens_new_tab: '{label} (s’ouvre dans un nouvel onglet)',
    fly_page_title: 'Arc de mission · Orrery',
    earth_page_title: 'Orbite terrestre · Orrery',
    moon_page_title: 'Carte lunaire · Orrery',
    mars_page_title: 'Carte martienne · Orrery',
    mars_load_failed: 'Impossible de charger les sites martiens. Actualisez la page.',
  },
  de: {
    explore_page_title: 'Sonnensystem-Erkundung · Orrery',
    explore_canvas_aria_3d:
      '3D-Sonnensystem. Ziehen zum Orbitieren, Scrollen oder Zoomen mit zwei Fingern. Sonne und Planeten anklicken für Details.',
    explore_canvas_aria_2d:
      '2D-Ansicht von oben. Ziehen zum Verschieben, Scrollen oder Zoomen. Sonne und Planeten antippen für Details.',
    explore_layer_tip_planets: 'Sichtbarkeit der acht großen Planetenbahnen umschalten',
    explore_layer_tip_dwarfs:
      'Sichtbarkeit der Zwergplaneten (Pluto, Eris, Ceres, Haumea, Makemake) umschalten',
    explore_layer_tip_comets: 'Sichtbarkeit von Kometenbahnen (Halley, Hale-Bopp usw.) umschalten',
    explore_layer_tip_interstellar:
      'Interstellare Besucher — Objekte ein-/ausblenden, die das Sonnensystem durchqueren (z. B. ʻOumuamua)',
    explore_tt_velocity_planet: '~{value} km/s · mittlere Orbitalgeschwindigkeit',
    explore_tt_velocity_small: '~{value} km/s · mittlere Orbitalgeschwindigkeit',
    explore_tt_distance_sun: '{mkm} M km von der Sonne',
    explore_tt_extras_planet: 'e={e} · i={i}° · Achsneigung={tilt}°',
    explore_tt_distance_small: '{mkm} M km große Halbachse · {kind}',
    explore_tt_extras_small: 'e={e} · i={i}°',
    explore_tt_kind_dwarf: 'Zwergplanet',
    explore_tt_kind_comet: 'Komet',
    explore_tt_kind_interstellar: 'interstellares Objekt',
    earth_layer_tip_habitats: 'Bemannte Orbitalstationen — ISS, Tiangong',
    earth_layer_tip_telescopes: 'Astronomische Teleskope — Hubble, JWST, Chandra, XMM, Gaia',
    earth_layer_tip_nav: 'Navigationssatelliten — GPS, Galileo, GLONASS, BeiDou',
    earth_layer_tip_geo: 'Geostationäre Kommunikation — GEO-Ring',
    earth_layer_tip_lunar: 'Mondorbiters — LRO, Clementine, Chandrayaan-1, Chang’e 1/2 usw.',
    earth_layer_tip_orbit_rings: 'Orbitalringlinien ein-/ausblenden (Satelliten bleiben sichtbar)',
    earth_legend_orbit_aria: 'Legende Orbitalregime',
    moon_layer_tip_surface: 'Lander, Rover und Oberflächenwracks ein-/ausblenden',
    moon_layer_tip_orbiters: 'Aktive und historische Mondorbiters ein-/ausblenden',
    moon_layer_tip_orbit_rings:
      'Orbitalringlinien ein-/ausblenden (Raumfahrzeuge bleiben sichtbar)',
    moon_legend_nation_aria: 'Länderlegende',
    mars_globe_aria: 'Mars-Globus 3D',
    mars_map_aria: 'Mars-Karte 2D (äquirektangular)',
    mars_layer_tip_surface: 'Lander, Rover und Oberflächenwracks ein-/ausblenden',
    mars_layer_tip_orbiters: 'Aktive und historische Marsorbiters ein-/ausblenden',
    mars_layer_tip_orbit_rings:
      'Orbitalringlinien ein-/ausblenden (Raumfahrzeuge bleiben sichtbar)',
    mars_layer_tip_traverses:
      'Rover-Routen ein-/ausblenden (Curiosity, Perseverance, Opportunity, Spirit)',
    mars_legend_nation_aria: 'Länderlegende',
    mars_lightbox_open_aria: 'Vergrößerte Ansicht öffnen',
    fly_canvas_aria_3d:
      '3D-Missionsbahn. Ziehen zum Orbitieren, Scrollen oder Zoomen mit zwei Fingern.',
    fly_canvas_aria_2d: '2D-Missionsbahn von oben.',
    missions_filters_aria: 'Missionsfilter',
    missions_grid_aria: 'Missionskarten',
    plan_link_opens_new_tab: '{label} (öffnet in neuem Tab)',
    fly_page_title: 'Missionsbahn · Orrery',
    earth_page_title: 'Erdbahn · Orrery',
    moon_page_title: 'Mondkarte · Orrery',
    mars_page_title: 'Marskarte · Orrery',
    mars_load_failed: 'Mars-Landeorte konnten nicht geladen werden. Bitte die Seite aktualisieren.',
  },
};

function main() {
  for (const [locale, patch] of Object.entries(T)) {
    const p = path.join(root, 'messages', `${locale}.json`);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const k of KEYS) {
      if (patch[k] != null) data[k] = patch[k];
    }
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log('patched', locale, KEYS.length, 'keys');
  }
}

main();
