// "M13 · Hercules Globular Cluster", "M3 · NGC 5272", "NGC 1365": the designation first, then the
// common name where the data has one. 88 of the 141 data names are a bare OpenNGC code ("NGC5272",
// "IC0342"), which reads as "NGC 5272" here; a code the designation already holds is not repeated.
// Names stay English data in every locale. Pure, so the INDEX builder and the formatters share it.
export function deepSkyTitle(o: { designation: string; name: string }): string {
  const code = /^(NGC|IC)\s*0*(\d+)([A-Z]*)$/i.exec(o.name.trim());
  const name = code ? `${code[1].toUpperCase()} ${code[2]}${code[3].toUpperCase()}` : o.name.trim();
  const squash = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  return !name || squash(o.designation).includes(squash(name))
    ? o.designation
    : `${o.designation} · ${name}`;
}
