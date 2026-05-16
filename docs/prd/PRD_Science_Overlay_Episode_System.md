# PRD-07 · Science Overlay & Episode System
*May 2026 · Status: DRAFT · Depends on: RFC-07*

> **Why this is a PRD.** Adding a persistent narrated audio layer across every Orrery screen — with three voiced personalities, build-time TTS generation, and i18n parity across 12 locales — touches the editorial product, the build pipeline, the asset budget, and every screen's UI surface. It needs a product gate before any audio asset or playback component lands. *(Placeholder gating sentence — content under review for second-pass refresh.)*

---

## Overview

The Science Overlay is a persistent audio episode system layered across all six Orrery screens. It delivers narrated content at three levels — screen, object, full tour — through three distinct AI-voiced personalities, all generated at build time and served as static audio files.

**The experience goal:** A first-time user opens Orrery, presses play on the Solar System episode, and spends 10 minutes watching planets move while a voice explains orbital mechanics the way Carl Sagan would have explained them — with scale, with wonder, with the specific numbers that make the wonder real.

**What it is not:** Real-time TTS. A chatbot. Background music. A feature bolted onto existing screens. It is the editorial layer the product has been missing.

---

## User Stories

**US-1 · Screen narration**
*As a curious first-time user, I want to press play and hear someone explain what I'm looking at on this screen, so I understand what I'm seeing before I start clicking things.*

Acceptance: Every screen has a Guide episode. Play button visible in Science Overlay when overlay is open. Episode references objects visible on the current screen. Duration 8–12 minutes.

**US-2 · Object narration**
*As a user who has clicked on Mars, I want to hear a short episode specifically about Mars, so I can listen and look at the same time without reading.*

Acceptance: Every planet, mission, and Moon landing site has an Enthusiast episode. Small ▶ button visible in the detail panel header. Tapping it opens Science Overlay and begins playback. Duration 90 seconds–3 minutes.

**US-3 · Full tour**
*As a user who wants the full Orrery experience, I want to play a curated sequence of all episodes in narrative order, so I can experience the product as a coherent 90-minute documentary.*

Acceptance: "The Full Tour" playlist available in episode inventory. Autoadvances through all episodes in canonical order. Progress persists across sessions (localStorage). Approximately 88 minutes total.

**US-4 · Episode inventory**
*As a returning user, I want to browse all available episodes and jump to any one, so I can revisit specific content without replaying things I've already heard.*

Acceptance: Episode inventory view within Science Overlay shows all episodes grouped by personality and screen/object. Episodes marked as heard. Jumpable from inventory to any episode.

**US-5 · Language**
*As a user whose primary language is not English, I want to hear episodes in my language with a native-quality voice, so the narration is as natural as the written translation.*

Acceptance: All episodes generated in all supported Paraglide-js locales. Voice per locale is Google Cloud TTS neural voice, locale-matched. Language follows app locale setting automatically.

**US-6 · Offline playback**
*As a self-hosted user running Docker Compose without internet access, I want episodes to play, so the audio feature works the same as the rest of the product.*

Acceptance: All audio served from `public/audio/` alongside the app bundle. Zero runtime API calls during playback. NASA Images API degradation does not affect audio.

---

## Functional Specification

### F-01 · Science Overlay UI

**Trigger:** Waveform icon (`〜`) in the navigation bar, consistent position across all six screens. Icon is Space Mono character or SVG, 20px, at `rgba(255,255,255,0.55)` at rest, `#4ecdc4` when episode is playing.

**States:**
- **Closed:** Icon visible in nav. No overlay visible. Playing state continues if episode was running (background play).
- **Open — Now Playing:** Overlay visible showing current episode controls, waveform visualiser, progress.
- **Open — Inventory:** Overlay scrollable list of all episodes grouped by personality.

**Layout (desktop):** Right-side panel, same dimensions as detail panel (314px wide). Appears above the detail panel in z-order. Does not occlude the 3D viewport.

**Layout (mobile):** Bottom sheet, 60% screen height, draggable to dismiss.

**Overlay background:** `rgba(4, 4, 12, 0.97)` with `backdrop-filter: blur(18px)`. Border-left `rgba(255,255,255,0.07)`. Identical to detail panel treatment.

---

### F-02 · Now Playing view

```
┌─────────────────────────────────────┐
│  [●] THE ENTHUSIAST                 │  ← personality badge
│                                     │
│  MARS                               │  ← Bebas Neue 32px
│  The Red Planet                     │  ← Space Mono 9px dim
│                                     │
│  ▂▃▅▇▅▃▂▁▂▄▆▇▆▄▂▁▃▅▇▅▃▂          │  ← waveform visualiser
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━          │  ← progress bar
│  1:24                          2:58 │  ← elapsed / total
│                                     │
│  [⟨⟨]  [  ▶▶  ]  [⟩⟩]           │  ← prev / play-pause / next
│                                     │
│  0.5×  1×  1.5×  2×               │  ← speed control
│                                     │
│  [SEE ALL EPISODES →]              │
└─────────────────────────────────────┘
```

**Waveform:** CSS animated bars (12 bars, randomised heights on play), not Web Audio API analysis. Bars use `accent-teal` (`#4ecdc4`). Bars freeze on pause.

**Personality badge:**
- THE CURATOR: `rgba(255, 255, 255, 0.55)` text, no colour accent — authority needs no colour
- THE GUIDE: `#7b9cff` — blue, like educational links CORE tier
- THE ENTHUSIAST: `#4ecdc4` — teal, active, like mission ACTIVE status

**Progress bar:** Teal fill on dark track. Scrubable (click to seek).

**Speed control:** 4 states. Active speed: `#4ecdc4` text, `rgba(78,205,196,0.15)` background. Same pattern as timeline speed controls in P03.

---

### F-03 · Panel play button

Every detail panel — planet, mission, Moon landing site — gains a small play button in the header, adjacent to the close (×) button.

```
[MARS ×]  →  [MARS  ▶  ×]
```

**Spec:**
- 24px circle (same as close button)
- Icon: ▶ at 9px, Space Mono
- Background: `rgba(255,255,255,0.04)` at rest, `rgba(78,205,196,0.15)` on hover, `rgba(78,205,196,0.25)` when this episode is playing
- On tap: opens Science Overlay if closed, loads and begins Enthusiast episode for this object
- If a screen episode is playing: pause it, begin object episode, offer "resume screen episode" in Science Overlay after object episode ends

**State when playing:** The play button icon changes to `■` (stop/pause). The panel header gains a subtle `#4ecdc4` left border pulse — 2px, `animation: pulse 2s infinite` at 30% opacity.

---

### F-04 · Episode inventory view

Accessible from Science Overlay via "SEE ALL EPISODES" button or by swiping up.

**Sections (in order):**

```
THE FULL TOUR                         ← Curator playlist, ~88 min
[▶ BEGIN THE FULL TOUR]

────────────────────────────────────
THE GUIDE · SCREEN NARRATIONS

  [▶] The Solar System Explorer        10 min  [●]  ← dot = heard
  [▶] The Mission Configurator          9 min
  [▶] The Mission Arc                  11 min
  [▶] The Mission Library               8 min
  [▶] Earth Orbit Viewer                7 min
  [▶] The Moon Map                     10 min

────────────────────────────────────
THE ENTHUSIAST · PLANETS & THE SUN

  [▶] The Sun                           2 min  [●]
  [▶] Mercury                          90 sec
  ...

────────────────────────────────────
THE ENTHUSIAST · MARS MISSIONS

  [▶] Curiosity · Still Working         2 min  [●]
  [▶] Perseverance & Ingenuity          2 min
  [▶] Mars 3 · 14.5 Seconds            3 min
  ...

────────────────────────────────────
THE ENTHUSIAST · MOON MISSIONS

  [▶] Apollo 11 · Tranquility Base      3 min  [●]
  [▶] Apollo 17 · Cernan's Last Words   2 min
  ...

────────────────────────────────────
THE CURATOR · INTRODUCTIONS

  [▶] Welcome to Orrery                 3 min
  [▶] Part I: The Moon                  2 min
  [▶] Closing: We Went Anyway           3 min
```

**Row spec:**
- Height: 44px
- Play icon: Space Mono `▶` at 9px, `rgba(255,255,255,0.4)`, shifts to `#4ecdc4` on hover
- Title: Space Mono 9px bold, white
- Duration: Space Mono 8px, `rgba(255,255,255,0.30)`
- Heard indicator: 5px `#4ecdc4` dot, `rgba(78,205,196,0.4)` at rest, full on hover
- Row hover: `rgba(255,255,255,0.03)` background

---

### F-05 · Science Overlay navigation integration

The waveform icon in the nav gains a live state indicator:

- **No episode playing:** `〜` icon at 55% opacity
- **Episode playing:** `〜` icon at `#4ecdc4`, with a 6px `#4ecdc4` dot below it pulsing at 1.5s

On all screens, a thin `#4ecdc4` progress stripe (2px height) spans the bottom of the navigation bar when an episode is playing, advancing with playback progress. Identical visual language to the mission arc timeline bar. Visible even when the Science Overlay is closed — ambient awareness of play state.

---

### F-06 · Audio file structure

```
public/audio/
├── en/
│   ├── curator/
│   │   ├── full-tour-intro.mp3
│   │   ├── full-tour-outro.mp3
│   │   ├── section-moon.mp3
│   │   ├── section-solar-system.mp3
│   │   ├── section-mission.mp3
│   │   └── section-library.mp3
│   ├── guide/
│   │   ├── solar-system.mp3
│   │   ├── configurator.mp3
│   │   ├── arc.mp3
│   │   ├── library.mp3
│   │   ├── earth-orbit.mp3
│   │   └── moon-map.mp3
│   └── enthusiast/
│       ├── planets/
│       │   ├── sun.mp3
│       │   ├── mercury.mp3
│       │   ├── venus.mp3
│       │   ├── earth.mp3
│       │   ├── mars.mp3
│       │   ├── jupiter.mp3
│       │   ├── saturn.mp3
│       │   ├── uranus.mp3
│       │   └── neptune.mp3
│       ├── missions/
│       │   └── [id].mp3  ← keyed to mission JSON id field
│       └── moon-sites/
│           └── [site-id].mp3
├── de/
│   └── [same structure]
├── ja/
│   └── [same structure]
└── [all supported locales]/
```

**Audio specs:** MP3, 128kbps mono. Google Cloud TTS WaveNet output. Target file sizes: Enthusiast episodes 1–4 MB, Guide episodes 8–15 MB, Curator episodes 2–5 MB.

**Total audio storage estimate (English only):**
- 6 Guide episodes × ~10 MB = ~60 MB
- ~50 Enthusiast episodes × ~2.5 MB = ~125 MB
- 8 Curator segments × ~3 MB = ~24 MB
- **Total English: ~210 MB**
- **Per additional locale: ~210 MB**
- At 10 locales: ~2.1 GB — this is a Docker volume decision, not a bundle decision. Audio is never bundled with the JS application.

---

### F-07 · Script format specification

Each episode script is a markdown file with SSML-annotated sections and metadata frontmatter.

```markdown
---
id: mars
personality: enthusiast
target_type: planet
target_id: mars
screen: solar-system
duration_estimate: 175
equations:
  - vis-viva
  - orbital-period
data_sources:
  - data/planets.json#mars
  - data/missions/mars/curiosity.json
---

<!-- SCRIPT BEGINS -->

November 2011.
<break time="600ms"/>
An Atlas V is sitting on Launch Complex 41 at Cape Canaveral
carrying the most expensive, most complex machine
humanity has ever pointed at another planet.

<!-- equation block: vis-viva -->
<break time="400ms"/>
To get there, the rocket has to achieve escape velocity —
not from Earth, but from Earth's gravitational influence entirely.
That takes a specific amount of energy: C3,
the characteristic energy of the departure trajectory.
For the 2011 Mars window, that number is
<say-as interpret-as="unit">16.4 square kilometres per second squared</say-as>.
<break time="300ms"/>
That is the price of admission.
<break time="800ms"/>

<!-- narrative resumes -->
The rocket delivers. The spacecraft coasts for
<say-as interpret-as="unit">253 days</say-as>.
...
```

**Frontmatter fields:**
- `id` — matches data file id
- `personality` — `curator | guide | enthusiast`
- `target_type` — `planet | mission | moon-site | screen | curator`
- `target_id` — object id or screen slug
- `screen` — which screen this episode is contextually linked to
- `duration_estimate` — seconds (used for inventory display before audio is generated)
- `equations` — list of equation slugs covered (informational, for review)
- `data_sources` — JSONPath references Claude Code used to generate numbers

---

### F-08 · Build pipeline

**Script generation (one-time per object, re-run on data changes):**

```bash
# scripts/generate-scripts.sh
# Run by Claude Code with access to full codebase

for each object in [planets, missions, moon-sites]:
  if content/episodes/enthusiast/{type}/{id}.md does not exist:
    claude-code generate-episode \
      --personality enthusiast \
      --data data/{type}/{id}.json \
      --orbital src/lib/orbital.js \
      --voice-guide content/voice-guidelines.md \
      --output content/episodes/enthusiast/{type}/{id}.md
```

**Human review gate:** Scripts are committed to `content/episodes/`. No audio is generated from unreviewed scripts. The review is a PR — any maintainer can review script quality, factual accuracy, and voice consistency.

**Audio generation (triggered by CI on script changes):**

```bash
# scripts/generate-audio.sh
# Runs in GitHub Actions after script PR is merged

for each locale in SUPPORTED_LOCALES:
  for each script in content/episodes/**/*.md:
    hash=$(md5 script)
    if public/audio/{locale}/{path}.mp3 does not exist OR hash changed:
      extract_ssml_from_markdown script \
        | translate_if_not_english locale \
        | google_tts \
            --voice PERSONALITY_VOICE[personality][locale] \
            --audio-encoding MP3 \
            --speaking-rate 0.95 \
        > public/audio/{locale}/{path}.mp3
```

**Caching:** Audio files are cached by script content hash. A corrected word in a script regenerates only that file. GitHub Actions artifact cache keyed on `content/episodes/` hash tree.

**GitHub Actions secrets required:**
- `GOOGLE_TTS_API_KEY`
- `ANTHROPIC_API_KEY` (for translation step)

Neither key is exposed to the browser or the built application.

---

### F-09 · Playback engine

Minimal custom audio player — no third-party library.

```javascript
// src/lib/audio-player.js

export class EpisodePlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.currentEpisode = null;
    this.listeners = new Set();
  }

  async load(episode) {
    // episode: { id, personality, path, title, duration }
    const locale = getCurrentLocale(); // from Paraglide-js
    this.audio.src = `/audio/${locale}/${episode.path}.mp3`;
    this.currentEpisode = episode;
    await this.audio.load();
    this.notify();
  }

  play()   { this.audio.play(); this.notify(); }
  pause()  { this.audio.pause(); this.notify(); }
  seek(t)  { this.audio.currentTime = t; }
  speed(r) { this.audio.playbackRate = r; }

  get state() {
    return {
      playing:  !this.audio.paused,
      current:  this.audio.currentTime,
      duration: this.audio.duration || this.currentEpisode?.duration,
      episode:  this.currentEpisode,
    };
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify()      { this.listeners.forEach(fn => fn(this.state)); }
}

export const player = new EpisodePlayer(); // singleton
```

The player is a singleton shared across all screens via the module system. Screen navigations do not interrupt playback — audio continues while the router mounts a new screen.

**Heard tracking:**
```javascript
// localStorage key: 'orrery:heard-episodes'
// Value: Set<string> of episode IDs, serialised as JSON array
audio.addEventListener('ended', () => markHeard(episode.id));
```

---

## Non-functional Requirements

| Requirement | Target |
|---|---|
| Audio file load time (first play) | < 800ms on broadband, acceptable on mobile |
| Overlay open animation | 0.22s ease — identical to detail panel |
| Playback start after press | < 200ms (file cached after first load) |
| Offline playback | All audio available without internet |
| Locale switch | Re-loads current episode in new locale, seeks to same position |
| Screen navigation during playback | No interruption — audio continues |
| Memory | Single `<audio>` element reused — no accumulation |

---

## Out of Scope (Phase 2)

- Ambient audio bed / background music (Phase 3)
- User-contributed narrations
- Real-time TTS fallback for objects without pre-generated episodes
- Transcript view (accessibility — Phase 3)
- Podcast RSS feed export (considered, deferred)
- Chapter markers within episodes

---

## Prioritised Delivery Order

**Must have for initial release:**
- Science Overlay UI (F-01, F-02)
- Panel play button on planet and mission panels (F-03)
- English audio for: 6 Guide episodes + Mars + Earth + Curiosity + Apollo 11 + Apollo 17 + Mars 3 + Chandrayaan-3 (priority Enthusiast set)
- Full Tour playlist (English, priority episodes only — gaps filled with Curator narrated summary)
- Script format + generation tooling (F-07, F-08)

**Should have:**
- Full English Enthusiast episode set (all planets, all 28 missions)
- Episode inventory view (F-04)
- Heard tracking
- Speed control

**Could have (Phase 2 complete):**
- All supported locales
- Ambient state indicator in nav (F-05)
- Full Tour as continuous 88-minute documentary

---

## Success Metrics

- A user who plays the Mars Enthusiast episode stays on the Mars panel longer than a user who doesn't (session duration on panel)
- The Full Tour is completed by a measurable percentage of users who start it (completion rate target: >25%)
- A user in a non-English locale plays at least one episode in their language (locale audio adoption)
- No audio playback failures in offline Docker Compose deployments (zero runtime API dependency)
- The phrase "I didn't know that" appears in user feedback — the Enthusiast episodes are teaching something the text alone was not

---

## Appendix A · Voice Guidelines for Claude Code

When generating episode scripts, Claude Code must follow these guidelines.

**Read before writing:**
1. The mission or planet data file in full — every number used in the script must come from the data, not from training knowledge
2. `src/lib/orbital.js` for any equation referenced
3. `05_Design_System.md` section 6 for what the user sees on screen when this episode plays
4. RFC-07 section "The Sagan Atmospheric Moves" for the specific moments that require full weight

**Voice consistency checks:**
- Is every number sourced from the data file? (No approximate figures from training data)
- Does the Enthusiast episode build to a specific moment of emotional weight?
- Does the Guide episode reference what the user is *seeing*, not just the subject?
- Does the Curator speak for humanity, not to the user?
- Is every equation explained through what it *does* before what it *is*?
- Is there at least one meaningful silence (SSML break ≥ 600ms) at the emotional peak?

**The test for a finished Enthusiast script:**
Read it aloud. Does it feel like you're standing next to someone who loves this subject and can't quite believe you get to talk about it? If it feels like a Wikipedia article being read aloud, rewrite it.

**The test for a finished Guide script:**
Does it end with the user understanding something they didn't understand when it started? Not knowing a fact — *understanding* something. The difference is felt.

**The test for a finished Curator script:**
Does it treat the human listening as part of the species that did these things? Not "NASA landed on the Moon" — "we landed on the Moon." The achievement belongs to the listener too. Sagan always knew this.

---

## Appendix B · The Atmospheric Moves Reference

See RFC-07 section "The Sagan Atmospheric Moves" — replicated here for Claude Code's direct access during script generation.

These are the specific moments in the product's narrative arc where the script must land with full weight. Not dramatic decoration — emotional architecture. Claude Code must check this list when generating any of the affected episodes and ensure the marked moment receives appropriate treatment: pacing, SSML silence, present tense at the critical beat.

| Episode | Moment | Treatment |
|---|---|---|
| Guide: Mission Arc | Signal crosses 1 light-minute | Pause. Present tense. Let the distance land. |
| Guide: Configurator | Porkchop window appears | Contact beat. "The universe is telling you when to leave." |
| Guide: Mission Arc | 60 light-seconds from Earth | Pale blue dot register. Written fresh, not quoted. |
| Enthusiast: Mars 3 | 14.5 seconds of transmission | Every second named. Then silence. |
| Enthusiast: Apollo 17 | Cernan's last words | Quote verbatim. No commentary after. Silence. |
| Curator: Closing | Luna 9 to Artemis arc | Dylan Thomas register. "We went anyway." |
| Guide: Moon Map | The far side | "The same communication problem, at 400 million kilometres." |
| Enthusiast: Curiosity | Still active after 12 years | Present tense. He is there now. "It is still working." |

---

*PRD-07 · Science Overlay & Episode System · May 2026 · DRAFT*
*Depends on: RFC-07 · Implements: SLICE-07*
