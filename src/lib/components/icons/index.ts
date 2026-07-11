/**
 * Orrery icon set — every original hand-drawn inline-SVG glyph in one place.
 *
 * Each icon is a small Svelte component that draws with `currentColor` and
 * takes a `size` (plus state/variant props where relevant). The live UI
 * (Nav, ConicSectionPanel, ScienceChip, mission/fleet panels, …) imports
 * from here so there's a single source of truth, and the /dev/ui style
 * guide + /colophon icon grid render the whole set from `ICON_SHOWCASE`.
 */
import type { Component } from 'svelte';
import MenuIcon from './MenuIcon.svelte';
import AudioWaveIcon from './AudioWaveIcon.svelte';
import ScienceLensIcon from './ScienceLensIcon.svelte';
import SettingsGearIcon from './SettingsGearIcon.svelte';
import FullscreenIcon from './FullscreenIcon.svelte';
import ConicIcon from './ConicIcon.svelte';
import InfoChipIcon from './InfoChipIcon.svelte';
import VehicleIcon from './VehicleIcon.svelte';
import SpacecraftIcon from './SpacecraftIcon.svelte';
import TrajectoryArrowIcon from './TrajectoryArrowIcon.svelte';
import MissionOrbitIcon from './MissionOrbitIcon.svelte';
import ShareIcon from './ShareIcon.svelte';
import SensoryIcon from './SensoryIcon.svelte';

export {
  MenuIcon,
  AudioWaveIcon,
  ScienceLensIcon,
  SettingsGearIcon,
  FullscreenIcon,
  ConicIcon,
  InfoChipIcon,
  VehicleIcon,
  SpacecraftIcon,
  TrajectoryArrowIcon,
  MissionOrbitIcon,
  ShareIcon,
  SensoryIcon,
};

/** One entry per icon for the style guide + colophon grid. `variants`
 *  renders the icon in each meaningful state (off/on, the 4 conics). */
export type IconShowcaseEntry = {
  id: string;
  label: string;
  what: string;
  where: string;
  route: string;
  component: Component<Record<string, unknown>>;
  variants?: Array<{ label?: string; props: Record<string, unknown> }>;
};

export const ICON_SHOWCASE: IconShowcaseEntry[] = [
  {
    id: 'menu',
    label: 'Menu toggle',
    what: 'Three-bar hamburger that folds into a close-X when the drawer is open.',
    where: 'Nav (mobile)',
    route: '/',
    component: MenuIcon as Component<Record<string, unknown>>,
    variants: [
      { label: 'closed', props: { open: false, size: 24 } },
      { label: 'open', props: { open: true, size: 24 } },
    ],
  },
  {
    id: 'audio-wave',
    label: 'Audio-tour waveform',
    what: 'The “〜” mark that opens the guided audio tour; pulses while playing.',
    where: 'Nav · Home CTA',
    route: '/',
    component: AudioWaveIcon as Component<Record<string, unknown>>,
    variants: [{ props: { size: 24 } }],
  },
  {
    id: 'science-lens',
    label: 'Science lens',
    what: 'Outer ring with a centre dot (off) or a crosshair (on) — toggles the lens.',
    where: 'Nav',
    route: '/explore',
    component: ScienceLensIcon as Component<Record<string, unknown>>,
    variants: [
      { label: 'off', props: { active: false, size: 24 } },
      { label: 'on', props: { active: true, size: 24 } },
    ],
  },
  {
    id: 'settings-gear',
    label: 'Graphics settings',
    what: 'Eight-spoke gear for the quality / graphics settings panel.',
    where: 'Nav',
    route: '/explore',
    component: SettingsGearIcon as Component<Record<string, unknown>>,
    variants: [{ props: { size: 24 } }],
  },
  {
    id: 'fullscreen',
    label: 'Fullscreen toggle',
    what: 'Corner brackets pointing out (enter) or in (exit) for panorama fullscreen.',
    where: 'Moon · Mars panoramas',
    route: '/moon',
    component: FullscreenIcon as Component<Record<string, unknown>>,
    variants: [
      { label: 'enter', props: { active: false, size: 24 } },
      { label: 'exit', props: { active: true, size: 24 } },
    ],
  },
  {
    id: 'conic',
    label: 'Conic-section icons',
    what: 'Circle / ellipse / parabola / hyperbola glyphs for the orbit overlay.',
    where: 'Fly orbit lens',
    route: '/fly',
    component: ConicIcon as Component<Record<string, unknown>>,
    variants: [
      { label: 'circle', props: { shape: 'circle', size: 40 } },
      { label: 'ellipse', props: { shape: 'ellipse', size: 40 } },
      { label: 'parabola', props: { shape: 'parabola', size: 40 } },
      { label: 'hyperbola', props: { shape: 'hyperbola', size: 40 } },
    ],
  },
  {
    id: 'info-chip',
    label: 'Science info-chip',
    what: 'Geometric “i” glyph linking any figure to its /science explainer.',
    where: 'Throughout',
    route: '/science',
    component: InfoChipIcon as Component<Record<string, unknown>>,
    variants: [{ props: { size: 22 } }],
  },
  {
    id: 'vehicle',
    label: 'Launch vehicle',
    what: 'Rocket with payload cone, landing legs, and a porthole.',
    where: 'Mission panel',
    route: '/missions',
    component: VehicleIcon as Component<Record<string, unknown>>,
    variants: [{ props: { size: 26 } }],
  },
  {
    id: 'spacecraft',
    label: 'Spacecraft / payload',
    what: 'Central bus with solar panels, antenna boom, and orientation marker.',
    where: 'Mission panel',
    route: '/fleet',
    component: SpacecraftIcon as Component<Record<string, unknown>>,
    variants: [{ props: { size: 26 } }],
  },
  {
    id: 'trajectory-arrow',
    label: 'Trajectory arrow',
    what: 'Arcing flight path with an arrowhead — the “fly this” / transfer CTA.',
    where: 'Mission panel · Plan',
    route: '/plan',
    component: TrajectoryArrowIcon as Component<Record<string, unknown>>,
    variants: [{ props: { size: 26 } }],
  },
  {
    id: 'mission-orbit',
    label: 'Mission glyph',
    what: 'Orbit ring with an arcing path and a marker dot — fleet mission links.',
    where: 'Fleet entry panel',
    route: '/fleet',
    component: MissionOrbitIcon as Component<Record<string, unknown>>,
    variants: [{ props: { size: 26 } }],
  },
  {
    id: 'share',
    label: 'Share',
    what: 'Square + up-arrow — shares the current view (native sheet / copy link).',
    where: 'Nav',
    route: '/',
    component: ShareIcon as Component<Record<string, unknown>>,
    variants: [{ props: { size: 24 } }],
  },
  {
    id: 'sensory',
    label: 'Sensory layer',
    what: 'Compass needle crossed by a waveform — opens the sensory (sound / vibration / tilt) settings.',
    where: 'Nav',
    route: '/',
    component: SensoryIcon as Component<Record<string, unknown>>,
    variants: [{ props: { size: 24 } }],
  },
];
