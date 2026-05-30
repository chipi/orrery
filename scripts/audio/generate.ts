// Pipeline 2 (PRD-016 / RFC-019 §5.1) — TtsProvider audio generation.
// Reads content/episodes/{locale}/{id}.md → writes
//   static/audio/{locale}/{persona}/{id}.{hash8}.mp3 + .vtt + .txt
// via the TtsProvider selected by TTS_PROVIDER env var.
// Stubbed in S1; full implementation in S3 (Google Cloud TTS, issue #219) + S4 (ElevenLabs, issue #153).

console.error('audio:generate — not yet implemented (S3 / issue #219).');
process.exit(1);
