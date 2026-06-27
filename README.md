# World Cup 2026 Simulator

A React and TypeScript simulator for the 2026 FIFA World Cup group stage and complete knockout tournament.

## What is implemented

- Official 48-team groups and blank scheduled fixtures.
- FIFA Article 13 ranking order, including recursive head-to-head subsets, team-conduct deductions and ranking fallback.
- All 495 official Annex C combinations, extracted from pages 80-97 of the FIFA regulations.
- Official knockout dependencies from M73 through M104, including extra time, penalties, third place and final.
- Manual standings mode with pointer and keyboard sorting.
- Local persistence, reset, JSON import/export and shareable state links.
- Responsive desktop and mobile layouts in Spanish and English.

The bundled [FIFA regulations](scripts/annexC/FWC2026_regulations_EN.pdf) are the source of truth for the rules and matrix. Team ranking values are a configurable snapshot and are used only after every sporting and conduct criterion remains tied.

## Commands

```bash
npm install
npm run dev
npm run check
npm run test:e2e
```

To regenerate `public/matrix495.json` from the official PDF:

```bash
python -m pip install -r scripts/annexC/requirements.txt
npm run gen:matrix
```

## Sources

- [FIFA World Cup 26 Regulations](https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf)
- [FIFA final draw results](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/final-draw-results)
