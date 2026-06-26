export type GroupLetter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export type Position = 1 | 2 | 3 | 4; // 1=winner, 2=runner-up, 3=third, 4=fourth

export interface Team {
  code: string;
  name: string;
  group: GroupLetter;
  position: Position;
  /** Static FIFA ranking used as the final tiebreaker (lower = better). */
  fifaRank: number;
}

export interface Match {
  id: string;
  homeCode: string;
  awayCode: string;
  homeGoals: number;
  awayGoals: number;
  yellowCards?: { home: number; away: number };
}

export interface Group {
  letter: GroupLetter;
  teams: Team[]; // length 4, ordered by current position (1-4)
  matches: Match[];
}

export type SlotType = 'winner' | 'runner-up' | 'third';

export interface BracketSlot {
  type: SlotType;
  group: GroupLetter;
}

export interface BracketMatchup {
  matchNumber: number; // 1-16
  team1: BracketSlot;
  team2: BracketSlot;
  venue?: string;
  date?: string;
}

export interface MatrixScenario {
  groupCombination: string; // e.g. "ABCDEFGH" (sorted alphabetically)
  matchups: BracketMatchup[];
  /** true when sourced from the official FIFA table, false when generated. */
  official?: boolean;
}

export interface MatrixData {
  scenarios: MatrixScenario[];
}

export interface ThirdPlaceRanking {
  rank: number;
  team: Team;
  points: number;
  gd: number;
  gf: number;
  yellowCards: number;
  qualifies: boolean; // top 8 advance
}

/** A resolved matchup with the concrete teams filled in (for rendering). */
export interface ResolvedMatchup extends BracketMatchup {
  team1Code: string | null;
  team2Code: string | null;
}
