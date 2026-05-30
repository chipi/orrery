# Audio episode scripts (PRD-016 / RFC-019)

Source of truth for the v0.7 audio narration system. One markdown file per
episode. en-US is the source locale; Pipeline 1 (S2, issue #152) translates
to the other 11 locales; Pipeline 2 (S3 / S4) voices the locale files to
`.mp3` + `.vtt` + `.txt` via the `TtsProvider` selected by `TTS_PROVIDER`.

## File location

`content/episodes/{locale}/{episode-id}.md`

- `locale` — BCP-47 (`en-US`, `es-ES`, `fr-FR`, `de-DE`, …)
- `episode-id` — kebab-case, matches filename without `.md`, matches frontmatter `id`

## Frontmatter

```yaml
---
id: signal-delay              # must match filename
persona: enthusiast           # curator | guide | enthusiast
locale: en-US
route: /mars                  # which Orrery route this episode anchors to
context: curiosity            # optional sub-context (object id, screen segment)
title: 'Signal delay — light-time on Mars'
duration_target_sec: 95       # target spoken duration; used by cost projections
source_refs:                  # optional — for /credits attribution + fact-check
  - https://mars.nasa.gov/msl/mission/communications/
---
```

## Body — SSML

The body is SSML 1.1 wrapped in `<speak>`. Use:

- `<break time="500ms"/>` for pauses
- `<prosody rate="92%" pitch="-1st">…</prosody>` for Curator slow-and-deep delivery
- `<emphasis level="moderate|strong">…</emphasis>` for stress
- `<say-as interpret-as="characters|cardinal|unit">…</say-as>` for numbers + units

SSML tags must be preserved verbatim during translation (RFC-019 §8.4). Pipeline
1 validates SSML AST integrity before writing the target locale file.

## The three personas (RFC-019 §2.1)

| Persona    | Register                                                                      | Length sweet spot       |
| ---------- | ----------------------------------------------------------------------------- | ----------------------- |
| Curator    | Slow, weighty, Sagan-register. Mid-low pitch. Long pauses earned, not decorated. | 60–120 s segments       |
| Guide      | Conversational, warm, docent. Mid pitch. Builds to clarity.                   | 5–8 min screen episodes |
| Enthusiast | Brisk, specific, curious. Mid-high pitch. Numbers spoken with their unit.     | 90 s – 3 min            |

The persona is **implicit in the UI** — no badge, no label (PRD-016 §will-not-have).
The user just hears the right voice for the moment.

## The 8 Atmospheric Moves (RFC-019 §2.3)

Editorial anchors. Drafted first in en-US, reviewed before any other content,
used as voice-quality reference takes when curating per-locale voices.

| ID                       | Persona    | Route             | Move                                                            |
| ------------------------ | ---------- | ----------------- | --------------------------------------------------------------- |
| signal-delay             | enthusiast | /mars             | Light-time delay; "not slow, far"                               |
| porkchop                 | enthusiast | /fly              | Reading the C-shape contour as a year-by-year argument          |
| pale-blue-dot            | curator    | /                 | Voyager image, Sagan reading, restated for the Orrery viewer    |
| one-way-light-time       | enthusiast | /mars             | Why real-time rover control is a category error                 |
| capability-ladder-close  | curator    | (full tour close) | Apollo → Artemis → Mars; global agencies, not single nations    |
| cernan-last-words        | guide      | /moon             | Apollo 17; 50+ years since the last human footstep              |
| far-side                 | guide      | /moon             | No human has seen it directly; Chang'e 4 + Queqiao relay        |
| curiosity-persistence    | enthusiast | /mars             | Four cm/s across years, alone on a planet                       |

Filename convention: kebab-case, descriptive, no version numbers.

## Attribution (PRD-016 §transparency)

Every episode carries its origin on disk and on `/credits`. AI involvement is
disclosed by default — never obscured.

- **`text_authorship`** (frontmatter field, optional): one of `claude-drafted`,
  `claude-translated`, `human-authored`, `human-edited-claude-draft`. Defaults
  to `claude-drafted` for the v0.7 corpus (Claude Opus 4.7 first drafts pending
  human editorial review). Override per-script when a piece is genuinely
  human-authored.
- **`text_author_model`** (frontmatter field, optional): when the authorship
  references an LLM, the model identifier (e.g. `claude-opus-4-7`).
- **Voice attribution** (machine-derived at generation time): provider +
  `voice_id` + `tts_model` get written into `static/data/audio/audio-provenance.json`.

The `/credits` page surfaces a per-episode row showing text origin and voice
origin. The AudioOverlay footer surfaces a compact one-liner whenever it's open.
