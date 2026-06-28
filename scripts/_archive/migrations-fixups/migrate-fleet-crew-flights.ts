#!/usr/bin/env tsx
/**
 * One-shot migration: populates `flights[]` on every crewed-spacecraft
 * fleet entry with 3-6 notable flights per PRD-012 v0.2 §what-it-must-do
 * (CREW tab spec).
 *
 * Strategy: hand-curated flight lists picking the historically
 * significant flights per generation (firsts, fatalities, anniversary
 * missions, era-defining flights). Crew names + roles are baked in;
 * mission_id cross-links to /missions when an entry exists; patch +
 * portrait paths follow the Wikimedia Commons / NASA archive convention
 * and get fetched in a follow-up `fetch-assets --fleet-patches` pass.
 *
 * Run after Phase A scaffold:
 *   tsx scripts/migrate-fleet-crew-flights.ts
 *
 * Re-runnable: existing flights[] arrays are REPLACED with the
 * curated set below.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FLEET_DIR = join(ROOT, 'static/data/fleet/crewed-spacecraft');

type CrewMember = {
  name: string;
  role: string;
  agency?: string;
  country?: string;
};
type Flight = {
  mission_id: string;
  flight_designation: string;
  crew?: CrewMember[];
};

/**
 * Curated notable flights per crewed-spacecraft entry. Selection
 * prioritises historical firsts, anniversaries, and era-defining
 * missions over routine flights.
 *
 * mission_id cross-links to /missions/{dest}/{id}.json where one
 * exists (Apollo 11, Apollo 17, Vostok 1 don't have first-class
 * mission entries today; using a placeholder hyphen-id that can
 * resolve to a future mission record — the panel link falls
 * through gracefully when missing).
 */
const FLIGHTS: Record<string, Flight[]> = {
  vostok: [
    {
      mission_id: 'vostok1',
      flight_designation: 'Vostok 1 (1961-04-12)',
      crew: [{ name: 'Yuri Gagarin', role: 'Cosmonaut', agency: 'Roscosmos', country: 'USSR' }],
    },
    {
      mission_id: 'vostok2',
      flight_designation: 'Vostok 2 (1961-08-06)',
      crew: [{ name: 'Gherman Titov', role: 'Cosmonaut', agency: 'Roscosmos', country: 'USSR' }],
    },
    {
      mission_id: 'vostok6',
      flight_designation: 'Vostok 6 (1963-06-16)',
      crew: [
        {
          name: 'Valentina Tereshkova',
          role: 'Cosmonaut · first woman in space',
          agency: 'Roscosmos',
          country: 'USSR',
        },
      ],
    },
  ],
  voskhod: [
    {
      mission_id: 'voskhod1',
      flight_designation: 'Voskhod 1 (1964-10-12) · first multi-crew',
      crew: [
        { name: 'Vladimir Komarov', role: 'Commander', agency: 'Roscosmos', country: 'USSR' },
        { name: 'Konstantin Feoktistov', role: 'Engineer', agency: 'Roscosmos', country: 'USSR' },
        { name: 'Boris Yegorov', role: 'Physician', agency: 'Roscosmos', country: 'USSR' },
      ],
    },
    {
      mission_id: 'voskhod2',
      flight_designation: 'Voskhod 2 (1965-03-18) · first spacewalk',
      crew: [
        { name: 'Pavel Belyayev', role: 'Commander', agency: 'Roscosmos', country: 'USSR' },
        { name: 'Alexei Leonov', role: 'EVA pilot', agency: 'Roscosmos', country: 'USSR' },
      ],
    },
  ],
  'mercury-capsule': [
    {
      mission_id: 'freedom7',
      flight_designation: 'MR-3 Freedom 7 (1961-05-05)',
      crew: [
        {
          name: 'Alan Shepard',
          role: 'Astronaut · first American in space',
          agency: 'NASA',
          country: 'USA',
        },
      ],
    },
    {
      mission_id: 'friendship7',
      flight_designation: 'MA-6 Friendship 7 (1962-02-20)',
      crew: [
        {
          name: 'John Glenn',
          role: 'Astronaut · first American to orbit',
          agency: 'NASA',
          country: 'USA',
        },
      ],
    },
    {
      mission_id: 'faith7',
      flight_designation: 'MA-9 Faith 7 (1963-05-15)',
      crew: [
        {
          name: 'Gordon Cooper',
          role: 'Astronaut · last Mercury flight',
          agency: 'NASA',
          country: 'USA',
        },
      ],
    },
  ],
  gemini: [
    {
      mission_id: 'gemini4',
      flight_designation: 'Gemini 4 (1965-06-03) · first US EVA',
      crew: [
        { name: 'James McDivitt', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Edward White', role: 'EVA pilot', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'gemini7',
      flight_designation: 'Gemini 7 (1965-12-04) · first rendezvous',
      crew: [
        { name: 'Frank Borman', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'James Lovell', role: 'Pilot', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'gemini8',
      flight_designation: 'Gemini 8 (1966-03-16) · first docking',
      crew: [
        { name: 'Neil Armstrong', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'David Scott', role: 'Pilot', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'gemini12',
      flight_designation: 'Gemini 12 (1966-11-11) · last Gemini',
      crew: [
        { name: 'James Lovell', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Buzz Aldrin', role: 'EVA pilot', agency: 'NASA', country: 'USA' },
      ],
    },
  ],
  'soyuz-7k-ok': [
    {
      mission_id: 'soyuz1',
      flight_designation: 'Soyuz 1 (1967-04-23) · fatal',
      crew: [{ name: 'Vladimir Komarov', role: 'Commander', agency: 'Roscosmos', country: 'USSR' }],
    },
    {
      mission_id: 'soyuz4',
      flight_designation: 'Soyuz 4/5 (1969) · first crew transfer',
      crew: [
        {
          name: 'Vladimir Shatalov',
          role: 'Soyuz 4 commander',
          agency: 'Roscosmos',
          country: 'USSR',
        },
        { name: 'Boris Volynov', role: 'Soyuz 5 commander', agency: 'Roscosmos', country: 'USSR' },
      ],
    },
    {
      mission_id: 'soyuz11',
      flight_designation: 'Soyuz 11 (1971) · fatal · first long-duration',
      crew: [
        { name: 'Georgy Dobrovolsky', role: 'Commander', agency: 'Roscosmos', country: 'USSR' },
        { name: 'Vladislav Volkov', role: 'Engineer', agency: 'Roscosmos', country: 'USSR' },
        { name: 'Viktor Patsayev', role: 'Engineer', agency: 'Roscosmos', country: 'USSR' },
      ],
    },
  ],
  'apollo-csm-block-ii': [
    {
      mission_id: 'apollo7',
      flight_designation: 'Apollo 7 (1968-10-11) · first Block II crewed flight',
      crew: [
        { name: 'Wally Schirra', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Donn Eisele', role: 'CMP', agency: 'NASA', country: 'USA' },
        { name: 'Walter Cunningham', role: 'LMP', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'apollo8',
      flight_designation: 'Apollo 8 (1968-12-21) · first humans to leave Earth',
      crew: [
        { name: 'Frank Borman', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'James Lovell', role: 'CMP', agency: 'NASA', country: 'USA' },
        { name: 'William Anders', role: 'LMP', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'apollo11',
      flight_designation: 'Apollo 11 (1969-07-16) · first lunar landing',
      crew: [
        { name: 'Neil Armstrong', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Michael Collins', role: 'CMP', agency: 'NASA', country: 'USA' },
        { name: 'Buzz Aldrin', role: 'LMP', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'apollo13',
      flight_designation: 'Apollo 13 (1970-04-11) · survival',
      crew: [
        { name: 'James Lovell', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Jack Swigert', role: 'CMP', agency: 'NASA', country: 'USA' },
        { name: 'Fred Haise', role: 'LMP', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'apollo17',
      flight_designation: 'Apollo 17 (1972-12-07) · last lunar mission',
      crew: [
        {
          name: 'Eugene Cernan',
          role: 'Commander · last man on the Moon',
          agency: 'NASA',
          country: 'USA',
        },
        { name: 'Ronald Evans', role: 'CMP', agency: 'NASA', country: 'USA' },
        {
          name: 'Harrison Schmitt',
          role: 'LMP · only scientist-astronaut on the Moon',
          agency: 'NASA',
          country: 'USA',
        },
      ],
    },
  ],
  'apollo-lm': [
    {
      mission_id: 'apollo11',
      flight_designation: 'Eagle · Apollo 11 (1969-07-20)',
      crew: [
        {
          name: 'Neil Armstrong',
          role: 'Commander · first to step on the Moon',
          agency: 'NASA',
          country: 'USA',
        },
        { name: 'Buzz Aldrin', role: 'LMP', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'apollo13',
      flight_designation: 'Aquarius · Apollo 13 (1970) · improvised lifeboat',
      crew: [
        { name: 'James Lovell', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Fred Haise', role: 'LMP', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'apollo15',
      flight_designation: 'Falcon · Apollo 15 (1971-07-30)',
      crew: [
        { name: 'David Scott', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'James Irwin', role: 'LMP', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'apollo17',
      flight_designation: 'Challenger · Apollo 17 (1972-12-11) · last lunar landing',
      crew: [
        { name: 'Eugene Cernan', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Harrison Schmitt', role: 'LMP', agency: 'NASA', country: 'USA' },
      ],
    },
  ],
  'soyuz-t': [
    {
      mission_id: 'soyuz-t-3',
      flight_designation: 'Soyuz T-3 (1980-11-27) · first crewed Soyuz T',
      crew: [
        { name: 'Leonid Kizim', role: 'Commander', agency: 'Roscosmos', country: 'USSR' },
        { name: 'Oleg Makarov', role: 'Flight engineer', agency: 'Roscosmos', country: 'USSR' },
        { name: 'Gennady Strekalov', role: 'Researcher', agency: 'Roscosmos', country: 'USSR' },
      ],
    },
    {
      mission_id: 'soyuz-t-13',
      flight_designation: 'Soyuz T-13 (1985-06-06) · Salyut 7 rescue',
      crew: [
        { name: 'Vladimir Dzhanibekov', role: 'Commander', agency: 'Roscosmos', country: 'USSR' },
        { name: 'Viktor Savinykh', role: 'Engineer', agency: 'Roscosmos', country: 'USSR' },
      ],
    },
  ],
  'space-shuttle-orbiter': [
    {
      mission_id: 'sts-1',
      flight_designation: 'STS-1 Columbia (1981-04-12) · first Shuttle flight',
      crew: [
        { name: 'John Young', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Robert Crippen', role: 'Pilot', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'sts-7',
      flight_designation: 'STS-7 Challenger (1983-06-18)',
      crew: [
        { name: 'Robert Crippen', role: 'Commander', agency: 'NASA', country: 'USA' },
        {
          name: 'Sally Ride',
          role: 'Mission specialist · first US woman in space',
          agency: 'NASA',
          country: 'USA',
        },
        { name: 'Frederick Hauck', role: 'Pilot', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'sts-31',
      flight_designation: 'STS-31 Discovery (1990-04-24) · Hubble deployment',
      crew: [
        { name: 'Loren Shriver', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Charles Bolden', role: 'Pilot', agency: 'NASA', country: 'USA' },
        {
          name: 'Steven Hawley',
          role: 'Mission specialist · deployed Hubble',
          agency: 'NASA',
          country: 'USA',
        },
      ],
    },
    {
      mission_id: 'sts-51-l',
      flight_designation: 'STS-51-L Challenger (1986-01-28) · disaster',
      crew: [
        { name: 'Francis "Dick" Scobee', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Christa McAuliffe', role: 'Teacher in Space', agency: 'NASA', country: 'USA' },
        { name: 'Ronald McNair', role: 'Mission specialist', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'sts-107',
      flight_designation: 'STS-107 Columbia (2003-01-16) · disaster on reentry',
      crew: [
        { name: 'Rick Husband', role: 'Commander', agency: 'NASA', country: 'USA' },
        {
          name: 'Ilan Ramon',
          role: 'Payload specialist · first Israeli astronaut',
          agency: 'NASA',
          country: 'Israel',
        },
        { name: 'Kalpana Chawla', role: 'Mission specialist', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'sts-135',
      flight_designation: 'STS-135 Atlantis (2011-07-08) · last Shuttle flight',
      crew: [
        { name: 'Christopher Ferguson', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Doug Hurley', role: 'Pilot', agency: 'NASA', country: 'USA' },
      ],
    },
  ],
  buran: [
    {
      mission_id: 'buran-1k1',
      flight_designation: '1K1 OK-1K1 (1988-11-15) · first and only flight',
      crew: [],
    },
  ],
  'soyuz-tm': [
    {
      mission_id: 'soyuz-tm-2',
      flight_designation: 'Soyuz TM-2 (1987-02-05) · first Mir long-duration crew',
      crew: [
        { name: 'Yuri Romanenko', role: 'Commander', agency: 'Roscosmos', country: 'USSR' },
        { name: 'Aleksandr Laveikin', role: 'Engineer', agency: 'Roscosmos', country: 'USSR' },
      ],
    },
    {
      mission_id: 'soyuz-tm-31',
      flight_designation: 'Soyuz TM-31 (2000-10-31) · first ISS Expedition crew',
      crew: [
        { name: 'Yuri Gidzenko', role: 'Soyuz commander', agency: 'Roscosmos', country: 'Russia' },
        {
          name: 'Sergei Krikalev',
          role: 'ISS flight engineer',
          agency: 'Roscosmos',
          country: 'Russia',
        },
        { name: 'William Shepherd', role: 'ISS commander', agency: 'NASA', country: 'USA' },
      ],
    },
  ],
  'soyuz-tma': [
    {
      mission_id: 'soyuz-tma-1',
      flight_designation: 'Soyuz TMA-1 (2002-10-30) · first ISS lifeboat',
      crew: [
        { name: 'Sergei Zalyotin', role: 'Commander', agency: 'Roscosmos', country: 'Russia' },
        { name: 'Frank De Winne', role: 'Flight engineer', agency: 'ESA', country: 'Belgium' },
        { name: 'Yuri Lonchakov', role: 'Flight engineer', agency: 'Roscosmos', country: 'Russia' },
      ],
    },
    {
      mission_id: 'soyuz-tma-21',
      flight_designation: 'Soyuz TMA-21 "Gagarin" (2011-04-04) · 50th anniversary',
      crew: [
        {
          name: 'Aleksandr Samokutyaev',
          role: 'Commander',
          agency: 'Roscosmos',
          country: 'Russia',
        },
        {
          name: 'Andrey Borisenko',
          role: 'Flight engineer',
          agency: 'Roscosmos',
          country: 'Russia',
        },
        { name: 'Ron Garan', role: 'Flight engineer', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'soyuz-tma-22',
      flight_designation: 'Soyuz TMA-22 (2011-11-13) · last analog Soyuz TMA',
      crew: [
        { name: 'Anton Shkaplerov', role: 'Commander', agency: 'Roscosmos', country: 'Russia' },
        {
          name: 'Anatoly Ivanishin',
          role: 'Flight engineer',
          agency: 'Roscosmos',
          country: 'Russia',
        },
        { name: 'Daniel Burbank', role: 'Flight engineer', agency: 'NASA', country: 'USA' },
      ],
    },
  ],
  shenzhou: [
    {
      mission_id: 'shenzhou-5',
      flight_designation: 'Shenzhou 5 (2003-10-15) · first Chinese in space',
      crew: [{ name: 'Yang Liwei', role: 'Taikonaut', agency: 'CMSA', country: 'China' }],
    },
    {
      mission_id: 'shenzhou-7',
      flight_designation: 'Shenzhou 7 (2008-09-25) · first Chinese EVA',
      crew: [
        {
          name: 'Zhai Zhigang',
          role: 'Commander · first Chinese EVA',
          agency: 'CMSA',
          country: 'China',
        },
        { name: 'Liu Boming', role: 'Pilot', agency: 'CMSA', country: 'China' },
        { name: 'Jing Haipeng', role: 'Pilot', agency: 'CMSA', country: 'China' },
      ],
    },
    {
      mission_id: 'shenzhou-9',
      flight_designation: 'Shenzhou 9 (2012-06-16) · first Chinese woman',
      crew: [
        { name: 'Jing Haipeng', role: 'Commander', agency: 'CMSA', country: 'China' },
        { name: 'Liu Wang', role: 'Pilot', agency: 'CMSA', country: 'China' },
        {
          name: 'Liu Yang',
          role: 'Taikonaut · first Chinese woman in space',
          agency: 'CMSA',
          country: 'China',
        },
      ],
    },
    {
      mission_id: 'shenzhou-13',
      flight_designation: 'Shenzhou 13 (2021-10-15) · first Tiangong long-duration',
      crew: [
        { name: 'Zhai Zhigang', role: 'Commander', agency: 'CMSA', country: 'China' },
        {
          name: 'Wang Yaping',
          role: 'Operator · first Chinese woman EVA',
          agency: 'CMSA',
          country: 'China',
        },
        { name: 'Ye Guangfu', role: 'Operator', agency: 'CMSA', country: 'China' },
      ],
    },
  ],
  'soyuz-ms': [
    {
      mission_id: 'soyuz-ms-01',
      flight_designation: 'Soyuz MS-01 (2016-07-07) · first MS-class crew',
      crew: [
        { name: 'Anatoli Ivanishin', role: 'Commander', agency: 'Roscosmos', country: 'Russia' },
        { name: 'Takuya Onishi', role: 'Flight engineer', agency: 'JAXA', country: 'Japan' },
        { name: 'Kate Rubins', role: 'Flight engineer', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'soyuz-ms-10',
      flight_designation: 'Soyuz MS-10 (2018-10-11) · launch abort, crew survived',
      crew: [
        { name: 'Aleksey Ovchinin', role: 'Commander', agency: 'Roscosmos', country: 'Russia' },
        { name: 'Nick Hague', role: 'Flight engineer', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'soyuz-ms-22',
      flight_designation: 'Soyuz MS-22 (2022-09-21) · coolant leak, MS-23 rescue',
      crew: [
        { name: 'Sergey Prokopyev', role: 'Commander', agency: 'Roscosmos', country: 'Russia' },
        { name: 'Dmitri Petelin', role: 'Flight engineer', agency: 'Roscosmos', country: 'Russia' },
        {
          name: 'Frank Rubio',
          role: 'Flight engineer · longest-ever single US spaceflight',
          agency: 'NASA',
          country: 'USA',
        },
      ],
    },
  ],
  'crew-dragon': [
    {
      mission_id: 'demo-2',
      flight_designation: 'Demo-2 (2020-05-30) · first commercial human spaceflight',
      crew: [
        { name: 'Doug Hurley', role: 'Spacecraft commander', agency: 'NASA', country: 'USA' },
        { name: 'Bob Behnken', role: 'Joint operations commander', agency: 'NASA', country: 'USA' },
      ],
    },
    {
      mission_id: 'crew-1',
      flight_designation: 'Crew-1 (2020-11-15) · first operational mission',
      crew: [
        { name: 'Michael Hopkins', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Victor Glover', role: 'Pilot', agency: 'NASA', country: 'USA' },
        { name: 'Shannon Walker', role: 'Mission specialist', agency: 'NASA', country: 'USA' },
        { name: 'Soichi Noguchi', role: 'Mission specialist', agency: 'JAXA', country: 'Japan' },
      ],
    },
    {
      mission_id: 'inspiration4',
      flight_designation: 'Inspiration4 (2021-09-15) · first all-civilian orbital',
      crew: [
        { name: 'Jared Isaacman', role: 'Commander', country: 'USA' },
        { name: 'Hayley Arceneaux', role: 'Medical officer', country: 'USA' },
        { name: 'Sian Proctor', role: 'Pilot', country: 'USA' },
        { name: 'Christopher Sembroski', role: 'Mission specialist', country: 'USA' },
      ],
    },
    {
      mission_id: 'crew-9',
      flight_designation: 'Crew-9 (2024-09-28) · returned Starliner crew',
      crew: [
        { name: 'Nick Hague', role: 'Commander', agency: 'NASA', country: 'USA' },
        {
          name: 'Aleksandr Gorbunov',
          role: 'Mission specialist',
          agency: 'Roscosmos',
          country: 'Russia',
        },
      ],
    },
  ],
  starliner: [
    {
      mission_id: 'cft',
      flight_designation: 'CFT — Crew Flight Test (2024-06-05)',
      crew: [
        { name: 'Butch Wilmore', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Suni Williams', role: 'Pilot', agency: 'NASA', country: 'USA' },
      ],
    },
  ],
  'new-shepard': [
    {
      mission_id: 'ns-16',
      flight_designation: 'NS-16 (2021-07-20) · first crewed flight',
      crew: [
        { name: 'Jeff Bezos', role: 'Crew', country: 'USA' },
        { name: 'Mark Bezos', role: 'Crew', country: 'USA' },
        { name: 'Wally Funk', role: 'Crew · oldest person in space (then)', country: 'USA' },
        {
          name: 'Oliver Daemen',
          role: 'Crew · youngest person in space (then)',
          country: 'Netherlands',
        },
      ],
    },
    {
      mission_id: 'ns-18',
      flight_designation: 'NS-18 (2021-10-13) · William Shatner',
      crew: [
        { name: 'William Shatner', role: 'Crew · oldest person in space (90)', country: 'USA' },
        { name: 'Audrey Powers', role: 'Vice President · Blue Origin', country: 'USA' },
      ],
    },
  ],
  orion: [
    {
      mission_id: 'artemis1',
      flight_designation: 'Artemis I (2022-11-16) · uncrewed lunar test',
      crew: [],
    },
    {
      mission_id: 'artemis2',
      flight_designation: 'Artemis II (planned) · first crewed lunar flyby since 1972',
      crew: [
        { name: 'Reid Wiseman', role: 'Commander', agency: 'NASA', country: 'USA' },
        { name: 'Victor Glover', role: 'Pilot', agency: 'NASA', country: 'USA' },
        { name: 'Christina Koch', role: 'Mission specialist', agency: 'NASA', country: 'USA' },
        { name: 'Jeremy Hansen', role: 'Mission specialist', agency: 'CSA', country: 'Canada' },
      ],
    },
  ],
};

async function main() {
  let touched = 0;
  for (const [id, flights] of Object.entries(FLIGHTS)) {
    const path = join(FLEET_DIR, `${id}.json`);
    const entry = JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>;
    entry.flights = flights;
    await writeFile(path, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
    touched += 1;
  }
  console.log(`flights[]: populated on ${touched} crewed-spacecraft entries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
