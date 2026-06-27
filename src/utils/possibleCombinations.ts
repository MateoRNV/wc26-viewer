import type { Group, GroupLetter } from '../types';
import { GROUP_LETTERS } from '../data/groups';
import { calculateGroupStandings, computeStats } from './scoringRules';
import { compareThirds, type TeamStats } from './tiebreakers';

export interface PossibleCombinationAnalysis {
  possibleKeys: Set<string>;
  lockedGroups: Set<GroupLetter>;
  currentKey: string;
  incompleteGroups: GroupLetter[];
}

function profileKey(stats: TeamStats): string {
  return [
    stats.team.code,
    stats.points,
    stats.gd,
    stats.gf,
    stats.conductScore,
  ].join(':');
}

function completedThirdProfile(group: Group): TeamStats {
  const orderedTeams = calculateGroupStandings(group);
  const third = orderedTeams[2];
  const stats = computeStats(orderedTeams, group.matches).find(
    (entry) => entry.team.code === third.code
  );
  if (!stats) throw new Error(`Unable to resolve third place for group ${group.letter}`);
  return stats;
}

/**
 * Enumerates distinct third-place statistical profiles for a group. Scores are
 * bounded because only their ordering against the finite existing thresholds
 * matters. A cap of six already spans every current fixed GD/GF threshold.
 */
export function enumerateThirdProfiles(group: Group, scoreCap = 6): TeamStats[] {
  const pendingIndexes = group.matches
    .map((match, index) => (match.status === 'completed' ? -1 : index))
    .filter((index) => index >= 0);

  if (pendingIndexes.length === 0) return [completedThirdProfile(group)];

  const profiles = new Map<string, TeamStats>();
  const matches = group.matches.map((match) => ({ ...match }));

  const visit = (pendingIndex: number) => {
    if (pendingIndex === pendingIndexes.length) {
      const completedGroup: Group = { ...group, matches };
      const stats = completedThirdProfile(completedGroup);
      profiles.set(profileKey(stats), stats);
      return;
    }

    const matchIndex = pendingIndexes[pendingIndex];
    const original = matches[matchIndex];
    for (let homeGoals = 0; homeGoals <= scoreCap; homeGoals += 1) {
      for (let awayGoals = 0; awayGoals <= scoreCap; awayGoals += 1) {
        matches[matchIndex] = {
          ...original,
          homeGoals,
          awayGoals,
          status: 'completed',
        };
        visit(pendingIndex + 1);
      }
    }
    matches[matchIndex] = original;
  };

  visit(0);
  return [...profiles.values()];
}

function qualifyingKey(profiles: TeamStats[]): string {
  return [...profiles]
    .sort(compareThirds)
    .slice(0, 8)
    .map((stats) => stats.team.group)
    .sort()
    .join('');
}

export function analyzePossibleCombinations(
  groups: Record<GroupLetter, Group>,
  scoreCap = 6
): PossibleCombinationAnalysis {
  const profilesByGroup = {} as Record<GroupLetter, TeamStats[]>;
  const incompleteGroups: GroupLetter[] = [];

  for (const letter of GROUP_LETTERS) {
    const group = groups[letter];
    if (group.matches.some((match) => match.status !== 'completed')) {
      incompleteGroups.push(letter);
    }
    profilesByGroup[letter] = enumerateThirdProfiles(group, scoreCap);
  }

  const fixedProfiles = GROUP_LETTERS
    .filter((letter) => profilesByGroup[letter].length === 1)
    .map((letter) => profilesByGroup[letter][0]);
  const variableGroups = GROUP_LETTERS.filter(
    (letter) => profilesByGroup[letter].length > 1
  );
  const possibleKeys = new Set<string>();
  const selectedProfiles: TeamStats[] = [];

  const combine = (index: number) => {
    if (index === variableGroups.length) {
      possibleKeys.add(qualifyingKey([...fixedProfiles, ...selectedProfiles]));
      return;
    }
    const letter = variableGroups[index];
    for (const profile of profilesByGroup[letter]) {
      selectedProfiles.push(profile);
      combine(index + 1);
      selectedProfiles.pop();
    }
  };

  combine(0);

  const currentProfiles = GROUP_LETTERS.map(
    (letter) => completedThirdProfile(groups[letter])
  );
  const currentKey = qualifyingKey(currentProfiles);
  possibleKeys.add(currentKey);

  const lockedGroups = new Set<GroupLetter>(GROUP_LETTERS);
  for (const key of possibleKeys) {
    for (const letter of [...lockedGroups]) {
      if (!key.includes(letter)) lockedGroups.delete(letter);
    }
  }

  return { possibleKeys, lockedGroups, currentKey, incompleteGroups };
}
