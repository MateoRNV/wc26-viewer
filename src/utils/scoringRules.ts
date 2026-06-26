import type { Group, Match, Team, ThirdPlaceRanking } from '../types';
import { compareStats, compareThirds, type TeamStats } from './tiebreakers';

function emptyStats(team: Team): TeamStats {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    yellowCards: 0,
  };
}

/** Accumulate per-team statistics from a group's matches. */
export function computeStats(teams: Team[], matches: Match[]): TeamStats[] {
  const byCode = new Map<string, TeamStats>();
  for (const t of teams) byCode.set(t.code, emptyStats(t));

  for (const m of matches) {
    const home = byCode.get(m.homeCode);
    const away = byCode.get(m.awayCode);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.gf += m.homeGoals;
    home.ga += m.awayGoals;
    away.gf += m.awayGoals;
    away.ga += m.homeGoals;
    home.yellowCards += m.yellowCards?.home ?? 0;
    away.yellowCards += m.yellowCards?.away ?? 0;

    if (m.homeGoals > m.awayGoals) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (m.homeGoals < m.awayGoals) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const s of byCode.values()) s.gd = s.gf - s.ga;
  return [...byCode.values()];
}

/**
 * Returns the group's teams ordered 1st->4th with `position` updated to match.
 */
export function calculateGroupStandings(group: Group): Team[] {
  const stats = computeStats(group.teams, group.matches);
  stats.sort(compareStats);
  return stats.map((s, i) => ({ ...s.team, position: (i + 1) as Team['position'] }));
}

/**
 * Returns the stats of the team CURRENTLY occupying 3rd place in the group
 * (i.e. `group.teams[2]`). This respects manual Sandbox ordering while still
 * sourcing the comparison metrics (points/GD/GF) from match results.
 */
export function thirdPlaceStats(group: Group): TeamStats | undefined {
  const stats = computeStats(group.teams, group.matches);
  const thirdTeam = group.teams[2];
  if (!thirdTeam) return undefined;
  return stats.find((s) => s.team.code === thirdTeam.code);
}

/**
 * Rank all 12 third-placed teams; the top 8 get `qualifies = true`.
 */
export function rankThirdPlaces(groups: Group[]): ThirdPlaceRanking[] {
  const thirds = groups
    .map(thirdPlaceStats)
    .filter((s): s is TeamStats => Boolean(s));
  thirds.sort(compareThirds);

  return thirds.map((s, i) => ({
    rank: i + 1,
    team: { ...s.team, position: 3 as Team['position'] },
    points: s.points,
    gd: s.gd,
    gf: s.gf,
    yellowCards: s.yellowCards,
    qualifies: i < 8,
  }));
}
