/**
 * Tiangong assembly-phase data — the visiting-craft dock events.
 *
 * Previously declared inline in `src/routes/tiangong/+page.svelte`. Moved here
 * (mirroring `iss-assembly-phases.ts`) so both the /tiangong route and the AR
 * tabletop assembly replay (#408) resolve the same launch epochs instead of
 * duplicating the data.
 *
 * Each entry's `id` matches a `userData.animModuleId` tag assigned to the
 * corresponding visiting-craft mesh in `src/lib/tiangong-proxy-model.ts`. The
 * assembly walker flies each craft in at its real launch date.
 */

/** Synthetic dock event for a first-of-kind visiting-craft arrival. */
export interface TiangongDockEvent {
  id: string;
  name: string;
  launcher: string;
  launch_date: string;
}

/** First-of-kind cargo + crew dockings to Tianhe. */
export const TIANGONG_DOCK_EVENTS: readonly TiangongDockEvent[] = [
  {
    id: 'dock-tianzhou-2',
    name: 'Tianzhou 2 — first cargo to Tianhe',
    launcher: 'Long March 7 · Wenchang',
    launch_date: '2021-05-29',
  },
  {
    id: 'dock-shenzhou-12',
    name: 'Shenzhou 12 — first crew aboard Tianhe',
    launcher: 'Long March 2F · Nie Haisheng + Liu Boming + Tang Hongbo',
    launch_date: '2021-06-17',
  },
  {
    id: 'dock-shenzhou-15',
    name: 'Shenzhou 15 — first 3-spacecraft handover (6 crew aboard)',
    launcher: 'Long March 2F · Fei Junlong + Deng Qingming + Zhang Lu',
    launch_date: '2022-11-29',
  },
];
