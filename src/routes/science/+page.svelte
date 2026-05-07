<!--
  /science — encyclopedia tab index landing.

  An editorial "Space 101" narrative that walks a curious newcomer
  through how rockets actually reach the Moon or Mars. Every italic
  technical term cross-links into the matching encyclopedia section,
  and the closing tools panel links into the live app routes.
  Below the story sits the six-tab grid for direct lookup.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { SCIENCE_TABS } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  function tabLabel(tab: string): string {
    const key = `science_tab_${tab.replace(/-/g, '_')}` as keyof typeof m;
    const fn = m[key] as (() => string) | undefined;
    return typeof fn === 'function'
      ? fn()
      : tab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
</script>

<svelte:head>
  <title>{m.science_page_title()}</title>
  <meta name="description" content={m.science_meta_description()} />
</svelte:head>

<div class="page">
  <header class="hero">
    <h1>{m.science_heading()}</h1>
    <p class="lede">{m.science_intro()}</p>
  </header>

  <article class="story">
    <section class="chapter">
      <h2>So you want to fly a rocket to Mars.</h2>
      <p class="kicker">
        Welcome. This is the part of Orrery where the buttons stop being magic. Every label in the
        HUD, every coloured contour in the porkchop, every burn marker on the trajectory — this
        section explains where it comes from. Read it like a comic book: the diagrams do most of the
        work, and every <em>italicised term</em> is a link you can chase as deep as you want.
      </p>
      <p>
        We're going to build a rocket together. Not a literal one — Orrery is a simulator — but the
        same chain of decisions a real flight team makes, in the order they'd make them. By the end
        you'll know why launch windows happen every 26 months for Mars and every month for the Moon,
        why a free-return trajectory exists, and why
        <em>thrust</em> is the cheapest part of a mission and <em>fuel</em> is the entire fight.
      </p>
    </section>

    <section class="chapter">
      <h2>1 — Gravity is the only physics that matters.</h2>
      <figure class="story-fig">
        <img
          src="{base}/diagrams/science/keplerian-orbit.svg"
          alt="An ellipse with the Sun at one focus."
        />
        <figcaption>One body, one focus, one ellipse. That's the whole solar system.</figcaption>
      </figure>
      <p>
        Forget rockets for a second. Stand on the Earth, throw a baseball as hard as you can. It
        comes back down. Throw it harder, it lands farther. Throw it
        <em>so</em> hard that the ground curves away faster than the ball falls, and the ball misses
        the planet — forever. That's an
        <a href="{base}/science/orbits/keplerian-orbit">orbit</a>. Every spacecraft, every planet,
        every rock in the asteroid belt is doing this trick around something heavier.
      </p>
      <p>
        An orbit is an ellipse. It has a
        <a href="{base}/science/orbits/semi-major-axis">size</a>, a
        <a href="{base}/science/orbits/eccentricity">shape</a> (round vs. stretched), a
        <a href="{base}/science/orbits/inclination">tilt</a>, and a phase telling you where on the
        ellipse the spacecraft is right now (<a href="{base}/science/orbits/true-anomaly"
          >true anomaly</a
        >). Five numbers and you can predict the position of any object in the solar system,
        forever, without any other data. That's
        <a href="{base}/science/orbits/keplers-laws">Kepler's three laws</a>, written down in 1609 —
        they still work.
      </p>
      <p>
        The single most useful equation you'll meet here is
        <a href="{base}/science/orbits/vis-viva">vis-viva</a>. Plug in your radius, your orbit's
        size, and out comes your speed. That's it. Earth at perihelion: 30.3 km/s. Earth at
        aphelion: 29.3 km/s. Same orbit, same energy, different speed.
      </p>
    </section>

    <section class="chapter">
      <h2>2 — The rocket equation is the boss fight.</h2>
      <figure class="story-fig">
        <img
          src="{base}/diagrams/science/tsiolkovsky.svg"
          alt="Mass-ratio curve: ∆v rises logarithmically with how much fuel you burn."
        />
        <figcaption>
          The cruel truth: doubling your ∆v means burning a lot more than 2× the fuel.
        </figcaption>
      </figure>
      <p>
        Now: how do you change orbits? You burn fuel.
        <a href="{base}/science/propulsion/dv-budget">∆v</a> ("delta-v") is the universal currency of
        spaceflight — the total velocity change a mission needs. Every move you make on a trajectory
        has a price tag in km/s.
      </p>
      <p>
        And that price is brutal. The
        <a href="{base}/science/propulsion/tsiolkovsky">Tsiolkovsky rocket equation</a> says ∆v
        scales with the <em>logarithm</em> of how much of your rocket is fuel. Want twice the ∆v? You
        don't carry twice the fuel — you carry exponentially more. This is why a Saturn V was 90% propellant.
        Most of the rocket is the fuel that lifts the fuel that lifts the fuel that lifts the spacecraft.
      </p>
      <p>
        Two numbers fight this gravity tax. <em>Thrust</em> tells you how hard the engine pushes —
        that's the number nobody really cares about after launch.
        <a href="{base}/science/propulsion/specific-impulse">Specific impulse</a> tells you how
        <em>efficiently</em> the engine pushes — and that's the one that matters. A chemical rocket gets
        ~450 seconds. An ion thruster gets 4,000+ — sips fuel for months and outperforms anything chemical
        for deep-space cruises.
      </p>
      <p>
        Best magic trick of all: the
        <a href="{base}/science/propulsion/oberth-effect">Oberth effect</a>. Burning your engine
        when you're already moving fast (low and close to a planet) gives you
        <em>way</em> more bang for the same fuel. This is why every interplanetary mission does its big
        departure burn at perigee, hugging the Earth, going as fast as physics allows. Free energy from
        geometry.
      </p>
    </section>

    <section class="chapter">
      <h2>3 — Once you're in orbit, you're halfway to anywhere.</h2>
      <figure class="story-fig">
        <img
          src="{base}/diagrams/science/hohmann-transfer.svg"
          alt="An ellipse tangent to Earth's orbit and Mars's orbit."
        />
        <figcaption>Two burns, one ellipse. The cheapest way to change orbits.</figcaption>
      </figure>
      <p>
        Robert Heinlein wrote it: "Once you're in orbit, you're halfway to anywhere in the solar
        system." He wasn't kidding. Reaching low Earth orbit costs ~9.4 km/s of ∆v. Going from there
        to <em>Mars</em> costs another ~3.6 km/s. The hardest part is already behind you.
      </p>
      <p>
        The cheapest interplanetary route is a
        <a href="{base}/science/transfers/hohmann-transfer">Hohmann transfer</a>: an ellipse that
        just barely kisses Earth's orbit at one end and the destination's orbit at the other. Two
        burns, no wasted fuel. To Mars it takes ~8.5 months. Slow, but optimal.
      </p>
      <p>
        Want to go faster? Solve a
        <a href="{base}/science/transfers/lambert-problem">Lambert's problem</a> — pick your
        departure date and your transit time, and Lambert tells you the unique
        <a href="{base}/science/transfers/transfer-ellipse">transfer ellipse</a> that connects them.
        That's exactly what Orrery's
        <a href="{base}/plan">/plan</a> screen does, ten thousand times in parallel, to draw a porkchop
        plot.
      </p>
      <p>
        Need to go even further? Steal speed from a planet. A
        <a href="{base}/science/transfers/gravity-assist">gravity assist</a> uses a flyby to change
        your trajectory at zero fuel cost — Voyager 2 used four of them to reach Neptune. The whole
        solar system stitches together as
        <a href="{base}/science/transfers/patched-conics">patched conics</a>: a series of
        <a href="{base}/science/transfers/conic-sections">conic-section</a> arcs handed off between gravitational
        neighbourhoods like batons in a relay race.
      </p>
    </section>

    <section class="chapter">
      <h2>4 — Pick a launch window, or wait two years.</h2>
      <figure class="story-fig">
        <img
          src="{base}/diagrams/science/porkchop.svg"
          alt="The classic porkchop contour plot — departure date on x, time of flight on y."
        />
        <figcaption>
          A porkchop. Each contour is constant ∆v; the lobe is when nature makes Mars cheap.
        </figcaption>
      </figure>
      <p>
        Earth and Mars don't sit still. Earth races around the Sun every 365 days, Mars every 687.
        Their relative geometry repeats only every ~26 months — and most of those months, the
        planets are too far apart, on the wrong sides of the Sun, to reach cheaply. Mission design
        starts with a calendar, not a rocket.
      </p>
      <p>
        The <a href="{base}/science/porkchop/what-is-a-porkchop">porkchop plot</a> is how engineers
        see this. Departure date along
        <a href="{base}/science/porkchop/departure-axis">one axis</a>,
        <a href="{base}/science/porkchop/tof-axis">flight time</a> along the other, ∆v as a
        <a href="{base}/science/porkchop/dv-heatmap">colour heatmap</a>. Cheap zones appear as oval
        lobes — the launch windows. Outside the lobe: red, expensive,
        impossible-with-current-rockets.
        <a href="{base}/science/porkchop/contour-reading">Reading the contours</a>
        is half the job of a flight dynamicist.
      </p>
      <p>
        Two technical terms you'll see everywhere:
        <a href="{base}/science/propulsion/c3">C3</a> is the launch energy your rocket needs to
        leave Earth's gravity well. <a href="{base}/science/propulsion/v-infinity">V∞</a>
        ("v-infinity") is your speed relative to the destination at the moment you arrive. Both come
        straight out of the porkchop math.
      </p>
    </section>

    <section class="chapter">
      <h2>5 — The flight is just five phases on repeat.</h2>
      <figure class="story-fig">
        <img
          src="{base}/diagrams/science/edl.svg"
          alt="Atmospheric entry, parachute deploy, retropropulsion, landing."
        />
        <figcaption>Entry, descent, landing. Six minutes of pure terror.</figcaption>
      </figure>
      <p>
        Pretty much every interplanetary mission, from Voyager to Perseverance, runs the same
        script:
      </p>
      <ol class="phases">
        <li>
          <a href="{base}/science/mission-phases/launch">Launch</a> — get out of the atmosphere and into
          low Earth orbit.
        </li>
        <li>
          <a href="{base}/science/mission-phases/trans-x-injection">Trans-X Injection</a> — a single
          hard burn at perigee that flings you onto the transfer ellipse to the Moon (TLI), Mars (TMI),
          Venus (TVI), or Jupiter (TJI).
        </li>
        <li>
          <a href="{base}/science/mission-phases/tcm">Trajectory Correction Manoeuvres</a> — tiny burns
          during cruise to fix dispersion errors. Usually 1–3 of them.
        </li>
        <li>
          <a href="{base}/science/mission-phases/orbit-insertion">Orbit Insertion</a> — a braking burn
          at the destination to bend you into a captured orbit.
        </li>
        <li>
          <a href="{base}/science/mission-phases/edl">EDL</a> — Entry, Descent, Landing — for the lander.
          Six minutes of supersonic atmospheric chaos.
        </li>
      </ol>
      <p>
        Lunar missions sometimes detour through a
        <a href="{base}/science/mission-phases/nrho">Near-Rectilinear Halo Orbit</a> (Gateway will
        live in one), and crewed Apollo flights flew
        <a href="{base}/science/transfers/free-return">free-return trajectories</a> — figure-8 paths
        that drop you back to Earth automatically if every engine on the spacecraft dies. Apollo 13 owes
        its life to this geometry.
      </p>
    </section>

    <section class="chapter">
      <h2>6 — Distances and time, since none of this is Earth-sized.</h2>
      <figure class="story-fig">
        <img
          src="{base}/diagrams/science/au.svg"
          alt="The astronomical unit, marked along Earth's orbital radius."
        />
        <figcaption>One AU = one Earth-Sun distance. Mars is ~1.5 AU. Jupiter is ~5.2.</figcaption>
      </figure>
      <p>
        Three units pop up everywhere. The
        <a href="{base}/science/scales-time/au">astronomical unit</a> (AU) is the average Earth-Sun
        distance — 150 million km. We measure the solar system in AU because kilometres get unwieldy
        fast. The
        <a href="{base}/science/scales-time/light-minute">light-minute</a> tells you how long it takes
        a radio signal to reach a spacecraft. Mars: 4 to 24 minutes one-way. You can't joystick a rover
        from Earth. Everything important is autonomous.
      </p>
      <p>
        The <a href="{base}/science/scales-time/j2000">J2000 epoch</a> is the calendar zero every
        astrodynamicist uses.
        <a href="{base}/science/scales-time/sidereal-synodic">Sidereal vs. synodic periods</a>
        explain why Mars windows recur every 26 months instead of every 23. The
        <a href="{base}/science/scales-time/ecliptic-plane">ecliptic plane</a> is the flat disc the
        planets all (mostly) lie on.
        <a href="{base}/science/scales-time/frames">Reference frames</a> are the coordinate systems mission
        control juggles between Earth-centred, Sun-centred, and body-centred views.
      </p>
    </section>

    <section class="chapter">
      <h2>Now go play.</h2>
      <p>
        That's the whole loop. You now know enough to read every label, contour, and HUD readout in
        the rest of the app. Here's where to put it to work:
      </p>
      <ul class="tools">
        <li>
          <a href="{base}/explore">/explore</a> — Spin the solar system. Watch Kepler's laws live. Click
          any planet for its orbital elements.
        </li>
        <li>
          <a href="{base}/plan">/plan</a> — Pick a destination, pick a launch year, see the porkchop.
          The lobe is where Hohmann transfers hide.
        </li>
        <li>
          <a href="{base}/fly">/fly</a> — Fly a real mission arc. The HUD shows ∆v, V∞, MET, distance
          to Earth. Every number is something you just learned.
        </li>
        <li>
          <a href="{base}/missions">/missions</a> — 36 real spacecraft, from Luna 9 to Artemis II. Each
          one's FLIGHT tab decomposes its actual ∆v budget across the phases above.
        </li>
        <li>
          <a href="{base}/earth">/earth</a> · <a href="{base}/moon">/moon</a> ·
          <a href="{base}/mars">/mars</a> — Ground truth. Where every Apollo, every rover, every active
          satellite actually sits.
        </li>
        <li>
          <a href="{base}/iss">/iss</a> · <a href="{base}/tiangong">/tiangong</a> — The two inhabited
          orbital outposts, module by module.
        </li>
      </ul>
      <p class="closing">
        Below this story, the encyclopedia proper: six tabs, forty entries, every formula and every
        diagram in one place. Bookmark it. We'll be here when you need it.
      </p>
    </section>
  </article>

  <h2 class="grid-heading">{m.science_heading()} — Reference</h2>
  <ul class="tab-grid">
    {#each SCIENCE_TABS as tab (tab)}
      <li>
        <a class="tab-card" href="{base}/science/{tab}">
          <span class="tab-name">{tabLabel(tab)}</span>
        </a>
      </li>
    {/each}
  </ul>
</div>

<style>
  .page {
    max-width: 760px;
    margin: 0 auto;
    padding: 32px 16px 48px;
  }
  .hero {
    margin-bottom: 32px;
  }
  .hero h1 {
    font-family: var(--font-display);
    font-size: 32px;
    letter-spacing: 4px;
    margin: 0 0 8px;
  }
  .lede {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
    max-width: 560px;
    margin: 0;
  }

  .story {
    margin: 0 0 56px;
    padding: 24px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .chapter {
    margin: 0 0 36px;
  }
  .chapter h2 {
    font-family: var(--font-display);
    font-size: 20px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.95);
    margin: 0 0 14px;
  }
  .chapter p,
  .chapter li {
    font-family: 'Crimson Pro', serif;
    font-size: 16px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.82);
    margin: 0 0 14px;
  }
  .chapter .kicker {
    font-style: italic;
    color: rgba(255, 255, 255, 0.7);
  }
  .chapter a {
    color: #4ecdc4;
    text-decoration: none;
    border-bottom: 1px dotted rgba(78, 205, 196, 0.4);
  }
  .chapter a:hover {
    border-bottom-color: #4ecdc4;
  }
  .chapter em {
    font-style: italic;
    color: rgba(255, 255, 255, 0.95);
  }
  .story-fig {
    margin: 18px 0 22px;
    text-align: center;
  }
  .story-fig img {
    max-width: 100%;
    height: auto;
    max-height: 240px;
    opacity: 0.92;
  }
  .story-fig figcaption {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
    margin-top: 8px;
  }
  ol.phases {
    list-style-position: inside;
    padding-left: 4px;
  }
  ol.phases li {
    margin: 0 0 8px;
  }
  ul.tools {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
  }
  ul.tools li {
    margin: 0 0 10px;
    padding-left: 12px;
    border-left: 2px solid rgba(78, 205, 196, 0.3);
  }
  .closing {
    font-style: italic;
    color: rgba(255, 255, 255, 0.7);
  }

  .grid-heading {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.55);
    margin: 0 0 14px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .tab-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }
  .tab-card {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 96px;
    padding: 20px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: var(--color-text);
    text-decoration: none;
    text-align: center;
    transition:
      border-color 120ms,
      background 120ms;
  }
  .tab-card:hover,
  .tab-card:focus-visible {
    border-color: rgba(78, 205, 196, 0.55);
    background: rgba(78, 205, 196, 0.08);
    outline: none;
  }
  .tab-name {
    font-family: var(--font-display);
    font-size: 18px;
    letter-spacing: 3px;
  }
</style>
