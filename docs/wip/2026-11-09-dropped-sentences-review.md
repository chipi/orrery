# Dropped-sentences finder: reviewed exceptions (2026-11-09)

26 fields flagged by `scripts/i18n-tools/dropped-sentences.mjs`. Each was compared sentence by sentence with en-US.
Format: locale, tree, file, field, verdict, reason.

- nl, fleet, observatory/jwst.json, description: restored sentence (text was cut after "goud-gecoate": primary mirror and sunshield clause restored)
- ru, mars-sites, curiosity.json, fact: restored words ("Mt." and "billion-year-by-billion-year"); finder misfire as well: English "Mt. Sharp" splits into an extra sentence at "Mt."
- de, science, mission-phases/edl.json, narrative_101.1: restored words ("to slow the rest of the way"); finder misfire: steps joined by semicolon/colon
- de, science, propulsion/_intro.json, paragraphs.0: restored words ("pronounced delta-v", "single number"); finder misfire: sentences joined by comma/dash
- de, science, propulsion/expander-cycle.json, intro_sentence: restored words ("own nozzle", "reliable"); finder misfire: sentences joined by dash/semicolon
- de, science, scales-time/frames.json, narrative_101.2: restored words ("handoff ... patched-conics trick", "and sticks to it"); finder misfire: sentences joined by colon/semicolon
- de, science, scales-time/frames.json, body_paragraphs.0: restored words ("all most naturally described here"); finder misfire: sentences joined by colon
- de, science, scales-time/sidereal-synodic.json, narrative_101.2: restored words ("both planets keep moving"); finder misfire: sentences joined by colon/dash
- ko, science, planets/planetary-stats.json, intro_sentence: restored word ("really"); finder misfire: two short sentences joined by comma
- zh-CN, essays, asteroid-mining.json, body.25.md: false positive; CJK sentence joining (last two sentences merged with a dash/comma), nothing missing
- zh-CN, essays, comms.json, body.23.md: false positive; CJK sentence joining (sentences merged with a colon), nothing missing
- ja, fleet, launcher/h3.json, description: false positive; sentences joined by the Japanese comma, terse language, nothing missing
- zh-CN, programs, iss.json, the_land.1.md: false positive; CJK sentence joining ("But ... It is that ..." merged by colon), nothing missing
- de, science, mission-phases/_intro.json, paragraphs.1: false positive; sentences joined by commas/dash, nothing missing
- de, science, orbits/keplers-laws.json, narrative_101.0: false positive; sentences joined by commas, nothing missing
- de, science, orbits/semi-major-axis.json, body_paragraphs.1: false positive; short sentences ("Form egal, Inklination egal") merged by comma, nothing missing
- de, science, scales-time/frames.json, body_paragraphs.1: false positive; sentences merged by semicolon, nothing missing
- de, science, transfers/gravity-assist.json, narrative_101.0: false positive; sentences joined by dash/colon notation ("Sonde = Tennisball"), nothing missing
- de, science, transfers/patched-conics.json, body_paragraphs.0: false positive; sentences joined by dash, nothing missing
- ja, science, propulsion/fusion-propulsion.json, body_paragraphs.0: false positive; Japanese joins the last two sentences with a dash, nothing missing
- zh-CN, science, life-in-space/bone-density-loss.json, body_paragraphs.0: false positive; CJK sentence joining by colon, nothing missing
- zh-CN, science, life-in-space/vestibular-adaptation.json, body_paragraphs.0: false positive; CJK sentence joining by comma, nothing missing
- ar, science, life-in-space/crew-dynamics-psychology.json, intro_sentence: false positive; two sentences joined by colon, nothing missing
- ar, science, observation/wormholes.json, body_paragraphs.3: false positive; sentences joined by colon/dash, nothing missing
- ar, science, transfers/hohmann-transfer.json, narrative_101.0: false positive; sentences joined by comma, nothing missing
- zh-CN, site-stories, opportunity.json, chapters.1.images.2.caption: false positive; caption sentence joined by comma after the dash, nothing missing
