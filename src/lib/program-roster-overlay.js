// Locale text for a program's roster rows. The English lives in the base record
// (static/data/programs/{id}.json); a locale overlay carries only the rows it translates,
// as `roster: { "<rosterKey>": { note?, name? } }`. Plain JS so the Node scan and
// manifest scripts import the same key function the page uses.

/**
 * Stable key of a roster row: a linked row by `ref:linked_id` (a mission and its craft
 * share an id), a name-only row by its English name. Never the array index, so a row
 * inserted or moved keeps its translation.
 * @param {{ linked_id?: string, ref?: string, name?: string }} row
 * @returns {string}
 */
export function rosterKey(row) {
  return row.linked_id ? `${row.ref ?? ''}:${row.linked_id}` : (row.name ?? '');
}

/**
 * The roster with the overlay's text laid over it. `note` is replaced on any row; `name`
 * only on a name-only row (a linked row's name comes from the linked entry). A row the
 * overlay does not mention, and an overlay key with no row, are left alone.
 * @template {{ linked_id?: string, ref?: string, name?: string, note?: string }} R
 * @param {R[]} roster
 * @param {Record<string, { name?: string, note?: string }> | undefined} overlay
 * @returns {R[]}
 */
export function mergeRoster(roster, overlay) {
  if (!overlay) return roster;
  return roster.map((row) => {
    const o = overlay[rosterKey(row)];
    if (!o) return row;
    return {
      ...row,
      ...(o.note ? { note: o.note } : {}),
      ...(!row.linked_id && o.name ? { name: o.name } : {}),
    };
  });
}
