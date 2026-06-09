#!/usr/bin/env node
/**
 * Second flight-roster augmentation pass — non-US programs (Roscosmos
 * + CNSA) at parity with the Apollo + Shuttle work, plus the missing
 * Mercury + Gemini flights to finish the early US set.
 *
 * Replaces flights[] on each target with the complete or top-N
 * marquee set. Re-runnable.
 */
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLEET = join(ROOT, 'static', 'data', 'fleet', 'crewed-spacecraft');

const ROSTERS = {
  // ───── Roscosmos / USSR ─────────────────────────────────────────
  vostok: [
    {
      mission_id: 'vostok-1',
      flight_designation:
        'Vostok 1 (1961-04-12) · Yuri Gagarin — first human in space; 108-min single orbit; ejected and parachuted to Earth (capsule landed separately)',
    },
    {
      mission_id: 'vostok-2',
      flight_designation:
        'Vostok 2 (1961-08-06) · Gherman Titov — first full day in space (17 orbits); first space sickness recorded; youngest cosmonaut at 25',
    },
    {
      mission_id: 'vostok-3',
      flight_designation:
        'Vostok 3 (1962-08-11) · Andriyan Nikolayev — first simultaneous-flight dual mission with Vostok 4; 4 days / 64 orbits',
    },
    {
      mission_id: 'vostok-4',
      flight_designation:
        'Vostok 4 (1962-08-12) · Pavel Popovich — flew alongside Vostok 3; passed within 6.5 km of each other on first orbit',
    },
    {
      mission_id: 'vostok-5',
      flight_designation:
        'Vostok 5 (1963-06-14) · Valery Bykovsky — longest solo crewed spaceflight ever (4 days 23 h, still standing in 2026)',
    },
    {
      mission_id: 'vostok-6',
      flight_designation:
        'Vostok 6 (1963-06-16) · Valentina Tereshkova — first woman in space; flew alongside Vostok 5; 70 orbits',
    },
  ],
  voskhod: [
    {
      mission_id: 'voskhod-1',
      flight_designation:
        'Voskhod 1 (1964-10-12) · Komarov + Feoktistov + Yegorov — first three-person crewed spaceflight; no spacesuits (fit three crew in a Vostok-derived hull)',
    },
    {
      mission_id: 'voskhod-2',
      flight_designation:
        'Voskhod 2 (1965-03-18) · Belyayev + Leonov — first EVA (Leonov, 12 min); suit ballooned, required venting; manual landing in remote Urals forest',
    },
  ],
  'soyuz-7k-ok': [
    {
      mission_id: 'soyuz-1',
      flight_designation:
        'Soyuz 1 (1967-04-23) · Vladimir Komarov — FATAL: parachute tangled at landing after 18 orbits of attitude-control failures; first in-flight cosmonaut death',
    },
    {
      mission_id: 'soyuz-3',
      flight_designation:
        'Soyuz 3 (1968-10-26) · Georgy Beregovoy — first Soviet flight after Komarov; attempted rendezvous with uncrewed Soyuz 2 (overshot)',
    },
    {
      mission_id: 'soyuz-4',
      flight_designation:
        'Soyuz 4 (1969-01-14) · Vladimir Shatalov — docked with Soyuz 5; first crew transfer between two crewed spacecraft (via EVA)',
    },
    {
      mission_id: 'soyuz-5',
      flight_designation:
        'Soyuz 5 (1969-01-15) · Volynov + Khrunov + Yeliseyev — Khrunov + Yeliseyev EVA-transferred to Soyuz 4; Volynov returned solo with descent module separation failure (survived)',
    },
    {
      mission_id: 'soyuz-9',
      flight_designation:
        'Soyuz 9 (1970-06-01) · Nikolayev + Sevastyanov — 18-day endurance flight; longest crewed flight to date; informed Salyut programme design',
    },
    {
      mission_id: 'soyuz-11',
      flight_designation:
        'Soyuz 11 (1971-06-06) · Dobrovolsky + Volkov + Patsayev — Salyut 1 first crew (23 days); FATAL: cabin depressurised at separation; crew killed',
    },
  ],
  'soyuz-t': [
    {
      mission_id: 'soyuz-t-2',
      flight_designation:
        'Soyuz T-2 (1980-06-05) · Malyshev + Aksyonov — first crewed flight of redesigned Soyuz T; first crew to Salyut 6',
    },
    {
      mission_id: 'soyuz-t-3',
      flight_designation:
        'Soyuz T-3 (1980-11-27) · Kizim + Makarov + Strekalov — first three-person Soyuz crew since 1971 (T-series restored full crew capacity)',
    },
    {
      mission_id: 'soyuz-t-5',
      flight_designation:
        'Soyuz T-5 (1982-05-13) · Berezovoy + Lebedev — Salyut 7 first crew; 211 days (longest at the time)',
    },
    {
      mission_id: 'soyuz-t-7',
      flight_designation:
        'Soyuz T-7 (1982-08-19) · Popov + Serebrov + Savitskaya — Svetlana Savitskaya: second woman in space (19 years after Tereshkova)',
    },
    {
      mission_id: 'soyuz-t-13',
      flight_designation:
        'Soyuz T-13 (1985-06-06) · Dzhanibekov + Savinykh — rescued the disabled Salyut 7 station; only Soviet salvage spaceflight, 110 days',
    },
    {
      mission_id: 'soyuz-t-15',
      flight_designation:
        'Soyuz T-15 (1986-03-13) · Kizim + Solovyov — last Soyuz T; first crew to dock with both Mir and Salyut 7 in one flight',
    },
  ],
  'soyuz-tm': [
    {
      mission_id: 'soyuz-tm-2',
      flight_designation:
        'Soyuz TM-2 (1987-02-05) · Romanenko + Laveykin — first crew to Mir (TM-1 was uncrewed); 326 days',
    },
    {
      mission_id: 'soyuz-tm-4',
      flight_designation:
        'Soyuz TM-4 (1987-12-21) · Titov + Manarov + Levchenko — Titov + Manarov: first 1-year spaceflight (365 days, returned via TM-6)',
    },
    {
      mission_id: 'soyuz-tm-7',
      flight_designation:
        'Soyuz TM-7 (1988-11-26) · Volkov + Krikalev + Chrétien — first French citizen on Mir; 21-day Aragatz mission',
    },
    {
      mission_id: 'soyuz-tm-12',
      flight_designation:
        'Soyuz TM-12 (1991-05-18) · Artsebarsky + Krikalev + Sharman — Helen Sharman: first Briton in space (Project Juno)',
    },
    {
      mission_id: 'soyuz-tm-19',
      flight_designation:
        'Soyuz TM-19 (1994-07-01) · Malenchenko + Musabayev — first post-USSR cosmonaut crew to Mir',
    },
    {
      mission_id: 'soyuz-tm-31',
      flight_designation:
        'Soyuz TM-31 (2000-10-31) · Shepherd + Krikalev + Gidzenko — Expedition 1 — first crew to ISS',
    },
  ],
  'soyuz-tma': [
    {
      mission_id: 'soyuz-tma-1',
      flight_designation:
        'Soyuz TMA-1 (2002-10-30) · Zaletin + Lonchakov + De Winne — first TMA flight; first Belgian cosmonaut (De Winne)',
    },
    {
      mission_id: 'soyuz-tma-3',
      flight_designation:
        'Soyuz TMA-3 (2003-10-18) · Foale + Kaleri + Duque — first post-Columbia-loss ISS crew; only crewed Soyuz delivering an ISS expedition',
    },
    {
      mission_id: 'soyuz-tma-9',
      flight_designation:
        'Soyuz TMA-9 (2006-09-18) · López-Alegría + Tyurin + Ansari — Anousheh Ansari: first female space tourist + first Iranian-born in space',
    },
    {
      mission_id: 'soyuz-tma-10',
      flight_designation:
        'Soyuz TMA-10 (2007-04-07) · Yurchikhin + Kotov + Simonyi — Charles Simonyi: first multiple-flight space tourist (paid $25M)',
    },
    {
      mission_id: 'soyuz-tma-16m',
      flight_designation:
        'Soyuz TMA-16M (2015-03-27) · Kornienko + Padalka + Kelly — Scott Kelly + Kornienko: first 340-day ISS mission; identical-twin study with Mark Kelly',
    },
    {
      mission_id: 'soyuz-tma-22',
      flight_designation:
        'Soyuz TMA-22 (2011-11-13) · Burbank + Shkaplerov + Ivanishin — last classic Soyuz TMA; first crew after the 2011 Progress-44 loss',
    },
  ],
  'soyuz-ms': [
    {
      mission_id: 'soyuz-ms-04',
      flight_designation:
        'Soyuz MS-04 (2017-04-20) · Yurchikhin + Fischer — final two-person Soyuz crew (cargo Progress arrangement during ISS US-segment shutdown)',
    },
    {
      mission_id: 'soyuz-ms-10',
      flight_designation:
        'Soyuz MS-10 (2018-10-11) · Ovchinin + Hague — ABORTED at T+119 s: Soyuz-FG strap-on jettison failure; crew survived ballistic re-entry at 6.7 g; first in-flight launch abort since 1983',
    },
    {
      mission_id: 'soyuz-ms-15',
      flight_designation:
        'Soyuz MS-15 (2019-09-25) · Skripochka + Meir + Mansoor — first Emirati in space (Hazza Al Mansoori, UAE)',
    },
    {
      mission_id: 'soyuz-ms-19',
      flight_designation:
        'Soyuz MS-19 (2021-10-05) · Shkaplerov + Shipenko + Peresild — first feature-film shoot in space (Klim Shipenko + actress Yuliya Peresild for "The Challenge")',
    },
    {
      mission_id: 'soyuz-ms-20',
      flight_designation:
        'Soyuz MS-20 (2021-12-08) · Misurkin + Maezawa + Hirano — Yusaku Maezawa: first Japanese space tourist; first crewed Soyuz with 2 paying passengers',
    },
    {
      mission_id: 'soyuz-ms-22',
      flight_designation:
        'Soyuz MS-22 (2022-09-21) · Prokopyev + Petelin + Rubio — coolant leak 2022-12-15 forced rescue mission MS-23 (uncrewed)',
    },
    {
      mission_id: 'soyuz-ms-23',
      flight_designation:
        'Soyuz MS-23 (2023-02-24) · UNCREWED · launched to replace leaky MS-22; brought MS-22 crew home 2023-09-27',
    },
  ],
  // ───── CNSA / China ─────────────────────────────────────────────
  shenzhou: [
    {
      mission_id: 'shenzhou-5',
      flight_designation:
        'Shenzhou 5 (2003-10-15) · Yang Liwei — first Chinese citizen in space; 14 orbits / 21 hours; made China the third nation with independent crewed spaceflight',
    },
    {
      mission_id: 'shenzhou-6',
      flight_designation:
        'Shenzhou 6 (2005-10-12) · Fei Junlong + Nie Haisheng — first two-person Chinese crew; 5 days / 76 orbits',
    },
    {
      mission_id: 'shenzhou-7',
      flight_designation:
        'Shenzhou 7 (2008-09-25) · Zhai + Liu + Jing — Zhai Zhigang: first Chinese EVA (22 min); deployed BX-1 nano-satellite',
    },
    {
      mission_id: 'shenzhou-9',
      flight_designation:
        'Shenzhou 9 (2012-06-16) · Jing + Liu Wang + Liu Yang — Liu Yang: first Chinese woman in space; first crewed dock with Tiangong-1',
    },
    {
      mission_id: 'shenzhou-11',
      flight_designation:
        'Shenzhou 11 (2016-10-17) · Jing + Chen Dong — 33-day mission to Tiangong-2; longest Chinese spaceflight at the time',
    },
    {
      mission_id: 'shenzhou-14',
      flight_designation:
        'Shenzhou 14 (2022-06-05) · Chen + Liu + Cai — oversaw Tiangong station assembly (Wentian + Mengtian modules)',
    },
    {
      mission_id: 'shenzhou-15',
      flight_designation:
        'Shenzhou 15 (2022-11-29) · Fei + Deng + Zhang — first Tiangong six-person handover (overlap with SZ-14)',
    },
    {
      mission_id: 'shenzhou-19',
      flight_designation:
        'Shenzhou 19 (2024-10-29) · Cai + Song + Wang — current Tiangong crew (rotates with SZ-20)',
    },
  ],
  buran: [
    {
      mission_id: 'buran-1k1',
      flight_designation:
        'Buran 1K1 (1988-11-15) · UNCREWED · only Buran orbital flight ever; 2 orbits / 206 min; automatic landing in 17 m/s crosswind — programme cancelled after Soviet collapse; OK-1K1 destroyed when its Baikonur hangar roof collapsed 2002',
    },
  ],
  // ───── NASA — completing the early US set ───────────────────────
  'mercury-capsule': [
    {
      mission_id: 'freedom-7',
      flight_designation:
        'Freedom 7 / MR-3 (1961-05-05) · Alan Shepard — first American in space; suborbital 15-min flight; capsule at JFK Library, Boston MA',
    },
    {
      mission_id: 'liberty-bell-7',
      flight_designation:
        'Liberty Bell 7 / MR-4 (1961-07-21) · Gus Grissom — suborbital; hatch blew prematurely on splashdown; capsule sank, recovered 1999, displayed at Cosmosphere, Hutchinson KS',
    },
    {
      mission_id: 'friendship-7',
      flight_designation:
        'Friendship 7 / MA-6 (1962-02-20) · John Glenn — first American to orbit; 3 orbits; capsule at NASM, Washington DC',
    },
    {
      mission_id: 'aurora-7',
      flight_designation:
        'Aurora 7 / MA-7 (1962-05-24) · Scott Carpenter — 3 orbits; overshot landing target by 400 km; capsule at Museum of Science & Industry, Chicago IL',
    },
    {
      mission_id: 'sigma-7',
      flight_designation:
        'Sigma 7 / MA-8 (1962-10-03) · Wally Schirra — first textbook Mercury flight (6 orbits); capsule at Astronaut Memorial Planetarium, Cocoa FL',
    },
    {
      mission_id: 'faith-7',
      flight_designation:
        'Faith 7 / MA-9 (1963-05-15) · Gordon Cooper — last solo American crewed flight; 22 orbits / 34 h; capsule at Space Center Houston, TX',
    },
  ],
  gemini: [
    {
      mission_id: 'gemini-3',
      flight_designation:
        'Gemini 3 (1965-03-23) · Molly Brown · Grissom + Young — first Gemini crewed flight; 3 orbits; Young smuggled corned-beef sandwich on board',
    },
    {
      mission_id: 'gemini-4',
      flight_designation:
        'Gemini 4 (1965-06-03) · McDivitt + White — first American EVA (Ed White, 23 min); 4-day mission',
    },
    {
      mission_id: 'gemini-5',
      flight_designation:
        'Gemini 5 (1965-08-21) · Cooper + Conrad — 8-day duration record; first fuel-cell-powered crewed flight',
    },
    {
      mission_id: 'gemini-6a',
      flight_designation:
        'Gemini 6A (1965-12-15) · Schirra + Stafford — first crewed rendezvous (with Gemini 7, within 30 cm); skipped Gemini 6 after Agena failed',
    },
    {
      mission_id: 'gemini-7',
      flight_designation:
        'Gemini 7 (1965-12-04) · Borman + Lovell — 14-day endurance record (stood for years); target for Gemini 6A rendezvous',
    },
    {
      mission_id: 'gemini-8',
      flight_designation:
        'Gemini 8 (1966-03-16) · Neil Armstrong + Scott — first space docking (with Agena target); emergency abort after stuck thruster spun the stack',
    },
    {
      mission_id: 'gemini-9a',
      flight_designation:
        'Gemini 9A (1966-06-03) · Stafford + Cernan — Cernan EVA exhausted him + fogged faceplate, informing Apollo EVA design',
    },
    {
      mission_id: 'gemini-10',
      flight_designation:
        'Gemini 10 (1966-07-18) · Young + Collins — first multi-Agena rendezvous (own Agena 10 + Gemini 8s docked Agena); Collins recovered Gemini 8 ELS',
    },
    {
      mission_id: 'gemini-11',
      flight_designation:
        'Gemini 11 (1966-09-12) · Conrad + Gordon — direct-ascent first-orbit rendezvous; record-altitude 1374 km on Agena tether',
    },
    {
      mission_id: 'gemini-12',
      flight_designation:
        'Gemini 12 (1966-11-11) · Lovell + Aldrin — last Gemini; 5+ hours EVA proved choreographed crew tasks were feasible; cleared Apollo EVAs',
    },
  ],
};

async function main() {
  for (const [id, flights] of Object.entries(ROSTERS)) {
    const path = join(FLEET, id + '.json');
    const obj = JSON.parse(await readFile(path, 'utf8'));
    const before = (obj.flights || []).length;
    obj.flights = flights;
    await writeFile(path, JSON.stringify(obj, null, 2) + '\n');
    console.log('✓ ' + id.padEnd(18) + ' flights ' + before + ' → ' + flights.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
