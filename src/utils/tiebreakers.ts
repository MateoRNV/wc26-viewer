import type { ConductCards, Match, Team } from '../types';

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
  conductScore: number;
}

export function conductPoints(cards: ConductCards): number {
  return -(
    cards.yellow +
    cards.indirectRed * 3 +
    cards.directRed * 4 +
    cards.yellowDirectRed * 5
  );
}

function compareRankingHistory(a: Team, b: Team): number {
  const aRanks = [a.fifaRank, ...(a.fifaRankHistory ?? [])];
  const bRanks = [b.fifaRank, ...(b.fifaRankHistory ?? [])];
  for (let index = 0; index < Math.max(aRanks.length, bRanks.length); index++) {
    const aRank = aRanks[index] ?? Number.MAX_SAFE_INTEGER;
    const bRank = bRanks[index] ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
  }
  return a.code.localeCompare(b.code);
}

export function compareOverall(a: TeamStats, b: TeamStats): number {
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  if (b.conductScore !== a.conductScore) return b.conductScore - a.conductScore;
  return compareRankingHistory(a.team, b.team);
}

export function compareThirds(a: TeamStats, b: TeamStats): number {
  if (b.points !== a.points) return b.points - a.points;
  return compareOverall(a, b);
}

export function completedMatches(matches: Match[]): Match[] {
  return matches.filter(
    (match) =>
      match.status === 'completed' &&
      match.homeGoals !== null &&
      match.awayGoals !== null
  );
}
