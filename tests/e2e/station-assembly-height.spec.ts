import { test, expect, type Page } from '@playwright/test';

/**
 * ISS2 / UXD-031: the assembly player is one box of one height across every
 * phase of /iss and /tiangong (the component is shared), at every width, in
 * Latin and RTL text. The chip is two fixed one-line rows cut with an
 * ellipsis; the whole phase is in its title.
 */

type Sample = {
  v: number;
  box: { top: number; bottom: number; height: number; left: number; right: number };
  playY: number;
  scrubY: number;
  dateY: number;
  dateEdge: number;
  chipTop: number;
  chipHeight: number;
  hintHeight: number;
  title: string;
  rowOverflow: boolean;
  nameText: string;
};

const STATIONS = [
  { id: 'iss', minPhases: 30 },
  { id: 'tiangong', minPhases: 5 },
] as const;
const LOCALES = [
  { tag: 'en', prefix: '' },
  { tag: 'de', prefix: '/de' },
  { tag: 'ar', prefix: '/ar' },
] as const;

async function openAssembly(page: Page, station: string, isMobile: boolean) {
  if (isMobile) {
    // The ASSEMBLY tab is the second of the three drawer tabs, in every locale.
    const tab = page.locator('.mdg-tab').nth(1);
    await expect(tab).toBeVisible({ timeout: 8_000 });
    await tab.click();
  } else {
    const toggle = page.getByTestId(`${station}-assembly-toggle`);
    await expect(toggle).toBeVisible({ timeout: 8_000 });
    await toggle.evaluate((el) => (el as HTMLButtonElement).click());
  }
  await expect(page.getByTestId('station-assembly')).toBeVisible({ timeout: 5_000 });
  // Opening starts playback; pause so the scrub value is the only mover.
  const play = page.getByTestId('assembly-play');
  if ((await play.textContent())?.includes('⏸')) await play.click();
  await expect(play).toContainText('▶');
}

async function sweep(page: Page): Promise<Sample[]> {
  return page.evaluate(async () => {
    const q = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const input = q('assembly-scrub') as HTMLInputElement;
    const out: Sample[] = [];
    const N = 60;
    for (let i = 0; i < N; i++) {
      const v = i / (N - 1);
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await raf();
      const box = q('station-assembly').getBoundingClientRect();
      const chip = q('assembly-chip');
      const hint = q('station-assembly').querySelector('.hint') as HTMLElement;
      const rows = Array.from(chip.querySelectorAll<HTMLElement>('.chip-line, .cut, .chip-name'));
      out.push({
        v,
        box: {
          top: box.top,
          bottom: box.bottom,
          height: box.height,
          left: box.left,
          right: box.right,
        },
        playY: q('assembly-play').getBoundingClientRect().top,
        scrubY: input.getBoundingClientRect().top,
        dateY: q('assembly-date').getBoundingClientRect().top,
        dateEdge: q('assembly-date').getBoundingClientRect().right,
        chipTop: chip.getBoundingClientRect().top,
        chipHeight: chip.getBoundingClientRect().height,
        hintHeight: hint.getBoundingClientRect().height,
        title: chip.getAttribute('title') ?? '',
        rowOverflow: rows.some((el) => el.scrollWidth > el.clientWidth + 1),
        nameText: q('assembly-chip-name')?.textContent?.trim() ?? '',
      });
    }
    return out;
  });
}

function checkConstant(samples: Sample[], viewportH: number, viewportW: number) {
  const first = samples[0];
  for (const s of samples) {
    expect(Math.abs(s.box.height - first.box.height), `box height at ${s.v}`).toBeLessThanOrEqual(
      1,
    );
    expect(Math.abs(s.box.top - first.box.top), `box top at ${s.v}`).toBeLessThanOrEqual(1);
    expect(Math.abs(s.playY - first.playY), `play y at ${s.v}`).toBeLessThanOrEqual(1);
    expect(Math.abs(s.scrubY - first.scrubY), `scrub y at ${s.v}`).toBeLessThanOrEqual(1);
    expect(Math.abs(s.dateY - first.dateY), `date y at ${s.v}`).toBeLessThanOrEqual(1);
    expect(Math.abs(s.chipHeight - first.chipHeight), `chip height at ${s.v}`).toBeLessThanOrEqual(
      1,
    );
    expect(Math.abs(s.hintHeight - first.hintHeight), `hint height at ${s.v}`).toBeLessThanOrEqual(
      1,
    );
    // The control row stays inside the box (the date was clipped past the edge on a phone).
    expect(s.dateEdge, `date inside the box at ${s.v}`).toBeLessThanOrEqual(s.box.right - 8);
    expect(s.box.top).toBeGreaterThanOrEqual(0);
    expect(s.box.bottom).toBeLessThanOrEqual(viewportH);
    expect(s.box.left).toBeGreaterThanOrEqual(-1);
    expect(s.box.right).toBeLessThanOrEqual(viewportW + 1);
  }
}

for (const station of STATIONS) {
  for (const loc of LOCALES) {
    test(`${station.id} (${loc.tag}): the assembly player keeps one height across every phase`, async ({
      page,
      isMobile,
    }) => {
      await page.goto(`${loc.prefix}/${station.id}`, { waitUntil: 'networkidle' });
      await openAssembly(page, station.id, isMobile);
      const samples = await sweep(page);
      const vp = page.viewportSize()!;
      checkConstant(samples, vp.height, vp.width);

      // The sweep reached the phases (not one frozen chip).
      const phases = new Set(samples.map((s) => s.title));
      expect(phases.size).toBeGreaterThanOrEqual(station.minPhases);

      // The cut text is still whole in the title; the longest phase proves the
      // ellipsis does the work on the narrow screens.
      const longest = samples.reduce((a, b) => (b.title.length > a.title.length ? b : a));
      expect(longest.title.length).toBeGreaterThan(60);
      if (station.id === 'iss' && (isMobile || vp.width < 700)) {
        expect(longest.rowOverflow).toBe(true);
      }

      // The player stays clear of the mobile drawer.
      if (isMobile) {
        const mdg = await page.locator('.mdg').first().boundingBox();
        if (mdg) expect(samples[0].box.bottom).toBeLessThanOrEqual(mdg.y + 1);
      }
    });
  }
}

test.describe('a 360 px phone', () => {
  test.use({ viewport: { width: 360, height: 740 } });
  for (const station of STATIONS) {
    test(`${station.id}: one height across every phase at 360 px`, async ({
      page,
      isMobile,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile-chromium', 'phone portrait only');
      await page.goto(`/${station.id}`, { waitUntil: 'networkidle' });
      await openAssembly(page, station.id, isMobile);
      const samples = await sweep(page);
      checkConstant(samples, 740, 360);
      expect(samples[0].hintHeight).toBeGreaterThan(20);
    });
  }
});

test('the chip title and the live region carry the whole phase', async ({ page, isMobile }) => {
  await page.goto('/iss', { waitUntil: 'networkidle' });
  await openAssembly(page, 'iss', isMobile);
  const scrub = page.getByTestId('assembly-scrub');
  await scrub.evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = '0.3';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const chip = page.getByTestId('assembly-chip');
  const title = (await chip.getAttribute('title')) ?? '';
  const name = (await page.getByTestId('assembly-chip-name').textContent())?.trim() ?? '';
  expect(title.startsWith(name)).toBe(true);
  expect(title.split(' · ').length).toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId('station-assembly').locator('.sr-only')).toHaveText(title);
});
