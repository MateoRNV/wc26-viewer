// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/appStore';

describe('portable and persisted state', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().resetAll();
  });

  it('exports, resets and restores an explicit completed result', () => {
    useAppStore.getState().updateMatchResult('J-M5', 2, 1);
    const exported = useAppStore.getState().exportState();
    expect(useAppStore.getState().groups.J.matches[4].status).toBe('completed');
    expect(localStorage.getItem('wc2026-simulator-v2')).toContain('J-M5');

    useAppStore.getState().resetAll();
    expect(useAppStore.getState().groups.J.matches[4].homeGoals).toBeNull();
    useAppStore.getState().importState(exported);
    expect(useAppStore.getState().groups.J.matches[4].homeGoals).toBe(2);
    expect(useAppStore.getState().groups.J.matches[4].awayGoals).toBe(1);
  });

  it('manually reorders third-place rankings in drag and drop mode', () => {
    useAppStore.getState().toggleMode(true);
    const initialRankings = useAppStore.getState().thirdPlaceRankings;
    const initialCodes = initialRankings.map((r) => r.team.code);

    // Swap first two teams
    const newOrder = [initialCodes[1], initialCodes[0], ...initialCodes.slice(2)];
    useAppStore.getState().reorderThirdPlaces(newOrder);

    const updatedRankings = useAppStore.getState().thirdPlaceRankings;
    const updatedCodes = updatedRankings.map((r) => r.team.code);
    expect(updatedCodes).toEqual(newOrder);
    expect(updatedRankings[0].rank).toBe(1);
    expect(updatedRankings[1].rank).toBe(2);
    expect(updatedRankings[0].qualifies).toBe(true);

    useAppStore.getState().toggleMode(false);
    const resetRankings = useAppStore.getState().thirdPlaceRankings;
    const resetCodes = resetRankings.map((r) => r.team.code);
    expect(resetCodes).toEqual(initialCodes);
  });

  it('manually collapses groups and toggles all groups collapse', () => {
    expect(useAppStore.getState().collapsedGroups.A).toBe(false);
    expect(useAppStore.getState().collapsedGroups.B).toBe(false);

    useAppStore.getState().toggleGroupCollapse('A');
    expect(useAppStore.getState().collapsedGroups.A).toBe(true);
    expect(useAppStore.getState().collapsedGroups.B).toBe(false);

    useAppStore.getState().collapseAllGroups(true);
    expect(useAppStore.getState().collapsedGroups.A).toBe(true);
    expect(useAppStore.getState().collapsedGroups.B).toBe(true);

    useAppStore.getState().collapseAllGroups(false);
    expect(useAppStore.getState().collapsedGroups.A).toBe(false);
    expect(useAppStore.getState().collapsedGroups.B).toBe(false);
  });
});
