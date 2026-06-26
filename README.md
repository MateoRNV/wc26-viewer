# Bracket Simulator · 2026 World Cup (Round of 32)

> 🌐 **Languages:** English (this file) · [Español](./README.es.md)

A static client-side SPA (React + Vite) that simulates the **Round of 32** of the
2026 World Cup, including the new **8 best third-placed teams** system and the
FIFA matrix (Annex C) that deterministically assigns each third-placed team to a
group winner without group-stage rematches.

The UI is fully internationalized (English / Spanish) and works **100% offline** —
there is no API or backend; all data lives in JSON and in-memory state.

---

## Table of Contents

1. [Quick start](#quick-start)
2. [Tech stack](#tech-stack)
3. [How it works (domain model)](#how-it-works-domain-model)
4. [Project structure](#project-structure)
5. [Data flow](#data-flow)
6. [The 495-combination matrix](#the-495-combination-matrix)
7. [Internationalization (i18n)](#internationalization-i18n)
8. [Scripts](#scripts)
9. [Extending the project](#extending-the-project)
10. [MVP status & roadmap](#mvp-status--roadmap)

---

## Quick start

```bash
npm install
npm run gen:matrix   # (optional) regenerate public/matrix495.json
npm run dev          # http://localhost:5173
npm run build        # typecheck (tsc --noEmit) + production build to /dist
npm run preview      # serve the built /dist locally
```

`public/matrix495.json` is committed, so you only need `gen:matrix` if you change
`scripts/generateMatrix.mjs`.

Requirements: **Node 18+** (developed on Node 24).

---

## Tech stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Framework      | React 18 + Vite 5 + TypeScript (strict)  |
| Global state   | [Zustand](https://github.com/pmndrs/zustand) |
| Drag & drop    | [@dnd-kit](https://dndkit.com/) (core + sortable) |
| Styling        | Tailwind CSS 3 + `src/styles/bracket.css` |
| i18n           | i18next + react-i18next + browser-languagedetector |
| Data           | Static JSON in `/public` + TS mock data  |

No router (single screen), no server, no SSR.

---

## How it works (domain model)

The tournament has **12 groups (A–L) × 4 teams = 48 teams**. After the group
stage:

- **12 group winners** (1st place) and **12 runners-up** (2nd place) qualify
  directly → fixed bracket slots.
- The **12 third-placed teams** are ranked against each other; the **top 8**
  qualify. Which 8 of the 12 groups supply a third-placed team is what varies —
  there are `C(12,8) = 495` possible combinations.
- For each combination, the FIFA matrix says exactly which third-placed team
  faces which group winner (avoiding a rematch of a group-stage game).

The **8 group winners that face a third** are those of groups **A, C, D, E, G,
I, K, L** (official FIFA 2026 rule). The other 8 matches pair the remaining
winners (B, F, H, J) with runners-up — a fixed structure.

Core TypeScript types live in [`src/types.ts`](./src/types.ts): `Team`, `Match`,
`Group`, `BracketMatchup`, `BracketSlot`, `MatrixScenario`, `ThirdPlaceRanking`,
`ResolvedMatchup`.

---

## Project structure

```
wc2026/
├── public/
│   └── matrix495.json          # 495 scenarios (generated) — fetched at runtime
├── scripts/
│   └── generateMatrix.mjs      # builds matrix495.json (run via npm run gen:matrix)
├── src/
│   ├── main.tsx                # entry: mounts <App/>, imports i18n + styles
│   ├── App.tsx                 # loads the matrix, renders Header + Layout
│   ├── types.ts                # all shared TypeScript interfaces
│   ├── vite-env.d.ts           # Vite client type reference
│   ├── data/
│   │   └── groups.mock.ts      # 12 groups, 48 teams, round-robin fixtures
│   ├── store/
│   │   └── appStore.ts         # Zustand store + derive() recompute engine
│   ├── utils/
│   │   ├── scoringRules.ts     # points/GD/GF, group standings, third ranking
│   │   ├── tiebreakers.ts      # comparators (pts → GD → GF → fair-play → FIFA)
│   │   └── matrixEngine.ts     # resolveBracket() + fill slots with real teams
│   ├── i18n/
│   │   ├── index.ts            # i18next config + teamName() helper
│   │   └── locales/
│   │       ├── es.json         # Spanish strings (incl. team names)
│   │       └── en.json         # English strings (incl. team names)
│   ├── components/
│   │   ├── Header.tsx          # title, mode toggle, language switcher
│   │   ├── ModeToggle.tsx      # Simulator ↔ Sandbox
│   │   ├── LanguageSwitcher.tsx# ES / EN
│   │   ├── Layout.tsx          # 3-column grid (Groups | Thirds | Bracket)
│   │   ├── GroupsPanel.tsx     # renders 12 GroupCards
│   │   ├── GroupCard.tsx       # standings rows (draggable) + match inputs
│   │   ├── MatchInput.tsx      # goal inputs for a single match
│   │   ├── ThirdPlaceTable.tsx # ranked 12 thirds, top-8 highlighted
│   │   ├── BracketPanel.tsx    # scenario badge + resolved bracket
│   │   └── BracketTree.tsx     # the 16 Round-of-32 match cards
│   └── styles/
│       └── bracket.css         # custom styling for the bracket cards
└── index.html
```

---

## Data flow

The store ([`src/store/appStore.ts`](./src/store/appStore.ts)) is the single
source of truth. Every mutation calls a pure `derive(groups, matrix)` function
that recomputes the third-place ranking and the resolved bracket, so the whole UI
stays reactive.

### Simulator mode (default)

1. User edits goals in a `MatchInput` → `updateMatchResult(matchId, home, away)`.
2. The affected group is re-sorted by results via
   `calculateGroupStandings()` (points → GD → GF → fair-play → FIFA rank).
3. `rankThirdPlaces()` re-ranks the 12 third-placed teams; top 8 get
   `qualifies = true`.
4. When exactly 8 thirds qualify, `findScenario()` looks up the combination key
   (e.g. `"BCFHIJKL"`) in the matrix and `resolveMatchupsWithTeams()` fills the
   16 matchups with concrete teams.

### Sandbox mode

1. User drags a team within its group (`@dnd-kit`) → `reorderTeamInGroup()`.
2. The manual order **is** the standing (results are not re-sorted). Whoever sits
   in 3rd place becomes that group's third-placed candidate.
3. The same ranking + bracket recompute runs. Switching back to Simulator
   re-sorts every group from match results again.

> The third-place **ranking metrics** (points/GD/GF) always come from match
> results, even in Sandbox — dragging only decides *who* is 3rd, not their stats.

---

## The 495-combination matrix

`public/matrix495.json` is produced by
[`scripts/generateMatrix.mjs`](./scripts/generateMatrix.mjs). Structure:

```jsonc
{
  "scenarios": [
    {
      "groupCombination": "ABCDEFGH",   // 8 group letters, sorted
      "official": false,                 // true = seeded from FIFA/Wikipedia
      "matchups": [
        { "matchNumber": 1, "team1": {"type":"winner","group":"A"},
          "team2": {"type":"third","group":"E"} },
        // ... 16 matchups total
      ]
    }
    // ... 495 scenarios
  ]
}
```

### ⚠️ Important caveat about the data

- **8 scenarios are official**, seeded verbatim from the public FIFA/Wikipedia
  table (object `SEED` in the generator, marked `official: true`). They render
  with a green badge in the UI and exist to validate the engine.
- The **~487 remaining scenarios are generated** by a deterministic
  *no-rematch matching* algorithm (a group winner is never paired with a third
  from its own group). They render with an amber "generated assignment" badge.

This is a pragmatic MVP decision: the full Annex C table (all 495 rows) is not
freely reproducible in bulk, but the engine is fully general. **To use the
official table**, expand the `SEED` object in the generator with the real rows
and run `npm run gen:matrix`. Neither the bracket structure nor the engine needs
to change.

The generator also self-validates: all 495 combinations are unique, each has 16
matchups, the assigned thirds always equal the combination set, and generated
rows contain zero group rematches.

---

## Internationalization (i18n)

Powered by **i18next + react-i18next**, configured in
[`src/i18n/index.ts`](./src/i18n/index.ts).

- **Translation keys** live in `src/i18n/locales/{es,en}.json`, grouped by area
  (`header`, `modes`, `panels`, `group`, `thirds`, `bracket`, `match`, `teams`).
- Components read strings with the `useTranslation()` hook:
  `const { t } = useTranslation(); t('panels.groups')`.
- Interpolation uses `{{var}}`: `t('group.title', { letter: 'A' })`.
- **Team names are translated too**, keyed by team code under `teams.*`. Since
  the store/components live outside React in places, the helper
  `teamName(code, fallback)` calls `i18n.t` directly and falls back to the
  Spanish name from the mock data if a key is missing.
- The selected language is **persisted in `localStorage`** under the key
  `wc2026-lang`, and auto-detected from the browser on first visit
  (`fallbackLng: 'es'`).

### Add a new language (e.g. Portuguese)

1. Create `src/i18n/locales/pt.json` (copy `en.json`, translate the values).
2. In `src/i18n/index.ts`: add `pt` to `SUPPORTED_LANGUAGES` and to `resources`.
3. Done — the `LanguageSwitcher` renders a button per supported language
   automatically.

---

## Scripts

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Vite dev server with HMR                       |
| `npm run build`       | `tsc --noEmit` typecheck + Vite production build |
| `npm run preview`     | Serve the built `/dist`                        |
| `npm run gen:matrix`  | Regenerate `public/matrix495.json`             |

---

## Extending the project

- **Real rosters / live data:** edit `src/data/groups.mock.ts`. Each group has 4
  teams and 6 round-robin matches; default scorelines are deterministic
  placeholders. To wire a live API later, replace `createInitialGroups()` and
  feed results into `updateMatchResult`.
- **Fair-play / yellow cards:** `Match.yellowCards` already exists in the model
  and feeds the tiebreaker; the mock currently sets them to 0.
- **Visual bracket tree (SVG):** today the bracket is a grid of cards
  (`BracketTree.tsx`). A classic SVG tournament tree can replace it without
  touching the engine.
- **Official Annex C matrix:** see [the matrix caveat](#-important-caveat-about-the-data).

---

## MVP status & roadmap

- [x] Boots with 12 mocked groups and live standings
- [x] **Simulator**: edit goals → thirds table updates → bracket resolves
- [x] **Sandbox**: drag teams → same recompute
- [x] Simulator ↔ Sandbox toggle changes the UI
- [x] Matrix engine validated against the official seed combinations
- [x] Full i18n (ES/EN) with persisted language, incl. team names
- [ ] Replace the ~487 generated scenarios with the official Annex C table
- [ ] SVG tournament-tree bracket
- [ ] Live data / API integration

---

### Data sources

The third-place allocation rule and the 8 seed combinations were taken from the
public 2026 FIFA World Cup knockout-stage documentation
([Wikipedia](https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage)).
The remaining bracket structure is an internally-consistent reconstruction.
