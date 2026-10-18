# Names with no glossary entry, reported by the item 3 reviewers

Left as the current text has them (not invented). Looked up in batches (one Wikipedia
langlinks request per ≤50 titles) and added to native-terms.json, then glossary-apply.

## From group 8 (ko missions)
- People: Vance Brand, Deke Slayton, Rusty Schweickart, Joseph Kerwin, Paul Weitz, Owen
  Garriott, Jack Lousma, Sian Proctor, Hayley Arceneaux, Chris Sembroski, Sarah Gillis,
  Anna Menon, Oliver Daemen, John F. Kennedy, Nick Howes, Hannes Alfvén (Alfvén surface),
  William Boynton, William Feldman (citation: leave)
- Places: Utah, Midway, Cocoa (Florida), Chicago, Boston, Hutchinson (Kansas), Dayton (Ohio),
  Washington, D.C., Saratov Oblast, Korolyov (city), Marevka, Bayevo, Altai Krai, Crimea,
  Kazakhstan
- Features: Himeros (Eros), Nightingale (Bennu), Occator (Ceres), Torifune, Eagle /
  Endurance / Victoria / Troy (Mars), Hadley–Apennine, Great Dark Spot, Selam, Queta
- Terms: Kármán line, Churyumov–Gerasimenko (comet 67P)

Looked up 2026-10-18 (one request): item3/names-g8-langlinks.json. Not merged yet:
homonyms need guards (Eagle = Apollo 11 LM, Endurance = Crew Dragon, Victoria, Brand),
zh titles partly traditional (中途島, 哈欽森, 堅忍, 卡門線, 科羅廖夫) need simplified forms.

## From group 9 (hi missions)
- New: Dinkinesh, Selam, Queta, Geographos, 253 Mathilde, 2867 Steins, Le Monnier (hi), Endeavour crater, Taurus, Urals, Comet Kohoutek, Doppler; Karaganda (set to Latin pending a glossary form)

## English source issues reported by reviewers (to check against sources after item 3)
- fleet boilerplate descriptions (Hakuto-R, Mars Polar Lander, Vikram, …): "informs the redemption-arc layer of the shuttle and Mir epoch" — meaningless in English; needs rewriting at the source.
- fleet (ko batch 1): Starlink "~6,500–7,000" vs "over 10,800" in another field; LE-7A calls ALOS a "JAXA-ISRO radar satellite" (ALOS is JAXA).
- fleet (ru batch 2): Mercury-Atlas 6–10 described as "six flights" (6–10 is five); Viking 1 entry says "first of which was STS-51-L"; Apollo 8, 9, 11–17 listed as lunar missions (Apollo 9 was Earth orbit).

## From group 11 (ru fleet)
- Xi'an, Sichuan, Siziwang Banner, Surgut, Vernadsky Institute, von Braun, Boca Chica, Bay of Bengal, Centre Spatial Guyanais, NIIP-53, Lesobaza / SK-1, Sarafanov, Demin, Zholobov, Glazkov, Zudov, Rozhdestvensky, Lake Tengiz, Dunhuang, Psyche (asteroid)

## From group 10 (ar missions)
- Taurus (كوكبة الثور, reviewer-written), Faulkes Telescope, Linda Salzman Sagan (no ar form), Dinkinesh (no ar form), Siberia, leucite (term)

## From groups 12–13 (ja, zh-CN fleet)
- Gubarev, Grechko, Klimuk, Sevastyanov, Lazarev, Makarov, Rosalind Franklin, Copernicus (crater), Cerealia Facula, Jawahar Sthal, Goldstone, Marshall Space Flight Center, von Braun (bare), Darwin, Mössbauer, Rogers Commission, Captain Cook, 4179 Toutatis, Apophis

## From groups 14–15 (ko, sr-Cyrl fleet)
- Russian cosmonauts with no sr/ko forms (priority, recur in every locale): Dobrovolski, Volkov, Patsayev, Pavel Popovich, Yury Artyukhin, Sarafanov, Demin, Gubarev, Grechko, Klimuk, Sevastyanov, Lazarev, Makarov, Volynov, Zholobov, Gorbatko, Glazkov, Zudov, Rozhdestvensky, Vladimir Dzhanibekov, Viktor Savinykh; Zhai Zhigang; Gordon Fullerton (sr); Frank Drake (sr: Френк Дрејк unverified)
- Places: Zhukovsky, Speyer, Sinsheim, Edwards AFB, Texas, Los Angeles, New York, Bahrain, Luxembourg, Udvar-Hazy, Beijing, Bay of Bengal
- sr-Cyrl has no ORIGIN_NAMES block: Soviet/Russian built names stay Latin in sr (correct by rule — not Serbian origin)

## From group 21 (ko science)
- Looked up 2026-10-18 (one request): item3/names-g21-langlinks.json — Isaac Newton, Walter Hohmann, Johann Heinrich Lambert, Édouard Roche, James Van Allen, Christian Doppler, Edwin Hubble, Frank Drake, Donald J. Kessler, George William Hill, Kazimierz Kordylewski. Bare keys needed (Newton, Hohmann, Lambert, Roche, Van Allen, Doppler, Hubble — homonym: Hubble telescope is a built thing, guard it). Scott Kelly lookup hit a different QID (Q4219130 vs glossary Q362190) — not merged.
- Places with no glossary form, left Latin on the ko site: Goldstone, Madrid, Canberra (DSN), Parkes, Usuda, Mauna Kea, Padua, Cologne, Tsukuba, Krasnoyarsk, Hawthorne, Star City, Hammaguir
- Features/people: Shackleton, de Gerlache, Haworth, Faustini, Shoemaker (craters), Carrington, Sabatier, Penning, Hall (effect), Yarkovsky, Milankovitch, Epstein–Barr, Kornienko, Kononenko, Frank Rubio, Vande Hei, Mark Kelly, Jose Fernandez, Robert Forward, Yuri Milner, Brent Tully, Laniakea, Albion, Dinkinesh
- English source (reviewers): planetary-stats says Saturn has "lower-than-Earth gravity" next to 1.07 g; active-spacecraft-survey says Europa Clipper "launches 2024" (launched Oct 2024).

## From group 24 (de science)
- German unit symbol: AE, not AU (the 2026-10-18 grader flags "AU" in de; de.wikipedia uses AE). Group 24 outputs use AE; the rest of the de site still has ~99 "<number> AU" — sweep after item 3 (de only, digits + AU only; "AU Mic" etc. are names).
- Astronomical-unit symbol is mixed per locale (2026-10-18 counts after a number): es 49 AU / 66 UA (science now UA), it 84 AU / 28 UA, fr 30 AU / 82 UA, pt-BR 57 AU / 55 UA, nl 109 AU / 2 AE, de now AE in science. Pick each locale's standard symbol (check its grader file first) and sweep once after item 3.
- it: gravity assist = fionda gravitazionale (graded 2026-10-18 fix; it.wikipedia title). Science group 26 uses it; the rest of the it site has ~45 'assistenza gravitazionale' — sweep after item 3 (elisions: l'/un'/dell'/all'assistenza → la/una/della/alla fionda).
- it: Pallas / Hygiea (it.wikipedia '2 Pallas', '10 Hygiea'; Q3002, Q2640) — add it forms to the glossary; the site still has Pallade 1 and Igea 2.
- English source (ja essays reviewers): interstellar-exploration body.4 says 61,000 km/h takes you London→Sydney "in under a minute" (it is ~17 minutes); going-to-the-moon body.19 links [Luna 2](/missions?id=luna9) — the path should be luna2.
- ja: Lambert problem = ランベルト問題 (ja.wikipedia ヨハン・ハインリヒ・ランベルト); 4 'Lambert問題' left outside the essays — sweep with the Lambert glossary key.
  (ja and zh-CN essays now follow the English path luna9 — when the English link is fixed to luna2, sweep every locale's going-to-the-moon body.19.)
- zh-CN ORIGIN_NAMES: LandSpace 蓝箭航天 (Q48772158), iSpace 星际荣耀 (Q56692271) added 2026-10-18; Hyperbola-3 (双曲线三号?) has no en.wikipedia article to source a form — kept Latin, needs a source.
- hi: Bengaluru = बेंगलुरु (hi.wikipedia, Q1355) used in essays; Byalalu (Q5003923) has no hi form — kept Latin. Indian Deep Space Network = भारतीय गहन अंतरिक्ष नेटवर्क (hi.wikipedia) if it ever needs a native form.
