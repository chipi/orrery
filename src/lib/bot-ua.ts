/** JS-rendering crawlers that would otherwise count as visitors. 2026-10-19: a
 *  "Mac Chrome" with an impossible user agent (Safari's AppleWebKit/605.1.15 next to
 *  a Chrome version) walked /science around the clock, ~40% of all sessions. */
// `(?<!cu)`: Cubot is a phone brand, not a crawler.
const BOT_UA =
  /(?<!cu)bot\b|bot\/|crawler|spider|headlesschrome|AppleWebKit\/605\.1\.15.*Chrome\//i;
export function isLikelyBot(): boolean {
  if (typeof navigator === 'undefined') return false;
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return true;
  return BOT_UA.test(navigator.userAgent ?? '');
}
