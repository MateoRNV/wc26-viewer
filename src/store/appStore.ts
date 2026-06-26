import { create } from 'zustand';
import type {
  BracketMatchup,
  Group,
  GroupLetter,
  MatrixData,
  ResolvedMatchup,
  Team,
  ThirdPlaceRanking,
} from '../types';
import { createInitialGroups, GROUP_LETTERS } from '../data/groups.mock';
import { calculateGroupStandings, rankThirdPlaces } from '../utils/scoringRules';
import {
  findScenario,
  resolveMatchupsWithTeams,
} from '../utils/matrixEngine';

interface DerivedState {
  thirdPlaceRankings: ThirdPlaceRanking[];
  bracketMatchups: BracketMatchup[] | null;
  resolvedBracket: ResolvedMatchup[] | null;
  scenarioOfficial: boolean;
  scenarioKey: string | null;
  bracketError: string | null;
}

interface AppState extends DerivedState {
  groups: Record<GroupLetter, Group>;
  matrix: MatrixData | null;
  matrixStatus: 'idle' | 'loading' | 'ready' | 'error';
  isDragAndDropMode: boolean;

  loadMatrix: () => Promise<void>;
  updateMatchResult: (matchId: string, homeGoals: number, awayGoals: number) => void;
  reorderTeamInGroup: (group: GroupLetter, newOrder: Team[]) => void;
  toggleMode: (isDnd: boolean) => void;
}

/** Recompute rankings + bracket from the current groups + matrix. */
function derive(
  groups: Record<GroupLetter, Group>,
  matrix: MatrixData | null
): DerivedState {
  const groupList = GROUP_LETTERS.map((l) => groups[l]);
  const thirdPlaceRankings = rankThirdPlaces(groupList);

  const standingsByGroup = {} as Record<GroupLetter, Team[]>;
  for (const l of GROUP_LETTERS) standingsByGroup[l] = groups[l].teams;

  const qualifiedThirds = thirdPlaceRankings
    .filter((r) => r.qualifies)
    .map((r) => r.team);

  let bracketMatchups: BracketMatchup[] | null = null;
  let resolvedBracket: ResolvedMatchup[] | null = null;
  let scenarioOfficial = false;
  let scenarioKey: string | null = null;
  let bracketError: string | null = null;

  if (matrix && qualifiedThirds.length === 8) {
    const scenario = findScenario(qualifiedThirds, matrix);
    if (scenario) {
      bracketMatchups = scenario.matchups;
      scenarioOfficial = Boolean(scenario.official);
      scenarioKey = scenario.groupCombination;
      resolvedBracket = resolveMatchupsWithTeams(
        scenario.matchups,
        standingsByGroup,
        thirdPlaceRankings
      );
    } else {
      // Stores just the combination key; the UI wraps it in a translated string.
      bracketError = qualifiedThirds
        .map((t) => t.group)
        .sort()
        .join('');
    }
  }

  return {
    thirdPlaceRankings,
    bracketMatchups,
    resolvedBracket,
    scenarioOfficial,
    scenarioKey,
    bracketError,
  };
}

const initialGroups = (() => {
  const g = createInitialGroups();
  // Boot in Simulator mode: order each group by its match results.
  for (const l of GROUP_LETTERS) g[l].teams = calculateGroupStandings(g[l]);
  return g;
})();

export const useAppStore = create<AppState>((set, get) => ({
  groups: initialGroups,
  matrix: null,
  matrixStatus: 'idle',
  isDragAndDropMode: false,
  ...derive(initialGroups, null),

  loadMatrix: async () => {
    if (get().matrixStatus === 'loading' || get().matrixStatus === 'ready') return;
    set({ matrixStatus: 'loading' });
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}matrix495.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const matrix = (await res.json()) as MatrixData;
      set({ matrix, matrixStatus: 'ready', ...derive(get().groups, matrix) });
    } catch (e) {
      console.error('Failed to load matrix495.json', e);
      set({ matrixStatus: 'error' });
    }
  },

  updateMatchResult: (matchId, homeGoals, awayGoals) => {
    const { groups, matrix } = get();
    const letter = GROUP_LETTERS.find((l) =>
      groups[l].matches.some((m) => m.id === matchId)
    );
    if (!letter) return;

    const group = groups[letter];
    const matches = group.matches.map((m) =>
      m.id === matchId
        ? { ...m, homeGoals: Math.max(0, homeGoals), awayGoals: Math.max(0, awayGoals) }
        : m
    );
    // Simulator mode re-sorts from results; Sandbox keeps the manual order.
    const updatedGroup: Group = { ...group, matches };
    if (!get().isDragAndDropMode) {
      updatedGroup.teams = calculateGroupStandings(updatedGroup);
    }

    const nextGroups = { ...groups, [letter]: updatedGroup };
    set({ groups: nextGroups, ...derive(nextGroups, matrix) });
  },

  reorderTeamInGroup: (letter, newOrder) => {
    const { groups, matrix } = get();
    const teams = newOrder.map((t, i) => ({
      ...t,
      position: (i + 1) as Team['position'],
    }));
    const nextGroups = {
      ...groups,
      [letter]: { ...groups[letter], teams },
    };
    set({ groups: nextGroups, ...derive(nextGroups, matrix) });
  },

  toggleMode: (isDnd) => {
    const { groups, matrix } = get();
    // Leaving Sandbox -> recompute every group's order from match results.
    if (!isDnd) {
      const nextGroups = { ...groups };
      for (const l of GROUP_LETTERS) {
        nextGroups[l] = { ...groups[l], teams: calculateGroupStandings(groups[l]) };
      }
      set({ isDragAndDropMode: false, groups: nextGroups, ...derive(nextGroups, matrix) });
    } else {
      set({ isDragAndDropMode: true });
    }
  },
}));
