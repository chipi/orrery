// Full audio rebuild: Pipeline 1 (translate) → Pipeline 2 (generate) for every
// script under content/episodes/en-US/. Cache-key-aware (PRD-016 / RFC-019 §5.2).
// Stubbed in S1; lights up after S2 + S3.

// Not-implemented stub. S3 (audio:generate) is the operational entry point
// in v0.7 — chain that for individual episodes. audio:build will become
// the full-corpus rebuild orchestrator once S2 lands in v0.8.
console.log('audio:build — chains audio:translate (S2) + audio:generate (S3); not wired in v0.7.');
console.log(
  'For v0.7 en-US only, use audio:generate per episode. See docs/guides/audio-pipeline-setup.md.',
);
process.exit(2);
