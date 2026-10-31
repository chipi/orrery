# Brief: fix technical space terms in translated pages

Template for a term fix round (skill `term-consistency` §B). Replace `/tmp/claude-1000/-work-orrery-main/d7d0bd49-90bf-49bb-93a1-b2db4e87e888/scratchpad/missions-r1/work` with
the round's work folder and `missions` with the tree (science, essays, missions, fleet,
programs) before handing it to a subagent.

You are a professional translator/reviewer. Orrery's missions pages were translated
without a terminology glossary, so the same technical term is rendered several ways
(e.g. a rocket *burn* — an engine firing — became "braking", "combustion" or a skin
burn). The site now has binding forms. Your job: for every field in your work file,
decide whether the translation must change to use the binding form, and if so give
the smallest exact edit.

Read-only on the repo: do not edit any repo file. Write ONLY your output files.

## Input

`/tmp/claude-1000/-work-orrery-main/d7d0bd49-90bf-49bb-93a1-b2db4e87e888/scratchpad/missions-r1/work/<loc>.json`
— an array of fields. Each has `rel` (file), `at` (key path), `en` (English source),
`current` (the translation now), and `terms`: for each technical term the English
uses there, its `sense`, the `binding` form for this locale and `accepted_stems`
(regex stems that already count as correct, incl. inflections).

These fields were flagged because the translation contains none of the accepted
stems for that term. Many are real drift; some are fine (the term is rendered by a
pronoun or omitted naturally, or the English word is used in a different sense
here — e.g. "burn fuel" meaning combustion, "stage" meaning phase).

## Decide per field and term

- **keep** — the translation is correct as is (natural omission, pronoun, a correct
  synonym in this context, or the English uses another sense). Say why in a few words.
  If the field DOES use the binding form or an accepted variant and the stems just do
  not recognise it (an inflection, a compound, a prefix), write the reason as
  `stem gap: <the exact word in the text>` — the glossary gets widened instead.
- **change** — the term is rendered wrongly or inconsistently. Replace that rendering
  with the binding form, inflected and agreeing grammatically (case, gender, number,
  articles, particles). Change nothing else in the sentence except what grammar
  forces around the replaced words.

Do not "correct" a form that is a normal, correct word for the sense — say keep and
name it as an accepted variant (`variant: <word>`). Do not add words or clauses the
English does not need.

Never: rewrite style, translate link targets `(…)` inside markdown links, change
numbers/units/names, or touch text unrelated to the term. Keep markdown intact.

## Output — `/tmp/claude-1000/-work-orrery-main/d7d0bd49-90bf-49bb-93a1-b2db4e87e888/scratchpad/missions-r1/work/<loc>-edits.json`

```json
[
  {"rel": "...", "at": "...", "term": "burn", "decision": "change",
   "find": "exact substring of `current` (unique in it, as short as possible but unambiguous)",
   "replace": "the replacement text", "why": "short"},
  {"rel": "...", "at": "...", "term": "stage", "decision": "keep", "why": "short"}
]
```

One object per (field, term) pair. For `change`, `find` must occur EXACTLY ONCE in
`current` (include a few surrounding words if needed). If a field needs two separate
replacements for the same term, give two objects. If replacements in the same field
overlap, merge them into one object.

Work through the WHOLE file. Then reply briefly: per locale, counts of keep / change,
and the 3 most common wrong renderings you replaced.
