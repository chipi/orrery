/**
 * Off-subject detector eval harness (0.7.3). Reuses the REAL scoring path
 * (resolveScoreFromCacheOrProvider + resolveSubject) so it measures the
 * shipped detector, not a mock. Scores a stratified fixture, compares the
 * model's subject_match to confident-anchor labels, and reports precision /
 * recall / false-flag-rate per stratum — so we see how the detector
 * generalises before trusting it on the corpus (guards against overfitting
 * to any single gallery like JUICE).
 *
 *   set -a; source .env; set +a; tsx scripts/vision/eval.ts
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveScoreFromCacheOrProvider } from './cache.ts';
import { resolveSubject } from './subject.ts';
import { createAnthropicVisionProvider } from './anthropic.ts';

interface EvalCase {
  path: string;
  label: 'positive' | 'negative' | null;
  stratum: string;
  agency?: string;
  entity?: string;
  note?: string;
}
type Row = EvalCase & { subject_match: boolean; subject: string; score: number; category: string };

const FIXTURE = 'scripts/vision/eval/off-subject-set.json';

function metrics(set: Row[]) {
  let tp = 0,
    fp = 0,
    fn = 0,
    tn = 0;
  for (const r of set) {
    const off = r.subject_match === false;
    if (r.label === 'negative') off ? tp++ : fn++;
    else if (r.label === 'positive') off ? fp++ : tn++;
  }
  const prec = tp + fp ? tp / (tp + fp) : NaN;
  const rec = tp + fn ? tp / (tp + fn) : NaN;
  const fpr = fp + tn ? fp / (fp + tn) : NaN;
  return { tp, fp, fn, tn, prec, rec, fpr };
}
const pct = (x: number) => (Number.isNaN(x) ? ' n/a' : (x * 100).toFixed(0).padStart(3) + '%');

async function main() {
  const fixture = JSON.parse(await fs.readFile(FIXTURE, 'utf-8')) as { cases: EvalCase[] };
  const provider = createAnthropicVisionProvider();
  const rows: Row[] = [];
  for (const c of fixture.cases) {
    const bytes = await fs.readFile(path.join('static', c.path));
    const res = await resolveScoreFromCacheOrProvider({
      imageBytes: bytes,
      imagePath: c.path,
      contextHint: resolveSubject(c.path, { id: c.entity, agency: c.agency }),
      provider,
      denyListExamples: [],
      forceRefresh: true,
    });
    const sm = res.subject_match ?? true;
    rows.push({
      ...c,
      subject_match: sm,
      subject: res.subject,
      score: res.score,
      category: res.category,
    });
    process.stdout.write(
      `  ${sm ? 'match' : 'OFF  '} ${c.path} (${c.label ?? 'unlabeled'}) -> ${res.subject.slice(0, 46)}\n`,
    );
  }

  const labeled = rows.filter((r) => r.label);
  console.log('\n=== LABELED ANCHORS — off-subject = subject_match:false ===');
  const all = metrics(labeled);
  console.log(
    `  overall  TP=${all.tp} FP=${all.fp} FN=${all.fn} TN=${all.tn} | precision=${pct(all.prec)} recall=${pct(all.rec)} false-flag=${pct(all.fpr)}`,
  );
  for (const s of [...new Set(labeled.map((r) => r.stratum))]) {
    const m = metrics(labeled.filter((r) => r.stratum === s));
    console.log(
      `  ${s.padEnd(18)} TP=${m.tp} FP=${m.fp} FN=${m.fn} TN=${m.tn} | P=${pct(m.prec)} R=${pct(m.rec)} FFR=${pct(m.fpr)}`,
    );
  }

  const over = rows.filter((r) => r.label === 'positive' && r.subject_match === false);
  console.log(
    `\n=== OVER-FLAGS (known-good wrongly flagged — ${over.length}; THE failure mode) ===`,
  );
  for (const r of over)
    console.log(
      `  ${r.path} [${r.stratum}] s=${r.score} ${r.category} -> ${r.subject.slice(0, 58)}`,
    );

  const cand = rows
    .filter((r) => !r.label && r.subject_match === false)
    .sort((a, b) => a.score - b.score);
  const unl = rows.filter((r) => !r.label).length;
  console.log(`\n=== UNLABELED FLAGGED (new off-subject candidates — ${cand.length}/${unl}) ===`);
  for (const r of cand)
    console.log(
      `  ${r.path} [${r.stratum}] s=${r.score} ${r.category} -> ${r.subject.slice(0, 58)}`,
    );
}
main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
