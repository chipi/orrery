import * as m from '$lib/paraglide/messages';
import type { PlanDestinationId } from '$lib/physics/transfer/lambert-grid.constants';

/** A transfer destination's name in the viewer's language (/plan, /fly). */
export function destinationLabel(id: PlanDestinationId): string {
  switch (id) {
    case 'moon':
      return m.plan_destination_moon();
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
    case 'vesta':
      return m.plan_destination_vesta();
    case 'psyche':
      return m.plan_destination_psyche();
    case 'bennu':
      return m.plan_destination_bennu();
    case 'arrokoth':
      return m.plan_destination_arrokoth();
    case 'halley':
      return m.plan_destination_halley();
    case '67p':
      return m.plan_destination_67p();
    // #341 Batch 5 small bodies.
    case 'itokawa':
      return m.plan_destination_itokawa();
    case 'didymos':
      return m.plan_destination_didymos();
    case 'dimorphos':
      return m.plan_destination_dimorphos();
    case 'donaldjohanson':
      return m.plan_destination_donaldjohanson();
    case 'eurybates':
      return m.plan_destination_eurybates();
    case 'polymele':
      return m.plan_destination_polymele();
    case 'leucus':
      return m.plan_destination_leucus();
    case 'orus':
      return m.plan_destination_orus();
    case 'patroclus':
      return m.plan_destination_patroclus();
    case 'menoetius':
      return m.plan_destination_menoetius();
    // ADR-086 planetary moons.
    case 'phobos':
      return m.plan_destination_phobos();
    case 'deimos':
      return m.plan_destination_deimos();
    case 'io':
      return m.plan_destination_io();
    case 'europa':
      return m.plan_destination_europa();
    case 'ganymede':
      return m.plan_destination_ganymede();
    case 'callisto':
      return m.plan_destination_callisto();
    case 'titan':
      return m.plan_destination_titan();
    case 'enceladus':
      return m.plan_destination_enceladus();
    case 'triton':
      return m.plan_destination_triton();
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
