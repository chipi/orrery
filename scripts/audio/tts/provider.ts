// TtsProvider — pluggable text-to-speech provider abstraction (PRD-016 / RFC-019 §3).
// Swap providers via TTS_PROVIDER env var; mixed-provider corpus supported via voices.json.

export type Persona = 'curator' | 'guide' | 'enthusiast';
export type ProviderName = 'google' | 'elevenlabs' | 'openai' | 'azure' | 'coqui-local';

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
