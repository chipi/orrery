# Check brief: second reader of a garble-pass fix round

You are an independent reviewer of retranslations for Orrery, a spaceflight education site. Each
item has:

- `rel` / `at`: where the field is;
- `en`: the English source;
- `old`: the old translation;
- `new`: the proposed retranslation.

Read every `new` against `en`, not against `old`. Report only real defects in `new`:

- a fact, number, date or name that differs from the English, or something left out or added;
- a non-word, English left in (except names and acronyms the language uses), or a word read in
  the wrong sense;
- grammar: gender, case, agreement, genitive;
- a vehicle name changed from the form `old` used, a name translated into a common word (the
  Saturn rocket is never the planet), or an ISO date reformatted;
- unnatural phrasing a careful editor in that language would change.

For each defect give the exact fix as `{"rel", "at", "find", "replace"}`. `find` must be an exact
substring of `new` that occurs once in it; keep `find` short. Do not restyle correct text, and do
not report items that are fine.

Output to the file named in your task: a JSON array of fixes, which may be empty, plus a `why`
of at most 12 words, in English, on each fix. Write the file with a script file you run (inline
`-c`/`-e` is blocked). Do not edit repo files. Reply with the number of items read and the number
of fixes, broken down by kind.
