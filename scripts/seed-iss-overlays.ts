/**
 * One-shot generator for ISS module locale overlays (PRD-010 / GH-41).
 * Run: npx tsx scripts/seed-iss-overlays.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IDS = [
  'beam',
  'canadarm2',
  'columbus',
  'cupola',
  'destiny',
  'harmony',
  'kibo',
  'leonardo',
  'nauka',
  'pirs',
  'prichal',
  'quest',
  'rassvet',
  'tranquility',
  'unity',
  'zarya',
  'zvezda',
] as const;

const en: Record<
  (typeof IDS)[number],
  { name: string; description: string; function_detail: string }
> = {
  zarya: {
    name: 'Zarya (FGB)',
    description:
      'The Functional Cargo Block launched first—propulsion, power, and attitude functions that let Unity dock days later. NASA funded Russian construction during the programme’s hardest transition years.',
    function_detail:
      'Battery power, fuel storage, and early attitude control until Zvezda arrived; still provides clearance and structural continuity along the Russian segment.',
  },
  unity: {
    name: 'Unity (Node 1)',
    description:
      'The first U.S.-built connecting node—six berthing ports that turned scattered elements into a wiring-linked station instead of separate cylinders.',
    function_detail:
      'Central berthing hub and utility trunk for power/data between American and Russian segments.',
  },
  zvezda: {
    name: 'Zvezda (Service Module)',
    description:
      'Living quarters, life support, and core propulsion made continuous crew stays possible—effectively the station’s first long-duration home.',
    function_detail:
      'Crew quarters, ECLSS support, refuellable propulsion, and early command functions for the Russian Orbital Segment.',
  },
  destiny: {
    name: 'Destiny',
    description:
      'The primary U.S. laboratory—a shirtsleeve workspace where rack-mounted experiments replaced one-off shuttle middeck demos.',
    function_detail:
      'Microgravity research racks, Earth-facing science windows infrastructure, and NASA’s main indoor lab volume.',
  },
  quest: {
    name: 'Quest',
    description:
      'The U.S. segment’s crew airlock—where suited astronauts step into vacuum without opening a docking port on a crew vehicle.',
    function_detail:
      'Stage spacewalks (EVAs), suit servicing, and alternate egress separate from Soyuz or Dragon docking interfaces.',
  },
  pirs: {
    name: 'Pirs',
    description:
      'Russian docking compartment and EVA airlock used for years before removal—small but busy real estate on the aft complex.',
    function_detail:
      'Docking and EVA staging on the Russian segment until de-orbit in 2021 to clear the port for Nauka.',
  },
  harmony: {
    name: 'Harmony (Node 2)',
    description:
      'The forward utility node that bridged Destiny to European and Japanese labs—think crowded corridor turned international interchange.',
    function_detail:
      'Berthing for Columbus and Kibo elements, crew passage, and camera-pointing robotics attachment points.',
  },
  columbus: {
    name: 'Columbus',
    description:
      'Europe’s flagship science module—ESA’s permanent indoor laboratory carved out of shuttle cargo bay constraints.',
    function_detail:
      'Materials science, biology, and fluid physics racks with crew-tended payloads and Earth observation capability.',
  },
  kibo: {
    name: 'Kibo',
    description:
      'Japan’s multidisciplinary complex—the only ISS segment with both pressurised lab and exposed “porch” for outdoor payloads.',
    function_detail:
      'Indoor experiment racks plus external logistics for Earth observation and technology demos facing deep space.',
  },
  tranquility: {
    name: 'Tranquility (Node 3)',
    description:
      'Life-support heavy lifting and astronaut treadmill fame—where habitability engineering quietly dominates the headlines.',
    function_detail:
      'Major ECLSS hardware, exercise hardware volume, and routing between U.S. utilities and the Cupola.',
  },
  cupola: {
    name: 'Cupola',
    description:
      'Seven windows aimed Earthward—the station’s collective eyes for robotics ops and the astronaut postcard shot.',
    function_detail:
      'Robotics workstation commanding Canadarm2 with direct visual cues; panoramic Earth observation.',
  },
  rassvet: {
    name: 'Rassvet (MLM-U)',
    description:
      'A compact Russian docking compartment that widened cargo vehicle parking options near Zarya.',
    function_detail:
      'Docking port extension and small cargo stowage adjacent to the Russian segment core.',
  },
  leonardo: {
    name: 'Leonardo (PMM)',
    description:
      'A logistics module that stayed—converted from shuttle-era cargo carrier to permanent attic storage.',
    function_detail:
      'Pressurised stowage for supplies and hardware bags so labs stay clear for science racks.',
  },
  beam: {
    name: 'BEAM',
    description:
      'An inflatable tech-demo compartment—Bigelow’s soft shell bolted to Tranquility to prove expandable volumes on orbit.',
    function_detail:
      'Expandable habitat demonstration for radiation measurement and leak-check lessons learned.',
  },
  nauka: {
    name: 'Nauka (MLM)',
    description:
      'The massive Russian multipurpose lab that arrived decades into assembly—science volume plus propellant transfer ambitions.',
    function_detail:
      'Laboratory facilities, crew quarters additions, and propellant transfer gear anchoring the aft Russian complex.',
  },
  prichal: {
    name: 'Prichal',
    description:
      'A spherical docking node—six ports to cluster visiting vehicles around the Russian segment.',
    function_detail:
      'Radial docking hub expanding Soyuz/Progress parking independent of older axial ports.',
  },
  canadarm2: {
    name: 'Canadarm2',
    description:
      'The station’s long yellow crane—walking hand-over-hand along the truss to capture cargo vehicles without astronaut wrestle matches.',
    function_detail:
      'Berthing assistance, EVA support, and massive exterior assembly moves along the Mobile Base System.',
  },
};

const es: Record<
  (typeof IDS)[number],
  { name: string; description: string; function_detail: string }
> = {
  zarya: {
    name: 'Zarya (FGB)',
    description:
      'El primer módulo lanzado: energía, combustible y control de actitud que permitieron el acoplamiento de Unity días después.',
    function_detail:
      'Proporcionó energía de baterías y propulsión hasta la llegada de Zvezda; sigue siendo estructura clave del segmento ruso.',
  },
  unity: {
    name: 'Unity (Nodo 1)',
    description:
      'Primer nodo estadounidense: seis puertos de acoplamiento que convirtieron elementos sueltos en una estación cableada.',
    function_detail:
      'Centro de acoplamiento y distribución de servicios entre segmentos estadounidense y ruso.',
  },
  zvezda: {
    name: 'Zvezda (módulo de servicio)',
    description:
      'Alojamiento y soporte vital que hizo posible estancias largas: el primer hogar permanente de la tripulación.',
    function_detail:
      'Dormitorios, soporte ECLSS y propulsión recargable para el segmento orbital ruso.',
  },
  destiny: {
    name: 'Destiny',
    description:
      'Laboratorio principal de EE. UU.: racks de microgravedad donde la ciencia sustituyó los experimentos breves del transbordador.',
    function_detail:
      'Investigación microgravedad, infraestructura de ventanas y espacio principal de laboratorio de la NASA.',
  },
  quest: {
    name: 'Quest',
    description:
      'Esclusa estadounidense para caminatas espaciales sin usar el puerto de una nave tripulada.',
    function_detail: 'Preparación de EVA, mantenimiento de trajes y salida alternativa al vacío.',
  },
  pirs: {
    name: 'Pirs',
    description:
      'Compartimento ruso de acoplamiento y esclusa retirado en 2021 para liberar el puerto de Nauka.',
    function_detail: 'Acoplamiento y EVA en el segmento ruso hasta su desorbitado.',
  },
  harmony: {
    name: 'Harmony (Nodo 2)',
    description: 'Nodo de servicios que conectó Destiny con laboratorios europeo y japonés.',
    function_detail: 'Atraque de Columbus y Kibo, pasillo de tripulación y puntos para robótica.',
  },
  columbus: {
    name: 'Columbus',
    description: 'Laboratorio insignia de la ESA: ciencia europea permanente en microgravedad.',
    function_detail: 'Ciencia de materiales, biología y fluidos con racks interiores.',
  },
  kibo: {
    name: 'Kibo',
    description:
      'Complejo japonés con laboratorio presurizado y plataforma exterior para cargas expuestas.',
    function_detail:
      'Experimentación interior y logística exterior para observación terrestre y demostraciones.',
  },
  tranquility: {
    name: 'Tranquility (Nodo 3)',
    description:
      'Soporte vital principal y espacio para ejercicio; conecta servicios con la Cúpula.',
    function_detail:
      'ECLSS importante, cinta de ejercicio y distribución de utilidades del segmento estadounidense.',
  },
  cupola: {
    name: 'Cúpula',
    description: 'Siete ventanas mirando a la Tierra; vista icónica para robótica y observación.',
    function_detail: 'Puesto de trabajo robótico para Canadarm2 con vista panorámica.',
  },
  rassvet: {
    name: 'Rassvet',
    description: 'Compartimento ruso compacto que añadió puertos de atraque cerca de Zarya.',
    function_detail: 'Extensión de atraque y estiba junto al núcleo ruso.',
  },
  leonardo: {
    name: 'Leonardo (PMM)',
    description: 'Módulo logístico convertido en almacén permanente tras la era del transbordador.',
    function_detail: 'Almacenaje presurizado para suministros y liberar los laboratorios.',
  },
  beam: {
    name: 'BEAM',
    description: 'Volumen inflable demostrando hábitats expansibles acoplados a Tranquility.',
    function_detail: 'Demostración de hábitat inflable con mediciones de radiación y estanqueidad.',
  },
  nauka: {
    name: 'Nauka',
    description:
      'Gran laboratorio multipropósito ruso con instalaciones científicas y suministro de combustible.',
    function_detail:
      'Laboratorio, alojamiento adicional y transferencia de combustible en el segmento ruso.',
  },
  prichal: {
    name: 'Prichal',
    description: 'Nodo esférico de atraque con múltiples puertos radiales.',
    function_detail: 'Concentrador de naves visitantes en el segmento ruso.',
  },
  canadarm2: {
    name: 'Canadarm2',
    description:
      'El brazo robótico principal que captura cargueros y mueve equipamiento por la estructura.',
    function_detail: 'Atraque asistido, apoyo EVA y montaje exterior a lo largo del sistema móvil.',
  },
};

function writeLocale(locale: 'en-US' | 'es', map: typeof en) {
  const root = join('static', 'data', 'i18n', locale, 'iss-modules');
  mkdirSync(root, { recursive: true });
  for (const id of IDS) {
    writeFileSync(join(root, `${id}.json`), JSON.stringify(map[id], null, 2) + '\n');
  }
}

writeLocale('en-US', en);
writeLocale('es', es);
console.log('Wrote ISS overlays for en-US and es.');
