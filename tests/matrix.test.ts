import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { MatrixData } from '../src/types';

const matrix = JSON.parse(
  readFileSync(new URL('../public/matrix495.json', import.meta.url), 'utf8')
) as MatrixData;

describe('official Annex C matrix', () => {
  it('contains every official option exactly once', () => {
    expect(matrix.source.winnerColumns).toEqual(['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L']);
    expect(matrix.scenarios).toHaveLength(495);
    expect(matrix.scenarios.map((scenario) => scenario.option)).toEqual(
      Array.from({ length: 495 }, (_, index) => index + 1)
    );
    expect(new Set(matrix.scenarios.map((scenario) => scenario.groupCombination)).size).toBe(495);
  });

  it('maps eight unique thirds without a same-group rematch', () => {
    for (const scenario of matrix.scenarios) {
      expect(scenario.official).toBe(true);
      expect(scenario.matchups.map((match) => match.matchNumber)).toEqual(
        Array.from({ length: 16 }, (_, index) => index + 73)
      );
      const thirdMatches = scenario.matchups.filter((match) => match.team2.type === 'third');
      expect(thirdMatches).toHaveLength(8);
      const thirdGroups = thirdMatches.map((match) => match.team2.group);
      expect(new Set(thirdGroups).size).toBe(8);
      expect([...thirdGroups].sort().join('')).toBe(scenario.groupCombination);
      for (const match of thirdMatches) {
        expect(match.team1.group).not.toBe(match.team2.group);
      }
    }
  });

  it('preserves published boundary rows from the official table', () => {
    const assignments = (option: number) => Object.fromEntries(
      matrix.scenarios
        .find((scenario) => scenario.option === option)!
        .matchups
        .filter((match) => match.team2.type === 'third')
        .map((match) => [match.team1.group, match.team2.group])
    );
    expect(assignments(1)).toEqual({ E: 'F', I: 'G', A: 'E', L: 'K', D: 'I', G: 'H', B: 'J', K: 'L' });
    expect(assignments(495)).toEqual({ E: 'C', I: 'F', A: 'H', L: 'E', D: 'B', G: 'A', B: 'G', K: 'D' });
  });
});
