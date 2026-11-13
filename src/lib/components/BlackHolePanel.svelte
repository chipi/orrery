<!--
  BlackHolePanel — detail panel for the /explore v2 black-hole lensing render
  (Slice 6). On the shared UniversePanelBody (B3): mass / distance / spin /
  Schwarzschild radius + a link into the /science black-holes article, the hole's own picture as
  hero where one exists, and the action that enters the lensing takeover.
  Gargantua carries the Interstellar culture door (Slice 6 Part 5) via the
  optional children slot. Real holes cite EHT/GRAVITY; Gargantua is badged fiction.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import UniversePanelBody from './UniversePanelBody.svelte';
  import Chip from './Chip.svelte';
  import ScienceCard from './ScienceCard.svelte';
  import type { BlackHole, BlackHoleKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { dataSourceItems, recordLinks, sourceLink } from '$lib/catalogue';
  import DataSources from './DataSources.svelte';

  type Props = {
    hole: BlackHole | null;
    learnHref: string;
    open: boolean;
    onClose: () => void;
    /** Another panel is stacked on this one. */
    covered?: boolean;
    /** Enters the lensing takeover; absent while the takeover is already on screen. */
    onSeeLensing?: () => void;
    /** Optional extra content (e.g. Gargantua's culture door). */
    children?: Snippet;
  };
  let { hole, learnHref, open, onClose, covered = false, onSeeLensing, children }: Props = $props();

  const KIND: Record<BlackHoleKind, () => string> = {
    supermassive: m.explore_bh_kind_supermassive,
    stellar: m.explore_bh_kind_stellar,
    fictional: m.explore_bh_kind_fictional,
  };
  let kindLabel = $derived(hole ? KIND[hole.kind]() : '');
  let title = $derived(hole?.name ?? '');
  // Fiction has no catalogue; a real hole's spin is a render parameter with no published value
  // behind it here, so it is not shown as a measurement.
  let real = $derived(hole !== null && hole.kind !== 'fictional');
  let massSrc = $derived(sourceLink(hole?.catalogue?.mass_solar));
  let distSrc = $derived(sourceLink(hole?.catalogue?.dist_ly));
  let sources = $derived(
    dataSourceItems(hole?.catalogue, (k) =>
      k === 'mass_solar'
        ? m.explore_bh_label_mass()
        : k === 'dist_ly'
          ? m.explore_bh_label_distance()
          : null,
    ),
  );

  // Big numbers in the reader's language ("4.3 million", "4,3 миллиона", "430万"), not the
  // browser's locale with an English word appended.
  function bigNum(n: number): string {
    return n >= 1e6
      ? new Intl.NumberFormat(getLocale(), {
          notation: 'compact',
          compactDisplay: 'long',
          maximumFractionDigits: 1,
        }).format(n)
      : n.toLocaleString(getLocale(), { maximumFractionDigits: 0 });
  }
  function dist(ly: number): string {
    return m.unit_ly_value({
      value:
        ly >= 1e6 ? bigNum(ly) : ly.toLocaleString(getLocale(), { maximumSignificantDigits: 3 }),
    });
  }
  let facts = $derived(
    hole
      ? [
          {
            label: m.explore_bh_label_mass(),
            value: bigNum(hole.mass_solar),
            unit: m.explore_bh_solar_masses(),
            accent: true,
            source: massSrc ?? undefined,
          },
          {
            label: m.explore_bh_label_distance(),
            value: dist(hole.dist_ly),
            source: distSrc ?? undefined,
          },
          ...(!real
            ? [
                {
                  label: m.explore_bh_label_spin(),
                  value: hole.spin.toLocaleString(getLocale(), { maximumFractionDigits: 2 }),
                },
              ]
            : []),
          { label: m.explore_bh_label_rs(), value: rs(hole.rs_km) },
        ]
      : [],
  );

  function rs(km: number): string {
    return `~${bigNum(km)} km`;
  }
</script>

<UniversePanelBody
  {open}
  {onClose}
  {covered}
  {title}
  entityId={hole?.id ?? ''}
  heroOf={hole ? { level: 'black-holes', id: hole.id } : undefined}
  kind={hole ? kindLabel : undefined}
  name={hole?.name}
  lead={hole ? [hole.discovery] : []}
  {facts}
  learn={hole ? { href: learnHref, label: m.explore_bh_learn_more() } : undefined}
>
  {#snippet actions()}
    {#if onSeeLensing}
      <Chip kind="action" onclick={onSeeLensing}>{m.explore_bh_see_lensing()}</Chip>
    {/if}
  {/snippet}
  {#snippet extra()}
    {#if hole}
      {#if real}<DataSources
          variant="panel"
          items={sources}
          links={recordLinks(hole.records)}
        />{/if}
      {@render children?.()}
    {/if}
  {/snippet}
  {#snippet science()}
    <!-- Where black-hole geometry leads next in the encyclopedia. -->
    <ScienceCard tab="observation" section="wormholes" />
  {/snippet}
</UniversePanelBody>
