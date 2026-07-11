// Semantic feedback cues (PRD-017 decision I-B — "haptics confirm audio").
//
// One call site — `cue(kind)` — fires a short tone AND a haptic pulse together,
// each gated independently by whether that channel is active. This is the cross-
// platform core: desktop hears the tone; mobile also feels the tap. Callers stay
// declarative ("a selection happened") and never touch the audio/haptic engines.

import { sensory } from './state.svelte';
import { audioEngine, type BlipSpec } from './audio-engine';
import { pulse, type HapticKind } from './haptics';

export type Cue = 'select' | 'confirm' | 'threshold' | 'warning';

interface CueSpec {
  audio: BlipSpec;
  haptic: HapticKind;
}

// A small, musical vocabulary. Frequencies picked to read as intentional cues,
// not system beeps; kept quiet (gain ≤0.14) so they sit under narration + music.
const CUES: Record<Cue, CueSpec> = {
  // Object selected (planet / module / site / spacecraft / card).
  select: { audio: { freq: 660, type: 'sine', dur: 0.08, gain: 0.12 }, haptic: 'light' },
  // A process completed (solver, tour beat, arrival) — a rising two-note.
  confirm: {
    audio: { freq: [523.25, 783.99], type: 'sine', dur: 0.18, gain: 0.12 },
    haptic: 'success',
  },
  // A physical threshold crossed (orbit crossing, regime change).
  threshold: { audio: { freq: 440, type: 'triangle', dur: 0.12, gain: 0.13 }, haptic: 'medium' },
  // A warning (Δv budget, fuel) — low + rough.
  warning: { audio: { freq: 220, type: 'sawtooth', dur: 0.2, gain: 0.11 }, haptic: 'warning' },
};

/** Fire a semantic cue. Each channel plays only when active (master + wanted + capable). */
export function cue(kind: Cue): void {
  const spec = CUES[kind];
  if (sensory.active('audio')) audioEngine.blip(spec.audio);
  if (sensory.active('haptic')) pulse(spec.haptic);
}
