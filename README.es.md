# Simulador del Mundial 2026

Simulador en React y TypeScript para la fase de grupos y todas las eliminatorias del Mundial 2026.

## Funcionalidad

- Los 12 grupos oficiales y los 72 partidos inicialmente programados, sin marcadores inventados.
- Desempates del artículo 13 de FIFA: subconjuntos de enfrentamientos directos, conducta completa y ranking como último recurso.
- Las 495 combinaciones oficiales del Anexo C, extraídas de las páginas 80-97 del reglamento.
- Cuadro oficial desde M73 hasta M104, con prórroga, penaltis, tercer puesto y final.
- Modo manual ordenable con puntero o teclado.
- Persistencia local, reinicio, importar/exportar JSON y enlaces compartibles.
- Diseño adaptable para escritorio y móvil en español e inglés.

El [reglamento FIFA incluido](scripts/annexC/FWC2026_regulations_EN.pdf) es la fuente de reglas y de la matriz. Los valores de ranking son una instantánea configurable y solo se usan si todos los criterios deportivos y disciplinarios siguen empatados.

## Comandos

```bash
npm install
npm run dev
npm run check
npm run test:e2e
```

Para regenerar `public/matrix495.json` desde el PDF oficial:

```bash
python -m pip install -r scripts/annexC/requirements.txt
npm run gen:matrix
```

## Fuentes

- [Reglamento del Mundial 2026](https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf)
- [Resultado del sorteo final de FIFA](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/final-draw-results)
