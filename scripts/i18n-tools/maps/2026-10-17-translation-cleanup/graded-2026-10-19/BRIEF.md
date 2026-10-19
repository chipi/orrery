# Grading brief (item 4 sample, seed 29)

Input: sample4/<loc>.md — per segment `## <segment> — N strings in segment, K sampled`, then items `### <ID> \`<ref>\``, `EN: …`, `<loc>: …`.

Grade every item against its English:
- OK — correct meaning, natural, rules kept.
- MINOR — understandable but awkward, a small wrong word, a stylistic/terminology slip, punctuation/script nit.
- BROKEN — wrong meaning, dropped or added content, garbled/machine-like text, English left in running text, wrong number/unit, a name rule broken in a way a reader would notice.

Name rules (do not grade as errors what these require):
- People, places, astronomical bodies and science terms take the target language's native form (Wikipedia form).
- Built things (spacecraft, rockets, instruments), agencies (NASA, ESA …) and acronyms stay in Latin as in the English — except in their origin language (ru Союз, zh 嫦娥/天宫, ja はやぶさ …).
- A Latin gloss in parentheses right after the native term is fine. Formula variables and link targets stay as in English.
- ru / sr-Cyrl: no case endings glued onto Latin names. Each language uses its own ISS abbreviation (sr МСС, pt EEI, it SSI).

Output JSON (python3 json.dump, ensure_ascii=False, indent=1) to sample4/graded-<loc>.json:
{"locale": "<loc>", "segments": {"<segment name exactly as in the ## line>": {"sampled": K, "ok": n, "minor": n, "broken": n}, …},
 "findings": [{"id": "<ID>", "key": "<ref>", "grade": "MINOR|BROKEN", "issue": "<one sentence>", "fix": "<the full corrected <loc> string>"}]}
Only MINOR and BROKEN items go into findings; each needs a full corrected string in "fix" (keep link targets, numbers and markdown exactly).
