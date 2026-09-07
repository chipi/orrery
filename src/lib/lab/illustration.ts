/**
 * The Lab's ILLUSTRATION artifact (G · #536 · T3 · pre-review D-G1/D-G2).
 *
 * Structurally OUTSIDE the kernel's FigureSpec — RFC-037 A01.2a: "a separate
 * artifact type nothing in the kernel produces; the honesty line made
 * structural." The Fidelity union stays three-membered; nothing on the data
 * path can carry generated art, by type. Illustrations attach to GOALS (the
 * narrative chrome), never to a FormulaResult, and never travel inside share
 * links or .orrlab documents.
 *
 * The manifest is DATA (static/data/lab-illustrations.json), empty until the
 * operator approves generated batches — absent entry → nothing renders
 * (graceful-absent is the shipped zero-asset state).
 */
import manifest from '$data/lab-illustrations.json';

export interface LabIllustration {
  goalId: string;
  /** Path under static/, e.g. images/lab/goals/launch-a-rocket.webp. */
  file: string;
  /** i18n key for the alt text (lab.illustration.alt.<goalId>). */
  altKey: string;
  /** Credit line inputs — surfaced beside the mandatory badge. */
  model: string;
  generated: string; // ISO date
}

const byGoal = new Map<string, LabIllustration>(
  (manifest as LabIllustration[]).map((i) => [i.goalId, i]),
);

/** The one lookup the UI uses. Undefined = no art for this goal (fine). */
export function illustrationFor(goalId: string): LabIllustration | undefined {
  return byGoal.get(goalId);
}

/** All entries — the /dev review route + tests iterate this. */
export function allIllustrations(): LabIllustration[] {
  return [...byGoal.values()];
}
