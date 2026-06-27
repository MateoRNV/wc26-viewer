import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  BracketMatchup,
  ConductCards,
  Group,
  GroupLetter,
  KnockoutMatchView,
  KnockoutResult,
  MatrixData,
  PortableState,
  ResolvedMatchup,
  Team,
  ThirdPlaceRanking,
} from '../types';
import { createInitialGroups, GROUP_LETTERS } from '../data/groups';
import { calculateGroupStandings, rankThirdPlaces } from '../utils/scoringRules';
import { findScenario, resolveMatchupsWithTeams } from '../utils/matrixEngine';
import {
  buildKnockoutMatches,
  createInitialKnockoutResults,
  downstreamMatches,
  emptyKnockoutResult,
} from '../utils/knockout';

interface DerivedState {
  thirdPlaceRankings: ThirdPlaceRanking[];
  bracketMatchups: BracketMatchup[] | null;
  resolvedBracket: ResolvedMatchup[] | null;
  scenarioKey: string | null;
  scenarioOption: number | null;
  bracketError: string | null;
  knockoutMatches: KnockoutMatchView[];
}

interface AppState extends DerivedState {
  groups: Record<GroupLetter, Group>;
  knockoutResults: Record<number, KnockoutResult>;
  matrix: MatrixData | null;
  matrixStatus: 'idle' | 'loading' | 'ready' | 'error';
  isDragAndDropMode: boolean;
  thirdPlaceOrder: string[] | null;
  collapsedGroups: Record<GroupLetter, boolean>;
  /** Snapshot of simulation state saved when switching to Official Results mode */
  savedSimulation: {
    groups: Record<GroupLetter, Group>;
    knockoutResults: Record<number, KnockoutResult>;
    thirdPlaceOrder: string[] | null;
  } | null;
  toggleGroupCollapse: (letter: GroupLetter) => void;
  collapseAllGroups: (collapsed: boolean) => void;
  loadMatrix: () => Promise<void>;
  updateMatchResult: (
    matchId: string,
    homeGoals: number | null,
    awayGoals: number | null
  ) => void;
  updateMatchConduct: (
    matchId: string,
    side: 'home' | 'away',
    cards: ConductCards
  ) => void;
  reorderTeamInGroup: (group: GroupLetter, newOrder: Team[]) => void;
  reorderThirdPlaces: (newOrder: string[]) => void;
  toggleMode: (isDnd: boolean) => void;
  updateKnockoutResult: (matchNumber: number, patch: Partial<KnockoutResult>) => void;
  resetAll: () => void;
  exportState: () => string;
  importState: (raw: string) => void;
}

function derive(
  groups: Record<GroupLetter, Group>,
  matrix: MatrixData | null,
  isDragAndDropMode: boolean,
  knockoutResults: Record<number, KnockoutResult>,
  thirdPlaceOrder: string[] | null
): DerivedState {
  const groupList = GROUP_LETTERS.map((letter) => groups[letter]);
  let thirdPlaceRankings = rankThirdPlaces(groupList, true);

  if (isDragAndDropMode && thirdPlaceOrder) {
    const orderMap = new Map(thirdPlaceOrder.map((code, index) => [code, index]));
    thirdPlaceRankings = [...thirdPlaceRankings].sort((a, b) => {
      const idxA = orderMap.has(a.team.code) ? orderMap.get(a.team.code)! : 999;
      const idxB = orderMap.has(b.team.code) ? orderMap.get(b.team.code)! : 999;
      return idxA - idxB;
    });
    // Re-index ranks and qualifies status based on manual drag-and-drop order
    thirdPlaceRankings = thirdPlaceRankings.map((ranking, index) => ({
      ...ranking,
      rank: index + 1,
      qualifies: index < 8,
    }));
  }

  const standingsByGroup = {} as Record<GroupLetter, Team[]>;
  for (const letter of GROUP_LETTERS) standingsByGroup[letter] = groups[letter].teams;

  const qualifiedThirds = thirdPlaceRankings
    .filter((ranking) => ranking.qualifies)
    .map((ranking) => ranking.team);
  let bracketMatchups: BracketMatchup[] | null = null;
  let resolvedBracket: ResolvedMatchup[] | null = null;
  let scenarioKey: string | null = null;
  let scenarioOption: number | null = null;
  let bracketError: string | null = null;

  if (matrix && qualifiedThirds.length === 8) {
    const scenario = findScenario(qualifiedThirds, matrix);
    if (scenario) {
      bracketMatchups = scenario.matchups;
      scenarioKey = scenario.groupCombination;
      scenarioOption = scenario.option;
      resolvedBracket = resolveMatchupsWithTeams(
        scenario.matchups,
        standingsByGroup,
        thirdPlaceRankings
      );
    } else {
      bracketError = qualifiedThirds.map((team) => team.group).sort().join('');
    }
  }

  return {
    thirdPlaceRankings,
    bracketMatchups,
    resolvedBracket,
    scenarioKey,
    scenarioOption,
    bracketError,
    knockoutMatches: buildKnockoutMatches(resolvedBracket, knockoutResults),
  };
}

function locateGroup(groups: Record<GroupLetter, Group>, matchId: string) {
  return GROUP_LETTERS.find((letter) =>
    groups[letter].matches.some((match) => match.id === matchId)
  );
}

function alignThirdPlaceOrder(
  groups: Record<GroupLetter, Group>,
  oldOrder: string[] | null
): string[] | null {
  if (!oldOrder) return null;
  const currentThirds = GROUP_LETTERS.map((letter) => groups[letter].teams[2])
    .filter((team): team is Team => Boolean(team))
    .map((team) => team.code);

  const currentSet = new Set(currentThirds);
  const ordered = oldOrder.filter((code) => currentSet.has(code));
  const orderedSet = new Set(ordered);

  for (const code of currentThirds) {
    if (!orderedSet.has(code)) {
      ordered.push(code);
    }
  }
  return ordered;
}

function validatePortableState(value: unknown): asserts value is PortableState {
  if (!value || typeof value !== 'object') throw new Error('Invalid JSON state');
  const candidate = value as Partial<PortableState>;
  if (candidate.version !== 1 || !candidate.groups || !candidate.knockoutResults) {
    throw new Error('Unsupported or incomplete state file');
  }
  for (const letter of GROUP_LETTERS) {
    const group = candidate.groups[letter];
    if (!group || group.teams?.length !== 4 || group.matches?.length !== 6) {
      throw new Error(`Invalid group ${letter}`);
    }
  }
}

const freshGroups = createInitialGroups();
const freshKnockout = createInitialKnockoutResults();

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      groups: freshGroups,
      knockoutResults: freshKnockout,
      matrix: null,
      matrixStatus: 'idle',
      isDragAndDropMode: true,
      thirdPlaceOrder: null,
      savedSimulation: null,
      collapsedGroups: {
        A: false, B: false, C: false, D: false, E: false, F: false,
        G: false, H: false, I: false, J: false, K: false, L: false,
      },
      ...derive(freshGroups, null, false, freshKnockout, null),

      loadMatrix: async () => {
        if (get().matrixStatus === 'loading' || get().matrixStatus === 'ready') return;
        set({ matrixStatus: 'loading' });
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}matrix495.json`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const matrix = (await response.json()) as MatrixData;
          if (matrix.scenarios.length !== 495) throw new Error('Invalid Annex C row count');
          const current = get();
          set({
            matrix,
            matrixStatus: 'ready',
            ...derive(
              current.groups,
              matrix,
              current.isDragAndDropMode,
              current.knockoutResults,
              current.thirdPlaceOrder
            ),
          });
        } catch (error) {
          console.error('Failed to load matrix495.json', error);
          set({ matrixStatus: 'error' });
        }
      },

      updateMatchResult: (matchId, homeGoals, awayGoals) => {
        const current = get();
        const letter = locateGroup(current.groups, matchId);
        if (!letter) return;
        const normalize = (value: number | null) =>
          value === null ? null : Math.max(0, Math.trunc(value));
        const home = normalize(homeGoals);
        const away = normalize(awayGoals);
        const matches = current.groups[letter].matches.map((match) =>
          match.id === matchId
            ? {
                ...match,
                homeGoals: home,
                awayGoals: away,
                status: home !== null && away !== null ? ('completed' as const) : ('scheduled' as const),
              }
            : match
        );
        const updatedGroup = { ...current.groups[letter], matches };
        updatedGroup.teams = calculateGroupStandings(updatedGroup);
        const groups = { ...current.groups, [letter]: updatedGroup };
        const knockoutResults = createInitialKnockoutResults();
        const thirdPlaceOrder = current.isDragAndDropMode
          ? rankThirdPlaces(GROUP_LETTERS.map((l) => groups[l]), true).map((r) => r.team.code)
          : null;
        set({
          groups,
          knockoutResults,
          thirdPlaceOrder,
          ...derive(
            groups,
            current.matrix,
            current.isDragAndDropMode,
            knockoutResults,
            thirdPlaceOrder
          ),
        });
      },

      updateMatchConduct: (matchId, side, cards) => {
        const current = get();
        const letter = locateGroup(current.groups, matchId);
        if (!letter) return;
        const matches = current.groups[letter].matches.map((match) =>
          match.id === matchId
            ? { ...match, conduct: { ...match.conduct, [side]: cards } }
            : match
        );
        const updatedGroup = { ...current.groups[letter], matches };
        updatedGroup.teams = calculateGroupStandings(updatedGroup);
        const groups = { ...current.groups, [letter]: updatedGroup };
        const thirdPlaceOrder = current.isDragAndDropMode
          ? rankThirdPlaces(GROUP_LETTERS.map((l) => groups[l]), true).map((r) => r.team.code)
          : null;
        set({
          groups,
          thirdPlaceOrder,
          ...derive(
            groups,
            current.matrix,
            current.isDragAndDropMode,
            current.knockoutResults,
            thirdPlaceOrder
          ),
        });
      },

      reorderTeamInGroup: (letter, newOrder) => {
        const current = get();
        const teams = newOrder.map((team, index) => ({
          ...team,
          position: (index + 1) as Team['position'],
        }));
        const groups = {
          ...current.groups,
          [letter]: { ...current.groups[letter], teams },
        };
        const knockoutResults = createInitialKnockoutResults();
        const thirdPlaceOrder = alignThirdPlaceOrder(groups, current.thirdPlaceOrder);
        set({
          groups,
          knockoutResults,
          thirdPlaceOrder,
          ...derive(
            groups,
            current.matrix,
            current.isDragAndDropMode,
            knockoutResults,
            thirdPlaceOrder
          ),
        });
      },

      reorderThirdPlaces: (newOrder) => {
        const current = get();
        const knockoutResults = createInitialKnockoutResults();
        set({
          thirdPlaceOrder: newOrder,
          knockoutResults,
          ...derive(
            current.groups,
            current.matrix,
            current.isDragAndDropMode,
            knockoutResults,
            newOrder
          ),
        });
      },

      toggleMode: (isDragAndDropMode) => {
        const current = get();

        // --- Switching TO Official Results (isDragAndDropMode = false) ---
        if (!isDragAndDropMode) {
          // Save the current simulation before overwriting with official data
          const savedSimulation = {
            groups: current.groups,
            knockoutResults: current.knockoutResults,
            thirdPlaceOrder: current.thirdPlaceOrder,
          };
          // Restore official groups from seed data and recalculate standings
          const officialGroups = createInitialGroups();
          const officialKnockout = createInitialKnockoutResults();
          set({
            groups: officialGroups,
            knockoutResults: officialKnockout,
            isDragAndDropMode: false,
            thirdPlaceOrder: null,
            savedSimulation,
            ...derive(officialGroups, current.matrix, false, officialKnockout, null),
          });
          return;
        }

        // --- Switching TO Predict/Simulate (isDragAndDropMode = true) ---
        // Restore the saved simulation if one exists, else keep current
        const saved = current.savedSimulation;
        const groups = saved ? saved.groups : current.groups;
        const knockoutResults = saved ? saved.knockoutResults : createInitialKnockoutResults();
        const thirdPlaceOrder = saved
          ? saved.thirdPlaceOrder
          : rankThirdPlaces(GROUP_LETTERS.map((l) => groups[l]), true).map((r) => r.team.code);
        set({
          groups,
          isDragAndDropMode: true,
          knockoutResults,
          thirdPlaceOrder,
          savedSimulation: null,
          ...derive(groups, current.matrix, true, knockoutResults, thirdPlaceOrder),
        });
      },

      updateKnockoutResult: (matchNumber, patch) => {
        const current = get();
        const knockoutResults = { ...current.knockoutResults };
        const base = knockoutResults[matchNumber] ?? emptyKnockoutResult(matchNumber);
        knockoutResults[matchNumber] = { ...base, ...patch, matchNumber };
        for (const downstream of downstreamMatches(matchNumber)) {
          knockoutResults[downstream] = emptyKnockoutResult(downstream);
        }
        set({
          knockoutResults,
          ...derive(
            current.groups,
            current.matrix,
            current.isDragAndDropMode,
            knockoutResults,
            current.thirdPlaceOrder
          ),
        });
      },

      toggleGroupCollapse: (letter) => {
        set((state) => ({
          collapsedGroups: {
            ...state.collapsedGroups,
            [letter]: !state.collapsedGroups[letter],
          },
        }));
      },

      collapseAllGroups: (collapsed) => {
        const collapsedGroups = {} as Record<GroupLetter, boolean>;
        for (const letter of GROUP_LETTERS) {
          collapsedGroups[letter] = collapsed;
        }
        set({ collapsedGroups });
      },

      resetAll: () => {
        const current = get();
        const groups = createInitialGroups();
        const knockoutResults = createInitialKnockoutResults();
        const collapsedGroups = {
          A: false, B: false, C: false, D: false, E: false, F: false,
          G: false, H: false, I: false, J: false, K: false, L: false,
        };
        // Reset keeps the user in Predict/Simulate mode so they can keep predicting.
        const thirdPlaceOrder = rankThirdPlaces(
          GROUP_LETTERS.map((l) => groups[l]),
          true
        ).map((r) => r.team.code);
        set({
          groups,
          knockoutResults,
          isDragAndDropMode: true,
          thirdPlaceOrder,
          savedSimulation: null,
          collapsedGroups,
          ...derive(groups, current.matrix, true, knockoutResults, thirdPlaceOrder),
        });
      },

      exportState: () => {
        const current = get();
        const portable: PortableState = {
          version: 1,
          exportedAt: new Date().toISOString(),
          groups: current.groups,
          knockoutResults: current.knockoutResults,
          isDragAndDropMode: current.isDragAndDropMode,
          thirdPlaceOrder: current.thirdPlaceOrder,
        };
        return JSON.stringify(portable, null, 2);
      },

      importState: (raw) => {
        const portable: unknown = JSON.parse(raw);
        validatePortableState(portable);
        const current = get();
        const portableState = portable as PortableState;
        const thirdPlaceOrder = portableState.thirdPlaceOrder ?? null;
        set({
          groups: portableState.groups,
          knockoutResults: portableState.knockoutResults,
          isDragAndDropMode: portableState.isDragAndDropMode,
          thirdPlaceOrder,
          ...derive(
            portableState.groups,
            current.matrix,
            portableState.isDragAndDropMode,
            portableState.knockoutResults,
            thirdPlaceOrder
          ),
        });
      },
    }),
    {
      name: 'wc2026-simulator-v2',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        groups: state.groups,
        knockoutResults: state.knockoutResults,
        isDragAndDropMode: state.isDragAndDropMode,
        thirdPlaceOrder: state.thirdPlaceOrder,
        savedSimulation: state.savedSimulation,
      }),
    }
  )
);
