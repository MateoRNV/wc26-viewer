import { describe, expect, it } from 'vitest';
import { createInitialGroups } from '../src/data/groups';
import {
  analyzePossibleCombinations,
  enumerateThirdProfiles,
} from '../src/utils/possibleCombinations';

describe('remaining official combinations', () => {
  it('enumerates every still-reachable qualifying group set', () => {
    const groups = createInitialGroups();
    const analysis = analyzePossibleCombinations(groups, 6);
    expect(analysis.incompleteGroups).toEqual(['J', 'K', 'L']);
    expect(analysis.possibleKeys.has(analysis.currentKey)).toBe(true);
    expect(analysis.possibleKeys.size).toBe(8);
    expect([...analysis.lockedGroups].sort().join('')).toBe('BDEFI');
    expect(enumerateThirdProfiles(groups.J)).toHaveLength(49);
    expect(enumerateThirdProfiles(groups.K)).toHaveLength(70);
    expect(enumerateThirdProfiles(groups.L)).toHaveLength(61);
  });

  it('is stable once the score range covers all relevant tie-break thresholds', () => {
    const groups = createInitialGroups();
    const capFive = analyzePossibleCombinations(groups, 5).possibleKeys;
    const capSix = analyzePossibleCombinations(groups, 6).possibleKeys;
    const capSeven = analyzePossibleCombinations(groups, 7).possibleKeys;
    expect([...capSix].sort()).toEqual([...capFive].sort());
    expect([...capSeven].sort()).toEqual([...capSix].sort());
  });
});
