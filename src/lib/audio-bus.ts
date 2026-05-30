// Audio bus contract (PRD-016 / RFC-019 S10; consumed by PRD-017 / RFC-020 §4).
// Narration emits play/pause/ended events on a shared EventTarget.
// Sensory layer (v1.x, RFC-020 §4) listens and ducks sonification under narration.
// No direct dependency between modules — the bus is the contract.

import type { Episode } from './audio-state.svelte';

export type AudioBusEventType = 'play' | 'pause' | 'ended';

export interface AudioBusEventDetail {
  episode: Episode | null;
}

class AudioBus extends EventTarget {
  emit(type: AudioBusEventType, detail: AudioBusEventDetail): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  on(
    type: AudioBusEventType,
    handler: (event: CustomEvent<AudioBusEventDetail>) => void,
  ): () => void {
    const wrapped = handler as EventListener;
    this.addEventListener(type, wrapped);
    return () => this.removeEventListener(type, wrapped);
  }
}

export const audioBus = new AudioBus();
