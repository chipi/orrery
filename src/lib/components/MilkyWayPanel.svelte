<!--
  MilkyWayPanel — detail panel for a pin in the /explore v2 Milky Way schematic (Slice 5).
  On the shared UniversePanelBody (B3). The Sun shows its galactic address; the black holes
  (Sagittarius A*, Cygnus X-1) open the BlackHolePanel in place, not this one. The view itself
  carries the "schematic · not to scale" honesty badge; the panel numbers are real, cited
  astrometry.
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import type { MilkyWayObject, OuterTextOverlay } from '$lib/data';
  import { outerLead } from '$lib/explore/format';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    object: MilkyWayObject | null;
    /** Absolute href into the matching /science/observation article. */
    learnHref: string;
    open: boolean;
    onClose: () => void;
    /** Another panel is stacked on this one (a black hole opened from its pin). */
    covered?: boolean;
    /** A Magellanic Cloud's reviewed fact and bio (the galaxy page's text) in the reader's language. */
    overlay?: OuterTextOverlay | null;
  };
  let { object, learnHref, open, onClose, covered = false, overlay = null }: Props = $props();

  let kindLabel = $derived.by(() => {
    switch (object?.kind) {
      case 'globular-cluster':
        return m.explore_mw_kind_globular();
      case 'satellite-galaxy':
        return m.explore_mw_kind_satellite();
      case 'spiral-arm':
        return m.explore_mw_kind_arm();
      default:
        return m.explore_mw_kind_star();
    }
  });
  let blurb = $derived.by(() => {
    switch (object?.kind) {
      case 'globular-cluster':
        return m.explore_mw_globular_blurb();
      case 'satellite-galaxy':
        return m.explore_mw_satellite_blurb();
      case 'spiral-arm':
        return m.explore_mw_arm_blurb();
      default:
        return m.explore_mw_sun_blurb();
    }
  });
  const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  let facts = $derived(
    object
      ? [
          ...(object.mass_solar
            ? [
                {
                  label: m.explore_mw_label_mass(),
                  value: fmt(object.mass_solar),
                  unit: m.explore_mw_solar_masses(),
                  accent: true,
                },
              ]
            : []),
          ...(object.dist_from_sun_ly
            ? [
                {
                  label: m.explore_mw_label_dist_sun(),
                  value: `${fmt(object.dist_from_sun_ly)} ly`,
                },
              ]
            : []),
          ...(object.galactocentric_ly
            ? [
                {
                  label: m.explore_mw_label_dist_centre(),
                  value: `${fmt(object.galactocentric_ly)} ly`,
                },
              ]
            : []),
          ...(object.diam_kly
            ? [{ label: m.explore_mw_label_diam(), value: `${fmt(object.diam_kly * 1000)} ly` }]
            : []),
          ...(object.arm ? [{ label: m.explore_mw_label_location(), value: object.arm }] : []),
        ]
      : [],
  );
</script>

<UniversePanelBody
  {open}
  {onClose}
  {covered}
  title={object?.name ?? ''}
  entityId={object?.id ?? ''}
  heroOf={object ? { level: 'milky-way', id: object.id } : undefined}
  kind={object ? kindLabel : undefined}
  name={object?.name}
  lead={object ? outerLead(object.kind === 'satellite-galaxy' ? overlay : null, blurb) : []}
  {facts}
  learn={object ? { href: learnHref, label: m.explore_mw_learn_more() } : undefined}
/>
