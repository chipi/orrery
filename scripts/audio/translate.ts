// Pipeline 1 (PRD-016 / RFC-019 §5.1) — Claude API SSML-safe translation.
// Reads content/episodes/en-US/{id}.md → writes content/episodes/{locale}/{id}.md.
// Stubbed in S1; full implementation in S2 (epic #146 / issue #152).

// Not-implemented stub. Exit code 2 (operator misuse) — not 1 (failure) —
// so an accidental `audio:translate && next` doesn't fail-stop pipelines.
console.log('audio:translate — not yet implemented in v0.7 (deferred to v0.8 / issue #152).');
console.log('When S2 lands, this will translate content/episodes/en-US/*.md → other 11 locales.');
process.exit(2);
