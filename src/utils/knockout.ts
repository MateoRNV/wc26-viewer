import type {
  KnockoutMatchView,
  KnockoutResult,
  KnockoutRound,
  ResolvedMatchup,
} from '../types';

type Source =
  | { kind: 'round32'; side: 'home' | 'away' }
  | { kind: 'winner' | 'loser'; matchNumber: number };

interface Definition {
  matchNumber: number;
  round: KnockoutRound;
  home: Source;
  away: Source;
}

const later = (
  matchNumber: number,
  round: KnockoutRound,
  homeMatch: number,
  awayMatch: number,
  sourceKind: 'winner' | 'loser' = 'winner'
): Definition => ({
  matchNumber,
  round,
  home: { kind: sourceKind, matchNumber: homeMatch },
  away: { kind: sourceKind, matchNumber: awayMatch },
});

export const KNOCKOUT_DEFINITIONS: Definition[] = [
  ...Array.from({ length: 16 }, (_, index) => ({
    matchNumber: 73 + index,
    round: 'round32' as const,
    home: { kind: 'round32' as const, side: 'home' as const },
    away: { kind: 'round32' as const, side: 'away' as const },
  })),
  later(89, 'round16', 74, 77),
  later(90, 'round16', 73, 75),
  later(91, 'round16', 76, 78),
  later(92, 'round16', 79, 80),
  later(93, 'round16', 83, 84),
  later(94, 'round16', 81, 82),
  later(95, 'round16', 86, 88),
  later(96, 'round16', 85, 87),
  later(97, 'quarterfinal', 89, 90),
  later(98, 'quarterfinal', 93, 94),
  later(99, 'quarterfinal', 91, 92),
  later(100, 'quarterfinal', 95, 96),
  later(101, 'semifinal', 97, 98),
  later(102, 'semifinal', 99, 100),
  later(103, 'thirdPlace', 101, 102, 'loser'),
  later(104, 'final', 101, 102),
];

export function emptyKnockoutResult(matchNumber: number): KnockoutResult {
  return {
    matchNumber,
    homeGoals: null,
    awayGoals: null,
    penaltiesHome: null,
    penaltiesAway: null,
    decision: 'regular',
    status: 'unplayed',
  };
}

export function createInitialKnockoutResults(): Record<number, KnockoutResult> {
  return Object.fromEntries(
    KNOCKOUT_DEFINITIONS.map((definition) => [
      definition.matchNumber,
      emptyKnockoutResult(definition.matchNumber),
    ])
  );
}

function outcome(
  result: KnockoutResult,
  homeCode: string | null,
  awayCode: string | null
): { winnerCode: string | null; loserCode: string | null } {
  if (
    result.status !== 'completed' ||
    !homeCode ||
    !awayCode ||
    result.homeGoals === null ||
    result.awayGoals === null
  ) {
    return { winnerCode: null, loserCode: null };
  }

  let homeWins: boolean | null = null;
  if (result.homeGoals !== result.awayGoals) {
    homeWins = result.homeGoals > result.awayGoals;
  } else if (
    result.decision === 'penalties' &&
    result.penaltiesHome !== null &&
    result.penaltiesAway !== null &&
    result.penaltiesHome !== result.penaltiesAway
  ) {
    homeWins = result.penaltiesHome > result.penaltiesAway;
  }
  if (homeWins === null) return { winnerCode: null, loserCode: null };
  return homeWins
    ? { winnerCode: homeCode, loserCode: awayCode }
    : { winnerCode: awayCode, loserCode: homeCode };
}

export function buildKnockoutMatches(
  resolvedRound32: ResolvedMatchup[] | null,
  results: Record<number, KnockoutResult>
): KnockoutMatchView[] {
  const round32 = new Map(
    (resolvedRound32 ?? []).map((match) => [match.matchNumber, match])
  );
  const built = new Map<number, KnockoutMatchView>();

  const sourceCode = (source: Source, definition: Definition): string | null => {
    if (source.kind === 'round32') {
      const matchup = round32.get(definition.matchNumber);
      return source.side === 'home'
        ? matchup?.team1Code ?? null
        : matchup?.team2Code ?? null;
    }
    const previous = built.get(source.matchNumber);
    return source.kind === 'winner'
      ? previous?.winnerCode ?? null
      : previous?.loserCode ?? null;
  };

  for (const definition of KNOCKOUT_DEFINITIONS) {
    const result = results[definition.matchNumber] ?? emptyKnockoutResult(definition.matchNumber);
    const homeCode = sourceCode(definition.home, definition);
    const awayCode = sourceCode(definition.away, definition);
    const resolvedOutcome = outcome(result, homeCode, awayCode);
    built.set(definition.matchNumber, {
      ...result,
      ...resolvedOutcome,
      matchNumber: definition.matchNumber,
      round: definition.round,
      homeCode,
      awayCode,
    });
  }
  return [...built.values()];
}

export function downstreamMatches(matchNumber: number): number[] {
  const found = new Set<number>();
  const visit = (source: number) => {
    for (const definition of KNOCKOUT_DEFINITIONS) {
      const depends = [definition.home, definition.away].some(
        (entry) => entry.kind !== 'round32' && entry.matchNumber === source
      );
      if (depends && !found.has(definition.matchNumber)) {
        found.add(definition.matchNumber);
        visit(definition.matchNumber);
      }
    }
  };
  visit(matchNumber);
  return [...found];
}
