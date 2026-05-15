import { defineConfig } from 'vitepress';
import { generateSidebar } from 'vitepress-sidebar';

const sidebarOptions = {
  documentRootPath: 'docs',
  collapsed: false,
  collapseDepth: 2,
  capitalizeFirst: true,
  useTitleFromFileHeading: true,
  useTitleFromFrontmatter: true,
  excludeFolders: ['.vitepress', 'prototypes'],
  hyphenToSpace: true,
  underscoreToSpace: true,
};

export default defineConfig({
  title: 'Orrery',
  description:
    'Architecture, design, and concept documentation for the Orrery solar-system explorer and Mars mission simulator.',
  base: process.env.DOCS_BASE ?? '/',
  cleanUrls: true,
  lang: 'en-US',

  // Force dark mode — the app is dark-only, and the docs site should
  // feel like the same product. Removing the light option avoids a
  // jarring flash on first paint when the OS preference defaults to
  // light.
  appearance: 'force-dark',

  // Preconnect to Google Fonts so the Bebas Neue / Space Mono / Crimson
  // Pro families load before first paint. The docs site is a separate
  // surface from the app bundle (which self-hosts via static/fonts/ per
  // ADR-016); using a CDN here avoids duplicating the font pipeline.
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'meta',
      {
        name: 'description',
        content:
          'Orrery — architecture, design, and decision documentation. SvelteKit + Three.js solar-system explorer + mission simulator + science encyclopedia.',
      },
    ],
    ['meta', { name: 'theme-color', content: '#04040c' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logos/nasa.svg' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Guides',
        items: [
          { text: 'User guide', link: '/guides/user-guide' },
          { text: 'Translator (i18n) guide', link: '/guides/i18n-style-guide' },
        ],
      },
      {
        text: 'Decisions',
        items: [
          { text: 'Architecture (TA.md)', link: '/adr/TA' },
          { text: 'ADR index', link: '/adr/index' },
          { text: 'RFC index', link: '/rfc/index' },
          { text: 'PRD index', link: '/prd/index' },
        ],
      },
      { text: '↗ Live App', link: 'https://chipi.github.io/orrery/' },
    ],

    sidebar: generateSidebar(sidebarOptions),

    socialLinks: [{ icon: 'github', link: 'https://github.com/chipi/orrery' }],

    footer: {
      message:
        'Orrery — architecture documentation · <a href="https://github.com/chipi/orrery/blob/main/LICENSE">MIT</a> · No tracking',
      copyright: '© Marko Dragoljević and contributors',
    },

    outline: {
      level: [2, 3],
    },

    search: {
      provider: 'local',
    },
  },
});
