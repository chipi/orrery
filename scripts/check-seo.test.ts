// Mutation tests for the thin-page rule of scripts/check-seo.mjs: the gate is run
// against a fixture build (CHECK_SEO_BUILD_DIR) and must flag exactly the entity
// pages under their locale's character floor. The fixture heads are bare, so other
// rules fail too; only the thin-page lines are asserted.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
// n non-whitespace characters, spread over short words so the spaces are not counted
const chars = (n: number) =>
  Array.from({ length: Math.ceil(n / 5) }, (_, i) => 'abcde'.slice(0, Math.min(5, n - i * 5))).join(
    ' ',
  );
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

// <main> also holds "H" (the h1), one character.
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'check-seo-'));
  write('missions/thin.html', page(`<p>${chars(100)}</p>`));
  write('missions/edge.html', page(`<p>${chars(348)}</p>`));
  write('missions/ok.html', page(`<p>${chars(349)}</p>`));
  write('missions/spaces.html', page(`<p>${'ab '.repeat(120)}</p>`));
  write('explore/stars/thin.html', page(`<p>${chars(100)}</p>`));
  write('explore/stars/ok.html', page(`<p>${chars(349)}</p>`));
  write('explore/black-holes/thin.html', page(`<p>${chars(100)}</p>`));
  write('explore/black-holes/ok.html', page(`<p>${chars(349)}</p>`));
  write('explore/deep-sky/thin.html', page(`<p>${chars(100)}</p>`));
  write('explore/deep-sky/ok.html', page(`<p>${chars(349)}</p>`));
  write('fr/fleet/edge.html', page(`<p>${chars(428)}</p>`));
  write('fr/fleet/ok.html', page(`<p>${chars(429)}</p>`));
  write('de/lab/edge.html', page(`<p>${chars(388)}</p>`));
  write('de/lab/ok.html', page(`<p>${chars(389)}</p>`));
  write('fr/explore/empty.html', '<!doctype html><html><head></head><body></body></html>');
  write('moon/ok.html', page(`<p>${chars(1000)}</p>`));
  write('ja/mars/edge.html', page(`<p>${'火星の探査'.repeat(37)}火星の</p>`));
  write('ja/venus/ok.html', page(`<p>${'金星の探査'.repeat(40)}</p>`));
  write('zh-CN/explore/edge.html', page(`<p>${'月球'.repeat(86)}</p>`));
  write('zh-CN/lab/ok.html', page(`<p>${'月球'.repeat(87)}</p>`));
  write('ko/lab/edge.html', page(`<p>${chars(173)}</p>`));
  // Not entity pages: hub pages and the launches / hub index pages are exempt.
  write('missions.html', page('<p>short</p>'));
  write('missions/launches.html', page('<p>short</p>'));
  write('explore/hub.html', page('<p>short</p>'));
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('check-seo thin entity pages', () => {
  it("flags pages under their locale's character floor, counting <main> text only", () => {
    const out = gate();
    expect(out).toContain("thin entity page (under en-US's 350 characters): 6");
    expect(out).toContain('/missions/thin (101)');
    expect(out).toContain('/explore/stars/thin (101)');
    expect(out).toContain('/explore/black-holes/thin (101)');
    expect(out).toContain('/explore/deep-sky/thin (101)');
    expect(out).toContain('/missions/edge (349)');
    expect(out).toContain('/missions/spaces (241)');
    expect(out).toContain('/fr/explore/empty (0)');
  });

  it('accepts a page at the floor and above', () => {
    const out = gate();
    expect(out).not.toContain('/missions/ok');
    expect(out).not.toContain('/explore/stars/ok');
    expect(out).not.toContain('/explore/black-holes/ok');
    expect(out).not.toContain('/explore/deep-sky/ok');
    expect(out).not.toContain('/moon/ok');
  });

  it('sets the floor per locale, so the same page can pass in one language and fail in another', () => {
    const out = gate();
    expect(out).toContain("thin entity page (under fr's 430 characters): 2");
    expect(out).toContain('/fr/fleet/edge (429)');
    expect(out).not.toContain('/fr/fleet/ok');
    expect(out).toContain("thin entity page (under de's 390 characters): 1");
    expect(out).toContain('/de/lab/edge (389)');
    expect(out).not.toContain('/de/lab/ok');
  });

  it('applies the lower floors of zh-CN, ja and ko', () => {
    const out = gate();
    expect(out).toContain("thin entity page (under ja's 190 characters): 1");
    expect(out).toContain('/ja/mars/edge (189)');
    expect(out).not.toContain('/ja/venus/ok');
    expect(out).toContain("thin entity page (under zh-CN's 175 characters): 1");
    expect(out).toContain('/zh-CN/explore/edge (173)');
    expect(out).not.toContain('/zh-CN/lab/ok');
    expect(out).toContain("thin entity page (under ko's 175 characters): 1");
    expect(out).toContain('/ko/lab/edge (174)');
  });

  it('leaves hubs and the launches / hub index pages alone', () => {
    const out = gate();
    expect(out).not.toContain('/missions (');
    expect(out).not.toContain('/missions/launches (');
    expect(out).not.toContain('/explore/hub (');
  });
});
