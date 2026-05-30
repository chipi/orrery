// ElevenLabs Text-to-Speech provider (PRD-016 / RFC-019 §3 + §4).
// REST client — ElevenLabs returns audio/mpeg bytes directly, no JSON wrap.
// Auth via xi-api-key header sourced from ELEVENLABS_API_KEY env var.

import type { TtsInput, TtsOutput, TtsProvider, ProviderName } from './provider';

const ENDPOINT_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';

// ElevenLabs pricing (Pro tier baseline): $0.30 per 1k characters.
// Starter tier includes 10k chars/mo free; Creator tier 30k chars/mo.
// Our cost record uses the Pro rate for honest accounting on paid usage.
const USD_PER_CHAR = 0.3 / 1000;

interface ProviderOptions {
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export class ElevenLabsTtsProvider implements TtsProvider {
  readonly name: ProviderName = 'elevenlabs';
  private readonly apiKey: string;
  private readonly opts: Required<ProviderOptions>;

  constructor(apiKey: string, opts: ProviderOptions = {}) {
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not set; add it to .env');
    }
    this.apiKey = apiKey;
    this.opts = {
      modelId: opts.modelId ?? 'eleven_multilingual_v2',
      stability: opts.stability ?? 0.55,
      similarityBoost: opts.similarityBoost ?? 0.75,
      style: opts.style ?? 0.15,
      useSpeakerBoost: opts.useSpeakerBoost ?? true,
    };
  }

  async generate(input: TtsInput): Promise<TtsOutput> {
    // ElevenLabs accepts SSML inline within the text payload for the
    // multilingual_v2 model. <break> tags are honoured; <prosody> support
    // is partial — the model tends to interpret intent rather than apply
    // exact rate/pitch numbers. Sufficient for our editorial cadence;
    // exact prosody is a Google-TTS strength, ElevenLabs's is voice tone.
    const body = {
      text: input.ssml,
      model_id: this.opts.modelId,
      voice_settings: {
        stability: this.opts.stability,
        similarity_boost: this.opts.similarityBoost,
        style: this.opts.style,
        use_speaker_boost: this.opts.useSpeakerBoost,
      },
    };

    const res = await fetch(`${ENDPOINT_BASE}/${encodeURIComponent(input.voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `ElevenLabs request failed (${res.status} ${res.statusText}): ${text.slice(0, 500)}`,
      );
    }

    const audio = Buffer.from(await res.arrayBuffer());
    const transcript = stripSsml(input.ssml);
    const chars = transcript.length; // ElevenLabs bills on stripped text, not SSML tags.
    const cost_usd = chars * USD_PER_CHAR;
    const captions = buildApproxVtt(transcript, audio.byteLength);

    return { audio, captions, transcript, chars, cost_usd };
  }
}

function stripSsml(ssml: string): string {
  return ssml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildApproxVtt(transcript: string, audioBytes: number): string {
  // ElevenLabs MP3 default is 128 kbps ≈ 16 KB/sec.
  const durationSec = audioBytes / 16000;
  const sentences = (transcript.match(/[^.!?]+[.!?]+/g) ?? [transcript]).map((s) => s.trim());
  if (sentences.length === 0) return 'WEBVTT\n\n';
  const totalChars = sentences.reduce((a, s) => a + s.length, 0) || 1;

  let cursor = 0;
  let out = 'WEBVTT\n\n';
  for (const s of sentences) {
    if (!s) continue;
    const start = (cursor / totalChars) * durationSec;
    cursor += s.length;
    const end = (cursor / totalChars) * durationSec;
    out += `${fmtVttTime(start)} --> ${fmtVttTime(end)}\n${s}\n\n`;
  }
  return out;
}

function fmtVttTime(sec: number): string {
  const safe = Math.max(0, sec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = (safe % 60).toFixed(3);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.padStart(6, '0')}`;
}
