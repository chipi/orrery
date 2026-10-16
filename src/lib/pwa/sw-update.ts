/**
 * One best-effort "is there a newer build?" check against the registered service worker.
 *
 * `registration.update()` rejects whenever the check can't complete: offline, a flaky
 * network fetching sw.js (`TypeError: Failed to update a ServiceWorker … fetching the
 * script`), or a registration that has gone away (`InvalidStateError`). A failed check is
 * not an error for the user — the next hourly / on-focus check simply tries again — so it
 * must not escape as an unhandled rejection (prod GlitchTip #537, #552, #555 → #588).
 *
 * Resolves `true` when the check ran, `false` when it couldn't.
 */
export async function checkForUpdate(
  registration: Pick<ServiceWorkerRegistration, 'update'>,
): Promise<boolean> {
  try {
    await registration.update();
    return true;
  } catch {
    return false;
  }
}
