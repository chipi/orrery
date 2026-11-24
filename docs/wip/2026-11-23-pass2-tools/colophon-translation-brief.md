# Brief: translate /colophon entries (used for the 3D models, 2026-11-23)

For another section, replace `models3d` below with that section and `<todo-dir>` with your scratchpad folder.

Repo: /work/orrery/worktrees/0.9.5. You translate for the locales named in your task. Files you
may edit: `i18n-src/<loc>/original-work.json` for your locales only, and only its `models3d`
section. No commits, no installs, no other files, never `git stash`, never run prettier on other
files, never start or kill processes.

## Input
`<todo-dir>/<loc>.todo.json`:
`{ "<key>": { "title"?, "what"?, "where"? } }` — the English of every field to write (new
entries, or fields whose English changed). Write each field's translation into
`i18n-src/<loc>/original-work.json` → `models3d["<key>"]["<field>"]`, creating the entry when it
is missing and keeping the entry's other fields. Do it with a small node script that reads your
translations from a JSON file you write in `<todo-dir>` (`<loc>.done.json`, same
shape as the todo) and merges them; write the file with `JSON.stringify(obj, null, 2) + '\n'`.

## How to translate
- These are colophon captions for 3D models of spacecraft: `title` = the craft's name, `what` =
  one sentence on what the model shows, `where` = where on the site it is drawn.
- **Names**: use the name the site already uses in that language for the craft —
  `i18n-src/<loc>/fleet/<category>/<fleet-id>.json` → `name` (find the file by the fleet id in
  the key, `model-showcase-<fleet-id>_webp`; `grep -rl` for it). No overlay name → keep the
  English name. A group title like "Lunar Orbiter 1–5 (5 variants)": translate the words, keep
  the names.
- **`where`**: the same English `where` string must get the same translation everywhere. The
  existing entries in your locale's `models3d` already translate the parts ("Fleet", "line-up",
  "Fly", "craft page", "descent") — reuse their wording exactly; read 10+ existing entries
  first.
- **Terms**: `scripts/i18n-tools/native-terms.json` → `term` holds the site's binding form per
  locale for technical terms (orbiter, lander, heat shield, solar array, high-gain antenna,
  parachute …). Use the binding (`<loc>` value) when the English uses that term. Check it for
  every term you translate.
- Keep instrument names, acronyms, units and numbers exactly as in the English (LROC, SuperDraco,
  RTG, 2.3 m — locale decimal style only if the existing entries do it).
- Natural, plain, accurate; no additions, no omissions; one sentence stays one sentence.
- Match the style of the existing translated `what` entries in the same file.

## Validate before reporting
- Every todo field written (a script: for each todo key/field, the locale value exists and is
  not the English unless it is a name kept in English) — print the count.
- `npx prettier --check i18n-src/<loc>/original-work.json` for each of your locales (if it
  fails, `npx prettier --write` that file only).
- The file parses as JSON.

## Report (concise)
Per locale: fields written / todo; names kept in English; any term you could not settle.
