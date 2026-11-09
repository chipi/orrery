// Mutation tests for the thin-page rule of scripts/check-seo.mjs: the gate is run
// against a fixture build (CHECK_SEO_BUILD_DIR) and must flag exactly the thin
// entity pages. The fixture heads are bare, so other rules fail too; only the
// thin-page lines are asserted.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
const page = (main: string) =>
  `<!doctype html><html><head><title>t</title></head><body><nav>${words(200)}</nav>` +
  `<main id="main-content"><h1>H</h1><script>var x = "${words(200)}"</script>` +
  `<style>.a{}</style><!-- ${words(200)} -->${main}</main><footer>${words(200)}</footer></body></html>`;

let dir: string;
const write = (rel: string, html: string) => {
  const file = join(dir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};

function gate(): string {
  const r = spawnSync(process.execPath, ['scripts/check-seo.mjs'], {
    env: { ...process.env, CHECK_SEO_BUILD_DIR: dir, VITE_BASE: '' },
    encoding: 'utf8',
  });
  // Only the thin-page blocks: the bare fixture heads fail every other rule.
  return r.stderr
    .split('  ✗ ')
    .filter((b) => b.startsWith('thin entity page'))
    .join('\n');
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'check-seo-'));
  write('missions/thin.html', page(`<p>${words(40)}</p>`));
  write('missions/edge.html', page(`<p>${words(78)}</p>`));
  write('missions/ok.html', page(`<p>${words(79)}</p>`));
  write('de/fleet/thin.html', page(`<p>${words(10)}</p>`));
  write('ru/lab/ok.html', page(`<p>${words(120)}</p>`));
  write('fr/explore/empty.html', '<!doctype html><html><head></head><body></body></html>');
  write('moon/ok.html', page(`<p>${words(100)}</p>`));
  write('ja/mars/thin.html', page(`<p>${'火星の探査'.repeat(10)}</p>`));
  write('ja/venus/ok.html', page(`<p>${'金星の探査'.repeat(40)}</p>`));
  write('zh-CN/explore/thin.html', page(`<p>${'月球'.repeat(20)}</p>`));
  write('zh-CN/lab/ok.html', page(`<p>${'月球'.repeat(90)}</p>`));
  // Not entity pages: hub pages and the launches / hub index pages are exempt.
  write('missions.html', page('<p>short</p>'));
  write('missions/launches.html', page('<p>short</p>'));
  write('explore/hub.html', page('<p>short</p>'));
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('check-seo thin entity pages', () => {
  it('flags pages under 80 words, counting <main> text only', () => {
    const out = gate();
    expect(out).toContain('thin entity page (under 80 words): 4');
    expect(out).toContain('/missions/thin (41)');
    expect(out).toContain('/missions/edge (79)');
    expect(out).toContain('/de/fleet/thin (11)');
    expect(out).toContain('/fr/explore/empty (0)');
  });

  it('accepts 80 words and more', () => {
    const out = gate();
    expect(out).not.toContain('/missions/ok');
    expect(out).not.toContain('/ru/lab/ok');
    expect(out).not.toContain('/moon/ok');
  });

  it('counts characters for zh-CN and ja', () => {
    const out = gate();
    expect(out).toContain('thin entity page (under 160 characters): 2');
    expect(out).toContain('/ja/mars/thin (51)');
    expect(out).toContain('/zh-CN/explore/thin (41)');
    expect(out).not.toContain('/ja/venus/ok');
    expect(out).not.toContain('/zh-CN/lab/ok');
  });

  it('leaves hubs and the launches / hub index pages alone', () => {
    const out = gate();
    expect(out).not.toContain('/missions (');
    expect(out).not.toContain('/missions/launches (');
    expect(out).not.toContain('/explore/hub (');
  });
});
