// Chunk 3: launch window reads more on the synodic-period page ("why launch windows open and
// close"), not the porkchop page; add-terms.mjs carries the same value for a fresh run.
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
g.term['launch window']._read_more = 'orbits/synodic-period';
fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');
