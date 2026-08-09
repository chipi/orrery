# Physics Lab — draft visual anchors (UXS-015)

These three HTML files are the **visual anchor** for the Physics Lab epic (#458), authored alongside **UXS-015**. They are house-accurate mockups (real design tokens, Bebas Neue / Space Mono / Crimson Pro, the `station-blueprint` teal grid, KaTeX) used to lock the look before build.

| File | View | UXS-015 §|
|---|---|---|
| `notebook.html` | Notebook — the v1 home (ordered, narrated worksheet) | §Notebook |
| `focus.html` | Focus — one card full-screen (figure stage + control rail) | §Focus |
| `canvas.html` | Canvas — the T2 prototyping/wiring workspace | §Canvas |

**These are drafts, not ground truth.** Unlike the canonical six prototypes (`P01`–`P06`), which are the design/physics source of truth (PA §principles "the prototype is ground truth"), these are *kickoff mockups*:

- **Numbers and figures are illustrative placeholders**, hand-drawn to shape — **not** live kernel output.
- They pull fonts + KaTeX from a CDN (online only).
- They will be **superseded** by the real `/lab` route when **S3** ships; at that point these can be deleted.

See **UXS-015** for the spec and **RFC-037** for the technical contracts.
