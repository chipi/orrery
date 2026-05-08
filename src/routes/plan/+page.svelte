<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { dvToRGB, dvToCss, dayToLongDate, dayToShortDate } from '$lib/porkchop';
  import { getRockets, getPorkchopGrid } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import type { Rocket } from '$types/rocket';
  import type { PorkchopGrid, MissionType } from '$types/porkchop-grid';
  import type { DestinationId } from '$lib/lambert-grid.constants';
  import * as m from '$lib/paraglide/messages';
  import ScienceChip from '$lib/components/ScienceChip.svelte';
  import ScienceLensBanner from '$lib/components/ScienceLensBanner.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';

  const DESTINATION_IDS: DestinationId[] = [
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
    'ceres',
  ];
  /** FLYBY-only: gas / ice giants + Pluto (no LANDING at this fidelity). ADR-026 + ADR-028. */
  const FLYBY_ONLY: DestinationId[] = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const GRAVITY_ASSIST_CAVEAT_DESTINATIONS: DestinationId[] = [
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ];
  let invalidDestWarned = false;

  function destinationLabel(id: DestinationId): string {
    switch (id) {
      case 'mercury':
        return m.plan_destination_mercury();
      case 'venus':
        return m.plan_destination_venus();
      case 'mars':
        return m.plan_destination_mars();
      case 'jupiter':
        return m.plan_destination_jupiter();
      case 'saturn':
        return m.plan_destination_saturn();
      case 'uranus':
        return m.plan_destination_uranus();
      case 'neptune':
        return m.plan_destination_neptune();
      case 'pluto':
        return m.plan_destination_pluto();
      case 'ceres':
        return m.plan_destination_ceres();
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  }

  // ─── Grid state — driven by loaded JSON (v0.1.6 / ADR-026) ───────
  // The pre-computed grid file declares its own dep_range / tof_range
  // / steps / mission_types / dv_orbit_insertion / tof_axis_unit. The
  // /plan UI is now a pure consumer of those values per destination.
  let activeGrid = $state<PorkchopGrid | null>(null);
  let destinationId = $state<DestinationId>('mars');
  let missionType = $state<MissionType>('LANDING');
  let loadId = 0;
  let computing = $state(true);
  let progress = $state(0);
  let loadFailed = $state(false);

  let canvas: HTMLCanvasElement | undefined = $state();
  let selected = $state<{ i: number; j: number } | null>(null);
  let hoverCell = $state<{ i: number; j: number } | null>(null);

  // Reactive grid view: rows + cols + cell counts come from the loaded
  // file. Fall back to safe defaults when the grid is still loading
  // so derived expressions don't crash.
  let GRID_W = $derived(activeGrid?.steps[0] ?? 112);
  let GRID_H = $derived(activeGrid?.steps[1] ?? 100);
  let DEP_RANGE = $derived(activeGrid?.dep_range_days ?? [0, 1460]);
  let TOF_RANGE = $derived(activeGrid?.tof_range_days ?? [80, 520]);
  let TOF_AXIS_UNIT = $derived(activeGrid?.tof_axis_unit ?? 'days');
  let MISSION_TYPES = $derived(
    activeGrid?.mission_types ?? (['LANDING', 'FLYBY'] as MissionType[]),
  );
  let DV_ORBIT_INSERTION = $derived(activeGrid?.dv_orbit_insertion ?? {});
  let grid: number[][] | null = $derived(activeGrid?.grid ?? null);
  let depDays: number[] = $derived.by(() => {
    if (!activeGrid) return [];
    const [w] = activeGrid.steps;
    const [a, b] = activeGrid.dep_range_days;
    return Array.from({ length: w }, (_, i) => a + (i / (w - 1)) * (b - a));
  });
  let arrDays: number[] = $derived.by(() => {
    if (!activeGrid) return [];
    const [, h] = activeGrid.steps;
    const [a, b] = activeGrid.tof_range_days;
    return Array.from({ length: h }, (_, j) => a + (j / (h - 1)) * (b - a));
  });

  let isLandingAvailable = $derived(MISSION_TYPES.includes('LANDING'));

  // RFC-006 Option C magnifier (mobile)
  let mag = $state<{ x: number; y: number; i: number; j: number } | null>(null);
  const MAG_RADIUS = 70; // px
  const MAG_GRID = 5; // 5×5 cell region

  let rocketList: Rocket[] = $state([]);
  let selectedRocketId = $state<string | null>(null);
  // Sticky-after-manual-pick. Once the user picks a rocket from the
  // dropdown the auto-suggester stops overriding it. Reset when the
  // destination or mission type changes (a different mission has
  // different ∆v requirements; the prior pick may not even be viable).
  let userPickedRocket = $state(false);

  // Educational primer collapse. Open by default so the porkchop is
  // interpretable on first load; auto-collapses the moment the user
  // selects a cell (readout becomes truthy) so the rocket / mission
  // detail rows fit the panel without vertical scroll. The user can
  // re-open it manually via the disclosure triangle — that stays
  // open until the next selection.
  let explainerOpen = $state(true);
  $effect(() => {
    if (readout) explainerOpen = false;
  });

  /**
   * Pick the most-fitting rocket for a given ∆v requirement: the
   * cheapest viable one (smallest capability that still covers the
   * mission), falling back to the most-capable rocket if nothing in
   * the catalogue is viable. Returns null if the list is empty.
   *
   * "Cheapest viable" varies naturally with the porkchop cell — a
   * 5 km/s low-energy transfer picks Falcon Heavy; an 11 km/s direct
   * picks Starship. So the suggested rocket isn't a constant default,
   * it tracks the mission the user is configuring.
   */
  function suggestRocket(list: Rocket[], dvNeeded: number): string | null {
    if (list.length === 0) return null;
    const viable = list.filter((r) => r.delta_v_capability_km_s >= dvNeeded);
    if (viable.length > 0) {
      const cheapest = viable.reduce((a, b) =>
        a.delta_v_capability_km_s < b.delta_v_capability_km_s ? a : b,
      );
      return cheapest.id;
    }
    const mostCapable = list.reduce((a, b) =>
      a.delta_v_capability_km_s > b.delta_v_capability_km_s ? a : b,
    );
    return mostCapable.id;
  }

  // Auto-suggest a rocket whenever the ∆v requirement changes — but
  // only if the user hasn't manually picked one. Manual pick is sticky
  // until destination / mission type changes.
  $effect(() => {
    if (userPickedRocket) return;
    if (rocketList.length === 0 || !readout) return;
    const id = suggestRocket(rocketList, readout.dv);
    if (id && id !== selectedRocketId) selectedRocketId = id;
  });

  // ─── Plot geometry ───────────────────────────────────────────────
  const ML = 64;
  const MR = 18;
  const MT = 24;
  const MB = 44;

  // ─── URL ↔ filter sync (mirrors /missions pattern) ───────────────
  // ?dest=jupiter&type=flyby pre-applies on first load; selector
  // changes write back via replaceState (no history pollution).
  function applyUrlFilters(url: URL) {
    const dest = (url.searchParams.get('dest') ?? '').toLowerCase();
    if (dest && !(DESTINATION_IDS as string[]).includes(dest)) {
      if (!invalidDestWarned) {
        console.warn(`[plan] Unknown ?dest=${dest} — coerced to mars (ADR-028).`);
        invalidDestWarned = true;
      }
    }
    if ((DESTINATION_IDS as string[]).includes(dest)) {
      destinationId = dest as DestinationId;
    } else {
      destinationId = 'mars';
    }
    const type = (url.searchParams.get('type') ?? '').toUpperCase();
    if (type === 'LANDING' || type === 'FLYBY') {
      missionType = type as MissionType;
    } else {
      missionType = FLYBY_ONLY.includes(destinationId) ? 'FLYBY' : 'LANDING';
    }
    coerceMissionType();
  }

  /** Coerce missionType to the first valid type for the active grid
   *  if the current selection is invalid (e.g. LANDING on Jupiter). */
  function coerceMissionType() {
    if (!MISSION_TYPES.includes(missionType)) {
      missionType = MISSION_TYPES[0];
      pushFiltersToUrl();
    }
  }

  function pushFiltersToUrl() {
    const params = new URLSearchParams();
    if (destinationId !== 'mars') params.set('dest', destinationId);
    if (missionType !== (FLYBY_ONLY.includes(destinationId) ? 'FLYBY' : 'LANDING')) {
      params.set('type', missionType.toLowerCase());
    }
    const qs = params.toString();
    const target = `${base}/plan${qs ? `?${qs}` : ''}`;
    if (target !== $page.url.pathname + $page.url.search) {
      goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  function setDestination(value: DestinationId) {
    destinationId = value;
    // Reset mission type per the destination's defaults.
    missionType = FLYBY_ONLY.includes(value) ? 'FLYBY' : 'LANDING';
    // Different destination = different ∆v regime; let the auto-suggester
    // pick a fitting rocket again instead of holding onto the prior pick.
    userPickedRocket = false;
    pushFiltersToUrl();
  }

  function setMissionType(value: MissionType) {
    if (!MISSION_TYPES.includes(value)) return; // disabled pill
    missionType = value;
    userPickedRocket = false;
    pushFiltersToUrl();
  }

  // ─── Grid loading — pre-computed JSONs per ADR-026 ───────────────
  // Each destination's grid is committed at static/data/porkchop/.
  // Race-guarded by monotonic loadId — if the user switches destination
  // while a load is in flight, the older promise resolves into a no-op.
  async function loadGrid(id: DestinationId) {
    const myId = ++loadId;
    progress = 0;
    computing = true;
    selected = null;
    pinned = null;
    loadFailed = false;
    const result = await getPorkchopGrid(id);
    if (myId !== loadId) return; // superseded by a newer load
    if (!result) {
      loadFailed = true;
      computing = false;
      return;
    }
    activeGrid = result;
    computing = false;
    progress = 1;
    coerceMissionType();
  }

  // ─── Heatmap rendering ───────────────────────────────────────────
  let heatBitmap: ImageBitmap | null = null;

  async function buildHeatmapBitmap() {
    if (!grid) return;
    const img = new ImageData(GRID_W, GRID_H);
    for (let j = 0; j < GRID_H; j++) {
      const srcRow = grid[GRID_H - 1 - j];
      for (let i = 0; i < GRID_W; i++) {
        const dv = srcRow[i];
        const [r, g, b] = dvToRGB(dv);
        const idx = (j * GRID_W + i) * 4;
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
    if (heatBitmap) heatBitmap.close();
    heatBitmap = await createImageBitmap(img);
  }

  function drawPlot() {
    if (!canvas || !grid) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, cssW, cssH);

    const PW = cssW - ML - MR;
    const PH = cssH - MT - MB;
    if (PW <= 0 || PH <= 0) return;

    if (heatBitmap) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(heatBitmap, ML, MT, PW, PH);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ML + 0.5, MT + 0.5, PW - 1, PH - 1);

    const cellW = PW / GRID_W;
    const cellH = PH / GRID_H;
    const drawCellHighlight = (
      cell: { i: number; j: number },
      stroke: string,
      lineWidth: number,
    ) => {
      const cx = ML + cell.i * cellW;
      const cy = MT + (GRID_H - 1 - cell.j) * cellH;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(cx, cy, cellW, cellH);
    };
    if (hoverCell && (!selected || hoverCell.i !== selected.i || hoverCell.j !== selected.j)) {
      drawCellHighlight(hoverCell, 'rgba(255,255,255,0.45)', 1);
    }
    // Pin marker — gold ring, drawn under the selection so the white
    // selection ring wins when the user re-selects the pinned cell.
    if (pinned && (!selected || pinned.i !== selected.i || pinned.j !== selected.j)) {
      drawCellHighlight(pinned, '#ffc850', 2);
    }
    if (selected) drawCellHighlight(selected, '#fff', 2);

    // Axes
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = "9px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const t = i / xTicks;
      const x = ML + t * PW;
      const d = DEP_RANGE[0] + t * (DEP_RANGE[1] - DEP_RANGE[0]);
      ctx.beginPath();
      ctx.moveTo(x, MT + PH);
      ctx.lineTo(x, MT + PH + 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
      ctx.fillText(dayToShortDate(d), x, MT + PH + 8);
    }
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(m.plan_axis_departure_window(), ML + PW / 2, MT + PH + 26);

    // Y-axis ticks. Outer-planet grids (Jupiter, Saturn) render TOF
    // in years (per ADR-026 §Y-axis units, auto-switch threshold = 730d).
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const t = i / yTicks;
      const y = MT + t * PH;
      const tof = TOF_RANGE[1] - t * (TOF_RANGE[1] - TOF_RANGE[0]);
      ctx.beginPath();
      ctx.moveTo(ML, y);
      ctx.lineTo(ML - 4, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
      const label =
        TOF_AXIS_UNIT === 'years' ? `${(tof / 365.25).toFixed(0)}y` : `${tof.toFixed(0)} d`;
      ctx.fillText(label, ML - 7, y);
    }
    ctx.save();
    ctx.translate(14, MT + PH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      TOF_AXIS_UNIT === 'years' ? m.plan_axis_tof_label_years() : m.plan_axis_tof_label(),
      0,
      0,
    );
    ctx.restore();

    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(m.plan_plot_title({ dest: destinationLabel(destinationId).toUpperCase() }), ML, 6);
  }

  // ─── Pointer hit-test → grid cell ────────────────────────────────
  function cellFromCanvas(clientX: number, clientY: number): { i: number; j: number } | null {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const PW = cssW - ML - MR;
    const PH = cssH - MT - MB;
    const x = clientX - rect.left - ML;
    const y = clientY - rect.top - MT;
    if (x < 0 || y < 0 || x > PW || y > PH) return null;
    const i = Math.min(GRID_W - 1, Math.max(0, Math.floor((x / PW) * GRID_W)));
    const jVisual = Math.floor((y / PH) * GRID_H);
    const j = Math.min(GRID_H - 1, Math.max(0, GRID_H - 1 - jVisual));
    return { i, j };
  }

  // ─── Desktop pointer events ──────────────────────────────────────
  function onPointerMove(e: PointerEvent) {
    if (!grid) return;
    if (e.pointerType === 'touch') return; // Touch handled separately
    hoverCell = cellFromCanvas(e.clientX, e.clientY);
    drawPlot();
  }
  function onPointerLeave() {
    hoverCell = null;
    drawPlot();
  }
  function onClick(e: MouseEvent) {
    if (!grid) return;
    const cell = cellFromCanvas(e.clientX, e.clientY);
    if (cell) {
      selected = cell;
      drawPlot();
    }
  }

  // ─── Touch events — RFC-006 Option C magnifier ────────────────────
  // Touch & hold opens a magnifier bubble showing 5×5 cells centred on
  // the touch point at large scale. Slide to navigate, lift to select
  // the centre cell.
  function updateMagFromTouch(t: Touch) {
    if (!canvas || !grid) return;
    const rect = canvas.getBoundingClientRect();
    const cell = cellFromCanvas(t.clientX, t.clientY);
    if (!cell) {
      mag = null;
      return;
    }
    mag = {
      x: t.clientX - rect.left,
      y: t.clientY - rect.top,
      i: cell.i,
      j: cell.j,
    };
  }
  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1 || !grid) return;
    e.preventDefault();
    updateMagFromTouch(e.touches[0]);
  }
  function onTouchMove(e: TouchEvent) {
    if (e.touches.length !== 1 || !grid) return;
    e.preventDefault();
    updateMagFromTouch(e.touches[0]);
  }
  function onTouchEnd(e: TouchEvent) {
    if (!grid) return;
    e.preventDefault();
    if (mag) {
      selected = { i: mag.i, j: mag.j };
      mag = null;
      drawPlot();
    }
  }

  // ─── Selected cell readout ───────────────────────────────────────
  // dv = raw cell ∆v (heliocentric Lambert) + per-mission-type
  // orbit-insertion cost (per ADR-026 §Mission-type semantics).
  // FLYBY adds 0; LANDING adds the destination's dv_orbit_insertion.LANDING.
  type Readout = { dep: string; tof: number; arr: string; dv: number };
  let readout: Readout | null = $derived.by(() => {
    if (!selected || !grid) return null;
    const cellDv = grid[selected.j][selected.i];
    const insertionDv = DV_ORBIT_INSERTION[missionType] ?? 0;
    return {
      dep: dayToLongDate(depDays[selected.i]),
      tof: arrDays[selected.j],
      arr: dayToLongDate(depDays[selected.i] + arrDays[selected.j]),
      dv: cellDv + insertionDv,
    };
  });

  // ─── Mission Sandbox (C.7 / Concept #5) ──────────────────────────
  // Pin one cell, then click another to see the deltas. Layered onto
  // the existing porkchop UX: the pin draws as a gold ring on the
  // canvas and a compare panel surfaces ΔDEP / ΔTOF / ΔΔv vs. the
  // currently selected cell.
  let pinned = $state<{ i: number; j: number } | null>(null);

  let pinnedReadout: Readout | null = $derived.by(() => {
    if (!pinned || !grid) return null;
    const cellDv = grid[pinned.j][pinned.i];
    const insertionDv = DV_ORBIT_INSERTION[missionType] ?? 0;
    return {
      dep: dayToLongDate(depDays[pinned.i]),
      tof: arrDays[pinned.j],
      arr: dayToLongDate(depDays[pinned.i] + arrDays[pinned.j]),
      dv: cellDv + insertionDv,
    };
  });

  let compareDelta: { ddep: number; dtof: number; ddv: number } | null = $derived.by(() => {
    if (!pinned || !selected || !grid) return null;
    if (pinned.i === selected.i && pinned.j === selected.j) return null;
    const insertionDv = DV_ORBIT_INSERTION[missionType] ?? 0;
    const dvSel = grid[selected.j][selected.i] + insertionDv;
    const dvPin = grid[pinned.j][pinned.i] + insertionDv;
    return {
      ddep: depDays[selected.i] - depDays[pinned.i],
      dtof: arrDays[selected.j] - arrDays[pinned.j],
      ddv: dvSel - dvPin,
    };
  });

  function pinSelectedCell() {
    if (selected) {
      pinned = { i: selected.i, j: selected.j };
      drawPlot();
    }
  }
  function clearPin() {
    pinned = null;
    drawPlot();
  }
  /** Format a signed number with explicit + on positives. Used by the
   * sandbox compare panel so users see direction at a glance. */
  function signed(n: number, fractionDigits = 0): string {
    const rounded = Math.abs(n) < Math.pow(10, -fractionDigits) / 2 ? 0 : n;
    const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
    return `${sign}${Math.abs(rounded).toFixed(fractionDigits)}`;
  }

  // ─── Vehicle selection + Δv budget ───────────────────────────────
  let selectedRocket = $derived(rocketList.find((r) => r.id === selectedRocketId) ?? null);
  let dvBudget = $derived(selectedRocket?.delta_v_capability_km_s ?? 0);
  let dvDeficit = $derived(readout && dvBudget ? readout.dv - dvBudget : 0);
  let viable = $derived(readout !== null && dvBudget > 0 && dvDeficit <= 0);

  function flyMission() {
    if (!viable || !readout || !selected) return;
    // Pass destination + mission type + the selected cell's dep_day
    // and tof so /fly can build the right outbound arc per ADR-026
    // §FLY-button experience. Mars stays the default destination if
    // omitted; dep/tof are required for non-Mars destinations.
    const params = new URLSearchParams();
    if (destinationId !== 'mars') params.set('dest', destinationId);
    params.set('type', missionType.toLowerCase());
    params.set('dep', String(Math.round(depDays[selected.i])));
    params.set('tof', String(Math.round(arrDays[selected.j])));
    goto(`${base}/fly?${params.toString()}`);
  }

  // ─── Magnifier render (separate canvas overlay) ──────────────────
  let magCanvas: HTMLCanvasElement | undefined = $state();

  function drawMag() {
    if (!magCanvas || !mag || !grid) return;
    const ctx = magCanvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const sz = MAG_RADIUS * 2;
    magCanvas.width = Math.floor(sz * dpr);
    magCanvas.height = Math.floor(sz * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, sz, sz);

    // Circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(MAG_RADIUS, MAG_RADIUS, MAG_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, sz, sz);

    const halfWindow = Math.floor(MAG_GRID / 2);
    const cellSize = sz / MAG_GRID;
    for (let dy = -halfWindow; dy <= halfWindow; dy++) {
      for (let dx = -halfWindow; dx <= halfWindow; dx++) {
        const i = mag.i + dx;
        const j = mag.j - dy; // Flip so dy positive = visually up
        if (i < 0 || i >= GRID_W || j < 0 || j >= GRID_H) continue;
        const dv = grid[j][i];
        ctx.fillStyle = dvToCss(dv);
        ctx.fillRect(
          (dx + halfWindow) * cellSize,
          (dy + halfWindow) * cellSize,
          cellSize + 1,
          cellSize + 1,
        );
      }
    }

    // Centre crosshair (the cell that will be selected on lift)
    const cx = MAG_RADIUS;
    const cy = MAG_RADIUS;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - cellSize / 2, cy - cellSize / 2, cellSize, cellSize);

    ctx.restore();

    // Outer ring
    ctx.strokeStyle = 'rgba(68,102,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(MAG_RADIUS, MAG_RADIUS, MAG_RADIUS - 1, 0, Math.PI * 2);
    ctx.stroke();

    // Δv label inside the magnifier
    const dv = grid[mag.j][mag.i];
    ctx.font = "bold 11px 'Space Mono', monospace";
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${dv.toFixed(1)} km/s`, MAG_RADIUS, sz - 10);
  }

  $effect(() => {
    if (mag) drawMag();
  });

  // Rebuild the heatmap bitmap whenever the active grid swaps.
  // Reading `activeGrid` here makes the effect react to destination changes.
  $effect(() => {
    if (activeGrid) {
      void buildHeatmapBitmap().then(() => drawPlot());
    }
  });

  // Re-load the grid whenever destinationId changes (post-mount + on
  // URL changes via applyUrlFilters). $effect handles the initial load
  // too — destinationId is initialised from the URL at script setup.
  $effect(() => {
    void loadGrid(destinationId);
  });

  // Re-sync from URL on back/forward navigation per the /missions pattern.
  $effect(() => {
    applyUrlFilters($page.url);
  });

  onMount(() => {
    applyUrlFilters($page.url);

    getRockets(localeFromPage($page)).then((list) => {
      rocketList = list;
      // Initial pick: no porkchop cell selected yet, so use a typical
      // Mars-class ∆v as the seed (~10 km/s). The $effect that watches
      // readout will refine this the moment the user clicks any cell.
      selectedRocketId = suggestRocket(list, 10) ?? list[0]?.id ?? null;
    });

    const onResize = () => drawPlot();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  });

  onDestroy(() => {
    if (heatBitmap) heatBitmap.close();
  });
</script>

<svelte:head><title>{m.plan_page_title()}</title></svelte:head>

<div class="plan">
  <div class="plot-area">
    <!-- Destination + mission-type selectors (v0.1.6 / ADR-026 §URL contract).
         Sits between the nav bar and the porkchop canvas. Mobile collapses
         the row below 768px (see CSS) so the canvas stays the focal point. -->
    <div class="selector-bar">
      <label class="dest-label">
        <span class="selector-key">{m.plan_label_destination()}</span>
        <select
          bind:value={destinationId}
          onchange={() => setDestination(destinationId)}
          class="dest-select"
        >
          {#each DESTINATION_IDS as destOpt (destOpt)}
            <option value={destOpt}>{destinationLabel(destOpt)}</option>
          {/each}
        </select>
      </label>
      <div class="mission-type-group" role="radiogroup" aria-label={m.plan_label_mission_type()}>
        <button
          type="button"
          class="mission-type-pill"
          class:active={missionType === 'LANDING' && isLandingAvailable}
          role="radio"
          aria-checked={missionType === 'LANDING'}
          aria-disabled={!isLandingAvailable}
          disabled={!isLandingAvailable}
          title={!isLandingAvailable ? m.plan_mission_type_disabled_flyby_only() : ''}
          onclick={() => setMissionType('LANDING')}
        >
          {m.plan_mission_type_landing()}
        </button>
        <button
          type="button"
          class="mission-type-pill"
          class:active={missionType === 'FLYBY'}
          role="radio"
          aria-checked={missionType === 'FLYBY'}
          onclick={() => setMissionType('FLYBY')}
        >
          {m.plan_mission_type_flyby()}
        </button>
      </div>
    </div>
    <canvas
      class="porkchop"
      bind:this={canvas}
      onpointermove={onPointerMove}
      onpointerleave={onPointerLeave}
      onclick={onClick}
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
      ontouchcancel={onTouchEnd}
      aria-label={m.plan_canvas_label({ dest: destinationLabel(destinationId) })}
    ></canvas>

    {#if mag}
      <canvas
        class="magnifier"
        bind:this={magCanvas}
        style:left="{mag.x - MAG_RADIUS}px"
        style:top="{mag.y - MAG_RADIUS - 90}px"
        style:width="{MAG_RADIUS * 2}px"
        style:height="{MAG_RADIUS * 2}px"
        aria-hidden="true"
      ></canvas>
    {/if}

    {#if computing}
      <div class="loading" role="status" aria-live="polite">
        <div class="loading-title">{m.plan_loading_title()}</div>
        <div class="loading-bar">
          <div class="loading-fill" style:width="{progress * 100}%"></div>
        </div>
        <div class="loading-pct">{Math.round(progress * 100)}%</div>
      </div>
    {:else if loadFailed}
      <div class="load-banner" role="alert">{m.plan_load_failed()}</div>
    {/if}
  </div>

  <aside class="right-panel" aria-label={m.plan_panel_label()}>
    <!-- Educational primer. Collapsible <details> so the porkchop is
         interpretable on first paint (open by default) but auto-folds
         on cell-selection to free vertical space for rocket + mission
         details. User can manually expand at any time. -->
    <details class="explainer" bind:open={explainerOpen}>
      <summary>
        <span class="explainer-title">{m.plan_explainer_title()}</span>
      </summary>
      <p class="explainer-intro">
        {m.plan_explainer_intro()}<ScienceChip
          tab="porkchop"
          section="what-is-a-porkchop"
          label={m.chip_label_what_is_a_porkchop()}
        />
      </p>
      <dl class="explainer-list">
        <dt>
          {m.plan_explainer_x_axis()}<ScienceChip
            tab="porkchop"
            section="departure-axis"
            label={m.chip_label_departure_axis()}
          />
        </dt>
        <dd>{m.plan_explainer_x_desc()}</dd>
        <dt>
          {m.plan_explainer_y_axis()}<ScienceChip
            tab="porkchop"
            section="tof-axis"
            label={m.chip_label_tof_axis()}
          />
        </dt>
        <dd>
          {TOF_AXIS_UNIT === 'years' ? m.plan_explainer_y_desc_years() : m.plan_explainer_y_desc()}
        </dd>
        <dt>
          {m.plan_explainer_color()}<ScienceChip
            tab="porkchop"
            section="dv-heatmap"
            label={m.chip_label_dv_heatmap()}
          />
        </dt>
        <dd>
          {m.plan_explainer_color_desc()}
          <div class="color-bar" aria-hidden="true">
            <span class="cb-stop teal"></span>
            <span class="cb-stop blue"></span>
            <span class="cb-stop yellow"></span>
            <span class="cb-stop orange"></span>
            <span class="cb-stop red"></span>
          </div>
          <div class="color-bar-labels" aria-hidden="true">
            <span>3</span><span>5</span><span>7</span><span>9</span><span>11+ km/s</span>
          </div>
        </dd>
        <dt>{m.plan_explainer_how_to()}</dt>
        <dd>{m.plan_explainer_how_to_desc()}</dd>
      </dl>
    </details>
    <hr class="panel-divider" aria-hidden="true" />

    {#if !readout}
      <div class="empty">
        <div class="empty-title">{m.plan_empty_title()}</div>
        <p class="empty-hint">{m.plan_empty_hint_desktop()}</p>
        <p class="empty-hint">{m.plan_empty_hint_mobile()}</p>
      </div>
    {:else}
      <!-- Readout 4-up grid (J.5): DEP / ARR / TRANSIT / ∆V REQUIRED
           in a 2×2 layout so the panel doesn't spill below the
           viewport on small screens — keeps FLY MISSION button in
           reach without scroll once a vehicle's selected. -->
      <div class="readout-grid">
        <div class="cell">
          <span class="label">{m.plan_label_departure()}</span>
          <span class="value">{readout.dep}</span>
        </div>
        <div class="cell">
          <span class="label">{m.plan_label_arrival()}</span>
          <span class="value">{readout.arr}</span>
        </div>
        <div class="cell">
          <span class="label">{m.plan_label_transit()}</span>
          <span class="value">{m.plan_transit_days({ count: readout.tof.toFixed(0) })}</span>
        </div>
        <div class="cell strong">
          <span class="label">{m.plan_label_dv_required()}</span>
          <span class="value">
            {readout.dv.toFixed(2)} km/s<WhyPopover
              title={m.why_dv_required_title()}
              body={m.why_dv_required_body()}
              tab="propulsion"
              section="dv-budget"
            />
          </span>
        </div>
      </div>

      <!-- Mission Sandbox (C.7): pin a cell, then click another to see
           the deltas. The pin draws as a gold ring on the canvas. -->
      <div class="sandbox" data-testid="plan-sandbox">
        {#if pinned && pinnedReadout}
          <div class="sandbox-pinned">
            <span class="sandbox-eyebrow">{m.plan_sandbox_pinned()}</span>
            <span class="sandbox-pin-summary">
              {pinnedReadout.dep} · {m.plan_transit_days({
                count: pinnedReadout.tof.toFixed(0),
              })} · {pinnedReadout.dv.toFixed(2)} km/s
            </span>
            <button type="button" class="sandbox-clear" onclick={clearPin}>
              {m.plan_sandbox_clear()}
            </button>
          </div>
          {#if compareDelta}
            <dl class="sandbox-compare" data-testid="plan-sandbox-compare">
              <div class="sandbox-row">
                <dt>{m.plan_sandbox_d_dep()}</dt>
                <dd>{m.plan_sandbox_days({ value: signed(compareDelta.ddep) })}</dd>
              </div>
              <div class="sandbox-row">
                <dt>{m.plan_sandbox_d_tof()}</dt>
                <dd>{m.plan_sandbox_days({ value: signed(compareDelta.dtof) })}</dd>
              </div>
              <div class="sandbox-row strong" class:cheaper={compareDelta.ddv < 0}>
                <dt>{m.plan_sandbox_d_dv()}</dt>
                <dd>
                  {m.plan_sandbox_kms({ value: signed(compareDelta.ddv, 2) })}
                  <span class="sandbox-tag">
                    {compareDelta.ddv < 0
                      ? m.plan_sandbox_cheaper()
                      : compareDelta.ddv > 0
                        ? m.plan_sandbox_costlier()
                        : ''}
                  </span>
                </dd>
              </div>
            </dl>
          {/if}
        {:else}
          <button
            type="button"
            class="sandbox-pin"
            data-testid="plan-sandbox-pin"
            onclick={pinSelectedCell}
          >
            {m.plan_sandbox_pin_button()}
          </button>
          <p class="sandbox-hint">{m.plan_sandbox_pin_hint()}</p>
        {/if}
      </div>

      <div class="divider"></div>

      <label class="vehicle">
        <span class="label">{m.plan_label_vehicle()}</span>
        <select
          bind:value={selectedRocketId}
          onchange={() => {
            userPickedRocket = true;
          }}
        >
          {#each rocketList as r (r.id)}
            <option value={r.id}>
              {r.name ?? r.id} — {r.delta_v_capability_km_s.toFixed(1)} km/s
            </option>
          {/each}
        </select>
      </label>

      {#if selectedRocket}
        <!-- Rocket reference photo (Wikimedia Commons, fetched at build).
             {#key} forces a re-mount on rocket change so a previous
             onerror's display:none doesn't persist into the next
             rocket selection. -->
        {#key selectedRocket.id}
          <figure class="rocket-photo">
            <img
              src="{base}/images/rockets/{selectedRocket.id}.jpg"
              alt="{selectedRocket.name ?? selectedRocket.id} reference photo"
              loading="lazy"
              onerror={(e) => {
                const fig = (e.currentTarget as HTMLImageElement).closest('figure');
                if (fig) fig.style.display = 'none';
              }}
            />
          </figure>
        {/key}

        {#if selectedRocket.launch_site}
          <div class="row launch-site">
            <span class="label">LAUNCH SITE</span>
            <span class="value">{selectedRocket.launch_site}</span>
          </div>
        {/if}

        {#if selectedRocket.links && selectedRocket.links.length > 0}
          <!-- Learn-more links: agency / official source first, Wikipedia
               as fallback. Each rocket carries at least one link in the
               base rockets.json data; render up to two so the row stays
               compact in the right panel. -->
          <div class="rocket-links">
            {#each selectedRocket.links.slice(0, 2) as link (link.u)}
              <a
                class="rocket-link"
                href={link.u}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={m.plan_link_opens_new_tab({ label: link.l })}
              >
                {link.l} ↗
              </a>
            {/each}
          </div>
        {/if}

        <div class="row">
          <span class="label">{m.plan_label_vehicle_dv()}</span>
          <span class="value">{dvBudget.toFixed(2)} km/s</span>
        </div>

        <div class="budget" class:viable class:deficit={!viable}>
          <div
            class="budget-fill"
            style:width="{Math.min(100, (readout.dv / Math.max(dvBudget, readout.dv)) * 100)}%"
          ></div>
          <div class="budget-label">
            {#if viable}
              {m.plan_budget_margin({ value: (dvBudget - readout.dv).toFixed(2) })}
            {:else}
              {m.plan_budget_deficit({ value: dvDeficit.toFixed(2) })}
            {/if}
          </div>
        </div>
      {/if}

      {#if GRAVITY_ASSIST_CAVEAT_DESTINATIONS.includes(destinationId)}
        <p class="gravity-caveat">{m.plan_gravity_assist_caveat()}</p>
      {/if}
      <button class="fly" type="button" disabled={!viable} onclick={flyMission}>
        {m.plan_fly_button()}
      </button>
    {/if}
  </aside>
</div>

<ScienceLensBanner
  placement="top"
  title="Porkchop plot · the calendar of cheap launches"
  body="Each pixel solves a Lambert problem. The cheap teal lobe marks the natural Hohmann window — physics decides when interplanetary travel is affordable, not the calendar."
  tab="porkchop"
  section="what-is-a-porkchop"
/>

<style>
  .plan {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    display: grid;
    overflow: hidden;
  }
  @media (min-width: 768px) {
    .plan {
      grid-template-columns: 1fr 314px;
    }
  }
  @media (max-width: 767px) {
    .plan {
      grid-template-rows: 1fr auto;
    }
  }

  .plot-area {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .selector-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    padding: 10px 14px;
    background: rgba(8, 10, 22, 0.6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex: 0 0 auto;
  }
  .dest-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
  }
  .selector-key {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 700;
  }
  .dest-select {
    min-height: 44px;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    cursor: pointer;
  }
  .dest-select:focus-visible {
    outline: 2px solid #4466ff;
    outline-offset: 1px;
  }
  .mission-type-group {
    display: inline-flex;
    gap: 6px;
  }
  .mission-type-pill {
    min-width: 64px;
    min-height: 44px;
    padding: 0 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.7);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    font-weight: 700;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.12s;
  }
  .mission-type-pill:hover:not(:disabled),
  .mission-type-pill:focus-visible:not(:disabled) {
    border-color: rgba(68, 102, 255, 0.55);
    color: var(--color-text);
    outline: none;
  }
  .mission-type-pill.active {
    background: rgba(68, 102, 255, 0.2);
    border-color: #4466ff;
    color: #fff;
  }
  .mission-type-pill:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
  @media (max-width: 767px) {
    .selector-bar {
      gap: 8px;
      padding: 8px 12px;
    }
  }

  .porkchop {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
    touch-action: none;
    flex: 1 1 auto;
    min-height: 0;
  }
  .load-banner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 10px 18px;
    background: rgba(193, 68, 14, 0.18);
    border: 1px solid rgba(193, 68, 14, 0.55);
    color: #ffc850;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    border-radius: 4px;
  }

  .magnifier {
    position: absolute;
    pointer-events: none;
    border-radius: 50%;
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    z-index: 5;
  }

  .loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(4, 4, 12, 0.95);
    z-index: 10;
  }
  .loading-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 13px;
    letter-spacing: 4px;
    color: rgba(255, 255, 255, 0.5);
  }
  .loading-bar {
    width: 280px;
    height: 2px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    margin-top: 16px;
    overflow: hidden;
  }
  .loading-fill {
    height: 100%;
    background: #4466ff;
    border-radius: 2px;
    transition: width 0.1s;
  }
  .loading-pct {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 8px;
    letter-spacing: 2px;
  }

  .right-panel {
    background: rgba(8, 10, 22, 0.95);
    border-left: 1px solid var(--color-border);
    padding: 18px 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  }

  .panel-divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 6px 0 4px;
  }

  .explainer {
    padding: 10px 14px 12px;
    background: rgba(68, 102, 255, 0.04);
    border: 1px solid rgba(68, 102, 255, 0.25);
    border-radius: 4px;
    margin-bottom: 8px;
  }
  .explainer > summary {
    /* Custom marker (▾) styled to match the HUD aesthetic. The native
       triangle is hidden via list-style: none + ::-webkit-details-marker
       so we can render our own glyph that flips when open. */
    display: flex;
    align-items: center;
    gap: 8px;
    list-style: none;
    cursor: pointer;
    padding: 4px 0;
    user-select: none;
  }
  .explainer > summary::-webkit-details-marker {
    display: none;
  }
  .explainer > summary::before {
    content: '▸';
    font-size: 10px;
    color: rgba(68, 102, 255, 0.85);
    transition: transform 150ms ease;
    display: inline-block;
  }
  .explainer[open] > summary::before {
    transform: rotate(90deg);
  }
  .explainer-title {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: #4466ff;
    font-weight: 700;
  }
  .explainer[open] > .explainer-intro,
  .explainer[open] > .explainer-list {
    margin-top: 6px;
  }
  .explainer-intro {
    margin: 0 0 10px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.45;
  }
  .explainer-list {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .explainer-list dt {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: rgba(78, 205, 196, 0.85);
    font-weight: 700;
    margin-bottom: 1px;
  }
  .explainer-list dd {
    margin: 0;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.7);
  }

  .color-bar {
    display: flex;
    height: 8px;
    margin: 6px 0 2px;
    border-radius: 2px;
    overflow: hidden;
  }
  .color-bar .cb-stop {
    flex: 1;
    height: 100%;
  }
  .color-bar .teal {
    background: #4ecdc4;
  }
  .color-bar .blue {
    background: #4466ff;
  }
  .color-bar .yellow {
    background: #ffc850;
  }
  .color-bar .orange {
    background: #ff8c3c;
  }
  .color-bar .red {
    background: #c1440e;
  }
  .color-bar-labels {
    display: flex;
    justify-content: space-between;
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 1px;
  }
  @media (max-width: 767px) {
    .right-panel {
      border-left: none;
      border-top: 1px solid var(--color-border);
      max-height: 50vh;
    }
  }

  .empty {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .empty-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 16px;
    letter-spacing: 3px;
    color: var(--color-text);
  }
  .empty-hint {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.5;
    margin: 0;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: baseline;
  }
  .rocket-links {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 2px 0 4px;
  }
  .rocket-link {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    color: var(--color-tier-intro);
    text-decoration: none;
    border-bottom: 1px dotted rgba(78, 205, 196, 0.4);
    padding: 1px 0;
    align-self: flex-start;
    transition:
      color 120ms,
      border-color 120ms;
  }
  .rocket-link:hover,
  .rocket-link:focus-visible {
    color: #fff;
    border-bottom-color: #4ecdc4;
    outline: none;
  }
  /* .row.strong .value rule removed — selector flagged as unused after
     a recent template refactor in parallel work. */

  /* J.5 — 2×2 readout grid. Each cell stacks label-on-top-of-value
     so a single row holds two metrics. Halves the vertical real
     estate the readout consumed before. */
  .readout-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 14px;
    margin: 0 0 4px;
  }
  .readout-grid .cell {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .readout-grid .cell .label {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.4);
  }
  .readout-grid .cell .value {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.92);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .readout-grid .cell.strong .value {
    color: #4ecdc4;
    font-weight: 700;
    font-size: 12px;
  }
  .label {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.35);
  }
  .value {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
  }

  .divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 6px 0;
  }

  /* Mission Sandbox (C.7) — pin a cell and compare. Compressed in
     J.5 so the FLY MISSION button stays in viewport after vehicle
     selection. */
  .sandbox {
    margin: 6px 0 4px;
    padding: 5px 8px 6px;
    background: rgba(255, 200, 80, 0.04);
    border: 1px solid rgba(255, 200, 80, 0.18);
    border-radius: 4px;
  }
  .sandbox-pin {
    display: block;
    width: 100%;
    min-height: 26px;
    padding: 4px 10px;
    background: transparent;
    border: 1px dashed rgba(255, 200, 80, 0.5);
    border-radius: 4px;
    color: rgba(255, 200, 80, 0.85);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition:
      border-color 120ms,
      background 120ms,
      color 120ms;
  }
  .sandbox-pin:hover,
  .sandbox-pin:focus-visible {
    background: rgba(255, 200, 80, 0.08);
    border-color: rgba(255, 200, 80, 0.85);
    color: #ffc850;
    outline: none;
  }
  .sandbox-hint {
    margin: 3px 0 0;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 10px;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.55);
  }
  .sandbox-pinned {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .sandbox-eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: #ffc850;
  }
  .sandbox-pin-summary {
    flex: 1;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.78);
  }
  .sandbox-clear {
    background: transparent;
    border: none;
    color: rgba(255, 200, 80, 0.7);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    cursor: pointer;
    padding: 2px 4px;
  }
  .sandbox-clear:hover,
  .sandbox-clear:focus-visible {
    color: #ffc850;
    outline: none;
  }
  .sandbox-compare {
    margin: 0;
    padding: 5px 0 0;
    border-top: 1px solid rgba(255, 200, 80, 0.18);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sandbox-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .sandbox-row dt {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }
  .sandbox-row dd {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
  }
  .sandbox-row.strong dd {
    color: #ffc850;
    font-weight: 700;
  }
  .sandbox-row.strong.cheaper dd {
    color: #4ecdc4;
  }
  .sandbox-tag {
    font-size: 8px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
    margin-left: 4px;
  }

  .vehicle {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .vehicle select {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: var(--color-text);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    cursor: pointer;
  }
  .vehicle select:focus-visible {
    outline: 1px solid #4466ff;
    outline-offset: 2px;
  }

  .rocket-photo {
    margin: 0;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.4);
    aspect-ratio: 16 / 9;
    flex-shrink: 0;
  }
  .rocket-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .budget {
    position: relative;
    height: 24px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 4px;
  }
  .budget-fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: linear-gradient(to right, #4ecdc4, #4ecdc488);
    transition: width 200ms;
  }
  .budget.deficit .budget-fill {
    background: linear-gradient(to right, #c1440e, #c1440e88);
  }
  .budget-label {
    position: relative;
    z-index: 1;
    text-align: center;
    line-height: 24px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }

  .gravity-caveat {
    margin: 10px 0 0;
    padding: 8px 10px;
    border-radius: 4px;
    background: rgba(255, 200, 80, 0.12);
    border: 1px solid rgba(255, 200, 80, 0.35);
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 13px;
    font-style: italic;
    line-height: 1.35;
    color: rgba(255, 235, 200, 0.92);
  }

  .fly {
    margin-top: 8px;
    width: 100%;
    min-height: 48px;
    padding: 12px;
    background: #1a33bb;
    border: 1px solid rgba(68, 102, 255, 0.55);
    border-radius: 4px;
    color: #fff;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 3px;
    font-weight: 700;
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms;
  }
  .fly:hover:not(:disabled),
  .fly:focus-visible:not(:disabled) {
    background: #2244dd;
    border-color: #4466ff;
    outline: none;
  }
  .fly:disabled {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.25);
    cursor: not-allowed;
  }
</style>
