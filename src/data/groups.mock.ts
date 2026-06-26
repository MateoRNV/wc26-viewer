import type { Group, GroupLetter, Match, Team } from '../types';

/**
 * Mock roster for the 2026 World Cup group stage (12 groups x 4 teams).
 * Teams are listed in their seeded (pot) order; `position` is recomputed live
 * from match results by the scoring engine, so the values here are just an
 * initial placeholder ordering.
 */
const ROSTER: Record<GroupLetter, Array<Omit<Team, 'group' | 'position'>>> = {
  A: [
    { code: 'MEX', name: 'México', fifaRank: 14 },
    { code: 'CRC', name: 'Costa Rica', fifaRank: 52 },
    { code: 'KSA', name: 'Arabia Saudita', fifaRank: 58 },
    { code: 'RSA', name: 'Sudáfrica', fifaRank: 60 },
  ],
  B: [
    { code: 'CAN', name: 'Canadá', fifaRank: 43 },
    { code: 'BIH', name: 'Bosnia', fifaRank: 75 },
    { code: 'QAT', name: 'Catar', fifaRank: 36 },
    { code: 'CIV', name: 'Costa de Marfil', fifaRank: 40 },
  ],
  C: [
    { code: 'USA', name: 'Estados Unidos', fifaRank: 16 },
    { code: 'POL', name: 'Polonia', fifaRank: 28 },
    { code: 'JAM', name: 'Jamaica', fifaRank: 55 },
    { code: 'UZB', name: 'Uzbekistán', fifaRank: 57 },
  ],
  D: [
    { code: 'ARG', name: 'Argentina', fifaRank: 1 },
    { code: 'JPN', name: 'Japón', fifaRank: 17 },
    { code: 'NGA', name: 'Nigeria', fifaRank: 41 },
    { code: 'PAN', name: 'Panamá', fifaRank: 39 },
  ],
  E: [
    { code: 'GER', name: 'Alemania', fifaRank: 12 },
    { code: 'ECU', name: 'Ecuador', fifaRank: 23 },
    { code: 'KOR', name: 'Corea del Sur', fifaRank: 22 },
    { code: 'CPV', name: 'Cabo Verde', fifaRank: 70 },
  ],
  F: [
    { code: 'BRA', name: 'Brasil', fifaRank: 5 },
    { code: 'CRO', name: 'Croacia', fifaRank: 10 },
    { code: 'EGY', name: 'Egipto', fifaRank: 32 },
    { code: 'NZL', name: 'Nueva Zelanda', fifaRank: 86 },
  ],
  G: [
    { code: 'ESP', name: 'España', fifaRank: 2 },
    { code: 'URU', name: 'Uruguay', fifaRank: 15 },
    { code: 'IRN', name: 'Irán', fifaRank: 18 },
    { code: 'HAI', name: 'Haití', fifaRank: 83 },
  ],
  H: [
    { code: 'POR', name: 'Portugal', fifaRank: 6 },
    { code: 'COL', name: 'Colombia', fifaRank: 13 },
    { code: 'AUS', name: 'Australia', fifaRank: 24 },
    { code: 'JOR', name: 'Jordania', fifaRank: 64 },
  ],
  I: [
    { code: 'FRA', name: 'Francia', fifaRank: 3 },
    { code: 'NOR', name: 'Noruega', fifaRank: 30 },
    { code: 'SEN', name: 'Senegal', fifaRank: 19 },
    { code: 'CUW', name: 'Curazao', fifaRank: 82 },
  ],
  J: [
    { code: 'ENG', name: 'Inglaterra', fifaRank: 4 },
    { code: 'NED', name: 'Países Bajos', fifaRank: 7 },
    { code: 'GHA', name: 'Ghana', fifaRank: 73 },
    { code: 'PAR', name: 'Paraguay', fifaRank: 38 },
  ],
  K: [
    { code: 'BEL', name: 'Bélgica', fifaRank: 8 },
    { code: 'MAR', name: 'Marruecos', fifaRank: 11 },
    { code: 'CHL', name: 'Chile', fifaRank: 27 },
    { code: 'TUN', name: 'Túnez', fifaRank: 49 },
  ],
  L: [
    { code: 'ITA', name: 'Italia', fifaRank: 9 },
    { code: 'AUT', name: 'Austria', fifaRank: 25 },
    { code: 'SCO', name: 'Escocia', fifaRank: 44 },
    { code: 'PAN2', name: 'Panamá B', fifaRank: 45 },
  ],
};

/** Round-robin fixture order for a 4-team group (indices into the roster). */
const RR_PAIRS: Array<[number, number]> = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
];

/**
 * Deterministic placeholder scoreline so the app boots with a meaningful
 * standings table. Pseudo-random but stable per fixture.
 */
function defaultScore(seed: number): [number, number] {
  const h = (seed * 2654435761) >>> 0;
  return [h % 4, (h >>> 8) % 4];
}

function buildGroup(letter: GroupLetter): Group {
  const roster = ROSTER[letter];
  const teams: Team[] = roster.map((t, i) => ({
    ...t,
    group: letter,
    position: (i + 1) as Team['position'],
  }));

  const matches: Match[] = RR_PAIRS.map(([h, a], i) => {
    const [hg, ag] = defaultScore(letter.charCodeAt(0) * 7 + i);
    return {
      id: `${letter}-M${i + 1}`,
      homeCode: roster[h].code,
      awayCode: roster[a].code,
      homeGoals: hg,
      awayGoals: ag,
      yellowCards: { home: 0, away: 0 },
    };
  });

  return { letter, teams, matches };
}

export const GROUP_LETTERS: GroupLetter[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
];

export function createInitialGroups(): Record<GroupLetter, Group> {
  const out = {} as Record<GroupLetter, Group>;
  for (const l of GROUP_LETTERS) out[l] = buildGroup(l);
  return out;
}
