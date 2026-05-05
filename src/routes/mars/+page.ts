import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => ({
  meta: {
    title: 'Mars — Orrery',
    description:
      'Every artefact humanity has placed on Mars — landers, rovers, and active orbiters — on a navigable 3D globe with full mission history.',
  },
});
