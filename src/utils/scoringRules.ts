import type { Group, Match, Team, ThirdPlaceRanking } from '../types';
import {
  compareOverall,
  compareThirds,
  completedMatches,
  conductPoints,
  type TeamStats,
} from './tiebreakers';

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
    conductScore: 0,
  };
}

export function computeStats(teams: Team[], matches: Match[]): TeamStats[] {
  const byCode = new Map(teams.map((team) => [team.code, emptyStats(team)]));
  for (const match of completedMatches(matches)) {
    const home = byCode.get(match.homeCode);
    const away = byCode.get(match.awayCode);
    if (!home || !away || match.homeGoals === null || match.awayGoals === null) continue;

    home.played += 1;
    away.played += 1;
    home.gf += match.homeGoals;
    home.ga += match.awayGoals;
    away.gf += match.awayGoals;
    away.ga += match.homeGoals;
    home.conductScore += conductPoints(match.conduct.home);
    away.conductScore += conductPoints(match.conduct.away);

    if (match.homeGoals > match.awayGoals) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeGoals < match.awayGoals) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }
  for (const stats of byCode.values()) stats.gd = stats.gf - stats.ga;
  return [...byCode.values()];
}

function sameMiniTable(a: TeamStats, b: TeamStats): boolean {
  return a.points === b.points && a.gd === b.gd && a.gf === b.gf;
}

function rankPointBucket(
  teams: Team[],
  matches: Match[],
  overallByCode: Map<string, TeamStats>
): Team[] {
  if (teams.length <= 1) return teams;
  const codes = new Set(teams.map((team) => team.code));
  const miniMatches = matches.filter(
    (match) => codes.has(match.homeCode) && codes.has(match.awayCode)
  );
  const miniStats = computeStats(teams, miniMatches).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  if (miniStats.every((stats) => sameMiniTable(stats, miniStats[0]))) {
    return [...teams].sort((a, b) =>
      compareOverall(overallByCode.get(a.code)!, overallByCode.get(b.code)!)
    );
  }

  const ranked: Team[] = [];
  let start = 0;
  while (start < miniStats.length) {
    let end = start + 1;
    while (end < miniStats.length && sameMiniTable(miniStats[start], miniStats[end])) end += 1;
    const tied = miniStats.slice(start, end).map((stats) => stats.team);
    ranked.push(
      ...(tied.length === teams.length
        ? tied.sort((a, b) =>
            compareOverall(overallByCode.get(a.code)!, overallByCode.get(b.code)!)
          )
        : rankPointBucket(tied, miniMatches, overallByCode))
    );
    start = end;
  }
  return ranked;
}

/** Article 13: points, head-to-head subset, overall GD/GF, conduct, rankings. */
export function calculateGroupStandings(group: Group): Team[] {
  const stats = computeStats(group.teams, group.matches);
  const overallByCode = new Map(stats.map((entry) => [entry.team.code, entry]));
  const byPoints = [...stats].sort((a, b) => b.points - a.points);
  const ordered: Team[] = [];
  let start = 0;
  while (start < byPoints.length) {
    let end = start + 1;
    while (end < byPoints.length && byPoints[end].points === byPoints[start].points) end += 1;
    ordered.push(
      ...rankPointBucket(
        byPoints.slice(start, end).map((entry) => entry.team),
        group.matches,
        overallByCode
      )
    );
    start = end;
  }
  return ordered.map((team, index) => ({
    ...team,
    position: (index + 1) as Team['position'],
  }));
}

export function thirdPlaceStats(group: Group): TeamStats | undefined {
  const thirdTeam = group.teams[2];
  return computeStats(group.teams, group.matches).find(
    (stats) => stats.team.code === thirdTeam?.code
  );
}

export function isGroupComplete(group: Group): boolean {
  return group.matches.every((match) => match.status === 'completed');
}

export function rankThirdPlaces(
  groups: Group[],
  allowIncomplete = false
): ThirdPlaceRanking[] {
  const complete = groups.every(isGroupComplete);
  const thirds = groups
    .map(thirdPlaceStats)
    .filter((stats): stats is TeamStats => Boolean(stats))
    .sort(compareThirds);
  return thirds.map((stats, index) => ({
    rank: index + 1,
    team: { ...stats.team, position: 3 },
    points: stats.points,
    gd: stats.gd,
    gf: stats.gf,
    conductScore: stats.conductScore,
    qualifies: (complete || allowIncomplete) && index < 8,
  }));
}
