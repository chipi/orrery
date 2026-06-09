/**
 * Approximate viewer-location lookup from the browser's IANA timezone.
 *
 * Used by /earth (issue #315) to auto-orient the SurfaceScene camera
 * toward the viewer's region on load — Amsterdam → Europe; Los Angeles
 * → west-coast US; Tokyo → Japan; etc. No geolocation permission, no
 * network call, works fully offline.
 *
 * Resolution is timezone-coarse — a "Europe/Amsterdam" viewer gets
 * Amsterdam's lat/lon, but a "Europe/London" viewer near Edinburgh
 * gets London's. That's acceptable for "rotate the globe roughly
 * toward me" UX; precise positioning needs the Geolocation API (separate
 * affordance).
 *
 * Table covers the ~70 most populated IANA timezones. Unknown zones
 * return null and the caller falls back to the default scene pose.
 */

/** [latitude_deg, longitude_deg] — the canonical city anchor for the zone. */
const TZ_TO_LATLON: Record<string, [number, number]> = {
  // Europe
  'Europe/Amsterdam': [52.37, 4.9],
  'Europe/Andorra': [42.5, 1.5],
  'Europe/Athens': [37.97, 23.73],
  'Europe/Belgrade': [44.8, 20.47],
  'Europe/Berlin': [52.52, 13.4],
  'Europe/Brussels': [50.85, 4.35],
  'Europe/Bucharest': [44.43, 26.1],
  'Europe/Budapest': [47.5, 19.05],
  'Europe/Copenhagen': [55.68, 12.57],
  'Europe/Dublin': [53.35, -6.27],
  'Europe/Helsinki': [60.17, 24.93],
  'Europe/Istanbul': [41.01, 28.98],
  'Europe/Kyiv': [50.45, 30.52],
  'Europe/Lisbon': [38.72, -9.14],
  'Europe/London': [51.51, -0.13],
  'Europe/Madrid': [40.42, -3.7],
  'Europe/Moscow': [55.76, 37.62],
  'Europe/Oslo': [59.91, 10.75],
  'Europe/Paris': [48.86, 2.35],
  'Europe/Prague': [50.09, 14.42],
  'Europe/Rome': [41.9, 12.5],
  'Europe/Stockholm': [59.33, 18.07],
  'Europe/Vienna': [48.21, 16.37],
  'Europe/Warsaw': [52.23, 21.01],
  'Europe/Zurich': [47.37, 8.55],
  // North America
  'America/New_York': [40.71, -74.01],
  'America/Chicago': [41.88, -87.63],
  'America/Denver': [39.74, -104.99],
  'America/Phoenix': [33.45, -112.07],
  'America/Los_Angeles': [34.05, -118.24],
  'America/Anchorage': [61.22, -149.9],
  'America/Honolulu': [21.31, -157.86],
  'America/Toronto': [43.65, -79.38],
  'America/Vancouver': [49.28, -123.12],
  'America/Mexico_City': [19.43, -99.13],
  'America/Sao_Paulo': [-23.55, -46.63],
  'America/Buenos_Aires': [-34.6, -58.38],
  'America/Bogota': [4.71, -74.07],
  'America/Lima': [-12.05, -77.04],
  'America/Santiago': [-33.45, -70.67],
  'America/Caracas': [10.48, -66.9],
  'America/Halifax': [44.65, -63.58],
  // Asia
  'Asia/Tokyo': [35.68, 139.65],
  'Asia/Seoul': [37.57, 126.98],
  'Asia/Shanghai': [31.23, 121.47],
  'Asia/Hong_Kong': [22.32, 114.17],
  'Asia/Singapore': [1.35, 103.82],
  'Asia/Bangkok': [13.76, 100.5],
  'Asia/Jakarta': [-6.21, 106.85],
  'Asia/Manila': [14.6, 120.98],
  'Asia/Kolkata': [22.57, 88.36],
  'Asia/Karachi': [24.86, 67.0],
  'Asia/Dhaka': [23.81, 90.41],
  'Asia/Dubai': [25.2, 55.27],
  'Asia/Riyadh': [24.71, 46.68],
  'Asia/Jerusalem': [31.78, 35.22],
  'Asia/Tehran': [35.69, 51.39],
  'Asia/Tashkent': [41.31, 69.28],
  'Asia/Almaty': [43.25, 76.95],
  'Asia/Yekaterinburg': [56.84, 60.61],
  'Asia/Novosibirsk': [55.04, 82.93],
  'Asia/Vladivostok': [43.12, 131.89],
  // Africa
  'Africa/Cairo': [30.05, 31.24],
  'Africa/Johannesburg': [-26.2, 28.04],
  'Africa/Lagos': [6.52, 3.38],
  'Africa/Nairobi': [-1.29, 36.82],
  'Africa/Casablanca': [33.57, -7.59],
  'Africa/Algiers': [36.75, 3.06],
  // Oceania
  'Australia/Sydney': [-33.87, 151.21],
  'Australia/Melbourne': [-37.81, 144.96],
  'Australia/Brisbane': [-27.47, 153.03],
  'Australia/Perth': [-31.95, 115.86],
  'Pacific/Auckland': [-36.85, 174.76],
  'Pacific/Fiji': [-18.14, 178.44],
  // UTC default if explicitly set
  UTC: [0, 0],
};

/**
 * Return the viewer's approximate {latDeg, lonDeg} from their browser
 * timezone, or null if the timezone isn't in the lookup table.
 *
 * SSR-safe: returns null when `Intl` or `window` is unavailable.
 */
export function viewerLatLon(): { latDeg: number; lonDeg: number } | null {
  if (typeof Intl === 'undefined' || typeof window === 'undefined') return null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const hit = TZ_TO_LATLON[tz];
    if (!hit) return null;
    return { latDeg: hit[0], lonDeg: hit[1] };
  } catch {
    return null;
  }
}
