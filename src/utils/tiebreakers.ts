import type { Team } from '../types';

export interface TeamStats {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  yellowCards: number;
}

/**
 * Official-style comparator (descending = better first).
 * Order: points -> goal difference -> goals for -> fair play (fewer yellows)
 * -> FIFA ranking (lower is better). Head-to-head is intentionally omitted
 * for the MVP (group-wide criteria are applied directly).
 */
export function compareStats(a: TeamStats, b: TeamStats): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  if (a.yellowCards !== b.yellowCards) return a.yellowCards - b.yellowCards;
  return a.team.fifaRank - b.team.fifaRank;
}

/**
 * Same criteria but applied across third-placed teams from different groups.
 * (FIFA ranks the 12 thirds with these exact group-stage criteria.)
 */
export function compareThirds(a: TeamStats, b: TeamStats): number {
  return compareStats(a, b);
}
