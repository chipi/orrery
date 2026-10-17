import fs from 'node:fs';
const edits = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const e of edits) {
  let i = 0;
  while (i < e.old.length && e.old[i] === e.new[i]) i++;
  let j = 0;
  while (j < e.old.length - i && e.old[e.old.length - 1 - j] === e.new[e.new.length - 1 - j]) j++;
  const a = Math.max(0, i - 18);
  console.log(
    `${e.rel.replace(/\.json$/, '')}:${e.at} | ${e.old.slice(a, e.old.length - j + 12)} → ${e.new.slice(a, e.new.length - j + 12)}`.replace(
      /\n/g,
      ' ',
    ),
  );
}
