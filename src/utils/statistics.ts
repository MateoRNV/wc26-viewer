import type { Group, GroupLetter } from '../types';
import { GROUP_LETTERS } from '../data/groups';
import {
  confederationOf,
  CONFEDERATIONS,
  type Confederation,
} from '../data/confederations';
import { computeStats, rankThirdPlaces } from './scoringRules';

/** A metric that can be aggregated and charted. */
export type StatMetric =
  | 'qualified'
  | 'eliminated'
  | 'points'
  | 'gf'
  | 'ga'
  | 'gd';

/** The grouping dimension for an aggregation. */
export type StatDimension = 'confederation' | 'group';

export interface TeamRecord {
  code: string;
  group: GroupLetter;
  confederation: Confederation | 'N/A';
  /** 1-4 standing position within the group. */
  position: number;
  /** Reached the Round of 32 (top two, or one of the eight best thirds). */
  qualified: boolean;
  points: number;
  gf: number;
  ga: number;
  gd: number;
  played: number;
}

/** One aggregated bucket for a dimension category (a confederation or a group). */
export interface Aggregate {
  key: string;
  teams: number;
  qualified: number;
  eliminated: number;
  points: number;
  gf: number;
  ga: number;
  gd: number;
  played: number;
}

/**
 * Flattens the current groups into per-team records, tagging qualification the
 * same way the rest of the app does: the top two of every group plus the eight
 * best third-placed teams advance. Standings are read from `group.teams`, which
 * already reflects the active mode (official results or the user's prediction),
 * so the statistics update live with whatever the user is exploring.
 */
export function buildTeamRecords(
  groups: Record<GroupLetter, Group>
): TeamRecord[] {
  const groupList = GROUP_LETTERS.map((letter) => groups[letter]);

  // Eight best thirds (provisional while groups are incomplete).
  const qualifiedThirds = new Set(
    rankThirdPlaces(groupList, true)
      .filter((ranking) => ranking.qualifies)
      .map((ranking) => ranking.team.code)
  );

  const records: TeamRecord[] = [];
  for (const letter of GROUP_LETTERS) {
    const group = groups[letter];
    const statByCode = new Map(
      computeStats(group.teams, group.matches).map((s) => [s.team.code, s])
    );
    group.teams.forEach((team, index) => {
      const stats = statByCode.get(team.code);
      const position = index + 1;
      const qualified = position <= 2 || qualifiedThirds.has(team.code);
      records.push({
        code: team.code,
        group: letter,
        confederation: confederationOf(team.code) ?? 'N/A',
        position,
        qualified,
        points: stats?.points ?? 0,
        gf: stats?.gf ?? 0,
        ga: stats?.ga ?? 0,
        gd: stats?.gd ?? 0,
        played: stats?.played ?? 0,
      });
    });
  }
  return records;
}

/** Numeric value of a metric for a single team record. */
export function metricValue(record: TeamRecord, metric: StatMetric): number {
  switch (metric) {
    case 'qualified':
      return record.qualified ? 1 : 0;
    case 'eliminated':
      return record.qualified ? 0 : 1;
    case 'points':
      return record.points;
    case 'gf':
      return record.gf;
    case 'ga':
      return record.ga;
    case 'gd':
      return record.gd;
  }
}

function emptyAggregate(key: string): Aggregate {
  return {
    key,
    teams: 0,
    qualified: 0,
    eliminated: 0,
    points: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    played: 0,
  };
}

/**
 * Aggregates team records by the chosen dimension. Buckets are returned in the
 * canonical order of the dimension (confederations in FIFA order, groups A-L),
 * so colours and positions stay stable across metric switches.
 */
export function aggregateBy(
  records: TeamRecord[],
  dimension: StatDimension,
  order: string[]
): Aggregate[] {
  const buckets = new Map<string, Aggregate>();
  for (const key of order) buckets.set(key, emptyAggregate(key));

  for (const record of records) {
    const key = dimension === 'confederation' ? record.confederation : record.group;
    const bucket = buckets.get(key) ?? emptyAggregate(key);
    bucket.teams += 1;
    bucket.qualified += record.qualified ? 1 : 0;
    bucket.eliminated += record.qualified ? 0 : 1;
    bucket.points += record.points;
    bucket.gf += record.gf;
    bucket.ga += record.ga;
    bucket.gd += record.gd;
    bucket.played += record.played;
    buckets.set(key, bucket);
  }

  // Drop empty buckets (e.g. an 'N/A' confederation that no team maps to).
  return [...buckets.values()].filter((bucket) => bucket.teams > 0);
}

/** Per-confederation summary, including rates relative to its own size. */
export interface ConfederationSummary {
  confederation: Confederation;
  /** Teams this confederation started with. */
  teams: number;
  qualified: number;
  eliminated: number;
  /** qualified / teams — how much of the confederation advanced. */
  qualificationRate: number;
  /** qualified / total qualified across all confederations (share of the R32). */
  share: number;
  points: number;
  /** points / teams. */
  avgPoints: number;
  gf: number;
  ga: number;
  gd: number;
  /** Highest-scoring (by points, then GD) team of the confederation, if any. */
  topTeam: { code: string; points: number; gd: number } | null;
}

/**
 * Builds a rich per-confederation breakdown: qualification rate within the
 * confederation, share of the Round of 32, scoring averages and the standout
 * team. Confederations with no teams are omitted.
 */
export function confederationSummaries(
  groups: Record<GroupLetter, Group>
): ConfederationSummary[] {
  const records = buildTeamRecords(groups);
  const aggregates = aggregateBy(records, 'confederation', CONFEDERATIONS);
  const totalQualified = aggregates.reduce((sum, a) => sum + a.qualified, 0);

  const topByConfed = new Map<string, { code: string; points: number; gd: number }>();
  for (const record of records) {
    if (record.confederation === 'N/A') continue;
    const current = topByConfed.get(record.confederation);
    if (
      !current ||
      record.points > current.points ||
      (record.points === current.points && record.gd > current.gd)
    ) {
      topByConfed.set(record.confederation, {
        code: record.code,
        points: record.points,
        gd: record.gd,
      });
    }
  }

  return aggregates.map((bucket) => ({
    confederation: bucket.key as Confederation,
    teams: bucket.teams,
    qualified: bucket.qualified,
    eliminated: bucket.eliminated,
    qualificationRate: bucket.teams > 0 ? bucket.qualified / bucket.teams : 0,
    share: totalQualified > 0 ? bucket.qualified / totalQualified : 0,
    points: bucket.points,
    avgPoints: bucket.teams > 0 ? bucket.points / bucket.teams : 0,
    gf: bucket.gf,
    ga: bucket.ga,
    gd: bucket.gd,
    topTeam: topByConfed.get(bucket.key) ?? null,
  }));
}

/** Pulls the charted value for a metric out of an aggregate bucket. */
export function aggregateMetric(bucket: Aggregate, metric: StatMetric): number {
  switch (metric) {
    case 'qualified':
      return bucket.qualified;
    case 'eliminated':
      return bucket.eliminated;
    case 'points':
      return bucket.points;
    case 'gf':
      return bucket.gf;
    case 'ga':
      return bucket.ga;
    case 'gd':
      return bucket.gd;
  }
}
