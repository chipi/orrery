/** Commons extmetadata HTML → plain credit text (author, licence, description fields). */
export function plainText(html: string | undefined | null): string | null {
  if (!html) return null;
  // One scan, no regex replacement: a regex pass over "<scr<b>ipt>" can leave a tag behind.
  // Text outside "<…>" is kept. Commons templates repeat their text in a hidden element
  // ({{Unknown|author}} → "Unknown author<span style="display: none;">Unknown author</span>"),
  // so an element whose style says display:none is skipped up to its closing tag.
  let out = '';
  let hidden: string | null = null;
  let depth = 0;
  for (let i = 0; i < html.length;) {
    if (html[i] !== '<') {
      if (!hidden) out += html[i];
      i++;
      continue;
    }
    const end = html.indexOf('>', i + 1);
    const tag = html.slice(i + 1, end < 0 ? html.length : end);
    i = end < 0 ? html.length : end + 1;
    const name = /^\/?([a-z][\w-]*)/i.exec(tag)?.[1]?.toLowerCase();
    if (!name) continue;
    if (hidden) {
      if (name === hidden) depth += tag.startsWith('/') ? -1 : 1;
      if (depth === 0) hidden = null;
    } else if (!tag.startsWith('/') && /style\s*=\s*["'][^"']*display\s*:\s*none/i.test(tag)) {
      hidden = name;
      depth = 1;
    }
  }
  const stripped = out.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  return stripped || null;
}
