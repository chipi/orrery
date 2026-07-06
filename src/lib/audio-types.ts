// Single source of truth for audio system literal-union types.
// Both runtime (src/lib/*.svelte.ts, src/lib/data.ts, AudioOverlay,
// /credits page) and build-time (scripts/audio/tts/provider.ts,
// scripts/audio/provenance.ts) import from this file.
//
// Adding a new TTS provider, persona, or text-authorship case = edit
// one place. Previously these unions were declared in four files
// independently — bookkeeping cost grew linearly with the audio system.
//
// Pure types — no runes, no runtime code — so this file is safe to
// import from anywhere including Node-side tsx scripts.

export type Persona = 'curator' | 'guide' | 'enthusiast';

export type ProviderName = 'google' | 'elevenlabs' | 'openai' | 'azure' | 'coqui-local';

export type TextAuthorship =
  'claude-drafted' | 'claude-translated' | 'human-authored' | 'human-edited-claude-draft';
