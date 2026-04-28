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
  title: 'Orrery — Docs',
  description:
    'Architecture, design, and concept documentation for the Orrery solar-system explorer and Mars mission simulator.',
  base: process.env.DOCS_BASE ?? '/',
  cleanUrls: true,
  lang: 'en-US',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: '↗ Live App', link: 'https://chipi.github.io/orrery/' },
    ],

    sidebar: generateSidebar(sidebarOptions),

    socialLinks: [{ icon: 'github', link: 'https://github.com/chipi/orrery' }],

    footer: {
      message: 'Orrery — architecture documentation. MIT-licensed.',
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
