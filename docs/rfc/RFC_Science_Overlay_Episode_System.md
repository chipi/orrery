# RFC-07 · Science Overlay & Episode System
*May 2026 · Status: PROPOSED · Author: Orrery Core*

> **Why this is an RFC.** The choice of build-time TTS provider, audio-asset packaging, episode-script source format, and per-screen overlay component shape are architectural commitments that bind every future audio episode and every screen's player surface. They need to be debated and recorded before any audio file or player module ships. *(Placeholder gating sentence — content under review for second-pass refresh.)*

---

## Summary

Add a persistent **Science Overlay** to all six Orrery screens, exposing a pre-generated audio episode system that narrates every section of the product — screen by screen, object by object — in the voice of a virtual museum that also happens to be a podcast.

Three distinct AI-voiced personalities narrate at three levels of the product hierarchy. All audio is generated at build time and served as static files. Fully offline. Fully internationalised. Scripts are version-controlled markdown written by Claude Code from direct inspection of the source data and equations.

The editorial DNA is Carl Sagan's *Cosmos*, *Contact*, and *Interstellar*: science that earns its emotion, scale made personal, wonder downstream of understanding.

---

## Motivation

Orrery is already educationally rich. The TECHNICAL tab on every planet, the capability ladder, the 13-event CAPCOM ticker — the content is there. But a curious person sitting down with Orrery for the first time has no voice in their ear telling them *why this moment matters*.

A physics teacher knows that vis-viva velocity at perihelion is the thing to feel. A first-time user does not. The current product trusts the user to find that feeling themselves. Most won't.

Every great museum solves this with an audio guide. Every great science communicator — Sagan above all — solved it by standing next to you at the exhibit and saying: *look at this*. Not explaining. Pointing.

Orrery needs that voice. Three of them, actually, calibrated to three different levels of engagement. And it needs those voices in every language it supports, without the economics of human voice talent making multilingual a fantasy.

---

## Non-goals

- **Real-time TTS.** Synthesising audio on demand per-user introduces latency, requires runtime API keys, and prevents offline use. All audio is pre-generated.
- **Interactive voice Q&A.** Not a chatbot. Not a voice assistant. A narrated experience.
- **Continuous background music.** Ambient audio bed is explored in Phase 3. This RFC covers voice narration only.
- **User-recorded narration.** Community-contributed audio is a Phase 3 possibility. Phase 2 is editorial-controlled.

---

## Proposal

### The Science Overlay

A persistent UI layer, accessible on all six screens, that houses the episode system. Triggered by a microphone / waveform icon in the navigation bar — consistent across all screens.

When open, the Science Overlay slides up from the bottom (mobile) or in from the right (desktop), occupying roughly one-third of the screen without occluding the 3D view. It contains:

1. **Now playing** — current episode with waveform visualiser, progress bar, personality badge
2. **Screen episode** — the narrated tour for the current screen, auto-suggested
3. **Episode inventory** — browsable catalogue of all episodes, grouped by personality
4. **Autoplay queue** — optional curated playlist: "The Full Tour" (all episodes in narrative order, ~90 minutes)

### Three Personalities

The tension in the product is between museum authority and podcast warmth. Three named personalities hold different positions on that axis.

---

#### THE CURATOR
*Science Overlay navigation · Episode inventory introductions · The opening and closing of the full tour*

Voice of the institution. Thinks in decades and light-years. Speaks the way Carl Sagan spoke in *Cosmos* — not to you, but to humanity's curiosity on your behalf. Never condescending. Never hurrying. The numbers he cites were hard-won by centuries of human effort and he knows it.

**Tonal markers:**
- "We" as a species, never "you" as a user
- Geological and cosmic timescales feel natural, not overwhelming
- Silences are load-bearing
- The universe is not hostile — it is vast, and that is different

**Sample script fragment:**
> *"What you are about to hear is the story of how humanity learned to leave its world. It took sixty years, six hundred missions, twelve humans who walked on another surface, and one species that refused to stay home. We begin where every journey to Mars must begin — on the Moon."*

---

#### THE GUIDE
*Screen narration episodes — one per screen, 8–12 minutes*

Ellie Arroway in the radio telescope dish, explaining to her colleague why this particular signal matters. Personal investment in the science. Walks you through exactly what you're looking at, assumes you're intelligent, never assumes prior knowledge. The wonder is never performed — she finds it every time.

**Tonal markers:**
- Addresses what the user is *seeing*, not just the subject abstractly
- Equations introduced through what they *do*, not what they *are*
- The explanation builds toward a moment of clarity — the "oh" moment is designed
- Warmth, not enthusiasm — there's a difference

**Sample script fragment (Solar System Explorer):**
> *"Look at Mars right now. Watch how it moves relative to Earth — faster than you'd expect for something that far out. That's Kepler's second law, visible in real time. The closer a planet is to the Sun, the faster it has to move or gravity wins and it falls inward. Mars is running. Earth is walking. The gap between them — that changing geometry — is exactly why we can only leave for Mars every twenty-six months. You're not looking at a diagram. You're watching the launch window open and close."*

---

#### THE ENTHUSIAST
*Panel detail episodes — one per planet, mission, and landing site. 90 seconds–3 minutes.*

Cooper from *Interstellar* — the pilot who understands the equations AND feels the stakes. When he explains the transfer orbit, it isn't academic — it's the thing between him and the destination. The Enthusiast makes vis-viva feel visceral. Makes Mars 3's 14.5 seconds of transmission feel like a held breath. Makes Cernan's last words feel like they were spoken an hour ago.

**Tonal markers:**
- Equations are *tools*, not facts — he explains them the way you explain a wrench to someone who needs to fix something
- Specific numbers carry weight — never "a long time" when you can say "253 days"
- Emotion earned by precision, not by sentiment
- Present tense for historical moments at the critical beat

**Sample script fragment (Curiosity detail panel):**
> *"November 26, 2011. An Atlas V leaves Cape Canaveral carrying 899 kilograms of nuclear-powered rover — the most complex machine humanity has ever landed on another planet. The transit takes 253 days. When Curiosity hits the Martian atmosphere at 5.8 kilometres per second, NASA does something they've never done before: they lower it on a rocket-powered sky crane. Nobody has ever tried this. It either works or it doesn't. It works. Gale Crater. August 6, 2012, 05:17 UTC. Curiosity is still there. It has driven 31 kilometres. It has climbed 700 metres up Mount Sharp. It has confirmed that Mars once had conditions suitable for microbial life. That was twelve years ago. It is still working."*

---

### Episode Taxonomy

```
content/episodes/
│
├── curator/
│   ├── full-tour-intro.md          ← Opens "The Full Tour" playlist
│   ├── full-tour-outro.md          ← Closes the series
│   └── section-intros/
│       ├── moon.md                 ← "We begin on the Moon..."
│       ├── solar-system.md
│       ├── mission.md
│       └── library.md
│
├── guide/
│   ├── solar-system.md             ← P01 — 10 min
│   ├── configurator.md             ← P02 — 9 min
│   ├── arc.md                      ← P03 — 11 min
│   ├── library.md                  ← P04 — 8 min
│   ├── earth-orbit.md              ← P05 — 7 min
│   └── moon-map.md                 ← P06 — 10 min
│
└── enthusiast/
    ├── planets/
    │   ├── mercury.md
    │   ├── venus.md
    │   ├── earth.md
    │   ├── mars.md                 ← Priority 1
    │   ├── jupiter.md
    │   ├── saturn.md
    │   ├── uranus.md
    │   ├── neptune.md
    │   └── sun.md
    ├── missions/
    │   ├── mars/
    │   │   ├── curiosity.md        ← Priority 1
    │   │   ├── perseverance.md     ← Priority 1
    │   │   ├── mars-3.md           ← Priority 1 (the 14.5 seconds)
    │   │   ├── hope-probe.md
    │   │   ├── tianwen-1.md
    │   │   ├── viking-1.md
    │   │   ├── mars-express.md
    │   │   ├── maven.md
    │   │   ├── insight.md
    │   │   ├── mangalyaan.md
    │   │   └── mariner-4.md
    │   └── moon/
    │       ├── apollo-11.md        ← Priority 1
    │       ├── apollo-17.md        ← Priority 1 (Cernan's last words)
    │       ├── luna-9.md
    │       ├── lunokhod-1.md
    │       ├── chandrayaan-3.md
    │       ├── change-4.md
    │       ├── artemis-3.md
    │       └── slim.md
    └── moon-sites/
        ├── tranquility-base.md     ← Priority 1
        ├── taurus-littrow.md       ← Priority 1
        └── shackleton-rim.md
```

---

### The Sagan Atmospheric Moves

Specific moments in the existing product where the script must land with full weight. These are not decoration — they are the product's emotional architecture.

**The signal delay beat (P03 — Mission Arc)**
When the spacecraft crosses 1 light-minute from Earth, the Guide episode should pause on it. Not explain it — inhabit it. *"Your last message home left twelve minutes ago. They haven't heard it yet. Whatever you said is still travelling."*

**The porkchop plot reveal (P02 — Configurator)**
When the heatmap renders and the 2026 window emerges from the noise, the Guide episode has its Contact moment. *"There it is. October 2026. Not a suggestion — a law of orbital mechanics. The universe is telling you when to leave."*

**The pale blue dot (P03 — Arc, at ~60 light-seconds from Earth)**
Sagan's speech is copyrighted. But the *feeling* belongs to the moment. The Enthusiast writes his own version, in present tense, from inside the spacecraft.

**The 14.5 seconds (Mission Library — Mars 3)**
Mars 3 lands on Mars on December 2, 1971. It transmits for fourteen and a half seconds — a grey smear, possibly a dust storm — then silence, forever. The Enthusiast episode for Mars 3 should treat those 14.5 seconds the way *Interstellar* treats the docking sequence. Every second named.

**The capability ladder closing beat (P06 — Moon Map, full tour)**
Luna 9 to Artemis III. The Curator closes the Moon section of the full tour with the Dylan Thomas register: we did not go gently. We went with slide rules and vacuum tubes and we went anyway.

**Cernan's last words (Moon site — Taurus-Littrow)**
*"We leave as we came, and, God willing, as we shall return, with peace and hope for all mankind."* December 14, 1972. The Enthusiast episode ends in silence after quoting this. No commentary. Let it stand.

---

### Script Generation by Claude Code

Claude Code generates first-draft scripts by reading the source directly:

**What it reads:**
- `src/lib/orbital.js` — the actual equations and constants
- `data/planets.json` — orbital elements, real numbers per planet
- `data/missions/*.json` — mission records, descriptions, dates, data quality notes
- `05_Design_System.md` — what the user is actually seeing on screen
- This RFC — voice guidelines, atmospheric moves, personality specs

**What it produces:**
- Markdown scripts in `content/episodes/**/*.md`
- SSML markup embedded for equation pronunciation and pause timing
- A `metadata.json` per episode: personality, target screen, target object ID, estimated duration, equations referenced

**The human review gate:**
Scripts are generated, then committed as markdown for review before audio generation runs. This is non-negotiable. These scripts are the editorial voice of the product. They get a human eye. A bad script is worse than no script.

**The SSML equation pattern:**
```xml
<speak>
  The vis-viva equation governs your speed at every point of the journey.
  <break time="500ms"/>
  v — your velocity — equals the square root of mu,
  the Sun's gravitational pull on everything in the system,
  multiplied by the quantity: two over r,
  <emphasis level="strong">minus</emphasis> one over a.
  <break time="400ms"/>
  r is where you are. a is the shape of your orbit.
  Change one, the other compensates. The equation doesn't negotiate.
  <break time="700ms"/>
  At this moment — <say-as interpret-as="unit">1.26 AU</say-as>
  from the Sun — you are moving at
  <say-as interpret-as="unit">31.4 kilometres per second</say-as>.
  Faster than any human being in history.
  And you are coasting.
</speak>
```

---

### Internationalisation Strategy

**Phase 1 (English):** All episodes generated in English. Human-reviewed. Audio produced via Google Cloud TTS. Voice character per personality defined in Google TTS voice ID.

**Phase 2 (All supported locales):** Translation pipeline triggered by CI on English script changes:

```
English .md reviewed + merged
  → GitHub Action: Claude API translates to all Paraglide locales
  → Translated .md committed for lighter review (structure already approved)
  → Google Cloud TTS generates per-locale audio with locale-matched voice
  → public/audio/{locale}/{personality}/{id}.mp3
```

**Voice platform: Google Cloud TTS**

Chosen for:
- 40+ language neural voices — matches Paraglide-js locale coverage
- 1M WaveNet characters/month free — sufficient for build-time generation of all episodes across all locales
- SSML support — required for equation pronunciation
- Build-time only — zero runtime cost after generation
- No per-user API exposure

Voice IDs per personality (English baseline):
| Personality | Google TTS Voice | Character |
|---|---|---|
| The Curator | `en-US-Neural2-D` (male, measured) | Sagan register |
| The Guide | `en-US-Neural2-F` (female, warm) | Ellie Arroway |
| The Enthusiast | `en-US-Neural2-J` (male, energetic) | Cooper |

Voice IDs for other locales TBD per language — a native speaker review of the first generated episode per locale is required before full generation runs.

---

### The Full Tour Playlist

An optional curated sequence of all episodes in narrative order — approximately 90 minutes total. This is Orrery experienced as a documentary.

```
THE FULL TOUR — ~90 minutes

[CURATOR]  Introduction: Sixty Years to Mars          3 min
[CURATOR]  Part I: The Road Starts on the Moon        2 min

[GUIDE]    The Moon Map                              10 min
  [ENTHUSIAST] Luna 9 — First Soft Landing            2 min
  [ENTHUSIAST] Apollo 11 — Tranquility Base           3 min
  [ENTHUSIAST] Apollo 17 — Cernan's Last Words        2 min
  [ENTHUSIAST] Chandrayaan-3 — The South Pole         2 min
  [ENTHUSIAST] Chang'e 4 — The Far Side               2 min

[CURATOR]  Part II: The Solar System                  1 min

[GUIDE]    The Solar System Explorer                 10 min
  [ENTHUSIAST] Earth — The Departure Point            2 min
  [ENTHUSIAST] Mars — The Destination                 3 min

[CURATOR]  Part III: The Mission                      1 min

[GUIDE]    The Mission Configurator                   9 min
[GUIDE]    The Mission Arc                           11 min
  [ENTHUSIAST] The Pale Blue Dot Moment               2 min
  [ENTHUSIAST] Signal Delay — 12 Minutes              2 min

[CURATOR]  Part IV: The Record                        1 min

[GUIDE]    The Mission Library                        8 min
  [ENTHUSIAST] Mars 3 — 14.5 Seconds                  3 min
  [ENTHUSIAST] Curiosity — Still Working              2 min
  [ENTHUSIAST] Perseverance — Ingenuity               2 min

[CURATOR]  Closing: We Went Anyway                    3 min

TOTAL: ~88 minutes
```

---

## Audio Pipeline Architecture

Two pipelines, cleanly separated. Pipeline 1 owns content — it translates and validates scripts. Pipeline 2 owns audio — it consumes validated scripts and produces `.mp3` files. Neither does the other's job.

Both pipelines run identically locally and in GitHub Actions. The only difference is where secrets come from (`.env` locally, GitHub Secrets in CI) and where outputs land (local filesystem vs. committed artifacts).

```
PIPELINE 1                          PIPELINE 2
Content Translation & Validation    Audio Generation
────────────────────────────────    ──────────────────────────────
Input:  locale, script path(s)      Input:  locale, script path(s)
Output: translated .md files        Output: .mp3 files
        validation report                   generation manifest
────────────────────────────────    ──────────────────────────────
Runs:   locally or GH Actions       Runs:   locally or GH Actions
Needs:  ANTHROPIC_API_KEY           Needs:  GOOGLE_TTS_API_KEY
Does NOT touch audio                Does NOT translate anything
```

---

### Pipeline 1 · Content Translation & Validation

**Purpose:** Take a reviewed English script and produce a validated, SSML-safe translation in a target locale. Never produces audio. Never touches `public/audio/`.

**Invocation:**

```bash
# Locally — translate one script to one locale
./scripts/pipeline-translate.sh \
  --locale de \
  --script content/episodes/enthusiast/missions/mars/curiosity.md

# Locally — translate all scripts to one locale
./scripts/pipeline-translate.sh --locale ja --all

# Locally — translate all scripts to all supported locales
./scripts/pipeline-translate.sh --all-locales

# GitHub Actions — triggered by merge to main, any script change
# locale matrix: all supported locales in parallel
```

**Step-by-step:**

```
1. EXTRACT
   Split the .md script into segments:
   - Frontmatter (YAML) → preserved verbatim, not translated
   - SSML markup tags → extracted, replaced with placeholders {SSML_001}
   - Narrative text → the only thing translated

2. TRANSLATE
   Claude API call per script segment:
   - System: voice guidelines from content/voice-guidelines.md
             personality spec from RFC-07
             "preserve meaning, cadence, and emotional weight —
              not word-for-word. The pause before 14.5 seconds
              must feel as long in Japanese as in English."
   - User:   [extracted narrative text]
   - Model:  claude-sonnet-4-6

3. RECOMPOSE
   Reinsert SSML placeholders into translated text.
   Frontmatter: update locale field, preserve all other fields.
   Output: content/episodes/{locale}/enthusiast/missions/mars/curiosity.md

4. VALIDATE
   Four checks run automatically:

   a. SSML integrity
      Every {SSML_NNN} placeholder present in source
      must appear exactly once in output.
      Any mismatch → FAIL, block pipeline.

   b. Duration estimate
      Run Google TTS character count estimate.
      If estimated duration differs from source by > 20%,
      → WARN, do not block (translator may have found
        a more concise phrasing — that is acceptable)

   c. Equation presence
      All equation slugs listed in frontmatter `equations:`
      must appear in the translated text.
      Missing equation → FAIL, block pipeline.
      (Ensures "vis-viva" isn't silently omitted in translation)

   d. Factual numbers
      All numeric values present in source script
      (extracted via regex: digits + units) must
      appear unchanged in translated output.
      Numbers are never translated — "253 days" is
      "253 days" in every language.
      Mismatch → FAIL, block pipeline.

5. REPORT
   outputs/translation-report-{locale}-{timestamp}.json
   {
     "locale": "de",
     "scripts_processed": 12,
     "passed": 11,
     "failed": 1,
     "warnings": 2,
     "failures": [
       {
         "script": "curiosity.md",
         "check": "ssml_integrity",
         "detail": "placeholder {SSML_004} missing from output"
       }
     ]
   }
```

**SSML placeholder strategy — why it matters:**

SSML tags like `<break time="600ms"/>` and `<emphasis level="strong">` must survive translation unchanged. A translator (human or AI) who sees raw SSML might reword around it, move it, or drop it — breaking the equation pacing that makes the scripts work.

The placeholder approach makes this structurally impossible:

```
Source (en):
  The equation doesn't negotiate.
  <break time="700ms"/>
  At this moment —

After extraction:
  The equation doesn't negotiate.
  {SSML_003}
  At this moment —

Sent to Claude API for translation (de):
  Die Gleichung verhandelt nicht.
  {SSML_003}
  In diesem Moment —

Recomposed (de):
  Die Gleichung verhandelt nicht.
  <break time="700ms"/>
  In diesem Moment —
```

The 700ms silence lands in German exactly where it lands in English. The emotional architecture is preserved.

**Local developer workflow:**

```bash
# 1. Write or edit English script
vim content/episodes/enthusiast/planets/mars.md

# 2. Submit PR — human review gate (merged to main)

# 3. Translate to a specific locale to check quality
./scripts/pipeline-translate.sh --locale fr --script .../mars.md

# 4. Review generated .fr.md — edit if needed
# (Translation output is committed, version-controlled, reviewable)

# 5. When satisfied, run all locales
./scripts/pipeline-translate.sh --locale all --script .../mars.md
```

**GitHub Actions trigger:**

```yaml
# .github/workflows/translate.yml
on:
  push:
    paths: ['content/episodes/en/**/*.md']
    branches: [main]

jobs:
  translate:
    strategy:
      matrix:
        locale: [de, fr, ja, zh, es, pt, ko, it, nl, pl]
    steps:
      - run: ./scripts/pipeline-translate.sh
              --locale ${{ matrix.locale }}
              --changed-only   # only scripts modified in this commit
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - uses: peter-evans/create-pull-request@v6
        with:
          title: "i18n: auto-translate ${{ matrix.locale }} episode updates"
          branch: "i18n/auto-${{ matrix.locale }}-${{ github.sha }}"
```

Translations open as PRs, not direct commits. Light review before merge. The pipeline cannot silently corrupt a locale.

---

### Pipeline 2 · Audio Generation

**Purpose:** Take a validated script (English or translated) and produce a final `.mp3` file via Google Cloud TTS. Never translates. Never calls Claude API. Reads only from `content/episodes/`.

**Invocation:**

```bash
# Locally — generate audio for one script in one locale
./scripts/pipeline-audio.sh \
  --locale de \
  --script content/episodes/de/enthusiast/missions/mars/curiosity.md

# Locally — generate all audio for one locale
./scripts/pipeline-audio.sh --locale en --all

# Locally — generate all audio for all locales (expensive — full rebuild)
./scripts/pipeline-audio.sh --all-locales

# Check what would regenerate without generating (dry run)
./scripts/pipeline-audio.sh --locale en --all --dry-run

# GitHub Actions — triggered by merge of translation PRs
# or any change to content/episodes/**
```

**Step-by-step:**

```
1. HASH CHECK
   Compute SHA-256 of the .md source script.
   Compare against stored hash in
   .audio-cache/{locale}/{personality}/{id}.hash

   If hashes match → SKIP (audio is current, do not regenerate)
   If no hash file → GENERATE
   If hashes differ → REGENERATE

   This means: fixing a typo in one script regenerates
   only that script's audio. A full --all-locales run
   on an unchanged repo generates nothing.

2. SSML EXTRACTION
   Parse the .md script.
   Strip frontmatter.
   Strip markdown comment tags (<!-- -->).
   Output: clean SSML document wrapped in <speak> root.

3. VOICE SELECTION
   Look up voice ID from voice manifest:
   content/voices.json

   {
     "en": {
       "curator":    "en-US-Neural2-D",
       "guide":      "en-US-Neural2-F",
       "enthusiast": "en-US-Neural2-J"
     },
     "de": {
       "curator":    "de-DE-Neural2-B",
       "guide":      "de-DE-Neural2-C",
       "enthusiast": "de-DE-Neural2-D"
     },
     ...
   }

   voices.json is version-controlled and manually curated.
   Adding a locale requires: add voice IDs, generate one
   test episode, listen, approve, then run full locale.

4. TTS REQUEST
   Google Cloud TTS API call:
   {
     input: { ssml: [extracted SSML] },
     voice: {
       languageCode: [locale],
       name: [voice ID from voices.json]
     },
     audioConfig: {
       audioEncoding: "MP3",
       speakingRate: 0.95,   // slightly slower than default — Sagan paced, not rushed
       pitch: -1.0,          // slightly lower — authority register
       sampleRateHertz: 24000
     }
   }

5. OUTPUT
   Write .mp3 to: public/audio/{locale}/{personality}/{id}.mp3
   Write hash to: .audio-cache/{locale}/{personality}/{id}.hash
   Append to generation manifest:
   outputs/audio-manifest-{timestamp}.json

6. MANIFEST ENTRY
   {
     "locale": "de",
     "personality": "enthusiast",
     "id": "curiosity",
     "source_hash": "a3f2...",
     "output_path": "public/audio/de/enthusiast/missions/curiosity.mp3",
     "duration_seconds": 178,
     "file_size_bytes": 2840432,
     "generated_at": "2026-05-16T14:23:00Z",
     "voice_id": "de-DE-Neural2-D",
     "tts_chars_used": 4821   ← tracked for free tier monitoring
   }
```

**Free tier monitoring:**

Google Cloud TTS WaveNet: 1M chars/month free. The manifest accumulates `tts_chars_used` per run. A summary step at the end of each Actions run posts the month-to-date usage to the job summary. If projected monthly usage exceeds 800k chars (80% of free tier), the pipeline warns and halts non-priority generation.

```bash
# End of pipeline-audio.sh
month_chars=$(sum_manifest_chars_this_month)
if [ $month_chars -gt 800000 ]; then
  echo "⚠ WARNING: $month_chars / 1,000,000 WaveNet chars used this month"
  echo "Halting non-priority scripts. Run with --force to override."
  exit 1
fi
```

Priority scripts (defined in `content/priority-episodes.txt`) always generate regardless of quota. Non-priority scripts halt.

**Local developer workflow:**

```bash
# After translation PR is merged, generate audio locally to QA before CI runs
./scripts/pipeline-audio.sh --locale de --script .../curiosity.md

# Play it
afplay public/audio/de/enthusiast/missions/curiosity.mp3   # macOS
mpv    public/audio/de/enthusiast/missions/curiosity.mp3   # Linux

# If it sounds wrong — fix the translation script, re-run pipeline 1,
# then re-run pipeline 2. Hash mismatch → regeneration automatic.
```

**GitHub Actions trigger:**

```yaml
# .github/workflows/generate-audio.yml
on:
  push:
    paths: ['content/episodes/**/*.md']
    branches: [main]

jobs:
  generate:
    strategy:
      matrix:
        locale: [en, de, fr, ja, zh, es, pt, ko, it, nl, pl]
    steps:
      - run: ./scripts/pipeline-audio.sh
              --locale ${{ matrix.locale }}
              --changed-only
        env:
          GOOGLE_TTS_API_KEY: ${{ secrets.GOOGLE_TTS_API_KEY }}

      - name: Upload audio artifacts
        uses: actions/upload-artifact@v4
        with:
          name: audio-${{ matrix.locale }}
          path: public/audio/${{ matrix.locale }}/

      - name: Commit generated audio
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "audio: regenerate ${{ matrix.locale }} episodes"
          file_pattern: "public/audio/${{ matrix.locale }}/**/*.mp3
                         .audio-cache/${{ matrix.locale }}/**/*.hash"
```

Audio files are committed to the repo alongside the code. They are large but static — they do not change unless scripts change. Git LFS is recommended for the `public/audio/` directory.

**Git LFS configuration:**

```
# .gitattributes
public/audio/**/*.mp3 filter=lfs diff=lfs merge=lfs -text
```

---

### Pipeline Interaction — The Full Flow

```
                    ┌──────────────────────────────────────────┐
                    │           DEVELOPER WRITES               │
                    │   content/episodes/en/.../{id}.md        │
                    └────────────────┬─────────────────────────┘
                                     │ PR + human review
                                     ▼
                    ┌──────────────────────────────────────────┐
                    │              MERGE TO MAIN               │
                    └──────┬───────────────────────────────────┘
                           │
              ┌────────────┴──────────────┐
              │                           │
              ▼                           ▼
   PIPELINE 1 triggers               PIPELINE 2 triggers
   (path: content/episodes/en/)      (path: content/episodes/en/)
              │                           │
              │  translates to            │  generates en audio
              │  all locales              │  from changed scripts
              │  opens PRs               │
              ▼                           ▼
   i18n PRs reviewed              public/audio/en/.../{id}.mp3
   + merged                       committed to main
              │
              ▼
   PIPELINE 1 merged
   content/episodes/{locale}/
              │
              ▼
   PIPELINE 2 triggers
   (path: content/episodes/{locale}/)
              │
              ▼
   public/audio/{locale}/.../{id}.mp3
   committed to main
```

English audio and translated audio follow the same Pipeline 2 path. The only difference is locale. The pipeline does not know or care whether its input is English or translated — it reads the script, checks the hash, calls TTS, writes the file.

---



1. **Ambient audio bed.** Should episodes play over generative space ambience, silence, or a minimal licensed music bed? This affects the emotional register significantly. Recommend silence for Phase 2, ambient for Phase 3.

2. **Waveform visualiser.** The "Now Playing" UI needs a waveform animation. Pure CSS animated bars vs. Web Audio API real-time analysis. Real-time is more alive but adds JS complexity.

3. **Context sensitivity.** Should the panel play button auto-pause a running screen episode, or allow both? Recommend: auto-pause with resume on panel close.

4. **Voice identity.** The personality names (Curator, Guide, Enthusiast) are internal labels. Do they surface to the user, or does the user just experience the voice change as natural to the context?

5. **Script attribution.** Claude Code generates first drafts. Human edits happen. What is the credit model in the product?

---

## Consequences

**If accepted:**
- New Phase 2 implementation slice added: `SLICE-07 Science Overlay & Episode System`
- ADR required: TTS platform choice (Google Cloud TTS vs. alternatives)
- ADR required: script generation pipeline (Claude Code + human review gate)
- PRD-07 drafted: full feature specification
- UXS-07 drafted: Science Overlay interaction design

**If rejected:**
- Science Overlay does not ship in Phase 2
- No audio episodes
- The product remains visually rich but silent

---

*RFC-07 · Science Overlay & Episode System · May 2026 · PROPOSED*
