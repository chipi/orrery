#!/usr/bin/env node
/**
 * Slice A v3 visual-cluster report — diagnostic only, no apply.
 *
 * Groups dropped salvage proposals into clusters by:
 *   - exact image_url (caught by cross-mission-dupe filter)
 *   - normalised URL basename (caught by cross-mission-basename filter)
 *   - same nasa_id / commons_file / hubble_id in metadata
 *
 * Writes a markdown report at docs/provenance/slice-a-v3-visual-clusters.md
 * that lists clusters sorted by member count. Useful for Marko's
 * manual triage of the dropped pool — label one card per cluster,
 * skip the rest.
 *
 * This is NOT pHash dedup (which would require downloading bytes for
 * every candidate). For pixel-perfect visual dedup the next pipeline
 * iteration would compute pHash at salvage time and write cluster_id
 * into each proposal.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const salvage = JSON.parse(readFileSync('static/data/slice-a-salvage-result.json', 'utf8'));
const approvals = JSON.parse(readFileSync('static/data/slice-a-approvals.json', 'utf8'));

function basenameOf(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const tail = u.pathname.split('/').pop() ?? '';
    if (/^(download|deliveryService|render|view)$/i.test(tail)) {
      const id = u.searchParams.get('id') ?? u.searchParams.get('Id');
      if (id)
        return id
          .toLowerCase()
          .replace(/[\s_-]+/g, ' ')
          .trim();
    }
    const noQuery = url.split('?')[0];
    const slash = noQuery.lastIndexOf('/');
    const base = slash >= 0 ? noQuery.slice(slash + 1) : noQuery;
    return decodeURIComponent(base)
      .toLowerCase()
      .replace(/[\s_-]+/g, ' ')
      .trim();
  } catch {
    return null;
  }
}

function clusterKeyOf(p) {
  const m = p.proposed?.metadata ?? {};
  if (m.nasa_id) return `nasa_id:${m.nasa_id}`;
  if (m.commons_file) return `commons_file:${m.commons_file.toLowerCase()}`;
  if (m.hubble_id) return `hubble_id:${m.hubble_id}`;
  if (p.proposed?.image_url) {
    const b = basenameOf(p.proposed.image_url);
    if (b && b.length >= 6) return `basename:${b}`;
    return `url:${p.proposed.image_url}`;
  }
  return null;
}

const clusters = new Map();
for (const p of salvage.proposals ?? []) {
  if (p.survivor) continue;
  const key = clusterKeyOf(p);
  if (!key) continue;
  if (!clusters.has(key)) clusters.set(key, []);
  clusters.get(key).push(p);
}

const sorted = [...clusters.entries()]
  .filter(([, members]) => members.length >= 2)
  .sort((a, b) => b[1].length - a[1].length);

const labeled = approvals.decisions ?? {};
function decisionFor(id) {
  const d = labeled[id];
  if (!d) return 'pending';
  return d.status;
}

const lines = [];
lines.push('# Slice A v3 — visual-cluster report');
lines.push('');
lines.push(
  `Generated ${new Date().toISOString()} from \`static/data/slice-a-salvage-result.json\` and \`static/data/slice-a-approvals.json\`.`,
);
lines.push('');
lines.push(
  'Groups dropped proposals by visual identity (same nasa_id / commons_file / hubble_id / URL basename). Use this list alongside the `/dev/slice-a-review` UI to skip duplicate triage: if you decide on one cluster member, the rest will reach the same conclusion.',
);
lines.push('');
lines.push('## Stats');
lines.push('');
const total = sorted.reduce((n, [, m]) => n + m.length, 0);
const wasted = total - sorted.length; // extra cards above the primary in each cluster
lines.push(`- Clusters of ≥2 members: **${sorted.length}**`);
lines.push(
  `- Total dropped proposals in clusters: **${total}** (i.e. ${wasted} cards collapsible into ${sorted.length} representatives)`,
);
lines.push(`- Top cluster size: **${sorted[0]?.[1].length ?? 0}** members`);
lines.push('');
lines.push('## Clusters (sorted by member count)');
lines.push('');

for (const [key, members] of sorted.slice(0, 80)) {
  const url = members[0].proposed?.image_url ?? '?';
  const sample =
    members[0].proposed?.metadata?.commons_file ??
    members[0].proposed?.metadata?.nasa_title ??
    members[0].proposed?.metadata?.hubble_title ??
    url.slice(0, 100);
  lines.push(`### \`${key}\` — ${members.length} members`);
  lines.push('');
  lines.push(`Image: \`${url}\``);
  if (sample !== url) lines.push(`Title: ${sample}`);
  lines.push('');
  lines.push('| proposal_id | agency | mission/slot | status |');
  lines.push('|---|---|---|---|');
  for (const m of members.slice(0, 15)) {
    const status = decisionFor(m.proposal_id);
    const tag = status === 'pending' ? '' : ` **${status}**`;
    lines.push(
      `| \`${m.proposal_id}\` | ${m.agency} | ${m.missionId}/${m.slot} | ${status}${tag.startsWith(' ') ? '' : ''} |`,
    );
  }
  if (members.length > 15) lines.push(`| _… and ${members.length - 15} more_ | | | |`);
  lines.push('');
}

if (sorted.length > 80) {
  lines.push(
    `_(${sorted.length - 80} smaller clusters omitted; see slice-a-salvage-result.json for full data)_`,
  );
}

writeFileSync('docs/provenance/slice-a-v3-visual-clusters.md', lines.join('\n') + '\n');
console.log(`Wrote docs/provenance/slice-a-v3-visual-clusters.md`);
console.log(`  ${sorted.length} clusters, ${total} dropped proposals, ${wasted} collapsible`);
console.log(`  top 5 clusters:`);
for (const [key, members] of sorted.slice(0, 5)) {
  console.log(`    ${members.length}x  ${key.slice(0, 80)}`);
}
