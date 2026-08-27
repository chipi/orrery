<!--
  The Long View — original hero title card for /essays. A crafted editorial
  key-art (not a photo composite): a lone observer on a dark ridge looking out
  across a luminous spiral — "one story told in a spiral", the long view. Pure
  SVG so it scales crisply + matches the essays' own diagram idiom. The wordmark
  is real HTML type (Bebas) overlaid, so it stays sharp + localisable.
-->
<script lang="ts">
  // Deterministic star scatter (no Math.random so SSR + client match).
  const STARS = [
    [40, 44, 1.1, 0.5],
    [110, 78, 0.8, 0.35],
    [176, 30, 1.4, 0.6],
    [230, 96, 0.7, 0.3],
    [300, 52, 1, 0.45],
    [360, 120, 0.9, 0.4],
    [86, 150, 0.7, 0.3],
    [150, 190, 1.2, 0.5],
    [420, 40, 0.8, 0.35],
    [470, 150, 1, 0.4],
    [540, 70, 1.3, 0.55],
    [600, 130, 0.8, 0.35],
    [660, 46, 1, 0.45],
    [720, 110, 0.9, 0.4],
    [780, 60, 1.2, 0.5],
    [840, 128, 0.8, 0.35],
    [900, 44, 1.1, 0.5],
    [950, 150, 0.9, 0.4],
    [1010, 70, 1, 0.45],
    [1080, 120, 0.8, 0.35],
    [1140, 50, 1.3, 0.55],
    [26, 210, 0.9, 0.35],
    [250, 160, 0.8, 0.3],
    [520, 200, 0.9, 0.35],
    [980, 210, 0.8, 0.3],
    [1120, 200, 1, 0.4],
    [700, 200, 0.7, 0.3],
    [400, 210, 0.8, 0.3],
  ] as const;

  // Star dots strung along the spiral arms (galaxy centred ~ (880,150)).
  const ARM_DOTS = [
    [812, 150, 1.1],
    [770, 132, 1],
    [736, 108, 0.9],
    [716, 80, 0.8],
    [712, 54, 0.7],
    [948, 150, 1.1],
    [990, 168, 1],
    [1024, 192, 0.9],
    [1044, 220, 0.8],
    [1050, 246, 0.7],
    [860, 96, 0.9],
    [900, 208, 0.9],
    [822, 196, 0.8],
    [936, 96, 0.8],
  ] as const;
</script>

<div class="lv-hero">
  <svg
    class="lv-art"
    viewBox="0 0 1200 300"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="lv-core" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff6e6" stop-opacity="0.95" />
        <stop offset="28%" stop-color="#ffd9a0" stop-opacity="0.6" />
        <stop offset="70%" stop-color="#7f9ce0" stop-opacity="0.12" />
        <stop offset="100%" stop-color="#7f9ce0" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="lv-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a1430" stop-opacity="0.85" />
        <stop offset="55%" stop-color="#070d20" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#04040c" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="lv-horizon" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffcaa0" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#ffcaa0" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="lv-traj" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="#4ecdc4" stop-opacity="0" />
        <stop offset="45%" stop-color="#7fd8e0" stop-opacity="0.65" />
        <stop offset="100%" stop-color="#fff2d6" stop-opacity="0.9" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="1200" height="300" fill="url(#lv-sky)" />

    <!-- star field -->
    <g fill="#dfe8ff">
      {#each STARS as [x, y, r, o] (`${x}-${y}`)}
        <circle cx={x} cy={y} {r} opacity={o} />
      {/each}
    </g>

    <!-- the spiral: luminous core + two elegant arms -->
    <g fill="none" stroke="#9fb8f0" stroke-linecap="round">
      <path d="M880 150 C 812 120, 742 92, 712 46" stroke-width="3" opacity="0.4" />
      <path d="M880 150 C 948 180, 1018 208, 1050 252" stroke-width="3" opacity="0.4" />
      <path d="M880 150 C 828 96, 872 62, 936 70" stroke-width="1.6" opacity="0.25" />
      <path d="M880 150 C 932 206, 888 238, 824 228" stroke-width="1.6" opacity="0.25" />
    </g>
    <circle cx="880" cy="150" r="120" fill="url(#lv-core)" />
    <g fill="#eaf1ff">
      {#each ARM_DOTS as [x, y, r] (`${x}-${y}`)}
        <circle cx={x} cy={y} {r} opacity="0.85" />
      {/each}
    </g>

    <!-- the journey: a long trajectory sweeping from the observer to the spiral -->
    <path
      d="M150 268 C 360 250, 560 210, 880 150"
      fill="none"
      stroke="url(#lv-traj)"
      stroke-width="2.4"
      stroke-linecap="round"
    />

    <!-- foreground ridge + a warm horizon glow -->
    <rect x="0" y="252" width="1200" height="20" fill="url(#lv-horizon)" opacity="0.6" />
    <path
      d="M0 300 L0 272 C 180 262, 340 276, 520 274 C 760 271, 980 284, 1200 268 L1200 300 Z"
      fill="#04050b"
    />

    <!-- the lone observer, looking out (small = scale) -->
    <g transform="translate(150 250)" fill="#04050b" stroke="#5a6b90" stroke-width="0.8">
      <ellipse cx="0" cy="22" rx="7" ry="2.4" fill="#04050b" stroke="none" opacity="0.6" />
      <circle cx="0" cy="4" r="3.2" />
      <path d="M-2.6 7 h5.2 v11 a2.6 2.6 0 0 1 -5.2 0 z" />
      <path d="M-2.4 19 l-1.4 4 M2.4 19 l1.4 4" stroke-linecap="round" />
    </g>
  </svg>

  <div class="lv-text">
    <h1 class="lv-title">The Long View</h1>
    <p class="lv-kicker">Essays from Orrery · one story, told in a spiral</p>
  </div>
</div>

<style>
  .lv-hero {
    position: relative;
    width: 100%;
    /* A clamped HEIGHT (not a fixed aspect ratio) so the banner never collapses
       into a thin strip on portrait phones — always tall enough for the title. */
    height: clamp(172px, 26vw, 300px);
    border-radius: 12px;
    overflow: hidden;
    background:
      radial-gradient(120% 140% at 78% 42%, rgba(30, 44, 92, 0.5), transparent 60%), #05060e;
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 22px;
  }
  .lv-art {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .lv-text {
    position: absolute;
    left: clamp(18px, 4vw, 48px);
    bottom: clamp(14px, 4vw, 34px);
    z-index: 1;
  }
  .lv-title {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: clamp(44px, 8.5vw, 92px);
    line-height: 0.9;
    letter-spacing: 1px;
    margin: 0;
    color: #fff;
    text-shadow: 0 2px 20px rgba(4, 6, 16, 0.8);
  }
  .lv-kicker {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: clamp(10px, 1.6vw, 13px);
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #9fb8f0;
    margin: 8px 0 0;
    text-shadow: 0 1px 8px rgba(4, 6, 16, 0.9);
  }
</style>
