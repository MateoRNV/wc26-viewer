import CONFEDERATIONS_JSON from './confederations.json';

/**
 * Confederation membership for every team in the tournament. The data lives in
 * `confederations.json` so it stays agnostic to standings and results: the
 * statistics layer reads it the same way for any future edition, and you only
 * edit the JSON when the participating teams change.
 */
export type Confederation =
  | 'UEFA'
  | 'CONMEBOL'
  | 'CONCACAF'
  | 'CAF'
  | 'AFC'
  | 'OFC';

interface ConfederationMeta {
  label: string;
  color: string;
}

const META = CONFEDERATIONS_JSON.confederations as Record<
  Confederation,
  ConfederationMeta
>;
const TEAM_CONFEDERATION = CONFEDERATIONS_JSON.teams as Record<
  string,
  Confederation
>;

/** Confederations in canonical FIFA order; drives chart colours and ordering. */
export const CONFEDERATIONS = Object.keys(META) as Confederation[];

/** Display metadata. Colours double as the chart palette for this dimension. */
export const CONFEDERATION_META = META;

/** Confederation for a team code, or `undefined` if the code is unknown. */
export function confederationOf(code: string): Confederation | undefined {
  return TEAM_CONFEDERATION[code];
}
