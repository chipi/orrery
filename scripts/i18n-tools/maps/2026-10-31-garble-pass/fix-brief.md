# Fix brief: garble pass, retranslate step (one locale × tree)

You are a professional translator and reviewer for Orrery, a spaceflight education site. Your
work file holds fields whose translation was machine-written months ago without quality checks:

- `rel` / `at`: where the field is;
- `en`: the current English source (it may have changed since the translation was made);
- `tr`: the current translation;
- `terms`: the technical-term bindings that apply to this English.

Read every item against the English and decide one of:

- **keep**: correct, complete and natural. The English and the translation say the same facts.
  Leave good text alone; do not restyle it.
- **retranslate**: anything else. Examples are non-words, English left in, a cut or missing
  clause, a wrong term, a wrong meaning, a stale translation that no longer says what the English
  says, clumsy grammar, or a word read in the wrong sense. Write the **whole field anew from the
  English**. Never patch it.

Rules for a retranslation:

1. **Same facts, nothing dropped, nothing added.** Every number, date, name and clause of the
   English is in it. Never shorten by cutting content.
2. **Technical terms:** use exactly the binding form in `terms`, inflected as the grammar needs.
   Never use a form listed after "never".
3. **Names:**
   - Missions, spacecraft, rockets, programmes and designations (STS-61, OV-105, Canadarm2,
     Saturn V, "Venera 7-class") keep the form the current `tr` uses. That is the English form,
     except in the vehicle's origin language, where it is the native script: ru «Союз», zh 神舟,
     hi चंद्रयान. Never translate a name into a common word: the Saturn rocket is never the
     planet's name in the local language.
   - Bodies, places and people take the form the current `tr` uses when it is a real word of the
     language (Maan, Mars, Jupiter).
   - Dates stay in the format the English uses (ISO `1986-03-14` stays ISO).
4. **Markdown links:** keep `[text](target)`. Translate the text only; the target stays exactly
   the same.
5. **Length:** fleet `tagline` is at most **140 characters**, and a mission milestone `label` at
   most **80**. For other fields stay close to the
   English length. If the English cannot fit in 140, write it more concisely (shorter words, no
   filler), but keep every fact.
6. **No English left in** a retranslation ("comsats", "heavy-lift", "roam", "return-to-flight").
   The exceptions are names and the acronyms the language really uses (ISS, LEO, GTO). Check
   gender, case and genitive agreement on every noun you touch: the nl pilot's hand fixes were
   mostly these.
7. **Register:** natural, factual, the way a good popular-science site in that language writes.
   Keep the punctuation conventions of the language. Keep `—`, `+` and `·` where the English uses
   them as separators.

Output to the file named in your task:

```json
[{ "rel", "at", "decision": "keep" | "retranslate", "grade": "OK" | "MINOR" | "BROKEN",
   "kind": "…", "new": "…", "note": "…" }]
```

- One entry per item, in order.
- `grade` is the grade of the current `tr`, using the garble-pass grading brief.
- `kind` is required when the grade is not OK.
- `new` is the full replacement, required only for retranslate.
- `note` is at most 12 words, in English.

Write the file with a script (python3 or node) that you run from a file; inline `-c`/`-e` is
blocked. Then reply with counts: keep / retranslate, and OK / MINOR / BROKEN.
