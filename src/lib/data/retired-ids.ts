/**
 * Ids merged into another entry. Old links (`/fleet?id=`, `/earth?site=`)
 * resolve to the surviving id instead of opening nothing.
 */
const RETIRED_IDS: Record<string, string> = {
  // Duplicate of the same pad (Sputnik, Vostok 1, crewed Soyuz to 2019).
  'gagarins-start': 'baikonur-1-5',
};

export function canonicalId(id: string): string {
  return RETIRED_IDS[id] ?? id;
}
