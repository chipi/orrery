import { expect, type Page } from '@playwright/test';

/**
 * `/explore?context=<level>` walks the ladder one level at a time, and every level of the walk
 * has a scene, a camera at rest and the index toggle, so none of them says the walk is over; a
 * read taken then is the level below's (docker-e2e: the Milky Way's camera read as the Local
 * Group's, Local Group labels read before their first frame). The page drops `context` from the
 * URL when the walk resolves (`explore-scene-host.ts`), unless a `pick` keeps the pair.
 */
export async function contextWalkDone(page: Page, timeout = 90_000): Promise<void> {
  await expect
    .poll(() => new URL(page.url()).searchParams.has('context'), {
      timeout,
      message: 'the ?context= walk resolved',
    })
    .toBe(false);
}
