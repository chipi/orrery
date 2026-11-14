<!--
  /dev/launch-director — G3 review prototype (dev-only, 404 in production like all of /dev).
  Plays one launch with the camera DIRECTOR (src/lib/orbital/ascent-director.ts) driving the
  existing launch scene's camera, over a seeded sky, sun, cloud deck and pad smoke
  (src/lib/three/launch-conditions-scene.ts). /fly is untouched.

  Query: launcher= (profile id, default falcon-9)  name= (flown variant, e.g. "Atlas V 541")
  mission= (seed + payload model id: artemis2, galileo, curiosity)  seed= (overrides the
  vehicle+mission seed)  mode=director|today  speed=1|5|20  light=midday|golden|dusk|night
  cover=clear|scattered|deck|heavy  opening=tower_clear|pad_wide|overhead_drop|pad_dusk
  reduced=1  cond=0 (no sky/cloud rig)  ui=0 (no overlay)  paused=1  t0=<flight s>  pr=<pixel ratio>.
  window.__g3 drives it from a script: setT(t), plan, duration.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { streamedUrl } from '$lib/asset-url';
  import { createAscentScene, VEHICLE_LENGTH_KM, type AscentScene } from '$lib/three/ascent-scene';
  import { createAscentRenderer, type AscentRenderer } from '$lib/three/ascent-renderer';
  import { resolveLaunchGround } from '$lib/three/launch-ground';
  import { attachLaunchConditions, type ConditionsRig } from '$lib/three/launch-conditions-scene';
  import {
    integrateAscent,
    sampleAscentAt,
    type AscentSummary,
    type LaunchProfile,
  } from '$lib/physics/ascent/ascent-physics';
  import { loadLaunchProfile } from '$lib/physics/ascent/launch-profile-registry';
  import { padState, T_MINUS_S } from '$lib/orbital/ascent-hud';
  import { buildShotSchedule } from '$lib/orbital/ascent-cameras';
  import {
    buildDirectorPlan,
    directedPoseAt,
    type CoverId,
    type DirectorPlan,
    type LightId,
    type OpeningId,
  } from '$lib/orbital/ascent-director';

  let container: HTMLDivElement;
  const q =
    typeof window === 'undefined'
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const launcher = q.get('launcher') ?? 'falcon-9';
  const flown = q.get('name') ?? undefined;
  const missionId = q.get('mission') ?? undefined;
  const seedParam = q.get('seed');
  const showUi = q.get('ui') !== '0';

  let mode = $state<'director' | 'today'>(q.get('mode') === 'today' ? 'today' : 'director');
  let playing = $state(q.get('paused') !== '1');
  let speed = $state(Number(q.get('speed') ?? 5));
  let t = $state(q.get('t0') != null ? Number(q.get('t0')) : -T_MINUS_S + 8);
  let status = $state('loading…');
  let plan = $state<DirectorPlan | null>(null);
  let endT = $state(0);
  let shotLabel = $state('');
  let seedInput = $state(seedParam ?? '');

  const link = (extra: Record<string, string>): string => {
    const u = new URLSearchParams(q);
    for (const [k, v] of Object.entries(extra)) u.set(k, v);
    return `?${u.toString()}`;
  };

  onMount(() => {
    let disposed = false;
    let ar: AscentRenderer | undefined;
    let asc: AscentScene | undefined;
    let rig: ConditionsRig | undefined;
    let raf = 0;
    const cleanups: (() => void)[] = [];

    (async () => {
      const profile: LaunchProfile | null = await loadLaunchProfile(launcher, fetch, base, flown);
      if (!profile || disposed) {
        status = `no profile for ${launcher}`;
        return;
      }
      const summary: AscentSummary = integrateAscent(profile);
      const duration = summary.totalDurationS;
      const reduced = q.get('reduced') === '1';
      const altAt = (tt: number): number => sampleAscentAt(summary.states, tt).altKm;
      const thePlan = buildDirectorPlan({
        vehicleId: profile.id,
        missionId,
        seed: seedParam != null && seedParam !== '' ? Number(seedParam) : undefined,
        events: summary.events,
        maxQt: summary.maxQ.t,
        duration,
        altAt,
        hasBoosters: (profile.boosters?.count ?? 0) > 0,
        speed,
        reducedMotion: reduced,
        force: {
          opening: (q.get('opening') as OpeningId | null) ?? undefined,
          light: (q.get('light') as LightId | null) ?? undefined,
          cover: (q.get('cover') as CoverId | null) ?? undefined,
        },
      });
      plan = thePlan;
      endT = thePlan.shots[thePlan.shots.length - 1].tEnd;

      const schedule = buildShotSchedule({
        events: summary.events,
        maxQt: summary.maxQ.t,
        duration,
        endT: duration,
      });
      const w = container.clientWidth;
      const h = container.clientHeight;
      const launchSite = profile.launchSite;
      asc = createAscentScene({
        aspect: w / h,
        earthDayUrl: `${base}/textures/4k_earth_daymap.jpg`,
        earthNightUrl: `${base}/textures/2k_earth_nightmap.jpg`,
        launchSite,
        vehicleLengthKm: VEHICLE_LENGTH_KM,
        schedule,
        events: summary.events,
        spacecraftId: missionId,
        launcherId: profile.id,
        boosterCount: profile.boosters?.count ?? 0,
        boosterAirLitCount: profile.boosters?.airLitCount ?? 0,
        groundSite: (() => {
          const g = resolveLaunchGround(launchSite);
          return g ? { ...g, textureUrl: streamedUrl(`${base}${g.textureUrl}`) } : undefined;
        })(),
      });
      ar = createAscentRenderer(container, asc, { iblEnabled: false });
      const pr = q.get('pr');
      if (pr) ar.renderer.setPixelRatio(Number(pr));
      if (q.get('cond') !== '0')
        rig = attachLaunchConditions(
          asc,
          thePlan.conditions,
          VEHICLE_LENGTH_KM,
          `${base}/textures/2k_earth_nightmap.jpg`,
        );

      const renderAt = (tt: number): void => {
        if (!asc || !ar) return;
        const sampled = tt < 0 ? padState(summary, tt) : sampleAscentAt(summary.states, tt);
        const s = tt > sampled.t ? { ...sampled, t: tt } : sampled;
        asc.setState(s);
        if (mode === 'director') {
          const dp = directedPoseAt(thePlan, tt, s, VEHICLE_LENGTH_KM);
          const p = dp.pose;
          asc.camera.position.set(p.px, p.py, p.pz);
          asc.camera.lookAt(p.tx, p.ty, p.tz);
          asc.camera.fov = p.fov;
          asc.camera.updateProjectionMatrix();
          shotLabel = thePlan.shots[dp.index].id;
        } else {
          shotLabel = `today: ${asc.activeShot}`;
        }
        rig?.update(s, asc.camera);
        ar.render();
      };

      const g3 = window as unknown as Record<string, unknown>;
      g3.__g3 = {
        plan: thePlan,
        duration,
        endT,
        setT: (tt: number) => {
          playing = false;
          t = tt;
          asc?.snapCamera();
          renderAt(tt);
        },
        setMode: (m: 'director' | 'today') => {
          mode = m;
        },
        ready: true,
      };
      cleanups.push(() => delete g3.__g3);

      status = '';
      let last = performance.now();
      const frame = (now: number): void => {
        if (disposed) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (playing) {
          t = Math.min(endT, t + dt * speed);
          if (t >= endT) playing = false;
        }
        renderAt(t);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      const onResize = (): void => ar?.resize();
      window.addEventListener('resize', onResize);
      cleanups.push(() => window.removeEventListener('resize', onResize));
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((f) => f());
      rig?.dispose();
      ar?.dispose();
      asc?.dispose();
    };
  });

  const fmt = (x: number): string => `${x < 0 ? '-' : '+'}${Math.abs(Math.round(x))}s`;
</script>

<svelte:head><title>launch director (dev)</title></svelte:head>

<div class="stage" bind:this={container}></div>

{#if showUi}
  <div class="bar">
    <div class="row">
      <strong>{launcher}{flown ? ` · ${flown}` : ''}</strong>
      <span>mission {missionId ?? '—'}</span>
      <span>T{fmt(t)}</span>
      <span class="shot">{shotLabel}</span>
      {#if plan}
        <span>opening {plan.opening}</span>
        <span
          >{plan.conditions.light} · {plan.conditions.cover} · sun {Math.round(
            plan.conditions.sunElevDeg,
          )}°</span
        >
        <span>seed {plan.seed}</span>
      {/if}
      <span>{status}</span>
    </div>
    <div class="row">
      <button type="button" onclick={() => (playing = !playing)}
        >{playing ? 'pause' : 'play'}</button
      >
      <button type="button" onclick={() => (mode = mode === 'director' ? 'today' : 'director')}>
        camera: {mode}
      </button>
      {#each [1, 5, 20] as sp (sp)}
        <button type="button" class:on={speed === sp} onclick={() => (speed = sp)}>x{sp}</button>
      {/each}
      <input
        type="range"
        min={-T_MINUS_S}
        max={endT || 600}
        step="0.5"
        bind:value={t}
        aria-label="flight time"
      />
      <label>seed <input type="number" bind:value={seedInput} aria-label="seed" /></label>
      <a href={link({ seed: String(Math.floor(Math.random() * 100000)) })}>reroll</a>
      <a href={link({ seed: seedInput })}>apply seed</a>
    </div>
    {#if plan}
      <div class="strip" aria-hidden="true">
        {#each plan.shots as sh (sh.tStart)}
          <div
            class="seg {sh.kind}"
            class:cur={shotLabel === sh.id}
            style:flex={sh.tEnd - sh.tStart}
            title="{sh.id} {Math.round(sh.tStart)}-{Math.round(sh.tEnd)}"
          >
            {sh.id}
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .stage {
    position: fixed;
    inset: 0;
    z-index: 9000;
    background: #000;
  }
  .bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9001;
    padding: 6px 10px;
    background: rgb(5 7 15 / 82%);
    color: #dde6f5;
    font:
      12px/1.4 system-ui,
      sans-serif;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 4px;
  }
  .shot {
    color: #889fe7;
  }
  button,
  input[type='number'] {
    background: #14182b;
    color: inherit;
    border: 1px solid #2a3150;
    border-radius: 3px;
    padding: 1px 8px;
  }
  button.on {
    border-color: #889fe7;
  }
  input[type='number'] {
    width: 80px;
  }
  input[type='range'] {
    flex: 1;
    min-width: 160px;
  }
  a {
    color: #889fe7;
  }
  .strip {
    display: flex;
    gap: 1px;
    height: 16px;
  }
  .seg {
    overflow: hidden;
    white-space: nowrap;
    font-size: 9px;
    padding: 0 2px;
    background: #1a2040;
    color: #9aa6d0;
  }
  .seg.beat {
    background: #3a2a52;
  }
  .seg.kept,
  .seg.opening {
    background: #24304a;
  }
  .seg.cur {
    outline: 1px solid #889fe7;
  }
</style>
