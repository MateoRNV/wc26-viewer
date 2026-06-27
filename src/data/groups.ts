import type {
  ConductCards,
  Group,
  GroupLetter,
  Match,
  Team,
} from '../types';
import { calculateGroupStandings } from '../utils/scoringRules';
import PRESEEDED_SCORES_JSON from './results.json';

const PRESEEDED_SCORES = PRESEEDED_SCORES_JSON as unknown as Record<string, { homeGoals: number; awayGoals: number }>

type RosterTeam = Omit<Team, 'group' | 'position'>;

// Official FIFA World Cup 26 groups after the final play-off qualifiers.
// fifaRank is a configurable snapshot used only as the final rules fallback.
const ROSTER: Record<GroupLetter, RosterTeam[]> = {
  A: [
    { code: 'MEX', name: 'Mexico', fifaRank: 14 },
    { code: 'RSA', name: 'South Africa', fifaRank: 59 },
    { code: 'KOR', name: 'Korea Republic', fifaRank: 22 },
    { code: 'CZE', name: 'Czechia', fifaRank: 39 },
  ],
  B: [
    { code: 'CAN', name: 'Canada', fifaRank: 31 },
    { code: 'BIH', name: 'Bosnia and Herzegovina', fifaRank: 75 },
    { code: 'QAT', name: 'Qatar', fifaRank: 54 },
    { code: 'SUI', name: 'Switzerland', fifaRank: 17 },
  ],
  C: [
    { code: 'BRA', name: 'Brazil', fifaRank: 5 },
    { code: 'MAR', name: 'Morocco', fifaRank: 8 },
    { code: 'HAI', name: 'Haiti', fifaRank: 83 },
    { code: 'SCO', name: 'Scotland', fifaRank: 44 },
  ],
  D: [
    { code: 'USA', name: 'United States', fifaRank: 15 },
    { code: 'PAR', name: 'Paraguay', fifaRank: 38 },
    { code: 'AUS', name: 'Australia', fifaRank: 24 },
    { code: 'TUR', name: 'Turkiye', fifaRank: 27 },
  ],
  E: [
    { code: 'GER', name: 'Germany', fifaRank: 10 },
    { code: 'CUW', name: 'Curacao', fifaRank: 82 },
    { code: 'CIV', name: "Cote d'Ivoire", fifaRank: 40 },
    { code: 'ECU', name: 'Ecuador', fifaRank: 23 },
  ],
  F: [
    { code: 'NED', name: 'Netherlands', fifaRank: 7 },
    { code: 'JPN', name: 'Japan', fifaRank: 18 },
    { code: 'SWE', name: 'Sweden', fifaRank: 28 },
    { code: 'TUN', name: 'Tunisia', fifaRank: 49 },
  ],
  G: [
    { code: 'BEL', name: 'Belgium', fifaRank: 9 },
    { code: 'EGY', name: 'Egypt', fifaRank: 32 },
    { code: 'IRN', name: 'IR Iran', fifaRank: 20 },
    { code: 'NZL', name: 'New Zealand', fifaRank: 86 },
  ],
  H: [
    { code: 'ESP', name: 'Spain', fifaRank: 1 },
    { code: 'CPV', name: 'Cabo Verde', fifaRank: 70 },
    { code: 'KSA', name: 'Saudi Arabia', fifaRank: 58 },
    { code: 'URU', name: 'Uruguay', fifaRank: 16 },
  ],
  I: [
    { code: 'FRA', name: 'France', fifaRank: 2 },
    { code: 'SEN', name: 'Senegal', fifaRank: 19 },
    { code: 'IRQ', name: 'Iraq', fifaRank: 57 },
    { code: 'NOR', name: 'Norway', fifaRank: 29 },
  ],
  J: [
    { code: 'ARG', name: 'Argentina', fifaRank: 3 },
    { code: 'ALG', name: 'Algeria', fifaRank: 36 },
    { code: 'AUT', name: 'Austria', fifaRank: 25 },
    { code: 'JOR', name: 'Jordan', fifaRank: 64 },
  ],
  K: [
    { code: 'POR', name: 'Portugal', fifaRank: 6 },
    { code: 'COD', name: 'Congo DR', fifaRank: 61 },
    { code: 'UZB', name: 'Uzbekistan', fifaRank: 55 },
    { code: 'COL', name: 'Colombia', fifaRank: 13 },
  ],
  L: [
    { code: 'ENG', name: 'England', fifaRank: 4 },
    { code: 'CRO', name: 'Croatia', fifaRank: 11 },
    { code: 'GHA', name: 'Ghana', fifaRank: 73 },
    { code: 'PAN', name: 'Panama', fifaRank: 41 },
  ],
};

const RR_PAIRS: Array<[number, number]> = [
  [0, 1], [2, 3], [0, 2], [3, 1], [3, 0], [1, 2],
];



const emptyCards = (): ConductCards => ({
  yellow: 0,
  indirectRed: 0,
  directRed: 0,
  yellowDirectRed: 0,
});

function buildGroup(letter: GroupLetter): Group {
  const roster = ROSTER[letter];
  const teams = roster.map((team, index) => ({
    ...team,
    group: letter,
    position: (index + 1) as Team['position'],
  }));
  const matches: Match[] = RR_PAIRS.map(([home, away], index) => {
    const id = `${letter}-M${index + 1}`;
    const preseeded = PRESEEDED_SCORES[id];
    return {
      id,
      homeCode: roster[home].code,
      awayCode: roster[away].code,
      status: preseeded ? 'completed' : 'scheduled',
      homeGoals: preseeded ? preseeded.homeGoals : null,
      awayGoals: preseeded ? preseeded.awayGoals : null,
      conduct: { home: emptyCards(), away: emptyCards() },
      preseeded: Boolean(preseeded),
    };
  });
  const group: Group = { letter, teams, matches };
  group.teams = calculateGroupStandings(group);
  return group;
}

export const GROUP_LETTERS: GroupLetter[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
];

export function createInitialGroups(): Record<GroupLetter, Group> {
  const groups = {} as Record<GroupLetter, Group>;
  for (const letter of GROUP_LETTERS) groups[letter] = buildGroup(letter);
  return groups;
}
