<!--
  /science/watch-list — curated watch list: sci-fi films, space
  documentaries, podcasts, and YouTube channels.

  Sibling to /science/reading-list (#128). Same shape: hardcoded
  curation, easy PR edits, no JSON+i18n overlay overhead.

  Issue #129. Curator: the maintainer; PRs welcome.
-->
<script lang="ts">
  type Entry = {
    title: string;
    creator: string;
    year?: number;
    blurb: string;
    href?: string;
  };

  const films: Entry[] = [
    {
      title: 'Contact',
      creator: 'Robert Zemeckis · screenplay by Carl Sagan & Ann Druyan',
      year: 1997,
      blurb:
        "From Sagan's novel. The most respectful Hollywood film about SETI ever made — gets the science right, the politics right, and treats faith as a serious counterweight rather than a strawman.",
    },
    {
      title: 'Interstellar',
      creator: 'Christopher Nolan',
      year: 2014,
      blurb:
        'Kip Thorne consulted on the physics; the black-hole render in the film led to a peer-reviewed paper. Hard SF wrapped in a family story. The hour-on-the-water-planet scene is the best illustration of time dilation in any medium.',
    },
    {
      title: '2001: A Space Odyssey',
      creator: 'Stanley Kubrick · screenplay with Arthur C. Clarke',
      year: 1968,
      blurb:
        "Made before Apollo 11 landed. Kubrick refused to fake anything he couldn't justify physically: rotating-habitat gravity, vacuum silence, slow ballistic trajectories. The visual language of every serious space film since.",
    },
    {
      title: 'The Martian',
      creator: 'Ridley Scott · novel by Andy Weir',
      year: 2015,
      blurb:
        'An astronaut survives by running the numbers. Hab fabric, RTG, perchlorates, water synthesis — every problem in the film is a real problem and every solution is the one a real engineer would try. Pair with /mars site=curiosity.',
    },
    {
      title: 'Apollo 13',
      creator: 'Ron Howard',
      year: 1995,
      blurb:
        "Procedural drama for the procedural-drama age. The CO₂ scrubber scene is the platonic ideal of mission-engineer competence; the navigation-by-Earth's-terminator scene is good orbital mechanics.",
    },
    {
      title: 'Moon',
      creator: 'Duncan Jones',
      year: 2009,
      blurb:
        'Small, quiet, claustrophobic. Sam Rockwell as a lone helium-3 miner on the far side. Practical effects, sparse music, a single performance. The opposite of spectacle SF.',
    },
    {
      title: 'For All Mankind',
      creator: 'Ronald D. Moore · Apple TV+',
      year: 2019,
      blurb:
        'Alt-history series: what if the Soviets landed on the Moon first? Becomes a multi-decade serious treatment of a near-future space industry. The hardware details are unusually accurate for prestige TV.',
    },
  ];

  const docs: Entry[] = [
    {
      title: 'For All Mankind',
      creator: 'Al Reinert',
      year: 1989,
      blurb:
        "Apollo documentary using only the astronauts' own narration over NASA's restored footage. No talking heads, no historians — just the missions. Brian Eno scored it. The reference text.",
      href: 'https://en.wikipedia.org/wiki/For_All_Mankind_(film)',
    },
    {
      title: 'In the Shadow of the Moon',
      creator: 'David Sington',
      year: 2007,
      blurb:
        'Interviews with all the surviving Apollo astronauts (no Armstrong; he declined). Layered against archival footage. Best companion piece to the Apollo missions in the /missions catalogue.',
      href: 'https://en.wikipedia.org/wiki/In_the_Shadow_of_the_Moon_(2007_film)',
    },
    {
      title: 'Cosmos: A Personal Voyage',
      creator: 'Carl Sagan · PBS',
      year: 1980,
      blurb:
        '13 episodes. Still the best long-form science television ever made. The Voyager imagery was state-of-the-art when it aired; the Library of Alexandria reconstruction still works 45 years later.',
      href: 'https://en.wikipedia.org/wiki/Cosmos:_A_Personal_Voyage',
    },
    {
      title: 'When We Left Earth: The NASA Missions',
      creator: 'Discovery Channel',
      year: 2008,
      blurb:
        'Six episodes covering Mercury, Gemini, Apollo, Shuttle, ISS, and Hubble. NASA opened the archives for it; the unscored mission footage is the highlight.',
      href: 'https://en.wikipedia.org/wiki/When_We_Left_Earth',
    },
  ];

  const podcasts: Entry[] = [
    {
      title: 'Off-Nominal',
      creator: 'Jake Robins & Anthony Colangelo',
      blurb:
        "Two space podcasters who actually know what they're talking about, riffing on the week's industry news. Best place to get caught up on commercial spaceflight policy + launch operations.",
      href: 'https://offnominal.space/',
    },
    {
      title: 'Main Engine Cut Off',
      creator: 'Anthony Colangelo',
      blurb:
        'Solo deep-dives on specific commercial / NASA program decisions. Tightly edited; ~30 min per episode. Listen to the back catalogue chronologically for a clear narrative of the 2015-2025 launch industry.',
      href: 'https://mainenginecutoff.com/podcast',
    },
    {
      title: 'Are We There Yet?',
      creator: 'WMFE / Brendan Byrne',
      blurb:
        'Florida-public-radio space coverage. Strong on Kennedy Space Center + commercial launch site operations. Short episodes, news-driven.',
      href: 'https://www.wmfe.org/podcasts/are-we-there-yet',
    },
  ];

  const channels: Entry[] = [
    {
      title: 'Scott Manley',
      creator: 'youtube.com/@scottmanley',
      blurb:
        'KSP-famous Scottish astronomer-turned-explainer. Best at making active mission news comprehensible 24 hours after it happens. Mix of launch breakdowns + historical deep dives.',
      href: 'https://www.youtube.com/@scottmanley',
    },
    {
      title: 'Everyday Astronaut',
      creator: 'youtube.com/@EverydayAstronaut',
      blurb:
        'Tim Dodd; long-form interviews with rocket engineers + visual explainers of propulsion concepts. The Raptor-engine series is a free graduate course in modern liquid-fuel design.',
      href: 'https://www.youtube.com/@EverydayAstronaut',
    },
    {
      title: 'Veritasium',
      creator: 'youtube.com/@veritasium',
      blurb:
        'Derek Muller; broader science channel but the space episodes (light cones, Kessler syndrome, gravitational lensing) are unusually careful with the physics. Good production budget put to honest use.',
      href: 'https://www.youtube.com/@veritasium',
    },
    {
      title: 'PBS Space Time',
      creator: 'youtube.com/@pbsspacetime',
      blurb:
        "For when you want the math. Matt O'Dowd walks through relativity, cosmology, quantum gravity at a level where you'll still need to pause and think. The graduate-level companion to the rest of this list.",
      href: 'https://www.youtube.com/@pbsspacetime',
    },
  ];
</script>

<svelte:head>
  <title>Watch list · Orrery Science</title>
  <meta
    name="description"
    content="Curated sci-fi films, space documentaries, podcasts, and YouTube channels to accompany the Orrery science encyclopedia."
  />
</svelte:head>

<article class="resources">
  <header class="head">
    <h1>Watch list</h1>
    <p class="lede">
      Films, documentaries, podcasts, and YouTube channels for when you want space content you
      didn't have to read. Curated for what's actually accurate (or beautifully wrong on purpose),
      not for what's popular.
    </p>
    <p class="caveat">
      <strong>Draft seed (v0.6.3).</strong> If you have a recommendation that fits this list, open an
      issue or PR. The bar: respects the science, made by people who care, holds up on a re-watch.
    </p>
  </header>

  <section class="block">
    <h2>Sci-fi films</h2>
    <ul class="entries">
      {#each films as f (f.title)}
        <li class="entry">
          <div class="entry-head">
            <h3>{f.title}</h3>
            <span class="meta">{f.creator}{f.year ? ` · ${f.year}` : ''}</span>
          </div>
          <p class="blurb">{f.blurb}</p>
        </li>
      {/each}
    </ul>
  </section>

  <section class="block">
    <h2>Documentaries</h2>
    <ul class="entries">
      {#each docs as d (d.title)}
        <li class="entry">
          <div class="entry-head">
            <h3>
              {#if d.href}<a href={d.href} target="_blank" rel="noopener noreferrer external"
                  >{d.title}</a
                >{:else}{d.title}{/if}
            </h3>
            <span class="meta">{d.creator}{d.year ? ` · ${d.year}` : ''}</span>
          </div>
          <p class="blurb">{d.blurb}</p>
        </li>
      {/each}
    </ul>
  </section>

  <section class="block">
    <h2>Podcasts</h2>
    <ul class="entries">
      {#each podcasts as p (p.title)}
        <li class="entry">
          <div class="entry-head">
            <h3>
              <a href={p.href} target="_blank" rel="noopener noreferrer external">{p.title}</a>
            </h3>
            <span class="meta">{p.creator}</span>
          </div>
          <p class="blurb">{p.blurb}</p>
        </li>
      {/each}
    </ul>
  </section>

  <section class="block">
    <h2>YouTube channels</h2>
    <ul class="entries">
      {#each channels as c (c.title)}
        <li class="entry">
          <div class="entry-head">
            <h3>
              <a href={c.href} target="_blank" rel="noopener noreferrer external">{c.title}</a>
            </h3>
            <span class="meta">{c.creator}</span>
          </div>
          <p class="blurb">{c.blurb}</p>
        </li>
      {/each}
    </ul>
  </section>
</article>

<style>
  /* Inherits visual language from the /science/reading-list sibling
   * page; intentional copy-paste rather than a shared component since
   * the entry-card layout is the same but the data shape isn't. */
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
