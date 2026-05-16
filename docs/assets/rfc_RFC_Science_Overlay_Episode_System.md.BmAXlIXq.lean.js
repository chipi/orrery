import{c as a,Q as n,j as i,m as e}from"./chunks/framework.CdiUUa3G.js";const k=JSON.parse('{"title":"RFC-07 · Science Overlay & Episode System","description":"","frontmatter":{},"headers":[],"relativePath":"rfc/RFC_Science_Overlay_Episode_System.md","filePath":"rfc/RFC_Science_Overlay_Episode_System.md"}'),t={name:"rfc/RFC_Science_Overlay_Episode_System.md"};function p(l,s,o,r,h,c){return n(),i("div",null,[...s[0]||(s[0]=[e(`<h1 id="rfc-07-·-science-overlay-episode-system" tabindex="-1">RFC-07 · Science Overlay &amp; Episode System <a class="header-anchor" href="#rfc-07-·-science-overlay-episode-system" aria-label="Permalink to &quot;RFC-07 · Science Overlay &amp; Episode System&quot;">​</a></h1><p><em>May 2026 · Status: PROPOSED · Author: Orrery Core</em></p><blockquote><p><strong>Why this is an RFC.</strong> The choice of build-time TTS provider, audio-asset packaging, episode-script source format, and per-screen overlay component shape are architectural commitments that bind every future audio episode and every screen&#39;s player surface. They need to be debated and recorded before any audio file or player module ships. <em>(Placeholder gating sentence — content under review for second-pass refresh.)</em></p></blockquote><hr><h2 id="summary" tabindex="-1">Summary <a class="header-anchor" href="#summary" aria-label="Permalink to &quot;Summary&quot;">​</a></h2><p>Add a persistent <strong>Science Overlay</strong> to all six Orrery screens, exposing a pre-generated audio episode system that narrates every section of the product — screen by screen, object by object — in the voice of a virtual museum that also happens to be a podcast.</p><p>Three distinct AI-voiced personalities narrate at three levels of the product hierarchy. All audio is generated at build time and served as static files. Fully offline. Fully internationalised. Scripts are version-controlled markdown written by Claude Code from direct inspection of the source data and equations.</p><p>The editorial DNA is Carl Sagan&#39;s <em>Cosmos</em>, <em>Contact</em>, and <em>Interstellar</em>: science that earns its emotion, scale made personal, wonder downstream of understanding.</p><hr><h2 id="motivation" tabindex="-1">Motivation <a class="header-anchor" href="#motivation" aria-label="Permalink to &quot;Motivation&quot;">​</a></h2><p>Orrery is already educationally rich. The TECHNICAL tab on every planet, the capability ladder, the 13-event CAPCOM ticker — the content is there. But a curious person sitting down with Orrery for the first time has no voice in their ear telling them <em>why this moment matters</em>.</p><p>A physics teacher knows that vis-viva velocity at perihelion is the thing to feel. A first-time user does not. The current product trusts the user to find that feeling themselves. Most won&#39;t.</p><p>Every great museum solves this with an audio guide. Every great science communicator — Sagan above all — solved it by standing next to you at the exhibit and saying: <em>look at this</em>. Not explaining. Pointing.</p><p>Orrery needs that voice. Three of them, actually, calibrated to three different levels of engagement. And it needs those voices in every language it supports, without the economics of human voice talent making multilingual a fantasy.</p><hr><h2 id="non-goals" tabindex="-1">Non-goals <a class="header-anchor" href="#non-goals" aria-label="Permalink to &quot;Non-goals&quot;">​</a></h2><ul><li><strong>Real-time TTS.</strong> Synthesising audio on demand per-user introduces latency, requires runtime API keys, and prevents offline use. All audio is pre-generated.</li><li><strong>Interactive voice Q&amp;A.</strong> Not a chatbot. Not a voice assistant. A narrated experience.</li><li><strong>Continuous background music.</strong> Ambient audio bed is explored in Phase 3. This RFC covers voice narration only.</li><li><strong>User-recorded narration.</strong> Community-contributed audio is a Phase 3 possibility. Phase 2 is editorial-controlled.</li></ul><hr><h2 id="proposal" tabindex="-1">Proposal <a class="header-anchor" href="#proposal" aria-label="Permalink to &quot;Proposal&quot;">​</a></h2><h3 id="the-science-overlay" tabindex="-1">The Science Overlay <a class="header-anchor" href="#the-science-overlay" aria-label="Permalink to &quot;The Science Overlay&quot;">​</a></h3><p>A persistent UI layer, accessible on all six screens, that houses the episode system. Triggered by a microphone / waveform icon in the navigation bar — consistent across all screens.</p><p>When open, the Science Overlay slides up from the bottom (mobile) or in from the right (desktop), occupying roughly one-third of the screen without occluding the 3D view. It contains:</p><ol><li><strong>Now playing</strong> — current episode with waveform visualiser, progress bar, personality badge</li><li><strong>Screen episode</strong> — the narrated tour for the current screen, auto-suggested</li><li><strong>Episode inventory</strong> — browsable catalogue of all episodes, grouped by personality</li><li><strong>Autoplay queue</strong> — optional curated playlist: &quot;The Full Tour&quot; (all episodes in narrative order, ~90 minutes)</li></ol><h3 id="three-personalities" tabindex="-1">Three Personalities <a class="header-anchor" href="#three-personalities" aria-label="Permalink to &quot;Three Personalities&quot;">​</a></h3><p>The tension in the product is between museum authority and podcast warmth. Three named personalities hold different positions on that axis.</p><hr><h4 id="the-curator" tabindex="-1">THE CURATOR <a class="header-anchor" href="#the-curator" aria-label="Permalink to &quot;THE CURATOR&quot;">​</a></h4><p><em>Science Overlay navigation · Episode inventory introductions · The opening and closing of the full tour</em></p><p>Voice of the institution. Thinks in decades and light-years. Speaks the way Carl Sagan spoke in <em>Cosmos</em> — not to you, but to humanity&#39;s curiosity on your behalf. Never condescending. Never hurrying. The numbers he cites were hard-won by centuries of human effort and he knows it.</p><p><strong>Tonal markers:</strong></p><ul><li>&quot;We&quot; as a species, never &quot;you&quot; as a user</li><li>Geological and cosmic timescales feel natural, not overwhelming</li><li>Silences are load-bearing</li><li>The universe is not hostile — it is vast, and that is different</li></ul><p><strong>Sample script fragment:</strong></p><blockquote><p><em>&quot;What you are about to hear is the story of how humanity learned to leave its world. It took sixty years, six hundred missions, twelve humans who walked on another surface, and one species that refused to stay home. We begin where every journey to Mars must begin — on the Moon.&quot;</em></p></blockquote><hr><h4 id="the-guide" tabindex="-1">THE GUIDE <a class="header-anchor" href="#the-guide" aria-label="Permalink to &quot;THE GUIDE&quot;">​</a></h4><p><em>Screen narration episodes — one per screen, 8–12 minutes</em></p><p>Ellie Arroway in the radio telescope dish, explaining to her colleague why this particular signal matters. Personal investment in the science. Walks you through exactly what you&#39;re looking at, assumes you&#39;re intelligent, never assumes prior knowledge. The wonder is never performed — she finds it every time.</p><p><strong>Tonal markers:</strong></p><ul><li>Addresses what the user is <em>seeing</em>, not just the subject abstractly</li><li>Equations introduced through what they <em>do</em>, not what they <em>are</em></li><li>The explanation builds toward a moment of clarity — the &quot;oh&quot; moment is designed</li><li>Warmth, not enthusiasm — there&#39;s a difference</li></ul><p><strong>Sample script fragment (Solar System Explorer):</strong></p><blockquote><p><em>&quot;Look at Mars right now. Watch how it moves relative to Earth — faster than you&#39;d expect for something that far out. That&#39;s Kepler&#39;s second law, visible in real time. The closer a planet is to the Sun, the faster it has to move or gravity wins and it falls inward. Mars is running. Earth is walking. The gap between them — that changing geometry — is exactly why we can only leave for Mars every twenty-six months. You&#39;re not looking at a diagram. You&#39;re watching the launch window open and close.&quot;</em></p></blockquote><hr><h4 id="the-enthusiast" tabindex="-1">THE ENTHUSIAST <a class="header-anchor" href="#the-enthusiast" aria-label="Permalink to &quot;THE ENTHUSIAST&quot;">​</a></h4><p><em>Panel detail episodes — one per planet, mission, and landing site. 90 seconds–3 minutes.</em></p><p>Cooper from <em>Interstellar</em> — the pilot who understands the equations AND feels the stakes. When he explains the transfer orbit, it isn&#39;t academic — it&#39;s the thing between him and the destination. The Enthusiast makes vis-viva feel visceral. Makes Mars 3&#39;s 14.5 seconds of transmission feel like a held breath. Makes Cernan&#39;s last words feel like they were spoken an hour ago.</p><p><strong>Tonal markers:</strong></p><ul><li>Equations are <em>tools</em>, not facts — he explains them the way you explain a wrench to someone who needs to fix something</li><li>Specific numbers carry weight — never &quot;a long time&quot; when you can say &quot;253 days&quot;</li><li>Emotion earned by precision, not by sentiment</li><li>Present tense for historical moments at the critical beat</li></ul><p><strong>Sample script fragment (Curiosity detail panel):</strong></p><blockquote><p><em>&quot;November 26, 2011. An Atlas V leaves Cape Canaveral carrying 899 kilograms of nuclear-powered rover — the most complex machine humanity has ever landed on another planet. The transit takes 253 days. When Curiosity hits the Martian atmosphere at 5.8 kilometres per second, NASA does something they&#39;ve never done before: they lower it on a rocket-powered sky crane. Nobody has ever tried this. It either works or it doesn&#39;t. It works. Gale Crater. August 6, 2012, 05:17 UTC. Curiosity is still there. It has driven 31 kilometres. It has climbed 700 metres up Mount Sharp. It has confirmed that Mars once had conditions suitable for microbial life. That was twelve years ago. It is still working.&quot;</em></p></blockquote><hr><h3 id="episode-taxonomy" tabindex="-1">Episode Taxonomy <a class="header-anchor" href="#episode-taxonomy" aria-label="Permalink to &quot;Episode Taxonomy&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>content/episodes/</span></span>
<span class="line"><span>│</span></span>
<span class="line"><span>├── curator/</span></span>
<span class="line"><span>│   ├── full-tour-intro.md          ← Opens &quot;The Full Tour&quot; playlist</span></span>
<span class="line"><span>│   ├── full-tour-outro.md          ← Closes the series</span></span>
<span class="line"><span>│   └── section-intros/</span></span>
<span class="line"><span>│       ├── moon.md                 ← &quot;We begin on the Moon...&quot;</span></span>
<span class="line"><span>│       ├── solar-system.md</span></span>
<span class="line"><span>│       ├── mission.md</span></span>
<span class="line"><span>│       └── library.md</span></span>
<span class="line"><span>│</span></span>
<span class="line"><span>├── guide/</span></span>
<span class="line"><span>│   ├── solar-system.md             ← P01 — 10 min</span></span>
<span class="line"><span>│   ├── configurator.md             ← P02 — 9 min</span></span>
<span class="line"><span>│   ├── arc.md                      ← P03 — 11 min</span></span>
<span class="line"><span>│   ├── library.md                  ← P04 — 8 min</span></span>
<span class="line"><span>│   ├── earth-orbit.md              ← P05 — 7 min</span></span>
<span class="line"><span>│   └── moon-map.md                 ← P06 — 10 min</span></span>
<span class="line"><span>│</span></span>
<span class="line"><span>└── enthusiast/</span></span>
<span class="line"><span>    ├── planets/</span></span>
<span class="line"><span>    │   ├── mercury.md</span></span>
<span class="line"><span>    │   ├── venus.md</span></span>
<span class="line"><span>    │   ├── earth.md</span></span>
<span class="line"><span>    │   ├── mars.md                 ← Priority 1</span></span>
<span class="line"><span>    │   ├── jupiter.md</span></span>
<span class="line"><span>    │   ├── saturn.md</span></span>
<span class="line"><span>    │   ├── uranus.md</span></span>
<span class="line"><span>    │   ├── neptune.md</span></span>
<span class="line"><span>    │   └── sun.md</span></span>
<span class="line"><span>    ├── missions/</span></span>
<span class="line"><span>    │   ├── mars/</span></span>
<span class="line"><span>    │   │   ├── curiosity.md        ← Priority 1</span></span>
<span class="line"><span>    │   │   ├── perseverance.md     ← Priority 1</span></span>
<span class="line"><span>    │   │   ├── mars-3.md           ← Priority 1 (the 14.5 seconds)</span></span>
<span class="line"><span>    │   │   ├── hope-probe.md</span></span>
<span class="line"><span>    │   │   ├── tianwen-1.md</span></span>
<span class="line"><span>    │   │   ├── viking-1.md</span></span>
<span class="line"><span>    │   │   ├── mars-express.md</span></span>
<span class="line"><span>    │   │   ├── maven.md</span></span>
<span class="line"><span>    │   │   ├── insight.md</span></span>
<span class="line"><span>    │   │   ├── mangalyaan.md</span></span>
<span class="line"><span>    │   │   └── mariner-4.md</span></span>
<span class="line"><span>    │   └── moon/</span></span>
<span class="line"><span>    │       ├── apollo-11.md        ← Priority 1</span></span>
<span class="line"><span>    │       ├── apollo-17.md        ← Priority 1 (Cernan&#39;s last words)</span></span>
<span class="line"><span>    │       ├── luna-9.md</span></span>
<span class="line"><span>    │       ├── lunokhod-1.md</span></span>
<span class="line"><span>    │       ├── chandrayaan-3.md</span></span>
<span class="line"><span>    │       ├── change-4.md</span></span>
<span class="line"><span>    │       ├── artemis-3.md</span></span>
<span class="line"><span>    │       └── slim.md</span></span>
<span class="line"><span>    └── moon-sites/</span></span>
<span class="line"><span>        ├── tranquility-base.md     ← Priority 1</span></span>
<span class="line"><span>        ├── taurus-littrow.md       ← Priority 1</span></span>
<span class="line"><span>        └── shackleton-rim.md</span></span></code></pre></div><hr><h3 id="the-sagan-atmospheric-moves" tabindex="-1">The Sagan Atmospheric Moves <a class="header-anchor" href="#the-sagan-atmospheric-moves" aria-label="Permalink to &quot;The Sagan Atmospheric Moves&quot;">​</a></h3><p>Specific moments in the existing product where the script must land with full weight. These are not decoration — they are the product&#39;s emotional architecture.</p><p><strong>The signal delay beat (P03 — Mission Arc)</strong> When the spacecraft crosses 1 light-minute from Earth, the Guide episode should pause on it. Not explain it — inhabit it. <em>&quot;Your last message home left twelve minutes ago. They haven&#39;t heard it yet. Whatever you said is still travelling.&quot;</em></p><p><strong>The porkchop plot reveal (P02 — Configurator)</strong> When the heatmap renders and the 2026 window emerges from the noise, the Guide episode has its Contact moment. <em>&quot;There it is. October 2026. Not a suggestion — a law of orbital mechanics. The universe is telling you when to leave.&quot;</em></p><p><strong>The pale blue dot (P03 — Arc, at ~60 light-seconds from Earth)</strong> Sagan&#39;s speech is copyrighted. But the <em>feeling</em> belongs to the moment. The Enthusiast writes his own version, in present tense, from inside the spacecraft.</p><p><strong>The 14.5 seconds (Mission Library — Mars 3)</strong> Mars 3 lands on Mars on December 2, 1971. It transmits for fourteen and a half seconds — a grey smear, possibly a dust storm — then silence, forever. The Enthusiast episode for Mars 3 should treat those 14.5 seconds the way <em>Interstellar</em> treats the docking sequence. Every second named.</p><p><strong>The capability ladder closing beat (P06 — Moon Map, full tour)</strong> Luna 9 to Artemis III. The Curator closes the Moon section of the full tour with the Dylan Thomas register: we did not go gently. We went with slide rules and vacuum tubes and we went anyway.</p><p><strong>Cernan&#39;s last words (Moon site — Taurus-Littrow)</strong><em>&quot;We leave as we came, and, God willing, as we shall return, with peace and hope for all mankind.&quot;</em> December 14, 1972. The Enthusiast episode ends in silence after quoting this. No commentary. Let it stand.</p><hr><h3 id="script-generation-by-claude-code" tabindex="-1">Script Generation by Claude Code <a class="header-anchor" href="#script-generation-by-claude-code" aria-label="Permalink to &quot;Script Generation by Claude Code&quot;">​</a></h3><p>Claude Code generates first-draft scripts by reading the source directly:</p><p><strong>What it reads:</strong></p><ul><li><code>src/lib/orbital.js</code> — the actual equations and constants</li><li><code>data/planets.json</code> — orbital elements, real numbers per planet</li><li><code>data/missions/*.json</code> — mission records, descriptions, dates, data quality notes</li><li><code>05_Design_System.md</code> — what the user is actually seeing on screen</li><li>This RFC — voice guidelines, atmospheric moves, personality specs</li></ul><p><strong>What it produces:</strong></p><ul><li>Markdown scripts in <code>content/episodes/**/*.md</code></li><li>SSML markup embedded for equation pronunciation and pause timing</li><li>A <code>metadata.json</code> per episode: personality, target screen, target object ID, estimated duration, equations referenced</li></ul><p><strong>The human review gate:</strong> Scripts are generated, then committed as markdown for review before audio generation runs. This is non-negotiable. These scripts are the editorial voice of the product. They get a human eye. A bad script is worse than no script.</p><p><strong>The SSML equation pattern:</strong></p><div class="language-xml vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">xml</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&lt;</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">speak</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  The vis-viva equation governs your speed at every point of the journey.</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  &lt;</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">break</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> time</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;500ms&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">/&gt;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  v — your velocity — equals the square root of mu,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  the Sun&#39;s gravitational pull on everything in the system,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  multiplied by the quantity: two over r,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  &lt;</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">emphasis</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> level</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;strong&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;minus&lt;/</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">emphasis</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt; one over a.</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  &lt;</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">break</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> time</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;400ms&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">/&gt;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  r is where you are. a is the shape of your orbit.</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  Change one, the other compensates. The equation doesn&#39;t negotiate.</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  &lt;</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">break</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> time</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;700ms&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">/&gt;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  At this moment — &lt;</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">say-as</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> interpret-as</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;unit&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;1.26 AU&lt;/</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">say-as</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  from the Sun — you are moving at</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  &lt;</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">say-as</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> interpret-as</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;unit&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;31.4 kilometres per second&lt;/</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">say-as</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;.</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  Faster than any human being in history.</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  And you are coasting.</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&lt;/</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">speak</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;</span></span></code></pre></div><hr><h3 id="internationalisation-strategy" tabindex="-1">Internationalisation Strategy <a class="header-anchor" href="#internationalisation-strategy" aria-label="Permalink to &quot;Internationalisation Strategy&quot;">​</a></h3><p><strong>Phase 1 (English):</strong> All episodes generated in English. Human-reviewed. Audio produced via Google Cloud TTS. Voice character per personality defined in Google TTS voice ID.</p><p><strong>Phase 2 (All supported locales):</strong> Translation pipeline triggered by CI on English script changes:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>English .md reviewed + merged</span></span>
<span class="line"><span>  → GitHub Action: Claude API translates to all Paraglide locales</span></span>
<span class="line"><span>  → Translated .md committed for lighter review (structure already approved)</span></span>
<span class="line"><span>  → Google Cloud TTS generates per-locale audio with locale-matched voice</span></span>
<span class="line"><span>  → public/audio/{locale}/{personality}/{id}.mp3</span></span></code></pre></div><p><strong>Voice platform: Google Cloud TTS</strong></p><p>Chosen for:</p><ul><li>40+ language neural voices — matches Paraglide-js locale coverage</li><li>1M WaveNet characters/month free — sufficient for build-time generation of all episodes across all locales</li><li>SSML support — required for equation pronunciation</li><li>Build-time only — zero runtime cost after generation</li><li>No per-user API exposure</li></ul><p>Voice IDs per personality (English baseline):</p><table tabindex="0"><thead><tr><th>Personality</th><th>Google TTS Voice</th><th>Character</th></tr></thead><tbody><tr><td>The Curator</td><td><code>en-US-Neural2-D</code> (male, measured)</td><td>Sagan register</td></tr><tr><td>The Guide</td><td><code>en-US-Neural2-F</code> (female, warm)</td><td>Ellie Arroway</td></tr><tr><td>The Enthusiast</td><td><code>en-US-Neural2-J</code> (male, energetic)</td><td>Cooper</td></tr></tbody></table><p>Voice IDs for other locales TBD per language — a native speaker review of the first generated episode per locale is required before full generation runs.</p><hr><h3 id="the-full-tour-playlist" tabindex="-1">The Full Tour Playlist <a class="header-anchor" href="#the-full-tour-playlist" aria-label="Permalink to &quot;The Full Tour Playlist&quot;">​</a></h3><p>An optional curated sequence of all episodes in narrative order — approximately 90 minutes total. This is Orrery experienced as a documentary.</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>THE FULL TOUR — ~90 minutes</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[CURATOR]  Introduction: Sixty Years to Mars          3 min</span></span>
<span class="line"><span>[CURATOR]  Part I: The Road Starts on the Moon        2 min</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[GUIDE]    The Moon Map                              10 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Luna 9 — First Soft Landing            2 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Apollo 11 — Tranquility Base           3 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Apollo 17 — Cernan&#39;s Last Words        2 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Chandrayaan-3 — The South Pole         2 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Chang&#39;e 4 — The Far Side               2 min</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[CURATOR]  Part II: The Solar System                  1 min</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[GUIDE]    The Solar System Explorer                 10 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Earth — The Departure Point            2 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Mars — The Destination                 3 min</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[CURATOR]  Part III: The Mission                      1 min</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[GUIDE]    The Mission Configurator                   9 min</span></span>
<span class="line"><span>[GUIDE]    The Mission Arc                           11 min</span></span>
<span class="line"><span>  [ENTHUSIAST] The Pale Blue Dot Moment               2 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Signal Delay — 12 Minutes              2 min</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[CURATOR]  Part IV: The Record                        1 min</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[GUIDE]    The Mission Library                        8 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Mars 3 — 14.5 Seconds                  3 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Curiosity — Still Working              2 min</span></span>
<span class="line"><span>  [ENTHUSIAST] Perseverance — Ingenuity               2 min</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[CURATOR]  Closing: We Went Anyway                    3 min</span></span>
<span class="line"><span></span></span>
<span class="line"><span>TOTAL: ~88 minutes</span></span></code></pre></div><hr><h2 id="audio-pipeline-architecture" tabindex="-1">Audio Pipeline Architecture <a class="header-anchor" href="#audio-pipeline-architecture" aria-label="Permalink to &quot;Audio Pipeline Architecture&quot;">​</a></h2><p>Two pipelines, cleanly separated. Pipeline 1 owns content — it translates and validates scripts. Pipeline 2 owns audio — it consumes validated scripts and produces <code>.mp3</code> files. Neither does the other&#39;s job.</p><p>Both pipelines run identically locally and in GitHub Actions. The only difference is where secrets come from (<code>.env</code> locally, GitHub Secrets in CI) and where outputs land (local filesystem vs. committed artifacts).</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>PIPELINE 1                          PIPELINE 2</span></span>
<span class="line"><span>Content Translation &amp; Validation    Audio Generation</span></span>
<span class="line"><span>────────────────────────────────    ──────────────────────────────</span></span>
<span class="line"><span>Input:  locale, script path(s)      Input:  locale, script path(s)</span></span>
<span class="line"><span>Output: translated .md files        Output: .mp3 files</span></span>
<span class="line"><span>        validation report                   generation manifest</span></span>
<span class="line"><span>────────────────────────────────    ──────────────────────────────</span></span>
<span class="line"><span>Runs:   locally or GH Actions       Runs:   locally or GH Actions</span></span>
<span class="line"><span>Needs:  ANTHROPIC_API_KEY           Needs:  GOOGLE_TTS_API_KEY</span></span>
<span class="line"><span>Does NOT touch audio                Does NOT translate anything</span></span></code></pre></div><hr><h3 id="pipeline-1-·-content-translation-validation" tabindex="-1">Pipeline 1 · Content Translation &amp; Validation <a class="header-anchor" href="#pipeline-1-·-content-translation-validation" aria-label="Permalink to &quot;Pipeline 1 · Content Translation &amp; Validation&quot;">​</a></h3><p><strong>Purpose:</strong> Take a reviewed English script and produce a validated, SSML-safe translation in a target locale. Never produces audio. Never touches <code>public/audio/</code>.</p><p><strong>Invocation:</strong></p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Locally — translate one script to one locale</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">./scripts/pipeline-translate.sh</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --locale</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> de</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --script</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> content/episodes/enthusiast/missions/mars/curiosity.md</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Locally — translate all scripts to one locale</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">./scripts/pipeline-translate.sh</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --locale</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ja</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --all</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Locally — translate all scripts to all supported locales</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">./scripts/pipeline-translate.sh</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --all-locales</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># GitHub Actions — triggered by merge to main, any script change</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># locale matrix: all supported locales in parallel</span></span></code></pre></div><p><strong>Step-by-step:</strong></p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>1. EXTRACT</span></span>
<span class="line"><span>   Split the .md script into segments:</span></span>
<span class="line"><span>   - Frontmatter (YAML) → preserved verbatim, not translated</span></span>
<span class="line"><span>   - SSML markup tags → extracted, replaced with placeholders {SSML_001}</span></span>
<span class="line"><span>   - Narrative text → the only thing translated</span></span>
<span class="line"><span></span></span>
<span class="line"><span>2. TRANSLATE</span></span>
<span class="line"><span>   Claude API call per script segment:</span></span>
<span class="line"><span>   - System: voice guidelines from content/voice-guidelines.md</span></span>
<span class="line"><span>             personality spec from RFC-07</span></span>
<span class="line"><span>             &quot;preserve meaning, cadence, and emotional weight —</span></span>
<span class="line"><span>              not word-for-word. The pause before 14.5 seconds</span></span>
<span class="line"><span>              must feel as long in Japanese as in English.&quot;</span></span>
<span class="line"><span>   - User:   [extracted narrative text]</span></span>
<span class="line"><span>   - Model:  claude-sonnet-4-6</span></span>
<span class="line"><span></span></span>
<span class="line"><span>3. RECOMPOSE</span></span>
<span class="line"><span>   Reinsert SSML placeholders into translated text.</span></span>
<span class="line"><span>   Frontmatter: update locale field, preserve all other fields.</span></span>
<span class="line"><span>   Output: content/episodes/{locale}/enthusiast/missions/mars/curiosity.md</span></span>
<span class="line"><span></span></span>
<span class="line"><span>4. VALIDATE</span></span>
<span class="line"><span>   Four checks run automatically:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>   a. SSML integrity</span></span>
<span class="line"><span>      Every {SSML_NNN} placeholder present in source</span></span>
<span class="line"><span>      must appear exactly once in output.</span></span>
<span class="line"><span>      Any mismatch → FAIL, block pipeline.</span></span>
<span class="line"><span></span></span>
<span class="line"><span>   b. Duration estimate</span></span>
<span class="line"><span>      Run Google TTS character count estimate.</span></span>
<span class="line"><span>      If estimated duration differs from source by &gt; 20%,</span></span>
<span class="line"><span>      → WARN, do not block (translator may have found</span></span>
<span class="line"><span>        a more concise phrasing — that is acceptable)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>   c. Equation presence</span></span>
<span class="line"><span>      All equation slugs listed in frontmatter \`equations:\`</span></span>
<span class="line"><span>      must appear in the translated text.</span></span>
<span class="line"><span>      Missing equation → FAIL, block pipeline.</span></span>
<span class="line"><span>      (Ensures &quot;vis-viva&quot; isn&#39;t silently omitted in translation)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>   d. Factual numbers</span></span>
<span class="line"><span>      All numeric values present in source script</span></span>
<span class="line"><span>      (extracted via regex: digits + units) must</span></span>
<span class="line"><span>      appear unchanged in translated output.</span></span>
<span class="line"><span>      Numbers are never translated — &quot;253 days&quot; is</span></span>
<span class="line"><span>      &quot;253 days&quot; in every language.</span></span>
<span class="line"><span>      Mismatch → FAIL, block pipeline.</span></span>
<span class="line"><span></span></span>
<span class="line"><span>5. REPORT</span></span>
<span class="line"><span>   outputs/translation-report-{locale}-{timestamp}.json</span></span>
<span class="line"><span>   {</span></span>
<span class="line"><span>     &quot;locale&quot;: &quot;de&quot;,</span></span>
<span class="line"><span>     &quot;scripts_processed&quot;: 12,</span></span>
<span class="line"><span>     &quot;passed&quot;: 11,</span></span>
<span class="line"><span>     &quot;failed&quot;: 1,</span></span>
<span class="line"><span>     &quot;warnings&quot;: 2,</span></span>
<span class="line"><span>     &quot;failures&quot;: [</span></span>
<span class="line"><span>       {</span></span>
<span class="line"><span>         &quot;script&quot;: &quot;curiosity.md&quot;,</span></span>
<span class="line"><span>         &quot;check&quot;: &quot;ssml_integrity&quot;,</span></span>
<span class="line"><span>         &quot;detail&quot;: &quot;placeholder {SSML_004} missing from output&quot;</span></span>
<span class="line"><span>       }</span></span>
<span class="line"><span>     ]</span></span>
<span class="line"><span>   }</span></span></code></pre></div><p><strong>SSML placeholder strategy — why it matters:</strong></p><p>SSML tags like <code>&lt;break time=&quot;600ms&quot;/&gt;</code> and <code>&lt;emphasis level=&quot;strong&quot;&gt;</code> must survive translation unchanged. A translator (human or AI) who sees raw SSML might reword around it, move it, or drop it — breaking the equation pacing that makes the scripts work.</p><p>The placeholder approach makes this structurally impossible:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Source (en):</span></span>
<span class="line"><span>  The equation doesn&#39;t negotiate.</span></span>
<span class="line"><span>  &lt;break time=&quot;700ms&quot;/&gt;</span></span>
<span class="line"><span>  At this moment —</span></span>
<span class="line"><span></span></span>
<span class="line"><span>After extraction:</span></span>
<span class="line"><span>  The equation doesn&#39;t negotiate.</span></span>
<span class="line"><span>  {SSML_003}</span></span>
<span class="line"><span>  At this moment —</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Sent to Claude API for translation (de):</span></span>
<span class="line"><span>  Die Gleichung verhandelt nicht.</span></span>
<span class="line"><span>  {SSML_003}</span></span>
<span class="line"><span>  In diesem Moment —</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Recomposed (de):</span></span>
<span class="line"><span>  Die Gleichung verhandelt nicht.</span></span>
<span class="line"><span>  &lt;break time=&quot;700ms&quot;/&gt;</span></span>
<span class="line"><span>  In diesem Moment —</span></span></code></pre></div><p>The 700ms silence lands in German exactly where it lands in English. The emotional architecture is preserved.</p><p><strong>Local developer workflow:</strong></p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 1. Write or edit English script</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">vim</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> content/episodes/enthusiast/planets/mars.md</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 2. Submit PR — human review gate (merged to main)</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 3. Translate to a specific locale to check quality</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">./scripts/pipeline-translate.sh</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --locale</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> fr</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --script</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> .../mars.md</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 4. Review generated .fr.md — edit if needed</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># (Translation output is committed, version-controlled, reviewable)</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 5. When satisfied, run all locales</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">./scripts/pipeline-translate.sh</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --locale</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> all</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --script</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> .../mars.md</span></span></code></pre></div><p><strong>GitHub Actions trigger:</strong></p><div class="language-yaml vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># .github/workflows/translate.yml</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">on</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  push</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    paths</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;content/episodes/en/**/*.md&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    branches</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">main</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">jobs</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  translate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    strategy</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">      matrix</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        locale</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">de</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">fr</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">ja</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">zh</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">es</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">pt</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">ko</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">it</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">nl</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">pl</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    steps</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">run</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">./scripts/pipeline-translate.sh</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">              --locale \${{ matrix.locale }}</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">              --changed-only</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   # only scripts modified in this commit</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        env</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          ANTHROPIC_API_KEY</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">\${{ secrets.ANTHROPIC_API_KEY }}</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">uses</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">peter-evans/create-pull-request@v6</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        with</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          title</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;i18n: auto-translate \${{ matrix.locale }} episode updates&quot;</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          branch</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;i18n/auto-\${{ matrix.locale }}-\${{ github.sha }}&quot;</span></span></code></pre></div><p>Translations open as PRs, not direct commits. Light review before merge. The pipeline cannot silently corrupt a locale.</p><hr><h3 id="pipeline-2-·-audio-generation" tabindex="-1">Pipeline 2 · Audio Generation <a class="header-anchor" href="#pipeline-2-·-audio-generation" aria-label="Permalink to &quot;Pipeline 2 · Audio Generation&quot;">​</a></h3><p><strong>Purpose:</strong> Take a validated script (English or translated) and produce a final <code>.mp3</code> file via Google Cloud TTS. Never translates. Never calls Claude API. Reads only from <code>content/episodes/</code>.</p><p><strong>Invocation:</strong></p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Locally — generate audio for one script in one locale</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">./scripts/pipeline-audio.sh</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --locale</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> de</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --script</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> content/episodes/de/enthusiast/missions/mars/curiosity.md</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Locally — generate all audio for one locale</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">./scripts/pipeline-audio.sh</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --locale</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> en</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --all</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Locally — generate all audio for all locales (expensive — full rebuild)</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">./scripts/pipeline-audio.sh</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --all-locales</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Check what would regenerate without generating (dry run)</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">./scripts/pipeline-audio.sh</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --locale</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> en</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --all</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --dry-run</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># GitHub Actions — triggered by merge of translation PRs</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># or any change to content/episodes/**</span></span></code></pre></div><p><strong>Step-by-step:</strong></p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>1. HASH CHECK</span></span>
<span class="line"><span>   Compute SHA-256 of the .md source script.</span></span>
<span class="line"><span>   Compare against stored hash in</span></span>
<span class="line"><span>   .audio-cache/{locale}/{personality}/{id}.hash</span></span>
<span class="line"><span></span></span>
<span class="line"><span>   If hashes match → SKIP (audio is current, do not regenerate)</span></span>
<span class="line"><span>   If no hash file → GENERATE</span></span>
<span class="line"><span>   If hashes differ → REGENERATE</span></span>
<span class="line"><span></span></span>
<span class="line"><span>   This means: fixing a typo in one script regenerates</span></span>
<span class="line"><span>   only that script&#39;s audio. A full --all-locales run</span></span>
<span class="line"><span>   on an unchanged repo generates nothing.</span></span>
<span class="line"><span></span></span>
<span class="line"><span>2. SSML EXTRACTION</span></span>
<span class="line"><span>   Parse the .md script.</span></span>
<span class="line"><span>   Strip frontmatter.</span></span>
<span class="line"><span>   Strip markdown comment tags (&lt;!-- --&gt;).</span></span>
<span class="line"><span>   Output: clean SSML document wrapped in &lt;speak&gt; root.</span></span>
<span class="line"><span></span></span>
<span class="line"><span>3. VOICE SELECTION</span></span>
<span class="line"><span>   Look up voice ID from voice manifest:</span></span>
<span class="line"><span>   content/voices.json</span></span>
<span class="line"><span></span></span>
<span class="line"><span>   {</span></span>
<span class="line"><span>     &quot;en&quot;: {</span></span>
<span class="line"><span>       &quot;curator&quot;:    &quot;en-US-Neural2-D&quot;,</span></span>
<span class="line"><span>       &quot;guide&quot;:      &quot;en-US-Neural2-F&quot;,</span></span>
<span class="line"><span>       &quot;enthusiast&quot;: &quot;en-US-Neural2-J&quot;</span></span>
<span class="line"><span>     },</span></span>
<span class="line"><span>     &quot;de&quot;: {</span></span>
<span class="line"><span>       &quot;curator&quot;:    &quot;de-DE-Neural2-B&quot;,</span></span>
<span class="line"><span>       &quot;guide&quot;:      &quot;de-DE-Neural2-C&quot;,</span></span>
<span class="line"><span>       &quot;enthusiast&quot;: &quot;de-DE-Neural2-D&quot;</span></span>
<span class="line"><span>     },</span></span>
<span class="line"><span>     ...</span></span>
<span class="line"><span>   }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>   voices.json is version-controlled and manually curated.</span></span>
<span class="line"><span>   Adding a locale requires: add voice IDs, generate one</span></span>
<span class="line"><span>   test episode, listen, approve, then run full locale.</span></span>
<span class="line"><span></span></span>
<span class="line"><span>4. TTS REQUEST</span></span>
<span class="line"><span>   Google Cloud TTS API call:</span></span>
<span class="line"><span>   {</span></span>
<span class="line"><span>     input: { ssml: [extracted SSML] },</span></span>
<span class="line"><span>     voice: {</span></span>
<span class="line"><span>       languageCode: [locale],</span></span>
<span class="line"><span>       name: [voice ID from voices.json]</span></span>
<span class="line"><span>     },</span></span>
<span class="line"><span>     audioConfig: {</span></span>
<span class="line"><span>       audioEncoding: &quot;MP3&quot;,</span></span>
<span class="line"><span>       speakingRate: 0.95,   // slightly slower than default — Sagan paced, not rushed</span></span>
<span class="line"><span>       pitch: -1.0,          // slightly lower — authority register</span></span>
<span class="line"><span>       sampleRateHertz: 24000</span></span>
<span class="line"><span>     }</span></span>
<span class="line"><span>   }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>5. OUTPUT</span></span>
<span class="line"><span>   Write .mp3 to: public/audio/{locale}/{personality}/{id}.mp3</span></span>
<span class="line"><span>   Write hash to: .audio-cache/{locale}/{personality}/{id}.hash</span></span>
<span class="line"><span>   Append to generation manifest:</span></span>
<span class="line"><span>   outputs/audio-manifest-{timestamp}.json</span></span>
<span class="line"><span></span></span>
<span class="line"><span>6. MANIFEST ENTRY</span></span>
<span class="line"><span>   {</span></span>
<span class="line"><span>     &quot;locale&quot;: &quot;de&quot;,</span></span>
<span class="line"><span>     &quot;personality&quot;: &quot;enthusiast&quot;,</span></span>
<span class="line"><span>     &quot;id&quot;: &quot;curiosity&quot;,</span></span>
<span class="line"><span>     &quot;source_hash&quot;: &quot;a3f2...&quot;,</span></span>
<span class="line"><span>     &quot;output_path&quot;: &quot;public/audio/de/enthusiast/missions/curiosity.mp3&quot;,</span></span>
<span class="line"><span>     &quot;duration_seconds&quot;: 178,</span></span>
<span class="line"><span>     &quot;file_size_bytes&quot;: 2840432,</span></span>
<span class="line"><span>     &quot;generated_at&quot;: &quot;2026-05-16T14:23:00Z&quot;,</span></span>
<span class="line"><span>     &quot;voice_id&quot;: &quot;de-DE-Neural2-D&quot;,</span></span>
<span class="line"><span>     &quot;tts_chars_used&quot;: 4821   ← tracked for free tier monitoring</span></span>
<span class="line"><span>   }</span></span></code></pre></div><p><strong>Free tier monitoring:</strong></p><p>Google Cloud TTS WaveNet: 1M chars/month free. The manifest accumulates <code>tts_chars_used</code> per run. A summary step at the end of each Actions run posts the month-to-date usage to the job summary. If projected monthly usage exceeds 800k chars (80% of free tier), the pipeline warns and halts non-priority generation.</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># End of pipeline-audio.sh</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">month_chars</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">$(</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">sum_manifest_chars_this_month</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [ $month_chars </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">-gt</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 800000</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ]; </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">then</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  echo</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;⚠ WARNING: </span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">$month_chars</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> / 1,000,000 WaveNet chars used this month&quot;</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  echo</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;Halting non-priority scripts. Run with --force to override.&quot;</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  exit</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">fi</span></span></code></pre></div><p>Priority scripts (defined in <code>content/priority-episodes.txt</code>) always generate regardless of quota. Non-priority scripts halt.</p><p><strong>Local developer workflow:</strong></p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># After translation PR is merged, generate audio locally to QA before CI runs</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">./scripts/pipeline-audio.sh</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --locale</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> de</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --script</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> .../curiosity.md</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Play it</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">afplay</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> public/audio/de/enthusiast/missions/curiosity.mp3</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   # macOS</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">mpv</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    public/audio/de/enthusiast/missions/curiosity.mp3</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   # Linux</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># If it sounds wrong — fix the translation script, re-run pipeline 1,</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># then re-run pipeline 2. Hash mismatch → regeneration automatic.</span></span></code></pre></div><p><strong>GitHub Actions trigger:</strong></p><div class="language-yaml vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># .github/workflows/generate-audio.yml</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">on</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  push</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    paths</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;content/episodes/**/*.md&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    branches</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">main</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">jobs</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  generate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    strategy</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">      matrix</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        locale</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">en</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">de</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">fr</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">ja</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">zh</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">es</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">pt</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">ko</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">it</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">nl</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">pl</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    steps</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">run</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">./scripts/pipeline-audio.sh</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">              --locale \${{ matrix.locale }}</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">              --changed-only</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        env</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          GOOGLE_TTS_API_KEY</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">\${{ secrets.GOOGLE_TTS_API_KEY }}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">Upload audio artifacts</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        uses</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">actions/upload-artifact@v4</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        with</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">audio-\${{ matrix.locale }}</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          path</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">public/audio/\${{ matrix.locale }}/</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">Commit generated audio</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        uses</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">stefanzweifel/git-auto-commit-action@v5</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        with</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          commit_message</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;audio: regenerate \${{ matrix.locale }} episodes&quot;</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          file_pattern</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;public/audio/\${{ matrix.locale }}/**/*.mp3</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">                         .audio-cache/\${{ matrix.locale }}/**/*.hash&quot;</span></span></code></pre></div><p>Audio files are committed to the repo alongside the code. They are large but static — they do not change unless scripts change. Git LFS is recommended for the <code>public/audio/</code> directory.</p><p><strong>Git LFS configuration:</strong></p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># .gitattributes</span></span>
<span class="line"><span>public/audio/**/*.mp3 filter=lfs diff=lfs merge=lfs -text</span></span></code></pre></div><hr><h3 id="pipeline-interaction-—-the-full-flow" tabindex="-1">Pipeline Interaction — The Full Flow <a class="header-anchor" href="#pipeline-interaction-—-the-full-flow" aria-label="Permalink to &quot;Pipeline Interaction — The Full Flow&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>                    ┌──────────────────────────────────────────┐</span></span>
<span class="line"><span>                    │           DEVELOPER WRITES               │</span></span>
<span class="line"><span>                    │   content/episodes/en/.../{id}.md        │</span></span>
<span class="line"><span>                    └────────────────┬─────────────────────────┘</span></span>
<span class="line"><span>                                     │ PR + human review</span></span>
<span class="line"><span>                                     ▼</span></span>
<span class="line"><span>                    ┌──────────────────────────────────────────┐</span></span>
<span class="line"><span>                    │              MERGE TO MAIN               │</span></span>
<span class="line"><span>                    └──────┬───────────────────────────────────┘</span></span>
<span class="line"><span>                           │</span></span>
<span class="line"><span>              ┌────────────┴──────────────┐</span></span>
<span class="line"><span>              │                           │</span></span>
<span class="line"><span>              ▼                           ▼</span></span>
<span class="line"><span>   PIPELINE 1 triggers               PIPELINE 2 triggers</span></span>
<span class="line"><span>   (path: content/episodes/en/)      (path: content/episodes/en/)</span></span>
<span class="line"><span>              │                           │</span></span>
<span class="line"><span>              │  translates to            │  generates en audio</span></span>
<span class="line"><span>              │  all locales              │  from changed scripts</span></span>
<span class="line"><span>              │  opens PRs               │</span></span>
<span class="line"><span>              ▼                           ▼</span></span>
<span class="line"><span>   i18n PRs reviewed              public/audio/en/.../{id}.mp3</span></span>
<span class="line"><span>   + merged                       committed to main</span></span>
<span class="line"><span>              │</span></span>
<span class="line"><span>              ▼</span></span>
<span class="line"><span>   PIPELINE 1 merged</span></span>
<span class="line"><span>   content/episodes/{locale}/</span></span>
<span class="line"><span>              │</span></span>
<span class="line"><span>              ▼</span></span>
<span class="line"><span>   PIPELINE 2 triggers</span></span>
<span class="line"><span>   (path: content/episodes/{locale}/)</span></span>
<span class="line"><span>              │</span></span>
<span class="line"><span>              ▼</span></span>
<span class="line"><span>   public/audio/{locale}/.../{id}.mp3</span></span>
<span class="line"><span>   committed to main</span></span></code></pre></div><p>English audio and translated audio follow the same Pipeline 2 path. The only difference is locale. The pipeline does not know or care whether its input is English or translated — it reads the script, checks the hash, calls TTS, writes the file.</p><hr><ol><li><p><strong>Ambient audio bed.</strong> Should episodes play over generative space ambience, silence, or a minimal licensed music bed? This affects the emotional register significantly. Recommend silence for Phase 2, ambient for Phase 3.</p></li><li><p><strong>Waveform visualiser.</strong> The &quot;Now Playing&quot; UI needs a waveform animation. Pure CSS animated bars vs. Web Audio API real-time analysis. Real-time is more alive but adds JS complexity.</p></li><li><p><strong>Context sensitivity.</strong> Should the panel play button auto-pause a running screen episode, or allow both? Recommend: auto-pause with resume on panel close.</p></li><li><p><strong>Voice identity.</strong> The personality names (Curator, Guide, Enthusiast) are internal labels. Do they surface to the user, or does the user just experience the voice change as natural to the context?</p></li><li><p><strong>Script attribution.</strong> Claude Code generates first drafts. Human edits happen. What is the credit model in the product?</p></li></ol><hr><h2 id="consequences" tabindex="-1">Consequences <a class="header-anchor" href="#consequences" aria-label="Permalink to &quot;Consequences&quot;">​</a></h2><p><strong>If accepted:</strong></p><ul><li>New Phase 2 implementation slice added: <code>SLICE-07 Science Overlay &amp; Episode System</code></li><li>ADR required: TTS platform choice (Google Cloud TTS vs. alternatives)</li><li>ADR required: script generation pipeline (Claude Code + human review gate)</li><li>PRD-07 drafted: full feature specification</li><li>UXS-07 drafted: Science Overlay interaction design</li></ul><p><strong>If rejected:</strong></p><ul><li>Science Overlay does not ship in Phase 2</li><li>No audio episodes</li><li>The product remains visually rich but silent</li></ul><hr><p><em>RFC-07 · Science Overlay &amp; Episode System · May 2026 · PROPOSED</em></p>`,140)])])}const u=a(t,[["render",p]]);export{k as __pageData,u as default};
