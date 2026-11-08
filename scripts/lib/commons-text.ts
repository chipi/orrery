/** Commons extmetadata HTML → plain credit text (author, licence, description fields). */
export function plainText(html: string | undefined | null): string | null {
  if (!html) return null;
  // Commons templates repeat their text in a hidden element ({{Unknown|author}} →
  // "Unknown author<span style="display: none;">Unknown author</span>"); drop it first.
  // Repeat until stable: one pass over "<scr<b>ipt>" leaves "<script>".
  let text = html.replace(
    /<(\w+)\b[^>]*style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );
  for (let prev = ''; prev !== text;) {
    prev = text;
    text = text.replace(/<[^>]*>/g, '');
  }
  const stripped = text.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  return stripped || null;
}
