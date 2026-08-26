// Sky-preview harness (#488) — dev-only. Mounts the real AR sky-scene with an
// injected mock SkyView (fixed location + heading, no device sensors, no camera
// feed) so the sky can be screenshotted + verified on desktop. Client-only; the
// /dev subtree is 404'd in non-dev builds by /dev/+layout.ts.
export const ssr = false;
export const prerender = false;
