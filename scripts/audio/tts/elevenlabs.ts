// ElevenLabs Text-to-Speech provider (PRD-016 / RFC-019 §3 + §4).
// REST client — ElevenLabs returns audio/mpeg bytes directly, no JSON wrap.
// Auth via xi-api-key header sourced from ELEVENLABS_API_KEY env var.
//
// Audio format (PRD-016 M6): explicit mp3_44100_96 — 44.1 kHz, 96 kbps mono.
// Matches the budget projection in PRD-016 §goal table (97 MB corpus).

import type { TtsInput, TtsOutput, TtsProvider, ProviderName } from './provider';
import { withRetry, type TransientError } from './retry';

const ENDPOINT_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
const OUTPUT_FORMAT = 'mp3_44100_96';

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

    const url = `${ENDPOINT_BASE}/${encodeURIComponent(input.voiceId)}?output_format=${OUTPUT_FORMAT}`;
    const res = await withRetry(async () => {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify(body),
      });
      if (r.ok) return r;
      const text = await r.text().catch(() => '');
      const err: TransientError = new Error(
        `ElevenLabs request failed (${r.status} ${r.statusText}): ${text.slice(0, 500)}`,
      );
      err.status = r.status;
      const retryAfter = r.headers.get('retry-after');
      if (retryAfter) {
        const asInt = Number.parseInt(retryAfter, 10);
        if (!Number.isNaN(asInt) && asInt > 0) err.retryAfterSec = asInt;
      }
      throw err;
    });

    const audio = Buffer.from(await res.arrayBuffer());
    const transcript = stripSsml(input.ssml);
    // ElevenLabs bills on stripped text, not SSML tags — billable_chars
    // == transcript.length on this provider. Google bills SSML so the
    // two diverge there; see google.ts.
    const chars = transcript.length;
    const billable_chars = chars;
    const cost_usd = billable_chars * USD_PER_CHAR;
    const captions = buildApproxVtt(transcript, audio.byteLength);

    return { audio, captions, transcript, chars, billable_chars, cost_usd };
  }
}

function stripSsml(ssml: string): string {
  return ssml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildApproxVtt(transcript: string, audioBytes: number): string {
  // mp3_44100_96 → 96 kbps ≈ 12 KB/sec.
  const durationSec = audioBytes / 12000;
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
