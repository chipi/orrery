import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => ({
  meta: {
    title: 'Venus — Orrery',
    description:
      "Venus's surface as reached by the only craft that ever touched it — the Soviet Venera and Vega landers — on a navigable 3D globe, the destination of /fly's Venus descents.",
  },
});
