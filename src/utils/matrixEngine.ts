import type {
  BracketMatchup,
  GroupLetter,
  MatrixData,
  MatrixScenario,
  ResolvedMatchup,
  Team,
  ThirdPlaceRanking,
} from '../types';

/**
 * Core matrix resolver. Given the 8 qualifying third-placed teams, find the
 * matching FIFA scenario and return its 16 bracket matchups (slots only).
 */
export function resolveBracket(
  qualifiedThirds: Team[],
  data: MatrixData
): BracketMatchup[] {
  if (qualifiedThirds.length !== 8) {
    throw new Error(
      `Expected exactly 8 qualifying thirds, got ${qualifiedThirds.length}`
    );
  }

  const combination = qualifiedThirds
    .map((t) => t.group)
    .sort()
    .join('');

  const scenario = data.scenarios.find(
    (s) => s.groupCombination === combination
  );

  if (!scenario) {
    throw new Error(`No matrix scenario found for combination: ${combination}`);
  }

  return scenario.matchups;
}

/** Returns the matched scenario (incl. the `official` flag) or null. */
export function findScenario(
  qualifiedThirds: Team[],
  data: MatrixData
): MatrixScenario | null {
  if (qualifiedThirds.length !== 8) return null;
  const combination = qualifiedThirds
    .map((t) => t.group)
    .sort()
    .join('');
  return (
    data.scenarios.find((s) => s.groupCombination === combination) ?? null
  );
}

/**
 * Fills the slot-based matchups with concrete team codes, using the live group
 * standings (winner/runner-up by group) and the third-place ranking.
 */
export function resolveMatchupsWithTeams(
  matchups: BracketMatchup[],
  standingsByGroup: Record<GroupLetter, Team[]>,
  thirdRankings: ThirdPlaceRanking[]
): ResolvedMatchup[] {
  const thirdByGroup = new Map<GroupLetter, Team>();
  for (const r of thirdRankings) {
    if (r.qualifies) thirdByGroup.set(r.team.group, r.team);
  }

  const codeForSlot = (slot: BracketMatchup['team1']): string | null => {
    const teams = standingsByGroup[slot.group];
    if (slot.type === 'winner') return teams?.[0]?.code ?? null;
    if (slot.type === 'runner-up') return teams?.[1]?.code ?? null;
    return thirdByGroup.get(slot.group)?.code ?? null;
  };

  return matchups.map((m) => ({
    ...m,
    team1Code: codeForSlot(m.team1),
    team2Code: codeForSlot(m.team2),
  }));
}
