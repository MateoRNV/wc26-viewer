import { describe, expect, it } from 'vitest';
import type { ConductCards, Match, Team } from '../src/types';
import { calculateGroupStandings, computeStats } from '../src/utils/scoringRules';

const emptyCards = (): ConductCards => ({ yellow: 0, indirectRed: 0, directRed: 0, yellowDirectRed: 0 });
const teams: Team[] = ['A', 'B', 'C', 'D'].map((code, index) => ({
  code,
  name: code,
  group: 'A',
  position: (index + 1) as Team['position'],
  fifaRank: index + 1,
}));

function match(id: string, homeCode: string, awayCode: string, homeGoals: number, awayGoals: number): Match {
  return {
    id,
    homeCode,
    awayCode,
    homeGoals,
    awayGoals,
    status: 'completed',
    conduct: { home: emptyCards(), away: emptyCards() },
  };
}

describe('Article 13 standings', () => {
  it('uses head-to-head before superior overall goal difference', () => {
    const matches = [
      match('1', 'A', 'B', 1, 0),
      match('2', 'A', 'C', 0, 5),
      match('3', 'B', 'C', 10, 0),
      match('4', 'B', 'D', 0, 1),
      match('5', 'A', 'D', 0, 1),
      match('6', 'C', 'D', 1, 0),
    ];
    const ordered = calculateGroupStandings({ letter: 'A', teams, matches });
    expect(ordered.findIndex((team) => team.code === 'A')).toBeLessThan(
      ordered.findIndex((team) => team.code === 'B')
    );
    const stats = computeStats(teams, matches);
    expect(stats.find((entry) => entry.team.code === 'B')!.gd).toBeGreaterThan(
      stats.find((entry) => entry.team.code === 'A')!.gd
    );
  });

  it('applies full team-conduct deductions after sporting criteria', () => {
    const matches = [
      match('1', 'A', 'B', 0, 0), match('2', 'C', 'D', 0, 0),
      match('3', 'A', 'C', 0, 0), match('4', 'D', 'B', 0, 0),
      match('5', 'D', 'A', 0, 0), match('6', 'B', 'C', 0, 0),
    ];
    matches[2].conduct.home = { yellow: 0, indirectRed: 0, directRed: 0, yellowDirectRed: 1 };
    const ordered = calculateGroupStandings({ letter: 'A', teams, matches });
    expect(ordered.at(-1)?.code).toBe('A');
    expect(computeStats(teams, matches).find((entry) => entry.team.code === 'A')?.conductScore).toBe(-5);
  });

  it('ignores unplayed matches instead of treating blanks as nil-nil draws', () => {
    const unplayed: Match = {
      ...match('1', 'A', 'B', 0, 0),
      status: 'unplayed',
      homeGoals: null,
      awayGoals: null,
    };
    expect(computeStats(teams, [unplayed]).every((entry) => entry.played === 0)).toBe(true);
  });
});
