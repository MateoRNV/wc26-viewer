export type GroupLetter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export type Position = 1 | 2 | 3 | 4;
export type MatchStatus = 'unplayed' | 'scheduled' | 'completed';

export interface Team {
  code: string;
  name: string;
  group: GroupLetter;
  position: Position;
  /** Most recent FIFA ranking. Lower is better. */
  fifaRank: number;
  /** Older published rankings, newest first, used only if the latest is tied. */
  fifaRankHistory?: number[];
}

export interface ConductCards {
  yellow: number;
  indirectRed: number;
  directRed: number;
  yellowDirectRed: number;
}

export interface MatchConduct {
  home: ConductCards;
  away: ConductCards;
}

export interface Match {
  id: string;
  homeCode: string;
  awayCode: string;
  status: MatchStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  conduct: MatchConduct;
  preseeded?: boolean;
}

export interface Group {
  letter: GroupLetter;
  teams: Team[];
  matches: Match[];
}

export type SlotType = 'winner' | 'runner-up' | 'third';

export interface BracketSlot {
  type: SlotType;
  group: GroupLetter;
}

export interface BracketMatchup {
  matchNumber: number;
  team1: BracketSlot;
  team2: BracketSlot;
}

export interface MatrixScenario {
  option: number;
  groupCombination: string;
  matchups: BracketMatchup[];
  official: true;
}

export interface MatrixData {
  source: {
    title: string;
    annex: string;
    pages: string;
    winnerColumns: string[];
  };
  scenarios: MatrixScenario[];
}

export interface ThirdPlaceRanking {
  rank: number;
  team: Team;
  points: number;
  gd: number;
  gf: number;
  conductScore: number;
  qualifies: boolean;
}

export interface ResolvedMatchup extends BracketMatchup {
  team1Code: string | null;
  team2Code: string | null;
}

export type KnockoutRound =
  | 'round32'
  | 'round16'
  | 'quarterfinal'
  | 'semifinal'
  | 'thirdPlace'
  | 'final';

export type KnockoutDecision = 'regular' | 'extra-time' | 'penalties';

export interface KnockoutResult {
  matchNumber: number;
  homeGoals: number | null;
  awayGoals: number | null;
  penaltiesHome: number | null;
  penaltiesAway: number | null;
  decision: KnockoutDecision;
  status: MatchStatus;
}

export interface KnockoutMatchView extends KnockoutResult {
  round: KnockoutRound;
  homeCode: string | null;
  awayCode: string | null;
  winnerCode: string | null;
  loserCode: string | null;
}

export interface PortableState {
  version: 1;
  exportedAt: string;
  groups: Record<GroupLetter, Group>;
  knockoutResults: Record<number, KnockoutResult>;
  isDragAndDropMode: boolean;
  thirdPlaceOrder?: string[] | null;
}
