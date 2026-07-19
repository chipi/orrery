<script lang="ts">
  // Dev harness for the orbit-coast act — mounts the real CoastScene with a
  // mock coast so the hybrid loop rule + draggable scrubber can be eyeballed in
  // isolation. `?revs=` overrides the loop count (1/2/3 distinct, 206 capped).
  import CoastScene from '$lib/components/CoastScene.svelte';
  import type { EarthOrbitCoast } from '$lib/orbital/earth-orbit-registry';

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const revs = Number(params?.get('revs') ?? 3);

  const coast: EarthOrbitCoast = {
    missionId: 'dev',
    capsuleId: 'mercury',
    apogeeKm: 265,
    perigeeKm: 159,
    inclinationDeg: 32.5,
    revolutions: revs,
    coastDurationS: revs * 5580,
  };
</script>

<CoastScene {coast} missionName="Dev Coast" agency="TEST" />
