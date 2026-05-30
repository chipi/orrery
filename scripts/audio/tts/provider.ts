// TtsProvider — pluggable text-to-speech provider abstraction (PRD-016 / RFC-019 §3).
// Swap providers via TTS_PROVIDER env var; mixed-provider corpus supported via voices.json.

// Persona + ProviderName literal unions are owned by src/lib/audio-types.ts
// so the runtime side (AudioOverlay) and build side (this file) share one
// definition. Add a new provider there — every consumer recompiles.
export type { Persona, ProviderName } from '../../../src/lib/audio-types';
import type { Persona, ProviderName } from '../../../src/lib/audio-types';

export interface TtsInput {
  ssml: string;
  voiceId: string;
  locale: string;
  persona: Persona;
}

export interface TtsOutput {
  audio: Buffer;
  captions: string;
  transcript: string;
  chars: number;
  cost_usd: number;
}

export interface TtsProvider {
  readonly name: ProviderName;
  generate(input: TtsInput): Promise<TtsOutput>;
}
