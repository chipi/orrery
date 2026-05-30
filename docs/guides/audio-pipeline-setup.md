# Audio pipeline — operator setup guide

*PRD-016 / RFC-019 · v0.7 audio narration system*

This guide is the operator-side companion to PRD-016 and RFC-019. It documents
how a contributor (you, or anyone returning to this codebase later) sets up
the API keys, runs the pipeline, edits scripts, swaps voices, and tunes the
Curator Full Tour without re-reading the entire design docs.

---

## 1 · What the pipeline does

```
content/episodes/{locale}/{id}.md   ← human-written markdown + SSML, source of truth
    │
    ▼
Pipeline 2 — TTS generation  (npm run audio:generate)
    │
    ▼
static/audio/{locale}/{persona}/{id}.{hash8}.{mp3|vtt|txt}   ← committed to repo
    │
    │  + static/data/audio/audio-provenance.json   (what was generated, by whom)
    │  + static/data/audio/cost-ledger.json        (running $ spend per provider)
    │
    ▼
Runtime AudioOverlay (src/lib/components/AudioOverlay.svelte) loads the
provenance manifest, groups by episode, presents a per-route inventory
+ a 21-episode Curator Full Tour playlist.
```

Pipeline 1 (translation, S2 / `npm run audio:translate`) is wired but stubbed
pending the v0.7.x or v0.8 i18n phase. v0.7 ships en-US only.

---

## 2 · API keys + auth

All keys live in `.env` at the repo root. Copy from `.env.example` if you're
starting fresh.

### Anthropic — `ANTHROPIC_API_KEY=sk-ant-…`

Used by Pipeline 1 (translation) — `npm run images:score` already uses the
same key. Get one at https://console.anthropic.com/settings/keys. **NOT**
covered by Claude Code subscriptions; this is the paid Anthropic API.

### Google Cloud Text-to-Speech — `GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to.json`

Cloud TTS rejects API-key auth for server-side use (returns 401). You need
either:

- **Service-account JSON** (clean for CI):
  1. GCP Console → IAM & Admin → Service Accounts → Create
  2. Role: `Cloud Text-to-Speech User` (`roles/texttospeech.user`)
  3. Keys tab → Add Key → Create new key → JSON → download
  4. Move to a stable path (e.g. `~/.gcp/orrery-tts-sa.json`)
  5. Set `GOOGLE_APPLICATION_CREDENTIALS=` to that absolute path in `.env`

- **Application Default Credentials** (fastest for local dev):
  ```bash
  brew install --cask google-cloud-sdk
  gcloud auth application-default login
  gcloud auth application-default set-quota-project <your-project-id>
  ```
  Then point `GOOGLE_APPLICATION_CREDENTIALS=` at the ADC file. Path varies
  by platform:
  - macOS / Linux: `~/.config/gcloud/application_default_credentials.json`
  - Windows: `%APPDATA%\gcloud\application_default_credentials.json`

**The Cloud Text-to-Speech API must be enabled on the GCP project** — Console →
APIs & Services → Library → "Cloud Text-to-Speech API" → Enable. **DO NOT
confuse with "Speech-to-Text"** — those are different products.

Free tier: 1 M chars/mo Neural2/WaveNet for the first 12 months. The entire
en-US v0.7 corpus (~70K chars) sits well inside it.

### ElevenLabs — `ELEVENLABS_API_KEY=sk_…`

Get a key at https://elevenlabs.io/app/settings/api-keys (newer UI: profile
avatar → Settings → API Keys → Create).

ElevenLabs bills in **credits**, not characters (1 credit ≈ 1 char for standard
v2 models; 2 credits/char for some flash-tier models). Starter free tier:
10K credits/mo — covers the 8 Atmospheric Moves anchors and not much else.
Creator tier ($22/mo, 100K credits/mo) covers the entire v0.7 en-US corpus
(~65K credits used) with comfortable headroom for voice tuning and re-runs.

---

## 3 · Authoring scripts

One markdown file per episode at `content/episodes/{locale}/{id}.md`.
en-US is the source locale.

### Frontmatter

```yaml
---
id: signal-delay              # must match filename (kebab-case)
persona: enthusiast           # curator | guide | enthusiast
locale: en-US
route: /mars                  # which Orrery route this anchors to
context: curiosity            # optional sub-context (e.g. tour-open, apollo-17)
title: 'Signal delay — light-time on Mars'
duration_target_sec: 110      # authoring target; surfaced in inventory display
---
```

Optional advanced fields:
- `text_authorship`: override the default `claude-drafted` if you wrote the
  script by hand. Set to `human-authored` for full-credit; `human-edited-claude-draft`
  if Claude wrote the first pass and you reworked.
- `text_author_model`: when AI-involved, the model id (e.g. `claude-opus-4-7`).

### SSML body

Wrap the body in `<speak>`. Subset that works reliably across both providers:

- `<break time="600ms"/>` — explicit pauses. Both providers honour these.
- `<prosody rate="90%" pitch="-1st">…</prosody>` — Google honours numeric
  values exactly; ElevenLabs interprets intent (slightly slow, slightly low).
- `<emphasis level="moderate|strong">…</emphasis>` — both providers, varying
  effect.
- `<say-as interpret-as="characters|cardinal|unit">…</say-as>` — Google strong;
  ElevenLabs spotty.

For the editorial register, **break tags are your most reliable tool**.
Aggressive break usage shapes pacing; both providers respect them.

### Persona register

| Persona | Voice register | Length sweet spot |
|---|---|---|
| Curator | Slow, weighty, Sagan-grade. Long pauses earned. | 60–120 s |
| Guide | Conversational, warm, docent. Mid pitch. | 5–8 min (screen episodes) |
| Enthusiast | Brisk, specific, units spoken with numbers. | 90 s – 3 min |

The persona is implicit in the UI — no badge, no label. The user just hears
the right voice for the moment.

---

## 4 · Generation commands

### Single episode

```bash
npm run audio:generate -- --episode pale-blue-dot
npm run audio:generate -- --episode pale-blue-dot --provider elevenlabs
npm run audio:generate -- --episode pale-blue-dot --locale en-US  # explicit
```

Default provider is `google` (set via `TTS_PROVIDER` env var or
`--provider` CLI flag).

### Batch

```bash
for ep in pale-blue-dot signal-delay porkchop; do
  npm run audio:generate -- --episode "$ep" --provider google
  npm run audio:generate -- --episode "$ep" --provider elevenlabs
done
```

### Cost check anytime

```bash
npm run audio:check-cost
```

Prints the current month's per-provider totals; exits non-zero if the
`$200/mo` hard threshold is breached (CI gate).

### Cache behaviour

Output filenames are content-addressed: `{episode-id}.{hash8}.{ext}` where
`hash = SHA-256(provider:voiceId:ssml).slice(0,8)`. Re-running with the same
script + same voice = cache-hit, no API call, $0. Re-running with a different
provider, voice ID, or even one whitespace change = new hash, new generation.

---

## 5 · Voice tuning

All voice IDs live in `static/data/audio/voices.json`:

```jsonc
{
  "providers": {
    "google": {
      "en-US": {
        "curator":    { "voiceId": "en-US-Neural2-J", "model": "neural2" },
        "guide":      { "voiceId": "en-US-Neural2-F", "model": "neural2" },
        "enthusiast": { "voiceId": "en-US-Neural2-D", "model": "neural2" }
      }
    },
    "elevenlabs": {
      "en-US": {
        "curator":    { "voiceId": "pNInz6obpgDQGcFmaJgB", "model": "eleven_multilingual_v2" },
        "guide":      { "voiceId": "EXAVITQu4vr4xnSDxMaL", "model": "eleven_multilingual_v2" },
        "enthusiast": { "voiceId": "ErXwobaYiN019PkySvjV", "model": "eleven_multilingual_v2" }
      }
    }
  }
}
```

Browse the ElevenLabs library at https://elevenlabs.io/app/voice-library.
Copy any voice ID, paste into `voices.json`, re-run generation for the
affected persona's episodes. Cache busts automatically on voice ID change.

Google Neural2/Studio voices: search at https://cloud.google.com/text-to-speech/docs/voices.

---

## 6 · Tour + stage hooks

**Single declarative file**: `src/lib/audio-tour.ts`. Two exports:

- `CURATOR_FULL_TOUR: string[]` — ordered episode ids. Shuffle to change the
  listen-through order. Currently 21 episodes, ~66 minutes (sum of
  `duration_target_sec` across the tour rows of `audio-provenance.json`).
- `EPISODE_STAGES: Record<episode_id, AudioStage[]>` — time-coded UI hooks
  that fire during playback. Five actions:
  - `cue` — text banner inside the overlay (no DOM hook needed; works on
    every route including 3D canvases). `target` is the message text.
  - `flash` — gold-pulse box-shadow on a DOM element. `target` is a CSS selector.
  - `scroll-to` — smooth-scroll element into view.
  - `click` / `open-tab` — programmatic click (open panels, pick planets).

For `flash`/`click`/`scroll-to`, the route page needs a stable selector hook.
Convention: `data-audio-stage="<name>"` attribute on the target element.

Stages fire once per episode play, reset on episode change.

---

## 7 · Cost guards

Soft threshold `$50/mo` (warning), hard threshold `$200/mo` (halt). Both are
enforced in two places:

- `scripts/audio/cost-ledger.ts` — `assertUnderHardCap()` throws inside the
  pipeline before any TTS call dispatches.
- `npm run audio:check-cost` — CI / operator gate. Reads
  `static/data/audio/cost-ledger.json`, prints monthly totals, exits non-zero
  on hard breach.

The ledger commits as part of the repo so the running total is reproducible.

---

## 8 · Troubleshooting

**Google TTS returns 401 UNAUTHENTICATED.**
The endpoint doesn't accept API keys. Use a service-account JSON or
Application Default Credentials via gcloud. See §2.

**Google TTS returns 7 PERMISSION_DENIED about quota project.**
ADC is missing a quota project. Run:
```bash
gcloud auth application-default set-quota-project <your-project-id>
```

**Google TTS returns 403 + "API has not been used" or similar.**
Cloud Text-to-Speech API isn't enabled on the GCP project. Enable it at
https://console.cloud.google.com/apis/library/texttospeech.googleapis.com.

**ElevenLabs returns 401 quota_exceeded.**
You hit your monthly char budget. Upgrade tier, wait for next month's
quota reset, or switch the affected episodes to Google.

**Audio plays in browser DevTools but not in the overlay.**
Check that `static/data/audio/audio-provenance.json` has a row for the
episode. The runtime registry reads from this file; without an entry,
the episode doesn't appear in the inventory.

**Tour starts with fewer episodes than expected.**
The filter happens **once at `startTour()`** (`AudioOverlay.svelte`) — the
runtime keeps only `CURATOR_FULL_TOUR` ids that resolve in
`audio-provenance.json`. There is no mid-play skipping; once the tour is
running, it plays its filtered list to the end. Missing ids stay missing
until you regenerate the affected episodes.

**Captions appear too early/late.**
VTT timing is sentence-level approximate (character-distribution against
estimated MP3 duration). Precise sync needs `<mark>`-based SSML
timepointing — bigger provider-impl change, deferred for v0.7.x.

---

## 9 · CI considerations

`validate-data` enforces:
- Every `audio-provenance.json` entry validates against the schema (route,
  text_authorship, paths, etc.).
- `cost-ledger.json` validates (no malformed entries, monthly_totals
  reconcile).

`npm run audio:check-cost` is **not** in the default `validate-data` chain
— add it to your CI workflow if you want the $200/mo hard cap enforced on
every push.

For GitHub Actions, the same `GOOGLE_APPLICATION_CREDENTIALS` + service-account
JSON path works; just write the SA JSON to a temp file via a workflow secret
and point the env var at it.

---

*Last updated 2026-05-29 with the v0.7 audio ship · keep in sync with
PRD-016, RFC-019, and the actual code as the system evolves.*
