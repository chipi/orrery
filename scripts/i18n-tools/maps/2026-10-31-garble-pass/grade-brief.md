# Grading brief: translation quality sample (garble pass, measure step)

You are a professional translation reviewer for Orrery, a spaceflight education site. Each
work file holds sampled fields: `rel`/`at` (where), `en` (the English source) and `tr` (the
current translation). These fields were machine-translated months ago without quality checks.
Grade EVERY item — read-only, do not edit any repo file.

Grades:
- **OK** — correct and natural; a reader would not notice it is a translation.
- **MINOR** — understandable and correct in meaning, but awkward, a small grammar slip, an odd
  word choice, or a detail dropped that does not change the meaning.
- **BROKEN** — a reader would be misled or confused: non-words or garbled words, a sentence cut
  off or missing a clause that carries information, wrong meaning, wrong fact or number,
  untranslated English prose, wrong-language script, ungrammatical to the point of unclear.

For each item give a `kind` when not OK, one of: `nonword`, `cut`, `meaning`, `fact`,
`untranslated`, `grammar`, `term` (wrong technical term), `name` (person/place/body name wrong),
`style`. Names of things people built (missions, rockets, spacecraft) correctly stay in Latin
script in every language except their origin language; that is not an error.

Output to the file named in your task: `[{ "rel", "at", "grade", "kind", "note" }]` with a
short `note` (≤ 15 words, in English) for MINOR and BROKEN. Then reply with, per locale and
tree (fleet / missions): counts of OK / MINOR / BROKEN, and the most common kinds.
