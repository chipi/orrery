/**
 * Shared union type for the StationModulePanel component (PRD-010 / PRD-011).
 * Both ISS and Tiangong records share the same on-disk shape, so the panel
 * accepts either via this union.
 */
import type { IssModule } from './iss-module';
import type { TiangongModule } from './tiangong-module';

export type StationModule = IssModule | TiangongModule;
