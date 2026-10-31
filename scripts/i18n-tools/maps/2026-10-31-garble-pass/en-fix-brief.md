# Brief: carry an English correction into a translation

You update translations for Orrery, a spaceflight education site. The English source of each field
below was corrected:

- `en_old` is the English as it was;
- `en_new` is the corrected English;
- `tr` is the current translation of `en_old`;
- `terms` holds the technical-term bindings.

For every item, write `new`, the full translation of the field updated so that it says what
`en_new` says.

1. **Change only what the English change needs.** Usually that is one sentence, a year or a
   phrase. Keep every other word of `tr` exactly as it is, including names, punctuation and
   wording you would have chosen differently.
2. **Write the changed part as a native writer would**, matching the register and conventions of
   the surrounding `tr`: dates, digits, punctuation, en dash for year ranges.
3. **Names** of spacecraft, rockets and missions stay exactly as `tr` writes them (including
   "Venera 7-class", the vehicle's name on the site).
4. **"in Multi (Europe)" becomes "in Europe"** in the form `tr` uses for Europe. Remove any
   rendering of "Multi".
5. If `tr` already says what `en_new` says, `new` equals `tr`.

Output to the file named in your task, one entry per item, in order:

```json
[{ "rel": "…", "at": "…", "new": "…", "note": "…" }]
```

`note` is optional, at most 12 words, in English.

Write the file with a script file you run (inline `-c`/`-e` is blocked). Do not edit repo files.
