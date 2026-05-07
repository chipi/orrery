// Adapter-static + GitHub Pages — every /science route is statically
// prerendered at build time so KaTeX runs once in Node and the client
// receives plain HTML (ADR-034).
export const prerender = true;
