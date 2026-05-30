// Google Cloud Text-to-Speech provider (PRD-016 / RFC-019 §3 + §4).
// REST client (no SDK) so a single API key in GOOGLE_TTS_API_KEY suffices —
// no service-account JSON required. Per Marko's setup choice 2026-05-29.

import type { TtsInput, TtsOutput, TtsProvider, ProviderName } from './provider';

const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Cloud TTS Neural2 / WaveNet pricing — $16 per 1M chars.
// Free tier: 1M chars/mo for the first 12 months. Studio voices are $160/1M.
const USD_PER_CHAR_NEURAL2 = 16 / 1_000_000;

export class GoogleTtsProvider implements TtsProvider {
  readonly name: ProviderName = 'google';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('GOOGLE_TTS_API_KEY is not set; add it to .env');
    }
    this.apiKey = apiKey;
  }

  async generate(input: TtsInput): Promise<TtsOutput> {
    const body = {
      input: { ssml: input.ssml },
      voice: {
        languageCode: input.locale,
        name: input.voiceId,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        sampleRateHertz: 24000,
      },
    };

    const res = await fetch(`${ENDPOINT}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Google TTS request failed (${res.status} ${res.statusText}): ${text.slice(0, 500)}`,
      );
    }

    const json = (await res.json()) as { audioContent?: string };
    if (!json.audioContent) {
      throw new Error('Google TTS response missing audioContent');
    }

    const audio = Buffer.from(json.audioContent, 'base64');
    const transcript = stripSsml(input.ssml);
    const chars = countBillableChars(input.ssml);
    const cost_usd = chars * USD_PER_CHAR_NEURAL2;
    const captions = buildApproxVtt(transcript, audio.byteLength);

    return { audio, captions, transcript, chars, cost_usd };
  }
}

// Strip SSML tags. The transcript and caption surface use plain text.
function stripSsml(ssml: string): string {
  return ssml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Google bills the SSML body inclusive of markup characters.
// Source: cloud.google.com/text-to-speech/pricing — "characters of SSML".
function countBillableChars(ssml: string): number {
  return ssml.length;
}

// First-ship caption track: split the stripped transcript on sentence
// boundaries and distribute time evenly by character count against the
// estimated MP3 duration (24 kHz / ~64 kbps ≈ 8 KB/sec). Approximate to
// within a sentence boundary. Precise timing is an S9 polish item that
// will use Google's <mark>-based SSML timepointing.
function buildApproxVtt(transcript: string, audioBytes: number): string {
  const durationSec = audioBytes / 8000;
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
