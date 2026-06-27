import { describe, expect, it } from 'vitest';
import type { ResolvedMatchup } from '../src/types';
import {
  buildKnockoutMatches,
  createInitialKnockoutResults,
} from '../src/utils/knockout';

const round32: ResolvedMatchup[] = Array.from({ length: 16 }, (_, index) => ({
  matchNumber: 73 + index,
  team1: { type: 'winner', group: 'A' },
  team2: { type: 'runner-up', group: 'B' },
  team1Code: `H${73 + index}`,
  team2Code: `A${73 + index}`,
}));

describe('knockout progression', () => {
  it('propagates official match winners through every round', () => {
    const results = createInitialKnockoutResults();
    for (let number = 73; number <= 102; number++) {
      results[number] = {
        ...results[number],
        homeGoals: 1,
        awayGoals: 0,
        status: 'completed',
      };
    }
    const matches = buildKnockoutMatches(round32, results);
    const match89 = matches.find((match) => match.matchNumber === 89)!;
    expect([match89.homeCode, match89.awayCode]).toEqual(['H74', 'H77']);
    const semifinal1 = matches.find((match) => match.matchNumber === 101)!;
    const semifinal2 = matches.find((match) => match.matchNumber === 102)!;
    const thirdPlace = matches.find((match) => match.matchNumber === 103)!;
    const final = matches.find((match) => match.matchNumber === 104)!;
    expect([thirdPlace.homeCode, thirdPlace.awayCode]).toEqual([
      semifinal1.loserCode,
      semifinal2.loserCode,
    ]);
    expect([final.homeCode, final.awayCode]).toEqual([
      semifinal1.winnerCode,
      semifinal2.winnerCode,
    ]);
  });

  it('resolves a tied knockout match only with valid penalties', () => {
    const results = createInitialKnockoutResults();
    results[73] = {
      ...results[73],
      homeGoals: 1,
      awayGoals: 1,
      penaltiesHome: 4,
      penaltiesAway: 3,
      decision: 'penalties',
      status: 'completed',
    };
    expect(buildKnockoutMatches(round32, results).find((match) => match.matchNumber === 73)?.winnerCode).toBe('H73');
  });
});
