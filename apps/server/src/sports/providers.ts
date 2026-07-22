import { EspnSportsProvider } from './espn.js';
import type { SportsProvider } from './types.js';

/** Register provider adapters here; competition-level priority lives in catalog.ts. */
export function createSportsProviders(): SportsProvider[] {
  return [new EspnSportsProvider()];
}
