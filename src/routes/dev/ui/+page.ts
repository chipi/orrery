// Dev-only icon/style-guide route — keep it out of the adapter-static
// prerender pass, matching the other /dev/* tools. /dev/+layout.ts 404s
// the subtree (and forces ssr=false) in non-dev builds.
export const prerender = false;
