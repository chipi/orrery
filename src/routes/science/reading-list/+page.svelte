<!--
  /science/reading-list — curated reading list to accompany the
  encyclopedia.

  Standalone page (not a tab/section) — the content here is
  bookmark-style curation, not a teaching narrative, so it doesn't
  need the tab-grid + section-list infrastructure that the rest of
  /science uses. Hardcoded entries so they're easy to add/remove
  via PR review without going through the JSON+i18n overlay pipeline.

  Issue #128. Curator: the maintainer; PRs welcome.
-->
<script lang="ts">
  type Book = {
    title: string;
    author: string;
    year: number;
    blurb: string;
    audience: 'beginner' | 'intermediate' | 'advanced';
    link?: string;
  };
  type Resource = {
    title: string;
    publisher: string;
    blurb: string;
    href: string;
  };

  const books: Book[] = [
    {
      title: 'Cosmos',
      author: 'Carl Sagan',
      year: 1980,
      blurb:
        'The book of the TV series. Sagan walks you from the Library of Alexandria to the edge of the observable universe and back, and explains why each detour matters. The introduction every space reader should start with.',
      audience: 'beginner',
      link: 'https://www.google.com/books/edition/Cosmos/_19E9HlMTUgC',
    },
    {
      title: 'Pale Blue Dot',
      author: 'Carl Sagan',
      year: 1994,
      blurb:
        'The follow-up to Cosmos: less astronomy, more "what does it mean that we\'re here, and what do we do next?" The title essay is the single best paragraph about Voyager 1 ever written.',
      audience: 'beginner',
      link: 'https://www.google.com/books/edition/Pale_Blue_Dot/zpQv1OZN0wAC',
    },
    {
      title: 'A Brief History of Time',
      author: 'Stephen Hawking',
      year: 1988,
      blurb:
        'Cosmology for the rest of us. Black holes, the Big Bang, the arrow of time — Hawking refuses to use math in the prose (one equation in the whole book; he was warned every formula halves the sales).',
      audience: 'beginner',
      link: 'https://www.google.com/books/edition/A_Brief_History_Of_Time/4-Tx3LM4taoC',
    },
    {
      title: 'The Right Stuff',
      author: 'Tom Wolfe',
      year: 1979,
      blurb:
        'The early-Mercury astronauts and the test-pilot culture that made them. Reads like a novel; explains why the U.S. crewed-spaceflight program took the shape it did better than any history book.',
      audience: 'beginner',
      link: 'https://www.google.com/books/edition/The_Right_Stuff/_kfqV4Z4q7gC',
    },
    {
      title: 'Packing for Mars',
      author: 'Mary Roach',
      year: 2010,
      blurb:
        'Funny, ground-level look at the bizarre engineering problems of putting humans in space — how do you wash hair in microgravity, what happens to the inner ear, why is the food the way it is. Pairs well with the /science Life-in-Space tab.',
      audience: 'beginner',
      link: 'https://www.google.com/books/edition/Packing_for_Mars/zgGgg9C2P8AC',
    },
    {
      title: 'Rocket Propulsion Elements',
      author: 'George P. Sutton & Oscar Biblarz',
      year: 2016,
      blurb:
        'The propulsion textbook. Goes from Tsiolkovsky to specific impulse to actual nozzle design without skipping steps. Heavy math but the prose is approachable; the figures alone are worth the cover price.',
      audience: 'intermediate',
      link: 'https://www.google.com/books/edition/Rocket_Propulsion_Elements/wMBjAwAAQBAJ',
    },
    {
      title: 'Fundamentals of Astrodynamics',
      author: 'Bate, Mueller & White',
      year: 1971,
      blurb:
        "The orbital-mechanics primer used at the US Air Force Academy. Cheap paperback, no nonsense, derives Kepler's equation and Hohmann transfers from scratch. The book that'll make /science/transfers click.",
      audience: 'intermediate',
      link: 'https://www.google.com/books/edition/Fundamentals_of_Astrodynamics/UtJK8cetqGkC',
    },
    {
      title: 'How to Read the Solar System',
      author: 'Christopher Riley & Dallas Campbell',
      year: 2014,
      blurb:
        "A pop-science guide to every planet, moon, and significant body, organised by what's interesting about each. The companion read while you click through /explore.",
      audience: 'beginner',
      link: 'https://www.google.com/books/edition/How_to_Read_the_Solar_System/g7KvAwAAQBAJ',
    },
  ];

  const blogs: Resource[] = [
    {
      title: 'The Planetary Society',
      publisher: 'planetary.org',
      blurb:
        'Carl Sagan-founded membership org. The best plain-language explainers when a mission makes the news. Their blog covers active missions in roughly real time.',
      href: 'https://www.planetary.org/articles',
    },
    {
      title: 'Casey Handmer',
      publisher: 'caseyhandmer.wordpress.com',
      blurb:
        'Ex-JPL engineer, sharp essays on aerospace economics + propulsion + Mars architecture. Numbers-driven; cuts through the marketing.',
      href: 'https://caseyhandmer.wordpress.com/',
    },
    {
      title: 'Eric Berger — Ars Technica space coverage',
      publisher: 'arstechnica.com',
      blurb:
        'Best beat reporter on the U.S. launch industry. SpaceX/NASA/Blue Origin coverage with sources at all three.',
      href: 'https://arstechnica.com/author/ericberger/',
    },
    {
      title: 'NASA Spaceflight Forum',
      publisher: 'forum.nasaspaceflight.com',
      blurb:
        'Long-running enthusiast forum with rocket-engineer regulars. Best place to find primary-source documents on active mission planning.',
      href: 'https://forum.nasaspaceflight.com/',
    },
    {
      title: 'Damn Interesting — Cosmos archive',
      publisher: 'damninteresting.com',
      blurb:
        'Long-form essays on lesser-known space history (Vela satellites, the Phobos missions, etc.). Reliable narrative-first writing.',
      href: 'https://www.damninteresting.com/category/cosmos/',
    },
  ];
</script>

<svelte:head>
  <title>Reading list · Orrery Science</title>
  <meta
    name="description"
    content="Curated beginner-to-intermediate space books + blogs to accompany the Orrery science encyclopedia."
  />
</svelte:head>

<article class="resources">
  <header class="head">
    <h1>Reading list</h1>
    <p class="lede">
      Books, articles, and blogs to read alongside the encyclopedia. Curated for clarity and respect
      for the reader's time — the entries here are short, focused, and from authors who explain
      rather than perform.
    </p>
    <p class="caveat">
      <strong>Draft seed (v0.6.3).</strong> If you have a recommendation that fits this list, open an
      issue or PR. The curation bar: accessible to a curious non-specialist, written by someone who worked
      on the subject, and worth a re-read.
    </p>
  </header>

  <section class="block">
    <h2>Books</h2>
    <ul class="entries">
      {#each books as book (book.title)}
        <li class="entry">
          <div class="entry-head">
            <h3>
              {#if book.link}<a href={book.link} target="_blank" rel="noopener noreferrer external"
                  >{book.title}</a
                >{:else}{book.title}{/if}
            </h3>
            <span class="meta">
              {book.author} · {book.year} ·
              <span class="audience audience-{book.audience}">{book.audience}</span>
            </span>
          </div>
          <p class="blurb">{book.blurb}</p>
        </li>
      {/each}
    </ul>
  </section>

  <section class="block">
    <h2>Blogs & long-form</h2>
    <ul class="entries">
      {#each blogs as blog (blog.title)}
        <li class="entry">
          <div class="entry-head">
            <h3>
              <a href={blog.href} target="_blank" rel="noopener noreferrer external">{blog.title}</a
              >
            </h3>
            <span class="meta">{blog.publisher}</span>
          </div>
          <p class="blurb">{blog.blurb}</p>
        </li>
      {/each}
    </ul>
  </section>
</article>

<style>
  .resources {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 24px 80px;
    color: var(--color-text);
  }
  .head h1 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 56px;
    letter-spacing: 2px;
    margin: 0 0 8px;
    color: #ffc850;
  }
  .head .lede {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 20px;
    line-height: 1.5;
    margin: 0 0 16px;
    color: rgba(255, 255, 255, 0.92);
  }
  .head .caveat {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.6);
    border-left: 2px solid rgba(255, 200, 80, 0.5);
    padding: 8px 12px;
    background: rgba(255, 200, 80, 0.05);
  }
  .block {
    margin-top: 40px;
  }
  .block h2 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 1.5px;
    margin: 0 0 16px;
    color: #4ecdc4;
    border-bottom: 1px solid rgba(78, 205, 196, 0.3);
    padding-bottom: 6px;
  }
  .entries {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .entry-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
    margin-bottom: 4px;
  }
  .entry h3 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 1px;
    margin: 0;
  }
  .entry h3 a {
    color: rgba(255, 255, 255, 0.95);
    text-decoration: none;
    border-bottom: 1px solid rgba(255, 200, 80, 0.4);
  }
  .entry h3 a:hover,
  .entry h3 a:focus-visible {
    color: #ffc850;
    border-bottom-color: #ffc850;
  }
  .meta {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
  }
  .audience {
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 2px;
    font-size: 10px;
  }
  .audience-beginner {
    background: rgba(78, 205, 196, 0.18);
    color: #4ecdc4;
  }
  .audience-intermediate {
    background: rgba(255, 200, 80, 0.18);
    color: #ffc850;
  }
  .audience-advanced {
    background: rgba(193, 68, 14, 0.18);
    color: #c1440e;
  }
  .blurb {
    font-family: 'Crimson Pro', serif;
    font-size: 16px;
    line-height: 1.55;
    margin: 0;
    color: rgba(255, 255, 255, 0.82);
  }
  @media (max-width: 600px) {
    .resources {
      padding: 20px 16px 60px;
    }
    .head h1 {
      font-size: 40px;
    }
    .head .lede {
      font-size: 17px;
    }
  }
</style>
