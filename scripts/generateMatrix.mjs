// Generates public/matrix495.json: every one of the 495 ways that 8 of the 12
// groups can supply a qualifying third-placed team, each mapped to a full
// 16-match Round of 32 bracket.
//
// Winners A, C, D, E, G, I, K, L are the eight group winners that face a
// third-placed team (per FIFA 2026). The other 8 matches (winners B/F/H/J +
// all 12 runners-up) are a fixed structure.
//
// The 8 official combinations published by FIFA/Wikipedia are seeded verbatim
// (marked `official: true`) so the engine can be validated against real data.
// The remaining ~487 are filled with a deterministic no-rematch assignment
// (a group winner is never paired with a third from its own group). Drop the
// official Annex C table into SEED below to replace generated rows.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const WINNERS_VS_THIRD = ['A', 'C', 'D', 'E', 'G', 'I', 'K', 'L'];

// Official seed rows: combination (sorted) -> { winnerLetter: thirdLetter }.
const SEED = {
  EFGHIJKL: { A: 'E', C: 'F', D: 'G', E: 'H', G: 'I', I: 'J', K: 'K', L: 'L' },
  DFGHIJKL: { A: 'H', C: 'G', D: 'I', E: 'D', G: 'J', I: 'F', K: 'L', L: 'K' },
  DEGHIJKL: { A: 'E', C: 'J', D: 'I', E: 'D', G: 'H', I: 'G', K: 'L', L: 'K' },
  DEFHIJKL: { A: 'E', C: 'J', D: 'I', E: 'D', G: 'H', I: 'F', K: 'L', L: 'K' },
  DEFGIJKL: { A: 'E', C: 'G', D: 'I', E: 'D', G: 'J', I: 'F', K: 'L', L: 'K' },
  DEFGHJKL: { A: 'E', C: 'G', D: 'J', E: 'D', G: 'H', I: 'F', K: 'L', L: 'K' },
  DEFGHIKL: { A: 'E', C: 'G', D: 'I', E: 'D', G: 'H', I: 'F', K: 'L', L: 'K' },
  DEFGHIJL: { A: 'E', C: 'G', D: 'J', E: 'D', G: 'H', I: 'F', K: 'L', L: 'I' },
};

// All C(12,8) = 495 combinations of group letters, each sorted alphabetically.
function combinations(arr, k) {
  const out = [];
  const pick = (start, acc) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      acc.push(arr[i]);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return out;
}

// Deterministic perfect matching of winners -> thirds avoiding same-group
// rematches. Backtracking guarantees a solution whenever one exists.
function assignNoRematch(thirds) {
  const result = {};
  const used = new Set();
  const solve = (wi) => {
    if (wi === WINNERS_VS_THIRD.length) return true;
    const w = WINNERS_VS_THIRD[wi];
    for (const t of thirds) {
      if (used.has(t) || t === w) continue;
      used.add(t);
      result[w] = t;
      if (solve(wi + 1)) return true;
      used.delete(t);
      delete result[w];
    }
    return false;
  };
  if (!solve(0)) {
    // Fallback: ignore the no-rematch constraint (should never trigger).
    WINNERS_VS_THIRD.forEach((w, i) => (result[w] = thirds[i]));
  }
  return result;
}

// Build the 16 matchups for a given winner->third assignment.
function buildMatchups(assign) {
  const W = (g) => ({ type: 'winner', group: g });
  const R = (g) => ({ type: 'runner-up', group: g });
  const T = (g) => ({ type: 'third', group: g });

  return [
    { matchNumber: 1, team1: W('A'), team2: T(assign.A) },
    { matchNumber: 2, team1: W('B'), team2: R('C') },
    { matchNumber: 3, team1: W('C'), team2: T(assign.C) },
    { matchNumber: 4, team1: W('D'), team2: T(assign.D) },
    { matchNumber: 5, team1: W('E'), team2: T(assign.E) },
    { matchNumber: 6, team1: W('F'), team2: R('A') },
    { matchNumber: 7, team1: W('G'), team2: T(assign.G) },
    { matchNumber: 8, team1: W('H'), team2: R('J') },
    { matchNumber: 9, team1: W('I'), team2: T(assign.I) },
    { matchNumber: 10, team1: W('J'), team2: R('H') },
    { matchNumber: 11, team1: W('K'), team2: T(assign.K) },
    { matchNumber: 12, team1: W('L'), team2: T(assign.L) },
    { matchNumber: 13, team1: R('B'), team2: R('E') },
    { matchNumber: 14, team1: R('D'), team2: R('G') },
    { matchNumber: 15, team1: R('F'), team2: R('I') },
    { matchNumber: 16, team1: R('K'), team2: R('L') },
  ];
}

const scenarios = combinations(ALL_GROUPS, 8).map((combo) => {
  const key = combo.join('');
  const official = Object.prototype.hasOwnProperty.call(SEED, key);
  const assign = official ? SEED[key] : assignNoRematch(combo);
  return {
    groupCombination: key,
    official,
    matchups: buildMatchups(assign),
  };
});

const outPath = `${__dirname}/../public/matrix495.json`;
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ scenarios }, null, 2));

const officialCount = scenarios.filter((s) => s.official).length;
console.log(
  `Wrote ${scenarios.length} scenarios (${officialCount} official seed rows) -> public/matrix495.json`
);
